import {
  knowledgeEvalHarnessContract,
  type KnowledgeEvalHarnessEvidence,
} from "./knowledge-eval-harness.js";
import { localKnowledgeRecordContract } from "./knowledge-record.js";
import { localRepoKnowledgeIndexContract } from "./local-repo-knowledge-index.js";
import { knowledgeSearchContextContract } from "./knowledge-search-context.js";
import {
  knowledgePersistenceImplementationPacketContract,
  knowledgePersistenceImplementationTargetGate,
} from "./knowledge-persistence-implementation-packet.js";
import {
  persistencePolicyGateContract,
  persistencePolicyGateIds,
  type PersistencePolicyGateId,
} from "./persistence-policy-gate.js";
import {
  persistenceReadinessPreflightContract,
  persistenceReadinessPreflightTargetGate,
} from "./persistence-readiness-preflight-contract.js";
import {
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  type PersistenceSchemaEntityName,
} from "./persistence-schema-contract.js";

export const PERSISTED_KNOWLEDGE_READ_SURFACE_CONTRACT_STATUS = "source_only";

export const persistedKnowledgeReadSurfaceContractTargetGate =
  "G09_IMPLEMENTATION_PACKET" satisfies PersistencePolicyGateId;

export const persistedKnowledgeReadSurfaceQueryKinds = [
  "knowledge_source_query",
  "source_snapshot_query",
  "knowledge_record_query",
  "knowledge_chunk_query",
  "context_bundle_query",
  "eval_evidence_query",
  "citation_query",
  "tenant_project_scope_query",
] as const;

export const persistedKnowledgeReadSurfaceResultKinds = [
  "knowledge_source_result",
  "source_snapshot_result",
  "knowledge_record_result",
  "knowledge_chunk_result",
  "context_bundle_result",
  "eval_evidence_result",
  "citation_result",
  "scoped_empty_result",
] as const;

export const persistedKnowledgeReadSurfacePolicyPrerequisiteKinds = [
  "bp0214_implementation_packet_ref",
  "bp0212_persistence_readiness_ref",
  "bp0204_schema_contract_ref",
  "bp0189_persistence_schema_plan_ref",
] as const;

export const persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds = [
  "source_only_packet_review_ref",
  "no_db_scope_request_ref",
  "no_query_runner_request_ref",
  "no_live_scope_request_ref",
] as const;

export const persistedKnowledgeReadSurfaceAuditObligationKinds = [
  "read_surface_reviewed",
  "future_query_audit_required",
  "future_result_citation_required",
  "future_denied_query_audit_required",
] as const;

export const persistedKnowledgeReadSurfaceRollbackKinds = [
  "remove_source_contract_artifacts",
  "restore_bp0214_handoff",
  "disable_future_query_runner",
] as const;

export const persistedKnowledgeReadSurfaceValidationKinds = [
  "packet_contract_tests",
  "packet_typecheck",
  "web_management_packet_tests",
  "docs_check",
  "format_check",
  "full_workspace_check",
] as const;

export const persistedKnowledgeReadSurfaceBlockedCapabilityFlags = [
  "database_connection_allowed",
  "database_read_allowed",
  "database_write_allowed",
  "query_runner_allowed",
  "sql_artifact_allowed",
  "sql_query_execution_allowed",
  "sql_execution_allowed",
  "ddl_artifact_allowed",
  "ddl_execution_allowed",
  "orm_client_allowed",
  "role_grant_mutation_allowed",
  "grant_application_allowed",
  "migration_execution_allowed",
  "migration_runner_allowed",
  "writer_implementation_allowed",
  "persisted_storage_mutation_allowed",
  "knowledge_record_write_allowed",
  "source_snapshot_capture_allowed",
  "chunk_persistence_allowed",
  "context_bundle_persistence_allowed",
  "eval_run_persistence_allowed",
  "embedding_generation_allowed",
  "vector_db_runtime_allowed",
  "queue_mutation_allowed",
  "gateway_route_implementation_allowed",
  "mcp_tool_registration_allowed",
  "approval_request_creation_allowed",
  "approval_persistence_allowed",
  "approval_mutation_allowed",
  "audit_write_allowed",
  "audit_mutation_allowed",
  "auth_session_runtime_allowed",
  "auth_provider_wiring_allowed",
  "credential_storage_allowed",
  "integration_setup_write_allowed",
  "runtime_dispatcher_allowed",
  "runtime_adapter_implementation_allowed",
  "live_broker_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_execution_allowed",
  "deploy_allowed",
  "git_mutation_allowed",
  "ssh_allowed",
  "docker_runner_allowed",
  "node_agent_allowed",
  "dns_cloudflare_mutation_allowed",
  "python_runtime_required",
  "os_specific_binary_required",
  "os_connector_package_allowed",
  "external_service_call_allowed",
  "secret_values_allowed",
] as const;

