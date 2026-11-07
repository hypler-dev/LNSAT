//! Fixed selected-file acquisition into the anchored root's actual slots.
//!
//! Production plan construction and product entry remain closed. Each returned
//! file is published before any metadata, association or post-call budget check.

use super::{RootError, StorageFrame};
use std::{
    fs::{self, File, Metadata, OpenOptions},
    os::unix::fs::OpenOptionsExt,
    path::{Component, Path, PathBuf},
};

#[path = "selected_root_pending_journal.rs"]
pub(super) mod pending_journal;

const MAX_ANCESTORS: usize = 128;
const MAX_PATH_BYTES: usize = 4096;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SlotState {
    Vacant,
    Reserved,
    AcquisitionIssued,
    Held,
    RetirementIssued,
    Retired,
    Uncertain,
}

struct FileSlot {
    owner: Option<File>,
    state: SlotState,
    cleanup: Option<u32>,
    retirement_issued: bool,
}
impl FileSlot {
    const fn empty() -> Self {
        Self {
            owner: None,
            state: SlotState::Vacant,
            cleanup: None,
            retirement_issued: false,
        }
    }

    fn reserve(&mut self, operation: &super::Operation) -> Result<(), RootError> {
        if self.state != SlotState::Vacant || self.owner.is_some() {
            return Err(RootError::Rejected);
        }
        self.cleanup = Some(operation.reserve_file()?);
        self.state = SlotState::Reserved;
        Ok(())
    }

    fn reserve_journal(
        &mut self,
        operation: &super::Operation,
        role: super::JournalFileRole,
    ) -> Result<(), RootError> {
        if self.state != SlotState::Vacant || self.owner.is_some() || self.cleanup.is_some() {
            operation.original.shared_state().invalidate();
            return Err(RootError::Rejected);
        }
        self.cleanup = Some(operation.reserve_journal_file(role)?);
        self.state = SlotState::Reserved;
        Ok(())
    }

    fn issued(&mut self) -> Result<(), RootError> {
        if self.state != SlotState::Reserved || self.owner.is_some() || self.cleanup.is_none() {
            return Err(RootError::Rejected);
        }
        self.state = SlotState::AcquisitionIssued;
        Ok(())
    }

    fn publish(&mut self, returned: File) {
        // The state/empty-slot precondition was checked before entering open.
        // Exclusive frame ownership prevents another publisher in that interval.
        self.owner = Some(returned);
        self.state = SlotState::Held;
    }
}

pub(super) struct Selection {
    database: PathBuf,
    parent: PathBuf,
    lease: PathBuf,
    // All lexical paths and storage are prepared before custody I/O.
    ancestors: Vec<PathBuf>,
    #[cfg(test)]
    missing_path: PathBuf,
    #[cfg(test)]
    moved_parent: PathBuf,
}

impl Selection {
    pub(super) fn parse(path: &Path) -> Result<Self, RootError> {
        let text = path.to_str().ok_or(RootError::Rejected)?;
        if !path.is_absolute()
            || text.len() > MAX_PATH_BYTES
            || text.ends_with('/')
            || text.chars().any(char::is_control)
            || text[1..]
                .split('/')
                .any(|part| part.is_empty() || part.len() > 255 || matches!(part, "." | ".."))
            || path
                .components()
                .any(|part| !matches!(part, Component::RootDir | Component::Normal(_)))
        {
            return Err(RootError::Rejected);
        }
        let parent = path.parent().ok_or(RootError::Rejected)?.to_path_buf();
        let lease = crate::local_database_lease_path_v1(path).map_err(|_| RootError::Rejected)?;
        if lease.as_os_str().len() > MAX_PATH_BYTES
            || lease.file_name().is_none_or(|name| name.len() > 255)
        {
            return Err(RootError::Rejected);
        }
        let mut ancestors = Vec::new();
        ancestors
            .try_reserve_exact(MAX_ANCESTORS)
            .map_err(|_| RootError::Capacity)?;
        let mut current = PathBuf::from("/");
        ancestors.push(current.clone());
        for component in parent.components().skip(1) {
            let Component::Normal(name) = component else {
                return Err(RootError::Rejected);
            };
            if ancestors.len() >= MAX_ANCESTORS {
                return Err(RootError::Rejected);
            }
            current.push(name);
            ancestors.push(current.clone());
        }
        #[cfg(test)]
        let missing_path = parent.join("lnsat-owned-absent-child");
        #[cfg(test)]
        let moved_parent = parent.with_extension("lnsat-owned-moved");
        Ok(Self {
            database: path.to_path_buf(),
            parent,
            lease,
            ancestors,
            #[cfg(test)]
            missing_path,
            #[cfg(test)]
            moved_parent,
        })
    }

