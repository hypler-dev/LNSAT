use super::*;
use std::os::unix::fs::{MetadataExt as _, symlink};

fn enter(name: &'static str) -> bool {
    crate::write_sync::owned_test_process::run_or_enter(name)
}

fn pending_paths(database: &Path) -> (PathBuf, PathBuf) {
    let root = database
        .parent()
        .expect("fixture parent")
        .join("selected.sqlite.lnsat-preparations");
    let record = root.join("a".repeat(64)).join("00000000.json");
    (root, record)
}

fn publish_pending(fixture: &Fixture, input_uid: u32) -> Published {
    let selection = storage::Selection::parse(&fixture.database).expect("fixture selection");
    let input = storage::pending_journal::fixture_input(&selection, input_uid);
    let selected_ancestor_count = selection.ancestor_count();
    let selected_plan = journal_plan(&selection);
    let rearm_fixture = Fixture::new(&linux_fixture_root(), "pending-rearm");
    let rearm_selection =
        storage::Selection::parse(&rearm_fixture.database).expect("rearm selection");
    let rearm_plan = plan(&rearm_selection);
    let rearm_budget = budget();
    let rearm_original = Arc::clone(rearm_budget.shared_state());
    let original_budget = budget();
    let original = Arc::clone(original_budget.shared_state());
    root()
        .publish_pending(selection, original_budget, selected_plan, input)
        .expect("bounded pending input publication");
    Published {
        original,
        selected_ancestor_count,
        rearm_original,
        rearm_selection,
        rearm_budget,
        rearm_plan,
    }
}

fn assert_pending_held(published: &Published) {
    let deadline = Instant::now() + Duration::from_secs(3);
    while root().phase.load(Ordering::SeqCst) != STORAGE_HELD {
        assert!(Instant::now() < deadline, "pending storage must arrive");
        thread::sleep(Duration::from_millis(5));
    }
    assert!(!root().closed.load(Ordering::SeqCst));
    assert!(published.original.valid().is_ok());
    let held = root().authority.lock().expect("held pending authority");
    let operation = held.operation.as_ref().expect("original operation");
    assert!(operation.original.owns(&published.original));
    assert_eq!(operation.journal_checkpoint.load(Ordering::SeqCst), 23);
    assert_eq!(operation.journal_issued.load(Ordering::SeqCst), 0b11_1111);
    assert!(!operation.work_closed.load(Ordering::SeqCst));
    assert!(
        held.owners
            .journal_roles_match(operation, journal_schedule::JournalPoint::AppendEntry(1))
    );
    assert!(held.owners.journal_proc_association_held());
    assert_eq!(
        held.owners.held_count(),
        u32::try_from(published.selected_ancestor_count + 6).expect("bounded owner count")
    );
}

fn assert_pending_closed(published: Published) {
    published.original.invalidate();
    let deadline = Instant::now() + Duration::from_secs(3);
    while !root().closed.load(Ordering::SeqCst)
        || root().phase.load(Ordering::SeqCst) != QUARANTINED
    {
        assert!(Instant::now() < deadline, "pending root must close");
        thread::sleep(Duration::from_millis(5));
    }
    let held = root().authority.lock().expect("retained pending owners");
    assert_eq!(
        held.owners.held_count(),
        u32::try_from(published.selected_ancestor_count + 6).expect("bounded owner count")
    );
    assert!(held.owners.journal_proc_association_held());
    drop(held);
    assert_eq!(
        root().publish(
            published.rearm_selection,
            published.rearm_budget,
            published.rearm_plan,
        ),
        Err(RootError::Rejected)
    );
    assert!(published.rearm_original.valid().is_err());
}

