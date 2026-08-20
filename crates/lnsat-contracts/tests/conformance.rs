#![forbid(unsafe_code)]

use lnsat_contracts::{
    ApprovalDecisionV1, ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ApprovalEvidenceV1Error, ApprovalRequestV1, AuditEventIdempotencyRefV1, AuditEventV1Error,
    AuditEventV1Input, ContractVersionError, ExecutionRequestV1Input, IntoContractErrorEnvelopeV1,
    PacketEnvelopeV1, PacketEnvelopeV1Error, PolicyDecisionV1, PolicyDecisionV1Error,
    SignedApprovalVerificationV1Error, canonicalize_packet_envelope_v1, create_approval_request_v1,
    create_audit_event_v1, decide_approval_request_v1, decide_packet_envelope_policy_v1,
    derive_execution_request_v1, evaluate_audit_event_idempotency_v1, hash_packet_envelope_v1,
    parse_packet_envelope_v1, parse_signed_approval_evidence_v1, validate_contract_version,
    verify_ed25519_signature_primitive_v1,
};
use serde_json::Value;
use std::fmt::Write as _;

const FIXTURES: &str = include_str!("../../../fixtures/contracts/contract-version-v1_0.tsv");
const STABLE_EVIDENCE_DIGEST_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/stable-evidence-digests-v1_0.tsv");
const PACKET_ENVELOPE_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/packet-envelope-v1_0.json");
const EXECUTION_REQUEST_FIXTURE: &str =
    include_str!("../../../fixtures/contracts/execution-request-v1_0.json");
const POLICY_DECISION_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/policy-decision-v1_0.json");
const APPROVAL_EVIDENCE_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/approval-evidence-v1_0.json");
const SIGNED_APPROVAL_EVIDENCE_JSONL_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/signed-approval-evidence-v1_0.jsonl");
const ED25519_VERIFICATION_JSONL_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/ed25519-verification-v1_0.jsonl");
const AUDIT_EVENT_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/audit-event-v1_0.json");
const AUDIT_IDEMPOTENCY_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/audit-idempotency-v1_0.json");
const ERROR_ENVELOPE_FIXTURES: &str =
    include_str!("../../../fixtures/contracts/error-envelope-v1_0.json");
const SHA256_ROUND_CONSTANTS: [u32; 64] = [
    0x428a_2f98,
    0x7137_4491,
    0xb5c0_fbcf,
    0xe9b5_dba5,
    0x3956_c25b,
    0x59f1_11f1,
    0x923f_82a4,
    0xab1c_5ed5,
    0xd807_aa98,
    0x1283_5b01,
    0x2431_85be,
    0x550c_7dc3,
    0x72be_5d74,
    0x80de_b1fe,
    0x9bdc_06a7,
    0xc19b_f174,
    0xe49b_69c1,
    0xefbe_4786,
    0x0fc1_9dc6,
    0x240c_a1cc,
    0x2de9_2c6f,
    0x4a74_84aa,
    0x5cb0_a9dc,
    0x76f9_88da,
    0x983e_5152,
    0xa831_c66d,
    0xb003_27c8,
    0xbf59_7fc7,
    0xc6e0_0bf3,
    0xd5a7_9147,
    0x06ca_6351,
    0x1429_2967,
    0x27b7_0a85,
    0x2e1b_2138,
    0x4d2c_6dfc,
    0x5338_0d13,
    0x650a_7354,
    0x766a_0abb,
    0x81c2_c92e,
    0x9272_2c85,
    0xa2bf_e8a1,
    0xa81a_664b,
    0xc24b_8b70,
    0xc76c_51a3,
    0xd192_e819,
    0xd699_0624,
    0xf40e_3585,
    0x106a_a070,
    0x19a4_c116,
    0x1e37_6c08,
    0x2748_774c,
    0x34b0_bcb5,
    0x391c_0cb3,
    0x4ed8_aa4a,
    0x5b9c_ca4f,
    0x682e_6ff3,
    0x748f_82ee,
    0x78a5_636f,
    0x84c8_7814,
    0x8cc7_0208,
    0x90be_fffa,
    0xa450_6ceb,
    0xbef9_a3f7,
    0xc671_78f2,
];

#[test]
fn shared_contract_version_fixtures_match_rust() {
    let mut case_count = 0_u32;

    for (line_index, line) in FIXTURES.lines().enumerate() {
        if line.is_empty() || line.starts_with('#') || line.starts_with("case_id\t") {
            continue;
        }

        let columns: Vec<_> = line.split('\t').collect();
        assert_eq!(
            columns.len(),
            5,
            "fixture line {} must contain five tab-separated columns",
            line_index + 1
        );

        let case_id = columns[0];
        let input = if columns[1] == "<empty>" {
            ""
        } else {
            columns[1]
        };
        let expected_version = columns[2];
        let expected_stability = columns[3];
        let expected_error = columns[4];
        let result = validate_contract_version(input);

        if expected_error == "-" {
            let actual = result.unwrap_or_else(|error| panic!("{case_id}: unexpected {error}"));
            assert_eq!(actual.as_str(), expected_version, "{case_id}");
            assert_eq!(actual.stability().as_str(), expected_stability, "{case_id}");
        } else {
            let actual_error = result
                .expect_err(&format!("{case_id}: expected failure"))
                .code();
            assert_eq!(actual_error, expected_error, "{case_id}");
        }

        case_count += 1;
    }

    assert_eq!(case_count, 14, "all shared fixtures must run");
}

