use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fmt::Write as _;

use crate::packet::{canonicalize_json_value, packet_json_value, parse_canonical_utc_timestamp};
use crate::{
    ApprovalDecisionV1, ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalRequestV1,
    CONTRACT_VERSION_V1_0, PacketEnvelopeV1, PolicyDecisionV1, PolicyDecisionV1Kind,
    create_approval_request_v1, decide_approval_request_v1, decide_packet_envelope_policy_v1,
};

const AUDIT_SCHEMA_V1_0: &str = "lnsat.audit_event.schema.v1_0";

/// Stable audit event family.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuditEventV1Type {
    PolicyDecisionRecorded,
    ApprovalRequestRecorded,
    ApprovalDecisionRecorded,
}

impl AuditEventV1Type {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PolicyDecisionRecorded => "policy.decision_recorded",
            Self::ApprovalRequestRecorded => "approval.request_recorded",
            Self::ApprovalDecisionRecorded => "approval.decision_recorded",
        }
    }
}

/// Stable audit result state.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuditEventV1ResultStatus {
    Allow,
    Deny,
    ApprovalRequired,
    Requested,
    Approved,
    Denied,
}

impl AuditEventV1ResultStatus {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Allow => "allow",
            Self::Deny => "deny",
            Self::ApprovalRequired => "approval_required",
            Self::Requested => "requested",
            Self::Approved => "approved",
            Self::Denied => "denied",
        }
    }
}

/// Exact packet reference retained by an audit event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditPacketRefV1 {
    pub schema_id: String,
    pub packet_id: String,
    pub packet_hash: String,
    pub idempotency_key: String,
}

/// Exact policy reference retained by an audit event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditPolicyRefV1 {
    pub schema_id: String,
    pub decision_id: String,
    pub decision: PolicyDecisionV1Kind,
}

/// Exact approval-request reference retained by an audit event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditApprovalRequestRefV1 {
    pub schema_id: String,
    pub approval_request_id: String,
    pub status: String,
}

/// Exact approval-decision reference retained by an audit event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditApprovalDecisionRefV1 {
    pub schema_id: String,
    pub approval_decision_id: String,
    pub decision: ApprovalDecisionV1Kind,
    pub approver_ref: String,
    pub approver_session_ref: String,
}

/// Explicit redaction state for stable audit evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditRedactionV1 {
    pub raw_rejected_command: String,
    pub raw_rejected_value: String,
    pub raw_invalid_payload_content: String,
    pub secret_like_values: String,
}

/// Content-bound, side-effect-free stable audit evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEventV1 {
    pub contract_version: String,
    pub schema_id: String,
    pub event_id: String,
    pub event_type: AuditEventV1Type,
    pub result_status: AuditEventV1ResultStatus,
    pub actor_ref: String,
    pub session_ref: String,
    pub project_ref: String,
    pub resource_refs: Vec<String>,
    pub packet_ref: AuditPacketRefV1,
    pub policy_ref: AuditPolicyRefV1,
    pub approval_request_ref: Option<AuditApprovalRequestRefV1>,
    pub approval_decision_ref: Option<AuditApprovalDecisionRefV1>,
    pub reason_codes: Vec<String>,
    pub source_evidence_hash: String,
    pub idempotency_key: String,
    pub event_at: String,
    pub observed_at: String,
    pub retention_class: String,
    pub redaction: AuditRedactionV1,
    pub authenticated_provenance: bool,
    pub persistence_requested: bool,
    pub execution_authorized: bool,
    pub side_effects: [(); 0],
}

/// Complete source chain for one stable audit event.
#[derive(Clone, Debug, PartialEq)]
pub enum AuditEventV1Input {
    PolicyDecision {
        packet: Box<PacketEnvelopeV1>,
        policy_decision: Box<PolicyDecisionV1>,
    },
    ApprovalRequest {
        packet: Box<PacketEnvelopeV1>,
        policy_decision: Box<PolicyDecisionV1>,
        approval_request: Box<ApprovalRequestV1>,
    },
    ApprovalDecision {
        packet: Box<PacketEnvelopeV1>,
        policy_decision: Box<PolicyDecisionV1>,
        approval_request: Box<ApprovalRequestV1>,
        approval_decision: Box<ApprovalDecisionV1>,
    },
}

