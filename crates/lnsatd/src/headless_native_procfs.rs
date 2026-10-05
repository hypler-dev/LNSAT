//! Private bounded Stage-A procfs observation lane. No caller or authority API.

use super::mountinfo::MountInfoError;
use std::{
    fs::File,
    num::NonZeroU64,
    sync::{
        Arc, Mutex, OnceLock,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    thread::{self, JoinHandle, Thread},
    time::{Duration, Instant},
};

const TERMINAL: u64 = 1 << 63;
const PHASE_MASK: u64 = 0b111;
const TOKEN_SHIFT: u32 = 3;
const TOKEN_MAX: u64 = (1 << 60) - 1;
const VIRGIN: u64 = 0;
const BUILDING: u64 = 1;
const IDLE: u64 = 2;
const ACTIVE: u64 = 3;
const READY: u64 = 4;
const RESERVED: u64 = 5;
const RETIRING: u64 = 6;
const BODY_RETURNED: u64 = 7;
const WORKER_STACK_BYTES: usize = 4_194_304;
const MAX_MOUNTINFO_BYTES: usize = 1_048_576;
const MAX_FDINFO_BYTES: usize = 4_096;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ProcfsError {
    UnsupportedPlatform,
    InvalidDescriptor,
    OriginRejected,
    ReadRejected,
    InvalidFdinfo,
    LimitExceeded,
    StorageUnavailable,
    BudgetExhausted,
    ObjectChanged,
    AssociationRejected,
    CleanupUncertain,
    MountInfo(MountInfoError),
}

impl ProcfsError {
    const fn code(self) -> &'static str {
        match self {
            Self::UnsupportedPlatform => "native_procfs.unsupported_platform",
            Self::InvalidDescriptor => "native_procfs.invalid_descriptor",
            Self::OriginRejected => "native_procfs.origin_rejected",
            Self::ReadRejected => "native_procfs.read_rejected",
            Self::InvalidFdinfo => "native_procfs.invalid_fdinfo",
            Self::LimitExceeded => "native_procfs.limit_exceeded",
            Self::StorageUnavailable => "native_procfs.storage_unavailable",
            Self::BudgetExhausted => "native_procfs.budget_exhausted",
            Self::ObjectChanged => "native_procfs.object_changed",
            Self::AssociationRejected => "native_procfs.association_rejected",
            Self::CleanupUncertain => "native_procfs.cleanup_uncertain",
            Self::MountInfo(error) => error.code(),
        }
    }
}

// Deliberately private, non-Clone, and constructed only by later owner preparation.
struct OwnedProcfsCustody {
    resource: Arc<File>,
    proc_root: Arc<File>,
}

struct Attempt {
    lane: &'static LaneRoot,
    token: NonZeroU64,
    deadline: Instant,
    armed: bool,
}

#[derive(Clone, Copy, Eq, PartialEq)]
struct ObjectObservation {
    device: u64,
    inode: u64,
    mode: u32,
    uid: u32,
    gid: u32,
    links: u64,
    ctime_seconds: i64,
    ctime_nanoseconds: i64,
    filesystem_magic: i64,
    mount_id: u32,
    descriptor_flags: u32,
    status_flags: u32,
    device_major: u32,
    device_minor: u32,
}

#[derive(Clone, Copy, Eq, PartialEq)]
struct LinkObservation {
    device_major: u32,
    device_minor: u32,
    inode: u64,
    mount_id: u32,
}

fn validate_namespace_link(
    link: LinkObservation,
    filesystem_magic: i64,
    inode: u64,
    device_major: u64,
    device_minor: u64,
) -> Result<LinkObservation, ProcfsError> {
    if filesystem_magic != 0x6e73_6673 {
        return Err(ProcfsError::OriginRejected);
    }
    if link.inode != inode
        || u64::from(link.device_major) != device_major
        || u64::from(link.device_minor) != device_minor
    {
        return Err(ProcfsError::ObjectChanged);
    }
    Ok(link)
}

struct NativeSample {
    resource: ObjectObservation,
    proc_root: ObjectObservation,
    process_root: LinkObservation,
    mount_namespace: LinkObservation,
    user_namespace: LinkObservation,
    mountinfo: Vec<u8>,
}

struct Request {
    token: NonZeroU64,
    deadline: Instant,
    dispatched: bool,
    resource: Arc<File>,
    proc_root: Arc<File>,
}

struct Completion {
    token: NonZeroU64,
    outcome: Result<NativeSample, ProcfsError>,
}

struct Slots {
    join: Option<JoinHandle<()>>,
    request: Option<Request>,
    completion: Option<Completion>,
    cleanup: Option<(NonZeroU64, CleanupAccounting)>,
}

impl Slots {
    const fn new() -> Self {
        Self {
            join: None,
            request: None,
            completion: None,
            cleanup: None,
        }
    }
}

struct LaneRoot {
    control: AtomicU64,
    started: AtomicBool,
    wake: OnceLock<Thread>,
    slots: Mutex<Slots>,
}

impl LaneRoot {
    const fn new() -> Self {
        Self {
            control: AtomicU64::new(VIRGIN),
            started: AtomicBool::new(false),
            wake: OnceLock::new(),
            slots: Mutex::new(Slots::new()),
        }
    }

