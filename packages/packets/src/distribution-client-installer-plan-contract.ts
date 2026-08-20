import { authSessionReadinessContract } from "./auth-session-readiness-contract.js";
import { selfDeployPackagingPlanContract } from "./self-deploy-packaging-plan-contract.js";

export const DISTRIBUTION_CLIENT_INSTALLER_PLAN_CONTRACT_STATUS = "source_only";

export const distributionClientInstallerCanonicalTargets = [
  "aarch64-apple-darwin",
  "x86_64-apple-darwin",
  "x86_64-unknown-linux-gnu",
  "aarch64-unknown-linux-gnu",
] as const;

export const distributionClientInstallerCanonicalComponents = [
  "lnsatd",
  "lnsatctl",
  "lnsat",
  "control_center_assets",
  "config_templates",
  "licenses_notices_build_manifest",
] as const;

export const distributionClientInstallerRequiredWrappers = [
  "homebrew_tap",
  "direct_tarball",
  "verified_install_script",
  "deb_package",
  "rpm_package",
  "oci_multiarch_image",
  "cargo_bootstrap_verifier",
] as const;

export const distributionClientInstallerPhase14Evidence = [
  "sha256",
  "signature_verification_bundle",
  "spdx_json_sbom",
  "slsa_v1_provenance",
  "source_revision",
  "build_recipe",
  "canonical_component_digest_map",
  "license_notice_refs",
  "reproducibility",
  "install_upgrade_rollback_uninstall",
  "non_root",
  "no_automatic_service_start",
] as const;

export const distributionClientInstallerArtifactFamilies = [
  "source_release",
  "server_installer",
  "server_runtime_bundle",
  "client_package",
  "mcp_extension_package",
] as const;

export const distributionClientInstallerSupportTiers = [
  "linux_systemd_server",
  "macos_launchd_server",
  "self_hosted_container",
  "cross_platform_cli_client",
  "windows_service_package_later",
  "hosted_saas_package_later",
] as const;

export const distributionClientInstallerRuntimeSplitKinds = [
  "node_typescript_core_server",
  "container_server_package",
  "thin_os_installer_binary",
  "cross_platform_client_package",
  "os_host_client_later",
  "optional_python_adapter_later",
] as const;

export const distributionClientInstallerFactoryCleanKinds = [
  "no_customer_data",
  "no_bundled_integrations",
  "no_credentials_or_tokens",
  "no_preconnected_systems",
  "no_tenant_assumptions",
  "no_automatic_ingestion_before_onboarding",
] as const;

export const distributionClientInstallerOnboardingStepKinds = [
  "owner_admin_setup",
  "auth_mode_selection",
  "storage_mode_selection",
  "user_owned_system_connection",
  "optional_client_enrollment",
  "secret_reference_registration",
  "readiness_checks",
  "approved_ingestion_build",
] as const;

export const distributionClientInstallerOsCapabilityKinds = [
  "process_inventory_read",
  "service_status_read",
  "log_tail_read",
  "package_version_inventory_read",
  "approved_service_restart_request",
  "approved_deploy_request",
  "diagnostic_bundle_collection",
] as const;

export const distributionClientInstallerReleaseRequirementKinds = [
  "source_commit",
  "package_version",
  "platform_architecture",
  "build_recipe",
  "checksum",
  "signature_status",
  "sbom",
  "license",
  "provenance",
  "rollback_uninstall",
  "config_template_refs",
  "no_secret_assertion",
  "audit_obligation_refs",
  "approval_prerequisite_refs",
  "disablement_path",
] as const;

export const distributionClientInstallerMcpBoundaryKinds = [
  "separate_extension_artifact",
  "capability_refs_required",
  "gateway_policy_required",
  "audit_approval_rollback_required",
  "secret_references_only",
  "state_changing_tools_blocked",
] as const;

export const distributionClientInstallerPolicyPrerequisiteKinds = [
  "bp0218_source_packet_review_ref",
  "bp0216_self_deploy_packaging_ref",
  "bp0217_auth_session_ref",
  "gateway_policy_before_client_capability_ref",
  "factory_clean_release_gate_ref",
] as const;

export const distributionClientInstallerApprovalPrerequisiteKinds = [
  "no_binary_build_request_ref",
  "no_installer_execution_request_ref",
  "no_client_enrollment_request_ref",
  "no_ingestion_request_ref",
] as const;

export const distributionClientInstallerAuditObligationKinds = [
  "distribution_plan_reviewed",
  "future_release_manifest_audit_required",
  "future_installer_audit_required",
  "future_client_capability_audit_required",
  "future_onboarding_ingestion_audit_required",
] as const;

export const distributionClientInstallerRollbackKinds = [
  "remove_source_contract_artifacts",
  "restore_bp0217_handoff",
  "disable_future_release_channel",
  "disable_future_client_capability",
] as const;

export const distributionClientInstallerValidationKinds = [
  "packet_contract_tests",
  "packet_typecheck",
  "web_management_packet_tests",
  "docs_check",
  "format_check",
  "full_workspace_check",
] as const;

export const distributionClientInstallerBlockedCapabilityFlags = [
  "package_creation_allowed",
  "package_publish_allowed",
  "binary_build_allowed",
  "installer_execution_allowed",
  "service_install_allowed",
  "service_restart_allowed",
  "client_enrollment_allowed",
  "mcp_extension_installation_allowed",
  "auth_provider_wiring_allowed",
  "credential_storage_allowed",
  "integration_setup_write_allowed",
  "database_connection_allowed",
  "database_write_allowed",
  "sql_execution_allowed",
  "ddl_execution_allowed",
  "migration_execution_allowed",
  "query_runner_allowed",
  "writer_implementation_allowed",
  "persisted_audit_writer_allowed",
  "approval_mutation_allowed",
  "queue_mutation_allowed",
  "runtime_dispatcher_allowed",
  "live_broker_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_execution_allowed",
  "deploy_allowed",
  "host_mutation_allowed",
  "ssh_allowed",
  "docker_runner_allowed",
  "node_agent_install_allowed",
  "dns_cloudflare_mutation_allowed",
  "external_service_call_allowed",
  "secret_values_allowed",
  "python_core_required",
  "os_specific_binary_core_required",
  "seeded_customer_data_allowed",
  "automatic_ingestion_before_onboarding_allowed",
] as const;

