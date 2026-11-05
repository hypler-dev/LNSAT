//! Linux selected-write custody. The trusted kernel, root and current owner
//! remain inside the threat boundary; this does not contain hostile same-UID code.

use super::SelectedLocalStoreErrorV1 as Error;

/// Only a minimal owner-only ACL is accepted. Named entries and masks deny,
/// even when their current effective permissions happen to be zero.
fn owner_only_acl(bytes: &[u8], directory: bool) -> Result<(), Error> {
    if bytes.len() != 28 || bytes[..4] != 2_u32.to_le_bytes() {
        return Err(Error::InvalidSelection);
    }
    for (entry, (tag, permissions)) in bytes[4..].chunks_exact(8).zip([
        (1_u16, if directory { 7_u16 } else { 6_u16 }),
        (4, 0),
        (32, 0),
    ]) {
        if entry[..2] != tag.to_le_bytes()
            || entry[2..4] != permissions.to_le_bytes()
            || entry[4..] != u32::MAX.to_le_bytes()
        {
            return Err(Error::InvalidSelection);
        }
    }
    Ok(())
}

fn kernel_posix_filesystem(kind: i128, ancestor: bool) -> bool {
    matches!(kind, 0xef53 | 0x5846_5342 | 0x9123_683e) || (ancestor && kind == 0x0102_1994)
}

#[cfg(target_os = "linux")]
mod native {
    use super::{Error, kernel_posix_filesystem, owner_only_acl};
    use crate::selected_store::{FileIdentity, SelectedStoreCustodyV1, validate_metadata};
    use rustix::fs::{AtFlags, CWD, Mode, OFlags, StatxFlags};
    use std::{
        fs::{self, File, OpenOptions},
        os::unix::fs::{MetadataExt, OpenOptionsExt},
        path::{Component, Path, PathBuf},
    };

    const MAX_ANCESTORS: usize = 128;
    const MAX_ACL: usize = 1024;
    const REQUIRED: StatxFlags = StatxFlags::TYPE
        .union(StatxFlags::MODE)
        .union(StatxFlags::UID)
        .union(StatxFlags::GID)
        .union(StatxFlags::NLINK)
        .union(StatxFlags::INO)
        .union(StatxFlags::CTIME)
        .union(StatxFlags::MNT_ID);

    #[derive(Clone, Copy, Eq, PartialEq)]
    struct Identity {
        major: u32,
        minor: u32,
        inode: u64,
        mount: u64,
        uid: u32,
        gid: u32,
        mode: u16,
        links: u32,
    }

    fn stat(path: &Path) -> Result<rustix::fs::Statx, Error> {
        let value = rustix::fs::statx(CWD, path, AtFlags::SYMLINK_NOFOLLOW, REQUIRED)
            .map_err(|_| Error::CustodyChanged)?;
        if value.stx_mask & REQUIRED.bits() != REQUIRED.bits() || value.stx_mnt_id == 0 {
            return Err(Error::StoreUnverifiable);
        }
        Ok(value)
    }

    fn identity(value: &rustix::fs::Statx) -> Identity {
        Identity {
            major: value.stx_dev_major,
            minor: value.stx_dev_minor,
            inode: value.stx_ino,
            mount: value.stx_mnt_id,
            uid: value.stx_uid,
            gid: value.stx_gid,
            mode: value.stx_mode,
            links: if value.stx_mode & 0o170_000 == 0o040_000 {
                0
            } else {
                value.stx_nlink
            },
        }
    }

    // No main/WAL/SHM descriptor is opened, duplicated, owned or closed here.
    // Names are checked under the retained owner-private parent, then joined
    // to SQLite's in-place descriptors by SelectedStoreCustodyV1.
    fn private_name(path: &Path, uid: u32, directory: bool) -> Result<Identity, Error> {
        let before = stat(path)?;
        let metadata = fs::symlink_metadata(path).map_err(|_| Error::CustodyChanged)?;
        validate_metadata(&metadata, uid, directory)?;
        if before.stx_ino != metadata.ino()
            || rustix::fs::makedev(before.stx_dev_major, before.stx_dev_minor) != metadata.dev()
            || u32::from(before.stx_mode) != metadata.mode()
        {
            return Err(Error::CustodyChanged);
        }
        access_acl(path, directory)?;
        let after = stat(path)?;
        if identity(&before) != identity(&after)
            || before.stx_ctime.tv_sec != after.stx_ctime.tv_sec
            || before.stx_ctime.tv_nsec != after.stx_ctime.tv_nsec
        {
            return Err(Error::CustodyChanged);
        }
        Ok(identity(&after))
    }

