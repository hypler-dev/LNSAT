use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

use crate::packet::canonicalize_json_value;
use crate::{
    CONTRACT_VERSION_V1_0, PacketEnvelopeV1, canonical_utc_timestamp_millis_v1,
    hash_packet_envelope_v1, is_valid_reference_v1,
};

/// Exact packet-embedded execution proposal schema.
pub const EXECUTION_PROPOSAL_SCHEMA_V1_0: &str = "lnsat.execution_proposal.schema.v1_0";
/// Exact post-approval execution request schema.
pub const EXECUTION_REQUEST_SCHEMA_V1_0: &str = "lnsat.execution_request.schema.v1_0";
/// Stable derivation profile from approved packet bytes.
pub const EXECUTION_REQUEST_DERIVATION_PROFILE_V1: &str =
    "lnsat.execution_request.packet_embedded.v1";

const POLICY_DECISION_SCHEMA_V1_0: &str = "lnsat.policy_decision.schema.v1_0";
const APPROVAL_REQUEST_SCHEMA_V1_0: &str = "lnsat.approval_request.schema.v1_0";
const APPROVAL_DECISION_SCHEMA_V1_0: &str = "lnsat.approval_decision.schema.v1_0";
const ACTION_DIGEST_DOMAIN_V1: &str = "lnsat.execution-request.action.v1";
const TARGET_DIGEST_DOMAIN_V1: &str = "lnsat.execution-request.target.v1";

/// Canonical action content shown through exact approved packet bytes.
#[derive(Clone, Debug, PartialEq)]
pub struct ExecutionActionV1 {
    pub kind: String,
    pub arguments: Map<String, Value>,
}

/// Canonical target content shown through exact approved packet bytes.
#[derive(Clone, Debug, PartialEq)]
pub struct ExecutionTargetV1 {
    pub resource_ref: String,
    pub identity: Map<String, Value>,
}

/// Versioned adapter identity shown through exact approved packet bytes.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionAdapterV1 {
    pub adapter_ref: String,
    pub version: String,
}

/// Exact proposal embedded at `constraints.execution_proposal`.
#[derive(Clone, Debug, PartialEq)]
pub struct ExecutionProposalV1 {
    pub schema_id: String,
    pub derivation_profile: String,
    pub action: ExecutionActionV1,
    pub target: ExecutionTargetV1,
    pub configuration_digest: String,
    pub adapter: ExecutionAdapterV1,
    pub executable_digest: String,
    pub audience: String,
}

/// Exact approved-chain input used to derive one post-approval request.
#[derive(Clone, Copy, Debug)]
pub struct ExecutionRequestV1Input<'a> {
    pub packet: &'a PacketEnvelopeV1,
    pub packet_sha256: &'a str,
    pub policy_decision_id: &'a str,
    pub approval_request_id: &'a str,
    pub approval_decision_id: &'a str,
    pub requester_ref: &'a str,
    pub requester_session_ref: &'a str,
    pub approver_ref: &'a str,
    pub approver_session_ref: &'a str,
    pub prepared_at: &'a str,
    pub expires_at: &'a str,
}

/// Canonical post-approval execution request. It grants no authority itself.
#[derive(Clone, Debug, PartialEq)]
pub struct ExecutionRequestV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub derivation_profile: String,
    pub packet_id: String,
    pub packet_sha256: String,
    pub policy_decision_id: String,
    pub approval_request_id: String,
    pub approval_decision_id: String,
    pub requester_ref: String,
    pub requester_session_ref: String,
    pub approver_ref: String,
    pub approver_session_ref: String,
    pub project_ref: String,
    pub resource_ref: String,
    pub action: ExecutionActionV1,
    pub target: ExecutionTargetV1,
    pub configuration_digest: String,
    pub adapter: ExecutionAdapterV1,
    pub executable_digest: String,
    pub audience: String,
    pub prepared_at: String,
    pub expires_at: String,
}

/// Canonical bytes and all rederived digest evidence for one request.
#[derive(Clone, Debug, PartialEq)]
pub struct DerivedExecutionRequestV1 {
    pub request: ExecutionRequestV1,
    pub canonical_request: String,
    pub request_digest: [u8; 32],
    pub action_digest: [u8; 32],
    pub target_digest: [u8; 32],
    pub configuration_digest: [u8; 32],
    pub executable_digest: [u8; 32],
}

/// Stable fail-closed proposal/request derivation errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ExecutionRequestV1Error {
    InvalidPacket,
    ProposalMissing,
    ProposalInvalid,
    ChainInvalid,
    TimeInvalid,
    CanonicalizationFailed,
}

impl ExecutionRequestV1Error {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPacket => "execution_request.invalid_packet",
            Self::ProposalMissing => "execution_request.proposal_missing",
            Self::ProposalInvalid => "execution_request.proposal_invalid",
            Self::ChainInvalid => "execution_request.chain_invalid",
            Self::TimeInvalid => "execution_request.time_invalid",
            Self::CanonicalizationFailed => "execution_request.canonicalization_failed",
        }
    }
}

impl core::fmt::Display for ExecutionRequestV1Error {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ExecutionRequestV1Error {}

/// Parses exact action proposal from already-validated packet constraints.
///
/// Legacy packets without this profile remain readable but cannot become
/// execution requests.
///
/// # Errors
///
/// Rejects missing, extra, malformed, unbound, or noncanonical proposal data.
pub fn parse_execution_proposal_v1(
    packet: &PacketEnvelopeV1,
) -> Result<ExecutionProposalV1, ExecutionRequestV1Error> {
    let value = packet
        .constraints
        .get("execution_proposal")
        .ok_or(ExecutionRequestV1Error::ProposalMissing)?;
    let proposal = value
        .as_object()
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)?;
    exact_keys(
        proposal,
        &[
            "schema_id",
            "derivation_profile",
            "action",
            "target",
            "configuration_digest",
            "adapter",
            "executable_digest",
            "audience",
        ],
    )?;

