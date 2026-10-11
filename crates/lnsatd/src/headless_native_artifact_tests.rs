use super::*;
use std::{
    fs::File,
    num::NonZeroU64,
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};

fn deadline() -> Instant {
    Instant::now().checked_add(Duration::from_secs(5)).unwrap()
}

fn test_lane() -> &'static LaneRoot {
    let lane = Box::leak(Box::new(LaneRoot::new()));
    lane.control.store(super::super::IDLE, Ordering::SeqCst);
    lane
}

fn custody(budget: &ArtifactReadBudget) -> OwnedArtifactCustody {
    OwnedArtifactCustody::from_file(
        File::open(std::env::current_exe().unwrap()).unwrap(),
        budget,
    )
}

fn request(
    custody: &OwnedArtifactCustody,
    purpose: ArtifactReadPurpose,
    expected_length: u64,
) -> ArtifactRequest {
    ArtifactRequest {
        file: Arc::clone(&custody.file),
        budget: Arc::clone(&custody.budget),
        purpose,
        expected_length,
    }
}

fn prepared(
    lane: &'static LaneRoot,
    custody: &OwnedArtifactCustody,
    purpose: ArtifactReadPurpose,
    expected_length: u64,
) -> ArtifactAttempt {
    let budget = Arc::clone(&custody.budget);
    let attempt = Attempt::prepare_artifact_in(lane, request(custody, purpose, expected_length))
        .unwrap()
        .unwrap();
    ArtifactAttempt { attempt, budget }
}

fn deny_and_publish(attempt: &mut ArtifactAttempt, error: ArtifactError) {
    assert_eq!(attempt.dispatch(), Ok(DispatchStatus::Dispatched));
    let lane = attempt.attempt.lane;
    let request = lane.slots.lock().unwrap().request.take().unwrap();
    let token = request.token;
    let deadline = request.deadline;
    let mut accounting = CleanupAccounting::default();
    super::super::retire_request(lane, request, &mut accounting);
    assert!(attempt.budget.valid().is_ok());
    assert!(super::super::publish_completion(
        lane,
        token,
        deadline,
        super::super::RequestKind::ArtifactRead,
        super::super::CompletionOutcome::Artifact(Err(error)),
        accounting,
        Some(&attempt.budget),
    ));
    assert_eq!(
        attempt.budget.valid(),
        Err(ArtifactError::ObservationInvalid)
    );
}

#[test]
fn artifact_error_codes_and_native_mapping_are_exact_and_data_free() {
    let codes = [
        (
            ArtifactError::UnsupportedPlatform,
            "native_artifact.unsupported_platform",
        ),
        (
            ArtifactError::InvalidDescriptor,
            "native_artifact.invalid_descriptor",
        ),
        (
            ArtifactError::InvalidLength,
            "native_artifact.invalid_length",
        ),
        (ArtifactError::ReadRejected, "native_artifact.read_rejected"),
        (
            ArtifactError::ObjectChanged,
            "native_artifact.object_changed",
        ),
        (
            ArtifactError::LimitExceeded,
            "native_artifact.limit_exceeded",
        ),
        (
            ArtifactError::StorageUnavailable,
            "native_artifact.storage_unavailable",
        ),
        (
            ArtifactError::BudgetExhausted,
            "native_artifact.budget_exhausted",
        ),
        (
            ArtifactError::ObservationInvalid,
            "native_artifact.observation_invalid",
        ),
        (
            ArtifactError::AssociationRejected,
            "native_artifact.association_rejected",
        ),
        (
            ArtifactError::CleanupUncertain,
            "native_artifact.cleanup_uncertain",
        ),
    ];
    for (error, code) in codes {
        assert_eq!(error.code(), code);
        assert!(code.starts_with("native_artifact."));
        assert!(!code.contains('/'));
        assert!(!code.contains("errno"));
    }
    assert_eq!(
        ArtifactError::from_native(super::super::super::NativeError::UnsupportedPlatform),
        ArtifactError::UnsupportedPlatform
    );
    assert_eq!(
        ArtifactError::from_native(super::super::super::NativeError::InvalidDescriptor),
        ArtifactError::InvalidDescriptor
    );
    for native in [
        super::super::super::NativeError::ReadRejected,
        super::super::super::NativeError::InvalidAcl,
        super::super::super::NativeError::ModeMismatch,
    ] {
        assert_eq!(
            ArtifactError::from_native(native),
            ArtifactError::ReadRejected
        );
    }
    assert_eq!(
        ArtifactError::from_native(super::super::super::NativeError::ObjectChanged),
        ArtifactError::ObjectChanged
    );
    assert_eq!(
        ArtifactError::from_native(super::super::super::NativeError::LimitExceeded),
        ArtifactError::LimitExceeded
    );
}

#[test]
fn artifact_budget_keeps_earlier_deadline_and_expiry_invalidates_same_gate() {
    let enclosing = deadline();
    let budget = ArtifactReadBudget::begin(enclosing).unwrap();
    assert!(budget.state.deadline <= enclosing);
    assert!(matches!(
        ArtifactReadBudget::begin(Instant::now()),
        Err(ArtifactError::BudgetExhausted)
    ));

    let expired = ArtifactReadBudget {
        state: Arc::new(ArtifactBudgetState {
            deadline: Instant::now(),
            all_content: AtomicU64::new(0),
            artifact_oci_content: AtomicU64::new(0),
            invalid: AtomicBool::new(false),
            manifest_claimed: AtomicBool::new(false),
        }),
    };
    assert_eq!(expired.state.valid(), Err(ArtifactError::BudgetExhausted));
    assert_eq!(
        expired.state.valid(),
        Err(ArtifactError::ObservationInvalid)
    );
}

