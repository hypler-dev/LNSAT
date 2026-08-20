import {
  knowledgeEvalHarnessContract,
  type KnowledgeEvalHarnessEvidence,
} from "./knowledge-eval-harness.js";
import {
  localKnowledgeRecordContract,
  type KnowledgeContextBundleEvidence,
  type KnowledgeRecordEvidence,
} from "./knowledge-record.js";
import {
  localRepoKnowledgeIndexContract,
  type LocalRepoKnowledgeChunk,
} from "./local-repo-knowledge-index.js";
import { knowledgeSearchContextContract } from "./knowledge-search-context.js";
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

export const KNOWLEDGE_PERSISTENCE_IMPLEMENTATION_PACKET_STATUS = "source_only";

export const knowledgePersistenceImplementationTargetGate =
  "G09_IMPLEMENTATION_PACKET" satisfies PersistencePolicyGateId;

export const knowledgePersistenceImplementationArtifactKinds = [
  "knowledge_source_ref",
  "source_snapshot_ref",
  "knowledge_record_ref",
  "knowledge_chunk_ref",
  "context_bundle_ref",
  "eval_evidence_ref",
] as const;

export const knowledgePersistenceImplementationPolicyPrerequisiteKinds = [
  "bp0202_gate_order_review_ref",
  "bp0203_persistence_policy_gate_ref",
  "bp0204_schema_contract_ref",
  "bp0212_persistence_readiness_ref",
  "bp0213_selection_ref",
] as const;

export const knowledgePersistenceImplementationApprovalPrerequisiteKinds = [
  "source_only_packet_review_ref",
  "no_live_scope_request_ref",
  "no_write_scope_request_ref",
] as const;

export const knowledgePersistenceImplementationAuditObligationKinds = [
  "implementation_packet_reviewed",
  "future_persist_request_denied_until_approved",
  "future_knowledge_write_audit_required",
  "future_rollback_audit_required",
] as const;

export const knowledgePersistenceImplementationRollbackKinds = [
  "remove_source_contract_artifacts",
  "restore_bp0213_handoff",
  "disable_future_writer_path",
] as const;

export const knowledgePersistenceImplementationValidationKinds = [
  "packet_contract_tests",
  "packet_typecheck",
  "web_management_packet_tests",
  "docs_check",
  "format_check",
  "full_workspace_check",
] as const;