impl AuditEventV1Input {
    /// Stable event type implied by the exact source-chain shape.
    #[must_use]
    pub const fn event_type(&self) -> AuditEventV1Type {
        match self {
            Self::PolicyDecision { .. } => AuditEventV1Type::PolicyDecisionRecorded,
            Self::ApprovalRequest { .. } => AuditEventV1Type::ApprovalRequestRecorded,
            Self::ApprovalDecision { .. } => AuditEventV1Type::ApprovalDecisionRecorded,
        }
    }
}

/// Stable fail-closed audit evidence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuditEventV1Error {
    InvalidInput,
    InvalidObservedAt,
    SourceEvidenceMismatch,
    ObservedBeforeEvent,
    HashUnavailable,
}

impl AuditEventV1Error {
    /// Stable TypeScript-compatible error identity.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "audit_event.invalid_input",
            Self::InvalidObservedAt => "audit_event.invalid_observed_at",
            Self::SourceEvidenceMismatch => "audit_event.source_evidence_mismatch",
            Self::ObservedBeforeEvent => "audit_event.observed_before_event",
            Self::HashUnavailable => "audit_event.hash_unavailable",
        }
    }
}

/// Rebuilds a complete source chain and creates content-bound audit evidence.
///
/// The result authenticates no actor, requests no persistence, grants no
/// execution authority, and performs no side effects.
///
/// # Errors
///
/// Fails closed for malformed observation time, any source-chain drift,
/// observation before the terminal source event, or unavailable hashing.
pub fn create_audit_event_v1(
    input: &AuditEventV1Input,
    observed_at: &str,
) -> Result<AuditEventV1, AuditEventV1Error> {
    let observed_instant =
        parse_canonical_utc_timestamp(observed_at).ok_or(AuditEventV1Error::InvalidObservedAt)?;
    let policy = verify_source_chain(input)?;
    let event_at = event_at(input);
    let event_instant =
        parse_canonical_utc_timestamp(event_at).ok_or(AuditEventV1Error::SourceEvidenceMismatch)?;
    if observed_instant < event_instant {
        return Err(AuditEventV1Error::ObservedBeforeEvent);
    }

    let source = audit_input_json_value(input);
    let source_canonical =
        canonicalize_json_value(&source).map_err(|_| AuditEventV1Error::HashUnavailable)?;
    let source_evidence_hash = format!("sha256:{}", lowercase_sha256(source_canonical.as_bytes()));
    let mut event = audit_event_body(input, policy, &source_evidence_hash, observed_at);
    let body = audit_event_json_value(&event, false);
    let canonical =
        canonicalize_json_value(&body).map_err(|_| AuditEventV1Error::HashUnavailable)?;
    event.event_id = format!("aud_{}", lowercase_sha256(canonical.as_bytes()));
    Ok(event)
}