    pub(super) fn ancestor_count(&self) -> usize {
        self.ancestors.len()
    }
}

pub(super) struct Owners {
    parent: FileSlot,
    lease: FileSlot,
    ancestors: [FileSlot; MAX_ANCESTORS],
    proc_before: FileSlot,
    proc_after: FileSlot,
    journal: [FileSlot; super::JOURNAL_FILE_ROLE_COUNT],
    parent_identity: Option<super::super::FileIdentity>,
    lease_identity: Option<super::super::FileIdentity>,
    database_identity: Option<super::super::FileIdentity>,
    owner_uid: Option<u32>,
    #[cfg(target_os = "linux")]
    linux: LinuxAssociation,
}

impl Owners {
    pub(super) fn empty() -> Self {
        Self {
            parent: FileSlot::empty(),
            lease: FileSlot::empty(),
            ancestors: std::array::from_fn(|_| FileSlot::empty()),
            proc_before: FileSlot::empty(),
            proc_after: FileSlot::empty(),
            journal: std::array::from_fn(|_| FileSlot::empty()),
            parent_identity: None,
            lease_identity: None,
            database_identity: None,
            owner_uid: None,
            #[cfg(target_os = "linux")]
            linux: LinuxAssociation::empty(),
        }
    }

    pub(super) fn mark_issued_uncertain(&mut self) {
        for slot in [
            &mut self.parent,
            &mut self.lease,
            &mut self.proc_before,
            &mut self.proc_after,
        ]
        .into_iter()
        .chain(self.ancestors.iter_mut())
        .chain(self.journal.iter_mut())
        {
            if matches!(
                slot.state,
                SlotState::AcquisitionIssued | SlotState::RetirementIssued
            ) {
                slot.state = SlotState::Uncertain;
            }
        }
    }

    pub(super) fn journal_roles_match(
        &self,
        operation: &super::Operation,
        point: super::journal_schedule::JournalPoint,
    ) -> bool {
        let Some(plan) = operation.plan.journal.as_ref() else {
            return false;
        };
        let Some(expected) = journal_expected_states(point) else {
            return false;
        };
        plan.matches_selected_file_obligations(operation.plan.selected_file_obligations)
            && operation.journal_issued.load(super::Ordering::SeqCst) == 0b11_1111
            && super::JournalFileRole::ALL.into_iter().all(|role| {
                let slot = &self.journal[role.index()];
                slot.cleanup == Some(plan.cleanup_id(role))
                    && slot.state == expected[role.index()]
                    && match slot.state {
                        SlotState::Reserved => slot.owner.is_none() && !slot.retirement_issued,
                        SlotState::Held => slot.owner.is_some() && !slot.retirement_issued,
                        SlotState::Retired => slot.owner.is_none() && slot.retirement_issued,
                        _ => false,
                    }
            })
    }

    pub(super) fn filesystem_retired(
        &self,
        operation: &super::Operation,
        selection: &Selection,
    ) -> bool {
        let retired = |slot: &FileSlot, cleanup: u32| {
            slot.state == SlotState::Retired
                && slot.owner.is_none()
                && slot.retirement_issued
                && slot.cleanup == Some(cleanup)
        };
        operation.plan.matches_selection(selection)
            && operation.cleanup_issued.load(super::Ordering::SeqCst)
                == operation.plan.selected_file_obligations
            && retired(&self.parent, 0)
            && retired(&self.lease, 1)
            && retired(&self.proc_before, 2)
            && selection.ancestors.iter().enumerate().all(|(index, _)| {
                u32::try_from(index)
                    .ok()
                    .and_then(|index| index.checked_add(3))
                    .is_some_and(|cleanup| retired(&self.ancestors[index], cleanup))
            })
            && u32::try_from(selection.ancestor_count())
                .ok()
                .and_then(|count| count.checked_add(3))
                .is_some_and(|cleanup| retired(&self.proc_after, cleanup))
            && self.ancestors[selection.ancestor_count()..]
                .iter()
                .all(|slot| {
                    slot.state == SlotState::Vacant
                        && slot.owner.is_none()
                        && slot.cleanup.is_none()
                        && !slot.retirement_issued
                })
            && self.journal_roles_match(
                operation,
                super::journal_schedule::JournalPoint::ProcRetireBefore,
            )
    }

