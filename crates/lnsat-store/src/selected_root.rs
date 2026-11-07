//! Root-retained selected storage. This is not installation or execution authority.
//!
//! The complete production cleanup-plan producer is deliberately absent. Private
//! acquisition code cannot be reached by a product caller until that producer,
//! genuine preparation and the remaining checked lifecycles are integrated.

use crate::{
    headless_control_budget::{ArtifactBudgetState, ArtifactReadBudget},
    headless_operation_identity::{OperationIdentity, OperationIdentityAllocator},
    owner_decision_credential::OwnerDecisionCredentialScopeV1,
};
use std::{
    marker::PhantomData,
    panic::{AssertUnwindSafe, catch_unwind},
    rc::Rc,
    sync::{
        Arc, Mutex, MutexGuard, OnceLock, TryLockError,
        atomic::{AtomicBool, AtomicU8, AtomicU32, Ordering},
    },
    thread::{self, JoinHandle, ThreadId},
    time::Duration,
};

#[path = "selected_root_storage.rs"]
mod storage;

#[path = "selected_root_journal_schedule.rs"]
mod journal_schedule;

const VACANT: u8 = 0;
const RESERVED: u8 = 1;
const PUBLISHED: u8 = 2;
const STORAGE_HELD: u8 = 3;
const QUARANTINED: u8 = 4;
// Filesystem-subset terminal only; not Ready or initialization evidence.
const STORAGE_RETIRED: u8 = 5;
const OBSERVATION_LIMIT: u32 = 65_536;
const CLEANUP_LIMIT: u32 = 256;
const SQL_CLEANUP_BASE: u32 = 133;
const JOURNAL_FILE_ROLE_COUNT: usize = 6;

static ROOT: OnceLock<ControlRoot> = OnceLock::new();

