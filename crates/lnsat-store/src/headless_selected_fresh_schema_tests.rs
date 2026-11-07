use crate::headless_bootstrap::{require_authority_empty_v1, schema_digest_v1};
use rusqlite::{Connection, params, types::Value};

const SCHEMA_V18_DIGEST: &str = "ab97d48b025622cf5f9d04d1ee1986794b2b14c164ea148d2de17df9ae83a55b";

fn fresh(version: usize) -> Connection {
    let mut connection = Connection::open_in_memory().expect("in-memory SQLite must open");
    let transaction = connection
        .transaction()
        .expect("in-memory fixture transaction must open");
    for migration in crate::MIGRATIONS.iter().take(version) {
        transaction
            .execute_batch(migration.sql)
            .expect("authored migration SQL must apply to in-memory fixture");
        transaction
            .execute(
                "INSERT INTO lnsat_schema_migrations (
                    schema_version, migration_id, migration_sha256, applied_order
                 ) VALUES (?1, ?2, ?3, ?4)",
                params![
                    migration.version,
                    migration.id,
                    crate::migration_digest(migration.sql),
                    migration.version,
                ],
            )
            .expect("authored migration row must insert into in-memory fixture");
        transaction
            .pragma_update(None, "user_version", migration.version)
            .expect("in-memory schema version must update");
    }
    transaction
        .commit()
        .expect("in-memory fixture transaction must commit");
    connection
}

fn changes(connection: &Connection) -> i64 {
    connection
        .query_row("SELECT total_changes()", [], |row| row.get(0))
        .expect("total changes must read")
}

fn assert_denied_read_only(
    connection: &Connection,
    verify: impl FnOnce(&Connection) -> Result<(), crate::HeadlessBootstrapStoreErrorV1>,
) {
    let before = changes(connection);
    assert_eq!(
        verify(connection),
        Err(crate::HeadlessBootstrapStoreErrorV1::UnverifiableStore)
    );
    assert_eq!(changes(connection), before);
}

fn assert_not_authority_empty_read_only(
    connection: &Connection,
    verify: impl FnOnce(&Connection) -> Result<(), crate::HeadlessBootstrapStoreErrorV1>,
) {
    let before = changes(connection);
    assert_eq!(
        verify(connection),
        Err(crate::HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty)
    );
    assert_eq!(changes(connection), before);
}

fn assert_read_only(
    connection: &Connection,
    verify: impl FnOnce(&Connection) -> Result<(), crate::HeadlessBootstrapStoreErrorV1>,
) {
    let before = changes(connection);
    verify(connection).expect("fresh fixture must verify");
    assert_eq!(changes(connection), before);
}

fn quoted(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn seed_triggers(connection: &Connection, table: &str) -> Vec<(String, String)> {
    let mut statement = connection
        .prepare(
            "SELECT name, sql FROM main.sqlite_master
             WHERE type = 'trigger' AND tbl_name = ?1 ORDER BY name",
        )
        .expect("seed trigger query must prepare");
    let rows = statement
        .query_map([table], |row| Ok((row.get(0)?, row.get(1)?)))
        .expect("seed trigger query must execute");
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .expect("seed trigger rows must decode")
}

fn mutate_seed(connection: &Connection, table: &str, mutation: impl FnOnce(&Connection)) {
    let digest = schema_digest_v1(connection).expect("fresh digest must read");
    assert_eq!(digest, SCHEMA_V18_DIGEST);
    let triggers = seed_triggers(connection, table);
    for (name, _) in &triggers {
        connection
            .execute_batch(&format!("DROP TRIGGER main.{}", quoted(name)))
            .expect("test-only immutable trigger must drop");
    }
    connection
        .execute_batch("PRAGMA ignore_check_constraints = ON")
        .expect("test-only seed mutation constraints must suspend");
    mutation(connection);
    for (_, sql) in triggers {
        connection
            .execute_batch(&sql)
            .expect("test-only immutable trigger must restore exactly");
    }
    connection
        .execute_batch("PRAGMA ignore_check_constraints = OFF")
        .expect("test-only seed mutation constraints must restore");
    assert_eq!(
        schema_digest_v1(connection).expect("seed tamper must retain schema digest"),
        SCHEMA_V18_DIGEST
    );
}

fn metadata_fixture() -> Connection {
    let connection = Connection::open_in_memory().expect("in-memory SQLite must open");
    connection
        .execute_batch(
            "CREATE TABLE lnsat_store_metadata (
                singleton,
                contract_version,
                schema_version,
                storage_kind
            )",
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO lnsat_store_metadata VALUES (?1, ?2, ?3, ?4)",
            params![1_i64, crate::CONTRACT_VERSION, 18_i64, crate::STORAGE_KIND],
        )
        .unwrap();
    connection
}

