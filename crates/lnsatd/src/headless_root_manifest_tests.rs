use super::*;
use serde_json::{Value, json};
use std::fmt::Write as _;

const NULL_VECTOR: &str = r#"{"contract_id":"lnsat.hcfg_root_implementation_manifest.v1","schema_version":1,"recipe_digest":"sha256:4444444444444444444444444444444444444444444444444444444444444444","controller":{"uid":1000,"gid":1000},"administrators":[],"kernel":{"source_ref":"v6.8","source_commit":"5555555555555555555555555555555555555555","release":"synthetic-kernel-release","build_provenance":{"path":"/synthetic/kernel/build-provenance","digest":"sha256:6666666666666666666666666666666666666666666666666666666666666666","size":1},"configuration":{"path":"/synthetic/kernel/config","digest":"sha256:7777777777777777777777777777777777777777777777777777777777777777","size":1},"artifact":{"path":"/synthetic/kernel/artifact","digest":"sha256:8888888888888888888888888888888888888888888888888888888888888888","size":1},"active_lsms":["apparmor","bpf"]},"components":[{"role":"dockerd","version":"29.8.2","source_commit":"8af9fe3a36bab3e039862a2ab1cef1880c9b4d03","artifact":{"path":"/synthetic/components/dockerd","digest":"sha256:9999999999999999999999999999999999999999999999999999999999999999","size":1},"build_provenance":{"path":"/synthetic/components/dockerd.prov","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","size":1}},{"role":"containerd","version":"2.3.6","source_commit":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","artifact":{"path":"/synthetic/components/containerd","digest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","size":1},"build_provenance":{"path":"/synthetic/components/containerd.prov","digest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","size":1}},{"role":"runc","version":"1.5.2","source_commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","artifact":{"path":"/synthetic/components/runc","digest":"sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","size":1},"build_provenance":{"path":"/synthetic/components/runc.prov","digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","size":1}},{"role":"shim","version":"synthetic-shim","source_commit":"2222222222222222222222222222222222222222","artifact":{"path":"/synthetic/components/shim","digest":"sha256:3333333333333333333333333333333333333333333333333333333333333333","size":1},"build_provenance":{"path":"/synthetic/components/shim.prov","digest":"sha256:4444444444444444444444444444444444444444444444444444444444444444","size":1}},{"role":"host_git","version":"synthetic-git","source_commit":"5555555555555555555555555555555555555555","artifact":{"path":"/synthetic/components/git","digest":"sha256:6666666666666666666666666666666666666666666666666666666666666666","size":1},"build_provenance":{"path":"/synthetic/components/git.prov","digest":"sha256:7777777777777777777777777777777777777777777777777777777777777777","size":1}}],"templates":{"source_commit":"8af9fe3a36bab3e039862a2ab1cef1880c9b4d03","recipe_document":{"path":"/synthetic/templates/recipe","digest":"sha256:8888888888888888888888888888888888888888888888888888888888888888","size":1}},"instance":{"listener_kind":"direct_dockerd_unix","boot_id":"01234567-89ab-cdef-0123-456789abcdef","daemon_pid":1234,"daemon_uid":0,"daemon_gid":0,"daemon_start_ticks":987654321,"daemon_executable":{"device_major":8,"device_minor":1,"inode":10001},"endpoint":{"path":"/synthetic/run/docker.sock","device_major":8,"device_minor":1,"inode":10002},"host_user_namespace":20001,"host_mount_namespace":20002,"metadata_roots":{"policy_id":"lnsat.hcfg_docker_metadata_acl.v1","dedicated":true,"daemon_root":{"path":"/synthetic/docker","device_major":8,"device_minor":1,"inode":10003},"container_repository":{"path":"/synthetic/docker/containers","device_major":8,"device_minor":1,"inode":10004}}},"mounts":[{"mount_id":11,"device_major":8,"device_minor":1,"root":"/","mount_point":"/synthetic","filesystem_type":"ext4","host_mount_namespace":20002,"idmapped":false}],"image":{"platform":{"os":"linux","architecture":"x86_64","variant":""},"config":{"path":"/synthetic/oci/config.json","digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","size":1024},"manifest":{"path":"/synthetic/oci/manifest.json","digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","size":2048},"index":null,"adapter":{"container_path":"/synthetic/image/synthetic-adapter","snapshot":{"path":"/synthetic/image/adapter","digest":"sha256:9999999999999999999999999999999999999999999999999999999999999999","size":1}},"probe":{"container_path":"/synthetic/image/synthetic-probe","snapshot":{"path":"/synthetic/image/probe","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","size":1}},"build_provenance":{"path":"/synthetic/image/provenance","digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","size":1}}}"#;
const PRESENT_VECTOR: &str = r#"{"contract_id":"lnsat.hcfg_root_implementation_manifest.v1","schema_version":1,"recipe_digest":"sha256:4444444444444444444444444444444444444444444444444444444444444444","controller":{"uid":1000,"gid":1000},"administrators":[1001,1002],"kernel":{"source_ref":"v6.8","source_commit":"5555555555555555555555555555555555555555","release":"synthetic-kernel-release","build_provenance":{"path":"/synthetic/kernel/build-provenance","digest":"sha256:6666666666666666666666666666666666666666666666666666666666666666","size":1},"configuration":{"path":"/synthetic/kernel/config","digest":"sha256:7777777777777777777777777777777777777777777777777777777777777777","size":1},"artifact":{"path":"/synthetic/kernel/artifact","digest":"sha256:8888888888888888888888888888888888888888888888888888888888888888","size":1},"active_lsms":["apparmor","bpf"]},"components":[{"role":"dockerd","version":"29.8.2","source_commit":"8af9fe3a36bab3e039862a2ab1cef1880c9b4d03","artifact":{"path":"/synthetic/components/dockerd","digest":"sha256:9999999999999999999999999999999999999999999999999999999999999999","size":1},"build_provenance":{"path":"/synthetic/components/dockerd.prov","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","size":1}},{"role":"containerd","version":"2.3.6","source_commit":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","artifact":{"path":"/synthetic/components/containerd","digest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","size":1},"build_provenance":{"path":"/synthetic/components/containerd.prov","digest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","size":1}},{"role":"runc","version":"1.5.2","source_commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","artifact":{"path":"/synthetic/components/runc","digest":"sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","size":1},"build_provenance":{"path":"/synthetic/components/runc.prov","digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","size":1}},{"role":"shim","version":"synthetic-shim","source_commit":"2222222222222222222222222222222222222222","artifact":{"path":"/synthetic/components/shim","digest":"sha256:3333333333333333333333333333333333333333333333333333333333333333","size":1},"build_provenance":{"path":"/synthetic/components/shim.prov","digest":"sha256:4444444444444444444444444444444444444444444444444444444444444444","size":1}},{"role":"host_git","version":"synthetic-git","source_commit":"5555555555555555555555555555555555555555","artifact":{"path":"/synthetic/components/git","digest":"sha256:6666666666666666666666666666666666666666666666666666666666666666","size":1},"build_provenance":{"path":"/synthetic/components/git.prov","digest":"sha256:7777777777777777777777777777777777777777777777777777777777777777","size":1}}],"templates":{"source_commit":"8af9fe3a36bab3e039862a2ab1cef1880c9b4d03","recipe_document":{"path":"/synthetic/templates/recipe","digest":"sha256:8888888888888888888888888888888888888888888888888888888888888888","size":1}},"instance":{"listener_kind":"direct_dockerd_unix","boot_id":"01234567-89ab-cdef-0123-456789abcdef","daemon_pid":1234,"daemon_uid":0,"daemon_gid":0,"daemon_start_ticks":987654321,"daemon_executable":{"device_major":8,"device_minor":1,"inode":10001},"endpoint":{"path":"/synthetic/run/docker.sock","device_major":8,"device_minor":1,"inode":10002},"host_user_namespace":20001,"host_mount_namespace":20002,"metadata_roots":{"policy_id":"lnsat.hcfg_docker_metadata_acl.v1","dedicated":true,"daemon_root":{"path":"/synthetic/docker","device_major":8,"device_minor":1,"inode":10003},"container_repository":{"path":"/synthetic/docker/containers","device_major":8,"device_minor":1,"inode":10004}}},"mounts":[{"mount_id":11,"device_major":8,"device_minor":1,"root":"/","mount_point":"/synthetic","filesystem_type":"ext4","host_mount_namespace":20002,"idmapped":false}],"image":{"platform":{"os":"linux","architecture":"x86_64","variant":""},"config":{"path":"/synthetic/oci/config.json","digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111","size":1024},"manifest":{"path":"/synthetic/oci/manifest.json","digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222","size":2048},"index":{"path":"/synthetic/oci/index.json","digest":"sha256:3333333333333333333333333333333333333333333333333333333333333333","size":3072},"adapter":{"container_path":"/synthetic/image/synthetic-adapter","snapshot":{"path":"/synthetic/image/adapter","digest":"sha256:9999999999999999999999999999999999999999999999999999999999999999","size":1}},"probe":{"container_path":"/synthetic/image/synthetic-probe","snapshot":{"path":"/synthetic/image/probe","digest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","size":1}},"build_provenance":{"path":"/synthetic/image/provenance","digest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","size":1}}}"#;

