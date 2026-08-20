import {
  approvalRequestPreflightBlockedCapabilityFlags,
  approvalRequestPreflightContract,
  approvalRequestPreflightTargetGate,
  type ApprovalRequestPreflightBlockedCapabilityFlag,
} from "./approval-request-preflight-contract.js";
import { databaseSecurityPreflightContract } from "./database-security-preflight-contract.js";
import { migrationArtifactStaticReviewContract } from "./migration-artifact-static-review.js";
import {
  persistencePolicyGateIds,
  type PersistencePolicyGateId,
} from "./persistence-policy-gate.js";
import {
  persistenceSchemaContract,
  persistenceSchemaEntityNames,
  type PersistenceSchemaEntityName,
} from "./persistence-schema-contract.js";
import { policyGatePreflightContract } from "./policy-gate-preflight-contract.js";
import { writerPreflightContract } from "./writer-preflight-contract.js";

export const PERSISTENCE_READINESS_PREFLIGHT_CONTRACT_STATUS = "source_only";

export const persistenceReadinessPreflightTargetGate =
  "G08_PERSISTENCE_READINESS" satisfies PersistencePolicyGateId;

export const persistenceReadinessPrerequisiteKinds = [
  "migration_static_review_ref",
  "writer_preflight_ref",
  "database_security_preflight_ref",
  "policy_gate_preflight_ref",
  "approval_request_preflight_ref",
] as const;

export const persistenceReadinessMigrationArtifactRefKinds = [
  "reviewed_migration_manifest_ref",
  "reviewed_sql_artifact_ref",
  "rollback_artifact_ref",
  "static_check_result_ref",
] as const;

export const persistenceReadinessRequiredTestKinds = [
  "schema_contract_tests",
  "migration_static_review_tests",
  "writer_preflight_tests",
  "database_security_preflight_tests",
  "policy_gate_preflight_tests",
  "approval_request_preflight_tests",
  "full_workspace_check",
] as const;

export const persistenceReadinessPreflightAdditionalBlockedCapabilityFlags = [
  "persistence_readiness_execution_allowed",
  "implementation_packet_selection_allowed",
  "implementation_scope_request_allowed",
  "persistence_scope_request_allowed",
  "write_scope_request_allowed",
  "persisted_storage_allowed",
  "live_storage_allowed",
  "readiness_state_persistence_allowed",
  "operation_result_record_allowed",
  "live_operation_result_record_allowed",
] as const;

export const persistenceReadinessPreflightBlockedCapabilityFlags = [
  ...approvalRequestPreflightBlockedCapabilityFlags,
  ...persistenceReadinessPreflightAdditionalBlockedCapabilityFlags,
] as const;

