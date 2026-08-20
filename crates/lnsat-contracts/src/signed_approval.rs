use ed25519_dalek::{Signature, VerifyingKey};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::fmt::Write as _;

use crate::approval::{
    ApprovalDecisionV1, ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ApprovalRequestV1, create_approval_request_v1, decide_approval_request_v1,
};
use crate::audit::{decision_json_value, policy_json_value, request_json_value};
use crate::packet::{canonicalize_json_value, packet_json_value};
use crate::{
    CONTRACT_VERSION_V1_0, PacketEnvelopeV1, PolicyDecisionV1, canonical_utc_timestamp_millis_v1,
    decide_packet_envelope_policy_v1, hash_packet_envelope_v1, parse_packet_envelope_v1,
};

const EVIDENCE_SCHEMA: &str = "lnsat.signed_approval_evidence.schema.v1_0";
const MATERIAL_SCHEMA: &str = "lnsat.approval_verification_material.schema.v1_0";
const SIGNATURE_PROFILE: &str = "lnsat.signed_approval_signature.ed25519.v1_0";
const DOMAIN_PREFIX: &[u8] = b"LNSAT-SIGNED-APPROVAL-EVIDENCE-V1";
const MAX_INPUT_BYTES: usize = 1_048_576;
const MAX_INPUT_DEPTH: usize = 64;
const ED25519_SPKI_PREFIX: [u8; 12] = [
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
];
const ED25519_SPKI_BASE64URL_LENGTH: usize = 59;
const ED25519_SIGNATURE_BASE64URL_LENGTH: usize = 86;
const MAX_ED25519_MESSAGE_BASE64URL_LENGTH: usize = 1_398_102;
const ROOT_KEYS: [&str; 7] = [
    "contract_version",
    "schema_id",
    "signed_approval_evidence_id",
    "payload",
    "payload_digest",
    "signature",
    "side_effects",
];
const PAYLOAD_KEYS: [&str; 16] = [
    "packet",
    "packet_hash",
    "policy_decision",
    "approval_request",
    "approval_decision",
    "issued_at",
    "expires_at",
    "nonce_id",
    "signing_key_id",
    "signing_key_version",
    "verification_material_ref",
    "approval_gate_satisfied",
    "server_signed",
    "execution_authorized",
    "session_authority_state_changed",
    "mutation_authority",
];
const SIGNATURE_KEYS: [&str; 2] = ["signature_profile", "signature_base64url"];
const MATERIAL_KEYS: [&str; 12] = [
    "contract_version",
    "schema_id",
    "verification_material_ref",
    "signing_key_id",
    "signing_key_version",
    "signature_profile",
    "public_key_spki_base64url",
    "valid_from",
    "sign_until",
    "verify_until",
    "supersedes_key_version",
    "side_effects",
];

/// Structural signed-approval evidence wrapper. Signature math remains closed.
#[derive(Clone, Debug, PartialEq)]
pub struct SignedApprovalEvidenceV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub signed_approval_evidence_id: String,
    pub payload: SignedApprovalPayloadV1,
    pub payload_digest: String,
    pub signature: SignedApprovalSignatureV1,
    pub side_effects: [(); 0],
}

/// Full stable packet-policy-request-decision chain carried by the wrapper.
#[allow(clippy::struct_excessive_bools)] // Exact wire closure uses four independent false/true fields.
#[derive(Clone, Debug, PartialEq)]
pub struct SignedApprovalPayloadV1 {
    pub packet: PacketEnvelopeV1,
    pub packet_hash: String,
    pub policy_decision: PolicyDecisionV1,
    pub approval_request: ApprovalRequestV1,
    pub approval_decision: ApprovalDecisionV1,
    pub issued_at: String,
    pub expires_at: String,
    pub nonce_id: String,
    pub signing_key_id: String,
    pub signing_key_version: String,
    pub verification_material_ref: String,
    pub approval_gate_satisfied: bool,
    pub server_signed: bool,
    pub execution_authorized: bool,
    pub session_authority_state_changed: bool,
    pub mutation_authority: bool,
}

/// Exact signature profile and public signature bytes.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignedApprovalSignatureV1 {
    pub signature_profile: String,
    pub signature_base64url: String,
}

/// Immutable public verification material. Contains no secret or private value.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalVerificationMaterialV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub verification_material_ref: String,
    pub signing_key_id: String,
    pub signing_key_version: String,
    pub signature_profile: String,
    pub public_key_spki_base64url: String,
    pub valid_from: String,
    pub sign_until: String,
    pub verify_until: String,
    pub supersedes_key_version: Option<String>,
    pub side_effects: [(); 0],
}

/// Closed verification-result model. Phase 7b does not produce a verified result.
#[allow(clippy::struct_excessive_bools)] // Mirrors the frozen cross-language result contract.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignedApprovalVerificationV1 {
    pub contract: String,
    pub contract_version: String,
    pub ok: bool,
    pub status: String,
    pub signed_approval_evidence_id: Option<String>,
    pub payload_digest: Option<String>,
    pub signing_key_id: Option<String>,
    pub signing_key_version: Option<String>,
    pub verification_material_ref: Option<String>,
    pub verified_at: String,
    pub cryptographic_signature_valid: bool,
    pub chain_valid: bool,
    pub current_status_valid: bool,
    pub approval_gate_satisfied: bool,
    pub server_signed: bool,
    pub execution_authorized: bool,
    pub session_authority_state_changed: bool,
    pub mutation_authority: bool,
    pub errors: Vec<SignedApprovalVerificationErrorV1>,
    pub side_effects: [(); 0],
}