fn value() -> Value {
    serde_json::from_str(NULL_VECTOR).unwrap()
}
fn bytes(value: &Value) -> Vec<u8> {
    serde_json::to_vec(value).unwrap()
}
fn accept(value: &Value) -> UnverifiedRootManifest {
    decode_root_manifest_claim(&bytes(value)).unwrap_or_else(|e| panic!("{}", e.code()))
}
fn reject(raw: &[u8], code: &str) {
    match decode_root_manifest_claim(raw) {
        Ok(_) => panic!("unexpected acceptance"),
        Err(e) => assert_eq!(e.code(), code),
    }
}
fn denied(value: &Value, code: &str) {
    reject(&bytes(value), code);
}
fn change(base: &Value, path: &str, replacement: Value) -> Value {
    let mut out = base.clone();
    *out.pointer_mut(path).unwrap() = replacement;
    out
}
fn objects(value: &Value, path: &str, result: &mut Vec<String>) {
    match value {
        Value::Object(v) => {
            result.push(path.to_owned());
            for (k, v) in v {
                objects(v, &format!("{path}/{k}"), result);
            }
        }
        Value::Array(v) => {
            for (i, v) in v.iter().enumerate() {
                objects(v, &format!("{path}/{i}"), result);
            }
        }
        _ => {}
    }
}
fn members(value: &Value, path: &str, result: &mut Vec<(String, Value)>) {
    match value {
        Value::Object(v) => {
            for (k, v) in v {
                let p = format!("{path}/{k}");
                result.push((p.clone(), v.clone()));
                members(v, &p, result);
            }
        }
        Value::Array(v) => {
            for (i, v) in v.iter().enumerate() {
                let p = format!("{path}/{i}");
                result.push((p.clone(), v.clone()));
                members(v, &p, result);
            }
        }
        _ => {}
    }
}