export const persistenceReadinessPreflightContract = {
  contract_id: "lnsat.platform.persistence_readiness_preflight.v0_1",
  authority: ["@lnsat/packets", "source-backed-persistence-readiness-preflight"],
  persistence_readiness_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  persistence_schema_contract_id: persistenceSchemaContract.contract_id,
  migration_static_review_contract_id:
    migrationArtifactStaticReviewContract.contract_id,
  writer_preflight_contract_id: writerPreflightContract.contract_id,
  database_security_preflight_contract_id:
    databaseSecurityPreflightContract.contract_id,
  policy_gate_preflight_contract_id: policyGatePreflightContract.contract_id,
  approval_request_preflight_contract_id: approvalRequestPreflightContract.contract_id,
  approval_request_target_gate: approvalRequestPreflightTargetGate,
  target_gate: persistenceReadinessPreflightTargetGate,
  gate_ids: persistencePolicyGateIds,
  required_entity_names: persistenceSchemaEntityNames,
  prerequisite_kinds: persistenceReadinessPrerequisiteKinds,
  migration_artifact_ref_kinds: persistenceReadinessMigrationArtifactRefKinds,
  required_test_kinds: persistenceReadinessRequiredTestKinds,
  blocked_capability_flags: persistenceReadinessPreflightBlockedCapabilityFlags,
  contract_authority: "source_only_persistence_readiness_no_implementation",
  source_only_persistence_readiness_preflight_allowed: true,
  prerequisite_refs_allowed: true,
  migration_artifact_refs_allowed: true,
  required_test_refs_allowed: true,
  audit_obligation_refs_allowed: true,
  rollback_refs_allowed: true,
  implementation_packet_selection_allowed: false,
  implementation_scope_request_allowed: false,
  persistence_scope_request_allowed: false,
  write_scope_request_allowed: false,
  persisted_storage_allowed: false,
  approval_mutation_allowed: false,
  audit_write_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  sql_execution_allowed: false,
  ddl_execution_allowed: false,
  role_grant_mutation_allowed: false,
  writer_implementation_allowed: false,
  migration_execution_allowed: false,
  queue_mutation_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type PersistenceReadinessPrerequisiteKind =
  (typeof persistenceReadinessPrerequisiteKinds)[number];
export type PersistenceReadinessMigrationArtifactRefKind =
  (typeof persistenceReadinessMigrationArtifactRefKinds)[number];
export type PersistenceReadinessRequiredTestKind =
  (typeof persistenceReadinessRequiredTestKinds)[number];
export type PersistenceReadinessPreflightAdditionalBlockedCapabilityFlag =
  (typeof persistenceReadinessPreflightAdditionalBlockedCapabilityFlags)[number];
export type PersistenceReadinessPreflightBlockedCapabilityFlag =
  | ApprovalRequestPreflightBlockedCapabilityFlag
  | PersistenceReadinessPreflightAdditionalBlockedCapabilityFlag;

export type PersistenceReadinessSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type PersistenceReadinessPrerequisiteRefInput = {
  prerequisite_ref: string;
  prerequisite_kind: PersistenceReadinessPrerequisiteKind;
  contract_ref: string;
  target_gate: PersistencePolicyGateId;
  readiness_gate: typeof persistenceReadinessPreflightTargetGate;
  current_state: "source_ref_only_prerequisite_evidence";
  implementation_packet_selection_allowed: false;
  live_storage_allowed: false;
};

export type PersistenceReadinessMigrationArtifactRefInput = {
  artifact_ref: string;
  artifact_kind: PersistenceReadinessMigrationArtifactRefKind;
  migration_static_review_ref: string;
  current_state: "source_ref_only_no_migration_execution";
  database_connection_allowed: false;
  migration_execution_allowed: false;
  sql_execution_allowed: false;
};

export type PersistenceReadinessRequiredTestRefInput = {
  test_ref: string;
  test_kind: PersistenceReadinessRequiredTestKind;
  command_ref: string;
  required_before_implementation_packet: true;
  current_state: "source_ref_only_test_evidence";
  implementation_packet_selection_allowed: false;
  live_execution_allowed: false;
};

export type PersistenceReadinessAuditObligationRefInput = {
  obligation_ref: string;
  required_event_type:
    | "policy_checked"
    | "approval_requested"
    | "approval_decision_recorded"
    | "operation_result_recorded"
    | "rollback_recorded";
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  operation_result_record_allowed: false;
};

export type PersistenceReadinessRollbackRefInput = {
  rollback_ref: string;
  rollback_kind:
    | "migration_repair_ref"
    | "writer_disable_ref"
    | "approval_state_reversal_ref"
    | "runtime_revert_ref";
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  live_execution_allowed: false;
};

export type PersistenceReadinessNoLivePostureInput = {
  persistence_readiness_execution_allowed: false;
  implementation_packet_selection_allowed: false;
  implementation_scope_request_allowed: false;
  persistence_scope_request_allowed: false;
  write_scope_request_allowed: false;
  approval_request_creation_allowed: false;
  approval_request_persistence_allowed: false;
  approval_decision_persistence_allowed: false;
  approval_state_transition_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  policy_gate_execution_allowed: false;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  settings_mutation_allowed: false;
  authorization_mutation_allowed: false;
  audit_write_allowed: false;
  audit_mutation_allowed: false;
  operation_result_record_allowed: false;
  live_operation_result_record_allowed: false;
  rollback_execution_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  ddl_execution_allowed: false;
  role_grant_mutation_allowed: false;
  role_grant_execution_allowed: false;
  grant_application_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
  queue_mutation_allowed: false;
  persisted_storage_allowed: false;
  readiness_state_persistence_allowed: false;
  auth_session_runtime_allowed: false;
  integration_setup_write_allowed: false;
  runtime_dispatcher_allowed: false;
  runtime_adapter_implementation_allowed: false;
  os_connector_package_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  external_service_call_allowed: false;
  environment_secret_lookup_allowed: false;
};

export type PersistenceReadinessAllowedStateInput = {
  source_only_persistence_readiness_preflight_allowed: true;
  prerequisite_refs_allowed: true;
  migration_artifact_refs_allowed: true;
  required_test_refs_allowed: true;
  audit_obligation_refs_allowed: true;
  rollback_refs_allowed: true;
  implementation_packet_selection_allowed: false;
  implementation_scope_request_allowed: false;
  persistence_scope_request_allowed: false;
  write_scope_request_allowed: false;
  persisted_storage_allowed: false;
  readiness_state_persistence_allowed: false;
  approval_mutation_allowed: false;
  audit_write_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  ddl_execution_allowed: false;
  role_grant_mutation_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
  queue_mutation_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  external_service_call_allowed: false;
  secret_posture: "references_only_no_values";
};

export type PersistenceReadinessPreflightRequest = Partial<
  Record<PersistenceReadinessPreflightBlockedCapabilityFlag, false>
> & {
  persistence_readiness_version?: typeof persistenceReadinessPreflightContract.persistence_readiness_version;
  gate_sequence?: PersistencePolicyGateId[];
  prerequisite_refs?: PersistenceReadinessPrerequisiteRefInput[];
  migration_artifact_refs?: PersistenceReadinessMigrationArtifactRefInput[];
  required_test_refs?: PersistenceReadinessRequiredTestRefInput[];
  audit_obligation_refs?: PersistenceReadinessAuditObligationRefInput[];
  rollback_refs?: PersistenceReadinessRollbackRefInput[];
  no_live_posture?: PersistenceReadinessNoLivePostureInput;
  source_refs?: PersistenceReadinessSourceRefInput[];
  allowed_state?: PersistenceReadinessAllowedStateInput;
  contract_authority?: typeof persistenceReadinessPreflightContract.contract_authority;
  side_effects?: [];
};

export type PersistenceReadinessPreflightErrorCode =
  | "persistence_readiness.invalid_request"
  | "persistence_readiness.unexpected_field"
  | "persistence_readiness.invalid_version"
  | "persistence_readiness.gate_sequence_required"
  | "persistence_readiness.gate_order_drift"
  | "persistence_readiness.prerequisite_ref_required"
  | "persistence_readiness.invalid_prerequisite_ref"
  | "persistence_readiness.migration_artifact_ref_required"
  | "persistence_readiness.invalid_migration_artifact_ref"
  | "persistence_readiness.required_test_ref_required"
  | "persistence_readiness.invalid_required_test_ref"
  | "persistence_readiness.audit_obligation_ref_required"
  | "persistence_readiness.invalid_audit_obligation_ref"
  | "persistence_readiness.rollback_ref_required"
  | "persistence_readiness.invalid_rollback_ref"
  | "persistence_readiness.no_live_posture_required"
  | "persistence_readiness.no_live_posture_drift"
  | "persistence_readiness.source_ref_required"
  | "persistence_readiness.invalid_source_ref"
  | "persistence_readiness.allowed_state_required"
  | "persistence_readiness.allowed_state_drift"
  | "persistence_readiness.unsafe_contract_authority"
  | "persistence_readiness.secret_value_forbidden"
  | "persistence_readiness.implementation_selection_forbidden"
  | "persistence_readiness.approval_mutation_forbidden"
  | "persistence_readiness.audit_write_forbidden"
  | "persistence_readiness.connection_or_sql_forbidden"
  | "persistence_readiness.role_grant_forbidden"
  | "persistence_readiness.writer_implementation_forbidden"
  | "persistence_readiness.migration_execution_forbidden"
  | "persistence_readiness.queue_mutation_forbidden"
  | "persistence_readiness.live_execution_forbidden"
  | "persistence_readiness.python_runtime_requirement_forbidden"
  | "persistence_readiness.os_specific_binary_requirement_forbidden"
  | "persistence_readiness.blocked_capability_forbidden"
  | "persistence_readiness.side_effects_forbidden";

export type PersistenceReadinessPreflightError = {
  code: PersistenceReadinessPreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PersistenceReadinessPreflightEvidence = {
  contract_id: typeof persistenceReadinessPreflightContract.contract_id;
  persistence_readiness_version: typeof persistenceReadinessPreflightContract.persistence_readiness_version;
  target_gate: typeof persistenceReadinessPreflightTargetGate;
  approval_request_target_gate: typeof approvalRequestPreflightTargetGate;
  persistence_schema_contract_id: typeof persistenceSchemaContract.contract_id;
  migration_static_review_contract_id: typeof migrationArtifactStaticReviewContract.contract_id;
  writer_preflight_contract_id: typeof writerPreflightContract.contract_id;
  database_security_preflight_contract_id: typeof databaseSecurityPreflightContract.contract_id;
  policy_gate_preflight_contract_id: typeof policyGatePreflightContract.contract_id;
  approval_request_preflight_contract_id: typeof approvalRequestPreflightContract.contract_id;
  required_gate_ids: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  prerequisite_refs: PersistenceReadinessPrerequisiteRefInput[];
  migration_artifact_refs: PersistenceReadinessMigrationArtifactRefInput[];
  required_test_refs: PersistenceReadinessRequiredTestRefInput[];
  audit_obligation_refs: PersistenceReadinessAuditObligationRefInput[];
  rollback_refs: PersistenceReadinessRollbackRefInput[];
  no_live_posture: PersistenceReadinessNoLivePostureInput;
  source_refs: string[];
  allowed_state: PersistenceReadinessAllowedStateInput;
  blocked_capabilities: PersistenceReadinessPreflightBlockedCapabilityFlag[];
  implementation_artifacts: [];
  persistence_readiness_artifacts: [];
  implementation_packet_artifacts: [];
  live_storage_artifacts: [];
  implementation_packet_selection_allowed: false;
  implementation_scope_request_allowed: false;
  persistence_scope_request_allowed: false;
  write_scope_request_allowed: false;
  persisted_storage_allowed: false;
  approval_mutation_allowed: false;
  audit_write_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
  queue_mutation_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type PersistenceReadinessPreflightResult =
  | {
      ok: true;
      persistence_readiness_preflight_contract: PersistenceReadinessPreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      persistence_readiness_preflight_contract: null;
      errors: PersistenceReadinessPreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedPersistenceReadinessPreflightRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateId[];
      prerequisite_refs: PersistenceReadinessPrerequisiteRefInput[];
      migration_artifact_refs: PersistenceReadinessMigrationArtifactRefInput[];
      required_test_refs: PersistenceReadinessRequiredTestRefInput[];
      audit_obligation_refs: PersistenceReadinessAuditObligationRefInput[];
      rollback_refs: PersistenceReadinessRollbackRefInput[];
      no_live_posture: PersistenceReadinessNoLivePostureInput;
      source_refs: string[];
      allowed_state: PersistenceReadinessAllowedStateInput;
    }
  | {
      ok: false;
      errors: PersistenceReadinessPreflightError[];
    };

const requestKeys = new Set([
  "persistence_readiness_version",
  "gate_sequence",
  "prerequisite_refs",
  "migration_artifact_refs",
  "required_test_refs",
  "audit_obligation_refs",
  "rollback_refs",
  "no_live_posture",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...persistenceReadinessPreflightBlockedCapabilityFlags,
]);

const prerequisiteKindSet = new Set<string>(persistenceReadinessPrerequisiteKinds);
const migrationArtifactKindSet = new Set<string>(
  persistenceReadinessMigrationArtifactRefKinds,
);
const requiredTestKindSet = new Set<string>(persistenceReadinessRequiredTestKinds);
const gateIdSet = new Set<string>(persistencePolicyGateIds);

const prerequisiteExpectations: Record<
  PersistenceReadinessPrerequisiteKind,
  { contract_ref: string; target_gate: PersistencePolicyGateId; source_ref: string }
> = {
  migration_static_review_ref: {
    contract_ref: migrationArtifactStaticReviewContract.contract_id,
    target_gate: "G03_MIGRATION_ARTIFACT_STATIC",
    source_ref: "packages/packets/src/migration-artifact-static-review.ts",
  },
  writer_preflight_ref: {
    contract_ref: writerPreflightContract.contract_id,
    target_gate: "G04_WRITER_PREFLIGHT",
    source_ref: "packages/packets/src/writer-preflight-contract.ts",
  },
  database_security_preflight_ref: {
    contract_ref: databaseSecurityPreflightContract.contract_id,
    target_gate: "G05_DATABASE_SECURITY",
    source_ref: "packages/packets/src/database-security-preflight-contract.ts",
  },
  policy_gate_preflight_ref: {
    contract_ref: policyGatePreflightContract.contract_id,
    target_gate: "G06_POLICY_GATE",
    source_ref: "packages/packets/src/policy-gate-preflight-contract.ts",
  },
  approval_request_preflight_ref: {
    contract_ref: approvalRequestPreflightContract.contract_id,
    target_gate: "G07_APPROVAL_REQUEST",
    source_ref: "packages/packets/src/approval-request-preflight-contract.ts",
  },
};

const defaultSourceRefs: PersistenceReadinessSourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "Gate G08 requires source-only persistence readiness evidence.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "Future storage targets remain schema refs only.",
  },
  {
    source_ref: "packages/packets/src/persistence-policy-gate.ts",
    summary: "BP-0203 source-only persistence gate order contract.",
  },
  {
    source_ref: "packages/packets/src/persistence-schema-contract.ts",
    summary: "BP-0204 source-only schema entity contract.",
  },
  {
    source_ref: "packages/packets/src/migration-artifact-static-review.ts",
    summary: "BP-0205 migration static review prerequisite.",
  },
  {
    source_ref: "packages/packets/src/writer-preflight-contract.ts",
    summary: "BP-0208 writer preflight prerequisite.",
  },
  {
    source_ref: "packages/packets/src/database-security-preflight-contract.ts",
    summary: "BP-0209 database security prerequisite.",
  },
  {
    source_ref: "packages/packets/src/policy-gate-preflight-contract.ts",
    summary: "BP-0210 policy gate prerequisite.",
  },
  {
    source_ref: "packages/packets/src/approval-request-preflight-contract.ts",
    summary: "BP-0211 approval request prerequisite.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0212 source-only persistence readiness preflight packet.",
  },
];

export const defaultPersistenceReadinessNoLivePosture: PersistenceReadinessNoLivePostureInput =
  {
    persistence_readiness_execution_allowed: false,
    implementation_packet_selection_allowed: false,
    implementation_scope_request_allowed: false,
    persistence_scope_request_allowed: false,
    write_scope_request_allowed: false,
    approval_request_creation_allowed: false,
    approval_request_persistence_allowed: false,
    approval_decision_persistence_allowed: false,
    approval_state_transition_allowed: false,
    approval_mutation_allowed: false,
    approve_deny_mutation_allowed: false,
    policy_gate_execution_allowed: false,
    policy_decision_persistence_allowed: false,
    policy_mutation_allowed: false,
    settings_mutation_allowed: false,
    authorization_mutation_allowed: false,
    audit_write_allowed: false,
    audit_mutation_allowed: false,
    operation_result_record_allowed: false,
    live_operation_result_record_allowed: false,
    rollback_execution_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    sql_execution_allowed: false,
    ddl_execution_allowed: false,
    role_grant_mutation_allowed: false,
    role_grant_execution_allowed: false,
    grant_application_allowed: false,
    writer_implementation_allowed: false,
    migration_execution_allowed: false,
    queue_mutation_allowed: false,
    persisted_storage_allowed: false,
    readiness_state_persistence_allowed: false,
    auth_session_runtime_allowed: false,
    integration_setup_write_allowed: false,
    runtime_dispatcher_allowed: false,
    runtime_adapter_implementation_allowed: false,
    os_connector_package_allowed: false,
    live_storage_allowed: false,
    live_execution_allowed: false,
    external_service_call_allowed: false,
    environment_secret_lookup_allowed: false,
  };

export const defaultPersistenceReadinessAllowedState: PersistenceReadinessAllowedStateInput =
  {
    source_only_persistence_readiness_preflight_allowed: true,
    prerequisite_refs_allowed: true,
    migration_artifact_refs_allowed: true,
    required_test_refs_allowed: true,
    audit_obligation_refs_allowed: true,
    rollback_refs_allowed: true,
    implementation_packet_selection_allowed: false,
    implementation_scope_request_allowed: false,
    persistence_scope_request_allowed: false,
    write_scope_request_allowed: false,
    persisted_storage_allowed: false,
    readiness_state_persistence_allowed: false,
    approval_mutation_allowed: false,
    audit_write_allowed: false,
    database_connection_allowed: false,
    database_write_allowed: false,
    sql_execution_allowed: false,
    ddl_execution_allowed: false,
    role_grant_mutation_allowed: false,
    writer_implementation_allowed: false,
    migration_execution_allowed: false,
    queue_mutation_allowed: false,
    live_storage_allowed: false,
    live_execution_allowed: false,
    python_runtime_required: false,
    os_specific_binary_required: false,
    external_service_call_allowed: false,
    secret_posture: "references_only_no_values",
  };

export const defaultPersistenceReadinessPrerequisiteRefs: PersistenceReadinessPrerequisiteRefInput[] =
  persistenceReadinessPrerequisiteKinds.map((prerequisiteKind) => {
    const expectation = prerequisiteExpectations[prerequisiteKind];
    return {
      prerequisite_ref: expectation.source_ref,
      prerequisite_kind: prerequisiteKind,
      contract_ref: expectation.contract_ref,
      target_gate: expectation.target_gate,
      readiness_gate: persistenceReadinessPreflightTargetGate,
      current_state: "source_ref_only_prerequisite_evidence",
      implementation_packet_selection_allowed: false,
      live_storage_allowed: false,
    };
  });

export const defaultPersistenceReadinessMigrationArtifactRefs: PersistenceReadinessMigrationArtifactRefInput[] =
  persistenceReadinessMigrationArtifactRefKinds.map((artifactKind) => ({
    artifact_ref: "packages/packets/src/migration-artifact-static-review.ts",
    artifact_kind: artifactKind,
    migration_static_review_ref: migrationArtifactStaticReviewContract.contract_id,
    current_state: "source_ref_only_no_migration_execution",
    database_connection_allowed: false,
    migration_execution_allowed: false,
    sql_execution_allowed: false,
  }));

const defaultPersistenceReadinessRequiredTestRefInputs = [
  {
    test_ref: "packages/packets/test/persistence-schema-contract.test.ts",
    test_kind: "schema_contract_tests",
    command_ref: "npm run test -w @lnsat/packets -- persistence-schema-contract",
  },
  {
    test_ref: "packages/packets/test/migration-artifact-static-review.test.ts",
    test_kind: "migration_static_review_tests",
    command_ref: "npm run test -w @lnsat/packets -- migration-artifact-static-review",
  },
  {
    test_ref: "packages/packets/test/writer-preflight-contract.test.ts",
    test_kind: "writer_preflight_tests",
    command_ref: "npm run test -w @lnsat/packets -- writer-preflight-contract",
  },
  {
    test_ref: "packages/packets/test/database-security-preflight-contract.test.ts",
    test_kind: "database_security_preflight_tests",
    command_ref:
      "npm run test -w @lnsat/packets -- database-security-preflight-contract",
  },
  {
    test_ref: "packages/packets/test/policy-gate-preflight-contract.test.ts",
    test_kind: "policy_gate_preflight_tests",
    command_ref: "npm run test -w @lnsat/packets -- policy-gate-preflight-contract",
  },
  {
    test_ref: "packages/packets/test/approval-request-preflight-contract.test.ts",
    test_kind: "approval_request_preflight_tests",
    command_ref:
      "npm run test -w @lnsat/packets -- approval-request-preflight-contract",
  },
  {
    test_ref: "package.json#scripts.check",
    test_kind: "full_workspace_check",
    command_ref: "npm run check",
  },
] satisfies Array<
  Pick<
    PersistenceReadinessRequiredTestRefInput,
    "test_ref" | "test_kind" | "command_ref"
  >
>;

export const defaultPersistenceReadinessRequiredTestRefs: PersistenceReadinessRequiredTestRefInput[] =
  defaultPersistenceReadinessRequiredTestRefInputs.map((ref) => ({
    ...ref,
    required_before_implementation_packet: true,
    current_state: "source_ref_only_test_evidence",
    implementation_packet_selection_allowed: false,
    live_execution_allowed: false,
  }));

export const defaultPersistenceReadinessAuditObligationRefs: PersistenceReadinessAuditObligationRefInput[] =
  [
    "policy_checked",
    "approval_requested",
    "approval_decision_recorded",
    "operation_result_recorded",
    "rollback_recorded",
  ].map((requiredEventType) => ({
    obligation_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G08_PERSISTENCE_READINESS",
    required_event_type:
      requiredEventType as PersistenceReadinessAuditObligationRefInput["required_event_type"],
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    operation_result_record_allowed: false,
  }));

export const defaultPersistenceReadinessRollbackRefs: PersistenceReadinessRollbackRefInput[] =
  [
    "migration_repair_ref",
    "writer_disable_ref",
    "approval_state_reversal_ref",
    "runtime_revert_ref",
  ].map((rollbackKind) => ({
    rollback_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#Scope-Ownership-Map",
    rollback_kind:
      rollbackKind as PersistenceReadinessRollbackRefInput["rollback_kind"],
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    live_execution_allowed: false,
  }));

export function createPersistenceReadinessPreflightContract(
  request: PersistenceReadinessPreflightRequest = {},
): PersistenceReadinessPreflightResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      persistence_readiness_preflight_contract: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    persistence_readiness_preflight_contract: {
      contract_id: persistenceReadinessPreflightContract.contract_id,
      persistence_readiness_version:
        persistenceReadinessPreflightContract.persistence_readiness_version,
      target_gate: persistenceReadinessPreflightTargetGate,
      approval_request_target_gate: approvalRequestPreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      database_security_preflight_contract_id:
        databaseSecurityPreflightContract.contract_id,
      policy_gate_preflight_contract_id: policyGatePreflightContract.contract_id,
      approval_request_preflight_contract_id:
        approvalRequestPreflightContract.contract_id,
      required_gate_ids: normalized.gate_sequence,
      required_entity_names: [...persistenceSchemaEntityNames],
      prerequisite_refs: normalized.prerequisite_refs,
      migration_artifact_refs: normalized.migration_artifact_refs,
      required_test_refs: normalized.required_test_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      no_live_posture: normalized.no_live_posture,
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...persistenceReadinessPreflightBlockedCapabilityFlags],
      implementation_artifacts: [],
      persistence_readiness_artifacts: [],
      implementation_packet_artifacts: [],
      live_storage_artifacts: [],
      implementation_packet_selection_allowed: false,
      implementation_scope_request_allowed: false,
      persistence_scope_request_allowed: false,
      write_scope_request_allowed: false,
      persisted_storage_allowed: false,
      approval_mutation_allowed: false,
      audit_write_allowed: false,
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      migration_execution_allowed: false,
      queue_mutation_allowed: false,
      live_storage_allowed: false,
      live_execution_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeRequest(
  request: PersistenceReadinessPreflightRequest,
): NormalizedPersistenceReadinessPreflightRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        persistenceReadinessError(
          "persistence_readiness.invalid_request",
          "",
          "Persistence readiness preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: PersistenceReadinessPreflightError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        persistenceReadinessError(
          "persistence_readiness.unexpected_field",
          `/${key}`,
          "Unexpected persistence readiness preflight field.",
        ),
      );
    }
  }

  if (
    request.persistence_readiness_version !== undefined &&
    request.persistence_readiness_version !==
      persistenceReadinessPreflightContract.persistence_readiness_version
  ) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.invalid_version",
        "/persistence_readiness_version",
        "Persistence readiness preflight version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !==
      persistenceReadinessPreflightContract.contract_authority
  ) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.unsafe_contract_authority",
        "/contract_authority",
        "Persistence readiness preflight authority must remain source-only.",
      ),
    );
  }

  if (containsUnsafeValue(request)) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.secret_value_forbidden",
        "",
        "Persistence readiness preflight input must not include secrets, connection strings, or live endpoints.",
      ),
    );
  }

  for (const flag of persistenceReadinessPreflightBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, "/side_effects", errors);

  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const prerequisiteRefs = normalizePrerequisiteRefs(
    request.prerequisite_refs ?? defaultPersistenceReadinessPrerequisiteRefs,
    errors,
  );
  const migrationArtifactRefs = normalizeMigrationArtifactRefs(
    request.migration_artifact_refs ?? defaultPersistenceReadinessMigrationArtifactRefs,
    errors,
  );
  const requiredTestRefs = normalizeRequiredTestRefs(
    request.required_test_refs ?? defaultPersistenceReadinessRequiredTestRefs,
    errors,
  );
  const auditObligationRefs = normalizeAuditObligationRefs(
    request.audit_obligation_refs ?? defaultPersistenceReadinessAuditObligationRefs,
    errors,
  );
  const rollbackRefs = normalizeRollbackRefs(
    request.rollback_refs ?? defaultPersistenceReadinessRollbackRefs,
    errors,
  );
  const noLivePosture = normalizeNoLivePosture(
    request.no_live_posture ?? defaultPersistenceReadinessNoLivePosture,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultPersistenceReadinessAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    gateSequence === null ||
    prerequisiteRefs === null ||
    migrationArtifactRefs === null ||
    requiredTestRefs === null ||
    auditObligationRefs === null ||
    rollbackRefs === null ||
    noLivePosture === null ||
    sourceRefs === null ||
    allowedState === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    gate_sequence: gateSequence,
    prerequisite_refs: prerequisiteRefs,
    migration_artifact_refs: migrationArtifactRefs,
    required_test_refs: requiredTestRefs,
    audit_obligation_refs: auditObligationRefs,
    rollback_refs: rollbackRefs,
    no_live_posture: noLivePosture,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.gate_sequence_required",
        "/gate_sequence",
        "Persistence readiness requires the full persistence gate order.",
      ),
    );
    return null;
  }

  const normalized: PersistencePolicyGateId[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const gateId = value[index];
    if (!isPersistencePolicyGateId(gateId)) {
      errors.push(
        persistenceReadinessError(
          "persistence_readiness.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate id is unsupported.",
        ),
      );
      continue;
    }
    if (seen.has(gateId) || persistencePolicyGateIds[index] !== gateId) {
      errors.push(
        persistenceReadinessError(
          "persistence_readiness.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate order must match BP-0203.",
        ),
      );
    }
    seen.add(gateId);
    normalized.push(gateId);
  }

  for (const requiredGateId of persistencePolicyGateIds) {
    if (!seen.has(requiredGateId)) {
      errors.push(
        persistenceReadinessError(
          "persistence_readiness.gate_sequence_required",
          "/gate_sequence",
          "Persistence readiness is missing a required gate id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizePrerequisiteRefs(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessPrerequisiteRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("prerequisite_ref", "/prerequisite_refs"));
    return null;
  }

  const normalized: PersistenceReadinessPrerequisiteRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidPrerequisiteRef(index, ""));
      continue;
    }

    const prerequisiteKind = rawRef.prerequisite_kind;
    if (!isPrerequisiteKind(prerequisiteKind)) {
      errors.push(invalidPrerequisiteRef(index, "/prerequisite_kind"));
      continue;
    }
    seen.add(prerequisiteKind);

    const expectation = prerequisiteExpectations[prerequisiteKind];
    const prerequisiteRef = normalizeRepoRef(
      rawRef.prerequisite_ref,
      `/prerequisite_refs/${index}/prerequisite_ref`,
      errors,
      "persistence_readiness.invalid_prerequisite_ref",
    );

    if (rawRef.contract_ref !== expectation.contract_ref) {
      errors.push(invalidPrerequisiteRef(index, "/contract_ref"));
    }
    if (rawRef.target_gate !== expectation.target_gate) {
      errors.push(invalidPrerequisiteRef(index, "/target_gate"));
    }
    if (rawRef.readiness_gate !== persistenceReadinessPreflightTargetGate) {
      errors.push(invalidPrerequisiteRef(index, "/readiness_gate"));
    }
    if (rawRef.current_state !== "source_ref_only_prerequisite_evidence") {
      errors.push(invalidPrerequisiteRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.implementation_packet_selection_allowed,
      `/prerequisite_refs/${index}/implementation_packet_selection_allowed`,
      errors,
      "persistence_readiness.implementation_selection_forbidden",
    );
    requireFalse(
      rawRef.live_storage_allowed,
      `/prerequisite_refs/${index}/live_storage_allowed`,
      errors,
      "persistence_readiness.live_execution_forbidden",
    );

    if (prerequisiteRef !== null) {
      normalized.push({
        prerequisite_ref: prerequisiteRef,
        prerequisite_kind: prerequisiteKind,
        contract_ref: expectation.contract_ref,
        target_gate: expectation.target_gate,
        readiness_gate: persistenceReadinessPreflightTargetGate,
        current_state: "source_ref_only_prerequisite_evidence",
        implementation_packet_selection_allowed: false,
        live_storage_allowed: false,
      });
    }
  }

  for (const requiredKind of persistenceReadinessPrerequisiteKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("prerequisite_ref", "/prerequisite_refs"));
    }
  }

  return normalized;
}