/// Public-safe closed verification error item.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignedApprovalVerificationErrorV1 {
    pub code: SignedApprovalVerificationV1Error,
    pub path: String,
    pub message: String,
    pub severity: String,
}

/// Dependency-free structural validation output and exact derived byte evidence.
#[derive(Clone, Debug, PartialEq)]
pub struct SignedApprovalEvidenceV1Validation {
    pub evidence: SignedApprovalEvidenceV1,
    pub verification_material: Option<ApprovalVerificationMaterialV1>,
    pub canonical_payload_base64url: String,
    pub preimage_base64url: String,
    pub payload_digest: String,
    pub signed_approval_evidence_id: String,
    pub side_effects: [(); 0],
}

/// Stable Phase 7c verification-primitive rejection classes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Ed25519VerificationRejectionClassV1 {
    NoRejection,
    PublicKeyEncoding,
    MessageEncoding,
    SignatureEncoding,
    CryptographicReject,
}

impl Ed25519VerificationRejectionClassV1 {
    /// Exact shared TypeScript/Rust fixture value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::NoRejection => "none",
            Self::PublicKeyEncoding => "public_key_encoding",
            Self::MessageEncoding => "message_encoding",
            Self::SignatureEncoding => "signature_encoding",
            Self::CryptographicReject => "cryptographic_reject",
        }
    }
}

/// Public-only pure Ed25519 verification result. Carries no authority.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Ed25519VerificationPrimitiveResultV1 {
    pub accepted: bool,
    pub rejection_class: Ed25519VerificationRejectionClassV1,
}

/// Exact fail-closed signed-approval verification taxonomy.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SignedApprovalVerificationV1Error {
    InvalidJson,
    InvalidType,
    UnexpectedField,
    MissingField,
    InputTooLarge,
    InputTooDeep,
    UnsupportedContract,
    UnsupportedSchema,
    UnsupportedCanonicalization,
    UnsupportedDigest,
    UnsupportedSignatureProfile,
    InvalidField,
    InvalidTimeWindow,
    InvalidNonce,
    ChainInvalid,
    ChainSubstitution,
    PayloadDigestMismatch,
    EvidenceIdMismatch,
    VerificationMaterialUnavailable,
    VerificationMaterialStale,
    KeyUnknown,
    KeyVersionDowngrade,
    KeyInactive,
    KeyRetired,
    KeyRevoked,
    SignatureMalformed,
    SignatureInvalid,
    NonceReplayed,
    RequesterSessionRevoked,
    ApproverSessionRevoked,
    PolicyRevoked,
    ApprovalRevoked,
    EvidenceExpired,
    VerificationUnavailable,
}

impl SignedApprovalVerificationV1Error {
    /// Frozen Phase 7a taxonomy in wire order.
    pub const ALL: [Self; 34] = [
        Self::InvalidJson,
        Self::InvalidType,
        Self::UnexpectedField,
        Self::MissingField,
        Self::InputTooLarge,
        Self::InputTooDeep,
        Self::UnsupportedContract,
        Self::UnsupportedSchema,
        Self::UnsupportedCanonicalization,
        Self::UnsupportedDigest,
        Self::UnsupportedSignatureProfile,
        Self::InvalidField,
        Self::InvalidTimeWindow,
        Self::InvalidNonce,
        Self::ChainInvalid,
        Self::ChainSubstitution,
        Self::PayloadDigestMismatch,
        Self::EvidenceIdMismatch,
        Self::VerificationMaterialUnavailable,
        Self::VerificationMaterialStale,
        Self::KeyUnknown,
        Self::KeyVersionDowngrade,
        Self::KeyInactive,
        Self::KeyRetired,
        Self::KeyRevoked,
        Self::SignatureMalformed,
        Self::SignatureInvalid,
        Self::NonceReplayed,
        Self::RequesterSessionRevoked,
        Self::ApproverSessionRevoked,
        Self::PolicyRevoked,
        Self::ApprovalRevoked,
        Self::EvidenceExpired,
        Self::VerificationUnavailable,
    ];

