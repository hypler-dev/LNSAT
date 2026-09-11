#![forbid(unsafe_code)]

use lnsatd::product_config::{
    DAEMON_CONFIG_CONTRACT_ID_V1, DAEMON_CONFIG_VERSION_V1, MAX_DAEMON_CONFIG_BYTES_V1,
    compare_loaded_daemon_config_v1, daemon_config_schema_json_v1, load_daemon_config_v1,
};
use lnsatd::runtime_profile::{
    DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1, DOCKER_LOCAL_PROFILE_FAMILY_V1, DOCKER_LOCAL_PROFILE_ID_V1,
};
use lnsatd::{DaemonCliActionV1, DaemonErrorV1, parse_daemon_args_v1};
use serde_json::{Value, json};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

const CONFIG_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase10-daemon-config-v1.json");
const PROFILE_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/phase11-docker-local-profile-v1.json");
const DECLARATION_FIXTURE: &[u8] =
    include_bytes!("../../../fixtures/contracts/headless-config-declaration-v1.json");
const EXPECTED_PROFILE_DIGEST: &str =
    "sha256:eb27aa91cea967ed9686b949011e220bc0085e827c1d97b4a477f267dff548fc";
const EXPECTED_AUTHORITY_CONFIGURATION_DIGEST: &str =
    "sha256:e810f05c426b1a7c5987ff02baa3e74250841f5f57ce07f43206efec5ae87d24";

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
    assert!(loaded.phase8_runtime_configured());
    assert!(!loaded.control_socket_configured());
    assert!(loaded.console_manifest_configured());
    assert!(!loaded.docker_local_runtime_profile_configured());
    assert!(!String::from_utf8_lossy(CONFIG_FIXTURE).contains("secret"));
}

