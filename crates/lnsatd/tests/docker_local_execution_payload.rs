#![forbid(unsafe_code)]

use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, EXECUTION_PROPOSAL_SCHEMA_V1_0,
    EXECUTION_REQUEST_DERIVATION_PROFILE_V1, ExecutionRequestV1Input, PacketBudgetV1,
    PacketEnvelopeV1, derive_execution_request_v1, hash_packet_envelope_v1,
};
use lnsatd::adapter_process_protocol::{
    DockerLocalAdapterProcessRequestInputV1, MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1,
};
use lnsatd::docker_local_execution_payload::{
    DOCKER_LOCAL_EXECUTION_PAYLOAD_CONTRACT_ID_V1, DockerLocalExecutionPayloadErrorV1,
    DockerLocalExecutionPayloadRequestFrameV1, MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1,
    build_docker_local_execution_payload_request_v1,
    parse_docker_local_execution_payload_request_v1,
};
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const PAYLOAD_FIXTURE: &str =
    include_str!("../../../fixtures/contracts/phase11-docker-local-execution-payload-v1.json");

#[test]
fn exact_payload_fixture_binds_full_request_and_round_trips() {
    let fixture: Value = serde_json::from_str(PAYLOAD_FIXTURE).expect("fixture must parse");
    assert_eq!(fixture["packet_id"], "P11-D4A");
    assert_eq!(fixture["phase11_complete"], false);
    assert_eq!(fixture["production_supported"], false);
    assert_eq!(
        fixture["contract_id"],
        DOCKER_LOCAL_EXECUTION_PAYLOAD_CONTRACT_ID_V1
    );
    assert_eq!(
        fixture["limits"]["payload_frame_bytes"],
        MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1
    );

    let payload = fixture_payload("bounded payload\n");
    assert_eq!(
        payload.request_digest_text(),
        fixture["sample"]["expected_payload_request_digest"]
            .as_str()
            .expect("expected digest")
    );
    assert!(payload.frame().ends_with(b"\n"));
    assert!(
        payload
            .frame()
            .windows(b"bounded payload".len())
            .any(|value| { value == b"bounded payload" })
    );
    let parsed = parse_docker_local_execution_payload_request_v1(payload.frame())
        .expect("exact payload must parse");
    assert_eq!(parsed.request_digest(), payload.request_digest());
    assert_eq!(parsed.control(), payload.control());
    assert_eq!(
        parsed.derived_request().canonical_request,
        payload.derived_request().canonical_request
    );
    assert_eq!(
        parsed.tool_arguments_digest(),
        payload.tool_arguments_digest()
    );
}

#[test]
fn payload_and_every_cross_boundary_digest_substitution_fail_closed() {
    let payload = fixture_payload("bounded payload\n");
    let value: Value = serde_json::from_slice(payload.frame()).expect("payload value");
    let digest_cases: [(&str, &[&str]); 5] = [
        (
            "execution",
            &["control", "operation", "execution_request_digest"],
        ),
        ("action", &["control", "operation", "action_digest"]),
        ("target", &["target_digest"]),
        (
            "configuration",
            &["control", "runtime", "authority_configuration_digest"],
        ),
        ("tool-arguments", &["tool_arguments_digest"]),
    ];
    for (label, path) in digest_cases {
        let drifted = with_value(&value, path, json!(format!("sha256:{}", "9".repeat(64))));
        let error = payload_error(&canonical_frame(&drifted));
        assert_eq!(
            error,
            DockerLocalExecutionPayloadErrorV1::BindingInvalid,
            "{label}"
        );
    }

    for (label, path, replacement) in [
        (
            "executable",
            &["control", "runtime", "adapter_executable_digest"][..],
            json!(format!("sha256:{}", "8".repeat(64))),
        ),
        (
            "adapter",
            &["control", "runtime", "adapter_ref"][..],
            json!("adapter:docker-local:other"),
        ),
        (
            "audience",
            &["control", "runtime", "audience"][..],
            json!("audience:gateway:other"),
        ),
    ] {
        let drifted = with_value(&value, path, replacement);
        let error = payload_error(&canonical_frame(&drifted));
        assert!(
            matches!(
                error,
                DockerLocalExecutionPayloadErrorV1::BindingInvalid
                    | DockerLocalExecutionPayloadErrorV1::ControlInvalid
            ),
            "{label}: {error}"
        );
    }

    let patch_drift = with_value(
        &value,
        &["execution_request", "action", "arguments", "patch"],
        json!("substituted source bytes\n"),
    );
    assert_eq!(
        payload_error(&canonical_frame(&patch_drift)),
        DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid
    );
}

