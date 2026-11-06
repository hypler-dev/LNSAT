//! Linux fixed storage calls. Returned owners stay in root slots on every error.

use super::{FileSlot, RootError, SlotState, StorageFrame};
use crate::selected_store::linux::{
    kernel_posix_filesystem,
    native::{Identity, REQUIRED, ancestor_valid, identity},
    owner_only_acl,
};
use rustix::fs::{AtFlags, CWD, Mode, OFlags};
use std::{
    fs::{self, File, OpenOptions},
    os::unix::fs::{MetadataExt, OpenOptionsExt},
    path::{Path, PathBuf},
};

fn stat(operation: &super::super::Operation, path: &Path) -> Result<rustix::fs::Statx, RootError> {
    let value = observed!(
        operation,
        rustix::fs::statx(CWD, path, AtFlags::SYMLINK_NOFOLLOW, REQUIRED)
    );
    if value.stx_mask & REQUIRED.bits() != REQUIRED.bits() || value.stx_mnt_id == 0 {
        return Err(RootError::Custody);
    }
    Ok(value)
}

fn held(operation: &super::super::Operation, file: &File) -> Result<Identity, RootError> {
    let filesystem = observed!(operation, rustix::fs::fstatfs(file));
    if !kernel_posix_filesystem(i128::from(filesystem.f_type), true) {
        return Err(RootError::Custody);
    }
    let value = observed!(
        operation,
        rustix::fs::statx(file, c"", AtFlags::EMPTY_PATH, REQUIRED)
    );
    if value.stx_mask & REQUIRED.bits() != REQUIRED.bits() || value.stx_mnt_id == 0 {
        return Err(RootError::Custody);
    }
    Ok(identity(&value))
}

fn persistent(operation: &super::super::Operation, file: &File) -> Result<(), RootError> {
    let filesystem = observed!(operation, rustix::fs::fstatfs(file));
    if !kernel_posix_filesystem(i128::from(filesystem.f_type), false) || filesystem.f_flags & 1 != 0
    {
        return Err(RootError::Custody);
    }
    Ok(())
}

fn private_name(
    operation: &super::super::Operation,
    path: &Path,
    uid: u32,
    directory: bool,
) -> Result<Identity, RootError> {
    let before = stat(operation, path)?;
    let metadata = observed!(operation, fs::symlink_metadata(path));
    super::validate(&metadata, uid, directory)?;
    if before.stx_ino != metadata.ino()
        || rustix::fs::makedev(before.stx_dev_major, before.stx_dev_minor) != metadata.dev()
        || u32::from(before.stx_mode) != metadata.mode()
    {
        return Err(RootError::Custody);
    }
    let mut buffer = [0_u8; 1024];
    operation.observe()?;
    let access = rustix::fs::lgetxattr(path, c"system.posix_acl_access", &mut buffer[..]);
    operation.returned()?;
    match access {
        Ok(length) => {
            owner_only_acl(&buffer[..length], directory).map_err(|_| RootError::Custody)?;
        }
        Err(rustix::io::Errno::NODATA) => (),
        Err(_) => return Err(RootError::Custody),
    }
    if directory {
        operation.observe()?;
        let default = rustix::fs::lgetxattr(path, c"system.posix_acl_default", &mut buffer[..]);
        operation.returned()?;
        if !matches!(default, Err(rustix::io::Errno::NODATA)) {
            return Err(RootError::Custody);
        }
    }
    let after = stat(operation, path)?;
    if identity(&before) != identity(&after)
        || before.stx_ctime.tv_sec != after.stx_ctime.tv_sec
        || before.stx_ctime.tv_nsec != after.stx_ctime.tv_nsec
    {
        return Err(RootError::Custody);
    }
    Ok(identity(&after))
}

// This private invocation is constructed only at the two fixed call sites.
// Production always selects literal /proc. Fixture paths and error modeling
// are erased from non-test builds; no caller-selected backend is exposed.
struct NamespaceCall<'a> {
    path: &'a Path,
    #[cfg(test)]
    fault: u8,
    #[cfg(test)]
    postchecks: &'a std::sync::atomic::AtomicU32,
}