    /// Stable cross-language error identity.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidJson => "signed_approval.invalid_json",
            Self::InvalidType => "signed_approval.invalid_type",
            Self::UnexpectedField => "signed_approval.unexpected_field",
            Self::MissingField => "signed_approval.missing_field",
            Self::InputTooLarge => "signed_approval.input_too_large",
            Self::InputTooDeep => "signed_approval.input_too_deep",
            Self::UnsupportedContract => "signed_approval.unsupported_contract",
            Self::UnsupportedSchema => "signed_approval.unsupported_schema",
            Self::UnsupportedCanonicalization => "signed_approval.unsupported_canonicalization",
            Self::UnsupportedDigest => "signed_approval.unsupported_digest",
            Self::UnsupportedSignatureProfile => "signed_approval.unsupported_signature_profile",
            Self::InvalidField => "signed_approval.invalid_field",
            Self::InvalidTimeWindow => "signed_approval.invalid_time_window",
            Self::InvalidNonce => "signed_approval.invalid_nonce",
            Self::ChainInvalid => "signed_approval.chain_invalid",
            Self::ChainSubstitution => "signed_approval.chain_substitution",
            Self::PayloadDigestMismatch => "signed_approval.payload_digest_mismatch",
            Self::EvidenceIdMismatch => "signed_approval.evidence_id_mismatch",
            Self::VerificationMaterialUnavailable => {
                "signed_approval.verification_material_unavailable"
            }
            Self::VerificationMaterialStale => "signed_approval.verification_material_stale",
            Self::KeyUnknown => "signed_approval.key_unknown",
            Self::KeyVersionDowngrade => "signed_approval.key_version_downgrade",
            Self::KeyInactive => "signed_approval.key_inactive",
            Self::KeyRetired => "signed_approval.key_retired",
            Self::KeyRevoked => "signed_approval.key_revoked",
            Self::SignatureMalformed => "signed_approval.signature_malformed",
            Self::SignatureInvalid => "signed_approval.signature_invalid",
            Self::NonceReplayed => "signed_approval.nonce_replayed",
            Self::RequesterSessionRevoked => "signed_approval.requester_session_revoked",
            Self::ApproverSessionRevoked => "signed_approval.approver_session_revoked",
            Self::PolicyRevoked => "signed_approval.policy_revoked",
            Self::ApprovalRevoked => "signed_approval.approval_revoked",
            Self::EvidenceExpired => "signed_approval.evidence_expired",
            Self::VerificationUnavailable => "signed_approval.verification_unavailable",
        }
    }
}

/// Parses one closed wrapper, rederives its stable chain, and derives exact bytes.
///
/// Signature math, runtime signing, key custody, nonce persistence, and current
/// operational status verification remain deliberately unavailable.
///
/// # Errors
///
/// Returns one stable error for malformed, substituted, widened, or mismatched
/// evidence and public verification material.
pub fn parse_signed_approval_evidence_v1(
    input: &[u8],
    verification_material: Option<&Value>,
) -> Result<SignedApprovalEvidenceV1Validation, SignedApprovalVerificationV1Error> {
    if input.len() > MAX_INPUT_BYTES {
        return Err(SignedApprovalVerificationV1Error::InputTooLarge);
    }
    let scan = JsonScanner::new(input)
        .scan()
        .map_err(|error| match error {
            JsonScanError::Invalid => SignedApprovalVerificationV1Error::InvalidJson,
            JsonScanError::TooDeep => SignedApprovalVerificationV1Error::InputTooDeep,
        })?;
    if scan.max_depth > MAX_INPUT_DEPTH {
        return Err(SignedApprovalVerificationV1Error::InputTooDeep);
    }
    if scan.duplicate_key {
        return Err(SignedApprovalVerificationV1Error::InvalidJson);
    }
    let value: Value = serde_json::from_slice(input)
        .map_err(|_| SignedApprovalVerificationV1Error::InvalidJson)?;
    canonicalize_json_value(&value).map_err(|_| SignedApprovalVerificationV1Error::InvalidField)?;
    reject_forbidden_fields(&value)?;
    let root = value
        .as_object()
        .ok_or(SignedApprovalVerificationV1Error::InvalidType)?;
    validate_exact_keys(root, &ROOT_KEYS)?;
    if required_string(root, "contract_version")? != CONTRACT_VERSION_V1_0 {
        return Err(SignedApprovalVerificationV1Error::UnsupportedContract);
    }
    if required_string(root, "schema_id")? != EVIDENCE_SCHEMA {
        return Err(SignedApprovalVerificationV1Error::UnsupportedSchema);
    }
    let evidence_id = required_string(root, "signed_approval_evidence_id")?;
    let payload_digest = required_string(root, "payload_digest")?;
    if !valid_prefixed_digest(evidence_id, "sae_")
        || !valid_prefixed_digest(payload_digest, "sha256:")
        || !is_empty_array(root.get("side_effects"))
    {
        return Err(SignedApprovalVerificationV1Error::InvalidField);
    }
    let signature = parse_signature(required_object(root, "signature")?)?;
    let payload_value = root
        .get("payload")
        .ok_or(SignedApprovalVerificationV1Error::MissingField)?;
    let payload = parse_payload(payload_value)?;
    let identity = derive_signed_approval_evidence_identity_v1(&payload)?;
    if payload_digest != identity.payload_digest {
        return Err(SignedApprovalVerificationV1Error::PayloadDigestMismatch);
    }
    if evidence_id != identity.signed_approval_evidence_id {
        return Err(SignedApprovalVerificationV1Error::EvidenceIdMismatch);
    }

    let material = verification_material
        .map(parse_approval_verification_material_v1)
        .transpose()?;
    if let Some(material) = material.as_ref() {
        validate_material_binding(&payload, material)?;
    }
    Ok(SignedApprovalEvidenceV1Validation {
        evidence: SignedApprovalEvidenceV1 {
            contract_version: CONTRACT_VERSION_V1_0.to_owned(),
            schema_id: EVIDENCE_SCHEMA.to_owned(),
            signed_approval_evidence_id: evidence_id.to_owned(),
            payload,
            payload_digest: payload_digest.to_owned(),
            signature,
            side_effects: [],
        },
        verification_material: material,
        canonical_payload_base64url: identity.canonical_payload_base64url,
        preimage_base64url: identity.preimage_base64url,
        payload_digest: identity.payload_digest,
        signed_approval_evidence_id: identity.signed_approval_evidence_id,
        side_effects: [],
    })
}