    fn access_acl(path: &Path, directory: bool) -> Result<(), Error> {
        let mut buffer = [0_u8; MAX_ACL];
        match rustix::fs::lgetxattr(path, c"system.posix_acl_access", &mut buffer[..]) {
            Ok(length) => owner_only_acl(&buffer[..length], directory)?,
            // Explicit mode-only case on one of the admitted local POSIX-ACL
            // filesystems. ENOTSUP/EPERM and other failures are never absence.
            Err(rustix::io::Errno::NODATA) => (),
            Err(_) => return Err(Error::StoreUnverifiable),
        }
        if directory {
            match rustix::fs::lgetxattr(path, c"system.posix_acl_default", &mut buffer[..]) {
                Err(rustix::io::Errno::NODATA) => (),
                _ => return Err(Error::InvalidSelection),
            }
        }
        Ok(())
    }

    struct Ancestor {
        path: PathBuf,
        file: File,
        identity: Identity,
    }

    fn held_identity(file: &File) -> Result<Identity, Error> {
        // Ancestor mode/ACL-mask reasoning is valid only for kernel POSIX
        // filesystems. Reject remote/FUSE/overlay ancestors as well as stores.
        let fs = rustix::fs::fstatfs(file).map_err(|_| Error::StoreUnverifiable)?;
        if !kernel_posix_filesystem(i128::from(fs.f_type), true) {
            return Err(Error::InvalidSelection);
        }
        let value = rustix::fs::statx(file, c"", AtFlags::EMPTY_PATH, REQUIRED)
            .map_err(|_| Error::CustodyChanged)?;
        if value.stx_mask & REQUIRED.bits() != REQUIRED.bits() {
            return Err(Error::StoreUnverifiable);
        }
        Ok(identity(&value))
    }

    fn ancestor_valid(value: Identity, uid: u32) -> bool {
        value.mode & 0o170_000 == 0o040_000
            && (value.uid == 0 || value.uid == uid)
            && (value.mode & 0o022 == 0 || (value.uid == 0 && value.mode & 0o1000 != 0))
    }

    fn ancestors(path: &Path, uid: u32) -> Result<Vec<Ancestor>, Error> {
        let mut result: Vec<Ancestor> = Vec::new();
        let mut current = PathBuf::from("/");
        let root = OpenOptions::new()
            .read(true)
            .custom_flags(
                (OFlags::NOFOLLOW | OFlags::DIRECTORY | OFlags::CLOEXEC)
                    .bits()
                    .cast_signed(),
            )
            .open(&current)
            .map_err(|_| Error::InvalidSelection)?;
        result.push(Ancestor {
            path: current.clone(),
            identity: held_identity(&root)?,
            file: root,
        });
        for component in path.components().skip(1) {
            let Component::Normal(name) = component else {
                return Err(Error::InvalidSelection);
            };
            if result.len() >= MAX_ANCESTORS {
                return Err(Error::InvalidSelection);
            }
            let parent = result.last().ok_or(Error::InvalidSelection)?;
            let fd = rustix::fs::openat(
                &parent.file,
                name,
                OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
                Mode::empty(),
            )
            .map_err(|_| Error::InvalidSelection)?;
            let file = File::from(fd);
            current.push(name);
            let value = held_identity(&file)?;
            if !ancestor_valid(value, uid) || stat(&current).map(|v| identity(&v))? != value {
                return Err(Error::InvalidSelection);
            }
            result.push(Ancestor {
                path: current.clone(),
                file,
                identity: value,
            });
        }
        if !result.iter().all(|row| ancestor_valid(row.identity, uid)) {
            return Err(Error::InvalidSelection);
        }
        Ok(result)
    }

    fn namespace() -> Result<PathBuf, Error> {
        // Authenticate procfs before relying on its self-process namespace link.
        let proc_root = OpenOptions::new()
            .read(true)
            .custom_flags(
                (OFlags::NOFOLLOW | OFlags::DIRECTORY | OFlags::CLOEXEC)
                    .bits()
                    .cast_signed(),
            )
            .open("/proc")
            .map_err(|_| Error::StoreUnverifiable)?;
        if rustix::fs::fstatfs(&proc_root)
            .map_err(|_| Error::StoreUnverifiable)?
            .f_type
            != 0x9fa0
        {
            return Err(Error::StoreUnverifiable);
        }
        let value = fs::read_link("/proc/self/ns/mnt").map_err(|_| Error::StoreUnverifiable)?;
        if value.as_os_str().len() > 64 {
            return Err(Error::StoreUnverifiable);
        }
        Ok(value)
    }

    fn local_filesystem(file: &File) -> Result<(), Error> {
        let fs = rustix::fs::fstatfs(file).map_err(|_| Error::StoreUnverifiable)?;
        // Persistent local ext4, XFS and Btrfs only. Overlay, network, FUSE,
        // tmpfs and unknown filesystems require separate durability profiles.
        if !kernel_posix_filesystem(i128::from(fs.f_type), false) || fs.f_flags & 1 != 0 {
            return Err(Error::InvalidSelection);
        }
        Ok(())
    }

    pub(crate) struct LinuxCustody {
        ancestors: Vec<Ancestor>,
        namespace: PathBuf,
        parent: Identity,
        database: Identity,
        lease: Identity,
    }

