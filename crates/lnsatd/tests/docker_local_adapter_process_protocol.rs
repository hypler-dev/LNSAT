#![forbid(unsafe_code)]

use lnsat_contracts::{
    CONTRACT_VERSION_V1_0, DerivedExecutionRequestV1, EXECUTION_PROPOSAL_SCHEMA_V1_0,
    EXECUTION_REQUEST_DERIVATION_PROFILE_V1, ExecutionRequestV1Input, PacketBudgetV1,
    PacketEnvelopeV1, derive_execution_request_v1, hash_packet_envelope_v1,
};
use lnsatd::adapter_process_protocol::{
    DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1, DockerLocalAdapterProcessProtocolErrorV1,
    DockerLocalAdapterProcessRequestFrameV1, DockerLocalAdapterProcessRequestInputV1,
    DockerLocalAdapterProcessResultOutcomeV1, MAX_DOCKER_LOCAL_ADAPTER_DEADLINE_MILLIS_V1,
    MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1, MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1,
    MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1, build_docker_local_adapter_process_request_v1,
    encode_docker_local_adapter_process_result_frame_v1,
    parse_docker_local_adapter_process_request_frame_v1,
    validate_docker_local_adapter_process_exchange_v1,
};
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_ADAPTER_REF_V1, DOCKER_LOCAL_ADAPTER_VERSION_V1, DOCKER_LOCAL_AUDIENCE_V1,
    LoadedDockerLocalRuntimeProfileV1, parse_docker_local_runtime_profile_v1,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::time::Duration;

const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const PROTOCOL_FIXTURE: &str = include_str!(
    "../../../fixtures/contracts/phase11-docker-local-adapter-process-protocol-v1.json"
);

#[test]
fn exact_protocol_fixture_builds_canonical_bound_request_and_result() {
    let fixture: Value = serde_json::from_str(PROTOCOL_FIXTURE).expect("fixture must parse");
    assert_eq!(fixture["packet_id"], "P11-D3");
    assert_eq!(fixture["phase11_complete"], false);
    assert_eq!(fixture["production_supported"], false);
    assert_eq!(
        fixture["contract_id"],
        DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1
    );
    assert_eq!(
        fixture["limits"],
        json!({
            "stdin_bytes": MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1,
            "stdout_bytes": MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1,
            "stderr_retained_bytes": MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1,
            "deadline_millis_max": MAX_DOCKER_LOCAL_ADAPTER_DEADLINE_MILLIS_V1,
            "attempt_sequence": 1,
        })
    );

    let request = fixture_request("git.commit", "idempotency:p11-d3:fixture");
    assert_eq!(
        request.request_digest_text(),
        fixture["sample"]["expected_request_digest"]
            .as_str()
            .expect("request digest must exist")
    );
    assert_eq!(request.frame().last(), Some(&b'\n'));
    assert!(!request.canonical_json().as_bytes().contains(&b'\n'));
    assert!(!request.canonical_json().contains(": "));
    assert!(!request.canonical_json().contains(", "));
    assert!(!request.canonical_json().contains("repository_path"));
    assert!(!request.canonical_json().contains("profile_path"));
    assert!(!request.canonical_json().contains("patch"));
    assert!(!request.canonical_json().contains("capability"));
    assert!(!request.canonical_json().contains("secret"));

    let parsed = parse_docker_local_adapter_process_request_frame_v1(request.frame())
        .expect("exact request frame must parse");
    assert_eq!(parsed, request);
    let result = completed_result(&request);
    assert_eq!(
        prefixed_sha256(&Sha256::digest(&result).into()),
        fixture["sample"]["expected_result_frame_sha256"]
            .as_str()
            .expect("result digest must exist")
    );
    let validated = validate_docker_local_adapter_process_exchange_v1(
        &request,
        &result,
        &[],
        Duration::from_millis(1),
    )
    .expect("exact completed result must validate");
    assert_eq!(validated.result_digest(), [0xbb; 32]);
    assert_eq!(validated.result().outcome, "completed");
}

