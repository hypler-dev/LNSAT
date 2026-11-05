//! In-place WAL/SHM association checks for the pinned Unix VFS.

use super::{
    FileIdentity, NATIVE_DIAGNOSTIC_BOUND, SelectedLocalStoreErrorV1, SelectedStoreCustodyV1,
    observe_native_stat, validate_metadata,
};
use rusqlite::Connection;
use std::{fs, io};

impl SelectedStoreCustodyV1 {
    /// Check the live coordination descriptors while an explicit WAL
    /// transaction holds them. The caller must establish single-writer custody.
    #[allow(
        dead_code,
        reason = "Selected write integration awaits native ACL and preparation custody"
    )]
    pub(super) fn verify_writable_sidecars(
        &self,
        connection: &Connection,
    ) -> Result<(), SelectedLocalStoreErrorV1> {
        if connection.is_autocommit()
            || connection
                .is_readonly(rusqlite::MAIN_DB)
                .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?
        {
            return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
        }
        let mode: String = connection
            .query_row("PRAGMA main.journal_mode", [], |row| row.get(0))
            .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?;
        if mode != "wal" {
            return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
        }
        self.verify()?;
        let before = self.sidecar_names()?;
        let first = self.observe_live_sidecars(connection, &before)?;
        self.verify()?;
        if self.sidecar_names()? != before {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        let second = self.observe_live_sidecars(connection, &before)?;
        if first != second || self.sidecar_names()? != before {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        self.verify()
    }

    fn sidecar_names(&self) -> Result<[FileIdentity; 2], SelectedLocalStoreErrorV1> {
        let name = self
            .database_path
            .file_name()
            .and_then(std::ffi::OsStr::to_str)
            .ok_or(SelectedLocalStoreErrorV1::InvalidSelection)?;
        let path = |suffix| self.parent_path.join(format!("{name}{suffix}"));
        match fs::symlink_metadata(path("-journal")) {
            Err(error) if error.kind() == io::ErrorKind::NotFound => (),
            _ => return Err(SelectedLocalStoreErrorV1::CustodyChanged),
        }
        let identity = |suffix| {
            let metadata = fs::symlink_metadata(path(suffix))
                .map_err(|_| SelectedLocalStoreErrorV1::CustodyChanged)?;
            validate_metadata(&metadata, self.owner_uid, false)?;
            Ok(FileIdentity::of(&metadata))
        };
        Ok([identity("-wal")?, identity("-shm")?])
    }

    fn observe_live_sidecars(
        &self,
        connection: &Connection,
        identities: &[FileIdentity; 2],
    ) -> Result<[i32; 3], SelectedLocalStoreErrorV1> {
        let stat = observe_native_stat(connection, NATIVE_DIAGNOSTIC_BOUND)?;
        let wal = stat
            .journal
            .ok_or(SelectedLocalStoreErrorV1::StoreUnverifiable)?;
        let shm = stat
            .db
            .shm
            .ok_or(SelectedLocalStoreErrorV1::StoreUnverifiable)?;
        if wal.vfs != "unix"
            || wal.h < 0
            || shm.h < 0
            || wal.h == shm.h
            || wal.h == stat.db.h
            || shm.h == stat.db.h
        {
            return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
        }
        self.verify_native_metadata(stat.db.h)?;
        self.verify_native_file(wal.h, &identities[0])?;
        self.verify_native_file(shm.h, &identities[1])?;
        Ok([stat.db.h, wal.h, shm.h])
    }
}