    let schema_id = required_string(proposal, "schema_id")?;
    let derivation_profile = required_string(proposal, "derivation_profile")?;
    if schema_id != EXECUTION_PROPOSAL_SCHEMA_V1_0
        || derivation_profile != EXECUTION_REQUEST_DERIVATION_PROFILE_V1
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let action = required_object(proposal, "action")?;
    exact_keys(action, &["kind", "arguments"])?;
    let action_kind = required_bounded_string(action, "kind", 256)?;
    let arguments = required_object(action, "arguments")?.clone();
    canonicalize_json_value(&Value::Object(arguments.clone()))
        .map_err(|_| ExecutionRequestV1Error::ProposalInvalid)?;

    let target = required_object(proposal, "target")?;
    exact_keys(target, &["resource_ref", "identity"])?;
    let resource_ref = required_string(target, "resource_ref")?;
    if !is_valid_reference_v1(resource_ref)
        || !packet.resource_refs.iter().any(|v| v == resource_ref)
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }
    let identity = required_object(target, "identity")?.clone();
    canonicalize_json_value(&Value::Object(identity.clone()))
        .map_err(|_| ExecutionRequestV1Error::ProposalInvalid)?;

    let configuration_digest = required_sha256(proposal, "configuration_digest")?;
    let executable_digest = required_sha256(proposal, "executable_digest")?;

    let adapter = required_object(proposal, "adapter")?;
    exact_keys(adapter, &["ref", "version"])?;
    let adapter_ref = required_string(adapter, "ref")?;
    let version = required_bounded_string(adapter, "version", 128)?;
    if !is_valid_reference_v1(adapter_ref)
        || adapter_ref.contains('@')
        || !valid_adapter_version(version)
        || adapter_ref.encode_utf16().count() + version.encode_utf16().count() + 1 > 256
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }
    let audience = required_string(proposal, "audience")?;
    if !is_valid_reference_v1(audience) {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    Ok(ExecutionProposalV1 {
        schema_id: schema_id.to_owned(),
        derivation_profile: derivation_profile.to_owned(),
        action: ExecutionActionV1 {
            kind: action_kind.to_owned(),
            arguments,
        },
        target: ExecutionTargetV1 {
            resource_ref: resource_ref.to_owned(),
            identity,
        },
        configuration_digest: configuration_digest.to_owned(),
        adapter: ExecutionAdapterV1 {
            adapter_ref: adapter_ref.to_owned(),
            version: version.to_owned(),
        },
        executable_digest: executable_digest.to_owned(),
        audience: audience.to_owned(),
    })
}

/// Derives canonical request bytes and all stored digests from exact packet
/// content plus exact persisted approval-chain identities.
///
/// # Errors
///
/// Fails closed for packet/hash drift, invalid chain identities, invalid time,
/// malformed proposal content, or canonicalization failure.
pub fn derive_execution_request_v1(
    input: &ExecutionRequestV1Input<'_>,
) -> Result<DerivedExecutionRequestV1, ExecutionRequestV1Error> {
    if hash_packet_envelope_v1(input.packet).map_err(|_| ExecutionRequestV1Error::InvalidPacket)?
        != input.packet_sha256
        || !valid_prefixed_digest(input.packet_sha256, "sha256:")
        || !valid_prefixed_digest(input.policy_decision_id, "pol_")
        || !valid_prefixed_digest(input.approval_request_id, "apr_")
        || !valid_prefixed_digest(input.approval_decision_id, "apd_")
        || !is_valid_reference_v1(input.requester_ref)
        || !is_valid_reference_v1(input.requester_session_ref)
        || !is_valid_reference_v1(input.approver_ref)
        || !is_valid_reference_v1(input.approver_session_ref)
    {
        return Err(ExecutionRequestV1Error::ChainInvalid);
    }
    let prepared_at = canonical_utc_timestamp_millis_v1(input.prepared_at)
        .ok_or(ExecutionRequestV1Error::TimeInvalid)?;
    let expires_at = canonical_utc_timestamp_millis_v1(input.expires_at)
        .ok_or(ExecutionRequestV1Error::TimeInvalid)?;
    if prepared_at >= expires_at {
        return Err(ExecutionRequestV1Error::TimeInvalid);
    }

    let proposal = parse_execution_proposal_v1(input.packet)?;
    let request = ExecutionRequestV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: EXECUTION_REQUEST_SCHEMA_V1_0.to_owned(),
        derivation_profile: proposal.derivation_profile.clone(),
        packet_id: input.packet.packet_id.clone(),
        packet_sha256: input.packet_sha256.to_owned(),
        policy_decision_id: input.policy_decision_id.to_owned(),
        approval_request_id: input.approval_request_id.to_owned(),
        approval_decision_id: input.approval_decision_id.to_owned(),
        requester_ref: input.requester_ref.to_owned(),
        requester_session_ref: input.requester_session_ref.to_owned(),
        approver_ref: input.approver_ref.to_owned(),
        approver_session_ref: input.approver_session_ref.to_owned(),
        project_ref: input.packet.project_ref.clone(),
        resource_ref: proposal.target.resource_ref.clone(),
        action: proposal.action,
        target: proposal.target,
        configuration_digest: proposal.configuration_digest,
        adapter: proposal.adapter,
        executable_digest: proposal.executable_digest,
        audience: proposal.audience,
        prepared_at: input.prepared_at.to_owned(),
        expires_at: input.expires_at.to_owned(),
    };
    let value = execution_request_json(&request);
    let canonical_request = canonicalize_json_value(&value)
        .map_err(|_| ExecutionRequestV1Error::CanonicalizationFailed)?;
    let request_digest = Sha256::digest(canonical_request.as_bytes()).into();
    let action_digest = domain_digest(ACTION_DIGEST_DOMAIN_V1, &action_json(&request.action))?;
    let target_digest = domain_digest(TARGET_DIGEST_DOMAIN_V1, &target_json(&request.target))?;
    let configuration_digest = decode_sha256(&request.configuration_digest)
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)?;
    let executable_digest = decode_sha256(&request.executable_digest)
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)?;

    Ok(DerivedExecutionRequestV1 {
        request,
        canonical_request,
        request_digest,
        action_digest,
        target_digest,
        configuration_digest,
        executable_digest,
    })
}