/// Validates immutable public verification material and its content identity.
///
/// # Errors
///
/// Returns the frozen Phase 7a structural, profile, or substitution code for
/// malformed public material.
pub fn parse_approval_verification_material_v1(
    value: &Value,
) -> Result<ApprovalVerificationMaterialV1, SignedApprovalVerificationV1Error> {
    canonicalize_json_value(value).map_err(|_| SignedApprovalVerificationV1Error::InvalidField)?;
    reject_forbidden_fields(value)?;
    let object = value
        .as_object()
        .ok_or(SignedApprovalVerificationV1Error::InvalidType)?;
    validate_exact_keys(object, &MATERIAL_KEYS)?;
    if required_string(object, "contract_version")? != CONTRACT_VERSION_V1_0 {
        return Err(SignedApprovalVerificationV1Error::UnsupportedContract);
    }
    if required_string(object, "schema_id")? != MATERIAL_SCHEMA {
        return Err(SignedApprovalVerificationV1Error::UnsupportedSchema);
    }
    if required_string(object, "signature_profile")? != SIGNATURE_PROFILE {
        return Err(SignedApprovalVerificationV1Error::UnsupportedSignatureProfile);
    }
    if !is_empty_array(object.get("side_effects")) {
        return Err(SignedApprovalVerificationV1Error::InvalidField);
    }
    let verification_material_ref = required_string(object, "verification_material_ref")?;
    let signing_key_id = required_string(object, "signing_key_id")?;
    let signing_key_version = required_string(object, "signing_key_version")?;
    let public_key_spki_base64url = required_string(object, "public_key_spki_base64url")?;
    let valid_from = required_string(object, "valid_from")?;
    let sign_until = required_string(object, "sign_until")?;
    let verify_until = required_string(object, "verify_until")?;
    let supersedes_key_version = match object.get("supersedes_key_version") {
        Some(Value::Null) => None,
        Some(Value::String(value)) if valid_key_version(value) => Some(value.clone()),
        _ => return Err(SignedApprovalVerificationV1Error::InvalidField),
    };
    if !valid_prefixed_digest(verification_material_ref, "avm_")
        || !valid_signing_key_id(signing_key_id)
        || !valid_key_version(signing_key_version)
        || !valid_ed25519_spki(public_key_spki_base64url)
    {
        return Err(SignedApprovalVerificationV1Error::InvalidField);
    }
    let valid_from_instant = canonical_utc_timestamp_millis_v1(valid_from)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)?;
    let sign_until_instant = canonical_utc_timestamp_millis_v1(sign_until)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)?;
    let verify_until_instant = canonical_utc_timestamp_millis_v1(verify_until)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)?;
    if valid_from_instant >= sign_until_instant
        || sign_until_instant > verify_until_instant
        || supersedes_key_version.as_ref().is_some_and(|prior| {
            key_version_number(prior) >= key_version_number(signing_key_version)
        })
    {
        return Err(SignedApprovalVerificationV1Error::InvalidField);
    }

    let mut body = object.clone();
    body.remove("verification_material_ref");
    let canonical = canonicalize_json_value(&Value::Object(body))
        .map_err(|_| SignedApprovalVerificationV1Error::InvalidField)?;
    let expected_ref = format!("avm_{}", lowercase_sha256(canonical.as_bytes()));
    if verification_material_ref != expected_ref {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }
    Ok(ApprovalVerificationMaterialV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: MATERIAL_SCHEMA.to_owned(),
        verification_material_ref: verification_material_ref.to_owned(),
        signing_key_id: signing_key_id.to_owned(),
        signing_key_version: signing_key_version.to_owned(),
        signature_profile: SIGNATURE_PROFILE.to_owned(),
        public_key_spki_base64url: public_key_spki_base64url.to_owned(),
        valid_from: valid_from.to_owned(),
        sign_until: sign_until.to_owned(),
        verify_until: verify_until.to_owned(),
        supersedes_key_version,
        side_effects: [],
    })
}

/// Exact canonical payload, domain-separated preimage, digest, and evidence ID.
///
/// # Errors
///
/// Returns invalid-field when a caller constructs a non-canonical payload.
pub fn derive_signed_approval_evidence_identity_v1(
    payload: &SignedApprovalPayloadV1,
) -> Result<SignedApprovalEvidenceIdentityV1, SignedApprovalVerificationV1Error> {
    let payload_value = payload_json_value(payload);
    let canonical = canonicalize_json_value(&payload_value)
        .map_err(|_| SignedApprovalVerificationV1Error::InvalidField)?;
    let length = u64::try_from(canonical.len())
        .map_err(|_| SignedApprovalVerificationV1Error::InvalidField)?;
    let mut preimage = Vec::with_capacity(DOMAIN_PREFIX.len() + 9 + canonical.len());
    preimage.extend_from_slice(DOMAIN_PREFIX);
    preimage.push(0);
    preimage.extend_from_slice(&length.to_be_bytes());
    preimage.extend_from_slice(canonical.as_bytes());
    let digest = lowercase_sha256(&preimage);
    Ok(SignedApprovalEvidenceIdentityV1 {
        canonical_payload_base64url: base64url_encode(canonical.as_bytes()),
        preimage_base64url: base64url_encode(&preimage),
        payload_digest: format!("sha256:{digest}"),
        signed_approval_evidence_id: format!("sae_{digest}"),
    })
}

