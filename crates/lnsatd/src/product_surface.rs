//! Target-neutral Phase 10 product-surface contracts.
//!
//! This module embeds source contracts only. It installs no files, starts no
//! service, selects no package target, and grants no mutation authority.

use crate::product_config::{
    DAEMON_CONFIG_CONTRACT_ID_V1, LoadedDaemonConfigV1, MAX_DAEMON_CONFIG_BYTES_V1,
};
use lnsat_store::{SqliteRecoveryErrorV1, SqliteStore};
use serde_json::json;
use std::path::Path;

/// Stable source contract identifier for the Phase 10 product surface.
pub const PRODUCT_SURFACE_CONTRACT_ID_V1: &str = "lnsat.product_surface.v1";

/// Stable machine-output schema used by Phase 10 source commands.
pub const CLI_OUTPUT_SCHEMA_V1: &str = "lnsat.cli.output.v1";

/// Workspace product version embedded in source commands.
pub const PRODUCT_SOURCE_VERSION_V1: &str = env!("CARGO_PKG_VERSION");

/// Stable Phase 10 exit-code families.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum ProductExitCodeV1 {
    /// Requested operation completed.
    Success = 0,
    /// Valid request was refused by contract or policy evidence.
    Refused = 1,
    /// Arguments, input, or configuration were invalid.
    UsageOrConfiguration = 2,
    /// Authentication failed or was required.
    Authentication = 3,
    /// Command or capability is unavailable in this source profile.
    Unavailable = 4,
    /// Request conflicts with immutable or concurrent state.
    Conflict = 5,
    /// Bounded temporary failure permits only evidence-governed retry.
    TemporaryFailure = 6,
    /// Consequence outcome cannot be proven from available evidence.
    OutcomeUnknown = 7,
    /// Internal source failure.
    InternalFailure = 70,
}

impl ProductExitCodeV1 {
    /// Numeric process exit code.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    /// Stable machine-readable family.
    #[must_use]
    pub const fn family(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Refused => "refused",
            Self::UsageOrConfiguration => "usage_or_configuration",
            Self::Authentication => "authentication",
            Self::Unavailable => "unavailable",
            Self::Conflict => "conflict",
            Self::TemporaryFailure => "temporary_failure",
            Self::OutcomeUnknown => "outcome_unknown",
            Self::InternalFailure => "internal_failure",
        }
    }
}

/// Exact embedded target-neutral Phase 10 source manifest.
#[must_use]
pub const fn product_surface_manifest_json_v1() -> &'static str {
    include_str!("../../../fixtures/contracts/phase10-product-surface-v1.json")
}

/// Public-safe read-only `lnsatctl doctor` evidence.
#[must_use]
pub fn doctor_output_json_v1() -> String {
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "doctor",
        "product_surface_contract": PRODUCT_SURFACE_CONTRACT_ID_V1,
        "source_version": PRODUCT_SOURCE_VERSION_V1,
        "configuration": {
            "precedence": [
                "compiled_safe_defaults",
                "system_config",
                "user_config",
                "explicit_config_file"
            ],
            "current_path_profile": "explicit_only_source",
            "resolved_system_path": null,
            "resolved_user_path": null,
            "applied_layers": ["compiled_safe_defaults"],
            "explicit_config_digest": null,
            "ambient_environment_used": false,
            "secret_process_arguments_allowed": false
        },
        "service_manager": {
            "metadata_contract_only": true,
            "install_available": false,
            "start_available": false,
            "automatic_start": false,
            "sudo_invocation": false
        },
        "runtime": {
            "non_root_required": true,
            "supported_release": false,
            "package_or_binary_claim": false
        },
        "side_effects": []
    })
    .to_string()
}

/// Public-safe inspection of one validated explicit configuration.
///
/// No configured path, address, request path, asset path, or source bytes are
/// included in output.
#[must_use]
pub fn config_inspection_output_json_v1(loaded: &LoadedDaemonConfigV1) -> String {
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.inspect",
        "configuration": {
            "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
            "config_digest": loaded.config_digest(),
            "applied_layers": [
                "compiled_safe_defaults",
                "explicit_config_file"
            ],
            "source": "explicit_absolute_file",
            "system_path_selected": false,
            "user_path_selected": false,
            "ambient_environment_used": false,
            "secret_fields_allowed": false,
            "max_file_bytes": MAX_DAEMON_CONFIG_BYTES_V1,
            "phase8_runtime_configured": loaded.phase8_runtime_configured(),
            "console_manifest_configured": loaded.console_manifest_configured()
        },
        "runtime_started": false,
        "storage_opened": false,
        "listener_opened": false,
        "side_effects": []
    })
    .to_string()
}

/// Read-only recovery classification without raw-path reflection or mutation.
///
/// # Errors
///
/// Returns stable `SQLite` recovery errors for missing, invalid, or unsafe
/// database paths. Inspection opens the target read-only and performs no
/// migration, repair, quarantine, recovery, or activation.
pub fn recovery_inspection_output_json_v1(
    database_path: impl AsRef<Path>,
) -> Result<String, SqliteRecoveryErrorV1> {
    let inspection = SqliteStore::inspect_recovery_state_v1(database_path)?;
    Ok(json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "recovery.inspect",
        "target": "explicit_database",
        "disposition": inspection.disposition.as_str(),
        "schema_version": inspection.schema_version,
        "migration_count": inspection.migration_count,
        "integrity_ok": inspection.integrity_ok,
        "inspection_mode": "read_only",
        "automatic_action": "none",
        "recovery_mutation_authority": false,
        "activation_authority": false,
        "side_effects": []
    })
    .to_string())
}