#[test]
fn exact_replay_is_stable_while_action_and_idempotency_substitution_change_digest() {
    let first = fixture_request("git.commit", "idempotency:p11-d3:fixture");
    let replay = fixture_request("git.commit", "idempotency:p11-d3:fixture");
    assert_eq!(first, replay);
    assert_eq!(completed_result(&first), completed_result(&replay));

    let action_substitution = fixture_request("git.push", "idempotency:p11-d3:fixture");
    assert_ne!(
        action_substitution.request().operation.action_digest,
        first.request().operation.action_digest
    );
    assert_ne!(action_substitution.request_digest(), first.request_digest());

    let replay_substitution = fixture_request("git.commit", "idempotency:p11-d3:other");
    assert_ne!(replay_substitution.request_digest(), first.request_digest());
}

#[test]
fn every_result_identity_substitution_fails_closed() {
    let request = fixture_request("git.commit", "idempotency:p11-d3:fixture");
    let result = completed_result(&request);
    let value: Value = serde_json::from_slice(&result).expect("result must parse");
    let cases: [(&str, &[&str], Value); 15] = [
        (
            "operation",
            &["operation", "operation_id"],
            json!(format!("opn_{}", "9".repeat(64))),
        ),
        (
            "request",
            &["operation", "execution_request_digest"],
            json!(format!("sha256:{}", "1".repeat(64))),
        ),
        (
            "action",
            &["operation", "action_digest"],
            json!(format!("sha256:{}", "2".repeat(64))),
        ),
        (
            "authorization",
            &["operation", "authorization_id"],
            json!(format!("xau_{}", "3".repeat(64))),
        ),
        (
            "idempotency",
            &["operation", "idempotency_key"],
            json!("idempotency:p11-d3:substituted"),
        ),
        ("attempt", &["operation", "attempt_sequence"], json!(2)),
        (
            "profile-id",
            &["runtime", "profile_id"],
            json!("runtime-profile:docker-local:other"),
        ),
        (
            "profile-family",
            &["runtime", "profile_family"],
            json!("secure_vm"),
        ),
        (
            "profile-digest",
            &["runtime", "profile_digest"],
            json!(format!("sha256:{}", "4".repeat(64))),
        ),
        (
            "configuration",
            &["runtime", "authority_configuration_digest"],
            json!(format!("sha256:{}", "5".repeat(64))),
        ),
        (
            "adapter",
            &["runtime", "adapter_ref"],
            json!("adapter:docker-local:other"),
        ),
        (
            "adapter-version",
            &["runtime", "adapter_version"],
            json!("v2"),
        ),
        (
            "executable",
            &["runtime", "adapter_executable_digest"],
            json!(format!("sha256:{}", "6".repeat(64))),
        ),
        (
            "image",
            &["runtime", "image_digest"],
            json!(format!("sha256:{}", "7".repeat(64))),
        ),
        (
            "audience",
            &["runtime", "audience"],
            json!("audience:gateway:other"),
        ),
    ];
    for (label, path, replacement) in cases {
        let frame = canonical_frame(&with_value(&value, path, replacement));
        let error = validate_docker_local_adapter_process_exchange_v1(
            &request,
            &frame,
            &[],
            Duration::from_millis(1),
        )
        .expect_err("identity substitution must reject");
        assert!(
            matches!(
                error,
                DockerLocalAdapterProcessProtocolErrorV1::BindingInvalid
                    | DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid
            ),
            "{label}: {error}"
        );
    }
}

