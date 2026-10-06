use super::{UnverifiedVersion, decode_version_claim};
use serde_json::{Value, json};

const GOLDEN: &str = r#"{"Platform":{"Name":"fixture-engine-platform"},"Version":"29.8.2","ApiVersion":"1.56","MinAPIVersion":"1.44","Os":"linux","Arch":"amd64","Components":[{"Name":"Engine","Version":"29.8.2","Details":{"GitCommit":"fixture-engine-commit","ApiVersion":"1.56","MinAPIVersion":"1.44","GoVersion":"fixture-go-build","Os":"linux","Arch":"amd64","BuildTime":"fixture-build-time","KernelVersion":"fixture-kernel","Module":"github.com/moby/moby/v2","ModuleVersion":"fixture-module-version","Experimental":"false"}},{"Name":"containerd","Version":"2.3.6","Details":{"GitCommit":"fixture-containerd-commit"}},{"Name":"runc","Version":"1.5.2","Details":{"GitCommit":"fixture-runc-commit"}},{"Name":"docker-init","Version":"fixture-init-version","Details":{"GitCommit":"fixture-init-commit"}}],"GitCommit":"fixture-engine-commit","GoVersion":"fixture-go-build","KernelVersion":"fixture-kernel","BuildTime":"fixture-build-time"}"#;
const SHAPE: &str = "headless_version.json_shape";
const LIMITS: &str = "headless_version.json_limits";
const SYNTAX: &str = "headless_version.json_syntax";
const RECIPE: &str = "headless_version.recipe";
const INCONSISTENT: &str = "headless_version.inconsistent";
const DUPLICATED: [&str; 8] = [
    "GitCommit",
    "ApiVersion",
    "MinAPIVersion",
    "GoVersion",
    "Os",
    "Arch",
    "BuildTime",
    "KernelVersion",
];

fn fixture() -> Value {
    serde_json::from_str(GOLDEN).expect("synthetic fixture is JSON")
}

fn encode(value: &Value) -> Vec<u8> {
    serde_json::to_vec(value).expect("synthetic fixture serializes")
}

fn accept(input: &[u8]) -> UnverifiedVersion {
    match decode_version_claim(input) {
        Ok(value) => value,
        Err(error) => panic!("synthetic positive denied: {}", error.code()),
    }
}

fn deny(input: &[u8], expected: &str) {
    let Err(error) = decode_version_claim(input) else {
        panic!("synthetic negative accepted");
    };
    assert_eq!(error.code(), expected);
    assert!(!format!("{error:?}").contains("PRIVATE_CANARY"));
}

fn projection(value: &UnverifiedVersion) -> [&str; 14] {
    [
        value.platform_name.as_str(),
        value.architecture.as_str(),
        value.minimum_api_version.as_str(),
        value.kernel_version.as_str(),
        value.engine_git_commit.as_str(),
        value.engine_go_version.as_str(),
        value.engine_build_time.as_str(),
        value.engine_module_version.as_str(),
        value.containerd.version.as_str(),
        value.containerd.git_commit.as_str(),
        value.runc.version.as_str(),
        value.runc.git_commit.as_str(),
        value.docker_init.version.as_str(),
        value.docker_init.git_commit.as_str(),
    ]
}

fn expected_projection() -> [&'static str; 14] {
    [
        "fixture-engine-platform",
        "amd64",
        "1.44",
        "fixture-kernel",
        "fixture-engine-commit",
        "fixture-go-build",
        "fixture-build-time",
        "fixture-module-version",
        "2.3.6",
        "fixture-containerd-commit",
        "1.5.2",
        "fixture-runc-commit",
        "fixture-init-version",
        "fixture-init-commit",
    ]
}

fn replace_object(value: &Value, pointer: &str, replacement: &str) -> Vec<u8> {
    let body = String::from_utf8(encode(value)).expect("fixture UTF-8");
    let object = serde_json::to_string(value.pointer(pointer).expect("object exists"))
        .expect("object serializes");
    assert!(body.contains(&object));
    body.replacen(&object, replacement, 1).into_bytes()
}

