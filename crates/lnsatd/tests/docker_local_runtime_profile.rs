#![forbid(unsafe_code)]

use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, EXECUTION_PROPOSAL_SCHEMA_V1_0,
    EXECUTION_REQUEST_DERIVATION_PROFILE_V1, ExecutionRequestV1Input, PacketBudgetV1,
    PacketEnvelopeV1, derive_execution_request_v1, hash_packet_envelope_v1,
};
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1, DOCKER_LOCAL_PROFILE_FAMILY_V1,
    DOCKER_LOCAL_PROFILE_ID_V1, DockerLocalRuntimeProfileErrorV1,
    MAX_DOCKER_LOCAL_PROFILE_BYTES_V1, docker_local_authority_configuration_digest_v1,
    load_docker_local_runtime_profile_v1, parse_docker_local_runtime_profile_v1,
    validate_docker_local_authority_binding_v1,
};
use serde_json::{Value, json};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const EXPECTED_PROFILE_DIGEST: &str =
    "sha256:eb27aa91cea967ed9686b949011e220bc0085e827c1d97b4a477f267dff548fc";
const EXPECTED_AUTHORITY_CONFIGURATION_DIGEST: &str =
    "sha256:076bf61ee91b38010221372b33cf2f47c4dc731667bad90cdbd50145c7ec0cdc";

#[test]
fn exact_profile_fixture_loads_canonical_digest_without_runtime_effects() {
    let directory = TestDirectory::new("fixture");
    let path = directory.write("docker-local.json", PROFILE_FIXTURE);
    let loaded = load_docker_local_runtime_profile_v1(&path).expect("profile must load");
    let profile = loaded.profile();

    assert_eq!(profile.contract_id, DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1);
    assert_eq!(profile.contract_version, CONTRACT_VERSION_V1_0);
    assert_eq!(profile.schema_version, 1);
    assert_eq!(profile.profile_id, DOCKER_LOCAL_PROFILE_ID_V1);
    assert_eq!(profile.profile_family, DOCKER_LOCAL_PROFILE_FAMILY_V1);
    assert_eq!(profile.adapter.adapter_ref, DOCKER_LOCAL_ADAPTER_REF_V1);
    assert_eq!(profile.adapter.version, DOCKER_LOCAL_ADAPTER_VERSION_V1);
    assert_eq!(profile.audience, DOCKER_LOCAL_AUDIENCE_V1);
    assert_eq!(loaded.profile_digest_text(), EXPECTED_PROFILE_DIGEST);
    assert_eq!(loaded.canonical_json().len(), 1230);
    assert!(!loaded.canonical_json().contains('\n'));
    assert!(!loaded.canonical_json().contains(": "));
    assert!(profile.filesystem.root_filesystem_read_only);
    assert!(!profile.filesystem.additional_mounts);
    assert_eq!(profile.isolation.network, "none");
    assert_ne!(profile.isolation.run_as_uid, 0);
    assert_ne!(profile.isolation.run_as_gid, 0);
    assert!(!profile.isolation.privilege.privileged);
    assert!(profile.isolation.privilege.no_new_privileges);
    assert!(profile.isolation.privilege.capabilities_drop_all);
    assert!(!profile.isolation.host_access.docker_socket_mount);
    assert!(!profile.isolation.host_namespaces.pid);
    assert!(!profile.isolation.host_namespaces.ipc);
    assert!(!profile.isolation.host_namespaces.network);
    assert!(!profile.isolation.host_access.devices);
    assert_eq!(profile.isolation.seccomp_profile, "runtime_default");
    assert!(!profile.isolation.ambient.environment);
    assert!(!profile.isolation.ambient.credentials);
    assert!(!profile.isolation.ambient.shell);

    assert_eq!(
        prefixed_sha256(&loaded.authority_configuration_digest()),
        EXPECTED_AUTHORITY_CONFIGURATION_DIGEST
    );
}

