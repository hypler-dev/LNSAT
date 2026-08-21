//! Target-neutral Phase 10 product-surface contracts.
//!
//! This module embeds source contracts only. It installs no files, starts no
//! service, selects no package target, and grants no mutation authority.

use crate::product_config::{
    DAEMON_CONFIG_CONTRACT_ID_V1, LoadedDaemonConfigV1, MAX_DAEMON_CONFIG_BYTES_V1,
};
use lnsat_contracts::CONTRACT_VERSION_V1_0;
use lnsat_store::{SQLITE_SCHEMA_VERSION, SqliteRecoveryErrorV1, SqliteStore, SqliteStoreStateV1};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::Path;

/// Stable source contract identifier for the Phase 10 product surface.
pub const PRODUCT_SURFACE_CONTRACT_ID_V1: &str = "lnsat.product_surface.v1";

/// Stable machine-output schema used by Phase 10 source commands.
pub const CLI_OUTPUT_SCHEMA_V1: &str = "lnsat.cli.output.v1";

/// Workspace product version embedded in source commands.
pub const PRODUCT_SOURCE_VERSION_V1: &str = env!("CARGO_PKG_VERSION");

/// Stable authenticated daemon-health response contract.
pub const DAEMON_HEALTH_CONTRACT_V1: &str = "lnsat.daemon.health.v1";

/// Stable authenticated daemon-status response contract.
pub const DAEMON_STATUS_CONTRACT_V1: &str = "lnsat.daemon.status.v1";

/// Only bounded evidence change permitted while authenticating a read.
pub const SESSION_ACTIVITY_SIDE_EFFECT_V1: &str = "session_activity_evidence_may_append";

/// Closed storage posture returned by authenticated health reads.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonHealthStorageV1 {
    /// Integrity verification passed at daemon bind.
    pub integrity_ok: bool,
    /// Exact verified migration count.
    pub migration_count: i64,
    /// Whether schema and migration count match current source.
    pub schema_current: bool,
    /// Exact active schema version.
    pub schema_version: i64,
    /// Stable readiness classification.
    pub status: String,
}

/// Closed authenticated health evidence. Contains no identity or target data.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonHealthV1 {
    /// Listener scope remains numeric loopback only.
    pub bind_scope: String,
    /// Stable response contract.
    pub contract: String,
    /// Exact Gateway contract-version identity.
    pub contract_version: String,
    /// Daemon answered one authenticated request.
    pub daemon_reachable: bool,
    /// Read grants no mutation authority.
    pub mutation_authority: bool,
    /// Session and role evidence passed.
    pub request_authenticated: bool,
    /// Exact bounded authentication side effect.
    pub side_effects: Vec<String>,
    /// Secret-free storage readiness evidence.
    pub storage: DaemonHealthStorageV1,
}

impl DaemonHealthV1 {
    /// Validates one daemon response against exact P10-A3 success invariants.
    #[must_use]
    pub fn is_compatible_success(&self) -> bool {
        self.bind_scope == "loopback"
            && self.contract == DAEMON_HEALTH_CONTRACT_V1
            && self.contract_version == CONTRACT_VERSION_V1_0
            && self.daemon_reachable
            && !self.mutation_authority
            && self.request_authenticated
            && self.side_effects == [SESSION_ACTIVITY_SIDE_EFFECT_V1]
            && self.storage.integrity_ok
            && self.storage.migration_count == SQLITE_SCHEMA_VERSION
            && self.storage.schema_current
            && self.storage.schema_version == SQLITE_SCHEMA_VERSION
            && self.storage.status == "ready"
    }
}

/// Closed authenticated read scope returned by daemon status.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonAuthenticatedReadScopeV1 {
    /// Exact fixed permission.
    pub permission: String,
    /// Exact fixed local roles possessing that permission.
    pub roles: Vec<String>,
}

/// Closed explicit-target posture returned by daemon status.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonExplicitTargetV1 {
    /// Ambient target lookup remains forbidden.
    pub ambient_target_used: bool,
    /// Client endpoint must be explicit.
    pub endpoint_required: bool,
    /// Remote transport remains closed.
    pub remote_transport: bool,
}

/// Closed Phase 10 progress posture returned by daemon status.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonPhase10PostureV1 {
    /// Implemented bounded packets including this source packet.
    pub implemented_packets: Vec<String>,
    /// Next separately gated packet.
    pub next_packet: String,
    /// Phase 11 remains closed.
    pub phase11_open: bool,
    /// Phase 10 remains incomplete.
    pub status: String,
}

/// Minimal implemented/reserved operator-surface posture.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonProductSurfacePostureV1 {
    /// Implemented read-only operator commands.
    pub implemented: Vec<String>,
    /// Reserved command families that remain unopened.
    pub reserved: Vec<String>,
}

