use sha2::{Digest, Sha256};
use std::fmt::Write as _;

use crate::packet::parse_canonical_utc_timestamp;
use crate::{CONTRACT_VERSION_V1_0, PacketEnvelopeV1, hash_packet_envelope_v1};

const POLICY_SCHEMA_V1_0: &str = "lnsat.policy_decision.schema.v1_0";
const SUPPORTED_POLICY_PROFILE: &str = "policy:agent_sandbox";
const APPROVAL_RISK_THRESHOLD: u8 = 5;
const ALLOWED_CAPABILITIES: [&str; 3] = ["context.read", "repository.read", "tests.run.sandbox"];
const APPROVAL_REQUIRED_CAPABILITIES: [&str; 5] = [
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

/// Stable policy decision identity.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PolicyDecisionV1Kind {
    Allow,
    Deny,
    ApprovalRequired,
}

impl PolicyDecisionV1Kind {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Allow => "allow",
            Self::Deny => "deny",
            Self::ApprovalRequired => "approval_required",
        }
    }
}

/// Stable ordered policy reason identity.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PolicyDecisionV1Reason {
    ProfileUnsupported,
    NoCapabilityRequested,
    CapabilityForbidden,
    CapabilityUnknown,
    PacketRequiresApproval,
    RiskRequiresApproval,
    CapabilityRequiresApproval,
}

impl PolicyDecisionV1Reason {
    /// Stable wire value.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::ProfileUnsupported => "policy.profile_unsupported",
            Self::NoCapabilityRequested => "policy.no_capability_requested",
            Self::CapabilityForbidden => "policy.capability_forbidden",
            Self::CapabilityUnknown => "policy.capability_unknown",
            Self::PacketRequiresApproval => "policy.packet_requires_approval",
            Self::RiskRequiresApproval => "policy.risk_requires_approval",
            Self::CapabilityRequiresApproval => "policy.capability_requires_approval",
        }
    }

    const fn is_denial(self) -> bool {
        matches!(
            self,
            Self::ProfileUnsupported
                | Self::NoCapabilityRequested
                | Self::CapabilityForbidden
                | Self::CapabilityUnknown
        )
    }
}

/// Per-capability policy result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyCapabilityDecisionV1 {
    pub capability: String,
    pub decision: PolicyDecisionV1Kind,
    pub reason: Option<PolicyDecisionV1Reason>,
}

/// Stable packet reference embedded in a policy decision.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyPacketRefV1 {
    pub packet_id: String,
    pub schema_id: String,
    pub packet_hash: String,
    pub idempotency_key: String,
}

/// Deterministic, side-effect-free stable policy decision.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyDecisionV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub decision_id: String,
    pub packet_ref: PolicyPacketRefV1,
    pub actor_ref: String,
    pub session_ref: String,
    pub project_ref: String,
    pub resource_refs: Vec<String>,
    pub policy_profile_ref: String,
    pub risk_level: u8,
    pub capability_decisions: Vec<PolicyCapabilityDecisionV1>,
    pub decision: PolicyDecisionV1Kind,
    pub requires_approval: bool,
    pub reason_codes: Vec<PolicyDecisionV1Reason>,
    pub evaluated_at: String,
    pub expires_at: String,
    pub side_effects: [(); 0],
}

/// Stable fail-closed policy evaluation errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PolicyDecisionV1Error {
    InvalidPacket,
    InvalidEvaluationTime,
    PacketExpired,
    HashUnavailable,
}

impl PolicyDecisionV1Error {
    /// Stable TypeScript-compatible error identity.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPacket => "policy_decision.invalid_packet",
            Self::InvalidEvaluationTime => "policy_decision.invalid_evaluation_time",
            Self::PacketExpired => "policy_decision.packet_expired",
            Self::HashUnavailable => "policy_decision.hash_unavailable",
        }
    }
}