fn namespace(
    operation: &super::super::Operation,
    slot: &mut FileSlot,
    call: &NamespaceCall<'_>,
) -> Result<PathBuf, RootError> {
    slot.reserve(operation)?;
    operation.observe()?;
    slot.issued()?;
    let opened = OpenOptions::new()
        .read(true)
        .custom_flags(
            (OFlags::NOFOLLOW | OFlags::DIRECTORY | OFlags::CLOEXEC)
                .bits()
                .cast_signed(),
        )
        .open(call.path);
    if let Ok(file) = opened {
        slot.publish(file);
    } else {
        slot.state = SlotState::Uncertain;
        let _live = operation.returned();
        #[cfg(test)]
        call.postchecks.fetch_add(1, super::super::Ordering::SeqCst);
        return Err(RootError::Custody);
    }
    operation.returned()?;
    let file = slot.owner.as_ref().ok_or(RootError::Rejected)?;
    let filesystem = observed!(operation, rustix::fs::fstatfs(file));
    if filesystem.f_type != 0x9fa0 {
        return Err(RootError::Custody);
    }
    let namespace = observed!(operation, fs::read_link("/proc/self/ns/mnt"));
    if namespace.as_os_str().len() > 64 {
        return Err(RootError::Custody);
    }
    // The pre-reserved cleanup is tied to this actual slot. Record issue before
    // consuming File; a failed close never reconstructs or retries the owner.
    slot.state = SlotState::RetirementIssued;
    slot.retirement_issued = true;
    let file = slot.owner.take().ok_or(RootError::Rejected)?;
    let returned = nix::unistd::close(file);
    #[cfg(test)]
    let returned = if call.fault == 15 {
        // One actual consuming close, followed by modeled return uncertainty.
        // This does not reproduce a physical kernel close-error campaign.
        returned.and(Err(nix::errno::Errno::EIO))
    } else {
        returned
    };
    if let Ok(()) = returned {
        slot.state = SlotState::Retired;
    } else {
        slot.state = SlotState::Uncertain;
        let _live = operation.returned();
        #[cfg(test)]
        call.postchecks.fetch_add(1, super::super::Ordering::SeqCst);
        return Err(RootError::Uncertain);
    }
    operation.returned()?;
    Ok(namespace)
}