#[test]
fn explicit_docker_local_profile_loads_into_config_and_public_safe_readback() {
    let directory = TestDirectory::new("docker-local-profile");
    let profile_path = directory.write("private-runtime-profile.json", PROFILE_FIXTURE);
    let database = directory.path.join("private-database-name.sqlite3");
    let config = runtime_profile_config(&database, &profile_path);
    let config_path = directory.write_json("private-daemon-config.json", &config);

    let loaded = load_daemon_config_v1(&config_path).expect("profile configuration must load");
    assert!(loaded.phase8_runtime_configured());
    assert!(loaded.docker_local_runtime_profile_configured());
    let profile = loaded
        .docker_local_runtime_profile()
        .expect("validated profile must remain available to later packets");
    assert_eq!(
        profile.profile().contract_id,
        DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1
    );
    assert_eq!(profile.profile().profile_id, DOCKER_LOCAL_PROFILE_ID_V1);
    assert_eq!(
        profile.profile().profile_family,
        DOCKER_LOCAL_PROFILE_FAMILY_V1
    );
    assert_eq!(profile.profile_digest_text(), EXPECTED_PROFILE_DIGEST);
    assert_eq!(
        profile.authority_configuration_digest_text(),
        EXPECTED_AUTHORITY_CONFIGURATION_DIGEST
    );

    let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "inspect", "--config"])
        .arg(&config_path)
        .output()
        .expect("config inspect must run");
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let stdout = String::from_utf8(output.stdout).expect("output must be UTF-8");
    assert!(!stdout.contains("private-runtime-profile"));
    assert!(!stdout.contains("private-daemon-config"));
    assert!(!stdout.contains("private-database-name"));
    assert!(!stdout.contains("image_digest"));
    assert!(!stdout.contains("adapter_executable_digest"));
    let evidence: Value = serde_json::from_str(&stdout).expect("output must be JSON");
    assert_eq!(
        evidence["configuration"]["applied_layers"],
        json!([
            "compiled_safe_defaults",
            "explicit_config_file",
            "runtime_profile_file"
        ])
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["configured"],
        true
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["contract_id"],
        DOCKER_LOCAL_PROFILE_CONTRACT_ID_V1
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["profile_id"],
        DOCKER_LOCAL_PROFILE_ID_V1
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["profile_family"],
        DOCKER_LOCAL_PROFILE_FAMILY_V1
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["profile_digest"],
        EXPECTED_PROFILE_DIGEST
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["authority_configuration_digest"],
        EXPECTED_AUTHORITY_CONFIGURATION_DIGEST
    );
    assert_eq!(
        evidence["configuration"]["runtime_profile"]["source"],
        "explicit_absolute_file"
    );
    assert_eq!(evidence["runtime_profile_file_opened"], true);
    assert_eq!(evidence["runtime_started"], false);
    assert_eq!(evidence["storage_opened"], false);
    assert_eq!(evidence["listener_opened"], false);
    assert_eq!(evidence["side_effects"], json!([]));
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
    assert!(matches!(
        parse_daemon_args_v1([
            "lnsatd",
            "--manifest",
            "--product-surface-contract",
            "lnsat.product_surface.v2",
        ]),
        Ok(DaemonCliActionV1::ManifestV2)
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
fn runtime_profile_selection_fails_closed_without_runtime_or_path_disclosure() {
    let directory = TestDirectory::new("invalid-runtime-profile");
    let database = directory.path.join("daemon.sqlite3");
    let profile_path = directory.write("valid-profile.json", PROFILE_FIXTURE);

    let mut wrong_family = runtime_profile_config(&database, &profile_path);
    wrong_family["runtime_profile"]["profile_family"] = json!("secure_vm");
    let mut relative_path = runtime_profile_config(&database, &profile_path);
    relative_path["runtime_profile"]["profile_path"] = json!("relative-profile.json");
    let mut missing_profile = runtime_profile_config(&database, &profile_path);
    missing_profile["runtime_profile"]["profile_path"] =
        json!(directory.path.join("missing-private-profile.json"));
    let invalid_profile_path = directory.write("invalid-profile.json", b"{}");
    let invalid_profile = runtime_profile_config(&database, &invalid_profile_path);
    let mut unpaired_runtime = runtime_profile_config(&database, &profile_path);
    unpaired_runtime["phase8_runtime"] = Value::Null;
    let mut unknown_field = runtime_profile_config(&database, &profile_path);
    unknown_field["runtime_profile"]["secret"] = json!("must-not-be-accepted");

    for (label, value) in [
        ("wrong-family", wrong_family),
        ("relative-path", relative_path),
        ("missing-profile", missing_profile),
        ("invalid-profile", invalid_profile),
        ("unpaired-runtime", unpaired_runtime),
        ("unknown-field", unknown_field),
    ] {
        let path = directory.write_json(label, &value);
        assert!(load_daemon_config_v1(path).is_err(), "{label}");
    }

    let missing_config = runtime_profile_config(
        &database,
        &directory.path.join("operator-private-profile-name.json"),
    );
    let config_path = directory.write_json("missing-profile-config.json", &missing_config);
    let output = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
        .args(["--config"])
        .arg(&config_path)
        .output()
        .expect("invalid profile config command must run");
    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty());
    let stderr = String::from_utf8(output.stderr).expect("diagnostic must be UTF-8");
    assert_eq!(stderr.trim(), "lnsatd.config.file_invalid");
    assert!(!stderr.contains("operator-private-profile-name"));
}

#[test]
fn control_socket_paths_reject_relative_and_dot_components() {
    let directory = TestDirectory::new("invalid-control-socket");
    let database = directory.path.join("daemon.sqlite3");
    for (label, socket_path) in [
        ("relative-control-socket", "relative/control.sock"),
        ("dot-control-socket", "/tmp/lnsat/../control.sock"),
    ] {
        let mut value = minimal_config(&database);
        value["control_socket_path"] = json!(socket_path);
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
    assert_eq!(
        evidence["configuration"]["control_socket_configured"],
        false
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
#[allow(clippy::too_many_lines)] // Selector, parity, and renderer checks form one contract matrix.
fn v2_headless_configuration_diagnostics_are_loader_parity_and_selector_gated() {
    let directory = TestDirectory::new("v2-headless-diagnostics");
    let database = directory.path.join("private-v2-database.sqlite3");
    let config_path = directory.write_json("private-v2-config.json", &minimal_config(&database));

    let schema = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args([
            "config",
            "schema",
            "--product-surface-contract",
            "lnsat.product_surface.v2",
        ])
        .output()
        .expect("v2 schema command must run");
    assert!(schema.status.success());
    assert!(schema.stderr.is_empty());
    let schema_value: Value = serde_json::from_slice(&schema.stdout).expect("schema output JSON");
    assert_eq!(schema_value["ok"], true);
    assert_eq!(schema_value["schema"], "lnsat.cli.output.v1");
    assert_eq!(schema_value["command"], "config.schema");
    assert_eq!(
        schema_value["configuration_contract"],
        DAEMON_CONFIG_CONTRACT_ID_V1
    );
    assert_eq!(
        schema_value["validation_scope"],
        "explicit_daemon_configuration"
    );
    assert_eq!(schema_value["activation_authority"], false);
    assert_eq!(schema_value["side_effects"], json!([]));
    assert_eq!(
        schema_value["configuration_schema"],
        serde_json::from_str::<Value>(daemon_config_schema_json_v1())
            .expect("embedded schema must parse")
    );
    assert!(schema_value["configuration_schema"].get("$ref").is_none());

    for arguments in [
        vec!["config", "schema"],
        vec![
            "config",
            "schema",
            "--product-surface-contract",
            "lnsat.product_surface.v1",
        ],
        vec![
            "config",
            "schema",
            "--product-surface-contract",
            "lnsat.product_surface.v1,v2",
        ],
        vec![
            "config",
            "schema",
            "--product-surface-contract",
            "lnsat.product_surface.v2",
            "--product-surface-contract",
            "lnsat.product_surface.v2",
        ],
    ] {
        let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("rejected schema selector command must run");
        assert_eq!(rejected.status.code(), Some(2));
        assert!(rejected.stdout.is_empty());
        let error: Value =
            serde_json::from_slice(&rejected.stderr).expect("schema rejection must be JSON");
        assert_eq!(error["error"]["code"], "lnsatctl.arguments.invalid");
    }

    for format in ["text", "json", "jsonl", "yaml"] {
        let arguments = [
            "config",
            "schema",
            "--product-surface-contract",
            "lnsat.product_surface.v2",
            "--output",
            format,
        ];
        let first = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("formatted schema must run");
        let second = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("repeated formatted schema must run");
        assert!(first.status.success(), "{format}");
        assert!(first.stderr.is_empty(), "{format}");
        assert_eq!(first.stdout, second.stdout, "{format} must be byte-stable");
        assert!(first.stdout.ends_with(b"\n"), "{format}");
        assert!(!first.stdout.ends_with(b"\n\n"), "{format}");
    }

    let validation = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "validate", "--config"])
        .arg(&config_path)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("v2 validation command must run");
    assert!(validation.status.success());
    assert!(validation.stderr.is_empty());
    let validation_value: Value =
        serde_json::from_slice(&validation.stdout).expect("validation output JSON");
    assert_eq!(validation_value["command"], "config.validate");
    assert_eq!(
        validation_value["configuration_contract"],
        DAEMON_CONFIG_CONTRACT_ID_V1
    );
    assert_eq!(
        validation_value["validation_scope"],
        "explicit_daemon_configuration"
    );
    assert_eq!(validation_value["activation_authority"], false);
    assert_eq!(validation_value["side_effects"], json!([]));
    assert_eq!(
        validation_value["config_digest"],
        load_daemon_config_v1(&config_path).unwrap().config_digest()
    );
    let text = String::from_utf8(validation.stdout).expect("validation output UTF-8");
    assert!(!text.contains("private-v2-config"));
    assert!(!text.contains("private-v2-database"));

    for selector in [
        None,
        Some("lnsat.product_surface.v1"),
        Some("lnsat.product_surface.v9"),
    ] {
        let mut command = Command::new(env!("CARGO_BIN_EXE_lnsatctl"));
        command.args(["config", "validate", "--config"]);
        command.arg(&config_path);
        if let Some(selector) = selector {
            command.args(["--product-surface-contract", selector]);
        }
        let output = command
            .output()
            .expect("rejected selector command must run");
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
        let stderr = String::from_utf8(output.stderr).expect("public-safe stderr");
        assert_eq!(
            serde_json::from_str::<Value>(&stderr)
                .expect("rejected selector must use public-safe JSON")["error"]["code"],
            "lnsatctl.arguments.invalid"
        );
        assert!(!stderr.contains("private-v2-config"));
        assert!(!stderr.contains("private-v2-database"));
    }

    for format in ["text", "json", "jsonl", "yaml"] {
        let arguments = [
            "config",
            "validate",
            "--config",
            config_path.to_str().expect("test path UTF-8"),
            "--product-surface-contract",
            "lnsat.product_surface.v2",
            "--output",
            format,
        ];
        let first = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("formatted validation must run");
        let second = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("repeated formatted validation must run");
        assert!(first.status.success(), "{format}");
        assert_eq!(first.stdout, second.stdout, "{format} must be byte-stable");
        assert!(first.stdout.ends_with(b"\n"), "{format}");
        assert!(!first.stdout.ends_with(b"\n\n"), "{format}");
    }
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

#[test]
#[allow(clippy::too_many_lines)] // HCFG-2 command, redaction, and normalization matrix.
fn v2_config_show_and_diff_are_redacted_normalized_and_selector_gated() {
    let directory = TestDirectory::new("hcfg-show-diff");
    let baseline_database = directory.path.join("private-baseline-database.sqlite3");
    let candidate_database = directory.path.join("private-candidate-database.sqlite3");
    let baseline = directory.write_json(
        "private-baseline-config.json",
        &minimal_config(&baseline_database),
    );

    let mut default_normalized = minimal_config(&baseline_database);
    default_normalized
        .as_object_mut()
        .expect("configuration is an object")
        .remove("listen_address");
    let normalized = directory.write_json("private-normalized-config.json", &default_normalized);

    let default_diff = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "diff", "--config"])
        .arg(&baseline)
        .args(["--against"])
        .arg(&normalized)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("normalization diff must run");
    assert!(default_diff.status.success());
    assert!(default_diff.stderr.is_empty());
    let default_evidence: Value =
        serde_json::from_slice(&default_diff.stdout).expect("normalization diff must be JSON");
    assert_eq!(default_evidence["direction"]["baseline"], "--config");
    assert_eq!(default_evidence["direction"]["candidate"], "--against");
    assert_eq!(
        default_evidence["comparison"]["config_source_bytes_changed"],
        true
    );
    assert_eq!(
        default_evidence["comparison"]["changed_field_groups"],
        json!([])
    );
    assert_eq!(
        default_evidence["comparison"]["normalized_configuration_changed"],
        false
    );

    let candidate = directory.write_json(
        "private-candidate-config.json",
        &minimal_config(&candidate_database),
    );
    let changed_diff = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "diff", "--config"])
        .arg(&baseline)
        .args(["--against"])
        .arg(&candidate)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("changed diff must run");
    assert!(changed_diff.status.success());
    assert!(changed_diff.stderr.is_empty());
    let changed_evidence: Value =
        serde_json::from_slice(&changed_diff.stdout).expect("changed diff must be JSON");
    assert_eq!(changed_evidence["command"], "config.diff");
    assert_eq!(
        changed_evidence["comparison"]["changed_field_groups"],
        json!(["database_path"])
    );
    assert_eq!(
        changed_evidence["comparison"]["normalized_configuration_changed"],
        true
    );
    assert_eq!(changed_evidence["activation_authority"], false);
    assert_eq!(changed_evidence["effective_authority_computed"], false);
    assert_eq!(changed_evidence["runtime_started"], false);
    assert_eq!(changed_evidence["storage_opened"], false);
    assert_eq!(changed_evidence["listener_opened"], false);
    assert_eq!(changed_evidence["process_started"], false);
    assert_eq!(changed_evidence["side_effects"], json!([]));

    let show_baseline = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "show", "--config"])
        .arg(&baseline)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("baseline show must run");
    let show_candidate = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "show", "--config"])
        .arg(&candidate)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("candidate show must run");
    assert!(show_baseline.status.success());
    assert!(show_candidate.status.success());
    let show_baseline: Value = serde_json::from_slice(&show_baseline.stdout).expect("show JSON");
    let show_candidate: Value = serde_json::from_slice(&show_candidate.stdout).expect("show JSON");
    assert_eq!(show_baseline["command"], "config.show");
    assert_eq!(
        show_baseline["configuration"]["field_groups"],
        show_candidate["configuration"]["field_groups"]
    );
    assert_ne!(
        show_baseline["configuration"]["config_digest"],
        show_candidate["configuration"]["config_digest"]
    );
    for text in [
        String::from_utf8(default_diff.stdout).expect("output UTF-8"),
        String::from_utf8(changed_diff.stdout).expect("output UTF-8"),
        show_baseline.to_string(),
        show_candidate.to_string(),
    ] {
        for forbidden in [
            "private-baseline-config",
            "private-normalized-config",
            "private-candidate-config",
            "private-baseline-database",
            "private-candidate-database",
        ] {
            assert!(!text.contains(forbidden), "{forbidden} must stay redacted");
        }
    }

    for format in ["text", "json", "jsonl", "yaml"] {
        let arguments = [
            "config",
            "diff",
            "--config",
            baseline.to_str().expect("test path UTF-8"),
            "--against",
            candidate.to_str().expect("test path UTF-8"),
            "--product-surface-contract",
            "lnsat.product_surface.v2",
            "--output",
            format,
        ];
        let first = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("formatted diff must run");
        let second = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("repeated formatted diff must run");
        assert!(first.status.success(), "{format}");
        assert!(first.stderr.is_empty(), "{format}");
        assert_eq!(first.stdout, second.stdout, "{format} must be stable");
        assert!(first.stdout.ends_with(b"\n"), "{format}");
        assert!(!first.stdout.ends_with(b"\n\n"), "{format}");
    }

    for format in ["text", "json", "jsonl", "yaml"] {
        let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["config", "show", "--config"])
            .arg(&baseline)
            .args([
                "--product-surface-contract",
                "lnsat.product_surface.v2",
                "--output",
                format,
            ])
            .output()
            .expect("formatted show must run");
        assert!(output.status.success(), "{format}");
        assert!(output.stderr.is_empty(), "{format}");
        assert!(output.stdout.ends_with(b"\n"), "{format}");
        let text = String::from_utf8(output.stdout).expect("show output UTF-8");
        assert!(!text.contains("private-baseline-config"), "{format}");
        assert!(!text.contains("private-baseline-database"), "{format}");
    }
    assert!(!baseline_database.exists());
    assert!(!candidate_database.exists());
}