fn migrations_fixture() -> Connection {
    let connection = Connection::open_in_memory().expect("in-memory SQLite must open");
    connection
        .execute_batch(
            "CREATE TABLE lnsat_schema_migrations (
                schema_version,
                migration_id,
                migration_sha256,
                applied_order
            )",
        )
        .unwrap();
    for migration in crate::MIGRATIONS {
        connection
            .execute(
                "INSERT INTO lnsat_schema_migrations VALUES (?1, ?2, ?3, ?4)",
                params![
                    migration.version,
                    migration.id,
                    crate::migration_digest(migration.sql),
                    migration.version,
                ],
            )
            .unwrap();
    }
    connection
}

fn retention_fixture() -> Connection {
    let connection = Connection::open_in_memory().expect("in-memory SQLite must open");
    connection
        .execute_batch(
            "CREATE TABLE lnsat_retention_policies (
                record_family,
                retention_class,
                disposition,
                cleanup_eligible,
                minimum_retention_seconds
            )",
        )
        .unwrap();
    let mut families = crate::RETENTION_RECORD_FAMILIES_V18;
    families.sort_unstable();
    for family in families {
        connection
            .execute(
                "INSERT INTO lnsat_retention_policies VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    family,
                    "control_plane",
                    "preserve",
                    0_i64,
                    Option::<i64>::None
                ],
            )
            .unwrap();
    }
    connection
}

#[test]
fn selected_fresh_real_schema_eighteen_accepts_all_private_oracles_without_writes() {
    let connection = fresh(18);
    assert_eq!(schema_digest_v1(&connection).unwrap(), SCHEMA_V18_DIGEST);
    assert_read_only(&connection, super::verify_metadata);
    assert_read_only(&connection, super::verify_migrations);
    assert_read_only(&connection, super::verify_retention);
    assert_read_only(&connection, super::verify);
}

#[test]
fn selected_fresh_rejects_schema_seventeen_but_legacy_inspection_remains_available() {
    let connection = fresh(17);
    assert_denied_read_only(&connection, super::verify);
    assert_read_only(&connection, require_authority_empty_v1);
}

#[test]
fn selected_fresh_rejects_occupied_identity_and_namespace_or_schema_drift() {
    let connection = fresh(18);
    connection
        .execute_batch(
            "INSERT INTO lnsat_local_identities
             (identity_ref, display_name, role, owner_singleton, status, created_at)
             VALUES ('identity:human:owner', 'Owner', 'owner', 1, 'active', '2026-11-06T00:00:00Z')",
        )
        .unwrap();
    assert_not_authority_empty_read_only(&connection, super::verify);

    for sql in [
        "CREATE TEMP TABLE lnsat_local_identities (value TEXT)",
        "ATTACH DATABASE ':memory:' AS foreign_store",
        "PRAGMA user_version = 17",
        "CREATE TABLE selected_fresh_extra (value TEXT)",
        "DROP TABLE lnsat_retention_policies",
    ] {
        let connection = fresh(18);
        connection.execute_batch(sql).unwrap();
        assert_denied_read_only(&connection, super::verify);
    }
}

#[test]
fn selected_fresh_allows_an_empty_temp_namespace_without_temp_objects() {
    let connection = fresh(18);
    connection
        .execute_batch("CREATE TEMP TABLE selected_fresh_transient (value TEXT); DROP TABLE temp.selected_fresh_transient")
        .unwrap();
    assert_read_only(&connection, super::verify);
}

