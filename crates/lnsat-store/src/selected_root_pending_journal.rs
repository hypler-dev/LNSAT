//! Fixed Pending-only rooted preparation-journal custody.
//!
//! This component persists one canonical Pending record only. It neither proves
//! an observed phase nor opens a product installation, cleanup, or retirement
//! path.

use super::super::RootError;
#[cfg(target_os = "linux")]
use super::super::StorageFrame;
use super::Selection;
use crate::headless_preparation::{UnverifiedRootJournalFrame, UnverifiedRootJournalPhase};
use std::path::{Path, PathBuf};

const MAX_PATH_BYTES: usize = 4096;
const MAX_NAME_BYTES: usize = 255;
const MAX_RECORD_BYTES: usize = 16 * 1024;
const ROOT_SUFFIX: &str = ".lnsat-preparations";
const PREPARATION_NAME_BYTES: usize = 64;
const REVISION_ZERO: &str = "00000000.json";

/// Control-selected expectations. These values are compared to decoded
/// canonical data; the frame does not choose the expected context.
pub(in crate::selected_store::rooted) struct ExpectedPendingJournal<'a> {
    pub(in crate::selected_store::rooted) owner_uid: u32,
    pub(in crate::selected_store::rooted) preparation_id: &'a str,
    pub(in crate::selected_store::rooted) candidate_digest: &'a str,
    pub(in crate::selected_store::rooted) store_digest: &'a str,
    pub(in crate::selected_store::rooted) recipe_digest: &'a str,
    pub(in crate::selected_store::rooted) challenge_digest: &'a str,
}

/// Owned Pending syntax and all bounded lexical paths, prepared before custody
/// I/O. This is data only; it contains no `File`, descriptor, proof, or grant.
pub(in crate::selected_store::rooted) struct PendingJournalInput {
    database: PathBuf,
    parent: PathBuf,
    root_name: String,
    preparation_name: String,
    root_path: PathBuf,
    preparation_path: PathBuf,
    revision_zero_path: PathBuf,
    owner_uid: u32,
    expected: UnverifiedRootJournalFrame,
}

impl PendingJournalInput {
    pub(in crate::selected_store::rooted) fn parse(
        selection: &Selection,
        expectation: &ExpectedPendingJournal<'_>,
        bytes: &[u8],
    ) -> Result<Self, RootError> {
        let expected =
            UnverifiedRootJournalFrame::decode(bytes).map_err(|_| RootError::Rejected)?;
        if bytes.len() > MAX_RECORD_BYTES
            || expected.phase() != UnverifiedRootJournalPhase::Pending
            || expected.revision() != 0
            || expected.container_id().is_some()
            || expected.owner_uid() != expectation.owner_uid
            || expected.preparation_id() != expectation.preparation_id
            || expected.candidate_digest() != expectation.candidate_digest
            || expected.store_digest() != expectation.store_digest
            || expected.recipe_digest() != expectation.recipe_digest
            || expected.challenge_digest() != expectation.challenge_digest
            || !valid_preparation_id(expectation.preparation_id)
        {
            return Err(RootError::Rejected);
        }
        let leaf = selection
            .database
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or(RootError::Rejected)?;
        let root_name = bounded_name(leaf, ROOT_SUFFIX)?;
        let preparation_name = expectation.preparation_id.to_owned();
        let root_path = bounded_join(&selection.parent, &root_name)?;
        let preparation_path = bounded_join(&root_path, &preparation_name)?;
        let revision_zero_path = bounded_join(&preparation_path, REVISION_ZERO)?;
        Ok(Self {
            database: selection.database.clone(),
            parent: selection.parent.clone(),
            root_name,
            preparation_name,
            root_path,
            preparation_path,
            revision_zero_path,
            owner_uid: expectation.owner_uid,
            expected,
        })
    }

