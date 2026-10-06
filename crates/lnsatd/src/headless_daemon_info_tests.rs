use super::{EmptyEncoding, NullableNames, UnverifiedInfo, decode_info_claim};
use serde_json::{Value, json};
use std::fmt::Write as _;

// Synthetic source-shaped body. It is not a daemon observation or artifact pin.
const GOLDEN: &str = r#"{"ID":"synthetic-daemon","Containers":0,"ContainersRunning":0,"ContainersPaused":0,"ContainersStopped":0,"Images":0,"Driver":"overlayfs","DriverStatus":null,"Plugins":{"Volume":["local"],"Network":["bridge","host","null"],"Authorization":null,"Log":["local","json-file"]},"MemoryLimit":true,"SwapLimit":true,"CpuCfsPeriod":true,"CpuCfsQuota":true,"CPUShares":false,"CPUSet":true,"PidsLimit":true,"IPv4Forwarding":true,"Debug":false,"NFd":12,"OomKillDisable":false,"NGoroutines":34,"SystemTime":"2026-10-05T12:34:56.123456789Z","LoggingDriver":"json-file","CgroupDriver":"systemd","CgroupVersion":"2","NEventsListener":0,"KernelVersion":"synthetic-kernel","OperatingSystem":"Synthetic Linux","OSVersion":"synthetic-os-version","OSType":"linux","Architecture":"synthetic-uname-architecture","IndexServerAddress":"https://registry.invalid/v1/","RegistryConfig":{"InsecureRegistryCIDRs":["127.0.0.0/8","::1/128"],"IndexConfigs":{"registry.invalid":{"Name":"registry.invalid","Mirrors":null,"Secure":true,"Official":false}},"Mirrors":[]},"NCPU":8,"MemTotal":8589934592,"GenericResources":null,"DockerRootDir":"/synthetic/docker-root","HttpProxy":"","HttpsProxy":"","NoProxy":"","Name":"synthetic-host","Labels":null,"ExperimentalBuild":false,"ServerVersion":"29.8.2","Runtimes":{"runc":{"path":"runc"},"io.containerd.runc.v2":{"path":"runc"}},"DefaultRuntime":"runc","Swarm":{"NodeID":"","NodeAddr":"","LocalNodeState":"inactive","ControlAvailable":false,"Error":"","RemoteManagers":null},"LiveRestoreEnabled":false,"Isolation":"","InitBinary":"docker-init","ContainerdCommit":{"ID":"synthetic-containerd-commit"},"RuncCommit":{"ID":"synthetic-runc-commit"},"InitCommit":{"ID":"synthetic-init-commit"},"SecurityOptions":["name=apparmor,profile=default","name=seccomp,profile=builtin","name=cgroupns"],"CDISpecDirs":[],"Containerd":{"Address":"/synthetic/containerd.sock","Namespaces":{"Containers":"moby","Plugins":"plugins.moby"}},"Warnings":null}"#;
const SHAPE: &str = "headless_info.json_shape";
const LIMITS: &str = "headless_info.json_limits";
const SYNTAX: &str = "headless_info.json_syntax";
const RECIPE: &str = "headless_info.recipe";
const TOO_LARGE: &str = "headless_info.input_too_large";
const FEATURE: &str = "org.opencontainers.runtime-spec.features";
const RUNTIMES: [&str; 2] = ["runc", "io.containerd.runc.v2"];

fn fixture() -> Value {
    serde_json::from_str(GOLDEN).expect("synthetic JSON")
}

fn complete_fixture() -> Value {
    let mut v = fixture();
    v["ProductLicense"] = json!("synthetic-license");
    v["DefaultAddressPools"] = json!([{"Base":"10.0.0.0/8","Size":24}]);
    v["FirewallBackend"] = json!({"Driver":"synthetic-firewall","Info":[["label","value"]]});
    for runtime in RUNTIMES {
        v["Runtimes"][runtime]["status"] = json!({FEATURE: "opaque-features"});
    }
    v
}

fn encode(v: &Value) -> Vec<u8> {
    serde_json::to_vec(v).expect("synthetic JSON serializes")
}

fn accept(input: &[u8]) -> UnverifiedInfo {
    match decode_info_claim(input) {
        Ok(v) => v,
        Err(e) => panic!("synthetic positive denied: {}", e.code()),
    }
}

fn deny(input: &[u8], expected: &str) {
    let Err(e) = decode_info_claim(input) else {
        panic!("synthetic negative accepted");
    };
    assert_eq!(e.code(), expected);
    assert!(!format!("{e:?}").contains("PRIVATE_CANARY"));
}

fn put(v: &mut Value, path: &str, value: Value) {
    *v.pointer_mut(path).expect("existing synthetic path") = value;
}

// Rebuild ancestors to replace one exact JSON position, including raw duplicates
// and number spellings that serde_json::Value cannot represent.
fn raw_at(v: &Value, path: &str, replacement: &str) -> Vec<u8> {
    fn render(v: &Value, parts: &[&str], replacement: &str) -> String {
        if parts.is_empty() {
            return replacement.to_owned();
        }
        match v {
            Value::Object(map) => {
                assert!(map.contains_key(parts[0]));
                let pairs: Vec<_> = map
                    .iter()
                    .map(|(k, val)| {
                        let value = if k == parts[0] {
                            render(val, &parts[1..], replacement)
                        } else {
                            val.to_string()
                        };
                        format!("{}:{value}", serde_json::to_string(k).expect("key"))
                    })
                    .collect();
                format!("{{{}}}", pairs.join(","))
            }
            Value::Array(values) => {
                let index: usize = parts[0].parse().expect("array index");
                assert!(index < values.len());
                let rows: Vec<_> = values
                    .iter()
                    .enumerate()
                    .map(|(i, val)| {
                        if i == index {
                            render(val, &parts[1..], replacement)
                        } else {
                            val.to_string()
                        }
                    })
                    .collect();
                format!("[{}]", rows.join(","))
            }
            _ => panic!("synthetic ancestor is not a container"),
        }
    }
    let parts: Vec<_> = path
        .strip_prefix('/')
        .filter(|s| !s.is_empty())
        .map_or_else(Vec::new, |s| s.split('/').collect());
    render(v, &parts, replacement).into_bytes()
}