impl StorageFrame<'_> {
    fn acquire_ancestors(&mut self, uid: u32) -> Result<(), RootError> {
        for index in 0..self.selection.ancestors.len() {
            let path = &self.selection.ancestors[index];
            // Capacity and vacancy are checked before native entry.
            self.owners.ancestors[index].reserve(self.operation)?;
            self.operation.observe()?;
            self.owners.ancestors[index].issued()?;
            if index == 0 {
                let returned = OpenOptions::new()
                    .read(true)
                    .custom_flags(
                        (OFlags::NOFOLLOW | OFlags::DIRECTORY | OFlags::CLOEXEC)
                            .bits()
                            .cast_signed(),
                    )
                    .open({
                        #[cfg(test)]
                        {
                            if self.root.fault.load(super::super::Ordering::SeqCst) == 13 {
                                self.selection.missing_path.as_path()
                            } else {
                                path.as_path()
                            }
                        }
                        #[cfg(not(test))]
                        {
                            path.as_path()
                        }
                    });
                if let Ok(file) = returned {
                    self.owners.ancestors[index].publish(file);
                } else {
                    self.owners.ancestors[index].state = SlotState::Uncertain;
                    let _live = self.operation.returned();
                    #[cfg(test)]
                    self.root
                        .owning_error_postchecks
                        .fetch_add(1, super::super::Ordering::SeqCst);
                    return Err(RootError::Custody);
                }
            } else {
                let name = path.file_name().ok_or(RootError::Rejected)?;
                let parent = self.owners.ancestors[index - 1]
                    .owner
                    .as_ref()
                    .ok_or(RootError::Rejected)?;
                #[cfg(test)]
                if self.root.fault.load(super::super::Ordering::SeqCst) == 14
                    && index + 1 == self.selection.ancestors.len()
                {
                    // Rename only this controlled fixture's owned directory.
                    // Actual retained parent/lease descriptors stay in root slots.
                    fs::rename(&self.selection.parent, &self.selection.moved_parent)
                        .expect("controlled last-ancestor name drift");
                }
                let returned = rustix::fs::openat(
                    parent,
                    name,
                    OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
                    Mode::empty(),
                );
                if let Ok(file) = returned {
                    self.owners.ancestors[index].publish(File::from(file));
                } else {
                    self.owners.ancestors[index].state = SlotState::Uncertain;
                    let _live = self.operation.returned();
                    #[cfg(test)]
                    self.root
                        .owning_error_postchecks
                        .fetch_add(1, super::super::Ordering::SeqCst);
                    return Err(RootError::Custody);
                }
            }
            self.operation.returned()?;
            let file = self.owners.ancestors[index]
                .owner
                .as_ref()
                .ok_or(RootError::Rejected)?;
            let value = held(self.operation, file)?;
            if !ancestor_valid(value, uid) || identity(&stat(self.operation, path)?) != value {
                return Err(RootError::Custody);
            }
            self.owners.linux.ancestor_identities[index] = Some(value);
        }
        Ok(())
    }

    fn verify_held_selection(&self, uid: u32) -> Result<(), RootError> {
        self.check_parent(uid)?;
        let lease_file = self
            .owners
            .lease
            .owner
            .as_ref()
            .ok_or(RootError::Rejected)?;
        let lease_metadata = observed!(self.operation, lease_file.metadata());
        let lease_named = observed!(self.operation, fs::symlink_metadata(&self.selection.lease));
        super::validate(&lease_metadata, uid, false)?;
        super::validate(&lease_named, uid, false)?;
        let expected_lease = self
            .owners
            .lease_identity
            .as_ref()
            .ok_or(RootError::Rejected)?;
        if &crate::selected_store::FileIdentity::of(&lease_metadata) != expected_lease
            || &crate::selected_store::FileIdentity::of(&lease_named) != expected_lease
        {
            return Err(RootError::Custody);
        }
        let named_database = observed!(
            self.operation,
            fs::symlink_metadata(&self.selection.database)
        );
        super::validate(&named_database, uid, false)?;
        if Some(crate::selected_store::FileIdentity::of(&named_database))
            != self.owners.database_identity
        {
            return Err(RootError::Custody);
        }
        Ok(())
    }

    pub(super) fn acquire_linux(&mut self, uid: u32) -> Result<(), RootError> {
        #[cfg(test)]
        let selection = self.selection;
        let proc_path = Path::new("/proc");
        #[cfg(test)]
        let proc_path = if self.root.fault.load(super::super::Ordering::SeqCst) == 12 {
            selection.missing_path.as_path()
        } else {
            proc_path
        };
        let call = NamespaceCall {
            path: proc_path,
            #[cfg(test)]
            fault: self.root.fault.load(super::super::Ordering::SeqCst),
            #[cfg(test)]
            postchecks: &self.root.owning_error_postchecks,
        };
        let initial = namespace(self.operation, &mut self.owners.proc_before, &call)?;
        self.owners.linux.namespace = Some(initial);
        self.acquire_ancestors(uid)?;
        let parent_file = self
            .owners
            .parent
            .owner
            .as_ref()
            .ok_or(RootError::Rejected)?;
        persistent(self.operation, parent_file)?;
        let parent = private_name(self.operation, &self.selection.parent, uid, true)?;
        let database = private_name(self.operation, &self.selection.database, uid, false)?;
        let lease = private_name(self.operation, &self.selection.lease, uid, false)?;
        let lease_file = self
            .owners
            .lease
            .owner
            .as_ref()
            .ok_or(RootError::Rejected)?;
        if held(self.operation, parent_file)? != parent
            || held(self.operation, lease_file)? != lease
        {
            return Err(RootError::Custody);
        }
        if parent.mount != database.mount || parent.mount != lease.mount {
            return Err(RootError::Custody);
        }

        let final_namespace = namespace(self.operation, &mut self.owners.proc_after, &call)?;
        if self.owners.linux.namespace.as_ref() != Some(&final_namespace) {
            return Err(RootError::Custody);
        }
        for (index, path) in self.selection.ancestors.iter().enumerate() {
            let file = self.owners.ancestors[index]
                .owner
                .as_ref()
                .ok_or(RootError::Rejected)?;
            let expected =
                self.owners.linux.ancestor_identities[index].ok_or(RootError::Rejected)?;
            if held(self.operation, file)? != expected
                || identity(&stat(self.operation, path)?) != expected
            {
                return Err(RootError::Custody);
            }
        }
        persistent(self.operation, parent_file)?;
        for (path, expected, directory) in [
            (&self.selection.parent, parent, true),
            (&self.selection.database, database, false),
            (&self.selection.lease, lease, false),
        ] {
            if private_name(self.operation, path, uid, directory)? != expected {
                return Err(RootError::Custody);
            }
        }
        self.verify_held_selection(uid)?;
        Ok(())
    }
}