#[test]
fn artifact_budget_exposes_its_single_shared_state_allocation() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    assert!(Arc::ptr_eq(budget.shared_state(), &budget.state));
    let custody = OwnedArtifactCustody::from_root_file(
        File::open(std::env::current_exe().unwrap()).unwrap(),
        budget.shared_state(),
    );
    assert!(Arc::ptr_eq(&custody.budget, budget.shared_state()));
}

#[test]
fn artifact_budget_allows_full_manifest_and_artifact_allowance_independently() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    budget
        .state
        .charge(
            ArtifactReadPurpose::RootManifest,
            usize::try_from(MANIFEST_LIMIT).unwrap(),
        )
        .unwrap();
    budget
        .state
        .charge(
            ArtifactReadPurpose::ArtifactSnapshot,
            usize::try_from(ARTIFACT_OCI_LIMIT).unwrap(),
        )
        .unwrap();
    assert_eq!(
        budget.state.all_content.load(Ordering::SeqCst),
        MANIFEST_LIMIT + ARTIFACT_OCI_LIMIT
    );
    assert_eq!(
        budget.state.artifact_oci_content.load(Ordering::SeqCst),
        ARTIFACT_OCI_LIMIT
    );
    assert_eq!(
        budget.state.remaining(ArtifactReadPurpose::RootManifest),
        Ok(u64::MAX)
    );
    assert_eq!(budget.state.remaining(ArtifactReadPurpose::OciBody), Ok(0));
}

#[test]
fn artifact_budget_charges_partial_returns_and_overflow_invalidates() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    budget
        .state
        .charge(ArtifactReadPurpose::OciBody, 19)
        .unwrap();
    assert_eq!(budget.state.all_content.load(Ordering::SeqCst), 19);
    assert_eq!(budget.state.artifact_oci_content.load(Ordering::SeqCst), 19);

    let overflow = ArtifactReadBudget {
        state: Arc::new(ArtifactBudgetState {
            deadline: deadline(),
            all_content: AtomicU64::new(u64::MAX),
            artifact_oci_content: AtomicU64::new(0),
            invalid: AtomicBool::new(false),
            manifest_claimed: AtomicBool::new(false),
        }),
    };
    assert_eq!(
        overflow.state.charge(ArtifactReadPurpose::RootManifest, 1),
        Err(ArtifactError::LimitExceeded)
    );
    assert_eq!(
        overflow.state.valid(),
        Err(ArtifactError::ObservationInvalid)
    );
}

// These tests exercise the fixed post-call result primitive, not a native
// reader, injected I/O callback, or Linux acquisition success.
fn result_checkpoint<'a>(
    lane: &'a LaneRoot,
    budget: &'a ArtifactReadBudget,
) -> super::super::ArtifactCheckpoint<'a> {
    lane.control.store(
        super::super::word(super::super::ACTIVE, 1),
        Ordering::SeqCst,
    );
    super::super::ArtifactCheckpoint {
        lane,
        token: NonZeroU64::new(1).unwrap(),
        deadline: budget.state.deadline,
        budget: &budget.state,
    }
}

#[test]
fn artifact_failed_read_checks_live_context_without_charging_bytes() {
    let lane = LaneRoot::new();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let guard = result_checkpoint(&lane, &budget);
    assert_eq!(
        checked_read_count(
            &guard,
            ArtifactReadPurpose::OciBody,
            8,
            Err(ArtifactError::ReadRejected)
        ),
        Err(ArtifactError::ReadRejected)
    );
    assert_eq!(budget.state.all_content.load(Ordering::SeqCst), 0);
    assert_eq!(budget.state.artifact_oci_content.load(Ordering::SeqCst), 0);
    assert_eq!(budget.state.valid(), Ok(()));
}

#[test]
fn artifact_failed_read_expiry_precedes_native_error_and_stays_invalid() {
    for expired_budget in [false, true] {
        let lane = LaneRoot::new();
        let mut budget = ArtifactReadBudget::begin(deadline()).unwrap();
        if expired_budget {
            Arc::get_mut(&mut budget.state).unwrap().deadline = Instant::now();
        }
        let mut guard = result_checkpoint(&lane, &budget);
        if expired_budget {
            guard.deadline = deadline();
        } else {
            guard.deadline = Instant::now();
        }
        assert_eq!(
            checked_read_count(
                &guard,
                ArtifactReadPurpose::OciBody,
                8,
                Err(ArtifactError::ReadRejected)
            ),
            Err(ArtifactError::BudgetExhausted)
        );
        assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
        assert_eq!(budget.state.all_content.load(Ordering::SeqCst), 0);
    }
}

#[test]
fn artifact_failed_read_terminal_or_stale_token_precedes_native_error() {
    for stopped in [false, true] {
        let lane = LaneRoot::new();
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let guard = result_checkpoint(&lane, &budget);
        if stopped {
            lane.terminalize();
        } else {
            lane.control.store(
                super::super::word(super::super::ACTIVE, 2),
                Ordering::SeqCst,
            );
        }
        assert_eq!(
            checked_read_count(
                &guard,
                ArtifactReadPurpose::OciBody,
                8,
                Err(ArtifactError::ReadRejected)
            ),
            Err(if stopped {
                ArtifactError::BudgetExhausted
            } else {
                ArtifactError::AssociationRejected
            })
        );
        assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
        assert_eq!(budget.state.all_content.load(Ordering::SeqCst), 0);
    }
}