#[test]
fn shared_error_envelope_fixtures_match_rust() {
    let fixture: Value =
        serde_json::from_str(ERROR_ENVELOPE_FIXTURES).expect("error fixture must be JSON");
    let cases = fixture["vectors"]
        .as_array()
        .expect("error vectors must be an array");

    for test_case in cases {
        let case_id = test_case["case_id"]
            .as_str()
            .expect("case id must be a string");
        let envelope = match case_id {
            "contract_version_unsupported" => {
                ContractVersionError::Unsupported.into_contract_error_envelope_v1()
            }
            "packet_contract_unsupported" => {
                PacketEnvelopeV1Error::UnsupportedContractVersion.into_contract_error_envelope_v1()
            }
            "policy_time_malformed" => {
                PolicyDecisionV1Error::InvalidEvaluationTime.into_contract_error_envelope_v1()
            }
            "approval_request_not_required" => {
                ApprovalEvidenceV1Error::ApprovalNotRequired.into_contract_error_envelope_v1()
            }
            "approval_decision_input_malformed" => {
                ApprovalEvidenceV1Error::InvalidDecisionInput.into_contract_error_envelope_v1()
            }
            "audit_input_malformed" => {
                AuditEventV1Error::InvalidInput.into_contract_error_envelope_v1()
            }
            _ => panic!("{case_id}: unknown error fixture"),
        };
        let encoded = envelope.to_json_value();
        let object = encoded
            .as_object()
            .expect("error envelope must serialize as an object");
        let expected = &test_case["expected"];
        let expected_family = test_case["family_result_field"]
            .as_str()
            .expect("family result field must be a string");

        assert_eq!(object.len(), 4, "{case_id}");
        assert_eq!(object["ok"], false, "{case_id}");
        assert_eq!(object[expected_family], Value::Null, "{case_id}");
        assert_eq!(
            object["errors"].as_array().map(Vec::len),
            Some(1),
            "{case_id}"
        );
        assert_eq!(object["errors"][0]["code"], expected["code"], "{case_id}");
        assert_eq!(object["errors"][0]["path"], expected["path"], "{case_id}");
        assert_eq!(
            object["errors"][0]["severity"], expected["severity"],
            "{case_id}"
        );
        assert!(
            object["errors"][0]["message"]
                .as_str()
                .is_some_and(|message| !message.is_empty()),
            "{case_id}"
        );
        assert_eq!(object["side_effects"], serde_json::json!([]), "{case_id}");
    }

    assert_eq!(cases.len(), 6, "all shared error-envelope cases must run");
}

#[test]
fn shared_stable_evidence_digest_fixtures_match_rust() {
    let mut case_count = 0_u32;
    let expected_case_ids = [
        "packet_envelope_hash",
        "policy_decision_id",
        "approval_request_id",
        "approval_decision_id",
        "audit_event_id",
    ];

    for (line_index, line) in STABLE_EVIDENCE_DIGEST_FIXTURES.lines().enumerate() {
        if line.is_empty() || line.starts_with('#') || line.starts_with("case_id\t") {
            continue;
        }

        let columns: Vec<_> = line.split('\t').collect();
        assert_eq!(
            columns.len(),
            3,
            "fixture line {} must contain three tab-separated columns",
            line_index + 1
        );
        let case_id = columns[0];
        assert_eq!(
            Some(&case_id),
            expected_case_ids.get(case_count as usize),
            "fixture line {} must preserve the authoritative case order",
            line_index + 1
        );
        let preimage = columns[1].replace("<LF>", "\n");
        let expected = columns[2];
        let digest = sha256(preimage.as_bytes());
        let actual = format!("{}{}", output_prefix(case_id), lowercase_hex(&digest));

        assert_eq!(actual, expected, "{case_id}");
        case_count += 1;
    }

    assert_eq!(
        case_count, 5,
        "all stable evidence digest fixtures must run"
    );
}

#[test]
fn shared_packet_parser_fixtures_match_rust() {
    let fixture: Value =
        serde_json::from_str(PACKET_ENVELOPE_FIXTURES).expect("packet fixture must be JSON");
    let base = fixture["vectors"][0]["packet"].clone();
    let cases = fixture["validation_cases"]
        .as_array()
        .expect("validation cases must be an array");

    for test_case in cases {
        let case_id = test_case["case_id"]
            .as_str()
            .expect("case id must be a string");
        let mutation = test_case["mutation"]
            .as_str()
            .expect("mutation must be a string");
        let expected = test_case["expected"]
            .as_str()
            .expect("expected result must be a string");
        let input = packet_validation_input(&base, mutation);
        let result = parse_packet_envelope_v1(&input);
        let actual = result.as_ref().map_or_else(|error| error.code(), |_| "ok");

        assert_eq!(actual, expected, "{case_id}");
    }
    assert_eq!(cases.len(), 20, "all shared packet parser cases must run");
}

#[test]
fn shared_packet_canonicalization_matches_rust() {
    let fixture: Value =
        serde_json::from_str(PACKET_ENVELOPE_FIXTURES).expect("packet fixture must be JSON");
    let vector = &fixture["vectors"][0];
    let encoded = serde_json::to_vec(&vector["packet"]).expect("packet vector must serialize");
    let packet = parse_packet_envelope_v1(&encoded).expect("packet vector must parse");
    let expected = vector["canonical_json"]
        .as_str()
        .expect("canonical JSON must be a string");

    assert_eq!(
        canonicalize_packet_envelope_v1(&packet).expect("packet must canonicalize"),
        expected
    );
    assert_eq!(
        hash_packet_envelope_v1(&packet).expect("packet must hash"),
        vector["canonical_sha256"]
            .as_str()
            .expect("canonical SHA-256 must be a string")
    );

    let cases = fixture["canonicalization_cases"]
        .as_array()
        .expect("canonicalization cases must be an array");
    for test_case in cases {
        let case_id = test_case["case_id"]
            .as_str()
            .expect("case id must be a string");
        let mut value = vector["packet"].clone();
        value["constraints"] = test_case["constraints"].clone();
        let encoded = serde_json::to_vec(&value).expect("canonical case must serialize");
        let packet = parse_packet_envelope_v1(&encoded).expect("canonical case must parse");
        let expected = test_case["expected_canonical_json"]
            .as_str()
            .expect("canonical JSON must be a string");

        assert_eq!(
            canonicalize_packet_envelope_v1(&packet).expect("packet must canonicalize"),
            expected,
            "{case_id}"
        );
        assert_eq!(
            hash_packet_envelope_v1(&packet).expect("packet must hash"),
            test_case["expected_sha256"]
                .as_str()
                .expect("expected SHA-256 must be a string"),
            "{case_id}"
        );
    }
    assert_eq!(cases.len(), 1, "all canonicalization cases must run");
}

