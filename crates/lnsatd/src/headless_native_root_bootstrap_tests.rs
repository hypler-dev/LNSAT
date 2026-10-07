use super::super::{
    Attempt, CleanupAccounting, CompletionOutcome, OwnedProcfsCustody, ProcfsError, RETIRING,
    finish_retirement, publish_completion, retire_request,
};
use super::*;

fn deadline() -> Instant {
    Instant::now()
        .checked_add(std::time::Duration::from_secs(5))
        .unwrap()
}

fn lane() -> &'static LaneRoot {
    let lane = Box::leak(Box::new(LaneRoot::new()));
    lane.control.store(IDLE, Ordering::SeqCst);
    lane
}

fn anchor() -> RootManifestAnchor {
    RootManifestAnchor::parse("/etc/manifest.json", 7, 8).unwrap()
}

fn budget() -> ArtifactReadBudget {
    ArtifactReadBudget::begin(deadline()).unwrap()
}

fn short_budget() -> ArtifactReadBudget {
    ArtifactReadBudget::begin(
        Instant::now()
            .checked_add(std::time::Duration::from_millis(100))
            .unwrap(),
    )
    .unwrap()
}

fn wait_until_expired(state: &ArtifactBudgetState) {
    if let Some(remaining) = state.deadline.checked_duration_since(Instant::now()) {
        std::thread::sleep(remaining.saturating_add(std::time::Duration::from_millis(1)));
    }
}

// Host-only worker model: descriptors are ordinary read-only fixtures, never evidence of Begin.
fn held_state(
    lane: &'static LaneRoot,
    owner: &ArtifactReadBudget,
    prospective: bool,
) -> RootManifestCustodyState {
    let budget = Arc::clone(owner.shared_state());
    let begin = NonZeroU64::new(1).unwrap();
    let directory = File::open(std::env::temp_dir()).unwrap();
    let leaf = File::open(std::env::current_exe().unwrap()).unwrap();
    let prospective_file =
        prospective.then(|| File::open(std::env::current_exe().unwrap()).unwrap());
    let opened = if prospective { 3 } else { 2 };
    lane.control
        .store(word(IDLE, begin.get()), Ordering::SeqCst);
    lane.slots.lock().unwrap().root_lease = Some(RootLease {
        begin,
        budget: Arc::clone(&budget),
        phase: LeasePhase::Held,
    });
    RootManifestCustodyState {
        lane,
        begin,
        budget,
        deadline: owner.shared_state().deadline,
        anchor: anchor(),
        directories: vec![directory],
        leaf: Some(
            super::super::artifact::OwnedArtifactCustody::from_root_file(
                leaf,
                owner.shared_state(),
            ),
        ),
        prospective: prospective_file,
        observations: Vec::new(),
        acl: None,
        prefix_acls: Vec::new(),
        opened,
        released: false,
    }
}

const UNDEFINED_ACL_ID: u32 = u32::MAX;

fn acl_wire(entries: &[(u16, u16, u32)]) -> Vec<u8> {
    let mut raw = 2_u32.to_le_bytes().to_vec();
    for (tag, permissions, id) in entries {
        raw.extend(tag.to_le_bytes());
        raw.extend(permissions.to_le_bytes());
        raw.extend(id.to_le_bytes());
    }
    raw
}

fn base_acl(owner: u16, group: u16, other: u16) -> Vec<u8> {
    acl_wire(&[
        (1, owner, UNDEFINED_ACL_ID),
        (4, group, UNDEFINED_ACL_ID),
        (32, other, UNDEFINED_ACL_ID),
    ])
}

fn extended_acl(owner: u16, group: u16, other: u16) -> Vec<u8> {
    acl_wire(&[
        (1, owner, UNDEFINED_ACL_ID),
        (2, owner, 7),
        (4, group, UNDEFINED_ACL_ID),
        (16, group, UNDEFINED_ACL_ID),
        (32, other, UNDEFINED_ACL_ID),
    ])
}

fn prefix_acl(mode: u32) -> RootPrefixAcl {
    let access = base_acl(7, 5, 5);
    let default = base_acl(7, 5, 0);
    RootPrefixAcl {
        access: PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(access.len()),
            PrefixAclKind::Access,
            mode,
            &access,
        )
        .unwrap(),
        default: PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(default.len()),
            PrefixAclKind::Default,
            mode,
            &default,
        )
        .unwrap(),
    }
}

fn checkpoint_request(
    token: NonZeroU64,
    deadline: Instant,
    budget: Arc<ArtifactBudgetState>,
) -> Request {
    Request {
        token,
        deadline,
        dispatched: true,
        payload: RequestPayload::Root(RootRequest::Recheck {
            begin: NonZeroU64::new(1).unwrap(),
            budget,
        }),
    }
}

