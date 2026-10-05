use super::{MAX_PROFILE_BYTES, ProfileError, digest, parse_profile, parse_profile_with_floor};
use lnsat_store::phase7_git_adapter_configuration_digest_v1;
use serde_json::{Map, Value, json};
use std::fmt::Write as _;

const NULL_VECTOR: &str = r#"{
  "contract_id":"lnsat.runtime_profile.docker_local.v2",
  "contract_version":"lnsat.contracts.v1_0",
  "schema_version":3,
  "profile_id":"runtime-profile:docker-local:git-reference",
  "profile_family":"docker_local",
  "adapter":{"ref":"adapter:docker-local:git-commit","version":"v2"},
  "audience":"audience:gateway:local",
  "adapter_executable_digest":"sha256:1111111111111111111111111111111111111111111111111111111111111111",
  "image_digest":"sha256:2222222222222222222222222222222222222222222222222222222222222222",
  "entrypoint":"/usr/local/bin/adapter",
  "filesystem":{"root_filesystem_read_only":true,"workdir":"/work","target_mount_path":"/work","target_mount_mode":"read_write","additional_mounts":false},
  "isolation":{"network":"none","run_as_uid":1000,"run_as_gid":1000,"privilege":{"privileged":false,"no_new_privileges":true,"capabilities_drop_all":true},"host_namespaces":{"pid":false,"ipc":false,"network":false},"host_access":{"docker_socket_mount":false,"devices":false},"ambient":{"environment":false,"credentials":false,"shell":false},"seccomp_profile":"runtime_default"},
  "limits":{"memory_bytes":16777216,"pids":1,"cpu_millis":1,"wall_clock_seconds":1,"stdout_bytes":1,"stderr_bytes":0},
  "engine":{"endpoint_path":"/run/lnsat/docker.sock","implementation_manifest_path":"/etc/lnsat/manifest.json","implementation_manifest_digest":"sha256:3333333333333333333333333333333333333333333333333333333333333333","verifier_git_executable_path":"/usr/bin/git","verifier_git_executable_digest":"sha256:4444444444444444444444444444444444444444444444444444444444444444"},
  "headless":{"installation_ref":"installation:synthetic","binding_digest":"sha256:5555555555555555555555555555555555555555555555555555555555555555","recipe_digest":"sha256:6666666666666666666666666666666666666666666666666666666666666666","probe_entrypoint":"/usr/local/bin/probe","probe_executable_digest":"sha256:7777777777777777777777777777777777777777777777777777777777777777","image_manifest_digest":"sha256:8888888888888888888888888888888888888888888888888888888888888888","image_index_digest":null}
}"#;

const SYNTHETIC_FLOOR: [u8; 32] = [0xaa; 32];

fn accepted(input: &[u8]) -> super::UnverifiedProfile {
    match parse_profile_with_floor(input, &SYNTHETIC_FLOOR) {
        Ok(profile) => profile,
        Err(error) => panic!("expected accepted profile: {}", error.code()),
    }
}

fn denied(input: &[u8], expected: ProfileError) {
    let before = input.to_vec();
    assert!(matches!(
        parse_profile_with_floor(input, &SYNTHETIC_FLOOR).err(),
        Some(error) if error == expected
    ));
    assert_eq!(input, before);
}

fn base_value() -> Value {
    serde_json::from_str(NULL_VECTOR).expect("fixed profile JSON")
}

fn bytes(value: &Value) -> Vec<u8> {
    serde_json::to_vec(value).expect("fixed JSON serialization")
}

fn mutate(path: &[&str], replacement: Value) -> Vec<u8> {
    let mut value = base_value();
    let mut object = value.as_object_mut().expect("top object");
    for component in &path[..path.len() - 1] {
        object = object
            .get_mut(*component)
            .and_then(Value::as_object_mut)
            .expect("fixed nested object");
    }
    object.insert(path[path.len() - 1].to_owned(), replacement);
    bytes(&value)
}

fn remove(path: &[&str]) -> Vec<u8> {
    let mut value = base_value();
    let mut object = value.as_object_mut().expect("top object");
    for component in &path[..path.len() - 1] {
        object = object
            .get_mut(*component)
            .and_then(Value::as_object_mut)
            .expect("fixed nested object");
    }
    object.remove(path[path.len() - 1]);
    bytes(&value)
}