#[test]
fn shared_execution_request_vector_matches_rust() {
    let packet_fixture: Value =
        serde_json::from_str(PACKET_ENVELOPE_FIXTURES).expect("packet fixture must be JSON");
    let fixture: Value =
        serde_json::from_str(EXECUTION_REQUEST_FIXTURE).expect("execution fixture must be JSON");
    let vector_index = fixture["packet_vector"]["vector_index"]
        .as_u64()
        .and_then(|value| usize::try_from(value).ok())
        .expect("packet vector index must fit");
    let mut packet_value = packet_fixture["vectors"][vector_index]["packet"].clone();
    packet_value["permission_envelope"]["allow"] =
        fixture["packet_vector"]["permission_allow_override"].clone();
    packet_value["constraints"]["execution_proposal"] = fixture["proposal"].clone();
    packet_value["requires_approval"] = fixture["packet_vector"]["requires_approval"].clone();
    let packet = parse_packet_envelope_v1(
        serde_json::to_string(&packet_value)
            .expect("packet vector must serialize")
            .as_bytes(),
    )
    .expect("execution packet vector must parse");
    let expected = &fixture["expected"];
    let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash must derive");
    assert_eq!(
        packet_sha256,
        expected["packet_sha256"].as_str().expect("packet digest")
    );
    let chain = &fixture["chain"];
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &packet_sha256,
        policy_decision_id: chain["policy_decision_id"].as_str().expect("policy id"),
        approval_request_id: chain["approval_request_id"].as_str().expect("request id"),
        approval_decision_id: chain["approval_decision_id"].as_str().expect("decision id"),
        requester_ref: chain["requester_ref"].as_str().expect("requester"),
        requester_session_ref: chain["requester_session_ref"]
            .as_str()
            .expect("requester session"),
        approver_ref: chain["approver_ref"].as_str().expect("approver"),
        approver_session_ref: chain["approver_session_ref"]
            .as_str()
            .expect("approver session"),
        prepared_at: chain["prepared_at"].as_str().expect("prepared time"),
        expires_at: chain["expires_at"].as_str().expect("expiry"),
    })
    .expect("execution request must derive");
    assert_eq!(
        derived.canonical_request,
        expected["canonical_request"]
            .as_str()
            .expect("canonical request")
    );
    for (name, digest) in [
        ("request_digest", derived.request_digest),
        ("action_digest", derived.action_digest),
        ("target_digest", derived.target_digest),
    ] {
        assert_eq!(
            format!("sha256:{}", lowercase_hex(&digest)),
            expected[name].as_str().expect("derived digest"),
            "{name}"
        );
    }
    assert_eq!(derived.configuration_digest, [0xcc; 32]);
    assert_eq!(derived.executable_digest, [0xee; 32]);
    assert_eq!(expected["execution_authorized"], false);
    assert_eq!(expected["side_effects"], serde_json::json!([]));
}

#[test]
fn shared_policy_evaluation_matches_rust() {
    let packet_fixture: Value =
        serde_json::from_str(PACKET_ENVELOPE_FIXTURES).expect("packet fixture must be JSON");
    let policy_fixture: Value =
        serde_json::from_str(POLICY_DECISION_FIXTURES).expect("policy fixture must be JSON");
    let encoded = serde_json::to_vec(&packet_fixture["vectors"][0]["packet"])
        .expect("packet vector must serialize");
    let base = parse_packet_envelope_v1(&encoded).expect("packet vector must parse");
    let cases = policy_fixture["evaluation_cases"]
        .as_array()
        .expect("policy cases must be an array");

    for test_case in cases {
        let case_id = test_case["case_id"]
            .as_str()
            .expect("case id must be a string");
        let mutation = test_case["mutation"]
            .as_str()
            .expect("mutation must be a string");
        let evaluated_at = test_case["evaluated_at"]
            .as_str()
            .expect("evaluation time must be a string");
        let packet = apply_policy_mutation(&base, mutation);
        let result = decide_packet_envelope_policy_v1(&packet, evaluated_at);
        if let Some(expected_error) = test_case["expected_error"].as_str() {
            assert_eq!(
                result.expect_err("policy case must fail").code(),
                expected_error,
                "{case_id}"
            );
        } else {
            assert_policy_case(&result.expect("policy case must pass"), test_case, case_id);
        }
    }
    assert_eq!(cases.len(), 13, "all shared policy cases must run");

    let golden = &policy_fixture["vectors"][0];
    let decision = decide_packet_envelope_policy_v1(
        &base,
        golden["evaluated_at"]
            .as_str()
            .expect("golden evaluation time"),
    )
    .expect("golden policy vector must evaluate");
    assert_eq!(
        decision.decision_id,
        golden["expected"]["decision_id"]
            .as_str()
            .expect("golden decision id")
    );
    assert_eq!(
        decision.packet_ref.packet_hash,
        golden["expected"]["packet_hash"]
            .as_str()
            .expect("golden packet hash")
    );
}

#[test]
fn shared_approval_golden_vector_matches_rust() {
    let packet_fixture: Value =
        serde_json::from_str(PACKET_ENVELOPE_FIXTURES).expect("packet fixture must be JSON");
    let approval_fixture: Value =
        serde_json::from_str(APPROVAL_EVIDENCE_FIXTURES).expect("approval fixture must be JSON");
    let vector = &approval_fixture["vectors"][0];
    let mut packet_value = packet_fixture["vectors"][0]["packet"].clone();
    packet_value["permission_envelope"]["allow"] = serde_json::json!(["deploy.request"]);
    let encoded = serde_json::to_vec(&packet_value).expect("approval packet must serialize");
    let packet = parse_packet_envelope_v1(&encoded).expect("approval packet must parse");
    let policy = decide_packet_envelope_policy_v1(
        &packet,
        vector["policy_evaluated_at"]
            .as_str()
            .expect("policy evaluation time"),
    )
    .expect("approval policy must evaluate");
    let request = create_approval_request_v1(
        &policy,
        vector["requested_at"]
            .as_str()
            .expect("request time must be a string"),
    )
    .expect("approval request must validate");
    let input = ApprovalDecisionV1Input {
        approver_ref: vector["approver_ref"]
            .as_str()
            .expect("approver ref")
            .to_owned(),
        approver_session_ref: vector["approver_session_ref"]
            .as_str()
            .expect("approver session ref")
            .to_owned(),
        decision: ApprovalDecisionV1Kind::Approved,
        reason: ApprovalDecisionV1Reason::OperatorApproved,
        decided_at: vector["decided_at"]
            .as_str()
            .expect("decision time")
            .to_owned(),
    };
    let decision =
        decide_approval_request_v1(&request, &input).expect("approval decision must validate");

    assert_eq!(
        request.approval_request_id,
        vector["expected"]["approval_request_id"]
            .as_str()
            .expect("approval request id")
    );
    assert_eq!(
        decision.approval_decision_id,
        vector["expected"]["approval_decision_id"]
            .as_str()
            .expect("approval decision id")
    );
    assert!(decision.approval_gate_satisfied);
    assert!(!decision.execution_authorized);
    assert_approval_validation_cases(&packet_fixture, &approval_fixture);
}

