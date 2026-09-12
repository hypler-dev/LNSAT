//! Target-neutral Phase 10 product-surface contracts.
//!
//! This module embeds source contracts only. It installs no files, starts no
//! service, selects no package target, and grants no mutation authority.

use crate::headless_config_loader::LoadedHeadlessConfigDeclarationV1;
use crate::product_config::{
    DAEMON_CONFIG_CONTRACT_ID_V1, LoadedDaemonConfigV1, MAX_DAEMON_CONFIG_BYTES_V1,
    compare_loaded_daemon_config_v1, daemon_config_schema_json_v1,
};
use lnsat_contracts::{CONTRACT_VERSION_V1_0, HEADLESS_CONFIG_SCHEMA_V1};
use lnsat_store::{SQLITE_SCHEMA_VERSION, SqliteRecoveryErrorV1, SqliteStore, SqliteStoreStateV1};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::Path;

/// Stable source contract identifier for the Phase 10 product surface.
pub const PRODUCT_SURFACE_CONTRACT_ID_V1: &str = "lnsat.product_surface.v1";
/// Exact opt-in HCFG-1 product-surface contract.
pub const PRODUCT_SURFACE_CONTRACT_ID_V2: &str = "lnsat.product_surface.v2";

/// Exact request and response header for product-surface contract selection.
pub const PRODUCT_SURFACE_CONTRACT_HEADER_NAME_V1: &str = "LNSAT-Product-Surface-Contract";

/// Returns whether one product-surface contract selector is exactly supported.
#[must_use]
pub fn is_supported_product_surface_contract_v1(value: &str) -> bool {
    matches!(
        value,
        PRODUCT_SURFACE_CONTRACT_ID_V1 | PRODUCT_SURFACE_CONTRACT_ID_V2
    )
}

/// Stable machine-output schema used by Phase 10 source commands.
pub const CLI_OUTPUT_SCHEMA_V1: &str = "lnsat.cli.output.v1";

/// Workspace product version embedded in source commands.
pub const PRODUCT_SOURCE_VERSION_V1: &str = env!("CARGO_PKG_VERSION");

/// Stable authenticated daemon-health response contract.
pub const DAEMON_HEALTH_CONTRACT_V1: &str = "lnsat.daemon.health.v1";

/// Stable authenticated daemon-status response contract.
pub const DAEMON_STATUS_CONTRACT_V1: &str = "lnsat.daemon.status.v1";
/// Exact opt-in daemon-status contract identity.
pub const DAEMON_STATUS_CONTRACT_V2: &str = "lnsat.daemon.status.v2";

/// Only bounded evidence change permitted while authenticating a read.
pub const SESSION_ACTIVITY_SIDE_EFFECT_V1: &str = "session_activity_evidence_may_append";

/// Evaluates target-neutral non-root runtime policy from one effective UID.
#[must_use]
pub const fn effective_uid_is_non_root_v1(effective_uid: u32) -> bool {
    effective_uid != 0
}

/// Returns whether current process satisfies implemented non-root enforcement.
///
/// macOS and Linux use kernel-reported effective UID. Other targets remain
/// unsupported until their privilege identity has an explicit contract.
#[must_use]
pub fn current_process_is_non_root_v1() -> bool {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        effective_uid_is_non_root_v1(nix::unistd::geteuid().as_raw())
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        false
    }
}

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

/// Closed Phase 10 exit posture returned by daemon status.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonPhase10PostureV1 {
    /// Implemented bounded packets through the source-conformance exit freeze.
    pub implemented_packets: Vec<String>,
    /// No later packet is authorized by Phase 10 exit.
    pub next_packet: String,
    /// Phase 11 remains closed.
    pub phase11_open: bool,
    /// Phase 10 source conformance status.
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

/// Closed v2 operator-surface posture returned by an explicitly negotiated
/// daemon-status read.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonProductSurfacePostureV2 {
    /// Implemented read-only and offline operator commands.
    pub implemented: Vec<String>,
    /// Reserved command families that remain unopened.
    pub reserved: Vec<String>,
}