#[test]
fn root_anchor_is_closed_before_any_native_budget_or_descriptor_work() {
    for path in ["", "/", "relative", "/a/", "/a//b", "/a/./b", "/a/../b"] {
        assert_eq!(
            RootManifestAnchor::parse(path, 7, 8).err(),
            Some(RootBootstrapError::InvalidInput)
        );
    }
    assert!(RootManifestAnchor::parse("/a/b", 7, 8).is_ok());
    assert_eq!(
        RootManifestAnchor::parse("/a/b", 0, 8).err(),
        Some(RootBootstrapError::InvalidInput)
    );
}

#[test]
fn root_anchor_rejects_byte_depth_control_and_gid_boundaries() {
    assert_eq!(
        RootManifestAnchor::parse("/a\0b", 7, 8).err(),
        Some(RootBootstrapError::InvalidInput)
    );
    assert_eq!(
        RootManifestAnchor::parse("/a/b", 7, 0).err(),
        Some(RootBootstrapError::InvalidInput)
    );
    let deep = format!(
        "/{}",
        std::iter::repeat_n("a", 129).collect::<Vec<_>>().join("/")
    );
    assert_eq!(
        RootManifestAnchor::parse(&deep, 7, 8).err(),
        Some(RootBootstrapError::InvalidInput)
    );
    let control = format!("/a/{}", char::from(0x1f));
    assert_eq!(
        RootManifestAnchor::parse(&control, 7, 8).err(),
        Some(RootBootstrapError::InvalidInput)
    );
}

#[test]
fn root_prefix_derives_root_unicode_maximum_and_excludes_manifest_leaf() {
    let root = RootManifestAnchor::parse("/root/manifest.json", 7, 8).unwrap();
    assert_eq!(root.prefix(0), Ok("/"));
    assert_eq!(root.prefix(1), Ok("/root"));
    assert_eq!(root.prefix(2), Err(RootBootstrapError::InvalidInput));

    let unicode = RootManifestAnchor::parse("/根/é/manifest.json", 7, 8).unwrap();
    assert_eq!(unicode.prefix(0), Ok("/"));
    assert_eq!(unicode.prefix(1), Ok("/根"));
    assert_eq!(unicode.prefix(2), Ok("/根/é"));
    assert_eq!(unicode.prefix(3), Err(RootBootstrapError::InvalidInput));

    let component = "a".repeat(31);
    let maximum_path = format!(
        "/{}",
        std::iter::repeat_n(component, 128)
            .collect::<Vec<_>>()
            .join("/")
    );
    assert_eq!(maximum_path.len(), MAX_PATH_BYTES);
    let maximum = RootManifestAnchor::parse(&maximum_path, 7, 8).unwrap();
    assert_eq!(maximum.prefix(0), Ok("/"));
    assert_eq!(maximum.prefix(127).unwrap().len(), 4_064);
    assert_eq!(maximum.prefix(128), Err(RootBootstrapError::InvalidInput));
    assert_eq!(
        RootManifestAnchor::parse(&format!("{maximum_path}x"), 7, 8).err(),
        Some(RootBootstrapError::InvalidInput)
    );
}

#[test]
fn root_prefix_rejects_corrupted_owned_anchor_before_named_read() {
    let mut anchor = RootManifestAnchor::parse("/root/manifest.json", 7, 8).unwrap();
    anchor.components[0] = "other".to_owned();
    assert_eq!(anchor.prefix(0), Err(RootBootstrapError::InvalidInput));
    assert_eq!(anchor.prefix(1), Err(RootBootstrapError::InvalidInput));
}

// Pure ACL result-model checks. They do not sample native ACLs or prove their meaning.
#[test]
fn root_prefix_acl_decode_keeps_no_data_unclassified_and_denies_bad_payloads() {
    assert!(matches!(
        PrefixAclRead::decode(
            PrefixReadOutcome::NoData,
            PrefixAclKind::Access,
            0o040_755,
            &[]
        ),
        Ok(PrefixAclRead::UnclassifiedNoData)
    ));
    assert_eq!(
        PrefixAclRead::decode(
            PrefixReadOutcome::Denied,
            PrefixAclKind::Access,
            0o040_755,
            &[]
        )
        .err(),
        Some(RootBootstrapError::NativeDenied)
    );
    for (outcome, bytes, error) in [
        (
            PrefixReadOutcome::Bytes(0),
            Vec::new(),
            RootBootstrapError::NativeDenied,
        ),
        (
            PrefixReadOutcome::Bytes(4),
            vec![2, 0, 0, 0],
            RootBootstrapError::NativeDenied,
        ),
        (
            PrefixReadOutcome::Bytes(MAX_ACL_BYTES + 1),
            Vec::new(),
            RootBootstrapError::LimitExceeded,
        ),
    ] {
        assert_eq!(
            PrefixAclRead::decode(outcome, PrefixAclKind::Access, 0o040_755, &bytes).err(),
            Some(error)
        );
    }
}

