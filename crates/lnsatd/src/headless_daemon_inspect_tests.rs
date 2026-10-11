use super::{
    InspectPhase, InspectRole, InspectStorage, InspectVolumes, UnverifiedContainerInspect,
    decode_inspect_claim,
};
use serde_json::{Value, json};

// Independently derived synthetic contract vectors. No Docker, authenticated
// daemon response, native observation, held custody, or runtime proof is used.
const TOO_LARGE: &str = "headless_inspect.input_too_large";
const SYNTAX: &str = "headless_inspect.json_syntax";
const LIMITS: &str = "headless_inspect.json_limits";
const SHAPE: &str = "headless_inspect.json_shape";
const RECIPE: &str = "headless_inspect.recipe";
const MAX_BODY: usize = 1_048_576;

fn hex(c: char) -> String {
    c.to_string().repeat(64)
}

fn digest(c: char) -> String {
    format!("sha256:{}", hex(c))
}

fn fixture(phase: &str, action: bool, backend: &str) -> Value {
    let started = phase != "created";
    let running = phase == "running";
    let entrypoint = if action {
        "/usr/local/bin/lnsat-hcfg6-adapter"
    } else {
        "/usr/local/bin/lnsat-hcfg6-probe"
    };
    let target = if action { "/work/repository" } else { "/" };
    let image = digest(if backend == "index" { 'b' } else { 'a' });
    let mut host = json!({
        "Binds": [], "ContainerIDFile": "", "LogConfig": {"Type":"none","Config":{}},
        "NetworkMode": "none", "PortBindings": {},
        "RestartPolicy": {"Name":"no","MaximumRetryCount":0}, "AutoRemove": false,
        "VolumeDriver": "", "VolumesFrom": [], "ConsoleSize": [0,0], "CapAdd": [],
        "CapDrop": ["ALL"], "CgroupnsMode": "private", "Dns": [], "DnsOptions": [],
        "DnsSearch": [], "ExtraHosts": [], "GroupAdd": [], "IpcMode": "none", "Cgroup": "",
        "Links": null, "OomScoreAdj": 0, "PidMode": "", "Privileged": false,
        "PublishAllPorts": false, "ReadonlyRootfs": true,
        "SecurityOpt": ["no-new-privileges:true"], "UTSMode": "", "UsernsMode": "",
        "ShmSize": 67_108_864, "Runtime": "runc", "Isolation": "", "Init": false
    });
    // Keep this fixture split. A single json! expansion exceeds the crate's
    // deliberate recursion limit before the decoder is even exercised.
    let host_tail = json!({
        "MaskedPaths": ["/proc/kcore","/proc/keys"],
        "ReadonlyPaths": ["/proc/bus","/proc/fs","/proc/irq","/proc/sys","/proc/sysrq-trigger"],
        "CpuShares":0, "Memory":104_857_600, "NanoCpus":0, "CgroupParent":"lnsat.slice",
        "BlkioWeight":0, "BlkioWeightDevice":null, "BlkioDeviceReadBps":null,
        "BlkioDeviceWriteBps":null, "BlkioDeviceReadIOps":null, "BlkioDeviceWriteIOps":null,
        "CpuPeriod":100_000, "CpuQuota":25000, "CpuRealtimePeriod":0,"CpuRealtimeRuntime":0,
        "CpusetCpus":"", "CpusetMems":"", "Devices":[], "DeviceCgroupRules":[],
        "DeviceRequests":[], "MemoryReservation":0,"MemorySwap":104_857_600,
        "MemorySwappiness":null,"OomKillDisable":false,"PidsLimit":32,"Ulimits":[],
        "CpuCount":0,"CpuPercent":0,"IOMaximumIOps":0,"IOMaximumBandwidth":0
    });
    host.as_object_mut()
        .expect("host object")
        .extend(host_tail.as_object().expect("host tail object").clone());
    if action {
        host["Mounts"] = json!([{"Type":"bind","Source":"/srv/repository","Target":target,
            "BindOptions":{"Propagation":"rprivate","NonRecursive":true}}]);
    }
    assert_eq!(
        host.as_object().unwrap().len(),
        if action { 65 } else { 64 }
    );
    let state = json!({
        "Status":phase,"Running":running,"Paused":false,"Restarting":false,
        "OOMKilled":false,"Dead":false,"Pid":if running {1234} else {0},"ExitCode":0,"Error":"",
        "StartedAt":if started {"2026-10-06T10:00:01Z"} else {"0001-01-01T00:00:00Z"},
        "FinishedAt":if phase == "exited" {"2026-10-06T10:00:02Z"} else {"0001-01-01T00:00:00Z"}
    });
    let config = json!({
        "Hostname":"lnsat","Domainname":"","User":"1001:1002","AttachStdin":true,
        "AttachStdout":true,"AttachStderr":true,"Tty":false,"OpenStdin":true,"StdinOnce":true,
        "Env":["PATH=/usr/bin","LANG=C","LC_ALL=C","HOME=/nonexistent","GIT_CONFIG_NOSYSTEM=1",
            "GIT_CONFIG_GLOBAL=/dev/null","GIT_TERMINAL_PROMPT=0","GIT_NO_REPLACE_OBJECTS=1","GIT_ATTR_NOSYSTEM=1"],
        "Cmd":[],"Healthcheck":{"Test":["NONE"]},"Image":image,"Volumes":null,"WorkingDir":target,
        "Entrypoint":[entrypoint],"Labels":{"io.lnsat.image-role":"hcfg6-git-reference","attempt":"synthetic-a"},
        "StopSignal":"SIGKILL","StopTimeout":1
    });
    let network = json!({
        "SandboxID":if running {hex('e')} else {String::new()},
        "SandboxKey":if running {"/run/docker/netns/synthetic"} else {""},"Ports":{},
        "Networks":{"none":{"IPAMConfig":null,"Links":null,"Aliases":null,"DriverOpts":null,
            "GwPriority":0,"NetworkID":if started {hex('f')} else {String::new()},
            "EndpointID":if running {hex('1')} else {String::new()},"Gateway":"","IPAddress":"",
            "MacAddress":"","IPPrefixLen":0,"IPv6Gateway":"","GlobalIPv6Address":"",
            "GlobalIPv6PrefixLen":0,"DNSNames":null}}
    });
    let top_mounts = if action {
        json!([{"Type":"bind","Source":"/srv/repository","Destination":target,
            "Mode":"","RW":true,"Propagation":"rprivate"}])
    } else {
        json!([])
    };
    let mut body = json!({
        "Id":hex('c'), "Created":"2026-10-06T10:00:00Z", "Path":entrypoint, "Args":[],
        "State":state, "Image":image,
        "ResolvConfPath":if started {"/daemon/meta/resolv.conf"} else {""},
        "HostnamePath":if started {"/daemon/meta/hostname"} else {""},
        "HostsPath":if started {"/daemon/meta/hosts"} else {""},"LogPath":"",
        "Name":format!("/lnsat-hcfg6-{}-{}",if action {"action"} else {"probe"},hex('d')),
        "RestartCount":0,"Driver":"overlayfs","Platform":"linux","MountLabel":"","ProcessLabel":"",
        "AppArmorProfile":if started {"docker-default"} else {""}, "ExecIDs":null,
        "HostConfig":host,"Mounts":top_mounts,"Config":config,"NetworkSettings":network
    });
    if backend == "graph" {
        body["GraphDriver"] = json!({"Name":"overlayfs","Data":null});
    } else {
        body["Storage"] = json!({"RootFS":{"Snapshot":{"Name":"overlayfs"}}});
        body["ImageManifestDescriptor"] = json!({"mediaType":"application/vnd.oci.image.manifest.v1+json",
            "digest":digest('a'),"size":1234,"platform":{"architecture":"amd64","os":"linux"}});
    }
    body
}

