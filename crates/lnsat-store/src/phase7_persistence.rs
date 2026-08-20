use super::{
    ApprovalDecisionStoreErrorV1, ApprovalRequestStoreErrorV1, MIGRATION_0016_SQL,
    MIGRATION_0017_SQL, PacketStoreErrorV1, PolicyStoreErrorV1, SqliteStore, SqliteStoreError,
    canonical_utc_timestamp_millis_v1, decode_approval_decision_record,
    decode_approval_request_record, decode_packet_record, decode_policy_record,
    is_valid_reference_v1, normalize_sql, select_approval_decision_by_project,
    select_approval_request_by_project, select_packet_by_project, select_policy_by_project,
    verify_current_schema,
};
use crate::phase7_consumption::verify_phase7_consumption_records_v1;
use crate::phase7_nonce::verify_phase7_nonce_records_v1;
use core::fmt;
use lnsat_contracts::{
    DerivedExecutionRequestV1, ExecutionRequestV1Input, derive_execution_request_v1,
    parse_packet_envelope_v1,
};
use rusqlite::{Connection, OptionalExtension, Transaction, TransactionBehavior, params};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

const AUTHORIZATION_ATTEMPT_DIGEST_DOMAIN: &str = "lnsat.phase7.authorization-attempt-record.v1";
const AUTHORIZATION_BINDING_DIGEST_DOMAIN: &str = "lnsat.phase7.authorization-binding.v1";
const AUTHORIZATION_ATTEMPT_ID_DOMAIN: &str = "lnsat.phase7.authorization-attempt-id.v1";
const AUTHORIZATION_ATTEMPT_AUDIT_ID_DOMAIN: &str =
    "lnsat.phase7.authorization-attempt-audit-id.v1";
const AUTHORIZATION_ATTEMPT_IDEMPOTENCY_DOMAIN: &str =
    "lnsat.phase7.authorization-attempt-idempotency.v1";
const LOWER_HEX: &[u8; 16] = b"0123456789abcdef";

const PHASE7_TABLES: [&str; 11] = [
    "lnsat_authorization_attempts",
    "lnsat_authorization_nonces",
    "lnsat_capability_consumptions",
    "lnsat_execution_authorizations",
    "lnsat_operation_attempts",
    "lnsat_operation_receipts",
    "lnsat_operation_reconciliations",
    "lnsat_operations",
    "lnsat_phase7_audit_bindings",
    "lnsat_phase7_entities",
    "lnsat_phase7_state_events",
];

const PHASE7_INDEXES: [&str; 18] = [
    "lnsat_approval_decisions_phase7_binding_idx",
    "lnsat_authorization_attempts_scope_idx",
    "lnsat_authorization_nonces_expiry_idx",
    "lnsat_capability_consumptions_scope_idx",
    "lnsat_execution_authorizations_expiry_idx",
    "lnsat_operation_attempts_operation_idx",
    "lnsat_operation_receipts_operation_idx",
    "lnsat_operation_reconciliations_operation_idx",
    "lnsat_operations_scope_idx",
    "lnsat_packet_resource_phase7_binding_idx",
    "lnsat_phase7_audit_bindings_scope_idx",
    "lnsat_phase7_entities_scope_idx",
    "lnsat_phase7_state_events_attempt_terminal_idx",
    "lnsat_phase7_state_events_authorization_terminal_idx",
    "lnsat_phase7_state_events_nonce_terminal_idx",
    "lnsat_phase7_state_events_operation_terminal_idx",
    "lnsat_phase7_state_events_target_idx",
    "lnsat_policy_decisions_phase7_binding_idx",
];

const PHASE7_INDEXES_V17: [&str; 19] = [
    "lnsat_approval_decisions_phase7_binding_idx",
    "lnsat_authorization_attempts_scope_idx",
    "lnsat_authorization_nonces_expiry_idx",
    "lnsat_capability_consumptions_scope_idx",
    "lnsat_execution_authorizations_approval_decision_unique_idx",
    "lnsat_execution_authorizations_expiry_idx",
    "lnsat_operation_attempts_operation_idx",
    "lnsat_operation_receipts_operation_idx",
    "lnsat_operation_reconciliations_operation_idx",
    "lnsat_operations_scope_idx",
    "lnsat_packet_resource_phase7_binding_idx",
    "lnsat_phase7_audit_bindings_scope_idx",
    "lnsat_phase7_entities_scope_idx",
    "lnsat_phase7_state_events_attempt_terminal_idx",
    "lnsat_phase7_state_events_authorization_terminal_idx",
    "lnsat_phase7_state_events_nonce_terminal_idx",
    "lnsat_phase7_state_events_operation_terminal_idx",
    "lnsat_phase7_state_events_target_idx",
    "lnsat_policy_decisions_phase7_binding_idx",
];

const REQUIRED_INDEXES_V16: [&str; 29] = [
    "lnsat_approval_decisions_binding_idx",
    "lnsat_approval_decisions_phase7_binding_idx",
    "lnsat_approval_decisions_project_idx",
    "lnsat_approval_requests_binding_idx",
    "lnsat_approval_requests_project_idx",
    "lnsat_audit_events_project_idx",
    "lnsat_audit_events_resource_chain_idx",
    "lnsat_authorization_attempts_scope_idx",
    "lnsat_authorization_nonces_expiry_idx",
    "lnsat_capability_consumptions_scope_idx",
    "lnsat_execution_authorizations_expiry_idx",
    "lnsat_operation_attempts_operation_idx",
    "lnsat_operation_receipts_operation_idx",
    "lnsat_operation_reconciliations_operation_idx",
    "lnsat_operations_scope_idx",
    "lnsat_packet_envelopes_binding_idx",
    "lnsat_packet_envelopes_project_idx",
    "lnsat_packet_resource_phase7_binding_idx",
    "lnsat_packet_resource_scope_idx",
    "lnsat_phase7_audit_bindings_scope_idx",
    "lnsat_phase7_entities_scope_idx",
    "lnsat_phase7_state_events_attempt_terminal_idx",
    "lnsat_phase7_state_events_authorization_terminal_idx",
    "lnsat_phase7_state_events_nonce_terminal_idx",
    "lnsat_phase7_state_events_operation_terminal_idx",
    "lnsat_phase7_state_events_target_idx",
    "lnsat_policy_decisions_binding_idx",
    "lnsat_policy_decisions_phase7_binding_idx",
    "lnsat_policy_decisions_project_idx",
];

