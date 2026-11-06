use super::*;
use crate::selected_store::{
    checked_process_owner, open_inspection_with_hook,
    test_decode_native_main as decode_native_main, test_observe_native_main as observe_native_main,
    validate_metadata,
};
use std::os::unix::fs::{DirBuilderExt, OpenOptionsExt, PermissionsExt, symlink};
use std::sync::atomic::AtomicBool;

struct PrivateDatabase {
    directory: PathBuf,
    path: PathBuf,
}

impl PrivateDatabase {
    fn new() -> Self {
        let sequence = NEXT_TEST_DATABASE.fetch_add(1, Ordering::Relaxed);
        let directory = std::env::temp_dir().join(format!(
            "lnsat-selected-store-{}-{sequence}",
            std::process::id()
        ));
        fs::DirBuilder::new()
            .mode(0o700)
            .create(&directory)
            .expect("new private fixture directory must create");
        let directory = directory.canonicalize().expect("fixture must canonicalize");
        let path = directory.join("store.sqlite");
        Self { directory, path }
    }

    fn current() -> Self {
        let fixture = Self::new();
        drop(SqliteStore::open(&fixture.path).expect("current fixture must create"));
        fixture
    }

    fn version_seventeen() -> Self {
        let fixture = Self::new();
        create_version_seventeen_database(&fixture.path);
        fixture
    }

    fn lease_path(&self) -> PathBuf {
        local_database_lease_path_v1(&self.path).expect("fixture lease path must derive")
    }

    fn database_bytes(&self) -> [Option<String>; 3] {
        ["", "-wal", "-shm"].map(|suffix| {
            let path = PathBuf::from(format!("{}{suffix}", self.path.display()));
            match fs::read(path) {
                Ok(bytes) => Some(encode_sha256(Sha256::digest(&bytes))),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
                Err(error) => panic!("fixture snapshot failed: {error}"),
            }
        })
    }
}

impl Drop for PrivateDatabase {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.directory);
    }
}

fn open_error(path: &Path) -> SelectedLocalStoreErrorV1 {
    SqliteStore::open_selected_local_store_inspection_v1(path)
        .err()
        .expect("selection must deny")
}

#[test]
fn selected_store_reads_fresh_schema_without_owner_or_initialization_authority() {
    let fixture = PrivateDatabase::current();
    let original_database = fs::read(&fixture.path).expect("database bytes must read");
    let mut store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path)
        .expect("private current selection must open read-only");
    assert!(store.connection.is_readonly(rusqlite::MAIN_DB).unwrap());
    assert_eq!(pragma_i64(&store.connection, "user_version"), Ok(18));
    assert_eq!(store.verify_selected_local_store_custody_v1(), Ok(()));
    let inspection = store.inspect_headless_bootstrap_store_v1().unwrap();
    assert!(inspection.authority_empty());
    assert!(!inspection.initialization_available());
    assert!(!inspection.grants_action_authority());
    assert_eq!(
        store.bootstrap_local_owner_v1(&owner_bootstrap_input("correct horse battery staple")),
        Err(LocalIdentityStoreErrorV1::PersistenceFailed)
    );
    assert!(
        store
            .inspect_headless_bootstrap_store_v1()
            .unwrap()
            .authority_empty()
    );
    drop(store);
    assert_eq!(fs::read(&fixture.path).unwrap(), original_database);
}

#[test]
fn selected_store_reads_schema_seventeen_without_migration_or_authority() {
    let fixture = PrivateDatabase::version_seventeen();
    let before = fs::read(&fixture.path).expect("schema-17 database bytes must read");
    let mut store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path)
        .expect("private schema-17 selection must open read-only");
    assert!(store.connection.is_readonly(rusqlite::MAIN_DB).unwrap());
    assert_eq!(pragma_i64(&store.connection, "user_version"), Ok(17));
    assert_eq!(store.verify_selected_local_store_custody_v1(), Ok(()));
    let inspection = store.inspect_headless_bootstrap_store_v1().unwrap();
    assert!(inspection.authority_empty());
    assert!(!inspection.initialization_available());
    assert!(!inspection.grants_action_authority());
    drop(store);
    assert_eq!(
        fs::read(&fixture.path).expect("schema-17 database bytes must reread"),
        before
    );
}

#[test]
fn selected_store_future_schema_denies_without_migration() {
    let fixture = PrivateDatabase::current();
    let connection = Connection::open_with_flags(&fixture.path, OpenFlags::SQLITE_OPEN_READ_WRITE)
        .expect("current fixture must open for future-version fixture");
    connection
        .pragma_update(None, "user_version", 19)
        .expect("future fixture version must set");
    drop(connection);
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::StoreUnverifiable
    );
}

#[test]
fn selected_store_ordinary_open_stays_unbound_and_owner_api_unchanged() {
    let fixture = PrivateDatabase::current();
    let mut store = SqliteStore::open(&fixture.path).unwrap();
    assert_eq!(
        store.verify_selected_local_store_custody_v1(),
        Err(SelectedLocalStoreErrorV1::UnboundStore)
    );
    store
        .bootstrap_local_owner_v1(&owner_bootstrap_input("correct horse battery staple"))
        .expect("ordinary owner foundation must retain behavior");
}

