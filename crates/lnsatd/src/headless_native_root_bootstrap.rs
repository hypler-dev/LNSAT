//! Private fixed root-manifest acquisition on the retained native lane.
//! No observed bytes, mount IDs, or custody ticket confer authority.

use super::super::acl::{MAX_ACL_BYTES, ParsedAcl};
use super::{
    ACTIVE, Attempt, CleanupAccounting, CompletionOutcome, DispatchStatus, IDLE, LaneRoot,
    NonZeroU64, Ordering, READY, Request, RequestKind, RequestPayload, TOKEN_MAX,
    artifact::{ArtifactBudgetState, ArtifactError, ArtifactReadBudget, UnverifiedArtifactRead},
    phase, reserve_ready, retire_reserved, same_token, terminal, token, word,
};
use std::{fs::File, sync::Arc, time::Instant};
use zeroize::Zeroizing;

const MAX_COMPONENTS: usize = 128;
const MAX_PATH_BYTES: usize = 4096;
const MAX_RETAINED: u16 = 129;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum RootBootstrapError {
    UnsupportedPlatform,
    InvalidInput,
    BudgetExhausted,
    AssociationRejected,
    NativeDenied,
    Unstable,
    LimitExceeded,
    CleanupUncertain,
}

impl RootBootstrapError {
    const fn code(self) -> &'static str {
        match self {
            Self::UnsupportedPlatform => "headless_root_bootstrap.unsupported_platform",
            Self::InvalidInput => "headless_root_bootstrap.invalid_input",
            Self::BudgetExhausted => "headless_root_bootstrap.budget_exhausted",
            Self::AssociationRejected => "headless_root_bootstrap.association_rejected",
            Self::NativeDenied => "headless_root_bootstrap.native_denied",
            Self::Unstable => "headless_root_bootstrap.unstable",
            Self::LimitExceeded => "headless_root_bootstrap.limit_exceeded",
            Self::CleanupUncertain => "headless_root_bootstrap.cleanup_uncertain",
        }
    }
}

impl From<ArtifactError> for RootBootstrapError {
    fn from(error: ArtifactError) -> Self {
        match error {
            ArtifactError::UnsupportedPlatform => Self::UnsupportedPlatform,
            ArtifactError::BudgetExhausted | ArtifactError::ObservationInvalid => {
                Self::BudgetExhausted
            }
            ArtifactError::AssociationRejected => Self::AssociationRejected,
            ArtifactError::ObjectChanged => Self::Unstable,
            ArtifactError::LimitExceeded | ArtifactError::StorageUnavailable => Self::LimitExceeded,
            ArtifactError::CleanupUncertain => Self::CleanupUncertain,
            ArtifactError::InvalidDescriptor
            | ArtifactError::InvalidLength
            | ArtifactError::ReadRejected => Self::NativeDenied,
        }
    }
}

pub(super) struct RootManifestAnchor {
    path: String,
    components: Vec<String>,
    controller_uid: u32,
    controller_gid: u32,
}

impl RootManifestAnchor {
    // UID and GID are deliberately distinct native identity inputs.
    #[allow(clippy::similar_names)]
    pub(super) fn parse(
        path: &str,
        controller_uid: u32,
        controller_gid: u32,
    ) -> Result<Self, RootBootstrapError> {
        if controller_uid == 0
            || controller_gid == 0
            || path.len() < 2
            || path.len() > MAX_PATH_BYTES
            || !path.starts_with('/')
            || path.ends_with('/')
            || path.chars().any(char::is_control)
        {
            return Err(RootBootstrapError::InvalidInput);
        }
        let parts = path[1..].split('/');
        let count = parts.clone().count();
        if count > MAX_COMPONENTS
            || parts
                .clone()
                .any(|part| part.is_empty() || part.len() > 255 || matches!(part, "." | ".."))
        {
            return Err(RootBootstrapError::InvalidInput);
        }
        let mut owned = String::new();
        owned
            .try_reserve_exact(path.len())
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        owned.push_str(path);
        let mut components = Vec::new();
        components
            .try_reserve_exact(count)
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        for part in parts {
            let mut component = String::new();
            component
                .try_reserve_exact(part.len())
                .map_err(|_| RootBootstrapError::LimitExceeded)?;
            component.push_str(part);
            components.push(component);
        }
        Ok(Self {
            path: owned,
            components,
            controller_uid,
            controller_gid,
        })
    }

    fn prefix(&self, index: usize) -> Result<&str, RootBootstrapError> {
        if self.components.is_empty()
            || self.components.len() > MAX_COMPONENTS
            || index >= self.components.len()
            || self.path.len() > MAX_PATH_BYTES
            || !self.path.starts_with('/')
            || self.path.ends_with('/')
            || self.path.chars().any(char::is_control)
            || self.components.iter().any(|part| {
                part.is_empty() || part.len() > 255 || matches!(part.as_str(), "." | "..")
            })
            || !self.path[1..]
                .split('/')
                .eq(self.components.iter().map(String::as_str))
        {
            return Err(RootBootstrapError::InvalidInput);
        }
        if index == 0 {
            return Ok("/");
        }
        let end = self.components[..index]
            .iter()
            .try_fold(0_usize, |end, part| {
                end.checked_add(part.len())
                    .and_then(|value| value.checked_add(1))
                    .ok_or(RootBootstrapError::LimitExceeded)
            })?;
        self.path.get(..end).ok_or(RootBootstrapError::InvalidInput)
    }

    fn copy(&self) -> Result<Self, RootBootstrapError> {
        Self::parse(&self.path, self.controller_uid, self.controller_gid)
    }
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum PrefixAclKind {
    Access,
    Default,
}

#[derive(Clone, Copy)]
enum PrefixReadOutcome {
    Bytes(usize),
    NoData,
    Denied,
}

/// Raw shape only. `NoData` deliberately cannot mean authenticated absence.
#[derive(Eq, PartialEq)]
pub(super) enum PrefixAclRead {
    UnclassifiedNoData,
    Present {
        raw: Zeroizing<Vec<u8>>,
        parsed: ParsedAcl,
    },
}

impl PrefixAclRead {
    fn decode(
        outcome: PrefixReadOutcome,
        kind: PrefixAclKind,
        mode: u32,
        buffer: &[u8],
    ) -> Result<Self, RootBootstrapError> {
        let size = match outcome {
            PrefixReadOutcome::NoData => return Ok(Self::UnclassifiedNoData),
            PrefixReadOutcome::Denied => return Err(RootBootstrapError::NativeDenied),
            PrefixReadOutcome::Bytes(size) => size,
        };
        if size > MAX_ACL_BYTES {
            return Err(RootBootstrapError::LimitExceeded);
        }
        let bytes = buffer
            .get(..size)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        let parsed = ParsedAcl::parse(bytes).map_err(|_| RootBootstrapError::NativeDenied)?;
        if kind == PrefixAclKind::Access {
            parsed
                .check_access_mode(mode)
                .map_err(|_| RootBootstrapError::NativeDenied)?;
        }
        let mut raw = Vec::new();
        raw.try_reserve_exact(size)
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        raw.extend_from_slice(bytes);
        Ok(Self::Present {
            raw: Zeroizing::new(raw),
            parsed,
        })
    }

    fn copy(&self, kind: PrefixAclKind, mode: u32) -> Result<Self, RootBootstrapError> {
        match self {
            Self::UnclassifiedNoData => Ok(Self::UnclassifiedNoData),
            Self::Present { raw, .. } => {
                Self::decode(PrefixReadOutcome::Bytes(raw.len()), kind, mode, raw)
            }
        }
    }
}

#[derive(Eq, PartialEq)]
pub(super) struct RootPrefixAcl {
    pub(super) access: PrefixAclRead,
    pub(super) default: PrefixAclRead,
}

impl RootPrefixAcl {
    fn require_same(&self, observed: &Self) -> Result<(), RootBootstrapError> {
        if self != observed {
            return Err(RootBootstrapError::Unstable);
        }
        Ok(())
    }

