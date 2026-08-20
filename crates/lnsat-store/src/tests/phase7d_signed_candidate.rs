use super::*;

const PHASE7D_PUBLIC_MATERIAL_CANDIDATE_VERSION: i64 = 18;
const PHASE7D_PUBLIC_MATERIAL_CANDIDATE_SQL: &str =
    include_str!("../../tests/fixtures/phase7d_public_material_schema_candidate.sql");
const PHASE7D_MATERIAL_DIGEST_DOMAIN: &str = "lnsat.phase7d.verification-material.v1";
const PHASE7D_STATUS_DIGEST_DOMAIN: &str = "lnsat.phase7d.key-status-event.v1";
const PHASE7D_NONCE_IDENTITY_DIGEST_DOMAIN: &str = "lnsat.phase7d.nonce-identity.v1";
const PHASE7D_NONCE_EVENT_DIGEST_DOMAIN: &str = "lnsat.phase7d.nonce-event.v1";
const PHASE7D_SIGNED_EVIDENCE_DIGEST_DOMAIN: &str = "lnsat.phase7d.signed-approval-evidence.v1";
const PHASE7D_EVIDENCE_ISSUE_REQUEST_DIGEST_DOMAIN: &str =
    "lnsat.phase7d.evidence-issue-request.v1";
const PHASE7D_VERIFICATION_PROJECT_SCOPE_DIGEST_DOMAIN: &str =
    "lnsat.phase7d.verification-project-scope.v1";
const PHASE7D_VERIFICATION_INPUT_DIGEST_DOMAIN: &str = "lnsat.phase7d.verification-input.v1";
const PHASE7D_VERIFICATION_ATTEMPT_DIGEST_DOMAIN: &str = "lnsat.phase7d.verification-attempt.v1";
const PHASE7D_AUTHORIZATION_DIGEST_DOMAIN: &str = "lnsat.phase7d.authorization-bundle.v1";
const PHASE7D_NONCE_CONSUMPTION_DIGEST_DOMAIN: &str = "lnsat.phase7d.nonce-consumption.v1";
const PHASE7D_NONCE_CONSUME_REQUEST_DIGEST_DOMAIN: &str = "lnsat.phase7d.nonce-consume-request.v1";
const PHASE7D_CHAIN_DIGEST_DOMAIN: &str = "lnsat.phase7d.authority-chain.v1";
const PHASE7D_SIGNED_APPROVAL_FIXTURE: &str =
    include_str!("../../../../fixtures/contracts/signed-approval-evidence-v1_0.jsonl");
const PHASE7D_CANDIDATE_TIMESTAMP: &str = "2026-07-27T12:00:00.000Z";
const PHASE7D_VERIFICATION_REJECTION_REASONS: [&str; 34] = [
    "signed_approval.invalid_json",
    "signed_approval.invalid_type",
    "signed_approval.unexpected_field",
    "signed_approval.missing_field",
    "signed_approval.input_too_large",
    "signed_approval.input_too_deep",
    "signed_approval.unsupported_contract",
    "signed_approval.unsupported_schema",
    "signed_approval.unsupported_canonicalization",
    "signed_approval.unsupported_digest",
    "signed_approval.unsupported_signature_profile",
    "signed_approval.invalid_field",
    "signed_approval.invalid_time_window",
    "signed_approval.invalid_nonce",
    "signed_approval.chain_invalid",
    "signed_approval.chain_substitution",
    "signed_approval.payload_digest_mismatch",
    "signed_approval.evidence_id_mismatch",
    "signed_approval.verification_material_unavailable",
    "signed_approval.verification_material_stale",
    "signed_approval.key_unknown",
    "signed_approval.key_version_downgrade",
    "signed_approval.key_inactive",
    "signed_approval.key_retired",
    "signed_approval.key_revoked",
    "signed_approval.signature_malformed",
    "signed_approval.signature_invalid",
    "signed_approval.nonce_replayed",
    "signed_approval.requester_session_revoked",
    "signed_approval.approver_session_revoked",
    "signed_approval.policy_revoked",
    "signed_approval.approval_revoked",
    "signed_approval.evidence_expired",
    "signed_approval.verification_unavailable",
];
const PHASE7D_CANDIDATE_SCHEMA_DEFINITION_SHA256: &str =
    "sha256:1a0bfca3ae2192a981b5c7e752600a03783134eb32c52c114e3bd92db556cc45";
const PHASE7D_PUBLIC_MATERIAL_CANDIDATE: Migration = Migration {
    version: PHASE7D_PUBLIC_MATERIAL_CANDIDATE_VERSION,
    id: "0018_phase7d_public_material_schema_candidate",
    sql: PHASE7D_PUBLIC_MATERIAL_CANDIDATE_SQL,
};

#[derive(Clone)]
struct Phase7dSignedEvidenceFixture {
    packet: PacketEnvelopeV1,
    policy_decision: PolicyDecisionV1,
    approval_request: ApprovalRequestV1,
    approval_decision: ApprovalDecisionV1,
    evidence_id: String,
    project_ref: String,
    decision_id: String,
    material_ref: String,
    nonce_id: String,
    canonical_payload: Vec<u8>,
    payload_digest: Vec<u8>,
    signature: Vec<u8>,
    issued_at: String,
    expires_at: String,
    signing_key_id: String,
    signing_key_version: i64,
    public_spki: Vec<u8>,
}

struct Phase7dStoredSignedEvidence {
    evidence_id: String,
    project_ref: String,
    decision_id: String,
    material_ref: String,
    nonce_id: String,
    canonical_payload: Vec<u8>,
    payload_digest: Vec<u8>,
    signature: Vec<u8>,
    issued_at: String,
    expires_at: String,
    approval_gate_satisfied: i64,
    server_signed: i64,
    execution_authorized: i64,
    session_authority_state_changed: i64,
    mutation_authority: i64,
    authority_sequence: i64,
}

#[derive(Debug, Eq, PartialEq)]
struct Phase7dEvidenceIssueIdempotencyOutcome {
    created: bool,
    evidence_id: String,
}

#[derive(Clone)]
struct Phase7dVerificationAttemptSubject {
    evidence_id: String,
    material_ref: String,
}

struct Phase7dStoredNonceConsumption {
    consumption_id: String,
    project_ref: String,
    nonce_id: String,
    evidence_id: String,
    authorization_ref: String,
    authorization_digest: Vec<u8>,
    consumed_at: String,
    authority_sequence: i64,
}

#[derive(Debug, Eq, PartialEq)]
struct Phase7dNonceConsumeIdempotencyOutcome {
    created: bool,
    consumption_id: String,
}

struct Phase7dStoredNonceConsumeIdempotency {
    project_ref: String,
    request_digest: Vec<u8>,
    consumption_id: String,
    created_at: String,
    nonce_id: String,
    evidence_id: String,
    authorization_ref: String,
    authorization_digest: Vec<u8>,
    consumed_at: String,
}

fn phase7d_encode_domain(encoded: &mut Vec<u8>, domain: &str) {
    encoded.extend_from_slice(domain.as_bytes());
    encoded.push(0);
}

fn phase7d_encode_text(encoded: &mut Vec<u8>, value: &str) {
    let length = u32::try_from(value.len()).expect("candidate text length must fit");
    encoded.extend_from_slice(&length.to_be_bytes());
    encoded.extend_from_slice(value.as_bytes());
}

fn phase7d_encode_integer(encoded: &mut Vec<u8>, value: i64) {
    let value = u64::try_from(value).expect("candidate integer must be positive");
    encoded.extend_from_slice(&value.to_be_bytes());
}

fn phase7d_encode_blob(encoded: &mut Vec<u8>, value: &[u8]) {
    let length = u32::try_from(value.len()).expect("candidate blob length must fit");
    encoded.extend_from_slice(&length.to_be_bytes());
    encoded.extend_from_slice(value);
}

fn phase7d_encode_optional_text(encoded: &mut Vec<u8>, value: Option<&str>) {
    match value {
        Some(value) => {
            encoded.push(1);
            phase7d_encode_text(encoded, value);
        }
        None => encoded.push(0),
    }
}

fn phase7d_encode_optional_blob(encoded: &mut Vec<u8>, value: Option<&[u8]>) {
    match value {
        Some(value) => {
            encoded.push(1);
            phase7d_encode_blob(encoded, value);
        }
        None => encoded.push(0),
    }
}

fn phase7d_digest(encoded: &[u8]) -> Vec<u8> {
    Sha256::digest(encoded).to_vec()
}

fn phase7d_hex_encode(input: &[u8]) -> String {
    let mut encoded = String::with_capacity(input.len() * 2);
    for byte in input {
        write!(&mut encoded, "{byte:02x}").expect("writing candidate hex cannot fail");
    }
    encoded
}

fn phase7d_hex_decode(input: &str) -> Result<Vec<u8>, String> {
    if !input.len().is_multiple_of(2) {
        return Err("candidate hex length mismatch".to_owned());
    }
    input
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let pair = std::str::from_utf8(pair)
                .map_err(|_| "candidate hex encoding mismatch".to_owned())?;
            u8::from_str_radix(pair, 16).map_err(|_| "candidate hex encoding mismatch".to_owned())
        })
        .collect()
}

fn phase7d_valid_idempotency_key(value: &str) -> bool {
    let Some(remainder) = value.strip_prefix("idem_") else {
        return false;
    };
    value.len() >= 13
        && value.len() <= 133
        && remainder.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_lowercase()
                || byte.is_ascii_digit()
                || (index > 0 && matches!(byte, b'_' | b'-'))
        })
}

fn phase7d_valid_idempotency_time(created_at: &str, issued_at: &str) -> bool {
    created_at.len() == 24
        && canonical_utc_timestamp_millis_v1(created_at).is_some_and(|created| {
            canonical_utc_timestamp_millis_v1(issued_at).is_some_and(|issued| created >= issued)
        })
}

fn phase7d_valid_verification_attempt_id(value: &str) -> bool {
    value
        .strip_prefix("vat_")
        .is_some_and(|body| body.len() == 64 && body.bytes().all(|byte| byte.is_ascii_hexdigit()))
        && value.bytes().all(|byte| !byte.is_ascii_uppercase())
}

fn phase7d_valid_verification_result(result_code: &str, reason_code: &str) -> bool {
    if result_code == "verified" {
        return reason_code == "verified";
    }
    result_code == "rejected" && PHASE7D_VERIFICATION_REJECTION_REASONS.contains(&reason_code)
}

fn phase7d_valid_nonce_consumption_id(value: &str) -> bool {
    value.strip_prefix("nsc_").is_some_and(|body| {
        body.len() == 64
            && body
                .bytes()
                .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    })
}

fn phase7d_valid_authorization_ref(value: &str) -> bool {
    if !(5..=240).contains(&value.len()) {
        return false;
    }
    let Some((namespace, identity)) = value.split_once(':') else {
        return false;
    };
    (1..=60).contains(&namespace.len())
        && namespace.bytes().enumerate().all(|(index, byte)| {
            (index == 0 && byte.is_ascii_lowercase())
                || (index > 0
                    && (byte.is_ascii_lowercase()
                        || byte.is_ascii_digit()
                        || matches!(byte, b'_' | b'-')))
        })
        && (3..=180).contains(&identity.len())
        && identity.bytes().all(|byte| {
            byte.is_ascii_lowercase()
                || byte.is_ascii_digit()
                || matches!(byte, b'_' | b'-' | b'.' | b'/' | b':' | b'@' | b'#')
        })
        && identity
            .bytes()
            .next_back()
            .is_some_and(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
}

fn phase7d_base64url_encode(input: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut output = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let first = u32::from(chunk[0]);
        let second = u32::from(*chunk.get(1).unwrap_or(&0));
        let third = u32::from(*chunk.get(2).unwrap_or(&0));
        let combined = (first << 16) | (second << 8) | third;
        output.push(char::from(ALPHABET[((combined >> 18) & 63) as usize]));
        output.push(char::from(ALPHABET[((combined >> 12) & 63) as usize]));
        if chunk.len() > 1 {
            output.push(char::from(ALPHABET[((combined >> 6) & 63) as usize]));
        }
        if chunk.len() > 2 {
            output.push(char::from(ALPHABET[(combined & 63) as usize]));
        }
    }
    output
}

fn phase7d_base64url_decode(input: &str) -> Result<Vec<u8>, String> {
    if input.contains('=') || input.len() % 4 == 1 {
        return Err("candidate base64url encoding mismatch".to_owned());
    }
    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let mut buffer = 0_u32;
    let mut bits = 0_u32;
    for byte in input.bytes() {
        let value = match byte {
            b'A'..=b'Z' => u32::from(byte - b'A'),
            b'a'..=b'z' => u32::from(byte - b'a' + 26),
            b'0'..=b'9' => u32::from(byte - b'0' + 52),
            b'-' => 62,
            b'_' => 63,
            _ => return Err("candidate base64url encoding mismatch".to_owned()),
        };
        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xff) as u8);
        }
    }
    if bits > 0 && buffer & ((1_u32 << bits) - 1) != 0 {
        return Err("candidate base64url pad bits mismatch".to_owned());
    }
    if phase7d_base64url_encode(&output) != input {
        return Err("candidate base64url round trip mismatch".to_owned());
    }
    Ok(output)
}

fn phase7d_material_content_digest(
    material_ref: &str,
    key_id: &str,
    key_version: i64,
    spki_der: &[u8],
    valid_from: &str,
    valid_until: &str,
    supersedes_material_ref: Option<&str>,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_MATERIAL_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, material_ref);
    phase7d_encode_text(&mut encoded, key_id);
    phase7d_encode_integer(&mut encoded, key_version);
    phase7d_encode_text(&mut encoded, "Ed25519");
    phase7d_encode_blob(&mut encoded, spki_der);
    phase7d_encode_text(&mut encoded, valid_from);
    phase7d_encode_text(&mut encoded, valid_until);
    phase7d_encode_optional_text(&mut encoded, supersedes_material_ref);
    phase7d_digest(&encoded)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_status_content_digest(
    status_event_id: &str,
    material_ref: &str,
    revision: i64,
    status: &str,
    effective_at: &str,
    recorded_at: &str,
    reason_code: &str,
    prior_status_event_id: Option<&str>,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_STATUS_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, status_event_id);
    phase7d_encode_text(&mut encoded, material_ref);
    phase7d_encode_integer(&mut encoded, revision);
    phase7d_encode_text(&mut encoded, status);
    phase7d_encode_text(&mut encoded, effective_at);
    phase7d_encode_text(&mut encoded, recorded_at);
    phase7d_encode_text(&mut encoded, reason_code);
    phase7d_encode_optional_text(&mut encoded, prior_status_event_id);
    phase7d_digest(&encoded)
}

fn phase7d_nonce_digest_checked(nonce_id: &str) -> Result<Vec<u8>, String> {
    let Some(body) = nonce_id
        .strip_prefix("nonce_")
        .filter(|body| body.len() == 64)
    else {
        return Err("candidate nonce id format mismatch".to_owned());
    };
    let nonce_bytes = body
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let pair = std::str::from_utf8(pair)
                .map_err(|_| "candidate nonce hex encoding mismatch".to_owned())?;
            u8::from_str_radix(pair, 16)
                .map_err(|_| "candidate nonce hex encoding mismatch".to_owned())
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(phase7d_digest(&nonce_bytes))
}

fn phase7d_nonce_digest(nonce_id: &str) -> Vec<u8> {
    phase7d_nonce_digest_checked(nonce_id).expect("candidate nonce id must be canonical")
}

fn phase7d_nonce_identity_content_digest(
    nonce_id: &str,
    project_ref: &str,
    decision_id: &str,
    nonce_digest: &[u8],
    issued_at: &str,
    expires_at: &str,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_NONCE_IDENTITY_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, nonce_id);
    phase7d_encode_text(&mut encoded, project_ref);
    phase7d_encode_text(&mut encoded, decision_id);
    phase7d_encode_blob(&mut encoded, nonce_digest);
    phase7d_encode_text(&mut encoded, issued_at);
    phase7d_encode_text(&mut encoded, expires_at);
    phase7d_digest(&encoded)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_nonce_event_content_digest(
    nonce_event_id: &str,
    nonce_id: &str,
    revision: i64,
    event_kind: &str,
    effective_at: &str,
    recorded_at: &str,
    prior_nonce_event_id: Option<&str>,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_NONCE_EVENT_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, nonce_event_id);
    phase7d_encode_text(&mut encoded, nonce_id);
    phase7d_encode_integer(&mut encoded, revision);
    phase7d_encode_text(&mut encoded, event_kind);
    phase7d_encode_text(&mut encoded, effective_at);
    phase7d_encode_text(&mut encoded, recorded_at);
    phase7d_encode_optional_text(&mut encoded, prior_nonce_event_id);
    phase7d_digest(&encoded)
}

fn phase7d_signed_evidence_content_digest(evidence: &Phase7dStoredSignedEvidence) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_SIGNED_EVIDENCE_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, &evidence.evidence_id);
    phase7d_encode_text(&mut encoded, &evidence.project_ref);
    phase7d_encode_text(&mut encoded, &evidence.decision_id);
    phase7d_encode_text(&mut encoded, &evidence.material_ref);
    phase7d_encode_text(&mut encoded, &evidence.nonce_id);
    phase7d_encode_blob(&mut encoded, &evidence.canonical_payload);
    phase7d_encode_blob(&mut encoded, &evidence.payload_digest);
    phase7d_encode_blob(&mut encoded, &evidence.signature);
    phase7d_encode_text(&mut encoded, &evidence.issued_at);
    phase7d_encode_text(&mut encoded, &evidence.expires_at);
    phase7d_encode_integer(&mut encoded, evidence.approval_gate_satisfied);
    phase7d_encode_integer(&mut encoded, evidence.server_signed);
    phase7d_encode_integer(&mut encoded, evidence.execution_authorized);
    phase7d_encode_integer(&mut encoded, evidence.session_authority_state_changed);
    phase7d_encode_integer(&mut encoded, evidence.mutation_authority);
    phase7d_digest(&encoded)
}

fn phase7d_evidence_issue_request_digest(project_ref: &str, decision_id: &str) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_EVIDENCE_ISSUE_REQUEST_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, project_ref);
    phase7d_encode_text(&mut encoded, decision_id);
    phase7d_digest(&encoded)
}

fn phase7d_verification_project_scope_digest(project_ref: &str) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(
        &mut encoded,
        PHASE7D_VERIFICATION_PROJECT_SCOPE_DIGEST_DOMAIN,
    );
    phase7d_encode_text(&mut encoded, project_ref);
    phase7d_digest(&encoded)
}

fn phase7d_verification_input_digest(input: &[u8]) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_VERIFICATION_INPUT_DIGEST_DOMAIN);
    phase7d_encode_blob(&mut encoded, input);
    phase7d_digest(&encoded)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_verification_attempt_content_digest(
    attempt_id: &str,
    project_scope_digest: &[u8],
    input_digest: &[u8],
    result_code: &str,
    reason_code: &str,
    observed_at: &str,
    subject: Option<&Phase7dVerificationAttemptSubject>,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_VERIFICATION_ATTEMPT_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, attempt_id);
    phase7d_encode_blob(&mut encoded, project_scope_digest);
    phase7d_encode_blob(&mut encoded, input_digest);
    phase7d_encode_text(&mut encoded, result_code);
    phase7d_encode_text(&mut encoded, reason_code);
    phase7d_encode_text(&mut encoded, observed_at);
    phase7d_encode_optional_text(
        &mut encoded,
        subject.map(|subject| subject.evidence_id.as_str()),
    );
    phase7d_encode_optional_text(
        &mut encoded,
        subject.map(|subject| subject.material_ref.as_str()),
    );
    phase7d_digest(&encoded)
}

fn phase7d_authorization_digest(authorization: &[u8]) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_AUTHORIZATION_DIGEST_DOMAIN);
    phase7d_encode_blob(&mut encoded, authorization);
    phase7d_digest(&encoded)
}

fn phase7d_nonce_consumption_content_digest(
    consumption: &Phase7dStoredNonceConsumption,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_NONCE_CONSUMPTION_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, &consumption.consumption_id);
    phase7d_encode_text(&mut encoded, &consumption.project_ref);
    phase7d_encode_text(&mut encoded, &consumption.nonce_id);
    phase7d_encode_text(&mut encoded, &consumption.evidence_id);
    phase7d_encode_text(&mut encoded, &consumption.authorization_ref);
    phase7d_encode_blob(&mut encoded, &consumption.authorization_digest);
    phase7d_encode_text(&mut encoded, &consumption.consumed_at);
    phase7d_digest(&encoded)
}