fn accept(body: &Value) -> UnverifiedContainerInspect {
    decode_inspect_claim(body.to_string().as_bytes())
        .unwrap_or_else(|e| panic!("synthetic Inspect positive denied: {}", e.as_str()))
}

fn deny_bytes(body: &[u8], expected: &str) {
    let Err(e) = decode_inspect_claim(body) else {
        panic!("synthetic Inspect negative accepted");
    };
    assert_eq!(e.as_str(), expected);
    assert!(!format!("{e:?}").contains("PRIVATE_CANARY"));
}

fn deny(body: &Value, expected: &str) {
    deny_bytes(body.to_string().as_bytes(), expected);
}

fn set(body: &mut Value, pointer: &str, value: Value) {
    *body
        .pointer_mut(pointer)
        .unwrap_or_else(|| panic!("missing fixture path {pointer}")) = value;
}

fn omit(body: &mut Value, pointer: &str) {
    let (parent, key) = pointer.rsplit_once('/').unwrap();
    assert!(
        body.pointer_mut(parent)
            .unwrap()
            .as_object_mut()
            .unwrap()
            .remove(key)
            .is_some()
    );
}

fn map_paths(value: &Value, path: &str, out: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            out.push(path.to_owned());
            for (key, child) in map {
                let key = key.replace('~', "~0").replace('/', "~1");
                map_paths(child, &format!("{path}/{key}"), out);
            }
        }
        Value::Array(items) => {
            for (i, child) in items.iter().enumerate() {
                map_paths(child, &format!("{path}/{i}"), out);
            }
        }
        _ => {}
    }
}

// Render one exact subtree as supplied text, permitting duplicate/escaped keys
// that a JSON Value cannot preserve. The fixture's other bytes stay valid JSON.
fn raw_at(value: &Value, pointer: &str, raw: &str) -> String {
    if pointer.is_empty() {
        return raw.to_owned();
    }
    let tail = pointer.strip_prefix('/').unwrap();
    let (token, rest) = tail
        .split_once('/')
        .map_or((tail, ""), |(a, _b)| (a, &tail[a.len()..]));
    let key = token.replace("~1", "/").replace("~0", "~");
    match value {
        Value::Object(map) => format!(
            "{{{}}}",
            map.iter()
                .map(|(k, v)| {
                    let encoded = if k == &key {
                        raw_at(v, rest, raw)
                    } else {
                        v.to_string()
                    };
                    format!("{}:{encoded}", serde_json::to_string(k).unwrap())
                })
                .collect::<Vec<_>>()
                .join(",")
        ),
        Value::Array(items) => format!(
            "[{}]",
            items
                .iter()
                .enumerate()
                .map(|(i, v)| {
                    if i.to_string() == key {
                        raw_at(v, rest, raw)
                    } else {
                        v.to_string()
                    }
                })
                .collect::<Vec<_>>()
                .join(",")
        ),
        _ => panic!("invalid override path"),
    }
}

#[test]
fn eighteen_phase_role_backend_positives_keep_claims_unverified() {
    for phase in ["created", "running", "exited"] {
        for action in [false, true] {
            for backend in ["graph", "manifest", "index"] {
                let v = fixture(phase, action, backend);
                let c = accept(&v);
                assert_eq!(c.id.as_str(), hex('c'));
                assert_eq!(c.name.as_str(), v["Name"].as_str().unwrap());
                assert_eq!(c.created.as_str(), "2026-10-06T10:00:00Z");
                assert_eq!(c.image.as_str(), v["Image"].as_str().unwrap());
                assert_eq!(
                    c.config_image.as_str(),
                    v["Config"]["Image"].as_str().unwrap()
                );
                assert_eq!(c.pid, if phase == "running" { 1234 } else { 0 });
                assert!(matches!(
                    (&c.phase, phase),
                    (InspectPhase::Created, "created")
                        | (InspectPhase::Running, "running")
                        | (InspectPhase::Exited, "exited")
                ));
                assert!(matches!(
                    (&c.role, action),
                    (InspectRole::Action, true) | (InspectRole::Preparation, false)
                ));
                assert!(matches!(
                    (&c.storage, backend),
                    (InspectStorage::GraphDriver, "graph")
                        | (InspectStorage::Snapshotter, "manifest" | "index")
                ));
                assert_eq!(c.descriptor.is_some(), backend != "graph");
                assert_eq!(c.mount.is_some(), action);
                assert_eq!(c.user.as_str(), "1001:1002");
                assert_eq!(c.memory, 104_857_600);
                assert_eq!(c.memory_swap, 104_857_600);
                assert_eq!(c.pids_limit, 32);
                assert_eq!(c.cpu_period, 100_000);
                assert_eq!(c.cpu_quota, 25000);
                assert!(matches!(c.volumes, InspectVolumes::Null));
                assert_eq!(
                    c.network.network_id.as_str(),
                    if phase == "created" {
                        String::new()
                    } else {
                        hex('f')
                    }
                );
                assert_eq!(
                    c.hostname_path.as_str(),
                    v["HostnamePath"].as_str().unwrap()
                );
                if let Some(d) = c.descriptor {
                    assert_eq!(d.digest.as_str(), digest('a'));
                    assert_eq!(d.size, 1234);
                    assert_eq!(d.platform.architecture.as_str(), "amd64");
                    assert_eq!(d.platform.os.as_str(), "linux");
                    assert!(d.annotations.is_none());
                    if backend == "index" {
                        assert_ne!(c.image.as_str(), d.digest.as_str());
                    }
                }
            }
        }
    }
}