/// Verifies that every derived request byte and digest still matches its
/// structured request payload.
///
/// # Errors
///
/// Rejects canonical bytes or digest fields that drift from request content.
pub fn verify_derived_execution_request_v1(
    derived: &DerivedExecutionRequestV1,
) -> Result<(), ExecutionRequestV1Error> {
    let canonical_request = canonicalize_json_value(&execution_request_json(&derived.request))
        .map_err(|_| ExecutionRequestV1Error::CanonicalizationFailed)?;
    let request_digest: [u8; 32] = Sha256::digest(canonical_request.as_bytes()).into();
    let action_digest = domain_digest(
        ACTION_DIGEST_DOMAIN_V1,
        &action_json(&derived.request.action),
    )?;
    let target_digest = domain_digest(
        TARGET_DIGEST_DOMAIN_V1,
        &target_json(&derived.request.target),
    )?;
    let configuration_digest = decode_sha256(&derived.request.configuration_digest)
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)?;
    let executable_digest = decode_sha256(&derived.request.executable_digest)
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)?;
    if derived.canonical_request != canonical_request
        || derived.request_digest != request_digest
        || derived.action_digest != action_digest
        || derived.target_digest != target_digest
        || derived.configuration_digest != configuration_digest
        || derived.executable_digest != executable_digest
    {
        return Err(ExecutionRequestV1Error::ChainInvalid);
    }
    Ok(())
}

/// Parses one exact canonical post-approval execution request.
///
/// This reconstructs digest evidence from closed canonical bytes. It grants no
/// execution authority and performs no side effect.
///
/// # Errors
///
/// Rejects noncanonical JSON, duplicate or unknown fields, invalid identities,
/// malformed action or target content, invalid time bounds, and digest fields
/// outside the exact v1 contract.
#[allow(clippy::too_many_lines)]
pub fn parse_canonical_execution_request_v1(
    canonical_request: &str,
) -> Result<DerivedExecutionRequestV1, ExecutionRequestV1Error> {
    let value: Value = serde_json::from_str(canonical_request)
        .map_err(|_| ExecutionRequestV1Error::ProposalInvalid)?;
    let canonical = canonicalize_json_value(&value)
        .map_err(|_| ExecutionRequestV1Error::CanonicalizationFailed)?;
    if canonical != canonical_request {
        return Err(ExecutionRequestV1Error::ChainInvalid);
    }
    let object = value
        .as_object()
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)?;
    exact_keys(
        object,
        &[
            "contract_version",
            "schema_id",
            "derivation_profile",
            "packet_ref",
            "policy_decision_ref",
            "approval_request_ref",
            "approval_decision_ref",
            "requester_ref",
            "requester_session_ref",
            "approver_ref",
            "approver_session_ref",
            "project_ref",
            "resource_ref",
            "action",
            "target",
            "configuration_digest",
            "adapter",
            "executable_digest",
            "audience",
            "prepared_at",
            "expires_at",
        ],
    )?;
    if required_string(object, "contract_version")? != CONTRACT_VERSION_V1_0
        || required_string(object, "schema_id")? != EXECUTION_REQUEST_SCHEMA_V1_0
        || required_string(object, "derivation_profile")? != EXECUTION_REQUEST_DERIVATION_PROFILE_V1
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let packet_ref = required_object(object, "packet_ref")?;
    exact_keys(packet_ref, &["schema_id", "packet_id", "packet_sha256"])?;
    let packet_id = required_string(packet_ref, "packet_id")?;
    let packet_sha256 = required_string(packet_ref, "packet_sha256")?;
    if required_string(packet_ref, "schema_id")? != "lnsat.packet_envelope.schema.v1_0"
        || !valid_prefixed_digest(packet_id, "pkt_")
        || !valid_prefixed_digest(packet_sha256, "sha256:")
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let policy_ref = required_object(object, "policy_decision_ref")?;
    exact_keys(policy_ref, &["schema_id", "decision_id"])?;
    let policy_decision_id = required_string(policy_ref, "decision_id")?;
    if required_string(policy_ref, "schema_id")? != POLICY_DECISION_SCHEMA_V1_0
        || !valid_prefixed_digest(policy_decision_id, "pol_")
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let approval_request_ref = required_object(object, "approval_request_ref")?;
    exact_keys(approval_request_ref, &["schema_id", "approval_request_id"])?;
    let approval_request_id = required_string(approval_request_ref, "approval_request_id")?;
    if required_string(approval_request_ref, "schema_id")? != APPROVAL_REQUEST_SCHEMA_V1_0
        || !valid_prefixed_digest(approval_request_id, "apr_")
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let approval_decision_ref = required_object(object, "approval_decision_ref")?;
    exact_keys(
        approval_decision_ref,
        &["schema_id", "approval_decision_id"],
    )?;
    let approval_decision_id = required_string(approval_decision_ref, "approval_decision_id")?;
    if required_string(approval_decision_ref, "schema_id")? != APPROVAL_DECISION_SCHEMA_V1_0
        || !valid_prefixed_digest(approval_decision_id, "apd_")
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let requester_ref = required_string(object, "requester_ref")?;
    let requester_session_ref = required_string(object, "requester_session_ref")?;
    let approver_ref = required_string(object, "approver_ref")?;
    let approver_session_ref = required_string(object, "approver_session_ref")?;
    let project_ref = required_string(object, "project_ref")?;
    let resource_ref = required_string(object, "resource_ref")?;
    let audience = required_string(object, "audience")?;
    if [
        requester_ref,
        requester_session_ref,
        approver_ref,
        approver_session_ref,
        project_ref,
        resource_ref,
        audience,
    ]
    .iter()
    .any(|value| !is_valid_reference_v1(value))
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let action = required_object(object, "action")?;
    exact_keys(action, &["kind", "arguments"])?;
    let action_kind = required_bounded_string(action, "kind", 256)?;
    let action_arguments = required_object(action, "arguments")?.clone();

    let target = required_object(object, "target")?;
    exact_keys(target, &["resource_ref", "identity"])?;
    if required_string(target, "resource_ref")? != resource_ref {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }
    let target_identity = required_object(target, "identity")?.clone();

    let adapter = required_object(object, "adapter")?;
    exact_keys(adapter, &["ref", "version"])?;
    let adapter_ref = required_string(adapter, "ref")?;
    let adapter_version = required_string(adapter, "version")?;
    if !is_valid_reference_v1(adapter_ref)
        || adapter_ref.contains('@')
        || !valid_adapter_version(adapter_version)
        || adapter_ref.encode_utf16().count() + adapter_version.encode_utf16().count() + 1 > 256
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }

    let configuration_digest = required_sha256(object, "configuration_digest")?;
    let executable_digest = required_sha256(object, "executable_digest")?;
    let prepared_at = required_string(object, "prepared_at")?;
    let expires_at = required_string(object, "expires_at")?;
    let prepared = canonical_utc_timestamp_millis_v1(prepared_at)
        .ok_or(ExecutionRequestV1Error::TimeInvalid)?;
    let expires = canonical_utc_timestamp_millis_v1(expires_at)
        .ok_or(ExecutionRequestV1Error::TimeInvalid)?;
    if prepared >= expires {
        return Err(ExecutionRequestV1Error::TimeInvalid);
    }

    let request = ExecutionRequestV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: EXECUTION_REQUEST_SCHEMA_V1_0.to_owned(),
        derivation_profile: EXECUTION_REQUEST_DERIVATION_PROFILE_V1.to_owned(),
        packet_id: packet_id.to_owned(),
        packet_sha256: packet_sha256.to_owned(),
        policy_decision_id: policy_decision_id.to_owned(),
        approval_request_id: approval_request_id.to_owned(),
        approval_decision_id: approval_decision_id.to_owned(),
        requester_ref: requester_ref.to_owned(),
        requester_session_ref: requester_session_ref.to_owned(),
        approver_ref: approver_ref.to_owned(),
        approver_session_ref: approver_session_ref.to_owned(),
        project_ref: project_ref.to_owned(),
        resource_ref: resource_ref.to_owned(),
        action: ExecutionActionV1 {
            kind: action_kind.to_owned(),
            arguments: action_arguments,
        },
        target: ExecutionTargetV1 {
            resource_ref: resource_ref.to_owned(),
            identity: target_identity,
        },
        configuration_digest: configuration_digest.to_owned(),
        adapter: ExecutionAdapterV1 {
            adapter_ref: adapter_ref.to_owned(),
            version: adapter_version.to_owned(),
        },
        executable_digest: executable_digest.to_owned(),
        audience: audience.to_owned(),
        prepared_at: prepared_at.to_owned(),
        expires_at: expires_at.to_owned(),
    };
    let derived = DerivedExecutionRequestV1 {
        canonical_request: canonical,
        request_digest: Sha256::digest(canonical_request.as_bytes()).into(),
        action_digest: domain_digest(ACTION_DIGEST_DOMAIN_V1, &action_json(&request.action))?,
        target_digest: domain_digest(TARGET_DIGEST_DOMAIN_V1, &target_json(&request.target))?,
        configuration_digest: decode_sha256(configuration_digest)
            .ok_or(ExecutionRequestV1Error::ProposalInvalid)?,
        executable_digest: decode_sha256(executable_digest)
            .ok_or(ExecutionRequestV1Error::ProposalInvalid)?,
        request,
    };
    verify_derived_execution_request_v1(&derived)?;
    Ok(derived)
}