export const persistedKnowledgeReadSurfaceContract = {
  contract_id: "lnsat.platform.persisted_knowledge_read_surface.v0_1",
  authority: ["@lnsat/packets", "source-backed-persisted-knowledge-read-surface"],
  read_surface_version: "0.1",
  target_gate: persistedKnowledgeReadSurfaceContractTargetGate,
  source_docs: [
    "fixtures/knowledge/product-direction.md",
    "docs/ROADMAP.md",
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "fixtures/knowledge/packets/BP-0182.md",
    "fixtures/knowledge/packets/BP-0183.md",
    "fixtures/knowledge/packets/BP-0184.md",
    "fixtures/knowledge/packets/BP-0188.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  policy_gate_contract_id: persistencePolicyGateContract.contract_id,
  persistence_readiness_contract_id: persistenceReadinessPreflightContract.contract_id,
  persistence_schema_contract_id: persistenceSchemaContract.contract_id,
  knowledge_persistence_implementation_contract_id:
    knowledgePersistenceImplementationPacketContract.contract_id,
  knowledge_record_contract_id: localKnowledgeRecordContract.contract_id,
  local_repo_index_contract_id: localRepoKnowledgeIndexContract.contract_id,
  knowledge_search_context_contract_id: knowledgeSearchContextContract.contract_id,
  knowledge_eval_harness_contract_id: knowledgeEvalHarnessContract.contract_id,
  contract_authority: "source_only_read_surface_contract_no_query_runner",
  source_only_read_surface_contract_allowed: true,
  database_connection_allowed: false,
  database_read_allowed: false,
  query_runner_allowed: false,
  sql_query_execution_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type PersistedKnowledgeReadSurfaceQueryKind =
  (typeof persistedKnowledgeReadSurfaceQueryKinds)[number];
export type PersistedKnowledgeReadSurfaceResultKind =
  (typeof persistedKnowledgeReadSurfaceResultKinds)[number];
export type PersistedKnowledgeReadSurfacePolicyPrerequisiteKind =
  (typeof persistedKnowledgeReadSurfacePolicyPrerequisiteKinds)[number];
export type PersistedKnowledgeReadSurfaceApprovalPrerequisiteKind =
  (typeof persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds)[number];
export type PersistedKnowledgeReadSurfaceAuditObligationKind =
  (typeof persistedKnowledgeReadSurfaceAuditObligationKinds)[number];
export type PersistedKnowledgeReadSurfaceRollbackKind =
  (typeof persistedKnowledgeReadSurfaceRollbackKinds)[number];
export type PersistedKnowledgeReadSurfaceValidationKind =
  (typeof persistedKnowledgeReadSurfaceValidationKinds)[number];
export type PersistedKnowledgeReadSurfaceBlockedCapabilityFlag =
  (typeof persistedKnowledgeReadSurfaceBlockedCapabilityFlags)[number];

export type PersistedKnowledgeReadSurfaceIdentityInput = {
  packet_ref: "BP-0215";
  selected_after_packet_ref: "BP-0214";
  read_surface_ref: "read_surface:persisted_knowledge_source_only";
  target_gate: typeof persistedKnowledgeReadSurfaceContractTargetGate;
  read_surface_mode: "source_contract_only";
  mvp_value: string;
};

export type PersistedKnowledgeReadQueryRefInput = {
  query_ref: string;
  query_kind: PersistedKnowledgeReadSurfaceQueryKind;
  entity_names: PersistenceSchemaEntityName[];
  input_shape_ref: string;
  tenant_project_scope_ref: string;
  current_state: "future_query_shape_source_ref_only";
  database_connection_allowed: false;
  database_read_allowed: false;
  query_runner_allowed: false;
  sql_query_execution_allowed: false;
  live_execution_allowed: false;
};

export type PersistedKnowledgeReadResultRefInput = {
  result_ref: string;
  result_kind: PersistedKnowledgeReadSurfaceResultKind;
  entity_names: PersistenceSchemaEntityName[];
  output_shape_ref: string;
  citation_refs_required: true;
  current_state: "future_result_shape_source_ref_only";
  persisted_storage_mutation_allowed: false;
  database_read_allowed: false;
  live_execution_allowed: false;
};

export type PersistedKnowledgeTenantProjectScopeRefInput = {
  scope_ref: string;
  scope_kind:
    "tenant_id_required" | "project_id_required" | "deny_cross_tenant_by_default";
  entity_names: PersistenceSchemaEntityName[];
  current_state: "future_scope_shape_source_ref_only";
  database_connection_allowed: false;
  authorization_mutation_allowed: false;
};

export type PersistedKnowledgeReadPolicyPrerequisiteRefInput = {
  prerequisite_ref: string;
  prerequisite_kind: PersistedKnowledgeReadSurfacePolicyPrerequisiteKind;
  gate_refs: PersistencePolicyGateId[];
  contract_ref: string;
  current_state: "source_ref_only_no_policy_mutation";
  approval_mutation_allowed: false;
  live_execution_allowed: false;
};

export type PersistedKnowledgeReadApprovalPrerequisiteRefInput = {
  approval_ref: string;
  approval_kind: PersistedKnowledgeReadSurfaceApprovalPrerequisiteKind;
  required_before_future_query_runner: true;
  current_state: "source_ref_only_no_approval_request_created";
  approval_request_creation_allowed: false;
  approval_mutation_allowed: false;
};

export type PersistedKnowledgeReadAuditObligationRefInput = {
  audit_ref: string;
  audit_kind: PersistedKnowledgeReadSurfaceAuditObligationKind;
  required_before_future_query_runner: true;
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  persisted_storage_mutation_allowed: false;
};

export type PersistedKnowledgeReadRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: PersistedKnowledgeReadSurfaceRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  live_execution_allowed: false;
};

export type PersistedKnowledgeReadValidationCommandRefInput = {
  validation_ref: string;
  validation_kind: PersistedKnowledgeReadSurfaceValidationKind;
  command_ref: string;
  current_state: "named_validation_only";
  live_execution_allowed: false;
};

export type PersistedKnowledgeReadSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type PersistedKnowledgeReadNoLivePostureInput = {
  database_connection_allowed: false;
  database_read_allowed: false;
  database_write_allowed: false;
  query_runner_allowed: false;
  sql_artifact_allowed: false;
  sql_query_execution_allowed: false;
  sql_execution_allowed: false;
  ddl_artifact_allowed: false;
  ddl_execution_allowed: false;
  orm_client_allowed: false;
  role_grant_mutation_allowed: false;
  grant_application_allowed: false;
  migration_execution_allowed: false;
  migration_runner_allowed: false;
  writer_implementation_allowed: false;
  persisted_storage_mutation_allowed: false;
  knowledge_record_write_allowed: false;
  source_snapshot_capture_allowed: false;
  chunk_persistence_allowed: false;
  context_bundle_persistence_allowed: false;
  eval_run_persistence_allowed: false;
  embedding_generation_allowed: false;
  vector_db_runtime_allowed: false;
  queue_mutation_allowed: false;
  gateway_route_implementation_allowed: false;
  mcp_tool_registration_allowed: false;
  approval_request_creation_allowed: false;
  approval_persistence_allowed: false;
  approval_mutation_allowed: false;
  audit_write_allowed: false;
  audit_mutation_allowed: false;
  auth_session_runtime_allowed: false;
  auth_provider_wiring_allowed: false;
  credential_storage_allowed: false;
  integration_setup_write_allowed: false;
  runtime_dispatcher_allowed: false;
  runtime_adapter_implementation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_execution_allowed: false;
  deploy_allowed: false;
  git_mutation_allowed: false;
  ssh_allowed: false;
  docker_runner_allowed: false;
  node_agent_allowed: false;
  dns_cloudflare_mutation_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  os_connector_package_allowed: false;
  external_service_call_allowed: false;
  secret_values_allowed: false;
};

export type PersistedKnowledgeReadAllowedStateInput =
  PersistedKnowledgeReadNoLivePostureInput & {
    source_only_read_surface_contract_allowed: true;
    future_query_shape_refs_allowed: true;
    future_result_shape_refs_allowed: true;
    tenant_project_scope_refs_allowed: true;
    source_refs_allowed: true;
    secret_posture: "references_only_no_values";
  };

export type PersistedKnowledgeReadSurfaceRequest = Partial<
  Record<PersistedKnowledgeReadSurfaceBlockedCapabilityFlag, false>
> & {
  read_surface_version?: typeof persistedKnowledgeReadSurfaceContract.read_surface_version;
  read_surface_identity?: PersistedKnowledgeReadSurfaceIdentityInput;
  gate_sequence?: PersistencePolicyGateId[];
  query_refs?: PersistedKnowledgeReadQueryRefInput[];
  result_refs?: PersistedKnowledgeReadResultRefInput[];
  tenant_project_scope_refs?: PersistedKnowledgeTenantProjectScopeRefInput[];
  policy_prerequisite_refs?: PersistedKnowledgeReadPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs?: PersistedKnowledgeReadApprovalPrerequisiteRefInput[];
  audit_obligation_refs?: PersistedKnowledgeReadAuditObligationRefInput[];
  rollback_refs?: PersistedKnowledgeReadRollbackRefInput[];
  validation_command_refs?: PersistedKnowledgeReadValidationCommandRefInput[];
  source_refs?: PersistedKnowledgeReadSourceRefInput[];
  no_live_posture?: PersistedKnowledgeReadNoLivePostureInput;
  allowed_state?: PersistedKnowledgeReadAllowedStateInput;
  contract_authority?: typeof persistedKnowledgeReadSurfaceContract.contract_authority;
  side_effects?: [];
};

export type PersistedKnowledgeReadSurfaceErrorCode =
  | "persisted_knowledge_read_surface.invalid_request"
  | "persisted_knowledge_read_surface.unexpected_field"
  | "persisted_knowledge_read_surface.invalid_version"
  | "persisted_knowledge_read_surface.invalid_identity"
  | "persisted_knowledge_read_surface.gate_sequence_required"
  | "persisted_knowledge_read_surface.gate_order_drift"
  | "persisted_knowledge_read_surface.query_ref_required"
  | "persisted_knowledge_read_surface.invalid_query_ref"
  | "persisted_knowledge_read_surface.result_ref_required"
  | "persisted_knowledge_read_surface.invalid_result_ref"
  | "persisted_knowledge_read_surface.tenant_project_scope_ref_required"
  | "persisted_knowledge_read_surface.invalid_tenant_project_scope_ref"
  | "persisted_knowledge_read_surface.policy_prerequisite_ref_required"
  | "persisted_knowledge_read_surface.invalid_policy_prerequisite_ref"
  | "persisted_knowledge_read_surface.approval_prerequisite_ref_required"
  | "persisted_knowledge_read_surface.invalid_approval_prerequisite_ref"
  | "persisted_knowledge_read_surface.audit_obligation_ref_required"
  | "persisted_knowledge_read_surface.invalid_audit_obligation_ref"
  | "persisted_knowledge_read_surface.rollback_ref_required"
  | "persisted_knowledge_read_surface.invalid_rollback_ref"
  | "persisted_knowledge_read_surface.validation_command_ref_required"
  | "persisted_knowledge_read_surface.invalid_validation_command_ref"
  | "persisted_knowledge_read_surface.source_ref_required"
  | "persisted_knowledge_read_surface.invalid_source_ref"
  | "persisted_knowledge_read_surface.no_live_posture_required"
  | "persisted_knowledge_read_surface.no_live_posture_drift"
  | "persisted_knowledge_read_surface.allowed_state_required"
  | "persisted_knowledge_read_surface.allowed_state_drift"
  | "persisted_knowledge_read_surface.unsafe_contract_authority"
  | "persisted_knowledge_read_surface.secret_value_forbidden"
  | "persisted_knowledge_read_surface.connection_or_sql_forbidden"
  | "persisted_knowledge_read_surface.query_runner_forbidden"
  | "persisted_knowledge_read_surface.role_grant_forbidden"
  | "persisted_knowledge_read_surface.migration_execution_forbidden"
  | "persisted_knowledge_read_surface.writer_implementation_forbidden"
  | "persisted_knowledge_read_surface.persistence_write_forbidden"
  | "persisted_knowledge_read_surface.queue_mutation_forbidden"
  | "persisted_knowledge_read_surface.gateway_or_mcp_runtime_forbidden"
  | "persisted_knowledge_read_surface.approval_mutation_forbidden"
  | "persisted_knowledge_read_surface.audit_write_forbidden"
  | "persisted_knowledge_read_surface.auth_or_integration_forbidden"
  | "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden"
  | "persisted_knowledge_read_surface.deploy_or_git_forbidden"
  | "persisted_knowledge_read_surface.host_or_os_connector_forbidden"
  | "persisted_knowledge_read_surface.external_service_forbidden"
  | "persisted_knowledge_read_surface.blocked_capability_forbidden"
  | "persisted_knowledge_read_surface.side_effects_forbidden";

export type PersistedKnowledgeReadSurfaceError = {
  code: PersistedKnowledgeReadSurfaceErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PersistedKnowledgeReadSurfaceEvidence = {
  contract_id: typeof persistedKnowledgeReadSurfaceContract.contract_id;
  read_surface_version: typeof persistedKnowledgeReadSurfaceContract.read_surface_version;
  read_surface_identity: PersistedKnowledgeReadSurfaceIdentityInput;
  target_gate: typeof persistedKnowledgeReadSurfaceContractTargetGate;
  prerequisite_gate: typeof persistenceReadinessPreflightTargetGate;
  implementation_packet_contract_id: typeof knowledgePersistenceImplementationPacketContract.contract_id;
  implementation_packet_target_gate: typeof knowledgePersistenceImplementationTargetGate;
  policy_gate_contract_id: typeof persistencePolicyGateContract.contract_id;
  persistence_readiness_contract_id: typeof persistenceReadinessPreflightContract.contract_id;
  persistence_schema_contract_id: typeof persistenceSchemaContract.contract_id;
  knowledge_record_contract_id: typeof localKnowledgeRecordContract.contract_id;
  local_repo_index_contract_id: typeof localRepoKnowledgeIndexContract.contract_id;
  knowledge_search_context_contract_id: typeof knowledgeSearchContextContract.contract_id;
  knowledge_eval_harness_contract_id: typeof knowledgeEvalHarnessContract.contract_id;
  gate_sequence: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  query_refs: PersistedKnowledgeReadQueryRefInput[];
  result_refs: PersistedKnowledgeReadResultRefInput[];
  tenant_project_scope_refs: PersistedKnowledgeTenantProjectScopeRefInput[];
  policy_prerequisite_refs: PersistedKnowledgeReadPolicyPrerequisiteRefInput[];
  approval_prerequisite_refs: PersistedKnowledgeReadApprovalPrerequisiteRefInput[];
  audit_obligation_refs: PersistedKnowledgeReadAuditObligationRefInput[];
  rollback_refs: PersistedKnowledgeReadRollbackRefInput[];
  validation_command_refs: PersistedKnowledgeReadValidationCommandRefInput[];
  source_refs: string[];
  no_live_posture: PersistedKnowledgeReadNoLivePostureInput;
  allowed_state: PersistedKnowledgeReadAllowedStateInput;
  blocked_capabilities: PersistedKnowledgeReadSurfaceBlockedCapabilityFlag[];
  future_result_evidence_refs: {
    eval_runs: Pick<
      KnowledgeEvalHarnessEvidence,
      "contract_id" | "side_effects" | "live_collection_allowed"
    > | null;
  };
  source_contract_artifacts: [
    "packages/packets/src/persisted-knowledge-read-surface-contract.ts",
    "packages/packets/test/persisted-knowledge-read-surface-contract.test.ts",
  ];
  query_runner_artifacts: [];
  sql_artifacts: [];
  ddl_artifacts: [];
  migration_artifacts: [];
  writer_artifacts: [];
  persisted_storage_artifacts: [];
  gateway_route_artifacts: [];
  mcp_tool_artifacts: [];
  runtime_artifacts: [];
  live_storage_artifacts: [];
  database_connection_allowed: false;
  database_read_allowed: false;
  query_runner_allowed: false;
  sql_query_execution_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type PersistedKnowledgeReadSurfaceResult =
  | {
      ok: true;
      persisted_knowledge_read_surface: PersistedKnowledgeReadSurfaceEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      persisted_knowledge_read_surface: null;
      errors: PersistedKnowledgeReadSurfaceError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedPersistedKnowledgeReadSurface =
  | {
      ok: true;
      read_surface_identity: PersistedKnowledgeReadSurfaceIdentityInput;
      gate_sequence: PersistencePolicyGateId[];
      query_refs: PersistedKnowledgeReadQueryRefInput[];
      result_refs: PersistedKnowledgeReadResultRefInput[];
      tenant_project_scope_refs: PersistedKnowledgeTenantProjectScopeRefInput[];
      policy_prerequisite_refs: PersistedKnowledgeReadPolicyPrerequisiteRefInput[];
      approval_prerequisite_refs: PersistedKnowledgeReadApprovalPrerequisiteRefInput[];
      audit_obligation_refs: PersistedKnowledgeReadAuditObligationRefInput[];
      rollback_refs: PersistedKnowledgeReadRollbackRefInput[];
      validation_command_refs: PersistedKnowledgeReadValidationCommandRefInput[];
      source_refs: string[];
      no_live_posture: PersistedKnowledgeReadNoLivePostureInput;
      allowed_state: PersistedKnowledgeReadAllowedStateInput;
    }
  | {
      ok: false;
      errors: PersistedKnowledgeReadSurfaceError[];
    };

const requestKeys = new Set([
  "read_surface_version",
  "read_surface_identity",
  "gate_sequence",
  "query_refs",
  "result_refs",
  "tenant_project_scope_refs",
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
  ...persistedKnowledgeReadSurfaceBlockedCapabilityFlags,
]);

const queryKindSet = new Set<string>(persistedKnowledgeReadSurfaceQueryKinds);
const resultKindSet = new Set<string>(persistedKnowledgeReadSurfaceResultKinds);
const policyPrerequisiteKindSet = new Set<string>(
  persistedKnowledgeReadSurfacePolicyPrerequisiteKinds,
);
const approvalPrerequisiteKindSet = new Set<string>(
  persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds,
);
const auditObligationKindSet = new Set<string>(
  persistedKnowledgeReadSurfaceAuditObligationKinds,
);
const rollbackKindSet = new Set<string>(persistedKnowledgeReadSurfaceRollbackKinds);
const validationKindSet = new Set<string>(persistedKnowledgeReadSurfaceValidationKinds);
const gateIdSet = new Set<string>(persistencePolicyGateIds);
const entityNameSet = new Set<string>(persistenceSchemaEntityNames);
const scopeKinds = new Set([
  "tenant_id_required",
  "project_id_required",
  "deny_cross_tenant_by_default",
]);

export const defaultPersistedKnowledgeReadNoLivePosture: PersistedKnowledgeReadNoLivePostureInput =
  {
    database_connection_allowed: false,
    database_read_allowed: false,
    database_write_allowed: false,
    query_runner_allowed: false,
    sql_artifact_allowed: false,
    sql_query_execution_allowed: false,
    sql_execution_allowed: false,
    ddl_artifact_allowed: false,
    ddl_execution_allowed: false,
    orm_client_allowed: false,
    role_grant_mutation_allowed: false,
    grant_application_allowed: false,
    migration_execution_allowed: false,
    migration_runner_allowed: false,
    writer_implementation_allowed: false,
    persisted_storage_mutation_allowed: false,
    knowledge_record_write_allowed: false,
    source_snapshot_capture_allowed: false,
    chunk_persistence_allowed: false,
    context_bundle_persistence_allowed: false,
    eval_run_persistence_allowed: false,
    embedding_generation_allowed: false,
    vector_db_runtime_allowed: false,
    queue_mutation_allowed: false,
    gateway_route_implementation_allowed: false,
    mcp_tool_registration_allowed: false,
    approval_request_creation_allowed: false,
    approval_persistence_allowed: false,
    approval_mutation_allowed: false,
    audit_write_allowed: false,
    audit_mutation_allowed: false,
    auth_session_runtime_allowed: false,
    auth_provider_wiring_allowed: false,
    credential_storage_allowed: false,
    integration_setup_write_allowed: false,
    runtime_dispatcher_allowed: false,
    runtime_adapter_implementation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_execution_allowed: false,
    deploy_allowed: false,
    git_mutation_allowed: false,
    ssh_allowed: false,
    docker_runner_allowed: false,
    node_agent_allowed: false,
    dns_cloudflare_mutation_allowed: false,
    python_runtime_required: false,
    os_specific_binary_required: false,
    os_connector_package_allowed: false,
    external_service_call_allowed: false,
    secret_values_allowed: false,
  };

export const defaultPersistedKnowledgeReadAllowedState: PersistedKnowledgeReadAllowedStateInput =
  {
    ...defaultPersistedKnowledgeReadNoLivePosture,
    source_only_read_surface_contract_allowed: true,
    future_query_shape_refs_allowed: true,
    future_result_shape_refs_allowed: true,
    tenant_project_scope_refs_allowed: true,
    source_refs_allowed: true,
    secret_posture: "references_only_no_values",
  };

export const defaultPersistedKnowledgeReadSurfaceIdentity: PersistedKnowledgeReadSurfaceIdentityInput =
  {
    packet_ref: "BP-0215",
    selected_after_packet_ref: "BP-0214",
    read_surface_ref: "read_surface:persisted_knowledge_source_only",
    target_gate: persistedKnowledgeReadSurfaceContractTargetGate,
    read_surface_mode: "source_contract_only",
    mvp_value:
      "Define future persisted knowledge read/query boundary before any DB or query runner exists.",
  };

export const defaultPersistedKnowledgeReadQueryRefs: PersistedKnowledgeReadQueryRefInput[] =
  [
    {
      query_ref: "query_shape:knowledge-source-read",
      query_kind: "knowledge_source_query",
      entity_names: ["knowledge_sources", "knowledge_source_refs"],
      input_shape_ref: "shape:knowledge-source-query-input",
    },
    {
      query_ref: "query_shape:source-snapshot-read",
      query_kind: "source_snapshot_query",
      entity_names: ["knowledge_source_snapshots"],
      input_shape_ref: "shape:source-snapshot-query-input",
    },
    {
      query_ref: "query_shape:knowledge-record-read",
      query_kind: "knowledge_record_query",
      entity_names: [
        "knowledge_records",
        "knowledge_record_source_refs",
        "knowledge_record_tags",
      ],
      input_shape_ref: "shape:knowledge-record-query-input",
    },
    {
      query_ref: "query_shape:knowledge-chunk-read",
      query_kind: "knowledge_chunk_query",
      entity_names: ["knowledge_chunks"],
      input_shape_ref: "shape:knowledge-chunk-query-input",
    },
    {
      query_ref: "query_shape:context-bundle-read",
      query_kind: "context_bundle_query",
      entity_names: ["knowledge_context_bundles", "knowledge_context_bundle_records"],
      input_shape_ref: "shape:context-bundle-query-input",
    },
    {
      query_ref: "query_shape:eval-evidence-read",
      query_kind: "eval_evidence_query",
      entity_names: ["knowledge_eval_runs", "knowledge_eval_question_results"],
      input_shape_ref: "shape:eval-evidence-query-input",
    },
    {
      query_ref: "query_shape:citation-read",
      query_kind: "citation_query",
      entity_names: ["knowledge_citation_refs"],
      input_shape_ref: "shape:citation-query-input",
    },
    {
      query_ref: "query_shape:tenant-project-scope-read",
      query_kind: "tenant_project_scope_query",
      entity_names: ["knowledge_records", "packet_runs"],
      input_shape_ref: "shape:tenant-project-scope-query-input",
    },
  ].map((ref) => ({
    ...ref,
    tenant_project_scope_ref: "scope:tenant-project-deny-cross-tenant",
    current_state: "future_query_shape_source_ref_only",
    database_connection_allowed: false,
    database_read_allowed: false,
    query_runner_allowed: false,
    sql_query_execution_allowed: false,
    live_execution_allowed: false,
  })) as PersistedKnowledgeReadQueryRefInput[];

export const defaultPersistedKnowledgeReadResultRefs: PersistedKnowledgeReadResultRefInput[] =
  persistedKnowledgeReadSurfaceResultKinds.map((resultKind) => {
    const entityNamesByKind: Record<
      PersistedKnowledgeReadSurfaceResultKind,
      PersistenceSchemaEntityName[]
    > = {
      knowledge_source_result: ["knowledge_sources", "knowledge_source_refs"],
      source_snapshot_result: ["knowledge_source_snapshots"],
      knowledge_record_result: [
        "knowledge_records",
        "knowledge_record_source_refs",
        "knowledge_record_tags",
      ],
      knowledge_chunk_result: ["knowledge_chunks"],
      context_bundle_result: [
        "knowledge_context_bundles",
        "knowledge_context_bundle_records",
      ],
      eval_evidence_result: ["knowledge_eval_runs", "knowledge_eval_question_results"],
      citation_result: ["knowledge_citation_refs"],
      scoped_empty_result: ["packet_runs"],
    };
    return {
      result_ref: `result_shape:${resultKind}`,
      result_kind: resultKind,
      entity_names: entityNamesByKind[resultKind],
      output_shape_ref: `shape:${resultKind}`,
      citation_refs_required: true,
      current_state: "future_result_shape_source_ref_only",
      persisted_storage_mutation_allowed: false,
      database_read_allowed: false,
      live_execution_allowed: false,
    };
  });

export const defaultPersistedKnowledgeTenantProjectScopeRefs: PersistedKnowledgeTenantProjectScopeRefInput[] =
  ["tenant_id_required", "project_id_required", "deny_cross_tenant_by_default"].map(
    (scopeKind) => ({
      scope_ref: `scope:${scopeKind}`,
      scope_kind:
        scopeKind as PersistedKnowledgeTenantProjectScopeRefInput["scope_kind"],
      entity_names: ["knowledge_records", "knowledge_chunks", "packet_runs"],
      current_state: "future_scope_shape_source_ref_only",
      database_connection_allowed: false,
      authorization_mutation_allowed: false,
    }),
  );

export const defaultPersistedKnowledgeReadPolicyPrerequisiteRefs: PersistedKnowledgeReadPolicyPrerequisiteRefInput[] =
  [
    {
      prerequisite_ref:
        "packages/packets/src/knowledge-persistence-implementation-packet.ts",
      prerequisite_kind: "bp0214_implementation_packet_ref",
      gate_refs: [knowledgePersistenceImplementationTargetGate],
      contract_ref: knowledgePersistenceImplementationPacketContract.contract_id,
    },
    {
      prerequisite_ref:
        "packages/packets/src/persistence-readiness-preflight-contract.ts",
      prerequisite_kind: "bp0212_persistence_readiness_ref",
      gate_refs: [persistenceReadinessPreflightTargetGate],
      contract_ref: persistenceReadinessPreflightContract.contract_id,
    },
    {
      prerequisite_ref: "packages/packets/src/persistence-schema-contract.ts",
      prerequisite_kind: "bp0204_schema_contract_ref",
      gate_refs: ["G02_SCHEMA_CONTRACT"],
      contract_ref: persistenceSchemaContract.contract_id,
    },
    {
      prerequisite_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
      prerequisite_kind: "bp0189_persistence_schema_plan_ref",
      gate_refs: ["G02_SCHEMA_CONTRACT", "G09_IMPLEMENTATION_PACKET"],
      contract_ref: "source_evidence:bp0189-persistence-schema-plan",
    },
  ].map((ref) => ({
    ...ref,
    current_state: "source_ref_only_no_policy_mutation",
    approval_mutation_allowed: false,
    live_execution_allowed: false,
  })) as PersistedKnowledgeReadPolicyPrerequisiteRefInput[];

export const defaultPersistedKnowledgeReadApprovalPrerequisiteRefs: PersistedKnowledgeReadApprovalPrerequisiteRefInput[] =
  persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds.map((approvalKind) => ({
    approval_ref: `approval_prerequisite:${approvalKind}`,
    approval_kind: approvalKind,
    required_before_future_query_runner: true,
    current_state: "source_ref_only_no_approval_request_created",
    approval_request_creation_allowed: false,
    approval_mutation_allowed: false,
  }));

export const defaultPersistedKnowledgeReadAuditObligationRefs: PersistedKnowledgeReadAuditObligationRefInput[] =
  persistedKnowledgeReadSurfaceAuditObligationKinds.map((auditKind) => ({
    audit_ref: `audit_obligation:${auditKind}`,
    audit_kind: auditKind,
    required_before_future_query_runner: true,
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    persisted_storage_mutation_allowed: false,
  }));

export const defaultPersistedKnowledgeReadRollbackRefs: PersistedKnowledgeReadRollbackRefInput[] =
  persistedKnowledgeReadSurfaceRollbackKinds.map((rollbackKind) => ({
    rollback_ref: `rollback:${rollbackKind}`,
    rollback_kind: rollbackKind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultPersistedKnowledgeReadValidationCommandRefs: PersistedKnowledgeReadValidationCommandRefInput[] =
  [
    {
      validation_ref: "validation:persisted-knowledge-read-surface-contract-test",
      validation_kind: "packet_contract_tests",
      command_ref:
        "script:npm-workspace-packets-test-persisted-knowledge-read-surface-contract",
    },
    {
      validation_ref: "validation:packets-typecheck",
      validation_kind: "packet_typecheck",
      command_ref: "script:npm-workspace-packets-typecheck",
    },
    {
      validation_ref: "validation:web-management-packet-tests",
      validation_kind: "web_management_packet_tests",
      command_ref: "script:npm-workspace-web-test-management-surfaces",
    },
    {
      validation_ref: "validation:docs-check",
      validation_kind: "docs_check",
      command_ref: "script:npm-run-docs-check",
    },
    {
      validation_ref: "validation:format-check",
      validation_kind: "format_check",
      command_ref: "script:npm-run-format-check",
    },
    {
      validation_ref: "validation:full-workspace-check",
      validation_kind: "full_workspace_check",
      command_ref: "script:npm-run-check",
    },
  ].map((ref) => ({
    ...ref,
    current_state: "named_validation_only",
    live_execution_allowed: false,
  })) as PersistedKnowledgeReadValidationCommandRefInput[];

const defaultSourceRefs: PersistedKnowledgeReadSourceRefInput[] =
  persistedKnowledgeReadSurfaceContract.source_docs.map((sourceRef) => ({
    source_ref: sourceRef,
    summary: "BP-0215 source-only persisted knowledge read surface evidence.",
  }));

export const defaultPersistedKnowledgeReadSurface: PersistedKnowledgeReadSurfaceEvidence =
  {
    contract_id: persistedKnowledgeReadSurfaceContract.contract_id,
    read_surface_version: persistedKnowledgeReadSurfaceContract.read_surface_version,
    read_surface_identity: defaultPersistedKnowledgeReadSurfaceIdentity,
    target_gate: persistedKnowledgeReadSurfaceContractTargetGate,
    prerequisite_gate: persistenceReadinessPreflightTargetGate,
    implementation_packet_contract_id:
      knowledgePersistenceImplementationPacketContract.contract_id,
    implementation_packet_target_gate: knowledgePersistenceImplementationTargetGate,
    policy_gate_contract_id: persistencePolicyGateContract.contract_id,
    persistence_readiness_contract_id:
      persistenceReadinessPreflightContract.contract_id,
    persistence_schema_contract_id: persistenceSchemaContract.contract_id,
    knowledge_record_contract_id: localKnowledgeRecordContract.contract_id,
    local_repo_index_contract_id: localRepoKnowledgeIndexContract.contract_id,
    knowledge_search_context_contract_id: knowledgeSearchContextContract.contract_id,
    knowledge_eval_harness_contract_id: knowledgeEvalHarnessContract.contract_id,
    gate_sequence: [...persistencePolicyGateIds],
    required_entity_names: [
      "knowledge_sources",
      "knowledge_source_refs",
      "knowledge_source_snapshots",
      "knowledge_records",
      "knowledge_record_source_refs",
      "knowledge_record_tags",
      "knowledge_chunks",
      "knowledge_context_bundles",
      "knowledge_context_bundle_records",
      "knowledge_citation_refs",
      "knowledge_eval_runs",
      "knowledge_eval_question_results",
      "packet_runs",
    ],
    query_refs: defaultPersistedKnowledgeReadQueryRefs,
    result_refs: defaultPersistedKnowledgeReadResultRefs,
    tenant_project_scope_refs: defaultPersistedKnowledgeTenantProjectScopeRefs,
    policy_prerequisite_refs: defaultPersistedKnowledgeReadPolicyPrerequisiteRefs,
    approval_prerequisite_refs: defaultPersistedKnowledgeReadApprovalPrerequisiteRefs,
    audit_obligation_refs: defaultPersistedKnowledgeReadAuditObligationRefs,
    rollback_refs: defaultPersistedKnowledgeReadRollbackRefs,
    validation_command_refs: defaultPersistedKnowledgeReadValidationCommandRefs,
    source_refs: defaultSourceRefs.map((ref) => ref.source_ref),
    no_live_posture: defaultPersistedKnowledgeReadNoLivePosture,
    allowed_state: defaultPersistedKnowledgeReadAllowedState,
    blocked_capabilities: [...persistedKnowledgeReadSurfaceBlockedCapabilityFlags],
    future_result_evidence_refs: {
      eval_runs: null,
    },
    source_contract_artifacts: [
      "packages/packets/src/persisted-knowledge-read-surface-contract.ts",
      "packages/packets/test/persisted-knowledge-read-surface-contract.test.ts",
    ],
    query_runner_artifacts: [],
    sql_artifacts: [],
    ddl_artifacts: [],
    migration_artifacts: [],
    writer_artifacts: [],
    persisted_storage_artifacts: [],
    gateway_route_artifacts: [],
    mcp_tool_artifacts: [],
    runtime_artifacts: [],
    live_storage_artifacts: [],
    database_connection_allowed: false,
    database_read_allowed: false,
    query_runner_allowed: false,
    sql_query_execution_allowed: false,
    live_execution_allowed: false,
    python_runtime_required: false,
    os_specific_binary_required: false,
    side_effects: [],
  };

export function createPersistedKnowledgeReadSurface(
  request: PersistedKnowledgeReadSurfaceRequest = {},
): PersistedKnowledgeReadSurfaceResult {
  const normalized = normalizePersistedKnowledgeReadSurface(request);

  if (!normalized.ok) {
    return {
      ok: false,
      persisted_knowledge_read_surface: null,
      errors: dedupeErrors(normalized.errors),
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    persisted_knowledge_read_surface: {
      ...defaultPersistedKnowledgeReadSurface,
      read_surface_identity: normalized.read_surface_identity,
      gate_sequence: normalized.gate_sequence,
      query_refs: normalized.query_refs,
      result_refs: normalized.result_refs,
      tenant_project_scope_refs: normalized.tenant_project_scope_refs,
      policy_prerequisite_refs: normalized.policy_prerequisite_refs,
      approval_prerequisite_refs: normalized.approval_prerequisite_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      validation_command_refs: normalized.validation_command_refs,
      source_refs: normalized.source_refs,
      no_live_posture: normalized.no_live_posture,
      allowed_state: normalized.allowed_state,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizePersistedKnowledgeReadSurface(
  request: PersistedKnowledgeReadSurfaceRequest,
): NormalizedPersistedKnowledgeReadSurface {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        readSurfaceError(
          "persisted_knowledge_read_surface.invalid_request",
          "",
          "Persisted knowledge read surface request must be an object.",
        ),
      ],
    };
  }

  const errors: PersistedKnowledgeReadSurfaceError[] = [];
  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        readSurfaceError(
          "persisted_knowledge_read_surface.unexpected_field",
          `/${key}`,
          "Unexpected persisted knowledge read surface field.",
        ),
      );
    }
  }

  if (
    request.read_surface_version !== undefined &&
    request.read_surface_version !==
      persistedKnowledgeReadSurfaceContract.read_surface_version
  ) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.invalid_version",
        "/read_surface_version",
        "Persisted knowledge read surface version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !==
      persistedKnowledgeReadSurfaceContract.contract_authority
  ) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.unsafe_contract_authority",
        "/contract_authority",
        "Persisted knowledge read surface must remain source-only.",
      ),
    );
  }

  if (containsUnsafeValue(request)) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.secret_value_forbidden",
        "",
        "Persisted knowledge read surface input must not include secrets, connection strings, or live endpoints.",
      ),
    );
  }

  for (const flag of persistedKnowledgeReadSurfaceBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, errors);

  const readSurfaceIdentity = normalizeIdentity(
    request.read_surface_identity ?? defaultPersistedKnowledgeReadSurfaceIdentity,
    errors,
  );
  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const queryRefs = normalizeQueryRefs(
    request.query_refs ?? defaultPersistedKnowledgeReadQueryRefs,
    errors,
  );
  const resultRefs = normalizeResultRefs(
    request.result_refs ?? defaultPersistedKnowledgeReadResultRefs,
    errors,
  );
  const tenantProjectScopeRefs = normalizeTenantProjectScopeRefs(
    request.tenant_project_scope_refs ??
      defaultPersistedKnowledgeTenantProjectScopeRefs,
    errors,
  );
  const policyPrerequisiteRefs = normalizePolicyPrerequisiteRefs(
    request.policy_prerequisite_refs ??
      defaultPersistedKnowledgeReadPolicyPrerequisiteRefs,
    errors,
  );
  const approvalPrerequisiteRefs = normalizeApprovalPrerequisiteRefs(
    request.approval_prerequisite_refs ??
      defaultPersistedKnowledgeReadApprovalPrerequisiteRefs,
    errors,
  );
  const auditObligationRefs = normalizeAuditObligationRefs(
    request.audit_obligation_refs ?? defaultPersistedKnowledgeReadAuditObligationRefs,
    errors,
  );
  const rollbackRefs = normalizeRollbackRefs(
    request.rollback_refs ?? defaultPersistedKnowledgeReadRollbackRefs,
    errors,
  );
  const validationCommandRefs = normalizeValidationCommandRefs(
    request.validation_command_refs ??
      defaultPersistedKnowledgeReadValidationCommandRefs,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const noLivePosture = normalizeNoLivePosture(
    request.no_live_posture ?? defaultPersistedKnowledgeReadNoLivePosture,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultPersistedKnowledgeReadAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    readSurfaceIdentity === null ||
    gateSequence === null ||
    queryRefs === null ||
    resultRefs === null ||
    tenantProjectScopeRefs === null ||
    policyPrerequisiteRefs === null ||
    approvalPrerequisiteRefs === null ||
    auditObligationRefs === null ||
    rollbackRefs === null ||
    validationCommandRefs === null ||
    sourceRefs === null ||
    noLivePosture === null ||
    allowedState === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    read_surface_identity: readSurfaceIdentity,
    gate_sequence: gateSequence,
    query_refs: queryRefs,
    result_refs: resultRefs,
    tenant_project_scope_refs: tenantProjectScopeRefs,
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

function normalizeIdentity(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadSurfaceIdentityInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.invalid_identity",
        "/read_surface_identity",
        "Persisted knowledge read surface identity is required.",
      ),
    );
    return null;
  }
  if (
    value.packet_ref !== "BP-0215" ||
    value.selected_after_packet_ref !== "BP-0214" ||
    value.read_surface_ref !== "read_surface:persisted_knowledge_source_only" ||
    value.target_gate !== persistedKnowledgeReadSurfaceContractTargetGate ||
    value.read_surface_mode !== "source_contract_only" ||
    typeof value.mvp_value !== "string" ||
    value.mvp_value.trim() === "" ||
    containsUnsafeString(value.mvp_value)
  ) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.invalid_identity",
        "/read_surface_identity",
        "Persisted knowledge read surface identity drifted.",
      ),
    );
    return null;
  }
  return defaultPersistedKnowledgeReadSurfaceIdentity;
}