#[test]
fn shared_signed_approval_vectors_match_rust() {
    let jsonl_vectors: Vec<Value> = SIGNED_APPROVAL_EVIDENCE_JSONL_FIXTURES
        .lines()
        .map(|line| serde_json::from_str(line).expect("JSONL vector must parse"))
        .collect();
    assert_eq!(jsonl_vectors.len(), 26);
    let first = &jsonl_vectors[0];
    assert_eq!(
        first["schema"],
        "lnsat.signed_approval_evidence.conformance_vectors.v1_0"
    );
    assert_eq!(first["provenance"]["private_material_included"], false);
    assert_eq!(first["provenance"]["runtime_signing_performed"], false);
    assert_eq!(
        first["provenance"]["production_signature_verification_performed"],
        false
    );
    let fixture_error_codes: Vec<_> = first["provenance"]["error_codes"]
        .as_array()
        .expect("error taxonomy")
        .iter()
        .map(|value| value.as_str().expect("error code"))
        .collect();
    let rust_error_codes: Vec<_> = SignedApprovalVerificationV1Error::ALL
        .iter()
        .map(|error| error.code())
        .collect();
    assert_eq!(rust_error_codes, fixture_error_codes);

    let vectors = &jsonl_vectors[..20];
    assert_eq!(vectors.len(), 20);

    for vector in vectors {
        assert_signed_approval_vector(vector);
    }

    let operational_errors: Vec<_> = jsonl_vectors[20..]
        .iter()
        .map(|item| {
            item["expected_result"]["errors"][0]["code"]
                .as_str()
                .expect("expected error")
        })
        .collect();
    assert_eq!(
        operational_errors,
        [
            SignedApprovalVerificationV1Error::NonceReplayed.code(),
            SignedApprovalVerificationV1Error::KeyRevoked.code(),
            SignedApprovalVerificationV1Error::RequesterSessionRevoked.code(),
            SignedApprovalVerificationV1Error::ApproverSessionRevoked.code(),
            SignedApprovalVerificationV1Error::PolicyRevoked.code(),
            SignedApprovalVerificationV1Error::ApprovalRevoked.code(),
        ]
    );
}

#[test]
fn shared_ed25519_verification_vectors_match_rust() {
    let vectors: Vec<Value> = ED25519_VERIFICATION_JSONL_FIXTURES
        .lines()
        .map(|line| serde_json::from_str(line).expect("Ed25519 JSONL vector must parse"))
        .collect();
    assert_eq!(vectors.len(), 28);
    assert_eq!(
        vectors
            .iter()
            .filter(|vector| vector["expected_result"] == "accepted")
            .count(),
        4
    );
    assert_eq!(
        vectors
            .iter()
            .filter(|vector| vector["expected_result"] == "rejected")
            .count(),
        24
    );

    for vector in &vectors {
        let object = vector
            .as_object()
            .expect("Ed25519 vector must be an object");
        assert_eq!(
            object.len(),
            8,
            "fixture carries only approved public fields"
        );
        let case_id = vector["case_id"].as_str().expect("case id");
        let result = verify_ed25519_signature_primitive_v1(
            vector["public_key"].as_str().expect("public key"),
            vector["message"].as_str().expect("message"),
            vector["signature"].as_str().expect("signature"),
        );
        assert_eq!(
            result.accepted,
            vector["expected_result"] == "accepted",
            "{case_id}"
        );
        assert_eq!(
            result.rejection_class.as_str(),
            vector["rejection_class"].as_str().expect("rejection class"),
            "{case_id}"
        );
    }

    let positive = &vectors[0];
    let message_rejection = verify_ed25519_signature_primitive_v1(
        positive["public_key"].as_str().expect("public key"),
        "=",
        positive["signature"].as_str().expect("signature"),
    );
    assert!(!message_rejection.accepted);
    assert_eq!(
        message_rejection.rejection_class.as_str(),
        "message_encoding"
    );
    let oversized_message = "A".repeat(1_398_103);
    let oversized_rejection = verify_ed25519_signature_primitive_v1(
        positive["public_key"].as_str().expect("public key"),
        &oversized_message,
        positive["signature"].as_str().expect("signature"),
    );
    assert!(!oversized_rejection.accepted);
    assert_eq!(
        oversized_rejection.rejection_class.as_str(),
        "message_encoding"
    );
}

fn assert_signed_approval_vector(vector: &Value) {
    let case_id = vector["case_id"].as_str().expect("case id");
    let raw = vector["raw_evidence_json"]
        .as_str()
        .expect("raw evidence JSON");
    let expected = vector["expected_validation"]
        .as_str()
        .expect("expected validation");
    let result =
        parse_signed_approval_evidence_v1(raw.as_bytes(), Some(&vector["verification_material"]));
    let actual = match &result {
        Ok(_) => "ok",
        Err(error) => error.code(),
    };
    assert_eq!(actual, expected, "{case_id}");
    assert_eq!(
        vector["expected_result"]["execution_authorized"], false,
        "{case_id}"
    );
    assert_eq!(
        vector["expected_result"]["session_authority_state_changed"], false,
        "{case_id}"
    );
    assert_eq!(
        vector["expected_result"]["mutation_authority"], false,
        "{case_id}"
    );
    assert_eq!(
        vector["expected_result"]["side_effects"],
        serde_json::json!([]),
        "{case_id}"
    );
    if let Ok(validation) = result {
        assert_eq!(
            validation.canonical_payload_base64url,
            vector["expected_canonical_payload_base64url"]
                .as_str()
                .expect("canonical payload")
        );
        assert_eq!(
            validation.preimage_base64url,
            vector["expected_preimage_base64url"]
                .as_str()
                .expect("preimage")
        );
        assert_eq!(
            validation.payload_digest,
            vector["expected_payload_digest"]
                .as_str()
                .expect("payload digest")
        );
        assert_eq!(
            validation.signed_approval_evidence_id,
            vector["expected_evidence_id"]
                .as_str()
                .expect("evidence id")
        );
        assert!(validation.evidence.payload.approval_gate_satisfied);
        assert!(validation.evidence.payload.server_signed);
        assert!(!validation.evidence.payload.execution_authorized);
        assert!(!validation.evidence.payload.session_authority_state_changed);
        assert!(!validation.evidence.payload.mutation_authority);
    }
}