    pub(in crate::selected_store::rooted) fn matches_selection(
        &self,
        selection: &Selection,
    ) -> bool {
        self.database.as_os_str() == selection.database.as_os_str()
            && self.parent.as_os_str() == selection.parent.as_os_str()
            && self.root_name.strip_suffix(ROOT_SUFFIX)
                == selection
                    .database
                    .file_name()
                    .and_then(|name| name.to_str())
            && self.root_path.parent().map(Path::as_os_str) == Some(self.parent.as_os_str())
            && self.root_path.file_name() == Some(std::ffi::OsStr::new(&self.root_name))
            && self.preparation_path.parent().map(Path::as_os_str)
                == Some(self.root_path.as_os_str())
            && self.preparation_path.file_name()
                == Some(std::ffi::OsStr::new(&self.preparation_name))
            && self.revision_zero_path.parent().map(Path::as_os_str)
                == Some(self.preparation_path.as_os_str())
            && self.revision_zero_path.file_name() == Some(std::ffi::OsStr::new(REVISION_ZERO))
    }
}

fn valid_preparation_id(value: &str) -> bool {
    value.len() == PREPARATION_NAME_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
}

fn bounded_name(prefix: &str, suffix: &str) -> Result<String, RootError> {
    let length = prefix
        .len()
        .checked_add(suffix.len())
        .ok_or(RootError::Capacity)?;
    if length == 0
        || length > MAX_NAME_BYTES
        || prefix.bytes().any(|byte| byte == b'/' || byte == 0)
    {
        return Err(RootError::Rejected);
    }
    let mut value = String::new();
    value
        .try_reserve_exact(length)
        .map_err(|_| RootError::Capacity)?;
    value.push_str(prefix);
    value.push_str(suffix);
    Ok(value)
}

fn bounded_join(parent: &Path, name: &str) -> Result<PathBuf, RootError> {
    if name.is_empty()
        || name.len() > MAX_NAME_BYTES
        || name.bytes().any(|byte| byte == b'/' || byte == 0)
    {
        return Err(RootError::Rejected);
    }
    let extra = name.len().checked_add(1).ok_or(RootError::Capacity)?;
    let mut value = parent.to_path_buf();
    value.try_reserve(extra).map_err(|_| RootError::Capacity)?;
    value.push(name);
    if !value.is_absolute() || value.as_os_str().len() > MAX_PATH_BYTES {
        return Err(RootError::Rejected);
    }
    Ok(value)
}

#[cfg(target_os = "linux")]
mod linux {
    use super::super::super::{
        JournalFileRole as Role, Operation,
        journal_schedule::{JournalPoint, ScanKind},
    };
    use super::super::{FileSlot, SlotState};
    use super::{
        MAX_NAME_BYTES, MAX_RECORD_BYTES, PendingJournalInput, REVISION_ZERO, RootError,
        StorageFrame,
    };
    use crate::headless_preparation::UnverifiedRootJournalFrame;
    use crate::selected_store::linux::{
        kernel_posix_filesystem,
        native::{REQUIRED, identity},
        owner_only_acl,
    };
    use nix::{
        fcntl::{OFlag, OpenHow, ResolveFlag, openat2},
        sys::stat::Mode,
    };
    use rustix::fs::{AtFlags, RawDir, SeekFrom, seek};
    use std::path::Path;
    use std::{fs::File, mem::MaybeUninit, os::unix::fs::FileExt};

    const DIRECTORY_SCRATCH_BYTES: usize = 4096;
    const MAX_ACL_BYTES: usize = 1024;
    const JOURNAL_REQUIRED: rustix::fs::StatxFlags = REQUIRED.union(rustix::fs::StatxFlags::SIZE);

    #[derive(Clone, Copy, Eq, PartialEq)]
    struct Stamp {
        identity: crate::selected_store::linux::native::Identity,
        ctime_sec: i64,
        ctime_nsec: u32,
        size: u64,
        links: u32,
        mode: u16,
        uid: u32,
        gid: u32,
        mount: u64,
    }