    fn copy(&self, mode: u32) -> Result<Self, RootBootstrapError> {
        Ok(Self {
            access: self.access.copy(PrefixAclKind::Access, mode)?,
            default: self.default.copy(PrefixAclKind::Default, mode)?,
        })
    }
}

fn copy_prefix_acls(
    rows: &[RootPrefixAcl],
    observations: &[RootObjectFacts],
    directories: usize,
) -> Result<Vec<RootPrefixAcl>, RootBootstrapError> {
    let _ = PrefixSchedule::new(directories)?;
    if rows.len() != directories
        || observations.len()
            != directories
                .checked_add(1)
                .ok_or(RootBootstrapError::LimitExceeded)?
    {
        return Err(RootBootstrapError::AssociationRejected);
    }
    let mut copied = Vec::new();
    copied
        .try_reserve_exact(directories)
        .map_err(|_| RootBootstrapError::LimitExceeded)?;
    for (row, facts) in rows.iter().zip(observations) {
        copied.push(row.copy(facts.mode)?);
    }
    Ok(copied)
}

/// Per-job finite metadata work; never a fresh timeout or artifact content claim.
struct PrefixSchedule {
    limit: usize,
    calls: usize,
    bytes: usize,
}

impl PrefixSchedule {
    fn new(directories: usize) -> Result<Self, RootBootstrapError> {
        if !(1..=MAX_COMPONENTS).contains(&directories) {
            return Err(RootBootstrapError::LimitExceeded);
        }
        let limit = directories
            .checked_mul(4)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        limit
            .checked_mul(MAX_ACL_BYTES)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        Ok(Self {
            limit,
            calls: 0,
            bytes: 0,
        })
    }

    fn before_call(&self) -> Result<(), RootBootstrapError> {
        if self.calls >= self.limit {
            return Err(RootBootstrapError::LimitExceeded);
        }
        Ok(())
    }

    fn record(&mut self, size: usize) -> Result<(), RootBootstrapError> {
        self.before_call()?;
        if size > MAX_ACL_BYTES {
            return Err(RootBootstrapError::LimitExceeded);
        }
        let calls = self
            .calls
            .checked_add(1)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        let bytes = self
            .bytes
            .checked_add(size)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        let maximum = self
            .limit
            .checked_mul(MAX_ACL_BYTES)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        if bytes > maximum {
            return Err(RootBootstrapError::LimitExceeded);
        }
        self.calls = calls;
        self.bytes = bytes;
        Ok(())
    }

