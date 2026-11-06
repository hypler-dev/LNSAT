use super::*;
use std::{
    fs::{self, OpenOptions},
    os::unix::fs::{DirBuilderExt as _, OpenOptionsExt as _},
    path::{Path, PathBuf},
    sync::{
        Arc, OnceLock, TryLockError,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

static FIXTURE_SEQUENCE: AtomicU64 = AtomicU64::new(0);
static RETAINED_PAYLOAD_DROPPED: AtomicBool = AtomicBool::new(false);
static FOREIGN_ROOT: OnceLock<ControlRoot> = OnceLock::new();

struct RetainedPayload;

impl Drop for RetainedPayload {
    fn drop(&mut self) {
        RETAINED_PAYLOAD_DROPPED.store(true, Ordering::SeqCst);
    }
}

pub(super) fn panic_retained_payload() -> ! {
    std::panic::panic_any(RetainedPayload)
}

struct Fixture {
    database: PathBuf,
}

impl Fixture {
    fn new(root: &Path, label: &str) -> Self {
        let sequence = FIXTURE_SEQUENCE.fetch_add(1, Ordering::SeqCst);
        let directory = root.join(format!(
            "lnsat-selected-root-{label}-{}-{sequence}",
            std::process::id()
        ));
        let mut builder = fs::DirBuilder::new();
        builder.mode(0o700);
        builder
            .create(&directory)
            .expect("private root fixture directory must create");
        let directory = directory
            .canonicalize()
            .expect("private root fixture directory must canonicalize");
        let database = directory.join("selected.sqlite");
        let mut options = OpenOptions::new();
        options.write(true).create_new(true).mode(0o600);
        drop(
            options
                .open(&database)
                .expect("plain root fixture database must create"),
        );
        let database = database
            .canonicalize()
            .expect("plain root fixture database must canonicalize");
        Self { database }
    }
}

// Root tests intentionally leave fixture paths for the disposable child exit.
// A Drop cleanup could race with permanently retained root file owners.
fn temporary_fixture(label: &str) -> Fixture {
    Fixture::new(&std::env::temp_dir(), label)
}

#[cfg(target_os = "linux")]
fn linux_fixture_root() -> PathBuf {
    let root = PathBuf::from(
        std::env::var("LNSAT_ARTIFACT_TEST_ROOT")
            .expect("LNSAT_ARTIFACT_TEST_ROOT absolute disposable local filesystem required"),
    );
    assert!(root.is_absolute(), "fixture root must be absolute");
    let metadata = fs::symlink_metadata(&root).expect("fixture root metadata must read");
    assert!(
        metadata.is_dir() && !metadata.file_type().is_symlink(),
        "fixture root must be an existing non-symlink directory"
    );
    let held = std::fs::File::open(&root).expect("fixture root must open");
    let filesystem = rustix::fs::fstatfs(&held).expect("fixture root filesystem must inspect");
    assert!(
        crate::selected_store::linux::kernel_posix_filesystem(i128::from(filesystem.f_type), false),
        "fixture root must be ext4, XFS, or Btrfs"
    );
    root
}

fn budget() -> ArtifactReadBudget {
    ArtifactReadBudget::begin(Instant::now() + Duration::from_secs(4))
        .expect("root test budget must begin")
}

fn root() -> &'static ControlRoot {
    super::anchored_root()
}

// Test-only capacity fixture. This is not a production cleanup-plan producer.
fn plan(selection: &storage::Selection) -> FullCleanupPlan {
    let selected_ancestors = selection.ancestor_count();
    let selected_file_obligations = u32::try_from(selected_ancestors)
        .expect("fixed selection count fits cleanup accounting")
        .checked_add(4)
        .expect("fixed selection count has cleanup headroom");
    let total = SQL_CLEANUP_BASE
        .checked_add(selected_file_obligations)
        .expect("selected cleanup plan has total headroom");
    FullCleanupPlan {
        selected_ancestors,
        selected_file_obligations,
        other_obligations: 0,
        total,
    }
}

struct Published {
    original: Arc<ArtifactBudgetState>,
    selected_ancestor_count: usize,
    rearm_original: Arc<ArtifactBudgetState>,
    rearm_selection: storage::Selection,
    rearm_budget: ArtifactReadBudget,
    rearm_plan: FullCleanupPlan,
}

fn fixture_for_fault(fault: u8, label: &str) -> Fixture {
    #[cfg(target_os = "linux")]
    if (12..=15).contains(&fault) {
        return Fixture::new(&linux_fixture_root(), label);
    }
    #[cfg(not(target_os = "linux"))]
    let _ = fault;
    temporary_fixture(label)
}

fn publish_fault(fault: u8, label: &str) -> Published {
    let fixture = fixture_for_fault(fault, label);
    if fault == 8 {
        let lease = crate::local_database_lease_path_v1(&fixture.database)
            .expect("controlled fixture lease path must derive");
        let mut options = OpenOptions::new();
        options.write(true).create_new(true).mode(0o600);
        drop(
            options
                .open(lease)
                .expect("controlled existing lease fixture must create"),
        );
    }
    let selection = storage::Selection::parse(&fixture.database)
        .expect("plain canonical root fixture selection must parse");
    let selected_ancestor_count = selection.ancestor_count();
    #[cfg(target_os = "linux")]
    if (12..=15).contains(&fault) {
        assert!(
            selected_ancestor_count <= 120,
            "supported Linux fault fixture must fit the selected capacity bound"
        );
    }
    let rearm_fixture = temporary_fixture(&format!("{label}-rearm"));
    let rearm_selection = storage::Selection::parse(&rearm_fixture.database)
        .expect("plain canonical rearm selection must parse");
    let rearm_plan = plan(&rearm_selection);
    let rearm_budget = budget();
    let rearm_original = Arc::clone(rearm_budget.shared_state());
    let original_budget = budget();
    let original = Arc::clone(original_budget.shared_state());
    let selection_plan = plan(&selection);
    root().fault.store(fault, Ordering::SeqCst);
    root()
        .publish(selection, original_budget, selection_plan)
        .expect("fresh root must accept bounded fixture publication");
    Published {
        original,
        selected_ancestor_count,
        rearm_original,
        rearm_selection,
        rearm_budget,
        rearm_plan,
    }
}

fn wait_for_terminal_with_limit(expected_owners: u32, wait_limit: Duration) {
    let deadline = Instant::now() + wait_limit;
    loop {
        if root().phase.load(Ordering::SeqCst) == QUARANTINED
            && root().terminal_owners.load(Ordering::SeqCst) == expected_owners
        {
            return;
        }
        assert!(
            Instant::now() < deadline,
            "root terminal state must arrive within its test bound"
        );
        thread::sleep(Duration::from_millis(5));
    }
}

fn assert_terminal_fault(
    published: Published,
    expected_owners: u32,
    expected_parent_consumed_unknown: bool,
    expected_owning_error_postchecks: u32,
) {
    assert_terminal_fault_with_limit(
        published,
        expected_owners,
        expected_parent_consumed_unknown,
        expected_owning_error_postchecks,
        Duration::from_secs(3),
    );
}

fn assert_terminal_fault_with_limit(
    published: Published,
    expected_owners: u32,
    expected_parent_consumed_unknown: bool,
    expected_owning_error_postchecks: u32,
    wait_limit: Duration,
) {
    assert_terminal_fault_with_proc_unknown(
        published,
        expected_owners,
        expected_parent_consumed_unknown,
        expected_owning_error_postchecks,
        false,
        wait_limit,
    );
}

fn assert_terminal_fault_with_proc_unknown(
    published: Published,
    expected_owners: u32,
    expected_parent_consumed_unknown: bool,
    expected_owning_error_postchecks: u32,
    expected_proc_consumed_unknown: bool,
    wait_limit: Duration,
) {
    wait_for_terminal_with_limit(expected_owners, wait_limit);
    assert!(root().closed.load(Ordering::SeqCst));
    assert_eq!(root().phase.load(Ordering::SeqCst), QUARANTINED);
    assert_eq!(
        root()
            .terminal_parent_consumed_unknown
            .load(Ordering::SeqCst),
        expected_parent_consumed_unknown
    );
    assert_eq!(
        root().owning_error_postchecks.load(Ordering::SeqCst),
        expected_owning_error_postchecks
    );
    assert_eq!(
        root().terminal_proc_consumed_unknown.load(Ordering::SeqCst),
        expected_proc_consumed_unknown
    );
    assert!(published.original.valid().is_err());
    assert!(matches!(
        root().authority.try_lock(),
        Err(TryLockError::WouldBlock)
    ));

    let context = root()
        .context
        .try_lock()
        .expect("terminal root context slot must remain inspectable");
    let before = context
        .as_ref()
        .expect("terminal root must retain its original join handle")
        .thread()
        .id();
    assert!(
        !context
            .as_ref()
            .expect("terminal root must retain its original join handle")
            .is_finished(),
        "terminal root context must remain retained"
    );
    drop(context);

    assert_eq!(
        root().publish(
            published.rearm_selection,
            published.rearm_budget,
            published.rearm_plan,
        ),
        Err(RootError::Rejected)
    );
    assert!(published.rearm_original.valid().is_err());
    let context = root()
        .context
        .try_lock()
        .expect("rejected rearm must not hold context coordination");
    assert_eq!(
        context
            .as_ref()
            .expect("rejected rearm must not replace context")
            .thread()
            .id(),
        before
    );
}

#[test]
fn rooted_failure_after_parent_quarantines_and_retains_parent() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_failure_after_parent_quarantines_and_retains_parent",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(1, "after-parent-error"), 1, false, 0);
}