const REQUIRED_INDEXES_V17: [&str; 30] = [
    "lnsat_approval_decisions_binding_idx",
    "lnsat_approval_decisions_phase7_binding_idx",
    "lnsat_approval_decisions_project_idx",
    "lnsat_approval_requests_binding_idx",
    "lnsat_approval_requests_project_idx",
    "lnsat_audit_events_project_idx",
    "lnsat_audit_events_resource_chain_idx",
    "lnsat_authorization_attempts_scope_idx",
    "lnsat_authorization_nonces_expiry_idx",
    "lnsat_capability_consumptions_scope_idx",
    "lnsat_execution_authorizations_approval_decision_unique_idx",
    "lnsat_execution_authorizations_expiry_idx",
    "lnsat_operation_attempts_operation_idx",
    "lnsat_operation_receipts_operation_idx",
    "lnsat_operation_reconciliations_operation_idx",
    "lnsat_operations_scope_idx",
    "lnsat_packet_envelopes_binding_idx",
    "lnsat_packet_envelopes_project_idx",
    "lnsat_packet_resource_phase7_binding_idx",
    "lnsat_packet_resource_scope_idx",
    "lnsat_phase7_audit_bindings_scope_idx",
    "lnsat_phase7_entities_scope_idx",
    "lnsat_phase7_state_events_attempt_terminal_idx",
    "lnsat_phase7_state_events_authorization_terminal_idx",
    "lnsat_phase7_state_events_nonce_terminal_idx",
    "lnsat_phase7_state_events_operation_terminal_idx",
    "lnsat_phase7_state_events_target_idx",
    "lnsat_policy_decisions_binding_idx",
    "lnsat_policy_decisions_phase7_binding_idx",
    "lnsat_policy_decisions_project_idx",
];

const PHASE7_ENTITY_TABLES: [(&str, &str, &str); 9] = [
    (
        "authorization_attempt",
        "lnsat_authorization_attempts",
        "authorization_attempt_id",
    ),
    (
        "authorization_nonce",
        "lnsat_authorization_nonces",
        "nonce_id",
    ),
    (
        "capability_consumption",
        "lnsat_capability_consumptions",
        "consumption_id",
    ),
    (
        "execution_authorization",
        "lnsat_execution_authorizations",
        "authorization_id",
    ),
    (
        "operation_attempt",
        "lnsat_operation_attempts",
        "operation_attempt_id",
    ),
    (
        "operation_receipt",
        "lnsat_operation_receipts",
        "receipt_id",
    ),
    (
        "operation_reconciliation",
        "lnsat_operation_reconciliations",
        "reconciliation_id",
    ),
    ("operation", "lnsat_operations", "operation_id"),
    (
        "phase7_state_event",
        "lnsat_phase7_state_events",
        "state_event_id",
    ),
];

/// Exact persisted source selector for one non-authorizing attempt.
///
/// Production callers provide no action evidence, target, adapter, timestamp,
/// identifier, expiry, or idempotency identity. Store rederives every value
/// from persisted approved packet bytes and trusted system time.
#[derive(Clone, Copy, Debug)]
pub struct Phase7AuthorizationAttemptPrepareInputV1<'a> {
    pub project_ref: &'a str,
    pub approval_decision_id: &'a str,
}

/// Immutable, non-authorizing authorization-attempt evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7AuthorizationAttemptRecordV1 {
    pub authorization_attempt_id: String,
    pub audit_binding_id: String,
    pub project_ref: String,
    pub resource_ref: String,
    pub approval_decision_id: String,
    pub approval_request_id: String,
    pub policy_decision_id: String,
    pub packet_id: String,
    pub packet_sha256: String,
    pub requester_ref: String,
    pub requester_session_ref: String,
    pub approver_ref: String,
    pub approver_session_ref: String,
    pub idempotency_key: String,
    pub request_digest: [u8; 32],
    pub binding_digest: [u8; 32],
    pub action_digest: [u8; 32],
    pub target_digest: [u8; 32],
    pub configuration_digest: [u8; 32],
    pub adapter_ref: String,
    pub executable_digest: [u8; 32],
    pub audience: String,
    pub requested_at: String,
    pub expires_at: String,
    pub result_status: String,
    pub execution_authorized: bool,
}

/// Result from exact append or exact idempotent replay.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Phase7AuthorizationAttemptWriteV1 {
    pub created: bool,
    pub record: Phase7AuthorizationAttemptRecordV1,
}

/// Stable fail-closed Phase 7 persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Phase7PersistenceErrorV1 {
    InvalidInput,
    SourceNotApproved,
    EntropyUnavailable,
    ClockRejected,
    IdempotencyConflict,
    IdentityConflict,
    RedemptionRejected,
    EvidenceDrift,
    PersistenceFailed,
    OutcomeAmbiguous,
}

impl Phase7PersistenceErrorV1 {
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "phase7_persistence.invalid_input",
            Self::SourceNotApproved => "phase7_persistence.source_not_approved",
            Self::EntropyUnavailable => "phase7_persistence.entropy_unavailable",
            Self::ClockRejected => "phase7_persistence.clock_rejected",
            Self::IdempotencyConflict => "phase7_persistence.idempotency_conflict",
            Self::IdentityConflict => "phase7_persistence.identity_conflict",
            Self::RedemptionRejected => "phase7_persistence.redemption_rejected",
            Self::EvidenceDrift => "phase7_persistence.evidence_drift",
            Self::PersistenceFailed => "phase7_persistence.persistence_failed",
            Self::OutcomeAmbiguous => "phase7_persistence.outcome_ambiguous",
        }
    }
}

impl fmt::Display for Phase7PersistenceErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for Phase7PersistenceErrorV1 {}

#[derive(Debug)]
struct ApprovedSource {
    approval_decision_id: String,
    approval_request_id: String,
    policy_decision_id: String,
    packet_id: String,
    packet_sha256: String,
    canonical_packet: String,
    project_ref: String,
    requester_ref: String,
    requester_session_ref: String,
    approver_ref: String,
    approver_session_ref: String,
    decided_at: String,
    decision_expires_at: String,
    request_expires_at: String,
    policy_expires_at: String,
    packet_expires_at: String,
}

#[derive(Debug)]
struct StoredAttempt {
    record: Phase7AuthorizationAttemptRecordV1,
    stored_record_digest: [u8; 32],
    entity_created_at: String,
    audit_event_kind: String,
    audit_authority_effect: String,
    audit_recorded_at: String,
}