/// Closed authenticated status evidence for the explicitly selected v2 product
/// surface. It is deliberately distinct from v1 so a strict v1 client never
/// accepts v2 inventory as its own contract.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DaemonStatusV2 {
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
    /// Implemented and reserved v2 operator surfaces.
    pub product_surface: DaemonProductSurfacePostureV2,
    /// Current daemon readiness.
    pub readiness: DaemonStatusReadinessV1,
    /// Exact bounded authentication side effect.
    pub side_effects: Vec<String>,
    /// Source package version; not artifact provenance.
    pub source_version: String,
}

impl DaemonStatusV2 {
    /// Validates one daemon response against exact HCFG-1 v2 success invariants.
    #[must_use]
    pub fn is_compatible_success(&self) -> bool {
        self.authenticated_read_scope.permission == "read_evidence"
            && self.authenticated_read_scope.roles == ["owner", "operator", "auditor"]
            && self.contract == DAEMON_STATUS_CONTRACT_V2
            && self.contract_version == CONTRACT_VERSION_V1_0
            && !self.explicit_target.ambient_target_used
            && self.explicit_target.endpoint_required
            && !self.explicit_target.remote_transport
            && !self.mutation_authority
            && self.phase10.implemented_packets
                == ["P10-A1", "P10-A2", "P10-A3", "P10-A4", "P10-X1"]
            && self.phase10.next_packet == "none_authorized"
            && !self.phase10.phase11_open
            && self.phase10.status == "complete"
            && self.product_surface.implemented
                == [
                    "doctor",
                    "config.inspect",
                    "config.schema",
                    "config.validate",
                    "config.show",
                    "config.diff",
                    "config.effective",
                    "config.export",
                    "recovery.inspect",
                    "backup",
                    "restore",
                    "recovery.owner",
                ]
            && self.product_surface.reserved == ["recovery.activate", "service", "update"]
            && self.readiness.daemon_reachable
            && self.readiness.schema_current
            && self.readiness.storage_ready
            && self.side_effects == [SESSION_ACTIVITY_SIDE_EFFECT_V1]
            && self.source_version == PRODUCT_SOURCE_VERSION_V1
    }
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
            && self.phase10.implemented_packets
                == ["P10-A1", "P10-A2", "P10-A3", "P10-A4", "P10-X1"]
            && self.phase10.next_packet == "none_authorized"
            && !self.phase10.phase11_open
            && self.phase10.status == "complete"
            && self.product_surface.implemented
                == [
                    "doctor",
                    "config.inspect",
                    "recovery.inspect",
                    "backup",
                    "restore",
                    "recovery.owner",
                ]
            && self.product_surface.reserved == ["recovery.activate", "service", "update"]
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
            implemented_packets: ["P10-A1", "P10-A2", "P10-A3", "P10-A4", "P10-X1"]
                .map(str::to_owned)
                .to_vec(),
            next_packet: "none_authorized".to_owned(),
            phase11_open: false,
            status: "complete".to_owned(),
        },
        product_surface: DaemonProductSurfacePostureV1 {
            implemented: [
                "doctor",
                "config.inspect",
                "recovery.inspect",
                "backup",
                "restore",
                "recovery.owner",
            ]
            .map(str::to_owned)
            .to_vec(),
            reserved: ["recovery.activate", "service", "update"]
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

/// Builds the typed status result for the explicitly selected v2 surface.
#[must_use]
pub fn daemon_status_v2() -> DaemonStatusV2 {
    DaemonStatusV2 {
        authenticated_read_scope: DaemonAuthenticatedReadScopeV1 {
            permission: "read_evidence".to_owned(),
            roles: ["owner", "operator", "auditor"].map(str::to_owned).to_vec(),
        },
        contract: DAEMON_STATUS_CONTRACT_V2.to_owned(),
        contract_version: CONTRACT_VERSION_V1_0.to_owned(),
        explicit_target: DaemonExplicitTargetV1 {
            ambient_target_used: false,
            endpoint_required: true,
            remote_transport: false,
        },
        mutation_authority: false,
        phase10: DaemonPhase10PostureV1 {
            implemented_packets: ["P10-A1", "P10-A2", "P10-A3", "P10-A4", "P10-X1"]
                .map(str::to_owned)
                .to_vec(),
            next_packet: "none_authorized".to_owned(),
            phase11_open: false,
            status: "complete".to_owned(),
        },
        product_surface: DaemonProductSurfacePostureV2 {
            implemented: [
                "doctor",
                "config.inspect",
                "config.schema",
                "config.validate",
                "config.show",
                "config.diff",
                "config.effective",
                "config.export",
                "recovery.inspect",
                "backup",
                "restore",
                "recovery.owner",
            ]
            .map(str::to_owned)
            .to_vec(),
            reserved: ["recovery.activate", "service", "update"]
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

/// Exact opt-in HCFG-1 product-surface manifest bytes.
#[must_use]
pub const fn product_surface_manifest_json_v2() -> &'static str {
    include_str!("../../../fixtures/contracts/product-surface-v2.json")
}

/// Public-safe diagnostic result for one loader-validated configuration.
#[must_use]
pub fn config_validation_output_json_v2(loaded: &LoadedDaemonConfigV1) -> String {
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.validate",
        "configuration_contract": DAEMON_CONFIG_CONTRACT_ID_V1,
        "valid": true,
        "config_digest": loaded.config_digest(),
        "validation_scope": "explicit_daemon_configuration",
        "activation_authority": false,
        "side_effects": []
    })
    .to_string()
}

fn config_redacted_summary_v2(loaded: &LoadedDaemonConfigV1) -> serde_json::Value {
    let runtime_profile = loaded.docker_local_runtime_profile();
    json!({
        "config_digest": loaded.config_digest(),
        "field_groups": {
            "database_path": { "configured": true, "value": "redacted" },
            "listen_address": { "configured": true, "value": "redacted" },
            "control_socket_path": {
                "configured": loaded.control_socket_configured(),
                "value": "redacted"
            },
            "phase8_runtime": {
                "configured": loaded.phase8_runtime_configured(),
                "value": "redacted"
            },
            "runtime_profile": {
                "configured": loaded.docker_local_runtime_profile_configured(),
                "value": "redacted",
                "whole_profile_digest": runtime_profile.map(
                    crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1::profile_digest_text
                ),
                "authority_configuration_digest": runtime_profile.map(
                    crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1::authority_configuration_digest_text
                )
            },
            "console": {
                "configured": loaded.console_manifest_configured(),
                "value": "redacted"
            }
        }
    })
}

/// Public-safe redacted summary for one loader-validated configuration.
///
/// This command reads explicit selected input only. It starts no process,
/// storage, listener, or runtime.
#[must_use]
pub fn config_show_output_json_v2(loaded: &LoadedDaemonConfigV1) -> String {
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.show",
        "configuration_contract": DAEMON_CONFIG_CONTRACT_ID_V1,
        "configuration": config_redacted_summary_v2(loaded),
        "scope": "explicit_daemon_configuration",
        "activation_authority": false,
        "effective_authority_computed": false,
        "runtime_started": false,
        "storage_opened": false,
        "listener_opened": false,
        "process_started": false,
        "side_effects": []
    })
    .to_string()
}

