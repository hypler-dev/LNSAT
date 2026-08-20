use sha2::{Digest, Sha256};
use std::fmt::Write as _;

use crate::packet::{canonicalize_json_value, parse_canonical_utc_timestamp};
use crate::{
    CONTRACT_VERSION_V1_0, PolicyCapabilityDecisionV1, PolicyDecisionV1, PolicyDecisionV1Kind,
    PolicyDecisionV1Reason,
};

const POLICY_SCHEMA_V1_0: &str = "lnsat.policy_decision.schema.v1_0";
const REQUEST_SCHEMA_V1_0: &str = "lnsat.approval_request.schema.v1_0";
const DECISION_SCHEMA_V1_0: &str = "lnsat.approval_decision.schema.v1_0";
const SUPPORTED_POLICY_PROFILE: &str = "policy:agent_sandbox";
const ALLOWED_CAPABILITIES: [&str; 3] = ["context.read", "repository.read", "tests.run.sandbox"];
const APPROVAL_CAPABILITIES: [&str; 5] = [
    "database.migration.request",
    "deploy.request",
    "runbook.execute.request",
    "secret.use.brokered",
    "service.restart.request",
];
const FORBIDDEN_CAPABILITIES: [&str; 10] = [
    "billing.write",
    "database.prod.write",
    "database.write",
    "deploy.execute",
    "destructive.execute",
    "network.open",
    "root",
    "secret.read",
    "security.write",
    "ssh",
];

/// Approval-only policy reasons carried into a request.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApprovalRequestV1PolicyReason {
    PacketRequiresApproval,
    RiskRequiresApproval,
    CapabilityRequiresApproval,
}

impl ApprovalRequestV1PolicyReason {
    /// Stable wire value.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::PacketRequiresApproval => "policy.packet_requires_approval",
            Self::RiskRequiresApproval => "policy.risk_requires_approval",
            Self::CapabilityRequiresApproval => "policy.capability_requires_approval",
        }
    }
}

impl TryFrom<PolicyDecisionV1Reason> for ApprovalRequestV1PolicyReason {
    type Error = ();

    fn try_from(value: PolicyDecisionV1Reason) -> Result<Self, Self::Error> {
        match value {
            PolicyDecisionV1Reason::PacketRequiresApproval => Ok(Self::PacketRequiresApproval),
            PolicyDecisionV1Reason::RiskRequiresApproval => Ok(Self::RiskRequiresApproval),
            PolicyDecisionV1Reason::CapabilityRequiresApproval => {
                Ok(Self::CapabilityRequiresApproval)
            }
            _ => Err(()),
        }
    }
}

/// Bound policy reference carried by an approval request.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalPolicyDecisionRefV1 {
    pub schema_id: String,
    pub decision_id: String,
    pub packet_hash: String,
}

/// Content-bound approval request evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalRequestV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub approval_request_id: String,
    pub status: String,
    pub policy_decision_ref: ApprovalPolicyDecisionRefV1,
    pub requester_ref: String,
    pub session_ref: String,
    pub project_ref: String,
    pub resource_refs: Vec<String>,
    pub requested_capabilities: Vec<String>,
    pub policy_reason_codes: Vec<ApprovalRequestV1PolicyReason>,
    pub requested_at: String,
    pub expires_at: String,
    pub side_effects: [(); 0],
}

/// Human approval outcome.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApprovalDecisionV1Kind {
    Approved,
    Denied,
}

impl ApprovalDecisionV1Kind {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Approved => "approved",
            Self::Denied => "denied",
        }
    }
}

/// Stable human approval reason.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApprovalDecisionV1Reason {
    OperatorApproved,
    OperatorDenied,
    ScopeRejected,
    EvidenceInsufficient,
    RequestSuperseded,
}

impl ApprovalDecisionV1Reason {
    /// Stable wire value.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::OperatorApproved => "approval.operator_approved",
            Self::OperatorDenied => "approval.operator_denied",
            Self::ScopeRejected => "approval.scope_rejected",
            Self::EvidenceInsufficient => "approval.evidence_insufficient",
            Self::RequestSuperseded => "approval.request_superseded",
        }
    }
}

/// Exact human-decision input.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalDecisionV1Input {
    pub approver_ref: String,
    pub approver_session_ref: String,
    pub decision: ApprovalDecisionV1Kind,
    pub reason: ApprovalDecisionV1Reason,
    pub decided_at: String,
}

