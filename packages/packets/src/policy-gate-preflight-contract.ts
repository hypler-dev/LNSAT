import {
  databaseSecurityPreflightBlockedCapabilityFlags,
  databaseSecurityPreflightContract,
  type DatabaseSecurityPreflightBlockedCapabilityFlag,
} from "./database-security-preflight-contract.js";
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
import { writerPreflightContract } from "./writer-preflight-contract.js";

export const POLICY_GATE_PREFLIGHT_CONTRACT_STATUS = "source_only";

export const policyGatePreflightTargetGate =
  "G06_POLICY_GATE" satisfies PersistencePolicyGateId;

export const policyGateOperationKinds = [
  "writer.migrate",
  "writer.create",
  "ledger.record.append",
  "approve_action",
  "configure_auth",
  "configure_integration",
  "runtime.adapter.implement",
  "os.connector.package",
] as const;

export const policyGateRiskClassificationKinds = [
  "database_or_writer_state_change",
  "approval_state_change",
  "auth_or_integration_configuration",
  "runtime_or_host_control",
] as const;

export const policyGateApprovalRequirementKinds = [
  "owner_or_admin_approval_required",
  "separate_reviewer_approval_required",
  "deployment_owner_approval_required",
  "implementation_packet_approval_required",
] as const;

export const policyGateAuditObligationKinds = [
  "policy_checked_audit_ref",
  "approval_requested_audit_ref",
  "approval_decision_audit_ref",
  "operation_result_audit_ref",
  "rollback_audit_ref",
] as const;

export const policyGateRollbackKinds = [
  "migration_repair_ref",
  "writer_disable_ref",
  "approval_state_reversal_ref",
  "auth_or_integration_disablement_ref",
  "runtime_revert_ref",
  "host_package_uninstall_ref",
] as const;

export const policyGatePreflightAdditionalBlockedCapabilityFlags = [
  "policy_gate_execution_allowed",
  "policy_decision_persistence_allowed",
  "policy_mutation_allowed",
  "approve_deny_mutation_allowed",
  "authorization_mutation_allowed",
  "approval_request_creation_allowed",
  "audit_write_allowed",
  "audit_mutation_allowed",
  "rollback_execution_allowed",
  "policy_gate_runtime_allowed",
] as const;

export const policyGatePreflightBlockedCapabilityFlags = [
  ...databaseSecurityPreflightBlockedCapabilityFlags,
  ...policyGatePreflightAdditionalBlockedCapabilityFlags,
] as const;

export const policyGatePreflightContract = {
  contract_id: "lnsat.platform.policy_gate_preflight.v0_1",
  authority: ["@lnsat/packets", "source-backed-policy-gate-preflight"],
  policy_gate_version: "0.1",
  source_docs: [
    "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
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
  target_gate: policyGatePreflightTargetGate,
  gate_ids: persistencePolicyGateIds,
  required_entity_names: persistenceSchemaEntityNames,
  operation_kinds: policyGateOperationKinds,
  risk_classification_kinds: policyGateRiskClassificationKinds,
  approval_requirement_kinds: policyGateApprovalRequirementKinds,
  audit_obligation_kinds: policyGateAuditObligationKinds,
  rollback_kinds: policyGateRollbackKinds,
  blocked_capability_flags: policyGatePreflightBlockedCapabilityFlags,
  contract_authority: "source_only_policy_gate_preflight_no_mutation",
  source_only_policy_gate_preflight_allowed: true,
  operation_policy_refs_allowed: true,
  risk_classification_refs_allowed: true,
  approval_requirement_refs_allowed: true,
  audit_obligation_refs_allowed: true,
  rollback_refs_allowed: true,
  policy_gate_execution_allowed: false,
  policy_decision_persistence_allowed: false,
  policy_mutation_allowed: false,
  approve_deny_mutation_allowed: false,
  approval_mutation_allowed: false,
  audit_write_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  writer_implementation_allowed: false,
  migration_execution_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  side_effects: [],
  status: "source_only",
} as const;

export type PolicyGateOperationKind = (typeof policyGateOperationKinds)[number];
export type PolicyGateRiskClassificationKind =
  (typeof policyGateRiskClassificationKinds)[number];
export type PolicyGateApprovalRequirementKind =
  (typeof policyGateApprovalRequirementKinds)[number];
export type PolicyGateAuditObligationKind =
  (typeof policyGateAuditObligationKinds)[number];
export type PolicyGateRollbackKind = (typeof policyGateRollbackKinds)[number];
export type PolicyGatePreflightAdditionalBlockedCapabilityFlag =
  (typeof policyGatePreflightAdditionalBlockedCapabilityFlags)[number];
export type PolicyGatePreflightBlockedCapabilityFlag =
  | DatabaseSecurityPreflightBlockedCapabilityFlag
  | PolicyGatePreflightAdditionalBlockedCapabilityFlag;

export type PolicyGateSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type PolicyGateOperationPolicyRefInput = {
  operation: PolicyGateOperationKind;
  policy_gate_ref: string;
  policy_decision_contract_ref: string;
  prerequisite_database_security_ref: string;
  current_state: "source_ref_only_no_policy_decision_persistence";
  target_gate: typeof policyGatePreflightTargetGate;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  live_execution_allowed: false;
};

export type PolicyGateRiskClassificationRefInput = {
  operation: PolicyGateOperationKind;
  risk_ref: string;
  risk_kind: PolicyGateRiskClassificationKind;
  risk_level: number;
  current_state: "source_ref_only_no_runtime_risk_engine";
  risk_mutation_allowed: false;
  external_service_call_allowed: false;
};

export type PolicyGateApprovalRequirementRefInput = {
  operation: PolicyGateOperationKind;
  approval_requirement_ref: string;
  approval_requirement_kind: PolicyGateApprovalRequirementKind;
  current_state: "source_ref_only_no_approval_request_creation";
  approval_request_creation_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
};

export type PolicyGateAuditObligationRefInput = {
  obligation_ref: string;
  obligation_kind: PolicyGateAuditObligationKind;
  required_event_type:
    | "policy_checked"
    | "approval_requested"
    | "approval_decision_recorded"
    | "operation_result_recorded"
    | "rollback_recorded";
  current_state: "source_ref_only_no_audit_write";
  audit_write_allowed: false;
  audit_mutation_allowed: false;
};

export type PolicyGateRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: PolicyGateRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  service_mutation_allowed: false;
  live_execution_allowed: false;
};