function normalizeMigrationArtifactRefs(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessMigrationArtifactRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("migration_artifact_ref", "/migration_artifact_refs"));
    return null;
  }

  const normalized: PersistenceReadinessMigrationArtifactRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidMigrationArtifactRef(index, ""));
      continue;
    }

    const artifactKind = rawRef.artifact_kind;
    if (!isMigrationArtifactKind(artifactKind)) {
      errors.push(invalidMigrationArtifactRef(index, "/artifact_kind"));
      continue;
    }
    seen.add(artifactKind);

    const artifactRef = normalizeRepoRef(
      rawRef.artifact_ref,
      `/migration_artifact_refs/${index}/artifact_ref`,
      errors,
      "persistence_readiness.invalid_migration_artifact_ref",
    );

    if (
      rawRef.migration_static_review_ref !==
      migrationArtifactStaticReviewContract.contract_id
    ) {
      errors.push(invalidMigrationArtifactRef(index, "/migration_static_review_ref"));
    }
    if (rawRef.current_state !== "source_ref_only_no_migration_execution") {
      errors.push(invalidMigrationArtifactRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.database_connection_allowed,
      `/migration_artifact_refs/${index}/database_connection_allowed`,
      errors,
      "persistence_readiness.connection_or_sql_forbidden",
    );
    requireFalse(
      rawRef.migration_execution_allowed,
      `/migration_artifact_refs/${index}/migration_execution_allowed`,
      errors,
      "persistence_readiness.migration_execution_forbidden",
    );
    requireFalse(
      rawRef.sql_execution_allowed,
      `/migration_artifact_refs/${index}/sql_execution_allowed`,
      errors,
      "persistence_readiness.connection_or_sql_forbidden",
    );

    if (artifactRef !== null) {
      normalized.push({
        artifact_ref: artifactRef,
        artifact_kind: artifactKind,
        migration_static_review_ref: migrationArtifactStaticReviewContract.contract_id,
        current_state: "source_ref_only_no_migration_execution",
        database_connection_allowed: false,
        migration_execution_allowed: false,
        sql_execution_allowed: false,
      });
    }
  }

  for (const requiredKind of persistenceReadinessMigrationArtifactRefKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("migration_artifact_ref", "/migration_artifact_refs"));
    }
  }

  return normalized;
}