/// Bound request reference carried by an approval decision.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalRequestRefV1 {
    pub schema_id: String,
    pub approval_request_id: String,
    pub policy_decision_id: String,
}

/// Content-bound human approval decision evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalDecisionV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub approval_decision_id: String,
    pub approval_request_ref: ApprovalRequestRefV1,
    pub approver_ref: String,
    pub approver_session_ref: String,
    pub decision: ApprovalDecisionV1Kind,
    pub reason: ApprovalDecisionV1Reason,
    pub decided_at: String,
    pub expires_at: String,
    pub approval_gate_satisfied: bool,
    pub execution_authorized: bool,
    pub side_effects: [(); 0],
}

/// Stable fail-closed approval evidence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApprovalEvidenceV1Error {
    InvalidPolicyDecision,
    ApprovalNotRequired,
    InvalidRequestTime,
    RequestExpired,
    RequestHashUnavailable,
    InvalidRequest,
    InvalidDecisionInput,
    SelfApprovalForbidden,
    DecisionExpired,
    DecisionHashUnavailable,
}

impl ApprovalEvidenceV1Error {
    /// Stable TypeScript-compatible error identity.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPolicyDecision => "approval_request.invalid_policy_decision",
            Self::ApprovalNotRequired => "approval_request.not_required",
            Self::InvalidRequestTime => "approval_request.invalid_request_time",
            Self::RequestExpired => "approval_request.expired",
            Self::RequestHashUnavailable => "approval_request.hash_unavailable",
            Self::InvalidRequest => "approval_decision.invalid_request",
            Self::InvalidDecisionInput => "approval_decision.invalid_input",
            Self::SelfApprovalForbidden => "approval_decision.self_approval_forbidden",
            Self::DecisionExpired => "approval_decision.expired",
            Self::DecisionHashUnavailable => "approval_decision.hash_unavailable",
        }
    }
}

/// Creates content-bound approval-request evidence from an approval-required
/// stable policy decision.
///
/// # Errors
///
/// Fails closed for invalid or non-approval policy evidence and request times
/// outside the policy validity window.
pub fn create_approval_request_v1(
    policy: &PolicyDecisionV1,
    requested_at: &str,
) -> Result<ApprovalRequestV1, ApprovalEvidenceV1Error> {
    if !valid_policy_decision_shape(policy) {
        return Err(ApprovalEvidenceV1Error::InvalidPolicyDecision);
    }
    if policy.decision != PolicyDecisionV1Kind::ApprovalRequired || !policy.requires_approval {
        return Err(ApprovalEvidenceV1Error::ApprovalNotRequired);
    }
    let requested_instant = parse_canonical_utc_timestamp(requested_at)
        .ok_or(ApprovalEvidenceV1Error::InvalidRequestTime)?;
    let evaluated_instant = parse_canonical_utc_timestamp(&policy.evaluated_at)
        .ok_or(ApprovalEvidenceV1Error::InvalidPolicyDecision)?;
    let expires_instant = parse_canonical_utc_timestamp(&policy.expires_at)
        .ok_or(ApprovalEvidenceV1Error::InvalidPolicyDecision)?;
    if requested_instant < evaluated_instant || requested_instant >= expires_instant {
        return Err(ApprovalEvidenceV1Error::RequestExpired);
    }
    if policy.decision_id != policy_identity(&policy.packet_ref.packet_hash, &policy.evaluated_at) {
        return Err(ApprovalEvidenceV1Error::InvalidPolicyDecision);
    }

    let reasons: Result<Vec<_>, _> = policy
        .reason_codes
        .iter()
        .copied()
        .map(ApprovalRequestV1PolicyReason::try_from)
        .collect();
    let mut request = ApprovalRequestV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: REQUEST_SCHEMA_V1_0.to_owned(),
        approval_request_id: String::new(),
        status: "requested".to_owned(),
        policy_decision_ref: ApprovalPolicyDecisionRefV1 {
            schema_id: policy.schema_id.clone(),
            decision_id: policy.decision_id.clone(),
            packet_hash: policy.packet_ref.packet_hash.clone(),
        },
        requester_ref: policy.actor_ref.clone(),
        session_ref: policy.session_ref.clone(),
        project_ref: policy.project_ref.clone(),
        resource_refs: policy.resource_refs.clone(),
        requested_capabilities: policy
            .capability_decisions
            .iter()
            .map(|capability| capability.capability.clone())
            .collect(),
        policy_reason_codes: reasons
            .map_err(|()| ApprovalEvidenceV1Error::InvalidPolicyDecision)?,
        requested_at: requested_at.to_owned(),
        expires_at: policy.expires_at.clone(),
        side_effects: [],
    };
    request.approval_request_id =
        request_identity(&request).map_err(|()| ApprovalEvidenceV1Error::RequestHashUnavailable)?;
    Ok(request)
}