/// Public-safe machine diagnostic without reflected input.
#[must_use]
pub fn failure_output_json_v1(
    component: &str,
    command: &str,
    error_code: &str,
    exit_code: ProductExitCodeV1,
) -> String {
    json!({
        "ok": false,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "component": component,
        "command": command,
        "error": { "code": error_code },
        "exit_code_family": exit_code.family(),
        "side_effects": []
    })
    .to_string()
}

/// Bounded `lnsatctl` help text.
#[must_use]
pub const fn lnsatctl_usage_v1() -> &'static str {
    "Usage:\n  lnsatctl doctor\n  lnsatctl config inspect --config <absolute-path>\n  lnsatctl recovery inspect --database <path>\n  lnsatctl manifest\n  lnsatctl completion <bash|zsh|fish>\n  lnsatctl man <lnsat|lnsatctl|lnsatd>\n  lnsatctl --help\n  lnsatctl --version\n"
}

/// Generated completion source for supported shells.
#[must_use]
pub fn completion_source_v1(shell: &str) -> Option<&'static str> {
    match shell {
        "bash" => Some(
            "_lnsatctl(){ COMPREPLY=( $(compgen -W 'doctor config recovery manifest completion man --help --version' -- \"${COMP_WORDS[COMP_CWORD]}\") ); }\ncomplete -F _lnsatctl lnsatctl\ncomplete -W 'packet manifest completion man --help --version' lnsat\ncomplete -W '--config --database --listen --disposable-git-root --git-executable --manifest --help --version' lnsatd\n",
        ),
        "zsh" => Some(
            "#compdef lnsatctl lnsat lnsatd\n_arguments '1:command:(doctor config recovery manifest completion man packet)' '*::argument:->args'\n",
        ),
        "fish" => Some(
            "complete -c lnsatctl -f -a 'doctor config recovery manifest completion man'\ncomplete -c lnsat -f -a 'packet manifest completion man'\ncomplete -c lnsatd -f -l config -l database -l listen -l disposable-git-root -l git-executable -l manifest\n",
        ),
        _ => None,
    }
}

/// Generated source man page for one product command.
#[must_use]
pub fn man_page_source_v1(command: &str) -> Option<&'static str> {
    match command {
        "lnsat" => Some(
            ".TH LNSAT 1\n.SH NAME\nlnsat - source-only LNSAT workflow dispatcher\n.SH SYNOPSIS\nlnsat packet <validate|hash|inspect> <packet.json> [request_id]\n.SH SAFETY\nNo command grants ambient authority. Current commands are read-only or pure local inspection.\n",
        ),
        "lnsatctl" => Some(
            ".TH LNSATCTL 1\n.SH NAME\nlnsatctl - source-only LNSAT operator diagnostics\n.SH SYNOPSIS\nlnsatctl doctor | config inspect --config <absolute-path> | recovery inspect --database <path> | manifest\n.SH SAFETY\nConfiguration and recovery inspection are read-only. Service install, start, recovery mutation, and activation are unavailable.\n",
        ),
        "lnsatd" => Some(
            ".TH LNSATD 8\n.SH NAME\nlnsatd - source-only loopback LNSAT daemon\n.SH SYNOPSIS\nlnsatd --config <absolute-path> | --database <path> [--listen <numeric-loopback:port>]\n.SH SAFETY\nRuns foreground, requires explicit local storage, installs no service, and starts no service automatically.\n",
        ),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_freezes_closed_source_only_boundaries() {
        let value: serde_json::Value = serde_json::from_str(product_surface_manifest_json_v1())
            .expect("Phase 10 manifest must be valid JSON");
        assert_eq!(value["contract_id"], PRODUCT_SURFACE_CONTRACT_ID_V1);
        assert_eq!(value["supported_release"], false);
        assert_eq!(value["package_or_binary_claim"], false);
        assert_eq!(
            value["configuration"]["explicit_config_contract"],
            DAEMON_CONFIG_CONTRACT_ID_V1
        );
        assert_eq!(
            value["configuration"]["explicit_config_file"]["maximum_bytes"],
            MAX_DAEMON_CONFIG_BYTES_V1
        );
        assert_eq!(
            value["configuration"]["mixed_direct_and_config_input"],
            "rejected"
        );
        assert_eq!(value["recovery"]["served_mutation"], false);
        assert_eq!(value["service_manager"]["install_implemented"], false);
        assert_eq!(value["service_manager"]["start_implemented"], false);
        assert_eq!(value["hard_stops"]["migration_0018"], false);
        assert_eq!(
            value["hard_stops"]["phase11_or_later_implementation"],
            false
        );
        assert_eq!(
            value["diagnostics"]["exit_code_families"]["outcome_unknown"],
            ProductExitCodeV1::OutcomeUnknown.as_u8()
        );
    }

    #[test]
    fn doctor_is_secret_free_and_uses_no_ambient_environment() {
        let output = doctor_output_json_v1();
        assert!(output.contains("\"ambient_environment_used\":false"));
        assert!(output.contains("\"secret_process_arguments_allowed\":false"));
        assert!(output.contains("\"side_effects\":[]"));
        assert!(!output.contains("HOME"));
        assert!(!output.contains("TOKEN"));
    }

    #[test]
    fn completion_and_man_sources_cover_three_product_commands() {
        for shell in ["bash", "zsh", "fish"] {
            let completion = completion_source_v1(shell).expect("supported completion shell");
            assert!(completion.contains("lnsat"));
            assert!(completion.contains("lnsatctl"));
            assert!(completion.contains("lnsatd"));
        }
        for command in ["lnsat", "lnsatctl", "lnsatd"] {
            let page = man_page_source_v1(command).expect("supported man page");
            assert!(page.contains(".TH"));
        }
        assert!(completion_source_v1("powershell").is_none());
        assert!(man_page_source_v1("unknown").is_none());
    }
}