export const distributionClientInstallerPlanContract = {
  contract_id: "lnsat.platform.distribution_client_installer_plan.v0_1",
  authority: ["@lnsat/packets", "source-backed-distribution-client-installer-plan"],
  plan_version: "0.1",
  source_docs: [
    "docs/architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md",
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  self_deploy_packaging_plan_contract_id: selfDeployPackagingPlanContract.contract_id,
  auth_session_readiness_contract_id: authSessionReadinessContract.contract_id,
  contract_authority:
    "source_only_distribution_plan_no_package_build_install_enroll_or_ingest",
  open_source_application: true,
  factory_clean_install_required: true,
  onboarding_required_before_ingestion: true,
  source_canonical_artifact: true,
  phase_14_mandatory_before_v1: true,
  canonical_product_binaries_required: true,
  package_managers_rebuild_product_behavior: false,
  cross_wrapper_component_digest_equality_required: true,
  cargo_installs_bootstrap_verifier_only: true,
  service_auto_start_allowed: false,
  non_root_runtime_required: true,
  mcp_extensions_separate: true,
  core_server_python_required: false,
  core_server_os_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type DistributionClientInstallerArtifactFamily =
  (typeof distributionClientInstallerArtifactFamilies)[number];
export type DistributionClientInstallerSupportTier =
  (typeof distributionClientInstallerSupportTiers)[number];
export type DistributionClientInstallerRuntimeSplitKind =
  (typeof distributionClientInstallerRuntimeSplitKinds)[number];
export type DistributionClientInstallerFactoryCleanKind =
  (typeof distributionClientInstallerFactoryCleanKinds)[number];
export type DistributionClientInstallerOnboardingStepKind =
  (typeof distributionClientInstallerOnboardingStepKinds)[number];
export type DistributionClientInstallerOsCapabilityKind =
  (typeof distributionClientInstallerOsCapabilityKinds)[number];
export type DistributionClientInstallerReleaseRequirementKind =
  (typeof distributionClientInstallerReleaseRequirementKinds)[number];
export type DistributionClientInstallerMcpBoundaryKind =
  (typeof distributionClientInstallerMcpBoundaryKinds)[number];
export type DistributionClientInstallerPolicyPrerequisiteKind =
  (typeof distributionClientInstallerPolicyPrerequisiteKinds)[number];
export type DistributionClientInstallerApprovalPrerequisiteKind =
  (typeof distributionClientInstallerApprovalPrerequisiteKinds)[number];
export type DistributionClientInstallerAuditObligationKind =
  (typeof distributionClientInstallerAuditObligationKinds)[number];
export type DistributionClientInstallerRollbackKind =
  (typeof distributionClientInstallerRollbackKinds)[number];
export type DistributionClientInstallerValidationKind =
  (typeof distributionClientInstallerValidationKinds)[number];
export type DistributionClientInstallerBlockedCapabilityFlag =
  (typeof distributionClientInstallerBlockedCapabilityFlags)[number];

export type DistributionClientInstallerIdentityInput = {
  packet_ref: "BP-0218";
  selected_after_packet_ref: "BP-0217";
  plan_ref: "distribution_client_installer_plan:source_only";
  plan_mode: "source_contract_only";
  mvp_value: string;
};

export type DistributionClientInstallerArtifactFamilyRefInput = {
  artifact_ref: string;
  artifact_family: DistributionClientInstallerArtifactFamily;
  current_state: "future_artifact_family_source_ref_only";
  source_canonical_artifact: boolean;
  core_installer_boundary: boolean;
  mcp_extension_boundary: boolean;
  package_creation_allowed: false;
  package_publish_allowed: false;
  binary_build_allowed: false;
  installer_execution_allowed: false;
};

export type DistributionClientInstallerSupportTierRefInput = {
  support_ref: string;
  support_tier: DistributionClientInstallerSupportTier;
  current_state: "future_supported_system_source_ref_only";
  platform_owned_by_deployment_owner: true;
  service_install_allowed: false;
  host_mutation_allowed: false;
};

export type DistributionClientInstallerRuntimeSplitRefInput = {
  runtime_ref: string;
  runtime_kind: DistributionClientInstallerRuntimeSplitKind;
  current_state: "future_runtime_split_source_ref_only";
  core_server_boot_dependency: boolean;
  python_core_required: false;
  os_specific_binary_core_required: false;
  binary_build_allowed: false;
};

export type DistributionClientInstallerFactoryCleanRefInput = {
  clean_ref: string;
  clean_kind: DistributionClientInstallerFactoryCleanKind;
  required_for_release: true;
  current_state: "factory_clean_requirement_source_ref_only";
  seeded_customer_data_allowed: false;
  automatic_ingestion_before_onboarding_allowed: false;
  credential_storage_allowed: false;
};

export type DistributionClientInstallerOnboardingStepRefInput = {
  onboarding_ref: string;
  onboarding_kind: DistributionClientInstallerOnboardingStepKind;
  current_state: "future_onboarding_step_source_ref_only";
  requires_deployment_owner_choice: true;
  stores_secret_values: false;
  mutates_external_system: false;
  ingestion_allowed_before_step: false;
};

export type DistributionClientInstallerOsCapabilityRefInput = {
  capability_ref: string;
  capability_kind: DistributionClientInstallerOsCapabilityKind;
  current_state: "future_client_capability_source_ref_only";
  gateway_approval_required: true;
  audit_required: true;
  direct_shell_allowed: false;
  ssh_allowed: false;
  host_mutation_allowed: false;
};

export type DistributionClientInstallerReleaseRequirementRefInput = {
  requirement_ref: string;
  requirement_kind: DistributionClientInstallerReleaseRequirementKind;
  current_state: "future_release_requirement_source_ref_only";
  required_before_package_publish: true;
  package_publish_allowed: false;
  secret_values_allowed: false;
};

export type DistributionClientInstallerMcpBoundaryRefInput = {
  mcp_ref: string;
  mcp_kind: DistributionClientInstallerMcpBoundaryKind;
  current_state: "future_mcp_extension_boundary_source_ref_only";
  core_installer_dependency: false;
  gateway_policy_required: true;
  mcp_is_security_boundary: false;
  mcp_extension_installation_allowed: false;
};

export type DistributionClientInstallerPolicyPrerequisiteRefInput = {
  prerequisite_ref: string;
  prerequisite_kind: DistributionClientInstallerPolicyPrerequisiteKind;
  current_state: "source_ref_only_no_policy_mutation";
  approval_mutation_allowed: false;
  live_execution_allowed: false;
};

export type DistributionClientInstallerApprovalPrerequisiteRefInput = {
  approval_ref: string;
  approval_kind: DistributionClientInstallerApprovalPrerequisiteKind;
  required_before_future_release_or_ingestion: true;
  current_state: "source_ref_only_no_approval_request_created";
  approval_mutation_allowed: false;
};

export type DistributionClientInstallerAuditObligationRefInput = {
  audit_ref: string;
  audit_kind: DistributionClientInstallerAuditObligationKind;
  required_before_future_release_or_ingestion: true;
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  persisted_audit_writer_allowed: false;
};

export type DistributionClientInstallerRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: DistributionClientInstallerRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  package_publish_allowed: false;
};

export type DistributionClientInstallerValidationCommandRefInput = {
  validation_ref: string;
  validation_kind: DistributionClientInstallerValidationKind;
  command_ref: string;
  current_state: "named_validation_only";
  live_execution_allowed: false;
};

export type DistributionClientInstallerSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type DistributionClientInstallerNoLivePostureInput = Record<
  DistributionClientInstallerBlockedCapabilityFlag,
  false
>;

export type DistributionClientInstallerAllowedStateInput =
  DistributionClientInstallerNoLivePostureInput & {
    source_only_distribution_plan_allowed: true;
    artifact_family_refs_allowed: true;
    support_tier_refs_allowed: true;
    runtime_split_refs_allowed: true;
    factory_clean_refs_allowed: true;
    onboarding_step_refs_allowed: true;
    os_capability_refs_allowed: true;
    release_requirement_refs_allowed: true;
    mcp_boundary_refs_allowed: true;
    open_source_application: true;
    factory_clean_install_required: true;
    onboarding_required_before_ingestion: true;
    source_canonical_artifact: true;
    mcp_extensions_separate: true;
    core_server_python_required: false;
    core_server_os_binary_required: false;
    secret_posture: "references_only_no_values";
  };

export type DistributionClientInstallerPlanRequest = Partial<
  Record<DistributionClientInstallerBlockedCapabilityFlag, false>
> & {
  plan_version?: typeof distributionClientInstallerPlanContract.plan_version;
  plan_identity?: DistributionClientInstallerIdentityInput;
  artifact_family_refs?: DistributionClientInstallerArtifactFamilyRefInput[];
  support_tier_refs?: DistributionClientInstallerSupportTierRefInput[];
  runtime_split_refs?: DistributionClientInstallerRuntimeSplitRefInput[];
  factory_clean_refs?: DistributionClientInstallerFactoryCleanRefInput[];
  onboarding_step_refs?: DistributionClientInstallerOnboardingStepRefInput[];
  os_capability_refs?: DistributionClientInstallerOsCapabilityRefInput[];
  release_requirement_refs?: DistributionClientInstallerReleaseRequirementRefInput[];
  mcp_boundary_refs?: DistributionClientInstallerMcpBoundaryRefInput[];
  policy_prerequisite_refs?: DistributionClientInstallerPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs?: DistributionClientInstallerApprovalPrerequisiteRefInput[];
  audit_obligation_refs?: DistributionClientInstallerAuditObligationRefInput[];
  rollback_refs?: DistributionClientInstallerRollbackRefInput[];
  validation_command_refs?: DistributionClientInstallerValidationCommandRefInput[];
  source_refs?: DistributionClientInstallerSourceRefInput[];
  no_live_posture?: DistributionClientInstallerNoLivePostureInput;
  allowed_state?: DistributionClientInstallerAllowedStateInput;
  contract_authority?: typeof distributionClientInstallerPlanContract.contract_authority;
  side_effects?: [];
};

export type DistributionClientInstallerPlanErrorCode =
  | "distribution_client_installer.invalid_request"
  | "distribution_client_installer.unexpected_field"
  | "distribution_client_installer.invalid_version"
  | "distribution_client_installer.invalid_identity"
  | "distribution_client_installer.artifact_family_ref_required"
  | "distribution_client_installer.invalid_artifact_family_ref"
  | "distribution_client_installer.support_tier_ref_required"
  | "distribution_client_installer.invalid_support_tier_ref"
  | "distribution_client_installer.runtime_split_ref_required"
  | "distribution_client_installer.invalid_runtime_split_ref"
  | "distribution_client_installer.factory_clean_ref_required"
  | "distribution_client_installer.invalid_factory_clean_ref"
  | "distribution_client_installer.onboarding_step_ref_required"
  | "distribution_client_installer.invalid_onboarding_step_ref"
  | "distribution_client_installer.os_capability_ref_required"
  | "distribution_client_installer.invalid_os_capability_ref"
  | "distribution_client_installer.release_requirement_ref_required"
  | "distribution_client_installer.invalid_release_requirement_ref"
  | "distribution_client_installer.mcp_boundary_ref_required"
  | "distribution_client_installer.invalid_mcp_boundary_ref"
  | "distribution_client_installer.policy_prerequisite_ref_required"
  | "distribution_client_installer.invalid_policy_prerequisite_ref"
  | "distribution_client_installer.approval_prerequisite_ref_required"
  | "distribution_client_installer.invalid_approval_prerequisite_ref"
  | "distribution_client_installer.audit_obligation_ref_required"
  | "distribution_client_installer.invalid_audit_obligation_ref"
  | "distribution_client_installer.rollback_ref_required"
  | "distribution_client_installer.invalid_rollback_ref"
  | "distribution_client_installer.validation_command_ref_required"
  | "distribution_client_installer.invalid_validation_command_ref"
  | "distribution_client_installer.source_ref_required"
  | "distribution_client_installer.invalid_source_ref"
  | "distribution_client_installer.no_live_posture_required"
  | "distribution_client_installer.no_live_posture_drift"
  | "distribution_client_installer.allowed_state_required"
  | "distribution_client_installer.allowed_state_drift"
  | "distribution_client_installer.unsafe_contract_authority"
  | "distribution_client_installer.package_or_binary_forbidden"
  | "distribution_client_installer.install_or_client_forbidden"
  | "distribution_client_installer.seed_or_ingestion_forbidden"
  | "distribution_client_installer.host_or_runtime_forbidden"
  | "distribution_client_installer.database_or_writer_forbidden"
  | "distribution_client_installer.auth_or_integration_forbidden"
  | "distribution_client_installer.external_service_forbidden"
  | "distribution_client_installer.secret_value_forbidden"
  | "distribution_client_installer.blocked_capability_forbidden"
  | "distribution_client_installer.side_effects_forbidden";

export type DistributionClientInstallerPlanError = {
  code: DistributionClientInstallerPlanErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type DistributionClientInstallerPlanEvidence = {
  contract_id: typeof distributionClientInstallerPlanContract.contract_id;
  plan_version: typeof distributionClientInstallerPlanContract.plan_version;
  plan_identity: DistributionClientInstallerIdentityInput;
  self_deploy_packaging_plan_contract_id: typeof selfDeployPackagingPlanContract.contract_id;
  auth_session_readiness_contract_id: typeof authSessionReadinessContract.contract_id;
  artifact_family_refs: DistributionClientInstallerArtifactFamilyRefInput[];
  support_tier_refs: DistributionClientInstallerSupportTierRefInput[];
  runtime_split_refs: DistributionClientInstallerRuntimeSplitRefInput[];
  factory_clean_refs: DistributionClientInstallerFactoryCleanRefInput[];
  onboarding_step_refs: DistributionClientInstallerOnboardingStepRefInput[];
  os_capability_refs: DistributionClientInstallerOsCapabilityRefInput[];
  release_requirement_refs: DistributionClientInstallerReleaseRequirementRefInput[];
  mcp_boundary_refs: DistributionClientInstallerMcpBoundaryRefInput[];
  policy_prerequisite_refs: DistributionClientInstallerPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs: DistributionClientInstallerApprovalPrerequisiteRefInput[];
  audit_obligation_refs: DistributionClientInstallerAuditObligationRefInput[];
  rollback_refs: DistributionClientInstallerRollbackRefInput[];
  validation_command_refs: DistributionClientInstallerValidationCommandRefInput[];
  source_refs: string[];
  no_live_posture: DistributionClientInstallerNoLivePostureInput;
  allowed_state: DistributionClientInstallerAllowedStateInput;
  blocked_capabilities: DistributionClientInstallerBlockedCapabilityFlag[];
  source_contract_artifacts: [
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    "packages/packets/src/distribution-client-installer-plan-contract.ts",
    "packages/packets/test/distribution-client-installer-plan-contract.test.ts",
  ];
  package_artifacts: [];
  installer_artifacts: [];
  binary_artifacts: [];
  service_install_artifacts: [];
  client_enrollment_artifacts: [];
  mcp_extension_install_artifacts: [];
  runtime_artifacts: [];
  database_artifacts: [];
  auth_runtime_artifacts: [];
  integration_runtime_artifacts: [];
  seeded_customer_data: [];
  external_service_clients: [];
  automatic_ingestion_before_onboarding_allowed: false;
  package_creation_allowed: false;
  package_publish_allowed: false;
  binary_build_allowed: false;
  installer_execution_allowed: false;
  client_enrollment_allowed: false;
  auth_provider_wiring_allowed: false;
  integration_setup_write_allowed: false;
  python_core_required: false;
  os_specific_binary_core_required: false;
  side_effects: [];
};

export type DistributionClientInstallerPlanResult =
  | {
      ok: true;
      distribution_client_installer_plan: DistributionClientInstallerPlanEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      distribution_client_installer_plan: null;
      errors: DistributionClientInstallerPlanError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedDistributionClientInstallerPlan =
  | {
      ok: true;
      plan_identity: DistributionClientInstallerIdentityInput;
      artifact_family_refs: DistributionClientInstallerArtifactFamilyRefInput[];
      support_tier_refs: DistributionClientInstallerSupportTierRefInput[];
      runtime_split_refs: DistributionClientInstallerRuntimeSplitRefInput[];
      factory_clean_refs: DistributionClientInstallerFactoryCleanRefInput[];
      onboarding_step_refs: DistributionClientInstallerOnboardingStepRefInput[];
      os_capability_refs: DistributionClientInstallerOsCapabilityRefInput[];
      release_requirement_refs: DistributionClientInstallerReleaseRequirementRefInput[];
      mcp_boundary_refs: DistributionClientInstallerMcpBoundaryRefInput[];
      policy_prerequisite_refs: DistributionClientInstallerPolicyPrerequisiteRefInput[];
      approval_prerequisite_refs: DistributionClientInstallerApprovalPrerequisiteRefInput[];
      audit_obligation_refs: DistributionClientInstallerAuditObligationRefInput[];
      rollback_refs: DistributionClientInstallerRollbackRefInput[];
      validation_command_refs: DistributionClientInstallerValidationCommandRefInput[];
      source_refs: string[];
      no_live_posture: DistributionClientInstallerNoLivePostureInput;
      allowed_state: DistributionClientInstallerAllowedStateInput;
    }
  | {
      ok: false;
      errors: DistributionClientInstallerPlanError[];
    };

const requestKeys = new Set([
  "plan_version",
  "plan_identity",
  "artifact_family_refs",
  "support_tier_refs",
  "runtime_split_refs",
  "factory_clean_refs",
  "onboarding_step_refs",
  "os_capability_refs",
  "release_requirement_refs",
  "mcp_boundary_refs",
  "policy_prerequisite_refs",
  "approval_prerequisite_refs",
  "audit_obligation_refs",
  "rollback_refs",
  "validation_command_refs",
  "source_refs",
  "no_live_posture",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...distributionClientInstallerBlockedCapabilityFlags,
]);

const artifactFamilySet = new Set<string>(distributionClientInstallerArtifactFamilies);
const supportTierSet = new Set<string>(distributionClientInstallerSupportTiers);
const runtimeSplitSet = new Set<string>(distributionClientInstallerRuntimeSplitKinds);
const factoryCleanSet = new Set<string>(distributionClientInstallerFactoryCleanKinds);
const onboardingStepSet = new Set<string>(
  distributionClientInstallerOnboardingStepKinds,
);
const osCapabilitySet = new Set<string>(distributionClientInstallerOsCapabilityKinds);
const releaseRequirementSet = new Set<string>(
  distributionClientInstallerReleaseRequirementKinds,
);
const mcpBoundarySet = new Set<string>(distributionClientInstallerMcpBoundaryKinds);
const policyPrerequisiteSet = new Set<string>(
  distributionClientInstallerPolicyPrerequisiteKinds,
);
const approvalPrerequisiteSet = new Set<string>(
  distributionClientInstallerApprovalPrerequisiteKinds,
);
const auditObligationSet = new Set<string>(
  distributionClientInstallerAuditObligationKinds,
);
const rollbackSet = new Set<string>(distributionClientInstallerRollbackKinds);
const validationSet = new Set<string>(distributionClientInstallerValidationKinds);

const safeIdPattern = /^[a-z][a-z0-9_.:-]{2,120}$/;
const safeCommandRefPattern =
  /^npm run (?:test -w @lnsat\/packets -- distribution-client-installer-plan-contract|typecheck -w @lnsat\/packets|test -w @lnsat\/web -- packet-management management-overview management-surface-index|docs:check|format:check|check)$/;
const safeSourceRefPattern =
  /^(?:docs\/[A-Za-z0-9_./-]+|packages\/packets\/(?:src|test)\/[A-Za-z0-9_.-]+\.ts)$/;
const unsafeValuePattern =
  /(?:DATABASE_URL|postgres:\/\/|mysql:\/\/|mongodb:\/\/|PRIVATE KEY|BEGIN [A-Z ]*KEY|API_KEY|SECRET=|TOKEN=|PASSWORD|credential_value|provider_account|gh[pous]_[A-Za-z0-9]|sk-[A-Za-z0-9]|xox[baprs]-|cloudflare_api_token|https?:\/\/|ssh:\/\/|file:\/\/)/i;
const packageOrBinaryPattern =
  /(?:npm publish|package publish|package creation|binary build|build binary|docker build|codesign|notarize|msi build|pkgbuild|rpm build|deb build)/i;
const installOrClientPattern =
  /(?:installer execution|service install|service restart|client enrollment|node-agent install|mcp extension installation|launchd install|systemd install|windows service install)/i;
const seedOrIngestionPattern =
  /(?:seed customer data|seeded customer data|preconnected system|preconnected external|automatic ingestion before onboarding|ingest before onboarding)/i;
const runtimeOrHostPattern =
  /(?:runtime dispatcher|live adapter|live execution|live broker|docker run|ssh |raw shell|root helper|host mutation|vm launch)/i;
const databaseOrWriterPattern =
  /(?:database connection|db write|sql execution|ddl execution|migration execution|query runner|writer implementation|queue mutation|persisted audit writer)/i;
const authOrIntegrationPattern =
  /(?:auth provider wiring|session db|credential storage|integration setup write|live connector|permission mutation|jwt signing|callback route)/i;
const externalServicePattern = /(?:external service call|invoke integration)/i;

export const defaultDistributionClientInstallerIdentity: DistributionClientInstallerIdentityInput =
  {
    packet_ref: "BP-0218",
    selected_after_packet_ref: "BP-0217",
    plan_ref: "distribution_client_installer_plan:source_only",
    plan_mode: "source_contract_only",
    mvp_value:
      "Define factory-clean downloadable release, setup, onboarding, supported clients, and extension boundaries before package or install scope opens.",
  };

export const defaultDistributionClientInstallerArtifactFamilyRefs: DistributionClientInstallerArtifactFamilyRefInput[] =
  distributionClientInstallerArtifactFamilies.map((family) => ({
    artifact_ref: `distribution_artifact:${family}`,
    artifact_family: family,
    current_state: "future_artifact_family_source_ref_only",
    source_canonical_artifact: family === "source_release",
    core_installer_boundary: family !== "mcp_extension_package",
    mcp_extension_boundary: family === "mcp_extension_package",
    package_creation_allowed: false,
    package_publish_allowed: false,
    binary_build_allowed: false,
    installer_execution_allowed: false,
  }));

export const defaultDistributionClientInstallerSupportTierRefs: DistributionClientInstallerSupportTierRefInput[] =
  distributionClientInstallerSupportTiers.map((tier) => ({
    support_ref: `support_tier:${tier}`,
    support_tier: tier,
    current_state: "future_supported_system_source_ref_only",
    platform_owned_by_deployment_owner: true,
    service_install_allowed: false,
    host_mutation_allowed: false,
  }));

export const defaultDistributionClientInstallerRuntimeSplitRefs: DistributionClientInstallerRuntimeSplitRefInput[] =
  distributionClientInstallerRuntimeSplitKinds.map((kind) => ({
    runtime_ref: `runtime_split:${kind}`,
    runtime_kind: kind,
    current_state: "future_runtime_split_source_ref_only",
    core_server_boot_dependency: kind === "node_typescript_core_server",
    python_core_required: false,
    os_specific_binary_core_required: false,
    binary_build_allowed: false,
  }));

export const defaultDistributionClientInstallerFactoryCleanRefs: DistributionClientInstallerFactoryCleanRefInput[] =
  distributionClientInstallerFactoryCleanKinds.map((kind) => ({
    clean_ref: `factory_clean:${kind}`,
    clean_kind: kind,
    required_for_release: true,
    current_state: "factory_clean_requirement_source_ref_only",
    seeded_customer_data_allowed: false,
    automatic_ingestion_before_onboarding_allowed: false,
    credential_storage_allowed: false,
  }));

export const defaultDistributionClientInstallerOnboardingStepRefs: DistributionClientInstallerOnboardingStepRefInput[] =
  distributionClientInstallerOnboardingStepKinds.map((kind) => ({
    onboarding_ref: `onboarding_step:${kind}`,
    onboarding_kind: kind,
    current_state: "future_onboarding_step_source_ref_only",
    requires_deployment_owner_choice: true,
    stores_secret_values: false,
    mutates_external_system: false,
    ingestion_allowed_before_step: false,
  }));

export const defaultDistributionClientInstallerOsCapabilityRefs: DistributionClientInstallerOsCapabilityRefInput[] =
  distributionClientInstallerOsCapabilityKinds.map((kind) => ({
    capability_ref: `os_client_capability:${kind}`,
    capability_kind: kind,
    current_state: "future_client_capability_source_ref_only",
    gateway_approval_required: true,
    audit_required: true,
    direct_shell_allowed: false,
    ssh_allowed: false,
    host_mutation_allowed: false,
  }));

export const defaultDistributionClientInstallerReleaseRequirementRefs: DistributionClientInstallerReleaseRequirementRefInput[] =
  distributionClientInstallerReleaseRequirementKinds.map((kind) => ({
    requirement_ref: `release_requirement:${kind}`,
    requirement_kind: kind,
    current_state: "future_release_requirement_source_ref_only",
    required_before_package_publish: true,
    package_publish_allowed: false,
    secret_values_allowed: false,
  }));

export const defaultDistributionClientInstallerMcpBoundaryRefs: DistributionClientInstallerMcpBoundaryRefInput[] =
  distributionClientInstallerMcpBoundaryKinds.map((kind) => ({
    mcp_ref: `mcp_extension_boundary:${kind}`,
    mcp_kind: kind,
    current_state: "future_mcp_extension_boundary_source_ref_only",
    core_installer_dependency: false,
    gateway_policy_required: true,
    mcp_is_security_boundary: false,
    mcp_extension_installation_allowed: false,
  }));

export const defaultDistributionClientInstallerPolicyPrerequisiteRefs: DistributionClientInstallerPolicyPrerequisiteRefInput[] =
  distributionClientInstallerPolicyPrerequisiteKinds.map((kind) => ({
    prerequisite_ref: `policy_prerequisite:${kind}`,
    prerequisite_kind: kind,
    current_state: "source_ref_only_no_policy_mutation",
    approval_mutation_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultDistributionClientInstallerApprovalPrerequisiteRefs: DistributionClientInstallerApprovalPrerequisiteRefInput[] =
  distributionClientInstallerApprovalPrerequisiteKinds.map((kind) => ({
    approval_ref: `approval_prerequisite:${kind}`,
    approval_kind: kind,
    required_before_future_release_or_ingestion: true,
    current_state: "source_ref_only_no_approval_request_created",
    approval_mutation_allowed: false,
  }));

export const defaultDistributionClientInstallerAuditObligationRefs: DistributionClientInstallerAuditObligationRefInput[] =
  distributionClientInstallerAuditObligationKinds.map((kind) => ({
    audit_ref: `audit_obligation:${kind}`,
    audit_kind: kind,
    required_before_future_release_or_ingestion: true,
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    persisted_audit_writer_allowed: false,
  }));

export const defaultDistributionClientInstallerRollbackRefs: DistributionClientInstallerRollbackRefInput[] =
  distributionClientInstallerRollbackKinds.map((kind) => ({
    rollback_ref: `rollback:${kind}`,
    rollback_kind: kind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    package_publish_allowed: false,
  }));

const defaultDistributionClientInstallerValidationCommandTuples: readonly [
  DistributionClientInstallerValidationKind,
  string,
][] = [
  [
    "packet_contract_tests",
    "npm run test -w @lnsat/packets -- distribution-client-installer-plan-contract",
  ],
  ["packet_typecheck", "npm run typecheck -w @lnsat/packets"],
  [
    "web_management_packet_tests",
    "npm run test -w @lnsat/web -- packet-management management-overview management-surface-index",
  ],
  ["docs_check", "npm run docs:check"],
  ["format_check", "npm run format:check"],
  ["full_workspace_check", "npm run check"],
];

export const defaultDistributionClientInstallerValidationCommandRefs: DistributionClientInstallerValidationCommandRefInput[] =
  defaultDistributionClientInstallerValidationCommandTuples.map(
    ([validation_kind, command_ref]) => ({
      validation_ref: `validation:${validation_kind}`,
      validation_kind,
      command_ref,
      current_state: "named_validation_only",
      live_execution_allowed: false,
    }),
  );

export const defaultDistributionClientInstallerSourceRefs: DistributionClientInstallerSourceRefInput[] =
  [
    "docs/architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md",
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/distribution-client-installer-plan-contract.ts",
    "packages/packets/test/distribution-client-installer-plan-contract.test.ts",
  ].map((source_ref) => ({
    source_ref,
    summary:
      "Repo-local source evidence for BP-0218 distribution and client installer planning.",
  }));

export const defaultDistributionClientInstallerNoLivePosture = Object.fromEntries(
  distributionClientInstallerBlockedCapabilityFlags.map((flag) => [flag, false]),
) as DistributionClientInstallerNoLivePostureInput;

export const defaultDistributionClientInstallerAllowedState: DistributionClientInstallerAllowedStateInput =
  {
    ...defaultDistributionClientInstallerNoLivePosture,
    source_only_distribution_plan_allowed: true,
    artifact_family_refs_allowed: true,
    support_tier_refs_allowed: true,
    runtime_split_refs_allowed: true,
    factory_clean_refs_allowed: true,
    onboarding_step_refs_allowed: true,
    os_capability_refs_allowed: true,
    release_requirement_refs_allowed: true,
    mcp_boundary_refs_allowed: true,
    open_source_application: true,
    factory_clean_install_required: true,
    onboarding_required_before_ingestion: true,
    source_canonical_artifact: true,
    mcp_extensions_separate: true,
    core_server_python_required: false,
    core_server_os_binary_required: false,
    secret_posture: "references_only_no_values",
  };

export const defaultDistributionClientInstallerPlan: DistributionClientInstallerPlanRequest =
  {
    plan_version: distributionClientInstallerPlanContract.plan_version,
    plan_identity: defaultDistributionClientInstallerIdentity,
    artifact_family_refs: defaultDistributionClientInstallerArtifactFamilyRefs,
    support_tier_refs: defaultDistributionClientInstallerSupportTierRefs,
    runtime_split_refs: defaultDistributionClientInstallerRuntimeSplitRefs,
    factory_clean_refs: defaultDistributionClientInstallerFactoryCleanRefs,
    onboarding_step_refs: defaultDistributionClientInstallerOnboardingStepRefs,
    os_capability_refs: defaultDistributionClientInstallerOsCapabilityRefs,
    release_requirement_refs: defaultDistributionClientInstallerReleaseRequirementRefs,
    mcp_boundary_refs: defaultDistributionClientInstallerMcpBoundaryRefs,
    policy_prerequisite_refs: defaultDistributionClientInstallerPolicyPrerequisiteRefs,
    approval_prerequisite_refs:
      defaultDistributionClientInstallerApprovalPrerequisiteRefs,
    audit_obligation_refs: defaultDistributionClientInstallerAuditObligationRefs,
    rollback_refs: defaultDistributionClientInstallerRollbackRefs,
    validation_command_refs: defaultDistributionClientInstallerValidationCommandRefs,
    source_refs: defaultDistributionClientInstallerSourceRefs,
    no_live_posture: defaultDistributionClientInstallerNoLivePosture,
    allowed_state: defaultDistributionClientInstallerAllowedState,
    contract_authority: distributionClientInstallerPlanContract.contract_authority,
    side_effects: [],
  };

export function createDistributionClientInstallerPlan(
  request: DistributionClientInstallerPlanRequest = {},
): DistributionClientInstallerPlanResult {
  const normalized = normalizeDistributionClientInstallerPlan({
    ...defaultDistributionClientInstallerPlan,
    ...request,
  });

  if (!normalized.ok) {
    return failDistributionClientInstallerPlan(normalized.errors);
  }

  return {
    ok: true,
    distribution_client_installer_plan: {
      contract_id: distributionClientInstallerPlanContract.contract_id,
      plan_version: distributionClientInstallerPlanContract.plan_version,
      plan_identity: normalized.plan_identity,
      self_deploy_packaging_plan_contract_id:
        selfDeployPackagingPlanContract.contract_id,
      auth_session_readiness_contract_id: authSessionReadinessContract.contract_id,
      artifact_family_refs: normalized.artifact_family_refs,
      support_tier_refs: normalized.support_tier_refs,
      runtime_split_refs: normalized.runtime_split_refs,
      factory_clean_refs: normalized.factory_clean_refs,
      onboarding_step_refs: normalized.onboarding_step_refs,
      os_capability_refs: normalized.os_capability_refs,
      release_requirement_refs: normalized.release_requirement_refs,
      mcp_boundary_refs: normalized.mcp_boundary_refs,
      policy_prerequisite_refs: normalized.policy_prerequisite_refs,
      approval_prerequisite_refs: normalized.approval_prerequisite_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      validation_command_refs: normalized.validation_command_refs,
      source_refs: normalized.source_refs,
      no_live_posture: normalized.no_live_posture,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...distributionClientInstallerBlockedCapabilityFlags],
      source_contract_artifacts: [
        "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
        "packages/packets/src/distribution-client-installer-plan-contract.ts",
        "packages/packets/test/distribution-client-installer-plan-contract.test.ts",
      ],
      package_artifacts: [],
      installer_artifacts: [],
      binary_artifacts: [],
      service_install_artifacts: [],
      client_enrollment_artifacts: [],
      mcp_extension_install_artifacts: [],
      runtime_artifacts: [],
      database_artifacts: [],
      auth_runtime_artifacts: [],
      integration_runtime_artifacts: [],
      seeded_customer_data: [],
      external_service_clients: [],
      automatic_ingestion_before_onboarding_allowed: false,
      package_creation_allowed: false,
      package_publish_allowed: false,
      binary_build_allowed: false,
      installer_execution_allowed: false,
      client_enrollment_allowed: false,
      auth_provider_wiring_allowed: false,
      integration_setup_write_allowed: false,
      python_core_required: false,
      os_specific_binary_core_required: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeDistributionClientInstallerPlan(
  request: DistributionClientInstallerPlanRequest,
): NormalizedDistributionClientInstallerPlan {
  const errors: DistributionClientInstallerPlanError[] = [];

  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    return {
      ok: false,
      errors: [
        error(
          "distribution_client_installer.invalid_request",
          "/",
          "Request must be an object.",
        ),
      ],
    };
  }

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        error(
          "distribution_client_installer.unexpected_field",
          `/${key}`,
          "Unexpected field is not allowed.",
        ),
      );
    }
  }

  if (request.plan_version !== distributionClientInstallerPlanContract.plan_version) {
    errors.push(
      error(
        "distribution_client_installer.invalid_version",
        "/plan_version",
        "Plan version must match source contract.",
      ),
    );
  }

  const planIdentity = request.plan_identity;
  if (
    !planIdentity ||
    planIdentity.packet_ref !== "BP-0218" ||
    planIdentity.selected_after_packet_ref !== "BP-0217" ||
    planIdentity.plan_ref !== "distribution_client_installer_plan:source_only" ||
    planIdentity.plan_mode !== "source_contract_only" ||
    !safeText(planIdentity.mvp_value)
  ) {
    errors.push(
      error(
        "distribution_client_installer.invalid_identity",
        "/plan_identity",
        "Plan identity must name BP-0218 source-only distribution evidence.",
      ),
    );
  }

  const artifactFamilyRefs = validateRefs(
    request.artifact_family_refs,
    distributionClientInstallerArtifactFamilies,
    "artifact_family_refs",
    "artifact_family",
    "artifact_ref",
    validateArtifactFamilyRef,
    errors,
  );
  const supportTierRefs = validateRefs(
    request.support_tier_refs,
    distributionClientInstallerSupportTiers,
    "support_tier_refs",
    "support_tier",
    "support_ref",
    validateSupportTierRef,
    errors,
  );
  const runtimeSplitRefs = validateRefs(
    request.runtime_split_refs,
    distributionClientInstallerRuntimeSplitKinds,
    "runtime_split_refs",
    "runtime_kind",
    "runtime_ref",
    validateRuntimeSplitRef,
    errors,
  );
  const factoryCleanRefs = validateRefs(
    request.factory_clean_refs,
    distributionClientInstallerFactoryCleanKinds,
    "factory_clean_refs",
    "clean_kind",
    "clean_ref",
    validateFactoryCleanRef,
    errors,
  );
  const onboardingStepRefs = validateRefs(
    request.onboarding_step_refs,
    distributionClientInstallerOnboardingStepKinds,
    "onboarding_step_refs",
    "onboarding_kind",
    "onboarding_ref",
    validateOnboardingStepRef,
    errors,
  );
  const osCapabilityRefs = validateRefs(
    request.os_capability_refs,
    distributionClientInstallerOsCapabilityKinds,
    "os_capability_refs",
    "capability_kind",
    "capability_ref",
    validateOsCapabilityRef,
    errors,
  );
  const releaseRequirementRefs = validateRefs(
    request.release_requirement_refs,
    distributionClientInstallerReleaseRequirementKinds,
    "release_requirement_refs",
    "requirement_kind",
    "requirement_ref",
    validateReleaseRequirementRef,
    errors,
  );
  const mcpBoundaryRefs = validateRefs(
    request.mcp_boundary_refs,
    distributionClientInstallerMcpBoundaryKinds,
    "mcp_boundary_refs",
    "mcp_kind",
    "mcp_ref",
    validateMcpBoundaryRef,
    errors,
  );
  const policyPrerequisiteRefs = validateRefs(
    request.policy_prerequisite_refs,
    distributionClientInstallerPolicyPrerequisiteKinds,
    "policy_prerequisite_refs",
    "prerequisite_kind",
    "prerequisite_ref",
    validatePolicyPrerequisiteRef,
    errors,
  );
  const approvalPrerequisiteRefs = validateRefs(
    request.approval_prerequisite_refs,
    distributionClientInstallerApprovalPrerequisiteKinds,
    "approval_prerequisite_refs",
    "approval_kind",
    "approval_ref",
    validateApprovalPrerequisiteRef,
    errors,
  );
  const auditObligationRefs = validateRefs(
    request.audit_obligation_refs,
    distributionClientInstallerAuditObligationKinds,
    "audit_obligation_refs",
    "audit_kind",
    "audit_ref",
    validateAuditObligationRef,
    errors,
  );
  const rollbackRefs = validateRefs(
    request.rollback_refs,
    distributionClientInstallerRollbackKinds,
    "rollback_refs",
    "rollback_kind",
    "rollback_ref",
    validateRollbackRef,
    errors,
  );
  const validationCommandRefs = validateRefs(
    request.validation_command_refs,
    distributionClientInstallerValidationKinds,
    "validation_command_refs",
    "validation_kind",
    "validation_ref",
    validateValidationCommandRef,
    errors,
  );

  const sourceRefs = validateSourceRefs(request.source_refs, errors);
  const noLivePosture = validateNoLivePosture(request.no_live_posture, errors);
  const allowedState = validateAllowedState(request.allowed_state, errors);

  if (
    request.contract_authority !==
    distributionClientInstallerPlanContract.contract_authority
  ) {
    errors.push(
      error(
        "distribution_client_installer.unsafe_contract_authority",
        "/contract_authority",
        "Contract authority must stay source-only and no package/install/enroll/ingest.",
      ),
    );
  }

  validateForbiddenScope(request, errors);

  if (Array.isArray(request.side_effects) && request.side_effects.length > 0) {
    errors.push(
      error(
        "distribution_client_installer.side_effects_forbidden",
        "/side_effects",
        "Side effects must stay empty.",
      ),
    );
  }

  if (errors.length > 0 || !planIdentity) {
    return { ok: false, errors: uniqueErrors(errors) };
  }

  return {
    ok: true,
    plan_identity: planIdentity,
    artifact_family_refs: artifactFamilyRefs,
    support_tier_refs: supportTierRefs,
    runtime_split_refs: runtimeSplitRefs,
    factory_clean_refs: factoryCleanRefs,
    onboarding_step_refs: onboardingStepRefs,
    os_capability_refs: osCapabilityRefs,
    release_requirement_refs: releaseRequirementRefs,
    mcp_boundary_refs: mcpBoundaryRefs,
    policy_prerequisite_refs: policyPrerequisiteRefs,
    approval_prerequisite_refs: approvalPrerequisiteRefs,
    audit_obligation_refs: auditObligationRefs,
    rollback_refs: rollbackRefs,
    validation_command_refs: validationCommandRefs,
    source_refs: sourceRefs,
    no_live_posture: noLivePosture,
    allowed_state: allowedState,
  };
}

function validateRefs<T extends Record<string, unknown>, K extends string>(
  refs: unknown,
  requiredKinds: readonly K[],
  path: string,
  kindKey: keyof T & string,
  refKey: keyof T & string,
  validateRef: (ref: T) => boolean,
  errors: DistributionClientInstallerPlanError[],
): T[] {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        `distribution_client_installer.${path.slice(0, -1)}_required` as DistributionClientInstallerPlanErrorCode,
        `/${path}`,
        `${path} must be present.`,
      ),
    );
    return [];
  }

  const seenKinds = new Set<string>();
  const normalized: T[] = [];
  refs.forEach((ref, index) => {
    if (
      ref === null ||
      typeof ref !== "object" ||
      Array.isArray(ref) ||
      !safeId((ref as Record<string, unknown>)[refKey]) ||
      typeof (ref as Record<string, unknown>)[kindKey] !== "string" ||
      !validateRef(ref as T)
    ) {
      errors.push(
        error(
          `distribution_client_installer.invalid_${path.slice(0, -1)}` as DistributionClientInstallerPlanErrorCode,
          `/${path}/${index}`,
          `${path} entry is invalid or opens blocked scope.`,
        ),
      );
      return;
    }

    seenKinds.add(String((ref as Record<string, unknown>)[kindKey]));
    normalized.push(ref as T);
  });

  for (const requiredKind of requiredKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        error(
          `distribution_client_installer.${path.slice(0, -1)}_required` as DistributionClientInstallerPlanErrorCode,
          `/${path}`,
          `${requiredKind} is required.`,
        ),
      );
    }
  }

  return normalized;
}

