//! Observed POSIX selected-store custody for read-only preflight.
//!
//! This is not `SQLite` descriptor attestation, effective ACL isolation, a
//! serializable permit, or initialization/action authority.

use std::fmt;
use std::path::Path;

use super::SqliteStore;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use super::{
    LOCAL_AUTHENTICATION_DUMMY_VERIFIER_V1, SQLITE_BUSY_TIMEOUT, SQLITE_SCHEMA_VERSION,
    local_database_lease_path_v1, pragma_i64, preflight_schema,
};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use nix::{
    fcntl::OFlag,
    unistd::{geteuid, getuid},
};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use rusqlite::{
    Connection, OpenFlags,
    config::DbConfig::{
        SQLITE_DBCONFIG_DEFENSIVE, SQLITE_DBCONFIG_DQS_DDL, SQLITE_DBCONFIG_DQS_DML,
        SQLITE_DBCONFIG_TRUSTED_SCHEMA,
    },
};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::{
    fs::{self, File, Metadata, OpenOptions, TryLockError},
    io,
    os::unix::fs::{FileExt, MetadataExt, OpenOptionsExt},
    path::PathBuf,
};

/// Closed, public-safe selected-store custody failures.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SelectedLocalStoreErrorV1 {
    /// The selected platform has no implemented custody checks.
    UnsupportedPlatform,
    /// Root/set-ID process or observed file owner is unacceptable.
    OwnerRejected,
    /// The explicit existing selection is noncanonical or insecure.
    InvalidSelection,
    /// Held/current path, file, mode, or process custody changed.
    CustodyChanged,
    /// Current schema, read-only posture, or integrity cannot be verified.
    StoreUnverifiable,
    /// The existing daemon/offline recovery lease is already held.
    DatabaseBusy,
    /// An ordinary store has no retained selected-store custody.
    UnboundStore,
}

impl SelectedLocalStoreErrorV1 {
    /// Stable code containing no caller path or database content.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::UnsupportedPlatform => "selected_local_store.unsupported_platform",
            Self::OwnerRejected => "selected_local_store.owner_rejected",
            Self::InvalidSelection => "selected_local_store.invalid_selection",
            Self::CustodyChanged => "selected_local_store.custody_changed",
            Self::StoreUnverifiable => "selected_local_store.store_unverifiable",
            Self::DatabaseBusy => "selected_local_store.database_busy",
            Self::UnboundStore => "selected_local_store.unbound_store",
        }
    }
}
impl fmt::Display for SelectedLocalStoreErrorV1 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}
impl std::error::Error for SelectedLocalStoreErrorV1 {}

#[cfg(any(target_os = "linux", target_os = "macos"))]
#[derive(PartialEq, Eq)]
struct FileIdentity {
    device: u64,
    inode: u64,
}
#[cfg(any(target_os = "linux", target_os = "macos"))]
impl FileIdentity {
    fn of(metadata: &Metadata) -> Self {
        Self {
            device: metadata.dev(),
            inode: metadata.ino(),
        }
    }
}

// Private fields; no Debug, Clone, wire format, or authority conversion.
#[cfg(any(target_os = "linux", target_os = "macos"))]
pub(super) struct SelectedStoreCustodyV1 {
    database_path: PathBuf,
    parent_path: PathBuf,
    lease_path: PathBuf,
    owner_uid: u32,
    database_identity: FileIdentity,
    parent_identity: FileIdentity,
    lease_identity: FileIdentity,
    database_file: File,
    parent_file: File,
    lease_file: File,
    #[cfg(test)]
    pub(super) drop_observer: Option<Box<dyn FnOnce() + Send>>,
}
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
pub(super) struct SelectedStoreCustodyV1;