#[test]
fn complete_projection_and_independent_commitment_vectors() {
    for (raw, expected) in [
        (
            NULL_VECTOR,
            "67e001f786eca3c57bfc07231503764a73912eb150f3a99bd8c041310a99002c",
        ),
        (
            PRESENT_VECTOR,
            "cdb8a4a90943f1f030881513ae78d98365eb0571f7daa6bda06e1d8357cfec07",
        ),
    ] {
        let original: Value = serde_json::from_str(raw).unwrap();
        let got = accept(&original);
        assert_eq!(serde_json::to_value(&got.manifest).unwrap(), original);
        assert_eq!(*got.canonical, bytes(&original));
        let mut text = String::new();
        for byte in got.commitment.iter() {
            write!(&mut text, "{byte:02x}").unwrap();
        }
        assert_eq!(text, expected);
        let mut h = Sha256::new();
        h.update(b"lnsat.hcfg_root_implementation_manifest.v1\n");
        h.update(bytes(&original));
        assert_eq!(*got.commitment, <[u8; 32]>::from(h.finalize()));
        let pretty = serde_json::to_string_pretty(&original).unwrap();
        let equivalent = decode_root_manifest_claim(format!(" \n{pretty}\t ").as_bytes()).unwrap();
        assert_eq!(equivalent.commitment, got.commitment);
        let escaped = raw.replace("synthetic", "\\u0073ynthetic");
        assert_eq!(
            decode_root_manifest_claim(escaped.as_bytes())
                .unwrap()
                .commitment,
            got.commitment
        );
    }
}

#[test]
fn every_map_is_closed_required_and_map_only() {
    let base: Value = serde_json::from_str(PRESENT_VECTOR).unwrap();
    let mut paths = Vec::new();
    objects(&base, "", &mut paths);
    for path in paths {
        let obj = base.pointer(&path).unwrap().as_object().unwrap();
        for key in obj.keys() {
            let mut changed = base.clone();
            changed
                .pointer_mut(&path)
                .unwrap()
                .as_object_mut()
                .unwrap()
                .remove(key);
            denied(&changed, "headless_root_manifest.json_shape");
        }
        let mut unknown = base.clone();
        unknown
            .pointer_mut(&path)
            .unwrap()
            .as_object_mut()
            .unwrap()
            .insert("unexpected".into(), json!(false));
        denied(&unknown, "headless_root_manifest.json_shape");
        denied(
            &change(&base, &path, json!([])),
            "headless_root_manifest.json_shape",
        );
        for key in obj.keys() {
            let encoded = serde_json::to_string(base.pointer(&path).unwrap()).unwrap();
            for duplicate in [
                key.clone(),
                format!("\\u{:04x}{}", key.as_bytes()[0], &key[1..]),
            ] {
                let payload = format!(
                    "{{\"{duplicate}\":{},{}",
                    serde_json::to_string(&obj[key]).unwrap(),
                    &encoded[1..]
                );
                let raw = String::from_utf8(bytes(&base))
                    .unwrap()
                    .replacen(&encoded, &payload, 1);
                reject(raw.as_bytes(), "headless_root_manifest.json_shape");
            }
        }
    }
}

#[test]
fn every_member_rejects_null_and_wrong_type_except_required_nullable_index() {
    let base: Value = serde_json::from_str(PRESENT_VECTOR).unwrap();
    let mut paths = Vec::new();
    members(&base, "", &mut paths);
    for (path, v) in paths {
        if path != "/image/index" {
            denied(
                &change(&base, &path, Value::Null),
                "headless_root_manifest.json_shape",
            );
        }
        let wrong = if v.is_boolean() {
            json!(0)
        } else {
            json!(false)
        };
        denied(
            &change(&base, &path, wrong),
            "headless_root_manifest.json_shape",
        );
    }
    accept(&change(&base, "/image/index", Value::Null));
}