#[test]
fn signed_approval_parser_rejects_hostile_bounds() {
    let oversized = vec![b' '; 1_048_577];
    assert_eq!(
        parse_signed_approval_evidence_v1(&oversized, None),
        Err(SignedApprovalVerificationV1Error::InputTooLarge)
    );
    let deep = format!("{}null{}", "[".repeat(66), "]".repeat(66));
    assert_eq!(
        parse_signed_approval_evidence_v1(deep.as_bytes(), None),
        Err(SignedApprovalVerificationV1Error::InputTooDeep)
    );
    let hostile_depth = format!("{}null{}", "[".repeat(20_000), "]".repeat(20_000));
    assert_eq!(
        parse_signed_approval_evidence_v1(hostile_depth.as_bytes(), None),
        Err(SignedApprovalVerificationV1Error::InputTooDeep)
    );
}

#[test]
fn shared_audit_evidence_matches_rust() {
    let packet_fixture: Value =
        serde_json::from_str(PACKET_ENVELOPE_FIXTURES).expect("packet fixture must be JSON");
    let audit_fixture: Value =
        serde_json::from_str(AUDIT_EVENT_FIXTURES).expect("audit fixture must be JSON");
    let chain = audit_chain(&packet_fixture);
    let vectors = audit_fixture["vectors"]
        .as_array()
        .expect("audit vectors must be an array");

    for vector in vectors {
        let case_id = vector["case_id"].as_str().expect("audit case id");
        let event_type = vector["event_type"].as_str().expect("audit event type");
        let input = audit_input(event_type, &chain);
        let event = create_audit_event_v1(
            &input,
            vector["observed_at"].as_str().expect("observation time"),
        )
        .expect("golden audit event must validate");
        assert_eq!(
            event.event_id,
            vector["expected_event_id"].as_str().expect("event id"),
            "{case_id}"
        );
        assert_eq!(
            event.source_evidence_hash,
            vector["expected_source_evidence_hash"]
                .as_str()
                .expect("source evidence hash"),
            "{case_id}"
        );
        assert_eq!(
            event.result_status.as_str(),
            vector["expected_result_status"]
                .as_str()
                .expect("result status"),
            "{case_id}"
        );
        assert!(!event.authenticated_provenance, "{case_id}");
        assert!(!event.persistence_requested, "{case_id}");
        assert!(!event.execution_authorized, "{case_id}");
        assert!(event.side_effects.is_empty(), "{case_id}");
    }
    assert_eq!(vectors.len(), 3, "all audit golden vectors must run");

    let cases = audit_fixture["validation_cases"]
        .as_array()
        .expect("audit validation cases must be an array");
    for test_case in cases {
        let case_id = test_case["case_id"].as_str().expect("audit case id");
        let event_type = test_case["event_type"].as_str().expect("audit event type");
        let mutation = test_case["mutation"].as_str().expect("audit mutation");
        let mut input = audit_input(event_type, &chain);
        apply_audit_mutation(&mut input, mutation);
        let result = create_audit_event_v1(
            &input,
            test_case["observed_at"].as_str().expect("observation time"),
        );
        let actual = result.as_ref().map_or_else(|error| error.code(), |_| "ok");
        assert_eq!(
            actual,
            test_case["expected"]
                .as_str()
                .expect("expected audit result"),
            "{case_id}"
        );
    }
    assert_eq!(cases.len(), 9, "all shared audit cases must run");
}

#[test]
fn shared_audit_idempotency_matches_rust() {
    let fixture: Value = serde_json::from_str(AUDIT_IDEMPOTENCY_FIXTURES)
        .expect("audit idempotency fixture must be JSON");
    let candidate = idempotency_ref(&fixture["candidate"]);
    let unrelated = idempotency_ref(&fixture["unrelated_prior"]);
    let cases = fixture["cases"]
        .as_array()
        .expect("idempotency cases must be an array");

    for test_case in cases {
        let case_id = test_case["case_id"].as_str().expect("case id");
        let mutation = test_case["mutation"].as_str().expect("mutation");
        let (prior_state, candidate) = idempotency_case_input(mutation, &candidate, &unrelated);
        let result = evaluate_audit_event_idempotency_v1(&prior_state, &candidate);
        let actual = result
            .as_ref()
            .map_or_else(|error| error.code(), |decision| decision.outcome.as_str());
        assert_eq!(
            actual,
            test_case["expected"].as_str().expect("expected outcome"),
            "{case_id}"
        );
        if let Ok(decision) = result {
            assert!(!decision.write_performed, "{case_id}");
            assert!(decision.side_effects.is_empty(), "{case_id}");
        }
    }
    assert_eq!(cases.len(), 7, "all shared idempotency cases must run");
}

struct AuditChain {
    packet: PacketEnvelopeV1,
    policy: PolicyDecisionV1,
    request: ApprovalRequestV1,
    decision: ApprovalDecisionV1,
}

fn idempotency_ref(value: &Value) -> AuditEventIdempotencyRefV1 {
    AuditEventIdempotencyRefV1 {
        idempotency_key: value["idempotency_key"]
            .as_str()
            .expect("idempotency key")
            .to_owned(),
        event_id: value["event_id"].as_str().expect("event id").to_owned(),
    }
}

fn idempotency_case_input(
    mutation: &str,
    candidate: &AuditEventIdempotencyRefV1,
    unrelated: &AuditEventIdempotencyRefV1,
) -> (Vec<AuditEventIdempotencyRefV1>, AuditEventIdempotencyRefV1) {
    match mutation {
        "none" => (vec![], candidate.clone()),
        "unrelated_prior" => (vec![unrelated.clone()], candidate.clone()),
        "exact_replay" => (vec![candidate.clone()], candidate.clone()),
        "collision" => (
            vec![AuditEventIdempotencyRefV1 {
                event_id: format!("aud_{}", "c".repeat(64)),
                ..candidate.clone()
            }],
            candidate.clone(),
        ),
        "duplicate_prior" => (
            vec![unrelated.clone(), unrelated.clone()],
            candidate.clone(),
        ),
        "invalid_prior" => (
            vec![AuditEventIdempotencyRefV1 {
                event_id: "aud_invalid".to_owned(),
                ..unrelated.clone()
            }],
            candidate.clone(),
        ),
        "invalid_candidate" => (
            vec![],
            AuditEventIdempotencyRefV1 {
                idempotency_key: "audit:invalid".to_owned(),
                ..candidate.clone()
            },
        ),
        _ => panic!("unknown idempotency mutation: {mutation}"),
    }
}