#[test]
fn artifact_failed_read_preserves_existing_observation_invalidation() {
    let lane = LaneRoot::new();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let guard = result_checkpoint(&lane, &budget);
    budget.state.invalidate();
    assert_eq!(
        checked_read_count(
            &guard,
            ArtifactReadPurpose::OciBody,
            8,
            Err(ArtifactError::ReadRejected)
        ),
        Err(ArtifactError::ObservationInvalid)
    );
    assert_eq!(budget.state.all_content.load(Ordering::SeqCst), 0);
}

#[test]
fn artifact_short_or_complete_return_charges_actual_bytes() {
    for actual in [0, 3, 8] {
        let lane = LaneRoot::new();
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let guard = result_checkpoint(&lane, &budget);
        assert_eq!(
            checked_read_count(&guard, ArtifactReadPurpose::OciBody, 8, Ok(actual)),
            if actual == 8 {
                Ok(8)
            } else {
                Err(ArtifactError::ReadRejected)
            }
        );
        assert_eq!(
            budget.state.all_content.load(Ordering::SeqCst),
            u64::try_from(actual).unwrap()
        );
        assert_eq!(
            budget.state.artifact_oci_content.load(Ordering::SeqCst),
            u64::try_from(actual).unwrap()
        );
    }
}

#[test]
fn artifact_late_return_charges_actual_bytes_before_checkpoint_denial() {
    for purpose in [
        ArtifactReadPurpose::RootManifest,
        ArtifactReadPurpose::OciBody,
    ] {
        for actual in [3, 8] {
            let lane = LaneRoot::new();
            let budget = ArtifactReadBudget::begin(deadline()).unwrap();
            let mut guard = result_checkpoint(&lane, &budget);
            guard.deadline = Instant::now();
            assert_eq!(
                checked_read_count(&guard, purpose, 8, Ok(actual)),
                Err(ArtifactError::BudgetExhausted)
            );
            assert_eq!(
                budget.state.all_content.load(Ordering::SeqCst),
                u64::try_from(actual).unwrap()
            );
            assert_eq!(
                budget.state.artifact_oci_content.load(Ordering::SeqCst),
                if purpose.uses_artifact_allowance() {
                    u64::try_from(actual).unwrap()
                } else {
                    0
                }
            );
            assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
        }
    }
}

#[test]
fn artifact_post_call_accounting_failure_keeps_original_error_precedence() {
    let lane = LaneRoot::new();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let mut guard = result_checkpoint(&lane, &budget);
    budget
        .state
        .artifact_oci_content
        .store(ARTIFACT_OCI_LIMIT, Ordering::SeqCst);
    guard.deadline = Instant::now();
    assert_eq!(
        checked_read_count(&guard, ArtifactReadPurpose::OciBody, 8, Ok(8)),
        Err(ArtifactError::LimitExceeded)
    );
    assert_eq!(budget.state.all_content.load(Ordering::SeqCst), 8);
    assert_eq!(
        budget.state.artifact_oci_content.load(Ordering::SeqCst),
        ARTIFACT_OCI_LIMIT
    );
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
}

#[test]
fn artifact_input_limits_reject_zero_and_each_wrong_purpose_length() {
    for (purpose, limit) in [
        (ArtifactReadPurpose::RootManifest, MANIFEST_LIMIT),
        (ArtifactReadPurpose::OciBody, OCI_LIMIT),
        (ArtifactReadPurpose::ArtifactSnapshot, ARTIFACT_LIMIT),
    ] {
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let custody = custody(&budget);
        assert_eq!(
            request(&custody, purpose, 0).check_input(),
            Err(ArtifactError::InvalidLength)
        );
        assert_eq!(request(&custody, purpose, limit).check_input(), Ok(()));
        assert_eq!(
            request(&custody, purpose, limit + 1).check_input(),
            Err(ArtifactError::InvalidLength)
        );
    }
}

#[test]
fn artifact_root_claim_is_one_use_and_two_contenders_have_one_winner() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let first = Arc::clone(&budget.state);
    let second = Arc::clone(&budget.state);
    let first = std::thread::spawn(move || first.claim_manifest());
    let second = std::thread::spawn(move || second.claim_manifest());
    let outcomes = [first.join().unwrap(), second.join().unwrap()];
    assert_eq!(outcomes.iter().filter(|outcome| outcome.is_ok()).count(), 1);
    assert_eq!(
        outcomes
            .iter()
            .filter(|outcome| **outcome == Err(ArtifactError::ObservationInvalid))
            .count(),
        1
    );
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
}

#[test]
fn artifact_busy_procfs_lane_does_not_claim_or_transfer_custody() {
    let lane = test_lane();
    let procfs = super::super::OwnedProcfsCustody {
        resource: Arc::new(File::open(std::env::current_exe().unwrap()).unwrap()),
        proc_root: Arc::new(File::open(std::env::temp_dir()).unwrap()),
    };
    let procfs_attempt = Attempt::prepare_in(lane, &procfs, deadline()).unwrap();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let custody = custody(&budget);
    assert!(matches!(
        Attempt::prepare_artifact_in(
            lane,
            request(&custody, ArtifactReadPurpose::RootManifest, 1)
        ),
        Ok(None)
    ));
    assert!(!budget.state.manifest_claimed.load(Ordering::SeqCst));
    assert_eq!(Arc::strong_count(&custody.file), 1);
    drop(procfs_attempt);
    super::super::drain_terminal(lane);
}