export const knowledgePersistenceImplementationBlockedCapabilityFlags = [
  "database_connection_allowed",
  "database_write_allowed",
  "sql_artifact_allowed",
  "sql_execution_allowed",
  "ddl_artifact_allowed",
  "ddl_execution_allowed",
  "role_grant_mutation_allowed",
  "grant_application_allowed",
  "migration_execution_allowed",
  "migration_runner_allowed",
  "writer_implementation_allowed",
  "persisted_storage_allowed",
  "knowledge_record_write_allowed",
  "source_snapshot_capture_allowed",
  "chunk_persistence_allowed",
  "context_bundle_persistence_allowed",
  "eval_run_persistence_allowed",
  "embedding_generation_allowed",
  "vector_db_runtime_allowed",
  "queue_mutation_allowed",
  "approval_request_creation_allowed",
  "approval_persistence_allowed",
  "approval_mutation_allowed",
  "approval_state_transition_allowed",
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

export const knowledgePersistenceImplementationPacketContract = {
  contract_id: "lnsat.platform.knowledge_persistence_implementation_packet.v0_1",
  authority: [
    "@lnsat/packets",
    "source-backed-knowledge-persistence-implementation-packet",
  ],
  implementation_packet_version: "0.1",
  target_gate: knowledgePersistenceImplementationTargetGate,
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
  knowledge_record_contract_id: localKnowledgeRecordContract.contract_id,
  local_repo_index_contract_id: localRepoKnowledgeIndexContract.contract_id,
  knowledge_search_context_contract_id: knowledgeSearchContextContract.contract_id,
  knowledge_eval_harness_contract_id: knowledgeEvalHarnessContract.contract_id,
  contract_authority:
    "source_only_implementation_packet_contract_no_persistence_execution",
  source_only_implementation_packet_contract_allowed: true,
  database_connection_allowed: false,
  database_write_allowed: false,
  writer_implementation_allowed: false,
  persisted_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type KnowledgePersistenceImplementationArtifactKind =
  (typeof knowledgePersistenceImplementationArtifactKinds)[number];
export type KnowledgePersistenceImplementationPolicyPrerequisiteKind =
  (typeof knowledgePersistenceImplementationPolicyPrerequisiteKinds)[number];
export type KnowledgePersistenceImplementationApprovalPrerequisiteKind =
  (typeof knowledgePersistenceImplementationApprovalPrerequisiteKinds)[number];
export type KnowledgePersistenceImplementationAuditObligationKind =
  (typeof knowledgePersistenceImplementationAuditObligationKinds)[number];
export type KnowledgePersistenceImplementationRollbackKind =
  (typeof knowledgePersistenceImplementationRollbackKinds)[number];
export type KnowledgePersistenceImplementationValidationKind =
  (typeof knowledgePersistenceImplementationValidationKinds)[number];
export type KnowledgePersistenceImplementationBlockedCapabilityFlag =
  (typeof knowledgePersistenceImplementationBlockedCapabilityFlags)[number];

export type KnowledgePersistenceImplementationIdentityInput = {
  packet_ref: "BP-0214";
  selected_by_packet_ref: "BP-0213";
  candidate_ref: "candidate:knowledge_persistence_records_snapshots";
  target_gate: typeof knowledgePersistenceImplementationTargetGate;
  implementation_mode: "source_contract_only";
  mvp_value: string;
};

export type KnowledgePersistenceFutureArtifactRefInput = {
  artifact_ref: string;
  artifact_kind: KnowledgePersistenceImplementationArtifactKind;
  entity_names: PersistenceSchemaEntityName[];
  source_contract_ref: string;
  future_write_boundary: string;
  current_state: "future_boundary_source_ref_only";
  persisted_storage_allowed: false;
  writer_implementation_allowed: false;
  database_write_allowed: false;
  live_execution_allowed: false;
};

export type KnowledgePersistencePolicyPrerequisiteRefInput = {
  prerequisite_ref: string;
  prerequisite_kind: KnowledgePersistenceImplementationPolicyPrerequisiteKind;
  gate_refs: PersistencePolicyGateId[];
  contract_ref: string;
  current_state: "source_ref_only_no_policy_mutation";
  approval_mutation_allowed: false;
  live_execution_allowed: false;
};

export type KnowledgePersistenceApprovalPrerequisiteRefInput = {
  approval_ref: string;
  approval_kind: KnowledgePersistenceImplementationApprovalPrerequisiteKind;
  required_before_future_write: true;
  current_state: "source_ref_only_no_approval_request_created";
  approval_request_creation_allowed: false;
  approval_mutation_allowed: false;
};

export type KnowledgePersistenceAuditObligationRefInput = {
  audit_ref: string;
  audit_kind: KnowledgePersistenceImplementationAuditObligationKind;
  required_before_future_write: true;
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  persisted_storage_allowed: false;
};

export type KnowledgePersistenceRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: KnowledgePersistenceImplementationRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  live_execution_allowed: false;
};

export type KnowledgePersistenceValidationCommandRefInput = {
  validation_ref: string;
  validation_kind: KnowledgePersistenceImplementationValidationKind;
  command_ref: string;
  current_state: "named_validation_only";
  live_execution_allowed: false;
};

export type KnowledgePersistenceSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type KnowledgePersistenceNoLivePostureInput = {
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_artifact_allowed: false;
  sql_execution_allowed: false;
  ddl_artifact_allowed: false;
  ddl_execution_allowed: false;
  role_grant_mutation_allowed: false;
  grant_application_allowed: false;
  migration_execution_allowed: false;
  migration_runner_allowed: false;
  writer_implementation_allowed: false;
  persisted_storage_allowed: false;
  knowledge_record_write_allowed: false;
  source_snapshot_capture_allowed: false;
  chunk_persistence_allowed: false;
  context_bundle_persistence_allowed: false;
  eval_run_persistence_allowed: false;
  embedding_generation_allowed: false;
  vector_db_runtime_allowed: false;
  queue_mutation_allowed: false;
  approval_request_creation_allowed: false;
  approval_persistence_allowed: false;
  approval_mutation_allowed: false;
  approval_state_transition_allowed: false;
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

export type KnowledgePersistenceAllowedStateInput =
  KnowledgePersistenceNoLivePostureInput & {
    source_only_implementation_packet_contract_allowed: true;
    implementation_packet_scope_refs_allowed: true;
    future_write_boundary_refs_allowed: true;
    source_refs_allowed: true;
    secret_posture: "references_only_no_values";
  };

export type KnowledgePersistenceImplementationPacketRequest = Partial<
  Record<KnowledgePersistenceImplementationBlockedCapabilityFlag, false>
> & {
  implementation_packet_version?: typeof knowledgePersistenceImplementationPacketContract.implementation_packet_version;
  implementation_identity?: KnowledgePersistenceImplementationIdentityInput;
  gate_sequence?: PersistencePolicyGateId[];
  future_artifact_refs?: KnowledgePersistenceFutureArtifactRefInput[];
  policy_prerequisite_refs?: KnowledgePersistencePolicyPrerequisiteRefInput[];
  approval_prerequisite_refs?: KnowledgePersistenceApprovalPrerequisiteRefInput[];
  audit_obligation_refs?: KnowledgePersistenceAuditObligationRefInput[];
  rollback_refs?: KnowledgePersistenceRollbackRefInput[];
  validation_command_refs?: KnowledgePersistenceValidationCommandRefInput[];
  source_refs?: KnowledgePersistenceSourceRefInput[];
  no_live_posture?: KnowledgePersistenceNoLivePostureInput;
  allowed_state?: KnowledgePersistenceAllowedStateInput;
  contract_authority?: typeof knowledgePersistenceImplementationPacketContract.contract_authority;
  side_effects?: [];
};

export type KnowledgePersistenceImplementationPacketErrorCode =
  | "knowledge_persistence_implementation_packet.invalid_request"
  | "knowledge_persistence_implementation_packet.unexpected_field"
  | "knowledge_persistence_implementation_packet.invalid_version"
  | "knowledge_persistence_implementation_packet.invalid_identity"
  | "knowledge_persistence_implementation_packet.gate_sequence_required"
  | "knowledge_persistence_implementation_packet.gate_order_drift"
  | "knowledge_persistence_implementation_packet.future_artifact_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_future_artifact_ref"
  | "knowledge_persistence_implementation_packet.policy_prerequisite_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref"
  | "knowledge_persistence_implementation_packet.approval_prerequisite_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_approval_prerequisite_ref"
  | "knowledge_persistence_implementation_packet.audit_obligation_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_audit_obligation_ref"
  | "knowledge_persistence_implementation_packet.rollback_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_rollback_ref"
  | "knowledge_persistence_implementation_packet.validation_command_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_validation_command_ref"
  | "knowledge_persistence_implementation_packet.source_ref_required"
  | "knowledge_persistence_implementation_packet.invalid_source_ref"
  | "knowledge_persistence_implementation_packet.no_live_posture_required"
  | "knowledge_persistence_implementation_packet.no_live_posture_drift"
  | "knowledge_persistence_implementation_packet.allowed_state_required"
  | "knowledge_persistence_implementation_packet.allowed_state_drift"
  | "knowledge_persistence_implementation_packet.unsafe_contract_authority"
  | "knowledge_persistence_implementation_packet.secret_value_forbidden"
  | "knowledge_persistence_implementation_packet.connection_or_sql_forbidden"
  | "knowledge_persistence_implementation_packet.role_grant_forbidden"
  | "knowledge_persistence_implementation_packet.migration_execution_forbidden"
  | "knowledge_persistence_implementation_packet.writer_implementation_forbidden"
  | "knowledge_persistence_implementation_packet.persistence_write_forbidden"
  | "knowledge_persistence_implementation_packet.queue_mutation_forbidden"
  | "knowledge_persistence_implementation_packet.approval_mutation_forbidden"
  | "knowledge_persistence_implementation_packet.audit_write_forbidden"
  | "knowledge_persistence_implementation_packet.auth_or_integration_forbidden"
  | "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden"
  | "knowledge_persistence_implementation_packet.deploy_or_git_forbidden"
  | "knowledge_persistence_implementation_packet.host_or_os_connector_forbidden"
  | "knowledge_persistence_implementation_packet.external_service_forbidden"
  | "knowledge_persistence_implementation_packet.blocked_capability_forbidden"
  | "knowledge_persistence_implementation_packet.side_effects_forbidden";

export type KnowledgePersistenceImplementationPacketError = {
  code: KnowledgePersistenceImplementationPacketErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type KnowledgePersistenceImplementationPacketEvidence = {
  contract_id: typeof knowledgePersistenceImplementationPacketContract.contract_id;
  implementation_packet_version: typeof knowledgePersistenceImplementationPacketContract.implementation_packet_version;
  implementation_identity: KnowledgePersistenceImplementationIdentityInput;
  target_gate: typeof knowledgePersistenceImplementationTargetGate;
  prerequisite_gate: typeof persistenceReadinessPreflightTargetGate;
  policy_gate_contract_id: typeof persistencePolicyGateContract.contract_id;
  persistence_readiness_contract_id: typeof persistenceReadinessPreflightContract.contract_id;
  persistence_schema_contract_id: typeof persistenceSchemaContract.contract_id;
  knowledge_record_contract_id: typeof localKnowledgeRecordContract.contract_id;
  local_repo_index_contract_id: typeof localRepoKnowledgeIndexContract.contract_id;
  knowledge_search_context_contract_id: typeof knowledgeSearchContextContract.contract_id;
  knowledge_eval_harness_contract_id: typeof knowledgeEvalHarnessContract.contract_id;
  gate_sequence: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  future_artifact_refs: KnowledgePersistenceFutureArtifactRefInput[];
  policy_prerequisite_refs: KnowledgePersistencePolicyPrerequisiteRefInput[];
  approval_prerequisite_refs: KnowledgePersistenceApprovalPrerequisiteRefInput[];
  audit_obligation_refs: KnowledgePersistenceAuditObligationRefInput[];
  rollback_refs: KnowledgePersistenceRollbackRefInput[];
  validation_command_refs: KnowledgePersistenceValidationCommandRefInput[];
  source_refs: string[];
  no_live_posture: KnowledgePersistenceNoLivePostureInput;
  allowed_state: KnowledgePersistenceAllowedStateInput;
  blocked_capabilities: KnowledgePersistenceImplementationBlockedCapabilityFlag[];
  future_runtime_evidence_refs: {
    knowledge_records: Pick<
      KnowledgeRecordEvidence,
      "contract_id" | "side_effects" | "live_collection_allowed"
    > | null;
    context_bundles: Pick<
      KnowledgeContextBundleEvidence,
      "contract_id" | "side_effects" | "live_collection_allowed"
    > | null;
    chunks: Pick<LocalRepoKnowledgeChunk, "chunk_id" | "record_id">[];
    eval_runs: Pick<
      KnowledgeEvalHarnessEvidence,
      "contract_id" | "side_effects" | "live_collection_allowed"
    > | null;
  };
  source_contract_artifacts: [
    "packages/packets/src/knowledge-persistence-implementation-packet.ts",
    "packages/packets/test/knowledge-persistence-implementation-packet.test.ts",
  ];
  sql_artifacts: [];
  ddl_artifacts: [];
  migration_artifacts: [];
  writer_artifacts: [];
  persisted_storage_artifacts: [];
  runtime_artifacts: [];
  live_storage_artifacts: [];
  database_connection_allowed: false;
  database_write_allowed: false;
  writer_implementation_allowed: false;
  persisted_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type KnowledgePersistenceImplementationPacketResult =
  | {
      ok: true;
      knowledge_persistence_implementation_packet: KnowledgePersistenceImplementationPacketEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      knowledge_persistence_implementation_packet: null;
      errors: KnowledgePersistenceImplementationPacketError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedKnowledgePersistenceImplementationPacket =
  | {
      ok: true;
      implementation_identity: KnowledgePersistenceImplementationIdentityInput;
      gate_sequence: PersistencePolicyGateId[];
      future_artifact_refs: KnowledgePersistenceFutureArtifactRefInput[];
      policy_prerequisite_refs: KnowledgePersistencePolicyPrerequisiteRefInput[];
      approval_prerequisite_refs: KnowledgePersistenceApprovalPrerequisiteRefInput[];
      audit_obligation_refs: KnowledgePersistenceAuditObligationRefInput[];
      rollback_refs: KnowledgePersistenceRollbackRefInput[];
      validation_command_refs: KnowledgePersistenceValidationCommandRefInput[];
      source_refs: string[];
      no_live_posture: KnowledgePersistenceNoLivePostureInput;
      allowed_state: KnowledgePersistenceAllowedStateInput;
    }
  | {
      ok: false;
      errors: KnowledgePersistenceImplementationPacketError[];
    };

const requestKeys = new Set([
  "implementation_packet_version",
  "implementation_identity",
  "gate_sequence",
  "future_artifact_refs",
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
  ...knowledgePersistenceImplementationBlockedCapabilityFlags,
]);

const artifactKindSet = new Set<string>(
  knowledgePersistenceImplementationArtifactKinds,
);
const policyPrerequisiteKindSet = new Set<string>(
  knowledgePersistenceImplementationPolicyPrerequisiteKinds,
);
const approvalPrerequisiteKindSet = new Set<string>(
  knowledgePersistenceImplementationApprovalPrerequisiteKinds,
);
const auditObligationKindSet = new Set<string>(
  knowledgePersistenceImplementationAuditObligationKinds,
);
const rollbackKindSet = new Set<string>(
  knowledgePersistenceImplementationRollbackKinds,
);
const validationKindSet = new Set<string>(
  knowledgePersistenceImplementationValidationKinds,
);
const gateIdSet = new Set<string>(persistencePolicyGateIds);
const entityNameSet = new Set<string>(persistenceSchemaEntityNames);

export const defaultKnowledgePersistenceNoLivePosture: KnowledgePersistenceNoLivePostureInput =
  {
    database_connection_allowed: false,
    database_write_allowed: false,
    sql_artifact_allowed: false,
    sql_execution_allowed: false,
    ddl_artifact_allowed: false,
    ddl_execution_allowed: false,
    role_grant_mutation_allowed: false,
    grant_application_allowed: false,
    migration_execution_allowed: false,
    migration_runner_allowed: false,
    writer_implementation_allowed: false,
    persisted_storage_allowed: false,
    knowledge_record_write_allowed: false,
    source_snapshot_capture_allowed: false,
    chunk_persistence_allowed: false,
    context_bundle_persistence_allowed: false,
    eval_run_persistence_allowed: false,
    embedding_generation_allowed: false,
    vector_db_runtime_allowed: false,
    queue_mutation_allowed: false,
    approval_request_creation_allowed: false,
    approval_persistence_allowed: false,
    approval_mutation_allowed: false,
    approval_state_transition_allowed: false,
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

export const defaultKnowledgePersistenceAllowedState: KnowledgePersistenceAllowedStateInput =
  {
    ...defaultKnowledgePersistenceNoLivePosture,
    source_only_implementation_packet_contract_allowed: true,
    implementation_packet_scope_refs_allowed: true,
    future_write_boundary_refs_allowed: true,
    source_refs_allowed: true,
    secret_posture: "references_only_no_values",
  };

export const defaultKnowledgePersistenceImplementationIdentity: KnowledgePersistenceImplementationIdentityInput =
  {
    packet_ref: "BP-0214",
    selected_by_packet_ref: "BP-0213",
    candidate_ref: "candidate:knowledge_persistence_records_snapshots",
    target_gate: knowledgePersistenceImplementationTargetGate,
    implementation_mode: "source_contract_only",
    mvp_value:
      "Durable source-grounded agent knowledge plus human management visibility.",
  };

export const defaultKnowledgePersistenceFutureArtifactRefs: KnowledgePersistenceFutureArtifactRefInput[] =
  [
    {
      artifact_ref: "future_artifact:knowledge-source-ref-boundary",
      artifact_kind: "knowledge_source_ref",
      entity_names: ["knowledge_sources", "knowledge_source_refs"],
      source_contract_ref: localKnowledgeRecordContract.contract_id,
      future_write_boundary: "future source registry refs only after later approval",
    },
    {
      artifact_ref: "future_artifact:knowledge-source-snapshot-boundary",
      artifact_kind: "source_snapshot_ref",
      entity_names: ["knowledge_source_snapshots"],
      source_contract_ref: localRepoKnowledgeIndexContract.contract_id,
      future_write_boundary: "future source snapshot capture only after writer packet",
    },
    {
      artifact_ref: "future_artifact:knowledge-record-boundary",
      artifact_kind: "knowledge_record_ref",
      entity_names: [
        "knowledge_records",
        "knowledge_record_source_refs",
        "knowledge_record_tags",
      ],
      source_contract_ref: localKnowledgeRecordContract.contract_id,
      future_write_boundary: "future knowledge record append only after writer packet",
    },
    {
      artifact_ref: "future_artifact:knowledge-chunk-boundary",
      artifact_kind: "knowledge_chunk_ref",
      entity_names: ["knowledge_chunks", "knowledge_citation_refs"],
      source_contract_ref: localRepoKnowledgeIndexContract.contract_id,
      future_write_boundary: "future chunk persistence only after writer packet",
    },
    {
      artifact_ref: "future_artifact:context-bundle-boundary",
      artifact_kind: "context_bundle_ref",
      entity_names: ["knowledge_context_bundles", "knowledge_context_bundle_records"],
      source_contract_ref: knowledgeSearchContextContract.contract_id,
      future_write_boundary:
        "future context bundle persistence only after writer packet",
    },
    {
      artifact_ref: "future_artifact:eval-evidence-boundary",
      artifact_kind: "eval_evidence_ref",
      entity_names: ["knowledge_eval_runs", "knowledge_eval_question_results"],
      source_contract_ref: knowledgeEvalHarnessContract.contract_id,
      future_write_boundary:
        "future eval evidence persistence only after writer packet",
    },
  ].map((ref) => ({
    ...ref,
    current_state: "future_boundary_source_ref_only",
    persisted_storage_allowed: false,
    writer_implementation_allowed: false,
    database_write_allowed: false,
    live_execution_allowed: false,
  })) as KnowledgePersistenceFutureArtifactRefInput[];

export const defaultKnowledgePersistencePolicyPrerequisiteRefs: KnowledgePersistencePolicyPrerequisiteRefInput[] =
  [
    {
      prerequisite_ref: "docs/reference/CONTRACT_PROVENANCE.md",
      prerequisite_kind: "bp0202_gate_order_review_ref",
      gate_refs: [...persistencePolicyGateIds],
      contract_ref: persistencePolicyGateContract.contract_id,
    },
    {
      prerequisite_ref: "packages/packets/src/persistence-policy-gate.ts",
      prerequisite_kind: "bp0203_persistence_policy_gate_ref",
      gate_refs: [...persistencePolicyGateIds],
      contract_ref: persistencePolicyGateContract.contract_id,
    },
    {
      prerequisite_ref: "packages/packets/src/persistence-schema-contract.ts",
      prerequisite_kind: "bp0204_schema_contract_ref",
      gate_refs: ["G02_SCHEMA_CONTRACT"],
      contract_ref: persistenceSchemaContract.contract_id,
    },
    {
      prerequisite_ref:
        "packages/packets/src/persistence-readiness-preflight-contract.ts",
      prerequisite_kind: "bp0212_persistence_readiness_ref",
      gate_refs: [persistenceReadinessPreflightTargetGate],
      contract_ref: persistenceReadinessPreflightContract.contract_id,
    },
    {
      prerequisite_ref: "docs/reference/CONTRACT_PROVENANCE.md",
      prerequisite_kind: "bp0213_selection_ref",
      gate_refs: [knowledgePersistenceImplementationTargetGate],
      contract_ref: "source_evidence:bp0213-implementation-packet-selection-review",
    },
  ].map((ref) => ({
    ...ref,
    current_state: "source_ref_only_no_policy_mutation",
    approval_mutation_allowed: false,
    live_execution_allowed: false,
  })) as KnowledgePersistencePolicyPrerequisiteRefInput[];

export const defaultKnowledgePersistenceApprovalPrerequisiteRefs: KnowledgePersistenceApprovalPrerequisiteRefInput[] =
  knowledgePersistenceImplementationApprovalPrerequisiteKinds.map((approvalKind) => ({
    approval_ref: `approval_prerequisite:${approvalKind}`,
    approval_kind: approvalKind,
    required_before_future_write: true,
    current_state: "source_ref_only_no_approval_request_created",
    approval_request_creation_allowed: false,
    approval_mutation_allowed: false,
  }));

export const defaultKnowledgePersistenceAuditObligationRefs: KnowledgePersistenceAuditObligationRefInput[] =
  knowledgePersistenceImplementationAuditObligationKinds.map((auditKind) => ({
    audit_ref: `audit_obligation:${auditKind}`,
    audit_kind: auditKind,
    required_before_future_write: true,
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    persisted_storage_allowed: false,
  }));

export const defaultKnowledgePersistenceRollbackRefs: KnowledgePersistenceRollbackRefInput[] =
  knowledgePersistenceImplementationRollbackKinds.map((rollbackKind) => ({
    rollback_ref: `rollback:${rollbackKind}`,
    rollback_kind: rollbackKind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultKnowledgePersistenceValidationCommandRefs: KnowledgePersistenceValidationCommandRefInput[] =
  [
    {
      validation_ref: "validation:knowledge-persistence-implementation-packet-test",
      validation_kind: "packet_contract_tests",
      command_ref:
        "script:npm-workspace-packets-test-knowledge-persistence-implementation-packet",
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
  })) as KnowledgePersistenceValidationCommandRefInput[];

const defaultSourceRefs: KnowledgePersistenceSourceRefInput[] =
  knowledgePersistenceImplementationPacketContract.source_docs.map((sourceRef) => ({
    source_ref: sourceRef,
    summary:
      "BP-0214 source-only knowledge persistence implementation packet evidence.",
  }));

export const defaultKnowledgePersistenceImplementationPacket: KnowledgePersistenceImplementationPacketEvidence =
  {
    contract_id: knowledgePersistenceImplementationPacketContract.contract_id,
    implementation_packet_version:
      knowledgePersistenceImplementationPacketContract.implementation_packet_version,
    implementation_identity: defaultKnowledgePersistenceImplementationIdentity,
    target_gate: knowledgePersistenceImplementationTargetGate,
    prerequisite_gate: persistenceReadinessPreflightTargetGate,
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
    ],
    future_artifact_refs: defaultKnowledgePersistenceFutureArtifactRefs,
    policy_prerequisite_refs: defaultKnowledgePersistencePolicyPrerequisiteRefs,
    approval_prerequisite_refs: defaultKnowledgePersistenceApprovalPrerequisiteRefs,
    audit_obligation_refs: defaultKnowledgePersistenceAuditObligationRefs,
    rollback_refs: defaultKnowledgePersistenceRollbackRefs,
    validation_command_refs: defaultKnowledgePersistenceValidationCommandRefs,
    source_refs: defaultSourceRefs.map((ref) => ref.source_ref),
    no_live_posture: defaultKnowledgePersistenceNoLivePosture,
    allowed_state: defaultKnowledgePersistenceAllowedState,
    blocked_capabilities: [...knowledgePersistenceImplementationBlockedCapabilityFlags],
    future_runtime_evidence_refs: {
      knowledge_records: null,
      context_bundles: null,
      chunks: [],
      eval_runs: null,
    },
    source_contract_artifacts: [
      "packages/packets/src/knowledge-persistence-implementation-packet.ts",
      "packages/packets/test/knowledge-persistence-implementation-packet.test.ts",
    ],
    sql_artifacts: [],
    ddl_artifacts: [],
    migration_artifacts: [],
    writer_artifacts: [],
    persisted_storage_artifacts: [],
    runtime_artifacts: [],
    live_storage_artifacts: [],
    database_connection_allowed: false,
    database_write_allowed: false,
    writer_implementation_allowed: false,
    persisted_storage_allowed: false,
    live_execution_allowed: false,
    python_runtime_required: false,
    os_specific_binary_required: false,
    side_effects: [],
  };

export function createKnowledgePersistenceImplementationPacket(
  request: KnowledgePersistenceImplementationPacketRequest = {},
): KnowledgePersistenceImplementationPacketResult {
  const normalized = normalizeKnowledgePersistenceImplementationPacket(request);

  if (!normalized.ok) {
    return {
      ok: false,
      knowledge_persistence_implementation_packet: null,
      errors: dedupeErrors(normalized.errors),
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    knowledge_persistence_implementation_packet: {
      ...defaultKnowledgePersistenceImplementationPacket,
      implementation_identity: normalized.implementation_identity,
      gate_sequence: normalized.gate_sequence,
      future_artifact_refs: normalized.future_artifact_refs,
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

function normalizeKnowledgePersistenceImplementationPacket(
  request: KnowledgePersistenceImplementationPacketRequest,
): NormalizedKnowledgePersistenceImplementationPacket {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        implementationError(
          "knowledge_persistence_implementation_packet.invalid_request",
          "",
          "Knowledge persistence implementation packet request must be an object.",
        ),
      ],
    };
  }

  const errors: KnowledgePersistenceImplementationPacketError[] = [];
  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        implementationError(
          "knowledge_persistence_implementation_packet.unexpected_field",
          `/${key}`,
          "Unexpected knowledge persistence implementation packet field.",
        ),
      );
    }
  }

  if (
    request.implementation_packet_version !== undefined &&
    request.implementation_packet_version !==
      knowledgePersistenceImplementationPacketContract.implementation_packet_version
  ) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.invalid_version",
        "/implementation_packet_version",
        "Knowledge persistence implementation packet version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !==
      knowledgePersistenceImplementationPacketContract.contract_authority
  ) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.unsafe_contract_authority",
        "/contract_authority",
        "Knowledge persistence implementation packet must remain source-only.",
      ),
    );
  }

  if (containsUnsafeValue(request)) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.secret_value_forbidden",
        "",
        "Knowledge persistence implementation packet input must not include secrets, connection strings, or live endpoints.",
      ),
    );
  }

  for (const flag of knowledgePersistenceImplementationBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, errors);

  const implementationIdentity = normalizeIdentity(
    request.implementation_identity ??
      defaultKnowledgePersistenceImplementationIdentity,
    errors,
  );
  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const futureArtifactRefs = normalizeFutureArtifactRefs(
    request.future_artifact_refs ?? defaultKnowledgePersistenceFutureArtifactRefs,
    errors,
  );
  const policyPrerequisiteRefs = normalizePolicyPrerequisiteRefs(
    request.policy_prerequisite_refs ??
      defaultKnowledgePersistencePolicyPrerequisiteRefs,
    errors,
  );
  const approvalPrerequisiteRefs = normalizeApprovalPrerequisiteRefs(
    request.approval_prerequisite_refs ??
      defaultKnowledgePersistenceApprovalPrerequisiteRefs,
    errors,
  );
  const auditObligationRefs = normalizeAuditObligationRefs(
    request.audit_obligation_refs ?? defaultKnowledgePersistenceAuditObligationRefs,
    errors,
  );
  const rollbackRefs = normalizeRollbackRefs(
    request.rollback_refs ?? defaultKnowledgePersistenceRollbackRefs,
    errors,
  );
  const validationCommandRefs = normalizeValidationCommandRefs(
    request.validation_command_refs ?? defaultKnowledgePersistenceValidationCommandRefs,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const noLivePosture = normalizeNoLivePosture(
    request.no_live_posture ?? defaultKnowledgePersistenceNoLivePosture,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultKnowledgePersistenceAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    implementationIdentity === null ||
    gateSequence === null ||
    futureArtifactRefs === null ||
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
    implementation_identity: implementationIdentity,
    gate_sequence: gateSequence,
    future_artifact_refs: futureArtifactRefs,
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
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceImplementationIdentityInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.invalid_identity",
        "/implementation_identity",
        "Knowledge persistence implementation packet identity is required.",
      ),
    );
    return null;
  }
  if (
    value.packet_ref !== "BP-0214" ||
    value.selected_by_packet_ref !== "BP-0213" ||
    value.candidate_ref !== "candidate:knowledge_persistence_records_snapshots" ||
    value.target_gate !== knowledgePersistenceImplementationTargetGate ||
    value.implementation_mode !== "source_contract_only" ||
    typeof value.mvp_value !== "string" ||
    value.mvp_value.trim() === "" ||
    containsUnsafeString(value.mvp_value)
  ) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.invalid_identity",
        "/implementation_identity",
        "Knowledge persistence implementation packet identity drifted.",
      ),
    );
    return null;
  }
  return defaultKnowledgePersistenceImplementationIdentity;
}