#[test]
#[allow(clippy::too_many_lines)]
fn request_and_result_framing_reject_truncation_duplicates_noncanonical_and_oversize() {
    let request = fixture_request("git.commit", "idempotency:p11-d3:fixture");
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(
            &request.frame()[..request.frame().len() - 1]
        ),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestFramingInvalid)
    );
    let mut multiple = request.frame().to_vec();
    multiple.extend_from_slice(b"{}\n");
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(&multiple),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestFramingInvalid)
    );
    let duplicate = String::from_utf8(request.frame().to_vec())
        .expect("request must be UTF-8")
        .replacen(
            "{\"contract_id\":",
            &format!(
                "{{\"contract_id\":\"{DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1}\",\"contract_id\":"
            ),
            1,
        );
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(duplicate.as_bytes()),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid)
    );
    let mut pretty = serde_json::to_vec_pretty(request.request()).expect("pretty request");
    pretty.push(b'\n');
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(&pretty),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestFramingInvalid)
    );
    let noncanonical = String::from_utf8(request.frame().to_vec())
        .expect("request must be UTF-8")
        .replacen(':', ": ", 1);
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(noncanonical.as_bytes()),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid)
    );
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(b"{]\n"),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid)
    );
    assert_eq!(
        parse_docker_local_adapter_process_request_frame_v1(&vec![
            b' ';
            MAX_DOCKER_LOCAL_ADAPTER_STDIN_BYTES_V1
                + 1
        ]),
        Err(DockerLocalAdapterProcessProtocolErrorV1::RequestTooLarge)
    );

    let result = completed_result(&request);
    assert_exchange_error(
        &request,
        &result[..result.len() - 1],
        DockerLocalAdapterProcessProtocolErrorV1::ResultFramingInvalid,
    );
    let mut multiple_result = result.clone();
    multiple_result.extend_from_slice(&result);
    assert_exchange_error(
        &request,
        &multiple_result,
        DockerLocalAdapterProcessProtocolErrorV1::ResultFramingInvalid,
    );
    let duplicate_result = String::from_utf8(result.clone())
        .expect("result must be UTF-8")
        .replacen(
            "{\"contract_id\":",
            &format!(
                "{{\"contract_id\":\"{DOCKER_LOCAL_ADAPTER_PROCESS_PROTOCOL_CONTRACT_ID_V1}\",\"contract_id\":"
            ),
            1,
        );
    assert_exchange_error(
        &request,
        duplicate_result.as_bytes(),
        DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid,
    );
    let value: Value = serde_json::from_slice(&result).expect("result value");
    let mut pretty_result = serde_json::to_vec_pretty(&value).expect("pretty result");
    pretty_result.push(b'\n');
    assert_exchange_error(
        &request,
        &pretty_result,
        DockerLocalAdapterProcessProtocolErrorV1::ResultFramingInvalid,
    );
    let noncanonical_result = String::from_utf8(result.clone())
        .expect("result must be UTF-8")
        .replacen(':', ": ", 1);
    assert_exchange_error(
        &request,
        noncanonical_result.as_bytes(),
        DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid,
    );
    assert_exchange_error(
        &request,
        &vec![b' '; MAX_DOCKER_LOCAL_ADAPTER_STDOUT_BYTES_V1 + 1],
        DockerLocalAdapterProcessProtocolErrorV1::ResultTooLarge,
    );
}

