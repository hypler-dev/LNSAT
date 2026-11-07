//! Private writable-custody fixture. Named sidecar checks are exercised here
//! under a trusted test owner. Production requires the selected Linux ACL,
//! mount and `SQLite` coordination-file lifecycle checks.

use super::*;

pub(crate) struct SelectedWriteFixture {
    // Close SQLite before releasing the selected-store lease.
    connection: Connection,
    custody: SelectedStoreCustodyV1,
}

fn unavailable<T>(_: T) -> SelectedLocalStoreErrorV1 {
    SelectedLocalStoreErrorV1::StoreUnverifiable
}

fn coordination(
    custody: &SelectedStoreCustodyV1,
) -> Result<[Option<FileIdentity>; 2], SelectedLocalStoreErrorV1> {
    let name = custody
        .database_path
        .file_name()
        .and_then(std::ffi::OsStr::to_str)
        .ok_or(SelectedLocalStoreErrorV1::InvalidSelection)?;
    let observe = |suffix: &str| match fs::symlink_metadata(
        custody.parent_path.join(format!("{name}{suffix}")),
    ) {
        Ok(metadata) => {
            validate_metadata(&metadata, custody.owner_uid, false)?;
            Ok(Some(FileIdentity::of(&metadata)))
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err(SelectedLocalStoreErrorV1::CustodyChanged),
    };
    if observe("-journal")?.is_some() {
        return Err(SelectedLocalStoreErrorV1::CustodyChanged);
    }
    Ok([observe("-wal")?, observe("-shm")?])
}

impl SelectedWriteFixture {
    pub(crate) fn open(path: &Path) -> Result<Self, SelectedLocalStoreErrorV1> {
        let custody = SelectedStoreCustodyV1::acquire(path)?;
        custody.verify()?;
        let before = coordination(&custody)?;
        let connection =
            Connection::open_with_flags_and_vfs(path, OpenFlags::SQLITE_OPEN_READ_WRITE, "unix")
                .map_err(unavailable)?;
        configure_native_boundary(&connection)?;
        for (name, value, expected) in [
            ("foreign_keys", "ON", 1),
            ("recursive_triggers", "ON", 1),
            ("synchronous", "FULL", 2),
            ("trusted_schema", "OFF", 0),
            ("query_only", "ON", 1),
        ] {
            connection
                .pragma_update(None, name, value)
                .map_err(unavailable)?;
            if pragma_i64(&connection, name).map_err(unavailable)? != expected {
                return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
            }
        }
        let mode: String = connection
            .query_row("PRAGMA main.journal_mode", [], |row| row.get(0))
            .map_err(unavailable)?;
        if mode != "wal"
            || connection
                .is_readonly(rusqlite::MAIN_DB)
                .map_err(unavailable)?
        {
            return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
        }
        custody.verify_connection(&connection)?;
        let after = coordination(&custody)?;
        if before
            .iter()
            .zip(&after)
            .any(|(old, new)| old.is_some() && old != new)
        {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        Ok(Self {
            connection,
            custody,
        })
    }

    // This adapter is available only to trusted fixture code.
    pub(crate) fn transaction(
        mut self,
        write: impl FnOnce(&rusqlite::Transaction<'_>) -> Result<(), SelectedLocalStoreErrorV1>,
    ) -> Result<(), SelectedLocalStoreErrorV1> {
        self.custody.verify_connection(&self.connection)?;
        let before = coordination(&self.custody)?;
        self.connection
            .pragma_update(None, "query_only", "OFF")
            .map_err(unavailable)?;
        let tx = self
            .connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(unavailable)?;
        self.custody.verify_writable_sidecars(&tx)?;
        if coordination(&self.custody)? != before {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        if pragma_i64(&tx, "user_version").map_err(unavailable)? != 18 {
            return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
        }
        crate::headless_bootstrap::require_authority_empty_v1(&tx).map_err(unavailable)?;
        write(&tx)?;
        self.custody.verify_writable_sidecars(&tx)?;
        if coordination(&self.custody)? != before {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        crate::verify_connection_integrity(&tx).map_err(unavailable)?;
        tx.commit().map_err(unavailable)
    }
}