function validateArtifactFamilyRef(
  ref: DistributionClientInstallerArtifactFamilyRefInput,
): boolean {
  return (
    artifactFamilySet.has(ref.artifact_family) &&
    ref.current_state === "future_artifact_family_source_ref_only" &&
    ref.source_canonical_artifact === (ref.artifact_family === "source_release") &&
    ref.core_installer_boundary === (ref.artifact_family !== "mcp_extension_package") &&
    ref.mcp_extension_boundary === (ref.artifact_family === "mcp_extension_package") &&
    ref.package_creation_allowed === false &&
    ref.package_publish_allowed === false &&
    ref.binary_build_allowed === false &&
    ref.installer_execution_allowed === false
  );
}

function validateSupportTierRef(
  ref: DistributionClientInstallerSupportTierRefInput,
): boolean {
  return (
    supportTierSet.has(ref.support_tier) &&
    ref.current_state === "future_supported_system_source_ref_only" &&
    ref.platform_owned_by_deployment_owner === true &&
    ref.service_install_allowed === false &&
    ref.host_mutation_allowed === false
  );
}

function validateRuntimeSplitRef(
  ref: DistributionClientInstallerRuntimeSplitRefInput,
): boolean {
  return (
    runtimeSplitSet.has(ref.runtime_kind) &&
    ref.current_state === "future_runtime_split_source_ref_only" &&
    ref.core_server_boot_dependency ===
      (ref.runtime_kind === "node_typescript_core_server") &&
    ref.python_core_required === false &&
    ref.os_specific_binary_core_required === false &&
    ref.binary_build_allowed === false
  );
}

