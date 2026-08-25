#![forbid(unsafe_code)]

use lnsat_store::{
    LocalOwnerBootstrapInputV1, LocalSessionIssueInputV1, LocalSessionStoreErrorV1, SqliteStore,
};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
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
fn shared_output_formats_preserve_default_json_and_exact_position() {
    let default_json = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .arg("doctor")
        .output()
        .expect("default doctor must run");
    let selected_json = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["doctor", "--output", "json"])
        .output()
        .expect("selected JSON doctor must run");
    let jsonl = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["doctor", "--output", "jsonl"])
        .output()
        .expect("JSONL doctor must run");
    assert!(default_json.status.success());
    assert_eq!(default_json.stdout, selected_json.stdout);
    assert_eq!(default_json.stdout, jsonl.stdout);

    let text = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["doctor", "--output", "text"])
        .output()
        .expect("text doctor must run");
    assert!(text.status.success());
    let text = String::from_utf8(text.stdout).expect("text must be UTF-8");
    assert!(text.starts_with("command=doctor\n"));
    assert!(text.contains("configuration.ambient_environment_used=false\n"));
    assert!(text.contains("side_effects=[]\n"));
    assert!(text.ends_with("source_version=0.1.0\n"));

    let yaml = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["doctor", "--output", "yaml"])
        .output()
        .expect("YAML doctor must run");
    assert!(yaml.status.success());
    let yaml = String::from_utf8(yaml.stdout).expect("YAML must be UTF-8");
    assert!(yaml.starts_with("command: \"doctor\"\n"));
    assert!(yaml.contains("ambient_environment_used: false\n"));
    assert!(!yaml.contains("---"));

    for arguments in [
        vec!["doctor", "--output"],
        vec!["doctor", "--output", "toml"],
        vec!["doctor", "--output", "json", "extra"],
        vec!["doctor", "--output", "text", "--output", "yaml"],
        vec!["manifest", "--output", "json"],
    ] {
        let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(arguments)
            .output()
            .expect("invalid output arguments must run");
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
        assert!(!output.stderr.is_empty());
    }
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
fn offline_backup_and_inert_restore_create_fresh_verified_files_without_path_reflection() {
    let directory = TestDirectory::new("backup-restore");
    let database = directory.path.join("private-source.sqlite3");
    let backup = directory.path.join("private-backup.sqlite3");
    let restored = directory.path.join("private-restored.sqlite3");
    SqliteStore::open(&database).expect("test database must open");

    let backup_output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["backup", "--database"])
        .arg(&database)
        .args(["--destination"])
        .arg(&backup)
        .output()
        .expect("lnsatctl backup must run");
    assert!(backup_output.status.success());
    assert!(backup_output.stderr.is_empty());
    assert!(backup.is_file());
    let backup_stdout = String::from_utf8(backup_output.stdout).expect("backup must be UTF-8");
    assert!(!backup_stdout.contains("private-source"));
    assert!(!backup_stdout.contains("private-backup"));
    let backup_result: Value = serde_json::from_str(&backup_stdout).expect("backup must be JSON");
    assert_eq!(backup_result["command"], "backup");
    assert_eq!(backup_result["daemon_quiescence_proved"], true);
    assert_eq!(backup_result["evidence"]["replaced_existing"], false);
    assert_eq!(
        backup_result["side_effects"],
        serde_json::json!(["backup_snapshot_created"])
    );

    let restore_output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["restore", "--backup"])
        .arg(&backup)
        .args(["--destination"])
        .arg(&restored)
        .output()
        .expect("lnsatctl restore must run");
    assert!(restore_output.status.success());
    assert!(restore_output.stderr.is_empty());
    assert!(restored.is_file());
    let restore_stdout = String::from_utf8(restore_output.stdout).expect("restore must be UTF-8");
    assert!(!restore_stdout.contains("private-backup"));
    assert!(!restore_stdout.contains("private-restored"));
    let restore_result: Value =
        serde_json::from_str(&restore_stdout).expect("restore must be JSON");
    assert_eq!(restore_result["command"], "restore");
    assert_eq!(restore_result["evidence"]["activated"], false);
    assert_eq!(
        restore_result["evidence"]["snapshot_sha256"],
        backup_result["evidence"]["snapshot_sha256"]
    );
    assert_eq!(
        restore_result["side_effects"],
        serde_json::json!(["inert_restore_created"])
    );
    assert_eq!(
        SqliteStore::inspect_recovery_state_v1(&restored)
            .expect("restored database must inspect")
            .disposition
            .as_str(),
        "ready"
    );
}