#[test]
fn timeout_stderr_and_explicit_unknown_outcomes_never_become_success() {
    let request = fixture_request("git.commit", "idempotency:p11-d3:fixture");
    let completed = completed_result(&request);
    let deadline = request.request().limits.deadline_millis;
    validate_docker_local_adapter_process_exchange_v1(
        &request,
        &completed,
        &[],
        Duration::from_millis(deadline - 1),
    )
    .expect("completion before deadline must validate");
    assert_eq!(
        validate_docker_local_adapter_process_exchange_v1(
            &request,
            &completed,
            &[],
            Duration::from_millis(deadline),
        ),
        Err(DockerLocalAdapterProcessProtocolErrorV1::OutcomeUnknown)
    );
    let unknown = encode_docker_local_adapter_process_result_frame_v1(
        &request,
        DockerLocalAdapterProcessResultOutcomeV1::OutcomeUnknown,
    )
    .expect("unknown result must frame");
    assert_eq!(
        validate_docker_local_adapter_process_exchange_v1(
            &request,
            &unknown,
            &[],
            Duration::from_millis(1),
        ),
        Err(DockerLocalAdapterProcessProtocolErrorV1::OutcomeUnknown)
    );
    let completed_value: Value = serde_json::from_slice(&completed).expect("completed result");
    let completed_without_digest = with_value(&completed_value, &["result_digest"], Value::Null);
    assert_exchange_error(
        &request,
        &canonical_frame(&completed_without_digest),
        DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid,
    );
    let unknown_value: Value = serde_json::from_slice(&unknown).expect("unknown result");
    let unknown_with_digest = with_value(
        &unknown_value,
        &["result_digest"],
        json!(format!("sha256:{}", "b".repeat(64))),
    );
    assert_exchange_error(
        &request,
        &canonical_frame(&unknown_with_digest),
        DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid,
    );
    assert_eq!(
        validate_docker_local_adapter_process_exchange_v1(
            &request,
            &completed,
            b"private-path-marker/source-bytes",
            Duration::from_millis(1),
        ),
        Err(DockerLocalAdapterProcessProtocolErrorV1::AdapterRejected)
    );
    assert_eq!(
        validate_docker_local_adapter_process_exchange_v1(
            &request,
            &completed,
            &vec![b'x'; MAX_DOCKER_LOCAL_ADAPTER_STDERR_BYTES_V1 + 1],
            Duration::from_millis(1),
        ),
        Err(DockerLocalAdapterProcessProtocolErrorV1::StderrTooLarge)
    );

    let fixture: Value = serde_json::from_str(PROTOCOL_FIXTURE).expect("fixture must parse");
    let error_codes = fixture["error_codes"]
        .as_array()
        .expect("error codes must be array");
    let errors = [
        DockerLocalAdapterProcessProtocolErrorV1::InputInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::AuthorityBindingInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::RequestTooLarge,
        DockerLocalAdapterProcessProtocolErrorV1::RequestFramingInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::RequestInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::ResultTooLarge,
        DockerLocalAdapterProcessProtocolErrorV1::ResultFramingInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::ResultInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::BindingInvalid,
        DockerLocalAdapterProcessProtocolErrorV1::StderrTooLarge,
        DockerLocalAdapterProcessProtocolErrorV1::AdapterRejected,
        DockerLocalAdapterProcessProtocolErrorV1::OutcomeUnknown,
    ];
    assert_eq!(error_codes.len(), errors.len());
    for (fixture_code, error) in error_codes.iter().zip(errors) {
        assert_eq!(fixture_code, error.code());
        assert_eq!(error.to_string(), error.code());
        assert!(!error.to_string().contains("private-path-marker"));
        assert!(!error.to_string().contains("source-bytes"));
    }
}

#[test]
fn invalid_input_and_authority_drift_fail_before_frame_creation() {
    let profile = loaded_profile();
    let derived = derived_request(&profile, "git.commit");
    for (operation_id, authorization_id, idempotency_key, attempt_sequence) in [
        (
            "opn_invalid".to_owned(),
            format!("xau_{}", "2".repeat(64)),
            "idempotency:p11-d3:fixture".to_owned(),
            1,
        ),
        (
            format!("opn_{}", "1".repeat(64)),
            "xau_invalid".to_owned(),
            "idempotency:p11-d3:fixture".to_owned(),
            1,
        ),
        (
            format!("opn_{}", "1".repeat(64)),
            format!("xau_{}", "2".repeat(64)),
            "not-a-reference".to_owned(),
            1,
        ),
        (
            format!("opn_{}", "1".repeat(64)),
            format!("xau_{}", "2".repeat(64)),
            "idempotency:p11-d3:fixture".to_owned(),
            2,
        ),
    ] {
        assert_eq!(
            build_docker_local_adapter_process_request_v1(
                &DockerLocalAdapterProcessRequestInputV1 {
                    operation_id: &operation_id,
                    authorization_id: &authorization_id,
                    idempotency_key: &idempotency_key,
                    attempt_sequence,
                    loaded_profile: &profile,
                    derived_request: &derived,
                }
            ),
            Err(DockerLocalAdapterProcessProtocolErrorV1::InputInvalid)
        );
    }

    let mut drifted = derived;
    drifted.request.audience = "audience:gateway:other".to_owned();
    assert_eq!(
        build_docker_local_adapter_process_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
            operation_id: &format!("opn_{}", "1".repeat(64)),
            authorization_id: &format!("xau_{}", "2".repeat(64)),
            idempotency_key: "idempotency:p11-d3:fixture",
            attempt_sequence: 1,
            loaded_profile: &profile,
            derived_request: &drifted,
        }),
        Err(DockerLocalAdapterProcessProtocolErrorV1::AuthorityBindingInvalid)
    );

    let mut profile_value: Value =
        serde_json::from_slice(PROFILE_FIXTURE).expect("profile fixture must parse");
    profile_value["limits"]["stdout_bytes"] = json!(1);
    let narrow_profile = parse_docker_local_runtime_profile_v1(
        &serde_json::to_vec(&profile_value).expect("narrow profile must encode"),
    )
    .expect("D1 permits a narrower stdout limit");
    let narrow_derived = derived_request(&narrow_profile, "git.commit");
    assert_eq!(
        build_docker_local_adapter_process_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
            operation_id: &format!("opn_{}", "1".repeat(64)),
            authorization_id: &format!("xau_{}", "2".repeat(64)),
            idempotency_key: "idempotency:p11-d3:fixture",
            attempt_sequence: 1,
            loaded_profile: &narrow_profile,
            derived_request: &narrow_derived,
        }),
        Err(DockerLocalAdapterProcessProtocolErrorV1::ResultTooLarge)
    );
}