#[test]
fn every_closed_map_rejects_unknown_duplicate_escaped_and_positional_forms() {
    for backend in ["graph", "index"] {
        let v = fixture("running", true, backend);
        let mut paths = Vec::new();
        map_paths(&v, "", &mut paths);
        for path in paths {
            if path == "/Config/Labels" || path == "/GraphDriver/Data" {
                continue;
            }
            let object = v.pointer(&path).unwrap().as_object().unwrap();
            let mut unknown = v.clone();
            unknown
                .pointer_mut(&path)
                .unwrap()
                .as_object_mut()
                .unwrap()
                .insert("PRIVATE_CANARY".into(), json!(null));
            deny(&unknown, SHAPE);
            deny_bytes(raw_at(&v, &path, "[]").as_bytes(), SHAPE);
            if let Some((key, val)) = object.iter().next() {
                let original = v.pointer(&path).unwrap().to_string();
                let escaped = format!(
                    "\\u{:04x}{}",
                    u32::from(key.chars().next().unwrap()),
                    &key[1..]
                );
                for k in [
                    serde_json::to_string(key).unwrap(),
                    format!("\"{escaped}\""),
                ] {
                    let duplicate = format!("{},{}:{val}}}", &original[..original.len() - 1], k);
                    deny_bytes(raw_at(&v, &path, &duplicate).as_bytes(), SHAPE);
                }
            }
        }
    }
}

#[test]
fn required_members_do_not_default_or_accept_null_and_wrong_types() {
    let v = fixture("running", true, "index");
    let mut paths = Vec::new();
    map_paths(&v, "", &mut paths);
    for path in paths {
        if path == "/Config/Labels" {
            continue;
        }
        for (key, value) in v.pointer(&path).unwrap().as_object().unwrap() {
            let member = format!("{path}/{key}");
            let mut absent = v.clone();
            omit(&mut absent, &member);
            let expected = if ["/Storage", "/ImageManifestDescriptor", "/HostConfig/Mounts"]
                .contains(&member.as_str())
            {
                RECIPE
            } else {
                SHAPE
            };
            deny(&absent, expected);
            if !value.is_null() && member != "/Config/Volumes" {
                let mut null = v.clone();
                set(&mut null, &member, Value::Null);
                deny(&null, SHAPE);
            }
            let mut wrong = v.clone();
            set(
                &mut wrong,
                &member,
                if value.is_boolean() {
                    json!("false")
                } else {
                    json!(false)
                },
            );
            deny(&wrong, SHAPE);
        }
    }
    let mut missing_labels = v.clone();
    omit(&mut missing_labels, "/Config/Labels");
    deny(&missing_labels, SHAPE);
    for path in ["/GraphDriver", "/GraphDriver/Name", "/GraphDriver/Data"] {
        let mut b = fixture("running", false, "graph");
        omit(&mut b, path);
        deny(
            &b,
            if path == "/GraphDriver" {
                RECIPE
            } else {
                SHAPE
            },
        );
    }
}

#[test]
fn fixed_predicates_and_local_relations_deny_one_sided_drift() {
    let base = fixture("running", true, "index");
    for (pointer, replacement) in [
        ("/Id", json!("not-a-container-id")),
        ("/Name", json!(format!("/lnsat-hcfg6-probe-{}", hex('d')))),
        ("/Path", json!("/usr/local/bin/lnsat-hcfg6-probe")),
        ("/Config/WorkingDir", json!("/wrong")),
        ("/Config/User", json!("01:1002")),
        ("/HostConfig/MemorySwap", json!(1)),
        ("/HostConfig/CpuPeriod", json!(99999)),
        ("/HostConfig/CpuQuota", json!(25001)),
        ("/State/ExitCode", json!(1)),
        ("/State/Running", json!(false)),
        ("/NetworkSettings/Networks/none/EndpointID", json!("")),
        ("/Mounts/0/Destination", json!("/wrong")),
        ("/HostConfig/Mounts/0/Target", json!("/wrong")),
        ("/ImageManifestDescriptor/platform/os", json!("darwin")),
        ("/ImageManifestDescriptor/size", json!(0)),
    ] {
        let mut changed = base.clone();
        set(&mut changed, pointer, replacement);
        deny(&changed, RECIPE);
    }
    for phase in ["created", "running", "exited"] {
        let mut wrong_time = fixture(phase, false, "graph");
        set(&mut wrong_time, "/Created", json!("0001-01-01T00:00:00Z"));
        deny(&wrong_time, RECIPE);
    }
}

#[test]
fn dynamic_dictionary_and_projection_values_are_retained_without_authority() {
    let mut changed = fixture("running", true, "index");
    changed["Config"]["Labels"]["attempt"] = json!("synthetic-b");
    changed["ImageManifestDescriptor"]["annotations"] = json!({"org.example.one":"1"});
    let claim = accept(&changed);
    assert!(
        claim
            .labels
            .iter()
            .any(|(key, value)| key.as_str() == "attempt" && value.as_str() == "synthetic-b")
    );
    let descriptor = claim.descriptor.unwrap();
    assert_eq!(
        descriptor.annotations.as_ref().unwrap()[0].0.as_str(),
        "org.example.one"
    );
    assert_eq!(descriptor.annotations.as_ref().unwrap()[0].1.as_str(), "1");

    for pointer in ["/Config/Labels", "/ImageManifestDescriptor/annotations"] {
        let mut empty = changed.clone();
        set(&mut empty, pointer, json!({}));
        deny(&empty, RECIPE);
        let mut oversized = changed.clone();
        let map = oversized
            .pointer_mut(pointer)
            .unwrap()
            .as_object_mut()
            .unwrap();
        map.clear();
        for index in 0..65 {
            map.insert(format!("key-{index}"), json!("value"));
        }
        deny(&oversized, SHAPE);
    }
}

#[test]
fn phase_role_and_backend_presence_edges_are_recipe_denials() {
    for (phase, action, backend) in [("created", true, "graph"), ("exited", false, "index")] {
        let value = fixture(phase, action, backend);
        let _ = accept(&value);
    }
    let mut both_storage = fixture("running", true, "graph");
    both_storage["Storage"] = json!({"RootFS":{"Snapshot":{"Name":"overlayfs"}}});
    deny(&both_storage, RECIPE);
    let mut no_storage = fixture("running", false, "graph");
    omit(&mut no_storage, "/GraphDriver");
    deny(&no_storage, RECIPE);
    let mut graph_descriptor = fixture("running", false, "graph");
    graph_descriptor["ImageManifestDescriptor"] = json!({"mediaType":"application/vnd.oci.image.manifest.v1+json","digest":digest('a'),"size":1,"platform":{"architecture":"amd64","os":"linux"}});
    deny(&graph_descriptor, RECIPE);
}