// Pure ACL result-model checks. Access binds mode; default ACL grammar does not.
#[test]
fn root_prefix_acl_decode_enforces_access_mode_but_preserves_default_acl() {
    let bytes = base_acl(7, 5, 0);
    assert_eq!(
        PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(bytes.len()),
            PrefixAclKind::Access,
            0o040_755,
            &bytes,
        )
        .err(),
        Some(RootBootstrapError::NativeDenied)
    );
    assert!(matches!(
        PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(bytes.len()),
            PrefixAclKind::Default,
            0o040_755,
            &bytes,
        ),
        Ok(PrefixAclRead::Present { .. })
    ));
}

// Pure ACL result-model checks. Equal parsed permissions cannot hide raw/tag drift.
#[test]
fn root_prefix_acl_baseline_rejects_raw_tag_and_no_data_drift() {
    let mode = 0o040_755;
    let baseline = prefix_acl(mode);
    let extended = extended_acl(7, 5, 5);
    let default = base_acl(7, 5, 0);
    let tag_drift = RootPrefixAcl {
        access: PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(extended.len()),
            PrefixAclKind::Access,
            mode,
            &extended,
        )
        .unwrap(),
        default: PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(default.len()),
            PrefixAclKind::Default,
            mode,
            &default,
        )
        .unwrap(),
    };
    assert_eq!(
        baseline.require_same(&tag_drift),
        Err(RootBootstrapError::Unstable)
    );
    let no_data_drift = RootPrefixAcl {
        access: PrefixAclRead::UnclassifiedNoData,
        default: PrefixAclRead::UnclassifiedNoData,
    };
    assert_eq!(
        baseline.require_same(&no_data_drift),
        Err(RootBootstrapError::Unstable)
    );
}

// Pure bounded-work model. It does not run native calls.
#[test]
fn root_prefix_schedule_enforces_512_calls_4196352_bytes_and_checked_overflow() {
    assert_eq!(
        PrefixSchedule::new(0).err(),
        Some(RootBootstrapError::LimitExceeded)
    );
    assert_eq!(
        PrefixSchedule::new(MAX_COMPONENTS + 1).err(),
        Some(RootBootstrapError::LimitExceeded)
    );
    let mut maximum = PrefixSchedule::new(MAX_COMPONENTS).unwrap();
    for _ in 0..512 {
        maximum.record(MAX_ACL_BYTES).unwrap();
    }
    assert_eq!(maximum.calls, 512);
    assert_eq!(maximum.bytes, 4_196_352);
    assert_eq!(maximum.finish(), Ok(()));
    assert_eq!(
        maximum.before_call(),
        Err(RootBootstrapError::LimitExceeded)
    );
    assert_eq!(maximum.record(0), Err(RootBootstrapError::LimitExceeded));

    let mut call_overflow = PrefixSchedule {
        limit: usize::MAX,
        calls: usize::MAX - 1,
        bytes: 0,
    };
    assert_eq!(
        call_overflow.record(0),
        Err(RootBootstrapError::LimitExceeded)
    );
    assert_eq!(call_overflow.calls, usize::MAX - 1);

    let mut byte_overflow = PrefixSchedule {
        limit: 4,
        calls: 0,
        bytes: usize::MAX,
    };
    assert_eq!(
        byte_overflow.record(1),
        Err(RootBootstrapError::LimitExceeded)
    );
    assert_eq!(byte_overflow.bytes, usize::MAX);
}

// Pure copy model. It retains an immutable, independently owned ACL baseline.
#[test]
fn root_prefix_acl_copy_binds_row_count_directory_mode_and_original_bytes() {
    let mode = 0o040_755;
    let baseline = prefix_acl(mode);
    let observations = [object(mode), object(0o100_640)];
    let copied = copy_prefix_acls(std::slice::from_ref(&baseline), &observations, 1).unwrap();
    assert_eq!(baseline.require_same(&copied[0]), Ok(()));
    match (&baseline.access, &copied[0].access) {
        (
            PrefixAclRead::Present { raw: original, .. },
            PrefixAclRead::Present { raw: copy, .. },
        ) => {
            assert_ne!(original.as_ptr(), copy.as_ptr());
        }
        _ => panic!("test baseline must retain access bytes"),
    }
    let no_data_baseline = RootPrefixAcl {
        access: PrefixAclRead::decode(
            PrefixReadOutcome::Bytes(base_acl(7, 5, 5).len()),
            PrefixAclKind::Access,
            mode,
            &base_acl(7, 5, 5),
        )
        .unwrap(),
        default: PrefixAclRead::UnclassifiedNoData,
    };
    let no_data_copy =
        copy_prefix_acls(std::slice::from_ref(&no_data_baseline), &observations, 1).unwrap();
    assert!(matches!(
        no_data_copy[0].default,
        PrefixAclRead::UnclassifiedNoData
    ));
    assert_eq!(
        copy_prefix_acls(&[], &observations, 1).err(),
        Some(RootBootstrapError::AssociationRejected)
    );
    assert_eq!(
        copy_prefix_acls(std::slice::from_ref(&baseline), &[object(mode)], 1).err(),
        Some(RootBootstrapError::AssociationRejected)
    );
    assert_eq!(
        copy_prefix_acls(std::slice::from_ref(&baseline), &observations, 0).err(),
        Some(RootBootstrapError::LimitExceeded)
    );
    assert_eq!(
        copy_prefix_acls(
            std::slice::from_ref(&baseline),
            &[object(0o040_700), object(0o100_640)],
            1,
        )
        .err(),
        Some(RootBootstrapError::NativeDenied)
    );
}

