//! Private held-descriptor artifact reads. This module has no product caller.

use super::super::NativeError;
#[cfg(target_os = "linux")]
use super::super::readable::sample_artifact_readable;
use super::{Attempt, CleanupAccounting, DispatchStatus, LaneRoot, checked_deadline};
#[cfg(target_os = "linux")]
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    num::NonZeroU64,
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::Instant,
};
use zeroize::Zeroizing;

const MANIFEST_LIMIT: u64 = 64 * 1024;
const OCI_LIMIT: u64 = 1024 * 1024;
const ARTIFACT_LIMIT: u64 = 256 * 1024 * 1024;
const ARTIFACT_OCI_LIMIT: u64 = 1024 * 1024 * 1024;
const READ_CHUNK: usize = 64 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum ArtifactReadPurpose {
    RootManifest,
    OciBody,
    ArtifactSnapshot,
}

impl ArtifactReadPurpose {
    const fn limit(self) -> u64 {
        match self {
            Self::RootManifest => MANIFEST_LIMIT,
            Self::OciBody => OCI_LIMIT,
            Self::ArtifactSnapshot => ARTIFACT_LIMIT,
        }
    }

    const fn retains_body(self) -> bool {
        matches!(self, Self::RootManifest | Self::OciBody)
    }

    const fn uses_artifact_allowance(self) -> bool {
        !matches!(self, Self::RootManifest)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum ArtifactError {
    UnsupportedPlatform,
    InvalidDescriptor,
    InvalidLength,
    ReadRejected,
    ObjectChanged,
    LimitExceeded,
    StorageUnavailable,
    BudgetExhausted,
    ObservationInvalid,
    AssociationRejected,
    CleanupUncertain,
}

impl ArtifactError {
    pub(super) const fn code(self) -> &'static str {
        match self {
            Self::UnsupportedPlatform => "native_artifact.unsupported_platform",
            Self::InvalidDescriptor => "native_artifact.invalid_descriptor",
            Self::InvalidLength => "native_artifact.invalid_length",
            Self::ReadRejected => "native_artifact.read_rejected",
            Self::ObjectChanged => "native_artifact.object_changed",
            Self::LimitExceeded => "native_artifact.limit_exceeded",
            Self::StorageUnavailable => "native_artifact.storage_unavailable",
            Self::BudgetExhausted => "native_artifact.budget_exhausted",
            Self::ObservationInvalid => "native_artifact.observation_invalid",
            Self::AssociationRejected => "native_artifact.association_rejected",
            Self::CleanupUncertain => "native_artifact.cleanup_uncertain",
        }
    }

    const fn from_native(error: NativeError) -> Self {
        match error {
            NativeError::UnsupportedPlatform => Self::UnsupportedPlatform,
            NativeError::InvalidDescriptor => Self::InvalidDescriptor,
            NativeError::ReadRejected | NativeError::InvalidAcl | NativeError::ModeMismatch => {
                Self::ReadRejected
            }
            NativeError::ObjectChanged => Self::ObjectChanged,
            NativeError::LimitExceeded => Self::LimitExceeded,
        }
    }
}

pub(super) struct ArtifactBudgetState {
    pub(super) deadline: Instant,
    all_content: AtomicU64,
    artifact_oci_content: AtomicU64,
    invalid: AtomicBool,
    manifest_claimed: AtomicBool,
}

impl ArtifactBudgetState {
    pub(super) fn valid(&self) -> Result<(), ArtifactError> {
        if self.invalid.load(Ordering::SeqCst) {
            return Err(ArtifactError::ObservationInvalid);
        }
        if Instant::now() >= self.deadline {
            self.invalidate();
            return Err(ArtifactError::BudgetExhausted);
        }
        Ok(())
    }

    pub(super) fn invalidate(&self) {
        self.invalid.store(true, Ordering::SeqCst);
    }

    pub(super) fn claim_manifest(&self) -> Result<(), ArtifactError> {
        self.manifest_claimed
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map(|_| ())
            .map_err(|_| {
                self.invalidate();
                ArtifactError::ObservationInvalid
            })
    }

