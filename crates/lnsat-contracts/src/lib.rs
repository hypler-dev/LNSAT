#![forbid(unsafe_code)]

//! Exact-match contract-version negotiation for cross-language conformance.
//!
//! Broader packet parsing and canonicalization remain separate contract
//! families.

use core::fmt;

mod approval;
mod audit;
mod error;
mod execution;
mod idempotency;
mod packet;
mod policy;
mod signed_approval;

pub use approval::{
    ApprovalDecisionV1, ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ApprovalEvidenceV1Error, ApprovalPolicyDecisionRefV1, ApprovalRequestRefV1, ApprovalRequestV1,
    ApprovalRequestV1PolicyReason, create_approval_request_v1, decide_approval_request_v1,
};
pub use audit::{
    AuditApprovalDecisionRefV1, AuditApprovalRequestRefV1, AuditEventV1, AuditEventV1Error,
    AuditEventV1Input, AuditEventV1ResultStatus, AuditEventV1Type, AuditPacketRefV1,
    AuditPolicyRefV1, AuditRedactionV1, create_audit_event_v1,
};
pub use error::{
    ContractErrorEnvelopeV1, ContractErrorFamilyV1, ContractErrorV1, IntoContractErrorEnvelopeV1,
    map_audit_event_idempotency_error_v1,
};
pub use execution::{
    DerivedExecutionRequestV1, EXECUTION_PROPOSAL_SCHEMA_V1_0,
    EXECUTION_REQUEST_DERIVATION_PROFILE_V1, EXECUTION_REQUEST_SCHEMA_V1_0, ExecutionActionV1,
    ExecutionAdapterV1, ExecutionProposalV1, ExecutionRequestV1, ExecutionRequestV1Error,
    ExecutionRequestV1Input, ExecutionTargetV1, derive_execution_request_v1,
    parse_execution_proposal_v1, verify_derived_execution_request_v1,
};
pub use idempotency::{
    AUDIT_EVENT_IDEMPOTENCY_MAX_PRIOR_ENTRIES, AuditEventIdempotencyDecisionV1,
    AuditEventIdempotencyErrorV1, AuditEventIdempotencyOutcomeV1, AuditEventIdempotencyRefV1,
    evaluate_audit_event_idempotency_v1,
};
pub use packet::{
    PacketBudgetV1, PacketEnvelopeV1, PacketEnvelopeV1Error, canonical_utc_timestamp_millis_v1,
    canonicalize_packet_envelope_v1, fuzz_packet_envelope_v1, hash_packet_envelope_v1,
    is_canonical_utc_timestamp_v1, is_valid_reference_v1, parse_packet_envelope_v1,
};
pub use policy::{
    PolicyCapabilityDecisionV1, PolicyDecisionV1, PolicyDecisionV1Error, PolicyDecisionV1Kind,
    PolicyDecisionV1Reason, PolicyPacketRefV1, decide_packet_envelope_policy_v1,
};
pub use signed_approval::{
    ApprovalVerificationMaterialV1, Ed25519VerificationPrimitiveResultV1,
    Ed25519VerificationRejectionClassV1, SignedApprovalEvidenceIdentityV1,
    SignedApprovalEvidenceV1, SignedApprovalEvidenceV1Validation, SignedApprovalPayloadV1,
    SignedApprovalSignatureV1, SignedApprovalVerificationErrorV1, SignedApprovalVerificationV1,
    SignedApprovalVerificationV1Error, derive_signed_approval_evidence_identity_v1,
    parse_approval_verification_material_v1, parse_signed_approval_evidence_v1,
    verify_ed25519_signature_primitive_v1,
};

/// Deprecated pre-v1 compatibility contract version.
pub const CONTRACT_VERSION_V0_1: &str = "lnsat.contracts.v0_1";

/// Current stable v1 contract version.
pub const CONTRACT_VERSION_V1_0: &str = "lnsat.contracts.v1_0";

/// Supported contract versions.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContractVersion {
    /// Deprecated pre-v1 compatibility contract.
    V0_1,
    /// Current stable v1 contract.
    V1_0,
}

