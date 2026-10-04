use super::*;

#[cfg(any(target_os = "linux", target_os = "macos"))]
use crate::SqliteStore;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::{
    fs::{self, File, OpenOptions},
    os::unix::{fs::DirBuilderExt as _, io::OwnedFd},
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

#[cfg(target_os = "linux")]
use std::{
    io::Write as _,
    os::unix::fs::{OpenOptionsExt as _, PermissionsExt as _, symlink},
    path::Path,
};

#[cfg(target_os = "linux")]
use super::super::{JournalPhase, JournalRecord, NullableString, encode_record, journal_digest};
#[cfg(target_os = "linux")]
use crate::{
    LocalOwnerRecoveryErrorV1, SelectedLocalStoreErrorV1, acquire_local_daemon_database_lease_v1,
};
#[cfg(any(target_os = "linux", target_os = "macos"))]
use nix::fcntl::{FcntlArg, fcntl};
#[cfg(target_os = "linux")]
use nix::{
    sys::stat::Mode,
    unistd::{getuid, mkfifo},
};

#[cfg(any(target_os = "linux", target_os = "macos"))]
static NEXT_FIXTURE: AtomicU64 = AtomicU64::new(1);

#[cfg(any(target_os = "linux", target_os = "macos"))]
struct Fixture {
    directory: PathBuf,
    database: PathBuf,
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
impl Fixture {
    fn new(label: &str) -> Self {
        let sequence = NEXT_FIXTURE.fetch_add(1, Ordering::Relaxed);
        let directory = std::env::temp_dir().join(format!(
            "lnsat-custody-{}-{label}-{sequence}",
            std::process::id()
        ));
        fs::DirBuilder::new()
            .mode(0o700)
            .create(&directory)
            .expect("private fixture directory must create");
        let directory = directory
            .canonicalize()
            .expect("private fixture directory must canonicalize");
        let database = directory.join("selected.sqlite");
        drop(SqliteStore::open(&database).expect("ordinary fixture schema must create"));
        Self {
            directory,
            database,
        }
    }

    fn root(&self) -> PathBuf {
        self.directory.join("selected.sqlite.lnsat-preparations")
    }

    fn selected(&self) -> SqliteStore {
        SqliteStore::open_selected_local_store_inspection_v1(&self.database)
            .expect("selected fixture must open read-only")
    }

    #[cfg(target_os = "linux")]
    fn database_bytes(&self) -> [Option<Vec<u8>>; 3] {
        ["", "-wal", "-shm"].map(|suffix| {
            let path = PathBuf::from(format!("{}{suffix}", self.database.display()));
            match fs::read(path) {
                Ok(bytes) => Some(bytes),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
                Err(error) => panic!("database bytes must read: {error}"),
            }
        })
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.directory);
    }
}

#[cfg(target_os = "linux")]
const CANDIDATE: &str = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
#[cfg(target_os = "linux")]
const STORE: &str = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
#[cfg(target_os = "linux")]
const RECIPE: &str = "sha256:3333333333333333333333333333333333333333333333333333333333333333";
#[cfg(target_os = "linux")]
const CHALLENGE: &str = "sha256:4444444444444444444444444444444444444444444444444444444444444444";

#[cfg(target_os = "linux")]
fn id(byte: char) -> String {
    std::iter::repeat_n(byte, 64).collect()
}

#[cfg(target_os = "linux")]
fn nullable(value: Option<&str>) -> NullableString {
    NullableString(value.map(str::to_owned))
}

#[cfg(target_os = "linux")]
fn record(
    preparation_id: &str,
    phase: JournalPhase,
    revision: u8,
    container_id: Option<&str>,
    previous_digest: Option<&str>,
) -> JournalRecord {
    JournalRecord {
        schema_id: "lnsat.hcfg_preparation_journal.v1".to_owned(),
        contract_version: "lnsat.contracts.v1_0".to_owned(),
        preparation_id: preparation_id.to_owned(),
        candidate_digest: CANDIDATE.to_owned(),
        store_digest: STORE.to_owned(),
        recipe_digest: RECIPE.to_owned(),
        owner_uid: getuid().as_raw(),
        challenge_digest: CHALLENGE.to_owned(),
        phase,
        container_name: format!("lnsat-hcfg6-probe-{preparation_id}"),
        container_id: nullable(container_id),
        previous_digest: nullable(previous_digest),
        revision,
    }
}

#[cfg(target_os = "linux")]
fn pending(preparation_id: &str) -> JournalRecord {
    record(preparation_id, JournalPhase::Pending, 0, None, None)
}

#[cfg(target_os = "linux")]
fn successor(
    prior: &JournalRecord,
    phase: JournalPhase,
    container_id: Option<&str>,
) -> JournalRecord {
    let digest = journal_digest(prior).expect("fixture record must digest");
    record(
        &prior.preparation_id,
        phase,
        prior.revision + 1,
        container_id,
        Some(&digest),
    )
}

#[cfg(target_os = "linux")]
fn frame(record: &JournalRecord) -> Vec<u8> {
    encode_record(record).expect("fixture record must encode")
}

#[cfg(target_os = "linux")]
fn normal_frames(preparation_id: &str) -> Vec<Vec<u8>> {
    let first = pending(preparation_id);
    let second = successor(&first, JournalPhase::ProbeCreated, Some(&id('c')));
    let third = successor(&second, JournalPhase::CleanupVerified, Some(&id('c')));
    let fourth = successor(&third, JournalPhase::Bound, Some(&id('c')));
    [&first, &second, &third, &fourth]
        .into_iter()
        .map(frame)
        .collect()
}

#[cfg(target_os = "linux")]
fn zero_created_frames(preparation_id: &str) -> Vec<Vec<u8>> {
    let first = pending(preparation_id);
    let second = successor(&first, JournalPhase::CleanupVerified, None);
    let third = successor(&second, JournalPhase::Bound, None);
    [&first, &second, &third].into_iter().map(frame).collect()
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn succeeds<T>(result: Result<T, CustodyError>) -> T {
    match result {
        Ok(value) => value,
        Err(error) => panic!("expected custody success, got {}", error.code()),
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn assert_error<T>(result: Result<T, CustodyError>, expected: &str) {
    let error = result.err().expect("custody must reject the owned result");
    assert_eq!(error.code(), expected);
}

#[cfg(target_os = "linux")]
fn create_private_directory(path: &Path) {
    fs::DirBuilder::new()
        .mode(0o700)
        .create(path)
        .expect("private fixture path must create");
}

#[cfg(target_os = "linux")]
fn write_private_file(path: &Path, bytes: &[u8]) {
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(path)
        .expect("private fixture file must create");
    file.write_all(bytes)
        .expect("private fixture frame must write");
    file.sync_all().expect("private fixture frame must flush");
}

#[cfg(target_os = "linux")]
fn write_root_frame(root: &Path, preparation_id: &str, revision: usize, bytes: &[u8]) {
    let preparation = root.join(preparation_id);
    if !preparation.exists() {
        create_private_directory(&preparation);
    }
    write_private_file(&preparation.join(format!("{revision:08}.json")), bytes);
}

#[cfg(target_os = "linux")]
#[test]
fn custody_persists_normal_and_zero_created_chains_without_sql_mutation() {
    for (label, frames) in [
        ("normal", normal_frames(&id('a'))),
        ("zero", zero_created_frames(&id('b'))),
    ] {
        let fixture = Fixture::new(label);
        let mut store = fixture.selected();
        let before = fixture.database_bytes();
        let mut custody = succeeds(JournalCustody::open(&mut store));
        for frame in &frames {
            succeeds(custody.append(frame));
        }
        let snapshot = succeeds(custody.inspect());
        assert_eq!(snapshot.chains.len(), 1);
        assert_eq!(snapshot.chains[0].records.len(), frames.len());
        drop(custody);
        assert_eq!(fixture.database_bytes(), before);
        drop(store);

        let mut store = fixture.selected();
        let mut custody = succeeds(JournalCustody::open(&mut store));
        let snapshot = succeeds(custody.inspect());
        assert_eq!(snapshot.chains.len(), 1);
        assert_eq!(snapshot.chains[0].records.len(), frames.len());
        drop(custody);
        drop(store);
    }
}

#[cfg(target_os = "linux")]
#[test]
fn custody_allows_a_second_preparation_while_the_guard_is_held() {
    let fixture = Fixture::new("second-preparation");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    succeeds(custody.append(&frame(&pending(&id('b')))));
    let snapshot = succeeds(custody.inspect());
    assert_eq!(snapshot.chains.len(), 2);
    assert!(snapshot.chains.iter().all(|chain| chain.records.len() == 1));
}

#[cfg(target_os = "linux")]
#[test]
fn custody_retains_selected_store_lease_and_rejects_ordinary_store() {
    let fixture = Fixture::new("lease");
    let mut selected = fixture.selected();
    let before = fixture.database_bytes();
    let custody = succeeds(JournalCustody::open(&mut selected));
    assert!(matches!(
        acquire_local_daemon_database_lease_v1(&fixture.database),
        Err(LocalOwnerRecoveryErrorV1::DatabaseBusy)
    ));
    drop(custody);
    assert_eq!(fixture.database_bytes(), before);
    drop(selected);

    let mut ordinary = SqliteStore::open(&fixture.database).expect("ordinary store must open");
    assert_error(
        JournalCustody::open(&mut ordinary),
        "journal_custody.changed",
    );
    assert_eq!(
        ordinary.verify_selected_local_store_custody_v1(),
        Err(SelectedLocalStoreErrorV1::UnboundStore)
    );
}

#[cfg(target_os = "linux")]
#[test]
fn custody_poisoning_blocks_reuse_after_rejection() {
    let fixture = Fixture::new("poison");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    assert_error(
        custody.append(b"not a journal frame\n"),
        "journal_custody.invalid_journal",
    );
    assert_error(custody.inspect(), "journal_custody.poisoned");
    assert_error(
        custody.append(&frame(&pending(&id('a')))),
        "journal_custody.poisoned",
    );
}

#[cfg(target_os = "linux")]
#[test]
fn custody_rejects_gap_terminal_and_existing_revision_without_clobbering() {
    let fixture = Fixture::new("continuity");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let gap = record(
        &id('a'),
        JournalPhase::CleanupVerified,
        2,
        None,
        Some(CANDIDATE),
    );
    assert_error(
        custody.append(&frame(&gap)),
        "journal_custody.invalid_journal",
    );
    drop(custody);
    drop(store);

    let fixture = Fixture::new("terminal");
    let frames = zero_created_frames(&id('b'));
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    for frame in &frames {
        succeeds(custody.append(frame));
    }
    let terminal_bytes = fs::read(fixture.root().join(id('b')).join("00000002.json"))
        .expect("bound revision must exist");
    let next = successor(
        &successor(&pending(&id('b')), JournalPhase::CleanupVerified, None),
        JournalPhase::Quarantined,
        None,
    );
    assert_error(
        custody.append(&frame(&next)),
        "journal_custody.invalid_journal",
    );
    assert_eq!(
        fs::read(fixture.root().join(id('b')).join("00000002.json")).unwrap(),
        terminal_bytes
    );
}

#[cfg(target_os = "linux")]
#[test]
fn custody_rejects_malformed_foreign_and_oversized_frames_before_append() {
    for (label, bytes, expected) in [
        (
            "malformed",
            b"{}\n".to_vec(),
            "journal_custody.invalid_journal",
        ),
        (
            "foreign",
            frame(&pending(&id('b'))),
            "journal_custody.invalid_journal",
        ),
        (
            "oversized",
            vec![b'x'; 16_385],
            "journal_custody.limit_exceeded",
        ),
    ] {
        let fixture = Fixture::new(label);
        create_private_directory(&fixture.root());
        write_root_frame(&fixture.root(), &id('a'), 0, &bytes);
        let mut store = fixture.selected();
        assert_error(JournalCustody::open(&mut store), expected);
    }
}

#[cfg(target_os = "linux")]
#[test]
fn custody_rejects_names_types_modes_and_links() {
    for (variant, expected) in [
        ("name", "journal_custody.invalid_journal"),
        ("symlink", "journal_custody.io_rejected"),
        ("fifo", "journal_custody.io_rejected"),
        ("mode", "journal_custody.changed"),
        ("hardlink", "journal_custody.io_rejected"),
    ] {
        let fixture = Fixture::new(variant);
        create_private_directory(&fixture.root());
        match variant {
            "name" => write_private_file(&fixture.root().join("not-a-preparation"), b"x"),
            "symlink" => symlink(&fixture.database, fixture.root().join(&id('a')))
                .expect("fixture symlink must create"),
            "fifo" => mkfifo(
                &fixture.root().join(&id('a')),
                Mode::S_IRUSR | Mode::S_IWUSR,
            )
            .expect("fixture fifo must create"),
            "mode" => {
                let directory = fixture.root().join(&id('a'));
                create_private_directory(&directory);
                fs::set_permissions(&directory, fs::Permissions::from_mode(0o755))
                    .expect("fixture mode must change");
            }
            "hardlink" => {
                let source = fixture.root().join("source");
                write_private_file(&source, b"fixture");
                fs::hard_link(&source, fixture.root().join(&id('a')))
                    .expect("fixture hard link must create");
            }
            _ => unreachable!(),
        }
        let mut store = fixture.selected();
        assert_error(JournalCustody::open(&mut store), expected);
    }

    let fixture = Fixture::new("owner");
    create_private_directory(&fixture.root());
    let root = File::open(fixture.root()).expect("fixture root must open");
    let stamp = succeeds(held_stamp(&root));
    let foreign_owner = getuid()
        .as_raw()
        .checked_add(1)
        .expect("non-root fixture owner must have a distinct successor");
    assert_error(
        stamp.validate(foreign_owner, true),
        "journal_custody.changed",
    );
}

#[cfg(target_os = "linux")]
#[test]
fn custody_rejects_empty_and_truncated_preparation_states_on_reopen() {
    let fixture = Fixture::new("empty-preparation");
    create_private_directory(&fixture.root());
    create_private_directory(&fixture.root().join(id('a')));
    let mut store = fixture.selected();
    assert_error(
        JournalCustody::open(&mut store),
        "journal_custody.invalid_journal",
    );

    let fixture = Fixture::new("empty-revision");
    create_private_directory(&fixture.root());
    write_root_frame(&fixture.root(), &id('a'), 0, b"");
    let mut store = fixture.selected();
    assert_error(
        JournalCustody::open(&mut store),
        "journal_custody.invalid_journal",
    );

    let fixture = Fixture::new("truncated-revision");
    create_private_directory(&fixture.root());
    let mut truncated = frame(&pending(&id('a')));
    truncated.pop();
    write_root_frame(&fixture.root(), &id('a'), 0, &truncated);
    let mut store = fixture.selected();
    assert_error(
        JournalCustody::open(&mut store),
        "journal_custody.invalid_journal",
    );
}

#[cfg(target_os = "linux")]
#[test]
fn custody_rejects_actual_revision_file_mutations() {
    let fixture = Fixture::new("revision-hardlink");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    let revision = fixture.root().join(id('a')).join("00000000.json");
    fs::hard_link(&revision, fixture.directory.join("external-private-frame"))
        .expect("private external hard link must create");
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("revision-fifo");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    let revision = fixture.root().join(id('a')).join("00000000.json");
    fs::remove_file(&revision).expect("owned revision must remove");
    mkfifo(&revision, Mode::S_IRUSR | Mode::S_IWUSR).expect("revision fifo must create");
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("revision-symlink");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    let revision = fixture.root().join(id('a')).join("00000000.json");
    let external = fixture.directory.join("external-private-frame");
    write_private_file(&external, b"private external frame");
    fs::remove_file(&revision).expect("owned revision must remove");
    symlink(&external, &revision).expect("revision symlink must create");
    assert_error(custody.inspect(), "journal_custody.io_rejected");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("revision-mode");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    let revision = fixture.root().join(id('a')).join("00000000.json");
    fs::set_permissions(&revision, fs::Permissions::from_mode(0o644))
        .expect("revision mode must change");
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("revision-directory");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    let revision = fixture.root().join(id('a')).join("00000000.json");
    fs::remove_file(&revision).expect("owned revision must remove");
    create_private_directory(&revision);
    assert_error(custody.inspect(), "journal_custody.changed");
}

#[cfg(target_os = "linux")]
#[test]
fn custody_rejects_root_count_revision_count_and_malformed_hostile_corpus() {
    let fixture = Fixture::new("root-count");
    create_private_directory(&fixture.root());
    for nibble in "0123456789abcdef".chars() {
        for suffix in "0123".chars() {
            let preparation_id = format!("{nibble}{suffix}").repeat(32);
            write_root_frame(
                &fixture.root(),
                &preparation_id,
                0,
                &frame(&pending(&preparation_id)),
            );
        }
    }
    let overflow = "ff".repeat(32);
    write_root_frame(&fixture.root(), &overflow, 0, &frame(&pending(&overflow)));
    let mut store = fixture.selected();
    assert_error(
        JournalCustody::open(&mut store),
        "journal_custody.limit_exceeded",
    );
    drop(store);

    let fixture = Fixture::new("revision-count");
    create_private_directory(&fixture.root());
    for revision in 0..65 {
        write_root_frame(&fixture.root(), &id('a'), revision, b"{}\n");
    }
    let mut store = fixture.selected();
    assert_error(
        JournalCustody::open(&mut store),
        "journal_custody.limit_exceeded",
    );
    drop(store);

    let fixture = Fixture::new("aggregate");
    create_private_directory(&fixture.root());
    for revision in 0..64 {
        write_root_frame(&fixture.root(), &id('a'), revision, &vec![b'x'; 16_384]);
    }
    write_root_frame(&fixture.root(), &id('b'), 0, &vec![b'x'; 16_384]);
    let mut store = fixture.selected();
    assert_error(
        JournalCustody::open(&mut store),
        "journal_custody.invalid_journal",
    );

    let fixture = Fixture::new("remaining-budget");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let initial = frame(&pending(&id('a')));
    succeeds(custody.append(&initial));
    let preparation = succeeds(open_directory(&custody.root, &id('a')));
    assert_error(
        custody.read_revision(
            &preparation,
            "00000000.json",
            super::super::MAX_CHAIN_BYTES - initial.len() + 1,
        ),
        "journal_custody.limit_exceeded",
    );
}

#[cfg(target_os = "linux")]
#[test]
fn custody_detects_root_preparation_and_store_replacement() {
    let fixture = Fixture::new("root-replace");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    succeeds(custody.append(&frame(&pending(&id('a')))));
    let replacement = fixture.directory.join("root-replacement");
    fs::rename(fixture.root(), &replacement).expect("root must move");
    create_private_directory(&fixture.root());
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("preparation-replace");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let initial = frame(&pending(&id('a')));
    succeeds(custody.append(&initial));
    let preparation = fixture.root().join(id('a'));
    let replacement = fixture.directory.join("replacement");
    fs::rename(&preparation, &replacement).expect("preparation must move");
    create_private_directory(&preparation);
    write_private_file(&preparation.join("00000000.json"), &initial);
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("revision-replace");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let initial = frame(&pending(&id('a')));
    succeeds(custody.append(&initial));
    let replacement = fixture.directory.join("revision-replacement.json");
    write_private_file(&replacement, &initial);
    fs::rename(
        &replacement,
        fixture.root().join(id('a')).join("00000000.json"),
    )
    .expect("same-byte revision replacement must move");
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("store-drift");
    let replacement = fixture.directory.join("replacement.sqlite");
    drop(SqliteStore::open(&replacement).expect("replacement database must create"));
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    fs::rename(&replacement, &fixture.database).expect("database replacement must move");
    assert_error(custody.inspect(), "journal_custody.changed");
}

#[cfg(target_os = "linux")]
#[test]
fn custody_denies_real_post_read_preparation_replacement_and_revision_rewrite() {
    let fixture = Fixture::new("post-read-preparation");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let initial = frame(&pending(&id('a')));
    succeeds(custody.append(&initial));
    let preparation = fixture.root().join(id('a'));
    let moved = fixture.directory.join("post-read-moved");
    custody.post_read_intervention = Some(Box::new(move || {
        fs::rename(&preparation, &moved).expect("post-read preparation must move");
        create_private_directory(&preparation);
        write_private_file(&preparation.join("00000000.json"), &initial);
    }));
    assert_error(custody.inspect(), "journal_custody.changed");
    drop(custody);
    drop(store);

    let fixture = Fixture::new("post-read-revision");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let initial_record = pending(&id('a'));
    let initial = frame(&initial_record);
    succeeds(custody.append(&initial));
    let initial_digest = journal_digest(&initial_record).expect("initial record must digest");
    let mut rewritten = initial_record;
    rewritten.candidate_digest =
        "sha256:5555555555555555555555555555555555555555555555555555555555555555".to_owned();
    let rewritten = frame(&rewritten);
    assert_eq!(rewritten.len(), initial.len());
    assert_ne!(
        journal_digest(&super::super::decode_record(&rewritten).expect("rewrite must decode"))
            .expect("rewrite must digest"),
        initial_digest
    );
    let revision = fixture.root().join(id('a')).join("00000000.json");
    custody.post_read_intervention = Some(Box::new(move || {
        fs::write(&revision, &rewritten).expect("post-read revision must rewrite");
    }));
    assert_error(custody.inspect(), "journal_custody.changed");
}

#[cfg(target_os = "linux")]
#[test]
fn custody_poisoned_failed_append_preserves_and_reopens_partial_state() {
    let fixture = Fixture::new("append-store-drift");
    let mut store = fixture.selected();
    let mut custody = succeeds(JournalCustody::open(&mut store));
    let database = fixture.database.clone();
    let retained = fixture.directory.join("retained-selected.sqlite");
    custody.post_revision_create_intervention = Some(Box::new(move || {
        fs::rename(&database, &retained).expect("selected database must move to retained fixture");
        write_private_file(&database, b"");
    }));
    let initial = frame(&pending(&id('a')));
    assert_error(custody.append(&initial), "journal_custody.changed");
    let partial = fixture.root().join(id('a')).join("00000000.json");
    assert_eq!(
        fs::metadata(&partial)
            .expect("created partial revision must remain")
            .len(),
        0
    );
    fs::remove_file(&fixture.database).expect("only fixture replacement database must remove");
    fs::rename(
        fixture.directory.join("retained-selected.sqlite"),
        &fixture.database,
    )
    .expect("retained selected database must restore");
    assert_error(custody.inspect(), "journal_custody.poisoned");
    drop(custody);
    drop(store);

    let mut reopened = fixture.selected();
    assert_error(
        JournalCustody::open(&mut reopened),
        "journal_custody.invalid_journal",
    );
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
#[test]
fn directory_stream_failure_keeps_other_descriptors_open() {
    let output = std::process::Command::new(
        std::env::current_exe().expect("test executable path must resolve"),
    )
    .args([
        "--ignored",
        "--exact",
        "headless_preparation::custody::tests::custody_directory_stream_child_helper",
        "--nocapture",
        "--test-threads=1",
    ])
    .env("LNSAT_CUSTODY_DIRECTORY_STREAM_CHILD", "1")
    .output()
    .expect("descriptor child must run");
    assert!(
        output.status.success(),
        "descriptor child failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        String::from_utf8_lossy(&output.stdout).contains("LNSAT_CUSTODY_DIRECTORY_STREAM_CHILD_OK"),
        "descriptor child did not return its stable marker"
    );
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
#[test]
#[ignore = "invoked explicitly by the descriptor custody regression"]
fn custody_directory_stream_child_helper() {
    assert_eq!(
        std::env::var("LNSAT_CUSTODY_DIRECTORY_STREAM_CHILD").as_deref(),
        Ok("1"),
        "descriptor child requires its explicit parent marker"
    );
    let fixture = Fixture::new("directory-stream");
    let retained = File::open(&fixture.directory).expect("retained directory must open");
    let rejected = OpenOptions::new()
        .read(true)
        .open(&fixture.database)
        .expect("regular descriptor must open");
    let owned: OwnedFd = rejected.into();
    let rejected_raw = owned.as_raw_fd();
    assert_error(directory_stream(owned), "journal_custody.io_rejected");
    assert!(nix_stat::fcntl::fcntl(rejected_raw, nix_stat::fcntl::FcntlArg::F_GETFD).is_err());
    assert!(fcntl(&retained, FcntlArg::F_GETFD).is_ok());

    let opened = File::open(&fixture.directory).expect("directory descriptor must open");
    let raw = opened.as_raw_fd();
    let directory = succeeds(directory_stream(opened.into()));
    assert!(fcntl(&directory, FcntlArg::F_GETFD).is_ok());
    drop(directory);
    assert!(nix_stat::fcntl::fcntl(raw, nix_stat::fcntl::FcntlArg::F_GETFD).is_err());
    println!("LNSAT_CUSTODY_DIRECTORY_STREAM_CHILD_OK");
}

#[cfg(target_os = "macos")]
#[test]
fn custody_denies_on_macos_without_creating_a_journal_root() {
    let fixture = Fixture::new("macos-denial");
    let mut store = fixture.selected();
    match JournalCustody::open(&mut store) {
        Err(error) => assert_eq!(error.code(), "journal_custody.io_rejected"),
        Ok(_) => panic!("macOS custody construction must deny"),
    }
    assert!(!fixture.root().exists());
}