function validateFactoryCleanRef(
  ref: DistributionClientInstallerFactoryCleanRefInput,
): boolean {
  return (
    factoryCleanSet.has(ref.clean_kind) &&
    ref.required_for_release === true &&
    ref.current_state === "factory_clean_requirement_source_ref_only" &&
    ref.seeded_customer_data_allowed === false &&
    ref.automatic_ingestion_before_onboarding_allowed === false &&
    ref.credential_storage_allowed === false
  );
}

function validateOnboardingStepRef(
  ref: DistributionClientInstallerOnboardingStepRefInput,
): boolean {
  return (
    onboardingStepSet.has(ref.onboarding_kind) &&
    ref.current_state === "future_onboarding_step_source_ref_only" &&
    ref.requires_deployment_owner_choice === true &&
    ref.stores_secret_values === false &&
    ref.mutates_external_system === false &&
    ref.ingestion_allowed_before_step === false
  );
}

function validateOsCapabilityRef(
  ref: DistributionClientInstallerOsCapabilityRefInput,
): boolean {
  return (
    osCapabilitySet.has(ref.capability_kind) &&
    ref.current_state === "future_client_capability_source_ref_only" &&
    ref.gateway_approval_required === true &&
    ref.audit_required === true &&
    ref.direct_shell_allowed === false &&
    ref.ssh_allowed === false &&
    ref.host_mutation_allowed === false
  );
}