export type PolicyGateNoMutationPostureInput = {
  policy_gate_execution_allowed: false;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  settings_mutation_allowed: false;
  approval_request_creation_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  authorization_mutation_allowed: false;
  audit_write_allowed: false;
  audit_mutation_allowed: false;
  rollback_execution_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  sql_execution_allowed: false;
  ddl_execution_allowed: false;
  policy_ddl_execution_allowed: false;
  role_grant_mutation_allowed: false;
  role_grant_execution_allowed: false;
  grant_application_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
  queue_mutation_allowed: false;
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

export type PolicyGateAllowedStateInput = {
  source_only_policy_gate_preflight_allowed: true;
  operation_policy_refs_allowed: true;
  risk_classification_refs_allowed: true;
  approval_requirement_refs_allowed: true;
  audit_obligation_refs_allowed: true;
  rollback_refs_allowed: true;
  policy_gate_execution_allowed: false;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  settings_mutation_allowed: false;
  approval_request_creation_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  authorization_mutation_allowed: false;
  audit_write_allowed: false;
  audit_mutation_allowed: false;
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
  auth_session_runtime_allowed: false;
  integration_setup_write_allowed: false;
  runtime_adapter_implementation_allowed: false;
  os_connector_package_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  external_service_call_allowed: false;
  secret_posture: "references_only_no_values";
};

export type PolicyGatePreflightRequest = Partial<
  Record<PolicyGatePreflightBlockedCapabilityFlag, false>
> & {
  policy_gate_version?: typeof policyGatePreflightContract.policy_gate_version;
  gate_sequence?: PersistencePolicyGateId[];
  operation_policy_refs?: PolicyGateOperationPolicyRefInput[];
  risk_classification_refs?: PolicyGateRiskClassificationRefInput[];
  approval_requirement_refs?: PolicyGateApprovalRequirementRefInput[];
  audit_obligation_refs?: PolicyGateAuditObligationRefInput[];
  rollback_refs?: PolicyGateRollbackRefInput[];
  no_mutation_posture?: PolicyGateNoMutationPostureInput;
  source_refs?: PolicyGateSourceRefInput[];
  allowed_state?: PolicyGateAllowedStateInput;
  contract_authority?: typeof policyGatePreflightContract.contract_authority;
  side_effects?: [];
};

export type PolicyGatePreflightErrorCode =
  | "policy_gate.invalid_request"
  | "policy_gate.unexpected_field"
  | "policy_gate.invalid_version"
  | "policy_gate.gate_sequence_required"
  | "policy_gate.gate_order_drift"
  | "policy_gate.operation_policy_ref_required"
  | "policy_gate.invalid_operation_policy_ref"
  | "policy_gate.risk_classification_ref_required"
  | "policy_gate.invalid_risk_classification_ref"
  | "policy_gate.approval_requirement_ref_required"
  | "policy_gate.invalid_approval_requirement_ref"
  | "policy_gate.audit_obligation_ref_required"
  | "policy_gate.invalid_audit_obligation_ref"
  | "policy_gate.rollback_ref_required"
  | "policy_gate.invalid_rollback_ref"
  | "policy_gate.no_mutation_posture_required"
  | "policy_gate.no_mutation_posture_drift"
  | "policy_gate.source_ref_required"
  | "policy_gate.invalid_source_ref"
  | "policy_gate.allowed_state_required"
  | "policy_gate.allowed_state_drift"
  | "policy_gate.unsafe_contract_authority"
  | "policy_gate.secret_value_forbidden"
  | "policy_gate.policy_mutation_forbidden"
  | "policy_gate.approval_mutation_forbidden"
  | "policy_gate.audit_write_forbidden"
  | "policy_gate.rollback_execution_forbidden"
  | "policy_gate.connection_or_sql_forbidden"
  | "policy_gate.role_grant_forbidden"
  | "policy_gate.writer_implementation_forbidden"
  | "policy_gate.migration_execution_forbidden"
  | "policy_gate.live_execution_forbidden"
  | "policy_gate.python_runtime_requirement_forbidden"
  | "policy_gate.os_specific_binary_requirement_forbidden"
  | "policy_gate.blocked_capability_forbidden"
  | "policy_gate.side_effects_forbidden";

export type PolicyGatePreflightError = {
  code: PolicyGatePreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PolicyGatePreflightEvidence = {
  contract_id: typeof policyGatePreflightContract.contract_id;
  policy_gate_version: typeof policyGatePreflightContract.policy_gate_version;
  target_gate: typeof policyGatePreflightTargetGate;
  persistence_schema_contract_id: typeof persistenceSchemaContract.contract_id;
  migration_static_review_contract_id: typeof migrationArtifactStaticReviewContract.contract_id;
  writer_preflight_contract_id: typeof writerPreflightContract.contract_id;
  database_security_preflight_contract_id: typeof databaseSecurityPreflightContract.contract_id;
  required_gate_ids: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  operation_policy_refs: PolicyGateOperationPolicyRefInput[];
  risk_classification_refs: PolicyGateRiskClassificationRefInput[];
  approval_requirement_refs: PolicyGateApprovalRequirementRefInput[];
  audit_obligation_refs: PolicyGateAuditObligationRefInput[];
  rollback_refs: PolicyGateRollbackRefInput[];
  no_mutation_posture: PolicyGateNoMutationPostureInput;
  source_refs: string[];
  allowed_state: PolicyGateAllowedStateInput;
  blocked_capabilities: PolicyGatePreflightBlockedCapabilityFlag[];
  implementation_artifacts: [];
  policy_gate_execution_artifacts: [];
  approval_mutation_artifacts: [];
  audit_write_artifacts: [];
  policy_gate_execution_allowed: false;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  approval_mutation_allowed: false;
  audit_write_allowed: false;
  database_connection_allowed: false;
  database_write_allowed: false;
  writer_implementation_allowed: false;
  migration_execution_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  python_runtime_required: false;
  os_specific_binary_required: false;
  side_effects: [];
};

export type PolicyGatePreflightResult =
  | {
      ok: true;
      policy_gate_preflight_contract: PolicyGatePreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      policy_gate_preflight_contract: null;
      errors: PolicyGatePreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedPolicyGatePreflightRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateId[];
      operation_policy_refs: PolicyGateOperationPolicyRefInput[];
      risk_classification_refs: PolicyGateRiskClassificationRefInput[];
      approval_requirement_refs: PolicyGateApprovalRequirementRefInput[];
      audit_obligation_refs: PolicyGateAuditObligationRefInput[];
      rollback_refs: PolicyGateRollbackRefInput[];
      no_mutation_posture: PolicyGateNoMutationPostureInput;
      source_refs: string[];
      allowed_state: PolicyGateAllowedStateInput;
    }
  | {
      ok: false;
      errors: PolicyGatePreflightError[];
    };

const requestKeys = new Set([
  "policy_gate_version",
  "gate_sequence",
  "operation_policy_refs",
  "risk_classification_refs",
  "approval_requirement_refs",
  "audit_obligation_refs",
  "rollback_refs",
  "no_mutation_posture",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...policyGatePreflightBlockedCapabilityFlags,
]);

const gateIdSet = new Set<string>(persistencePolicyGateIds);
const operationKindSet = new Set<string>(policyGateOperationKinds);
const riskKindSet = new Set<string>(policyGateRiskClassificationKinds);
const approvalRequirementKindSet = new Set<string>(policyGateApprovalRequirementKinds);
const auditObligationKindSet = new Set<string>(policyGateAuditObligationKinds);
const rollbackKindSet = new Set<string>(policyGateRollbackKinds);

const defaultSourceRefs: PolicyGateSourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "Gate G06 requires source-only policy decision evidence.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "Future approval requests and audit events remain schema refs only.",
  },
  {
    source_ref: "docs/architecture/POLICY_AND_AUDIT.md",
    summary: "Policy, approval, audit, and rollback authority stays Gateway-owned.",
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
    summary: "BP-0205 migration static review prerequisite contract.",
  },
  {
    source_ref: "packages/packets/src/writer-preflight-contract.ts",
    summary: "BP-0208 writer preflight prerequisite contract.",
  },
  {
    source_ref: "packages/packets/src/database-security-preflight-contract.ts",
    summary: "BP-0209 database security prerequisite contract.",
  },
  {
    source_ref: "packages/policy/src/index.ts",
    summary: "Existing pure policy decision and approval request refs.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0210 source-only policy gate preflight packet.",
  },
];

