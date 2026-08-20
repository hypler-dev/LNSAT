import { selfDeployPackagingPlanContract } from "./self-deploy-packaging-plan-contract.js";

export const AUTH_SESSION_READINESS_CONTRACT_STATUS = "source_only";

export const authSessionReadinessAuthModeKinds = [
  "local_auth",
  "third_party_auth",
  "isolated_auth",
  "user_selected_auth_levels",
] as const;

export const authSessionReadinessIdentityRefKinds = [
  "deployment_owner_identity_ref",
  "local_user_identity_ref",
  "third_party_subject_ref",
  "agent_seat_identity_ref",
  "auditor_identity_ref",
] as const;

export const authSessionReadinessSessionBoundaryKinds = [
  "session_lifecycle_ref",
  "token_lifetime_ref",
  "revocation_ref",
  "step_up_or_mfa_ref",
  "isolated_session_ref",
] as const;

export const authSessionReadinessAuthorizationLevelKinds = [
  "view_source_evidence",
  "run_read_only_inspection",
  "request_action",
  "approve_action",
  "configure_auth",
  "configure_integration",
  "execute_approved_action",
] as const;

export const authSessionReadinessTenantProjectScopeKinds = [
  "tenant_scope_ref",
  "project_scope_ref",
  "environment_scope_ref",
  "integration_scope_ref",
] as const;

export const authSessionReadinessIntegrationAuthBridgeKinds = [
  "secret_reference_bridge",
  "capability_policy_bridge",
  "approval_requirement_bridge",
  "audit_obligation_bridge",
  "disablement_bridge",
] as const;

export const authSessionReadinessPolicyPrerequisiteKinds = [
  "bp0193_auth_integration_posture_ref",
  "bp0216_self_deploy_packaging_ref",
  "bp0202_policy_gate_ref",
  "bp0210_policy_gate_preflight_ref",
] as const;

export const authSessionReadinessApprovalPrerequisiteKinds = [
  "no_live_auth_scope_request_ref",
  "no_permission_mutation_request_ref",
  "no_integration_setup_request_ref",
  "future_auth_config_approval_required_ref",
] as const;

export const authSessionReadinessAuditObligationKinds = [
  "auth_readiness_reviewed",
  "future_session_event_audit_required",
  "future_auth_config_audit_required",
  "future_permission_change_audit_required",
] as const;

export const authSessionReadinessRollbackKinds = [
  "remove_source_contract_artifacts",
  "restore_bp0216_handoff",
  "disable_future_auth_adapter",
] as const;

export const authSessionReadinessValidationKinds = [
  "packet_contract_tests",
  "packet_typecheck",
  "web_user_auth_management_tests",
  "docs_check",
  "format_check",
  "full_workspace_check",
] as const;

export const authSessionReadinessBlockedCapabilityFlags = [
  "local_user_store_allowed",
  "password_hash_storage_allowed",
  "oauth_client_creation_allowed",
  "oauth_callback_route_allowed",
  "jwt_signing_allowed",
  "session_database_allowed",
  "token_storage_allowed",
  "credential_storage_allowed",
  "provider_account_creation_allowed",
  "permission_mutation_allowed",
  "auth_provider_wiring_allowed",
  "integration_setup_write_allowed",
  "live_connector_activation_allowed",
  "external_provider_call_allowed",
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
  "package_install_allowed",
  "deploy_allowed",
  "git_runner_allowed",
  "ssh_allowed",
  "docker_allowed",
  "node_agent_allowed",
  "dns_cloudflare_mutation_allowed",
  "python_runtime_required",
  "os_specific_binary_required",
  "external_service_call_allowed",
  "secret_values_allowed",
] as const;