    pub(super) fn reserve_journal(
        &mut self,
        operation: &super::Operation,
        role: super::JournalFileRole,
    ) -> Result<(), RootError> {
        self.journal[role.index()].reserve_journal(operation, role)
    }

    #[cfg(test)]
    pub(super) fn parent_consumed_unknown(&self) -> bool {
        self.parent.state == SlotState::Uncertain
            && self.parent.retirement_issued
            && self.parent.owner.is_none()
            && self.parent.cleanup.is_some()
    }

    #[cfg(test)]
    pub(super) fn proc_consumed_unknown(&self) -> bool {
        [&self.proc_before, &self.proc_after].iter().any(|slot| {
            slot.retirement_issued
                && slot.state == SlotState::Uncertain
                && slot.owner.is_none()
                && slot.cleanup.is_some()
        })
    }

    #[cfg(all(test, target_os = "linux"))]
    pub(super) fn journal_proc_association_held(&self) -> bool {
        self.proc_before.state == SlotState::Held
            && self.proc_before.owner.is_some()
            && self.proc_before.cleanup == Some(2)
            && !self.proc_before.retirement_issued
            && self.proc_after.state == SlotState::Retired
            && self.proc_after.owner.is_none()
            && self.proc_after.retirement_issued
            && self.linux.proc_baseline.is_some()
    }

    #[cfg(test)]
    pub(super) fn procfs_known_retired(&self) -> bool {
        [&self.proc_before, &self.proc_after].iter().all(|slot| {
            slot.state == SlotState::Retired && slot.owner.is_none() && slot.cleanup.is_some()
        })
    }

    #[cfg(test)]
    pub(super) fn held_count(&self) -> u32 {
        u32::try_from(
            [
                &self.parent,
                &self.lease,
                &self.proc_before,
                &self.proc_after,
            ]
            .into_iter()
            .chain(self.ancestors.iter())
            .chain(self.journal.iter())
            .filter(|slot| slot.owner.is_some())
            .count(),
        )
        .expect("fixed file-slot count fits u32")
    }
}

// This macro is private syntax for fixed call sites, not an extensible callback
// or caller-selected operation. File acquisition uses separate publish-first
// code and must never pass an owning result through this macro.
macro_rules! observed {
    ($operation:expr, $call:expr) => {{
        $operation.observe()?;
        let returned = $call;
        // Check even an error return before propagating its first typed failure.
        let live = $operation.returned();
        match returned {
            Ok(value) => {
                live?;
                value
            }
            Err(_) => return Err(RootError::Custody),
        }
    }};
}