// Host lifecycle model. No native ACL call occurs; raw error stays hidden after checkpoint denial.
#[test]
fn root_prefix_post_call_checkpoint_denies_expiry_cancel_wrong_token_and_raw_error() {
    let token = NonZeroU64::new(7).unwrap();

    let live_lane = lane();
    let live_owner = budget();
    let live_state = held_state(live_lane, &live_owner, false);
    let live_request =
        checkpoint_request(token, live_state.deadline, Arc::clone(&live_state.budget));
    live_lane
        .control
        .store(word(ACTIVE, token.get()), Ordering::SeqCst);
    assert_eq!(
        root_checkpoint(live_lane, &live_request, &live_state.budget),
        Ok(())
    );
    live_lane.terminalize();
    assert_eq!(
        prefix_post_call(
            &live_state,
            &live_request,
            Err::<(), _>(RootBootstrapError::NativeDenied),
        ),
        Err(RootBootstrapError::BudgetExhausted)
    );
    assert_eq!(
        live_state.budget.valid(),
        Err(ArtifactError::ObservationInvalid)
    );

    let wrong_lane = lane();
    let wrong_owner = budget();
    let wrong_state = held_state(wrong_lane, &wrong_owner, false);
    let wrong_request =
        checkpoint_request(token, wrong_state.deadline, Arc::clone(&wrong_state.budget));
    wrong_lane
        .control
        .store(word(ACTIVE, token.get() + 1), Ordering::SeqCst);
    assert_eq!(
        root_checkpoint(wrong_lane, &wrong_request, &wrong_state.budget),
        Err(RootBootstrapError::BudgetExhausted)
    );

    let expired_lane = lane();
    let expired_owner = short_budget();
    let expired_state = held_state(expired_lane, &expired_owner, false);
    let expired_request = checkpoint_request(
        token,
        expired_state.deadline,
        Arc::clone(&expired_state.budget),
    );
    expired_lane
        .control
        .store(word(ACTIVE, token.get()), Ordering::SeqCst);
    wait_until_expired(&expired_state.budget);
    assert_eq!(
        root_checkpoint(expired_lane, &expired_request, &expired_state.budget),
        Err(RootBootstrapError::BudgetExhausted)
    );
}

#[test]
fn root_begin_busy_does_not_claim_or_invalidate_budget() {
    let lane = lane();
    lane.control.store(word(ACTIVE, 9), Ordering::SeqCst);
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    assert!(matches!(
        RootJob::prepare(
            lane,
            RootRequest::Begin {
                anchor: anchor(),
                budget: Arc::clone(&state),
            }
        ),
        Ok(None)
    ));
    assert_eq!(state.valid(), Ok(()));
    assert_eq!(state.claim_manifest(), Ok(()));
}

#[test]
fn root_accepted_begin_claims_manifest_once() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let first = RootJob::prepare(
        lane,
        RootRequest::Begin {
            anchor: anchor(),
            budget: Arc::clone(&state),
        },
    )
    .unwrap()
    .unwrap();
    assert_eq!(
        state.claim_manifest(),
        Err(ArtifactError::ObservationInvalid)
    );
    drop(first);
}

#[test]
fn root_second_reserved_marker_is_busy_without_claiming() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    lane.slots.lock().unwrap().root_lease = Some(RootLease {
        begin: NonZeroU64::new(1).unwrap(),
        budget: Arc::clone(&state),
        phase: LeasePhase::Reserved,
    });
    assert!(matches!(
        RootJob::prepare(
            lane,
            RootRequest::Begin {
                anchor: anchor(),
                budget: Arc::clone(&state),
            }
        ),
        Ok(None)
    ));
    assert_eq!(state.claim_manifest(), Ok(()));
}