#[test]
fn v2_config_diff_compares_runtime_and_all_fixed_field_groups() {
    let directory = TestDirectory::new("hcfg-fixed-groups");
    let baseline_database = directory.path.join("baseline.sqlite3");
    let candidate_database = directory.path.join("candidate.sqlite3");

    let profile_path = directory.write("private-runtime-profile.json", PROFILE_FIXTURE);
    let profile_config = directory.write_json(
        "private-runtime-config.json",
        &runtime_profile_config(&baseline_database, &profile_path),
    );
    let profile_baseline = load_daemon_config_v1(&profile_config).expect("profile baseline loads");
    let mut changed_profile: Value =
        serde_json::from_slice(PROFILE_FIXTURE).expect("profile fixture parses");
    changed_profile["limits"]["cpu_millis"] = json!(999);
    fs::write(
        &profile_path,
        serde_json::to_vec(&changed_profile).expect("changed profile encodes"),
    )
    .expect("changed profile writes");
    let profile_candidate =
        load_daemon_config_v1(&profile_config).expect("profile candidate loads");
    let profile_comparison = compare_loaded_daemon_config_v1(&profile_baseline, &profile_candidate);
    assert!(!profile_comparison.config_source_bytes_changed());
    assert_eq!(
        profile_comparison.changed_field_groups(),
        ["runtime_profile"]
    );

    let baseline_path =
        directory.write_json("baseline-groups.json", &minimal_config(&baseline_database));
    let mut all_groups = minimal_config(&candidate_database);
    all_groups["listen_address"] = json!("127.0.0.1:7448");
    all_groups["phase8_runtime"] = json!({
        "disposable_git_root": "/tmp/lnsat-hcfg/disposable-git",
        "git_executable": "/usr/bin/git"
    });
    all_groups["runtime_profile"] = json!({
        "profile_family": DOCKER_LOCAL_PROFILE_FAMILY_V1,
        "profile_path": profile_path
    });
    all_groups["console"] = json!({
        "root": "/tmp/lnsat-hcfg/console",
        "asset_manifest": { "/": "index.html" }
    });
    let candidate_path = directory.write_json("candidate-groups.json", &all_groups);
    let baseline_groups = load_daemon_config_v1(baseline_path).expect("baseline groups load");
    let candidate_groups = load_daemon_config_v1(candidate_path).expect("candidate groups load");
    let all_group_comparison = compare_loaded_daemon_config_v1(&baseline_groups, &candidate_groups);
    assert!(all_group_comparison.config_source_bytes_changed());
    assert_eq!(
        all_group_comparison.changed_field_groups(),
        [
            "database_path",
            "listen_address",
            "phase8_runtime",
            "runtime_profile",
            "console"
        ]
    );
}