impl SqliteStore {
    /// Atomically prepares one exact, inert authorization attempt plus its
    /// mandatory immutable audit binding from approved packet bytes.
    ///
    /// Exact replay is read-only. Conflicting idempotency or identity reuse
    /// fails. No nonce, capability, authorization, adapter, receipt, or
    /// execution behavior is implemented here.
    ///
    /// # Errors
    ///
    /// Returns a stable fail-closed error for invalid or unapproved source
    /// evidence, replay conflict, schema drift, or persistence failure.
    pub fn prepare_phase7_authorization_attempt_v1(
        &mut self,
        input: &Phase7AuthorizationAttemptPrepareInputV1<'_>,
    ) -> Result<Phase7AuthorizationAttemptWriteV1, Phase7PersistenceErrorV1> {
        let prepared_at = canonical_system_time_v1(SystemTime::now())?;
        self.prepare_phase7_authorization_attempt_from_source_v1(input, &prepared_at, || Ok(()))
    }

    #[cfg(test)]
    pub(super) fn prepare_phase7_authorization_attempt_with_sources_v1<F>(
        &mut self,
        input: &Phase7AuthorizationAttemptPrepareInputV1<'_>,
        prepared_at: &str,
        precommit: F,
    ) -> Result<Phase7AuthorizationAttemptWriteV1, Phase7PersistenceErrorV1>
    where
        F: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        self.prepare_phase7_authorization_attempt_from_source_v1(input, prepared_at, precommit)
    }

    #[allow(clippy::too_many_lines)]
    fn prepare_phase7_authorization_attempt_from_source_v1<F>(
        &mut self,
        input: &Phase7AuthorizationAttemptPrepareInputV1<'_>,
        prepared_at: &str,
        precommit: F,
    ) -> Result<Phase7AuthorizationAttemptWriteV1, Phase7PersistenceErrorV1>
    where
        F: FnOnce() -> Result<(), Phase7PersistenceErrorV1>,
    {
        validate_prepare_input(input)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let source =
            read_approved_source(&transaction, input.project_ref, input.approval_decision_id)?
                .ok_or(Phase7PersistenceErrorV1::SourceNotApproved)?;
        let idempotency_key = identifier(
            "p7i_",
            AUTHORIZATION_ATTEMPT_IDEMPOTENCY_DOMAIN,
            &[
                source.approval_decision_id.as_bytes(),
                source.packet_sha256.as_bytes(),
            ],
        );
        if let Some(existing) =
            select_attempt_by_idempotency(&transaction, input.project_ref, &idempotency_key)?
        {
            let existing = validate_stored_attempt(&transaction, existing)?;
            if existing.approval_decision_id != source.approval_decision_id
                || existing.packet_sha256 != source.packet_sha256
            {
                return Err(Phase7PersistenceErrorV1::IdempotencyConflict);
            }
            transaction
                .commit()
                .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
            return Ok(Phase7AuthorizationAttemptWriteV1 {
                created: false,
                record: existing,
            });
        }
        let prepared_millis = canonical_utc_timestamp_millis_v1(prepared_at)
            .ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
        let decided_at = canonical_utc_timestamp_millis_v1(&source.decided_at)
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        let expires_at = effective_expiry(&source)?;
        let expires_millis = canonical_utc_timestamp_millis_v1(&expires_at)
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        if prepared_millis < decided_at || prepared_millis >= expires_millis {
            return Err(Phase7PersistenceErrorV1::SourceNotApproved);
        }
        let packet = parse_packet_envelope_v1(source.canonical_packet.as_bytes())
            .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
            packet: &packet,
            packet_sha256: &source.packet_sha256,
            policy_decision_id: &source.policy_decision_id,
            approval_request_id: &source.approval_request_id,
            approval_decision_id: &source.approval_decision_id,
            requester_ref: &source.requester_ref,
            requester_session_ref: &source.requester_session_ref,
            approver_ref: &source.approver_ref,
            approver_session_ref: &source.approver_session_ref,
            prepared_at,
            expires_at: &expires_at,
        })
        .map_err(|_| Phase7PersistenceErrorV1::SourceNotApproved)?;
        let record = build_record(
            &source,
            &derived,
            prepared_at,
            &expires_at,
            &idempotency_key,
        );
        if phase7_entity_exists(&transaction, &record.authorization_attempt_id)?
            || audit_binding_exists(&transaction, &record.audit_binding_id)?
        {
            return Err(Phase7PersistenceErrorV1::IdentityConflict);
        }

        let record_digest = authorization_attempt_record_digest(&record);
        transaction
            .execute(
                "INSERT INTO lnsat_phase7_entities (
                    entity_id, entity_kind, project_ref, resource_ref,
                    audit_binding_id, record_digest, created_at
                 ) VALUES (?1, 'authorization_attempt', ?2, ?3, ?4, ?5, ?6)",
                params![
                    &record.authorization_attempt_id,
                    &record.project_ref,
                    &record.resource_ref,
                    &record.audit_binding_id,
                    record_digest.as_slice(),
                    &record.requested_at,
                ],
            )
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        transaction
            .execute(
                "INSERT INTO lnsat_phase7_audit_bindings (
                    audit_binding_id, record_id, record_family, project_ref,
                    resource_ref, record_digest, event_kind, authority_effect,
                    recorded_at
                 ) VALUES (
                    ?1, ?2, 'authorization_attempt', ?3, ?4, ?5,
                    'persistence_prepared', 'none', ?6
                 )",
                params![
                    &record.audit_binding_id,
                    &record.authorization_attempt_id,
                    &record.project_ref,
                    &record.resource_ref,
                    record_digest.as_slice(),
                    &record.requested_at,
                ],
            )
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        insert_attempt(&transaction, &record)?;
        let stored = select_attempt_by_id(
            &transaction,
            &record.project_ref,
            &record.resource_ref,
            &record.authorization_attempt_id,
        )?
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        if validate_stored_attempt(&transaction, stored)? != record {
            return Err(Phase7PersistenceErrorV1::EvidenceDrift);
        }
        precommit()?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        Ok(Phase7AuthorizationAttemptWriteV1 {
            created: true,
            record,
        })
    }

    /// Reads one exact authorization attempt through project and resource
    /// scope, rederiving its source and immutable digest evidence.
    ///
    /// # Errors
    ///
    /// Returns a stable fail-closed error for invalid scope, schema or stored
    /// evidence drift, or persistence failure.
    pub fn read_phase7_authorization_attempt_v1(
        &self,
        project_ref: &str,
        resource_ref: &str,
        authorization_attempt_id: &str,
    ) -> Result<Option<Phase7AuthorizationAttemptRecordV1>, Phase7PersistenceErrorV1> {
        if !bounded_reference(project_ref)
            || !bounded_reference(resource_ref)
            || !valid_prefixed_id(authorization_attempt_id, "aat_")
        {
            return Err(Phase7PersistenceErrorV1::InvalidInput);
        }
        let transaction =
            Transaction::new_unchecked(&self.connection, TransactionBehavior::Deferred)
                .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        verify_current_schema(&transaction).map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
        let result = select_attempt_by_id(
            &transaction,
            project_ref,
            resource_ref,
            authorization_attempt_id,
        )?
        .map(|stored| validate_stored_attempt(&transaction, stored))
        .transpose()?;
        transaction
            .commit()
            .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
        Ok(result)
    }
}