#[test]
fn every_integer_rejects_non_unsigned_spelling() {
    let base: Value = serde_json::from_str(PRESENT_VECTOR).unwrap();
    let mut paths = Vec::new();
    members(&base, "", &mut paths);
    for (path, _) in paths.into_iter().filter(|(_, v)| v.is_number()) {
        let changed = change(&base, &path, json!("__UNSIGNED_TOKEN__"));
        let encoded = String::from_utf8(bytes(&changed)).unwrap();
        assert_eq!(encoded.matches("__UNSIGNED_TOKEN__").count(), 1);
        for spelling in ["-0", "-1", "1.0", "1e0", "18446744073709551616"] {
            let raw = encoded.replace("\"__UNSIGNED_TOKEN__\"", spelling);
            reject(raw.as_bytes(), "headless_root_manifest.json_shape");
        }
    }
}

#[test]
fn fixed_values_and_internal_relations_deny() {
    let base = value();
    for index in 0..5 {
        denied(
            &change(
                &base,
                &format!("/components/{index}/role"),
                json!("invalid_role"),
            ),
            "headless_root_manifest.claims",
        );
    }
    for path in ["/controller/uid", "/controller/gid"] {
        denied(
            &change(&base, path, json!(u32::MAX)),
            "headless_root_manifest.claims",
        );
        denied(
            &change(&base, path, json!(0)),
            "headless_root_manifest.claims",
        );
    }
    for (path, bad) in [
        ("/contract_id", json!("other")),
        ("/schema_version", json!(2)),
    ] {
        denied(&change(&base, path, bad), "headless_root_manifest.family");
    }
    for (path, bad) in [
        ("/controller/uid", json!(0)),
        ("/controller/gid", json!(4_294_967_295_u64)),
        ("/kernel/source_ref", json!("v6.9")),
        ("/kernel/release", json!("")),
        ("/components/0/version", json!("29.8.3")),
        ("/components/1/version", json!("2.3.7")),
        ("/components/2/version", json!("1.5.3")),
        ("/components/0/source_commit", json!("0".repeat(40))),
        ("/templates/source_commit", json!("0".repeat(40))),
        ("/instance/listener_kind", json!("proxy")),
        ("/instance/daemon_uid", json!(1)),
        ("/instance/daemon_gid", json!(1)),
        ("/instance/daemon_pid", json!(0)),
        ("/instance/daemon_start_ticks", json!(0)),
        ("/instance/daemon_executable/inode", json!(0)),
        ("/instance/host_user_namespace", json!(0)),
        ("/instance/host_mount_namespace", json!(0)),
        ("/instance/metadata_roots/policy_id", json!("other")),
        ("/instance/metadata_roots/dedicated", json!(false)),
        (
            "/instance/metadata_roots/container_repository/path",
            json!("/synthetic/other"),
        ),
        ("/mounts/0/mount_id", json!(0)),
        ("/mounts/0/filesystem_type", json!("tmpfs")),
        ("/mounts/0/idmapped", json!(true)),
        ("/mounts/0/host_mount_namespace", json!(42)),
        ("/image/platform/os", json!("windows")),
        ("/image/platform/architecture", json!("AMD64")),
        (
            "/image/manifest/digest",
            base["image"]["config"]["digest"].clone(),
        ),
    ] {
        denied(&change(&base, path, bad), "headless_root_manifest.claims");
    }
}

#[test]
fn numeric_endpoints_and_declared_read_budget() {
    let base = value();
    for path in [
        "/instance/daemon_executable/inode",
        "/instance/daemon_start_ticks",
        "/instance/host_user_namespace",
    ] {
        accept(&change(&base, path, json!(u64::MAX)));
    }
    for path in [
        "/instance/daemon_executable/device_major",
        "/instance/daemon_executable/device_minor",
        "/instance/daemon_pid",
    ] {
        accept(&change(&base, path, json!(u32::MAX)));
        denied(
            &change(&base, path, json!(u64::from(u32::MAX) + 1)),
            "headless_root_manifest.json_shape",
        );
    }
    for path in ["/kernel/artifact/size", "/image/config/size"] {
        let max = if path.starts_with("/kernel") {
            268_435_456_u64
        } else {
            1_048_576
        };
        accept(&change(&base, path, json!(max)));
        denied(
            &change(&base, path, json!(0)),
            "headless_root_manifest.claims",
        );
        denied(
            &change(&base, path, json!(max + 1)),
            "headless_root_manifest.claims",
        );
    }
    let mut full = base.clone();
    for path in [
        "/kernel/artifact/size",
        "/kernel/configuration/size",
        "/kernel/build_provenance/size",
    ] {
        *full.pointer_mut(path).unwrap() = json!(268_435_456_u64);
    }
    // Original total 3089; four original one-byte artifact slots are replaced.
    let last = 1_073_741_824_u64 - (3 * 268_435_456) - (3089 - 4);
    *full.pointer_mut("/templates/recipe_document/size").unwrap() = json!(last);
    accept(&full);
    denied(
        &change(&full, "/templates/recipe_document/size", json!(last + 1)),
        "headless_root_manifest.claims",
    );
}