#[test]
fn v2_config_show_and_diff_redact_all_optional_canaries_in_every_format() {
    let directory = TestDirectory::new("hcfg-redaction-matrix");
    let baseline_database = directory.path.join("private-database-baseline.sqlite3");
    let candidate_database = directory.path.join("private-database-candidate.sqlite3");
    let baseline_profile = directory.write("private-profile-baseline.json", PROFILE_FIXTURE);
    let candidate_profile = directory.write("private-profile-candidate.json", PROFILE_FIXTURE);
    let baseline_git_root = directory.path.join("private-git-root-baseline");
    let candidate_git_root = directory.path.join("private-git-root-candidate");
    let baseline_git_executable = directory.path.join("private-git-baseline");
    let candidate_git_executable = directory.path.join("private-git-candidate");
    let baseline_console_root = directory.path.join("private-console-baseline");
    let candidate_console_root = directory.path.join("private-console-candidate");

    let mut baseline_value = minimal_config(&baseline_database);
    baseline_value["listen_address"] = json!("127.0.0.1:7447");
    baseline_value["phase8_runtime"] = json!({
        "disposable_git_root": baseline_git_root,
        "git_executable": baseline_git_executable
    });
    baseline_value["runtime_profile"] = json!({
        "profile_family": DOCKER_LOCAL_PROFILE_FAMILY_V1,
        "profile_path": baseline_profile
    });
    baseline_value["console"] = json!({
        "root": baseline_console_root,
        "asset_manifest": { "/private-asset-baseline.html": "index.html" }
    });
    let baseline = directory.write_json("private-config-baseline.json", &baseline_value);

    let mut candidate_value = minimal_config(&candidate_database);
    candidate_value["listen_address"] = json!("127.0.0.1:7448");
    candidate_value["phase8_runtime"] = json!({
        "disposable_git_root": candidate_git_root,
        "git_executable": candidate_git_executable
    });
    candidate_value["runtime_profile"] = json!({
        "profile_family": DOCKER_LOCAL_PROFILE_FAMILY_V1,
        "profile_path": candidate_profile
    });
    candidate_value["console"] = json!({
        "root": candidate_console_root,
        "asset_manifest": { "/private-asset-candidate.html": "index.html" }
    });
    let candidate = directory.write_json("private-config-candidate.json", &candidate_value);

    let canaries = [
        "private-config-baseline",
        "private-config-candidate",
        "private-database-baseline",
        "private-database-candidate",
        "127.0.0.1:7447",
        "127.0.0.1:7448",
        "private-git-root-baseline",
        "private-git-root-candidate",
        "private-git-baseline",
        "private-git-candidate",
        "private-profile-baseline",
        "private-profile-candidate",
        "runtime-profile:docker-local:git-reference",
        "private-console-baseline",
        "private-console-candidate",
        "/private-asset-baseline.html",
        "/private-asset-candidate.html",
    ];
    assert_full_config_cli_redaction(&baseline, &candidate, &canaries);
    for target in [
        baseline_database,
        candidate_database,
        baseline_git_root,
        candidate_git_root,
        baseline_git_executable,
        candidate_git_executable,
        baseline_console_root,
        candidate_console_root,
    ] {
        assert!(
            !target.exists(),
            "read-only command must not create {target:?}"
        );
    }
}

