use crate::headless_bootstrap::require_authority_empty_v1;
use crate::selected_schema::*;
use crate::{SqliteStore, TransactionBehavior};

#[test]
fn selected_schema_migrates_exact_empty_eighteen_and_rollback_preserves_old() {
    let database = crate::tests::TestDatabase::new("selected-schema-rollback");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    migrate(&tx).unwrap();
    verify(&tx).unwrap();
    require_empty(&tx).unwrap();
    tx.rollback().unwrap();
    require_authority_empty_v1(&store.connection).unwrap();
}

#[test]
fn selected_schema_committed_nineteen_is_inert_and_ordinary_open_denies() {
    let database = crate::tests::TestDatabase::new("selected-schema-inert");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    migrate(&tx).unwrap();
    tx.commit().unwrap();
    verify(&store.connection).unwrap();
    require_empty(&store.connection).unwrap();
    assert!(SqliteStore::open(&database.path).is_err());
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    assert!(migrate(&tx).is_err());
    tx.rollback().unwrap();
}

#[test]
fn selected_schema_rejects_occupied_source_before_ddl() {
    let database = crate::tests::TestDatabase::new("selected-schema-occupied");
    let mut store = SqliteStore::open(&database.path).unwrap();
    store
        .bootstrap_local_owner_v1(&crate::tests::owner_bootstrap_input(
            "selected-schema-test-password",
        ))
        .unwrap();
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    assert!(migrate(&tx).is_err());
    tx.rollback().unwrap();
    assert_eq!(
        crate::pragma_i64(&store.connection, "user_version").unwrap(),
        18
    );
}

#[test]
fn selected_schema_verifier_rejects_temp_attachment_seed_and_ddl_drift() {
    let database = crate::tests::TestDatabase::new("selected-schema-drift");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    migrate(&tx).unwrap();
    tx.commit().unwrap();
    for sql in [
        "CREATE TEMP TABLE shadow(x)",
        "ATTACH ':memory:' AS foreign_store",
        "DELETE FROM lnsat_retention_policies",
        "CREATE TABLE unexpected(x)",
    ] {
        store.connection.execute_batch("SAVEPOINT drift").unwrap();
        if store.connection.execute_batch(sql).is_ok() {
            assert!(verify(&store.connection).is_err());
        }
        store
            .connection
            .execute_batch("ROLLBACK TO drift; RELEASE drift")
            .unwrap();
        if sql.starts_with("ATTACH") {
            store
                .connection
                .execute_batch("DETACH foreign_store")
                .unwrap();
        }
        verify(&store.connection).unwrap();
    }
}

#[test]
fn selected_schema_genesis_rejects_cross_record_owner_event_digest() {
    let database = crate::tests::TestDatabase::new("selected-schema-owner-join");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let at = "2026-11-05T12:00:00.000Z";
    let input = crate::LocalOwnerBootstrapInputV1 {
        identity_ref: "identity:human:owner",
        display_name: "Owner",
        password: "selected-schema-owner-test-password",
        created_at: at,
    };
    let prepared = crate::owner_bootstrap::prepare_local_owner_bootstrap_v1(&input).unwrap();
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    migrate(&tx).unwrap();
    crate::owner_bootstrap::insert_local_owner_bootstrap_v1(&tx, &prepared).unwrap();
    let (event_id, event_digest, credential): (String, String, String) = tx.query_row(
        "SELECT e.event_id,e.event_evidence_digest,c.credential_id
         FROM lnsat_local_identity_events e JOIN lnsat_local_password_credentials c USING(identity_ref)",
        [], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap();
    // Build a distinct, structurally valid event row. Each old independent FK
    // resolves, but its digest cannot be substituted for the first event's.
    let other_digest = format!("sha256:{}", "e".repeat(64));
    let other_event_id = format!("sha256:{}", "d".repeat(64));
    tx.execute(
        "INSERT INTO lnsat_local_identity_events
        SELECT ?1,identity_ref,2,event_kind,actor_session_id,credential_version,
               source_evidence_digest,'2026-11-05T12:00:01.000Z',?2
        FROM lnsat_local_identity_events WHERE event_sequence=1",
        rusqlite::params![other_event_id, other_digest],
    )
    .unwrap();
    let hash = format!("sha256:{}", "a".repeat(64));
    let preparation = "b".repeat(64);
    let insert = "INSERT INTO headless_installations VALUES (
        1, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
        'installation:test', 'identity:human:owner', ?1, ?2, ?3, 1, '{}', ?4, ?5,
        ?4, ?4, ?4, ?4, 'generation:test', 'config-audit:test', ?6, ?4)";
    let rejected = tx
        .execute(
            insert,
            rusqlite::params![event_id, other_digest, credential, hash, preparation, at],
        )
        .unwrap_err();
    assert_eq!(
        rejected.to_string(),
        "headless installation owner binding failed"
    );
    assert_eq!(
        tx.query_row("SELECT count(*) FROM headless_installations", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
    tx.execute(
        insert,
        rusqlite::params![event_id, event_digest, credential, hash, preparation, at],
    )
    .unwrap();
    // Deferred generation/audit links remain intentionally incomplete; no
    // production initializer or prepared-resource proof is supplied by this test.
    tx.rollback().unwrap();
    require_authority_empty_v1(&store.connection).unwrap();
}