    fn charge(&self, purpose: ArtifactReadPurpose, count: usize) -> Result<(), ArtifactError> {
        let Ok(count) = u64::try_from(count) else {
            self.invalidate();
            return Err(ArtifactError::LimitExceeded);
        };
        if self
            .all_content
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |old| {
                old.checked_add(count)
            })
            .is_err()
        {
            self.invalidate();
            return Err(ArtifactError::LimitExceeded);
        }
        if purpose.uses_artifact_allowance() {
            let result =
                self.artifact_oci_content
                    .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |old| {
                        old.checked_add(count)
                            .filter(|next| *next <= ARTIFACT_OCI_LIMIT)
                    });
            if result.is_err() {
                self.invalidate();
                return Err(ArtifactError::LimitExceeded);
            }
        }
        Ok(())
    }

    fn remaining(&self, purpose: ArtifactReadPurpose) -> Result<u64, ArtifactError> {
        if !purpose.uses_artifact_allowance() {
            return Ok(u64::MAX);
        }
        if let Some(remaining) =
            ARTIFACT_OCI_LIMIT.checked_sub(self.artifact_oci_content.load(Ordering::SeqCst))
        {
            Ok(remaining)
        } else {
            self.invalidate();
            Err(ArtifactError::LimitExceeded)
        }
    }
}

/// The owner creates this once; it has no reset or clone operation.
pub(super) struct ArtifactReadBudget {
    state: Arc<ArtifactBudgetState>,
}

impl ArtifactReadBudget {
    pub(super) fn begin(enclosing_deadline: Instant) -> Result<Self, ArtifactError> {
        let deadline = checked_deadline(Instant::now(), enclosing_deadline)
            .map_err(|_| ArtifactError::BudgetExhausted)?;
        Ok(Self {
            state: Arc::new(ArtifactBudgetState {
                deadline,
                all_content: AtomicU64::new(0),
                artifact_oci_content: AtomicU64::new(0),
                invalid: AtomicBool::new(false),
                manifest_claimed: AtomicBool::new(false),
            }),
        })
    }

    fn owns(&self, state: &Arc<ArtifactBudgetState>) -> bool {
        Arc::ptr_eq(&self.state, state)
    }
}

/// Non-clone owner for a held original descriptor and its one budget.
pub(super) struct OwnedArtifactCustody {
    file: Arc<File>,
    budget: Arc<ArtifactBudgetState>,
}

impl OwnedArtifactCustody {
    pub(super) fn from_file(file: File, budget: &ArtifactReadBudget) -> Self {
        Self {
            file: Arc::new(file),
            budget: Arc::clone(&budget.state),
        }
    }
}

pub(super) struct ArtifactRequest {
    pub(super) file: Arc<File>,
    pub(super) budget: Arc<ArtifactBudgetState>,
    pub(super) purpose: ArtifactReadPurpose,
    pub(super) expected_length: u64,
}

struct ArtifactUnwindGuard<'a> {
    budget: &'a ArtifactBudgetState,
    complete: bool,
}

impl Drop for ArtifactUnwindGuard<'_> {
    fn drop(&mut self) {
        if !self.complete {
            self.budget.invalidate();
        }
    }
}

impl ArtifactRequest {
    pub(super) fn check_input(&self) -> Result<(), ArtifactError> {
        self.budget.valid()?;
        if self.expected_length == 0 || self.expected_length > self.purpose.limit() {
            return Err(ArtifactError::InvalidLength);
        }
        if self.purpose.uses_artifact_allowance()
            && self.expected_length > self.budget.remaining(self.purpose)?
        {
            return Err(ArtifactError::LimitExceeded);
        }
        Ok(())
    }
}

#[cfg(target_os = "linux")]
fn checkpoint(
    lane: &LaneRoot,
    token: NonZeroU64,
    deadline: Instant,
    budget: &ArtifactBudgetState,
) -> Result<(), ArtifactError> {
    super::ArtifactCheckpoint {
        lane,
        token,
        deadline,
        budget,
    }
    .check()
}

struct ArtifactIdentity {
    device: u64,
    inode: u64,
    mode: u32,
    uid: u32,
    gid: u32,
    links: u64,
    size: u64,
    mtime_seconds: i64,
    mtime_nanoseconds: i64,
    ctime_seconds: i64,
    ctime_nanoseconds: i64,
    filesystem_type: i64,
    descriptor_flags: i32,
    status_flags: i32,
}