fn object_at_mut<'a>(value: &'a mut Value, path: &[&str]) -> &'a mut Map<String, Value> {
    let mut object = value.as_object_mut().expect("top object");
    for component in path {
        object = object
            .get_mut(*component)
            .and_then(Value::as_object_mut)
            .expect("fixed nested object");
    }
    object
}

fn target(path: &str) -> Vec<u8> {
    let mut value = base_value();
    let filesystem = object_at_mut(&mut value, &["filesystem"]);
    filesystem.insert("target_mount_path".to_owned(), json!(path));
    filesystem.insert("workdir".to_owned(), json!(path));
    bytes(&value)
}

fn object_as_positional_array(path: &[&str]) -> Vec<u8> {
    let mut value = base_value();
    if path.is_empty() {
        let values = value
            .as_object()
            .expect("top object")
            .values()
            .cloned()
            .collect();
        value = Value::Array(values);
    } else {
        let mut parent = value.as_object_mut().expect("top object");
        for component in &path[..path.len() - 1] {
            parent = parent
                .get_mut(*component)
                .and_then(Value::as_object_mut)
                .expect("fixed nested object");
        }
        let key = path[path.len() - 1];
        let values = parent
            .get(key)
            .and_then(Value::as_object)
            .expect("fixed object")
            .values()
            .cloned()
            .collect();
        parent.insert(key.to_owned(), Value::Array(values));
    }
    bytes(&value)
}

fn duplicate_key_at(value: &Value, target: &[&str]) -> String {
    fn escaped_key(key: &str) -> String {
        let mut bytes = key.bytes();
        let first = bytes.next().expect("nonempty fixed key");
        let rest = String::from_utf8(bytes.collect()).expect("ASCII fixed key");
        format!("\"\\u00{first:02x}{rest}\"")
    }

    fn encode(value: &Value, target: &[&str], current: &[&str]) -> String {
        match value {
            Value::Object(object) => {
                let mut fields = Vec::new();
                for (key, child) in object {
                    let mut child_path = current.to_vec();
                    child_path.push(key);
                    let encoded = encode(child, target, &child_path);
                    let key_json = serde_json::to_string(key).expect("fixed key");
                    fields.push(format!("{key_json}:{encoded}"));
                }
                if current == target {
                    let (key, child) = object.iter().next().expect("fixed object fields");
                    fields.push(format!(
                        "{}:{}",
                        escaped_key(key),
                        serde_json::to_string(child).expect("fixed value")
                    ));
                }
                format!("{{{}}}", fields.join(","))
            }
            Value::Array(values) => format!(
                "[{}]",
                values
                    .iter()
                    .map(|child| encode(child, target, current))
                    .collect::<Vec<_>>()
                    .join(",")
            ),
            _ => serde_json::to_string(value).expect("fixed value"),
        }
    }

    encode(value, target, &[])
}

fn selected_vector() -> Vec<u8> {
    mutate(
        &["headless", "image_index_digest"],
        json!("sha256:9999999999999999999999999999999999999999999999999999999999999999"),
    )
}

fn text(bytes: &[u8; 32]) -> String {
    let mut result = String::from("sha256:");
    for byte in bytes {
        write!(result, "{byte:02x}").expect("writing into a String");
    }
    result
}

#[test]
fn headless_profile_accepts_published_vectors_and_exact_commitments() {
    let null = accepted(NULL_VECTOR.as_bytes());
    assert_eq!(null.canonical.len(), 2057);
    assert_eq!(
        text(&null.profile_digest),
        "sha256:975d60c7350dc0c8cd838a88318a9564864eff7b552695066325d5a18871a352"
    );
    assert_eq!(
        text(&null.authority_digest),
        "sha256:8ceeebf376a09ffc117946f2a671f598eef3d54f86dcb10bd40baa97db391051"
    );

    let selected = accepted(&selected_vector());
    assert_eq!(selected.canonical.len(), 2126);
    assert_eq!(
        text(&selected.profile_digest),
        "sha256:9cb96a347431a23b3d9c1fa082770091b93bcc9ca92bec302728251cb92b9f3b"
    );
    assert_eq!(
        text(&selected.authority_digest),
        "sha256:7d489ebf8fdae82e730f273cf1515c01266e45b1a91c1ca9dcdc01dafcc1cd3c"
    );
}