function normalizeRequiredTestRefs(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessRequiredTestRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("required_test_ref", "/required_test_refs"));
    return null;
  }

  const normalized: PersistenceReadinessRequiredTestRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidRequiredTestRef(index, ""));
      continue;
    }

    const testKind = rawRef.test_kind;
    if (!isRequiredTestKind(testKind)) {
      errors.push(invalidRequiredTestRef(index, "/test_kind"));
      continue;
    }
    seen.add(testKind);

    const testRef = normalizeRepoRef(
      rawRef.test_ref,
      `/required_test_refs/${index}/test_ref`,
      errors,
      "persistence_readiness.invalid_required_test_ref",
    );
    const commandRef = normalizeCommandRef(
      rawRef.command_ref,
      `/required_test_refs/${index}/command_ref`,
      errors,
    );

    if (rawRef.required_before_implementation_packet !== true) {
      errors.push(
        invalidRequiredTestRef(index, "/required_before_implementation_packet"),
      );
    }
    if (rawRef.current_state !== "source_ref_only_test_evidence") {
      errors.push(invalidRequiredTestRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.implementation_packet_selection_allowed,
      `/required_test_refs/${index}/implementation_packet_selection_allowed`,
      errors,
      "persistence_readiness.implementation_selection_forbidden",
    );
    requireFalse(
      rawRef.live_execution_allowed,
      `/required_test_refs/${index}/live_execution_allowed`,
      errors,
      "persistence_readiness.live_execution_forbidden",
    );

    if (testRef !== null && commandRef !== null) {
      normalized.push({
        test_ref: testRef,
        test_kind: testKind,
        command_ref: commandRef,
        required_before_implementation_packet: true,
        current_state: "source_ref_only_test_evidence",
        implementation_packet_selection_allowed: false,
        live_execution_allowed: false,
      });
    }
  }

  for (const requiredKind of persistenceReadinessRequiredTestKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("required_test_ref", "/required_test_refs"));
    }
  }

  return normalized;
}