fn add_duplicate(value: &Value, pointer: &str, key: &str, escaped: bool) -> Vec<u8> {
    let object = value.pointer(pointer).expect("object exists");
    let original = serde_json::to_string(object).expect("object serializes");
    let encoded_key = if escaped {
        format!("\\u{:04x}{}", u32::from(key.as_bytes()[0]), &key[1..])
    } else {
        key.to_owned()
    };
    let replacement = format!("{{\"{encoded_key}\":{},{}", object[key], &original[1..]);
    replace_object(value, pointer, &replacement)
}

fn object_pointers() -> Vec<String> {
    let mut pointers = vec![String::new(), "/Platform".to_owned()];
    for index in 0..4 {
        pointers.push(format!("/Components/{index}"));
        pointers.push(format!("/Components/{index}/Details"));
    }
    pointers
}

#[test]
fn headless_daemon_version_independent_golden_and_retained_projection() {
    assert_eq!(GOLDEN.len(), 911);
    assert_eq!(
        projection(&accept(GOLDEN.as_bytes())),
        expected_projection()
    );
    let pretty = serde_json::to_string_pretty(&fixture()).expect("pretty fixture");
    assert_eq!(
        projection(&accept(format!(" \t\r\n{pretty}\r\n ").as_bytes())),
        expected_projection()
    );
    let reordered = String::from_utf8(encode(&fixture())).expect("fixture UTF-8");
    assert_ne!(reordered, GOLDEN);
    assert_eq!(
        projection(&accept(reordered.as_bytes())),
        expected_projection()
    );
    let escaped = GOLDEN
        .replace("Version", "Ver\\u0073ion")
        .replace("fixture-engine-platform", "fixture-engine-platf\\u006frm");
    assert_eq!(
        projection(&accept(escaped.as_bytes())),
        expected_projection()
    );
}

fn permutations(items: &mut [Value], offset: usize, visit: &mut impl FnMut(&[Value])) {
    if offset == items.len() {
        visit(items);
        return;
    }
    for index in offset..items.len() {
        items.swap(offset, index);
        permutations(items, offset + 1, visit);
        items.swap(offset, index);
    }
}

#[test]
fn headless_daemon_version_all_component_orders_preserve_projection() {
    let base = fixture();
    let mut items = base["Components"].as_array().expect("components").clone();
    let mut count = 0;
    permutations(&mut items, 0, &mut |components| {
        let mut value = base.clone();
        value["Components"] = Value::Array(components.to_vec());
        assert_eq!(projection(&accept(&encode(&value))), expected_projection());
        count += 1;
    });
    assert_eq!(count, 24);
}

#[test]
fn headless_daemon_version_every_nested_map_and_member_is_closed() {
    let base = fixture();
    for pointer in object_pointers() {
        let object = base
            .pointer(&pointer)
            .expect("object")
            .as_object()
            .expect("map");
        let details = pointer.ends_with("/Details");
        for (key, original) in object {
            let mut value = base.clone();
            value
                .pointer_mut(&pointer)
                .expect("map")
                .as_object_mut()
                .expect("map")
                .remove(key);
            deny(&encode(&value), if details { RECIPE } else { SHAPE });
            for replacement in [
                Value::Null,
                if original.is_string() {
                    json!([])
                } else {
                    json!("wrong-type")
                },
            ] {
                let mut value = base.clone();
                value.pointer_mut(&pointer).expect("map")[key] = replacement;
                deny(&encode(&value), SHAPE);
            }
            for escaped in [false, true] {
                deny(&add_duplicate(&base, &pointer, key, escaped), SHAPE);
            }
            let mut value = base.clone();
            let map = value
                .pointer_mut(&pointer)
                .expect("map")
                .as_object_mut()
                .expect("map");
            let moved = map.remove(key).expect("required key");
            map.insert(format!("wrong_case_{key}"), moved);
            deny(&encode(&value), if details { RECIPE } else { SHAPE });
        }
        for replacement in [
            Value::Null,
            json!([]),
            json!(0),
            json!(false),
            json!("map-substitution"),
        ] {
            let mut value = base.clone();
            *value.pointer_mut(&pointer).expect("object") = replacement;
            deny(&encode(&value), SHAPE);
        }
        let positional = Value::Array(object.values().cloned().collect());
        let mut value = base.clone();
        *value.pointer_mut(&pointer).expect("object") = positional;
        deny(
            &encode(&value),
            if object.len() > 8 { LIMITS } else { SHAPE },
        );
        let mut value = base.clone();
        value.pointer_mut(&pointer).expect("map")["PRIVATE_CANARY_UNKNOWN"] =
            json!("informational");
        if details {
            assert_eq!(projection(&accept(&encode(&value))), expected_projection());
        } else {
            deny(&encode(&value), SHAPE);
        }
    }
    // Use declaration order as well as map order to catch sequence deserializers.
    for index in 0..4 {
        let mut value = base.clone();
        let component = &base["Components"][index];
        value["Components"][index] = json!([
            component["Name"],
            component["Version"],
            component["Details"]
        ]);
        deny(&encode(&value), SHAPE);
    }
}