#[test]
fn artifact_cleanup_model_requires_one_input_not_procfs_two() {
    let artifact_clean = CleanupAccounting {
        input_references_retired: 1,
        ..CleanupAccounting::default()
    };
    assert!(artifact_clean.complete(super::super::RequestKind::ArtifactRead));
    assert!(!artifact_clean.complete(super::super::RequestKind::Procfs));
    let incomplete = CleanupAccounting {
        input_references_retired: 1,
        reader_handles: 1,
        ..CleanupAccounting::default()
    };
    assert!(!incomplete.complete(super::super::RequestKind::ArtifactRead));
}

#[test]
fn artifact_nonarmed_disposal_retires_one_file_without_native_result() {
    let lane = test_lane();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let custody = custody(&budget);
    let mut accounting = CleanupAccounting::default();
    retire(
        lane,
        request(&custody, ArtifactReadPurpose::RootManifest, 1),
        &mut accounting,
    );
    assert!(accounting.complete(super::super::RequestKind::ArtifactRead));
    assert_eq!(Arc::strong_count(&custody.file), 1);
    assert!(budget.state.valid().is_ok());
}

#[test]
fn artifact_owned_original_retirement_consumes_only_unshared_owner() {
    let lane = LaneRoot::new();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let owned = custody(&budget);
    assert!(owned.borrow_file().metadata().is_ok());
    assert_eq!(owned.retire_original(&lane), Ok(()));

    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let owned = custody(&budget);
    let shared = Arc::clone(&owned.file);
    assert_eq!(
        owned.retire_original(&lane),
        Err(ArtifactError::CleanupUncertain)
    );
    assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
    drop(shared);
}

#[test]
fn artifact_root_manifest_read_requires_claimed_same_deadline_before_native_read() {
    let lane = LaneRoot::new();
    lane.control.store(
        super::super::word(super::super::ACTIVE, 1),
        Ordering::SeqCst,
    );
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let owned = custody(&budget);
    let (result, accounting) = read_root_manifest(
        &lane,
        NonZeroU64::new(1).unwrap(),
        budget.state.deadline,
        &owned,
        1,
    );
    assert!(matches!(result, Err(ArtifactError::ObservationInvalid)));
    assert_eq!(accounting.input_references_retired, 0);
    assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));

    let lane = LaneRoot::new();
    lane.control.store(
        super::super::word(super::super::ACTIVE, 1),
        Ordering::SeqCst,
    );
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let owned = custody(&budget);
    budget.state.claim_manifest().unwrap();
    let (result, accounting) = read_root_manifest(
        &lane,
        NonZeroU64::new(1).unwrap(),
        Instant::now(),
        &owned,
        1,
    );
    assert!(matches!(result, Err(ArtifactError::ObservationInvalid)));
    assert_eq!(accounting.input_references_retired, 0);
    assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));
}

#[test]
fn artifact_root_facts_bind_root_purpose_body_token_and_live_budget() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let result = UnverifiedArtifactRead {
        budget: Arc::clone(&budget.state),
        token: NonZeroU64::new(7).unwrap(),
        purpose: ArtifactReadPurpose::RootManifest,
        identity: ArtifactIdentity {
            device: 1,
            inode: 2,
            mode: 0,
            uid: 0,
            gid: 0,
            links: 1,
            size: 3,
            mtime_seconds: 0,
            mtime_nanoseconds: 0,
            ctime_seconds: 0,
            ctime_nanoseconds: 0,
            filesystem_type: 0,
            descriptor_flags: 0,
            status_flags: 0,
        },
        length: 3,
        digest: Zeroizing::new([9; 32]),
        body: Some(Zeroizing::new(vec![1, 2, 3])),
    };
    let facts = result
        .root_manifest_facts(budget.shared_state(), NonZeroU64::new(7).unwrap())
        .unwrap();
    assert_eq!(facts.body, &[1, 2, 3]);
    assert_eq!(facts.digest, &[9; 32]);
    assert_eq!(facts.length, 3);

    let wrong = ArtifactReadBudget::begin(deadline()).unwrap();
    assert!(matches!(
        result.root_manifest_facts(wrong.shared_state(), NonZeroU64::new(7).unwrap()),
        Err(ArtifactError::AssociationRejected)
    ));
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
}

#[test]
fn artifact_root_facts_reject_nonroot_token_and_body_length_mismatch() {
    let identity = || ArtifactIdentity {
        device: 1,
        inode: 2,
        mode: 0,
        uid: 0,
        gid: 0,
        links: 1,
        size: 3,
        mtime_seconds: 0,
        mtime_nanoseconds: 0,
        ctime_seconds: 0,
        ctime_nanoseconds: 0,
        filesystem_type: 0,
        descriptor_flags: 0,
        status_flags: 0,
    };
    for (purpose, token, length, supplied_token) in [
        (ArtifactReadPurpose::OciBody, 7, 3, 7),
        (ArtifactReadPurpose::RootManifest, 7, 3, 8),
        (ArtifactReadPurpose::RootManifest, 7, 2, 7),
    ] {
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let result = UnverifiedArtifactRead {
            budget: Arc::clone(&budget.state),
            token: NonZeroU64::new(token).unwrap(),
            purpose,
            identity: identity(),
            length,
            digest: Zeroizing::new([0; 32]),
            body: Some(Zeroizing::new(vec![1, 2, 3])),
        };
        assert!(matches!(
            result.root_manifest_facts(
                budget.shared_state(),
                NonZeroU64::new(supplied_token).unwrap()
            ),
            Err(ArtifactError::AssociationRejected)
        ));
        assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
    }
}

