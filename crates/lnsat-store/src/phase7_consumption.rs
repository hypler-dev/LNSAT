use super::{
    LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1, LocalControlPermissionV1, LocalIdentityRoleV1,
    LocalIdentityStatusV1, LocalSessionActivityVerificationV1, LocalSessionRecordV1, SqliteStore,
    SqliteStoreError, canonical_utc_timestamp_millis_v1, decode_local_session_v1,
    is_local_session_id_v1, is_valid_reference_v1, select_local_identity_v1,
    select_local_session_activity_v1, select_local_session_revocation_v1, select_local_session_v1,
    validate_local_session_activity_v1, validate_local_session_revocation_v1,
    verify_and_touch_local_session_on_connection_v1, verify_current_schema,
};
use crate::phase7_nonce::canonical_system_time_v1;
use crate::phase7_nonce::{insert_entity_and_audit, read_validated_nonce_by_id};
use crate::phase7_persistence::{
    Phase7AuthorizationAttemptRecordV1, Phase7PersistenceErrorV1, audit_binding_exists, blob_32,
    bounded_reference, digest_fields, phase7_entity_exists, read_validated_attempt_by_id,
    valid_prefixed_id,
};
use core::fmt;
use rusqlite::{
    Connection, Error as SqliteError, ErrorCode, OptionalExtension, Transaction,
    TransactionBehavior, params,
};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;
use zeroize::{Zeroize, Zeroizing};

/// Exact caller-owned one-time execution capability size.
pub const PHASE7_CAPABILITY_BYTES_V1: usize = 32;
/// Frozen lowercase-hex wire length for one 32-byte execution capability.
pub const PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1: usize = PHASE7_CAPABILITY_BYTES_V1 * 2;
/// Hard local authorization lifetime cap. Earlier source/session expiry wins.
pub const PHASE7_AUTHORIZATION_TTL_SECONDS_V1: u64 = 60;

const CAPABILITY_DIGEST_DOMAIN: &str = "lnsat.phase7.capability.v1";
const REDEMPTION_REQUEST_DIGEST_DOMAIN: &str = "lnsat.phase7.capability-redemption-request.v1";
const AUTHORIZATION_ID_DOMAIN: &str = "lnsat.phase7.execution-authorization-id.v1";
const AUTHORIZATION_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.execution-authorization-audit-id.v1";
const AUTHORIZATION_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.execution-authorization-record.v1";
const AUTHORIZATION_STATE_EVENT_ID_DOMAIN: &str = "lnsat.phase7.authorization-state-event-id.v1";
const AUTHORIZATION_STATE_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.authorization-state-audit-id.v1";
const AUTHORIZATION_STATE_DIGEST_DOMAIN: &str = "lnsat.phase7.authorization-state.v1";
const AUTHORIZATION_STATE_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.authorization-state-record.v1";
const OPERATION_REQUEST_DIGEST_DOMAIN: &str = "lnsat.phase7.operation-request.v1";
const OPERATION_ID_DOMAIN: &str = "lnsat.phase7.operation-id.v1";
const OPERATION_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.operation-audit-id.v1";
const OPERATION_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.operation-record.v1";
const OPERATION_STATE_EVENT_ID_DOMAIN: &str = "lnsat.phase7.operation-state-event-id.v1";
const OPERATION_STATE_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.operation-state-audit-id.v1";
const OPERATION_STATE_DIGEST_DOMAIN: &str = "lnsat.phase7.operation-state.v1";
const OPERATION_STATE_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.operation-state-record.v1";
const CONSUMPTION_ID_DOMAIN: &str = "lnsat.phase7.capability-consumption-id.v1";
const CONSUMPTION_AUDIT_ID_DOMAIN: &str = "lnsat.phase7.capability-consumption-audit-id.v1";
const CONSUMPTION_RECORD_DIGEST_DOMAIN: &str = "lnsat.phase7.capability-consumption-record.v1";
const AUTHORIZATION_PROFILE: &str = "server_record_plus_digest_stored_one_time_capability";
const LOCAL_AUTHORIZATION_AUDIENCE: &str = "audience:gateway:local";
const PHASE7_AUTHORIZATION_TTL_MILLIS_V1: u64 = PHASE7_AUTHORIZATION_TTL_SECONDS_V1 * 1_000;
const LOCAL_SESSION_REF_PREFIX_V1: &str = "session:local:";
const IMMEDIATE_TRANSACTION_ATTEMPTS: u8 = 4;
const LOWER_HEX: &[u8; 16] = b"0123456789abcdef";

/// Exact existing authorization, operation, and idempotency scope for one
/// capability redemption. Caller supplies no digest, identifier, or timestamp.
#[derive(Clone, Copy, Debug)]
pub struct Phase7CapabilityRedemptionInputV1<'a> {
    pub project_ref: &'a str,
    pub resource_ref: &'a str,
    pub authorization_id: &'a str,
    pub operation_id: &'a str,
    pub idempotency_key: &'a str,
}

/// Exact persisted-source selectors for authenticated local authorization issue.
/// Caller supplies no authority digest, identifier, timestamp, expiry, or state.
#[derive(Clone, Copy, Debug)]
pub struct Phase7ExecutionAuthorizationIssueInputV1<'a> {
    pub project_ref: &'a str,
    pub resource_ref: &'a str,
    pub authorization_attempt_id: &'a str,
    pub nonce_id: &'a str,
    pub operation_idempotency_key: &'a str,
}

/// Exact source scope for authenticated cancellation or revocation.
#[derive(Clone, Copy, Debug)]
pub struct Phase7ExecutionAuthorizationTransitionInputV1<'a> {
    pub project_ref: &'a str,
    pub resource_ref: &'a str,
    pub authorization_id: &'a str,
}

/// Owned caller-supplied capability. Raw bytes are never persisted, cloned,
/// serialized, displayed, audited, logged, or returned.
pub struct Phase7CapabilitySecretV1 {
    bytes: [u8; PHASE7_CAPABILITY_BYTES_V1],
}

impl Phase7CapabilitySecretV1 {
    /// Copies exactly 32 raw capability bytes into the owned secret, then
    /// zeroizes the caller's source buffer before returning.
    #[must_use]
    pub fn take_from_bytes(bytes: &mut [u8; PHASE7_CAPABILITY_BYTES_V1]) -> Self {
        let owned = *bytes;
        bytes.zeroize();
        Self { bytes: owned }
    }

    /// Decodes exact 64-byte lowercase hexadecimal wire text, then zeroizes
    /// caller storage on every success or failure path.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` for any noncanonical length or byte.
    pub fn take_from_canonical_wire_v1(
        wire: &mut String,
    ) -> Result<Self, Phase7PersistenceErrorV1> {
        let mut decoded = Zeroizing::new([0_u8; PHASE7_CAPABILITY_BYTES_V1]);
        let valid = if wire.len() == PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1 {
            let mut valid = true;
            for (index, pair) in wire.as_bytes().chunks_exact(2).enumerate() {
                match (decode_lower_hex(pair[0]), decode_lower_hex(pair[1])) {
                    (Some(high), Some(low)) => decoded[index] = (high << 4) | low,
                    _ => valid = false,
                }
            }
            valid
        } else {
            false
        };
        wire.zeroize();
        if !valid {
            return Err(Phase7PersistenceErrorV1::InvalidInput);
        }
        Ok(Self::take_from_bytes(&mut decoded))
    }
}

impl fmt::Debug for Phase7CapabilitySecretV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Phase7CapabilitySecretV1(<redacted>)")
    }
}

impl Drop for Phase7CapabilitySecretV1 {
    fn drop(&mut self) {
        self.bytes.zeroize();
    }
}

/// Server-generated one-time capability returned only by first issue.
///
/// No clone/serialization access exists. Canonical wire extraction consumes
/// this value and zeroizes its owned bytes.
pub struct Phase7ExecutionCapabilityV1 {
    bytes: [u8; PHASE7_CAPABILITY_BYTES_V1],
}

/// Exact lowercase-hex capability wire owned only for one authenticated
/// response. Debug is redacted; storage zeroizes on drop.
pub struct Phase7ExecutionCapabilityWireV1 {
    encoded: Zeroizing<String>,
}

impl Phase7ExecutionCapabilityWireV1 {
    /// Exposes bytes only to an authenticated response writer.
    #[must_use]
    pub fn expose_for_authenticated_response_v1(&self) -> &str {
        self.encoded.as_str()
    }

    /// Moves exact wire bytes into the redacted capability-secret owner and
    /// clears this response buffer.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` if owned wire evidence is not canonical.
    pub fn take_secret_v1(&mut self) -> Result<Phase7CapabilitySecretV1, Phase7PersistenceErrorV1> {
        Phase7CapabilitySecretV1::take_from_canonical_wire_v1(&mut self.encoded)
    }
}

impl fmt::Debug for Phase7ExecutionCapabilityWireV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Phase7ExecutionCapabilityWireV1(<redacted>)")
    }
}

impl Drop for Phase7ExecutionCapabilityWireV1 {
    fn drop(&mut self) {
        self.encoded.zeroize();
    }
}

impl Phase7ExecutionCapabilityV1 {
    /// Consumes this secret into exact lowercase hexadecimal wire text.
    #[must_use]
    pub fn into_canonical_wire_v1(mut self) -> Phase7ExecutionCapabilityWireV1 {
        let mut encoded =
            Zeroizing::new(String::with_capacity(PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1));
        for byte in self.bytes {
            encoded.push(char::from(LOWER_HEX[usize::from(byte >> 4)]));
            encoded.push(char::from(LOWER_HEX[usize::from(byte & 0x0f)]));
        }
        self.bytes.zeroize();
        Phase7ExecutionCapabilityWireV1 { encoded }
    }
}

impl fmt::Debug for Phase7ExecutionCapabilityV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Phase7ExecutionCapabilityV1(<redacted>)")
    }
}

impl Drop for Phase7ExecutionCapabilityV1 {
    fn drop(&mut self) {
        self.bytes.zeroize();
    }
}

/// Secret-free authorization plus prepared-operation metadata.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7ExecutionAuthorizationRecordV1 {
    pub authorization_id: String,
    pub audit_binding_id: String,
    pub project_ref: String,
    pub resource_ref: String,
    pub authorization_attempt_id: String,
    pub nonce_id: String,
    pub binding_digest: [u8; 32],
    pub approval_decision_id: String,
    pub policy_decision_id: String,
    pub packet_id: String,
    pub packet_sha256: String,
    pub requester_ref: String,
    pub requester_session_ref: String,
    pub approver_ref: String,
    pub approver_session_ref: String,
    pub action_digest: [u8; 32],
    pub target_digest: [u8; 32],
    pub configuration_digest: [u8; 32],
    pub adapter_ref: String,
    pub executable_digest: [u8; 32],
    pub audience: String,
    pub authorization_profile: String,
    pub issued_at: String,
    pub expires_at: String,
    pub state_event_id: String,
    pub state_audit_binding_id: String,
    pub state_sequence: u32,
    pub state: String,
    pub state_effective_at: String,
    pub active: bool,
    pub operation_id: String,
    pub operation_audit_binding_id: String,
    pub operation_idempotency_key: String,
    pub operation_request_digest: [u8; 32],
}

/// First issue returns raw capability once. Replay returns metadata only.
#[derive(Debug)]
pub struct Phase7ExecutionAuthorizationIssueV1 {
    pub created: bool,
    pub capability: Option<Phase7ExecutionCapabilityV1>,
    pub record: Phase7ExecutionAuthorizationRecordV1,
}

/// Result from cancellation, revocation, or lazy expiry materialization.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7ExecutionAuthorizationTransitionV1 {
    pub changed: bool,
    pub record: Phase7ExecutionAuthorizationRecordV1,
}

/// Immutable digest-only consumption plus terminal authorization evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7CapabilityConsumptionRecordV1 {
    pub consumption_id: String,
    pub audit_binding_id: String,
    pub project_ref: String,
    pub resource_ref: String,
    pub authorization_id: String,
    pub operation_id: String,
    pub binding_digest: [u8; 32],
    pub idempotency_key: String,
    pub request_digest: [u8; 32],
    pub consumed_at: String,
    pub authorization_state_event_id: String,
    pub authorization_state_audit_binding_id: String,
    pub authorization_state_sequence: u32,
}

/// Result from first atomic redemption or exact read-only replay.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7CapabilityConsumptionWriteV1 {
    pub created: bool,
    pub record: Phase7CapabilityConsumptionRecordV1,
}

#[derive(Clone, Debug)]
struct StoredAuthorization {
    authorization_id: String,
    audit_binding_id: String,
    project_ref: String,
    resource_ref: String,
    authorization_attempt_id: String,
    nonce_id: String,
    binding_digest: [u8; 32],
    approval_decision_id: String,
    policy_decision_id: String,
    packet_id: String,
    packet_sha256: String,
    requester_ref: String,
    requester_session_ref: String,
    approver_ref: String,
    approver_session_ref: String,
    action_digest: [u8; 32],
    target_digest: [u8; 32],
    configuration_digest: [u8; 32],
    adapter_ref: String,
    executable_digest: [u8; 32],
    audience: String,
    capability_digest: [u8; 32],
    authorization_profile: String,
    issued_at: String,
    expires_at: String,
    stored_record_digest: [u8; 32],
    entity_created_at: String,
    audit_event_kind: String,
    audit_authority_effect: String,
    audit_recorded_at: String,
    events: Vec<StoredStateEvent>,
}

#[derive(Clone, Debug)]
struct StoredOperation {
    operation_id: String,
    audit_binding_id: String,
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    binding_digest: [u8; 32],
    idempotency_key: String,
    request_digest: [u8; 32],
    requested_action_digest: [u8; 32],
    approved_action_digest: [u8; 32],
    authorized_action_digest: [u8; 32],
    target_digest: [u8; 32],
    configuration_digest: [u8; 32],
    adapter_ref: String,
    executable_digest: [u8; 32],
    audience: String,
    created_at: String,
    expires_at: String,
    stored_record_digest: [u8; 32],
    entity_created_at: String,
    audit_event_kind: String,
    audit_authority_effect: String,
    audit_recorded_at: String,
    events: Vec<StoredStateEvent>,
}

#[derive(Clone, Debug)]
struct StoredConsumption {
    consumption_id: String,
    audit_binding_id: String,
    project_ref: String,
    resource_ref: String,
    authorization_id: String,
    operation_id: String,
    binding_digest: [u8; 32],
    capability_digest: [u8; 32],
    idempotency_key: String,
    request_digest: [u8; 32],
    consumed_at: String,
    stored_record_digest: [u8; 32],
    entity_created_at: String,
    audit_event_kind: String,
    audit_authority_effect: String,
    audit_recorded_at: String,
}

