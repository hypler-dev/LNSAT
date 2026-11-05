//! Private Linux writable session. No raw SQL, connection, caller closure or
//! serializable permit escapes. This session alone cannot initialize authority.

use super::{
    Connection, OpenFlags, SelectedLocalStoreErrorV1 as Error, SelectedStoreCustodyV1,
    configure_native_boundary, linux::LinuxCustody,
};
use std::{
    path::Path,
    sync::{Mutex, MutexGuard, TryLockError},
};

// Coarse process-wide serialization before an installation exists. This is
// deliberately stronger than a filename-keyed map and uses bounded try-lock.
static INSTALLATION_MUTEX: Mutex<()> = Mutex::new(());

type Sidecars = [Option<super::FileIdentity>; 2];

pub(crate) struct SelectedWritableStore {
    connection: Option<Connection>,
    custody: Option<SelectedStoreCustodyV1>,
    linux: Option<LinuxCustody>,
    mutex: Option<MutexGuard<'static, ()>>,
    sidecars: Sidecars,
}

fn denied<T>(_: T) -> Error {
    Error::StoreUnverifiable
}

impl SelectedWritableStore {
    pub(crate) fn open(path: &Path) -> Result<Self, Error> {
        // Lease is acquired before SQLite can create a coordination file.
        let custody = SelectedStoreCustodyV1::acquire(path)?;
        let mutex = INSTALLATION_MUTEX.try_lock().map_err(|error| match error {
            TryLockError::WouldBlock => Error::DatabaseBusy,
            TryLockError::Poisoned(_) => Error::StoreUnverifiable,
        })?;
        let linux = LinuxCustody::acquire(&custody)?;
        let before = linux.sidecars(&custody)?;
        let connection =
            Connection::open_with_flags_and_vfs(path, OpenFlags::SQLITE_OPEN_READ_WRITE, "unix")
                .map_err(denied)?;
        // Install ownership immediately, so every subsequent error closes the
        // connection under the same retained lease, ancestry and process lock.
        let mut session = Self {
            connection: Some(connection),
            custody: Some(custody),
            linux: Some(linux),
            mutex: Some(mutex),
            sidecars: before,
        };
        session.configure()?;
        session.verify(false)?;
        let after = session.current_sidecars()?;
        if !preserved(&session.sidecars, &after, false) {
            return Err(Error::CustodyChanged);
        }
        session.sidecars = after;
        Ok(session)
    }

    fn connection(&self) -> Result<&Connection, Error> {
        self.connection.as_ref().ok_or(Error::StoreUnverifiable)
    }

    fn configure(&self) -> Result<(), Error> {
        let connection = self.connection()?;
        configure_native_boundary(connection)?;
        for (name, value, expected) in [
            ("foreign_keys", "ON", 1),
            ("recursive_triggers", "ON", 1),
            ("synchronous", "FULL", 2),
            ("trusted_schema", "OFF", 0),
            ("query_only", "ON", 1),
        ] {
            connection
                .pragma_update(None, name, value)
                .map_err(denied)?;
            if crate::pragma_i64(connection, name).map_err(denied)? != expected {
                return Err(Error::StoreUnverifiable);
            }
        }
        if connection.is_readonly(rusqlite::MAIN_DB).map_err(denied)?
            || connection
                .query_row("PRAGMA main.journal_mode", [], |row| {
                    row.get::<_, String>(0)
                })
                .map_err(denied)?
                != "wal"
        {
            return Err(Error::StoreUnverifiable);
        }
        Ok(())
    }

    fn current_sidecars(&self) -> Result<Sidecars, Error> {
        self.linux
            .as_ref()
            .ok_or(Error::StoreUnverifiable)?
            .sidecars(self.custody.as_ref().ok_or(Error::StoreUnverifiable)?)
    }