fn anchored_root() -> &'static ControlRoot {
    ROOT.get_or_init(ControlRoot::inert)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RootError {
    Rejected,
    Busy,
    Budget,
    Capacity,
    Custody,
    Uncertain,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum JournalFileRole {
    Root,
    Preparation,
    Revision0,
    Revision1,
    Revision2,
    Revision3,
}

impl JournalFileRole {
    const ALL: [Self; JOURNAL_FILE_ROLE_COUNT] = [
        Self::Root,
        Self::Preparation,
        Self::Revision0,
        Self::Revision1,
        Self::Revision2,
        Self::Revision3,
    ];

    const fn index(self) -> usize {
        match self {
            Self::Root => 0,
            Self::Preparation => 1,
            Self::Revision0 => 2,
            Self::Revision1 => 3,
            Self::Revision2 => 4,
            Self::Revision3 => 5,
        }
    }
}

struct JournalCleanupPlan {
    cleanup_ids: [u32; JOURNAL_FILE_ROLE_COUNT],
}

impl JournalCleanupPlan {
    fn cleanup_id(&self, role: JournalFileRole) -> u32 {
        self.cleanup_ids[role.index()]
    }

    fn matches_selected_file_obligations(&self, selected: u32) -> bool {
        JournalFileRole::ALL.into_iter().all(|role| {
            selected
                .checked_add(u32::try_from(role.index()).expect("fixed role index fits u32"))
                .is_some_and(|expected| self.cleanup_id(role) == expected)
        })
    }
}

/// Capacity is not authority. No production constructor exists until every
/// native, SQL, journal, root and terminal obligation has a closed inventory.
struct FullCleanupPlan {
    selected_ancestors: usize,
    selected_file_obligations: u32,
    journal: Option<JournalCleanupPlan>,
    other_obligations: u32,
    total: u32,
}

impl FullCleanupPlan {
    fn matches_selection(&self, selection: &storage::Selection) -> bool {
        let Some(selected) = u32::try_from(selection.ancestor_count())
            .ok()
            .and_then(|count| count.checked_add(4))
        else {
            return false;
        };
        let journal_obligations = match self.journal.as_ref() {
            Some(journal) if journal.matches_selected_file_obligations(selected) => 6,
            Some(_) => return false,
            None => 0,
        };
        // Parent, lease and two independently retired procfs observations.
        self.selected_ancestors == selection.ancestor_count()
            && self.selected_file_obligations == selected
            && SQL_CLEANUP_BASE
                .checked_add(selected)
                .and_then(|count| count.checked_add(journal_obligations))
                .and_then(|count| count.checked_add(self.other_obligations))
                == Some(self.total)
            && self.total <= CLEANUP_LIMIT
    }
}

struct Operation {
    original: ArtifactReadBudget,
    identity: OperationIdentity,
    plan: FullCleanupPlan,
    observations: AtomicU32,
    cleanup_issued: AtomicU32,
    journal_issued: AtomicU8,
    journal_checkpoint: AtomicU8,
    work_closed: AtomicBool,
}

impl Operation {
    fn observe(&self) -> Result<(), RootError> {
        self.returned()?;
        if self
            .observations
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |used| {
                used.checked_add(1)
                    .filter(|next| *next <= OBSERVATION_LIMIT)
            })
            .is_err()
        {
            self.original.shared_state().invalidate();
            return Err(RootError::Budget);
        }
        self.returned()
    }

    fn returned(&self) -> Result<(), RootError> {
        if self.work_closed.load(Ordering::SeqCst) {
            return Err(RootError::Rejected);
        }
        self.original
            .shared_state()
            .valid()
            .map_err(|_| RootError::Budget)
    }

    // Called only after the last proc close and its successful budget postcheck.
    // Closing work is not a physical cleanup, commit or Ready-state witness.
    fn finish_work(&self) -> Result<(), RootError> {
        self.returned()?;
        if self.work_closed.swap(true, Ordering::SeqCst) {
            return Err(RootError::Rejected);
        }
        // The same shared allocation also gates the native lane; a separate
        // wrapper cannot use a still-live budget after filesystem retirement.
        self.original.shared_state().invalidate();
        Ok(())
    }

    fn reserve_file(&self) -> Result<u32, RootError> {
        self.returned()?;
        let slot = self
            .cleanup_issued
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |used| {
                used.checked_add(1)
                    .filter(|next| *next <= self.plan.selected_file_obligations)
            })
            .map_err(|_| {
                self.original.shared_state().invalidate();
                RootError::Capacity
            })?;
        self.returned()?;
        Ok(slot)
    }

    fn reserve_journal_file(&self, role: JournalFileRole) -> Result<u32, RootError> {
        self.returned()?;
        let Some(journal) = self.plan.journal.as_ref().filter(|plan| {
            plan.matches_selected_file_obligations(self.plan.selected_file_obligations)
        }) else {
            self.original.shared_state().invalidate();
            return Err(RootError::Rejected);
        };
        let bit = 1_u8 << role.index();
        if self
            .journal_issued
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |issued| {
                if issued & bit == 0 {
                    Some(issued | bit)
                } else {
                    None
                }
            })
            .is_err()
        {
            self.original.shared_state().invalidate();
            return Err(RootError::Rejected);
        }
        self.returned()?;
        Ok(journal.cleanup_id(role))
    }
}

struct Authority {
    identities: OperationIdentityAllocator,
    // Created inert, before custody I/O. It is never a verified credential.
    original_scope: OwnerDecisionCredentialScopeV1,
    operation: Option<Operation>,
    selection: Option<storage::Selection>,
    owners: storage::Owners,
    journal_input: Option<storage::pending_journal::PendingJournalInput>,
}

struct ControlRoot {
    authority: Mutex<Authority>,
    context: Mutex<Option<JoinHandle<()>>>,
    original_state: OnceLock<Arc<ArtifactBudgetState>>,
    context_id: OnceLock<ThreadId>,
    started: AtomicBool,
    closed: AtomicBool,
    phase: AtomicU8,
    #[cfg(test)]
    fault: AtomicU8,
    #[cfg(test)]
    terminal_owners: AtomicU32,
    #[cfg(test)]
    terminal_parent_consumed_unknown: AtomicBool,
    #[cfg(test)]
    terminal_proc_consumed_unknown: AtomicBool,
    #[cfg(test)]
    owning_error_postchecks: AtomicU32,
    #[cfg(all(test, target_os = "linux"))]
    boundary_rejected_without_native: AtomicBool,
}

