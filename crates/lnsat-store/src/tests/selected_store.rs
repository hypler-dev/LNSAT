use super::*;
use crate::selected_store::{checked_process_owner, open_inspection_with_hook, validate_metadata};
use std::os::unix::fs::{DirBuilderExt, PermissionsExt, symlink};
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
    for path in [
        PathBuf::from("store.sqlite"),
        fixture.directory.join("missing.sqlite"),
        alias,
        fixture.directory.join(".").join("store.sqlite"),
        parent_alias.join("store.sqlite"),
        fixture.directory.clone(),
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
    assert_eq!(fixture.database_bytes(), before);
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
fn selected_store_malformed_and_nonwal_headers_deny_before_lease_or_sqlite_open() {
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
        assert_eq!(fixture.database_bytes(), before);
        assert!(!fixture.lease_path().exists());
    }
}

#[test]
fn selected_store_pending_wal_schema_is_conservatively_denied_without_checkpoint() {
    let fixture = PrivateDatabase::new();
    create_version_sixteen_database(&fixture.path);
    let store = SqliteStore::open(&fixture.path).unwrap();
    assert_eq!(pragma_i64(&store.connection, "user_version"), Ok(17));
    let before = fixture.database_bytes();
    assert_eq!(
        open_error(&fixture.path),
        SelectedLocalStoreErrorV1::StoreUnverifiable
    );
    assert_eq!(fixture.database_bytes(), before);
    assert!(!fixture.lease_path().exists());
}