#[test]
fn administrators_ls_ms_mounts_and_components_are_bounded_and_ordered() {
    let base = value();
    accept(&change(
        &base,
        "/administrators",
        json!((1001..1017).collect::<Vec<_>>()),
    ));
    for bad in [
        json!([0]),
        json!([1000]),
        json!([1002, 1001]),
        json!([1001, 1001]),
        json!([4_294_967_295_u64]),
        json!((1001..1018).collect::<Vec<_>>()),
    ] {
        denied(
            &change(&base, "/administrators", bad),
            "headless_root_manifest.claims",
        );
    }
    for bad in [
        json!([]),
        json!(["a", "a"]),
        json!(["A"]),
        json!(["1a"]),
        json!(["a-b"]),
        json!(["a".repeat(33)]),
    ] {
        denied(
            &change(&base, "/kernel/active_lsms", bad),
            "headless_root_manifest.claims",
        );
    }
    accept(&change(
        &base,
        "/kernel/active_lsms",
        json!((0..16).map(|i| format!("lsm{i}")).collect::<Vec<_>>()),
    ));
    denied(
        &change(
            &base,
            "/kernel/active_lsms",
            json!((0..17).map(|i| format!("lsm{i}")).collect::<Vec<_>>()),
        ),
        "headless_root_manifest.claims",
    );
    let mut two = base.clone();
    let mut second = two["mounts"][0].clone();
    second["mount_id"] = json!(12);
    two["mounts"].as_array_mut().unwrap().push(second);
    accept(&two);
    denied(
        &change(&two, "/mounts/1/mount_id", json!(11)),
        "headless_root_manifest.claims",
    );
    denied(
        &change(&two, "/mounts/1/mount_id", json!(10)),
        "headless_root_manifest.claims",
    );
    denied(
        &change(&base, "/mounts", json!([])),
        "headless_root_manifest.claims",
    );
    let mut reordered = base.clone();
    reordered["components"].as_array_mut().unwrap().swap(0, 1);
    denied(&reordered, "headless_root_manifest.claims");
    let mut missing = base.clone();
    missing["components"].as_array_mut().unwrap().pop();
    denied(&missing, "headless_root_manifest.claims");
}

#[test]
fn paths_identity_spelling_and_overlap() {
    let base = value();
    for bad in [
        "/", "relative", "/a//b", "/a/../b", "/a/./b", "/a/", "/a\\b", "/a\0b",
    ] {
        denied(
            &change(&base, "/kernel/artifact/path", json!(bad)),
            "headless_root_manifest.claims",
        );
    }
    accept(&change(&base, "/mounts/0/mount_point", json!("/")));
    for (path, limit) in [
        ("/kernel/artifact/path", 4096),
        ("/instance/endpoint/path", 100),
        ("/image/adapter/container_path", 256),
    ] {
        accept(&change(
            &base,
            path,
            json!(format!("/{}", "x".repeat(limit - 1))),
        ));
        denied(
            &change(&base, path, json!(format!("/{}", "x".repeat(limit)))),
            if limit == 4096 {
                "headless_root_manifest.json_limits"
            } else {
                "headless_root_manifest.claims"
            },
        );
    }
    let probe = base["image"]["probe"]["container_path"].as_str().unwrap();
    denied(
        &change(&base, "/image/adapter/container_path", json!(probe)),
        "headless_root_manifest.claims",
    );
    denied(
        &change(
            &base,
            "/image/adapter/container_path",
            json!(format!("{probe}/child")),
        ),
        "headless_root_manifest.claims",
    );
    accept(&change(
        &base,
        "/image/adapter/container_path",
        json!(format!("{probe}2")),
    ));
    for bad in [
        "sha256:0",
        "SHA256:0000000000000000000000000000000000000000000000000000000000000000",
        "sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ] {
        denied(
            &change(&base, "/recipe_digest", json!(bad)),
            "headless_root_manifest.claims",
        );
    }
    for bad in [
        "0123456789abcdef0123456789abcdef",
        "01234567-89AB-cdef-0123-456789abcdef",
        "01234567-89ab-cdef-0123-456789abcdeg",
    ] {
        denied(
            &change(&base, "/instance/boot_id", json!(bad)),
            "headless_root_manifest.claims",
        );
    }
    accept(&change(
        &base,
        "/instance/boot_id",
        json!("ffffffff-ffff-ffff-ffff-ffffffffffff"),
    ));
}