    struct NodeExpectation<'a> {
        parent: &'a File,
        name: &'a str,
        path: &'a Path,
        uid: u32,
        directory: bool,
        mount: u64,
    }

    impl<'a> NodeExpectation<'a> {
        fn root(input: &'a PendingJournalInput, parent: &'a File, mount: u64) -> Self {
            Self {
                parent,
                name: &input.root_name,
                path: &input.root_path,
                uid: input.owner_uid,
                directory: true,
                mount,
            }
        }

        fn preparation(input: &'a PendingJournalInput, root: &'a File, mount: u64) -> Self {
            Self {
                parent: root,
                name: &input.preparation_name,
                path: &input.preparation_path,
                uid: input.owner_uid,
                directory: true,
                mount,
            }
        }

        fn revision(input: &'a PendingJournalInput, preparation: &'a File, mount: u64) -> Self {
            Self {
                parent: preparation,
                name: REVISION_ZERO,
                path: &input.revision_zero_path,
                uid: input.owner_uid,
                directory: false,
                mount,
            }
        }
    }

    macro_rules! observed {
        ($operation:expr, $call:expr) => {{
            $operation.observe()?;
            let returned = $call;
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
        pub(in crate::selected_store::rooted) fn create_pending_journal(
            &mut self,
        ) -> Result<(), RootError> {
            let Some(input) = self.journal_input else {
                return Err(RootError::Rejected);
            };
            self.check_pending_input(input)?;
            self.reserve_pending_journal_roles()?;
            let parent_mount = self.create_pending_root(input)?;
            let empty = self.initial_empty_root_scans(input, parent_mount)?;
            self.before_append_empty_root_scans(input, parent_mount, empty)?;
            self.create_pending_preparation(input, parent_mount)?;
            self.create_pending_revision(input, parent_mount)?;
            self.write_pending_revision(input, parent_mount)?;
            self.sync_pending_revision(input, parent_mount)?;
            self.sync_pending_preparation(input, parent_mount)?;
            self.after_append_pending_scans(input, parent_mount)
        }

        fn check_pending_input(&self, input: &PendingJournalInput) -> Result<(), RootError> {
            if !input.matches_selection(self.selection)
                || self.owners.owner_uid != Some(input.owner_uid)
                || self.operation.plan.journal.is_none()
            {
                return Err(RootError::Rejected);
            }
            Ok(())
        }

        fn reserve_pending_journal_roles(&mut self) -> Result<(), RootError> {
            for role in Role::ALL {
                self.owners.reserve_journal(self.operation, role)?;
            }
            Ok(())
        }

        fn create_pending_root(&mut self, input: &PendingJournalInput) -> Result<u64, RootError> {
            self.journal_boundary(JournalPoint::RootCreateBefore)?;
            let parent_mount = {
                let (parent_slot, journal) = (&self.owners.parent, &mut self.owners.journal);
                let parent = parent_slot.owner.as_ref().ok_or(RootError::Rejected)?;
                let mount = held_stamp(self.operation, parent, true, input.owner_uid)?.mount;
                create_directory(
                    self.operation,
                    &mut journal[Role::Root.index()],
                    parent,
                    &input.root_name,
                )?;
                mount
            };
            let parent = self
                .owners
                .parent
                .owner
                .as_ref()
                .ok_or(RootError::Rejected)?;
            let root = self.owners.journal[Role::Root.index()]
                .owner
                .as_ref()
                .ok_or(RootError::Rejected)?;
            check_node(
                self.operation,
                root,
                &NodeExpectation::root(input, parent, parent_mount),
            )?;
            sync(self.operation, root)?;
            sync(self.operation, parent)?;
            self.journal_boundary(JournalPoint::RootCreateAfter)?;
            Ok(parent_mount)
        }

        fn scan_empty_root(
            &self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<Stamp, RootError> {
            scan_empty_root(
                self.operation,
                self.owners
                    .parent
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?,
                self.owners.journal[Role::Root.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?,
                input,
                mount,
            )
        }

        fn initial_empty_root_scans(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<Stamp, RootError> {
            self.journal_boundary(JournalPoint::ScanBefore(ScanKind::Initial, 0))?;
            let empty = self.scan_empty_root(input, mount)?;
            self.journal_boundary(JournalPoint::ScanAfter(ScanKind::Initial, 0))?;
            self.journal_boundary(JournalPoint::ScanBefore(ScanKind::Initial, 1))?;
            if self.scan_empty_root(input, mount)? != empty {
                return Err(RootError::Custody);
            }
            self.journal_boundary(JournalPoint::ScanAfter(ScanKind::Initial, 1))?;
            Ok(empty)
        }

        fn before_append_empty_root_scans(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
            empty: Stamp,
        ) -> Result<(), RootError> {
            self.journal_boundary(JournalPoint::AppendEntry(0))?;
            self.journal_boundary(JournalPoint::ScanBefore(ScanKind::BeforeAppend(0), 0))?;
            if self.scan_empty_root(input, mount)? != empty {
                return Err(RootError::Custody);
            }
            self.journal_boundary(JournalPoint::ScanAfter(ScanKind::BeforeAppend(0), 0))?;
            self.journal_boundary(JournalPoint::ScanBefore(ScanKind::BeforeAppend(0), 1))?;
            if self.scan_empty_root(input, mount)? != empty {
                return Err(RootError::Custody);
            }
            self.journal_boundary(JournalPoint::ScanAfter(ScanKind::BeforeAppend(0), 1))?;
            Ok(())
        }

        fn create_pending_preparation(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(), RootError> {
            self.journal_boundary(JournalPoint::PreparationCreateBefore)?;
            {
                let journal = &mut self.owners.journal;
                let (before_preparation, from_preparation) =
                    journal.split_at_mut(Role::Preparation.index());
                let root = before_preparation[Role::Root.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                create_directory(
                    self.operation,
                    &mut from_preparation[0],
                    root,
                    &input.preparation_name,
                )?;
            }
            let root = self.owners.journal[Role::Root.index()]
                .owner
                .as_ref()
                .ok_or(RootError::Rejected)?;
            let preparation = self.owners.journal[Role::Preparation.index()]
                .owner
                .as_ref()
                .ok_or(RootError::Rejected)?;
            check_node(
                self.operation,
                preparation,
                &NodeExpectation::preparation(input, root, mount),
            )?;
            sync(self.operation, preparation)?;
            sync(self.operation, root)?;
            enumerate(self.operation, root, &[&input.preparation_name])?;
            enumerate(self.operation, preparation, &[])?;
            self.journal_boundary(JournalPoint::PreparationCreateAfter)
        }

        fn create_pending_revision(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(), RootError> {
            self.journal_boundary(JournalPoint::RevisionCreateBefore(0))?;
            {
                let journal = &mut self.owners.journal;
                let (before_revision, from_revision) =
                    journal.split_at_mut(Role::Revision0.index());
                let preparation = before_revision[Role::Preparation.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                create_revision(
                    self.operation,
                    &mut from_revision[0],
                    preparation,
                    REVISION_ZERO,
                )?;
            }
            {
                let preparation = self.owners.journal[Role::Preparation.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                let revision = self.owners.journal[Role::Revision0.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                check_node(
                    self.operation,
                    revision,
                    &NodeExpectation::revision(input, preparation, mount),
                )?;
            }
            self.journal_boundary(JournalPoint::RevisionCreateAfter(0))
        }

        fn write_pending_revision(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(), RootError> {
            {
                let preparation = self.owners.journal[Role::Preparation.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                let revision = self.owners.journal[Role::Revision0.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                write_exact(self.operation, revision, input.expected.bytes())?;
                check_node(
                    self.operation,
                    revision,
                    &NodeExpectation::revision(input, preparation, mount),
                )?;
            }
            self.journal_boundary(JournalPoint::WriteAfter(0))
        }

        fn sync_pending_revision(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(), RootError> {
            {
                let preparation = self.owners.journal[Role::Preparation.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                let revision = self.owners.journal[Role::Revision0.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                sync(self.operation, revision)?;
                check_node(
                    self.operation,
                    revision,
                    &NodeExpectation::revision(input, preparation, mount),
                )?;
            }
            self.journal_boundary(JournalPoint::FileSyncAfter(0))
        }

        fn sync_pending_preparation(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(), RootError> {
            {
                let root = self.owners.journal[Role::Root.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                let preparation = self.owners.journal[Role::Preparation.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                sync(self.operation, preparation)?;
                check_node(
                    self.operation,
                    preparation,
                    &NodeExpectation::preparation(input, root, mount),
                )?;
            }
            self.journal_boundary(JournalPoint::DirectorySyncAfter(0))
        }

        fn scan_pending(
            &self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(Stamp, Stamp, Stamp), RootError> {
            scan_pending(
                self.operation,
                self.owners
                    .parent
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?,
                self.owners.journal[Role::Root.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?,
                self.owners.journal[Role::Preparation.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?,
                self.owners.journal[Role::Revision0.index()]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?,
                input,
                mount,
            )
        }

        fn after_append_pending_scans(
            &mut self,
            input: &PendingJournalInput,
            mount: u64,
        ) -> Result<(), RootError> {
            self.journal_boundary(JournalPoint::ScanBefore(ScanKind::AfterAppend(0), 0))?;
            let first = self.scan_pending(input, mount)?;
            self.journal_boundary(JournalPoint::ScanAfter(ScanKind::AfterAppend(0), 0))?;
            self.journal_boundary(JournalPoint::ScanBefore(ScanKind::AfterAppend(0), 1))?;
            let second = self.scan_pending(input, mount)?;
            if first != second {
                return Err(RootError::Custody);
            }
            self.journal_boundary(JournalPoint::ScanAfter(ScanKind::AfterAppend(0), 1))?;
            self.journal_boundary(JournalPoint::ReadbackAfter(0))
        }
    }

    fn create_directory(
        operation: &Operation,
        slot: &mut FileSlot,
        parent: &File,
        name: &str,
    ) -> Result<(), RootError> {
        slot.issued()?;
        operation.observe()?;
        let made = rustix::fs::mkdirat(parent, name, rustix::fs::Mode::from_bits_truncate(0o700));
        if operation.returned().is_err() || made.is_err() {
            slot.state = SlotState::Uncertain;
            return Err(RootError::Custody);
        }
        open_directory(operation, slot, parent, name)
    }

    fn open_directory(
        operation: &Operation,
        slot: &mut FileSlot,
        parent: &File,
        name: &str,
    ) -> Result<(), RootError> {
        operation.observe()?;
        let opened = openat2(
            parent,
            name,
            OpenHow::new()
                .flags(
                    OFlag::O_RDONLY
                        | OFlag::O_DIRECTORY
                        | OFlag::O_CLOEXEC
                        | OFlag::O_NOFOLLOW
                        | OFlag::O_NONBLOCK,
                )
                .mode(Mode::empty())
                .resolve(
                    ResolveFlag::RESOLVE_BENEATH
                        | ResolveFlag::RESOLVE_NO_SYMLINKS
                        | ResolveFlag::RESOLVE_NO_MAGICLINKS
                        | ResolveFlag::RESOLVE_NO_XDEV,
                ),
        );
        let file = if let Ok(file) = opened {
            File::from(file)
        } else {
            slot.state = SlotState::Uncertain;
            let _ = operation.returned();
            return Err(RootError::Custody);
        };
        slot.publish(file);
        operation.returned()?;
        Ok(())
    }

    fn create_revision(
        operation: &Operation,
        slot: &mut FileSlot,
        parent: &File,
        name: &str,
    ) -> Result<(), RootError> {
        slot.issued()?;
        operation.observe()?;
        let opened = openat2(
            parent,
            name,
            OpenHow::new()
                .flags(
                    OFlag::O_RDWR
                        | OFlag::O_CREAT
                        | OFlag::O_EXCL
                        | OFlag::O_CLOEXEC
                        | OFlag::O_NOFOLLOW
                        | OFlag::O_NONBLOCK,
                )
                .mode(Mode::from_bits_truncate(0o600))
                .resolve(
                    ResolveFlag::RESOLVE_BENEATH
                        | ResolveFlag::RESOLVE_NO_SYMLINKS
                        | ResolveFlag::RESOLVE_NO_MAGICLINKS
                        | ResolveFlag::RESOLVE_NO_XDEV,
                ),
        );
        let file = if let Ok(file) = opened {
            File::from(file)
        } else {
            slot.state = SlotState::Uncertain;
            let _ = operation.returned();
            return Err(RootError::Custody);
        };
        slot.publish(file);
        operation.returned()?;
        Ok(())
    }

    fn sync(operation: &Operation, file: &File) -> Result<(), RootError> {
        observed!(operation, file.sync_all());
        Ok(())
    }

    fn write_exact(operation: &Operation, file: &File, bytes: &[u8]) -> Result<(), RootError> {
        if bytes.len() > MAX_RECORD_BYTES {
            return Err(RootError::Rejected);
        }
        let wrote = observed!(operation, file.write_at(bytes, 0));
        if wrote != bytes.len() {
            return Err(RootError::Custody);
        }
        let mut eof = [0_u8; 1];
        let tail = observed!(
            operation,
            file.read_at(
                &mut eof,
                u64::try_from(bytes.len()).map_err(|_| RootError::Capacity)?
            )
        );
        if tail != 0 {
            return Err(RootError::Custody);
        }
        Ok(())
    }

    fn scan_empty_root(
        operation: &Operation,
        parent: &File,
        root: &File,
        input: &PendingJournalInput,
        mount: u64,
    ) -> Result<Stamp, RootError> {
        check_node(
            operation,
            root,
            &NodeExpectation::root(input, parent, mount),
        )?;
        let before = held_stamp(operation, root, true, input.owner_uid)?;
        if before.mount != mount {
            return Err(RootError::Custody);
        }
        enumerate(operation, root, &[])?;
        let after = held_stamp(operation, root, true, input.owner_uid)?;
        if before != after {
            return Err(RootError::Custody);
        }
        check_node(
            operation,
            root,
            &NodeExpectation::root(input, parent, mount),
        )?;
        Ok(after)
    }

    fn scan_pending(
        operation: &Operation,
        parent: &File,
        root: &File,
        preparation: &File,
        revision: &File,
        input: &PendingJournalInput,
        mount: u64,
    ) -> Result<(Stamp, Stamp, Stamp), RootError> {
        check_pending_nodes(operation, parent, root, preparation, revision, input, mount)?;
        let result = pending_entry_stamps(operation, root, preparation, revision, input, mount)?;
        ensure_pending_stamps_unchanged(operation, root, preparation, revision, input, &result)?;
        check_pending_nodes_reverse(operation, parent, root, preparation, revision, input, mount)?;
        Ok(result)
    }

    fn check_pending_nodes(
        operation: &Operation,
        parent: &File,
        root: &File,
        preparation: &File,
        revision: &File,
        input: &PendingJournalInput,
        mount: u64,
    ) -> Result<(), RootError> {
        check_node(
            operation,
            root,
            &NodeExpectation::root(input, parent, mount),
        )?;
        check_node(
            operation,
            preparation,
            &NodeExpectation::preparation(input, root, mount),
        )?;
        check_node(
            operation,
            revision,
            &NodeExpectation::revision(input, preparation, mount),
        )
    }

    fn pending_entry_stamps(
        operation: &Operation,
        root: &File,
        preparation: &File,
        revision: &File,
        input: &PendingJournalInput,
        mount: u64,
    ) -> Result<(Stamp, Stamp, Stamp), RootError> {
        let root_before = held_stamp(operation, root, true, input.owner_uid)?;
        enumerate(operation, root, &[&input.preparation_name])?;
        let preparation_before = held_stamp(operation, preparation, true, input.owner_uid)?;
        enumerate(operation, preparation, &[REVISION_ZERO])?;
        let revision_before = held_stamp(operation, revision, false, input.owner_uid)?;
        if root_before.mount != mount
            || preparation_before.mount != mount
            || revision_before.mount != mount
        {
            return Err(RootError::Custody);
        }
        let mut bytes = [0_u8; MAX_RECORD_BYTES];
        let length = input.expected.bytes().len();
        let count = observed!(operation, revision.read_at(&mut bytes[..length], 0));
        if count != length {
            return Err(RootError::Custody);
        }
        let mut eof = [0_u8; 1];
        if observed!(
            operation,
            revision.read_at(
                &mut eof,
                u64::try_from(length).map_err(|_| RootError::Capacity)?
            )
        ) != 0
        {
            return Err(RootError::Custody);
        }
        let decoded =
            UnverifiedRootJournalFrame::decode(&bytes[..length]).map_err(|_| RootError::Custody)?;
        if !decoded.same_frame(&input.expected) {
            return Err(RootError::Custody);
        }
        Ok((root_before, preparation_before, revision_before))
    }

    fn ensure_pending_stamps_unchanged(
        operation: &Operation,
        root: &File,
        preparation: &File,
        revision: &File,
        input: &PendingJournalInput,
        expected: &(Stamp, Stamp, Stamp),
    ) -> Result<(), RootError> {
        if held_stamp(operation, root, true, input.owner_uid)? != expected.0
            || held_stamp(operation, preparation, true, input.owner_uid)? != expected.1
            || held_stamp(operation, revision, false, input.owner_uid)? != expected.2
        {
            return Err(RootError::Custody);
        }
        Ok(())
    }

    fn check_pending_nodes_reverse(
        operation: &Operation,
        parent: &File,
        root: &File,
        preparation: &File,
        revision: &File,
        input: &PendingJournalInput,
        mount: u64,
    ) -> Result<(), RootError> {
        check_node(
            operation,
            revision,
            &NodeExpectation::revision(input, preparation, mount),
        )?;
        check_node(
            operation,
            preparation,
            &NodeExpectation::preparation(input, root, mount),
        )?;
        check_node(
            operation,
            root,
            &NodeExpectation::root(input, parent, mount),
        )
    }

    fn enumerate(
        operation: &Operation,
        directory: &File,
        expected: &[&str],
    ) -> Result<(), RootError> {
        let mut scratch = [MaybeUninit::uninit(); DIRECTORY_SCRATCH_BYTES];
        if observed!(operation, seek(directory, SeekFrom::Start(0))) != 0 {
            return Err(RootError::Custody);
        }
        let mut seen = [false; 1];
        if expected.len() > seen.len() {
            return Err(RootError::Rejected);
        }
        let mut raw = 0_usize;
        {
            let mut entries = RawDir::new(directory, &mut scratch);
            loop {
                operation.observe()?;
                let next = entries.next();
                operation.returned()?;
                let Some(next) = next else { break };
                raw += 1;
                if raw > expected.len() + 2 {
                    return Err(RootError::Custody);
                }
                let entry = next.map_err(|_| RootError::Custody)?;
                let bytes = entry.file_name().to_bytes();
                if bytes.len() > MAX_NAME_BYTES {
                    return Err(RootError::Custody);
                }
                let name = entry.file_name().to_str().map_err(|_| RootError::Custody)?;
                if matches!(name, "." | "..") {
                    continue;
                }
                let Some(index) = expected.iter().position(|value| *value == name) else {
                    return Err(RootError::Custody);
                };
                if seen[index] {
                    return Err(RootError::Custody);
                }
                seen[index] = true;
            }
        }
        if seen[..expected.len()].iter().any(|value| !value) {
            return Err(RootError::Custody);
        }
        Ok(())
    }

    fn held_stamp(
        operation: &Operation,
        file: &File,
        directory: bool,
        uid: u32,
    ) -> Result<Stamp, RootError> {
        let filesystem = observed!(operation, rustix::fs::fstatfs(file));
        if !kernel_posix_filesystem(i128::from(filesystem.f_type), false)
            || filesystem.f_flags & 1 != 0
        {
            return Err(RootError::Custody);
        }
        let value = observed!(
            operation,
            rustix::fs::statx(file, c"", AtFlags::EMPTY_PATH, JOURNAL_REQUIRED)
        );
        if value.stx_mask & JOURNAL_REQUIRED.bits() != JOURNAL_REQUIRED.bits()
            || value.stx_mnt_id == 0
        {
            return Err(RootError::Custody);
        }
        let kind = if directory { 0o040_000 } else { 0o100_000 };
        let mode = if directory { 0o700 } else { 0o600 };
        if value.stx_mode & 0o170_000 != kind
            || value.stx_mode & 0o7777 != mode
            || value.stx_uid != uid
            || (!directory && value.stx_nlink != 1)
            || (directory && value.stx_nlink < 2)
        {
            return Err(RootError::Custody);
        }
        Ok(Stamp {
            identity: identity(&value),
            ctime_sec: value.stx_ctime.tv_sec,
            ctime_nsec: value.stx_ctime.tv_nsec,
            size: value.stx_size,
            links: value.stx_nlink,
            mode: value.stx_mode,
            uid: value.stx_uid,
            gid: value.stx_gid,
            mount: value.stx_mnt_id,
        })
    }

    fn check_node(
        operation: &Operation,
        file: &File,
        expected: &NodeExpectation<'_>,
    ) -> Result<(), RootError> {
        let held_before = held_stamp(operation, file, expected.directory, expected.uid)?;
        let named_before = observed!(
            operation,
            rustix::fs::statx(
                expected.parent,
                expected.name,
                AtFlags::SYMLINK_NOFOLLOW,
                JOURNAL_REQUIRED
            )
        );
        if named_before.stx_mask & JOURNAL_REQUIRED.bits() != JOURNAL_REQUIRED.bits()
            || named_before.stx_mnt_id != expected.mount
            || identity(&named_before) != held_before.identity
            || named_before.stx_ctime.tv_sec != held_before.ctime_sec
            || named_before.stx_ctime.tv_nsec != held_before.ctime_nsec
            || named_before.stx_size != held_before.size
            || named_before.stx_nlink != held_before.links
        {
            return Err(RootError::Custody);
        }
        acl(operation, file, expected.path, expected.directory)?;
        let held_after = held_stamp(operation, file, expected.directory, expected.uid)?;
        let named_after = observed!(
            operation,
            rustix::fs::statx(
                expected.parent,
                expected.name,
                AtFlags::SYMLINK_NOFOLLOW,
                JOURNAL_REQUIRED
            )
        );
        if named_after.stx_mask & JOURNAL_REQUIRED.bits() != JOURNAL_REQUIRED.bits()
            || named_after.stx_mnt_id != expected.mount
            || held_before != held_after
            || identity(&named_after) != held_after.identity
            || named_after.stx_ctime.tv_sec != held_after.ctime_sec
            || named_after.stx_ctime.tv_nsec != held_after.ctime_nsec
            || named_after.stx_size != held_after.size
            || named_after.stx_nlink != held_after.links
        {
            return Err(RootError::Custody);
        }
        Ok(())
    }

    fn acl(
        operation: &Operation,
        file: &File,
        path: &Path,
        directory: bool,
    ) -> Result<(), RootError> {
        let mut bytes = [0_u8; MAX_ACL_BYTES];
        operation.observe()?;
        let held = rustix::fs::fgetxattr(file, c"system.posix_acl_access", &mut bytes);
        operation.returned()?;
        match held {
            Ok(length) => {
                owner_only_acl(&bytes[..length], directory).map_err(|_| RootError::Custody)?;
            }
            Err(rustix::io::Errno::NODATA) => (),
            Err(_) => return Err(RootError::Custody),
        }
        operation.observe()?;
        let named = rustix::fs::lgetxattr(path, c"system.posix_acl_access", &mut bytes);
        operation.returned()?;
        match named {
            Ok(length) => {
                owner_only_acl(&bytes[..length], directory).map_err(|_| RootError::Custody)?;
            }
            Err(rustix::io::Errno::NODATA) => (),
            Err(_) => return Err(RootError::Custody),
        }
        if directory {
            operation.observe()?;
            let held_default = rustix::fs::fgetxattr(file, c"system.posix_acl_default", &mut bytes);
            operation.returned()?;
            if !matches!(held_default, Err(rustix::io::Errno::NODATA)) {
                return Err(RootError::Custody);
            }
            operation.observe()?;
            let named_default =
                rustix::fs::lgetxattr(path, c"system.posix_acl_default", &mut bytes);
            operation.returned()?;
            if !matches!(named_default, Err(rustix::io::Errno::NODATA)) {
                return Err(RootError::Custody);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
#[path = "selected_root_pending_journal_tests.rs"]
mod tests;

#[cfg(test)]
pub(in crate::selected_store::rooted) fn fixture_input(
    selection: &Selection,
    uid: u32,
) -> PendingJournalInput {
    tests::fixture_input(selection, uid)
}

#[cfg(test)]
pub(in crate::selected_store::rooted) fn fixture_bytes(uid: u32) -> Vec<u8> {
    tests::bytes(uid)
}