function normalizeGateSequence(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.gate_sequence_required",
        "/gate_sequence",
        "Knowledge persistence implementation packet requires the full gate order.",
      ),
    );
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
      errors.push(
        implementationError(
          "knowledge_persistence_implementation_packet.gate_sequence_required",
          "/gate_sequence",
          "Knowledge persistence implementation packet is missing a gate id.",
        ),
      );
    }
  }
  return normalized;
}

function normalizeFutureArtifactRefs(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceFutureArtifactRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("future_artifact_ref", "/future_artifact_refs"));
    return null;
  }
  const normalized: KnowledgePersistenceFutureArtifactRefInput[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const ref = value[index];
    if (!isPlainObject(ref) || !isArtifactKind(ref.artifact_kind)) {
      errors.push(invalidFutureArtifactRef(index, ""));
      continue;
    }
    seen.add(ref.artifact_kind);
    const artifactRef = normalizeRef(
      ref.artifact_ref,
      `/future_artifact_refs/${index}/artifact_ref`,
      errors,
      "knowledge_persistence_implementation_packet.invalid_future_artifact_ref",
    );
    const sourceContractRef = normalizeContractOrSourceRef(
      ref.source_contract_ref,
      `/future_artifact_refs/${index}/source_contract_ref`,
      errors,
      "knowledge_persistence_implementation_packet.invalid_future_artifact_ref",
    );
    const entityNames = normalizeEntityNames(
      ref.entity_names,
      `/future_artifact_refs/${index}/entity_names`,
      errors,
    );
    const futureWriteBoundary =
      typeof ref.future_write_boundary === "string"
        ? ref.future_write_boundary.trim()
        : null;
    if (
      futureWriteBoundary === null ||
      futureWriteBoundary === "" ||
      containsUnsafeString(futureWriteBoundary)
    ) {
      errors.push(invalidFutureArtifactRef(index, "/future_write_boundary"));
    }
    if (ref.current_state !== "future_boundary_source_ref_only") {
      errors.push(invalidFutureArtifactRef(index, "/current_state"));
    }
    requireFalse(
      ref.persisted_storage_allowed,
      `/future_artifact_refs/${index}/persisted_storage_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.persistence_write_forbidden",
    );
    requireFalse(
      ref.writer_implementation_allowed,
      `/future_artifact_refs/${index}/writer_implementation_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.writer_implementation_forbidden",
    );
    requireFalse(
      ref.database_write_allowed,
      `/future_artifact_refs/${index}/database_write_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.connection_or_sql_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/future_artifact_refs/${index}/live_execution_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
    );
    if (
      artifactRef !== null &&
      sourceContractRef !== null &&
      entityNames !== null &&
      futureWriteBoundary !== null
    ) {
      normalized.push({
        artifact_ref: artifactRef,
        artifact_kind: ref.artifact_kind,
        entity_names: entityNames,
        source_contract_ref: sourceContractRef,
        future_write_boundary: futureWriteBoundary,
        current_state: "future_boundary_source_ref_only",
        persisted_storage_allowed: false,
        writer_implementation_allowed: false,
        database_write_allowed: false,
        live_execution_allowed: false,
      });
    }
  }
  for (const requiredKind of knowledgePersistenceImplementationArtifactKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("future_artifact_ref", "/future_artifact_refs"));
    }
  }
  return normalized;
}

function normalizePolicyPrerequisiteRefs(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistencePolicyPrerequisiteRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("policy_prerequisite_ref", "/policy_prerequisite_refs"));
    return null;
  }
  const normalized: KnowledgePersistencePolicyPrerequisiteRefInput[] = [];
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
      "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref",
    );
    const contractRef = normalizeContractOrSourceRef(
      ref.contract_ref,
      `/policy_prerequisite_refs/${index}/contract_ref`,
      errors,
      "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref",
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
      "knowledge_persistence_implementation_packet.approval_mutation_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/policy_prerequisite_refs/${index}/live_execution_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
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
  for (const requiredKind of knowledgePersistenceImplementationPolicyPrerequisiteKinds) {
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
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceApprovalPrerequisiteRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      requiredError("approval_prerequisite_ref", "/approval_prerequisite_refs"),
    );
    return null;
  }
  const normalized: KnowledgePersistenceApprovalPrerequisiteRefInput[] = [];
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
      "knowledge_persistence_implementation_packet.invalid_approval_prerequisite_ref",
    );
    if (ref.required_before_future_write !== true) {
      errors.push(
        invalidApprovalPrerequisiteRef(index, "/required_before_future_write"),
      );
    }
    if (ref.current_state !== "source_ref_only_no_approval_request_created") {
      errors.push(invalidApprovalPrerequisiteRef(index, "/current_state"));
    }
    requireFalse(
      ref.approval_request_creation_allowed,
      `/approval_prerequisite_refs/${index}/approval_request_creation_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.approval_mutation_forbidden",
    );
    requireFalse(
      ref.approval_mutation_allowed,
      `/approval_prerequisite_refs/${index}/approval_mutation_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.approval_mutation_forbidden",
    );
    if (approvalRef !== null) {
      normalized.push({
        approval_ref: approvalRef,
        approval_kind: ref.approval_kind,
        required_before_future_write: true,
        current_state: "source_ref_only_no_approval_request_created",
        approval_request_creation_allowed: false,
        approval_mutation_allowed: false,
      });
    }
  }
  for (const requiredKind of knowledgePersistenceImplementationApprovalPrerequisiteKinds) {
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
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceAuditObligationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    return null;
  }
  const normalized: KnowledgePersistenceAuditObligationRefInput[] = [];
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
      "knowledge_persistence_implementation_packet.invalid_audit_obligation_ref",
    );
    if (ref.required_before_future_write !== true) {
      errors.push(invalidAuditObligationRef(index, "/required_before_future_write"));
    }
    if (ref.current_state !== "source_ref_only_no_audit_write") {
      errors.push(invalidAuditObligationRef(index, "/current_state"));
    }
    requireFalse(
      ref.audit_write_allowed,
      `/audit_obligation_refs/${index}/audit_write_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.audit_write_forbidden",
    );
    requireFalse(
      ref.persisted_storage_allowed,
      `/audit_obligation_refs/${index}/persisted_storage_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.persistence_write_forbidden",
    );
    if (auditRef !== null) {
      normalized.push({
        audit_ref: auditRef,
        audit_kind: ref.audit_kind,
        required_before_future_write: true,
        current_state: "source_ref_only_no_audit_write",
        audit_write_allowed: false,
        persisted_storage_allowed: false,
      });
    }
  }
  for (const requiredKind of knowledgePersistenceImplementationAuditObligationKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    }
  }
  return normalized;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceRollbackRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("rollback_ref", "/rollback_refs"));
    return null;
  }
  const normalized: KnowledgePersistenceRollbackRefInput[] = [];
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
      "knowledge_persistence_implementation_packet.invalid_rollback_ref",
    );
    if (ref.current_state !== "source_ref_only_no_rollback_execution") {
      errors.push(invalidRollbackRef(index, "/current_state"));
    }
    requireFalse(
      ref.rollback_execution_allowed,
      `/rollback_refs/${index}/rollback_execution_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
    );
    requireFalse(
      ref.live_execution_allowed,
      `/rollback_refs/${index}/live_execution_allowed`,
      errors,
      "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
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
  for (const requiredKind of knowledgePersistenceImplementationRollbackKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("rollback_ref", "/rollback_refs"));
    }
  }
  return normalized;
}