#[test]
fn headless_daemon_version_required_string_types_never_coerce() {
    let base = fixture();
    let mut pointers = Vec::new();
    for object in object_pointers() {
        for (key, value) in base
            .pointer(&object)
            .expect("object")
            .as_object()
            .expect("map")
        {
            if value.is_string() {
                pointers.push(format!("{object}/{key}"));
            }
        }
    }
    for pointer in pointers {
        for replacement in [
            json!(0),
            json!(-1),
            json!(1.5),
            json!(true),
            json!(false),
            Value::Null,
            json!([]),
            json!({}),
        ] {
            let mut value = base.clone();
            *value.pointer_mut(&pointer).expect("string") = replacement;
            deny(&encode(&value), SHAPE);
        }
    }
    for index in 0..4 {
        for replacement in [
            json!(true),
            json!(1),
            Value::Null,
            json!([]),
            json!({"nested": "not allowed"}),
        ] {
            let mut value = base.clone();
            value["Components"][index]["Details"]["Extra"] = replacement;
            deny(&encode(&value), SHAPE);
        }
    }
}

#[test]
fn headless_daemon_version_component_sets_and_fixed_predicates_deny() {
    for (pointer, replacement) in [
        ("/Version", "29.8.3"),
        ("/ApiVersion", "1.55"),
        ("/Os", "windows"),
        ("/Components/0/Version", "29.8.3"),
        ("/Components/1/Version", "2.3.7"),
        ("/Components/2/Version", "1.5.3"),
        ("/Components/0/Details/Module", "alternate-module"),
        ("/Components/0/Details/Experimental", "true"),
    ] {
        let mut value = fixture();
        *value.pointer_mut(pointer).expect("field") = json!(replacement);
        deny(&encode(&value), RECIPE);
    }
    for presence in [
        json!(false),
        json!(true),
        Value::Null,
        json!("false"),
        json!(0),
        json!({}),
    ] {
        let mut value = fixture();
        value["Experimental"] = presence;
        deny(&encode(&value), SHAPE);
    }
    for index in 0..4 {
        let mut missing = fixture();
        missing["Components"]
            .as_array_mut()
            .expect("components")
            .remove(index);
        deny(&encode(&missing), RECIPE);
        for name in ["unexpected", "rootlesskit", "Runc", ""] {
            let mut value = fixture();
            value["Components"][index]["Name"] = json!(name);
            deny(&encode(&value), RECIPE);
        }
        let mut duplicate = fixture();
        let duplicate_value = duplicate["Components"][index].clone();
        duplicate["Components"]
            .as_array_mut()
            .expect("components")
            .push(duplicate_value);
        deny(&encode(&duplicate), RECIPE);
    }
    let mut empty = fixture();
    empty["Components"] = json!([]);
    deny(&encode(&empty), RECIPE);
}

#[test]
fn headless_daemon_version_empty_and_unavailable_compared_claims_deny() {
    let base = fixture();
    for object in object_pointers() {
        for (key, original) in base
            .pointer(&object)
            .expect("object")
            .as_object()
            .expect("map")
        {
            if !original.is_string() {
                continue;
            }
            for replacement in ["", "N/A"] {
                let mut value = base.clone();
                value.pointer_mut(&object).expect("object")[key] = json!(replacement);
                deny(&encode(&value), RECIPE);
            }
        }
    }
}