#[test]
fn offline_owner_recovery_reads_password_only_from_stdin_and_revokes_sessions() {
    let directory = TestDirectory::new("owner-recovery");
    let database = directory.path.join("private-owner.sqlite3");
    let old_password = "correct horse battery staple";
    let new_password = "replacement password remains private";
    let mut store = SqliteStore::open(&database).expect("test database must open");
    store
        .bootstrap_local_owner_v1(&LocalOwnerBootstrapInputV1 {
            identity_ref: "identity:human:owner",
            display_name: "Local Owner",
            password: old_password,
            created_at: "2026-08-25T17:00:00Z",
        })
        .expect("owner must bootstrap");
    store
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password: old_password,
            issued_at: "2026-08-25T17:01:00Z",
            expires_at: "2026-08-25T17:31:00Z",
        })
        .expect("owner session must issue");
    drop(store);

    let mut child = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["recovery", "owner", "--database"])
        .arg(&database)
        .args([
            "--expected-owner",
            "identity:human:owner",
            "--recovered-at",
            "2026-08-25T17:02:00Z",
            "--new-password-stdin",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("lnsatctl owner recovery must spawn");
    child
        .stdin
        .take()
        .expect("stdin must pipe")
        .write_all(format!("{new_password}\n").as_bytes())
        .expect("password must write");
    let output = child
        .wait_with_output()
        .expect("owner recovery must finish");
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let stdout = String::from_utf8(output.stdout).expect("owner recovery must be UTF-8");
    assert!(!stdout.contains(old_password));
    assert!(!stdout.contains(new_password));
    assert!(!stdout.contains("private-owner"));
    let result: Value = serde_json::from_str(&stdout).expect("owner recovery must be JSON");
    assert_eq!(result["command"], "recovery.owner");
    assert_eq!(result["secret_intake"], "protected_stdin");
    assert_eq!(result["revoked_session_count"], 1);
    assert_eq!(result["served_mutation"], false);

    let mut reopened = SqliteStore::open(&database).expect("recovered store must reopen");
    assert!(matches!(
        reopened.issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password: old_password,
            issued_at: "2026-08-25T17:03:00Z",
            expires_at: "2026-08-25T17:33:00Z",
        }),
        Err(LocalSessionStoreErrorV1::InvalidCredential)
    ));
    reopened
        .issue_local_session_v1(&LocalSessionIssueInputV1 {
            identity_ref: "identity:human:owner",
            password: new_password,
            issued_at: "2026-08-25T17:03:00Z",
            expires_at: "2026-08-25T17:33:00Z",
        })
        .expect("replacement password must authenticate");

    let forbidden_argument = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["recovery", "owner", "--database"])
        .arg(&database)
        .args([
            "--expected-owner",
            "identity:human:owner",
            "--recovered-at",
            "2026-08-25T17:04:00Z",
            "--new-password",
            "forbidden-secret-argument",
        ])
        .output()
        .expect("forbidden password argument must run");
    assert_eq!(forbidden_argument.status.code(), Some(2));
    assert!(forbidden_argument.stdout.is_empty());
    assert!(
        !String::from_utf8_lossy(&forbidden_argument.stderr).contains("forbidden-secret-argument")
    );
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

#[test]
fn zsh_completion_per_binary_exact_surfaces() {
    let output = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
        .args(["completion", "zsh"])
        .output()
        .expect("lnsatctl completion zsh must run");
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    assert_eq!(
        String::from_utf8(output.stdout).expect("zsh completion must be UTF-8"),
        concat!(
            "#compdef lnsatctl lnsat lnsatd\n",
            "case \"$service\" in\n",
            "  lnsatctl)\n",
            "    _arguments '1:command:(doctor health status config recovery backup restore manifest completion man)' '--database' '--destination' '--backup' '--expected-owner' '--recovered-at' '--new-password-stdin' '--socket' '--session-token-stdin' '--output' '--help' '--version' '*::argument:->args'\n",
            "    ;;\n",
            "  lnsat)\n",
            "    _arguments '1:command:(packet manifest completion man)' '--help' '--version' '*::argument:->args'\n",
            "    ;;\n",
            "  lnsatd)\n",
            "    _arguments '--config' '--database' '--listen' '--disposable-git-root' '--git-executable' '--manifest' '--help' '--version'\n",
            "    ;;\n",
            "esac\n",
        )
    );

    // Bash and fish remain intact.
    for shell in ["bash", "fish"] {
        let out = Command::new(env!("CARGO_BIN_EXE_lnsatctl"))
            .args(["completion", shell])
            .output()
            .expect("completion must run");
        assert!(out.status.success());
        let text = String::from_utf8(out.stdout).expect("must be UTF-8");
        assert!(text.contains("lnsatctl"));
        assert!(text.contains("lnsat"));
        assert!(text.contains("lnsatd"));
    }
}