function normalizeGateSequence(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("gate_sequence", "/gate_sequence"));
    return null;
  }
  const normalized: PersistencePolicyGateId[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const gateId = value[index];
    if (!isGateId(gateId)) {
      errors.push(gateOrderDrift(index));
      continue;
    }
    if (persistencePolicyGateIds[index] !== gateId || seen.has(gateId)) {
      errors.push(gateOrderDrift(index));
    }
    seen.add(gateId);
    normalized.push(gateId);
  }
  for (const requiredGateId of persistencePolicyGateIds) {
    if (!seen.has(requiredGateId)) {
      errors.push(requiredError("gate_sequence", "/gate_sequence"));
    }
  }
  return normalized;
}

function normalizeQueryRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadQueryRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("query_ref", "/query_refs"));
    return null;
  }
  const normalized: PersistedKnowledgeReadQueryRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isQueryKind(ref.query_kind)) {
      errors.push(invalidQueryRef(index, ""));
      continue;
    }
    seen.add(ref.query_kind);
    const queryRef = normalizeRef(
      ref.query_ref,
      `/query_refs/${index}/query_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_query_ref",
    );
    const inputShapeRef = normalizeRef(
      ref.input_shape_ref,
      `/query_refs/${index}/input_shape_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_query_ref",
    );
    const scopeRef = normalizeRef(
      ref.tenant_project_scope_ref,
      `/query_refs/${index}/tenant_project_scope_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_query_ref",
    );
    const entityNames = normalizeEntityNames(
      ref.entity_names,
      `/query_refs/${index}/entity_names`,
      errors,
      "persisted_knowledge_read_surface.invalid_query_ref",
    );
    if (ref.current_state !== "future_query_shape_source_ref_only") {
      errors.push(invalidQueryRef(index, "/current_state"));
    }
    requireFalse(
      ref.database_connection_allowed,
      `/query_refs/${index}/database_connection_allowed`,
      errors,
      "persisted_knowledge_read_surface.connection_or_sql_forbidden",
    );
    requireFalse(
      ref.database_read_allowed,
      `/query_refs/${index}/database_read_allowed`,
      errors,
      "persisted_knowledge_read_surface.connection_or_sql_forbidden",
    );
    requireFalse(
      ref.query_runner_allowed,
      `/query_refs/${index}/query_runner_allowed`,
      errors,
      "persisted_knowledge_read_surface.query_runner_forbidden",
    );
    requireFalse(
      ref.sql_query_execution_allowed,
      `/query_refs/${index}/sql_query_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.connection_or_sql_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/query_refs/${index}/live_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
    );
    if (
      queryRef !== null &&
      inputShapeRef !== null &&
      scopeRef !== null &&
      entityNames !== null
    ) {
      normalized.push({
        query_ref: queryRef,
        query_kind: ref.query_kind,
        entity_names: entityNames,
        input_shape_ref: inputShapeRef,
        tenant_project_scope_ref: scopeRef,
        current_state: "future_query_shape_source_ref_only",
        database_connection_allowed: false,
        database_read_allowed: false,
        query_runner_allowed: false,
        sql_query_execution_allowed: false,
        live_execution_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfaceQueryKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("query_ref", "/query_refs"));
    }
  }
  return normalized;
}

function normalizeResultRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadResultRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("result_ref", "/result_refs"));
    return null;
  }
  const normalized: PersistedKnowledgeReadResultRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isResultKind(ref.result_kind)) {
      errors.push(invalidResultRef(index, ""));
      continue;
    }
    seen.add(ref.result_kind);
    const resultRef = normalizeRef(
      ref.result_ref,
      `/result_refs/${index}/result_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_result_ref",
    );
    const outputShapeRef = normalizeRef(
      ref.output_shape_ref,
      `/result_refs/${index}/output_shape_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_result_ref",
    );
    const entityNames = normalizeEntityNames(
      ref.entity_names,
      `/result_refs/${index}/entity_names`,
      errors,
      "persisted_knowledge_read_surface.invalid_result_ref",
    );
    if (ref.citation_refs_required !== true) {
      errors.push(invalidResultRef(index, "/citation_refs_required"));
    }
    if (ref.current_state !== "future_result_shape_source_ref_only") {
      errors.push(invalidResultRef(index, "/current_state"));
    }
    requireFalse(
      ref.persisted_storage_mutation_allowed,
      `/result_refs/${index}/persisted_storage_mutation_allowed`,
      errors,
      "persisted_knowledge_read_surface.persistence_write_forbidden",
    );
    requireFalse(
      ref.database_read_allowed,
      `/result_refs/${index}/database_read_allowed`,
      errors,
      "persisted_knowledge_read_surface.connection_or_sql_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/result_refs/${index}/live_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
    );
    if (resultRef !== null && outputShapeRef !== null && entityNames !== null) {
      normalized.push({
        result_ref: resultRef,
        result_kind: ref.result_kind,
        entity_names: entityNames,
        output_shape_ref: outputShapeRef,
        citation_refs_required: true,
        current_state: "future_result_shape_source_ref_only",
        persisted_storage_mutation_allowed: false,
        database_read_allowed: false,
        live_execution_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfaceResultKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("result_ref", "/result_refs"));
    }
  }
  return normalized;
}

function normalizeTenantProjectScopeRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeTenantProjectScopeRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      requiredError("tenant_project_scope_ref", "/tenant_project_scope_refs"),
    );
    return null;
  }
  const normalized: PersistedKnowledgeTenantProjectScopeRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (
      !isPlainObject(ref) ||
      typeof ref.scope_kind !== "string" ||
      !scopeKinds.has(ref.scope_kind)
    ) {
      errors.push(invalidTenantProjectScopeRef(index, ""));
      continue;
    }
    seen.add(ref.scope_kind);
    const scopeRef = normalizeRef(
      ref.scope_ref,
      `/tenant_project_scope_refs/${index}/scope_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_tenant_project_scope_ref",
    );
    const entityNames = normalizeEntityNames(
      ref.entity_names,
      `/tenant_project_scope_refs/${index}/entity_names`,
      errors,
      "persisted_knowledge_read_surface.invalid_tenant_project_scope_ref",
    );
    if (ref.current_state !== "future_scope_shape_source_ref_only") {
      errors.push(invalidTenantProjectScopeRef(index, "/current_state"));
    }
    requireFalse(
      ref.database_connection_allowed,
      `/tenant_project_scope_refs/${index}/database_connection_allowed`,
      errors,
      "persisted_knowledge_read_surface.connection_or_sql_forbidden",
    );
    requireFalse(
      ref.authorization_mutation_allowed,
      `/tenant_project_scope_refs/${index}/authorization_mutation_allowed`,
      errors,
      "persisted_knowledge_read_surface.auth_or_integration_forbidden",
    );
    if (scopeRef !== null && entityNames !== null) {
      normalized.push({
        scope_ref: scopeRef,
        scope_kind:
          ref.scope_kind as PersistedKnowledgeTenantProjectScopeRefInput["scope_kind"],
        entity_names: entityNames,
        current_state: "future_scope_shape_source_ref_only",
        database_connection_allowed: false,
        authorization_mutation_allowed: false,
      });
    }
  }
  for (const requiredKind of scopeKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(
        requiredError("tenant_project_scope_ref", "/tenant_project_scope_refs"),
      );
    }
  }
  return normalized;
}

function normalizePolicyPrerequisiteRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadPolicyPrerequisiteRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("policy_prerequisite_ref", "/policy_prerequisite_refs"));
    return null;
  }
  const normalized: PersistedKnowledgeReadPolicyPrerequisiteRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isPolicyPrerequisiteKind(ref.prerequisite_kind)) {
      errors.push(invalidPolicyPrerequisiteRef(index, ""));
      continue;
    }
    seen.add(ref.prerequisite_kind);
    const prerequisiteRef = normalizeRepoRef(
      ref.prerequisite_ref,
      `/policy_prerequisite_refs/${index}/prerequisite_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_policy_prerequisite_ref",
    );
    const contractRef = normalizeContractOrSourceRef(
      ref.contract_ref,
      `/policy_prerequisite_refs/${index}/contract_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_policy_prerequisite_ref",
    );
    const gateRefs = normalizeGateRefs(
      ref.gate_refs,
      `/policy_prerequisite_refs/${index}/gate_refs`,
      errors,
    );
    if (ref.current_state !== "source_ref_only_no_policy_mutation") {
      errors.push(invalidPolicyPrerequisiteRef(index, "/current_state"));
    }
    requireFalse(
      ref.approval_mutation_allowed,
      `/policy_prerequisite_refs/${index}/approval_mutation_allowed`,
      errors,
      "persisted_knowledge_read_surface.approval_mutation_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/policy_prerequisite_refs/${index}/live_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
    );
    if (prerequisiteRef !== null && contractRef !== null && gateRefs !== null) {
      normalized.push({
        prerequisite_ref: prerequisiteRef,
        prerequisite_kind: ref.prerequisite_kind,
        gate_refs: gateRefs,
        contract_ref: contractRef,
        current_state: "source_ref_only_no_policy_mutation",
        approval_mutation_allowed: false,
        live_execution_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfacePolicyPrerequisiteKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(
        requiredError("policy_prerequisite_ref", "/policy_prerequisite_refs"),
      );
    }
  }
  return normalized;
}

function normalizeApprovalPrerequisiteRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadApprovalPrerequisiteRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      requiredError("approval_prerequisite_ref", "/approval_prerequisite_refs"),
    );
    return null;
  }
  const normalized: PersistedKnowledgeReadApprovalPrerequisiteRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isApprovalPrerequisiteKind(ref.approval_kind)) {
      errors.push(invalidApprovalPrerequisiteRef(index, ""));
      continue;
    }
    seen.add(ref.approval_kind);
    const approvalRef = normalizeRef(
      ref.approval_ref,
      `/approval_prerequisite_refs/${index}/approval_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_approval_prerequisite_ref",
    );
    if (ref.required_before_future_query_runner !== true) {
      errors.push(
        invalidApprovalPrerequisiteRef(index, "/required_before_future_query_runner"),
      );
    }
    if (ref.current_state !== "source_ref_only_no_approval_request_created") {
      errors.push(invalidApprovalPrerequisiteRef(index, "/current_state"));
    }
    requireFalse(
      ref.approval_request_creation_allowed,
      `/approval_prerequisite_refs/${index}/approval_request_creation_allowed`,
      errors,
      "persisted_knowledge_read_surface.approval_mutation_forbidden",
    );
    requireFalse(
      ref.approval_mutation_allowed,
      `/approval_prerequisite_refs/${index}/approval_mutation_allowed`,
      errors,
      "persisted_knowledge_read_surface.approval_mutation_forbidden",
    );
    if (approvalRef !== null) {
      normalized.push({
        approval_ref: approvalRef,
        approval_kind: ref.approval_kind,
        required_before_future_query_runner: true,
        current_state: "source_ref_only_no_approval_request_created",
        approval_request_creation_allowed: false,
        approval_mutation_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfaceApprovalPrerequisiteKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(
        requiredError("approval_prerequisite_ref", "/approval_prerequisite_refs"),
      );
    }
  }
  return normalized;
}

function normalizeAuditObligationRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadAuditObligationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    return null;
  }
  const normalized: PersistedKnowledgeReadAuditObligationRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isAuditObligationKind(ref.audit_kind)) {
      errors.push(invalidAuditObligationRef(index, ""));
      continue;
    }
    seen.add(ref.audit_kind);
    const auditRef = normalizeRef(
      ref.audit_ref,
      `/audit_obligation_refs/${index}/audit_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_audit_obligation_ref",
    );
    if (ref.required_before_future_query_runner !== true) {
      errors.push(
        invalidAuditObligationRef(index, "/required_before_future_query_runner"),
      );
    }
    if (ref.current_state !== "source_ref_only_no_audit_write") {
      errors.push(invalidAuditObligationRef(index, "/current_state"));
    }
    requireFalse(
      ref.audit_write_allowed,
      `/audit_obligation_refs/${index}/audit_write_allowed`,
      errors,
      "persisted_knowledge_read_surface.audit_write_forbidden",
    );
    requireFalse(
      ref.persisted_storage_mutation_allowed,
      `/audit_obligation_refs/${index}/persisted_storage_mutation_allowed`,
      errors,
      "persisted_knowledge_read_surface.persistence_write_forbidden",
    );
    if (auditRef !== null) {
      normalized.push({
        audit_ref: auditRef,
        audit_kind: ref.audit_kind,
        required_before_future_query_runner: true,
        current_state: "source_ref_only_no_audit_write",
        audit_write_allowed: false,
        persisted_storage_mutation_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfaceAuditObligationKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    }
  }
  return normalized;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadRollbackRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("rollback_ref", "/rollback_refs"));
    return null;
  }
  const normalized: PersistedKnowledgeReadRollbackRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isRollbackKind(ref.rollback_kind)) {
      errors.push(invalidRollbackRef(index, ""));
      continue;
    }
    seen.add(ref.rollback_kind);
    const rollbackRef = normalizeRef(
      ref.rollback_ref,
      `/rollback_refs/${index}/rollback_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_rollback_ref",
    );
    if (ref.current_state !== "source_ref_only_no_rollback_execution") {
      errors.push(invalidRollbackRef(index, "/current_state"));
    }
    requireFalse(
      ref.rollback_execution_allowed,
      `/rollback_refs/${index}/rollback_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/rollback_refs/${index}/live_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
    );
    if (rollbackRef !== null) {
      normalized.push({
        rollback_ref: rollbackRef,
        rollback_kind: ref.rollback_kind,
        current_state: "source_ref_only_no_rollback_execution",
        rollback_execution_allowed: false,
        live_execution_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfaceRollbackKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("rollback_ref", "/rollback_refs"));
    }
  }
  return normalized;
}

function normalizeValidationCommandRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadValidationCommandRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("validation_command_ref", "/validation_command_refs"));
    return null;
  }
  const normalized: PersistedKnowledgeReadValidationCommandRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isValidationKind(ref.validation_kind)) {
      errors.push(invalidValidationCommandRef(index, ""));
      continue;
    }
    seen.add(ref.validation_kind);
    const validationRef = normalizeRef(
      ref.validation_ref,
      `/validation_command_refs/${index}/validation_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_validation_command_ref",
    );
    const commandRef = normalizeNamedCommandRef(
      ref.command_ref,
      `/validation_command_refs/${index}/command_ref`,
      errors,
    );
    if (ref.current_state !== "named_validation_only") {
      errors.push(invalidValidationCommandRef(index, "/current_state"));
    }
    requireFalse(
      ref.live_execution_allowed,
      `/validation_command_refs/${index}/live_execution_allowed`,
      errors,
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
    );
    if (validationRef !== null && commandRef !== null) {
      normalized.push({
        validation_ref: validationRef,
        validation_kind: ref.validation_kind,
        command_ref: commandRef,
        current_state: "named_validation_only",
        live_execution_allowed: false,
      });
    }
  }
  for (const requiredKind of persistedKnowledgeReadSurfaceValidationKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("validation_command_ref", "/validation_command_refs"));
    }
  }
  return normalized;
}