function normalizeAuditObligationRefs(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessAuditObligationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    return null;
  }

  const normalized: PersistenceReadinessAuditObligationRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidAuditObligationRef(index, ""));
      continue;
    }

    const eventType = rawRef.required_event_type;
    if (!isAuditEventType(eventType)) {
      errors.push(invalidAuditObligationRef(index, "/required_event_type"));
      continue;
    }
    seen.add(eventType);

    const obligationRef = normalizeRepoRef(
      rawRef.obligation_ref,
      `/audit_obligation_refs/${index}/obligation_ref`,
      errors,
      "persistence_readiness.invalid_audit_obligation_ref",
    );

    if (rawRef.current_state !== "source_ref_only_no_audit_write") {
      errors.push(invalidAuditObligationRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.audit_write_allowed,
      `/audit_obligation_refs/${index}/audit_write_allowed`,
      errors,
      "persistence_readiness.audit_write_forbidden",
    );
    requireFalse(
      rawRef.operation_result_record_allowed,
      `/audit_obligation_refs/${index}/operation_result_record_allowed`,
      errors,
      "persistence_readiness.audit_write_forbidden",
    );

    if (obligationRef !== null) {
      normalized.push({
        obligation_ref: obligationRef,
        required_event_type: eventType,
        current_state: "source_ref_only_no_audit_write",
        audit_write_allowed: false,
        operation_result_record_allowed: false,
      });
    }
  }

  for (const requiredEventType of [
    "policy_checked",
    "approval_requested",
    "approval_decision_recorded",
    "operation_result_recorded",
    "rollback_recorded",
  ]) {
    if (!seen.has(requiredEventType)) {
      errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    }
  }

  return normalized;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessRollbackRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("rollback_ref", "/rollback_refs"));
    return null;
  }

  const normalized: PersistenceReadinessRollbackRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidRollbackRef(index, ""));
      continue;
    }

    const rollbackKind = rawRef.rollback_kind;
    if (!isRollbackKind(rollbackKind)) {
      errors.push(invalidRollbackRef(index, "/rollback_kind"));
      continue;
    }
    seen.add(rollbackKind);

    const rollbackRef = normalizeRepoRef(
      rawRef.rollback_ref,
      `/rollback_refs/${index}/rollback_ref`,
      errors,
      "persistence_readiness.invalid_rollback_ref",
    );

    if (rawRef.current_state !== "source_ref_only_no_rollback_execution") {
      errors.push(invalidRollbackRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.rollback_execution_allowed,
      `/rollback_refs/${index}/rollback_execution_allowed`,
      errors,
      "persistence_readiness.live_execution_forbidden",
    );
    requireFalse(
      rawRef.live_execution_allowed,
      `/rollback_refs/${index}/live_execution_allowed`,
      errors,
      "persistence_readiness.live_execution_forbidden",
    );

    if (rollbackRef !== null) {
      normalized.push({
        rollback_ref: rollbackRef,
        rollback_kind: rollbackKind,
        current_state: "source_ref_only_no_rollback_execution",
        rollback_execution_allowed: false,
        live_execution_allowed: false,
      });
    }
  }

  for (const requiredKind of [
    "migration_repair_ref",
    "writer_disable_ref",
    "approval_state_reversal_ref",
    "runtime_revert_ref",
  ]) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("rollback_ref", "/rollback_refs"));
    }
  }

  return normalized;
}

