use super::{UnverifiedImage, decode_image_claim};
use serde_json::{Map, Value, json};

// Synthetic source-shaped bodies. They are not daemon observations, OCI blobs,
// artifact pins, or image-recipe evidence.
const SYNTAX: &str = "headless_image.json_syntax";
const LIMITS: &str = "headless_image.json_limits";
const SHAPE: &str = "headless_image.json_shape";
const RECIPE: &str = "headless_image.recipe";
const TOO_LARGE: &str = "headless_image.input_too_large";
const MAX_BODY: usize = 1_048_576;

fn digest(byte: char) -> String {
    format!("sha256:{}", byte.to_string().repeat(64))
}

fn numbered_digest(value: usize) -> String {
    format!("sha256:{value:064x}")
}

fn nested_unknown_object(levels: usize) -> String {
    let mut body = "null".to_owned();
    for _ in 0..levels {
        body = format!("{{\"x\":{body}}}");
    }
    body
}

fn fixture() -> Value {
    json!({
        "Id": digest('a'),
        "RepoTags": ["registry.invalid/synthetic:one"],
        "RepoDigests": [format!("registry.invalid/synthetic@{}", digest('b'))],
        "Config": {
            "User": "1000:1000",
            "Env": ["A=one", ""],
            "Entrypoint": ["/synthetic/entry"],
            "Cmd": ["--synthetic", "run"],
            "WorkingDir": "/work",
            "Labels": {"z": "last", "a": "first"},
            "StopSignal": "SIGTERM",
            "Healthcheck": {"Test": ["NONE"]}
        },
        "Architecture": "amd64",
        "Os": "linux",
        "Size": 42,
        "RootFS": {"Type": "layers", "Layers": [digest('c'), digest('d')]},
        "Metadata": {"LastTagTime": "0001-01-01T00:00:00Z"},
        "Comment": "synthetic comment",
        "Created": "2026-02-28T23:59:59.123456789Z",
        "Author": "synthetic author",
        "Variant": "v8",
        "GraphDriver": {"Name": "overlay2", "Data": {"UpperDir": "/synthetic/up", "LowerDir": "/synthetic/lower"}}
    })
}

fn source_shaped_recipe_fixture() -> Value {
    let mut value = fixture();
    value["Config"] = json!({
        "Env": [
            "PATH=/usr/bin", "LANG=C", "LC_ALL=C", "HOME=/nonexistent",
            "GIT_CONFIG_NOSYSTEM=1", "GIT_CONFIG_GLOBAL=/dev/null",
            "GIT_TERMINAL_PROMPT=0", "GIT_NO_REPLACE_OBJECTS=1",
            "GIT_ATTR_NOSYSTEM=1"
        ],
        "Entrypoint": ["/usr/local/bin/lnsat-hcfg6-adapter"],
        "WorkingDir": "/",
        "Labels": {"io.lnsat.image-role": "hcfg6-git-reference"},
        "Healthcheck": {"Test": ["NONE"]}
    });
    value
}

fn descriptor_fixture(media_type: &str) -> Value {
    let mut value = fixture();
    value.as_object_mut().expect("root").remove("GraphDriver");
    value["Descriptor"] = json!({
        "mediaType": media_type,
        "digest": value["Id"].clone(),
        "size": 73,
        "annotations": {"z": "last", "a": "first"},
        "platform": {"architecture": "amd64", "os": "linux", "variant": "v8"}
    });
    value
}

fn encode(value: &Value) -> Vec<u8> {
    serde_json::to_vec(value).expect("synthetic JSON serializes")
}

fn accept(input: &[u8]) -> UnverifiedImage {
    match decode_image_claim(input) {
        Ok(value) => value,
        Err(error) => panic!("synthetic positive denied: {}", error.code()),
    }
}

fn deny(input: &[u8], expected: &str) {
    let Err(error) = decode_image_claim(input) else {
        panic!("synthetic negative accepted");
    };
    assert_eq!(error.code(), expected);
    assert!(!format!("{error:?}").contains("PRIVATE_CANARY"));
}

fn put(value: &mut Value, pointer: &str, replacement: Value) {
    *value.pointer_mut(pointer).expect("synthetic path") = replacement;
}

fn remove(value: &mut Value, pointer: &str) {
    let (parent, key) = pointer.rsplit_once('/').expect("non-root pointer");
    value
        .pointer_mut(parent)
        .expect("parent")
        .as_object_mut()
        .expect("map")
        .remove(key)
        .expect("synthetic key");
}

// Rebuild ancestors so tests can exercise duplicate keys and exact number
// spellings without using serde_json as parser oracle.
fn raw_at(value: &Value, pointer: &str, replacement: &str) -> Vec<u8> {
    fn render(value: &Value, parts: &[&str], replacement: &str) -> String {
        if parts.is_empty() {
            return replacement.to_owned();
        }
        match value {
            Value::Object(map) => {
                assert!(map.contains_key(parts[0]));
                let pairs: Vec<_> = map
                    .iter()
                    .map(|(key, child)| {
                        let child = if key == parts[0] {
                            render(child, &parts[1..], replacement)
                        } else {
                            child.to_string()
                        };
                        format!("{}:{child}", serde_json::to_string(key).expect("key"))
                    })
                    .collect();
                format!("{{{}}}", pairs.join(","))
            }
            Value::Array(array) => {
                let index: usize = parts[0].parse().expect("array index");
                assert!(index < array.len());
                let items: Vec<_> = array
                    .iter()
                    .enumerate()
                    .map(|(index_now, child)| {
                        if index_now == index {
                            render(child, &parts[1..], replacement)
                        } else {
                            child.to_string()
                        }
                    })
                    .collect();
                format!("[{}]", items.join(","))
            }
            _ => panic!("synthetic ancestor is scalar"),
        }
    }
    let parts: Vec<_> = pointer
        .strip_prefix('/')
        .filter(|value| !value.is_empty())
        .map_or_else(Vec::new, |value| value.split('/').collect());
    render(value, &parts, replacement).into_bytes()
}