export const defaultPolicyGateNoMutationPosture: PolicyGateNoMutationPostureInput = {
  policy_gate_execution_allowed: false,
  policy_decision_persistence_allowed: false,
  policy_mutation_allowed: false,
  settings_mutation_allowed: false,
  approval_request_creation_allowed: false,
  approval_mutation_allowed: false,
  approve_deny_mutation_allowed: false,
  authorization_mutation_allowed: false,
  audit_write_allowed: false,
  audit_mutation_allowed: false,
  rollback_execution_allowed: false,
  database_connection_allowed: false,
  database_write_allowed: false,
  sql_execution_allowed: false,
  ddl_execution_allowed: false,
  policy_ddl_execution_allowed: false,
  role_grant_mutation_allowed: false,
  role_grant_execution_allowed: false,
  grant_application_allowed: false,
  writer_implementation_allowed: false,
  migration_execution_allowed: false,
  queue_mutation_allowed: false,
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

export const defaultPolicyGateAllowedState: PolicyGateAllowedStateInput = {
  source_only_policy_gate_preflight_allowed: true,
  operation_policy_refs_allowed: true,
  risk_classification_refs_allowed: true,
  approval_requirement_refs_allowed: true,
  audit_obligation_refs_allowed: true,
  rollback_refs_allowed: true,
  policy_gate_execution_allowed: false,
  policy_decision_persistence_allowed: false,
  policy_mutation_allowed: false,
  settings_mutation_allowed: false,
  approval_request_creation_allowed: false,
  approval_mutation_allowed: false,
  approve_deny_mutation_allowed: false,
  authorization_mutation_allowed: false,
  audit_write_allowed: false,
  audit_mutation_allowed: false,
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
  auth_session_runtime_allowed: false,
  integration_setup_write_allowed: false,
  runtime_adapter_implementation_allowed: false,
  os_connector_package_allowed: false,
  live_storage_allowed: false,
  live_execution_allowed: false,
  python_runtime_required: false,
  os_specific_binary_required: false,
  external_service_call_allowed: false,
  secret_posture: "references_only_no_values",
};

export const defaultPolicyGateOperationPolicyRefs = policyGateOperationKinds.map(
  (operation): PolicyGateOperationPolicyRefInput => ({
    operation,
    policy_gate_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G06_POLICY_GATE",
    policy_decision_contract_ref: "packages/policy/src/index.ts",
    prerequisite_database_security_ref:
      "packages/packets/src/database-security-preflight-contract.ts",
    current_state: "source_ref_only_no_policy_decision_persistence",
    target_gate: policyGatePreflightTargetGate,
    policy_decision_persistence_allowed: false,
    policy_mutation_allowed: false,
    approve_deny_mutation_allowed: false,
    live_execution_allowed: false,
  }),
);

export const defaultPolicyGateRiskClassificationRefs = policyGateOperationKinds.map(
  (operation): PolicyGateRiskClassificationRefInput => ({
    operation,
    risk_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G06_POLICY_GATE",
    risk_kind: riskKindForOperation(operation),
    risk_level: riskLevelForOperation(operation),
    current_state: "source_ref_only_no_runtime_risk_engine",
    risk_mutation_allowed: false,
    external_service_call_allowed: false,
  }),
);

export const defaultPolicyGateApprovalRequirementRefs = policyGateOperationKinds.map(
  (operation): PolicyGateApprovalRequirementRefInput => ({
    operation,
    approval_requirement_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G07_APPROVAL_REQUEST",
    approval_requirement_kind: approvalRequirementForOperation(operation),
    current_state: "source_ref_only_no_approval_request_creation",
    approval_request_creation_allowed: false,
    approval_mutation_allowed: false,
    approve_deny_mutation_allowed: false,
  }),
);

export const defaultPolicyGateAuditObligationRefs: PolicyGateAuditObligationRefInput[] =
  policyGateAuditObligationKinds.map((obligationKind) => ({
    obligation_ref: "docs/architecture/POLICY_AND_AUDIT.md",
    obligation_kind: obligationKind,
    required_event_type: auditEventTypeForObligation(obligationKind),
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    audit_mutation_allowed: false,
  }));

export const defaultPolicyGateRollbackRefs: PolicyGateRollbackRefInput[] =
  policyGateRollbackKinds.map((rollbackKind) => ({
    rollback_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    rollback_kind: rollbackKind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    service_mutation_allowed: false,
    live_execution_allowed: false,
  }));

export function createPolicyGatePreflightContract(
  request: PolicyGatePreflightRequest = {},
): PolicyGatePreflightResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      policy_gate_preflight_contract: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    policy_gate_preflight_contract: {
      contract_id: policyGatePreflightContract.contract_id,
      policy_gate_version: policyGatePreflightContract.policy_gate_version,
      target_gate: policyGatePreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      migration_static_review_contract_id:
        migrationArtifactStaticReviewContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      database_security_preflight_contract_id:
        databaseSecurityPreflightContract.contract_id,
      required_gate_ids: normalized.gate_sequence,
      required_entity_names: [...persistenceSchemaEntityNames],
      operation_policy_refs: normalized.operation_policy_refs,
      risk_classification_refs: normalized.risk_classification_refs,
      approval_requirement_refs: normalized.approval_requirement_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      no_mutation_posture: normalized.no_mutation_posture,
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...policyGatePreflightBlockedCapabilityFlags],
      implementation_artifacts: [],
      policy_gate_execution_artifacts: [],
      approval_mutation_artifacts: [],
      audit_write_artifacts: [],
      policy_gate_execution_allowed: false,
      policy_decision_persistence_allowed: false,
      policy_mutation_allowed: false,
      approve_deny_mutation_allowed: false,
      approval_mutation_allowed: false,
      audit_write_allowed: false,
      database_connection_allowed: false,
      database_write_allowed: false,
      writer_implementation_allowed: false,
      migration_execution_allowed: false,
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
  request: PolicyGatePreflightRequest,
): NormalizedPolicyGatePreflightRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        policyGateError(
          "policy_gate.invalid_request",
          "",
          "Policy gate preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: PolicyGatePreflightError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        policyGateError(
          "policy_gate.unexpected_field",
          `/${key}`,
          "Unexpected policy gate preflight field.",
        ),
      );
    }
  }

  if (
    request.policy_gate_version !== undefined &&
    request.policy_gate_version !== policyGatePreflightContract.policy_gate_version
  ) {
    errors.push(
      policyGateError(
        "policy_gate.invalid_version",
        "/policy_gate_version",
        "Policy gate preflight version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !== policyGatePreflightContract.contract_authority
  ) {
    errors.push(
      policyGateError(
        "policy_gate.unsafe_contract_authority",
        "/contract_authority",
        "Policy gate preflight authority must remain source-only.",
      ),
    );
  }

  for (const flag of policyGatePreflightBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, "/side_effects", errors);

  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const operationPolicyRefs = normalizeOperationPolicyRefs(
    request.operation_policy_refs ?? defaultPolicyGateOperationPolicyRefs,
    errors,
  );
  const riskClassificationRefs = normalizeRiskClassificationRefs(
    request.risk_classification_refs ?? defaultPolicyGateRiskClassificationRefs,
    errors,
  );
  const approvalRequirementRefs = normalizeApprovalRequirementRefs(
    request.approval_requirement_refs ?? defaultPolicyGateApprovalRequirementRefs,
    errors,
  );
  const auditObligationRefs = normalizeAuditObligationRefs(
    request.audit_obligation_refs ?? defaultPolicyGateAuditObligationRefs,
    errors,
  );
  const rollbackRefs = normalizeRollbackRefs(
    request.rollback_refs ?? defaultPolicyGateRollbackRefs,
    errors,
  );
  const noMutationPosture = normalizeNoMutationPosture(
    request.no_mutation_posture ?? defaultPolicyGateNoMutationPosture,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultPolicyGateAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    gateSequence === null ||
    operationPolicyRefs === null ||
    riskClassificationRefs === null ||
    approvalRequirementRefs === null ||
    auditObligationRefs === null ||
    rollbackRefs === null ||
    noMutationPosture === null ||
    sourceRefs === null ||
    allowedState === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    gate_sequence: gateSequence,
    operation_policy_refs: operationPolicyRefs,
    risk_classification_refs: riskClassificationRefs,
    approval_requirement_refs: approvalRequirementRefs,
    audit_obligation_refs: auditObligationRefs,
    rollback_refs: rollbackRefs,
    no_mutation_posture: noMutationPosture,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.gate_sequence_required",
        "/gate_sequence",
        "Policy gate preflight requires the full persistence gate order.",
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
        policyGateError(
          "policy_gate.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate id is unsupported.",
        ),
      );
      continue;
    }
    if (seen.has(gateId) || persistencePolicyGateIds[index] !== gateId) {
      errors.push(
        policyGateError(
          "policy_gate.gate_order_drift",
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
        policyGateError(
          "policy_gate.gate_sequence_required",
          "/gate_sequence",
          "Policy gate preflight is missing a required gate id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeOperationPolicyRefs(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateOperationPolicyRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.operation_policy_ref_required",
        "/operation_policy_refs",
        "Policy gate preflight requires operation policy refs.",
      ),
    );
    return null;
  }

  const normalized: PolicyGateOperationPolicyRefInput[] = [];
  const seenOperations = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_operation_policy_ref",
          `/operation_policy_refs/${index}`,
          "Operation policy ref must be an object.",
        ),
      );
      continue;
    }

    const operation = rawRef.operation;
    if (!isPolicyGateOperationKind(operation)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_operation_policy_ref",
          `/operation_policy_refs/${index}/operation`,
          "Operation policy ref references an unsupported operation.",
        ),
      );
      continue;
    }
    seenOperations.add(operation);

    const policyGateRef = normalizeRepoRef(
      rawRef.policy_gate_ref,
      `/operation_policy_refs/${index}/policy_gate_ref`,
      "policy_gate.invalid_operation_policy_ref",
      errors,
    );
    const policyDecisionContractRef = normalizeRepoRef(
      rawRef.policy_decision_contract_ref,
      `/operation_policy_refs/${index}/policy_decision_contract_ref`,
      "policy_gate.invalid_operation_policy_ref",
      errors,
    );
    const prerequisiteDatabaseSecurityRef = normalizeRepoRef(
      rawRef.prerequisite_database_security_ref,
      `/operation_policy_refs/${index}/prerequisite_database_security_ref`,
      "policy_gate.invalid_operation_policy_ref",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_no_policy_decision_persistence") {
      errors.push(
        policyGateError(
          "policy_gate.invalid_operation_policy_ref",
          `/operation_policy_refs/${index}/current_state`,
          "Operation policy refs must remain source-only with no policy decision persistence.",
        ),
      );
    }
    if (rawRef.target_gate !== policyGatePreflightTargetGate) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_operation_policy_ref",
          `/operation_policy_refs/${index}/target_gate`,
          "Operation policy refs must target G06 policy gate.",
        ),
      );
    }
    if (rawRef.policy_decision_persistence_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "policy_decision_persistence_allowed",
          `/operation_policy_refs/${index}/policy_decision_persistence_allowed`,
        ),
      );
    }
    if (rawRef.policy_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "policy_mutation_allowed",
          `/operation_policy_refs/${index}/policy_mutation_allowed`,
        ),
      );
    }
    if (rawRef.approve_deny_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "approve_deny_mutation_allowed",
          `/operation_policy_refs/${index}/approve_deny_mutation_allowed`,
        ),
      );
    }
    if (rawRef.live_execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_execution_allowed",
          `/operation_policy_refs/${index}/live_execution_allowed`,
        ),
      );
    }

    if (
      policyGateRef === null ||
      policyDecisionContractRef === null ||
      prerequisiteDatabaseSecurityRef === null ||
      rawRef.current_state !== "source_ref_only_no_policy_decision_persistence" ||
      rawRef.target_gate !== policyGatePreflightTargetGate ||
      rawRef.policy_decision_persistence_allowed !== false ||
      rawRef.policy_mutation_allowed !== false ||
      rawRef.approve_deny_mutation_allowed !== false ||
      rawRef.live_execution_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      operation,
      policy_gate_ref: policyGateRef,
      policy_decision_contract_ref: policyDecisionContractRef,
      prerequisite_database_security_ref: prerequisiteDatabaseSecurityRef,
      current_state: "source_ref_only_no_policy_decision_persistence",
      target_gate: policyGatePreflightTargetGate,
      policy_decision_persistence_allowed: false,
      policy_mutation_allowed: false,
      approve_deny_mutation_allowed: false,
      live_execution_allowed: false,
    });
  }

  requireOperations(
    seenOperations,
    "policy_gate.operation_policy_ref_required",
    "/operation_policy_refs",
    "Policy gate preflight is missing a required operation policy ref.",
    errors,
  );

  return normalized;
}