    fn verify(&self, transaction: bool) -> Result<(), Error> {
        let custody = self.custody.as_ref().ok_or(Error::StoreUnverifiable)?;
        let linux = self.linux.as_ref().ok_or(Error::StoreUnverifiable)?;
        linux.verify(custody)?;
        custody.verify_connection(self.connection()?)?;
        let current = self.current_sidecars()?;
        if !preserved(&self.sidecars, &current, false) {
            return Err(Error::CustodyChanged);
        }
        if transaction {
            custody.verify_writable_sidecars(self.connection()?)?;
        }
        Ok(())
    }

    pub(crate) fn migrate_to_inert(mut self) -> Result<Self, Error> {
        self.verify(false)?;
        let connection = self.connection.as_mut().ok_or(Error::StoreUnverifiable)?;
        let custody = self.custody.as_ref().ok_or(Error::StoreUnverifiable)?;
        let linux = self.linux.as_ref().ok_or(Error::StoreUnverifiable)?;
        connection
            .pragma_update(None, "query_only", "OFF")
            .map_err(denied)?;
        let tx = connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(denied)?;
        linux.verify(custody)?;
        custody.verify_writable_sidecars(&tx)?;
        let live = linux.sidecars(custody)?;
        if !preserved(&self.sidecars, &live, false) {
            return Err(Error::CustodyChanged);
        }
        self.sidecars = live;
        crate::selected_schema::migrate(&tx)?;
        linux.verify(custody)?;
        custody.verify_writable_sidecars(&tx)?;
        if linux.sidecars(custody)? != self.sidecars {
            return Err(Error::CustodyChanged);
        }
        // No retry on commit error. The consuming session closes under custody;
        // the inert state can only be classified by a separate explicit read.
        tx.commit().map_err(denied)?;
        connection
            .pragma_update(None, "query_only", "ON")
            .map_err(denied)?;
        if crate::pragma_i64(connection, "query_only").map_err(denied)? != 1 {
            return Err(Error::StoreUnverifiable);
        }
        self.verify(false)?;
        crate::selected_schema::verify(self.connection()?)?;
        crate::selected_schema::require_empty(self.connection()?)?;
        Ok(self)
    }

    pub(crate) fn close(mut self) -> Result<(), Error> {
        self.close_inner()
    }

    fn close_inner(&mut self) -> Result<(), Error> {
        let Some(connection) = self.connection.take() else {
            return Ok(());
        };
        let before = self.current_sidecars();
        let prior_valid = match &before {
            Ok(names) => preserved(&self.sidecars, names, false),
            Err(_) => false,
        };
        if !prior_valid {
            // SQLite close may unlink coordination names. After custody drift,
            // those names may belong to somebody else, so do not call close.
            self.quarantine(connection);
            return Err(Error::CustodyChanged);
        }
        match connection.close() {
            Ok(()) => {
                // The last VFS connection may delete its own WAL/SHM. An
                // unexplained replacement or newly created file still denies.
                let after = self.current_sidecars();
                if prior_valid
                    && matches!((&before, &after), (Ok(a), Ok(b)) if preserved(a, b, true))
                {
                    Ok(())
                } else {
                    Err(Error::CustodyChanged)
                }
            }
            Err((connection, _error)) => {
                // Retain all custody rather than releasing a lease around an
                // unclosed connection. The held global mutex quarantines this
                // setup process. No reusable handle or successful result exits.
                self.quarantine(connection);
                Err(Error::StoreUnverifiable)
            }
        }
    }
    fn quarantine(&mut self, connection: Connection) {
        std::mem::forget((
            connection,
            self.custody.take(),
            self.linux.take(),
            self.mutex.take(),
        ));
    }

    #[cfg(test)]
    pub(crate) fn leave_busy_statement_for_close_test(&self) {
        let statement = self.connection().unwrap().prepare("SELECT 1").unwrap();
        std::mem::forget(statement);
    }
}

fn preserved(before: &Sidecars, after: &Sidecars, retirement: bool) -> bool {
    before.iter().zip(after).all(|(old, new)| match (old, new) {
        (Some(a), Some(b)) => a == b,
        (Some(_), None) => retirement,
        (None, Some(_)) => !retirement,
        (None, None) => true,
    })
}

impl Drop for SelectedWritableStore {
    fn drop(&mut self) {
        let _ = self.close_inner();
    }
}