/// Records a bound human decision without granting execution authority.
///
/// # Errors
///
/// Fails closed for invalid request evidence, malformed or inconsistent human
/// input, self-approval, and decisions outside the request validity window.
pub fn decide_approval_request_v1(
    request: &ApprovalRequestV1,
    input: &ApprovalDecisionV1Input,
) -> Result<ApprovalDecisionV1, ApprovalEvidenceV1Error> {
    if !valid_approval_request_shape(request) {
        return Err(ApprovalEvidenceV1Error::InvalidRequest);
    }
    if !valid_human_reference(&input.approver_ref)
        || !valid_reference(&input.approver_session_ref, "session:")
        || !valid_outcome_reason(input.decision, input.reason)
    {
        return Err(ApprovalEvidenceV1Error::InvalidDecisionInput);
    }
    let decided_instant = parse_canonical_utc_timestamp(&input.decided_at)
        .ok_or(ApprovalEvidenceV1Error::InvalidDecisionInput)?;
    let requested_instant = parse_canonical_utc_timestamp(&request.requested_at)
        .ok_or(ApprovalEvidenceV1Error::InvalidRequest)?;
    let expires_instant = parse_canonical_utc_timestamp(&request.expires_at)
        .ok_or(ApprovalEvidenceV1Error::InvalidRequest)?;
    if decided_instant < requested_instant || decided_instant >= expires_instant {
        return Err(ApprovalEvidenceV1Error::DecisionExpired);
    }
    if !matches!(
        request_identity(request),
        Ok(identity) if identity == request.approval_request_id
    ) {
        return Err(ApprovalEvidenceV1Error::InvalidRequest);
    }
    if input.approver_ref == request.requester_ref {
        return Err(ApprovalEvidenceV1Error::SelfApprovalForbidden);
    }

    let approval_decision_id = decision_identity(request, input);
    Ok(ApprovalDecisionV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: DECISION_SCHEMA_V1_0.to_owned(),
        approval_decision_id,
        approval_request_ref: ApprovalRequestRefV1 {
            schema_id: request.schema_id.clone(),
            approval_request_id: request.approval_request_id.clone(),
            policy_decision_id: request.policy_decision_ref.decision_id.clone(),
        },
        approver_ref: input.approver_ref.clone(),
        approver_session_ref: input.approver_session_ref.clone(),
        decision: input.decision,
        reason: input.reason,
        decided_at: input.decided_at.clone(),
        expires_at: request.expires_at.clone(),
        approval_gate_satisfied: input.decision == ApprovalDecisionV1Kind::Approved,
        execution_authorized: false,
        side_effects: [],
    })
}

fn valid_policy_decision_shape(policy: &PolicyDecisionV1) -> bool {
    if policy.contract_version != CONTRACT_VERSION_V1_0
        || policy.schema_id != POLICY_SCHEMA_V1_0
        || !valid_prefixed_digest(&policy.decision_id, "pol_")
        || policy.packet_ref.schema_id != "lnsat.packet_envelope.schema.v1_0"
        || !valid_prefixed_digest(&policy.packet_ref.packet_hash, "sha256:")
        || !valid_identifier(&policy.packet_ref.packet_id, "pkt_", 12, 68)
        || !valid_identifier(&policy.packet_ref.idempotency_key, "idem_", 13, 133)
        || !valid_reference(&policy.actor_ref, "identity:")
        || !valid_reference(&policy.session_ref, "session:")
        || !valid_reference(&policy.project_ref, "project:")
        || !valid_reference(&policy.policy_profile_ref, "policy:")
        || policy.risk_level > 8
        || !valid_sorted_unique(&policy.resource_refs, valid_reference_any)
        || !valid_capability_decisions(policy)
        || !valid_reason_codes(policy)
    {
        return false;
    }
    let Some(evaluated) = parse_canonical_utc_timestamp(&policy.evaluated_at) else {
        return false;
    };
    let Some(expires) = parse_canonical_utc_timestamp(&policy.expires_at) else {
        return false;
    };
    evaluated < expires
}

