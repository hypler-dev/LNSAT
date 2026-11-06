//! Process-local serialization for every supported durable writer.
//!
//! Physical file identity selects the gate. This is not authorization, an
//! inter-process lease, or containment of code running as the trusted owner.

use crate::writer_gate::{GateError, WriterGate, WriterPermit};
use rusqlite::{Connection, Error, Transaction, TransactionBehavior};
use std::{
    collections::HashMap,
    ops::Deref,
    path::Path,
    sync::{
        Arc, Mutex, OnceLock,
        atomic::{AtomicBool, Ordering},
    },
    time::{Duration, Instant},
};

#[cfg(any(test, target_os = "linux", target_os = "macos"))]
use std::fs;

const MAX_GATES: usize = 1024;
const POLL: Duration = Duration::from_millis(100);
const PHASE7_ACQUISITION_BUDGET: Duration = Duration::from_secs(20);

#[derive(Clone, Copy, Eq, Hash, PartialEq)]
struct StoreKey {
    device: u64,
    inode: u64,
}

struct Entry {
    key: StoreKey,
    gate: Arc<WriterGate>,
    legacy_closed: AtomicBool,
}

static GATES: OnceLock<Mutex<HashMap<StoreKey, Arc<Entry>>>> = OnceLock::new();

fn busy() -> Error {
    Error::SqliteFailure(rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_BUSY), None)
}

fn rejected() -> Error {
    Error::SqliteFailure(rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_AUTH), None)
}

fn closed() -> Error {
    Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_READONLY),
        None,
    )
}

fn gate_error(error: GateError) -> Error {
    match error {
        GateError::Busy => busy(),
        GateError::Poisoned | GateError::Quarantined | GateError::Limit => rejected(),
    }
}

fn entry(key: StoreKey, deadline: Instant) -> Result<Arc<Entry>, Error> {
    let registry = GATES.get_or_init(|| Mutex::new(HashMap::new()));
    loop {
        if Instant::now() >= deadline {
            return Err(busy());
        }
        match registry.try_lock() {
            Ok(mut entries) => {
                return register_entry(&mut entries, key);
            }
            Err(std::sync::TryLockError::Poisoned(_)) => return Err(rejected()),
            Err(std::sync::TryLockError::WouldBlock) => {
                std::thread::sleep(POLL.min(deadline.saturating_duration_since(Instant::now())));
            }
        }
    }
}