#[test]
fn parser_is_order_independent_but_every_semantic_drift_changes_digest() {
    let loaded = parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("fixture");
    let value = fixture_value();
    let compact = serde_json::to_vec(&value).expect("compact profile");
    let compact_loaded =
        parse_docker_local_runtime_profile_v1(&compact).expect("reordered profile");
    assert_eq!(compact_loaded.profile_digest(), loaded.profile_digest());
    assert_eq!(compact_loaded.canonical_json(), loaded.canonical_json());

    for (label, value) in [
        (
            "image",
            with_value(
                &value,
                &["image_digest"],
                json!(format!("sha256:{}", "b".repeat(64))),
            ),
        ),
        (
            "adapter-executable",
            with_value(
                &value,
                &["adapter_executable_digest"],
                json!(format!("sha256:{}", "c".repeat(64))),
            ),
        ),
        (
            "entrypoint",
            with_value(&value, &["entrypoint"], json!("/opt/lnsat/adapter")),
        ),
        (
            "uid",
            with_value(&value, &["isolation", "run_as_uid"], json!(65531)),
        ),
        (
            "memory",
            with_value(&value, &["limits", "memory_bytes"], json!(134_217_728)),
        ),
        (
            "timeout",
            with_value(&value, &["limits", "wall_clock_seconds"], json!(29)),
        ),
    ] {
        let bytes = serde_json::to_vec(&value).expect("drift case");
        let drifted = parse_docker_local_runtime_profile_v1(&bytes).expect("bounded drift");
        assert_ne!(drifted.profile_digest(), loaded.profile_digest(), "{label}");
    }
}

#[test]
fn closed_profile_rejects_identity_and_filesystem_widening() {
    let base = fixture_value();
    assert_profile_rejects(&base, "contract", &["contract_id"], json!("other"));
    assert_profile_rejects(&base, "version", &["contract_version"], json!("other"));
    assert_profile_rejects(&base, "schema", &["schema_version"], json!(2));
    assert_profile_rejects(&base, "profile", &["profile_id"], json!("other"));
    assert_profile_rejects(&base, "family", &["profile_family"], json!("native_host"));
    assert_profile_rejects(&base, "adapter", &["adapter", "ref"], json!("other"));
    assert_profile_rejects(&base, "audience", &["audience"], json!("other"));
    assert_profile_rejects(&base, "image", &["image_digest"], json!("sha256:ABC"));
    assert_profile_rejects(
        &base,
        "adapter-executable",
        &["adapter_executable_digest"],
        json!("sha256:ABC"),
    );
    assert_profile_rejects(&base, "entrypoint", &["entrypoint"], json!("bin/adapter"));
    assert_profile_rejects(
        &base,
        "rootfs",
        &["filesystem", "root_filesystem_read_only"],
        json!(false),
    );
    for (label, path) in [
        ("traversal", "/workspace/../host"),
        ("dot", "/workspace/./repository"),
        ("outside", "/repository"),
    ] {
        assert_profile_rejects(
            &base,
            label,
            &["filesystem", "target_mount_path"],
            json!(path),
        );
    }
    assert_profile_rejects(
        &base,
        "writable-entrypoint",
        &["entrypoint"],
        json!("/workspace/repository/adapter"),
    );
    assert_profile_rejects(
        &base,
        "extra-mount",
        &["filesystem", "additional_mounts"],
        json!(true),
    );
}

#[test]
fn closed_profile_rejects_isolation_widening() {
    let base = fixture_value();
    for (label, path, value) in [
        ("network", ["isolation", "network"], json!("bridge")),
        ("uid", ["isolation", "run_as_uid"], json!(0)),
        ("gid", ["isolation", "run_as_gid"], json!(0)),
    ] {
        assert_profile_rejects(&base, label, &path, value);
    }
    for (label, path, value) in [
        (
            "privileged",
            ["isolation", "privilege", "privileged"],
            json!(true),
        ),
        (
            "new-privileges",
            ["isolation", "privilege", "no_new_privileges"],
            json!(false),
        ),
        (
            "capabilities",
            ["isolation", "privilege", "capabilities_drop_all"],
            json!(false),
        ),
        (
            "docker-socket",
            ["isolation", "host_access", "docker_socket_mount"],
            json!(true),
        ),
        (
            "host-pid",
            ["isolation", "host_namespaces", "pid"],
            json!(true),
        ),
        (
            "host-ipc",
            ["isolation", "host_namespaces", "ipc"],
            json!(true),
        ),
        (
            "host-network",
            ["isolation", "host_namespaces", "network"],
            json!(true),
        ),
        (
            "host-devices",
            ["isolation", "host_access", "devices"],
            json!(true),
        ),
        (
            "ambient-env",
            ["isolation", "ambient", "environment"],
            json!(true),
        ),
        (
            "ambient-creds",
            ["isolation", "ambient", "credentials"],
            json!(true),
        ),
        ("shell", ["isolation", "ambient", "shell"], json!(true)),
    ] {
        assert_profile_rejects(&base, label, &path, value);
    }
    assert_profile_rejects(
        &base,
        "seccomp",
        &["isolation", "seccomp_profile"],
        json!("unconfined"),
    );
}

