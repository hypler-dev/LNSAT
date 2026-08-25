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
            "    _arguments '1:command:(doctor health status config recovery manifest completion man)' '--socket' '--session-token-stdin' '--output' '--help' '--version' '*::argument:->args'\n",
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