#[test]
fn selected_store_lease_excludes_daemon_and_offline_recovery_in_both_directions() {
    let fixture = PrivateDatabase::current();
    let store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    assert!(matches!(
        acquire_local_daemon_database_lease_v1(&fixture.path),
        Err(LocalOwnerRecoveryErrorV1::DatabaseBusy)
    ));
    assert!(matches!(
        acquire_offline_owner_recovery_authority_v1(&fixture.path),
        Err(LocalOwnerRecoveryErrorV1::DatabaseBusy)
    ));
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    drop(store);
    let daemon = acquire_local_daemon_database_lease_v1(&fixture.path).unwrap();
    let before = fixture.database_bytes();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    assert_eq!(fixture.database_bytes(), before);
    drop(daemon);
    let recovery = acquire_offline_owner_recovery_authority_v1(&fixture.path).unwrap();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    drop(recovery);
    drop(SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap());
}

#[test]
fn selected_store_closes_sqlite_before_releasing_shared_lease() {
    let fixture = PrivateDatabase::current();
    let mut store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    store
        .connection
        .execute_batch("BEGIN DEFERRED; SELECT count(*) FROM main.sqlite_schema;")
        .expect("fixture must retain a read snapshot");
    let writer =
        Connection::open_with_flags(&fixture.path, OpenFlags::SQLITE_OPEN_READ_WRITE).unwrap();
    writer.busy_timeout(std::time::Duration::ZERO).unwrap();
    writer
        .execute_batch("CREATE TABLE checkpoint_lifetime_fixture (value INTEGER);")
        .unwrap();
    let checkpoint = |connection: &Connection| {
        connection.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
            row.get::<_, i64>(0)
        })
    };
    assert_eq!(
        checkpoint(&writer).unwrap(),
        1,
        "retained reader must block checkpoint"
    );
    let observed = Arc::new(AtomicBool::new(false));
    let observed_on_drop = Arc::clone(&observed);
    let path = fixture.path.clone();
    store.selected_store_custody.as_mut().unwrap().drop_observer = Some(Box::new(move || {
        assert_eq!(
            writer
                .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| row
                    .get::<_, i64>(0))
                .unwrap(),
            0,
            "SQLite read transaction must already be closed during custody drop"
        );
        assert!(matches!(
            acquire_local_daemon_database_lease_v1(&path),
            Err(LocalOwnerRecoveryErrorV1::DatabaseBusy)
        ));
        observed_on_drop.store(true, Ordering::SeqCst);
    }));
    drop(store);
    assert!(observed.load(Ordering::SeqCst));
    drop(acquire_local_daemon_database_lease_v1(&fixture.path).unwrap());
}

#[test]
fn selected_store_rejects_relative_missing_alias_and_nonregular_paths_before_open() {
    let fixture = PrivateDatabase::current();
    let before = fixture.database_bytes();
    let alias = fixture.directory.join("alias.sqlite");
    symlink(&fixture.path, &alias).unwrap();
    let parent_alias = fixture.directory.join("parent-alias");
    symlink(&fixture.directory, &parent_alias).unwrap();
    let directory_selection = fixture.directory.join("directory.sqlite");
    fs::DirBuilder::new()
        .mode(0o700)
        .create(&directory_selection)
        .unwrap();
    for path in [
        PathBuf::from("store.sqlite"),
        fixture.directory.join("missing.sqlite"),
        alias,
        fixture.directory.join(".").join("store.sqlite"),
        parent_alias.join("store.sqlite"),
        directory_selection,
    ] {
        assert_eq!(
            open_error(&path),
            SelectedLocalStoreErrorV1::InvalidSelection
        );
        assert_eq!(fixture.database_bytes(), before);
    }
    assert!(!fixture.lease_path().exists());
}

#[test]
fn selected_store_rejects_hardlinks_broad_modes_and_unsafe_existing_lease() {
    for variant in [
        "db-hardlink",
        "db-mode",
        "parent-mode",
        "lease-mode",
        "lease-symlink",
        "lease-hardlink",
    ] {
        let fixture = PrivateDatabase::current();
        match variant {
            "db-hardlink" => {
                fs::hard_link(&fixture.path, fixture.directory.join("copy.sqlite")).unwrap();
            }
            "db-mode" => {
                fs::set_permissions(&fixture.path, fs::Permissions::from_mode(0o640)).unwrap();
            }
            "parent-mode" => {
                fs::set_permissions(&fixture.directory, fs::Permissions::from_mode(0o750)).unwrap();
            }
            "lease-mode" => {
                fs::write(fixture.lease_path(), b"unchanged lease fixture").unwrap();
                fs::set_permissions(fixture.lease_path(), fs::Permissions::from_mode(0o640))
                    .unwrap();
            }
            "lease-symlink" => symlink(&fixture.path, fixture.lease_path()).unwrap(),
            "lease-hardlink" => {
                fs::write(fixture.lease_path(), b"unchanged lease fixture").unwrap();
                fs::set_permissions(fixture.lease_path(), fs::Permissions::from_mode(0o600))
                    .unwrap();
                fs::hard_link(fixture.lease_path(), fixture.directory.join("copy.lock")).unwrap();
            }
            _ => unreachable!(),
        }
        let before = fixture.database_bytes();
        assert_eq!(
            open_error(&fixture.path),
            SelectedLocalStoreErrorV1::InvalidSelection,
            "{variant}"
        );
        assert_eq!(fixture.database_bytes(), before, "{variant}");
    }
}