impl StorageFrame<'_> {
    pub(super) fn acquire(&mut self) -> Result<(), RootError> {
        // This source path is Linux-only in production. Portable fixtures may
        // stop after parent/lease to exercise real partial-file retention.
        #[cfg(not(any(target_os = "linux", test)))]
        return Err(RootError::Rejected);

        self.operation.observe()?;
        let real = nix::unistd::getuid().as_raw();
        self.operation.returned()?;
        self.operation.observe()?;
        let effective = nix::unistd::geteuid().as_raw();
        self.operation.returned()?;
        let uid = super::super::checked_process_owner(real, effective)
            .map_err(|_| RootError::Rejected)?;
        self.owners.owner_uid = Some(uid);
        let canonical = observed!(self.operation, self.selection.database.canonicalize());
        if canonical.as_os_str() != self.selection.database.as_os_str() {
            return Err(RootError::Rejected);
        }
        let parent_metadata =
            observed!(self.operation, fs::symlink_metadata(&self.selection.parent));
        validate(&parent_metadata, uid, true)?;
        self.owners.parent_identity = Some(super::super::FileIdentity::of(&parent_metadata));

        self.owners.parent.reserve(self.operation)?;
        self.operation.observe()?;
        self.owners.parent.issued()?;
        let parent_path = &self.selection.parent;
        #[cfg(test)]
        let parent_path = if self.root.fault.load(super::Ordering::SeqCst) == 11 {
            &self.selection.missing_path
        } else {
            parent_path
        };
        if let Ok(file) = super::super::open_held(parent_path, true) {
            self.owners.parent.publish(file);
        } else {
            self.owners.parent.state = SlotState::Uncertain;
            let _live = self.operation.returned();
            #[cfg(test)]
            self.root
                .owning_error_postchecks
                .fetch_add(1, super::Ordering::SeqCst);
            return Err(RootError::Custody);
        }
        #[cfg(test)]
        if self.root.fault.load(super::Ordering::SeqCst) == 10 {
            // Controlled late post-return delivery. This is not an actual
            // blocked-kernel-call or physical deadline experiment.
            let remaining = self
                .operation
                .original
                .shared_state()
                .deadline()
                .saturating_duration_since(std::time::Instant::now());
            std::thread::sleep(remaining + std::time::Duration::from_millis(10));
        }
        self.operation.returned()?;
        #[cfg(test)]
        self.fault_after_parent()?;
        self.check_parent(uid)?;
        self.acquire_lease(uid)?;
        #[cfg(test)]
        self.fault_after_lease()?;
        #[cfg(target_os = "linux")]
        self.acquire_linux(uid)?;
        #[cfg(not(target_os = "linux"))]
        return Err(RootError::Rejected);
        #[cfg(target_os = "linux")]
        Ok(())
    }

    fn check_parent(&self, uid: u32) -> Result<(), RootError> {
        let file = self
            .owners
            .parent
            .owner
            .as_ref()
            .ok_or(RootError::Rejected)?;
        let held = observed!(self.operation, file.metadata());
        let named = observed!(self.operation, fs::symlink_metadata(&self.selection.parent));
        validate(&held, uid, true)?;
        validate(&named, uid, true)?;
        let expected = self
            .owners
            .parent_identity
            .as_ref()
            .ok_or(RootError::Rejected)?;
        if &super::super::FileIdentity::of(&held) != expected
            || &super::super::FileIdentity::of(&named) != expected
        {
            return Err(RootError::Custody);
        }
        Ok(())
    }

    fn acquire_lease(&mut self, uid: u32) -> Result<(), RootError> {
        let database = observed!(
            self.operation,
            fs::symlink_metadata(&self.selection.database)
        );
        validate(&database, uid, false)?;
        self.owners.database_identity = Some(super::super::FileIdentity::of(&database));
        self.operation.observe()?;
        let prior = fs::symlink_metadata(&self.selection.lease);
        self.operation.returned()?;
        let prior_identity = match prior {
            Ok(metadata) => {
                validate(&metadata, uid, false)?;
                Some(super::super::FileIdentity::of(&metadata))
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
            Err(_) => return Err(RootError::Custody),
        };
        let mut options = OpenOptions::new();
        options.read(true).write(true).custom_flags(
            (nix::fcntl::OFlag::O_NOFOLLOW
                | nix::fcntl::OFlag::O_CLOEXEC
                | nix::fcntl::OFlag::O_NONBLOCK)
                .bits(),
        );
        if prior_identity.is_none() {
            options.create_new(true).mode(0o600);
        }
        self.owners.lease.reserve(self.operation)?;
        self.operation.observe()?;
        self.owners.lease.issued()?;
        #[cfg(test)]
        if self.root.fault.load(super::Ordering::SeqCst) == 8 {
            // A controlled fixture removes its already observed lease. The
            // real non-creating open then fails after modeled cancellation.
            fs::remove_file(&self.selection.lease).expect("controlled lease removal");
            self.operation.original.shared_state().invalidate();
        }
        if let Ok(file) = options.open(&self.selection.lease) {
            self.owners.lease.publish(file);
        } else {
            self.owners.lease.state = SlotState::Uncertain;
            let _live = self.operation.returned();
            #[cfg(test)]
            self.root
                .owning_error_postchecks
                .fetch_add(1, super::Ordering::SeqCst);
            return Err(RootError::Custody);
        }
        self.operation.returned()?;
        let file = self
            .owners
            .lease
            .owner
            .as_ref()
            .ok_or(RootError::Rejected)?;
        let held = observed!(self.operation, file.metadata());
        let named = observed!(self.operation, fs::symlink_metadata(&self.selection.lease));
        validate(&held, uid, false)?;
        validate(&named, uid, false)?;
        let identity = super::super::FileIdentity::of(&held);
        if super::super::FileIdentity::of(&named) != identity
            || prior_identity
                .as_ref()
                .is_some_and(|prior| prior != &identity)
        {
            return Err(RootError::Custody);
        }
        self.owners.lease_identity = Some(identity);
        self.operation.observe()?;
        let locked = file.try_lock();
        let live = self.operation.returned();
        if locked.is_err() {
            return Err(RootError::Custody);
        }
        live?;
        self.check_parent(uid)
    }
}