#[test]
fn framing_limits_and_errors_remain_closed_and_secret_free() {
    let payload = fixture_payload("bounded payload\n");
    let value: Value = serde_json::from_slice(payload.frame()).expect("payload value");
    let mut pretty = serde_json::to_vec_pretty(&value).expect("pretty payload");
    pretty.push(b'\n');
    assert_eq!(
        payload_error(&pretty),
        DockerLocalExecutionPayloadErrorV1::RequestFramingInvalid
    );
    let duplicate = String::from_utf8(payload.frame().to_vec())
        .expect("payload UTF-8")
        .replacen(
            "{\"contract_id\":",
            &format!(
                "{{\"contract_id\":\"{DOCKER_LOCAL_EXECUTION_PAYLOAD_CONTRACT_ID_V1}\",\"contract_id\":"
            ),
            1,
        );
    assert_eq!(
        payload_error(duplicate.as_bytes()),
        DockerLocalExecutionPayloadErrorV1::RequestFramingInvalid
    );
    let mut unknown = value;
    unknown
        .as_object_mut()
        .expect("payload object")
        .insert("source-bytes-marker".to_owned(), json!(true));
    assert_eq!(
        payload_error(&canonical_frame(&unknown)),
        DockerLocalExecutionPayloadErrorV1::InputInvalid
    );
    assert_eq!(
        payload_error(&vec![b'x'; MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1 + 1]),
        DockerLocalExecutionPayloadErrorV1::RequestTooLarge
    );

    let errors = [
        DockerLocalExecutionPayloadErrorV1::InputInvalid,
        DockerLocalExecutionPayloadErrorV1::ControlInvalid,
        DockerLocalExecutionPayloadErrorV1::ExecutionRequestInvalid,
        DockerLocalExecutionPayloadErrorV1::BindingInvalid,
        DockerLocalExecutionPayloadErrorV1::RequestTooLarge,
        DockerLocalExecutionPayloadErrorV1::RequestFramingInvalid,
        DockerLocalExecutionPayloadErrorV1::CanonicalizationFailed,
    ];
    let fixture: Value = serde_json::from_str(PAYLOAD_FIXTURE).expect("fixture must parse");
    for (expected, error) in fixture["error_codes"]
        .as_array()
        .expect("error codes")
        .iter()
        .zip(errors)
    {
        assert_eq!(expected, error.code());
        assert_eq!(error.to_string(), error.code());
        assert!(!error.to_string().contains("source-bytes-marker"));
        assert!(!error.to_string().contains("/private/tmp/lnsat-p11-d4"));
    }
}

#[test]
fn payload_larger_than_d3_control_limit_stays_bounded_without_truncation() {
    let patch = "x".repeat(128 * 1024);
    let payload = fixture_payload(&patch);
    assert!(payload.frame().len() > MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1);
    assert!(payload.frame().len() < MAX_DOCKER_LOCAL_EXECUTION_PAYLOAD_BYTES_V1);
    assert_eq!(
        payload.derived_request().request.action.arguments["patch"],
        patch
    );
    parse_docker_local_execution_payload_request_v1(payload.frame())
        .expect("large bounded payload must round-trip");
}

fn fixture_payload(patch: &str) -> DockerLocalExecutionPayloadRequestFrameV1 {
    let profile = loaded_profile();
    let derived = derived_request(&profile, patch);
    build_docker_local_execution_payload_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
        operation_id: &format!("opn_{}", "1".repeat(64)),
        authorization_id: &format!("xau_{}", "2".repeat(64)),
        idempotency_key: "idempotency:p11-d4a:fixture",
        attempt_sequence: 1,
        loaded_profile: &profile,
        derived_request: &derived,
    })
    .expect("fixture payload must build")
}