#[test]
fn closed_profile_rejects_limit_and_json_shape_widening() {
    let base = fixture_value();
    for (label, path, value) in [
        ("memory-low", ["limits", "memory_bytes"], json!(16_777_215)),
        (
            "memory-high",
            ["limits", "memory_bytes"],
            json!(536_870_913_u64),
        ),
        ("pids-low", ["limits", "pids"], json!(0)),
        ("pids-high", ["limits", "pids"], json!(65)),
        ("cpu-low", ["limits", "cpu_millis"], json!(0)),
        ("cpu-high", ["limits", "cpu_millis"], json!(1_001)),
        ("timeout-low", ["limits", "wall_clock_seconds"], json!(0)),
        ("timeout-high", ["limits", "wall_clock_seconds"], json!(31)),
        ("stdout-low", ["limits", "stdout_bytes"], json!(0)),
        ("stdout-high", ["limits", "stdout_bytes"], json!(1_048_577)),
        ("stderr", ["limits", "stderr_bytes"], json!(1)),
    ] {
        assert_profile_rejects(&base, label, &path, value);
    }
    let mut unknown = base;
    unknown.as_object_mut().expect("profile object").insert(
        "docker_endpoint".to_owned(),
        json!("unix:///var/run/docker.sock"),
    );
    assert_profile_value_rejected("unknown", &unknown);
    let duplicate = String::from_utf8(PROFILE_FIXTURE.to_vec())
        .expect("fixture UTF-8")
        .replace(
            "\"network\": \"none\",",
            "\"network\": \"none\",\n    \"network\": \"none\",",
        );
    assert_eq!(
        parse_docker_local_runtime_profile_v1(duplicate.as_bytes()),
        Err(DockerLocalRuntimeProfileErrorV1::ContractInvalid)
    );
    let oversized = vec![b' '; MAX_DOCKER_LOCAL_PROFILE_BYTES_V1 + 1];
    assert_eq!(
        parse_docker_local_runtime_profile_v1(&oversized),
        Err(DockerLocalRuntimeProfileErrorV1::FileTooLarge)
    );
    assert_eq!(
        parse_docker_local_runtime_profile_v1(&[0xff]),
        Err(DockerLocalRuntimeProfileErrorV1::ContractInvalid)
    );
    assert_eq!(
        parse_docker_local_runtime_profile_v1(b"{} trailing"),
        Err(DockerLocalRuntimeProfileErrorV1::ContractInvalid)
    );
    assert_eq!(
        parse_docker_local_runtime_profile_v1(
            String::from_utf8(PROFILE_FIXTURE.to_vec())
                .expect("fixture UTF-8")
                .replace("\"cpu_millis\": 1000", "\"cpu_millis\": 1000.0")
                .as_bytes(),
        ),
        Err(DockerLocalRuntimeProfileErrorV1::ContractInvalid)
    );
    assert_eq!(
        DockerLocalRuntimeProfileErrorV1::ContractInvalid.to_string(),
        "docker_local_profile.contract_invalid"
    );
}