fn validate(metadata: &Metadata, uid: u32, directory: bool) -> Result<(), RootError> {
    super::super::validate_metadata(metadata, uid, directory).map_err(|_| RootError::Custody)
}

#[cfg(target_os = "linux")]
struct LinuxAssociation {
    namespace: Option<PathBuf>,
    proc_baseline: Option<linux::ProcSample>,
    selected_identities: Option<[super::super::linux::native::Identity; 3]>,
    ancestor_identities: [Option<super::super::linux::native::Identity>; MAX_ANCESTORS],
}

#[cfg(target_os = "linux")]
impl LinuxAssociation {
    fn empty() -> Self {
        Self {
            namespace: None,
            proc_baseline: None,
            selected_identities: None,
            ancestor_identities: [None; MAX_ANCESTORS],
        }
    }
}

#[cfg(target_os = "linux")]
#[path = "selected_root_linux.rs"]
mod linux;

#[cfg(test)]
impl StorageFrame<'_> {
    fn fault_after_parent(&self) -> Result<(), RootError> {
        match self.root.fault.load(super::Ordering::SeqCst) {
            1 => Err(RootError::Custody),
            2 => {
                self.operation.original.shared_state().invalidate();
                self.operation.returned()
            }
            3 => panic!("controlled selected-root post-parent panic"),
            5 => super::tests::panic_retained_payload(),
            9 => {
                use std::os::unix::fs::PermissionsExt as _;
                // Mutate only this owned fixture's actual held directory.
                self.owners
                    .parent
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?
                    .set_permissions(fs::Permissions::from_mode(0o755))
                    .expect("controlled parent mode drift");
                Ok(())
            }
            _ => Ok(()),
        }
    }
}

#[cfg(test)]
impl StorageFrame<'_> {
    fn fault_after_lease(&mut self) -> Result<(), RootError> {
        match self.root.fault.load(super::Ordering::SeqCst) {
            6 => {
                // One real consuming close, then a modeled uncertain return.
                // This is not a physical kernel close-error campaign.
                let slot = &mut self.owners.parent;
                if slot.state != SlotState::Held || slot.cleanup.is_none() {
                    return Err(RootError::Rejected);
                }
                slot.state = SlotState::RetirementIssued;
                slot.retirement_issued = true;
                let file = slot.owner.take().ok_or(RootError::Rejected)?;
                let _returned = nix::unistd::close(file);
                slot.state = SlotState::Uncertain;
                Err(RootError::Uncertain)
            }
            7 => Err(RootError::Custody),
            _ => Ok(()),
        }
    }
}

// Data parsing only. A matching number is not namespace continuity or authority.
pub(super) fn namespace_number(bytes: &[u8]) -> Result<u64, RootError> {
    if bytes.is_empty() || bytes.len() > 64 {
        return Err(RootError::Custody);
    }
    let digits = bytes
        .strip_prefix(b"mnt:[")
        .and_then(|value| value.strip_suffix(b"]"))
        .filter(|value| !value.is_empty() && value[0] != b'0')
        .ok_or(RootError::Custody)?;
    let mut number = 0_u64;
    for digit in digits {
        if !digit.is_ascii_digit() {
            return Err(RootError::Custody);
        }
        number = number
            .checked_mul(10)
            .and_then(|value| value.checked_add(u64::from(digit - b'0')))
            .ok_or(RootError::Custody)?;
    }
    Ok(number)
}