fn valid_capability_decisions(policy: &PolicyDecisionV1) -> bool {
    let names: Vec<_> = policy
        .capability_decisions
        .iter()
        .map(|capability| capability.capability.clone())
        .collect();
    if !valid_sorted_unique(&names, valid_capability) {
        return false;
    }
    let supported = policy.policy_profile_ref == SUPPORTED_POLICY_PROFILE;
    policy
        .capability_decisions
        .iter()
        .all(|capability| *capability == classify_capability(&capability.capability, supported))
}

fn valid_reason_codes(policy: &PolicyDecisionV1) -> bool {
    if policy
        .reason_codes
        .windows(2)
        .any(|pair| reason_rank(pair[0]) >= reason_rank(pair[1]))
    {
        return false;
    }
    let profile = policy
        .reason_codes
        .contains(&PolicyDecisionV1Reason::ProfileUnsupported);
    let empty = policy
        .reason_codes
        .contains(&PolicyDecisionV1Reason::NoCapabilityRequested);
    let forbidden = policy
        .reason_codes
        .contains(&PolicyDecisionV1Reason::CapabilityForbidden);
    let unknown = policy
        .reason_codes
        .contains(&PolicyDecisionV1Reason::CapabilityUnknown);
    let risk = policy
        .reason_codes
        .contains(&PolicyDecisionV1Reason::RiskRequiresApproval);
    let approval = policy
        .reason_codes
        .contains(&PolicyDecisionV1Reason::CapabilityRequiresApproval);
    let expected_decision = if policy.reason_codes.iter().any(|reason| {
        matches!(
            reason,
            PolicyDecisionV1Reason::ProfileUnsupported
                | PolicyDecisionV1Reason::NoCapabilityRequested
                | PolicyDecisionV1Reason::CapabilityForbidden
                | PolicyDecisionV1Reason::CapabilityUnknown
        )
    }) {
        PolicyDecisionV1Kind::Deny
    } else if policy.reason_codes.is_empty() {
        PolicyDecisionV1Kind::Allow
    } else {
        PolicyDecisionV1Kind::ApprovalRequired
    };

    profile == (policy.policy_profile_ref != SUPPORTED_POLICY_PROFILE)
        && empty == policy.capability_decisions.is_empty()
        && forbidden
            == policy.capability_decisions.iter().any(|capability| {
                capability.reason == Some(PolicyDecisionV1Reason::CapabilityForbidden)
            })
        && unknown
            == policy.capability_decisions.iter().any(|capability| {
                capability.reason == Some(PolicyDecisionV1Reason::CapabilityUnknown)
            })
        && risk == (policy.risk_level >= 5)
        && approval
            == policy.capability_decisions.iter().any(|capability| {
                capability.reason == Some(PolicyDecisionV1Reason::CapabilityRequiresApproval)
            })
        && policy.decision == expected_decision
        && policy.requires_approval == (expected_decision == PolicyDecisionV1Kind::ApprovalRequired)
}

fn classify_capability(capability: &str, profile_supported: bool) -> PolicyCapabilityDecisionV1 {
    let (decision, reason) = if !profile_supported {
        (
            PolicyDecisionV1Kind::Deny,
            Some(PolicyDecisionV1Reason::ProfileUnsupported),
        )
    } else if FORBIDDEN_CAPABILITIES.contains(&capability) {
        (
            PolicyDecisionV1Kind::Deny,
            Some(PolicyDecisionV1Reason::CapabilityForbidden),
        )
    } else if APPROVAL_CAPABILITIES.contains(&capability) {
        (
            PolicyDecisionV1Kind::ApprovalRequired,
            Some(PolicyDecisionV1Reason::CapabilityRequiresApproval),
        )
    } else if ALLOWED_CAPABILITIES.contains(&capability) {
        (PolicyDecisionV1Kind::Allow, None)
    } else {
        (
            PolicyDecisionV1Kind::Deny,
            Some(PolicyDecisionV1Reason::CapabilityUnknown),
        )
    };
    PolicyCapabilityDecisionV1 {
        capability: capability.to_owned(),
        decision,
        reason,
    }
}