/// Verifies one canonical public-only pure Ed25519 input.
///
/// Exact RFC 8410 SPKI, canonical base64url, and signature-length checks run
/// before `ed25519-dalek` sees public-key or signature bytes.
#[must_use]
pub fn verify_ed25519_signature_primitive_v1(
    public_key: &str,
    message: &str,
    signature: &str,
) -> Ed25519VerificationPrimitiveResultV1 {
    if public_key.len() != ED25519_SPKI_BASE64URL_LENGTH {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::PublicKeyEncoding);
    }
    let Some(public_key_spki) = base64url_decode(public_key) else {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::PublicKeyEncoding);
    };
    if public_key_spki.len() != 44
        || public_key_spki[..ED25519_SPKI_PREFIX.len()] != ED25519_SPKI_PREFIX
    {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::PublicKeyEncoding);
    }

    if message.len() > MAX_ED25519_MESSAGE_BASE64URL_LENGTH {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::MessageEncoding);
    }
    let Some(message) = base64url_decode(message) else {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::MessageEncoding);
    };
    if signature.len() != ED25519_SIGNATURE_BASE64URL_LENGTH {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::SignatureEncoding);
    }
    let Some(signature) = base64url_decode(signature) else {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::SignatureEncoding);
    };
    if signature.len() != 64 {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::SignatureEncoding);
    }

    let Some(public_key_bytes) = public_key_spki
        .get(ED25519_SPKI_PREFIX.len()..)
        .and_then(|bytes| <&[u8; 32]>::try_from(bytes).ok())
    else {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::PublicKeyEncoding);
    };
    let Ok(verifying_key) = VerifyingKey::from_bytes(public_key_bytes) else {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::CryptographicReject);
    };
    if verifying_key.is_weak() {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::CryptographicReject);
    }
    let Ok(signature) = Signature::from_slice(&signature) else {
        return primitive_rejection(Ed25519VerificationRejectionClassV1::SignatureEncoding);
    };
    if verifying_key.verify_strict(&message, &signature).is_ok() {
        Ed25519VerificationPrimitiveResultV1 {
            accepted: true,
            rejection_class: Ed25519VerificationRejectionClassV1::NoRejection,
        }
    } else {
        primitive_rejection(Ed25519VerificationRejectionClassV1::CryptographicReject)
    }
}

/// Exact derived byte identities shared by TypeScript and Rust.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SignedApprovalEvidenceIdentityV1 {
    pub canonical_payload_base64url: String,
    pub preimage_base64url: String,
    pub payload_digest: String,
    pub signed_approval_evidence_id: String,
}

#[allow(clippy::too_many_lines)] // One fail-closed chain parser keeps validation order explicit.
fn parse_payload(
    value: &Value,
) -> Result<SignedApprovalPayloadV1, SignedApprovalVerificationV1Error> {
    let object = value
        .as_object()
        .ok_or(SignedApprovalVerificationV1Error::InvalidType)?;
    validate_exact_keys(object, &PAYLOAD_KEYS)?;
    let packet_hash = required_string(object, "packet_hash")?;
    let issued_at = required_string(object, "issued_at")?;
    let expires_at = required_string(object, "expires_at")?;
    let nonce_id = required_string(object, "nonce_id")?;
    let signing_key_id = required_string(object, "signing_key_id")?;
    let signing_key_version = required_string(object, "signing_key_version")?;
    let verification_material_ref = required_string(object, "verification_material_ref")?;
    if !valid_prefixed_digest(packet_hash, "sha256:")
        || canonical_utc_timestamp_millis_v1(issued_at).is_none()
        || canonical_utc_timestamp_millis_v1(expires_at).is_none()
        || !valid_signing_key_id(signing_key_id)
        || !valid_key_version(signing_key_version)
        || !valid_prefixed_digest(verification_material_ref, "avm_")
    {
        return Err(SignedApprovalVerificationV1Error::InvalidField);
    }
    if !valid_nonce(nonce_id) {
        return Err(SignedApprovalVerificationV1Error::InvalidNonce);
    }
    let approval_gate_satisfied = required_bool(object, "approval_gate_satisfied")?;
    if !required_bool(object, "server_signed")?
        || required_bool(object, "execution_authorized")?
        || required_bool(object, "session_authority_state_changed")?
        || required_bool(object, "mutation_authority")?
    {
        return Err(SignedApprovalVerificationV1Error::InvalidField);
    }

    let packet_value = object
        .get("packet")
        .ok_or(SignedApprovalVerificationV1Error::MissingField)?;
    let packet_bytes = serde_json::to_vec(packet_value)
        .map_err(|_| SignedApprovalVerificationV1Error::ChainInvalid)?;
    let packet = parse_packet_envelope_v1(&packet_bytes)
        .map_err(|_| SignedApprovalVerificationV1Error::ChainInvalid)?;

    let policy_value = object
        .get("policy_decision")
        .ok_or(SignedApprovalVerificationV1Error::MissingField)?;
    let evaluated_at = value_string(policy_value, "evaluated_at")
        .ok_or(SignedApprovalVerificationV1Error::ChainSubstitution)?;
    let policy = decide_packet_envelope_policy_v1(&packet, evaluated_at)
        .map_err(|_| SignedApprovalVerificationV1Error::ChainSubstitution)?;
    if policy_json_value(&policy) != *policy_value {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }

    let request_value = object
        .get("approval_request")
        .ok_or(SignedApprovalVerificationV1Error::MissingField)?;
    let requested_at = value_string(request_value, "requested_at")
        .ok_or(SignedApprovalVerificationV1Error::ChainSubstitution)?;
    let request = create_approval_request_v1(&policy, requested_at)
        .map_err(|_| SignedApprovalVerificationV1Error::ChainSubstitution)?;
    if request_json_value(&request) != *request_value {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }

    let decision_value = object
        .get("approval_decision")
        .ok_or(SignedApprovalVerificationV1Error::MissingField)?;
    let input = decision_input(decision_value)
        .ok_or(SignedApprovalVerificationV1Error::ChainSubstitution)?;
    let decision = decide_approval_request_v1(&request, &input)
        .map_err(|_| SignedApprovalVerificationV1Error::ChainSubstitution)?;
    if decision_json_value(&decision) != *decision_value {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }

    let calculated_packet_hash = hash_packet_envelope_v1(&packet)
        .map_err(|_| SignedApprovalVerificationV1Error::ChainInvalid)?;
    if packet_hash != calculated_packet_hash
        || packet_hash != policy.packet_ref.packet_hash
        || approval_gate_satisfied != decision.approval_gate_satisfied
    {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }
    let issued = canonical_utc_timestamp_millis_v1(issued_at)
        .ok_or(SignedApprovalVerificationV1Error::InvalidTimeWindow)?;
    let expires = canonical_utc_timestamp_millis_v1(expires_at)
        .ok_or(SignedApprovalVerificationV1Error::InvalidTimeWindow)?;
    let decided = canonical_utc_timestamp_millis_v1(&decision.decided_at)
        .ok_or(SignedApprovalVerificationV1Error::InvalidTimeWindow)?;
    if decided > issued || issued >= expires || expires_at != decision.expires_at {
        return Err(SignedApprovalVerificationV1Error::InvalidTimeWindow);
    }

    Ok(SignedApprovalPayloadV1 {
        packet,
        packet_hash: packet_hash.to_owned(),
        policy_decision: policy,
        approval_request: request,
        approval_decision: decision,
        issued_at: issued_at.to_owned(),
        expires_at: expires_at.to_owned(),
        nonce_id: nonce_id.to_owned(),
        signing_key_id: signing_key_id.to_owned(),
        signing_key_version: signing_key_version.to_owned(),
        verification_material_ref: verification_material_ref.to_owned(),
        approval_gate_satisfied,
        server_signed: true,
        execution_authorized: false,
        session_authority_state_changed: false,
        mutation_authority: false,
    })
}