#[test]
fn root_wrong_held_ticket_or_budget_invalidates_association() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let other_owner = budget();
    let other = Arc::clone(other_owner.shared_state());
    lane.slots.lock().unwrap().root_lease = Some(RootLease {
        begin: NonZeroU64::new(1).unwrap(),
        budget: Arc::clone(&state),
        phase: LeasePhase::Held,
    });
    assert_eq!(
        RootJob::prepare(
            lane,
            RootRequest::Recheck {
                begin: NonZeroU64::new(2).unwrap(),
                budget: Arc::clone(&other),
            }
        )
        .err(),
        Some(RootBootstrapError::AssociationRejected)
    );
    assert_eq!(state.valid(), Err(ArtifactError::ObservationInvalid));
    assert_eq!(other.valid(), Err(ArtifactError::ObservationInvalid));
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
}

#[test]
fn root_retire_invalidates_exact_held_budget_before_dispatch() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let begin = NonZeroU64::new(1).unwrap();
    lane.slots.lock().unwrap().root_lease = Some(RootLease {
        begin,
        budget: Arc::clone(&state),
        phase: LeasePhase::Held,
    });
    let job = RootJob::prepare(
        lane,
        RootRequest::Retire {
            begin,
            budget: Arc::clone(&state),
        },
    )
    .unwrap()
    .unwrap();
    assert_eq!(state.valid(), Err(ArtifactError::ObservationInvalid));
    let slots = lane.slots.lock().unwrap();
    assert!(matches!(
        slots.root_lease.as_ref().map(|lease| lease.phase),
        Some(LeasePhase::Retiring(token)) if token == job.attempt.token
    ));
    assert!(
        slots
            .request
            .as_ref()
            .is_some_and(|request| !request.dispatched)
    );
    drop(slots);
    drop(job);
}

#[test]
fn root_admission_guard_unwind_invalidates_and_terminalizes() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let job = RootJob::prepare(
        lane,
        RootRequest::Begin {
            anchor: anchor(),
            budget: Arc::clone(&state),
        },
    )
    .unwrap()
    .unwrap();
    drop(job);
    assert_eq!(state.valid(), Err(ArtifactError::ObservationInvalid));
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
}

fn object(mode: u32) -> RootObjectFacts {
    RootObjectFacts {
        device_major: 8,
        device_minor: 1,
        inode: 7,
        mode,
        uid: 0,
        gid: 0,
        links: 1,
        size: 8,
        mtime_seconds: 1,
        mtime_nanoseconds: 1,
        ctime_seconds: 1,
        ctime_nanoseconds: 1,
        mount_id: 1,
    }
}

#[test]
fn root_statx_mask_and_object_predicates_deny_each_wrong_metadata_fact() {
    assert_eq!(required_statx(0x17ff, 1), Ok(()));
    assert_eq!(
        required_statx(0x07ff, 1),
        Err(RootBootstrapError::NativeDenied)
    );
    assert_eq!(
        required_statx(0x17ff, 0),
        Err(RootBootstrapError::NativeDenied)
    );

    let directory = object(0o040_755);
    assert_eq!(validate_object(&directory, true), Ok(()));
    assert_eq!(validate_object(&object(0o100_640), false), Ok(()));
    for bad in [
        RootObjectFacts {
            mode: 0o100_640,
            ..directory
        },
        RootObjectFacts {
            uid: 1,
            ..directory
        },
        RootObjectFacts {
            mode: 0o040_775,
            ..directory
        },
        RootObjectFacts {
            mount_id: 0,
            ..directory
        },
        RootObjectFacts {
            mtime_nanoseconds: 1_000_000_000,
            ..directory
        },
        RootObjectFacts {
            ctime_nanoseconds: 1_000_000_000,
            ..directory
        },
    ] {
        assert_eq!(
            validate_object(&bad, true),
            Err(RootBootstrapError::NativeDenied)
        );
    }
    for bad in [
        RootObjectFacts {
            gid: 1,
            ..object(0o100_640)
        },
        RootObjectFacts {
            links: 2,
            ..object(0o100_640)
        },
        RootObjectFacts {
            size: 0,
            ..object(0o100_640)
        },
        RootObjectFacts {
            size: 65_537,
            ..object(0o100_640)
        },
        RootObjectFacts {
            mode: 0o100_600,
            ..object(0o100_640)
        },
    ] {
        assert_eq!(
            validate_object(&bad, false),
            Err(RootBootstrapError::NativeDenied)
        );
    }
}