    fn finish(&self) -> Result<(), RootBootstrapError> {
        if self.calls != self.limit {
            return Err(RootBootstrapError::AssociationRejected);
        }
        Ok(())
    }
}

fn root_checkpoint(
    lane: &LaneRoot,
    request: &Request,
    budget: &ArtifactBudgetState,
) -> Result<(), RootBootstrapError> {
    if lane.control.load(Ordering::SeqCst) != word(ACTIVE, request.token.get())
        || request.deadline != budget.deadline
        || Instant::now() >= request.deadline
    {
        budget.invalidate();
        return Err(RootBootstrapError::BudgetExhausted);
    }
    budget.valid().map_err(Into::into)
}

/// Preserve the raw syscall result until the exact post-call guard has passed.
/// This accepts values only, never an injected observer or callable.
fn prefix_post_call<T>(
    state: &RootManifestCustodyState,
    request: &Request,
    result: T,
) -> Result<T, RootBootstrapError> {
    root_checkpoint(state.lane, request, &state.budget)?;
    Ok(result)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum LeasePhase {
    Reserved,
    Held,
    Retiring(NonZeroU64),
}

pub(super) struct RootLease {
    begin: NonZeroU64,
    budget: Arc<ArtifactBudgetState>,
    phase: LeasePhase,
}

impl RootLease {
    fn matches(&self, begin: NonZeroU64, budget: &Arc<ArtifactBudgetState>) -> bool {
        self.begin == begin && Arc::ptr_eq(&self.budget, budget)
    }
}

pub(super) enum RootRequest {
    Begin {
        anchor: RootManifestAnchor,
        budget: Arc<ArtifactBudgetState>,
    },
    Recheck {
        begin: NonZeroU64,
        budget: Arc<ArtifactBudgetState>,
    },
    Retire {
        begin: NonZeroU64,
        budget: Arc<ArtifactBudgetState>,
    },
}

impl RootRequest {
    pub(super) const fn kind(&self) -> RequestKind {
        match self {
            Self::Begin { .. } => RequestKind::RootManifestBegin,
            Self::Recheck { .. } => RequestKind::RootManifestRecheck,
            Self::Retire { .. } => RequestKind::RootManifestRetire,
        }
    }

    pub(super) fn budget(&self) -> &Arc<ArtifactBudgetState> {
        match self {
            Self::Begin { budget, .. }
            | Self::Recheck { budget, .. }
            | Self::Retire { budget, .. } => budget,
        }
    }

    fn begin(&self, job: NonZeroU64) -> NonZeroU64 {
        match self {
            Self::Begin { .. } => job,
            Self::Recheck { begin, .. } | Self::Retire { begin, .. } => *begin,
        }
    }
}

#[derive(Clone, Copy, Default, Debug, Eq, PartialEq)]
pub(super) struct RootAccounting {
    expected: u16,
    before: u16,
    after: u16,
    opened: u16,
    close_attempts: u16,
    close_failures: u16,
    read_references: u16,
}

impl RootAccounting {
    pub(super) fn complete(self, kind: RequestKind) -> bool {
        if self.expected == 0 || self.expected > MAX_RETAINED || self.close_failures != 0 {
            return false;
        }
        match kind {
            RequestKind::RootManifestBegin => {
                self.before == 0
                    && self.after == self.expected
                    && self.opened == self.expected
                    && self.close_attempts == 0
                    && self.read_references == 1
            }
            RequestKind::RootManifestRecheck => {
                self.before == self.expected
                    && self.after == self.expected
                    && self.opened == 0
                    && self.close_attempts == 0
                    && self.read_references == 0
            }
            RequestKind::RootManifestRetire => {
                self.before == self.expected
                    && self.after == 0
                    && self.opened == 0
                    && self.close_attempts == self.expected
                    && self.read_references == 0
            }
            _ => false,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct RootObjectFacts {
    pub(super) device_major: u32,
    pub(super) device_minor: u32,
    pub(super) inode: u64,
    pub(super) mode: u32,
    pub(super) uid: u32,
    pub(super) gid: u32,
    pub(super) links: u64,
    pub(super) size: u64,
    pub(super) mtime_seconds: i64,
    pub(super) mtime_nanoseconds: u32,
    pub(super) ctime_seconds: i64,
    pub(super) ctime_nanoseconds: u32,
    pub(super) mount_id: u64,
}

pub(super) struct BeginData {
    begin: NonZeroU64,
    budget: Arc<ArtifactBudgetState>,
    anchor: RootManifestAnchor,
    observations: Vec<RootObjectFacts>,
    prefix_acls: Vec<RootPrefixAcl>,
    read: UnverifiedArtifactRead,
}

pub(super) struct UnverifiedRootStability {
    begin: NonZeroU64,
    job: NonZeroU64,
    deadline: Instant,
    budget: Arc<ArtifactBudgetState>,
    objects: u16,
}

pub(super) struct RootRetirement {
    begin: NonZeroU64,
    job: NonZeroU64,
    budget: Arc<ArtifactBudgetState>,
    descriptors: u16,
}

// Fixed metadata predicates are byte/value checks, never native provenance.
const ROOT_STATX_MASK: u32 = 0x17ff;

fn required_statx(mask: u32, mount_id: u64) -> Result<(), RootBootstrapError> {
    if mask & ROOT_STATX_MASK != ROOT_STATX_MASK || mount_id == 0 {
        return Err(RootBootstrapError::NativeDenied);
    }
    Ok(())
}

fn validate_object(facts: &RootObjectFacts, directory: bool) -> Result<(), RootBootstrapError> {
    if facts.uid != 0
        || facts.mount_id == 0
        || facts.mode & 0o022 != 0
        || facts.mtime_nanoseconds >= 1_000_000_000
        || facts.ctime_nanoseconds >= 1_000_000_000
        || if directory {
            facts.mode & 0o170_000 != 0o040_000
        } else {
            facts.mode & 0o170_000 != 0o100_000
                || facts.mode & 0o7777 != 0o640
                || facts.gid != 0
                || facts.links != 1
                || facts.size == 0
                || facts.size > 65536
        }
    {
        return Err(RootBootstrapError::NativeDenied);
    }
    Ok(())
}

fn same_object(
    expected: &RootObjectFacts,
    observed: &RootObjectFacts,
) -> Result<(), RootBootstrapError> {
    if expected != observed {
        return Err(RootBootstrapError::Unstable);
    }
    Ok(())
}

/// Worker-local originals only. Slots and coordinator results hold no native owner.
pub(super) struct RootManifestCustodyState {
    lane: &'static LaneRoot,
    begin: NonZeroU64,
    budget: Arc<ArtifactBudgetState>,
    deadline: Instant,
    anchor: RootManifestAnchor,
    directories: Vec<File>,
    leaf: Option<super::artifact::OwnedArtifactCustody>,
    prospective: Option<File>,
    observations: Vec<RootObjectFacts>,
    acl: Option<super::super::readable::ReadableSample>,
    prefix_acls: Vec<RootPrefixAcl>,
    opened: u16,
    released: bool,
}

impl RootManifestCustodyState {
    fn retained_count(&self) -> Result<u16, RootBootstrapError> {
        let count = self
            .directories
            .len()
            .checked_add(usize::from(self.leaf.is_some()))
            .ok_or(RootBootstrapError::LimitExceeded)?;
        u16::try_from(count)
            .ok()
            .filter(|count| *count > 0 && *count <= MAX_RETAINED)
            .ok_or(RootBootstrapError::LimitExceeded)
    }

    // Receipt eligibility only. This check never authorizes or prevents disposal.
    fn receipt_allowed(&self, job: NonZeroU64) -> bool {
        if Instant::now() >= self.deadline
            || self.lane.control.load(Ordering::SeqCst) != word(ACTIVE, job.get())
            || self.budget.valid() != Err(ArtifactError::ObservationInvalid)
        {
            return false;
        }
        let Ok(slots) = self.lane.slots.lock() else {
            return false;
        };
        slots.root_lease.as_ref().is_some_and(|lease| {
            lease.matches(self.begin, &self.budget) && lease.phase == LeasePhase::Retiring(job)
        })
    }

    fn cleanup_check(&self, job: Option<NonZeroU64>) -> bool {
        let eligible = job.is_none_or(|job| self.receipt_allowed(job));
        if !eligible {
            self.budget.invalidate();
            self.lane.terminalize();
        }
        eligible
    }

    fn record_close(&self, accounting: &mut RootAccounting, failed: bool) -> bool {
        let attempts = accounting.close_attempts.checked_add(1);
        let failures = accounting.close_failures.checked_add(u16::from(failed));
        if let (Some(attempts), Some(failures)) = (attempts, failures) {
            accounting.close_attempts = attempts;
            accounting.close_failures = failures;
        } else {
            self.budget.invalidate();
            self.lane.terminalize();
            return false;
        }
        if failed {
            self.budget.invalidate();
            self.lane.terminalize();
        }
        !failed
    }

    fn close_file(
        &self,
        file: File,
        accounting: &mut RootAccounting,
        job: Option<NonZeroU64>,
    ) -> bool {
        let before = self.cleanup_check(job);
        #[cfg(target_os = "linux")]
        let failed = nix::unistd::close(file).is_err();
        #[cfg(not(target_os = "linux"))]
        let failed = {
            drop(file);
            false
        };
        let counted = self.record_close(accounting, failed);
        let after = self.cleanup_check(job);
        before && counted && after
    }

    fn retire(&mut self, accounting: &mut RootAccounting, job: Option<NonZeroU64>) -> bool {
        let total = self
            .directories
            .len()
            .checked_add(usize::from(self.leaf.is_some()))
            .and_then(|count| count.checked_add(usize::from(self.prospective.is_some())))
            .and_then(|count| u16::try_from(count).ok());
        let mut clean =
            total.is_some_and(|count| count <= MAX_RETAINED + 1 && count == self.opened);
        accounting.expected = total.unwrap_or(0);
        accounting.before = accounting.expected;
        if !clean {
            self.budget.invalidate();
            self.lane.terminalize();
        }
        if let Some(file) = self.prospective.take() {
            clean = self.close_file(file, accounting, job) && clean;
        }
        if let Some(leaf) = self.leaf.take() {
            let before = self.cleanup_check(job);
            let failed = leaf.retire_original(self.lane).is_err();
            let counted = self.record_close(accounting, failed);
            let after = self.cleanup_check(job);
            clean = before && counted && after && clean;
        }
        while let Some(file) = self.directories.pop() {
            clean = self.close_file(file, accounting, job) && clean;
        }
        accounting.after = 0;
        // All owners have been consumed, even when a close reported uncertainty.
        // Never retry a numeric fd or infer a successful receipt from Drop.
        self.released = true;
        clean && accounting.close_attempts == accounting.expected && accounting.close_failures == 0
    }
}

impl Drop for RootManifestCustodyState {
    fn drop(&mut self) {
        if !self.released {
            self.budget.invalidate();
            self.lane.terminalize();
            let _ = self.retire(&mut RootAccounting::default(), None);
        }
    }
}

pub(super) fn maintain(lane: &LaneRoot, retained: Option<&RootManifestCustodyState>) -> bool {
    // Worker may block briefly on bookkeeping, but performs no native call here.
    let Ok(slots) = lane.slots.lock() else {
        lane.terminalize();
        return false;
    };
    let control = lane.control.load(Ordering::SeqCst);
    let valid = match (retained, slots.root_lease.as_ref()) {
        (Some(state), Some(lease)) if lease.matches(state.begin, &state.budget) => {
            !terminal(control) && Instant::now() < state.deadline
                && match lease.phase {
                    LeasePhase::Held => state.budget.valid().is_ok(),
                    LeasePhase::Retiring(job) => control == word(ACTIVE, job.get())
                        && state.budget.valid() == Err(ArtifactError::ObservationInvalid)
                        && slots.request.as_ref().is_some_and(|request| {
                            request.token == job && request.deadline == state.deadline
                                && matches!(&request.payload, RequestPayload::Root(RootRequest::Retire { begin, budget })
                                    if *begin == state.begin && Arc::ptr_eq(budget, &state.budget))
                        }),
                    LeasePhase::Reserved => false,
                }
        }
        (None, Some(lease)) => !terminal(control) && lease.phase == LeasePhase::Reserved
            && Instant::now() < lease.budget.deadline && lease.budget.valid().is_ok()
            && control == word(ACTIVE, lease.begin.get())
            && slots.request.as_ref().is_some_and(|request| {
                request.token == lease.begin && request.deadline == lease.budget.deadline
                    && matches!(&request.payload, RequestPayload::Root(RootRequest::Begin { budget, .. })
                        if Arc::ptr_eq(budget, &lease.budget))
            }),
        (None, None) => !terminal(control),
        _ => false,
    };
    if !valid {
        if let Some(state) = retained {
            state.budget.invalidate();
        }
        if let Some(lease) = &slots.root_lease {
            lease.budget.invalidate();
        }
        lane.terminalize();
    }
    valid
}

pub(super) fn park(lane: &LaneRoot, retained: Option<&RootManifestCustodyState>) {
    if !maintain(lane, retained) {
        return;
    }
    let deadline = if let Ok(slots) = lane.slots.lock() {
        retained
            .map(|state| state.deadline)
            .or_else(|| slots.root_lease.as_ref().map(|lease| lease.budget.deadline))
    } else {
        lane.terminalize();
        return;
    };
    match deadline {
        Some(deadline) => match deadline.checked_duration_since(Instant::now()) {
            Some(duration) if !duration.is_zero() => std::thread::park_timeout(duration),
            _ => lane.terminalize(),
        },
        None => std::thread::park(),
    }
    maintain(lane, retained);
}

pub(super) fn drain(lane: &LaneRoot, retained: &mut Option<RootManifestCustodyState>) -> bool {
    let Some(mut state) = retained.take() else {
        return true;
    };
    state.budget.invalidate();
    lane.terminalize();
    state.retire(&mut RootAccounting::default(), None)
}

pub(super) fn execute(
    lane: &'static LaneRoot,
    request: &Request,
    retained: &mut Option<RootManifestCustodyState>,
) -> (RootCompletion, CleanupAccounting) {
    let mut accounting = CleanupAccounting::default();
    let mut root_accounting = RootAccounting::default();
    let Some(RootRequestRef { request: root }) = RootRequestRef::from_request(request) else {
        lane.terminalize();
        return (
            RootCompletion::denied(request.kind(), RootBootstrapError::AssociationRejected),
            accounting,
        );
    };
    let kind = root.kind();
    let result = match root {
        RootRequest::Begin { anchor, budget } => {
            let result = begin_native(
                lane,
                request,
                anchor,
                budget,
                retained,
                &mut root_accounting,
            );
            RootCompletion::Begin(result)
        }
        RootRequest::Recheck { begin, budget } => {
            let result = recheck_retained(
                lane,
                request,
                *begin,
                budget,
                retained,
                &mut root_accounting,
            );
            RootCompletion::Recheck(result)
        }
        RootRequest::Retire { begin, budget } => {
            let result = retire_retained(
                lane,
                request,
                *begin,
                budget,
                retained,
                &mut root_accounting,
            );
            RootCompletion::Retire(result)
        }
    };
    if !result.success() {
        if let Some(budget) = request.budget() {
            budget.invalidate();
        }
        lane.terminalize();
    }
    debug_assert_eq!(result.kind(), kind);
    accounting.root = Some(root_accounting);
    (result, accounting)
}

struct RootRequestRef<'a> {
    request: &'a RootRequest,
}

impl<'a> RootRequestRef<'a> {
    fn from_request(request: &'a Request) -> Option<Self> {
        match &request.payload {
            RequestPayload::Root(request) => Some(Self { request }),
            _ => None,
        }
    }
}

#[cfg(not(target_os = "linux"))]
fn begin_native(
    _lane: &'static LaneRoot,
    _request: &Request,
    _anchor: &RootManifestAnchor,
    budget: &Arc<ArtifactBudgetState>,
    _retained: &mut Option<RootManifestCustodyState>,
    _accounting: &mut RootAccounting,
) -> Result<BeginData, RootBootstrapError> {
    budget.invalidate();
    Err(RootBootstrapError::UnsupportedPlatform)
}

#[cfg(target_os = "linux")]
fn begin_native(
    lane: &'static LaneRoot,
    request: &Request,
    anchor: &RootManifestAnchor,
    budget: &Arc<ArtifactBudgetState>,
    retained: &mut Option<RootManifestCustodyState>,
    accounting: &mut RootAccounting,
) -> Result<BeginData, RootBootstrapError> {
    // Linux implementation below owns all originals locally before publishing.
    linux::begin(lane, request, anchor, budget, retained, accounting)
}

fn recheck_retained(
    lane: &'static LaneRoot,
    request: &Request,
    begin: NonZeroU64,
    budget: &Arc<ArtifactBudgetState>,
    retained: &mut Option<RootManifestCustodyState>,
    accounting: &mut RootAccounting,
) -> Result<UnverifiedRootStability, RootBootstrapError> {
    let state = retained
        .as_ref()
        .ok_or(RootBootstrapError::AssociationRejected)?;
    if state.begin != begin
        || !Arc::ptr_eq(&state.budget, budget)
        || state.deadline != request.deadline
        || state.budget.valid().is_err()
    {
        budget.invalidate();
        lane.terminalize();
        return Err(RootBootstrapError::AssociationRejected);
    }
    #[cfg(target_os = "linux")]
    linux::reobserve(state, request)?;
    #[cfg(not(target_os = "linux"))]
    {
        let _ = accounting;
        Err(RootBootstrapError::UnsupportedPlatform)
    }
    #[cfg(target_os = "linux")]
    let count = state.retained_count()?;
    #[cfg(target_os = "linux")]
    {
        accounting.expected = count;
        accounting.before = count;
        accounting.after = count;
        Ok(UnverifiedRootStability {
            begin,
            job: request.token,
            deadline: request.deadline,
            budget: Arc::clone(budget),
            objects: u16::try_from(state.observations.len())
                .map_err(|_| RootBootstrapError::LimitExceeded)?,
        })
    }
}

fn retire_retained(
    lane: &'static LaneRoot,
    request: &Request,
    begin: NonZeroU64,
    budget: &Arc<ArtifactBudgetState>,
    retained: &mut Option<RootManifestCustodyState>,
    accounting: &mut RootAccounting,
) -> Result<RootRetirement, RootBootstrapError> {
    let Some(mut state) = retained.take() else {
        return Err(RootBootstrapError::AssociationRejected);
    };
    if state.begin != begin
        || !Arc::ptr_eq(&state.budget, budget)
        || state.deadline != request.deadline
    {
        state.budget.invalidate();
        lane.terminalize();
        return Err(RootBootstrapError::AssociationRejected);
    }
    let descriptors = state.retained_count()?;
    if !state.retire(accounting, Some(request.token))
        || !accounting.complete(RequestKind::RootManifestRetire)
    {
        lane.terminalize();
        return Err(RootBootstrapError::CleanupUncertain);
    }
    Ok(RootRetirement {
        begin,
        job: request.token,
        budget: Arc::clone(budget),
        descriptors,
    })
}

#[cfg(target_os = "linux")]
mod linux {
    use super::super::super::readable::{ReadableSample, sample_artifact_readable};
    use super::*;
    use nix::{
        fcntl::{FcntlArg, OFlag, OpenHow, ResolveFlag, fcntl, open, openat2},
        sys::{
            stat::{Mode, fstat, major, minor},
            statfs::fstatfs,
        },
    };
    use rustix::fs::{AtFlags, StatxFlags};
    use std::os::fd::{AsFd, OwnedFd};

    use super::root_checkpoint as checkpoint;

    fn statx_facts(stat: rustix::fs::Statx) -> Result<RootObjectFacts, RootBootstrapError> {
        required_statx(stat.stx_mask, stat.stx_mnt_id)?;
        Ok(RootObjectFacts {
            device_major: stat.stx_dev_major,
            device_minor: stat.stx_dev_minor,
            inode: stat.stx_ino,
            mode: u32::from(stat.stx_mode),
            uid: stat.stx_uid,
            gid: stat.stx_gid,
            links: u64::from(stat.stx_nlink),
            size: stat.stx_size,
            mtime_seconds: stat.stx_mtime.tv_sec,
            mtime_nanoseconds: stat.stx_mtime.tv_nsec,
            ctime_seconds: stat.stx_ctime.tv_sec,
            ctime_nanoseconds: stat.stx_ctime.tv_nsec,
            mount_id: stat.stx_mnt_id,
        })
    }

    fn named(
        parent: impl AsFd,
        name: &str,
        state: &RootManifestCustodyState,
        request: &Request,
    ) -> Result<RootObjectFacts, RootBootstrapError> {
        checkpoint(state.lane, request, &state.budget)?;
        let result = rustix::fs::statx(
            parent,
            name,
            AtFlags::SYMLINK_NOFOLLOW,
            StatxFlags::BASIC_STATS | StatxFlags::MNT_ID,
        );
        checkpoint(state.lane, request, &state.budget)?;
        statx_facts(result.map_err(|_| RootBootstrapError::NativeDenied)?)
    }

    // Linux stat aliases vary by architecture; every widening cast preserves all bits.
    #[allow(clippy::unnecessary_cast, clippy::too_many_lines)]
    fn held(
        file: &File,
        state: &RootManifestCustodyState,
        request: &Request,
        directory: bool,
    ) -> Result<RootObjectFacts, RootBootstrapError> {
        checkpoint(state.lane, request, &state.budget)?;
        let descriptor = fcntl(file, FcntlArg::F_GETFD);
        checkpoint(state.lane, request, &state.budget)?;
        if descriptor.map_err(|_| RootBootstrapError::NativeDenied)? != nix::libc::FD_CLOEXEC {
            return Err(RootBootstrapError::NativeDenied);
        }
        checkpoint(state.lane, request, &state.budget)?;
        let flags = fcntl(file, FcntlArg::F_GETFL);
        checkpoint(state.lane, request, &state.budget)?;
        let expected_flags = if directory {
            nix::libc::O_PATH | nix::libc::O_DIRECTORY | nix::libc::O_NOFOLLOW
        } else {
            nix::libc::O_NOFOLLOW
                | i32::try_from(rustix::fs::OFlags::LARGEFILE.bits())
                    .map_err(|_| RootBootstrapError::UnsupportedPlatform)?
        };
        if flags.map_err(|_| RootBootstrapError::NativeDenied)? != expected_flags {
            return Err(RootBootstrapError::NativeDenied);
        }
        checkpoint(state.lane, request, &state.budget)?;
        let stat = fstat(file);
        checkpoint(state.lane, request, &state.budget)?;
        let stat = stat.map_err(|_| RootBootstrapError::NativeDenied)?;
        checkpoint(state.lane, request, &state.budget)?;
        let fs = fstatfs(file);
        checkpoint(state.lane, request, &state.budget)?;
        if fs
            .map_err(|_| RootBootstrapError::NativeDenied)?
            .filesystem_type()
            .0 as i64
            != 0xef53
        {
            return Err(RootBootstrapError::NativeDenied);
        }
        checkpoint(state.lane, request, &state.budget)?;
        let statx = rustix::fs::statx(
            file,
            c"",
            AtFlags::EMPTY_PATH,
            StatxFlags::BASIC_STATS | StatxFlags::MNT_ID,
        );
        checkpoint(state.lane, request, &state.budget)?;
        let facts = statx_facts(statx.map_err(|_| RootBootstrapError::NativeDenied)?)?;
        let standard = RootObjectFacts {
            device_major: u32::try_from(major(stat.st_dev))
                .map_err(|_| RootBootstrapError::NativeDenied)?,
            device_minor: u32::try_from(minor(stat.st_dev))
                .map_err(|_| RootBootstrapError::NativeDenied)?,
            inode: stat.st_ino as u64,
            mode: stat.st_mode as u32,
            uid: stat.st_uid as u32,
            gid: stat.st_gid as u32,
            links: stat.st_nlink as u64,
            size: u64::try_from(stat.st_size).map_err(|_| RootBootstrapError::NativeDenied)?,
            mtime_seconds: stat.st_mtime as i64,
            mtime_nanoseconds: u32::try_from(stat.st_mtime_nsec)
                .map_err(|_| RootBootstrapError::NativeDenied)?,
            ctime_seconds: stat.st_ctime as i64,
            ctime_nanoseconds: u32::try_from(stat.st_ctime_nsec)
                .map_err(|_| RootBootstrapError::NativeDenied)?,
            mount_id: facts.mount_id,
        };
        same_object(&standard, &facts)?;
        validate_object(&facts, directory)?;
        Ok(facts)
    }

    fn leaf_acl(
        state: &RootManifestCustodyState,
        request: &Request,
    ) -> Result<ReadableSample, RootBootstrapError> {
        let leaf = state
            .leaf
            .as_ref()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        let guard = super::super::ArtifactCheckpoint {
            lane: state.lane,
            token: request.token,
            deadline: request.deadline,
            budget: &state.budget,
        };
        checkpoint(state.lane, request, &state.budget)?;
        let sample = sample_artifact_readable(leaf.borrow_file(), &guard);
        checkpoint(state.lane, request, &state.budget)?;
        let sample = sample.map_err(|_| RootBootstrapError::NativeDenied)?;
        sample
            .check_root_manifest_controller(state.anchor.controller_uid)
            .map_err(|_| RootBootstrapError::NativeDenied)?;
        Ok(sample)
    }

    // Every successful open is worker-owned before even its post-call checkpoint.
    fn adopt_opened(
        state: &mut RootManifestCustodyState,
        request: &Request,
        opened: Result<OwnedFd, nix::errno::Errno>,
    ) -> Result<(), RootBootstrapError> {
        let result = match opened {
            Ok(fd) => {
                // Caller proves the prospective slot empty before each native open.
                state.prospective = Some(File::from(fd));
                match state.opened.checked_add(1) {
                    Some(opened) => {
                        state.opened = opened;
                        Ok(())
                    }
                    None => Err(RootBootstrapError::LimitExceeded),
                }
            }
            Err(_) => Err(RootBootstrapError::NativeDenied),
        };
        checkpoint(state.lane, request, &state.budget)?;
        result
    }

    fn before_open(
        state: &RootManifestCustodyState,
        request: &Request,
    ) -> Result<(), RootBootstrapError> {
        if state.prospective.is_some() || state.opened >= MAX_RETAINED + 1 {
            return Err(RootBootstrapError::CleanupUncertain);
        }
        checkpoint(state.lane, request, &state.budget)
    }

    fn reobserve_directories(
        state: &RootManifestCustodyState,
        request: &Request,
    ) -> Result<(), RootBootstrapError> {
        if state.directories.len() != state.anchor.components.len()
            || state.observations.len() != state.directories.len() + 1
            || state.prospective.is_some()
        {
            return Err(RootBootstrapError::CleanupUncertain);
        }
        for (index, file) in state.directories.iter().enumerate() {
            let by_name = if index == 0 {
                named(rustix::fs::CWD, "/", state, request)?
            } else {
                named(
                    &state.directories[index - 1],
                    &state.anchor.components[index - 1],
                    state,
                    request,
                )?
            };
            let by_handle = held(file, state, request, true)?;
            same_object(&state.observations[index], &by_name)?;
            same_object(&by_name, &by_handle)?;
        }
        checkpoint(state.lane, request, &state.budget)
    }

    fn reobserve_leaf(
        state: &RootManifestCustodyState,
        request: &Request,
    ) -> Result<(), RootBootstrapError> {
        reobserve_directories(state, request)?;
        let parent = state
            .directories
            .last()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        let name = state
            .anchor
            .components
            .last()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        let leaf = state
            .leaf
            .as_ref()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        let by_name = named(parent, name, state, request)?;
        let by_handle = held(leaf.borrow_file(), state, request, false)?;
        same_object(
            state
                .observations
                .last()
                .ok_or(RootBootstrapError::CleanupUncertain)?,
            &by_name,
        )?;
        same_object(&by_name, &by_handle)?;
        let sampled = leaf_acl(state, request)?;
        if state.acl.as_ref() != Some(&sampled) {
            return Err(RootBootstrapError::Unstable);
        }
        checkpoint(state.lane, request, &state.budget)
    }

    fn sample_prefix_acl(
        state: &RootManifestCustodyState,
        request: &Request,
        index: usize,
        kind: PrefixAclKind,
        schedule: &mut PrefixSchedule,
        buffer: &mut Zeroizing<[u8; MAX_ACL_BYTES]>,
    ) -> Result<PrefixAclRead, RootBootstrapError> {
        let path = state.anchor.prefix(index)?;
        let mode = state
            .observations
            .get(index)
            .ok_or(RootBootstrapError::AssociationRejected)?
            .mode;
        let name = match kind {
            PrefixAclKind::Access => c"system.posix_acl_access",
            PrefixAclKind::Default => c"system.posix_acl_default",
        };
        schedule.before_call()?;
        reobserve_directories(state, request)?;
        buffer.fill(0);
        checkpoint(state.lane, request, &state.budget)?;
        let result = rustix::fs::lgetxattr(path, name, &mut **buffer);
        let result = prefix_post_call(state, request, result)?;
        // Even a syscall error must pass closing association before classification.
        reobserve_directories(state, request)?;
        let outcome = match result {
            Ok(size) => {
                schedule.record(size)?;
                PrefixReadOutcome::Bytes(size)
            }
            Err(rustix::io::Errno::NODATA) => {
                schedule.record(0)?;
                PrefixReadOutcome::NoData
            }
            Err(_) => {
                schedule.record(0)?;
                PrefixReadOutcome::Denied
            }
        };
        PrefixAclRead::decode(outcome, kind, mode, &**buffer)
    }

    fn sample_prefix(
        state: &RootManifestCustodyState,
        request: &Request,
        index: usize,
        schedule: &mut PrefixSchedule,
        buffer: &mut Zeroizing<[u8; MAX_ACL_BYTES]>,
    ) -> Result<RootPrefixAcl, RootBootstrapError> {
        Ok(RootPrefixAcl {
            access: sample_prefix_acl(
                state,
                request,
                index,
                PrefixAclKind::Access,
                schedule,
                buffer,
            )?,
            default: sample_prefix_acl(
                state,
                request,
                index,
                PrefixAclKind::Default,
                schedule,
                buffer,
            )?,
        })
    }

    fn compare_prefixes(
        state: &RootManifestCustodyState,
        request: &Request,
        schedule: &mut PrefixSchedule,
        buffer: &mut Zeroizing<[u8; MAX_ACL_BYTES]>,
    ) -> Result<(), RootBootstrapError> {
        if state.prefix_acls.len() != state.directories.len() {
            return Err(RootBootstrapError::AssociationRejected);
        }
        for (index, baseline) in state.prefix_acls.iter().enumerate() {
            baseline.require_same(&sample_prefix(state, request, index, schedule, buffer)?)?;
        }
        Ok(())
    }

    pub(super) fn reobserve(
        state: &RootManifestCustodyState,
        request: &Request,
    ) -> Result<(), RootBootstrapError> {
        let mut schedule = PrefixSchedule::new(state.directories.len())?;
        let mut buffer = Zeroizing::new([0_u8; MAX_ACL_BYTES]);
        compare_prefixes(state, request, &mut schedule, &mut buffer)?;
        reobserve_leaf(state, request)?;
        compare_prefixes(state, request, &mut schedule, &mut buffer)?;
        reobserve_leaf(state, request)?;
        schedule.finish()?;
        checkpoint(state.lane, request, &state.budget)
    }

    // Fixed linear native schedule; no injected observer or callback.
    #[allow(clippy::too_many_lines)]
    pub(super) fn begin(
        lane: &'static LaneRoot,
        request: &Request,
        anchor: &RootManifestAnchor,
        budget: &Arc<ArtifactBudgetState>,
        retained: &mut Option<RootManifestCustodyState>,
        accounting: &mut RootAccounting,
    ) -> Result<BeginData, RootBootstrapError> {
        if retained.is_some() {
            return Err(RootBootstrapError::AssociationRejected);
        }
        checkpoint(lane, request, budget)?;
        let state_anchor = anchor.copy()?;
        let data_anchor = anchor.copy()?;
        let mut directories = Vec::new();
        directories
            .try_reserve_exact(anchor.components.len())
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        let capacity = anchor
            .components
            .len()
            .checked_add(1)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        let mut observations = Vec::new();
        observations
            .try_reserve_exact(capacity)
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        let mut published = Vec::new();
        published
            .try_reserve_exact(capacity)
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        let mut prefix_acls = Vec::new();
        prefix_acls
            .try_reserve_exact(anchor.components.len())
            .map_err(|_| RootBootstrapError::LimitExceeded)?;
        let mut prefix_schedule = PrefixSchedule::new(anchor.components.len())?;
        let mut prefix_buffer = Zeroizing::new([0_u8; MAX_ACL_BYTES]);
        // Install worker ownership before the first native open, including all failure paths.
        *retained = Some(RootManifestCustodyState {
            lane,
            begin: request.token,
            budget: Arc::clone(budget),
            deadline: request.deadline,
            anchor: state_anchor,
            directories,
            leaf: None,
            prospective: None,
            observations,
            acl: None,
            prefix_acls,
            opened: 0,
            released: false,
        });
        let state = retained
            .as_mut()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        before_open(state, request)?;
        let opened = open(
            c"/",
            OFlag::O_PATH | OFlag::O_DIRECTORY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW,
            Mode::empty(),
        );
        adopt_opened(state, request, opened)?;
        let root = state
            .prospective
            .as_ref()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        let facts = held(root, state, request, true)?;
        same_object(&facts, &named(rustix::fs::CWD, "/", state, request)?)?;
        state.observations.push(facts);
        state.directories.push(
            state
                .prospective
                .take()
                .ok_or(RootBootstrapError::CleanupUncertain)?,
        );
        let last = anchor
            .components
            .len()
            .checked_sub(1)
            .ok_or(RootBootstrapError::InvalidInput)?;
        for name in &anchor.components[..last] {
            before_open(state, request)?;
            let parent = state
                .directories
                .last()
                .ok_or(RootBootstrapError::CleanupUncertain)?;
            let opened = openat2(
                parent,
                name.as_str(),
                OpenHow::new()
                    .flags(
                        OFlag::O_PATH | OFlag::O_DIRECTORY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW,
                    )
                    .resolve(
                        ResolveFlag::RESOLVE_BENEATH
                            | ResolveFlag::RESOLVE_NO_SYMLINKS
                            | ResolveFlag::RESOLVE_NO_MAGICLINKS,
                    ),
            );
            adopt_opened(state, request, opened)?;
            let file = state
                .prospective
                .as_ref()
                .ok_or(RootBootstrapError::CleanupUncertain)?;
            let facts = held(file, state, request, true)?;
            same_object(
                &facts,
                &named(
                    state
                        .directories
                        .last()
                        .ok_or(RootBootstrapError::CleanupUncertain)?,
                    name,
                    state,
                    request,
                )?,
            )?;
            state.observations.push(facts);
            state.directories.push(
                state
                    .prospective
                    .take()
                    .ok_or(RootBootstrapError::CleanupUncertain)?,
            );
        }
        let name = &anchor.components[last];
        let parent = state
            .directories
            .last()
            .ok_or(RootBootstrapError::CleanupUncertain)?;
        let named_leaf = named(parent, name, state, request)?;
        validate_object(&named_leaf, false)?;
        before_open(state, request)?;
        let opened = openat2(
            parent,
            name.as_str(),
            OpenHow::new()
                .flags(OFlag::O_RDONLY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW)
                .resolve(
                    ResolveFlag::RESOLVE_BENEATH
                        | ResolveFlag::RESOLVE_NO_SYMLINKS
                        | ResolveFlag::RESOLVE_NO_MAGICLINKS,
                ),
        );
        adopt_opened(state, request, opened)?;
        let facts = held(
            state
                .prospective
                .as_ref()
                .ok_or(RootBootstrapError::CleanupUncertain)?,
            state,
            request,
            false,
        )?;
        same_object(&named_leaf, &facts)?;
        same_object(
            &facts,
            &named(
                state
                    .directories
                    .last()
                    .ok_or(RootBootstrapError::CleanupUncertain)?,
                name,
                state,
                request,
            )?,
        )?;
        state.observations.push(facts);
        state.leaf = Some(
            super::super::artifact::OwnedArtifactCustody::from_root_file(
                state
                    .prospective
                    .take()
                    .ok_or(RootBootstrapError::CleanupUncertain)?,
                budget,
            ),
        );
        state.acl = Some(leaf_acl(state, request)?);
        for index in 0..state.directories.len() {
            let sampled = sample_prefix(
                state,
                request,
                index,
                &mut prefix_schedule,
                &mut prefix_buffer,
            )?;
            state.prefix_acls.push(sampled);
        }
        let (read, read_accounting) = super::super::artifact::read_root_manifest(
            lane,
            request.token,
            request.deadline,
            state
                .leaf
                .as_ref()
                .ok_or(RootBootstrapError::CleanupUncertain)?,
            facts.size,
        );
        accounting.read_references = u16::from(read_accounting.input_references_retired);
        if read_accounting.input_close_failures != 0 || accounting.read_references != 1 {
            return Err(RootBootstrapError::CleanupUncertain);
        }
        let read = read?;
        compare_prefixes(state, request, &mut prefix_schedule, &mut prefix_buffer)?;
        reobserve_leaf(state, request)?;
        prefix_schedule.finish()?;
        let prefix_acls = copy_prefix_acls(
            &state.prefix_acls,
            &state.observations,
            state.directories.len(),
        )?;
        checkpoint(state.lane, request, &state.budget)?;
        published.extend_from_slice(&state.observations);
        let expected = state.retained_count()?;
        if state.opened != expected {
            return Err(RootBootstrapError::CleanupUncertain);
        }
        accounting.expected = expected;
        accounting.after = expected;
        accounting.opened = state.opened;
        Ok(BeginData {
            begin: request.token,
            budget: Arc::clone(budget),
            anchor: data_anchor,
            observations: published,
            prefix_acls,
            read,
        })
    }
}

// One bounded slot stores the result inline; boxing would allocate at publication.
#[allow(clippy::large_enum_variant)]
pub(super) enum RootCompletion {
    Begin(Result<BeginData, RootBootstrapError>),
    Recheck(Result<UnverifiedRootStability, RootBootstrapError>),
    Retire(Result<RootRetirement, RootBootstrapError>),
}

impl RootCompletion {
    pub(super) const fn kind(&self) -> RequestKind {
        match self {
            Self::Begin(_) => RequestKind::RootManifestBegin,
            Self::Recheck(_) => RequestKind::RootManifestRecheck,
            Self::Retire(_) => RequestKind::RootManifestRetire,
        }
    }
    pub(super) const fn success(&self) -> bool {
        matches!(
            self,
            Self::Begin(Ok(_)) | Self::Recheck(Ok(_)) | Self::Retire(Ok(_))
        )
    }
    fn context(&self) -> Option<(NonZeroU64, &Arc<ArtifactBudgetState>)> {
        match self {
            Self::Begin(Ok(data)) => Some((data.begin, &data.budget)),
            Self::Recheck(Ok(data)) => Some((data.begin, &data.budget)),
            Self::Retire(Ok(data)) => Some((data.begin, &data.budget)),
            _ => None,
        }
    }
    fn matches_job(
        &self,
        kind: RequestKind,
        job: NonZeroU64,
        deadline: Instant,
        begin: NonZeroU64,
        budget: &Arc<ArtifactBudgetState>,
    ) -> bool {
        match self {
            Self::Begin(Ok(data)) => {
                kind == RequestKind::RootManifestBegin
                    && data.begin == begin
                    && begin == job
                    && Arc::ptr_eq(&data.budget, budget)
            }
            Self::Recheck(Ok(data)) => {
                kind == RequestKind::RootManifestRecheck
                    && data.begin == begin
                    && data.job == job
                    && data.deadline == deadline
                    && Arc::ptr_eq(&data.budget, budget)
            }
            Self::Retire(Ok(data)) => {
                kind == RequestKind::RootManifestRetire
                    && data.begin == begin
                    && data.job == job
                    && Arc::ptr_eq(&data.budget, budget)
            }
            _ => false,
        }
    }
    pub(super) fn denied(kind: RequestKind, error: RootBootstrapError) -> Self {
        match kind {
            RequestKind::RootManifestBegin => Self::Begin(Err(error)),
            RequestKind::RootManifestRecheck => Self::Recheck(Err(error)),
            _ => Self::Retire(Err(error)),
        }
    }
}

struct AdmissionGuard<'a> {
    lane: &'static LaneRoot,
    budget: &'a ArtifactBudgetState,
    armed: bool,
}
impl Drop for AdmissionGuard<'_> {
    fn drop(&mut self) {
        if self.armed {
            self.budget.invalidate();
            self.lane.terminalize();
        }
    }
}

struct RootJob {
    attempt: Attempt,
    begin: NonZeroU64,
    budget: Arc<ArtifactBudgetState>,
    kind: RequestKind,
}

impl RootJob {
    // Keep the guard, CAS and slot installation in one auditable lock scope.
    #[allow(clippy::too_many_lines)]
    fn prepare(
        lane: &'static LaneRoot,
        payload: RootRequest,
    ) -> Result<Option<Self>, RootBootstrapError> {
        let budget = Arc::clone(payload.budget());
        budget.valid()?;
        let old = lane.control.load(Ordering::SeqCst);
        if terminal(old) {
            budget.invalidate();
            return Err(RootBootstrapError::BudgetExhausted);
        }
        if phase(old) != IDLE {
            return Ok(None);
        }
        let kind = payload.kind();
        let mut slots = match lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(None),
            Err(std::sync::TryLockError::Poisoned(_)) => {
                budget.invalidate();
                lane.terminalize();
                return Err(RootBootstrapError::CleanupUncertain);
            }
        };
        if slots.request.is_some()
            || slots.completion.is_some()
            || slots
                .cleanup
                .is_some_and(|(_, kind, accounting)| !accounting.complete(kind))
        {
            budget.invalidate();
            lane.terminalize();
            return Err(RootBootstrapError::CleanupUncertain);
        }
        match &payload {
            RootRequest::Begin { .. } if slots.root_lease.is_some() => return Ok(None),
            RootRequest::Recheck { begin, .. } | RootRequest::Retire { begin, .. } => {
                if !slots.root_lease.as_ref().is_some_and(|lease| {
                    lease.phase == LeasePhase::Held && lease.matches(*begin, &budget)
                }) {
                    if let Some(lease) = &slots.root_lease {
                        lease.budget.invalidate();
                    }
                    budget.invalidate();
                    lane.terminalize();
                    return Err(RootBootstrapError::AssociationRejected);
                }
            }
            RootRequest::Begin { .. } => {}
        }
        if token(old) == TOKEN_MAX {
            budget.invalidate();
            lane.terminalize();
            return Err(RootBootstrapError::LimitExceeded);
        }
        let job = token(old)
            .checked_add(1)
            .and_then(NonZeroU64::new)
            .ok_or(RootBootstrapError::LimitExceeded)?;
        budget.valid()?;
        if lane
            .control
            .compare_exchange(
                old,
                word(ACTIVE, job.get()),
                Ordering::SeqCst,
                Ordering::SeqCst,
            )
            .is_err()
        {
            if terminal(lane.control.load(Ordering::SeqCst)) {
                budget.invalidate();
                return Err(RootBootstrapError::BudgetExhausted);
            }
            return Ok(None);
        }
        let mut admission = AdmissionGuard {
            lane,
            budget: &budget,
            armed: true,
        };
        let begin = payload.begin(job);
        if kind == RequestKind::RootManifestBegin {
            budget.claim_manifest()?;
        }
        if lane.control.load(Ordering::SeqCst) != word(ACTIVE, job.get())
            || Instant::now() >= budget.deadline
        {
            return Err(RootBootstrapError::BudgetExhausted);
        }
        match kind {
            RequestKind::RootManifestBegin => {
                slots.root_lease = Some(RootLease {
                    begin,
                    budget: Arc::clone(&budget),
                    phase: LeasePhase::Reserved,
                });
            }
            RequestKind::RootManifestRetire => {
                let lease = slots
                    .root_lease
                    .as_mut()
                    .ok_or(RootBootstrapError::AssociationRejected)?;
                lease.phase = LeasePhase::Retiring(job);
                budget.invalidate();
            }
            _ => {}
        }
        slots.request = Some(Request {
            token: job,
            deadline: budget.deadline,
            dispatched: false,
            payload: RequestPayload::Root(payload),
        });
        slots.cleanup = None;
        if lane.control.load(Ordering::SeqCst) != word(ACTIVE, job.get())
            || Instant::now() >= budget.deadline
        {
            return Err(RootBootstrapError::BudgetExhausted);
        }
        admission.armed = false;
        drop(admission);
        drop(slots);
        // Wake also before dispatch so an undispatched lease retains its deadline.
        lane.wake();
        Ok(Some(Self {
            attempt: Attempt {
                lane,
                token: job,
                deadline: budget.deadline,
                armed: true,
            },
            begin,
            budget,
            kind,
        }))
    }

    fn deny(&mut self, error: RootBootstrapError) -> RootBootstrapError {
        self.budget.invalidate();
        self.attempt.close();
        error
    }

    fn check(&mut self) -> Result<(), RootBootstrapError> {
        let state = self.attempt.lane.control.load(Ordering::SeqCst);
        if !self.attempt.armed
            || Instant::now() >= self.attempt.deadline
            || terminal(state)
            || !same_token(state, self.attempt.token)
        {
            return Err(self.deny(RootBootstrapError::BudgetExhausted));
        }
        if self.kind == RequestKind::RootManifestRetire {
            if self.budget.valid() != Err(ArtifactError::ObservationInvalid) {
                return Err(self.deny(RootBootstrapError::AssociationRejected));
            }
        } else if let Err(error) = self.budget.valid() {
            return Err(self.deny(error.into()));
        }
        Ok(())
    }

    fn dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError> {
        self.check()?;
        let lane = self.attempt.lane;
        let mut slots = match lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(DispatchStatus::Pending),
            Err(std::sync::TryLockError::Poisoned(_)) => {
                lane.terminalize();
                return Err(self.deny(RootBootstrapError::CleanupUncertain));
            }
        };
        let lease_phase = match self.kind {
            RequestKind::RootManifestBegin => LeasePhase::Reserved,
            RequestKind::RootManifestRetire => LeasePhase::Retiring(self.attempt.token),
            _ => LeasePhase::Held,
        };
        let valid = slots.root_lease.as_ref().is_some_and(|lease| {
            lease.matches(self.begin, &self.budget) && lease.phase == lease_phase
        }) && slots.request.as_ref().is_some_and(|request| {
            request.token == self.attempt.token
                && request.kind() == self.kind
                && !request.dispatched
                && request
                    .budget()
                    .is_some_and(|budget| Arc::ptr_eq(budget, &self.budget))
        });
        if !valid {
            lane.terminalize();
            return Err(self.deny(RootBootstrapError::AssociationRejected));
        }
        self.check()?;
        let expected = word(ACTIVE, self.attempt.token.get());
        if lane
            .control
            .compare_exchange(expected, expected, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(self.deny(RootBootstrapError::BudgetExhausted));
        }
        self.check()?;
        if let Some(request) = slots.request.as_mut() {
            request.dispatched = true;
        }
        drop(slots);
        lane.wake();
        Ok(DispatchStatus::Dispatched)
    }

