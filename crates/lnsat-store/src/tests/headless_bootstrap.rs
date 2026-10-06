use super::*;
use crate::headless_bootstrap::{
    require_authority_empty_v1, require_empty_tables_v1, schema_digest_v1,
};

fn inspection(
    store: &mut SqliteStore,
) -> Result<HeadlessBootstrapStoreInspectionV1, HeadlessBootstrapStoreErrorV1> {
    store.inspect_headless_bootstrap_store_v1()
}

#[test]
fn headless_bootstrap_pristine_snapshot_is_non_authorizing_and_read_only() {
    let database = TestDatabase::new("headless-bootstrap-pristine");
    let mut store = SqliteStore::open(&database.path).expect("fresh store must open");
    // Independently generated from the 17 authored migrations with Python
    // sqlite3 and compact JSON; binds all 218 objects, including autoindexes.
    assert_eq!(
        schema_digest_v1(&store.connection).unwrap(),
        "66911985ea6357018f9a55890e28e68394a59abdbc90d9cb4aa04f3a7c75b62a"
    );
    let schema = sqlite_schema_manifest(&store.connection);
    let changes: i64 = store
        .connection
        .query_row("SELECT total_changes()", [], |r| r.get(0))
        .unwrap();
    for _ in 0..2 {
        let result = inspection(&mut store).expect("pristine snapshot must classify");
        assert!(result.authority_empty());
        assert!(!result.initialization_available());
        assert!(!result.grants_action_authority());
        assert!(store.connection.is_autocommit());
        assert!(!format!("{result:?}").contains(database.path.to_str().unwrap()));
    }
    assert_eq!(sqlite_schema_manifest(&store.connection), schema);
    assert_eq!(
        store
            .connection
            .query_row("SELECT total_changes()", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        changes
    );
    assert_eq!(store.state().unwrap().schema_version, 17);
}

#[test]
fn headless_bootstrap_prior_owner_and_stale_inspection_cannot_initialize() {
    let database = TestDatabase::new("headless-bootstrap-owner");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let old_snapshot = inspection(&mut store).unwrap();
    store
        .bootstrap_local_owner_v1(&owner_bootstrap_input("headless-owner-test-password"))
        .unwrap();
    assert_eq!(
        inspection(&mut store),
        Err(HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty)
    );
    assert!(!old_snapshot.initialization_available());
    assert!(!old_snapshot.grants_action_authority());
    assert!(store.connection.is_autocommit());
}

#[test]
fn headless_bootstrap_every_authority_table_footprint_is_rejected() {
    // Isolate the occupancy kernel: synthetic tables do not pass the separate
    // production schema gate. Every persisted family must independently deny.
    let metadata = [
        "lnsat_schema_migrations",
        "lnsat_store_metadata",
        "lnsat_retention_policies",
    ];
    let tables: Vec<_> = REQUIRED_TABLES_V17
        .iter()
        .copied()
        .filter(|name| !metadata.contains(name))
        .collect();
    assert_eq!(tables.len(), 28);
    for occupied in &tables {
        let connection = Connection::open_in_memory().unwrap();
        for table in &tables {
            connection
                .execute_batch(&format!("CREATE TABLE \"{table}\" (value TEXT)"))
                .unwrap();
        }
        assert_eq!(require_empty_tables_v1(&connection), Ok(()));
        connection
            .execute(
                &format!("INSERT INTO \"{occupied}\" VALUES ('prior evidence')"),
                [],
            )
            .unwrap();
        assert_eq!(
            require_empty_tables_v1(&connection),
            Err(HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty),
            "{occupied}"
        );
        assert_eq!(
            require_authority_empty_v1(&connection),
            Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore)
        );
    }
}

#[test]
fn headless_bootstrap_unknown_objects_and_sqlite_prefix_lookalikes_deny() {
    for (label, sql) in [
        ("unknown-table", "CREATE TABLE unrelated (value TEXT)"),
        ("hidden-table", "CREATE TABLE sqliteXauthority (value TEXT)"),
        ("unknown-view", "CREATE VIEW unexpected AS SELECT 1"),
        (
            "unknown-index",
            "CREATE INDEX unexpected ON lnsat_local_identities(display_name)",
        ),
        (
            "hidden-trigger",
            "CREATE TRIGGER sqliteXobserver AFTER INSERT ON lnsat_local_identities BEGIN SELECT 1; END",
        ),
    ] {
        let database = TestDatabase::new(label);
        let mut store = SqliteStore::open(&database.path).unwrap();
        store.connection.execute_batch(sql).unwrap();
        let changes: i64 = store
            .connection
            .query_row("SELECT total_changes()", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            inspection(&mut store),
            Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore),
            "{label}"
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT total_changes()", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            changes
        );
    }
}