fn fixture_request(
    action_kind: &str,
    idempotency_key: &str,
) -> DockerLocalAdapterProcessRequestFrameV1 {
    let profile = loaded_profile();
    let derived = derived_request(&profile, action_kind);
    build_docker_local_adapter_process_request_v1(&DockerLocalAdapterProcessRequestInputV1 {
        operation_id: &format!("opn_{}", "1".repeat(64)),
        authorization_id: &format!("xau_{}", "2".repeat(64)),
        idempotency_key,
        attempt_sequence: 1,
        loaded_profile: &profile,
        derived_request: &derived,
    })
    .expect("fixture request must build")
}

fn completed_result(request: &DockerLocalAdapterProcessRequestFrameV1) -> Vec<u8> {
    encode_docker_local_adapter_process_result_frame_v1(
        request,
        DockerLocalAdapterProcessResultOutcomeV1::Completed([0xbb; 32]),
    )
    .expect("completed result must encode")
}

fn assert_exchange_error(
    request: &DockerLocalAdapterProcessRequestFrameV1,
    stdout: &[u8],
    expected: DockerLocalAdapterProcessProtocolErrorV1,
) {
    assert_eq!(
        validate_docker_local_adapter_process_exchange_v1(
            request,
            stdout,
            &[],
            Duration::from_millis(1),
        ),
        Err(expected)
    );
}

fn loaded_profile() -> LoadedDockerLocalRuntimeProfileV1 {
    parse_docker_local_runtime_profile_v1(PROFILE_FIXTURE).expect("profile must parse")
}

fn derived_request(
    profile: &LoadedDockerLocalRuntimeProfileV1,
    action_kind: &str,
) -> DerivedExecutionRequestV1 {
    let packet = packet(profile, action_kind);
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

fn packet(profile: &LoadedDockerLocalRuntimeProfileV1, action_kind: &str) -> PacketEnvelopeV1 {
    PacketEnvelopeV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: "lnsat.packet_envelope.schema.v1_0".to_owned(),
        packet_id: format!("pkt_{}", "1".repeat(64)),
        packet_type: "ExecutionPacket".to_owned(),
        actor_ref: "identity:human:requester".to_owned(),
        session_ref: "session:local:requester".to_owned(),
        project_ref: "project:fixture".to_owned(),
        intent: "Bind one source-only adapter process frame".to_owned(),
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
                    "kind": action_kind,
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

fn with_value(base: &Value, path: &[&str], replacement: Value) -> Value {
    let mut output = base.clone();
    let mut current = &mut output;
    for key in &path[..path.len() - 1] {
        current = current.get_mut(*key).expect("fixture path");
    }
    current[path[path.len() - 1]] = replacement;
    output
}

fn canonical_frame(value: &Value) -> Vec<u8> {
    let mut frame = serde_json::to_vec(value).expect("canonical ASCII fixture");
    frame.push(b'\n');
    frame
}

fn prefixed_sha256(digest: &[u8; 32]) -> String {
    let mut output = String::from("sha256:");
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(output, "{byte:02x}");
    }
    output
}