fn duplicate(value: &Value, pointer: &str, key: &str, escaped: bool) -> Vec<u8> {
    let object = value.pointer(pointer).expect("object");
    let original = serde_json::to_string(object).expect("object JSON");
    let encoded_key = if escaped {
        format!("\\u{:04x}{}", u32::from(key.as_bytes()[0]), &key[1..])
    } else {
        key.to_owned()
    };
    let replacement = format!("{{\"{encoded_key}\":{},{}", object[key], &original[1..]);
    raw_at(value, pointer, &replacement)
}

fn projection(value: &UnverifiedImage) -> ImageProjection {
    ImageProjection {
        id: value.id.as_str().to_owned(),
        architecture: value.architecture.as_str().to_owned(),
        variant: value
            .variant
            .as_ref()
            .map(|value| value.as_str().to_owned()),
        user: value
            .config
            .user
            .as_ref()
            .map(|value| value.as_str().to_owned()),
        env: value.config.env.as_ref().map(|values| {
            values
                .iter()
                .map(|value| value.as_str().to_owned())
                .collect()
        }),
        entrypoint: value.config.entrypoint.as_ref().map(|values| {
            values
                .iter()
                .map(|value| value.as_str().to_owned())
                .collect()
        }),
        cmd: value.config.cmd.as_ref().map(|values| {
            values
                .iter()
                .map(|value| value.as_str().to_owned())
                .collect()
        }),
        working_dir: value
            .config
            .working_dir
            .as_ref()
            .map(|value| value.as_str().to_owned()),
        labels: value.config.labels.as_ref().map(|pairs| {
            pairs
                .iter()
                .map(|pair| (pair.key.as_str().to_owned(), pair.value.as_str().to_owned()))
                .collect()
        }),
        stop_signal: value
            .config
            .stop_signal
            .as_ref()
            .map(|value| value.as_str().to_owned()),
        healthcheck_present: value.config.healthcheck_present,
        layers: value
            .layers
            .iter()
            .map(|value| value.as_str().to_owned())
            .collect(),
        size: value.size,
        graph_driver: value
            .graph_driver
            .as_ref()
            .map(|value| value.as_str().to_owned()),
        descriptor: value
            .descriptor
            .as_ref()
            .map(|descriptor| DescriptorProjection {
                media_type: descriptor.media_type.as_str().to_owned(),
                digest: descriptor.digest.as_str().to_owned(),
                size: descriptor.size,
                annotations: descriptor.annotations.as_ref().map(|pairs| {
                    pairs
                        .iter()
                        .map(|pair| (pair.key.as_str().to_owned(), pair.value.as_str().to_owned()))
                        .collect()
                }),
                platform_present: descriptor.platform_present,
            }),
    }
}

#[derive(Debug, PartialEq)]
struct ImageProjection {
    id: String,
    architecture: String,
    variant: Option<String>,
    user: Option<String>,
    env: Option<Vec<String>>,
    entrypoint: Option<Vec<String>>,
    cmd: Option<Vec<String>>,
    working_dir: Option<String>,
    labels: Option<Vec<(String, String)>>,
    stop_signal: Option<String>,
    healthcheck_present: bool,
    layers: Vec<String>,
    size: i64,
    graph_driver: Option<String>,
    descriptor: Option<DescriptorProjection>,
}

#[derive(Debug, PartialEq)]
struct DescriptorProjection {
    media_type: String,
    digest: String,
    size: i64,
    annotations: Option<Vec<(String, String)>>,
    platform_present: bool,
}

#[test]
fn image_decoder_projects_graphdriver_claim_without_data_and_preserves_config_order() {
    let result = projection(&accept(&encode(&fixture())));
    assert_eq!(
        result,
        ImageProjection {
            id: digest('a'),
            architecture: "amd64".to_owned(),
            variant: Some("v8".to_owned()),
            user: Some("1000:1000".to_owned()),
            env: Some(vec!["A=one".to_owned(), String::new()]),
            entrypoint: Some(vec!["/synthetic/entry".to_owned()]),
            cmd: Some(vec!["--synthetic".to_owned(), "run".to_owned()]),
            working_dir: Some("/work".to_owned()),
            labels: Some(vec![
                ("a".to_owned(), "first".to_owned()),
                ("z".to_owned(), "last".to_owned())
            ]),
            stop_signal: Some("SIGTERM".to_owned()),
            healthcheck_present: true,
            layers: vec![digest('c'), digest('d')],
            size: 42,
            graph_driver: Some("overlay2".to_owned()),
            descriptor: None,
        }
    );
}

#[test]
fn image_decoder_projects_source_shaped_raw_empty_omissions_without_raw_blob_claim() {
    let result = projection(&accept(&encode(&source_shaped_recipe_fixture())));
    assert_eq!(result.user, None);
    assert_eq!(result.cmd, None);
    assert_eq!(result.working_dir.as_deref(), Some("/"));
    assert_eq!(
        result.entrypoint,
        Some(vec!["/usr/local/bin/lnsat-hcfg6-adapter".to_owned()])
    );
    assert_eq!(
        result.env,
        Some(vec![
            "PATH=/usr/bin".to_owned(),
            "LANG=C".to_owned(),
            "LC_ALL=C".to_owned(),
            "HOME=/nonexistent".to_owned(),
            "GIT_CONFIG_NOSYSTEM=1".to_owned(),
            "GIT_CONFIG_GLOBAL=/dev/null".to_owned(),
            "GIT_TERMINAL_PROMPT=0".to_owned(),
            "GIT_NO_REPLACE_OBJECTS=1".to_owned(),
            "GIT_ATTR_NOSYSTEM=1".to_owned(),
        ])
    );
    assert_eq!(
        result.labels,
        Some(vec![(
            "io.lnsat.image-role".to_owned(),
            "hcfg6-git-reference".to_owned(),
        )])
    );
}