fn second_valid_action_index() -> Value {
    let mut body = fixture("running", true, "index");
    set(&mut body, "/Id", json!(hex('1')));
    set(
        &mut body,
        "/Name",
        json!(format!("/lnsat-hcfg6-action-{}", hex('2'))),
    );
    set(&mut body, "/Created", json!("9999-12-31T23:59:58Z"));
    set(&mut body, "/State/StartedAt", json!("9999-12-31T23:59:59Z"));
    set(&mut body, "/State/Pid", json!(4321));
    set(&mut body, "/Image", json!(digest('3')));
    set(&mut body, "/Config/Image", json!(digest('4')));
    set(&mut body, "/Driver", json!("fuse-overlayfs"));
    set(
        &mut body,
        "/Storage/RootFS/Snapshot/Name",
        json!("fuse-overlayfs"),
    );
    set(&mut body, "/Config/User", json!("1002:1003"));
    set(&mut body, "/Config/WorkingDir", json!("/work/changed"));
    set(&mut body, "/Config/Volumes", json!({}));
    set(&mut body, "/HostConfig/Memory", json!(209_715_200));
    set(&mut body, "/HostConfig/MemorySwap", json!(209_715_200));
    set(&mut body, "/HostConfig/PidsLimit", json!(33));
    set(&mut body, "/HostConfig/CpuQuota", json!(25_100));
    set(
        &mut body,
        "/HostConfig/CgroupParent",
        json!("changed.slice"),
    );
    set(
        &mut body,
        "/HostConfig/MaskedPaths",
        json!(["/proc/changed", "/proc/other"]),
    );
    set(
        &mut body,
        "/ResolvConfPath",
        json!("/daemon/changed/resolv.conf"),
    );
    set(
        &mut body,
        "/HostnamePath",
        json!("/daemon/changed/hostname"),
    );
    set(&mut body, "/HostsPath", json!("/daemon/changed/hosts"));
    set(&mut body, "/Mounts/0/Source", json!("/srv/changed"));
    set(&mut body, "/Mounts/0/Destination", json!("/work/changed"));
    set(
        &mut body,
        "/HostConfig/Mounts/0/Source",
        json!("/srv/changed"),
    );
    set(
        &mut body,
        "/HostConfig/Mounts/0/Target",
        json!("/work/changed"),
    );
    set(&mut body, "/NetworkSettings/SandboxID", json!(hex('5')));
    set(
        &mut body,
        "/NetworkSettings/SandboxKey",
        json!("/run/docker/netns/changed"),
    );
    set(
        &mut body,
        "/NetworkSettings/Networks/none/NetworkID",
        json!(hex('6')),
    );
    set(
        &mut body,
        "/NetworkSettings/Networks/none/EndpointID",
        json!(hex('7')),
    );
    set(
        &mut body,
        "/Config/Labels",
        json!({"io.lnsat.image-role":"hcfg6-git-reference","attempt":"synthetic-b","other":"value"}),
    );
    set(
        &mut body,
        "/ImageManifestDescriptor/digest",
        json!(digest('8')),
    );
    set(&mut body, "/ImageManifestDescriptor/size", json!(4321));
    body["ImageManifestDescriptor"]["annotations"] =
        json!({"org.example.one":"1","org.example.two":"2"});
    set(
        &mut body,
        "/ImageManifestDescriptor/platform/architecture",
        json!("arm64"),
    );
    body["ImageManifestDescriptor"]["platform"]["variant"] = json!("v8");
    body
}

#[test]
fn second_valid_values_retain_every_projected_claim() {
    let claim = accept(&second_valid_action_index());
    assert_eq!(claim.id.as_str(), hex('1'));
    assert_eq!(
        claim.name.as_str(),
        format!("/lnsat-hcfg6-action-{}", hex('2'))
    );
    assert_eq!(claim.created.as_str(), "9999-12-31T23:59:58Z");
    assert!(matches!(claim.phase, InspectPhase::Running));
    assert_eq!(claim.pid, 4321);
    assert_eq!(claim.started_at.as_str(), "9999-12-31T23:59:59Z");
    assert_eq!(claim.finished_at.as_str(), "0001-01-01T00:00:00Z");
    assert_eq!(claim.image.as_str(), digest('3'));
    assert_eq!(claim.config_image.as_str(), digest('4'));
    assert_ne!(claim.image, claim.config_image);
    assert_eq!(claim.driver.as_str(), "fuse-overlayfs");
    assert!(matches!(claim.storage, InspectStorage::Snapshotter));
    assert!(matches!(claim.role, InspectRole::Action));
    assert_eq!(claim.user.as_str(), "1002:1003");
    assert_eq!(claim.working_dir.as_str(), "/work/changed");
    assert_eq!(claim.labels.len(), 3);
    assert!(
        claim
            .labels
            .iter()
            .any(|(k, v)| k.as_str() == "attempt" && v.as_str() == "synthetic-b")
    );
    assert!(matches!(claim.volumes, InspectVolumes::Empty));
    assert_eq!(claim.memory, 209_715_200);
    assert_eq!(claim.memory_swap, 209_715_200);
    assert_eq!(claim.pids_limit, 33);
    assert_eq!(claim.cpu_period, 100_000);
    assert_eq!(claim.cpu_quota, 25_100);
    assert_eq!(claim.cgroup_parent.as_str(), "changed.slice");
    assert_eq!(claim.masked_paths.len(), 2);
    assert_eq!(claim.masked_paths[0].as_str(), "/proc/changed");
    assert_eq!(claim.masked_paths[1].as_str(), "/proc/other");
    assert_eq!(
        claim.resolv_conf_path.as_str(),
        "/daemon/changed/resolv.conf"
    );
    assert_eq!(claim.hostname_path.as_str(), "/daemon/changed/hostname");
    assert_eq!(claim.hosts_path.as_str(), "/daemon/changed/hosts");
    let mount = claim.mount.expect("action retains mount");
    assert_eq!(mount.source.as_str(), "/srv/changed");
    assert_eq!(mount.destination.as_str(), "/work/changed");
    assert_eq!(claim.network.sandbox_id.as_str(), hex('5'));
    assert_eq!(
        claim.network.sandbox_key.as_str(),
        "/run/docker/netns/changed"
    );
    assert_eq!(claim.network.network_id.as_str(), hex('6'));
    assert_eq!(claim.network.endpoint_id.as_str(), hex('7'));
    let descriptor = claim.descriptor.expect("snapshot retains descriptor");
    assert_eq!(
        descriptor.media_type.as_str(),
        "application/vnd.oci.image.manifest.v1+json"
    );
    assert_eq!(descriptor.digest.as_str(), digest('8'));
    assert_eq!(descriptor.size, 4321);
    let annotations = descriptor.annotations.expect("annotations retained");
    assert_eq!(annotations.len(), 2);
    assert!(
        annotations
            .iter()
            .any(|(k, v)| k.as_str() == "org.example.two" && v.as_str() == "2")
    );
    assert_eq!(descriptor.platform.architecture.as_str(), "arm64");
    assert_eq!(descriptor.platform.os.as_str(), "linux");
    assert_eq!(
        descriptor
            .platform
            .variant
            .expect("variant retained")
            .as_str(),
        "v8"
    );

    let mut graph = fixture("running", false, "graph");
    graph["GraphDriver"]["Data"] = json!({});
    let graph_claim = accept(&graph);
    assert!(matches!(graph_claim.storage, InspectStorage::GraphDriver));
    assert!(matches!(graph_claim.volumes, InspectVolumes::Null));
    assert!(graph_claim.descriptor.is_none());
}