fn audit_chain(packet_fixture: &Value) -> AuditChain {
    let mut value = packet_fixture["vectors"][0]["packet"].clone();
    value["permission_envelope"]["allow"] = serde_json::json!(["deploy.request"]);
    let encoded = serde_json::to_vec(&value).expect("audit packet must serialize");
    let packet = parse_packet_envelope_v1(&encoded).expect("audit packet must parse");
    let policy = decide_packet_envelope_policy_v1(&packet, "2026-07-22T20:00:00Z")
        .expect("audit policy must evaluate");
    let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
        .expect("audit request must validate");
    let decision = decide_approval_request_v1(
        &request,
        &ApprovalDecisionV1Input {
            approver_ref: "identity:human:owner".to_owned(),
            approver_session_ref: "session:local:owner-0001".to_owned(),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: "2026-07-22T20:02:00Z".to_owned(),
        },
    )
    .expect("audit decision must validate");
    AuditChain {
        packet,
        policy,
        request,
        decision,
    }
}

fn audit_input(event_type: &str, chain: &AuditChain) -> AuditEventV1Input {
    match event_type {
        "policy.decision_recorded" => AuditEventV1Input::PolicyDecision {
            packet: Box::new(chain.packet.clone()),
            policy_decision: Box::new(chain.policy.clone()),
        },
        "approval.request_recorded" => AuditEventV1Input::ApprovalRequest {
            packet: Box::new(chain.packet.clone()),
            policy_decision: Box::new(chain.policy.clone()),
            approval_request: Box::new(chain.request.clone()),
        },
        "approval.decision_recorded" => AuditEventV1Input::ApprovalDecision {
            packet: Box::new(chain.packet.clone()),
            policy_decision: Box::new(chain.policy.clone()),
            approval_request: Box::new(chain.request.clone()),
            approval_decision: Box::new(chain.decision.clone()),
        },
        _ => panic!("unknown audit event type: {event_type}"),
    }
}

fn apply_audit_mutation(input: &mut AuditEventV1Input, mutation: &str) {
    match mutation {
        "none" => {}
        "tamper_packet" => match input {
            AuditEventV1Input::PolicyDecision { packet, .. }
            | AuditEventV1Input::ApprovalRequest { packet, .. }
            | AuditEventV1Input::ApprovalDecision { packet, .. } => packet.risk_level = 4,
        },
        "tamper_policy" => match input {
            AuditEventV1Input::PolicyDecision {
                policy_decision, ..
            }
            | AuditEventV1Input::ApprovalRequest {
                policy_decision, ..
            }
            | AuditEventV1Input::ApprovalDecision {
                policy_decision, ..
            } => policy_decision.risk_level = 4,
        },
        "tamper_request" => match input {
            AuditEventV1Input::ApprovalRequest {
                approval_request, ..
            }
            | AuditEventV1Input::ApprovalDecision {
                approval_request, ..
            } => "project:other".clone_into(&mut approval_request.project_ref),
            AuditEventV1Input::PolicyDecision { .. } => {
                panic!("request mutation requires approval evidence")
            }
        },
        "tamper_decision" => match input {
            AuditEventV1Input::ApprovalDecision {
                approval_decision, ..
            } => approval_decision.approval_decision_id = format!("apd_{}", "0".repeat(64)),
            _ => panic!("decision mutation requires decision evidence"),
        },
        _ => panic!("unknown audit mutation: {mutation}"),
    }
}

fn assert_approval_validation_cases(packet_fixture: &Value, approval_fixture: &Value) {
    let cases = approval_fixture["validation_cases"]
        .as_array()
        .expect("approval validation cases must be an array");
    for test_case in cases {
        let case_id = test_case["case_id"]
            .as_str()
            .expect("approval case id must be a string");
        let stage = test_case["stage"]
            .as_str()
            .expect("approval case stage must be a string");
        let mutation = test_case["mutation"]
            .as_str()
            .expect("approval mutation must be a string");
        let outcome = if stage == "request" {
            run_approval_request_case(packet_fixture, mutation)
        } else {
            run_approval_decision_case(packet_fixture, mutation)
        };
        assert_eq!(
            outcome.code,
            test_case["expected"]
                .as_str()
                .expect("expected approval result"),
            "{case_id}"
        );
        if outcome.code == "ok" {
            assert_eq!(
                outcome
                    .decision
                    .expect("successful decision case must return a decision")
                    .as_str(),
                test_case["expected_decision"]
                    .as_str()
                    .expect("expected decision"),
                "{case_id}"
            );
            assert_eq!(
                outcome
                    .reason
                    .expect("successful decision case must return a reason")
                    .code(),
                test_case["expected_reason"]
                    .as_str()
                    .expect("expected decision reason"),
                "{case_id}"
            );
            assert_eq!(
                outcome.gate_satisfied,
                test_case["expected_gate_satisfied"]
                    .as_bool()
                    .expect("expected gate state"),
                "{case_id}"
            );
        }
    }
    assert_eq!(cases.len(), 14, "all shared approval cases must run");
}

struct ApprovalCaseOutcome {
    code: &'static str,
    decision: Option<ApprovalDecisionV1Kind>,
    reason: Option<ApprovalDecisionV1Reason>,
    gate_satisfied: bool,
}

fn run_approval_request_case(packet_fixture: &Value, mutation: &str) -> ApprovalCaseOutcome {
    let mut policy = if mutation == "use_allow_policy" {
        policy_from_packet_fixture(packet_fixture, "identity:agent:codex", "tests.run.sandbox")
    } else {
        policy_from_packet_fixture(packet_fixture, "identity:agent:codex", "deploy.request")
    };
    let mut requested_at = "2026-07-22T20:01:00Z";
    match mutation {
        "use_allow_policy" => {}
        "tamper_policy_id" => policy.decision_id = format!("pol_{}", "0".repeat(64)),
        "tamper_policy_risk" => policy.risk_level = 6,
        "malformed_request_time" => requested_at = "2026-02-31T00:00:00Z",
        "early_request_time" => requested_at = "2026-07-22T19:59:59Z",
        "expired_request_time" => requested_at = &policy.expires_at,
        _ => panic!("unknown request approval mutation: {mutation}"),
    }
    match create_approval_request_v1(&policy, requested_at) {
        Ok(_) => ApprovalCaseOutcome {
            code: "ok",
            decision: None,
            reason: None,
            gate_satisfied: false,
        },
        Err(error) => error_outcome(error),
    }
}

