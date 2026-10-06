use super::*;

// These private roots exercise the production coordinator and atomic helpers.
// They never create a worker, invoke procfs, or construct a successful NativeSample.
fn control_fixture() -> (&'static LaneRoot, OwnedProcfsCustody) {
    let lane = Box::leak(Box::new(LaneRoot::new()));
    lane.control.store(IDLE, Ordering::SeqCst);
    let custody = OwnedProcfsCustody {
        resource: Arc::new(File::open(std::env::current_exe().unwrap()).unwrap()),
        proc_root: Arc::new(File::open(std::env::temp_dir()).unwrap()),
    };
    (lane, custody)
}

fn deadline() -> Instant {
    Instant::now().checked_add(Duration::from_secs(5)).unwrap()
}

fn prepared(lane: &'static LaneRoot, custody: &OwnedProcfsCustody) -> Attempt {
    Attempt::prepare_in(lane, custody, deadline()).unwrap()
}

fn complete_denial(attempt: &mut Attempt, error: ProcfsError) {
    assert_eq!(attempt.dispatch(), Ok(DispatchStatus::Dispatched));
    let lane = attempt.lane;
    let request = lane.slots.lock().unwrap().request.take().unwrap();
    let job = request.token;
    let deadline = request.deadline;
    let mut accounting = CleanupAccounting::default();
    retire_request(lane, request, &mut accounting);
    publish_completion(lane, job, deadline, Err(error), accounting);
}

#[test]
fn procfs_preparation_borrows_same_custody_without_dispatch() {
    let (lane, custody) = control_fixture();
    let attempt = prepared(lane, &custody);
    assert_eq!(Arc::strong_count(&custody.resource), 2);
    assert_eq!(Arc::strong_count(&custody.proc_root), 2);
    let slots = lane.slots.lock().unwrap();
    let request = slots.request.as_ref().unwrap();
    assert!(Arc::ptr_eq(&request.resource, &custody.resource));
    assert!(Arc::ptr_eq(&request.proc_root, &custody.proc_root));
    assert!(!request.dispatched);
    assert_eq!(request.deadline, attempt.deadline);
    drop(slots);
    drop(attempt);
    drain_terminal(lane);
    assert_eq!(Arc::strong_count(&custody.resource), 1);
    assert_eq!(Arc::strong_count(&custody.proc_root), 1);
    assert_eq!(phase(lane.control.load(Ordering::SeqCst)), BODY_RETURNED);
    assert!(lane.slots.lock().unwrap().cleanup.unwrap().1.complete());
}

#[test]
fn procfs_busy_prepare_does_not_close_lane_or_take_custody() {
    let (lane, custody) = control_fixture();
    let slots = lane.slots.lock().unwrap();
    assert!(Attempt::prepare_in(lane, &custody, deadline()).is_err());
    assert_eq!(lane.control.load(Ordering::SeqCst), IDLE);
    assert_eq!(Arc::strong_count(&custody.resource), 1);
    drop(slots);
}

#[test]
fn procfs_dispatch_distinguishes_contention_and_duplicate() {
    let (lane, custody) = control_fixture();
    let mut attempt = prepared(lane, &custody);
    let slots = lane.slots.lock().unwrap();
    assert_eq!(attempt.dispatch(), Ok(DispatchStatus::Pending));
    assert!(!slots.request.as_ref().unwrap().dispatched);
    drop(slots);
    assert_eq!(attempt.dispatch(), Ok(DispatchStatus::Dispatched));
    assert_eq!(attempt.dispatch(), Err(ProcfsError::InvalidDescriptor));
    drop(attempt);
    drain_terminal(lane);
}

#[test]
fn procfs_stop_before_dispatch_never_publishes_flag() {
    let (lane, custody) = control_fixture();
    let mut attempt = prepared(lane, &custody);
    lane.terminalize();
    assert!(attempt.dispatch().is_err());
    assert!(
        !lane
            .slots
            .lock()
            .unwrap()
            .request
            .as_ref()
            .unwrap()
            .dispatched
    );
    drain_terminal(lane);
}

#[test]
fn procfs_expired_poll_denies_without_waiting_for_slots() {
    let (lane, custody) = control_fixture();
    let mut attempt = prepared(lane, &custody);
    attempt.deadline = Instant::now();
    let slots = lane.slots.lock().unwrap();
    assert!(matches!(attempt.poll(), Err(ProcfsError::BudgetExhausted)));
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
    assert!(slots.request.is_some());
    drop(slots);
    drain_terminal(lane);
}

#[test]
fn procfs_expired_dispatch_never_publishes_flag() {
    let (lane, custody) = control_fixture();
    let mut attempt = prepared(lane, &custody);
    attempt.deadline = Instant::now();
    assert!(attempt.dispatch().is_err());
    assert!(
        !lane
            .slots
            .lock()
            .unwrap()
            .request
            .as_ref()
            .unwrap()
            .dispatched
    );
    drain_terminal(lane);
}

