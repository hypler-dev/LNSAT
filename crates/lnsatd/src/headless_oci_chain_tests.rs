use super::*;
use serde_json::{Value, json};
use std::fmt::Write;
// Independent synthetic vectors were constructed from the reviewed contract before this implementation.
const MINIMAL: &str = r#"{"architecture":"x86_64","os":"linux","config":{},"rootfs":{"type":"layers","diff_ids":["sha256:1111111111111111111111111111111111111111111111111111111111111111"]}}"#;
const FULL: &str = r#"{"architecture":"x86_64","os":"linux","config":{"User":"1000:1000","ExposedPorts":{},"Env":["A=1"],"Entrypoint":["/synthetic/bin/app"],"Cmd":[],"Volumes":{},"WorkingDir":"/synthetic","Labels":{"role":"synthetic"},"StopSignal":"SIGKILL","ArgsEscaped":false,"Healthcheck":{"Test":["NONE"]},"OnBuild":[],"Shell":[]},"rootfs":{"type":"layers","diff_ids":["sha256:1111111111111111111111111111111111111111111111111111111111111111"]},"variant":"v1","created":"9999-12-31T23:59:59.123456789+00:00","author":"synthetic-author","history":[{"created":"2024-02-29T01:02:03Z","created_by":"synthetic","author":"","comment":""},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true},{"empty_layer":true}]}"#;

#[derive(Clone)]
struct Bodies {
    config: Vec<u8>,
    manifest: Vec<u8>,
    index: Option<Vec<u8>>,
}
fn raw_digest(body: &[u8]) -> String {
    Sha256::digest(body)
        .iter()
        .fold(String::new(), |mut text, byte| {
            write!(&mut text, "{byte:02x}").unwrap();
            text
        })
}
fn encoded(value: &Value) -> Vec<u8> {
    serde_json::to_vec(value).unwrap()
}
fn read(body: &[u8]) -> Value {
    serde_json::from_slice(body).unwrap()
}
fn digest_claim(body: &[u8]) -> String {
    format!("sha256:{}", raw_digest(body))
}
fn bodies(full: bool, indexed: bool) -> Bodies {
    let config = if full { FULL } else { MINIMAL }.as_bytes().to_vec();
    let value = read(&config);
    let mut platform = json!({"os":value["os"],"architecture":value["architecture"]});
    if let Some(variant) = value.get("variant") {
        platform["variant"] = variant.clone();
    }
    let manifest = encoded(
        &json!({"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json",
        "config":{"mediaType":"application/vnd.oci.image.config.v1+json","digest":digest_claim(&config),"size":config.len()},
        "layers":[{"mediaType":"application/vnd.oci.image.layer.v1.tar+gzip","digest":format!("sha256:{}","2".repeat(64)),"size":123}],
        "annotations":{"z":"last","a":"first"}}),
    );
    let index = indexed.then(|| encoded(&json!({"schemaVersion":2,"mediaType":"application/vnd.oci.image.index.v1+json",
        "manifests":[{"mediaType":"application/vnd.oci.image.manifest.v1+json","digest":digest_claim(&manifest),"size":manifest.len(),"platform":platform}],
        "annotations":{"z":"last","a":"first"}})));
    Bodies {
        config,
        manifest,
        index,
    }
}
impl Bodies {
    fn input(&self, role: usize) -> &[u8] {
        match role {
            0 => &self.config,
            1 => &self.manifest,
            2 => self.index.as_ref().unwrap(),
            _ => unreachable!(),
        }
    }
    fn replace(&mut self, role: usize, input: Vec<u8>) {
        match role {
            0 => self.config = input,
            1 => self.manifest = input,
            2 => self.index = Some(input),
            _ => unreachable!(),
        }
    }
    fn mutate(&mut self, role: usize, pointer: &str, value: Value) {
        let mut body = read(self.input(role));
        *body.pointer_mut(pointer).unwrap() = value;
        self.replace(role, encoded(&body));
    }
    fn relink(&mut self) {
        let mut manifest = read(&self.manifest);
        manifest["config"]["digest"] = json!(digest_claim(&self.config));
        manifest["config"]["size"] = json!(self.config.len());
        self.manifest = encoded(&manifest);
        self.relink_index();
    }
    fn relink_index(&mut self) {
        if let Some(input) = &self.index {
            let mut index = read(input);
            index["manifests"][0]["digest"] = json!(digest_claim(&self.manifest));
            index["manifests"][0]["size"] = json!(self.manifest.len());
            self.index = Some(encoded(&index));
        }
    }
    fn decode(&self) -> Result<UnverifiedOciChain, OciChainError> {
        decode_oci_chain(&self.config, &self.manifest, self.index.as_deref())
    }
    fn accepted(&self) -> UnverifiedOciChain {
        self.decode()
            .unwrap_or_else(|error| panic!("unexpected denial {}", error.code()))
    }
    fn denies(&self, suffix: &str) {
        let Err(error) = self.decode() else {
            panic!("accepted expected {suffix}")
        };
        assert_eq!(error.code(), format!("headless_oci_chain.{suffix}"));
    }
}
fn escape_pointer(key: &str) -> String {
    key.replace('~', "~0").replace('/', "~1")
}
fn objects(value: &Value, pointer: &str, result: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            result.push(pointer.to_owned());
            for (key, value) in map {
                objects(value, &format!("{pointer}/{}", escape_pointer(key)), result);
            }
        }
        Value::Array(items) => {
            for (i, value) in items.iter().enumerate() {
                objects(value, &format!("{pointer}/{i}"), result);
            }
        }
        _ => {}
    }
}
fn strings(value: &Value, pointer: &str, result: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            for (key, value) in map {
                strings(value, &format!("{pointer}/{}", escape_pointer(key)), result);
            }
        }
        Value::Array(items) => {
            for (i, value) in items.iter().enumerate() {
                strings(value, &format!("{pointer}/{i}"), result);
            }
        }
        Value::String(_) => result.push(pointer.to_owned()),
        _ => {}
    }
}
fn duplicate_at(original: &Value, pointer: &str, key: &str, escaped: bool) -> Vec<u8> {
    let object = original.pointer(pointer).unwrap().as_object().unwrap();
    let key_json = if escaped {
        let mut text = String::from("\"");
        for ch in key.chars() {
            write!(&mut text, "\\u{:04x}", u32::from(ch)).unwrap();
        }
        text.push('"');
        text
    } else {
        serde_json::to_string(key).unwrap()
    };
    let ordinary = serde_json::to_string(object).unwrap();
    let duplicate = format!("{{{key_json}:{},{}", object[key], &ordinary[1..]);
    let mut body = original.clone();
    *body.pointer_mut(pointer).unwrap() = json!("__RAW_OBJECT__");
    serde_json::to_string(&body)
        .unwrap()
        .replace("\"__RAW_OBJECT__\"", &duplicate)
        .into_bytes()
}
fn required_member(role: usize, pointer: &str, key: &str) -> bool {
    if role == 0 {
        return match pointer {
            "" => matches!(key, "architecture" | "os" | "config" | "rootfs"),
            "/rootfs" | "/config/Healthcheck" => true,
            _ => false,
        };
    }
    if pointer.is_empty() {
        return key != "annotations";
    }
    pointer == "/config"
        || pointer.starts_with("/layers/")
        || pointer == "/manifests/0"
        || (pointer == "/manifests/0/platform" && key != "variant")
}