fn assert_full_config_cli_redaction(baseline: &Path, candidate: &Path, canaries: &[&str]) {
    for format in ["text", "json", "jsonl", "yaml"] {
        let show = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["config", "show", "--config"])
            .arg(baseline)
            .args([
                "--product-surface-contract",
                "lnsat.product_surface.v2",
                "--output",
                format,
            ])
            .output()
            .expect("full redaction show must run");
        let diff = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["config", "diff", "--config"])
            .arg(baseline)
            .args(["--against"])
            .arg(candidate)
            .args([
                "--product-surface-contract",
                "lnsat.product_surface.v2",
                "--output",
                format,
            ])
            .output()
            .expect("full redaction diff must run");
        for output in [show, diff] {
            assert!(
                output.status.success(),
                "{format}: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            assert!(output.stderr.is_empty(), "{format}");
            assert!(output.stdout.ends_with(b"\n"), "{format}");
            let text = String::from_utf8(output.stdout).expect("redacted output UTF-8");
            for &canary in canaries {
                assert!(
                    !text.contains(canary),
                    "{format}: {canary} must stay redacted"
                );
            }
        }
    }
}

#[test]
fn v2_config_show_and_diff_reject_invalid_arguments_without_stdout() {
    let directory = TestDirectory::new("hcfg-invalid");
    let database = directory.path.join("private-database.sqlite3");
    let baseline = directory.write_json("private-baseline.json", &minimal_config(&database));
    let candidate = directory.write_json("private-candidate.json", &minimal_config(&database));

    for arguments in [
        vec!["config", "show", "--config", baseline.to_str().unwrap()],
        vec![
            "config",
            "show",
            "--config",
            baseline.to_str().unwrap(),
            "--product-surface-contract",
            "lnsat.product_surface.v1",
        ],
        vec![
            "config",
            "diff",
            "--config",
            baseline.to_str().unwrap(),
            "--against",
            candidate.to_str().unwrap(),
        ],
        vec![
            "config",
            "diff",
            "--config",
            baseline.to_str().unwrap(),
            "--against",
            candidate.to_str().unwrap(),
            "--product-surface-contract",
            "lnsat.product_surface.v1",
        ],
    ] {
        let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("invalid HCFG command must run");
        assert_eq!(rejected.status.code(), Some(2));
        assert!(rejected.stdout.is_empty());
        let error: Value = serde_json::from_slice(&rejected.stderr).expect("error JSON");
        assert_eq!(error["error"]["code"], "lnsatctl.arguments.invalid");
    }

    let missing = directory.path.join("private-missing.json");
    let invalid_input = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "show", "--config"])
        .arg(&missing)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("invalid selected config must run");
    assert_eq!(invalid_input.status.code(), Some(2));
    assert!(invalid_input.stdout.is_empty());
    let stderr = String::from_utf8(invalid_input.stderr).expect("stderr UTF-8");
    assert!(!stderr.contains("private-missing"));
}

