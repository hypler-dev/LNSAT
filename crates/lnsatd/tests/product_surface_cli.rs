#![forbid(unsafe_code)]

use lnsat_store::SqliteStore;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn three_product_commands_expose_same_source_manifest() {
    let daemon = Command::new(env!("CARGO_BIN_EXE_lnsatd"))
        .arg("--manifest")
        .output()
        .expect("lnsatd manifest command must run");
    let operator = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .arg("manifest")
        .output()
        .expect("lnsatctl manifest command must run");

    assert!(daemon.status.success());
    assert!(operator.status.success());
    assert_eq!(daemon.stdout, operator.stdout);
    let manifest: Value = serde_json::from_slice(&daemon.stdout).expect("manifest must be JSON");
    assert_eq!(manifest["contract_id"], "lnsat.product_surface.v1");
    assert_eq!(manifest["supported_release"], false);
    assert_eq!(manifest["service_manager"]["automatic_start"], false);
}

#[test]
fn operator_doctor_is_machine_readable_and_side_effect_free() {
    let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .arg("doctor")
        .output()
        .expect("lnsatctl doctor must run");
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let result: Value = serde_json::from_slice(&output.stdout).expect("doctor output must be JSON");
    assert_eq!(result["schema"], "lnsat.cli.output.v1");
    assert_eq!(result["configuration"]["ambient_environment_used"], false);
    assert_eq!(result["service_manager"]["install_available"], false);
    assert_eq!(result["side_effects"], serde_json::json!([]));
}

#[test]
fn operator_recovery_inspection_is_read_only_and_does_not_reflect_path() {
    let directory = TestDirectory::new("recovery-inspect");
    let database = directory.path.join("private-operator-name.sqlite3");
    SqliteStore::open(&database).expect("test database must open");

    let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["recovery", "inspect", "--database"])
        .arg(&database)
        .output()
        .expect("lnsatctl recovery inspect must run");
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let stdout = String::from_utf8(output.stdout).expect("inspection output must be UTF-8");
    assert!(!stdout.contains("private-operator-name"));
    let result: Value = serde_json::from_str(&stdout).expect("inspection output must be JSON");
    assert_eq!(result["disposition"], "ready");
    assert_eq!(result["inspection_mode"], "read_only");
    assert_eq!(result["automatic_action"], "none");
    assert_eq!(result["recovery_mutation_authority"], false);
    assert_eq!(result["activation_authority"], false);
    assert_eq!(result["side_effects"], serde_json::json!([]));
}

#[test]
fn operator_invalid_arguments_use_stable_usage_family() {
    let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["service", "start"])
        .output()
        .expect("lnsatctl invalid command must run");
    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty());
    let result: Value = serde_json::from_slice(&output.stderr).expect("error must be JSON");
    assert_eq!(result["error"]["code"], "lnsatctl.arguments.invalid");
    assert_eq!(result["exit_code_family"], "usage_or_configuration");
    assert_eq!(result["side_effects"], serde_json::json!([]));
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
            "lnsat-phase10-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir(&path).expect("test directory must be created");
        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