/// Public-safe normalized comparison of two loader-validated configurations.
///
/// `baseline` is the value supplied to `--config`; `candidate` is the value
/// supplied to `--against`. Each selected file is observed independently, so
/// this result makes no atomic-pair or live-drift claim.
#[must_use]
pub fn config_diff_output_json_v2(
    baseline: &LoadedDaemonConfigV1,
    candidate: &LoadedDaemonConfigV1,
) -> String {
    let comparison = compare_loaded_daemon_config_v1(baseline, candidate);
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.diff",
        "configuration_contract": DAEMON_CONFIG_CONTRACT_ID_V1,
        "direction": {
            "baseline": "--config",
            "candidate": "--against"
        },
        "baseline": config_redacted_summary_v2(baseline),
        "candidate": config_redacted_summary_v2(candidate),
        "comparison": {
            "config_source_bytes_changed": comparison.config_source_bytes_changed(),
            "changed_field_groups": comparison.changed_field_groups(),
            "normalized_configuration_changed": !comparison.changed_field_groups().is_empty()
        },
        "scope": "explicit_daemon_configuration",
        "activation_authority": false,
        "effective_authority_computed": false,
        "runtime_started": false,
        "storage_opened": false,
        "listener_opened": false,
        "process_started": false,
        "side_effects": []
    })
    .to_string()
}