function validateReleaseRequirementRef(
  ref: DistributionClientInstallerReleaseRequirementRefInput,
): boolean {
  return (
    releaseRequirementSet.has(ref.requirement_kind) &&
    ref.current_state === "future_release_requirement_source_ref_only" &&
    ref.required_before_package_publish === true &&
    ref.package_publish_allowed === false &&
    ref.secret_values_allowed === false
  );
}

function validateMcpBoundaryRef(
  ref: DistributionClientInstallerMcpBoundaryRefInput,
): boolean {
  return (
    mcpBoundarySet.has(ref.mcp_kind) &&
    ref.current_state === "future_mcp_extension_boundary_source_ref_only" &&
    ref.core_installer_dependency === false &&
    ref.gateway_policy_required === true &&
    ref.mcp_is_security_boundary === false &&
    ref.mcp_extension_installation_allowed === false
  );
}

function validatePolicyPrerequisiteRef(
  ref: DistributionClientInstallerPolicyPrerequisiteRefInput,
): boolean {
  return (
    policyPrerequisiteSet.has(ref.prerequisite_kind) &&
    ref.current_state === "source_ref_only_no_policy_mutation" &&
    ref.approval_mutation_allowed === false &&
    ref.live_execution_allowed === false
  );
}

function validateApprovalPrerequisiteRef(
  ref: DistributionClientInstallerApprovalPrerequisiteRefInput,
): boolean {
  return (
    approvalPrerequisiteSet.has(ref.approval_kind) &&
    ref.required_before_future_release_or_ingestion === true &&
    ref.current_state === "source_ref_only_no_approval_request_created" &&
    ref.approval_mutation_allowed === false
  );
}