pub(super) fn verify_phase7_persistence_schema_v1(
    connection: &Connection,
) -> Result<(), SqliteStoreError> {
    let version = connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    verify_index_names(connection, version)?;
    for table in PHASE7_TABLES {
        verify_schema_definition(connection, version, "table", table)?;
    }
    let phase7_indexes: &[&str] = match version {
        16 => &PHASE7_INDEXES,
        17 => &PHASE7_INDEXES_V17,
        _ => return Err(SqliteStoreError::MigrationDrift),
    };
    for index in phase7_indexes {
        verify_schema_definition(connection, version, "index", index)?;
    }
    verify_entity_correspondence(connection)?;
    let unopened_families = connection
        .query_row(
            "SELECT count(*) FROM lnsat_phase7_entities
             WHERE entity_kind NOT IN (
               'authorization_attempt',
               'authorization_nonce',
               'execution_authorization',
               'capability_consumption',
               'operation',
               'operation_attempt',
               'operation_receipt',
               'operation_reconciliation',
               'phase7_state_event'
             )",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    if unopened_families != 0 {
        return Err(SqliteStoreError::MigrationDrift);
    }

    let mut statement = connection
        .prepare(
            "SELECT authorization_attempt_id, project_ref, resource_ref
             FROM lnsat_authorization_attempts
             ORDER BY authorization_attempt_id",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let identities = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    for (attempt_id, project_ref, resource_ref) in identities {
        let stored = select_attempt_by_id(connection, &project_ref, &resource_ref, &attempt_id)
            .map_err(|_| SqliteStoreError::MigrationDrift)?
            .ok_or(SqliteStoreError::MigrationDrift)?;
        if version == 16 {
            validate_stored_attempt_v16(connection, stored)
        } else {
            validate_stored_attempt(connection, stored)
        }
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    }
    verify_phase7_nonce_records_v1(connection)?;
    verify_phase7_consumption_records_v1(connection)?;
    Ok(())
}

pub(super) fn has_legacy_phase7_evidence_v16(
    connection: &Connection,
) -> Result<bool, SqliteStoreError> {
    connection
        .query_row("SELECT count(*) FROM lnsat_phase7_entities", [], |row| {
            row.get::<_, i64>(0)
        })
        .map(|count| count != 0)
        .map_err(|_| SqliteStoreError::MigrationDrift)
}

fn verify_index_names(connection: &Connection, version: i64) -> Result<(), SqliteStoreError> {
    let mut statement = connection
        .prepare(
            "SELECT name FROM sqlite_schema
             WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
             ORDER BY name",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let names = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let expected_indexes: &[&str] = match version {
        16 => &REQUIRED_INDEXES_V16,
        17 => &REQUIRED_INDEXES_V17,
        _ => return Err(SqliteStoreError::MigrationDrift),
    };
    let expected = expected_indexes
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    if names != expected {
        return Err(SqliteStoreError::MigrationDrift);
    }
    Ok(())
}