fn journal_prefix_states(revisions: usize, preparation: bool) -> [SlotState; 6] {
    let mut states = [SlotState::Reserved; 6];
    states[0] = SlotState::Held;
    if preparation {
        states[1] = SlotState::Held;
    }
    for state in states.iter_mut().skip(2).take(revisions) {
        *state = SlotState::Held;
    }
    states
}

fn journal_expected_states(point: super::journal_schedule::JournalPoint) -> Option<[SlotState; 6]> {
    use super::journal_schedule::{JournalPoint, ScanKind};
    match point {
        JournalPoint::RootCreateBefore => Some([SlotState::Reserved; 6]),
        JournalPoint::RootCreateAfter | JournalPoint::PreparationCreateBefore => {
            Some(journal_prefix_states(0, false))
        }
        JournalPoint::PreparationCreateAfter => Some(journal_prefix_states(0, true)),
        JournalPoint::AppendEntry(revision) if revision < 4 => {
            Some(journal_prefix_states(usize::from(revision), revision != 0))
        }
        JournalPoint::RevisionCreateBefore(revision) if revision < 4 => {
            Some(journal_prefix_states(usize::from(revision), true))
        }
        JournalPoint::RevisionCreateAfter(revision)
        | JournalPoint::WriteAfter(revision)
        | JournalPoint::FileSyncAfter(revision)
        | JournalPoint::DirectorySyncAfter(revision)
        | JournalPoint::ReadbackAfter(revision)
            if revision < 4 =>
        {
            Some(journal_prefix_states(usize::from(revision) + 1, true))
        }
        JournalPoint::ScanBefore(kind, pass) | JournalPoint::ScanAfter(kind, pass) if pass < 2 => {
            match kind {
                ScanKind::Initial => Some(journal_prefix_states(0, false)),
                ScanKind::BeforeAppend(revision) if revision < 4 => {
                    Some(journal_prefix_states(usize::from(revision), revision != 0))
                }
                ScanKind::AfterAppend(revision) if revision < 4 => {
                    Some(journal_prefix_states(usize::from(revision) + 1, true))
                }
                _ => None,
            }
        }
        JournalPoint::JournalCloseBefore(role) | JournalPoint::JournalCloseAfter(role) => {
            let mut states = [SlotState::Held; 6];
            let first_retired =
                role.index() + usize::from(matches!(point, JournalPoint::JournalCloseBefore(_)));
            for state in states.iter_mut().skip(first_retired) {
                *state = SlotState::Retired;
            }
            Some(states)
        }
        JournalPoint::ProcRetireBefore => Some([SlotState::Retired; 6]),
        _ => None,
    }
}

#[cfg(test)]
mod journal_role_tests {
    use super::*;
    use crate::selected_store::rooted::{
        JournalFileRole,
        journal_schedule::{JournalPoint, ScanKind},
        tests as root_tests,
    };

    #[test]
    fn six_reserved_slots_and_actual_owner_states_gate_each_boundary_before_native_work() {
        let selection =
            Selection::parse(Path::new("/a/selected.sqlite")).expect("synthetic selection");
        let (operation, original) =
            root_tests::operation_for_plan(root_tests::journal_plan(&selection));
        let mut owners = Owners::empty();
        assert!(!owners.journal_roles_match(&operation, JournalPoint::RootCreateBefore));
        for role in JournalFileRole::ALL {
            owners
                .reserve_journal(&operation, role)
                .expect("exact one-use role");
        }
        assert!(owners.journal_roles_match(&operation, JournalPoint::RootCreateBefore));
        assert!(!owners.journal_roles_match(&operation, JournalPoint::RootCreateAfter));
        owners.journal[0].state = SlotState::Held;
        assert!(!owners.journal_roles_match(&operation, JournalPoint::RootCreateAfter));
        // This fixture File exercises state/owner presence only. Its metadata
        // does not qualify it as a journal root or bypass native association.
        owners.journal[0].owner =
            Some(File::open(env!("CARGO_MANIFEST_DIR")).expect("fixture directory"));
        assert!(owners.journal_roles_match(&operation, JournalPoint::RootCreateAfter));
        owners.journal[0].cleanup = Some(u32::MAX);
        assert!(!owners.journal_roles_match(&operation, JournalPoint::RootCreateAfter));
        assert!(original.valid().is_ok());
        assert_eq!(
            operation.observations.load(super::super::Ordering::SeqCst),
            0
        );
    }