#[test]
fn artifact_wrong_completion_kind_or_token_stays_closed_before_extraction() {
    for (token_delta, outcome) in [
        (
            0,
            super::super::CompletionOutcome::Procfs(Err(super::super::ProcfsError::OriginRejected)),
        ),
        (
            1,
            super::super::CompletionOutcome::Artifact(Err(ArtifactError::ReadRejected)),
        ),
    ] {
        let lane = test_lane();
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let custody = custody(&budget);
        let mut attempt = prepared(lane, &custody, ArtifactReadPurpose::OciBody, 1);
        let token = attempt.attempt.token;
        {
            let mut slots = lane.slots.lock().unwrap();
            slots.request = None;
            slots.cleanup = Some((
                token,
                super::super::RequestKind::ArtifactRead,
                CleanupAccounting {
                    input_references_retired: 1,
                    ..CleanupAccounting::default()
                },
            ));
            slots.completion = Some(super::super::Completion {
                token: NonZeroU64::new(token.get() + token_delta).unwrap(),
                outcome,
            });
        }
        lane.control.store(
            super::super::word(super::super::READY, token.get()),
            Ordering::SeqCst,
        );
        assert!(matches!(
            attempt.poll(),
            Err(ArtifactError::AssociationRejected)
        ));
        assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));
        assert!(lane.slots.lock().unwrap().completion.is_some());
        assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
    }
}

#[test]
fn artifact_stale_attempt_cannot_cancel_new_lane_token() {
    let lane = test_lane();
    let first_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let first_custody = custody(&first_budget);
    let mut first = prepared(lane, &first_custody, ArtifactReadPurpose::OciBody, 1);
    let old_token = first.attempt.token;
    deny_and_publish(&mut first, ArtifactError::ReadRejected);
    assert!(matches!(first.poll(), Err(ArtifactError::ReadRejected)));
    assert!(super::super::finish_retirement(
        lane,
        super::super::word(super::super::RETIRING, old_token.get())
    ));

    let second_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let second_custody = custody(&second_budget);
    let second = prepared(lane, &second_custody, ArtifactReadPurpose::OciBody, 1);
    let stale = Attempt {
        lane,
        token: old_token,
        deadline: deadline(),
        armed: true,
    };
    drop(stale);
    assert_eq!(
        lane.control.load(Ordering::SeqCst),
        super::super::word(super::super::ACTIVE, second.attempt.token.get())
    );
    drop(second);
    super::super::drain_terminal(lane);
}

#[test]
fn artifact_stop_expiry_and_poison_invalidate_and_retain_cleanup() {
    let lane = test_lane();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let stopped_custody = custody(&budget);
    let mut stopped = prepared(lane, &stopped_custody, ArtifactReadPurpose::OciBody, 1);
    lane.terminalize();
    assert!(matches!(
        stopped.poll(),
        Err(ArtifactError::BudgetExhausted)
    ));
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
    super::super::drain_terminal(lane);
    assert!(
        lane.slots
            .lock()
            .unwrap()
            .cleanup
            .is_some_and(|(_, kind, accounting)| {
                accounting.complete(kind) && kind == super::super::RequestKind::ArtifactRead
            })
    );

    let expired_lane = test_lane();
    let expired_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let expired_custody = custody(&expired_budget);
    let mut expired = prepared(
        expired_lane,
        &expired_custody,
        ArtifactReadPurpose::OciBody,
        1,
    );
    expired.attempt.deadline = Instant::now();
    assert_eq!(expired.dispatch(), Err(ArtifactError::BudgetExhausted));
    assert_eq!(
        expired_budget.state.valid(),
        Err(ArtifactError::ObservationInvalid)
    );
    super::super::drain_terminal(expired_lane);

    let poisoned_lane = test_lane();
    let poisoned_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let poisoned_custody = custody(&poisoned_budget);
    let _ = std::panic::catch_unwind(|| {
        let _guard = poisoned_lane.slots.lock().unwrap();
        panic!("synthetic mutex poison");
    });
    assert!(matches!(
        Attempt::prepare_artifact_in(
            poisoned_lane,
            request(&poisoned_custody, ArtifactReadPurpose::OciBody, 1)
        ),
        Err(ArtifactError::CleanupUncertain)
    ));
    assert_eq!(
        poisoned_budget.state.valid(),
        Err(ArtifactError::ObservationInvalid)
    );
    assert!(super::super::terminal(
        poisoned_lane.control.load(Ordering::SeqCst)
    ));
}

#[test]
fn artifact_context_rejects_wrong_owner_or_token_before_borrowing_facts() {
    let first = ArtifactReadBudget::begin(deadline()).unwrap();
    let second = ArtifactReadBudget::begin(deadline()).unwrap();
    let result = UnverifiedArtifactRead {
        budget: Arc::clone(&first.state),
        token: NonZeroU64::new(1).unwrap(),
        purpose: ArtifactReadPurpose::RootManifest,
        identity: ArtifactIdentity {
            device: 1,
            inode: 2,
            mode: 0,
            uid: 0,
            gid: 0,
            links: 1,
            size: 1,
            mtime_seconds: 0,
            mtime_nanoseconds: 0,
            ctime_seconds: 0,
            ctime_nanoseconds: 0,
            filesystem_type: 0,
            descriptor_flags: 0,
            status_flags: 0,
        },
        length: 1,
        digest: Zeroizing::new([0; 32]),
        body: None,
    };
    assert!(matches!(
        result.check_context(&second, NonZeroU64::new(1).unwrap()),
        Err(ArtifactError::AssociationRejected)
    ));
    assert_eq!(first.state.valid(), Err(ArtifactError::ObservationInvalid));
    assert!(matches!(
        result.check_context(&first, NonZeroU64::new(2).unwrap()),
        Err(ArtifactError::AssociationRejected)
    ));
}

