use super::*;

#[test]
#[allow(clippy::too_many_lines)] // Preserve the same v17 evidence for every collision kind.
fn action_request_reserved_namespace_collisions_preserve_schema_seventeen() {
    let collisions = [
        (
            "request-table",
            "table",
            "lnsat_action_requests",
            "CREATE TABLE lnsat_action_requests (marker TEXT NOT NULL)",
        ),
        (
            "evaluation-table",
            "table",
            "lnsat_action_request_evaluations",
            "CREATE TABLE lnsat_action_request_evaluations (marker TEXT NOT NULL)",
        ),
        (
            "observation-table",
            "table",
            "lnsat_action_request_observations",
            "CREATE TABLE lnsat_action_request_observations (marker TEXT NOT NULL)",
        ),
        (
            "request-binding-index",
            "index",
            "lnsat_policy_decisions_request_binding_idx",
            "CREATE INDEX lnsat_policy_decisions_request_binding_idx
             ON lnsat_policy_decisions (decision_id)",
        ),
        (
            "request-immutable-trigger",
            "trigger",
            "lnsat_action_requests_reject_update",
            "CREATE TRIGGER lnsat_action_requests_reject_update
             BEFORE UPDATE ON lnsat_policy_decisions
             BEGIN SELECT RAISE(ABORT, 'reserved action request trigger'); END",
        ),
    ];

    for (label, object_type, object_name, sql) in collisions {
        let database = TestDatabase::new(&format!("action-request-{label}-collision"));
        create_version_seventeen_database(&database.path);
        let connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("schema-17 collision fixture must open");
        configure_connection(&connection).expect("schema-17 collision fixture must configure");
        connection
            .execute_batch(sql)
            .expect("reserved namespace collision must seed");
        if object_type == "table" {
            connection
                .execute(
                    &format!("INSERT INTO {object_name} (marker) VALUES ('preexisting collision')"),
                    [],
                )
                .expect("table collision content must seed");
        }

        let before_version = pragma_i64(&connection, "user_version").expect("version must inspect");
        let before_metadata: i64 = connection
            .query_row(
                "SELECT schema_version FROM lnsat_store_metadata WHERE singleton = 1",
                [],
                |row| row.get(0),
            )
            .expect("metadata must inspect");
        let before_migrations: i64 = connection
            .query_row("SELECT count(*) FROM lnsat_schema_migrations", [], |row| {
                row.get(0)
            })
            .expect("migration ledger must inspect");
        let before_retention: i64 = connection
            .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                row.get(0)
            })
            .expect("retention policies must inspect");
        let before_object_sql: String = connection
            .query_row(
                &format!(
                    "SELECT sql FROM sqlite_schema
                     WHERE type = '{object_type}' AND name = '{object_name}'"
                ),
                [],
                |row| row.get(0),
            )
            .expect("collision object must inspect");
        drop(connection);

        assert_eq!(
            SqliteStore::open(&database.path).err(),
            Some(SqliteStoreError::MigrationDrift)
        );

        let connection =
            Connection::open_with_flags(&database.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
                .expect("denied schema-17 fixture must reopen");
        configure_connection(&connection).expect("denied schema-17 fixture must configure");
        assert_eq!(
            pragma_i64(&connection, "user_version").expect("version must remain readable"),
            before_version,
            "{label} must preserve schema version"
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT schema_version FROM lnsat_store_metadata WHERE singleton = 1",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .expect("metadata must remain readable"),
            before_metadata,
            "{label} must preserve metadata"
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_schema_migrations", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("migration ledger must remain readable"),
            before_migrations,
            "{label} must preserve migration ledger"
        );
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM lnsat_retention_policies", [], |row| {
                    row.get::<_, i64>(0)
                })
                .expect("retention policies must remain readable"),
            before_retention,
            "{label} must preserve retention policies"
        );
        assert_eq!(
            connection
                .query_row(
                    &format!(
                        "SELECT sql FROM sqlite_schema
                         WHERE type = '{object_type}' AND name = '{object_name}'"
                    ),
                    [],
                    |row| row.get::<_, String>(0),
                )
                .expect("collision object must remain readable"),
            before_object_sql,
            "{label} must preserve collision object"
        );
        if object_type == "table" {
            assert_eq!(
                connection
                    .query_row(&format!("SELECT marker FROM {object_name}"), [], |row| {
                        row.get::<_, String>(0)
                    },)
                    .expect("collision content must remain readable"),
                "preexisting collision",
                "{label} must preserve collision content"
            );
        }
    }
}