fn closed_maps() -> Vec<&'static str> {
    vec![
        "",
        "/Plugins",
        "/Runtimes",
        "/Runtimes/runc",
        "/Runtimes/io.containerd.runc.v2",
        "/Runtimes/runc/status",
        "/Runtimes/io.containerd.runc.v2/status",
        "/Containerd",
        "/Containerd/Namespaces",
        "/ContainerdCommit",
        "/RuncCommit",
        "/InitCommit",
        "/Swarm",
        "/RegistryConfig",
        "/RegistryConfig/IndexConfigs/registry.invalid",
        "/DefaultAddressPools/0",
        "/FirewallBackend",
    ]
}

fn optional_key(path: &str, key: &str) -> bool {
    (path.is_empty()
        && matches!(
            key,
            "ProductLicense" | "DefaultAddressPools" | "FirewallBackend"
        ))
        || (matches!(path, "/Runtimes/runc" | "/Runtimes/io.containerd.runc.v2") && key == "status")
        || (path == "/FirewallBackend" && key == "Info")
}

fn nullable(path: &str) -> bool {
    matches!(
        path,
        "/DriverStatus"
            | "/Plugins/Volume"
            | "/Plugins/Network"
            | "/Plugins/Log"
            | "/Plugins/Authorization"
            | "/GenericResources"
            | "/Labels"
            | "/Warnings"
            | "/Swarm/RemoteManagers"
            | "/RegistryConfig/InsecureRegistryCIDRs"
            | "/RegistryConfig/IndexConfigs"
            | "/RegistryConfig/Mirrors"
            | "/RegistryConfig/IndexConfigs/registry.invalid/Mirrors"
    )
}

fn string_projection(v: &UnverifiedInfo) -> [&str; 14] {
    [
        v.daemon_id.as_str(),
        v.uname_architecture.as_str(),
        v.kernel_version.as_str(),
        v.operating_system.as_str(),
        v.os_version.as_str(),
        v.daemon_root.as_str(),
        v.storage_driver.as_str(),
        v.init_binary.as_str(),
        v.containerd_commit.as_str(),
        v.runc_commit.as_str(),
        v.init_commit.as_str(),
        v.containerd.address.as_str(),
        v.containerd.containers_namespace.as_str(),
        v.containerd.plugins_namespace.as_str(),
    ]
}

fn expected_strings() -> [&'static str; 14] {
    [
        "synthetic-daemon",
        "synthetic-uname-architecture",
        "synthetic-kernel",
        "Synthetic Linux",
        "synthetic-os-version",
        "/synthetic/docker-root",
        "overlayfs",
        "docker-init",
        "synthetic-containerd-commit",
        "synthetic-runc-commit",
        "synthetic-init-commit",
        "/synthetic/containerd.sock",
        "moby",
        "plugins.moby",
    ]
}

fn names(v: &NullableNames) -> Option<Vec<&str>> {
    match v {
        NullableNames::Null => None,
        NullableNames::Values(v) => Some(v.iter().map(|s| s.as_str()).collect()),
    }
}

#[test]
fn complete_source_shaped_positive_retains_independent_projection() {
    assert_eq!(fixture().as_object().expect("root").len(), 57);
    let v = accept(GOLDEN.as_bytes());
    assert_eq!(string_projection(&v), expected_strings());
    assert_eq!(v.logical_cpus, 8);
    assert_eq!(v.memory_bytes, 8_589_934_592);
    assert_eq!(names(&v.plugins.volume), Some(vec!["local"]));
    assert_eq!(
        names(&v.plugins.network),
        Some(vec!["bridge", "host", "null"])
    );
    assert_eq!(names(&v.plugins.log), Some(vec!["json-file", "local"]));
    assert!(matches!(v.plugins.authorization, EmptyEncoding::Null));
    assert!(matches!(v.generic_resources, EmptyEncoding::Null));
    assert!(v.firewall_driver.is_none());
    assert!(!v.daemon_no_new_privileges);
    let full = accept(&encode(&complete_fixture()));
    assert_eq!(string_projection(&full), expected_strings());
    assert_eq!(
        full.firewall_driver.as_deref().map(String::as_str),
        Some("synthetic-firewall")
    );
}

#[test]
fn every_required_member_rejects_missing_null_and_wrong_type() {
    let base = complete_fixture();
    for path in closed_maps() {
        let map = base.pointer(path).expect("map").as_object().expect("map");
        for (key, val) in map {
            let member = format!("{path}/{key}");
            if !optional_key(path, key) {
                let mut v = base.clone();
                v.pointer_mut(path)
                    .expect("map")
                    .as_object_mut()
                    .expect("map")
                    .remove(key);
                let expected = if path.ends_with("/status") {
                    // Removing the sole status key creates an empty present
                    // omission-tagged map: the contract assigns recipe denial.
                    RECIPE
                } else {
                    SHAPE
                };
                deny(&encode(&v), expected);
            }
            if !nullable(&member) {
                let mut v = base.clone();
                put(&mut v, &member, Value::Null);
                deny(&encode(&v), SHAPE);
            }
            let wrong = match val {
                Value::String(_) => json!(true),
                Value::Bool(_) | Value::Number(_) => json!("wrong-type"),
                Value::Array(_) => json!(0),
                Value::Object(_) => json!(false),
                Value::Null => json!({"wrong":"type"}),
            };
            let mut v = base.clone();
            put(&mut v, &member, wrong);
            deny(&encode(&v), SHAPE);
        }
    }
}