function normalizeRiskClassificationRefs(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateRiskClassificationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.risk_classification_ref_required",
        "/risk_classification_refs",
        "Policy gate preflight requires risk classification refs.",
      ),
    );
    return null;
  }

  const normalized: PolicyGateRiskClassificationRefInput[] = [];
  const seenOperations = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_risk_classification_ref",
          `/risk_classification_refs/${index}`,
          "Risk classification ref must be an object.",
        ),
      );
      continue;
    }

    const operation = rawRef.operation;
    if (!isPolicyGateOperationKind(operation)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_risk_classification_ref",
          `/risk_classification_refs/${index}/operation`,
          "Risk classification operation is unsupported.",
        ),
      );
      continue;
    }
    seenOperations.add(operation);

    const riskRef = normalizeRepoRef(
      rawRef.risk_ref,
      `/risk_classification_refs/${index}/risk_ref`,
      "policy_gate.invalid_risk_classification_ref",
      errors,
    );

    if (!isPolicyGateRiskClassificationKind(rawRef.risk_kind)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_risk_classification_ref",
          `/risk_classification_refs/${index}/risk_kind`,
          "Risk classification kind is unsupported.",
        ),
      );
    }
    if (
      typeof rawRef.risk_level !== "number" ||
      !Number.isInteger(rawRef.risk_level) ||
      rawRef.risk_level < 0 ||
      rawRef.risk_level > 10
    ) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_risk_classification_ref",
          `/risk_classification_refs/${index}/risk_level`,
          "Risk level must be an integer from 0 through 10.",
        ),
      );
    }
    if (rawRef.current_state !== "source_ref_only_no_runtime_risk_engine") {
      errors.push(
        policyGateError(
          "policy_gate.invalid_risk_classification_ref",
          `/risk_classification_refs/${index}/current_state`,
          "Risk refs must remain source-only with no runtime risk engine.",
        ),
      );
    }
    if (rawRef.risk_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "policy_mutation_allowed",
          `/risk_classification_refs/${index}/risk_mutation_allowed`,
        ),
      );
    }
    if (rawRef.external_service_call_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "external_service_call_allowed",
          `/risk_classification_refs/${index}/external_service_call_allowed`,
        ),
      );
    }

    if (
      riskRef === null ||
      !isPolicyGateRiskClassificationKind(rawRef.risk_kind) ||
      typeof rawRef.risk_level !== "number" ||
      !Number.isInteger(rawRef.risk_level) ||
      rawRef.risk_level < 0 ||
      rawRef.risk_level > 10 ||
      rawRef.current_state !== "source_ref_only_no_runtime_risk_engine" ||
      rawRef.risk_mutation_allowed !== false ||
      rawRef.external_service_call_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      operation,
      risk_ref: riskRef,
      risk_kind: rawRef.risk_kind,
      risk_level: rawRef.risk_level,
      current_state: "source_ref_only_no_runtime_risk_engine",
      risk_mutation_allowed: false,
      external_service_call_allowed: false,
    });
  }

  requireOperations(
    seenOperations,
    "policy_gate.risk_classification_ref_required",
    "/risk_classification_refs",
    "Policy gate preflight is missing a required risk classification ref.",
    errors,
  );

  return normalized;
}