    fn poll(&mut self) -> Result<Option<RootCompletion>, RootBootstrapError> {
        self.check()?;
        let lane = self.attempt.lane;
        if lane.control.load(Ordering::SeqCst) != word(READY, self.attempt.token.get()) {
            return Ok(None);
        }
        let mut slots = match lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(None),
            Err(std::sync::TryLockError::Poisoned(_)) => {
                lane.terminalize();
                return Err(self.deny(RootBootstrapError::CleanupUncertain));
            }
        };
        let valid = slots.completion.as_ref().is_some_and(|completion| {
            completion.token == self.attempt.token && completion.kind() == self.kind
                && matches!(&completion.outcome, CompletionOutcome::Root(outcome) if outcome.matches_job(self.kind, self.attempt.token, self.attempt.deadline, self.begin, &self.budget))
        }) && slots.cleanup.is_some_and(|(job,kind,accounting)| job == self.attempt.token && kind == self.kind && accounting.complete(kind));
        let lease_valid = if self.kind == RequestKind::RootManifestRetire {
            slots.root_lease.is_none()
        } else {
            slots.root_lease.as_ref().is_some_and(|lease| {
                lease.phase == LeasePhase::Held && lease.matches(self.begin, &self.budget)
            })
        };
        if !valid || !lease_valid {
            lane.terminalize();
            return Err(self.deny(RootBootstrapError::CleanupUncertain));
        }
        if !reserve_ready(&lane.control, self.attempt.token) {
            return Ok(None);
        }
        self.check()?;
        if !retire_reserved(&lane.control, self.attempt.token) {
            return Err(self.deny(RootBootstrapError::BudgetExhausted));
        }
        self.attempt.armed = false;
        let completion = slots.completion.take();
        drop(slots);
        lane.wake();
        if let Some(super::Completion {
            outcome: CompletionOutcome::Root(outcome),
            ..
        }) = completion
        {
            Ok(Some(outcome))
        } else {
            lane.terminalize();
            Err(self.deny(RootBootstrapError::CleanupUncertain))
        }
    }
}
impl Drop for RootJob {
    fn drop(&mut self) {
        if self.attempt.armed {
            self.budget.invalidate();
        }
    }
}

