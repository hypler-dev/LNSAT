#![forbid(unsafe_code)]

use lnsatd::product_config::{
    DAEMON_CONFIG_CONTRACT_ID_V1, DAEMON_CONFIG_VERSION_V1, MAX_DAEMON_CONFIG_BYTES_V1,
    load_daemon_config_v1,
};
use lnsatd::{DaemonCliActionV1, DaemonErrorV1, parse_daemon_args_v1};
use serde_json::{Value, json};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

const CONFIG_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase10-daemon-config-v1.json");

#[test]
fn exact_fixture_loads_all_existing_daemon_seams() {
    let directory = TestDirectory::new("fixture");
    let config_path = directory.write("daemon-config.json", CONFIG_FIXTURE);
    let loaded = load_daemon_config_v1(&config_path).expect("fixture config must load");
    let config = loaded.config();

    assert_eq!(
        config.database_path(),
        Path::new("/tmp/lnsat-phase10/configured.sqlite3")
    );
    assert_eq!(config.listen_address().to_string(), "127.0.0.1:7447");
    assert_eq!(
        config.disposable_git_root(),
        Some(Path::new("/tmp/lnsat-phase10/disposable-git"))
    );
    assert_eq!(config.git_executable(), Some(Path::new("/usr/bin/git")));
    assert_eq!(
        config.internal_console_root(),
        Some(Path::new("/tmp/lnsat-phase10/console"))
    );
    assert_eq!(config.internal_console_asset_manifest().len(), 2);
    assert_eq!(
        loaded.config_digest(),
        "sha256:168580b8c453dd6ce157eadd4367d4b0c8fd18c86b12c671f2d01e2ca8743919"
    );
    assert!(loaded.phase8_runtime_configured());
    assert!(loaded.console_manifest_configured());
    assert!(!String::from_utf8_lossy(CONFIG_FIXTURE).contains("secret"));
}

#[test]
fn explicit_config_and_legacy_direct_arguments_are_distinct_compatible_modes() {
    let directory = TestDirectory::new("cli-modes");
    let database = directory.path.join("direct.sqlite3");
    let config_path = directory.write_json("config.json", &minimal_config(&database));

    let configured = parse_daemon_args_v1([
        "lnsatd".into(),
        "--config".into(),
        config_path.as_os_str().to_owned(),
    ])
    .expect("explicit config must parse");
    let DaemonCliActionV1::Run(configured) = configured else {
        panic!("explicit config must produce run action");
    };
    assert_eq!(configured.database_path(), database);

    let direct = parse_daemon_args_v1([
        "lnsatd",
        "--database",
        "/tmp/direct.sqlite3",
        "--listen",
        "[::1]:7447",
        "--disposable-git-root",
        "/tmp/disposable",
        "--git-executable",
        "/usr/bin/git",
    ])
    .expect("legacy direct CLI must remain valid");
    let DaemonCliActionV1::Run(direct) = direct else {
        panic!("direct CLI must produce run action");
    };
    assert_eq!(direct.database_path(), Path::new("/tmp/direct.sqlite3"));
    assert_eq!(direct.listen_address().to_string(), "[::1]:7447");

    assert_eq!(
        parse_daemon_args_v1([
            "lnsatd".into(),
            "--config".into(),
            config_path.as_os_str().to_owned(),
            "--database".into(),
            "/tmp/mixed.sqlite3".into(),
        ]),
        Err(DaemonErrorV1::InvalidArguments)
    );
    assert_eq!(
        parse_daemon_args_v1(["lnsatd", "--config", "relative.json"]),
        Err(DaemonErrorV1::InvalidConfigPath)
    );
    assert!(matches!(
        parse_daemon_args_v1(["lnsatd", "--help"]),
        Ok(DaemonCliActionV1::Help)
    ));
    assert!(matches!(
        parse_daemon_args_v1(["lnsatd", "--version"]),
        Ok(DaemonCliActionV1::Version)
    ));
    assert!(matches!(
        parse_daemon_args_v1(["lnsatd", "--manifest"]),
        Ok(DaemonCliActionV1::Manifest)
    ));
}