fn execution_request_json(request: &ExecutionRequestV1) -> Value {
    serde_json::json!({
        "contract_version": request.contract_version,
        "schema_id": request.schema_id,
        "derivation_profile": request.derivation_profile,
        "packet_ref": {
            "schema_id": "lnsat.packet_envelope.schema.v1_0",
            "packet_id": request.packet_id,
            "packet_sha256": request.packet_sha256,
        },
        "policy_decision_ref": {
            "schema_id": POLICY_DECISION_SCHEMA_V1_0,
            "decision_id": request.policy_decision_id,
        },
        "approval_request_ref": {
            "schema_id": APPROVAL_REQUEST_SCHEMA_V1_0,
            "approval_request_id": request.approval_request_id,
        },
        "approval_decision_ref": {
            "schema_id": APPROVAL_DECISION_SCHEMA_V1_0,
            "approval_decision_id": request.approval_decision_id,
        },
        "requester_ref": request.requester_ref,
        "requester_session_ref": request.requester_session_ref,
        "approver_ref": request.approver_ref,
        "approver_session_ref": request.approver_session_ref,
        "project_ref": request.project_ref,
        "resource_ref": request.resource_ref,
        "action": action_json(&request.action),
        "target": target_json(&request.target),
        "configuration_digest": request.configuration_digest,
        "adapter": {
            "ref": request.adapter.adapter_ref,
            "version": request.adapter.version,
        },
        "executable_digest": request.executable_digest,
        "audience": request.audience,
        "prepared_at": request.prepared_at,
        "expires_at": request.expires_at,
    })
}

fn action_json(action: &ExecutionActionV1) -> Value {
    serde_json::json!({
        "kind": action.kind,
        "arguments": action.arguments,
    })
}

fn target_json(target: &ExecutionTargetV1) -> Value {
    serde_json::json!({
        "resource_ref": target.resource_ref,
        "identity": target.identity,
    })
}

fn domain_digest(domain: &str, value: &Value) -> Result<[u8; 32], ExecutionRequestV1Error> {
    let canonical = canonicalize_json_value(value)
        .map_err(|_| ExecutionRequestV1Error::CanonicalizationFailed)?;
    let mut digest = Sha256::new();
    digest.update(domain.as_bytes());
    digest.update([0]);
    digest.update(
        u32::try_from(canonical.len())
            .unwrap_or(u32::MAX)
            .to_be_bytes(),
    );
    digest.update(canonical.as_bytes());
    Ok(digest.finalize().into())
}

fn exact_keys(
    object: &Map<String, Value>,
    expected: &[&str],
) -> Result<(), ExecutionRequestV1Error> {
    if object.len() != expected.len() || !expected.iter().all(|key| object.contains_key(*key)) {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }
    Ok(())
}

fn required_object<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a Map<String, Value>, ExecutionRequestV1Error> {
    object
        .get(key)
        .and_then(Value::as_object)
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)
}

fn required_string<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a str, ExecutionRequestV1Error> {
    object
        .get(key)
        .and_then(Value::as_str)
        .ok_or(ExecutionRequestV1Error::ProposalInvalid)
}