/// Closed readiness posture returned by daemon status.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonStatusReadinessV1 {
    /// Daemon answered one authenticated request.
    pub daemon_reachable: bool,
    /// Active schema matches current source.
    pub schema_current: bool,
    /// Storage passed daemon bind verification.
    pub storage_ready: bool,
}

/// Closed authenticated status evidence. Contains no identity or target data.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonStatusV1 {
    /// Exact fixed role/permission posture.
    pub authenticated_read_scope: DaemonAuthenticatedReadScopeV1,
    /// Stable response contract.
    pub contract: String,
    /// Exact Gateway contract-version identity.
    pub contract_version: String,
    /// Explicit local target posture.
    pub explicit_target: DaemonExplicitTargetV1,
    /// Read grants no mutation authority.
    pub mutation_authority: bool,
    /// Current Phase 10 posture.
    pub phase10: DaemonPhase10PostureV1,
    /// Implemented and reserved operator surfaces.
    pub product_surface: DaemonProductSurfacePostureV1,
    /// Current daemon readiness.
    pub readiness: DaemonStatusReadinessV1,
    /// Exact bounded authentication side effect.
    pub side_effects: Vec<String>,
    /// Source package version; not artifact provenance.
    pub source_version: String,
}

impl DaemonStatusV1 {
    /// Validates one daemon response against exact P10-A3 success invariants.
    #[must_use]
    pub fn is_compatible_success(&self) -> bool {
        self.authenticated_read_scope.permission == "read_evidence"
            && self.authenticated_read_scope.roles == ["owner", "operator", "auditor"]
            && self.contract == DAEMON_STATUS_CONTRACT_V1
            && self.contract_version == CONTRACT_VERSION_V1_0
            && !self.explicit_target.ambient_target_used
            && self.explicit_target.endpoint_required
            && !self.explicit_target.remote_transport
            && !self.mutation_authority
            && self.phase10.implemented_packets == ["P10-A1", "P10-A2", "P10-A3"]
            && self.phase10.next_packet == "P10-A4"
            && !self.phase10.phase11_open
            && self.phase10.status == "in_progress"
            && self.product_surface.implemented
                == [
                    "doctor",
                    "config.inspect",
                    "recovery.inspect",
                    "health",
                    "status",
                ]
            && self.product_surface.reserved == ["recovery_mutation", "service", "update"]
            && self.readiness.daemon_reachable
            && self.readiness.schema_current
            && self.readiness.storage_ready
            && self.side_effects == [SESSION_ACTIVITY_SIDE_EFFECT_V1]
            && self.source_version == PRODUCT_SOURCE_VERSION_V1
    }
}

/// Builds secret-free authenticated health evidence from bind-verified state.
#[must_use]
pub fn daemon_health_v1(state: &SqliteStoreStateV1) -> DaemonHealthV1 {
    DaemonHealthV1 {
        bind_scope: "loopback".to_owned(),
        contract: DAEMON_HEALTH_CONTRACT_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        daemon_reachable: true,
        mutation_authority: false,
        request_authenticated: true,
        side_effects: vec![SESSION_ACTIVITY_SIDE_EFFECT_V1.to_owned()],
        storage: DaemonHealthStorageV1 {
            integrity_ok: state.integrity_ok,
            migration_count: state.migration_count,
            schema_current: state.schema_version == SQLITE_SCHEMA_VERSION
                && state.migration_count == SQLITE_SCHEMA_VERSION,
            schema_version: state.schema_version,
            status: "ready".to_owned(),
        },
    }
}

/// Builds secret-free authenticated daemon/product status evidence.
#[must_use]
pub fn daemon_status_v1() -> DaemonStatusV1 {
    DaemonStatusV1 {
        authenticated_read_scope: DaemonAuthenticatedReadScopeV1 {
            permission: "read_evidence".to_owned(),
            roles: ["owner", "operator", "auditor"].map(str::to_owned).to_vec(),
        },
        contract: DAEMON_STATUS_CONTRACT_V1.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        explicit_target: DaemonExplicitTargetV1 {
            ambient_target_used: false,
            endpoint_required: true,
            remote_transport: false,
        },
        mutation_authority: false,
        phase10: DaemonPhase10PostureV1 {
            implemented_packets: ["P10-A1", "P10-A2", "P10-A3"].map(str::to_owned).to_vec(),
            next_packet: "P10-A4".to_owned(),
            phase11_open: false,
            status: "in_progress".to_owned(),
        },
        product_surface: DaemonProductSurfacePostureV1 {
            implemented: [
                "doctor",
                "config.inspect",
                "recovery.inspect",
                "health",
                "status",
            ]
            .map(str::to_owned)
            .to_vec(),
            reserved: ["recovery_mutation", "service", "update"]
                .map(str::to_owned)
                .to_vec(),
        },
        readiness: DaemonStatusReadinessV1 {
            daemon_reachable: true,
            schema_current: true,
            storage_ready: true,
        },
        side_effects: vec![SESSION_ACTIVITY_SIDE_EFFECT_V1.to_owned()],
        source_version: PRODUCT_SOURCE_VERSION_V1.to_owned(),
    }
}

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
    "Usage:\n  lnsatctl doctor [--output <text|json|jsonl|yaml>]\n  lnsatctl health --endpoint <numeric-loopback-http-url> --session-token-stdin [--output <text|json|jsonl|yaml>]\n  lnsatctl status --endpoint <numeric-loopback-http-url> --session-token-stdin [--output <text|json|jsonl|yaml>]\n  lnsatctl config inspect --config <absolute-path> [--output <text|json|jsonl|yaml>]\n  lnsatctl recovery inspect --database <path> [--output <text|json|jsonl|yaml>]\n  lnsatctl manifest\n  lnsatctl completion <bash|zsh|fish>\n  lnsatctl man <lnsat|lnsatctl|lnsatd>\n  lnsatctl --help\n  lnsatctl --version\n"
}