#[test]
fn golden_raw_config_hashes_are_independent_known_values() {
    assert_eq!(
        raw_digest(MINIMAL.as_bytes()),
        "be8dd65fe820d46306b94055ec6a646e855298d8a07a7e2f1d6f781ffabe76a3"
    );
    assert_eq!(
        raw_digest(FULL.as_bytes()),
        "e8b612709c8717d646db88090f37e916e03db19342151967c14a3ded3a3d83c2"
    );
    for full in [false, true] {
        for indexed in [false, true] {
            let b = bodies(full, indexed);
            let result = b.accepted();
            assert_eq!(
                result.config_identity.size,
                u64::try_from(b.config.len()).unwrap()
            );
            assert_eq!(&*result.config_identity.digest, &*Sha256::digest(&b.config));
            assert_eq!(
                result.manifest_identity.size,
                u64::try_from(b.manifest.len()).unwrap()
            );
            assert_eq!(
                &*result.manifest_identity.digest,
                &*Sha256::digest(&b.manifest)
            );
            assert_eq!(result.index_identity.is_some(), indexed);
            if let Some(id) = result.index_identity {
                assert_eq!(&*id.digest, &*Sha256::digest(b.index.as_ref().unwrap()));
            }
        }
    }
}
#[test]
fn maps_enforce_record_or_dictionary_shape_and_unique_keys() {
    let baseline = bodies(true, true);
    for role in 0..3 {
        let value = read(baseline.input(role));
        let mut paths = Vec::new();
        objects(&value, "", &mut paths);
        for path in paths {
            let mut b = baseline.clone();
            b.mutate(role, &path, json!([]));
            b.denies("json_shape");
            let mut b = baseline.clone();
            let mut changed = value.clone();
            changed
                .pointer_mut(&path)
                .unwrap()
                .as_object_mut()
                .unwrap()
                .insert("__unknown__".into(), json!(false));
            b.replace(role, encoded(&changed));
            b.denies("json_shape");
            if (role == 0 && path == "/config/Labels") || (role != 0 && path == "/annotations") {
                changed
                    .pointer_mut(&path)
                    .unwrap()
                    .as_object_mut()
                    .unwrap()
                    .insert("__unknown__".into(), json!("retained dictionary value"));
                b.replace(role, encoded(&changed));
                b.relink();
                assert_projection(&b);
            }
            for key in value.pointer(&path).unwrap().as_object().unwrap().keys() {
                for escaped in [false, true] {
                    let mut b = baseline.clone();
                    b.replace(role, duplicate_at(&value, &path, key, escaped));
                    b.denies("json_shape");
                }
            }
        }
    }
}
#[test]
fn every_member_rejects_null_wrong_type_and_required_omission() {
    let baseline = bodies(true, true);
    for role in 0..3 {
        let value = read(baseline.input(role));
        let mut paths = Vec::new();
        objects(&value, "", &mut paths);
        for path in paths {
            for (key, old) in value.pointer(&path).unwrap().as_object().unwrap() {
                let member = format!("{path}/{}", escape_pointer(key));
                let mut b = baseline.clone();
                b.mutate(role, &member, Value::Null);
                b.denies("json_shape");
                let wrong = if old.is_boolean() {
                    json!("false")
                } else {
                    json!(false)
                };
                let mut b = baseline.clone();
                b.mutate(role, &member, wrong);
                b.denies("json_shape");
                let mut changed = value.clone();
                changed
                    .pointer_mut(&path)
                    .unwrap()
                    .as_object_mut()
                    .unwrap()
                    .remove(key);
                let mut b = baseline.clone();
                b.replace(role, encoded(&changed));
                if required_member(role, &path, key) {
                    b.denies("json_shape");
                } else if let Err(error) = b.decode() {
                    assert_ne!(
                        error.code(),
                        "headless_oci_chain.json_shape",
                        "optional {role}:{member}"
                    );
                }
            }
        }
    }
}
#[test]
fn scalar_arrays_and_dictionary_values_are_typed_non_null() {
    let baseline = bodies(true, true);
    for pointer in [
        "/rootfs/diff_ids/0",
        "/config/Env/0",
        "/config/Entrypoint/0",
        "/config/Healthcheck/Test/0",
    ] {
        for wrong in [Value::Null, json!(0), json!([]), json!({})] {
            let mut b = baseline.clone();
            b.mutate(0, pointer, wrong);
            b.denies("json_shape");
        }
    }
    for role in 0..3 {
        let pointer = if role == 0 {
            "/config/Labels/role"
        } else {
            "/annotations/a"
        };
        for wrong in [Value::Null, json!(0), json!([]), json!({})] {
            let mut b = baseline.clone();
            b.mutate(role, pointer, wrong);
            b.denies("json_shape");
        }
    }
}
#[test]
fn every_retained_text_value_rejects_decoded_controls() {
    let baseline = bodies(true, true);
    for role in 0..3 {
        let mut paths = Vec::new();
        strings(&read(baseline.input(role)), "", &mut paths);
        for path in paths {
            for control in ['\0', '\n', '\u{1f}', '\u{7f}'] {
                let mut b = baseline.clone();
                b.mutate(role, &path, json!(control.to_string()));
                b.denies("claims");
            }
        }
    }
    for role in 0..3 {
        let mut value = read(baseline.input(role));
        let path = if role == 0 {
            "/config/Labels"
        } else {
            "/annotations"
        };
        value
            .pointer_mut(path)
            .unwrap()
            .as_object_mut()
            .unwrap()
            .insert("secret\nkey".into(), json!("value"));
        let mut b = baseline.clone();
        b.replace(role, encoded(&value));
        b.denies("claims");
    }
}
#[test]
fn raw_bytes_change_identity_and_require_each_parent_to_be_rebound() {
    let mut b = bodies(true, true);
    let old_config = raw_digest(&b.config);
    b.config.extend_from_slice(b" \n\t");
    b.denies("links");
    b.relink();
    assert_ne!(raw_digest(&b.config), old_config);
    b.accepted();
    b.manifest.extend_from_slice(b" \n");
    b.denies("links");
    b.relink_index();
    b.accepted();
    b.index.as_mut().unwrap().extend_from_slice(b" \n");
    b.accepted();
    let mut b = bodies(true, true);
    b.config = String::from_utf8(b.config)
        .unwrap()
        .replace("synthetic-author", "synthetic-buthor")
        .into_bytes();
    b.denies("links");
    b.relink();
    b.accepted();
    let mut b = bodies(true, true);
    b.config = String::from_utf8(b.config)
        .unwrap()
        .replace("linux", "l\\u0069nux")
        .into_bytes();
    b.denies("links");
    b.relink();
    b.accepted();
}
#[test]
fn parent_digest_size_count_and_platform_mismatches_deny_links() {
    let baseline = bodies(true, true);
    for (role, path, value) in [
        (
            1,
            "/config/digest",
            json!(format!("sha256:{}", "9".repeat(64))),
        ),
        (1, "/config/size", json!(1)),
        (
            2,
            "/manifests/0/digest",
            json!(format!("sha256:{}", "9".repeat(64))),
        ),
        (2, "/manifests/0/size", json!(1)),
        (2, "/manifests/0/platform/architecture", json!("arm64")),
        (2, "/manifests/0/platform/variant", json!("other")),
    ] {
        let mut b = baseline.clone();
        b.mutate(role, path, value);
        b.denies("links");
    }
    let mut b = baseline.clone();
    let mut m = read(&b.manifest);
    let layer = m["layers"][0].clone();
    m["layers"].as_array_mut().unwrap().push(layer);
    b.manifest = encoded(&m);
    b.denies("links");
    let mut b = baseline;
    std::mem::swap(&mut b.config, &mut b.manifest);
    b.denies("json_shape");
}
#[test]
fn optional_index_never_silently_downgrades() {
    let mut b = bodies(false, false);
    b.accepted();
    b.index = Some(Vec::new());
    b.denies("input_bounds");
    for input in [b"null".as_slice(), b"{}", b"[]"] {
        b.index = Some(input.to_vec());
        b.denies("json_shape");
    }
    for count in [0, 2] {
        let mut b = bodies(true, true);
        let mut i = read(b.index.as_ref().unwrap());
        let item = i["manifests"][0].clone();
        i["manifests"] = json!(vec![item; count]);
        b.index = Some(encoded(&i));
        b.denies("claims");
    }
}
#[test]
fn optional_presence_history_and_variant_cases_are_coherent() {
    let mut b = bodies(false, true);
    b.mutate(0,"/config",json!({"User":"","WorkingDir":"","StopSignal":"","Env":[],"Cmd":[],"Entrypoint":[],"Labels":{},"ExposedPorts":{},"Volumes":{},"ArgsEscaped":false,"OnBuild":[],"Shell":[],"Healthcheck":{"Test":["NONE"]}}));
    b.relink();
    b.accepted();
    for history in [
        json!([{}]),
        json!([{"empty_layer":false}]),
        json!([{"empty_layer":true},{}]),
    ] {
        let mut b = bodies(false, true);
        let mut c = read(&b.config);
        c["history"] = history;
        b.config = encoded(&c);
        b.relink();
        b.accepted();
    }
    for history in [json!([]), json!([{"empty_layer":true}]), json!([{}, {}])] {
        let mut b = bodies(false, true);
        let mut c = read(&b.config);
        c["history"] = history;
        b.config = encoded(&c);
        b.denies("claims");
    }
    for config_variant in [None, Some("")] {
        for index_variant in [None, Some("")] {
            let mut b = bodies(false, true);
            let mut c = read(&b.config);
            if let Some(v) = config_variant {
                c["variant"] = json!(v);
            }
            b.config = encoded(&c);
            let mut i = read(b.index.as_ref().unwrap());
            if let Some(v) = index_variant {
                i["manifests"][0]["platform"]["variant"] = json!(v);
            }
            b.index = Some(encoded(&i));
            b.relink();
            b.accepted();
        }
    }
}
#[test]
fn calendar_predicates_cover_full_supported_lexical_range() {
    for timestamp in [
        "0001-01-01T00:00:00Z",
        "2000-02-29T23:59:59.123456789+23:59",
        "9999-12-31T23:59:59-23:59",
        "2026-10-06T00:00:00-00:00",
    ] {
        let mut b = bodies(true, true);
        b.mutate(0, "/created", json!(timestamp));
        b.mutate(0, "/history/0/created", json!(timestamp));
        b.relink();
        b.accepted();
    }
    for timestamp in [
        "0000-01-01T00:00:00Z",
        "1900-02-29T00:00:00Z",
        "2026-04-31T00:00:00Z",
        "2026-01-00T00:00:00Z",
        "2026-13-01T00:00:00Z",
        "2026-01-01T24:00:00Z",
        "2026-01-01T00:60:00Z",
        "2026-01-01T00:00:60Z",
        "2026-01-01T00:00:00.Z",
        "2026-01-01T00:00:00.1234567890Z",
        "2026-01-01t00:00:00Z",
        "2026-01-01T00:00:00z",
        "2026-01-01T00:00:00+24:00",
        "2026-01-01T00:00:00+00:60",
        "２０２６-01-01T00:00:00Z",
        " 2026-01-01T00:00:00Z",
    ] {
        for path in ["/created", "/history/0/created"] {
            let mut b = bodies(true, true);
            b.mutate(0, path, json!(timestamp));
            b.denies("claims");
        }
    }
}
#[test]
fn integer_spelling_width_and_descriptor_range_are_exact() {
    for (role, path) in [
        (1, "/schemaVersion"),
        (1, "/config/size"),
        (1, "/layers/0/size"),
        (2, "/schemaVersion"),
        (2, "/manifests/0/size"),
    ] {
        for number in ["-0", "-1", "2.0", "2e0", "18446744073709551616"] {
            let mut b = bodies(true, true);
            b.mutate(role, path, json!("__NUMBER__"));
            let bytes = String::from_utf8(b.input(role).to_vec())
                .unwrap()
                .replace("\"__NUMBER__\"", number)
                .into_bytes();
            b.replace(role, bytes);
            b.denies("json_shape");
        }
    }
    for role in [1, 2] {
        let mut b = bodies(true, true);
        b.mutate(role, "/schemaVersion", json!(4_294_967_296_u64));
        b.denies("json_shape");
        b.mutate(role, "/schemaVersion", json!(3));
        b.denies("claims");
    }
    for (role, path) in [
        (1, "/config/size"),
        (1, "/layers/0/size"),
        (2, "/manifests/0/size"),
    ] {
        for n in [0_u64, 9_223_372_036_854_775_808_u64, u64::MAX] {
            let mut b = bodies(true, true);
            b.mutate(role, path, json!(n));
            b.denies("claims");
        }
    }
    let mut b = bodies(true, true);
    b.mutate(1, "/layers/0/size", json!(i64::MAX));
    b.relink_index();
    b.accepted();
    for (role, path) in [(1, "/config/size"), (2, "/manifests/0/size")] {
        let mut b = bodies(true, true);
        b.mutate(role, path, json!(1_048_577));
        b.denies("claims");
    }
}