function normalizeApprovalRequirementRefs(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateApprovalRequirementRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.approval_requirement_ref_required",
        "/approval_requirement_refs",
        "Policy gate preflight requires approval requirement refs.",
      ),
    );
    return null;
  }

  const normalized: PolicyGateApprovalRequirementRefInput[] = [];
  const seenOperations = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_approval_requirement_ref",
          `/approval_requirement_refs/${index}`,
          "Approval requirement ref must be an object.",
        ),
      );
      continue;
    }

    const operation = rawRef.operation;
    if (!isPolicyGateOperationKind(operation)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_approval_requirement_ref",
          `/approval_requirement_refs/${index}/operation`,
          "Approval requirement operation is unsupported.",
        ),
      );
      continue;
    }
    seenOperations.add(operation);

    const approvalRequirementRef = normalizeRepoRef(
      rawRef.approval_requirement_ref,
      `/approval_requirement_refs/${index}/approval_requirement_ref`,
      "policy_gate.invalid_approval_requirement_ref",
      errors,
    );

    if (!isPolicyGateApprovalRequirementKind(rawRef.approval_requirement_kind)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_approval_requirement_ref",
          `/approval_requirement_refs/${index}/approval_requirement_kind`,
          "Approval requirement kind is unsupported.",
        ),
      );
    }
    if (rawRef.current_state !== "source_ref_only_no_approval_request_creation") {
      errors.push(
        policyGateError(
          "policy_gate.invalid_approval_requirement_ref",
          `/approval_requirement_refs/${index}/current_state`,
          "Approval requirement refs must not create approval requests.",
        ),
      );
    }
    if (rawRef.approval_request_creation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "approval_request_creation_allowed",
          `/approval_requirement_refs/${index}/approval_request_creation_allowed`,
        ),
      );
    }
    if (rawRef.approval_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "approval_mutation_allowed",
          `/approval_requirement_refs/${index}/approval_mutation_allowed`,
        ),
      );
    }
    if (rawRef.approve_deny_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "approve_deny_mutation_allowed",
          `/approval_requirement_refs/${index}/approve_deny_mutation_allowed`,
        ),
      );
    }

    if (
      approvalRequirementRef === null ||
      !isPolicyGateApprovalRequirementKind(rawRef.approval_requirement_kind) ||
      rawRef.current_state !== "source_ref_only_no_approval_request_creation" ||
      rawRef.approval_request_creation_allowed !== false ||
      rawRef.approval_mutation_allowed !== false ||
      rawRef.approve_deny_mutation_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      operation,
      approval_requirement_ref: approvalRequirementRef,
      approval_requirement_kind: rawRef.approval_requirement_kind,
      current_state: "source_ref_only_no_approval_request_creation",
      approval_request_creation_allowed: false,
      approval_mutation_allowed: false,
      approve_deny_mutation_allowed: false,
    });
  }

  requireOperations(
    seenOperations,
    "policy_gate.approval_requirement_ref_required",
    "/approval_requirement_refs",
    "Policy gate preflight is missing a required approval requirement ref.",
    errors,
  );

  return normalized;
}