fn loaded_profile() -> LoadedDockerLocalRuntimeProfileV1 {
    parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("profile must parse")
}

fn derived_request(
    profile: &LoadedDockerLocalRuntimeProfileV1,
    patch: &str,
) -> DerivedExecutionRequestV1 {
    let packet = packet(profile, patch);
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
        prepared_at: "2026-08-28T07:00:00.000Z",
        expires_at: "2026-08-28T07:01:00Z",
    })
    .expect("execution request must derive")
}

fn packet(profile: &LoadedDockerLocalRuntimeProfileV1, patch: &str) -> PacketEnvelopeV1 {
    let patch_sha256 = prefixed_sha256(&Sha256::digest(patch.as_bytes()).into());
    let repository_path = "/private/tmp/lnsat-p11-d4-fixtures/repository";
    let git_dir_path = "/private/tmp/lnsat-p11-d4-fixtures/repository/.git";
    PacketEnvelopeV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: "lnsat.packet_envelope.schema.v1_0".to_owned(),
        packet_id: format!("pkt_{}", "1".repeat(64)),
        packet_type: "ExecutionPacket".to_owned(),
        actor_ref: "identity:human:requester".to_owned(),
        session_ref: "session:local:requester".to_owned(),
        project_ref: "project:fixture".to_owned(),
        intent: "Bind one executable Docker-local adapter payload".to_owned(),
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
                        "schema_id": "lnsat.git_commit_action.schema.v1",
                        "base_commit_oid": "1111111111111111111111111111111111111111",
                        "head_ref": "refs/heads/main",
                        "allowed_paths": ["fixture.txt"],
                        "patch_sha256": patch_sha256,
                        "patch": patch,
                        "expected_tree_oid": "2222222222222222222222222222222222222222",
                        "commit_metadata": {
                            "message": "bounded D4A fixture commit\n",
                            "author_name": "LNSAT Adapter",
                            "author_email": "adapter@lnsat.invalid",
                            "author_time": "1786500000 +0000",
                            "committer_name": "LNSAT Adapter",
                            "committer_email": "adapter@lnsat.invalid",
                            "committer_time": "1786500000 +0000"
                        }
                    }
                },
                "target": {
                    "resource_ref": "resource:repository:fixture",
                    "identity": {
                        "schema_id": "lnsat.disposable_git_repository.schema.v1",
                        "repository_path": repository_path,
                        "git_dir_path": git_dir_path,
                        "object_format": "sha1",
                        "head_ref": "refs/heads/main",
                        "base_commit_oid": "1111111111111111111111111111111111111111",
                        "fixture_marker_sha256": format!("sha256:{}", "3".repeat(64))
                    }
                },
                "configuration_digest": profile.authority_configuration_digest_text(),
                "adapter": {
                    "ref": DOCKER_LOCAL_ADAPTER_REF_V1,
                    "version": DOCKER_LOCAL_ADAPTER_VERSION_V1
                },
                "executable_digest": profile.profile().adapter_executable_digest,
                "audience": DOCKER_LOCAL_AUDIENCE_V1
            }
        })
        .as_object()
        .expect("constraints object")
        .clone(),
        requires_approval: true,
        idempotency_key: format!("idem_{}", "2".repeat(64)),
        created_at: "2026-08-28T06:59:00Z".to_owned(),
        expires_at: "2026-08-28T07:02:00Z".to_owned(),
    }
}

fn canonical_frame(value: &Value) -> Vec<u8> {
    let mut frame = serde_json::to_vec(value).expect("value must encode");
    frame.push(b'\n');
    frame
}

fn payload_error(frame: &[u8]) -> DockerLocalExecutionPayloadErrorV1 {
    match parse_docker_local_execution_payload_request_v1(frame) {
        Ok(_) => panic!("payload must reject"),
        Err(error) => error,
    }
}

fn with_value(base: &Value, path: &[&str], replacement: Value) -> Value {
    let mut output = base.clone();
    let mut current = &mut output;
    for component in &path[..path.len() - 1] {
        current = current
            .as_object_mut()
            .and_then(|object| object.get_mut(*component))
            .expect("path must exist");
    }
    current
        .as_object_mut()
        .expect("parent object")
        .insert(path[path.len() - 1].to_owned(), replacement);
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
