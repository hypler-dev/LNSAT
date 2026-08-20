use serde_json::{Map, Value, json};

use crate::{
    ApprovalEvidenceV1Error, AuditEventIdempotencyErrorV1, AuditEventV1Error, ContractVersionError,
    PacketEnvelopeV1Error, PolicyDecisionV1Error,
};

/// Stable contract family owning one failed result.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContractErrorFamilyV1 {
    Version,
    Packet,
    PolicyDecision,
    ApprovalRequest,
    ApprovalDecision,
    AuditEvent,
}

impl ContractErrorFamilyV1 {
    /// Exact null result field used by the shared v1 envelope.
    #[must_use]
    pub const fn result_field(self) -> &'static str {
        match self {
            Self::Version => "version",
            Self::Packet => "packet",
            Self::PolicyDecision => "policy_decision",
            Self::ApprovalRequest => "approval_request",
            Self::ApprovalDecision => "approval_decision",
            Self::AuditEvent => "audit_event",
        }
    }
}

/// Public-safe stable error item.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ContractErrorV1 {
    pub code: &'static str,
    pub path: &'static str,
    pub message: &'static str,
}

impl ContractErrorV1 {
    /// Stable severity wire value.
    #[must_use]
    pub const fn severity(self) -> &'static str {
        "error"
    }

    /// Closed JSON representation without rejected input.
    #[must_use]
    pub fn to_json_value(self) -> Value {
        json!({
            "code": self.code,
            "path": self.path,
            "message": self.message,
            "severity": self.severity(),
        })
    }
}

/// One-family fail-closed error envelope.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractErrorEnvelopeV1 {
    pub family: ContractErrorFamilyV1,
    pub errors: [ContractErrorV1; 1],
    pub side_effects: [(); 0],
}

impl ContractErrorEnvelopeV1 {
    /// Creates one nonempty, side-effect-free family failure.
    #[must_use]
    pub fn new(family: ContractErrorFamilyV1, error: ContractErrorV1) -> Self {
        Self {
            family,
            errors: [error],
            side_effects: [],
        }
    }

    /// Exact shared wire shape with one null family result.
    #[must_use]
    pub fn to_json_value(&self) -> Value {
        let mut object = Map::with_capacity(4);
        object.insert("ok".to_owned(), Value::Bool(false));
        object.insert(self.family.result_field().to_owned(), Value::Null);
        object.insert(
            "errors".to_owned(),
            Value::Array(
                self.errors
                    .iter()
                    .copied()
                    .map(ContractErrorV1::to_json_value)
                    .collect(),
            ),
        );
        object.insert("side_effects".to_owned(), Value::Array(Vec::new()));
        Value::Object(object)
    }
}

/// Maps a stable Rust failure to the shared v1 envelope.
pub trait IntoContractErrorEnvelopeV1 {
    fn into_contract_error_envelope_v1(self) -> ContractErrorEnvelopeV1;
}

impl IntoContractErrorEnvelopeV1 for ContractVersionError {
    fn into_contract_error_envelope_v1(self) -> ContractErrorEnvelopeV1 {
        let error = match self {
            Self::Required => {
                contract_error(self.code(), "/version", "Contract version is required.")
            }
            Self::Malformed => contract_error(
                self.code(),
                "/version",
                "Contract version must use canonical lnsat.contracts.v<major>_<minor> syntax.",
            ),
            Self::Unsupported => contract_error(
                self.code(),
                "/version",
                "Contract version is well formed but unsupported.",
            ),
        };
        ContractErrorEnvelopeV1::new(ContractErrorFamilyV1::Version, error)
    }
}

impl IntoContractErrorEnvelopeV1 for PacketEnvelopeV1Error {
    fn into_contract_error_envelope_v1(self) -> ContractErrorEnvelopeV1 {
        let (path, message) = match self {
            Self::InvalidJson => ("", "Packet envelope JSON must be syntactically valid."),
            Self::InvalidType => ("", "Packet envelope must be a plain object."),
            Self::UnexpectedField => ("", "Packet envelope contains an unexpected field."),
            Self::MissingRequiredField => ("/", "Packet envelope is missing a required field."),
            Self::UnsupportedContractVersion => (
                "/contract_version",
                "contract_version must be the exact supported v1 contract version.",
            ),
            Self::UnsupportedSchema => (
                "/schema_id",
                "schema_id must be the exact supported v1 packet envelope schema.",
            ),
            Self::InvalidField => ("/", "Packet envelope contains an invalid field."),
            Self::InvalidTimeWindow => (
                "/expires_at",
                "expires_at must be a valid UTC instant after created_at.",
            ),
            Self::NoncanonicalCollection => {
                ("/", "Packet envelope collection must be sorted and unique.")
            }
        };
        ContractErrorEnvelopeV1::new(
            ContractErrorFamilyV1::Packet,
            contract_error(self.code(), path, message),
        )
    }
}