fn text_json(text: &Text) -> Value {
    json!(text.as_str())
}
fn texts_json(texts: &[Text]) -> Value {
    Value::Array(texts.iter().map(text_json).collect())
}
fn dictionary_json(dictionary: &Dictionary) -> Value {
    assert!(
        dictionary
            .0
            .windows(2)
            .all(|pair| pair[0].0.as_bytes() < pair[1].0.as_bytes())
    );
    Value::Object(
        dictionary
            .0
            .iter()
            .map(|(k, v)| (k.to_string(), text_json(v)))
            .collect(),
    )
}
fn config_json(c: &OciConfig) -> Value {
    let mut execution = json!({});
    for (key, value) in [
        ("User", &c.config.user),
        ("WorkingDir", &c.config.working_dir),
        ("StopSignal", &c.config.stop_signal),
    ] {
        if let Some(v) = value {
            execution[key] = text_json(v);
        }
    }
    for (key, value) in [
        ("Env", &c.config.env),
        ("Entrypoint", &c.config.entrypoint),
        ("Cmd", &c.config.cmd),
    ] {
        if let Some(v) = value {
            execution[key] = texts_json(v);
        }
    }
    if c.config.exposed_ports.is_some() {
        execution["ExposedPorts"] = json!({});
    }
    if c.config.volumes.is_some() {
        execution["Volumes"] = json!({});
    }
    if c.config.on_build.is_some() {
        execution["OnBuild"] = json!([]);
    }
    if c.config.shell.is_some() {
        execution["Shell"] = json!([]);
    }
    if let Some(v) = c.config.args_escaped {
        execution["ArgsEscaped"] = json!(v);
    }
    if let Some(v) = &c.config.labels {
        execution["Labels"] = dictionary_json(v);
    }
    if let Some(v) = &c.config.healthcheck {
        execution["Healthcheck"] = json!({"Test":texts_json(&v.test)});
    }
    let mut result = json!({"architecture":text_json(&c.architecture),"os":text_json(&c.os),"config":execution,"rootfs":{"type":text_json(&c.rootfs.kind),"diff_ids":texts_json(&c.rootfs.diff_ids)}});
    for (key, value) in [
        ("variant", &c.variant),
        ("created", &c.created),
        ("author", &c.author),
    ] {
        if let Some(v) = value {
            result[key] = text_json(v);
        }
    }
    if let Some(history) = &c.history {
        result["history"] = Value::Array(
            history
                .iter()
                .map(|h| {
                    let mut v = json!({});
                    for (key, value) in [
                        ("created", &h.created),
                        ("created_by", &h.created_by),
                        ("author", &h.author),
                        ("comment", &h.comment),
                    ] {
                        if let Some(t) = value {
                            v[key] = text_json(t);
                        }
                    }
                    if let Some(b) = h.empty_layer {
                        v["empty_layer"] = json!(b);
                    }
                    v
                })
                .collect(),
        );
    }
    result
}
fn descriptor_json(d: &Descriptor) -> Value {
    json!({"mediaType":text_json(&d.media_type),"digest":text_json(&d.digest),"size":d.size})
}
fn zeroizing_digest(_: &Zeroizing<[u8; 32]>) {}
fn assert_projection(b: &Bodies) {
    let result = b.accepted();
    assert_eq!(config_json(&result.config), read(&b.config));
    let m = &result.manifest;
    let mut manifest = json!({"schemaVersion":m.schema_version,"mediaType":text_json(&m.media_type),"config":descriptor_json(&m.config),"layers":m.layers.iter().map(descriptor_json).collect::<Vec<_>>()});
    if let Some(a) = &m.annotations {
        manifest["annotations"] = dictionary_json(a);
    }
    assert_eq!(manifest, read(&b.manifest));
    assert_eq!(result.index.is_some(), b.index.is_some());
    if let Some(i) = &result.index {
        let descriptors:Vec<_>=i.manifests.iter().map(|d| {let mut p=json!({"os":text_json(&d.platform.os),"architecture":text_json(&d.platform.architecture)}); if let Some(v)=&d.platform.variant {p["variant"]=text_json(v);} json!({"mediaType":text_json(&d.media_type),"digest":text_json(&d.digest),"size":d.size,"platform":p})}).collect();
        let mut index = json!({"schemaVersion":i.schema_version,"mediaType":text_json(&i.media_type),"manifests":descriptors});
        if let Some(a) = &i.annotations {
            index["annotations"] = dictionary_json(a);
        }
        assert_eq!(index, read(b.index.as_ref().unwrap()));
    }
    zeroizing_digest(&result.config_identity.digest);
    zeroizing_digest(&result.manifest_identity.digest);
    if let Some(i) = &result.index_identity {
        zeroizing_digest(&i.digest);
    }
}
#[test]
fn complete_projection_preserves_presence_unicode_and_order() {
    for full in [false, true] {
        for indexed in [false, true] {
            assert_projection(&bodies(full, indexed));
        }
    }
    let mut b = bodies(true, true);
    b.mutate(
        0,
        "/config/Labels",
        json!({"é":"composed","e\u{301}":"decomposed","z":"","a":"😀"}),
    );
    b.mutate(0, "/config/Cmd", json!(["é", "e\u{301}", "😀", ""]));
    let mut c = read(&b.config);
    c["history"][0]["empty_layer"] = json!(false);
    b.config = encoded(&c);
    b.mutate(1, "/annotations", json!({}));
    b.mutate(2, "/annotations", json!({}));
    b.relink();
    assert_projection(&b);
    // Each optional field can disappear independently without losing other retained fields.
    for role in 0..3 {
        let original = read(b.input(role));
        let mut paths = Vec::new();
        objects(&original, "", &mut paths);
        for path in paths {
            for key in original.pointer(&path).unwrap().as_object().unwrap().keys() {
                if !required_member(role, &path, key) {
                    let mut v = original.clone();
                    v.pointer_mut(&path)
                        .unwrap()
                        .as_object_mut()
                        .unwrap()
                        .remove(key);
                    let mut changed = b.clone();
                    changed.replace(role, encoded(&v));
                    changed.relink();
                    if changed.decode().is_ok() {
                        assert_projection(&changed);
                    }
                }
            }
        }
    }
}
#[test]
fn maximum_selected_collections_retain_every_element() {
    let mut b = bodies(true, true);
    let mut c = read(&b.config);
    c["rootfs"]["diff_ids"] = json!(
        (0..16)
            .map(|i| format!("sha256:{i:064x}"))
            .collect::<Vec<_>>()
    );
    for i in 0..64 {
        c["history"][i] = json!({"empty_layer":i>=16,"created_by":format!("step-{i}"),"author":"a","comment":"c"});
    }
    for key in ["Env", "Entrypoint", "Cmd"] {
        c["config"][key] = json!((0..64).map(|i| format!("{key}-{i}")).collect::<Vec<_>>());
    }
    let pairs: serde_json::Map<_, _> = (0..64)
        .map(|i| (format!("key-{i:02}"), json!(format!("value-{i}"))))
        .collect();
    c["config"]["Labels"] = json!(pairs);
    b.config = encoded(&c);
    let mut m = read(&b.manifest);
    m["layers"]=json!((0..16).map(|i|json!({"mediaType":"application/vnd.oci.image.layer.v1.tar+gzip","digest":format!("sha256:{:064x}",i+100),"size":i+1})).collect::<Vec<_>>());
    m["annotations"] = json!(pairs);
    b.manifest = encoded(&m);
    b.mutate(2, "/annotations", json!(pairs));
    b.relink();
    assert_projection(&b);
    for path in [
        "/config/Env",
        "/config/Entrypoint",
        "/config/Cmd",
        "/history",
        "/rootfs/diff_ids",
    ] {
        let mut changed = b.clone();
        let mut c = read(&changed.config);
        let a = c.pointer_mut(path).unwrap().as_array_mut().unwrap();
        a.push(a[0].clone());
        changed.config = encoded(&c);
        changed.denies("claims");
    }
    let mut changed = b.clone();
    let mut m = read(&changed.manifest);
    let a = m["layers"].as_array_mut().unwrap();
    a.push(a[0].clone());
    changed.manifest = encoded(&m);
    changed.denies("claims");
    let mut changed = b;
    changed.mutate(0, "/rootfs/diff_ids/1", json!(format!("sha256:{:064x}", 0)));
    changed.denies("claims");
}
#[test]
fn scanner_limits_are_exact_even_for_rejected_shapes() {
    let check = |value: Value, expected: &str| {
        let mut b = bodies(false, false);
        b.config = encoded(&value);
        b.denies(expected);
    };
    for (n, expected) in [(32, "json_shape"), (33, "json_limits")] {
        let mut b = bodies(false, false);
        b.config = format!("{}{}", "[".repeat(n), "]".repeat(n)).into_bytes();
        b.denies(expected);
    }
    for (n, expected) in [(64, "json_shape"), (65, "json_limits")] {
        check(
            json!(
                (0..n)
                    .map(|i| (format!("k{i}"), json!(0)))
                    .collect::<serde_json::Map<_, _>>()
            ),
            expected,
        );
    }
    for (n, expected) in [(128, "json_shape"), (129, "json_limits")] {
        check(json!(vec![0; n]), expected);
    }
    for (n, expected) in [(256, "json_shape"), (257, "json_limits")] {
        check(json!({"x".repeat(n):0}), expected);
    }
    for (n, expected) in [(4096, "json_shape"), (4097, "json_limits")] {
        check(json!("x".repeat(n)), expected);
    }
    for (last, expected) in [(63, "json_shape"), (64, "json_limits")] {
        let mut maps = vec![
            json!(
                (0..64)
                    .map(|i| (format!("k{i}"), json!(0)))
                    .collect::<serde_json::Map<_, _>>()
            );
            63
        ];
        maps.push(json!(
            (0..last)
                .map(|i| (format!("k{i}"), json!(0)))
                .collect::<serde_json::Map<_, _>>()
        ));
        check(json!({"all":maps}), expected);
    }
    for (last, expected) in [(120, "json_shape"), (121, "json_limits")] {
        let mut arrays = vec![json!(vec![0; 128]); 7];
        arrays.push(json!(vec![0; last]));
        check(json!(arrays), expected);
    }
    check(json!({"":0}), "json_limits");
}
#[test]
fn body_and_aggregate_caps_have_coherent_positive() {
    let mut b = bodies(true, true);
    b.config.resize(1_048_576, b' ');
    b.relink();
    b.manifest.resize(1_048_576, b' ');
    b.relink_index();
    b.index.as_mut().unwrap().resize(1_048_576, b' ');
    assert_projection(&b);
    assert_eq!(
        b.config.len() + b.manifest.len() + b.index.as_ref().unwrap().len(),
        3_145_728
    );
    for role in 0..3 {
        let mut changed = b.clone();
        let mut input = changed.input(role).to_vec();
        input.push(b' ');
        changed.replace(role, input);
        changed.denies("input_bounds");
        changed.replace(role, vec![]);
        changed.denies("input_bounds");
    }
    // Three individually bounded inputs cannot exceed the aggregate cap. Decoded
    // text bytes cannot exceed raw JSON bytes, so its aggregate bound follows too.
    assert_eq!(MAX_TOTAL, 3 * MAX_BODY);
}
#[test]
fn syntax_precedence_and_secret_errors_are_static() {
    for input in [
        b"\xef\xbb\xbf{}".as_slice(),
        b"\xff",
        b"{}{}",
        b"{",
        b"[1,]",
        b"{\"k\":01}",
        b"{\"k\":1.}",
        b"{\"k\":1e}",
        b"\"\\x\"",
        b"\"\\uD800\"",
        b"\"\\uDC00\"",
        b"\"\n\"",
        b"true false",
    ] {
        let mut b = bodies(false, true);
        b.config = input.to_vec();
        b.denies("json_syntax");
    }
    let mut b = bodies(false, true);
    b.config = b"{\"secret-canary\":true}".to_vec();
    b.manifest = b"{".to_vec();
    b.denies("json_syntax");
    b.index = Some(vec![]);
    b.denies("input_bounds");
    let mut b = bodies(false, true);
    b.mutate(0, "/os", json!("wrong-secret-canary"));
    b.index = Some(b"{}".to_vec());
    b.denies("json_shape");
    let mut b = bodies(false, true);
    b.mutate(1, "/config/size", json!(1));
    b.mutate(2, "/schemaVersion", json!(3));
    b.denies("claims");
    let mut b = bodies(false, true);
    b.config = format!("\"{}\"", "x".repeat(4097)).into_bytes();
    b.manifest = b"{".to_vec();
    b.denies("json_limits");
    b.config.push(0xff);
    b.denies("json_syntax");
    let mut b = bodies(false, true);
    b.config = b"{}".to_vec();
    b.index = Some(format!("\"{}\"", "x".repeat(4097)).into_bytes());
    b.denies("json_limits");
}
#[test]
fn text_utf8_lexical_and_fixed_claim_boundaries() {
    for path in [
        "/config/User",
        "/config/WorkingDir",
        "/config/StopSignal",
        "/config/Env/0",
        "/config/Entrypoint/0",
        "/history/0/author",
        "/history/0/comment",
        "/history/0/created_by",
        "/config/Labels/role",
    ] {
        let mut b = bodies(true, true);
        b.mutate(0, path, json!("é".repeat(2048)));
        b.relink();
        assert_projection(&b);
        b.mutate(0, path, json!("é".repeat(2048) + "x"));
        b.denies("json_limits");
    }
    for (path, n) in [("/author", 256), ("/architecture", 32), ("/variant", 32)] {
        let mut b = bodies(true, false);
        b.mutate(0, path, json!("a".repeat(n)));
        b.relink();
        b.accepted();
        b.mutate(0, path, json!("a".repeat(n + 1)));
        b.denies("claims");
    }
    for arch in ["", "AMD64", "arm-64", "é", "a b"] {
        let mut b = bodies(true, true);
        b.mutate(0, "/architecture", json!(arch));
        b.denies("claims");
        b = bodies(true, true);
        b.mutate(2, "/manifests/0/platform/architecture", json!(arch));
        b.denies("claims");
    }
    for (role, path) in [
        (0, "/os"),
        (0, "/rootfs/type"),
        (1, "/mediaType"),
        (1, "/config/mediaType"),
        (1, "/layers/0/mediaType"),
        (2, "/mediaType"),
        (2, "/manifests/0/mediaType"),
        (2, "/manifests/0/platform/os"),
    ] {
        let mut b = bodies(true, true);
        b.mutate(role, path, json!("unsupported"));
        b.denies("claims");
    }
    for (role, path) in [
        (0, "/rootfs/diff_ids/0"),
        (1, "/config/digest"),
        (1, "/layers/0/digest"),
        (2, "/manifests/0/digest"),
    ] {
        for d in [
            "sha256:abc".to_owned(),
            format!("sha256:{}", "A".repeat(64)),
            format!("sha512:{}", "a".repeat(64)),
            format!("sha256:{}", "g".repeat(64)),
        ] {
            let mut b = bodies(true, true);
            b.mutate(role, path, json!(d));
            b.denies("claims");
        }
    }
    for v in [json!([]), json!(["NONE", "NONE"]), json!(["CMD"])] {
        let mut b = bodies(true, true);
        b.mutate(0, "/config/Healthcheck/Test", v);
        b.denies("claims");
    }
    let mut b = bodies(true, true);
    b.mutate(0, "/config/ArgsEscaped", json!(true));
    b.denies("claims");
    for role in [1, 2] {
        let mut b = bodies(true, true);
        b.mutate(role, "/annotations", json!({"é":"value"}));
        b.denies("claims");
    }
}

