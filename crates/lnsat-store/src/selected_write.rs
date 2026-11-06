//! Private Linux writable session. No raw SQL, connection, caller closure or
//! serializable permit escapes. This session alone cannot initialize authority.

use super::{
    Connection, OpenFlags, SelectedLocalStoreErrorV1 as Error, SelectedStoreCustodyV1,
    configure_native_boundary, linux::LinuxCustody,
};
use std::path::Path;

type Sidecars = [Option<super::FileIdentity>; 2];

pub(crate) struct SelectedWritableStore {
    connection: Option<Connection>,
    custody: Option<SelectedStoreCustodyV1>,
    linux: Option<LinuxCustody>,
    mutex: Option<crate::write_sync::WriteLease>,
    sidecars: Sidecars,
    journal: Option<crate::headless_preparation::custody::OwnedJournalState>,
    poisoned: bool,
    #[cfg(test)]
    post_close_intervention: Option<Box<dyn FnOnce()>>,
}

fn denied<T>(_: T) -> Error {
    Error::StoreUnverifiable
}

impl SelectedWritableStore {
    pub(crate) fn open(path: &Path) -> Result<Self, Error> {
        // Lease is acquired before SQLite can create a coordination file.
        let custody = SelectedStoreCustodyV1::acquire(path)?;
        let mutex = crate::write_sync::reserve_selected(
            custody.database_identity.device,
            custody.database_identity.inode,
        )
        .map_err(|error| {
            if error.sqlite_error_code() == Some(rusqlite::ErrorCode::DatabaseBusy) {
                Error::DatabaseBusy
            } else {
                Error::StoreUnverifiable
            }
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
            journal: None,
            poisoned: false,
            #[cfg(test)]
            post_close_intervention: None,
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
        if self.poisoned {
            return Err(Error::StoreUnverifiable);
        }
        let lease = self.mutex.as_ref().ok_or(Error::StoreUnverifiable)?;
        lease.check_held().map_err(denied)?;
        verify_parts(
            self.custody.as_ref().ok_or(Error::StoreUnverifiable)?,
            self.linux.as_ref().ok_or(Error::StoreUnverifiable)?,
            self.connection()?,
            &self.sidecars,
            transaction,
        )?;
        lease.check_held().map_err(denied)
    }

    fn check_live(&mut self, transaction: bool) -> Result<(), Error> {
        let result = self.verify(transaction);
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }

    /// Opens inert journal storage only after exact migration and empty-state
    /// verification. Its syntax assertions never become preparation proof.
    pub(crate) fn open_preparation_journal(&mut self) -> Result<(), Error> {
        self.check_live(false)?;
        let result = (|| {
            if self.journal.is_some() {
                return Err(Error::StoreUnverifiable);
            }
            crate::selected_schema::verify(self.connection()?)?;
            crate::selected_schema::require_empty(self.connection()?)?;
            let parent = super::SelectedPreparationParent::from_writable(
                self.custody.as_ref().ok_or(Error::StoreUnverifiable)?,
                self.linux.as_ref().ok_or(Error::StoreUnverifiable)?,
                self.connection()?,
                &self.sidecars,
            )?;
            crate::headless_preparation::custody::OwnedJournalState::open(&parent)
                .map_err(|_| Error::CustodyChanged)
        })();
        match result {
            Ok(journal) => {
                self.journal = Some(journal);
                Ok(())
            }
            Err(error) => {
                self.poisoned = true;
                Err(error)
            }
        }
    }

    pub(crate) fn inspect_preparation_journal(
        &mut self,
    ) -> Result<crate::headless_preparation::custody::RootSnapshot, Error> {
        self.check_live(false)?;
        let result = (|| {
            let parent = super::SelectedPreparationParent::from_writable(
                self.custody.as_ref().ok_or(Error::StoreUnverifiable)?,
                self.linux.as_ref().ok_or(Error::StoreUnverifiable)?,
                self.connection.as_ref().ok_or(Error::StoreUnverifiable)?,
                &self.sidecars,
            )?;
            self.journal
                .as_mut()
                .ok_or(Error::StoreUnverifiable)?
                .inspect(&parent)
                .map_err(|_| Error::CustodyChanged)
        })();
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }

    pub(crate) fn persist_preparation_assertion(&mut self, frame: &[u8]) -> Result<(), Error> {
        self.check_live(false)?;
        let result = (|| {
            let parent = super::SelectedPreparationParent::from_writable(
                self.custody.as_ref().ok_or(Error::StoreUnverifiable)?,
                self.linux.as_ref().ok_or(Error::StoreUnverifiable)?,
                self.connection.as_ref().ok_or(Error::StoreUnverifiable)?,
                &self.sidecars,
            )?;
            self.journal
                .as_mut()
                .ok_or(Error::StoreUnverifiable)?
                .append(&parent, frame)
                .map_err(|_| Error::CustodyChanged)
        })();
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }

    pub(crate) fn migrate_to_inert(mut self) -> Result<Self, Error> {
        self.verify(false)?;
        self.mutex
            .as_ref()
            .ok_or(Error::StoreUnverifiable)?
            .seal_legacy();
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
        if self.connection.is_none() {
            return Ok(());
        }
        // A poisoned or drifted journal is retained with the same physical
        // store owners. Closing SQL must not silently discard that custody.
        let journal_valid = !self.poisoned
            && (self.journal.is_none() || self.inspect_preparation_journal().is_ok());
        let connection = self.connection.take().ok_or(Error::StoreUnverifiable)?;
        let before = self.current_sidecars();
        let prior_valid = journal_valid
            && match &before {
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
                #[cfg(test)]
                if let Some(intervene) = self.post_close_intervention.take() {
                    intervene();
                }
                // Retirement requires both coordination names absent. Once
                // the original VFS descriptors close, matching device/inode
                // alone cannot rule out a deleted-and-recreated object.
                let after = self.current_sidecars();
                if prior_valid
                    && matches!((&before, &after), (Ok(a), Ok(b)) if preserved(a, b, true) && super::retired_sidecars(b))
                {
                    // Retire the journal descriptor before custody/lease and
                    // writer admission can be released by this session's drop.
                    if self
                        .journal
                        .take()
                        .is_some_and(|journal| journal.close().is_err())
                    {
                        self.quarantine_resources();
                        return Err(Error::CustodyChanged);
                    }
                    Ok(())
                } else {
                    self.quarantine_resources();
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
        std::mem::forget(connection);
        self.quarantine_resources();
    }

    fn quarantine_resources(&mut self) {
        self.poisoned = true;
        if let Some(permit) = self.mutex.as_mut() {
            permit.quarantine();
        }
        std::mem::forget((
            self.custody.take(),
            self.linux.take(),
            self.mutex.take(),
            self.journal.take(),
        ));
    }

    #[cfg(test)]
    pub(crate) fn inject_uncertain_journal_close_for_test(
        &mut self,
    ) -> std::sync::Arc<std::sync::atomic::AtomicUsize> {
        self.journal
            .as_mut()
            .unwrap()
            .inject_uncertain_close_for_test()
    }

    #[cfg(test)]
    pub(crate) fn after_close_for_test(&mut self, intervene: impl FnOnce() + 'static) {
        self.post_close_intervention = Some(Box::new(intervene));
    }

    #[cfg(test)]
    pub(crate) fn leave_busy_statement_for_close_test(&self) {
        let statement = self.connection().unwrap().prepare("SELECT 1").unwrap();
        std::mem::forget(statement);
    }
}

pub(super) fn verify_parts(
    custody: &SelectedStoreCustodyV1,
    linux: &LinuxCustody,
    connection: &Connection,
    sidecars: &[Option<super::FileIdentity>; 2],
    transaction: bool,
) -> Result<(), Error> {
    linux.verify(custody)?;
    custody.verify_connection(connection)?;
    if !preserved(sidecars, &linux.sidecars(custody)?, false) {
        return Err(Error::CustodyChanged);
    }
    if transaction {
        custody.verify_writable_sidecars(connection)?;
    }
    Ok(())
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