fn valid_approval_request_shape(request: &ApprovalRequestV1) -> bool {
    request.contract_version == CONTRACT_VERSION_V1_0
        && request.schema_id == REQUEST_SCHEMA_V1_0
        && valid_prefixed_digest(&request.approval_request_id, "apr_")
        && request.status == "requested"
        && request.policy_decision_ref.schema_id == POLICY_SCHEMA_V1_0
        && valid_prefixed_digest(&request.policy_decision_ref.decision_id, "pol_")
        && valid_prefixed_digest(&request.policy_decision_ref.packet_hash, "sha256:")
        && valid_reference(&request.requester_ref, "identity:")
        && valid_reference(&request.session_ref, "session:")
        && valid_reference(&request.project_ref, "project:")
        && valid_sorted_unique(&request.resource_refs, valid_reference_any)
        && valid_sorted_unique(&request.requested_capabilities, valid_capability)
        && !request.policy_reason_codes.is_empty()
        && request
            .policy_reason_codes
            .windows(2)
            .all(|pair| approval_reason_rank(pair[0]) < approval_reason_rank(pair[1]))
        && parse_canonical_utc_timestamp(&request.requested_at)
            .zip(parse_canonical_utc_timestamp(&request.expires_at))
            .is_some_and(|(requested, expires)| requested < expires)
}

fn request_identity(request: &ApprovalRequestV1) -> Result<String, ()> {
    let body = serde_json::json!({
        "contract_version": request.contract_version,
        "schema_id": request.schema_id,
        "status": request.status,
        "policy_decision_ref": {
            "schema_id": request.policy_decision_ref.schema_id,
            "decision_id": request.policy_decision_ref.decision_id,
            "packet_hash": request.policy_decision_ref.packet_hash,
        },
        "requester_ref": request.requester_ref,
        "session_ref": request.session_ref,
        "project_ref": request.project_ref,
        "resource_refs": request.resource_refs,
        "requested_capabilities": request.requested_capabilities,
        "policy_reason_codes": request
            .policy_reason_codes
            .iter()
            .map(|reason| reason.code())
            .collect::<Vec<_>>(),
        "requested_at": request.requested_at,
        "expires_at": request.expires_at,
        "side_effects": [],
    });
    let canonical = canonicalize_json_value(&body).map_err(|_| ())?;
    Ok(format!("apr_{}", lowercase_sha256(canonical.as_bytes())))
}

fn decision_identity(request: &ApprovalRequestV1, input: &ApprovalDecisionV1Input) -> String {
    let preimage = format!(
        "{DECISION_SCHEMA_V1_0}\n{}\n{}\n{}\n{}\n{}\n{}",
        request.approval_request_id,
        input.decision.as_str(),
        input.decided_at,
        input.approver_ref,
        input.approver_session_ref,
        input.reason.code()
    );
    format!("apd_{}", lowercase_sha256(preimage.as_bytes()))
}

fn policy_identity(packet_hash: &str, evaluated_at: &str) -> String {
    let preimage = format!("{POLICY_SCHEMA_V1_0}\n{packet_hash}\n{evaluated_at}");
    format!("pol_{}", lowercase_sha256(preimage.as_bytes()))
}

fn lowercase_sha256(input: &[u8]) -> String {
    let mut output = String::with_capacity(64);
    for byte in Sha256::digest(input) {
        write!(&mut output, "{byte:02x}").expect("writing to a String cannot fail");
    }
    output
}

const fn reason_rank(reason: PolicyDecisionV1Reason) -> u8 {
    match reason {
        PolicyDecisionV1Reason::ProfileUnsupported => 0,
        PolicyDecisionV1Reason::NoCapabilityRequested => 1,
        PolicyDecisionV1Reason::CapabilityForbidden => 2,
        PolicyDecisionV1Reason::CapabilityUnknown => 3,
        PolicyDecisionV1Reason::PacketRequiresApproval => 4,
        PolicyDecisionV1Reason::RiskRequiresApproval => 5,
        PolicyDecisionV1Reason::CapabilityRequiresApproval => 6,
    }
}

const fn approval_reason_rank(reason: ApprovalRequestV1PolicyReason) -> u8 {
    match reason {
        ApprovalRequestV1PolicyReason::PacketRequiresApproval => 0,
        ApprovalRequestV1PolicyReason::RiskRequiresApproval => 1,
        ApprovalRequestV1PolicyReason::CapabilityRequiresApproval => 2,
    }
}

const fn valid_outcome_reason(
    decision: ApprovalDecisionV1Kind,
    reason: ApprovalDecisionV1Reason,
) -> bool {
    match decision {
        ApprovalDecisionV1Kind::Approved => {
            matches!(reason, ApprovalDecisionV1Reason::OperatorApproved)
        }
        ApprovalDecisionV1Kind::Denied => {
            !matches!(reason, ApprovalDecisionV1Reason::OperatorApproved)
        }
    }
}

fn valid_prefixed_digest(value: &str, prefix: &str) -> bool {
    value.strip_prefix(prefix).is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    })
}