// Native stat integer aliases differ between supported Linux ABIs. Keep every
// conversion checked without assuming one target's typedef widths.
#[cfg(target_os = "linux")]
fn native_integer<T, U>(value: T) -> Result<U, ArtifactError>
where
    T: TryInto<U>,
{
    value
        .try_into()
        .map_err(|_| ArtifactError::InvalidDescriptor)
}

#[cfg(target_os = "linux")]
impl ArtifactIdentity {
    fn read(
        file: &File,
        lane: &LaneRoot,
        token: NonZeroU64,
        deadline: Instant,
        budget: &ArtifactBudgetState,
    ) -> Result<Self, ArtifactError> {
        use nix::{
            fcntl::{FcntlArg, fcntl},
            sys::{stat::fstat, statfs::fstatfs},
        };
        checkpoint(lane, token, deadline, budget)?;
        let descriptor_flags = fcntl(file, FcntlArg::F_GETFD);
        checkpoint(lane, token, deadline, budget)?;
        let descriptor_flags = descriptor_flags.map_err(|_| ArtifactError::InvalidDescriptor)?;
        checkpoint(lane, token, deadline, budget)?;
        let status_flags = fcntl(file, FcntlArg::F_GETFL);
        checkpoint(lane, token, deadline, budget)?;
        let status_flags = status_flags.map_err(|_| ArtifactError::InvalidDescriptor)?;
        checkpoint(lane, token, deadline, budget)?;
        let stat = fstat(file);
        checkpoint(lane, token, deadline, budget)?;
        let stat = stat.map_err(|_| ArtifactError::ReadRejected)?;
        checkpoint(lane, token, deadline, budget)?;
        let filesystem = fstatfs(file);
        checkpoint(lane, token, deadline, budget)?;
        let filesystem = filesystem.map_err(|_| ArtifactError::ReadRejected)?;
        Ok(Self {
            device: native_integer(stat.st_dev)?,
            inode: native_integer(stat.st_ino)?,
            mode: native_integer(stat.st_mode)?,
            uid: native_integer(stat.st_uid)?,
            gid: native_integer(stat.st_gid)?,
            links: native_integer(stat.st_nlink)?,
            size: u64::try_from(stat.st_size).map_err(|_| ArtifactError::InvalidLength)?,
            mtime_seconds: native_integer(stat.st_mtime)?,
            mtime_nanoseconds: native_integer(stat.st_mtime_nsec)?,
            ctime_seconds: native_integer(stat.st_ctime)?,
            ctime_nanoseconds: native_integer(stat.st_ctime_nsec)?,
            filesystem_type: native_integer(filesystem.filesystem_type().0)?,
            descriptor_flags,
            status_flags,
        })
    }

    fn validate(&self, expected_length: u64) -> Result<(), ArtifactError> {
        let largefile = i32::try_from(rustix::fs::OFlags::LARGEFILE.bits())
            .map_err(|_| ArtifactError::UnsupportedPlatform)?;
        if largefile == 0
            || self.descriptor_flags != nix::libc::FD_CLOEXEC
            || self.status_flags & nix::libc::O_ACCMODE != nix::libc::O_RDONLY
            || self.status_flags & !(largefile | nix::libc::O_NOFOLLOW) != 0
            || self.mode & nix::libc::S_IFMT != nix::libc::S_IFREG
            || self.links != 1
            || self.filesystem_type != 0xef53
            || self.size != expected_length
        {
            return Err(ArtifactError::InvalidDescriptor);
        }
        Ok(())
    }
}

impl PartialEq for ArtifactIdentity {
    fn eq(&self, other: &Self) -> bool {
        self.device == other.device
            && self.inode == other.inode
            && self.mode == other.mode
            && self.uid == other.uid
            && self.gid == other.gid
            && self.links == other.links
            && self.size == other.size
            && self.mtime_seconds == other.mtime_seconds
            && self.mtime_nanoseconds == other.mtime_nanoseconds
            && self.ctime_seconds == other.ctime_seconds
            && self.ctime_nanoseconds == other.ctime_nanoseconds
            && self.filesystem_type == other.filesystem_type
            && self.descriptor_flags == other.descriptor_flags
            && self.status_flags == other.status_flags
    }
}

impl Eq for ArtifactIdentity {}

pub(super) struct UnverifiedArtifactRead {
    budget: Arc<ArtifactBudgetState>,
    token: NonZeroU64,
    purpose: ArtifactReadPurpose,
    identity: ArtifactIdentity,
    length: u64,
    digest: Zeroizing<[u8; 32]>,
    body: Option<Zeroizing<Vec<u8>>>,
}