/// Public-safe diagnostic wrapper around the embedded JSON Schema.
///
/// # Panics
///
/// Panics only if the source-controlled embedded schema is no longer JSON.
#[must_use]
pub fn config_schema_output_json_v2() -> String {
    let configuration_schema: serde_json::Value =
        serde_json::from_str(daemon_config_schema_json_v1())
            .expect("embedded daemon configuration schema must be JSON");
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.schema",
        "configuration_contract": DAEMON_CONFIG_CONTRACT_ID_V1,
        "semantic_checks": configuration_schema["semantic_checks"].clone(),
        "configuration_schema": configuration_schema,
        "validation_scope": "explicit_daemon_configuration",
        "activation_authority": false,
        "side_effects": []
    })
    .to_string()
}

/// Public-safe declared-ceiling diagnostic for one explicit declaration.
///
/// This result is composed from an unverified declaration. It has no admission,
/// activation, identity-verification, enforcement, or action authority.
#[must_use]
pub fn config_effective_output_json_v2(loaded: &LoadedHeadlessConfigDeclarationV1) -> String {
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.effective",
        "declaration_contract": HEADLESS_CONFIG_SCHEMA_V1,
        "effective": loaded.composed().redacted_diagnostic(),
        "declared_effective_ceiling_computed": true,
        "identity_verified": false,
        "enforcement_verified": false,
        "admission_authority_computed": false,
        "activation_authority": false,
        "grants_action_authority": false,
        "runtime_started": false,
        "storage_opened": false,
        "listener_opened": false,
        "process_started": false,
        "side_effects": []
    })
    .to_string()
}