function validateAuditObligationRef(
  ref: DistributionClientInstallerAuditObligationRefInput,
): boolean {
  return (
    auditObligationSet.has(ref.audit_kind) &&
    ref.required_before_future_release_or_ingestion === true &&
    ref.current_state === "source_ref_only_no_audit_write" &&
    ref.audit_write_allowed === false &&
    ref.persisted_audit_writer_allowed === false
  );
}

function validateRollbackRef(
  ref: DistributionClientInstallerRollbackRefInput,
): boolean {
  return (
    rollbackSet.has(ref.rollback_kind) &&
    ref.current_state === "source_ref_only_no_rollback_execution" &&
    ref.rollback_execution_allowed === false &&
    ref.package_publish_allowed === false
  );
}

function validateValidationCommandRef(
  ref: DistributionClientInstallerValidationCommandRefInput,
): boolean {
  return (
    validationSet.has(ref.validation_kind) &&
    safeId(ref.validation_ref) &&
    safeCommandRefPattern.test(ref.command_ref) &&
    ref.current_state === "named_validation_only" &&
    ref.live_execution_allowed === false
  );
}

function validateSourceRefs(
  refs: unknown,
  errors: DistributionClientInstallerPlanError[],
): string[] {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "distribution_client_installer.source_ref_required",
        "/source_refs",
        "Source refs must be present.",
      ),
    );
    return [];
  }

  const sourceRefs: string[] = [];
  for (const [index, ref] of refs.entries()) {
    const value = ref as DistributionClientInstallerSourceRefInput;
    if (
      ref === null ||
      typeof ref !== "object" ||
      Array.isArray(ref) ||
      !safeSource(value.source_ref) ||
      !safeText(value.summary)
    ) {
      errors.push(
        error(
          "distribution_client_installer.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be repo-local and safe.",
        ),
      );
      continue;
    }
    sourceRefs.push(value.source_ref);
  }

  const requiredSourceRefs = [
    "docs/architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md",
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/distribution-client-installer-plan-contract.ts",
    "packages/packets/test/distribution-client-installer-plan-contract.test.ts",
  ];

  for (const requiredSourceRef of requiredSourceRefs) {
    if (!sourceRefs.includes(requiredSourceRef)) {
      errors.push(
        error(
          "distribution_client_installer.source_ref_required",
          "/source_refs",
          `${requiredSourceRef} is required.`,
        ),
      );
    }
  }

  return sourceRefs;
}