#[test]
fn headless_profile_is_invariant_to_input_order_whitespace_and_escaped_values() {
    let baseline = accepted(NULL_VECTOR.as_bytes());
    let alternate = br#" { "limits" : { "stderr_bytes" : 0 , "stdout_bytes" : 1 , "wall_clock_seconds" : 1 , "cpu_millis" : 1 , "pids" : 1 , "memory_bytes" : 16777216 }, "headless" : { "image_index_digest" : null, "image_manifest_digest" : "sha256:8888888888888888888888888888888888888888888888888888888888888888", "probe_executable_digest" : "sha256:7777777777777777777777777777777777777777777777777777777777777777", "probe_entrypoint" : "/usr/local/bin/pro\u0062e", "recipe_digest" : "sha256:6666666666666666666666666666666666666666666666666666666666666666", "binding_digest" : "sha256:5555555555555555555555555555555555555555555555555555555555555555", "installation_ref" : "installation:synthetic" }, "engine" : { "verifier_git_executable_path" : "/usr/bin/git", "verifier_git_executable_digest" : "sha256:4444444444444444444444444444444444444444444444444444444444444444", "implementation_manifest_path" : "/etc/lnsat/manifest.json", "implementation_manifest_digest" : "sha256:3333333333333333333333333333333333333333333333333333333333333333", "endpoint_path" : "/run/lnsat/docker.sock" }, "isolation" : { "seccomp_profile" : "runtime_default", "run_as_uid" : 1000, "run_as_gid" : 1000, "privilege" : { "privileged" : false, "no_new_privileges" : true, "capabilities_drop_all" : true }, "network" : "none", "host_namespaces" : { "pid" : false, "ipc" : false, "network" : false }, "host_access" : { "docker_socket_mount" : false, "devices" : false }, "ambient" : { "environment" : false, "credentials" : false, "shell" : false } }, "filesystem" : { "workdir" : "/work", "target_mount_path" : "/work", "target_mount_mode" : "read_write", "root_filesystem_read_only" : true, "additional_mounts" : false }, "entrypoint" : "/usr/local/bin/adapter", "image_digest" : "sha256:2222222222222222222222222222222222222222222222222222222222222222", "audience" : "audience:gateway:local", "adapter_executable_digest" : "sha256:1111111111111111111111111111111111111111111111111111111111111111", "adapter" : { "version" : "v2", "ref" : "adapter:docker-local:git-commit" }, "profile_family" : "docker_local", "profile_id" : "runtime-profile:docker-local:git-reference", "schema_version" : 3, "contract_version" : "lnsat.contracts.v1_0", "contract_id" : "lnsat.runtime_profile.docker_local.v2" } "#;
    let reordered = accepted(alternate);
    assert_eq!(reordered.canonical, baseline.canonical);
    assert_eq!(reordered.profile_digest, baseline.profile_digest);
    assert_eq!(reordered.authority_digest, baseline.authority_digest);
}

#[test]
fn headless_profile_rejects_size_utf8_and_trailing_before_json_semantics() {
    let mut exact = NULL_VECTOR.as_bytes().to_vec();
    exact.resize(MAX_PROFILE_BYTES, b' ');
    let _ = accepted(&exact);
    let oversized = vec![0xff; MAX_PROFILE_BYTES + 1];
    denied(&oversized, ProfileError::InputTooLarge);
    denied(
        &[NULL_VECTOR.as_bytes(), b" true"].concat(),
        ProfileError::JsonShape,
    );
    denied(
        &[b"\xff".as_slice(), NULL_VECTOR.as_bytes()].concat(),
        ProfileError::JsonShape,
    );
}