#[derive(Clone, Debug)]
struct StoredStateEvent {
    state_event_id: String,
    audit_binding_id: String,
    project_ref: String,
    resource_ref: String,
    target_entity_id: String,
    target_entity_kind: String,
    state_sequence: i64,
    state: String,
    prior_state_event_id: Option<String>,
    prior_state_sequence: Option<i64>,
    effective_at: String,
    state_digest: [u8; 32],
    stored_record_digest: [u8; 32],
    entity_created_at: String,
    audit_event_kind: String,
    audit_authority_effect: String,
    audit_recorded_at: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum AuthorizationTransitionKind {
    Cancelled,
    Revoked,
}

#[derive(Clone, Debug)]
struct ValidatedPhase7Session {
    session: LocalSessionRecordV1,
    active_until_millis: u64,
}

impl AuthorizationTransitionKind {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Cancelled => "cancelled",
            Self::Revoked => "revoked",
        }
    }
}

impl SqliteStore {
    /// Issues one exact local execution authorization and prepared operation.
    ///
    /// Requester bearer/CSRF verification, full persisted source revalidation,
    /// server time, entropy, authorization/operation rows, active/prepared
    /// states, and audit bindings share one immediate transaction. Raw
    /// capability bytes return only after a successful first commit.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid scope, rejected local authentication, inactive
    /// source/session evidence, replay conflict, entropy/clock failure, drift,
    /// failed persistence, or ambiguous commit outcome.
    pub fn issue_phase7_local_execution_authorization_v1(
        &mut self,
        input: &Phase7ExecutionAuthorizationIssueInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
    ) -> Result<Phase7ExecutionAuthorizationIssueV1, Phase7PersistenceErrorV1> {
        self.issue_phase7_local_execution_authorization_from_sources_v1(
            input,
            raw_session_token,
            raw_csrf_token,
            || {
                let issued_time = SystemTime::now();
                let ttl_time = issued_time
                    .checked_add(Duration::from_secs(PHASE7_AUTHORIZATION_TTL_SECONDS_V1))
                    .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
                Ok((
                    canonical_system_time_v1(issued_time)?,
                    canonical_system_time_v1(ttl_time)?,
                ))
            },
            |bytes| {
                getrandom::getrandom(bytes)
                    .map_err(|_| Phase7PersistenceErrorV1::EntropyUnavailable)
            },
            || Ok(()),
            || Ok(()),
        )
    }

    #[cfg(test)]
    #[allow(clippy::too_many_arguments)]
    pub(super) fn issue_phase7_local_execution_authorization_with_sources_v1<C, F, P, A>(
        &mut self,
        input: &Phase7ExecutionAuthorizationIssueInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
        clock: C,
        fill_entropy: F,
        precommit: P,
        after_commit: A,
    ) -> Result<Phase7ExecutionAuthorizationIssueV1, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<(String, String), Phase7PersistenceErrorV1>,
        F: FnOnce(&mut [u8; PHASE7_CAPABILITY_BYTES_V1]) -> Result<(), Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.issue_phase7_local_execution_authorization_from_sources_v1(
            input,
            raw_session_token,
            raw_csrf_token,
            clock,
            fill_entropy,
            precommit,
            after_commit,
        )
    }

    #[allow(clippy::too_many_arguments, clippy::too_many_lines)]
    fn issue_phase7_local_execution_authorization_from_sources_v1<C, F, P, A>(
        &mut self,
        input: &Phase7ExecutionAuthorizationIssueInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
        clock: C,
        fill_entropy: F,
        precommit: P,
        after_commit: A,
    ) -> Result<Phase7ExecutionAuthorizationIssueV1, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<(String, String), Phase7PersistenceErrorV1>,
        F: FnOnce(&mut [u8; PHASE7_CAPABILITY_BYTES_V1]) -> Result<(), Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        validate_authorization_issue_input(input)?;
        let transaction = begin_immediate_transaction(&self.connection)?;
        let (issued_at, ttl_expires_at) = clock()?;
        validate_authorization_ttl_window(&issued_at, &ttl_expires_at)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;

        let requester = authenticate_phase7_local_session(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            &issued_at,
        )?;
        if !requester
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
        {
            return Err(Phase7PersistenceErrorV1::SourceNotApproved);
        }

        let attempt = read_validated_attempt_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.authorization_attempt_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::SourceNotApproved)?;
        if attempt.audience != LOCAL_AUTHORIZATION_AUDIENCE {
            return Err(Phase7PersistenceErrorV1::SourceNotApproved);
        }
        let nonce = read_validated_nonce_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.nonce_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::SourceNotApproved)?;
        if nonce.authorization_attempt_id != attempt.authorization_attempt_id
            || nonce.binding_digest != attempt.binding_digest
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }

        let requester_session_ref = local_session_ref(&requester.session.session_id);
        if requester.session.identity_ref != attempt.requester_ref
            || requester_session_ref != attempt.requester_session_ref
        {
            return Err(Phase7PersistenceErrorV1::SourceNotApproved);
        }
        if let Some(existing) = select_authorization_by_attempt(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.authorization_attempt_id,
        )? {
            let existing = validate_stored_authorization(&transaction, existing)?;
            let (existing, _) =
                materialize_authorization_expiry_if_needed(&transaction, existing, &issued_at)?;
            let operation = select_operation_by_authorization(
                &transaction,
                input.project_ref,
                input.resource_ref,
                &existing.authorization_id,
            )?
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
            let operation = validate_stored_operation(&transaction, operation)?;
            if existing.nonce_id != input.nonce_id
                || operation.idempotency_key != input.operation_idempotency_key
            {
                return Err(Phase7PersistenceErrorV1::IdempotencyConflict);
            }
            let record = authorization_public_record(&existing, &operation, &issued_at)?;
            precommit()?;
            transaction
                .commit()
                .map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
            return Ok(Phase7ExecutionAuthorizationIssueV1 {
                created: false,
                capability: None,
                record,
            });
        }

        let approver = validate_phase7_session_reference(
            &transaction,
            &attempt.approver_ref,
            &attempt.approver_session_ref,
            &issued_at,
        )?;
        if !approver
            .session
            .role
            .allows_control(LocalControlPermissionV1::DecideApproval)
            || approver.session.identity_ref == requester.session.identity_ref
        {
            return Err(Phase7PersistenceErrorV1::SourceNotApproved);
        }

        validate_authorization_source_window(&attempt, &nonce, &issued_at)?;
        let expires_at = effective_authorization_expiry(
            &issued_at,
            &ttl_expires_at,
            &attempt.expires_at,
            &nonce.expires_at,
            &requester.session.expires_at,
            &approver.session.expires_at,
            requester.active_until_millis,
            approver.active_until_millis,
        )?;

        if select_authorization_by_approval_decision(&transaction, &attempt.approval_decision_id)?
            .is_some()
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        if select_operation_by_idempotency(
            &transaction,
            input.project_ref,
            input.operation_idempotency_key,
        )?
        .is_some()
        {
            return Err(Phase7PersistenceErrorV1::IdempotencyConflict);
        }

        let mut raw_capability = Zeroizing::new([0_u8; PHASE7_CAPABILITY_BYTES_V1]);
        fill_entropy(&mut raw_capability)?;
        let capability_digest = capability_digest(&raw_capability);
        if authorization_capability_digest_exists(
            &transaction,
            input.project_ref,
            &capability_digest,
        )? {
            return Err(Phase7PersistenceErrorV1::IdentityConflict);
        }

        let (authorization, operation) = insert_authorization_and_operation(
            &transaction,
            input,
            &attempt,
            &nonce,
            &capability_digest,
            &issued_at,
            &expires_at,
        )?;
        let record = authorization_public_record(&authorization, &operation, &issued_at)?;
        precommit()?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
        after_commit().map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
        let capability = Phase7ExecutionCapabilityV1 {
            bytes: *raw_capability,
        };
        raw_capability.zeroize();
        Ok(Phase7ExecutionAuthorizationIssueV1 {
            created: true,
            capability: Some(capability),
            record,
        })
    }

    /// Reads one secret-free authorization and prepared-operation record,
    /// lazily persisting exact terminal expiry at the half-open boundary.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid scope or time, evidence drift, persistence
    /// failure, or ambiguous commit outcome.
    pub fn read_phase7_execution_authorization_v1(
        &mut self,
        project_ref: &str,
        resource_ref: &str,
        authorization_id: &str,
    ) -> Result<Option<Phase7ExecutionAuthorizationRecordV1>, Phase7PersistenceErrorV1> {
        self.read_phase7_execution_authorization_from_sources_v1(
            project_ref,
            resource_ref,
            authorization_id,
            None,
            || canonical_system_time_v1(SystemTime::now()),
            || Ok(()),
        )
    }

    /// Resolves secret-free project/resource scope for one authorization ID.
    /// Callers must authenticate and authorize evidence access before use.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid identity, schema drift, or persistence failure.
    pub fn read_phase8_execution_authorization_scope_v1(
        &self,
        authorization_id: &str,
    ) -> Result<Option<(String, String)>, Phase7PersistenceErrorV1> {
        if !valid_prefixed_id(authorization_id, "xau_") {
            return Err(Phase7PersistenceErrorV1::InvalidInput);
        }
        verify_current_schema(&self.connection)
            .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        self.connection
            .query_row(
                "SELECT project_ref, resource_ref
                 FROM lnsat_execution_authorizations
                 WHERE authorization_id = ?1",
                [authorization_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
    }

    /// Reads secret-free metadata as one live local evidence reader, checking
    /// bearer/session state inside the same transaction as evidence read.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid scope, rejected authentication or role, time,
    /// evidence drift, persistence failure, or ambiguous commit outcome.
    pub fn read_phase7_local_execution_authorization_v1(
        &mut self,
        project_ref: &str,
        resource_ref: &str,
        authorization_id: &str,
        raw_session_token: &str,
    ) -> Result<Option<Phase7ExecutionAuthorizationRecordV1>, Phase7PersistenceErrorV1> {
        self.read_phase7_execution_authorization_from_sources_v1(
            project_ref,
            resource_ref,
            authorization_id,
            Some(raw_session_token),
            || canonical_system_time_v1(SystemTime::now()),
            || Ok(()),
        )
    }

    #[cfg(test)]
    pub(super) fn read_phase7_execution_authorization_at_v1<P>(
        &mut self,
        project_ref: &str,
        resource_ref: &str,
        authorization_id: &str,
        checked_at: &str,
        precommit: P,
    ) -> Result<Option<Phase7ExecutionAuthorizationRecordV1>, Phase7PersistenceErrorV1>
    where
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.read_phase7_execution_authorization_from_sources_v1(
            project_ref,
            resource_ref,
            authorization_id,
            None,
            || Ok(checked_at.to_owned()),
            precommit,
        )
    }

    fn read_phase7_execution_authorization_from_sources_v1<C, P>(
        &mut self,
        project_ref: &str,
        resource_ref: &str,
        authorization_id: &str,
        local_session_token: Option<&str>,
        clock: C,
        precommit: P,
    ) -> Result<Option<Phase7ExecutionAuthorizationRecordV1>, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        validate_authorization_scope(project_ref, resource_ref, authorization_id)?;
        let transaction = begin_immediate_transaction(&self.connection)?;
        let checked_at = clock()?;
        canonical_utc_timestamp_millis_v1(&checked_at)
            .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        if let Some(raw_session_token) = local_session_token {
            let reader = authenticate_phase7_local_session(
                &transaction,
                raw_session_token,
                None,
                &checked_at,
            )?;
            if !reader
                .session
                .role
                .allows_control(LocalControlPermissionV1::ReadEvidence)
            {
                return Err(Phase7PersistenceErrorV1::SourceNotApproved);
            }
        }
        let Some(stored) =
            select_authorization_by_id(&transaction, project_ref, resource_ref, authorization_id)?
        else {
            transaction
                .commit()
                .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
            return Ok(None);
        };
        let stored = validate_stored_authorization(&transaction, stored)?;
        let (stored, _) =
            materialize_authorization_expiry_if_needed(&transaction, stored, &checked_at)?;
        let operation = select_operation_by_authorization(
            &transaction,
            project_ref,
            resource_ref,
            authorization_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let operation = validate_stored_operation(&transaction, operation)?;
        let record = authorization_public_record(&stored, &operation, &checked_at)?;
        precommit()?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
        Ok(Some(record))
    }

    /// Cancels one active authorization as its exact authenticated requester.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid scope, rejected authentication or role,
    /// evidence drift, persistence failure, or ambiguous commit outcome.
    pub fn cancel_phase7_local_execution_authorization_v1(
        &mut self,
        input: &Phase7ExecutionAuthorizationTransitionInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
    ) -> Result<Option<Phase7ExecutionAuthorizationTransitionV1>, Phase7PersistenceErrorV1> {
        self.transition_phase7_local_execution_authorization_from_sources_v1(
            input,
            raw_session_token,
            raw_csrf_token,
            AuthorizationTransitionKind::Cancelled,
            || canonical_system_time_v1(SystemTime::now()),
            || Ok(()),
        )
    }

    /// Revokes one active authorization as its exact approver or local owner.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid scope, rejected authentication or role,
    /// evidence drift, persistence failure, or ambiguous commit outcome.
    pub fn revoke_phase7_local_execution_authorization_v1(
        &mut self,
        input: &Phase7ExecutionAuthorizationTransitionInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
    ) -> Result<Option<Phase7ExecutionAuthorizationTransitionV1>, Phase7PersistenceErrorV1> {
        self.transition_phase7_local_execution_authorization_from_sources_v1(
            input,
            raw_session_token,
            raw_csrf_token,
            AuthorizationTransitionKind::Revoked,
            || canonical_system_time_v1(SystemTime::now()),
            || Ok(()),
        )
    }

    #[cfg(test)]
    pub(super) fn transition_phase7_local_execution_authorization_with_sources_v1<C, P>(
        &mut self,
        input: &Phase7ExecutionAuthorizationTransitionInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
        state: &str,
        clock: C,
        precommit: P,
    ) -> Result<Option<Phase7ExecutionAuthorizationTransitionV1>, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        let kind = match state {
            "cancelled" => AuthorizationTransitionKind::Cancelled,
            "revoked" => AuthorizationTransitionKind::Revoked,
            _ => return Err(Phase7PersistenceErrorV1::InvalidInput),
        };
        self.transition_phase7_local_execution_authorization_from_sources_v1(
            input,
            raw_session_token,
            raw_csrf_token,
            kind,
            clock,
            precommit,
        )
    }

    #[allow(clippy::too_many_arguments)]
    fn transition_phase7_local_execution_authorization_from_sources_v1<C, P>(
        &mut self,
        input: &Phase7ExecutionAuthorizationTransitionInputV1<'_>,
        raw_session_token: &str,
        raw_csrf_token: &str,
        kind: AuthorizationTransitionKind,
        clock: C,
        precommit: P,
    ) -> Result<Option<Phase7ExecutionAuthorizationTransitionV1>, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        validate_authorization_scope(
            input.project_ref,
            input.resource_ref,
            input.authorization_id,
        )?;
        let transaction = begin_immediate_transaction(&self.connection)?;
        let effective_at = clock()?;
        canonical_utc_timestamp_millis_v1(&effective_at)
            .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let actor = authenticate_phase7_local_session(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            &effective_at,
        )?;
        let Some(stored) = select_authorization_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.authorization_id,
        )?
        else {
            transaction
                .commit()
                .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
            return Ok(None);
        };
        let stored = validate_stored_authorization(&transaction, stored)?;
        authorize_phase7_transition_actor(&stored, &actor, kind)?;
        let (stored, expired) =
            materialize_authorization_expiry_if_needed(&transaction, stored, &effective_at)?;
        let latest = stored
            .events
            .last()
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let mut changed = expired;
        let stored = if latest.state == "active" {
            insert_authorization_state_event(
                &transaction,
                &stored,
                kind.as_str(),
                &effective_at,
                Some(latest),
                None,
            )?;
            changed = true;
            let reloaded = select_authorization_by_id(
                &transaction,
                input.project_ref,
                input.resource_ref,
                input.authorization_id,
            )?
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
            validate_stored_authorization(&transaction, reloaded)?
        } else {
            stored
        };
        let operation = select_operation_by_authorization(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.authorization_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let operation = validate_stored_operation(&transaction, operation)?;
        let record = authorization_public_record(&stored, &operation, &effective_at)?;
        precommit()?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
        Ok(Some(Phase7ExecutionAuthorizationTransitionV1 {
            changed,
            record,
        }))
    }

    /// Authenticates exact requester bearer/CSRF inside C1's immediate
    /// transaction, then performs unchanged atomic one-time consumption.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid scope, rejected authentication or capability,
    /// inactive authority, conflict, drift, persistence failure, or ambiguous
    /// commit outcome.
    pub fn redeem_phase7_local_execution_capability_v1(
        &mut self,
        input: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
    ) -> Result<Phase7CapabilityConsumptionWriteV1, Phase7PersistenceErrorV1> {
        self.redeem_phase7_execution_capability_from_sources_v1(
            input,
            capability,
            Some((raw_session_token, raw_csrf_token)),
            (
                || canonical_system_time_v1(SystemTime::now()),
                |_, _, _| Ok(()),
                || Ok(()),
                || Ok(()),
            ),
        )
        .map(|(write, _)| write)
    }

    /// Atomically consumes one exact existing authorization capability.
    /// No adapter call, operation attempt, receipt, or dispatch occurs.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid input, non-oracular redemption rejection,
    /// idempotency conflict, clock rollback, evidence drift, persistence
    /// failure, or ambiguous commit outcome.
    pub fn redeem_phase7_execution_capability_v1(
        &mut self,
        input: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
    ) -> Result<Phase7CapabilityConsumptionWriteV1, Phase7PersistenceErrorV1> {
        self.redeem_phase7_execution_capability_from_sources_v1(
            input,
            capability,
            None,
            (
                || canonical_system_time_v1(SystemTime::now()),
                |_, _, _| Ok(()),
                || Ok(()),
                || Ok(()),
            ),
        )
        .map(|(write, _)| write)
    }

    #[cfg(test)]
    #[allow(clippy::too_many_arguments)]
    pub(super) fn redeem_phase7_local_execution_capability_with_sources_v1<C, P, A>(
        &mut self,
        input: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
        clock: C,
        precommit: P,
        after_commit: A,
    ) -> Result<Phase7CapabilityConsumptionWriteV1, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.redeem_phase7_execution_capability_from_sources_v1(
            input,
            capability,
            Some((raw_session_token, raw_csrf_token)),
            (clock, |_, _, _| Ok(()), precommit, after_commit),
        )
        .map(|(write, _)| write)
    }

    #[cfg(test)]
    pub(super) fn redeem_phase7_execution_capability_with_sources_v1<C, P, A>(
        &mut self,
        input: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        clock: C,
        precommit: P,
        after_commit: A,
    ) -> Result<Phase7CapabilityConsumptionWriteV1, Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.redeem_phase7_execution_capability_from_sources_v1(
            input,
            capability,
            None,
            (clock, |_, _, _| Ok(()), precommit, after_commit),
        )
        .map(|(write, _)| write)
    }

    /// Runs one caller-supplied persistence hook after consumption evidence is
    /// validated but before the same immediate transaction commits. Exact
    /// idempotent redemption replay returns no hook result.
    pub(super) fn redeem_phase7_local_execution_capability_with_transaction_hook_v1<C, H, P, A, T>(
        &mut self,
        input: &Phase7CapabilityRedemptionInputV1<'_>,
        capability: Phase7CapabilitySecretV1,
        local_auth: (&str, &str),
        sources: (C, H, P, A),
    ) -> Result<(Phase7CapabilityConsumptionWriteV1, Option<T>), Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        H: FnOnce(
            &Transaction<'_>,
            &Phase7CapabilityConsumptionRecordV1,
            &str,
        ) -> Result<T, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.redeem_phase7_execution_capability_from_sources_v1(
            input,
            capability,
            Some(local_auth),
            sources,
        )
    }

    #[allow(clippy::needless_pass_by_value, clippy::too_many_lines)] // Ownership guarantees zeroize-on-drop on every return path.
    fn redeem_phase7_execution_capability_from_sources_v1<C, H, P, A, T>(
        &mut self,
        input: &Phase7CapabilityRedemptionInputV1<'_>,
        mut capability: Phase7CapabilitySecretV1,
        local_auth: Option<(&str, &str)>,
        sources: (C, H, P, A),
    ) -> Result<(Phase7CapabilityConsumptionWriteV1, Option<T>), Phase7PersistenceErrorV1>
    where
        C: FnOnce() -> Result<String, Phase7PersistenceErrorV1>,
        H: FnOnce(
            &Transaction<'_>,
            &Phase7CapabilityConsumptionRecordV1,
            &str,
        ) -> Result<T, Phase7PersistenceErrorV1>,
        P: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
        A: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        let (clock, transaction_hook, precommit, after_commit) = sources;
        validate_redemption_input(input)?;
        let candidate_digest = capability_digest(&capability.bytes);
        capability.bytes.zeroize();
        let transaction = begin_immediate_transaction(&self.connection)?;
        let consumed_at = clock()?;
        canonical_utc_timestamp_millis_v1(&consumed_at)
            .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let authenticated_requester = local_auth
            .map(|(raw_session_token, raw_csrf_token)| {
                authenticate_phase7_local_session(
                    &transaction,
                    raw_session_token,
                    Some(raw_csrf_token),
                    &consumed_at,
                )
                .map_err(|error| match error {
                    Phase7PersistenceErrorV1::SourceNotApproved => {
                        Phase7PersistenceErrorV1::RedemptionRejected
                    }
                    error => error,
                })
            })
            .transpose()?;

        if let Some(existing) = select_consumption_by_idempotency(
            &transaction,
            input.project_ref,
            input.idempotency_key,
        )? {
            let existing = validate_stored_consumption(&transaction, existing)?;
            let expected_request =
                redemption_request_digest(input, &existing.binding_digest, &candidate_digest);
            if !constant_time_equal(&existing.capability_digest, &candidate_digest) {
                return Err(Phase7PersistenceErrorV1::RedemptionRejected);
            }
            if existing.project_ref != input.project_ref
                || existing.resource_ref != input.resource_ref
                || existing.authorization_id != input.authorization_id
                || existing.operation_id != input.operation_id
                || existing.idempotency_key != input.idempotency_key
                || existing.request_digest != expected_request
            {
                return Err(Phase7PersistenceErrorV1::IdempotencyConflict);
            }
            let replay_time = canonical_utc_timestamp_millis_v1(&consumed_at)
                .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
            let original_time = canonical_millis(&existing.consumed_at)?;
            if replay_time < original_time {
                return Err(Phase7PersistenceErrorV1::ClockRejected);
            }
            if let Some(requester) = &authenticated_requester {
                let authorization = select_authorization_by_id(
                    &transaction,
                    &existing.project_ref,
                    &existing.resource_ref,
                    &existing.authorization_id,
                )?
                .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
                let authorization = validate_stored_authorization(&transaction, authorization)?;
                authorize_phase7_redemption_actor(&authorization, requester)?;
            }
            let record = consumption_public_record(&transaction, &existing)?;
            transaction
                .commit()
                .map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
            return Ok((
                Phase7CapabilityConsumptionWriteV1 {
                    created: false,
                    record,
                },
                None,
            ));
        }

        let Some(authorization) = select_authorization_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.authorization_id,
        )?
        else {
            constant_time_dummy_compare(&candidate_digest);
            return Err(Phase7PersistenceErrorV1::RedemptionRejected);
        };
        let authorization = validate_stored_authorization(&transaction, authorization)?;
        if let Some(requester) = &authenticated_requester {
            authorize_phase7_redemption_actor(&authorization, requester)?;
        }
        let Some(operation) = select_operation_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.operation_id,
        )?
        else {
            constant_time_dummy_compare(&candidate_digest);
            return Err(Phase7PersistenceErrorV1::RedemptionRejected);
        };
        let operation = validate_stored_operation(&transaction, operation)?;
        if operation.authorization_id != authorization.authorization_id
            || operation.binding_digest != authorization.binding_digest
        {
            constant_time_dummy_compare(&candidate_digest);
            return Err(Phase7PersistenceErrorV1::RedemptionRejected);
        }

        let request_digest =
            redemption_request_digest(input, &authorization.binding_digest, &candidate_digest);
        if select_consumption_by_authorization_or_operation(
            &transaction,
            input.project_ref,
            input.authorization_id,
            input.operation_id,
        )?
        .is_some()
        {
            return Err(Phase7PersistenceErrorV1::RedemptionRejected);
        }
        validate_redemption_window_and_state(&authorization, &operation, &consumed_at)?;
        if !constant_time_equal(&authorization.capability_digest, &candidate_digest) {
            return Err(Phase7PersistenceErrorV1::RedemptionRejected);
        }

        let consumption_id = identifier(
            "cpc_",
            CONSUMPTION_ID_DOMAIN,
            &[
                authorization.authorization_id.as_bytes(),
                operation.operation_id.as_bytes(),
                &request_digest,
            ],
        );
        let audit_binding_id = identifier(
            "p7a_",
            CONSUMPTION_AUDIT_ID_DOMAIN,
            &[consumption_id.as_bytes()],
        );
        if phase7_entity_exists(&transaction, &consumption_id)?
            || audit_binding_exists(&transaction, &audit_binding_id)?
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        let consumption = StoredConsumption {
            consumption_id,
            audit_binding_id,
            project_ref: input.project_ref.to_owned(),
            resource_ref: input.resource_ref.to_owned(),
            authorization_id: input.authorization_id.to_owned(),
            operation_id: input.operation_id.to_owned(),
            binding_digest: authorization.binding_digest,
            capability_digest: candidate_digest,
            idempotency_key: input.idempotency_key.to_owned(),
            request_digest,
            consumed_at: consumed_at.clone(),
            stored_record_digest: [0; 32],
            entity_created_at: consumed_at.clone(),
            audit_event_kind: "capability_consumption_recorded".to_owned(),
            audit_authority_effect: "capability_consumed".to_owned(),
            audit_recorded_at: consumed_at.clone(),
        };
        let mut consumption = consumption;
        consumption.stored_record_digest = consumption_record_digest(&consumption);
        insert_consumption(&transaction, &consumption)?;
        let active_event = authorization
            .events
            .last()
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        insert_authorization_state_event(
            &transaction,
            &authorization,
            "consumed",
            &consumed_at,
            Some(active_event),
            Some(&consumption.consumption_id),
        )?;

        let reloaded = select_consumption_by_id(
            &transaction,
            &consumption.project_ref,
            &consumption.resource_ref,
            &consumption.consumption_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let reloaded = validate_stored_consumption(&transaction, reloaded)?;
        let record = consumption_public_record(&transaction, &reloaded)?;
        let hook_output = transaction_hook(&transaction, &record, &consumed_at)?;
        precommit()?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
        after_commit().map_err(|_| Phase7PersistenceErrorV1::OutcomeAmbiguous)?;
        Ok((
            Phase7CapabilityConsumptionWriteV1 {
                created: true,
                record,
            },
            Some(hook_output),
        ))
    }
}

