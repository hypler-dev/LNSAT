//! Fail-closed macOS/Linux Unix-socket identity and path checks.

use nix::errno::Errno;
use nix::fcntl::{FcntlArg, FdFlag, OFlag, fcntl};
use nix::poll::{PollFd, PollFlags, PollTimeout, poll};
use nix::sys::socket::{
    AddressFamily, SockFlag, SockType, UnixAddr, connect, getsockopt, socket, sockopt,
};
use nix::unistd::Uid;
use std::fs::{self, Metadata, Permissions};
use std::io;
use std::os::fd::{AsFd, AsRawFd};
use std::os::unix::fs::{FileTypeExt, MetadataExt, PermissionsExt};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

/// Exact HTTP/1.1 framing host for authenticated Unix-socket reads.
pub(crate) const LOCAL_UNIX_SOCKET_HOST_V1: &str = "lnsatd";

/// Public-safe local Unix-socket failure classes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum LocalUnixSocketErrorV1 {
    PathInvalid,
    Unavailable,
    TemporaryFailure,
    IdentityRejected,
}

#[derive(Clone, Copy)]
struct FilesystemIdentityV1 {
    device: u64,
    inode: u64,
    owner: u32,
    mode: u32,
}

impl FilesystemIdentityV1 {
    fn from_metadata(metadata: &Metadata) -> Self {
        Self {
            device: metadata.dev(),
            inode: metadata.ino(),
            owner: metadata.uid(),
            mode: metadata.mode(),
        }
    }

    fn matches(self, other: Self) -> bool {
        self.same_object(other) && self.mode == other.mode
    }

    fn same_object(self, other: Self) -> bool {
        self.device == other.device && self.inode == other.inode && self.owner == other.owner
    }
}

/// Bound listener whose exact socket pathname is removed only while identity matches.
pub(crate) struct SecureUnixListenerV1 {
    listener: UnixListener,
    _cleanup: UnixSocketCleanupV1,
}

impl SecureUnixListenerV1 {
    pub(crate) fn bind(path: &Path) -> Result<Self, LocalUnixSocketErrorV1> {
        if !crate::valid_control_socket_path_v1(path) {
            return Err(LocalUnixSocketErrorV1::PathInvalid);
        }
        let effective_uid = effective_uid_v1();
        let parent_before = validate_private_parent_v1(path, effective_uid)?;
        match fs::symlink_metadata(path) {
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Ok(_) => return Err(LocalUnixSocketErrorV1::IdentityRejected),
            Err(_) => return Err(LocalUnixSocketErrorV1::Unavailable),
        }

        let listener = UnixListener::bind(path).map_err(|error| map_io_error_v1(&error))?;
        let initial_identity = validate_socket_identity_v1(path, effective_uid, false)?;
        let mut cleanup = UnixSocketCleanupV1 {
            path: path.to_path_buf(),
            identity: initial_identity,
        };
        fs::set_permissions(path, Permissions::from_mode(0o600))
            .map_err(|error| map_io_error_v1(&error))?;
        let after_metadata = fs::symlink_metadata(path).map_err(|error| map_io_error_v1(&error))?;
        let after_identity = FilesystemIdentityV1::from_metadata(&after_metadata);
        if initial_identity.same_object(after_identity) {
            cleanup.identity = after_identity;
        }
        let socket_after = validate_socket_identity_v1(path, effective_uid, true)?;
        let parent_after = validate_private_parent_v1(path, effective_uid)?;
        if !initial_identity.same_object(socket_after) {
            return Err(LocalUnixSocketErrorV1::IdentityRejected);
        }
        if !parent_before.matches(parent_after) {
            return Err(LocalUnixSocketErrorV1::IdentityRejected);
        }
        Ok(Self {
            listener,
            _cleanup: cleanup,
        })
    }

    pub(crate) fn try_clone(&self) -> Result<UnixListener, LocalUnixSocketErrorV1> {
        self.listener
            .try_clone()
            .map_err(|error| map_io_error_v1(&error))
    }
}