#[test]
fn rooted_invalid_original_after_parent_quarantines_and_retains_parent() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_invalid_original_after_parent_quarantines_and_retains_parent",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(2, "after-parent-invalid"), 1, false, 0);
}

#[test]
fn rooted_panic_after_parent_quarantines_and_retains_parent() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_panic_after_parent_quarantines_and_retains_parent",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(3, "after-parent-panic"), 1, false, 0);
}

#[test]
fn rooted_poisoned_authority_quarantines_before_file_acquisition() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_poisoned_authority_quarantines_before_file_acquisition",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(4, "authority-poison"), 0, false, 0);
}

#[test]
fn rooted_panic_payload_is_retained_with_parent_owner() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_panic_payload_is_retained_with_parent_owner",
    ) {
        return;
    }
    RETAINED_PAYLOAD_DROPPED.store(false, Ordering::SeqCst);
    assert_terminal_fault(publish_fault(5, "retained-payload"), 1, false, 0);
    assert!(
        !RETAINED_PAYLOAD_DROPPED.load(Ordering::SeqCst),
        "caught payload must remain retained with the actual authority guard"
    );
}

#[test]
fn rooted_uncertain_parent_close_after_lease_quarantines_actual_remaining_owner() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_uncertain_parent_close_after_lease_quarantines_actual_remaining_owner",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(6, "uncertain-parent-close"), 1, true, 0);
}