/// Public-safe non-reimportable diagnostic export for one declaration.
///
/// The export retains only the redacted composition diagnostic and is neither
/// an applicable declaration nor an activation or action request.
#[must_use]
pub fn config_export_output_json_v2(loaded: &LoadedHeadlessConfigDeclarationV1) -> String {
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.export",
        "declaration_contract": HEADLESS_CONFIG_SCHEMA_V1,
        "export_contract": "lnsat.headless_config.redacted_export.v1",
        "export": loaded.composed().redacted_diagnostic(),
        "applicable": false,
        "reimportable": false,
        "identity_verified": false,
        "enforcement_verified": false,
        "admission_authority_computed": false,
        "activation_authority": false,
        "grants_action_authority": false,
        "runtime_started": false,
        "storage_opened": false,
        "listener_opened": false,
        "process_started": false,
        "side_effects": []
    })
    .to_string()
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
            "non_root_enforced": true,
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
    let runtime_profile = loaded.docker_local_runtime_profile();
    let profile_digest = runtime_profile
        .map(crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1::profile_digest_text);
    let authority_configuration_digest = runtime_profile.map(
        crate::runtime_profile::LoadedDockerLocalRuntimeProfileV1::authority_configuration_digest_text,
    );
    let mut applied_layers = vec!["compiled_safe_defaults", "explicit_config_file"];
    if runtime_profile.is_some() {
        applied_layers.push("runtime_profile_file");
    }
    json!({
        "ok": true,
        "schema": CLI_OUTPUT_SCHEMA_V1,
        "command": "config.inspect",
        "configuration": {
            "contract_id": DAEMON_CONFIG_CONTRACT_ID_V1,
            "config_digest": loaded.config_digest(),
            "applied_layers": applied_layers,
            "source": "explicit_absolute_file",
            "system_path_selected": false,
            "user_path_selected": false,
            "ambient_environment_used": false,
            "secret_fields_allowed": false,
            "max_file_bytes": MAX_DAEMON_CONFIG_BYTES_V1,
            "control_socket_configured": loaded.control_socket_configured(),
            "phase8_runtime_configured": loaded.phase8_runtime_configured(),
            "runtime_profile": {
                "configured": loaded.docker_local_runtime_profile_configured(),
                "contract_id": runtime_profile.map(|profile| profile.profile().contract_id.as_str()),
                "profile_id": runtime_profile.map(|profile| profile.profile().profile_id.as_str()),
                "profile_family": runtime_profile.map(|profile| profile.profile().profile_family.as_str()),
                "profile_digest": profile_digest,
                "authority_configuration_digest": authority_configuration_digest,
                "source": runtime_profile.map(|_| "explicit_absolute_file")
            },
            "console_manifest_configured": loaded.console_manifest_configured()
        },
        "runtime_profile_file_opened": runtime_profile.is_some(),
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
    "Usage:\n  lnsatctl doctor [--output <text|json|jsonl|yaml>]\n  lnsatctl health --socket <absolute-path> --session-token-stdin (withdrawn; fails before stdin or connect)\n  lnsatctl status --socket <absolute-path> --session-token-stdin [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>] (withdrawn; fails before stdin or connect)\n  lnsatctl config inspect --config <absolute-path> [--output <text|json|jsonl|yaml>]\n  lnsatctl config schema --product-surface-contract lnsat.product_surface.v2 [--output <text|json|jsonl|yaml>]\n  lnsatctl config validate --config <absolute-path> --product-surface-contract lnsat.product_surface.v2 [--output <text|json|jsonl|yaml>]\n  lnsatctl config show --config <absolute-path> --product-surface-contract lnsat.product_surface.v2 [--output <text|json|jsonl|yaml>]\n  lnsatctl config diff --config <absolute-path> --against <absolute-path> --product-surface-contract lnsat.product_surface.v2 [--output <text|json|jsonl|yaml>]\n  lnsatctl config effective --declaration <absolute-path> --product-surface-contract lnsat.product_surface.v2 [--output <text|json|jsonl|yaml>]\n  lnsatctl config export --declaration <absolute-path> --product-surface-contract lnsat.product_surface.v2 [--output <text|json|jsonl|yaml>]\n  lnsatctl recovery inspect --database <path> [--output <text|json|jsonl|yaml>]\n  lnsatctl backup --database <path> --destination <fresh-path> [--output <text|json|jsonl|yaml>]\n  lnsatctl restore --backup <path> --destination <fresh-path> [--output <text|json|jsonl|yaml>]\n  lnsatctl recovery owner --database <path> --expected-owner <identity-ref> --recovered-at <timestamp> --new-password-stdin [--output <text|json|jsonl|yaml>]\n  lnsatctl manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]\n  lnsatctl completion <bash|zsh|fish>\n  lnsatctl man <lnsat|lnsatctl|lnsatd>\n  lnsatctl --help\n  lnsatctl --version\n"
}

/// Generated completion source for supported shells.
#[must_use]
pub fn completion_source_v1(shell: &str) -> Option<&'static str> {
    match shell {
        "bash" => Some(
            "_lnsatctl(){ COMPREPLY=( $(compgen -W 'doctor config recovery backup restore manifest completion man --database --destination --backup --expected-owner --recovered-at --new-password-stdin --product-surface-contract --output --help --version' -- \"${COMP_WORDS[COMP_CWORD]}\") ); }\n# health/status Unix transport withdrawn pending mutual daemon authentication\ncomplete -F _lnsatctl lnsatctl\ncomplete -W 'packet manifest completion man --product-surface-contract --help --version' lnsat\ncomplete -W '--config --database --listen --disposable-git-root --git-executable --manifest --product-surface-contract --help --version' lnsatd\n",
        ),
        "zsh" => Some(
            "#compdef lnsatctl lnsat lnsatd\n# health/status Unix transport withdrawn pending mutual daemon authentication\ncase \"$service\" in\n  lnsatctl)\n    _arguments '1:command:(doctor config recovery backup restore manifest completion man)' '--database' '--destination' '--backup' '--expected-owner' '--recovered-at' '--new-password-stdin' '--product-surface-contract' '--output' '--help' '--version' '*::argument:->args'\n    ;;\n  lnsat)\n    _arguments '1:command:(packet manifest completion man)' '--product-surface-contract' '--help' '--version' '*::argument:->args'\n    ;;\n  lnsatd)\n    _arguments '--config' '--database' '--listen' '--disposable-git-root' '--git-executable' '--manifest' '--product-surface-contract' '--help' '--version'\n    ;;\nesac\n",
        ),
        "fish" => Some(
            "# health/status Unix transport withdrawn pending mutual daemon authentication\ncomplete -c lnsatctl -f -a 'doctor config recovery backup restore manifest completion man'\ncomplete -c lnsatctl -f -l database\ncomplete -c lnsatctl -f -l destination\ncomplete -c lnsatctl -f -l backup\ncomplete -c lnsatctl -f -l expected-owner\ncomplete -c lnsatctl -f -l recovered-at\ncomplete -c lnsatctl -f -l new-password-stdin\ncomplete -c lnsatctl -f -l product-surface-contract\ncomplete -c lnsatctl -f -l output -a 'text json jsonl yaml'\ncomplete -c lnsat -f -a 'packet manifest completion man'\ncomplete -c lnsat -f -l product-surface-contract\ncomplete -c lnsatd -f -l config -l database -l listen -l disposable-git-root -l git-executable -l manifest -l product-surface-contract\n",
        ),
        _ => None,
    }
}