function validateNoLivePosture(
  posture: unknown,
  errors: DistributionClientInstallerPlanError[],
): DistributionClientInstallerNoLivePostureInput {
  if (posture === null || typeof posture !== "object" || Array.isArray(posture)) {
    errors.push(
      error(
        "distribution_client_installer.no_live_posture_required",
        "/no_live_posture",
        "No-live posture is required.",
      ),
    );
    return defaultDistributionClientInstallerNoLivePosture;
  }

  for (const flag of distributionClientInstallerBlockedCapabilityFlags) {
    if ((posture as Record<string, unknown>)[flag] !== false) {
      errors.push(
        error(
          "distribution_client_installer.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          `${flag} must be false.`,
        ),
      );
    }
  }

  return posture as DistributionClientInstallerNoLivePostureInput;
}

function validateAllowedState(
  allowedState: unknown,
  errors: DistributionClientInstallerPlanError[],
): DistributionClientInstallerAllowedStateInput {
  if (
    allowedState === null ||
    typeof allowedState !== "object" ||
    Array.isArray(allowedState)
  ) {
    errors.push(
      error(
        "distribution_client_installer.allowed_state_required",
        "/allowed_state",
        "Allowed state is required.",
      ),
    );
    return defaultDistributionClientInstallerAllowedState;
  }

  const state = allowedState as Partial<DistributionClientInstallerAllowedStateInput>;
  const requiredTrue = [
    "source_only_distribution_plan_allowed",
    "artifact_family_refs_allowed",
    "support_tier_refs_allowed",
    "runtime_split_refs_allowed",
    "factory_clean_refs_allowed",
    "onboarding_step_refs_allowed",
    "os_capability_refs_allowed",
    "release_requirement_refs_allowed",
    "mcp_boundary_refs_allowed",
    "open_source_application",
    "factory_clean_install_required",
    "onboarding_required_before_ingestion",
    "source_canonical_artifact",
    "mcp_extensions_separate",
  ] as const;

  for (const key of requiredTrue) {
    if (state[key] !== true) {
      errors.push(
        error(
          "distribution_client_installer.allowed_state_drift",
          `/allowed_state/${key}`,
          `${key} must stay true.`,
        ),
      );
    }
  }

  const requiredFalse = [
    "core_server_python_required",
    "core_server_os_binary_required",
  ] as const;
  for (const key of requiredFalse) {
    if (state[key] !== false) {
      errors.push(
        error(
          "distribution_client_installer.allowed_state_drift",
          `/allowed_state/${key}`,
          `${key} must stay false.`,
        ),
      );
    }
  }

  if (state.secret_posture !== "references_only_no_values") {
    errors.push(
      error(
        "distribution_client_installer.allowed_state_drift",
        "/allowed_state/secret_posture",
        "Secret posture must stay references-only.",
      ),
    );
  }

  validateNoLivePosture(allowedState, errors);
  return allowedState as DistributionClientInstallerAllowedStateInput;
}