#[test]
#[allow(
    clippy::too_many_lines,
    reason = "the exhaustive predicate table is a single contract evidence matrix"
)]
fn every_fixed_scalar_and_array_predicate_rejects_a_typed_drift() {
    let base = fixture("running", true, "index");
    let drifts = vec![
        ("/Args", json!(["unexpected"])),
        ("/Platform", json!("windows")),
        ("/LogPath", json!("/unexpected")),
        ("/RestartCount", json!(1)),
        ("/MountLabel", json!("label")),
        ("/ProcessLabel", json!("label")),
        ("/AppArmorProfile", json!("unconfined")),
        ("/State/Paused", json!(true)),
        ("/State/Restarting", json!(true)),
        ("/State/OOMKilled", json!(true)),
        ("/State/Dead", json!(true)),
        ("/State/ExitCode", json!(1)),
        ("/State/Error", json!("error")),
        ("/Config/Hostname", json!("other")),
        ("/Config/Domainname", json!("example.test")),
        ("/Config/AttachStdin", json!(false)),
        ("/Config/AttachStdout", json!(false)),
        ("/Config/AttachStderr", json!(false)),
        ("/Config/Tty", json!(true)),
        ("/Config/OpenStdin", json!(false)),
        ("/Config/StdinOnce", json!(false)),
        ("/Config/Env", json!(["PATH=/bin"])),
        ("/Config/Cmd", json!(["unexpected"])),
        ("/Config/Healthcheck/Test", json!(["CMD", "true"])),
        ("/Config/StopSignal", json!("SIGTERM")),
        ("/Config/StopTimeout", json!(2)),
        ("/HostConfig/Binds", json!(["/unexpected"])),
        ("/HostConfig/ContainerIDFile", json!("file")),
        ("/HostConfig/LogConfig/Type", json!("json-file")),
        ("/HostConfig/NetworkMode", json!("bridge")),
        ("/HostConfig/RestartPolicy/Name", json!("always")),
        ("/HostConfig/RestartPolicy/MaximumRetryCount", json!(1)),
        ("/HostConfig/AutoRemove", json!(true)),
        ("/HostConfig/VolumeDriver", json!("local")),
        ("/HostConfig/VolumesFrom", json!(["other"])),
        ("/HostConfig/ConsoleSize", json!([0, 1])),
        ("/HostConfig/CapAdd", json!(["NET_ADMIN"])),
        ("/HostConfig/CapDrop", json!(["NET_ADMIN"])),
        ("/HostConfig/CgroupnsMode", json!("host")),
        ("/HostConfig/Dns", json!(["1.1.1.1"])),
        ("/HostConfig/DnsOptions", json!(["use-vc"])),
        ("/HostConfig/DnsSearch", json!(["example.test"])),
        ("/HostConfig/ExtraHosts", json!(["host:127.0.0.1"])),
        ("/HostConfig/GroupAdd", json!(["1000"])),
        ("/HostConfig/IpcMode", json!("host")),
        ("/HostConfig/Cgroup", json!("private")),
        ("/HostConfig/OomScoreAdj", json!(1)),
        ("/HostConfig/PidMode", json!("host")),
        ("/HostConfig/Privileged", json!(true)),
        ("/HostConfig/PublishAllPorts", json!(true)),
        ("/HostConfig/ReadonlyRootfs", json!(false)),
        ("/HostConfig/SecurityOpt", json!([])),
        ("/HostConfig/UTSMode", json!("host")),
        ("/HostConfig/UsernsMode", json!("host")),
        ("/HostConfig/ShmSize", json!(1)),
        ("/HostConfig/Runtime", json!("kata")),
        ("/HostConfig/Isolation", json!("process")),
        ("/HostConfig/Init", json!(true)),
        ("/HostConfig/ReadonlyPaths", json!(["/proc/bus"])),
        ("/HostConfig/CpuShares", json!(1)),
        ("/HostConfig/NanoCpus", json!(1)),
        ("/HostConfig/BlkioWeight", json!(1)),
        ("/HostConfig/CpuRealtimePeriod", json!(1)),
        ("/HostConfig/CpuRealtimeRuntime", json!(1)),
        ("/HostConfig/CpusetCpus", json!("0")),
        ("/HostConfig/CpusetMems", json!("0")),
        ("/HostConfig/DeviceCgroupRules", json!(["c 1:3 rwm"])),
        ("/HostConfig/MemoryReservation", json!(1)),
        ("/HostConfig/OomKillDisable", json!(true)),
        ("/HostConfig/CpuCount", json!(1)),
        ("/HostConfig/CpuPercent", json!(1)),
        ("/HostConfig/IOMaximumIOps", json!(1)),
        ("/HostConfig/IOMaximumBandwidth", json!(1)),
        ("/Mounts/0/Type", json!("volume")),
        ("/Mounts/0/Mode", json!("ro")),
        ("/Mounts/0/RW", json!(false)),
        ("/Mounts/0/Propagation", json!("rshared")),
        ("/HostConfig/Mounts/0/Type", json!("volume")),
        (
            "/HostConfig/Mounts/0/BindOptions/Propagation",
            json!("rshared"),
        ),
        (
            "/HostConfig/Mounts/0/BindOptions/NonRecursive",
            json!(false),
        ),
        ("/NetworkSettings/Networks/none/GwPriority", json!(1)),
        ("/NetworkSettings/Networks/none/Gateway", json!("10.0.0.1")),
        (
            "/NetworkSettings/Networks/none/IPAddress",
            json!("10.0.0.2"),
        ),
        (
            "/NetworkSettings/Networks/none/MacAddress",
            json!("00:11:22:33:44:55"),
        ),
        ("/NetworkSettings/Networks/none/IPPrefixLen", json!(24)),
        ("/NetworkSettings/Networks/none/IPv6Gateway", json!("::1")),
        (
            "/NetworkSettings/Networks/none/GlobalIPv6Address",
            json!("::2"),
        ),
        (
            "/NetworkSettings/Networks/none/GlobalIPv6PrefixLen",
            json!(64),
        ),
        (
            "/ImageManifestDescriptor/mediaType",
            json!("application/json"),
        ),
    ];
    for (pointer, replacement) in drifts {
        let mut changed = base.clone();
        set(&mut changed, pointer, replacement);
        deny(&changed, RECIPE);
    }
}