struct ArtifactFacts<'a> {
    purpose: ArtifactReadPurpose,
    identity: &'a ArtifactIdentity,
    length: u64,
    digest: &'a [u8; 32],
    body: Option<&'a [u8]>,
}

impl UnverifiedArtifactRead {
    fn check_context(
        &self,
        budget: &ArtifactReadBudget,
        token: NonZeroU64,
    ) -> Result<ArtifactFacts<'_>, ArtifactError> {
        if self.token != token || !budget.owns(&self.budget) {
            self.budget.invalidate();
            return Err(ArtifactError::AssociationRejected);
        }
        self.budget.valid()?;
        Ok(ArtifactFacts {
            purpose: self.purpose,
            identity: &self.identity,
            length: self.length,
            digest: &self.digest,
            body: self.body.as_deref().map(Vec::as_slice),
        })
    }
}

pub(super) struct ArtifactAttempt {
    attempt: Attempt,
    budget: Arc<ArtifactBudgetState>,
}

impl ArtifactAttempt {
    pub(super) fn try_prepare(
        custody: &OwnedArtifactCustody,
        purpose: ArtifactReadPurpose,
        expected_length: u64,
    ) -> Result<Option<Self>, ArtifactError> {
        if !cfg!(all(target_os = "linux", target_has_atomic = "64")) {
            custody.budget.invalidate();
            return Err(ArtifactError::UnsupportedPlatform);
        }
        let request = ArtifactRequest {
            file: Arc::clone(&custody.file),
            budget: Arc::clone(&custody.budget),
            purpose,
            expected_length,
        };
        if let Err(error) = request.check_input() {
            custody.budget.invalidate();
            return Err(error);
        }
        match Attempt::try_prepare_artifact(request) {
            Ok(Some(attempt)) => Ok(Some(Self {
                attempt,
                budget: Arc::clone(&custody.budget),
            })),
            Ok(None) => Ok(None),
            Err(error) => {
                custody.budget.invalidate();
                Err(error)
            }
        }
    }

    pub(super) fn dispatch(&mut self) -> Result<DispatchStatus, ArtifactError> {
        self.attempt.dispatch_artifact(&self.budget)
    }

    pub(super) fn poll(&mut self) -> Result<Option<UnverifiedArtifactRead>, ArtifactError> {
        self.attempt.poll_artifact(&self.budget)
    }
}

impl Drop for ArtifactAttempt {
    fn drop(&mut self) {
        if self.attempt.armed {
            self.budget.invalidate();
        }
    }
}

pub(super) fn retire(
    lane: &LaneRoot,
    request: ArtifactRequest,
    accounting: &mut CleanupAccounting,
) {
    #[cfg(target_os = "linux")]
    {
        if let Some(file) = Arc::into_inner(request.file)
            && nix::unistd::close(file).is_err()
        {
            accounting.input_close_failures += 1;
            request.budget.invalidate();
            lane.terminalize();
        }
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = lane;
        drop(request.file);
    }
    accounting.input_references_retired += 1;
}

#[cfg(not(target_os = "linux"))]
pub(super) fn read(
    _lane: &LaneRoot,
    _token: NonZeroU64,
    _deadline: Instant,
    request: &ArtifactRequest,
) -> Result<UnverifiedArtifactRead, ArtifactError> {
    request.budget.invalidate();
    Err(ArtifactError::UnsupportedPlatform)
}

#[cfg(target_os = "linux")]
struct ArtifactContent {
    digest: Zeroizing<[u8; 32]>,
    body: Option<Zeroizing<Vec<u8>>>,
}