#[test]
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn v2_config_effective_and_export_are_deterministic_redacted_diagnostics() {
    let directory = TestDirectory::new("hcfg-declaration-diagnostics");
    let declaration = directory.write("private-declaration.json", DECLARATION_FIXTURE);

    let effective = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "effective", "--declaration"])
        .arg(&declaration)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("config effective must run");
    let export = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "export", "--declaration"])
        .arg(&declaration)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("config export must run");

    assert!(effective.status.success());
    assert!(export.status.success());
    assert!(effective.stderr.is_empty());
    assert!(export.stderr.is_empty());
    let effective_value: Value =
        serde_json::from_slice(&effective.stdout).expect("effective output must be JSON");
    let export_value: Value =
        serde_json::from_slice(&export.stdout).expect("export output must be JSON");
    assert_eq!(effective_value["command"], "config.effective");
    assert_eq!(
        effective_value["declaration_contract"],
        "lnsat.headless_config.declaration.v1"
    );
    assert_eq!(effective_value["declared_effective_ceiling_computed"], true);
    assert_eq!(effective_value["identity_verified"], false);
    assert_eq!(effective_value["enforcement_verified"], false);
    assert_eq!(effective_value["admission_authority_computed"], false);
    assert_eq!(effective_value["activation_authority"], false);
    assert_eq!(effective_value["grants_action_authority"], false);
    assert_eq!(effective_value["runtime_started"], false);
    assert_eq!(effective_value["storage_opened"], false);
    assert_eq!(effective_value["listener_opened"], false);
    assert_eq!(effective_value["process_started"], false);
    assert_eq!(effective_value["side_effects"], json!([]));

    assert_eq!(export_value["command"], "config.export");
    assert_eq!(
        export_value["export_contract"],
        "lnsat.headless_config.redacted_export.v1"
    );
    assert_eq!(export_value["applicable"], false);
    assert_eq!(export_value["reimportable"], false);
    assert_eq!(export_value["identity_verified"], false);
    assert_eq!(export_value["enforcement_verified"], false);
    assert_eq!(export_value["admission_authority_computed"], false);
    assert_eq!(export_value["activation_authority"], false);
    assert_eq!(export_value["grants_action_authority"], false);
    assert_eq!(export_value["runtime_started"], false);
    assert_eq!(export_value["storage_opened"], false);
    assert_eq!(export_value["listener_opened"], false);
    assert_eq!(export_value["process_started"], false);
    assert_eq!(export_value["side_effects"], json!([]));
    assert_eq!(
        effective_value["effective"]["declaration_digest"],
        export_value["export"]["declaration_digest"]
    );

    let exported_diagnostic = directory.write_json("redacted-export.json", &export_value["export"]);
    let reimport = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["config", "effective", "--declaration"])
        .arg(exported_diagnostic)
        .args(["--product-surface-contract", "lnsat.product_surface.v2"])
        .output()
        .expect("redacted export reimport attempt must run");
    assert_eq!(reimport.status.code(), Some(2));
    assert!(reimport.stdout.is_empty());

    assert_diagnostic_outputs_are_redacted([&effective.stdout, &export.stdout]);
    assert_diagnostic_formats_are_deterministic(&declaration);
}