#[test]
fn selected_fresh_seed_family_missing_altered_and_extra_rows_deny_without_schema_masking() {
    for (table, sql) in [
        ("lnsat_store_metadata", "DELETE FROM lnsat_store_metadata"),
        (
            "lnsat_store_metadata",
            "UPDATE lnsat_store_metadata SET contract_version = 'drift'",
        ),
        (
            "lnsat_store_metadata",
            "INSERT INTO lnsat_store_metadata VALUES (2, 'lnsat.contracts.v1_0', 18, 'sqlite_single_node')",
        ),
        (
            "lnsat_schema_migrations",
            "DELETE FROM lnsat_schema_migrations WHERE schema_version = 1",
        ),
        (
            "lnsat_schema_migrations",
            "UPDATE lnsat_schema_migrations SET migration_sha256 = 'sha256:drift' WHERE schema_version = 1",
        ),
        (
            "lnsat_schema_migrations",
            "INSERT INTO lnsat_schema_migrations VALUES (19, '0019-extra', 'sha256:extra', 19)",
        ),
        (
            "lnsat_retention_policies",
            "DELETE FROM lnsat_retention_policies WHERE record_family = 'action_request'",
        ),
        (
            "lnsat_retention_policies",
            "UPDATE lnsat_retention_policies SET disposition = 'expire' WHERE record_family = 'action_request'",
        ),
        (
            "lnsat_retention_policies",
            "INSERT INTO lnsat_retention_policies VALUES ('zz_extra_family', 'control_plane', 'preserve', 0, NULL)",
        ),
    ] {
        let connection = fresh(18);
        mutate_seed(&connection, table, |connection| {
            connection.execute_batch(sql).unwrap();
        });
        assert_denied_read_only(&connection, super::verify);
    }
}

#[test]
fn selected_fresh_metadata_oracle_requires_exact_raw_types_and_singleton() {
    assert_read_only(&metadata_fixture(), super::verify_metadata);
    for sql in [
        "UPDATE lnsat_store_metadata SET singleton = '1'",
        "UPDATE lnsat_store_metadata SET schema_version = '18'",
        "UPDATE lnsat_store_metadata SET storage_kind = zeroblob(4096)",
        "UPDATE lnsat_store_metadata SET contract_version = printf('%.*c', 4096, 'x')",
        "INSERT INTO lnsat_store_metadata VALUES (2, 'lnsat.contracts.v1_0', 18, 'sqlite_single_node')",
    ] {
        let connection = metadata_fixture();
        connection.execute_batch(sql).unwrap();
        assert_denied_read_only(&connection, super::verify_metadata);
    }
    let connection = metadata_fixture();
    connection
        .execute(
            "UPDATE lnsat_store_metadata SET contract_version = ?1",
            [Value::Blob(vec![b'x'; 4096])],
        )
        .unwrap();
    assert_denied_read_only(&connection, super::verify_metadata);
}

#[test]
fn selected_fresh_migration_oracle_requires_exact_raw_rows_and_eof() {
    assert_read_only(&migrations_fixture(), super::verify_migrations);
    for sql in [
        "UPDATE lnsat_schema_migrations SET schema_version = '1' WHERE schema_version = 1",
        "UPDATE lnsat_schema_migrations SET migration_sha256 = printf('%.*c', 4096, 'x') WHERE schema_version = 1",
        "DELETE FROM lnsat_schema_migrations WHERE schema_version = 18",
        "INSERT INTO lnsat_schema_migrations VALUES (19, '0019-extra', 'sha256:extra', 19)",
    ] {
        let connection = migrations_fixture();
        connection.execute_batch(sql).unwrap();
        assert_denied_read_only(&connection, super::verify_migrations);
    }
    let connection = migrations_fixture();
    connection
        .execute(
            "UPDATE lnsat_schema_migrations SET migration_sha256 = ?1 WHERE schema_version = 1",
            [Value::Blob(vec![b'x'; 4096])],
        )
        .unwrap();
    assert_denied_read_only(&connection, super::verify_migrations);
}

#[test]
fn selected_fresh_retention_oracle_requires_exact_raw_rows_and_eof() {
    assert_read_only(&retention_fixture(), super::verify_retention);
    for sql in [
        "UPDATE lnsat_retention_policies SET cleanup_eligible = '0' WHERE record_family = 'action_request'",
        "UPDATE lnsat_retention_policies SET minimum_retention_seconds = 0 WHERE record_family = 'action_request'",
        "UPDATE lnsat_retention_policies SET retention_class = printf('%.*c', 4096, 'x') WHERE record_family = 'action_request'",
        "DELETE FROM lnsat_retention_policies WHERE record_family = 'action_request'",
        "INSERT INTO lnsat_retention_policies VALUES ('zz_extra_family', 'control_plane', 'preserve', 0, NULL)",
    ] {
        let connection = retention_fixture();
        connection.execute_batch(sql).unwrap();
        assert_denied_read_only(&connection, super::verify_retention);
    }
    let connection = retention_fixture();
    connection
        .execute(
            "UPDATE lnsat_retention_policies SET record_family = ?1 WHERE record_family = 'action_request'",
            [Value::Blob(vec![b'x'; 4096])],
        )
        .unwrap();
    assert_denied_read_only(&connection, super::verify_retention);
}