function normalizeValidationCommandRefs(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceValidationCommandRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("validation_command_ref", "/validation_command_refs"));
    return null;
  }
  const normalized: KnowledgePersistenceValidationCommandRefInput[] = [];
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
      "knowledge_persistence_implementation_packet.invalid_validation_command_ref",
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
      "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
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
  for (const requiredKind of knowledgePersistenceImplementationValidationKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("validation_command_ref", "/validation_command_refs"));
    }
  }
  return normalized;
}

function normalizeSourceRefs(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
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
      "knowledge_persistence_implementation_packet.invalid_source_ref",
    );
    if (typeof rawRef.summary !== "string" || rawRef.summary.trim() === "") {
      errors.push(invalidSourceRef(index, "/summary"));
    }
    if (sourceRef !== null) {
      sourceRefs.push(sourceRef);
    }
  }
  for (const requiredRef of knowledgePersistenceImplementationPacketContract.source_docs) {
    if (!sourceRefs.includes(requiredRef)) {
      errors.push(requiredError("source_ref", "/source_refs"));
    }
  }
  return sourceRefs;
}

function normalizeNoLivePosture(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceNoLivePostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.no_live_posture_required",
        "/no_live_posture",
        "Knowledge persistence implementation packet no-live posture is required.",
      ),
    );
    return null;
  }
  for (const [key, expectedValue] of Object.entries(
    defaultKnowledgePersistenceNoLivePosture,
  )) {
    if (value[key] !== expectedValue) {
      errors.push(
        implementationError(
          "knowledge_persistence_implementation_packet.no_live_posture_drift",
          `/no_live_posture/${key}`,
          "Knowledge persistence implementation packet no-live posture drifted.",
        ),
      );
    }
  }
  return defaultKnowledgePersistenceNoLivePosture;
}