function normalizeSourceRefs(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(requiredError("source_ref", "/source_refs"));
    return null;
  }
  const sourceRefs: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidSourceRef(index, ""));
      continue;
    }
    const sourceRef = normalizeRepoRef(
      rawRef.source_ref,
      `/source_refs/${index}/source_ref`,
      errors,
      "persisted_knowledge_read_surface.invalid_source_ref",
    );
    if (typeof rawRef.summary !== "string" || rawRef.summary.trim() === "") {
      errors.push(invalidSourceRef(index, "/summary"));
    }
    if (sourceRef !== null) {
      sourceRefs.push(sourceRef);
    }
  }
  for (const requiredRef of persistedKnowledgeReadSurfaceContract.source_docs) {
    if (!sourceRefs.includes(requiredRef)) {
      errors.push(requiredError("source_ref", "/source_refs"));
    }
  }
  return sourceRefs;
}

function normalizeNoLivePosture(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadNoLivePostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.no_live_posture_required",
        "/no_live_posture",
        "Persisted knowledge read surface no-live posture is required.",
      ),
    );
    return null;
  }
  for (const [key, expectedValue] of Object.entries(
    defaultPersistedKnowledgeReadNoLivePosture,
  )) {
    if (value[key] !== expectedValue) {
      errors.push(
        readSurfaceError(
          "persisted_knowledge_read_surface.no_live_posture_drift",
          `/no_live_posture/${key}`,
          "Persisted knowledge read surface no-live posture drifted.",
        ),
      );
    }
  }
  return defaultPersistedKnowledgeReadNoLivePosture;
}

function normalizeAllowedState(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.allowed_state_required",
        "/allowed_state",
        "Persisted knowledge read surface allowed state is required.",
      ),
    );
    return null;
  }
  for (const [key, expectedValue] of Object.entries(
    defaultPersistedKnowledgeReadAllowedState,
  )) {
    if (value[key] !== expectedValue) {
      errors.push(
        readSurfaceError(
          "persisted_knowledge_read_surface.allowed_state_drift",
          `/allowed_state/${key}`,
          "Persisted knowledge read surface allowed state drifted.",
        ),
      );
    }
  }
  return defaultPersistedKnowledgeReadAllowedState;
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
  code: PersistedKnowledgeReadSurfaceErrorCode,
): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(readSurfaceError(code, path, "Repo-local source ref is required."));
    return null;
  }
  const trimmed = value.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    /^[a-z]+:\/\//i.test(trimmed) ||
    containsUnsafeString(trimmed)
  ) {
    errors.push(
      readSurfaceError(
        code,
        path,
        "Source ref must stay repo-local and contain no secret or connection value.",
      ),
    );
    return null;
  }
  return trimmed;
}

function normalizeRef(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
  code: PersistedKnowledgeReadSurfaceErrorCode,
): string | null {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9_-]*:[A-Za-z0-9._:@#/-]{3,180}$/.test(value) ||
    containsUnsafeString(value)
  ) {
    errors.push(readSurfaceError(code, path, "Safe typed ref is required."));
    return null;
  }
  return value;
}

function normalizeContractOrSourceRef(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
  code: PersistedKnowledgeReadSurfaceErrorCode,
): string | null {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    containsUnsafeString(value) ||
    /^[a-z]+:\/\//i.test(value)
  ) {
    errors.push(readSurfaceError(code, path, "Safe contract/source ref is required."));
    return null;
  }
  return value.trim();
}

function normalizeNamedCommandRef(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
): string | null {
  if (
    typeof value !== "string" ||
    !/^script:[a-z0-9._:@#/-]{3,180}$/.test(value) ||
    containsUnsafeString(value) ||
    /\b(npm|pnpm|yarn|node|tsx|bash|sh|zsh|git|docker|ssh|curl|wrangler|psql|mysql|kubectl|rm|sudo)\s+/i.test(
      value,
    )
  ) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.invalid_validation_command_ref",
        path,
        "Validation command refs must be named script refs, not raw commands.",
      ),
    );
    return null;
  }
  return value;
}

function normalizeEntityNames(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
  code: PersistedKnowledgeReadSurfaceErrorCode,
): PersistenceSchemaEntityName[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(readSurfaceError(code, path, "Schema entity names are required."));
    return null;
  }
  const normalized: PersistenceSchemaEntityName[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !entityNameSet.has(item)) {
      errors.push(
        readSurfaceError(
          code,
          path,
          "Schema entity name must come from persistence schema contract.",
        ),
      );
      return null;
    }
    normalized.push(item as PersistenceSchemaEntityName);
  }
  return normalized;
}