#[test]
fn null_empty_forbidden_optional_and_dictionary_variants_are_closed() {
    let base = fixture("running", true, "index");
    for (pointer, value) in [
        ("/ExecIDs", json!([])),
        ("/HostConfig/Links", json!([])),
        ("/HostConfig/MemorySwappiness", json!(0)),
        ("/HostConfig/BlkioWeightDevice", json!([])),
        ("/HostConfig/BlkioDeviceReadBps", json!([])),
        ("/HostConfig/BlkioDeviceWriteBps", json!([])),
        ("/HostConfig/BlkioDeviceReadIOps", json!([])),
        ("/HostConfig/BlkioDeviceWriteIOps", json!([])),
        ("/NetworkSettings/Networks/none/IPAMConfig", json!({})),
        ("/NetworkSettings/Networks/none/Links", json!([])),
        ("/NetworkSettings/Networks/none/Aliases", json!([])),
        ("/NetworkSettings/Networks/none/DriverOpts", json!({})),
        ("/NetworkSettings/Networks/none/DNSNames", json!([])),
        ("/HostConfig/Devices", json!([null])),
        ("/HostConfig/DeviceRequests", json!([null])),
        ("/HostConfig/Ulimits", json!([null])),
    ] {
        let mut changed = base.clone();
        set(&mut changed, pointer, value);
        deny(&changed, SHAPE);
    }
    for (pointer, key, value) in [
        ("", "SizeRw", json!(0)),
        ("", "SizeRootFs", json!(0)),
        ("/State", "Health", json!(null)),
        ("/Config", "ExposedPorts", json!({})),
        ("/Config", "ArgsEscaped", json!(false)),
        ("/Config", "NetworkDisabled", json!(false)),
        ("/Config", "OnBuild", json!(null)),
        ("/Config", "Shell", json!([])),
        ("/HostConfig", "Annotations", json!({})),
        ("/HostConfig", "StorageOpt", json!({})),
        ("/HostConfig", "Tmpfs", json!({})),
        ("/HostConfig", "Sysctls", json!({})),
        ("/HostConfig", "Umask", json!(0)),
        ("/ImageManifestDescriptor", "urls", json!([])),
        ("/ImageManifestDescriptor", "data", json!([])),
        ("/ImageManifestDescriptor", "artifactType", json!("x")),
        (
            "/ImageManifestDescriptor/platform",
            "os.version",
            json!("x"),
        ),
        (
            "/ImageManifestDescriptor/platform",
            "os.features",
            json!([]),
        ),
    ] {
        let mut changed = base.clone();
        let object = changed
            .pointer_mut(pointer)
            .expect("fixture object")
            .as_object_mut()
            .expect("map");
        object.insert(key.to_owned(), value);
        deny(&changed, SHAPE);
    }
    for (pointer, value) in [
        ("/Config/Labels", Value::Null),
        ("/Config/Labels", json!([])),
        ("/GraphDriver/Data", json!([])),
        ("/ImageManifestDescriptor/annotations", Value::Null),
        ("/ImageManifestDescriptor/annotations", json!([])),
    ] {
        let mut changed = if pointer.starts_with("/GraphDriver") {
            fixture("running", false, "graph")
        } else {
            base.clone()
        };
        if pointer == "/ImageManifestDescriptor/annotations" {
            changed["ImageManifestDescriptor"]["annotations"] = value;
        } else {
            set(&mut changed, pointer, value);
        }
        deny(&changed, SHAPE);
    }
    let mut nonempty_volumes = base.clone();
    set(
        &mut nonempty_volumes,
        "/Config/Volumes",
        json!({"named":{}}),
    );
    deny(&nonempty_volumes, SHAPE);
}

#[test]
fn body_cap_and_plain_decimal_typed_numbers_are_enforced() {
    let valid = fixture("running", true, "index");
    let mut exactly_cap = valid.to_string().into_bytes();
    exactly_cap.resize(MAX_BODY, b' ');
    let result = decode_inspect_claim(&exactly_cap);
    assert!(result.is_ok(), "exact-cap valid body denied");
    exactly_cap.push(b' ');
    deny_bytes(&exactly_cap, TOO_LARGE);

    for (pointer, raw) in [
        ("/HostConfig/Memory", "1.0"),
        ("/HostConfig/Memory", "1e6"),
        ("/HostConfig/Memory", "-0"),
        ("/HostConfig/Memory", "9223372036854775808"),
        ("/HostConfig/IOMaximumIOps", "-1"),
    ] {
        deny_bytes(raw_at(&valid, pointer, raw).as_bytes(), SHAPE);
    }
}

#[test]
fn timestamp_identity_user_and_path_edges_remain_recipe_denials() {
    let mut offset_fraction = fixture("running", true, "index");
    set(
        &mut offset_fraction,
        "/Created",
        json!("2024-02-29T23:59:58+01:00"),
    );
    set(
        &mut offset_fraction,
        "/State/StartedAt",
        json!("2024-02-29T23:00:00.1+00:00"),
    );
    let retained = accept(&offset_fraction);
    assert_eq!(retained.created.as_str(), "2024-02-29T23:59:58+01:00");
    assert_eq!(retained.started_at.as_str(), "2024-02-29T23:00:00.1+00:00");

    let base = fixture("running", true, "index");
    for (pointer, replacement) in [
        ("/Created", json!("2025-02-29T10:00:00Z")),
        ("/Created", json!("2026-10-06T10:00:00.1234567890Z")),
        ("/State/StartedAt", json!("2026-10-06T09:59:59Z")),
        ("/State/StartedAt", json!("2024-02-29T22:59:57.9+00:00")),
        ("/State/StartedAt", json!("0001-01-01T00:00:00+00:00")),
        ("/Id", json!(hex('A'))),
        ("/Id", json!(hex('a')[..63].to_owned())),
        ("/Image", json!(format!("sha256:{}", hex('A')))),
        ("/Config/Image", json!(format!("sha512:{}", hex('a')))),
        ("/ImageManifestDescriptor/digest", json!("sha256:short")),
        ("/Config/User", json!("0:1")),
        ("/Config/User", json!("1:4294967295")),
        ("/Config/User", json!("4294967295:1")),
        ("/Config/User", json!("1:01")),
        ("/ResolvConfPath", json!("relative")),
        ("/HostnamePath", json!("/daemon/../hostname")),
        ("/HostsPath", json!("/daemon/hosts/")),
        ("/Mounts/0/Source", json!("/srv/../repository")),
        ("/Mounts/0/Destination", json!("/work/repository/")),
        ("/NetworkSettings/SandboxKey", json!("relative")),
        (
            "/HostConfig/MaskedPaths",
            json!(["/proc/kcore", "/proc/kcore"]),
        ),
    ] {
        let mut changed = base.clone();
        set(&mut changed, pointer, replacement);
        deny(&changed, RECIPE);
    }
}

