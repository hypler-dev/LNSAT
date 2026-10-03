use super::{
    HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1, HeadlessResourceBindingKindV1,
    HeadlessResourceBindingsErrorV1, MAX_HEADLESS_RESOURCE_BINDING_PATH_BYTES_V1,
    MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1, MAX_HEADLESS_RESOURCE_BINDINGS_ROWS_V1,
    parse_headless_config_declaration_v1, parse_headless_resource_bindings_v1,
};
use serde_json::{Value, json};

const REPOSITORY_REF: &str = "resource:repository:main";
const RUNTIME_PROFILE_REF: &str = "resource:runtime_profile:default";
const REPOSITORY_PATH: &str = "/var/lib/lnsat/repository";
const RUNTIME_PROFILE_PATH: &str = "/var/lib/lnsat/runtime-profile";

fn declaration_document() -> Value {
    let mut document = super::parser_tests::valid_document();
    document["resources"] = json!([
        {
            "resource_ref": REPOSITORY_REF,
            "kind": "repository",
            "identity_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
        {
            "resource_ref": RUNTIME_PROFILE_REF,
            "kind": "runtime_profile",
            "identity_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        }
    ]);
    document["layers"][0]["resource_allow"] = json!([REPOSITORY_REF, RUNTIME_PROFILE_REF]);
    document
}

fn declaration(value: &Value) -> super::HeadlessConfigDeclarationV1 {
    parse_headless_config_declaration_v1(&serde_json::to_vec(value).expect("test declaration JSON"))
        .expect("test declaration parses")
}

fn bindings_document() -> Value {
    json!({
        "schema_id": HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1,
        "contract_version": "lnsat.contracts.v1_0",
        "installation_ref": "installation:local:test",
        "bindings": [
            {
                "resource_ref": REPOSITORY_REF,
                "kind": "repository",
                "source_path": REPOSITORY_PATH
            },
            {
                "resource_ref": RUNTIME_PROFILE_REF,
                "kind": "runtime_profile",
                "source_path": RUNTIME_PROFILE_PATH
            }
        ]
    })
}

fn parse(
    bindings: &Value,
    declaration: &super::HeadlessConfigDeclarationV1,
) -> Result<super::HeadlessResourceBindingsV1, HeadlessResourceBindingsErrorV1> {
    parse_headless_resource_bindings_v1(
        &serde_json::to_vec(bindings).expect("test bindings JSON"),
        declaration,
    )
}

fn parsed_bindings() -> super::HeadlessResourceBindingsV1 {
    parse(&bindings_document(), &declaration(&declaration_document()))
        .expect("valid bindings parse")
}

#[test]
fn exact_two_resource_dictionary_exposes_unverified_rows_only() {
    let bindings = parsed_bindings();
    assert_eq!(bindings.installation_ref(), "installation:local:test");
    assert_eq!(bindings.bindings().len(), 2);
    assert_eq!(
        (
            bindings.bindings()[0].resource_ref(),
            bindings.bindings()[0].kind(),
            bindings.bindings()[0].source_path(),
            bindings.bindings()[0].asserted_identity_digest(),
        ),
        (
            REPOSITORY_REF,
            HeadlessResourceBindingKindV1::Repository,
            REPOSITORY_PATH,
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )
    );
    assert_eq!(
        bindings.bindings()[1].asserted_identity_digest(),
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );

    let debug = format!("{bindings:?} {:?}", bindings.bindings()[0]);
    for caller_value in [
        "installation:local:test",
        REPOSITORY_REF,
        REPOSITORY_PATH,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ] {
        assert!(
            !debug.contains(caller_value),
            "debug must redact caller data"
        );
    }
}

#[test]
fn nonempty_deny_all_declaration_remains_valid_unverified_input() {
    let mut document = declaration_document();
    document["layers"][0]["action_rules"] = json!([]);
    let bindings = parse(&bindings_document(), &declaration(&document))
        .expect("nonempty deny-all declaration accepts binding input");
    assert_eq!(bindings.bindings().len(), 2);
    assert_eq!(
        bindings.redacted_diagnostic()["grants_action_authority"],
        false
    );
}

#[test]
fn whole_original_inventory_is_required_after_later_narrowing() {
    let mut document = declaration_document();
    document["layers"]
        .as_array_mut()
        .expect("layers")
        .push(json!({
            "layer_ref": "layer:runtime:narrow",
            "stage": "runtime",
            "resource_allow": [REPOSITORY_REF],
            "action_rules": []
        }));
    let declaration = declaration(&document);

    assert!(parse(&bindings_document(), &declaration).is_ok());
    let mut missing = bindings_document();
    missing["bindings"].as_array_mut().expect("bindings").pop();
    assert_eq!(
        parse(&missing, &declaration),
        Err(HeadlessResourceBindingsErrorV1::DeclarationMismatch)
    );
}

#[test]
fn exact_dictionary_rejects_installation_tuple_and_collection_substitution() {
    let declaration = declaration(&declaration_document());
    for (field, value) in [
        ("installation_ref", json!("installation:local:other")),
        (
            "bindings.0.resource_ref",
            json!("resource:repository:other"),
        ),
        ("bindings.0.kind", json!("runtime_profile")),
    ] {
        let mut input = bindings_document();
        match field {
            "installation_ref" => input["installation_ref"] = value,
            "bindings.0.resource_ref" => input["bindings"][0]["resource_ref"] = value,
            "bindings.0.kind" => input["bindings"][0]["kind"] = value,
            _ => unreachable!("fixed test field"),
        }
        assert_eq!(
            parse(&input, &declaration),
            Err(HeadlessResourceBindingsErrorV1::DeclarationMismatch),
            "{field}"
        );
    }

    let mut extra = bindings_document();
    extra["bindings"]
        .as_array_mut()
        .expect("bindings")
        .push(json!({
            "resource_ref": "resource:runtime_profile:other",
            "kind": "runtime_profile",
            "source_path": "/var/lib/lnsat/other"
        }));
    assert_eq!(
        parse(&extra, &declaration),
        Err(HeadlessResourceBindingsErrorV1::DeclarationMismatch)
    );

    let mut duplicate = bindings_document();
    duplicate["bindings"] = json!([
        duplicate["bindings"][0].clone(),
        duplicate["bindings"][0].clone(),
    ]);
    assert_eq!(
        parse(&duplicate, &declaration),
        Err(HeadlessResourceBindingsErrorV1::NoncanonicalCollection)
    );

    let mut reordered = bindings_document();
    reordered["bindings"]
        .as_array_mut()
        .expect("bindings")
        .reverse();
    assert_eq!(
        parse(&reordered, &declaration),
        Err(HeadlessResourceBindingsErrorV1::NoncanonicalCollection)
    );
}

#[test]
fn deny_all_and_unsupported_original_kind_fail_before_later_narrowing_can_hide_them() {
    let mut deny_all = super::parser_tests::valid_document();
    deny_all["resources"] = json!([]);
    deny_all["layers"][0]["resource_allow"] = json!([]);
    deny_all["layers"][0]["action_rules"] = json!([]);
    let empty = json!({
        "schema_id": HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1,
        "contract_version": "lnsat.contracts.v1_0",
        "installation_ref": "installation:local:test",
        "bindings": []
    });
    assert_eq!(
        parse(&empty, &declaration(&deny_all)),
        Err(HeadlessResourceBindingsErrorV1::UnsupportedCapability)
    );

    let mut unsupported = declaration_document();
    let repository = unsupported["resources"][0].clone();
    let runtime_profile = unsupported["resources"][1].clone();
    unsupported["resources"] = json!([
        {
            "resource_ref": "resource:connector:legacy",
            "kind": "connector",
            "identity_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        },
        repository,
        runtime_profile,
    ]);
    unsupported["layers"][0]["resource_allow"] = json!([
        "resource:connector:legacy",
        REPOSITORY_REF,
        RUNTIME_PROFILE_REF
    ]);
    unsupported["layers"]
        .as_array_mut()
        .expect("layers")
        .push(json!({
            "layer_ref": "layer:runtime:narrow",
            "stage": "runtime",
            "resource_allow": [REPOSITORY_REF, RUNTIME_PROFILE_REF],
            "action_rules": []
        }));
    let mut input = bindings_document();
    input["bindings"].as_array_mut().expect("bindings").insert(
        0,
        json!({
            "resource_ref": "resource:connector:legacy",
            "kind": "connector",
            "source_path": "/var/lib/lnsat/legacy"
        }),
    );
    assert_eq!(
        parse(&input, &declaration(&unsupported)),
        Err(HeadlessResourceBindingsErrorV1::UnsupportedCapability)
    );
}

#[test]
fn malformed_unknown_null_trailing_and_duplicate_keys_fail_before_model_construction() {
    let declaration = declaration(&declaration_document());
    for bytes in [
        b"".as_slice(),
        b"{".as_slice(),
        b"null".as_slice(),
        b"{} trailing".as_slice(),
    ] {
        assert_eq!(
            parse_headless_resource_bindings_v1(bytes, &declaration),
            Err(if bytes.is_empty() {
                HeadlessResourceBindingsErrorV1::InvalidSize
            } else {
                HeadlessResourceBindingsErrorV1::InvalidJson
            })
        );
    }
    let mut unknown = bindings_document();
    unknown["unexpected"] = json!(true);
    assert_eq!(
        parse(&unknown, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidJson)
    );
    unknown = bindings_document();
    unknown["bindings"][0]["unexpected"] = json!(true);
    assert_eq!(
        parse(&unknown, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidJson)
    );
    let mut null = bindings_document();
    null["bindings"][0]["source_path"] = Value::Null;
    assert_eq!(
        parse(&null, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidJson)
    );

    let encoded = serde_json::to_string(&bindings_document()).expect("bindings JSON");
    for (needle, duplicate) in [
        (
            "\"schema_id\":\"lnsat.resource_bindings.v1\"",
            "\"schema_id\":\"lnsat.resource_bindings.v1\",\"schema_id\":\"lnsat.resource_bindings.v1\"",
        ),
        (
            "\"schema_id\":\"lnsat.resource_bindings.v1\"",
            "\"schema\\u005fid\":\"lnsat.resource_bindings.v1\",\"schema_id\":\"lnsat.resource_bindings.v1\"",
        ),
        (
            "\"resource_ref\":\"resource:repository:main\"",
            "\"resource_ref\":\"resource:repository:main\",\"resource_ref\":\"resource:repository:main\"",
        ),
        (
            "\"resource_ref\":\"resource:repository:main\"",
            "\"resource_\\u0072ef\":\"resource:repository:main\",\"resource_ref\":\"resource:repository:main\"",
        ),
    ] {
        let duplicate = encoded.replacen(needle, duplicate, 1);
        assert_eq!(
            parse_headless_resource_bindings_v1(duplicate.as_bytes(), &declaration),
            Err(HeadlessResourceBindingsErrorV1::InvalidJson)
        );
    }
}

#[test]
fn binding_size_row_and_decoded_path_byte_boundaries_fail_closed() {
    let declaration = declaration(&declaration_document());
    let encoded = serde_json::to_vec(&bindings_document()).expect("bindings JSON");
    let mut exactly_maximum = vec![b' '; MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1 - encoded.len()];
    exactly_maximum.extend(encoded);
    assert_eq!(
        exactly_maximum.len(),
        MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1
    );
    assert!(parse_headless_resource_bindings_v1(&exactly_maximum, &declaration).is_ok());
    let too_large = vec![b' '; MAX_HEADLESS_RESOURCE_BINDINGS_BYTES_V1 + 1];
    assert_eq!(
        parse_headless_resource_bindings_v1(&too_large, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidSize)
    );

    let mut maximum_path = bindings_document();
    maximum_path["bindings"][0]["source_path"] = json!(format!(
        "/{}",
        "a".repeat(MAX_HEADLESS_RESOURCE_BINDING_PATH_BYTES_V1 - 1)
    ));
    assert!(parse(&maximum_path, &declaration).is_ok());
    let mut oversized_path = maximum_path;
    oversized_path["bindings"][0]["source_path"] = json!(format!(
        "/{}",
        "a".repeat(MAX_HEADLESS_RESOURCE_BINDING_PATH_BYTES_V1)
    ));
    assert_eq!(
        parse(&oversized_path, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidPath)
    );

    let mut too_many = bindings_document();
    too_many["bindings"] = Value::Array(
        (0..=MAX_HEADLESS_RESOURCE_BINDINGS_ROWS_V1)
            .map(|index| {
                json!({
                    "resource_ref": format!("resource:repository:{index:03}"),
                    "kind": "repository",
                    "source_path": format!("/rows/{index:03}")
                })
            })
            .collect(),
    );
    assert_eq!(
        parse(&too_many, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidSize)
    );
}

#[test]
fn schema_and_reference_failures_use_closed_codes() {
    let declaration = declaration(&declaration_document());
    let mut unsupported = bindings_document();
    unsupported["schema_id"] = json!("lnsat.resource_bindings.v9");
    assert_eq!(
        parse(&unsupported, &declaration),
        Err(HeadlessResourceBindingsErrorV1::UnsupportedContract)
    );

    let mut invalid_reference = bindings_document();
    invalid_reference["bindings"][0]["resource_ref"] = json!("not-a-reference");
    assert_eq!(
        parse(&invalid_reference, &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidReference)
    );
}

#[test]
fn every_error_code_is_fixed_and_public_safe() {
    for error in [
        HeadlessResourceBindingsErrorV1::InvalidSize,
        HeadlessResourceBindingsErrorV1::InvalidJson,
        HeadlessResourceBindingsErrorV1::UnsupportedContract,
        HeadlessResourceBindingsErrorV1::InvalidReference,
        HeadlessResourceBindingsErrorV1::NoncanonicalCollection,
        HeadlessResourceBindingsErrorV1::DeclarationMismatch,
        HeadlessResourceBindingsErrorV1::UnsupportedCapability,
        HeadlessResourceBindingsErrorV1::InvalidPath,
        HeadlessResourceBindingsErrorV1::OverlappingPaths,
        HeadlessResourceBindingsErrorV1::InvalidDeclaration,
    ] {
        assert!(error.code().starts_with("headless_resource_bindings."));
        assert_eq!(error.to_string(), error.code());
    }
}

#[test]
fn parser_ceiling_of_128_rows_reaches_backend_capability_denial_first() {
    let mut document = declaration_document();
    let mut resources: Vec<Value> = (0..(MAX_HEADLESS_RESOURCE_BINDINGS_ROWS_V1 - 2))
        .map(|index| {
            json!({
                "resource_ref": format!("resource:connector:{index:03}"),
                "kind": "connector",
                "identity_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
            })
        })
        .collect();
    resources.extend(
        document["resources"]
            .as_array()
            .expect("resources")
            .iter()
            .cloned(),
    );
    document["resources"] = Value::Array(resources.clone());
    document["layers"][0]["resource_allow"] = Value::Array(
        resources
            .iter()
            .map(|resource| resource["resource_ref"].clone())
            .collect(),
    );
    let input = json!({
        "schema_id": HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1,
        "contract_version": "lnsat.contracts.v1_0",
        "installation_ref": "installation:local:test",
        "bindings": resources.iter().enumerate().map(|(index, resource)| json!({
            "resource_ref": resource["resource_ref"],
            "kind": resource["kind"],
            "source_path": format!("/rows/{index:03}")
        })).collect::<Vec<_>>()
    });
    assert_eq!(
        parse(&input, &declaration(&document)),
        Err(HeadlessResourceBindingsErrorV1::UnsupportedCapability)
    );
}

#[test]
fn lexical_paths_reject_controls_overlap_and_noncanonical_syntax() {
    let declaration = declaration(&declaration_document());
    for path in [
        "relative/path",
        "/",
        "/trailing/",
        "/double//slash",
        "/dot/./segment",
        "/dotdot/../segment",
        "/back\\slash",
        "C:/drive/path",
        "\\\\server\\share",
        "/control/\u{0000}",
        "/control/\u{007f}",
        "/control/\u{0085}",
    ] {
        let mut input = bindings_document();
        input["bindings"][0]["source_path"] = json!(path);
        assert_eq!(
            parse(&input, &declaration),
            Err(HeadlessResourceBindingsErrorV1::InvalidPath),
            "{path:?}"
        );
    }

    for runtime_path in ["/var/lib/lnsat/repository/profile", "/var/lib/lnsat"] {
        let mut input = bindings_document();
        input["bindings"][1]["source_path"] = json!(runtime_path);
        assert_eq!(
            parse(&input, &declaration),
            Err(HeadlessResourceBindingsErrorV1::OverlappingPaths),
            "{runtime_path}"
        );
    }

    let mut distinct = bindings_document();
    distinct["bindings"][0]["source_path"] = json!("/repo/a");
    distinct["bindings"][1]["source_path"] = json!("/repo/ab");
    assert!(parse(&distinct, &declaration).is_ok());
}

#[test]
fn decoded_escapes_and_literal_shell_glyphs_are_input_only() {
    let declaration = declaration(&declaration_document());
    let mut accepted = bindings_document();
    accepted["bindings"][0]["source_path"] = json!("/repo/$HOME/${X}/~/space name/é");
    assert_eq!(
        parse(&accepted, &declaration)
            .expect("literal glyph path parses")
            .bindings()[0]
            .source_path(),
        "/repo/$HOME/${X}/~/space name/é"
    );

    let literal = serde_json::to_string(&accepted).expect("literal path JSON");
    let escaped = literal.replace('é', "\\u00e9");
    assert_ne!(literal, escaped);
    let literal_bindings = parse_headless_resource_bindings_v1(literal.as_bytes(), &declaration)
        .expect("literal Unicode path parses");
    let escaped_bindings = parse_headless_resource_bindings_v1(escaped.as_bytes(), &declaration)
        .expect("escaped Unicode path parses");
    assert_eq!(literal_bindings, escaped_bindings);
    assert_eq!(
        literal_bindings.binding_digest(),
        escaped_bindings.binding_digest()
    );

    let raw = r#"{"schema_id":"lnsat.resource_bindings.v1","contract_version":"lnsat.contracts.v1_0","installation_ref":"installation:local:test","bindings":[{"resource_ref":"resource:repository:main","kind":"repository","source_path":"/repo/\u0000"},{"resource_ref":"resource:runtime_profile:default","kind":"runtime_profile","source_path":"/runtime"}]}"#;
    assert_eq!(
        parse_headless_resource_bindings_v1(raw.as_bytes(), &declaration),
        Err(HeadlessResourceBindingsErrorV1::InvalidPath)
    );
}

#[test]
fn canonical_binding_digest_is_independently_fixed_and_input_sensitive() {
    let bindings = parsed_bindings();
    // Independently computed with Node SHA-256 over the UTF-8 schema domain,
    // one LF byte, and JSON.stringify of the exact compact fixture array.
    assert_eq!(
        bindings.binding_digest(),
        "sha256:898f271dff65db908017126708780c505ffbaa72d513cabbad2315a481a049c9"
    );
    let reordered = r#"{
        "bindings": [
          { "source_path": "/var/lib/lnsat/repository", "kind": "repository", "resource_ref": "resource:repository:main" },
          { "kind": "runtime_profile", "resource_ref": "resource:runtime_profile:default", "source_path": "/var/lib/lnsat/runtime-profile" }
        ],
        "installation_ref": "installation:local:test",
        "contract_version": "lnsat.contracts.v1_0",
        "schema_id": "lnsat.resource_bindings.v1"
    }"#;
    assert_eq!(
        parse_headless_resource_bindings_v1(
            reordered.as_bytes(),
            &declaration(&declaration_document())
        )
        .expect("reordered JSON parses")
        .binding_digest(),
        bindings.binding_digest()
    );

    let mut changed = bindings_document();
    changed["bindings"][1]["source_path"] = json!("/var/lib/lnsat/runtime-profile-v2");
    assert_ne!(
        parse(&changed, &declaration(&declaration_document()))
            .expect("changed path remains valid")
            .binding_digest(),
        bindings.binding_digest()
    );
}

#[test]
fn asserted_identity_pairing_is_separate_from_binding_commitment() {
    let input = bindings_document();
    let original = declaration_document();
    let original_bindings = parse(&input, &declaration(&original)).expect("original parses");

    let mut changed_declaration = original;
    changed_declaration["resources"][0]["identity_digest"] =
        json!("sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd");
    let changed =
        parse(&input, &declaration(&changed_declaration)).expect("changed declaration parses");
    assert_eq!(changed.binding_digest(), original_bindings.binding_digest());
    assert_ne!(
        changed.declaration_digest(),
        original_bindings.declaration_digest()
    );
    assert_eq!(
        changed.bindings()[0].asserted_identity_digest(),
        "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    );
}

#[test]
fn redacted_diagnostic_has_only_fixed_false_authority_flags() {
    let diagnostic = parsed_bindings().redacted_diagnostic();
    assert_eq!(
        diagnostic,
        json!({
            "schema_id": HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1,
            "binding_count": 2,
            "identity_verified": false,
            "owner_verified": false,
            "os_enforcement_verified": false,
            "initialization_available": false,
            "activation_available": false,
            "grants_action_authority": false
        })
    );
    assert_eq!(
        diagnostic["schema_id"],
        HEADLESS_RESOURCE_BINDINGS_SCHEMA_V1
    );
    assert_eq!(diagnostic["binding_count"], 2);
    for field in [
        "identity_verified",
        "owner_verified",
        "os_enforcement_verified",
        "initialization_available",
        "activation_available",
        "grants_action_authority",
    ] {
        assert_eq!(diagnostic[field], false, "{field}");
    }
    assert!(!diagnostic.to_string().contains(REPOSITORY_PATH));
    assert!(!diagnostic.to_string().contains(REPOSITORY_REF));
}