function normalizeAllowedState(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.allowed_state_required",
        "/allowed_state",
        "Knowledge persistence implementation packet allowed state is required.",
      ),
    );
    return null;
  }
  for (const [key, expectedValue] of Object.entries(
    defaultKnowledgePersistenceAllowedState,
  )) {
    if (value[key] !== expectedValue) {
      errors.push(
        implementationError(
          "knowledge_persistence_implementation_packet.allowed_state_drift",
          `/allowed_state/${key}`,
          "Knowledge persistence implementation packet allowed state drifted.",
        ),
      );
    }
  }
  return defaultKnowledgePersistenceAllowedState;
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  errors: KnowledgePersistenceImplementationPacketError[],
  code: KnowledgePersistenceImplementationPacketErrorCode,
): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(implementationError(code, path, "Repo-local source ref is required."));
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
      implementationError(
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
  errors: KnowledgePersistenceImplementationPacketError[],
  code: KnowledgePersistenceImplementationPacketErrorCode,
): string | null {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9_-]*:[A-Za-z0-9._:@#/-]{3,180}$/.test(value) ||
    containsUnsafeString(value)
  ) {
    errors.push(implementationError(code, path, "Safe typed ref is required."));
    return null;
  }
  return value;
}

function normalizeContractOrSourceRef(
  value: unknown,
  path: string,
  errors: KnowledgePersistenceImplementationPacketError[],
  code: KnowledgePersistenceImplementationPacketErrorCode,
): string | null {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    containsUnsafeString(value) ||
    /^[a-z]+:\/\//i.test(value)
  ) {
    errors.push(
      implementationError(code, path, "Safe contract/source ref is required."),
    );
    return null;
  }
  return value.trim();
}