pub(super) fn verify_phase7_consumption_records_v1(
    connection: &Connection,
) -> Result<(), SqliteStoreError> {
    let invalid_targets = connection
        .query_row(
            "SELECT count(*) FROM lnsat_phase7_state_events
             WHERE target_entity_kind NOT IN (
               'authorization_nonce',
               'execution_authorization',
               'operation',
               'operation_attempt'
             )",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    if invalid_targets != 0 {
        return Err(SqliteStoreError::MigrationDrift);
    }

    let authorization_ids = select_scoped_ids(
        connection,
        "lnsat_execution_authorizations",
        "authorization_id",
    )?;
    let operation_ids = select_scoped_ids(connection, "lnsat_operations", "operation_id")?;
    if authorization_ids.len() != operation_ids.len() {
        return Err(SqliteStoreError::MigrationDrift);
    }
    let mut validated_state_events = 0_i64;
    for (authorization_id, project_ref, resource_ref) in authorization_ids {
        let authorization =
            select_authorization_by_id(connection, &project_ref, &resource_ref, &authorization_id)
                .map_err(|_| SqliteStoreError::MigrationDrift)?
                .ok_or(SqliteStoreError::MigrationDrift)?;
        validated_state_events += i64::try_from(authorization.events.len())
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
        validate_stored_authorization(connection, authorization)
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
    }
    for (operation_id, project_ref, resource_ref) in operation_ids {
        let operation =
            select_operation_by_id(connection, &project_ref, &resource_ref, &operation_id)
                .map_err(|_| SqliteStoreError::MigrationDrift)?
                .ok_or(SqliteStoreError::MigrationDrift)?;
        validated_state_events +=
            i64::try_from(operation.events.len()).map_err(|_| SqliteStoreError::MigrationDrift)?;
        validate_stored_operation(connection, operation)
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
    }
    validated_state_events += connection
        .query_row(
            "SELECT count(*) FROM lnsat_phase7_state_events
             WHERE target_entity_kind = 'operation_attempt'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;

    let non_nonce_state_events = connection
        .query_row(
            "SELECT count(*) FROM lnsat_phase7_state_events
             WHERE target_entity_kind != 'authorization_nonce'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    if validated_state_events != non_nonce_state_events {
        return Err(SqliteStoreError::MigrationDrift);
    }

    for (consumption_id, project_ref, resource_ref) in select_scoped_ids(
        connection,
        "lnsat_capability_consumptions",
        "consumption_id",
    )? {
        let consumption =
            select_consumption_by_id(connection, &project_ref, &resource_ref, &consumption_id)
                .map_err(|_| SqliteStoreError::MigrationDrift)?
                .ok_or(SqliteStoreError::MigrationDrift)?;
        validate_stored_consumption(connection, consumption)
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
    }
    crate::phase7_git_adapter::verify_phase7_git_adapter_records_v1(connection)?;
    Ok(())
}

fn select_scoped_ids(
    connection: &Connection,
    table: &str,
    id_column: &str,
) -> Result<Vec<(String, String, String)>, SqliteStoreError> {
    let sql = format!(
        "SELECT {id_column}, project_ref, resource_ref
         FROM {table}
         ORDER BY {id_column}"
    );
    let mut statement = connection
        .prepare(&sql)
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)
}

fn select_authorization_by_id(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    authorization_id: &str,
) -> Result<Option<StoredAuthorization>, Phase7PersistenceErrorV1> {
    select_stored_authorization(
        connection,
        "authorization.project_ref = ?1
         AND authorization.resource_ref = ?2
         AND authorization.authorization_id = ?3",
        params![project_ref, resource_ref, authorization_id],
    )
}

fn select_authorization_by_attempt(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    authorization_attempt_id: &str,
) -> Result<Option<StoredAuthorization>, Phase7PersistenceErrorV1> {
    select_stored_authorization(
        connection,
        "authorization.project_ref = ?1
         AND authorization.resource_ref = ?2
         AND authorization.authorization_attempt_id = ?3",
        params![project_ref, resource_ref, authorization_attempt_id],
    )
}

fn select_authorization_by_approval_decision(
    connection: &Connection,
    approval_decision_id: &str,
) -> Result<Option<StoredAuthorization>, Phase7PersistenceErrorV1> {
    select_stored_authorization(
        connection,
        "authorization.approval_decision_id = ?1",
        [approval_decision_id],
    )
}

fn select_stored_authorization<P: rusqlite::Params>(
    connection: &Connection,
    predicate: &str,
    parameters: P,
) -> Result<Option<StoredAuthorization>, Phase7PersistenceErrorV1> {
    let sql = format!(
        "SELECT authorization.authorization_id,
                entity.audit_binding_id,
                authorization.project_ref,
                authorization.resource_ref,
                authorization.authorization_attempt_id,
                authorization.nonce_id,
                authorization.binding_digest,
                authorization.approval_decision_id,
                authorization.policy_decision_id,
                authorization.packet_id,
                authorization.packet_sha256,
                authorization.requester_ref,
                authorization.requester_session_ref,
                authorization.approver_ref,
                authorization.approver_session_ref,
                authorization.action_digest,
                authorization.target_digest,
                authorization.configuration_digest,
                authorization.adapter_ref,
                authorization.executable_digest,
                authorization.audience,
                authorization.capability_digest,
                authorization.authorization_profile,
                authorization.issued_at,
                authorization.expires_at,
                entity.record_digest,
                entity.created_at,
                audit.event_kind,
                audit.authority_effect,
                audit.recorded_at
         FROM lnsat_execution_authorizations AS authorization
         JOIN lnsat_phase7_entities AS entity
           ON entity.entity_id = authorization.authorization_id
          AND entity.entity_kind = authorization.entity_kind
          AND entity.project_ref = authorization.project_ref
          AND entity.resource_ref = authorization.resource_ref
         JOIN lnsat_phase7_audit_bindings AS audit
           ON audit.audit_binding_id = entity.audit_binding_id
          AND audit.record_id = entity.entity_id
          AND audit.record_family = entity.entity_kind
          AND audit.project_ref = entity.project_ref
          AND audit.resource_ref = entity.resource_ref
          AND audit.record_digest = entity.record_digest
         WHERE {predicate}"
    );
    let base = connection
        .query_row(&sql, parameters, |row| {
            Ok(StoredAuthorization {
                authorization_id: row.get(0)?,
                audit_binding_id: row.get(1)?,
                project_ref: row.get(2)?,
                resource_ref: row.get(3)?,
                authorization_attempt_id: row.get(4)?,
                nonce_id: row.get(5)?,
                binding_digest: blob_32(row.get(6)?)?,
                approval_decision_id: row.get(7)?,
                policy_decision_id: row.get(8)?,
                packet_id: row.get(9)?,
                packet_sha256: row.get(10)?,
                requester_ref: row.get(11)?,
                requester_session_ref: row.get(12)?,
                approver_ref: row.get(13)?,
                approver_session_ref: row.get(14)?,
                action_digest: blob_32(row.get(15)?)?,
                target_digest: blob_32(row.get(16)?)?,
                configuration_digest: blob_32(row.get(17)?)?,
                adapter_ref: row.get(18)?,
                executable_digest: blob_32(row.get(19)?)?,
                audience: row.get(20)?,
                capability_digest: blob_32(row.get(21)?)?,
                authorization_profile: row.get(22)?,
                issued_at: row.get(23)?,
                expires_at: row.get(24)?,
                stored_record_digest: blob_32(row.get(25)?)?,
                entity_created_at: row.get(26)?,
                audit_event_kind: row.get(27)?,
                audit_authority_effect: row.get(28)?,
                audit_recorded_at: row.get(29)?,
                events: Vec::new(),
            })
        })
        .optional()
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    let Some(mut authorization) = base else {
        return Ok(None);
    };
    authorization.events = select_state_events(connection, &authorization.authorization_id)?;
    Ok(Some(authorization))
}

fn select_operation_by_id(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    operation_id: &str,
) -> Result<Option<StoredOperation>, Phase7PersistenceErrorV1> {
    select_stored_operation(
        connection,
        "operation.project_ref = ?1
         AND operation.resource_ref = ?2
         AND operation.operation_id = ?3",
        params![project_ref, resource_ref, operation_id],
    )
}

fn select_operation_by_authorization(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    authorization_id: &str,
) -> Result<Option<StoredOperation>, Phase7PersistenceErrorV1> {
    select_stored_operation(
        connection,
        "operation.project_ref = ?1
         AND operation.resource_ref = ?2
         AND operation.authorization_id = ?3",
        params![project_ref, resource_ref, authorization_id],
    )
}

fn select_operation_by_idempotency(
    connection: &Connection,
    project_ref: &str,
    idempotency_key: &str,
) -> Result<Option<StoredOperation>, Phase7PersistenceErrorV1> {
    select_stored_operation(
        connection,
        "operation.project_ref = ?1
         AND operation.idempotency_key = ?2",
        params![project_ref, idempotency_key],
    )
}

fn select_stored_operation<P: rusqlite::Params>(
    connection: &Connection,
    predicate: &str,
    parameters: P,
) -> Result<Option<StoredOperation>, Phase7PersistenceErrorV1> {
    let sql = format!(
        "SELECT operation.operation_id,
                entity.audit_binding_id,
                operation.project_ref,
                operation.resource_ref,
                operation.authorization_id,
                operation.binding_digest,
                operation.idempotency_key,
                operation.request_digest,
                operation.requested_action_digest,
                operation.approved_action_digest,
                operation.authorized_action_digest,
                operation.target_digest,
                operation.configuration_digest,
                operation.adapter_ref,
                operation.executable_digest,
                operation.audience,
                operation.created_at,
                operation.expires_at,
                entity.record_digest,
                entity.created_at,
                audit.event_kind,
                audit.authority_effect,
                audit.recorded_at
         FROM lnsat_operations AS operation
         JOIN lnsat_phase7_entities AS entity
           ON entity.entity_id = operation.operation_id
          AND entity.entity_kind = operation.entity_kind
          AND entity.project_ref = operation.project_ref
          AND entity.resource_ref = operation.resource_ref
         JOIN lnsat_phase7_audit_bindings AS audit
           ON audit.audit_binding_id = entity.audit_binding_id
          AND audit.record_id = entity.entity_id
          AND audit.record_family = entity.entity_kind
          AND audit.project_ref = entity.project_ref
          AND audit.resource_ref = entity.resource_ref
          AND audit.record_digest = entity.record_digest
         WHERE {predicate}"
    );
    let base = connection
        .query_row(&sql, parameters, |row| {
            Ok(StoredOperation {
                operation_id: row.get(0)?,
                audit_binding_id: row.get(1)?,
                project_ref: row.get(2)?,
                resource_ref: row.get(3)?,
                authorization_id: row.get(4)?,
                binding_digest: blob_32(row.get(5)?)?,
                idempotency_key: row.get(6)?,
                request_digest: blob_32(row.get(7)?)?,
                requested_action_digest: blob_32(row.get(8)?)?,
                approved_action_digest: blob_32(row.get(9)?)?,
                authorized_action_digest: blob_32(row.get(10)?)?,
                target_digest: blob_32(row.get(11)?)?,
                configuration_digest: blob_32(row.get(12)?)?,
                adapter_ref: row.get(13)?,
                executable_digest: blob_32(row.get(14)?)?,
                audience: row.get(15)?,
                created_at: row.get(16)?,
                expires_at: row.get(17)?,
                stored_record_digest: blob_32(row.get(18)?)?,
                entity_created_at: row.get(19)?,
                audit_event_kind: row.get(20)?,
                audit_authority_effect: row.get(21)?,
                audit_recorded_at: row.get(22)?,
                events: Vec::new(),
            })
        })
        .optional()
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    let Some(mut operation) = base else {
        return Ok(None);
    };
    operation.events = select_state_events(connection, &operation.operation_id)?;
    Ok(Some(operation))
}

fn authorization_capability_digest_exists(
    connection: &Connection,
    project_ref: &str,
    capability_digest: &[u8; 32],
) -> Result<bool, Phase7PersistenceErrorV1> {
    connection
        .query_row(
            "SELECT EXISTS (
               SELECT 1 FROM lnsat_execution_authorizations
               WHERE project_ref = ?1 AND capability_digest = ?2
             )",
            params![project_ref, capability_digest.as_slice()],
            |row| row.get::<_, bool>(0),
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

fn select_consumption_by_id(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    consumption_id: &str,
) -> Result<Option<StoredConsumption>, Phase7PersistenceErrorV1> {
    select_stored_consumption(
        connection,
        "consumption.project_ref = ?1
         AND consumption.resource_ref = ?2
         AND consumption.consumption_id = ?3",
        params![project_ref, resource_ref, consumption_id],
    )
}

fn select_consumption_by_idempotency(
    connection: &Connection,
    project_ref: &str,
    idempotency_key: &str,
) -> Result<Option<StoredConsumption>, Phase7PersistenceErrorV1> {
    select_stored_consumption(
        connection,
        "consumption.project_ref = ?1
         AND consumption.idempotency_key = ?2",
        params![project_ref, idempotency_key],
    )
}

fn select_consumption_by_authorization_or_operation(
    connection: &Connection,
    project_ref: &str,
    authorization_id: &str,
    operation_id: &str,
) -> Result<Option<StoredConsumption>, Phase7PersistenceErrorV1> {
    select_stored_consumption(
        connection,
        "consumption.project_ref = ?1
         AND (
           consumption.authorization_id = ?2
           OR consumption.operation_id = ?3
         )",
        params![project_ref, authorization_id, operation_id],
    )
}

fn select_stored_consumption<P: rusqlite::Params>(
    connection: &Connection,
    predicate: &str,
    parameters: P,
) -> Result<Option<StoredConsumption>, Phase7PersistenceErrorV1> {
    let sql = format!(
        "SELECT consumption.consumption_id,
                entity.audit_binding_id,
                consumption.project_ref,
                consumption.resource_ref,
                consumption.authorization_id,
                consumption.operation_id,
                consumption.binding_digest,
                consumption.capability_digest,
                consumption.idempotency_key,
                consumption.request_digest,
                consumption.consumed_at,
                entity.record_digest,
                entity.created_at,
                audit.event_kind,
                audit.authority_effect,
                audit.recorded_at
         FROM lnsat_capability_consumptions AS consumption
         JOIN lnsat_phase7_entities AS entity
           ON entity.entity_id = consumption.consumption_id
          AND entity.entity_kind = consumption.entity_kind
          AND entity.project_ref = consumption.project_ref
          AND entity.resource_ref = consumption.resource_ref
         JOIN lnsat_phase7_audit_bindings AS audit
           ON audit.audit_binding_id = entity.audit_binding_id
          AND audit.record_id = entity.entity_id
          AND audit.record_family = entity.entity_kind
          AND audit.project_ref = entity.project_ref
          AND audit.resource_ref = entity.resource_ref
          AND audit.record_digest = entity.record_digest
         WHERE {predicate}"
    );
    connection
        .query_row(&sql, parameters, |row| {
            Ok(StoredConsumption {
                consumption_id: row.get(0)?,
                audit_binding_id: row.get(1)?,
                project_ref: row.get(2)?,
                resource_ref: row.get(3)?,
                authorization_id: row.get(4)?,
                operation_id: row.get(5)?,
                binding_digest: blob_32(row.get(6)?)?,
                capability_digest: blob_32(row.get(7)?)?,
                idempotency_key: row.get(8)?,
                request_digest: blob_32(row.get(9)?)?,
                consumed_at: row.get(10)?,
                stored_record_digest: blob_32(row.get(11)?)?,
                entity_created_at: row.get(12)?,
                audit_event_kind: row.get(13)?,
                audit_authority_effect: row.get(14)?,
                audit_recorded_at: row.get(15)?,
            })
        })
        .optional()
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

fn select_state_events(
    connection: &Connection,
    target_entity_id: &str,
) -> Result<Vec<StoredStateEvent>, Phase7PersistenceErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT event.state_event_id,
                    entity.audit_binding_id,
                    event.project_ref,
                    event.resource_ref,
                    event.target_entity_id,
                    event.target_entity_kind,
                    event.state_sequence,
                    event.state,
                    event.prior_state_event_id,
                    event.prior_state_sequence,
                    event.effective_at,
                    event.state_digest,
                    entity.record_digest,
                    entity.created_at,
                    audit.event_kind,
                    audit.authority_effect,
                    audit.recorded_at
             FROM lnsat_phase7_state_events AS event
             JOIN lnsat_phase7_entities AS entity
               ON entity.entity_id = event.state_event_id
              AND entity.entity_kind = event.entity_kind
              AND entity.project_ref = event.project_ref
              AND entity.resource_ref = event.resource_ref
             JOIN lnsat_phase7_audit_bindings AS audit
               ON audit.audit_binding_id = entity.audit_binding_id
              AND audit.record_id = entity.entity_id
              AND audit.record_family = entity.entity_kind
              AND audit.project_ref = entity.project_ref
              AND audit.resource_ref = entity.resource_ref
              AND audit.record_digest = entity.record_digest
             WHERE event.target_entity_id = ?1
             ORDER BY event.state_sequence",
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    statement
        .query_map([target_entity_id], |row| {
            Ok(StoredStateEvent {
                state_event_id: row.get(0)?,
                audit_binding_id: row.get(1)?,
                project_ref: row.get(2)?,
                resource_ref: row.get(3)?,
                target_entity_id: row.get(4)?,
                target_entity_kind: row.get(5)?,
                state_sequence: row.get(6)?,
                state: row.get(7)?,
                prior_state_event_id: row.get(8)?,
                prior_state_sequence: row.get(9)?,
                effective_at: row.get(10)?,
                state_digest: blob_32(row.get(11)?)?,
                stored_record_digest: blob_32(row.get(12)?)?,
                entity_created_at: row.get(13)?,
                audit_event_kind: row.get(14)?,
                audit_authority_effect: row.get(15)?,
                audit_recorded_at: row.get(16)?,
            })
        })
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

fn consumption_id_for_authorization(
    connection: &Connection,
    authorization_id: &str,
) -> Result<Option<String>, Phase7PersistenceErrorV1> {
    connection
        .query_row(
            "SELECT consumption_id FROM lnsat_capability_consumptions
             WHERE authorization_id = ?1",
            [authorization_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

fn validate_authorization_issue_input(
    input: &Phase7ExecutionAuthorizationIssueInputV1<'_>,
) -> Result<(), Phase7PersistenceErrorV1> {
    if !bounded_reference(input.project_ref)
        || !is_valid_reference_v1(input.project_ref)
        || !bounded_reference(input.resource_ref)
        || !is_valid_reference_v1(input.resource_ref)
        || !valid_prefixed_id(input.authorization_attempt_id, "aat_")
        || !valid_prefixed_id(input.nonce_id, "non_")
        || !bounded_reference(input.operation_idempotency_key)
    {
        return Err(Phase7PersistenceErrorV1::InvalidInput);
    }
    Ok(())
}

fn validate_authorization_scope(
    project_ref: &str,
    resource_ref: &str,
    authorization_id: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    if !bounded_reference(project_ref)
        || !is_valid_reference_v1(project_ref)
        || !bounded_reference(resource_ref)
        || !is_valid_reference_v1(resource_ref)
        || !valid_prefixed_id(authorization_id, "xau_")
    {
        return Err(Phase7PersistenceErrorV1::InvalidInput);
    }
    Ok(())
}

fn validate_authorization_ttl_window(
    issued_at: &str,
    ttl_expires_at: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    let issued = canonical_utc_timestamp_millis_v1(issued_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let expires = canonical_utc_timestamp_millis_v1(ttl_expires_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    if expires.checked_sub(issued) != Some(PHASE7_AUTHORIZATION_TTL_MILLIS_V1) {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    Ok(())
}

fn local_session_ref(session_id: &str) -> String {
    format!("{LOCAL_SESSION_REF_PREFIX_V1}{session_id}")
}

fn authenticate_phase7_local_session(
    connection: &Connection,
    raw_session_token: &str,
    raw_csrf_token: Option<&str>,
    checked_at: &str,
) -> Result<ValidatedPhase7Session, Phase7PersistenceErrorV1> {
    let verified = verify_and_touch_local_session_on_connection_v1(
        connection,
        raw_session_token,
        raw_csrf_token,
        checked_at,
        LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
    )
    .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    };
    let active_until_millis = phase7_session_active_until_millis(
        &activity.session,
        &activity.last_activity_at,
        checked_at,
    )?;
    Ok(ValidatedPhase7Session {
        session: activity.session,
        active_until_millis,
    })
}

fn validate_phase7_session_reference(
    connection: &Connection,
    identity_ref: &str,
    session_ref: &str,
    checked_at: &str,
) -> Result<ValidatedPhase7Session, Phase7PersistenceErrorV1> {
    let session_id = session_ref
        .strip_prefix(LOCAL_SESSION_REF_PREFIX_V1)
        .filter(|value| is_local_session_id_v1(value))
        .ok_or(Phase7PersistenceErrorV1::SourceNotApproved)?;
    let stored = select_local_session_v1(connection, session_id)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?
        .ok_or(Phase7PersistenceErrorV1::SourceNotApproved)?;
    let session = decode_local_session_v1(connection, &stored)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    let identity = select_local_identity_v1(connection, identity_ref)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    if session.identity_ref != identity_ref
        || identity.status != LocalIdentityStatusV1::Active
        || identity.role != session.role
    {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    let checked = canonical_utc_timestamp_millis_v1(checked_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let issued = canonical_millis(&session.issued_at)?;
    let expires = canonical_millis(&session.expires_at)?;
    if checked < issued {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    if checked >= expires {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    if let Some(revocation) = select_local_session_revocation_v1(connection, session_id)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?
    {
        validate_local_session_revocation_v1(&revocation, &session)
            .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    let activity = select_local_session_activity_v1(connection, session_id)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    validate_local_session_activity_v1(&session, &activity)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    let last_activity_at = activity
        .last()
        .map_or(session.issued_at.as_str(), |row| row.observed_at.as_str());
    let active_until_millis =
        phase7_session_active_until_millis(&session, last_activity_at, checked_at)?;
    Ok(ValidatedPhase7Session {
        session,
        active_until_millis,
    })
}

fn phase7_session_active_until_millis(
    session: &LocalSessionRecordV1,
    last_activity_at: &str,
    checked_at: &str,
) -> Result<u64, Phase7PersistenceErrorV1> {
    let checked = canonical_utc_timestamp_millis_v1(checked_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let last_activity = canonical_millis(last_activity_at)?;
    if checked < last_activity {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    let idle_timeout_millis = u64::from(LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1)
        .checked_mul(1_000)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let idle_expires = last_activity
        .checked_add(idle_timeout_millis)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let absolute_expires = canonical_millis(&session.expires_at)?;
    let active_until = idle_expires.min(absolute_expires);
    if checked >= active_until {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    Ok(active_until)
}

fn validate_authorization_source_window(
    attempt: &Phase7AuthorizationAttemptRecordV1,
    nonce: &crate::Phase7AuthorizationNonceRecordV1,
    issued_at: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    let issued = canonical_utc_timestamp_millis_v1(issued_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let attempt_requested = canonical_millis(&attempt.requested_at)?;
    let attempt_expires = canonical_millis(&attempt.expires_at)?;
    let nonce_issued = canonical_millis(&nonce.issued_at)?;
    let nonce_expires = canonical_millis(&nonce.expires_at)?;
    if issued < attempt_requested || issued < nonce_issued {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    if issued >= attempt_expires
        || issued >= nonce_expires
        || nonce.state != "active"
        || !nonce.active
    {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn effective_authorization_expiry(
    issued_at: &str,
    ttl_expires_at: &str,
    attempt_expires_at: &str,
    nonce_expires_at: &str,
    requester_expires_at: &str,
    approver_expires_at: &str,
    requester_active_until_millis: u64,
    approver_active_until_millis: u64,
) -> Result<String, Phase7PersistenceErrorV1> {
    let issued = canonical_utc_timestamp_millis_v1(issued_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let mut selected = ttl_expires_at.to_owned();
    let mut selected_millis = canonical_utc_timestamp_millis_v1(ttl_expires_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    for candidate in [
        attempt_expires_at,
        nonce_expires_at,
        requester_expires_at,
        approver_expires_at,
    ] {
        let candidate_millis = canonical_millis(candidate)?;
        if candidate_millis < selected_millis {
            candidate.clone_into(&mut selected);
            selected_millis = candidate_millis;
        }
    }
    for active_until_millis in [requester_active_until_millis, approver_active_until_millis] {
        if active_until_millis < selected_millis {
            selected = canonical_timestamp_from_comparison_millis(active_until_millis)?;
            selected_millis = active_until_millis;
        }
    }
    if selected_millis <= issued {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    Ok(selected)
}

fn canonical_timestamp_from_comparison_millis(
    comparison_millis: u64,
) -> Result<String, Phase7PersistenceErrorV1> {
    let unix_epoch_comparison = canonical_utc_timestamp_millis_v1("1970-01-01T00:00:00.000Z")
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let unix_millis = comparison_millis
        .checked_sub(unix_epoch_comparison)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let value = UNIX_EPOCH
        .checked_add(Duration::from_millis(unix_millis))
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    canonical_system_time_v1(value)
}

fn authorize_phase7_transition_actor(
    authorization: &StoredAuthorization,
    actor: &ValidatedPhase7Session,
    kind: AuthorizationTransitionKind,
) -> Result<(), Phase7PersistenceErrorV1> {
    let actor_ref = &actor.session.identity_ref;
    let actor_session_ref = local_session_ref(&actor.session.session_id);
    let allowed = match kind {
        AuthorizationTransitionKind::Cancelled => {
            actor_ref == &authorization.requester_ref
                && actor_session_ref == authorization.requester_session_ref
                && actor
                    .session
                    .role
                    .allows_control(LocalControlPermissionV1::RequestAction)
        }
        AuthorizationTransitionKind::Revoked => {
            actor.session.role == LocalIdentityRoleV1::Owner
                || (actor_ref == &authorization.approver_ref
                    && actor_session_ref == authorization.approver_session_ref
                    && actor
                        .session
                        .role
                        .allows_control(LocalControlPermissionV1::DecideApproval))
        }
    };
    if !allowed {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    Ok(())
}

fn authorize_phase7_redemption_actor(
    authorization: &StoredAuthorization,
    actor: &ValidatedPhase7Session,
) -> Result<(), Phase7PersistenceErrorV1> {
    if actor.session.identity_ref != authorization.requester_ref
        || local_session_ref(&actor.session.session_id) != authorization.requester_session_ref
        || !actor
            .session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
    {
        return Err(Phase7PersistenceErrorV1::RedemptionRejected);
    }
    Ok(())
}

fn materialize_authorization_expiry_if_needed(
    transaction: &Transaction<'_>,
    authorization: StoredAuthorization,
    checked_at: &str,
) -> Result<(StoredAuthorization, bool), Phase7PersistenceErrorV1> {
    let checked = canonical_utc_timestamp_millis_v1(checked_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let issued = canonical_millis(&authorization.issued_at)?;
    let latest = authorization
        .events
        .last()
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let latest_at = canonical_millis(&latest.effective_at)?;
    if checked < issued || checked < latest_at {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    let expires = canonical_millis(&authorization.expires_at)?;
    if latest.state != "active" || checked < expires {
        return Ok((authorization, false));
    }
    insert_authorization_state_event(
        transaction,
        &authorization,
        "expired",
        &authorization.expires_at,
        Some(latest),
        None,
    )?;
    let reloaded = select_authorization_by_id(
        transaction,
        &authorization.project_ref,
        &authorization.resource_ref,
        &authorization.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    Ok((validate_stored_authorization(transaction, reloaded)?, true))
}

fn authorization_public_record(
    authorization: &StoredAuthorization,
    operation: &StoredOperation,
    checked_at: &str,
) -> Result<Phase7ExecutionAuthorizationRecordV1, Phase7PersistenceErrorV1> {
    if operation.authorization_id != authorization.authorization_id
        || operation.binding_digest != authorization.binding_digest
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let checked = canonical_utc_timestamp_millis_v1(checked_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let expires = canonical_millis(&authorization.expires_at)?;
    let latest = authorization
        .events
        .last()
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let state_sequence = u32::try_from(latest.state_sequence)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    Ok(Phase7ExecutionAuthorizationRecordV1 {
        authorization_id: authorization.authorization_id.clone(),
        audit_binding_id: authorization.audit_binding_id.clone(),
        project_ref: authorization.project_ref.clone(),
        resource_ref: authorization.resource_ref.clone(),
        authorization_attempt_id: authorization.authorization_attempt_id.clone(),
        nonce_id: authorization.nonce_id.clone(),
        binding_digest: authorization.binding_digest,
        approval_decision_id: authorization.approval_decision_id.clone(),
        policy_decision_id: authorization.policy_decision_id.clone(),
        packet_id: authorization.packet_id.clone(),
        packet_sha256: authorization.packet_sha256.clone(),
        requester_ref: authorization.requester_ref.clone(),
        requester_session_ref: authorization.requester_session_ref.clone(),
        approver_ref: authorization.approver_ref.clone(),
        approver_session_ref: authorization.approver_session_ref.clone(),
        action_digest: authorization.action_digest,
        target_digest: authorization.target_digest,
        configuration_digest: authorization.configuration_digest,
        adapter_ref: authorization.adapter_ref.clone(),
        executable_digest: authorization.executable_digest,
        audience: authorization.audience.clone(),
        authorization_profile: authorization.authorization_profile.clone(),
        issued_at: authorization.issued_at.clone(),
        expires_at: authorization.expires_at.clone(),
        state_event_id: latest.state_event_id.clone(),
        state_audit_binding_id: latest.audit_binding_id.clone(),
        state_sequence,
        state: latest.state.clone(),
        state_effective_at: latest.effective_at.clone(),
        active: latest.state == "active" && checked < expires,
        operation_id: operation.operation_id.clone(),
        operation_audit_binding_id: operation.audit_binding_id.clone(),
        operation_idempotency_key: operation.idempotency_key.clone(),
        operation_request_digest: operation.request_digest,
    })
}

#[allow(clippy::too_many_arguments, clippy::too_many_lines)]
fn insert_authorization_and_operation(
    transaction: &Transaction<'_>,
    input: &Phase7ExecutionAuthorizationIssueInputV1<'_>,
    attempt: &Phase7AuthorizationAttemptRecordV1,
    nonce: &crate::Phase7AuthorizationNonceRecordV1,
    capability_digest: &[u8; 32],
    issued_at: &str,
    expires_at: &str,
) -> Result<(StoredAuthorization, StoredOperation), Phase7PersistenceErrorV1> {
    if nonce.state != "active" || !nonce.active {
        return Err(Phase7PersistenceErrorV1::SourceNotApproved);
    }
    let authorization_id = identifier(
        "xau_",
        AUTHORIZATION_ID_DOMAIN,
        &[
            attempt.authorization_attempt_id.as_bytes(),
            nonce.nonce_id.as_bytes(),
            capability_digest,
        ],
    );
    let authorization_audit_id = identifier(
        "p7a_",
        AUTHORIZATION_AUDIT_ID_DOMAIN,
        &[authorization_id.as_bytes()],
    );
    let mut authorization = StoredAuthorization {
        authorization_id,
        audit_binding_id: authorization_audit_id,
        project_ref: input.project_ref.to_owned(),
        resource_ref: input.resource_ref.to_owned(),
        authorization_attempt_id: attempt.authorization_attempt_id.clone(),
        nonce_id: nonce.nonce_id.clone(),
        binding_digest: attempt.binding_digest,
        approval_decision_id: attempt.approval_decision_id.clone(),
        policy_decision_id: attempt.policy_decision_id.clone(),
        packet_id: attempt.packet_id.clone(),
        packet_sha256: attempt.packet_sha256.clone(),
        requester_ref: attempt.requester_ref.clone(),
        requester_session_ref: attempt.requester_session_ref.clone(),
        approver_ref: attempt.approver_ref.clone(),
        approver_session_ref: attempt.approver_session_ref.clone(),
        action_digest: attempt.action_digest,
        target_digest: attempt.target_digest,
        configuration_digest: attempt.configuration_digest,
        adapter_ref: attempt.adapter_ref.clone(),
        executable_digest: attempt.executable_digest,
        audience: attempt.audience.clone(),
        capability_digest: *capability_digest,
        authorization_profile: AUTHORIZATION_PROFILE.to_owned(),
        issued_at: issued_at.to_owned(),
        expires_at: expires_at.to_owned(),
        stored_record_digest: [0; 32],
        entity_created_at: issued_at.to_owned(),
        audit_event_kind: "persistence_prepared".to_owned(),
        audit_authority_effect: "none".to_owned(),
        audit_recorded_at: issued_at.to_owned(),
        events: Vec::new(),
    };
    validate_authorization_window(&authorization, attempt, &nonce.issued_at, &nonce.expires_at)?;
    authorization.stored_record_digest = authorization_record_digest(&authorization);
    if phase7_entity_exists(transaction, &authorization.authorization_id)?
        || audit_binding_exists(transaction, &authorization.audit_binding_id)?
    {
        return Err(Phase7PersistenceErrorV1::IdentityConflict);
    }
    insert_entity_and_audit(
        transaction,
        &authorization.authorization_id,
        "execution_authorization",
        &authorization.project_ref,
        &authorization.resource_ref,
        &authorization.audit_binding_id,
        &authorization.stored_record_digest,
        "persistence_prepared",
        "none",
        &authorization.issued_at,
    )?;
    transaction
        .execute(
            "INSERT INTO lnsat_execution_authorizations (
                authorization_id, entity_kind, project_ref, resource_ref,
                authorization_attempt_id, nonce_id, binding_digest,
                approval_decision_id, policy_decision_id, packet_id,
                packet_sha256, requester_ref, requester_session_ref,
                approver_ref, approver_session_ref, action_digest,
                target_digest, configuration_digest, adapter_ref,
                executable_digest, audience, capability_digest,
                authorization_profile, issued_at, expires_at
             ) VALUES (
                ?1, 'execution_authorization', ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
                ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24
             )",
            params![
                &authorization.authorization_id,
                &authorization.project_ref,
                &authorization.resource_ref,
                &authorization.authorization_attempt_id,
                &authorization.nonce_id,
                authorization.binding_digest.as_slice(),
                &authorization.approval_decision_id,
                &authorization.policy_decision_id,
                &authorization.packet_id,
                &authorization.packet_sha256,
                &authorization.requester_ref,
                &authorization.requester_session_ref,
                &authorization.approver_ref,
                &authorization.approver_session_ref,
                authorization.action_digest.as_slice(),
                authorization.target_digest.as_slice(),
                authorization.configuration_digest.as_slice(),
                &authorization.adapter_ref,
                authorization.executable_digest.as_slice(),
                &authorization.audience,
                authorization.capability_digest.as_slice(),
                &authorization.authorization_profile,
                &authorization.issued_at,
                &authorization.expires_at,
            ],
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    insert_authorization_state_event(
        transaction,
        &authorization,
        "active",
        &authorization.issued_at,
        None,
        None,
    )?;

    let mut operation = StoredOperation {
        operation_id: String::new(),
        audit_binding_id: String::new(),
        project_ref: authorization.project_ref.clone(),
        resource_ref: authorization.resource_ref.clone(),
        authorization_id: authorization.authorization_id.clone(),
        binding_digest: authorization.binding_digest,
        idempotency_key: input.operation_idempotency_key.to_owned(),
        request_digest: [0; 32],
        requested_action_digest: authorization.action_digest,
        approved_action_digest: authorization.action_digest,
        authorized_action_digest: authorization.action_digest,
        target_digest: authorization.target_digest,
        configuration_digest: authorization.configuration_digest,
        adapter_ref: authorization.adapter_ref.clone(),
        executable_digest: authorization.executable_digest,
        audience: authorization.audience.clone(),
        created_at: authorization.issued_at.clone(),
        expires_at: authorization.expires_at.clone(),
        stored_record_digest: [0; 32],
        entity_created_at: authorization.issued_at.clone(),
        audit_event_kind: "persistence_prepared".to_owned(),
        audit_authority_effect: "none".to_owned(),
        audit_recorded_at: authorization.issued_at.clone(),
        events: Vec::new(),
    };
    operation.request_digest = operation_request_digest(&operation);
    operation.operation_id = identifier("opn_", OPERATION_ID_DOMAIN, &[&operation.request_digest]);
    operation.audit_binding_id = identifier(
        "p7a_",
        OPERATION_AUDIT_ID_DOMAIN,
        &[operation.operation_id.as_bytes()],
    );
    operation.stored_record_digest = operation_record_digest(&operation);
    if phase7_entity_exists(transaction, &operation.operation_id)?
        || audit_binding_exists(transaction, &operation.audit_binding_id)?
    {
        return Err(Phase7PersistenceErrorV1::IdentityConflict);
    }
    insert_entity_and_audit(
        transaction,
        &operation.operation_id,
        "operation",
        &operation.project_ref,
        &operation.resource_ref,
        &operation.audit_binding_id,
        &operation.stored_record_digest,
        "persistence_prepared",
        "none",
        &operation.created_at,
    )?;
    transaction
        .execute(
            "INSERT INTO lnsat_operations (
                operation_id, entity_kind, project_ref, resource_ref,
                authorization_id, binding_digest, idempotency_key,
                request_digest, requested_action_digest,
                approved_action_digest, authorized_action_digest,
                target_digest, configuration_digest, adapter_ref,
                executable_digest, audience, created_at, expires_at
             ) VALUES (
                ?1, 'operation', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17
             )",
            params![
                &operation.operation_id,
                &operation.project_ref,
                &operation.resource_ref,
                &operation.authorization_id,
                operation.binding_digest.as_slice(),
                &operation.idempotency_key,
                operation.request_digest.as_slice(),
                operation.requested_action_digest.as_slice(),
                operation.approved_action_digest.as_slice(),
                operation.authorized_action_digest.as_slice(),
                operation.target_digest.as_slice(),
                operation.configuration_digest.as_slice(),
                &operation.adapter_ref,
                operation.executable_digest.as_slice(),
                &operation.audience,
                &operation.created_at,
                &operation.expires_at,
            ],
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    insert_operation_state_event(transaction, &operation)?;

    let stored_authorization = select_authorization_by_id(
        transaction,
        &authorization.project_ref,
        &authorization.resource_ref,
        &authorization.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let stored_authorization = validate_stored_authorization(transaction, stored_authorization)?;
    let stored_operation = select_operation_by_id(
        transaction,
        &operation.project_ref,
        &operation.resource_ref,
        &operation.operation_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let stored_operation = validate_stored_operation(transaction, stored_operation)?;
    Ok((stored_authorization, stored_operation))
}

#[allow(clippy::too_many_lines)]
fn validate_stored_authorization(
    connection: &Connection,
    authorization: StoredAuthorization,
) -> Result<StoredAuthorization, Phase7PersistenceErrorV1> {
    if !valid_prefixed_id(&authorization.authorization_id, "xau_")
        || !valid_prefixed_id(&authorization.audit_binding_id, "p7a_")
        || !valid_prefixed_id(&authorization.authorization_attempt_id, "aat_")
        || !valid_prefixed_id(&authorization.nonce_id, "non_")
        || authorization.authorization_profile != AUTHORIZATION_PROFILE
        || authorization.entity_created_at != authorization.issued_at
        || authorization.audit_event_kind != "persistence_prepared"
        || authorization.audit_authority_effect != "none"
        || authorization.audit_recorded_at != authorization.issued_at
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let attempt = read_validated_attempt_by_id(
        connection,
        &authorization.project_ref,
        &authorization.resource_ref,
        &authorization.authorization_attempt_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let nonce = read_validated_nonce_by_id(
        connection,
        &authorization.project_ref,
        &authorization.resource_ref,
        &authorization.nonce_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    if nonce.authorization_attempt_id != attempt.authorization_attempt_id
        || nonce.binding_digest != attempt.binding_digest
        || authorization.binding_digest != attempt.binding_digest
        || authorization.approval_decision_id != attempt.approval_decision_id
        || authorization.policy_decision_id != attempt.policy_decision_id
        || authorization.packet_id != attempt.packet_id
        || authorization.packet_sha256 != attempt.packet_sha256
        || authorization.requester_ref != attempt.requester_ref
        || authorization.requester_session_ref != attempt.requester_session_ref
        || authorization.approver_ref != attempt.approver_ref
        || authorization.approver_session_ref != attempt.approver_session_ref
        || authorization.action_digest != attempt.action_digest
        || authorization.target_digest != attempt.target_digest
        || authorization.configuration_digest != attempt.configuration_digest
        || authorization.adapter_ref != attempt.adapter_ref
        || authorization.executable_digest != attempt.executable_digest
        || authorization.audience != attempt.audience
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    validate_authorization_window(
        &authorization,
        &attempt,
        &nonce.issued_at,
        &nonce.expires_at,
    )?;
    if nonce.state != "active"
        && canonical_millis(&nonce.state_effective_at)?
            <= canonical_millis(&authorization.issued_at)?
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let expected_authorization_id = identifier(
        "xau_",
        AUTHORIZATION_ID_DOMAIN,
        &[
            authorization.authorization_attempt_id.as_bytes(),
            authorization.nonce_id.as_bytes(),
            &authorization.capability_digest,
        ],
    );
    let expected_audit_binding_id = identifier(
        "p7a_",
        AUTHORIZATION_AUDIT_ID_DOMAIN,
        &[authorization.authorization_id.as_bytes()],
    );
    if authorization.authorization_id != expected_authorization_id
        || authorization.audit_binding_id != expected_audit_binding_id
        || authorization_record_digest(&authorization) != authorization.stored_record_digest
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    validate_authorization_events(connection, &authorization)?;
    Ok(authorization)
}

fn validate_authorization_window(
    authorization: &StoredAuthorization,
    attempt: &Phase7AuthorizationAttemptRecordV1,
    nonce_issued_at: &str,
    nonce_expires_at: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    let issued = canonical_millis(&authorization.issued_at)?;
    let expires = canonical_millis(&authorization.expires_at)?;
    let attempt_requested = canonical_millis(&attempt.requested_at)?;
    let attempt_expires = canonical_millis(&attempt.expires_at)?;
    let nonce_issued = canonical_millis(nonce_issued_at)?;
    let nonce_expires = canonical_millis(nonce_expires_at)?;
    if issued < attempt_requested
        || issued < nonce_issued
        || issued >= nonce_expires
        || expires <= issued
        || expires > attempt_expires
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn validate_authorization_events(
    connection: &Connection,
    authorization: &StoredAuthorization,
) -> Result<(), Phase7PersistenceErrorV1> {
    if !(authorization.events.len() == 1 || authorization.events.len() == 2) {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let first = &authorization.events[0];
    if first.state != "active"
        || first.state_sequence != 1
        || first.prior_state_event_id.is_some()
        || first.prior_state_sequence.is_some()
        || first.effective_at != authorization.issued_at
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    validate_authorization_event(authorization, first, None)?;
    let linked_consumption =
        consumption_id_for_authorization(connection, &authorization.authorization_id)?;
    if let Some(terminal) = authorization.events.get(1) {
        if terminal.state_sequence != 2
            || terminal.prior_state_event_id.as_deref() != Some(first.state_event_id.as_str())
            || terminal.prior_state_sequence != Some(1)
            || !matches!(
                terminal.state.as_str(),
                "cancelled" | "revoked" | "expired" | "consumed"
            )
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        let terminal_millis = canonical_millis(&terminal.effective_at)?;
        let issued = canonical_millis(&authorization.issued_at)?;
        let expires = canonical_millis(&authorization.expires_at)?;
        if terminal_millis < issued
            || (terminal.state == "expired" && terminal.effective_at != authorization.expires_at)
            || (terminal.state != "expired" && terminal_millis >= expires)
            || (terminal.state == "consumed") != linked_consumption.is_some()
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        validate_authorization_event(authorization, terminal, linked_consumption.as_deref())?;
    } else if linked_consumption.is_some() {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn validate_authorization_event(
    authorization: &StoredAuthorization,
    event: &StoredStateEvent,
    consumption_id: Option<&str>,
) -> Result<(), Phase7PersistenceErrorV1> {
    let expected_event_id = authorization_state_event_id(
        authorization,
        &event.state,
        event.state_sequence,
        &event.effective_at,
        consumption_id,
    );
    let expected_audit_id = identifier(
        "p7a_",
        AUTHORIZATION_STATE_AUDIT_ID_DOMAIN,
        &[expected_event_id.as_bytes()],
    );
    let expected_effect = match event.state.as_str() {
        "active" => "authorization_active",
        "consumed" => "capability_consumed",
        _ => "none",
    };
    if event.state_event_id != expected_event_id
        || event.audit_binding_id != expected_audit_id
        || event.project_ref != authorization.project_ref
        || event.resource_ref != authorization.resource_ref
        || event.target_entity_id != authorization.authorization_id
        || event.target_entity_kind != "execution_authorization"
        || event.entity_created_at != event.effective_at
        || event.audit_event_kind != "authorization_state_recorded"
        || event.audit_authority_effect != expected_effect
        || event.audit_recorded_at != event.effective_at
        || authorization_state_digest(authorization, event, consumption_id) != event.state_digest
        || state_record_digest(event) != event.stored_record_digest
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(())
}

#[allow(clippy::too_many_lines)]
fn validate_stored_operation(
    connection: &Connection,
    operation: StoredOperation,
) -> Result<StoredOperation, Phase7PersistenceErrorV1> {
    if !valid_prefixed_id(&operation.operation_id, "opn_")
        || !valid_prefixed_id(&operation.audit_binding_id, "p7a_")
        || !bounded_reference(&operation.idempotency_key)
        || operation.entity_created_at != operation.created_at
        || operation.audit_event_kind != "persistence_prepared"
        || operation.audit_authority_effect != "none"
        || operation.audit_recorded_at != operation.created_at
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let authorization = select_authorization_by_id(
        connection,
        &operation.project_ref,
        &operation.resource_ref,
        &operation.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let authorization = validate_stored_authorization(connection, authorization)?;
    if operation.binding_digest != authorization.binding_digest
        || operation.requested_action_digest != authorization.action_digest
        || operation.approved_action_digest != authorization.action_digest
        || operation.authorized_action_digest != authorization.action_digest
        || operation.target_digest != authorization.target_digest
        || operation.configuration_digest != authorization.configuration_digest
        || operation.adapter_ref != authorization.adapter_ref
        || operation.executable_digest != authorization.executable_digest
        || operation.audience != authorization.audience
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let created = canonical_millis(&operation.created_at)?;
    let expires = canonical_millis(&operation.expires_at)?;
    let authorization_issued = canonical_millis(&authorization.issued_at)?;
    let authorization_expires = canonical_millis(&authorization.expires_at)?;
    if created < authorization_issued
        || created >= authorization_expires
        || expires <= created
        || expires > authorization_expires
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let expected_request_digest = operation_request_digest(&operation);
    let expected_operation_id =
        identifier("opn_", OPERATION_ID_DOMAIN, &[&expected_request_digest]);
    let expected_audit_id = identifier(
        "p7a_",
        OPERATION_AUDIT_ID_DOMAIN,
        &[operation.operation_id.as_bytes()],
    );
    if operation.request_digest != expected_request_digest
        || operation.operation_id != expected_operation_id
        || operation.audit_binding_id != expected_audit_id
        || operation_record_digest(&operation) != operation.stored_record_digest
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    validate_operation_events(&operation)?;
    Ok(operation)
}

fn validate_operation_events(operation: &StoredOperation) -> Result<(), Phase7PersistenceErrorV1> {
    if operation.events.is_empty() || operation.events.len() > 64 {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    for (index, event) in operation.events.iter().enumerate() {
        let expected_event_id = operation_state_event_id(operation, event);
        let expected_audit_id = identifier(
            "p7a_",
            OPERATION_STATE_AUDIT_ID_DOMAIN,
            &[expected_event_id.as_bytes()],
        );
        let prior = index
            .checked_sub(1)
            .and_then(|prior| operation.events.get(prior));
        let expected_effect = if event.state == "completed" {
            "receipt_bound"
        } else if event.state == "outcome_unknown" {
            "adapter_executed"
        } else {
            "none"
        };
        let transition_valid = match prior.map(|value| value.state.as_str()) {
            None => event.state == "prepared" && event.effective_at == operation.created_at,
            Some("prepared") => event.state == "dispatching",
            Some("dispatching") => matches!(
                event.state.as_str(),
                "outcome_unknown" | "completed" | "failed"
            ),
            Some("outcome_unknown") => event.state == "completed",
            _ => false,
        };
        if !transition_valid
            || event.state_sequence != i64::try_from(index + 1).unwrap_or(i64::MAX)
            || event.prior_state_event_id.as_deref()
                != prior.map(|value| value.state_event_id.as_str())
            || event.prior_state_sequence != prior.map(|value| value.state_sequence)
            || event.state_event_id != expected_event_id
            || event.audit_binding_id != expected_audit_id
            || event.project_ref != operation.project_ref
            || event.resource_ref != operation.resource_ref
            || event.target_entity_id != operation.operation_id
            || event.target_entity_kind != "operation"
            || event.entity_created_at != event.effective_at
            || event.audit_event_kind != "operation_state_recorded"
            || event.audit_authority_effect != expected_effect
            || event.audit_recorded_at != event.effective_at
            || operation_state_digest(operation, event) != event.state_digest
            || state_record_digest(event) != event.stored_record_digest
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
    }
    Ok(())
}

fn validate_stored_consumption(
    connection: &Connection,
    consumption: StoredConsumption,
) -> Result<StoredConsumption, Phase7PersistenceErrorV1> {
    if !valid_prefixed_id(&consumption.consumption_id, "cpc_")
        || !valid_prefixed_id(&consumption.audit_binding_id, "p7a_")
        || !bounded_reference(&consumption.idempotency_key)
        || consumption.entity_created_at != consumption.consumed_at
        || consumption.audit_event_kind != "capability_consumption_recorded"
        || consumption.audit_authority_effect != "capability_consumed"
        || consumption.audit_recorded_at != consumption.consumed_at
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let authorization = select_authorization_by_id(
        connection,
        &consumption.project_ref,
        &consumption.resource_ref,
        &consumption.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let authorization = validate_stored_authorization(connection, authorization)?;
    let operation = select_operation_by_id(
        connection,
        &consumption.project_ref,
        &consumption.resource_ref,
        &consumption.operation_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let operation = validate_stored_operation(connection, operation)?;
    if operation.authorization_id != authorization.authorization_id
        || consumption.authorization_id != authorization.authorization_id
        || consumption.operation_id != operation.operation_id
        || consumption.binding_digest != authorization.binding_digest
        || !constant_time_equal(
            &consumption.capability_digest,
            &authorization.capability_digest,
        )
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let input = Phase7CapabilityRedemptionInputV1 {
        project_ref: &consumption.project_ref,
        resource_ref: &consumption.resource_ref,
        authorization_id: &consumption.authorization_id,
        operation_id: &consumption.operation_id,
        idempotency_key: &consumption.idempotency_key,
    };
    let expected_request_digest = redemption_request_digest(
        &input,
        &consumption.binding_digest,
        &consumption.capability_digest,
    );
    let expected_consumption_id = identifier(
        "cpc_",
        CONSUMPTION_ID_DOMAIN,
        &[
            consumption.authorization_id.as_bytes(),
            consumption.operation_id.as_bytes(),
            &expected_request_digest,
        ],
    );
    let expected_audit_id = identifier(
        "p7a_",
        CONSUMPTION_AUDIT_ID_DOMAIN,
        &[consumption.consumption_id.as_bytes()],
    );
    let consumed = canonical_millis(&consumption.consumed_at)?;
    let authorization_issued = canonical_millis(&authorization.issued_at)?;
    let authorization_expires = canonical_millis(&authorization.expires_at)?;
    let operation_created = canonical_millis(&operation.created_at)?;
    let operation_expires = canonical_millis(&operation.expires_at)?;
    let terminal = authorization
        .events
        .last()
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    if consumption.request_digest != expected_request_digest
        || consumption.consumption_id != expected_consumption_id
        || consumption.audit_binding_id != expected_audit_id
        || consumption_record_digest(&consumption) != consumption.stored_record_digest
        || consumed < authorization_issued
        || consumed < operation_created
        || consumed >= authorization_expires
        || consumed >= operation_expires
        || terminal.state != "consumed"
        || terminal.effective_at != consumption.consumed_at
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(consumption)
}

fn validate_redemption_window_and_state(
    authorization: &StoredAuthorization,
    operation: &StoredOperation,
    consumed_at: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    let now = canonical_utc_timestamp_millis_v1(consumed_at)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    let issued = canonical_millis(&authorization.issued_at)?;
    let authorization_expires = canonical_millis(&authorization.expires_at)?;
    let operation_created = canonical_millis(&operation.created_at)?;
    let operation_expires = canonical_millis(&operation.expires_at)?;
    let latest = authorization
        .events
        .last()
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let latest_time = canonical_millis(&latest.effective_at)?;
    if now < issued || now < operation_created || now < latest_time {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    if latest.state != "active" || now >= authorization_expires || now >= operation_expires {
        return Err(Phase7PersistenceErrorV1::RedemptionRejected);
    }
    Ok(())
}

fn consumption_public_record(
    connection: &Connection,
    consumption: &StoredConsumption,
) -> Result<Phase7CapabilityConsumptionRecordV1, Phase7PersistenceErrorV1> {
    let authorization = select_authorization_by_id(
        connection,
        &consumption.project_ref,
        &consumption.resource_ref,
        &consumption.authorization_id,
    )?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let authorization = validate_stored_authorization(connection, authorization)?;
    let terminal = authorization
        .events
        .last()
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    if terminal.state != "consumed" || terminal.effective_at != consumption.consumed_at {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let sequence = u32::try_from(terminal.state_sequence)
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    Ok(Phase7CapabilityConsumptionRecordV1 {
        consumption_id: consumption.consumption_id.clone(),
        audit_binding_id: consumption.audit_binding_id.clone(),
        project_ref: consumption.project_ref.clone(),
        resource_ref: consumption.resource_ref.clone(),
        authorization_id: consumption.authorization_id.clone(),
        operation_id: consumption.operation_id.clone(),
        binding_digest: consumption.binding_digest,
        idempotency_key: consumption.idempotency_key.clone(),
        request_digest: consumption.request_digest,
        consumed_at: consumption.consumed_at.clone(),
        authorization_state_event_id: terminal.state_event_id.clone(),
        authorization_state_audit_binding_id: terminal.audit_binding_id.clone(),
        authorization_state_sequence: sequence,
    })
}

fn begin_immediate_transaction(
    connection: &Connection,
) -> Result<Transaction<'_>, Phase7PersistenceErrorV1> {
    for attempt in 1..=IMMEDIATE_TRANSACTION_ATTEMPTS {
        match Transaction::new_unchecked(connection, TransactionBehavior::Immediate) {
            Ok(transaction) => return Ok(transaction),
            Err(error) if attempt < IMMEDIATE_TRANSACTION_ATTEMPTS && sqlite_busy(&error) => {}
            Err(_) => return Err(Phase7PersistenceErrorV1::PersistenceFailed),
        }
    }
    Err(Phase7PersistenceErrorV1::PersistenceFailed)
}

fn sqlite_busy(error: &SqliteError) -> bool {
    matches!(
        error,
        SqliteError::SqliteFailure(failure, _)
            if matches!(failure.code, ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked)
    )
}

fn insert_consumption(
    transaction: &Transaction<'_>,
    consumption: &StoredConsumption,
) -> Result<(), Phase7PersistenceErrorV1> {
    insert_entity_and_audit(
        transaction,
        &consumption.consumption_id,
        "capability_consumption",
        &consumption.project_ref,
        &consumption.resource_ref,
        &consumption.audit_binding_id,
        &consumption.stored_record_digest,
        "capability_consumption_recorded",
        "capability_consumed",
        &consumption.consumed_at,
    )?;
    transaction
        .execute(
            "INSERT INTO lnsat_capability_consumptions (
                consumption_id, entity_kind, project_ref, resource_ref,
                authorization_id, operation_id, binding_digest,
                capability_digest, idempotency_key, request_digest,
                consumed_at
             ) VALUES (
                ?1, 'capability_consumption', ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9, ?10
             )",
            params![
                &consumption.consumption_id,
                &consumption.project_ref,
                &consumption.resource_ref,
                &consumption.authorization_id,
                &consumption.operation_id,
                consumption.binding_digest.as_slice(),
                consumption.capability_digest.as_slice(),
                &consumption.idempotency_key,
                consumption.request_digest.as_slice(),
                &consumption.consumed_at,
            ],
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    Ok(())
}

fn insert_authorization_state_event(
    transaction: &Transaction<'_>,
    authorization: &StoredAuthorization,
    state: &str,
    effective_at: &str,
    prior: Option<&StoredStateEvent>,
    consumption_id: Option<&str>,
) -> Result<(), Phase7PersistenceErrorV1> {
    let state_sequence = prior.map_or(1, |event| event.state_sequence + 1);
    let state_event_id = authorization_state_event_id(
        authorization,
        state,
        state_sequence,
        effective_at,
        consumption_id,
    );
    let audit_binding_id = identifier(
        "p7a_",
        AUTHORIZATION_STATE_AUDIT_ID_DOMAIN,
        &[state_event_id.as_bytes()],
    );
    if phase7_entity_exists(transaction, &state_event_id)?
        || audit_binding_exists(transaction, &audit_binding_id)?
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let authority_effect = match state {
        "active" => "authorization_active",
        "consumed" => "capability_consumed",
        _ => "none",
    };
    let mut event = StoredStateEvent {
        state_event_id,
        audit_binding_id,
        project_ref: authorization.project_ref.clone(),
        resource_ref: authorization.resource_ref.clone(),
        target_entity_id: authorization.authorization_id.clone(),
        target_entity_kind: "execution_authorization".to_owned(),
        state_sequence,
        state: state.to_owned(),
        prior_state_event_id: prior.map(|event| event.state_event_id.clone()),
        prior_state_sequence: prior.map(|event| event.state_sequence),
        effective_at: effective_at.to_owned(),
        state_digest: [0; 32],
        stored_record_digest: [0; 32],
        entity_created_at: effective_at.to_owned(),
        audit_event_kind: "authorization_state_recorded".to_owned(),
        audit_authority_effect: authority_effect.to_owned(),
        audit_recorded_at: effective_at.to_owned(),
    };
    event.state_digest = authorization_state_digest(authorization, &event, consumption_id);
    event.stored_record_digest = state_record_digest(&event);
    insert_state_event(transaction, &event)
}

fn insert_operation_state_event(
    transaction: &Transaction<'_>,
    operation: &StoredOperation,
) -> Result<(), Phase7PersistenceErrorV1> {
    let mut event = StoredStateEvent {
        state_event_id: String::new(),
        audit_binding_id: String::new(),
        project_ref: operation.project_ref.clone(),
        resource_ref: operation.resource_ref.clone(),
        target_entity_id: operation.operation_id.clone(),
        target_entity_kind: "operation".to_owned(),
        state_sequence: 1,
        state: "prepared".to_owned(),
        prior_state_event_id: None,
        prior_state_sequence: None,
        effective_at: operation.created_at.clone(),
        state_digest: [0; 32],
        stored_record_digest: [0; 32],
        entity_created_at: operation.created_at.clone(),
        audit_event_kind: "operation_state_recorded".to_owned(),
        audit_authority_effect: "none".to_owned(),
        audit_recorded_at: operation.created_at.clone(),
    };
    event.state_event_id = operation_state_event_id(operation, &event);
    event.audit_binding_id = identifier(
        "p7a_",
        OPERATION_STATE_AUDIT_ID_DOMAIN,
        &[event.state_event_id.as_bytes()],
    );
    event.state_digest = operation_state_digest(operation, &event);
    event.stored_record_digest = state_record_digest(&event);
    insert_state_event(transaction, &event)
}

pub(super) fn append_phase7_operation_state_event_v1(
    transaction: &Transaction<'_>,
    project_ref: &str,
    resource_ref: &str,
    operation_id: &str,
    state: &str,
    effective_at: &str,
) -> Result<(), Phase7PersistenceErrorV1> {
    let operation = select_operation_by_id(transaction, project_ref, resource_ref, operation_id)?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let operation = validate_stored_operation(transaction, operation)?;
    let prior = operation
        .events
        .last()
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let valid = matches!(
        (prior.state.as_str(), state),
        ("prepared", "dispatching")
            | ("dispatching", "outcome_unknown" | "completed" | "failed")
            | ("outcome_unknown", "completed")
    );
    if !valid {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let mut event = StoredStateEvent {
        state_event_id: String::new(),
        audit_binding_id: String::new(),
        project_ref: operation.project_ref.clone(),
        resource_ref: operation.resource_ref.clone(),
        target_entity_id: operation.operation_id.clone(),
        target_entity_kind: "operation".to_owned(),
        state_sequence: prior.state_sequence + 1,
        state: state.to_owned(),
        prior_state_event_id: Some(prior.state_event_id.clone()),
        prior_state_sequence: Some(prior.state_sequence),
        effective_at: effective_at.to_owned(),
        state_digest: [0; 32],
        stored_record_digest: [0; 32],
        entity_created_at: effective_at.to_owned(),
        audit_event_kind: "operation_state_recorded".to_owned(),
        audit_authority_effect: match state {
            "completed" => "receipt_bound",
            "outcome_unknown" => "adapter_executed",
            _ => "none",
        }
        .to_owned(),
        audit_recorded_at: effective_at.to_owned(),
    };
    event.state_event_id = operation_state_event_id(&operation, &event);
    event.audit_binding_id = identifier(
        "p7a_",
        OPERATION_STATE_AUDIT_ID_DOMAIN,
        &[event.state_event_id.as_bytes()],
    );
    event.state_digest = operation_state_digest(&operation, &event);
    event.stored_record_digest = state_record_digest(&event);
    insert_state_event(transaction, &event)
}

fn insert_state_event(
    transaction: &Transaction<'_>,
    event: &StoredStateEvent,
) -> Result<(), Phase7PersistenceErrorV1> {
    if phase7_entity_exists(transaction, &event.state_event_id)?
        || audit_binding_exists(transaction, &event.audit_binding_id)?
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    insert_entity_and_audit(
        transaction,
        &event.state_event_id,
        "phase7_state_event",
        &event.project_ref,
        &event.resource_ref,
        &event.audit_binding_id,
        &event.stored_record_digest,
        &event.audit_event_kind,
        &event.audit_authority_effect,
        &event.effective_at,
    )?;
    transaction
        .execute(
            "INSERT INTO lnsat_phase7_state_events (
                state_event_id, entity_kind, project_ref, resource_ref,
                target_entity_id, target_entity_kind, state_sequence, state,
                prior_state_event_id, prior_state_sequence, effective_at,
                state_digest
             ) VALUES (
                ?1, 'phase7_state_event', ?2, ?3, ?4, ?5, ?6, ?7,
                ?8, ?9, ?10, ?11
             )",
            params![
                &event.state_event_id,
                &event.project_ref,
                &event.resource_ref,
                &event.target_entity_id,
                &event.target_entity_kind,
                event.state_sequence,
                &event.state,
                &event.prior_state_event_id,
                event.prior_state_sequence,
                &event.effective_at,
                event.state_digest.as_slice(),
            ],
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    Ok(())
}

fn validate_redemption_input(
    input: &Phase7CapabilityRedemptionInputV1<'_>,
) -> Result<(), Phase7PersistenceErrorV1> {
    if !bounded_reference(input.project_ref)
        || !is_valid_reference_v1(input.project_ref)
        || !bounded_reference(input.resource_ref)
        || !is_valid_reference_v1(input.resource_ref)
        || !valid_prefixed_id(input.authorization_id, "xau_")
        || !valid_prefixed_id(input.operation_id, "opn_")
        || !bounded_reference(input.idempotency_key)
    {
        return Err(Phase7PersistenceErrorV1::InvalidInput);
    }
    Ok(())
}

fn capability_digest(capability: &[u8; PHASE7_CAPABILITY_BYTES_V1]) -> [u8; 32] {
    digest_fields(CAPABILITY_DIGEST_DOMAIN, &[capability])
}

fn redemption_request_digest(
    input: &Phase7CapabilityRedemptionInputV1<'_>,
    binding_digest: &[u8; 32],
    capability_digest: &[u8; 32],
) -> [u8; 32] {
    digest_fields(
        REDEMPTION_REQUEST_DIGEST_DOMAIN,
        &[
            input.project_ref.as_bytes(),
            input.resource_ref.as_bytes(),
            input.authorization_id.as_bytes(),
            input.operation_id.as_bytes(),
            binding_digest,
            capability_digest,
            input.idempotency_key.as_bytes(),
        ],
    )
}

fn authorization_record_digest(authorization: &StoredAuthorization) -> [u8; 32] {
    digest_fields(
        AUTHORIZATION_RECORD_DIGEST_DOMAIN,
        &[
            authorization.authorization_id.as_bytes(),
            authorization.audit_binding_id.as_bytes(),
            authorization.project_ref.as_bytes(),
            authorization.resource_ref.as_bytes(),
            authorization.authorization_attempt_id.as_bytes(),
            authorization.nonce_id.as_bytes(),
            &authorization.binding_digest,
            authorization.approval_decision_id.as_bytes(),
            authorization.policy_decision_id.as_bytes(),
            authorization.packet_id.as_bytes(),
            authorization.packet_sha256.as_bytes(),
            authorization.requester_ref.as_bytes(),
            authorization.requester_session_ref.as_bytes(),
            authorization.approver_ref.as_bytes(),
            authorization.approver_session_ref.as_bytes(),
            &authorization.action_digest,
            &authorization.target_digest,
            &authorization.configuration_digest,
            authorization.adapter_ref.as_bytes(),
            &authorization.executable_digest,
            authorization.audience.as_bytes(),
            &authorization.capability_digest,
            authorization.authorization_profile.as_bytes(),
            authorization.issued_at.as_bytes(),
            authorization.expires_at.as_bytes(),
        ],
    )
}

fn operation_request_digest(operation: &StoredOperation) -> [u8; 32] {
    digest_fields(
        OPERATION_REQUEST_DIGEST_DOMAIN,
        &[
            operation.project_ref.as_bytes(),
            operation.resource_ref.as_bytes(),
            operation.authorization_id.as_bytes(),
            &operation.binding_digest,
            operation.idempotency_key.as_bytes(),
            &operation.requested_action_digest,
            &operation.approved_action_digest,
            &operation.authorized_action_digest,
            &operation.target_digest,
            &operation.configuration_digest,
            operation.adapter_ref.as_bytes(),
            &operation.executable_digest,
            operation.audience.as_bytes(),
            operation.created_at.as_bytes(),
            operation.expires_at.as_bytes(),
        ],
    )
}

fn operation_record_digest(operation: &StoredOperation) -> [u8; 32] {
    digest_fields(
        OPERATION_RECORD_DIGEST_DOMAIN,
        &[
            operation.operation_id.as_bytes(),
            operation.audit_binding_id.as_bytes(),
            operation.project_ref.as_bytes(),
            operation.resource_ref.as_bytes(),
            operation.authorization_id.as_bytes(),
            &operation.binding_digest,
            operation.idempotency_key.as_bytes(),
            &operation.request_digest,
            &operation.requested_action_digest,
            &operation.approved_action_digest,
            &operation.authorized_action_digest,
            &operation.target_digest,
            &operation.configuration_digest,
            operation.adapter_ref.as_bytes(),
            &operation.executable_digest,
            operation.audience.as_bytes(),
            operation.created_at.as_bytes(),
            operation.expires_at.as_bytes(),
        ],
    )
}

fn consumption_record_digest(consumption: &StoredConsumption) -> [u8; 32] {
    digest_fields(
        CONSUMPTION_RECORD_DIGEST_DOMAIN,
        &[
            consumption.consumption_id.as_bytes(),
            consumption.audit_binding_id.as_bytes(),
            consumption.project_ref.as_bytes(),
            consumption.resource_ref.as_bytes(),
            consumption.authorization_id.as_bytes(),
            consumption.operation_id.as_bytes(),
            &consumption.binding_digest,
            &consumption.capability_digest,
            consumption.idempotency_key.as_bytes(),
            &consumption.request_digest,
            consumption.consumed_at.as_bytes(),
        ],
    )
}

fn authorization_state_event_id(
    authorization: &StoredAuthorization,
    state: &str,
    state_sequence: i64,
    effective_at: &str,
    consumption_id: Option<&str>,
) -> String {
    let sequence = state_sequence.to_be_bytes();
    identifier(
        "ste_",
        AUTHORIZATION_STATE_EVENT_ID_DOMAIN,
        &[
            authorization.authorization_id.as_bytes(),
            state.as_bytes(),
            &sequence,
            effective_at.as_bytes(),
            consumption_id.unwrap_or("").as_bytes(),
        ],
    )
}

fn authorization_state_digest(
    authorization: &StoredAuthorization,
    event: &StoredStateEvent,
    consumption_id: Option<&str>,
) -> [u8; 32] {
    let sequence = event.state_sequence.to_be_bytes();
    let prior_sequence = event.prior_state_sequence.unwrap_or(0).to_be_bytes();
    digest_fields(
        AUTHORIZATION_STATE_DIGEST_DOMAIN,
        &[
            authorization.authorization_id.as_bytes(),
            &authorization.binding_digest,
            &authorization.capability_digest,
            event.state.as_bytes(),
            &sequence,
            event
                .prior_state_event_id
                .as_deref()
                .unwrap_or("")
                .as_bytes(),
            &prior_sequence,
            event.effective_at.as_bytes(),
            consumption_id.unwrap_or("").as_bytes(),
        ],
    )
}

fn operation_state_event_id(operation: &StoredOperation, event: &StoredStateEvent) -> String {
    let sequence = event.state_sequence.to_be_bytes();
    identifier(
        "ste_",
        OPERATION_STATE_EVENT_ID_DOMAIN,
        &[
            operation.operation_id.as_bytes(),
            event.state.as_bytes(),
            &sequence,
            event.effective_at.as_bytes(),
        ],
    )
}

fn operation_state_digest(operation: &StoredOperation, event: &StoredStateEvent) -> [u8; 32] {
    let sequence = event.state_sequence.to_be_bytes();
    let prior_sequence = event.prior_state_sequence.unwrap_or(0).to_be_bytes();
    digest_fields(
        OPERATION_STATE_DIGEST_DOMAIN,
        &[
            operation.operation_id.as_bytes(),
            operation.authorization_id.as_bytes(),
            &operation.binding_digest,
            &operation.request_digest,
            event.state.as_bytes(),
            &sequence,
            event
                .prior_state_event_id
                .as_deref()
                .unwrap_or("")
                .as_bytes(),
            &prior_sequence,
            event.effective_at.as_bytes(),
        ],
    )
}

fn state_record_digest(event: &StoredStateEvent) -> [u8; 32] {
    let sequence = event.state_sequence.to_be_bytes();
    let domain = if event.target_entity_kind == "execution_authorization" {
        AUTHORIZATION_STATE_RECORD_DIGEST_DOMAIN
    } else {
        OPERATION_STATE_RECORD_DIGEST_DOMAIN
    };
    digest_fields(
        domain,
        &[
            event.state_event_id.as_bytes(),
            event.audit_binding_id.as_bytes(),
            event.project_ref.as_bytes(),
            event.resource_ref.as_bytes(),
            event.target_entity_id.as_bytes(),
            event.target_entity_kind.as_bytes(),
            &sequence,
            event.state.as_bytes(),
            &event.state_digest,
            event.effective_at.as_bytes(),
        ],
    )
}

fn constant_time_equal(left: &[u8; 32], right: &[u8; 32]) -> bool {
    bool::from(left.ct_eq(right))
}

fn constant_time_dummy_compare(candidate: &[u8; 32]) {
    let dummy = digest_fields(CAPABILITY_DIGEST_DOMAIN, &[&[0_u8; 32]]);
    std::hint::black_box(candidate.ct_eq(&dummy));
}

fn canonical_millis(value: &str) -> Result<u64, Phase7PersistenceErrorV1> {
    canonical_utc_timestamp_millis_v1(value).ok_or(Phase7PersistenceErrorV1::EvidenceDrift)
}

fn identifier(prefix: &str, domain: &str, fields: &[&[u8]]) -> String {
    let digest = digest_fields(domain, fields);
    let mut encoded = String::with_capacity(prefix.len() + 64);
    encoded.push_str(prefix);
    for byte in digest {
        encoded.push(char::from(LOWER_HEX[usize::from(byte >> 4)]));
        encoded.push(char::from(LOWER_HEX[usize::from(byte & 0x0f)]));
    }
    encoded
}

const fn decode_lower_hex(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        _ => None,
    }
}

#[cfg(test)]
pub(super) struct Phase7ExecutionSeedInputV1<'a> {
    pub project_ref: &'a str,
    pub resource_ref: &'a str,
    pub authorization_attempt_id: &'a str,
    pub nonce_id: &'a str,
    pub operation_idempotency_key: &'a str,
    pub issued_at: &'a str,
    pub expires_at: &'a str,
}

#[cfg(test)]
pub(super) struct Phase7ExecutionSeedRecordV1 {
    pub authorization_id: String,
    pub operation_id: String,
}

#[cfg(test)]
impl SqliteStore {
    pub(super) fn seed_phase7_execution_authorization_and_operation_v1(
        &mut self,
        input: &Phase7ExecutionSeedInputV1<'_>,
        capability: &[u8; PHASE7_CAPABILITY_BYTES_V1],
    ) -> Result<Phase7ExecutionSeedRecordV1, Phase7PersistenceErrorV1> {
        let issue_input = Phase7ExecutionAuthorizationIssueInputV1 {
            project_ref: input.project_ref,
            resource_ref: input.resource_ref,
            authorization_attempt_id: input.authorization_attempt_id,
            nonce_id: input.nonce_id,
            operation_idempotency_key: input.operation_idempotency_key,
        };
        validate_authorization_issue_input(&issue_input)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let attempt = read_validated_attempt_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.authorization_attempt_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let nonce = read_validated_nonce_by_id(
            &transaction,
            input.project_ref,
            input.resource_ref,
            input.nonce_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        if nonce.authorization_attempt_id != attempt.authorization_attempt_id
            || nonce.binding_digest != attempt.binding_digest
        {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        let inserted = insert_authorization_and_operation(
            &transaction,
            &issue_input,
            &attempt,
            &nonce,
            &capability_digest(capability),
            input.issued_at,
            input.expires_at,
        );
        let (authorization, operation) = match inserted {
            Err(Phase7PersistenceErrorV1::SourceNotApproved) => {
                return Err(Phase7PersistenceErrorV1::EvidenceDrift);
            }
            other => other?,
        };
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        Ok(Phase7ExecutionSeedRecordV1 {
            authorization_id: authorization.authorization_id,
            operation_id: operation.operation_id,
        })
    }

    pub(super) fn append_phase7_authorization_terminal_for_test_v1(
        &mut self,
        project_ref: &str,
        resource_ref: &str,
        authorization_id: &str,
        state: &str,
        effective_at: &str,
    ) -> Result<(), Phase7PersistenceErrorV1> {
        if !matches!(state, "cancelled" | "revoked" | "expired") {
            return Err(Phase7PersistenceErrorV1::InvalidInput);
        }
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let authorization =
            select_authorization_by_id(&transaction, project_ref, resource_ref, authorization_id)?
                .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let authorization = validate_stored_authorization(&transaction, authorization)?;
        let prior = authorization
            .events
            .last()
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        if prior.state != "active" {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        insert_authorization_state_event(
            &transaction,
            &authorization,
            state,
            effective_at,
            Some(prior),
            None,
        )?;
        let reloaded =
            select_authorization_by_id(&transaction, project_ref, resource_ref, authorization_id)?
                .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        validate_stored_authorization(&transaction, reloaded)?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        Ok(())
    }
}