#[test]
fn all_closed_maps_reject_unknown_case_duplicates_and_sequences() {
    let base = complete_fixture();
    for path in closed_maps() {
        let map = base.pointer(path).expect("map").as_object().expect("map");
        let mut v = base.clone();
        v.pointer_mut(path)
            .expect("map")
            .as_object_mut()
            .expect("map")
            .insert("UnmodeledFuture".into(), json!({}));
        deny(&encode(&v), SHAPE);
        deny(&raw_at(&base, path, "[]"), SHAPE);
        let positional: Vec<_> = map.values().cloned().collect();
        deny(&raw_at(&base, path, &json!(positional).to_string()), SHAPE);
        for (key, val) in map {
            let mut v = base.clone();
            let m = v
                .pointer_mut(path)
                .expect("map")
                .as_object_mut()
                .expect("map");
            m.remove(key);
            let first = key.as_bytes()[0];
            let flipped = if first.is_ascii_uppercase() {
                first.to_ascii_lowercase()
            } else {
                first.to_ascii_uppercase()
            };
            let wrong = format!("{}{}", char::from(flipped), &key[1..]);
            m.insert(wrong, val.clone());
            deny(&encode(&v), SHAPE);
            let original = base.pointer(path).expect("map").to_string();
            for encoded_key in [
                serde_json::to_string(key).expect("key"),
                format!("\"\\u{:04x}{}\"", first, &key[1..]),
            ] {
                let duplicate = format!("{{{encoded_key}:{val},{}", &original[1..]);
                deny(&raw_at(&base, path, &duplicate), SHAPE);
            }
        }
    }
    for runtime in RUNTIMES {
        let path = format!("/Runtimes/{runtime}");
        deny(
            &raw_at(
                &base,
                &path,
                "[\"runc\",{\"org.opencontainers.runtime-spec.features\":\"opaque\"}]",
            ),
            SHAPE,
        );
    }
}

fn escaped_keys(v: &Value) -> String {
    match v {
        Value::Object(map) => format!(
            "{{{}}}",
            map.iter()
                .map(|(k, v)| {
                    assert!(k.is_ascii());
                    let key = k.bytes().fold(String::new(), |mut out, b| {
                        write!(&mut out, "\\u{b:04x}").expect("write synthetic key");
                        out
                    });
                    format!("\"{key}\":{}", escaped_keys(v))
                })
                .collect::<Vec<_>>()
                .join(",")
        ),
        Value::Array(v) => format!(
            "[{}]",
            v.iter().map(escaped_keys).collect::<Vec<_>>().join(",")
        ),
        _ => v.to_string(),
    }
}

#[test]
fn source_declaration_order_arrays_are_not_map_alternatives() {
    let v = complete_fixture();
    let maps: [(&str, &[&str]); 5] = [
        ("/Plugins", &["Volume", "Network", "Authorization", "Log"]),
        (
            "/Swarm",
            &[
                "NodeID",
                "NodeAddr",
                "LocalNodeState",
                "ControlAvailable",
                "Error",
                "RemoteManagers",
            ],
        ),
        (
            "/RegistryConfig",
            &["InsecureRegistryCIDRs", "IndexConfigs", "Mirrors"],
        ),
        (
            "/RegistryConfig/IndexConfigs/registry.invalid",
            &["Name", "Mirrors", "Secure", "Official"],
        ),
        ("", &INFO_SOURCE_ORDER),
    ];
    for (path, keys) in maps {
        let map = v.pointer(path).expect("source-shaped map");
        let values: Vec<_> = keys.iter().map(|key| map[*key].clone()).collect();
        deny(&raw_at(&v, path, &json!(values).to_string()), SHAPE);
    }
}

const INFO_SOURCE_ORDER: [&str; 60] = [
    "ID",
    "Containers",
    "ContainersRunning",
    "ContainersPaused",
    "ContainersStopped",
    "Images",
    "Driver",
    "DriverStatus",
    "Plugins",
    "MemoryLimit",
    "SwapLimit",
    "CpuCfsPeriod",
    "CpuCfsQuota",
    "CPUShares",
    "CPUSet",
    "PidsLimit",
    "IPv4Forwarding",
    "Debug",
    "NFd",
    "OomKillDisable",
    "NGoroutines",
    "SystemTime",
    "LoggingDriver",
    "CgroupDriver",
    "CgroupVersion",
    "NEventsListener",
    "KernelVersion",
    "OperatingSystem",
    "OSVersion",
    "OSType",
    "Architecture",
    "IndexServerAddress",
    "RegistryConfig",
    "NCPU",
    "MemTotal",
    "GenericResources",
    "DockerRootDir",
    "HttpProxy",
    "HttpsProxy",
    "NoProxy",
    "Name",
    "Labels",
    "ExperimentalBuild",
    "ServerVersion",
    "Runtimes",
    "DefaultRuntime",
    "Swarm",
    "LiveRestoreEnabled",
    "Isolation",
    "InitBinary",
    "ContainerdCommit",
    "RuncCommit",
    "InitCommit",
    "SecurityOptions",
    "ProductLicense",
    "DefaultAddressPools",
    "FirewallBackend",
    "CDISpecDirs",
    "Containerd",
    "Warnings",
];

#[test]
fn whitespace_order_and_escaped_equivalent_keys_preserve_projection() {
    let base = fixture();
    let reverse = format!(
        "{{{}}}",
        base.as_object()
            .expect("root")
            .iter()
            .rev()
            .map(|(k, v)| format!("{}:{v}", json!(k)))
            .collect::<Vec<_>>()
            .join(",")
    );
    for text in [
        format!(" \n\r\t{GOLDEN}\r\n "),
        reverse,
        escaped_keys(&base),
    ] {
        assert_eq!(
            string_projection(&accept(text.as_bytes())),
            expected_strings()
        );
    }
}

