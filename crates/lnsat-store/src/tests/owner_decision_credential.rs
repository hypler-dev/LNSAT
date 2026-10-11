use super::*;
use crate::owner_decision_credential::{
    CapturedCurrentOwnerCredentialV1, VerifiedCurrentOwnerCredentialV1,
    capture_current_owner_credential_v1, compute_current_owner_credential_v1,
    prepare_current_owner_credential_v1, recheck_current_owner_credential_v1,
};
use rusqlite::Transaction;

const OWNER: &str = "identity:human:owner";
const PASSWORD: &str = "correct horse battery staple";
const REPLACEMENT: &str = "replacement correct horse battery staple";

fn owner_store(name: &str) -> (TestDatabase, SqliteStore) {
    let database = TestDatabase::new(name);
    let mut store = SqliteStore::open(&database.path).expect("fixture store must open");
    store
        .bootstrap_local_owner_v1(&owner_bootstrap_input(PASSWORD))
        .expect("fixture owner must bootstrap");
    (database, store)
}

fn prepare(store: &SqliteStore, password: &str) -> VerifiedCurrentOwnerCredentialV1 {
    prepare_current_owner_credential_v1(store, OWNER, password)
        .expect("current fixture owner verification must succeed")
        .expect("valid fixture owner must produce a snapshot")
}

fn session_activity(store: &SqliteStore, session_id: &str) -> Vec<(i64, String, String)> {
    select_local_session_activity_v1(&store.connection, session_id)
        .expect("fixture session activity must read")
        .into_iter()
        .map(|row| {
            (
                row.activity_sequence,
                row.observed_at,
                row.activity_evidence_digest,
            )
        })
        .collect()
}

fn recheck(
    store: &SqliteStore,
    snapshot: &VerifiedCurrentOwnerCredentialV1,
) -> Result<(), LocalIdentityStoreErrorV1> {
    let transaction = Transaction::new_unchecked(&store.connection, TransactionBehavior::Immediate)
        .expect("caller must begin its immediate transaction");
    let result = recheck_current_owner_credential_v1(store, &transaction, snapshot);
    assert!(!transaction.is_autocommit());
    transaction.rollback().expect("caller must end transaction");
    result
}

// These fixtures bypass only an immutable row guard and restore its exact DDL.
// They simulate stored evidence substitution, never a supported mutation API.
fn mutate_rows(store: &SqliteStore, table: &str, mutation: impl FnOnce(&Connection)) {
    assert!(matches!(
        table,
        "lnsat_local_password_credentials" | "lnsat_local_identities"
    ));
    let trigger = format!("{table}_reject_update");
    let ddl: String = store
        .connection
        .query_row(
            "SELECT sql FROM sqlite_schema WHERE type = 'trigger' AND name = ?1",
            [&trigger],
            |row| row.get(0),
        )
        .expect("fixture guard DDL must read");
    store
        .connection
        .execute_batch(&format!("DROP TRIGGER {trigger}"))
        .expect("fixed fixture guard must remove");
    mutation(&store.connection);
    store
        .connection
        .execute_batch(&ddl)
        .expect("exact fixture guard DDL must restore");
    store
        .verify_schema()
        .expect("fixture schema must be intact");
}

#[test]
fn owner_decision_credential_rechecks_in_caller_transaction_without_any_write() {
    let (_database, mut store) = owner_store("owner-credential-read-only");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture session must issue");
    let before_events = session_activity(&store, &session.session.session_id);
    let before_changes = store.connection.total_changes();
    let snapshot = prepare(&store, PASSWORD);
    assert!(store.connection.is_autocommit());
    assert_eq!(recheck(&store, &snapshot), Ok(()));
    assert_eq!(
        store.verify_local_owner_password_v1(OWNER, PASSWORD),
        Ok(LocalCredentialVerificationV1::Verified)
    );
    assert!(store.connection.is_autocommit());
    assert_eq!(store.connection.total_changes(), before_changes);
    assert_eq!(
        session_activity(&store, &session.session.session_id),
        before_events
    );
}

