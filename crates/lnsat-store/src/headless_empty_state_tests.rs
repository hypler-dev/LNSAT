use super::{V17_OCCUPIED, V18_OCCUPIED, V19_OCCUPIED};
use crate::{REQUIRED_TABLES_V17, REQUIRED_TABLES_V18};
use rusqlite::Connection;
use std::collections::BTreeSet;

const SEEDS: [&str; 3] = [
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
    "lnsat_retention_policies",
];
const HEADLESS: [&str; 4] = [
    "headless_installations",
    "headless_generations",
    "headless_config_audit",
    "headless_active",
];

fn cases() -> [(Vec<&'static str>, &'static str, usize); 3] {
    [
        (REQUIRED_TABLES_V17.to_vec(), V17_OCCUPIED, 28),
        (REQUIRED_TABLES_V18.to_vec(), V18_OCCUPIED, 31),
        (
            REQUIRED_TABLES_V18.into_iter().chain(HEADLESS).collect(),
            V19_OCCUPIED,
            35,
        ),
    ]
}

fn fixture(tables: &[&str]) -> Connection {
    let connection = Connection::open_in_memory().unwrap();
    for name in tables {
        connection
            .execute(&format!("CREATE TABLE main.\"{name}\" (value INTEGER)"), [])
            .unwrap();
    }
    connection
}

#[test]
fn literal_predicates_match_every_compiled_authority_table_once() {
    for (tables, sql, expected_count) in cases() {
        let expected: BTreeSet<_> = tables
            .iter()
            .copied()
            .filter(|name| !SEEDS.contains(name))
            .collect();
        let found: Vec<_> = sql
            .split("EXISTS (SELECT 1 FROM main.\"")
            .skip(1)
            .map(|tail| tail.split_once("\")").unwrap().0)
            .collect();
        assert_eq!(expected.len(), expected_count);
        assert_eq!(found.len(), expected_count);
        assert_eq!(found.iter().copied().collect::<BTreeSet<_>>(), expected);
        assert!(!sql.contains("temp."));
        assert!(!sql.contains(';'));
    }
}

#[test]
fn every_single_populated_table_denies_and_clearing_it_restores_empty() {
    for (tables, sql, _) in cases() {
        let connection = fixture(&tables);
        let mut statement = connection.prepare(sql).unwrap();
        assert!(statement.readonly());
        assert_eq!(statement.parameter_count(), 0);
        assert_eq!(statement.column_count(), 1);
        assert!(
            !statement
                .query_row([], |row| row.get::<_, bool>(0))
                .unwrap()
        );
        for name in tables.iter().filter(|name| !SEEDS.contains(name)) {
            connection
                .execute(&format!("INSERT INTO main.\"{name}\" VALUES (1)"), [])
                .unwrap();
            let changes = connection.total_changes();
            assert!(
                statement
                    .query_row([], |row| row.get::<_, bool>(0))
                    .unwrap()
            );
            assert_eq!(connection.total_changes(), changes);
            connection
                .execute(&format!("DELETE FROM main.\"{name}\""), [])
                .unwrap();
            assert!(
                !statement
                    .query_row([], |row| row.get::<_, bool>(0))
                    .unwrap()
            );
        }
    }
}

#[test]
fn compiled_seed_tables_remain_separate_from_authority_emptiness() {
    for (tables, sql, _) in cases() {
        let connection = fixture(&tables);
        for name in SEEDS {
            connection
                .execute(&format!("INSERT INTO main.\"{name}\" VALUES (1)"), [])
                .unwrap();
        }
        assert!(
            !connection
                .query_row(sql, [], |row| row.get::<_, bool>(0))
                .unwrap()
        );
    }
}

#[test]
fn temporary_shadows_cannot_hide_main_rows_or_replace_missing_tables() {
    for (tables, sql, _) in cases() {
        let connection = fixture(&tables);
        let target = tables.iter().find(|name| !SEEDS.contains(name)).unwrap();
        connection
            .execute(
                &format!("CREATE TEMP TABLE \"{target}\" (value INTEGER)"),
                [],
            )
            .unwrap();
        connection
            .execute(&format!("INSERT INTO main.\"{target}\" VALUES (1)"), [])
            .unwrap();
        assert!(
            connection
                .query_row(sql, [], |row| row.get::<_, bool>(0))
                .unwrap()
        );
        connection
            .execute(&format!("DROP TABLE main.\"{target}\""), [])
            .unwrap();
        assert!(connection.prepare(sql).is_err());
    }
}

#[test]
fn unrelated_main_tables_do_not_substitute_for_any_required_table() {
    for (tables, sql, _) in cases() {
        let connection = fixture(&tables);
        connection
            .execute("CREATE TABLE main.unrelated (value INTEGER)", [])
            .unwrap();
        connection
            .execute("INSERT INTO main.unrelated VALUES (1)", [])
            .unwrap();
        // This primitive checks authority-table occupancy only. Existing exact
        // schema verification separately rejects the unrelated table.
        assert!(
            !connection
                .query_row(sql, [], |row| row.get::<_, bool>(0))
                .unwrap()
        );
        let target = tables.iter().find(|name| !SEEDS.contains(name)).unwrap();
        connection
            .execute(&format!("DROP TABLE main.\"{target}\""), [])
            .unwrap();
        assert!(connection.prepare(sql).is_err());
    }
}