function normalizeNoLivePosture(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessNoLivePostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.no_live_posture_required",
        "/no_live_posture",
        "Persistence readiness no-live posture is required.",
      ),
    );
    return null;
  }

  for (const [key, expectedValue] of Object.entries(
    defaultPersistenceReadinessNoLivePosture,
  )) {
    if (value[key] !== expectedValue) {
      errors.push(
        persistenceReadinessError(
          "persistence_readiness.no_live_posture_drift",
          `/no_live_posture/${key}`,
          "Persistence readiness no-live posture drifted.",
        ),
      );
    }
  }

  return defaultPersistenceReadinessNoLivePosture;
}

function normalizeAllowedState(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
): PersistenceReadinessAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.allowed_state_required",
        "/allowed_state",
        "Persistence readiness allowed state is required.",
      ),
    );
    return null;
  }

  for (const [key, expectedValue] of Object.entries(
    defaultPersistenceReadinessAllowedState,
  )) {
    if (value[key] !== expectedValue) {
      errors.push(
        persistenceReadinessError(
          "persistence_readiness.allowed_state_drift",
          `/allowed_state/${key}`,
          "Persistence readiness allowed state drifted.",
        ),
      );
    }
  }

  return defaultPersistenceReadinessAllowedState;
}

function normalizeSourceRefs(
  value: unknown,
  errors: PersistenceReadinessPreflightError[],
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
      "persistence_readiness.invalid_source_ref",
    );
    if (typeof rawRef.summary !== "string" || rawRef.summary.trim() === "") {
      errors.push(invalidSourceRef(index, "/summary"));
    }
    if (sourceRef !== null) {
      sourceRefs.push(sourceRef);
    }
  }

  if (!sourceRefs.includes("docs/reference/CONTRACT_PROVENANCE.md")) {
    errors.push(requiredError("source_ref", "/source_refs"));
  }

  return sourceRefs;
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  errors: PersistenceReadinessPreflightError[],
  code: PersistenceReadinessPreflightErrorCode,
): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(
      persistenceReadinessError(code, path, "Repo-local source ref is required."),
    );
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
      persistenceReadinessError(
        code,
        path,
        "Source ref must stay repo-local and contain no secret or connection value.",
      ),
    );
    return null;
  }

  return trimmed;
}