#[test]
fn approved_request_binds_profile_adapter_image_audience_and_configuration() {
    let loaded = parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("fixture");
    let configuration_digest = loaded.authority_configuration_digest();
    assert_eq!(
        configuration_digest,
        docker_local_authority_configuration_digest_v1(&loaded.profile_digest())
    );
    let derived = derive(
        &prefixed_sha256(&configuration_digest),
        &loaded.profile().adapter_executable_digest,
        DOCKER_LOCAL_ADAPTER_REF_V1,
        DOCKER_LOCAL_ADAPTER_VERSION_V1,
        DOCKER_LOCAL_AUDIENCE_V1,
    );
    assert_eq!(
        validate_docker_local_authority_binding_v1(&loaded, &derived),
        Ok(configuration_digest)
    );

    for (label, derived) in [
        (
            "configuration",
            derive(
                &format!("sha256:{}", "c".repeat(64)),
                &loaded.profile().adapter_executable_digest,
                DOCKER_LOCAL_ADAPTER_REF_V1,
                DOCKER_LOCAL_ADAPTER_VERSION_V1,
                DOCKER_LOCAL_AUDIENCE_V1,
            ),
        ),
        (
            "adapter-executable",
            derive(
                &prefixed_sha256(&configuration_digest),
                &format!("sha256:{}", "c".repeat(64)),
                DOCKER_LOCAL_ADAPTER_REF_V1,
                DOCKER_LOCAL_ADAPTER_VERSION_V1,
                DOCKER_LOCAL_AUDIENCE_V1,
            ),
        ),
        (
            "adapter",
            derive(
                &prefixed_sha256(&configuration_digest),
                &loaded.profile().adapter_executable_digest,
                "adapter:local:git-commit",
                DOCKER_LOCAL_ADAPTER_VERSION_V1,
                DOCKER_LOCAL_AUDIENCE_V1,
            ),
        ),
        (
            "version",
            derive(
                &prefixed_sha256(&configuration_digest),
                &loaded.profile().adapter_executable_digest,
                DOCKER_LOCAL_ADAPTER_REF_V1,
                "v2",
                DOCKER_LOCAL_AUDIENCE_V1,
            ),
        ),
        (
            "audience",
            derive(
                &prefixed_sha256(&configuration_digest),
                &loaded.profile().adapter_executable_digest,
                DOCKER_LOCAL_ADAPTER_REF_V1,
                DOCKER_LOCAL_ADAPTER_VERSION_V1,
                "audience:gateway:other",
            ),
        ),
    ] {
        assert_eq!(
            validate_docker_local_authority_binding_v1(&loaded, &derived),
            Err(DockerLocalRuntimeProfileErrorV1::AuthorityBindingInvalid),
            "{label}"
        );
    }

    let mut drift = fixture_value();
    drift["limits"]["wall_clock_seconds"] = json!(29);
    let drifted =
        parse_docker_local_runtime_profile_v1(&serde_json::to_vec(&drift).expect("drift JSON"))
            .expect("narrower profile");
    assert_eq!(
        validate_docker_local_authority_binding_v1(&drifted, &derived),
        Err(DockerLocalRuntimeProfileErrorV1::AuthorityBindingInvalid)
    );
}

#[test]
fn file_boundary_rejects_relative_missing_directory_symlink_and_oversize() {
    assert_eq!(
        load_docker_local_runtime_profile_v1("relative-profile.json"),
        Err(DockerLocalRuntimeProfileErrorV1::PathInvalid)
    );
    let directory = TestDirectory::new("file-boundary");
    assert_eq!(
        load_docker_local_runtime_profile_v1(directory.path.join("missing.json")),
        Err(DockerLocalRuntimeProfileErrorV1::FileInvalid)
    );
    assert_eq!(
        load_docker_local_runtime_profile_v1(&directory.path),
        Err(DockerLocalRuntimeProfileErrorV1::FileInvalid)
    );
    let oversized = directory.write(
        "oversized.json",
        &vec![b' '; MAX_DOCKER_LOCAL_PROFILE_BYTES_V1 + 1],
    );
    assert_eq!(
        load_docker_local_runtime_profile_v1(oversized),
        Err(DockerLocalRuntimeProfileErrorV1::FileTooLarge)
    );

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        let target = directory.write("target.json", PROFILE_FIXTURE);
        let link = directory.path.join("profile-link.json");
        symlink(&target, &link).expect("symlink must create");
        assert_eq!(
            load_docker_local_runtime_profile_v1(link),
            Err(DockerLocalRuntimeProfileErrorV1::FileInvalid)
        );
    }
}