#[test]
fn headless_bootstrap_temp_shadows_and_attached_namespaces_deny() {
    for (label, sql) in [
        (
            "temporary",
            "CREATE TEMP TABLE lnsat_local_identities (value TEXT)",
        ),
        ("attached", "ATTACH DATABASE ':memory:' AS extra"),
    ] {
        let database = TestDatabase::new(label);
        let mut store = SqliteStore::open(&database.path).unwrap();
        store.connection.execute_batch(sql).unwrap();
        assert_eq!(
            inspection(&mut store),
            Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore)
        );
        assert!(store.connection.is_autocommit());
    }
}

#[test]
fn headless_bootstrap_schema_and_seed_drift_deny_without_repairs() {
    for (label, sql) in [
        ("future-schema", "PRAGMA user_version = 18"),
        ("old-schema", "PRAGMA user_version = 16"),
        ("metadata", "DELETE FROM lnsat_store_metadata"),
        (
            "migration",
            "DELETE FROM lnsat_schema_migrations WHERE schema_version = 17",
        ),
    ] {
        let database = TestDatabase::new(label);
        let mut store = SqliteStore::open(&database.path).unwrap();
        store.connection.execute_batch(sql).unwrap();
        let changes: i64 = store
            .connection
            .query_row("SELECT total_changes()", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            inspection(&mut store),
            Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore)
        );
        assert_eq!(
            store
                .connection
                .query_row("SELECT total_changes()", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            changes
        );
    }
}

#[test]
fn headless_bootstrap_write_transaction_must_recheck_its_own_rows() {
    let database = TestDatabase::new("headless-bootstrap-transaction");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let transaction = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    assert_eq!(require_authority_empty_v1(&transaction), Ok(()));
    transaction.execute("INSERT INTO lnsat_local_identities (identity_ref,display_name,role,owner_singleton,status,created_at) VALUES ('identity:human:owner','Owner','owner',1,'active','2026-07-23T17:00:00Z')", []).unwrap();
    assert_eq!(
        require_authority_empty_v1(&transaction),
        Err(HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty)
    );
    transaction.rollback().unwrap();
    assert!(inspection(&mut store).is_ok());
    store.connection.execute_batch("BEGIN IMMEDIATE").unwrap();
    assert_eq!(
        inspection(&mut store),
        Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore)
    );
    assert!(!store.connection.is_autocommit());
    store.connection.execute_batch("ROLLBACK").unwrap();
}

#[test]
fn headless_bootstrap_schema_collection_bounds_fail_closed() {
    let database = TestDatabase::new("headless-bootstrap-bounds");
    let mut store = SqliteStore::open(&database.path).unwrap();
    for index in 0..40 {
        store
            .connection
            .execute_batch(&format!("CREATE VIEW extra_{index} AS SELECT 1"))
            .unwrap();
    }
    assert_eq!(
        inspection(&mut store),
        Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore)
    );
    let database = TestDatabase::new("headless-bootstrap-large-schema");
    let mut store = SqliteStore::open(&database.path).unwrap();
    store
        .connection
        .execute_batch(&format!(
            "CREATE VIEW huge AS SELECT '{}'",
            "x".repeat(65_537)
        ))
        .unwrap();
    assert_eq!(
        inspection(&mut store),
        Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore)
    );
}

#[test]
fn headless_bootstrap_denials_never_reflect_store_or_row_content() {
    for error in [
        HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty,
        HeadlessBootstrapStoreErrorV1::UnverifiableStore,
    ] {
        assert_eq!(error.to_string(), error.code());
        let output = format!("{error:?} {error}");
        for forbidden in [
            "password",
            "verifier",
            "/private/",
            "identity:",
            "lnsat_local",
        ] {
            assert!(!output.contains(forbidden));
        }
    }
}