#[test]
fn selected_store_denies_old_schema_without_migration_or_journal_change() {
    let fixture = PrivateDatabase::new();
    create_version_sixteen_database(&fixture.path);
    let before = fixture.database_bytes();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::StoreUnverifiable
    );
    assert_eq!(fixture.database_bytes()[0], before[0]);
    let reader =
        Connection::open_with_flags(&fixture.path, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
    assert_eq!(pragma_i64(&reader, "user_version"), Ok(16));
}

#[test]
fn selected_store_removed_path_during_open_is_not_recreated() {
    let fixture = PrivateDatabase::current();
    let result =
        open_inspection_with_hook(&fixture.path, || fs::remove_file(&fixture.path).unwrap());
    assert_eq!(
        result.err(),
        Some(SelectedLocalStoreErrorV1::CustodyChanged)
    );
    assert_eq!(fixture.database_bytes(), [None, None, None]);
    assert!(!fixture.path.exists());
}

#[test]
fn selected_store_replacement_during_open_denies_without_mutating_replacement() {
    let fixture = PrivateDatabase::current();
    let replacement = PrivateDatabase::current();
    let original_replacement = replacement.database_bytes();
    let result = open_inspection_with_hook(&fixture.path, || {
        fs::rename(&replacement.path, &fixture.path).unwrap();
    });
    assert_eq!(
        result.err(),
        Some(SelectedLocalStoreErrorV1::CustodyChanged)
    );
    assert_eq!(fixture.database_bytes(), original_replacement);
}

#[test]
fn selected_store_revalidation_rejects_file_lease_and_parent_custody_drift() {
    for variant in [
        "db-replacement",
        "db-mode",
        "db-hardlink",
        "lease-replacement",
        "parent-mode",
        "parent-replacement",
    ] {
        let fixture = PrivateDatabase::current();
        let store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
        match variant {
            "db-replacement" => {
                let replacement = fixture.directory.join("replacement.sqlite");
                fs::copy(&fixture.path, &replacement).unwrap();
                fs::rename(replacement, &fixture.path).unwrap();
            }
            "db-mode" => {
                fs::set_permissions(&fixture.path, fs::Permissions::from_mode(0o640)).unwrap();
            }
            "db-hardlink" => {
                fs::hard_link(&fixture.path, fixture.directory.join("copy.sqlite")).unwrap();
            }
            "lease-replacement" => {
                let replacement = fixture.directory.join("replacement.lock");
                fs::write(&replacement, b"").unwrap();
                fs::set_permissions(&replacement, fs::Permissions::from_mode(0o600)).unwrap();
                fs::rename(replacement, fixture.lease_path()).unwrap();
            }
            "parent-mode" => {
                fs::set_permissions(&fixture.directory, fs::Permissions::from_mode(0o750)).unwrap();
            }
            "parent-replacement" => {
                let moved = fixture.directory.with_extension("saved");
                fs::rename(&fixture.directory, &moved).unwrap();
                fs::DirBuilder::new()
                    .mode(0o700)
                    .create(&fixture.directory)
                    .unwrap();
                assert_eq!(
                    store.verify_selected_local_store_custody_v1(),
                    Err(SelectedLocalStoreErrorV1::CustodyChanged)
                );
                drop(store);
                fs::remove_dir(&fixture.directory).unwrap();
                fs::rename(moved, &fixture.directory).unwrap();
                continue;
            }
            _ => unreachable!(),
        }
        assert_eq!(
            store.verify_selected_local_store_custody_v1(),
            Err(SelectedLocalStoreErrorV1::CustodyChanged),
            "{variant}"
        );
    }
}

#[test]
fn selected_store_private_parent_allows_subdirectories_and_process_owner_is_observed() {
    let fixture = PrivateDatabase::current();
    fs::create_dir(fixture.directory.join("child-directory")).unwrap();
    drop(SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap());
    let observed = nix::unistd::getuid().as_raw();
    assert_ne!(observed, 0);
    assert_eq!(checked_process_owner(observed, observed), Ok(observed));
    assert_eq!(
        validate_metadata(&fs::metadata(&fixture.path).unwrap(), observed + 1, false),
        Err(SelectedLocalStoreErrorV1::OwnerRejected)
    );
    for (real, effective) in [
        (0, 0),
        (0, observed),
        (observed, 0),
        (observed, observed + 1),
    ] {
        assert_eq!(
            checked_process_owner(real, effective),
            Err(SelectedLocalStoreErrorV1::OwnerRejected)
        );
    }
}

#[test]
fn selected_store_errors_expose_only_closed_static_codes() {
    for error in [
        SelectedLocalStoreErrorV1::UnsupportedPlatform,
        SelectedLocalStoreErrorV1::OwnerRejected,
        SelectedLocalStoreErrorV1::InvalidSelection,
        SelectedLocalStoreErrorV1::CustodyChanged,
        SelectedLocalStoreErrorV1::StoreUnverifiable,
        SelectedLocalStoreErrorV1::DatabaseBusy,
        SelectedLocalStoreErrorV1::UnboundStore,
    ] {
        assert!(error.code().starts_with("selected_local_store."));
        assert_eq!(error.to_string(), error.code());
        assert!(!error.to_string().contains('/'));
    }
}