#[test]
fn root_same_object_rejects_every_observed_replacement_field() {
    let expected = object(0o100_640);
    assert_eq!(same_object(&expected, &expected), Ok(()));
    for observed in [
        RootObjectFacts {
            device_major: 9,
            ..expected
        },
        RootObjectFacts {
            device_minor: 2,
            ..expected
        },
        RootObjectFacts {
            inode: 8,
            ..expected
        },
        RootObjectFacts {
            mode: 0o100_600,
            ..expected
        },
        RootObjectFacts { uid: 1, ..expected },
        RootObjectFacts { gid: 1, ..expected },
        RootObjectFacts {
            links: 2,
            ..expected
        },
        RootObjectFacts {
            size: 9,
            ..expected
        },
        RootObjectFacts {
            mtime_seconds: 2,
            ..expected
        },
        RootObjectFacts {
            mtime_nanoseconds: 2,
            ..expected
        },
        RootObjectFacts {
            ctime_seconds: 2,
            ..expected
        },
        RootObjectFacts {
            ctime_nanoseconds: 2,
            ..expected
        },
        RootObjectFacts {
            mount_id: 2,
            ..expected
        },
    ] {
        assert_eq!(
            same_object(&expected, &observed),
            Err(RootBootstrapError::Unstable)
        );
    }
}

#[test]
fn root_poisoned_slots_and_invalid_reserved_lease_terminalize_without_holder() {
    let lane_a = lane();
    let _ = std::panic::catch_unwind(|| {
        let _guard = lane_a.slots.lock().unwrap();
        panic!("synthetic root slot poison");
    });
    assert!(!maintain(lane_a, None));
    assert!(terminal(lane_a.control.load(Ordering::SeqCst)));

    let lane_b = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let begin = NonZeroU64::new(1).unwrap();
    {
        let mut slots = lane_b.slots.lock().unwrap();
        slots.root_lease = Some(RootLease {
            begin,
            budget: Arc::clone(&state),
            phase: LeasePhase::Reserved,
        });
        slots.request = Some(Request {
            token: begin,
            deadline: state.deadline,
            dispatched: false,
            payload: RequestPayload::Root(RootRequest::Begin {
                anchor: anchor(),
                budget: Arc::clone(&state),
            }),
        });
    }
    lane_b
        .control
        .store(word(ACTIVE, begin.get()), Ordering::SeqCst);
    state.invalidate();
    assert!(!maintain(lane_b, None));
    assert!(terminal(lane_b.control.load(Ordering::SeqCst)));
}

#[test]
fn root_wrong_completion_or_cleanup_denies_before_extracting_slot_result() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let mut job = RootJob::prepare(
        lane,
        RootRequest::Begin {
            anchor: anchor(),
            budget: Arc::clone(&state),
        },
    )
    .unwrap()
    .unwrap();
    let token = job.attempt.token;
    {
        let mut slots = lane.slots.lock().unwrap();
        slots.request = None;
        slots.completion = Some(super::super::Completion {
            token,
            outcome: CompletionOutcome::Procfs(Err(super::super::ProcfsError::ReadRejected)),
        });
        slots.cleanup = None;
    }
    lane.control
        .store(word(READY, token.get()), Ordering::SeqCst);
    assert!(matches!(
        job.poll(),
        Err(RootBootstrapError::CleanupUncertain)
    ));
    assert!(lane.slots.lock().unwrap().completion.is_some());
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
}

#[cfg(not(target_os = "linux"))]
#[test]
fn root_unsupported_host_denies_before_native_construction() {
    let owner = budget();
    assert_eq!(
        RootManifestAttempt::try_prepare(&anchor(), &owner).err(),
        Some(RootBootstrapError::UnsupportedPlatform)
    );
}

#[test]
fn root_accounting_requires_exact_retained_lifecycle_counts() {
    let begin = RootAccounting {
        expected: 3,
        before: 0,
        after: 3,
        opened: 3,
        read_references: 1,
        ..RootAccounting::default()
    };
    assert!(begin.complete(RequestKind::RootManifestBegin));
    assert!(
        !RootAccounting {
            read_references: 0,
            ..begin
        }
        .complete(RequestKind::RootManifestBegin)
    );

    let recheck = RootAccounting {
        expected: 3,
        before: 3,
        after: 3,
        ..RootAccounting::default()
    };
    assert!(recheck.complete(RequestKind::RootManifestRecheck));
    assert!(
        !RootAccounting {
            opened: 1,
            ..recheck
        }
        .complete(RequestKind::RootManifestRecheck)
    );

    let retire = RootAccounting {
        expected: 3,
        before: 3,
        after: 0,
        close_attempts: 3,
        ..RootAccounting::default()
    };
    assert!(retire.complete(RequestKind::RootManifestRetire));
    assert!(
        !RootAccounting {
            close_failures: 1,
            ..retire
        }
        .complete(RequestKind::RootManifestRetire)
    );
}