fn derive(
    configuration_digest: &str,
    executable_digest: &str,
    adapter_ref: &str,
    adapter_version: &str,
    audience: &str,
) -> DerivedExecutionRequestV1 {
    let packet = packet(
        configuration_digest,
        executable_digest,
        adapter_ref,
        adapter_version,
        audience,
    );
    let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash");
    derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: &format!("pol_{}", "3".repeat(64)),
        approval_request_id: &format!("apr_{}", "4".repeat(64)),
        approval_decision_id: &format!("apd_{}", "5".repeat(64)),
        requester_ref: "identity:human:requester",
        requester_session_ref: "session:local:requester",
        approver_ref: "identity:human:approver",
        approver_session_ref: "session:local:approver",
        prepared_at: "2026-08-26T18:00:00.000Z",
        expires_at: "2026-08-26T18:01:00Z",
    })
    .expect("execution request must derive")
}

fn packet(
    configuration_digest: &str,
    executable_digest: &str,
    adapter_ref: &str,
    adapter_version: &str,
    audience: &str,
) -> PacketEnvelopeV1 {
    PacketEnvelopeV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: "lnsat.packet_envelope.schema.v1_0".to_owned(),
        packet_id: format!("pkt_{}", "1".repeat(64)),
        packet_type: "ExecutionPacket".to_owned(),
        actor_ref: "identity:human:requester".to_owned(),
        session_ref: "session:local:requester".to_owned(),
        project_ref: "project:fixture".to_owned(),
        intent: "Bind one Docker-local profile without dispatch".to_owned(),
        risk_level: 5,
        source_refs: vec!["source:fixture".to_owned()],
        resource_refs: vec!["resource:repository:fixture".to_owned()],
        policy_profile_ref: "policy:local:default".to_owned(),
        permission_allow: vec!["deploy.request".to_owned()],
        permission_block: Vec::new(),
        budget: PacketBudgetV1 {
            tokens: 0,
            runtime_seconds: 30,
            cost_microusd: 0,
            cpu_millicores: 1_000,
            memory_bytes: 268_435_456,
        },
        constraints: json!({
            "execution_proposal": {
                "schema_id": EXECUTION_PROPOSAL_SCHEMA_V1_0,
                "derivation_profile": EXECUTION_REQUEST_DERIVATION_PROFILE_V1,
                "action": {
                    "kind": "git.commit",
                    "arguments": {
                        "message": "bounded fixture commit",
                        "path": "fixture.txt"
                    }
                },
                "target": {
                    "resource_ref": "resource:repository:fixture",
                    "identity": {
                        "base": "abc123",
                        "repository": "fixture"
                    }
                },
                "configuration_digest": configuration_digest,
                "adapter": {
                    "ref": adapter_ref,
                    "version": adapter_version
                },
                "executable_digest": executable_digest,
                "audience": audience
            }
        })
        .as_object()
        .expect("constraints object")
        .clone(),
        requires_approval: true,
        idempotency_key: format!("idem_{}", "2".repeat(64)),
        created_at: "2026-08-26T17:59:00Z".to_owned(),
        expires_at: "2026-08-26T18:02:00Z".to_owned(),
    }
}

fn assert_profile_rejects(base: &Value, label: &str, path: &[&str], replacement: Value) {
    let value = with_value(base, path, replacement);
    assert_profile_value_rejected(label, &value);
}

fn assert_profile_value_rejected(label: &str, value: &Value) {
    let bytes = serde_json::to_vec(value).expect("case must encode");
    assert_eq!(
        parse_docker_local_runtime_profile_v1(&bytes),
        Err(DockerLocalRuntimeProfileErrorV1::ContractInvalid),
        "{label}"
    );
}

fn fixture_value() -> Value {
    serde_json::from_slice(PROFILE_FIXTURE).expect("fixture JSON")
}

fn with_value(base: &Value, path: &[&str], replacement: Value) -> Value {
    let mut output = base.clone();
    let mut current = &mut output;
    for key in &path[..path.len() - 1] {
        current = current.get_mut(*key).expect("fixture path");
    }
    current[path[path.len() - 1]] = replacement;
    output
}

fn prefixed_sha256(digest: &[u8; 32]) -> String {
    let mut output = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time must follow epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "lnsat-p11-docker-profile-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir(&path).expect("test directory must create");
        Self { path }
    }

    fn write(&self, name: &str, bytes: &[u8]) -> PathBuf {
        let path = self.path.join(name);
        fs::write(&path, bytes).expect("test file must write");
        path
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