impl IntoContractErrorEnvelopeV1 for PolicyDecisionV1Error {
    fn into_contract_error_envelope_v1(self) -> ContractErrorEnvelopeV1 {
        let (path, message) = match self {
            Self::InvalidPacket => (
                "/packet",
                "Packet must satisfy the exact v1 packet-envelope contract.",
            ),
            Self::InvalidEvaluationTime => (
                "/evaluated_at",
                "evaluated_at must be a real canonical UTC instant.",
            ),
            Self::PacketExpired => (
                "/evaluated_at",
                "Policy evaluation must occur inside the packet validity window.",
            ),
            Self::HashUnavailable => ("/packet", "Validated packet hash could not be produced."),
        };
        ContractErrorEnvelopeV1::new(
            ContractErrorFamilyV1::PolicyDecision,
            contract_error(self.code(), path, message),
        )
    }
}

impl IntoContractErrorEnvelopeV1 for ApprovalEvidenceV1Error {
    fn into_contract_error_envelope_v1(self) -> ContractErrorEnvelopeV1 {
        let (family, path, message) = match self {
            Self::InvalidPolicyDecision => (
                ContractErrorFamilyV1::ApprovalRequest,
                "/policy_decision",
                "Policy decision must satisfy the exact v1 approval-required contract.",
            ),
            Self::ApprovalNotRequired => (
                ContractErrorFamilyV1::ApprovalRequest,
                "/policy_decision/decision",
                "Approval evidence requires an approval-required policy decision.",
            ),
            Self::InvalidRequestTime => (
                ContractErrorFamilyV1::ApprovalRequest,
                "/requested_at",
                "requested_at must be a real canonical UTC instant.",
            ),
            Self::RequestExpired => (
                ContractErrorFamilyV1::ApprovalRequest,
                "/requested_at",
                "Approval request must occur inside the policy decision validity window.",
            ),
            Self::RequestHashUnavailable => (
                ContractErrorFamilyV1::ApprovalRequest,
                "/policy_decision",
                "Approval request identity could not be produced.",
            ),
            Self::InvalidRequest => (
                ContractErrorFamilyV1::ApprovalDecision,
                "/approval_request",
                "Approval request must satisfy the exact v1 contract.",
            ),
            Self::InvalidDecisionInput => (
                ContractErrorFamilyV1::ApprovalDecision,
                "/decision",
                "Approval decision input must satisfy the exact v1 human-decision contract.",
            ),
            Self::SelfApprovalForbidden => (
                ContractErrorFamilyV1::ApprovalDecision,
                "/approver_ref",
                "The requester cannot decide the same approval request.",
            ),
            Self::DecisionExpired => (
                ContractErrorFamilyV1::ApprovalDecision,
                "/decided_at",
                "Approval decision must occur inside the request validity window.",
            ),
            Self::DecisionHashUnavailable => (
                ContractErrorFamilyV1::ApprovalDecision,
                "/approval_request",
                "Approval decision identity could not be produced.",
            ),
        };
        ContractErrorEnvelopeV1::new(family, contract_error(self.code(), path, message))
    }
}

impl IntoContractErrorEnvelopeV1 for AuditEventV1Error {
    fn into_contract_error_envelope_v1(self) -> ContractErrorEnvelopeV1 {
        let (path, message) = match self {
            Self::InvalidInput => (
                "/input",
                "Input must satisfy one exact v1 audit event source shape.",
            ),
            Self::InvalidObservedAt => (
                "/observed_at",
                "observed_at must be a real canonical UTC instant.",
            ),
            Self::SourceEvidenceMismatch => (
                "/input",
                "Audit source evidence does not reproduce the exact v1 chain.",
            ),
            Self::ObservedBeforeEvent => (
                "/observed_at",
                "Audit observation cannot precede its source event.",
            ),
            Self::HashUnavailable => ("/input", "Audit evidence identity could not be produced."),
        };
        ContractErrorEnvelopeV1::new(
            ContractErrorFamilyV1::AuditEvent,
            contract_error(self.code(), path, message),
        )
    }
}