/// Evaluates one validated packet against the stable v1 policy table.
///
/// Denial wins over approval-required evidence, approval wins over allow, and
/// the result grants no runtime or mutation authority.
///
/// # Errors
///
/// Returns a stable fail-closed error for invalid packet state, malformed
/// evaluation time, or evaluation outside the packet validity window.
pub fn decide_packet_envelope_policy_v1(
    packet: &PacketEnvelopeV1,
    evaluated_at: &str,
) -> Result<PolicyDecisionV1, PolicyDecisionV1Error> {
    let packet_hash =
        hash_packet_envelope_v1(packet).map_err(|_| PolicyDecisionV1Error::InvalidPacket)?;
    let evaluated_instant = parse_canonical_utc_timestamp(evaluated_at)
        .ok_or(PolicyDecisionV1Error::InvalidEvaluationTime)?;
    let created_instant = parse_canonical_utc_timestamp(&packet.created_at)
        .ok_or(PolicyDecisionV1Error::InvalidPacket)?;
    let expires_instant = parse_canonical_utc_timestamp(&packet.expires_at)
        .ok_or(PolicyDecisionV1Error::InvalidPacket)?;
    if evaluated_instant < created_instant || evaluated_instant >= expires_instant {
        return Err(PolicyDecisionV1Error::PacketExpired);
    }

    let profile_supported = packet.policy_profile_ref == SUPPORTED_POLICY_PROFILE;
    let capability_decisions: Vec<_> = packet
        .permission_allow
        .iter()
        .map(|capability| classify_capability(capability, profile_supported))
        .collect();
    let reason_codes = ordered_reasons(packet, profile_supported, &capability_decisions);
    let decision = select_decision(&reason_codes);
    let decision_id = policy_decision_id(&packet_hash, evaluated_at);

    Ok(PolicyDecisionV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: POLICY_SCHEMA_V1_0.to_owned(),
        decision_id,
        packet_ref: PolicyPacketRefV1 {
            packet_id: packet.packet_id.clone(),
            schema_id: packet.schema_id.clone(),
            packet_hash,
            idempotency_key: packet.idempotency_key.clone(),
        },
        actor_ref: packet.actor_ref.clone(),
        session_ref: packet.session_ref.clone(),
        project_ref: packet.project_ref.clone(),
        resource_refs: packet.resource_refs.clone(),
        policy_profile_ref: packet.policy_profile_ref.clone(),
        risk_level: packet.risk_level,
        capability_decisions,
        decision,
        requires_approval: decision == PolicyDecisionV1Kind::ApprovalRequired,
        reason_codes,
        evaluated_at: evaluated_at.to_owned(),
        expires_at: packet.expires_at.clone(),
        side_effects: [],
    })
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
    } else if APPROVAL_REQUIRED_CAPABILITIES.contains(&capability) {
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

fn ordered_reasons(
    packet: &PacketEnvelopeV1,
    profile_supported: bool,
    capabilities: &[PolicyCapabilityDecisionV1],
) -> Vec<PolicyDecisionV1Reason> {
    let mut reasons = Vec::with_capacity(7);
    push_reason(
        &mut reasons,
        !profile_supported,
        PolicyDecisionV1Reason::ProfileUnsupported,
    );
    push_reason(
        &mut reasons,
        capabilities.is_empty(),
        PolicyDecisionV1Reason::NoCapabilityRequested,
    );
    for reason in [
        PolicyDecisionV1Reason::CapabilityForbidden,
        PolicyDecisionV1Reason::CapabilityUnknown,
    ] {
        push_reason(
            &mut reasons,
            capabilities
                .iter()
                .any(|capability| capability.reason == Some(reason)),
            reason,
        );
    }
    push_reason(
        &mut reasons,
        packet.requires_approval,
        PolicyDecisionV1Reason::PacketRequiresApproval,
    );
    push_reason(
        &mut reasons,
        packet.risk_level >= APPROVAL_RISK_THRESHOLD,
        PolicyDecisionV1Reason::RiskRequiresApproval,
    );
    push_reason(
        &mut reasons,
        capabilities.iter().any(|capability| {
            capability.reason == Some(PolicyDecisionV1Reason::CapabilityRequiresApproval)
        }),
        PolicyDecisionV1Reason::CapabilityRequiresApproval,
    );
    reasons
}

fn push_reason(
    reasons: &mut Vec<PolicyDecisionV1Reason>,
    applies: bool,
    reason: PolicyDecisionV1Reason,
) {
    if applies {
        reasons.push(reason);
    }
}

fn select_decision(reasons: &[PolicyDecisionV1Reason]) -> PolicyDecisionV1Kind {
    if reasons.iter().any(|reason| reason.is_denial()) {
        PolicyDecisionV1Kind::Deny
    } else if reasons.is_empty() {
        PolicyDecisionV1Kind::Allow
    } else {
        PolicyDecisionV1Kind::ApprovalRequired
    }
}

fn policy_decision_id(packet_hash: &str, evaluated_at: &str) -> String {
    let preimage = format!("{POLICY_SCHEMA_V1_0}\n{packet_hash}\n{evaluated_at}");
    let digest = Sha256::digest(preimage.as_bytes());
    let mut output = String::with_capacity(68);
    output.push_str("pol_");
    for byte in digest {
        write!(&mut output, "{byte:02x}").expect("writing to a String cannot fail");
    }
    output
}

#[cfg(test)]
mod tests {
    use super::{PolicyDecisionV1Kind, PolicyDecisionV1Reason, decide_packet_envelope_policy_v1};
    use crate::parse_packet_envelope_v1;
    use serde_json::Value;

    const PACKET: &str = include_str!("../../../fixtures/contracts/packet-envelope-v1_0.json");

    fn packet() -> crate::PacketEnvelopeV1 {
        let fixture: Value = serde_json::from_str(PACKET).expect("packet fixture must be JSON");
        let encoded =
            serde_json::to_vec(&fixture["vectors"][0]["packet"]).expect("packet must serialize");
        parse_packet_envelope_v1(&encoded).expect("packet must parse")
    }

    #[test]
    fn risk_boundary_property_matches_stable_policy() {
        for risk_level in 0..=8 {
            let mut packet = packet();
            packet.risk_level = risk_level;
            let decision = decide_packet_envelope_policy_v1(&packet, &packet.created_at)
                .expect("bounded risk must evaluate");
            let expected = if risk_level < 5 {
                PolicyDecisionV1Kind::Allow
            } else {
                PolicyDecisionV1Kind::ApprovalRequired
            };
            assert_eq!(decision.decision, expected, "risk {risk_level}");
            assert_eq!(
                decision
                    .reason_codes
                    .contains(&PolicyDecisionV1Reason::RiskRequiresApproval),
                risk_level >= 5,
                "risk {risk_level}",
            );
        }
    }

    #[test]
    fn repeated_evaluation_is_deterministic() {
        let packet = packet();
        let first = decide_packet_envelope_policy_v1(&packet, &packet.created_at);
        let replay = decide_packet_envelope_policy_v1(&packet.clone(), &packet.created_at);
        assert_eq!(replay, first);
    }
}