#[test]
fn owner_decision_credential_rejects_missing_wrong_and_unbounded_candidates() {
    let (_database, store) = owner_store("owner-credential-candidates");
    let before = store.connection.total_changes();
    let over_characters = "x".repeat(129);
    let over_bytes = "𐀀".repeat(128) + "x";
    let with_nul = "bounded password\0candidate";
    for (identity, password) in [
        ("identity:human:missing", PASSWORD),
        ("identity:agent:owner", PASSWORD),
        (OWNER, "wrong but bounded password"),
        (OWNER, "short"),
        (OWNER, over_characters.as_str()),
        (OWNER, over_bytes.as_str()),
        (OWNER, with_nul),
    ] {
        assert!(
            prepare_current_owner_credential_v1(&store, identity, password)
                .expect("invalid candidate must reject safely")
                .is_none()
        );
        assert_eq!(
            store.verify_local_owner_password_v1(identity, password),
            Ok(LocalCredentialVerificationV1::Rejected)
        );
        assert!(store.connection.is_autocommit());
    }
    assert_eq!(store.connection.total_changes(), before);
}

#[test]
fn owner_decision_credential_never_prepares_non_owner_roles() {
    let (_database, mut store) = owner_store("owner-credential-roles");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture session must issue");
    for (identity, role) in [
        ("identity:human:operator", LocalIdentityRoleV1::Operator),
        ("identity:human:auditor", LocalIdentityRoleV1::Auditor),
    ] {
        store
            .create_local_identity_v1(
                &local_identity_create_input(
                    identity,
                    "Fixture Human",
                    role,
                    PASSWORD,
                    "2026-07-23T17:02:00Z",
                ),
                &session.raw_session_token,
                &session.raw_csrf_token,
                "2026-07-23T17:02:00Z",
            )
            .expect("owner must create a fixture non-owner");
        assert_eq!(
            store.verify_local_password_credential_v1(identity, PASSWORD),
            Ok(LocalCredentialVerificationV1::Verified)
        );
        assert!(
            prepare_current_owner_credential_v1(&store, identity, PASSWORD)
                .expect("valid non-owner credential must reject safely")
                .is_none()
        );
        assert_eq!(
            store.verify_local_owner_password_v1(identity, PASSWORD),
            Ok(LocalCredentialVerificationV1::Rejected)
        );
    }
}

#[test]
fn owner_decision_credential_denies_preparation_before_password_work_in_any_transaction() {
    let (_database, mut store) = owner_store("owner-credential-transaction-guard");
    // An invalid dummy would fail if the malformed-identity password branch
    // ran. The transaction guard must reject before reaching that branch.
    store.authentication_dummy_verifier = "invalid fixture verifier".to_owned();
    for behavior in [
        TransactionBehavior::Deferred,
        TransactionBehavior::Immediate,
    ] {
        let transaction = Transaction::new_unchecked(&store.connection, behavior)
            .expect("fixture caller transaction must begin");
        assert_eq!(
            prepare_current_owner_credential_v1(&store, "malformed", PASSWORD).err(),
            Some(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert_eq!(
            store.verify_local_owner_password_v1(OWNER, PASSWORD),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        assert!(!transaction.is_autocommit());
        transaction.rollback().expect("caller ends its transaction");
    }
}

#[test]
fn owner_decision_credential_rejects_rotation_between_verification_and_recheck() {
    let (_database, mut store) = owner_store("owner-credential-rotation");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture owner session must issue");
    let snapshot = prepare(&store, PASSWORD);
    store
        .rotate_local_password_credential_v1(
            &session.raw_session_token,
            &session.raw_csrf_token,
            &LocalPasswordRotationInputV1 {
                current_password: PASSWORD,
                new_password: REPLACEMENT,
                rotated_at: "2026-07-23T17:02:00Z",
            },
        )
        .expect("normal fixture rotation must commit between verification and recheck");
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&store, &prepare(&store, REPLACEMENT)), Ok(()));
    assert_eq!(
        store.verify_local_owner_password_v1(OWNER, PASSWORD),
        Ok(LocalCredentialVerificationV1::Rejected)
    );
    let current_snapshot = prepare(&store, REPLACEMENT);
    mutate_rows(&store, "lnsat_local_password_credentials", |connection| {
        connection
            .execute(
                "UPDATE lnsat_local_password_credentials SET created_at = ?1
                 WHERE identity_ref = ?2 AND credential_version = 1",
                params!["2026-07-23T17:00:01Z", OWNER],
            )
            .expect("fixture must corrupt only historical credential evidence");
    });
    // Validating only the unchanged latest row would miss this corruption.
    assert_eq!(
        recheck(&store, &current_snapshot),
        Err(LocalIdentityStoreErrorV1::EvidenceDrift)
    );
}

#[test]
fn owner_decision_credential_rejects_offline_recovery_between_verification_and_recheck() {
    let (database, mut store) = owner_store("owner-credential-recovery");
    let snapshot = prepare(&store, PASSWORD);
    let authority = acquire_offline_owner_recovery_authority_v1(&database.path)
        .expect("disposable offline fixture authority must acquire");
    store
        .recover_local_owner_offline_v1(
            &authority,
            &LocalOwnerRecoveryInputV1 {
                expected_owner_identity_ref: OWNER,
                new_password: REPLACEMENT,
                recovered_at: "2026-07-23T17:02:00Z",
            },
        )
        .expect("normal fixture recovery must commit");
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&store, &prepare(&store, REPLACEMENT)), Ok(()));
}