fn register_entry(
    entries: &mut HashMap<StoreKey, Arc<Entry>>,
    key: StoreKey,
) -> Result<Arc<Entry>, Error> {
    if let Some(value) = entries.get(&key) {
        return Ok(Arc::clone(value));
    }
    if entries.len() >= MAX_GATES {
        entries.retain(|_, value| {
            value.legacy_closed.load(Ordering::Acquire) || Arc::strong_count(value) > 1
        });
    }
    if entries.len() >= MAX_GATES {
        return Err(rejected());
    }
    let value = Arc::new(Entry {
        key,
        gate: WriterGate::new(),
        legacy_closed: AtomicBool::new(false),
    });
    entries.insert(key, Arc::clone(&value));
    Ok(value)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn path_key(path: &Path) -> Result<StoreKey, Error> {
    use std::os::unix::fs::MetadataExt;
    let metadata = fs::symlink_metadata(path).map_err(|_| rejected())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.nlink() == 0 {
        return Err(rejected());
    }
    Ok(StoreKey {
        device: metadata.dev(),
        inode: metadata.ino(),
    })
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn path_key(_path: &Path) -> Result<StoreKey, Error> {
    // Conservative legacy serialization only. Selected headless custody is
    // unsupported here, so this cannot claim physical platform identity.
    Ok(StoreKey {
        device: 0,
        inode: 0,
    })
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn connection_key(connection: &Connection) -> Result<StoreKey, Error> {
    let (device, inode) =
        crate::selected_store::connection_write_identity(connection).map_err(|_| rejected())?;
    Ok(StoreKey { device, inode })
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn connection_key(_connection: &Connection) -> Result<StoreKey, Error> {
    Ok(StoreKey {
        device: 0,
        inode: 0,
    })
}

/// Owns the same physical-store gate before SQL and through commit/rollback.
/// No borrowed mutex guard, clone, wire value, or external constructor escapes.
pub(super) struct WriteLease {
    entry: Arc<Entry>,
    permit: WriterPermit,
}

fn reserve(key: StoreKey, deadline: Instant, selected: bool) -> Result<WriteLease, Error> {
    let entry = entry(key, deadline)?;
    if !selected && entry.legacy_closed.load(Ordering::Acquire) {
        return Err(closed());
    }
    let permit = entry.gate.acquire(deadline).map_err(gate_error)?;
    // A waiter selected before migration must not regain legacy access after
    // the selected owner closes or after an uncertain migration outcome.
    if !selected && entry.legacy_closed.load(Ordering::Acquire) {
        return Err(closed());
    }
    Ok(WriteLease { entry, permit })
}

pub(super) fn reserve_open(path: &Path) -> Result<WriteLease, Error> {
    let deadline = Instant::now()
        .checked_add(crate::SQLITE_BUSY_TIMEOUT)
        .ok_or_else(rejected)?;
    reserve(path_key(path)?, deadline, false)
}

#[cfg(target_os = "linux")]
pub(super) fn reserve_selected(device: u64, inode: u64) -> Result<WriteLease, Error> {
    reserve_selected_key(StoreKey { device, inode })
}

// Selected control must never sleep while holding its authority guard. This
// serializer-only reservation establishes no fresh custody or operation proof.
#[cfg(any(target_os = "linux", test))]
fn reserve_selected_key(key: StoreKey) -> Result<WriteLease, Error> {
    let registry = GATES.get_or_init(|| Mutex::new(HashMap::new()));
    try_selected_from_registry(registry, key)
}

#[cfg(any(target_os = "linux", test))]
fn try_selected_from_registry(
    registry: &Mutex<HashMap<StoreKey, Arc<Entry>>>,
    key: StoreKey,
) -> Result<WriteLease, Error> {
    let entry = {
        let mut entries = match registry.try_lock() {
            Ok(entries) => entries,
            Err(std::sync::TryLockError::Poisoned(_)) => return Err(rejected()),
            Err(std::sync::TryLockError::WouldBlock) => return Err(busy()),
        };
        register_entry(&mut entries, key)?
    };
    let permit = entry.gate.try_acquire().map_err(gate_error)?;
    Ok(WriteLease { entry, permit })
}

impl WriteLease {
    #[cfg(any(target_os = "linux", test))]
    pub(super) fn check_held(&self) -> Result<(), Error> {
        self.permit.check_held().map_err(gate_error)
    }

    pub(super) fn verify_connection(&self, connection: &Connection) -> Result<(), Error> {
        if connection_key(connection)? != self.entry.key {
            return Err(rejected());
        }
        Ok(())
    }

    #[cfg(target_os = "linux")]
    pub(super) fn seal_legacy(&self) {
        // Sticky process-local cutoff. The registry retains sealed entries,
        // including after rollback/ambiguity; it never re-enables old writers.
        self.entry.legacy_closed.store(true, Ordering::Release);
    }

    pub(super) fn quarantine(&mut self) {
        self.entry.legacy_closed.store(true, Ordering::Release);
        let _ = self.permit.quarantine();
    }
}

/// The transaction is dropped before its gate, including early error returns.
pub(super) struct WriteTransaction<'a> {
    transaction: Option<Transaction<'a>>,
    connection: &'a Connection,
    lease: WriteLease,
}

impl Drop for WriteTransaction<'_> {
    fn drop(&mut self) {
        // Rusqlite first attempts rollback. A still-active transaction is
        // uncertain, so the process-local store remains quarantined.
        drop(self.transaction.take());
        if !self.connection.is_autocommit() {
            self.lease.quarantine();
        }
    }
}

impl<'a> Deref for WriteTransaction<'a> {
    type Target = Transaction<'a>;
    fn deref(&self) -> &Self::Target {
        self.transaction.as_ref().expect("live private transaction")
    }
}

impl WriteTransaction<'_> {
    pub(super) fn commit(mut self) -> Result<(), Error> {
        self.transaction
            .take()
            .expect("live private transaction")
            .commit()
    }

    pub(super) fn rollback(mut self) -> Result<(), Error> {
        self.transaction
            .take()
            .expect("live private transaction")
            .rollback()
    }
}

pub(super) fn begin(connection: &Connection) -> Result<WriteTransaction<'_>, Error> {
    begin_with_budget(connection, crate::SQLITE_BUSY_TIMEOUT, 1)
}

pub(super) fn begin_phase7(connection: &Connection) -> Result<WriteTransaction<'_>, Error> {
    // Preserve the previous four five-second acquisition attempts as one
    // non-resetting budget, including the FIFO wait. Never retry a transaction.
    begin_with_budget(connection, PHASE7_ACQUISITION_BUDGET, 4)
}