#[test]
fn procfs_drop_ready_attempt_closes_and_drains_denial() {
    let (lane, custody) = control_fixture();
    let mut attempt = prepared(lane, &custody);
    complete_denial(&mut attempt, ProcfsError::OriginRejected);
    drop(attempt);
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
    drain_terminal(lane);
    assert!(lane.slots.lock().unwrap().completion.is_none());
    assert_eq!(Arc::strong_count(&custody.resource), 1);
}

#[test]
fn procfs_two_timely_denials_retire_without_reusing_tokens() {
    let (lane, custody) = control_fixture();
    for expected_token in 1..=2 {
        let mut attempt = prepared(lane, &custody);
        assert_eq!(attempt.token.get(), expected_token);
        complete_denial(&mut attempt, ProcfsError::OriginRejected);
        assert!(matches!(attempt.poll(), Err(ProcfsError::OriginRejected)));
        assert!(!attempt.armed);
        assert!(finish_retirement(lane, word(RETIRING, expected_token)));
        drop(attempt);
        assert_eq!(
            lane.control.load(Ordering::SeqCst),
            word(IDLE, expected_token)
        );
    }
    assert_eq!(Arc::strong_count(&custody.resource), 1);
}

#[test]
fn procfs_stale_attempt_drop_cannot_cancel_new_token() {
    let (lane, custody) = control_fixture();
    let mut first = prepared(lane, &custody);
    let old_token = first.token;
    complete_denial(&mut first, ProcfsError::OriginRejected);
    assert!(first.poll().is_err());
    assert!(finish_retirement(lane, word(RETIRING, old_token.get())));
    let second = prepared(lane, &custody);
    let stale = Attempt {
        lane,
        token: old_token,
        deadline: deadline(),
        armed: true,
    };
    drop(stale);
    assert_eq!(
        lane.control.load(Ordering::SeqCst),
        word(ACTIVE, second.token.get())
    );
    drop(second);
    drain_terminal(lane);
}

#[test]
fn procfs_exhaustion_terminalizes_without_new_reference() {
    let (lane, custody) = control_fixture();
    lane.control.store(word(IDLE, TOKEN_MAX), Ordering::SeqCst);
    assert!(matches!(
        Attempt::prepare_in(lane, &custody, deadline()),
        Err(ProcfsError::LimitExceeded)
    ));
    assert_eq!(
        lane.control.load(Ordering::SeqCst),
        word(IDLE, TOKEN_MAX) | TERMINAL
    );
    assert_eq!(Arc::strong_count(&custody.resource), 1);
}

#[test]
fn procfs_poison_denies_without_repair_or_reference_transfer() {
    let (lane, custody) = control_fixture();
    let _ = std::panic::catch_unwind(|| {
        let _guard = lane.slots.lock().unwrap();
        panic!("synthetic mutex poison");
    });
    assert!(matches!(
        Attempt::prepare_in(lane, &custody, deadline()),
        Err(ProcfsError::CleanupUncertain)
    ));
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
    assert!(lane.slots.is_poisoned());
    assert_eq!(Arc::strong_count(&custody.resource), 1);
}

#[test]
fn procfs_stop_on_either_side_of_reservation_stays_terminal() {
    let job = NonZeroU64::new(9).unwrap();
    let before = AtomicU64::new(word(READY, job.get()) | TERMINAL);
    assert!(!reserve_ready(&before, job));
    let after = AtomicU64::new(word(READY, job.get()));
    assert!(reserve_ready(&after, job));
    after.fetch_or(TERMINAL, Ordering::SeqCst);
    assert!(!retire_reserved(&after, job));
    assert!(terminal(after.load(Ordering::SeqCst)));
}

#[test]
fn procfs_cleanup_uncertainty_prevents_result_acceptance_and_reuse() {
    let (lane, custody) = control_fixture();
    let mut attempt = prepared(lane, &custody);
    complete_denial(&mut attempt, ProcfsError::OriginRejected);
    lane.slots
        .lock()
        .unwrap()
        .cleanup
        .as_mut()
        .unwrap()
        .1
        .input_close_failures = 1;
    assert!(matches!(attempt.poll(), Err(ProcfsError::CleanupUncertain)));
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
    assert!(!finish_retirement(
        lane,
        word(RETIRING, attempt.token.get()) | TERMINAL
    ));
    drain_terminal(lane);
}

#[test]
fn procfs_cancel_racing_ready_always_closes_matching_token() {
    for _ in 0..32 {
        let job = NonZeroU64::new(4).unwrap();
        let control = Arc::new(AtomicU64::new(word(ACTIVE, job.get())));
        let gate = Arc::new(std::sync::Barrier::new(2));
        let worker_control = Arc::clone(&control);
        let worker_gate = Arc::clone(&gate);
        let worker = thread::spawn(move || {
            worker_gate.wait();
            let _ = worker_control.compare_exchange(
                word(ACTIVE, job.get()),
                word(READY, job.get()),
                Ordering::SeqCst,
                Ordering::SeqCst,
            );
        });
        gate.wait();
        assert!(cancel_matching(&control, job));
        worker.join().unwrap();
        assert!(terminal(control.load(Ordering::SeqCst)));
        assert_eq!(token(control.load(Ordering::SeqCst)), job.get());
    }
}