function normalizeNamedCommandRef(
  value: unknown,
  path: string,
  errors: KnowledgePersistenceImplementationPacketError[],
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
      implementationError(
        "knowledge_persistence_implementation_packet.invalid_validation_command_ref",
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
  errors: KnowledgePersistenceImplementationPacketError[],
): PersistenceSchemaEntityName[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.invalid_future_artifact_ref",
        path,
        "Knowledge future artifact ref requires schema entity names.",
      ),
    );
    return null;
  }
  const normalized: PersistenceSchemaEntityName[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !entityNameSet.has(item)) {
      errors.push(
        implementationError(
          "knowledge_persistence_implementation_packet.invalid_future_artifact_ref",
          path,
          "Knowledge future artifact entity name must come from schema contract.",
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
  errors: KnowledgePersistenceImplementationPacketError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref",
        path,
        "Policy prerequisite requires gate refs.",
      ),
    );
    return null;
  }
  const normalized: PersistencePolicyGateId[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !gateIdSet.has(item)) {
      errors.push(
        implementationError(
          "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref",
          path,
          "Policy prerequisite gate refs must be known persistence gates.",
        ),
      );
      return null;
    }
    normalized.push(item as PersistencePolicyGateId);
  }
  return normalized;
}

function validateSideEffects(
  value: unknown,
  errors: KnowledgePersistenceImplementationPacketError[],
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.length > 0) {
    errors.push(
      implementationError(
        "knowledge_persistence_implementation_packet.side_effects_forbidden",
        "/side_effects",
        "Knowledge persistence implementation packet must preserve side_effects: [].",
      ),
    );
  }
}