function normalizeCommandRef(
  value: unknown,
  path: string,
  errors: PersistenceReadinessPreflightError[],
): string | null {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    containsUnsafeString(value) ||
    /(?:^|\s)(?:curl|ssh|docker|wrangler|gh|git\s+(?:push|commit|add|reset|checkout)|psql|mysql|cloudflared)(?:\s|$)/i.test(
      value,
    )
  ) {
    errors.push(invalidRequiredTestRef(path, ""));
    return null;
  }
  return value.trim();
}

function validateSideEffects(
  value: unknown,
  path: string,
  errors: PersistenceReadinessPreflightError[],
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.length > 0) {
    errors.push(
      persistenceReadinessError(
        "persistence_readiness.side_effects_forbidden",
        path,
        "Persistence readiness preflight must not claim side effects.",
      ),
    );
  }
}

function requireFalse(
  value: unknown,
  path: string,
  errors: PersistenceReadinessPreflightError[],
  code: PersistenceReadinessPreflightErrorCode,
): void {
  if (value !== false) {
    errors.push(
      persistenceReadinessError(
        code,
        path,
        "Persistence readiness preflight capability must remain false.",
      ),
    );
  }
}

function blockedCapabilityError(
  flag: PersistenceReadinessPreflightBlockedCapabilityFlag,
  path: string,
): PersistenceReadinessPreflightError {
  if (
    flag.includes("implementation") ||
    flag.includes("scope_request") ||
    flag.includes("persistence_readiness")
  ) {
    return persistenceReadinessError(
      "persistence_readiness.implementation_selection_forbidden",
      path,
      "Implementation packet selection and scope requests remain blocked.",
    );
  }
  if (flag.includes("approval")) {
    return persistenceReadinessError(
      "persistence_readiness.approval_mutation_forbidden",
      path,
      "Approval mutation remains blocked.",
    );
  }
  if (flag.includes("audit") || flag.includes("operation_result")) {
    return persistenceReadinessError(
      "persistence_readiness.audit_write_forbidden",
      path,
      "Audit writes and operation result records remain blocked.",
    );
  }
  if (flag.includes("database") || flag.includes("sql") || flag.includes("ddl")) {
    return persistenceReadinessError(
      "persistence_readiness.connection_or_sql_forbidden",
      path,
      "Database connection, SQL, and DDL remain blocked.",
    );
  }
  if (flag.includes("role") || flag.includes("grant")) {
    return persistenceReadinessError(
      "persistence_readiness.role_grant_forbidden",
      path,
      "Role and grant mutation remains blocked.",
    );
  }
  if (flag.includes("writer")) {
    return persistenceReadinessError(
      "persistence_readiness.writer_implementation_forbidden",
      path,
      "Writer implementation remains blocked.",
    );
  }
  if (flag.includes("migration")) {
    return persistenceReadinessError(
      "persistence_readiness.migration_execution_forbidden",
      path,
      "Migration execution remains blocked.",
    );
  }
  if (flag.includes("queue")) {
    return persistenceReadinessError(
      "persistence_readiness.queue_mutation_forbidden",
      path,
      "Queue mutation remains blocked.",
    );
  }
  if (flag.includes("python")) {
    return persistenceReadinessError(
      "persistence_readiness.python_runtime_requirement_forbidden",
      path,
      "Python runtime must not become a core requirement.",
    );
  }
  if (flag.includes("os_specific_binary")) {
    return persistenceReadinessError(
      "persistence_readiness.os_specific_binary_requirement_forbidden",
      path,
      "OS-specific binary must not become a core requirement.",
    );
  }
  if (flag.includes("live") || flag.includes("runtime")) {
    return persistenceReadinessError(
      "persistence_readiness.live_execution_forbidden",
      path,
      "Live/runtime execution remains blocked.",
    );
  }
  return persistenceReadinessError(
    "persistence_readiness.blocked_capability_forbidden",
    path,
    "Blocked persistence readiness capability must remain false.",
  );
}