#[test]
fn rooted_failure_after_lease_quarantines_parent_and_lease() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_failure_after_lease_quarantines_parent_and_lease",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(7, "after-lease-error"), 2, false, 0);
}

#[test]
fn rooted_cancelled_lease_open_quarantines_parent_after_native_error_postcheck() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_cancelled_lease_open_quarantines_parent_after_native_error_postcheck",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(8, "cancelled-lease-open"), 1, false, 1);
}

#[test]
fn rooted_parent_metadata_drift_quarantines_actual_held_parent() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_parent_metadata_drift_quarantines_actual_held_parent",
    ) {
        return;
    }
    // Controlled metadata drift is not a cleanup or replacement proof.
    assert_terminal_fault(publish_fault(9, "parent-metadata-drift"), 1, false, 0);
}

#[test]
fn rooted_late_parent_delivery_after_original_deadline_quarantines_held_parent() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_late_parent_delivery_after_original_deadline_quarantines_held_parent",
    ) {
        return;
    }
    // Controlled late delivery is not a blocked-kernel-call or physical deadline proof.
    assert_terminal_fault_with_limit(
        publish_fault(10, "late-parent-delivery"),
        1,
        false,
        0,
        Duration::from_secs(6),
    );
}

#[test]
fn rooted_missing_parent_open_quarantines_without_file_owner() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_missing_parent_open_quarantines_without_file_owner",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(11, "missing-parent-open"), 0, false, 1);
}