export const authSessionReadinessContract = {
  contract_id: "lnsat.platform.auth_session_readiness.v0_1",
  authority: ["@lnsat/packets", "source-backed-auth-session-readiness"],
  plan_version: "0.1",
  source_docs: [
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
    "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
    "docs/ROADMAP.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  self_deploy_packaging_plan_contract_id: selfDeployPackagingPlanContract.contract_id,
  contract_authority: "source_only_auth_readiness_no_provider_or_session_runtime",
  open_source_application: true,
  self_deploying_management_system: true,
  deployment_owner_controls_auth: true,
  deployment_owner_controls_authorization_levels: true,
  auth_provider_locked: false,
  secret_references_only: true,
  live_auth_provider_configured: false,
  session_database_allowed: false,
  permission_mutation_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type AuthSessionReadinessAuthModeKind =
  (typeof authSessionReadinessAuthModeKinds)[number];
export type AuthSessionReadinessIdentityRefKind =
  (typeof authSessionReadinessIdentityRefKinds)[number];
export type AuthSessionReadinessSessionBoundaryKind =
  (typeof authSessionReadinessSessionBoundaryKinds)[number];
export type AuthSessionReadinessAuthorizationLevelKind =
  (typeof authSessionReadinessAuthorizationLevelKinds)[number];
export type AuthSessionReadinessTenantProjectScopeKind =
  (typeof authSessionReadinessTenantProjectScopeKinds)[number];
export type AuthSessionReadinessIntegrationAuthBridgeKind =
  (typeof authSessionReadinessIntegrationAuthBridgeKinds)[number];
export type AuthSessionReadinessPolicyPrerequisiteKind =
  (typeof authSessionReadinessPolicyPrerequisiteKinds)[number];
export type AuthSessionReadinessApprovalPrerequisiteKind =
  (typeof authSessionReadinessApprovalPrerequisiteKinds)[number];
export type AuthSessionReadinessAuditObligationKind =
  (typeof authSessionReadinessAuditObligationKinds)[number];
export type AuthSessionReadinessRollbackKind =
  (typeof authSessionReadinessRollbackKinds)[number];
export type AuthSessionReadinessValidationKind =
  (typeof authSessionReadinessValidationKinds)[number];
export type AuthSessionReadinessBlockedCapabilityFlag =
  (typeof authSessionReadinessBlockedCapabilityFlags)[number];

export type AuthSessionReadinessIdentityInput = {
  packet_ref: "BP-0217";
  selected_after_packet_ref: "BP-0216";
  readiness_ref: "auth_session_authorization_levels:source_only";
  readiness_mode: "source_contract_only";
  mvp_value: string;
};

export type AuthSessionReadinessAuthModeRefInput = {
  auth_ref: string;
  auth_kind: AuthSessionReadinessAuthModeKind;
  current_state: "future_auth_mode_source_ref_only";
  deployment_owner_controlled: true;
  provider_locked: false;
  provider_wiring_allowed: false;
  session_database_allowed: false;
  credential_storage_allowed: false;
};

export type AuthSessionReadinessIdentityRefInput = {
  identity_ref: string;
  identity_kind: AuthSessionReadinessIdentityRefKind;
  current_state: "future_identity_source_ref_only";
  user_store_allowed: false;
  provider_account_creation_allowed: false;
  credential_storage_allowed: false;
};

export type AuthSessionReadinessSessionBoundaryRefInput = {
  session_ref: string;
  session_kind: AuthSessionReadinessSessionBoundaryKind;
  current_state: "future_session_boundary_source_ref_only";
  session_database_allowed: false;
  token_storage_allowed: false;
  jwt_signing_allowed: false;
  oauth_callback_route_allowed: false;
};

export type AuthSessionReadinessAuthorizationLevelRefInput = {
  level_ref: string;
  level_kind: AuthSessionReadinessAuthorizationLevelKind;
  current_state: "read_only_allowed" | "preview_only" | "blocked_until_later_packet";
  permission_mutation_allowed: false;
  live_execution_allowed: false;
};

export type AuthSessionReadinessTenantProjectScopeRefInput = {
  scope_ref: string;
  scope_kind: AuthSessionReadinessTenantProjectScopeKind;
  current_state: "future_scope_source_ref_only";
  database_write_allowed: false;
  permission_mutation_allowed: false;
};

export type AuthSessionReadinessIntegrationAuthBridgeRefInput = {
  bridge_ref: string;
  bridge_kind: AuthSessionReadinessIntegrationAuthBridgeKind;
  current_state: "future_integration_auth_bridge_source_ref_only";
  secret_references_only: true;
  integration_setup_write_allowed: false;
  live_connector_activation_allowed: false;
};

export type AuthSessionReadinessPolicyPrerequisiteRefInput = {
  prerequisite_ref: string;
  prerequisite_kind: AuthSessionReadinessPolicyPrerequisiteKind;
  current_state: "source_ref_only_no_policy_mutation";
  permission_mutation_allowed: false;
  live_execution_allowed: false;
};

export type AuthSessionReadinessApprovalPrerequisiteRefInput = {
  approval_ref: string;
  approval_kind: AuthSessionReadinessApprovalPrerequisiteKind;
  required_before_future_auth_runtime: true;
  current_state: "source_ref_only_no_approval_request_created";
  approval_mutation_allowed: false;
};

export type AuthSessionReadinessAuditObligationRefInput = {
  audit_ref: string;
  audit_kind: AuthSessionReadinessAuditObligationKind;
  required_before_future_auth_runtime: true;
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  persisted_audit_writer_allowed: false;
};

export type AuthSessionReadinessRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: AuthSessionReadinessRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
};

export type AuthSessionReadinessValidationCommandRefInput = {
  validation_ref: string;
  validation_kind: AuthSessionReadinessValidationKind;
  command_ref: string;
  current_state: "named_validation_only";
  live_execution_allowed: false;
};

export type AuthSessionReadinessSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type AuthSessionReadinessNoLivePostureInput = Record<
  AuthSessionReadinessBlockedCapabilityFlag,
  false
>;

export type AuthSessionReadinessAllowedStateInput =
  AuthSessionReadinessNoLivePostureInput & {
    source_only_auth_readiness_allowed: true;
    auth_mode_refs_allowed: true;
    identity_refs_allowed: true;
    session_boundary_refs_allowed: true;
    authorization_level_refs_allowed: true;
    tenant_project_scope_refs_allowed: true;
    integration_auth_bridge_refs_allowed: true;
    open_source_application: true;
    self_deploying_management_system: true;
    deployment_owner_controls_auth: true;
    deployment_owner_controls_authorization_levels: true;
    auth_provider_locked: false;
    secret_posture: "references_only_no_values";
  };

export type AuthSessionReadinessRequest = Partial<
  Record<AuthSessionReadinessBlockedCapabilityFlag, false>
> & {
  plan_version?: typeof authSessionReadinessContract.plan_version;
  readiness_identity?: AuthSessionReadinessIdentityInput;
  auth_mode_refs?: AuthSessionReadinessAuthModeRefInput[];
  identity_refs?: AuthSessionReadinessIdentityRefInput[];
  session_boundary_refs?: AuthSessionReadinessSessionBoundaryRefInput[];
  authorization_level_refs?: AuthSessionReadinessAuthorizationLevelRefInput[];
  tenant_project_scope_refs?: AuthSessionReadinessTenantProjectScopeRefInput[];
  integration_auth_bridge_refs?: AuthSessionReadinessIntegrationAuthBridgeRefInput[];
  policy_prerequisite_refs?: AuthSessionReadinessPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs?: AuthSessionReadinessApprovalPrerequisiteRefInput[];
  audit_obligation_refs?: AuthSessionReadinessAuditObligationRefInput[];
  rollback_refs?: AuthSessionReadinessRollbackRefInput[];
  validation_command_refs?: AuthSessionReadinessValidationCommandRefInput[];
  source_refs?: AuthSessionReadinessSourceRefInput[];
  no_live_posture?: AuthSessionReadinessNoLivePostureInput;
  allowed_state?: AuthSessionReadinessAllowedStateInput;
  contract_authority?: typeof authSessionReadinessContract.contract_authority;
  side_effects?: [];
};

export type AuthSessionReadinessErrorCode =
  | "auth_session_readiness.invalid_request"
  | "auth_session_readiness.unexpected_field"
  | "auth_session_readiness.invalid_version"
  | "auth_session_readiness.invalid_identity"
  | "auth_session_readiness.auth_mode_ref_required"
  | "auth_session_readiness.invalid_auth_mode_ref"
  | "auth_session_readiness.identity_ref_required"
  | "auth_session_readiness.invalid_identity_ref"
  | "auth_session_readiness.session_boundary_ref_required"
  | "auth_session_readiness.invalid_session_boundary_ref"
  | "auth_session_readiness.authorization_level_ref_required"
  | "auth_session_readiness.invalid_authorization_level_ref"
  | "auth_session_readiness.tenant_project_scope_ref_required"
  | "auth_session_readiness.invalid_tenant_project_scope_ref"
  | "auth_session_readiness.integration_auth_bridge_ref_required"
  | "auth_session_readiness.invalid_integration_auth_bridge_ref"
  | "auth_session_readiness.policy_prerequisite_ref_required"
  | "auth_session_readiness.invalid_policy_prerequisite_ref"
  | "auth_session_readiness.approval_prerequisite_ref_required"
  | "auth_session_readiness.invalid_approval_prerequisite_ref"
  | "auth_session_readiness.audit_obligation_ref_required"
  | "auth_session_readiness.invalid_audit_obligation_ref"
  | "auth_session_readiness.rollback_ref_required"
  | "auth_session_readiness.invalid_rollback_ref"
  | "auth_session_readiness.validation_command_ref_required"
  | "auth_session_readiness.invalid_validation_command_ref"
  | "auth_session_readiness.source_ref_required"
  | "auth_session_readiness.invalid_source_ref"
  | "auth_session_readiness.no_live_posture_required"
  | "auth_session_readiness.no_live_posture_drift"
  | "auth_session_readiness.allowed_state_required"
  | "auth_session_readiness.allowed_state_drift"
  | "auth_session_readiness.unsafe_contract_authority"
  | "auth_session_readiness.auth_runtime_forbidden"
  | "auth_session_readiness.permission_mutation_forbidden"
  | "auth_session_readiness.database_or_writer_forbidden"
  | "auth_session_readiness.runtime_or_deploy_forbidden"
  | "auth_session_readiness.host_or_os_forbidden"
  | "auth_session_readiness.external_service_forbidden"
  | "auth_session_readiness.secret_value_forbidden"
  | "auth_session_readiness.blocked_capability_forbidden"
  | "auth_session_readiness.side_effects_forbidden";

export type AuthSessionReadinessError = {
  code: AuthSessionReadinessErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuthSessionReadinessEvidence = {
  contract_id: typeof authSessionReadinessContract.contract_id;
  plan_version: typeof authSessionReadinessContract.plan_version;
  readiness_identity: AuthSessionReadinessIdentityInput;
  self_deploy_packaging_plan_contract_id: typeof selfDeployPackagingPlanContract.contract_id;
  auth_mode_refs: AuthSessionReadinessAuthModeRefInput[];
  identity_refs: AuthSessionReadinessIdentityRefInput[];
  session_boundary_refs: AuthSessionReadinessSessionBoundaryRefInput[];
  authorization_level_refs: AuthSessionReadinessAuthorizationLevelRefInput[];
  tenant_project_scope_refs: AuthSessionReadinessTenantProjectScopeRefInput[];
  integration_auth_bridge_refs: AuthSessionReadinessIntegrationAuthBridgeRefInput[];
  policy_prerequisite_refs: AuthSessionReadinessPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs: AuthSessionReadinessApprovalPrerequisiteRefInput[];
  audit_obligation_refs: AuthSessionReadinessAuditObligationRefInput[];
  rollback_refs: AuthSessionReadinessRollbackRefInput[];
  validation_command_refs: AuthSessionReadinessValidationCommandRefInput[];
  source_refs: string[];
  no_live_posture: AuthSessionReadinessNoLivePostureInput;
  allowed_state: AuthSessionReadinessAllowedStateInput;
  blocked_capabilities: AuthSessionReadinessBlockedCapabilityFlag[];
  source_contract_artifacts: [
    "packages/packets/src/auth-session-readiness-contract.ts",
    "packages/packets/test/auth-session-readiness-contract.test.ts",
  ];
  auth_runtime_artifacts: [];
  user_store_artifacts: [];
  session_database_artifacts: [];
  provider_adapter_artifacts: [];
  credential_artifacts: [];
  permission_mutation_artifacts: [];
  integration_setup_artifacts: [];
  runtime_artifacts: [];
  database_artifacts: [];
  external_service_clients: [];
  live_auth_provider_configured: false;
  session_database_allowed: false;
  permission_mutation_allowed: false;
  auth_provider_wiring_allowed: false;
  integration_setup_write_allowed: false;
  secret_values_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type AuthSessionReadinessResult =
  | {
      ok: true;
      auth_session_readiness: AuthSessionReadinessEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      auth_session_readiness: null;
      errors: AuthSessionReadinessError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAuthSessionReadiness =
  | {
      ok: true;
      readiness_identity: AuthSessionReadinessIdentityInput;
      auth_mode_refs: AuthSessionReadinessAuthModeRefInput[];
      identity_refs: AuthSessionReadinessIdentityRefInput[];
      session_boundary_refs: AuthSessionReadinessSessionBoundaryRefInput[];
      authorization_level_refs: AuthSessionReadinessAuthorizationLevelRefInput[];
      tenant_project_scope_refs: AuthSessionReadinessTenantProjectScopeRefInput[];
      integration_auth_bridge_refs: AuthSessionReadinessIntegrationAuthBridgeRefInput[];
      policy_prerequisite_refs: AuthSessionReadinessPolicyPrerequisiteRefInput[];
      approval_prerequisite_refs: AuthSessionReadinessApprovalPrerequisiteRefInput[];
      audit_obligation_refs: AuthSessionReadinessAuditObligationRefInput[];
      rollback_refs: AuthSessionReadinessRollbackRefInput[];
      validation_command_refs: AuthSessionReadinessValidationCommandRefInput[];
      source_refs: string[];
      no_live_posture: AuthSessionReadinessNoLivePostureInput;
      allowed_state: AuthSessionReadinessAllowedStateInput;
    }
  | {
      ok: false;
      errors: AuthSessionReadinessError[];
    };

const requestKeys = new Set([
  "plan_version",
  "readiness_identity",
  "auth_mode_refs",
  "identity_refs",
  "session_boundary_refs",
  "authorization_level_refs",
  "tenant_project_scope_refs",
  "integration_auth_bridge_refs",
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
  ...authSessionReadinessBlockedCapabilityFlags,
]);

const safeIdPattern = /^[a-z][a-z0-9_.:-]{2,140}$/;
const safeSourceRefPattern =
  /^(?:docs\/[A-Za-z0-9_./-]+|packages\/packets\/(?:src|test)\/[A-Za-z0-9_.-]+\.ts)$/;
const safeCommandRefPattern =
  /^npm run (?:test -w @lnsat\/packets -- auth-session-readiness-contract|typecheck -w @lnsat\/packets|test -w @lnsat\/web -- auth-session-management auth-integration-posture management-overview management-surface-index packet-management|docs:check|format:check|check)$/;
const unsafeValuePattern =
  /(?:DATABASE_URL|postgres:\/\/|mysql:\/\/|mongodb:\/\/|PRIVATE KEY|BEGIN [A-Z ]*KEY|API_KEY|SECRET=|TOKEN=|PASSWORD=|credential_value|raw_secret|provider_account_secret|gh[pous]_[A-Za-z0-9]|sk-[A-Za-z0-9]|xox[baprs]-|https?:\/\/|ssh:\/\/|file:\/\/)/i;

export const defaultAuthSessionReadinessIdentity: AuthSessionReadinessIdentityInput = {
  packet_ref: "BP-0217",
  selected_after_packet_ref: "BP-0216",
  readiness_ref: "auth_session_authorization_levels:source_only",
  readiness_mode: "source_contract_only",
  mvp_value:
    "Make local auth, third-party auth, isolated auth, sessions, and user-selected authorization levels explicit before any auth runtime or user store exists.",
};

export const defaultAuthSessionReadinessAuthModeRefs: AuthSessionReadinessAuthModeRefInput[] =
  authSessionReadinessAuthModeKinds.map((kind) => ({
    auth_ref: `auth_mode:${kind}`,
    auth_kind: kind,
    current_state: "future_auth_mode_source_ref_only",
    deployment_owner_controlled: true,
    provider_locked: false,
    provider_wiring_allowed: false,
    session_database_allowed: false,
    credential_storage_allowed: false,
  }));

export const defaultAuthSessionReadinessIdentityRefs: AuthSessionReadinessIdentityRefInput[] =
  authSessionReadinessIdentityRefKinds.map((kind) => ({
    identity_ref: `identity:${kind}`,
    identity_kind: kind,
    current_state: "future_identity_source_ref_only",
    user_store_allowed: false,
    provider_account_creation_allowed: false,
    credential_storage_allowed: false,
  }));

export const defaultAuthSessionReadinessSessionBoundaryRefs: AuthSessionReadinessSessionBoundaryRefInput[] =
  authSessionReadinessSessionBoundaryKinds.map((kind) => ({
    session_ref: `session_boundary:${kind}`,
    session_kind: kind,
    current_state: "future_session_boundary_source_ref_only",
    session_database_allowed: false,
    token_storage_allowed: false,
    jwt_signing_allowed: false,
    oauth_callback_route_allowed: false,
  }));

export const defaultAuthSessionReadinessAuthorizationLevelRefs: AuthSessionReadinessAuthorizationLevelRefInput[] =
  authSessionReadinessAuthorizationLevelKinds.map((kind) => ({
    level_ref: `authorization_level:${kind}`,
    level_kind: kind,
    current_state:
      kind === "view_source_evidence" || kind === "run_read_only_inspection"
        ? "read_only_allowed"
        : kind === "request_action"
          ? "preview_only"
          : "blocked_until_later_packet",
    permission_mutation_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultAuthSessionReadinessTenantProjectScopeRefs: AuthSessionReadinessTenantProjectScopeRefInput[] =
  authSessionReadinessTenantProjectScopeKinds.map((kind) => ({
    scope_ref: `auth_scope:${kind}`,
    scope_kind: kind,
    current_state: "future_scope_source_ref_only",
    database_write_allowed: false,
    permission_mutation_allowed: false,
  }));

export const defaultAuthSessionReadinessIntegrationAuthBridgeRefs: AuthSessionReadinessIntegrationAuthBridgeRefInput[] =
  authSessionReadinessIntegrationAuthBridgeKinds.map((kind) => ({
    bridge_ref: `integration_auth_bridge:${kind}`,
    bridge_kind: kind,
    current_state: "future_integration_auth_bridge_source_ref_only",
    secret_references_only: true,
    integration_setup_write_allowed: false,
    live_connector_activation_allowed: false,
  }));

export const defaultAuthSessionReadinessPolicyPrerequisiteRefs: AuthSessionReadinessPolicyPrerequisiteRefInput[] =
  authSessionReadinessPolicyPrerequisiteKinds.map((kind) => ({
    prerequisite_ref: `policy_prerequisite:${kind}`,
    prerequisite_kind: kind,
    current_state: "source_ref_only_no_policy_mutation",
    permission_mutation_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultAuthSessionReadinessApprovalPrerequisiteRefs: AuthSessionReadinessApprovalPrerequisiteRefInput[] =
  authSessionReadinessApprovalPrerequisiteKinds.map((kind) => ({
    approval_ref: `approval_prerequisite:${kind}`,
    approval_kind: kind,
    required_before_future_auth_runtime: true,
    current_state: "source_ref_only_no_approval_request_created",
    approval_mutation_allowed: false,
  }));

export const defaultAuthSessionReadinessAuditObligationRefs: AuthSessionReadinessAuditObligationRefInput[] =
  authSessionReadinessAuditObligationKinds.map((kind) => ({
    audit_ref: `audit_obligation:${kind}`,
    audit_kind: kind,
    required_before_future_auth_runtime: true,
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    persisted_audit_writer_allowed: false,
  }));

export const defaultAuthSessionReadinessRollbackRefs: AuthSessionReadinessRollbackRefInput[] =
  authSessionReadinessRollbackKinds.map((kind) => ({
    rollback_ref: `rollback:${kind}`,
    rollback_kind: kind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
  }));

const defaultAuthSessionReadinessValidationCommandTuples: readonly [
  AuthSessionReadinessValidationKind,
  string,
][] = [
  [
    "packet_contract_tests",
    "npm run test -w @lnsat/packets -- auth-session-readiness-contract",
  ],
  ["packet_typecheck", "npm run typecheck -w @lnsat/packets"],
  [
    "web_user_auth_management_tests",
    "npm run test -w @lnsat/web -- auth-session-management auth-integration-posture management-overview management-surface-index packet-management",
  ],
  ["docs_check", "npm run docs:check"],
  ["format_check", "npm run format:check"],
  ["full_workspace_check", "npm run check"],
];

export const defaultAuthSessionReadinessValidationCommandRefs: AuthSessionReadinessValidationCommandRefInput[] =
  defaultAuthSessionReadinessValidationCommandTuples.map(
    ([validation_kind, command_ref]) => ({
      validation_ref: `validation:${validation_kind}`,
      validation_kind,
      command_ref,
      current_state: "named_validation_only",
      live_execution_allowed: false,
    }),
  );

export const defaultAuthSessionReadinessSourceRefs: AuthSessionReadinessSourceRefInput[] =
  [
    ...authSessionReadinessContract.source_docs,
    "packages/packets/src/auth-session-readiness-contract.ts",
    "packages/packets/test/auth-session-readiness-contract.test.ts",
  ].map((source_ref) => ({
    source_ref,
    summary:
      "Repo-local source evidence for BP-0217 auth session and authorization readiness.",
  }));

export const defaultAuthSessionReadinessNoLivePosture = Object.fromEntries(
  authSessionReadinessBlockedCapabilityFlags.map((flag) => [flag, false]),
) as AuthSessionReadinessNoLivePostureInput;

export const defaultAuthSessionReadinessAllowedState: AuthSessionReadinessAllowedStateInput =
  {
    ...defaultAuthSessionReadinessNoLivePosture,
    source_only_auth_readiness_allowed: true,
    auth_mode_refs_allowed: true,
    identity_refs_allowed: true,
    session_boundary_refs_allowed: true,
    authorization_level_refs_allowed: true,
    tenant_project_scope_refs_allowed: true,
    integration_auth_bridge_refs_allowed: true,
    open_source_application: true,
    self_deploying_management_system: true,
    deployment_owner_controls_auth: true,
    deployment_owner_controls_authorization_levels: true,
    auth_provider_locked: false,
    secret_posture: "references_only_no_values",
  };

export const defaultAuthSessionReadiness: AuthSessionReadinessRequest = {
  plan_version: authSessionReadinessContract.plan_version,
  readiness_identity: defaultAuthSessionReadinessIdentity,
  auth_mode_refs: defaultAuthSessionReadinessAuthModeRefs,
  identity_refs: defaultAuthSessionReadinessIdentityRefs,
  session_boundary_refs: defaultAuthSessionReadinessSessionBoundaryRefs,
  authorization_level_refs: defaultAuthSessionReadinessAuthorizationLevelRefs,
  tenant_project_scope_refs: defaultAuthSessionReadinessTenantProjectScopeRefs,
  integration_auth_bridge_refs: defaultAuthSessionReadinessIntegrationAuthBridgeRefs,
  policy_prerequisite_refs: defaultAuthSessionReadinessPolicyPrerequisiteRefs,
  approval_prerequisite_refs: defaultAuthSessionReadinessApprovalPrerequisiteRefs,
  audit_obligation_refs: defaultAuthSessionReadinessAuditObligationRefs,
  rollback_refs: defaultAuthSessionReadinessRollbackRefs,
  validation_command_refs: defaultAuthSessionReadinessValidationCommandRefs,
  source_refs: defaultAuthSessionReadinessSourceRefs,
  no_live_posture: defaultAuthSessionReadinessNoLivePosture,
  allowed_state: defaultAuthSessionReadinessAllowedState,
  contract_authority: authSessionReadinessContract.contract_authority,
  side_effects: [],
};

export function createAuthSessionReadinessContract(
  request: AuthSessionReadinessRequest = {},
): AuthSessionReadinessResult {
  const normalized = normalizeAuthSessionReadiness({
    ...defaultAuthSessionReadiness,
    ...request,
  });

  if (!normalized.ok) {
    return failAuthSessionReadiness(normalized.errors);
  }

  return {
    ok: true,
    auth_session_readiness: {
      contract_id: authSessionReadinessContract.contract_id,
      plan_version: authSessionReadinessContract.plan_version,
      readiness_identity: normalized.readiness_identity,
      self_deploy_packaging_plan_contract_id:
        selfDeployPackagingPlanContract.contract_id,
      auth_mode_refs: normalized.auth_mode_refs,
      identity_refs: normalized.identity_refs,
      session_boundary_refs: normalized.session_boundary_refs,
      authorization_level_refs: normalized.authorization_level_refs,
      tenant_project_scope_refs: normalized.tenant_project_scope_refs,
      integration_auth_bridge_refs: normalized.integration_auth_bridge_refs,
      policy_prerequisite_refs: normalized.policy_prerequisite_refs,
      approval_prerequisite_refs: normalized.approval_prerequisite_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      validation_command_refs: normalized.validation_command_refs,
      source_refs: normalized.source_refs,
      no_live_posture: normalized.no_live_posture,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...authSessionReadinessBlockedCapabilityFlags],
      source_contract_artifacts: [
        "packages/packets/src/auth-session-readiness-contract.ts",
        "packages/packets/test/auth-session-readiness-contract.test.ts",
      ],
      auth_runtime_artifacts: [],
      user_store_artifacts: [],
      session_database_artifacts: [],
      provider_adapter_artifacts: [],
      credential_artifacts: [],
      permission_mutation_artifacts: [],
      integration_setup_artifacts: [],
      runtime_artifacts: [],
      database_artifacts: [],
      external_service_clients: [],
      live_auth_provider_configured: false,
      session_database_allowed: false,
      permission_mutation_allowed: false,
      auth_provider_wiring_allowed: false,
      integration_setup_write_allowed: false,
      secret_values_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAuthSessionReadiness(
  request: AuthSessionReadinessRequest,
): NormalizedAuthSessionReadiness {
  const errors: AuthSessionReadinessError[] = [];

  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    return {
      ok: false,
      errors: [
        error(
          "auth_session_readiness.invalid_request",
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
          "auth_session_readiness.unexpected_field",
          `/${key}`,
          "Unexpected field is not allowed.",
        ),
      );
    }
  }

  if (request.plan_version !== authSessionReadinessContract.plan_version) {
    errors.push(
      error(
        "auth_session_readiness.invalid_version",
        "/plan_version",
        "Plan version must match the source contract.",
      ),
    );
  }

  const readinessIdentity = request.readiness_identity;
  if (
    !readinessIdentity ||
    readinessIdentity.packet_ref !== "BP-0217" ||
    readinessIdentity.selected_after_packet_ref !== "BP-0216" ||
    readinessIdentity.readiness_ref !==
      "auth_session_authorization_levels:source_only" ||
    readinessIdentity.readiness_mode !== "source_contract_only" ||
    !safeText(readinessIdentity.mvp_value)
  ) {
    errors.push(
      error(
        "auth_session_readiness.invalid_identity",
        "/readiness_identity",
        "Readiness identity must name BP-0217 source-only auth readiness.",
      ),
    );
  }

  const authModeRefs = validateRefs(
    request.auth_mode_refs,
    authSessionReadinessAuthModeKinds,
    "auth_mode_refs",
    "auth_kind",
    "auth_ref",
    validateAuthModeRef,
    errors,
  );
  const identityRefs = validateRefs(
    request.identity_refs,
    authSessionReadinessIdentityRefKinds,
    "identity_refs",
    "identity_kind",
    "identity_ref",
    validateIdentityRef,
    errors,
  );
  const sessionBoundaryRefs = validateRefs(
    request.session_boundary_refs,
    authSessionReadinessSessionBoundaryKinds,
    "session_boundary_refs",
    "session_kind",
    "session_ref",
    validateSessionBoundaryRef,
    errors,
  );
  const authorizationLevelRefs = validateRefs(
    request.authorization_level_refs,
    authSessionReadinessAuthorizationLevelKinds,
    "authorization_level_refs",
    "level_kind",
    "level_ref",
    validateAuthorizationLevelRef,
    errors,
  );
  const tenantProjectScopeRefs = validateRefs(
    request.tenant_project_scope_refs,
    authSessionReadinessTenantProjectScopeKinds,
    "tenant_project_scope_refs",
    "scope_kind",
    "scope_ref",
    validateTenantProjectScopeRef,
    errors,
  );
  const integrationAuthBridgeRefs = validateRefs(
    request.integration_auth_bridge_refs,
    authSessionReadinessIntegrationAuthBridgeKinds,
    "integration_auth_bridge_refs",
    "bridge_kind",
    "bridge_ref",
    validateIntegrationAuthBridgeRef,
    errors,
  );
  const policyPrerequisiteRefs = validateRefs(
    request.policy_prerequisite_refs,
    authSessionReadinessPolicyPrerequisiteKinds,
    "policy_prerequisite_refs",
    "prerequisite_kind",
    "prerequisite_ref",
    validatePolicyPrerequisiteRef,
    errors,
  );
  const approvalPrerequisiteRefs = validateRefs(
    request.approval_prerequisite_refs,
    authSessionReadinessApprovalPrerequisiteKinds,
    "approval_prerequisite_refs",
    "approval_kind",
    "approval_ref",
    validateApprovalPrerequisiteRef,
    errors,
  );
  const auditObligationRefs = validateRefs(
    request.audit_obligation_refs,
    authSessionReadinessAuditObligationKinds,
    "audit_obligation_refs",
    "audit_kind",
    "audit_ref",
    validateAuditObligationRef,
    errors,
  );
  const rollbackRefs = validateRefs(
    request.rollback_refs,
    authSessionReadinessRollbackKinds,
    "rollback_refs",
    "rollback_kind",
    "rollback_ref",
    validateRollbackRef,
    errors,
  );
  const validationCommandRefs = validateRefs(
    request.validation_command_refs,
    authSessionReadinessValidationKinds,
    "validation_command_refs",
    "validation_kind",
    "validation_ref",
    validateValidationCommandRef,
    errors,
  );

  const sourceRefs = validateSourceRefs(request.source_refs, errors);
  const noLivePosture = validateNoLivePosture(request.no_live_posture, errors);
  const allowedState = validateAllowedState(request.allowed_state, errors);

  if (request.contract_authority !== authSessionReadinessContract.contract_authority) {
    errors.push(
      error(
        "auth_session_readiness.unsafe_contract_authority",
        "/contract_authority",
        "Contract authority must remain source-only with no provider or session runtime.",
      ),
    );
  }

  validateForbiddenScope(request, errors);

  if (Array.isArray(request.side_effects) && request.side_effects.length > 0) {
    errors.push(
      error(
        "auth_session_readiness.side_effects_forbidden",
        "/side_effects",
        "Side effects must stay empty.",
      ),
    );
  }

  if (errors.length > 0 || !readinessIdentity) {
    return { ok: false, errors: uniqueErrors(errors) };
  }

  return {
    ok: true,
    readiness_identity: readinessIdentity,
    auth_mode_refs: authModeRefs,
    identity_refs: identityRefs,
    session_boundary_refs: sessionBoundaryRefs,
    authorization_level_refs: authorizationLevelRefs,
    tenant_project_scope_refs: tenantProjectScopeRefs,
    integration_auth_bridge_refs: integrationAuthBridgeRefs,
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
  errors: AuthSessionReadinessError[],
): T[] {
  if (!Array.isArray(refs)) {
    errors.push(error(refRequiredCode(path), `/${path}`, `${path} must be present.`));
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
          refInvalidCode(path),
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
          refRequiredCode(path),
          `/${path}`,
          `${path} must include ${requiredKind}.`,
        ),
      );
    }
  }

  return normalized;
}

function validateAuthModeRef(ref: AuthSessionReadinessAuthModeRefInput): boolean {
  return (
    authSessionReadinessAuthModeKinds.includes(ref.auth_kind) &&
    ref.current_state === "future_auth_mode_source_ref_only" &&
    ref.deployment_owner_controlled === true &&
    ref.provider_locked === false &&
    ref.provider_wiring_allowed === false &&
    ref.session_database_allowed === false &&
    ref.credential_storage_allowed === false
  );
}

function validateIdentityRef(ref: AuthSessionReadinessIdentityRefInput): boolean {
  return (
    authSessionReadinessIdentityRefKinds.includes(ref.identity_kind) &&
    ref.current_state === "future_identity_source_ref_only" &&
    ref.user_store_allowed === false &&
    ref.provider_account_creation_allowed === false &&
    ref.credential_storage_allowed === false
  );
}

function validateSessionBoundaryRef(
  ref: AuthSessionReadinessSessionBoundaryRefInput,
): boolean {
  return (
    authSessionReadinessSessionBoundaryKinds.includes(ref.session_kind) &&
    ref.current_state === "future_session_boundary_source_ref_only" &&
    ref.session_database_allowed === false &&
    ref.token_storage_allowed === false &&
    ref.jwt_signing_allowed === false &&
    ref.oauth_callback_route_allowed === false
  );
}

function validateAuthorizationLevelRef(
  ref: AuthSessionReadinessAuthorizationLevelRefInput,
): boolean {
  return (
    authSessionReadinessAuthorizationLevelKinds.includes(ref.level_kind) &&
    ["read_only_allowed", "preview_only", "blocked_until_later_packet"].includes(
      ref.current_state,
    ) &&
    ref.permission_mutation_allowed === false &&
    ref.live_execution_allowed === false
  );
}

function validateTenantProjectScopeRef(
  ref: AuthSessionReadinessTenantProjectScopeRefInput,
): boolean {
  return (
    authSessionReadinessTenantProjectScopeKinds.includes(ref.scope_kind) &&
    ref.current_state === "future_scope_source_ref_only" &&
    ref.database_write_allowed === false &&
    ref.permission_mutation_allowed === false
  );
}

function validateIntegrationAuthBridgeRef(
  ref: AuthSessionReadinessIntegrationAuthBridgeRefInput,
): boolean {
  return (
    authSessionReadinessIntegrationAuthBridgeKinds.includes(ref.bridge_kind) &&
    ref.current_state === "future_integration_auth_bridge_source_ref_only" &&
    ref.secret_references_only === true &&
    ref.integration_setup_write_allowed === false &&
    ref.live_connector_activation_allowed === false
  );
}

function validatePolicyPrerequisiteRef(
  ref: AuthSessionReadinessPolicyPrerequisiteRefInput,
): boolean {
  return (
    authSessionReadinessPolicyPrerequisiteKinds.includes(ref.prerequisite_kind) &&
    ref.current_state === "source_ref_only_no_policy_mutation" &&
    ref.permission_mutation_allowed === false &&
    ref.live_execution_allowed === false
  );
}

function validateApprovalPrerequisiteRef(
  ref: AuthSessionReadinessApprovalPrerequisiteRefInput,
): boolean {
  return (
    authSessionReadinessApprovalPrerequisiteKinds.includes(ref.approval_kind) &&
    ref.required_before_future_auth_runtime === true &&
    ref.current_state === "source_ref_only_no_approval_request_created" &&
    ref.approval_mutation_allowed === false
  );
}

function validateAuditObligationRef(
  ref: AuthSessionReadinessAuditObligationRefInput,
): boolean {
  return (
    authSessionReadinessAuditObligationKinds.includes(ref.audit_kind) &&
    ref.required_before_future_auth_runtime === true &&
    ref.current_state === "source_ref_only_no_audit_write" &&
    ref.audit_write_allowed === false &&
    ref.persisted_audit_writer_allowed === false
  );
}

function validateRollbackRef(ref: AuthSessionReadinessRollbackRefInput): boolean {
  return (
    authSessionReadinessRollbackKinds.includes(ref.rollback_kind) &&
    ref.current_state === "source_ref_only_no_rollback_execution" &&
    ref.rollback_execution_allowed === false
  );
}

function validateValidationCommandRef(
  ref: AuthSessionReadinessValidationCommandRefInput,
): boolean {
  return (
    authSessionReadinessValidationKinds.includes(ref.validation_kind) &&
    safeCommandRefPattern.test(ref.command_ref) &&
    ref.current_state === "named_validation_only" &&
    ref.live_execution_allowed === false
  );
}

function validateSourceRefs(
  refs: unknown,
  errors: AuthSessionReadinessError[],
): string[] {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "auth_session_readiness.source_ref_required",
        "/source_refs",
        "source_refs must be present.",
      ),
    );
    return [];
  }

  const normalized: string[] = [];
  for (const [index, ref] of refs.entries()) {
    if (
      ref === null ||
      typeof ref !== "object" ||
      Array.isArray(ref) ||
      !safeSourceRef((ref as AuthSessionReadinessSourceRefInput).source_ref) ||
      !safeText((ref as AuthSessionReadinessSourceRefInput).summary)
    ) {
      errors.push(
        error(
          "auth_session_readiness.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be repo-local and safe.",
        ),
      );
      continue;
    }
    normalized.push((ref as AuthSessionReadinessSourceRefInput).source_ref);
  }

  for (const required of authSessionReadinessContract.source_docs) {
    if (!normalized.includes(required)) {
      errors.push(
        error(
          "auth_session_readiness.source_ref_required",
          "/source_refs",
          `source_refs must include ${required}.`,
        ),
      );
    }
  }

  return normalized;
}

function validateNoLivePosture(
  posture: unknown,
  errors: AuthSessionReadinessError[],
): AuthSessionReadinessNoLivePostureInput {
  if (posture === null || typeof posture !== "object" || Array.isArray(posture)) {
    errors.push(
      error(
        "auth_session_readiness.no_live_posture_required",
        "/no_live_posture",
        "No-live posture must be present.",
      ),
    );
    return defaultAuthSessionReadinessNoLivePosture;
  }

  for (const flag of authSessionReadinessBlockedCapabilityFlags) {
    if ((posture as Record<string, unknown>)[flag] !== false) {
      errors.push(
        error(
          "auth_session_readiness.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "No-live posture flags must stay false.",
        ),
      );
    }
  }

  return posture as AuthSessionReadinessNoLivePostureInput;
}

function validateAllowedState(
  allowedState: unknown,
  errors: AuthSessionReadinessError[],
): AuthSessionReadinessAllowedStateInput {
  if (
    allowedState === null ||
    typeof allowedState !== "object" ||
    Array.isArray(allowedState)
  ) {
    errors.push(
      error(
        "auth_session_readiness.allowed_state_required",
        "/allowed_state",
        "Allowed state must be present.",
      ),
    );
    return defaultAuthSessionReadinessAllowedState;
  }

  for (const flag of authSessionReadinessBlockedCapabilityFlags) {
    if ((allowedState as Record<string, unknown>)[flag] !== false) {
      errors.push(
        error(
          "auth_session_readiness.allowed_state_drift",
          `/allowed_state/${flag}`,
          "Blocked allowed-state flags must stay false.",
        ),
      );
    }
  }

  const requiredTrueFields = [
    "source_only_auth_readiness_allowed",
    "auth_mode_refs_allowed",
    "identity_refs_allowed",
    "session_boundary_refs_allowed",
    "authorization_level_refs_allowed",
    "tenant_project_scope_refs_allowed",
    "integration_auth_bridge_refs_allowed",
    "open_source_application",
    "self_deploying_management_system",
    "deployment_owner_controls_auth",
    "deployment_owner_controls_authorization_levels",
  ];

  for (const field of requiredTrueFields) {
    if ((allowedState as Record<string, unknown>)[field] !== true) {
      errors.push(
        error(
          "auth_session_readiness.allowed_state_drift",
          `/allowed_state/${field}`,
          "Required source-only allowed-state flag must be true.",
        ),
      );
    }
  }

  if (
    (allowedState as Record<string, unknown>).auth_provider_locked !== false ||
    (allowedState as Record<string, unknown>).secret_posture !==
      "references_only_no_values"
  ) {
    errors.push(
      error(
        "auth_session_readiness.allowed_state_drift",
        "/allowed_state",
        "Allowed state must keep provider unlocked and secrets reference-only.",
      ),
    );
  }

  return allowedState as AuthSessionReadinessAllowedStateInput;
}

function validateForbiddenScope(
  request: AuthSessionReadinessRequest,
  errors: AuthSessionReadinessError[],
): void {
  for (const flag of authSessionReadinessBlockedCapabilityFlags) {
    if ((request as Record<string, unknown>)[flag] === true) {
      errors.push(
        error(
          "auth_session_readiness.blocked_capability_forbidden",
          `/${flag}`,
          `${flag} must remain false.`,
        ),
      );
    }
  }

  const raw = JSON.stringify(request);
  if (unsafeValuePattern.test(raw)) {
    errors.push(
      error(
        "auth_session_readiness.secret_value_forbidden",
        "/",
        "Secret-like or connection-like values are forbidden.",
      ),
    );
  }

  const authRuntimeFlags = [
    "local_user_store_allowed",
    "password_hash_storage_allowed",
    "oauth_client_creation_allowed",
    "oauth_callback_route_allowed",
    "jwt_signing_allowed",
    "session_database_allowed",
    "token_storage_allowed",
    "credential_storage_allowed",
    "provider_account_creation_allowed",
    "auth_provider_wiring_allowed",
    "external_provider_call_allowed",
  ];
  const permissionFlags = [
    "permission_mutation_allowed",
    "integration_setup_write_allowed",
    "live_connector_activation_allowed",
  ];
  const databaseFlags = [
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
  ];
  const runtimeDeployFlags = [
    "runtime_dispatcher_allowed",
    "live_broker_dispatch_allowed",
    "live_adapter_invocation_allowed",
    "live_execution_allowed",
    "package_install_allowed",
    "deploy_allowed",
    "git_runner_allowed",
  ];
  const hostOsFlags = [
    "ssh_allowed",
    "docker_allowed",
    "node_agent_allowed",
    "dns_cloudflare_mutation_allowed",
    "python_runtime_required",
    "os_specific_binary_required",
  ];

  pushGroupErrorIfAnyTrue(
    request,
    authRuntimeFlags,
    "auth_session_readiness.auth_runtime_forbidden",
    "/auth_runtime",
    errors,
  );
  pushGroupErrorIfAnyTrue(
    request,
    permissionFlags,
    "auth_session_readiness.permission_mutation_forbidden",
    "/permission_or_integration",
    errors,
  );
  pushGroupErrorIfAnyTrue(
    request,
    databaseFlags,
    "auth_session_readiness.database_or_writer_forbidden",
    "/database_or_writer",
    errors,
  );
  pushGroupErrorIfAnyTrue(
    request,
    runtimeDeployFlags,
    "auth_session_readiness.runtime_or_deploy_forbidden",
    "/runtime_or_deploy",
    errors,
  );
  pushGroupErrorIfAnyTrue(
    request,
    hostOsFlags,
    "auth_session_readiness.host_or_os_forbidden",
    "/host_or_os",
    errors,
  );
  if ((request as Record<string, unknown>).external_service_call_allowed === true) {
    errors.push(
      error(
        "auth_session_readiness.external_service_forbidden",
        "/external_service_call_allowed",
        "External service calls are forbidden.",
      ),
    );
  }
}

function pushGroupErrorIfAnyTrue(
  request: AuthSessionReadinessRequest,
  flags: string[],
  code: AuthSessionReadinessErrorCode,
  path: string,
  errors: AuthSessionReadinessError[],
): void {
  if (flags.some((flag) => (request as Record<string, unknown>)[flag] === true)) {
    errors.push(
      error(code, path, "Blocked auth readiness scope cannot be opened here."),
    );
  }
}

function failAuthSessionReadiness(
  errors: AuthSessionReadinessError[],
): AuthSessionReadinessResult {
  return {
    ok: false,
    auth_session_readiness: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function error(
  code: AuthSessionReadinessErrorCode,
  path: string,
  message: string,
): AuthSessionReadinessError {
  return { code, path, message, severity: "error" };
}

function refRequiredCode(path: string): AuthSessionReadinessErrorCode {
  return `auth_session_readiness.${path.slice(0, -1)}_required` as AuthSessionReadinessErrorCode;
}

function refInvalidCode(path: string): AuthSessionReadinessErrorCode {
  return `auth_session_readiness.invalid_${path.slice(0, -1)}` as AuthSessionReadinessErrorCode;
}

function safeId(value: unknown): value is string {
  return typeof value === "string" && safeIdPattern.test(value);
}

function safeSourceRef(value: unknown): value is string {
  return typeof value === "string" && safeSourceRefPattern.test(value);
}

function safeText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length < 500 &&
    !unsafeValuePattern.test(value)
  );
}

function uniqueErrors(
  errors: AuthSessionReadinessError[],
): AuthSessionReadinessError[] {
  const seen = new Set<string>();
  return errors.filter((item) => {
    const key = `${item.code}:${item.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