function validateForbiddenScope(
  request: DistributionClientInstallerPlanRequest,
  errors: DistributionClientInstallerPlanError[],
): void {
  const freeText = collectFreeTextValues(request).join("\n");

  if (unsafeValuePattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.secret_value_forbidden",
        "/",
        "Secrets, credentials, URLs, and connection strings are forbidden.",
      ),
    );
  }
  if (packageOrBinaryPattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.package_or_binary_forbidden",
        "/",
        "Package creation, publishing, binary builds, and image builds are forbidden.",
      ),
    );
  }
  if (installOrClientPattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.install_or_client_forbidden",
        "/",
        "Installer execution, service install, and client enrollment are forbidden.",
      ),
    );
  }
  if (seedOrIngestionPattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.seed_or_ingestion_forbidden",
        "/",
        "Seeded customer data and pre-onboarding ingestion are forbidden.",
      ),
    );
  }
  if (runtimeOrHostPattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.host_or_runtime_forbidden",
        "/",
        "Host mutation and runtime/live scope are forbidden.",
      ),
    );
  }
  if (databaseOrWriterPattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.database_or_writer_forbidden",
        "/",
        "Database, writer, SQL, migration, and queue scope are forbidden.",
      ),
    );
  }
  if (authOrIntegrationPattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.auth_or_integration_forbidden",
        "/",
        "Auth wiring and integration setup writes are forbidden.",
      ),
    );
  }
  if (externalServicePattern.test(freeText)) {
    errors.push(
      error(
        "distribution_client_installer.external_service_forbidden",
        "/",
        "External service calls and live integration invocation are forbidden.",
      ),
    );
  }

  for (const flag of distributionClientInstallerBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "distribution_client_installer.blocked_capability_forbidden",
          `/${flag}`,
          `${flag} must be false when present.`,
        ),
      );
    }
  }
}

function collectFreeTextValues(value: unknown): string[] {
  const values: string[] = [];
  visit(value, "");
  return values;

  function visit(current: unknown, key: string): void {
    if (typeof current === "string") {
      if (key === "summary" || key === "mvp_value") values.push(current);
      return;
    }
    if (current === null || typeof current !== "object") return;
    if (Array.isArray(current)) {
      current.forEach((item) => visit(item, key));
      return;
    }
    for (const [childKey, childValue] of Object.entries(current)) {
      visit(childValue, childKey);
    }
  }
}

function safeId(value: unknown): value is string {
  return typeof value === "string" && safeIdPattern.test(value);
}

function safeSource(value: unknown): value is string {
  return typeof value === "string" && safeSourceRefPattern.test(value);
}

function safeText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 360 &&
    !unsafeValuePattern.test(value)
  );
}

function failDistributionClientInstallerPlan(
  errors: DistributionClientInstallerPlanError[],
): DistributionClientInstallerPlanResult {
  return {
    ok: false,
    distribution_client_installer_plan: null,
    errors: uniqueErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function error(
  code: DistributionClientInstallerPlanErrorCode,
  path: string,
  message: string,
): DistributionClientInstallerPlanError {
  return { code, path, message, severity: "error" };
}

function uniqueErrors(
  errors: DistributionClientInstallerPlanError[],
): DistributionClientInstallerPlanError[] {
  const seen = new Set<string>();
  return errors.filter((entry) => {
    const key = `${entry.code}:${entry.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