#[test]
fn selected_store_malformed_and_nonwal_databases_deny_without_database_writes() {
    for malformed in [true, false] {
        let fixture = PrivateDatabase::current();
        let mut bytes = fs::read(&fixture.path).unwrap();
        if malformed {
            bytes[0] = 0;
        } else {
            bytes[18] = 1;
            bytes[19] = 1;
        }
        fs::write(&fixture.path, bytes).unwrap();
        let before = fixture.database_bytes();
        assert_eq!(
            open_error(&fixture.path),
            SelectedLocalStoreErrorV1::StoreUnverifiable
        );
        assert_eq!(fixture.database_bytes()[0], before[0]);
        assert!(fixture.lease_path().exists());
    }
}

#[test]
fn selected_store_current_schema_in_pending_wal_is_read_without_checkpoint() {
    let fixture = PrivateDatabase::new();
    create_version_sixteen_database(&fixture.path);
    let ordinary = SqliteStore::open(&fixture.path).unwrap();
    assert_eq!(
        pragma_i64(&ordinary.connection, "user_version"),
        Ok(SQLITE_SCHEMA_VERSION)
    );
    let before = fixture.database_bytes();
    let selected = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    assert_eq!(
        pragma_i64(&selected.connection, "user_version"),
        Ok(SQLITE_SCHEMA_VERSION)
    );
    assert_eq!(selected.verify_selected_local_store_custody_v1(), Ok(()));
    assert_eq!(fixture.database_bytes()[0], before[0]);
    assert_eq!(fixture.database_bytes()[1], before[1]);
}

// Only a child process can test the parent's process-wide POSIX locks. A WAL
// checkpoint assertion in the same process does not cover this failure mode.
#[test]
#[ignore = "invoked explicitly by the cross-process lock regression"]
fn selected_store_posix_lock_child() {
    use nix::fcntl::{FcntlArg, fcntl};
    use nix::libc;
    let path = std::env::var_os("LNSAT_SELECTED_LOCK_TEST_PATH").unwrap();
    let file = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(path)
        .unwrap();
    let lock = libc::flock {
        l_start: 0,
        l_len: 0,
        l_pid: 0,
        l_type: lock_short(libc::F_WRLCK),
        l_whence: lock_short(libc::SEEK_SET),
    };
    match fcntl(&file, FcntlArg::F_SETLK(&lock)) {
        Ok(_) => println!("POSIX_LOCK_ACQUIRED"),
        Err(nix::errno::Errno::EACCES | nix::errno::Errno::EAGAIN) => {
            println!("POSIX_LOCK_BLOCKED");
        }
        Err(error) => panic!("unexpected lock test failure: {error}"),
    }
}

fn lock_short(value: impl TryInto<i16>) -> i16 {
    value.try_into().ok().expect("lock constant must fit")
}

fn assert_external_lock(path: &Path, blocked: bool) {
    let output = std::process::Command::new(std::env::current_exe().unwrap())
        .args([
            "--ignored",
            "--exact",
            "tests::selected_store::selected_store_posix_lock_child",
            "--nocapture",
            "--test-threads=1",
        ])
        .env("LNSAT_SELECTED_LOCK_TEST_PATH", path)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "lock child failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(
        stdout.contains(if blocked {
            "POSIX_LOCK_BLOCKED"
        } else {
            "POSIX_LOCK_ACQUIRED"
        }),
        "unexpected child result: {stdout}"
    );
}

#[test]
fn selected_store_inplace_observation_denial_and_drop_preserve_other_sqlite_posix_locks() {
    let fixture = PrivateDatabase::current();
    let ordinary = SqliteStore::open(&fixture.path).unwrap();
    ordinary
        .connection
        .execute_batch("BEGIN DEFERRED; SELECT count(*) FROM main.sqlite_schema;")
        .unwrap();
    assert_external_lock(&fixture.path, true);
    let selected = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    assert_external_lock(&fixture.path, true);
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    assert_external_lock(&fixture.path, true);
    let prior = selected
        .connection
        .limit(rusqlite::limits::Limit::SQLITE_LIMIT_LENGTH)
        .unwrap();
    assert_eq!(
        observe_native_main(&selected.connection, 32),
        Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
    );
    assert_eq!(
        selected
            .connection
            .limit(rusqlite::limits::Limit::SQLITE_LIMIT_LENGTH)
            .unwrap(),
        prior
    );
    assert_external_lock(&fixture.path, true);
    for _ in 0..32 {
        assert_eq!(selected.verify_selected_local_store_custody_v1(), Ok(()));
    }
    assert_eq!(
        selected
            .connection
            .limit(rusqlite::limits::Limit::SQLITE_LIMIT_LENGTH)
            .unwrap(),
        prior
    );
    assert_external_lock(&fixture.path, true);
    drop(selected);
    assert_external_lock(&fixture.path, true);
    // A fresh post-open schema denial also must not clear the reader's lock.
    ordinary.connection.execute_batch("ROLLBACK; CREATE TABLE selected_denial_fixture(v); BEGIN DEFERRED; SELECT count(*) FROM main.sqlite_schema;").unwrap();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::StoreUnverifiable
    );
    assert_external_lock(&fixture.path, true);
    drop(ordinary);
    assert_external_lock(&fixture.path, false);
}

