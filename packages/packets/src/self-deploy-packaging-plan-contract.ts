import { installationControlProfileContract } from "./installation-control-profile.js";
import { persistencePolicyGateContract } from "./persistence-policy-gate.js";
import { persistedKnowledgeReadSurfaceContract } from "./persisted-knowledge-read-surface-contract.js";

export const SELF_DEPLOY_PACKAGING_PLAN_CONTRACT_STATUS = "source_only";

export const selfDeployPackagingPlanDeploymentModes = [
  "local_dev",
  "self_hosted_single_node",
  "self_hosted_container",
  "hybrid",
  "future_saas",
  "isolated",
] as const;

export const selfDeployPackagingPlanArtifactKinds = [
  "web_app_ref",
  "gateway_api_ref",
  "packet_contracts_package_ref",
  "mcp_inspection_package_ref",
  "docs_bundle_ref",
  "env_template_ref",
  "optional_adapter_package_ref",
  "optional_node_agent_package_ref",
] as const;

export const selfDeployPackagingPlanAuthPostureKinds = [
  "local_auth",
  "third_party_auth",
  "user_selected_auth_levels",
  "isolated_auth",
] as const;

export const selfDeployPackagingPlanIntegrationPostureKinds = [
  "user_owned_integrations",
  "secret_references_only",
  "integration_descriptor_required",
  "disablement_required",
] as const;

export const selfDeployPackagingPlanOsPythonPostureKinds = [
  "no_python_core_requirement",
  "no_os_specific_binary_core_requirement",
  "optional_python_adapter_later",
  "optional_os_node_agent_later",
] as const;

export const selfDeployPackagingPlanPolicyPrerequisiteKinds = [
  "bp0216_source_packet_review_ref",
  "bp0193_auth_integration_posture_ref",
  "bp0199_substrate_posture_ref",
  "bp0200_runtime_readiness_ref",
  "bp0202_policy_gate_ref",
] as const;

export const selfDeployPackagingPlanApprovalPrerequisiteKinds = [
  "no_live_scope_request_ref",
  "no_deploy_scope_request_ref",
  "no_package_install_request_ref",
  "no_auth_provider_wiring_request_ref",
] as const;

export const selfDeployPackagingPlanAuditObligationKinds = [
  "packaging_plan_reviewed",
  "future_install_audit_required",
  "future_auth_config_audit_required",
  "future_integration_setup_audit_required",
] as const;

export const selfDeployPackagingPlanRollbackKinds = [
  "remove_source_contract_artifacts",
  "restore_bp0215_handoff",
  "disable_future_installer",
] as const;

export const selfDeployPackagingPlanValidationKinds = [
  "packet_contract_tests",
  "packet_typecheck",
  "web_management_packet_tests",
  "docs_check",
  "format_check",
  "full_workspace_check",
] as const;

export const selfDeployPackagingPlanBlockedCapabilityFlags = [
  "package_creation_allowed",
  "package_publish_allowed",
  "installer_allowed",
  "binary_build_allowed",
  "docker_image_allowed",
  "service_file_allowed",
  "host_service_install_allowed",
  "service_mutation_allowed",
  "root_helper_allowed",
  "deploy_allowed",
  "github_actions_deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "hosting_mutation_allowed",
  "ssh_allowed",
  "docker_runner_allowed",
  "vm_launch_allowed",
  "raw_shell_automation_allowed",
  "database_connection_allowed",
  "database_write_allowed",
  "sql_execution_allowed",
  "ddl_execution_allowed",
  "migration_execution_allowed",
  "query_runner_allowed",
  "writer_implementation_allowed",
  "queue_mutation_allowed",
  "persisted_audit_writer_allowed",
  "approval_mutation_allowed",
  "runtime_dispatcher_allowed",
  "live_broker_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_execution_allowed",
  "auth_provider_wiring_allowed",
  "auth_session_database_allowed",
  "credential_storage_allowed",
  "integration_setup_write_allowed",
  "live_connector_activation_allowed",
  "external_service_call_allowed",
  "secret_values_allowed",
  "python_runtime_required",
  "os_specific_binary_required",
  "node_agent_package_built_allowed",
] as const;