fn verify_source_chain(input: &AuditEventV1Input) -> Result<&PolicyDecisionV1, AuditEventV1Error> {
    let (packet, policy) = match input {
        AuditEventV1Input::PolicyDecision {
            packet,
            policy_decision,
        }
        | AuditEventV1Input::ApprovalRequest {
            packet,
            policy_decision,
            ..
        }
        | AuditEventV1Input::ApprovalDecision {
            packet,
            policy_decision,
            ..
        } => (packet, policy_decision),
    };
    let rebuilt = decide_packet_envelope_policy_v1(packet, &policy.evaluated_at)
        .map_err(|_| AuditEventV1Error::SourceEvidenceMismatch)?;
    if rebuilt != **policy {
        return Err(AuditEventV1Error::SourceEvidenceMismatch);
    }

    let request = match input {
        AuditEventV1Input::PolicyDecision { .. } => return Ok(policy),
        AuditEventV1Input::ApprovalRequest {
            approval_request, ..
        }
        | AuditEventV1Input::ApprovalDecision {
            approval_request, ..
        } => approval_request,
    };
    let rebuilt_request = create_approval_request_v1(&rebuilt, &request.requested_at)
        .map_err(|_| AuditEventV1Error::SourceEvidenceMismatch)?;
    if rebuilt_request != **request {
        return Err(AuditEventV1Error::SourceEvidenceMismatch);
    }

    let decision = match input {
        AuditEventV1Input::ApprovalRequest { .. } => return Ok(policy),
        AuditEventV1Input::ApprovalDecision {
            approval_decision, ..
        } => approval_decision,
        AuditEventV1Input::PolicyDecision { .. } => unreachable!(),
    };
    let rebuilt_decision = decide_approval_request_v1(
        &rebuilt_request,
        &ApprovalDecisionV1Input {
            approver_ref: decision.approver_ref.clone(),
            approver_session_ref: decision.approver_session_ref.clone(),
            decision: decision.decision,
            reason: decision.reason,
            decided_at: decision.decided_at.clone(),
        },
    )
    .map_err(|_| AuditEventV1Error::SourceEvidenceMismatch)?;
    if rebuilt_decision != **decision {
        return Err(AuditEventV1Error::SourceEvidenceMismatch);
    }
    Ok(policy)
}

fn audit_event_body(
    input: &AuditEventV1Input,
    policy: &PolicyDecisionV1,
    source_evidence_hash: &str,
    observed_at: &str,
) -> AuditEventV1 {
    let request = match input {
        AuditEventV1Input::PolicyDecision { .. } => None,
        AuditEventV1Input::ApprovalRequest {
            approval_request, ..
        }
        | AuditEventV1Input::ApprovalDecision {
            approval_request, ..
        } => Some(approval_request),
    };
    let decision = match input {
        AuditEventV1Input::ApprovalDecision {
            approval_decision, ..
        } => Some(approval_decision),
        _ => None,
    };
    let terminal_id = decision
        .map(|value| value.approval_decision_id.as_str())
        .or_else(|| request.map(|value| value.approval_request_id.as_str()))
        .unwrap_or(&policy.decision_id);
    let result_status = decision.map_or_else(
        || {
            if request.is_some() {
                AuditEventV1ResultStatus::Requested
            } else {
                policy_status(policy.decision)
            }
        },
        |value| match value.decision {
            ApprovalDecisionV1Kind::Approved => AuditEventV1ResultStatus::Approved,
            ApprovalDecisionV1Kind::Denied => AuditEventV1ResultStatus::Denied,
        },
    );

    AuditEventV1 {
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        schema_id: AUDIT_SCHEMA_V1_0.to_owned(),
        event_id: String::new(),
        event_type: input.event_type(),
        result_status,
        actor_ref: decision.map_or_else(
            || policy.actor_ref.clone(),
            |value| value.approver_ref.clone(),
        ),
        session_ref: decision.map_or_else(
            || policy.session_ref.clone(),
            |value| value.approver_session_ref.clone(),
        ),
        project_ref: policy.project_ref.clone(),
        resource_refs: policy.resource_refs.clone(),
        packet_ref: AuditPacketRefV1 {
            schema_id: policy.packet_ref.schema_id.clone(),
            packet_id: policy.packet_ref.packet_id.clone(),
            packet_hash: policy.packet_ref.packet_hash.clone(),
            idempotency_key: policy.packet_ref.idempotency_key.clone(),
        },
        policy_ref: AuditPolicyRefV1 {
            schema_id: policy.schema_id.clone(),
            decision_id: policy.decision_id.clone(),
            decision: policy.decision,
        },
        approval_request_ref: request.map(|value| AuditApprovalRequestRefV1 {
            schema_id: value.schema_id.clone(),
            approval_request_id: value.approval_request_id.clone(),
            status: value.status.clone(),
        }),
        approval_decision_ref: decision.map(|value| AuditApprovalDecisionRefV1 {
            schema_id: value.schema_id.clone(),
            approval_decision_id: value.approval_decision_id.clone(),
            decision: value.decision,
            approver_ref: value.approver_ref.clone(),
            approver_session_ref: value.approver_session_ref.clone(),
        }),
        reason_codes: decision.map_or_else(
            || {
                policy
                    .reason_codes
                    .iter()
                    .map(|reason| reason.code().to_owned())
                    .collect()
            },
            |value| vec![value.reason.code().to_owned()],
        ),
        source_evidence_hash: source_evidence_hash.to_owned(),
        idempotency_key: format!("audit:{}:{terminal_id}", input.event_type().as_str()),
        event_at: event_at(input).to_owned(),
        observed_at: observed_at.to_owned(),
        retention_class: "control_plane".to_owned(),
        redaction: AuditRedactionV1 {
            raw_rejected_command: "not_present".to_owned(),
            raw_rejected_value: "not_present".to_owned(),
            raw_invalid_payload_content: "not_present".to_owned(),
            secret_like_values: "not_present".to_owned(),
        },
        authenticated_provenance: false,
        persistence_requested: false,
        execution_authorized: false,
        side_effects: [],
    }
}