#[test]
fn closed_contract_rejects_malformed_duplicate_unknown_and_wrong_identity() {
    let directory = TestDirectory::new("closed-contract");
    let database = directory.path.join("daemon.sqlite3");
    let database_json = serde_json::to_string(database.to_str().expect("UTF-8 test path"))
        .expect("path must encode");

    let cases = [
        ("malformed", "{".to_owned()),
        (
            "duplicate-root",
            format!(
                "{{\"contract_id\":\"{DAEMON_CONFIG_CONTRACT_ID_V1}\",\"contract_id\":\"{DAEMON_CONFIG_CONTRACT_ID_V1}\",\"contract_version\":\"{DAEMON_CONFIG_VERSION_V1}\",\"schema_version\":1,\"database_path\":{database_json}}}"
            ),
        ),
        (
            "duplicate-nested-manifest",
            format!(
                "{{\"contract_id\":\"{DAEMON_CONFIG_CONTRACT_ID_V1}\",\"contract_version\":\"{DAEMON_CONFIG_VERSION_V1}\",\"schema_version\":1,\"database_path\":{database_json},\"console\":{{\"root\":\"/tmp/console\",\"asset_manifest\":{{\"/\":\"index.html\",\"/\":\"other.html\"}}}}}}"
            ),
        ),
        (
            "unknown-secret",
            serde_json::to_string(&json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "secret": "must-not-be-accepted"
            }))
            .expect("case must encode"),
        ),
        (
            "wrong-contract",
            serde_json::to_string(&json!({
                "contract_id": "lnsat.daemon.config.v2",
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database
            }))
            .expect("case must encode"),
        ),
        (
            "wrong-version",
            serde_json::to_string(&json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": "lnsat.contracts.v0_1",
                "schema_version": 1,
                "database_path": database
            }))
            .expect("case must encode"),
        ),
        (
            "wrong-schema",
            serde_json::to_string(&json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 2,
                "database_path": database
            }))
            .expect("case must encode"),
        ),
        (
            "missing-database",
            serde_json::to_string(&json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1
            }))
            .expect("case must encode"),
        ),
    ];

    for (label, bytes) in cases {
        let path = directory.write(label, bytes.as_bytes());
        assert_eq!(
            load_daemon_config_v1(path),
            Err(DaemonErrorV1::InvalidConfigFile),
            "{label}"
        );
    }
}

#[test]
fn values_fail_closed_for_paths_listener_runtime_and_console_manifest() {
    let directory = TestDirectory::new("invalid-values");
    let database = directory.path.join("daemon.sqlite3");
    let cases = [
        (
            "relative-database",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": "relative.sqlite3"
            }),
        ),
        (
            "remote-listener",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "listen_address": "0.0.0.0:7447"
            }),
        ),
        (
            "port-zero",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "listen_address": "127.0.0.1:0"
            }),
        ),
        (
            "hostname-listener",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "listen_address": "localhost:7447"
            }),
        ),
        (
            "unpaired-runtime",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "phase8_runtime": { "disposable_git_root": "/tmp/disposable" }
            }),
        ),
        (
            "relative-runtime",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "phase8_runtime": {
                    "disposable_git_root": "relative",
                    "git_executable": "/usr/bin/git"
                }
            }),
        ),
        (
            "reserved-console-route",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "console": {
                    "root": "/tmp/console",
                    "asset_manifest": { "/v1/private": "index.html" }
                }
            }),
        ),
        (
            "traversing-console-asset",
            json!({
                "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
                "contract_version": DAEMON_CONFIG_VERSION_V1,
                "schema_version": 1,
                "database_path": database,
                "console": {
                    "root": "/tmp/console",
                    "asset_manifest": { "/": "../index.html" }
                }
            }),
        ),
    ];

    for (label, value) in cases {
        let path = directory.write_json(label, &value);
        assert!(load_daemon_config_v1(path).is_err(), "{label}");
    }
}

#[test]
fn file_boundary_rejects_missing_directory_symlink_non_utf8_and_oversize() {
    let directory = TestDirectory::new("file-boundary");
    assert_eq!(
        load_daemon_config_v1(directory.path.join("missing-private-name.json")),
        Err(DaemonErrorV1::InvalidConfigFile)
    );
    assert_eq!(
        load_daemon_config_v1(&directory.path),
        Err(DaemonErrorV1::InvalidConfigFile)
    );
    let non_utf8 = directory.write("non-utf8.json", &[0xff, 0xfe]);
    assert_eq!(
        load_daemon_config_v1(non_utf8),
        Err(DaemonErrorV1::InvalidConfigFile)
    );
    let oversized = directory.write(
        "oversized.json",
        &vec![b' '; MAX_DAEMON_CONFIG_BYTES_V1 + 1],
    );
    assert_eq!(
        load_daemon_config_v1(oversized),
        Err(DaemonErrorV1::ConfigFileTooLarge)
    );

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        let target = directory.write_json(
            "target.json",
            &minimal_config(&directory.path.join("daemon.sqlite3")),
        );
        let link = directory.path.join("linked-private-name.json");
        symlink(target, &link).expect("test symlink must create");
        assert_eq!(
            load_daemon_config_v1(link),
            Err(DaemonErrorV1::InvalidConfigFile)
        );
    }
}