#[test]
fn all_unverified_compared_strings_survive_and_empty_claims_deny() {
    let paths = [
        "/ID",
        "/Architecture",
        "/KernelVersion",
        "/OperatingSystem",
        "/OSVersion",
        "/DockerRootDir",
        "/Driver",
        "/InitBinary",
        "/ContainerdCommit/ID",
        "/RuncCommit/ID",
        "/InitCommit/ID",
        "/Containerd/Address",
        "/Containerd/Namespaces/Containers",
        "/Containerd/Namespaces/Plugins",
    ];
    for (i, path) in paths.into_iter().enumerate() {
        for invalid in ["", "N/A"] {
            let mut v = fixture();
            put(&mut v, path, json!(invalid));
            deny(&encode(&v), RECIPE);
        }
        let mut v = fixture();
        put(&mut v, path, json!("different-unverified-claim"));
        let decoded = accept(&encode(&v));
        let mut expected = expected_strings();
        expected[i] = "different-unverified-claim";
        assert_eq!(string_projection(&decoded), expected);
    }
    for invalid in ["", "N/A"] {
        let mut v = complete_fixture();
        v["FirewallBackend"]["Driver"] = json!(invalid);
        deny(&encode(&v), RECIPE);
    }
}

#[test]
fn every_fixed_predicate_and_forbidden_branch_fails_closed() {
    for path in [
        "/ServerVersion",
        "/OSType",
        "/CgroupDriver",
        "/CgroupVersion",
        "/DefaultRuntime",
        "/Isolation",
        "/Runtimes/runc/path",
        "/Runtimes/io.containerd.runc.v2/path",
        "/Swarm/NodeID",
        "/Swarm/NodeAddr",
        "/Swarm/LocalNodeState",
        "/Swarm/Error",
    ] {
        let mut v = fixture();
        put(&mut v, path, json!("unaccepted"));
        deny(&encode(&v), RECIPE);
    }
    for key in [
        "MemoryLimit",
        "SwapLimit",
        "CpuCfsPeriod",
        "CpuCfsQuota",
        "PidsLimit",
        "Debug",
        "ExperimentalBuild",
        "LiveRestoreEnabled",
    ] {
        let mut v = fixture();
        v[key] = json!(!v[key].as_bool().expect("boolean"));
        deny(&encode(&v), RECIPE);
    }
    let mut v = fixture();
    v["Swarm"]["ControlAvailable"] = json!(true);
    deny(&encode(&v), RECIPE);
    for (path, keys) in [
        ("", vec!["SystemStatus", "NRI", "DiscoveredDevices"]),
        ("/Swarm", vec!["Nodes", "Managers", "Cluster", "Warnings"]),
        (
            "/Runtimes/runc",
            vec!["runtimeArgs", "runtimeType", "options"],
        ),
        (
            "/Runtimes/io.containerd.runc.v2",
            vec!["runtimeArgs", "runtimeType", "options"],
        ),
        ("/ContainerdCommit", vec!["Expected"]),
        ("/RuncCommit", vec!["Expected"]),
        ("/InitCommit", vec!["Expected"]),
    ] {
        for key in keys {
            for value in [
                Value::Null,
                json!([]),
                json!({}),
                json!(false),
                json!(0),
                json!(""),
            ] {
                let mut v = fixture();
                v.pointer_mut(path)
                    .expect("map")
                    .as_object_mut()
                    .expect("map")
                    .insert(key.into(), value);
                deny(&encode(&v), SHAPE);
            }
        }
    }
    let mut v = fixture();
    v["Swarm"]["RemoteManagers"] = json!([]);
    deny(&encode(&v), SHAPE);
    v = fixture();
    v["Runtimes"]["additional"] = json!({"path":"runc"});
    deny(&encode(&v), SHAPE);
}

#[test]
fn exact_security_order_and_optional_daemon_claim_are_retained() {
    let expected = [
        "name=apparmor,profile=default",
        "name=seccomp,profile=builtin",
        "name=cgroupns",
    ];
    for order in [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
    ] {
        let mut v = fixture();
        v["SecurityOptions"] = json!(order.map(|i| expected[i]));
        if order == [0, 1, 2] {
            assert!(!accept(&encode(&v)).daemon_no_new_privileges);
        } else {
            deny(&encode(&v), RECIPE);
        }
    }
    let mut v = fixture();
    v["SecurityOptions"]
        .as_array_mut()
        .expect("array")
        .push(json!("name=no-new-privileges"));
    assert!(accept(&encode(&v)).daemon_no_new_privileges);
    for extra in [
        "name=rootless",
        "name=userns",
        "name=selinux",
        "name=cgroupns",
        "name=apparmor",
        "name=seccomp,profile=default",
    ] {
        let mut v = fixture();
        v["SecurityOptions"]
            .as_array_mut()
            .expect("array")
            .push(json!(extra));
        deny(&encode(&v), RECIPE);
    }
    for i in 0..3 {
        let mut v = fixture();
        v["SecurityOptions"]
            .as_array_mut()
            .expect("array")
            .remove(i);
        deny(&encode(&v), RECIPE);
    }
    for value in [
        json!([]),
        json!(["name=no-new-privileges"]),
        json!([""]),
        json!(["N/A"]),
    ] {
        let mut v = fixture();
        v["SecurityOptions"] = value;
        deny(&encode(&v), RECIPE);
    }
}