#[test]
fn bounded_preflight_at_and_above_every_aggregate_limit() {
    let good = bytes(&value());
    let mut padded = good.clone();
    padded.resize(65_536, b' ');
    assert!(decode_root_manifest_claim(&padded).is_ok());
    padded.push(b' ');
    reject(&padded, "headless_root_manifest.input_too_large");
    let check = |raw: String, valid: bool| {
        let result = preflight(raw.as_bytes());
        if valid {
            assert!(result.is_ok());
        } else {
            assert_eq!(
                result.unwrap_err().code(),
                "headless_root_manifest.json_limits"
            );
        }
    };
    for (n, valid) in [(16, true), (17, false)] {
        check(format!("{}0{}", "[".repeat(n), "]".repeat(n)), valid);
    }
    for (n, valid) in [(32, true), (33, false)] {
        check(
            format!(
                "{{{}}}",
                (0..n)
                    .map(|i| format!("\"k{i}\":0"))
                    .collect::<Vec<_>>()
                    .join(",")
            ),
            valid,
        );
    }
    for (n, valid) in [(128, true), (129, false)] {
        check(format!("[{}]", vec!["0"; n].join(",")), valid);
    }
    for (n, valid) in [(256, true), (257, false)] {
        check(format!("{{\"{}\":0}}", "k".repeat(n)), valid);
    }
    for (n, valid) in [(4096, true), (4097, false)] {
        check(format!("{{\"k\":\"{}\"}}", "v".repeat(n)), valid);
    }
    let object = format!(
        "{{{}}}",
        (0..32)
            .map(|i| format!("\"k{i}\":0"))
            .collect::<Vec<_>>()
            .join(",")
    );
    check(format!("[{}]", vec![object.clone(); 64].join(",")), true);
    check(
        format!("[{},{{\"extra\":0}}]", vec![object; 64].join(",")),
        false,
    );
    let array = |n| format!("[{}]", vec!["0"; n].join(","));
    check(format!("[{},{}]", array(128), array(126)), true);
    check(format!("[{},{}]", array(128), array(127)), false);
}

#[test]
fn malformed_input_controls_and_error_precedence_are_static() {
    for raw in [
        b"\xff".as_slice(),
        b"\xef\xbb\xbf{}",
        b"{}{}",
        b"{",
        b"{\"x\":01}",
        b"{\"x\":+1}",
        b"{\"x\":\"\\uD800\"}",
        b"{\"x\":\"\\uDC00\"}",
        b"{\"x\":\"\\x00\"}",
    ] {
        reject(raw, "headless_root_manifest.json_syntax");
    }
    for ch in ['\0', '\n', '\t', '\r', '\u{1f}', '\u{7f}'] {
        denied(
            &change(
                &value(),
                "/kernel/release",
                json!(format!("SECRET_CANARY{ch}")),
            ),
            "headless_root_manifest.claims",
        );
    }
    let mut both = value();
    both["contract_id"] = json!("wrong");
    both["controller"]["uid"] = json!(0);
    denied(&both, "headless_root_manifest.family");
    both.as_object_mut().unwrap().remove("image");
    denied(&both, "headless_root_manifest.json_shape");
    let mut too_large = vec![b' '; 65_537];
    too_large[0] = 255;
    reject(&too_large, "headless_root_manifest.input_too_large");
}

#[test]
fn every_dynamic_claim_is_retained_and_changes_commitment() {
    let mut base: Value = serde_json::from_str(PRESENT_VECTOR).unwrap();
    base["administrators"] = json!([2000, 4000]);
    let original = accept(&base).commitment;
    let fixed = [
        "/contract_id",
        "/schema_version",
        "/kernel/source_ref",
        "/components/0/role",
        "/components/1/role",
        "/components/2/role",
        "/components/3/role",
        "/components/4/role",
        "/components/0/version",
        "/components/1/version",
        "/components/2/version",
        "/components/0/source_commit",
        "/templates/source_commit",
        "/instance/listener_kind",
        "/instance/daemon_uid",
        "/instance/daemon_gid",
        "/instance/metadata_roots/policy_id",
        "/instance/metadata_roots/dedicated",
        "/mounts/0/filesystem_type",
        "/mounts/0/idmapped",
        "/image/platform/os",
    ];
    let mut entries = Vec::new();
    members(&base, "", &mut entries);
    let mut covered = 0;
    for (path, v) in entries
        .into_iter()
        .filter(|(_, v)| !v.is_object() && !v.is_array())
    {
        if fixed.contains(&path.as_str()) {
            continue;
        }
        let next = match &v {
            Value::Number(n) => json!(n.as_u64().unwrap() + 1),
            Value::String(t) if t.starts_with("sha256:") => {
                json!(format!("sha256:{}", "e".repeat(64)))
            }
            Value::String(_) if path.ends_with("source_commit") => json!("f".repeat(40)),
            Value::String(_) if path.ends_with("boot_id") => {
                json!("fedcba98-7654-3210-fedc-ba9876543210")
            }
            Value::String(t) => json!(format!("{t}x")),
            _ => panic!("unhandled dynamic claim: {path}"),
        };
        let mut changed = change(&base, &path, next);
        if path == "/instance/metadata_roots/daemon_root/path"
            || path == "/instance/metadata_roots/container_repository/path"
        {
            changed["instance"]["metadata_roots"]["daemon_root"]["path"] =
                json!("/synthetic/changed-root");
            changed["instance"]["metadata_roots"]["container_repository"]["path"] =
                json!("/synthetic/changed-root/containers");
        }
        if path == "/instance/host_mount_namespace" || path == "/mounts/0/host_mount_namespace" {
            changed["instance"]["host_mount_namespace"] = json!(30_000);
            changed["mounts"][0]["host_mount_namespace"] = json!(30_000);
        }
        assert_ne!(changed.pointer(&path), base.pointer(&path), "{path}");
        let decoded = accept(&changed);
        assert_ne!(decoded.commitment, original, "{path}");
        assert_eq!(
            serde_json::to_value(&decoded.manifest).unwrap(),
            changed,
            "{path}"
        );
        covered += 1;
    }
    assert!(covered > 100, "full dynamic leaf traversal was reduced");
    for (path, next) in [
        ("/image/index", Value::Null),
        ("/administrators", json!([])),
        ("/kernel/active_lsms", json!(["bpf", "apparmor"])),
    ] {
        let changed = change(&base, path, next);
        let decoded = accept(&changed);
        assert_ne!(decoded.commitment, original);
        assert_eq!(serde_json::to_value(&decoded.manifest).unwrap(), changed);
    }
}