fn decision_input(value: &Value) -> Option<ApprovalDecisionV1Input> {
    Some(ApprovalDecisionV1Input {
        approver_ref: value_string(value, "approver_ref")?.to_owned(),
        approver_session_ref: value_string(value, "approver_session_ref")?.to_owned(),
        decision: match value_string(value, "decision")? {
            "approved" => ApprovalDecisionV1Kind::Approved,
            "denied" => ApprovalDecisionV1Kind::Denied,
            _ => return None,
        },
        reason: match value_string(value, "reason_code")? {
            "approval.operator_approved" => ApprovalDecisionV1Reason::OperatorApproved,
            "approval.operator_denied" => ApprovalDecisionV1Reason::OperatorDenied,
            "approval.scope_rejected" => ApprovalDecisionV1Reason::ScopeRejected,
            "approval.evidence_insufficient" => ApprovalDecisionV1Reason::EvidenceInsufficient,
            "approval.request_superseded" => ApprovalDecisionV1Reason::RequestSuperseded,
            _ => return None,
        },
        decided_at: value_string(value, "decided_at")?.to_owned(),
    })
}

fn parse_signature(
    object: &Map<String, Value>,
) -> Result<SignedApprovalSignatureV1, SignedApprovalVerificationV1Error> {
    validate_exact_keys(object, &SIGNATURE_KEYS)?;
    if required_string(object, "signature_profile")? != SIGNATURE_PROFILE {
        return Err(SignedApprovalVerificationV1Error::UnsupportedSignatureProfile);
    }
    let signature = required_string(object, "signature_base64url")?;
    if base64url_decode(signature).is_none_or(|bytes| bytes.len() != 64) {
        return Err(SignedApprovalVerificationV1Error::SignatureMalformed);
    }
    Ok(SignedApprovalSignatureV1 {
        signature_profile: SIGNATURE_PROFILE.to_owned(),
        signature_base64url: signature.to_owned(),
    })
}