    impl LinuxCustody {
        pub(crate) fn acquire(custody: &SelectedStoreCustodyV1) -> Result<Self, Error> {
            let namespace = namespace()?;
            let ancestors = ancestors(&custody.parent_path, custody.owner_uid)?;
            local_filesystem(&custody.parent_file)?;
            let parent = private_name(&custody.parent_path, custody.owner_uid, true)?;
            let database = private_name(&custody.database_path, custody.owner_uid, false)?;
            let lease = private_name(&custody.lease_path, custody.owner_uid, false)?;
            if database.mount != parent.mount || lease.mount != parent.mount {
                return Err(Error::InvalidSelection);
            }
            let result = Self {
                ancestors,
                namespace,
                parent,
                database,
                lease,
            };
            result.verify(custody)?;
            Ok(result)
        }

        pub(crate) fn verify(&self, custody: &SelectedStoreCustodyV1) -> Result<(), Error> {
            custody.verify()?;
            if namespace()? != self.namespace {
                return Err(Error::CustodyChanged);
            }
            for row in &self.ancestors {
                if held_identity(&row.file)? != row.identity
                    || identity(&stat(&row.path)?) != row.identity
                {
                    return Err(Error::CustodyChanged);
                }
            }
            local_filesystem(&custody.parent_file)?;
            for (path, expected, directory) in [
                (&custody.parent_path, self.parent, true),
                (&custody.database_path, self.database, false),
                (&custody.lease_path, self.lease, false),
            ] {
                if private_name(path, custody.owner_uid, directory)? != expected {
                    return Err(Error::CustodyChanged);
                }
            }
            Ok(())
        }

        pub(crate) fn sidecars(
            &self,
            custody: &SelectedStoreCustodyV1,
        ) -> Result<[Option<FileIdentity>; 2], Error> {
            self.verify(custody)?;
            let name = custody
                .database_path
                .file_name()
                .and_then(|s| s.to_str())
                .ok_or(Error::InvalidSelection)?;
            let mut identities = [None, None];
            for (index, suffix) in ["-wal", "-shm", "-journal"].into_iter().enumerate() {
                let path = custody.parent_path.join(format!("{name}{suffix}"));
                match fs::symlink_metadata(&path) {
                    Ok(_) if index == 2 => return Err(Error::CustodyChanged),
                    Ok(metadata) => {
                        let observed = private_name(&path, custody.owner_uid, false)?;
                        if observed.mount != self.parent.mount {
                            return Err(Error::CustodyChanged);
                        }
                        identities[index] = Some(FileIdentity::of(&metadata));
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
                    Err(_) => return Err(Error::CustodyChanged),
                }
            }
            self.verify(custody)?;
            Ok(identities)
        }
    }
}

#[cfg(target_os = "linux")]
pub(super) use native::LinuxCustody;

#[cfg(test)]
mod tests {
    use super::*;

    fn acl(directory: bool) -> Vec<u8> {
        let mut bytes = 2_u32.to_le_bytes().to_vec();
        for (tag, permissions) in [(1_u16, if directory { 7_u16 } else { 6 }), (4, 0), (32, 0)] {
            bytes.extend(tag.to_le_bytes());
            bytes.extend(permissions.to_le_bytes());
            bytes.extend(u32::MAX.to_le_bytes());
        }
        bytes
    }

    #[test]
    fn linux_custody_filesystem_profile_rejects_unknown_remote_and_fuse_ancestors() {
        for kind in [0xef53, 0x5846_5342, 0x9123_683e] {
            assert!(kernel_posix_filesystem(kind, true));
            assert!(kernel_posix_filesystem(kind, false));
        }
        assert!(kernel_posix_filesystem(0x0102_1994, true));
        assert!(!kernel_posix_filesystem(0x0102_1994, false));
        for kind in [
            -1,
            0,
            1,
            i128::MAX,
            0x6969,
            0x6573_5546,
            0x794c_7630,
            0x9fa0,
            0x517b,
        ] {
            assert!(!kernel_posix_filesystem(kind, true), "{kind}");
            assert!(!kernel_posix_filesystem(kind, false), "{kind}");
        }
    }

    #[test]
    fn linux_custody_acl_exact_owner_only_modes() {
        assert_eq!(owner_only_acl(&acl(true), true), Ok(()));
        assert_eq!(owner_only_acl(&acl(false), false), Ok(()));
        assert!(owner_only_acl(&acl(true), false).is_err());
        assert!(owner_only_acl(&acl(false), true).is_err());
    }

    #[test]
    fn linux_custody_acl_rejects_every_byte_mutation_and_extra_entries() {
        for directory in [true, false] {
            let baseline = acl(directory);
            for index in 0..baseline.len() {
                let mut bad = baseline.clone();
                bad[index] ^= 0x80;
                assert!(owner_only_acl(&bad, directory).is_err(), "{index}");
            }
            for length in 0..baseline.len() {
                assert!(owner_only_acl(&baseline[..length], directory).is_err());
            }
            let mut extended = baseline;
            extended.extend([0; 8]);
            assert!(owner_only_acl(&extended, directory).is_err());
        }
    }
}