#[test]
fn string_widths_all_numeric_edges_and_collection_endpoints() {
    let base = value();
    for path in [
        "/kernel/release",
        "/components/3/version",
        "/components/4/version",
    ] {
        accept(&change(&base, path, json!("x".repeat(128))));
        for bad in [String::new(), "x".repeat(129), "é".to_owned()] {
            denied(
                &change(&base, path, json!(bad)),
                "headless_root_manifest.claims",
            );
        }
    }
    for (path, n) in [
        ("/image/platform/architecture", 32),
        ("/image/platform/variant", 32),
    ] {
        accept(&change(&base, path, json!("x".repeat(n))));
        denied(
            &change(&base, path, json!("x".repeat(n + 1))),
            "headless_root_manifest.claims",
        );
    }
    denied(
        &change(&base, "/image/platform/variant", json!("é")),
        "headless_root_manifest.claims",
    );
    denied(
        &change(&base, "/image/platform/architecture", json!("")),
        "headless_root_manifest.claims",
    );
    accept(&change(&base, "/controller/uid", json!(4_294_967_294_u64)));
    accept(&change(&base, "/controller/gid", json!(4_294_967_294_u64)));
    accept(&change(
        &base,
        "/administrators",
        json!([4_294_967_294_u64]),
    ));
    denied(
        &change(&base, "/administrators", json!([4_294_967_296_u64])),
        "headless_root_manifest.json_shape",
    );
    let mount = base["mounts"][0].clone();
    let mounts: Vec<_> = (1..=128)
        .map(|id| {
            let mut m = mount.clone();
            m["mount_id"] = json!(id);
            m
        })
        .collect();
    accept(&change(&base, "/mounts", json!(mounts)));
    let mut oversized = mounts;
    oversized.push(mount);
    denied(
        &change(&base, "/mounts", json!(oversized)),
        "headless_root_manifest.json_limits",
    );
    accept(&change(
        &base,
        "/kernel/active_lsms",
        json!(["a".repeat(32)]),
    ));
}