#[test]
fn procfs_deadline_preserves_earlier_budget_and_rejects_expiry() {
    let now = Instant::now();
    let enclosing = now.checked_add(Duration::from_secs(1)).unwrap();
    assert_eq!(checked_deadline(now, enclosing), Ok(enclosing));
    assert_eq!(
        checked_deadline(now, now),
        Err(ProcfsError::BudgetExhausted)
    );
}

#[cfg(not(target_os = "linux"))]
#[test]
fn procfs_unsupported_host_denies_before_construction() {
    assert_eq!(construct_once(), Err(ProcfsError::UnsupportedPlatform));
    assert_eq!(LANE.control.load(Ordering::SeqCst), VIRGIN);
    assert!(!LANE.started.load(Ordering::SeqCst));
    assert!(LANE.slots.lock().unwrap().join.is_none());
}

#[test]
fn procfs_error_identity_preserves_mountinfo_codes() {
    assert_eq!(
        ProcfsError::MountInfo(MountInfoError::DuplicateMountId).code(),
        "native_mountinfo.duplicate_mount_id"
    );
    assert_eq!(
        ProcfsError::CleanupUncertain.code(),
        "native_procfs.cleanup_uncertain"
    );
    assert_eq!(
        ProcfsError::BudgetExhausted.code(),
        "native_procfs.budget_exhausted"
    );
}

#[test]
fn procfs_late_stop_and_close_failure_retain_cleanup_without_reuse() {
    for case in 0..3 {
        let (lane, custody) = control_fixture();
        let mut attempt = prepared(lane, &custody);
        assert_eq!(attempt.dispatch(), Ok(DispatchStatus::Dispatched));
        let request = lane.slots.lock().unwrap().request.take().unwrap();
        let job = request.token;
        let mut accounting = CleanupAccounting::default();
        retire_request(lane, request, &mut accounting);
        let deadline = if case == 0 {
            Instant::now()
        } else {
            deadline()
        };
        if case == 1 {
            lane.terminalize();
        }
        if case == 2 {
            // Synthetic consuming-close failure accounting, never a native result.
            accounting.reader_handles = 1;
            accounting.reader_close_attempts = 1;
            accounting.reader_close_failures = 1;
        }
        publish_completion(
            lane,
            job,
            deadline,
            Err(ProcfsError::OriginRejected),
            accounting,
        );
        assert!(terminal(lane.control.load(Ordering::SeqCst)));
        drain_terminal(lane);
        let slots = lane.slots.lock().unwrap();
        assert!(slots.request.is_none());
        assert!(slots.completion.is_none());
        let (retained_job, retained) = slots.cleanup.unwrap();
        assert_eq!(retained_job, job);
        assert_eq!(retained.input_references_retired, 2);
        assert_eq!(retained.reader_handles, accounting.reader_handles);
        assert_eq!(
            retained.reader_close_attempts,
            accounting.reader_close_attempts
        );
        assert_eq!(
            retained.reader_close_failures,
            accounting.reader_close_failures
        );
        drop(slots);
        assert!(Attempt::prepare_in(lane, &custody, self::deadline()).is_err());
    }
}

#[test]
fn procfs_namespace_link_denies_origin_or_retained_identity_mismatch() {
    let link = LinkObservation {
        device_major: 0,
        device_minor: 4,
        inode: 12,
        mount_id: 9,
    };
    assert!(validate_namespace_link(link, 0x6e73_6673, 12, 0, 4).is_ok());
    assert!(matches!(
        validate_namespace_link(link, 0x9fa0, 12, 0, 4),
        Err(ProcfsError::OriginRejected)
    ));
    for (inode, major, minor) in [(13, 0, 4), (12, 1, 4), (12, 0, 5)] {
        assert!(matches!(
            validate_namespace_link(link, 0x6e73_6673, inode, major, minor),
            Err(ProcfsError::ObjectChanged)
        ));
    }
}

#[cfg(target_os = "linux")]
#[test]
fn procfs_kernel_largefile_flag_is_allowed_without_write_or_extra_flags() {
    let largefile = i32::try_from(rustix::fs::OFlags::LARGEFILE.bits()).unwrap();
    assert_ne!(
        largefile, 0,
        "selected Linux recipe needs the raw kernel flag"
    );
    assert_eq!(linux::validate_status_flags(largefile), Ok(()));
    assert_eq!(
        linux::validate_status_flags(largefile | nix::libc::O_DIRECTORY),
        Ok(())
    );
    for forbidden in [
        nix::libc::O_WRONLY,
        nix::libc::O_RDWR,
        nix::libc::O_APPEND,
        nix::libc::O_NONBLOCK,
    ] {
        assert_eq!(
            linux::validate_status_flags(largefile | forbidden),
            Err(ProcfsError::InvalidDescriptor)
        );
    }
}