fn run_approval_decision_case(packet_fixture: &Value, mutation: &str) -> ApprovalCaseOutcome {
    let actor = if mutation == "self_approval" {
        "identity:human:owner"
    } else {
        "identity:agent:codex"
    };
    let policy = policy_from_packet_fixture(packet_fixture, actor, "deploy.request");
    let mut request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
        .expect("decision case request must validate");
    let mut input = ApprovalDecisionV1Input {
        approver_ref: "identity:human:owner".to_owned(),
        approver_session_ref: "session:local:owner-0001".to_owned(),
        decision: ApprovalDecisionV1Kind::Approved,
        reason: ApprovalDecisionV1Reason::OperatorApproved,
        decided_at: "2026-07-22T20:02:00Z".to_owned(),
    };
    match mutation {
        "deny_scope" => {
            input.decision = ApprovalDecisionV1Kind::Denied;
            input.reason = ApprovalDecisionV1Reason::ScopeRejected;
        }
        "nonhuman_approver" => {
            "identity:agent:reviewer".clone_into(&mut input.approver_ref);
        }
        "self_approval" => {}
        "mismatched_reason" => input.reason = ApprovalDecisionV1Reason::ScopeRejected,
        "early_decision_time" => {
            "2026-07-22T20:00:59Z".clone_into(&mut input.decided_at);
        }
        "expired_decision_time" => input.decided_at.clone_from(&request.expires_at),
        "tamper_request_id" => request.approval_request_id = format!("apr_{}", "0".repeat(64)),
        "tamper_request_project" => {
            "project:other".clone_into(&mut request.project_ref);
        }
        _ => panic!("unknown decision approval mutation: {mutation}"),
    }
    match decide_approval_request_v1(&request, &input) {
        Ok(decision) => ApprovalCaseOutcome {
            code: "ok",
            decision: Some(decision.decision),
            reason: Some(decision.reason),
            gate_satisfied: decision.approval_gate_satisfied,
        },
        Err(error) => error_outcome(error),
    }
}

fn policy_from_packet_fixture(
    packet_fixture: &Value,
    actor_ref: &str,
    capability: &str,
) -> PolicyDecisionV1 {
    let mut value = packet_fixture["vectors"][0]["packet"].clone();
    value["actor_ref"] = Value::String(actor_ref.to_owned());
    value["permission_envelope"]["allow"] = serde_json::json!([capability]);
    let encoded = serde_json::to_vec(&value).expect("approval packet must serialize");
    let packet = parse_packet_envelope_v1(&encoded).expect("approval packet must parse");
    decide_packet_envelope_policy_v1(&packet, &packet.created_at)
        .expect("approval policy must evaluate")
}

const fn error_outcome(error: ApprovalEvidenceV1Error) -> ApprovalCaseOutcome {
    ApprovalCaseOutcome {
        code: error.code(),
        decision: None,
        reason: None,
        gate_satisfied: false,
    }
}

fn assert_policy_case(
    decision: &lnsat_contracts::PolicyDecisionV1,
    test_case: &Value,
    case_id: &str,
) {
    let expected = &test_case["expected"];
    assert_eq!(
        decision.decision.as_str(),
        expected["decision"].as_str().expect("expected decision"),
        "{case_id}"
    );
    assert_eq!(
        decision.requires_approval,
        expected["requires_approval"]
            .as_bool()
            .expect("expected approval flag"),
        "{case_id}"
    );
    let actual_reasons: Vec<_> = decision
        .reason_codes
        .iter()
        .map(|reason| reason.code())
        .collect();
    let expected_reasons: Vec<_> = expected["reason_codes"]
        .as_array()
        .expect("expected reasons")
        .iter()
        .map(|reason| reason.as_str().expect("expected reason"))
        .collect();
    assert_eq!(actual_reasons, expected_reasons, "{case_id}");

    let expected_capabilities = expected["capability_decisions"]
        .as_array()
        .expect("expected capability decisions");
    assert_eq!(
        decision.capability_decisions.len(),
        expected_capabilities.len(),
        "{case_id}"
    );
    for (actual, expected) in decision
        .capability_decisions
        .iter()
        .zip(expected_capabilities)
    {
        assert_eq!(
            actual.capability,
            expected["capability"].as_str().expect("capability"),
            "{case_id}"
        );
        assert_eq!(
            actual.decision.as_str(),
            expected["decision"].as_str().expect("capability decision"),
            "{case_id}"
        );
        assert_eq!(
            actual
                .reason
                .map(lnsat_contracts::PolicyDecisionV1Reason::code),
            expected["reason_code"].as_str(),
            "{case_id}"
        );
    }
}

fn apply_policy_mutation(
    base: &lnsat_contracts::PacketEnvelopeV1,
    mutation: &str,
) -> lnsat_contracts::PacketEnvelopeV1 {
    let mut packet = base.clone();
    match mutation {
        "none" => {}
        "set_unsupported_profile" => {
            "policy:unknown".clone_into(&mut packet.policy_profile_ref);
        }
        "set_forbidden_capability" => packet.permission_allow = vec!["root".to_owned()],
        "set_unknown_capability" => packet.permission_allow = vec!["teleport.execute".to_owned()],
        "clear_capabilities" => packet.permission_allow.clear(),
        "set_requires_approval" => packet.requires_approval = true,
        "set_risk_threshold" => packet.risk_level = 5,
        "set_approval_capability" => packet.permission_allow = vec!["deploy.request".to_owned()],
        "set_denial_and_approval" => {
            packet.permission_allow = vec!["root".to_owned()];
            packet.requires_approval = true;
            packet.risk_level = 6;
        }
        "set_invalid_created_at" => {
            "2026-02-31T00:00:00Z".clone_into(&mut packet.created_at);
        }
        _ => panic!("unknown policy fixture mutation: {mutation}"),
    }
    packet
}