#[test]
fn escaped_unicode_bounds_and_syntax_limit_precedence() {
    let within = format!(
        "{{\"{}\":\"{}\"}}",
        "\\u006b".repeat(256),
        "\\u00e9".repeat(2048)
    );
    assert!(preflight(within.as_bytes()).is_ok());
    let too_big = format!("{{\"k\":\"{}x\"}}", "\\u00e9".repeat(2048));
    assert_eq!(
        preflight(too_big.as_bytes()).unwrap_err().code(),
        "headless_root_manifest.json_limits"
    );
    assert!(preflight(br#"{"k":"\uD83D\uDE00"}"#).is_ok());
    let over_key = format!("{{\"{}\":0}}", "\\u006b".repeat(257));
    assert_eq!(
        preflight(over_key.as_bytes()).unwrap_err().code(),
        "headless_root_manifest.json_limits"
    );
    let early_limit = format!("{{\"{}\":?}}", "k".repeat(257));
    assert_eq!(
        preflight(early_limit.as_bytes()).unwrap_err().code(),
        "headless_root_manifest.json_limits"
    );
    let early_syntax = format!("{{\"k\":?,\"{}\":0}}", "k".repeat(257));
    assert_eq!(
        preflight(early_syntax.as_bytes()).unwrap_err().code(),
        "headless_root_manifest.json_syntax"
    );
    let mut utf8_first = early_limit.into_bytes();
    utf8_first.push(255);
    assert_eq!(
        preflight(&utf8_first).unwrap_err().code(),
        "headless_root_manifest.json_syntax"
    );
    assert_eq!(
        preflight(b"{\"\":0}").unwrap_err().code(),
        "headless_root_manifest.json_limits"
    );
}

#[test]
fn regression_error_precedence_and_invalid_exponent_signs() {
    let mut bad = value();
    bad["kernel"]["release"] = json!("escaped\u{7f}");
    bad["contract_id"] = json!("wrong");
    denied(&bad, "headless_root_manifest.family");
    bad.as_object_mut().unwrap().remove("image");
    denied(&bad, "headless_root_manifest.json_shape");
    reject(br#"{"n":1e+-2}"#, "headless_root_manifest.json_syntax");
    reject(br#"{"n":1E-+2}"#, "headless_root_manifest.json_syntax");
    // Repeated paths are retained declarations, not independently held blob proof.
    let mut same = value();
    same["image"]["manifest"]["path"] = same["image"]["config"]["path"].clone();
    accept(&same);
}

#[test]
fn every_owned_text_claim_checks_escaped_control_bytes() {
    let base = value();
    let mut entries = Vec::new();
    members(&base, "", &mut entries);
    for (path, text) in entries.into_iter().filter(|(_, v)| v.is_string()) {
        let code = if path == "/contract_id" {
            "headless_root_manifest.family"
        } else {
            "headless_root_manifest.claims"
        };
        for c in ['\0', '\n', '\r', '\t', '\u{1f}', '\u{7f}'] {
            denied(
                &change(
                    &base,
                    &path,
                    json!(format!("{}{c}", text.as_str().unwrap())),
                ),
                code,
            );
        }
    }
}

#[test]
fn retained_commitment_has_zeroizing_owner() {
    let result = accept(&value());
    let _: &Zeroizing<[u8; 32]> = &result.commitment;
}

#[test]
fn every_numeric_record_uses_its_declared_width_and_bounds() {
    let base: Value = serde_json::from_str(PRESENT_VECTOR).unwrap();
    let mut entries = Vec::new();
    members(&base, "", &mut entries);
    for (path, _) in entries.into_iter().filter(|(_, v)| v.is_number()) {
        let key = path.rsplit('/').next().unwrap();
        let is_uid = path.starts_with("/administrators/")
            || matches!(key, "uid" | "gid" | "daemon_uid" | "daemon_gid");
        let is_u32 = is_uid
            || matches!(
                key,
                "device_major" | "device_minor" | "daemon_pid" | "schema_version"
            );
        if is_u32 {
            denied(
                &change(&base, &path, json!(4_294_967_296_u64)),
                "headless_root_manifest.json_shape",
            );
        }
        let positive = path.starts_with("/controller/")
            || path.starts_with("/administrators/")
            || matches!(
                key,
                "inode"
                    | "daemon_pid"
                    | "daemon_start_ticks"
                    | "host_user_namespace"
                    | "host_mount_namespace"
                    | "mount_id"
                    | "size"
            );
        if positive {
            denied(
                &change(&base, &path, json!(0)),
                "headless_root_manifest.claims",
            );
        }
        if matches!(key, "device_major" | "device_minor") {
            accept(&change(&base, &path, json!(0)));
            accept(&change(&base, &path, json!(u32::MAX)));
        }
        if key == "size" {
            let cap = if path.starts_with("/image/config/")
                || path.starts_with("/image/manifest/")
                || path.starts_with("/image/index/")
            {
                1_048_576_u64
            } else {
                268_435_456
            };
            accept(&change(&base, &path, json!(cap)));
            denied(
                &change(&base, &path, json!(cap + 1)),
                "headless_root_manifest.claims",
            );
        }
        if matches!(
            key,
            "inode" | "daemon_start_ticks" | "host_user_namespace" | "mount_id"
        ) {
            accept(&change(&base, &path, json!(u64::MAX)));
        }
    }
    let mut namespaces = base.clone();
    namespaces["instance"]["host_mount_namespace"] = json!(u64::MAX);
    namespaces["mounts"][0]["host_mount_namespace"] = json!(u64::MAX);
    accept(&namespaces);
    for source in ["config", "manifest"] {
        denied(
            &change(
                &base,
                "/image/index/digest",
                base["image"][source]["digest"].clone(),
            ),
            "headless_root_manifest.claims",
        );
    }
}

#[test]
fn lexical_commit_minima_and_utf8_path_bytes_remain_exact() {
    let base = value();
    for bad in [
        String::new(),
        "f".repeat(39),
        "f".repeat(41),
        "F".repeat(40),
        format!("{}g", "f".repeat(39)),
    ] {
        denied(
            &change(&base, "/kernel/source_commit", json!(bad)),
            "headless_root_manifest.claims",
        );
    }
    for path in [
        "/kernel/release",
        "/components/3/version",
        "/components/4/version",
        "/image/platform/architecture",
    ] {
        accept(&change(&base, path, json!("x")));
    }
    for spelling in ["0", "_"] {
        accept(&change(
            &base,
            "/image/platform/architecture",
            json!(spelling),
        ));
    }
    let composed = change(&base, "/kernel/artifact/path", json!("/synthetic/é"));
    let decomposed = change(&base, "/kernel/artifact/path", json!("/synthetic/e\u{301}"));
    let c = accept(&composed);
    let d = accept(&decomposed);
    assert_ne!(c.commitment, d.commitment);
    assert_eq!(serde_json::to_value(&c.manifest).unwrap(), composed);
    assert_eq!(serde_json::to_value(&d.manifest).unwrap(), decomposed);
    let escaped = String::from_utf8(bytes(&composed))
        .unwrap()
        .replace('é', "\\u00e9");
    assert_eq!(
        decode_root_manifest_claim(escaped.as_bytes())
            .unwrap()
            .commitment,
        c.commitment
    );
    let boundary = format!("/{}x", "é".repeat(2047));
    assert_eq!(boundary.len(), 4096);
    accept(&change(&base, "/kernel/artifact/path", json!(boundary)));
    denied(
        &change(
            &base,
            "/kernel/artifact/path",
            json!(format!("{boundary}x")),
        ),
        "headless_root_manifest.json_limits",
    );
}
