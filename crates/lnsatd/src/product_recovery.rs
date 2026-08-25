//! Offline Phase 10 recovery command composition.
//!
//! These entry points require explicit local paths, run only as a non-root
//! process, and never expose a served API, MCP tool, or Control Center action.

use crate::product_surface::{
    CLI_OUTPUT_SCHEMA_V1, ProductExitCodeV1, current_process_is_non_root_v1,
};
use lnsat_store::{
    LocalOwnerRecoveryErrorV1, LocalOwnerRecoveryInputV1, OfflineOwnerRecoveryAuthorityV1,
    SqliteRecoveryDispositionV1, SqliteRecoveryErrorV1, SqliteStore,
    acquire_offline_owner_recovery_authority_v1,
};
use serde_json::json;
use std::fmt;
use std::io::Read;
use std::path::Path;
use zeroize::Zeroizing;

/// Stable contract for source-only offline recovery commands.
pub const OPERATOR_RECOVERY_CONTRACT_ID_V1: &str = "lnsat.operator_recovery.v1";

/// Maximum UTF-8 bytes accepted for one replacement password from stdin.
pub const MAX_RECOVERY_PASSWORD_STDIN_BYTES_V1: usize = 4 * 1024;

/// Stable public-safe failure for offline recovery composition.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProductRecoveryErrorV1 {
    /// A backup or restore primitive rejected the request.
    SqliteRecovery(SqliteRecoveryErrorV1),
    /// Offline owner-recovery authority or evidence rejected the request.
    OwnerRecovery(LocalOwnerRecoveryErrorV1),
    /// Source database was not exact current, intact, ready evidence.
    SourceNotReady,
    /// Current effective UID is privileged or unsupported.
    NonRootRequired,
    /// One protected stdin password was missing, malformed, or oversized.
    PasswordStdinInvalid,
    /// Current source database could not reopen after read-only readiness proof.
    StoreOpenFailed,
}

impl ProductRecoveryErrorV1 {
    /// Stable public-safe error code.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::SqliteRecovery(error) => error.code(),
            Self::OwnerRecovery(error) => error.code(),
            Self::SourceNotReady => "lnsatctl.recovery.source_not_ready",
            Self::NonRootRequired => "lnsatctl.runtime.non_root_required",
            Self::PasswordStdinInvalid => "lnsatctl.recovery.password_stdin_invalid",
            Self::StoreOpenFailed => "lnsatctl.recovery.store_open_failed",
        }
    }

    /// Stable process-exit family for one fail-closed command result.
    #[must_use]
    pub const fn exit_code(self) -> ProductExitCodeV1 {
        match self {
            Self::SqliteRecovery(
                SqliteRecoveryErrorV1::PathRequired
                | SqliteRecoveryErrorV1::InMemoryPathForbidden
                | SqliteRecoveryErrorV1::SymlinkForbidden
                | SqliteRecoveryErrorV1::PathInvalid,
            )
            | Self::OwnerRecovery(LocalOwnerRecoveryErrorV1::InvalidInput)
            | Self::PasswordStdinInvalid => ProductExitCodeV1::UsageOrConfiguration,
            Self::SqliteRecovery(
                SqliteRecoveryErrorV1::SourceDestinationConflict
                | SqliteRecoveryErrorV1::DestinationExists,
            )
            | Self::OwnerRecovery(LocalOwnerRecoveryErrorV1::DatabaseBusy) => {
                ProductExitCodeV1::Conflict
            }
            Self::SqliteRecovery(
                SqliteRecoveryErrorV1::SourceInvalid | SqliteRecoveryErrorV1::EvidenceMismatch,
            )
            | Self::OwnerRecovery(
                LocalOwnerRecoveryErrorV1::AuthorityRejected
                | LocalOwnerRecoveryErrorV1::EvidenceDrift,
            )
            | Self::SourceNotReady
            | Self::NonRootRequired
            | Self::StoreOpenFailed => ProductExitCodeV1::Refused,
            Self::SqliteRecovery(
                SqliteRecoveryErrorV1::BackupFailed | SqliteRecoveryErrorV1::RestoreFailed,
            )
            | Self::OwnerRecovery(LocalOwnerRecoveryErrorV1::PersistenceFailed) => {
                ProductExitCodeV1::TemporaryFailure
            }
        }
    }
}

impl From<SqliteRecoveryErrorV1> for ProductRecoveryErrorV1 {
    fn from(error: SqliteRecoveryErrorV1) -> Self {
        Self::SqliteRecovery(error)
    }
}

impl From<LocalOwnerRecoveryErrorV1> for ProductRecoveryErrorV1 {
    fn from(error: LocalOwnerRecoveryErrorV1) -> Self {
        Self::OwnerRecovery(error)
    }
}