#[test]
fn image_decoder_projects_manifest_and_index_targets_without_config_substitution() {
    for media_type in [
        "application/vnd.oci.image.manifest.v1+json",
        "application/vnd.oci.image.index.v1+json",
    ] {
        let result = projection(&accept(&encode(&descriptor_fixture(media_type))));
        assert_eq!(result.graph_driver, None);
        assert_eq!(
            result.descriptor,
            Some(DescriptorProjection {
                media_type: media_type.to_owned(),
                digest: digest('a'),
                size: 73,
                annotations: Some(vec![
                    ("a".to_owned(), "first".to_owned()),
                    ("z".to_owned(), "last".to_owned())
                ]),
                platform_present: true,
            })
        );
    }

    let mut index = descriptor_fixture("application/vnd.oci.image.index.v1+json");
    // Synthetic index target differs from a held child manifest/config digest.
    index["Config"]["Labels"]["held-child-manifest"] = json!(digest('e'));
    index["Config"]["Labels"]["held-config"] = json!(digest('f'));
    let result = projection(&accept(&encode(&index)));
    assert_eq!(result.id, digest('a'));
    assert_ne!(result.id, digest('e'));
    assert_ne!(result.id, digest('f'));
}

#[test]
fn image_decoder_omission_null_empty_and_full_config_presence_is_exact() {
    let mut omitted = fixture();
    omitted["Config"] = json!({});
    let result = projection(&accept(&encode(&omitted)));
    assert_eq!(result.user, None);
    assert_eq!(result.env, None);
    assert_eq!(result.labels, None);
    assert!(!result.healthcheck_present);

    let mut raw_empty_omitted = fixture();
    remove(&mut raw_empty_omitted, "/Config/User");
    remove(&mut raw_empty_omitted, "/Config/Cmd");
    assert_eq!(projection(&accept(&encode(&raw_empty_omitted))).user, None);
    assert_eq!(projection(&accept(&encode(&raw_empty_omitted))).cmd, None);

    let base = fixture();
    for pointer in [
        "/Config/User",
        "/Config/Env",
        "/Config/Entrypoint",
        "/Config/Cmd",
        "/Config/WorkingDir",
        "/Config/Labels",
        "/Config/StopSignal",
        "/Config/Healthcheck",
        "/Variant",
        "/GraphDriver",
    ] {
        let mut null = base.clone();
        put(&mut null, pointer, Value::Null);
        deny(&encode(&null), SHAPE);
    }
    for pointer in [
        "/Config/User",
        "/Config/WorkingDir",
        "/Config/StopSignal",
        "/Variant",
        "/GraphDriver/Name",
    ] {
        let mut empty = base.clone();
        put(&mut empty, pointer, json!(""));
        deny(&encode(&empty), RECIPE);
    }
    for pointer in ["/Config/Env", "/Config/Entrypoint", "/Config/Cmd"] {
        let mut empty = base.clone();
        put(&mut empty, pointer, json!([]));
        deny(&encode(&empty), RECIPE);
    }
    let mut empty_labels = base.clone();
    put(&mut empty_labels, "/Config/Labels", json!({}));
    deny(&encode(&empty_labels), RECIPE);
}

#[test]
fn image_decoder_nonempty_only_claims_accept_literal_na_but_identity_claims_do_not() {
    let mut nonidentity = fixture();
    put(&mut nonidentity, "/Comment", json!("N/A"));
    put(&mut nonidentity, "/Author", json!("N/A"));
    put(&mut nonidentity, "/Config/User", json!("N/A"));
    put(&mut nonidentity, "/Config/WorkingDir", json!("N/A"));
    put(&mut nonidentity, "/Config/StopSignal", json!("N/A"));
    accept(&encode(&nonidentity));

    for pointer in ["/Architecture", "/Variant", "/GraphDriver/Name"] {
        let mut value = fixture();
        put(&mut value, pointer, json!("N/A"));
        deny(&encode(&value), RECIPE);
    }
    for pointer in [
        "/Descriptor/platform/architecture",
        "/Descriptor/platform/variant",
    ] {
        let mut value = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
        put(&mut value, pointer, json!("N/A"));
        deny(&encode(&value), RECIPE);
    }
}

#[test]
fn image_decoder_lists_graph_data_descriptor_options_and_healthcheck_are_closed() {
    let base = fixture();
    for key in ["RepoTags", "RepoDigests"] {
        let mut empty = base.clone();
        put(&mut empty, &format!("/{key}"), json!([]));
        accept(&encode(&empty));
        let mut null = base.clone();
        put(&mut null, &format!("/{key}"), Value::Null);
        deny(&encode(&null), SHAPE);
    }
    for data in [Value::Null, json!({}), json!({"canary": "PRIVATE_CANARY"})] {
        let mut value = base.clone();
        put(&mut value, "/GraphDriver/Data", data);
        assert_eq!(
            projection(&accept(&encode(&value))),
            projection(&accept(&encode(&base)))
        );
    }
    for representation in [
        json!({"Test": ["NONE"]}),
        json!({"Test": ["NONE"], "Interval": 0}),
    ] {
        let mut value = base.clone();
        value["Config"]["Healthcheck"] = representation;
        if value["Config"]["Healthcheck"].get("Interval").is_some() {
            deny(&encode(&value), SHAPE);
        } else {
            accept(&encode(&value));
        }
    }
    for test in [
        json!([]),
        json!(["NONE", "extra"]),
        json!(["none"]),
        json!("NONE"),
    ] {
        let mut value = base.clone();
        value["Config"]["Healthcheck"] = json!({"Test": test});
        deny(
            &encode(&value),
            if value["Config"]["Healthcheck"]["Test"].is_array() {
                RECIPE
            } else {
                SHAPE
            },
        );
    }
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    for key in ["annotations", "platform"] {
        let mut omitted = descriptor.clone();
        remove(&mut omitted, &format!("/Descriptor/{key}"));
        accept(&encode(&omitted));
        let mut null = descriptor.clone();
        put(&mut null, &format!("/Descriptor/{key}"), Value::Null);
        deny(&encode(&null), SHAPE);
    }
    for count in [0_usize, 1, 64, 65] {
        let mut value = descriptor.clone();
        let annotations: Map<String, Value> = (0..count)
            .map(|index| (format!("a{index:03}"), json!("v")))
            .collect();
        value["Descriptor"]["annotations"] = Value::Object(annotations);
        if (1..=64).contains(&count) {
            accept(&encode(&value));
        } else {
            deny(&encode(&value), if count == 65 { LIMITS } else { RECIPE });
        }
    }
}