#[test]
fn plugin_sets_sort_preserve_null_and_reject_hooks() {
    for key in ["Volume", "Network", "Log"] {
        for list in [
            json!(["z", "a", "m"]),
            json!(["a", "m", "z"]),
            json!(["m", "z", "a"]),
        ] {
            let mut v = fixture();
            v["Plugins"][key] = list;
            let decoded = accept(&encode(&v));
            let selected = match key {
                "Volume" => &decoded.plugins.volume,
                "Network" => &decoded.plugins.network,
                _ => &decoded.plugins.log,
            };
            assert_eq!(names(selected), Some(vec!["a", "m", "z"]));
        }
        for list in [json!(["a", "a"]), json!([""]), json!(["N/A"])] {
            let mut v = fixture();
            v["Plugins"][key] = list;
            deny(&encode(&v), RECIPE);
        }
        for list in [json!([1]), json!([null]), json!([{}]), json!([[]])] {
            let mut v = fixture();
            v["Plugins"][key] = list;
            deny(&encode(&v), SHAPE);
        }
        for list in [Value::Null, json!([])] {
            let null = list.is_null();
            let mut v = fixture();
            v["Plugins"][key] = list;
            let decoded = accept(&encode(&v));
            let selected = match key {
                "Volume" => &decoded.plugins.volume,
                "Network" => &decoded.plugins.network,
                _ => &decoded.plugins.log,
            };
            assert_eq!(names(selected), if null { None } else { Some(vec![]) });
        }
    }
    for key in ["/Plugins/Authorization", "/GenericResources"] {
        for value in [Value::Null, json!([])] {
            let null = value.is_null();
            let mut v = fixture();
            put(&mut v, key, value);
            let decoded = accept(&encode(&v));
            let selected = if key == "/GenericResources" {
                &decoded.generic_resources
            } else {
                &decoded.plugins.authorization
            };
            assert_eq!(matches!(selected, EmptyEncoding::Null), null);
            assert_eq!(matches!(selected, EmptyEncoding::Array), !null);
        }
    }
    for path in ["/Plugins/Authorization", "/CDISpecDirs"] {
        let mut v = fixture();
        put(&mut v, path, json!(["hook"]));
        deny(&encode(&v), RECIPE);
        for value in [json!([null]), json!([1]), json!([{}])] {
            let mut v = fixture();
            put(&mut v, path, value);
            deny(&encode(&v), SHAPE);
        }
    }
    for value in [
        json!([null]),
        json!(["resource"]),
        json!([0]),
        json!([{}]),
        json!([[]]),
    ] {
        let mut v = fixture();
        v["GenericResources"] = value;
        deny(&encode(&v), SHAPE);
    }
    let mut v = fixture();
    v["CDISpecDirs"] = Value::Null;
    deny(&encode(&v), SHAPE);
}

#[test]
fn omission_tagged_values_distinguish_absence_null_and_empty() {
    accept(&encode(&fixture()));
    for path in [
        "/ProductLicense",
        "/DefaultAddressPools",
        "/FirewallBackend",
        "/FirewallBackend/Info",
        "/Runtimes/runc/status",
        "/Runtimes/io.containerd.runc.v2/status",
    ] {
        let mut v = complete_fixture();
        put(&mut v, path, Value::Null);
        deny(&encode(&v), SHAPE);
    }
    for (path, value) in [
        ("/ProductLicense", json!("")),
        ("/DefaultAddressPools", json!([])),
        ("/FirewallBackend/Info", json!([])),
        ("/Runtimes/runc/status", json!({})),
        ("/Runtimes/io.containerd.runc.v2/status", json!({})),
    ] {
        let mut v = complete_fixture();
        put(&mut v, path, value);
        deny(&encode(&v), RECIPE);
    }
    let mut v = complete_fixture();
    v["FirewallBackend"]
        .as_object_mut()
        .expect("map")
        .remove("Info");
    assert_eq!(
        accept(&encode(&v))
            .firewall_driver
            .as_deref()
            .map(String::as_str),
        Some("synthetic-firewall")
    );
    for runtime in RUNTIMES {
        let mut v = complete_fixture();
        v["Runtimes"][runtime]["status"][FEATURE] = json!("");
        deny(&encode(&v), RECIPE);
    }
}

#[test]
fn typed_discarded_fields_cannot_change_the_projection() {
    let mut v = complete_fixture();
    for key in [
        "Containers",
        "ContainersRunning",
        "ContainersPaused",
        "ContainersStopped",
        "Images",
        "NFd",
        "NGoroutines",
        "NEventsListener",
    ] {
        v[key] = json!(1234);
    }
    for key in ["CPUShares", "CPUSet", "IPv4Forwarding", "OomKillDisable"] {
        v[key] = json!(!v[key].as_bool().expect("bool"));
    }
    for key in [
        "LoggingDriver",
        "IndexServerAddress",
        "HttpProxy",
        "HttpsProxy",
        "NoProxy",
        "Name",
        "ProductLicense",
    ] {
        v[key] = json!("PRIVATE_CANARY\n\u{0}discarded");
    }
    v["Labels"] = json!(["PRIVATE_CANARY"]);
    v["Warnings"] = json!(["PRIVATE_CANARY"]);
    v["DriverStatus"] = json!([["PRIVATE_CANARY", "discarded"]]);
    v["FirewallBackend"]["Info"] = json!([["PRIVATE_CANARY", "discarded"]]);
    v["RegistryConfig"] = json!({"InsecureRegistryCIDRs":[],"Mirrors":["PRIVATE_CANARY"],"IndexConfigs":{"PRIVATE_CANARY":{"Name":"PRIVATE_CANARY","Mirrors":["PRIVATE_CANARY"],"Secure":false,"Official":true}}});
    for runtime in RUNTIMES {
        v["Runtimes"][runtime]["status"][FEATURE] = json!("PRIVATE_CANARY non-json features");
    }
    let decoded = accept(&encode(&v));
    assert_eq!(string_projection(&decoded), expected_strings());
    assert_eq!(decoded.logical_cpus, 8);
    assert_eq!(decoded.memory_bytes, 8_589_934_592);
    assert_eq!(
        names(&decoded.plugins.network),
        Some(vec!["bridge", "host", "null"])
    );
    assert_eq!(
        decoded.firewall_driver.as_deref().map(String::as_str),
        Some("synthetic-firewall")
    );
}

#[test]
fn informational_strings_do_not_inherit_compared_claim_restrictions() {
    for text in ["", "N/A"] {
        let mut v = complete_fixture();
        v["DriverStatus"] = json!([[text, text]]);
        v["FirewallBackend"]["Info"] = json!([[text, text]]);
        v["RegistryConfig"]["IndexConfigs"]["registry.invalid"]["Name"] = json!(text);
        v["RegistryConfig"]["IndexConfigs"]["registry.invalid"]["Mirrors"] = json!([text]);
        v["RegistryConfig"]["Mirrors"] = json!([text]);
        v["Labels"] = json!([text]);
        v["Warnings"] = json!([text]);
        for key in [
            "LoggingDriver",
            "IndexServerAddress",
            "HttpProxy",
            "HttpsProxy",
            "NoProxy",
            "Name",
        ] {
            v[key] = json!(text);
        }
        assert_eq!(string_projection(&accept(&encode(&v))), expected_strings());
    }
    let mut v = complete_fixture();
    v["ProductLicense"] = json!("N/A");
    for runtime in RUNTIMES {
        v["Runtimes"][runtime]["status"][FEATURE] = json!("N/A");
    }
    assert_eq!(string_projection(&accept(&encode(&v))), expected_strings());
}