const fn policy_status(decision: PolicyDecisionV1Kind) -> AuditEventV1ResultStatus {
    match decision {
        PolicyDecisionV1Kind::Allow => AuditEventV1ResultStatus::Allow,
        PolicyDecisionV1Kind::Deny => AuditEventV1ResultStatus::Deny,
        PolicyDecisionV1Kind::ApprovalRequired => AuditEventV1ResultStatus::ApprovalRequired,
    }
}

fn event_at(input: &AuditEventV1Input) -> &str {
    match input {
        AuditEventV1Input::PolicyDecision {
            policy_decision, ..
        } => &policy_decision.evaluated_at,
        AuditEventV1Input::ApprovalRequest {
            approval_request, ..
        } => &approval_request.requested_at,
        AuditEventV1Input::ApprovalDecision {
            approval_decision, ..
        } => &approval_decision.decided_at,
    }
}

fn audit_input_json_value(input: &AuditEventV1Input) -> Value {
    match input {
        AuditEventV1Input::PolicyDecision {
            packet,
            policy_decision,
        } => serde_json::json!({
            "event_type": input.event_type().as_str(),
            "packet": packet_json_value(packet),
            "policy_decision": policy_json_value(policy_decision),
        }),
        AuditEventV1Input::ApprovalRequest {
            packet,
            policy_decision,
            approval_request,
        } => serde_json::json!({
            "event_type": input.event_type().as_str(),
            "packet": packet_json_value(packet),
            "policy_decision": policy_json_value(policy_decision),
            "approval_request": request_json_value(approval_request),
        }),
        AuditEventV1Input::ApprovalDecision {
            packet,
            policy_decision,
            approval_request,
            approval_decision,
        } => serde_json::json!({
            "event_type": input.event_type().as_str(),
            "packet": packet_json_value(packet),
            "policy_decision": policy_json_value(policy_decision),
            "approval_request": request_json_value(approval_request),
            "approval_decision": decision_json_value(approval_decision),
        }),
    }
}

pub(crate) fn policy_json_value(policy: &PolicyDecisionV1) -> Value {
    serde_json::json!({
        "contract_version": policy.contract_version,
        "schema_id": policy.schema_id,
        "decision_id": policy.decision_id,
        "packet_ref": {
            "packet_id": policy.packet_ref.packet_id,
            "schema_id": policy.packet_ref.schema_id,
            "packet_hash": policy.packet_ref.packet_hash,
            "idempotency_key": policy.packet_ref.idempotency_key,
        },
        "actor_ref": policy.actor_ref,
        "session_ref": policy.session_ref,
        "project_ref": policy.project_ref,
        "resource_refs": policy.resource_refs,
        "policy_profile_ref": policy.policy_profile_ref,
        "risk_level": policy.risk_level,
        "capability_decisions": policy.capability_decisions.iter().map(|capability| {
            serde_json::json!({
                "capability": capability.capability,
                "decision": capability.decision.as_str(),
                "reason_code": capability.reason.map(crate::PolicyDecisionV1Reason::code),
            })
        }).collect::<Vec<_>>(),
        "decision": policy.decision.as_str(),
        "requires_approval": policy.requires_approval,
        "reason_codes": policy.reason_codes.iter().map(|reason| reason.code()).collect::<Vec<_>>(),
        "evaluated_at": policy.evaluated_at,
        "expires_at": policy.expires_at,
        "side_effects": [],
    })
}