function normalizeGateRefs(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.invalid_policy_prerequisite_ref",
        path,
        "Policy prerequisite requires gate refs.",
      ),
    );
    return null;
  }
  const normalized: PersistencePolicyGateId[] = [];
  for (const item of value) {
    if (!isGateId(item)) {
      errors.push(
        readSurfaceError(
          "persisted_knowledge_read_surface.invalid_policy_prerequisite_ref",
          path,
          "Policy prerequisite gate refs must be known persistence gates.",
        ),
      );
      return null;
    }
    normalized.push(item);
  }
  return normalized;
}

function validateSideEffects(
  value: unknown,
  errors: PersistedKnowledgeReadSurfaceError[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 0) {
    errors.push(
      readSurfaceError(
        "persisted_knowledge_read_surface.side_effects_forbidden",
        "/side_effects",
        "Persisted knowledge read surface must preserve side_effects: [].",
      ),
    );
  }
}

function requireFalse(
  value: unknown,
  path: string,
  errors: PersistedKnowledgeReadSurfaceError[],
  code: PersistedKnowledgeReadSurfaceErrorCode,
): void {
  if (value !== false) {
    errors.push(
      readSurfaceError(
        code,
        path,
        "Persisted knowledge read surface capability must remain false.",
      ),
    );
  }
}

function blockedCapabilityError(
  flag: PersistedKnowledgeReadSurfaceBlockedCapabilityFlag,
  path: string,
): PersistedKnowledgeReadSurfaceError {
  if (
    flag.includes("database") ||
    flag.includes("sql") ||
    flag.includes("ddl") ||
    flag.includes("orm")
  ) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.connection_or_sql_forbidden",
      path,
      "Database connection/read/write, SQL, DDL, and ORM clients remain blocked.",
    );
  }
  if (flag.includes("query_runner")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.query_runner_forbidden",
      path,
      "Query runner remains blocked.",
    );
  }
  if (flag.includes("role") || flag.includes("grant")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.role_grant_forbidden",
      path,
      "Role and grant mutation remains blocked.",
    );
  }
  if (flag.includes("migration")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.migration_execution_forbidden",
      path,
      "Migration execution remains blocked.",
    );
  }
  if (flag.includes("writer")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.writer_implementation_forbidden",
      path,
      "Writer implementation remains blocked.",
    );
  }
  if (
    flag.includes("persisted_storage") ||
    flag.includes("knowledge_record") ||
    flag.includes("snapshot") ||
    flag.includes("chunk") ||
    flag.includes("context_bundle") ||
    flag.includes("eval_run") ||
    flag.includes("embedding") ||
    flag.includes("vector")
  ) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.persistence_write_forbidden",
      path,
      "Persisted knowledge writes remain blocked.",
    );
  }
  if (flag.includes("queue")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.queue_mutation_forbidden",
      path,
      "Queue mutation remains blocked.",
    );
  }
  if (flag.includes("gateway") || flag.includes("mcp_tool")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.gateway_or_mcp_runtime_forbidden",
      path,
      "Gateway route implementation and MCP tool registration remain blocked.",
    );
  }
  if (flag.includes("approval")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.approval_mutation_forbidden",
      path,
      "Approval creation, persistence, and mutation remain blocked.",
    );
  }
  if (flag.includes("audit")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.audit_write_forbidden",
      path,
      "Audit writes remain blocked.",
    );
  }
  if (
    flag.includes("auth") ||
    flag.includes("credential") ||
    flag.includes("integration")
  ) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.auth_or_integration_forbidden",
      path,
      "Auth/session and integration setup writes remain blocked.",
    );
  }
  if (
    flag.includes("runtime") ||
    flag.includes("live") ||
    flag.includes("broker") ||
    flag.includes("adapter")
  ) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.runtime_or_live_execution_forbidden",
      path,
      "Runtime, broker, adapter, and live execution remain blocked.",
    );
  }
  if (flag.includes("deploy") || flag.includes("git")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.deploy_or_git_forbidden",
      path,
      "Deploy and Git mutation remain blocked.",
    );
  }
  if (
    flag.includes("ssh") ||
    flag.includes("docker") ||
    flag.includes("node_agent") ||
    flag.includes("dns") ||
    flag.includes("cloudflare") ||
    flag.includes("python") ||
    flag.includes("os_")
  ) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.host_or_os_connector_forbidden",
      path,
      "Host, OS connector, Python, and platform binary scope remain blocked.",
    );
  }
  if (flag.includes("external")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.external_service_forbidden",
      path,
      "External service calls remain blocked.",
    );
  }
  if (flag.includes("secret")) {
    return readSurfaceError(
      "persisted_knowledge_read_surface.secret_value_forbidden",
      path,
      "Secret values remain blocked.",
    );
  }
  return readSurfaceError(
    "persisted_knowledge_read_surface.blocked_capability_forbidden",
    path,
    "Blocked persisted knowledge read surface capability must remain false.",
  );
}

function requiredError(
  refKind: string,
  path: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    `persisted_knowledge_read_surface.${refKind}_required` as PersistedKnowledgeReadSurfaceErrorCode,
    path,
    "Persisted knowledge read surface evidence is required.",
  );
}

function invalidQueryRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_query_ref",
    `/query_refs/${index}${suffix}`,
    "Persisted knowledge query ref drifted.",
  );
}

function invalidResultRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_result_ref",
    `/result_refs/${index}${suffix}`,
    "Persisted knowledge result ref drifted.",
  );
}

function invalidTenantProjectScopeRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_tenant_project_scope_ref",
    `/tenant_project_scope_refs/${index}${suffix}`,
    "Persisted knowledge tenant/project scope ref drifted.",
  );
}

function invalidPolicyPrerequisiteRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_policy_prerequisite_ref",
    `/policy_prerequisite_refs/${index}${suffix}`,
    "Policy prerequisite ref drifted.",
  );
}

function invalidApprovalPrerequisiteRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_approval_prerequisite_ref",
    `/approval_prerequisite_refs/${index}${suffix}`,
    "Approval prerequisite ref drifted.",
  );
}

function invalidAuditObligationRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_audit_obligation_ref",
    `/audit_obligation_refs/${index}${suffix}`,
    "Audit obligation ref drifted.",
  );
}

function invalidRollbackRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_rollback_ref",
    `/rollback_refs/${index}${suffix}`,
    "Rollback ref drifted.",
  );
}

function invalidValidationCommandRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_validation_command_ref",
    `/validation_command_refs/${index}${suffix}`,
    "Validation command ref drifted.",
  );
}

function invalidSourceRef(
  index: number,
  suffix: string,
): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.invalid_source_ref",
    `/source_refs/${index}${suffix}`,
    "Source ref drifted.",
  );
}

function gateOrderDrift(index: number): PersistedKnowledgeReadSurfaceError {
  return readSurfaceError(
    "persisted_knowledge_read_surface.gate_order_drift",
    `/gate_sequence/${index}`,
    "Persisted knowledge read surface gate order must match BP-0203.",
  );
}

function readSurfaceError(
  code: PersistedKnowledgeReadSurfaceErrorCode,
  path: string,
  message: string,
): PersistedKnowledgeReadSurfaceError {
  return { code, path, message, severity: "error" };
}

function isQueryKind(value: unknown): value is PersistedKnowledgeReadSurfaceQueryKind {
  return typeof value === "string" && queryKindSet.has(value);
}

function isResultKind(
  value: unknown,
): value is PersistedKnowledgeReadSurfaceResultKind {
  return typeof value === "string" && resultKindSet.has(value);
}

function isPolicyPrerequisiteKind(
  value: unknown,
): value is PersistedKnowledgeReadSurfacePolicyPrerequisiteKind {
  return typeof value === "string" && policyPrerequisiteKindSet.has(value);
}

function isApprovalPrerequisiteKind(
  value: unknown,
): value is PersistedKnowledgeReadSurfaceApprovalPrerequisiteKind {
  return typeof value === "string" && approvalPrerequisiteKindSet.has(value);
}

function isAuditObligationKind(
  value: unknown,
): value is PersistedKnowledgeReadSurfaceAuditObligationKind {
  return typeof value === "string" && auditObligationKindSet.has(value);
}

function isRollbackKind(
  value: unknown,
): value is PersistedKnowledgeReadSurfaceRollbackKind {
  return typeof value === "string" && rollbackKindSet.has(value);
}

function isValidationKind(
  value: unknown,
): value is PersistedKnowledgeReadSurfaceValidationKind {
  return typeof value === "string" && validationKindSet.has(value);
}

function isGateId(value: unknown): value is PersistencePolicyGateId {
  return typeof value === "string" && gateIdSet.has(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function containsUnsafeValue(value: unknown): boolean {
  if (typeof value === "string") return containsUnsafeString(value);
  if (Array.isArray(value)) return value.some((item) => containsUnsafeValue(item));
  if (isPlainObject(value)) {
    return Object.values(value).some((item) => containsUnsafeValue(item));
  }
  return false;
}

function containsUnsafeString(value: string): boolean {
  return /(?:DATABASE_URL|postgres:\/\/|mysql:\/\/|mongodb:\/\/|PRIVATE KEY|BEGIN [A-Z ]*KEY|API_KEY|SECRET=|TOKEN=|PASSWORD|credential|provider_account|gh[pous]_[A-Za-z0-9]|sk-[A-Za-z0-9]|xox[baprs]-|cloudflare_api_token|https?:\/\/|ssh:\/\/|file:\/\/)/i.test(
    value,
  );
}

function dedupeErrors(
  errors: PersistedKnowledgeReadSurfaceError[],
): PersistedKnowledgeReadSurfaceError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