impl ControlRoot {
    fn inert() -> Self {
        Self {
            authority: Mutex::new(Authority {
                identities: OperationIdentityAllocator::new(),
                original_scope: OwnerDecisionCredentialScopeV1::new(),
                operation: None,
                selection: None,
                owners: storage::Owners::empty(),
                journal_input: None,
            }),
            context: Mutex::new(None),
            original_state: OnceLock::new(),
            context_id: OnceLock::new(),
            started: AtomicBool::new(false),
            closed: AtomicBool::new(false),
            phase: AtomicU8::new(VACANT),
            #[cfg(test)]
            fault: AtomicU8::new(0),
            #[cfg(test)]
            terminal_owners: AtomicU32::new(0),
            #[cfg(test)]
            terminal_parent_consumed_unknown: AtomicBool::new(false),
            #[cfg(test)]
            terminal_proc_consumed_unknown: AtomicBool::new(false),
            #[cfg(test)]
            owning_error_postchecks: AtomicU32::new(0),
            #[cfg(all(test, target_os = "linux"))]
            boundary_rejected_without_native: AtomicBool::new(false),
        }
    }

    fn close_admission(&self) {
        self.closed.store(true, Ordering::SeqCst);
        if let Some(original) = self.original_state.get() {
            original.invalidate();
        }
        self.phase.store(QUARANTINED, Ordering::SeqCst);
    }

    /// Publication means only that the one retained context may start. It does
    /// not report custody, preparation, cleanup or initialization success.
    fn publish(
        &'static self,
        selection: storage::Selection,
        original: ArtifactReadBudget,
        plan: FullCleanupPlan,
    ) -> Result<(), RootError> {
        self.publish_inner(selection, original, plan, None)
    }

    fn publish_pending(
        &'static self,
        selection: storage::Selection,
        original: ArtifactReadBudget,
        plan: FullCleanupPlan,
        input: storage::pending_journal::PendingJournalInput,
    ) -> Result<(), RootError> {
        if plan.journal.is_none() || !input.matches_selection(&selection) {
            self.close_admission();
            original.shared_state().invalidate();
            return Err(RootError::Rejected);
        }
        self.publish_inner(selection, original, plan, Some(input))
    }

    fn publish_inner(
        &'static self,
        selection: storage::Selection,
        original: ArtifactReadBudget,
        plan: FullCleanupPlan,
        journal_input: Option<storage::pending_journal::PendingJournalInput>,
    ) -> Result<(), RootError> {
        if !ROOT.get().is_some_and(|root| std::ptr::eq(root, self)) {
            self.close_admission();
            original.shared_state().invalidate();
            return Err(RootError::Rejected);
        }
        if !plan.matches_selection(&selection) {
            self.close_admission();
            original.shared_state().invalidate();
            return Err(RootError::Capacity);
        }
        if self.closed.load(Ordering::SeqCst)
            || self
                .phase
                .compare_exchange(VACANT, RESERVED, Ordering::SeqCst, Ordering::SeqCst)
                .is_err()
        {
            original.shared_state().invalidate();
            return Err(RootError::Rejected);
        }
        // Context construction is coordinated outside the authority guard.
        let mut context = self.context.try_lock().map_err(|_| {
            self.close_admission();
            original.shared_state().invalidate();
            RootError::Busy
        })?;
        if context.is_some() {
            self.close_admission();
            original.shared_state().invalidate();
            return Err(RootError::Rejected);
        }
        {
            let mut held = self.authority.try_lock().map_err(|_| {
                self.close_admission();
                original.shared_state().invalidate();
                RootError::Busy
            })?;
            if held.operation.is_some() || held.selection.is_some() {
                self.close_admission();
                original.shared_state().invalidate();
                return Err(RootError::Rejected);
            }
            let identity = held.identities.issue().map_err(|_| {
                self.close_admission();
                original.shared_state().invalidate();
                RootError::Rejected
            })?;
            let state = Arc::clone(original.shared_state());
            held.operation = Some(Operation {
                original,
                identity,
                plan,
                observations: AtomicU32::new(0),
                cleanup_issued: AtomicU32::new(0),
                journal_issued: AtomicU8::new(0),
                journal_checkpoint: AtomicU8::new(0),
                work_closed: AtomicBool::new(false),
            });
            held.selection = Some(selection);
            // Owned syntax/context only, fixed before the first custody call.
            // It is not genuine preparation or an initialization capability.
            held.journal_input = journal_input;
            if self.original_state.set(state).is_err() {
                if let Some(operation) = held.operation.as_ref() {
                    operation.original.shared_state().invalidate();
                }
                self.close_admission();
                return Err(RootError::Rejected);
            }
        }
        let spawned = thread::Builder::new()
            .name("lnsat-selected-control".into())
            .stack_size(2 * 1024 * 1024)
            .spawn(move || self.run());
        if let Ok(handle) = spawned {
            *context = Some(handle);
        } else {
            self.close_admission();
            return Err(RootError::Uncertain);
        }
        // Store the actual returned JoinHandle before any further fallible
        // construction and before opening the start barrier.
        let Some(handle) = context.as_ref() else {
            self.close_admission();
            return Err(RootError::Uncertain);
        };
        if self.context_id.set(handle.thread().id()).is_err() {
            self.close_admission();
            handle.thread().unpark();
            return Err(RootError::Rejected);
        }
        self.phase.store(PUBLISHED, Ordering::SeqCst);
        self.started.store(true, Ordering::SeqCst);
        if let Some(handle) = context.as_ref() {
            handle.thread().unpark();
        }
        Ok(())
    }