fn begin_with_budget(
    connection: &Connection,
    budget: Duration,
    attempts: usize,
) -> Result<WriteTransaction<'_>, Error> {
    let deadline = Instant::now().checked_add(budget).ok_or_else(rejected)?;
    let mut lease = reserve(connection_key(connection)?, deadline, false)?;
    for attempt in 0..attempts {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(busy());
        }
        connection.busy_timeout(crate::SQLITE_BUSY_TIMEOUT.min(remaining))?;
        let result = Transaction::new_unchecked(connection, TransactionBehavior::Immediate);
        let restored = connection.busy_timeout(crate::SQLITE_BUSY_TIMEOUT);
        let result = finish_unwrapped_begin(connection, &mut lease, result, restored, deadline);
        match result {
            BeginExit::Open(transaction) => {
                return Ok(WriteTransaction {
                    transaction: Some(transaction),
                    connection,
                    lease,
                });
            }
            BeginExit::Retry(_error) if attempt + 1 < attempts => {
                std::thread::sleep(POLL.min(deadline.saturating_duration_since(Instant::now())));
            }
            BeginExit::Retry(error) | BeginExit::Deny(error) => return Err(error),
        }
    }
    Err(busy())
}

enum BeginExit<'a> {
    Open(Transaction<'a>),
    Retry(Error),
    Deny(Error),
}