#[test]
fn dynamic_maps_have_ascii_and_cardinality_boundaries() {
    let mut annotation_edge = fixture("running", true, "index");
    let annotations = annotation_edge["ImageManifestDescriptor"]
        .as_object_mut()
        .expect("descriptor");
    annotations.insert("annotations".to_owned(), json!({"a".repeat(256):"v"}));
    let claim = accept(&annotation_edge);
    assert_eq!(
        claim
            .descriptor
            .expect("descriptor")
            .annotations
            .expect("annotations")
            .len(),
        1
    );

    let mut non_ascii = annotation_edge.clone();
    non_ascii["ImageManifestDescriptor"]["annotations"] = json!({"é":"v"});
    deny(&non_ascii, SHAPE);

    for pointer in ["/Config/Labels", "/ImageManifestDescriptor/annotations"] {
        let mut sixty_four = fixture("running", true, "index");
        if pointer == "/ImageManifestDescriptor/annotations" {
            sixty_four["ImageManifestDescriptor"]["annotations"] = json!({});
        }
        let map = sixty_four
            .pointer_mut(pointer)
            .expect("dynamic map")
            .as_object_mut()
            .expect("map");
        map.clear();
        if pointer == "/Config/Labels" {
            map.insert(
                "io.lnsat.image-role".to_owned(),
                json!("hcfg6-git-reference"),
            );
        }
        while map.len() < 64 {
            let index = map.len();
            map.insert(format!("key-{index}"), json!("value"));
        }
        let _ = accept(&sixty_four);
    }

    let mut graph_data = fixture("running", false, "graph");
    graph_data["GraphDriver"]["Data"] = json!({"opaque":"discarded"});
    let claim = accept(&graph_data);
    assert!(matches!(claim.storage, InspectStorage::GraphDriver));
    assert!(claim.descriptor.is_none());
}

#[test]
fn wrong_case_dynamic_duplicates_and_non_object_roots_deny_shape() {
    let base = fixture("running", true, "index");
    let mut paths = Vec::new();
    map_paths(&base, "", &mut paths);
    for path in paths {
        if path == "/Config/Labels" {
            continue;
        }
        let object = base
            .pointer(&path)
            .expect("object")
            .as_object()
            .expect("map");
        for key in object.keys() {
            let index = key
                .bytes()
                .position(|byte| byte.is_ascii_alphabetic())
                .expect("schema key has ASCII letter");
            let mut wrong_key = key.clone();
            let byte = wrong_key.as_bytes()[index];
            let toggled = if byte.is_ascii_lowercase() {
                byte.to_ascii_uppercase()
            } else {
                byte.to_ascii_lowercase()
            };
            wrong_key.replace_range(index..=index, char::from(toggled).encode_utf8(&mut [0; 4]));
            let mut wrong_case = base.clone();
            let map = wrong_case
                .pointer_mut(&path)
                .expect("object")
                .as_object_mut()
                .expect("map");
            let value = map.remove(key).expect("member");
            map.insert(wrong_key, value);
            deny(&wrong_case, SHAPE);
        }
    }
    for (pointer, raw) in [
        (
            "/Config/Labels",
            "{\"io.lnsat.image-role\":\"hcfg6-git-reference\",\"attempt\":\"a\",\"attempt\":\"b\"}",
        ),
        (
            "/Config/Labels",
            "{\"io.lnsat.image-role\":\"hcfg6-git-reference\",\"attempt\":\"a\",\"\\u0061ttempt\":\"b\"}",
        ),
        ("/GraphDriver/Data", "{\"key\":\"a\",\"key\":\"b\"}"),
        ("/GraphDriver/Data", "{\"key\":\"a\",\"\\u006bey\":\"b\"}"),
        (
            "/ImageManifestDescriptor/annotations",
            "{\"key\":\"a\",\"key\":\"b\"}",
        ),
        (
            "/ImageManifestDescriptor/annotations",
            "{\"key\":\"a\",\"\\u006bey\":\"b\"}",
        ),
    ] {
        let mut body = if pointer.starts_with("/GraphDriver") {
            fixture("running", false, "graph")
        } else {
            base.clone()
        };
        if pointer == "/ImageManifestDescriptor/annotations" {
            body["ImageManifestDescriptor"]["annotations"] = json!({});
        }
        deny_bytes(raw_at(&body, pointer, raw).as_bytes(), SHAPE);
    }
    for raw in ["null", "true", "0", "\"text\"", "[]"] {
        deny_bytes(raw.as_bytes(), SHAPE);
    }
}

#[test]
fn numeric_width_phase_tuple_and_role_edges_are_typed_before_recipe() {
    let base = fixture("running", true, "index");
    for (pointer, raw, expected) in [
        ("/HostConfig/BlkioWeight", "65535", RECIPE),
        ("/HostConfig/BlkioWeight", "65536", SHAPE),
        ("/HostConfig/IOMaximumIOps", "18446744073709551615", RECIPE),
        ("/HostConfig/IOMaximumIOps", "18446744073709551616", SHAPE),
        ("/HostConfig/Memory", "-9223372036854775808", RECIPE),
        ("/HostConfig/Memory", "-9223372036854775809", SHAPE),
    ] {
        deny_bytes(raw_at(&base, pointer, raw).as_bytes(), expected);
    }
    let mut maximum_pid = base.clone();
    set(&mut maximum_pid, "/State/Pid", json!(u32::MAX));
    assert_eq!(accept(&maximum_pid).pid, u32::MAX);

    for (phase, pointer, replacement) in [
        ("created", "/State/Running", json!(true)),
        ("running", "/State/Status", json!("exited")),
        ("exited", "/State/Running", json!(true)),
    ] {
        let mut mixed = fixture(phase, false, "graph");
        set(&mut mixed, pointer, replacement);
        deny(&mixed, RECIPE);
    }
    let mut no_top_action_mount = fixture("running", true, "index");
    set(&mut no_top_action_mount, "/Mounts", json!([]));
    deny(&no_top_action_mount, RECIPE);
    let mut no_host_action_mount = fixture("running", true, "index");
    omit(&mut no_host_action_mount, "/HostConfig/Mounts");
    deny(&no_host_action_mount, RECIPE);
    let mut preparation_host_mount = fixture("running", false, "graph");
    preparation_host_mount["HostConfig"]["Mounts"] = json!([{
        "Type":"bind", "Source":"/srv/repository", "Target":"/work/repository",
        "BindOptions":{"Propagation":"rprivate", "NonRecursive":true}
    }]);
    deny(&preparation_host_mount, RECIPE);
}

#[test]
fn timestamp_and_annotation_boundaries_cover_retained_forms() {
    let mut exited = fixture("exited", true, "index");
    set(&mut exited, "/Created", json!("9999-12-31T23:59:57Z"));
    set(
        &mut exited,
        "/State/StartedAt",
        json!("9999-12-31T23:59:58Z"),
    );
    set(
        &mut exited,
        "/State/FinishedAt",
        json!("9999-12-31T23:59:59Z"),
    );
    let claim = accept(&exited);
    assert!(matches!(claim.phase, InspectPhase::Exited));
    assert_eq!(claim.started_at.as_str(), "9999-12-31T23:59:58Z");
    assert_eq!(claim.finished_at.as_str(), "9999-12-31T23:59:59Z");

    let mut descriptor = fixture("running", true, "index");
    descriptor["ImageManifestDescriptor"]["annotations"] = json!({"":"value"});
    deny(&descriptor, LIMITS);
    descriptor["ImageManifestDescriptor"]["annotations"] = json!({"key":"value"});
    descriptor["ImageManifestDescriptor"]["platform"]["variant"] = Value::Null;
    deny(&descriptor, SHAPE);
}