#[test]
fn exact_integer_spelling_width_and_capacity_are_enforced() {
    let paths = [
        "/Containers",
        "/ContainersRunning",
        "/ContainersPaused",
        "/ContainersStopped",
        "/Images",
        "/NFd",
        "/NGoroutines",
        "/NEventsListener",
        "/NCPU",
        "/DefaultAddressPools/0/Size",
    ];
    for path in paths {
        for number in ["1", "2147483647"] {
            accept(&raw_at(&complete_fixture(), path, number));
        }
        for number in [
            "2147483648",
            "9223372036854775808",
            "18446744073709551616",
            "-1",
            "-0",
            "0.0",
            "1.0",
            "1e0",
            "1E+0",
            "\"1\"",
            "true",
        ] {
            deny(&raw_at(&complete_fixture(), path, number), SHAPE);
        }
        if path == "/NCPU" {
            deny(&raw_at(&complete_fixture(), path, "0"), RECIPE);
        } else {
            accept(&raw_at(&complete_fixture(), path, "0"));
        }
    }
    for number in ["1", "9223372036854775807"] {
        accept(&raw_at(&fixture(), "/MemTotal", number));
    }
    for number in [
        "9223372036854775808",
        "18446744073709551616",
        "-0",
        "-1",
        "1e0",
        "1.0",
    ] {
        deny(&raw_at(&fixture(), "/MemTotal", number), SHAPE);
    }
    deny(&raw_at(&fixture(), "/MemTotal", "0"), RECIPE);
    let n = accept(&raw_at(&fixture(), "/NCPU", "2147483647"));
    assert_eq!(n.logical_cpus, 2_147_483_647);
    let n = accept(&raw_at(&fixture(), "/MemTotal", "9223372036854775807"));
    assert_eq!(n.memory_bytes, 9_223_372_036_854_775_807);
    for number in [
        "01", "00", "-01", "+1", ".1", "1.", "1e", "--1", "NaN", "Infinity",
    ] {
        deny(&raw_at(&fixture(), "/Images", number), SYNTAX);
    }
}

#[test]
fn ip_prefix_content_is_bounded_syntax_without_target_authority() {
    for prefix in [
        "0.0.0.0/0",
        "127.0.0.1/32",
        "192.0.2.7/24",
        "::/0",
        "::1/128",
        "2001:db8::1/64",
        "::ffff:192.0.2.1/128",
    ] {
        let mut v = complete_fixture();
        v["RegistryConfig"]["InsecureRegistryCIDRs"] = json!([prefix]);
        v["DefaultAddressPools"][0]["Base"] = json!(prefix);
        accept(&encode(&v));
    }
    for prefix in [
        "",
        "127.0.0.1",
        "127.0.0.1/33",
        "::1/129",
        "::1/-1",
        "::1/+1",
        "::1/00",
        "::1/01",
        "::1/128/1",
        "fe80::1%eth0/64",
        "example.invalid/24",
        " 127.0.0.1/8",
        "127.0.0.1/8 ",
        "127.0.0.999/8",
        "::1/١",
        "::1/1.0",
    ] {
        for path in [
            "/RegistryConfig/InsecureRegistryCIDRs/0",
            "/DefaultAddressPools/0/Base",
        ] {
            let mut v = complete_fixture();
            put(&mut v, path, json!(prefix));
            deny(&encode(&v), RECIPE);
        }
    }
}

#[test]
fn timestamp_calendar_fraction_and_offset_are_validated_without_clock() {
    for timestamp in [
        "0001-01-01T00:00:00Z",
        "9999-12-31T23:59:59Z",
        "2000-02-29T01:02:03.1Z",
        "2024-02-29T23:59:59.123456789+23:59",
        "2026-10-05T12:34:56-00:00",
        "2026-10-05T12:34:56+00:00",
    ] {
        let mut v = fixture();
        v["SystemTime"] = json!(timestamp);
        accept(&encode(&v));
    }
    for timestamp in [
        "",
        "0000-01-01T00:00:00Z",
        "1900-02-29T00:00:00Z",
        "2025-02-29T00:00:00Z",
        "2026-04-31T00:00:00Z",
        "2026-00-01T00:00:00Z",
        "2026-13-01T00:00:00Z",
        "2026-01-00T00:00:00Z",
        "2026-01-01T24:00:00Z",
        "2026-01-01T00:60:00Z",
        "2026-01-01T00:00:60Z",
        "2026-01-01t00:00:00Z",
        "2026-01-01T00:00:00z",
        "2026-01-01T00:00:00.Z",
        "2026-01-01T00:00:00.1234567890Z",
        "2026-01-01T00:00:00+24:00",
        "2026-01-01T00:00:00+00:60",
        "2026-01-01T00:00:00+0000",
        "2026-1-1T00:00:00Z",
        "2026-01-01T00:00:00Ztail",
    ] {
        let mut v = fixture();
        v["SystemTime"] = json!(timestamp);
        deny(&encode(&v), RECIPE);
    }
}