/// Generated source man page for one product command.
#[must_use]
pub fn man_page_source_v1(command: &str) -> Option<&'static str> {
    match command {
        "lnsat" => Some(
            ".TH LNSAT 1\n.SH NAME\nlnsat - source-only LNSAT workflow dispatcher\n.SH SYNOPSIS\nlnsat packet <validate|hash|inspect> <packet.json> [request_id] | manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]\n.SH SAFETY\nNo command grants ambient authority. Current commands are read-only or pure local inspection. Product-surface selection is exact-match only; no range or fallback exists.\n",
        ),
        "lnsatctl" => Some(
            ".TH LNSATCTL 1\n.SH NAME\nlnsatctl - source-only LNSAT operator diagnostics and offline recovery\n.SH SYNOPSIS\nlnsatctl doctor | config inspect --config <absolute-path> | config schema --product-surface-contract lnsat.product_surface.v2 | config validate --config <absolute-path> --product-surface-contract lnsat.product_surface.v2 | config show --config <absolute-path> --product-surface-contract lnsat.product_surface.v2 | config diff --config <absolute-path> --against <absolute-path> --product-surface-contract lnsat.product_surface.v2 | config effective --declaration <absolute-path> --product-surface-contract lnsat.product_surface.v2 | config export --declaration <absolute-path> --product-surface-contract lnsat.product_surface.v2 | recovery inspect --database <path> | backup --database <path> --destination <fresh-path> | restore --backup <path> --destination <fresh-path> | recovery owner --database <path> --expected-owner <identity-ref> --recovered-at <timestamp> --new-password-stdin | manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]\n.SH OUTPUT\nCommands accept --output text|json|jsonl|yaml in documented final position; JSON is default.\n.SH SAFETY\nHealth and status Unix-socket reads are withdrawn. Their legacy forms fail before protected stdin, connect, or request bytes. A replacement requires accepted mutual daemon authentication. Product-surface selection is exact-match only; no range or fallback exists. Config schema, validation, show, diff, effective, and export are v2-selected diagnostics only: they start no service, open no database, and grant no activation authority. Effective and export derive only unverified declared ceilings; they do not verify identity or enforcement, compute admission, or grant actions. Export is redacted, non-applicable, and non-reimportable. Config diff observes selected inputs sequentially and does not prove an atomic pair or live drift. Offline backup and owner recovery prove daemon quiescence through exclusive database lease. Restore creates only one fresh inert file. Owner replacement password is accepted only through protected stdin. Daemon and offline recovery commands refuse root. No API, MCP, UI, service start, automatic activation, or existing-file replacement authority exists.\n",
        ),
        "lnsatd" => Some(
            ".TH LNSATD 8\n.SH NAME\nlnsatd - source-only loopback LNSAT daemon\n.SH SYNOPSIS\nlnsatd --config <absolute-path> | --database <path> [--listen <numeric-loopback:port>] | --manifest [--product-surface-contract <lnsat.product_surface.v1|lnsat.product_surface.v2>]\n.SH SAFETY\nRuns foreground, requires explicit local storage, installs no service, and starts no service automatically. Product-surface selection is exact-match only; no range or fallback exists.\n",
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
        assert_eq!(value["recovery"]["backup"], "implemented_offline");
        assert_eq!(value["recovery"]["restore"], "implemented_inert");
        assert_eq!(
            value["recovery"]["owner_recovery"],
            "implemented_offline_protected_stdin"
        );
        assert_eq!(value["non_root"]["runtime_enforced"], true);
        assert_eq!(value["non_root"]["offline_recovery_enforced"], true);
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
            value["authenticated_read_transport"]["status"],
            "withdrawn_pending_mutual_daemon_authentication"
        );
        assert_eq!(
            value["authenticated_read_transport"]["fails_before"],
            serde_json::json!(["protected_stdin", "unix_connect", "request_bytes"])
        );
        assert_eq!(
            value["authenticated_read_transport"]["browser_header_pair_transport_changed"],
            false
        );
        assert_eq!(
            value["authenticated_read_transport"]["tcp_bearer_transport"],
            false
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
        let status_v2_fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../fixtures/contracts/daemon-status-v2.json"
        ))
        .expect("v2 status fixture must parse");
        let status_v2 = daemon_status_v2();
        assert!(status_v2.is_compatible_success());
        assert_eq!(
            serde_json::to_value(status_v2).expect("v2 status must serialize"),
            status_v2_fixture
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
    fn v2_manifest_adds_only_explicit_headless_configuration_inventory() {
        let v1: serde_json::Value = serde_json::from_str(product_surface_manifest_json_v1())
            .expect("v1 manifest must parse");
        let v2: serde_json::Value = serde_json::from_str(product_surface_manifest_json_v2())
            .expect("v2 manifest must parse");
        assert_eq!(v2["contract_id"], PRODUCT_SURFACE_CONTRACT_ID_V2);
        assert_eq!(v2["schema_version"], 2);
        for field in [
            "source_status",
            "supported_release",
            "package_or_binary_claim",
            "required_sequence",
            "optional_phase",
            "reserved_command_groups",
            "authenticated_read_transport",
            "recovery",
            "service_manager",
            "operator_assets",
            "build_manifest",
            "non_root",
            "parity",
            "hard_stops",
        ] {
            assert_eq!(v2[field], v1[field], "v2 must retain {field}");
        }
        assert_eq!(
            v2["binaries"]["lnsatctl"]["implemented_commands"],
            serde_json::json!([
                "doctor",
                "config inspect",
                "config schema",
                "config validate",
                "config show",
                "config diff",
                "config effective",
                "config export",
                "recovery inspect",
                "backup",
                "restore",
                "recovery owner",
                "manifest",
                "completion",
                "man",
                "help",
                "version",
            ])
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["selector_required"],
            true
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["show"],
            "config.show"
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["diff"],
            "config.diff"
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["effective"],
            "config.effective"
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["export"],
            "config.export"
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["declared_effective_ceiling_computed"],
            true
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["declaration_scope"],
            "explicit_headless_declaration"
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["declaration_loader_targets"],
            serde_json::json!(["linux", "macos"])
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["export_reimportable"],
            false
        );
        assert_eq!(
            v2["configuration"]["headless_diagnostics"]["admission_authority_computed"],
            false
        );
        assert_eq!(v2["hard_stops"]["phase11_or_later_implementation"], false);
    }

    #[test]
    fn offline_recovery_parity_fixture_keeps_served_channels_closed() {
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../fixtures/contracts/phase10-recovery-parity-v1.json"
        ))
        .expect("recovery parity fixture must parse");
        assert_eq!(fixture["contract_id"], "lnsat.operator_recovery.parity.v1");
        assert_eq!(
            fixture["operator_contract_id"],
            "lnsat.operator_recovery.v1"
        );
        assert_eq!(fixture["commands"].as_array().map(Vec::len), Some(3));
        for command in fixture["commands"]
            .as_array()
            .expect("commands must be an array")
        {
            assert_ne!(command["cli"], "unavailable");
            assert_eq!(command["api"], "unavailable");
            assert_eq!(command["mcp"], "unavailable");
            assert_eq!(command["ui"], "unavailable");
            assert_eq!(command["served_mutation"], false);
            assert_eq!(command["automatic_activation"], false);
        }
        assert_eq!(fixture["hard_stops"]["served_api_route"], false);
        assert_eq!(fixture["hard_stops"]["mcp_tool"], false);
        assert_eq!(fixture["hard_stops"]["ui_action"], false);
        assert_eq!(fixture["hard_stops"]["schema_change"], false);
        assert_eq!(fixture["hard_stops"]["phase11"], false);
    }

    #[test]
    fn doctor_is_secret_free_and_uses_no_ambient_environment() {
        let output = doctor_output_json_v1();
        assert!(output.contains("\"ambient_environment_used\":false"));
        assert!(output.contains("\"secret_process_arguments_allowed\":false"));
        assert!(output.contains("\"non_root_enforced\":true"));
        assert!(output.contains("\"side_effects\":[]"));
        assert!(!output.contains("HOME"));
        assert!(!output.contains("TOKEN"));
    }

    #[test]
    fn effective_uid_zero_is_always_refused() {
        assert!(!effective_uid_is_non_root_v1(0));
        assert!(effective_uid_is_non_root_v1(1));
        assert!(effective_uid_is_non_root_v1(501));
    }

    #[test]
    fn zsh_completion_has_per_binary_exact_surfaces() {
        assert_eq!(
            completion_source_v1("zsh"),
            Some(concat!(
                "#compdef lnsatctl lnsat lnsatd\n",
                "# health/status Unix transport withdrawn pending mutual daemon authentication\n",
                "case \"$service\" in\n",
                "  lnsatctl)\n",
                "    _arguments '1:command:(doctor config recovery backup restore manifest completion man)' '--database' '--destination' '--backup' '--expected-owner' '--recovered-at' '--new-password-stdin' '--product-surface-contract' '--output' '--help' '--version' '*::argument:->args'\n",
                "    ;;\n",
                "  lnsat)\n",
                "    _arguments '1:command:(packet manifest completion man)' '--product-surface-contract' '--help' '--version' '*::argument:->args'\n",
                "    ;;\n",
                "  lnsatd)\n",
                "    _arguments '--config' '--database' '--listen' '--disposable-git-root' '--git-executable' '--manifest' '--product-surface-contract' '--help' '--version'\n",
                "    ;;\n",
                "esac\n",
            ))
        );
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
            assert!(page.contains("lnsat.product_surface.v1"));
        }
        for command in ["lnsat", "lnsatctl", "lnsatd"] {
            let page = man_page_source_v1(command).expect("supported v2 man page");
            assert!(page.contains("lnsat.product_surface.v2"));
        }
        assert!(completion_source_v1("powershell").is_none());
        assert!(man_page_source_v1("unknown").is_none());
    }
}