fn finish_unwrapped_begin<'a>(
    connection: &'a Connection,
    lease: &mut WriteLease,
    result: Result<Transaction<'a>, Error>,
    restored: Result<(), Error>,
    deadline: Instant,
) -> BeginExit<'a> {
    let rejection = restored
        .err()
        .or_else(|| (Instant::now() >= deadline).then(busy));
    if let Some(error) = rejection {
        drop(result);
        if !connection.is_autocommit() {
            lease.quarantine();
        }
        return BeginExit::Deny(error);
    }
    match result {
        Ok(transaction) => BeginExit::Open(transaction),
        Err(error) => {
            if !connection.is_autocommit() {
                lease.quarantine();
                BeginExit::Deny(error)
            } else if matches!(&error, Error::SqliteFailure(failure, _) if matches!(
                failure.code, rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked
            )) {
                BeginExit::Retry(error)
            } else {
                BeginExit::Deny(error)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_DATABASE: AtomicU64 = AtomicU64::new(0);

    struct Database {
        directory: std::path::PathBuf,
        path: std::path::PathBuf,
    }

    impl Database {
        fn new() -> Self {
            let sequence = NEXT_DATABASE.fetch_add(1, Ordering::Relaxed);
            let directory = std::env::temp_dir().join(format!(
                "lnsat-write-sync-{}-{sequence}",
                std::process::id()
            ));
            fs::create_dir(&directory).expect("unique owned fixture directory");
            let path = directory.join("store.sqlite");
            Self { directory, path }
        }

        fn connection(&self) -> Connection {
            let connection = Connection::open(&self.path).unwrap();
            connection
                .pragma_update(None, "journal_mode", "WAL")
                .unwrap();
            connection
                .pragma_update(None, "foreign_keys", "ON")
                .unwrap();
            connection.busy_timeout(crate::SQLITE_BUSY_TIMEOUT).unwrap();
            connection
        }
    }

    impl Drop for Database {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.directory).expect("owned fixture cleanup");
        }
    }

    #[test]
    fn actual_connections_share_one_physical_store_gate() {
        let database = Database::new();
        let first = database.connection();
        let second = database.connection();
        assert!(connection_key(&first).unwrap() == connection_key(&second).unwrap());
        let held = begin(&first).unwrap();
        let result = begin_with_budget(&second, Duration::from_millis(30), 1);
        assert!(
            matches!(result, Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::DatabaseBusy))
        );
        drop(result);
        assert!(second.is_autocommit());
        held.rollback().unwrap();
        begin(&second).unwrap().commit().unwrap();
    }

    #[test]
    fn unrelated_physical_stores_do_not_share_writer_admission() {
        let first_database = Database::new();
        let second_database = Database::new();
        let first = first_database.connection();
        let second = second_database.connection();
        assert!(connection_key(&first).unwrap() != connection_key(&second).unwrap());
        let held = begin(&first).unwrap();
        begin_with_budget(&second, Duration::from_millis(50), 1)
            .unwrap()
            .commit()
            .unwrap();
        held.rollback().unwrap();
    }

    #[test]
    fn rollback_drop_releases_gate_after_sql_transaction_ends() {
        let database = Database::new();
        let first = database.connection();
        let second = database.connection();
        {
            let _transaction = begin(&first).unwrap();
            assert!(!first.is_autocommit());
        }
        assert!(first.is_autocommit());
        begin(&second).unwrap().commit().unwrap();
    }

    #[test]
    fn failed_commit_rolls_back_without_replaying_writes() {
        let database = Database::new();
        let connection = database.connection();
        connection
            .execute_batch(
                "CREATE TABLE parent (id INTEGER PRIMARY KEY);
             CREATE TABLE child (id INTEGER REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED);",
            )
            .unwrap();
        let transaction = begin(&connection).unwrap();
        transaction
            .execute("INSERT INTO child VALUES (7)", [])
            .unwrap();
        assert!(transaction.commit().is_err());
        assert!(connection.is_autocommit());
        assert_eq!(
            connection
                .query_row("SELECT count(*) FROM child", [], |row| row.get::<_, i64>(0))
                .unwrap(),
            0
        );
        begin(&connection).unwrap().rollback().unwrap();
    }

    #[test]
    fn unresolved_rollback_quarantines_even_after_later_sql_cleanup() {
        let database = Database::new();
        let connection = database.connection();
        let mut transaction = begin(&connection).unwrap();
        // Test-only intervention models failure to establish rollback completion.
        // Production exposes no mutable transaction or DropBehavior setter.
        transaction
            .transaction
            .as_mut()
            .unwrap()
            .set_drop_behavior(rusqlite::DropBehavior::Ignore);
        drop(transaction);
        assert!(!connection.is_autocommit());
        assert!(
            matches!(begin(&connection), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::ReadOnly))
        );
        connection.execute_batch("ROLLBACK").unwrap();
        assert!(connection.is_autocommit());
        assert!(
            matches!(begin(&connection), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::ReadOnly))
        );
    }

    #[test]
    fn unmediated_sql_busy_uses_remaining_acquisition_budget() {
        let database = Database::new();
        let mut external = database.connection();
        let connection = database.connection();
        let held = external
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .unwrap();
        let started = Instant::now();
        let result = begin_with_budget(&connection, Duration::from_millis(40), 4);
        assert!(
            matches!(result, Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::DatabaseBusy))
        );
        drop(result);
        assert!(started.elapsed() < Duration::from_secs(1));
        assert!(connection.is_autocommit());
        held.rollback().unwrap();
        begin(&connection).unwrap().commit().unwrap();
    }

    #[test]
    fn unwrapped_exit_quarantines_incomplete_rollback_for_both_rejection_paths() {
        for restoration_failed in [true, false] {
            let database = Database::new();
            let connection = database.connection();
            let deadline = Instant::now() + Duration::from_secs(1);
            let mut lease = reserve(connection_key(&connection).unwrap(), deadline, false).unwrap();
            let mut transaction =
                Transaction::new_unchecked(&connection, TransactionBehavior::Immediate).unwrap();
            transaction.set_drop_behavior(rusqlite::DropBehavior::Ignore);
            let restored = if restoration_failed {
                Err(Error::InvalidQuery)
            } else {
                Ok(())
            };
            let cutoff = if restoration_failed {
                deadline
            } else {
                Instant::now()
            };
            assert!(matches!(
                finish_unwrapped_begin(&connection, &mut lease, Ok(transaction), restored, cutoff),
                BeginExit::Deny(_)
            ));
            assert!(!connection.is_autocommit());
            drop(lease);
            connection.execute_batch("ROLLBACK").unwrap();
            assert!(
                matches!(begin(&connection), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::ReadOnly))
            );
        }
    }

    #[test]
    fn physical_identity_joins_hard_link_alias_without_claiming_alias_support() {
        let database = Database::new();
        let connection = database.connection();
        let alias = database.directory.join("alias.sqlite");
        fs::hard_link(&database.path, &alias).unwrap();
        let aliased =
            Connection::open_with_flags(&alias, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
                .unwrap();
        assert!(connection_key(&connection).unwrap() == connection_key(&aliased).unwrap());
        let held = begin(&connection).unwrap();
        assert!(
            matches!(begin_with_budget(&aliased, Duration::from_millis(20), 1), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::DatabaseBusy))
        );
        held.rollback().unwrap();
    }

    #[test]
    fn reserved_open_rejects_replaced_main_file_identity() {
        let database = Database::new();
        let original = database.connection();
        drop(original);
        let held = reserve_open(&database.path).unwrap();
        fs::rename(&database.path, database.directory.join("retained.sqlite")).unwrap();
        let replacement = database.connection();
        assert!(held.verify_connection(&replacement).is_err());
    }

    #[test]
    fn registry_prunes_inactive_but_retains_active_and_sealed_keys() {
        let mut entries = HashMap::new();
        for inode in 1..=MAX_GATES as u64 {
            drop(register_entry(&mut entries, StoreKey { device: 1, inode }).unwrap());
        }
        let held = Arc::clone(
            entries
                .get(&StoreKey {
                    device: 1,
                    inode: 1,
                })
                .unwrap(),
        );
        entries
            .get(&StoreKey {
                device: 1,
                inode: 2,
            })
            .unwrap()
            .legacy_closed
            .store(true, Ordering::Release);
        drop(
            register_entry(
                &mut entries,
                StoreKey {
                    device: 1,
                    inode: MAX_GATES as u64 + 1,
                },
            )
            .unwrap(),
        );
        assert_eq!(entries.len(), 3);
        assert!(entries.contains_key(&held.key));
        assert!(entries.contains_key(&StoreKey {
            device: 1,
            inode: 2
        }));
        let mut sealed = HashMap::new();
        for inode in 1..=MAX_GATES as u64 {
            register_entry(&mut sealed, StoreKey { device: 2, inode })
                .unwrap()
                .legacy_closed
                .store(true, Ordering::Release);
        }
        assert!(
            register_entry(
                &mut sealed,
                StoreKey {
                    device: 2,
                    inode: MAX_GATES as u64 + 1
                }
            )
            .is_err()
        );
        assert_eq!(sealed.len(), MAX_GATES);
    }

    #[test]
    fn queued_legacy_writer_cannot_cross_selected_seal() {
        let database = Database::new();
        let first = database.connection();
        let second = database.connection();
        let deadline = Instant::now() + Duration::from_secs(2);
        let held = reserve(connection_key(&first).unwrap(), deadline, true).unwrap();
        let waiter = std::thread::spawn(move || {
            let denied = match begin_with_budget(&second, Duration::from_secs(1), 1) {
                Ok(transaction) => {
                    transaction.rollback().unwrap();
                    false
                }
                Err(error) => error.sqlite_error_code() == Some(rusqlite::ErrorCode::ReadOnly),
            };
            (denied, second.is_autocommit())
        });
        while Arc::strong_count(&held.entry) < 3 {
            assert!(Instant::now() < deadline);
            std::thread::sleep(Duration::from_millis(1));
        }
        held.entry.legacy_closed.store(true, Ordering::Release);
        drop(held);
        assert_eq!(waiter.join().unwrap(), (true, true));
    }

    #[test]
    fn selected_reservation_is_nonwaiting_and_rejects_quarantined_reentry() {
        let database = Database::new();
        let connection = database.connection();
        let key = connection_key(&connection).unwrap();
        let mut selected = reserve_selected_key(key).unwrap();
        selected.check_held().unwrap();
        let start = Instant::now();
        let denied = reserve_selected_key(key);
        assert!(
            matches!(denied, Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::DatabaseBusy))
        );
        assert!(start.elapsed() < Duration::from_secs(1));
        selected.quarantine();
        assert!(selected.check_held().is_err());
        drop(selected);
        assert!(reserve_selected_key(key).is_err());
        assert!(
            matches!(begin(&connection), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::ReadOnly))
        );
    }

    #[test]
    fn held_registry_mutex_denies_without_registering_or_waiting() {
        let registry = Mutex::new(HashMap::new());
        let key = StoreKey {
            device: 7,
            inode: 8,
        };
        let held = registry.lock().unwrap();
        let start = Instant::now();
        assert!(
            matches!(try_selected_from_registry(&registry, key), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::DatabaseBusy))
        );
        assert!(start.elapsed() < Duration::from_secs(1));
        assert!(held.is_empty());
        drop(held);
        let permit = try_selected_from_registry(&registry, key).unwrap();
        permit.check_held().unwrap();
        assert_eq!(registry.lock().unwrap().len(), 1);
    }

    #[test]
    fn poisoned_registry_denies_without_recovery() {
        let registry = Mutex::new(HashMap::new());
        let result = std::panic::catch_unwind(|| {
            let _held = registry.lock().unwrap();
            panic!("isolated registry poison fixture");
        });
        assert!(result.is_err());
        let key = StoreKey {
            device: 9,
            inode: 10,
        };
        assert!(
            matches!(try_selected_from_registry(&registry, key), Err(ref error) if error.sqlite_error_code() == Some(rusqlite::ErrorCode::AuthorizationForStatementDenied))
        );
        assert!(registry.is_poisoned());
    }
}