#[test]
fn ordinary_decoded_string_and_dictionary_key_byte_limits() {
    for s in ["x".repeat(4096), "é".repeat(2048), "😀".repeat(1024)] {
        let mut v = fixture();
        v["ID"] = json!(s);
        assert_eq!(accept(&encode(&v)).daemon_id.as_str().len(), 4096);
        v["ID"] = json!(format!("{s}x"));
        deny(&encode(&v), LIMITS);
    }
    for escaped in ["\\u00e9".repeat(2048), "\\ud83d\\ude00".repeat(1024)] {
        assert_eq!(
            accept(&raw_at(&fixture(), "/ID", &format!("\"{escaped}\"")))
                .daemon_id
                .as_str()
                .len(),
            4096
        );
        deny(
            &raw_at(&fixture(), "/ID", &format!("\"{escaped}x\"")),
            LIMITS,
        );
    }
    let row = json!({"Name":"name","Mirrors":null,"Secure":true,"Official":false});
    for key in ["x".repeat(256), "é".repeat(128), "😀".repeat(64)] {
        let mut v = fixture();
        v["RegistryConfig"]["IndexConfigs"] = json!({key.clone():row.clone()});
        accept(&encode(&v));
        v["RegistryConfig"]["IndexConfigs"] = json!({format!("{key}x"):row.clone()});
        deny(&encode(&v), LIMITS);
    }
    let raw = format!("{{\"{}\":{row}}}", "\\u00e9".repeat(128));
    accept(&raw_at(&fixture(), "/RegistryConfig/IndexConfigs", &raw));
    let raw = format!("{{\"{}x\":{row}}}", "\\u00e9".repeat(128));
    deny(
        &raw_at(&fixture(), "/RegistryConfig/IndexConfigs", &raw),
        LIMITS,
    );
    let mut v = fixture();
    v["RegistryConfig"]["IndexConfigs"] = json!({"":row});
    deny(&encode(&v), LIMITS);
}

#[test]
fn feature_string_exception_is_exact_path_and_decoded_bytes_only() {
    for runtime in RUNTIMES {
        for s in ["x".repeat(65_536), "é".repeat(32_768), "😀".repeat(16_384)] {
            let mut v = complete_fixture();
            v["Runtimes"][runtime]["status"][FEATURE] = json!(s);
            assert_eq!(string_projection(&accept(&encode(&v))), expected_strings());
            v["Runtimes"][runtime]["status"][FEATURE] = json!(format!("{s}x"));
            deny(&encode(&v), LIMITS);
        }
        let mut v = complete_fixture();
        v["Runtimes"][runtime]["status"][FEATURE] = json!("x".repeat(65_536));
        accept(escaped_keys(&v).as_bytes());
        let path = format!("/Runtimes/{runtime}/status/{FEATURE}");
        let unicode = format!("\"{}\"", "\\ud83d\\ude00".repeat(16_384));
        accept(&raw_at(&complete_fixture(), &path, &unicode));
        for wrapped in [
            json!(["x".repeat(4097)]),
            json!({"nested":"x".repeat(4097)}),
        ] {
            let mut v = complete_fixture();
            put(&mut v, &path, wrapped);
            deny(&encode(&v), LIMITS);
        }
        for key in ["Org.opencontainers.runtime-spec.features", "other"] {
            let mut v = complete_fixture();
            v["Runtimes"][runtime]["status"] = json!({key:"x".repeat(4097)});
            deny(&encode(&v), LIMITS);
        }
    }
    for path in ["/Name", "/ID", "/Containerd/Address"] {
        let mut v = fixture();
        put(&mut v, path, json!("x".repeat(4097)));
        deny(&encode(&v), LIMITS);
    }
    let mut v = fixture();
    v["Runtimes"]["unknown"] = json!({"path":"runc","status":{FEATURE:"x".repeat(4097)}});
    deny(&encode(&v), LIMITS);
    let mut v = fixture();
    v["Runtimes"] = json!([{ "runc":{"status":{FEATURE:"x".repeat(4097)}}}]);
    deny(&encode(&v), LIMITS);
}

#[test]
fn bounded_arrays_pair_rows_and_pool_counts_are_independent() {
    for path in [
        "/Labels",
        "/Warnings",
        "/RegistryConfig/Mirrors",
        "/RegistryConfig/IndexConfigs/registry.invalid/Mirrors",
    ] {
        let mut v = fixture();
        put(&mut v, path, json!(vec!["x"; 128]));
        accept(&encode(&v));
        put(&mut v, path, json!(vec!["x"; 129]));
        deny(&encode(&v), LIMITS);
    }
    let mut v = fixture();
    v["RegistryConfig"]["InsecureRegistryCIDRs"] = json!(vec!["::1/128"; 128]);
    accept(&encode(&v));
    v["RegistryConfig"]["InsecureRegistryCIDRs"] = json!(vec!["::1/128"; 129]);
    deny(&encode(&v), LIMITS);
    for path in ["/DriverStatus", "/FirewallBackend/Info"] {
        let mut v = complete_fixture();
        put(&mut v, path, json!(vec![vec!["k", "v"]; 64]));
        accept(&encode(&v));
        put(&mut v, path, json!(vec![vec!["k", "v"]; 65]));
        deny(&encode(&v), LIMITS);
        for row in [
            json!([]),
            json!(["x"]),
            json!([1, "x"]),
            json!(null),
            json!({}),
        ] {
            put(&mut v, path, json!([row]));
            deny(&encode(&v), SHAPE);
        }
        put(&mut v, path, json!([["a", "b", "c"]]));
        deny(&encode(&v), LIMITS);
    }
    let mut v = complete_fixture();
    v["DefaultAddressPools"] = json!(vec![json!({"Base":"10.0.0.0/8","Size":24}); 64]);
    accept(&encode(&v));
    v["DefaultAddressPools"]
        .as_array_mut()
        .expect("array")
        .push(json!({"Base":"::/0","Size":64}));
    deny(&encode(&v), LIMITS);
    for key in ["Volume", "Network", "Log"] {
        let mut v = fixture();
        v["Plugins"][key] = json!(
            (0..128)
                .map(|i| format!("plugin-{i:03}"))
                .collect::<Vec<_>>()
        );
        accept(&encode(&v));
        v["Plugins"][key]
            .as_array_mut()
            .expect("array")
            .push(json!("one-too-many"));
        deny(&encode(&v), LIMITS);
    }
}