#[test]
fn image_decoder_closed_maps_map_only_duplicate_escaped_unknown_and_wrong_case() {
    let base = fixture();
    for (pointer, key) in [
        ("", "Id"),
        ("/Config", "User"),
        ("/RootFS", "Type"),
        ("/Metadata", "LastTagTime"),
        ("/GraphDriver", "Name"),
        ("/GraphDriver/Data", "UpperDir"),
    ] {
        deny(&duplicate(&base, pointer, key, false), SHAPE);
        deny(&duplicate(&base, pointer, key, true), SHAPE);
    }
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    for (pointer, key) in [
        ("/Descriptor", "digest"),
        ("/Descriptor/platform", "architecture"),
        ("/Descriptor/annotations", "a"),
    ] {
        deny(&duplicate(&descriptor, pointer, key, false), SHAPE);
        deny(&duplicate(&descriptor, pointer, key, true), SHAPE);
    }
    for pointer in ["", "/Config", "/RootFS", "/Metadata", "/GraphDriver"] {
        let mut unknown = base.clone();
        let object = unknown
            .pointer_mut(pointer)
            .expect("map")
            .as_object_mut()
            .expect("map");
        object.insert("UNKNOWN".to_owned(), json!("PRIVATE_CANARY"));
        deny(&encode(&unknown), SHAPE);
        let mut case = base.clone();
        let object = case
            .pointer_mut(pointer)
            .expect("map")
            .as_object_mut()
            .expect("map");
        let (key, value) = object
            .iter()
            .next()
            .map(|(key, value)| (key.clone(), value.clone()))
            .expect("key");
        object.remove(&key);
        object.insert(key.to_ascii_lowercase(), value);
        deny(&encode(&case), SHAPE);
    }
    for pointer in [
        "",
        "/Config",
        "/RootFS",
        "/Metadata",
        "/GraphDriver",
        "/Descriptor",
    ] {
        let value = if pointer == "/Descriptor" {
            descriptor_fixture("application/vnd.oci.image.manifest.v1+json")
        } else {
            base.clone()
        };
        deny(&raw_at(&value, pointer, "[]"), SHAPE);
    }
}

#[test]
fn image_decoder_forbidden_keys_and_all_fixed_predicates_deny() {
    let base = fixture();
    for key in ["OsVersion", "Manifests", "Identity"] {
        let mut value = base.clone();
        value
            .as_object_mut()
            .expect("root")
            .insert(key.to_owned(), Value::Null);
        deny(&encode(&value), SHAPE);
    }
    for key in [
        "ImageConfig",
        "DockerOCIImageConfigExt",
        "ExposedPorts",
        "Volumes",
        "ArgsEscaped",
        "OnBuild",
        "Shell",
    ] {
        let mut value = base.clone();
        value["Config"]
            .as_object_mut()
            .expect("config")
            .insert(key.to_owned(), Value::Bool(false));
        deny(&encode(&value), SHAPE);
    }
    for key in ["urls", "data", "artifactType", "future"] {
        let mut value = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
        value["Descriptor"]
            .as_object_mut()
            .expect("descriptor")
            .insert(key.to_owned(), Value::Null);
        deny(&encode(&value), SHAPE);
    }
    for key in ["os.version", "os.features", "future"] {
        let mut value = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
        value["Descriptor"]["platform"]
            .as_object_mut()
            .expect("platform")
            .insert(key.to_owned(), Value::Null);
        deny(&encode(&value), SHAPE);
    }
    for (pointer, bad) in [
        ("/Id", json!(digest('A'))),
        ("/Id", json!("sha256:abcd")),
        ("/Architecture", json!("")),
        ("/Architecture", json!("N/A")),
        ("/Os", json!("windows")),
        ("/Variant", json!("N/A")),
        ("/RootFS/Type", json!("layer")),
        ("/GraphDriver/Name", json!("N/A")),
    ] {
        let mut value = base.clone();
        put(&mut value, pointer, bad);
        deny(&encode(&value), RECIPE);
    }
}

#[test]
fn image_decoder_storage_branches_are_exclusive_and_descriptor_target_is_exact() {
    let graph = fixture();
    let mut neither = graph.clone();
    remove(&mut neither, "/GraphDriver");
    deny(&encode(&neither), RECIPE);

    let mut both = graph.clone();
    both["Descriptor"] =
        descriptor_fixture("application/vnd.oci.image.manifest.v1+json")["Descriptor"].clone();
    deny(&encode(&both), RECIPE);

    let mut mismatch = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    put(&mut mismatch, "/Descriptor/digest", json!(digest('b')));
    deny(&encode(&mismatch), RECIPE);
    for media_type in [
        "application/json",
        "",
        "application/vnd.oci.image.manifest.v1+json; charset=utf-8",
    ] {
        let mut value = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
        put(&mut value, "/Descriptor/mediaType", json!(media_type));
        deny(&encode(&value), RECIPE);
    }
    let mut bad_platform = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    put(
        &mut bad_platform,
        "/Descriptor/platform/architecture",
        json!("arm64"),
    );
    deny(&encode(&bad_platform), RECIPE);
    let mut absent_platform = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    remove(&mut absent_platform, "/Descriptor/platform");
    assert!(
        !projection(&accept(&encode(&absent_platform)))
            .descriptor
            .expect("descriptor")
            .platform_present
    );
}