#[test]
#[allow(
    clippy::too_many_lines,
    reason = "Closed schema matrix is kept together for coverage review"
)]
fn headless_profile_rejects_required_null_omission_and_shape_cases_at_each_object() {
    let fields: &[&[&str]] = &[
        &["adapter"],
        &["adapter_executable_digest"],
        &["audience"],
        &["contract_id"],
        &["contract_version"],
        &["engine"],
        &["entrypoint"],
        &["filesystem"],
        &["headless"],
        &["image_digest"],
        &["isolation"],
        &["limits"],
        &["profile_family"],
        &["profile_id"],
        &["schema_version"],
        &["adapter", "ref"],
        &["adapter", "version"],
        &["engine", "endpoint_path"],
        &["engine", "implementation_manifest_digest"],
        &["engine", "implementation_manifest_path"],
        &["engine", "verifier_git_executable_digest"],
        &["engine", "verifier_git_executable_path"],
        &["filesystem", "additional_mounts"],
        &["filesystem", "root_filesystem_read_only"],
        &["filesystem", "target_mount_mode"],
        &["filesystem", "target_mount_path"],
        &["filesystem", "workdir"],
        &["headless", "binding_digest"],
        &["headless", "image_index_digest"],
        &["headless", "image_manifest_digest"],
        &["headless", "installation_ref"],
        &["headless", "probe_entrypoint"],
        &["headless", "probe_executable_digest"],
        &["headless", "recipe_digest"],
        &["isolation", "network"],
        &["isolation", "run_as_gid"],
        &["isolation", "run_as_uid"],
        &["isolation", "seccomp_profile"],
        &["isolation", "ambient"],
        &["isolation", "host_access"],
        &["isolation", "host_namespaces"],
        &["isolation", "privilege"],
        &["isolation", "ambient", "credentials"],
        &["isolation", "ambient", "environment"],
        &["isolation", "ambient", "shell"],
        &["isolation", "host_access", "devices"],
        &["isolation", "host_access", "docker_socket_mount"],
        &["isolation", "host_namespaces", "ipc"],
        &["isolation", "host_namespaces", "network"],
        &["isolation", "host_namespaces", "pid"],
        &["isolation", "privilege", "capabilities_drop_all"],
        &["isolation", "privilege", "no_new_privileges"],
        &["isolation", "privilege", "privileged"],
        &["limits", "cpu_millis"],
        &["limits", "memory_bytes"],
        &["limits", "pids"],
        &["limits", "stderr_bytes"],
        &["limits", "stdout_bytes"],
        &["limits", "wall_clock_seconds"],
    ];
    for field in fields {
        denied(&remove(field), ProfileError::JsonShape);
    }
    for object in [
        &[][..],
        &["adapter"],
        &["engine"],
        &["filesystem"],
        &["headless"],
        &["isolation"],
        &["isolation", "ambient"],
        &["isolation", "host_access"],
        &["isolation", "host_namespaces"],
        &["isolation", "privilege"],
        &["limits"],
    ] {
        let mut value = base_value();
        let mut map = value.as_object_mut().expect("top object");
        for part in object {
            map = map
                .get_mut(*part)
                .and_then(Value::as_object_mut)
                .expect("nested object");
        }
        map.insert("unknown".to_owned(), json!(true));
        denied(&bytes(&value), ProfileError::JsonShape);
    }
    for field in fields {
        if *field != ["headless", "image_index_digest"] {
            denied(&mutate(field, Value::Null), ProfileError::JsonShape);
        }
        denied(&mutate(field, json!([])), ProfileError::JsonShape);
    }
    for object in [
        &[][..],
        &["adapter"],
        &["engine"],
        &["filesystem"],
        &["headless"],
        &["isolation"],
        &["isolation", "ambient"],
        &["isolation", "host_access"],
        &["isolation", "host_namespaces"],
        &["isolation", "privilege"],
        &["limits"],
    ] {
        denied(&object_as_positional_array(object), ProfileError::JsonShape);
    }
}

#[test]
fn headless_profile_rejects_duplicates_including_escaped_duplicates() {
    let profile = base_value();
    for object in [
        &[][..],
        &["adapter"],
        &["engine"],
        &["filesystem"],
        &["headless"],
        &["isolation"],
        &["isolation", "ambient"],
        &["isolation", "host_access"],
        &["isolation", "host_namespaces"],
        &["isolation", "privilege"],
        &["limits"],
    ] {
        let duplicate = duplicate_key_at(&profile, object);
        denied(duplicate.as_bytes(), ProfileError::JsonShape);
    }
}