#[test]
fn root_completion_rejects_wrong_inner_job_or_deadline_without_native_holder() {
    let deadline = Instant::now()
        .checked_add(std::time::Duration::from_secs(1))
        .unwrap();
    let owner = ArtifactReadBudget::begin(deadline).unwrap();
    let budget = Arc::clone(owner.shared_state());
    let completion = RootCompletion::Recheck(Ok(UnverifiedRootStability {
        begin: NonZeroU64::new(1).unwrap(),
        job: NonZeroU64::new(2).unwrap(),
        deadline,
        budget: Arc::clone(&budget),
        objects: 1,
    }));
    assert!(!completion.matches_job(
        RequestKind::RootManifestRecheck,
        NonZeroU64::new(3).unwrap(),
        deadline,
        NonZeroU64::new(1).unwrap(),
        &budget,
    ));
    assert!(!completion.matches_job(
        RequestKind::RootManifestRecheck,
        NonZeroU64::new(2).unwrap(),
        Instant::now(),
        NonZeroU64::new(1).unwrap(),
        &budget,
    ));
}

#[test]
fn root_held_state_invalidation_and_expiry_terminalize_then_drain_all_originals() {
    let invalid_lane = lane();
    let owner = budget();
    let mut retained = Some(held_state(invalid_lane, &owner, true));
    owner.shared_state().invalidate();
    assert!(!maintain(invalid_lane, retained.as_ref()));
    assert!(terminal(invalid_lane.control.load(Ordering::SeqCst)));
    assert!(drain(invalid_lane, &mut retained));
    assert!(retained.is_none());
    assert_ne!(phase(invalid_lane.control.load(Ordering::SeqCst)), READY);

    let expiry_lane = lane();
    let expiry_owner = short_budget();
    let mut expired = Some(held_state(expiry_lane, &expiry_owner, false));
    wait_until_expired(expiry_owner.shared_state());
    assert!(!maintain(expiry_lane, expired.as_ref()));
    assert!(terminal(expiry_lane.control.load(Ordering::SeqCst)));
    assert!(drain(expiry_lane, &mut expired));
    assert!(expired.is_none());
    assert_ne!(phase(expiry_lane.control.load(Ordering::SeqCst)), READY);
}

#[test]
fn root_retire_worker_order_publishes_only_exact_cleanup_receipt() {
    let lane = lane();
    let owner = budget();
    let state = Arc::clone(owner.shared_state());
    let mut retained = Some(held_state(lane, &owner, false));
    retained
        .as_mut()
        .unwrap()
        .prefix_acls
        .push(prefix_acl(0o040_755));
    let begin = NonZeroU64::new(1).unwrap();
    let mut job = RootJob::prepare(
        lane,
        RootRequest::Retire {
            begin,
            budget: Arc::clone(&state),
        },
    )
    .unwrap()
    .unwrap();

    assert_eq!(state.valid(), Err(ArtifactError::ObservationInvalid));
    assert!(maintain(lane, retained.as_ref()));
    assert_eq!(job.dispatch(), Ok(DispatchStatus::Dispatched));
    let request = lane.slots.lock().unwrap().request.take().unwrap();
    let request_token = request.token;
    let request_deadline = request.deadline;
    let request_kind = request.kind();
    let (outcome, mut accounting) = execute(lane, &request, &mut retained);
    retire_request(lane, request, &mut accounting);
    assert!(matches!(&outcome, RootCompletion::Retire(Ok(_))));
    assert!(accounting.root.is_some_and(|root| {
        root.expected == 2
            && root.before == 2
            && root.after == 0
            && root.close_attempts == 2
            && root.close_failures == 0
    }));
    assert!(publish_completion(
        lane,
        request_token,
        request_deadline,
        request_kind,
        CompletionOutcome::Root(outcome),
        accounting,
        Some(state.as_ref()),
    ));
    assert!(matches!(
        job.poll(),
        Ok(Some(RootCompletion::Retire(Ok(_))))
    ));
    assert!(retained.is_none());
    let retiring = lane.control.load(Ordering::SeqCst);
    assert_eq!(phase(retiring), RETIRING);
    assert!(finish_retirement(lane, retiring));
    assert_eq!(phase(lane.control.load(Ordering::SeqCst)), IDLE);
    assert!(lane.slots.lock().unwrap().root_lease.is_none());
}

#[test]
fn root_retiring_expiry_and_cancellation_terminalize_then_drain() {
    let expired_lane = lane();
    let expired_owner = short_budget();
    let mut expired_retained = Some(held_state(expired_lane, &expired_owner, false));
    let expired_state = Arc::clone(expired_owner.shared_state());
    let expired_job = RootJob::prepare(
        expired_lane,
        RootRequest::Retire {
            begin: NonZeroU64::new(1).unwrap(),
            budget: expired_state,
        },
    )
    .unwrap()
    .unwrap();
    wait_until_expired(expired_owner.shared_state());
    assert!(!maintain(expired_lane, expired_retained.as_ref()));
    assert!(terminal(expired_lane.control.load(Ordering::SeqCst)));
    assert!(drain(expired_lane, &mut expired_retained));
    assert!(expired_retained.is_none());
    drop(expired_job);

    let canceled_lane = lane();
    let canceled_owner = budget();
    let mut canceled_retained = Some(held_state(canceled_lane, &canceled_owner, true));
    let canceled_state = Arc::clone(canceled_owner.shared_state());
    let canceled_job = RootJob::prepare(
        canceled_lane,
        RootRequest::Retire {
            begin: NonZeroU64::new(1).unwrap(),
            budget: canceled_state,
        },
    )
    .unwrap()
    .unwrap();
    canceled_lane.terminalize();
    assert!(!maintain(canceled_lane, canceled_retained.as_ref()));
    assert!(drain(canceled_lane, &mut canceled_retained));
    assert!(canceled_retained.is_none());
    drop(canceled_job);
}