export const selfDeployPackagingPlanContract = {
  contract_id: "lnsat.platform.self_deploy_packaging_plan.v0_1",
  authority: ["@lnsat/packets", "source-backed-self-deploy-packaging-plan"],
  plan_version: "0.1",
  source_docs: [
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  installation_control_profile_contract_id:
    installationControlProfileContract.contract_id,
  persistence_policy_gate_contract_id: persistencePolicyGateContract.contract_id,
  persisted_knowledge_read_surface_contract_id:
    persistedKnowledgeReadSurfaceContract.contract_id,
  contract_authority: "source_only_packaging_plan_no_deploy_or_install",
  open_source_application: true,
  self_deploying_management_system: true,
  deployment_owner_controls_auth: true,
  deployment_owner_controls_integrations: true,
  auth_provider_locked: false,
  user_owned_integrations: true,
  secret_references_only: true,
  package_creation_allowed: false,
  package_publish_allowed: false,
  deploy_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type SelfDeployPackagingPlanDeploymentMode =
  (typeof selfDeployPackagingPlanDeploymentModes)[number];
export type SelfDeployPackagingPlanArtifactKind =
  (typeof selfDeployPackagingPlanArtifactKinds)[number];
export type SelfDeployPackagingPlanAuthPostureKind =
  (typeof selfDeployPackagingPlanAuthPostureKinds)[number];
export type SelfDeployPackagingPlanIntegrationPostureKind =
  (typeof selfDeployPackagingPlanIntegrationPostureKinds)[number];
export type SelfDeployPackagingPlanOsPythonPostureKind =
  (typeof selfDeployPackagingPlanOsPythonPostureKinds)[number];
export type SelfDeployPackagingPlanPolicyPrerequisiteKind =
  (typeof selfDeployPackagingPlanPolicyPrerequisiteKinds)[number];
export type SelfDeployPackagingPlanApprovalPrerequisiteKind =
  (typeof selfDeployPackagingPlanApprovalPrerequisiteKinds)[number];
export type SelfDeployPackagingPlanAuditObligationKind =
  (typeof selfDeployPackagingPlanAuditObligationKinds)[number];
export type SelfDeployPackagingPlanRollbackKind =
  (typeof selfDeployPackagingPlanRollbackKinds)[number];
export type SelfDeployPackagingPlanValidationKind =
  (typeof selfDeployPackagingPlanValidationKinds)[number];
export type SelfDeployPackagingPlanBlockedCapabilityFlag =
  (typeof selfDeployPackagingPlanBlockedCapabilityFlags)[number];

export type SelfDeployPackagingPlanIdentityInput = {
  packet_ref: "BP-0216";
  selected_after_packet_ref: "BP-0215";
  plan_ref: "self_deploy_packaging_plan:source_only";
  plan_mode: "source_contract_only";
  mvp_value: string;
};

export type SelfDeployPackagingPlanDeploymentModeRefInput = {
  mode_ref: string;
  mode_kind: SelfDeployPackagingPlanDeploymentMode;
  current_state: "future_deployment_mode_source_ref_only";
  deployment_owner_controlled: true;
  deploy_allowed: false;
  service_mutation_allowed: false;
};

export type SelfDeployPackagingPlanArtifactRefInput = {
  artifact_ref: string;
  artifact_kind: SelfDeployPackagingPlanArtifactKind;
  current_state: "future_artifact_source_ref_only";
  package_creation_allowed: false;
  package_publish_allowed: false;
  installer_allowed: false;
  binary_build_allowed: false;
  docker_image_allowed: false;
  service_file_allowed: false;
};

export type SelfDeployPackagingPlanAuthPostureRefInput = {
  auth_ref: string;
  auth_kind: SelfDeployPackagingPlanAuthPostureKind;
  current_state: "future_auth_mode_source_ref_only";
  deployment_owner_controlled: true;
  auth_provider_locked: false;
  auth_provider_wiring_allowed: false;
  auth_session_database_allowed: false;
  credential_storage_allowed: false;
};

export type SelfDeployPackagingPlanIntegrationPostureRefInput = {
  integration_ref: string;
  integration_kind: SelfDeployPackagingPlanIntegrationPostureKind;
  current_state: "future_integration_source_ref_only";
  deployment_owner_controlled: true;
  user_owned_integrations: true;
  secret_references_only: true;
  integration_setup_write_allowed: false;
  live_connector_activation_allowed: false;
};

export type SelfDeployPackagingPlanOsPythonPostureRefInput = {
  posture_ref: string;
  posture_kind: SelfDeployPackagingPlanOsPythonPostureKind;
  current_state: "future_os_python_source_ref_only";
  python_runtime_required: false;
  os_specific_binary_required: false;
  node_agent_package_built_allowed: false;
};

export type SelfDeployPackagingPlanPolicyPrerequisiteRefInput = {
  prerequisite_ref: string;
  prerequisite_kind: SelfDeployPackagingPlanPolicyPrerequisiteKind;
  current_state: "source_ref_only_no_policy_mutation";
  approval_mutation_allowed: false;
  live_execution_allowed: false;
};

export type SelfDeployPackagingPlanApprovalPrerequisiteRefInput = {
  approval_ref: string;
  approval_kind: SelfDeployPackagingPlanApprovalPrerequisiteKind;
  required_before_future_install_or_deploy: true;
  current_state: "source_ref_only_no_approval_request_created";
  approval_mutation_allowed: false;
  deploy_allowed: false;
};

export type SelfDeployPackagingPlanAuditObligationRefInput = {
  audit_ref: string;
  audit_kind: SelfDeployPackagingPlanAuditObligationKind;
  required_before_future_install_or_deploy: true;
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  persisted_audit_writer_allowed: false;
};

export type SelfDeployPackagingPlanRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: SelfDeployPackagingPlanRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  deploy_allowed: false;
};

export type SelfDeployPackagingPlanValidationCommandRefInput = {
  validation_ref: string;
  validation_kind: SelfDeployPackagingPlanValidationKind;
  command_ref: string;
  current_state: "named_validation_only";
  live_execution_allowed: false;
};

export type SelfDeployPackagingPlanSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type SelfDeployPackagingPlanNoLivePostureInput = Record<
  SelfDeployPackagingPlanBlockedCapabilityFlag,
  false
>;

export type SelfDeployPackagingPlanAllowedStateInput =
  SelfDeployPackagingPlanNoLivePostureInput & {
    source_only_packaging_plan_allowed: true;
    deployment_mode_refs_allowed: true;
    artifact_refs_allowed: true;
    auth_posture_refs_allowed: true;
    integration_posture_refs_allowed: true;
    os_python_posture_refs_allowed: true;
    open_source_application: true;
    self_deploying_management_system: true;
    deployment_owner_controls_auth: true;
    deployment_owner_controls_integrations: true;
    auth_provider_locked: false;
    user_owned_integrations: true;
    secret_posture: "references_only_no_values";
  };

export type SelfDeployPackagingPlanRequest = Partial<
  Record<SelfDeployPackagingPlanBlockedCapabilityFlag, false>
> & {
  plan_version?: typeof selfDeployPackagingPlanContract.plan_version;
  plan_identity?: SelfDeployPackagingPlanIdentityInput;
  deployment_mode_refs?: SelfDeployPackagingPlanDeploymentModeRefInput[];
  artifact_refs?: SelfDeployPackagingPlanArtifactRefInput[];
  auth_posture_refs?: SelfDeployPackagingPlanAuthPostureRefInput[];
  integration_posture_refs?: SelfDeployPackagingPlanIntegrationPostureRefInput[];
  os_python_posture_refs?: SelfDeployPackagingPlanOsPythonPostureRefInput[];
  policy_prerequisite_refs?: SelfDeployPackagingPlanPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs?: SelfDeployPackagingPlanApprovalPrerequisiteRefInput[];
  audit_obligation_refs?: SelfDeployPackagingPlanAuditObligationRefInput[];
  rollback_refs?: SelfDeployPackagingPlanRollbackRefInput[];
  validation_command_refs?: SelfDeployPackagingPlanValidationCommandRefInput[];
  source_refs?: SelfDeployPackagingPlanSourceRefInput[];
  no_live_posture?: SelfDeployPackagingPlanNoLivePostureInput;
  allowed_state?: SelfDeployPackagingPlanAllowedStateInput;
  contract_authority?: typeof selfDeployPackagingPlanContract.contract_authority;
  side_effects?: [];
};

export type SelfDeployPackagingPlanErrorCode =
  | "self_deploy_packaging_plan.invalid_request"
  | "self_deploy_packaging_plan.unexpected_field"
  | "self_deploy_packaging_plan.invalid_version"
  | "self_deploy_packaging_plan.invalid_identity"
  | "self_deploy_packaging_plan.deployment_mode_ref_required"
  | "self_deploy_packaging_plan.invalid_deployment_mode_ref"
  | "self_deploy_packaging_plan.artifact_ref_required"
  | "self_deploy_packaging_plan.invalid_artifact_ref"
  | "self_deploy_packaging_plan.auth_posture_ref_required"
  | "self_deploy_packaging_plan.invalid_auth_posture_ref"
  | "self_deploy_packaging_plan.integration_posture_ref_required"
  | "self_deploy_packaging_plan.invalid_integration_posture_ref"
  | "self_deploy_packaging_plan.os_python_posture_ref_required"
  | "self_deploy_packaging_plan.invalid_os_python_posture_ref"
  | "self_deploy_packaging_plan.policy_prerequisite_ref_required"
  | "self_deploy_packaging_plan.invalid_policy_prerequisite_ref"
  | "self_deploy_packaging_plan.approval_prerequisite_ref_required"
  | "self_deploy_packaging_plan.invalid_approval_prerequisite_ref"
  | "self_deploy_packaging_plan.audit_obligation_ref_required"
  | "self_deploy_packaging_plan.invalid_audit_obligation_ref"
  | "self_deploy_packaging_plan.rollback_ref_required"
  | "self_deploy_packaging_plan.invalid_rollback_ref"
  | "self_deploy_packaging_plan.validation_command_ref_required"
  | "self_deploy_packaging_plan.invalid_validation_command_ref"
  | "self_deploy_packaging_plan.source_ref_required"
  | "self_deploy_packaging_plan.invalid_source_ref"
  | "self_deploy_packaging_plan.no_live_posture_required"
  | "self_deploy_packaging_plan.no_live_posture_drift"
  | "self_deploy_packaging_plan.allowed_state_required"
  | "self_deploy_packaging_plan.allowed_state_drift"
  | "self_deploy_packaging_plan.unsafe_contract_authority"
  | "self_deploy_packaging_plan.package_or_binary_forbidden"
  | "self_deploy_packaging_plan.deploy_or_infra_forbidden"
  | "self_deploy_packaging_plan.host_or_runtime_forbidden"
  | "self_deploy_packaging_plan.database_or_writer_forbidden"
  | "self_deploy_packaging_plan.auth_or_integration_forbidden"
  | "self_deploy_packaging_plan.external_service_forbidden"
  | "self_deploy_packaging_plan.secret_value_forbidden"
  | "self_deploy_packaging_plan.blocked_capability_forbidden"
  | "self_deploy_packaging_plan.side_effects_forbidden";

export type SelfDeployPackagingPlanError = {
  code: SelfDeployPackagingPlanErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type SelfDeployPackagingPlanEvidence = {
  contract_id: typeof selfDeployPackagingPlanContract.contract_id;
  plan_version: typeof selfDeployPackagingPlanContract.plan_version;
  plan_identity: SelfDeployPackagingPlanIdentityInput;
  installation_control_profile_contract_id: typeof installationControlProfileContract.contract_id;
  persistence_policy_gate_contract_id: typeof persistencePolicyGateContract.contract_id;
  persisted_knowledge_read_surface_contract_id: typeof persistedKnowledgeReadSurfaceContract.contract_id;
  deployment_mode_refs: SelfDeployPackagingPlanDeploymentModeRefInput[];
  artifact_refs: SelfDeployPackagingPlanArtifactRefInput[];
  auth_posture_refs: SelfDeployPackagingPlanAuthPostureRefInput[];
  integration_posture_refs: SelfDeployPackagingPlanIntegrationPostureRefInput[];
  os_python_posture_refs: SelfDeployPackagingPlanOsPythonPostureRefInput[];
  policy_prerequisite_refs: SelfDeployPackagingPlanPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs: SelfDeployPackagingPlanApprovalPrerequisiteRefInput[];
  audit_obligation_refs: SelfDeployPackagingPlanAuditObligationRefInput[];
  rollback_refs: SelfDeployPackagingPlanRollbackRefInput[];
  validation_command_refs: SelfDeployPackagingPlanValidationCommandRefInput[];
  source_refs: string[];
  no_live_posture: SelfDeployPackagingPlanNoLivePostureInput;
  allowed_state: SelfDeployPackagingPlanAllowedStateInput;
  blocked_capabilities: SelfDeployPackagingPlanBlockedCapabilityFlag[];
  source_contract_artifacts: [
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "packages/packets/src/self-deploy-packaging-plan-contract.ts",
    "packages/packets/test/self-deploy-packaging-plan-contract.test.ts",
  ];
  package_artifacts: [];
  installer_artifacts: [];
  binary_artifacts: [];
  docker_image_artifacts: [];
  service_file_artifacts: [];
  deploy_artifacts: [];
  runtime_artifacts: [];
  database_artifacts: [];
  auth_runtime_artifacts: [];
  integration_runtime_artifacts: [];
  external_service_clients: [];
  package_creation_allowed: false;
  package_publish_allowed: false;
  deploy_allowed: false;
  auth_provider_wiring_allowed: false;
  integration_setup_write_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type SelfDeployPackagingPlanResult =
  | {
      ok: true;
      self_deploy_packaging_plan: SelfDeployPackagingPlanEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      self_deploy_packaging_plan: null;
      errors: SelfDeployPackagingPlanError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedSelfDeployPackagingPlan =
  | {
      ok: true;
      plan_identity: SelfDeployPackagingPlanIdentityInput;
      deployment_mode_refs: SelfDeployPackagingPlanDeploymentModeRefInput[];
      artifact_refs: SelfDeployPackagingPlanArtifactRefInput[];
      auth_posture_refs: SelfDeployPackagingPlanAuthPostureRefInput[];
      integration_posture_refs: SelfDeployPackagingPlanIntegrationPostureRefInput[];
      os_python_posture_refs: SelfDeployPackagingPlanOsPythonPostureRefInput[];
      policy_prerequisite_refs: SelfDeployPackagingPlanPolicyPrerequisiteRefInput[];
      approval_prerequisite_refs: SelfDeployPackagingPlanApprovalPrerequisiteRefInput[];
      audit_obligation_refs: SelfDeployPackagingPlanAuditObligationRefInput[];
      rollback_refs: SelfDeployPackagingPlanRollbackRefInput[];
      validation_command_refs: SelfDeployPackagingPlanValidationCommandRefInput[];
      source_refs: string[];
      no_live_posture: SelfDeployPackagingPlanNoLivePostureInput;
      allowed_state: SelfDeployPackagingPlanAllowedStateInput;
    }
  | {
      ok: false;
      errors: SelfDeployPackagingPlanError[];
    };

const requestKeys = new Set([
  "plan_version",
  "plan_identity",
  "deployment_mode_refs",
  "artifact_refs",
  "auth_posture_refs",
  "integration_posture_refs",
  "os_python_posture_refs",
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
  ...selfDeployPackagingPlanBlockedCapabilityFlags,
]);

const deploymentModeSet = new Set<string>(selfDeployPackagingPlanDeploymentModes);
const artifactKindSet = new Set<string>(selfDeployPackagingPlanArtifactKinds);
const authPostureKindSet = new Set<string>(selfDeployPackagingPlanAuthPostureKinds);
const integrationPostureKindSet = new Set<string>(
  selfDeployPackagingPlanIntegrationPostureKinds,
);
const osPythonPostureKindSet = new Set<string>(
  selfDeployPackagingPlanOsPythonPostureKinds,
);
const policyPrerequisiteKindSet = new Set<string>(
  selfDeployPackagingPlanPolicyPrerequisiteKinds,
);
const approvalPrerequisiteKindSet = new Set<string>(
  selfDeployPackagingPlanApprovalPrerequisiteKinds,
);
const auditObligationKindSet = new Set<string>(
  selfDeployPackagingPlanAuditObligationKinds,
);
const rollbackKindSet = new Set<string>(selfDeployPackagingPlanRollbackKinds);
const validationKindSet = new Set<string>(selfDeployPackagingPlanValidationKinds);

const safeIdPattern = /^[a-z][a-z0-9_.:-]{2,120}$/;
const safeCommandRefPattern =
  /^npm run (?:test -w @lnsat\/packets -- self-deploy-packaging-plan-contract|typecheck -w @lnsat\/packets|test -w @lnsat\/web -- packet-management management-overview management-surface-index|docs:check|format:check|check)$/;
const safeSourceRefPattern =
  /^(?:docs\/[A-Za-z0-9_./-]+|packages\/packets\/(?:src|test)\/[A-Za-z0-9_.-]+\.ts)$/;
const unsafeValuePattern =
  /(?:DATABASE_URL|postgres:\/\/|mysql:\/\/|mongodb:\/\/|PRIVATE KEY|BEGIN [A-Z ]*KEY|API_KEY|SECRET=|TOKEN=|PASSWORD|credential_value|provider_account|gh[pous]_[A-Za-z0-9]|sk-[A-Za-z0-9]|xox[baprs]-|cloudflare_api_token|https?:\/\/|ssh:\/\/|file:\/\/)/i;
const packageOrBinaryPattern =
  /(?:build_binary|binary_build|installer_ready|package_publish|npm publish|docker build|docker image|service file|launchd|systemd|msi|pkgbuild|codesign|notarize)/i;
const deployOrInfraPattern =
  /(?:^|[^-a-z])deploy(?:$|[^a-z])|github actions deploy|dns|cloudflare|hosting mutation|terraform|pulumi|infrastructure mutation/i;
const runtimeOrHostPattern =
  /(?:runtime dispatcher|live adapter|live execution|node-agent install|docker run|ssh |raw shell|root helper|service restart|vm launch)/i;
const databaseOrWriterPattern =
  /(?:database connection|db write|sql execution|ddl execution|migration execution|query runner|writer implementation|queue mutation)/i;
const authOrIntegrationPattern =
  /(?:auth provider wiring|session db|credential storage|integration setup write|live connector|permission mutation)/i;

export const defaultSelfDeployPackagingPlanIdentity: SelfDeployPackagingPlanIdentityInput =
  {
    packet_ref: "BP-0216",
    selected_after_packet_ref: "BP-0215",
    plan_ref: "self_deploy_packaging_plan:source_only",
    plan_mode: "source_contract_only",
    mvp_value:
      "Make self-deploy packaging posture explicit before package, service, auth, integration, adapter, or host/OS work starts.",
  };

export const defaultSelfDeployPackagingDeploymentModeRefs: SelfDeployPackagingPlanDeploymentModeRefInput[] =
  selfDeployPackagingPlanDeploymentModes.map((mode) => ({
    mode_ref: `deployment_mode:${mode}`,
    mode_kind: mode,
    current_state: "future_deployment_mode_source_ref_only",
    deployment_owner_controlled: true,
    deploy_allowed: false,
    service_mutation_allowed: false,
  }));

export const defaultSelfDeployPackagingArtifactRefs: SelfDeployPackagingPlanArtifactRefInput[] =
  selfDeployPackagingPlanArtifactKinds.map((kind) => ({
    artifact_ref: `packaging_artifact:${kind}`,
    artifact_kind: kind,
    current_state: "future_artifact_source_ref_only",
    package_creation_allowed: false,
    package_publish_allowed: false,
    installer_allowed: false,
    binary_build_allowed: false,
    docker_image_allowed: false,
    service_file_allowed: false,
  }));

export const defaultSelfDeployPackagingAuthPostureRefs: SelfDeployPackagingPlanAuthPostureRefInput[] =
  selfDeployPackagingPlanAuthPostureKinds.map((kind) => ({
    auth_ref: `auth_posture:${kind}`,
    auth_kind: kind,
    current_state: "future_auth_mode_source_ref_only",
    deployment_owner_controlled: true,
    auth_provider_locked: false,
    auth_provider_wiring_allowed: false,
    auth_session_database_allowed: false,
    credential_storage_allowed: false,
  }));

export const defaultSelfDeployPackagingIntegrationPostureRefs: SelfDeployPackagingPlanIntegrationPostureRefInput[] =
  selfDeployPackagingPlanIntegrationPostureKinds.map((kind) => ({
    integration_ref: `integration_posture:${kind}`,
    integration_kind: kind,
    current_state: "future_integration_source_ref_only",
    deployment_owner_controlled: true,
    user_owned_integrations: true,
    secret_references_only: true,
    integration_setup_write_allowed: false,
    live_connector_activation_allowed: false,
  }));

export const defaultSelfDeployPackagingOsPythonPostureRefs: SelfDeployPackagingPlanOsPythonPostureRefInput[] =
  selfDeployPackagingPlanOsPythonPostureKinds.map((kind) => ({
    posture_ref: `os_python_posture:${kind}`,
    posture_kind: kind,
    current_state: "future_os_python_source_ref_only",
    python_runtime_required: false,
    os_specific_binary_required: false,
    node_agent_package_built_allowed: false,
  }));

export const defaultSelfDeployPackagingPolicyPrerequisiteRefs: SelfDeployPackagingPlanPolicyPrerequisiteRefInput[] =
  selfDeployPackagingPlanPolicyPrerequisiteKinds.map((kind) => ({
    prerequisite_ref: `policy_prerequisite:${kind}`,
    prerequisite_kind: kind,
    current_state: "source_ref_only_no_policy_mutation",
    approval_mutation_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultSelfDeployPackagingApprovalPrerequisiteRefs: SelfDeployPackagingPlanApprovalPrerequisiteRefInput[] =
  selfDeployPackagingPlanApprovalPrerequisiteKinds.map((kind) => ({
    approval_ref: `approval_prerequisite:${kind}`,
    approval_kind: kind,
    required_before_future_install_or_deploy: true,
    current_state: "source_ref_only_no_approval_request_created",
    approval_mutation_allowed: false,
    deploy_allowed: false,
  }));

export const defaultSelfDeployPackagingAuditObligationRefs: SelfDeployPackagingPlanAuditObligationRefInput[] =
  selfDeployPackagingPlanAuditObligationKinds.map((kind) => ({
    audit_ref: `audit_obligation:${kind}`,
    audit_kind: kind,
    required_before_future_install_or_deploy: true,
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    persisted_audit_writer_allowed: false,
  }));

export const defaultSelfDeployPackagingRollbackRefs: SelfDeployPackagingPlanRollbackRefInput[] =
  selfDeployPackagingPlanRollbackKinds.map((kind) => ({
    rollback_ref: `rollback:${kind}`,
    rollback_kind: kind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    deploy_allowed: false,
  }));

const defaultSelfDeployPackagingValidationCommandTuples: readonly [
  SelfDeployPackagingPlanValidationKind,
  string,
][] = [
  [
    "packet_contract_tests",
    "npm run test -w @lnsat/packets -- self-deploy-packaging-plan-contract",
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

export const defaultSelfDeployPackagingValidationCommandRefs: SelfDeployPackagingPlanValidationCommandRefInput[] =
  defaultSelfDeployPackagingValidationCommandTuples.map(
    ([validation_kind, command_ref]) => ({
      validation_ref: `validation:${validation_kind}`,
      validation_kind,
      command_ref,
      current_state: "named_validation_only",
      live_execution_allowed: false,
    }),
  );

export const defaultSelfDeployPackagingSourceRefs: SelfDeployPackagingPlanSourceRefInput[] =
  [
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ].map((source_ref) => ({
    source_ref,
    summary: "Repo-local source evidence for BP-0216 self-deploy packaging plan.",
  }));

export const defaultSelfDeployPackagingNoLivePosture = Object.fromEntries(
  selfDeployPackagingPlanBlockedCapabilityFlags.map((flag) => [flag, false]),
) as SelfDeployPackagingPlanNoLivePostureInput;

export const defaultSelfDeployPackagingAllowedState: SelfDeployPackagingPlanAllowedStateInput =
  {
    ...defaultSelfDeployPackagingNoLivePosture,
    source_only_packaging_plan_allowed: true,
    deployment_mode_refs_allowed: true,
    artifact_refs_allowed: true,
    auth_posture_refs_allowed: true,
    integration_posture_refs_allowed: true,
    os_python_posture_refs_allowed: true,
    open_source_application: true,
    self_deploying_management_system: true,
    deployment_owner_controls_auth: true,
    deployment_owner_controls_integrations: true,
    auth_provider_locked: false,
    user_owned_integrations: true,
    secret_posture: "references_only_no_values",
  };

export const defaultSelfDeployPackagingPlan: SelfDeployPackagingPlanRequest = {
  plan_version: selfDeployPackagingPlanContract.plan_version,
  plan_identity: defaultSelfDeployPackagingPlanIdentity,
  deployment_mode_refs: defaultSelfDeployPackagingDeploymentModeRefs,
  artifact_refs: defaultSelfDeployPackagingArtifactRefs,
  auth_posture_refs: defaultSelfDeployPackagingAuthPostureRefs,
  integration_posture_refs: defaultSelfDeployPackagingIntegrationPostureRefs,
  os_python_posture_refs: defaultSelfDeployPackagingOsPythonPostureRefs,
  policy_prerequisite_refs: defaultSelfDeployPackagingPolicyPrerequisiteRefs,
  approval_prerequisite_refs: defaultSelfDeployPackagingApprovalPrerequisiteRefs,
  audit_obligation_refs: defaultSelfDeployPackagingAuditObligationRefs,
  rollback_refs: defaultSelfDeployPackagingRollbackRefs,
  validation_command_refs: defaultSelfDeployPackagingValidationCommandRefs,
  source_refs: defaultSelfDeployPackagingSourceRefs,
  no_live_posture: defaultSelfDeployPackagingNoLivePosture,
  allowed_state: defaultSelfDeployPackagingAllowedState,
  contract_authority: selfDeployPackagingPlanContract.contract_authority,
  side_effects: [],
};

export function createSelfDeployPackagingPlan(
  request: SelfDeployPackagingPlanRequest = {},
): SelfDeployPackagingPlanResult {
  const normalized = normalizeSelfDeployPackagingPlan({
    ...defaultSelfDeployPackagingPlan,
    ...request,
  });

  if (!normalized.ok) {
    return failSelfDeployPackagingPlan(normalized.errors);
  }

  return {
    ok: true,
    self_deploy_packaging_plan: {
      contract_id: selfDeployPackagingPlanContract.contract_id,
      plan_version: selfDeployPackagingPlanContract.plan_version,
      plan_identity: normalized.plan_identity,
      installation_control_profile_contract_id:
        installationControlProfileContract.contract_id,
      persistence_policy_gate_contract_id: persistencePolicyGateContract.contract_id,
      persisted_knowledge_read_surface_contract_id:
        persistedKnowledgeReadSurfaceContract.contract_id,
      deployment_mode_refs: normalized.deployment_mode_refs,
      artifact_refs: normalized.artifact_refs,
      auth_posture_refs: normalized.auth_posture_refs,
      integration_posture_refs: normalized.integration_posture_refs,
      os_python_posture_refs: normalized.os_python_posture_refs,
      policy_prerequisite_refs: normalized.policy_prerequisite_refs,
      approval_prerequisite_refs: normalized.approval_prerequisite_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      validation_command_refs: normalized.validation_command_refs,
      source_refs: normalized.source_refs,
      no_live_posture: normalized.no_live_posture,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...selfDeployPackagingPlanBlockedCapabilityFlags],
      source_contract_artifacts: [
        "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
        "packages/packets/src/self-deploy-packaging-plan-contract.ts",
        "packages/packets/test/self-deploy-packaging-plan-contract.test.ts",
      ],
      package_artifacts: [],
      installer_artifacts: [],
      binary_artifacts: [],
      docker_image_artifacts: [],
      service_file_artifacts: [],
      deploy_artifacts: [],
      runtime_artifacts: [],
      database_artifacts: [],
      auth_runtime_artifacts: [],
      integration_runtime_artifacts: [],
      external_service_clients: [],
      package_creation_allowed: false,
      package_publish_allowed: false,
      deploy_allowed: false,
      auth_provider_wiring_allowed: false,
      integration_setup_write_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeSelfDeployPackagingPlan(
  request: SelfDeployPackagingPlanRequest,
): NormalizedSelfDeployPackagingPlan {
  const errors: SelfDeployPackagingPlanError[] = [];

  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    return {
      ok: false,
      errors: [
        error(
          "self_deploy_packaging_plan.invalid_request",
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
          "self_deploy_packaging_plan.unexpected_field",
          `/${key}`,
          "Unexpected field is not allowed.",
        ),
      );
    }
  }

  if (request.plan_version !== selfDeployPackagingPlanContract.plan_version) {
    errors.push(
      error(
        "self_deploy_packaging_plan.invalid_version",
        "/plan_version",
        "Plan version must match the source contract.",
      ),
    );
  }

  const planIdentity = request.plan_identity;
  if (
    !planIdentity ||
    planIdentity.packet_ref !== "BP-0216" ||
    planIdentity.selected_after_packet_ref !== "BP-0215" ||
    planIdentity.plan_ref !== "self_deploy_packaging_plan:source_only" ||
    planIdentity.plan_mode !== "source_contract_only" ||
    !safeText(planIdentity.mvp_value)
  ) {
    errors.push(
      error(
        "self_deploy_packaging_plan.invalid_identity",
        "/plan_identity",
        "Plan identity must name BP-0216 source-only packaging evidence.",
      ),
    );
  }

  const deploymentModeRefs = validateRefs(
    request.deployment_mode_refs,
    selfDeployPackagingPlanDeploymentModes,
    "deployment_mode_refs",
    "mode_kind",
    "mode_ref",
    validateDeploymentModeRef,
    errors,
  );
  const artifactRefs = validateRefs(
    request.artifact_refs,
    selfDeployPackagingPlanArtifactKinds,
    "artifact_refs",
    "artifact_kind",
    "artifact_ref",
    validateArtifactRef,
    errors,
  );
  const authPostureRefs = validateRefs(
    request.auth_posture_refs,
    selfDeployPackagingPlanAuthPostureKinds,
    "auth_posture_refs",
    "auth_kind",
    "auth_ref",
    validateAuthPostureRef,
    errors,
  );
  const integrationPostureRefs = validateRefs(
    request.integration_posture_refs,
    selfDeployPackagingPlanIntegrationPostureKinds,
    "integration_posture_refs",
    "integration_kind",
    "integration_ref",
    validateIntegrationPostureRef,
    errors,
  );
  const osPythonPostureRefs = validateRefs(
    request.os_python_posture_refs,
    selfDeployPackagingPlanOsPythonPostureKinds,
    "os_python_posture_refs",
    "posture_kind",
    "posture_ref",
    validateOsPythonPostureRef,
    errors,
  );
  const policyPrerequisiteRefs = validateRefs(
    request.policy_prerequisite_refs,
    selfDeployPackagingPlanPolicyPrerequisiteKinds,
    "policy_prerequisite_refs",
    "prerequisite_kind",
    "prerequisite_ref",
    validatePolicyPrerequisiteRef,
    errors,
  );
  const approvalPrerequisiteRefs = validateRefs(
    request.approval_prerequisite_refs,
    selfDeployPackagingPlanApprovalPrerequisiteKinds,
    "approval_prerequisite_refs",
    "approval_kind",
    "approval_ref",
    validateApprovalPrerequisiteRef,
    errors,
  );
  const auditObligationRefs = validateRefs(
    request.audit_obligation_refs,
    selfDeployPackagingPlanAuditObligationKinds,
    "audit_obligation_refs",
    "audit_kind",
    "audit_ref",
    validateAuditObligationRef,
    errors,
  );
  const rollbackRefs = validateRefs(
    request.rollback_refs,
    selfDeployPackagingPlanRollbackKinds,
    "rollback_refs",
    "rollback_kind",
    "rollback_ref",
    validateRollbackRef,
    errors,
  );
  const validationCommandRefs = validateRefs(
    request.validation_command_refs,
    selfDeployPackagingPlanValidationKinds,
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
    request.contract_authority !== selfDeployPackagingPlanContract.contract_authority
  ) {
    errors.push(
      error(
        "self_deploy_packaging_plan.unsafe_contract_authority",
        "/contract_authority",
        "Contract authority must remain source-only and no-deploy/no-install.",
      ),
    );
  }

  validateForbiddenScope(request, errors);

  if (Array.isArray(request.side_effects) && request.side_effects.length > 0) {
    errors.push(
      error(
        "self_deploy_packaging_plan.side_effects_forbidden",
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
    deployment_mode_refs: deploymentModeRefs,
    artifact_refs: artifactRefs,
    auth_posture_refs: authPostureRefs,
    integration_posture_refs: integrationPostureRefs,
    os_python_posture_refs: osPythonPostureRefs,
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
  errors: SelfDeployPackagingPlanError[],
): T[] {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        `self_deploy_packaging_plan.${path.slice(0, -1)}_required` as SelfDeployPackagingPlanErrorCode,
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
          `self_deploy_packaging_plan.invalid_${path.slice(0, -1)}` as SelfDeployPackagingPlanErrorCode,
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
          `self_deploy_packaging_plan.${path.slice(0, -1)}_required` as SelfDeployPackagingPlanErrorCode,
          `/${path}`,
          `${requiredKind} is required.`,
        ),
      );
    }
  }

  return normalized;
}

function validateDeploymentModeRef(
  ref: SelfDeployPackagingPlanDeploymentModeRefInput,
): boolean {
  return (
    deploymentModeSet.has(ref.mode_kind) &&
    ref.current_state === "future_deployment_mode_source_ref_only" &&
    ref.deployment_owner_controlled === true &&
    ref.deploy_allowed === false &&
    ref.service_mutation_allowed === false
  );
}

function validateArtifactRef(ref: SelfDeployPackagingPlanArtifactRefInput): boolean {
  return (
    artifactKindSet.has(ref.artifact_kind) &&
    ref.current_state === "future_artifact_source_ref_only" &&
    ref.package_creation_allowed === false &&
    ref.package_publish_allowed === false &&
    ref.installer_allowed === false &&
    ref.binary_build_allowed === false &&
    ref.docker_image_allowed === false &&
    ref.service_file_allowed === false
  );
}

function validateAuthPostureRef(
  ref: SelfDeployPackagingPlanAuthPostureRefInput,
): boolean {
  return (
    authPostureKindSet.has(ref.auth_kind) &&
    ref.current_state === "future_auth_mode_source_ref_only" &&
    ref.deployment_owner_controlled === true &&
    ref.auth_provider_locked === false &&
    ref.auth_provider_wiring_allowed === false &&
    ref.auth_session_database_allowed === false &&
    ref.credential_storage_allowed === false
  );
}

function validateIntegrationPostureRef(
  ref: SelfDeployPackagingPlanIntegrationPostureRefInput,
): boolean {
  return (
    integrationPostureKindSet.has(ref.integration_kind) &&
    ref.current_state === "future_integration_source_ref_only" &&
    ref.deployment_owner_controlled === true &&
    ref.user_owned_integrations === true &&
    ref.secret_references_only === true &&
    ref.integration_setup_write_allowed === false &&
    ref.live_connector_activation_allowed === false
  );
}

function validateOsPythonPostureRef(
  ref: SelfDeployPackagingPlanOsPythonPostureRefInput,
): boolean {
  return (
    osPythonPostureKindSet.has(ref.posture_kind) &&
    ref.current_state === "future_os_python_source_ref_only" &&
    ref.python_runtime_required === false &&
    ref.os_specific_binary_required === false &&
    ref.node_agent_package_built_allowed === false
  );
}

function validatePolicyPrerequisiteRef(
  ref: SelfDeployPackagingPlanPolicyPrerequisiteRefInput,
): boolean {
  return (
    policyPrerequisiteKindSet.has(ref.prerequisite_kind) &&
    ref.current_state === "source_ref_only_no_policy_mutation" &&
    ref.approval_mutation_allowed === false &&
    ref.live_execution_allowed === false
  );
}

function validateApprovalPrerequisiteRef(
  ref: SelfDeployPackagingPlanApprovalPrerequisiteRefInput,
): boolean {
  return (
    approvalPrerequisiteKindSet.has(ref.approval_kind) &&
    ref.required_before_future_install_or_deploy === true &&
    ref.current_state === "source_ref_only_no_approval_request_created" &&
    ref.approval_mutation_allowed === false &&
    ref.deploy_allowed === false
  );
}

function validateAuditObligationRef(
  ref: SelfDeployPackagingPlanAuditObligationRefInput,
): boolean {
  return (
    auditObligationKindSet.has(ref.audit_kind) &&
    ref.required_before_future_install_or_deploy === true &&
    ref.current_state === "source_ref_only_no_audit_write" &&
    ref.audit_write_allowed === false &&
    ref.persisted_audit_writer_allowed === false
  );
}

function validateRollbackRef(ref: SelfDeployPackagingPlanRollbackRefInput): boolean {
  return (
    rollbackKindSet.has(ref.rollback_kind) &&
    ref.current_state === "source_ref_only_no_rollback_execution" &&
    ref.rollback_execution_allowed === false &&
    ref.deploy_allowed === false
  );
}

function validateValidationCommandRef(
  ref: SelfDeployPackagingPlanValidationCommandRefInput,
): boolean {
  return (
    validationKindSet.has(ref.validation_kind) &&
    safeId(ref.validation_ref) &&
    safeCommandRefPattern.test(ref.command_ref) &&
    ref.current_state === "named_validation_only" &&
    ref.live_execution_allowed === false
  );
}

function validateSourceRefs(
  refs: unknown,
  errors: SelfDeployPackagingPlanError[],
): string[] {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.source_ref_required",
        "/source_refs",
        "Source refs must be present.",
      ),
    );
    return [];
  }

  const sourceRefs: string[] = [];
  for (const [index, ref] of refs.entries()) {
    const value = ref as SelfDeployPackagingPlanSourceRefInput;
    if (
      ref === null ||
      typeof ref !== "object" ||
      Array.isArray(ref) ||
      !safeSource(value.source_ref) ||
      !safeText(value.summary)
    ) {
      errors.push(
        error(
          "self_deploy_packaging_plan.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be repo-local and safe.",
        ),
      );
      continue;
    }
    sourceRefs.push(value.source_ref);
  }

  const requiredSourceRefs = [
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ];

  for (const requiredSourceRef of requiredSourceRefs) {
    if (!sourceRefs.includes(requiredSourceRef)) {
      errors.push(
        error(
          "self_deploy_packaging_plan.source_ref_required",
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
  errors: SelfDeployPackagingPlanError[],
): SelfDeployPackagingPlanNoLivePostureInput {
  if (posture === null || typeof posture !== "object" || Array.isArray(posture)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.no_live_posture_required",
        "/no_live_posture",
        "No-live posture is required.",
      ),
    );
    return defaultSelfDeployPackagingNoLivePosture;
  }

  for (const flag of selfDeployPackagingPlanBlockedCapabilityFlags) {
    if ((posture as Record<string, unknown>)[flag] !== false) {
      errors.push(
        error(
          "self_deploy_packaging_plan.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          `${flag} must be false.`,
        ),
      );
    }
  }

  return posture as SelfDeployPackagingPlanNoLivePostureInput;
}

function validateAllowedState(
  allowedState: unknown,
  errors: SelfDeployPackagingPlanError[],
): SelfDeployPackagingPlanAllowedStateInput {
  if (
    allowedState === null ||
    typeof allowedState !== "object" ||
    Array.isArray(allowedState)
  ) {
    errors.push(
      error(
        "self_deploy_packaging_plan.allowed_state_required",
        "/allowed_state",
        "Allowed state is required.",
      ),
    );
    return defaultSelfDeployPackagingAllowedState;
  }

  const state = allowedState as Partial<SelfDeployPackagingPlanAllowedStateInput>;
  const requiredTrue = [
    "source_only_packaging_plan_allowed",
    "deployment_mode_refs_allowed",
    "artifact_refs_allowed",
    "auth_posture_refs_allowed",
    "integration_posture_refs_allowed",
    "os_python_posture_refs_allowed",
    "open_source_application",
    "self_deploying_management_system",
    "deployment_owner_controls_auth",
    "deployment_owner_controls_integrations",
    "user_owned_integrations",
  ] as const;

  for (const key of requiredTrue) {
    if (state[key] !== true) {
      errors.push(
        error(
          "self_deploy_packaging_plan.allowed_state_drift",
          `/allowed_state/${key}`,
          `${key} must stay true.`,
        ),
      );
    }
  }

  if (state.auth_provider_locked !== false) {
    errors.push(
      error(
        "self_deploy_packaging_plan.allowed_state_drift",
        "/allowed_state/auth_provider_locked",
        "Auth provider lock-in must stay false.",
      ),
    );
  }

  if (state.secret_posture !== "references_only_no_values") {
    errors.push(
      error(
        "self_deploy_packaging_plan.allowed_state_drift",
        "/allowed_state/secret_posture",
        "Secret posture must stay references-only.",
      ),
    );
  }

  validateNoLivePosture(allowedState, errors);
  return allowedState as SelfDeployPackagingPlanAllowedStateInput;
}

function validateForbiddenScope(
  request: SelfDeployPackagingPlanRequest,
  errors: SelfDeployPackagingPlanError[],
): void {
  const freeText = collectFreeTextValues(request).join("\n");

  if (unsafeValuePattern.test(freeText)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.secret_value_forbidden",
        "/",
        "Secrets, credentials, URLs, and connection strings are forbidden.",
      ),
    );
  }
  if (packageOrBinaryPattern.test(freeText)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.package_or_binary_forbidden",
        "/",
        "Package creation, publishing, installers, binaries, images, and service files are forbidden.",
      ),
    );
  }
  if (deployOrInfraPattern.test(freeText)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.deploy_or_infra_forbidden",
        "/",
        "Deploy and infrastructure mutation are forbidden.",
      ),
    );
  }
  if (runtimeOrHostPattern.test(freeText)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.host_or_runtime_forbidden",
        "/",
        "Host mutation and runtime/live scope are forbidden.",
      ),
    );
  }
  if (databaseOrWriterPattern.test(freeText)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.database_or_writer_forbidden",
        "/",
        "Database, writer, SQL, migration, and queue scope are forbidden.",
      ),
    );
  }
  if (authOrIntegrationPattern.test(freeText)) {
    errors.push(
      error(
        "self_deploy_packaging_plan.auth_or_integration_forbidden",
        "/",
        "Auth wiring and integration setup writes are forbidden.",
      ),
    );
  }

  for (const flag of selfDeployPackagingPlanBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "self_deploy_packaging_plan.blocked_capability_forbidden",
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
      if (key === "summary" || key === "mvp_value") {
        values.push(current);
      }
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
    value.length <= 320 &&
    !unsafeValuePattern.test(value)
  );
}

function failSelfDeployPackagingPlan(
  errors: SelfDeployPackagingPlanError[],
): SelfDeployPackagingPlanResult {
  return {
    ok: false,
    self_deploy_packaging_plan: null,
    errors: uniqueErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function error(
  code: SelfDeployPackagingPlanErrorCode,
  path: string,
  message: string,
): SelfDeployPackagingPlanError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function uniqueErrors(
  errors: SelfDeployPackagingPlanError[],
): SelfDeployPackagingPlanError[] {
  const seen = new Set<string>();
  return errors.filter((entry) => {
    const key = `${entry.code}:${entry.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