#[cfg(any(target_os = "linux", target_os = "macos"))]
pub(super) fn checked_process_owner(
    real_uid: u32,
    effective_uid: u32,
) -> Result<u32, SelectedLocalStoreErrorV1> {
    if real_uid == 0 || real_uid != effective_uid {
        return Err(SelectedLocalStoreErrorV1::OwnerRejected);
    }
    Ok(real_uid)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn current_owner() -> Result<u32, SelectedLocalStoreErrorV1> {
    checked_process_owner(getuid().as_raw(), geteuid().as_raw())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
pub(super) fn validate_metadata(
    metadata: &Metadata,
    owner_uid: u32,
    directory: bool,
) -> Result<(), SelectedLocalStoreErrorV1> {
    if metadata.uid() != owner_uid {
        return Err(SelectedLocalStoreErrorV1::OwnerRejected);
    }
    let valid_kind = if directory {
        metadata.is_dir()
    } else {
        metadata.is_file()
    };
    let expected_mode = if directory { 0o700 } else { 0o600 };
    if !valid_kind
        || metadata.mode() & 0o7777 != expected_mode
        || (!directory && metadata.nlink() != 1)
    {
        return Err(SelectedLocalStoreErrorV1::InvalidSelection);
    }
    Ok(())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn open_held(path: &Path, directory: bool) -> Result<File, SelectedLocalStoreErrorV1> {
    let mut flags = OFlag::O_NOFOLLOW | OFlag::O_CLOEXEC | OFlag::O_NONBLOCK;
    if directory {
        flags |= OFlag::O_DIRECTORY;
    }
    OpenOptions::new()
        .read(true)
        .custom_flags(flags.bits())
        .open(path)
        .map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn verify_held(
    path: &Path,
    file: &File,
    expected: &FileIdentity,
    owner_uid: u32,
    directory: bool,
) -> Result<(), SelectedLocalStoreErrorV1> {
    let held = file
        .metadata()
        .map_err(|_| SelectedLocalStoreErrorV1::CustodyChanged)?;
    let current =
        fs::symlink_metadata(path).map_err(|_| SelectedLocalStoreErrorV1::CustodyChanged)?;
    validate_metadata(&held, owner_uid, directory)
        .and_then(|()| validate_metadata(&current, owner_uid, directory))
        .map_err(|_| SelectedLocalStoreErrorV1::CustodyChanged)?;
    if FileIdentity::of(&held) != *expected || FileIdentity::of(&current) != *expected {
        return Err(SelectedLocalStoreErrorV1::CustodyChanged);
    }
    Ok(())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
impl SelectedStoreCustodyV1 {
    fn acquire(path: &Path) -> Result<Self, SelectedLocalStoreErrorV1> {
        let owner_uid = current_owner()?;
        if !path.is_absolute()
            || path.to_str().is_none_or(|value| value.len() > 4096)
            || path
                .canonicalize()
                .map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)?
                .as_os_str()
                != path.as_os_str()
        {
            return Err(SelectedLocalStoreErrorV1::InvalidSelection);
        }
        let parent = path
            .parent()
            .ok_or(SelectedLocalStoreErrorV1::InvalidSelection)?;
        let parent_metadata = fs::symlink_metadata(parent)
            .map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)?;
        validate_metadata(&parent_metadata, owner_uid, true)?;
        let parent_identity = FileIdentity::of(&parent_metadata);
        let parent_file = open_held(parent, true)?;
        verify_held(parent, &parent_file, &parent_identity, owner_uid, true)?;
        let database_metadata =
            fs::symlink_metadata(path).map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)?;
        validate_metadata(&database_metadata, owner_uid, false)?;
        let database_identity = FileIdentity::of(&database_metadata);
        let database_file = open_held(path, false)?;
        verify_held(path, &database_file, &database_identity, owner_uid, false)?;
        verify_checkpointed_header(&database_file)?;
        let lease_path = local_database_lease_path_v1(path)
            .map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)?;
        let mut options = OpenOptions::new();
        options
            .read(true)
            .write(true)
            .custom_flags((OFlag::O_NOFOLLOW | OFlag::O_CLOEXEC | OFlag::O_NONBLOCK).bits());
        let (lease_result, previous_lease_identity) = match fs::symlink_metadata(&lease_path) {
            Ok(metadata) => {
                validate_metadata(&metadata, owner_uid, false)?;
                (options.open(&lease_path), Some(FileIdentity::of(&metadata)))
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                (options.create_new(true).mode(0o600).open(&lease_path), None)
            }
            Err(_) => return Err(SelectedLocalStoreErrorV1::InvalidSelection),
        };
        let lease_file = lease_result.map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)?;
        let lease_metadata = lease_file
            .metadata()
            .map_err(|_| SelectedLocalStoreErrorV1::InvalidSelection)?;
        validate_metadata(&lease_metadata, owner_uid, false)?;
        let lease_identity = FileIdentity::of(&lease_metadata);
        if previous_lease_identity.is_some_and(|previous| previous != lease_identity) {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        verify_held(&lease_path, &lease_file, &lease_identity, owner_uid, false)?;
        lease_file.try_lock().map_err(|error| match error {
            TryLockError::WouldBlock => SelectedLocalStoreErrorV1::DatabaseBusy,
            TryLockError::Error(_) => SelectedLocalStoreErrorV1::InvalidSelection,
        })?;
        let custody = Self {
            database_path: path.to_path_buf(),
            parent_path: parent.to_path_buf(),
            lease_path,
            owner_uid,
            database_identity,
            parent_identity,
            lease_identity,
            database_file,
            parent_file,
            lease_file,
            #[cfg(test)]
            drop_observer: None,
        };
        custody.verify()?;
        Ok(custody)
    }

    pub(super) fn verify(&self) -> Result<(), SelectedLocalStoreErrorV1> {
        if current_owner()? != self.owner_uid
            || self
                .database_path
                .canonicalize()
                .map_err(|_| SelectedLocalStoreErrorV1::CustodyChanged)?
                .as_os_str()
                != self.database_path.as_os_str()
        {
            return Err(SelectedLocalStoreErrorV1::CustodyChanged);
        }
        verify_held(
            &self.parent_path,
            &self.parent_file,
            &self.parent_identity,
            self.owner_uid,
            true,
        )?;
        verify_held(
            &self.database_path,
            &self.database_file,
            &self.database_identity,
            self.owner_uid,
            false,
        )?;
        verify_held(
            &self.lease_path,
            &self.lease_file,
            &self.lease_identity,
            self.owner_uid,
            false,
        )
    }
}

// Reject pending/unknown checkpointed formats without opening SQLite or its
// WAL coordination files. This is only a conservative prefilter: SQLite must
// still verify the actual schema and integrity, including WAL state.
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn verify_checkpointed_header(file: &File) -> Result<(), SelectedLocalStoreErrorV1> {
    let mut header = [0_u8; 100];
    file.read_exact_at(&mut header, 0)
        .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?;
    let version = u32::from_be_bytes([header[60], header[61], header[62], header[63]]);
    if &header[..16] != b"SQLite format 3\0"
        || header[18..20] != [2, 2]
        || i64::from(version) != SQLITE_SCHEMA_VERSION
    {
        return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
    }
    Ok(())
}
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
impl SelectedStoreCustodyV1 {
    pub(super) fn verify(&self) -> Result<(), SelectedLocalStoreErrorV1> {
        Err(SelectedLocalStoreErrorV1::UnsupportedPlatform)
    }
}

// Only test builds observe drop sequencing. Production fields still drop in
// declaration order and never invoke caller code.
#[cfg(test)]
#[cfg(any(target_os = "linux", target_os = "macos"))]
impl Drop for SelectedStoreCustodyV1 {
    fn drop(&mut self) {
        if let Some(observer) = self.drop_observer.take() {
            observer();
        }
    }
}

pub(super) fn open_inspection(path: &Path) -> Result<SqliteStore, SelectedLocalStoreErrorV1> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        open_under_custody(SelectedStoreCustodyV1::acquire(path)?)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = path;
        Err(SelectedLocalStoreErrorV1::UnsupportedPlatform)
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn configure_read_only(connection: &Connection) -> Result<(), SelectedLocalStoreErrorV1> {
    let fail = |_| SelectedLocalStoreErrorV1::StoreUnverifiable;
    connection.busy_timeout(SQLITE_BUSY_TIMEOUT).map_err(fail)?;
    for (name, value) in [
        ("foreign_keys", "ON"),
        ("recursive_triggers", "ON"),
        ("synchronous", "FULL"),
        ("trusted_schema", "OFF"),
    ] {
        connection.pragma_update(None, name, value).map_err(fail)?;
    }
    if !connection
        .set_db_config(SQLITE_DBCONFIG_DEFENSIVE, true)
        .map_err(fail)?
    {
        return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
    }
    for disabled in [
        SQLITE_DBCONFIG_DQS_DDL,
        SQLITE_DBCONFIG_DQS_DML,
        SQLITE_DBCONFIG_TRUSTED_SCHEMA,
    ] {
        if connection.set_db_config(disabled, false).map_err(fail)? {
            return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
        }
    }
    let journal = connection
        .query_row("PRAGMA main.journal_mode", [], |row| {
            row.get::<_, String>(0)
        })
        .map_err(fail)?;
    if !connection.is_readonly(rusqlite::MAIN_DB).map_err(fail)?
        || journal != "wal"
        || pragma_i64(connection, "user_version")
            .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?
            != SQLITE_SCHEMA_VERSION
    {
        return Err(SelectedLocalStoreErrorV1::StoreUnverifiable);
    }
    Ok(())
}

// Tests replace/remove paths after held custody was captured. Production has
// no callback or injectable proof provider.
#[cfg(test)]
#[cfg(any(target_os = "linux", target_os = "macos"))]
pub(super) fn open_inspection_with_hook(
    path: &Path,
    before_sqlite_open: impl FnOnce(),
) -> Result<SqliteStore, SelectedLocalStoreErrorV1> {
    let custody = SelectedStoreCustodyV1::acquire(path)?;
    before_sqlite_open();
    open_under_custody(custody)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn open_under_custody(
    custody: SelectedStoreCustodyV1,
) -> Result<SqliteStore, SelectedLocalStoreErrorV1> {
    custody.verify()?;
    let connection =
        Connection::open_with_flags(&custody.database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?;
    configure_read_only(&connection)?;
    preflight_schema(&connection).map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?;
    let store = SqliteStore {
        database_path: custody.database_path.clone(),
        connection,
        authentication_dummy_verifier: LOCAL_AUTHENTICATION_DUMMY_VERIFIER_V1.to_owned(),
        selected_store_custody: Some(custody),
    };
    store
        .verify_schema()
        .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?;
    store
        .verify_integrity()
        .map_err(|_| SelectedLocalStoreErrorV1::StoreUnverifiable)?;
    store.verify_selected_local_store_custody_v1()?;
    Ok(store)
}
