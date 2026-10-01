use super::*;
use crate::owner_bootstrap::{insert_local_owner_bootstrap_v1, prepare_local_owner_bootstrap_v1};

fn owner_row_counts(connection: &Connection) -> [i64; 3] {
    [
        "lnsat_local_identities",
        "lnsat_local_password_credentials",
        "lnsat_local_identity_events",
    ]
    .map(|table| {
        connection
            .query_row(
                &format!("SELECT count(*) FROM main.\"{table}\""),
                [],
                |row| row.get(0),
            )
            .expect("fixed owner table count must read")
    })
}

#[test]
fn owner_bootstrap_transaction_owns_validated_metadata_and_waits_for_caller_commit() {
    let database = TestDatabase::new("owner-bootstrap-transaction-commit");
    let mut store = SqliteStore::open(&database.path).expect("fresh store must open");
    let mut identity_ref = "identity:human:owner".to_owned();
    let mut display_name = "Local Owner".to_owned();
    let mut created_at = "2026-07-23T17:00:00.000Z".to_owned();
    let password = zeroize::Zeroizing::new("correct horse battery staple".to_owned());
    let prepared = prepare_local_owner_bootstrap_v1(&LocalOwnerBootstrapInputV1 {
        identity_ref: &identity_ref,
        display_name: &display_name,
        password: password.as_str(),
        created_at: &created_at,
    })
    .expect("validated owner must prepare without a database transaction");
    drop(password);
    identity_ref.clear();
    display_name.clear();
    created_at.clear();

    let observer = Connection::open(&database.path).expect("independent reader must open");
    let transaction = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .expect("caller transaction must begin");
    let record = insert_local_owner_bootstrap_v1(&transaction, &prepared)
        .expect("transaction-local owner must insert");
    assert_eq!(record.identity.identity_ref, "identity:human:owner");
    assert_eq!(record.identity.display_name, "Local Owner");
    assert_eq!(record.identity.created_at, "2026-07-23T17:00:00.000Z");
    assert_eq!(owner_row_counts(&transaction), [1, 1, 1]);
    assert_eq!(owner_row_counts(&observer), [0, 0, 0]);
    transaction
        .commit()
        .expect("only caller commits owner evidence");
    assert_eq!(owner_row_counts(&observer), [1, 1, 1]);
    assert_eq!(
        store
            .verify_local_owner_password_v1("identity:human:owner", "correct horse battery staple"),
        Ok(LocalCredentialVerificationV1::Verified)
    );
    assert_eq!(
        store.bootstrap_local_owner_v1(&owner_bootstrap_input("correct horse battery staple")),
        Err(LocalIdentityStoreErrorV1::OwnerAlreadyBootstrapped)
    );
}

#[test]
fn owner_bootstrap_transaction_caller_rollback_erases_successful_owner_creation() {
    let database = TestDatabase::new("owner-bootstrap-transaction-rollback");
    let mut store = SqliteStore::open(&database.path).expect("fresh store must open");
    let prepared =
        prepare_local_owner_bootstrap_v1(&owner_bootstrap_input("correct horse battery staple"))
            .expect("owner must prepare");
    let transaction = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .expect("caller transaction must begin");
    insert_local_owner_bootstrap_v1(&transaction, &prepared).expect("owner must insert");
    assert_eq!(owner_row_counts(&transaction), [1, 1, 1]);
    transaction
        .rollback()
        .expect("caller must roll back the whole operation");
    assert_eq!(owner_row_counts(&store.connection), [0, 0, 0]);
    assert!(
        store
            .inspect_headless_bootstrap_store_v1()
            .expect("rolled-back store remains fresh")
            .authority_empty()
    );
}

#[test]
fn owner_bootstrap_transaction_late_insert_failure_rolls_back_all_earlier_rows() {
    for (table, partial) in [
        ("lnsat_local_password_credentials", [1, 0, 0]),
        ("lnsat_local_identity_events", [1, 1, 0]),
    ] {
        let database = TestDatabase::new("owner-bootstrap-transaction-fault");
        let mut store = SqliteStore::open(&database.path).expect("fresh store must open");
        // Temporary fault injection reaches the later insert after earlier rows
        // exist. This is a private-helper test, not a production freshness proof.
        store
            .connection
            .execute_batch(&format!(
                "CREATE TEMP TRIGGER reject_owner_insert BEFORE INSERT ON main.\"{table}\"
             BEGIN SELECT RAISE(ABORT, 'owner fixture insert denied'); END;"
            ))
            .expect("fixed fixture fault must install");
        let prepared = prepare_local_owner_bootstrap_v1(&owner_bootstrap_input(
            "correct horse battery staple",
        ))
        .expect("owner must prepare");
        {
            let transaction = store
                .connection
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .expect("caller transaction must begin");
            assert_eq!(
                insert_local_owner_bootstrap_v1(&transaction, &prepared),
                Err(LocalIdentityStoreErrorV1::PersistenceFailed)
            );
            assert_eq!(owner_row_counts(&transaction), partial);
            // The helper did not commit or end the caller's transaction.
            assert!(!transaction.is_autocommit());
        }
        assert_eq!(owner_row_counts(&store.connection), [0, 0, 0]);
        store
            .connection
            .execute_batch("DROP TRIGGER temp.reject_owner_insert")
            .expect("fixture fault must remove");
        store
            .inspect_headless_bootstrap_store_v1()
            .expect("failed compound operation leaves fresh store");
    }
}