#[test]
fn selected_store_busy_denial_does_not_open_sqlite_or_create_coordination_files() {
    let fixture = PrivateDatabase::current();
    let daemon = acquire_local_daemon_database_lease_v1(&fixture.path).unwrap();
    let before = fixture.database_bytes();
    assert_eq!(before[1], None);
    assert_eq!(before[2], None);
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    assert_eq!(fixture.database_bytes(), before);
    drop(daemon);
}

#[test]
fn selected_store_native_origin_rejects_local_and_case_insensitive_overrides() {
    use rusqlite::functions::FunctionFlags;
    for (name, arity) in [
        ("sqlite_filestat", 1),
        ("SQLITE_SOURCE_ID", 0),
        ("sqlite_compileoption_used", 1),
    ] {
        let fixture = PrivateDatabase::current();
        let store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
        let forged = match name {
            "sqlite_filestat" => rusqlite::types::Value::Text(
                store
                    .connection
                    .query_row("SELECT sqlite_filestat('main')", [], |row| row.get(0))
                    .unwrap(),
            ),
            "SQLITE_SOURCE_ID" => rusqlite::types::Value::Text(
                store
                    .connection
                    .query_row("SELECT sqlite_source_id()", [], |row| row.get(0))
                    .unwrap(),
            ),
            _ => rusqlite::types::Value::Integer(0),
        };
        store
            .connection
            .create_scalar_function(name, arity, FunctionFlags::SQLITE_UTF8, move |_| {
                Ok(forged.clone())
            })
            .unwrap();
        assert_eq!(
            store.verify_selected_local_store_custody_v1(),
            Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
        );
        // Production never registers functions and does not rehabilitate a
        // tainted connection. A newly opened private connection is eligible.
        drop(store);
        let fresh = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
        assert_eq!(fresh.verify_selected_local_store_custody_v1(), Ok(()));
    }
}