fn validate_material_binding(
    payload: &SignedApprovalPayloadV1,
    material: &ApprovalVerificationMaterialV1,
) -> Result<(), SignedApprovalVerificationV1Error> {
    if payload.signing_key_id != material.signing_key_id {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }
    if payload.signing_key_version != material.signing_key_version {
        return Err(
            if key_version_number(&payload.signing_key_version)
                < key_version_number(&material.signing_key_version)
            {
                SignedApprovalVerificationV1Error::KeyVersionDowngrade
            } else {
                SignedApprovalVerificationV1Error::ChainSubstitution
            },
        );
    }
    if payload.verification_material_ref != material.verification_material_ref {
        return Err(SignedApprovalVerificationV1Error::ChainSubstitution);
    }
    let issued = canonical_utc_timestamp_millis_v1(&payload.issued_at)
        .ok_or(SignedApprovalVerificationV1Error::InvalidTimeWindow)?;
    let expires = canonical_utc_timestamp_millis_v1(&payload.expires_at)
        .ok_or(SignedApprovalVerificationV1Error::InvalidTimeWindow)?;
    let valid_from = canonical_utc_timestamp_millis_v1(&material.valid_from)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)?;
    let sign_until = canonical_utc_timestamp_millis_v1(&material.sign_until)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)?;
    let verify_until = canonical_utc_timestamp_millis_v1(&material.verify_until)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)?;
    if issued < valid_from || issued >= sign_until || expires > verify_until {
        return Err(SignedApprovalVerificationV1Error::KeyInactive);
    }
    Ok(())
}

fn payload_json_value(payload: &SignedApprovalPayloadV1) -> Value {
    serde_json::json!({
        "packet": packet_json_value(&payload.packet),
        "packet_hash": payload.packet_hash,
        "policy_decision": policy_json_value(&payload.policy_decision),
        "approval_request": request_json_value(&payload.approval_request),
        "approval_decision": decision_json_value(&payload.approval_decision),
        "issued_at": payload.issued_at,
        "expires_at": payload.expires_at,
        "nonce_id": payload.nonce_id,
        "signing_key_id": payload.signing_key_id,
        "signing_key_version": payload.signing_key_version,
        "verification_material_ref": payload.verification_material_ref,
        "approval_gate_satisfied": payload.approval_gate_satisfied,
        "server_signed": payload.server_signed,
        "execution_authorized": payload.execution_authorized,
        "session_authority_state_changed": payload.session_authority_state_changed,
        "mutation_authority": payload.mutation_authority,
    })
}

fn validate_exact_keys(
    object: &Map<String, Value>,
    required: &[&str],
) -> Result<(), SignedApprovalVerificationV1Error> {
    if object.keys().any(|key| !required.contains(&key.as_str())) {
        return Err(SignedApprovalVerificationV1Error::UnexpectedField);
    }
    if required.iter().any(|key| !object.contains_key(*key)) {
        return Err(SignedApprovalVerificationV1Error::MissingField);
    }
    Ok(())
}

fn required_object<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a Map<String, Value>, SignedApprovalVerificationV1Error> {
    object
        .get(key)
        .and_then(Value::as_object)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)
}

fn required_string<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a str, SignedApprovalVerificationV1Error> {
    object
        .get(key)
        .and_then(Value::as_str)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)
}

fn required_bool(
    object: &Map<String, Value>,
    key: &str,
) -> Result<bool, SignedApprovalVerificationV1Error> {
    object
        .get(key)
        .and_then(Value::as_bool)
        .ok_or(SignedApprovalVerificationV1Error::InvalidField)
}

fn value_string<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value.as_object()?.get(key)?.as_str()
}

fn is_empty_array(value: Option<&Value>) -> bool {
    value.and_then(Value::as_array).is_some_and(Vec::is_empty)
}

fn valid_prefixed_digest(value: &str, prefix: &str) -> bool {
    value.strip_prefix(prefix).is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    })
}

fn valid_nonce(value: &str) -> bool {
    valid_prefixed_digest(value, "nonce_")
}

fn valid_signing_key_id(value: &str) -> bool {
    value
        .strip_prefix("key:approval-signing:")
        .is_some_and(|suffix| {
            !suffix.is_empty()
                && suffix.chars().count() <= 216
                && !suffix.chars().any(char::is_whitespace)
                && !suffix
                    .chars()
                    .any(|character| character <= '\u{001f}' || character == '\u{007f}')
        })
}

fn valid_key_version(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 10
        && value.as_bytes()[0] != b'0'
        && value.bytes().all(|byte| byte.is_ascii_digit())
        && value.parse::<u64>().is_ok()
}

fn key_version_number(value: &str) -> u64 {
    value.parse().unwrap_or(u64::MAX)
}

fn valid_ed25519_spki(value: &str) -> bool {
    base64url_decode(value).is_some_and(|bytes| {
        bytes.len() == 44 && bytes[..ED25519_SPKI_PREFIX.len()] == ED25519_SPKI_PREFIX
    })
}

fn reject_forbidden_fields(value: &Value) -> Result<(), SignedApprovalVerificationV1Error> {
    match value {
        Value::Array(values) => values.iter().try_for_each(reject_forbidden_fields),
        Value::Object(object) => object.iter().try_for_each(|(key, value)| {
            let key = key.to_ascii_lowercase();
            let forbidden = [
                "private_key",
                "seed",
                "password",
                "bearer",
                "csrf",
                "credential",
                "secret",
                "token",
            ];
            if forbidden
                .iter()
                .any(|name| contains_forbidden_field_segment(&key, name))
            {
                return Err(SignedApprovalVerificationV1Error::InvalidField);
            }
            reject_forbidden_fields(value)
        }),
        _ => Ok(()),
    }
}

fn contains_forbidden_field_segment(key: &str, name: &str) -> bool {
    key.match_indices(name).any(|(start, _)| {
        let end = start + name.len();
        (start == 0 || key.as_bytes()[start - 1] == b'_')
            && (end == key.len() || key.as_bytes()[end] == b'_')
    })
}