    #[test]
    fn expected_role_states_close_children_before_parent_and_reject_unknown_points() {
        assert_eq!(
            journal_expected_states(JournalPoint::RevisionCreateBefore(0)),
            Some([
                SlotState::Held,
                SlotState::Held,
                SlotState::Reserved,
                SlotState::Reserved,
                SlotState::Reserved,
                SlotState::Reserved
            ])
        );
        assert_eq!(
            journal_expected_states(JournalPoint::JournalCloseBefore(JournalFileRole::Revision3)),
            Some([SlotState::Held; 6])
        );
        assert_eq!(
            journal_expected_states(JournalPoint::JournalCloseAfter(
                JournalFileRole::Preparation
            )),
            Some([
                SlotState::Held,
                SlotState::Retired,
                SlotState::Retired,
                SlotState::Retired,
                SlotState::Retired,
                SlotState::Retired
            ])
        );
        assert_eq!(
            journal_expected_states(JournalPoint::JournalCloseBefore(JournalFileRole::Root)),
            Some([
                SlotState::Held,
                SlotState::Retired,
                SlotState::Retired,
                SlotState::Retired,
                SlotState::Retired,
                SlotState::Retired
            ])
        );
        assert_eq!(
            journal_expected_states(JournalPoint::JournalCloseAfter(JournalFileRole::Root)),
            Some([SlotState::Retired; 6])
        );
        assert_eq!(
            journal_expected_states(JournalPoint::ProcRetireBefore),
            Some([SlotState::Retired; 6])
        );
        assert!(journal_expected_states(JournalPoint::AppendEntry(4)).is_none());
        assert!(journal_expected_states(JournalPoint::ScanBefore(ScanKind::Initial, 2)).is_none());
    }
    #[test]
    fn terminal_filesystem_fence_requires_every_known_outcome_and_exact_original_id() {
        let selection =
            Selection::parse(Path::new("/a/selected.sqlite")).expect("synthetic selection");
        let (operation, _) = root_tests::operation_for_plan(root_tests::journal_plan(&selection));
        let mut owners = Owners::empty();
        assert!(!owners.filesystem_retired(&operation, &selection));
        // Model reported known outcomes only. No kernel close or custody proof
        // is executed or acknowledged by this pure terminal predicate test.
        for (index, slot) in [
            &mut owners.parent,
            &mut owners.lease,
            &mut owners.proc_before,
        ]
        .into_iter()
        .chain(owners.ancestors[..selection.ancestor_count()].iter_mut())
        .chain(std::iter::once(&mut owners.proc_after))
        .enumerate()
        {
            slot.reserve(&operation)
                .expect("exact selected reservation");
            assert_eq!(
                slot.cleanup,
                Some(u32::try_from(index).expect("fixed selected index"))
            );
            slot.state = SlotState::Retired;
            slot.retirement_issued = true;
        }
        for role in JournalFileRole::ALL {
            owners
                .reserve_journal(&operation, role)
                .expect("exact journal reservation");
            owners.journal[role.index()].state = SlotState::Retired;
            owners.journal[role.index()].retirement_issued = true;
        }
        assert!(owners.filesystem_retired(&operation, &selection));
        owners.proc_before.state = SlotState::Uncertain;
        assert!(!owners.filesystem_retired(&operation, &selection));
        owners.proc_before.state = SlotState::Retired;
        owners.parent.retirement_issued = false;
        assert!(!owners.filesystem_retired(&operation, &selection));
        owners.parent.retirement_issued = true;
        owners.journal[0].cleanup = Some(u32::MAX);
        assert!(!owners.filesystem_retired(&operation, &selection));
    }
}