pub(crate) fn request_json_value(request: &ApprovalRequestV1) -> Value {
    serde_json::json!({
        "contract_version": request.contract_version,
        "schema_id": request.schema_id,
        "approval_request_id": request.approval_request_id,
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
        "policy_reason_codes": request.policy_reason_codes.iter().map(|reason| reason.code()).collect::<Vec<_>>(),
        "requested_at": request.requested_at,
        "expires_at": request.expires_at,
        "side_effects": [],
    })
}

pub(crate) fn decision_json_value(decision: &ApprovalDecisionV1) -> Value {
    serde_json::json!({
        "contract_version": decision.contract_version,
        "schema_id": decision.schema_id,
        "approval_decision_id": decision.approval_decision_id,
        "approval_request_ref": {
            "schema_id": decision.approval_request_ref.schema_id,
            "approval_request_id": decision.approval_request_ref.approval_request_id,
            "policy_decision_id": decision.approval_request_ref.policy_decision_id,
        },
        "approver_ref": decision.approver_ref,
        "approver_session_ref": decision.approver_session_ref,
        "decision": decision.decision.as_str(),
        "reason_code": decision.reason.code(),
        "decided_at": decision.decided_at,
        "expires_at": decision.expires_at,
        "approval_gate_satisfied": decision.approval_gate_satisfied,
        "execution_authorized": decision.execution_authorized,
        "side_effects": [],
    })
}

fn audit_event_json_value(event: &AuditEventV1, include_id: bool) -> Value {
    let mut value = serde_json::json!({
        "contract_version": event.contract_version,
        "schema_id": event.schema_id,
        "event_type": event.event_type.as_str(),
        "result_status": event.result_status.as_str(),
        "actor_ref": event.actor_ref,
        "session_ref": event.session_ref,
        "project_ref": event.project_ref,
        "resource_refs": event.resource_refs,
        "packet_ref": {
            "schema_id": event.packet_ref.schema_id,
            "packet_id": event.packet_ref.packet_id,
            "packet_hash": event.packet_ref.packet_hash,
            "idempotency_key": event.packet_ref.idempotency_key,
        },
        "policy_ref": {
            "schema_id": event.policy_ref.schema_id,
            "decision_id": event.policy_ref.decision_id,
            "decision": event.policy_ref.decision.as_str(),
        },
        "approval_request_ref": event.approval_request_ref.as_ref().map(|request| serde_json::json!({
            "schema_id": request.schema_id,
            "approval_request_id": request.approval_request_id,
            "status": request.status,
        })),
        "approval_decision_ref": event.approval_decision_ref.as_ref().map(|decision| serde_json::json!({
            "schema_id": decision.schema_id,
            "approval_decision_id": decision.approval_decision_id,
            "decision": decision.decision.as_str(),
            "approver_ref": decision.approver_ref,
            "approver_session_ref": decision.approver_session_ref,
        })),
        "reason_codes": event.reason_codes,
        "source_evidence_hash": event.source_evidence_hash,
        "idempotency_key": event.idempotency_key,
        "event_at": event.event_at,
        "observed_at": event.observed_at,
        "retention_class": event.retention_class,
        "redaction": {
            "raw_rejected_command": event.redaction.raw_rejected_command,
            "raw_rejected_value": event.redaction.raw_rejected_value,
            "raw_invalid_payload_content": event.redaction.raw_invalid_payload_content,
            "secret_like_values": event.redaction.secret_like_values,
        },
        "authenticated_provenance": event.authenticated_provenance,
        "persistence_requested": event.persistence_requested,
        "execution_authorized": event.execution_authorized,
        "side_effects": [],
    });
    if include_id {
        value
            .as_object_mut()
            .expect("audit event body is an object")
            .insert("event_id".to_owned(), Value::String(event.event_id.clone()));
    }
    value
}