fn lowercase_sha256(input: &[u8]) -> String {
    let mut output = String::with_capacity(64);
    for byte in Sha256::digest(input) {
        write!(&mut output, "{byte:02x}").expect("writing to a String cannot fail");
    }
    output
}

fn base64url_encode(input: &[u8]) -> String {
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

fn base64url_decode(input: &str) -> Option<Vec<u8>> {
    if input.is_empty() {
        return Some(Vec::new());
    }
    if input.contains('=') || input.len() % 4 == 1 {
        return None;
    }
    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let mut buffer = 0u32;
    let mut bits = 0u8;
    for byte in input.bytes() {
        let value = match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'-' => 62,
            b'_' => 63,
            _ => return None,
        };
        buffer = (buffer << 6) | u32::from(value);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xff) as u8);
            buffer &= (1u32 << bits) - 1;
        }
    }
    if bits > 0 && buffer != 0 {
        return None;
    }
    (base64url_encode(&output) == input).then_some(output)
}

const fn primitive_rejection(
    rejection_class: Ed25519VerificationRejectionClassV1,
) -> Ed25519VerificationPrimitiveResultV1 {
    Ed25519VerificationPrimitiveResultV1 {
        accepted: false,
        rejection_class,
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct JsonScanResult {
    duplicate_key: bool,
    max_depth: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum JsonScanError {
    Invalid,
    TooDeep,
}

struct JsonScanner<'a> {
    input: &'a [u8],
    index: usize,
    duplicate_key: bool,
    max_depth: usize,
}

impl<'a> JsonScanner<'a> {
    fn new(input: &'a [u8]) -> Self {
        Self {
            input,
            index: 0,
            duplicate_key: false,
            max_depth: 0,
        }
    }

    fn scan(mut self) -> Result<JsonScanResult, JsonScanError> {
        self.value(0)?;
        self.whitespace();
        if self.index != self.input.len() {
            return Err(JsonScanError::Invalid);
        }
        Ok(JsonScanResult {
            duplicate_key: self.duplicate_key,
            max_depth: self.max_depth,
        })
    }

    fn value(&mut self, depth: usize) -> Result<(), JsonScanError> {
        self.whitespace();
        if depth > MAX_INPUT_DEPTH {
            return Err(JsonScanError::TooDeep);
        }
        self.max_depth = self.max_depth.max(depth);
        match self.input.get(self.index) {
            Some(b'{') => self.object(depth + 1),
            Some(b'[') => self.array(depth + 1),
            Some(b'"') => self.string().map(|_| ()),
            Some(_) => self.primitive(),
            None => Err(JsonScanError::Invalid),
        }?;
        self.whitespace();
        Ok(())
    }

    fn object(&mut self, depth: usize) -> Result<(), JsonScanError> {
        self.index += 1;
        self.whitespace();
        let mut keys = BTreeSet::new();
        if self.input.get(self.index) == Some(&b'}') {
            self.index += 1;
            return Ok(());
        }
        loop {
            let key = self.string()?;
            if !keys.insert(key) {
                self.duplicate_key = true;
            }
            self.whitespace();
            if self.input.get(self.index) != Some(&b':') {
                return Err(JsonScanError::Invalid);
            }
            self.index += 1;
            self.value(depth)?;
            match self.input.get(self.index) {
                Some(b'}') => {
                    self.index += 1;
                    return Ok(());
                }
                Some(b',') => {
                    self.index += 1;
                    self.whitespace();
                }
                _ => return Err(JsonScanError::Invalid),
            }
        }
    }

    fn array(&mut self, depth: usize) -> Result<(), JsonScanError> {
        self.index += 1;
        self.whitespace();
        if self.input.get(self.index) == Some(&b']') {
            self.index += 1;
            return Ok(());
        }
        loop {
            self.value(depth)?;
            match self.input.get(self.index) {
                Some(b']') => {
                    self.index += 1;
                    return Ok(());
                }
                Some(b',') => {
                    self.index += 1;
                    self.whitespace();
                }
                _ => return Err(JsonScanError::Invalid),
            }
        }
    }

    fn string(&mut self) -> Result<String, JsonScanError> {
        let start = self.index;
        if self.input.get(self.index) != Some(&b'"') {
            return Err(JsonScanError::Invalid);
        }
        self.index += 1;
        while self.index < self.input.len() {
            match self.input[self.index] {
                b'\\' => {
                    self.index = self.index.checked_add(2).ok_or(JsonScanError::Invalid)?;
                }
                b'"' => {
                    self.index += 1;
                    return serde_json::from_slice(&self.input[start..self.index])
                        .map_err(|_| JsonScanError::Invalid);
                }
                _ => self.index += 1,
            }
        }
        Err(JsonScanError::Invalid)
    }

    fn primitive(&mut self) -> Result<(), JsonScanError> {
        let start = self.index;
        while self.index < self.input.len()
            && !matches!(
                self.input[self.index],
                b' ' | b'\n' | b'\r' | b'\t' | b',' | b']' | b'}'
            )
        {
            self.index += 1;
        }
        (self.index > start)
            .then_some(())
            .ok_or(JsonScanError::Invalid)
    }

    fn whitespace(&mut self) {
        while self
            .input
            .get(self.index)
            .is_some_and(|byte| matches!(byte, b' ' | b'\n' | b'\r' | b'\t'))
        {
            self.index += 1;
        }
    }
}