fn required_bounded_string<'a>(
    object: &'a Map<String, Value>,
    key: &str,
    max: usize,
) -> Result<&'a str, ExecutionRequestV1Error> {
    let value = required_string(object, key)?;
    if value.is_empty() || value.encode_utf16().count() > max || value.chars().any(char::is_control)
    {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }
    Ok(value)
}

fn required_sha256<'a>(
    object: &'a Map<String, Value>,
    key: &str,
) -> Result<&'a str, ExecutionRequestV1Error> {
    let value = required_string(object, key)?;
    if !valid_prefixed_digest(value, "sha256:") {
        return Err(ExecutionRequestV1Error::ProposalInvalid);
    }
    Ok(value)
}

fn valid_adapter_version(value: &str) -> bool {
    let bytes = value.as_bytes();
    !bytes.is_empty()
        && bytes.len() <= 128
        && bytes[0].is_ascii_alphanumeric()
        && bytes[bytes.len() - 1].is_ascii_alphanumeric()
        && bytes
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
}

fn valid_prefixed_digest(value: &str, prefix: &str) -> bool {
    value.strip_prefix(prefix).is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    })
}

fn decode_sha256(value: &str) -> Option<[u8; 32]> {
    let hex = value.strip_prefix("sha256:")?;
    if hex.len() != 64 {
        return None;
    }
    let mut output = [0_u8; 32];
    for (index, chunk) in hex.as_bytes().chunks_exact(2).enumerate() {
        let high = decode_hex(chunk[0])?;
        let low = decode_hex(chunk[1])?;
        output[index] = (high << 4) | low;
    }
    Some(output)
}