#[cfg(target_os = "linux")]
#[test]
fn rooted_missing_proc_open_quarantines_parent_and_lease() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_missing_proc_open_quarantines_parent_and_lease",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(12, "missing-proc-open"), 2, false, 1);
}

#[cfg(target_os = "linux")]
#[test]
fn rooted_missing_root_ancestor_open_quarantines_parent_and_lease() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_missing_root_ancestor_open_quarantines_parent_and_lease",
    ) {
        return;
    }
    assert_terminal_fault(publish_fault(13, "missing-root-ancestor"), 2, false, 1);
}

#[cfg(target_os = "linux")]
#[test]
fn rooted_last_ancestor_rename_quarantines_prior_ancestor_owners() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_last_ancestor_rename_quarantines_prior_ancestor_owners",
    ) {
        return;
    }
    let published = publish_fault(14, "last-ancestor-rename");
    let expected_owners = u32::try_from(published.selected_ancestor_count + 1)
        .expect("fixed retained-owner count fits u32");
    assert_terminal_fault(published, expected_owners, false, 1);
}

#[cfg(target_os = "linux")]
#[test]
fn rooted_uncertain_proc_close_quarantines_parent_and_lease() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_uncertain_proc_close_quarantines_parent_and_lease",
    ) {
        return;
    }
    assert_terminal_fault_with_proc_unknown(
        publish_fault(15, "uncertain-proc-close"),
        2,
        false,
        1,
        true,
        Duration::from_secs(3),
    );
}

#[test]
fn rooted_foreign_control_root_rejects_without_context_or_file_owners() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_foreign_control_root_rejects_without_context_or_file_owners",
    ) {
        return;
    }
    let actual = root();
    assert_eq!(actual.phase.load(Ordering::SeqCst), VACANT);
    let foreign = FOREIGN_ROOT.get_or_init(ControlRoot::inert);
    let fixture = temporary_fixture("foreign-root");
    let selection = storage::Selection::parse(&fixture.database)
        .expect("foreign-root fixture selection must parse");
    let fixture_plan = plan(&selection);
    let original = budget();
    let original_state = Arc::clone(original.shared_state());
    assert_eq!(
        foreign.publish(selection, original, fixture_plan),
        Err(RootError::Rejected)
    );
    assert!(original_state.valid().is_err());
    assert!(foreign.closed.load(Ordering::SeqCst));
    assert_eq!(foreign.phase.load(Ordering::SeqCst), QUARANTINED);
    assert!(
        foreign
            .context
            .lock()
            .expect("foreign root must not start context")
            .is_none()
    );
    let held = foreign
        .authority
        .lock()
        .expect("foreign root must not retain authority");
    assert!(held.operation.is_none());
    assert!(held.selection.is_none());
    assert_eq!(held.owners.held_count(), 0);
    assert!(!actual.closed.load(Ordering::SeqCst));
    assert_eq!(actual.phase.load(Ordering::SeqCst), VACANT);
    assert!(
        actual
            .context
            .lock()
            .expect("actual root must stay inert")
            .is_none()
    );
}