#[test]
fn image_decoder_layers_arrays_and_dictionaries_have_exact_cardinality() {
    for count in [0_usize, 1, 16, 17] {
        let mut value = fixture();
        value["RootFS"]["Layers"] = Value::Array(
            (0..count)
                .map(|index| json!(numbered_digest(index)))
                .collect(),
        );
        if (1..=16).contains(&count) {
            assert_eq!(projection(&accept(&encode(&value))).layers.len(), count);
        } else {
            deny(&encode(&value), RECIPE);
        }
    }
    let mut repeated = fixture();
    repeated["RootFS"]["Layers"] = json!([digest('c'), digest('c')]);
    deny(&encode(&repeated), RECIPE);
    let mut reordered = fixture();
    reordered["RootFS"]["Layers"] = json!([digest('d'), digest('c')]);
    assert_eq!(
        projection(&accept(&encode(&reordered))).layers,
        vec![digest('d'), digest('c')]
    );

    for count in [0_usize, 1, 64, 65] {
        let mut config = fixture();
        config["Config"]["Env"] = Value::Array(
            (0..count)
                .map(|index| json!(format!("K{index}=V")))
                .collect(),
        );
        if (1..=64).contains(&count) {
            accept(&encode(&config));
        } else {
            deny(&encode(&config), RECIPE);
        }
        let mut labels = fixture();
        let map: Map<String, Value> = (0..count)
            .map(|index| (format!("k{index:03}"), json!("v")))
            .collect();
        labels["Config"]["Labels"] = Value::Object(map);
        if (1..=64).contains(&count) {
            accept(&encode(&labels));
        } else {
            deny(&encode(&labels), if count == 65 { LIMITS } else { RECIPE });
        }
    }
}

#[test]
fn image_decoder_integer_forms_and_timestamp_calendar_boundaries_are_closed() {
    for token in ["0", "9223372036854775807"] {
        let value = fixture();
        accept(&raw_at(&value, "/Size", token));
    }
    for token in [
        "9223372036854775808",
        "-0",
        "-1",
        "1.0",
        "1e2",
        "true",
        "\"1\"",
    ] {
        let value = fixture();
        deny(&raw_at(&value, "/Size", token), SHAPE);
    }
    for token in ["0", "-0", "-1", "1.0", "1e2", "9223372036854775808"] {
        let value = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
        deny(
            &raw_at(&value, "/Descriptor/size", token),
            if token == "0" { RECIPE } else { SHAPE },
        );
    }
    for timestamp in [
        "2024-02-29T23:59:59Z",
        "2026-12-31T23:59:59.123456789+23:59",
        "0001-01-01T00:00:00Z",
    ] {
        let mut value = fixture();
        put(&mut value, "/Metadata/LastTagTime", json!(timestamp));
        accept(&encode(&value));
    }
    for timestamp in [
        "2023-02-29T00:00:00Z",
        "2026-13-01T00:00:00Z",
        "2026-01-01T24:00:00Z",
        "2026-01-01T00:00:00",
        "2026-01-01T00:00:00.1234567890Z",
        "2026-01-01T00:00:00+24:00",
    ] {
        let mut value = fixture();
        put(&mut value, "/Created", json!(timestamp));
        deny(&encode(&value), RECIPE);
    }
}

#[test]
fn image_decoder_preflight_utf8_syntax_and_competing_precedence_are_exact() {
    let valid = encode(&fixture());
    for length in 0..valid.len() {
        deny(&valid[..length], SYNTAX);
    }
    for raw in [
        b"\xef\xbb\xbf{}".as_slice(),
        b"{\"x\":\"raw\ncontrol\"}".as_slice(),
        b"{\"x\":\"\\uD800\"}".as_slice(),
        b"{\"x\":\"\\uDC00\"}".as_slice(),
        b"{\"x\":\"\\u12G4\"}".as_slice(),
        b"{\"x\":01}".as_slice(),
        b"{\"x\":1e}".as_slice(),
        b"{} {}".as_slice(),
    ] {
        deny(raw, SYNTAX);
    }
    let mut invalid_utf8 = b"{\"x\":\"".to_vec();
    invalid_utf8.push(0xff);
    invalid_utf8.extend_from_slice(b"\"}");
    deny(&invalid_utf8, SYNTAX);

    let limits_before_syntax = format!("{{\"x\":\"{}", "x".repeat(4097));
    deny(limits_before_syntax.as_bytes(), LIMITS);
    let syntax_before_limits = format!("{{\"x\":?\"{}\"}}", "x".repeat(4097));
    deny(syntax_before_limits.as_bytes(), SYNTAX);
    let mut too_large_invalid = vec![b'x'; MAX_BODY + 1];
    too_large_invalid[0] = 0xff;
    deny(&too_large_invalid, TOO_LARGE);
}

#[test]
fn image_decoder_escaped_unicode_and_dictionary_sorting_are_exact() {
    let base = fixture();
    let escaped = String::from_utf8(encode(&base))
        .expect("fixture UTF-8")
        .replace("User", "U\\u0073er")
        .replace("1000:1000", "1000:\\u0031\\u0030\\u0030\\u0030")
        .replace("UpperDir", "Upper\\u0044ir");
    assert_eq!(
        projection(&accept(escaped.as_bytes())),
        projection(&accept(&encode(&base)))
    );
    let raw_key = "é".repeat(128);
    deny(format!("{{\"{raw_key}\":null}}").as_bytes(), SHAPE);
    let escaped_key = "\\u00e9".repeat(128);
    deny(format!("{{\"{escaped_key}\":null}}").as_bytes(), SHAPE);
    let raw_key_too_long = "é".repeat(129);
    deny(
        format!("{{\"{raw_key_too_long}\":null}}").as_bytes(),
        LIMITS,
    );
    let escaped_key_too_long = "\\u00e9".repeat(129);
    deny(
        format!("{{\"{escaped_key_too_long}\":null}}").as_bytes(),
        LIMITS,
    );
    let raw_value = "é".repeat(2048);
    deny(format!("{{\"x\":\"{raw_value}\"}}").as_bytes(), SHAPE);
    let escaped_value = "\\u00e9".repeat(2048);
    deny(format!("{{\"x\":\"{escaped_value}\"}}").as_bytes(), SHAPE);
    let raw_value_too_long = "é".repeat(2049);
    deny(
        format!("{{\"x\":\"{raw_value_too_long}\"}}").as_bytes(),
        LIMITS,
    );
    let escaped_value_too_long = "\\u00e9".repeat(2049);
    deny(
        format!("{{\"x\":\"{escaped_value_too_long}\"}}").as_bytes(),
        LIMITS,
    );
}