    fn can_finish_storage(&self, held: &Authority) -> bool {
        let (Some(operation), Some(selection)) = (held.operation.as_ref(), held.selection.as_ref())
        else {
            return false;
        };
        ROOT.get().is_some_and(|root| std::ptr::eq(root, self))
            && self.context_id.get() == Some(&thread::current().id())
            && !self.closed.load(Ordering::SeqCst)
            && self.phase.load(Ordering::SeqCst) == PUBLISHED
            && self
                .original_state
                .get()
                .is_some_and(|original| operation.original.owns(original))
            && operation.work_closed.load(Ordering::SeqCst)
            && operation.journal_checkpoint.load(Ordering::SeqCst) == 81
            && operation.plan.matches_selection(selection)
            && held.owners.filesystem_retired(operation, selection)
    }

    fn quarantine_storage(
        &self,
        mut held: MutexGuard<'static, Authority>,
        payload: Option<Box<dyn std::any::Any + Send>>,
    ) -> ! {
        self.close_admission();
        held.owners.mark_issued_uncertain();
        #[cfg(test)]
        {
            self.terminal_parent_consumed_unknown
                .store(held.owners.parent_consumed_unknown(), Ordering::SeqCst);
            self.terminal_proc_consumed_unknown
                .store(held.owners.proc_consumed_unknown(), Ordering::SeqCst);
            self.terminal_owners
                .store(held.owners.held_count(), Ordering::SeqCst);
        }
        // Same call stack, original actual guard and caught payload. This helper
        // introduces no worker, callback, recovery or release of custody.
        retain(held, payload)
    }