#[test]
fn rooted_capacity_rejection_never_acquires_or_starts_context() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_capacity_rejection_never_acquires_or_starts_context",
    ) {
        return;
    }
    let path = (0..127).fold(PathBuf::from("/"), |mut path, _| {
        path.push("a");
        path
    });
    let selection_path = path.join("selected.sqlite");
    let selection = storage::Selection::parse(&selection_path)
        .expect("syntactic 128-ancestor selection must parse");
    assert_eq!(selection.ancestor_count(), 128);
    let original = budget();
    let state = Arc::clone(original.shared_state());
    let selected = 132;
    let rejected = FullCleanupPlan {
        selected_ancestors: 128,
        selected_file_obligations: selected,
        other_obligations: 0,
        total: SQL_CLEANUP_BASE + selected,
    };
    assert_eq!(rejected.total, 264);
    assert_eq!(
        root().publish(selection, original, rejected),
        Err(RootError::Capacity)
    );
    assert!(state.valid().is_err());
    assert_eq!(root().phase.load(Ordering::SeqCst), QUARANTINED);
    assert_eq!(root().terminal_owners.load(Ordering::SeqCst), 0);
    assert!(
        root()
            .context
            .lock()
            .expect("capacity rejection must not poison context")
            .is_none()
    );
    let held = root()
        .authority
        .lock()
        .expect("capacity rejection must not retain authority");
    assert_eq!(held.owners.held_count(), 0);
    assert!(held.operation.is_none());
    assert!(held.selection.is_none());
}

#[test]
fn rooted_selection_and_cleanup_capacity_match_exact_boundaries() {
    let one_twenty = (0..119).fold(PathBuf::from("/"), |mut path, _| {
        path.push("a");
        path
    });
    let selection = storage::Selection::parse(&one_twenty.join("selected.sqlite"))
        .expect("syntactic 120-ancestor selection must parse");
    assert_eq!(selection.ancestor_count(), 120);
    let accepted = plan(&selection);
    assert_eq!(accepted.selected_file_obligations, 124);
    assert_eq!(accepted.total, 256);
    assert!(accepted.matches_selection(&selection));

    let one_twenty_eight = (0..127).fold(PathBuf::from("/"), |mut path, _| {
        path.push("a");
        path
    });
    let selection = storage::Selection::parse(&one_twenty_eight.join("selected.sqlite"))
        .expect("syntactic 128-ancestor selection must parse");
    assert_eq!(selection.ancestor_count(), 128);
    let rejected = FullCleanupPlan {
        selected_ancestors: 128,
        selected_file_obligations: 132,
        other_obligations: 0,
        total: 264,
    };
    assert!(!rejected.matches_selection(&selection));

    for path in [
        "relative.sqlite",
        "/a//selected.sqlite",
        "/a/../selected.sqlite",
        "/a/\n",
    ] {
        assert!(matches!(
            storage::Selection::parse(Path::new(path)),
            Err(RootError::Rejected)
        ));
    }
}

#[cfg(target_os = "linux")]
fn publish_linux_storage() -> Published {
    let fixture = Fixture::new(&linux_fixture_root(), "linux-storage");
    let selection = storage::Selection::parse(&fixture.database)
        .expect("supported plain Linux root fixture selection must parse");
    let rearm_fixture = Fixture::new(&linux_fixture_root(), "linux-storage-rearm");
    let rearm_selection = storage::Selection::parse(&rearm_fixture.database)
        .expect("supported Linux rearm selection must parse");
    let rearm_plan = plan(&rearm_selection);
    let rearm_budget = budget();
    let rearm_original = Arc::clone(rearm_budget.shared_state());
    let ancestor_count = selection.ancestor_count();
    assert!(
        ancestor_count <= 120,
        "supported fixture path must fit the selected N + 4 and SQL-base capacity bound"
    );
    let original_budget = budget();
    let original = Arc::clone(original_budget.shared_state());
    let selection_plan = plan(&selection);
    root().fault.store(0, Ordering::SeqCst);
    root()
        .publish(selection, original_budget, selection_plan)
        .expect("supported Linux root fixture publication must start");
    Published {
        original,
        selected_ancestor_count: ancestor_count,
        rearm_original,
        rearm_selection,
        rearm_budget,
        rearm_plan,
    }
}

