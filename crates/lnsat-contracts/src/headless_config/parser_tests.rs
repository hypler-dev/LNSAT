use super::{
    HEADLESS_CONFIG_SCHEMA_V1, HeadlessConfigErrorV1, MAX_HEADLESS_CONFIG_BYTES_V1,
    parse_headless_config_declaration_v1,
};
use serde_json::{Value, json};

pub(crate) fn valid_document() -> Value {
    json!({
        "contract_version": "lnsat.contracts.v1_0",
        "schema_id": HEADLESS_CONFIG_SCHEMA_V1,
        "installation_ref": "installation:local:test",
        "resources": [{
            "resource_ref": "resource:repository:main",
            "kind": "repository",
            "identity_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        }],
        "layers": [{
            "layer_ref": "layer:project:main",
            "stage": "project",
            "resource_allow": ["resource:repository:main"],
            "action_rules": [{
                "principal_ref": "identity:local:operator",
                "resource_ref": "resource:repository:main",
                "capability": "context.read",
                "mode": "allow",
                "limits": {
                    "tokens": 1,
                    "runtime_seconds": 1,
                    "cost_microusd": 1,
                    "cpu_millicores": 1,
                    "memory_bytes": 1
                }
            }]
        }]
    })
}

fn parse(value: &Value) -> Result<super::HeadlessConfigDeclarationV1, HeadlessConfigErrorV1> {
    parse_headless_config_declaration_v1(&serde_json::to_vec(value).expect("test JSON encodes"))
}

#[test]
fn valid_declaration_parses_without_raw_debug_reflection() {
    let declaration = parse(&valid_document()).expect("valid declaration parses");
    let debug = format!("{declaration:?}");
    assert!(debug.contains("resource_count"));
    assert!(!debug.contains("installation:local:test"));
    assert!(!debug.contains("resource:repository:main"));
}

#[test]
fn size_trailing_and_duplicate_json_fail_closed() {
    assert_eq!(
        parse_headless_config_declaration_v1(&vec![b' '; MAX_HEADLESS_CONFIG_BYTES_V1 + 1]),
        Err(HeadlessConfigErrorV1::InvalidSize)
    );
    let trailing = format!("{} trailing", valid_document());
    assert_eq!(
        parse_headless_config_declaration_v1(trailing.as_bytes()),
        Err(HeadlessConfigErrorV1::InvalidJson)
    );
    let encoded = serde_json::to_string(&valid_document()).expect("test JSON encodes");
    for (field, escaped_field, value) in [
        (
            "schema_id",
            "schema\\u005fid",
            "\"lnsat.headless_config.declaration.v1\"",
        ),
        (
            "identity_digest",
            "identity_di\\u0067est",
            "\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"",
        ),
        ("layer_ref", "lay\\u0065r_ref", "\"layer:project:main\""),
        (
            "principal_ref",
            "principal_r\\u0065f",
            "\"identity:local:operator\"",
        ),
        ("tokens", "tok\\u0065ns", "1"),
    ] {
        let needle = format!("\"{field}\":{value}");
        let replacement = format!("\"{escaped_field}\":{value},\"{field}\":{value}");
        let duplicate = encoded.replacen(&needle, &replacement, 1);
        assert_ne!(duplicate, encoded, "{field} replacement must occur");
        assert_eq!(
            serde_json::from_str::<Value>(&duplicate).expect("duplicate JSON remains valid"),
            valid_document(),
            "{field} duplicate must remain valid JSON"
        );
        assert_eq!(
            parse_headless_config_declaration_v1(duplicate.as_bytes()),
            Err(HeadlessConfigErrorV1::InvalidJson),
            "{field} duplicate must reject"
        );
    }
}

#[test]
fn unknown_null_reference_and_digest_fields_fail_closed() {
    let mut unknown = valid_document();
    unknown["unexpected"] = json!(true);
    assert_eq!(parse(&unknown), Err(HeadlessConfigErrorV1::InvalidJson));

    for nested_unknown in [
        {
            let mut value = valid_document();
            value["resources"][0]["unexpected"] = json!(true);
            value
        },
        {
            let mut value = valid_document();
            value["layers"][0]["unexpected"] = json!(true);
            value
        },
        {
            let mut value = valid_document();
            value["layers"][0]["action_rules"][0]["unexpected"] = json!(true);
            value
        },
        {
            let mut value = valid_document();
            value["layers"][0]["action_rules"][0]["limits"]["unexpected"] = json!(true);
            value
        },
    ] {
        assert_eq!(
            parse(&nested_unknown),
            Err(HeadlessConfigErrorV1::InvalidJson)
        );
    }

    let mut null = valid_document();
    null["installation_ref"] = Value::Null;
    assert_eq!(parse(&null), Err(HeadlessConfigErrorV1::InvalidJson));

    let mut reference = valid_document();
    reference["resources"][0]["resource_ref"] = json!("not-a-reference");
    assert_eq!(
        parse(&reference),
        Err(HeadlessConfigErrorV1::InvalidDeclaration)
    );

    let mut digest = valid_document();
    digest["resources"][0]["identity_digest"] =
        json!("sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    assert_eq!(
        parse(&digest),
        Err(HeadlessConfigErrorV1::InvalidDeclaration)
    );
}

#[test]
fn unsupported_contract_and_integer_shapes_fail_closed() {
    for (field, value) in [
        ("contract_version", json!("lnsat.contracts.v9_0")),
        ("schema_id", json!("lnsat.headless_config.declaration.v9")),
    ] {
        let mut unsupported = valid_document();
        unsupported[field] = value;
        assert_eq!(
            parse(&unsupported),
            Err(HeadlessConfigErrorV1::UnsupportedContract)
        );
    }
    for value in [json!(-1), json!(1.5), Value::Null] {
        let mut invalid_integer = valid_document();
        invalid_integer["layers"][0]["action_rules"][0]["limits"]["tokens"] = value;
        assert_eq!(
            parse(&invalid_integer),
            Err(HeadlessConfigErrorV1::InvalidJson)
        );
    }
    let malformed = b"{";
    assert_eq!(
        parse_headless_config_declaration_v1(malformed),
        Err(HeadlessConfigErrorV1::InvalidJson)
    );
    let deep = format!("{}0{}", "[".repeat(140), "]".repeat(140));
    assert_eq!(
        parse_headless_config_declaration_v1(deep.as_bytes()),
        Err(HeadlessConfigErrorV1::InvalidJson)
    );
}

#[test]
fn collection_stage_and_composition_invariants_fail_closed() {
    let mut resource_order = valid_document();
    resource_order["resources"] = json!([
        resource_order["resources"][0].clone(),
        {
            "resource_ref": "resource:connector:second",
            "kind": "connector",
            "identity_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        }
    ]);
    assert_eq!(
        parse(&resource_order),
        Err(HeadlessConfigErrorV1::NoncanonicalCollection)
    );

    let mut missing_project = valid_document();
    missing_project["layers"][0]["stage"] = json!("runtime");
    assert_eq!(
        parse(&missing_project),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );

    let mut first_layer_missing_root = valid_document();
    first_layer_missing_root["layers"][0]["resource_allow"] = json!([]);
    assert_eq!(
        parse(&first_layer_missing_root),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );

    let mut duplicate_resource_allow = valid_document();
    duplicate_resource_allow["layers"][0]["resource_allow"] =
        json!(["resource:repository:main", "resource:repository:main"]);
    assert_eq!(
        parse(&duplicate_resource_allow),
        Err(HeadlessConfigErrorV1::NoncanonicalCollection)
    );

    let mut duplicate_rule = valid_document();
    let rule = duplicate_rule["layers"][0]["action_rules"][0].clone();
    duplicate_rule["layers"][0]["action_rules"] = json!([rule.clone(), rule]);
    assert_eq!(
        parse(&duplicate_rule),
        Err(HeadlessConfigErrorV1::NoncanonicalCollection)
    );

    let mut repeated_stage = valid_document();
    repeated_stage["layers"].as_array_mut().unwrap().extend([
        json!({
            "layer_ref": "layer:runtime:one",
            "stage": "runtime",
            "resource_allow": ["resource:repository:main"],
            "action_rules": []
        }),
        json!({
            "layer_ref": "layer:operator:one",
            "stage": "runtime",
            "resource_allow": ["resource:repository:main"],
            "action_rules": []
        }),
    ]);
    assert_eq!(
        parse(&repeated_stage),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );

    let mut duplicate_layer_ref = valid_document();
    duplicate_layer_ref["layers"]
        .as_array_mut()
        .unwrap()
        .push(json!({
            "layer_ref": "layer:project:main",
            "stage": "runtime",
            "resource_allow": ["resource:repository:main"],
            "action_rules": []
        }));
    assert_eq!(
        parse(&duplicate_layer_ref),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );
}

#[test]
fn limits_and_policy_floor_fail_closed() {
    let mut oversized = valid_document();
    oversized["layers"][0]["action_rules"][0]["limits"]["tokens"] = json!(9_007_199_254_740_992u64);
    assert_eq!(
        parse(&oversized),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );

    let mut deny_limits = valid_document();
    deny_limits["layers"][0]["action_rules"][0]["mode"] = json!("deny");
    assert_eq!(
        parse(&deny_limits),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );

    let mut unsupported = valid_document();
    unsupported["layers"][0]["action_rules"][0]["capability"] = json!("unknown.capability");
    assert_eq!(
        parse(&unsupported),
        Err(HeadlessConfigErrorV1::UnsupportedCapability)
    );

    let mut widening = valid_document();
    widening["layers"][0]["action_rules"][0]["capability"] = json!("deploy.request");
    assert_eq!(parse(&widening), Err(HeadlessConfigErrorV1::PolicyWidening));

    let mut approval_required = valid_document();
    approval_required["layers"][0]["action_rules"][0]["capability"] = json!("deploy.request");
    approval_required["layers"][0]["action_rules"][0]["mode"] = json!("approval_required");
    assert!(parse(&approval_required).is_ok());

    let mut unknown_resource_deny = valid_document();
    unknown_resource_deny["layers"][0]["action_rules"][0]["resource_ref"] =
        json!("resource:repository:unknown");
    unknown_resource_deny["layers"][0]["action_rules"][0]["mode"] = json!("deny");
    unknown_resource_deny["layers"][0]["action_rules"][0]["limits"] = json!({
        "tokens": 0,
        "runtime_seconds": 0,
        "cost_microusd": 0,
        "cpu_millicores": 0,
        "memory_bytes": 0
    });
    assert_eq!(
        parse(&unknown_resource_deny),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );

    let mut safe_max = valid_document();
    safe_max["layers"][0]["action_rules"][0]["limits"] = json!({
        "tokens": 9_007_199_254_740_991u64,
        "runtime_seconds": 9_007_199_254_740_991u64,
        "cost_microusd": 9_007_199_254_740_991u64,
        "cpu_millicores": 9_007_199_254_740_991u64,
        "memory_bytes": 9_007_199_254_740_991u64
    });
    assert!(parse(&safe_max).is_ok());
}

#[test]
fn empty_resources_and_rules_are_valid_but_no_layers_is_not() {
    let mut empty = valid_document();
    empty["resources"] = json!([]);
    empty["layers"][0]["resource_allow"] = json!([]);
    empty["layers"][0]["action_rules"] = json!([]);
    assert!(parse(&empty).is_ok());

    let mut no_layers = valid_document();
    no_layers["layers"] = json!([]);
    assert_eq!(
        parse(&no_layers),
        Err(HeadlessConfigErrorV1::InvalidComposition)
    );
}