const fn decode_hex(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::PacketBudgetV1;

    fn packet() -> PacketEnvelopeV1 {
        PacketEnvelopeV1 {
            contract_version: CONTRACT_VERSION_V1_0.to_owned(),
            schema_id: "lnsat.packet_envelope.schema.v1_0".to_owned(),
            packet_id: format!("pkt_{}", "1".repeat(64)),
            packet_type: "ExecutionPacket".to_owned(),
            actor_ref: "identity:human:requester".to_owned(),
            session_ref: "session:local:requester".to_owned(),
            project_ref: "project:fixture".to_owned(),
            intent: "Create one bounded fixture commit".to_owned(),
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
                cpu_millicores: 100,
                memory_bytes: 1_048_576,
            },
            constraints: serde_json::json!({
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
                    "configuration_digest": format!("sha256:{}", "c".repeat(64)),
                    "adapter": {
                        "ref": "adapter:local:git-commit",
                        "version": "v1"
                    },
                    "executable_digest": format!("sha256:{}", "e".repeat(64)),
                    "audience": "audience:gateway:local"
                }
            })
            .as_object()
            .expect("constraints object")
            .clone(),
            requires_approval: true,
            idempotency_key: format!("idem_{}", "2".repeat(64)),
            created_at: "2026-07-22T20:00:00Z".to_owned(),
            expires_at: "2026-07-22T20:08:00Z".to_owned(),
        }
    }

    fn derive(packet: &PacketEnvelopeV1, packet_sha256: &str) -> DerivedExecutionRequestV1 {
        derive_execution_request_v1(&ExecutionRequestV1Input {
            packet,
            packet_sha256,
            policy_decision_id: &format!("pol_{}", "3".repeat(64)),
            approval_request_id: &format!("apr_{}", "4".repeat(64)),
            approval_decision_id: &format!("apd_{}", "5".repeat(64)),
            requester_ref: "identity:human:requester",
            requester_session_ref: "session:local:requester",
            approver_ref: "identity:human:approver",
            approver_session_ref: "session:local:approver",
            prepared_at: "2026-07-22T20:02:00.000Z",
            expires_at: "2026-07-22T20:08:00Z",
        })
        .expect("execution request must derive")
    }

    #[test]
    fn exact_packet_proposal_derives_stable_request_and_domain_digests() {
        let packet = packet();
        let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash");
        let derived = derive(&packet, &packet_sha256);
        assert_eq!(derived.request.resource_ref, "resource:repository:fixture");
        assert_eq!(derived.configuration_digest, [0xcc; 32]);
        assert_eq!(derived.executable_digest, [0xee; 32]);
        assert_eq!(derived.request_digest.len(), 32);
        assert_ne!(derived.action_digest, derived.target_digest);
        assert!(derived.canonical_request.contains("\"git.commit\""));
        assert!(!derived.canonical_request.contains('\n'));
        assert!(!derived.canonical_request.contains('\t'));
        assert!(!derived.canonical_request.contains(": "));
        assert!(!derived.canonical_request.contains(", "));
    }

    #[test]
    fn canonical_execution_request_parser_round_trips_and_rejects_shape_drift() {
        let packet = packet();
        let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash");
        let derived = derive(&packet, &packet_sha256);
        let parsed = parse_canonical_execution_request_v1(&derived.canonical_request)
            .expect("canonical request must parse");
        assert_eq!(parsed, derived);

        let value: Value = serde_json::from_str(&derived.canonical_request).expect("request value");
        let pretty = serde_json::to_string_pretty(&value).expect("pretty request");
        assert_eq!(
            parse_canonical_execution_request_v1(&pretty),
            Err(ExecutionRequestV1Error::ChainInvalid)
        );

        let duplicate = derived.canonical_request.replacen(
            "\"contract_version\":",
            "\"contract_version\":\"lnsat.contracts.v1_0\",\"contract_version\":",
            1,
        );
        assert_eq!(
            parse_canonical_execution_request_v1(&duplicate),
            Err(ExecutionRequestV1Error::ChainInvalid)
        );

        let mut unknown = value;
        unknown
            .as_object_mut()
            .expect("request object")
            .insert("unknown".to_owned(), Value::Bool(true));
        let unknown = canonicalize_json_value(&unknown).expect("canonical unknown request");
        assert_eq!(
            parse_canonical_execution_request_v1(&unknown),
            Err(ExecutionRequestV1Error::ProposalInvalid)
        );
    }

    #[test]
    fn proposal_substitution_or_missing_profile_fails_before_request_derivation() {
        let mut substituted = packet();
        let approved_hash = hash_packet_envelope_v1(&substituted).expect("approved packet hash");
        substituted
            .constraints
            .get_mut("execution_proposal")
            .and_then(Value::as_object_mut)
            .and_then(|proposal| proposal.get_mut("action"))
            .and_then(Value::as_object_mut)
            .expect("action object")
            .insert("kind".to_owned(), Value::String("git.push".to_owned()));
        assert_eq!(
            derive_execution_request_v1(&ExecutionRequestV1Input {
                packet: &substituted,
                packet_sha256: &approved_hash,
                policy_decision_id: &format!("pol_{}", "3".repeat(64)),
                approval_request_id: &format!("apr_{}", "4".repeat(64)),
                approval_decision_id: &format!("apd_{}", "5".repeat(64)),
                requester_ref: "identity:human:requester",
                requester_session_ref: "session:local:requester",
                approver_ref: "identity:human:approver",
                approver_session_ref: "session:local:approver",
                prepared_at: "2026-07-22T20:02:00.000Z",
                expires_at: "2026-07-22T20:08:00Z",
            }),
            Err(ExecutionRequestV1Error::ChainInvalid)
        );

        let mut legacy = packet();
        legacy.constraints.remove("execution_proposal");
        assert_eq!(
            parse_execution_proposal_v1(&legacy),
            Err(ExecutionRequestV1Error::ProposalMissing)
        );

        let mut ambiguous_adapter = packet();
        ambiguous_adapter
            .constraints
            .get_mut("execution_proposal")
            .and_then(Value::as_object_mut)
            .and_then(|proposal| proposal.get_mut("adapter"))
            .and_then(Value::as_object_mut)
            .expect("adapter object")
            .insert(
                "ref".to_owned(),
                Value::String("adapter:local@git-commit".to_owned()),
            );
        assert_eq!(
            parse_execution_proposal_v1(&ambiguous_adapter),
            Err(ExecutionRequestV1Error::ProposalInvalid)
        );
    }

    fn derive_result(
        packet: &PacketEnvelopeV1,
        packet_sha256: &str,
    ) -> Result<DerivedExecutionRequestV1, ExecutionRequestV1Error> {
        derive_execution_request_v1(&ExecutionRequestV1Input {
            packet,
            packet_sha256,
            policy_decision_id: &format!("pol_{}", "3".repeat(64)),
            approval_request_id: &format!("apr_{}", "4".repeat(64)),
            approval_decision_id: &format!("apd_{}", "5".repeat(64)),
            requester_ref: "identity:human:requester",
            requester_session_ref: "session:local:requester",
            approver_ref: "identity:human:approver",
            approver_session_ref: "session:local:approver",
            prepared_at: "2026-07-22T20:02:00.000Z",
            expires_at: "2026-07-22T20:08:00Z",
        })
    }

    #[test]
    fn gateway_property_stale_approval_packet_substitutions_are_rejected() {
        let approved = packet();
        let approved_hash = hash_packet_envelope_v1(&approved).expect("approved packet hash");
        let cases = [
            "action.kind",
            "action.arguments",
            "target.resource_ref",
            "target.identity",
            "configuration_digest",
            "adapter.ref",
            "adapter.version",
            "executable_digest",
            "audience",
            "project_ref",
        ];

        for (index, case) in cases.iter().enumerate() {
            let mut substituted = approved.clone();
            match *case {
                "action.kind" => {
                    substituted.constraints["execution_proposal"]["action"]["kind"] =
                        Value::String("git.push".to_owned());
                }
                "action.arguments" => {
                    substituted.constraints["execution_proposal"]["action"]["arguments"] =
                        serde_json::json!({"message":"substituted","path":"fixture.txt"});
                }
                "target.resource_ref" => {
                    substituted.constraints["execution_proposal"]["target"]["resource_ref"] =
                        Value::String("resource:repository:other".to_owned());
                }
                "target.identity" => {
                    substituted.constraints["execution_proposal"]["target"]["identity"] =
                        serde_json::json!({"base":"def456","repository":"fixture"});
                }
                "configuration_digest" => {
                    substituted.constraints["execution_proposal"]["configuration_digest"] =
                        Value::String(format!("sha256:{}", "d".repeat(64)));
                }
                "adapter.ref" => {
                    substituted.constraints["execution_proposal"]["adapter"]["ref"] =
                        Value::String("adapter:local:other".to_owned());
                }
                "adapter.version" => {
                    substituted.constraints["execution_proposal"]["adapter"]["version"] =
                        Value::String("v2".to_owned());
                }
                "executable_digest" => {
                    substituted.constraints["execution_proposal"]["executable_digest"] =
                        Value::String(format!("sha256:{}", "f".repeat(64)));
                }
                "audience" => {
                    substituted.constraints["execution_proposal"]["audience"] =
                        Value::String("audience:gateway:other".to_owned());
                }
                "project_ref" => substituted.project_ref = "project:other".to_owned(),
                _ => unreachable!("case list is closed"),
            }

            assert_eq!(
                derive_result(&substituted, &approved_hash),
                Err(ExecutionRequestV1Error::ChainInvalid),
                "case={case} index={index} must not reuse the old approved packet hash"
            );
        }
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn gateway_property_stale_derived_evidence_rejects_one_field_mutations() {
        let packet = packet();
        let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash");
        let derived = derive(&packet, &packet_sha256);
        let cases = [
            "contract_version",
            "schema_id",
            "derivation_profile",
            "packet_id",
            "packet_sha256",
            "policy_decision_id",
            "approval_request_id",
            "approval_decision_id",
            "requester_ref",
            "requester_session_ref",
            "approver_ref",
            "approver_session_ref",
            "project_ref",
            "resource_ref",
            "action.kind",
            "action.arguments",
            "target.resource_ref",
            "target.identity",
            "configuration_digest",
            "adapter.ref",
            "adapter.version",
            "executable_digest",
            "audience",
            "prepared_at",
            "expires_at",
        ];

        for (index, case) in cases.iter().enumerate() {
            let mut stale = derived.clone();
            match *case {
                "contract_version" => {
                    stale.request.contract_version = "lnsat.contracts.v9_9".to_owned();
                }
                "schema_id" => {
                    stale.request.schema_id = "lnsat.execution_request.schema.v9_9".to_owned();
                }
                "derivation_profile" => {
                    stale.request.derivation_profile = "lnsat.other.v1".to_owned();
                }
                "packet_id" => stale.request.packet_id = format!("pkt_{}", "6".repeat(64)),
                "packet_sha256" => {
                    stale.request.packet_sha256 = format!("sha256:{}", "d".repeat(64));
                }
                "policy_decision_id" => {
                    stale.request.policy_decision_id = format!("pol_{}", "6".repeat(64));
                }
                "approval_request_id" => {
                    stale.request.approval_request_id = format!("apr_{}", "6".repeat(64));
                }
                "approval_decision_id" => {
                    stale.request.approval_decision_id = format!("apd_{}", "6".repeat(64));
                }
                "requester_ref" => stale.request.requester_ref = "identity:human:other".to_owned(),
                "requester_session_ref" => {
                    stale.request.requester_session_ref = "session:local:other".to_owned();
                }
                "approver_ref" => stale.request.approver_ref = "identity:human:other".to_owned(),
                "approver_session_ref" => {
                    stale.request.approver_session_ref = "session:local:other".to_owned();
                }
                "project_ref" => stale.request.project_ref = "project:other".to_owned(),
                "resource_ref" => {
                    stale.request.resource_ref = "resource:repository:other".to_owned();
                }
                "action.kind" => stale.request.action.kind = "git.push".to_owned(),
                "action.arguments" => {
                    stale.request.action.arguments.insert(
                        "message".to_owned(),
                        Value::String("substituted fixture commit".to_owned()),
                    );
                }
                "target.resource_ref" => {
                    stale.request.target.resource_ref = "resource:repository:other".to_owned();
                }
                "target.identity" => {
                    stale
                        .request
                        .target
                        .identity
                        .insert("base".to_owned(), Value::String("def456".to_owned()));
                }
                "configuration_digest" => {
                    stale.request.configuration_digest = format!("sha256:{}", "d".repeat(64));
                }
                "adapter.ref" => {
                    stale.request.adapter.adapter_ref = "adapter:local:other".to_owned();
                }
                "adapter.version" => stale.request.adapter.version = "v2".to_owned(),
                "executable_digest" => {
                    stale.request.executable_digest = format!("sha256:{}", "f".repeat(64));
                }
                "audience" => stale.request.audience = "audience:gateway:other".to_owned(),
                "prepared_at" => stale.request.prepared_at = "2026-07-22T20:02:01.000Z".to_owned(),
                "expires_at" => stale.request.expires_at = "2026-07-22T20:08:01.000Z".to_owned(),
                _ => unreachable!("case list is closed"),
            }

            assert_eq!(
                verify_derived_execution_request_v1(&stale),
                Err(ExecutionRequestV1Error::ChainInvalid),
                "case={case} index={index} must invalidate stale derived evidence"
            );
        }

        let canonical_cases = [
            (
                "packet_id",
                format!("\"pkt_{}\"", "1".repeat(64)),
                format!("\"pkt_{}\"", "6".repeat(64)),
            ),
            (
                "project_ref",
                "\"project:fixture\"".to_owned(),
                "\"project:other\"".to_owned(),
            ),
            (
                "action.kind",
                "\"git.commit\"".to_owned(),
                "\"git.push\"".to_owned(),
            ),
            (
                "configuration_digest",
                format!("\"sha256:{}\"", "c".repeat(64)),
                format!("\"sha256:{}\"", "d".repeat(64)),
            ),
            (
                "adapter.version",
                "\"version\":\"v1\"".to_owned(),
                "\"version\":\"v2\"".to_owned(),
            ),
        ];
        for (index, (case, before, after)) in canonical_cases.iter().enumerate() {
            let mut stale = derived.clone();
            assert_eq!(
                stale.canonical_request.matches(before.as_str()).count(),
                1,
                "case={case} index={index} fixture source must occur exactly once"
            );
            stale.canonical_request =
                stale
                    .canonical_request
                    .replacen(before.as_str(), after.as_str(), 1);
            assert!(
                stale.canonical_request.contains(after.as_str()),
                "case={case} index={index} replacement must occur"
            );
            assert_ne!(
                stale.canonical_request, derived.canonical_request,
                "case={case} index={index} canonical bytes must change"
            );
            assert_eq!(
                verify_derived_execution_request_v1(&stale),
                Err(ExecutionRequestV1Error::ChainInvalid),
                "case={case} index={index} must invalidate stale canonical bytes"
            );
        }

        let digest_cases = [
            "request_digest",
            "action_digest",
            "target_digest",
            "configuration_digest",
            "executable_digest",
        ];
        for (index, case) in digest_cases.iter().enumerate() {
            let mut stale = derived.clone();
            match *case {
                "request_digest" => stale.request_digest[0] ^= 1,
                "action_digest" => stale.action_digest[0] ^= 1,
                "target_digest" => stale.target_digest[0] ^= 1,
                "configuration_digest" => stale.configuration_digest[0] ^= 1,
                "executable_digest" => stale.executable_digest[0] ^= 1,
                _ => unreachable!("case list is closed"),
            }
            assert_eq!(
                verify_derived_execution_request_v1(&stale),
                Err(ExecutionRequestV1Error::ChainInvalid),
                "case={case} index={index} must invalidate stale binary digest evidence"
            );
        }
    }

    fn json_with_reversed_object_keys(value: &Value) -> String {
        match value {
            Value::Array(values) => {
                let values = values
                    .iter()
                    .map(json_with_reversed_object_keys)
                    .collect::<Vec<_>>()
                    .join(",");
                format!("[{values}]")
            }
            Value::Object(object) => {
                let entries = object
                    .iter()
                    .rev()
                    .map(|(key, value)| {
                        let key = serde_json::to_string(key).expect("object key serializes");
                        format!("{key}:{}", json_with_reversed_object_keys(value))
                    })
                    .collect::<Vec<_>>()
                    .join(",");
                format!("{{{entries}}}")
            }
            _ => serde_json::to_string(value).expect("JSON scalar serializes"),
        }
    }

    fn assert_gateway_property_parser_oracle(input: &str, case: &str, index: usize, seed: u64) {
        if let Ok(parsed) = parse_canonical_execution_request_v1(input) {
            assert_eq!(
                parsed.canonical_request, input,
                "case={case} index={index} seed={seed:#018x} accepted bytes must round-trip"
            );
            assert_eq!(
                verify_derived_execution_request_v1(&parsed),
                Ok(()),
                "case={case} index={index} seed={seed:#018x} accepted bytes must verify"
            );
        }
    }

    fn assert_gateway_property_canonical_control(input: &str, case: &str) {
        let parsed = parse_canonical_execution_request_v1(input)
            .expect("known valid canonical control must parse");
        assert_eq!(
            parsed.canonical_request, input,
            "case={case} accepted canonical bytes must round-trip"
        );
        assert_eq!(
            verify_derived_execution_request_v1(&parsed),
            Ok(()),
            "case={case} accepted canonical bytes must verify"
        );
    }

    fn next_fuzz_word(state: &mut u64) -> u64 {
        *state ^= *state << 13;
        *state ^= *state >> 7;
        *state ^= *state << 17;
        *state
    }

    fn fuzz_index(word: u64, bound: usize) -> usize {
        let bound = u64::try_from(bound).expect("fuzz bound fits u64");
        usize::try_from(word % bound).expect("bounded fuzz index fits usize")
    }

    fn assert_gateway_property_parser_positive_controls(
        mut nested_packet: PacketEnvelopeV1,
        derived: &DerivedExecutionRequestV1,
    ) {
        let value: Value = serde_json::from_str(&derived.canonical_request).expect("request value");
        let reordered_raw = json_with_reversed_object_keys(&value);
        assert_ne!(
            reordered_raw, derived.canonical_request,
            "raw key order differs"
        );
        assert_eq!(
            parse_canonical_execution_request_v1(&reordered_raw),
            Err(ExecutionRequestV1Error::ChainInvalid),
            "raw noncanonical key order is rejected"
        );
        let reordered_value: Value = serde_json::from_str(&reordered_raw).expect("reordered value");
        let reordered =
            canonicalize_json_value(&reordered_value).expect("canonical reordered request");
        assert_eq!(
            reordered, derived.canonical_request,
            "object key order canonicalizes"
        );
        assert_gateway_property_canonical_control(&reordered, "reordered-keys");

        // Parsing proves only canonical self-consistency; custody linkage is checked elsewhere.
        let different_request =
            derived
                .canonical_request
                .replacen("\"git.commit\"", "\"git.push\"", 1);
        assert_ne!(
            different_request, derived.canonical_request,
            "request bytes differ"
        );
        let parsed_different = parse_canonical_execution_request_v1(&different_request)
            .expect("syntactically valid distinct request must parse");
        assert_ne!(
            parsed_different.request, derived.request,
            "parsed request is not original"
        );
        assert_eq!(
            verify_derived_execution_request_v1(&parsed_different),
            Ok(()),
            "distinct canonical request rederives self-consistent evidence"
        );

        nested_packet.constraints["execution_proposal"]["action"]["arguments"] = serde_json::json!({
            "path": "fixture.txt",
            "nested": {"z": [3, {"b": true, "a": false}], "a": ["one", "two"]},
            "message": "bounded fixture commit"
        });
        let nested_hash = hash_packet_envelope_v1(&nested_packet).expect("nested packet hash");
        let nested = derive(&nested_packet, &nested_hash);
        let nested_value: Value =
            serde_json::from_str(&nested.canonical_request).expect("nested request value");
        let nested_reordered_raw = json_with_reversed_object_keys(&nested_value);
        assert_ne!(
            nested_reordered_raw, nested.canonical_request,
            "nested raw key order differs"
        );
        assert_eq!(
            parse_canonical_execution_request_v1(&nested_reordered_raw),
            Err(ExecutionRequestV1Error::ChainInvalid),
            "nested raw noncanonical key order is rejected"
        );
        let nested_reordered_value: Value =
            serde_json::from_str(&nested_reordered_raw).expect("nested reordered value");
        let nested_reordered = canonicalize_json_value(&nested_reordered_value)
            .expect("canonical nested reordered request");
        assert_eq!(
            nested_reordered, nested.canonical_request,
            "nested objects and arrays canonicalize"
        );
        assert_gateway_property_canonical_control(&nested_reordered, "nested-arguments-arrays");
    }

    #[test]
    fn gateway_property_canonical_parser_byte_fuzz_round_trips_any_accepted_input() {
        const FUZZ_SEED: u64 = 0x5EED_CAFE_2026_1008;
        const FUZZ_BYTE_INPUTS: usize = 192;
        const INSERTED_BYTES: &[u8] = b" \"{}[],:\\\n\t";

        let packet = packet();
        let packet_sha256 = hash_packet_envelope_v1(&packet).expect("packet hash");
        let derived = derive(&packet, &packet_sha256);
        assert_gateway_property_parser_positive_controls(packet, &derived);

        let mut state = FUZZ_SEED;
        for index in 0..FUZZ_BYTE_INPUTS {
            let case_seed = next_fuzz_word(&mut state);
            let mut bytes = derived.canonical_request.as_bytes().to_vec();
            let position = fuzz_index(case_seed, bytes.len() + 1);
            let case = match index % 4 {
                0 => {
                    bytes.truncate(position);
                    "truncation"
                }
                1 => {
                    let byte = INSERTED_BYTES[fuzz_index(case_seed, INSERTED_BYTES.len())];
                    bytes.insert(position, byte);
                    "insertion"
                }
                2 => {
                    if position < bytes.len() {
                        let width = 1 + fuzz_index(case_seed >> 8, 4);
                        bytes.drain(position..(position + width).min(bytes.len()));
                    }
                    "deletion"
                }
                _ => {
                    if position < bytes.len() {
                        bytes[position] ^= 1 << ((case_seed >> 16) & 7);
                    }
                    "byte-flip"
                }
            };
            let input = String::from_utf8_lossy(&bytes);
            assert_gateway_property_parser_oracle(&input, case, index, case_seed);
        }
    }
}