#[test]
fn headless_daemon_version_all_eight_engine_relations_are_checked() {
    for key in DUPLICATED {
        let mut detail_changed = fixture();
        detail_changed["Components"][0]["Details"][key] = json!("different-claim");
        deny(&encode(&detail_changed), INCONSISTENT);
        let mut root_changed = fixture();
        root_changed[key] = json!("different-claim");
        deny(
            &encode(&root_changed),
            if matches!(key, "ApiVersion" | "Os") {
                RECIPE
            } else {
                INCONSISTENT
            },
        );
        root_changed["Components"][0]["Details"][key] = json!("different-claim");
        if matches!(key, "ApiVersion" | "Os") {
            deny(&encode(&root_changed), RECIPE);
        } else {
            let result = accept(&encode(&root_changed));
            let index = match key {
                "GitCommit" => 4,
                "MinAPIVersion" => 2,
                "GoVersion" => 5,
                "Arch" => 1,
                "BuildTime" => 6,
                "KernelVersion" => 3,
                _ => panic!("fixture comparison field"),
            };
            let mut expected = expected_projection();
            expected[index] = "different-claim";
            assert_eq!(projection(&result), expected);
        }
    }
}

#[test]
fn headless_daemon_version_each_additional_retained_claim_survives() {
    for (pointer, index) in [
        ("/Platform/Name", 0),
        ("/Components/0/Details/ModuleVersion", 7),
        ("/Components/1/Details/GitCommit", 9),
        ("/Components/2/Details/GitCommit", 11),
        ("/Components/3/Version", 12),
        ("/Components/3/Details/GitCommit", 13),
    ] {
        let mut value = fixture();
        *value.pointer_mut(pointer).expect("field") = json!("new-unverified-claim");
        let result = accept(&encode(&value));
        let mut expected = expected_projection();
        expected[index] = "new-unverified-claim";
        assert_eq!(projection(&result), expected);
    }
}

fn full_details_fixture() -> Value {
    let mut value = fixture();
    for index in 0..4 {
        let details = value["Components"][index]["Details"]
            .as_object_mut()
            .expect("details");
        for number in 0..64 - details.len() {
            details.insert(format!("extra_{number}"), json!("discarded"));
        }
        assert_eq!(details.len(), 64);
    }
    value
}

#[test]
fn headless_daemon_version_details_caps_include_required_pairs_per_map() {
    let full = full_details_fixture();
    assert_eq!(projection(&accept(&encode(&full))), expected_projection());
    for index in 0..4 {
        let mut excessive = full.clone();
        excessive["Components"][index]["Details"]["one_too_many"] = json!("discarded");
        deny(&encode(&excessive), LIMITS);
        let other = (index + 1) % 4;
        excessive["Components"][other]["Details"]
            .as_object_mut()
            .expect("details")
            .remove("extra_0");
        let total: usize = excessive["Components"]
            .as_array()
            .expect("components")
            .iter()
            .map(|component| component["Details"].as_object().expect("details").len())
            .sum();
        assert_eq!(total, 256);
        deny(&encode(&excessive), LIMITS);
    }
    let mut extras = fixture();
    for index in 0..4 {
        extras["Components"][index]["Details"]["private/path"] = json!("PRIVATE_CANARY");
        extras["Components"][index]["Details"]["empty"] = json!("");
        extras["Components"][index]["Details"]["\0"] = json!("\0\n\t");
    }
    assert_eq!(projection(&accept(&encode(&extras))), expected_projection());
}

#[test]
fn headless_daemon_version_body_byte_cap_is_inclusive_and_first() {
    let mut body = GOLDEN.as_bytes().to_vec();
    body.resize(1_048_576, b' ');
    assert_eq!(projection(&accept(&body)), expected_projection());
    body.push(b' ');
    deny(&body, "headless_version.input_too_large");
    body[0] = 0xff;
    deny(&body, "headless_version.input_too_large");
}

fn platform_literal(literal: &str) -> Vec<u8> {
    GOLDEN
        .replacen("\"fixture-engine-platform\"", literal, 1)
        .into_bytes()
}