#[test]
fn selected_store_native_decode_rejects_unknown_duplicate_null_and_out_of_range_values() {
    assert_eq!(decode_native_main(r#"{"db":{"h":7,"vfs":"unix"}}"#), Ok(7));
    for invalid in [
        "{}",
        r#"{"db":null}"#,
        r#"{"db":{"h":-1,"vfs":"unix"}}"#,
        r#"{"db":{"h":2147483648,"vfs":"unix"}}"#,
        r#"{"db":{"h":7,"vfs":"unix-none"}}"#,
        r#"{"db":{"h":7,"h":8,"vfs":"unix"}}"#,
        r#"{"db":{"h":"7","vfs":"unix"}}"#,
        r#"{"db":{"h":7,"vfs":"unix","unknown":1}}"#,
        r#"{"db":{"h":7,"vfs":"unix"},"unknown":1}"#,
    ] {
        assert_eq!(
            decode_native_main(invalid),
            Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
        );
    }
    assert_eq!(
        decode_native_main(&" ".repeat(4097)),
        Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
    );
    let memory = Connection::open_in_memory().unwrap();
    assert_eq!(
        observe_native_main(&memory, 4096),
        Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
    );
}

#[test]
fn selected_store_native_filestat_allocation_is_bounded_and_other_vfs_denies() {
    use rusqlite::{limits::Limit, types::Type};
    let fixture = PrivateDatabase::current();
    let store = SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    let prior = store
        .connection
        .set_limit(Limit::SQLITE_LIMIT_LENGTH, 32)
        .unwrap();
    let result =
        store
            .connection
            .query_row::<String, _, _>("SELECT sqlite_filestat('main')", [], |row| row.get(0));
    store
        .connection
        .set_limit(Limit::SQLITE_LIMIT_LENGTH, prior)
        .unwrap();
    assert!(matches!(
        result,
        Err(rusqlite::Error::InvalidColumnType(0, _, Type::Null))
    ));
    assert_eq!(store.verify_selected_local_store_custody_v1(), Ok(()));
    drop(store);
    let other = Connection::open_with_flags_and_vfs(
        &fixture.path,
        OpenFlags::SQLITE_OPEN_READ_ONLY,
        "unix-none",
    )
    .unwrap();
    assert_eq!(
        observe_native_main(&other, 4096),
        Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
    );
}

#[test]
fn selected_write_fixture_holds_lease_and_commits_or_rolls_back_owner() {
    use crate::owner_bootstrap::{
        insert_local_owner_bootstrap_v1, prepare_local_owner_bootstrap_v1,
    };
    use crate::selected_store::writable_fixture::SelectedWriteFixture;

    let fixture = PrivateDatabase::current();
    let prepared =
        prepare_local_owner_bootstrap_v1(&owner_bootstrap_input("fixture-owner-password")).unwrap();
    let writer = SelectedWriteFixture::open(&fixture.path).unwrap();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    let failure = writer.transaction(|tx| {
        insert_local_owner_bootstrap_v1(tx, &prepared).unwrap();
        Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
    });
    assert_eq!(failure, Err(SelectedLocalStoreErrorV1::StoreUnverifiable));
    let mut inspected =
        SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    assert!(inspected.inspect_headless_bootstrap_store_v1().is_ok());
    drop(inspected);

    SelectedWriteFixture::open(&fixture.path)
        .unwrap()
        .transaction(|tx| {
            insert_local_owner_bootstrap_v1(tx, &prepared).unwrap();
            Ok(())
        })
        .unwrap();
    let mut inspected =
        SqliteStore::open_selected_local_store_inspection_v1(&fixture.path).unwrap();
    assert_eq!(
        inspected.inspect_headless_bootstrap_store_v1(),
        Err(HeadlessBootstrapStoreErrorV1::NotAuthorityEmpty)
    );
}

#[test]
fn selected_write_fixture_rejects_coordination_alias_before_open() {
    use crate::selected_store::writable_fixture::SelectedWriteFixture;

    let fixture = PrivateDatabase::current();
    let wal = fixture.directory.join("store.sqlite-wal");
    symlink(&fixture.path, &wal).unwrap();
    assert_eq!(
        SelectedWriteFixture::open(&fixture.path).err(),
        Some(SelectedLocalStoreErrorV1::InvalidSelection)
    );
    assert!(fs::symlink_metadata(&wal).unwrap().is_symlink());
}

#[test]
fn selected_write_fixture_rejects_replaced_wal_before_commit() {
    use crate::selected_store::writable_fixture::SelectedWriteFixture;

    let fixture = PrivateDatabase::current();
    let wal = fixture.directory.join("store.sqlite-wal");
    let original = fixture.directory.join("original-wal");
    let writer = SelectedWriteFixture::open(&fixture.path).unwrap();
    let error = writer.transaction(|_| {
        fs::rename(&wal, &original).unwrap();
        fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&wal)
            .unwrap();
        Ok(())
    });
    assert_eq!(error, Err(SelectedLocalStoreErrorV1::CustodyChanged));
    assert!(original.is_file());
}

#[cfg(target_os = "linux")]
#[test]
fn selected_linux_production_migration_is_inert_and_preserves_shared_lease() {
    use crate::selected_store::writable::SelectedWritableStore;
    let _serial = LINUX_PRODUCTION_TEST_MUTEX.lock().unwrap();
    let fixture = PrivateDatabase::current();
    let session = SelectedWritableStore::open(&fixture.path).unwrap();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    let session = session.migrate_to_inert().unwrap();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    session.close().unwrap();
    for suffix in ["-wal", "-shm"] {
        assert!(
            !fixture
                .directory
                .join(format!("store.sqlite{suffix}"))
                .exists()
        );
    }
    SelectedWritableStore::open(&fixture.path)
        .unwrap()
        .close()
        .unwrap();

    let connection =
        Connection::open_with_flags(&fixture.path, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
    crate::selected_schema::verify(&connection).unwrap();
    crate::selected_schema::require_empty(&connection).unwrap();
    assert!(SqliteStore::open(&fixture.path).is_err());
}

#[cfg(target_os = "linux")]
#[test]
fn selected_linux_production_denies_masked_named_acl_without_chmod_or_migration() {
    use crate::selected_store::writable::SelectedWritableStore;
    let _serial = LINUX_PRODUCTION_TEST_MUTEX.lock().unwrap();
    let fixture = PrivateDatabase::current();
    let mut acl = 2_u32.to_le_bytes().to_vec();
    let uid = nix::unistd::getuid().as_raw().checked_add(1).unwrap();
    for (tag, permissions, id) in [
        (1_u16, 6_u16, u32::MAX),
        (2, 4, uid),
        (4, 0, u32::MAX),
        (16, 0, u32::MAX),
        (32, 0, u32::MAX),
    ] {
        acl.extend(tag.to_le_bytes());
        acl.extend(permissions.to_le_bytes());
        acl.extend(id.to_le_bytes());
    }
    rustix::fs::lsetxattr(
        &fixture.path,
        c"system.posix_acl_access",
        &acl,
        rustix::fs::XattrFlags::empty(),
    )
    .unwrap();
    assert_eq!(
        fs::symlink_metadata(&fixture.path)
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o600
    );
    assert!(SelectedWritableStore::open(&fixture.path).is_err());
    let connection =
        Connection::open_with_flags(&fixture.path, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
    assert_eq!(pragma_i64(&connection, "user_version"), Ok(18));
}

#[cfg(target_os = "linux")]
#[test]
fn selected_linux_ancestor_acl_write_mask_is_reflected_and_denied() {
    use crate::selected_store::writable::SelectedWritableStore;
    let _serial = LINUX_PRODUCTION_TEST_MUTEX.lock().unwrap();
    let fixture = PrivateDatabase::new();
    let ancestor = fixture.directory.join("ancestor");
    let parent = ancestor.join("private");
    fs::DirBuilder::new().mode(0o755).create(&ancestor).unwrap();
    fs::DirBuilder::new().mode(0o700).create(&parent).unwrap();
    let path = parent.join("store.sqlite");
    drop(SqliteStore::open(&path).unwrap());
    let uid = nix::unistd::getuid().as_raw().checked_add(1).unwrap();
    let mut acl = 2_u32.to_le_bytes().to_vec();
    for (tag, permissions, id) in [
        (1_u16, 7_u16, u32::MAX),
        (2, 7, uid),
        (4, 5, u32::MAX),
        (16, 7, u32::MAX),
        (32, 5, u32::MAX),
    ] {
        acl.extend(tag.to_le_bytes());
        acl.extend(permissions.to_le_bytes());
        acl.extend(id.to_le_bytes());
    }
    rustix::fs::lsetxattr(
        &ancestor,
        c"system.posix_acl_access",
        &acl,
        rustix::fs::XattrFlags::empty(),
    )
    .unwrap();
    assert_eq!(fs::metadata(&ancestor).unwrap().mode() & 0o777, 0o775);
    assert!(SelectedWritableStore::open(&path).is_err());
    let connection = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
    assert_eq!(pragma_i64(&connection, "user_version"), Ok(18));
}

#[cfg(target_os = "linux")]
static LINUX_PRODUCTION_TEST_MUTEX: std::sync::Mutex<()> = std::sync::Mutex::new(());

#[cfg(target_os = "linux")]
#[test]
fn selected_linux_close_quarantine_preserves_lease_and_replaced_evidence() {
    let _serial = LINUX_PRODUCTION_TEST_MUTEX.lock().unwrap();
    for mode in [
        "busy",
        "wal-replace",
        "post-close",
        "journal-replace",
        "journal-acl-access",
        "journal-acl-default",
        "journal-close-uninspected",
        "journal-close-error",
    ] {
        let mut child = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--ignored",
                "--exact",
                "tests::selected_store::selected_linux_close_failure_child",
            ])
            .env("LNSAT_SELECTED_CLOSE_TEST_MODE", mode)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::inherit())
            .spawn()
            .unwrap();
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(20);
        loop {
            if let Some(status) = child.try_wait().unwrap() {
                assert!(status.success(), "close quarantine child failed for {mode}");
                break;
            }
            if std::time::Instant::now() >= deadline {
                child.kill().unwrap();
                let _ = child.wait();
                panic!("close quarantine child timed out");
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
    }
}

#[cfg(target_os = "linux")]
#[test]
#[ignore = "invoked explicitly in a disposable process by close quarantine test"]
fn selected_linux_close_failure_child() {
    use crate::selected_store::writable::SelectedWritableStore;
    let fixture = PrivateDatabase::current();
    let session = SelectedWritableStore::open(&fixture.path).unwrap();
    match std::env::var("LNSAT_SELECTED_CLOSE_TEST_MODE")
        .unwrap()
        .as_str()
    {
        "busy" => {
            session.leave_busy_statement_for_close_test();
            assert_eq!(
                session.close(),
                Err(SelectedLocalStoreErrorV1::StoreUnverifiable)
            );
        }
        "wal-replace" => {
            let session = session.migrate_to_inert().unwrap();
            let wal = fixture.directory.join("store.sqlite-wal");
            let retained = fixture.directory.join("retained-wal");
            fs::rename(&wal, &retained).unwrap();
            fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .mode(0o600)
                .open(&wal)
                .unwrap();
            assert_eq!(
                session.close(),
                Err(SelectedLocalStoreErrorV1::CustodyChanged)
            );
            assert!(wal.is_file());
            assert!(retained.is_file());
        }
        "post-close" => {
            let mut session = session;
            let wal = fixture.directory.join("store.sqlite-wal");
            let inserted = wal.clone();
            session.after_close_for_test(move || {
                fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .mode(0o600)
                    .open(&inserted)
                    .unwrap();
            });
            assert_eq!(
                session.close(),
                Err(SelectedLocalStoreErrorV1::CustodyChanged)
            );
            assert!(wal.is_file());
            assert!(SqliteStore::open(&fixture.path).is_err());
        }
        "journal-replace" | "journal-close-uninspected" => {
            selected_journal_replacement_close(session, &fixture);
        }
        "journal-close-error" => {
            let mut session = session.migrate_to_inert().unwrap();
            session.open_preparation_journal().unwrap();
            let frame = selected_pending_assertion();
            session.persist_preparation_assertion(&frame).unwrap();
            let attempts = session.inject_uncertain_journal_close_for_test();
            assert_eq!(
                session.close(),
                Err(SelectedLocalStoreErrorV1::CustodyChanged)
            );
            assert_eq!(attempts.load(Ordering::SeqCst), 1);
            // SQLite already closed normally; uncertainty cannot release the
            // selected store owners or trigger another journal close attempt.
            for suffix in ["-wal", "-shm"] {
                assert!(
                    !fixture
                        .directory
                        .join(format!("store.sqlite{suffix}"))
                        .exists()
                );
            }
            let revision = fixture
                .directory
                .join("store.sqlite.lnsat-preparations")
                .join("a".repeat(64))
                .join("00000000.json");
            assert_eq!(fs::read(revision).unwrap(), frame);
            assert!(SqliteStore::open(&fixture.path).is_err());
            assert_eq!(attempts.load(Ordering::SeqCst), 1);
        }
        "journal-acl-access" | "journal-acl-default" => {
            selected_journal_acl_close(session, &fixture);
        }
        _ => panic!("unknown exact close test mode"),
    }
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
}

/// Inert syntax fixture only. This frame cannot establish preparation facts.
#[cfg(target_os = "linux")]
fn selected_pending_assertion() -> Vec<u8> {
    let id = "a".repeat(64);
    let digest = format!("sha256:{}", "b".repeat(64));
    format!(
        concat!(
            "{{\"schema_id\":\"lnsat.hcfg_preparation_journal.v1\",",
            "\"contract_version\":\"lnsat.contracts.v1_0\",\"preparation_id\":\"{id}\",",
            "\"candidate_digest\":\"{digest}\",\"store_digest\":\"{digest}\",",
            "\"recipe_digest\":\"{digest}\",\"owner_uid\":{uid},",
            "\"challenge_digest\":\"{digest}\",\"phase\":\"pending\",",
            "\"container_name\":\"lnsat-hcfg6-probe-{id}\",\"container_id\":null,",
            "\"previous_digest\":null,\"revision\":0}}\n"
        ),
        id = id,
        digest = digest,
        uid = nix::unistd::getuid().as_raw(),
    )
    .into_bytes()
}

#[cfg(target_os = "linux")]
#[test]
fn selected_linux_journal_persists_only_inert_assertion_under_selected_lease() {
    use crate::selected_store::writable::SelectedWritableStore;
    let _serial = LINUX_PRODUCTION_TEST_MUTEX.lock().unwrap();
    let fixture = PrivateDatabase::current();
    let mut session = SelectedWritableStore::open(&fixture.path)
        .unwrap()
        .migrate_to_inert()
        .unwrap();
    session.open_preparation_journal().unwrap();
    session.inspect_preparation_journal().unwrap();
    let frame = selected_pending_assertion();
    session.persist_preparation_assertion(&frame).unwrap();
    session.inspect_preparation_journal().unwrap();
    let revision = fixture
        .directory
        .join("store.sqlite.lnsat-preparations")
        .join("a".repeat(64))
        .join("00000000.json");
    assert_eq!(fs::read(&revision).unwrap(), frame);
    assert_eq!(fs::metadata(&revision).unwrap().mode() & 0o777, 0o600);
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::DatabaseBusy
    );
    session.close().unwrap();
    // Durable journal claims do not create an owner, root or active generation.
    let connection =
        Connection::open_with_flags(&fixture.path, OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
    crate::selected_schema::verify(&connection).unwrap();
    crate::selected_schema::require_empty(&connection).unwrap();
    drop(connection);
    let mut reopened = SelectedWritableStore::open(&fixture.path).unwrap();
    reopened.open_preparation_journal().unwrap();
    reopened.inspect_preparation_journal().unwrap();
    reopened.close().unwrap();
    assert_eq!(fs::read(&revision).unwrap(), frame);
}

#[cfg(target_os = "linux")]
fn selected_journal_replacement_close(
    session: crate::selected_store::writable::SelectedWritableStore,
    fixture: &PrivateDatabase,
) {
    let mut session = session.migrate_to_inert().unwrap();
    session.open_preparation_journal().unwrap();
    let frame = selected_pending_assertion();
    session.persist_preparation_assertion(&frame).unwrap();
    let root = fixture.directory.join("store.sqlite.lnsat-preparations");
    let retained = fixture.directory.join("retained-journal");
    fs::rename(&root, &retained).unwrap();
    fs::DirBuilder::new().mode(0o700).create(&root).unwrap();
    if std::env::var("LNSAT_SELECTED_CLOSE_TEST_MODE").unwrap() == "journal-replace" {
        assert!(session.inspect_preparation_journal().is_err());
        // Returning the same name cannot heal this session's failure.
        fs::remove_dir(&root).unwrap();
        fs::rename(&retained, &root).unwrap();
        assert!(session.inspect_preparation_journal().is_err());
    }
    assert_eq!(
        session.close(),
        Err(SelectedLocalStoreErrorV1::CustodyChanged)
    );
    let evidence_root = if retained.exists() { retained } else { root };
    assert_eq!(
        fs::read(evidence_root.join("a".repeat(64)).join("00000000.json")).unwrap(),
        frame
    );
}

#[cfg(target_os = "linux")]
fn selected_journal_acl_close(
    session: crate::selected_store::writable::SelectedWritableStore,
    fixture: &PrivateDatabase,
) {
    let mut session = session.migrate_to_inert().unwrap();
    session.open_preparation_journal().unwrap();
    let root = fixture.directory.join("store.sqlite.lnsat-preparations");
    let default = std::env::var("LNSAT_SELECTED_CLOSE_TEST_MODE").unwrap() == "journal-acl-default";
    let key = if default {
        c"system.posix_acl_default"
    } else {
        c"system.posix_acl_access"
    };
    let mut acl = 2_u32.to_le_bytes().to_vec();
    for (tag, permissions, id) in [
        (1_u16, 7_u16, u32::MAX),
        (2, 4, nix::unistd::getuid().as_raw().checked_add(1).unwrap()),
        (4, 0, u32::MAX),
        (16, 0, u32::MAX),
        (32, 0, u32::MAX),
    ] {
        acl.extend(tag.to_le_bytes());
        acl.extend(permissions.to_le_bytes());
        acl.extend(id.to_le_bytes());
    }
    rustix::fs::lsetxattr(&root, key, &acl, rustix::fs::XattrFlags::empty()).unwrap();
    assert_eq!(fs::metadata(&root).unwrap().mode() & 0o777, 0o700);
    assert!(session.inspect_preparation_journal().is_err());
    rustix::fs::lremovexattr(&root, key).unwrap();
    assert!(session.inspect_preparation_journal().is_err());
    assert_eq!(
        session.close(),
        Err(SelectedLocalStoreErrorV1::CustodyChanged)
    );
    assert!(root.is_dir());
}