#[test]
fn artifact_late_or_incomplete_publication_invalidates_before_terminal_cleanup() {
    for (late, accounting) in [
        (
            true,
            CleanupAccounting {
                input_references_retired: 1,
                ..CleanupAccounting::default()
            },
        ),
        (false, CleanupAccounting::default()),
    ] {
        let lane = test_lane();
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let token = NonZeroU64::new(1).unwrap();
        lane.control.store(
            super::super::word(super::super::ACTIVE, token.get()),
            Ordering::SeqCst,
        );
        assert!(!super::super::publish_completion(
            lane,
            token,
            if late { Instant::now() } else { deadline() },
            super::super::RequestKind::ArtifactRead,
            super::super::CompletionOutcome::Artifact(Err(ArtifactError::ReadRejected)),
            accounting,
            Some(&budget.state),
        ));
        assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
        assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));
    }
}

#[test]
fn artifact_checkpoint_models_typed_denials_without_native_calls() {
    let token = NonZeroU64::new(1).unwrap();
    let expired_lane = test_lane();
    expired_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get()),
        Ordering::SeqCst,
    );
    let expired_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let expired = super::super::ArtifactCheckpoint {
        lane: expired_lane,
        token,
        deadline: Instant::now(),
        budget: &expired_budget.state,
    };
    assert_eq!(expired.check(), Err(ArtifactError::BudgetExhausted));
    assert_eq!(
        expired_budget.state.valid(),
        Err(ArtifactError::ObservationInvalid)
    );

    let stop_lane = test_lane();
    stop_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get()),
        Ordering::SeqCst,
    );
    stop_lane.terminalize();
    let stop_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let stopped = super::super::ArtifactCheckpoint {
        lane: stop_lane,
        token,
        deadline: deadline(),
        budget: &stop_budget.state,
    };
    assert_eq!(stopped.check(), Err(ArtifactError::BudgetExhausted));

    let mismatch_lane = test_lane();
    mismatch_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get() + 1),
        Ordering::SeqCst,
    );
    let mismatch_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let mismatched = super::super::ArtifactCheckpoint {
        lane: mismatch_lane,
        token,
        deadline: deadline(),
        budget: &mismatch_budget.state,
    };
    assert_eq!(mismatched.check(), Err(ArtifactError::AssociationRejected));

    let gate_lane = test_lane();
    gate_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get()),
        Ordering::SeqCst,
    );
    let gate_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    gate_budget.state.invalidate();
    let gated = super::super::ArtifactCheckpoint {
        lane: gate_lane,
        token,
        deadline: deadline(),
        budget: &gate_budget.state,
    };
    assert_eq!(gated.check(), Err(ArtifactError::ObservationInvalid));
}

#[test]
fn artifact_checkpoint_native_mapping_preserves_typed_denials() {
    let token = NonZeroU64::new(1).unwrap();
    let native_lane = test_lane();
    native_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get()),
        Ordering::SeqCst,
    );
    let native_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let native = super::super::ArtifactCheckpoint {
        lane: native_lane,
        token,
        deadline: Instant::now(),
        budget: &native_budget.state,
    };
    assert_eq!(
        native.check_native(),
        Err(super::super::super::NativeError::ReadRejected)
    );
    assert_eq!(native.check(), Err(ArtifactError::BudgetExhausted));

    let native_mismatch_lane = test_lane();
    native_mismatch_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get() + 1),
        Ordering::SeqCst,
    );
    let native_mismatch_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let native_mismatch = super::super::ArtifactCheckpoint {
        lane: native_mismatch_lane,
        token,
        deadline: deadline(),
        budget: &native_mismatch_budget.state,
    };
    assert_eq!(
        native_mismatch.check_native(),
        Err(super::super::super::NativeError::ReadRejected)
    );
    assert_eq!(
        native_mismatch.check(),
        Err(ArtifactError::AssociationRejected)
    );

    let native_gate_lane = test_lane();
    native_gate_lane.control.store(
        super::super::word(super::super::ACTIVE, token.get()),
        Ordering::SeqCst,
    );
    let native_gate_budget = ArtifactReadBudget::begin(deadline()).unwrap();
    native_gate_budget.state.invalidate();
    let native_gate = super::super::ArtifactCheckpoint {
        lane: native_gate_lane,
        token,
        deadline: deadline(),
        budget: &native_gate_budget.state,
    };
    assert_eq!(
        native_gate.check_native(),
        Err(super::super::super::NativeError::ReadRejected)
    );
    assert_eq!(native_gate.check(), Err(ArtifactError::ObservationInvalid));
}

#[test]
fn artifact_worker_guard_unwind_model_invalidates_budget_without_native_proof() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let state = Arc::clone(&budget.state);
    let _ = std::panic::catch_unwind(move || {
        let _guard = super::super::ArtifactWorkerGuard {
            budget: Some(state),
            complete: false,
        };
        panic!("synthetic artifact worker unwind");
    });
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
}

#[cfg(target_os = "linux")]
mod linux_held_file {
    use super::*;
    use std::{
        fs::{self, OpenOptions},
        io::{Seek, Write},
        os::unix::fs::OpenOptionsExt,
        path::PathBuf,
        sync::atomic::{AtomicU64, Ordering},
    };