fn packet_validation_input(base: &Value, mutation: &str) -> Vec<u8> {
    if mutation == "malformed_json" {
        return br#"{"contract_version":"#.to_vec();
    }
    if mutation == "root_array" {
        return b"[]".to_vec();
    }
    if mutation == "set_risk_integral_decimal" {
        return serde_json::to_string(base)
            .expect("base packet must serialize")
            .replace("\"risk_level\":3", "\"risk_level\":3.0")
            .into_bytes();
    }
    if mutation == "set_constraint_negative_zero" {
        return serde_json::to_string(base)
            .expect("base packet must serialize")
            .replace(
                "\"constraints\":{",
                "\"constraints\":{\"negative_zero\":-0,",
            )
            .into_bytes();
    }

    let mut packet = base.clone();
    let object = packet
        .as_object_mut()
        .expect("base packet fixture must be an object");
    if apply_permission_mutation(object, mutation) {
        return serde_json::to_vec(&packet).expect("mutated packet fixture must serialize");
    }
    match mutation {
        "none" => {}
        "add_unknown_root_field" => {
            object.insert("unexpected".to_owned(), Value::Bool(true));
        }
        "remove_schema_id" => {
            object.remove("schema_id");
        }
        "set_contract_v1_1" => {
            object.insert(
                "contract_version".to_owned(),
                Value::String("lnsat.contracts.v1_1".to_owned()),
            );
        }
        "set_contract_number" => {
            object.insert("contract_version".to_owned(), Value::from(1));
        }
        "set_schema_v0_1" => {
            object.insert(
                "schema_id".to_owned(),
                Value::String("lnsat.packet_envelope.schema.v0_1".to_owned()),
            );
        }
        "set_risk_string" => {
            object.insert("risk_level".to_owned(), Value::String("3".to_owned()));
        }
        "set_constraint_fractional_number" => {
            object
                .get_mut("constraints")
                .and_then(Value::as_object_mut)
                .expect("constraints must be an object")
                .insert(
                    "fractional".to_owned(),
                    Value::Number(
                        serde_json::Number::from_f64(1.5)
                            .expect("finite number must be representable"),
                    ),
                );
        }
        "set_created_at_invalid_calendar" => {
            object.insert(
                "created_at".to_owned(),
                Value::String("2026-02-31T00:00:00Z".to_owned()),
            );
        }
        "set_expires_equal_created" => {
            let created_at = object["created_at"].clone();
            object.insert("expires_at".to_owned(), created_at);
        }
        "set_constraint_unsafe_integer" => {
            object
                .get_mut("constraints")
                .and_then(Value::as_object_mut)
                .expect("constraints must be an object")
                .insert("unsafe".to_owned(), Value::from(9_007_199_254_740_992_u64));
        }
        _ => panic!("unknown packet fixture mutation: {mutation}"),
    }
    serde_json::to_vec(&packet).expect("mutated packet fixture must serialize")
}

fn apply_permission_mutation(object: &mut serde_json::Map<String, Value>, mutation: &str) -> bool {
    let permission = object
        .get_mut("permission_envelope")
        .and_then(Value::as_object_mut)
        .expect("permission envelope must be an object");
    match mutation {
        "set_permission_allow_string" => {
            permission.insert(
                "allow".to_owned(),
                Value::String("tests.run.sandbox".to_owned()),
            );
        }
        "set_permission_leading_digit" => {
            permission["allow"] = serde_json::json!(["1tests.run"]);
        }
        "set_permission_allow_unsorted" => {
            permission["allow"] = serde_json::json!(["tests.write", "tests.read"]);
        }
        "set_permission_block_duplicate" => {
            permission["block"] = serde_json::json!(["network.open", "network.open"]);
        }
        "set_permission_allow_block_conflict" => {
            permission["allow"] = serde_json::json!(["network.open"]);
        }
        _ => return false,
    }
    true
}

fn output_prefix(case_id: &str) -> &'static str {
    match case_id {
        "packet_envelope_hash" => "sha256:",
        "policy_decision_id" => "pol_",
        "approval_request_id" => "apr_",
        "approval_decision_id" => "apd_",
        "audit_event_id" => "aud_",
        _ => panic!("unknown stable evidence digest case: {case_id}"),
    }
}

fn lowercase_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        write!(&mut output, "{byte:02x}").expect("writing to String cannot fail");
    }
    output
}

fn sha256(input: &[u8]) -> [u8; 32] {
    let mut state = [
        0x6a09_e667_u32,
        0xbb67_ae85,
        0x3c6e_f372,
        0xa54f_f53a,
        0x510e_527f,
        0x9b05_688c,
        0x1f83_d9ab,
        0x5be0_cd19,
    ];
    let input_length = u64::try_from(input.len()).expect("fixture preimage length must fit u64");
    let mut message = input.to_vec();
    message.push(0x80);
    while message.len() % 64 != 56 {
        message.push(0);
    }
    message.extend_from_slice(&(input_length * 8).to_be_bytes());

    for chunk in message.chunks_exact(64) {
        let mut schedule = [0_u32; 64];
        for (index, word) in schedule[..16].iter_mut().enumerate() {
            let offset = index * 4;
            *word = u32::from_be_bytes(
                chunk[offset..offset + 4]
                    .try_into()
                    .expect("SHA-256 chunk words are four bytes"),
            );
        }
        for index in 16..64 {
            let sigma_zero = schedule[index - 15].rotate_right(7)
                ^ schedule[index - 15].rotate_right(18)
                ^ (schedule[index - 15] >> 3);
            let sigma_one = schedule[index - 2].rotate_right(17)
                ^ schedule[index - 2].rotate_right(19)
                ^ (schedule[index - 2] >> 10);
            schedule[index] = schedule[index - 16]
                .wrapping_add(sigma_zero)
                .wrapping_add(schedule[index - 7])
                .wrapping_add(sigma_one);
        }

        let mut state_a = state[0];
        let mut state_b = state[1];
        let mut state_c = state[2];
        let mut state_d = state[3];
        let mut state_e = state[4];
        let mut state_f = state[5];
        let mut state_g = state[6];
        let mut state_h = state[7];

        for index in 0..64 {
            let upper_sigma_one =
                state_e.rotate_right(6) ^ state_e.rotate_right(11) ^ state_e.rotate_right(25);
            let choose = (state_e & state_f) ^ (!state_e & state_g);
            let temporary_one = state_h
                .wrapping_add(upper_sigma_one)
                .wrapping_add(choose)
                .wrapping_add(SHA256_ROUND_CONSTANTS[index])
                .wrapping_add(schedule[index]);
            let upper_sigma_zero =
                state_a.rotate_right(2) ^ state_a.rotate_right(13) ^ state_a.rotate_right(22);
            let majority = (state_a & state_b) ^ (state_a & state_c) ^ (state_b & state_c);
            let temporary_two = upper_sigma_zero.wrapping_add(majority);

            state_h = state_g;
            state_g = state_f;
            state_f = state_e;
            state_e = state_d.wrapping_add(temporary_one);
            state_d = state_c;
            state_c = state_b;
            state_b = state_a;
            state_a = temporary_one.wrapping_add(temporary_two);
        }

        state[0] = state[0].wrapping_add(state_a);
        state[1] = state[1].wrapping_add(state_b);
        state[2] = state[2].wrapping_add(state_c);
        state[3] = state[3].wrapping_add(state_d);
        state[4] = state[4].wrapping_add(state_e);
        state[5] = state[5].wrapping_add(state_f);
        state[6] = state[6].wrapping_add(state_g);
        state[7] = state[7].wrapping_add(state_h);
    }

    let mut output = [0_u8; 32];
    for (index, word) in state.iter().enumerate() {
        output[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    output
}
