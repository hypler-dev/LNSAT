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

const MAX_ANCESTORS: usize = 128;
const MAX_PATH_BYTES: usize = 4096;

#[derive(Clone, Copy, Eq, PartialEq)]
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
        {
            if matches!(
                slot.state,
                SlotState::AcquisitionIssued | SlotState::RetirementIssued
            ) {
                slot.state = SlotState::Uncertain;
            }
        }
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
    ancestor_identities: [Option<super::super::linux::native::Identity>; MAX_ANCESTORS],
}

#[cfg(target_os = "linux")]
impl LinuxAssociation {
    fn empty() -> Self {
        Self {
            namespace: None,
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