impl fmt::Display for ProductRecoveryErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for ProductRecoveryErrorV1 {}

/// Prepared offline owner-recovery state held across protected stdin intake.
///
/// Construction proves non-root execution, daemon quiescence, exact current
/// schema, and integrity before caller reads replacement password bytes.
pub struct PreparedOwnerRecoveryV1 {
    authority: OfflineOwnerRecoveryAuthorityV1,
    store: SqliteStore,
}

/// Creates one offline consistent backup at a fresh explicit path.
///
/// Output intentionally does not reflect either local path.
///
/// # Errors
///
/// Refuses root execution, a live daemon lease, non-ready source evidence,
/// unsafe paths, existing destinations, or failed verified publication.
pub fn create_offline_backup_output_json_v1(
    database_path: impl AsRef<Path>,
    backup_path: impl AsRef<Path>,
) -> Result<String, ProductRecoveryErrorV1> {
    require_non_root_v1()?;
    let database_path = database_path.as_ref();
    let _authority = acquire_offline_owner_recovery_authority_v1(database_path)?;
    let store = open_ready_store_v1(database_path)?;
    let evidence = store.create_online_backup_v1(backup_path)?;
    Ok(json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "contract": OPERATOR_RECOVERY_CONTRACT_ID_V1,
        "command": "backup",
        "source": "explicit_offline_database",
        "destination": "explicit_fresh_backup",
        "evidence": {
            "schema_version": evidence.schema_version,
            "migration_count": evidence.migration_count,
            "file_size_bytes": evidence.file_size_bytes,
            "snapshot_sha256": evidence.backup_sha256,
            "online_consistent_snapshot": evidence.online_consistent,
            "replaced_existing": evidence.replaced_existing
        },
        "daemon_quiescence_proved": true,
        "non_root_enforced": true,
        "served_mutation": false,
        "activation_authority": false,
        "side_effects": ["backup_snapshot_created"]
    })
    .to_string())
}

/// Restores one verified backup into a fresh inert explicit path.
///
/// Output intentionally does not reflect either local path.
///
/// # Errors
///
/// Refuses root execution, unsafe source/destination evidence, an existing
/// destination, corruption, or mismatched copied bytes.
pub fn restore_inert_backup_output_json_v1(
    backup_path: impl AsRef<Path>,
    restored_database_path: impl AsRef<Path>,
) -> Result<String, ProductRecoveryErrorV1> {
    require_non_root_v1()?;
    let evidence = SqliteStore::restore_backup_v1(backup_path, restored_database_path)?;
    Ok(json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "contract": OPERATOR_RECOVERY_CONTRACT_ID_V1,
        "command": "restore",
        "source": "explicit_verified_backup",
        "destination": "explicit_fresh_inert_database",
        "evidence": {
            "schema_version": evidence.schema_version,
            "migration_count": evidence.migration_count,
            "file_size_bytes": evidence.file_size_bytes,
            "snapshot_sha256": evidence.snapshot_sha256,
            "replaced_existing": evidence.replaced_existing,
            "activated": evidence.activated
        },
        "non_root_enforced": true,
        "served_mutation": false,
        "activation_authority": false,
        "side_effects": ["inert_restore_created"]
    })
    .to_string())
}

/// Proves offline authority and source readiness before password intake.
///
/// # Errors
///
/// Refuses root execution, a live daemon lease, or non-ready source evidence.
pub fn prepare_owner_recovery_v1(
    database_path: impl AsRef<Path>,
) -> Result<PreparedOwnerRecoveryV1, ProductRecoveryErrorV1> {
    require_non_root_v1()?;
    let database_path = database_path.as_ref();
    let authority = acquire_offline_owner_recovery_authority_v1(database_path)?;
    let store = open_ready_store_v1(database_path)?;
    Ok(PreparedOwnerRecoveryV1 { authority, store })
}

/// Executes one prepared owner credential recovery.
///
/// Output contains no password or verifier bytes.
///
/// # Errors
///
/// Refuses invalid owner/time/password input, evidence drift, or failed atomic
/// persistence. Store core rolls back every recovery effect on failure.
pub fn recover_prepared_owner_output_json_v1(
    mut prepared: PreparedOwnerRecoveryV1,
    expected_owner_identity_ref: &str,
    recovered_at: &str,
    new_password: &str,
) -> Result<String, ProductRecoveryErrorV1> {
    let result = prepared.store.recover_local_owner_offline_v1(
        &prepared.authority,
        &LocalOwnerRecoveryInputV1 {
            expected_owner_identity_ref,
            new_password,
            recovered_at,
        },
    )?;
    Ok(json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "contract": OPERATOR_RECOVERY_CONTRACT_ID_V1,
        "command": "recovery.owner",
        "authority": "offline_exclusive_database_lease",
        "secret_intake": "protected_stdin",
        "identity_ref": result.identity_ref,
        "credential_version": result.credential_version,
        "recovered_at": result.recovered_at,
        "revoked_session_count": result.revoked_session_count,
        "daemon_quiescence_proved": true,
        "non_root_enforced": true,
        "served_mutation": false,
        "activation_authority": false,
        "side_effects": [
            "password_credential_evidence_appended",
            "owner_session_revocations_appended",
            "session_security_events_appended",
            "identity_security_event_appended"
        ]
    })
    .to_string())
}