function normalizeAuditObligationRefs(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateAuditObligationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.audit_obligation_ref_required",
        "/audit_obligation_refs",
        "Policy gate preflight requires audit obligation refs.",
      ),
    );
    return null;
  }

  const normalized: PolicyGateAuditObligationRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}`,
          "Audit obligation ref must be an object.",
        ),
      );
      continue;
    }

    const obligationKind = rawRef.obligation_kind;
    if (!isPolicyGateAuditObligationKind(obligationKind)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}/obligation_kind`,
          "Audit obligation kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(obligationKind);

    const obligationRef = normalizeRepoRef(
      rawRef.obligation_ref,
      `/audit_obligation_refs/${index}/obligation_ref`,
      "policy_gate.invalid_audit_obligation_ref",
      errors,
    );
    const requiredEventType = auditEventTypeForObligation(obligationKind);

    if (rawRef.required_event_type !== requiredEventType) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}/required_event_type`,
          "Audit obligation event type does not match the obligation kind.",
        ),
      );
    }
    if (rawRef.current_state !== "source_ref_only_no_audit_write") {
      errors.push(
        policyGateError(
          "policy_gate.invalid_audit_obligation_ref",
          `/audit_obligation_refs/${index}/current_state`,
          "Audit obligation refs must not write audit events.",
        ),
      );
    }
    if (rawRef.audit_write_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "audit_write_allowed",
          `/audit_obligation_refs/${index}/audit_write_allowed`,
        ),
      );
    }
    if (rawRef.audit_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "audit_mutation_allowed",
          `/audit_obligation_refs/${index}/audit_mutation_allowed`,
        ),
      );
    }

    if (
      obligationRef === null ||
      rawRef.required_event_type !== requiredEventType ||
      rawRef.current_state !== "source_ref_only_no_audit_write" ||
      rawRef.audit_write_allowed !== false ||
      rawRef.audit_mutation_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      obligation_ref: obligationRef,
      obligation_kind: obligationKind,
      required_event_type: requiredEventType,
      current_state: "source_ref_only_no_audit_write",
      audit_write_allowed: false,
      audit_mutation_allowed: false,
    });
  }

  for (const requiredKind of policyGateAuditObligationKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        policyGateError(
          "policy_gate.audit_obligation_ref_required",
          "/audit_obligation_refs",
          "Policy gate preflight is missing a required audit obligation ref.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateRollbackRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.rollback_ref_required",
        "/rollback_refs",
        "Policy gate preflight requires rollback refs.",
      ),
    );
    return null;
  }

  const normalized: PolicyGateRollbackRefInput[] = [];
  const seenKinds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_rollback_ref",
          `/rollback_refs/${index}`,
          "Rollback ref must be an object.",
        ),
      );
      continue;
    }

    const rollbackKind = rawRef.rollback_kind;
    if (!isPolicyGateRollbackKind(rollbackKind)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_rollback_ref",
          `/rollback_refs/${index}/rollback_kind`,
          "Rollback kind is unsupported.",
        ),
      );
      continue;
    }
    seenKinds.add(rollbackKind);

    const rollbackRef = normalizeRepoRef(
      rawRef.rollback_ref,
      `/rollback_refs/${index}/rollback_ref`,
      "policy_gate.invalid_rollback_ref",
      errors,
    );

    if (rawRef.current_state !== "source_ref_only_no_rollback_execution") {
      errors.push(
        policyGateError(
          "policy_gate.invalid_rollback_ref",
          `/rollback_refs/${index}/current_state`,
          "Rollback refs must not execute rollback.",
        ),
      );
    }
    if (rawRef.rollback_execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "rollback_execution_allowed",
          `/rollback_refs/${index}/rollback_execution_allowed`,
        ),
      );
    }
    if (rawRef.service_mutation_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "service_mutation_allowed",
          `/rollback_refs/${index}/service_mutation_allowed`,
        ),
      );
    }
    if (rawRef.live_execution_allowed !== false) {
      errors.push(
        blockedCapabilityError(
          "live_execution_allowed",
          `/rollback_refs/${index}/live_execution_allowed`,
        ),
      );
    }

    if (
      rollbackRef === null ||
      rawRef.current_state !== "source_ref_only_no_rollback_execution" ||
      rawRef.rollback_execution_allowed !== false ||
      rawRef.service_mutation_allowed !== false ||
      rawRef.live_execution_allowed !== false
    ) {
      continue;
    }

    normalized.push({
      rollback_ref: rollbackRef,
      rollback_kind: rollbackKind,
      current_state: "source_ref_only_no_rollback_execution",
      rollback_execution_allowed: false,
      service_mutation_allowed: false,
      live_execution_allowed: false,
    });
  }

  for (const requiredKind of policyGateRollbackKinds) {
    if (!seenKinds.has(requiredKind)) {
      errors.push(
        policyGateError(
          "policy_gate.rollback_ref_required",
          "/rollback_refs",
          "Policy gate preflight is missing a required rollback ref.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeNoMutationPosture(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateNoMutationPostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      policyGateError(
        "policy_gate.no_mutation_posture_required",
        "/no_mutation_posture",
        "Policy gate preflight requires no-mutation posture.",
      ),
    );
    return null;
  }

  const requiredFalseFields = Object.keys(
    defaultPolicyGateNoMutationPosture,
  ) as (keyof PolicyGateNoMutationPostureInput)[];

  let valid = true;
  for (const field of requiredFalseFields) {
    if (value[field] !== false) {
      errors.push(blockedCapabilityError(field, `/no_mutation_posture/${field}`));
      valid = false;
    }
  }

  if (!valid) {
    return null;
  }

  return { ...defaultPolicyGateNoMutationPosture };
}

function normalizeSourceRefs(
  value: unknown,
  errors: PolicyGatePreflightError[],
): string[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      policyGateError(
        "policy_gate.source_ref_required",
        "/source_refs",
        "Policy gate preflight requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        policyGateError(
          "policy_gate.invalid_source_ref",
          `/source_refs/${index}`,
          "Source ref must be an object.",
        ),
      );
      continue;
    }

    const sourceRef = normalizeRepoRef(
      rawRef.source_ref,
      `/source_refs/${index}/source_ref`,
      "policy_gate.invalid_source_ref",
      errors,
    );
    const summary = normalizeSafeSummary(
      rawRef.summary,
      `/source_refs/${index}/summary`,
      "policy_gate.invalid_source_ref",
      errors,
    );

    if (sourceRef !== null && summary !== null) {
      normalized.push(sourceRef);
    }
  }

  if (normalized.length === 0) {
    errors.push(
      policyGateError(
        "policy_gate.source_ref_required",
        "/source_refs",
        "Policy gate preflight needs at least one valid source ref.",
      ),
    );
    return null;
  }

  return [...new Set(normalized)];
}

function normalizeAllowedState(
  value: unknown,
  errors: PolicyGatePreflightError[],
): PolicyGateAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      policyGateError(
        "policy_gate.allowed_state_required",
        "/allowed_state",
        "Policy gate preflight requires allowed state evidence.",
      ),
    );
    return null;
  }

  const requiredTrueFields = [
    "source_only_policy_gate_preflight_allowed",
    "operation_policy_refs_allowed",
    "risk_classification_refs_allowed",
    "approval_requirement_refs_allowed",
    "audit_obligation_refs_allowed",
    "rollback_refs_allowed",
  ] as const;
  const requiredFalseFields = [
    "policy_gate_execution_allowed",
    "policy_decision_persistence_allowed",
    "policy_mutation_allowed",
    "settings_mutation_allowed",
    "approval_request_creation_allowed",
    "approval_mutation_allowed",
    "approve_deny_mutation_allowed",
    "authorization_mutation_allowed",
    "audit_write_allowed",
    "audit_mutation_allowed",
    "rollback_execution_allowed",
    "database_connection_allowed",
    "database_write_allowed",
    "sql_execution_allowed",
    "ddl_execution_allowed",
    "role_grant_mutation_allowed",
    "role_grant_execution_allowed",
    "grant_application_allowed",
    "writer_implementation_allowed",
    "migration_execution_allowed",
    "queue_mutation_allowed",
    "auth_session_runtime_allowed",
    "integration_setup_write_allowed",
    "runtime_adapter_implementation_allowed",
    "os_connector_package_allowed",
    "live_storage_allowed",
    "live_execution_allowed",
    "python_runtime_required",
    "os_specific_binary_required",
    "external_service_call_allowed",
  ] as const;

  let valid = true;
  for (const field of requiredTrueFields) {
    if (value[field] !== true) {
      errors.push(
        policyGateError(
          "policy_gate.allowed_state_drift",
          `/allowed_state/${field}`,
          "Policy gate source-only evidence must stay enabled.",
        ),
      );
      valid = false;
    }
  }

  for (const field of requiredFalseFields) {
    if (value[field] !== false) {
      errors.push(blockedCapabilityError(field, `/allowed_state/${field}`));
      valid = false;
    }
  }

  if (value.secret_posture !== "references_only_no_values") {
    errors.push(
      policyGateError(
        "policy_gate.secret_value_forbidden",
        "/allowed_state/secret_posture",
        "Policy gate preflight stores only secret references, never values.",
      ),
    );
    valid = false;
  }

  if (!valid) {
    return null;
  }

  return { ...defaultPolicyGateAllowedState };
}

function requireOperations(
  seenOperations: Set<string>,
  code: PolicyGatePreflightErrorCode,
  path: string,
  message: string,
  errors: PolicyGatePreflightError[],
): void {
  for (const operation of policyGateOperationKinds) {
    if (!seenOperations.has(operation)) {
      errors.push(policyGateError(code, path, message));
    }
  }
}

function riskKindForOperation(
  operation: PolicyGateOperationKind,
): PolicyGateRiskClassificationKind {
  if (operation === "approve_action") {
    return "approval_state_change";
  }
  if (operation === "configure_auth" || operation === "configure_integration") {
    return "auth_or_integration_configuration";
  }
  if (
    operation === "runtime.adapter.implement" ||
    operation === "os.connector.package"
  ) {
    return "runtime_or_host_control";
  }
  return "database_or_writer_state_change";
}

function riskLevelForOperation(operation: PolicyGateOperationKind): number {
  if (
    operation === "runtime.adapter.implement" ||
    operation === "os.connector.package"
  ) {
    return 9;
  }
  if (operation === "configure_auth" || operation === "configure_integration") {
    return 8;
  }
  if (operation === "approve_action") {
    return 7;
  }
  return 6;
}

function approvalRequirementForOperation(
  operation: PolicyGateOperationKind,
): PolicyGateApprovalRequirementKind {
  if (operation === "approve_action") {
    return "separate_reviewer_approval_required";
  }
  if (operation === "configure_auth" || operation === "configure_integration") {
    return "deployment_owner_approval_required";
  }
  if (
    operation === "runtime.adapter.implement" ||
    operation === "os.connector.package"
  ) {
    return "implementation_packet_approval_required";
  }
  return "owner_or_admin_approval_required";
}

function auditEventTypeForObligation(
  obligationKind: PolicyGateAuditObligationKind,
): PolicyGateAuditObligationRefInput["required_event_type"] {
  if (obligationKind === "approval_requested_audit_ref") {
    return "approval_requested";
  }
  if (obligationKind === "approval_decision_audit_ref") {
    return "approval_decision_recorded";
  }
  if (obligationKind === "operation_result_audit_ref") {
    return "operation_result_recorded";
  }
  if (obligationKind === "rollback_audit_ref") {
    return "rollback_recorded";
  }
  return "policy_checked";
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  fallbackCode: PolicyGatePreflightErrorCode,
  errors: PolicyGatePreflightError[],
): string | null {
  if (typeof value !== "string" || !isSafeRepoPath(value)) {
    errors.push(
      policyGateError(
        fallbackCode,
        path,
        "Reference must be a safe repo-local source path.",
      ),
    );
    return null;
  }

  const forbiddenCode = forbiddenContentCode(value);
  if (forbiddenCode !== null) {
    errors.push(
      policyGateError(
        forbiddenCode,
        path,
        "Reference contains blocked policy, approval, DB, SQL, or secret-like content.",
      ),
    );
    return null;
  }

  return value;
}

function normalizeSafeSummary(
  value: unknown,
  path: string,
  fallbackCode: PolicyGatePreflightErrorCode,
  errors: PolicyGatePreflightError[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(policyGateError(fallbackCode, path, "Summary must be nonempty."));
    return null;
  }

  const forbiddenCode = forbiddenContentCode(value);
  if (forbiddenCode !== null) {
    errors.push(
      policyGateError(
        forbiddenCode,
        path,
        "Summary contains blocked policy, approval, DB, SQL, or secret-like content.",
      ),
    );
    return null;
  }

  return value.trim();
}

function validateSideEffects(
  sideEffects: unknown,
  path: string,
  errors: PolicyGatePreflightError[],
): void {
  if (sideEffects === undefined) {
    return;
  }

  if (!Array.isArray(sideEffects) || sideEffects.length > 0) {
    errors.push(
      policyGateError(
        "policy_gate.side_effects_forbidden",
        path,
        "Policy gate preflight must not produce side effects.",
      ),
    );
  }
}

function blockedCapabilityError(flag: string, path: string): PolicyGatePreflightError {
  if (flag === "python_runtime_required") {
    return policyGateError(
      "policy_gate.python_runtime_requirement_forbidden",
      path,
      "Python runtime is not required by core MVP policy gate evidence.",
    );
  }
  if (flag === "os_specific_binary_required") {
    return policyGateError(
      "policy_gate.os_specific_binary_requirement_forbidden",
      path,
      "OS-specific binary is not required by core MVP policy gate evidence.",
    );
  }
  if (
    flag.includes("policy") ||
    flag.includes("settings") ||
    flag.includes("authorization")
  ) {
    return policyGateError(
      "policy_gate.policy_mutation_forbidden",
      path,
      "Policy, settings, authorization, and policy gate execution behavior remains blocked.",
    );
  }
  if (flag.includes("approval") || flag.includes("approve")) {
    return policyGateError(
      "policy_gate.approval_mutation_forbidden",
      path,
      "Approval request creation and approve/deny mutation remains blocked.",
    );
  }
  if (flag.includes("audit") || flag.includes("ledger")) {
    return policyGateError(
      "policy_gate.audit_write_forbidden",
      path,
      "Audit write and audit mutation remains blocked.",
    );
  }
  if (flag.includes("rollback")) {
    return policyGateError(
      "policy_gate.rollback_execution_forbidden",
      path,
      "Rollback execution remains blocked.",
    );
  }
  if (
    flag.includes("database") ||
    flag.includes("connection") ||
    flag.includes("sql") ||
    flag.includes("ddl")
  ) {
    return policyGateError(
      "policy_gate.connection_or_sql_forbidden",
      path,
      "Database, SQL, DDL, and connection behavior remains blocked.",
    );
  }
  if (
    flag.includes("role") ||
    flag.includes("grant") ||
    flag.includes("superuser") ||
    flag.includes("bypass_rls")
  ) {
    return policyGateError(
      "policy_gate.role_grant_forbidden",
      path,
      "Role, grant, superuser, and bypass RLS behavior remains blocked.",
    );
  }
  if (flag.includes("writer") || flag.includes("idempotency")) {
    return policyGateError(
      "policy_gate.writer_implementation_forbidden",
      path,
      "Writer implementation behavior remains blocked.",
    );
  }
  if (flag.includes("migration") || flag.includes("runner")) {
    return policyGateError(
      "policy_gate.migration_execution_forbidden",
      path,
      "Migration execution behavior remains blocked.",
    );
  }
  if (flag.includes("external_service")) {
    return policyGateError(
      "policy_gate.blocked_capability_forbidden",
      path,
      "External service calls remain blocked.",
    );
  }
  if (
    flag.includes("live") ||
    flag.includes("runtime") ||
    flag.includes("queue") ||
    flag.includes("deploy") ||
    flag.includes("git") ||
    flag.includes("docker") ||
    flag.includes("node_agent") ||
    flag.includes("ssh") ||
    flag.includes("root") ||
    flag.includes("service") ||
    flag.includes("package")
  ) {
    return policyGateError(
      "policy_gate.live_execution_forbidden",
      path,
      "Live, runtime, queue, deploy, Git, host, and service behavior remains blocked.",
    );
  }

  return policyGateError(
    "policy_gate.blocked_capability_forbidden",
    path,
    "Blocked capability remains closed.",
  );
}

function policyGateError(
  code: PolicyGatePreflightErrorCode,
  path: string,
  message: string,
): PolicyGatePreflightError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersistencePolicyGateId(value: unknown): value is PersistencePolicyGateId {
  return typeof value === "string" && gateIdSet.has(value);
}

function isPolicyGateOperationKind(value: unknown): value is PolicyGateOperationKind {
  return typeof value === "string" && operationKindSet.has(value);
}

function isPolicyGateRiskClassificationKind(
  value: unknown,
): value is PolicyGateRiskClassificationKind {
  return typeof value === "string" && riskKindSet.has(value);
}

function isPolicyGateApprovalRequirementKind(
  value: unknown,
): value is PolicyGateApprovalRequirementKind {
  return typeof value === "string" && approvalRequirementKindSet.has(value);
}

function isPolicyGateAuditObligationKind(
  value: unknown,
): value is PolicyGateAuditObligationKind {
  return typeof value === "string" && auditObligationKindSet.has(value);
}

function isPolicyGateRollbackKind(value: unknown): value is PolicyGateRollbackKind {
  return typeof value === "string" && rollbackKindSet.has(value);
}

function isSafeRepoPath(value: string): boolean {
  if (value.length === 0 || value.length > 220) {
    return false;
  }
  if (
    value.startsWith("/") ||
    value.includes("..") ||
    value.includes("\0") ||
    value.includes("://")
  ) {
    return false;
  }
  return /^[A-Za-z0-9._/@#-]+$/.test(value);
}

function forbiddenContentCode(value: string): PolicyGatePreflightErrorCode | null {
  if (
    /\b(DATABASE_URL|connection_string)\b|postgres(?:ql)?:\/\/|mysql:\/\/|sqlite:\/\/|password=/i.test(
      value,
    )
  ) {
    return "policy_gate.connection_or_sql_forbidden";
  }
  if (/\b(secret|api[_-]?key|token|private[_-]?key)\b|sk-[A-Za-z0-9]/i.test(value)) {
    return "policy_gate.secret_value_forbidden";
  }
  if (
    /\b(create\s+role|alter\s+role|grant\s+|revoke\s+|create\s+policy|alter\s+policy|drop\s+policy|bypassrls|superuser|psql\s|sql`)\b/i.test(
      value,
    )
  ) {
    return "policy_gate.role_grant_forbidden";
  }
  if (
    /\b(policy\s+mutation|mutate\s+policy|settings\s+mutation|approve\s+now|deny\s+now|persist\s+approval|write\s+audit|append\s+audit|execute\s+rollback|runtime\s+dispatch|live\s+execution)\b/i.test(
      value,
    )
  ) {
    return "policy_gate.policy_mutation_forbidden";
  }
  return null;
}