#[test]
fn image_decoder_preflight_reaches_all_declared_caps_without_smaller_mask() {
    let base = encode(&fixture());
    let mut at_cap = base.clone();
    at_cap.extend(std::iter::repeat_n(b' ', MAX_BODY - at_cap.len()));
    accept(&at_cap);
    let mut too_large = at_cap.clone();
    too_large.push(b' ');
    deny(&too_large, TOO_LARGE);

    let key256 = "k".repeat(256);
    deny(format!("{{\"{key256}\":null}}").as_bytes(), SHAPE);
    let key257 = "k".repeat(257);
    deny(format!("{{\"{key257}\":null}}").as_bytes(), LIMITS);
    let value4096 = "v".repeat(4096);
    deny(format!("{{\"x\":\"{value4096}\"}}").as_bytes(), SHAPE);
    let value4097 = "v".repeat(4097);
    deny(format!("{{\"x\":\"{value4097}\"}}").as_bytes(), LIMITS);

    let mut member_4096 = Map::new();
    for outer in 0..64 {
        let mut inner = Map::new();
        for key in 0..63 {
            inner.insert(format!("k{key}"), Value::Null);
        }
        member_4096.insert(format!("o{outer}"), Value::Object(inner));
    }
    deny(&encode(&Value::Object(member_4096)), SHAPE);
    let mut member_4097 = Map::new();
    for outer in 0..64 {
        let mut inner = Map::new();
        for key in 0..if outer == 0 { 64 } else { 63 } {
            inner.insert(format!("k{key}"), Value::Null);
        }
        member_4097.insert(format!("o{outer}"), Value::Object(inner));
    }
    deny(&encode(&Value::Object(member_4097)), LIMITS);

    deny(nested_unknown_object(31).as_bytes(), SHAPE);
    // Depth 32 reaches the declared inclusive preflight limit; closed root shape
    // rejects this unknown body only after preflight has accepted it.
    deny(nested_unknown_object(32).as_bytes(), SHAPE);
    deny(nested_unknown_object(33).as_bytes(), LIMITS);
    for count in [128_usize, 129] {
        let body = format!(
            "[{}]",
            std::iter::repeat_n("null", count)
                .collect::<Vec<_>>()
                .join(",")
        );
        deny(body.as_bytes(), if count == 128 { SHAPE } else { LIMITS });
    }
}

#[test]
fn image_decoder_typed_required_optional_paths_reject_wrong_types_and_nulls() {
    let base = fixture();
    for pointer in [
        "/Id",
        "/RepoTags",
        "/RepoDigests",
        "/Config",
        "/Architecture",
        "/Os",
        "/Size",
        "/RootFS",
        "/Metadata",
        "/RootFS/Type",
        "/RootFS/Layers",
        "/Metadata/LastTagTime",
        "/GraphDriver/Name",
        "/GraphDriver/Data",
    ] {
        let mut value = base.clone();
        put(&mut value, pointer, json!(true));
        deny(&encode(&value), SHAPE);
    }
    for pointer in ["/RepoTags", "/RepoDigests", "/RootFS/Layers"] {
        let mut value = base.clone();
        put(&mut value, pointer, Value::Null);
        deny(&encode(&value), SHAPE);
    }
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    for pointer in [
        "/Descriptor/mediaType",
        "/Descriptor/digest",
        "/Descriptor/size",
        "/Descriptor/annotations",
        "/Descriptor/platform",
        "/Descriptor/platform/architecture",
        "/Descriptor/platform/os",
    ] {
        let mut value = descriptor.clone();
        put(&mut value, pointer, json!(false));
        deny(&encode(&value), SHAPE);
    }
    for pointer in [
        "/Id",
        "/RepoTags",
        "/RepoDigests",
        "/Config",
        "/Architecture",
        "/Os",
        "/Size",
        "/RootFS",
        "/Metadata",
    ] {
        let mut value = base.clone();
        remove(&mut value, pointer);
        deny(&encode(&value), SHAPE);
    }
    for pointer in [
        "/RootFS/Type",
        "/RootFS/Layers",
        "/Metadata/LastTagTime",
        "/GraphDriver/Name",
        "/GraphDriver/Data",
    ] {
        let mut value = base.clone();
        remove(&mut value, pointer);
        deny(&encode(&value), SHAPE);
    }
    for pointer in [
        "/Config/User",
        "/Config/Env",
        "/Config/Entrypoint",
        "/Config/Cmd",
        "/Config/WorkingDir",
        "/Config/Labels",
        "/Config/StopSignal",
        "/Config/Healthcheck",
        "/Comment",
        "/Created",
        "/Author",
        "/Variant",
    ] {
        let mut absent = base.clone();
        remove(&mut absent, pointer);
        accept(&encode(&absent));
        let mut wrong_type = base.clone();
        put(&mut wrong_type, pointer, Value::Bool(false));
        deny(&encode(&wrong_type), SHAPE);
    }
    for pointer in [
        "/Descriptor/mediaType",
        "/Descriptor/digest",
        "/Descriptor/size",
        "/Descriptor/platform/architecture",
        "/Descriptor/platform/os",
    ] {
        let mut value = descriptor.clone();
        remove(&mut value, pointer);
        deny(&encode(&value), SHAPE);
    }
}