    static FIXTURE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct Fixture {
        path: PathBuf,
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    fn fixture_root() -> PathBuf {
        let root = PathBuf::from(
            std::env::var("LNSAT_ARTIFACT_TEST_ROOT")
                .expect("LNSAT_ARTIFACT_TEST_ROOT absolute disposable ext4 directory required"),
        );
        assert!(
            root.is_absolute(),
            "LNSAT_ARTIFACT_TEST_ROOT must be absolute"
        );
        let metadata = fs::symlink_metadata(&root)
            .expect("LNSAT_ARTIFACT_TEST_ROOT must name an existing directory");
        assert!(
            !metadata.file_type().is_symlink() && metadata.is_dir(),
            "LNSAT_ARTIFACT_TEST_ROOT must be an existing non-symlink directory"
        );
        let root_file = File::open(&root)
            .expect("LNSAT_ARTIFACT_TEST_ROOT must be readable as selected fixture directory");
        assert_eq!(
            nix::sys::statfs::fstatfs(&root_file)
                .expect("LNSAT_ARTIFACT_TEST_ROOT filesystem sample failed")
                .filesystem_type()
                .0,
            0xef53,
            "LNSAT_ARTIFACT_TEST_ROOT must be ext4"
        );
        root
    }

    fn fixture(bytes: &[u8]) -> (Fixture, Arc<File>) {
        let sequence = FIXTURE_SEQUENCE.fetch_add(1, Ordering::SeqCst);
        let path = fixture_root().join(format!(
            "lnsat-artifact-tests-{}-{sequence}",
            std::process::id()
        ));
        let mut writer = OpenOptions::new()
            .write(true)
            .create_new(true)
            .custom_flags(nix::libc::O_NOFOLLOW)
            .open(&path)
            .expect("exclusive held-artifact fixture create failed");
        writer
            .write_all(bytes)
            .expect("held-artifact fixture write failed");
        drop(writer);
        let reader = OpenOptions::new()
            .read(true)
            .custom_flags(nix::libc::O_NOFOLLOW)
            .open(&path)
            .expect("held-artifact fixture read open failed");
        (Fixture { path }, Arc::new(reader))
    }

    fn active_lane(token: NonZeroU64) -> &'static LaneRoot {
        let lane = test_lane();
        lane.control.store(
            super::super::super::word(super::super::super::ACTIVE, token.get()),
            Ordering::SeqCst,
        );
        lane
    }

    fn valid_identity() -> ArtifactIdentity {
        ArtifactIdentity {
            device: 1,
            inode: 2,
            mode: nix::libc::S_IFREG | 0o400,
            uid: 0,
            gid: 0,
            links: 1,
            size: 7,
            mtime_seconds: 0,
            mtime_nanoseconds: 0,
            ctime_seconds: 0,
            ctime_nanoseconds: 0,
            filesystem_type: 0xef53,
            descriptor_flags: nix::libc::FD_CLOEXEC,
            status_flags: i32::try_from(rustix::fs::OFlags::LARGEFILE.bits()).unwrap()
                | nix::libc::O_NOFOLLOW,
        }
    }

    #[test]
    fn artifact_linux_identity_validation_model_rejects_descriptor_type_fs_links_and_flags() {
        assert_eq!(valid_identity().validate(7), Ok(()));

        let mut descriptor = valid_identity();
        descriptor.descriptor_flags = 0;
        assert_eq!(
            descriptor.validate(7),
            Err(ArtifactError::InvalidDescriptor)
        );

        let mut directory = valid_identity();
        directory.mode = nix::libc::S_IFDIR | 0o400;
        assert_eq!(directory.validate(7), Err(ArtifactError::InvalidDescriptor));

        let mut links = valid_identity();
        links.links = 2;
        assert_eq!(links.validate(7), Err(ArtifactError::InvalidDescriptor));

        let mut filesystem = valid_identity();
        filesystem.filesystem_type = 0;
        assert_eq!(
            filesystem.validate(7),
            Err(ArtifactError::InvalidDescriptor)
        );

        let mut length = valid_identity();
        length.size = 8;
        assert_eq!(length.validate(7), Err(ArtifactError::InvalidDescriptor));

        for flag in [
            nix::libc::O_PATH,
            nix::libc::O_DIRECTORY,
            nix::libc::O_DIRECT,
            nix::libc::O_NONBLOCK,
            nix::libc::O_ASYNC,
            nix::libc::O_WRONLY,
            nix::libc::O_RDWR,
            nix::libc::O_APPEND,
        ] {
            let mut flags = valid_identity();
            flags.status_flags |= flag;
            assert_eq!(flags.validate(7), Err(ArtifactError::InvalidDescriptor));
        }
    }

    #[test]
    #[ignore = "requires explicitly selected disposable ext4 directory"]
    fn artifact_linux_held_manifest_reads_body_hash_and_preserves_offset() {
        let bytes = b"abc";
        let (_fixture, file) = fixture(bytes);
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let token = NonZeroU64::new(1).unwrap();
        let request = ArtifactRequest {
            file: Arc::clone(&file),
            budget: Arc::clone(&budget.state),
            purpose: ArtifactReadPurpose::RootManifest,
            expected_length: bytes.len() as u64,
        };
        let result = read(active_lane(token), token, budget.state.deadline, &request).unwrap();
        {
            let facts = result.check_context(&budget, token).unwrap();
            assert_eq!(facts.length, 3);
            assert_eq!(facts.body, Some(bytes.as_slice()));
            assert_eq!(
                facts.digest,
                &[
                    0xba, 0x78, 0x16, 0xbf, 0x8f, 0x01, 0xcf, 0xea, 0x41, 0x41, 0x40, 0xde, 0x5d,
                    0xae, 0x22, 0x23, 0xb0, 0x03, 0x61, 0xa3, 0x96, 0x17, 0x7a, 0x9c, 0xb4, 0x10,
                    0xff, 0x61, 0xf2, 0x00, 0x15, 0xad,
                ]
            );
        }
        drop(result);
        drop(file);
        let mut held = Arc::try_unwrap(request.file).unwrap();
        assert_eq!(held.stream_position().unwrap(), 0);
        drop(held);
    }