#[test]
fn root_state_drop_terminalizes_and_consumes_prospective_without_receipt() {
    let lane = lane();
    let owner = budget();
    let result = std::panic::catch_unwind(|| {
        let retained = held_state(lane, &owner, true);
        assert_eq!(retained.opened, 3);
        panic!("synthetic worker unwind");
    });
    assert!(result.is_err());
    assert_eq!(
        owner.shared_state().valid(),
        Err(ArtifactError::ObservationInvalid)
    );
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
    let slots = lane.slots.lock().unwrap();
    assert!(slots.completion.is_none());
    assert!(slots.cleanup.is_none());
}

#[test]
fn root_park_uses_pending_wake_for_live_held_state_then_expiry_terminalizes() {
    let live_lane = lane();
    let owner = budget();
    let retained = Some(held_state(live_lane, &owner, false));
    live_lane.wake.set(std::thread::current()).unwrap();
    std::thread::current().unpark();
    park(live_lane, retained.as_ref());
    assert!(!terminal(live_lane.control.load(Ordering::SeqCst)));
    assert!(maintain(live_lane, retained.as_ref()));
    drop(retained);

    let expiry_lane = lane();
    let expiry_owner = short_budget();
    let expired = Some(held_state(expiry_lane, &expiry_owner, false));
    wait_until_expired(expiry_owner.shared_state());
    park(expiry_lane, expired.as_ref());
    assert!(terminal(expiry_lane.control.load(Ordering::SeqCst)));
    drop(expired);
}

#[test]
fn root_held_lease_survives_unrelated_serial_procfs_retirement() {
    let lane = lane();
    let owner = budget();
    let mut retained = Some(held_state(lane, &owner, false));
    let custody = OwnedProcfsCustody {
        resource: Arc::new(File::open(std::env::current_exe().unwrap()).unwrap()),
        proc_root: Arc::new(File::open(std::env::temp_dir()).unwrap()),
    };
    let mut attempt = Attempt::prepare_in(lane, &custody, deadline()).unwrap();
    let request_token = attempt.token;
    let request_deadline = attempt.deadline;
    assert_eq!(attempt.dispatch(), Ok(DispatchStatus::Dispatched));
    let request = lane.slots.lock().unwrap().request.take().unwrap();
    let mut accounting = CleanupAccounting::default();
    retire_request(lane, request, &mut accounting);
    assert!(publish_completion(
        lane,
        request_token,
        request_deadline,
        RequestKind::Procfs,
        CompletionOutcome::Procfs(Err(ProcfsError::ReadRejected)),
        accounting,
        None,
    ));
    assert!(matches!(attempt.poll(), Err(ProcfsError::ReadRejected)));
    let retiring = lane.control.load(Ordering::SeqCst);
    assert_eq!(phase(retiring), RETIRING);
    assert!(finish_retirement(lane, retiring));
    assert!(maintain(lane, retained.as_ref()));
    assert!(matches!(
        lane.slots
            .lock()
            .unwrap()
            .root_lease
            .as_ref()
            .map(|lease| lease.phase),
        Some(LeasePhase::Held)
    ));
    assert!(drain(lane, &mut retained));
}

#[cfg(not(target_os = "linux"))]
#[test]
fn root_unsupported_host_recheck_model_denies_and_invalidates() {
    let lane = lane();
    let owner = budget();
    let mut retained = Some(held_state(lane, &owner, false));
    let state = Arc::clone(owner.shared_state());
    let token = NonZeroU64::new(2).unwrap();
    lane.control
        .store(word(ACTIVE, token.get()), Ordering::SeqCst);
    let request = Request {
        token,
        deadline: state.deadline,
        dispatched: true,
        payload: RequestPayload::Root(RootRequest::Recheck {
            begin: NonZeroU64::new(1).unwrap(),
            budget: Arc::clone(&state),
        }),
    };
    let (outcome, _) = execute(lane, &request, &mut retained);
    assert!(matches!(
        outcome,
        RootCompletion::Recheck(Err(RootBootstrapError::UnsupportedPlatform))
    ));
    assert_eq!(state.valid(), Err(ArtifactError::ObservationInvalid));
    assert!(terminal(lane.control.load(Ordering::SeqCst)));
    assert!(drain(lane, &mut retained));
}
