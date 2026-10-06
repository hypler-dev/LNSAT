//! Private physical custody for untrusted preparation-journal frames.
//!
//! This layer establishes bounded file persistence, never observed phase facts,
//! bootstrap eligibility, SQL state, cleanup or authority.

use super::{
    JournalChain, MAX_CHAIN_BYTES, MAX_RECORD_BYTES, MAX_RECORDS, decode_record, journal_digest,
    valid_hex_id, validate_revision_chain, validate_successor,
};
use crate::SqliteStore;
use crate::selected_store::SelectedPreparationParent;
use nix::dir::Dir;
use nix::errno::Errno;
use nix::fcntl::{AtFlags, OFlag};
use nix::sys::stat::{FileStat, Mode, fstat, fstatat, mkdirat};
use std::fs::File;
use std::io::{Read, Write};
use std::os::fd::{AsFd, AsRawFd, OwnedFd};

const MAX_PREPARATIONS: usize = 64;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CustodyError {
    InvalidJournal,
    LimitExceeded,
    Changed,
    IoRejected,
    Poisoned,
}

impl CustodyError {
    const fn code(self) -> &'static str {
        match self {
            Self::InvalidJournal => "journal_custody.invalid_journal",
            Self::LimitExceeded => "journal_custody.limit_exceeded",
            Self::Changed => "journal_custody.changed",
            Self::IoRejected => "journal_custody.io_rejected",
            Self::Poisoned => "journal_custody.poisoned",
        }
    }
}

/// Private, untrusted syntax assertions, not a permission or cleanup proof.
struct RootSnapshot {
    chains: Vec<JournalChain>,
    bytes: usize,
    state: RootState,
}

#[derive(Clone, Eq, PartialEq)]
struct NodeStamp {
    preparation: String,
    revision: Option<u8>,
    stamp: Stamp,
}

#[derive(Clone, Eq, PartialEq)]
struct RootState {
    root: Stamp,
    objects: Vec<NodeStamp>,
    commitments: Vec<(String, String)>,
}

/// The exclusive store borrow keeps the actual connection and lease alive.
struct JournalCustody<'a> {
    parent: SelectedPreparationParent<'a>,
    root: File,
    root_name: String,
    owner: u32,
    poisoned: bool,
    baseline: Option<RootState>,
    #[cfg(test)]
    post_read_intervention: Option<Box<dyn FnOnce()>>,
    #[cfg(test)]
    post_revision_create_intervention: Option<Box<dyn FnOnce()>>,
}

#[derive(Clone, Copy, Eq, PartialEq)]
struct Stamp {
    device: u64,
    inode: u64,
    uid: u64,
    gid: u64,
    mode: u64,
    links: u64,
    ctime: i64,
    ctime_nsec: i64,
    size: i64,
}

fn unsigned<T: TryInto<u64>>(value: T) -> Result<u64, CustodyError> {
    value.try_into().map_err(|_| CustodyError::Changed)
}

fn signed<T: TryInto<i64>>(value: T) -> Result<i64, CustodyError> {
    value.try_into().map_err(|_| CustodyError::Changed)
}

impl Stamp {
    fn of(stat: FileStat) -> Result<Self, CustodyError> {
        Ok(Self {
            device: unsigned(stat.st_dev)?,
            inode: unsigned(stat.st_ino)?,
            uid: unsigned(stat.st_uid)?,
            gid: unsigned(stat.st_gid)?,
            mode: unsigned(stat.st_mode)?,
            links: unsigned(stat.st_nlink)?,
            ctime: signed(stat.st_ctime)?,
            ctime_nsec: signed(stat.st_ctime_nsec)?,
            size: signed(stat.st_size)?,
        })
    }

    fn validate(self, owner: u32, directory: bool) -> Result<(), CustodyError> {
        let (kind, mode) = if directory {
            (0o040_000, 0o700)
        } else {
            (0o100_000, 0o600)
        };
        if self.uid != u64::from(owner)
            || self.mode & 0o170_000 != kind
            || self.mode & 0o7777 != mode
            || (directory && self.links < 2)
            || (!directory && self.links != 1)
            || self.size < 0
        {
            return Err(CustodyError::Changed);
        }
        Ok(())
    }

    fn same_identity(self, other: Self) -> bool {
        self.device == other.device
            && self.inode == other.inode
            && self.uid == other.uid
            && self.gid == other.gid
            && self.mode == other.mode
            && self.links == other.links
    }
}

fn held_stamp(fd: impl AsFd) -> Result<Stamp, CustodyError> {
    Stamp::of(fstat(fd).map_err(|_| CustodyError::Changed)?)
}

