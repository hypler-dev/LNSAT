use super::*;
use crate::headless_bootstrap::{
    require_authority_empty_v1, require_empty_tables_at_version_v1, require_empty_tables_v1,
    schema_digest_v1,
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
    // Independently generated from the 18 authored migrations with Python
    // sqlite3 and compact JSON; binds all 234 objects, including autoindexes.
    assert_eq!(
        schema_digest_v1(&store.connection).unwrap(),
        "ab97d48b025622cf5f9d04d1ee1986794b2b14c164ea148d2de17df9ae83a55b"
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
    assert_eq!(store.state().unwrap().schema_version, SQLITE_SCHEMA_VERSION);
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
fn headless_bootstrap_schema_eighteen_every_authority_table_footprint_is_rejected() {
    // Schema-18 action-request evidence must have the same empty-store gate as
    // all prior authority/evidence families.
    let metadata = [
        "lnsat_schema_migrations",
        "lnsat_store_metadata",
        "lnsat_retention_policies",
    ];
    let tables: Vec<_> = REQUIRED_TABLES_V18
        .iter()
        .copied()
        .filter(|name| !metadata.contains(name))
        .collect();
    assert_eq!(tables.len(), 31);
    for occupied in &tables {
        let connection = Connection::open_in_memory().unwrap();
        for table in &tables {
            connection
                .execute_batch(&format!("CREATE TABLE \"{table}\" (value TEXT)"))
                .unwrap();
        }
        assert_eq!(require_empty_tables_at_version_v1(&connection, 18), Ok(()));
        connection
            .execute(
                &format!("INSERT INTO \"{occupied}\" VALUES ('prior evidence')"),
                [],
            )
            .unwrap();
        assert_eq!(
            require_empty_tables_at_version_v1(&connection, 18),
            Err(HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty),
            "{occupied}"
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
        ("future-schema", "PRAGMA user_version = 19"),
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

const SCHEMA_19_FIXTURE: &str = include_str!("fixtures/headless_schema_19.sql");

fn assert_schema_19_fixture_manifest(connection: &Connection) {
    // Include implicit indexes and exact SQLite DDL, including NULL SQL.
    // Independent derivation used Python sqlite3 over migrations 1 through 18.
    let mut statement = connection
        .prepare(
            "SELECT type, name, tbl_name, sql
             FROM main.sqlite_schema ORDER BY type, name",
        )
        .unwrap();
    let manifest = statement
        .query_map([], |row| {
            Ok([
                row.get::<_, Option<String>>(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ])
        })
        .unwrap()
        .collect::<rusqlite::Result<Vec<_>>>()
        .unwrap();
    drop(statement);
    let mut hash = Sha256::new();
    hash.update(b"lnsat.headless_bootstrap.schema.v19\n");
    hash.update(serde_json::to_vec(&manifest).unwrap());
    assert_eq!(
        encode_sha256(hash.finalize()),
        "sha256:f8c18ea04ef79d33d5dd9bb86c230f0dd5672a18f20215b09e319faf8f6e0e02"
    );
}

#[test]
fn headless_schema_19_fixture_extends_pristine_eighteen_and_rolls_back() {
    let database = TestDatabase::new("headless-schema-19-pristine");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let before = sqlite_schema_manifest(&store.connection);
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    require_authority_empty_v1(&tx).unwrap();
    tx.execute_batch(SCHEMA_19_FIXTURE).unwrap();

    let counts: (i64, i64) = tx
        .query_row(
            "SELECT count(*), sum(type = 'table') FROM main.sqlite_schema",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(counts, (258, 38));

    assert_schema_19_fixture_manifest(&tx);
    let retained: i64 = tx
        .query_row(
            "SELECT count(*) FROM lnsat_retention_policies
             WHERE retention_class = 'control_plane' AND disposition = 'preserve'
               AND cleanup_eligible = 0 AND minimum_retention_seconds IS NULL",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(retained, 35);
    for family in RETENTION_RECORD_FAMILIES_V18 {
        assert!(
            tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM lnsat_retention_policies WHERE record_family = ?1)",
                [family],
                |row| row.get::<_, bool>(0),
            )
            .unwrap()
        );
    }
    assert_eq!(
        tx.query_row(
            "SELECT schema_version FROM lnsat_store_metadata",
            [],
            |row| { row.get::<_, i64>(0) }
        )
        .unwrap(),
        19
    );
    let synthetic_digest = format!("sha256:{}", "0".repeat(64));
    let premature_pointer = tx
        .execute(
            "INSERT INTO headless_active VALUES (
                1, '00000000-0000-0000-0000-000000000000',
                'generation:fixture', ?1, 1, 0, 0, 'config-audit:fixture', ?1
            )",
            [&synthetic_digest],
        )
        .unwrap_err();
    assert_eq!(
        premature_pointer.sqlite_error_code(),
        Some(rusqlite::ErrorCode::ConstraintViolation)
    );
    assert_eq!(
        premature_pointer.to_string(),
        "headless active genesis binding failed"
    );
    let violations: i64 = tx
        .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(violations, 0);
    for table in [
        "headless_installations",
        "headless_generations",
        "headless_config_audit",
        "headless_active",
    ] {
        let count: i64 = tx
            .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
    }
    tx.rollback().unwrap();
    assert_eq!(sqlite_schema_manifest(&store.connection), before);
    require_authority_empty_v1(&store.connection).unwrap();
}

#[test]
fn headless_schema_19_fixture_guard_covers_every_schema_eighteen_family() {
    let seed_tables = [
        "lnsat_schema_migrations",
        "lnsat_store_metadata",
        "lnsat_retention_policies",
    ];
    let tables: Vec<_> = REQUIRED_TABLES_V18
        .into_iter()
        .filter(|table| !seed_tables.contains(table))
        .collect();
    let guard_end = SCHEMA_19_FIXTURE
        .find("CREATE TABLE lnsat_store_metadata_v19")
        .unwrap();
    let guard = &SCHEMA_19_FIXTURE[..guard_end];
    assert_eq!(tables.len(), 31);
    for occupied in &tables {
        let mut connection = Connection::open_in_memory().unwrap();
        for table in &tables {
            connection
                .execute_batch(&format!("CREATE TABLE {table}(present INTEGER)"))
                .unwrap();
        }
        connection
            .execute_batch(&format!("INSERT INTO {occupied} VALUES (1)"))
            .unwrap();
        let tx = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .unwrap();
        let error = tx.execute_batch(guard).expect_err(occupied);
        assert_eq!(
            error.sqlite_error_code(),
            Some(rusqlite::ErrorCode::ConstraintViolation)
        );
        tx.rollback().unwrap();
        let objects = sqlite_schema_manifest(&connection);
        assert_eq!(objects.len(), tables.len());
    }
}

#[test]
fn headless_schema_19_fixture_genesis_rows_rollback_together() {
    use crate::owner_bootstrap::{
        insert_local_owner_bootstrap_v1, prepare_local_owner_bootstrap_v1,
    };

    let database = TestDatabase::new("headless-schema-19-genesis");
    let mut store = SqliteStore::open(&database.path).unwrap();
    let prepared =
        prepare_local_owner_bootstrap_v1(&owner_bootstrap_input("fixture-bootstrap-password"))
            .unwrap();
    let tx = store
        .connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .unwrap();
    require_authority_empty_v1(&tx).unwrap();
    tx.execute_batch(SCHEMA_19_FIXTURE).unwrap();
    insert_local_owner_bootstrap_v1(&tx, &prepared).unwrap();
    let digest = format!("sha256:{}", "a".repeat(64));
    let preparation_id = "b".repeat(64);
    let installation_id = "00000000-0000-0000-0000-000000000001";
    let at = "2026-11-03T12:00:00.000Z";
    tx.execute(
        "INSERT INTO headless_installations
         SELECT 1, ?1, '00000000-0000-0000-0000-000000000002',
           'installation:fixture', i.identity_ref, e.event_id, e.event_evidence_digest,
           c.credential_id, 1, '{}', ?2, ?3, ?2, ?2, ?2, ?2,
           'generation:fixture', 'config-audit:fixture', ?4, ?2
         FROM lnsat_local_identities i
         JOIN lnsat_local_identity_events e ON e.identity_ref = i.identity_ref
         JOIN lnsat_local_password_credentials c ON c.identity_ref = i.identity_ref",
        rusqlite::params![installation_id, digest, preparation_id, at],
    )
    .unwrap();
    tx.execute(
        "INSERT INTO headless_generations VALUES (
            'generation:fixture', ?1, ?2, 1, NULL, '{}', ?2, '{}', ?2,
            '{}', ?2, '{}', ?2, ?2, 'fixture', ?2, 'fixture', ?3, ?2
        )",
        rusqlite::params![installation_id, digest, at],
    )
    .unwrap();
    tx.execute(
        "INSERT INTO headless_config_audit VALUES (
            'config-audit:fixture', ?1, 1, NULL, 'headless_bootstrap.v1',
            '{}', ?2, ?3, ?2
        )",
        rusqlite::params![installation_id, digest, at],
    )
    .unwrap();
    tx.execute(
        "INSERT INTO headless_active VALUES (
            1, ?1, 'generation:fixture', ?2, 1, 0, 0, 'config-audit:fixture', ?2
        )",
        rusqlite::params![installation_id, digest],
    )
    .unwrap();
    assert_eq!(
        tx.query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get::<_, i64>(0)
        })
        .unwrap(),
        0
    );
    for table in [
        "lnsat_local_identities",
        "lnsat_local_identity_events",
        "lnsat_local_password_credentials",
        "headless_installations",
        "headless_generations",
        "headless_config_audit",
        "headless_active",
    ] {
        assert_eq!(
            tx.query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
                row.get::<_, i64>(0)
            })
            .unwrap(),
            1
        );
    }
    tx.rollback().unwrap();
    require_authority_empty_v1(&store.connection).unwrap();
}