fn valid_identifier(value: &str, prefix: &str, min: usize, max: usize) -> bool {
    let Some(remainder) = value.strip_prefix(prefix) else {
        return false;
    };
    value.len() >= min
        && value.len() <= max
        && remainder.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_lowercase()
                || byte.is_ascii_digit()
                || (index > 0 && matches!(byte, b'_' | b'-'))
        })
}

fn valid_reference(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix) && valid_reference_any(value)
}

fn valid_reference_any(value: &str) -> bool {
    let Some((scheme, remainder)) = value.split_once(':') else {
        return false;
    };
    !scheme.is_empty()
        && scheme.bytes().enumerate().all(|(index, byte)| {
            (index == 0 && byte.is_ascii_lowercase())
                || (index > 0
                    && (byte.is_ascii_lowercase()
                        || byte.is_ascii_digit()
                        || matches!(byte, b'+' | b'.' | b'-')))
        })
        && value.encode_utf16().count() <= 256
        && !remainder.is_empty()
        && remainder.chars().count() <= 240
        && !remainder.chars().any(char::is_whitespace)
        && !remainder
            .chars()
            .any(|character| character <= '\u{001f}' || character == '\u{007f}')
}

fn valid_human_reference(value: &str) -> bool {
    value
        .strip_prefix("identity:human:")
        .is_some_and(|remainder| !remainder.is_empty() && valid_reference_any(value))
}

fn valid_capability(value: &str) -> bool {
    if value.is_empty() || value.len() > 128 || !value.as_bytes()[0].is_ascii_lowercase() {
        return false;
    }
    let mut previous_separator = false;
    for (index, byte) in value.bytes().enumerate() {
        let separator = matches!(byte, b'.' | b'_' | b':' | b'-');
        if !byte.is_ascii_lowercase() && !byte.is_ascii_digit() && !separator
            || separator && (index == 0 || previous_separator || index + 1 == value.len())
        {
            return false;
        }
        previous_separator = separator;
    }
    true
}

fn valid_sorted_unique(values: &[String], validate: fn(&str) -> bool) -> bool {
    values.iter().all(|value| validate(value))
        && !values
            .windows(2)
            .any(|pair| pair[0].encode_utf16().cmp(pair[1].encode_utf16()).is_ge())
}

#[cfg(test)]
mod tests {
    use super::{
        ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
        create_approval_request_v1, decide_approval_request_v1,
    };
    use crate::{decide_packet_envelope_policy_v1, parse_packet_envelope_v1};
    use serde_json::Value;

    const PACKET: &str = include_str!("../../../fixtures/contracts/packet-envelope-v1_0.json");

    fn approval_policy() -> crate::PolicyDecisionV1 {
        let fixture: Value = serde_json::from_str(PACKET).expect("packet fixture must be JSON");
        let mut value = fixture["vectors"][0]["packet"].clone();
        value["permission_envelope"]["allow"] = serde_json::json!(["deploy.request"]);
        let encoded = serde_json::to_vec(&value).expect("packet must serialize");
        let packet = parse_packet_envelope_v1(&encoded).expect("packet must parse");
        decide_packet_envelope_policy_v1(&packet, &packet.created_at).expect("policy must evaluate")
    }

    #[test]
    fn request_and_decision_replay_are_deterministic() {
        let policy = approval_policy();
        let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
            .expect("request must validate");
        assert_eq!(
            create_approval_request_v1(&policy.clone(), "2026-07-22T20:01:00Z"),
            Ok(request.clone())
        );
        let input = ApprovalDecisionV1Input {
            approver_ref: "identity:human:owner".to_owned(),
            approver_session_ref: "session:local:owner-0001".to_owned(),
            decision: ApprovalDecisionV1Kind::Approved,
            reason: ApprovalDecisionV1Reason::OperatorApproved,
            decided_at: "2026-07-22T20:02:00Z".to_owned(),
        };
        let decision =
            decide_approval_request_v1(&request, &input).expect("decision must validate");
        assert_eq!(
            decide_approval_request_v1(&request.clone(), &input.clone()),
            Ok(decision)
        );
    }

    #[test]
    fn request_window_property_accepts_only_policy_window_minutes() {
        let policy = approval_policy();
        for minute in 0..=15 {
            let requested_at = format!("2026-07-22T20:{minute:02}:00Z");
            assert_eq!(
                create_approval_request_v1(&policy, &requested_at).is_ok(),
                minute < 15,
                "minute {minute}",
            );
        }
    }
}