function requireFalse(
  value: unknown,
  path: string,
  errors: KnowledgePersistenceImplementationPacketError[],
  code: KnowledgePersistenceImplementationPacketErrorCode,
): void {
  if (value !== false) {
    errors.push(
      implementationError(
        code,
        path,
        "Knowledge persistence implementation packet capability must remain false.",
      ),
    );
  }
}

function blockedCapabilityError(
  flag: KnowledgePersistenceImplementationBlockedCapabilityFlag,
  path: string,
): KnowledgePersistenceImplementationPacketError {
  if (flag.includes("database") || flag.includes("sql") || flag.includes("ddl")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.connection_or_sql_forbidden",
      path,
      "Database connection, SQL, and DDL remain blocked.",
    );
  }
  if (flag.includes("role") || flag.includes("grant")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.role_grant_forbidden",
      path,
      "Role and grant mutation remains blocked.",
    );
  }
  if (flag.includes("migration")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.migration_execution_forbidden",
      path,
      "Migration execution remains blocked.",
    );
  }
  if (flag.includes("writer")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.writer_implementation_forbidden",
      path,
      "Writer implementation remains blocked.",
    );
  }
  if (
    flag.includes("persist") ||
    flag.includes("knowledge_record") ||
    flag.includes("snapshot") ||
    flag.includes("chunk") ||
    flag.includes("context_bundle") ||
    flag.includes("eval_run") ||
    flag.includes("embedding") ||
    flag.includes("vector")
  ) {
    return implementationError(
      "knowledge_persistence_implementation_packet.persistence_write_forbidden",
      path,
      "Persisted knowledge writes remain blocked.",
    );
  }
  if (flag.includes("queue")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.queue_mutation_forbidden",
      path,
      "Queue mutation remains blocked.",
    );
  }
  if (flag.includes("approval")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.approval_mutation_forbidden",
      path,
      "Approval creation, persistence, and mutation remain blocked.",
    );
  }
  if (flag.includes("audit")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.audit_write_forbidden",
      path,
      "Audit writes remain blocked.",
    );
  }
  if (
    flag.includes("auth") ||
    flag.includes("credential") ||
    flag.includes("integration")
  ) {
    return implementationError(
      "knowledge_persistence_implementation_packet.auth_or_integration_forbidden",
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
    return implementationError(
      "knowledge_persistence_implementation_packet.runtime_or_live_execution_forbidden",
      path,
      "Runtime, broker, adapter, and live execution remain blocked.",
    );
  }
  if (flag.includes("deploy") || flag.includes("git")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.deploy_or_git_forbidden",
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
    return implementationError(
      "knowledge_persistence_implementation_packet.host_or_os_connector_forbidden",
      path,
      "Host, OS connector, Python, and platform binary scope remain blocked.",
    );
  }
  if (flag.includes("external")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.external_service_forbidden",
      path,
      "External service calls remain blocked.",
    );
  }
  if (flag.includes("secret")) {
    return implementationError(
      "knowledge_persistence_implementation_packet.secret_value_forbidden",
      path,
      "Secret values remain blocked.",
    );
  }
  return implementationError(
    "knowledge_persistence_implementation_packet.blocked_capability_forbidden",
    path,
    "Blocked knowledge persistence implementation capability must remain false.",
  );
}