#[test]
fn config_inspection_reports_digest_layers_without_paths_or_runtime_effects() {
    let directory = TestDirectory::new("inspection");
    let database = directory.path.join("private-database-name.sqlite3");
    let config_path = directory.write_json("private-config-name.json", &minimal_config(&database));

    let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "inspect", "--config"])
        .arg(&config_path)
        .output()
        .expect("config inspect must run");
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let stdout = String::from_utf8(output.stdout).expect("output must be UTF-8");
    assert!(!stdout.contains("private-config-name"));
    assert!(!stdout.contains("private-database-name"));
    let evidence: Value = serde_json::from_str(&stdout).expect("output must be JSON");
    assert_eq!(evidence["command"], "config.inspect");
    assert_eq!(
        evidence["configuration"]["contract_id"],
        DAEMON_CONFIG_CONTRACT_ID_V1
    );
    assert_eq!(
        evidence["configuration"]["applied_layers"],
        json!(["compiled_safe_defaults", "explicit_config_file"])
    );
    assert!(
        evidence["configuration"]["config_digest"]
            .as_str()
            .expect("digest")
            .starts_with("sha256:")
    );
    assert_eq!(evidence["runtime_started"], false);
    assert_eq!(evidence["storage_opened"], false);
    assert_eq!(evidence["listener_opened"], false);
    assert_eq!(evidence["side_effects"], json!([]));

    let doctor = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .arg("doctor")
        .output()
        .expect("doctor must run");
    let doctor: Value = serde_json::from_slice(&doctor.stdout).expect("doctor must be JSON");
    assert_eq!(
        doctor["configuration"]["applied_layers"],
        json!(["compiled_safe_defaults"])
    );
    assert!(doctor["configuration"]["explicit_config_digest"].is_null());
}

#[test]
fn rejected_paths_bytes_arguments_and_environment_are_never_reflected_or_discovered() {
    let directory = TestDirectory::new("non-reflection");
    let missing = directory.path.join("operator-private-config-name.json");
    let output = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
        .args(["--config"])
        .arg(&missing)
        .output()
        .expect("invalid config command must run");
    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty());
    let stderr = String::from_utf8(output.stderr).expect("diagnostic must be UTF-8");
    assert_eq!(stderr.trim(), "lnsatd.config.file_invalid");
    assert!(!stderr.contains("operator-private-config-name"));

    let rejected_bytes = directory.write(
        "rejected-private-bytes.json",
        br#"{"private-byte-marker":"must-not-reflect"}"#,
    );
    let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
        .args(["--config"])
        .arg(&rejected_bytes)
        .output()
        .expect("rejected config command must run");
    let stderr = String::from_utf8(rejected.stderr).expect("diagnostic must be UTF-8");
    assert_eq!(stderr.trim(), "lnsatd.config.file_invalid");
    assert!(!stderr.contains("private-byte-marker"));
    assert!(!stderr.contains("must-not-reflect"));

    let secret_argument = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
        .args(["--secret", "operator-secret-value"])
        .output()
        .expect("unknown secret argument must run");
    let stderr = String::from_utf8(secret_argument.stderr).expect("diagnostic must be UTF-8");
    assert_eq!(stderr.trim(), "lnsatd.arguments.invalid");
    assert!(!stderr.contains("operator-secret-value"));

    let valid = directory.write_json(
        "ambient-config-must-be-ignored.json",
        &minimal_config(&directory.path.join("ambient.sqlite3")),
    );
    let ambient = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
        .env("LNSAT_CONFIG", &valid)
        .env("LNSAT_DATABASE", "/tmp/ambient.sqlite3")
        .env("LNSAT_SECRET", "ambient-secret-value")
        .output()
        .expect("daemon without explicit arguments must exit");
    assert_eq!(ambient.status.code(), Some(2));
    let stderr = String::from_utf8(ambient.stderr).expect("diagnostic must be UTF-8");
    assert_eq!(stderr.trim(), "lnsatd.database.path_required");
    assert!(!stderr.contains("ambient-config-must-be-ignored"));
    assert!(!stderr.contains("ambient-secret-value"));
}

fn minimal_config(database_path: &Path) -> Value {
    json!({
        "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
        "contract_version": DAEMON_CONFIG_VERSION_V1,
        "schema_version": 1,
        "database_path": database_path,
        "listen_address": "127.0.0.1:7447",
        "phase8_runtime": null,
        "console": null
    })
}

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time must follow epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "lnsat-phase10-config-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir(&path).expect("test directory must create");
        Self { path }
    }

    fn write(&self, name: &str, bytes: &[u8]) -> PathBuf {
        let path = self.path.join(name);
        fs::write(&path, bytes).expect("test file must write");
        path
    }

    fn write_json(&self, name: &str, value: &Value) -> PathBuf {
        self.write(
            name,
            &serde_json::to_vec(value).expect("test JSON must encode"),
        )
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