pub(super) struct RootManifestAttempt {
    job: RootJob,
}
impl RootManifestAttempt {
    pub(super) fn try_prepare(
        anchor: &RootManifestAnchor,
        budget: &ArtifactReadBudget,
    ) -> Result<Option<Self>, RootBootstrapError> {
        let state = budget.shared_state();
        if !cfg!(all(target_os = "linux", target_has_atomic = "64")) {
            state.invalidate();
            return Err(RootBootstrapError::UnsupportedPlatform);
        }
        state.valid()?;
        let anchor = anchor.copy().inspect_err(|_| state.invalidate())?;
        if super::LANE.control.load(Ordering::SeqCst) == super::VIRGIN {
            super::construct_once().map_err(|_| {
                state.invalidate();
                RootBootstrapError::BudgetExhausted
            })?;
        }
        RootJob::prepare(
            &super::LANE,
            RootRequest::Begin {
                anchor,
                budget: Arc::clone(state),
            },
        )
        .map(|job| job.map(|job| Self { job }))
    }
    pub(super) fn dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError> {
        self.job.dispatch()
    }
    pub(super) fn poll(
        &mut self,
    ) -> Result<Option<UnverifiedRootManifestCustody>, RootBootstrapError> {
        match self.job.poll()? {
            None => Ok(None),
            Some(RootCompletion::Begin(Ok(data))) => Ok(Some(UnverifiedRootManifestCustody {
                lane: self.job.attempt.lane,
                data,
                live: true,
            })),
            _ => Err(self.job.deny(RootBootstrapError::AssociationRejected)),
        }
    }
}