    fn run(&'static self) {
        let mut exit = ContextExit {
            root: self,
            finished: false,
        };
        while !self.started.load(Ordering::SeqCst) {
            if self.closed.load(Ordering::SeqCst) {
                return;
            }
            thread::park();
        }
        if self.context_id.get() != Some(&thread::current().id()) {
            self.close_admission();
            return;
        }
        if self.closed.load(Ordering::SeqCst) {
            return;
        }
        #[cfg(test)]
        let forced_poison = if self.fault.load(Ordering::SeqCst) == 4 {
            catch_unwind(AssertUnwindSafe(|| {
                let _held = self.authority.lock().expect("controlled inert root lock");
                panic!("controlled selected-root poison");
            }))
            .err()
        } else {
            None
        };
        #[cfg(not(test))]
        let forced_poison = None;
        let mut held = match self.authority.try_lock() {
            Ok(held) => held,
            Err(TryLockError::Poisoned(poisoned)) => {
                let held = poisoned.into_inner();
                self.close_admission();
                retain(held, forced_poison);
            }
            Err(TryLockError::WouldBlock) => {
                self.close_admission();
                return;
            }
        };
        if self.closed.load(Ordering::SeqCst) {
            self.close_admission();
            retain(held, None);
        }
        let result = catch_unwind(AssertUnwindSafe(|| {
            let mut frame = StorageFrame::project(self, &mut held)?;
            frame.acquire_and_prepare_pending()
        }));
        // The final close seals further work. Check its exact known terminal
        // state before the generic invalid-budget failure path. No native call
        // or observation can follow this pure terminal publication.
        if matches!(&result, Ok(Ok(())))
            && self.can_finish_storage(&held)
            && self
                .phase
                .compare_exchange(
                    PUBLISHED,
                    STORAGE_RETIRED,
                    Ordering::SeqCst,
                    Ordering::SeqCst,
                )
                .is_ok()
        {
            self.closed.store(true, Ordering::SeqCst);
            exit.finished = true;
            drop(held);
            return;
        }
        if !matches!(result, Ok(Ok(())))
            || self.closed.load(Ordering::SeqCst)
            || held
                .operation
                .as_ref()
                .is_none_or(|operation| operation.returned().is_err())
        {
            self.quarantine_storage(held, result.err());
        }
        if self
            .phase
            .compare_exchange(PUBLISHED, STORAGE_HELD, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            self.close_admission();
            retain(held, None);
        }
        // All permanent File owners remain in the process-lifetime root cell.
        // Keep this same context alive only within the original operation's
        // acceptance window. No replacement worker or general request loop exists.
        // Future fixed phases must be integrated on this context before this
        // window ends; STORAGE_HELD is not a resumable installation or authority.
        drop(held);
        loop {
            if self.closed.load(Ordering::SeqCst)
                || self
                    .original_state
                    .get()
                    .is_none_or(|state| state.valid().is_err())
            {
                self.close_admission();
                exit.finished = true;
                return;
            }
            // This wait is outside the authority guard and holds no SQL/view.
            thread::park_timeout(Duration::from_millis(20));
        }
    }
}

struct ContextExit {
    root: &'static ControlRoot,
    finished: bool,
}
impl Drop for ContextExit {
    fn drop(&mut self) {
        if !self.finished {
            self.root.close_admission();
        }
    }
}

struct StorageFrame<'a> {
    root: &'static ControlRoot,
    operation: &'a Operation,
    selection: &'a storage::Selection,
    owners: &'a mut storage::Owners,
    journal_input: Option<&'a storage::pending_journal::PendingJournalInput>,
    _thread: PhantomData<Rc<()>>,
}

impl<'a> StorageFrame<'a> {
    fn acquire_and_prepare_pending(&mut self) -> Result<(), RootError> {
        self.acquire()?;
        #[cfg(target_os = "linux")]
        if self.journal_input.is_some() {
            self.create_pending_journal()?;
        }
        #[cfg(all(test, target_os = "linux"))]
        self.fault_journal_boundary()?;
        Ok(())
    }

    fn project(
        root: &'static ControlRoot,
        held: &'a mut MutexGuard<'static, Authority>,
    ) -> Result<Self, RootError> {
        let Authority {
            operation,
            selection,
            owners,
            journal_input,
            ..
        } = &mut **held;
        let operation = operation.as_ref().ok_or(RootError::Rejected)?;
        let selection = selection.as_ref().ok_or(RootError::Rejected)?;
        if !ROOT.get().is_some_and(|actual| std::ptr::eq(actual, root))
            || root.context_id.get() != Some(&thread::current().id())
            || root.closed.load(Ordering::SeqCst)
            || root
                .original_state
                .get()
                .is_none_or(|original| !operation.original.owns(original))
            || !operation.plan.matches_selection(selection)
        {
            return Err(RootError::Rejected);
        }
        operation.returned()?;
        Ok(Self {
            root,
            operation,
            selection,
            owners,
            journal_input: journal_input.as_ref(),
            _thread: PhantomData,
        })
    }
}

// Terminal retention is the explicit draft04 exception, not normal guarded
// work. It never releases the actual authority guard or acknowledges cleanup.
fn retain(
    held: MutexGuard<'static, Authority>,
    payload: Option<Box<dyn std::any::Any + Send>>,
) -> ! {
    let retained = (held, payload);
    loop {
        std::hint::black_box(&retained);
        let parked = catch_unwind(AssertUnwindSafe(thread::park));
        if let Err(payload) = parked {
            // An arbitrary payload destructor may panic. Abort without unwinding
            // through the retained owners; process exit is not cleanup proof.
            std::mem::forget(payload);
            std::process::abort();
        }
    }
}

#[cfg(test)]
#[path = "selected_root_tests.rs"]
mod tests;