fn association(
    parent: impl AsFd,
    name: &str,
    file: &File,
    owner: u32,
    directory: bool,
) -> Result<Stamp, CustodyError> {
    let held = held_stamp(file)?;
    let named = Stamp::of(
        fstatat(parent, name, AtFlags::AT_SYMLINK_NOFOLLOW).map_err(|_| CustodyError::Changed)?,
    )?;
    held.validate(owner, directory)?;
    named.validate(owner, directory)?;
    if held != named {
        return Err(CustodyError::Changed);
    }
    Ok(held)
}

#[cfg(target_os = "linux")]
fn descend(parent: impl AsFd, name: &str, flags: OFlag, mode: Mode) -> Result<OwnedFd, Errno> {
    use nix::fcntl::{OpenHow, ResolveFlag, openat2};
    openat2(
        parent,
        name,
        OpenHow::new().flags(flags).mode(mode).resolve(
            ResolveFlag::RESOLVE_BENEATH
                | ResolveFlag::RESOLVE_NO_SYMLINKS
                | ResolveFlag::RESOLVE_NO_MAGICLINKS
                | ResolveFlag::RESOLVE_NO_XDEV,
        ),
    )
}

#[cfg(not(target_os = "linux"))]
fn descend(_parent: impl AsFd, _name: &str, _flags: OFlag, _mode: Mode) -> Result<OwnedFd, Errno> {
    // Compile coverage is not a weaker platform backend.
    Err(Errno::ENOSYS)
}

fn directory_flags() -> OFlag {
    OFlag::O_RDONLY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW | OFlag::O_NONBLOCK | OFlag::O_DIRECTORY
}

fn open_directory(parent: impl AsFd, name: &str) -> Result<File, CustodyError> {
    descend(parent, name, directory_flags(), Mode::empty())
        .map(File::from)
        .map_err(|_| CustodyError::IoRejected)
}

fn ensure_directory(parent: &File, name: &str, owner: u32) -> Result<File, CustodyError> {
    let (file, created) = match descend(parent, name, directory_flags(), Mode::empty()) {
        Ok(fd) => (File::from(fd), false),
        Err(Errno::ENOENT) => {
            mkdirat(parent, name, Mode::S_IRWXU).map_err(|_| CustodyError::IoRejected)?;
            (open_directory(parent, name)?, true)
        }
        Err(_) => return Err(CustodyError::IoRejected),
    };
    association(parent, name, &file, owner, true)?;
    if created {
        file.sync_all().map_err(|_| CustodyError::IoRejected)?;
        association(parent, name, &file, owner, true)?;
        parent.sync_all().map_err(|_| CustodyError::IoRejected)?;
        association(parent, name, &file, owner, true)?;
    }
    Ok(file)
}

fn directory_stream(owned: OwnedFd) -> Result<Dir, CustodyError> {
    // Pinned nix 0.31.3 consumes the fd before fdopendir and leaks it on Err.
    // This is only a newly owned enumeration fd, never SQLite or a borrowed fd.
    // Re-review this exact error branch before changing the dependency version.
    let raw = owned.as_raw_fd();
    if let Ok(dir) = Dir::from_fd(owned) {
        Ok(dir)
    } else {
        // Ownership was not transferred to libc. Close once; never retry.
        let _ = nix::unistd::close(raw);
        Err(CustodyError::IoRejected)
    }
}

fn names(directory: &File, owner: u32) -> Result<Vec<String>, CustodyError> {
    let before = held_stamp(directory)?;
    before.validate(owner, true)?;
    let fd = descend(directory, ".", directory_flags(), Mode::empty())
        .map_err(|_| CustodyError::IoRejected)?;
    if held_stamp(&fd)? != before {
        return Err(CustodyError::Changed);
    }
    let mut dir = directory_stream(fd)?;
    let mut entries = Vec::new();
    for (index, entry) in dir.iter().enumerate() {
        if index >= MAX_RECORDS + 2 {
            return Err(CustodyError::LimitExceeded);
        }
        let entry = entry.map_err(|_| CustodyError::IoRejected)?;
        let name = entry
            .file_name()
            .to_str()
            .map_err(|_| CustodyError::InvalidJournal)?;
        if name == "." || name == ".." {
            continue;
        }
        if entries.len() >= MAX_RECORDS {
            return Err(CustodyError::LimitExceeded);
        }
        entries.push(name.to_owned());
    }
    if held_stamp(directory)? != before || held_stamp(&dir)? != before {
        return Err(CustodyError::Changed);
    }
    entries.sort_unstable();
    if entries.windows(2).any(|pair| pair[0] == pair[1]) {
        return Err(CustodyError::InvalidJournal);
    }
    Ok(entries)
}