fn lowercase_sha256(input: &[u8]) -> String {
    let mut output = String::with_capacity(64);
    for byte in Sha256::digest(input) {
        write!(&mut output, "{byte:02x}").expect("writing to a String cannot fail");
    }
    output
}

#[cfg(test)]
mod tests {
    use super::{AuditEventV1Error, AuditEventV1Input, create_audit_event_v1};
    use crate::{
        ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
        create_approval_request_v1, decide_approval_request_v1, decide_packet_envelope_policy_v1,
        parse_packet_envelope_v1,
    };
    use serde_json::Value;

    const PACKET: &str = include_str!("../../../fixtures/contracts/packet-envelope-v1_0.json");

    fn chain() -> (
        crate::PacketEnvelopeV1,
        crate::PolicyDecisionV1,
        crate::ApprovalRequestV1,
        crate::ApprovalDecisionV1,
    ) {
        let fixture: Value = serde_json::from_str(PACKET).expect("packet fixture must be JSON");
        let mut value = fixture["vectors"][0]["packet"].clone();
        value["permission_envelope"]["allow"] = serde_json::json!(["deploy.request"]);
        let encoded = serde_json::to_vec(&value).expect("packet must serialize");
        let packet = parse_packet_envelope_v1(&encoded).expect("packet must parse");
        let policy = decide_packet_envelope_policy_v1(&packet, "2026-07-22T20:00:00Z")
            .expect("policy must evaluate");
        let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
            .expect("request must validate");
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
        .expect("decision must validate");
        (packet, policy, request, decision)
    }

    #[test]
    fn repeated_audit_creation_is_deterministic() {
        let (packet, policy, request, decision) = chain();
        let input = AuditEventV1Input::ApprovalDecision {
            packet: Box::new(packet),
            policy_decision: Box::new(policy),
            approval_request: Box::new(request),
            approval_decision: Box::new(decision),
        };
        let first = create_audit_event_v1(&input, "2026-07-22T20:02:10Z");
        let replay = create_audit_event_v1(&input.clone(), "2026-07-22T20:02:10Z");
        assert_eq!(replay, first);
    }

    #[test]
    fn observation_boundary_accepts_event_time_and_rejects_before() {
        let (packet, policy, request, decision) = chain();
        let cases = [
            (
                AuditEventV1Input::PolicyDecision {
                    packet: Box::new(packet.clone()),
                    policy_decision: Box::new(policy.clone()),
                },
                "2026-07-22T19:59:59Z",
                "2026-07-22T20:00:00Z",
            ),
            (
                AuditEventV1Input::ApprovalRequest {
                    packet: Box::new(packet.clone()),
                    policy_decision: Box::new(policy.clone()),
                    approval_request: Box::new(request.clone()),
                },
                "2026-07-22T20:00:59Z",
                "2026-07-22T20:01:00Z",
            ),
            (
                AuditEventV1Input::ApprovalDecision {
                    packet: Box::new(packet),
                    policy_decision: Box::new(policy),
                    approval_request: Box::new(request),
                    approval_decision: Box::new(decision),
                },
                "2026-07-22T20:01:59Z",
                "2026-07-22T20:02:00Z",
            ),
        ];
        for (input, before, exact) in cases {
            assert_eq!(
                create_audit_event_v1(&input, before),
                Err(AuditEventV1Error::ObservedBeforeEvent)
            );
            assert!(
                create_audit_event_v1(&input, exact).is_ok(),
                "event-time observation must validate"
            );
        }
    }
}