pub(super) struct UnverifiedRootManifestCustody {
    lane: &'static LaneRoot,
    data: BeginData,
    live: bool,
}
pub(super) struct RootManifestFacts<'a> {
    pub(super) path: &'a str,
    pub(super) body: &'a [u8],
    pub(super) digest: &'a [u8; 32],
    pub(super) observations: &'a [RootObjectFacts],
    pub(super) prefix_acls: &'a [RootPrefixAcl],
}
impl UnverifiedRootManifestCustody {
    fn check_basic(&self, budget: &ArtifactReadBudget) -> Result<(), RootBootstrapError> {
        let deny = || {
            self.data.budget.invalidate();
            self.lane.wake();
            RootBootstrapError::AssociationRejected
        };
        if !self.live
            || !Arc::ptr_eq(budget.shared_state(), &self.data.budget)
            || terminal(self.lane.control.load(Ordering::SeqCst))
        {
            return Err(deny());
        }
        self.data.budget.valid()?;
        Ok(())
    }
    fn check_held_lease(&self) -> Result<(), RootBootstrapError> {
        let slots = match self.lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(error) => {
                self.data.budget.invalidate();
                if matches!(error, std::sync::TryLockError::Poisoned(_)) {
                    self.lane.terminalize();
                }
                self.lane.wake();
                return Err(RootBootstrapError::CleanupUncertain);
            }
        };
        if !slots.root_lease.as_ref().is_some_and(|lease| {
            lease.phase == LeasePhase::Held && lease.matches(self.data.begin, &self.data.budget)
        }) {
            self.data.budget.invalidate();
            self.lane.wake();
            return Err(RootBootstrapError::AssociationRejected);
        }
        Ok(())
    }
    pub(super) fn facts<'a>(
        &'a self,
        budget: &'a ArtifactReadBudget,
    ) -> Result<RootManifestFacts<'a>, RootBootstrapError> {
        self.check_basic(budget)?;
        self.check_held_lease()?;
        let facts = self
            .data
            .read
            .root_manifest_facts(&self.data.budget, self.data.begin)?;
        Ok(RootManifestFacts {
            path: &self.data.anchor.path,
            body: facts.body,
            digest: facts.digest,
            observations: &self.data.observations,
            prefix_acls: &self.data.prefix_acls,
        })
    }
    pub(super) fn try_recheck<'a>(
        &'a self,
        budget: &'a ArtifactReadBudget,
    ) -> Result<Option<RootRecheckAttempt<'a>>, RootBootstrapError> {
        self.check_basic(budget)?;
        RootJob::prepare(
            self.lane,
            RootRequest::Recheck {
                begin: self.data.begin,
                budget: Arc::clone(&self.data.budget),
            },
        )
        .map(|job| {
            job.map(|job| RootRecheckAttempt {
                ticket: self,
                job,
                completed: false,
            })
        })
    }
    pub(super) fn try_retire<'a>(
        &'a mut self,
        budget: &'a ArtifactReadBudget,
    ) -> Result<Option<RootRetireAttempt<'a>>, RootBootstrapError> {
        self.check_basic(budget)?;
        let job = RootJob::prepare(
            self.lane,
            RootRequest::Retire {
                begin: self.data.begin,
                budget: Arc::clone(&self.data.budget),
            },
        )?;
        Ok(job.map(|job| RootRetireAttempt { ticket: self, job }))
    }
}
impl Drop for UnverifiedRootManifestCustody {
    fn drop(&mut self) {
        self.data.budget.invalidate();
        self.lane.wake();
    }
}