#[cfg(target_os = "linux")]
fn assert_linux_storage_held(published: &Published) -> std::thread::ThreadId {
    let deadline = Instant::now() + Duration::from_secs(3);
    while root().phase.load(Ordering::SeqCst) != STORAGE_HELD {
        assert!(
            Instant::now() < deadline,
            "Linux storage ownership must arrive within three seconds"
        );
        thread::sleep(Duration::from_millis(5));
    }
    assert!(!root().closed.load(Ordering::SeqCst));
    assert!(published.original.valid().is_ok());
    assert!(Arc::ptr_eq(
        root()
            .original_state
            .get()
            .expect("published root must retain original state"),
        &published.original
    ));
    let held = root()
        .authority
        .lock()
        .expect("successful root authority must remain held in root cell");
    let operation = held
        .operation
        .as_ref()
        .expect("successful root must retain operation");
    assert!(operation.original.owns(&published.original));
    assert_eq!(
        held.owners.held_count(),
        u32::try_from(published.selected_ancestor_count + 2)
            .expect("fixed held-owner count fits u32"),
        "successful root must retain parent, lease and every ancestor while both procfs slots retire"
    );
    assert!(
        held.owners.procfs_known_retired(),
        "successful root must have retired both procfs observations before STORAGE_HELD"
    );
    drop(held);
    let context = root()
        .context
        .lock()
        .expect("successful root context must remain available");
    let handle = context
        .as_ref()
        .expect("successful root must retain its original join handle");
    let context_id = handle.thread().id();
    assert!(
        !handle.is_finished(),
        "STORAGE_HELD must retain the original context during its bounded budget window"
    );
    assert_eq!(root().context_id.get(), Some(&context_id));
    drop(context);

    context_id
}

#[cfg(target_os = "linux")]
fn assert_linux_storage_closed(published: Published, context_id: std::thread::ThreadId) {
    published.original.invalidate();

    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        let context = root()
            .context
            .lock()
            .expect("root context must remain inspectable");
        let finished = context
            .as_ref()
            .expect("post-close root must retain its original join handle")
            .is_finished();
        drop(context);
        if root().closed.load(Ordering::SeqCst)
            && root().phase.load(Ordering::SeqCst) == QUARANTINED
            && finished
        {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "root context must close within three seconds after budget invalidation"
        );
        thread::sleep(Duration::from_millis(5));
    }
    assert_eq!(root().context_id.get(), Some(&context_id));
    assert_eq!(
        root().publish(
            published.rearm_selection,
            published.rearm_budget,
            published.rearm_plan,
        ),
        Err(RootError::Rejected)
    );
    assert!(published.rearm_original.valid().is_err());
    let held = root()
        .authority
        .lock()
        .expect("closed root owners must remain inspectable");
    assert_eq!(
        held.owners.held_count(),
        u32::try_from(published.selected_ancestor_count + 2)
            .expect("fixed held-owner count fits u32")
    );
    assert!(held.owners.procfs_known_retired());
}

#[cfg(target_os = "linux")]
#[test]
fn rooted_linux_storage_success_retains_real_file_owners_without_sqlite() {
    if !crate::write_sync::owned_test_process::run_or_enter(
        "selected_store::rooted::tests::rooted_linux_storage_success_retains_real_file_owners_without_sqlite",
    ) {
        return;
    }
    let published = publish_linux_storage();
    let context_id = assert_linux_storage_held(&published);
    assert_linux_storage_closed(published, context_id);
}