/// Reads one password from protected stdin with one optional terminal newline.
///
/// Spaces are preserved as password bytes. NUL, embedded line breaks, empty,
/// non-UTF-8, and oversized input fail closed. Returned storage zeroizes.
///
/// # Errors
///
/// Returns one stable non-reflective input error.
pub fn read_recovery_password_stdin_v1(
    input: &mut impl Read,
) -> Result<Zeroizing<String>, ProductRecoveryErrorV1> {
    let mut bytes = Zeroizing::new(Vec::with_capacity(MAX_RECOVERY_PASSWORD_STDIN_BYTES_V1 + 2));
    input
        .take(u64::try_from(MAX_RECOVERY_PASSWORD_STDIN_BYTES_V1 + 3).unwrap_or(u64::MAX))
        .read_to_end(&mut bytes)
        .map_err(|_| ProductRecoveryErrorV1::PasswordStdinInvalid)?;
    if bytes.is_empty() || bytes.contains(&0) {
        return Err(ProductRecoveryErrorV1::PasswordStdinInvalid);
    }
    if bytes.ends_with(b"\n") {
        bytes.pop();
        if bytes.ends_with(b"\r") {
            bytes.pop();
        }
    }
    if bytes.is_empty()
        || bytes.len() > MAX_RECOVERY_PASSWORD_STDIN_BYTES_V1
        || bytes.contains(&b'\n')
        || bytes.contains(&b'\r')
    {
        return Err(ProductRecoveryErrorV1::PasswordStdinInvalid);
    }
    let password = String::from_utf8(bytes.to_vec())
        .map_err(|_| ProductRecoveryErrorV1::PasswordStdinInvalid)?;
    Ok(Zeroizing::new(password))
}

fn require_non_root_v1() -> Result<(), ProductRecoveryErrorV1> {
    if current_process_is_non_root_v1() {
        Ok(())
    } else {
        Err(ProductRecoveryErrorV1::NonRootRequired)
    }
}

fn open_ready_store_v1(database_path: &Path) -> Result<SqliteStore, ProductRecoveryErrorV1> {
    let inspection = SqliteStore::inspect_recovery_state_v1(database_path)?;
    if inspection.disposition != SqliteRecoveryDispositionV1::Ready {
        return Err(ProductRecoveryErrorV1::SourceNotReady);
    }
    SqliteStore::open(database_path).map_err(|_| ProductRecoveryErrorV1::StoreOpenFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_stdin_preserves_spaces_and_rejects_ambiguous_bytes() {
        for input in [
            b"correct horse battery staple".as_slice(),
            b" correct horse battery staple \n",
            b"correct horse battery staple\r\n",
        ] {
            assert!(
                !read_recovery_password_stdin_v1(&mut &input[..])
                    .expect("one password must parse")
                    .is_empty()
            );
        }
        for input in [
            b"".as_slice(),
            b"\n",
            b"one\ntwo",
            b"one\rmore",
            b"one\0two",
        ] {
            assert_eq!(
                read_recovery_password_stdin_v1(&mut &input[..]),
                Err(ProductRecoveryErrorV1::PasswordStdinInvalid)
            );
        }
        let oversized = vec![b'x'; MAX_RECOVERY_PASSWORD_STDIN_BYTES_V1 + 1];
        assert_eq!(
            read_recovery_password_stdin_v1(&mut oversized.as_slice()),
            Err(ProductRecoveryErrorV1::PasswordStdinInvalid)
        );
    }

    #[test]
    fn recovery_failures_map_to_closed_exit_families() {
        assert_eq!(
            ProductRecoveryErrorV1::SqliteRecovery(SqliteRecoveryErrorV1::DestinationExists)
                .exit_code(),
            ProductExitCodeV1::Conflict
        );
        assert_eq!(
            ProductRecoveryErrorV1::OwnerRecovery(LocalOwnerRecoveryErrorV1::DatabaseBusy)
                .exit_code(),
            ProductExitCodeV1::Conflict
        );
        assert_eq!(
            ProductRecoveryErrorV1::NonRootRequired.exit_code(),
            ProductExitCodeV1::Refused
        );
    }
}