struct UnixSocketCleanupV1 {
    path: PathBuf,
    identity: FilesystemIdentityV1,
}

impl Drop for UnixSocketCleanupV1 {
    fn drop(&mut self) {
        let Ok(metadata) = fs::symlink_metadata(&self.path) else {
            return;
        };
        if metadata.file_type().is_socket()
            && self
                .identity
                .matches(FilesystemIdentityV1::from_metadata(&metadata))
        {
            let _ = fs::remove_file(&self.path);
        }
    }
}

/// Connects with one absolute deadline and proves path plus server effective UID.
pub(crate) fn connect_secure_unix_socket_v1(
    path: &Path,
    timeout: Duration,
) -> Result<UnixStream, LocalUnixSocketErrorV1> {
    if !crate::valid_control_socket_path_v1(path) {
        return Err(LocalUnixSocketErrorV1::PathInvalid);
    }
    let effective_uid = effective_uid_v1();
    let parent_before = validate_private_parent_v1(path, effective_uid)?;
    let socket_before = validate_socket_identity_v1(path, effective_uid, true)?;
    let address = UnixAddr::new(path).map_err(|_| LocalUnixSocketErrorV1::PathInvalid)?;
    let descriptor = socket(
        AddressFamily::Unix,
        SockType::Stream,
        SockFlag::empty(),
        None,
    )
    .map_err(map_nix_error_v1)?;
    configure_connect_descriptor_v1(&descriptor)?;
    match connect(descriptor.as_raw_fd(), &address) {
        Ok(()) => {}
        Err(Errno::EINPROGRESS | Errno::EAGAIN) => {
            wait_for_connect_v1(&descriptor, timeout)?;
        }
        Err(error) => return Err(map_nix_error_v1(error)),
    }
    let socket_error = getsockopt(&descriptor, sockopt::SocketError).map_err(map_nix_error_v1)?;
    if socket_error != 0 {
        return Err(LocalUnixSocketErrorV1::Unavailable);
    }
    let stream = UnixStream::from(descriptor);
    stream
        .set_nonblocking(false)
        .map_err(|error| map_io_error_v1(&error))?;
    validate_peer_uid_v1(&stream)?;
    let socket_after = validate_socket_identity_v1(path, effective_uid, true)?;
    let parent_after = validate_private_parent_v1(path, effective_uid)?;
    if !socket_before.matches(socket_after) || !parent_before.matches(parent_after) {
        return Err(LocalUnixSocketErrorV1::IdentityRejected);
    }
    Ok(stream)
}

fn configure_connect_descriptor_v1(descriptor: &impl AsFd) -> Result<(), LocalUnixSocketErrorV1> {
    let descriptor_flags = fcntl(descriptor, FcntlArg::F_GETFD).map_err(map_nix_error_v1)?;
    let descriptor_flags = FdFlag::from_bits_truncate(descriptor_flags) | FdFlag::FD_CLOEXEC;
    fcntl(descriptor, FcntlArg::F_SETFD(descriptor_flags)).map_err(map_nix_error_v1)?;
    let status_flags = fcntl(descriptor, FcntlArg::F_GETFL).map_err(map_nix_error_v1)?;
    let status_flags = OFlag::from_bits_truncate(status_flags) | OFlag::O_NONBLOCK;
    fcntl(descriptor, FcntlArg::F_SETFL(status_flags)).map_err(map_nix_error_v1)?;
    Ok(())
}

/// Proves an accepted client has the daemon process effective UID.
pub(crate) fn validate_peer_uid_v1(stream: &UnixStream) -> Result<(), LocalUnixSocketErrorV1> {
    let peer_uid = peer_uid_v1(stream)?;
    if peer_uid == effective_uid_v1() {
        Ok(())
    } else {
        Err(LocalUnixSocketErrorV1::IdentityRejected)
    }
}