#[test]
fn headless_profile_rejects_numeric_lexical_forms_overflow_and_ranges() {
    for spelling in ["-0", "-1", "+1", "1.0", "1e0", "4294967296"] {
        let source = NULL_VECTOR.replacen(
            "\"schema_version\":3",
            &format!("\"schema_version\":{spelling}"),
            1,
        );
        denied(source.as_bytes(), ProfileError::JsonShape);
    }
    for (path, values) in [
        (&["limits", "memory_bytes"][..], &["15", "536870913"][..]),
        (&["limits", "pids"][..], &["0", "65"][..]),
        (&["limits", "cpu_millis"][..], &["0", "1001"][..]),
        (&["limits", "wall_clock_seconds"][..], &["0", "31"][..]),
        (&["limits", "stdout_bytes"][..], &["0", "1048577"][..]),
        (&["isolation", "run_as_uid"][..], &["0", "4294967295"][..]),
        (&["isolation", "run_as_gid"][..], &["0", "4294967295"][..]),
    ] {
        for value in values {
            denied(
                &mutate(path, json!(value.parse::<u64>().expect("literal"))),
                ProfileError::Semantic,
            );
        }
    }
    denied(
        &mutate(&["limits", "stderr_bytes"], json!(1)),
        ProfileError::Semantic,
    );
    for (path, maximum) in [
        (&["limits", "memory_bytes"][..], 512_u64 * 1024 * 1024),
        (&["limits", "pids"][..], 64),
        (&["limits", "cpu_millis"][..], 1_000),
        (&["limits", "wall_clock_seconds"][..], 30),
        (&["limits", "stdout_bytes"][..], 1024 * 1024),
        (&["isolation", "run_as_uid"][..], u64::from(u32::MAX - 1)),
        (&["isolation", "run_as_gid"][..], u64::from(u32::MAX - 1)),
    ] {
        let _ = accepted(&mutate(path, json!(maximum)));
    }
    for replacement in [json!(2), json!(4), json!(u32::MAX)] {
        denied(
            &mutate(&["schema_version"], replacement),
            ProfileError::Semantic,
        );
    }
    for (needle, replacement) in [
        (
            "\"memory_bytes\":16777216",
            "\"memory_bytes\":18446744073709551616",
        ),
        (
            "\"stdout_bytes\":1",
            "\"stdout_bytes\":18446744073709551616",
        ),
        ("\"pids\":1", "\"pids\":4294967296"),
        ("\"cpu_millis\":1", "\"cpu_millis\":4294967296"),
        (
            "\"wall_clock_seconds\":1",
            "\"wall_clock_seconds\":4294967296",
        ),
    ] {
        denied(
            NULL_VECTOR.replacen(needle, replacement, 1).as_bytes(),
            ProfileError::JsonShape,
        );
    }
}

