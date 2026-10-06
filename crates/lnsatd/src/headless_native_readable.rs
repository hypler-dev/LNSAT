//! Finite borrowed-descriptor samples, not associated-path custody or authority.

use super::{NativeError, acl::ParsedAcl};
#[cfg(target_os = "linux")]
use super::{acl::MAX_ACL_BYTES, procfs::ArtifactCheckpoint};
use std::fs::File;

#[derive(Eq, PartialEq)]
enum AclRead {
    /// ENODATA does not establish absence without the future authenticated recipe.
    UnclassifiedNoData,
    Present {
        raw: Vec<u8>,
        parsed: ParsedAcl,
    },
}

#[derive(Eq, PartialEq)]
pub(super) struct ReadableSample {
    #[cfg(target_os = "linux")]
    identity: Identity,
    access: AclRead,
    default: AclRead,
}

#[cfg(not(target_os = "linux"))]
pub(super) fn sample_readable(_file: &File) -> Result<ReadableSample, NativeError> {
    Err(NativeError::UnsupportedPlatform)
}

#[cfg(target_os = "linux")]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Identity {
    device: u64,
    inode: u64,
    uid: u32,
    gid: u32,
    mode: u32,
    links: u64,
    ctime_seconds: i64,
    ctime_nanoseconds: i64,
    filesystem_type: nix::sys::statfs::FsType,
}

#[cfg(target_os = "linux")]
fn check_artifact(checkpoint: Option<&ArtifactCheckpoint<'_>>) -> Result<(), NativeError> {
    if let Some(checkpoint) = checkpoint {
        checkpoint.check_native()?;
    }
    Ok(())
}

#[cfg(target_os = "linux")]
impl Identity {
    fn read(file: &File) -> Result<Self, NativeError> {
        Self::read_checked(file, None)
    }

    fn read_checked(
        file: &File,
        checkpoint: Option<&ArtifactCheckpoint<'_>>,
    ) -> Result<Self, NativeError> {
        use nix::sys::{stat::fstat, statfs::fstatfs};
        check_artifact(checkpoint)?;
        let stat = fstat(file);
        check_artifact(checkpoint)?;
        let stat = stat.map_err(|_| NativeError::ReadRejected)?;
        check_artifact(checkpoint)?;
        let fs = fstatfs(file);
        check_artifact(checkpoint)?;
        let fs = fs.map_err(|_| NativeError::ReadRejected)?;
        Ok(Self {
            device: stat.st_dev,
            inode: stat.st_ino,
            uid: stat.st_uid,
            gid: stat.st_gid,
            mode: stat.st_mode,
            links: stat.st_nlink,
            ctime_seconds: stat.st_ctime,
            ctime_nanoseconds: stat.st_ctime_nsec,
            filesystem_type: fs.filesystem_type(),
        })
    }

    fn require_same(self, other: Self) -> Result<(), NativeError> {
        if self != other {
            return Err(NativeError::ObjectChanged);
        }
        Ok(())
    }
}

#[cfg(target_os = "linux")]
pub(super) fn sample_readable(file: &File) -> Result<ReadableSample, NativeError> {
    sample_with_checkpoint(file, None)
}

#[cfg(target_os = "linux")]
pub(super) fn sample_artifact_readable(
    file: &File,
    checkpoint: &ArtifactCheckpoint<'_>,
) -> Result<ReadableSample, NativeError> {
    sample_with_checkpoint(file, Some(checkpoint))
}

#[cfg(target_os = "linux")]
fn sample_with_checkpoint(
    file: &File,
    checkpoint: Option<&ArtifactCheckpoint<'_>>,
) -> Result<ReadableSample, NativeError> {
    use nix::{
        fcntl::{FcntlArg, FdFlag, OFlag, fcntl},
        sys::stat::SFlag,
    };
    check_artifact(checkpoint)?;
    let open_flags = fcntl(file, FcntlArg::F_GETFL);
    check_artifact(checkpoint)?;
    let open_flags = OFlag::from_bits_retain(open_flags.map_err(|_| NativeError::ReadRejected)?);
    check_artifact(checkpoint)?;
    let fd_flags = fcntl(file, FcntlArg::F_GETFD);
    check_artifact(checkpoint)?;
    let fd_flags = FdFlag::from_bits_retain(fd_flags.map_err(|_| NativeError::ReadRejected)?);
    if open_flags.intersects(OFlag::O_PATH)
        || open_flags & OFlag::O_ACCMODE != OFlag::O_RDONLY
        || !fd_flags.contains(FdFlag::FD_CLOEXEC)
    {
        return Err(NativeError::InvalidDescriptor);
    }
    let identity = Identity::read_checked(file, checkpoint)?;
    let kind = SFlag::from_bits_retain(identity.mode) & SFlag::S_IFMT;
    if kind != SFlag::S_IFREG && kind != SFlag::S_IFDIR {
        return Err(NativeError::InvalidDescriptor);
    }
    let is_file = kind == SFlag::S_IFREG;
    let mut buffer = [0_u8; MAX_ACL_BYTES];
    let access = read_acl(
        file,
        c"system.posix_acl_access",
        identity,
        false,
        is_file,
        &mut buffer,
        checkpoint,
    )?;
    let default = read_acl(
        file,
        c"system.posix_acl_default",
        identity,
        true,
        is_file,
        &mut buffer,
        checkpoint,
    )?;
    let closing_access = read_acl(
        file,
        c"system.posix_acl_access",
        identity,
        false,
        is_file,
        &mut buffer,
        checkpoint,
    )?;
    let closing_default = read_acl(
        file,
        c"system.posix_acl_default",
        identity,
        true,
        is_file,
        &mut buffer,
        checkpoint,
    )?;
    if access != closing_access || default != closing_default {
        return Err(NativeError::ObjectChanged);
    }
    identity.require_same(Identity::read_checked(file, checkpoint)?)?;
    Ok(ReadableSample {
        identity,
        access,
        default,
    })
}

#[cfg(target_os = "linux")]
fn read_acl(
    file: &File,
    name: &std::ffi::CStr,
    identity: Identity,
    is_default: bool,
    is_file: bool,
    buffer: &mut [u8; MAX_ACL_BYTES],
    checkpoint: Option<&ArtifactCheckpoint<'_>>,
) -> Result<AclRead, NativeError> {
    identity.require_same(Identity::read_checked(file, checkpoint)?)?;
    // Initialized fixed buffer means rustix returns only the bounded byte count.
    // No size query, growth, retry or named-path fallback is available here.
    check_artifact(checkpoint)?;
    let result = rustix::fs::fgetxattr(file, name, &mut *buffer);
    check_artifact(checkpoint)?;
    identity.require_same(Identity::read_checked(file, checkpoint)?)?;
    match result {
        Err(rustix::io::Errno::NODATA) => Ok(AclRead::UnclassifiedNoData),
        Err(_) => Err(NativeError::ReadRejected),
        Ok(size) => {
            let raw = buffer.get(..size).ok_or(NativeError::LimitExceeded)?;
            let parsed = ParsedAcl::parse(raw)?;
            if is_default {
                if is_file {
                    return Err(NativeError::InvalidAcl);
                }
            } else {
                parsed.check_access_mode(identity.mode)?;
            }
            Ok(AclRead::Present {
                raw: raw.to_vec(),
                parsed,
            })
        }
    }
}

#[cfg(test)]
#[path = "headless_native_readable_tests.rs"]
mod tests;