    fn terminalize(&self) {
        self.control.fetch_or(TERMINAL, Ordering::SeqCst);
        if let Some(worker) = self.wake.get() {
            worker.unpark();
        }
    }

    fn wake(&self) {
        if let Some(worker) = self.wake.get() {
            worker.unpark();
        }
    }
}

static LANE: LaneRoot = LaneRoot::new();

fn word(phase: u64, token: u64) -> u64 {
    phase | (token << TOKEN_SHIFT)
}

fn terminal(word: u64) -> bool {
    word & TERMINAL != 0
}

fn phase(word: u64) -> u64 {
    word & PHASE_MASK
}

fn token(word: u64) -> u64 {
    (word & !TERMINAL) >> TOKEN_SHIFT
}

fn same_token(word: u64, attempt_token: NonZeroU64) -> bool {
    token(word) == attempt_token.get()
}

fn checked_deadline(start: Instant, enclosing: Instant) -> Result<Instant, ProcfsError> {
    let local = start
        .checked_add(Duration::from_secs(5))
        .ok_or(ProcfsError::BudgetExhausted)?;
    let deadline = local.min(enclosing);
    if Instant::now() >= deadline {
        return Err(ProcfsError::BudgetExhausted);
    }
    Ok(deadline)
}

struct ConstructionGuard {
    committed: bool,
}

impl Drop for ConstructionGuard {
    fn drop(&mut self) {
        if !self.committed {
            LANE.terminalize();
            LANE.started.store(true, Ordering::SeqCst);
            LANE.wake();
        }
    }
}

struct WorkerExitGuard;

impl Drop for WorkerExitGuard {
    fn drop(&mut self) {
        LANE.terminalize();
    }
}