function requiredError(
  refKind: string,
  path: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    `knowledge_persistence_implementation_packet.${refKind}_required` as KnowledgePersistenceImplementationPacketErrorCode,
    path,
    "Knowledge persistence implementation packet source evidence is required.",
  );
}

function invalidFutureArtifactRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_future_artifact_ref",
    `/future_artifact_refs/${index}${suffix}`,
    "Future artifact ref drifted.",
  );
}

function invalidPolicyPrerequisiteRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_policy_prerequisite_ref",
    `/policy_prerequisite_refs/${index}${suffix}`,
    "Policy prerequisite ref drifted.",
  );
}

function invalidApprovalPrerequisiteRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_approval_prerequisite_ref",
    `/approval_prerequisite_refs/${index}${suffix}`,
    "Approval prerequisite ref drifted.",
  );
}

function invalidAuditObligationRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_audit_obligation_ref",
    `/audit_obligation_refs/${index}${suffix}`,
    "Audit obligation ref drifted.",
  );
}

function invalidRollbackRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_rollback_ref",
    `/rollback_refs/${index}${suffix}`,
    "Rollback ref drifted.",
  );
}

function invalidValidationCommandRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_validation_command_ref",
    `/validation_command_refs/${index}${suffix}`,
    "Validation command ref drifted.",
  );
}

function invalidSourceRef(
  index: number,
  suffix: string,
): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.invalid_source_ref",
    `/source_refs/${index}${suffix}`,
    "Source ref drifted.",
  );
}

function gateOrderDrift(index: number): KnowledgePersistenceImplementationPacketError {
  return implementationError(
    "knowledge_persistence_implementation_packet.gate_order_drift",
    `/gate_sequence/${index}`,
    "Knowledge persistence implementation packet gate order must match BP-0203.",
  );
}

function implementationError(
  code: KnowledgePersistenceImplementationPacketErrorCode,
  path: string,
  message: string,
): KnowledgePersistenceImplementationPacketError {
  return { code, path, message, severity: "error" };
}

function isArtifactKind(
  value: unknown,
): value is KnowledgePersistenceImplementationArtifactKind {
  return typeof value === "string" && artifactKindSet.has(value);
}

function isPolicyPrerequisiteKind(
  value: unknown,
): value is KnowledgePersistenceImplementationPolicyPrerequisiteKind {
  return typeof value === "string" && policyPrerequisiteKindSet.has(value);
}

function isApprovalPrerequisiteKind(
  value: unknown,
): value is KnowledgePersistenceImplementationApprovalPrerequisiteKind {
  return typeof value === "string" && approvalPrerequisiteKindSet.has(value);
}

function isAuditObligationKind(
  value: unknown,
): value is KnowledgePersistenceImplementationAuditObligationKind {
  return typeof value === "string" && auditObligationKindSet.has(value);
}

function isRollbackKind(
  value: unknown,
): value is KnowledgePersistenceImplementationRollbackKind {
  return typeof value === "string" && rollbackKindSet.has(value);
}

function isValidationKind(
  value: unknown,
): value is KnowledgePersistenceImplementationValidationKind {
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
  if (typeof value === "string") {
    return containsUnsafeString(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsUnsafeValue(item));
  }
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
  errors: KnowledgePersistenceImplementationPacketError[],
): KnowledgePersistenceImplementationPacketError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
