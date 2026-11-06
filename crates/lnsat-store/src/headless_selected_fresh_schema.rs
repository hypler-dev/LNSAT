//! Bounded-data schema-18 prerequisite for selected inert migration only.
//!
//! Exact compiled schema, all three seed families, namespace, emptiness and
//! integrity remain mandatory. Ordinary open and public inspection keep their
//! existing verifiers. This helper is not rooted checked-SQL lifecycle evidence
//! and cannot create a prepared installation or current authority.

use super::{Connection, HeadlessBootstrapStoreErrorV1 as Error};
use rusqlite::types::ValueRef;

const _: [(); 18] = [(); crate::MIGRATIONS.len()];
const _: [(); 31] = [(); crate::RETENTION_RECORD_FAMILIES_V18.len()];

fn denied<T>(_: T) -> Error {
    Error::UnverifiableStore
}

fn text(value: ValueRef<'_>, expected: &str) -> bool {
    matches!(value, ValueRef::Text(bytes) if bytes == expected.as_bytes())
}

fn integer(value: ValueRef<'_>, expected: i64) -> bool {
    matches!(value, ValueRef::Integer(found) if found == expected)
}

pub(super) fn verify(connection: &Connection) -> Result<(), Error> {
    super::verify_namespaces_v1(connection)?;
    if super::schema_version_v1(connection)? != 18
        || super::schema_digest_v1(connection)? != super::SCHEMA_V18_DIGEST
    {
        return Err(Error::UnverifiableStore);
    }
    verify_metadata(connection)?;
    verify_migrations(connection)?;
    verify_retention(connection)?;
    // Prove emptiness before the legacy integrity scan, so populated evidence
    // cannot trigger its full-data work on this private fresh-only path.
    super::require_empty_tables_at_version_v1(connection, 18)?;
    crate::verify_connection_integrity(connection).map_err(denied)
}

fn verify_metadata(connection: &Connection) -> Result<(), Error> {
    let mut statement = connection
        .prepare("SELECT singleton, contract_version, schema_version, storage_kind FROM main.lnsat_store_metadata LIMIT 2")
        .map_err(denied)?;
    let mut rows = statement.query([]).map_err(denied)?;
    let row = rows
        .next()
        .map_err(denied)?
        .ok_or(Error::UnverifiableStore)?;
    if !integer(row.get_ref(0).map_err(denied)?, 1)
        || !text(row.get_ref(1).map_err(denied)?, crate::CONTRACT_VERSION)
        || !integer(row.get_ref(2).map_err(denied)?, 18)
        || !text(row.get_ref(3).map_err(denied)?, crate::STORAGE_KIND)
        || rows.next().map_err(denied)?.is_some()
    {
        return Err(Error::UnverifiableStore);
    }
    drop(rows);
    statement.finalize().map_err(denied)
}

fn verify_migrations(connection: &Connection) -> Result<(), Error> {
    let mut statement = connection
        .prepare("SELECT schema_version, migration_id, migration_sha256, applied_order FROM main.lnsat_schema_migrations ORDER BY applied_order LIMIT 19")
        .map_err(denied)?;
    let mut rows = statement.query([]).map_err(denied)?;
    for expected in &crate::MIGRATIONS {
        let row = rows
            .next()
            .map_err(denied)?
            .ok_or(Error::UnverifiableStore)?;
        if !integer(row.get_ref(0).map_err(denied)?, expected.version)
            || !text(row.get_ref(1).map_err(denied)?, expected.id)
            || !text(
                row.get_ref(2).map_err(denied)?,
                &crate::migration_digest(expected.sql),
            )
            || !integer(row.get_ref(3).map_err(denied)?, expected.version)
        {
            return Err(Error::UnverifiableStore);
        }
    }
    if rows.next().map_err(denied)?.is_some() {
        return Err(Error::UnverifiableStore);
    }
    drop(rows);
    statement.finalize().map_err(denied)
}

fn verify_retention(connection: &Connection) -> Result<(), Error> {
    let mut expected = crate::RETENTION_RECORD_FAMILIES_V18;
    expected.sort_unstable();
    let mut statement = connection
        .prepare("SELECT record_family, retention_class, disposition, cleanup_eligible, minimum_retention_seconds FROM main.lnsat_retention_policies ORDER BY record_family LIMIT 32")
        .map_err(denied)?;
    let mut rows = statement.query([]).map_err(denied)?;
    for family in expected {
        let row = rows
            .next()
            .map_err(denied)?
            .ok_or(Error::UnverifiableStore)?;
        if !text(row.get_ref(0).map_err(denied)?, family)
            || !text(row.get_ref(1).map_err(denied)?, "control_plane")
            || !text(row.get_ref(2).map_err(denied)?, "preserve")
            || !integer(row.get_ref(3).map_err(denied)?, 0)
            || !matches!(row.get_ref(4).map_err(denied)?, ValueRef::Null)
        {
            return Err(Error::UnverifiableStore);
        }
    }
    if rows.next().map_err(denied)?.is_some() {
        return Err(Error::UnverifiableStore);
    }
    drop(rows);
    statement.finalize().map_err(denied)
}

#[cfg(test)]
#[path = "headless_selected_fresh_schema_tests.rs"]
mod tests;