impl<'a> JournalCustody<'a> {
    fn open(store: &'a mut SqliteStore) -> Result<Self, CustodyError> {
        if !cfg!(target_os = "linux") {
            return Err(CustodyError::IoRejected);
        }
        let parent = SelectedPreparationParent::borrow(store).map_err(|_| CustodyError::Changed)?;
        let owner = parent.owner().map_err(|_| CustodyError::Changed)?;
        let root_name = parent
            .journal_root_name()
            .map_err(|_| CustodyError::Changed)?;
        let root = ensure_directory(
            parent.directory().map_err(|_| CustodyError::Changed)?,
            &root_name,
            owner,
        )?;
        let mut journal = Self {
            parent,
            root,
            root_name,
            owner,
            poisoned: false,
            baseline: None,
            #[cfg(test)]
            post_read_intervention: None,
            #[cfg(test)]
            post_revision_create_intervention: None,
        };
        journal.baseline = Some(journal.stable_snapshot()?.state);
        Ok(journal)
    }

    fn check_root(&self) -> Result<Stamp, CustodyError> {
        self.parent.verify().map_err(|_| CustodyError::Changed)?;
        association(
            self.parent.directory().map_err(|_| CustodyError::Changed)?,
            &self.root_name,
            &self.root,
            self.owner,
            true,
        )
    }

    fn inspect(&mut self) -> Result<RootSnapshot, CustodyError> {
        if self.poisoned {
            return Err(CustodyError::Poisoned);
        }
        let result = self.current_snapshot();
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }

    fn stable_snapshot(&mut self) -> Result<RootSnapshot, CustodyError> {
        let first = self.scan()?;
        #[cfg(test)]
        if let Some(intervene) = self.post_read_intervention.take() {
            // Tests mutate real fixtures here; no success observation is injected.
            intervene();
        }
        let second = self.scan()?;
        if first.state != second.state {
            return Err(CustodyError::Changed);
        }
        Ok(second)
    }

    fn verify_baseline(&self) -> Result<(), CustodyError> {
        let baseline = self.baseline.as_ref().ok_or(CustodyError::Changed)?;
        if self.check_root()? != baseline.root {
            return Err(CustodyError::Changed);
        }
        for node in &baseline.objects {
            let prep =
                open_directory(&self.root, &node.preparation).map_err(|_| CustodyError::Changed)?;
            let stamp = if let Some(revision) = node.revision {
                let name = format!("{revision:08}.json");
                let flags =
                    OFlag::O_RDONLY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW | OFlag::O_NONBLOCK;
                let file = File::from(
                    descend(&prep, &name, flags, Mode::empty())
                        .map_err(|_| CustodyError::Changed)?,
                );
                association(&prep, &name, &file, self.owner, false)?
            } else {
                association(&self.root, &node.preparation, &prep, self.owner, true)?
            };
            if stamp != node.stamp {
                return Err(CustodyError::Changed);
            }
        }
        if self.check_root()? != baseline.root {
            return Err(CustodyError::Changed);
        }
        Ok(())
    }

    fn current_snapshot(&mut self) -> Result<RootSnapshot, CustodyError> {
        self.verify_baseline()?;
        let current = self.stable_snapshot()?;
        if self.baseline.as_ref() != Some(&current.state) {
            return Err(CustodyError::Changed);
        }
        Ok(current)
    }

    fn scan(&self) -> Result<RootSnapshot, CustodyError> {
        let root_before = self.check_root()?;
        let mut chains = Vec::new();
        let mut bytes = 0;
        let mut objects = Vec::new();
        let mut commitments = Vec::new();
        for id in names(&self.root, self.owner)? {
            if !valid_hex_id(&id) {
                return Err(CustodyError::InvalidJournal);
            }
            let (chain, nodes, read_bytes) = self.read_preparation(&id, bytes)?;
            bytes += read_bytes;
            objects.extend(nodes);
            commitments.push((id, chain.final_digest.clone()));
            chains.push(chain);
        }
        if self.check_root()? != root_before {
            return Err(CustodyError::Changed);
        }
        Ok(RootSnapshot {
            chains,
            bytes,
            state: RootState {
                root: root_before,
                objects,
                commitments,
            },
        })
    }