function requiredError(
  refKind: string,
  path: string,
): PersistenceReadinessPreflightError {
  return persistenceReadinessError(
    `persistence_readiness.${refKind}_required` as PersistenceReadinessPreflightErrorCode,
    path,
    "Persistence readiness source evidence is required.",
  );
}

function invalidPrerequisiteRef(
  index: number,
  suffix: string,
): PersistenceReadinessPreflightError {
  return persistenceReadinessError(
    "persistence_readiness.invalid_prerequisite_ref",
    `/prerequisite_refs/${index}${suffix}`,
    "Persistence readiness prerequisite ref drifted.",
  );
}

function invalidMigrationArtifactRef(
  index: number,
  suffix: string,
): PersistenceReadinessPreflightError {
  return persistenceReadinessError(
    "persistence_readiness.invalid_migration_artifact_ref",
    `/migration_artifact_refs/${index}${suffix}`,
    "Persistence readiness migration artifact ref drifted.",
  );
}

function invalidRequiredTestRef(
  indexOrPath: number | string,
  suffix: string,
): PersistenceReadinessPreflightError {
  const path =
    typeof indexOrPath === "number"
      ? `/required_test_refs/${indexOrPath}${suffix}`
      : indexOrPath;
  return persistenceReadinessError(
    "persistence_readiness.invalid_required_test_ref",
    path,
    "Persistence readiness required test ref drifted.",
  );
}

function invalidAuditObligationRef(
  index: number,
  suffix: string,
): PersistenceReadinessPreflightError {
  return persistenceReadinessError(
    "persistence_readiness.invalid_audit_obligation_ref",
    `/audit_obligation_refs/${index}${suffix}`,
    "Persistence readiness audit obligation ref drifted.",
  );
}

function invalidRollbackRef(
  index: number,
  suffix: string,
): PersistenceReadinessPreflightError {
  return persistenceReadinessError(
    "persistence_readiness.invalid_rollback_ref",
    `/rollback_refs/${index}${suffix}`,
    "Persistence readiness rollback ref drifted.",
  );
}

function invalidSourceRef(
  index: number,
  suffix: string,
): PersistenceReadinessPreflightError {
  return persistenceReadinessError(
    "persistence_readiness.invalid_source_ref",
    `/source_refs/${index}${suffix}`,
    "Persistence readiness source ref drifted.",
  );
}

function persistenceReadinessError(
  code: PersistenceReadinessPreflightErrorCode,
  path: string,
  message: string,
): PersistenceReadinessPreflightError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPersistencePolicyGateId(value: unknown): value is PersistencePolicyGateId {
  return typeof value === "string" && gateIdSet.has(value);
}

function isPrerequisiteKind(
  value: unknown,
): value is PersistenceReadinessPrerequisiteKind {
  return typeof value === "string" && prerequisiteKindSet.has(value);
}

function isMigrationArtifactKind(
  value: unknown,
): value is PersistenceReadinessMigrationArtifactRefKind {
  return typeof value === "string" && migrationArtifactKindSet.has(value);
}

function isRequiredTestKind(
  value: unknown,
): value is PersistenceReadinessRequiredTestKind {
  return typeof value === "string" && requiredTestKindSet.has(value);
}

function isAuditEventType(
  value: unknown,
): value is PersistenceReadinessAuditObligationRefInput["required_event_type"] {
  return (
    value === "policy_checked" ||
    value === "approval_requested" ||
    value === "approval_decision_recorded" ||
    value === "operation_result_recorded" ||
    value === "rollback_recorded"
  );
}

function isRollbackKind(
  value: unknown,
): value is PersistenceReadinessRollbackRefInput["rollback_kind"] {
  return (
    value === "migration_repair_ref" ||
    value === "writer_disable_ref" ||
    value === "approval_state_reversal_ref" ||
    value === "runtime_revert_ref"
  );
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
  return /(?:DATABASE_URL|postgres:\/\/|mysql:\/\/|mongodb:\/\/|PRIVATE KEY|BEGIN [A-Z ]*KEY|gh[pous]_[A-Za-z0-9]|sk-[A-Za-z0-9]|xox[baprs]-|cloudflare_api_token)/i.test(
    value,
  );
}