/// Stability state carried by exact version negotiation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContractVersionStability {
    /// Supported only for the documented compatibility window.
    Deprecated,
    /// Current supported contract.
    Stable,
}

impl ContractVersion {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::V0_1 => CONTRACT_VERSION_V0_1,
            Self::V1_0 => CONTRACT_VERSION_V1_0,
        }
    }

    /// Compatibility state for the exact version.
    #[must_use]
    pub const fn stability(self) -> ContractVersionStability {
        match self {
            Self::V0_1 => ContractVersionStability::Deprecated,
            Self::V1_0 => ContractVersionStability::Stable,
        }
    }
}

impl ContractVersionStability {
    /// Stable wire value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Deprecated => "deprecated",
            Self::Stable => "stable",
        }
    }
}

/// Stable fail-closed version validation errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContractVersionError {
    /// Version field is empty.
    Required,
    /// Version field does not follow `lnsat.contracts.v<major>_<minor>`.
    Malformed,
    /// Version field is well formed but unsupported.
    Unsupported,
}

impl ContractVersionError {
    /// Stable cross-language error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::Required => "contract.version.required",
            Self::Malformed => "contract.version.malformed",
            Self::Unsupported => "contract.version.unsupported",
        }
    }
}

impl fmt::Display for ContractVersionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ContractVersionError {}

/// Validates exact supported contract-version truth without widening input.
///
/// # Errors
///
/// Returns a stable required, malformed, or unsupported error for every input
/// outside the exact supported contract-version set.
pub fn validate_contract_version(input: &str) -> Result<ContractVersion, ContractVersionError> {
    if input.is_empty() {
        return Err(ContractVersionError::Required);
    }

    if !is_well_formed_contract_version(input) {
        return Err(ContractVersionError::Malformed);
    }

    match input {
        CONTRACT_VERSION_V0_1 => Ok(ContractVersion::V0_1),
        CONTRACT_VERSION_V1_0 => Ok(ContractVersion::V1_0),
        _ => Err(ContractVersionError::Unsupported),
    }
}

fn is_well_formed_contract_version(input: &str) -> bool {
    if input.len() > 128 {
        return false;
    }

    let Some(numeric_version) = input.strip_prefix("lnsat.contracts.v") else {
        return false;
    };
    let mut components = numeric_version.split('_');
    let Some(major) = components.next() else {
        return false;
    };
    let Some(minor) = components.next() else {
        return false;
    };

    components.next().is_none() && is_canonical_decimal(major) && is_canonical_decimal(minor)
}

fn is_canonical_decimal(component: &str) -> bool {
    if component == "0" {
        return true;
    }

    component
        .as_bytes()
        .first()
        .is_some_and(|first| first.is_ascii_digit() && *first != b'0')
        && component.bytes().all(|byte| byte.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use super::{
        ContractVersion, ContractVersionError, ContractVersionStability, validate_contract_version,
    };

    #[test]
    fn supported_version_returns_typed_value() {
        assert_eq!(
            validate_contract_version("lnsat.contracts.v1_0"),
            Ok(ContractVersion::V1_0)
        );
    }

    #[test]
    fn deprecated_version_retains_explicit_compatibility_state() {
        let version = validate_contract_version("lnsat.contracts.v0_1")
            .expect("deprecated compatibility version remains accepted");
        assert_eq!(version, ContractVersion::V0_1);
        assert_eq!(version.stability(), ContractVersionStability::Deprecated);
    }

    #[test]
    fn empty_version_fails_required() {
        assert_eq!(
            validate_contract_version(""),
            Err(ContractVersionError::Required)
        );
    }

    #[test]
    fn malformed_version_fails_closed() {
        assert_eq!(
            validate_contract_version("lnsat.contracts.v0.1"),
            Err(ContractVersionError::Malformed)
        );
    }

    #[test]
    fn noncanonical_leading_zero_fails_closed() {
        assert_eq!(
            validate_contract_version("lnsat.contracts.v01_0"),
            Err(ContractVersionError::Malformed)
        );
    }

    #[test]
    fn future_version_is_unsupported() {
        assert_eq!(
            validate_contract_version("lnsat.contracts.v1_1"),
            Err(ContractVersionError::Unsupported)
        );
    }
}