fn construct_once() -> Result<(), ProcfsError> {
    #[cfg(not(all(target_os = "linux", target_has_atomic = "64")))]
    {
        Err(ProcfsError::UnsupportedPlatform)
    }
    #[cfg(all(target_os = "linux", target_has_atomic = "64"))]
    {
        if LANE
            .control
            .compare_exchange(VIRGIN, BUILDING, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(ProcfsError::BudgetExhausted);
        }
        let mut construction = ConstructionGuard { committed: false };
        let mut slots = match LANE.slots.try_lock() {
            Ok(slots) => slots,
            Err(_) => return Err(ProcfsError::BudgetExhausted),
        };
        if slots.join.is_some() || slots.request.is_some() || slots.completion.is_some() {
            return Err(ProcfsError::BudgetExhausted);
        }
        let handle = thread::Builder::new()
            .stack_size(WORKER_STACK_BYTES)
            .spawn(fixed_worker_entry)
            .map_err(|_| ProcfsError::StorageUnavailable)?;
        // The empty slot was proved while this guard stayed held. Do not replace a handle.
        slots.join = Some(handle);
        let worker = match slots.join.as_ref() {
            Some(handle) => handle.thread().clone(),
            None => return Err(ProcfsError::BudgetExhausted),
        };
        if LANE.wake.set(worker).is_err() {
            return Err(ProcfsError::BudgetExhausted);
        }
        drop(slots);
        let current = LANE.control.load(Ordering::SeqCst);
        if !terminal(current) {
            let _ =
                LANE.control
                    .compare_exchange(BUILDING, IDLE, Ordering::SeqCst, Ordering::SeqCst);
        }
        LANE.started.store(true, Ordering::SeqCst);
        LANE.wake();
        construction.committed = true;
        if terminal(LANE.control.load(Ordering::SeqCst)) {
            return Err(ProcfsError::BudgetExhausted);
        }
        Ok(())
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DispatchStatus {
    Pending,
    Dispatched,
}

// A local cancel can race only ACTIVE -> READY. One strong-CAS retry suffices;
// stop already sets TERMINAL and unique mutable Attempt access excludes retirement.
fn cancel_matching(control: &AtomicU64, attempt_token: NonZeroU64) -> bool {
    let mut observed = control.load(Ordering::SeqCst);
    for _ in 0..2 {
        if terminal(observed) || !same_token(observed, attempt_token) {
            return false;
        }
        if ![ACTIVE, READY, RESERVED].contains(&phase(observed)) {
            return false;
        }
        match control.compare_exchange(
            observed,
            observed | TERMINAL,
            Ordering::SeqCst,
            Ordering::SeqCst,
        ) {
            Ok(_) => return true,
            Err(current) => observed = current,
        }
    }
    false
}

fn reserve_ready(control: &AtomicU64, attempt_token: NonZeroU64) -> bool {
    control
        .compare_exchange(
            word(READY, attempt_token.get()),
            word(RESERVED, attempt_token.get()),
            Ordering::SeqCst,
            Ordering::SeqCst,
        )
        .is_ok()
}

fn retire_reserved(control: &AtomicU64, attempt_token: NonZeroU64) -> bool {
    control
        .compare_exchange(
            word(RESERVED, attempt_token.get()),
            word(RETIRING, attempt_token.get()),
            Ordering::SeqCst,
            Ordering::SeqCst,
        )
        .is_ok()
}

impl Attempt {
    fn try_prepare(
        custody: &OwnedProcfsCustody,
        enclosing_deadline: Instant,
    ) -> Result<Self, ProcfsError> {
        if !cfg!(all(target_os = "linux", target_has_atomic = "64")) {
            return Err(ProcfsError::UnsupportedPlatform);
        }
        let deadline = checked_deadline(Instant::now(), enclosing_deadline)?;
        if LANE.control.load(Ordering::SeqCst) == VIRGIN {
            construct_once()?;
        }
        Self::prepare_in(&LANE, custody, deadline)
    }

    fn prepare_in(
        lane: &'static LaneRoot,
        custody: &OwnedProcfsCustody,
        deadline: Instant,
    ) -> Result<Self, ProcfsError> {
        if Instant::now() >= deadline {
            return Err(ProcfsError::BudgetExhausted);
        }
        let old = lane.control.load(Ordering::SeqCst);
        if terminal(old) || phase(old) != IDLE {
            return Err(ProcfsError::BudgetExhausted);
        }
        if token(old) == TOKEN_MAX {
            lane.terminalize();
            return Err(ProcfsError::LimitExceeded);
        }
        let next_token = token(old)
            .checked_add(1)
            .and_then(NonZeroU64::new)
            .ok_or(ProcfsError::LimitExceeded)?;
        let mut slots = match lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(std::sync::TryLockError::WouldBlock) => return Err(ProcfsError::BudgetExhausted),
            Err(std::sync::TryLockError::Poisoned(_)) => {
                lane.terminalize();
                return Err(ProcfsError::CleanupUncertain);
            }
        };
        if slots.request.is_some() || slots.completion.is_some() {
            lane.terminalize();
            return Err(ProcfsError::CleanupUncertain);
        }
        if Instant::now() >= deadline {
            return Err(ProcfsError::BudgetExhausted);
        }
        let resource = Arc::clone(&custody.resource);
        let proc_root = Arc::clone(&custody.proc_root);
        if lane
            .control
            .compare_exchange(
                old,
                word(ACTIVE, next_token.get()),
                Ordering::SeqCst,
                Ordering::SeqCst,
            )
            .is_err()
        {
            return Err(ProcfsError::BudgetExhausted);
        }
        // No fallible operation follows this CAS before the two shared references
        // become slot-owned. The borrowed owner prevents final close on rejection.
        slots.request = Some(Request {
            token: next_token,
            deadline,
            dispatched: false,
            resource,
            proc_root,
        });
        slots.cleanup = None;
        Ok(Self {
            lane,
            token: next_token,
            deadline,
            armed: true,
        })
    }

    fn dispatch(&mut self) -> Result<DispatchStatus, ProcfsError> {
        if !self.armed || Instant::now() >= self.deadline {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        let expected = word(ACTIVE, self.token.get());
        if self.lane.control.load(Ordering::SeqCst) != expected {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        let mut slots = match self.lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(DispatchStatus::Pending),
            Err(std::sync::TryLockError::Poisoned(_)) => {
                self.lane.terminalize();
                self.armed = false;
                return Err(ProcfsError::CleanupUncertain);
            }
        };
        let valid = slots
            .request
            .as_ref()
            .is_some_and(|request| request.token == self.token && !request.dispatched);
        if !valid {
            return Err(ProcfsError::InvalidDescriptor);
        }
        if Instant::now() >= self.deadline {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        if self
            .lane
            .control
            .compare_exchange(expected, expected, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        // A clock sample after the RMW proves that its admission linearization
        // preceded D. If scheduling consumed the budget, no flag is published.
        if Instant::now() >= self.deadline {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        // Stop after this check can leave a published dispatch for worker cleanup;
        // it does not authorize another call or make syscall entry cancellable.
        if let Some(request) = slots.request.as_mut() {
            request.dispatched = true;
        }
        drop(slots);
        self.lane.wake();
        Ok(DispatchStatus::Dispatched)
    }

    fn poll(&mut self) -> Result<Option<NativeSample>, ProcfsError> {
        if !self.armed || Instant::now() >= self.deadline {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        let current = self.lane.control.load(Ordering::SeqCst);
        if terminal(current) || !same_token(current, self.token) {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        if current != word(READY, self.token.get()) {
            return Ok(None);
        }
        let mut slots = match self.lane.slots.try_lock() {
            Ok(slots) => slots,
            Err(std::sync::TryLockError::WouldBlock) => return Ok(None),
            Err(std::sync::TryLockError::Poisoned(_)) => {
                self.lane.terminalize();
                self.armed = false;
                return Err(ProcfsError::CleanupUncertain);
            }
        };
        if slots
            .completion
            .as_ref()
            .is_none_or(|completion| completion.token != self.token)
            || !slots
                .cleanup
                .is_some_and(|(token, accounting)| token == self.token && accounting.complete())
        {
            self.lane.terminalize();
            self.armed = false;
            return Err(ProcfsError::CleanupUncertain);
        }
        if !reserve_ready(&self.lane.control, self.token) {
            return Ok(None);
        }
        // The reservation happens before this clock sample. Late outcomes remain
        // in the root for worker disposal; no allocator/free work moves here.
        if Instant::now() >= self.deadline || terminal(self.lane.control.load(Ordering::SeqCst)) {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        if !retire_reserved(&self.lane.control, self.token) {
            self.close();
            return Err(ProcfsError::BudgetExhausted);
        }
        self.armed = false;
        let completion = slots.completion.take();
        drop(slots);
        self.lane.wake();
        if let Some(completion) = completion {
            completion.outcome.map(Some)
        } else {
            self.lane.terminalize();
            Err(ProcfsError::CleanupUncertain)
        }
    }

    fn close(&mut self) {
        if self.armed {
            self.armed = false;
            if cancel_matching(&self.lane.control, self.token) {
                self.lane.wake();
            }
        }
    }
}

impl Drop for Attempt {
    fn drop(&mut self) {
        self.close();
    }
}

fn fixed_worker_entry() {
    let _exit = WorkerExitGuard;
    // Unwind cleanup may itself block. Coordinator denial never waits for this catch.
    if std::panic::catch_unwind(worker_body).is_err() {
        LANE.terminalize();
    }
}

fn worker_body() {
    while !LANE.started.load(Ordering::SeqCst) {
        thread::park();
    }
    loop {
        let state = LANE.control.load(Ordering::SeqCst);
        if terminal(state) {
            drain_terminal(&LANE);
            return;
        }
        if phase(state) == RETIRING {
            if !finish_retirement(&LANE, state) {
                LANE.terminalize();
            }
            continue;
        }
        if phase(state) != ACTIVE {
            thread::park();
            continue;
        }
        let request = {
            let Ok(mut slots) = LANE.slots.lock() else {
                LANE.terminalize();
                return;
            };
            if slots
                .request
                .as_ref()
                .is_some_and(|request| request.dispatched && same_token(state, request.token))
            {
                slots.request.take()
            } else {
                None
            }
        };
        let Some(request) = request else {
            thread::park();
            continue;
        };
        let request_token = request.token;
        let deadline = request.deadline;
        let (outcome, mut accounting) = run_fixed_procfs_attempt(&request);
        retire_request(&LANE, request, &mut accounting);
        publish_completion(&LANE, request_token, deadline, outcome, accounting);
    }
}

// Only the worker calls this after native work and input retirement. Tests supply
// denial outcomes to exercise the same publication and cleanup bookkeeping.
fn publish_completion(
    lane: &LaneRoot,
    request_token: NonZeroU64,
    deadline: Instant,
    outcome: Result<NativeSample, ProcfsError>,
    accounting: CleanupAccounting,
) {
    if !accounting.complete() || Instant::now() >= deadline {
        lane.terminalize();
    }
    let Ok(mut slots) = lane.slots.lock() else {
        lane.terminalize();
        drop(outcome);
        return;
    };
    slots.cleanup = Some((request_token, accounting));
    let active = word(ACTIVE, request_token.get());
    if lane.control.load(Ordering::SeqCst) != active
        || slots.completion.is_some()
        || slots.request.is_some()
    {
        lane.terminalize();
        drop(slots);
        drop(outcome);
        return;
    }
    slots.completion = Some(Completion {
        token: request_token,
        outcome,
    });
    if lane
        .control
        .compare_exchange(
            active,
            word(READY, request_token.get()),
            Ordering::SeqCst,
            Ordering::SeqCst,
        )
        .is_err()
    {
        lane.terminalize();
    }
}

fn finish_retirement(lane: &LaneRoot, state: u64) -> bool {
    if terminal(state) || phase(state) != RETIRING {
        return false;
    }
    let Ok(slots) = lane.slots.lock() else {
        return false;
    };
    if slots.request.is_some()
        || slots.completion.is_some()
        || !slots
            .cleanup
            .is_some_and(|(job, accounting)| same_token(state, job) && accounting.complete())
    {
        return false;
    }
    drop(slots);
    lane.control
        .compare_exchange(
            state,
            word(IDLE, token(state)),
            Ordering::SeqCst,
            Ordering::SeqCst,
        )
        .is_ok()
}

fn drain_terminal(lane: &LaneRoot) {
    if !terminal(lane.control.load(Ordering::SeqCst)) {
        return;
    }
    let (request, completion) = {
        let Ok(mut slots) = lane.slots.lock() else {
            return;
        };
        (slots.request.take(), slots.completion.take())
    };
    let cleanup = request.map(|request| {
        let token = request.token;
        let mut accounting = CleanupAccounting::default();
        retire_request(lane, request, &mut accounting);
        (token, accounting)
    });
    drop(completion);
    if let Some(cleanup) = cleanup {
        match lane.slots.lock() {
            Ok(mut slots) => slots.cleanup = Some(cleanup),
            Err(_) => return,
        }
    }
    let state = lane.control.load(Ordering::SeqCst);
    let _ = lane.control.compare_exchange(
        state,
        word(BODY_RETURNED, token(state)) | TERMINAL,
        Ordering::SeqCst,
        Ordering::SeqCst,
    );
}

fn retire_request(lane: &LaneRoot, request: Request, accounting: &mut CleanupAccounting) {
    #[cfg(not(target_os = "linux"))]
    let _ = lane;
    // Both references are retired even when the first consuming close fails.
    for file in [request.resource, request.proc_root] {
        #[cfg(target_os = "linux")]
        {
            if let Some(file) = Arc::into_inner(file) {
                if nix::unistd::close(file).is_err() {
                    accounting.input_close_failures += 1;
                    lane.terminalize();
                }
            }
        }
        #[cfg(not(target_os = "linux"))]
        drop(file);
        accounting.input_references_retired += 1;
    }
}

#[derive(Clone, Copy, Default)]
struct CleanupAccounting {
    reader_handles: u8,
    reader_close_attempts: u8,
    reader_close_failures: u8,
    input_references_retired: u8,
    input_close_failures: u8,
}

impl CleanupAccounting {
    fn reader_clean(self) -> bool {
        self.reader_handles == self.reader_close_attempts && self.reader_close_failures == 0
    }

    fn complete(self) -> bool {
        self.reader_clean() && self.input_references_retired == 2 && self.input_close_failures == 0
    }
}

#[cfg(not(target_os = "linux"))]
fn run_fixed_procfs_attempt(
    _request: &Request,
) -> (Result<NativeSample, ProcfsError>, CleanupAccounting) {
    (
        Err(ProcfsError::UnsupportedPlatform),
        CleanupAccounting::default(),
    )
}

#[cfg(target_os = "linux")]
fn run_fixed_procfs_attempt(
    request: &Request,
) -> (Result<NativeSample, ProcfsError>, CleanupAccounting) {
    linux::observe(request)
}

// This module has one fixed native schedule, with no supplied observer or callback.
#[cfg(target_os = "linux")]
mod linux {
    use super::super::{fdinfo::FdInfoRecord, mountinfo::MountInfoTable};
    use super::*;
    use nix::fcntl::{FcntlArg, OFlag, OpenHow, ResolveFlag, fcntl, openat, openat2};
    use nix::sys::{
        stat::{Mode, fstat, major, minor},
        statfs::fstatfs,
    };
    use rustix::fs::{AtFlags, StatxFlags};
    use std::ffi::CStr;
    use std::os::fd::{AsFd, AsRawFd, OwnedFd};

    const PROC_MAGIC: i64 = 0x9fa0;
    const EXT4_MAGIC: i64 = 0xef53;
    const TMPFS_MAGIC: i64 = 0x0102_1994;
    const SELF: usize = 0;
    const FDINFO: usize = 1;
    const NS: usize = 2;
    const MOUNT_NS: usize = 3;
    const USER_NS: usize = 4;
    const RECORD: usize = 5;

    pub(super) fn validate_status_flags(status_flags: i32) -> Result<(), ProcfsError> {
        let allowed = if status_flags & nix::libc::O_PATH != 0 {
            nix::libc::O_PATH | nix::libc::O_DIRECTORY | nix::libc::O_NOFOLLOW
        } else {
            // The pinned raw Linux backend preserves the kernel-observed bit.
            // Some 64-bit libc APIs define O_LARGEFILE as zero for open().
            let largefile = i32::try_from(rustix::fs::OFlags::LARGEFILE.bits())
                .map_err(|_| ProcfsError::UnsupportedPlatform)?;
            if largefile == 0 {
                return Err(ProcfsError::UnsupportedPlatform);
            }
            largefile | nix::libc::O_DIRECTORY | nix::libc::O_NOFOLLOW
        };
        if status_flags & nix::libc::O_ACCMODE != nix::libc::O_RDONLY
            || status_flags & !allowed != 0
        {
            return Err(ProcfsError::InvalidDescriptor);
        }
        Ok(())
    }

    struct DecimalComponent {
        bytes: [u8; 11],
        start: usize,
    }

    impl DecimalComponent {
        fn new(mut value: u32) -> Self {
            let mut bytes = [0; 11];
            let mut start = 10;
            loop {
                start -= 1;
                bytes[start] = b'0' + (value % 10) as u8;
                value /= 10;
                if value == 0 {
                    break;
                }
            }
            Self { bytes, start }
        }

        fn name(&self) -> Result<&CStr, ProcfsError> {
            CStr::from_bytes_with_nul(&self.bytes[self.start..])
                .map_err(|_| ProcfsError::InvalidDescriptor)
        }
    }

    struct NativeScope<'a> {
        request: &'a Request,
        handles: [Option<OwnedFd>; 6],
        accounting: CleanupAccounting,
    }

    pub(super) fn observe(
        request: &Request,
    ) -> (Result<NativeSample, ProcfsError>, CleanupAccounting) {
        let mut scope = NativeScope {
            request,
            handles: [None, None, None, None, None, None],
            accounting: CleanupAccounting::default(),
        };
        let result = scope.schedule();
        // Every normal path consumes every independently owned FD, even after denial.
        scope.close_all();
        let result = if !scope.accounting.reader_clean() {
            LANE.terminalize();
            Err(ProcfsError::CleanupUncertain)
        } else if let Err(error) = scope.check() {
            Err(error)
        } else {
            result
        };
        (result, scope.accounting)
    }

    impl NativeScope<'_> {
        fn check(&self) -> Result<(), ProcfsError> {
            if terminal(LANE.control.load(Ordering::SeqCst))
                || Instant::now() >= self.request.deadline
            {
                LANE.terminalize();
                return Err(ProcfsError::BudgetExhausted);
            }
            Ok(())
        }

        fn fd(&self, index: usize) -> Result<&OwnedFd, ProcfsError> {
            self.handles
                .get(index)
                .and_then(Option::as_ref)
                .ok_or(ProcfsError::InvalidDescriptor)
        }

        fn close_one(&mut self, index: usize) {
            if let Some(fd) = self.handles[index].take() {
                self.accounting.reader_close_attempts += 1;
                if nix::unistd::close(fd).is_err() {
                    self.accounting.reader_close_failures += 1;
                    LANE.terminalize();
                }
            }
        }

        fn close_all(&mut self) {
            for index in (0..self.handles.len()).rev() {
                self.close_one(index);
            }
        }

        fn retain_opened(
            &mut self,
            index: usize,
            opened: nix::Result<OwnedFd>,
        ) -> Result<(), ProcfsError> {
            // The caller proves the slot empty before entering the native open.
            match opened {
                Ok(fd) => {
                    self.handles[index] = Some(fd);
                    self.accounting.reader_handles += 1;
                    self.check()
                }
                Err(_) => {
                    self.check()?;
                    Err(ProcfsError::OriginRejected)
                }
            }
        }

        fn open_confined(
            &mut self,
            parent: Option<usize>,
            name: &CStr,
            index: usize,
            directory: bool,
            expected_proc: &ObjectObservation,
        ) -> Result<ObjectObservation, ProcfsError> {
            if self.handles[index].is_some() {
                return Err(ProcfsError::InvalidDescriptor);
            }
            let mut flags = OFlag::O_RDONLY | OFlag::O_CLOEXEC | OFlag::O_NOFOLLOW;
            if directory {
                flags |= OFlag::O_DIRECTORY;
            }
            let how = OpenHow::new().flags(flags).resolve(
                ResolveFlag::RESOLVE_BENEATH
                    | ResolveFlag::RESOLVE_NO_SYMLINKS
                    | ResolveFlag::RESOLVE_NO_MAGICLINKS
                    | ResolveFlag::RESOLVE_NO_XDEV,
            );
            self.check()?;
            let opened = match parent {
                Some(parent) => openat2(self.fd(parent)?, name, how),
                None => openat2(self.request.proc_root.as_ref(), name, how),
            };
            self.retain_opened(index, opened)?;
            let observed = self.object(self.fd(index)?)?;
            let kind = if directory {
                nix::libc::S_IFDIR
            } else {
                nix::libc::S_IFREG
            };
            if observed.mode & nix::libc::S_IFMT != kind
                || observed.filesystem_magic != PROC_MAGIC
                || observed.device != expected_proc.device
                || observed.mount_id != expected_proc.mount_id
            {
                return Err(ProcfsError::OriginRejected);
            }
            Ok(observed)
        }

        fn open_namespace(
            &mut self,
            name: &CStr,
            index: usize,
        ) -> Result<LinkObservation, ProcfsError> {
            if self.handles[index].is_some() {
                return Err(ProcfsError::InvalidDescriptor);
            }
            self.check()?;
            let opened = openat(
                self.fd(NS)?,
                name,
                OFlag::O_RDONLY | OFlag::O_CLOEXEC,
                Mode::empty(),
            );
            self.retain_opened(index, opened)?;
            self.namespace(name, index)
        }

        #[allow(
            clippy::unnecessary_cast,
            reason = "Normalize native stat fields across Linux ABIs"
        )]
        fn namespace(&self, name: &CStr, index: usize) -> Result<LinkObservation, ProcfsError> {
            self.check()?;
            let stat = fstat(self.fd(index)?);
            self.check()?;
            let stat = stat.map_err(|_| ProcfsError::OriginRejected)?;
            self.check()?;
            let filesystem = fstatfs(self.fd(index)?);
            self.check()?;
            let filesystem = filesystem.map_err(|_| ProcfsError::OriginRejected)?;
            let link = self.link(self.fd(NS)?, name)?;
            validate_namespace_link(
                link,
                filesystem.filesystem_type().0 as i64,
                stat.st_ino as u64,
                major(stat.st_dev),
                minor(stat.st_dev),
            )
        }

        fn link<Fd: AsFd>(&self, parent: Fd, name: &CStr) -> Result<LinkObservation, ProcfsError> {
            self.check()?;
            let stat = rustix::fs::statx(
                parent,
                name,
                AtFlags::empty(),
                StatxFlags::BASIC_STATS | StatxFlags::MNT_ID,
            );
            self.check()?;
            let stat = stat.map_err(|_| ProcfsError::OriginRejected)?;
            let mask = (StatxFlags::BASIC_STATS | StatxFlags::MNT_ID).bits();
            if stat.stx_mask & mask != mask || stat.stx_mnt_id > i32::MAX as u64 {
                return Err(ProcfsError::OriginRejected);
            }
            Ok(LinkObservation {
                device_major: stat.stx_dev_major,
                device_minor: stat.stx_dev_minor,
                inode: stat.stx_ino,
                mount_id: stat.stx_mnt_id as u32,
            })
        }

        #[allow(
            clippy::unnecessary_cast,
            reason = "Normalize native stat fields across Linux ABIs"
        )]
        fn object<Fd: AsFd>(&self, fd: Fd) -> Result<ObjectObservation, ProcfsError> {
            self.check()?;
            let descriptor_flags = fcntl(&fd, FcntlArg::F_GETFD);
            self.check()?;
            let descriptor_flags = descriptor_flags.map_err(|_| ProcfsError::InvalidDescriptor)?;
            if descriptor_flags != nix::libc::FD_CLOEXEC {
                return Err(ProcfsError::InvalidDescriptor);
            }
            self.check()?;
            let status_flags = fcntl(&fd, FcntlArg::F_GETFL);
            self.check()?;
            let status_flags = status_flags.map_err(|_| ProcfsError::InvalidDescriptor)?;
            validate_status_flags(status_flags)?;
            self.check()?;
            let stat = fstat(&fd);
            self.check()?;
            let stat = stat.map_err(|_| ProcfsError::ReadRejected)?;
            let kind = stat.st_mode & nix::libc::S_IFMT;
            if ![nix::libc::S_IFREG, nix::libc::S_IFDIR].contains(&kind)
                || (status_flags & nix::libc::O_DIRECTORY != 0 && kind != nix::libc::S_IFDIR)
            {
                return Err(ProcfsError::InvalidDescriptor);
            }
            self.check()?;
            let filesystem = fstatfs(&fd);
            self.check()?;
            let filesystem = filesystem.map_err(|_| ProcfsError::OriginRejected)?;
            self.check()?;
            let statx = rustix::fs::statx(
                &fd,
                c"",
                AtFlags::EMPTY_PATH,
                StatxFlags::BASIC_STATS | StatxFlags::MNT_ID,
            );
            self.check()?;
            let statx = statx.map_err(|_| ProcfsError::OriginRejected)?;
            let mask = (StatxFlags::BASIC_STATS | StatxFlags::MNT_ID).bits();
            if statx.stx_mask & mask != mask
                || statx.stx_mnt_id > i32::MAX as u64
                || statx.stx_ino != stat.st_ino as u64
                || u64::from(statx.stx_dev_major) != major(stat.st_dev)
                || u64::from(statx.stx_dev_minor) != minor(stat.st_dev)
            {
                return Err(ProcfsError::OriginRejected);
            }
            Ok(ObjectObservation {
                device: stat.st_dev as u64,
                inode: stat.st_ino as u64,
                mode: stat.st_mode as u32,
                uid: stat.st_uid as u32,
                gid: stat.st_gid as u32,
                links: stat.st_nlink as u64,
                ctime_seconds: stat.st_ctime as i64,
                ctime_nanoseconds: stat.st_ctime_nsec as i64,
                filesystem_magic: filesystem.filesystem_type().0 as i64,
                mount_id: statx.stx_mnt_id as u32,
                descriptor_flags: descriptor_flags as u32,
                status_flags: status_flags as u32,
                device_major: statx.stx_dev_major,
                device_minor: statx.stx_dev_minor,
            })
        }

        fn self_id(&self) -> Result<u32, ProcfsError> {
            let mut bytes = [0_u8; 11];
            self.check()?;
            let length = rustix::fs::readlinkat_raw(
                self.request.proc_root.as_ref(),
                c"self",
                &mut bytes[..],
            );
            self.check()?;
            let length = length.map_err(|_| ProcfsError::OriginRejected)?;
            if length == 0 || length >= bytes.len() {
                return Err(ProcfsError::OriginRejected);
            }
            let value = &bytes[..length];
            if value[0] == b'0' || !value.iter().all(u8::is_ascii_digit) {
                return Err(ProcfsError::OriginRejected);
            }
            let mut id = 0_u32;
            for digit in value {
                id = id
                    .checked_mul(10)
                    .and_then(|id| id.checked_add(u32::from(*digit - b'0')))
                    .ok_or(ProcfsError::OriginRejected)?;
            }
            if id != std::process::id() {
                return Err(ProcfsError::OriginRejected);
            }
            self.check()?;
            Ok(id)
        }

        fn read_record(
            &mut self,
            parent: usize,
            name: &CStr,
            cap: usize,
            proc_root: &ObjectObservation,
        ) -> Result<Vec<u8>, ProcfsError> {
            self.open_confined(Some(parent), name, RECORD, false, proc_root)?;
            self.check()?;
            let capacity = cap.checked_add(1).ok_or(ProcfsError::LimitExceeded)?;
            let mut bytes = Vec::new();
            bytes
                .try_reserve_exact(capacity)
                .map_err(|_| ProcfsError::StorageUnavailable)?;
            bytes.resize(capacity, 0);
            self.check()?;
            let mut used = 0;
            let mut positive_reads = 0;
            loop {
                self.check()?;
                let count = rustix::io::read(self.fd(RECORD)?, &mut bytes[used..]);
                self.check()?;
                let count = count.map_err(|_| ProcfsError::ReadRejected)?;
                if count == 0 {
                    if used == 0 {
                        return Err(ProcfsError::ReadRejected);
                    }
                    bytes.truncate(used);
                    break;
                }
                positive_reads += 1;
                used = used.checked_add(count).ok_or(ProcfsError::LimitExceeded)?;
                if positive_reads > capacity || used > cap {
                    return Err(ProcfsError::LimitExceeded);
                }
            }
            self.close_one(RECORD);
            if self.accounting.reader_close_failures != 0 {
                return Err(ProcfsError::CleanupUncertain);
            }
            self.check()?;
            Ok(bytes)
        }

        fn fdinfo(
            &mut self,
            object: &ObjectObservation,
            fd: i32,
            proc_root: &ObjectObservation,
        ) -> Result<FdInfoRecord, ProcfsError> {
            let fd = u32::try_from(fd).map_err(|_| ProcfsError::InvalidDescriptor)?;
            let component = DecimalComponent::new(fd);
            let bytes = self.read_record(FDINFO, component.name()?, MAX_FDINFO_BYTES, proc_root)?;
            self.check()?;
            let parsed = FdInfoRecord::parse(&bytes).map_err(|_| ProcfsError::InvalidFdinfo);
            self.check()?;
            let parsed = parsed?;
            if parsed.inode() != object.inode
                || parsed.mount_id() != object.mount_id
                || parsed.flags() != object.status_flags | nix::libc::O_CLOEXEC as u32
            {
                return Err(ProcfsError::AssociationRejected);
            }
            Ok(parsed)
        }

        fn same_proc(before: &ObjectObservation, after: &ObjectObservation) -> bool {
            before.device == after.device
                && before.inode == after.inode
                && before.mode & nix::libc::S_IFMT == after.mode & nix::libc::S_IFMT
                && before.filesystem_magic == after.filesystem_magic
                && before.mount_id == after.mount_id
                && before.descriptor_flags == after.descriptor_flags
                && before.status_flags == after.status_flags
        }

        fn same_fdinfo(before: &FdInfoRecord, after: &FdInfoRecord) -> bool {
            before.inode() == after.inode()
                && before.flags() == after.flags()
                && before.mount_id() == after.mount_id()
        }

        fn schedule(&mut self) -> Result<NativeSample, ProcfsError> {
            let resource = self.object(self.request.resource.as_ref())?;
            let resource_type: &[u8] = match resource.filesystem_magic {
                EXT4_MAGIC => b"ext4",
                TMPFS_MAGIC => b"tmpfs",
                _ => return Err(ProcfsError::OriginRejected),
            };
            let proc_root = self.object(self.request.proc_root.as_ref())?;
            if proc_root.mode & nix::libc::S_IFMT != nix::libc::S_IFDIR
                || proc_root.filesystem_magic != PROC_MAGIC
            {
                return Err(ProcfsError::OriginRejected);
            }
            let pid = self.self_id()?;
            let pid_component = DecimalComponent::new(pid);
            let self_directory =
                self.open_confined(None, pid_component.name()?, SELF, true, &proc_root)?;
            let fdinfo_directory =
                self.open_confined(Some(SELF), c"fdinfo", FDINFO, true, &proc_root)?;
            let namespace_directory =
                self.open_confined(Some(SELF), c"ns", NS, true, &proc_root)?;
            let mount_namespace = self.open_namespace(c"mnt", MOUNT_NS)?;
            let user_namespace = self.open_namespace(c"user", USER_NS)?;
            let process_root = self.link(self.fd(SELF)?, c"root")?;
            let resource_before =
                self.fdinfo(&resource, self.request.resource.as_raw_fd(), &proc_root)?;
            let proc_before =
                self.fdinfo(&proc_root, self.request.proc_root.as_raw_fd(), &proc_root)?;
            let before = self.read_record(SELF, c"mountinfo", MAX_MOUNTINFO_BYTES, &proc_root)?;
            let after = self.read_record(SELF, c"mountinfo", MAX_MOUNTINFO_BYTES, &proc_root)?;
            let resource_after =
                self.fdinfo(&resource, self.request.resource.as_raw_fd(), &proc_root)?;
            let proc_after =
                self.fdinfo(&proc_root, self.request.proc_root.as_raw_fd(), &proc_root)?;
            if resource != self.object(self.request.resource.as_ref())?
                || !Self::same_proc(&proc_root, &self.object(self.request.proc_root.as_ref())?)
                || !Self::same_proc(&self_directory, &self.object(self.fd(SELF)?)?)
                || !Self::same_proc(&fdinfo_directory, &self.object(self.fd(FDINFO)?)?)
                || !Self::same_proc(&namespace_directory, &self.object(self.fd(NS)?)?)
                || pid != self.self_id()?
                || process_root != self.link(self.fd(SELF)?, c"root")?
                || mount_namespace != self.namespace(c"mnt", MOUNT_NS)?
                || user_namespace != self.namespace(c"user", USER_NS)?
                || !Self::same_fdinfo(&resource_before, &resource_after)
                || !Self::same_fdinfo(&proc_before, &proc_after)
            {
                return Err(ProcfsError::ObjectChanged);
            }
            self.check()?;
            if before != after {
                return Err(ProcfsError::ObjectChanged);
            }
            drop(before);
            self.check()?;
            let table = MountInfoTable::parse(&after).map_err(ProcfsError::MountInfo);
            self.check()?;
            let table = table?;
            let resource_row = table
                .row_by_mount_id(resource.mount_id)
                .ok_or(ProcfsError::AssociationRejected)?;
            let proc_row = table
                .row_by_mount_id(proc_root.mount_id)
                .ok_or(ProcfsError::AssociationRejected)?;
            if resource_row.device() != (resource.device_major, resource.device_minor)
                || resource_row.filesystem_type() != resource_type
                || proc_row.device() != (proc_root.device_major, proc_root.device_minor)
                || proc_row.filesystem_type() != b"proc"
            {
                return Err(ProcfsError::AssociationRejected);
            }
            drop(table);
            self.check()?;
            Ok(NativeSample {
                resource,
                proc_root,
                process_root,
                mount_namespace,
                user_namespace,
                mountinfo: after,
            })
        }
    }
}

#[cfg(test)]
#[path = "headless_native_procfs_tests.rs"]
mod tests;
