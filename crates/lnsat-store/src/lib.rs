#![forbid(unsafe_code)]

//! Embedded `SQLite` durability foundation for one local LNSAT deployment.

use core::fmt;
use core::fmt::Write as _;
use lnsat_auth::{
    LOCAL_PASSWORD_PROFILE_V1, LOCAL_SESSION_CSRF_PROFILE_V1, LOCAL_SESSION_TOKEN_PROFILE_V1,
    LocalPasswordErrorV1, LocalSessionSecretsV1, create_local_password_verifier_v1,
    create_local_session_secrets_v1, local_session_id_from_token_v1,
    validate_local_password_verifier_v1, validate_local_session_digest_v1,
    verify_local_password_v1, verify_local_session_csrf_v1, verify_local_session_token_v1,
};
use lnsat_contracts::{
    ApprovalDecisionV1, ApprovalDecisionV1Input, ApprovalDecisionV1Kind, ApprovalDecisionV1Reason,
    ApprovalRequestV1, AuditEventV1, AuditEventV1Input, AuditEventV1Type, PacketEnvelopeV1,
    PolicyDecisionV1, canonical_utc_timestamp_millis_v1, canonicalize_packet_envelope_v1,
    create_approval_request_v1, create_audit_event_v1, decide_approval_request_v1,
    decide_packet_envelope_policy_v1, hash_packet_envelope_v1, is_canonical_utc_timestamp_v1,
    is_valid_reference_v1, parse_packet_envelope_v1,
};
use rusqlite::{
    Connection, OpenFlags, OptionalExtension, TransactionBehavior,
    backup::{Backup, StepResult},
    config::DbConfig::{
        SQLITE_DBCONFIG_DEFENSIVE, SQLITE_DBCONFIG_DQS_DDL, SQLITE_DBCONFIG_DQS_DML,
        SQLITE_DBCONFIG_TRUSTED_SCHEMA,
    },
    params,
};
use sha2::{Digest, Sha256};
use std::fs::{self, File, OpenOptions, TryLockError, symlink_metadata};
use std::io::{self, BufReader, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

mod phase7_consumption;
mod phase7_git_adapter;
mod phase7_nonce;
mod phase7_persistence;

pub use phase7_consumption::{
    PHASE7_AUTHORIZATION_TTL_SECONDS_V1, PHASE7_CAPABILITY_BYTES_V1,
    PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1, Phase7CapabilityConsumptionRecordV1,
    Phase7CapabilityConsumptionWriteV1, Phase7CapabilityRedemptionInputV1,
    Phase7CapabilitySecretV1, Phase7ExecutionAuthorizationIssueInputV1,
    Phase7ExecutionAuthorizationIssueV1, Phase7ExecutionAuthorizationRecordV1,
    Phase7ExecutionAuthorizationTransitionInputV1, Phase7ExecutionAuthorizationTransitionV1,
    Phase7ExecutionCapabilityV1, Phase7ExecutionCapabilityWireV1,
};
pub use phase7_git_adapter::{
    PHASE7_GIT_ADAPTER_REF_V1, PHASE7_GIT_ADAPTER_VERSION_V1, PHASE7_GIT_FIXTURE_MARKER_V1,
    PHASE8_GIT_MAX_STDOUT_BYTES_V1, PHASE8_GIT_PROCESS_DEADLINE_SECONDS_V1,
    Phase7GitAdapterErrorV1, Phase7GitCommitDispatchInputV1, Phase7GitCommitMetadataV1,
    Phase7GitCommitReceiptV1, Phase7GitCommitWriteV1, Phase7GitRepositoryIdentityV1,
    Phase8OperationAttemptReadbackV1, Phase8OperationReadbackV1, Phase8RuntimeCompositionInputV1,
    Phase8RuntimeCompositionWriteV1, inspect_phase7_disposable_git_repository_v1,
    phase7_git_adapter_configuration_digest_v1, phase7_git_executable_digest_v1,
};
pub use phase7_nonce::{
    PHASE7_NONCE_BYTES_V1, PHASE7_NONCE_TTL_SECONDS_V1, Phase7AuthorizationNonceCancelInputV1,
    Phase7AuthorizationNonceIssueInputV1, Phase7AuthorizationNonceIssueV1,
    Phase7AuthorizationNonceRecordV1, Phase7AuthorizationNonceSecretV1,
    Phase7AuthorizationNonceTransitionV1,
};
pub use phase7_persistence::{
    Phase7AuthorizationAttemptPrepareInputV1, Phase7AuthorizationAttemptRecordV1,
    Phase7AuthorizationAttemptWriteV1, Phase7PersistenceErrorV1,
};

const LOCAL_AUTHENTICATION_DUMMY_VERIFIER_V1: &str = "$argon2id$v=19$m=19456,t=2,p=1$JQmyCWSWXxw1ztMYM0jTFw$MzT/LQPXJ7O+TpEyMYNbF37vM7OGLWJ0ccEMV4n6Ly0";
use std::time::Duration;

#[cfg(unix)]
use std::os::unix::ffi::OsStrExt as _;
#[cfg(unix)]
use std::os::unix::fs::{MetadataExt as _, OpenOptionsExt as _, PermissionsExt as _};
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt as _;

/// Current ordered `SQLite` schema version.
pub const SQLITE_SCHEMA_VERSION: i64 = 17;

/// Bounded wait for a competing local `SQLite` writer.
pub const SQLITE_BUSY_TIMEOUT: Duration = Duration::from_secs(5);

const SQLITE_BACKUP_PAGES_PER_STEP: i32 = 128;
const SQLITE_BACKUP_RETRY_PAUSE: Duration = Duration::from_millis(10);
const SQLITE_BACKUP_BUSY_RETRY_LIMIT: u32 = 500;
const FILE_DIGEST_BUFFER_BYTES: usize = 64 * 1024;
static NEXT_TEMPORARY_FILE: AtomicU64 = AtomicU64::new(1);

const CONTRACT_VERSION: &str = "lnsat.contracts.v1_0";
const STORAGE_KIND: &str = "sqlite_single_node";
const RECOVERY_INSPECTION_EVENT_SCHEMA_V1: &str =
    "lnsat.sqlite_recovery_inspection_event.schema.v1_0";
const RETENTION_CLASS_CONTROL_PLANE: &str = "control_plane";
const RETENTION_RECORD_FAMILIES_V7: [&str; 7] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
];
const RETENTION_RECORD_FAMILIES_V8: [&str; 8] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V9: [&str; 10] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "local_identity",
    "local_password_credential",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V10: [&str; 12] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "local_identity",
    "local_password_credential",
    "local_session",
    "local_session_revocation",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V11: [&str; 14] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "local_identity",
    "local_password_credential",
    "local_session",
    "local_session_activity",
    "local_session_revocation",
    "local_session_rotation",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V12: [&str; 15] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "local_identity",
    "local_identity_status",
    "local_password_credential",
    "local_session",
    "local_session_activity",
    "local_session_revocation",
    "local_session_rotation",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V13: [&str; 16] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "local_identity",
    "local_identity_event",
    "local_identity_status",
    "local_password_credential",
    "local_session",
    "local_session_activity",
    "local_session_revocation",
    "local_session_rotation",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V14: [&str; 17] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "local_identity",
    "local_identity_event",
    "local_identity_status",
    "local_password_credential",
    "local_session",
    "local_session_activity",
    "local_session_event",
    "local_session_revocation",
    "local_session_rotation",
    "packet_envelope",
    "packet_resource_ref",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V15: [&str; 17] = RETENTION_RECORD_FAMILIES_V14;
const RETENTION_RECORD_FAMILIES_V16: [&str; 28] = [
    "approval_decision",
    "approval_request",
    "audit_event",
    "audit_event_reason_code",
    "authorization_attempt",
    "authorization_nonce",
    "capability_consumption",
    "execution_authorization",
    "local_identity",
    "local_identity_event",
    "local_identity_status",
    "local_password_credential",
    "local_session",
    "local_session_activity",
    "local_session_event",
    "local_session_revocation",
    "local_session_rotation",
    "operation",
    "operation_attempt",
    "operation_receipt",
    "operation_reconciliation",
    "packet_envelope",
    "packet_resource_ref",
    "phase7_audit_binding",
    "phase7_entity",
    "phase7_state_event",
    "policy_decision",
    "recovery_inspection_event",
];
const RETENTION_RECORD_FAMILIES_V17: [&str; 28] = RETENTION_RECORD_FAMILIES_V16;
/// Minimum accepted idle timeout for authenticated local sessions.
pub const LOCAL_SESSION_IDLE_TIMEOUT_MIN_SECONDS_V1: u32 = 60;
/// Maximum accepted idle timeout for authenticated local sessions.
pub const LOCAL_SESSION_IDLE_TIMEOUT_MAX_SECONDS_V1: u32 = 1_800;
/// Default idle timeout for authenticated local control-plane operations.
pub const LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1: u32 = 900;
/// Minimum interval between durable append-only activity events.
pub const LOCAL_SESSION_ACTIVITY_TOUCH_SECONDS_V1: u64 = 60;
const LOCAL_SESSION_ACTIVITY_MAX_EVENTS_V1: i64 = 61;
const LOCAL_PASSWORD_CREDENTIAL_MAX_VERSION_V1: i64 = 64;
const RETENTION_CANDIDATE_LIMIT_MAX: u32 = 1_024;
const MIGRATION_0016_SQL: &str = include_str!("../migrations/0016_phase7_core_persistence.sql");
const MIGRATION_0017_SQL: &str =
    include_str!("../migrations/0017_phase7_core_semantics_correction.sql");
const MIGRATIONS: [Migration; 17] = [
    Migration {
        version: 1,
        id: "0001_bootstrap",
        sql: include_str!("../migrations/0001_bootstrap.sql"),
    },
    Migration {
        version: 2,
        id: "0002_packet_envelopes",
        sql: include_str!("../migrations/0002_packet_envelopes.sql"),
    },
    Migration {
        version: 3,
        id: "0003_policy_decisions",
        sql: include_str!("../migrations/0003_policy_decisions.sql"),
    },
    Migration {
        version: 4,
        id: "0004_approval_requests",
        sql: include_str!("../migrations/0004_approval_requests.sql"),
    },
    Migration {
        version: 5,
        id: "0005_approval_decisions",
        sql: include_str!("../migrations/0005_approval_decisions.sql"),
    },
    Migration {
        version: 6,
        id: "0006_audit_events",
        sql: include_str!("../migrations/0006_audit_events.sql"),
    },
    Migration {
        version: 7,
        id: "0007_retention_policy",
        sql: include_str!("../migrations/0007_retention_policy.sql"),
    },
    Migration {
        version: 8,
        id: "0008_recovery_inspection_events",
        sql: include_str!("../migrations/0008_recovery_inspection_events.sql"),
    },
    Migration {
        version: 9,
        id: "0009_local_owner_identity",
        sql: include_str!("../migrations/0009_local_owner_identity.sql"),
    },
    Migration {
        version: 10,
        id: "0010_local_sessions",
        sql: include_str!("../migrations/0010_local_sessions.sql"),
    },
    Migration {
        version: 11,
        id: "0011_local_session_lifecycle",
        sql: include_str!("../migrations/0011_local_session_lifecycle.sql"),
    },
    Migration {
        version: 12,
        id: "0012_local_identity_lifecycle",
        sql: include_str!("../migrations/0012_local_identity_lifecycle.sql"),
    },
    Migration {
        version: 13,
        id: "0013_local_identity_audit_events",
        sql: include_str!("../migrations/0013_local_identity_audit_events.sql"),
    },
    Migration {
        version: 14,
        id: "0014_local_session_audit_events",
        sql: include_str!("../migrations/0014_local_session_audit_events.sql"),
    },
    Migration {
        version: 15,
        id: "0015_offline_owner_recovery",
        sql: include_str!("../migrations/0015_offline_owner_recovery.sql"),
    },
    Migration {
        version: 16,
        id: "0016_phase7_core_persistence",
        sql: MIGRATION_0016_SQL,
    },
    Migration {
        version: 17,
        id: "0017_phase7_core_semantics_correction",
        sql: MIGRATION_0017_SQL,
    },
];
const REQUIRED_TABLES_V1: [&str; 2] = ["lnsat_schema_migrations", "lnsat_store_metadata"];
const REQUIRED_TABLES_V2: [&str; 4] = [
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V3: [&str; 5] = [
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V4: [&str; 6] = [
    "lnsat_approval_requests",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V5: [&str; 7] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V6: [&str; 9] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V7: [&str; 10] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V8: [&str; 11] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V9: [&str; 13] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_local_identities",
    "lnsat_local_password_credentials",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V10: [&str; 15] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_local_identities",
    "lnsat_local_password_credentials",
    "lnsat_local_session_revocations",
    "lnsat_local_sessions",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V11: [&str; 17] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_local_identities",
    "lnsat_local_password_credentials",
    "lnsat_local_session_activity_events",
    "lnsat_local_session_revocations",
    "lnsat_local_session_rotations",
    "lnsat_local_sessions",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V12: [&str; 18] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_local_identities",
    "lnsat_local_identity_status_events",
    "lnsat_local_password_credentials",
    "lnsat_local_session_activity_events",
    "lnsat_local_session_revocations",
    "lnsat_local_session_rotations",
    "lnsat_local_sessions",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V13: [&str; 19] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_local_identities",
    "lnsat_local_identity_events",
    "lnsat_local_identity_status_events",
    "lnsat_local_password_credentials",
    "lnsat_local_session_activity_events",
    "lnsat_local_session_revocations",
    "lnsat_local_session_rotations",
    "lnsat_local_sessions",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V14: [&str; 20] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_local_identities",
    "lnsat_local_identity_events",
    "lnsat_local_identity_status_events",
    "lnsat_local_password_credentials",
    "lnsat_local_session_activity_events",
    "lnsat_local_session_events",
    "lnsat_local_session_revocations",
    "lnsat_local_session_rotations",
    "lnsat_local_sessions",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V15: [&str; 20] = REQUIRED_TABLES_V14;
const REQUIRED_TABLES_V16: [&str; 31] = [
    "lnsat_approval_decisions",
    "lnsat_approval_requests",
    "lnsat_audit_event_reason_codes",
    "lnsat_audit_events",
    "lnsat_authorization_attempts",
    "lnsat_authorization_nonces",
    "lnsat_capability_consumptions",
    "lnsat_execution_authorizations",
    "lnsat_local_identities",
    "lnsat_local_identity_events",
    "lnsat_local_identity_status_events",
    "lnsat_local_password_credentials",
    "lnsat_local_session_activity_events",
    "lnsat_local_session_events",
    "lnsat_local_session_revocations",
    "lnsat_local_session_rotations",
    "lnsat_local_sessions",
    "lnsat_operation_attempts",
    "lnsat_operation_receipts",
    "lnsat_operation_reconciliations",
    "lnsat_operations",
    "lnsat_packet_envelopes",
    "lnsat_packet_resource_refs",
    "lnsat_phase7_audit_bindings",
    "lnsat_phase7_entities",
    "lnsat_phase7_state_events",
    "lnsat_policy_decisions",
    "lnsat_recovery_inspection_events",
    "lnsat_retention_policies",
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
];
const REQUIRED_TABLES_V17: [&str; 31] = REQUIRED_TABLES_V16;
const REQUIRED_TRIGGERS_V1: [&str; 0] = [];
const REQUIRED_TRIGGERS_V2: [&str; 4] = [
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
];
const REQUIRED_TRIGGERS_V3: [&str; 6] = [
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
];
const REQUIRED_TRIGGERS_V4: [&str; 8] = [
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
];
const REQUIRED_TRIGGERS_V5: [&str; 10] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
];
const REQUIRED_TRIGGERS_V6: [&str; 14] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
];
const REQUIRED_TRIGGERS_V7: [&str; 16] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V8: [&str; 18] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V9: [&str; 22] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V10: [&str; 26] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_local_session_revocations_reject_delete",
    "lnsat_local_session_revocations_reject_update",
    "lnsat_local_sessions_reject_delete",
    "lnsat_local_sessions_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V11: [&str; 30] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_local_session_activity_events_reject_delete",
    "lnsat_local_session_activity_events_reject_update",
    "lnsat_local_session_revocations_reject_delete",
    "lnsat_local_session_revocations_reject_update",
    "lnsat_local_session_rotations_reject_delete",
    "lnsat_local_session_rotations_reject_update",
    "lnsat_local_sessions_reject_delete",
    "lnsat_local_sessions_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V12: [&str; 32] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_identity_status_events_reject_delete",
    "lnsat_local_identity_status_events_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_local_session_activity_events_reject_delete",
    "lnsat_local_session_activity_events_reject_update",
    "lnsat_local_session_revocations_reject_delete",
    "lnsat_local_session_revocations_reject_update",
    "lnsat_local_session_rotations_reject_delete",
    "lnsat_local_session_rotations_reject_update",
    "lnsat_local_sessions_reject_delete",
    "lnsat_local_sessions_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V13: [&str; 34] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_identity_events_reject_delete",
    "lnsat_local_identity_events_reject_update",
    "lnsat_local_identity_status_events_reject_delete",
    "lnsat_local_identity_status_events_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_local_session_activity_events_reject_delete",
    "lnsat_local_session_activity_events_reject_update",
    "lnsat_local_session_revocations_reject_delete",
    "lnsat_local_session_revocations_reject_update",
    "lnsat_local_session_rotations_reject_delete",
    "lnsat_local_session_rotations_reject_update",
    "lnsat_local_sessions_reject_delete",
    "lnsat_local_sessions_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V14: [&str; 36] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_identity_events_reject_delete",
    "lnsat_local_identity_events_reject_update",
    "lnsat_local_identity_status_events_reject_delete",
    "lnsat_local_identity_status_events_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_local_session_activity_events_reject_delete",
    "lnsat_local_session_activity_events_reject_update",
    "lnsat_local_session_events_reject_delete",
    "lnsat_local_session_events_reject_update",
    "lnsat_local_session_revocations_reject_delete",
    "lnsat_local_session_revocations_reject_update",
    "lnsat_local_session_rotations_reject_delete",
    "lnsat_local_session_rotations_reject_update",
    "lnsat_local_sessions_reject_delete",
    "lnsat_local_sessions_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const REQUIRED_TRIGGERS_V15: [&str; 36] = REQUIRED_TRIGGERS_V14;
const REQUIRED_TRIGGERS_V16: [&str; 58] = [
    "lnsat_approval_decisions_reject_delete",
    "lnsat_approval_decisions_reject_update",
    "lnsat_approval_requests_reject_delete",
    "lnsat_approval_requests_reject_update",
    "lnsat_audit_event_reason_codes_reject_delete",
    "lnsat_audit_event_reason_codes_reject_update",
    "lnsat_audit_events_reject_delete",
    "lnsat_audit_events_reject_update",
    "lnsat_authorization_attempts_reject_delete",
    "lnsat_authorization_attempts_reject_update",
    "lnsat_authorization_nonces_reject_delete",
    "lnsat_authorization_nonces_reject_update",
    "lnsat_capability_consumptions_reject_delete",
    "lnsat_capability_consumptions_reject_update",
    "lnsat_execution_authorizations_reject_delete",
    "lnsat_execution_authorizations_reject_update",
    "lnsat_local_identities_reject_delete",
    "lnsat_local_identities_reject_update",
    "lnsat_local_identity_events_reject_delete",
    "lnsat_local_identity_events_reject_update",
    "lnsat_local_identity_status_events_reject_delete",
    "lnsat_local_identity_status_events_reject_update",
    "lnsat_local_password_credentials_reject_delete",
    "lnsat_local_password_credentials_reject_update",
    "lnsat_local_session_activity_events_reject_delete",
    "lnsat_local_session_activity_events_reject_update",
    "lnsat_local_session_events_reject_delete",
    "lnsat_local_session_events_reject_update",
    "lnsat_local_session_revocations_reject_delete",
    "lnsat_local_session_revocations_reject_update",
    "lnsat_local_session_rotations_reject_delete",
    "lnsat_local_session_rotations_reject_update",
    "lnsat_local_sessions_reject_delete",
    "lnsat_local_sessions_reject_update",
    "lnsat_operation_attempts_reject_delete",
    "lnsat_operation_attempts_reject_update",
    "lnsat_operation_receipts_reject_delete",
    "lnsat_operation_receipts_reject_update",
    "lnsat_operation_reconciliations_reject_delete",
    "lnsat_operation_reconciliations_reject_update",
    "lnsat_operations_reject_delete",
    "lnsat_operations_reject_update",
    "lnsat_packet_envelopes_reject_delete",
    "lnsat_packet_envelopes_reject_update",
    "lnsat_packet_resource_refs_reject_delete",
    "lnsat_packet_resource_refs_reject_update",
    "lnsat_phase7_audit_bindings_reject_delete",
    "lnsat_phase7_audit_bindings_reject_update",
    "lnsat_phase7_entities_reject_delete",
    "lnsat_phase7_entities_reject_update",
    "lnsat_phase7_state_events_reject_delete",
    "lnsat_phase7_state_events_reject_update",
    "lnsat_policy_decisions_reject_delete",
    "lnsat_policy_decisions_reject_update",
    "lnsat_recovery_inspection_events_reject_delete",
    "lnsat_recovery_inspection_events_reject_update",
    "lnsat_retention_policies_reject_delete",
    "lnsat_retention_policies_reject_update",
];
const EXECUTION_AUTHORIZATION_BINDING_TRIGGER_V17: &str =
    "lnsat_execution_authorizations_enforce_attempt_binding";

#[derive(Clone, Copy)]
struct Migration {
    version: i64,
    id: &'static str,
    sql: &'static str,
}

/// Stable fail-closed store initialization errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteStoreError {
    /// No durable file path was supplied.
    PathRequired,
    /// An in-memory database was requested.
    InMemoryPathForbidden,
    /// The final database file entry is a symbolic link.
    SymlinkForbidden,
    /// The path exists but is not a regular file.
    PathNotFile,
    /// The database file could not be created or opened.
    OpenFailed,
    /// Required `SQLite` connection security settings could not be established.
    ConfigurationFailed,
    /// An unversioned nonempty database was supplied.
    UnrecognizedDatabase,
    /// The database schema is newer than this binary.
    UnsupportedSchemaVersion,
    /// An ordered migration could not complete atomically.
    MigrationFailed,
    /// Applied migration or schema evidence differs from the binary.
    MigrationDrift,
    /// `SQLite` integrity or foreign-key verification failed.
    IntegrityCheckFailed,
}

impl SqliteStoreError {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::PathRequired => "sqlite_store.path_required",
            Self::InMemoryPathForbidden => "sqlite_store.in_memory_forbidden",
            Self::SymlinkForbidden => "sqlite_store.symlink_forbidden",
            Self::PathNotFile => "sqlite_store.path_not_file",
            Self::OpenFailed => "sqlite_store.open_failed",
            Self::ConfigurationFailed => "sqlite_store.configuration_failed",
            Self::UnrecognizedDatabase => "sqlite_store.unrecognized_database",
            Self::UnsupportedSchemaVersion => "sqlite_store.unsupported_schema_version",
            Self::MigrationFailed => "sqlite_store.migration_failed",
            Self::MigrationDrift => "sqlite_store.migration_drift",
            Self::IntegrityCheckFailed => "sqlite_store.integrity_check_failed",
        }
    }
}

impl fmt::Display for SqliteStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for SqliteStoreError {}

/// Stable fail-closed errors for daemon exclusion and offline owner recovery.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalOwnerRecoveryErrorV1 {
    /// Database path, file type, permissions, or identity confirmation failed.
    InvalidInput,
    /// Another daemon or recovery process owns the database lease.
    DatabaseBusy,
    /// The supplied authority does not bind this exact database.
    AuthorityRejected,
    /// Stored identity, credential, session, or audit evidence drifted.
    EvidenceDrift,
    /// Atomic persistence or secure credential construction failed.
    PersistenceFailed,
}

impl LocalOwnerRecoveryErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "local_owner_recovery.invalid_input",
            Self::DatabaseBusy => "local_owner_recovery.database_busy",
            Self::AuthorityRejected => "local_owner_recovery.authority_rejected",
            Self::EvidenceDrift => "local_owner_recovery.evidence_drift",
            Self::PersistenceFailed => "local_owner_recovery.persistence_failed",
        }
    }
}

impl fmt::Display for LocalOwnerRecoveryErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalOwnerRecoveryErrorV1 {}

/// Process-lifetime exclusive lease held by one local daemon.
///
/// The locked handle is intentionally private. Dropping this value releases
/// the operating-system lock.
pub struct LocalDaemonDatabaseLeaseV1 {
    _file: File,
}

/// Explicit offline authority required for owner credential recovery.
///
/// This value can be created only by acquiring the same exclusive database
/// lock used by `lnsatd`. It carries no browser, approval, or execution
/// authority.
pub struct OfflineOwnerRecoveryAuthorityV1 {
    _file: File,
    canonical_database_path: PathBuf,
}

/// Stable fail-closed backup and restore errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteRecoveryErrorV1 {
    /// No durable file path was supplied.
    PathRequired,
    /// An in-memory path was requested.
    InMemoryPathForbidden,
    /// A source or destination path is a symbolic link.
    SymlinkForbidden,
    /// A source path is not a regular file or a destination parent is invalid.
    PathInvalid,
    /// Source and destination resolve to the same file path.
    SourceDestinationConflict,
    /// The destination already exists and will not be replaced.
    DestinationExists,
    /// Source schema, migration, or integrity evidence is invalid.
    SourceInvalid,
    /// Online snapshot creation could not complete.
    BackupFailed,
    /// Restore copy or atomic publication could not complete.
    RestoreFailed,
    /// Copied bytes differ from verified backup evidence.
    EvidenceMismatch,
}

impl SqliteRecoveryErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::PathRequired => "sqlite_recovery.path_required",
            Self::InMemoryPathForbidden => "sqlite_recovery.in_memory_forbidden",
            Self::SymlinkForbidden => "sqlite_recovery.symlink_forbidden",
            Self::PathInvalid => "sqlite_recovery.path_invalid",
            Self::SourceDestinationConflict => "sqlite_recovery.source_destination_conflict",
            Self::DestinationExists => "sqlite_recovery.destination_exists",
            Self::SourceInvalid => "sqlite_recovery.source_invalid",
            Self::BackupFailed => "sqlite_recovery.backup_failed",
            Self::RestoreFailed => "sqlite_recovery.restore_failed",
            Self::EvidenceMismatch => "sqlite_recovery.evidence_mismatch",
        }
    }
}

impl fmt::Display for SqliteRecoveryErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for SqliteRecoveryErrorV1 {}

/// Read-only classification of one existing `SQLite` database.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteRecoveryDispositionV1 {
    /// Current schema and integrity evidence are structurally ready.
    Ready,
    /// Empty recognized file can be bootstrapped by an explicitly opened store.
    BootstrapCandidate,
    /// Older valid schema can be migrated by the current binary.
    MigrationPending,
    /// Valid schema 16 contains inert Phase 7 evidence requiring explicit
    /// operator preservation or disposition before migration 0017.
    LegacyPhase7Evidence,
    /// Database belongs to a newer schema version.
    UnsupportedSchemaVersion,
    /// Version-zero database contains unknown product tables.
    UnrecognizedDatabase,
    /// Schema or ordered migration evidence differs from this binary.
    MigrationDrift,
    /// `SQLite` or foreign-key integrity verification failed.
    IntegrityFailure,
    /// Database could not be read or classified safely.
    Unreadable,
}

impl SqliteRecoveryDispositionV1 {
    /// Stable machine-readable disposition.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Ready => "ready",
            Self::BootstrapCandidate => "bootstrap_candidate",
            Self::MigrationPending => "migration_pending",
            Self::LegacyPhase7Evidence => "legacy_phase7_evidence",
            Self::UnsupportedSchemaVersion => "unsupported_schema_version",
            Self::UnrecognizedDatabase => "unrecognized_database",
            Self::MigrationDrift => "migration_drift",
            Self::IntegrityFailure => "integrity_failure",
            Self::Unreadable => "unreadable",
        }
    }
}

/// Access mode used for recovery inspection.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteRecoveryInspectionModeV1 {
    /// Existing database opened read-only and query-only.
    ReadOnly,
}

/// Automatic mutation performed during recovery inspection.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteRecoveryAutomaticActionV1 {
    /// No repair, migration, quarantine, or activation was attempted.
    None,
}

/// Non-authoritative read-only database recovery evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRecoveryInspectionV1 {
    /// Canonical existing database path inspected.
    pub database_path: PathBuf,
    /// Stable fail-closed classification.
    pub disposition: SqliteRecoveryDispositionV1,
    /// Read schema version when available.
    pub schema_version: Option<i64>,
    /// Read migration count when available.
    pub migration_count: Option<i64>,
    /// True only when full `SQLite` and foreign-key checks passed.
    pub integrity_ok: bool,
    /// Always read-only for this inspection contract.
    pub inspection_mode: SqliteRecoveryInspectionModeV1,
    /// Always none for this inspection contract.
    pub automatic_action: SqliteRecoveryAutomaticActionV1,
}

impl SqliteRecoveryInspectionV1 {
    fn classified(
        database_path: PathBuf,
        disposition: SqliteRecoveryDispositionV1,
        schema_version: Option<i64>,
        migration_count: Option<i64>,
        integrity_ok: bool,
    ) -> Self {
        Self {
            database_path,
            disposition,
            schema_version,
            migration_count,
            integrity_ok,
            inspection_mode: SqliteRecoveryInspectionModeV1::ReadOnly,
            automatic_action: SqliteRecoveryAutomaticActionV1::None,
        }
    }

    /// True only for exact current schema plus valid integrity.
    #[must_use]
    pub const fn is_structurally_ready(&self) -> bool {
        matches!(self.disposition, SqliteRecoveryDispositionV1::Ready) && self.integrity_ok
    }

    /// True only for exact recognized older schema plus valid integrity.
    #[must_use]
    pub const fn is_migration_eligible(&self) -> bool {
        matches!(
            self.disposition,
            SqliteRecoveryDispositionV1::MigrationPending
        ) && self.integrity_ok
    }

    /// True for unrecognized, drifted, corrupt, or unreadable state.
    #[must_use]
    pub const fn quarantine_recommended(&self) -> bool {
        matches!(
            self.disposition,
            SqliteRecoveryDispositionV1::UnrecognizedDatabase
                | SqliteRecoveryDispositionV1::MigrationDrift
                | SqliteRecoveryDispositionV1::IntegrityFailure
                | SqliteRecoveryDispositionV1::Unreadable
        )
    }

    /// Always true for this contract.
    #[must_use]
    pub const fn is_read_only(&self) -> bool {
        matches!(
            self.inspection_mode,
            SqliteRecoveryInspectionModeV1::ReadOnly
        )
    }

    /// Always false for this contract.
    #[must_use]
    pub const fn automatic_action_taken(&self) -> bool {
        !matches!(self.automatic_action, SqliteRecoveryAutomaticActionV1::None)
    }
}

/// Input for one immutable read-only recovery-inspection event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRecoveryInspectionEventInputV1 {
    /// Deployment scope that owns the active evidence store.
    pub deployment_ref: String,
    /// Operator-selected opaque reference for the inspected database.
    pub target_ref: String,
    /// Existing database path inspected but never persisted in clear text.
    pub target_database_path: PathBuf,
    /// Deployment-scoped exact-replay key.
    pub idempotency_key: String,
    /// Canonical UTC observation time supplied by future authenticated composition.
    pub observed_at: String,
}

/// Immutable evidence that one database was inspected without taking action.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRecoveryInspectionEventV1 {
    /// Deterministic content identity excluding the replay key.
    pub event_id: String,
    /// Exact recovery-inspection event schema.
    pub schema_id: String,
    /// Deployment scope that owns this evidence.
    pub deployment_ref: String,
    /// Operator-selected opaque target reference.
    pub target_ref: String,
    /// OS-local SHA-256 fingerprint of the canonical path; raw path is absent.
    pub target_path_sha256: String,
    /// Deployment-scoped exact-replay key.
    pub idempotency_key: String,
    /// Canonical UTC observation time.
    pub observed_at: String,
    /// Fail-closed structural classification observed at append time.
    pub disposition: SqliteRecoveryDispositionV1,
    /// Observed schema version when readable.
    pub observed_schema_version: Option<i64>,
    /// Observed ordered migration count when readable.
    pub observed_migration_count: Option<i64>,
    /// Whether full `SQLite` and foreign-key checks passed.
    pub integrity_ok: bool,
    /// Whether operator quarantine review is recommended.
    pub quarantine_recommended: bool,
    /// Always read-only.
    pub inspection_mode: SqliteRecoveryInspectionModeV1,
    /// Always none.
    pub automatic_action: SqliteRecoveryAutomaticActionV1,
    /// Always false; persisted inspection evidence cannot activate a database.
    pub activation_authorized: bool,
}

/// Readback wrapper for one verified recovery-inspection event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRecoveryInspectionEventRecordV1 {
    /// Revalidated immutable event.
    pub event: SqliteRecoveryInspectionEventV1,
}

/// Append result distinguishing creation from exact replay.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRecoveryInspectionEventWriteV1 {
    /// True only when this call inserted a new row.
    pub created: bool,
    /// Inserted or exact-replayed immutable event.
    pub record: SqliteRecoveryInspectionEventRecordV1,
}

/// Stable fail-closed recovery-inspection event persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteRecoveryInspectionEventErrorV1 {
    /// Reference, time, or path input is invalid.
    InvalidInput,
    /// Target database could not be inspected under the read-only contract.
    InspectionFailed,
    /// Deployment-scoped idempotency key already binds different evidence.
    IdempotencyConflict,
    /// Deterministic event identity already binds a different replay key.
    EventIdentityConflict,
    /// Stored event or schema evidence differs from rederived truth.
    EvidenceDrift,
    /// Transactional persistence failed.
    PersistenceFailed,
}

impl SqliteRecoveryInspectionEventErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "sqlite_recovery_event.invalid_input",
            Self::InspectionFailed => "sqlite_recovery_event.inspection_failed",
            Self::IdempotencyConflict => "sqlite_recovery_event.idempotency_conflict",
            Self::EventIdentityConflict => "sqlite_recovery_event.event_identity_conflict",
            Self::EvidenceDrift => "sqlite_recovery_event.evidence_drift",
            Self::PersistenceFailed => "sqlite_recovery_event.persistence_failed",
        }
    }
}

impl fmt::Display for SqliteRecoveryInspectionEventErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for SqliteRecoveryInspectionEventErrorV1 {}

/// Local v1 human roles. Role names never imply capabilities by themselves.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalIdentityRoleV1 {
    /// Deployment and security owner.
    Owner,
    /// Bounded product operator.
    Operator,
    /// Read-only evidence auditor.
    Auditor,
}

impl LocalIdentityRoleV1 {
    /// Stable database value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Operator => "operator",
            Self::Auditor => "auditor",
        }
    }

    /// Returns whether this exact v1 role grants one fixed local capability.
    #[must_use]
    pub const fn allows_control(self, capability: LocalControlPermissionV1) -> bool {
        match (self, capability) {
            (Self::Owner, _)
            | (
                Self::Operator,
                LocalControlPermissionV1::RequestAction | LocalControlPermissionV1::DecideApproval,
            )
            | (Self::Operator | Self::Auditor, LocalControlPermissionV1::ReadEvidence) => true,
            (Self::Operator | Self::Auditor, LocalControlPermissionV1::ManageIdentities)
            | (
                Self::Auditor,
                LocalControlPermissionV1::RequestAction | LocalControlPermissionV1::DecideApproval,
            ) => false,
        }
    }
}

/// Closed v1 local capability set. Unknown capabilities have no representation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalControlPermissionV1 {
    /// Create bounded operator or auditor identities.
    ManageIdentities,
    /// Submit a consequential-action request.
    RequestAction,
    /// Record a scoped human approval or denial.
    DecideApproval,
    /// Read immutable product evidence.
    ReadEvidence,
}

/// Current local identity lifecycle state.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalIdentityStatusV1 {
    /// Identity may participate in later authenticated composition.
    Active,
    /// Identity is permanently disabled for v1 authentication and authority.
    Disabled,
}

impl LocalIdentityStatusV1 {
    /// Stable database value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Disabled => "disabled",
        }
    }
}

/// Append-only local identity security-audit event kind.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalIdentityEventKindV1 {
    /// First local owner was bootstrapped without a prior session.
    OwnerBootstrapped,
    /// Owner created one immutable non-owner identity.
    IdentityCreated,
    /// Authenticated identity rotated its own password credential.
    PasswordRotated,
    /// Owner permanently disabled one non-owner identity.
    IdentityDisabled,
    /// Offline host authority replaced the only owner's credential.
    OwnerRecovered,
}

impl LocalIdentityEventKindV1 {
    /// Stable database value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::OwnerBootstrapped => "owner_bootstrapped",
            Self::IdentityCreated => "identity_created",
            Self::PasswordRotated => "password_rotated",
            Self::IdentityDisabled => "identity_disabled",
            Self::OwnerRecovered => "owner_recovered",
        }
    }
}

/// Owner bootstrap input. Password is borrowed and never included in output.
pub struct LocalOwnerBootstrapInputV1<'a> {
    /// Stable human identity reference.
    pub identity_ref: &'a str,
    /// Bounded operator-visible name.
    pub display_name: &'a str,
    /// Candidate local password consumed only by Argon2id.
    pub password: &'a str,
    /// Trusted canonical creation time supplied by later server composition.
    pub created_at: &'a str,
}

/// Owner-authorized immutable operator or auditor creation input.
pub struct LocalIdentityCreateInputV1<'a> {
    /// Stable human identity reference.
    pub identity_ref: &'a str,
    /// Bounded operator-visible name.
    pub display_name: &'a str,
    /// Exact non-owner role.
    pub role: LocalIdentityRoleV1,
    /// Initial local password consumed only by Argon2id.
    pub password: &'a str,
    /// Trusted canonical creation time.
    pub created_at: &'a str,
}

/// Authenticated self-service local password rotation input.
pub struct LocalPasswordRotationInputV1<'a> {
    /// Current password reverified against the latest credential.
    pub current_password: &'a str,
    /// New password consumed only by Argon2id verifier construction.
    pub new_password: &'a str,
    /// Canonical server-owned rotation time.
    pub rotated_at: &'a str,
}

/// Explicit offline owner-recovery input.
///
/// The new password is borrowed and never included in public evidence. The
/// expected owner reference prevents recovery against an unintended database.
pub struct LocalOwnerRecoveryInputV1<'a> {
    /// Exact owner identity expected in the locked database.
    pub expected_owner_identity_ref: &'a str,
    /// Replacement password consumed only by Argon2id.
    pub new_password: &'a str,
    /// Trusted canonical recovery time supplied by offline composition.
    pub recovered_at: &'a str,
}

/// Public owner identity evidence without credential material.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalIdentityRecordV1 {
    /// Stable human identity reference.
    pub identity_ref: String,
    /// Bounded operator-visible name.
    pub display_name: String,
    /// Exact local role.
    pub role: LocalIdentityRoleV1,
    /// Exact lifecycle state.
    pub status: LocalIdentityStatusV1,
    /// Canonical creation time.
    pub created_at: String,
}

/// Atomic immutable local identity and initial credential evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalIdentityCredentialRecordV1 {
    /// Persisted identity without secret material.
    pub identity: LocalIdentityRecordV1,
    /// Versioned verifier profile; never a raw password or PHC verifier.
    pub credential_profile: String,
    /// Initial immutable credential generation.
    pub credential_version: i64,
    /// Canonical creation time of the active credential generation.
    pub credential_created_at: String,
}

/// Compatibility name for the exact owner-bootstrap result.
pub type LocalOwnerBootstrapRecordV1 = LocalIdentityCredentialRecordV1;

/// Secret-free append-only credential rotation result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalPasswordRotationResultV1 {
    /// Exact authenticated identity whose credential changed.
    pub identity_ref: String,
    /// Newly active immutable credential version.
    pub credential_version: i64,
    /// Canonical server-owned rotation time.
    pub rotated_at: String,
    /// Active same-identity sessions revoked atomically.
    pub revoked_session_count: u32,
}

/// Secret-free result of one offline owner recovery.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalOwnerRecoveryResultV1 {
    /// Exact recovered owner identity.
    pub identity_ref: String,
    /// Newly active append-only credential generation.
    pub credential_version: i64,
    /// Canonical trusted recovery time.
    pub recovered_at: String,
    /// Active owner sessions revoked atomically.
    pub revoked_session_count: u32,
}

/// Secret-free permanent non-owner disablement result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalIdentityDisablementResultV1 {
    /// Exact non-owner identity disabled.
    pub identity_ref: String,
    /// Effective append-only lifecycle state.
    pub status: LocalIdentityStatusV1,
    /// Canonical server-owned disablement time.
    pub changed_at: String,
    /// Active target sessions revoked atomically.
    pub revoked_session_count: u32,
}

/// Secret-free append-only local identity security-audit event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalIdentityEventV1 {
    /// Content-derived event identifier.
    pub event_id: String,
    /// Exact subject identity.
    pub identity_ref: String,
    /// Contiguous per-identity sequence from the first post-v13 event.
    pub event_sequence: i64,
    /// Exact bounded lifecycle event kind.
    pub event_kind: LocalIdentityEventKindV1,
    /// Authenticated actor session, absent only for first owner bootstrap.
    pub actor_session_id: Option<String>,
    /// Credential generation for bootstrap/create/rotation events.
    pub credential_version: Option<i64>,
    /// Digest of the exact immutable source record.
    pub source_evidence_digest: String,
    /// Canonical trusted event time.
    pub occurred_at: String,
    /// Exact content-binding audit evidence digest.
    pub event_evidence_digest: String,
}

/// Credential verification outcome without identity enumeration detail.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalCredentialVerificationV1 {
    /// Candidate matched exact active v1 owner evidence.
    Verified,
    /// Candidate or identity did not match.
    Rejected,
}

/// Stable fail-closed local identity persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalIdentityStoreErrorV1 {
    /// Identity, name, time, or password input is invalid.
    InvalidInput,
    /// An owner identity already exists.
    OwnerAlreadyBootstrapped,
    /// Identity reference already binds immutable evidence.
    IdentityAlreadyExists,
    /// Active owner session, CSRF, role, or exact authorization time rejected.
    AuthorizationRejected,
    /// Stored identity or credential evidence differs from exact v1 truth.
    EvidenceDrift,
    /// Atomic persistence failed.
    PersistenceFailed,
}

impl LocalIdentityStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "local_identity_store.invalid_input",
            Self::OwnerAlreadyBootstrapped => "local_identity_store.owner_already_bootstrapped",
            Self::IdentityAlreadyExists => "local_identity_store.identity_already_exists",
            Self::AuthorizationRejected => "local_identity_store.authorization_rejected",
            Self::EvidenceDrift => "local_identity_store.evidence_drift",
            Self::PersistenceFailed => "local_identity_store.persistence_failed",
        }
    }
}

impl fmt::Display for LocalIdentityStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalIdentityStoreErrorV1 {}

/// Bounded password-authenticated local human session request.
pub struct LocalSessionIssueInputV1<'a> {
    /// Exact active local human identity reference.
    pub identity_ref: &'a str,
    /// Candidate owner password consumed only by Argon2id verification.
    pub password: &'a str,
    /// Canonical server-supplied issue time.
    pub issued_at: &'a str,
    /// Canonical server-supplied expiry, 60 through 3,600 seconds later.
    pub expires_at: &'a str,
}

/// Compatibility name retained for existing owner-only callers.
pub type LocalOwnerSessionIssueInputV1<'a> = LocalSessionIssueInputV1<'a>;

/// Public session evidence without bearer, CSRF, or digest material.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalSessionRecordV1 {
    /// Public random session identifier.
    pub session_id: String,
    /// Exact authenticated human identity.
    pub identity_ref: String,
    /// Exact role revalidated from immutable identity evidence.
    pub role: LocalIdentityRoleV1,
    /// Canonical issue time.
    pub issued_at: String,
    /// Canonical absolute expiry.
    pub expires_at: String,
}

/// Append-only local session security-audit event kind.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalSessionEventKindV1 {
    /// One hash-only session was atomically issued.
    Issued,
    /// One active session was atomically revoked.
    Revoked,
    /// One revoked session was atomically bound to its replacement.
    Rotated,
}

impl LocalSessionEventKindV1 {
    /// Stable database value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Issued => "issued",
            Self::Revoked => "revoked",
            Self::Rotated => "rotated",
        }
    }
}

/// Secret-free append-only local session security-audit event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalSessionEventV1 {
    /// Content-derived event identifier.
    pub event_id: String,
    /// Exact subject session.
    pub session_id: String,
    /// Contiguous per-session sequence from the first post-v14 event.
    pub event_sequence: i64,
    /// Exact bounded lifecycle event kind.
    pub event_kind: LocalSessionEventKindV1,
    /// Authenticated actor session, absent only for issue.
    pub actor_session_id: Option<String>,
    /// Replacement session, present only for rotation.
    pub related_session_id: Option<String>,
    /// Exact immutable revocation reason, present only for revocation.
    pub revocation_reason: Option<String>,
    /// Digest of the exact immutable source record.
    pub source_evidence_digest: String,
    /// Canonical trusted event time.
    pub occurred_at: String,
    /// Exact content-binding audit evidence digest.
    pub event_evidence_digest: String,
}

/// One-time session issue result.
///
/// This type intentionally implements neither `Clone` nor `Debug` because it
/// carries raw authentication material returned exactly once.
pub struct LocalSessionIssueResultV1 {
    /// Public session evidence.
    pub session: LocalSessionRecordV1,
    /// Raw bearer token. Persist only its profile-bound digest.
    pub raw_session_token: String,
    /// Independent raw anti-CSRF token. Persist only its profile-bound digest.
    pub raw_csrf_token: String,
}

/// Secret-free result of idle-bound verification and optional durable touch.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalSessionActivityV1 {
    /// Exact active role-bound session evidence.
    pub session: LocalSessionRecordV1,
    /// Last validated append-only activity sequence.
    ///
    /// Zero means a migrated v10 session is still using immutable issue time
    /// and has not yet appended its first v11 activity event.
    pub activity_sequence: u32,
    /// Canonical time used for the effective last activity.
    pub last_activity_at: String,
    /// Whether this verification appended a new durable activity event.
    pub touched: bool,
}

/// Public-safe result for idle-bound local session verification.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LocalSessionActivityVerificationV1 {
    /// Exact active session and its bounded activity evidence matched.
    Verified(LocalSessionActivityV1),
    /// Token, CSRF, clock, idle window, or revocation state did not match.
    Rejected,
}

/// One-time session rotation result.
///
/// This type intentionally implements neither `Clone` nor `Debug` because it
/// carries replacement authentication material returned exactly once.
pub struct LocalSessionRotationResultV1 {
    /// Public identifier of the atomically revoked prior session.
    pub prior_session_id: String,
    /// Public replacement session evidence.
    pub session: LocalSessionRecordV1,
    /// Raw replacement bearer token.
    pub raw_session_token: String,
    /// Independent raw replacement anti-CSRF token.
    pub raw_csrf_token: String,
    /// Canonical server-owned rotation time.
    pub rotated_at: String,
}

/// Secret-free result for one atomic same-identity session-family revocation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalSessionFamilyRevocationV1 {
    /// Exact authenticated local-human identity.
    pub identity_ref: String,
    /// Total durable sessions revalidated for this identity.
    pub family_session_count: u32,
    /// Active, previously unrevoked sessions revoked by this call.
    pub newly_revoked_session_count: u32,
    /// Canonical server-owned revocation time.
    pub revoked_at: String,
}

/// Public-safe local session verification result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LocalSessionVerificationV1 {
    /// Exact active role-bound session evidence matched.
    Verified(LocalSessionRecordV1),
    /// Credential, token, CSRF, time, identity, or revocation state did not match.
    Rejected,
}

/// Immutable session revocation reason.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalSessionRevocationReasonV1 {
    /// Authenticated browser sign-out.
    SignOut,
    /// Explicit owner revocation.
    OwnerRevoke,
    /// Credential rotation or invalidation.
    CredentialRevoke,
    /// Local recovery procedure.
    Recovery,
    /// Atomic replacement by a fresh session secret pair.
    Rotation,
}

impl LocalSessionRevocationReasonV1 {
    /// Stable database value.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::SignOut => "sign_out",
            Self::OwnerRevoke => "owner_revoke",
            Self::CredentialRevoke => "credential_revoke",
            Self::Recovery => "recovery",
            Self::Rotation => "rotation",
        }
    }
}

/// Stable fail-closed local session persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalSessionStoreErrorV1 {
    /// Time or revocation input violates the bounded source contract.
    InvalidInput,
    /// Identity or password did not authenticate.
    InvalidCredential,
    /// Stored identity, credential, session, or revocation evidence drifted.
    EvidenceDrift,
    /// Atomic persistence or secure-secret creation failed.
    PersistenceFailed,
}

impl LocalSessionStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidInput => "local_session_store.invalid_input",
            Self::InvalidCredential => "local_session_store.invalid_credential",
            Self::EvidenceDrift => "local_session_store.evidence_drift",
            Self::PersistenceFailed => "local_session_store.persistence_failed",
        }
    }
}

impl fmt::Display for LocalSessionStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for LocalSessionStoreErrorV1 {}

/// Stable fail-closed packet persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PacketStoreErrorV1 {
    /// The supplied public packet value failed stable contract validation.
    InvalidPacket,
    /// A project-scoped idempotency key already binds different evidence.
    IdempotencyConflict,
    /// A packet identifier already binds different evidence or scope.
    PacketIdentityConflict,
    /// Durable packet evidence no longer matches its canonical contract.
    EvidenceDrift,
    /// The atomic database operation could not complete.
    PersistenceFailed,
}

impl PacketStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidPacket => "packet_store.invalid_packet",
            Self::IdempotencyConflict => "packet_store.idempotency_conflict",
            Self::PacketIdentityConflict => "packet_store.packet_identity_conflict",
            Self::EvidenceDrift => "packet_store.evidence_drift",
            Self::PersistenceFailed => "packet_store.persistence_failed",
        }
    }
}

impl fmt::Display for PacketStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for PacketStoreErrorV1 {}

/// Exact immutable packet evidence returned from the local store.
#[derive(Clone, Debug, PartialEq)]
pub struct PacketStoreRecordV1 {
    /// Revalidated stable packet envelope.
    pub packet: PacketEnvelopeV1,
    /// Exact canonical UTF-8 JSON persisted by the store.
    pub canonical_packet: String,
    /// Exact canonical packet SHA-256 identity.
    pub packet_sha256: String,
}

/// Atomic append outcome with explicit exact-replay evidence.
#[derive(Clone, Debug, PartialEq)]
pub struct PacketStoreWriteV1 {
    /// True only when this call inserted the immutable record.
    pub created: bool,
    /// Inserted or exact-replayed record.
    pub record: PacketStoreRecordV1,
}

/// Stable fail-closed policy-decision persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PolicyStoreErrorV1 {
    /// Supplied decision does not exactly rederive from its persisted packet.
    InvalidDecision,
    /// Decision identity already binds different durable evidence.
    DecisionIdentityConflict,
    /// Durable decision or packet evidence no longer matches stable contracts.
    EvidenceDrift,
    /// Atomic database operation could not complete.
    PersistenceFailed,
}

impl PolicyStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidDecision => "policy_store.invalid_decision",
            Self::DecisionIdentityConflict => "policy_store.decision_identity_conflict",
            Self::EvidenceDrift => "policy_store.evidence_drift",
            Self::PersistenceFailed => "policy_store.persistence_failed",
        }
    }
}

impl fmt::Display for PolicyStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for PolicyStoreErrorV1 {}

/// Exact immutable policy evidence rederived from persisted packet truth.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyStoreRecordV1 {
    /// Stable deterministic policy decision.
    pub decision: PolicyDecisionV1,
}

/// Atomic policy-decision append outcome.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyStoreWriteV1 {
    /// True only when this call inserted durable decision evidence.
    pub created: bool,
    /// Inserted or exact-replayed decision record.
    pub record: PolicyStoreRecordV1,
}

/// Stable fail-closed approval-request persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApprovalRequestStoreErrorV1 {
    /// Supplied request does not rederive from persisted policy evidence.
    InvalidRequest,
    /// Request identity already binds different durable evidence.
    RequestIdentityConflict,
    /// Active local requester session, CSRF, role, identity, or time rejected.
    AuthorizationRejected,
    /// Durable request, policy, or packet evidence no longer matches.
    EvidenceDrift,
    /// Atomic database operation could not complete.
    PersistenceFailed,
}

impl ApprovalRequestStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidRequest => "approval_request_store.invalid_request",
            Self::RequestIdentityConflict => "approval_request_store.request_identity_conflict",
            Self::AuthorizationRejected => "approval_request_store.authorization_rejected",
            Self::EvidenceDrift => "approval_request_store.evidence_drift",
            Self::PersistenceFailed => "approval_request_store.persistence_failed",
        }
    }
}

impl fmt::Display for ApprovalRequestStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ApprovalRequestStoreErrorV1 {}

/// Exact immutable approval-request evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalRequestStoreRecordV1 {
    /// Stable content-bound request with status `requested`.
    pub request: ApprovalRequestV1,
}

/// Atomic approval-request append outcome.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalRequestStoreWriteV1 {
    /// True only when this call inserted durable request evidence.
    pub created: bool,
    /// Inserted or exact-replayed request record.
    pub record: ApprovalRequestStoreRecordV1,
}

/// Stable fail-closed approval-decision persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApprovalDecisionStoreErrorV1 {
    /// Supplied decision does not rederive from persisted request evidence.
    InvalidDecision,
    /// Decision or request identity already binds different durable evidence.
    DecisionIdentityConflict,
    /// Active local approver session, CSRF, role, identity, or time rejected.
    AuthorizationRejected,
    /// Durable decision, request, policy, or packet evidence no longer matches.
    EvidenceDrift,
    /// Atomic database operation could not complete.
    PersistenceFailed,
}

impl ApprovalDecisionStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidDecision => "approval_decision_store.invalid_decision",
            Self::DecisionIdentityConflict => "approval_decision_store.decision_identity_conflict",
            Self::AuthorizationRejected => "approval_decision_store.authorization_rejected",
            Self::EvidenceDrift => "approval_decision_store.evidence_drift",
            Self::PersistenceFailed => "approval_decision_store.persistence_failed",
        }
    }
}

impl fmt::Display for ApprovalDecisionStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ApprovalDecisionStoreErrorV1 {}

/// Exact immutable approval-decision evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalDecisionStoreRecordV1 {
    /// Stable content-bound human decision with no execution authority.
    pub decision: ApprovalDecisionV1,
}

/// Atomic approval-decision append outcome.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalDecisionStoreWriteV1 {
    /// True only when this call inserted durable decision evidence.
    pub created: bool,
    /// Inserted or exact-replayed decision record.
    pub record: ApprovalDecisionStoreRecordV1,
}

/// Stable fail-closed audit-event persistence errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuditEventStoreErrorV1 {
    /// Supplied event does not rederive from persisted source evidence.
    InvalidEvent,
    /// Project-scoped idempotency key already binds different evidence.
    IdempotencyConflict,
    /// Event identity already binds different durable evidence.
    EventIdentityConflict,
    /// Durable event or source-chain evidence no longer matches.
    EvidenceDrift,
    /// Atomic database operation could not complete.
    PersistenceFailed,
}

impl AuditEventStoreErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidEvent => "audit_event_store.invalid_event",
            Self::IdempotencyConflict => "audit_event_store.idempotency_conflict",
            Self::EventIdentityConflict => "audit_event_store.event_identity_conflict",
            Self::EvidenceDrift => "audit_event_store.evidence_drift",
            Self::PersistenceFailed => "audit_event_store.persistence_failed",
        }
    }
}

impl fmt::Display for AuditEventStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for AuditEventStoreErrorV1 {}

/// Exact immutable audit-event evidence rederived from persisted source truth.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEventStoreRecordV1 {
    /// Stable side-effect-free audit event.
    pub event: AuditEventV1,
}

/// Atomic audit-event append outcome.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEventStoreWriteV1 {
    /// True only when this call inserted durable audit evidence.
    pub created: bool,
    /// Inserted or exact-replayed event record.
    pub record: AuditEventStoreRecordV1,
}

/// Stable fail-closed retention-plan errors.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqliteRetentionErrorV1 {
    /// Candidate limit was zero or exceeded the source-bounded maximum.
    InvalidCandidateLimit,
    /// Durable retention policy differs from this binary.
    EvidenceDrift,
    /// Retention evidence could not be read.
    PersistenceFailed,
}

impl SqliteRetentionErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::InvalidCandidateLimit => "sqlite_retention.invalid_candidate_limit",
            Self::EvidenceDrift => "sqlite_retention.evidence_drift",
            Self::PersistenceFailed => "sqlite_retention.persistence_failed",
        }
    }
}

impl fmt::Display for SqliteRetentionErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for SqliteRetentionErrorV1 {}

/// Immutable retention policy for one current record family.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRetentionPolicyV1 {
    /// Stable record-family identifier.
    pub record_family: String,
    /// Current durable evidence class.
    pub retention_class: String,
    /// Always true for current authority and audit evidence.
    pub preserve: bool,
    /// Always false until a removable record family is explicitly added.
    pub cleanup_eligible: bool,
    /// None means no time-based deletion deadline exists.
    pub minimum_retention_seconds: Option<i64>,
}

/// Read-only bounded retention plan; never deletes current evidence.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRetentionPlanV1 {
    /// Operator-supplied upper bound for future candidate selection.
    pub candidate_limit: u32,
    /// Exact immutable policy rows evaluated.
    pub policies: Vec<SqliteRetentionPolicyV1>,
    /// Current rows covered by preserve-only policy.
    pub protected_record_count: i64,
    /// Always zero for the current schema.
    pub cleanup_candidate_count: i64,
    /// Always false; planning grants no mutation authority.
    pub cleanup_attempted: bool,
}

/// Verified evidence for one online-consistent `SQLite` snapshot.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteBackupEvidenceV1 {
    /// Published backup path; no existing file was replaced.
    pub backup_path: PathBuf,
    /// Exact current schema version verified in the snapshot.
    pub schema_version: i64,
    /// Exact ordered migration count verified in the snapshot.
    pub migration_count: i64,
    /// Standalone snapshot size.
    pub file_size_bytes: u64,
    /// SHA-256 of exact published snapshot bytes.
    pub backup_sha256: String,
    /// True because `SQLite` online backup copied one committed snapshot.
    pub online_consistent: bool,
    /// Always false; backup creation never replaces an existing path.
    pub replaced_existing: bool,
}

/// Verified evidence for one inert restore copy.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteRestoreEvidenceV1 {
    /// Verified source backup path.
    pub backup_path: PathBuf,
    /// Freshly published restored database path.
    pub restored_database_path: PathBuf,
    /// Exact current schema version verified before publication.
    pub schema_version: i64,
    /// Exact ordered migration count verified before publication.
    pub migration_count: i64,
    /// Exact restored snapshot size.
    pub file_size_bytes: u64,
    /// SHA-256 shared by verified backup and restored snapshot bytes.
    pub snapshot_sha256: String,
    /// Always false; restore never replaces an existing database.
    pub replaced_existing: bool,
    /// Always false; restore produces an inert file and grants no runtime use.
    pub activated: bool,
}

/// Read-only evidence describing the opened database posture.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SqliteStoreStateV1 {
    /// Explicit durable database path.
    pub database_path: PathBuf,
    /// Exact applied schema version.
    pub schema_version: i64,
    /// Number of verified ordered migrations.
    pub migration_count: i64,
    /// Required journal mode.
    pub journal_mode: String,
    /// Whether foreign keys are enabled for this connection.
    pub foreign_keys_enabled: bool,
    /// Required `SQLite` synchronous level.
    pub synchronous_level: i64,
    /// Whether `SQLite` treats schema content as untrusted.
    pub trusted_schema_enabled: bool,
    /// Integrity result after schema verification.
    pub integrity_ok: bool,
}

/// One owned embedded `SQLite` connection.
pub struct SqliteStore {
    database_path: PathBuf,
    connection: Connection,
    authentication_dummy_verifier: String,
}

/// Acquires the process-lifetime exclusive database lease required by
/// `lnsatd`.
///
/// The database file is created with owner-only permissions when absent. No
/// listener or runtime authority is opened by this function.
///
/// # Errors
///
/// Rejects invalid, symbolic-link, non-file, group/world-accessible, or
/// already leased database paths.
pub fn acquire_local_daemon_database_lease_v1(
    path: impl AsRef<Path>,
) -> Result<LocalDaemonDatabaseLeaseV1, LocalOwnerRecoveryErrorV1> {
    let (file, _) = acquire_exclusive_database_file_v1(path.as_ref(), true)?;
    Ok(LocalDaemonDatabaseLeaseV1 { _file: file })
}

/// Acquires explicit offline owner-recovery authority for one existing
/// database.
///
/// This uses the same exclusive file lock held for the entire daemon lifetime.
/// It never creates a database and grants no HTTP, adapter, approval, or
/// execution authority.
///
/// # Errors
///
/// Rejects invalid, missing, symbolic-link, non-file, group/world-accessible,
/// or already leased database paths.
pub fn acquire_offline_owner_recovery_authority_v1(
    path: impl AsRef<Path>,
) -> Result<OfflineOwnerRecoveryAuthorityV1, LocalOwnerRecoveryErrorV1> {
    let (file, canonical_database_path) = acquire_exclusive_database_file_v1(path.as_ref(), false)?;
    Ok(OfflineOwnerRecoveryAuthorityV1 {
        _file: file,
        canonical_database_path,
    })
}

impl SqliteStore {
    /// Opens or atomically bootstraps one explicit durable database.
    ///
    /// # Errors
    ///
    /// Fails closed for invalid paths, insecure connection posture, unknown or
    /// future schema state, migration drift, or failed integrity checks.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, SqliteStoreError> {
        let database_path = path.as_ref();
        prepare_database_file(database_path)?;
        let connection =
            Connection::open_with_flags(database_path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .map_err(|_| SqliteStoreError::OpenFailed)?;
        preflight_schema(&connection)?;
        configure_connection(&connection)?;
        validate_local_password_verifier_v1(LOCAL_AUTHENTICATION_DUMMY_VERIFIER_V1)
            .map_err(|_| SqliteStoreError::OpenFailed)?;
        let mut store = Self {
            database_path: database_path.to_path_buf(),
            connection,
            authentication_dummy_verifier: LOCAL_AUTHENTICATION_DUMMY_VERIFIER_V1.to_owned(),
        };
        store.apply_pending_migrations()?;
        store.verify_schema()?;
        store.verify_integrity()?;
        Ok(store)
    }

    /// Returns verified, non-authoritative store posture evidence.
    ///
    /// # Errors
    ///
    /// Fails if any required pragma or schema evidence cannot be read.
    pub fn state(&self) -> Result<SqliteStoreStateV1, SqliteStoreError> {
        let schema_version = pragma_i64(&self.connection, "user_version")
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
        let migration_count = self
            .connection
            .query_row("SELECT count(*) FROM lnsat_schema_migrations", [], |row| {
                row.get(0)
            })
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
        let journal_mode = self
            .connection
            .query_row("PRAGMA journal_mode", [], |row| row.get::<_, String>(0))
            .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
        let foreign_keys = pragma_i64(&self.connection, "foreign_keys")
            .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
        let synchronous_level = pragma_i64(&self.connection, "synchronous")
            .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
        let trusted_schema = pragma_i64(&self.connection, "trusted_schema")
            .map_err(|_| SqliteStoreError::ConfigurationFailed)?;

        Ok(SqliteStoreStateV1 {
            database_path: self.database_path.clone(),
            schema_version,
            migration_count,
            journal_mode,
            foreign_keys_enabled: foreign_keys == 1,
            synchronous_level,
            trusted_schema_enabled: trusted_schema == 1,
            integrity_ok: self.verify_integrity().is_ok(),
        })
    }

    /// Atomically bootstraps the only local owner and initial Argon2id
    /// credential.
    ///
    /// Password bytes are consumed before the write transaction and are never
    /// persisted or returned. An immediate transaction serializes competing
    /// bootstrap attempts so exactly one owner can be created.
    ///
    /// # Errors
    ///
    /// Rejects invalid identity/name/time/password input, any existing owner,
    /// stored schema drift, and failed atomic persistence.
    pub fn bootstrap_local_owner_v1(
        &mut self,
        input: &LocalOwnerBootstrapInputV1<'_>,
    ) -> Result<LocalOwnerBootstrapRecordV1, LocalIdentityStoreErrorV1> {
        validate_local_owner_bootstrap_input_v1(input)?;
        let verifier = create_local_password_verifier_v1(input.password).map_err(|error| {
            if error == LocalPasswordErrorV1::InvalidPassword {
                LocalIdentityStoreErrorV1::InvalidInput
            } else {
                LocalIdentityStoreErrorV1::PersistenceFailed
            }
        })?;
        let credential_id =
            local_password_credential_id_v1(input.identity_ref, 1, &verifier, input.created_at);

        self.verify_schema()
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        let (identity_count, owner_count) = transaction
            .query_row(
                "SELECT count(*),
                        coalesce(sum(CASE WHEN role = 'owner' THEN 1 ELSE 0 END), 0)
                 FROM lnsat_local_identities",
                [],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        if owner_count > 0 {
            let owner_ref = transaction
                .query_row(
                    "SELECT identity_ref
                     FROM lnsat_local_identities
                     WHERE role = 'owner'",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
            select_local_owner_bootstrap_record_v1(&transaction, &owner_ref)?
                .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
            return Err(LocalIdentityStoreErrorV1::OwnerAlreadyBootstrapped);
        }
        if identity_count != 0 {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }

        transaction
            .execute(
                "INSERT INTO lnsat_local_identities (
                    identity_ref, display_name, role, owner_singleton,
                    status, created_at
                 ) VALUES (?1, ?2, 'owner', 1, 'active', ?3)",
                params![input.identity_ref, input.display_name, input.created_at],
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        transaction
            .execute(
                "INSERT INTO lnsat_local_password_credentials (
                    credential_id, identity_ref, credential_version,
                    verifier_profile, password_verifier, created_at
                ) VALUES (?1, ?2, 1, ?3, ?4, ?5)",
                params![
                    &credential_id,
                    input.identity_ref,
                    LOCAL_PASSWORD_PROFILE_V1,
                    verifier,
                    input.created_at
                ],
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        insert_local_identity_event_v1(
            &transaction,
            input.identity_ref,
            LocalIdentityEventKindV1::OwnerBootstrapped,
            None,
            Some(1),
            &credential_id,
            input.created_at,
        )?;

        let record = select_local_owner_bootstrap_record_v1(&transaction, input.identity_ref)?
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if record.identity.display_name != input.display_name
            || record.identity.created_at != input.created_at
            || record.identity.role != LocalIdentityRoleV1::Owner
            || record.identity.status != LocalIdentityStatusV1::Active
            || record.credential_profile != LOCAL_PASSWORD_PROFILE_V1
            || record.credential_version != 1
        {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        transaction
            .commit()
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        Ok(record)
    }

    /// Atomically creates one immutable operator or auditor identity after an
    /// exact active owner browser mutation authenticates.
    ///
    /// # Errors
    ///
    /// Rejects owner-role creation, invalid identity input, an inactive or
    /// non-owner session, wrong CSRF, clock drift, duplicate identity, stored
    /// evidence drift, and failed atomic persistence.
    pub fn create_local_identity_v1(
        &mut self,
        input: &LocalIdentityCreateInputV1<'_>,
        raw_owner_session_token: &str,
        raw_owner_csrf_token: &str,
        checked_at: &str,
    ) -> Result<LocalIdentityCredentialRecordV1, LocalIdentityStoreErrorV1> {
        validate_local_identity_create_input_v1(input)?;
        if checked_at != input.created_at {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        }
        let verifier = create_local_password_verifier_v1(input.password).map_err(|error| {
            if error == LocalPasswordErrorV1::InvalidPassword {
                LocalIdentityStoreErrorV1::InvalidInput
            } else {
                LocalIdentityStoreErrorV1::PersistenceFailed
            }
        })?;
        let credential_id =
            local_password_credential_id_v1(input.identity_ref, 1, &verifier, input.created_at);

        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        let authentication = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_owner_session_token,
            Some(raw_owner_csrf_token),
            checked_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )
        .map_err(map_local_session_identity_error_v1)?;
        let LocalSessionActivityVerificationV1::Verified(owner_activity) = authentication else {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        };
        let owner_session = owner_activity.session;
        if !owner_session
            .role
            .allows_control(LocalControlPermissionV1::ManageIdentities)
            || owner_session.role != LocalIdentityRoleV1::Owner
        {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        }
        if select_local_identity_v1(&transaction, input.identity_ref)?.is_some() {
            return Err(LocalIdentityStoreErrorV1::IdentityAlreadyExists);
        }
        transaction
            .execute(
                "INSERT INTO lnsat_local_identities (
                    identity_ref, display_name, role, owner_singleton,
                    status, created_at
                 ) VALUES (?1, ?2, ?3, NULL, 'active', ?4)",
                params![
                    input.identity_ref,
                    input.display_name,
                    input.role.as_str(),
                    input.created_at
                ],
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        transaction
            .execute(
                "INSERT INTO lnsat_local_password_credentials (
                    credential_id, identity_ref, credential_version,
                    verifier_profile, password_verifier, created_at
                ) VALUES (?1, ?2, 1, ?3, ?4, ?5)",
                params![
                    &credential_id,
                    input.identity_ref,
                    LOCAL_PASSWORD_PROFILE_V1,
                    verifier,
                    input.created_at
                ],
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        insert_local_identity_event_v1(
            &transaction,
            input.identity_ref,
            LocalIdentityEventKindV1::IdentityCreated,
            Some(&owner_session.session_id),
            Some(1),
            &credential_id,
            input.created_at,
        )?;
        let record = select_local_identity_credential_record_v1(&transaction, input.identity_ref)?
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if record.identity.display_name != input.display_name
            || record.identity.role != input.role
            || record.identity.created_at != input.created_at
        {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        transaction
            .commit()
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        Ok(record)
    }

    /// Reads one exact local identity without credential material.
    ///
    /// # Errors
    ///
    /// Rejects malformed identity scope, stored evidence drift, and failed
    /// persistence.
    pub fn read_local_identity_v1(
        &self,
        identity_ref: &str,
    ) -> Result<Option<LocalIdentityRecordV1>, LocalIdentityStoreErrorV1> {
        if !is_local_human_identity_ref_v1(identity_ref) {
            return Err(LocalIdentityStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        select_local_identity_v1(&self.connection, identity_ref)
    }

    /// Reads and validates the append-only post-v13 identity event stream.
    ///
    /// Upgraded pre-v13 identities may have no historical events; every new
    /// identity lifecycle mutation after schema v13 appends atomically.
    ///
    /// # Errors
    ///
    /// Rejects malformed identity scope, stored evidence drift, and failed
    /// persistence.
    pub fn read_local_identity_events_v1(
        &self,
        identity_ref: &str,
    ) -> Result<Vec<LocalIdentityEventV1>, LocalIdentityStoreErrorV1> {
        if !is_local_human_identity_ref_v1(identity_ref) {
            return Err(LocalIdentityStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let identity = select_local_identity_v1(&self.connection, identity_ref)?
            .ok_or(LocalIdentityStoreErrorV1::InvalidInput)?;
        let stored = select_local_identity_events_v1(&self.connection, identity_ref)?;
        validate_local_identity_events_v1(&self.connection, &identity, &stored)
    }

    /// Verifies one local password against exact immutable v1 credential
    /// evidence.
    ///
    /// Missing identity and password mismatch share the same rejected outcome.
    /// No raw password or PHC verifier is returned.
    ///
    /// # Errors
    ///
    /// Returns evidence drift for malformed or downgraded stored credentials
    /// and persistence failure for unreadable state.
    pub fn verify_local_owner_password_v1(
        &self,
        identity_ref: &str,
        password: &str,
    ) -> Result<LocalCredentialVerificationV1, LocalIdentityStoreErrorV1> {
        let verification = self.verify_local_password_credential_v1(identity_ref, password)?;
        if verification != LocalCredentialVerificationV1::Verified {
            return Ok(verification);
        }
        let Some(identity) = select_local_identity_v1(&self.connection, identity_ref)? else {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        };
        if identity.role != LocalIdentityRoleV1::Owner {
            return Ok(LocalCredentialVerificationV1::Rejected);
        }
        Ok(LocalCredentialVerificationV1::Verified)
    }

    /// Verifies one active local human credential without role widening.
    ///
    /// # Errors
    ///
    /// Returns evidence drift for malformed or downgraded stored credentials
    /// and persistence failure for unreadable state.
    pub fn verify_local_password_credential_v1(
        &self,
        identity_ref: &str,
        password: &str,
    ) -> Result<LocalCredentialVerificationV1, LocalIdentityStoreErrorV1> {
        if !is_local_human_identity_ref_v1(identity_ref) {
            return self.reject_unknown_local_password_candidate_v1(password);
        }
        self.verify_schema()
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let Some(identity) = select_local_identity_v1(&self.connection, identity_ref)? else {
            return self.reject_unknown_local_password_candidate_v1(password);
        };
        if identity.status != LocalIdentityStatusV1::Active {
            return self.reject_unknown_local_password_candidate_v1(password);
        }
        let stored = select_local_password_credentials_v1(&self.connection, identity_ref)?;
        validate_stored_local_password_credentials_v1(&identity, &stored)?;
        let stored = stored
            .last()
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        verify_local_password_v1(password, &stored.password_verifier)
            .map(|verified| {
                if verified {
                    LocalCredentialVerificationV1::Verified
                } else {
                    LocalCredentialVerificationV1::Rejected
                }
            })
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)
    }

    fn reject_unknown_local_password_candidate_v1(
        &self,
        password: &str,
    ) -> Result<LocalCredentialVerificationV1, LocalIdentityStoreErrorV1> {
        verify_local_password_v1(password, &self.authentication_dummy_verifier)
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        Ok(LocalCredentialVerificationV1::Rejected)
    }

    /// Atomically rotates the authenticated identity's password credential and
    /// revokes every active same-identity session.
    ///
    /// Credential rows remain append-only. The session identity is the target;
    /// callers cannot nominate another identity. The current password is
    /// reverified against the latest generation inside the same immediate
    /// transaction, and the new password must differ.
    ///
    /// # Errors
    ///
    /// Returns a generic authorization rejection for inactive session, wrong
    /// CSRF/current password, or replay and fails closed for invalid new
    /// password, version exhaustion, evidence drift, or persistence failure.
    #[allow(clippy::too_many_lines)]
    pub fn rotate_local_password_credential_v1(
        &mut self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        input: &LocalPasswordRotationInputV1<'_>,
    ) -> Result<LocalPasswordRotationResultV1, LocalIdentityStoreErrorV1> {
        if input.current_password == input.new_password
            || canonical_utc_timestamp_millis_v1(input.rotated_at).is_none()
        {
            return Err(LocalIdentityStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        let authentication = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            input.rotated_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )
        .map_err(map_local_session_identity_error_v1)?;
        let LocalSessionActivityVerificationV1::Verified(activity) = authentication else {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        };
        let identity = select_local_identity_v1(&transaction, &activity.session.identity_ref)?
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if identity.status != LocalIdentityStatusV1::Active {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        }
        let credentials =
            select_local_password_credentials_v1(&transaction, &identity.identity_ref)?;
        validate_stored_local_password_credentials_v1(&identity, &credentials)?;
        let current = credentials
            .last()
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if !verify_local_password_v1(input.current_password, &current.password_verifier)
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?
        {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        }
        let current_created = canonical_utc_timestamp_millis_v1(&current.created_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let rotated = canonical_utc_timestamp_millis_v1(input.rotated_at)
            .ok_or(LocalIdentityStoreErrorV1::InvalidInput)?;
        if rotated <= current_created {
            return Err(LocalIdentityStoreErrorV1::InvalidInput);
        }
        let credential_version = current
            .credential_version
            .checked_add(1)
            .filter(|version| *version <= LOCAL_PASSWORD_CREDENTIAL_MAX_VERSION_V1)
            .ok_or(LocalIdentityStoreErrorV1::InvalidInput)?;
        let verifier = create_local_password_verifier_v1(input.new_password).map_err(|error| {
            if error == LocalPasswordErrorV1::InvalidPassword {
                LocalIdentityStoreErrorV1::InvalidInput
            } else {
                LocalIdentityStoreErrorV1::PersistenceFailed
            }
        })?;
        let credential_id = local_password_credential_id_v1(
            &identity.identity_ref,
            credential_version,
            &verifier,
            input.rotated_at,
        );
        transaction
            .execute(
                "INSERT INTO lnsat_local_password_credentials (
                    credential_id, identity_ref, credential_version,
                    verifier_profile, password_verifier, created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    &credential_id,
                    identity.identity_ref,
                    credential_version,
                    LOCAL_PASSWORD_PROFILE_V1,
                    verifier,
                    input.rotated_at,
                ],
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        let stored = select_local_password_credentials_v1(&transaction, &identity.identity_ref)?;
        validate_stored_local_password_credentials_v1(&identity, &stored)?;
        if stored.last().is_none_or(|credential| {
            credential.credential_version != credential_version
                || credential.created_at != input.rotated_at
        }) {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        let (_, revoked_session_count) = revoke_active_local_sessions_for_identity_v1(
            &transaction,
            &identity.identity_ref,
            Some(&activity.session.session_id),
            input.rotated_at,
            LocalSessionRevocationReasonV1::CredentialRevoke,
        )
        .map_err(map_local_session_identity_error_v1)?;
        if revoked_session_count == 0 {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        insert_local_identity_event_v1(
            &transaction,
            &identity.identity_ref,
            LocalIdentityEventKindV1::PasswordRotated,
            Some(&activity.session.session_id),
            Some(credential_version),
            &credential_id,
            input.rotated_at,
        )?;
        let result = LocalPasswordRotationResultV1 {
            identity_ref: identity.identity_ref,
            credential_version,
            rotated_at: input.rotated_at.to_owned(),
            revoked_session_count,
        };
        transaction
            .commit()
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        Ok(result)
    }

    /// Replaces the only owner's password through explicit offline authority.
    ///
    /// The authority guard must exclusively lock this exact database. No
    /// browser session participates. The transition appends a credential
    /// generation, revokes every active owner session with reason `recovery`,
    /// and appends one actorless `owner_recovered` identity event atomically.
    ///
    /// # Errors
    ///
    /// Rejects a mismatched database/owner, reused or invalid password,
    /// non-monotonic trusted time, credential-version exhaustion, evidence
    /// drift, and failed atomic persistence.
    #[allow(clippy::too_many_lines)]
    pub fn recover_local_owner_offline_v1(
        &mut self,
        authority: &OfflineOwnerRecoveryAuthorityV1,
        input: &LocalOwnerRecoveryInputV1<'_>,
    ) -> Result<LocalOwnerRecoveryResultV1, LocalOwnerRecoveryErrorV1> {
        if !is_local_human_identity_ref_v1(input.expected_owner_identity_ref)
            || canonical_utc_timestamp_millis_v1(input.recovered_at).is_none()
        {
            return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
        }
        let canonical_database_path = self
            .database_path
            .canonicalize()
            .map_err(|_| LocalOwnerRecoveryErrorV1::AuthorityRejected)?;
        if canonical_database_path != authority.canonical_database_path {
            return Err(LocalOwnerRecoveryErrorV1::AuthorityRejected);
        }
        let verifier = create_local_password_verifier_v1(input.new_password).map_err(|error| {
            if error == LocalPasswordErrorV1::InvalidPassword {
                LocalOwnerRecoveryErrorV1::InvalidInput
            } else {
                LocalOwnerRecoveryErrorV1::PersistenceFailed
            }
        })?;
        self.verify_schema()
            .map_err(|_| LocalOwnerRecoveryErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalOwnerRecoveryErrorV1::PersistenceFailed)?;
        let identity = select_local_identity_v1(&transaction, input.expected_owner_identity_ref)
            .map_err(map_local_identity_recovery_error_v1)?
            .ok_or(LocalOwnerRecoveryErrorV1::AuthorityRejected)?;
        if identity.role != LocalIdentityRoleV1::Owner
            || identity.status != LocalIdentityStatusV1::Active
        {
            return Err(LocalOwnerRecoveryErrorV1::AuthorityRejected);
        }
        let credentials =
            select_local_password_credentials_v1(&transaction, &identity.identity_ref)
                .map_err(map_local_identity_recovery_error_v1)?;
        validate_stored_local_password_credentials_v1(&identity, &credentials)
            .map_err(map_local_identity_recovery_error_v1)?;
        let current = credentials
            .last()
            .ok_or(LocalOwnerRecoveryErrorV1::EvidenceDrift)?;
        if verify_local_password_v1(input.new_password, &current.password_verifier)
            .map_err(|_| LocalOwnerRecoveryErrorV1::EvidenceDrift)?
        {
            return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
        }
        let current_created = canonical_utc_timestamp_millis_v1(&current.created_at)
            .ok_or(LocalOwnerRecoveryErrorV1::EvidenceDrift)?;
        let recovered = canonical_utc_timestamp_millis_v1(input.recovered_at)
            .ok_or(LocalOwnerRecoveryErrorV1::InvalidInput)?;
        if recovered <= current_created {
            return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
        }
        let credential_version = current
            .credential_version
            .checked_add(1)
            .filter(|version| *version <= LOCAL_PASSWORD_CREDENTIAL_MAX_VERSION_V1)
            .ok_or(LocalOwnerRecoveryErrorV1::InvalidInput)?;
        let credential_id = local_password_credential_id_v1(
            &identity.identity_ref,
            credential_version,
            &verifier,
            input.recovered_at,
        );
        transaction
            .execute(
                "INSERT INTO lnsat_local_password_credentials (
                    credential_id, identity_ref, credential_version,
                    verifier_profile, password_verifier, created_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    &credential_id,
                    identity.identity_ref,
                    credential_version,
                    LOCAL_PASSWORD_PROFILE_V1,
                    verifier,
                    input.recovered_at,
                ],
            )
            .map_err(|_| LocalOwnerRecoveryErrorV1::PersistenceFailed)?;
        let stored = select_local_password_credentials_v1(&transaction, &identity.identity_ref)
            .map_err(map_local_identity_recovery_error_v1)?;
        validate_stored_local_password_credentials_v1(&identity, &stored)
            .map_err(map_local_identity_recovery_error_v1)?;
        if stored.last().is_none_or(|credential| {
            credential.credential_version != credential_version
                || credential.created_at != input.recovered_at
        }) {
            return Err(LocalOwnerRecoveryErrorV1::EvidenceDrift);
        }
        let (_, revoked_session_count) = revoke_active_local_sessions_for_identity_v1(
            &transaction,
            &identity.identity_ref,
            None,
            input.recovered_at,
            LocalSessionRevocationReasonV1::Recovery,
        )
        .map_err(map_local_session_recovery_error_v1)?;
        insert_local_identity_event_v1(
            &transaction,
            &identity.identity_ref,
            LocalIdentityEventKindV1::OwnerRecovered,
            None,
            Some(credential_version),
            &credential_id,
            input.recovered_at,
        )
        .map_err(map_local_identity_recovery_error_v1)?;
        let result = LocalOwnerRecoveryResultV1 {
            identity_ref: identity.identity_ref,
            credential_version,
            recovered_at: input.recovered_at.to_owned(),
            revoked_session_count,
        };
        transaction
            .commit()
            .map_err(|_| LocalOwnerRecoveryErrorV1::PersistenceFailed)?;
        Ok(result)
    }

    /// Permanently disables one non-owner identity through authenticated owner
    /// authority and atomically revokes its active sessions.
    ///
    /// Missing, already disabled, owner, and malformed targets return `None`
    /// without appending status evidence. v1 deliberately provides no
    /// re-enable path.
    ///
    /// # Errors
    ///
    /// Returns a generic authorization rejection for inactive owner session or
    /// wrong CSRF and fails closed for malformed time, drift, or persistence
    /// failure.
    pub fn disable_local_identity_v1(
        &mut self,
        target_identity_ref: &str,
        raw_owner_session_token: &str,
        raw_owner_csrf_token: &str,
        changed_at: &str,
    ) -> Result<Option<LocalIdentityDisablementResultV1>, LocalIdentityStoreErrorV1> {
        if !is_local_human_identity_ref_v1(target_identity_ref) {
            return Ok(None);
        }
        if canonical_utc_timestamp_millis_v1(changed_at).is_none() {
            return Err(LocalIdentityStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        let authentication = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_owner_session_token,
            Some(raw_owner_csrf_token),
            changed_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )
        .map_err(map_local_session_identity_error_v1)?;
        let LocalSessionActivityVerificationV1::Verified(owner_activity) = authentication else {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        };
        if owner_activity.session.role != LocalIdentityRoleV1::Owner
            || !owner_activity
                .session
                .role
                .allows_control(LocalControlPermissionV1::ManageIdentities)
        {
            return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
        }
        let Some(target) = select_local_identity_v1(&transaction, target_identity_ref)? else {
            return Ok(None);
        };
        if target.role == LocalIdentityRoleV1::Owner
            || target.status != LocalIdentityStatusV1::Active
        {
            return Ok(None);
        }
        let changed = canonical_utc_timestamp_millis_v1(changed_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let target_created = canonical_utc_timestamp_millis_v1(&target.created_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if changed < target_created {
            return Ok(None);
        }
        let status_evidence_digest = local_identity_status_evidence_digest_v1(
            &target.identity_ref,
            1,
            LocalIdentityStatusV1::Disabled.as_str(),
            &owner_activity.session.session_id,
            changed_at,
        );
        transaction
            .execute(
                "INSERT INTO lnsat_local_identity_status_events (
                    identity_ref, status_sequence, status, actor_session_id,
                    changed_at, status_evidence_digest
                 ) VALUES (?1, 1, 'disabled', ?2, ?3, ?4)",
                params![
                    target.identity_ref,
                    owner_activity.session.session_id,
                    changed_at,
                    &status_evidence_digest,
                ],
            )
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        let disabled = select_local_identity_v1(&transaction, &target.identity_ref)?
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if disabled.status != LocalIdentityStatusV1::Disabled {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        let (_, revoked_session_count) = revoke_active_local_sessions_for_identity_v1(
            &transaction,
            &target.identity_ref,
            Some(&owner_activity.session.session_id),
            changed_at,
            LocalSessionRevocationReasonV1::OwnerRevoke,
        )
        .map_err(map_local_session_identity_error_v1)?;
        insert_local_identity_event_v1(
            &transaction,
            &target.identity_ref,
            LocalIdentityEventKindV1::IdentityDisabled,
            Some(&owner_activity.session.session_id),
            None,
            &status_evidence_digest,
            changed_at,
        )?;
        let result = LocalIdentityDisablementResultV1 {
            identity_ref: target.identity_ref,
            status: disabled.status,
            changed_at: changed_at.to_owned(),
            revoked_session_count,
        };
        transaction
            .commit()
            .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
        Ok(Some(result))
    }

    /// Password-authenticates the bootstrapped owner and atomically persists
    /// one hash-only, expiring server session.
    ///
    /// Raw bearer and anti-CSRF tokens are returned exactly once. Only their
    /// independent profile-bound digests are stored.
    ///
    /// # Errors
    ///
    /// Returns a public-safe invalid-credential result for missing identity or
    /// password mismatch, and fails closed for invalid time, evidence drift,
    /// random-secret failure, or failed atomic persistence.
    pub fn issue_local_session_v1(
        &mut self,
        input: &LocalSessionIssueInputV1<'_>,
    ) -> Result<LocalSessionIssueResultV1, LocalSessionStoreErrorV1> {
        validate_local_session_window_v1(input.issued_at, input.expires_at)?;
        match self
            .verify_local_password_credential_v1(input.identity_ref, input.password)
            .map_err(map_local_identity_session_error_v1)?
        {
            LocalCredentialVerificationV1::Verified => {}
            LocalCredentialVerificationV1::Rejected => {
                return Err(LocalSessionStoreErrorV1::InvalidCredential);
            }
        }
        let secrets = create_local_session_secrets_v1()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let session = insert_local_session_v1(
            &transaction,
            input.identity_ref,
            &secrets,
            input.issued_at,
            input.expires_at,
        )?;
        transaction
            .commit()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;

        Ok(LocalSessionIssueResultV1 {
            session,
            raw_session_token: secrets.raw_session_token,
            raw_csrf_token: secrets.raw_csrf_token,
        })
    }

    /// Password-authenticates the immutable local owner.
    ///
    /// # Errors
    ///
    /// Returns the same public-safe outcomes as generic local session issue.
    pub fn issue_local_owner_session_v1(
        &mut self,
        input: &LocalOwnerSessionIssueInputV1<'_>,
    ) -> Result<LocalSessionIssueResultV1, LocalSessionStoreErrorV1> {
        match self
            .verify_local_owner_password_v1(input.identity_ref, input.password)
            .map_err(map_local_identity_session_error_v1)?
        {
            LocalCredentialVerificationV1::Verified => self.issue_local_session_v1(input),
            LocalCredentialVerificationV1::Rejected => {
                Err(LocalSessionStoreErrorV1::InvalidCredential)
            }
        }
    }

    /// Reads and validates one append-only post-v14 session event stream.
    ///
    /// Upgraded pre-v14 sessions may have no historical events; every new
    /// issue, revocation, and rotation after schema v14 appends atomically.
    ///
    /// # Errors
    ///
    /// Rejects malformed or unknown session scope, stored evidence drift, and
    /// failed persistence.
    pub fn read_local_session_events_v1(
        &self,
        session_id: &str,
    ) -> Result<Vec<LocalSessionEventV1>, LocalSessionStoreErrorV1> {
        if !is_local_session_id_v1(session_id) {
            return Err(LocalSessionStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let stored_session = select_local_session_v1(&self.connection, session_id)?
            .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
        let session = decode_local_session_v1(&self.connection, &stored_session)?;
        let stored = select_local_session_events_v1(&self.connection, session_id)?;
        validate_local_session_events_v1(&self.connection, &session, &stored)
    }

    /// Verifies one bearer token for a non-mutating local owner request.
    ///
    /// # Errors
    ///
    /// Returns invalid input for a malformed clock and evidence drift or
    /// persistence failure for unreadable durable state.
    pub fn verify_local_owner_session_v1(
        &self,
        raw_session_token: &str,
        checked_at: &str,
    ) -> Result<LocalSessionVerificationV1, LocalSessionStoreErrorV1> {
        Ok(filter_owner_session_v1(
            self.verify_local_session_internal_v1(raw_session_token, None, checked_at)?,
        ))
    }

    /// Verifies one bearer token for an active role-bound local human session.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time and fails closed for durable
    /// evidence drift or failed persistence.
    pub fn verify_local_session_v1(
        &self,
        raw_session_token: &str,
        checked_at: &str,
    ) -> Result<LocalSessionVerificationV1, LocalSessionStoreErrorV1> {
        self.verify_local_session_internal_v1(raw_session_token, None, checked_at)
    }

    /// Verifies one bearer token plus its independent anti-CSRF secret for a
    /// browser mutation.
    ///
    /// Host, Origin, method, and content-type enforcement remain mandatory at
    /// the later Gateway HTTP boundary.
    ///
    /// # Errors
    ///
    /// Returns invalid input for a malformed clock and evidence drift or
    /// persistence failure for unreadable durable state.
    pub fn verify_local_owner_browser_mutation_v1(
        &self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        checked_at: &str,
    ) -> Result<LocalSessionVerificationV1, LocalSessionStoreErrorV1> {
        Ok(filter_owner_session_v1(
            self.verify_local_session_internal_v1(
                raw_session_token,
                Some(raw_csrf_token),
                checked_at,
            )?,
        ))
    }

    /// Verifies one role-bound bearer token plus independent anti-CSRF secret.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time and fails closed for durable
    /// evidence drift or failed persistence.
    pub fn verify_local_browser_mutation_v1(
        &self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        checked_at: &str,
    ) -> Result<LocalSessionVerificationV1, LocalSessionStoreErrorV1> {
        self.verify_local_session_internal_v1(raw_session_token, Some(raw_csrf_token), checked_at)
    }

    /// Atomically verifies an active session, enforces a bounded idle timeout,
    /// and appends at most one granularity-limited activity event.
    ///
    /// A migrated v10 session without activity rows uses immutable `issued_at`
    /// as its initial anchor. Exact idle-boundary checks reject fail-closed.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time or timeout and fails closed for
    /// durable evidence drift or failed atomic persistence.
    pub fn verify_and_touch_local_session_v1(
        &mut self,
        raw_session_token: &str,
        raw_csrf_token: Option<&str>,
        checked_at: &str,
        idle_timeout_seconds: u32,
    ) -> Result<LocalSessionActivityVerificationV1, LocalSessionStoreErrorV1> {
        validate_local_session_idle_timeout_v1(idle_timeout_seconds)?;
        self.verify_schema()
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let result = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            raw_csrf_token,
            checked_at,
            idle_timeout_seconds,
        )?;
        transaction
            .commit()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        Ok(result)
    }

    /// Atomically replaces one active session with fresh bearer and CSRF
    /// secrets while preserving the original absolute expiry.
    ///
    /// The prior session is revoked with immutable `rotation` evidence in the
    /// same transaction. Replay, wrong CSRF, expired, idle, or already revoked
    /// input returns `None` without issuing replacement secrets.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time or timeout and fails closed for
    /// evidence drift, random-secret failure, or failed atomic persistence.
    pub fn rotate_local_session_v1(
        &mut self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        rotated_at: &str,
        idle_timeout_seconds: u32,
    ) -> Result<Option<LocalSessionRotationResultV1>, LocalSessionStoreErrorV1> {
        validate_local_session_idle_timeout_v1(idle_timeout_seconds)?;
        self.verify_schema()
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let verified = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            rotated_at,
            idle_timeout_seconds,
        )?;
        let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
            return Ok(None);
        };
        let prior = activity.session;
        let rotated = canonical_utc_timestamp_millis_v1(rotated_at)
            .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
        let expires = canonical_utc_timestamp_millis_v1(&prior.expires_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        if expires
            .checked_sub(rotated)
            .is_none_or(|remaining| remaining < 60_000)
        {
            return Ok(None);
        }
        let secrets = create_local_session_secrets_v1()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let replacement = insert_local_session_v1(
            &transaction,
            &prior.identity_ref,
            &secrets,
            rotated_at,
            &prior.expires_at,
        )?;
        insert_local_session_revocation_v1(
            &transaction,
            &prior,
            Some(&prior.session_id),
            rotated_at,
            LocalSessionRevocationReasonV1::Rotation,
        )?;
        insert_local_session_rotation_v1(&transaction, &prior, &replacement, rotated_at)?;
        transaction
            .commit()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        Ok(Some(LocalSessionRotationResultV1 {
            prior_session_id: prior.session_id,
            session: replacement,
            raw_session_token: secrets.raw_session_token,
            raw_csrf_token: secrets.raw_csrf_token,
            rotated_at: rotated_at.to_owned(),
        }))
    }

    /// Appends one immutable authenticated session revocation.
    ///
    /// Exact replay returns `false`; invalid, expired, revoked, wrong-token, or
    /// wrong-CSRF input is indistinguishably rejected as `false`.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time and fails closed for drift or
    /// failed persistence.
    pub fn revoke_local_session_v1(
        &mut self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        revoked_at: &str,
        reason: LocalSessionRevocationReasonV1,
    ) -> Result<bool, LocalSessionStoreErrorV1> {
        if reason == LocalSessionRevocationReasonV1::Recovery {
            return Err(LocalSessionStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let verified = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            revoked_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )?;
        let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
            return Ok(false);
        };
        let session = activity.session;
        insert_local_session_revocation_v1(
            &transaction,
            &session,
            Some(&session.session_id),
            revoked_at,
            reason,
        )?;
        transaction
            .commit()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        Ok(true)
    }

    /// Atomically revokes every active session for the authenticated identity.
    ///
    /// The caller session and independent anti-CSRF secret authenticate the
    /// family. Expired, future, and already revoked sessions remain immutable
    /// and receive no duplicate row.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time and fails closed for wrong
    /// bearer/CSRF, evidence drift, or failed atomic persistence.
    pub fn revoke_all_local_sessions_v1(
        &mut self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        revoked_at: &str,
        reason: LocalSessionRevocationReasonV1,
    ) -> Result<Option<LocalSessionFamilyRevocationV1>, LocalSessionStoreErrorV1> {
        if reason == LocalSessionRevocationReasonV1::Recovery {
            return Err(LocalSessionStoreErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        let verified = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            revoked_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )?;
        let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
            return Ok(None);
        };
        let current_session = activity.session;
        let (family_session_count, newly_revoked_session_count) =
            revoke_active_local_sessions_for_identity_v1(
                &transaction,
                &current_session.identity_ref,
                Some(&current_session.session_id),
                revoked_at,
                reason,
            )?;
        let result = LocalSessionFamilyRevocationV1 {
            identity_ref: current_session.identity_ref,
            family_session_count,
            newly_revoked_session_count,
            revoked_at: revoked_at.to_owned(),
        };
        if result.newly_revoked_session_count == 0 {
            return Err(LocalSessionStoreErrorV1::EvidenceDrift);
        }
        transaction
            .commit()
            .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
        Ok(Some(result))
    }

    /// Revokes one active owner session without allowing a non-owner session
    /// to pass through the compatibility entry point.
    ///
    /// # Errors
    ///
    /// Returns invalid input for malformed time and fails closed for durable
    /// evidence drift or failed persistence.
    pub fn revoke_local_owner_session_v1(
        &mut self,
        raw_session_token: &str,
        raw_csrf_token: &str,
        revoked_at: &str,
        reason: LocalSessionRevocationReasonV1,
    ) -> Result<bool, LocalSessionStoreErrorV1> {
        let verified = self.verify_local_owner_browser_mutation_v1(
            raw_session_token,
            raw_csrf_token,
            revoked_at,
        )?;
        if !matches!(verified, LocalSessionVerificationV1::Verified(_)) {
            return Ok(false);
        }
        self.revoke_local_session_v1(raw_session_token, raw_csrf_token, revoked_at, reason)
    }

    fn verify_local_session_internal_v1(
        &self,
        raw_session_token: &str,
        raw_csrf_token: Option<&str>,
        checked_at: &str,
    ) -> Result<LocalSessionVerificationV1, LocalSessionStoreErrorV1> {
        self.verify_schema()
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        verify_local_session_on_connection_v1(
            &self.connection,
            raw_session_token,
            raw_csrf_token,
            checked_at,
        )
    }

    /// Builds one bounded, read-only retention plan.
    ///
    /// Current packet, policy, approval, and audit families are immutable
    /// control-plane evidence. They are never cleanup candidates. Candidate
    /// limits reserve a fail-closed bound for later explicitly removable
    /// families without granting deletion authority.
    ///
    /// # Errors
    ///
    /// Returns a stable error for an invalid limit, policy drift, or unreadable
    /// retention evidence.
    pub fn plan_retention_v1(
        &self,
        candidate_limit: u32,
    ) -> Result<SqliteRetentionPlanV1, SqliteRetentionErrorV1> {
        if candidate_limit == 0 || candidate_limit > RETENTION_CANDIDATE_LIMIT_MAX {
            return Err(SqliteRetentionErrorV1::InvalidCandidateLimit);
        }
        self.verify_schema()
            .map_err(|_| SqliteRetentionErrorV1::EvidenceDrift)?;
        let policies = read_retention_policies_v1(&self.connection)?;
        verify_retention_policies_v1(&policies, &RETENTION_RECORD_FAMILIES_V17)?;
        let protected_record_count = count_protected_records_v1(&self.connection)?;
        Ok(SqliteRetentionPlanV1 {
            candidate_limit,
            policies,
            protected_record_count,
            cleanup_candidate_count: 0,
            cleanup_attempted: false,
        })
    }

    /// Classifies one existing database without migration, repair, or writes.
    ///
    /// Exact current or older recognized schemas are distinguished from
    /// unsupported versions, unknown databases, migration drift, integrity
    /// failure, and unreadable state. Returned readiness is structural
    /// evidence only; it grants no activation or migration authority.
    ///
    /// # Errors
    ///
    /// Returns a stable recovery error for missing, invalid, or symlink paths.
    pub fn inspect_recovery_state_v1(
        path: impl AsRef<Path>,
    ) -> Result<SqliteRecoveryInspectionV1, SqliteRecoveryErrorV1> {
        let database_path = canonical_existing_file(path.as_ref())?;
        let Ok(connection) = Connection::open_with_flags(
            &database_path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        ) else {
            return Ok(unreadable_recovery_inspection(database_path, None));
        };
        if configure_recovery_reader(&connection).is_err() {
            return Ok(unreadable_recovery_inspection(database_path, None));
        }
        Ok(classify_recovery_connection(database_path, &connection))
    }

    /// Inspects one existing database read-only, then atomically appends exact
    /// immutable classification evidence.
    ///
    /// The canonical path is represented only by an OS-local SHA-256
    /// fingerprint. No raw path, repair, migration, quarantine mutation, or
    /// activation authority is persisted.
    ///
    /// # Errors
    ///
    /// Rejects invalid scope/time/path input, failed inspection, conflicting
    /// replay or event identity, schema drift, and failed persistence.
    pub fn append_recovery_inspection_event_v1(
        &mut self,
        input: &SqliteRecoveryInspectionEventInputV1,
    ) -> Result<SqliteRecoveryInspectionEventWriteV1, SqliteRecoveryInspectionEventErrorV1> {
        validate_recovery_inspection_event_input_v1(input)?;
        let inspection = Self::inspect_recovery_state_v1(&input.target_database_path)
            .map_err(|_| SqliteRecoveryInspectionEventErrorV1::InspectionFailed)?;
        let expected = derive_recovery_inspection_event_v1(input, &inspection);
        self.verify_schema()
            .map_err(|_| SqliteRecoveryInspectionEventErrorV1::EvidenceDrift)?;

        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)?;

        if let Some(row) = select_recovery_inspection_event_by_idempotency(
            &transaction,
            &expected.deployment_ref,
            &expected.idempotency_key,
        )? {
            let record = decode_recovery_inspection_event_v1(&row)?;
            if record.event != expected {
                return Err(SqliteRecoveryInspectionEventErrorV1::IdempotencyConflict);
            }
            transaction
                .commit()
                .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)?;
            return Ok(SqliteRecoveryInspectionEventWriteV1 {
                created: false,
                record,
            });
        }

        if select_recovery_inspection_event_by_id(&transaction, &expected.event_id)?.is_some() {
            return Err(SqliteRecoveryInspectionEventErrorV1::EventIdentityConflict);
        }

        transaction
            .execute(
                "INSERT INTO lnsat_recovery_inspection_events (
                    event_id, schema_id, deployment_ref, target_ref,
                    target_path_sha256, idempotency_key, observed_at,
                    disposition, observed_schema_version,
                    observed_migration_count, integrity_ok,
                    quarantine_recommended, inspection_mode,
                    automatic_action, activation_authorized
                 ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                    ?13, ?14, ?15
                 )",
                params![
                    expected.event_id,
                    expected.schema_id,
                    expected.deployment_ref,
                    expected.target_ref,
                    expected.target_path_sha256,
                    expected.idempotency_key,
                    expected.observed_at,
                    expected.disposition.as_str(),
                    expected.observed_schema_version,
                    expected.observed_migration_count,
                    i64::from(expected.integrity_ok),
                    i64::from(expected.quarantine_recommended),
                    "read_only",
                    "none",
                    0_i64,
                ],
            )
            .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)?;
        transaction
            .commit()
            .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)?;

        Ok(SqliteRecoveryInspectionEventWriteV1 {
            created: true,
            record: SqliteRecoveryInspectionEventRecordV1 { event: expected },
        })
    }

    /// Reads one immutable recovery-inspection event under exact deployment and
    /// target scope.
    ///
    /// # Errors
    ///
    /// Returns evidence drift for malformed stored rows and a public-safe
    /// persistence error for failed reads.
    pub fn read_recovery_inspection_event_v1(
        &self,
        deployment_ref: &str,
        target_ref: &str,
        event_id: &str,
    ) -> Result<Option<SqliteRecoveryInspectionEventRecordV1>, SqliteRecoveryInspectionEventErrorV1>
    {
        if !is_valid_reference_v1(deployment_ref)
            || !is_valid_reference_v1(target_ref)
            || !is_sha256_identity(event_id)
        {
            return Err(SqliteRecoveryInspectionEventErrorV1::InvalidInput);
        }
        self.verify_schema()
            .map_err(|_| SqliteRecoveryInspectionEventErrorV1::EvidenceDrift)?;
        select_recovery_inspection_event_by_scope(
            &self.connection,
            deployment_ref,
            target_ref,
            event_id,
        )?
        .map(|row| decode_recovery_inspection_event_v1(&row))
        .transpose()
    }

    /// Atomically appends one immutable stable packet or returns its exact replay.
    ///
    /// A project-scoped idempotency key may replay only when packet id,
    /// canonical bytes, and digest all match. Packet-id or idempotency reuse
    /// with different evidence fails closed.
    ///
    /// # Errors
    ///
    /// Returns a stable packet-store error for invalid packet values,
    /// conflicting identities, durable evidence drift, or failed persistence.
    pub fn append_packet_envelope_v1(
        &mut self,
        packet: &PacketEnvelopeV1,
    ) -> Result<PacketStoreWriteV1, PacketStoreErrorV1> {
        let canonical_packet = canonicalize_packet_envelope_v1(packet)
            .map_err(|_| PacketStoreErrorV1::InvalidPacket)?;
        let packet_sha256 =
            hash_packet_envelope_v1(packet).map_err(|_| PacketStoreErrorV1::InvalidPacket)?;
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?;

        if let Some(existing) = select_packet_by_idempotency(
            &transaction,
            &packet.project_ref,
            &packet.idempotency_key,
        )? {
            let record = decode_packet_record(&transaction, &existing)?;
            if record.packet.packet_id != packet.packet_id
                || record.packet_sha256 != packet_sha256
                || record.canonical_packet != canonical_packet
            {
                return Err(PacketStoreErrorV1::IdempotencyConflict);
            }
            transaction
                .commit()
                .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?;
            return Ok(PacketStoreWriteV1 {
                created: false,
                record,
            });
        }

        if select_packet_by_id(&transaction, &packet.packet_id)?.is_some() {
            return Err(PacketStoreErrorV1::PacketIdentityConflict);
        }

        transaction
            .execute(
                "INSERT INTO lnsat_packet_envelopes (
                    packet_id, packet_sha256, contract_version, schema_id,
                    packet_type, actor_ref, session_ref, project_ref,
                    idempotency_key, created_at, expires_at, canonical_packet
                 ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
                 )",
                params![
                    packet.packet_id,
                    packet_sha256,
                    packet.contract_version,
                    packet.schema_id,
                    packet.packet_type,
                    packet.actor_ref,
                    packet.session_ref,
                    packet.project_ref,
                    packet.idempotency_key,
                    packet.created_at,
                    packet.expires_at,
                    canonical_packet,
                ],
            )
            .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?;
        for (ordinal, resource_ref) in packet.resource_refs.iter().enumerate() {
            let ordinal = i64::try_from(ordinal).map_err(|_| PacketStoreErrorV1::InvalidPacket)?;
            transaction
                .execute(
                    "INSERT INTO lnsat_packet_resource_refs (
                        packet_id, project_ref, ordinal, resource_ref
                     ) VALUES (?1, ?2, ?3, ?4)",
                    params![packet.packet_id, packet.project_ref, ordinal, resource_ref],
                )
                .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?;
        }
        transaction
            .commit()
            .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?;

        Ok(PacketStoreWriteV1 {
            created: true,
            record: PacketStoreRecordV1 {
                packet: packet.clone(),
                canonical_packet,
                packet_sha256,
            },
        })
    }

    /// Reads one packet only through its exact project scope.
    ///
    /// Cross-project and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns a stable error when database access fails or stored evidence
    /// no longer matches the canonical packet contract.
    pub fn read_packet_envelope_v1(
        &self,
        project_ref: &str,
        packet_id: &str,
    ) -> Result<Option<PacketStoreRecordV1>, PacketStoreErrorV1> {
        let row = select_packet_by_project(&self.connection, project_ref, packet_id)?;
        row.as_ref()
            .map(|value| decode_packet_record(&self.connection, value))
            .transpose()
    }

    /// Reads one packet only through exact project and resource scope.
    ///
    /// Cross-scope and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns a stable error when database access fails or stored evidence
    /// no longer matches the canonical packet contract.
    pub fn read_packet_envelope_for_resource_v1(
        &self,
        project_ref: &str,
        resource_ref: &str,
        packet_id: &str,
    ) -> Result<Option<PacketStoreRecordV1>, PacketStoreErrorV1> {
        let row =
            select_packet_by_resource(&self.connection, project_ref, resource_ref, packet_id)?;
        row.as_ref()
            .map(|value| decode_packet_record(&self.connection, value))
            .transpose()
    }

    /// Atomically appends one stable policy decision or returns its exact replay.
    ///
    /// Supplied decision must exactly rederive from already-persisted packet
    /// evidence at its declared evaluation time. Persistence never evaluates a
    /// different packet, widens scope, or grants execution authority.
    ///
    /// # Errors
    ///
    /// Returns a stable error for missing/mismatched packet evidence,
    /// conflicting decision identity, durable drift, or failed persistence.
    pub fn append_policy_decision_v1(
        &mut self,
        decision: &PolicyDecisionV1,
    ) -> Result<PolicyStoreWriteV1, PolicyStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)?;
        let packet_row = select_packet_by_project(
            &transaction,
            &decision.project_ref,
            &decision.packet_ref.packet_id,
        )
        .map_err(map_packet_store_error)?
        .ok_or(PolicyStoreErrorV1::InvalidDecision)?;
        let packet_record =
            decode_packet_record(&transaction, &packet_row).map_err(map_packet_store_error)?;
        let expected =
            decide_packet_envelope_policy_v1(&packet_record.packet, &decision.evaluated_at)
                .map_err(|_| PolicyStoreErrorV1::InvalidDecision)?;
        if expected != *decision {
            return Err(PolicyStoreErrorV1::InvalidDecision);
        }

        if let Some(existing) = select_policy_by_id(&transaction, &decision.decision_id)? {
            let record = decode_policy_record(&transaction, &existing)?;
            if record.decision != *decision {
                return Err(PolicyStoreErrorV1::DecisionIdentityConflict);
            }
            transaction
                .commit()
                .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)?;
            return Ok(PolicyStoreWriteV1 {
                created: false,
                record,
            });
        }
        if select_policy_by_packet_time(
            &transaction,
            &decision.packet_ref.packet_id,
            &decision.evaluated_at,
        )?
        .is_some()
        {
            return Err(PolicyStoreErrorV1::DecisionIdentityConflict);
        }

        transaction
            .execute(
                "INSERT INTO lnsat_policy_decisions (
                    decision_id, schema_id, packet_id, packet_sha256,
                    project_ref, evaluated_at, expires_at, decision,
                    requires_approval
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    decision.decision_id,
                    decision.schema_id,
                    decision.packet_ref.packet_id,
                    decision.packet_ref.packet_hash,
                    decision.project_ref,
                    decision.evaluated_at,
                    decision.expires_at,
                    decision.decision.as_str(),
                    i64::from(decision.requires_approval),
                ],
            )
            .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)?;
        transaction
            .commit()
            .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)?;

        Ok(PolicyStoreWriteV1 {
            created: true,
            record: PolicyStoreRecordV1 {
                decision: decision.clone(),
            },
        })
    }

    /// Reads one policy decision only through exact project scope.
    ///
    /// Cross-project and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns a stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_policy_decision_v1(
        &self,
        project_ref: &str,
        decision_id: &str,
    ) -> Result<Option<PolicyStoreRecordV1>, PolicyStoreErrorV1> {
        let row = select_policy_by_project(&self.connection, project_ref, decision_id)?;
        row.as_ref()
            .map(|value| decode_policy_record(&self.connection, value))
            .transpose()
    }

    /// Reads one policy decision through exact project and resource scope.
    ///
    /// Cross-scope and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns a stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_policy_decision_for_resource_v1(
        &self,
        project_ref: &str,
        resource_ref: &str,
        decision_id: &str,
    ) -> Result<Option<PolicyStoreRecordV1>, PolicyStoreErrorV1> {
        let row =
            select_policy_by_resource(&self.connection, project_ref, resource_ref, decision_id)?;
        row.as_ref()
            .map(|value| decode_policy_record(&self.connection, value))
            .transpose()
    }

    /// Atomically appends one stable approval request or returns exact replay.
    ///
    /// Supplied request must exactly rederive from persisted
    /// approval-required policy evidence. This stores pending request evidence
    /// only; it cannot approve, deny, authenticate, or authorize execution.
    ///
    /// # Errors
    ///
    /// Returns stable error for missing/mismatched policy evidence,
    /// conflicting request identity, durable drift, or failed persistence.
    pub fn append_approval_request_v1(
        &mut self,
        request: &ApprovalRequestV1,
    ) -> Result<ApprovalRequestStoreWriteV1, ApprovalRequestStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)?;
        let write = append_approval_request_in_transaction_v1(&transaction, request)?;
        transaction
            .commit()
            .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)?;
        Ok(write)
    }

    /// Authenticates one local owner/operator and atomically appends the
    /// approval request derived from that requester's exact persisted policy.
    ///
    /// The policy actor and session must equal the verified local session.
    /// Server-owned time becomes the request time. This stores pending
    /// evidence only and grants no approval or execution authority.
    ///
    /// # Errors
    ///
    /// Returns a stable error for rejected authentication/authorization,
    /// missing or mismatched policy evidence, expiry, durable drift, identity
    /// conflict, or failed persistence.
    pub fn append_authenticated_approval_request_v1(
        &mut self,
        project_ref: &str,
        policy_decision_id: &str,
        raw_session_token: &str,
        raw_csrf_token: &str,
        checked_at: &str,
    ) -> Result<ApprovalRequestStoreWriteV1, ApprovalRequestStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)?;
        let verified = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            checked_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )
        .map_err(map_local_session_approval_request_error_v1)?;
        let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
            return Err(ApprovalRequestStoreErrorV1::AuthorizationRejected);
        };
        let session = activity.session;
        if !session
            .role
            .allows_control(LocalControlPermissionV1::RequestAction)
        {
            return Err(ApprovalRequestStoreErrorV1::AuthorizationRejected);
        }
        let policy_row = select_policy_by_project(&transaction, project_ref, policy_decision_id)
            .map_err(map_policy_store_error)?
            .ok_or(ApprovalRequestStoreErrorV1::InvalidRequest)?;
        let policy_record =
            decode_policy_record(&transaction, &policy_row).map_err(map_policy_store_error)?;
        let expected_session_ref = format!("session:local:{}", session.session_id);
        if policy_record.decision.actor_ref != session.identity_ref
            || policy_record.decision.session_ref != expected_session_ref
        {
            return Err(ApprovalRequestStoreErrorV1::AuthorizationRejected);
        }
        let request = create_approval_request_v1(&policy_record.decision, checked_at)
            .map_err(|_| ApprovalRequestStoreErrorV1::InvalidRequest)?;
        let write = append_approval_request_in_transaction_v1(&transaction, &request)?;
        transaction
            .commit()
            .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)?;
        Ok(write)
    }

    /// Reads one approval request only through exact project scope.
    ///
    /// Cross-project and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_approval_request_v1(
        &self,
        project_ref: &str,
        approval_request_id: &str,
    ) -> Result<Option<ApprovalRequestStoreRecordV1>, ApprovalRequestStoreErrorV1> {
        let row =
            select_approval_request_by_project(&self.connection, project_ref, approval_request_id)?;
        row.as_ref()
            .map(|value| decode_approval_request_record(&self.connection, value))
            .transpose()
    }

    /// Reads one approval request through exact project and resource scope.
    ///
    /// Cross-scope and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_approval_request_for_resource_v1(
        &self,
        project_ref: &str,
        resource_ref: &str,
        approval_request_id: &str,
    ) -> Result<Option<ApprovalRequestStoreRecordV1>, ApprovalRequestStoreErrorV1> {
        let row = select_approval_request_by_resource(
            &self.connection,
            project_ref,
            resource_ref,
            approval_request_id,
        )?;
        row.as_ref()
            .map(|value| decode_approval_request_record(&self.connection, value))
            .transpose()
    }

    /// Atomically appends one authenticated human decision or exact replay.
    ///
    /// Supplied decision must exactly rederive from one persisted pending
    /// request and bind the exact active local owner/operator session. The
    /// browser mutation requires its independent CSRF proof and the trusted
    /// check time must equal the decision time. One request may receive one
    /// immutable terminal decision. Approval grants no execution authority.
    ///
    /// # Errors
    ///
    /// Returns stable error for rejected authentication/authorization,
    /// missing/mismatched request evidence, conflicting decision identity,
    /// durable drift, or failed persistence.
    pub fn append_authenticated_approval_decision_v1(
        &mut self,
        decision: &ApprovalDecisionV1,
        raw_session_token: &str,
        raw_csrf_token: &str,
        checked_at: &str,
    ) -> Result<ApprovalDecisionStoreWriteV1, ApprovalDecisionStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)?;
        let verified = verify_and_touch_local_session_on_connection_v1(
            &transaction,
            raw_session_token,
            Some(raw_csrf_token),
            checked_at,
            LOCAL_SESSION_IDLE_TIMEOUT_DEFAULT_SECONDS_V1,
        )
        .map_err(map_local_session_approval_error_v1)?;
        let LocalSessionActivityVerificationV1::Verified(activity) = verified else {
            return Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected);
        };
        let session = activity.session;
        let expected_session_ref = format!("session:local:{}", session.session_id);
        if checked_at != decision.decided_at
            || session.identity_ref != decision.approver_ref
            || expected_session_ref != decision.approver_session_ref
            || !session
                .role
                .allows_control(LocalControlPermissionV1::DecideApproval)
        {
            return Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected);
        }
        let write = append_approval_decision_in_transaction_v1(&transaction, decision)?;
        transaction
            .commit()
            .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)?;
        Ok(write)
    }

    #[cfg(test)]
    fn append_approval_decision_evidence_for_test_v1(
        &mut self,
        decision: &ApprovalDecisionV1,
    ) -> Result<ApprovalDecisionStoreWriteV1, ApprovalDecisionStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)?;
        let write = append_approval_decision_in_transaction_v1(&transaction, decision)?;
        transaction
            .commit()
            .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)?;
        Ok(write)
    }

    /// Reads one approval decision only through exact project scope.
    ///
    /// Cross-project and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_approval_decision_v1(
        &self,
        project_ref: &str,
        approval_decision_id: &str,
    ) -> Result<Option<ApprovalDecisionStoreRecordV1>, ApprovalDecisionStoreErrorV1> {
        let row = select_approval_decision_by_project(
            &self.connection,
            project_ref,
            approval_decision_id,
        )?;
        row.as_ref()
            .map(|value| decode_approval_decision_record(&self.connection, value))
            .transpose()
    }

    /// Reads one approval decision through exact project and resource scope.
    ///
    /// Cross-scope and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_approval_decision_for_resource_v1(
        &self,
        project_ref: &str,
        resource_ref: &str,
        approval_decision_id: &str,
    ) -> Result<Option<ApprovalDecisionStoreRecordV1>, ApprovalDecisionStoreErrorV1> {
        let row = select_approval_decision_by_resource(
            &self.connection,
            project_ref,
            resource_ref,
            approval_decision_id,
        )?;
        row.as_ref()
            .map(|value| decode_approval_decision_record(&self.connection, value))
            .transpose()
    }

    /// Atomically appends one stable audit event or returns its exact replay.
    ///
    /// Supplied evidence must exactly rederive from its complete persisted
    /// source chain. A project-scoped idempotency key may bind only one
    /// observation. Persistence authenticates no actor, requests no further
    /// persistence, and grants no execution authority.
    ///
    /// # Errors
    ///
    /// Returns stable error for missing/mismatched source evidence,
    /// idempotency or identity conflicts, durable drift, or failed persistence.
    pub fn append_audit_event_v1(
        &mut self,
        event: &AuditEventV1,
    ) -> Result<AuditEventStoreWriteV1, AuditEventStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?;
        let expected = rederive_audit_event_from_refs(
            &transaction,
            AuditSourceRefs {
                event_type: event.event_type,
                project_ref: &event.project_ref,
                packet_id: &event.packet_ref.packet_id,
                policy_decision_id: &event.policy_ref.decision_id,
                approval_request_id: event
                    .approval_request_ref
                    .as_ref()
                    .map(|value| value.approval_request_id.as_str()),
                approval_decision_id: event
                    .approval_decision_ref
                    .as_ref()
                    .map(|value| value.approval_decision_id.as_str()),
                observed_at: &event.observed_at,
            },
            AuditEventStoreErrorV1::InvalidEvent,
        )?;
        if expected != *event {
            return Err(AuditEventStoreErrorV1::InvalidEvent);
        }

        if let Some(existing) = select_audit_event_by_idempotency(
            &transaction,
            &event.project_ref,
            &event.idempotency_key,
        )? {
            let record = decode_audit_event_record(&transaction, &existing)?;
            if record.event != *event {
                return Err(AuditEventStoreErrorV1::IdempotencyConflict);
            }
            transaction
                .commit()
                .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?;
            return Ok(AuditEventStoreWriteV1 {
                created: false,
                record,
            });
        }
        if select_audit_event_by_id(&transaction, &event.event_id)?.is_some() {
            return Err(AuditEventStoreErrorV1::EventIdentityConflict);
        }
        insert_audit_event(&transaction, event)?;
        transaction
            .commit()
            .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?;

        Ok(AuditEventStoreWriteV1 {
            created: true,
            record: AuditEventStoreRecordV1 {
                event: event.clone(),
            },
        })
    }

    /// Reads one audit event only through exact project scope.
    ///
    /// Cross-project and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_audit_event_v1(
        &self,
        project_ref: &str,
        event_id: &str,
    ) -> Result<Option<AuditEventStoreRecordV1>, AuditEventStoreErrorV1> {
        let row = select_audit_event_by_project(&self.connection, project_ref, event_id)?;
        row.as_ref()
            .map(|value| decode_audit_event_record(&self.connection, value))
            .transpose()
    }

    /// Reads one audit event through exact project and resource scope.
    ///
    /// Cross-scope and missing records are indistinguishable.
    ///
    /// # Errors
    ///
    /// Returns stable error when database access fails or persisted evidence
    /// no longer rederives exactly.
    pub fn read_audit_event_for_resource_v1(
        &self,
        project_ref: &str,
        resource_ref: &str,
        event_id: &str,
    ) -> Result<Option<AuditEventStoreRecordV1>, AuditEventStoreErrorV1> {
        let row =
            select_audit_event_by_resource(&self.connection, project_ref, resource_ref, event_id)?;
        row.as_ref()
            .map(|value| decode_audit_event_record(&self.connection, value))
            .transpose()
    }

    /// Creates one online-consistent standalone snapshot at a fresh path.
    ///
    /// Source schema and integrity are checked before copy. Snapshot schema,
    /// migrations, integrity, byte digest, and size are checked before atomic
    /// publication. Existing destinations, symlinks, and source-path reuse
    /// fail closed. This operation grants no runtime or restore authority.
    ///
    /// # Errors
    ///
    /// Returns a stable recovery error without reflecting database content.
    pub fn create_online_backup_v1(
        &self,
        backup_path: impl AsRef<Path>,
    ) -> Result<SqliteBackupEvidenceV1, SqliteRecoveryErrorV1> {
        self.verify_schema()
            .and_then(|()| self.verify_integrity())
            .map_err(|_| SqliteRecoveryErrorV1::SourceInvalid)?;
        let source_path = canonical_existing_file(&self.database_path)?;
        let published_path = normalize_destination_path(backup_path.as_ref())?;
        if source_path == published_path {
            return Err(SqliteRecoveryErrorV1::SourceDestinationConflict);
        }
        ensure_fresh_destination(&published_path)?;

        let temporary = TemporaryRecoveryFile::create(
            &published_path,
            "backup",
            SqliteRecoveryErrorV1::BackupFailed,
        )?;
        let mut destination =
            Connection::open_with_flags(temporary.path(), OpenFlags::SQLITE_OPEN_READ_WRITE)
                .map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?;
        run_bounded_online_backup(&self.connection, &mut destination)?;
        destination
            .query_row("PRAGMA journal_mode = DELETE", [], |row| {
                row.get::<_, String>(0)
            })
            .map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?;
        destination
            .close()
            .map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?;

        sync_regular_file(temporary.path()).map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?;
        let snapshot =
            verify_recovery_snapshot(temporary.path(), SqliteRecoveryErrorV1::BackupFailed)?;
        let backup_sha256 =
            sha256_file(temporary.path()).map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?;
        let file_size_bytes = file_size(temporary.path(), SqliteRecoveryErrorV1::BackupFailed)?;
        temporary.publish(&published_path)?;

        Ok(SqliteBackupEvidenceV1 {
            backup_path: published_path,
            schema_version: snapshot.schema_version,
            migration_count: snapshot.migration_count,
            file_size_bytes,
            backup_sha256,
            online_consistent: true,
            replaced_existing: false,
        })
    }

    /// Restores a verified backup into one fresh inert database path.
    ///
    /// Backup bytes, current schema, migrations, and integrity are verified
    /// before copy. Copied bytes are compared before atomic publication.
    /// Existing destinations are never replaced and restored state is not
    /// opened as an active store by this operation.
    ///
    /// # Errors
    ///
    /// Returns a stable recovery error without reflecting database content.
    pub fn restore_backup_v1(
        backup_path: impl AsRef<Path>,
        restored_database_path: impl AsRef<Path>,
    ) -> Result<SqliteRestoreEvidenceV1, SqliteRecoveryErrorV1> {
        let verified_backup_path = canonical_existing_file(backup_path.as_ref())?;
        let published_path = normalize_destination_path(restored_database_path.as_ref())?;
        if verified_backup_path == published_path {
            return Err(SqliteRecoveryErrorV1::SourceDestinationConflict);
        }
        ensure_fresh_destination(&published_path)?;
        let source_snapshot =
            verify_recovery_snapshot(&verified_backup_path, SqliteRecoveryErrorV1::SourceInvalid)?;
        let source_sha256 =
            sha256_file(&verified_backup_path).map_err(|_| SqliteRecoveryErrorV1::SourceInvalid)?;
        let source_size = file_size(&verified_backup_path, SqliteRecoveryErrorV1::SourceInvalid)?;

        let temporary = TemporaryRecoveryFile::create(
            &published_path,
            "restore",
            SqliteRecoveryErrorV1::RestoreFailed,
        )?;
        copy_snapshot(&verified_backup_path, temporary.path())?;
        sync_regular_file(temporary.path()).map_err(|_| SqliteRecoveryErrorV1::RestoreFailed)?;
        let copied_sha256 =
            sha256_file(temporary.path()).map_err(|_| SqliteRecoveryErrorV1::RestoreFailed)?;
        let copied_size = file_size(temporary.path(), SqliteRecoveryErrorV1::RestoreFailed)?;
        if copied_sha256 != source_sha256 || copied_size != source_size {
            return Err(SqliteRecoveryErrorV1::EvidenceMismatch);
        }
        let copied_snapshot =
            verify_recovery_snapshot(temporary.path(), SqliteRecoveryErrorV1::EvidenceMismatch)?;
        if copied_snapshot != source_snapshot {
            return Err(SqliteRecoveryErrorV1::EvidenceMismatch);
        }
        temporary.publish(&published_path)?;

        Ok(SqliteRestoreEvidenceV1 {
            backup_path: verified_backup_path,
            restored_database_path: published_path,
            schema_version: copied_snapshot.schema_version,
            migration_count: copied_snapshot.migration_count,
            file_size_bytes: copied_size,
            snapshot_sha256: copied_sha256,
            replaced_existing: false,
            activated: false,
        })
    }

    /// Runs `SQLite` integrity and foreign-key checks.
    ///
    /// # Errors
    ///
    /// Returns a public-safe failure without reflecting database content.
    pub fn verify_integrity(&self) -> Result<(), SqliteStoreError> {
        verify_connection_integrity(&self.connection)
    }

    fn apply_pending_migrations(&mut self) -> Result<(), SqliteStoreError> {
        let current = pragma_i64(&self.connection, "user_version")
            .map_err(|_| SqliteStoreError::MigrationFailed)?;
        if current > SQLITE_SCHEMA_VERSION {
            return Err(SqliteStoreError::UnsupportedSchemaVersion);
        }
        if current == 0 && user_table_count(&self.connection)? != 0 {
            return Err(SqliteStoreError::UnrecognizedDatabase);
        }
        if current > 0 {
            verify_schema_at_version(&self.connection, current)?;
        }

        for migration in MIGRATIONS
            .iter()
            .copied()
            .filter(|migration| migration.version > current)
        {
            apply_migration(&mut self.connection, migration)?;
        }
        Ok(())
    }

    fn verify_schema(&self) -> Result<(), SqliteStoreError> {
        verify_current_schema(&self.connection)
    }
}

fn verify_current_schema(connection: &Connection) -> Result<(), SqliteStoreError> {
    let version =
        pragma_i64(connection, "user_version").map_err(|_| SqliteStoreError::MigrationDrift)?;
    if version > SQLITE_SCHEMA_VERSION {
        return Err(SqliteStoreError::UnsupportedSchemaVersion);
    }
    if version != SQLITE_SCHEMA_VERSION {
        return Err(SqliteStoreError::MigrationDrift);
    }
    verify_schema_at_version(connection, SQLITE_SCHEMA_VERSION)
}

fn apply_migration(
    connection: &mut Connection,
    migration: Migration,
) -> Result<(), SqliteStoreError> {
    apply_migration_with_precommit(connection, migration, || Ok(()))
}

fn apply_migration_with_precommit(
    connection: &mut Connection,
    migration: Migration,
    before_commit: impl FnOnce() -> Result<(), SqliteStoreError>,
) -> Result<(), SqliteStoreError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|_| SqliteStoreError::MigrationFailed)?;
    transaction
        .execute_batch(migration.sql)
        .map_err(|_| SqliteStoreError::MigrationFailed)?;
    transaction
        .execute(
            "INSERT INTO lnsat_schema_migrations (
                schema_version, migration_id, migration_sha256, applied_order
             ) VALUES (?1, ?2, ?3, ?4)",
            params![
                migration.version,
                migration.id,
                migration_digest(migration.sql),
                migration.version
            ],
        )
        .map_err(|_| SqliteStoreError::MigrationFailed)?;
    transaction
        .pragma_update(None, "user_version", migration.version)
        .map_err(|_| SqliteStoreError::MigrationFailed)?;
    before_commit()?;
    transaction
        .commit()
        .map_err(|_| SqliteStoreError::MigrationFailed)
}

fn verify_required_schema_objects(
    connection: &Connection,
    version: i64,
) -> Result<(), SqliteStoreError> {
    let tables = user_table_names(connection)?;
    let required_tables: &[&str] = match version {
        1 => &REQUIRED_TABLES_V1,
        2 => &REQUIRED_TABLES_V2,
        3 => &REQUIRED_TABLES_V3,
        4 => &REQUIRED_TABLES_V4,
        5 => &REQUIRED_TABLES_V5,
        6 => &REQUIRED_TABLES_V6,
        7 => &REQUIRED_TABLES_V7,
        8 => &REQUIRED_TABLES_V8,
        9 => &REQUIRED_TABLES_V9,
        10 => &REQUIRED_TABLES_V10,
        11 => &REQUIRED_TABLES_V11,
        12 => &REQUIRED_TABLES_V12,
        13 => &REQUIRED_TABLES_V13,
        14 => &REQUIRED_TABLES_V14,
        15 => &REQUIRED_TABLES_V15,
        16 => &REQUIRED_TABLES_V16,
        17 => &REQUIRED_TABLES_V17,
        _ => return Err(SqliteStoreError::MigrationDrift),
    };
    if tables
        != required_tables
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<_>>()
    {
        return Err(SqliteStoreError::MigrationDrift);
    }
    if version == 17 {
        let mut required_triggers = REQUIRED_TRIGGERS_V16.to_vec();
        required_triggers.push(EXECUTION_AUTHORIZATION_BINDING_TRIGGER_V17);
        required_triggers.sort_unstable();
        verify_trigger_definitions(connection, &required_triggers)?;
        return Ok(());
    }
    let required_triggers: &[&str] = match version {
        1 => &REQUIRED_TRIGGERS_V1,
        2 => &REQUIRED_TRIGGERS_V2,
        3 => &REQUIRED_TRIGGERS_V3,
        4 => &REQUIRED_TRIGGERS_V4,
        5 => &REQUIRED_TRIGGERS_V5,
        6 => &REQUIRED_TRIGGERS_V6,
        7 => &REQUIRED_TRIGGERS_V7,
        8 => &REQUIRED_TRIGGERS_V8,
        9 => &REQUIRED_TRIGGERS_V9,
        10 => &REQUIRED_TRIGGERS_V10,
        11 => &REQUIRED_TRIGGERS_V11,
        12 => &REQUIRED_TRIGGERS_V12,
        13 => &REQUIRED_TRIGGERS_V13,
        14 => &REQUIRED_TRIGGERS_V14,
        15 => &REQUIRED_TRIGGERS_V15,
        16 => &REQUIRED_TRIGGERS_V16,
        _ => return Err(SqliteStoreError::MigrationDrift),
    };
    verify_trigger_definitions(connection, required_triggers)?;
    Ok(())
}

fn verify_schema_at_version(connection: &Connection, version: i64) -> Result<(), SqliteStoreError> {
    verify_required_schema_objects(connection, version)?;

    let metadata = connection
        .query_row(
            "SELECT contract_version, schema_version, storage_kind
             FROM lnsat_store_metadata
             WHERE singleton = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    if metadata
        != (
            CONTRACT_VERSION.to_owned(),
            version,
            STORAGE_KIND.to_owned(),
        )
    {
        return Err(SqliteStoreError::MigrationDrift);
    }

    let mut statement = connection
        .prepare(
            "SELECT schema_version, migration_id, migration_sha256, applied_order
             FROM lnsat_schema_migrations
             ORDER BY applied_order",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let applied = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let expected = MIGRATIONS
        .iter()
        .take(usize::try_from(version).map_err(|_| SqliteStoreError::MigrationDrift)?)
        .map(|migration| {
            (
                migration.version,
                migration.id.to_owned(),
                migration_digest(migration.sql),
                migration.version,
            )
        })
        .collect::<Vec<_>>();
    if applied != expected {
        return Err(SqliteStoreError::MigrationDrift);
    }
    if version >= 7 {
        let policies =
            read_retention_policies_v1(connection).map_err(|_| SqliteStoreError::MigrationDrift)?;
        let expected_families: &[&str] = match version {
            7 => &RETENTION_RECORD_FAMILIES_V7,
            8 => &RETENTION_RECORD_FAMILIES_V8,
            9 => &RETENTION_RECORD_FAMILIES_V9,
            10 => &RETENTION_RECORD_FAMILIES_V10,
            11 => &RETENTION_RECORD_FAMILIES_V11,
            12 => &RETENTION_RECORD_FAMILIES_V12,
            13 => &RETENTION_RECORD_FAMILIES_V13,
            14 => &RETENTION_RECORD_FAMILIES_V14,
            15 => &RETENTION_RECORD_FAMILIES_V15,
            16 => &RETENTION_RECORD_FAMILIES_V16,
            17 => &RETENTION_RECORD_FAMILIES_V17,
            _ => return Err(SqliteStoreError::MigrationDrift),
        };
        verify_retention_policies_v1(&policies, expected_families)
            .map_err(|_| SqliteStoreError::MigrationDrift)?;
    }
    if version >= 16 {
        phase7_persistence::verify_phase7_persistence_schema_v1(connection)?;
    }
    Ok(())
}

fn read_retention_policies_v1(
    connection: &Connection,
) -> Result<Vec<SqliteRetentionPolicyV1>, SqliteRetentionErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT record_family, retention_class, disposition,
                    cleanup_eligible, minimum_retention_seconds
             FROM lnsat_retention_policies
             ORDER BY record_family",
        )
        .map_err(|_| SqliteRetentionErrorV1::PersistenceFailed)?;
    statement
        .query_map([], |row| {
            let disposition = row.get::<_, String>(2)?;
            let cleanup_eligible = row.get::<_, i64>(3)?;
            Ok(SqliteRetentionPolicyV1 {
                record_family: row.get(0)?,
                retention_class: row.get(1)?,
                preserve: disposition == "preserve",
                cleanup_eligible: cleanup_eligible != 0,
                minimum_retention_seconds: row.get(4)?,
            })
        })
        .map_err(|_| SqliteRetentionErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteRetentionErrorV1::PersistenceFailed)
}

fn verify_retention_policies_v1(
    policies: &[SqliteRetentionPolicyV1],
    expected_families: &[&str],
) -> Result<(), SqliteRetentionErrorV1> {
    if policies.len() != expected_families.len() {
        return Err(SqliteRetentionErrorV1::EvidenceDrift);
    }
    for (policy, expected_family) in policies.iter().zip(expected_families) {
        if policy.record_family != *expected_family
            || policy.retention_class != RETENTION_CLASS_CONTROL_PLANE
            || !policy.preserve
            || policy.cleanup_eligible
            || policy.minimum_retention_seconds.is_some()
        {
            return Err(SqliteRetentionErrorV1::EvidenceDrift);
        }
    }
    Ok(())
}

#[derive(Debug)]
struct StoredLocalIdentityRow {
    identity_ref: String,
    display_name: String,
    role: String,
    status: String,
    created_at: String,
}

#[derive(Debug)]
struct StoredLocalIdentityStatusRow {
    identity_ref: String,
    status_sequence: i64,
    status: String,
    actor_session_id: String,
    changed_at: String,
    status_evidence_digest: String,
}

#[derive(Debug)]
struct StoredLocalIdentityEventRow {
    event_id: String,
    identity_ref: String,
    event_sequence: i64,
    event_kind: String,
    actor_session_id: Option<String>,
    credential_version: Option<i64>,
    source_evidence_digest: String,
    occurred_at: String,
    event_evidence_digest: String,
}

#[derive(Debug)]
struct StoredLocalPasswordCredentialRow {
    credential_id: String,
    identity_ref: String,
    credential_version: i64,
    verifier_profile: String,
    password_verifier: String,
    created_at: String,
}

#[derive(Debug)]
struct StoredLocalSessionRow {
    session_id: String,
    identity_ref: String,
    session_version: i64,
    session_token_profile: String,
    session_token_digest: String,
    csrf_token_profile: String,
    csrf_token_digest: String,
    session_evidence_digest: String,
    issued_at: String,
    expires_at: String,
}

#[derive(Debug)]
struct StoredLocalSessionRevocationRow {
    session_id: String,
    revoked_at: String,
    reason: String,
    revocation_evidence_digest: String,
}

#[derive(Debug)]
struct StoredLocalSessionActivityRow {
    session_id: String,
    activity_sequence: i64,
    observed_at: String,
    activity_evidence_digest: String,
}

#[derive(Debug)]
struct StoredLocalSessionRotationRow {
    prior_session_id: String,
    replacement_session_id: String,
    identity_ref: String,
    rotated_at: String,
    rotation_evidence_digest: String,
}

#[derive(Debug)]
struct StoredLocalSessionEventRow {
    event_id: String,
    session_id: String,
    event_sequence: i64,
    event_kind: String,
    actor_session_id: Option<String>,
    related_session_id: Option<String>,
    revocation_reason: Option<String>,
    source_evidence_digest: String,
    occurred_at: String,
    event_evidence_digest: String,
}

fn validate_local_owner_bootstrap_input_v1(
    input: &LocalOwnerBootstrapInputV1<'_>,
) -> Result<(), LocalIdentityStoreErrorV1> {
    let display_character_count = input.display_name.chars().count();
    if !is_local_human_identity_ref_v1(input.identity_ref)
        || display_character_count == 0
        || display_character_count > 128
        || input.display_name.len() > 512
        || input.display_name.trim() != input.display_name
        || input.display_name.chars().any(char::is_control)
        || !is_canonical_utc_timestamp_v1(input.created_at)
    {
        return Err(LocalIdentityStoreErrorV1::InvalidInput);
    }
    Ok(())
}

fn validate_local_identity_create_input_v1(
    input: &LocalIdentityCreateInputV1<'_>,
) -> Result<(), LocalIdentityStoreErrorV1> {
    let bootstrap_shape = LocalOwnerBootstrapInputV1 {
        identity_ref: input.identity_ref,
        display_name: input.display_name,
        password: input.password,
        created_at: input.created_at,
    };
    validate_local_owner_bootstrap_input_v1(&bootstrap_shape)?;
    if input.role == LocalIdentityRoleV1::Owner {
        return Err(LocalIdentityStoreErrorV1::InvalidInput);
    }
    Ok(())
}

fn is_local_human_identity_ref_v1(identity_ref: &str) -> bool {
    is_valid_reference_v1(identity_ref)
        && identity_ref
            .strip_prefix("identity:human:")
            .is_some_and(|suffix| !suffix.is_empty())
}

fn local_password_credential_id_v1(
    identity_ref: &str,
    credential_version: i64,
    password_verifier: &str,
    created_at: &str,
) -> String {
    let mut digest = Sha256::new();
    for component in [
        "lnsat.local_password_credential.content.v1",
        identity_ref,
        &credential_version.to_string(),
        LOCAL_PASSWORD_PROFILE_V1,
        password_verifier,
        created_at,
    ] {
        digest.update(component.len().to_string().as_bytes());
        digest.update(b":");
        digest.update(component.as_bytes());
        digest.update(b"|");
    }
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest.finalize() {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn select_local_identity_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Option<LocalIdentityRecordV1>, LocalIdentityStoreErrorV1> {
    let stored = connection
        .query_row(
            "SELECT identity_ref, display_name, role, status, created_at
             FROM lnsat_local_identities
             WHERE identity_ref = ?1",
            [identity_ref],
            |row| {
                Ok(StoredLocalIdentityRow {
                    identity_ref: row.get(0)?,
                    display_name: row.get(1)?,
                    role: row.get(2)?,
                    status: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    let Some(stored) = stored else {
        return Ok(None);
    };
    let mut identity = decode_local_identity_v1(stored)?;
    if let Some(status) = select_local_identity_status_v1(connection, identity_ref)? {
        validate_local_identity_status_v1(connection, &identity, &status)?;
        identity.status = LocalIdentityStatusV1::Disabled;
    }
    Ok(Some(identity))
}

fn decode_local_identity_v1(
    row: StoredLocalIdentityRow,
) -> Result<LocalIdentityRecordV1, LocalIdentityStoreErrorV1> {
    let role = match row.role.as_str() {
        "owner" => LocalIdentityRoleV1::Owner,
        "operator" => LocalIdentityRoleV1::Operator,
        "auditor" => LocalIdentityRoleV1::Auditor,
        _ => return Err(LocalIdentityStoreErrorV1::EvidenceDrift),
    };
    if row.status != "active" {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    let display_character_count = row.display_name.chars().count();
    if !is_local_human_identity_ref_v1(&row.identity_ref)
        || display_character_count == 0
        || display_character_count > 128
        || row.display_name.len() > 512
        || row.display_name.trim() != row.display_name
        || row.display_name.chars().any(char::is_control)
        || !is_canonical_utc_timestamp_v1(&row.created_at)
    {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    Ok(LocalIdentityRecordV1 {
        identity_ref: row.identity_ref,
        display_name: row.display_name,
        role,
        status: LocalIdentityStatusV1::Active,
        created_at: row.created_at,
    })
}

fn select_local_identity_status_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Option<StoredLocalIdentityStatusRow>, LocalIdentityStoreErrorV1> {
    connection
        .query_row(
            "SELECT identity_ref, status_sequence, status, actor_session_id,
                    changed_at, status_evidence_digest
             FROM lnsat_local_identity_status_events
             WHERE identity_ref = ?1",
            [identity_ref],
            |row| {
                Ok(StoredLocalIdentityStatusRow {
                    identity_ref: row.get(0)?,
                    status_sequence: row.get(1)?,
                    status: row.get(2)?,
                    actor_session_id: row.get(3)?,
                    changed_at: row.get(4)?,
                    status_evidence_digest: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)
}

fn select_local_password_credentials_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Vec<StoredLocalPasswordCredentialRow>, LocalIdentityStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT credential_id, identity_ref, credential_version,
                    verifier_profile, password_verifier, created_at
             FROM lnsat_local_password_credentials
             WHERE identity_ref = ?1
             ORDER BY credential_version",
        )
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map([identity_ref], |row| {
            Ok(StoredLocalPasswordCredentialRow {
                credential_id: row.get(0)?,
                identity_ref: row.get(1)?,
                credential_version: row.get(2)?,
                verifier_profile: row.get(3)?,
                password_verifier: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)
}

fn validate_stored_local_password_credentials_v1(
    identity: &LocalIdentityRecordV1,
    stored: &[StoredLocalPasswordCredentialRow],
) -> Result<(), LocalIdentityStoreErrorV1> {
    if stored.is_empty()
        || stored.len()
            > usize::try_from(LOCAL_PASSWORD_CREDENTIAL_MAX_VERSION_V1)
                .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?
    {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    let identity_created = canonical_utc_timestamp_millis_v1(&identity.created_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let mut prior_created = None;
    for (index, credential) in stored.iter().enumerate() {
        let expected_version =
            i64::try_from(index + 1).map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let created = canonical_utc_timestamp_millis_v1(&credential.created_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if credential.identity_ref != identity.identity_ref
            || credential.credential_version != expected_version
            || credential.verifier_profile != LOCAL_PASSWORD_PROFILE_V1
            || created < identity_created
            || (expected_version == 1 && credential.created_at != identity.created_at)
            || prior_created.is_some_and(|prior| created <= prior)
            || validate_local_password_verifier_v1(&credential.password_verifier).is_err()
            || local_password_credential_id_v1(
                &credential.identity_ref,
                credential.credential_version,
                &credential.password_verifier,
                &credential.created_at,
            ) != credential.credential_id
        {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        prior_created = Some(created);
    }
    Ok(())
}

fn validate_local_identity_status_v1(
    connection: &Connection,
    identity: &LocalIdentityRecordV1,
    status: &StoredLocalIdentityStatusRow,
) -> Result<(), LocalIdentityStoreErrorV1> {
    let changed = canonical_utc_timestamp_millis_v1(&status.changed_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let identity_created = canonical_utc_timestamp_millis_v1(&identity.created_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if identity.role == LocalIdentityRoleV1::Owner
        || status.identity_ref != identity.identity_ref
        || status.status_sequence != 1
        || status.status != LocalIdentityStatusV1::Disabled.as_str()
        || changed < identity_created
        || local_identity_status_evidence_digest_v1(
            &status.identity_ref,
            status.status_sequence,
            &status.status,
            &status.actor_session_id,
            &status.changed_at,
        ) != status.status_evidence_digest
    {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    let actor_row = select_local_session_v1(connection, &status.actor_session_id)
        .map_err(map_local_session_identity_error_v1)?
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let actor = decode_local_session_v1(connection, &actor_row)
        .map_err(map_local_session_identity_error_v1)?;
    let actor_issued = canonical_utc_timestamp_millis_v1(&actor.issued_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let actor_expires = canonical_utc_timestamp_millis_v1(&actor.expires_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if actor.role != LocalIdentityRoleV1::Owner
        || actor.identity_ref == identity.identity_ref
        || changed < actor_issued
        || changed >= actor_expires
    {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    if let Some(revocation) = select_local_session_revocation_v1(connection, &actor.session_id)
        .map_err(map_local_session_identity_error_v1)?
    {
        validate_local_session_revocation_v1(&revocation, &actor)
            .map_err(map_local_session_identity_error_v1)?;
        let revoked = canonical_utc_timestamp_millis_v1(&revocation.revoked_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if revoked < changed {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
    }
    Ok(())
}

fn local_identity_status_evidence_digest_v1(
    identity_ref: &str,
    status_sequence: i64,
    status: &str,
    actor_session_id: &str,
    changed_at: &str,
) -> String {
    let sequence = status_sequence.to_string();
    evidence_digest_v1(&[
        "lnsat.local_identity.status.evidence.v1",
        identity_ref,
        &sequence,
        status,
        actor_session_id,
        changed_at,
    ])
}

fn select_local_identity_events_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Vec<StoredLocalIdentityEventRow>, LocalIdentityStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT event_id, identity_ref, event_sequence, event_kind,
                    actor_session_id, credential_version,
                    source_evidence_digest, occurred_at, event_evidence_digest
             FROM lnsat_local_identity_events
             WHERE identity_ref = ?1
             ORDER BY event_sequence",
        )
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map([identity_ref], |row| {
            Ok(StoredLocalIdentityEventRow {
                event_id: row.get(0)?,
                identity_ref: row.get(1)?,
                event_sequence: row.get(2)?,
                event_kind: row.get(3)?,
                actor_session_id: row.get(4)?,
                credential_version: row.get(5)?,
                source_evidence_digest: row.get(6)?,
                occurred_at: row.get(7)?,
                event_evidence_digest: row.get(8)?,
            })
        })
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)
}

fn validate_local_identity_event_actor_v1(
    connection: &Connection,
    actor_session_id: &str,
    occurred_at: &str,
) -> Result<LocalSessionRecordV1, LocalIdentityStoreErrorV1> {
    let actor_row = select_local_session_v1(connection, actor_session_id)
        .map_err(map_local_session_identity_error_v1)?
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let actor = decode_local_session_v1(connection, &actor_row)
        .map_err(map_local_session_identity_error_v1)?;
    let occurred = canonical_utc_timestamp_millis_v1(occurred_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let issued = canonical_utc_timestamp_millis_v1(&actor.issued_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let expires = canonical_utc_timestamp_millis_v1(&actor.expires_at)
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if occurred < issued || occurred >= expires {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    if let Some(revocation) = select_local_session_revocation_v1(connection, actor_session_id)
        .map_err(map_local_session_identity_error_v1)?
    {
        validate_local_session_revocation_v1(&revocation, &actor)
            .map_err(map_local_session_identity_error_v1)?;
        let revoked = canonical_utc_timestamp_millis_v1(&revocation.revoked_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        if revoked < occurred {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
    }
    Ok(actor)
}

#[allow(clippy::too_many_lines)]
fn validate_local_identity_events_v1(
    connection: &Connection,
    identity: &LocalIdentityRecordV1,
    stored: &[StoredLocalIdentityEventRow],
) -> Result<Vec<LocalIdentityEventV1>, LocalIdentityStoreErrorV1> {
    let credentials = select_local_password_credentials_v1(connection, &identity.identity_ref)?;
    validate_stored_local_password_credentials_v1(identity, &credentials)?;
    let status = select_local_identity_status_v1(connection, &identity.identity_ref)?;
    let mut prior_occurred = None;
    let mut events = Vec::with_capacity(stored.len());
    for (index, row) in stored.iter().enumerate() {
        let expected_sequence =
            i64::try_from(index + 1).map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let occurred = canonical_utc_timestamp_millis_v1(&row.occurred_at)
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        let event_kind = match row.event_kind.as_str() {
            "owner_bootstrapped" => LocalIdentityEventKindV1::OwnerBootstrapped,
            "identity_created" => LocalIdentityEventKindV1::IdentityCreated,
            "password_rotated" => LocalIdentityEventKindV1::PasswordRotated,
            "identity_disabled" => LocalIdentityEventKindV1::IdentityDisabled,
            "owner_recovered" => LocalIdentityEventKindV1::OwnerRecovered,
            _ => return Err(LocalIdentityStoreErrorV1::EvidenceDrift),
        };
        if row.identity_ref != identity.identity_ref
            || row.event_sequence != expected_sequence
            || prior_occurred.is_some_and(|prior| occurred < prior)
            || local_identity_event_id_v1(
                &row.identity_ref,
                row.event_sequence,
                event_kind,
                &row.occurred_at,
            ) != row.event_id
            || local_identity_event_evidence_digest_v1(
                &row.event_id,
                &row.identity_ref,
                row.event_sequence,
                event_kind,
                row.actor_session_id.as_deref(),
                row.credential_version,
                &row.source_evidence_digest,
                &row.occurred_at,
            ) != row.event_evidence_digest
        {
            return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
        }
        match event_kind {
            LocalIdentityEventKindV1::OwnerBootstrapped => {
                let credential = credentials
                    .first()
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                if row.event_sequence != 1
                    || identity.role != LocalIdentityRoleV1::Owner
                    || row.actor_session_id.is_some()
                    || row.credential_version != Some(1)
                    || row.occurred_at != identity.created_at
                    || row.source_evidence_digest != credential.credential_id
                {
                    return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
                }
            }
            LocalIdentityEventKindV1::IdentityCreated => {
                let credential = credentials
                    .first()
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let actor = validate_local_identity_event_actor_v1(
                    connection,
                    row.actor_session_id
                        .as_deref()
                        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?,
                    &row.occurred_at,
                )?;
                if row.event_sequence != 1
                    || identity.role == LocalIdentityRoleV1::Owner
                    || actor.role != LocalIdentityRoleV1::Owner
                    || actor.identity_ref == identity.identity_ref
                    || row.credential_version != Some(1)
                    || row.occurred_at != identity.created_at
                    || row.source_evidence_digest != credential.credential_id
                {
                    return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
                }
            }
            LocalIdentityEventKindV1::PasswordRotated => {
                let version = row
                    .credential_version
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let credential = credentials
                    .iter()
                    .find(|credential| credential.credential_version == version)
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let actor_session_id = row
                    .actor_session_id
                    .as_deref()
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let actor = validate_local_identity_event_actor_v1(
                    connection,
                    actor_session_id,
                    &row.occurred_at,
                )?;
                let revocation = select_local_session_revocation_v1(connection, actor_session_id)
                    .map_err(map_local_session_identity_error_v1)?
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                if version < 2
                    || actor.identity_ref != identity.identity_ref
                    || row.occurred_at != credential.created_at
                    || row.source_evidence_digest != credential.credential_id
                    || revocation.reason
                        != LocalSessionRevocationReasonV1::CredentialRevoke.as_str()
                    || revocation.revoked_at != row.occurred_at
                {
                    return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
                }
            }
            LocalIdentityEventKindV1::IdentityDisabled => {
                let status = status
                    .as_ref()
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let actor_session_id = row
                    .actor_session_id
                    .as_deref()
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let actor = validate_local_identity_event_actor_v1(
                    connection,
                    actor_session_id,
                    &row.occurred_at,
                )?;
                if index + 1 != stored.len()
                    || identity.status != LocalIdentityStatusV1::Disabled
                    || actor.role != LocalIdentityRoleV1::Owner
                    || actor_session_id != status.actor_session_id
                    || row.credential_version.is_some()
                    || row.occurred_at != status.changed_at
                    || row.source_evidence_digest != status.status_evidence_digest
                {
                    return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
                }
            }
            LocalIdentityEventKindV1::OwnerRecovered => {
                let version = row
                    .credential_version
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                let credential = credentials
                    .iter()
                    .find(|credential| credential.credential_version == version)
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                if identity.role != LocalIdentityRoleV1::Owner
                    || version < 2
                    || row.actor_session_id.is_some()
                    || row.occurred_at != credential.created_at
                    || row.source_evidence_digest != credential.credential_id
                {
                    return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
                }
                let recovered = canonical_utc_timestamp_millis_v1(&row.occurred_at)
                    .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                for session_id in
                    select_local_session_ids_for_identity_v1(connection, &identity.identity_ref)
                        .map_err(map_local_session_identity_error_v1)?
                {
                    let session_row = select_local_session_v1(connection, &session_id)
                        .map_err(map_local_session_identity_error_v1)?
                        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                    let session = decode_local_session_v1(connection, &session_row)
                        .map_err(map_local_session_identity_error_v1)?;
                    let issued = canonical_utc_timestamp_millis_v1(&session.issued_at)
                        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                    let expires = canonical_utc_timestamp_millis_v1(&session.expires_at)
                        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                    if recovered < issued || recovered >= expires {
                        continue;
                    }
                    let revocation = select_local_session_revocation_v1(connection, &session_id)
                        .map_err(map_local_session_identity_error_v1)?
                        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                    validate_local_session_revocation_v1(&revocation, &session)
                        .map_err(map_local_session_identity_error_v1)?;
                    let revoked = canonical_utc_timestamp_millis_v1(&revocation.revoked_at)
                        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
                    if revoked > recovered
                        || (revoked == recovered
                            && revocation.reason
                                != LocalSessionRevocationReasonV1::Recovery.as_str())
                    {
                        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
                    }
                }
            }
        }
        events.push(LocalIdentityEventV1 {
            event_id: row.event_id.clone(),
            identity_ref: row.identity_ref.clone(),
            event_sequence: row.event_sequence,
            event_kind,
            actor_session_id: row.actor_session_id.clone(),
            credential_version: row.credential_version,
            source_evidence_digest: row.source_evidence_digest.clone(),
            occurred_at: row.occurred_at.clone(),
            event_evidence_digest: row.event_evidence_digest.clone(),
        });
        prior_occurred = Some(occurred);
    }
    Ok(events)
}

fn insert_local_identity_event_v1(
    connection: &Connection,
    identity_ref: &str,
    event_kind: LocalIdentityEventKindV1,
    actor_session_id: Option<&str>,
    credential_version: Option<i64>,
    source_evidence_digest: &str,
    occurred_at: &str,
) -> Result<LocalIdentityEventV1, LocalIdentityStoreErrorV1> {
    let identity = select_local_identity_v1(connection, identity_ref)?
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let before = select_local_identity_events_v1(connection, identity_ref)?;
    validate_local_identity_events_v1(connection, &identity, &before)?;
    let event_sequence =
        i64::try_from(before.len() + 1).map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if event_sequence > 65 {
        return Err(LocalIdentityStoreErrorV1::InvalidInput);
    }
    let event_id =
        local_identity_event_id_v1(identity_ref, event_sequence, event_kind, occurred_at);
    let event_evidence_digest = local_identity_event_evidence_digest_v1(
        &event_id,
        identity_ref,
        event_sequence,
        event_kind,
        actor_session_id,
        credential_version,
        source_evidence_digest,
        occurred_at,
    );
    connection
        .execute(
            "INSERT INTO lnsat_local_identity_events (
                event_id, identity_ref, event_sequence, event_kind,
                actor_session_id, credential_version, source_evidence_digest,
                occurred_at, event_evidence_digest
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                event_id,
                identity_ref,
                event_sequence,
                event_kind.as_str(),
                actor_session_id,
                credential_version,
                source_evidence_digest,
                occurred_at,
                event_evidence_digest,
            ],
        )
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    let stored = select_local_identity_events_v1(connection, identity_ref)?;
    let events = validate_local_identity_events_v1(connection, &identity, &stored)?;
    events
        .last()
        .filter(|event| event.event_id == event_id)
        .cloned()
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)
}

fn local_identity_event_id_v1(
    identity_ref: &str,
    event_sequence: i64,
    event_kind: LocalIdentityEventKindV1,
    occurred_at: &str,
) -> String {
    let sequence = event_sequence.to_string();
    evidence_digest_v1(&[
        "lnsat.local_identity.event.id.v1",
        identity_ref,
        &sequence,
        event_kind.as_str(),
        occurred_at,
    ])
}

#[allow(clippy::too_many_arguments)]
fn local_identity_event_evidence_digest_v1(
    event_id: &str,
    identity_ref: &str,
    event_sequence: i64,
    event_kind: LocalIdentityEventKindV1,
    actor_session_id: Option<&str>,
    credential_version: Option<i64>,
    source_evidence_digest: &str,
    occurred_at: &str,
) -> String {
    let sequence = event_sequence.to_string();
    let credential_version = credential_version.map_or_else(String::new, |value| value.to_string());
    evidence_digest_v1(&[
        "lnsat.local_identity.event.evidence.v1",
        event_id,
        identity_ref,
        &sequence,
        event_kind.as_str(),
        actor_session_id.unwrap_or_default(),
        &credential_version,
        source_evidence_digest,
        occurred_at,
    ])
}

fn select_local_owner_bootstrap_record_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Option<LocalOwnerBootstrapRecordV1>, LocalIdentityStoreErrorV1> {
    let Some(identity) = select_local_identity_v1(connection, identity_ref)? else {
        return Ok(None);
    };
    let credentials = select_local_password_credentials_v1(connection, identity_ref)?;
    validate_stored_local_password_credentials_v1(&identity, &credentials)?;
    let credential = credentials
        .into_iter()
        .last()
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if identity.role != LocalIdentityRoleV1::Owner
        || identity.status != LocalIdentityStatusV1::Active
    {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    Ok(Some(LocalIdentityCredentialRecordV1 {
        identity,
        credential_profile: credential.verifier_profile,
        credential_version: credential.credential_version,
        credential_created_at: credential.created_at,
    }))
}

fn select_local_identity_credential_record_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Option<LocalIdentityCredentialRecordV1>, LocalIdentityStoreErrorV1> {
    let Some(identity) = select_local_identity_v1(connection, identity_ref)? else {
        return Ok(None);
    };
    let credentials = select_local_password_credentials_v1(connection, identity_ref)?;
    validate_stored_local_password_credentials_v1(&identity, &credentials)?;
    let credential = credentials
        .into_iter()
        .last()
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    Ok(Some(LocalIdentityCredentialRecordV1 {
        identity,
        credential_profile: credential.verifier_profile,
        credential_version: credential.credential_version,
        credential_created_at: credential.created_at,
    }))
}

fn map_local_identity_session_error_v1(
    error: LocalIdentityStoreErrorV1,
) -> LocalSessionStoreErrorV1 {
    match error {
        LocalIdentityStoreErrorV1::InvalidInput
        | LocalIdentityStoreErrorV1::OwnerAlreadyBootstrapped
        | LocalIdentityStoreErrorV1::IdentityAlreadyExists
        | LocalIdentityStoreErrorV1::AuthorizationRejected => {
            LocalSessionStoreErrorV1::InvalidCredential
        }
        LocalIdentityStoreErrorV1::EvidenceDrift => LocalSessionStoreErrorV1::EvidenceDrift,
        LocalIdentityStoreErrorV1::PersistenceFailed => LocalSessionStoreErrorV1::PersistenceFailed,
    }
}

fn map_local_session_identity_error_v1(
    error: LocalSessionStoreErrorV1,
) -> LocalIdentityStoreErrorV1 {
    match error {
        LocalSessionStoreErrorV1::InvalidInput | LocalSessionStoreErrorV1::InvalidCredential => {
            LocalIdentityStoreErrorV1::AuthorizationRejected
        }
        LocalSessionStoreErrorV1::EvidenceDrift => LocalIdentityStoreErrorV1::EvidenceDrift,
        LocalSessionStoreErrorV1::PersistenceFailed => LocalIdentityStoreErrorV1::PersistenceFailed,
    }
}

fn map_local_identity_recovery_error_v1(
    error: LocalIdentityStoreErrorV1,
) -> LocalOwnerRecoveryErrorV1 {
    match error {
        LocalIdentityStoreErrorV1::InvalidInput
        | LocalIdentityStoreErrorV1::OwnerAlreadyBootstrapped
        | LocalIdentityStoreErrorV1::IdentityAlreadyExists
        | LocalIdentityStoreErrorV1::AuthorizationRejected => {
            LocalOwnerRecoveryErrorV1::AuthorityRejected
        }
        LocalIdentityStoreErrorV1::EvidenceDrift => LocalOwnerRecoveryErrorV1::EvidenceDrift,
        LocalIdentityStoreErrorV1::PersistenceFailed => {
            LocalOwnerRecoveryErrorV1::PersistenceFailed
        }
    }
}

fn map_local_session_recovery_error_v1(
    error: LocalSessionStoreErrorV1,
) -> LocalOwnerRecoveryErrorV1 {
    match error {
        LocalSessionStoreErrorV1::InvalidInput | LocalSessionStoreErrorV1::InvalidCredential => {
            LocalOwnerRecoveryErrorV1::AuthorityRejected
        }
        LocalSessionStoreErrorV1::EvidenceDrift => LocalOwnerRecoveryErrorV1::EvidenceDrift,
        LocalSessionStoreErrorV1::PersistenceFailed => LocalOwnerRecoveryErrorV1::PersistenceFailed,
    }
}

fn filter_owner_session_v1(verification: LocalSessionVerificationV1) -> LocalSessionVerificationV1 {
    match verification {
        LocalSessionVerificationV1::Verified(session)
            if session.role == LocalIdentityRoleV1::Owner =>
        {
            LocalSessionVerificationV1::Verified(session)
        }
        LocalSessionVerificationV1::Verified(_) | LocalSessionVerificationV1::Rejected => {
            LocalSessionVerificationV1::Rejected
        }
    }
}

fn validate_local_session_window_v1(
    issued_at: &str,
    expires_at: &str,
) -> Result<(), LocalSessionStoreErrorV1> {
    let issued = canonical_utc_timestamp_millis_v1(issued_at)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    let expires = canonical_utc_timestamp_millis_v1(expires_at)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    let duration = expires
        .checked_sub(issued)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    if !(60_000..=3_600_000).contains(&duration) {
        return Err(LocalSessionStoreErrorV1::InvalidInput);
    }
    Ok(())
}

fn validate_local_session_idle_timeout_v1(
    idle_timeout_seconds: u32,
) -> Result<(), LocalSessionStoreErrorV1> {
    if !(LOCAL_SESSION_IDLE_TIMEOUT_MIN_SECONDS_V1..=LOCAL_SESSION_IDLE_TIMEOUT_MAX_SECONDS_V1)
        .contains(&idle_timeout_seconds)
    {
        return Err(LocalSessionStoreErrorV1::InvalidInput);
    }
    Ok(())
}

fn is_local_session_id_v1(value: &str) -> bool {
    let synthetic_token = format!("{value}.{}", "0".repeat(64));
    local_session_id_from_token_v1(&synthetic_token) == Some(value)
}

fn insert_local_session_v1(
    connection: &Connection,
    identity_ref: &str,
    secrets: &LocalSessionSecretsV1,
    issued_at: &str,
    expires_at: &str,
) -> Result<LocalSessionRecordV1, LocalSessionStoreErrorV1> {
    validate_local_session_window_v1(issued_at, expires_at)?;
    let identity_record = select_local_identity_credential_record_v1(connection, identity_ref)
        .map_err(map_local_identity_session_error_v1)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    if identity_record.identity.status != LocalIdentityStatusV1::Active {
        return Err(LocalSessionStoreErrorV1::InvalidCredential);
    }
    let identity_created = canonical_utc_timestamp_millis_v1(&identity_record.identity.created_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let credential_created =
        canonical_utc_timestamp_millis_v1(&identity_record.credential_created_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let issued = canonical_utc_timestamp_millis_v1(issued_at)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    if issued < identity_created || issued < credential_created {
        return Err(LocalSessionStoreErrorV1::InvalidInput);
    }
    let session_evidence_digest = local_session_evidence_digest_v1(
        &secrets.session_id,
        identity_ref,
        &secrets.session_token_digest,
        &secrets.csrf_token_digest,
        issued_at,
        expires_at,
    );
    connection
        .execute(
            "INSERT INTO lnsat_local_sessions (
                session_id, identity_ref, session_version,
                session_token_profile, session_token_digest,
                csrf_token_profile, csrf_token_digest, session_evidence_digest,
                issued_at, expires_at
             ) VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                secrets.session_id,
                identity_ref,
                LOCAL_SESSION_TOKEN_PROFILE_V1,
                secrets.session_token_digest,
                LOCAL_SESSION_CSRF_PROFILE_V1,
                secrets.csrf_token_digest,
                session_evidence_digest,
                issued_at,
                expires_at,
            ],
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    let stored = select_local_session_v1(connection, &secrets.session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let session = decode_local_session_v1(connection, &stored)?;
    if session.identity_ref != identity_ref
        || session.issued_at != issued_at
        || session.expires_at != expires_at
    {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    insert_local_session_activity_v1(connection, &session, 1, issued_at)?;
    insert_local_session_event_v1(
        connection,
        &session.session_id,
        LocalSessionEventKindV1::Issued,
        None,
        None,
        None,
        &stored.session_evidence_digest,
        issued_at,
    )?;
    Ok(session)
}

fn select_local_session_v1(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<StoredLocalSessionRow>, LocalSessionStoreErrorV1> {
    connection
        .query_row(
            "SELECT session_id, identity_ref, session_version,
                    session_token_profile, session_token_digest,
                    csrf_token_profile, csrf_token_digest, session_evidence_digest,
                    issued_at, expires_at
             FROM lnsat_local_sessions
             WHERE session_id = ?1",
            [session_id],
            |row| {
                Ok(StoredLocalSessionRow {
                    session_id: row.get(0)?,
                    identity_ref: row.get(1)?,
                    session_version: row.get(2)?,
                    session_token_profile: row.get(3)?,
                    session_token_digest: row.get(4)?,
                    csrf_token_profile: row.get(5)?,
                    csrf_token_digest: row.get(6)?,
                    session_evidence_digest: row.get(7)?,
                    issued_at: row.get(8)?,
                    expires_at: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)
}

fn decode_local_session_v1(
    connection: &Connection,
    row: &StoredLocalSessionRow,
) -> Result<LocalSessionRecordV1, LocalSessionStoreErrorV1> {
    let synthetic_token = format!("{}.{}", row.session_id, "0".repeat(64));
    if local_session_id_from_token_v1(&synthetic_token) != Some(row.session_id.as_str())
        || !is_local_human_identity_ref_v1(&row.identity_ref)
        || row.session_version != 1
        || row.session_token_profile != LOCAL_SESSION_TOKEN_PROFILE_V1
        || row.csrf_token_profile != LOCAL_SESSION_CSRF_PROFILE_V1
        || validate_local_session_digest_v1(&row.session_token_digest).is_err()
        || validate_local_session_digest_v1(&row.csrf_token_digest).is_err()
        || local_session_evidence_digest_v1(
            &row.session_id,
            &row.identity_ref,
            &row.session_token_digest,
            &row.csrf_token_digest,
            &row.issued_at,
            &row.expires_at,
        ) != row.session_evidence_digest
        || validate_local_session_window_v1(&row.issued_at, &row.expires_at).is_err()
    {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    let identity = select_local_identity_v1(connection, &row.identity_ref)
        .map_err(map_local_identity_session_error_v1)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    select_local_identity_credential_record_v1(connection, &row.identity_ref)
        .map_err(map_local_identity_session_error_v1)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    Ok(LocalSessionRecordV1 {
        session_id: row.session_id.clone(),
        identity_ref: row.identity_ref.clone(),
        role: identity.role,
        issued_at: row.issued_at.clone(),
        expires_at: row.expires_at.clone(),
    })
}

fn verify_local_session_on_connection_v1(
    connection: &Connection,
    raw_session_token: &str,
    raw_csrf_token: Option<&str>,
    checked_at: &str,
) -> Result<LocalSessionVerificationV1, LocalSessionStoreErrorV1> {
    let Some(checked_instant) = canonical_utc_timestamp_millis_v1(checked_at) else {
        return Err(LocalSessionStoreErrorV1::InvalidInput);
    };
    let Some(session_id) = local_session_id_from_token_v1(raw_session_token) else {
        return Ok(LocalSessionVerificationV1::Rejected);
    };
    let Some(stored) = select_local_session_v1(connection, session_id)? else {
        return Ok(LocalSessionVerificationV1::Rejected);
    };
    let session = decode_local_session_v1(connection, &stored)?;
    if !verify_local_session_token_v1(raw_session_token, &stored.session_token_digest)
        .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?
    {
        return Ok(LocalSessionVerificationV1::Rejected);
    }
    if let Some(raw_csrf_token) = raw_csrf_token
        && !verify_local_session_csrf_v1(raw_csrf_token, &stored.csrf_token_digest)
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?
    {
        return Ok(LocalSessionVerificationV1::Rejected);
    }
    let identity = select_local_identity_v1(connection, &session.identity_ref)
        .map_err(map_local_identity_session_error_v1)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    if identity.status != LocalIdentityStatusV1::Active {
        return Ok(LocalSessionVerificationV1::Rejected);
    }
    let issued_instant = canonical_utc_timestamp_millis_v1(&session.issued_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let expires_instant = canonical_utc_timestamp_millis_v1(&session.expires_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    if checked_instant < issued_instant || checked_instant >= expires_instant {
        return Ok(LocalSessionVerificationV1::Rejected);
    }
    if let Some(revocation) = select_local_session_revocation_v1(connection, &session.session_id)? {
        validate_local_session_revocation_v1(&revocation, &session)?;
        return Ok(LocalSessionVerificationV1::Rejected);
    }
    Ok(LocalSessionVerificationV1::Verified(session))
}

fn verify_and_touch_local_session_on_connection_v1(
    connection: &Connection,
    raw_session_token: &str,
    raw_csrf_token: Option<&str>,
    checked_at: &str,
    idle_timeout_seconds: u32,
) -> Result<LocalSessionActivityVerificationV1, LocalSessionStoreErrorV1> {
    validate_local_session_idle_timeout_v1(idle_timeout_seconds)?;
    let verification = verify_local_session_on_connection_v1(
        connection,
        raw_session_token,
        raw_csrf_token,
        checked_at,
    )?;
    let LocalSessionVerificationV1::Verified(session) = verification else {
        return Ok(LocalSessionActivityVerificationV1::Rejected);
    };
    let checked = canonical_utc_timestamp_millis_v1(checked_at)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    let activity = select_local_session_activity_v1(connection, &session.session_id)?;
    validate_local_session_activity_v1(&session, &activity)?;
    let (mut sequence, mut last_activity_at) = match activity.last() {
        Some(row) => (row.activity_sequence, row.observed_at.clone()),
        None => (0, session.issued_at.clone()),
    };
    let last_activity = canonical_utc_timestamp_millis_v1(&last_activity_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let elapsed = checked
        .checked_sub(last_activity)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let idle_timeout_millis = u64::from(idle_timeout_seconds)
        .checked_mul(1_000)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    if elapsed >= idle_timeout_millis {
        return Ok(LocalSessionActivityVerificationV1::Rejected);
    }
    let mut touched = false;
    if elapsed >= LOCAL_SESSION_ACTIVITY_TOUCH_SECONDS_V1 * 1_000 {
        sequence = sequence
            .checked_add(1)
            .filter(|value| *value <= LOCAL_SESSION_ACTIVITY_MAX_EVENTS_V1)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        insert_local_session_activity_v1(connection, &session, sequence, checked_at)?;
        checked_at.clone_into(&mut last_activity_at);
        touched = true;
    }
    let activity_sequence =
        u32::try_from(sequence).map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
    Ok(LocalSessionActivityVerificationV1::Verified(
        LocalSessionActivityV1 {
            session,
            activity_sequence,
            last_activity_at,
            touched,
        },
    ))
}

fn select_local_session_activity_v1(
    connection: &Connection,
    session_id: &str,
) -> Result<Vec<StoredLocalSessionActivityRow>, LocalSessionStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT session_id, activity_sequence, observed_at,
                    activity_evidence_digest
             FROM lnsat_local_session_activity_events
             WHERE session_id = ?1
             ORDER BY activity_sequence",
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map([session_id], |row| {
            Ok(StoredLocalSessionActivityRow {
                session_id: row.get(0)?,
                activity_sequence: row.get(1)?,
                observed_at: row.get(2)?,
                activity_evidence_digest: row.get(3)?,
            })
        })
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)
}

fn validate_local_session_activity_v1(
    session: &LocalSessionRecordV1,
    activity: &[StoredLocalSessionActivityRow],
) -> Result<(), LocalSessionStoreErrorV1> {
    let issued = canonical_utc_timestamp_millis_v1(&session.issued_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let expires = canonical_utc_timestamp_millis_v1(&session.expires_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    if activity.len()
        > usize::try_from(LOCAL_SESSION_ACTIVITY_MAX_EVENTS_V1)
            .map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?
    {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    let mut prior_observed = None;
    for (index, row) in activity.iter().enumerate() {
        let expected_sequence =
            i64::try_from(index + 1).map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let observed = canonical_utc_timestamp_millis_v1(&row.observed_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        if row.session_id != session.session_id
            || row.activity_sequence != expected_sequence
            || observed < issued
            || observed >= expires
            || prior_observed.is_some_and(|prior| {
                observed
                    .checked_sub(prior)
                    .is_none_or(|elapsed| elapsed < LOCAL_SESSION_ACTIVITY_TOUCH_SECONDS_V1 * 1_000)
            })
            || local_session_activity_evidence_digest_v1(
                &row.session_id,
                row.activity_sequence,
                &row.observed_at,
            ) != row.activity_evidence_digest
        {
            return Err(LocalSessionStoreErrorV1::EvidenceDrift);
        }
        prior_observed = Some(observed);
    }
    Ok(())
}

fn insert_local_session_activity_v1(
    connection: &Connection,
    session: &LocalSessionRecordV1,
    activity_sequence: i64,
    observed_at: &str,
) -> Result<(), LocalSessionStoreErrorV1> {
    connection
        .execute(
            "INSERT INTO lnsat_local_session_activity_events (
                session_id, activity_sequence, observed_at,
                activity_evidence_digest
             ) VALUES (?1, ?2, ?3, ?4)",
            params![
                session.session_id,
                activity_sequence,
                observed_at,
                local_session_activity_evidence_digest_v1(
                    &session.session_id,
                    activity_sequence,
                    observed_at,
                ),
            ],
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    let activity = select_local_session_activity_v1(connection, &session.session_id)?;
    validate_local_session_activity_v1(session, &activity)?;
    if activity.last().is_none_or(|row| {
        row.activity_sequence != activity_sequence || row.observed_at != observed_at
    }) {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn local_session_activity_evidence_digest_v1(
    session_id: &str,
    activity_sequence: i64,
    observed_at: &str,
) -> String {
    let sequence = activity_sequence.to_string();
    evidence_digest_v1(&[
        "lnsat.local_session.activity.evidence.v1",
        session_id,
        &sequence,
        observed_at,
    ])
}

fn evidence_digest_v1(components: &[&str]) -> String {
    let mut digest = Sha256::new();
    for component in components {
        digest.update(component.len().to_string().as_bytes());
        digest.update(b":");
        digest.update(component.as_bytes());
        digest.update(b"|");
    }
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest.finalize() {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn local_session_evidence_digest_v1(
    session_id: &str,
    identity_ref: &str,
    session_token_digest: &str,
    csrf_token_digest: &str,
    issued_at: &str,
    expires_at: &str,
) -> String {
    let mut digest = Sha256::new();
    for component in [
        "lnsat.local_session.evidence.v1",
        session_id,
        identity_ref,
        LOCAL_SESSION_TOKEN_PROFILE_V1,
        session_token_digest,
        LOCAL_SESSION_CSRF_PROFILE_V1,
        csrf_token_digest,
        issued_at,
        expires_at,
    ] {
        digest.update(component.len().to_string().as_bytes());
        digest.update(b":");
        digest.update(component.as_bytes());
        digest.update(b"|");
    }
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest.finalize() {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn select_local_session_revocation_v1(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<StoredLocalSessionRevocationRow>, LocalSessionStoreErrorV1> {
    connection
        .query_row(
            "SELECT session_id, revoked_at, reason, revocation_evidence_digest
             FROM lnsat_local_session_revocations
             WHERE session_id = ?1",
            [session_id],
            |row| {
                Ok(StoredLocalSessionRevocationRow {
                    session_id: row.get(0)?,
                    revoked_at: row.get(1)?,
                    reason: row.get(2)?,
                    revocation_evidence_digest: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)
}

fn select_local_session_ids_for_identity_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<Vec<String>, LocalSessionStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT session_id
             FROM lnsat_local_sessions
             WHERE identity_ref = ?1
             ORDER BY session_id",
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map([identity_ref], |row| row.get::<_, String>(0))
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)
}

fn revoke_active_local_sessions_for_identity_v1(
    connection: &Connection,
    identity_ref: &str,
    actor_session_id: Option<&str>,
    revoked_at: &str,
    reason: LocalSessionRevocationReasonV1,
) -> Result<(u32, u32), LocalSessionStoreErrorV1> {
    let revoked_instant = canonical_utc_timestamp_millis_v1(revoked_at)
        .ok_or(LocalSessionStoreErrorV1::InvalidInput)?;
    let session_ids = select_local_session_ids_for_identity_v1(connection, identity_ref)?;
    let family_session_count =
        u32::try_from(session_ids.len()).map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
    let mut newly_revoked_session_count = 0_u32;
    for session_id in session_ids {
        let stored = select_local_session_v1(connection, &session_id)?
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        let session = decode_local_session_v1(connection, &stored)?;
        if session.identity_ref != identity_ref {
            return Err(LocalSessionStoreErrorV1::EvidenceDrift);
        }
        if let Some(existing) = select_local_session_revocation_v1(connection, &session.session_id)?
        {
            validate_local_session_revocation_v1(&existing, &session)?;
            continue;
        }
        let issued = canonical_utc_timestamp_millis_v1(&session.issued_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        let expires = canonical_utc_timestamp_millis_v1(&session.expires_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        if revoked_instant < issued || revoked_instant >= expires {
            continue;
        }
        insert_local_session_revocation_v1(
            connection,
            &session,
            actor_session_id,
            revoked_at,
            reason,
        )?;
        newly_revoked_session_count = newly_revoked_session_count
            .checked_add(1)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    }
    Ok((family_session_count, newly_revoked_session_count))
}

fn insert_local_session_revocation_v1(
    connection: &Connection,
    session: &LocalSessionRecordV1,
    actor_session_id: Option<&str>,
    revoked_at: &str,
    reason: LocalSessionRevocationReasonV1,
) -> Result<(), LocalSessionStoreErrorV1> {
    if select_local_session_revocation_v1(connection, &session.session_id)?.is_some() {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    let revocation_evidence_digest = local_session_revocation_evidence_digest_v1(
        &session.session_id,
        revoked_at,
        reason.as_str(),
    );
    connection
        .execute(
            "INSERT INTO lnsat_local_session_revocations (
                session_id, revoked_at, reason, revocation_evidence_digest
             ) VALUES (?1, ?2, ?3, ?4)",
            params![
                session.session_id,
                revoked_at,
                reason.as_str(),
                revocation_evidence_digest,
            ],
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    let stored = select_local_session_revocation_v1(connection, &session.session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    validate_local_session_revocation_v1(&stored, session)?;
    if stored.revoked_at != revoked_at || stored.reason != reason.as_str() {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    insert_local_session_event_v1(
        connection,
        &session.session_id,
        LocalSessionEventKindV1::Revoked,
        actor_session_id,
        None,
        Some(reason),
        &stored.revocation_evidence_digest,
        revoked_at,
    )?;
    Ok(())
}

fn validate_local_session_revocation_v1(
    revocation: &StoredLocalSessionRevocationRow,
    session: &LocalSessionRecordV1,
) -> Result<(), LocalSessionStoreErrorV1> {
    let revoked = canonical_utc_timestamp_millis_v1(&revocation.revoked_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let issued = canonical_utc_timestamp_millis_v1(&session.issued_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let expires = canonical_utc_timestamp_millis_v1(&session.expires_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    if revocation.session_id != session.session_id
        || revoked < issued
        || revoked >= expires
        || local_session_revocation_evidence_digest_v1(
            &revocation.session_id,
            &revocation.revoked_at,
            &revocation.reason,
        ) != revocation.revocation_evidence_digest
        || !matches!(
            revocation.reason.as_str(),
            "sign_out" | "owner_revoke" | "credential_revoke" | "recovery" | "rotation"
        )
    {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn local_session_revocation_evidence_digest_v1(
    session_id: &str,
    revoked_at: &str,
    reason: &str,
) -> String {
    let mut digest = Sha256::new();
    for component in [
        "lnsat.local_session.revocation.evidence.v1",
        session_id,
        revoked_at,
        reason,
    ] {
        digest.update(component.len().to_string().as_bytes());
        digest.update(b":");
        digest.update(component.as_bytes());
        digest.update(b"|");
    }
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest.finalize() {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn insert_local_session_rotation_v1(
    connection: &Connection,
    prior: &LocalSessionRecordV1,
    replacement: &LocalSessionRecordV1,
    rotated_at: &str,
) -> Result<(), LocalSessionStoreErrorV1> {
    if prior.identity_ref != replacement.identity_ref
        || prior.session_id == replacement.session_id
        || replacement.issued_at != rotated_at
        || replacement.expires_at != prior.expires_at
    {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    let rotation_evidence_digest = local_session_rotation_evidence_digest_v1(
        &prior.session_id,
        &replacement.session_id,
        &prior.identity_ref,
        rotated_at,
    );
    connection
        .execute(
            "INSERT INTO lnsat_local_session_rotations (
                prior_session_id, replacement_session_id, identity_ref,
                rotated_at, rotation_evidence_digest
             ) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                prior.session_id,
                replacement.session_id,
                prior.identity_ref,
                rotated_at,
                rotation_evidence_digest,
            ],
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    let stored = select_local_session_rotation_v1(connection, &prior.session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    validate_local_session_rotation_v1(connection, &stored)?;
    if stored.replacement_session_id != replacement.session_id {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    insert_local_session_event_v1(
        connection,
        &prior.session_id,
        LocalSessionEventKindV1::Rotated,
        Some(&prior.session_id),
        Some(&replacement.session_id),
        None,
        &stored.rotation_evidence_digest,
        rotated_at,
    )?;
    Ok(())
}

fn select_local_session_rotation_v1(
    connection: &Connection,
    prior_session_id: &str,
) -> Result<Option<StoredLocalSessionRotationRow>, LocalSessionStoreErrorV1> {
    connection
        .query_row(
            "SELECT prior_session_id, replacement_session_id, identity_ref,
                    rotated_at, rotation_evidence_digest
             FROM lnsat_local_session_rotations
             WHERE prior_session_id = ?1",
            [prior_session_id],
            |row| {
                Ok(StoredLocalSessionRotationRow {
                    prior_session_id: row.get(0)?,
                    replacement_session_id: row.get(1)?,
                    identity_ref: row.get(2)?,
                    rotated_at: row.get(3)?,
                    rotation_evidence_digest: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)
}

fn validate_local_session_rotation_v1(
    connection: &Connection,
    rotation: &StoredLocalSessionRotationRow,
) -> Result<(), LocalSessionStoreErrorV1> {
    let prior_row = select_local_session_v1(connection, &rotation.prior_session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let replacement_row = select_local_session_v1(connection, &rotation.replacement_session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let prior = decode_local_session_v1(connection, &prior_row)?;
    let replacement = decode_local_session_v1(connection, &replacement_row)?;
    let revocation = select_local_session_revocation_v1(connection, &prior.session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    validate_local_session_revocation_v1(&revocation, &prior)?;
    if rotation.prior_session_id == rotation.replacement_session_id
        || rotation.identity_ref != prior.identity_ref
        || rotation.identity_ref != replacement.identity_ref
        || rotation.rotated_at != replacement.issued_at
        || replacement.expires_at != prior.expires_at
        || revocation.revoked_at != rotation.rotated_at
        || revocation.reason != LocalSessionRevocationReasonV1::Rotation.as_str()
        || local_session_rotation_evidence_digest_v1(
            &rotation.prior_session_id,
            &rotation.replacement_session_id,
            &rotation.identity_ref,
            &rotation.rotated_at,
        ) != rotation.rotation_evidence_digest
    {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    Ok(())
}

fn local_session_rotation_evidence_digest_v1(
    prior_session_id: &str,
    replacement_session_id: &str,
    identity_ref: &str,
    rotated_at: &str,
) -> String {
    evidence_digest_v1(&[
        "lnsat.local_session.rotation.evidence.v1",
        prior_session_id,
        replacement_session_id,
        identity_ref,
        rotated_at,
    ])
}

fn select_local_session_events_v1(
    connection: &Connection,
    session_id: &str,
) -> Result<Vec<StoredLocalSessionEventRow>, LocalSessionStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT event_id, session_id, event_sequence, event_kind,
                    actor_session_id, related_session_id, revocation_reason,
                    source_evidence_digest, occurred_at, event_evidence_digest
             FROM lnsat_local_session_events
             WHERE session_id = ?1
             ORDER BY event_sequence",
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map([session_id], |row| {
            Ok(StoredLocalSessionEventRow {
                event_id: row.get(0)?,
                session_id: row.get(1)?,
                event_sequence: row.get(2)?,
                event_kind: row.get(3)?,
                actor_session_id: row.get(4)?,
                related_session_id: row.get(5)?,
                revocation_reason: row.get(6)?,
                source_evidence_digest: row.get(7)?,
                occurred_at: row.get(8)?,
                event_evidence_digest: row.get(9)?,
            })
        })
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)
}

fn validate_local_session_event_actor_v1(
    connection: &Connection,
    actor_session_id: &str,
    occurred_at: &str,
) -> Result<LocalSessionRecordV1, LocalSessionStoreErrorV1> {
    let actor_row = select_local_session_v1(connection, actor_session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let actor = decode_local_session_v1(connection, &actor_row)?;
    let occurred = canonical_utc_timestamp_millis_v1(occurred_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let issued = canonical_utc_timestamp_millis_v1(&actor.issued_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let expires = canonical_utc_timestamp_millis_v1(&actor.expires_at)
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    if occurred < issued || occurred >= expires {
        return Err(LocalSessionStoreErrorV1::EvidenceDrift);
    }
    if let Some(revocation) = select_local_session_revocation_v1(connection, actor_session_id)? {
        validate_local_session_revocation_v1(&revocation, &actor)?;
        let revoked = canonical_utc_timestamp_millis_v1(&revocation.revoked_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        if revoked < occurred {
            return Err(LocalSessionStoreErrorV1::EvidenceDrift);
        }
    }
    Ok(actor)
}

#[allow(clippy::too_many_lines)]
fn validate_local_session_events_v1(
    connection: &Connection,
    session: &LocalSessionRecordV1,
    stored: &[StoredLocalSessionEventRow],
) -> Result<Vec<LocalSessionEventV1>, LocalSessionStoreErrorV1> {
    let session_row = select_local_session_v1(connection, &session.session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let mut prior_occurred = None;
    let mut seen_issued = false;
    let mut seen_revoked = false;
    let mut seen_rotated = false;
    let mut events = Vec::with_capacity(stored.len());
    for (index, row) in stored.iter().enumerate() {
        let expected_sequence =
            i64::try_from(index + 1).map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
        let occurred = canonical_utc_timestamp_millis_v1(&row.occurred_at)
            .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
        let event_kind = match row.event_kind.as_str() {
            "issued" => LocalSessionEventKindV1::Issued,
            "revoked" => LocalSessionEventKindV1::Revoked,
            "rotated" => LocalSessionEventKindV1::Rotated,
            _ => return Err(LocalSessionStoreErrorV1::EvidenceDrift),
        };
        if row.session_id != session.session_id
            || row.event_sequence != expected_sequence
            || prior_occurred.is_some_and(|prior| occurred < prior)
            || local_session_event_id_v1(
                &row.session_id,
                row.event_sequence,
                event_kind,
                &row.occurred_at,
            ) != row.event_id
            || local_session_event_evidence_digest_v1(
                &row.event_id,
                &row.session_id,
                row.event_sequence,
                event_kind,
                row.actor_session_id.as_deref(),
                row.related_session_id.as_deref(),
                row.revocation_reason.as_deref(),
                &row.source_evidence_digest,
                &row.occurred_at,
            ) != row.event_evidence_digest
        {
            return Err(LocalSessionStoreErrorV1::EvidenceDrift);
        }
        match event_kind {
            LocalSessionEventKindV1::Issued => {
                if index != 0
                    || seen_issued
                    || seen_revoked
                    || seen_rotated
                    || row.actor_session_id.is_some()
                    || row.related_session_id.is_some()
                    || row.revocation_reason.is_some()
                    || row.source_evidence_digest != session_row.session_evidence_digest
                    || row.occurred_at != session.issued_at
                {
                    return Err(LocalSessionStoreErrorV1::EvidenceDrift);
                }
                seen_issued = true;
            }
            LocalSessionEventKindV1::Revoked => {
                let revocation =
                    select_local_session_revocation_v1(connection, &session.session_id)?
                        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
                validate_local_session_revocation_v1(&revocation, session)?;
                let actor_matches_reason =
                    match (revocation.reason.as_str(), row.actor_session_id.as_deref()) {
                        ("recovery", None) => session.role == LocalIdentityRoleV1::Owner,
                        (reason, Some(actor_session_id)) => {
                            let actor = validate_local_session_event_actor_v1(
                                connection,
                                actor_session_id,
                                &row.occurred_at,
                            )?;
                            match reason {
                                "sign_out" | "credential_revoke" => {
                                    actor.identity_ref == session.identity_ref
                                }
                                "owner_revoke" => {
                                    actor.session_id == session.session_id
                                        || actor.role == LocalIdentityRoleV1::Owner
                                }
                                "rotation" => actor.session_id == session.session_id,
                                _ => false,
                            }
                        }
                        _ => false,
                    };
                if !actor_matches_reason
                    || seen_revoked
                    || seen_rotated
                    || row.related_session_id.is_some()
                    || row.revocation_reason.as_deref() != Some(revocation.reason.as_str())
                    || row.source_evidence_digest != revocation.revocation_evidence_digest
                    || row.occurred_at != revocation.revoked_at
                {
                    return Err(LocalSessionStoreErrorV1::EvidenceDrift);
                }
                seen_revoked = true;
            }
            LocalSessionEventKindV1::Rotated => {
                let actor_session_id = row
                    .actor_session_id
                    .as_deref()
                    .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
                validate_local_session_event_actor_v1(
                    connection,
                    actor_session_id,
                    &row.occurred_at,
                )?;
                let rotation = select_local_session_rotation_v1(connection, &session.session_id)?
                    .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
                validate_local_session_rotation_v1(connection, &rotation)?;
                if !seen_revoked
                    || seen_rotated
                    || actor_session_id != session.session_id
                    || row.related_session_id.as_deref()
                        != Some(rotation.replacement_session_id.as_str())
                    || row.revocation_reason.is_some()
                    || row.source_evidence_digest != rotation.rotation_evidence_digest
                    || row.occurred_at != rotation.rotated_at
                {
                    return Err(LocalSessionStoreErrorV1::EvidenceDrift);
                }
                seen_rotated = true;
            }
        }
        events.push(LocalSessionEventV1 {
            event_id: row.event_id.clone(),
            session_id: row.session_id.clone(),
            event_sequence: row.event_sequence,
            event_kind,
            actor_session_id: row.actor_session_id.clone(),
            related_session_id: row.related_session_id.clone(),
            revocation_reason: row.revocation_reason.clone(),
            source_evidence_digest: row.source_evidence_digest.clone(),
            occurred_at: row.occurred_at.clone(),
            event_evidence_digest: row.event_evidence_digest.clone(),
        });
        prior_occurred = Some(occurred);
    }
    Ok(events)
}

#[allow(clippy::too_many_arguments)]
fn insert_local_session_event_v1(
    connection: &Connection,
    session_id: &str,
    event_kind: LocalSessionEventKindV1,
    actor_session_id: Option<&str>,
    related_session_id: Option<&str>,
    revocation_reason: Option<LocalSessionRevocationReasonV1>,
    source_evidence_digest: &str,
    occurred_at: &str,
) -> Result<LocalSessionEventV1, LocalSessionStoreErrorV1> {
    let session_row = select_local_session_v1(connection, session_id)?
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)?;
    let session = decode_local_session_v1(connection, &session_row)?;
    let before = select_local_session_events_v1(connection, session_id)?;
    validate_local_session_events_v1(connection, &session, &before)?;
    let event_sequence =
        i64::try_from(before.len() + 1).map_err(|_| LocalSessionStoreErrorV1::EvidenceDrift)?;
    if event_sequence > 3 {
        return Err(LocalSessionStoreErrorV1::InvalidInput);
    }
    let revocation_reason = revocation_reason.map(LocalSessionRevocationReasonV1::as_str);
    let event_id = local_session_event_id_v1(session_id, event_sequence, event_kind, occurred_at);
    let event_evidence_digest = local_session_event_evidence_digest_v1(
        &event_id,
        session_id,
        event_sequence,
        event_kind,
        actor_session_id,
        related_session_id,
        revocation_reason,
        source_evidence_digest,
        occurred_at,
    );
    connection
        .execute(
            "INSERT INTO lnsat_local_session_events (
                event_id, session_id, event_sequence, event_kind,
                actor_session_id, related_session_id, revocation_reason,
                source_evidence_digest, occurred_at, event_evidence_digest
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                event_id,
                session_id,
                event_sequence,
                event_kind.as_str(),
                actor_session_id,
                related_session_id,
                revocation_reason,
                source_evidence_digest,
                occurred_at,
                event_evidence_digest,
            ],
        )
        .map_err(|_| LocalSessionStoreErrorV1::PersistenceFailed)?;
    let stored = select_local_session_events_v1(connection, session_id)?;
    let events = validate_local_session_events_v1(connection, &session, &stored)?;
    events
        .last()
        .filter(|event| event.event_id == event_id)
        .cloned()
        .ok_or(LocalSessionStoreErrorV1::EvidenceDrift)
}

fn local_session_event_id_v1(
    session_id: &str,
    event_sequence: i64,
    event_kind: LocalSessionEventKindV1,
    occurred_at: &str,
) -> String {
    let sequence = event_sequence.to_string();
    evidence_digest_v1(&[
        "lnsat.local_session.event.id.v1",
        session_id,
        &sequence,
        event_kind.as_str(),
        occurred_at,
    ])
}

#[allow(clippy::too_many_arguments)]
fn local_session_event_evidence_digest_v1(
    event_id: &str,
    session_id: &str,
    event_sequence: i64,
    event_kind: LocalSessionEventKindV1,
    actor_session_id: Option<&str>,
    related_session_id: Option<&str>,
    revocation_reason: Option<&str>,
    source_evidence_digest: &str,
    occurred_at: &str,
) -> String {
    let sequence = event_sequence.to_string();
    evidence_digest_v1(&[
        "lnsat.local_session.event.evidence.v1",
        event_id,
        session_id,
        &sequence,
        event_kind.as_str(),
        actor_session_id.unwrap_or(""),
        related_session_id.unwrap_or(""),
        revocation_reason.unwrap_or(""),
        source_evidence_digest,
        occurred_at,
    ])
}

fn count_protected_records_v1(connection: &Connection) -> Result<i64, SqliteRetentionErrorV1> {
    connection
        .query_row(
            "SELECT
               (SELECT count(*) FROM lnsat_approval_decisions)
             + (SELECT count(*) FROM lnsat_approval_requests)
             + (SELECT count(*) FROM lnsat_audit_events)
             + (SELECT count(*) FROM lnsat_audit_event_reason_codes)
             + (SELECT count(*) FROM lnsat_authorization_attempts)
             + (SELECT count(*) FROM lnsat_authorization_nonces)
             + (SELECT count(*) FROM lnsat_capability_consumptions)
             + (SELECT count(*) FROM lnsat_execution_authorizations)
             + (SELECT count(*) FROM lnsat_local_identities)
             + (SELECT count(*) FROM lnsat_local_identity_events)
             + (SELECT count(*) FROM lnsat_local_identity_status_events)
             + (SELECT count(*) FROM lnsat_local_password_credentials)
             + (SELECT count(*) FROM lnsat_local_sessions)
             + (SELECT count(*) FROM lnsat_local_session_activity_events)
             + (SELECT count(*) FROM lnsat_local_session_events)
             + (SELECT count(*) FROM lnsat_local_session_revocations)
             + (SELECT count(*) FROM lnsat_local_session_rotations)
             + (SELECT count(*) FROM lnsat_operation_attempts)
             + (SELECT count(*) FROM lnsat_operation_receipts)
             + (SELECT count(*) FROM lnsat_operation_reconciliations)
             + (SELECT count(*) FROM lnsat_operations)
             + (SELECT count(*) FROM lnsat_packet_envelopes)
             + (SELECT count(*) FROM lnsat_packet_resource_refs)
             + (SELECT count(*) FROM lnsat_phase7_audit_bindings)
             + (SELECT count(*) FROM lnsat_phase7_entities)
             + (SELECT count(*) FROM lnsat_phase7_state_events)
             + (SELECT count(*) FROM lnsat_policy_decisions)
             + (SELECT count(*) FROM lnsat_recovery_inspection_events)",
            [],
            |row| row.get(0),
        )
        .map_err(|_| SqliteRetentionErrorV1::PersistenceFailed)
}

#[derive(Debug)]
struct StoredPacketRow {
    packet_id: String,
    packet_sha256: String,
    contract_version: String,
    schema_id: String,
    packet_type: String,
    actor_ref: String,
    session_ref: String,
    project_ref: String,
    idempotency_key: String,
    created_at: String,
    expires_at: String,
    canonical_packet: String,
}

fn map_stored_packet(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredPacketRow> {
    Ok(StoredPacketRow {
        packet_id: row.get(0)?,
        packet_sha256: row.get(1)?,
        contract_version: row.get(2)?,
        schema_id: row.get(3)?,
        packet_type: row.get(4)?,
        actor_ref: row.get(5)?,
        session_ref: row.get(6)?,
        project_ref: row.get(7)?,
        idempotency_key: row.get(8)?,
        created_at: row.get(9)?,
        expires_at: row.get(10)?,
        canonical_packet: row.get(11)?,
    })
}

fn select_packet_by_idempotency(
    connection: &Connection,
    project_ref: &str,
    idempotency_key: &str,
) -> Result<Option<StoredPacketRow>, PacketStoreErrorV1> {
    connection
        .query_row(
            "SELECT packet_id, packet_sha256, contract_version, schema_id,
                    packet_type, actor_ref, session_ref, project_ref,
                    idempotency_key, created_at, expires_at, canonical_packet
             FROM lnsat_packet_envelopes
             WHERE project_ref = ?1 AND idempotency_key = ?2",
            params![project_ref, idempotency_key],
            map_stored_packet,
        )
        .optional()
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)
}

fn select_packet_by_id(
    connection: &Connection,
    packet_id: &str,
) -> Result<Option<StoredPacketRow>, PacketStoreErrorV1> {
    connection
        .query_row(
            "SELECT packet_id, packet_sha256, contract_version, schema_id,
                    packet_type, actor_ref, session_ref, project_ref,
                    idempotency_key, created_at, expires_at, canonical_packet
             FROM lnsat_packet_envelopes
             WHERE packet_id = ?1",
            [packet_id],
            map_stored_packet,
        )
        .optional()
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)
}

fn select_packet_by_project(
    connection: &Connection,
    project_ref: &str,
    packet_id: &str,
) -> Result<Option<StoredPacketRow>, PacketStoreErrorV1> {
    connection
        .query_row(
            "SELECT packet_id, packet_sha256, contract_version, schema_id,
                    packet_type, actor_ref, session_ref, project_ref,
                    idempotency_key, created_at, expires_at, canonical_packet
             FROM lnsat_packet_envelopes
             WHERE project_ref = ?1 AND packet_id = ?2",
            params![project_ref, packet_id],
            map_stored_packet,
        )
        .optional()
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)
}

fn select_packet_by_resource(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    packet_id: &str,
) -> Result<Option<StoredPacketRow>, PacketStoreErrorV1> {
    connection
        .query_row(
            "SELECT packet.packet_id, packet.packet_sha256,
                    packet.contract_version, packet.schema_id,
                    packet.packet_type, packet.actor_ref, packet.session_ref,
                    packet.project_ref, packet.idempotency_key,
                    packet.created_at, packet.expires_at,
                    packet.canonical_packet
             FROM lnsat_packet_envelopes AS packet
             JOIN lnsat_packet_resource_refs AS resource
               ON resource.packet_id = packet.packet_id
              AND resource.project_ref = packet.project_ref
             WHERE packet.project_ref = ?1
               AND resource.resource_ref = ?2
               AND packet.packet_id = ?3",
            params![project_ref, resource_ref, packet_id],
            map_stored_packet,
        )
        .optional()
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)
}

fn decode_packet_record(
    connection: &Connection,
    row: &StoredPacketRow,
) -> Result<PacketStoreRecordV1, PacketStoreErrorV1> {
    let packet = parse_packet_envelope_v1(row.canonical_packet.as_bytes())
        .map_err(|_| PacketStoreErrorV1::EvidenceDrift)?;
    let canonical_packet =
        canonicalize_packet_envelope_v1(&packet).map_err(|_| PacketStoreErrorV1::EvidenceDrift)?;
    let packet_sha256 =
        hash_packet_envelope_v1(&packet).map_err(|_| PacketStoreErrorV1::EvidenceDrift)?;
    let resource_refs = select_resource_refs(connection, &row.packet_id, &row.project_ref)?;

    if canonical_packet != row.canonical_packet
        || packet_sha256 != row.packet_sha256
        || packet.packet_id != row.packet_id
        || packet.contract_version != row.contract_version
        || packet.schema_id != row.schema_id
        || packet.packet_type != row.packet_type
        || packet.actor_ref != row.actor_ref
        || packet.session_ref != row.session_ref
        || packet.project_ref != row.project_ref
        || packet.idempotency_key != row.idempotency_key
        || packet.created_at != row.created_at
        || packet.expires_at != row.expires_at
        || packet.resource_refs != resource_refs
    {
        return Err(PacketStoreErrorV1::EvidenceDrift);
    }

    Ok(PacketStoreRecordV1 {
        packet,
        canonical_packet,
        packet_sha256,
    })
}

fn select_resource_refs(
    connection: &Connection,
    packet_id: &str,
    project_ref: &str,
) -> Result<Vec<String>, PacketStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT resource_ref
             FROM lnsat_packet_resource_refs
             WHERE packet_id = ?1 AND project_ref = ?2
             ORDER BY ordinal",
        )
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map(params![packet_id, project_ref], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| PacketStoreErrorV1::PersistenceFailed)
}

fn map_packet_store_error(error: PacketStoreErrorV1) -> PolicyStoreErrorV1 {
    match error {
        PacketStoreErrorV1::EvidenceDrift => PolicyStoreErrorV1::EvidenceDrift,
        PacketStoreErrorV1::InvalidPacket
        | PacketStoreErrorV1::IdempotencyConflict
        | PacketStoreErrorV1::PacketIdentityConflict
        | PacketStoreErrorV1::PersistenceFailed => PolicyStoreErrorV1::PersistenceFailed,
    }
}

#[derive(Debug)]
struct StoredPolicyRow {
    decision_id: String,
    schema_id: String,
    packet_id: String,
    packet_sha256: String,
    project_ref: String,
    evaluated_at: String,
    expires_at: String,
    decision: String,
    requires_approval: i64,
}

fn map_stored_policy(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredPolicyRow> {
    Ok(StoredPolicyRow {
        decision_id: row.get(0)?,
        schema_id: row.get(1)?,
        packet_id: row.get(2)?,
        packet_sha256: row.get(3)?,
        project_ref: row.get(4)?,
        evaluated_at: row.get(5)?,
        expires_at: row.get(6)?,
        decision: row.get(7)?,
        requires_approval: row.get(8)?,
    })
}

fn select_policy_by_id(
    connection: &Connection,
    decision_id: &str,
) -> Result<Option<StoredPolicyRow>, PolicyStoreErrorV1> {
    connection
        .query_row(
            "SELECT decision_id, schema_id, packet_id, packet_sha256,
                    project_ref, evaluated_at, expires_at, decision,
                    requires_approval
             FROM lnsat_policy_decisions
             WHERE decision_id = ?1",
            [decision_id],
            map_stored_policy,
        )
        .optional()
        .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)
}

fn select_policy_by_packet_time(
    connection: &Connection,
    packet_id: &str,
    evaluated_at: &str,
) -> Result<Option<StoredPolicyRow>, PolicyStoreErrorV1> {
    connection
        .query_row(
            "SELECT decision_id, schema_id, packet_id, packet_sha256,
                    project_ref, evaluated_at, expires_at, decision,
                    requires_approval
             FROM lnsat_policy_decisions
             WHERE packet_id = ?1 AND evaluated_at = ?2",
            params![packet_id, evaluated_at],
            map_stored_policy,
        )
        .optional()
        .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)
}

fn select_policy_by_project(
    connection: &Connection,
    project_ref: &str,
    decision_id: &str,
) -> Result<Option<StoredPolicyRow>, PolicyStoreErrorV1> {
    connection
        .query_row(
            "SELECT decision_id, schema_id, packet_id, packet_sha256,
                    project_ref, evaluated_at, expires_at, decision,
                    requires_approval
             FROM lnsat_policy_decisions
             WHERE project_ref = ?1 AND decision_id = ?2",
            params![project_ref, decision_id],
            map_stored_policy,
        )
        .optional()
        .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)
}

fn select_policy_by_resource(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    decision_id: &str,
) -> Result<Option<StoredPolicyRow>, PolicyStoreErrorV1> {
    connection
        .query_row(
            "SELECT policy.decision_id, policy.schema_id, policy.packet_id,
                    policy.packet_sha256, policy.project_ref,
                    policy.evaluated_at, policy.expires_at, policy.decision,
                    policy.requires_approval
             FROM lnsat_policy_decisions AS policy
             JOIN lnsat_packet_resource_refs AS resource
               ON resource.packet_id = policy.packet_id
              AND resource.project_ref = policy.project_ref
             WHERE policy.project_ref = ?1
               AND resource.resource_ref = ?2
               AND policy.decision_id = ?3",
            params![project_ref, resource_ref, decision_id],
            map_stored_policy,
        )
        .optional()
        .map_err(|_| PolicyStoreErrorV1::PersistenceFailed)
}

fn decode_policy_record(
    connection: &Connection,
    row: &StoredPolicyRow,
) -> Result<PolicyStoreRecordV1, PolicyStoreErrorV1> {
    let packet_row = select_packet_by_project(connection, &row.project_ref, &row.packet_id)
        .map_err(map_packet_store_error)?
        .ok_or(PolicyStoreErrorV1::EvidenceDrift)?;
    let packet_record =
        decode_packet_record(connection, &packet_row).map_err(map_packet_store_error)?;
    let decision = decide_packet_envelope_policy_v1(&packet_record.packet, &row.evaluated_at)
        .map_err(|_| PolicyStoreErrorV1::EvidenceDrift)?;
    let requires_approval = match row.requires_approval {
        0 => false,
        1 => true,
        _ => return Err(PolicyStoreErrorV1::EvidenceDrift),
    };

    if decision.decision_id != row.decision_id
        || decision.schema_id != row.schema_id
        || decision.packet_ref.packet_id != row.packet_id
        || decision.packet_ref.packet_hash != row.packet_sha256
        || decision.project_ref != row.project_ref
        || decision.evaluated_at != row.evaluated_at
        || decision.expires_at != row.expires_at
        || decision.decision.as_str() != row.decision
        || decision.requires_approval != requires_approval
    {
        return Err(PolicyStoreErrorV1::EvidenceDrift);
    }

    Ok(PolicyStoreRecordV1 { decision })
}

fn map_policy_store_error(error: PolicyStoreErrorV1) -> ApprovalRequestStoreErrorV1 {
    match error {
        PolicyStoreErrorV1::EvidenceDrift => ApprovalRequestStoreErrorV1::EvidenceDrift,
        PolicyStoreErrorV1::InvalidDecision
        | PolicyStoreErrorV1::DecisionIdentityConflict
        | PolicyStoreErrorV1::PersistenceFailed => ApprovalRequestStoreErrorV1::PersistenceFailed,
    }
}

#[derive(Debug)]
struct StoredApprovalRequestRow {
    approval_request_id: String,
    schema_id: String,
    status: String,
    policy_decision_id: String,
    packet_sha256: String,
    requester_ref: String,
    session_ref: String,
    project_ref: String,
    requested_at: String,
    expires_at: String,
}

fn map_stored_approval_request(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<StoredApprovalRequestRow> {
    Ok(StoredApprovalRequestRow {
        approval_request_id: row.get(0)?,
        schema_id: row.get(1)?,
        status: row.get(2)?,
        policy_decision_id: row.get(3)?,
        packet_sha256: row.get(4)?,
        requester_ref: row.get(5)?,
        session_ref: row.get(6)?,
        project_ref: row.get(7)?,
        requested_at: row.get(8)?,
        expires_at: row.get(9)?,
    })
}

fn select_approval_request_by_id(
    connection: &Connection,
    approval_request_id: &str,
) -> Result<Option<StoredApprovalRequestRow>, ApprovalRequestStoreErrorV1> {
    connection
        .query_row(
            "SELECT approval_request_id, schema_id, status,
                    policy_decision_id, packet_sha256, requester_ref,
                    session_ref, project_ref, requested_at, expires_at
             FROM lnsat_approval_requests
             WHERE approval_request_id = ?1",
            [approval_request_id],
            map_stored_approval_request,
        )
        .optional()
        .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)
}

fn select_approval_request_by_policy_time(
    connection: &Connection,
    policy_decision_id: &str,
    requested_at: &str,
) -> Result<Option<StoredApprovalRequestRow>, ApprovalRequestStoreErrorV1> {
    connection
        .query_row(
            "SELECT approval_request_id, schema_id, status,
                    policy_decision_id, packet_sha256, requester_ref,
                    session_ref, project_ref, requested_at, expires_at
             FROM lnsat_approval_requests
             WHERE policy_decision_id = ?1 AND requested_at = ?2",
            params![policy_decision_id, requested_at],
            map_stored_approval_request,
        )
        .optional()
        .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)
}

fn select_approval_request_by_project(
    connection: &Connection,
    project_ref: &str,
    approval_request_id: &str,
) -> Result<Option<StoredApprovalRequestRow>, ApprovalRequestStoreErrorV1> {
    connection
        .query_row(
            "SELECT approval_request_id, schema_id, status,
                    policy_decision_id, packet_sha256, requester_ref,
                    session_ref, project_ref, requested_at, expires_at
             FROM lnsat_approval_requests
             WHERE project_ref = ?1 AND approval_request_id = ?2",
            params![project_ref, approval_request_id],
            map_stored_approval_request,
        )
        .optional()
        .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)
}

fn select_approval_request_by_resource(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    approval_request_id: &str,
) -> Result<Option<StoredApprovalRequestRow>, ApprovalRequestStoreErrorV1> {
    connection
        .query_row(
            "SELECT request.approval_request_id, request.schema_id,
                    request.status, request.policy_decision_id,
                    request.packet_sha256, request.requester_ref,
                    request.session_ref, request.project_ref,
                    request.requested_at, request.expires_at
             FROM lnsat_approval_requests AS request
             JOIN lnsat_policy_decisions AS policy
               ON policy.decision_id = request.policy_decision_id
              AND policy.project_ref = request.project_ref
             JOIN lnsat_packet_resource_refs AS resource
               ON resource.packet_id = policy.packet_id
              AND resource.project_ref = policy.project_ref
             WHERE request.project_ref = ?1
               AND resource.resource_ref = ?2
               AND request.approval_request_id = ?3",
            params![project_ref, resource_ref, approval_request_id],
            map_stored_approval_request,
        )
        .optional()
        .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)
}

fn decode_approval_request_record(
    connection: &Connection,
    row: &StoredApprovalRequestRow,
) -> Result<ApprovalRequestStoreRecordV1, ApprovalRequestStoreErrorV1> {
    let policy_row =
        select_policy_by_project(connection, &row.project_ref, &row.policy_decision_id)
            .map_err(map_policy_store_error)?
            .ok_or(ApprovalRequestStoreErrorV1::EvidenceDrift)?;
    let policy_record =
        decode_policy_record(connection, &policy_row).map_err(map_policy_store_error)?;
    let request = create_approval_request_v1(&policy_record.decision, &row.requested_at)
        .map_err(|_| ApprovalRequestStoreErrorV1::EvidenceDrift)?;

    if request.approval_request_id != row.approval_request_id
        || request.schema_id != row.schema_id
        || request.status != row.status
        || request.policy_decision_ref.decision_id != row.policy_decision_id
        || request.policy_decision_ref.packet_hash != row.packet_sha256
        || request.requester_ref != row.requester_ref
        || request.session_ref != row.session_ref
        || request.project_ref != row.project_ref
        || request.requested_at != row.requested_at
        || request.expires_at != row.expires_at
    {
        return Err(ApprovalRequestStoreErrorV1::EvidenceDrift);
    }

    Ok(ApprovalRequestStoreRecordV1 { request })
}

fn map_approval_request_store_error(
    error: ApprovalRequestStoreErrorV1,
) -> ApprovalDecisionStoreErrorV1 {
    match error {
        ApprovalRequestStoreErrorV1::EvidenceDrift => ApprovalDecisionStoreErrorV1::EvidenceDrift,
        ApprovalRequestStoreErrorV1::InvalidRequest
        | ApprovalRequestStoreErrorV1::RequestIdentityConflict
        | ApprovalRequestStoreErrorV1::AuthorizationRejected
        | ApprovalRequestStoreErrorV1::PersistenceFailed => {
            ApprovalDecisionStoreErrorV1::PersistenceFailed
        }
    }
}

#[derive(Debug)]
struct StoredApprovalDecisionRow {
    approval_decision_id: String,
    schema_id: String,
    approval_request_id: String,
    policy_decision_id: String,
    approver_ref: String,
    approver_session_ref: String,
    project_ref: String,
    decision: String,
    reason: String,
    decided_at: String,
    expires_at: String,
    approval_gate_satisfied: i64,
    execution_authorized: i64,
}

fn map_stored_approval_decision(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<StoredApprovalDecisionRow> {
    Ok(StoredApprovalDecisionRow {
        approval_decision_id: row.get(0)?,
        schema_id: row.get(1)?,
        approval_request_id: row.get(2)?,
        policy_decision_id: row.get(3)?,
        approver_ref: row.get(4)?,
        approver_session_ref: row.get(5)?,
        project_ref: row.get(6)?,
        decision: row.get(7)?,
        reason: row.get(8)?,
        decided_at: row.get(9)?,
        expires_at: row.get(10)?,
        approval_gate_satisfied: row.get(11)?,
        execution_authorized: row.get(12)?,
    })
}

const APPROVAL_DECISION_COLUMNS: &str = "
    approval_decision_id, schema_id, approval_request_id,
    policy_decision_id, approver_ref, approver_session_ref,
    project_ref, decision, reason, decided_at, expires_at,
    approval_gate_satisfied, execution_authorized
";

fn map_local_session_approval_error_v1(
    error: LocalSessionStoreErrorV1,
) -> ApprovalDecisionStoreErrorV1 {
    match error {
        LocalSessionStoreErrorV1::InvalidInput | LocalSessionStoreErrorV1::InvalidCredential => {
            ApprovalDecisionStoreErrorV1::AuthorizationRejected
        }
        LocalSessionStoreErrorV1::EvidenceDrift => ApprovalDecisionStoreErrorV1::EvidenceDrift,
        LocalSessionStoreErrorV1::PersistenceFailed => {
            ApprovalDecisionStoreErrorV1::PersistenceFailed
        }
    }
}

fn map_local_session_approval_request_error_v1(
    error: LocalSessionStoreErrorV1,
) -> ApprovalRequestStoreErrorV1 {
    match error {
        LocalSessionStoreErrorV1::InvalidInput | LocalSessionStoreErrorV1::InvalidCredential => {
            ApprovalRequestStoreErrorV1::AuthorizationRejected
        }
        LocalSessionStoreErrorV1::EvidenceDrift => ApprovalRequestStoreErrorV1::EvidenceDrift,
        LocalSessionStoreErrorV1::PersistenceFailed => {
            ApprovalRequestStoreErrorV1::PersistenceFailed
        }
    }
}

fn append_approval_request_in_transaction_v1(
    transaction: &rusqlite::Transaction<'_>,
    request: &ApprovalRequestV1,
) -> Result<ApprovalRequestStoreWriteV1, ApprovalRequestStoreErrorV1> {
    let policy_row = select_policy_by_project(
        transaction,
        &request.project_ref,
        &request.policy_decision_ref.decision_id,
    )
    .map_err(map_policy_store_error)?
    .ok_or(ApprovalRequestStoreErrorV1::InvalidRequest)?;
    let policy_record =
        decode_policy_record(transaction, &policy_row).map_err(map_policy_store_error)?;
    let expected = create_approval_request_v1(&policy_record.decision, &request.requested_at)
        .map_err(|_| ApprovalRequestStoreErrorV1::InvalidRequest)?;
    if expected != *request {
        return Err(ApprovalRequestStoreErrorV1::InvalidRequest);
    }

    if let Some(existing) =
        select_approval_request_by_id(transaction, &request.approval_request_id)?
    {
        let record = decode_approval_request_record(transaction, &existing)?;
        if record.request != *request {
            return Err(ApprovalRequestStoreErrorV1::RequestIdentityConflict);
        }
        return Ok(ApprovalRequestStoreWriteV1 {
            created: false,
            record,
        });
    }
    if select_approval_request_by_policy_time(
        transaction,
        &request.policy_decision_ref.decision_id,
        &request.requested_at,
    )?
    .is_some()
    {
        return Err(ApprovalRequestStoreErrorV1::RequestIdentityConflict);
    }

    transaction
        .execute(
            "INSERT INTO lnsat_approval_requests (
                approval_request_id, schema_id, status,
                policy_decision_id, packet_sha256, requester_ref,
                session_ref, project_ref, requested_at, expires_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                request.approval_request_id,
                request.schema_id,
                request.status,
                request.policy_decision_ref.decision_id,
                request.policy_decision_ref.packet_hash,
                request.requester_ref,
                request.session_ref,
                request.project_ref,
                request.requested_at,
                request.expires_at,
            ],
        )
        .map_err(|_| ApprovalRequestStoreErrorV1::PersistenceFailed)?;

    Ok(ApprovalRequestStoreWriteV1 {
        created: true,
        record: ApprovalRequestStoreRecordV1 {
            request: request.clone(),
        },
    })
}

fn append_approval_decision_in_transaction_v1(
    transaction: &rusqlite::Transaction<'_>,
    decision: &ApprovalDecisionV1,
) -> Result<ApprovalDecisionStoreWriteV1, ApprovalDecisionStoreErrorV1> {
    let request_row = select_approval_request_by_id(
        transaction,
        &decision.approval_request_ref.approval_request_id,
    )
    .map_err(map_approval_request_store_error)?
    .ok_or(ApprovalDecisionStoreErrorV1::InvalidDecision)?;
    let request_record = decode_approval_request_record(transaction, &request_row)
        .map_err(map_approval_request_store_error)?;
    let input = ApprovalDecisionV1Input {
        approver_ref: decision.approver_ref.clone(),
        approver_session_ref: decision.approver_session_ref.clone(),
        decision: decision.decision,
        reason: decision.reason,
        decided_at: decision.decided_at.clone(),
    };
    let expected = decide_approval_request_v1(&request_record.request, &input)
        .map_err(|_| ApprovalDecisionStoreErrorV1::InvalidDecision)?;
    if expected != *decision {
        return Err(ApprovalDecisionStoreErrorV1::InvalidDecision);
    }

    if let Some(existing) =
        select_approval_decision_by_id(transaction, &decision.approval_decision_id)?
    {
        let record = decode_approval_decision_record(transaction, &existing)?;
        if record.decision != *decision {
            return Err(ApprovalDecisionStoreErrorV1::DecisionIdentityConflict);
        }
        return Ok(ApprovalDecisionStoreWriteV1 {
            created: false,
            record,
        });
    }
    if select_approval_decision_by_request(
        transaction,
        &decision.approval_request_ref.approval_request_id,
    )?
    .is_some()
    {
        return Err(ApprovalDecisionStoreErrorV1::DecisionIdentityConflict);
    }

    transaction
        .execute(
            "INSERT INTO lnsat_approval_decisions (
                approval_decision_id, schema_id, approval_request_id,
                policy_decision_id, approver_ref, approver_session_ref,
                project_ref, decision, reason, decided_at, expires_at,
                approval_gate_satisfied, execution_authorized
             ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
             )",
            params![
                decision.approval_decision_id,
                decision.schema_id,
                decision.approval_request_ref.approval_request_id,
                decision.approval_request_ref.policy_decision_id,
                decision.approver_ref,
                decision.approver_session_ref,
                request_record.request.project_ref,
                decision.decision.as_str(),
                decision.reason.code(),
                decision.decided_at,
                decision.expires_at,
                i64::from(decision.approval_gate_satisfied),
                i64::from(decision.execution_authorized),
            ],
        )
        .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)?;

    Ok(ApprovalDecisionStoreWriteV1 {
        created: true,
        record: ApprovalDecisionStoreRecordV1 {
            decision: decision.clone(),
        },
    })
}

fn select_approval_decision_by_id(
    connection: &Connection,
    approval_decision_id: &str,
) -> Result<Option<StoredApprovalDecisionRow>, ApprovalDecisionStoreErrorV1> {
    connection
        .query_row(
            &format!(
                "SELECT {APPROVAL_DECISION_COLUMNS}
                 FROM lnsat_approval_decisions
                 WHERE approval_decision_id = ?1"
            ),
            [approval_decision_id],
            map_stored_approval_decision,
        )
        .optional()
        .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)
}

fn select_approval_decision_by_request(
    connection: &Connection,
    approval_request_id: &str,
) -> Result<Option<StoredApprovalDecisionRow>, ApprovalDecisionStoreErrorV1> {
    connection
        .query_row(
            &format!(
                "SELECT {APPROVAL_DECISION_COLUMNS}
                 FROM lnsat_approval_decisions
                 WHERE approval_request_id = ?1"
            ),
            [approval_request_id],
            map_stored_approval_decision,
        )
        .optional()
        .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)
}

fn select_approval_decision_by_project(
    connection: &Connection,
    project_ref: &str,
    approval_decision_id: &str,
) -> Result<Option<StoredApprovalDecisionRow>, ApprovalDecisionStoreErrorV1> {
    connection
        .query_row(
            &format!(
                "SELECT {APPROVAL_DECISION_COLUMNS}
                 FROM lnsat_approval_decisions
                 WHERE project_ref = ?1 AND approval_decision_id = ?2"
            ),
            params![project_ref, approval_decision_id],
            map_stored_approval_decision,
        )
        .optional()
        .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)
}

fn select_approval_decision_by_resource(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    approval_decision_id: &str,
) -> Result<Option<StoredApprovalDecisionRow>, ApprovalDecisionStoreErrorV1> {
    connection
        .query_row(
            "SELECT decision.approval_decision_id, decision.schema_id,
                    decision.approval_request_id, decision.policy_decision_id,
                    decision.approver_ref, decision.approver_session_ref,
                    decision.project_ref, decision.decision, decision.reason,
                    decision.decided_at, decision.expires_at,
                    decision.approval_gate_satisfied,
                    decision.execution_authorized
             FROM lnsat_approval_decisions AS decision
             JOIN lnsat_approval_requests AS request
               ON request.approval_request_id = decision.approval_request_id
              AND request.project_ref = decision.project_ref
             JOIN lnsat_policy_decisions AS policy
               ON policy.decision_id = request.policy_decision_id
              AND policy.project_ref = request.project_ref
             JOIN lnsat_packet_resource_refs AS resource
               ON resource.packet_id = policy.packet_id
              AND resource.project_ref = policy.project_ref
             WHERE decision.project_ref = ?1
               AND resource.resource_ref = ?2
               AND decision.approval_decision_id = ?3",
            params![project_ref, resource_ref, approval_decision_id],
            map_stored_approval_decision,
        )
        .optional()
        .map_err(|_| ApprovalDecisionStoreErrorV1::PersistenceFailed)
}

fn decode_approval_decision_record(
    connection: &Connection,
    row: &StoredApprovalDecisionRow,
) -> Result<ApprovalDecisionStoreRecordV1, ApprovalDecisionStoreErrorV1> {
    let request_row =
        select_approval_request_by_project(connection, &row.project_ref, &row.approval_request_id)
            .map_err(map_approval_request_store_error)?
            .ok_or(ApprovalDecisionStoreErrorV1::EvidenceDrift)?;
    let request_record = decode_approval_request_record(connection, &request_row)
        .map_err(map_approval_request_store_error)?;
    let decision_kind = match row.decision.as_str() {
        "approved" => ApprovalDecisionV1Kind::Approved,
        "denied" => ApprovalDecisionV1Kind::Denied,
        _ => return Err(ApprovalDecisionStoreErrorV1::EvidenceDrift),
    };
    let reason = match row.reason.as_str() {
        "approval.operator_approved" => ApprovalDecisionV1Reason::OperatorApproved,
        "approval.operator_denied" => ApprovalDecisionV1Reason::OperatorDenied,
        "approval.scope_rejected" => ApprovalDecisionV1Reason::ScopeRejected,
        "approval.evidence_insufficient" => ApprovalDecisionV1Reason::EvidenceInsufficient,
        "approval.request_superseded" => ApprovalDecisionV1Reason::RequestSuperseded,
        _ => return Err(ApprovalDecisionStoreErrorV1::EvidenceDrift),
    };
    let input = ApprovalDecisionV1Input {
        approver_ref: row.approver_ref.clone(),
        approver_session_ref: row.approver_session_ref.clone(),
        decision: decision_kind,
        reason,
        decided_at: row.decided_at.clone(),
    };
    let decision = decide_approval_request_v1(&request_record.request, &input)
        .map_err(|_| ApprovalDecisionStoreErrorV1::EvidenceDrift)?;
    let approval_gate_satisfied = match row.approval_gate_satisfied {
        0 => false,
        1 => true,
        _ => return Err(ApprovalDecisionStoreErrorV1::EvidenceDrift),
    };
    let execution_authorized = match row.execution_authorized {
        0 => false,
        1 => true,
        _ => return Err(ApprovalDecisionStoreErrorV1::EvidenceDrift),
    };

    if decision.approval_decision_id != row.approval_decision_id
        || decision.schema_id != row.schema_id
        || decision.approval_request_ref.approval_request_id != row.approval_request_id
        || decision.approval_request_ref.policy_decision_id != row.policy_decision_id
        || decision.approver_ref != row.approver_ref
        || decision.approver_session_ref != row.approver_session_ref
        || decision.decision.as_str() != row.decision
        || decision.reason.code() != row.reason
        || decision.decided_at != row.decided_at
        || decision.expires_at != row.expires_at
        || decision.approval_gate_satisfied != approval_gate_satisfied
        || decision.execution_authorized != execution_authorized
    {
        return Err(ApprovalDecisionStoreErrorV1::EvidenceDrift);
    }

    Ok(ApprovalDecisionStoreRecordV1 { decision })
}

#[derive(Clone, Copy)]
struct AuditSourceRefs<'a> {
    event_type: AuditEventV1Type,
    project_ref: &'a str,
    packet_id: &'a str,
    policy_decision_id: &'a str,
    approval_request_id: Option<&'a str>,
    approval_decision_id: Option<&'a str>,
    observed_at: &'a str,
}

fn insert_audit_event(
    connection: &Connection,
    event: &AuditEventV1,
) -> Result<(), AuditEventStoreErrorV1> {
    let approval_request_id = event
        .approval_request_ref
        .as_ref()
        .map(|value| value.approval_request_id.as_str());
    let approval_decision_id = event
        .approval_decision_ref
        .as_ref()
        .map(|value| value.approval_decision_id.as_str());
    connection
        .execute(
            "INSERT INTO lnsat_audit_events (
                event_id, schema_id, event_type, result_status,
                packet_id, packet_sha256, policy_decision_id,
                approval_request_id, approval_decision_id,
                actor_ref, session_ref, project_ref,
                source_evidence_hash, idempotency_key, event_at,
                observed_at, retention_class, raw_rejected_command,
                raw_rejected_value, raw_invalid_payload_content,
                secret_like_values, authenticated_provenance,
                persistence_requested, execution_authorized
             ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22,
                ?23, ?24
             )",
            params![
                event.event_id,
                event.schema_id,
                event.event_type.as_str(),
                event.result_status.as_str(),
                event.packet_ref.packet_id,
                event.packet_ref.packet_hash,
                event.policy_ref.decision_id,
                approval_request_id,
                approval_decision_id,
                event.actor_ref,
                event.session_ref,
                event.project_ref,
                event.source_evidence_hash,
                event.idempotency_key,
                event.event_at,
                event.observed_at,
                event.retention_class,
                event.redaction.raw_rejected_command,
                event.redaction.raw_rejected_value,
                event.redaction.raw_invalid_payload_content,
                event.redaction.secret_like_values,
                i64::from(event.authenticated_provenance),
                i64::from(event.persistence_requested),
                i64::from(event.execution_authorized),
            ],
        )
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?;
    for (ordinal, reason_code) in event.reason_codes.iter().enumerate() {
        let ordinal = i64::try_from(ordinal).map_err(|_| AuditEventStoreErrorV1::InvalidEvent)?;
        connection
            .execute(
                "INSERT INTO lnsat_audit_event_reason_codes (
                    event_id, project_ref, ordinal, reason_code
                 ) VALUES (?1, ?2, ?3, ?4)",
                params![event.event_id, event.project_ref, ordinal, reason_code],
            )
            .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?;
    }
    Ok(())
}

fn rederive_audit_event_from_refs(
    connection: &Connection,
    refs: AuditSourceRefs<'_>,
    invalid_error: AuditEventStoreErrorV1,
) -> Result<AuditEventV1, AuditEventStoreErrorV1> {
    let packet_row = select_packet_by_project(connection, refs.project_ref, refs.packet_id)
        .map_err(map_packet_error_to_audit)?
        .ok_or(invalid_error)?;
    let packet = decode_packet_record(connection, &packet_row)
        .map_err(map_packet_error_to_audit)?
        .packet;
    let policy_row =
        select_policy_by_project(connection, refs.project_ref, refs.policy_decision_id)
            .map_err(map_policy_error_to_audit)?
            .ok_or(invalid_error)?;
    let policy = decode_policy_record(connection, &policy_row)
        .map_err(map_policy_error_to_audit)?
        .decision;

    let input = match (
        refs.event_type,
        refs.approval_request_id,
        refs.approval_decision_id,
    ) {
        (AuditEventV1Type::PolicyDecisionRecorded, None, None) => {
            AuditEventV1Input::PolicyDecision {
                packet: Box::new(packet),
                policy_decision: Box::new(policy),
            }
        }
        (AuditEventV1Type::ApprovalRequestRecorded, Some(request_id), None) => {
            let request_row =
                select_approval_request_by_project(connection, refs.project_ref, request_id)
                    .map_err(map_request_error_to_audit)?
                    .ok_or(invalid_error)?;
            let request = decode_approval_request_record(connection, &request_row)
                .map_err(map_request_error_to_audit)?
                .request;
            AuditEventV1Input::ApprovalRequest {
                packet: Box::new(packet),
                policy_decision: Box::new(policy),
                approval_request: Box::new(request),
            }
        }
        (AuditEventV1Type::ApprovalDecisionRecorded, Some(request_id), Some(decision_id)) => {
            let request_row =
                select_approval_request_by_project(connection, refs.project_ref, request_id)
                    .map_err(map_request_error_to_audit)?
                    .ok_or(invalid_error)?;
            let request = decode_approval_request_record(connection, &request_row)
                .map_err(map_request_error_to_audit)?
                .request;
            let decision_row =
                select_approval_decision_by_project(connection, refs.project_ref, decision_id)
                    .map_err(map_decision_error_to_audit)?
                    .ok_or(invalid_error)?;
            let decision = decode_approval_decision_record(connection, &decision_row)
                .map_err(map_decision_error_to_audit)?
                .decision;
            AuditEventV1Input::ApprovalDecision {
                packet: Box::new(packet),
                policy_decision: Box::new(policy),
                approval_request: Box::new(request),
                approval_decision: Box::new(decision),
            }
        }
        _ => return Err(invalid_error),
    };

    create_audit_event_v1(&input, refs.observed_at).map_err(|_| invalid_error)
}

fn map_packet_error_to_audit(error: PacketStoreErrorV1) -> AuditEventStoreErrorV1 {
    match error {
        PacketStoreErrorV1::EvidenceDrift => AuditEventStoreErrorV1::EvidenceDrift,
        PacketStoreErrorV1::InvalidPacket
        | PacketStoreErrorV1::IdempotencyConflict
        | PacketStoreErrorV1::PacketIdentityConflict
        | PacketStoreErrorV1::PersistenceFailed => AuditEventStoreErrorV1::PersistenceFailed,
    }
}

fn map_policy_error_to_audit(error: PolicyStoreErrorV1) -> AuditEventStoreErrorV1 {
    match error {
        PolicyStoreErrorV1::EvidenceDrift => AuditEventStoreErrorV1::EvidenceDrift,
        PolicyStoreErrorV1::InvalidDecision
        | PolicyStoreErrorV1::DecisionIdentityConflict
        | PolicyStoreErrorV1::PersistenceFailed => AuditEventStoreErrorV1::PersistenceFailed,
    }
}

fn map_request_error_to_audit(error: ApprovalRequestStoreErrorV1) -> AuditEventStoreErrorV1 {
    match error {
        ApprovalRequestStoreErrorV1::EvidenceDrift => AuditEventStoreErrorV1::EvidenceDrift,
        ApprovalRequestStoreErrorV1::InvalidRequest
        | ApprovalRequestStoreErrorV1::RequestIdentityConflict
        | ApprovalRequestStoreErrorV1::AuthorizationRejected
        | ApprovalRequestStoreErrorV1::PersistenceFailed => {
            AuditEventStoreErrorV1::PersistenceFailed
        }
    }
}

fn map_decision_error_to_audit(error: ApprovalDecisionStoreErrorV1) -> AuditEventStoreErrorV1 {
    match error {
        ApprovalDecisionStoreErrorV1::EvidenceDrift => AuditEventStoreErrorV1::EvidenceDrift,
        ApprovalDecisionStoreErrorV1::InvalidDecision
        | ApprovalDecisionStoreErrorV1::DecisionIdentityConflict
        | ApprovalDecisionStoreErrorV1::AuthorizationRejected
        | ApprovalDecisionStoreErrorV1::PersistenceFailed => {
            AuditEventStoreErrorV1::PersistenceFailed
        }
    }
}

#[derive(Debug)]
struct StoredAuditEventRow {
    event_id: String,
    schema_id: String,
    event_type: String,
    result_status: String,
    packet_id: String,
    packet_sha256: String,
    policy_decision_id: String,
    approval_request_id: Option<String>,
    approval_decision_id: Option<String>,
    actor_ref: String,
    session_ref: String,
    project_ref: String,
    source_evidence_hash: String,
    idempotency_key: String,
    event_at: String,
    observed_at: String,
    retention_class: String,
    raw_rejected_command: String,
    raw_rejected_value: String,
    raw_invalid_payload_content: String,
    secret_like_values: String,
    authenticated_provenance: i64,
    persistence_requested: i64,
    execution_authorized: i64,
}

fn map_stored_audit_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredAuditEventRow> {
    Ok(StoredAuditEventRow {
        event_id: row.get(0)?,
        schema_id: row.get(1)?,
        event_type: row.get(2)?,
        result_status: row.get(3)?,
        packet_id: row.get(4)?,
        packet_sha256: row.get(5)?,
        policy_decision_id: row.get(6)?,
        approval_request_id: row.get(7)?,
        approval_decision_id: row.get(8)?,
        actor_ref: row.get(9)?,
        session_ref: row.get(10)?,
        project_ref: row.get(11)?,
        source_evidence_hash: row.get(12)?,
        idempotency_key: row.get(13)?,
        event_at: row.get(14)?,
        observed_at: row.get(15)?,
        retention_class: row.get(16)?,
        raw_rejected_command: row.get(17)?,
        raw_rejected_value: row.get(18)?,
        raw_invalid_payload_content: row.get(19)?,
        secret_like_values: row.get(20)?,
        authenticated_provenance: row.get(21)?,
        persistence_requested: row.get(22)?,
        execution_authorized: row.get(23)?,
    })
}

const AUDIT_EVENT_COLUMNS: &str = "
    event_id, schema_id, event_type, result_status, packet_id,
    packet_sha256, policy_decision_id, approval_request_id,
    approval_decision_id, actor_ref, session_ref, project_ref,
    source_evidence_hash, idempotency_key, event_at, observed_at,
    retention_class, raw_rejected_command, raw_rejected_value,
    raw_invalid_payload_content, secret_like_values,
    authenticated_provenance, persistence_requested, execution_authorized
";

fn select_audit_event_by_idempotency(
    connection: &Connection,
    project_ref: &str,
    idempotency_key: &str,
) -> Result<Option<StoredAuditEventRow>, AuditEventStoreErrorV1> {
    connection
        .query_row(
            &format!(
                "SELECT {AUDIT_EVENT_COLUMNS}
                 FROM lnsat_audit_events
                 WHERE project_ref = ?1 AND idempotency_key = ?2"
            ),
            params![project_ref, idempotency_key],
            map_stored_audit_event,
        )
        .optional()
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)
}

fn select_audit_event_by_id(
    connection: &Connection,
    event_id: &str,
) -> Result<Option<StoredAuditEventRow>, AuditEventStoreErrorV1> {
    connection
        .query_row(
            &format!(
                "SELECT {AUDIT_EVENT_COLUMNS}
                 FROM lnsat_audit_events
                 WHERE event_id = ?1"
            ),
            [event_id],
            map_stored_audit_event,
        )
        .optional()
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)
}

fn select_audit_event_by_project(
    connection: &Connection,
    project_ref: &str,
    event_id: &str,
) -> Result<Option<StoredAuditEventRow>, AuditEventStoreErrorV1> {
    connection
        .query_row(
            &format!(
                "SELECT {AUDIT_EVENT_COLUMNS}
                 FROM lnsat_audit_events
                 WHERE project_ref = ?1 AND event_id = ?2"
            ),
            params![project_ref, event_id],
            map_stored_audit_event,
        )
        .optional()
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)
}

fn select_audit_event_by_resource(
    connection: &Connection,
    project_ref: &str,
    resource_ref: &str,
    event_id: &str,
) -> Result<Option<StoredAuditEventRow>, AuditEventStoreErrorV1> {
    connection
        .query_row(
            "SELECT event.event_id, event.schema_id, event.event_type,
                    event.result_status, event.packet_id, event.packet_sha256,
                    event.policy_decision_id, event.approval_request_id,
                    event.approval_decision_id, event.actor_ref,
                    event.session_ref, event.project_ref,
                    event.source_evidence_hash, event.idempotency_key,
                    event.event_at, event.observed_at, event.retention_class,
                    event.raw_rejected_command, event.raw_rejected_value,
                    event.raw_invalid_payload_content,
                    event.secret_like_values, event.authenticated_provenance,
                    event.persistence_requested, event.execution_authorized
             FROM lnsat_audit_events AS event
             JOIN lnsat_packet_resource_refs AS resource
               ON resource.packet_id = event.packet_id
              AND resource.project_ref = event.project_ref
             WHERE event.project_ref = ?1
               AND resource.resource_ref = ?2
               AND event.event_id = ?3",
            params![project_ref, resource_ref, event_id],
            map_stored_audit_event,
        )
        .optional()
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)
}

fn select_audit_reason_codes(
    connection: &Connection,
    event_id: &str,
    project_ref: &str,
) -> Result<Vec<String>, AuditEventStoreErrorV1> {
    let mut statement = connection
        .prepare(
            "SELECT reason_code
             FROM lnsat_audit_event_reason_codes
             WHERE event_id = ?1 AND project_ref = ?2
             ORDER BY ordinal",
        )
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?;
    statement
        .query_map(params![event_id, project_ref], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AuditEventStoreErrorV1::PersistenceFailed)
}

fn decode_audit_event_record(
    connection: &Connection,
    row: &StoredAuditEventRow,
) -> Result<AuditEventStoreRecordV1, AuditEventStoreErrorV1> {
    let event_type = match row.event_type.as_str() {
        "policy.decision_recorded" => AuditEventV1Type::PolicyDecisionRecorded,
        "approval.request_recorded" => AuditEventV1Type::ApprovalRequestRecorded,
        "approval.decision_recorded" => AuditEventV1Type::ApprovalDecisionRecorded,
        _ => return Err(AuditEventStoreErrorV1::EvidenceDrift),
    };
    let event = rederive_audit_event_from_refs(
        connection,
        AuditSourceRefs {
            event_type,
            project_ref: &row.project_ref,
            packet_id: &row.packet_id,
            policy_decision_id: &row.policy_decision_id,
            approval_request_id: row.approval_request_id.as_deref(),
            approval_decision_id: row.approval_decision_id.as_deref(),
            observed_at: &row.observed_at,
        },
        AuditEventStoreErrorV1::EvidenceDrift,
    )?;
    let reason_codes = select_audit_reason_codes(connection, &row.event_id, &row.project_ref)?;
    let authenticated_provenance = match row.authenticated_provenance {
        0 => false,
        1 => true,
        _ => return Err(AuditEventStoreErrorV1::EvidenceDrift),
    };
    let persistence_requested = match row.persistence_requested {
        0 => false,
        1 => true,
        _ => return Err(AuditEventStoreErrorV1::EvidenceDrift),
    };
    let execution_authorized = match row.execution_authorized {
        0 => false,
        1 => true,
        _ => return Err(AuditEventStoreErrorV1::EvidenceDrift),
    };

    if event.event_id != row.event_id
        || event.schema_id != row.schema_id
        || event.event_type.as_str() != row.event_type
        || event.result_status.as_str() != row.result_status
        || event.packet_ref.packet_id != row.packet_id
        || event.packet_ref.packet_hash != row.packet_sha256
        || event.policy_ref.decision_id != row.policy_decision_id
        || event
            .approval_request_ref
            .as_ref()
            .map(|value| value.approval_request_id.as_str())
            != row.approval_request_id.as_deref()
        || event
            .approval_decision_ref
            .as_ref()
            .map(|value| value.approval_decision_id.as_str())
            != row.approval_decision_id.as_deref()
        || event.actor_ref != row.actor_ref
        || event.session_ref != row.session_ref
        || event.project_ref != row.project_ref
        || event.reason_codes != reason_codes
        || event.source_evidence_hash != row.source_evidence_hash
        || event.idempotency_key != row.idempotency_key
        || event.event_at != row.event_at
        || event.observed_at != row.observed_at
        || event.retention_class != row.retention_class
        || event.redaction.raw_rejected_command != row.raw_rejected_command
        || event.redaction.raw_rejected_value != row.raw_rejected_value
        || event.redaction.raw_invalid_payload_content != row.raw_invalid_payload_content
        || event.redaction.secret_like_values != row.secret_like_values
        || event.authenticated_provenance != authenticated_provenance
        || event.persistence_requested != persistence_requested
        || event.execution_authorized != execution_authorized
    {
        return Err(AuditEventStoreErrorV1::EvidenceDrift);
    }

    Ok(AuditEventStoreRecordV1 { event })
}

fn validate_recovery_inspection_event_input_v1(
    input: &SqliteRecoveryInspectionEventInputV1,
) -> Result<(), SqliteRecoveryInspectionEventErrorV1> {
    if !is_valid_reference_v1(&input.deployment_ref)
        || !is_valid_reference_v1(&input.target_ref)
        || !is_valid_reference_v1(&input.idempotency_key)
        || !is_canonical_utc_timestamp_v1(&input.observed_at)
        || input.target_database_path.as_os_str().is_empty()
    {
        return Err(SqliteRecoveryInspectionEventErrorV1::InvalidInput);
    }
    Ok(())
}

fn derive_recovery_inspection_event_v1(
    input: &SqliteRecoveryInspectionEventInputV1,
    inspection: &SqliteRecoveryInspectionV1,
) -> SqliteRecoveryInspectionEventV1 {
    let mut event = SqliteRecoveryInspectionEventV1 {
        event_id: String::new(),
        schema_id: RECOVERY_INSPECTION_EVENT_SCHEMA_V1.to_owned(),
        deployment_ref: input.deployment_ref.clone(),
        target_ref: input.target_ref.clone(),
        target_path_sha256: fingerprint_recovery_path_v1(&inspection.database_path),
        idempotency_key: input.idempotency_key.clone(),
        observed_at: input.observed_at.clone(),
        disposition: inspection.disposition,
        observed_schema_version: inspection.schema_version,
        observed_migration_count: inspection.migration_count,
        integrity_ok: inspection.integrity_ok,
        quarantine_recommended: inspection.quarantine_recommended(),
        inspection_mode: SqliteRecoveryInspectionModeV1::ReadOnly,
        automatic_action: SqliteRecoveryAutomaticActionV1::None,
        activation_authorized: false,
    };
    event.event_id = recovery_inspection_event_id_v1(&event);
    event
}

fn recovery_inspection_event_id_v1(event: &SqliteRecoveryInspectionEventV1) -> String {
    let schema_version = event
        .observed_schema_version
        .map_or_else(|| "none".to_owned(), |value| format!("some:{value}"));
    let migration_count = event
        .observed_migration_count
        .map_or_else(|| "none".to_owned(), |value| format!("some:{value}"));
    let mut digest = Sha256::new();
    for field in [
        "lnsat.sqlite_recovery_inspection_event.content.v1",
        event.schema_id.as_str(),
        event.deployment_ref.as_str(),
        event.target_ref.as_str(),
        event.target_path_sha256.as_str(),
        event.observed_at.as_str(),
        event.disposition.as_str(),
        schema_version.as_str(),
        migration_count.as_str(),
        if event.integrity_ok { "true" } else { "false" },
        if event.quarantine_recommended {
            "true"
        } else {
            "false"
        },
        "read_only",
        "none",
        "false",
    ] {
        update_sha256_field(&mut digest, field.as_bytes());
    }
    encode_sha256(digest.finalize())
}

fn fingerprint_recovery_path_v1(path: &Path) -> String {
    let mut digest = Sha256::new();
    update_sha256_field(&mut digest, b"lnsat.sqlite_recovery_path.os_local.v1");
    #[cfg(unix)]
    update_sha256_field(&mut digest, path.as_os_str().as_bytes());
    #[cfg(windows)]
    {
        let mut encoded = Vec::new();
        for unit in path.as_os_str().encode_wide() {
            encoded.extend_from_slice(&unit.to_le_bytes());
        }
        update_sha256_field(&mut digest, &encoded);
    }
    encode_sha256(digest.finalize())
}

fn update_sha256_field(digest: &mut Sha256, value: &[u8]) {
    let length = u64::try_from(value.len()).expect("bounded field length must fit u64");
    digest.update(length.to_be_bytes());
    digest.update(value);
}

fn encode_sha256(bytes: impl IntoIterator<Item = u8>) -> String {
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in bytes {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

fn is_sha256_identity(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value[7..]
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

fn recovery_disposition_from_str(value: &str) -> Option<SqliteRecoveryDispositionV1> {
    match value {
        "ready" => Some(SqliteRecoveryDispositionV1::Ready),
        "bootstrap_candidate" => Some(SqliteRecoveryDispositionV1::BootstrapCandidate),
        "migration_pending" => Some(SqliteRecoveryDispositionV1::MigrationPending),
        "legacy_phase7_evidence" => Some(SqliteRecoveryDispositionV1::LegacyPhase7Evidence),
        "unsupported_schema_version" => Some(SqliteRecoveryDispositionV1::UnsupportedSchemaVersion),
        "unrecognized_database" => Some(SqliteRecoveryDispositionV1::UnrecognizedDatabase),
        "migration_drift" => Some(SqliteRecoveryDispositionV1::MigrationDrift),
        "integrity_failure" => Some(SqliteRecoveryDispositionV1::IntegrityFailure),
        "unreadable" => Some(SqliteRecoveryDispositionV1::Unreadable),
        _ => None,
    }
}

#[derive(Debug)]
struct StoredRecoveryInspectionEventRow {
    event_id: String,
    schema_id: String,
    deployment_ref: String,
    target_ref: String,
    target_path_sha256: String,
    idempotency_key: String,
    observed_at: String,
    disposition: String,
    observed_schema_version: Option<i64>,
    observed_migration_count: Option<i64>,
    integrity_ok: i64,
    quarantine_recommended: i64,
    inspection_mode: String,
    automatic_action: String,
    activation_authorized: i64,
}

fn map_stored_recovery_inspection_event(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<StoredRecoveryInspectionEventRow> {
    Ok(StoredRecoveryInspectionEventRow {
        event_id: row.get(0)?,
        schema_id: row.get(1)?,
        deployment_ref: row.get(2)?,
        target_ref: row.get(3)?,
        target_path_sha256: row.get(4)?,
        idempotency_key: row.get(5)?,
        observed_at: row.get(6)?,
        disposition: row.get(7)?,
        observed_schema_version: row.get(8)?,
        observed_migration_count: row.get(9)?,
        integrity_ok: row.get(10)?,
        quarantine_recommended: row.get(11)?,
        inspection_mode: row.get(12)?,
        automatic_action: row.get(13)?,
        activation_authorized: row.get(14)?,
    })
}

const RECOVERY_INSPECTION_EVENT_SELECT: &str =
    "SELECT event_id, schema_id, deployment_ref, target_ref,
            target_path_sha256, idempotency_key, observed_at, disposition,
            observed_schema_version, observed_migration_count, integrity_ok,
            quarantine_recommended, inspection_mode, automatic_action,
            activation_authorized
     FROM lnsat_recovery_inspection_events";

fn select_recovery_inspection_event_by_idempotency(
    connection: &Connection,
    deployment_ref: &str,
    idempotency_key: &str,
) -> Result<Option<StoredRecoveryInspectionEventRow>, SqliteRecoveryInspectionEventErrorV1> {
    connection
        .query_row(
            &format!(
                "{RECOVERY_INSPECTION_EVENT_SELECT}
                 WHERE deployment_ref = ?1 AND idempotency_key = ?2"
            ),
            params![deployment_ref, idempotency_key],
            map_stored_recovery_inspection_event,
        )
        .optional()
        .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)
}

fn select_recovery_inspection_event_by_id(
    connection: &Connection,
    event_id: &str,
) -> Result<Option<StoredRecoveryInspectionEventRow>, SqliteRecoveryInspectionEventErrorV1> {
    connection
        .query_row(
            &format!("{RECOVERY_INSPECTION_EVENT_SELECT} WHERE event_id = ?1"),
            [event_id],
            map_stored_recovery_inspection_event,
        )
        .optional()
        .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)
}

fn select_recovery_inspection_event_by_scope(
    connection: &Connection,
    deployment_ref: &str,
    target_ref: &str,
    event_id: &str,
) -> Result<Option<StoredRecoveryInspectionEventRow>, SqliteRecoveryInspectionEventErrorV1> {
    connection
        .query_row(
            &format!(
                "{RECOVERY_INSPECTION_EVENT_SELECT}
                 WHERE deployment_ref = ?1 AND target_ref = ?2 AND event_id = ?3"
            ),
            params![deployment_ref, target_ref, event_id],
            map_stored_recovery_inspection_event,
        )
        .optional()
        .map_err(|_| SqliteRecoveryInspectionEventErrorV1::PersistenceFailed)
}

fn decode_recovery_inspection_event_v1(
    row: &StoredRecoveryInspectionEventRow,
) -> Result<SqliteRecoveryInspectionEventRecordV1, SqliteRecoveryInspectionEventErrorV1> {
    let disposition = recovery_disposition_from_str(&row.disposition)
        .ok_or(SqliteRecoveryInspectionEventErrorV1::EvidenceDrift)?;
    let integrity_ok = match row.integrity_ok {
        0 => false,
        1 => true,
        _ => return Err(SqliteRecoveryInspectionEventErrorV1::EvidenceDrift),
    };
    let quarantine_recommended = match row.quarantine_recommended {
        0 => false,
        1 => true,
        _ => return Err(SqliteRecoveryInspectionEventErrorV1::EvidenceDrift),
    };
    if row.schema_id != RECOVERY_INSPECTION_EVENT_SCHEMA_V1
        || !is_valid_reference_v1(&row.deployment_ref)
        || !is_valid_reference_v1(&row.target_ref)
        || !is_valid_reference_v1(&row.idempotency_key)
        || !is_canonical_utc_timestamp_v1(&row.observed_at)
        || !is_sha256_identity(&row.event_id)
        || !is_sha256_identity(&row.target_path_sha256)
        || row.observed_schema_version.is_some_and(|value| value < 0)
        || row.observed_migration_count.is_some_and(|value| value < 0)
        || row.inspection_mode != "read_only"
        || row.automatic_action != "none"
        || row.activation_authorized != 0
    {
        return Err(SqliteRecoveryInspectionEventErrorV1::EvidenceDrift);
    }
    let event = SqliteRecoveryInspectionEventV1 {
        event_id: row.event_id.clone(),
        schema_id: row.schema_id.clone(),
        deployment_ref: row.deployment_ref.clone(),
        target_ref: row.target_ref.clone(),
        target_path_sha256: row.target_path_sha256.clone(),
        idempotency_key: row.idempotency_key.clone(),
        observed_at: row.observed_at.clone(),
        disposition,
        observed_schema_version: row.observed_schema_version,
        observed_migration_count: row.observed_migration_count,
        integrity_ok,
        quarantine_recommended,
        inspection_mode: SqliteRecoveryInspectionModeV1::ReadOnly,
        automatic_action: SqliteRecoveryAutomaticActionV1::None,
        activation_authorized: false,
    };
    if event.quarantine_recommended
        != matches!(
            event.disposition,
            SqliteRecoveryDispositionV1::UnrecognizedDatabase
                | SqliteRecoveryDispositionV1::MigrationDrift
                | SqliteRecoveryDispositionV1::IntegrityFailure
                | SqliteRecoveryDispositionV1::Unreadable
        )
        || recovery_inspection_event_id_v1(&event) != event.event_id
    {
        return Err(SqliteRecoveryInspectionEventErrorV1::EvidenceDrift);
    }
    Ok(SqliteRecoveryInspectionEventRecordV1 { event })
}

fn unreadable_recovery_inspection(
    database_path: PathBuf,
    schema_version: Option<i64>,
) -> SqliteRecoveryInspectionV1 {
    SqliteRecoveryInspectionV1::classified(
        database_path,
        SqliteRecoveryDispositionV1::Unreadable,
        schema_version,
        None,
        false,
    )
}

fn classify_recovery_connection(
    database_path: PathBuf,
    connection: &Connection,
) -> SqliteRecoveryInspectionV1 {
    let Ok(schema_version) = pragma_i64(connection, "user_version") else {
        return unreadable_recovery_inspection(database_path, None);
    };
    if schema_version < 0 {
        return unreadable_recovery_inspection(database_path, None);
    }
    if schema_version > SQLITE_SCHEMA_VERSION {
        return SqliteRecoveryInspectionV1::classified(
            database_path,
            SqliteRecoveryDispositionV1::UnsupportedSchemaVersion,
            Some(schema_version),
            None,
            false,
        );
    }
    if schema_version == 0 {
        return classify_version_zero_recovery(database_path, connection);
    }
    classify_versioned_recovery(database_path, connection, schema_version)
}

fn classify_version_zero_recovery(
    database_path: PathBuf,
    connection: &Connection,
) -> SqliteRecoveryInspectionV1 {
    let Ok(table_count) = user_table_count(connection) else {
        return unreadable_recovery_inspection(database_path, Some(0));
    };
    if verify_connection_integrity(connection).is_err() {
        return SqliteRecoveryInspectionV1::classified(
            database_path,
            SqliteRecoveryDispositionV1::IntegrityFailure,
            Some(0),
            Some(0),
            false,
        );
    }
    let disposition = if table_count == 0 {
        SqliteRecoveryDispositionV1::BootstrapCandidate
    } else {
        SqliteRecoveryDispositionV1::UnrecognizedDatabase
    };
    SqliteRecoveryInspectionV1::classified(database_path, disposition, Some(0), Some(0), true)
}

fn classify_versioned_recovery(
    database_path: PathBuf,
    connection: &Connection,
    schema_version: i64,
) -> SqliteRecoveryInspectionV1 {
    let migration_count = connection
        .query_row("SELECT count(*) FROM lnsat_schema_migrations", [], |row| {
            row.get::<_, i64>(0)
        })
        .ok();
    if verify_schema_at_version(connection, schema_version).is_err() {
        return SqliteRecoveryInspectionV1::classified(
            database_path,
            SqliteRecoveryDispositionV1::MigrationDrift,
            Some(schema_version),
            migration_count,
            false,
        );
    }
    if verify_connection_integrity(connection).is_err() {
        return SqliteRecoveryInspectionV1::classified(
            database_path,
            SqliteRecoveryDispositionV1::IntegrityFailure,
            Some(schema_version),
            migration_count,
            false,
        );
    }
    let legacy_phase7_evidence = if schema_version == 16 {
        match phase7_persistence::has_legacy_phase7_evidence_v16(connection) {
            Ok(present) => present,
            Err(_) => {
                return SqliteRecoveryInspectionV1::classified(
                    database_path,
                    SqliteRecoveryDispositionV1::MigrationDrift,
                    Some(schema_version),
                    migration_count,
                    false,
                );
            }
        }
    } else {
        false
    };
    let disposition = if legacy_phase7_evidence {
        SqliteRecoveryDispositionV1::LegacyPhase7Evidence
    } else if schema_version == SQLITE_SCHEMA_VERSION {
        SqliteRecoveryDispositionV1::Ready
    } else {
        SqliteRecoveryDispositionV1::MigrationPending
    };
    SqliteRecoveryInspectionV1::classified(
        database_path,
        disposition,
        Some(schema_version),
        migration_count,
        true,
    )
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct RecoverySnapshotEvidence {
    schema_version: i64,
    migration_count: i64,
}

struct TemporaryRecoveryFile {
    path: PathBuf,
    failure: SqliteRecoveryErrorV1,
}

impl TemporaryRecoveryFile {
    fn create(
        published_path: &Path,
        purpose: &str,
        failure: SqliteRecoveryErrorV1,
    ) -> Result<Self, SqliteRecoveryErrorV1> {
        let parent = published_path
            .parent()
            .ok_or(SqliteRecoveryErrorV1::PathInvalid)?;
        for _ in 0..64 {
            let sequence = NEXT_TEMPORARY_FILE.fetch_add(1, Ordering::Relaxed);
            let path = parent.join(format!(
                ".lnsat-{purpose}-{}-{sequence}.tmp",
                std::process::id()
            ));
            let mut options = OpenOptions::new();
            options.read(true).write(true).create_new(true);
            #[cfg(unix)]
            options.mode(0o600);
            match options.open(&path) {
                Ok(file) => {
                    file.sync_all().map_err(|_| failure)?;
                    return Ok(Self { path, failure });
                }
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
                Err(_) => return Err(failure),
            }
        }
        Err(failure)
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn publish(mut self, published_path: &Path) -> Result<(), SqliteRecoveryErrorV1> {
        match fs::hard_link(&self.path, published_path) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                return Err(SqliteRecoveryErrorV1::DestinationExists);
            }
            Err(_) => return Err(self.failure),
        }
        fs::remove_file(&self.path).map_err(|_| self.failure)?;
        self.path.clear();
        sync_parent_directory(published_path).map_err(|_| self.failure)
    }
}

impl Drop for TemporaryRecoveryFile {
    fn drop(&mut self) {
        if self.path.as_os_str().is_empty() {
            return;
        }
        let _ = fs::remove_file(&self.path);
        for suffix in ["-shm", "-wal"] {
            let sidecar = PathBuf::from(format!("{}{suffix}", self.path.display()));
            let _ = fs::remove_file(sidecar);
        }
    }
}

fn canonical_existing_file(path: &Path) -> Result<PathBuf, SqliteRecoveryErrorV1> {
    validate_recovery_path(path)?;
    let metadata = symlink_metadata(path).map_err(|_| SqliteRecoveryErrorV1::PathInvalid)?;
    if metadata.file_type().is_symlink() {
        return Err(SqliteRecoveryErrorV1::SymlinkForbidden);
    }
    if !metadata.is_file() {
        return Err(SqliteRecoveryErrorV1::PathInvalid);
    }
    path.canonicalize()
        .map_err(|_| SqliteRecoveryErrorV1::PathInvalid)
}

fn normalize_destination_path(path: &Path) -> Result<PathBuf, SqliteRecoveryErrorV1> {
    validate_recovery_path(path)?;
    let file_name = path.file_name().ok_or(SqliteRecoveryErrorV1::PathInvalid)?;
    let parent = path
        .parent()
        .filter(|value| !value.as_os_str().is_empty())
        .map_or_else(|| PathBuf::from("."), Path::to_path_buf);
    let canonical_parent = parent
        .canonicalize()
        .map_err(|_| SqliteRecoveryErrorV1::PathInvalid)?;
    if !canonical_parent.is_dir() {
        return Err(SqliteRecoveryErrorV1::PathInvalid);
    }
    Ok(canonical_parent.join(file_name))
}

fn ensure_fresh_destination(path: &Path) -> Result<(), SqliteRecoveryErrorV1> {
    match symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(SqliteRecoveryErrorV1::SymlinkForbidden)
        }
        Ok(metadata) if !metadata.is_file() => Err(SqliteRecoveryErrorV1::PathInvalid),
        Ok(_) => Err(SqliteRecoveryErrorV1::DestinationExists),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err(SqliteRecoveryErrorV1::PathInvalid),
    }
}

fn validate_recovery_path(path: &Path) -> Result<(), SqliteRecoveryErrorV1> {
    if path.as_os_str().is_empty() {
        return Err(SqliteRecoveryErrorV1::PathRequired);
    }
    if path == Path::new(":memory:") {
        return Err(SqliteRecoveryErrorV1::InMemoryPathForbidden);
    }
    Ok(())
}

fn run_bounded_online_backup(
    source: &Connection,
    destination: &mut Connection,
) -> Result<(), SqliteRecoveryErrorV1> {
    let backup =
        Backup::new(source, destination).map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?;
    let mut busy_retries = 0_u32;
    loop {
        match backup
            .step(SQLITE_BACKUP_PAGES_PER_STEP)
            .map_err(|_| SqliteRecoveryErrorV1::BackupFailed)?
        {
            StepResult::Done => return Ok(()),
            StepResult::More => busy_retries = 0,
            StepResult::Busy | StepResult::Locked => {
                busy_retries = busy_retries.saturating_add(1);
                if busy_retries > SQLITE_BACKUP_BUSY_RETRY_LIMIT {
                    return Err(SqliteRecoveryErrorV1::BackupFailed);
                }
                std::thread::sleep(SQLITE_BACKUP_RETRY_PAUSE);
            }
            _ => return Err(SqliteRecoveryErrorV1::BackupFailed),
        }
    }
}

fn verify_recovery_snapshot(
    path: &Path,
    failure: SqliteRecoveryErrorV1,
) -> Result<RecoverySnapshotEvidence, SqliteRecoveryErrorV1> {
    let connection = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|_| failure)?;
    configure_recovery_reader(&connection).map_err(|_| failure)?;
    let schema_version = pragma_i64(&connection, "user_version").map_err(|_| failure)?;
    if schema_version != SQLITE_SCHEMA_VERSION {
        return Err(failure);
    }
    verify_schema_at_version(&connection, schema_version).map_err(|_| failure)?;
    verify_connection_integrity(&connection).map_err(|_| failure)?;
    let migration_count = connection
        .query_row("SELECT count(*) FROM lnsat_schema_migrations", [], |row| {
            row.get::<_, i64>(0)
        })
        .map_err(|_| failure)?;
    if migration_count != i64::try_from(MIGRATIONS.len()).map_err(|_| failure)? {
        return Err(failure);
    }
    Ok(RecoverySnapshotEvidence {
        schema_version,
        migration_count,
    })
}

fn configure_recovery_reader(connection: &Connection) -> Result<(), SqliteStoreError> {
    connection
        .busy_timeout(SQLITE_BUSY_TIMEOUT)
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "query_only", "ON")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "trusted_schema", "OFF")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let defensive = connection
        .set_db_config(SQLITE_DBCONFIG_DEFENSIVE, true)
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    for disabled_config in [
        SQLITE_DBCONFIG_DQS_DDL,
        SQLITE_DBCONFIG_DQS_DML,
        SQLITE_DBCONFIG_TRUSTED_SCHEMA,
    ] {
        if connection
            .set_db_config(disabled_config, false)
            .map_err(|_| SqliteStoreError::ConfigurationFailed)?
        {
            return Err(SqliteStoreError::ConfigurationFailed);
        }
    }
    let query_only =
        pragma_i64(connection, "query_only").map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let foreign_keys = pragma_i64(connection, "foreign_keys")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let trusted_schema = pragma_i64(connection, "trusted_schema")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    if query_only != 1 || foreign_keys != 1 || trusted_schema != 0 || !defensive {
        return Err(SqliteStoreError::ConfigurationFailed);
    }
    Ok(())
}

fn verify_connection_integrity(connection: &Connection) -> Result<(), SqliteStoreError> {
    let result = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map_err(|_| SqliteStoreError::IntegrityCheckFailed)?;
    if result != "ok" {
        return Err(SqliteStoreError::IntegrityCheckFailed);
    }
    let foreign_key_failures = connection
        .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get::<_, i64>(0)
        })
        .map_err(|_| SqliteStoreError::IntegrityCheckFailed)?;
    if foreign_key_failures != 0 {
        return Err(SqliteStoreError::IntegrityCheckFailed);
    }
    Ok(())
}

fn copy_snapshot(source: &Path, destination: &Path) -> Result<(), SqliteRecoveryErrorV1> {
    let source_file = File::open(source).map_err(|_| SqliteRecoveryErrorV1::SourceInvalid)?;
    let mut source_reader = BufReader::with_capacity(FILE_DIGEST_BUFFER_BYTES, source_file);
    let mut destination_file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(destination)
        .map_err(|_| SqliteRecoveryErrorV1::RestoreFailed)?;
    io::copy(&mut source_reader, &mut destination_file)
        .map_err(|_| SqliteRecoveryErrorV1::RestoreFailed)?;
    destination_file
        .sync_all()
        .map_err(|_| SqliteRecoveryErrorV1::RestoreFailed)?;
    #[cfg(unix)]
    fs::set_permissions(destination, fs::Permissions::from_mode(0o600))
        .map_err(|_| SqliteRecoveryErrorV1::RestoreFailed)?;
    Ok(())
}

fn sync_regular_file(path: &Path) -> io::Result<()> {
    File::open(path)?.sync_all()
}

fn sync_parent_directory(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        let parent = path.parent().ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "path has no parent directory")
        })?;
        File::open(parent)?.sync_all()?;
    }
    Ok(())
}

fn sha256_file(path: &Path) -> io::Result<String> {
    let file = File::open(path)?;
    let mut reader = BufReader::with_capacity(FILE_DIGEST_BUFFER_BYTES, file);
    let mut digest = Sha256::new();
    let mut buffer = vec![0_u8; FILE_DIGEST_BUFFER_BYTES].into_boxed_slice();
    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest.finalize() {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    Ok(encoded)
}

fn file_size(path: &Path, failure: SqliteRecoveryErrorV1) -> Result<u64, SqliteRecoveryErrorV1> {
    fs::metadata(path)
        .map(|metadata| metadata.len())
        .map_err(|_| failure)
}

fn acquire_exclusive_database_file_v1(
    path: &Path,
    create_if_missing: bool,
) -> Result<(File, PathBuf), LocalOwnerRecoveryErrorV1> {
    if path.as_os_str().is_empty() || path == Path::new(":memory:") {
        return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
    }
    if create_if_missing {
        prepare_database_file(path).map_err(|_| LocalOwnerRecoveryErrorV1::InvalidInput)?;
    }
    let metadata = symlink_metadata(path).map_err(|_| LocalOwnerRecoveryErrorV1::InvalidInput)?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
    }
    #[cfg(unix)]
    if metadata.permissions().mode() & 0o077 != 0 || metadata.nlink() != 1 {
        return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
    }
    let canonical_database_path = path
        .canonicalize()
        .map_err(|_| LocalOwnerRecoveryErrorV1::InvalidInput)?;
    let database_name = canonical_database_path
        .file_name()
        .ok_or(LocalOwnerRecoveryErrorV1::InvalidInput)?;
    let mut lease_name = database_name.to_os_string();
    lease_name.push(".lnsat.lock");
    let lease_path = canonical_database_path
        .parent()
        .ok_or(LocalOwnerRecoveryErrorV1::InvalidInput)?
        .join(lease_name);
    match symlink_metadata(&lease_path) {
        Ok(lease_metadata) => {
            if lease_metadata.file_type().is_symlink() || !lease_metadata.is_file() {
                return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
            }
            #[cfg(unix)]
            if lease_metadata.permissions().mode() & 0o077 != 0 || lease_metadata.nlink() != 1 {
                return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
            }
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            let mut options = OpenOptions::new();
            options.read(true).write(true).create_new(true);
            #[cfg(unix)]
            options.mode(0o600);
            options
                .open(&lease_path)
                .map_err(|_| LocalOwnerRecoveryErrorV1::PersistenceFailed)?;
        }
        Err(_) => return Err(LocalOwnerRecoveryErrorV1::InvalidInput),
    }
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(&lease_path)
        .map_err(|_| LocalOwnerRecoveryErrorV1::InvalidInput)?;
    let opened_metadata = file
        .metadata()
        .map_err(|_| LocalOwnerRecoveryErrorV1::InvalidInput)?;
    let current_metadata =
        symlink_metadata(&lease_path).map_err(|_| LocalOwnerRecoveryErrorV1::InvalidInput)?;
    if current_metadata.file_type().is_symlink() || !current_metadata.is_file() {
        return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
    }
    #[cfg(unix)]
    if opened_metadata.dev() != current_metadata.dev()
        || opened_metadata.ino() != current_metadata.ino()
        || opened_metadata.nlink() != 1
        || opened_metadata.permissions().mode() & 0o077 != 0
    {
        return Err(LocalOwnerRecoveryErrorV1::InvalidInput);
    }
    file.try_lock().map_err(|error| match error {
        TryLockError::WouldBlock => LocalOwnerRecoveryErrorV1::DatabaseBusy,
        TryLockError::Error(_) => LocalOwnerRecoveryErrorV1::PersistenceFailed,
    })?;
    Ok((file, canonical_database_path))
}

fn prepare_database_file(path: &Path) -> Result<(), SqliteStoreError> {
    if path.as_os_str().is_empty() {
        return Err(SqliteStoreError::PathRequired);
    }
    if path == Path::new(":memory:") {
        return Err(SqliteStoreError::InMemoryPathForbidden);
    }

    match symlink_metadata(path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                return Err(SqliteStoreError::SymlinkForbidden);
            }
            if !metadata.is_file() {
                return Err(SqliteStoreError::PathNotFile);
            }
            Ok(())
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => create_database_file(path),
        Err(_) => Err(SqliteStoreError::OpenFailed),
    }
}

fn create_database_file(path: &Path) -> Result<(), SqliteStoreError> {
    let parent = path.parent().filter(|value| !value.as_os_str().is_empty());
    if parent.is_some_and(|value| !value.is_dir()) {
        return Err(SqliteStoreError::OpenFailed);
    }

    let mut options = OpenOptions::new();
    options.read(true).write(true).create_new(true);
    #[cfg(unix)]
    options.mode(0o600);
    options
        .open(path)
        .map(|_| ())
        .map_err(|_| SqliteStoreError::OpenFailed)
}

fn configure_connection(connection: &Connection) -> Result<(), SqliteStoreError> {
    connection
        .busy_timeout(SQLITE_BUSY_TIMEOUT)
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "recursive_triggers", "ON")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let journal_mode = connection
        .query_row("PRAGMA journal_mode = WAL", [], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "synchronous", "FULL")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    connection
        .pragma_update(None, "trusted_schema", "OFF")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let defensive = connection
        .set_db_config(SQLITE_DBCONFIG_DEFENSIVE, true)
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    for disabled_config in [
        SQLITE_DBCONFIG_DQS_DDL,
        SQLITE_DBCONFIG_DQS_DML,
        SQLITE_DBCONFIG_TRUSTED_SCHEMA,
    ] {
        let remained_enabled = connection
            .set_db_config(disabled_config, false)
            .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
        if remained_enabled {
            return Err(SqliteStoreError::ConfigurationFailed);
        }
    }

    let foreign_keys = pragma_i64(connection, "foreign_keys")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let recursive_triggers = pragma_i64(connection, "recursive_triggers")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let synchronous =
        pragma_i64(connection, "synchronous").map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    let trusted_schema = pragma_i64(connection, "trusted_schema")
        .map_err(|_| SqliteStoreError::ConfigurationFailed)?;
    if !journal_mode.eq_ignore_ascii_case("wal")
        || foreign_keys != 1
        || recursive_triggers != 1
        || synchronous != 2
        || trusted_schema != 0
        || !defensive
    {
        return Err(SqliteStoreError::ConfigurationFailed);
    }
    Ok(())
}

fn preflight_schema(connection: &Connection) -> Result<(), SqliteStoreError> {
    let version =
        pragma_i64(connection, "user_version").map_err(|_| SqliteStoreError::OpenFailed)?;
    if version > SQLITE_SCHEMA_VERSION {
        return Err(SqliteStoreError::UnsupportedSchemaVersion);
    }
    if version < 0 {
        return Err(SqliteStoreError::MigrationDrift);
    }
    if version == 0 && user_table_count(connection)? != 0 {
        return Err(SqliteStoreError::UnrecognizedDatabase);
    }
    Ok(())
}

fn user_table_count(connection: &Connection) -> Result<i64, SqliteStoreError> {
    connection
        .query_row(
            "SELECT count(*) FROM sqlite_schema
             WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| SqliteStoreError::MigrationFailed)
}

fn user_table_names(connection: &Connection) -> Result<Vec<String>, SqliteStoreError> {
    let mut statement = connection
        .prepare(
            "SELECT name FROM sqlite_schema
             WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
             ORDER BY name",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let names = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    Ok(names)
}

#[derive(Debug)]
struct StoredTriggerDefinition {
    name: String,
    table_name: String,
    sql: String,
}

fn verify_trigger_definitions(
    connection: &Connection,
    required_names: &[&str],
) -> Result<(), SqliteStoreError> {
    let mut statement = connection
        .prepare(
            "SELECT name, tbl_name, sql FROM sqlite_schema
             WHERE type = 'trigger' AND name NOT LIKE 'sqlite_%'
             ORDER BY name",
        )
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    let definitions = statement
        .query_map([], |row| {
            Ok(StoredTriggerDefinition {
                name: row.get(0)?,
                table_name: row.get(1)?,
                sql: row.get(2)?,
            })
        })
        .map_err(|_| SqliteStoreError::MigrationDrift)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SqliteStoreError::MigrationDrift)?;
    if definitions.len() != required_names.len() {
        return Err(SqliteStoreError::MigrationDrift);
    }
    for (definition, required_name) in definitions.iter().zip(required_names) {
        if *required_name == EXECUTION_AUTHORIZATION_BINDING_TRIGGER_V17 {
            let expected_sql = normalize_sql(
                "CREATE TRIGGER lnsat_execution_authorizations_enforce_attempt_binding
                 BEFORE INSERT ON lnsat_execution_authorizations
                 BEGIN
                   SELECT RAISE(ABORT, 'execution authorization approval already bound')
                   WHERE EXISTS (
                     SELECT 1
                     FROM lnsat_execution_authorizations AS existing
                     WHERE existing.approval_decision_id = NEW.approval_decision_id
                   );

                   SELECT RAISE(ABORT, 'execution authorization binding mismatch')
                   WHERE NOT EXISTS (
                     SELECT 1
                     FROM lnsat_authorization_attempts AS attempt
                     JOIN lnsat_authorization_nonces AS nonce
                       ON nonce.nonce_id = NEW.nonce_id
                       AND nonce.authorization_attempt_id = attempt.authorization_attempt_id
                       AND nonce.project_ref = attempt.project_ref
                       AND nonce.resource_ref = attempt.resource_ref
                       AND nonce.binding_digest = attempt.binding_digest
                     WHERE attempt.authorization_attempt_id = NEW.authorization_attempt_id
                       AND attempt.project_ref = NEW.project_ref
                       AND attempt.resource_ref = NEW.resource_ref
                       AND attempt.binding_digest = NEW.binding_digest
                       AND attempt.approval_decision_id = NEW.approval_decision_id
                       AND attempt.policy_decision_id = NEW.policy_decision_id
                       AND attempt.packet_id = NEW.packet_id
                       AND attempt.packet_sha256 = NEW.packet_sha256
                       AND attempt.requester_ref = NEW.requester_ref
                       AND attempt.requester_session_ref = NEW.requester_session_ref
                       AND attempt.approver_ref = NEW.approver_ref
                       AND attempt.approver_session_ref = NEW.approver_session_ref
                       AND attempt.action_digest = NEW.action_digest
                       AND attempt.target_digest = NEW.target_digest
                       AND attempt.configuration_digest = NEW.configuration_digest
                       AND attempt.adapter_ref = NEW.adapter_ref
                       AND attempt.executable_digest = NEW.executable_digest
                       AND attempt.audience = NEW.audience
                   );
                 END",
            );
            if definition.name != *required_name
                || definition.table_name != "lnsat_execution_authorizations"
                || normalize_sql(&definition.sql) != expected_sql
            {
                return Err(SqliteStoreError::MigrationDrift);
            }
            continue;
        }
        let (table_name, operation, message) = expected_trigger_parts(required_name)?;
        let expected_sql = format!(
            "CREATE TRIGGER {required_name} BEFORE {operation} ON {table_name} \
             BEGIN SELECT RAISE(ABORT, '{message}'); END"
        );
        if definition.name != *required_name
            || definition.table_name != table_name
            || normalize_sql(&definition.sql) != expected_sql
        {
            return Err(SqliteStoreError::MigrationDrift);
        }
    }
    Ok(())
}

fn expected_trigger_parts(
    trigger_name: &str,
) -> Result<(&str, &str, &'static str), SqliteStoreError> {
    let (table_name, operation) =
        if let Some(table_name) = trigger_name.strip_suffix("_reject_delete") {
            (table_name, "DELETE")
        } else if let Some(table_name) = trigger_name.strip_suffix("_reject_update") {
            (table_name, "UPDATE")
        } else {
            return Err(SqliteStoreError::MigrationDrift);
        };
    let message = match table_name {
        "lnsat_approval_decisions" => "approval decisions are immutable",
        "lnsat_approval_requests" => "approval requests are immutable",
        "lnsat_audit_event_reason_codes" => "audit event reason codes are immutable",
        "lnsat_audit_events" => "audit events are immutable",
        "lnsat_authorization_attempts" => "authorization attempts are immutable",
        "lnsat_authorization_nonces" => "authorization nonces are immutable",
        "lnsat_capability_consumptions" => "capability consumptions are immutable",
        "lnsat_execution_authorizations" => "execution authorizations are immutable",
        "lnsat_local_identities" => "local identities are immutable",
        "lnsat_local_identity_events" => "local identity events are immutable",
        "lnsat_local_identity_status_events" => "local identity status events are immutable",
        "lnsat_local_password_credentials" => "local password credentials are immutable",
        "lnsat_local_session_activity_events" => "local session activity events are immutable",
        "lnsat_local_session_events" => "local session events are immutable",
        "lnsat_local_session_revocations" => "local session revocations are immutable",
        "lnsat_local_session_rotations" => "local session rotations are immutable",
        "lnsat_local_sessions" => "local sessions are immutable",
        "lnsat_operation_attempts" => "operation attempts are immutable",
        "lnsat_operation_receipts" => "operation receipts are immutable",
        "lnsat_operation_reconciliations" => "operation reconciliations are immutable",
        "lnsat_operations" => "operations are immutable",
        "lnsat_packet_envelopes" => "packet envelopes are immutable",
        "lnsat_packet_resource_refs" => "packet resource references are immutable",
        "lnsat_phase7_audit_bindings" => "phase7 audit bindings are immutable",
        "lnsat_phase7_entities" => "phase7 entities are immutable",
        "lnsat_phase7_state_events" => "phase7 state events are immutable",
        "lnsat_policy_decisions" => "policy decisions are immutable",
        "lnsat_recovery_inspection_events" => "recovery inspection events are immutable",
        "lnsat_retention_policies" => "retention policies are immutable",
        _ => return Err(SqliteStoreError::MigrationDrift),
    };
    Ok((table_name, operation, message))
}

fn normalize_sql(sql: &str) -> String {
    sql.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn pragma_i64(connection: &Connection, name: &str) -> rusqlite::Result<i64> {
    connection.query_row(&format!("PRAGMA {name}"), [], |row| row.get(0))
}

fn migration_digest(sql: &str) -> String {
    let digest = Sha256::digest(sql.as_bytes());
    let mut encoded = String::with_capacity(71);
    encoded.push_str("sha256:");
    for byte in digest {
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;
    use std::fs;
    use std::sync::{
        Arc, Barrier,
        atomic::{AtomicU64, Ordering},
    };

    static NEXT_TEST_DATABASE: AtomicU64 = AtomicU64::new(1);
    const PACKET_FIXTURE: &str =
        include_str!("../../../fixtures/contracts/packet-envelope-v1_0.json");

    struct TestDatabase {
        path: PathBuf,
    }

    impl TestDatabase {
        fn new(name: &str) -> Self {
            let sequence = NEXT_TEST_DATABASE.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "lnsat-store-{}-{name}-{sequence}.sqlite3",
                std::process::id()
            ));
            Self { path }
        }
    }

    impl Drop for TestDatabase {
        fn drop(&mut self) {
            for suffix in ["", "-shm", "-wal", ".lnsat.lock"] {
                let target = PathBuf::from(format!("{}{suffix}", self.path.display()));
                let _ = fs::remove_file(target);
            }
        }
    }

    fn packet_fixture() -> PacketEnvelopeV1 {
        let fixture: Value =
            serde_json::from_str(PACKET_FIXTURE).expect("packet fixture must be JSON");
        let encoded =
            serde_json::to_vec(&fixture["vectors"][0]["packet"]).expect("packet must serialize");
        parse_packet_envelope_v1(&encoded).expect("packet fixture must parse")
    }

    fn create_version_one_database(path: &Path) {
        prepare_database_file(path).expect("version-one file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-one database must open");
        configure_connection(&connection).expect("version-one database must configure");
        apply_migration(&mut connection, MIGRATIONS[0]).expect("version-one migration must apply");
    }

    fn create_version_two_database(path: &Path) {
        prepare_database_file(path).expect("version-two file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-two database must open");
        configure_connection(&connection).expect("version-two database must configure");
        for migration in MIGRATIONS.iter().copied().take(2) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_three_database(path: &Path) {
        prepare_database_file(path).expect("version-three file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-three database must open");
        configure_connection(&connection).expect("version-three database must configure");
        for migration in MIGRATIONS.iter().copied().take(3) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_four_database(path: &Path) {
        prepare_database_file(path).expect("version-four file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-four database must open");
        configure_connection(&connection).expect("version-four database must configure");
        for migration in MIGRATIONS.iter().copied().take(4) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_five_database(path: &Path) {
        prepare_database_file(path).expect("version-five file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-five database must open");
        configure_connection(&connection).expect("version-five database must configure");
        for migration in MIGRATIONS.iter().copied().take(5) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_six_database(path: &Path) {
        prepare_database_file(path).expect("version-six file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-six database must open");
        configure_connection(&connection).expect("version-six database must configure");
        for migration in MIGRATIONS.iter().copied().take(6) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_seven_database(path: &Path) {
        prepare_database_file(path).expect("version-seven file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-seven database must open");
        configure_connection(&connection).expect("version-seven database must configure");
        for migration in MIGRATIONS.iter().copied().take(7) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_eight_database(path: &Path) {
        prepare_database_file(path).expect("version-eight file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-eight database must open");
        configure_connection(&connection).expect("version-eight database must configure");
        for migration in MIGRATIONS.iter().copied().take(8) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_nine_database(path: &Path) {
        prepare_database_file(path).expect("version-nine file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-nine database must open");
        configure_connection(&connection).expect("version-nine database must configure");
        for migration in MIGRATIONS.iter().copied().take(9) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_ten_database(path: &Path) {
        prepare_database_file(path).expect("version-ten file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-ten database must open");
        configure_connection(&connection).expect("version-ten database must configure");
        for migration in MIGRATIONS.iter().copied().take(10) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_eleven_database(path: &Path) {
        prepare_database_file(path).expect("version-eleven file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-eleven database must open");
        configure_connection(&connection).expect("version-eleven database must configure");
        for migration in MIGRATIONS.iter().copied().take(11) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_twelve_database(path: &Path) {
        prepare_database_file(path).expect("version-twelve file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-twelve database must open");
        configure_connection(&connection).expect("version-twelve database must configure");
        for migration in MIGRATIONS.iter().copied().take(12) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_fifteen_database(path: &Path) {
        prepare_database_file(path).expect("version-fifteen file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-fifteen database must open");
        configure_connection(&connection).expect("version-fifteen database must configure");
        for migration in MIGRATIONS.iter().copied().take(15) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_sixteen_database(path: &Path) {
        prepare_database_file(path).expect("version-sixteen file must create");
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-sixteen database must open");
        configure_connection(&connection).expect("version-sixteen database must configure");
        for migration in MIGRATIONS.iter().copied().take(16) {
            apply_migration(&mut connection, migration).expect("ordered migration must apply");
        }
    }

    fn create_version_ten_database_with_session(path: &Path) -> LocalSessionIssueResultV1 {
        create_version_ten_database(path);
        let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-ten database must open");
        configure_connection(&connection).expect("version-ten database must configure");
        let identity_ref = "identity:human:owner";
        let created_at = "2026-07-23T17:00:00Z";
        let issued_at = "2026-07-23T17:01:00Z";
        let expires_at = "2026-07-23T17:06:00Z";
        let verifier = create_local_password_verifier_v1("correct horse battery staple")
            .expect("credential verifier must create");
        connection
            .execute(
                "INSERT INTO lnsat_local_identities (
                    identity_ref, display_name, role, owner_singleton, status, created_at
                 ) VALUES (?1, 'Local Owner', 'owner', 1, 'active', ?2)",
                params![identity_ref, created_at],
            )
            .expect("version-ten identity must insert");
        connection
            .execute(
                "INSERT INTO lnsat_local_password_credentials (
                    credential_id, identity_ref, credential_version,
                    verifier_profile, password_verifier, created_at
                 ) VALUES (?1, ?2, 1, ?3, ?4, ?5)",
                params![
                    local_password_credential_id_v1(identity_ref, 1, &verifier, created_at),
                    identity_ref,
                    LOCAL_PASSWORD_PROFILE_V1,
                    verifier,
                    created_at,
                ],
            )
            .expect("version-ten credential must insert");
        let secrets =
            create_local_session_secrets_v1().expect("version-ten session secrets must create");
        connection
            .execute(
                "INSERT INTO lnsat_local_sessions (
                    session_id, identity_ref, session_version,
                    session_token_profile, session_token_digest,
                    csrf_token_profile, csrf_token_digest, session_evidence_digest,
                    issued_at, expires_at
                 ) VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    secrets.session_id,
                    identity_ref,
                    LOCAL_SESSION_TOKEN_PROFILE_V1,
                    secrets.session_token_digest,
                    LOCAL_SESSION_CSRF_PROFILE_V1,
                    secrets.csrf_token_digest,
                    local_session_evidence_digest_v1(
                        &secrets.session_id,
                        identity_ref,
                        &secrets.session_token_digest,
                        &secrets.csrf_token_digest,
                        issued_at,
                        expires_at,
                    ),
                    issued_at,
                    expires_at,
                ],
            )
            .expect("version-ten session must insert");
        LocalSessionIssueResultV1 {
            session: LocalSessionRecordV1 {
                session_id: secrets.session_id,
                identity_ref: identity_ref.to_owned(),
                role: LocalIdentityRoleV1::Owner,
                issued_at: issued_at.to_owned(),
                expires_at: expires_at.to_owned(),
            },
            raw_session_token: secrets.raw_session_token,
            raw_csrf_token: secrets.raw_csrf_token,
        }
    }

    fn create_version_eleven_database_with_session(path: &Path) -> LocalSessionIssueResultV1 {
        let issued = create_version_ten_database_with_session(path);
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-ten database must reopen");
        configure_connection(&connection).expect("version-ten database must configure");
        apply_migration(&mut connection, MIGRATIONS[10])
            .expect("session lifecycle migration must apply");
        issued
    }

    fn create_version_twelve_database_with_session(path: &Path) -> LocalSessionIssueResultV1 {
        let issued = create_version_eleven_database_with_session(path);
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-eleven database must reopen");
        configure_connection(&connection).expect("version-eleven database must configure");
        apply_migration(&mut connection, MIGRATIONS[11])
            .expect("identity lifecycle migration must apply");
        issued
    }

    fn create_version_thirteen_database_with_session(path: &Path) -> LocalSessionIssueResultV1 {
        let issued = create_version_twelve_database_with_session(path);
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-twelve database must reopen");
        configure_connection(&connection).expect("version-twelve database must configure");
        apply_migration(&mut connection, MIGRATIONS[12])
            .expect("identity audit migration must apply");
        issued
    }

    fn create_version_fourteen_database_with_session(path: &Path) -> LocalSessionIssueResultV1 {
        let issued = create_version_thirteen_database_with_session(path);
        let mut connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .expect("version-thirteen database must reopen");
        configure_connection(&connection).expect("version-thirteen database must configure");
        apply_migration(&mut connection, MIGRATIONS[13])
            .expect("session audit migration must apply");
        issued
    }

    fn owner_bootstrap_input(password: &str) -> LocalOwnerBootstrapInputV1<'_> {
        LocalOwnerBootstrapInputV1 {
            identity_ref: "identity:human:owner",
            display_name: "Local Owner",
            password,
            created_at: "2026-07-23T17:00:00Z",
        }
    }

    fn owner_session_input(password: &str) -> LocalOwnerSessionIssueInputV1<'_> {
        LocalOwnerSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password,
            issued_at: "2026-07-23T17:01:00Z",
            expires_at: "2026-07-23T17:06:00Z",
        }
    }

    fn local_identity_create_input<'a>(
        identity_ref: &'a str,
        display_name: &'a str,
        role: LocalIdentityRoleV1,
        password: &'a str,
        created_at: &'a str,
    ) -> LocalIdentityCreateInputV1<'a> {
        LocalIdentityCreateInputV1 {
            identity_ref,
            display_name,
            role,
            password,
            created_at,
        }
    }

    fn local_session_input<'a>(
        identity_ref: &'a str,
        password: &'a str,
        issued_at: &'a str,
        expires_at: &'a str,
    ) -> LocalSessionIssueInputV1<'a> {
        LocalSessionIssueInputV1 {
            identity_ref,
            password,
            issued_at,
            expires_at,
        }
    }

    fn policy_fixture(packet: &PacketEnvelopeV1) -> PolicyDecisionV1 {
        decide_packet_envelope_policy_v1(packet, "2026-07-22T20:00:00Z")
            .expect("policy fixture must evaluate")
    }

    fn add_execution_proposal(packet: &mut PacketEnvelopeV1) {
        let resource_ref = packet.resource_refs[0].clone();
        packet.constraints.insert(
            "execution_proposal".to_owned(),
            serde_json::json!({
                "schema_id": "lnsat.execution_proposal.schema.v1_0",
                "derivation_profile": "lnsat.execution_request.packet_embedded.v1",
                "action": {
                    "kind": "git.commit",
                    "arguments": {
                        "message": "bounded fixture commit",
                        "path": "fixture.txt"
                    }
                },
                "target": {
                    "resource_ref": resource_ref,
                    "identity": {
                        "repository": "fixture",
                        "base": "fixture-base"
                    }
                },
                "configuration_digest": format!("sha256:{}", "c".repeat(64)),
                "adapter": {
                    "ref": "adapter:local:git-commit",
                    "version": "v1"
                },
                "executable_digest": format!("sha256:{}", "e".repeat(64)),
                "audience": "audience:gateway:local"
            }),
        );
    }

    fn approval_request_fixture() -> (PacketEnvelopeV1, PolicyDecisionV1, ApprovalRequestV1) {
        let mut packet = packet_fixture();
        packet.permission_allow = vec!["deploy.request".to_owned()];
        add_execution_proposal(&mut packet);
        let policy = policy_fixture(&packet);
        let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
            .expect("approval request fixture must derive");
        (packet, policy, request)
    }

    fn approval_decision_fixture() -> (
        PacketEnvelopeV1,
        PolicyDecisionV1,
        ApprovalRequestV1,
        ApprovalDecisionV1,
    ) {
        let (packet, policy, request) = approval_request_fixture();
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
        .expect("approval decision fixture must derive");
        (packet, policy, request, decision)
    }

    fn distinct_approval_decision_fixture(
        sequence: u64,
    ) -> (
        PacketEnvelopeV1,
        PolicyDecisionV1,
        ApprovalRequestV1,
        ApprovalDecisionV1,
    ) {
        let (mut packet, _, _) = approval_request_fixture();
        packet.packet_id = format!("pkt_{sequence:064x}");
        packet.idempotency_key = format!("idem_{sequence:064x}");
        let policy = policy_fixture(&packet);
        let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
            .expect("approval request fixture must derive");
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
        .expect("approval decision fixture must derive");
        (packet, policy, request, decision)
    }

    fn audit_event_fixtures() -> (
        PacketEnvelopeV1,
        PolicyDecisionV1,
        ApprovalRequestV1,
        ApprovalDecisionV1,
        [AuditEventV1; 3],
    ) {
        let (packet, policy, request, decision) = approval_decision_fixture();
        let policy_event = create_audit_event_v1(
            &AuditEventV1Input::PolicyDecision {
                packet: Box::new(packet.clone()),
                policy_decision: Box::new(policy.clone()),
            },
            "2026-07-22T20:00:10Z",
        )
        .expect("policy audit event must derive");
        let request_event = create_audit_event_v1(
            &AuditEventV1Input::ApprovalRequest {
                packet: Box::new(packet.clone()),
                policy_decision: Box::new(policy.clone()),
                approval_request: Box::new(request.clone()),
            },
            "2026-07-22T20:01:10Z",
        )
        .expect("request audit event must derive");
        let decision_event = create_audit_event_v1(
            &AuditEventV1Input::ApprovalDecision {
                packet: Box::new(packet.clone()),
                policy_decision: Box::new(policy.clone()),
                approval_request: Box::new(request.clone()),
                approval_decision: Box::new(decision.clone()),
            },
            "2026-07-22T20:02:10Z",
        )
        .expect("decision audit event must derive");
        (
            packet,
            policy,
            request,
            decision,
            [policy_event, request_event, decision_event],
        )
    }

    fn persist_approval_chain(
        store: &mut SqliteStore,
        packet: &PacketEnvelopeV1,
        policy: &PolicyDecisionV1,
        request: &ApprovalRequestV1,
        decision: &ApprovalDecisionV1,
    ) {
        store
            .append_packet_envelope_v1(packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(request)
            .expect("approval request must append");
        store
            .append_approval_decision_evidence_for_test_v1(decision)
            .expect("approval decision must append");
    }

    #[derive(Clone)]
    struct Phase7AttemptFixture {
        authorization_attempt_id: String,
        audit_binding_id: String,
        project_ref: String,
        resource_ref: String,
        approval_decision_id: String,
        approval_request_id: String,
        policy_decision_id: String,
        packet_id: String,
        packet_sha256: String,
        idempotency_key: String,
        request_digest: [u8; 32],
        action_digest: [u8; 32],
        target_digest: [u8; 32],
        configuration_digest: [u8; 32],
        adapter_ref: String,
        executable_digest: [u8; 32],
        audience: String,
        requested_at: String,
        expires_at: String,
    }

    impl Phase7AttemptFixture {
        fn input(&self) -> Phase7AuthorizationAttemptPrepareInputV1<'_> {
            Phase7AuthorizationAttemptPrepareInputV1 {
                project_ref: &self.project_ref,
                approval_decision_id: &self.approval_decision_id,
            }
        }

        fn apply_record(&mut self, record: &Phase7AuthorizationAttemptRecordV1) {
            self.authorization_attempt_id = record.authorization_attempt_id.clone();
            self.audit_binding_id = record.audit_binding_id.clone();
            self.project_ref = record.project_ref.clone();
            self.resource_ref = record.resource_ref.clone();
            self.approval_decision_id = record.approval_decision_id.clone();
            self.approval_request_id = record.approval_request_id.clone();
            self.policy_decision_id = record.policy_decision_id.clone();
            self.packet_id = record.packet_id.clone();
            self.packet_sha256 = record.packet_sha256.clone();
            self.idempotency_key = record.idempotency_key.clone();
            self.request_digest = record.request_digest;
            self.action_digest = record.action_digest;
            self.target_digest = record.target_digest;
            self.configuration_digest = record.configuration_digest;
            self.adapter_ref = record.adapter_ref.clone();
            self.executable_digest = record.executable_digest;
            self.audience = record.audience.clone();
            self.requested_at = record.requested_at.clone();
            self.expires_at = record.expires_at.clone();
        }
    }

    fn phase7_attempt_fixture(
        packet: &PacketEnvelopeV1,
        policy: &PolicyDecisionV1,
        request: &ApprovalRequestV1,
        decision: &ApprovalDecisionV1,
        sequence: u64,
    ) -> Phase7AttemptFixture {
        let digest_seed = u8::try_from(sequence).unwrap_or(u8::MAX);
        Phase7AttemptFixture {
            authorization_attempt_id: format!("aat_{sequence:064x}"),
            audit_binding_id: format!("p7a_{:064x}", sequence + 10_000),
            project_ref: packet.project_ref.clone(),
            resource_ref: packet.resource_refs[0].clone(),
            approval_decision_id: decision.approval_decision_id.clone(),
            approval_request_id: request.approval_request_id.clone(),
            policy_decision_id: policy.decision_id.clone(),
            packet_id: packet.packet_id.clone(),
            packet_sha256: hash_packet_envelope_v1(packet).expect("packet hash must derive"),
            idempotency_key: format!("phase7-attempt:{sequence:04}"),
            request_digest: [digest_seed; 32],
            action_digest: [digest_seed.wrapping_add(1); 32],
            target_digest: [digest_seed.wrapping_add(2); 32],
            configuration_digest: [digest_seed.wrapping_add(3); 32],
            adapter_ref: "adapter:local:git-commit".to_owned(),
            executable_digest: [digest_seed.wrapping_add(4); 32],
            audience: "gateway:local".to_owned(),
            requested_at: "2026-07-22T20:03:00Z".to_owned(),
            expires_at: decision.expires_at.clone(),
        }
    }

    fn persist_phase7_attempt(
        store: &mut SqliteStore,
        packet: &PacketEnvelopeV1,
        policy: &PolicyDecisionV1,
        request: &ApprovalRequestV1,
        decision: &ApprovalDecisionV1,
        sequence: u64,
    ) -> Phase7AttemptFixture {
        persist_approval_chain(store, packet, policy, request, decision);
        let mut fixture = phase7_attempt_fixture(packet, policy, request, decision, sequence);
        let write = store
            .prepare_phase7_authorization_attempt_with_sources_v1(
                &fixture.input(),
                &fixture.requested_at,
                || Ok(()),
            )
            .expect("phase7 attempt must append");
        fixture.apply_record(&write.record);
        fixture
    }

    fn prepare_phase7_attempt(
        store: &mut SqliteStore,
        fixture: &Phase7AttemptFixture,
    ) -> Result<Phase7AuthorizationAttemptWriteV1, Phase7PersistenceErrorV1> {
        store.prepare_phase7_authorization_attempt_with_sources_v1(
            &fixture.input(),
            &fixture.requested_at,
            || Ok(()),
        )
    }

    fn phase7_nonce_input(
        fixture: &Phase7AttemptFixture,
    ) -> Phase7AuthorizationNonceIssueInputV1<'_> {
        Phase7AuthorizationNonceIssueInputV1 {
            project_ref: &fixture.project_ref,
            resource_ref: &fixture.resource_ref,
            authorization_attempt_id: &fixture.authorization_attempt_id,
        }
    }

    fn issue_phase7_nonce_at(
        store: &mut SqliteStore,
        fixture: &Phase7AttemptFixture,
        entropy_byte: u8,
        issued_at: &str,
        ttl_expires_at: &str,
    ) -> Phase7AuthorizationNonceIssueV1 {
        store
            .issue_phase7_authorization_nonce_with_sources_v1(
                &phase7_nonce_input(fixture),
                issued_at,
                ttl_expires_at,
                |bytes| {
                    bytes.fill(entropy_byte);
                    Ok(())
                },
                || Ok(()),
            )
            .expect("phase7 nonce must issue")
    }

    fn sqlite_schema_manifest(connection: &Connection) -> Vec<(String, String, String, String)> {
        let mut statement = connection
            .prepare(
                "SELECT type, name, tbl_name, sql
                 FROM sqlite_schema
                 WHERE sql IS NOT NULL
                 ORDER BY type, name",
            )
            .expect("schema manifest must prepare");
        statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    normalize_sql(&row.get::<_, String>(3)?),
                ))
            })
            .expect("schema manifest must query")
            .collect::<rusqlite::Result<Vec<_>>>()
            .expect("schema manifest must decode")
    }

    fn recovery_inspection_event_input(
        target_database_path: &Path,
        idempotency_key: &str,
        observed_at: &str,
    ) -> SqliteRecoveryInspectionEventInputV1 {
        SqliteRecoveryInspectionEventInputV1 {
            deployment_ref: "deployment:local:test".to_owned(),
            target_ref: "database:local:primary".to_owned(),
            target_database_path: target_database_path.to_path_buf(),
            idempotency_key: idempotency_key.to_owned(),
            observed_at: observed_at.to_owned(),
        }
    }

    #[test]
    fn bootstraps_reopens_and_reports_required_posture() {
        let database = TestDatabase::new("bootstrap");
        let store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let state = store.state().expect("state must inspect");

        assert_eq!(state.database_path, database.path);
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.journal_mode, "wal");
        assert!(state.foreign_keys_enabled);
        assert_eq!(state.synchronous_level, 2);
        assert!(!state.trusted_schema_enabled);
        assert!(state.integrity_ok);
        drop(store);

        let reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(reopened.state().expect("state must inspect"), state);
    }

    #[test]
    fn owner_bootstrap_persists_exact_argon2id_evidence_without_secret_output() {
        let database = TestDatabase::new("owner-bootstrap");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        let record = store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        assert_eq!(record.identity.identity_ref, "identity:human:owner");
        assert_eq!(record.identity.display_name, "Local Owner");
        assert_eq!(record.identity.role, LocalIdentityRoleV1::Owner);
        assert_eq!(record.identity.status, LocalIdentityStatusV1::Active);
        assert_eq!(record.credential_profile, LOCAL_PASSWORD_PROFILE_V1);
        assert_eq!(record.credential_version, 1);
        assert_eq!(
            store.verify_local_owner_password_v1("identity:human:owner", password),
            Ok(LocalCredentialVerificationV1::Verified)
        );
        assert_eq!(
            store.verify_local_owner_password_v1("identity:human:owner", "wrong password value",),
            Ok(LocalCredentialVerificationV1::Rejected)
        );
        assert_eq!(
            store.verify_local_owner_password_v1("identity:human:missing", password),
            Ok(LocalCredentialVerificationV1::Rejected)
        );

        let verifier = store
            .connection
            .query_row(
                "SELECT password_verifier
                 FROM lnsat_local_password_credentials
                 WHERE identity_ref = 'identity:human:owner'",
                [],
                |row| row.get::<_, String>(0),
            )
            .expect("verifier evidence must inspect");
        validate_local_password_verifier_v1(&verifier).expect("verifier profile must be exact");
        assert!(!verifier.contains(password));
        drop(store);

        let reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(
            reopened
                .read_local_identity_v1("identity:human:owner")
                .expect("identity must read"),
            Some(record.identity)
        );
        assert_eq!(
            reopened.verify_local_owner_password_v1("identity:human:owner", password),
            Ok(LocalCredentialVerificationV1::Verified)
        );
    }

    #[test]
    fn owner_bootstrap_is_exactly_once_under_competing_connections() {
        let database = TestDatabase::new("owner-bootstrap-race");
        SqliteStore::open(&database.path).expect("database must bootstrap");
        let barrier = Arc::new(Barrier::new(2));
        let mut workers = Vec::new();
        for _ in 0..2 {
            let path = database.path.clone();
            let worker_barrier = Arc::clone(&barrier);
            workers.push(std::thread::spawn(move || {
                let mut store = SqliteStore::open(path).expect("worker database must open");
                worker_barrier.wait();
                store.bootstrap_local_owner_v1(&owner_bootstrap_input(
                    "correct horse battery staple",
                ))
            }));
        }
        let outcomes = workers
            .into_iter()
            .map(|worker| worker.join().expect("bootstrap worker must join"))
            .collect::<Vec<_>>();
        assert_eq!(outcomes.iter().filter(|outcome| outcome.is_ok()).count(), 1);
        assert_eq!(
            outcomes
                .iter()
                .filter(|outcome| {
                    **outcome == Err(LocalIdentityStoreErrorV1::OwnerAlreadyBootstrapped)
                })
                .count(),
            1
        );

        let inspection = Connection::open(&database.path).expect("bootstrap database must inspect");
        assert_eq!(
            inspection
                .query_row("SELECT count(*) FROM lnsat_local_identities", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("identity count must inspect"),
            1
        );
        assert_eq!(
            inspection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_password_credentials",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("credential count must inspect"),
            1
        );
    }

    #[test]
    fn owner_bootstrap_invalid_input_leaves_no_rows() {
        let database = TestDatabase::new("owner-bootstrap-invalid");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        for input in [
            LocalOwnerBootstrapInputV1 {
                identity_ref: "invalid identity",
                ..owner_bootstrap_input("correct horse battery staple")
            },
            LocalOwnerBootstrapInputV1 {
                identity_ref: "identity:workload:owner",
                ..owner_bootstrap_input("correct horse battery staple")
            },
            LocalOwnerBootstrapInputV1 {
                display_name: " Local Owner",
                ..owner_bootstrap_input("correct horse battery staple")
            },
            LocalOwnerBootstrapInputV1 {
                password: "too-short",
                ..owner_bootstrap_input("too-short")
            },
            LocalOwnerBootstrapInputV1 {
                created_at: "2026-07-23 17:00:00",
                ..owner_bootstrap_input("correct horse battery staple")
            },
        ] {
            assert_eq!(
                store.bootstrap_local_owner_v1(&input),
                Err(LocalIdentityStoreErrorV1::InvalidInput)
            );
        }
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_local_identities", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("identity count must inspect"),
            0
        );
    }

    #[test]
    fn owner_bootstrap_rows_are_immutable_and_stored_tamper_fails_closed() {
        let database = TestDatabase::new("owner-bootstrap-tamper");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let password = "correct horse battery staple";
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_identities
                     SET display_name = 'Changed'
                     WHERE identity_ref = 'identity:human:owner'",
                    [],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_password_credentials
                     WHERE identity_ref = 'identity:human:owner'",
                    [],
                )
                .is_err()
        );

        let mut tampered_verifier = store
            .connection
            .query_row(
                "SELECT password_verifier
                 FROM lnsat_local_password_credentials
                 WHERE identity_ref = 'identity:human:owner'",
                [],
                |row| row.get::<_, String>(0),
            )
            .expect("stored verifier must inspect");
        let final_character = tampered_verifier.pop().expect("verifier must be nonempty");
        tampered_verifier.push(if final_character == 'A' { 'B' } else { 'A' });
        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_local_password_credentials_reject_update;")
            .expect("test must remove immutable guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_local_password_credentials
                 SET password_verifier = ?1
                 WHERE identity_ref = 'identity:human:owner'",
                [&tampered_verifier],
            )
            .expect("test must inject stored credential drift");
        store
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_local_password_credentials_reject_update
                 BEFORE UPDATE ON lnsat_local_password_credentials
                 BEGIN
                   SELECT RAISE(ABORT, 'local password credentials are immutable');
                 END;",
            )
            .expect("test must restore immutable guard");
        assert_eq!(
            store.verify_local_owner_password_v1("identity:human:owner", password),
            Err(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn owner_session_persists_only_hash_evidence_and_reopens() {
        let database = TestDatabase::new("owner-session-reopen");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue");
        assert!(issued.session.session_id.starts_with("ses_"));
        assert!(!issued.raw_session_token.contains(password));
        assert_ne!(issued.raw_session_token, issued.raw_csrf_token);
        let stored = store
            .connection
            .query_row(
                "SELECT session_token_digest, csrf_token_digest,
                        session_evidence_digest
                 FROM lnsat_local_sessions
                 WHERE session_id = ?1",
                [&issued.session.session_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                },
            )
            .expect("stored session evidence must inspect");
        for value in [&stored.0, &stored.1, &stored.2] {
            assert!(value.starts_with("sha256:"));
            assert!(!value.contains(&issued.raw_session_token));
            assert!(!value.contains(&issued.raw_csrf_token));
        }
        assert_eq!(
            store
                .verify_local_owner_session_v1(&issued.raw_session_token, "2026-07-23T17:01:00Z",)
                .expect("session must verify"),
            LocalSessionVerificationV1::Verified(issued.session.clone())
        );
        assert_eq!(
            store
                .verify_local_owner_browser_mutation_v1(
                    &issued.raw_session_token,
                    "0",
                    "2026-07-23T17:01:00Z",
                )
                .expect("wrong CSRF must reject safely"),
            LocalSessionVerificationV1::Rejected
        );
        assert_eq!(
            store
                .verify_local_owner_browser_mutation_v1(
                    &issued.raw_session_token,
                    &issued.raw_csrf_token,
                    "2026-07-23T17:05:59.999Z",
                )
                .expect("session and CSRF must verify"),
            LocalSessionVerificationV1::Verified(issued.session.clone())
        );
        drop(store);

        let reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(
            reopened
                .verify_local_owner_session_v1(&issued.raw_session_token, "2026-07-23T17:02:00Z",)
                .expect("reopened session must verify"),
            LocalSessionVerificationV1::Verified(issued.session)
        );
    }

    #[test]
    fn owner_session_fails_closed_for_credentials_time_expiry_and_token_replay() {
        let database = TestDatabase::new("owner-session-negatives");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");

        let wrong_password = LocalOwnerSessionIssueInputV1 {
            password: "wrong password value",
            ..owner_session_input("wrong password value")
        };
        assert!(matches!(
            store.issue_local_owner_session_v1(&wrong_password),
            Err(LocalSessionStoreErrorV1::InvalidCredential)
        ));
        let wrong_identity = LocalOwnerSessionIssueInputV1 {
            identity_ref: "identity:human:missing",
            ..owner_session_input(password)
        };
        assert!(matches!(
            store.issue_local_owner_session_v1(&wrong_identity),
            Err(LocalSessionStoreErrorV1::InvalidCredential)
        ));
        for invalid in [
            LocalOwnerSessionIssueInputV1 {
                expires_at: "2026-07-23T17:01:59.999Z",
                ..owner_session_input(password)
            },
            LocalOwnerSessionIssueInputV1 {
                expires_at: "2026-07-23T18:01:00.001Z",
                ..owner_session_input(password)
            },
            LocalOwnerSessionIssueInputV1 {
                issued_at: "2026-07-23 17:01:00Z",
                ..owner_session_input(password)
            },
        ] {
            assert!(matches!(
                store.issue_local_owner_session_v1(&invalid),
                Err(LocalSessionStoreErrorV1::InvalidInput)
            ));
        }

        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue");
        for (token, checked_at) in [
            ("malformed", "2026-07-23T17:02:00Z"),
            (
                issued.raw_session_token.as_str(),
                "2026-07-23T17:00:59.999Z",
            ),
            (issued.raw_session_token.as_str(), "2026-07-23T17:06:00Z"),
        ] {
            assert_eq!(
                store
                    .verify_local_owner_session_v1(token, checked_at)
                    .expect("negative session must reject safely"),
                LocalSessionVerificationV1::Rejected
            );
        }
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn session_activity_is_bounded_append_only_and_idle_boundary_rejects() {
        let database = TestDatabase::new("session-activity");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue");
        let activity_count = |store: &SqliteStore| {
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events
                     WHERE session_id = ?1",
                    [&issued.session.session_id],
                    |row| row.get::<_, i64>(0),
                )
                .expect("activity count must inspect")
        };
        assert_eq!(activity_count(&store), 1);
        assert_eq!(
            store
                .verify_and_touch_local_session_v1(
                    &issued.raw_session_token,
                    Some(&issued.raw_csrf_token),
                    "2026-07-23T17:01:59.999Z",
                    120,
                )
                .expect("sub-granularity check must verify"),
            LocalSessionActivityVerificationV1::Verified(LocalSessionActivityV1 {
                session: issued.session.clone(),
                activity_sequence: 1,
                last_activity_at: "2026-07-23T17:01:00Z".to_owned(),
                touched: false,
            })
        );
        assert_eq!(activity_count(&store), 1);
        assert_eq!(
            store
                .verify_and_touch_local_session_v1(
                    &issued.raw_session_token,
                    Some(&issued.raw_csrf_token),
                    "2026-07-23T17:02:00Z",
                    120,
                )
                .expect("granularity boundary must touch"),
            LocalSessionActivityVerificationV1::Verified(LocalSessionActivityV1 {
                session: issued.session.clone(),
                activity_sequence: 2,
                last_activity_at: "2026-07-23T17:02:00Z".to_owned(),
                touched: true,
            })
        );
        assert_eq!(activity_count(&store), 2);
        assert_eq!(
            store
                .verify_and_touch_local_session_v1(
                    &issued.raw_session_token,
                    Some(&issued.raw_csrf_token),
                    "2026-07-23T17:03:00Z",
                    120,
                )
                .expect("next granularity boundary must touch"),
            LocalSessionActivityVerificationV1::Verified(LocalSessionActivityV1 {
                session: issued.session.clone(),
                activity_sequence: 3,
                last_activity_at: "2026-07-23T17:03:00Z".to_owned(),
                touched: true,
            })
        );
        assert_eq!(
            store
                .verify_and_touch_local_session_v1(
                    &issued.raw_session_token,
                    Some(&issued.raw_csrf_token),
                    "2026-07-23T17:05:00Z",
                    120,
                )
                .expect("exact idle boundary must reject safely"),
            LocalSessionActivityVerificationV1::Rejected
        );
        assert_eq!(activity_count(&store), 3);
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_session_activity_events
                     SET observed_at = '2026-07-23T17:02:01Z'
                     WHERE session_id = ?1 AND activity_sequence = 2",
                    [&issued.session.session_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_session_activity_events
                     WHERE session_id = ?1",
                    [&issued.session.session_id],
                )
                .is_err()
        );
        assert_eq!(
            store.verify_and_touch_local_session_v1(
                &issued.raw_session_token,
                Some(&issued.raw_csrf_token),
                "2026-07-23T17:02:01Z",
                59,
            ),
            Err(LocalSessionStoreErrorV1::InvalidInput)
        );
        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_local_session_activity_events_reject_update;")
            .expect("test must remove immutable guard");
        let substituted_at = "2026-07-23T17:01:30Z";
        store
            .connection
            .execute(
                "UPDATE lnsat_local_session_activity_events
                 SET observed_at = ?1, activity_evidence_digest = ?2
                 WHERE session_id = ?3 AND activity_sequence = 3",
                params![
                    substituted_at,
                    local_session_activity_evidence_digest_v1(
                        &issued.session.session_id,
                        3,
                        substituted_at,
                    ),
                    issued.session.session_id,
                ],
            )
            .expect("test must inject reordered activity evidence");
        store
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_local_session_activity_events_reject_update
                 BEFORE UPDATE ON lnsat_local_session_activity_events
                 BEGIN
                   SELECT RAISE(ABORT, 'local session activity events are immutable');
                 END;",
            )
            .expect("test must restore immutable guard");
        assert_eq!(
            store.verify_and_touch_local_session_v1(
                &issued.raw_session_token,
                Some(&issued.raw_csrf_token),
                "2026-07-23T17:03:01Z",
                120,
            ),
            Err(LocalSessionStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn migrated_session_without_activity_anchors_from_issued_at() {
        let database = TestDatabase::new("session-activity-migrated");
        let issued = create_version_ten_database_with_session(&database.path);
        let mut store = SqliteStore::open(&database.path).expect("database must migrate");
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("migrated activity rows must inspect"),
            0
        );
        assert_eq!(
            store
                .verify_and_touch_local_session_v1(
                    &issued.raw_session_token,
                    None,
                    "2026-07-23T17:02:00Z",
                    120,
                )
                .expect("migrated session must anchor and touch"),
            LocalSessionActivityVerificationV1::Verified(LocalSessionActivityV1 {
                session: issued.session,
                activity_sequence: 1,
                last_activity_at: "2026-07-23T17:02:00Z".to_owned(),
                touched: true,
            })
        );
    }

    #[test]
    fn session_rotation_is_atomic_one_time_and_expiry_preserving() {
        let database = TestDatabase::new("session-rotation");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue");
        assert!(
            store
                .rotate_local_session_v1(
                    &issued.raw_session_token,
                    "wrong csrf",
                    "2026-07-23T17:02:00Z",
                    120,
                )
                .expect("wrong CSRF must reject safely")
                .is_none()
        );
        let rotated = store
            .rotate_local_session_v1(
                &issued.raw_session_token,
                &issued.raw_csrf_token,
                "2026-07-23T17:02:00Z",
                120,
            )
            .expect("rotation must persist")
            .expect("active session must rotate");
        assert_eq!(rotated.prior_session_id, issued.session.session_id);
        assert_eq!(rotated.session.identity_ref, issued.session.identity_ref);
        assert_eq!(rotated.session.expires_at, issued.session.expires_at);
        assert_ne!(rotated.session.session_id, issued.session.session_id);
        assert_ne!(rotated.raw_session_token, issued.raw_session_token);
        assert_ne!(rotated.raw_csrf_token, issued.raw_csrf_token);
        assert_eq!(
            store
                .verify_local_session_v1(&issued.raw_session_token, "2026-07-23T17:02:00.001Z")
                .expect("prior session must reject"),
            LocalSessionVerificationV1::Rejected
        );
        assert_eq!(
            store
                .verify_local_browser_mutation_v1(
                    &rotated.raw_session_token,
                    &rotated.raw_csrf_token,
                    "2026-07-23T17:02:00Z",
                )
                .expect("replacement must verify"),
            LocalSessionVerificationV1::Verified(rotated.session.clone())
        );
        assert!(
            store
                .rotate_local_session_v1(
                    &issued.raw_session_token,
                    &issued.raw_csrf_token,
                    "2026-07-23T17:02:01Z",
                    120,
                )
                .expect("rotation replay must reject safely")
                .is_none()
        );
        let stored_rotation =
            select_local_session_rotation_v1(&store.connection, &issued.session.session_id)
                .expect("rotation must inspect")
                .expect("rotation must exist");
        validate_local_session_rotation_v1(&store.connection, &stored_rotation)
            .expect("rotation evidence must validate");
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_session_rotations
                     WHERE prior_session_id = ?1",
                    [&issued.session.session_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_session_rotations
                     SET rotated_at = '2026-07-23T17:02:01Z'
                     WHERE prior_session_id = ?1",
                    [&issued.session.session_id],
                )
                .is_err()
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn session_audit_events_bind_issue_revoke_rotate_and_reopen() {
        let database = TestDatabase::new("session-audit-events");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue");
        let issued_events = store
            .read_local_session_events_v1(&issued.session.session_id)
            .expect("issued event must read");
        assert_eq!(issued_events.len(), 1);
        assert_eq!(issued_events[0].event_sequence, 1);
        assert_eq!(issued_events[0].event_kind, LocalSessionEventKindV1::Issued);
        assert_eq!(issued_events[0].actor_session_id, None);
        assert_eq!(issued_events[0].related_session_id, None);
        assert_eq!(issued_events[0].revocation_reason, None);
        assert_eq!(issued_events[0].occurred_at, issued.session.issued_at);

        let rotated = store
            .rotate_local_session_v1(
                &issued.raw_session_token,
                &issued.raw_csrf_token,
                "2026-07-23T17:02:00Z",
                120,
            )
            .expect("rotation must persist")
            .expect("session must rotate");
        let prior_events = store
            .read_local_session_events_v1(&issued.session.session_id)
            .expect("prior events must read");
        assert_eq!(
            prior_events
                .iter()
                .map(|event| (event.event_sequence, event.event_kind))
                .collect::<Vec<_>>(),
            vec![
                (1, LocalSessionEventKindV1::Issued),
                (2, LocalSessionEventKindV1::Revoked),
                (3, LocalSessionEventKindV1::Rotated),
            ]
        );
        assert_eq!(
            prior_events[1].actor_session_id.as_deref(),
            Some(issued.session.session_id.as_str())
        );
        assert_eq!(
            prior_events[1].revocation_reason.as_deref(),
            Some(LocalSessionRevocationReasonV1::Rotation.as_str())
        );
        assert_eq!(
            prior_events[2].actor_session_id.as_deref(),
            Some(issued.session.session_id.as_str())
        );
        assert_eq!(
            prior_events[2].related_session_id.as_deref(),
            Some(rotated.session.session_id.as_str())
        );
        assert_eq!(prior_events[1].occurred_at, rotated.rotated_at);
        assert_eq!(prior_events[2].occurred_at, rotated.rotated_at);
        let replacement_events = store
            .read_local_session_events_v1(&rotated.session.session_id)
            .expect("replacement issue event must read");
        assert_eq!(replacement_events.len(), 1);
        assert_eq!(
            replacement_events[0].event_kind,
            LocalSessionEventKindV1::Issued
        );
        assert_ne!(
            replacement_events[0].event_evidence_digest,
            prior_events[0].event_evidence_digest
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_session_events
                     SET occurred_at = '2026-07-23T17:02:01Z'
                     WHERE event_id = ?1",
                    [&prior_events[2].event_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_session_events WHERE event_id = ?1",
                    [&prior_events[2].event_id],
                )
                .is_err()
        );
        drop(store);

        let reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(
            reopened
                .read_local_session_events_v1(&issued.session.session_id)
                .expect("reopened events must read"),
            prior_events
        );
        reopened
            .connection
            .execute_batch("DROP TRIGGER lnsat_local_session_events_reject_update;")
            .expect("test must remove immutable guard");
        reopened
            .connection
            .execute(
                "UPDATE lnsat_local_session_events
                 SET source_evidence_digest = ?1
                 WHERE event_id = ?2",
                params![
                    format!("sha256:{}", "0".repeat(64)),
                    prior_events[2].event_id
                ],
            )
            .expect("test must inject event drift");
        reopened
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_local_session_events_reject_update
                 BEFORE UPDATE ON lnsat_local_session_events
                 BEGIN
                   SELECT RAISE(ABORT, 'local session events are immutable');
                 END;",
            )
            .expect("test must restore immutable guard");
        assert_eq!(
            reopened.read_local_session_events_v1(&issued.session.session_id),
            Err(LocalSessionStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn session_audit_rejects_recomputed_cross_identity_actor_substitution() {
        let database = TestDatabase::new("session-audit-actor-substitution");
        let owner_password = "correct horse battery staple";
        let operator_password = "operator bounded password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(owner_password))
            .expect("owner must bootstrap");
        let owner = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("owner session must issue");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    operator_password,
                    "2026-07-23T17:01:10Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:01:10Z",
            )
            .expect("operator must create");
        let operator = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-23T17:01:20Z",
                "2026-07-23T17:06:20Z",
            ))
            .expect("operator session must issue");
        assert!(
            store
                .revoke_local_session_v1(
                    &operator.raw_session_token,
                    &operator.raw_csrf_token,
                    "2026-07-23T17:02:00Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("operator sign-out must persist")
        );
        let event = store
            .read_local_session_events_v1(&operator.session.session_id)
            .expect("operator events must read")
            .into_iter()
            .nth(1)
            .expect("revocation event must exist");
        let substituted_digest = local_session_event_evidence_digest_v1(
            &event.event_id,
            &event.session_id,
            event.event_sequence,
            event.event_kind,
            Some(&owner.session.session_id),
            event.related_session_id.as_deref(),
            event.revocation_reason.as_deref(),
            &event.source_evidence_digest,
            &event.occurred_at,
        );
        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_local_session_events_reject_update;")
            .expect("test must remove immutable guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_local_session_events
                 SET actor_session_id = ?1, event_evidence_digest = ?2
                 WHERE event_id = ?3",
                params![owner.session.session_id, substituted_digest, event.event_id],
            )
            .expect("test must inject recomputed actor substitution");
        store
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_local_session_events_reject_update
                 BEFORE UPDATE ON lnsat_local_session_events
                 BEGIN
                   SELECT RAISE(ABORT, 'local session events are immutable');
                 END;",
            )
            .expect("test must restore immutable guard");
        assert_eq!(
            store.read_local_session_events_v1(&operator.session.session_id),
            Err(LocalSessionStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn session_event_failure_rolls_back_issue_revocation_and_activity() {
        let database = TestDatabase::new("session-event-rollback");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        store
            .connection
            .execute_batch(
                "CREATE TEMP TRIGGER reject_session_issue_event
                 BEFORE INSERT ON lnsat_local_session_events
                 WHEN NEW.event_kind = 'issued'
                 BEGIN
                   SELECT RAISE(ABORT, 'injected issue event failure');
                 END;",
            )
            .expect("issue failure trigger must install");
        assert_eq!(
            store
                .issue_local_owner_session_v1(&owner_session_input(password))
                .map(|_| ()),
            Err(LocalSessionStoreErrorV1::PersistenceFailed)
        );
        for table in [
            "lnsat_local_sessions",
            "lnsat_local_session_activity_events",
            "lnsat_local_session_events",
        ] {
            let sql = format!("SELECT count(*) FROM {table}");
            assert_eq!(
                store
                    .connection
                    .query_row(&sql, [], |row| row.get::<_, i64>(0))
                    .expect("rolled-back row count must inspect"),
                0
            );
        }
        store
            .connection
            .execute_batch("DROP TRIGGER reject_session_issue_event;")
            .expect("issue failure trigger must drop");
        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue after trigger drop");
        store
            .connection
            .execute_batch(
                "CREATE TEMP TRIGGER reject_session_revocation_event
                 BEFORE INSERT ON lnsat_local_session_events
                 WHEN NEW.event_kind = 'revoked'
                 BEGIN
                   SELECT RAISE(ABORT, 'injected revocation event failure');
                 END;",
            )
            .expect("revocation failure trigger must install");
        assert_eq!(
            store.revoke_local_session_v1(
                &issued.raw_session_token,
                &issued.raw_csrf_token,
                "2026-07-23T17:02:00Z",
                LocalSessionRevocationReasonV1::SignOut,
            ),
            Err(LocalSessionStoreErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_revocations",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("revocation rollback must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("activity rollback must inspect"),
            1
        );
        let events = store
            .read_local_session_events_v1(&issued.session.session_id)
            .expect("original issue event must remain");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_kind, LocalSessionEventKindV1::Issued);
    }

    #[test]
    fn unknown_identity_authentication_consumes_dummy_argon2_evidence() {
        let database = TestDatabase::new("unknown-identity-equalizer");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        store.authentication_dummy_verifier = "invalid dummy verifier".to_owned();

        assert_eq!(
            store.verify_local_password_credential_v1(
                "identity:human:missing",
                "wrong password value",
            ),
            Err(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
        assert_eq!(
            store
                .verify_local_password_credential_v1(
                    "identity:human:owner",
                    "wrong password value",
                )
                .expect("known identity should use its stored verifier"),
            LocalCredentialVerificationV1::Rejected
        );
    }

    #[test]
    fn authenticated_control_mutation_rejects_exact_default_idle_boundary() {
        let database = TestDatabase::new("control-mutation-idle-boundary");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("long session must issue");
        assert_eq!(
            store.create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    "operator secure password",
                    "2026-07-23T17:16:00Z",
                ),
                &issued.raw_session_token,
                &issued.raw_csrf_token,
                "2026-07-23T17:16:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_identities
                     WHERE identity_ref = 'identity:human:operator'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rejected identity count must inspect"),
            0
        );
    }

    #[test]
    fn owner_session_revocation_is_append_only_and_tamper_fails_closed() {
        let database = TestDatabase::new("owner-session-revocation");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_owner_session_v1(&owner_session_input(password))
            .expect("session must issue");
        assert!(
            store
                .revoke_local_owner_session_v1(
                    &issued.raw_session_token,
                    &issued.raw_csrf_token,
                    "2026-07-23T17:02:00Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("session must revoke")
        );
        assert_eq!(
            store
                .verify_local_owner_session_v1(&issued.raw_session_token, "2026-07-23T17:02:01Z",)
                .expect("revoked session must reject"),
            LocalSessionVerificationV1::Rejected
        );
        assert!(
            !store
                .revoke_local_owner_session_v1(
                    &issued.raw_session_token,
                    &issued.raw_csrf_token,
                    "2026-07-23T17:02:01Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("revocation replay must reject")
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_sessions
                     SET expires_at = '2026-07-23T17:07:00Z'
                     WHERE session_id = ?1",
                    [&issued.session.session_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_session_revocations
                     WHERE session_id = ?1",
                    [&issued.session.session_id],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_local_sessions_reject_update;")
            .expect("test must remove immutable guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_local_sessions
                 SET csrf_token_digest = ?1
                 WHERE session_id = ?2",
                params![
                    format!("sha256:{}", "0".repeat(64)),
                    issued.session.session_id
                ],
            )
            .expect("test must inject session evidence drift");
        store
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_local_sessions_reject_update
                 BEFORE UPDATE ON lnsat_local_sessions
                 BEGIN
                   SELECT RAISE(ABORT, 'local sessions are immutable');
                 END;",
            )
            .expect("test must restore immutable guard");
        assert_eq!(
            store.verify_local_owner_session_v1(&issued.raw_session_token, "2026-07-23T17:02:01Z",),
            Err(LocalSessionStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn same_identity_revoke_all_is_atomic_scoped_and_replay_closed() {
        let database = TestDatabase::new("session-family-revocation");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let first = store
            .issue_local_session_v1(&owner_session_input(password))
            .expect("first session must issue");
        let operator_password = "operator secure password";
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    operator_password,
                    "2026-07-23T17:01:30Z",
                ),
                &first.raw_session_token,
                &first.raw_csrf_token,
                "2026-07-23T17:01:30Z",
            )
            .expect("owner must create operator");
        let operator = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-23T17:01:40Z",
                "2026-07-23T17:06:40Z",
            ))
            .expect("operator session must issue");
        let second = store
            .issue_local_session_v1(&owner_session_input(password))
            .expect("second session must issue");
        let third = store
            .issue_local_session_v1(&owner_session_input(password))
            .expect("third session must issue");
        assert!(
            store
                .revoke_local_session_v1(
                    &first.raw_session_token,
                    &first.raw_csrf_token,
                    "2026-07-23T17:01:30Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("first session must revoke")
        );
        assert_eq!(
            store
                .revoke_all_local_sessions_v1(
                    &third.raw_session_token,
                    "wrong-csrf",
                    "2026-07-23T17:02:00Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("wrong CSRF must reject safely"),
            None
        );
        let revoked = store
            .revoke_all_local_sessions_v1(
                &third.raw_session_token,
                &third.raw_csrf_token,
                "2026-07-23T17:02:00Z",
                LocalSessionRevocationReasonV1::SignOut,
            )
            .expect("family revocation must persist")
            .expect("active family must authenticate");
        assert_eq!(
            revoked,
            LocalSessionFamilyRevocationV1 {
                identity_ref: "identity:human:owner".to_owned(),
                family_session_count: 3,
                newly_revoked_session_count: 2,
                revoked_at: "2026-07-23T17:02:00Z".to_owned(),
            }
        );
        for token in [
            &first.raw_session_token,
            &second.raw_session_token,
            &third.raw_session_token,
        ] {
            assert_eq!(
                store
                    .verify_local_session_v1(token, "2026-07-23T17:02:01Z")
                    .expect("revoked family must reject safely"),
                LocalSessionVerificationV1::Rejected
            );
        }
        assert!(matches!(
            store
                .verify_local_session_v1(&operator.raw_session_token, "2026-07-23T17:02:01Z")
                .expect("other identity session must remain valid"),
            LocalSessionVerificationV1::Verified(_)
        ));
        assert_eq!(
            store
                .revoke_all_local_sessions_v1(
                    &third.raw_session_token,
                    &third.raw_csrf_token,
                    "2026-07-23T17:02:01Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("family replay must reject safely"),
            None
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn password_rotation_is_append_only_atomic_and_revokes_the_session_family() {
        let database = TestDatabase::new("password-rotation");
        let current_password = "correct horse battery staple";
        let new_password = "new correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(current_password))
            .expect("owner must bootstrap");
        let first = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                current_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("first session must issue");
        let second = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                current_password,
                "2026-07-23T17:01:01Z",
                "2026-07-23T17:31:01Z",
            ))
            .expect("second session must issue");

        assert_eq!(
            store.rotate_local_password_credential_v1(
                &first.raw_session_token,
                &first.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password: "wrong current password",
                    new_password,
                    rotated_at: "2026-07-23T17:02:00Z",
                },
            ),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store.rotate_local_password_credential_v1(
                &first.raw_session_token,
                &first.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password,
                    new_password: current_password,
                    rotated_at: "2026-07-23T17:02:00Z",
                },
            ),
            Err(LocalIdentityStoreErrorV1::InvalidInput)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_password_credentials
                     WHERE identity_ref = 'identity:human:owner'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("credential count must inspect"),
            1
        );

        let rotated = store
            .rotate_local_password_credential_v1(
                &first.raw_session_token,
                &first.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password,
                    new_password,
                    rotated_at: "2026-07-23T17:02:00Z",
                },
            )
            .expect("credential must rotate");
        assert_eq!(
            rotated,
            LocalPasswordRotationResultV1 {
                identity_ref: "identity:human:owner".to_owned(),
                credential_version: 2,
                rotated_at: "2026-07-23T17:02:00Z".to_owned(),
                revoked_session_count: 2,
            }
        );
        assert_eq!(
            store.verify_local_password_credential_v1("identity:human:owner", current_password,),
            Ok(LocalCredentialVerificationV1::Rejected)
        );
        assert_eq!(
            store.verify_local_password_credential_v1("identity:human:owner", new_password),
            Ok(LocalCredentialVerificationV1::Verified)
        );
        for token in [&first.raw_session_token, &second.raw_session_token] {
            assert_eq!(
                store
                    .verify_local_session_v1(token, "2026-07-23T17:02:00.001Z")
                    .expect("revoked session must reject"),
                LocalSessionVerificationV1::Rejected
            );
        }
        assert_eq!(
            store.rotate_local_password_credential_v1(
                &first.raw_session_token,
                &first.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password: new_password,
                    new_password: "third bounded password value",
                    rotated_at: "2026-07-23T17:02:01Z",
                },
            ),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert!(matches!(
            store.issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                current_password,
                "2026-07-23T17:02:01Z",
                "2026-07-23T17:32:01Z",
            )),
            Err(LocalSessionStoreErrorV1::InvalidCredential)
        ));
        assert!(
            store
                .issue_local_session_v1(&local_session_input(
                    "identity:human:owner",
                    new_password,
                    "2026-07-23T17:02:01Z",
                    "2026-07-23T17:32:01Z",
                ))
                .is_ok()
        );
        let stored_credentials = store
            .connection
            .prepare(
                "SELECT credential_version, password_verifier
                 FROM lnsat_local_password_credentials
                 WHERE identity_ref = 'identity:human:owner'
                 ORDER BY credential_version",
            )
            .expect("credential evidence must prepare")
            .query_map([], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })
            .expect("credential evidence must query")
            .collect::<Result<Vec<_>, _>>()
            .expect("credential evidence must collect");
        assert_eq!(
            stored_credentials
                .iter()
                .map(|(version, _)| *version)
                .collect::<Vec<_>>(),
            vec![1, 2]
        );
        assert!(
            stored_credentials
                .iter()
                .all(|(_, verifier)| !verifier.contains(current_password)
                    && !verifier.contains(new_password))
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_password_credentials
                     SET created_at = '2026-07-23T17:02:01Z'
                     WHERE identity_ref = 'identity:human:owner'
                       AND credential_version = 2",
                    [],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_password_credentials
                     WHERE identity_ref = 'identity:human:owner'
                       AND credential_version = 1",
                    [],
                )
                .is_err()
        );
    }

    #[test]
    fn password_rotation_rolls_back_credential_and_activity_when_revocation_fails() {
        let database = TestDatabase::new("password-rotation-rollback");
        let current_password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(current_password))
            .expect("owner must bootstrap");
        let session = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                current_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("session must issue");
        store
            .connection
            .execute_batch(
                "CREATE TEMP TRIGGER test_reject_credential_revocation
                 BEFORE INSERT ON lnsat_local_session_revocations
                 WHEN NEW.reason = 'credential_revoke'
                 BEGIN
                   SELECT RAISE(ABORT, 'injected credential revocation failure');
                 END;",
            )
            .expect("failure trigger must install");

        assert_eq!(
            store.rotate_local_password_credential_v1(
                &session.raw_session_token,
                &session.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password,
                    new_password: "replacement bounded password",
                    rotated_at: "2026-07-23T17:02:00Z",
                },
            ),
            Err(LocalIdentityStoreErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_password_credentials
                     WHERE identity_ref = 'identity:human:owner'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("credential count must inspect"),
            1
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events
                     WHERE session_id = ?1",
                    [&session.session.session_id],
                    |row| row.get::<_, i64>(0),
                )
                .expect("activity count must inspect"),
            1
        );
        assert_eq!(
            store.verify_local_password_credential_v1("identity:human:owner", current_password,),
            Ok(LocalCredentialVerificationV1::Verified)
        );
        assert!(matches!(
            store
                .verify_local_session_v1(&session.raw_session_token, "2026-07-23T17:02:00Z")
                .expect("rolled-back session must remain active"),
            LocalSessionVerificationV1::Verified(_)
        ));
    }

    #[test]
    fn offline_owner_recovery_requires_exclusion_and_revokes_active_sessions() {
        let database = TestDatabase::new("offline-owner-recovery");
        let current_password = "correct horse battery staple";
        let replacement_password = "offline replacement password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(current_password))
            .expect("owner must bootstrap");
        let first = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                current_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("first owner session must issue");
        let second = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                current_password,
                "2026-07-23T17:01:01Z",
                "2026-07-23T17:31:01Z",
            ))
            .expect("second owner session must issue");
        assert_eq!(
            store.revoke_local_session_v1(
                &first.raw_session_token,
                &first.raw_csrf_token,
                "2026-07-23T17:01:30Z",
                LocalSessionRevocationReasonV1::Recovery,
            ),
            Err(LocalSessionStoreErrorV1::InvalidInput)
        );

        let daemon_lease = acquire_local_daemon_database_lease_v1(&database.path)
            .expect("daemon lease must acquire");
        assert!(matches!(
            acquire_offline_owner_recovery_authority_v1(&database.path),
            Err(LocalOwnerRecoveryErrorV1::DatabaseBusy)
        ));
        drop(daemon_lease);

        let authority = acquire_offline_owner_recovery_authority_v1(&database.path)
            .expect("offline authority must acquire after daemon stops");
        let result = store
            .recover_local_owner_offline_v1(
                &authority,
                &LocalOwnerRecoveryInputV1 {
                    expected_owner_identity_ref: "identity:human:owner",
                    new_password: replacement_password,
                    recovered_at: "2026-07-23T17:02:00Z",
                },
            )
            .expect("offline recovery must persist");
        assert_eq!(
            result,
            LocalOwnerRecoveryResultV1 {
                identity_ref: "identity:human:owner".to_owned(),
                credential_version: 2,
                recovered_at: "2026-07-23T17:02:00Z".to_owned(),
                revoked_session_count: 2,
            }
        );
        assert_eq!(
            store
                .verify_local_password_credential_v1("identity:human:owner", current_password,)
                .expect("old password must reject safely"),
            LocalCredentialVerificationV1::Rejected
        );
        assert_eq!(
            store
                .verify_local_password_credential_v1("identity:human:owner", replacement_password,)
                .expect("replacement password must verify"),
            LocalCredentialVerificationV1::Verified
        );
        for issued in [&first, &second] {
            assert_eq!(
                store
                    .verify_local_session_v1(&issued.raw_session_token, "2026-07-23T17:02:01Z",)
                    .expect("recovered session family must reject"),
                LocalSessionVerificationV1::Rejected
            );
            let events = store
                .read_local_session_events_v1(&issued.session.session_id)
                .expect("session recovery events must read");
            assert_eq!(events.len(), 2);
            assert_eq!(events[1].event_kind, LocalSessionEventKindV1::Revoked);
            assert_eq!(events[1].actor_session_id, None);
            assert_eq!(events[1].revocation_reason.as_deref(), Some("recovery"));
        }
        let identity_events = store
            .read_local_identity_events_v1("identity:human:owner")
            .expect("owner recovery event must read");
        assert_eq!(identity_events.len(), 2);
        assert_eq!(
            identity_events[1].event_kind,
            LocalIdentityEventKindV1::OwnerRecovered
        );
        assert_eq!(identity_events[1].actor_session_id, None);
        assert_eq!(identity_events[1].credential_version, Some(2));
    }

    #[test]
    fn offline_owner_recovery_rejects_scope_reuse_and_nonmonotonic_input_atomically() {
        let first_database = TestDatabase::new("offline-owner-recovery-negative");
        let second_database = TestDatabase::new("offline-owner-recovery-other");
        let password = "correct horse battery staple";
        let mut first =
            SqliteStore::open(&first_database.path).expect("first database must bootstrap");
        first
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("first owner must bootstrap");
        let mut second =
            SqliteStore::open(&second_database.path).expect("second database must bootstrap");
        second
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("second owner must bootstrap");
        let authority = acquire_offline_owner_recovery_authority_v1(&first_database.path)
            .expect("first authority must acquire");

        assert_eq!(
            second.recover_local_owner_offline_v1(
                &authority,
                &LocalOwnerRecoveryInputV1 {
                    expected_owner_identity_ref: "identity:human:owner",
                    new_password: "replacement password for wrong database",
                    recovered_at: "2026-07-23T17:02:00Z",
                },
            ),
            Err(LocalOwnerRecoveryErrorV1::AuthorityRejected)
        );
        for input in [
            LocalOwnerRecoveryInputV1 {
                expected_owner_identity_ref: "identity:human:missing",
                new_password: "replacement bounded password",
                recovered_at: "2026-07-23T17:02:00Z",
            },
            LocalOwnerRecoveryInputV1 {
                expected_owner_identity_ref: "identity:human:owner",
                new_password: password,
                recovered_at: "2026-07-23T17:02:00Z",
            },
            LocalOwnerRecoveryInputV1 {
                expected_owner_identity_ref: "identity:human:owner",
                new_password: "replacement bounded password",
                recovered_at: "2026-07-23T17:00:00Z",
            },
        ] {
            assert!(
                first
                    .recover_local_owner_offline_v1(&authority, &input)
                    .is_err()
            );
        }
        assert_eq!(
            first
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_password_credentials
                     WHERE identity_ref = 'identity:human:owner'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rejected recovery count must inspect"),
            1
        );
        assert_eq!(
            first
                .read_local_identity_events_v1("identity:human:owner")
                .expect("bootstrap event must remain")
                .len(),
            1
        );
    }

    #[test]
    fn offline_owner_recovery_rolls_back_credential_and_audit_on_revocation_failure() {
        let database = TestDatabase::new("offline-owner-recovery-rollback");
        let password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(password))
            .expect("owner must bootstrap");
        let issued = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("owner session must issue");
        let authority = acquire_offline_owner_recovery_authority_v1(&database.path)
            .expect("offline authority must acquire");
        store
            .connection
            .execute_batch(
                "CREATE TEMP TRIGGER test_reject_recovery_revocation
                 BEFORE INSERT ON lnsat_local_session_revocations
                 WHEN NEW.reason = 'recovery'
                 BEGIN
                   SELECT RAISE(ABORT, 'injected recovery revocation failure');
                 END;",
            )
            .expect("failure trigger must install");

        assert_eq!(
            store.recover_local_owner_offline_v1(
                &authority,
                &LocalOwnerRecoveryInputV1 {
                    expected_owner_identity_ref: "identity:human:owner",
                    new_password: "replacement password after failure",
                    recovered_at: "2026-07-23T17:02:00Z",
                },
            ),
            Err(LocalOwnerRecoveryErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_password_credentials",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("credential rollback must inspect"),
            1
        );
        assert_eq!(
            store
                .read_local_identity_events_v1("identity:human:owner")
                .expect("identity events must remain")
                .len(),
            1
        );
        assert!(matches!(
            store
                .verify_local_session_v1(&issued.raw_session_token, "2026-07-23T17:02:00Z")
                .expect("session must remain active"),
            LocalSessionVerificationV1::Verified(_)
        ));
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn owner_disablement_is_permanent_scoped_atomic_and_fail_closed() {
        let database = TestDatabase::new("identity-disablement");
        let owner_password = "correct horse battery staple";
        let operator_password = "operator bounded password value";
        let auditor_password = "auditor bounded password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(owner_password))
            .expect("owner must bootstrap");
        let owner = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("owner session must issue");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    operator_password,
                    "2026-07-23T17:01:10Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:01:10Z",
            )
            .expect("operator must create");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:auditor",
                    "Local Auditor",
                    LocalIdentityRoleV1::Auditor,
                    auditor_password,
                    "2026-07-23T17:01:20Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:01:20Z",
            )
            .expect("auditor must create");
        let operator = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-23T17:01:30Z",
                "2026-07-23T17:31:30Z",
            ))
            .expect("operator session must issue");
        let auditor = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:auditor",
                auditor_password,
                "2026-07-23T17:01:40Z",
                "2026-07-23T17:31:40Z",
            ))
            .expect("auditor session must issue");

        assert_eq!(
            store.disable_local_identity_v1(
                "identity:human:operator",
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23 17:02:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::InvalidInput)
        );
        assert_eq!(
            store.disable_local_identity_v1(
                "identity:human:operator",
                &owner.raw_session_token,
                "wrong csrf",
                "2026-07-23T17:02:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store.disable_local_identity_v1(
                "identity:human:auditor",
                &operator.raw_session_token,
                &operator.raw_csrf_token,
                "2026-07-23T17:02:01Z",
            ),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_identity_status_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("status count must inspect"),
            0
        );

        let disabled = store
            .disable_local_identity_v1(
                "identity:human:operator",
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:02:02Z",
            )
            .expect("disablement must persist")
            .expect("active operator must disable");
        assert_eq!(
            disabled,
            LocalIdentityDisablementResultV1 {
                identity_ref: "identity:human:operator".to_owned(),
                status: LocalIdentityStatusV1::Disabled,
                changed_at: "2026-07-23T17:02:02Z".to_owned(),
                revoked_session_count: 1,
            }
        );
        assert_eq!(
            store
                .read_local_identity_v1("identity:human:operator")
                .expect("disabled identity must read")
                .expect("disabled identity must exist")
                .status,
            LocalIdentityStatusV1::Disabled
        );
        assert_eq!(
            store
                .verify_local_password_credential_v1("identity:human:operator", operator_password,),
            Ok(LocalCredentialVerificationV1::Rejected)
        );
        assert_eq!(
            store
                .verify_local_session_v1(&operator.raw_session_token, "2026-07-23T17:02:03Z")
                .expect("disabled session must reject"),
            LocalSessionVerificationV1::Rejected
        );
        assert!(matches!(
            store.issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-23T17:02:03Z",
                "2026-07-23T17:32:03Z",
            )),
            Err(LocalSessionStoreErrorV1::InvalidCredential)
        ));
        assert_eq!(
            store
                .disable_local_identity_v1(
                    "identity:human:operator",
                    &owner.raw_session_token,
                    &owner.raw_csrf_token,
                    "2026-07-23T17:02:03Z",
                )
                .expect("replay must reject safely"),
            None
        );
        assert_eq!(
            store
                .disable_local_identity_v1(
                    "identity:human:owner",
                    &owner.raw_session_token,
                    &owner.raw_csrf_token,
                    "2026-07-23T17:02:03Z",
                )
                .expect("owner target must reject safely"),
            None
        );
        assert_eq!(
            store
                .disable_local_identity_v1(
                    "identity:human:missing",
                    &owner.raw_session_token,
                    &owner.raw_csrf_token,
                    "2026-07-23T17:02:03Z",
                )
                .expect("missing target must reject safely"),
            None
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_identity_status_events
                     SET changed_at = '2026-07-23T17:02:03Z'
                     WHERE identity_ref = 'identity:human:operator'",
                    [],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_identity_status_events
                     WHERE identity_ref = 'identity:human:operator'",
                    [],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch(
                "CREATE TEMP TRIGGER test_reject_owner_revocation
                 BEFORE INSERT ON lnsat_local_session_revocations
                 WHEN NEW.reason = 'owner_revoke'
                 BEGIN
                   SELECT RAISE(ABORT, 'injected owner revocation failure');
                 END;",
            )
            .expect("failure trigger must install");
        assert_eq!(
            store.disable_local_identity_v1(
                "identity:human:auditor",
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:03:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .read_local_identity_v1("identity:human:auditor")
                .expect("auditor identity must read")
                .expect("auditor identity must exist")
                .status,
            LocalIdentityStatusV1::Active
        );
        assert!(matches!(
            store
                .verify_local_session_v1(&auditor.raw_session_token, "2026-07-23T17:03:01Z")
                .expect("auditor session must remain active"),
            LocalSessionVerificationV1::Verified(_)
        ));
    }

    #[test]
    fn disablement_evidence_survives_later_same_millisecond_actor_revocation() {
        let database = TestDatabase::new("identity-disablement-actor-revocation");
        let owner_password = "correct horse battery staple";
        let operator_password = "operator bounded password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(owner_password))
            .expect("owner must bootstrap");
        let owner = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("owner session must issue");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    operator_password,
                    "2026-07-23T17:01:10Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:01:10Z",
            )
            .expect("operator must create");
        store
            .disable_local_identity_v1(
                "identity:human:operator",
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:02:00Z",
            )
            .expect("operator disablement must persist")
            .expect("operator must disable");
        assert!(
            store
                .revoke_local_session_v1(
                    &owner.raw_session_token,
                    &owner.raw_csrf_token,
                    "2026-07-23T17:02:00Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("later same-millisecond sign-out must persist")
        );
        assert_eq!(
            store
                .read_local_identity_v1("identity:human:operator")
                .expect("disabled identity must remain readable")
                .expect("disabled identity must exist")
                .status,
            LocalIdentityStatusV1::Disabled
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn identity_audit_events_bind_create_rotate_disable_and_reopen() {
        let database = TestDatabase::new("identity-audit-events");
        let owner_password = "correct horse battery staple";
        let operator_password = "operator bounded password value";
        let rotated_password = "rotated operator password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(owner_password))
            .expect("owner must bootstrap");
        let owner_events = store
            .read_local_identity_events_v1("identity:human:owner")
            .expect("owner events must read");
        assert_eq!(owner_events.len(), 1);
        assert_eq!(
            owner_events[0].event_kind,
            LocalIdentityEventKindV1::OwnerBootstrapped
        );
        assert_eq!(owner_events[0].event_sequence, 1);
        assert_eq!(owner_events[0].actor_session_id, None);
        assert_eq!(owner_events[0].credential_version, Some(1));

        let owner = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("owner session must issue");
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    operator_password,
                    "2026-07-23T17:01:10Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:01:10Z",
            )
            .expect("operator must create");
        let operator = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-23T17:01:20Z",
                "2026-07-23T17:31:20Z",
            ))
            .expect("operator session must issue");
        store
            .rotate_local_password_credential_v1(
                &operator.raw_session_token,
                &operator.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password: operator_password,
                    new_password: rotated_password,
                    rotated_at: "2026-07-23T17:02:00Z",
                },
            )
            .expect("operator password must rotate");
        store
            .disable_local_identity_v1(
                "identity:human:operator",
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:03:00Z",
            )
            .expect("operator disablement must persist")
            .expect("operator must disable");

        let events = store
            .read_local_identity_events_v1("identity:human:operator")
            .expect("operator events must read");
        assert_eq!(events.len(), 3);
        assert_eq!(
            events
                .iter()
                .map(|event| (event.event_sequence, event.event_kind))
                .collect::<Vec<_>>(),
            vec![
                (1, LocalIdentityEventKindV1::IdentityCreated),
                (2, LocalIdentityEventKindV1::PasswordRotated),
                (3, LocalIdentityEventKindV1::IdentityDisabled),
            ]
        );
        assert_eq!(
            events[0].actor_session_id.as_deref(),
            Some(owner.session.session_id.as_str())
        );
        assert_eq!(
            events[1].actor_session_id.as_deref(),
            Some(operator.session.session_id.as_str())
        );
        assert_eq!(events[1].credential_version, Some(2));
        assert_eq!(
            events[2].actor_session_id.as_deref(),
            Some(owner.session.session_id.as_str())
        );
        assert_eq!(events[2].credential_version, None);
        assert!(
            events
                .iter()
                .all(|event| is_sha256_identity(&event.event_id)
                    && is_sha256_identity(&event.source_evidence_digest)
                    && is_sha256_identity(&event.event_evidence_digest))
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_local_identity_events
                     SET occurred_at = '2026-07-23T17:03:01Z'
                     WHERE identity_ref = 'identity:human:operator'
                       AND event_sequence = 3",
                    [],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_local_identity_events
                     WHERE identity_ref = 'identity:human:operator'",
                    [],
                )
                .is_err()
        );
        drop(store);

        let reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(
            reopened
                .read_local_identity_events_v1("identity:human:operator")
                .expect("reopened events must read"),
            events
        );
        reopened
            .connection
            .execute_batch("DROP TRIGGER lnsat_local_identity_events_reject_update;")
            .expect("test must remove immutable guard");
        reopened
            .connection
            .execute(
                "UPDATE lnsat_local_identity_events
                 SET source_evidence_digest = ?1
                 WHERE identity_ref = 'identity:human:operator'
                   AND event_sequence = 2",
                [format!("sha256:{}", "0".repeat(64))],
            )
            .expect("test must inject event drift");
        reopened
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_local_identity_events_reject_update
                 BEFORE UPDATE ON lnsat_local_identity_events
                 BEGIN
                   SELECT RAISE(ABORT, 'local identity events are immutable');
                 END;",
            )
            .expect("test must restore immutable guard");
        assert_eq!(
            reopened.read_local_identity_events_v1("identity:human:operator"),
            Err(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn identity_event_failure_rolls_back_identity_credential_and_activity() {
        let database = TestDatabase::new("identity-audit-event-rollback");
        let owner_password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(owner_password))
            .expect("owner must bootstrap");
        let owner = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-23T17:01:00Z",
                "2026-07-23T17:31:00Z",
            ))
            .expect("owner session must issue");
        store
            .connection
            .execute_batch(
                "CREATE TEMP TRIGGER test_reject_identity_audit_event
                 BEFORE INSERT ON lnsat_local_identity_events
                 WHEN NEW.event_kind = 'identity_created'
                 BEGIN
                   SELECT RAISE(ABORT, 'injected identity audit failure');
                 END;",
            )
            .expect("failure trigger must install");
        assert_eq!(
            store.create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    "operator bounded password value",
                    "2026-07-23T17:02:00Z",
                ),
                &owner.raw_session_token,
                &owner.raw_csrf_token,
                "2026-07-23T17:02:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_identities
                     WHERE identity_ref = 'identity:human:operator'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("identity count must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_password_credentials
                     WHERE identity_ref = 'identity:human:operator'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("credential count must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events
                     WHERE session_id = ?1",
                    [&owner.session.session_id],
                    |row| row.get::<_, i64>(0),
                )
                .expect("activity count must inspect"),
            1
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn fixed_roles_create_only_through_active_owner_and_sessions_bind_role() {
        assert!(
            LocalIdentityRoleV1::Owner.allows_control(LocalControlPermissionV1::ManageIdentities)
        );
        assert!(
            LocalIdentityRoleV1::Operator.allows_control(LocalControlPermissionV1::DecideApproval)
        );
        assert!(
            LocalIdentityRoleV1::Auditor.allows_control(LocalControlPermissionV1::ReadEvidence)
        );
        assert!(
            !LocalIdentityRoleV1::Operator
                .allows_control(LocalControlPermissionV1::ManageIdentities)
        );
        assert!(
            !LocalIdentityRoleV1::Auditor.allows_control(LocalControlPermissionV1::RequestAction)
        );
        assert!(
            !LocalIdentityRoleV1::Auditor.allows_control(LocalControlPermissionV1::DecideApproval)
        );

        let database = TestDatabase::new("local-role-sessions");
        let owner_password = "correct horse battery staple";
        let operator_password = "bounded operator password value";
        let auditor_password = "read only auditor password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&owner_bootstrap_input(owner_password))
            .expect("owner must bootstrap");
        let owner_session = store
            .issue_local_owner_session_v1(&owner_session_input(owner_password))
            .expect("owner session must issue");

        let operator = store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Local Operator",
                    LocalIdentityRoleV1::Operator,
                    operator_password,
                    "2026-07-23T17:02:00Z",
                ),
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-23T17:02:00Z",
            )
            .expect("owner must create operator");
        assert_eq!(operator.identity.role, LocalIdentityRoleV1::Operator);
        let auditor = store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:auditor",
                    "Local Auditor",
                    LocalIdentityRoleV1::Auditor,
                    auditor_password,
                    "2026-07-23T17:03:00Z",
                ),
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-23T17:03:00Z",
            )
            .expect("owner must create auditor");
        assert_eq!(auditor.identity.role, LocalIdentityRoleV1::Auditor);

        let operator_session = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-23T17:03:30Z",
                "2026-07-23T17:08:30Z",
            ))
            .expect("operator session must issue");
        assert_eq!(operator_session.session.role, LocalIdentityRoleV1::Operator);
        assert_eq!(
            store
                .verify_local_owner_session_v1(
                    &operator_session.raw_session_token,
                    "2026-07-23T17:04:00Z",
                )
                .expect("operator must not widen to owner"),
            LocalSessionVerificationV1::Rejected
        );
        assert_eq!(
            store.create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:forbidden",
                    "Forbidden Identity",
                    LocalIdentityRoleV1::Auditor,
                    "another bounded password value",
                    "2026-07-23T17:04:00Z",
                ),
                &operator_session.raw_session_token,
                &operator_session.raw_csrf_token,
                "2026-07-23T17:04:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store.create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:second-owner",
                    "Second Owner",
                    LocalIdentityRoleV1::Owner,
                    "another bounded password value",
                    "2026-07-23T17:04:00Z",
                ),
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-23T17:04:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::InvalidInput)
        );
        assert_eq!(
            store.create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:operator",
                    "Duplicate Operator",
                    LocalIdentityRoleV1::Operator,
                    "another bounded password value",
                    "2026-07-23T17:04:00Z",
                ),
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-23T17:04:00Z",
            ),
            Err(LocalIdentityStoreErrorV1::IdentityAlreadyExists)
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn approval_request_append_requires_exact_active_requester_session_and_csrf() {
        let database = TestDatabase::new("authenticated-approval-request");
        let owner_password = "correct horse battery staple";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
                created_at: "2026-07-22T19:00:00Z",
                ..owner_bootstrap_input(owner_password)
            })
            .expect("owner must bootstrap");
        let owner_session = store
            .issue_local_owner_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-22T19:50:00Z",
                "2026-07-22T20:10:00Z",
            ))
            .expect("owner session must issue");
        let mut packet = packet_fixture();
        packet.actor_ref = owner_session.session.identity_ref.clone();
        packet.session_ref = format!("session:local:{}", owner_session.session.session_id);
        packet.permission_allow = vec!["deploy.request".to_owned()];
        let policy = policy_fixture(&packet);
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");

        assert_eq!(
            store.append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &owner_session.raw_session_token,
                "wrong-csrf-token",
                "2026-07-22T20:00:30Z",
            ),
            Err(ApprovalRequestStoreErrorV1::AuthorizationRejected)
        );
        let replacement_session = store
            .issue_local_owner_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-22T20:00:31Z",
                "2026-07-22T20:10:00Z",
            ))
            .expect("replacement owner session must issue");
        assert_eq!(
            store.append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &replacement_session.raw_session_token,
                &replacement_session.raw_csrf_token,
                "2026-07-22T20:00:32Z",
            ),
            Err(ApprovalRequestStoreErrorV1::AuthorizationRejected)
        );
        let auditor_password = "read only auditor password value";
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    "identity:human:auditor",
                    "Local Auditor",
                    LocalIdentityRoleV1::Auditor,
                    auditor_password,
                    "2026-07-22T20:00:33Z",
                ),
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-22T20:00:33Z",
            )
            .expect("owner must create auditor");
        let auditor_session = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:auditor",
                auditor_password,
                "2026-07-22T20:00:34Z",
                "2026-07-22T20:10:00Z",
            ))
            .expect("auditor session must issue");
        assert_eq!(
            store.append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &auditor_session.raw_session_token,
                &auditor_session.raw_csrf_token,
                "2026-07-22T20:00:35Z",
            ),
            Err(ApprovalRequestStoreErrorV1::AuthorizationRejected)
        );

        let created = store
            .append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-22T20:01:00Z",
            )
            .expect("bound owner request must append");
        assert!(created.created);
        assert_eq!(created.record.request.requester_ref, packet.actor_ref);
        assert_eq!(created.record.request.session_ref, packet.session_ref);
        assert_eq!(
            created.record.request.policy_decision_ref.decision_id,
            policy.decision_id
        );
        assert_eq!(created.record.request.requested_at, "2026-07-22T20:01:00Z");
        assert!(created.record.request.side_effects.is_empty());

        let replay = store
            .append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-22T20:01:00Z",
            )
            .expect("exact request must replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);

        let different_time = store
            .append_authenticated_approval_request_v1(
                &policy.project_ref,
                &policy.decision_id,
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-22T20:02:00Z",
            )
            .expect("different server-owned time must append a distinct request");
        assert!(different_time.created);
        assert_ne!(
            different_time.record.request.approval_request_id,
            created.record.request.approval_request_id
        );
        assert_eq!(
            different_time.record.request.requested_at,
            "2026-07-22T20:02:00Z"
        );

        let activity_count_before_denial = store
            .connection
            .query_row(
                "SELECT count(*) FROM lnsat_local_session_activity_events",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("activity count must inspect");
        let request_count_before_denial = store
            .connection
            .query_row("SELECT count(*) FROM lnsat_approval_requests", [], |row| {
                row.get::<_, i64>(0)
            })
            .expect("request count must inspect");
        assert_eq!(request_count_before_denial, 2);
        assert_eq!(
            store.append_authenticated_approval_request_v1(
                "project:other",
                &policy.decision_id,
                &owner_session.raw_session_token,
                &owner_session.raw_csrf_token,
                "2026-07-22T20:03:01Z",
            ),
            Err(ApprovalRequestStoreErrorV1::InvalidRequest)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("activity count must inspect"),
            activity_count_before_denial
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_approval_requests", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("request count must inspect"),
            request_count_before_denial
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn approval_append_requires_matching_active_approver_role_session_and_csrf() {
        let database = TestDatabase::new("authenticated-approval");
        let owner_password = "correct horse battery staple";
        let operator_password = "bounded operator password value";
        let auditor_password = "read only auditor password value";
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let owner_input = LocalOwnerBootstrapInputV1 {
            created_at: "2026-07-22T19:00:00Z",
            ..owner_bootstrap_input(owner_password)
        };
        store
            .bootstrap_local_owner_v1(&owner_input)
            .expect("owner must bootstrap");
        let owner_session = store
            .issue_local_owner_session_v1(&local_session_input(
                "identity:human:owner",
                owner_password,
                "2026-07-22T19:50:00Z",
                "2026-07-22T20:10:00Z",
            ))
            .expect("owner session must issue");
        for (identity_ref, display_name, role, password, created_at) in [
            (
                "identity:human:operator",
                "Local Operator",
                LocalIdentityRoleV1::Operator,
                operator_password,
                "2026-07-22T19:51:00Z",
            ),
            (
                "identity:human:auditor",
                "Local Auditor",
                LocalIdentityRoleV1::Auditor,
                auditor_password,
                "2026-07-22T19:52:00Z",
            ),
        ] {
            store
                .create_local_identity_v1(
                    &local_identity_create_input(
                        identity_ref,
                        display_name,
                        role,
                        password,
                        created_at,
                    ),
                    &owner_session.raw_session_token,
                    &owner_session.raw_csrf_token,
                    created_at,
                )
                .expect("owner must create bounded identity");
        }
        let revoked_operator_session = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-22T19:53:00Z",
                "2026-07-22T20:08:00Z",
            ))
            .expect("operator session must issue");
        let auditor_session = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:auditor",
                auditor_password,
                "2026-07-22T19:53:00Z",
                "2026-07-22T20:08:00Z",
            ))
            .expect("auditor session must issue");

        let (packet, policy, request) = approval_request_fixture();
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("request must append");
        let decision_for = |identity_ref: &str, session_id: &str| {
            decide_approval_request_v1(
                &request,
                &ApprovalDecisionV1Input {
                    approver_ref: identity_ref.to_owned(),
                    approver_session_ref: format!("session:local:{session_id}"),
                    decision: ApprovalDecisionV1Kind::Approved,
                    reason: ApprovalDecisionV1Reason::OperatorApproved,
                    decided_at: "2026-07-22T20:02:00Z".to_owned(),
                },
            )
            .expect("distinct human decision must derive")
        };
        let auditor_decision = decision_for(
            "identity:human:auditor",
            &auditor_session.session.session_id,
        );
        assert_eq!(
            store.append_authenticated_approval_decision_v1(
                &auditor_decision,
                &auditor_session.raw_session_token,
                &auditor_session.raw_csrf_token,
                "2026-07-22T20:02:00Z",
            ),
            Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected)
        );

        let revoked_decision = decision_for(
            "identity:human:operator",
            &revoked_operator_session.session.session_id,
        );
        assert!(
            store
                .revoke_local_session_v1(
                    &revoked_operator_session.raw_session_token,
                    &revoked_operator_session.raw_csrf_token,
                    "2026-07-22T20:01:30Z",
                    LocalSessionRevocationReasonV1::OwnerRevoke,
                )
                .expect("operator session must revoke")
        );
        assert_eq!(
            store.append_authenticated_approval_decision_v1(
                &revoked_decision,
                &revoked_operator_session.raw_session_token,
                &revoked_operator_session.raw_csrf_token,
                "2026-07-22T20:02:00Z",
            ),
            Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected)
        );
        let operator_session = store
            .issue_local_session_v1(&local_session_input(
                "identity:human:operator",
                operator_password,
                "2026-07-22T20:01:31Z",
                "2026-07-22T20:08:00Z",
            ))
            .expect("replacement operator session must issue");
        let operator_decision = decision_for(
            "identity:human:operator",
            &operator_session.session.session_id,
        );
        assert_eq!(
            store.append_authenticated_approval_decision_v1(
                &operator_decision,
                &operator_session.raw_session_token,
                "wrong csrf value",
                "2026-07-22T20:02:00Z",
            ),
            Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store.append_authenticated_approval_decision_v1(
                &operator_decision,
                &operator_session.raw_session_token,
                &operator_session.raw_csrf_token,
                "2026-07-22T20:02:00.001Z",
            ),
            Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected)
        );
        let mut substituted = operator_decision.clone();
        substituted.approver_session_ref =
            format!("session:local:{}", auditor_session.session.session_id);
        assert_eq!(
            store.append_authenticated_approval_decision_v1(
                &substituted,
                &operator_session.raw_session_token,
                &operator_session.raw_csrf_token,
                "2026-07-22T20:02:00Z",
            ),
            Err(ApprovalDecisionStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_approval_decisions", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("rejected decisions must not persist"),
            0
        );

        let created = store
            .append_authenticated_approval_decision_v1(
                &operator_decision,
                &operator_session.raw_session_token,
                &operator_session.raw_csrf_token,
                "2026-07-22T20:02:00Z",
            )
            .expect("authenticated operator decision must append");
        assert!(created.created);
        assert!(created.record.decision.approval_gate_satisfied);
        assert!(!created.record.decision.execution_authorized);
        let replay = store
            .append_authenticated_approval_decision_v1(
                &operator_decision,
                &operator_session.raw_session_token,
                &operator_session.raw_csrf_token,
                "2026-07-22T20:02:00Z",
            )
            .expect("exact authenticated replay must resolve");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);
    }

    #[test]
    fn phase7_core_schema_fresh_upgrade_and_reopen_converge() {
        let fresh_database = TestDatabase::new("phase7-core-fresh");
        let upgraded_database = TestDatabase::new("phase7-core-upgraded");

        let fresh = SqliteStore::open(&fresh_database.path).expect("fresh v17 must bootstrap");
        assert_eq!(
            fresh
                .state()
                .expect("fresh state must inspect")
                .schema_version,
            17
        );
        let fresh_manifest = sqlite_schema_manifest(&fresh.connection);
        fresh.verify_schema().expect("fresh schema must verify");
        drop(fresh);

        create_version_fifteen_database(&upgraded_database.path);
        let pending = SqliteStore::inspect_recovery_state_v1(&upgraded_database.path)
            .expect("v15 recovery state must inspect");
        assert_eq!(
            pending.disposition,
            SqliteRecoveryDispositionV1::MigrationPending
        );
        assert_eq!(pending.schema_version, Some(15));
        assert_eq!(pending.migration_count, Some(15));

        let upgraded =
            SqliteStore::open(&upgraded_database.path).expect("v15 database must upgrade to v17");
        let state = upgraded.state().expect("upgraded state must inspect");
        assert_eq!(state.schema_version, 17);
        assert_eq!(state.migration_count, 17);
        assert_eq!(sqlite_schema_manifest(&upgraded.connection), fresh_manifest);
        assert_eq!(
            upgraded
                .connection
                .query_row(
                    "SELECT migration_id FROM lnsat_schema_migrations
                     WHERE schema_version = 16",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .expect("v16 migration must inspect"),
            "0016_phase7_core_persistence"
        );
        assert_eq!(
            upgraded
                .connection
                .query_row(
                    "SELECT migration_id FROM lnsat_schema_migrations
                     WHERE schema_version = 17",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .expect("v17 migration must inspect"),
            "0017_phase7_core_semantics_correction"
        );
        upgraded
            .verify_schema()
            .expect("upgraded schema must verify");
        drop(upgraded);

        SqliteStore::open(&upgraded_database.path)
            .expect("upgraded v17 must reopen")
            .verify_schema()
            .expect("reopened v17 must verify");
    }

    #[test]
    fn interrupted_phase7_core_migration_rolls_back_then_recovers() {
        let database = TestDatabase::new("phase7-core-migration-interrupted");
        create_version_fifteen_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("v15 database must open");
        configure_connection(&connection).expect("v15 database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[15], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("version must inspect"),
            15
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT schema_version FROM lnsat_store_metadata WHERE singleton = 1",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("metadata must inspect"),
            15
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM lnsat_schema_migrations WHERE schema_version = 16",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("migration ledger must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE name = 'lnsat_phase7_entities'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back schema must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("v15 retention must inspect"),
            i64::try_from(RETENTION_RECORD_FAMILIES_V15.len()).expect("count must fit")
        );
        drop(connection);

        let recovered = SqliteStore::open(&database.path).expect("migrations must recover");
        assert_eq!(
            recovered
                .state()
                .expect("state must inspect")
                .schema_version,
            17
        );
        recovered
            .verify_schema()
            .expect("recovered v17 must verify");
    }

    #[test]
    fn interrupted_phase7_core_semantics_correction_rolls_back_then_recovers() {
        let database = TestDatabase::new("phase7-core-semantics-interrupted");
        create_version_sixteen_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("v16 database must open");
        configure_connection(&connection).expect("v16 database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[16], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("version must inspect"),
            16
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT schema_version FROM lnsat_store_metadata WHERE singleton = 1",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("metadata must inspect"),
            16
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM lnsat_schema_migrations WHERE schema_version = 17",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("migration ledger must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'index'
                       AND name = 'lnsat_execution_authorizations_approval_decision_unique_idx'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back index must inspect"),
            0
        );
        drop(connection);

        let recovered = SqliteStore::open(&database.path).expect("v17 migration must recover");
        assert_eq!(
            recovered
                .state()
                .expect("state must inspect")
                .schema_version,
            17
        );
        recovered
            .verify_schema()
            .expect("recovered v17 must verify");
    }

    #[test]
    fn phase7_core_semantics_correction_preserves_recovery_events() {
        let database = TestDatabase::new("phase7-core-semantics-recovery-event-copy");
        create_version_sixteen_database(&database.path);
        let connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("v16 database must open");
        connection
            .execute(
                "INSERT INTO lnsat_recovery_inspection_events (
                   event_id, schema_id, deployment_ref, target_ref,
                   target_path_sha256, idempotency_key, observed_at,
                   disposition, observed_schema_version,
                   observed_migration_count, integrity_ok,
                   quarantine_recommended, inspection_mode,
                   automatic_action, activation_authorized
                 ) VALUES (
                   ?1, 'lnsat.sqlite_recovery_inspection_event.schema.v1_0',
                   'deployment:local:test', 'database:local:primary', ?2,
                   'inspection:before-v17', '2026-07-22T20:09:00Z',
                   'migration_pending', 16, 16, 1, 0, 'read_only', 'none', 0
                 )",
                params![
                    format!("sha256:{}", "a".repeat(64)),
                    format!("sha256:{}", "b".repeat(64)),
                ],
            )
            .expect("v16 recovery event must seed");
        drop(connection);

        let migrated = SqliteStore::open(&database.path).expect("v16 database must migrate");
        let preserved = migrated
            .connection
            .query_row(
                "SELECT disposition, observed_schema_version
                 FROM lnsat_recovery_inspection_events",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
            )
            .expect("recovery event must survive migration");
        assert_eq!(preserved, ("migration_pending".to_owned(), 16));
        migrated
            .verify_schema()
            .expect("migrated recovery schema must verify");
    }

    #[test]
    fn phase7_core_semantics_correction_refuses_to_discard_v16_receipts() {
        let database = TestDatabase::new("phase7-core-semantics-receipt-guard");
        create_version_sixteen_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("v16 database must open");
        connection
            .pragma_update(None, "foreign_keys", false)
            .expect("isolated migration fixture must disable foreign keys");
        connection
            .execute(
                "INSERT INTO lnsat_operation_receipts (
                   receipt_id, entity_kind, project_ref, resource_ref,
                   operation_id, operation_attempt_id, authorization_id,
                   consumption_id, requested_action_digest,
                   approved_action_digest, authorized_action_digest,
                   executed_action_digest, result_digest,
                   receipt_authentication_profile, verification_status,
                   digest_bound, received_at
                 ) VALUES (
                   'rcp_existing', 'operation_receipt', 'project:test',
                   'resource:test', 'opr_existing', 'opa_existing',
                   'exa_existing', 'con_existing', zeroblob(32),
                   zeroblob(32), zeroblob(32), zeroblob(32), zeroblob(32),
                   'local_authenticated_adapter_channel', 'rejected', 0,
                   '2026-07-22T20:04:00Z'
                 )",
                [],
            )
            .expect("v16 rejected receipt fixture must insert");

        assert_eq!(
            apply_migration(&mut connection, MIGRATIONS[16]),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("version must inspect"),
            16
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_operation_receipts", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("receipt must survive failed migration"),
            1
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn phase7_core_semantics_correction_preserves_legacy_v16_attempts() {
        let database = TestDatabase::new("phase7-core-semantics-legacy-attempt-guard");
        create_version_sixteen_database(&database.path);
        let connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("v16 database must open");
        configure_connection(&connection).expect("v16 database must configure");
        let mut store = SqliteStore {
            database_path: database.path.clone(),
            connection,
            authentication_dummy_verifier: LOCAL_AUTHENTICATION_DUMMY_VERIFIER_V1.to_owned(),
        };
        let (packet, policy, request, decision) = approval_decision_fixture();
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        let fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 91);
        let mut record = Phase7AuthorizationAttemptRecordV1 {
            authorization_attempt_id: fixture.authorization_attempt_id.clone(),
            audit_binding_id: fixture.audit_binding_id.clone(),
            project_ref: fixture.project_ref.clone(),
            resource_ref: fixture.resource_ref.clone(),
            approval_decision_id: fixture.approval_decision_id.clone(),
            approval_request_id: fixture.approval_request_id.clone(),
            policy_decision_id: fixture.policy_decision_id.clone(),
            packet_id: fixture.packet_id.clone(),
            packet_sha256: fixture.packet_sha256.clone(),
            requester_ref: request.requester_ref.clone(),
            requester_session_ref: request.session_ref.clone(),
            approver_ref: decision.approver_ref.clone(),
            approver_session_ref: decision.approver_session_ref.clone(),
            idempotency_key: fixture.idempotency_key.clone(),
            request_digest: fixture.request_digest,
            binding_digest: [0; 32],
            action_digest: fixture.action_digest,
            target_digest: fixture.target_digest,
            configuration_digest: fixture.configuration_digest,
            adapter_ref: fixture.adapter_ref.clone(),
            executable_digest: fixture.executable_digest,
            audience: fixture.audience.clone(),
            requested_at: fixture.requested_at.clone(),
            expires_at: fixture.expires_at.clone(),
            result_status: "persistence_prepared".to_owned(),
            execution_authorized: false,
        };
        record.binding_digest = phase7_persistence::digest_fields(
            "lnsat.phase7.authorization-binding.v1",
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
        );
        let record_digest = phase7_persistence::digest_fields(
            "lnsat.phase7.authorization-attempt-record.v1",
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
        );
        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("legacy v16 transaction must start");
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
            .expect("legacy entity must insert");
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
            .expect("legacy audit binding must insert");
        transaction
            .execute(
                "INSERT INTO lnsat_authorization_attempts (
                   authorization_attempt_id, entity_kind, project_ref,
                   resource_ref, approval_decision_id, approval_request_id,
                   policy_decision_id, packet_id, packet_sha256, requester_ref,
                   requester_session_ref, approver_ref, approver_session_ref,
                   idempotency_key, request_digest, binding_digest,
                   action_digest, target_digest, configuration_digest,
                   adapter_ref, executable_digest, audience, requested_at,
                   expires_at, result_status, execution_authorized
                 ) VALUES (
                   ?1, 'authorization_attempt', ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                   ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
                   ?20, ?21, ?22, ?23, 'persistence_prepared', 0
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
                ],
            )
            .expect("legacy v16 attempt must insert");
        transaction
            .commit()
            .expect("legacy v16 attempt must commit");
        verify_schema_at_version(&store.connection, 16)
            .expect("valid legacy v16 evidence must not be mislabeled as drift");
        drop(store);

        let legacy = SqliteStore::inspect_recovery_state_v1(&database.path)
            .expect("valid legacy v16 evidence must inspect");
        assert_eq!(
            legacy.disposition,
            SqliteRecoveryDispositionV1::LegacyPhase7Evidence
        );
        assert!(legacy.integrity_ok);
        assert!(!legacy.is_migration_eligible());
        assert!(!legacy.quarantine_recommended());
        let observer_database = TestDatabase::new("phase7-legacy-recovery-observer");
        let mut observer_store =
            SqliteStore::open(&observer_database.path).expect("v17 observer must bootstrap");
        let observed_event = observer_store
            .append_recovery_inspection_event_v1(&recovery_inspection_event_input(
                &database.path,
                "inspection:phase7-legacy-evidence",
                "2026-07-22T20:09:00Z",
            ))
            .expect("legacy-evidence disposition must persist in v17");
        assert_eq!(
            observed_event.record.event.disposition,
            SqliteRecoveryDispositionV1::LegacyPhase7Evidence
        );

        assert_eq!(
            SqliteStore::open(&database.path).err(),
            Some(SqliteStoreError::MigrationFailed),
            "automatic correction must fail closed without rewriting legacy evidence"
        );
        let connection =
            Connection::open(&database.path).expect("guarded v16 database must reopen");
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("version must inspect"),
            16
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM lnsat_authorization_attempts",
                    [],
                    |row| { row.get::<_, i64>(0) }
                )
                .expect("legacy attempt must survive"),
            1
        );
        connection
            .execute_batch(
                "DROP TRIGGER lnsat_authorization_attempts_reject_update;
                 UPDATE lnsat_authorization_attempts
                 SET result_status = 'failed';
                 CREATE TRIGGER lnsat_authorization_attempts_reject_update
                 BEFORE UPDATE ON lnsat_authorization_attempts
                 BEGIN
                   SELECT RAISE(ABORT, 'authorization attempts are immutable');
                 END;",
            )
            .expect("isolated legacy drift must inject and restore trigger");
        drop(connection);
        let drift = SqliteStore::inspect_recovery_state_v1(&database.path)
            .expect("tampered legacy v16 evidence must inspect");
        assert_eq!(
            drift.disposition,
            SqliteRecoveryDispositionV1::MigrationDrift
        );
        assert!(!drift.integrity_ok);
        assert!(drift.quarantine_recommended());
    }

    #[test]
    fn phase7_core_semantics_enforce_one_authorization_and_accepted_receipt_only() {
        let database = TestDatabase::new("phase7-core-semantics-constraints");
        let store = SqliteStore::open(&database.path).expect("v17 database must bootstrap");
        store
            .connection
            .pragma_update(None, "foreign_keys", false)
            .expect("isolated schema test must disable foreign keys");
        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_execution_authorizations_enforce_attempt_binding;")
            .expect("isolated index and receipt test must remove binding trigger");

        let authorization_insert =
            |authorization_id: &str, attempt_id: &str, nonce_id: &str, capability_byte: u8| {
                store.connection.execute(
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
                   ?1, 'execution_authorization', 'project:test', 'resource:test',
                   ?2, ?3, zeroblob(32), ?4, ?5, 'pkt_test', ?6,
                   'identity:human:requester', 'session:local:requester',
                   'identity:human:approver', 'session:local:approver',
                   zeroblob(32), zeroblob(32), zeroblob(32), 'adapter:test@v1',
                   zeroblob(32), 'audience:test', ?7,
                   'server_record_plus_digest_stored_one_time_capability',
                   '2026-07-22T20:03:00Z', '2026-07-22T20:08:00Z'
                 )",
                    params![
                        authorization_id,
                        attempt_id,
                        nonce_id,
                        format!("apd_{}", "a".repeat(64)),
                        format!("pol_{}", "b".repeat(64)),
                        format!("sha256:{}", "c".repeat(64)),
                        vec![capability_byte; 32],
                    ],
                )
            };
        authorization_insert("exa_one", "aat_one", "non_one", 1)
            .expect("first authorization must fit schema");
        assert!(
            authorization_insert("exa_two", "aat_two", "non_two", 2).is_err(),
            "same approval decision must not create second authorization"
        );

        let receipt_insert = |receipt_id: &str, status: &str, digest_bound: i64| {
            store.connection.execute(
                "INSERT INTO lnsat_operation_receipts (
                   receipt_id, entity_kind, project_ref, resource_ref,
                   operation_id, operation_attempt_id, authorization_id,
                   consumption_id, requested_action_digest,
                   approved_action_digest, authorized_action_digest,
                   executed_action_digest, result_digest,
                   receipt_authentication_profile, verification_status,
                   digest_bound, received_at
                 ) VALUES (
                   ?1, 'operation_receipt', 'project:test', 'resource:test',
                   'opr_test', 'opa_test', 'exa_one', 'con_test',
                   zeroblob(32), zeroblob(32), zeroblob(32), zeroblob(32),
                   zeroblob(32), 'local_authenticated_adapter_channel',
                   ?2, ?3, '2026-07-22T20:04:00Z'
                 )",
                params![receipt_id, status, digest_bound],
            )
        };
        assert!(
            receipt_insert("rcp_rejected", "rejected", 0).is_err(),
            "rejected observation must not occupy canonical receipt table"
        );
        receipt_insert("rcp_accepted", "accepted", 1)
            .expect("delayed accepted receipt must retain canonical slot");
        assert!(
            receipt_insert("rcp_second", "accepted", 1).is_err(),
            "canonical receipt remains zero-or-one"
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn phase7_execution_authorization_binds_authoritative_attempt_approval() {
        let database = TestDatabase::new("phase7-authorization-attempt-binding");
        let store = SqliteStore::open(&database.path).expect("v17 database must bootstrap");
        store
            .connection
            .pragma_update(None, "foreign_keys", false)
            .expect("isolated parent fixtures must disable foreign keys");

        let approval_a = format!("apd_{}", "a".repeat(64));
        let approval_b = format!("apd_{}", "b".repeat(64));
        let approval_fake = format!("apd_{}", "f".repeat(64));
        let policy_id = format!("pol_{}", "c".repeat(64));
        let packet_sha256 = format!("sha256:{}", "d".repeat(64));
        let seed_parent = |sequence: u8, approval_decision_id: &str| {
            let attempt_id = format!("aat_{sequence:064x}");
            let nonce_id = format!("non_{sequence:064x}");
            store
                .connection
                .execute(
                    "INSERT INTO lnsat_authorization_attempts (
                       authorization_attempt_id, entity_kind, project_ref,
                       resource_ref, approval_decision_id, approval_request_id,
                       policy_decision_id, packet_id, packet_sha256,
                       requester_ref, requester_session_ref, approver_ref,
                       approver_session_ref, idempotency_key, request_digest,
                       binding_digest, action_digest, target_digest,
                       configuration_digest, adapter_ref, executable_digest,
                       audience, requested_at, expires_at, result_status,
                       execution_authorized
                     ) VALUES (
                       ?1, 'authorization_attempt', 'project:test',
                       'resource:test', ?2, ?3, ?4, 'pkt_test', ?5,
                       'identity:human:requester', 'session:local:requester',
                       'identity:human:approver', 'session:local:approver',
                       ?6, zeroblob(32), zeroblob(32), zeroblob(32),
                       zeroblob(32), zeroblob(32), 'adapter:test@v1',
                       zeroblob(32), 'audience:test',
                       '2026-07-22T20:03:00Z', '2026-07-22T20:08:00Z',
                       'persistence_prepared', 0
                     )",
                    params![
                        &attempt_id,
                        approval_decision_id,
                        format!("apr_{sequence:064x}"),
                        &policy_id,
                        &packet_sha256,
                        format!("binding-test-{sequence}"),
                    ],
                )
                .expect("attempt parent must seed");
            store
                .connection
                .execute(
                    "INSERT INTO lnsat_authorization_nonces (
                       nonce_id, entity_kind, project_ref, resource_ref,
                       authorization_attempt_id, binding_digest, nonce_digest,
                       issued_at, expires_at
                     ) VALUES (
                       ?1, 'authorization_nonce', 'project:test',
                       'resource:test', ?2, zeroblob(32), ?3,
                       '2026-07-22T20:03:00Z', '2026-07-22T20:08:00Z'
                     )",
                    params![&nonce_id, &attempt_id, vec![sequence; 32]],
                )
                .expect("nonce parent must seed");
            (attempt_id, nonce_id)
        };
        let parent_one = seed_parent(1, &approval_a);
        let parent_two = seed_parent(2, &approval_a);
        let parent_three = seed_parent(3, &approval_b);
        let authorization_ids = [
            format!("xau_{:064x}", 1),
            format!("xau_{:064x}", 2),
            format!("xau_{:064x}", 3),
        ];
        for (sequence, authorization_id) in authorization_ids.iter().enumerate() {
            store
                .connection
                .execute(
                    "INSERT INTO lnsat_phase7_entities (
                       entity_id, entity_kind, project_ref, resource_ref,
                       audit_binding_id, record_digest, created_at
                     ) VALUES (
                       ?1, 'execution_authorization', 'project:test',
                       'resource:test', ?2, zeroblob(32),
                       '2026-07-22T20:03:00Z'
                     )",
                    params![authorization_id, format!("p7a_{:064x}", sequence + 1_000),],
                )
                .expect("authorization entity must seed");
        }
        store
            .connection
            .pragma_update(None, "foreign_keys", true)
            .expect("binding assertions must enable foreign keys");
        assert_eq!(
            pragma_i64(&store.connection, "foreign_keys").expect("foreign keys must inspect"),
            1
        );

        let authorization_write = |replace: bool,
                                   authorization_id: &str,
                                   attempt_id: &str,
                                   nonce_id: &str,
                                   approval_decision_id: &str,
                                   capability_byte: u8| {
            let insert = if replace {
                "INSERT OR REPLACE"
            } else {
                "INSERT"
            };
            store.connection.execute(
                &format!(
                    "{insert} INTO lnsat_execution_authorizations (
                   authorization_id, entity_kind, project_ref, resource_ref,
                   authorization_attempt_id, nonce_id, binding_digest,
                   approval_decision_id, policy_decision_id, packet_id,
                   packet_sha256, requester_ref, requester_session_ref,
                   approver_ref, approver_session_ref, action_digest,
                   target_digest, configuration_digest, adapter_ref,
                   executable_digest, audience, capability_digest,
                   authorization_profile, issued_at, expires_at
                 ) VALUES (
                   ?1, 'execution_authorization', 'project:test',
                   'resource:test', ?2, ?3, zeroblob(32), ?4, ?5,
                   'pkt_test', ?6, 'identity:human:requester',
                   'session:local:requester', 'identity:human:approver',
                   'session:local:approver', zeroblob(32), zeroblob(32),
                   zeroblob(32), 'adapter:test@v1', zeroblob(32),
                   'audience:test', ?7,
                   'server_record_plus_digest_stored_one_time_capability',
                   '2026-07-22T20:03:00Z', '2026-07-22T20:08:00Z'
                 )"
                ),
                params![
                    authorization_id,
                    attempt_id,
                    nonce_id,
                    approval_decision_id,
                    &policy_id,
                    &packet_sha256,
                    vec![capability_byte; 32],
                ],
            )
        };
        authorization_write(
            false,
            &authorization_ids[0],
            &parent_one.0,
            &parent_one.1,
            &approval_a,
            1,
        )
        .expect("exact attempt-bound authorization must fit schema");
        assert!(
            authorization_write(
                false,
                &authorization_ids[1],
                &parent_two.0,
                &parent_two.1,
                &approval_a,
                2,
            )
            .is_err(),
            "second exact authorization for one approval must fail"
        );
        store
            .connection
            .pragma_update(None, "recursive_triggers", false)
            .expect("isolated v17 insert-guard proof must disable recursive triggers");
        assert_eq!(
            pragma_i64(&store.connection, "recursive_triggers")
                .expect("recursive trigger mode must inspect"),
            0,
            "regression must cover SQLite replacement with recursive delete triggers disabled"
        );
        let replace = authorization_write(
            true,
            &authorization_ids[1],
            &parent_two.0,
            &parent_two.1,
            &approval_a,
            2,
        )
        .expect_err("INSERT OR REPLACE must not erase historical authorization evidence");
        assert!(
            replace
                .to_string()
                .contains("execution authorization approval already bound")
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT authorization_id FROM lnsat_execution_authorizations",
                    [],
                    |row| row.get::<_, String>(0),
                )
                .expect("original authorization must remain"),
            authorization_ids[0]
        );
        let mismatch = authorization_write(
            false,
            &authorization_ids[2],
            &parent_three.0,
            &parent_three.1,
            &approval_fake,
            3,
        )
        .expect_err("caller-claimed approval must match authoritative attempt");
        assert!(
            mismatch
                .to_string()
                .contains("execution authorization binding mismatch")
        );
    }

    #[test]
    fn phase7_authorization_attempt_append_reopen_read_replay_stays_inert() {
        let database = TestDatabase::new("phase7-attempt-reopen");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 1);
        fixture.requested_at = "2026-07-22T20:02:00.001Z".to_owned();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        let before = store
            .plan_retention_v1(1)
            .expect("baseline retention must inspect")
            .protected_record_count;

        let created = prepare_phase7_attempt(&mut store, &fixture).expect("attempt must append");
        fixture.apply_record(&created.record);
        assert!(created.created);
        assert!(!created.record.execution_authorized);
        assert_eq!(
            created.record.authorization_attempt_id,
            fixture.authorization_attempt_id
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT authority_effect FROM lnsat_phase7_audit_bindings
                     WHERE audit_binding_id = ?1",
                    [&fixture.audit_binding_id],
                    |row| row.get::<_, String>(0),
                )
                .expect("audit binding must inspect"),
            "none"
        );
        assert_eq!(
            store
                .plan_retention_v1(1)
                .expect("retention must include phase7 evidence")
                .protected_record_count,
            before + 3
        );
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(
            reopened
                .read_phase7_authorization_attempt_v1(
                    &fixture.project_ref,
                    &fixture.resource_ref,
                    &fixture.authorization_attempt_id,
                )
                .expect("attempt read must succeed")
                .expect("attempt must exist"),
            created.record
        );
        let replay =
            prepare_phase7_attempt(&mut reopened, &fixture).expect("exact attempt must replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);
        let mut late_replay = fixture.clone();
        late_replay.requested_at = "2027-07-22T20:03:00Z".to_owned();
        let late_replay = prepare_phase7_attempt(&mut reopened, &late_replay)
            .expect("server-owned replay must return original chronology");
        assert!(!late_replay.created);
        assert_eq!(late_replay.record, created.record);
        for table in [
            "lnsat_authorization_nonces",
            "lnsat_execution_authorizations",
            "lnsat_capability_consumptions",
            "lnsat_operations",
            "lnsat_operation_attempts",
            "lnsat_operation_receipts",
            "lnsat_operation_reconciliations",
            "lnsat_phase7_state_events",
        ] {
            assert_eq!(
                reopened
                    .connection
                    .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                        row.get::<_, i64>(0)
                    })
                    .expect("closed family must inspect"),
                0,
                "{table} must remain unopened"
            );
        }
    }

    #[test]
    fn phase7_authorization_attempt_rejects_conflict_source_and_scope_drift() {
        let database = TestDatabase::new("phase7-attempt-conflicts");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 2);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        let created =
            prepare_phase7_attempt(&mut store, &fixture).expect("baseline attempt must append");
        fixture.apply_record(&created.record);

        let mut caller_mutation = fixture.clone();
        caller_mutation.authorization_attempt_id = format!("aat_{}", "f".repeat(64));
        caller_mutation.audit_binding_id = format!("p7a_{}", "e".repeat(64));
        caller_mutation.idempotency_key = "caller-selected".to_owned();
        caller_mutation.action_digest = [99; 32];
        caller_mutation.requested_at = "2026-07-22T20:03:30Z".to_owned();
        let replay = prepare_phase7_attempt(&mut store, &caller_mutation)
            .expect("caller-hidden fields cannot alter derived replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);

        let mut wrong_source = fixture.clone();
        wrong_source.approval_decision_id = format!("apd_{}", "0".repeat(64));
        assert_eq!(
            prepare_phase7_attempt(&mut store, &wrong_source),
            Err(Phase7PersistenceErrorV1::SourceNotApproved)
        );
        let (time_packet, time_policy, time_request, time_decision) =
            distinct_approval_decision_fixture(5);
        persist_approval_chain(
            &mut store,
            &time_packet,
            &time_policy,
            &time_request,
            &time_decision,
        );
        let mut invalid_time =
            phase7_attempt_fixture(&time_packet, &time_policy, &time_request, &time_decision, 5);
        invalid_time.requested_at = "2026-02-31T20:03:00Z".to_owned();
        assert_eq!(
            prepare_phase7_attempt(&mut store, &invalid_time),
            Err(Phase7PersistenceErrorV1::ClockRejected)
        );
        assert_eq!(
            store
                .read_phase7_authorization_attempt_v1(
                    "project:other",
                    &fixture.resource_ref,
                    &fixture.authorization_attempt_id,
                )
                .expect("wrong project read must stay scoped"),
            None
        );
        assert_eq!(
            store
                .read_phase7_authorization_attempt_v1(
                    &fixture.project_ref,
                    "resource:other",
                    &fixture.authorization_attempt_id,
                )
                .expect("wrong resource read must stay scoped"),
            None
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_authorization_attempts",
                    [],
                    |row| { row.get::<_, i64>(0) }
                )
                .expect("attempt count must inspect"),
            1
        );
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn phase7_authorization_attempt_rejects_persisted_approval_chain_drift() {
        for case in 0_u64..4 {
            let database = TestDatabase::new(&format!("phase7-source-drift-{case}"));
            let (packet, policy, request, decision) =
                distinct_approval_decision_fixture(100 + case);
            let fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 100 + case);
            let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
            persist_approval_chain(&mut store, &packet, &policy, &request, &decision);

            match case {
                0 => {
                    store
                        .connection
                        .execute_batch("DROP TRIGGER lnsat_approval_decisions_reject_update;")
                        .expect("decision trigger must drop for isolated drift injection");
                    store
                        .connection
                        .execute(
                            "UPDATE lnsat_approval_decisions
                             SET approver_ref = 'identity:human:tampered'
                             WHERE approval_decision_id = ?1",
                            [&decision.approval_decision_id],
                        )
                        .expect("decision drift must inject");
                    store
                        .connection
                        .execute_batch(
                            "CREATE TRIGGER lnsat_approval_decisions_reject_update
                             BEFORE UPDATE ON lnsat_approval_decisions
                             BEGIN
                               SELECT RAISE(ABORT, 'approval decisions are immutable');
                             END;",
                        )
                        .expect("decision trigger must restore exactly");
                }
                1 => {
                    store
                        .connection
                        .execute_batch("DROP TRIGGER lnsat_approval_requests_reject_update;")
                        .expect("request trigger must drop for isolated drift injection");
                    store
                        .connection
                        .execute(
                            "UPDATE lnsat_approval_requests
                             SET requester_ref = 'identity:human:tampered'
                             WHERE approval_request_id = ?1",
                            [&request.approval_request_id],
                        )
                        .expect("request drift must inject");
                    store
                        .connection
                        .execute_batch(
                            "CREATE TRIGGER lnsat_approval_requests_reject_update
                             BEFORE UPDATE ON lnsat_approval_requests
                             BEGIN
                               SELECT RAISE(ABORT, 'approval requests are immutable');
                             END;",
                        )
                        .expect("request trigger must restore exactly");
                }
                2 => {
                    store
                        .connection
                        .execute_batch("DROP TRIGGER lnsat_policy_decisions_reject_update;")
                        .expect("policy trigger must drop for isolated drift injection");
                    store
                        .connection
                        .execute(
                            "UPDATE lnsat_policy_decisions
                             SET expires_at = '2026-07-22T20:07:00Z'
                             WHERE decision_id = ?1",
                            [&policy.decision_id],
                        )
                        .expect("policy drift must inject");
                    store
                        .connection
                        .execute_batch(
                            "CREATE TRIGGER lnsat_policy_decisions_reject_update
                             BEFORE UPDATE ON lnsat_policy_decisions
                             BEGIN
                               SELECT RAISE(ABORT, 'policy decisions are immutable');
                             END;",
                        )
                        .expect("policy trigger must restore exactly");
                }
                3 => {
                    store
                        .connection
                        .execute_batch("DROP TRIGGER lnsat_packet_envelopes_reject_update;")
                        .expect("packet trigger must drop for isolated drift injection");
                    store
                        .connection
                        .execute(
                            "UPDATE lnsat_packet_envelopes
                             SET expires_at = '2026-07-22T20:07:00Z'
                             WHERE packet_id = ?1",
                            [&packet.packet_id],
                        )
                        .expect("packet drift must inject");
                    store
                        .connection
                        .execute_batch(
                            "CREATE TRIGGER lnsat_packet_envelopes_reject_update
                             BEFORE UPDATE ON lnsat_packet_envelopes
                             BEGIN
                               SELECT RAISE(ABORT, 'packet envelopes are immutable');
                             END;",
                        )
                        .expect("packet trigger must restore exactly");
                }
                _ => unreachable!("bounded drift cases"),
            }

            assert_eq!(
                prepare_phase7_attempt(&mut store, &fixture),
                Err(Phase7PersistenceErrorV1::EvidenceDrift),
                "persisted source drift case {case} must fail closed"
            );
            for table in [
                "lnsat_phase7_entities",
                "lnsat_phase7_audit_bindings",
                "lnsat_authorization_attempts",
            ] {
                assert_eq!(
                    store
                        .connection
                        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                            row.get::<_, i64>(0)
                        })
                        .expect("failed preparation must leave no phase7 record"),
                    0,
                    "{table} must remain empty for drift case {case}"
                );
            }
        }
    }

    #[test]
    fn phase7_authorization_attempt_required_audit_failure_rolls_back_atomically() {
        let database = TestDatabase::new("phase7-attempt-audit-rollback");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 5);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);

        assert_eq!(
            store.prepare_phase7_authorization_attempt_with_sources_v1(
                &fixture.input(),
                &fixture.requested_at,
                || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            ),
            Err(Phase7PersistenceErrorV1::PersistenceFailed)
        );
        for table in [
            "lnsat_phase7_entities",
            "lnsat_phase7_audit_bindings",
            "lnsat_authorization_attempts",
        ] {
            assert_eq!(
                store
                    .connection
                    .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                        row.get::<_, i64>(0)
                    })
                    .expect("rolled-back table must inspect"),
                0,
                "{table} must roll back"
            );
        }
        store
            .verify_schema()
            .expect("rolled-back schema must verify");
    }

    #[test]
    fn phase7_authorization_attempt_competing_writers_replay_or_conflict_once() {
        let database = TestDatabase::new("phase7-attempt-competing");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let exact_fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 6);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let fixture = exact_fixture.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut writer = SqliteStore::open(&path).expect("writer must open");
                    barrier.wait();
                    prepare_phase7_attempt(&mut writer, &fixture)
                        .expect("exact writer must resolve")
                })
            })
            .collect::<Vec<_>>();
        let exact_writes = handles
            .into_iter()
            .map(|handle| handle.join().expect("writer must join"))
            .collect::<Vec<_>>();
        assert_eq!(exact_writes.iter().filter(|write| write.created).count(), 1);
        assert_eq!(
            exact_writes.iter().filter(|write| !write.created).count(),
            1
        );
        assert_eq!(exact_writes[0].record, exact_writes[1].record);

        SqliteStore::open(&database.path)
            .expect("race database must reopen")
            .verify_schema()
            .expect("race result must verify");
    }

    #[test]
    fn phase7_authorization_attempt_backup_restore_preserves_inert_evidence() {
        let database = TestDatabase::new("phase7-attempt-backup-source");
        let backup = TestDatabase::new("phase7-attempt-backup");
        let restored = TestDatabase::new("phase7-attempt-restored");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 9);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        let created = prepare_phase7_attempt(&mut store, &fixture).expect("attempt must append");
        fixture.apply_record(&created.record);
        let backup_evidence = store
            .create_online_backup_v1(&backup.path)
            .expect("backup must succeed");
        assert_eq!(backup_evidence.schema_version, 17);
        let restore_evidence = SqliteStore::restore_backup_v1(&backup.path, &restored.path)
            .expect("restore must succeed");
        assert_eq!(restore_evidence.schema_version, 17);
        assert!(!restore_evidence.activated);

        let restored_store = SqliteStore::open(&restored.path).expect("restore must reopen");
        let restored_attempt = restored_store
            .read_phase7_authorization_attempt_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &fixture.authorization_attempt_id,
            )
            .expect("restored attempt must read")
            .expect("restored attempt must exist");
        assert_eq!(restored_attempt, created.record);
        assert!(!restored_attempt.execution_authorized);
        assert_eq!(
            restored_store
                .connection
                .query_row(
                    "SELECT authority_effect FROM lnsat_phase7_audit_bindings
                     WHERE audit_binding_id = ?1",
                    [&fixture.audit_binding_id],
                    |row| row.get::<_, String>(0),
                )
                .expect("restored audit must inspect"),
            "none"
        );
    }

    #[test]
    fn phase7_core_schema_rejects_row_and_index_drift_without_signed_lane_leakage() {
        for forbidden in [
            "private_key",
            "public_key",
            "signed_approval",
            "signature",
            "spki",
            "provider",
            "raw_capability",
            "capability_token",
        ] {
            assert!(
                !MIGRATION_0016_SQL.to_ascii_lowercase().contains(forbidden),
                "migration must exclude {forbidden}"
            );
        }

        let drift_database = TestDatabase::new("phase7-index-drift");
        let drift_store = SqliteStore::open(&drift_database.path).expect("database must bootstrap");
        let mut columns = drift_store
            .connection
            .prepare("PRAGMA table_info(lnsat_execution_authorizations)")
            .expect("authorization columns must prepare");
        let capability_columns = columns
            .query_map([], |row| row.get::<_, String>(1))
            .expect("authorization columns must query")
            .collect::<rusqlite::Result<Vec<_>>>()
            .expect("authorization columns must decode")
            .into_iter()
            .filter(|column| column.contains("capability"))
            .collect::<Vec<_>>();
        assert_eq!(capability_columns, vec!["capability_digest"]);
        drop(columns);
        drift_store
            .connection
            .execute_batch(
                "CREATE INDEX lnsat_unexpected_phase7_idx
                 ON lnsat_phase7_entities (created_at);",
            )
            .expect("unexpected index must create");
        drop(drift_store);
        assert_eq!(
            SqliteStore::open(&drift_database.path)
                .err()
                .expect("unexpected index must fail"),
            SqliteStoreError::MigrationDrift
        );

        let row_database = TestDatabase::new("phase7-row-drift");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut fixture = phase7_attempt_fixture(&packet, &policy, &request, &decision, 10);
        let mut row_store = SqliteStore::open(&row_database.path).expect("database must bootstrap");
        persist_approval_chain(&mut row_store, &packet, &policy, &request, &decision);
        let created =
            prepare_phase7_attempt(&mut row_store, &fixture).expect("attempt must append");
        fixture.apply_record(&created.record);
        row_store
            .connection
            .execute_batch(
                "DROP TRIGGER lnsat_authorization_attempts_reject_update;
                 UPDATE lnsat_authorization_attempts
                 SET result_status = 'failed';
                 CREATE TRIGGER lnsat_authorization_attempts_reject_update
                 BEFORE UPDATE ON lnsat_authorization_attempts
                 BEGIN
                   SELECT RAISE(ABORT, 'authorization attempts are immutable');
                 END;",
            )
            .expect("test row drift must apply");
        assert_eq!(
            row_store.verify_schema(),
            Err(SqliteStoreError::MigrationDrift)
        );
        assert_eq!(
            row_store.read_phase7_authorization_attempt_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &fixture.authorization_attempt_id,
            ),
            Err(Phase7PersistenceErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn phase7_authorization_attempt_capacity_failure_leaves_no_partial_record() {
        let database = TestDatabase::new("phase7-attempt-capacity");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let mut fixtures = Vec::new();
        for sequence in 100..1_100 {
            let (mut packet, _, _) = approval_request_fixture();
            packet.packet_id = format!("pkt_{sequence:064x}");
            packet.idempotency_key = format!("idem_{sequence:064x}");
            let policy = policy_fixture(&packet);
            let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
                .expect("approval request must derive");
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
            .expect("approval decision must derive");
            persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
            fixtures.push(phase7_attempt_fixture(
                &packet, &policy, &request, &decision, sequence,
            ));
        }
        store
            .connection
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;")
            .expect("capacity baseline must compact");
        let page_count =
            pragma_i64(&store.connection, "page_count").expect("page count must inspect");
        store
            .connection
            .pragma_update(None, "max_page_count", page_count)
            .expect("page count must constrain database");

        let mut failure = None;
        for (offset, fixture) in fixtures.iter().enumerate() {
            let before = store
                .connection
                .query_row(
                    "SELECT
                       (SELECT count(*) FROM lnsat_phase7_entities),
                       (SELECT count(*) FROM lnsat_phase7_audit_bindings),
                       (SELECT count(*) FROM lnsat_authorization_attempts)",
                    [],
                    |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, i64>(1)?,
                            row.get::<_, i64>(2)?,
                        ))
                    },
                )
                .expect("baseline counts must inspect");
            match prepare_phase7_attempt(&mut store, fixture) {
                Ok(_) => {}
                Err(Phase7PersistenceErrorV1::PersistenceFailed) => {
                    let after = store
                        .connection
                        .query_row(
                            "SELECT
                               (SELECT count(*) FROM lnsat_phase7_entities),
                               (SELECT count(*) FROM lnsat_phase7_audit_bindings),
                               (SELECT count(*) FROM lnsat_authorization_attempts)",
                            [],
                            |row| {
                                Ok((
                                    row.get::<_, i64>(0)?,
                                    row.get::<_, i64>(1)?,
                                    row.get::<_, i64>(2)?,
                                ))
                            },
                        )
                        .expect("failed counts must inspect");
                    assert_eq!(after, before);
                    failure = Some(offset);
                    break;
                }
                Err(error) => panic!("unexpected capacity error: {error}"),
            }
        }
        assert!(failure.is_some(), "bounded capacity must eventually reject");
        store
            .connection
            .pragma_update(None, "max_page_count", page_count + 16_384)
            .expect("page count must restore");
        store
            .verify_schema()
            .expect("capacity survivors must verify");
    }

    #[test]
    fn phase7_nonce_issue_is_server_owned_digest_only_and_exact_replay_safe() {
        let database = TestDatabase::new("phase7-nonce-issue");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 20);

        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x42,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        assert!(issued.created);
        assert!(issued.record.active);
        assert_eq!(issued.record.state, "active");
        assert_eq!(issued.record.state_sequence, 1);
        assert_eq!(issued.record.expires_at, "2026-07-22T20:08:01.000Z");
        let secret = issued.nonce.as_ref().expect("first issue returns raw once");
        assert_eq!(secret.as_bytes(), &[0x42; PHASE7_NONCE_BYTES_V1]);
        let expected_digest: [u8; 32] = Sha256::digest(secret.as_bytes()).into();
        assert_eq!(issued.record.nonce_digest, expected_digest);
        let raw_hex = "42".repeat(PHASE7_NONCE_BYTES_V1);
        assert!(!format!("{secret:?}").contains(&raw_hex));

        let mut columns = store
            .connection
            .prepare("PRAGMA table_info(lnsat_authorization_nonces)")
            .expect("nonce columns must prepare");
        let nonce_columns = columns
            .query_map([], |row| row.get::<_, String>(1))
            .expect("nonce columns must query")
            .collect::<rusqlite::Result<Vec<_>>>()
            .expect("nonce columns must decode");
        assert!(nonce_columns.contains(&"nonce_digest".to_owned()));
        assert!(nonce_columns.iter().all(|column| !column.contains("raw")));
        drop(columns);

        let replay = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x99,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        assert!(!replay.created);
        assert!(replay.nonce.is_none());
        assert_eq!(replay.record, issued.record);
        let (collision_packet, collision_policy, collision_request, collision_decision) =
            distinct_approval_decision_fixture(28);
        let collision_fixture = persist_phase7_attempt(
            &mut store,
            &collision_packet,
            &collision_policy,
            &collision_request,
            &collision_decision,
            28,
        );
        assert!(matches!(
            store.issue_phase7_authorization_nonce_with_sources_v1(
                &phase7_nonce_input(&collision_fixture),
                "2026-07-22T20:03:02.000Z",
                "2026-07-22T20:08:02.000Z",
                |bytes| {
                    bytes.fill(0x42);
                    Ok(())
                },
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::IdentityConflict)
        ));
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_authorization_nonces",
                    [],
                    |row| { row.get::<_, i64>(0) }
                )
                .expect("nonce count must inspect"),
            1
        );
        let mut audit_effects = store
            .connection
            .prepare(
                "SELECT authority_effect
                 FROM lnsat_phase7_audit_bindings
                 WHERE record_id IN (?1, ?2)
                 ORDER BY recorded_at, record_id",
            )
            .expect("nonce audit effects must prepare");
        let audit_effects = audit_effects
            .query_map(
                params![&issued.record.nonce_id, &issued.record.state_event_id],
                |row| row.get::<_, String>(0),
            )
            .expect("nonce audit effects must query")
            .collect::<rusqlite::Result<Vec<_>>>()
            .expect("nonce audit effects must decode");
        assert_eq!(audit_effects, vec!["none", "nonce_active"]);
        store.verify_schema().expect("nonce schema must verify");
    }

    #[test]
    fn phase7_nonce_uses_approval_cap_and_rejects_clock_scope_and_entropy_failures() {
        let database = TestDatabase::new("phase7-nonce-boundaries");
        let mut packet = packet_fixture();
        packet.permission_allow = vec!["deploy.request".to_owned()];
        packet.expires_at = "2026-07-22T20:05:00Z".to_owned();
        add_execution_proposal(&mut packet);
        let policy = policy_fixture(&packet);
        let request = create_approval_request_v1(&policy, "2026-07-22T20:01:00Z")
            .expect("approval request must derive");
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
        .expect("approval decision must derive");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 21);

        assert!(matches!(
            store.issue_phase7_authorization_nonce_with_sources_v1(
                &phase7_nonce_input(&fixture),
                "2026-07-22T20:02:59.999Z",
                "2026-07-22T20:07:59.999Z",
                |bytes| {
                    bytes.fill(0x21);
                    Ok(())
                },
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::SourceNotApproved)
        ));
        assert!(matches!(
            store.issue_phase7_authorization_nonce_with_sources_v1(
                &phase7_nonce_input(&fixture),
                "2026-07-22T20:03:01.000Z",
                "2026-07-22T20:08:00.999Z",
                |bytes| {
                    bytes.fill(0x21);
                    Ok(())
                },
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::ClockRejected)
        ));
        assert!(matches!(
            store.issue_phase7_authorization_nonce_with_sources_v1(
                &phase7_nonce_input(&fixture),
                "2026-07-22T20:03:01.000Z",
                "2026-07-22T20:08:01.000Z",
                |_| Err(Phase7PersistenceErrorV1::EntropyUnavailable),
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::EntropyUnavailable)
        ));
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_authorization_nonces",
                    [],
                    |row| { row.get::<_, i64>(0) }
                )
                .expect("failed nonce count must inspect"),
            0
        );

        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x21,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        assert_eq!(issued.record.expires_at, decision.expires_at);
        assert_eq!(
            store.read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:03:00.999Z",
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::ClockRejected)
        );
    }

    #[test]
    fn phase7_nonce_reads_require_exact_project_and_resource_scope() {
        let database = TestDatabase::new("phase7-nonce-scope");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 30);
        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x30,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        drop(issued.nonce);
        for (project_ref, resource_ref) in [
            ("project:other", fixture.resource_ref.as_str()),
            (fixture.project_ref.as_str(), "resource:other"),
        ] {
            assert_eq!(
                store
                    .read_phase7_authorization_nonce_at_v1(
                        project_ref,
                        resource_ref,
                        &issued.record.nonce_id,
                        "2026-07-22T20:03:02.000Z",
                        || Ok(()),
                    )
                    .expect("wrong-scope read must remain indistinguishable"),
                None
            );
        }
    }

    #[test]
    fn phase7_nonce_issue_and_required_audit_failure_roll_back_atomically() {
        let database = TestDatabase::new("phase7-nonce-issue-rollback");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 22);

        assert!(matches!(
            store.issue_phase7_authorization_nonce_with_sources_v1(
                &phase7_nonce_input(&fixture),
                "2026-07-22T20:03:01.000Z",
                "2026-07-22T20:08:01.000Z",
                |bytes| {
                    bytes.fill(0x22);
                    Ok(())
                },
                || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            ),
            Err(Phase7PersistenceErrorV1::PersistenceFailed)
        ));
        for table in ["lnsat_authorization_nonces", "lnsat_phase7_state_events"] {
            assert_eq!(
                store
                    .connection
                    .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                        row.get::<_, i64>(0)
                    })
                    .expect("rolled-back nonce table must inspect"),
                0,
                "{table} must roll back"
            );
        }
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_phase7_entities", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("entity count must inspect"),
            1
        );
        store
            .verify_schema()
            .expect("issue rollback must remain verified");
    }

    #[test]
    fn phase7_nonce_cancel_is_terminal_idempotent_and_restart_safe() {
        let database = TestDatabase::new("phase7-nonce-cancel");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 23);
        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x23,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        drop(issued.nonce);
        let cancel_input = Phase7AuthorizationNonceCancelInputV1 {
            project_ref: &fixture.project_ref,
            resource_ref: &fixture.resource_ref,
            nonce_id: &issued.record.nonce_id,
        };
        let cancelled = store
            .cancel_phase7_authorization_nonce_at_v1(
                &cancel_input,
                "2026-07-22T20:04:00.000Z",
                || Ok(()),
            )
            .expect("cancel must resolve")
            .expect("nonce must exist");
        assert!(cancelled.changed);
        assert_eq!(cancelled.record.state, "cancelled");
        assert_eq!(cancelled.record.state_sequence, 2);
        assert!(!cancelled.record.active);
        let replay = store
            .cancel_phase7_authorization_nonce_at_v1(
                &cancel_input,
                "2026-07-22T20:05:00.000Z",
                || Ok(()),
            )
            .expect("cancel replay must resolve")
            .expect("nonce must exist");
        assert!(!replay.changed);
        assert_eq!(replay.record, cancelled.record);
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        let after_expiry = reopened
            .read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:09:00.000Z",
                || Ok(()),
            )
            .expect("cancelled nonce must read")
            .expect("cancelled nonce must exist");
        assert_eq!(after_expiry.state, "cancelled");
        assert_eq!(after_expiry.state_sequence, 2);
        assert_eq!(
            reopened
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_phase7_state_events
                     WHERE target_entity_id = ?1",
                    [&issued.record.nonce_id],
                    |row| row.get::<_, i64>(0),
                )
                .expect("state count must inspect"),
            2
        );
    }

    #[test]
    fn phase7_nonce_expiry_boundary_and_failure_are_terminal_and_atomic() {
        let database = TestDatabase::new("phase7-nonce-expiry");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 24);
        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x24,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        drop(issued.nonce);
        let before = store
            .read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:08:00.999Z",
                || Ok(()),
            )
            .expect("pre-expiry read must resolve")
            .expect("nonce must exist");
        assert!(before.active);
        assert_eq!(before.state_sequence, 1);

        assert_eq!(
            store.read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:08:01.000Z",
                || Err(Phase7PersistenceErrorV1::PersistenceFailed),
            ),
            Err(Phase7PersistenceErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_phase7_state_events
                     WHERE target_entity_id = ?1",
                    [&issued.record.nonce_id],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back expiry count must inspect"),
            1
        );
        let expired = store
            .read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:08:01.000Z",
                || Ok(()),
            )
            .expect("expiry read must resolve")
            .expect("nonce must exist");
        assert!(!expired.active);
        assert_eq!(expired.state, "expired");
        assert_eq!(expired.state_sequence, 2);
        assert_eq!(expired.state_effective_at, expired.expires_at);
        let cancel_after_expiry = store
            .cancel_phase7_authorization_nonce_at_v1(
                &Phase7AuthorizationNonceCancelInputV1 {
                    project_ref: &fixture.project_ref,
                    resource_ref: &fixture.resource_ref,
                    nonce_id: &issued.record.nonce_id,
                },
                "2026-07-22T20:09:00.000Z",
                || Ok(()),
            )
            .expect("post-expiry cancel must resolve")
            .expect("nonce must exist");
        assert!(!cancel_after_expiry.changed);
        assert_eq!(cancel_after_expiry.record.state, "expired");
    }

    #[test]
    fn phase7_nonce_competing_issuers_and_expiry_writers_choose_one_chain() {
        let database = TestDatabase::new("phase7-nonce-competing");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 25);
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let handles = [0x25_u8, 0x26_u8]
            .into_iter()
            .map(|entropy_byte| {
                let path = database.path.clone();
                let fixture = fixture.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut writer = SqliteStore::open(&path).expect("writer must open");
                    barrier.wait();
                    writer
                        .issue_phase7_authorization_nonce_with_sources_v1(
                            &phase7_nonce_input(&fixture),
                            "2026-07-22T20:03:01.000Z",
                            "2026-07-22T20:08:01.000Z",
                            |bytes| {
                                bytes.fill(entropy_byte);
                                Ok(())
                            },
                            || Ok(()),
                        )
                        .expect("competing issue must resolve")
                })
            })
            .collect::<Vec<_>>();
        let issues = handles
            .into_iter()
            .map(|handle| handle.join().expect("issuer must join"))
            .collect::<Vec<_>>();
        assert_eq!(issues.iter().filter(|issue| issue.created).count(), 1);
        assert_eq!(issues.iter().filter(|issue| !issue.created).count(), 1);
        assert_eq!(
            issues.iter().filter(|issue| issue.nonce.is_some()).count(),
            1
        );
        assert_eq!(issues[0].record, issues[1].record);
        let nonce_id = issues[0].record.nonce_id.clone();
        drop(issues);

        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let fixture = fixture.clone();
                let nonce_id = nonce_id.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut writer = SqliteStore::open(&path).expect("expiry writer must open");
                    barrier.wait();
                    writer
                        .read_phase7_authorization_nonce_at_v1(
                            &fixture.project_ref,
                            &fixture.resource_ref,
                            &nonce_id,
                            "2026-07-22T20:08:01.000Z",
                            || Ok(()),
                        )
                        .expect("expiry writer must resolve")
                        .expect("nonce must exist")
                })
            })
            .collect::<Vec<_>>();
        let expiry_records = handles
            .into_iter()
            .map(|handle| handle.join().expect("expiry writer must join"))
            .collect::<Vec<_>>();
        assert!(
            expiry_records
                .iter()
                .all(|record| record.state == "expired")
        );
        assert_eq!(expiry_records[0], expiry_records[1]);
        let reopened = SqliteStore::open(&database.path).expect("race database must reopen");
        assert_eq!(
            reopened
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_phase7_state_events
                     WHERE target_entity_id = ?1",
                    [&nonce_id],
                    |row| row.get::<_, i64>(0),
                )
                .expect("race event count must inspect"),
            2
        );
        reopened.verify_schema().expect("race chain must verify");
    }

    #[test]
    fn phase7_nonce_backup_restore_preserves_digest_state_without_secret_recovery() {
        let database = TestDatabase::new("phase7-nonce-backup-source");
        let backup = TestDatabase::new("phase7-nonce-backup");
        let restored = TestDatabase::new("phase7-nonce-restored");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 26);
        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x26,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        let expected_record = issued.record.clone();
        drop(issued.nonce);
        store
            .create_online_backup_v1(&backup.path)
            .expect("backup must succeed");
        drop(store);
        SqliteStore::restore_backup_v1(&backup.path, &restored.path).expect("restore must succeed");

        let mut restored_store = SqliteStore::open(&restored.path).expect("restore must reopen");
        let restored_record = restored_store
            .read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &expected_record.nonce_id,
                "2026-07-22T20:04:00.000Z",
                || Ok(()),
            )
            .expect("restored nonce must read")
            .expect("restored nonce must exist");
        assert_eq!(restored_record, expected_record);
        let replay = issue_phase7_nonce_at(
            &mut restored_store,
            &fixture,
            0x99,
            "2026-07-22T20:04:00.000Z",
            "2026-07-22T20:09:00.000Z",
        );
        assert!(!replay.created);
        assert!(replay.nonce.is_none());
        assert_eq!(replay.record, expected_record);
    }

    #[test]
    fn phase7_nonce_digest_tamper_fails_closed() {
        let database = TestDatabase::new("phase7-nonce-tamper");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 27);
        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x27,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        drop(issued.nonce);
        store
            .connection
            .execute_batch(
                "DROP TRIGGER lnsat_authorization_nonces_reject_update;
                 UPDATE lnsat_authorization_nonces
                 SET nonce_digest = zeroblob(32);
                 CREATE TRIGGER lnsat_authorization_nonces_reject_update
                 BEFORE UPDATE ON lnsat_authorization_nonces
                 BEGIN
                   SELECT RAISE(ABORT, 'authorization nonces are immutable');
                 END;",
            )
            .expect("nonce tamper must apply");
        assert_eq!(store.verify_schema(), Err(SqliteStoreError::MigrationDrift));
        assert_eq!(
            store.read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:04:00.000Z",
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn phase7_nonce_terminal_state_tamper_fails_closed() {
        let database = TestDatabase::new("phase7-nonce-terminal-tamper");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let fixture = persist_phase7_attempt(&mut store, &packet, &policy, &request, &decision, 29);
        let issued = issue_phase7_nonce_at(
            &mut store,
            &fixture,
            0x29,
            "2026-07-22T20:03:01.000Z",
            "2026-07-22T20:08:01.000Z",
        );
        drop(issued.nonce);
        store
            .cancel_phase7_authorization_nonce_at_v1(
                &Phase7AuthorizationNonceCancelInputV1 {
                    project_ref: &fixture.project_ref,
                    resource_ref: &fixture.resource_ref,
                    nonce_id: &issued.record.nonce_id,
                },
                "2026-07-22T20:04:00.000Z",
                || Ok(()),
            )
            .expect("nonce must cancel")
            .expect("nonce must exist");
        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_phase7_state_events_reject_update;")
            .expect("terminal trigger must drop for tamper test");
        store
            .connection
            .execute(
                "UPDATE lnsat_phase7_state_events
                 SET state = 'active'
                 WHERE target_entity_id = ?1 AND state_sequence = 2",
                [&issued.record.nonce_id],
            )
            .expect("terminal state tamper must apply");
        store
            .connection
            .execute_batch(
                "CREATE TRIGGER lnsat_phase7_state_events_reject_update
                 BEFORE UPDATE ON lnsat_phase7_state_events
                 BEGIN
                   SELECT RAISE(ABORT, 'phase7 state events are immutable');
                 END;",
            )
            .expect("terminal trigger must restore");
        assert_eq!(store.verify_schema(), Err(SqliteStoreError::MigrationDrift));
        assert_eq!(
            store.read_phase7_authorization_nonce_at_v1(
                &fixture.project_ref,
                &fixture.resource_ref,
                &issued.record.nonce_id,
                "2026-07-22T20:05:00.000Z",
                || Ok(()),
            ),
            Err(Phase7PersistenceErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn retention_plan_preserves_every_current_record_family_without_cleanup() {
        let database = TestDatabase::new("retention-plan");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        for event in &events {
            store
                .append_audit_event_v1(event)
                .expect("audit event must append");
        }

        let plan = store
            .plan_retention_v1(64)
            .expect("retention plan must inspect");
        let expected_count = 4
            + packet.resource_refs.len()
            + events.len()
            + events
                .iter()
                .map(|event| event.reason_codes.len())
                .sum::<usize>();
        assert_eq!(plan.candidate_limit, 64);
        assert_eq!(plan.policies.len(), RETENTION_RECORD_FAMILIES_V16.len());
        assert_eq!(
            plan.protected_record_count,
            i64::try_from(expected_count).expect("fixture count must fit")
        );
        assert_eq!(plan.cleanup_candidate_count, 0);
        assert!(!plan.cleanup_attempted);
        assert!(plan.policies.iter().all(|policy| {
            policy.retention_class == RETENTION_CLASS_CONTROL_PLANE
                && policy.preserve
                && !policy.cleanup_eligible
                && policy.minimum_retention_seconds.is_none()
        }));
        assert_eq!(
            store.plan_retention_v1(0),
            Err(SqliteRetentionErrorV1::InvalidCandidateLimit)
        );
        assert_eq!(
            store.plan_retention_v1(RETENTION_CANDIDATE_LIMIT_MAX + 1),
            Err(SqliteRetentionErrorV1::InvalidCandidateLimit)
        );
    }

    #[test]
    fn retention_policy_and_all_evidence_guards_are_schema_evidence() {
        let database = TestDatabase::new("retention-immutable");
        let store = SqliteStore::open(&database.path).expect("database must bootstrap");
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_retention_policies
                     SET cleanup_eligible = 1
                     WHERE record_family = 'audit_event'",
                    [],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_retention_policies
                     WHERE record_family = 'packet_envelope'",
                    [],
                )
                .is_err()
        );
        store
            .connection
            .execute_batch(
                "DROP TRIGGER lnsat_packet_envelopes_reject_delete;
                 CREATE TRIGGER lnsat_packet_envelopes_reject_delete
                 BEFORE DELETE ON lnsat_packet_envelopes
                 BEGIN
                   SELECT 1;
                 END;",
            )
            .expect("test must replace required guard with no-op");
        assert_eq!(
            store.plan_retention_v1(1),
            Err(SqliteRetentionErrorV1::EvidenceDrift)
        );
        drop(store);

        assert_eq!(
            SqliteStore::open(&database.path)
                .err()
                .expect("modified evidence guard must fail"),
            SqliteStoreError::MigrationDrift
        );
    }

    #[test]
    fn online_backup_and_inert_restore_preserve_complete_wal_chain() {
        let database = TestDatabase::new("backup-source");
        let backup = TestDatabase::new("backup-snapshot");
        let restored = TestDatabase::new("backup-restored");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        for event in &events {
            store
                .append_audit_event_v1(event)
                .expect("audit event must append");
        }
        assert!(
            PathBuf::from(format!("{}-wal", database.path.display())).exists(),
            "source WAL must remain live during online backup"
        );

        let backup_evidence = store
            .create_online_backup_v1(&backup.path)
            .expect("online backup must succeed");
        assert_eq!(
            backup_evidence.backup_path,
            backup
                .path
                .canonicalize()
                .expect("backup must canonicalize")
        );
        assert_eq!(backup_evidence.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(backup_evidence.migration_count, SQLITE_SCHEMA_VERSION);
        assert!(backup_evidence.file_size_bytes > 0);
        assert_eq!(backup_evidence.backup_sha256.len(), 71);
        assert!(backup_evidence.backup_sha256.starts_with("sha256:"));
        assert!(backup_evidence.online_consistent);
        assert!(!backup_evidence.replaced_existing);
        assert!(!PathBuf::from(format!("{}-wal", backup.path.display())).exists());
        assert!(!PathBuf::from(format!("{}-shm", backup.path.display())).exists());

        let restore_evidence = SqliteStore::restore_backup_v1(&backup.path, &restored.path)
            .expect("restore must succeed");
        assert_eq!(
            restore_evidence.backup_path,
            backup
                .path
                .canonicalize()
                .expect("backup must canonicalize")
        );
        assert_eq!(
            restore_evidence.restored_database_path,
            restored
                .path
                .canonicalize()
                .expect("restore must canonicalize")
        );
        assert_eq!(restore_evidence.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(restore_evidence.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(
            restore_evidence.file_size_bytes,
            backup_evidence.file_size_bytes
        );
        assert_eq!(
            restore_evidence.snapshot_sha256,
            backup_evidence.backup_sha256
        );
        assert!(!restore_evidence.replaced_existing);
        assert!(!restore_evidence.activated);

        let restored_store =
            SqliteStore::open(&restored.path).expect("restored database must open");
        assert_eq!(
            restored_store
                .read_packet_envelope_v1(&packet.project_ref, &packet.packet_id)
                .expect("restored packet read must succeed")
                .expect("restored packet must exist")
                .packet,
            packet
        );
        assert_eq!(
            restored_store
                .read_approval_decision_v1(&packet.project_ref, &decision.approval_decision_id)
                .expect("restored decision read must succeed")
                .expect("restored decision must exist")
                .decision,
            decision
        );
        for event in &events {
            assert_eq!(
                restored_store
                    .read_audit_event_v1(&event.project_ref, &event.event_id)
                    .expect("restored audit read must succeed")
                    .expect("restored audit event must exist")
                    .event,
                *event
            );
        }
    }

    #[test]
    fn backup_restore_paths_fail_closed_without_clobbering() {
        let database = TestDatabase::new("backup-path-source");
        let backup = TestDatabase::new("backup-path-snapshot");
        let restored = TestDatabase::new("backup-path-restored");
        let corrupt = TestDatabase::new("backup-path-corrupt");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let packet = packet_fixture();
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .create_online_backup_v1(&backup.path)
            .expect("backup must succeed");

        assert_eq!(
            store.create_online_backup_v1(&database.path),
            Err(SqliteRecoveryErrorV1::SourceDestinationConflict)
        );
        assert_eq!(
            store.create_online_backup_v1(&backup.path),
            Err(SqliteRecoveryErrorV1::DestinationExists)
        );
        assert_eq!(
            SqliteStore::restore_backup_v1(&backup.path, &backup.path),
            Err(SqliteRecoveryErrorV1::SourceDestinationConflict)
        );
        assert_eq!(
            SqliteStore::restore_backup_v1(&backup.path, &database.path),
            Err(SqliteRecoveryErrorV1::DestinationExists)
        );
        assert_eq!(
            store.create_online_backup_v1(""),
            Err(SqliteRecoveryErrorV1::PathRequired)
        );
        assert_eq!(
            store.create_online_backup_v1(":memory:"),
            Err(SqliteRecoveryErrorV1::InMemoryPathForbidden)
        );

        fs::write(&corrupt.path, b"not a sqlite snapshot").expect("corrupt fixture must write");
        assert_eq!(
            SqliteStore::restore_backup_v1(&corrupt.path, &restored.path),
            Err(SqliteRecoveryErrorV1::SourceInvalid)
        );
        assert!(!restored.path.exists());
        assert_eq!(
            store
                .read_packet_envelope_v1(&packet.project_ref, &packet.packet_id)
                .expect("source read must succeed")
                .expect("source packet must remain")
                .packet,
            packet
        );
    }

    #[test]
    fn interrupted_recovery_temp_and_publish_race_leave_no_partial_target() {
        let target = TestDatabase::new("recovery-interrupted");
        let temporary = TemporaryRecoveryFile::create(
            &target.path,
            "restore",
            SqliteRecoveryErrorV1::RestoreFailed,
        )
        .expect("temporary restore file must create");
        let temporary_path = temporary.path().to_path_buf();
        fs::write(&temporary_path, b"partial copy").expect("partial copy must write");
        drop(temporary);
        assert!(!temporary_path.exists());
        assert!(!target.path.exists());

        let temporary = TemporaryRecoveryFile::create(
            &target.path,
            "restore",
            SqliteRecoveryErrorV1::RestoreFailed,
        )
        .expect("second temporary restore file must create");
        let second_temporary_path = temporary.path().to_path_buf();
        fs::write(&second_temporary_path, b"restored bytes").expect("restored bytes must write");
        fs::write(&target.path, b"operator bytes").expect("race target must write");
        assert_eq!(
            temporary.publish(&target.path),
            Err(SqliteRecoveryErrorV1::DestinationExists)
        );
        assert_eq!(
            fs::read(&target.path).expect("race target must remain readable"),
            b"operator bytes"
        );
        assert!(!second_temporary_path.exists());
    }

    #[cfg(unix)]
    #[test]
    fn backup_restore_files_are_owner_only_and_symlinks_are_refused() {
        use std::os::unix::fs::{MetadataExt as _, symlink};

        let database = TestDatabase::new("backup-mode-source");
        let backup = TestDatabase::new("backup-mode-snapshot");
        let restored = TestDatabase::new("backup-mode-restored");
        let backup_link = TestDatabase::new("backup-mode-source-link");
        let destination_link = TestDatabase::new("backup-mode-destination-link");
        let store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .create_online_backup_v1(&backup.path)
            .expect("backup must succeed");
        SqliteStore::restore_backup_v1(&backup.path, &restored.path).expect("restore must succeed");
        assert_eq!(
            fs::metadata(&backup.path)
                .expect("backup metadata must read")
                .mode()
                & 0o777,
            0o600
        );
        assert_eq!(
            fs::metadata(&restored.path)
                .expect("restore metadata must read")
                .mode()
                & 0o777,
            0o600
        );

        symlink(&backup.path, &backup_link.path).expect("backup symlink must create");
        assert_eq!(
            SqliteStore::restore_backup_v1(&backup_link.path, &destination_link.path),
            Err(SqliteRecoveryErrorV1::SymlinkForbidden)
        );
        symlink(&restored.path, &destination_link.path).expect("destination symlink must create");
        assert_eq!(
            store.create_online_backup_v1(&destination_link.path),
            Err(SqliteRecoveryErrorV1::SymlinkForbidden)
        );
    }

    #[test]
    fn upgrades_exact_version_one_database_in_order() {
        let database = TestDatabase::new("upgrade-v1");
        create_version_one_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_two_database_in_order() {
        let database = TestDatabase::new("upgrade-v2");
        create_version_two_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_three_database_in_order() {
        let database = TestDatabase::new("upgrade-v3");
        create_version_three_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_four_database_in_order() {
        let database = TestDatabase::new("upgrade-v4");
        create_version_four_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_five_database_in_order() {
        let database = TestDatabase::new("upgrade-v5");
        create_version_five_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_six_database_in_order() {
        let database = TestDatabase::new("upgrade-v6");
        create_version_six_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_seven_database_in_order() {
        let database = TestDatabase::new("upgrade-v7");
        create_version_seven_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                },)
                .expect("retention families must inspect"),
            i64::try_from(RETENTION_RECORD_FAMILIES_V16.len()).expect("family count must fit")
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_recovery_inspection_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("recovery events must inspect"),
            0
        );
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_eight_database_in_order() {
        let database = TestDatabase::new("upgrade-v8");
        create_version_eight_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_local_identities", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("identity rows must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("retention families must inspect"),
            i64::try_from(RETENTION_RECORD_FAMILIES_V16.len()).expect("family count must fit")
        );
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_nine_database_in_order() {
        let database = TestDatabase::new("upgrade-v9");
        create_version_nine_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_local_sessions", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("session rows must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("retention families must inspect"),
            i64::try_from(RETENTION_RECORD_FAMILIES_V16.len()).expect("family count must fit")
        );
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_ten_database_in_order() {
        let database = TestDatabase::new("upgrade-v10");
        create_version_ten_database(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_activity_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("activity rows must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_session_rotations",
                    [],
                    |row| { row.get::<_, i64>(0) }
                )
                .expect("rotation rows must inspect"),
            0
        );
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_eleven_database_in_order() {
        let database = TestDatabase::new("upgrade-v11");
        let issued = create_version_eleven_database_with_session(&database.path);

        let store = SqliteStore::open(&database.path).expect("database must upgrade");
        let state = store.state().expect("state must inspect");
        assert_eq!(state.schema_version, SQLITE_SCHEMA_VERSION);
        assert_eq!(state.migration_count, SQLITE_SCHEMA_VERSION);
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_local_identity_status_events",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("identity status rows must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("retention families must inspect"),
            i64::try_from(RETENTION_RECORD_FAMILIES_V16.len()).expect("family count must fit")
        );
        assert_eq!(
            store.verify_local_password_credential_v1(
                "identity:human:owner",
                "correct horse battery staple",
            ),
            Ok(LocalCredentialVerificationV1::Verified)
        );
        assert!(matches!(
            store
                .verify_local_session_v1(&issued.raw_session_token, "2026-07-23T17:02:00Z")
                .expect("migrated session must verify"),
            LocalSessionVerificationV1::Verified(_)
        ));
        store
            .verify_schema()
            .expect("upgraded schema must be exact");
    }

    #[test]
    fn upgrades_exact_version_twelve_and_starts_post_upgrade_event_sequence() {
        let database = TestDatabase::new("upgrade-v12");
        let issued = create_version_twelve_database_with_session(&database.path);
        let mut store = SqliteStore::open(&database.path).expect("database must upgrade");
        assert_eq!(
            store.state().expect("state must inspect").schema_version,
            SQLITE_SCHEMA_VERSION
        );
        assert!(
            store
                .read_local_identity_events_v1("identity:human:owner")
                .expect("legacy identity events must read")
                .is_empty()
        );
        store
            .rotate_local_password_credential_v1(
                &issued.raw_session_token,
                &issued.raw_csrf_token,
                &LocalPasswordRotationInputV1 {
                    current_password: "correct horse battery staple",
                    new_password: "upgraded owner password value",
                    rotated_at: "2026-07-23T17:02:00Z",
                },
            )
            .expect("post-upgrade password must rotate");
        let events = store
            .read_local_identity_events_v1("identity:human:owner")
            .expect("post-upgrade event must read");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_sequence, 1);
        assert_eq!(
            events[0].event_kind,
            LocalIdentityEventKindV1::PasswordRotated
        );
        assert_eq!(events[0].credential_version, Some(2));
        store
            .verify_schema()
            .expect("upgraded schema must remain exact");
    }

    #[test]
    fn upgrades_exact_version_thirteen_without_fabricating_session_history() {
        let database = TestDatabase::new("upgrade-v13-session-events");
        let issued = create_version_thirteen_database_with_session(&database.path);
        let mut store = SqliteStore::open(&database.path).expect("database must upgrade");
        assert_eq!(
            store.state().expect("state must inspect").schema_version,
            SQLITE_SCHEMA_VERSION
        );
        assert!(
            store
                .read_local_session_events_v1(&issued.session.session_id)
                .expect("legacy session events must read")
                .is_empty()
        );
        assert!(
            store
                .revoke_local_session_v1(
                    &issued.raw_session_token,
                    &issued.raw_csrf_token,
                    "2026-07-23T17:02:00Z",
                    LocalSessionRevocationReasonV1::SignOut,
                )
                .expect("post-upgrade revocation must persist")
        );
        let events = store
            .read_local_session_events_v1(&issued.session.session_id)
            .expect("post-upgrade event must read");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_sequence, 1);
        assert_eq!(events[0].event_kind, LocalSessionEventKindV1::Revoked);
        assert_eq!(
            events[0].actor_session_id.as_deref(),
            Some(issued.session.session_id.as_str())
        );
        assert_eq!(
            events[0].revocation_reason.as_deref(),
            Some(LocalSessionRevocationReasonV1::SignOut.as_str())
        );
        store
            .verify_schema()
            .expect("upgraded schema must remain exact");
    }

    #[test]
    fn upgrades_exact_version_fourteen_and_accepts_actorless_recovery_events() {
        let database = TestDatabase::new("upgrade-v14-owner-recovery");
        let issued = create_version_fourteen_database_with_session(&database.path);
        let authority = acquire_offline_owner_recovery_authority_v1(&database.path)
            .expect("offline authority must acquire");
        let mut store = SqliteStore::open(&database.path).expect("database must upgrade");
        assert_eq!(
            store.state().expect("state must inspect").schema_version,
            SQLITE_SCHEMA_VERSION
        );
        store
            .recover_local_owner_offline_v1(
                &authority,
                &LocalOwnerRecoveryInputV1 {
                    expected_owner_identity_ref: "identity:human:owner",
                    new_password: "upgraded offline recovery password",
                    recovered_at: "2026-07-23T17:02:00Z",
                },
            )
            .expect("post-upgrade recovery must persist");
        let session_events = store
            .read_local_session_events_v1(&issued.session.session_id)
            .expect("migrated session events must read");
        assert_eq!(session_events.len(), 1);
        assert_eq!(
            session_events[0].event_kind,
            LocalSessionEventKindV1::Revoked
        );
        assert_eq!(session_events[0].actor_session_id, None);
        assert_eq!(
            session_events[0].revocation_reason.as_deref(),
            Some(LocalSessionRevocationReasonV1::Recovery.as_str())
        );
        let identity_events = store
            .read_local_identity_events_v1("identity:human:owner")
            .expect("recovery identity event must read");
        assert_eq!(identity_events.len(), 1);
        assert_eq!(
            identity_events[0].event_kind,
            LocalIdentityEventKindV1::OwnerRecovered
        );
        store
            .verify_schema()
            .expect("upgraded schema must remain exact");
    }

    #[test]
    fn packet_append_reopen_read_and_exact_replay_are_stable() {
        let database = TestDatabase::new("packet-restart");
        let packet = packet_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        let created = store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        assert!(created.created);
        assert_eq!(created.record.packet, packet);
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        let read = reopened
            .read_packet_envelope_v1(&packet.project_ref, &packet.packet_id)
            .expect("packet read must succeed")
            .expect("packet must exist");
        assert_eq!(read, created.record);
        let replay = reopened
            .append_packet_envelope_v1(&packet)
            .expect("exact packet must replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);
    }

    #[test]
    fn competing_connections_serialize_to_one_insert_and_one_exact_replay() {
        let database = TestDatabase::new("packet-race");
        drop(SqliteStore::open(&database.path).expect("database must bootstrap"));
        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let packet = packet_fixture();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut store = SqliteStore::open(path).expect("database must open");
                    barrier.wait();
                    store
                        .append_packet_envelope_v1(&packet)
                        .expect("competing append must resolve")
                        .created
                })
            })
            .collect::<Vec<_>>();
        let mut outcomes = handles
            .into_iter()
            .map(|handle| handle.join().expect("writer thread must finish"))
            .collect::<Vec<_>>();
        outcomes.sort_unstable();

        assert_eq!(outcomes, [false, true]);
    }

    #[test]
    fn packet_idempotency_and_identity_collisions_fail_atomically() {
        let database = TestDatabase::new("packet-conflicts");
        let packet = packet_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");

        let mut idempotency_collision = packet.clone();
        idempotency_collision.packet_id = "pkt_execute_v1_0002".to_owned();
        assert_eq!(
            store.append_packet_envelope_v1(&idempotency_collision),
            Err(PacketStoreErrorV1::IdempotencyConflict)
        );

        let mut identity_collision = packet.clone();
        identity_collision.idempotency_key = "idem_execute_v1_0002".to_owned();
        assert_eq!(
            store.append_packet_envelope_v1(&identity_collision),
            Err(PacketStoreErrorV1::PacketIdentityConflict)
        );

        let packet_count = store
            .connection
            .query_row("SELECT count(*) FROM lnsat_packet_envelopes", [], |row| {
                row.get::<_, i64>(0)
            })
            .expect("packet count must inspect");
        let resource_count = store
            .connection
            .query_row(
                "SELECT count(*) FROM lnsat_packet_resource_refs",
                [],
                |row| row.get::<_, i64>(0),
            )
            .expect("resource count must inspect");
        assert_eq!(packet_count, 1);
        assert_eq!(
            resource_count,
            i64::try_from(packet.resource_refs.len()).expect("fixture refs must fit")
        );
    }

    #[test]
    fn packet_reads_require_exact_project_and_resource_scope() {
        let database = TestDatabase::new("packet-scope");
        let packet = packet_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");

        assert!(
            store
                .read_packet_envelope_v1("project:other", &packet.packet_id)
                .expect("cross-project read must be safe")
                .is_none()
        );
        assert!(
            store
                .read_packet_envelope_for_resource_v1(
                    &packet.project_ref,
                    "repo:other",
                    &packet.packet_id,
                )
                .expect("cross-resource read must be safe")
                .is_none()
        );
        assert_eq!(
            store
                .read_packet_envelope_for_resource_v1(
                    &packet.project_ref,
                    &packet.resource_refs[0],
                    &packet.packet_id,
                )
                .expect("scoped packet read must succeed")
                .expect("scoped packet must exist")
                .packet,
            packet
        );
    }

    #[test]
    fn packet_rows_are_immutable_and_read_detects_evidence_drift() {
        let database = TestDatabase::new("packet-immutable");
        let packet = packet_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");

        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_packet_envelopes SET packet_type = 'AuditPacket'
                     WHERE packet_id = ?1",
                    [&packet.packet_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_packet_envelopes WHERE packet_id = ?1",
                    [&packet.packet_id],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_packet_envelopes_reject_update;")
            .expect("test must remove immutable guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_packet_envelopes SET packet_type = 'AuditPacket'
                 WHERE packet_id = ?1",
                [&packet.packet_id],
            )
            .expect("test must create evidence drift");
        assert_eq!(
            store.read_packet_envelope_v1(&packet.project_ref, &packet.packet_id),
            Err(PacketStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn policy_append_reopen_read_and_exact_replay_are_stable() {
        let database = TestDatabase::new("policy-restart");
        let packet = packet_fixture();
        let decision = policy_fixture(&packet);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");

        let created = store
            .append_policy_decision_v1(&decision)
            .expect("policy decision must append");
        assert!(created.created);
        assert_eq!(created.record.decision, decision);
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        let read = reopened
            .read_policy_decision_v1(&decision.project_ref, &decision.decision_id)
            .expect("policy read must succeed")
            .expect("policy decision must exist");
        assert_eq!(read, created.record);
        let replay = reopened
            .append_policy_decision_v1(&decision)
            .expect("exact decision must replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);
    }

    #[test]
    fn policy_persists_approval_required_evidence_without_authority() {
        let database = TestDatabase::new("policy-approval");
        let mut packet = packet_fixture();
        packet.requires_approval = true;
        let decision = policy_fixture(&packet);
        assert_eq!(decision.decision.as_str(), "approval_required");
        assert!(decision.requires_approval);
        assert!(decision.side_effects.is_empty());

        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        let saved = store
            .append_policy_decision_v1(&decision)
            .expect("approval-required decision must append");

        assert!(saved.created);
        assert_eq!(saved.record.decision, decision);
    }

    #[test]
    fn policy_append_rejects_missing_or_mismatched_packet_evidence_atomically() {
        let database = TestDatabase::new("policy-binding");
        let packet = packet_fixture();
        let decision = policy_fixture(&packet);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        assert_eq!(
            store.append_policy_decision_v1(&decision),
            Err(PolicyStoreErrorV1::InvalidDecision)
        );
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        let mut mismatched = decision;
        mismatched.packet_ref.packet_hash = format!("sha256:{}", "0".repeat(64));
        assert_eq!(
            store.append_policy_decision_v1(&mismatched),
            Err(PolicyStoreErrorV1::InvalidDecision)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_policy_decisions", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("policy count must inspect"),
            0
        );
    }

    #[test]
    fn policy_reads_require_exact_project_and_resource_scope() {
        let database = TestDatabase::new("policy-scope");
        let packet = packet_fixture();
        let decision = policy_fixture(&packet);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&decision)
            .expect("policy decision must append");

        assert!(
            store
                .read_policy_decision_v1("project:other", &decision.decision_id)
                .expect("cross-project read must be safe")
                .is_none()
        );
        assert!(
            store
                .read_policy_decision_for_resource_v1(
                    &decision.project_ref,
                    "repo:other",
                    &decision.decision_id,
                )
                .expect("cross-resource read must be safe")
                .is_none()
        );
        assert_eq!(
            store
                .read_policy_decision_for_resource_v1(
                    &decision.project_ref,
                    &decision.resource_refs[0],
                    &decision.decision_id,
                )
                .expect("scoped policy read must succeed")
                .expect("scoped policy decision must exist")
                .decision,
            decision
        );
    }

    #[test]
    fn policy_rows_are_immutable_and_read_detects_evidence_drift() {
        let database = TestDatabase::new("policy-immutable");
        let packet = packet_fixture();
        let decision = policy_fixture(&packet);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&decision)
            .expect("policy decision must append");

        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_policy_decisions SET decision = 'deny'
                     WHERE decision_id = ?1",
                    [&decision.decision_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_policy_decisions WHERE decision_id = ?1",
                    [&decision.decision_id],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_policy_decisions_reject_update;")
            .expect("test must remove immutable guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_policy_decisions SET decision = 'deny'
                 WHERE decision_id = ?1",
                [&decision.decision_id],
            )
            .expect("test must create policy drift");
        assert_eq!(
            store.read_policy_decision_v1(&decision.project_ref, &decision.decision_id),
            Err(PolicyStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn competing_connections_serialize_policy_to_insert_and_exact_replay() {
        let database = TestDatabase::new("policy-race");
        let packet = packet_fixture();
        let decision = policy_fixture(&packet);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let decision = decision.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut store = SqliteStore::open(path).expect("database must open");
                    barrier.wait();
                    store
                        .append_policy_decision_v1(&decision)
                        .expect("competing policy append must resolve")
                        .created
                })
            })
            .collect::<Vec<_>>();
        let mut outcomes = handles
            .into_iter()
            .map(|handle| handle.join().expect("policy writer thread must finish"))
            .collect::<Vec<_>>();
        outcomes.sort_unstable();

        assert_eq!(outcomes, [false, true]);
    }

    #[test]
    fn approval_request_append_reopen_read_and_exact_replay_are_stable() {
        let database = TestDatabase::new("approval-request-restart");
        let (packet, policy, request) = approval_request_fixture();
        assert_eq!(request.status, "requested");
        assert!(request.side_effects.is_empty());
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");

        let created = store
            .append_approval_request_v1(&request)
            .expect("approval request must append");
        assert!(created.created);
        assert_eq!(created.record.request, request);
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        let read = reopened
            .read_approval_request_v1(&request.project_ref, &request.approval_request_id)
            .expect("approval request read must succeed")
            .expect("approval request must exist");
        assert_eq!(read, created.record);
        let replay = reopened
            .append_approval_request_v1(&request)
            .expect("exact approval request must replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);
    }

    #[test]
    fn approval_request_rejects_missing_or_mismatched_policy_atomically() {
        let database = TestDatabase::new("approval-request-binding");
        let (packet, policy, request) = approval_request_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        assert_eq!(
            store.append_approval_request_v1(&request),
            Err(ApprovalRequestStoreErrorV1::InvalidRequest)
        );
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        let mut mismatched = request;
        mismatched.policy_decision_ref.packet_hash = format!("sha256:{}", "0".repeat(64));
        assert_eq!(
            store.append_approval_request_v1(&mismatched),
            Err(ApprovalRequestStoreErrorV1::InvalidRequest)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_approval_requests", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("approval request count must inspect"),
            0
        );
    }

    #[test]
    fn approval_request_reads_require_exact_project_and_resource_scope() {
        let database = TestDatabase::new("approval-request-scope");
        let (packet, policy, request) = approval_request_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");

        assert!(
            store
                .read_approval_request_v1("project:other", &request.approval_request_id)
                .expect("cross-project read must be safe")
                .is_none()
        );
        assert!(
            store
                .read_approval_request_for_resource_v1(
                    &request.project_ref,
                    "repo:other",
                    &request.approval_request_id,
                )
                .expect("cross-resource read must be safe")
                .is_none()
        );
        assert_eq!(
            store
                .read_approval_request_for_resource_v1(
                    &request.project_ref,
                    &request.resource_refs[0],
                    &request.approval_request_id,
                )
                .expect("scoped approval request read must succeed")
                .expect("scoped approval request must exist")
                .request,
            request
        );
    }

    #[test]
    fn approval_request_rows_are_immutable_and_drift_detected() {
        let database = TestDatabase::new("approval-request-immutable");
        let (packet, policy, request) = approval_request_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");

        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_approval_requests
                     SET requester_ref = 'identity:agent:other'
                     WHERE approval_request_id = ?1",
                    [&request.approval_request_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_approval_requests
                     WHERE approval_request_id = ?1",
                    [&request.approval_request_id],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_approval_requests_reject_update;")
            .expect("test must remove immutable guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_approval_requests
                 SET requester_ref = 'identity:agent:other'
                 WHERE approval_request_id = ?1",
                [&request.approval_request_id],
            )
            .expect("test must create request drift");
        assert_eq!(
            store.read_approval_request_v1(&request.project_ref, &request.approval_request_id),
            Err(ApprovalRequestStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn competing_connections_serialize_request_to_insert_and_replay() {
        let database = TestDatabase::new("approval-request-race");
        let (packet, policy, request) = approval_request_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let request = request.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut store = SqliteStore::open(path).expect("database must open");
                    barrier.wait();
                    store
                        .append_approval_request_v1(&request)
                        .expect("competing request append must resolve")
                        .created
                })
            })
            .collect::<Vec<_>>();
        let mut outcomes = handles
            .into_iter()
            .map(|handle| handle.join().expect("request writer thread must finish"))
            .collect::<Vec<_>>();
        outcomes.sort_unstable();

        assert_eq!(outcomes, [false, true]);
    }

    #[test]
    fn approval_decision_append_reopen_read_and_exact_replay_are_stable() {
        let database = TestDatabase::new("approval-decision-restart");
        let (packet, policy, request, decision) = approval_decision_fixture();
        assert!(decision.approval_gate_satisfied);
        assert!(!decision.execution_authorized);
        assert!(decision.side_effects.is_empty());
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");

        let created = store
            .append_approval_decision_evidence_for_test_v1(&decision)
            .expect("approval decision must append");
        assert!(created.created);
        assert_eq!(created.record.decision, decision);
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        let read = reopened
            .read_approval_decision_v1(&request.project_ref, &decision.approval_decision_id)
            .expect("approval decision read must succeed")
            .expect("approval decision must exist");
        assert_eq!(read, created.record);
        let replay = reopened
            .append_approval_decision_evidence_for_test_v1(&decision)
            .expect("exact approval decision must replay");
        assert!(!replay.created);
        assert_eq!(replay.record, created.record);
    }

    #[test]
    fn approval_decision_rejects_missing_or_mismatched_request_atomically() {
        let database = TestDatabase::new("approval-decision-binding");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        assert_eq!(
            store.append_approval_decision_evidence_for_test_v1(&decision),
            Err(ApprovalDecisionStoreErrorV1::InvalidDecision)
        );
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");
        let mut mismatched = decision;
        mismatched.approval_request_ref.policy_decision_id = format!("pol_{}", "0".repeat(64));
        assert_eq!(
            store.append_approval_decision_evidence_for_test_v1(&mismatched),
            Err(ApprovalDecisionStoreErrorV1::InvalidDecision)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_approval_decisions", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("approval decision count must inspect"),
            0
        );
    }

    #[test]
    fn approval_decision_allows_one_terminal_outcome_per_request() {
        let database = TestDatabase::new("approval-decision-terminal");
        let (packet, policy, request, approved) = approval_decision_fixture();
        let denied = decide_approval_request_v1(
            &request,
            &ApprovalDecisionV1Input {
                approver_ref: "identity:human:reviewer".to_owned(),
                approver_session_ref: "session:local:reviewer-0001".to_owned(),
                decision: ApprovalDecisionV1Kind::Denied,
                reason: ApprovalDecisionV1Reason::EvidenceInsufficient,
                decided_at: "2026-07-22T20:03:00Z".to_owned(),
            },
        )
        .expect("denial must derive");
        assert!(!denied.approval_gate_satisfied);
        assert!(!denied.execution_authorized);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");
        store
            .append_approval_decision_evidence_for_test_v1(&approved)
            .expect("first terminal decision must append");

        assert_eq!(
            store.append_approval_decision_evidence_for_test_v1(&denied),
            Err(ApprovalDecisionStoreErrorV1::DecisionIdentityConflict)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_approval_decisions", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("approval decision count must inspect"),
            1
        );
    }

    #[test]
    fn approval_decision_reads_require_exact_project_and_resource_scope() {
        let database = TestDatabase::new("approval-decision-scope");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");
        store
            .append_approval_decision_evidence_for_test_v1(&decision)
            .expect("approval decision must append");

        assert!(
            store
                .read_approval_decision_v1("project:other", &decision.approval_decision_id)
                .expect("cross-project read must be safe")
                .is_none()
        );
        assert!(
            store
                .read_approval_decision_for_resource_v1(
                    &request.project_ref,
                    "repo:other",
                    &decision.approval_decision_id,
                )
                .expect("cross-resource read must be safe")
                .is_none()
        );
        assert_eq!(
            store
                .read_approval_decision_for_resource_v1(
                    &request.project_ref,
                    &request.resource_refs[0],
                    &decision.approval_decision_id,
                )
                .expect("scoped approval decision read must succeed")
                .expect("scoped approval decision must exist")
                .decision,
            decision
        );
    }

    #[test]
    fn approval_decision_rows_are_immutable_and_drift_detected() {
        let database = TestDatabase::new("approval-decision-immutable");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");
        store
            .append_approval_decision_evidence_for_test_v1(&decision)
            .expect("approval decision must append");

        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_approval_decisions
                     SET approver_ref = 'identity:human:other'
                     WHERE approval_decision_id = ?1",
                    [&decision.approval_decision_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_approval_decisions
                     WHERE approval_decision_id = ?1",
                    [&decision.approval_decision_id],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_approval_decisions_reject_update;")
            .expect("test must remove immutable guard");
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_approval_decisions
                     SET execution_authorized = 1
                     WHERE approval_decision_id = ?1",
                    [&decision.approval_decision_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_approval_decisions
                     SET approval_gate_satisfied = 0
                     WHERE approval_decision_id = ?1",
                    [&decision.approval_decision_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_approval_decisions
                     SET reason = 'approval.scope_rejected'
                     WHERE approval_decision_id = ?1",
                    [&decision.approval_decision_id],
                )
                .is_err()
        );
        store
            .connection
            .execute(
                "UPDATE lnsat_approval_decisions
                 SET approver_ref = 'identity:human:other'
                 WHERE approval_decision_id = ?1",
                [&decision.approval_decision_id],
            )
            .expect("test must create decision drift");
        assert_eq!(
            store.read_approval_decision_v1(&request.project_ref, &decision.approval_decision_id,),
            Err(ApprovalDecisionStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn competing_connections_serialize_decision_to_insert_and_replay() {
        let database = TestDatabase::new("approval-decision-race");
        let (packet, policy, request, decision) = approval_decision_fixture();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        store
            .append_packet_envelope_v1(&packet)
            .expect("packet must append");
        store
            .append_policy_decision_v1(&policy)
            .expect("policy must append");
        store
            .append_approval_request_v1(&request)
            .expect("approval request must append");
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let decision = decision.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut store = SqliteStore::open(path).expect("database must open");
                    barrier.wait();
                    store
                        .append_approval_decision_evidence_for_test_v1(&decision)
                        .expect("competing decision append must resolve")
                        .created
                })
            })
            .collect::<Vec<_>>();
        let mut outcomes = handles
            .into_iter()
            .map(|handle| handle.join().expect("decision writer thread must finish"))
            .collect::<Vec<_>>();
        outcomes.sort_unstable();

        assert_eq!(outcomes, [false, true]);
    }

    #[test]
    fn every_audit_family_reopens_reads_and_exact_replays() {
        let database = TestDatabase::new("audit-event-families");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);

        for event in &events {
            assert!(!event.authenticated_provenance);
            assert!(!event.persistence_requested);
            assert!(!event.execution_authorized);
            assert!(event.side_effects.is_empty());
            let created = store
                .append_audit_event_v1(event)
                .expect("audit event must append");
            assert!(created.created);
            assert_eq!(created.record.event, *event);
        }
        drop(store);

        let mut reopened = SqliteStore::open(&database.path).expect("database must reopen");
        for event in &events {
            let read = reopened
                .read_audit_event_v1(&event.project_ref, &event.event_id)
                .expect("audit event read must succeed")
                .expect("audit event must exist");
            assert_eq!(read.event, *event);
            let replay = reopened
                .append_audit_event_v1(event)
                .expect("exact audit event must replay");
            assert!(!replay.created);
            assert_eq!(replay.record, read);
        }
    }

    #[test]
    fn policy_audit_events_persist_allow_deny_and_approval_required() {
        let database = TestDatabase::new("audit-policy-statuses");
        let allow = packet_fixture();
        let mut deny = packet_fixture();
        deny.packet_id = "pkt_execute_v1_deny".to_owned();
        deny.idempotency_key = "idem_execute_v1_deny".to_owned();
        deny.permission_allow = vec!["database.prod.write".to_owned()];
        let mut approval = packet_fixture();
        approval.packet_id = "pkt_execute_v1_approval".to_owned();
        approval.idempotency_key = "idem_execute_v1_approval".to_owned();
        approval.permission_allow = vec!["deploy.request".to_owned()];
        let cases = [
            (allow, "allow"),
            (deny, "deny"),
            (approval, "approval_required"),
        ];
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        for (packet, expected_status) in cases {
            let policy = policy_fixture(&packet);
            let event = create_audit_event_v1(
                &AuditEventV1Input::PolicyDecision {
                    packet: Box::new(packet.clone()),
                    policy_decision: Box::new(policy.clone()),
                },
                "2026-07-22T20:00:10Z",
            )
            .expect("policy audit event must derive");
            assert_eq!(event.result_status.as_str(), expected_status);
            store
                .append_packet_envelope_v1(&packet)
                .expect("packet must append");
            store
                .append_policy_decision_v1(&policy)
                .expect("policy must append");
            store
                .append_audit_event_v1(&event)
                .expect("policy audit event must append");
            assert_eq!(
                store
                    .read_audit_event_v1(&event.project_ref, &event.event_id)
                    .expect("audit event read must succeed")
                    .expect("audit event must exist")
                    .event,
                event
            );
        }
    }

    #[test]
    fn audit_event_rejects_missing_or_mismatched_source_atomically() {
        let database = TestDatabase::new("audit-event-binding");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let event = &events[2];
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");

        assert_eq!(
            store.append_audit_event_v1(event),
            Err(AuditEventStoreErrorV1::InvalidEvent)
        );
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        let mut mismatched = event.clone();
        mismatched.packet_ref.packet_hash = format!("sha256:{}", "0".repeat(64));
        assert_eq!(
            store.append_audit_event_v1(&mismatched),
            Err(AuditEventStoreErrorV1::InvalidEvent)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_audit_events", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("audit event count must inspect"),
            0
        );
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM lnsat_audit_event_reason_codes",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("audit reason count must inspect"),
            0
        );
    }

    #[test]
    fn audit_event_idempotency_rejects_second_observation() {
        let database = TestDatabase::new("audit-event-idempotency");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let first = &events[2];
        let second = create_audit_event_v1(
            &AuditEventV1Input::ApprovalDecision {
                packet: Box::new(packet.clone()),
                policy_decision: Box::new(policy.clone()),
                approval_request: Box::new(request.clone()),
                approval_decision: Box::new(decision.clone()),
            },
            "2026-07-22T20:02:11Z",
        )
        .expect("second observation must derive");
        assert_eq!(second.idempotency_key, first.idempotency_key);
        assert_ne!(second.event_id, first.event_id);
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        store
            .append_audit_event_v1(first)
            .expect("first observation must append");

        assert_eq!(
            store.append_audit_event_v1(&second),
            Err(AuditEventStoreErrorV1::IdempotencyConflict)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_audit_events", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("audit event count must inspect"),
            1
        );
    }

    #[test]
    fn audit_event_reads_require_exact_project_and_resource_scope() {
        let database = TestDatabase::new("audit-event-scope");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let event = &events[2];
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        store
            .append_audit_event_v1(event)
            .expect("audit event must append");

        assert!(
            store
                .read_audit_event_v1("project:other", &event.event_id)
                .expect("cross-project read must be safe")
                .is_none()
        );
        assert!(
            store
                .read_audit_event_for_resource_v1(
                    &event.project_ref,
                    "repo:other",
                    &event.event_id,
                )
                .expect("cross-resource read must be safe")
                .is_none()
        );
        assert_eq!(
            store
                .read_audit_event_for_resource_v1(
                    &event.project_ref,
                    &event.resource_refs[0],
                    &event.event_id,
                )
                .expect("scoped audit read must succeed")
                .expect("scoped audit event must exist")
                .event,
            *event
        );
    }

    #[test]
    fn audit_rows_are_immutable_authority_closed_and_drift_detected() {
        let database = TestDatabase::new("audit-event-immutable");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let event = &events[2];
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        store
            .append_audit_event_v1(event)
            .expect("audit event must append");

        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_audit_events
                     SET actor_ref = 'identity:human:other'
                     WHERE event_id = ?1",
                    [&event.event_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_audit_events WHERE event_id = ?1",
                    [&event.event_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_audit_event_reason_codes
                     SET reason_code = 'approval.scope_rejected'
                     WHERE event_id = ?1",
                    [&event.event_id],
                )
                .is_err()
        );

        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_audit_events_reject_update;")
            .expect("test must remove immutable guard");
        for column in [
            "authenticated_provenance",
            "persistence_requested",
            "execution_authorized",
        ] {
            assert!(
                store
                    .connection
                    .execute(
                        &format!(
                            "UPDATE lnsat_audit_events SET {column} = 1
                             WHERE event_id = ?1"
                        ),
                        [&event.event_id],
                    )
                    .is_err(),
                "{column} must remain false",
            );
        }
        store
            .connection
            .execute(
                "UPDATE lnsat_audit_events
                 SET actor_ref = 'identity:human:other'
                 WHERE event_id = ?1",
                [&event.event_id],
            )
            .expect("test must create audit drift");
        assert_eq!(
            store.read_audit_event_v1(&event.project_ref, &event.event_id),
            Err(AuditEventStoreErrorV1::EvidenceDrift)
        );
    }

    #[test]
    fn competing_connections_serialize_audit_to_insert_and_replay() {
        let database = TestDatabase::new("audit-event-race");
        let (packet, policy, request, decision, events) = audit_event_fixtures();
        let event = events[2].clone();
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        persist_approval_chain(&mut store, &packet, &policy, &request, &decision);
        drop(store);

        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let event = event.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut store = SqliteStore::open(path).expect("database must open");
                    barrier.wait();
                    store
                        .append_audit_event_v1(&event)
                        .expect("competing audit append must resolve")
                        .created
                })
            })
            .collect::<Vec<_>>();
        let mut outcomes = handles
            .into_iter()
            .map(|handle| handle.join().expect("audit writer thread must finish"))
            .collect::<Vec<_>>();
        outcomes.sort_unstable();

        assert_eq!(outcomes, [false, true]);
    }

    #[cfg(unix)]
    #[test]
    fn creates_owner_only_database_file() {
        use std::os::unix::fs::PermissionsExt as _;

        let database = TestDatabase::new("permissions");
        let _store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let mode = fs::metadata(&database.path)
            .expect("database metadata must exist")
            .permissions()
            .mode()
            & 0o777;

        assert_eq!(mode, 0o600);
    }

    #[cfg(unix)]
    #[test]
    fn database_lease_is_owner_only_exclusive_and_symlink_refusing() {
        use std::os::unix::fs::{PermissionsExt as _, symlink};

        let database = TestDatabase::new("lease-security");
        drop(SqliteStore::open(&database.path).expect("database must bootstrap"));
        let daemon_lease = acquire_local_daemon_database_lease_v1(&database.path)
            .expect("daemon lease must acquire");
        let lease_path = PathBuf::from(format!("{}.lnsat.lock", database.path.display()));
        let mode = fs::metadata(&lease_path)
            .expect("lease metadata must exist")
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o600);
        assert!(matches!(
            acquire_offline_owner_recovery_authority_v1(&database.path),
            Err(LocalOwnerRecoveryErrorV1::DatabaseBusy)
        ));
        drop(daemon_lease);
        fs::remove_file(&lease_path).expect("test lease must remove");
        let symlink_target = TestDatabase::new("lease-symlink-target");
        fs::write(&symlink_target.path, b"lease target").expect("symlink target must create");
        symlink(&symlink_target.path, &lease_path).expect("lease symlink must create");
        assert!(matches!(
            acquire_offline_owner_recovery_authority_v1(&database.path),
            Err(LocalOwnerRecoveryErrorV1::InvalidInput)
        ));
    }

    #[test]
    fn rejects_future_schema_and_migration_drift() {
        let future_database = TestDatabase::new("future");
        drop(SqliteStore::open(&future_database.path).expect("database must bootstrap"));
        let future = Connection::open(&future_database.path).expect("database must open");
        future
            .pragma_update(None, "user_version", SQLITE_SCHEMA_VERSION + 1)
            .expect("test must set future version");
        drop(future);
        assert_eq!(
            SqliteStore::open(&future_database.path)
                .err()
                .expect("future schema must fail"),
            SqliteStoreError::UnsupportedSchemaVersion
        );

        let drift_database = TestDatabase::new("drift");
        drop(SqliteStore::open(&drift_database.path).expect("database must bootstrap"));
        let drift = Connection::open(&drift_database.path).expect("database must open");
        drift
            .execute(
                "UPDATE lnsat_schema_migrations
                 SET migration_sha256 = ?1
                 WHERE schema_version = ?2",
                params![format!("sha256:{}", "0".repeat(64)), SQLITE_SCHEMA_VERSION],
            )
            .expect("test must create migration drift");
        drop(drift);
        assert_eq!(
            SqliteStore::open(&drift_database.path)
                .err()
                .expect("migration drift must fail"),
            SqliteStoreError::MigrationDrift
        );
    }

    fn assert_passive_recovery_inspection(inspection: &SqliteRecoveryInspectionV1) {
        assert!(inspection.is_read_only());
        assert!(!inspection.automatic_action_taken());
    }

    #[test]
    fn recovery_inspection_classifies_ready_pending_and_empty() {
        let ready_database = TestDatabase::new("inspect-ready");
        drop(SqliteStore::open(&ready_database.path).expect("ready database must bootstrap"));
        let ready = SqliteStore::inspect_recovery_state_v1(&ready_database.path)
            .expect("ready database must inspect");
        assert_eq!(ready.disposition, SqliteRecoveryDispositionV1::Ready);
        assert_eq!(ready.disposition.as_str(), "ready");
        assert_eq!(ready.schema_version, Some(SQLITE_SCHEMA_VERSION));
        assert_eq!(ready.migration_count, Some(SQLITE_SCHEMA_VERSION));
        assert!(ready.integrity_ok);
        assert!(ready.is_structurally_ready());
        assert!(!ready.is_migration_eligible());
        assert!(!ready.quarantine_recommended());
        assert_passive_recovery_inspection(&ready);

        let pending_database = TestDatabase::new("inspect-pending");
        create_version_five_database(&pending_database.path);
        let pending = SqliteStore::inspect_recovery_state_v1(&pending_database.path)
            .expect("pending database must inspect");
        assert_eq!(
            pending.disposition,
            SqliteRecoveryDispositionV1::MigrationPending
        );
        assert_eq!(pending.schema_version, Some(5));
        assert_eq!(pending.migration_count, Some(5));
        assert!(pending.integrity_ok);
        assert!(!pending.is_structurally_ready());
        assert!(pending.is_migration_eligible());
        assert!(!pending.quarantine_recommended());
        assert_passive_recovery_inspection(&pending);

        let empty_database = TestDatabase::new("inspect-empty");
        prepare_database_file(&empty_database.path).expect("empty database file must create");
        let empty = SqliteStore::inspect_recovery_state_v1(&empty_database.path)
            .expect("empty database must inspect");
        assert_eq!(
            empty.disposition,
            SqliteRecoveryDispositionV1::BootstrapCandidate
        );
        assert_eq!(empty.schema_version, Some(0));
        assert_eq!(empty.migration_count, Some(0));
        assert!(empty.integrity_ok);
        assert!(!empty.is_structurally_ready());
        assert!(!empty.is_migration_eligible());
        assert!(!empty.quarantine_recommended());
        assert_passive_recovery_inspection(&empty);
    }

    #[test]
    fn recovery_inspection_classifies_unknown_future_and_drift() {
        let unknown_database = TestDatabase::new("inspect-unknown");
        let unknown = Connection::open(&unknown_database.path).expect("unknown database must open");
        unknown
            .execute_batch("CREATE TABLE unrelated (id INTEGER PRIMARY KEY) STRICT;")
            .expect("unknown schema must create");
        drop(unknown);
        let unknown = SqliteStore::inspect_recovery_state_v1(&unknown_database.path)
            .expect("unknown database must inspect");
        assert_eq!(
            unknown.disposition,
            SqliteRecoveryDispositionV1::UnrecognizedDatabase
        );
        assert!(unknown.integrity_ok);
        assert!(unknown.quarantine_recommended());
        assert_passive_recovery_inspection(&unknown);

        let future_database = TestDatabase::new("inspect-future");
        drop(SqliteStore::open(&future_database.path).expect("future database must bootstrap"));
        let future = Connection::open(&future_database.path).expect("future database must open");
        future
            .pragma_update(None, "user_version", SQLITE_SCHEMA_VERSION + 1)
            .expect("future version must set");
        drop(future);
        let future = SqliteStore::inspect_recovery_state_v1(&future_database.path)
            .expect("future database must inspect");
        assert_eq!(
            future.disposition,
            SqliteRecoveryDispositionV1::UnsupportedSchemaVersion
        );
        assert_eq!(future.schema_version, Some(SQLITE_SCHEMA_VERSION + 1));
        assert!(!future.is_structurally_ready());
        assert!(!future.is_migration_eligible());
        assert!(!future.quarantine_recommended());
        assert_passive_recovery_inspection(&future);

        let drift_database = TestDatabase::new("inspect-drift");
        drop(SqliteStore::open(&drift_database.path).expect("drift database must bootstrap"));
        let drift = Connection::open(&drift_database.path).expect("drift database must open");
        drift
            .execute(
                "UPDATE lnsat_schema_migrations
                 SET migration_sha256 = ?1
                 WHERE schema_version = ?2",
                params![format!("sha256:{}", "0".repeat(64)), SQLITE_SCHEMA_VERSION],
            )
            .expect("migration drift must write");
        drop(drift);
        let drift = SqliteStore::inspect_recovery_state_v1(&drift_database.path)
            .expect("drift database must inspect");
        assert_eq!(
            drift.disposition,
            SqliteRecoveryDispositionV1::MigrationDrift
        );
        assert!(!drift.integrity_ok);
        assert!(drift.quarantine_recommended());
        assert_passive_recovery_inspection(&drift);
    }

    #[test]
    fn recovery_inspection_classifies_integrity_failure_and_unreadable() {
        let integrity_database = TestDatabase::new("inspect-integrity");
        drop(
            SqliteStore::open(&integrity_database.path).expect("integrity database must bootstrap"),
        );
        let integrity =
            Connection::open(&integrity_database.path).expect("integrity database must open");
        integrity
            .pragma_update(None, "foreign_keys", "OFF")
            .expect("foreign keys must disable for corruption fixture");
        integrity
            .execute(
                "INSERT INTO lnsat_packet_resource_refs (
                   packet_id, project_ref, ordinal, resource_ref
                 ) VALUES ('pkt_missing', 'project:test', 0, 'repo:test')",
                [],
            )
            .expect("foreign-key corruption fixture must insert");
        drop(integrity);
        let integrity = SqliteStore::inspect_recovery_state_v1(&integrity_database.path)
            .expect("integrity database must inspect");
        assert_eq!(
            integrity.disposition,
            SqliteRecoveryDispositionV1::IntegrityFailure
        );
        assert!(!integrity.integrity_ok);
        assert!(integrity.quarantine_recommended());
        assert_passive_recovery_inspection(&integrity);

        let unreadable_database = TestDatabase::new("inspect-unreadable");
        fs::write(&unreadable_database.path, b"not a sqlite database")
            .expect("unreadable fixture must write");
        let unreadable = SqliteStore::inspect_recovery_state_v1(&unreadable_database.path)
            .expect("unreadable database must classify");
        assert_eq!(
            unreadable.disposition,
            SqliteRecoveryDispositionV1::Unreadable
        );
        assert_eq!(unreadable.schema_version, None);
        assert!(!unreadable.integrity_ok);
        assert!(unreadable.quarantine_recommended());
        assert_passive_recovery_inspection(&unreadable);
    }

    #[test]
    fn recovery_inspection_event_append_reopen_read_and_replay_are_stable() {
        let database = TestDatabase::new("recovery-event-ready");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let input = recovery_inspection_event_input(
            &database.path,
            "recovery-event:ready:0001",
            "2026-07-23T16:00:00Z",
        );

        let created = store
            .append_recovery_inspection_event_v1(&input)
            .expect("recovery event must append");
        assert!(created.created);
        let event = &created.record.event;
        assert_eq!(event.schema_id, RECOVERY_INSPECTION_EVENT_SCHEMA_V1);
        assert_eq!(event.disposition, SqliteRecoveryDispositionV1::Ready);
        assert_eq!(event.observed_schema_version, Some(SQLITE_SCHEMA_VERSION));
        assert_eq!(event.observed_migration_count, Some(SQLITE_SCHEMA_VERSION));
        assert!(event.integrity_ok);
        assert!(!event.quarantine_recommended);
        assert!(matches!(
            event.inspection_mode,
            SqliteRecoveryInspectionModeV1::ReadOnly
        ));
        assert!(matches!(
            event.automatic_action,
            SqliteRecoveryAutomaticActionV1::None
        ));
        assert!(!event.activation_authorized);
        assert!(is_sha256_identity(&event.event_id));
        assert!(is_sha256_identity(&event.target_path_sha256));
        assert!(
            !event.target_path_sha256.contains(
                database
                    .path
                    .to_str()
                    .expect("test path should be valid UTF-8")
            )
        );
        let event_id = event.event_id.clone();
        let expected_record = created.record.clone();

        let replay = store
            .append_recovery_inspection_event_v1(&input)
            .expect("exact replay must succeed");
        assert!(!replay.created);
        assert_eq!(replay.record, expected_record);
        drop(store);

        let reopened = SqliteStore::open(&database.path).expect("database must reopen");
        assert_eq!(
            reopened
                .read_recovery_inspection_event_v1(
                    &input.deployment_ref,
                    &input.target_ref,
                    &event_id,
                )
                .expect("recovery event read must succeed")
                .expect("recovery event must exist"),
            expected_record
        );
        assert_eq!(
            reopened
                .read_recovery_inspection_event_v1(
                    "deployment:local:other",
                    &input.target_ref,
                    &event_id,
                )
                .expect("cross-scope read must not fail"),
            None
        );
        assert_eq!(
            reopened.read_recovery_inspection_event_v1(
                &input.deployment_ref,
                &input.target_ref,
                "not-a-digest",
            ),
            Err(SqliteRecoveryInspectionEventErrorV1::InvalidInput)
        );

        let backup = TestDatabase::new("recovery-event-backup");
        let restored = TestDatabase::new("recovery-event-restored");
        reopened
            .create_online_backup_v1(&backup.path)
            .expect("event-bearing backup must succeed");
        drop(reopened);
        SqliteStore::restore_backup_v1(&backup.path, &restored.path)
            .expect("event-bearing restore must succeed");
        let restored_store = SqliteStore::open(&restored.path).expect("restored store must open");
        assert_eq!(
            restored_store
                .read_recovery_inspection_event_v1(
                    &input.deployment_ref,
                    &input.target_ref,
                    &event_id,
                )
                .expect("restored event read must succeed")
                .expect("restored event must exist"),
            expected_record
        );
    }

    #[test]
    fn recovery_inspection_event_conflicts_and_stored_drift_fail_closed() {
        let database = TestDatabase::new("recovery-event-conflict");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let input = recovery_inspection_event_input(
            &database.path,
            "recovery-event:conflict:0001",
            "2026-07-23T16:01:00Z",
        );
        let created = store
            .append_recovery_inspection_event_v1(&input)
            .expect("recovery event must append");

        let mut changed_evidence = input.clone();
        changed_evidence.observed_at = "2026-07-23T16:01:01Z".to_owned();
        assert_eq!(
            store.append_recovery_inspection_event_v1(&changed_evidence),
            Err(SqliteRecoveryInspectionEventErrorV1::IdempotencyConflict)
        );

        let mut changed_replay_key = input.clone();
        changed_replay_key.idempotency_key = "recovery-event:conflict:0002".to_owned();
        assert_eq!(
            store.append_recovery_inspection_event_v1(&changed_replay_key),
            Err(SqliteRecoveryInspectionEventErrorV1::EventIdentityConflict)
        );

        assert!(
            store
                .connection
                .execute(
                    "DELETE FROM lnsat_recovery_inspection_events
                     WHERE event_id = ?1",
                    [&created.record.event.event_id],
                )
                .is_err()
        );
        assert!(
            store
                .connection
                .execute(
                    "UPDATE lnsat_recovery_inspection_events
                     SET activation_authorized = 1
                     WHERE event_id = ?1",
                    [&created.record.event.event_id],
                )
                .is_err()
        );
        store
            .connection
            .execute_batch("DROP TRIGGER lnsat_recovery_inspection_events_reject_update;")
            .expect("test must remove update guard");
        store
            .connection
            .execute(
                "UPDATE lnsat_recovery_inspection_events
                 SET target_ref = 'database:local:drifted'
                 WHERE event_id = ?1",
                [&created.record.event.event_id],
            )
            .expect("test must create stored drift");
        assert_eq!(
            store.read_recovery_inspection_event_v1(
                &input.deployment_ref,
                "database:local:drifted",
                &created.record.event.event_id,
            ),
            Err(SqliteRecoveryInspectionEventErrorV1::EvidenceDrift)
        );
        drop(store);
        assert_eq!(
            SqliteStore::open(&database.path)
                .err()
                .expect("missing immutable trigger must fail"),
            SqliteStoreError::MigrationDrift
        );
    }

    #[test]
    fn competing_recovery_inspection_writers_serialize_to_insert_and_replay() {
        let database = TestDatabase::new("recovery-event-competing");
        drop(SqliteStore::open(&database.path).expect("database must bootstrap"));
        let barrier = Arc::new(Barrier::new(2));
        let handles = (0..2)
            .map(|_| {
                let path = database.path.clone();
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    let mut store = SqliteStore::open(&path).expect("writer must open");
                    let input = recovery_inspection_event_input(
                        &path,
                        "recovery-event:competing:0001",
                        "2026-07-23T16:01:30Z",
                    );
                    barrier.wait();
                    store
                        .append_recovery_inspection_event_v1(&input)
                        .expect("competing append must succeed")
                })
            })
            .collect::<Vec<_>>();
        let writes = handles
            .into_iter()
            .map(|handle| handle.join().expect("writer must join"))
            .collect::<Vec<_>>();

        assert_eq!(writes.iter().filter(|write| write.created).count(), 1);
        assert_eq!(writes.iter().filter(|write| !write.created).count(), 1);
        assert_eq!(writes[0].record, writes[1].record);
    }

    #[test]
    fn recovery_inspection_event_persists_quarantine_recommendation_without_action() {
        let database = TestDatabase::new("recovery-event-store");
        let unreadable = TestDatabase::new("recovery-event-unreadable");
        fs::write(&unreadable.path, b"not sqlite").expect("unreadable target must write");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let input = recovery_inspection_event_input(
            &unreadable.path,
            "recovery-event:unreadable:0001",
            "2026-07-23T16:02:00Z",
        );

        let created = store
            .append_recovery_inspection_event_v1(&input)
            .expect("unreadable inspection event must append");
        let event = &created.record.event;
        assert_eq!(event.disposition, SqliteRecoveryDispositionV1::Unreadable);
        assert_eq!(event.observed_schema_version, None);
        assert_eq!(event.observed_migration_count, None);
        assert!(!event.integrity_ok);
        assert!(event.quarantine_recommended);
        assert!(!event.activation_authorized);
        assert_eq!(
            store
                .plan_retention_v1(1)
                .expect("retention plan must inspect")
                .protected_record_count,
            1
        );

        let stored_fingerprint = store
            .connection
            .query_row(
                "SELECT target_path_sha256
                 FROM lnsat_recovery_inspection_events
                 WHERE event_id = ?1",
                [&event.event_id],
                |row| row.get::<_, String>(0),
            )
            .expect("stored fingerprint must read");
        assert_eq!(stored_fingerprint, event.target_path_sha256);
        assert!(
            !stored_fingerprint.contains(
                unreadable
                    .path
                    .to_str()
                    .expect("test path should be valid UTF-8")
            )
        );

        let mut invalid = input.clone();
        invalid.deployment_ref = "invalid reference".to_owned();
        assert_eq!(
            store.append_recovery_inspection_event_v1(&invalid),
            Err(SqliteRecoveryInspectionEventErrorV1::InvalidInput)
        );
        invalid = input.clone();
        invalid.observed_at = "2026-07-23 16:02:00".to_owned();
        assert_eq!(
            store.append_recovery_inspection_event_v1(&invalid),
            Err(SqliteRecoveryInspectionEventErrorV1::InvalidInput)
        );
        invalid = input;
        invalid.target_database_path = unreadable.path.with_extension("missing");
        assert_eq!(
            store.append_recovery_inspection_event_v1(&invalid),
            Err(SqliteRecoveryInspectionEventErrorV1::InspectionFailed)
        );
    }

    #[test]
    fn interrupted_owner_identity_migration_rolls_back_to_version_eight() {
        let database = TestDatabase::new("owner-migration-interrupted");
        create_version_eight_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-eight database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[8], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("schema version must inspect"),
            8
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table'
                       AND name = 'lnsat_local_identities'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back identity schema must inspect"),
            0
        );
        drop(connection);
        let recovered =
            SqliteStore::open(&database.path).expect("owner migration must recover forward");
        recovered
            .verify_schema()
            .expect("recovered current schema must verify");
    }

    #[test]
    fn interrupted_latest_migration_rolls_back_and_forward_recovers() {
        let database = TestDatabase::new("migration-interrupted");
        create_version_nine_database(&database.path);
        let before = SqliteStore::inspect_recovery_state_v1(&database.path)
            .expect("version-nine database must inspect");
        assert_eq!(
            before.disposition,
            SqliteRecoveryDispositionV1::MigrationPending
        );

        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-nine database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[9], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        drop(connection);

        let after_interruption = SqliteStore::inspect_recovery_state_v1(&database.path)
            .expect("interrupted database must inspect");
        assert_eq!(
            after_interruption.disposition,
            SqliteRecoveryDispositionV1::MigrationPending
        );
        assert_eq!(after_interruption.schema_version, Some(9));
        assert_eq!(after_interruption.migration_count, Some(9));
        let inspection =
            Connection::open(&database.path).expect("interrupted database must reopen");
        assert_eq!(
            inspection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table'
                       AND name = 'lnsat_local_sessions'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back schema must inspect"),
            0
        );
        assert_eq!(
            inspection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                },)
                .expect("version-nine retention must remain"),
            10
        );
        drop(inspection);

        let recovered = SqliteStore::open(&database.path)
            .expect("current binary must forward-recover migration");
        recovered
            .verify_integrity()
            .expect("recovered database must remain valid");
        drop(recovered);
        let after_recovery = SqliteStore::inspect_recovery_state_v1(&database.path)
            .expect("recovered database must inspect");
        assert_eq!(
            after_recovery.disposition,
            SqliteRecoveryDispositionV1::Ready
        );
        assert_eq!(after_recovery.schema_version, Some(SQLITE_SCHEMA_VERSION));
        assert_eq!(after_recovery.migration_count, Some(SQLITE_SCHEMA_VERSION));
        assert!(after_recovery.is_structurally_ready());
        assert!(!after_recovery.automatic_action_taken());
    }

    #[test]
    fn interrupted_session_lifecycle_migration_rolls_back_to_version_ten() {
        let database = TestDatabase::new("session-lifecycle-migration-interrupted");
        create_version_ten_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-ten database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[10], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("schema version must inspect"),
            10
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table'
                       AND name IN (
                         'lnsat_local_session_activity_events',
                         'lnsat_local_session_rotations'
                       )",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back lifecycle schema must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("version-ten retention must remain"),
            12
        );
        drop(connection);
        let recovered =
            SqliteStore::open(&database.path).expect("lifecycle migration must recover forward");
        recovered
            .verify_schema()
            .expect("recovered current schema must verify");
    }

    #[test]
    fn interrupted_identity_lifecycle_migration_rolls_back_to_version_eleven() {
        let database = TestDatabase::new("identity-lifecycle-migration-interrupted");
        create_version_eleven_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-eleven database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[11], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("schema version must inspect"),
            11
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table'
                       AND name = 'lnsat_local_identity_status_events'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back lifecycle schema must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("version-eleven retention must remain"),
            14
        );
        let credential_sql = connection
            .query_row(
                "SELECT sql FROM sqlite_schema
                 WHERE type = 'table'
                   AND name = 'lnsat_local_password_credentials'",
                [],
                |row| row.get::<_, String>(0),
            )
            .expect("credential schema must inspect");
        assert!(credential_sql.contains("credential_version = 1"));
        assert!(!credential_sql.contains("credential_version BETWEEN 1 AND 64"));
        drop(connection);

        let recovered =
            SqliteStore::open(&database.path).expect("identity lifecycle migration must recover");
        recovered
            .verify_schema()
            .expect("recovered current schema must verify");
    }

    #[test]
    fn interrupted_identity_audit_migration_rolls_back_to_version_twelve() {
        let database = TestDatabase::new("identity-audit-migration-interrupted");
        create_version_twelve_database(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-twelve database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[12], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("schema version must inspect"),
            12
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table'
                       AND name = 'lnsat_local_identity_events'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back audit schema must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("version-twelve retention must remain"),
            15
        );
        drop(connection);

        let recovered =
            SqliteStore::open(&database.path).expect("identity audit migration must recover");
        recovered
            .verify_schema()
            .expect("recovered current schema must verify");
    }

    #[test]
    fn interrupted_session_audit_migration_rolls_back_to_version_thirteen() {
        let database = TestDatabase::new("session-audit-migration-interrupted");
        let _issued = create_version_thirteen_database_with_session(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-thirteen database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[13], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("schema version must inspect"),
            13
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table'
                       AND name = 'lnsat_local_session_events'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back audit schema must inspect"),
            0
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("version-thirteen retention must remain"),
            i64::try_from(RETENTION_RECORD_FAMILIES_V13.len()).expect("family count must fit")
        );
        drop(connection);

        let recovered =
            SqliteStore::open(&database.path).expect("session audit migration must recover");
        recovered
            .verify_schema()
            .expect("recovered current schema must verify");
    }

    #[test]
    fn interrupted_offline_recovery_migration_rolls_back_to_version_fourteen() {
        let database = TestDatabase::new("offline-recovery-migration-interrupted");
        let _issued = create_version_fourteen_database_with_session(&database.path);
        let mut connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("version-fourteen database must open");
        configure_connection(&connection).expect("database must configure");
        assert_eq!(
            apply_migration_with_precommit(&mut connection, MIGRATIONS[14], || {
                Err(SqliteStoreError::MigrationFailed)
            }),
            Err(SqliteStoreError::MigrationFailed)
        );
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("schema version must inspect"),
            14
        );
        let identity_table_sql = connection
            .query_row(
                "SELECT sql FROM sqlite_schema
                 WHERE type = 'table' AND name = 'lnsat_local_identity_events'",
                [],
                |row| row.get::<_, String>(0),
            )
            .expect("identity event schema must inspect");
        assert!(!identity_table_sql.contains("owner_recovered"));
        let session_table_sql = connection
            .query_row(
                "SELECT sql FROM sqlite_schema
                 WHERE type = 'table' AND name = 'lnsat_local_session_events'",
                [],
                |row| row.get::<_, String>(0),
            )
            .expect("session event schema must inspect");
        assert!(!session_table_sql.contains("revocation_reason = 'recovery'"));
        drop(connection);

        let recovered =
            SqliteStore::open(&database.path).expect("offline recovery migration must recover");
        recovered
            .verify_schema()
            .expect("recovered current schema must verify");
    }

    #[test]
    fn sqlite_full_rolls_back_raw_and_public_atomic_writes() {
        use rusqlite::ErrorCode;

        let database = TestDatabase::new("capacity-exhausted");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        let baseline = packet_fixture();
        store
            .append_packet_envelope_v1(&baseline)
            .expect("baseline packet must append");
        store
            .connection
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .expect("baseline WAL must checkpoint");
        let page_count =
            pragma_i64(&store.connection, "page_count").expect("page count must inspect");
        store
            .connection
            .pragma_update(None, "max_page_count", page_count)
            .expect("page limit must constrain database");

        let transaction = store
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .expect("capacity transaction must begin");
        let raw_error = transaction
            .execute_batch(
                "CREATE TABLE capacity_probe (
                   id INTEGER PRIMARY KEY,
                   payload BLOB NOT NULL
                 ) STRICT;
                 INSERT INTO capacity_probe (payload) VALUES (zeroblob(1048576));",
            )
            .expect_err("capacity write must fail");
        assert_eq!(raw_error.sqlite_error_code(), Some(ErrorCode::DiskFull));
        drop(transaction);
        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table' AND name = 'capacity_probe'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("rolled-back capacity schema must inspect"),
            0
        );

        let mut oversized = packet_fixture();
        oversized.packet_id = "pkt_execute_v1_capacity".to_owned();
        oversized.idempotency_key = "idem_execute_v1_capacity".to_owned();
        oversized.resource_refs = (0..4_096)
            .map(|index| format!("repo:capacity-{index:04}"))
            .collect();
        assert_eq!(
            store.append_packet_envelope_v1(&oversized),
            Err(PacketStoreErrorV1::PersistenceFailed)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT count(*) FROM lnsat_packet_envelopes", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("packet count must inspect"),
            1
        );
        assert_eq!(
            store
                .read_packet_envelope_v1(&baseline.project_ref, &baseline.packet_id)
                .expect("baseline read must succeed")
                .expect("baseline packet must remain")
                .packet,
            baseline
        );
        store.verify_schema().expect("schema must remain exact");
        store
            .verify_integrity()
            .expect("database must remain valid");

        store
            .connection
            .pragma_update(None, "max_page_count", page_count + 16_384)
            .expect("capacity must restore");
        let recovered_write = store
            .append_packet_envelope_v1(&oversized)
            .expect("same write must succeed after capacity recovery");
        assert!(recovered_write.created);
        assert_eq!(recovered_write.record.packet, oversized);
    }

    #[test]
    fn dropped_immediate_transaction_rolls_back_every_change() {
        let database = TestDatabase::new("rollback");
        let mut store = SqliteStore::open(&database.path).expect("database must bootstrap");
        {
            let transaction = store
                .connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .expect("transaction must begin");
            transaction
                .execute_batch(
                    "CREATE TABLE transient_write (
                       id INTEGER PRIMARY KEY
                     ) STRICT;
                     INSERT INTO transient_write (id) VALUES (1);",
                )
                .expect("test mutation must execute");
        }

        assert_eq!(
            store
                .connection
                .query_row(
                    "SELECT count(*) FROM sqlite_schema
                     WHERE type = 'table' AND name = 'transient_write'",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("schema must inspect"),
            0
        );
        store.verify_schema().expect("schema must remain exact");
        store
            .verify_integrity()
            .expect("database must remain valid");
    }

    #[test]
    fn rejects_in_memory_symlink_directory_and_unknown_database() {
        assert_eq!(
            SqliteStore::open(":memory:")
                .err()
                .expect("in-memory store must fail"),
            SqliteStoreError::InMemoryPathForbidden
        );

        let directory = std::env::temp_dir();
        assert_eq!(
            SqliteStore::open(&directory)
                .err()
                .expect("directory must fail"),
            SqliteStoreError::PathNotFile
        );

        let unknown_database = TestDatabase::new("unknown");
        let unknown = Connection::open(&unknown_database.path).expect("database must open");
        unknown
            .execute_batch("CREATE TABLE unrelated (id INTEGER PRIMARY KEY) STRICT;")
            .expect("unknown schema must create");
        drop(unknown);
        assert_eq!(
            SqliteStore::open(&unknown_database.path)
                .err()
                .expect("unknown schema must fail"),
            SqliteStoreError::UnrecognizedDatabase
        );
        let unknown = Connection::open(&unknown_database.path).expect("database must reopen");
        let journal_mode = unknown
            .query_row("PRAGMA journal_mode", [], |row| row.get::<_, String>(0))
            .expect("journal mode must inspect");
        assert_eq!(journal_mode, "delete");

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;

            let target_database = TestDatabase::new("symlink-target");
            drop(SqliteStore::open(&target_database.path).expect("target must bootstrap"));
            let link_database = TestDatabase::new("symlink-link");
            symlink(&target_database.path, &link_database.path).expect("symlink must create");
            assert_eq!(
                SqliteStore::open(&link_database.path)
                    .err()
                    .expect("symlink must fail"),
                SqliteStoreError::SymlinkForbidden
            );
        }
    }

    mod phase7_atomic_consumption;
    mod phase7_git_adapter;
    mod phase7_local_authorization;
    mod phase7d_signed_candidate;
    mod phase8_runtime_composition;
}