#[test]
fn registry_map_type_duplicates_and_local_member_limits() {
    for raw in ["[]", "[{}]", "false", "\"not-a-map\""] {
        deny(
            &raw_at(&fixture(), "/RegistryConfig/IndexConfigs", raw),
            SHAPE,
        );
    }
    let row = json!({"Name":"name","Mirrors":[],"Secure":true,"Official":false});
    let entries: serde_json::Map<_, _> = (0..64)
        .map(|i| (format!("registry-{i}"), row.clone()))
        .collect();
    let mut v = fixture();
    v["RegistryConfig"]["IndexConfigs"] = Value::Object(entries);
    accept(&encode(&v));
    v["RegistryConfig"]["IndexConfigs"]["registry-65"] = row.clone();
    deny(&encode(&v), LIMITS);
    for value in [Value::Null, json!({})] {
        v = fixture();
        v["RegistryConfig"]["IndexConfigs"] = value;
        accept(&encode(&v));
    }
    for value in [Value::Null, json!([]), json!(false), json!("bad")] {
        v = fixture();
        v["RegistryConfig"]["IndexConfigs"]["registry.invalid"] = value;
        deny(&encode(&v), SHAPE);
    }
    for key in ["registry.invalid", "\\u0072egistry.invalid"] {
        let raw = format!("{{\"registry.invalid\":{row},\"{key}\":{row}}}");
        deny(
            &raw_at(&fixture(), "/RegistryConfig/IndexConfigs", &raw),
            SHAPE,
        );
    }
    let mut v = complete_fixture();
    for i in 0..4 {
        v[format!("unknown-{i}")] = json!(0);
    }
    assert_eq!(v.as_object().expect("root").len(), 64);
    deny(&encode(&v), SHAPE);
    v["unknown-65"] = json!(0);
    deny(&encode(&v), LIMITS);
}

#[test]
fn total_member_and_depth_limits_are_reached_without_smaller_caps() {
    fn members(last: usize) -> Vec<u8> {
        let full: Value = Value::Object((0..64).map(|i| (format!("k{i}"), json!(0))).collect());
        let mut rows = vec![full; 63];
        rows.push(Value::Object(
            (0..last).map(|i| (format!("k{i}"), json!(0))).collect(),
        ));
        encode(&json!({"unmodeled":rows}))
    }
    // One root member, 63 complete 64-member rows, and a final 63-member row.
    deny(&members(63), SHAPE);
    deny(&members(64), LIMITS);
    let at = format!("{{\"unmodeled\":{}0{}}}", "[".repeat(31), "]".repeat(31));
    deny(at.as_bytes(), SHAPE);
    let over = format!("{{\"unmodeled\":{}0{}}}", "[".repeat(32), "]".repeat(32));
    deny(over.as_bytes(), LIMITS);
    deny(
        format!("{{\"unmodeled\":[{}]}}", vec!["0"; 128].join(",")).as_bytes(),
        SHAPE,
    );
    deny(
        format!("{{\"unmodeled\":[{}]}}", vec!["0"; 129].join(",")).as_bytes(),
        LIMITS,
    );
}

#[test]
fn body_utf8_json_syntax_and_all_truncations_are_bounded() {
    let body = encode(&fixture());
    for end in 0..body.len() {
        deny(&body[..end], SYNTAX);
    }
    let mut padded = body.clone();
    padded.resize(1_048_576, b' ');
    accept(&padded);
    padded.push(0xff);
    deny(&padded, TOO_LARGE);
    for bytes in [
        b"\xef\xbb\xbf{}".as_slice(),
        b"\xff",
        b"{",
        b"[]x",
        b"true false",
        b"{\"x\":\"\x01\"}",
        b"{\"x\":\"\\uD800\"}",
        b"{\"x\":\"\\uDC00\"}",
        b"{\"x\":\"\\uD800\\u0041\"}",
        b"{\"x\":\"\\q\"}",
    ] {
        deny(bytes, SYNTAX);
    }
    for extra in [b"x".as_slice(), b"{}", b"null", b"\0"] {
        let mut v = body.clone();
        v.extend_from_slice(extra);
        deny(&v, SYNTAX);
    }
    for scalar in [b"null".as_slice(), b"true", b"1", b"\"text\"", b"[]"] {
        deny(scalar, SHAPE);
    }
}

#[test]
fn fixed_errors_precedence_and_secret_canaries_do_not_leak() {
    let mut v = fixture();
    v["ID"] = json!("");
    v["Images"] = json!("wrong-shape");
    deny(&encode(&v), SHAPE);
    v = fixture();
    v["Plugins"]["Volume"] = json!(["dup", "dup", null]);
    deny(&encode(&v), SHAPE);
    v = fixture();
    v["Plugins"]["Authorization"] = json!(["hook", 1]);
    deny(&encode(&v), SHAPE);
    v = fixture();
    v["Name"] = json!("PRIVATE_CANARY");
    v["SecurityOptions"] = json!(["PRIVATE_CANARY"]);
    deny(&encode(&v), RECIPE);
    deny(b"{\"PRIVATE_CANARY\":null}", SHAPE);
    let mut oversized = vec![0xff; 1_048_577];
    deny(&oversized, TOO_LARGE);
    oversized.truncate(1_048_576);
    deny(&oversized, SYNTAX);
    let limits_before_bad_syntax = format!("{{\"x\":\"{}", "x".repeat(4097));
    deny(limits_before_bad_syntax.as_bytes(), LIMITS);
    let syntax_before_limit = format!("{{\"x\":?\"{}\"}}", "x".repeat(4097));
    deny(syntax_before_limit.as_bytes(), SYNTAX);
    let mut utf8_before_limit = limits_before_bad_syntax.into_bytes();
    utf8_before_limit.push(0xff);
    deny(&utf8_before_limit, SYNTAX);
    let mut v = fixture();
    v["Name"] = json!("x".repeat(4097));
    v["ID"] = json!(false);
    deny(&encode(&v), LIMITS);
}