pub(super) struct RootRecheckAttempt<'a> {
    ticket: &'a UnverifiedRootManifestCustody,
    job: RootJob,
    completed: bool,
}
impl RootRecheckAttempt<'_> {
    pub(super) fn dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError> {
        self.job.dispatch()
    }
    pub(super) fn poll(&mut self) -> Result<Option<UnverifiedRootStability>, RootBootstrapError> {
        match self.job.poll()? {
            None => Ok(None),
            Some(RootCompletion::Recheck(Ok(data))) => {
                self.completed = true;
                Ok(Some(data))
            }
            _ => Err(self.job.deny(RootBootstrapError::AssociationRejected)),
        }
    }
}
pub(super) struct RootStabilityFacts<'a> {
    pub(super) path: &'a str,
    pub(super) observations: &'a [RootObjectFacts],
}
impl UnverifiedRootStability {
    pub(super) fn facts<'a>(
        &self,
        attempt: &'a RootRecheckAttempt<'_>,
        budget: &ArtifactReadBudget,
    ) -> Result<RootStabilityFacts<'a>, RootBootstrapError> {
        if !attempt.completed
            || self.begin != attempt.ticket.data.begin
            || self.job != attempt.job.attempt.token
            || self.deadline != attempt.job.attempt.deadline
            || !Arc::ptr_eq(&self.budget, budget.shared_state())
            || !Arc::ptr_eq(&self.budget, &attempt.job.budget)
            || usize::from(self.objects) != attempt.ticket.data.observations.len()
        {
            self.budget.invalidate();
            attempt.ticket.lane.wake();
            return Err(RootBootstrapError::AssociationRejected);
        }
        attempt.ticket.check_basic(budget)?;
        attempt.ticket.check_held_lease()?;
        Ok(RootStabilityFacts {
            path: &attempt.ticket.data.anchor.path,
            observations: &attempt.ticket.data.observations,
        })
    }
}
pub(super) struct RootRetireAttempt<'a> {
    ticket: &'a mut UnverifiedRootManifestCustody,
    job: RootJob,
}
impl RootRetireAttempt<'_> {
    pub(super) fn dispatch(&mut self) -> Result<DispatchStatus, RootBootstrapError> {
        self.job.dispatch()
    }
    pub(super) fn poll(&mut self) -> Result<Option<RootRetirement>, RootBootstrapError> {
        match self.job.poll()? {
            None => Ok(None),
            Some(RootCompletion::Retire(Ok(data))) => {
                self.ticket.live = false;
                Ok(Some(data))
            }
            _ => Err(self.job.deny(RootBootstrapError::AssociationRejected)),
        }
    }
}