fn verify_schema_definition(
    connection: &Connection,
    version: i64,
    object_type: &str,
    name: &str,
) -> Result<(), SqliteStoreError> {
    let stored = connection
        .query_row(
            "SELECT sql FROM sqlite_schema WHERE type = ?1 AND name = ?2",
            params![object_type, name],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let expected = migration_schema_statement(version, object_type, name)
        .ok_or(SqliteStoreError::MigrationDrift)?;
    if normalized_statement(&stored) != expected {
        return Err(SqliteStoreError::MigrationDrift);
    }
    Ok(())
}

fn migration_schema_statement(version: i64, object_type: &str, name: &str) -> Option<String> {
    let prefixes = if object_type == "table" {
        vec![format!("CREATE TABLE {name} ")]
    } else if object_type == "index" {
        vec![
            format!("CREATE INDEX {name} "),
            format!("CREATE UNIQUE INDEX {name} "),
        ]
    } else {
        return None;
    };
    let migrations: &[&str] = match version {
        16 => &[MIGRATION_0016_SQL],
        17 => &[MIGRATION_0017_SQL, MIGRATION_0016_SQL],
        _ => return None,
    };
    for migration in migrations {
        let normalized = normalize_sql(migration);
        for prefix in &prefixes {
            if let Some(start) = normalized.find(prefix) {
                let statement = &normalized[start..];
                let end = statement.find(';')?;
                return Some(normalized_statement(&statement[..end]));
            }
        }
    }
    None
}

fn normalized_statement(statement: &str) -> String {
    normalize_sql(statement.trim().trim_end_matches(';'))
}

fn verify_entity_correspondence(connection: &Connection) -> Result<(), SqliteStoreError> {
    let audit_count = connection
        .query_row(
            "SELECT count(*) FROM lnsat_phase7_audit_bindings",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let entity_count = connection
        .query_row("SELECT count(*) FROM lnsat_phase7_entities", [], |row| {
            row.get::<_, i64>(0)
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    if audit_count != entity_count {
        return Err(SqliteStoreError::MigrationDrift);
    }
    for (kind, table, id_column) in PHASE7_ENTITY_TABLES {
        let entity_count = connection
            .query_row(
                "SELECT count(*) FROM lnsat_phase7_entities WHERE entity_kind = ?1",
                [kind],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
        let record_count = connection
            .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                row.get::<_, i64>(0)
            })
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
        if entity_count != record_count {
            return Err(SqliteStoreError::MigrationDrift);
        }
        let missing = connection
            .query_row(
                &format!(
                    "SELECT count(*)
                     FROM lnsat_phase7_entities AS entity
                     LEFT JOIN {table} AS record
                       ON record.{id_column} = entity.entity_id
                     WHERE entity.entity_kind = ?1
                       AND record.{id_column} IS NULL"
                ),
                [kind],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
        if missing != 0 {
            return Err(SqliteStoreError::MigrationDrift);
        }
    }
    Ok(())
}

fn validate_prepare_input(
    input: &Phase7AuthorizationAttemptPrepareInputV1<'_>,
) -> Result<(), Phase7PersistenceErrorV1> {
    if !bounded_reference(input.project_ref)
        || !is_valid_reference_v1(input.project_ref)
        || !valid_prefixed_id(input.approval_decision_id, "apd_")
    {
        return Err(Phase7PersistenceErrorV1::InvalidInput);
    }
    Ok(())
}

fn read_approved_source(
    connection: &Connection,
    project_ref: &str,
    approval_decision_id: &str,
) -> Result<Option<ApprovedSource>, Phase7PersistenceErrorV1> {
    let Some(decision_row) =
        select_approval_decision_by_project(connection, project_ref, approval_decision_id)
            .map_err(map_approval_decision_source_error)?
    else {
        return Ok(None);
    };
    let decision_record = decode_approval_decision_record(connection, &decision_row)
        .map_err(map_approval_decision_source_error)?;
    let decision = &decision_record.decision;
    if decision.decision.as_str() != "approved"
        || !decision.approval_gate_satisfied
        || decision.execution_authorized
    {
        return Ok(None);
    }

    let request_row = select_approval_request_by_project(
        connection,
        project_ref,
        &decision.approval_request_ref.approval_request_id,
    )
    .map_err(map_approval_request_source_error)?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let request_record = decode_approval_request_record(connection, &request_row)
        .map_err(map_approval_request_source_error)?;
    let request = &request_record.request;

    let policy_row = select_policy_by_project(
        connection,
        project_ref,
        &request.policy_decision_ref.decision_id,
    )
    .map_err(map_policy_source_error)?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let policy_record =
        decode_policy_record(connection, &policy_row).map_err(map_policy_source_error)?;
    let policy = &policy_record.decision;
    if policy.decision.as_str() != "approval_required" || !policy.requires_approval {
        return Ok(None);
    }

    let packet_row =
        select_packet_by_project(connection, project_ref, &policy.packet_ref.packet_id)
            .map_err(map_packet_source_error)?
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let packet_record =
        decode_packet_record(connection, &packet_row).map_err(map_packet_source_error)?;

    if decision.approval_request_ref.policy_decision_id != policy.decision_id
        || request.policy_decision_ref.decision_id != policy.decision_id
        || request.policy_decision_ref.packet_hash != packet_record.packet_sha256
        || policy.packet_ref.packet_hash != packet_record.packet_sha256
        || request.project_ref != policy.project_ref
        || policy.project_ref != packet_record.packet.project_ref
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }

    Ok(Some(ApprovedSource {
        approval_decision_id: decision.approval_decision_id.clone(),
        approval_request_id: request.approval_request_id.clone(),
        policy_decision_id: policy.decision_id.clone(),
        packet_id: packet_record.packet.packet_id.clone(),
        packet_sha256: packet_record.packet_sha256.clone(),
        canonical_packet: packet_record.canonical_packet.clone(),
        project_ref: packet_record.packet.project_ref.clone(),
        requester_ref: request.requester_ref.clone(),
        requester_session_ref: request.session_ref.clone(),
        approver_ref: decision.approver_ref.clone(),
        approver_session_ref: decision.approver_session_ref.clone(),
        decided_at: decision.decided_at.clone(),
        decision_expires_at: decision.expires_at.clone(),
        request_expires_at: request.expires_at.clone(),
        policy_expires_at: policy.expires_at.clone(),
        packet_expires_at: packet_record.packet.expires_at.clone(),
    }))
}

fn map_approval_decision_source_error(
    error: ApprovalDecisionStoreErrorV1,
) -> Phase7PersistenceErrorV1 {
    match error {
        ApprovalDecisionStoreErrorV1::PersistenceFailed => {
            Phase7PersistenceErrorV1::PersistenceFailed
        }
        ApprovalDecisionStoreErrorV1::EvidenceDrift
        | ApprovalDecisionStoreErrorV1::InvalidDecision
        | ApprovalDecisionStoreErrorV1::DecisionIdentityConflict
        | ApprovalDecisionStoreErrorV1::AuthorizationRejected => {
            Phase7PersistenceErrorV1::EvidenceDrift
        }
    }
}

fn map_approval_request_source_error(
    error: ApprovalRequestStoreErrorV1,
) -> Phase7PersistenceErrorV1 {
    match error {
        ApprovalRequestStoreErrorV1::PersistenceFailed => {
            Phase7PersistenceErrorV1::PersistenceFailed
        }
        ApprovalRequestStoreErrorV1::EvidenceDrift
        | ApprovalRequestStoreErrorV1::InvalidRequest
        | ApprovalRequestStoreErrorV1::RequestIdentityConflict
        | ApprovalRequestStoreErrorV1::AuthorizationRejected => {
            Phase7PersistenceErrorV1::EvidenceDrift
        }
    }
}

fn map_policy_source_error(error: PolicyStoreErrorV1) -> Phase7PersistenceErrorV1 {
    match error {
        PolicyStoreErrorV1::PersistenceFailed => Phase7PersistenceErrorV1::PersistenceFailed,
        PolicyStoreErrorV1::EvidenceDrift
        | PolicyStoreErrorV1::InvalidDecision
        | PolicyStoreErrorV1::DecisionIdentityConflict => Phase7PersistenceErrorV1::EvidenceDrift,
    }
}

fn map_packet_source_error(error: PacketStoreErrorV1) -> Phase7PersistenceErrorV1 {
    match error {
        PacketStoreErrorV1::PersistenceFailed => Phase7PersistenceErrorV1::PersistenceFailed,
        PacketStoreErrorV1::EvidenceDrift
        | PacketStoreErrorV1::InvalidPacket
        | PacketStoreErrorV1::IdempotencyConflict
        | PacketStoreErrorV1::PacketIdentityConflict => Phase7PersistenceErrorV1::EvidenceDrift,
    }
}

fn build_record(
    source: &ApprovedSource,
    derived: &DerivedExecutionRequestV1,
    requested_at: &str,
    expires_at: &str,
    idempotency_key: &str,
) -> Phase7AuthorizationAttemptRecordV1 {
    let authorization_attempt_id = identifier(
        "aat_",
        AUTHORIZATION_ATTEMPT_ID_DOMAIN,
        &[derived.request_digest.as_slice()],
    );
    let audit_binding_id = identifier(
        "p7a_",
        AUTHORIZATION_ATTEMPT_AUDIT_ID_DOMAIN,
        &[authorization_attempt_id.as_bytes()],
    );
    let mut record = Phase7AuthorizationAttemptRecordV1 {
        authorization_attempt_id,
        audit_binding_id,
        project_ref: source.project_ref.clone(),
        resource_ref: derived.request.resource_ref.clone(),
        approval_decision_id: source.approval_decision_id.clone(),
        approval_request_id: source.approval_request_id.clone(),
        policy_decision_id: source.policy_decision_id.clone(),
        packet_id: source.packet_id.clone(),
        packet_sha256: source.packet_sha256.clone(),
        requester_ref: source.requester_ref.clone(),
        requester_session_ref: source.requester_session_ref.clone(),
        approver_ref: source.approver_ref.clone(),
        approver_session_ref: source.approver_session_ref.clone(),
        idempotency_key: idempotency_key.to_owned(),
        request_digest: derived.request_digest,
        binding_digest: [0; 32],
        action_digest: derived.action_digest,
        target_digest: derived.target_digest,
        configuration_digest: derived.configuration_digest,
        adapter_ref: format!(
            "{}@{}",
            derived.request.adapter.adapter_ref, derived.request.adapter.version
        ),
        executable_digest: derived.executable_digest,
        audience: derived.request.audience.clone(),
        requested_at: requested_at.to_owned(),
        expires_at: expires_at.to_owned(),
        result_status: "persistence_prepared".to_owned(),
        execution_authorized: false,
    };
    record.binding_digest = authorization_binding_digest(&record);
    record
}

fn effective_expiry(source: &ApprovedSource) -> Result<String, Phase7PersistenceErrorV1> {
    let mut selected = source.packet_expires_at.as_str();
    let mut selected_millis = canonical_utc_timestamp_millis_v1(selected)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    for candidate in [
        source.policy_expires_at.as_str(),
        source.request_expires_at.as_str(),
        source.decision_expires_at.as_str(),
    ] {
        let candidate_millis = canonical_utc_timestamp_millis_v1(candidate)
            .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
        if candidate_millis < selected_millis {
            selected = candidate;
            selected_millis = candidate_millis;
        }
    }
    Ok(selected.to_owned())
}

fn insert_attempt(
    transaction: &Transaction<'_>,
    record: &Phase7AuthorizationAttemptRecordV1,
) -> Result<(), Phase7PersistenceErrorV1> {
    transaction
        .execute(
            "INSERT INTO lnsat_authorization_attempts (
                authorization_attempt_id, entity_kind, project_ref, resource_ref,
                approval_decision_id, approval_request_id, policy_decision_id,
                packet_id, packet_sha256, requester_ref, requester_session_ref,
                approver_ref, approver_session_ref, idempotency_key,
                request_digest, binding_digest, action_digest, target_digest,
                configuration_digest, adapter_ref, executable_digest, audience,
                requested_at, expires_at, result_status, execution_authorized
             ) VALUES (
                ?1, 'authorization_attempt', ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
                ?20, ?21, ?22, ?23, ?24, 0
             )",
            params![
                &record.authorization_attempt_id,
                &record.project_ref,
                &record.resource_ref,
                &record.approval_decision_id,
                &record.approval_request_id,
                &record.policy_decision_id,
                &record.packet_id,
                &record.packet_sha256,
                &record.requester_ref,
                &record.requester_session_ref,
                &record.approver_ref,
                &record.approver_session_ref,
                &record.idempotency_key,
                record.request_digest.as_slice(),
                record.binding_digest.as_slice(),
                record.action_digest.as_slice(),
                record.target_digest.as_slice(),
                record.configuration_digest.as_slice(),
                &record.adapter_ref,
                record.executable_digest.as_slice(),
                &record.audience,
                &record.requested_at,
                &record.expires_at,
                &record.result_status,
            ],
        )
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    Ok(())
}

fn select_attempt_by_idempotency(
    connection: &Connection,
    project_ref: &str,
    idempotency_key: &str,
) -> Result<Option<StoredAttempt>, Phase7PersistenceErrorV1> {
    select_stored_attempt(
        connection,
        "attempt.project_ref = ?1 AND attempt.idempotency_key = ?2",
        params![project_ref, idempotency_key],
    )
}

fn select_attempt_by_id(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    attempt_id: &str,
) -> Result<Option<StoredAttempt>, Phase7PersistenceErrorV1> {
    select_stored_attempt(
        connection,
        "attempt.project_ref = ?1
         AND attempt.resource_ref = ?2
         AND attempt.authorization_attempt_id = ?3",
        params![project_ref, resource_ref, attempt_id],
    )
}

fn select_stored_attempt<P: rusqlite::Params>(
    connection: &Connection,
    predicate: &str,
    parameters: P,
) -> Result<Option<StoredAttempt>, Phase7PersistenceErrorV1> {
    let sql = format!(
        "SELECT attempt.authorization_attempt_id,
                entity.audit_binding_id,
                attempt.project_ref,
                attempt.resource_ref,
                attempt.approval_decision_id,
                attempt.approval_request_id,
                attempt.policy_decision_id,
                attempt.packet_id,
                attempt.packet_sha256,
                attempt.requester_ref,
                attempt.requester_session_ref,
                attempt.approver_ref,
                attempt.approver_session_ref,
                attempt.idempotency_key,
                attempt.request_digest,
                attempt.binding_digest,
                attempt.action_digest,
                attempt.target_digest,
                attempt.configuration_digest,
                attempt.adapter_ref,
                attempt.executable_digest,
                attempt.audience,
                attempt.requested_at,
                attempt.expires_at,
                attempt.result_status,
                attempt.execution_authorized,
                entity.record_digest,
                entity.created_at,
                audit.event_kind,
                audit.authority_effect,
                audit.recorded_at
         FROM lnsat_authorization_attempts AS attempt
         JOIN lnsat_phase7_entities AS entity
           ON entity.entity_id = attempt.authorization_attempt_id
          AND entity.entity_kind = attempt.entity_kind
          AND entity.project_ref = attempt.project_ref
          AND entity.resource_ref = attempt.resource_ref
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
            Ok(StoredAttempt {
                record: Phase7AuthorizationAttemptRecordV1 {
                    authorization_attempt_id: row.get(0)?,
                    audit_binding_id: row.get(1)?,
                    project_ref: row.get(2)?,
                    resource_ref: row.get(3)?,
                    approval_decision_id: row.get(4)?,
                    approval_request_id: row.get(5)?,
                    policy_decision_id: row.get(6)?,
                    packet_id: row.get(7)?,
                    packet_sha256: row.get(8)?,
                    requester_ref: row.get(9)?,
                    requester_session_ref: row.get(10)?,
                    approver_ref: row.get(11)?,
                    approver_session_ref: row.get(12)?,
                    idempotency_key: row.get(13)?,
                    request_digest: blob_32(row.get(14)?)?,
                    binding_digest: blob_32(row.get(15)?)?,
                    action_digest: blob_32(row.get(16)?)?,
                    target_digest: blob_32(row.get(17)?)?,
                    configuration_digest: blob_32(row.get(18)?)?,
                    adapter_ref: row.get(19)?,
                    executable_digest: blob_32(row.get(20)?)?,
                    audience: row.get(21)?,
                    requested_at: row.get(22)?,
                    expires_at: row.get(23)?,
                    result_status: row.get(24)?,
                    execution_authorized: row.get::<_, i64>(25)? != 0,
                },
                stored_record_digest: blob_32(row.get(26)?)?,
                entity_created_at: row.get(27)?,
                audit_event_kind: row.get(28)?,
                audit_authority_effect: row.get(29)?,
                audit_recorded_at: row.get(30)?,
            })
        })
        .optional()
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

fn validate_stored_attempt(
    connection: &Connection,
    stored: StoredAttempt,
) -> Result<Phase7AuthorizationAttemptRecordV1, Phase7PersistenceErrorV1> {
    let record = stored.record;
    if record.execution_authorized
        || record.result_status != "persistence_prepared"
        || stored.entity_created_at != record.requested_at
        || stored.audit_event_kind != "persistence_prepared"
        || stored.audit_authority_effect != "none"
        || stored.audit_recorded_at != record.requested_at
        || authorization_binding_digest(&record) != record.binding_digest
        || authorization_attempt_record_digest(&record) != stored.stored_record_digest
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    if !valid_prefixed_id(&record.authorization_attempt_id, "aat_")
        || !valid_prefixed_id(&record.audit_binding_id, "p7a_")
        || !bounded_reference(&record.project_ref)
        || !is_valid_reference_v1(&record.project_ref)
        || !bounded_reference(&record.resource_ref)
        || !is_valid_reference_v1(&record.resource_ref)
        || !valid_prefixed_id(&record.approval_decision_id, "apd_")
        || !valid_prefixed_id(&record.approval_request_id, "apr_")
        || !valid_prefixed_id(&record.policy_decision_id, "pol_")
        || !bounded_reference(&record.packet_id)
        || !valid_sha256_text(&record.packet_sha256)
        || !bounded_reference(&record.idempotency_key)
        || !bounded_reference(&record.adapter_ref)
        || !bounded_reference(&record.audience)
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let source = read_approved_source(
        connection,
        &record.project_ref,
        &record.approval_decision_id,
    )
    .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let requested_at_millis = canonical_utc_timestamp_millis_v1(&record.requested_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let decided_at = canonical_utc_timestamp_millis_v1(&source.decided_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let expires_at = effective_expiry(&source)?;
    let source_expires_at = canonical_utc_timestamp_millis_v1(&expires_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    if requested_at_millis < decided_at || requested_at_millis >= source_expires_at {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let packet = parse_packet_envelope_v1(source.canonical_packet.as_bytes())
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    let derived = derive_execution_request_v1(&ExecutionRequestV1Input {
        packet: &packet,
        packet_sha256: &source.packet_sha256,
        policy_decision_id: &source.policy_decision_id,
        approval_request_id: &source.approval_request_id,
        approval_decision_id: &source.approval_decision_id,
        requester_ref: &source.requester_ref,
        requester_session_ref: &source.requester_session_ref,
        approver_ref: &source.approver_ref,
        approver_session_ref: &source.approver_session_ref,
        prepared_at: &record.requested_at,
        expires_at: &expires_at,
    })
    .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    let idempotency_key = identifier(
        "p7i_",
        AUTHORIZATION_ATTEMPT_IDEMPOTENCY_DOMAIN,
        &[
            source.approval_decision_id.as_bytes(),
            source.packet_sha256.as_bytes(),
        ],
    );
    let expected = build_record(
        &source,
        &derived,
        &record.requested_at,
        &expires_at,
        &idempotency_key,
    );
    if expected != record {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(record)
}

fn validate_stored_attempt_v16(
    connection: &Connection,
    stored: StoredAttempt,
) -> Result<Phase7AuthorizationAttemptRecordV1, Phase7PersistenceErrorV1> {
    let record = stored.record;
    if record.execution_authorized
        || record.result_status != "persistence_prepared"
        || stored.entity_created_at != record.requested_at
        || stored.audit_event_kind != "persistence_prepared"
        || stored.audit_authority_effect != "none"
        || stored.audit_recorded_at != record.requested_at
        || authorization_binding_digest(&record) != record.binding_digest
        || authorization_attempt_record_digest(&record) != stored.stored_record_digest
        || !valid_prefixed_id(&record.authorization_attempt_id, "aat_")
        || !valid_prefixed_id(&record.audit_binding_id, "p7a_")
        || !bounded_reference(&record.project_ref)
        || !is_valid_reference_v1(&record.project_ref)
        || !bounded_reference(&record.resource_ref)
        || !is_valid_reference_v1(&record.resource_ref)
        || !valid_prefixed_id(&record.approval_decision_id, "apd_")
        || !valid_prefixed_id(&record.approval_request_id, "apr_")
        || !valid_prefixed_id(&record.policy_decision_id, "pol_")
        || !bounded_reference(&record.packet_id)
        || !valid_sha256_text(&record.packet_sha256)
        || !bounded_reference(&record.idempotency_key)
        || !bounded_reference(&record.adapter_ref)
        || !bounded_reference(&record.audience)
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let requested_at = canonical_utc_timestamp_millis_v1(&record.requested_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let expires_at = canonical_utc_timestamp_millis_v1(&record.expires_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    if requested_at >= expires_at {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    let source = read_approved_source(
        connection,
        &record.project_ref,
        &record.approval_decision_id,
    )
    .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?
    .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let decided_at = canonical_utc_timestamp_millis_v1(&source.decided_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let source_expires_at = canonical_utc_timestamp_millis_v1(&source.decision_expires_at)
        .ok_or(Phase7PersistenceErrorV1::EvidenceDrift)?;
    let packet = parse_packet_envelope_v1(source.canonical_packet.as_bytes())
        .map_err(|_| Phase7PersistenceErrorV1::EvidenceDrift)?;
    if source.project_ref != record.project_ref
        || source.approval_decision_id != record.approval_decision_id
        || source.approval_request_id != record.approval_request_id
        || source.policy_decision_id != record.policy_decision_id
        || source.packet_id != record.packet_id
        || source.packet_sha256 != record.packet_sha256
        || source.requester_ref != record.requester_ref
        || source.requester_session_ref != record.requester_session_ref
        || source.approver_ref != record.approver_ref
        || source.approver_session_ref != record.approver_session_ref
        || source.decision_expires_at != record.expires_at
        || !packet
            .resource_refs
            .iter()
            .any(|resource_ref| resource_ref == &record.resource_ref)
        || requested_at < decided_at
        || requested_at >= source_expires_at
    {
        return Err(Phase7PersistenceErrorV1::EvidenceDrift);
    }
    Ok(record)
}

pub(super) fn read_validated_attempt_by_id(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    attempt_id: &str,
) -> Result<Option<Phase7AuthorizationAttemptRecordV1>, Phase7PersistenceErrorV1> {
    let version = connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)?;
    select_attempt_by_id(connection, project_ref, resource_ref, attempt_id)?
        .map(|stored| {
            if version == 16 {
                validate_stored_attempt_v16(connection, stored)
            } else {
                validate_stored_attempt(connection, stored)
            }
        })
        .transpose()
}

pub(super) fn phase7_entity_exists(
    connection: &Connection,
    entity_id: &str,
) -> Result<bool, Phase7PersistenceErrorV1> {
    connection
        .query_row(
            "SELECT 1 FROM lnsat_phase7_entities WHERE entity_id = ?1",
            [entity_id],
            |_| Ok(()),
        )
        .optional()
        .map(|value| value.is_some())
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

pub(super) fn audit_binding_exists(
    connection: &Connection,
    audit_binding_id: &str,
) -> Result<bool, Phase7PersistenceErrorV1> {
    connection
        .query_row(
            "SELECT 1 FROM lnsat_phase7_audit_bindings WHERE audit_binding_id = ?1",
            [audit_binding_id],
            |_| Ok(()),
        )
        .optional()
        .map(|value| value.is_some())
        .map_err(|_| Phase7PersistenceErrorV1::PersistenceFailed)
}

fn authorization_binding_digest(record: &Phase7AuthorizationAttemptRecordV1) -> [u8; 32] {
    digest_fields(
        AUTHORIZATION_BINDING_DIGEST_DOMAIN,
        &[
            record.project_ref.as_bytes(),
            record.resource_ref.as_bytes(),
            record.approval_decision_id.as_bytes(),
            record.approval_request_id.as_bytes(),
            record.policy_decision_id.as_bytes(),
            record.packet_id.as_bytes(),
            record.packet_sha256.as_bytes(),
            record.requester_ref.as_bytes(),
            record.requester_session_ref.as_bytes(),
            record.approver_ref.as_bytes(),
            record.approver_session_ref.as_bytes(),
            &record.action_digest,
            &record.target_digest,
            &record.configuration_digest,
            record.adapter_ref.as_bytes(),
            &record.executable_digest,
            record.audience.as_bytes(),
            record.expires_at.as_bytes(),
        ],
    )
}

fn authorization_attempt_record_digest(record: &Phase7AuthorizationAttemptRecordV1) -> [u8; 32] {
    digest_fields(
        AUTHORIZATION_ATTEMPT_DIGEST_DOMAIN,
        &[
            record.authorization_attempt_id.as_bytes(),
            record.audit_binding_id.as_bytes(),
            record.project_ref.as_bytes(),
            record.resource_ref.as_bytes(),
            record.idempotency_key.as_bytes(),
            &record.request_digest,
            &record.binding_digest,
            record.requested_at.as_bytes(),
            record.expires_at.as_bytes(),
            record.result_status.as_bytes(),
            b"execution_authorized:false",
        ],
    )
}

pub(super) fn digest_fields(domain: &str, fields: &[&[u8]]) -> [u8; 32] {
    let mut digest = Sha256::new();
    digest.update(domain.as_bytes());
    digest.update([0]);
    for field in fields {
        digest.update(u32::try_from(field.len()).unwrap_or(u32::MAX).to_be_bytes());
        digest.update(field);
    }
    digest.finalize().into()
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

fn canonical_system_time_v1(value: SystemTime) -> Result<String, Phase7PersistenceErrorV1> {
    let duration = value
        .duration_since(UNIX_EPOCH)
        .map_err(|_| Phase7PersistenceErrorV1::ClockRejected)?;
    let total_millis =
        u64::try_from(duration.as_millis()).map_err(|_| Phase7PersistenceErrorV1::ClockRejected)?;
    let total_seconds = total_millis / 1_000;
    let millisecond = total_millis % 1_000;
    let days = total_seconds / 86_400;
    let seconds_of_day = total_seconds % 86_400;
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    let (year, month, day) =
        civil_date_from_unix_days_v1(days).ok_or(Phase7PersistenceErrorV1::ClockRejected)?;
    if year > 9_999 {
        return Err(Phase7PersistenceErrorV1::ClockRejected);
    }
    let canonical = format!(
        "{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.{millisecond:03}Z"
    );
    canonical_utc_timestamp_millis_v1(&canonical)
        .map(|_| canonical)
        .ok_or(Phase7PersistenceErrorV1::ClockRejected)
}

fn civil_date_from_unix_days_v1(days: u64) -> Option<(u64, u64, u64)> {
    let shifted = i64::try_from(days).ok()?.checked_add(719_468)?;
    let era = shifted / 146_097;
    let day_of_era = shifted - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    Some((
        u64::try_from(year).ok()?,
        u64::try_from(month).ok()?,
        u64::try_from(day).ok()?,
    ))
}

pub(super) fn blob_32(value: Vec<u8>) -> rusqlite::Result<[u8; 32]> {
    value.try_into().map_err(|value: Vec<u8>| {
        rusqlite::Error::FromSqlConversionFailure(
            value.len(),
            rusqlite::types::Type::Blob,
            std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "expected exact 32-byte digest",
            )
            .into(),
        )
    })
}

pub(super) fn valid_prefixed_id(value: &str, prefix: &str) -> bool {
    value.len() == 68
        && value.starts_with(prefix)
        && value[prefix.len()..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn valid_sha256_text(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value[7..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

pub(super) fn bounded_reference(value: &str) -> bool {
    !value.is_empty() && value.len() <= 256 && !value.contains('\0')
}