fn wait_for_connect_v1(
    descriptor: &impl AsFd,
    timeout: Duration,
) -> Result<(), LocalUnixSocketErrorV1> {
    let deadline = Instant::now()
        .checked_add(timeout)
        .ok_or(LocalUnixSocketErrorV1::TemporaryFailure)?;
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(LocalUnixSocketErrorV1::TemporaryFailure);
        }
        let poll_timeout = PollTimeout::try_from(remaining)
            .map_err(|_| LocalUnixSocketErrorV1::TemporaryFailure)?;
        let mut descriptors = [PollFd::new(descriptor.as_fd(), PollFlags::POLLOUT)];
        match poll(&mut descriptors, poll_timeout) {
            Ok(0) => return Err(LocalUnixSocketErrorV1::TemporaryFailure),
            Ok(_) => return Ok(()),
            Err(Errno::EINTR) => {}
            Err(error) => return Err(map_nix_error_v1(error)),
        }
    }
}

fn validate_private_parent_v1(
    path: &Path,
    effective_uid: u32,
) -> Result<FilesystemIdentityV1, LocalUnixSocketErrorV1> {
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .ok_or(LocalUnixSocketErrorV1::PathInvalid)?;
    let canonical_parent = fs::canonicalize(parent).map_err(|error| map_io_error_v1(&error))?;
    if canonical_parent != parent {
        return Err(LocalUnixSocketErrorV1::IdentityRejected);
    }
    let metadata = fs::symlink_metadata(parent).map_err(|error| map_io_error_v1(&error))?;
    if metadata.file_type().is_symlink()
        || !metadata.is_dir()
        || metadata.uid() != effective_uid
        || metadata.mode() & 0o7777 != 0o700
    {
        return Err(LocalUnixSocketErrorV1::IdentityRejected);
    }
    Ok(FilesystemIdentityV1::from_metadata(&metadata))
}

fn validate_socket_identity_v1(
    path: &Path,
    effective_uid: u32,
    require_private_mode: bool,
) -> Result<FilesystemIdentityV1, LocalUnixSocketErrorV1> {
    let metadata = fs::symlink_metadata(path).map_err(|error| map_io_error_v1(&error))?;
    if metadata.file_type().is_symlink()
        || !metadata.file_type().is_socket()
        || metadata.uid() != effective_uid
        || (require_private_mode && metadata.mode() & 0o7777 != 0o600)
    {
        return Err(LocalUnixSocketErrorV1::IdentityRejected);
    }
    Ok(FilesystemIdentityV1::from_metadata(&metadata))
}

fn effective_uid_v1() -> u32 {
    Uid::effective().as_raw()
}

#[cfg(target_os = "linux")]
fn peer_uid_v1(stream: &UnixStream) -> Result<u32, LocalUnixSocketErrorV1> {
    getsockopt(stream, sockopt::PeerCredentials)
        .map(|credentials| credentials.uid())
        .map_err(map_nix_error_v1)
}

#[cfg(target_os = "macos")]
fn peer_uid_v1(stream: &UnixStream) -> Result<u32, LocalUnixSocketErrorV1> {
    getsockopt(stream, sockopt::LocalPeerCred)
        .map(|credentials| credentials.uid())
        .map_err(map_nix_error_v1)
}

fn map_io_error_v1(error: &io::Error) -> LocalUnixSocketErrorV1 {
    match error.kind() {
        io::ErrorKind::TimedOut | io::ErrorKind::WouldBlock => {
            LocalUnixSocketErrorV1::TemporaryFailure
        }
        io::ErrorKind::InvalidInput => LocalUnixSocketErrorV1::PathInvalid,
        _ => LocalUnixSocketErrorV1::Unavailable,
    }
}

fn map_nix_error_v1(error: Errno) -> LocalUnixSocketErrorV1 {
    match error {
        Errno::ETIMEDOUT | Errno::EWOULDBLOCK => LocalUnixSocketErrorV1::TemporaryFailure,
        Errno::ENAMETOOLONG | Errno::EINVAL => LocalUnixSocketErrorV1::PathInvalid,
        _ => LocalUnixSocketErrorV1::Unavailable,
    }
}