// Called under Slots only after the worker has completed the native operation.
pub(super) fn publish_lease(
    slots: &mut super::Slots,
    job: NonZeroU64,
    outcome: &RootCompletion,
    budget: Option<&ArtifactBudgetState>,
    accounting: CleanupAccounting,
) -> bool {
    let Some((begin, state)) = outcome.context() else {
        return false;
    };
    if budget.is_none_or(|budget| !std::ptr::eq(budget, state.as_ref()))
        || !accounting.complete(outcome.kind())
    {
        return false;
    }
    let Some(lease) = slots.root_lease.as_mut() else {
        return false;
    };
    if !lease.matches(begin, state) {
        return false;
    }
    match outcome {
        RootCompletion::Begin(Ok(data)) if begin == job && lease.phase == LeasePhase::Reserved => {
            if state.valid().is_err()
                || accounting
                    .root
                    .is_none_or(|account| usize::from(account.after) != data.observations.len())
            {
                return false;
            }
            lease.phase = LeasePhase::Held;
            true
        }
        RootCompletion::Recheck(Ok(data))
            if data.job == job
                && data.deadline == state.deadline
                && lease.phase == LeasePhase::Held =>
        {
            state.valid().is_ok()
                && accounting
                    .root
                    .is_some_and(|account| account.after == data.objects)
        }
        RootCompletion::Retire(Ok(data))
            if data.job == job && lease.phase == LeasePhase::Retiring(job) =>
        {
            if Instant::now() >= state.deadline
                || state.valid() != Err(ArtifactError::ObservationInvalid)
                || accounting
                    .root
                    .is_none_or(|account| account.before != data.descriptors)
            {
                return false;
            }
            slots.root_lease = None;
            true
        }
        _ => false,
    }
}

#[cfg(test)]
#[path = "headless_native_root_bootstrap_tests.rs"]
mod tests;