fn phase7d_nonce_consume_request_digest(
    project_ref: &str,
    nonce_id: &str,
    evidence_id: &str,
    authorization_ref: &str,
    authorization_digest: &[u8],
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_NONCE_CONSUME_REQUEST_DIGEST_DOMAIN);
    phase7d_encode_text(&mut encoded, project_ref);
    phase7d_encode_text(&mut encoded, nonce_id);
    phase7d_encode_text(&mut encoded, evidence_id);
    phase7d_encode_text(&mut encoded, authorization_ref);
    phase7d_encode_blob(&mut encoded, authorization_digest);
    phase7d_digest(&encoded)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_nonce_consume_idempotency_matches(
    stored: &Phase7dStoredNonceConsumeIdempotency,
    project_ref: &str,
    nonce_id: &str,
    evidence_id: &str,
    authorization_ref: &str,
    authorization_digest: &[u8],
    expected_request_digest: &[u8],
) -> bool {
    stored.project_ref == project_ref
        && stored.nonce_id == nonce_id
        && stored.evidence_id == evidence_id
        && stored.authorization_ref == authorization_ref
        && stored.authorization_digest == authorization_digest
        && stored.request_digest == expected_request_digest
        && stored.request_digest
            == phase7d_nonce_consume_request_digest(
                &stored.project_ref,
                &stored.nonce_id,
                &stored.evidence_id,
                &stored.authorization_ref,
                &stored.authorization_digest,
            )
        && phase7d_valid_idempotency_time(&stored.created_at, &stored.consumed_at)
}

fn phase7d_chain_digest(
    sequence: i64,
    record_family: &str,
    record_id: &str,
    content_digest: &[u8],
    prior_chain_digest: Option<&[u8]>,
) -> Vec<u8> {
    let mut encoded = Vec::new();
    phase7d_encode_domain(&mut encoded, PHASE7D_CHAIN_DIGEST_DOMAIN);
    phase7d_encode_integer(&mut encoded, sequence);
    phase7d_encode_text(&mut encoded, record_family);
    phase7d_encode_text(&mut encoded, record_id);
    phase7d_encode_blob(&mut encoded, content_digest);
    phase7d_encode_optional_blob(&mut encoded, prior_chain_digest);
    phase7d_digest(&encoded)
}

fn phase7d_test_spki(sequence: u64) -> Vec<u8> {
    let mut spki = vec![
        0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
    ];
    spki.extend_from_slice(&Sha256::digest(sequence.to_be_bytes()));
    spki
}

fn phase7d_test_nonce(sequence: u64) -> String {
    format!("nonce_{sequence:064x}")
}

fn phase7d_test_verification_attempt(sequence: u64) -> String {
    format!("vat_{sequence:064x}")
}

fn phase7d_test_nonce_consumption(sequence: u64) -> String {
    format!("nsc_{sequence:064x}")
}

fn phase7d_fixed_timestamp(value: &str) -> String {
    let body = value
        .strip_suffix('Z')
        .expect("candidate fixture timestamp must end in Z");
    assert!(
        !body.contains('.'),
        "candidate fixture timestamp must use whole seconds"
    );
    format!("{body}.000Z")
}

fn phase7d_signed_evidence_fixture() -> Phase7dSignedEvidenceFixture {
    let record: Value = serde_json::from_str(
        PHASE7D_SIGNED_APPROVAL_FIXTURE
            .lines()
            .next()
            .expect("signed approval fixture must contain one record"),
    )
    .expect("signed approval fixture record must parse");
    assert_eq!(
        record["case_id"], "valid_structure_crypto_unavailable",
        "first signed approval fixture case must remain stable"
    );
    let raw_evidence = record["raw_evidence_json"]
        .as_str()
        .expect("signed approval fixture must carry raw evidence");
    let validation = lnsat_contracts::parse_signed_approval_evidence_v1(
        raw_evidence.as_bytes(),
        Some(&record["verification_material"]),
    )
    .expect("signed approval fixture must validate structurally");
    let material = validation
        .verification_material
        .as_ref()
        .expect("signed approval fixture must carry public material");
    let payload = &validation.evidence.payload;
    let payload_digest = phase7d_hex_decode(
        validation
            .payload_digest
            .strip_prefix("sha256:")
            .expect("payload digest prefix must match"),
    )
    .expect("payload digest must decode");
    Phase7dSignedEvidenceFixture {
        packet: payload.packet.clone(),
        policy_decision: payload.policy_decision.clone(),
        approval_request: payload.approval_request.clone(),
        approval_decision: payload.approval_decision.clone(),
        evidence_id: validation.signed_approval_evidence_id,
        project_ref: payload.packet.project_ref.clone(),
        decision_id: payload.approval_decision.approval_decision_id.clone(),
        material_ref: payload.verification_material_ref.clone(),
        nonce_id: payload.nonce_id.clone(),
        canonical_payload: phase7d_base64url_decode(&validation.canonical_payload_base64url)
            .expect("canonical payload must decode"),
        payload_digest,
        signature: phase7d_base64url_decode(&validation.evidence.signature.signature_base64url)
            .expect("signature must decode"),
        issued_at: phase7d_fixed_timestamp(&payload.issued_at),
        expires_at: phase7d_fixed_timestamp(&payload.expires_at),
        signing_key_id: payload.signing_key_id.clone(),
        signing_key_version: payload
            .signing_key_version
            .parse()
            .expect("signing key version must parse"),
        public_spki: phase7d_base64url_decode(&material.public_key_spki_base64url)
            .expect("public SPKI must decode"),
    }
}

fn phase7d_append_authority(
    connection: &Connection,
    record_family: &str,
    record_id: &str,
    content_digest: &[u8],
    committed_at: &str,
) -> rusqlite::Result<i64> {
    let previous = connection
        .query_row(
            "SELECT sequence, chain_digest
             FROM lnsat_authority_order
             ORDER BY sequence DESC
             LIMIT 1",
            [],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Vec<u8>>(1)?)),
        )
        .optional()?;
    let sequence = previous
        .as_ref()
        .map_or(1, |(sequence, _)| sequence.saturating_add(1));
    let prior_chain_digest = previous.map(|(_, chain_digest)| chain_digest);
    let chain_digest = phase7d_chain_digest(
        sequence,
        record_family,
        record_id,
        content_digest,
        prior_chain_digest.as_deref(),
    );
    connection.execute(
        "INSERT INTO lnsat_authority_order (
           sequence, record_family, record_id, content_digest,
           chain_digest, prior_chain_digest, committed_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            sequence,
            record_family,
            record_id,
            content_digest,
            chain_digest,
            prior_chain_digest,
            committed_at
        ],
    )?;
    Ok(sequence)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_append_material(
    connection: &Connection,
    material_ref: &str,
    key_id: &str,
    key_version: i64,
    spki_der: &[u8],
    valid_from: &str,
    valid_until: &str,
    supersedes_material_ref: Option<&str>,
    committed_at: &str,
) -> rusqlite::Result<i64> {
    let content_digest = phase7d_material_content_digest(
        material_ref,
        key_id,
        key_version,
        spki_der,
        valid_from,
        valid_until,
        supersedes_material_ref,
    );
    let authority_sequence = phase7d_append_authority(
        connection,
        "verification_material",
        material_ref,
        &content_digest,
        committed_at,
    )?;
    connection.execute(
        "INSERT INTO lnsat_signed_approval_verification_materials (
           material_ref, key_id, key_version, algorithm, spki_der,
           valid_from, valid_until, supersedes_material_ref, authority_sequence
         ) VALUES (?1, ?2, ?3, 'Ed25519', ?4, ?5, ?6, ?7, ?8)",
        params![
            material_ref,
            key_id,
            key_version,
            spki_der,
            valid_from,
            valid_until,
            supersedes_material_ref,
            authority_sequence
        ],
    )?;
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_append_status(
    connection: &Connection,
    status_event_id: &str,
    material_ref: &str,
    revision: i64,
    status: &str,
    effective_at: &str,
    recorded_at: &str,
    reason_code: &str,
    prior_status_event_id: Option<&str>,
    committed_at: &str,
) -> rusqlite::Result<i64> {
    let content_digest = phase7d_status_content_digest(
        status_event_id,
        material_ref,
        revision,
        status,
        effective_at,
        recorded_at,
        reason_code,
        prior_status_event_id,
    );
    let authority_sequence = phase7d_append_authority(
        connection,
        "key_status_event",
        status_event_id,
        &content_digest,
        committed_at,
    )?;
    connection.execute(
        "INSERT INTO lnsat_signed_approval_key_status_events (
           status_event_id, material_ref, revision, status,
           effective_at, recorded_at, reason_code,
           prior_status_event_id, authority_sequence
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            status_event_id,
            material_ref,
            revision,
            status,
            effective_at,
            recorded_at,
            reason_code,
            prior_status_event_id,
            authority_sequence
        ],
    )?;
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_append_nonce_identity(
    connection: &Connection,
    nonce_id: &str,
    project_ref: &str,
    decision_id: &str,
    issued_at: &str,
    expires_at: &str,
    committed_at: &str,
) -> rusqlite::Result<i64> {
    let nonce_digest = phase7d_nonce_digest(nonce_id);
    let content_digest = phase7d_nonce_identity_content_digest(
        nonce_id,
        project_ref,
        decision_id,
        &nonce_digest,
        issued_at,
        expires_at,
    );
    let authority_sequence = phase7d_append_authority(
        connection,
        "nonce_identity",
        nonce_id,
        &content_digest,
        committed_at,
    )?;
    connection.execute(
        "INSERT INTO lnsat_signed_approval_nonce_identities (
           nonce_id, project_ref, decision_id, nonce_digest,
           issued_at, expires_at, authority_sequence
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            nonce_id,
            project_ref,
            decision_id,
            nonce_digest,
            issued_at,
            expires_at,
            authority_sequence
        ],
    )?;
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_append_nonce_event(
    connection: &Connection,
    nonce_event_id: &str,
    nonce_id: &str,
    revision: i64,
    event_kind: &str,
    effective_at: &str,
    recorded_at: &str,
    prior_nonce_event_id: Option<&str>,
    committed_at: &str,
) -> rusqlite::Result<i64> {
    let content_digest = phase7d_nonce_event_content_digest(
        nonce_event_id,
        nonce_id,
        revision,
        event_kind,
        effective_at,
        recorded_at,
        prior_nonce_event_id,
    );
    let authority_sequence = phase7d_append_authority(
        connection,
        "nonce_event",
        nonce_event_id,
        &content_digest,
        committed_at,
    )?;
    connection.execute(
        "INSERT INTO lnsat_signed_approval_nonce_events (
           nonce_event_id, nonce_id, revision, event_kind,
           effective_at, recorded_at, prior_nonce_event_id,
           authority_sequence
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            nonce_event_id,
            nonce_id,
            revision,
            event_kind,
            effective_at,
            recorded_at,
            prior_nonce_event_id,
            authority_sequence
        ],
    )?;
    Ok(authority_sequence)
}

fn phase7d_append_signed_evidence(
    connection: &Connection,
    fixture: &Phase7dSignedEvidenceFixture,
    committed_at: &str,
) -> rusqlite::Result<i64> {
    let stored = Phase7dStoredSignedEvidence {
        evidence_id: fixture.evidence_id.clone(),
        project_ref: fixture.project_ref.clone(),
        decision_id: fixture.decision_id.clone(),
        material_ref: fixture.material_ref.clone(),
        nonce_id: fixture.nonce_id.clone(),
        canonical_payload: fixture.canonical_payload.clone(),
        payload_digest: fixture.payload_digest.clone(),
        signature: fixture.signature.clone(),
        issued_at: fixture.issued_at.clone(),
        expires_at: fixture.expires_at.clone(),
        approval_gate_satisfied: 1,
        server_signed: 1,
        execution_authorized: 0,
        session_authority_state_changed: 0,
        mutation_authority: 0,
        authority_sequence: 0,
    };
    let content_digest = phase7d_signed_evidence_content_digest(&stored);
    let authority_sequence = phase7d_append_authority(
        connection,
        "signed_approval_evidence",
        &stored.evidence_id,
        &content_digest,
        committed_at,
    )?;
    connection.execute(
        "INSERT INTO lnsat_signed_approval_evidence (
           evidence_id, project_ref, decision_id, material_ref, nonce_id,
           canonical_payload, payload_digest, signature, issued_at,
           expires_at, approval_gate_satisfied, server_signed,
           execution_authorized, session_authority_state_changed,
           mutation_authority, authority_sequence
         ) VALUES (
           ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
           1, 1, 0, 0, 0, ?11
         )",
        params![
            stored.evidence_id,
            stored.project_ref,
            stored.decision_id,
            stored.material_ref,
            stored.nonce_id,
            stored.canonical_payload,
            stored.payload_digest,
            stored.signature,
            stored.issued_at,
            stored.expires_at,
            authority_sequence
        ],
    )?;
    Ok(authority_sequence)
}

