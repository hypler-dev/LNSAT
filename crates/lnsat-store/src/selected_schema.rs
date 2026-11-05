//! Exact selected-only schema 19. Ordinary store opens remain schema 18.

use crate::{
    Connection, MIGRATIONS, REQUIRED_TABLES_V18, RETENTION_RECORD_FAMILIES_V18,
    headless_bootstrap::require_authority_empty_v1, migration_digest,
    selected_store::SelectedLocalStoreErrorV1 as Error,
};
use rusqlite::{Transaction, params, types::ValueRef};
use sha2::{Digest, Sha256};

pub(super) const SQL: &str = include_str!("headless_schema_19.sql");
const MIGRATION_ID: &str = "0019_selected_headless_bootstrap";
const DIGEST: &str = "sha256:c566334a11f4f2707b85236d2a28b121304db743d30c54565de0b74c2d6bf298";
const HEADLESS: [&str; 4] = [
    "headless_installations",
    "headless_generations",
    "headless_config_audit",
    "headless_active",
];
const RETENTION: [&str; 4] = [
    "headless_active",
    "headless_config_audit",
    "headless_generation",
    "headless_installation",
];
const SEEDS: [&str; 3] = [
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
    "lnsat_retention_policies",
];

fn denied<T>(_: T) -> Error {
    Error::StoreUnverifiable
}

pub(super) fn migrate(transaction: &Transaction<'_>) -> Result<(), Error> {
    // The private Linux owner is responsible for an IMMEDIATE transaction and
    // live custody. This function cannot open, commit or return a store.
    require_authority_empty_v1(transaction).map_err(denied)?;
    if crate::pragma_i64(transaction, "user_version").map_err(denied)? != 18 {
        return Err(Error::StoreUnverifiable);
    }
    transaction.execute_batch(SQL).map_err(denied)?;
    transaction
        .execute(
            "INSERT INTO lnsat_schema_migrations VALUES (19, ?1, ?2, 19)",
            params![MIGRATION_ID, migration_digest(SQL)],
        )
        .map_err(denied)?;
    transaction
        .pragma_update(None, "user_version", 19)
        .map_err(denied)?;
    verify(transaction)?;
    require_empty(transaction)
}

pub(super) fn verify(connection: &Connection) -> Result<(), Error> {
    if crate::pragma_i64(connection, "user_version").map_err(denied)? != 19
        || schema_digest(connection)? != DIGEST
    {
        return Err(Error::StoreUnverifiable);
    }
    let temporary: bool = connection
        .query_row(
            "SELECT EXISTS (SELECT 1 FROM temp.sqlite_schema)",
            [],
            |row| row.get(0),
        )
        .map_err(denied)?;
    let attached: i64 = connection
        .query_row(
            "SELECT count(*) FROM pragma_database_list WHERE name NOT IN ('main','temp')",
            [],
            |row| row.get(0),
        )
        .map_err(denied)?;
    if temporary || attached != 0 {
        return Err(Error::StoreUnverifiable);
    }
    verify_seeds(connection)?;
    crate::verify_connection_integrity(connection).map_err(denied)
}

fn verify_seeds(connection: &Connection) -> Result<(), Error> {
    let metadata: (i64, String, i64, String) = connection.query_row("SELECT singleton, contract_version, schema_version, storage_kind FROM main.lnsat_store_metadata", [], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).map_err(denied)?;
    let count: i64 = connection
        .query_row("SELECT count(*) FROM main.lnsat_store_metadata", [], |r| {
            r.get(0)
        })
        .map_err(denied)?;
    if count != 1
        || metadata
            != (
                1,
                crate::CONTRACT_VERSION.to_owned(),
                19,
                crate::STORAGE_KIND.to_owned(),
            )
    {
        return Err(Error::StoreUnverifiable);
    }
    let mut stmt = connection.prepare("SELECT schema_version, migration_id, migration_sha256, applied_order FROM main.lnsat_schema_migrations ORDER BY applied_order LIMIT 20").map_err(denied)?;
    let applied = stmt
        .query_map([], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, i64>(3)?,
            ))
        })
        .map_err(denied)?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(denied)?;
    let mut expected: Vec<_> = MIGRATIONS
        .iter()
        .map(|m| {
            (
                m.version,
                m.id.to_owned(),
                migration_digest(m.sql),
                m.version,
            )
        })
        .collect();
    expected.push((19, MIGRATION_ID.to_owned(), migration_digest(SQL), 19));
    if applied != expected {
        return Err(Error::StoreUnverifiable);
    }
    let mut policies = connection.prepare("SELECT record_family, retention_class, disposition, cleanup_eligible, minimum_retention_seconds FROM main.lnsat_retention_policies ORDER BY record_family LIMIT 36").map_err(denied)?;
    let found = policies
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, i64>(3)?,
                r.get::<_, Option<i64>>(4)?,
            ))
        })
        .map_err(denied)?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(denied)?;
    let mut families: Vec<_> = RETENTION_RECORD_FAMILIES_V18
        .into_iter()
        .chain(RETENTION)
        .collect();
    families.sort_unstable();
    let expected: Vec<_> = families
        .into_iter()
        .map(|name| {
            (
                name.to_owned(),
                "control_plane".to_owned(),
                "preserve".to_owned(),
                0,
                None,
            )
        })
        .collect();
    if found != expected {
        return Err(Error::StoreUnverifiable);
    }
    Ok(())
}

pub(super) fn require_empty(connection: &Connection) -> Result<(), Error> {
    for name in REQUIRED_TABLES_V18
        .into_iter()
        .chain(HEADLESS)
        .filter(|name| !SEEDS.contains(name))
    {
        let occupied: bool = connection
            .query_row(
                &format!("SELECT EXISTS (SELECT 1 FROM main.\"{name}\")"),
                [],
                |row| row.get(0),
            )
            .map_err(denied)?;
        if occupied {
            return Err(Error::StoreUnverifiable);
        }
    }
    Ok(())
}

fn schema_digest(connection: &Connection) -> Result<String, Error> {
    // Separate exact budget; the older 17/18 collector's limit is unchanged.
    let mut stmt = connection.prepare("SELECT type, name, tbl_name, sql FROM main.sqlite_schema ORDER BY type, name LIMIT 260").map_err(denied)?;
    let mut rows = stmt.query([]).map_err(denied)?;
    let mut manifest = Vec::new();
    let mut total = 0_usize;
    while let Some(row) = rows.next().map_err(denied)? {
        if manifest.len() == 259 {
            return Err(Error::StoreUnverifiable);
        }
        let mut entry = Vec::new();
        for index in 0..4 {
            let value = match row.get_ref(index).map_err(denied)? {
                ValueRef::Null if index == 3 => None,
                ValueRef::Text(bytes) if bytes.len() <= if index == 3 { 65_536 } else { 1024 } => {
                    total += bytes.len();
                    if total > 262_144 {
                        return Err(Error::StoreUnverifiable);
                    }
                    Some(std::str::from_utf8(bytes).map_err(denied)?.to_owned())
                }
                _ => return Err(Error::StoreUnverifiable),
            };
            entry.push(value);
        }
        manifest.push(entry);
    }
    if manifest.len() != 259 {
        return Err(Error::StoreUnverifiable);
    }
    let mut hash = Sha256::new();
    hash.update(b"lnsat.headless_bootstrap.schema.v19\n");
    hash.update(serde_json::to_vec(&manifest).map_err(denied)?);
    Ok(crate::encode_sha256(hash.finalize()))
}
