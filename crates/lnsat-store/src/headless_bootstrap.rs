//! Read-only fresh-store prerequisite for local headless bootstrap.
//!
//! This inspection is a snapshot diagnostic, never a bootstrap permit. A later
//! initializer must repeat the private check in its own immediate transaction,
//! together with host-owner, lease, file, declaration, and platform checks.

use super::{
    Connection, REQUIRED_TABLES_V17, SQLITE_SCHEMA_VERSION, SqliteStore, TransactionBehavior,
    verify_connection_integrity, verify_current_schema,
};
use core::fmt;
use core::fmt::Write as _;
use rusqlite::types::ValueRef;
use sha2::{Digest, Sha256};

const SCHEMA_V17_DIGEST: &str = "66911985ea6357018f9a55890e28e68394a59abdbc90d9cb4aa04f3a7c75b62a";
const SCHEMA_DOMAIN: &[u8] = b"lnsat.headless_bootstrap.schema.v17\n";
const MAX_SCHEMA_OBJECTS: usize = 256;
const MAX_SCHEMA_BYTES: usize = 262_144;

// These are the only migration-created rows a pristine schema-17 store has.
// Retention seeds are immutable preserve-only policy, verified by the existing
// schema verifier. They are not a caller-defined metadata exception.
const SEED_TABLES: [&str; 3] = [
    "lnsat_schema_migrations",
    "lnsat_store_metadata",
    "lnsat_retention_policies",
];

/// Fixed, non-reflective errors for a local store inspection.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HeadlessBootstrapStoreErrorV1 {
    /// The selected snapshot contains prior authority or evidence.
    NotAuthorityEmpty,
    /// Schema, integrity, namespace, or snapshot custody cannot be verified.
    UnverifiableStore,
}

impl HeadlessBootstrapStoreErrorV1 {
    /// Returns a public-safe code without table names, paths, or row content.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::NotAuthorityEmpty => "headless_bootstrap.not_authority_empty",
            Self::UnverifiableStore => "headless_bootstrap.unverifiable_store",
        }
    }
}

impl fmt::Display for HeadlessBootstrapStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for HeadlessBootstrapStoreErrorV1 {}

/// A successful read-only snapshot classification, not initialization authority.
///
/// It carries no store binding or authority capability and is not serializable.
/// Its result must never replace a transaction-time freshness check.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct HeadlessBootstrapStoreInspectionV1 {
    _private: (),
}

impl HeadlessBootstrapStoreInspectionV1 {
    /// The inspected snapshot contained only exact compiled migration seeds.
    #[must_use]
    pub const fn authority_empty(self) -> bool {
        true
    }

    /// This source inspection cannot initialize an installation.
    #[must_use]
    pub const fn initialization_available(self) -> bool {
        false
    }

    /// This snapshot grants no action authority.
    #[must_use]
    pub const fn grants_action_authority(self) -> bool {
        false
    }
}

impl SqliteStore {
    /// Inspects all schema-17 authority/evidence tables in one read snapshot.
    ///
    /// This creates no owner, generation, audit row, schema, or activation. It
    /// does not verify host ownership, lease custody, resource identity, or OS
    /// enforcement. A result becomes stale as soon as another transaction writes.
    ///
    /// # Errors
    ///
    /// Rejects prior authority/evidence, schema/seed drift, temporary or attached
    /// namespaces, integrity failure, and unavailable snapshot/rollback evidence.
    pub fn inspect_headless_bootstrap_store_v1(
        &mut self,
    ) -> Result<HeadlessBootstrapStoreInspectionV1, HeadlessBootstrapStoreErrorV1> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Deferred)
            .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
        let result = require_authority_empty_v1(&transaction);
        transaction
            .rollback()
            .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
        result.map(|()| HeadlessBootstrapStoreInspectionV1 { _private: () })
    }
}

pub(super) fn require_authority_empty_v1(
    connection: &Connection,
) -> Result<(), HeadlessBootstrapStoreErrorV1> {
    verify_namespaces_v1(connection)?;
    if SQLITE_SCHEMA_VERSION != 17 || schema_digest_v1(connection)? != SCHEMA_V17_DIGEST {
        return Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore);
    }
    verify_current_schema(connection)
        .and_then(|()| verify_connection_integrity(connection))
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    require_empty_tables_v1(connection)
}

fn verify_namespaces_v1(connection: &Connection) -> Result<(), HeadlessBootstrapStoreErrorV1> {
    let temporary_objects: bool = connection
        .query_row(
            "SELECT EXISTS (SELECT 1 FROM temp.sqlite_schema)",
            [],
            |row| row.get(0),
        )
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    if temporary_objects {
        return Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore);
    }
    let mut statement = connection
        .prepare("PRAGMA database_list")
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    let mut rows = statement
        .query([])
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    while let Some(row) = rows
        .next()
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?
    {
        let name = row
            .get_ref(1)
            .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
        if !matches!(name, ValueRef::Text(b"main" | b"temp")) {
            return Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore);
        }
    }
    Ok(())
}

pub(super) fn schema_digest_v1(
    connection: &Connection,
) -> Result<String, HeadlessBootstrapStoreErrorV1> {
    let mut statement = connection
        .prepare("SELECT type, name, tbl_name, sql FROM main.sqlite_schema ORDER BY type, name LIMIT 257")
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    let mut rows = statement
        .query([])
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    let mut manifest = Vec::new();
    let mut bytes = 0_usize;
    while let Some(row) = rows
        .next()
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?
    {
        if manifest.len() == MAX_SCHEMA_OBJECTS {
            return Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore);
        }
        let mut entry = Vec::with_capacity(4);
        for column in 0..4 {
            let value = row
                .get_ref(column)
                .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
            let text = match value {
                ValueRef::Null if column == 3 => None,
                ValueRef::Text(value)
                    if value.len() <= if column == 3 { 65_536 } else { 1_024 } =>
                {
                    bytes += value.len();
                    if bytes > MAX_SCHEMA_BYTES {
                        return Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore);
                    }
                    Some(
                        std::str::from_utf8(value)
                            .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?
                            .to_owned(),
                    )
                }
                _ => return Err(HeadlessBootstrapStoreErrorV1::UnverifiableStore),
            };
            entry.push(text);
        }
        manifest.push(entry);
    }
    let canonical = serde_json::to_vec(&manifest)
        .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    let mut digest = Sha256::new();
    digest.update(SCHEMA_DOMAIN);
    digest.update(canonical);
    let mut encoded = String::with_capacity(64);
    for byte in digest.finalize() {
        write!(&mut encoded, "{byte:02x}")
            .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
    }
    Ok(encoded)
}

pub(super) fn require_empty_tables_v1(
    connection: &Connection,
) -> Result<(), HeadlessBootstrapStoreErrorV1> {
    for table in REQUIRED_TABLES_V17 {
        if SEED_TABLES.contains(&table) {
            continue;
        }
        // Identifiers come only from the compiled exact schema inventory, never
        // from caller input or sqlite_schema; main qualification blocks shadows.
        let occupied: bool = connection
            .query_row(
                &format!("SELECT EXISTS (SELECT 1 FROM main.\"{table}\")"),
                [],
                |row| row.get(0),
            )
            .map_err(|_| HeadlessBootstrapStoreErrorV1::UnverifiableStore)?;
        if occupied {
            return Err(HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty);
        }
    }
    Ok(())
}
