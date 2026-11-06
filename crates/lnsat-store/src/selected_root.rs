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

const VACANT: u8 = 0;
const RESERVED: u8 = 1;
const PUBLISHED: u8 = 2;
const STORAGE_HELD: u8 = 3;
const QUARANTINED: u8 = 4;
const OBSERVATION_LIMIT: u32 = 65_536;
const CLEANUP_LIMIT: u32 = 256;
const SQL_CLEANUP_BASE: u32 = 132;

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

/// Capacity is not authority. No production constructor exists until every
/// native, SQL, journal, root and terminal obligation has a closed inventory.
struct FullCleanupPlan {
    selected_ancestors: usize,
    selected_file_obligations: u32,
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
        // Parent, lease and two independently retired procfs observations.
        self.selected_ancestors == selection.ancestor_count()
            && self.selected_file_obligations == selected
            && SQL_CLEANUP_BASE
                .checked_add(selected)
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
}

impl Operation {
    fn observe(&self) -> Result<(), RootError> {
        self.original
            .shared_state()
            .valid()
            .map_err(|_| RootError::Budget)?;
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
        self.original
            .shared_state()
            .valid()
            .map_err(|_| RootError::Budget)
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
}

struct Authority {
    identities: OperationIdentityAllocator,
    // Created inert, before custody I/O. It is never a verified credential.
    original_scope: OwnerDecisionCredentialScopeV1,
    operation: Option<Operation>,
    selection: Option<storage::Selection>,
    owners: storage::Owners,
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
            });
            held.selection = Some(selection);
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
            frame.acquire()
        }));
        if !matches!(result, Ok(Ok(())))
            || self.closed.load(Ordering::SeqCst)
            || held
                .operation
                .as_ref()
                .is_none_or(|operation| operation.returned().is_err())
        {
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
            // Keep the actual guard and any caught payload in this same context.
            retain(held, result.err());
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
    _thread: PhantomData<Rc<()>>,
}

impl<'a> StorageFrame<'a> {
    fn project(
        root: &'static ControlRoot,
        held: &'a mut MutexGuard<'static, Authority>,
    ) -> Result<Self, RootError> {
        let Authority {
            operation,
            selection,
            owners,
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