fn assert_diagnostic_outputs_are_redacted(outputs: [&Vec<u8>; 2]) {
    for output in outputs {
        let text = String::from_utf8_lossy(output);
        for forbidden in [
            "private-declaration",
            "installation:example",
            "identity:alice",
            "resource:repo-a",
            "resource:repo-b",
            "layer:project",
            "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        ] {
            assert!(!text.contains(forbidden), "{forbidden} must stay redacted");
        }
    }
}

fn assert_diagnostic_formats_are_deterministic(declaration: &Path) {
    for command in ["effective", "export"] {
        for format in ["text", "json", "jsonl", "yaml"] {
            let arguments = [
                "config",
                command,
                "--declaration",
                declaration.to_str().expect("test path must be UTF-8"),
                "--product-surface-contract",
                "lnsat.product_surface.v2",
                "--output",
                format,
            ];
            let first = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
                .args(arguments)
                .output()
                .expect("formatted declaration diagnostic must run");
            let second = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
                .args(arguments)
                .output()
                .expect("repeated declaration diagnostic must run");
            assert!(first.status.success(), "{command} {format}");
            assert!(first.stderr.is_empty(), "{command} {format}");
            assert_eq!(first.stdout, second.stdout, "{command} {format}");
            assert!(first.stdout.ends_with(b"\n"), "{command} {format}");
            assert!(!first.stdout.ends_with(b"\n\n"), "{command} {format}");
        }
    }
}