/// Maps the distinct audit-idempotency result errors to public-safe items.
///
/// Idempotency has its own closed result shape and is not a seventh family in
/// `lnsat.error_envelope.v1_0`.
#[must_use]
pub const fn map_audit_event_idempotency_error_v1(
    error: AuditEventIdempotencyErrorV1,
) -> ContractErrorV1 {
    match error {
        AuditEventIdempotencyErrorV1::InvalidPriorState => contract_error(
            error.code(),
            "/prior_state",
            "Prior state must satisfy the bounded audit idempotency contract.",
        ),
        AuditEventIdempotencyErrorV1::DuplicateIdempotencyKey => contract_error(
            error.code(),
            "/prior_state",
            "Prior state must contain at most one entry per idempotency key.",
        ),
        AuditEventIdempotencyErrorV1::InvalidCandidate => contract_error(
            error.code(),
            "/candidate",
            "Candidate must contain one valid audit idempotency key and event id.",
        ),
        AuditEventIdempotencyErrorV1::Collision => contract_error(
            error.code(),
            "/candidate/event_id",
            "Existing idempotency key has a different event identity.",
        ),
    }
}

const fn contract_error(
    code: &'static str,
    path: &'static str,
    message: &'static str,
) -> ContractErrorV1 {
    ContractErrorV1 {
        code,
        path,
        message,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_family_variant_maps_to_one_public_safe_failure() {
        let envelopes = [
            ContractVersionError::Required.into_contract_error_envelope_v1(),
            ContractVersionError::Malformed.into_contract_error_envelope_v1(),
            ContractVersionError::Unsupported.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::InvalidJson.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::InvalidType.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::UnexpectedField.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::MissingRequiredField.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::UnsupportedContractVersion.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::UnsupportedSchema.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::InvalidField.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::InvalidTimeWindow.into_contract_error_envelope_v1(),
            PacketEnvelopeV1Error::NoncanonicalCollection.into_contract_error_envelope_v1(),
            PolicyDecisionV1Error::InvalidPacket.into_contract_error_envelope_v1(),
            PolicyDecisionV1Error::InvalidEvaluationTime.into_contract_error_envelope_v1(),
            PolicyDecisionV1Error::PacketExpired.into_contract_error_envelope_v1(),
            PolicyDecisionV1Error::HashUnavailable.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::InvalidPolicyDecision.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::ApprovalNotRequired.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::InvalidRequestTime.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::RequestExpired.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::RequestHashUnavailable.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::InvalidRequest.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::InvalidDecisionInput.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::SelfApprovalForbidden.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::DecisionExpired.into_contract_error_envelope_v1(),
            ApprovalEvidenceV1Error::DecisionHashUnavailable.into_contract_error_envelope_v1(),
            AuditEventV1Error::InvalidInput.into_contract_error_envelope_v1(),
            AuditEventV1Error::InvalidObservedAt.into_contract_error_envelope_v1(),
            AuditEventV1Error::SourceEvidenceMismatch.into_contract_error_envelope_v1(),
            AuditEventV1Error::ObservedBeforeEvent.into_contract_error_envelope_v1(),
            AuditEventV1Error::HashUnavailable.into_contract_error_envelope_v1(),
        ];

        for envelope in envelopes {
            assert_eq!(envelope.errors.len(), 1);
            assert!(!envelope.errors[0].code.is_empty());
            assert!(!envelope.errors[0].message.is_empty());
            assert_eq!(envelope.errors[0].severity(), "error");
            assert_eq!(envelope.side_effects, []);
            let object = envelope
                .to_json_value()
                .as_object()
                .expect("envelope must serialize as an object")
                .clone();
            assert_eq!(object.len(), 4);
            assert_eq!(object.get("ok"), Some(&Value::Bool(false)));
            assert_eq!(
                object.get(envelope.family.result_field()),
                Some(&Value::Null)
            );
            assert_eq!(object.get("side_effects"), Some(&Value::Array(Vec::new())));
        }
    }

    #[test]
    fn every_idempotency_variant_maps_without_widening_the_family_envelope() {
        for error in [
            AuditEventIdempotencyErrorV1::InvalidPriorState,
            AuditEventIdempotencyErrorV1::DuplicateIdempotencyKey,
            AuditEventIdempotencyErrorV1::InvalidCandidate,
            AuditEventIdempotencyErrorV1::Collision,
        ] {
            let mapped = map_audit_event_idempotency_error_v1(error);
            assert_eq!(mapped.code, error.code());
            assert!(!mapped.path.is_empty());
            assert!(!mapped.message.is_empty());
            assert_eq!(mapped.severity(), "error");
        }
    }
}