#[test]
fn headless_daemon_version_decoded_string_caps_cover_raw_and_escaped_unicode() {
    for (at_cap, over_cap) in [
        ("x".repeat(4096), "x".repeat(4097)),
        ("é".repeat(2048), format!("{}x", "é".repeat(2048))),
        ("😀".repeat(1024), format!("{}x", "😀".repeat(1024))),
    ] {
        let mut value = fixture();
        value["Platform"]["Name"] = json!(at_cap);
        assert_eq!(accept(&encode(&value)).platform_name.as_str(), at_cap);
        value["Platform"]["Name"] = json!(over_cap);
        deny(&encode(&value), LIMITS);
    }
    for (escaped, expected) in [
        ("\\u00e9".repeat(2048), "é".repeat(2048)),
        ("\\ud83d\\ude00".repeat(1024), "😀".repeat(1024)),
    ] {
        assert_eq!(
            accept(&platform_literal(&format!("\"{escaped}\"")))
                .platform_name
                .as_str(),
            expected
        );
        deny(&platform_literal(&format!("\"{escaped}x\"")), LIMITS);
    }
    for index in 0..4 {
        let mut value = fixture();
        value["Components"][index]["Details"]["Extra"] = json!("x".repeat(4096));
        assert_eq!(projection(&accept(&encode(&value))), expected_projection());
        value["Components"][index]["Details"]["Extra"] = json!("x".repeat(4097));
        deny(&encode(&value), LIMITS);
    }
}

#[test]
fn headless_daemon_version_decoded_key_caps_cover_raw_and_escaped_unicode() {
    for key in ["x".repeat(256), "é".repeat(128), "😀".repeat(64)] {
        let mut value = fixture();
        value["Components"][0]["Details"][&key] = json!("discarded");
        assert_eq!(projection(&accept(&encode(&value))), expected_projection());
        value["Components"][0]["Details"]
            .as_object_mut()
            .expect("details")
            .remove(&key);
        value["Components"][0]["Details"][format!("{key}x")] = json!("discarded");
        deny(&encode(&value), LIMITS);
    }
    for (escaped, count) in [("\\u00e9", 128), ("\\ud83d\\ude00", 64)] {
        let original = fixture();
        let details =
            serde_json::to_string(&original["Components"][0]["Details"]).expect("details");
        let key = escaped.repeat(count);
        for (suffix, valid) in [("", true), ("x", false)] {
            let replacement = format!("{{\"{key}{suffix}\":\"discarded\",{}", &details[1..]);
            let body = replace_object(&original, "/Components/0/Details", &replacement);
            if valid {
                assert_eq!(projection(&accept(&body)), expected_projection());
            } else {
                deny(&body, LIMITS);
            }
        }
    }
    let mut empty = fixture();
    empty["Components"][0]["Details"][""] = json!("discarded");
    deny(&encode(&empty), LIMITS);
}

#[test]
fn headless_daemon_version_depth_array_and_member_limits_are_independent() {
    for (nested_arrays, error) in [(31, SHAPE), (32, LIMITS)] {
        let body = format!(
            "{{\"Unknown\":{}0{}}}",
            "[".repeat(nested_arrays),
            "]".repeat(nested_arrays)
        );
        deny(body.as_bytes(), error);
    }
    for (count, error) in [(8, RECIPE), (9, LIMITS)] {
        let mut value = fixture();
        let component = value["Components"][0].clone();
        value["Components"] = Value::Array(vec![component; count]);
        deny(&encode(&value), error);
    }
    for (count, error) in [(64, SHAPE), (65, LIMITS)] {
        let object: serde_json::Map<String, Value> =
            (0..count).map(|i| (format!("k{i}"), json!("x"))).collect();
        deny(&encode(&Value::Object(object)), error);
    }
    let child: serde_json::Map<String, Value> =
        (0..64).map(|i| (format!("k{i}"), json!("x"))).collect();
    let mut root: serde_json::Map<String, Value> = (0..63)
        .map(|i| (format!("object_{i}"), Value::Object(child.clone())))
        .collect();
    root.insert("last".to_owned(), json!({}));
    assert_eq!(root.len() + 63 * child.len(), 4096);
    deny(&encode(&Value::Object(root.clone())), SHAPE);
    root.insert("last".to_owned(), json!({"one_more": "x"}));
    deny(&encode(&Value::Object(root)), LIMITS);
}