#[test]
fn remaining_recipe_grammar_endpoints_and_positive_encodings() {
    let base = fixture("running", true, "index");
    for (pointer, values) in [
        (
            "/Driver",
            vec![json!(""), json!("N/A"), json!("mismatched")],
        ),
        (
            "/State/Status",
            vec![json!("paused"), json!("Running"), json!("")],
        ),
        (
            "/State/Pid",
            vec![json!(0), json!(-1), json!(4_294_967_296_u64)],
        ),
        ("/HostConfig/Memory", vec![json!(0), json!(-1)]),
        ("/HostConfig/PidsLimit", vec![json!(0), json!(-1)]),
        (
            "/HostConfig/CpuQuota",
            vec![json!(0), json!(999), json!(1001)],
        ),
        (
            "/HostConfig/CgroupParent",
            vec![json!("bad\0"), json!("bad\n"), json!("bad\u{7f}")],
        ),
        (
            "/HostConfig/MaskedPaths",
            vec![
                json!([]),
                json!(["relative"]),
                json!(["/a//b"]),
                json!(["/a/./b"]),
                json!(["/a\0b"]),
            ],
        ),
        (
            "/Config/User",
            [
                "1",
                "1:",
                ":1",
                "-1:1",
                "1:+1",
                "1:2:3",
                "1:4294967296",
                "4294967296:1",
            ]
            .map(|s| json!(s))
            .to_vec(),
        ),
        (
            "/ImageManifestDescriptor/platform/architecture",
            vec![json!(""), json!("N/A")],
        ),
        (
            "/ImageManifestDescriptor/platform/variant",
            vec![json!(""), json!("N/A")],
        ),
        (
            "/Mounts/0/Source",
            vec![
                json!(""),
                json!("/a//b"),
                json!("/a/./b"),
                json!("/a\u{7f}b"),
            ],
        ),
    ] {
        for value in values {
            let mut changed = base.clone();
            if pointer.ends_with("/variant") {
                changed["ImageManifestDescriptor"]["platform"]["variant"] = value;
            } else {
                set(&mut changed, pointer, value);
            }
            deny(&changed, RECIPE);
        }
    }
}

#[test]
fn calendar_and_exact_numeric_positive_encodings() {
    let base = fixture("running", true, "index");
    for created in [
        "0000-01-01T00:00:00Z",
        "2024-00-01T00:00:00Z",
        "2024-13-01T00:00:00Z",
        "2024-01-00T00:00:00Z",
        "2024-04-31T00:00:00Z",
        "1900-02-29T00:00:00Z",
        "2024-01-01t00:00:00Z",
        "2024-01-01T24:00:00Z",
        "2024-01-01T00:60:00Z",
        "2024-01-01T00:00:60Z",
        "2024-01-01T00:00:00z",
        "2024-01-01T00:00:00.Z",
        "2024-01-01T00:00:00+24:00",
        "2024-01-01T00:00:00-00:60",
        "0001-01-01T01:00:00+01:00",
    ] {
        let mut changed = base.clone();
        set(&mut changed, "/Created", json!(created));
        deny(&changed, RECIPE);
    }
    for created in [
        "0001-01-01T00:00:00.000000001Z",
        "2000-02-29T00:00:00Z",
        "2024-01-01T00:00:00-23:59",
    ] {
        let mut changed = base.clone();
        set(&mut changed, "/Created", json!(created));
        assert_eq!(accept(&changed).created.as_str(), created);
    }
    let mut maximum = base.clone();
    maximum["HostConfig"]["Memory"] = json!(i64::MAX);
    maximum["HostConfig"]["MemorySwap"] = json!(i64::MAX);
    maximum["HostConfig"]["PidsLimit"] = json!(i64::MAX);
    maximum["HostConfig"]["CpuQuota"] = json!(i64::MAX / 100 * 100);
    maximum["HostConfig"]["CgroupParent"] = json!("");
    maximum["Config"]["User"] = json!("4294967294:0");
    maximum["ImageManifestDescriptor"]["platform"]["architecture"] = json!("riscv64");
    let claim = accept(&maximum);
    assert_eq!(claim.memory, i64::MAX);
    assert_eq!(claim.memory_swap, i64::MAX);
    assert_eq!(claim.pids_limit, i64::MAX);
    assert_eq!(claim.cpu_quota, i64::MAX / 100 * 100);
    assert_eq!(claim.user.as_str(), "4294967294:0");
    assert!(claim.cgroup_parent.is_empty());
    let encoded = serde_json::to_string_pretty(&base)
        .unwrap()
        .replace("\"Id\":", "\"\\u0049d\":")
        .replace("synthetic-a", "synthetic-\\u0061");
    let claim =
        decode_inspect_claim(encoded.as_bytes()).unwrap_or_else(|e| panic!("{}", e.as_str()));
    assert_eq!(claim.id.as_str(), hex('c'));
    assert!(
        claim
            .labels
            .iter()
            .any(|(_, v)| v.as_str() == "synthetic-a")
    );
}

#[test]
fn graph_dictionary_and_nullable_optional_shape_boundaries() {
    let mut graph = fixture("running", false, "graph");
    graph["GraphDriver"]["Data"] = json!(
        (0..64)
            .map(|i| (format!("key-{i}"), "value"))
            .collect::<std::collections::BTreeMap<_, _>>()
    );
    let _ = accept(&graph);
    graph["GraphDriver"]["Data"]["extra"] = json!("value");
    deny(&graph, SHAPE);
    let mut descriptor = fixture("running", true, "index");
    descriptor["ImageManifestDescriptor"]["annotations"] = json!({"key":"value"});
    descriptor["ImageManifestDescriptor"]["platform"]["variant"] = json!("v9");
    let d = accept(&descriptor).descriptor.unwrap();
    assert_eq!(d.platform.variant.unwrap().as_str(), "v9");
    for pointer in ["/GraphDriver", "/GraphDriver/Data"] {
        let mut v = fixture("running", false, "graph");
        set(&mut v, pointer, json!([]));
        deny(&v, SHAPE);
    }
    for pointer in ["/Config/Labels", "/ImageManifestDescriptor/annotations"] {
        let mut v = descriptor.clone();
        set(&mut v, pointer, json!({"key":0}));
        deny(&v, SHAPE);
    }
    let mut exited = fixture("exited", false, "graph");
    exited["Created"] = json!("2024-01-01T00:00:00.1Z");
    exited["State"]["StartedAt"] = json!("2024-01-01T01:00:00.11+01:00");
    exited["State"]["FinishedAt"] = json!("2023-12-31T23:00:00.110000001-01:00");
    let c = accept(&exited);
    assert_eq!(
        c.finished_at.as_str(),
        "2023-12-31T23:00:00.110000001-01:00"
    );
    exited["State"]["FinishedAt"] = json!("2024-01-01T00:00:00.109999999Z");
    deny(&exited, RECIPE);
}