    fn read_preparation(
        &self,
        id: &str,
        used: usize,
    ) -> Result<(JournalChain, Vec<NodeStamp>, usize), CustodyError> {
        let prep = open_directory(&self.root, id)?;
        let prep_before = association(&self.root, id, &prep, self.owner, true)?;
        let revisions = names(&prep, self.owner)?;
        if revisions.is_empty() {
            return Err(CustodyError::InvalidJournal);
        }
        let mut nodes = vec![NodeStamp {
            preparation: id.to_owned(),
            revision: None,
            stamp: prep_before,
        }];
        let mut frames = Vec::new();
        let mut bytes = 0;
        for (index, name) in revisions.into_iter().enumerate() {
            if name != format!("{index:08}.json") {
                return Err(CustodyError::InvalidJournal);
            }
            let (frame, stamp) = self.read_revision(&prep, &name, used + bytes)?;
            bytes += frame.len();
            nodes.push(NodeStamp {
                preparation: id.to_owned(),
                revision: Some(u8::try_from(index).map_err(|_| CustodyError::LimitExceeded)?),
                stamp,
            });
            frames.push(frame);
        }
        let refs: Vec<_> = frames.iter().map(Vec::as_slice).collect();
        let chain = validate_revision_chain(&refs).map_err(|_| CustodyError::InvalidJournal)?;
        if chain.records[0].preparation_id != id || chain.records[0].owner_uid != self.owner {
            return Err(CustodyError::InvalidJournal);
        }
        if association(&self.root, id, &prep, self.owner, true)? != prep_before {
            return Err(CustodyError::Changed);
        }
        Ok((chain, nodes, bytes))
    }

    fn read_revision(
        &self,
        prep: &File,
        name: &str,
        used: usize,
    ) -> Result<(Vec<u8>, Stamp), CustodyError> {
        let flags = OFlag::O_RDONLY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW | OFlag::O_NONBLOCK;
        let mut file = File::from(
            descend(prep, name, flags, Mode::empty()).map_err(|_| CustodyError::IoRejected)?,
        );
        let before = association(prep, name, &file, self.owner, false)?;
        let size = usize::try_from(before.size).map_err(|_| CustodyError::LimitExceeded)?;
        if size > MAX_RECORD_BYTES || used + size > MAX_CHAIN_BYTES {
            return Err(CustodyError::LimitExceeded);
        }
        let mut frame = Vec::with_capacity(size);
        Read::by_ref(&mut file)
            .take((MAX_RECORD_BYTES + 1) as u64)
            .read_to_end(&mut frame)
            .map_err(|_| CustodyError::IoRejected)?;
        if frame.len() > MAX_RECORD_BYTES {
            return Err(CustodyError::LimitExceeded);
        }
        if frame.len() != size || association(prep, name, &file, self.owner, false)? != before {
            return Err(CustodyError::Changed);
        }
        Ok((frame, before))
    }

    fn append(&mut self, frame: &[u8]) -> Result<(), CustodyError> {
        if self.poisoned {
            return Err(CustodyError::Poisoned);
        }
        let result = self.append_inner(frame);
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }

    fn append_inner(&mut self, frame: &[u8]) -> Result<(), CustodyError> {
        if frame.len() > MAX_RECORD_BYTES {
            return Err(CustodyError::LimitExceeded);
        }
        let record = decode_record(frame).map_err(|_| CustodyError::InvalidJournal)?;
        if record.owner_uid != self.owner {
            return Err(CustodyError::InvalidJournal);
        }
        let snapshot = self.current_snapshot()?;
        if frame.len() > MAX_CHAIN_BYTES - snapshot.bytes {
            return Err(CustodyError::LimitExceeded);
        }
        let prior = snapshot
            .chains
            .iter()
            .find(|chain| chain.records[0].preparation_id == record.preparation_id);
        if let Some(chain) = prior {
            let last = chain.records.last().ok_or(CustodyError::InvalidJournal)?;
            validate_successor(last, &record).map_err(|_| CustodyError::InvalidJournal)?;
        } else if record.revision != 0 {
            return Err(CustodyError::InvalidJournal);
        } else if snapshot.chains.len() >= MAX_PREPARATIONS {
            return Err(CustodyError::LimitExceeded);
        }
        let prep = if prior.is_some() {
            open_directory(&self.root, &record.preparation_id)?
        } else {
            // No existing empty directory was accepted by the complete scan.
            mkdirat(&self.root, record.preparation_id.as_str(), Mode::S_IRWXU)
                .map_err(|_| CustodyError::IoRejected)?;
            let prep = open_directory(&self.root, &record.preparation_id)?;
            association(&self.root, &record.preparation_id, &prep, self.owner, true)?;
            prep.sync_all().map_err(|_| CustodyError::IoRejected)?;
            association(&self.root, &record.preparation_id, &prep, self.owner, true)?;
            self.root.sync_all().map_err(|_| CustodyError::IoRejected)?;
            self.check_root()?;
            prep
        };
        let name = format!("{:08}.json", record.revision);
        association(&self.root, &record.preparation_id, &prep, self.owner, true)?;
        let flags =
            OFlag::O_WRONLY | OFlag::O_CREAT | OFlag::O_EXCL | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW;
        let mut file = File::from(
            descend(&prep, &name, flags, Mode::S_IRUSR | Mode::S_IWUSR)
                .map_err(|_| CustodyError::IoRejected)?,
        );
        #[cfg(test)]
        if let Some(intervene) = self.post_revision_create_intervention.take() {
            // Induce real custody failure after exclusive create, before writing.
            intervene();
        }
        let identity = association(&prep, &name, &file, self.owner, false)?;
        let prep_stamp = association(&self.root, &record.preparation_id, &prep, self.owner, true)?;
        let root_stamp = self.check_root()?;
        file.write_all(frame)
            .map_err(|_| CustodyError::IoRejected)?;
        let verify = || {
            let current = association(&prep, &name, &file, self.owner, false)?;
            if !identity.same_identity(current)
                || usize::try_from(current.size).ok() != Some(frame.len())
                || association(&self.root, &record.preparation_id, &prep, self.owner, true)?
                    != prep_stamp
                || self.check_root()? != root_stamp
            {
                return Err(CustodyError::Changed);
            }
            Ok(current)
        };
        let written = verify()?;
        file.sync_all().map_err(|_| CustodyError::IoRejected)?;
        if verify()? != written {
            return Err(CustodyError::Changed);
        }
        prep.sync_all().map_err(|_| CustodyError::IoRejected)?;
        if verify()? != written {
            return Err(CustodyError::Changed);
        }
        let after = self.stable_snapshot()?;
        Self::validate_append_delta(
            &snapshot.state,
            &after.state,
            &record.preparation_id,
            record.revision,
            &journal_digest(&record).map_err(|_| CustodyError::InvalidJournal)?,
            written,
        )?;
        let persisted = after
            .chains
            .iter()
            .find(|chain| chain.records[0].preparation_id == record.preparation_id);
        if persisted.and_then(|chain| chain.records.last()) != Some(&record) {
            return Err(CustodyError::Changed);
        }
        self.baseline = Some(after.state);
        Ok(())
    }

    fn validate_append_delta(
        before: &RootState,
        after: &RootState,
        id: &str,
        revision: u8,
        commitment: &str,
        written: Stamp,
    ) -> Result<(), CustodyError> {
        let new_preparation = revision == 0;
        if new_preparation {
            let mut expected_identity = before.root;
            expected_identity.links = before
                .root
                .links
                .checked_add(1)
                .ok_or(CustodyError::Changed)?;
            if !expected_identity.same_identity(after.root) {
                return Err(CustodyError::Changed);
            }
        } else if before.root != after.root {
            return Err(CustodyError::Changed);
        }
        let extra = if new_preparation { 2 } else { 1 };
        if after.objects.len() != before.objects.len() + extra
            || after.commitments.len() != before.commitments.len() + usize::from(new_preparation)
        {
            return Err(CustodyError::Changed);
        }
        for prior in &before.objects {
            let current = after
                .objects
                .iter()
                .find(|node| {
                    node.preparation == prior.preparation && node.revision == prior.revision
                })
                .ok_or(CustodyError::Changed)?;
            if prior.preparation == id && prior.revision.is_none() {
                if !prior.stamp.same_identity(current.stamp) {
                    return Err(CustodyError::Changed);
                }
            } else if prior != current {
                return Err(CustodyError::Changed);
            }
        }
        let new_file = after
            .objects
            .iter()
            .find(|node| node.preparation == id && node.revision == Some(revision))
            .ok_or(CustodyError::Changed)?;
        if new_file.stamp != written {
            return Err(CustodyError::Changed);
        }
        for (preparation, digest) in &after.commitments {
            if preparation == id {
                if digest != commitment {
                    return Err(CustodyError::Changed);
                }
            } else if !before
                .commitments
                .contains(&(preparation.clone(), digest.clone()))
            {
                return Err(CustodyError::Changed);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
#[path = "headless_preparation_custody_tests.rs"]
mod tests;