#[test]
fn owner_decision_credential_denies_valid_same_version_verifier_substitution() {
    let (_database, store) = owner_store("owner-credential-phc-substitution");
    let snapshot = prepare(&store, PASSWORD);
    let verifier = Zeroizing::new(
        create_local_password_verifier_v1(REPLACEMENT)
            .expect("replacement fixture verifier must derive"),
    );
    let created_at = owner_bootstrap_input(PASSWORD).created_at;
    let credential_id = local_password_credential_id_v1(OWNER, 1, &verifier, created_at);
    mutate_rows(&store, "lnsat_local_password_credentials", |connection| {
        connection
            .execute(
                "UPDATE lnsat_local_password_credentials SET credential_id = ?1,
                 password_verifier = ?2 WHERE identity_ref = ?3 AND credential_version = 1",
                params![credential_id, verifier.as_str(), OWNER],
            )
            .expect("fixture must replace PHC and its matching bound credential ID");
    });
    // This is a valid generation-1 replacement, not just malformed evidence.
    assert_eq!(
        store.verify_local_owner_password_v1(OWNER, REPLACEMENT),
        Ok(LocalCredentialVerificationV1::Verified)
    );
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&store, &prepare(&store, REPLACEMENT)), Ok(()));
}

#[test]
fn owner_decision_credential_denies_malformed_profile_and_credential_evidence() {
    for column in ["verifier_profile", "credential_id"] {
        let (_database, store) = owner_store("owner-credential-invalid-evidence");
        let snapshot = prepare(&store, PASSWORD);
        mutate_rows(&store, "lnsat_local_password_credentials", |connection| {
            // Corrupt persisted evidence in a disposable fixture, then restore
            // constraint enforcement before invoking production validation.
            connection
                .pragma_update(None, "ignore_check_constraints", true)
                .expect("fixture constraints must temporarily bypass");
            connection.execute(
                &format!("UPDATE lnsat_local_password_credentials SET {column} = ?1 WHERE identity_ref = ?2"),
                params!["invalid fixture evidence", OWNER],
            ).expect("fixture evidence must corrupt");
            connection
                .pragma_update(None, "ignore_check_constraints", false)
                .expect("fixture constraint enforcement must restore");
        });
        assert_eq!(
            recheck(&store, &snapshot),
            Err(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
        assert_eq!(
            prepare_current_owner_credential_v1(&store, OWNER, PASSWORD).err(),
            Some(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
        assert_eq!(
            store.verify_local_owner_password_v1(OWNER, PASSWORD),
            Err(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
        assert!(store.connection.is_autocommit());
    }
}

#[test]
fn owner_decision_credential_rechecks_immutable_identity_and_owner_role() {
    for (column, value) in [("display_name", "Changed Owner"), ("role", "operator")] {
        let (_database, store) = owner_store("owner-credential-identity-drift");
        let snapshot = prepare(&store, PASSWORD);
        mutate_rows(&store, "lnsat_local_identities", |connection| {
            connection.execute(
                &format!("UPDATE lnsat_local_identities SET {column} = ?1, owner_singleton = CASE WHEN ?2 = 'role' THEN NULL ELSE owner_singleton END WHERE identity_ref = ?3"),
                params![value, column, OWNER],
            ).expect("fixture immutable identity must substitute");
        });
        assert_eq!(
            recheck(&store, &snapshot),
            Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
        );
        if column == "role" {
            assert_eq!(
                store.verify_local_owner_password_v1(OWNER, PASSWORD),
                Ok(LocalCredentialVerificationV1::Rejected)
            );
        }
    }
}

#[test]
fn owner_decision_credential_never_accepts_fixture_disabled_owner_evidence() {
    let (_database, mut store) = owner_store("owner-credential-disabled");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture session must issue");
    let snapshot = prepare(&store, PASSWORD);
    let changed_at = "2026-07-23T17:02:00Z";
    let digest = local_identity_status_evidence_digest_v1(
        OWNER,
        1,
        "disabled",
        &session.session.session_id,
        changed_at,
    );
    // V1 has no valid owner-disable transition. Even digest-consistent fixture
    // lifecycle bytes cannot become an accepted owner credential snapshot.
    store
        .connection
        .execute(
            "INSERT INTO lnsat_local_identity_status_events (identity_ref, status_sequence,
         status, actor_session_id, changed_at, status_evidence_digest)
         VALUES (?1, 1, 'disabled', ?2, ?3, ?4)",
            params![OWNER, session.session.session_id, changed_at, digest],
        )
        .expect("fixture-only owner status evidence must insert");
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::EvidenceDrift)
    );
    assert_eq!(
        store.verify_local_owner_password_v1(OWNER, PASSWORD),
        Err(LocalIdentityStoreErrorV1::EvidenceDrift)
    );
    assert_eq!(
        capture_current_owner_credential_v1(&store, OWNER).err(),
        Some(LocalIdentityStoreErrorV1::EvidenceDrift)
    );
}

#[test]
fn owner_decision_credential_binds_store_instance_and_actual_transaction_connection() {
    let (database, store) = owner_store("owner-credential-instance");
    let snapshot = prepare(&store, PASSWORD);
    let second = SqliteStore::open(&database.path).expect("another store must read identical rows");
    let transaction = second
        .connection
        .unchecked_transaction()
        .expect("other connection transaction must begin");
    // Snapshot and receiver agree, but the transaction belongs to B.
    assert_eq!(
        recheck_current_owner_credential_v1(&store, &transaction, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    // Receiver and transaction agree, but the snapshot belongs to A.
    assert_eq!(
        recheck_current_owner_credential_v1(&second, &transaction, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    transaction
        .rollback()
        .expect("other caller must end its transaction");
    drop(second);
    let moved = Box::new(store);
    assert_eq!(recheck(&moved, &snapshot), Ok(()));
    drop(moved);
    let reopened = SqliteStore::open(&database.path).expect("original bytes must reopen");
    assert_eq!(
        recheck(&reopened, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&reopened, &prepare(&reopened, PASSWORD)), Ok(()));
}

macro_rules! assert_credential_not_impl {
    ($type:ty, $bound:path) => {{
        trait AmbiguousIfImpl<A> {
            fn check() {}
        }
        impl<T: ?Sized> AmbiguousIfImpl<()> for T {}
        impl<T: ?Sized + $bound> AmbiguousIfImpl<u8> for T {}
        <$type as AmbiguousIfImpl<_>>::check();
    }};
}

#[test]
fn owner_decision_credential_capture_has_owned_and_opaque_compile_time_bounds() {
    fn assert_static<T: 'static>() {}

    assert_static::<CapturedCurrentOwnerCredentialV1>();
    assert_credential_not_impl!(CapturedCurrentOwnerCredentialV1, Clone);
    assert_credential_not_impl!(CapturedCurrentOwnerCredentialV1, std::fmt::Debug);
    assert_credential_not_impl!(CapturedCurrentOwnerCredentialV1, serde::Serialize);
    assert_credential_not_impl!(CapturedCurrentOwnerCredentialV1, std::ops::Deref);
    assert_credential_not_impl!(CapturedCurrentOwnerCredentialV1, Send);
    assert_credential_not_impl!(CapturedCurrentOwnerCredentialV1, Sync);
}

#[test]
fn owner_decision_credential_capture_ends_sql_without_writes_before_compute() {
    let (_database, mut store) = owner_store("owner-capture-read-only");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture owner session must issue");
    let before_activity = session_activity(&store, &session.session.session_id);
    let before_changes = store.connection.total_changes();
    let captured = capture_current_owner_credential_v1(&store, OWNER)
        .expect("owner rows must capture without password work");
    assert!(store.connection.is_autocommit());
    assert_eq!(store.connection.total_changes(), before_changes);
    assert_eq!(
        session_activity(&store, &session.session.session_id),
        before_activity
    );
    // A fresh caller transaction can begin and end while capture remains owned.
    let transaction = Transaction::new_unchecked(&store.connection, TransactionBehavior::Immediate)
        .expect("capture must leave no SQL transaction alive");
    transaction
        .rollback()
        .expect("fixture caller transaction ends");
    let snapshot = compute_current_owner_credential_v1(captured, PASSWORD)
        .expect("owned computation must verify")
        .expect("owner password must produce existing snapshot");
    assert_eq!(recheck(&store, &snapshot), Ok(()));
    assert_eq!(store.connection.total_changes(), before_changes);
    assert_eq!(
        session_activity(&store, &session.session.session_id),
        before_activity
    );
}

#[test]
fn owner_decision_credential_capture_binds_original_scope_and_connection() {
    let (database, store) = owner_store("owner-capture-original-scope");
    let captured = capture_current_owner_credential_v1(&store, OWNER)
        .expect("original owner credential must capture");
    let moved = Box::new(store);
    let snapshot = compute_current_owner_credential_v1(captured, PASSWORD)
        .expect("computation must need no SQL owner")
        .expect("captured owner must verify");
    let second = SqliteStore::open(&database.path).expect("same rows must open separately");
    let transaction = second
        .connection
        .unchecked_transaction()
        .expect("other caller transaction must begin");
    assert_eq!(
        recheck_current_owner_credential_v1(&moved, &transaction, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(
        recheck_current_owner_credential_v1(&second, &transaction, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    transaction
        .rollback()
        .expect("other caller ends transaction");
    assert_eq!(recheck(&moved, &snapshot), Ok(()));
    drop(second);
    drop(moved);
    let reopened = SqliteStore::open(&database.path).expect("original bytes must reopen");
    assert_eq!(
        recheck(&reopened, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    let detached =
        capture_current_owner_credential_v1(&reopened, OWNER).expect("reopened rows must capture");
    drop(reopened);
    assert!(
        compute_current_owner_credential_v1(detached, PASSWORD)
            .expect("owned row and scope survive store drop")
            .is_some()
    );
}

#[test]
fn owner_decision_credential_capture_rotation_is_denied_after_compute() {
    let (_database, mut store) = owner_store("owner-capture-rotation");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture owner session must issue");
    let captured =
        capture_current_owner_credential_v1(&store, OWNER).expect("old credential must capture");
    store
        .rotate_local_password_credential_v1(
            &session.raw_session_token,
            &session.raw_csrf_token,
            &LocalPasswordRotationInputV1 {
                current_password: PASSWORD,
                new_password: REPLACEMENT,
                rotated_at: "2026-07-23T17:02:00Z",
            },
        )
        .expect("rotation between capture and compute must commit");
    let snapshot = compute_current_owner_credential_v1(captured, PASSWORD)
        .expect("captured generation still verifies its own password")
        .expect("captured owner must produce old-generation snapshot");
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&store, &prepare(&store, REPLACEMENT)), Ok(()));
}

#[test]
fn owner_decision_credential_capture_recovery_is_denied_after_compute() {
    let (database, mut store) = owner_store("owner-capture-recovery");
    let captured =
        capture_current_owner_credential_v1(&store, OWNER).expect("old credential must capture");
    let authority = acquire_offline_owner_recovery_authority_v1(&database.path)
        .expect("disposable offline fixture authority must acquire");
    store
        .recover_local_owner_offline_v1(
            &authority,
            &LocalOwnerRecoveryInputV1 {
                expected_owner_identity_ref: OWNER,
                new_password: REPLACEMENT,
                recovered_at: "2026-07-23T17:02:00Z",
            },
        )
        .expect("fixture recovery between capture and compute must commit");
    let snapshot = compute_current_owner_credential_v1(captured, PASSWORD)
        .expect("captured verifier still verifies")
        .expect("captured owner must produce old snapshot");
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&store, &prepare(&store, REPLACEMENT)), Ok(()));
}

#[test]
fn owner_decision_credential_capture_verifier_substitution_is_denied_after_compute() {
    let (_database, store) = owner_store("owner-capture-substitution");
    let captured =
        capture_current_owner_credential_v1(&store, OWNER).expect("original PHC must capture");
    let verifier = Zeroizing::new(
        create_local_password_verifier_v1(REPLACEMENT)
            .expect("fixture replacement verifier must derive"),
    );
    let credential_id = local_password_credential_id_v1(
        OWNER,
        1,
        &verifier,
        owner_bootstrap_input(PASSWORD).created_at,
    );
    mutate_rows(&store, "lnsat_local_password_credentials", |connection| {
        connection
            .execute(
                "UPDATE lnsat_local_password_credentials SET credential_id = ?1,
                 password_verifier = ?2 WHERE identity_ref = ?3 AND credential_version = 1",
                params![credential_id, verifier.as_str(), OWNER],
            )
            .expect("fixture must substitute valid verifier and bound ID");
    });
    let snapshot = compute_current_owner_credential_v1(captured, PASSWORD)
        .expect("captured original PHC must still verify")
        .expect("captured original owner must produce snapshot");
    assert_eq!(
        recheck(&store, &snapshot),
        Err(LocalIdentityStoreErrorV1::AuthorizationRejected)
    );
    assert_eq!(recheck(&store, &prepare(&store, REPLACEMENT)), Ok(()));
}

#[test]
fn owner_decision_credential_capture_fallback_is_owned_and_preserves_error_order() {
    let (_database, mut store) = owner_store("owner-capture-fallback");
    let session = store
        .issue_local_owner_session_v1(&owner_session_input(PASSWORD))
        .expect("fixture owner session must issue");
    let inactive = "identity:human:inactive-operator";
    store
        .create_local_identity_v1(
            &local_identity_create_input(
                inactive,
                "Inactive Fixture Operator",
                LocalIdentityRoleV1::Operator,
                PASSWORD,
                "2026-07-23T17:02:00Z",
            ),
            &session.raw_session_token,
            &session.raw_csrf_token,
            "2026-07-23T17:02:00Z",
        )
        .expect("fixture non-owner must create");
    store
        .disable_local_identity_v1(
            inactive,
            &session.raw_session_token,
            &session.raw_csrf_token,
            "2026-07-23T17:03:00Z",
        )
        .expect("valid fixture disablement must persist")
        .expect("active non-owner must disable");
    let valid_fallback = store.authentication_dummy_verifier.clone();
    let before_changes = store.connection.total_changes();
    let before_activity = session_activity(&store, &session.session.session_id);
    for identity in ["malformed", "identity:human:absent", inactive] {
        for password in [PASSWORD, "short"] {
            store.authentication_dummy_verifier = "malformed captured fallback".to_owned();
            let captured = capture_current_owner_credential_v1(&store, identity)
                .expect("unknown capture does not eagerly validate fallback");
            assert!(store.connection.is_autocommit());
            store
                .authentication_dummy_verifier
                .clone_from(&valid_fallback);
            let result = compute_current_owner_credential_v1(captured, password);
            if password == PASSWORD {
                assert_eq!(result.err(), Some(LocalIdentityStoreErrorV1::EvidenceDrift));
            } else {
                assert!(
                    result
                        .expect("invalid password rejects before verifier parsing")
                        .is_none()
                );
            }
            assert_eq!(store.connection.total_changes(), before_changes);
            assert_eq!(
                session_activity(&store, &session.session.session_id),
                before_activity
            );
        }
    }
}

fn remove_fixture_credential_rows(store: &SqliteStore) {
    let trigger = "lnsat_local_password_credentials_reject_delete";
    let ddl: String = store
        .connection
        .query_row(
            "SELECT sql FROM sqlite_schema WHERE type = 'trigger' AND name = ?1",
            [trigger],
            |row| row.get(0),
        )
        .expect("fixture delete guard DDL must read");
    store
        .connection
        .execute_batch(&format!("DROP TRIGGER {trigger}"))
        .expect("fixture guard must temporarily remove");
    store
        .connection
        .execute("DELETE FROM lnsat_local_password_credentials", [])
        .expect("fixture credentials must remove");
    store
        .connection
        .execute_batch(&ddl)
        .expect("exact fixture guard DDL must restore");
    store
        .verify_schema()
        .expect("fixture schema must remain exact");
}

#[test]
fn owner_decision_credential_capture_corrupt_rows_never_become_unknown() {
    for empty in [true, false] {
        let (_database, store) = owner_store("owner-capture-corrupt-rows");
        if empty {
            remove_fixture_credential_rows(&store);
        } else {
            mutate_rows(&store, "lnsat_local_password_credentials", |connection| {
                connection
                    .pragma_update(None, "ignore_check_constraints", true)
                    .expect("fixture constraints must temporarily bypass");
                connection
                    .execute(
                        "UPDATE lnsat_local_password_credentials SET verifier_profile = ?1",
                        ["invalid fixture profile"],
                    )
                    .expect("fixture credential evidence must corrupt");
                connection
                    .pragma_update(None, "ignore_check_constraints", false)
                    .expect("fixture constraints must restore");
            });
        }
        assert_eq!(
            capture_current_owner_credential_v1(&store, OWNER).err(),
            Some(LocalIdentityStoreErrorV1::EvidenceDrift)
        );
        assert!(store.connection.is_autocommit());
    }
}