#[test]
fn headless_daemon_version_all_truncations_utf8_controls_and_trailing_data_deny() {
    for length in 0..GOLDEN.len() {
        assert!(decode_version_claim(&GOLDEN.as_bytes()[..length]).is_err());
    }
    for invalid in [
        b"\xff".as_slice(),
        b"\xc0\xaf",
        b"\xed\xa0\x80",
        b"\xf4\x90\x80\x80",
    ] {
        let mut body = GOLDEN.as_bytes().to_vec();
        body.extend_from_slice(invalid);
        deny(&body, SYNTAX);
    }
    for control in 0_u8..32 {
        let mut body = b"{\"PRIVATE_CANARY\":\"".to_vec();
        body.push(control);
        body.extend_from_slice(b"\"}");
        deny(&body, SYNTAX);
    }
    for suffix in ["{}", "[]", "null", "false", "0", "x", "\0", "\u{feff}"] {
        deny(format!("{GOLDEN}{suffix}").as_bytes(), SYNTAX);
    }
    deny(format!("\u{feff}{GOLDEN}").as_bytes(), SYNTAX);
    for body in ["{}", "[]", "null", "false", "true", "0", "\"text\""] {
        deny(body.as_bytes(), SHAPE);
    }
}

#[test]
fn headless_daemon_version_escape_and_number_grammars_are_strict() {
    for literal in [
        r#""\q""#,
        r#""\uZZZZ""#,
        r#""\ud800""#,
        r#""\udfff""#,
        r#""\ud800x""#,
        r#""\ud800\ud800""#,
        r#""\udfff\ud800""#,
        r#""\u12""#,
    ] {
        deny(&platform_literal(literal), SYNTAX);
    }
    let escaped = accept(&platform_literal(r#""\"\\\/\b\f\n\r\t\u0000""#));
    assert_eq!(
        escaped.platform_name.as_str(),
        "\"\\/\u{0008}\u{000c}\n\r\t\0"
    );
    for number in ["0", "-0", "12", "-12", "1.5", "1e3", "1E-3", "1E+3"] {
        deny(&platform_literal(number), SHAPE);
    }
    for number in [
        "-", "+1", "00", "01", "-01", "1.", ".1", "1e", "1e+", "1e--1", "NaN", "Infinity",
    ] {
        deny(&platform_literal(number), SYNTAX);
    }
    for body in [
        "{",
        "{,}",
        "{\"x\"}",
        "{\"x\":}",
        "{\"x\":0,}",
        "[0,]",
        "[0 1]",
        "{\"x\":0 \"y\":1}",
    ] {
        deny(body.as_bytes(), SYNTAX);
    }
}

#[test]
fn headless_daemon_version_error_stages_and_redaction_are_stable() {
    let mut bad_utf8 = platform_literal(&format!("\"{}\"", "x".repeat(4097)));
    bad_utf8.push(0xff);
    deny(&bad_utf8, SYNTAX);
    deny(format!("{{\"x\":\"{}", "x".repeat(4097)).as_bytes(), LIMITS);
    deny(
        format!("{{\"x\":\"\\q{}\"}}", "x".repeat(4097)).as_bytes(),
        SYNTAX,
    );
    let mut shape_before_recipe = fixture();
    shape_before_recipe["PRIVATE_CANARY_UNKNOWN"] = json!("PRIVATE_CANARY_VALUE");
    shape_before_recipe["Version"] = json!("wrong-version");
    deny(&encode(&shape_before_recipe), SHAPE);
    let mut recipe_before_consistency = fixture();
    recipe_before_consistency["Version"] = json!("wrong-version");
    recipe_before_consistency["Arch"] = json!("different-claim");
    deny(&encode(&recipe_before_consistency), RECIPE);
    let mut inconsistent = fixture();
    inconsistent["Arch"] = json!("PRIVATE_CANARY_ARCH");
    deny(&encode(&inconsistent), INCONSISTENT);
}