#[test]
fn pending_zero_persists_exact_record_and_retains_original_owners_without_phase_claims() {
    if !enter(
        "selected_store::rooted::tests::pending_native::pending_zero_persists_exact_record_and_retains_original_owners_without_phase_claims",
    ) {
        return;
    }
    let fixture = Fixture::new(&linux_fixture_root(), "pending-exact");
    let uid = nix::unistd::geteuid().as_raw();
    let (_, record) = pending_paths(&fixture.database);
    let expected = storage::pending_journal::fixture_bytes(uid);
    let published = publish_pending(&fixture, uid);
    assert_pending_held(&published);
    assert_eq!(
        fs::read(&record).expect("independent named record read"),
        expected
    );
    let metadata = fs::symlink_metadata(&record).expect("record metadata");
    assert!(metadata.is_file() && !metadata.file_type().is_symlink());
    assert_eq!(metadata.mode() & 0o7777, 0o600);
    assert_eq!(metadata.uid(), uid);
    assert_eq!(metadata.nlink(), 1);
    assert_eq!(
        metadata.len(),
        u64::try_from(expected.len()).expect("record length")
    );
    assert_pending_closed(published);
}

#[test]
fn pending_zero_rejects_preexisting_empty_root_without_adoption_or_retry() {
    if !enter(
        "selected_store::rooted::tests::pending_native::pending_zero_rejects_preexisting_empty_root_without_adoption_or_retry",
    ) {
        return;
    }
    let fixture = Fixture::new(&linux_fixture_root(), "pending-existing");
    let (journal, record) = pending_paths(&fixture.database);
    fs::DirBuilder::new()
        .mode(0o700)
        .create(&journal)
        .expect("preexisting fixture directory");
    let before = fs::symlink_metadata(&journal).expect("original directory");
    let published = publish_pending(&fixture, nix::unistd::geteuid().as_raw());
    let expected_owners =
        u32::try_from(published.selected_ancestor_count + 3).expect("owner count");
    assert_terminal_fault(published, expected_owners, false, 0);
    assert!(!record.exists());
    let after = fs::symlink_metadata(&journal).expect("preserved existing directory");
    assert_eq!((after.dev(), after.ino()), (before.dev(), before.ino()));
    assert_eq!(
        fs::read_dir(&journal)
            .expect("fixture directory listing")
            .count(),
        0
    );
}

#[test]
fn pending_zero_rejects_symlink_root_without_following_or_replacing_it() {
    if !enter(
        "selected_store::rooted::tests::pending_native::pending_zero_rejects_symlink_root_without_following_or_replacing_it",
    ) {
        return;
    }
    let fixture = Fixture::new(&linux_fixture_root(), "pending-symlink");
    let target = Fixture::new(&linux_fixture_root(), "pending-symlink-target");
    let target_dir = target.database.parent().expect("target fixture directory");
    let (journal, _) = pending_paths(&fixture.database);
    symlink(target_dir, &journal).expect("owned symlink fixture");
    let before = fs::symlink_metadata(&journal).expect("original symlink");
    let published = publish_pending(&fixture, nix::unistd::geteuid().as_raw());
    let expected_owners =
        u32::try_from(published.selected_ancestor_count + 3).expect("owner count");
    assert_terminal_fault(published, expected_owners, false, 0);
    let after = fs::symlink_metadata(&journal).expect("preserved symlink");
    assert!(after.file_type().is_symlink());
    assert_eq!((after.dev(), after.ino()), (before.dev(), before.ino()));
    assert_eq!(fs::read_link(&journal).expect("symlink target"), target_dir);
    assert_eq!(fs::read(&target.database).expect("target unchanged"), b"");
    assert_eq!(
        fs::read_dir(target_dir)
            .expect("target directory listing")
            .count(),
        1
    );
}

#[test]
fn pending_zero_rejects_foreign_reported_uid_before_journal_creation() {
    if !enter(
        "selected_store::rooted::tests::pending_native::pending_zero_rejects_foreign_reported_uid_before_journal_creation",
    ) {
        return;
    }
    let fixture = Fixture::new(&linux_fixture_root(), "pending-foreign-uid");
    let (journal, _) = pending_paths(&fixture.database);
    let uid = nix::unistd::geteuid().as_raw();
    // Keep the reported UID syntactically valid so the native custody join,
    // rather than the journal decoder, rejects the foreign identity.
    let foreign_uid = 1 + u32::from(uid == 1);
    let published = publish_pending(&fixture, foreign_uid);
    let expected_owners =
        u32::try_from(published.selected_ancestor_count + 3).expect("owner count");
    assert_terminal_fault(published, expected_owners, false, 0);
    assert!(!journal.exists());
}