fn phase7d_resolve_evidence_issue_idempotency(
    connection: &Connection,
    fixture: &Phase7dSignedEvidenceFixture,
    idempotency_key: &str,
    request_digest: &[u8],
    created_at: &str,
) -> Result<Phase7dEvidenceIssueIdempotencyOutcome, String> {
    if !phase7d_valid_idempotency_key(idempotency_key)
        || !phase7d_valid_idempotency_time(created_at, &fixture.issued_at)
    {
        return Err("candidate evidence issue idempotency request invalid".to_owned());
    }
    let expected_digest =
        phase7d_evidence_issue_request_digest(&fixture.project_ref, &fixture.decision_id);
    if request_digest != expected_digest {
        return Err("candidate evidence issue idempotency conflict".to_owned());
    }

    let existing_for_key = connection
        .query_row(
            "SELECT request_digest, evidence_id, created_at
             FROM lnsat_signed_approval_evidence_issue_idempotency
             WHERE project_ref = ?1
               AND idempotency_key = ?2",
            params![fixture.project_ref, idempotency_key],
            |row| {
                Ok((
                    row.get::<_, Vec<u8>>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some((stored_digest, stored_evidence_id, stored_created_at)) = existing_for_key {
        if stored_digest != expected_digest
            || stored_evidence_id != fixture.evidence_id
            || !phase7d_valid_idempotency_time(&stored_created_at, &fixture.issued_at)
        {
            return Err("candidate evidence issue idempotency conflict".to_owned());
        }
        return Ok(Phase7dEvidenceIssueIdempotencyOutcome {
            created: false,
            evidence_id: stored_evidence_id,
        });
    }

    let existing_for_evidence = connection
        .query_row(
            "SELECT project_ref, request_digest, created_at
             FROM lnsat_signed_approval_evidence_issue_idempotency
             WHERE evidence_id = ?1",
            [&fixture.evidence_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Vec<u8>>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some((stored_project_ref, stored_digest, stored_created_at)) = existing_for_evidence {
        if stored_project_ref != fixture.project_ref
            || stored_digest != expected_digest
            || !phase7d_valid_idempotency_time(&stored_created_at, &fixture.issued_at)
        {
            return Err("candidate evidence issue idempotency conflict".to_owned());
        }
        return Ok(Phase7dEvidenceIssueIdempotencyOutcome {
            created: false,
            evidence_id: fixture.evidence_id.clone(),
        });
    }

    connection
        .execute(
            "INSERT INTO lnsat_signed_approval_evidence_issue_idempotency (
               project_ref, idempotency_key, request_digest,
               evidence_id, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                fixture.project_ref,
                idempotency_key,
                request_digest,
                fixture.evidence_id,
                created_at
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(Phase7dEvidenceIssueIdempotencyOutcome {
        created: true,
        evidence_id: fixture.evidence_id.clone(),
    })
}

#[allow(clippy::too_many_arguments)]
fn phase7d_append_verification_attempt(
    connection: &Connection,
    attempt_id: &str,
    project_ref: &str,
    input: &[u8],
    result_code: &str,
    reason_code: &str,
    observed_at: &str,
    subject: Option<&Phase7dVerificationAttemptSubject>,
    committed_at: &str,
) -> Result<i64, String> {
    if !phase7d_valid_verification_attempt_id(attempt_id)
        || !(9..=256).contains(&project_ref.len())
        || !project_ref.starts_with("project:")
        || input.is_empty()
        || input.len() > 1_048_576
        || canonical_utc_timestamp_millis_v1(observed_at).is_none()
        || !phase7d_valid_verification_result(result_code, reason_code)
        || (result_code == "verified" && subject.is_none())
    {
        return Err("candidate verification attempt request invalid".to_owned());
    }

    if let Some(subject) = subject {
        let (stored_project_ref, stored_material_ref, issued_at, expires_at) = connection
            .query_row(
                "SELECT project_ref, material_ref, issued_at, expires_at
                 FROM lnsat_signed_approval_evidence
                 WHERE evidence_id = ?1",
                [&subject.evidence_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                },
            )
            .map_err(|_| "candidate verification attempt subject invalid".to_owned())?;
        if stored_project_ref != project_ref
            || stored_material_ref != subject.material_ref
            || observed_at < issued_at.as_str()
            || (result_code == "verified" && observed_at >= expires_at.as_str())
        {
            return Err("candidate verification attempt subject invalid".to_owned());
        }
    }

    let project_scope_digest = phase7d_verification_project_scope_digest(project_ref);
    let input_digest = phase7d_verification_input_digest(input);
    let content_digest = phase7d_verification_attempt_content_digest(
        attempt_id,
        &project_scope_digest,
        &input_digest,
        result_code,
        reason_code,
        observed_at,
        subject,
    );
    let authority_sequence = phase7d_append_authority(
        connection,
        "verification_attempt",
        attempt_id,
        &content_digest,
        committed_at,
    )
    .map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO lnsat_signed_approval_verification_attempts (
               attempt_id, project_scope_digest, input_digest,
               result_code, reason_code, observed_at, authority_sequence
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                attempt_id,
                project_scope_digest,
                input_digest,
                result_code,
                reason_code,
                observed_at,
                authority_sequence
            ],
        )
        .map_err(|error| error.to_string())?;
    if let Some(subject) = subject {
        connection
            .execute(
                "INSERT INTO lnsat_signed_approval_verification_attempt_subjects (
                   attempt_id, evidence_id, material_ref
                 ) VALUES (?1, ?2, ?3)",
                params![attempt_id, subject.evidence_id, subject.material_ref],
            )
            .map_err(|error| error.to_string())?;
    }
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_record_verification_attempt(
    connection: &mut Connection,
    attempt_id: &str,
    project_ref: &str,
    input: &[u8],
    result_code: &str,
    reason_code: &str,
    observed_at: &str,
    subject: Option<&Phase7dVerificationAttemptSubject>,
    committed_at: &str,
) -> Result<i64, String> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let authority_sequence = phase7d_append_verification_attempt(
        &transaction,
        attempt_id,
        project_ref,
        input,
        result_code,
        reason_code,
        observed_at,
        subject,
        committed_at,
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
#[allow(clippy::too_many_lines)]
fn phase7d_append_nonce_consumption(
    connection: &Connection,
    consumption_id: &str,
    project_ref: &str,
    nonce_id: &str,
    evidence_id: &str,
    authorization_ref: &str,
    authorization: &[u8],
    consumed_at: &str,
    committed_at: &str,
) -> Result<i64, String> {
    if !phase7d_valid_nonce_consumption_id(consumption_id)
        || !(9..=256).contains(&project_ref.len())
        || !project_ref.starts_with("project:")
        || !phase7d_valid_authorization_ref(authorization_ref)
        || authorization.is_empty()
        || authorization.len() > 1_048_576
        || canonical_utc_timestamp_millis_v1(consumed_at).is_none()
        || canonical_utc_timestamp_millis_v1(committed_at).is_none()
        || committed_at < consumed_at
    {
        return Err("candidate nonce consumption request invalid".to_owned());
    }

    let (
        stored_project_ref,
        stored_nonce_id,
        issued_at,
        expires_at,
        material_valid_from,
        material_valid_until,
        material_status,
    ) = connection
        .query_row(
            "SELECT
               evidence.project_ref, evidence.nonce_id,
               evidence.issued_at, evidence.expires_at,
               material.valid_from, material.valid_until,
               (
                 SELECT status.status
                 FROM lnsat_signed_approval_key_status_events AS status
                 WHERE status.material_ref = evidence.material_ref
                   AND status.effective_at <= ?2
                 ORDER BY status.revision DESC
                 LIMIT 1
               )
             FROM lnsat_signed_approval_evidence AS evidence
             JOIN lnsat_signed_approval_nonce_identities AS nonce
               ON nonce.nonce_id = evidence.nonce_id
              AND nonce.project_ref = evidence.project_ref
             JOIN lnsat_signed_approval_verification_materials AS material
               ON material.material_ref = evidence.material_ref
             WHERE evidence.evidence_id = ?1",
            params![evidence_id, consumed_at],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .map_err(|_| "candidate nonce consumption evidence invalid".to_owned())?;
    if stored_project_ref != project_ref
        || stored_nonce_id != nonce_id
        || consumed_at < issued_at.as_str()
        || consumed_at >= expires_at.as_str()
        || consumed_at < material_valid_from.as_str()
        || consumed_at >= material_valid_until.as_str()
        || material_status != "active"
    {
        return Err("candidate nonce consumption evidence invalid".to_owned());
    }

    let (prior_nonce_event_id, revision, event_kind) = connection
        .query_row(
            "SELECT nonce_event_id, revision, event_kind
             FROM lnsat_signed_approval_nonce_events
             WHERE nonce_id = ?1
             ORDER BY revision DESC
             LIMIT 1",
            [nonce_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .map_err(|_| "candidate nonce consumption nonce invalid".to_owned())?;
    if revision != 1 || event_kind != "issued" {
        return Err("candidate nonce consumption nonce unavailable".to_owned());
    }

    let stored = Phase7dStoredNonceConsumption {
        consumption_id: consumption_id.to_owned(),
        project_ref: project_ref.to_owned(),
        nonce_id: nonce_id.to_owned(),
        evidence_id: evidence_id.to_owned(),
        authorization_ref: authorization_ref.to_owned(),
        authorization_digest: phase7d_authorization_digest(authorization),
        consumed_at: consumed_at.to_owned(),
        authority_sequence: 0,
    };
    let content_digest = phase7d_nonce_consumption_content_digest(&stored);
    let authority_sequence = phase7d_append_authority(
        connection,
        "nonce_consumption",
        consumption_id,
        &content_digest,
        committed_at,
    )
    .map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO lnsat_signed_approval_nonce_consumptions (
               consumption_id, project_ref, nonce_id, evidence_id,
               authorization_ref, authorization_digest, consumed_at,
               authority_sequence
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                stored.consumption_id,
                stored.project_ref,
                stored.nonce_id,
                stored.evidence_id,
                stored.authorization_ref,
                stored.authorization_digest,
                stored.consumed_at,
                authority_sequence
            ],
        )
        .map_err(|error| error.to_string())?;

    let nonce_event_id = format!(
        "nonce-event:consumed:{}",
        consumption_id
            .strip_prefix("nsc_")
            .expect("validated consumption id must retain prefix")
    );
    phase7d_append_nonce_event(
        connection,
        &nonce_event_id,
        nonce_id,
        2,
        "consumed",
        consumed_at,
        consumed_at,
        Some(&prior_nonce_event_id),
        committed_at,
    )
    .map_err(|error| error.to_string())?;
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
fn phase7d_consume_nonce(
    connection: &mut Connection,
    consumption_id: &str,
    project_ref: &str,
    nonce_id: &str,
    evidence_id: &str,
    authorization_ref: &str,
    authorization: &[u8],
    consumed_at: &str,
    committed_at: &str,
) -> Result<i64, String> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let authority_sequence = phase7d_append_nonce_consumption(
        &transaction,
        consumption_id,
        project_ref,
        nonce_id,
        evidence_id,
        authorization_ref,
        authorization,
        consumed_at,
        committed_at,
    )?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(authority_sequence)
}

#[allow(clippy::too_many_arguments)]
#[allow(clippy::too_many_lines)]
fn phase7d_consume_nonce_idempotent(
    connection: &mut Connection,
    consumption_id: &str,
    project_ref: &str,
    nonce_id: &str,
    evidence_id: &str,
    authorization_ref: &str,
    authorization: &[u8],
    consumed_at: &str,
    idempotency_key: &str,
    request_digest: &[u8],
    created_at: &str,
    committed_at: &str,
) -> Result<Phase7dNonceConsumeIdempotencyOutcome, String> {
    if !(9..=256).contains(&project_ref.len())
        || !project_ref.starts_with("project:")
        || !phase7d_valid_idempotency_key(idempotency_key)
        || !phase7d_valid_authorization_ref(authorization_ref)
        || authorization.is_empty()
        || authorization.len() > 1_048_576
        || canonical_utc_timestamp_millis_v1(created_at).is_none()
    {
        return Err("candidate nonce consumption idempotency request invalid".to_owned());
    }

    let authorization_digest = phase7d_authorization_digest(authorization);
    let expected_request_digest = phase7d_nonce_consume_request_digest(
        project_ref,
        nonce_id,
        evidence_id,
        authorization_ref,
        &authorization_digest,
    );
    if request_digest != expected_request_digest {
        return Err("candidate nonce consumption idempotency conflict".to_owned());
    }

    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let existing_for_key = transaction
        .query_row(
            "SELECT
               replay.project_ref, replay.request_digest,
               replay.consumption_id, replay.created_at,
               consumption.nonce_id, consumption.evidence_id,
               consumption.authorization_ref,
               consumption.authorization_digest,
               consumption.consumed_at
             FROM lnsat_signed_approval_nonce_consume_idempotency AS replay
             JOIN lnsat_signed_approval_nonce_consumptions AS consumption
               ON consumption.consumption_id = replay.consumption_id
              AND consumption.project_ref = replay.project_ref
             WHERE replay.project_ref = ?1
               AND replay.idempotency_key = ?2",
            params![project_ref, idempotency_key],
            |row| {
                Ok(Phase7dStoredNonceConsumeIdempotency {
                    project_ref: row.get(0)?,
                    request_digest: row.get(1)?,
                    consumption_id: row.get(2)?,
                    created_at: row.get(3)?,
                    nonce_id: row.get(4)?,
                    evidence_id: row.get(5)?,
                    authorization_ref: row.get(6)?,
                    authorization_digest: row.get(7)?,
                    consumed_at: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some(stored) = existing_for_key {
        if !phase7d_nonce_consume_idempotency_matches(
            &stored,
            project_ref,
            nonce_id,
            evidence_id,
            authorization_ref,
            &authorization_digest,
            &expected_request_digest,
        ) {
            return Err("candidate nonce consumption idempotency conflict".to_owned());
        }
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(Phase7dNonceConsumeIdempotencyOutcome {
            created: false,
            consumption_id: stored.consumption_id,
        });
    }

    let existing_for_request_identity = transaction
        .query_row(
            "SELECT
               consumption.project_ref, replay.request_digest,
               consumption.consumption_id, replay.created_at,
               consumption.nonce_id, consumption.evidence_id,
               consumption.authorization_ref,
               consumption.authorization_digest,
               consumption.consumed_at
             FROM lnsat_signed_approval_nonce_consumptions AS consumption
             LEFT JOIN lnsat_signed_approval_nonce_consume_idempotency AS replay
               ON replay.consumption_id = consumption.consumption_id
              AND replay.project_ref = consumption.project_ref
             WHERE consumption.project_ref = ?1
               AND (
                 consumption.nonce_id = ?2
                 OR consumption.evidence_id = ?3
                 OR consumption.authorization_ref = ?4
               )
             LIMIT 1",
            params![project_ref, nonce_id, evidence_id, authorization_ref],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<Vec<u8>>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, Vec<u8>>(7)?,
                    row.get::<_, String>(8)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some((
        stored_project_ref,
        stored_request_digest,
        stored_consumption_id,
        stored_created_at,
        stored_nonce_id,
        stored_evidence_id,
        stored_authorization_ref,
        stored_authorization_digest,
        stored_consumed_at,
    )) = existing_for_request_identity
    {
        let (Some(stored_request_digest), Some(stored_created_at)) =
            (stored_request_digest, stored_created_at)
        else {
            return Err("candidate nonce consumption idempotency conflict".to_owned());
        };
        let stored = Phase7dStoredNonceConsumeIdempotency {
            project_ref: stored_project_ref,
            request_digest: stored_request_digest,
            consumption_id: stored_consumption_id,
            created_at: stored_created_at,
            nonce_id: stored_nonce_id,
            evidence_id: stored_evidence_id,
            authorization_ref: stored_authorization_ref,
            authorization_digest: stored_authorization_digest,
            consumed_at: stored_consumed_at,
        };
        if !phase7d_nonce_consume_idempotency_matches(
            &stored,
            project_ref,
            nonce_id,
            evidence_id,
            authorization_ref,
            &authorization_digest,
            &expected_request_digest,
        ) {
            return Err("candidate nonce consumption idempotency conflict".to_owned());
        }
        transaction.commit().map_err(|error| error.to_string())?;
        return Ok(Phase7dNonceConsumeIdempotencyOutcome {
            created: false,
            consumption_id: stored.consumption_id,
        });
    }

    if !phase7d_valid_idempotency_time(created_at, consumed_at) {
        return Err("candidate nonce consumption idempotency request invalid".to_owned());
    }
    phase7d_append_nonce_consumption(
        &transaction,
        consumption_id,
        project_ref,
        nonce_id,
        evidence_id,
        authorization_ref,
        authorization,
        consumed_at,
        committed_at,
    )?;
    transaction
        .execute(
            "INSERT INTO lnsat_signed_approval_nonce_consume_idempotency (
               project_ref, idempotency_key, request_digest,
               consumption_id, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                project_ref,
                idempotency_key,
                request_digest,
                consumption_id,
                created_at
            ],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(Phase7dNonceConsumeIdempotencyOutcome {
        created: true,
        consumption_id: consumption_id.to_owned(),
    })
}

fn phase7d_apply_candidate(connection: &mut Connection) -> Result<(), SqliteStoreError> {
    apply_migration(connection, PHASE7D_PUBLIC_MATERIAL_CANDIDATE)
}

fn phase7d_prepare_signed_evidence_candidate(
    store: &mut SqliteStore,
) -> Phase7dSignedEvidenceFixture {
    let fixture = phase7d_signed_evidence_fixture();
    assert_eq!(fixture.project_ref, fixture.packet.project_ref);
    assert_eq!(
        fixture.decision_id,
        fixture.approval_decision.approval_decision_id
    );
    persist_approval_chain(
        store,
        &fixture.packet,
        &fixture.policy_decision,
        &fixture.approval_request,
        &fixture.approval_decision,
    );
    phase7d_apply_candidate(&mut store.connection).expect("candidate migration must apply");

    let transaction = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .expect("signed evidence setup transaction must begin");
    let predecessor_material_ref = format!("avm_{}", "0".repeat(64));
    phase7d_append_material(
        &transaction,
        &predecessor_material_ref,
        &fixture.signing_key_id,
        1,
        &phase7d_test_spki(50_001),
        "2026-07-22T19:00:00.000Z",
        "2026-07-22T21:00:00.000Z",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("predecessor material must append");
    phase7d_append_material(
        &transaction,
        &fixture.material_ref,
        &fixture.signing_key_id,
        fixture.signing_key_version,
        &fixture.public_spki,
        "2026-07-22T19:00:00.000Z",
        "2026-07-22T21:00:00.000Z",
        Some(&predecessor_material_ref),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("signed evidence material must append");
    phase7d_append_status(
        &transaction,
        "status:evidence:material:active",
        &fixture.material_ref,
        1,
        "active",
        "2026-07-22T19:00:00.000Z",
        "2026-07-22T19:00:00.000Z",
        "activated",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("signed evidence material status must append");
    phase7d_append_nonce_identity(
        &transaction,
        &fixture.nonce_id,
        &fixture.project_ref,
        &fixture.decision_id,
        &fixture.issued_at,
        &fixture.expires_at,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("signed evidence nonce identity must append");
    phase7d_append_nonce_event(
        &transaction,
        "nonce-event:evidence:issued",
        &fixture.nonce_id,
        1,
        "issued",
        &fixture.issued_at,
        &fixture.issued_at,
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("signed evidence nonce issued event must append");
    transaction
        .commit()
        .expect("signed evidence setup transaction must commit");
    fixture
}

fn phase7d_candidate_schema_definition_digest(connection: &Connection) -> Result<String, String> {
    let mut definitions = connection
        .prepare(
            "SELECT type, name, tbl_name, sql
             FROM sqlite_schema
             WHERE sql IS NOT NULL
               AND (
                 name = 'lnsat_authority_order'
                 OR name GLOB 'lnsat_authority_order_*'
                 OR name GLOB 'lnsat_signed_approval_*'
                 OR name = 'lnsat_approval_decisions_nonce_binding_idx'
               )
             ORDER BY type, name",
        )
        .map_err(|error| error.to_string())?;
    let definitions = definitions
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let mut manifest = String::new();
    for (object_type, name, table_name, sql) in definitions {
        write!(
            &mut manifest,
            "{object_type}\0{name}\0{table_name}\0{}\0",
            normalize_sql(&sql)
        )
        .expect("writing candidate schema manifest cannot fail");
    }
    Ok(migration_digest(&manifest))
}

#[allow(clippy::too_many_lines)]
fn phase7d_candidate_schema_verify(connection: &Connection) -> Result<(), String> {
    let version = pragma_i64(connection, "user_version").map_err(|error| error.to_string())?;
    if version != PHASE7D_PUBLIC_MATERIAL_CANDIDATE_VERSION {
        return Err("candidate schema version mismatch".to_owned());
    }
    let metadata_version = connection
        .query_row(
            "SELECT schema_version
             FROM lnsat_store_metadata
             WHERE singleton = 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;
    if metadata_version != PHASE7D_PUBLIC_MATERIAL_CANDIDATE_VERSION {
        return Err("candidate metadata version mismatch".to_owned());
    }
    let candidate_digest = connection
        .query_row(
            "SELECT migration_sha256
             FROM lnsat_schema_migrations
             WHERE schema_version = ?1
               AND migration_id = ?2
               AND applied_order = ?1",
            params![
                PHASE7D_PUBLIC_MATERIAL_CANDIDATE_VERSION,
                PHASE7D_PUBLIC_MATERIAL_CANDIDATE.id
            ],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| error.to_string())?;
    if candidate_digest != migration_digest(PHASE7D_PUBLIC_MATERIAL_CANDIDATE_SQL) {
        return Err("candidate migration digest mismatch".to_owned());
    }

    let expected_objects = [
        ("table", "lnsat_authority_order"),
        ("index", "lnsat_approval_decisions_nonce_binding_idx"),
        (
            "index",
            "lnsat_signed_approval_key_status_events_latest_idx",
        ),
        ("table", "lnsat_signed_approval_key_status_events"),
        (
            "trigger",
            "lnsat_signed_approval_key_status_events_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_key_status_events_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_key_status_events_validate_insert",
        ),
        ("index", "lnsat_signed_approval_nonce_events_latest_idx"),
        ("index", "lnsat_signed_approval_nonce_events_terminal_idx"),
        ("table", "lnsat_signed_approval_nonce_events"),
        (
            "trigger",
            "lnsat_signed_approval_nonce_events_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_events_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_events_validate_insert",
        ),
        ("table", "lnsat_signed_approval_nonce_consume_idempotency"),
        (
            "trigger",
            "lnsat_signed_approval_nonce_consume_idempotency_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_consume_idempotency_reject_update",
        ),
        (
            "index",
            "lnsat_signed_approval_nonce_consumptions_project_timeline_idx",
        ),
        ("table", "lnsat_signed_approval_nonce_consumptions"),
        (
            "trigger",
            "lnsat_signed_approval_nonce_consumptions_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_consumptions_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_consumptions_validate_insert",
        ),
        ("table", "lnsat_signed_approval_nonce_identities"),
        (
            "trigger",
            "lnsat_signed_approval_nonce_identities_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_identities_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_nonce_identities_validate_insert",
        ),
        ("index", "lnsat_signed_approval_evidence_material_idx"),
        ("table", "lnsat_signed_approval_evidence"),
        ("table", "lnsat_signed_approval_evidence_issue_idempotency"),
        (
            "trigger",
            "lnsat_signed_approval_evidence_issue_idempotency_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_evidence_issue_idempotency_reject_update",
        ),
        ("trigger", "lnsat_signed_approval_evidence_reject_delete"),
        ("trigger", "lnsat_signed_approval_evidence_reject_update"),
        ("trigger", "lnsat_signed_approval_evidence_validate_insert"),
        (
            "table",
            "lnsat_signed_approval_verification_attempt_subjects",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_attempt_subjects_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_attempt_subjects_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_attempt_subjects_validate_insert",
        ),
        (
            "index",
            "lnsat_signed_approval_verification_attempts_scope_timeline_idx",
        ),
        ("table", "lnsat_signed_approval_verification_attempts"),
        (
            "trigger",
            "lnsat_signed_approval_verification_attempts_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_attempts_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_attempts_validate_insert",
        ),
        (
            "index",
            "lnsat_signed_approval_verification_materials_key_lineage_idx",
        ),
        ("table", "lnsat_signed_approval_verification_materials"),
        (
            "trigger",
            "lnsat_signed_approval_verification_materials_reject_delete",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_materials_reject_update",
        ),
        (
            "trigger",
            "lnsat_signed_approval_verification_materials_validate_insert",
        ),
        ("trigger", "lnsat_authority_order_reject_delete"),
        ("trigger", "lnsat_authority_order_reject_update"),
        ("trigger", "lnsat_authority_order_validate_insert"),
    ];
    let expected_object_set = expected_objects
        .iter()
        .map(|(object_type, name)| ((*object_type).to_owned(), (*name).to_owned()))
        .collect::<std::collections::BTreeSet<_>>();
    let mut candidate_objects = connection
        .prepare(
            "SELECT type, name
             FROM sqlite_schema
             WHERE sql IS NOT NULL
               AND (
                 name = 'lnsat_authority_order'
                 OR name GLOB 'lnsat_authority_order_*'
                 OR name GLOB 'lnsat_signed_approval_*'
                 OR name = 'lnsat_approval_decisions_nonce_binding_idx'
               )
             ORDER BY type, name",
        )
        .map_err(|error| error.to_string())?;
    let candidate_object_set = candidate_objects
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<std::collections::BTreeSet<_>>>()
        .map_err(|error| error.to_string())?;
    if candidate_object_set != expected_object_set {
        return Err("candidate schema object set mismatch".to_owned());
    }
    let schema_definition_digest = phase7d_candidate_schema_definition_digest(connection)?;
    if schema_definition_digest != PHASE7D_CANDIDATE_SCHEMA_DEFINITION_SHA256 {
        return Err(format!(
            "candidate schema definition digest mismatch: {schema_definition_digest}"
        ));
    }
    for (object_type, name) in expected_objects {
        let sql = connection
            .query_row(
                "SELECT sql
                 FROM sqlite_schema
                 WHERE type = ?1
                   AND name = ?2",
                params![object_type, name],
                |row| row.get::<_, String>(0),
            )
            .map_err(|error| error.to_string())?;
        if object_type == "table" && !sql.ends_with(" STRICT") {
            return Err(format!("candidate table is not STRICT: {name}"));
        }
    }

    let integrity = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;
    if integrity != "ok" {
        return Err("candidate integrity check failed".to_owned());
    }
    let mut foreign_key_check = connection
        .prepare("PRAGMA foreign_key_check")
        .map_err(|error| error.to_string())?;
    if foreign_key_check
        .query([])
        .map_err(|error| error.to_string())?
        .next()
        .map_err(|error| error.to_string())?
        .is_some()
    {
        return Err("candidate foreign key check failed".to_owned());
    }

    let mut materials = connection
        .prepare(
            "SELECT
               material_ref, key_id, key_version, algorithm, spki_der,
               valid_from, valid_until, supersedes_material_ref,
               authority_sequence
             FROM lnsat_signed_approval_verification_materials
             ORDER BY key_id, key_version",
        )
        .map_err(|error| error.to_string())?;
    let materials = materials
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Vec<u8>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, i64>(8)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let material_lineage = materials
        .iter()
        .map(|(material_ref, key_id, key_version, _, _, _, _, _, _)| {
            ((key_id.clone(), *key_version), material_ref.clone())
        })
        .collect::<std::collections::BTreeMap<_, _>>();
    for (_, key_id, key_version, _, _, _, _, supersedes_material_ref, _) in &materials {
        let expected_predecessor = if *key_version == 1 {
            None
        } else {
            material_lineage.get(&(key_id.clone(), *key_version - 1))
        };
        if supersedes_material_ref.as_ref() != expected_predecessor {
            return Err("candidate material lineage drift".to_owned());
        }
    }
    for (
        material_ref,
        key_id,
        key_version,
        algorithm,
        spki_der,
        valid_from,
        valid_until,
        supersedes_material_ref,
        authority_sequence,
    ) in materials
    {
        if algorithm != "Ed25519" {
            return Err("candidate algorithm drift".to_owned());
        }
        let expected = phase7d_material_content_digest(
            &material_ref,
            &key_id,
            key_version,
            &spki_der,
            &valid_from,
            &valid_until,
            supersedes_material_ref.as_deref(),
        );
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'verification_material'
                   AND record_id = ?2",
                params![authority_sequence, material_ref],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate material content digest mismatch".to_owned());
        }
    }

    let mut statuses = connection
        .prepare(
            "SELECT
               status_event_id, material_ref, revision, status,
               effective_at, recorded_at, reason_code,
               prior_status_event_id, authority_sequence
             FROM lnsat_signed_approval_key_status_events
             ORDER BY material_ref, revision",
        )
        .map_err(|error| error.to_string())?;
    let statuses = statuses
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, i64>(8)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let mut prior_status: Option<(String, i64, String, String)> = None;
    for (
        status_event_id,
        material_ref,
        revision,
        status,
        effective_at,
        recorded_at,
        reason_code,
        prior_status_event_id,
        authority_sequence,
    ) in statuses
    {
        let expected = phase7d_status_content_digest(
            &status_event_id,
            &material_ref,
            revision,
            &status,
            &effective_at,
            &recorded_at,
            &reason_code,
            prior_status_event_id.as_deref(),
        );
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'key_status_event'
                   AND record_id = ?2",
                params![authority_sequence, status_event_id],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate status content digest mismatch".to_owned());
        }
        let same_material = prior_status
            .as_ref()
            .is_some_and(|(previous_material, _, _, _)| previous_material == &material_ref);
        if revision == 1 {
            if same_material || status != "active" || prior_status_event_id.is_some() {
                return Err("candidate initial status invariant failed".to_owned());
            }
        } else {
            let Some((_, prior_revision, prior_kind, prior_id)) =
                prior_status.as_ref().filter(|_| same_material)
            else {
                return Err("candidate status lineage gap".to_owned());
            };
            let transition_valid = (*prior_kind == "active"
                && matches!(status.as_str(), "retired" | "revoked"))
                || (*prior_kind == "retired" && status == "revoked");
            if revision != prior_revision + 1
                || prior_status_event_id.as_deref() != Some(prior_id.as_str())
                || !transition_valid
            {
                return Err("candidate status transition drift".to_owned());
            }
        }
        prior_status = Some((material_ref, revision, status, status_event_id));
    }

    let active_lineage_conflicts = connection
        .query_row(
            "WITH latest AS (
               SELECT material_ref, max(revision) AS revision
               FROM lnsat_signed_approval_key_status_events
               GROUP BY material_ref
             ),
             current_status AS (
               SELECT status.material_ref, status.status
               FROM lnsat_signed_approval_key_status_events AS status
               JOIN latest
                 ON latest.material_ref = status.material_ref
                AND latest.revision = status.revision
             )
             SELECT count(*)
             FROM (
               SELECT material.key_id
               FROM current_status
               JOIN lnsat_signed_approval_verification_materials AS material
                 ON material.material_ref = current_status.material_ref
               WHERE current_status.status = 'active'
               GROUP BY material.key_id
               HAVING count(*) > 1
             )",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;
    if active_lineage_conflicts != 0 {
        return Err("candidate active key-lineage conflict".to_owned());
    }

    let mut nonce_identities = connection
        .prepare(
            "SELECT
               nonce_id, project_ref, decision_id, nonce_digest,
               issued_at, expires_at, authority_sequence
             FROM lnsat_signed_approval_nonce_identities
             ORDER BY nonce_id",
        )
        .map_err(|error| error.to_string())?;
    let nonce_identities = nonce_identities
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Vec<u8>>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let nonce_windows = nonce_identities
        .iter()
        .map(|(nonce_id, _, _, _, issued_at, expires_at, _)| {
            (nonce_id.clone(), (issued_at.clone(), expires_at.clone()))
        })
        .collect::<std::collections::BTreeMap<_, _>>();
    for (
        nonce_id,
        project_ref,
        decision_id,
        nonce_digest,
        issued_at,
        expires_at,
        authority_sequence,
    ) in &nonce_identities
    {
        if *nonce_digest != phase7d_nonce_digest_checked(nonce_id)? {
            return Err("candidate nonce digest mismatch".to_owned());
        }
        let decision_binding_count = connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_approval_decisions
                 WHERE approval_decision_id = ?1
                   AND project_ref = ?2
                   AND decision = 'approved'
                   AND approval_gate_satisfied = 1
                   AND execution_authorized = 0
                   AND ?3 >= strftime('%Y-%m-%dT%H:%M:%fZ', decided_at)
                   AND ?3 < strftime('%Y-%m-%dT%H:%M:%fZ', expires_at)
                   AND ?4 = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at)",
                params![decision_id, project_ref, issued_at, expires_at],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|error| error.to_string())?;
        if decision_binding_count != 1 {
            return Err("candidate nonce approval-decision binding drift".to_owned());
        }
        let expected = phase7d_nonce_identity_content_digest(
            nonce_id,
            project_ref,
            decision_id,
            nonce_digest,
            issued_at,
            expires_at,
        );
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'nonce_identity'
                   AND record_id = ?2",
                params![authority_sequence, nonce_id],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate nonce identity content digest mismatch".to_owned());
        }
    }

    let mut nonce_events = connection
        .prepare(
            "SELECT
               nonce_event_id, nonce_id, revision, event_kind,
               effective_at, recorded_at, prior_nonce_event_id,
               authority_sequence
             FROM lnsat_signed_approval_nonce_events
             ORDER BY nonce_id, revision",
        )
        .map_err(|error| error.to_string())?;
    let nonce_events = nonce_events
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, i64>(7)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let mut issued_nonces = std::collections::BTreeSet::new();
    let mut prior_nonce_event: Option<(String, i64, String, String)> = None;
    for (
        nonce_event_id,
        nonce_id,
        revision,
        event_kind,
        effective_at,
        recorded_at,
        prior_nonce_event_id,
        authority_sequence,
    ) in nonce_events
    {
        let expected = phase7d_nonce_event_content_digest(
            &nonce_event_id,
            &nonce_id,
            revision,
            &event_kind,
            &effective_at,
            &recorded_at,
            prior_nonce_event_id.as_deref(),
        );
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'nonce_event'
                   AND record_id = ?2",
                params![authority_sequence, nonce_event_id],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate nonce event content digest mismatch".to_owned());
        }
        let Some((issued_at, expires_at)) = nonce_windows.get(&nonce_id) else {
            return Err("candidate nonce event identity gap".to_owned());
        };
        let same_nonce = prior_nonce_event
            .as_ref()
            .is_some_and(|(previous_nonce, _, _, _)| previous_nonce == &nonce_id);
        if revision == 1 {
            if same_nonce
                || event_kind != "issued"
                || prior_nonce_event_id.is_some()
                || &effective_at != issued_at
            {
                return Err("candidate nonce issued-event invariant failed".to_owned());
            }
            issued_nonces.insert(nonce_id.clone());
        } else {
            let Some((_, prior_revision, prior_kind, prior_id)) =
                prior_nonce_event.as_ref().filter(|_| same_nonce)
            else {
                return Err("candidate nonce event lineage gap".to_owned());
            };
            let terminal_time_valid = match event_kind.as_str() {
                "expired" => &effective_at >= expires_at,
                "cancelled" | "consumed" => {
                    &effective_at >= issued_at && &effective_at < expires_at
                }
                _ => false,
            };
            if revision != 2
                || *prior_revision != 1
                || prior_kind != "issued"
                || prior_nonce_event_id.as_deref() != Some(prior_id.as_str())
                || !terminal_time_valid
            {
                return Err("candidate nonce terminal-event invariant failed".to_owned());
            }
        }
        prior_nonce_event = Some((nonce_id, revision, event_kind, nonce_event_id));
    }
    if issued_nonces
        != nonce_windows
            .keys()
            .cloned()
            .collect::<std::collections::BTreeSet<_>>()
    {
        return Err("candidate nonce issued-event coverage mismatch".to_owned());
    }

    let mut signed_evidence = connection
        .prepare(
            "SELECT
               evidence_id, project_ref, decision_id, material_ref, nonce_id,
               canonical_payload, payload_digest, signature, issued_at,
               expires_at, approval_gate_satisfied, server_signed,
               execution_authorized, session_authority_state_changed,
               mutation_authority, authority_sequence
             FROM lnsat_signed_approval_evidence
             ORDER BY evidence_id",
        )
        .map_err(|error| error.to_string())?;
    let signed_evidence = signed_evidence
        .query_map([], |row| {
            Ok(Phase7dStoredSignedEvidence {
                evidence_id: row.get(0)?,
                project_ref: row.get(1)?,
                decision_id: row.get(2)?,
                material_ref: row.get(3)?,
                nonce_id: row.get(4)?,
                canonical_payload: row.get(5)?,
                payload_digest: row.get(6)?,
                signature: row.get(7)?,
                issued_at: row.get(8)?,
                expires_at: row.get(9)?,
                approval_gate_satisfied: row.get(10)?,
                server_signed: row.get(11)?,
                execution_authorized: row.get(12)?,
                session_authority_state_changed: row.get(13)?,
                mutation_authority: row.get(14)?,
                authority_sequence: row.get(15)?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    for evidence in signed_evidence {
        if evidence.approval_gate_satisfied != 1
            || evidence.server_signed != 1
            || evidence.execution_authorized != 0
            || evidence.session_authority_state_changed != 0
            || evidence.mutation_authority != 0
        {
            return Err("candidate signed evidence authority-field drift".to_owned());
        }
        if evidence.evidence_id != format!("sae_{}", phase7d_hex_encode(&evidence.payload_digest)) {
            return Err("candidate signed evidence identity mismatch".to_owned());
        }
        let payload: Value = serde_json::from_slice(&evidence.canonical_payload)
            .map_err(|_| "candidate signed evidence payload is invalid JSON".to_owned())?;
        let wrapper = serde_json::json!({
            "contract_version": "lnsat.contracts.v1_0",
            "schema_id": "lnsat.signed_approval_evidence.schema.v1_0",
            "signed_approval_evidence_id": &evidence.evidence_id,
            "payload": payload,
            "payload_digest": format!(
                "sha256:{}",
                phase7d_hex_encode(&evidence.payload_digest)
            ),
            "signature": {
                "signature_profile":
                    "lnsat.signed_approval_signature.ed25519.v1_0",
                "signature_base64url":
                    phase7d_base64url_encode(&evidence.signature),
            },
            "side_effects": [],
        });
        let wrapper = serde_json::to_vec(&wrapper)
            .map_err(|_| "candidate signed evidence wrapper encode failed".to_owned())?;
        let validation = lnsat_contracts::parse_signed_approval_evidence_v1(&wrapper, None)
            .map_err(|error| format!("candidate signed evidence wrapper invalid: {error:?}"))?;
        let payload = &validation.evidence.payload;
        if phase7d_base64url_decode(&validation.canonical_payload_base64url)?
            != evidence.canonical_payload
            || phase7d_base64url_decode(&validation.evidence.signature.signature_base64url)?
                != evidence.signature
            || validation.signed_approval_evidence_id != evidence.evidence_id
            || validation.payload_digest
                != format!("sha256:{}", phase7d_hex_encode(&evidence.payload_digest))
        {
            return Err("candidate signed evidence canonical-byte drift".to_owned());
        }
        if payload.packet.project_ref != evidence.project_ref
            || payload.approval_decision.approval_decision_id != evidence.decision_id
            || payload.verification_material_ref != evidence.material_ref
            || payload.nonce_id != evidence.nonce_id
            || canonical_utc_timestamp_millis_v1(&payload.issued_at)
                != canonical_utc_timestamp_millis_v1(&evidence.issued_at)
            || canonical_utc_timestamp_millis_v1(&payload.expires_at)
                != canonical_utc_timestamp_millis_v1(&evidence.expires_at)
            || !payload.approval_gate_satisfied
            || !payload.server_signed
            || payload.execution_authorized
            || payload.session_authority_state_changed
            || payload.mutation_authority
        {
            return Err("candidate signed evidence normalized-field drift".to_owned());
        }

        let decision_binding_count = connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_approval_decisions
                 WHERE approval_decision_id = ?1
                   AND project_ref = ?2
                   AND decision = 'approved'
                   AND approval_gate_satisfied = 1
                   AND execution_authorized = 0
                   AND ?3 >= strftime('%Y-%m-%dT%H:%M:%fZ', decided_at)
                   AND ?3 < strftime('%Y-%m-%dT%H:%M:%fZ', expires_at)
                   AND ?4 = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at)",
                params![
                    evidence.decision_id,
                    evidence.project_ref,
                    evidence.issued_at,
                    evidence.expires_at
                ],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|error| error.to_string())?;
        if decision_binding_count != 1 {
            return Err("candidate signed evidence decision binding drift".to_owned());
        }
        let nonce_binding_count = connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_nonce_identities
                 WHERE nonce_id = ?1
                   AND project_ref = ?2
                   AND decision_id = ?3
                   AND issued_at = ?4
                   AND expires_at = ?5",
                params![
                    evidence.nonce_id,
                    evidence.project_ref,
                    evidence.decision_id,
                    evidence.issued_at,
                    evidence.expires_at
                ],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|error| error.to_string())?;
        if nonce_binding_count != 1 {
            return Err("candidate signed evidence nonce binding drift".to_owned());
        }
        let material = connection
            .query_row(
                "SELECT key_id, key_version, valid_from, valid_until
                 FROM lnsat_signed_approval_verification_materials
                 WHERE material_ref = ?1",
                [&evidence.material_ref],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                },
            )
            .map_err(|error| error.to_string())?;
        if payload.signing_key_id != material.0
            || payload.signing_key_version != material.1.to_string()
            || evidence.issued_at < material.2
            || evidence.expires_at > material.3
        {
            return Err("candidate signed evidence material binding drift".to_owned());
        }
        let material_active_at_issue = connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_key_status_events AS status
                 WHERE status.material_ref = ?1
                   AND status.status = 'active'
                   AND status.effective_at <= ?2
                   AND NOT EXISTS (
                     SELECT 1
                     FROM lnsat_signed_approval_key_status_events AS later
                     WHERE later.material_ref = status.material_ref
                       AND later.revision > status.revision
                       AND later.effective_at <= ?2
                   )",
                params![evidence.material_ref, evidence.issued_at],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|error| error.to_string())?;
        if material_active_at_issue != 1 {
            return Err("candidate signed evidence material-status drift".to_owned());
        }
        let expected = phase7d_signed_evidence_content_digest(&evidence);
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'signed_approval_evidence'
                   AND record_id = ?2",
                params![evidence.authority_sequence, evidence.evidence_id],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate signed evidence content digest mismatch".to_owned());
        }
    }

    let mut nonce_consumptions = connection
        .prepare(
            "SELECT
               consumption.consumption_id, consumption.project_ref,
               consumption.nonce_id, consumption.evidence_id,
               consumption.authorization_ref,
               consumption.authorization_digest,
               consumption.consumed_at,
               consumption.authority_sequence,
               evidence.issued_at, evidence.expires_at,
               evidence.material_ref, consumed.authority_sequence
             FROM lnsat_signed_approval_nonce_consumptions AS consumption
             LEFT JOIN lnsat_signed_approval_evidence AS evidence
               ON evidence.evidence_id = consumption.evidence_id
              AND evidence.nonce_id = consumption.nonce_id
              AND evidence.project_ref = consumption.project_ref
             LEFT JOIN lnsat_signed_approval_nonce_events AS consumed
               ON consumed.nonce_id = consumption.nonce_id
              AND consumed.revision = 2
              AND consumed.event_kind = 'consumed'
              AND consumed.effective_at = consumption.consumed_at
              AND consumed.recorded_at = consumption.consumed_at
             ORDER BY consumption.authority_sequence",
        )
        .map_err(|error| error.to_string())?;
    let nonce_consumptions = nonce_consumptions
        .query_map([], |row| {
            Ok((
                Phase7dStoredNonceConsumption {
                    consumption_id: row.get(0)?,
                    project_ref: row.get(1)?,
                    nonce_id: row.get(2)?,
                    evidence_id: row.get(3)?,
                    authorization_ref: row.get(4)?,
                    authorization_digest: row.get(5)?,
                    consumed_at: row.get(6)?,
                    authority_sequence: row.get(7)?,
                },
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<i64>>(11)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    for (consumption, issued_at, expires_at, material_ref, event_sequence) in &nonce_consumptions {
        if !phase7d_valid_nonce_consumption_id(&consumption.consumption_id)
            || !phase7d_valid_authorization_ref(&consumption.authorization_ref)
            || consumption.authorization_digest.len() != 32
            || canonical_utc_timestamp_millis_v1(&consumption.consumed_at).is_none()
        {
            return Err("candidate nonce consumption value drift".to_owned());
        }
        let (Some(issued_at), Some(expires_at), Some(material_ref), Some(event_sequence)) =
            (issued_at, expires_at, material_ref, event_sequence)
        else {
            return Err("candidate nonce consumption binding drift".to_owned());
        };
        if consumption.consumed_at.as_str() < issued_at.as_str()
            || consumption.consumed_at.as_str() >= expires_at.as_str()
            || *event_sequence != consumption.authority_sequence + 1
        {
            return Err("candidate nonce consumption binding drift".to_owned());
        }
        let active_material_count = connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_materials AS material
                 JOIN lnsat_signed_approval_key_status_events AS status
                   ON status.material_ref = material.material_ref
                 WHERE material.material_ref = ?1
                   AND material.valid_from <= ?2
                   AND ?2 < material.valid_until
                   AND status.effective_at <= ?2
                   AND status.revision = (
                     SELECT max(latest.revision)
                     FROM lnsat_signed_approval_key_status_events AS latest
                     WHERE latest.material_ref = material.material_ref
                       AND latest.effective_at <= ?2
                   )
                   AND status.status = 'active'",
                params![material_ref, consumption.consumed_at],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|error| error.to_string())?;
        if active_material_count != 1 {
            return Err("candidate nonce consumption material-status drift".to_owned());
        }
        let expected = phase7d_nonce_consumption_content_digest(consumption);
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'nonce_consumption'
                   AND record_id = ?2",
                params![consumption.authority_sequence, consumption.consumption_id],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate nonce consumption content digest mismatch".to_owned());
        }
    }
    let consumed_event_count = connection
        .query_row(
            "SELECT count(*)
             FROM lnsat_signed_approval_nonce_events
             WHERE event_kind = 'consumed'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| error.to_string())?;
    if usize::try_from(consumed_event_count).ok() != Some(nonce_consumptions.len()) {
        return Err("candidate nonce consumption coverage mismatch".to_owned());
    }

    let mut evidence_issue_idempotency = connection
        .prepare(
            "SELECT
               replay.project_ref, replay.idempotency_key,
               replay.request_digest, replay.evidence_id,
               replay.created_at, evidence.decision_id,
               evidence.issued_at
             FROM lnsat_signed_approval_evidence_issue_idempotency AS replay
             JOIN lnsat_signed_approval_evidence AS evidence
               ON evidence.evidence_id = replay.evidence_id
              AND evidence.project_ref = replay.project_ref
             ORDER BY replay.project_ref, replay.idempotency_key",
        )
        .map_err(|error| error.to_string())?;
    let evidence_issue_idempotency = evidence_issue_idempotency
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Vec<u8>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    for (
        project_ref,
        _idempotency_key,
        request_digest,
        _evidence_id,
        created_at,
        decision_id,
        issued_at,
    ) in evidence_issue_idempotency
    {
        if request_digest != phase7d_evidence_issue_request_digest(&project_ref, &decision_id) {
            return Err("candidate evidence issue request digest mismatch".to_owned());
        }
        if created_at < issued_at {
            return Err("candidate evidence issue idempotency time mismatch".to_owned());
        }
    }

    let mut nonce_consume_idempotency = connection
        .prepare(
            "SELECT
               replay.project_ref, replay.idempotency_key,
               replay.request_digest, replay.consumption_id,
               replay.created_at, consumption.nonce_id,
               consumption.evidence_id, consumption.authorization_ref,
               consumption.authorization_digest, consumption.consumed_at
             FROM lnsat_signed_approval_nonce_consume_idempotency AS replay
             JOIN lnsat_signed_approval_nonce_consumptions AS consumption
               ON consumption.consumption_id = replay.consumption_id
              AND consumption.project_ref = replay.project_ref
             ORDER BY replay.project_ref, replay.idempotency_key",
        )
        .map_err(|error| error.to_string())?;
    let nonce_consume_idempotency = nonce_consume_idempotency
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Vec<u8>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, Vec<u8>>(8)?,
                row.get::<_, String>(9)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    for (
        project_ref,
        idempotency_key,
        request_digest,
        _consumption_id,
        created_at,
        nonce_id,
        evidence_id,
        authorization_ref,
        authorization_digest,
        consumed_at,
    ) in nonce_consume_idempotency
    {
        if !phase7d_valid_idempotency_key(&idempotency_key)
            || request_digest
                != phase7d_nonce_consume_request_digest(
                    &project_ref,
                    &nonce_id,
                    &evidence_id,
                    &authorization_ref,
                    &authorization_digest,
                )
        {
            return Err("candidate nonce consume request digest mismatch".to_owned());
        }
        if !phase7d_valid_idempotency_time(&created_at, &consumed_at) {
            return Err("candidate nonce consume idempotency time mismatch".to_owned());
        }
    }

    let mut verification_attempts = connection
        .prepare(
            "SELECT
               attempt.attempt_id, attempt.project_scope_digest,
               attempt.input_digest, attempt.result_code,
               attempt.reason_code, attempt.observed_at,
               attempt.authority_sequence, subject.evidence_id,
               subject.material_ref, evidence.project_ref,
               evidence.issued_at, evidence.expires_at
             FROM lnsat_signed_approval_verification_attempts AS attempt
             LEFT JOIN lnsat_signed_approval_verification_attempt_subjects AS subject
               ON subject.attempt_id = attempt.attempt_id
             LEFT JOIN lnsat_signed_approval_evidence AS evidence
               ON evidence.evidence_id = subject.evidence_id
              AND evidence.material_ref = subject.material_ref
             ORDER BY attempt.authority_sequence",
        )
        .map_err(|error| error.to_string())?;
    let verification_attempts = verification_attempts
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Vec<u8>>(1)?,
                row.get::<_, Vec<u8>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<String>>(11)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    for (
        attempt_id,
        project_scope_digest,
        input_digest,
        result_code,
        reason_code,
        observed_at,
        authority_sequence,
        evidence_id,
        material_ref,
        project_ref,
        issued_at,
        expires_at,
    ) in verification_attempts
    {
        if !phase7d_valid_verification_attempt_id(&attempt_id)
            || !phase7d_valid_verification_result(&result_code, &reason_code)
            || canonical_utc_timestamp_millis_v1(&observed_at).is_none()
        {
            return Err("candidate verification attempt value drift".to_owned());
        }
        let subject = match (evidence_id, material_ref) {
            (Some(evidence_id), Some(material_ref)) => {
                let (Some(project_ref), Some(issued_at), Some(expires_at)) =
                    (project_ref, issued_at, expires_at)
                else {
                    return Err("candidate verification attempt subject binding drift".to_owned());
                };
                if project_scope_digest != phase7d_verification_project_scope_digest(&project_ref)
                    || observed_at < issued_at
                    || (result_code == "verified" && observed_at >= expires_at)
                {
                    return Err("candidate verification attempt subject binding drift".to_owned());
                }
                Some(Phase7dVerificationAttemptSubject {
                    evidence_id,
                    material_ref,
                })
            }
            (None, None) => None,
            _ => {
                return Err("candidate verification attempt subject shape drift".to_owned());
            }
        };
        if result_code == "verified" && subject.is_none() {
            return Err("candidate verified attempt subject missing".to_owned());
        }
        let expected = phase7d_verification_attempt_content_digest(
            &attempt_id,
            &project_scope_digest,
            &input_digest,
            &result_code,
            &reason_code,
            &observed_at,
            subject.as_ref(),
        );
        let stored = connection
            .query_row(
                "SELECT content_digest
                 FROM lnsat_authority_order
                 WHERE sequence = ?1
                   AND record_family = 'verification_attempt'
                   AND record_id = ?2",
                params![authority_sequence, attempt_id],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .map_err(|error| error.to_string())?;
        if stored != expected {
            return Err("candidate verification attempt content digest mismatch".to_owned());
        }
    }

    let mut authority = connection
        .prepare(
            "SELECT
               sequence, record_family, record_id,
               content_digest, chain_digest, prior_chain_digest
             FROM lnsat_authority_order
             ORDER BY sequence",
        )
        .map_err(|error| error.to_string())?;
    let authority = authority
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Vec<u8>>(3)?,
                row.get::<_, Vec<u8>>(4)?,
                row.get::<_, Option<Vec<u8>>>(5)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let mut previous_chain: Option<Vec<u8>> = None;
    for (sequence, record_family, record_id, content_digest, chain_digest, prior_chain_digest) in
        authority
    {
        if prior_chain_digest != previous_chain {
            return Err("candidate authority prior-chain mismatch".to_owned());
        }
        let expected = phase7d_chain_digest(
            sequence,
            &record_family,
            &record_id,
            &content_digest,
            previous_chain.as_deref(),
        );
        if chain_digest != expected {
            return Err("candidate authority chain digest mismatch".to_owned());
        }
        let owner_count = match record_family.as_str() {
            "verification_material" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_materials
                 WHERE material_ref = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            "key_status_event" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_key_status_events
                 WHERE status_event_id = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            "nonce_identity" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_nonce_identities
                 WHERE nonce_id = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            "nonce_event" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_nonce_events
                 WHERE nonce_event_id = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            "signed_approval_evidence" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_evidence
                 WHERE evidence_id = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            "verification_attempt" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_attempts
                 WHERE attempt_id = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            "nonce_consumption" => connection.query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_nonce_consumptions
                 WHERE consumption_id = ?1
                   AND authority_sequence = ?2",
                params![record_id, sequence],
                |row| row.get::<_, i64>(0),
            ),
            _ => return Err("candidate authority family drift".to_owned()),
        }
        .map_err(|error| error.to_string())?;
        if owner_count != 1 {
            return Err("candidate authority owner mismatch".to_owned());
        }
        previous_chain = Some(chain_digest);
    }
    Ok(())
}

#[test]
fn phase7d_public_material_candidate_is_inert_and_future_to_runtime() {
    assert_eq!(SQLITE_SCHEMA_VERSION, 17);
    assert_eq!(MIGRATIONS.len(), 17);
    assert!(
        MIGRATIONS
            .iter()
            .all(|migration| migration.version <= SQLITE_SCHEMA_VERSION)
    );
    assert!(
        !Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("migrations/0018_phase7d_public_material_schema_candidate.sql")
            .exists()
    );

    let database = TestDatabase::new("phase7d-candidate-inert");
    drop(SqliteStore::open(&database.path).expect("v15 database must bootstrap"));
    let mut connection =
        Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("candidate database must open");
    configure_connection(&connection).expect("candidate database must configure");
    phase7d_apply_candidate(&mut connection).expect("candidate migration must apply manually");
    phase7d_candidate_schema_verify(&connection).expect("candidate schema must verify");
    drop(connection);

    assert_eq!(
        SqliteStore::open(&database.path)
            .err()
            .expect("runtime must reject unregistered candidate"),
        SqliteStoreError::UnsupportedSchemaVersion
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_public_material_candidate_enforces_relational_invariants() {
    let database = TestDatabase::new("phase7d-candidate-invariants");
    drop(SqliteStore::open(&database.path).expect("v15 database must bootstrap"));
    let mut connection =
        Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("candidate database must open");
    configure_connection(&connection).expect("candidate database must configure");
    phase7d_apply_candidate(&mut connection).expect("candidate migration must apply");

    assert!(
        connection
            .execute(
                "INSERT INTO lnsat_authority_order (
                   record_family, record_id, content_digest, chain_digest,
                   prior_chain_digest, committed_at
                 ) VALUES (
                   'verification_material', 'material:invalid-time',
                   ?1, ?2, NULL, '2026-07-27 12:00:00'
                 )",
                params![vec![0_u8; 32], vec![1_u8; 32]],
            )
            .is_err()
    );

    phase7d_append_material(
        &connection,
        "material:0001",
        "key:primary",
        1,
        &phase7d_test_spki(1),
        "2026-07-27T00:00:00.000Z",
        "2027-07-27T00:00:00.000Z",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("first material must append");
    phase7d_append_status(
        &connection,
        "status:0001",
        "material:0001",
        1,
        "active",
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
        "activated",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("first active status must append");

    {
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("authority backfill transaction must begin");
        let (latest_sequence, latest_chain) = transaction
            .query_row(
                "SELECT sequence, chain_digest
                 FROM lnsat_authority_order
                 ORDER BY sequence DESC
                 LIMIT 1",
                [],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Vec<u8>>(1)?)),
            )
            .expect("latest authority chain must inspect");
        let content_digest = vec![7_u8; 32];
        let later_sequence = latest_sequence + 2;
        let later_chain = phase7d_chain_digest(
            later_sequence,
            "verification_material",
            "material:future-gap",
            &content_digest,
            Some(&latest_chain),
        );
        transaction
            .execute(
                "INSERT INTO lnsat_authority_order (
                   sequence, record_family, record_id, content_digest,
                   chain_digest, prior_chain_digest, committed_at
                 ) VALUES (?1, 'verification_material', 'material:future-gap',
                           ?2, ?3, ?4, ?5)",
                params![
                    later_sequence,
                    content_digest,
                    later_chain,
                    latest_chain,
                    PHASE7D_CANDIDATE_TIMESTAMP
                ],
            )
            .expect("forward authority gap is allowed");
        let backfill_sequence = latest_sequence + 1;
        let backfill_chain = phase7d_chain_digest(
            backfill_sequence,
            "verification_material",
            "material:backfill-gap",
            &content_digest,
            Some(&latest_chain),
        );
        assert!(
            transaction
                .execute(
                    "INSERT INTO lnsat_authority_order (
                       sequence, record_family, record_id, content_digest,
                       chain_digest, prior_chain_digest, committed_at
                     ) VALUES (?1, 'verification_material', 'material:backfill-gap',
                               ?2, ?3, ?4, ?5)",
                    params![
                        backfill_sequence,
                        content_digest,
                        backfill_chain,
                        latest_chain,
                        PHASE7D_CANDIDATE_TIMESTAMP
                    ],
                )
                .is_err()
        );
    }

    assert!(
        connection
            .execute(
                "UPDATE lnsat_signed_approval_verification_materials
                 SET key_id = 'key:changed'
                 WHERE material_ref = 'material:0001'",
                [],
            )
            .is_err()
    );
    assert!(
        connection
            .execute("DELETE FROM lnsat_authority_order WHERE sequence = 1", [],)
            .is_err()
    );

    {
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("invalid predecessor transaction must begin");
        assert!(
            phase7d_append_material(
                &transaction,
                "material:invalid-predecessor",
                "key:primary",
                2,
                &phase7d_test_spki(2),
                "2026-07-27T00:00:00.000Z",
                "2027-07-27T00:00:00.000Z",
                None,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }

    phase7d_append_material(
        &connection,
        "material:0002",
        "key:primary",
        2,
        &phase7d_test_spki(2),
        "2026-07-27T00:00:00.000Z",
        "2027-07-27T00:00:00.000Z",
        Some("material:0001"),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("successor material must append");

    {
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("duplicate active transaction must begin");
        assert!(
            phase7d_append_status(
                &transaction,
                "status:0002-active-too-early",
                "material:0002",
                1,
                "active",
                PHASE7D_CANDIDATE_TIMESTAMP,
                PHASE7D_CANDIDATE_TIMESTAMP,
                "activated",
                None,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }

    phase7d_append_status(
        &connection,
        "status:0001-retired",
        "material:0001",
        2,
        "retired",
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
        "rotated",
        Some("status:0001"),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("active material must retire");
    phase7d_append_status(
        &connection,
        "status:0002",
        "material:0002",
        1,
        "active",
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
        "activated",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("successor must activate after retirement");
    phase7d_append_status(
        &connection,
        "status:0001-revoked",
        "material:0001",
        3,
        "revoked",
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
        "compromised",
        Some("status:0001-retired"),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("retired material may become terminal revoked");

    {
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("terminal transition transaction must begin");
        assert!(
            phase7d_append_status(
                &transaction,
                "status:0001-after-revoked",
                "material:0001",
                4,
                "retired",
                PHASE7D_CANDIDATE_TIMESTAMP,
                PHASE7D_CANDIDATE_TIMESTAMP,
                "operator_action",
                Some("status:0001-revoked"),
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }
    assert!(
        connection
            .execute(
                "DELETE FROM lnsat_signed_approval_key_status_events
                 WHERE status_event_id = 'status:0002'",
                [],
            )
            .is_err()
    );
    phase7d_candidate_schema_verify(&connection).expect("valid candidate records must verify");
}

#[test]
fn phase7d_public_material_candidate_orders_ten_thousand_clock_collisions() {
    let database = TestDatabase::new("phase7d-candidate-order");
    drop(SqliteStore::open(&database.path).expect("v15 database must bootstrap"));
    let mut connection =
        Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("candidate database must open");
    configure_connection(&connection).expect("candidate database must configure");
    phase7d_apply_candidate(&mut connection).expect("candidate migration must apply");

    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .expect("ordering transaction must begin");
    for sequence in 1_u64..=10_000 {
        let material_ref = format!("material:clock:{sequence:05}");
        let key_id = format!("key:clock:{sequence:05}");
        phase7d_append_material(
            &transaction,
            &material_ref,
            &key_id,
            1,
            &phase7d_test_spki(sequence),
            "2026-07-27T00:00:00.000Z",
            "2027-07-27T00:00:00.000Z",
            None,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("clock-collision material must append");
    }
    transaction
        .commit()
        .expect("ordering transaction must commit");

    let order = connection
        .query_row(
            "SELECT
               count(*), min(sequence), max(sequence),
               count(DISTINCT sequence), count(DISTINCT committed_at)
             FROM lnsat_authority_order",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                ))
            },
        )
        .expect("authority order must inspect");
    assert_eq!(order, (10_000, 1, 10_000, 10_000, 1));
    phase7d_candidate_schema_verify(&connection).expect("clock-collision chain must verify");
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_public_material_candidate_serializes_one_active_key_winner() {
    let database = TestDatabase::new("phase7d-candidate-race");
    drop(SqliteStore::open(&database.path).expect("v15 database must bootstrap"));
    let mut connection =
        Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("candidate database must open");
    configure_connection(&connection).expect("candidate database must configure");
    phase7d_apply_candidate(&mut connection).expect("candidate migration must apply");

    phase7d_append_material(
        &connection,
        "material:race:0001",
        "key:race",
        1,
        &phase7d_test_spki(20_001),
        "2026-07-27T00:00:00.000Z",
        "2027-07-27T00:00:00.000Z",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("initial race material must append");
    phase7d_append_status(
        &connection,
        "status:race:0001:active",
        "material:race:0001",
        1,
        "active",
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
        "activated",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("initial race status must append");
    phase7d_append_status(
        &connection,
        "status:race:0001:retired",
        "material:race:0001",
        2,
        "retired",
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
        "rotated",
        Some("status:race:0001:active"),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("initial race material must retire");
    for version in 2_i64..=33 {
        let material_ref = format!("material:race:{version:04}");
        let previous = format!("material:race:{:04}", version - 1);
        phase7d_append_material(
            &connection,
            &material_ref,
            "key:race",
            version,
            &phase7d_test_spki(20_000 + u64::try_from(version).expect("version must fit")),
            "2026-07-27T00:00:00.000Z",
            "2027-07-27T00:00:00.000Z",
            Some(&previous),
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("race successor material must append");
    }
    drop(connection);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for version in 2_i64..=33 {
        let path = database.path.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            barrier.wait();
            let transaction = connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .expect("race transaction must begin");
            let material_ref = format!("material:race:{version:04}");
            let status_event_id = format!("status:race:{version:04}:active");
            if phase7d_append_status(
                &transaction,
                &status_event_id,
                &material_ref,
                1,
                "active",
                PHASE7D_CANDIDATE_TIMESTAMP,
                PHASE7D_CANDIDATE_TIMESTAMP,
                "activated",
                None,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
            {
                return false;
            }
            transaction.commit().is_ok()
        }));
    }
    let winner_count = workers
        .into_iter()
        .map(|worker| usize::from(worker.join().expect("race worker must join")))
        .sum::<usize>();
    assert_eq!(winner_count, 1);

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    let active_count = connection
        .query_row(
            "WITH latest AS (
               SELECT material_ref, max(revision) AS revision
               FROM lnsat_signed_approval_key_status_events
               GROUP BY material_ref
             )
             SELECT count(*)
             FROM lnsat_signed_approval_key_status_events AS status
             JOIN latest
               ON latest.material_ref = status.material_ref
              AND latest.revision = status.revision
             JOIN lnsat_signed_approval_verification_materials AS material
               ON material.material_ref = status.material_ref
             WHERE material.key_id = 'key:race'
               AND status.status = 'active'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .expect("active race winner must inspect");
    assert_eq!(active_count, 1);
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_public_material_candidate_precommit_failure_rolls_back() {
    let database = TestDatabase::new("phase7d-candidate-precommit");
    drop(SqliteStore::open(&database.path).expect("v15 database must bootstrap"));
    let mut connection =
        Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("candidate database must open");
    configure_connection(&connection).expect("candidate database must configure");
    assert_eq!(
        apply_migration_with_precommit(&mut connection, PHASE7D_PUBLIC_MATERIAL_CANDIDATE, || Err(
            SqliteStoreError::MigrationFailed
        ),),
        Err(SqliteStoreError::MigrationFailed)
    );
    assert_eq!(
        pragma_i64(&connection, "user_version").expect("version must inspect"),
        SQLITE_SCHEMA_VERSION
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT schema_version
                 FROM lnsat_store_metadata
                 WHERE singleton = 1",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("metadata must inspect"),
        SQLITE_SCHEMA_VERSION
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*)
                 FROM sqlite_schema
                 WHERE name = 'lnsat_authority_order'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("candidate rollback must inspect"),
        0
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_schema_migrations
                 WHERE schema_version = 18",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("candidate ledger rollback must inspect"),
        0
    );
}

#[test]
fn phase7d_public_material_candidate_sqlite_full_rolls_back() {
    let database = TestDatabase::new("phase7d-candidate-full");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    store
        .connection
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;")
        .expect("candidate baseline must compact");
    let page_count = pragma_i64(&store.connection, "page_count").expect("page count must inspect");
    store
        .connection
        .pragma_update(None, "max_page_count", page_count)
        .expect("page count must constrain candidate");
    assert_eq!(
        phase7d_apply_candidate(&mut store.connection),
        Err(SqliteStoreError::MigrationFailed)
    );
    assert_eq!(
        pragma_i64(&store.connection, "user_version").expect("version must inspect"),
        SQLITE_SCHEMA_VERSION
    );
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*)
                 FROM sqlite_schema
                 WHERE name = 'lnsat_authority_order'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("full rollback must inspect"),
        0
    );
    store
        .connection
        .pragma_update(None, "max_page_count", page_count + 16_384)
        .expect("page count must restore");
    store.verify_schema().expect("v15 schema must remain exact");
}

#[test]
fn phase7d_public_material_candidate_detects_tamper_drift_and_future_version() {
    let tamper_database = TestDatabase::new("phase7d-candidate-tamper");
    drop(SqliteStore::open(&tamper_database.path).expect("v15 database must bootstrap"));
    let mut tamper =
        Connection::open_with_flags(&tamper_database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("tamper database must open");
    configure_connection(&tamper).expect("tamper database must configure");
    phase7d_apply_candidate(&mut tamper).expect("candidate migration must apply");
    phase7d_append_material(
        &tamper,
        "material:tamper",
        "key:tamper",
        1,
        &phase7d_test_spki(30_001),
        "2026-07-27T00:00:00.000Z",
        "2027-07-27T00:00:00.000Z",
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("tamper material must append");
    phase7d_candidate_schema_verify(&tamper).expect("baseline candidate must verify");
    tamper
        .execute_batch(
            "DROP TRIGGER lnsat_authority_order_reject_update;
             UPDATE lnsat_authority_order
             SET content_digest = zeroblob(32)
             WHERE sequence = 1;
             CREATE TRIGGER lnsat_authority_order_reject_update
             BEFORE UPDATE ON lnsat_authority_order
             BEGIN
               SELECT RAISE(ABORT, 'authority order is immutable');
             END;",
        )
        .expect("candidate tamper must apply");
    assert!(phase7d_candidate_schema_verify(&tamper).is_err());

    let drift_database = TestDatabase::new("phase7d-candidate-drift");
    drop(SqliteStore::open(&drift_database.path).expect("v15 database must bootstrap"));
    let mut drift =
        Connection::open_with_flags(&drift_database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("drift database must open");
    configure_connection(&drift).expect("drift database must configure");
    phase7d_apply_candidate(&mut drift).expect("candidate migration must apply");
    drift
        .execute(
            "UPDATE lnsat_schema_migrations
             SET migration_sha256 = ?1
             WHERE schema_version = 18",
            [format!("sha256:{}", "0".repeat(64))],
        )
        .expect("candidate drift must apply");
    assert!(phase7d_candidate_schema_verify(&drift).is_err());

    let future_database = TestDatabase::new("phase7d-candidate-future");
    drop(SqliteStore::open(&future_database.path).expect("v15 database must bootstrap"));
    let mut future =
        Connection::open_with_flags(&future_database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("future database must open");
    configure_connection(&future).expect("future database must configure");
    phase7d_apply_candidate(&mut future).expect("candidate migration must apply");
    future
        .pragma_update(None, "user_version", 19)
        .expect("future version must set");
    assert!(phase7d_candidate_schema_verify(&future).is_err());
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_nonce_lifecycle_candidate_binds_decision_and_enforces_transitions() {
    let database = TestDatabase::new("phase7d-nonce-invariants");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let (packet, policy, request, decision) = approval_decision_fixture();
    persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
    phase7d_apply_candidate(&mut store.connection).expect("candidate migration must apply");

    let nonce_id = phase7d_test_nonce(1);
    let duplicate_nonce_id = phase7d_test_nonce(2);
    let issued_at = "2026-07-22T20:03:00.000Z";
    let expires_at = format!("{}.000Z", decision.expires_at.trim_end_matches('Z'));
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("invalid issued transaction must begin");
        phase7d_append_nonce_identity(
            &transaction,
            &nonce_id,
            &packet.project_ref,
            &decision.approval_decision_id,
            issued_at,
            &expires_at,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("nonce identity must stage");
        assert!(
            phase7d_append_nonce_event(
                &transaction,
                "nonce-event:invalid-issued",
                &nonce_id,
                1,
                "issued",
                "2026-07-22T20:04:00.000Z",
                "2026-07-22T20:04:00.000Z",
                None,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_nonce_identities",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("rolled-back nonce count must inspect"),
        0
    );
    assert_eq!(
        store
            .connection
            .query_row("SELECT count(*) FROM lnsat_authority_order", [], |row| {
                row.get::<_, i64>(0)
            })
            .expect("rolled-back authority count must inspect"),
        0
    );

    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("valid issued transaction must begin");
        phase7d_append_nonce_identity(
            &transaction,
            &nonce_id,
            &packet.project_ref,
            &decision.approval_decision_id,
            issued_at,
            &expires_at,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("nonce identity must append");
        phase7d_append_nonce_event(
            &transaction,
            "nonce-event:issued",
            &nonce_id,
            1,
            "issued",
            issued_at,
            issued_at,
            None,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("nonce issued event must append");
        transaction
            .commit()
            .expect("valid issued transaction must commit");
    }

    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("duplicate decision transaction must begin");
        assert!(
            phase7d_append_nonce_identity(
                &transaction,
                &duplicate_nonce_id,
                &packet.project_ref,
                &decision.approval_decision_id,
                issued_at,
                &expires_at,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("cross-project transaction must begin");
        assert!(
            phase7d_append_nonce_identity(
                &transaction,
                &phase7d_test_nonce(6),
                "project:other",
                &decision.approval_decision_id,
                issued_at,
                &expires_at,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("invalid expiry transaction must begin");
        assert!(
            phase7d_append_nonce_event(
                &transaction,
                "nonce-event:expired-too-early",
                &nonce_id,
                2,
                "expired",
                "2026-07-22T20:04:00.000Z",
                "2026-07-22T20:04:00.000Z",
                Some("nonce-event:issued"),
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }

    phase7d_append_nonce_event(
        &store.connection,
        "nonce-event:cancelled",
        &nonce_id,
        2,
        "cancelled",
        "2026-07-22T20:04:00.000Z",
        "2026-07-22T20:04:00.000Z",
        Some("nonce-event:issued"),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("nonce cancellation must append");
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("duplicate terminal transaction must begin");
        assert!(
            phase7d_append_nonce_event(
                &transaction,
                "nonce-event:consumed-after-cancel",
                &nonce_id,
                2,
                "consumed",
                "2026-07-22T20:05:00.000Z",
                "2026-07-22T20:05:00.000Z",
                Some("nonce-event:issued"),
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }
    assert!(
        store
            .connection
            .execute(
                "UPDATE lnsat_signed_approval_nonce_identities
                 SET project_ref = 'project:changed'
                 WHERE nonce_id = ?1",
                [&nonce_id],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "DELETE FROM lnsat_signed_approval_nonce_events
                 WHERE nonce_event_id = 'nonce-event:cancelled'",
                [],
            )
            .is_err()
    );
    phase7d_candidate_schema_verify(&store.connection).expect("valid nonce lifecycle must verify");
}

#[test]
fn phase7d_nonce_lifecycle_candidate_serializes_one_terminal_winner() {
    let database = TestDatabase::new("phase7d-nonce-race");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let (packet, policy, request, decision) = approval_decision_fixture();
    persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
    phase7d_apply_candidate(&mut store.connection).expect("candidate migration must apply");
    let nonce_id = phase7d_test_nonce(3);
    let issued_at = "2026-07-22T20:03:00.000Z";
    let expires_at = format!("{}.000Z", decision.expires_at.trim_end_matches('Z'));
    phase7d_append_nonce_identity(
        &store.connection,
        &nonce_id,
        &packet.project_ref,
        &decision.approval_decision_id,
        issued_at,
        &expires_at,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("race nonce identity must append");
    phase7d_append_nonce_event(
        &store.connection,
        "nonce-event:race:issued",
        &nonce_id,
        1,
        "issued",
        issued_at,
        issued_at,
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("race nonce issued event must append");
    drop(store);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for worker_id in 1_u64..=32 {
        let path = database.path.clone();
        let nonce_id = nonce_id.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            barrier.wait();
            let transaction = connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .expect("race transaction must begin");
            let event_id = format!("nonce-event:race:terminal:{worker_id:02}");
            if phase7d_append_nonce_event(
                &transaction,
                &event_id,
                &nonce_id,
                2,
                "cancelled",
                "2026-07-22T20:04:00.000Z",
                "2026-07-22T20:04:00.000Z",
                Some("nonce-event:race:issued"),
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
            {
                return false;
            }
            transaction.commit().is_ok()
        }));
    }
    let winner_count = workers
        .into_iter()
        .map(|worker| usize::from(worker.join().expect("race worker must join")))
        .sum::<usize>();
    assert_eq!(winner_count, 1);

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_nonce_events
                 WHERE event_kind IN ('cancelled', 'expired', 'consumed')",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("terminal winner count must inspect"),
        1
    );
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_nonce_lifecycle_candidate_detects_nonce_digest_tamper() {
    let database = TestDatabase::new("phase7d-nonce-tamper");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let (packet, policy, request, decision) = approval_decision_fixture();
    persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
    phase7d_apply_candidate(&mut store.connection).expect("candidate migration must apply");
    let nonce_id = phase7d_test_nonce(4);
    let issued_at = "2026-07-22T20:03:00.000Z";
    let expires_at = format!("{}.000Z", decision.expires_at.trim_end_matches('Z'));
    phase7d_append_nonce_identity(
        &store.connection,
        &nonce_id,
        &packet.project_ref,
        &decision.approval_decision_id,
        issued_at,
        &expires_at,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("tamper nonce identity must append");
    phase7d_append_nonce_event(
        &store.connection,
        "nonce-event:tamper:issued",
        &nonce_id,
        1,
        "issued",
        issued_at,
        issued_at,
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("tamper nonce issued event must append");
    phase7d_candidate_schema_verify(&store.connection)
        .expect("baseline nonce candidate must verify");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_signed_approval_nonce_identities_reject_update;
             UPDATE lnsat_signed_approval_nonce_identities
             SET nonce_digest = zeroblob(32);
             CREATE TRIGGER lnsat_signed_approval_nonce_identities_reject_update
             BEFORE UPDATE ON lnsat_signed_approval_nonce_identities
             BEGIN
               SELECT RAISE(ABORT, 'nonce identities are immutable');
             END;",
        )
        .expect("nonce digest tamper must apply");
    assert_eq!(
        phase7d_candidate_schema_verify(&store.connection)
            .expect_err("nonce digest tamper must fail verification"),
        "candidate nonce digest mismatch"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_signed_evidence_candidate_binds_chain_and_stays_immutable() {
    let database = TestDatabase::new("phase7d-signed-evidence-invariants");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    let baseline_authority_count = store
        .connection
        .query_row("SELECT count(*) FROM lnsat_authority_order", [], |row| {
            row.get::<_, i64>(0)
        })
        .expect("setup authority count must inspect");

    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("cross-project evidence transaction must begin");
        let mut cross_project = fixture.clone();
        cross_project.project_ref = "project:other".to_owned();
        assert!(
            phase7d_append_signed_evidence(
                &transaction,
                &cross_project,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_err()
        );
    }
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("terminal nonce evidence transaction must begin");
        phase7d_append_nonce_event(
            &transaction,
            "nonce-event:evidence:cancelled",
            &fixture.nonce_id,
            2,
            "cancelled",
            "2026-07-22T20:04:00.000Z",
            "2026-07-22T20:04:00.000Z",
            Some("nonce-event:evidence:issued"),
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("terminal nonce event must stage");
        assert!(
            phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP,)
                .is_err()
        );
    }
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*) FROM lnsat_signed_approval_evidence",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("rolled-back evidence count must inspect"),
        0
    );
    assert_eq!(
        store
            .connection
            .query_row("SELECT count(*) FROM lnsat_authority_order", [], |row| {
                row.get::<_, i64>(0)
            })
            .expect("rolled-back authority count must inspect"),
        baseline_authority_count
    );

    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("valid evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("signed evidence must append");
        transaction
            .commit()
            .expect("valid evidence transaction must commit");
    }
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("duplicate evidence transaction must begin");
        assert!(
            phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP,)
                .is_err()
        );
    }
    assert!(
        store
            .connection
            .execute(
                "UPDATE lnsat_signed_approval_evidence
                 SET signature = zeroblob(64)
                 WHERE evidence_id = ?1",
                [&fixture.evidence_id],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "DELETE FROM lnsat_signed_approval_evidence
                 WHERE evidence_id = ?1",
                [&fixture.evidence_id],
            )
            .is_err()
    );
    phase7d_candidate_schema_verify(&store.connection).expect("valid signed evidence must verify");
}

#[test]
fn phase7d_signed_evidence_candidate_serializes_one_decision_winner() {
    let database = TestDatabase::new("phase7d-signed-evidence-race");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    drop(store);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for _ in 0..32 {
        let path = database.path.clone();
        let fixture = fixture.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            barrier.wait();
            let transaction = connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .expect("race transaction must begin");
            if phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
                .is_err()
            {
                return false;
            }
            transaction.commit().is_ok()
        }));
    }
    let winner_count = workers
        .into_iter()
        .map(|worker| usize::from(worker.join().expect("race worker must join")))
        .sum::<usize>();
    assert_eq!(winner_count, 1);

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*) FROM lnsat_signed_approval_evidence",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("evidence race winner count must inspect"),
        1
    );
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_signed_evidence_candidate_detects_signature_tamper() {
    let database = TestDatabase::new("phase7d-signed-evidence-tamper");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("tamper baseline transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("tamper baseline evidence must append");
        transaction
            .commit()
            .expect("tamper baseline transaction must commit");
    }
    phase7d_candidate_schema_verify(&store.connection)
        .expect("baseline signed evidence must verify");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_signed_approval_evidence_reject_update;
             UPDATE lnsat_signed_approval_evidence
             SET signature = zeroblob(64);
             CREATE TRIGGER lnsat_signed_approval_evidence_reject_update
             BEFORE UPDATE ON lnsat_signed_approval_evidence
             BEGIN
               SELECT RAISE(ABORT, 'signed approval evidence is immutable');
             END;",
        )
        .expect("signed evidence tamper must apply");
    assert_eq!(
        phase7d_candidate_schema_verify(&store.connection)
            .expect_err("signature tamper must fail verification"),
        "candidate signed evidence content digest mismatch"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_evidence_issue_idempotency_candidate_replays_conflicts_and_isolates_scope() {
    let database = TestDatabase::new("phase7d-evidence-idempotency");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    let request_digest =
        phase7d_evidence_issue_request_digest(&fixture.project_ref, &fixture.decision_id);
    let primary_key = "idem_evidence_issue_primary";

    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("initial issuance transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("initial signed evidence must append");
        assert_eq!(
            phase7d_resolve_evidence_issue_idempotency(
                &transaction,
                &fixture,
                primary_key,
                &request_digest,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .expect("initial idempotency binding must append"),
            Phase7dEvidenceIssueIdempotencyOutcome {
                created: true,
                evidence_id: fixture.evidence_id.clone(),
            }
        );
        transaction
            .commit()
            .expect("initial issuance transaction must commit");
    }
    phase7d_candidate_schema_verify(&store.connection)
        .expect("initial idempotency binding must verify");

    let changes_before_replay = store.connection.total_changes();
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("exact replay transaction must begin");
        assert_eq!(
            phase7d_resolve_evidence_issue_idempotency(
                &transaction,
                &fixture,
                primary_key,
                &request_digest,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .expect("exact replay must resolve"),
            Phase7dEvidenceIssueIdempotencyOutcome {
                created: false,
                evidence_id: fixture.evidence_id.clone(),
            }
        );
        transaction
            .commit()
            .expect("exact replay transaction must commit");
    }
    assert_eq!(store.connection.total_changes(), changes_before_replay);

    let changes_before_alias = store.connection.total_changes();
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("same-request alias transaction must begin");
        assert_eq!(
            phase7d_resolve_evidence_issue_idempotency(
                &transaction,
                &fixture,
                "idem_evidence_issue_same_request",
                &request_digest,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .expect("same request under another key must resolve"),
            Phase7dEvidenceIssueIdempotencyOutcome {
                created: false,
                evidence_id: fixture.evidence_id.clone(),
            }
        );
        transaction
            .commit()
            .expect("same-request alias transaction must commit");
    }
    assert_eq!(store.connection.total_changes(), changes_before_alias);

    let mut conflicting_digest = request_digest.clone();
    conflicting_digest[0] ^= 0xff;
    assert_eq!(
        phase7d_resolve_evidence_issue_idempotency(
            &store.connection,
            &fixture,
            primary_key,
            &conflicting_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate evidence issue idempotency conflict".to_owned())
    );
    assert_eq!(
        phase7d_resolve_evidence_issue_idempotency(
            &store.connection,
            &fixture,
            "IDEM_INVALID",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate evidence issue idempotency request invalid".to_owned())
    );
    assert_eq!(
        phase7d_resolve_evidence_issue_idempotency(
            &store.connection,
            &fixture,
            "idem_evidence_issue_before_evidence",
            &request_digest,
            "2026-07-22T19:59:59.999Z",
        ),
        Err("candidate evidence issue idempotency request invalid".to_owned())
    );
    assert_eq!(
        phase7d_resolve_evidence_issue_idempotency(
            &store.connection,
            &fixture,
            "idem_evidence_issue_conflict",
            &conflicting_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate evidence issue idempotency conflict".to_owned())
    );

    let cross_project_result = store
        .connection
        .query_row(
            "SELECT evidence_id
             FROM lnsat_signed_approval_evidence_issue_idempotency
             WHERE project_ref = 'project:other'
               AND idempotency_key = ?1",
            [primary_key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .expect("cross-project lookup must remain bounded");
    assert!(cross_project_result.is_none());
    assert!(
        store
            .connection
            .execute(
                "INSERT INTO lnsat_signed_approval_evidence_issue_idempotency (
                   project_ref, idempotency_key, request_digest,
                   evidence_id, created_at
                 ) VALUES (
                   'project:other', 'idem_evidence_issue_cross_project',
                   ?1, ?2, ?3
                 )",
                params![
                    request_digest,
                    fixture.evidence_id,
                    PHASE7D_CANDIDATE_TIMESTAMP
                ],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "INSERT INTO lnsat_signed_approval_evidence_issue_idempotency (
                   project_ref, idempotency_key, request_digest,
                   evidence_id, created_at
                 ) VALUES (?1, 'idem_evidence_issue_duplicate_result', ?2, ?3, ?4)",
                params![
                    fixture.project_ref,
                    request_digest,
                    fixture.evidence_id,
                    PHASE7D_CANDIDATE_TIMESTAMP
                ],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "UPDATE lnsat_signed_approval_evidence_issue_idempotency
                 SET request_digest = zeroblob(32)
                 WHERE project_ref = ?1
                   AND idempotency_key = ?2",
                params![fixture.project_ref, primary_key],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "DELETE FROM lnsat_signed_approval_evidence_issue_idempotency
                 WHERE project_ref = ?1
                   AND idempotency_key = ?2",
                params![fixture.project_ref, primary_key],
            )
            .is_err()
    );
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_evidence_issue_idempotency",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("idempotency binding count must inspect"),
        1
    );
    phase7d_candidate_schema_verify(&store.connection)
        .expect("idempotency replay state must verify");
}

#[test]
fn phase7d_evidence_issue_idempotency_candidate_serializes_one_binding() {
    let database = TestDatabase::new("phase7d-evidence-idempotency-race");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("race evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("race evidence must append");
        transaction
            .commit()
            .expect("race evidence transaction must commit");
    }
    drop(store);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for _ in 0..32 {
        let path = database.path.clone();
        let fixture = fixture.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            let request_digest =
                phase7d_evidence_issue_request_digest(&fixture.project_ref, &fixture.decision_id);
            barrier.wait();
            let transaction = connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .expect("race transaction must begin");
            let outcome = phase7d_resolve_evidence_issue_idempotency(
                &transaction,
                &fixture,
                "idem_evidence_issue_race",
                &request_digest,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .expect("competing idempotency request must resolve");
            transaction.commit().expect("race transaction must commit");
            outcome.created
        }));
    }
    let outcomes = workers
        .into_iter()
        .map(|worker| worker.join().expect("race worker must join"))
        .collect::<Vec<_>>();
    assert_eq!(outcomes.iter().filter(|created| **created).count(), 1);
    assert_eq!(outcomes.iter().filter(|created| !**created).count(), 31);

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_evidence_issue_idempotency",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("race idempotency count must inspect"),
        1
    );
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_evidence_issue_idempotency_candidate_detects_request_digest_tamper() {
    let database = TestDatabase::new("phase7d-evidence-idempotency-tamper");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    let request_digest =
        phase7d_evidence_issue_request_digest(&fixture.project_ref, &fixture.decision_id);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("tamper baseline transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("tamper baseline evidence must append");
        phase7d_resolve_evidence_issue_idempotency(
            &transaction,
            &fixture,
            "idem_evidence_issue_tamper",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("tamper baseline idempotency must append");
        transaction
            .commit()
            .expect("tamper baseline transaction must commit");
    }
    phase7d_candidate_schema_verify(&store.connection).expect("baseline idempotency must verify");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_signed_approval_evidence_issue_idempotency_reject_update;
             UPDATE lnsat_signed_approval_evidence_issue_idempotency
             SET request_digest = zeroblob(32);
             CREATE TRIGGER lnsat_signed_approval_evidence_issue_idempotency_reject_update
             BEFORE UPDATE ON lnsat_signed_approval_evidence_issue_idempotency
             BEGIN
               SELECT RAISE(ABORT, 'signed approval evidence issuance idempotency is immutable');
             END;",
        )
        .expect("idempotency request digest tamper must apply");
    assert_eq!(
        phase7d_resolve_evidence_issue_idempotency(
            &store.connection,
            &fixture,
            "idem_evidence_issue_tamper",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate evidence issue idempotency conflict".to_owned())
    );
    assert_eq!(
        phase7d_candidate_schema_verify(&store.connection)
            .expect_err("idempotency request digest tamper must fail verification"),
        "candidate evidence issue request digest mismatch"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_verification_attempt_candidate_records_resolved_and_unresolved_results() {
    let database = TestDatabase::new("phase7d-verification-attempt-invariants");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("attempt evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("attempt evidence must append");
        transaction
            .commit()
            .expect("attempt evidence transaction must commit");
    }
    let subject = Phase7dVerificationAttemptSubject {
        evidence_id: fixture.evidence_id.clone(),
        material_ref: fixture.material_ref.clone(),
    };
    let verified_attempt = phase7d_test_verification_attempt(1);
    phase7d_record_verification_attempt(
        &mut store.connection,
        &verified_attempt,
        &fixture.project_ref,
        &fixture.canonical_payload,
        "verified",
        "verified",
        &fixture.issued_at,
        Some(&subject),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("resolved verified attempt must commit before return");

    let hostile_input = b"{hostile-unresolved-input";
    phase7d_record_verification_attempt(
        &mut store.connection,
        &phase7d_test_verification_attempt(2),
        &fixture.project_ref,
        hostile_input,
        "rejected",
        "signed_approval.invalid_json",
        PHASE7D_CANDIDATE_TIMESTAMP,
        None,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("unresolved rejected attempt must persist digest only");
    phase7d_record_verification_attempt(
        &mut store.connection,
        &phase7d_test_verification_attempt(3),
        &fixture.project_ref,
        &fixture.canonical_payload,
        "rejected",
        "signed_approval.evidence_expired",
        PHASE7D_CANDIDATE_TIMESTAMP,
        Some(&subject),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("resolved rejected attempt must preserve bounded subject");

    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_attempts",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("attempt count must inspect"),
        3
    );
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_attempt_subjects",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("attempt subject count must inspect"),
        2
    );
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT input_digest
                 FROM lnsat_signed_approval_verification_attempts
                 WHERE attempt_id = ?1",
                [&phase7d_test_verification_attempt(2)],
                |row| row.get::<_, Vec<u8>>(0),
            )
            .expect("unresolved input digest must inspect"),
        phase7d_verification_input_digest(hostile_input)
    );
    assert_eq!(
        phase7d_record_verification_attempt(
            &mut store.connection,
            &phase7d_test_verification_attempt(4),
            &fixture.project_ref,
            &fixture.canonical_payload,
            "verified",
            "verified",
            &fixture.issued_at,
            None,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate verification attempt request invalid".to_owned())
    );
    assert_eq!(
        phase7d_record_verification_attempt(
            &mut store.connection,
            "vat_NOT_CANONICAL",
            &fixture.project_ref,
            &fixture.canonical_payload,
            "rejected",
            "signed_approval.invalid_json",
            PHASE7D_CANDIDATE_TIMESTAMP,
            None,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate verification attempt request invalid".to_owned())
    );
    let wrong_subject = Phase7dVerificationAttemptSubject {
        evidence_id: fixture.evidence_id.clone(),
        material_ref: format!("avm_{}", "f".repeat(64)),
    };
    assert_eq!(
        phase7d_record_verification_attempt(
            &mut store.connection,
            &phase7d_test_verification_attempt(5),
            &fixture.project_ref,
            &fixture.canonical_payload,
            "rejected",
            "signed_approval.key_unknown",
            PHASE7D_CANDIDATE_TIMESTAMP,
            Some(&wrong_subject),
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate verification attempt subject invalid".to_owned())
    );
    assert!(
        store
            .connection
            .execute(
                "UPDATE lnsat_signed_approval_verification_attempts
             SET reason_code = 'signed_approval.invalid_json'
             WHERE attempt_id = ?1",
                [&verified_attempt],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "DELETE FROM lnsat_signed_approval_verification_attempt_subjects
             WHERE attempt_id = ?1",
                [&verified_attempt],
            )
            .is_err()
    );
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("missing-subject transaction must begin");
        let attempt_id = phase7d_test_verification_attempt(6);
        let project_scope_digest = phase7d_verification_project_scope_digest(&fixture.project_ref);
        let input_digest = phase7d_verification_input_digest(&fixture.canonical_payload);
        let content_digest = phase7d_verification_attempt_content_digest(
            &attempt_id,
            &project_scope_digest,
            &input_digest,
            "verified",
            "verified",
            &fixture.issued_at,
            None,
        );
        let authority_sequence = phase7d_append_authority(
            &transaction,
            "verification_attempt",
            &attempt_id,
            &content_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("missing-subject authority row must stage");
        transaction
            .execute(
                "INSERT INTO lnsat_signed_approval_verification_attempts (
                   attempt_id, project_scope_digest, input_digest,
                   result_code, reason_code, observed_at, authority_sequence
                 ) VALUES (?1, ?2, ?3, 'verified', 'verified', ?4, ?5)",
                params![
                    attempt_id,
                    project_scope_digest,
                    input_digest,
                    fixture.issued_at,
                    authority_sequence
                ],
            )
            .expect("missing-subject direct SQL row must stage");
        assert_eq!(
            phase7d_candidate_schema_verify(&transaction)
                .expect_err("verified attempt without subject must fail verification"),
            "candidate verified attempt subject missing"
        );
        transaction
            .rollback()
            .expect("missing-subject transaction must roll back");
    }
    phase7d_candidate_schema_verify(&store.connection)
        .expect("verification attempt candidate must verify");
}

#[test]
fn phase7d_verification_attempt_candidate_freezes_closed_reason_taxonomy() {
    let database = TestDatabase::new("phase7d-verification-attempt-reasons");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    for (index, reason_code) in PHASE7D_VERIFICATION_REJECTION_REASONS.iter().enumerate() {
        phase7d_record_verification_attempt(
            &mut store.connection,
            &phase7d_test_verification_attempt(
                1_000 + u64::try_from(index).expect("reason index must fit"),
            ),
            &fixture.project_ref,
            reason_code.as_bytes(),
            "rejected",
            reason_code,
            PHASE7D_CANDIDATE_TIMESTAMP,
            None,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("canonical rejection reason must persist");
    }
    let mut reasons = store
        .connection
        .prepare(
            "SELECT reason_code
             FROM lnsat_signed_approval_verification_attempts
             ORDER BY attempt_id",
        )
        .expect("rejection reasons must prepare");
    let reasons = reasons
        .query_map([], |row| row.get::<_, String>(0))
        .expect("rejection reasons must query")
        .collect::<rusqlite::Result<Vec<_>>>()
        .expect("rejection reasons must collect");
    assert_eq!(
        reasons,
        PHASE7D_VERIFICATION_REJECTION_REASONS
            .iter()
            .map(|reason| (*reason).to_owned())
            .collect::<Vec<_>>()
    );
    phase7d_candidate_schema_verify(&store.connection)
        .expect("closed rejection taxonomy must verify");
}

#[test]
fn phase7d_verification_attempt_candidate_rolls_back_required_audit_failure() {
    let database = TestDatabase::new("phase7d-verification-attempt-audit-failure");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("audit evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("audit evidence must append");
        transaction
            .commit()
            .expect("audit evidence transaction must commit");
    }
    let subject = Phase7dVerificationAttemptSubject {
        evidence_id: fixture.evidence_id.clone(),
        material_ref: fixture.material_ref.clone(),
    };
    let authority_count_before = store
        .connection
        .query_row("SELECT count(*) FROM lnsat_authority_order", [], |row| {
            row.get::<_, i64>(0)
        })
        .expect("authority count must inspect");
    store
        .connection
        .execute_batch(
            "CREATE TRIGGER phase7d_test_reject_attempt_subject
             BEFORE INSERT ON lnsat_signed_approval_verification_attempt_subjects
             BEGIN
               SELECT RAISE(ABORT, 'injected verification audit failure');
             END;",
        )
        .expect("audit failure trigger must install");
    assert!(
        phase7d_record_verification_attempt(
            &mut store.connection,
            &phase7d_test_verification_attempt(10),
            &fixture.project_ref,
            &fixture.canonical_payload,
            "verified",
            "verified",
            &fixture.issued_at,
            Some(&subject),
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .is_err()
    );
    store
        .connection
        .execute_batch("DROP TRIGGER phase7d_test_reject_attempt_subject;")
        .expect("audit failure trigger must drop");
    assert_eq!(
        store
            .connection
            .query_row("SELECT count(*) FROM lnsat_authority_order", [], |row| {
                row.get::<_, i64>(0)
            })
            .expect("rolled-back authority count must inspect"),
        authority_count_before
    );
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_attempts",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("rolled-back attempt count must inspect"),
        0
    );
    phase7d_candidate_schema_verify(&store.connection)
        .expect("audit failure rollback must leave valid candidate");
}

#[test]
fn phase7d_verification_attempt_candidate_serializes_thirty_two_writers() {
    let database = TestDatabase::new("phase7d-verification-attempt-race");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("race evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("race evidence must append");
        transaction
            .commit()
            .expect("race evidence transaction must commit");
    }
    drop(store);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for worker_id in 1_u64..=32 {
        let path = database.path.clone();
        let fixture = fixture.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            let subject = Phase7dVerificationAttemptSubject {
                evidence_id: fixture.evidence_id.clone(),
                material_ref: fixture.material_ref.clone(),
            };
            barrier.wait();
            phase7d_record_verification_attempt(
                &mut connection,
                &phase7d_test_verification_attempt(100 + worker_id),
                &fixture.project_ref,
                &fixture.canonical_payload,
                "verified",
                "verified",
                &fixture.issued_at,
                Some(&subject),
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .expect("competing verification attempt must commit")
        }));
    }
    let mut sequences = workers
        .into_iter()
        .map(|worker| worker.join().expect("race worker must join"))
        .collect::<Vec<_>>();
    sequences.sort_unstable();
    sequences.dedup();
    assert_eq!(sequences.len(), 32);

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    assert_eq!(
        connection
            .query_row(
                "SELECT count(*)
                 FROM lnsat_signed_approval_verification_attempts",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("race attempt count must inspect"),
        32
    );
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_verification_attempt_candidate_detects_digest_tamper() {
    let database = TestDatabase::new("phase7d-verification-attempt-tamper");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("tamper evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("tamper evidence must append");
        transaction
            .commit()
            .expect("tamper evidence transaction must commit");
    }
    let subject = Phase7dVerificationAttemptSubject {
        evidence_id: fixture.evidence_id.clone(),
        material_ref: fixture.material_ref.clone(),
    };
    phase7d_record_verification_attempt(
        &mut store.connection,
        &phase7d_test_verification_attempt(200),
        &fixture.project_ref,
        &fixture.canonical_payload,
        "verified",
        "verified",
        &fixture.issued_at,
        Some(&subject),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("tamper baseline attempt must commit");
    phase7d_candidate_schema_verify(&store.connection)
        .expect("tamper baseline attempt must verify");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_signed_approval_verification_attempts_reject_update;
             UPDATE lnsat_signed_approval_verification_attempts
             SET input_digest = zeroblob(32);
             CREATE TRIGGER lnsat_signed_approval_verification_attempts_reject_update
             BEFORE UPDATE ON lnsat_signed_approval_verification_attempts
             BEGIN
               SELECT RAISE(ABORT, 'verification attempts are immutable');
             END;",
        )
        .expect("verification attempt digest tamper must apply");
    assert_eq!(
        phase7d_candidate_schema_verify(&store.connection)
            .expect_err("verification attempt digest tamper must fail verification"),
        "candidate verification attempt content digest mismatch"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_nonce_consumption_candidate_binds_and_stays_immutable() {
    let database = TestDatabase::new("phase7d-nonce-consumption-invariants");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    {
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("consumption evidence transaction must begin");
        phase7d_append_signed_evidence(&transaction, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
            .expect("consumption evidence must append");
        transaction
            .commit()
            .expect("consumption evidence transaction must commit");
    }
    let consumption_id = phase7d_test_nonce_consumption(1);
    let authorization_ref = "authorization_bundle:phase7d-consumption-fixture";
    let authorization = br#"{"authorization":"synthetic-test-only","execution":false}"#;
    let consumed_at = "2026-07-22T20:04:00.000Z";

    assert_eq!(
        phase7d_consume_nonce(
            &mut store.connection,
            &phase7d_test_nonce_consumption(2),
            "project:other",
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            consumed_at,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption evidence invalid".to_owned())
    );
    assert_eq!(
        phase7d_consume_nonce(
            &mut store.connection,
            &phase7d_test_nonce_consumption(2),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            "not-a-ref",
            authorization,
            consumed_at,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption request invalid".to_owned())
    );
    assert_eq!(
        phase7d_consume_nonce(
            &mut store.connection,
            &phase7d_test_nonce_consumption(2),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            &fixture.expires_at,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption evidence invalid".to_owned())
    );

    let consumption_sequence = phase7d_consume_nonce(
        &mut store.connection,
        &consumption_id,
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        authorization_ref,
        authorization,
        consumed_at,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("nonce consumption must commit before return");
    let stored = store
        .connection
        .query_row(
            "SELECT
               project_ref, nonce_id, evidence_id, authorization_ref,
               authorization_digest, consumed_at, authority_sequence
             FROM lnsat_signed_approval_nonce_consumptions
             WHERE consumption_id = ?1",
            [&consumption_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Vec<u8>>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, i64>(6)?,
                ))
            },
        )
        .expect("consumption must inspect");
    assert_eq!(stored.0, fixture.project_ref);
    assert_eq!(stored.1, fixture.nonce_id);
    assert_eq!(stored.2, fixture.evidence_id);
    assert_eq!(stored.3, authorization_ref);
    assert_eq!(stored.4, phase7d_authorization_digest(authorization));
    assert_eq!(stored.5, consumed_at);
    assert_eq!(stored.6, consumption_sequence);
    assert_eq!(
        store
            .connection
            .query_row(
                "SELECT authority_sequence
                 FROM lnsat_signed_approval_nonce_events
                 WHERE nonce_id = ?1
                   AND event_kind = 'consumed'",
                [&fixture.nonce_id],
                |row| row.get::<_, i64>(0),
            )
            .expect("consumed event must inspect"),
        consumption_sequence + 1
    );
    assert_eq!(
        phase7d_consume_nonce(
            &mut store.connection,
            &phase7d_test_nonce_consumption(3),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            "authorization_bundle:phase7d-consumption-replay",
            b"replay-must-not-consume",
            consumed_at,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption nonce unavailable".to_owned())
    );
    assert!(
        store
            .connection
            .execute(
                "UPDATE lnsat_signed_approval_nonce_consumptions
                 SET authorization_ref = 'authorization_bundle:changed'
                 WHERE consumption_id = ?1",
                [&consumption_id],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "DELETE FROM lnsat_signed_approval_nonce_consumptions
                 WHERE consumption_id = ?1",
                [&consumption_id],
            )
            .is_err()
    );
    let mut columns = store
        .connection
        .prepare("PRAGMA table_info(lnsat_signed_approval_nonce_consumptions)")
        .expect("consumption columns must inspect");
    let columns = columns
        .query_map([], |row| row.get::<_, String>(1))
        .expect("consumption columns must query")
        .collect::<rusqlite::Result<std::collections::BTreeSet<_>>>()
        .expect("consumption columns must collect");
    assert_eq!(
        columns,
        [
            "authorization_digest",
            "authorization_ref",
            "authority_sequence",
            "consumed_at",
            "consumption_id",
            "evidence_id",
            "nonce_id",
            "project_ref",
        ]
        .into_iter()
        .map(str::to_owned)
        .collect()
    );
    phase7d_candidate_schema_verify(&store.connection)
        .expect("nonce consumption candidate must verify");
}

#[test]
fn phase7d_nonce_consumption_candidate_rolls_back_terminal_event_failure() {
    let database = TestDatabase::new("phase7d-nonce-consumption-rollback");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("rollback evidence must append");
    store
        .connection
        .execute_batch(
            "CREATE TRIGGER phase7d_test_reject_consumed_event
             BEFORE INSERT ON lnsat_signed_approval_nonce_events
             WHEN NEW.event_kind = 'consumed'
             BEGIN
               SELECT RAISE(ABORT, 'injected consumed-event failure');
             END;",
        )
        .expect("consumed-event failure must inject");
    assert!(
        phase7d_consume_nonce(
            &mut store.connection,
            &phase7d_test_nonce_consumption(10),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            "authorization_bundle:phase7d-consumption-rollback",
            b"rollback-authorization",
            "2026-07-22T20:04:00.000Z",
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .is_err()
    );
    store
        .connection
        .execute_batch("DROP TRIGGER phase7d_test_reject_consumed_event;")
        .expect("consumed-event failure trigger must drop");
    for (table, predicate) in [
        (
            "lnsat_signed_approval_nonce_consumptions",
            "consumption_id = 'nsc_000000000000000000000000000000000000000000000000000000000000000a'",
        ),
        (
            "lnsat_signed_approval_nonce_events",
            "event_kind = 'consumed'",
        ),
        (
            "lnsat_authority_order",
            "record_family = 'nonce_consumption'",
        ),
    ] {
        let count = store
            .connection
            .query_row(
                &format!("SELECT count(*) FROM {table} WHERE {predicate}"),
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("rollback count must inspect");
        assert_eq!(count, 0, "{table}");
    }
    phase7d_candidate_schema_verify(&store.connection)
        .expect("rolled-back consumption must leave valid candidate");
}

#[test]
fn phase7d_nonce_consumption_candidate_serializes_thirty_two_writers() {
    let database = TestDatabase::new("phase7d-nonce-consumption-race");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("race evidence must append");
    drop(store);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for worker_id in 1_u64..=32 {
        let path = database.path.clone();
        let fixture = fixture.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            barrier.wait();
            phase7d_consume_nonce(
                &mut connection,
                &phase7d_test_nonce_consumption(100 + worker_id),
                &fixture.project_ref,
                &fixture.nonce_id,
                &fixture.evidence_id,
                &format!("authorization_bundle:phase7d-race-{worker_id:02}"),
                format!("race-authorization-{worker_id:02}").as_bytes(),
                "2026-07-22T20:04:00.000Z",
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
            .is_ok()
        }));
    }
    let winner_count = workers
        .into_iter()
        .map(|worker| usize::from(worker.join().expect("race worker must join")))
        .sum::<usize>();
    assert_eq!(winner_count, 1);

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    for (table, predicate) in [
        ("lnsat_signed_approval_nonce_consumptions", "1 = 1"),
        (
            "lnsat_signed_approval_nonce_events",
            "event_kind = 'consumed'",
        ),
        (
            "lnsat_authority_order",
            "record_family = 'nonce_consumption'",
        ),
    ] {
        let count = connection
            .query_row(
                &format!("SELECT count(*) FROM {table} WHERE {predicate}"),
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("race winner count must inspect");
        assert_eq!(count, 1, "{table}");
    }
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_nonce_consumption_candidate_detects_digest_tamper() {
    let database = TestDatabase::new("phase7d-nonce-consumption-tamper");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("tamper evidence must append");
    phase7d_consume_nonce(
        &mut store.connection,
        &phase7d_test_nonce_consumption(200),
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        "authorization_bundle:phase7d-consumption-tamper",
        b"tamper-authorization",
        "2026-07-22T20:04:00.000Z",
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("tamper baseline consumption must commit");
    phase7d_candidate_schema_verify(&store.connection)
        .expect("tamper baseline consumption must verify");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_signed_approval_nonce_consumptions_reject_update;
             UPDATE lnsat_signed_approval_nonce_consumptions
             SET authorization_digest = zeroblob(32);
             CREATE TRIGGER lnsat_signed_approval_nonce_consumptions_reject_update
             BEFORE UPDATE ON lnsat_signed_approval_nonce_consumptions
             BEGIN
               SELECT RAISE(ABORT, 'nonce consumptions are immutable');
             END;",
        )
        .expect("consumption authorization digest tamper must apply");
    assert_eq!(
        phase7d_candidate_schema_verify(&store.connection)
            .expect_err("consumption digest tamper must fail verification"),
        "candidate nonce consumption content digest mismatch"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_nonce_consume_idempotency_candidate_replays_conflicts_and_isolates_scope() {
    let database = TestDatabase::new("phase7d-nonce-consume-idempotency");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("idempotent consumption evidence must append");
    let consumption_id = phase7d_test_nonce_consumption(400);
    let authorization_ref = "authorization_bundle:phase7d-idempotent-consume";
    let authorization = b"idempotent-consumption-authorization";
    let request_digest = phase7d_nonce_consume_request_digest(
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        authorization_ref,
        &phase7d_authorization_digest(authorization),
    );
    let primary_key = "idem_nonce_consume_primary";
    let consumed_at = "2026-07-22T20:04:00.000Z";

    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &consumption_id,
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            consumed_at,
            primary_key,
            &request_digest,
            "2026-07-22T20:03:59.999Z",
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption idempotency request invalid".to_owned())
    );
    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &consumption_id,
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            consumed_at,
            primary_key,
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("initial idempotent consumption must commit"),
        Phase7dNonceConsumeIdempotencyOutcome {
            created: true,
            consumption_id: consumption_id.clone(),
        }
    );

    let changes_before_replay = store.connection.total_changes();
    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(401),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            "2026-08-01T00:00:00.000Z",
            primary_key,
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("exact replay must return committed result"),
        Phase7dNonceConsumeIdempotencyOutcome {
            created: false,
            consumption_id: consumption_id.clone(),
        }
    );
    assert_eq!(store.connection.total_changes(), changes_before_replay);

    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(402),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            consumed_at,
            "idem_nonce_consume_same_request",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .expect("same request under another key must return committed result"),
        Phase7dNonceConsumeIdempotencyOutcome {
            created: false,
            consumption_id: consumption_id.clone(),
        }
    );
    assert_eq!(store.connection.total_changes(), changes_before_replay);

    let conflicting_authorization = b"different-consumption-authorization";
    let conflicting_digest = phase7d_nonce_consume_request_digest(
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        authorization_ref,
        &phase7d_authorization_digest(conflicting_authorization),
    );
    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(403),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            conflicting_authorization,
            consumed_at,
            primary_key,
            &conflicting_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption idempotency conflict".to_owned())
    );

    let conflicting_ref = "authorization_bundle:phase7d-conflicting-consume";
    let conflicting_ref_digest = phase7d_nonce_consume_request_digest(
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        conflicting_ref,
        &phase7d_authorization_digest(authorization),
    );
    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(404),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            conflicting_ref,
            authorization,
            consumed_at,
            "idem_nonce_consume_conflict",
            &conflicting_ref_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption idempotency conflict".to_owned())
    );
    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(405),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            consumed_at,
            "IDEM_INVALID",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption idempotency request invalid".to_owned())
    );

    let cross_project_result = store
        .connection
        .query_row(
            "SELECT consumption_id
             FROM lnsat_signed_approval_nonce_consume_idempotency
             WHERE project_ref = 'project:other'
               AND idempotency_key = ?1",
            [primary_key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .expect("cross-project lookup must remain scoped");
    assert!(cross_project_result.is_none());
    assert!(
        store
            .connection
            .execute(
                "INSERT INTO lnsat_signed_approval_nonce_consume_idempotency (
                   project_ref, idempotency_key, request_digest,
                   consumption_id, created_at
                 ) VALUES (
                   'project:other', 'idem_nonce_consume_cross_project',
                   ?1, ?2, ?3
                 )",
                params![request_digest, consumption_id, PHASE7D_CANDIDATE_TIMESTAMP],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "INSERT INTO lnsat_signed_approval_nonce_consume_idempotency (
                   project_ref, idempotency_key, request_digest,
                   consumption_id, created_at
                 ) VALUES (
                   ?1, 'idem_nonce_consume_duplicate_result', ?2, ?3, ?4
                 )",
                params![
                    fixture.project_ref,
                    request_digest,
                    consumption_id,
                    PHASE7D_CANDIDATE_TIMESTAMP
                ],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "UPDATE lnsat_signed_approval_nonce_consume_idempotency
                 SET request_digest = zeroblob(32)
                 WHERE project_ref = ?1
                   AND idempotency_key = ?2",
                params![fixture.project_ref, primary_key],
            )
            .is_err()
    );
    assert!(
        store
            .connection
            .execute(
                "DELETE FROM lnsat_signed_approval_nonce_consume_idempotency
                 WHERE project_ref = ?1
                   AND idempotency_key = ?2",
                params![fixture.project_ref, primary_key],
            )
            .is_err()
    );

    let mut columns = store
        .connection
        .prepare("PRAGMA table_info(lnsat_signed_approval_nonce_consume_idempotency)")
        .expect("nonce consume idempotency columns must inspect");
    let columns = columns
        .query_map([], |row| row.get::<_, String>(1))
        .expect("nonce consume idempotency columns must query")
        .collect::<rusqlite::Result<std::collections::BTreeSet<_>>>()
        .expect("nonce consume idempotency columns must collect");
    assert_eq!(
        columns,
        [
            "consumption_id",
            "created_at",
            "idempotency_key",
            "project_ref",
            "request_digest",
        ]
        .into_iter()
        .map(str::to_owned)
        .collect()
    );
    for (table, predicate) in [
        ("lnsat_signed_approval_nonce_consume_idempotency", "1 = 1"),
        ("lnsat_signed_approval_nonce_consumptions", "1 = 1"),
        (
            "lnsat_signed_approval_nonce_events",
            "event_kind = 'consumed'",
        ),
    ] {
        assert_eq!(
            store
                .connection
                .query_row(
                    &format!("SELECT count(*) FROM {table} WHERE {predicate}"),
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("idempotent consumption count must inspect"),
            1,
            "{table}"
        );
    }
    phase7d_candidate_schema_verify(&store.connection)
        .expect("nonce consume idempotency replay state must verify");
}

#[test]
fn phase7d_nonce_consume_idempotency_candidate_rolls_back_binding_failure() {
    let database = TestDatabase::new("phase7d-nonce-consume-idempotency-rollback");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("rollback evidence must append");
    let authorization_ref = "authorization_bundle:phase7d-idempotency-rollback";
    let authorization = b"idempotency-rollback-authorization";
    let request_digest = phase7d_nonce_consume_request_digest(
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        authorization_ref,
        &phase7d_authorization_digest(authorization),
    );
    store
        .connection
        .execute_batch(
            "CREATE TRIGGER phase7d_test_reject_nonce_consume_idempotency
             BEFORE INSERT ON lnsat_signed_approval_nonce_consume_idempotency
             BEGIN
               SELECT RAISE(ABORT, 'injected consume-idempotency failure');
             END;",
        )
        .expect("idempotency failure must inject");
    assert!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(410),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            "2026-07-22T20:04:00.000Z",
            "idem_nonce_consume_rollback",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        )
        .is_err()
    );
    store
        .connection
        .execute_batch("DROP TRIGGER phase7d_test_reject_nonce_consume_idempotency;")
        .expect("idempotency failure trigger must drop");
    for (table, predicate) in [
        ("lnsat_signed_approval_nonce_consume_idempotency", "1 = 1"),
        ("lnsat_signed_approval_nonce_consumptions", "1 = 1"),
        (
            "lnsat_signed_approval_nonce_events",
            "event_kind = 'consumed'",
        ),
        (
            "lnsat_authority_order",
            "record_family = 'nonce_consumption'",
        ),
    ] {
        assert_eq!(
            store
                .connection
                .query_row(
                    &format!("SELECT count(*) FROM {table} WHERE {predicate}"),
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rollback count must inspect"),
            0,
            "{table}"
        );
    }
    phase7d_candidate_schema_verify(&store.connection)
        .expect("rolled-back idempotent consumption must leave valid candidate");
}

#[test]
fn phase7d_nonce_consume_idempotency_candidate_serializes_exact_replays() {
    let database = TestDatabase::new("phase7d-nonce-consume-idempotency-race");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("race evidence must append");
    drop(store);

    let barrier = Arc::new(Barrier::new(32));
    let mut workers = Vec::new();
    for worker_id in 1_u64..=32 {
        let path = database.path.clone();
        let fixture = fixture.clone();
        let barrier = Arc::clone(&barrier);
        workers.push(std::thread::spawn(move || {
            let mut connection =
                Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                    .expect("race connection must open");
            configure_connection(&connection).expect("race connection must configure");
            let authorization_ref = "authorization_bundle:phase7d-idempotency-race";
            let authorization = b"idempotency-race-authorization";
            let request_digest = phase7d_nonce_consume_request_digest(
                &fixture.project_ref,
                &fixture.nonce_id,
                &fixture.evidence_id,
                authorization_ref,
                &phase7d_authorization_digest(authorization),
            );
            barrier.wait();
            phase7d_consume_nonce_idempotent(
                &mut connection,
                &phase7d_test_nonce_consumption(500 + worker_id),
                &fixture.project_ref,
                &fixture.nonce_id,
                &fixture.evidence_id,
                authorization_ref,
                authorization,
                "2026-07-22T20:04:00.000Z",
                "idem_nonce_consume_race",
                &request_digest,
                PHASE7D_CANDIDATE_TIMESTAMP,
                PHASE7D_CANDIDATE_TIMESTAMP,
            )
        }));
    }
    let outcomes = workers
        .into_iter()
        .map(|worker| {
            worker
                .join()
                .expect("race worker must join")
                .expect("exact competing request must resolve")
        })
        .collect::<Vec<_>>();
    assert_eq!(outcomes.iter().filter(|outcome| outcome.created).count(), 1);
    assert_eq!(
        outcomes.iter().filter(|outcome| !outcome.created).count(),
        31
    );
    assert_eq!(
        outcomes
            .iter()
            .map(|outcome| outcome.consumption_id.as_str())
            .collect::<std::collections::BTreeSet<_>>()
            .len(),
        1
    );

    let connection = Connection::open(&database.path).expect("race database must reopen");
    configure_connection(&connection).expect("race database must configure");
    for (table, predicate) in [
        ("lnsat_signed_approval_nonce_consume_idempotency", "1 = 1"),
        ("lnsat_signed_approval_nonce_consumptions", "1 = 1"),
        (
            "lnsat_signed_approval_nonce_events",
            "event_kind = 'consumed'",
        ),
        (
            "lnsat_authority_order",
            "record_family = 'nonce_consumption'",
        ),
    ] {
        assert_eq!(
            connection
                .query_row(
                    &format!("SELECT count(*) FROM {table} WHERE {predicate}"),
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("race count must inspect"),
            1,
            "{table}"
        );
    }
    phase7d_candidate_schema_verify(&connection).expect("race result must verify");
}

#[test]
fn phase7d_nonce_consume_idempotency_candidate_detects_request_digest_tamper() {
    let database = TestDatabase::new("phase7d-nonce-consume-idempotency-tamper");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("tamper evidence must append");
    let authorization_ref = "authorization_bundle:phase7d-idempotency-tamper";
    let authorization = b"idempotency-tamper-authorization";
    let request_digest = phase7d_nonce_consume_request_digest(
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        authorization_ref,
        &phase7d_authorization_digest(authorization),
    );
    phase7d_consume_nonce_idempotent(
        &mut store.connection,
        &phase7d_test_nonce_consumption(600),
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        authorization_ref,
        authorization,
        "2026-07-22T20:04:00.000Z",
        "idem_nonce_consume_tamper",
        &request_digest,
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("tamper baseline idempotent consumption must commit");
    phase7d_candidate_schema_verify(&store.connection).expect("tamper baseline must verify");

    store
        .connection
        .execute_batch(
            "DROP TRIGGER lnsat_signed_approval_nonce_consume_idempotency_reject_update;
             UPDATE lnsat_signed_approval_nonce_consume_idempotency
             SET request_digest = zeroblob(32);
             CREATE TRIGGER lnsat_signed_approval_nonce_consume_idempotency_reject_update
             BEFORE UPDATE ON lnsat_signed_approval_nonce_consume_idempotency
             BEGIN
               SELECT RAISE(ABORT, 'nonce consumption idempotency is immutable');
             END;",
        )
        .expect("nonce consume idempotency digest tamper must apply");
    assert_eq!(
        phase7d_consume_nonce_idempotent(
            &mut store.connection,
            &phase7d_test_nonce_consumption(601),
            &fixture.project_ref,
            &fixture.nonce_id,
            &fixture.evidence_id,
            authorization_ref,
            authorization,
            "2026-07-22T20:04:00.000Z",
            "idem_nonce_consume_tamper",
            &request_digest,
            PHASE7D_CANDIDATE_TIMESTAMP,
            PHASE7D_CANDIDATE_TIMESTAMP,
        ),
        Err("candidate nonce consumption idempotency conflict".to_owned())
    );
    assert_eq!(
        phase7d_candidate_schema_verify(&store.connection)
            .expect_err("nonce consume request digest tamper must fail verification"),
        "candidate nonce consume request digest mismatch"
    );
}

#[test]
#[allow(clippy::too_many_lines)]
fn phase7d_public_material_candidate_query_plans_use_frozen_indexes() {
    let database = TestDatabase::new("phase7d-candidate-query-plan");
    let mut store = SqliteStore::open(&database.path).expect("v15 database must bootstrap");
    let fixture = phase7d_prepare_signed_evidence_candidate(&mut store);
    phase7d_append_signed_evidence(&store.connection, &fixture, PHASE7D_CANDIDATE_TIMESTAMP)
        .expect("plan signed evidence must append");
    let request_digest =
        phase7d_evidence_issue_request_digest(&fixture.project_ref, &fixture.decision_id);
    phase7d_resolve_evidence_issue_idempotency(
        &store.connection,
        &fixture,
        "idem_evidence_issue_query_plan",
        &request_digest,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("plan idempotency binding must append");
    let subject = Phase7dVerificationAttemptSubject {
        evidence_id: fixture.evidence_id.clone(),
        material_ref: fixture.material_ref.clone(),
    };
    phase7d_record_verification_attempt(
        &mut store.connection,
        &phase7d_test_verification_attempt(300),
        &fixture.project_ref,
        &fixture.canonical_payload,
        "verified",
        "verified",
        &fixture.issued_at,
        Some(&subject),
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("plan verification attempt must append");
    let nonce_consume_authorization_ref = "authorization_bundle:phase7d-consumption-query-plan";
    let nonce_consume_authorization = b"query-plan-authorization";
    let nonce_consume_request_digest = phase7d_nonce_consume_request_digest(
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        nonce_consume_authorization_ref,
        &phase7d_authorization_digest(nonce_consume_authorization),
    );
    phase7d_consume_nonce_idempotent(
        &mut store.connection,
        &phase7d_test_nonce_consumption(300),
        &fixture.project_ref,
        &fixture.nonce_id,
        &fixture.evidence_id,
        nonce_consume_authorization_ref,
        nonce_consume_authorization,
        "2026-07-22T20:04:00.000Z",
        "idem_nonce_consume_query_plan",
        &nonce_consume_request_digest,
        PHASE7D_CANDIDATE_TIMESTAMP,
        PHASE7D_CANDIDATE_TIMESTAMP,
    )
    .expect("plan nonce consumption must append");
    let project_scope_digest = phase7d_verification_project_scope_digest(&fixture.project_ref);
    let connection = &store.connection;

    let status_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT status
             FROM lnsat_signed_approval_key_status_events
             INDEXED BY lnsat_signed_approval_key_status_events_latest_idx
             WHERE material_ref = ?1
             ORDER BY revision DESC
             LIMIT 1",
            [&fixture.material_ref],
            |row| row.get::<_, String>(3),
        )
        .expect("status plan must inspect");
    assert!(
        status_plan.contains("lnsat_signed_approval_key_status_events_latest_idx"),
        "{status_plan}"
    );

    let lineage_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT material_ref
             FROM lnsat_signed_approval_verification_materials
             INDEXED BY lnsat_signed_approval_verification_materials_key_lineage_idx
             WHERE key_id = ?1
             ORDER BY key_version DESC
             LIMIT 1",
            [&fixture.signing_key_id],
            |row| row.get::<_, String>(3),
        )
        .expect("lineage plan must inspect");
    assert!(
        lineage_plan.contains("lnsat_signed_approval_verification_materials_key_lineage_idx"),
        "{lineage_plan}"
    );

    let nonce_latest_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT event_kind
             FROM lnsat_signed_approval_nonce_events
             INDEXED BY lnsat_signed_approval_nonce_events_latest_idx
             WHERE nonce_id = ?1
             ORDER BY revision DESC
             LIMIT 1",
            [&fixture.nonce_id],
            |row| row.get::<_, String>(3),
        )
        .expect("nonce latest plan must inspect");
    assert!(
        nonce_latest_plan.contains("lnsat_signed_approval_nonce_events_latest_idx"),
        "{nonce_latest_plan}"
    );

    let nonce_terminal_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT nonce_event_id
             FROM lnsat_signed_approval_nonce_events
             INDEXED BY lnsat_signed_approval_nonce_events_terminal_idx
             WHERE nonce_id = ?1
               AND event_kind IN ('cancelled', 'expired', 'consumed')",
            [&fixture.nonce_id],
            |row| row.get::<_, String>(3),
        )
        .expect("nonce terminal plan must inspect");
    assert!(
        nonce_terminal_plan.contains("lnsat_signed_approval_nonce_events_terminal_idx"),
        "{nonce_terminal_plan}"
    );

    let signed_evidence_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT evidence_id
             FROM lnsat_signed_approval_evidence
             INDEXED BY lnsat_signed_approval_evidence_material_idx
             WHERE material_ref = ?1
               AND issued_at >= ?2
             ORDER BY issued_at, evidence_id",
            params![fixture.material_ref, fixture.issued_at],
            |row| row.get::<_, String>(3),
        )
        .expect("signed evidence plan must inspect");
    assert!(
        signed_evidence_plan.contains("lnsat_signed_approval_evidence_material_idx"),
        "{signed_evidence_plan}"
    );

    let idempotency_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT evidence_id
             FROM lnsat_signed_approval_evidence_issue_idempotency
             WHERE project_ref = ?1
               AND idempotency_key = ?2",
            params![fixture.project_ref, "idem_evidence_issue_query_plan"],
            |row| row.get::<_, String>(3),
        )
        .expect("idempotency plan must inspect");
    assert!(
        idempotency_plan
            .contains("sqlite_autoindex_lnsat_signed_approval_evidence_issue_idempotency_2"),
        "{idempotency_plan}"
    );
    let verification_attempt_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT attempt_id
             FROM lnsat_signed_approval_verification_attempts
             INDEXED BY lnsat_signed_approval_verification_attempts_scope_timeline_idx
             WHERE project_scope_digest = ?1
               AND observed_at >= ?2
             ORDER BY observed_at, authority_sequence, attempt_id",
            params![project_scope_digest, fixture.issued_at],
            |row| row.get::<_, String>(3),
        )
        .expect("verification attempt plan must inspect");
    assert!(
        verification_attempt_plan
            .contains("lnsat_signed_approval_verification_attempts_scope_timeline_idx"),
        "{verification_attempt_plan}"
    );
    let consumption_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT consumption_id
             FROM lnsat_signed_approval_nonce_consumptions
             INDEXED BY lnsat_signed_approval_nonce_consumptions_project_timeline_idx
             WHERE project_ref = ?1
               AND consumed_at >= ?2
             ORDER BY consumed_at, authority_sequence, consumption_id",
            params![fixture.project_ref, fixture.issued_at],
            |row| row.get::<_, String>(3),
        )
        .expect("nonce consumption plan must inspect");
    assert!(
        consumption_plan.contains("lnsat_signed_approval_nonce_consumptions_project_timeline_idx"),
        "{consumption_plan}"
    );
    let nonce_consume_idempotency_plan = connection
        .query_row(
            "EXPLAIN QUERY PLAN
             SELECT consumption_id
             FROM lnsat_signed_approval_nonce_consume_idempotency
             WHERE project_ref = ?1
               AND idempotency_key = ?2",
            params![fixture.project_ref, "idem_nonce_consume_query_plan"],
            |row| row.get::<_, String>(3),
        )
        .expect("nonce consume idempotency plan must inspect");
    assert!(
        nonce_consume_idempotency_plan
            .contains("sqlite_autoindex_lnsat_signed_approval_nonce_consume_idempotency_2"),
        "{nonce_consume_idempotency_plan}"
    );
    phase7d_candidate_schema_verify(connection).expect("planned schema must verify");
}