#[test]
#[allow(
    clippy::too_many_lines,
    reason = "Boundary matrix is kept together for coverage review"
)]
fn headless_profile_rejects_constants_references_digests_and_paths() {
    for path in [
        &["contract_id"][..],
        &["contract_version"],
        &["profile_id"],
        &["profile_family"],
        &["adapter", "ref"],
        &["adapter", "version"],
        &["audience"],
        &["isolation", "network"],
        &["isolation", "seccomp_profile"],
        &["filesystem", "target_mount_mode"],
    ] {
        denied(&mutate(path, json!("wrong")), ProfileError::Semantic);
    }
    for path in [
        &["adapter_executable_digest"][..],
        &["image_digest"],
        &["engine", "implementation_manifest_digest"],
        &["engine", "verifier_git_executable_digest"],
        &["headless", "binding_digest"],
        &["headless", "recipe_digest"],
        &["headless", "probe_executable_digest"],
        &["headless", "image_manifest_digest"],
        &["headless", "image_index_digest"],
    ] {
        for invalid in [
            "sha256:ABC".to_owned(),
            format!("sha256:{}", "a".repeat(63)),
            format!("sha256:{}", "a".repeat(65)),
            format!("sha512:{}", "a".repeat(64)),
            format!("sha256:{}", "A".repeat(64)),
            format!("sha256:{}", "g".repeat(64)),
        ] {
            denied(&mutate(path, json!(invalid)), ProfileError::Semantic);
        }
    }
    denied(
        &mutate(&["headless", "installation_ref"], json!("bad ref")),
        ProfileError::Semantic,
    );
    denied(
        &mutate(
            &["headless", "installation_ref"],
            json!("resource:synthetic"),
        ),
        ProfileError::Semantic,
    );
    denied(
        &mutate(&["headless", "installation_ref"], json!("x".repeat(257))),
        ProfileError::Semantic,
    );
    let installation_exact = format!("installation:{}", "\u{0800}".repeat(81));
    assert_eq!(installation_exact.len(), 256);
    let _ = accepted(&mutate(
        &["headless", "installation_ref"],
        json!(installation_exact),
    ));
    denied(
        &mutate(
            &["headless", "installation_ref"],
            json!(format!("installation:{}", "\u{0800}".repeat(82))),
        ),
        ProfileError::Semantic,
    );
    denied(
        &mutate(
            &["headless", "installation_ref"],
            json!(format!("installation:{}", "a".repeat(241))),
        ),
        ProfileError::Semantic,
    );
    for path in [
        &["entrypoint"][..],
        &["headless", "probe_entrypoint"],
        &["filesystem", "target_mount_path"],
        &["engine", "endpoint_path"],
        &["engine", "implementation_manifest_path"],
        &["engine", "verifier_git_executable_path"],
    ] {
        for invalid in [
            "/",
            "relative",
            "/a//b",
            "/a/./b",
            "/a/../b",
            "/a/",
            "/a\\b",
            "/a\0b",
            "/a\u{7f}b",
        ] {
            denied(&mutate(path, json!(invalid)), ProfileError::Semantic);
        }
    }
    denied(
        &mutate(
            &["engine", "endpoint_path"],
            json!(format!("/{}", "a".repeat(100))),
        ),
        ProfileError::Semantic,
    );
    denied(
        &mutate(&["entrypoint"], json!(format!("/{}", "a".repeat(256)))),
        ProfileError::Semantic,
    );

    let endpoint_max = format!("/{}", "a".repeat(99));
    let _ = accepted(&mutate(&["engine", "endpoint_path"], json!(endpoint_max)));
    let container_max = format!("/{}", "a".repeat(255));
    let _ = accepted(&mutate(&["entrypoint"], json!(container_max)));
    let _ = accepted(&mutate(
        &["headless", "probe_entrypoint"],
        json!(format!("/{}", "b".repeat(255))),
    ));
    let _ = accepted(&target(&format!("/{}", "c".repeat(255))));
    for path in [
        &["engine", "implementation_manifest_path"][..],
        &["engine", "verifier_git_executable_path"],
    ] {
        let max = format!("/{}", "h".repeat(4_095));
        let _ = accepted(&mutate(path, json!(max)));
        denied(
            &mutate(path, json!(format!("/{}", "h".repeat(4_096)))),
            ProfileError::Semantic,
        );
    }
}

#[test]
fn headless_profile_enforces_target_overlap_boundaries_and_boolean_posture() {
    for reserved in [
        "/proc",
        "/dev",
        "/sys",
        "/etc/hosts",
        "/etc/hostname",
        "/etc/resolv.conf",
    ] {
        for target_path in [
            reserved.to_owned(),
            format!("{reserved}/child"),
            "/etc".to_owned(),
        ] {
            denied(&target(&target_path), ProfileError::Semantic);
        }
    }
    let _ = accepted(&target("/proc-copy"));
    for target_path in [
        "/usr/local/bin/adapter",
        "/usr/local",
        "/usr/local/bin/adapter/child",
    ] {
        denied(&target(target_path), ProfileError::Semantic);
    }
    for target_path in [
        "/usr/local/bin/probe",
        "/usr/local",
        "/usr/local/bin/probe/child",
    ] {
        denied(&target(target_path), ProfileError::Semantic);
    }
    denied(
        &mutate(
            &["headless", "probe_entrypoint"],
            json!("/usr/local/bin/adapter"),
        ),
        ProfileError::Semantic,
    );
    for path in [
        &["filesystem", "additional_mounts"][..],
        &["filesystem", "root_filesystem_read_only"],
        &["isolation", "ambient", "credentials"],
        &["isolation", "ambient", "environment"],
        &["isolation", "ambient", "shell"],
        &["isolation", "host_access", "devices"],
        &["isolation", "host_access", "docker_socket_mount"],
        &["isolation", "host_namespaces", "ipc"],
        &["isolation", "host_namespaces", "network"],
        &["isolation", "host_namespaces", "pid"],
        &["isolation", "privilege", "capabilities_drop_all"],
        &["isolation", "privilege", "no_new_privileges"],
        &["isolation", "privilege", "privileged"],
    ] {
        let mut value = base_value();
        let mut object = value.as_object_mut().expect("top object");
        for component in &path[..path.len() - 1] {
            object = object
                .get_mut(*component)
                .and_then(Value::as_object_mut)
                .expect("fixed nested object");
        }
        let key = path[path.len() - 1];
        let original = object
            .get(key)
            .and_then(Value::as_bool)
            .expect("fixed boolean");
        object.insert(key.to_owned(), json!(!original));
        denied(&bytes(&value), ProfileError::Semantic);
    }
}