/// Generated completion source for supported shells.
#[must_use]
pub fn completion_source_v1(shell: &str) -> Option<&'static str> {
    match shell {
        "bash" => Some(
            "_lnsatctl(){ COMPREPLY=( $(compgen -W 'doctor health status config recovery manifest completion man --endpoint --session-token-stdin --output --help --version' -- \"${COMP_WORDS[COMP_CWORD]}\") ); }\ncomplete -F _lnsatctl lnsatctl\ncomplete -W 'packet manifest completion man --help --version' lnsat\ncomplete -W '--config --database --listen --disposable-git-root --git-executable --manifest --help --version' lnsatd\n",
        ),
        "zsh" => Some(
            "#compdef lnsatctl lnsat lnsatd\n_arguments '1:command:(doctor health status config recovery manifest completion man packet)' '*::argument:->args'\n",
        ),
        "fish" => Some(
            "complete -c lnsatctl -f -a 'doctor health status config recovery manifest completion man'\ncomplete -c lnsatctl -f -l endpoint\ncomplete -c lnsatctl -f -l session-token-stdin\ncomplete -c lnsatctl -f -l output -a 'text json jsonl yaml'\ncomplete -c lnsat -f -a 'packet manifest completion man'\ncomplete -c lnsatd -f -l config -l database -l listen -l disposable-git-root -l git-executable -l manifest\n",
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
            ".TH LNSATCTL 1\n.SH NAME\nlnsatctl - source-only LNSAT operator diagnostics\n.SH SYNOPSIS\nlnsatctl doctor | health --endpoint <numeric-loopback-http-url> --session-token-stdin | status --endpoint <numeric-loopback-http-url> --session-token-stdin | config inspect --config <absolute-path> | recovery inspect --database <path> | manifest\n.SH OUTPUT\nRead-only commands accept --output text|json|jsonl|yaml in the documented final position; JSON is default.\n.SH SAFETY\nHealth and status require an explicit numeric-loopback HTTP endpoint and one opaque session token from stdin. Configuration and recovery inspection are read-only. Service install, start, recovery mutation, and activation are unavailable.\n",
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
        assert_eq!(
            value["diagnostics"]["implemented_output_formats"],
            serde_json::json!(["text", "json", "jsonl", "yaml"])
        );
        assert_eq!(
            value["authenticated_read_transport"]["routes"],
            serde_json::json!(["/v1/health", "/v1/status"])
        );
        assert_eq!(
            value["authenticated_read_transport"]["side_effects"],
            serde_json::json!([SESSION_ACTIVITY_SIDE_EFFECT_V1])
        );
    }

    #[test]
    fn authenticated_health_and_status_match_frozen_fixtures() {
        let health_fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../fixtures/contracts/phase10-health-v1.json"
        ))
        .expect("health fixture must parse");
        let health = daemon_health_v1(&SqliteStoreStateV1 {
            database_path: Path::new("/not-reflected.sqlite3").to_path_buf(),
            schema_version: SQLITE_SCHEMA_VERSION,
            migration_count: SQLITE_SCHEMA_VERSION,
            journal_mode: "wal".to_owned(),
            foreign_keys_enabled: true,
            synchronous_level: 2,
            trusted_schema_enabled: false,
            integrity_ok: true,
        });
        assert!(health.is_compatible_success());
        assert_eq!(
            serde_json::to_value(health).expect("health must serialize"),
            health_fixture
        );

        let status_fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../fixtures/contracts/phase10-status-v1.json"
        ))
        .expect("status fixture must parse");
        let status = daemon_status_v1();
        assert!(status.is_compatible_success());
        assert_eq!(
            serde_json::to_value(status).expect("status must serialize"),
            status_fixture
        );
        let combined = format!("{health_fixture}{status_fixture}");
        for forbidden in [
            "/Users/",
            "identity:",
            "ses_",
            "lnsat_session_v1",
            "password",
            "hostname",
            "database_path",
        ] {
            assert!(!combined.contains(forbidden));
        }
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