    #[test]
    #[ignore = "requires explicitly selected disposable ext4 directory"]
    fn artifact_linux_snapshot_streams_chunks_and_rejects_size_drift() {
        let bytes = (0..=READ_CHUNK)
            .map(|index| u8::try_from(index % 251).unwrap())
            .collect::<Vec<_>>();
        let (_fixture, file) = fixture(&bytes);
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let token = NonZeroU64::new(2).unwrap();
        let request = ArtifactRequest {
            file: Arc::clone(&file),
            budget: Arc::clone(&budget.state),
            purpose: ArtifactReadPurpose::ArtifactSnapshot,
            expected_length: bytes.len() as u64,
        };
        let result = read(active_lane(token), token, budget.state.deadline, &request).unwrap();
        {
            let facts = result.check_context(&budget, token).unwrap();
            assert_eq!(facts.length, bytes.len() as u64);
            assert_eq!(facts.body, None);
            assert_eq!(
                facts.digest,
                &[
                    0x23, 0x73, 0x56, 0xe1, 0x8b, 0x50, 0x36, 0x16, 0x91, 0x2a, 0xbb, 0x8f, 0xfa,
                    0xed, 0x3a, 0x72, 0x59, 0x1e, 0x39, 0x7d, 0x4a, 0xc2, 0x94, 0xc4, 0x63, 0x79,
                    0x17, 0xd4, 0x8a, 0x3f, 0x52, 0x9d,
                ]
            );
        }
        drop(result);
        assert_eq!(
            budget.state.all_content.load(Ordering::SeqCst),
            bytes.len() as u64
        );
        assert_eq!(
            budget.state.artifact_oci_content.load(Ordering::SeqCst),
            bytes.len() as u64
        );
        drop(file);
        drop(Arc::try_unwrap(request.file).unwrap());

        let (_fixture, file) = fixture(b"abc");
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let token = NonZeroU64::new(3).unwrap();
        let request = ArtifactRequest {
            file: Arc::clone(&file),
            budget: Arc::clone(&budget.state),
            purpose: ArtifactReadPurpose::OciBody,
            expected_length: 4,
        };
        assert!(matches!(
            read(active_lane(token), token, budget.state.deadline, &request),
            Err(ArtifactError::InvalidDescriptor)
        ));
        drop(file);
        drop(Arc::try_unwrap(request.file).unwrap());
    }
}

#[cfg(not(target_os = "linux"))]
#[test]
fn artifact_unsupported_host_denies_before_lane_construction_and_invalidates_budget() {
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let custody = custody(&budget);
    assert!(matches!(
        ArtifactAttempt::try_prepare(&custody, ArtifactReadPurpose::RootManifest, 1),
        Err(ArtifactError::UnsupportedPlatform)
    ));
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
}

#[test]
fn artifact_uncertain_cleanup_is_distinct_from_completion_association() {
    for absent in [true, false] {
        let lane = test_lane();
        let budget = ArtifactReadBudget::begin(deadline()).unwrap();
        let custody = custody(&budget);
        let mut attempt = prepared(lane, &custody, ArtifactReadPurpose::OciBody, 1);
        let token = attempt.attempt.token;
        let request = lane.slots.lock().unwrap().request.take().unwrap();
        let mut accounting = CleanupAccounting::default();
        super::super::retire_request(lane, request, &mut accounting);
        {
            let mut slots = lane.slots.lock().unwrap();
            slots.completion = Some(super::super::Completion {
                token,
                outcome: super::super::CompletionOutcome::Artifact(Err(
                    ArtifactError::ReadRejected,
                )),
            });
            slots.cleanup = if absent {
                None
            } else {
                Some((
                    token,
                    super::super::RequestKind::ArtifactRead,
                    CleanupAccounting::default(),
                ))
            };
        }
        lane.control.store(
            super::super::word(super::super::READY, token.get()),
            Ordering::SeqCst,
        );
        assert!(matches!(
            attempt.poll(),
            Err(ArtifactError::CleanupUncertain)
        ));
        assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));
        assert!(lane.slots.lock().unwrap().completion.is_some());
        assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
        super::super::drain_terminal(lane);
    }
}

#[test]
fn artifact_request_rejects_procfs_facade_before_dispatch() {
    let lane = test_lane();
    let budget = ArtifactReadBudget::begin(deadline()).unwrap();
    let custody = custody(&budget);
    let mut attempt = prepared(lane, &custody, ArtifactReadPurpose::OciBody, 1);
    assert_eq!(
        attempt.attempt.dispatch(),
        Err(super::super::ProcfsError::InvalidDescriptor)
    );
    assert!(super::super::terminal(lane.control.load(Ordering::SeqCst)));
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
    assert_eq!(budget.state.valid(), Err(ArtifactError::ObservationInvalid));
    super::super::drain_terminal(lane);
    assert_eq!(Arc::strong_count(&custody.file), 1);
}