#[test]
fn headless_profile_uses_compiled_floor_and_all_accepted_changes_commit() {
    let production = match parse_profile(NULL_VECTOR.as_bytes()) {
        Ok(profile) => profile,
        Err(error) => panic!(
            "published profile should parse with compiled floor: {}",
            error.code()
        ),
    };
    let expected = digest(
        b"lnsat.hcfg_profile_authority.v3",
        serde_json::to_string(&[
            text(&phase7_git_adapter_configuration_digest_v1()),
            text(&production.profile_digest),
            production.profile.headless.binding_digest.to_string(),
            production.profile.headless.recipe_digest.to_string(),
        ])
        .expect("fixed array")
        .as_bytes(),
    );
    assert_eq!(production.authority_digest, expected);
    let original = accepted(NULL_VECTOR.as_bytes());
    let changed_profiles = [
        mutate(&["adapter_executable_digest"], json!(digest_fixture('0'))),
        mutate(&["image_digest"], json!(digest_fixture('a'))),
        mutate(&["entrypoint"], json!("/usr/local/bin/other")),
        target("/data"),
        mutate(&["engine", "endpoint_path"], json!("/run/lnsat/other.sock")),
        mutate(
            &["engine", "implementation_manifest_path"],
            json!("/etc/lnsat/other-manifest.json"),
        ),
        mutate(
            &["engine", "implementation_manifest_digest"],
            json!(digest_fixture('9')),
        ),
        mutate(
            &["engine", "verifier_git_executable_path"],
            json!("/usr/bin/other-git"),
        ),
        mutate(
            &["engine", "verifier_git_executable_digest"],
            json!(digest_fixture('9')),
        ),
        mutate(&["headless", "binding_digest"], json!(digest_fixture('b'))),
        mutate(&["headless", "recipe_digest"], json!(digest_fixture('c'))),
        mutate(
            &["headless", "probe_entrypoint"],
            json!("/usr/local/bin/other-probe"),
        ),
        mutate(
            &["headless", "probe_executable_digest"],
            json!(digest_fixture('9')),
        ),
        mutate(
            &["headless", "image_manifest_digest"],
            json!(digest_fixture('9')),
        ),
        selected_vector(),
        mutate(
            &["headless", "installation_ref"],
            json!("installation:other"),
        ),
        mutate(&["isolation", "run_as_uid"], json!(1001)),
        mutate(&["isolation", "run_as_gid"], json!(1001)),
        mutate(&["limits", "memory_bytes"], json!(16_777_217)),
        mutate(&["limits", "pids"], json!(2)),
        mutate(&["limits", "cpu_millis"], json!(2)),
        mutate(&["limits", "wall_clock_seconds"], json!(2)),
        mutate(&["limits", "stdout_bytes"], json!(2)),
    ];
    for changed in changed_profiles {
        let changed = accepted(&changed);
        assert_ne!(changed.profile_digest, original.profile_digest);
        assert_ne!(changed.authority_digest, original.authority_digest);
    }
}

fn digest_fixture(character: char) -> String {
    format!("sha256:{}", character.to_string().repeat(64))
}