#[test]
fn image_decoder_remaining_null_type_empty_and_variant_matrix_is_closed() {
    let graph = fixture();
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");

    for pointer in [
        "/Id",
        "/RepoTags",
        "/RepoDigests",
        "/Config",
        "/Architecture",
        "/Os",
        "/Size",
        "/RootFS",
        "/RootFS/Type",
        "/RootFS/Layers",
        "/Metadata",
        "/Metadata/LastTagTime",
    ] {
        let mut value = graph.clone();
        put(&mut value, pointer, Value::Null);
        deny(&encode(&value), SHAPE);
    }
    for pointer in ["/GraphDriver", "/GraphDriver/Name"] {
        let mut value = graph.clone();
        put(&mut value, pointer, Value::Null);
        deny(&encode(&value), SHAPE);
        let mut wrong_type = graph.clone();
        put(&mut wrong_type, pointer, json!(false));
        deny(&encode(&wrong_type), SHAPE);
    }
    let mut null_data = graph.clone();
    put(&mut null_data, "/GraphDriver/Data", Value::Null);
    accept(&encode(&null_data));
    let mut wrong_data = graph.clone();
    put(&mut wrong_data, "/GraphDriver/Data", json!(false));
    deny(&encode(&wrong_data), SHAPE);
    for pointer in [
        "/Comment",
        "/Created",
        "/Author",
        "/Variant",
        "/Config/User",
        "/Config/Env",
        "/Config/Entrypoint",
        "/Config/Cmd",
        "/Config/WorkingDir",
        "/Config/Labels",
        "/Config/StopSignal",
        "/Config/Healthcheck",
    ] {
        let mut value = graph.clone();
        put(&mut value, pointer, Value::Null);
        deny(&encode(&value), SHAPE);
    }
    for pointer in [
        "/Descriptor",
        "/Descriptor/mediaType",
        "/Descriptor/digest",
        "/Descriptor/size",
        "/Descriptor/annotations",
        "/Descriptor/platform",
        "/Descriptor/platform/architecture",
        "/Descriptor/platform/os",
    ] {
        let mut value = descriptor.clone();
        put(&mut value, pointer, Value::Null);
        deny(&encode(&value), SHAPE);
        let mut wrong_type = descriptor.clone();
        put(&mut wrong_type, pointer, json!(false));
        deny(&encode(&wrong_type), SHAPE);
    }
}

#[test]
fn image_decoder_descriptor_optional_variant_and_healthcheck_matrix_is_closed() {
    let graph = fixture();
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    for pointer in ["/Descriptor/annotations", "/Descriptor/platform"] {
        let mut absent = descriptor.clone();
        remove(&mut absent, pointer);
        accept(&encode(&absent));
    }
    let mut platform_variant_absent = descriptor.clone();
    remove(&mut platform_variant_absent, "/Descriptor/platform/variant");
    deny(&encode(&platform_variant_absent), RECIPE);
    let mut root_variant_absent = descriptor.clone();
    remove(&mut root_variant_absent, "/Variant");
    deny(&encode(&root_variant_absent), RECIPE);
    let mut both_variants_absent = descriptor.clone();
    remove(&mut both_variants_absent, "/Variant");
    remove(&mut both_variants_absent, "/Descriptor/platform/variant");
    accept(&encode(&both_variants_absent));
    let mut mismatched_variant = descriptor.clone();
    put(
        &mut mismatched_variant,
        "/Descriptor/platform/variant",
        json!("v7"),
    );
    deny(&encode(&mismatched_variant), RECIPE);
    let mut null_variant = descriptor.clone();
    put(
        &mut null_variant,
        "/Descriptor/platform/variant",
        Value::Null,
    );
    deny(&encode(&null_variant), SHAPE);
    let mut wrong_variant = descriptor.clone();
    put(
        &mut wrong_variant,
        "/Descriptor/platform/variant",
        json!(false),
    );
    deny(&encode(&wrong_variant), SHAPE);
    let mut empty_variant = descriptor.clone();
    put(
        &mut empty_variant,
        "/Descriptor/platform/variant",
        json!(""),
    );
    deny(&encode(&empty_variant), RECIPE);
    let mut nonempty_variant = descriptor.clone();
    put(
        &mut nonempty_variant,
        "/Descriptor/platform/variant",
        json!("v8"),
    );
    accept(&encode(&nonempty_variant));
    for key in ["Timeout", "Retries", "StartPeriod", "StartInterval"] {
        let mut value = graph.clone();
        value["Config"]["Healthcheck"][key] = json!(0);
        deny(&encode(&value), SHAPE);
    }
}

#[test]
fn image_decoder_maps_reorder_and_dynamic_dictionary_rules_are_exact() {
    let graph = fixture();
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    let labels_za = projection(&accept(&raw_at(
        &graph,
        "/Config/Labels",
        r#"{"z":"last","a":"first"}"#,
    )));
    let labels_az = projection(&accept(&raw_at(
        &graph,
        "/Config/Labels",
        r#"{"a":"first","z":"last"}"#,
    )));
    assert_eq!(labels_za, labels_az);
    assert_eq!(
        labels_za.labels,
        Some(vec![
            ("a".to_owned(), "first".to_owned()),
            ("z".to_owned(), "last".to_owned()),
        ])
    );
    let graph_projection = projection(&accept(&encode(&graph)));
    assert_eq!(
        projection(&accept(&raw_at(
            &graph,
            "/GraphDriver/Data",
            r#"{"UpperDir":"/synthetic/up","LowerDir":"/synthetic/lower"}"#,
        ))),
        graph_projection
    );
    let annotations_za = projection(&accept(&raw_at(
        &descriptor,
        "/Descriptor/annotations",
        r#"{"z":"last","a":"first"}"#,
    )));
    let annotations_az = projection(&accept(&raw_at(
        &descriptor,
        "/Descriptor/annotations",
        r#"{"a":"first","z":"last"}"#,
    )));
    assert_eq!(annotations_za, annotations_az);
    assert_eq!(
        annotations_za.descriptor.expect("descriptor").annotations,
        Some(vec![
            ("a".to_owned(), "first".to_owned()),
            ("z".to_owned(), "last".to_owned()),
        ])
    );
}