#[test]
fn escaped_utf8_lengths_dictionary_bounds_and_cmd_types() {
    for (count, expected) in [(2048, None), (2049, Some("json_limits"))] {
        let mut b = bodies(true, true);
        b.mutate(0, "/config/User", json!("__ESCAPED__"));
        b.config = String::from_utf8(b.config)
            .unwrap()
            .replace("__ESCAPED__", &"\\u00e9".repeat(count))
            .into_bytes();
        b.relink();
        if let Some(code) = expected {
            b.denies(code);
        } else {
            assert_projection(&b);
        }
    }
    for role in 0..3 {
        for n in [64, 65] {
            let mut b = bodies(true, true);
            let path = if role == 0 {
                "/config/Labels"
            } else {
                "/annotations"
            };
            let map = (0..n)
                .map(|i| (format!("k{i:03}"), json!("v")))
                .collect::<serde_json::Map<_, _>>();
            b.mutate(role, path, json!(map));
            b.relink();
            if n == 64 {
                assert_projection(&b);
            } else {
                b.denies("json_limits");
            }
        }
    }
    for role in 0..3 {
        for n in [256, 257] {
            let mut b = bodies(true, true);
            let path = if role == 0 {
                "/config/Labels"
            } else {
                "/annotations"
            };
            b.mutate(role, path, json!({"k".repeat(n):"v"}));
            b.relink();
            if n == 256 {
                assert_projection(&b);
            } else {
                b.denies("json_limits");
            }
        }
    }
    for wrong in [Value::Null, json!(false), json!(0), json!({}), json!([])] {
        let mut b = bodies(true, true);
        b.mutate(0, "/config/Cmd", json!([wrong]));
        b.denies("json_shape");
    }
    for text in ["\u{8}", "\u{c}", "\n", "\r", "\t", "\u{7f}"] {
        let mut b = bodies(true, true);
        b.mutate(0, "/config/Cmd", json!([text]));
        b.denies("claims");
    }
    let mut b = bodies(true, true);
    b.mutate(0, "/config/Cmd", json!(["x".repeat(4096)]));
    b.relink();
    assert_projection(&b);
    b.mutate(0, "/config/Cmd", json!(["x".repeat(4097)]));
    b.denies("json_limits");
}

#[test]
fn fixed_empty_arrays_reject_cardinality_after_shape() {
    for path in ["/config/OnBuild", "/config/Shell"] {
        let mut b = bodies(true, true);
        b.mutate(0, path, json!(["synthetic"]));
        b.denies("claims");
        for value in [Value::Null, json!(false), json!(3), json!({}), json!([])] {
            let mut b = bodies(true, true);
            b.mutate(0, path, json!([value]));
            b.denies("json_shape");
        }
        let mut b = bodies(true, true);
        b.mutate(0, path, json!(["synthetic"]));
        b.mutate(2, "/schemaVersion", Value::Null);
        b.denies("json_shape");
    }
}