#[cfg(target_os = "linux")]
fn read_content(
    lane: &LaneRoot,
    token: NonZeroU64,
    deadline: Instant,
    request: &ArtifactRequest,
) -> Result<ArtifactContent, ArtifactError> {
    let retained = if request.purpose.retains_body() {
        let capacity =
            usize::try_from(request.expected_length).map_err(|_| ArtifactError::LimitExceeded)?;
        let mut bytes = Vec::new();
        bytes
            .try_reserve_exact(capacity)
            .map_err(|_| ArtifactError::StorageUnavailable)?;
        Some(Zeroizing::new(bytes))
    } else {
        None
    };
    let mut body = retained;
    let mut scratch = Zeroizing::new([0_u8; READ_CHUNK]);
    let mut hash = Sha256::new();
    let mut offset = 0_u64;
    while offset < request.expected_length {
        checkpoint(lane, token, deadline, &request.budget)?;
        let remaining = request
            .expected_length
            .checked_sub(offset)
            .ok_or(ArtifactError::LimitExceeded)?;
        let allowance = request.budget.remaining(request.purpose)?;
        let count = usize::try_from(remaining.min(allowance).min(READ_CHUNK as u64))
            .map_err(|_| ArtifactError::LimitExceeded)?;
        if count == 0 {
            return Err(ArtifactError::LimitExceeded);
        }
        let actual = rustix::io::pread(request.file.as_ref(), &mut scratch[..count], offset)
            .map_err(|_| ArtifactError::ReadRejected)?;
        request.budget.charge(request.purpose, actual)?;
        checkpoint(lane, token, deadline, &request.budget)?;
        if actual != count {
            return Err(ArtifactError::ReadRejected);
        }
        checkpoint(lane, token, deadline, &request.budget)?;
        hash.update(&scratch[..actual]);
        checkpoint(lane, token, deadline, &request.budget)?;
        if let Some(bytes) = body.as_mut() {
            checkpoint(lane, token, deadline, &request.budget)?;
            bytes.extend_from_slice(&scratch[..actual]);
            checkpoint(lane, token, deadline, &request.budget)?;
        }
        offset = offset
            .checked_add(u64::try_from(actual).map_err(|_| ArtifactError::LimitExceeded)?)
            .ok_or(ArtifactError::LimitExceeded)?;
    }
    checkpoint(lane, token, deadline, &request.budget)?;
    let mut digest = Zeroizing::new([0_u8; 32]);
    checkpoint(lane, token, deadline, &request.budget)?;
    hash.finalize_into((&mut *digest).into());
    checkpoint(lane, token, deadline, &request.budget)?;
    Ok(ArtifactContent { digest, body })
}

#[cfg(target_os = "linux")]
pub(super) fn read(
    lane: &LaneRoot,
    token: NonZeroU64,
    deadline: Instant,
    request: &ArtifactRequest,
) -> Result<UnverifiedArtifactRead, ArtifactError> {
    let mut unwind = ArtifactUnwindGuard {
        budget: &request.budget,
        complete: false,
    };

    let result = (|| {
        let identity = |file: &File| {
            checkpoint(lane, token, deadline, &request.budget)?;
            let value = ArtifactIdentity::read(file, lane, token, deadline, &request.budget)?;
            checkpoint(lane, token, deadline, &request.budget)?;
            Ok::<_, ArtifactError>(value)
        };
        let acl = |file: &File| {
            checkpoint(lane, token, deadline, &request.budget)?;
            let guard = super::ArtifactCheckpoint {
                lane,
                token,
                deadline,
                budget: &request.budget,
            };
            let value = sample_artifact_readable(file, &guard);
            checkpoint(lane, token, deadline, &request.budget)?;
            value.map_err(ArtifactError::from_native)
        };
        checkpoint(lane, token, deadline, &request.budget)?;
        request.check_input()?;
        let before = identity(request.file.as_ref())?;
        before.validate(request.expected_length)?;
        checkpoint(lane, token, deadline, &request.budget)?;
        let before_acl = acl(request.file.as_ref())?;

        let content = read_content(lane, token, deadline, request)?;
        let after = identity(request.file.as_ref())?;
        if after != before {
            return Err(ArtifactError::ObjectChanged);
        }
        let after_acl = acl(request.file.as_ref())?;
        if before != after || before_acl != after_acl {
            return Err(ArtifactError::ObjectChanged);
        }
        checkpoint(lane, token, deadline, &request.budget)?;
        Ok(UnverifiedArtifactRead {
            budget: Arc::clone(&request.budget),
            token,
            purpose: request.purpose,
            identity: before,
            length: request.expected_length,
            digest: content.digest,
            body: content.body,
        })
    })();
    if result.is_err() {
        request.budget.invalidate();
    } else {
        unwind.complete = true;
    }
    result
}

#[cfg(test)]
#[path = "headless_native_artifact_tests.rs"]
mod tests;