#[test]
fn image_decoder_closed_and_dynamic_dictionary_rules_are_exact() {
    let graph = fixture();
    let descriptor = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");

    for (value, pointer, key) in [
        (&graph, "/Config/Healthcheck", "Test"),
        (&descriptor, "/Descriptor/platform", "architecture"),
    ] {
        deny(&raw_at(value, pointer, "[]"), SHAPE);
        deny(&duplicate(value, pointer, key, false), SHAPE);
        deny(&duplicate(value, pointer, key, true), SHAPE);
        let mut unknown = (*value).clone();
        unknown
            .pointer_mut(pointer)
            .expect("object")
            .as_object_mut()
            .expect("object")
            .insert("Future".to_owned(), json!("value"));
        deny(&encode(&unknown), SHAPE);
        let mut wrong_case = (*value).clone();
        let object = wrong_case
            .pointer_mut(pointer)
            .expect("object")
            .as_object_mut()
            .expect("object");
        let original = object.remove(key).expect("required key");
        let wrong_case_key = if key == "architecture" {
            "Architecture".to_owned()
        } else {
            key.to_ascii_lowercase()
        };
        object.insert(wrong_case_key, original);
        deny(&encode(&wrong_case), SHAPE);
    }
    let mut descriptor_unknown = descriptor.clone();
    descriptor_unknown["Descriptor"]["Future"] = json!("value");
    deny(&encode(&descriptor_unknown), SHAPE);
    let mut descriptor_wrong_case = descriptor.clone();
    let media_type = descriptor_wrong_case["Descriptor"]
        .as_object_mut()
        .expect("descriptor")
        .remove("mediaType")
        .expect("media type");
    descriptor_wrong_case["Descriptor"]["mediatype"] = media_type;
    deny(&encode(&descriptor_wrong_case), SHAPE);
    for (value, pointer, key) in [
        (&graph, "/Config/Labels", "a"),
        (&graph, "/GraphDriver/Data", "LowerDir"),
        (&descriptor, "/Descriptor/annotations", "a"),
    ] {
        deny(&raw_at(value, pointer, "[]"), SHAPE);
        deny(&duplicate(value, pointer, key, false), SHAPE);
        deny(&duplicate(value, pointer, key, true), SHAPE);
        let mut arbitrary = (*value).clone();
        arbitrary
            .pointer_mut(pointer)
            .expect("dictionary")
            .as_object_mut()
            .expect("dictionary")
            .insert("DifferentCase".to_owned(), json!("value"));
        accept(&encode(&arbitrary));
        let mut wrong_value = (*value).clone();
        wrong_value
            .pointer_mut(pointer)
            .expect("dictionary")
            .as_object_mut()
            .expect("dictionary")
            .insert("different_case".to_owned(), json!(false));
        deny(&encode(&wrong_value), SHAPE);
    }
    let mut non_ascii_annotation = descriptor.clone();
    non_ascii_annotation["Descriptor"]["annotations"]["é"] = json!("value");
    deny(&encode(&non_ascii_annotation), RECIPE);
    for pointer in ["/Comment", "/Author", "/Created", "/Descriptor/digest"] {
        let mut empty = descriptor.clone();
        put(&mut empty, pointer, json!(""));
        deny(&encode(&empty), RECIPE);
    }
    for pointer in [
        "/Descriptor/platform/architecture",
        "/Descriptor/platform/os",
    ] {
        let mut empty = descriptor.clone();
        put(&mut empty, pointer, json!(""));
        deny(&encode(&empty), RECIPE);
    }
}

#[test]
fn image_decoder_retained_descriptor_claims_change_projection_independently() {
    let baseline_value = descriptor_fixture("application/vnd.oci.image.manifest.v1+json");
    let baseline = projection(&accept(&encode(&baseline_value)));
    let mut size = baseline_value.clone();
    put(&mut size, "/Descriptor/size", json!(74));
    assert_ne!(projection(&accept(&encode(&size))), baseline);
    let mut annotations = baseline_value.clone();
    put(
        &mut annotations,
        "/Descriptor/annotations/a",
        json!("changed"),
    );
    assert_ne!(projection(&accept(&encode(&annotations))), baseline);
    let mut no_annotations = baseline_value.clone();
    remove(&mut no_annotations, "/Descriptor/annotations");
    assert_ne!(projection(&accept(&encode(&no_annotations))), baseline);
    let mut index_type = baseline_value.clone();
    put(
        &mut index_type,
        "/Descriptor/mediaType",
        json!("application/vnd.oci.image.index.v1+json"),
    );
    assert_ne!(projection(&accept(&encode(&index_type))), baseline);
    let mut target_digest = baseline_value.clone();
    put(&mut target_digest, "/Id", json!(digest('f')));
    put(&mut target_digest, "/Descriptor/digest", json!(digest('f')));
    assert_ne!(projection(&accept(&encode(&target_digest))), baseline);
    let mut absent_platform = baseline_value.clone();
    remove(&mut absent_platform, "/Descriptor/platform");
    assert_ne!(projection(&accept(&encode(&absent_platform))), baseline);
}

#[test]
fn image_decoder_retained_fields_change_projection_discarded_canaries_do_not() {
    let baseline = projection(&accept(&encode(&fixture())));
    for (pointer, changed) in [
        ("/Id", json!(digest('f'))),
        ("/Architecture", json!("arm64")),
        ("/Variant", json!("v7")),
        ("/Config/User", json!("2000")),
        ("/Config/Env/0", json!("A=two")),
        ("/Config/Entrypoint/0", json!("/other")),
        ("/Config/Cmd/0", json!("--other")),
        ("/Config/WorkingDir", json!("/other")),
        ("/Config/Labels/a", json!("other")),
        ("/Config/StopSignal", json!("SIGKILL")),
        ("/RootFS/Layers/0", json!(digest('e'))),
        ("/Size", json!(43)),
        ("/GraphDriver/Name", json!("fuse-overlayfs")),
    ] {
        let mut value = fixture();
        put(&mut value, pointer, changed);
        assert_ne!(projection(&accept(&encode(&value))), baseline, "{pointer}");
    }
    let mut discarded = fixture();
    put(&mut discarded, "/RepoTags/0", json!("PRIVATE_CANARY:tag"));
    put(
        &mut discarded,
        "/RepoDigests/0",
        json!("PRIVATE_CANARY:digest"),
    );
    put(&mut discarded, "/Comment", json!("PRIVATE_CANARY"));
    put(&mut discarded, "/Author", json!("PRIVATE_CANARY"));
    put(&mut discarded, "/Created", json!("2024-02-29T00:00:00Z"));
    put(
        &mut discarded,
        "/Metadata/LastTagTime",
        json!("2024-02-29T00:00:00Z"),
    );
    put(
        &mut discarded,
        "/GraphDriver/Data/UpperDir",
        json!("PRIVATE_CANARY"),
    );
    assert_eq!(projection(&accept(&encode(&discarded))), baseline);
}