#[test]
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn v2_config_effective_and_export_reject_unsupported_platforms() {
    let directory = TestDirectory::new("hcfg-declaration-unsupported-platform");
    let declaration = directory.write("private-declaration.json", DECLARATION_FIXTURE);

    for command in ["effective", "export"] {
        let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["config", command, "--declaration"])
            .arg(&declaration)
            .args(["--product-surface-contract", "lnsat.product_surface.v2"])
            .output()
            .expect("unsupported declaration command must run");
        assert_eq!(rejected.status.code(), Some(2));
        assert!(rejected.stdout.is_empty());
        let stderr = String::from_utf8(rejected.stderr).expect("failure output must be UTF-8");
        assert!(!stderr.contains("private-declaration"));
        let error: Value = serde_json::from_str(&stderr).expect("failure output must be JSON");
        assert_eq!(
            error["error"]["code"],
            "headless_config.platform_unsupported"
        );
    }
}

#[test]
fn v2_config_effective_and_export_fail_closed_without_reflection() {
    let directory = TestDirectory::new("hcfg-declaration-failures");
    let invalid = directory.write("private-invalid-declaration.json", b"{}");
    let oversized = directory.write("private-oversized-declaration.json", &vec![b' '; 65_537]);
    let missing = directory.path.join("private-missing-declaration.json");

    for (command, selected_path) in [
        ("effective", invalid.as_path()),
        ("export", invalid.as_path()),
        ("effective", oversized.as_path()),
        ("export", missing.as_path()),
    ] {
        let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["config", command, "--declaration"])
            .arg(selected_path)
            .args(["--product-surface-contract", "lnsat.product_surface.v2"])
            .output()
            .expect("invalid declaration command must run");
        assert_eq!(rejected.status.code(), Some(2));
        assert!(rejected.stdout.is_empty());
        let stderr = String::from_utf8(rejected.stderr).expect("failure output must be UTF-8");
        assert!(!stderr.contains("private-"));
        let error: Value = serde_json::from_str(&stderr).expect("failure output must be JSON");
        assert!(error["error"]["code"].as_str().is_some());
    }

    for arguments in [
        vec![
            "config",
            "effective",
            "--declaration",
            invalid.to_str().unwrap(),
        ],
        vec![
            "config",
            "export",
            "--declaration",
            invalid.to_str().unwrap(),
            "--product-surface-contract",
            "lnsat.product_surface.v1",
        ],
        vec![
            "config",
            "effective",
            "--config",
            invalid.to_str().unwrap(),
            "--product-surface-contract",
            "lnsat.product_surface.v2",
        ],
    ] {
        let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("invalid declaration arguments must run");
        assert_eq!(rejected.status.code(), Some(2));
        assert!(rejected.stdout.is_empty());
        let error: Value =
            serde_json::from_slice(&rejected.stderr).expect("argument failure must be JSON");
        assert_eq!(error["error"]["code"], "lnsatctl.arguments.invalid");
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;

        let target = directory.write("private-target-declaration.json", DECLARATION_FIXTURE);
        let link = directory.path.join("private-linked-declaration.json");
        symlink(target, &link).expect("test symlink must create");
        let rejected = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["config", "effective", "--declaration"])
            .arg(&link)
            .args(["--product-surface-contract", "lnsat.product_surface.v2"])
            .output()
            .expect("symlink declaration must be rejected");
        assert_eq!(rejected.status.code(), Some(2));
        assert!(rejected.stdout.is_empty());
        assert!(!String::from_utf8_lossy(&rejected.stderr).contains("private-"));
    }
}

fn minimal_config(database_path: &Path) -> Value {
    json!({
        "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
        "contract_version": DAEMON_CONFIG_VERSION_V1,
        "schema_version": 1,
        "database_path": database_path,
        "listen_address": "127.0.0.1:7447",
        "control_socket_path": null,
        "phase8_runtime": null,
        "runtime_profile": null,
        "console": null
    })
}

fn runtime_profile_config(database_path: &Path, profile_path: &Path) -> Value {
    let mut config = minimal_config(database_path);
    config["phase8_runtime"] = json!({
        "disposable_git_root": "/tmp/lnsat-phase11/disposable-git",
        "git_executable": "/usr/bin/git"
    });
    config["runtime_profile"] = json!({
        "profile_family": DOCKER_LOCAL_PROFILE_FAMILY_V1,
        "profile_path": profile_path
    });
    config
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
