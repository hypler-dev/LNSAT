import {
  policyGateAuditObligationKinds,
  policyGateOperationKinds,
  policyGatePreflightBlockedCapabilityFlags,
  policyGatePreflightContract,
  policyGatePreflightTargetGate,
  policyGateRollbackKinds,
  type PolicyGateAuditObligationKind,
  type PolicyGateOperationKind,
  type PolicyGatePreflightBlockedCapabilityFlag,
  type PolicyGateRollbackKind,
} from "./policy-gate-preflight-contract.js";
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
import { databaseSecurityPreflightContract } from "./database-security-preflight-contract.js";

export const APPROVAL_REQUEST_PREFLIGHT_CONTRACT_STATUS = "source_only";

export const approvalRequestPreflightTargetGate =
  "G07_APPROVAL_REQUEST" satisfies PersistencePolicyGateId;

export const approvalRequestRefKinds = [
  "policy_decision_link_ref",
  "human_request_payload_ref",
  "source_evidence_bundle_ref",
  "approval_lifecycle_state_ref",
] as const;

export const approvalRequestApproverScopeKinds = [
  "owner_or_admin_scope_ref",
  "separate_reviewer_scope_ref",
  "deployment_owner_scope_ref",
  "implementation_packet_reviewer_scope_ref",
] as const;

export const approvalRequestDecisionReasonKinds = [
  "approve_reason_code_ref",
  "deny_reason_code_ref",
  "requires_changes_reason_code_ref",
  "withdraw_or_expire_reason_code_ref",
] as const;

export const approvalRequestPreflightAdditionalBlockedCapabilityFlags = [
  "approval_request_preflight_execution_allowed",
  "approval_request_creation_allowed",
  "approval_request_persistence_allowed",
  "approval_decision_persistence_allowed",
  "approval_state_transition_allowed",
  "approval_mutation_allowed",
  "approve_deny_mutation_allowed",
  "decision_reason_mutation_allowed",
  "approver_scope_mutation_allowed",
  "approval_runtime_allowed",
] as const;

export const approvalRequestPreflightBlockedCapabilityFlags = [
  ...policyGatePreflightBlockedCapabilityFlags,
  ...approvalRequestPreflightAdditionalBlockedCapabilityFlags,
] as const;

export const approvalRequestPreflightContract = {
  contract_id: "lnsat.platform.approval_request_preflight.v0_1",
  authority: ["@lnsat/packets", "source-backed-approval-request-preflight"],
  approval_request_version: "0.1",
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
  writer_preflight_contract_id: writerPreflightContract.contract_id,
  database_security_preflight_contract_id:
    databaseSecurityPreflightContract.contract_id,
  policy_gate_preflight_contract_id: policyGatePreflightContract.contract_id,
  policy_gate_target_gate: policyGatePreflightTargetGate,
  target_gate: approvalRequestPreflightTargetGate,
  gate_ids: persistencePolicyGateIds,
  required_entity_names: persistenceSchemaEntityNames,
  approval_request_ref_kinds: approvalRequestRefKinds,
  approver_scope_kinds: approvalRequestApproverScopeKinds,
  decision_reason_kinds: approvalRequestDecisionReasonKinds,
  operation_kinds: policyGateOperationKinds,
  audit_obligation_kinds: policyGateAuditObligationKinds,
  rollback_kinds: policyGateRollbackKinds,
  blocked_capability_flags: approvalRequestPreflightBlockedCapabilityFlags,
  contract_authority: "source_only_approval_request_preflight_no_mutation",
  source_only_approval_request_preflight_allowed: true,
  approval_request_refs_allowed: true,
  approver_scope_refs_allowed: true,
  decision_reason_refs_allowed: true,
  policy_gate_refs_allowed: true,
  audit_obligation_refs_allowed: true,
  rollback_refs_allowed: true,
  approval_request_creation_allowed: false,
  approval_request_persistence_allowed: false,
  approval_decision_persistence_allowed: false,
  approval_state_transition_allowed: false,
  approval_mutation_allowed: false,
  approve_deny_mutation_allowed: false,
  policy_mutation_allowed: false,
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

export type ApprovalRequestRefKind = (typeof approvalRequestRefKinds)[number];
export type ApprovalRequestApproverScopeKind =
  (typeof approvalRequestApproverScopeKinds)[number];
export type ApprovalRequestDecisionReasonKind =
  (typeof approvalRequestDecisionReasonKinds)[number];
export type ApprovalRequestPreflightAdditionalBlockedCapabilityFlag =
  (typeof approvalRequestPreflightAdditionalBlockedCapabilityFlags)[number];
export type ApprovalRequestPreflightBlockedCapabilityFlag =
  | PolicyGatePreflightBlockedCapabilityFlag
  | ApprovalRequestPreflightAdditionalBlockedCapabilityFlag;

export type ApprovalRequestSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type ApprovalRequestRefInput = {
  request_ref: string;
  request_kind: ApprovalRequestRefKind;
  policy_gate_ref: string;
  current_state: "source_ref_only_no_approval_request_creation";
  target_gate: typeof approvalRequestPreflightTargetGate;
  approval_request_creation_allowed: false;
  approval_request_persistence_allowed: false;
  approval_mutation_allowed: false;
};

export type ApprovalRequestApproverScopeRefInput = {
  scope_ref: string;
  scope_kind: ApprovalRequestApproverScopeKind;
  summary: string;
  current_state: "source_ref_only_no_approver_scope_mutation";
  approver_scope_mutation_allowed: false;
  authorization_mutation_allowed: false;
  external_service_call_allowed: false;
};

export type ApprovalRequestDecisionReasonRefInput = {
  reason_ref: string;
  reason_kind: ApprovalRequestDecisionReasonKind;
  stable_reason_code_required: true;
  current_state: "source_ref_only_no_decision_mutation";
  decision_reason_mutation_allowed: false;
  approval_decision_persistence_allowed: false;
  approve_deny_mutation_allowed: false;
};

export type ApprovalRequestPolicyGateRefInput = {
  operation: PolicyGateOperationKind;
  policy_gate_ref: string;
  policy_gate_preflight_ref: string;
  approval_requirement_ref: string;
  current_state: "source_ref_only_policy_gate_prerequisite";
  policy_gate_target: typeof policyGatePreflightTargetGate;
  approval_request_target: typeof approvalRequestPreflightTargetGate;
  policy_gate_execution_allowed: false;
  approval_request_creation_allowed: false;
  policy_decision_persistence_allowed: false;
};

export type ApprovalRequestAuditObligationRefInput = {
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

export type ApprovalRequestRollbackRefInput = {
  rollback_ref: string;
  rollback_kind: PolicyGateRollbackKind;
  current_state: "source_ref_only_no_rollback_execution";
  rollback_execution_allowed: false;
  service_mutation_allowed: false;
  live_execution_allowed: false;
};

export type ApprovalRequestNoMutationPostureInput = {
  approval_request_preflight_execution_allowed: false;
  approval_request_creation_allowed: false;
  approval_request_persistence_allowed: false;
  approval_decision_persistence_allowed: false;
  approval_state_transition_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  decision_reason_mutation_allowed: false;
  approver_scope_mutation_allowed: false;
  policy_gate_execution_allowed: false;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  settings_mutation_allowed: false;
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
  runtime_dispatcher_allowed: false;
  runtime_adapter_implementation_allowed: false;
  os_connector_package_allowed: false;
  live_storage_allowed: false;
  live_execution_allowed: false;
  external_service_call_allowed: false;
  environment_secret_lookup_allowed: false;
};

export type ApprovalRequestAllowedStateInput = {
  source_only_approval_request_preflight_allowed: true;
  approval_request_refs_allowed: true;
  approver_scope_refs_allowed: true;
  decision_reason_refs_allowed: true;
  policy_gate_refs_allowed: true;
  audit_obligation_refs_allowed: true;
  rollback_refs_allowed: true;
  approval_request_creation_allowed: false;
  approval_request_persistence_allowed: false;
  approval_decision_persistence_allowed: false;
  approval_state_transition_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  decision_reason_mutation_allowed: false;
  approver_scope_mutation_allowed: false;
  policy_gate_execution_allowed: false;
  policy_decision_persistence_allowed: false;
  policy_mutation_allowed: false;
  settings_mutation_allowed: false;
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

export type ApprovalRequestPreflightRequest = Partial<
  Record<ApprovalRequestPreflightBlockedCapabilityFlag, false>
> & {
  approval_request_version?: typeof approvalRequestPreflightContract.approval_request_version;
  gate_sequence?: PersistencePolicyGateId[];
  approval_request_refs?: ApprovalRequestRefInput[];
  approver_scope_refs?: ApprovalRequestApproverScopeRefInput[];
  decision_reason_refs?: ApprovalRequestDecisionReasonRefInput[];
  policy_gate_refs?: ApprovalRequestPolicyGateRefInput[];
  audit_obligation_refs?: ApprovalRequestAuditObligationRefInput[];
  rollback_refs?: ApprovalRequestRollbackRefInput[];
  no_approval_mutation_posture?: ApprovalRequestNoMutationPostureInput;
  source_refs?: ApprovalRequestSourceRefInput[];
  allowed_state?: ApprovalRequestAllowedStateInput;
  contract_authority?: typeof approvalRequestPreflightContract.contract_authority;
  side_effects?: [];
};

export type ApprovalRequestPreflightErrorCode =
  | "approval_request.invalid_request"
  | "approval_request.unexpected_field"
  | "approval_request.invalid_version"
  | "approval_request.gate_sequence_required"
  | "approval_request.gate_order_drift"
  | "approval_request.approval_request_ref_required"
  | "approval_request.invalid_approval_request_ref"
  | "approval_request.approver_scope_ref_required"
  | "approval_request.invalid_approver_scope_ref"
  | "approval_request.decision_reason_ref_required"
  | "approval_request.invalid_decision_reason_ref"
  | "approval_request.policy_gate_ref_required"
  | "approval_request.invalid_policy_gate_ref"
  | "approval_request.audit_obligation_ref_required"
  | "approval_request.invalid_audit_obligation_ref"
  | "approval_request.rollback_ref_required"
  | "approval_request.invalid_rollback_ref"
  | "approval_request.no_mutation_posture_required"
  | "approval_request.no_mutation_posture_drift"
  | "approval_request.source_ref_required"
  | "approval_request.invalid_source_ref"
  | "approval_request.allowed_state_required"
  | "approval_request.allowed_state_drift"
  | "approval_request.unsafe_contract_authority"
  | "approval_request.secret_value_forbidden"
  | "approval_request.approval_mutation_forbidden"
  | "approval_request.policy_mutation_forbidden"
  | "approval_request.audit_write_forbidden"
  | "approval_request.rollback_execution_forbidden"
  | "approval_request.connection_or_sql_forbidden"
  | "approval_request.role_grant_forbidden"
  | "approval_request.writer_implementation_forbidden"
  | "approval_request.migration_execution_forbidden"
  | "approval_request.live_execution_forbidden"
  | "approval_request.python_runtime_requirement_forbidden"
  | "approval_request.os_specific_binary_requirement_forbidden"
  | "approval_request.blocked_capability_forbidden"
  | "approval_request.side_effects_forbidden";

export type ApprovalRequestPreflightError = {
  code: ApprovalRequestPreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type ApprovalRequestPreflightEvidence = {
  contract_id: typeof approvalRequestPreflightContract.contract_id;
  approval_request_version: typeof approvalRequestPreflightContract.approval_request_version;
  target_gate: typeof approvalRequestPreflightTargetGate;
  policy_gate_target_gate: typeof policyGatePreflightTargetGate;
  persistence_schema_contract_id: typeof persistenceSchemaContract.contract_id;
  writer_preflight_contract_id: typeof writerPreflightContract.contract_id;
  database_security_preflight_contract_id: typeof databaseSecurityPreflightContract.contract_id;
  policy_gate_preflight_contract_id: typeof policyGatePreflightContract.contract_id;
  required_gate_ids: PersistencePolicyGateId[];
  required_entity_names: PersistenceSchemaEntityName[];
  approval_request_refs: ApprovalRequestRefInput[];
  approver_scope_refs: ApprovalRequestApproverScopeRefInput[];
  decision_reason_refs: ApprovalRequestDecisionReasonRefInput[];
  policy_gate_refs: ApprovalRequestPolicyGateRefInput[];
  audit_obligation_refs: ApprovalRequestAuditObligationRefInput[];
  rollback_refs: ApprovalRequestRollbackRefInput[];
  no_approval_mutation_posture: ApprovalRequestNoMutationPostureInput;
  source_refs: string[];
  allowed_state: ApprovalRequestAllowedStateInput;
  blocked_capabilities: ApprovalRequestPreflightBlockedCapabilityFlag[];
  implementation_artifacts: [];
  approval_request_creation_artifacts: [];
  approval_mutation_artifacts: [];
  audit_write_artifacts: [];
  approval_request_creation_allowed: false;
  approval_request_persistence_allowed: false;
  approval_decision_persistence_allowed: false;
  approval_state_transition_allowed: false;
  approval_mutation_allowed: false;
  approve_deny_mutation_allowed: false;
  policy_mutation_allowed: false;
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

export type ApprovalRequestPreflightResult =
  | {
      ok: true;
      approval_request_preflight_contract: ApprovalRequestPreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      approval_request_preflight_contract: null;
      errors: ApprovalRequestPreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedApprovalRequestPreflightRequest =
  | {
      ok: true;
      gate_sequence: PersistencePolicyGateId[];
      approval_request_refs: ApprovalRequestRefInput[];
      approver_scope_refs: ApprovalRequestApproverScopeRefInput[];
      decision_reason_refs: ApprovalRequestDecisionReasonRefInput[];
      policy_gate_refs: ApprovalRequestPolicyGateRefInput[];
      audit_obligation_refs: ApprovalRequestAuditObligationRefInput[];
      rollback_refs: ApprovalRequestRollbackRefInput[];
      no_approval_mutation_posture: ApprovalRequestNoMutationPostureInput;
      source_refs: string[];
      allowed_state: ApprovalRequestAllowedStateInput;
    }
  | {
      ok: false;
      errors: ApprovalRequestPreflightError[];
    };

const requestKeys = new Set([
  "approval_request_version",
  "gate_sequence",
  "approval_request_refs",
  "approver_scope_refs",
  "decision_reason_refs",
  "policy_gate_refs",
  "audit_obligation_refs",
  "rollback_refs",
  "no_approval_mutation_posture",
  "source_refs",
  "allowed_state",
  "contract_authority",
  "side_effects",
  ...approvalRequestPreflightBlockedCapabilityFlags,
]);

const gateIdSet = new Set<string>(persistencePolicyGateIds);
const approvalRequestRefKindSet = new Set<string>(approvalRequestRefKinds);
const approverScopeKindSet = new Set<string>(approvalRequestApproverScopeKinds);
const decisionReasonKindSet = new Set<string>(approvalRequestDecisionReasonKinds);
const operationKindSet = new Set<string>(policyGateOperationKinds);
const auditObligationKindSet = new Set<string>(policyGateAuditObligationKinds);
const rollbackKindSet = new Set<string>(policyGateRollbackKinds);

const defaultSourceRefs: ApprovalRequestSourceRefInput[] = [
  {
    source_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    summary: "Gate G07 requires source-only approval request evidence.",
  },
  {
    source_ref: "docs/architecture/PERSISTENCE_SCHEMA_PLAN.md",
    summary: "Future approval request rows remain schema refs only.",
  },
  {
    source_ref: "docs/architecture/POLICY_AND_AUDIT.md",
    summary: "Approval, audit, and rollback authority stays Gateway-owned.",
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
    source_ref: "packages/packets/src/writer-preflight-contract.ts",
    summary: "BP-0208 writer preflight prerequisite contract.",
  },
  {
    source_ref: "packages/packets/src/database-security-preflight-contract.ts",
    summary: "BP-0209 database security prerequisite contract.",
  },
  {
    source_ref: "packages/packets/src/policy-gate-preflight-contract.ts",
    summary: "BP-0210 policy gate prerequisite contract.",
  },
  {
    source_ref: "packages/policy/src/index.ts",
    summary: "Existing pure policy decision and approval request refs.",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0211 source-only approval request preflight packet.",
  },
];

export const defaultApprovalRequestNoMutationPosture: ApprovalRequestNoMutationPostureInput =
  {
    approval_request_preflight_execution_allowed: false,
    approval_request_creation_allowed: false,
    approval_request_persistence_allowed: false,
    approval_decision_persistence_allowed: false,
    approval_state_transition_allowed: false,
    approval_mutation_allowed: false,
    approve_deny_mutation_allowed: false,
    decision_reason_mutation_allowed: false,
    approver_scope_mutation_allowed: false,
    policy_gate_execution_allowed: false,
    policy_decision_persistence_allowed: false,
    policy_mutation_allowed: false,
    settings_mutation_allowed: false,
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
    runtime_dispatcher_allowed: false,
    runtime_adapter_implementation_allowed: false,
    os_connector_package_allowed: false,
    live_storage_allowed: false,
    live_execution_allowed: false,
    external_service_call_allowed: false,
    environment_secret_lookup_allowed: false,
  };

export const defaultApprovalRequestAllowedState: ApprovalRequestAllowedStateInput = {
  source_only_approval_request_preflight_allowed: true,
  approval_request_refs_allowed: true,
  approver_scope_refs_allowed: true,
  decision_reason_refs_allowed: true,
  policy_gate_refs_allowed: true,
  audit_obligation_refs_allowed: true,
  rollback_refs_allowed: true,
  approval_request_creation_allowed: false,
  approval_request_persistence_allowed: false,
  approval_decision_persistence_allowed: false,
  approval_state_transition_allowed: false,
  approval_mutation_allowed: false,
  approve_deny_mutation_allowed: false,
  decision_reason_mutation_allowed: false,
  approver_scope_mutation_allowed: false,
  policy_gate_execution_allowed: false,
  policy_decision_persistence_allowed: false,
  policy_mutation_allowed: false,
  settings_mutation_allowed: false,
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

export const defaultApprovalRequestRefs: ApprovalRequestRefInput[] =
  approvalRequestRefKinds.map((requestKind) => ({
    request_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G07_APPROVAL_REQUEST",
    request_kind: requestKind,
    policy_gate_ref: "packages/packets/src/policy-gate-preflight-contract.ts",
    current_state: "source_ref_only_no_approval_request_creation",
    target_gate: approvalRequestPreflightTargetGate,
    approval_request_creation_allowed: false,
    approval_request_persistence_allowed: false,
    approval_mutation_allowed: false,
  }));

export const defaultApprovalRequestApproverScopeRefs: ApprovalRequestApproverScopeRefInput[] =
  approvalRequestApproverScopeKinds.map((scopeKind) => ({
    scope_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G07_APPROVAL_REQUEST",
    scope_kind: scopeKind,
    summary: "Approver scope remains source evidence only.",
    current_state: "source_ref_only_no_approver_scope_mutation",
    approver_scope_mutation_allowed: false,
    authorization_mutation_allowed: false,
    external_service_call_allowed: false,
  }));

export const defaultApprovalRequestDecisionReasonRefs: ApprovalRequestDecisionReasonRefInput[] =
  approvalRequestDecisionReasonKinds.map((reasonKind) => ({
    reason_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G07_APPROVAL_REQUEST",
    reason_kind: reasonKind,
    stable_reason_code_required: true,
    current_state: "source_ref_only_no_decision_mutation",
    decision_reason_mutation_allowed: false,
    approval_decision_persistence_allowed: false,
    approve_deny_mutation_allowed: false,
  }));

export const defaultApprovalRequestPolicyGateRefs: ApprovalRequestPolicyGateRefInput[] =
  policyGateOperationKinds.map((operation) => ({
    operation,
    policy_gate_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G06_POLICY_GATE",
    policy_gate_preflight_ref: "packages/packets/src/policy-gate-preflight-contract.ts",
    approval_requirement_ref:
      "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md#G07_APPROVAL_REQUEST",
    current_state: "source_ref_only_policy_gate_prerequisite",
    policy_gate_target: policyGatePreflightTargetGate,
    approval_request_target: approvalRequestPreflightTargetGate,
    policy_gate_execution_allowed: false,
    approval_request_creation_allowed: false,
    policy_decision_persistence_allowed: false,
  }));

export const defaultApprovalRequestAuditObligationRefs: ApprovalRequestAuditObligationRefInput[] =
  policyGateAuditObligationKinds.map((obligationKind) => ({
    obligation_ref: "docs/architecture/POLICY_AND_AUDIT.md",
    obligation_kind: obligationKind,
    required_event_type: auditEventTypeForObligation(obligationKind),
    current_state: "source_ref_only_no_audit_write",
    audit_write_allowed: false,
    audit_mutation_allowed: false,
  }));

export const defaultApprovalRequestRollbackRefs: ApprovalRequestRollbackRefInput[] =
  policyGateRollbackKinds.map((rollbackKind) => ({
    rollback_ref: "docs/architecture/PERSISTENCE_AND_POLICY_GATE_REVIEW.md",
    rollback_kind: rollbackKind,
    current_state: "source_ref_only_no_rollback_execution",
    rollback_execution_allowed: false,
    service_mutation_allowed: false,
    live_execution_allowed: false,
  }));

export function createApprovalRequestPreflightContract(
  request: ApprovalRequestPreflightRequest = {},
): ApprovalRequestPreflightResult {
  const normalized = normalizeRequest(request);

  if (!normalized.ok) {
    return {
      ok: false,
      approval_request_preflight_contract: null,
      errors: normalized.errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    approval_request_preflight_contract: {
      contract_id: approvalRequestPreflightContract.contract_id,
      approval_request_version:
        approvalRequestPreflightContract.approval_request_version,
      target_gate: approvalRequestPreflightTargetGate,
      policy_gate_target_gate: policyGatePreflightTargetGate,
      persistence_schema_contract_id: persistenceSchemaContract.contract_id,
      writer_preflight_contract_id: writerPreflightContract.contract_id,
      database_security_preflight_contract_id:
        databaseSecurityPreflightContract.contract_id,
      policy_gate_preflight_contract_id: policyGatePreflightContract.contract_id,
      required_gate_ids: normalized.gate_sequence,
      required_entity_names: [...persistenceSchemaEntityNames],
      approval_request_refs: normalized.approval_request_refs,
      approver_scope_refs: normalized.approver_scope_refs,
      decision_reason_refs: normalized.decision_reason_refs,
      policy_gate_refs: normalized.policy_gate_refs,
      audit_obligation_refs: normalized.audit_obligation_refs,
      rollback_refs: normalized.rollback_refs,
      no_approval_mutation_posture: normalized.no_approval_mutation_posture,
      source_refs: normalized.source_refs,
      allowed_state: normalized.allowed_state,
      blocked_capabilities: [...approvalRequestPreflightBlockedCapabilityFlags],
      implementation_artifacts: [],
      approval_request_creation_artifacts: [],
      approval_mutation_artifacts: [],
      audit_write_artifacts: [],
      approval_request_creation_allowed: false,
      approval_request_persistence_allowed: false,
      approval_decision_persistence_allowed: false,
      approval_state_transition_allowed: false,
      approval_mutation_allowed: false,
      approve_deny_mutation_allowed: false,
      policy_mutation_allowed: false,
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
  request: ApprovalRequestPreflightRequest,
): NormalizedApprovalRequestPreflightRequest {
  if (!isPlainObject(request)) {
    return {
      ok: false,
      errors: [
        approvalRequestError(
          "approval_request.invalid_request",
          "",
          "Approval request preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: ApprovalRequestPreflightError[] = [];

  for (const key of Object.keys(request)) {
    if (!requestKeys.has(key)) {
      errors.push(
        approvalRequestError(
          "approval_request.unexpected_field",
          `/${key}`,
          "Unexpected approval request preflight field.",
        ),
      );
    }
  }

  if (
    request.approval_request_version !== undefined &&
    request.approval_request_version !==
      approvalRequestPreflightContract.approval_request_version
  ) {
    errors.push(
      approvalRequestError(
        "approval_request.invalid_version",
        "/approval_request_version",
        "Approval request preflight version is unsupported.",
      ),
    );
  }

  if (
    request.contract_authority !== undefined &&
    request.contract_authority !== approvalRequestPreflightContract.contract_authority
  ) {
    errors.push(
      approvalRequestError(
        "approval_request.unsafe_contract_authority",
        "/contract_authority",
        "Approval request preflight authority must remain source-only.",
      ),
    );
  }

  for (const flag of approvalRequestPreflightBlockedCapabilityFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(blockedCapabilityError(flag, `/${flag}`));
    }
  }

  validateSideEffects(request.side_effects, "/side_effects", errors);

  const gateSequence = normalizeGateSequence(
    request.gate_sequence ?? [...persistencePolicyGateIds],
    errors,
  );
  const approvalRequestRefs = normalizeApprovalRequestRefs(
    request.approval_request_refs ?? defaultApprovalRequestRefs,
    errors,
  );
  const approverScopeRefs = normalizeApproverScopeRefs(
    request.approver_scope_refs ?? defaultApprovalRequestApproverScopeRefs,
    errors,
  );
  const decisionReasonRefs = normalizeDecisionReasonRefs(
    request.decision_reason_refs ?? defaultApprovalRequestDecisionReasonRefs,
    errors,
  );
  const policyGateRefs = normalizePolicyGateRefs(
    request.policy_gate_refs ?? defaultApprovalRequestPolicyGateRefs,
    errors,
  );
  const auditObligationRefs = normalizeAuditObligationRefs(
    request.audit_obligation_refs ?? defaultApprovalRequestAuditObligationRefs,
    errors,
  );
  const rollbackRefs = normalizeRollbackRefs(
    request.rollback_refs ?? defaultApprovalRequestRollbackRefs,
    errors,
  );
  const noMutationPosture = normalizeNoMutationPosture(
    request.no_approval_mutation_posture ?? defaultApprovalRequestNoMutationPosture,
    errors,
  );
  const sourceRefs = normalizeSourceRefs(
    request.source_refs ?? defaultSourceRefs,
    errors,
  );
  const allowedState = normalizeAllowedState(
    request.allowed_state ?? defaultApprovalRequestAllowedState,
    errors,
  );

  if (
    errors.length > 0 ||
    gateSequence === null ||
    approvalRequestRefs === null ||
    approverScopeRefs === null ||
    decisionReasonRefs === null ||
    policyGateRefs === null ||
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
    approval_request_refs: approvalRequestRefs,
    approver_scope_refs: approverScopeRefs,
    decision_reason_refs: decisionReasonRefs,
    policy_gate_refs: policyGateRefs,
    audit_obligation_refs: auditObligationRefs,
    rollback_refs: rollbackRefs,
    no_approval_mutation_posture: noMutationPosture,
    source_refs: sourceRefs,
    allowed_state: allowedState,
  };
}

function normalizeGateSequence(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): PersistencePolicyGateId[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      approvalRequestError(
        "approval_request.gate_sequence_required",
        "/gate_sequence",
        "Approval request preflight requires the full persistence gate order.",
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
        approvalRequestError(
          "approval_request.gate_order_drift",
          `/gate_sequence/${index}`,
          "Persistence gate id is unsupported.",
        ),
      );
      continue;
    }
    if (seen.has(gateId) || persistencePolicyGateIds[index] !== gateId) {
      errors.push(
        approvalRequestError(
          "approval_request.gate_order_drift",
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
        approvalRequestError(
          "approval_request.gate_sequence_required",
          "/gate_sequence",
          "Approval request preflight is missing a required gate id.",
        ),
      );
    }
  }

  return normalized;
}

function normalizeApprovalRequestRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("approval_request_ref", "/approval_request_refs"));
    return null;
  }

  const normalized: ApprovalRequestRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidApprovalRequestRef(index, ""));
      continue;
    }

    const requestKind = rawRef.request_kind;
    if (!isApprovalRequestRefKind(requestKind)) {
      errors.push(invalidApprovalRequestRef(index, "/request_kind"));
      continue;
    }
    seen.add(requestKind);

    const requestRef = normalizeRepoRef(
      rawRef.request_ref,
      `/approval_request_refs/${index}/request_ref`,
      errors,
      "approval_request.invalid_approval_request_ref",
    );
    const policyGateRef = normalizeRepoRef(
      rawRef.policy_gate_ref,
      `/approval_request_refs/${index}/policy_gate_ref`,
      errors,
      "approval_request.invalid_approval_request_ref",
    );

    if (rawRef.current_state !== "source_ref_only_no_approval_request_creation") {
      errors.push(invalidApprovalRequestRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.approval_request_creation_allowed,
      `/approval_request_refs/${index}/approval_request_creation_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );
    requireFalse(
      rawRef.approval_request_persistence_allowed,
      `/approval_request_refs/${index}/approval_request_persistence_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );
    requireFalse(
      rawRef.approval_mutation_allowed,
      `/approval_request_refs/${index}/approval_mutation_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );

    if (rawRef.target_gate !== approvalRequestPreflightTargetGate) {
      errors.push(invalidApprovalRequestRef(index, "/target_gate"));
    }

    if (requestRef !== null && policyGateRef !== null) {
      normalized.push({
        request_ref: requestRef,
        request_kind: requestKind,
        policy_gate_ref: policyGateRef,
        current_state: "source_ref_only_no_approval_request_creation",
        target_gate: approvalRequestPreflightTargetGate,
        approval_request_creation_allowed: false,
        approval_request_persistence_allowed: false,
        approval_mutation_allowed: false,
      });
    }
  }

  for (const requiredKind of approvalRequestRefKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("approval_request_ref", "/approval_request_refs"));
    }
  }

  return normalized;
}

function normalizeApproverScopeRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestApproverScopeRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("approver_scope_ref", "/approver_scope_refs"));
    return null;
  }

  const normalized: ApprovalRequestApproverScopeRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidApproverScopeRef(index, ""));
      continue;
    }

    const scopeKind = rawRef.scope_kind;
    if (!isApproverScopeKind(scopeKind)) {
      errors.push(invalidApproverScopeRef(index, "/scope_kind"));
      continue;
    }
    seen.add(scopeKind);

    const scopeRef = normalizeRepoRef(
      rawRef.scope_ref,
      `/approver_scope_refs/${index}/scope_ref`,
      errors,
      "approval_request.invalid_approver_scope_ref",
    );
    const summary = normalizeTextRef(
      rawRef.summary,
      `/approver_scope_refs/${index}/summary`,
      errors,
      "approval_request.invalid_approver_scope_ref",
    );

    if (rawRef.current_state !== "source_ref_only_no_approver_scope_mutation") {
      errors.push(invalidApproverScopeRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.approver_scope_mutation_allowed,
      `/approver_scope_refs/${index}/approver_scope_mutation_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );
    requireFalse(
      rawRef.authorization_mutation_allowed,
      `/approver_scope_refs/${index}/authorization_mutation_allowed`,
      errors,
      "approval_request.policy_mutation_forbidden",
    );
    requireFalse(
      rawRef.external_service_call_allowed,
      `/approver_scope_refs/${index}/external_service_call_allowed`,
      errors,
      "approval_request.blocked_capability_forbidden",
    );

    if (scopeRef !== null && summary !== null) {
      normalized.push({
        scope_ref: scopeRef,
        scope_kind: scopeKind,
        summary,
        current_state: "source_ref_only_no_approver_scope_mutation",
        approver_scope_mutation_allowed: false,
        authorization_mutation_allowed: false,
        external_service_call_allowed: false,
      });
    }
  }

  for (const requiredKind of approvalRequestApproverScopeKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("approver_scope_ref", "/approver_scope_refs"));
    }
  }

  return normalized;
}

function normalizeDecisionReasonRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestDecisionReasonRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("decision_reason_ref", "/decision_reason_refs"));
    return null;
  }

  const normalized: ApprovalRequestDecisionReasonRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidDecisionReasonRef(index, ""));
      continue;
    }

    const reasonKind = rawRef.reason_kind;
    if (!isDecisionReasonKind(reasonKind)) {
      errors.push(invalidDecisionReasonRef(index, "/reason_kind"));
      continue;
    }
    seen.add(reasonKind);

    const reasonRef = normalizeRepoRef(
      rawRef.reason_ref,
      `/decision_reason_refs/${index}/reason_ref`,
      errors,
      "approval_request.invalid_decision_reason_ref",
    );

    if (rawRef.stable_reason_code_required !== true) {
      errors.push(invalidDecisionReasonRef(index, "/stable_reason_code_required"));
    }
    if (rawRef.current_state !== "source_ref_only_no_decision_mutation") {
      errors.push(invalidDecisionReasonRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.decision_reason_mutation_allowed,
      `/decision_reason_refs/${index}/decision_reason_mutation_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );
    requireFalse(
      rawRef.approval_decision_persistence_allowed,
      `/decision_reason_refs/${index}/approval_decision_persistence_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );
    requireFalse(
      rawRef.approve_deny_mutation_allowed,
      `/decision_reason_refs/${index}/approve_deny_mutation_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );

    if (reasonRef !== null) {
      normalized.push({
        reason_ref: reasonRef,
        reason_kind: reasonKind,
        stable_reason_code_required: true,
        current_state: "source_ref_only_no_decision_mutation",
        decision_reason_mutation_allowed: false,
        approval_decision_persistence_allowed: false,
        approve_deny_mutation_allowed: false,
      });
    }
  }

  for (const requiredKind of approvalRequestDecisionReasonKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("decision_reason_ref", "/decision_reason_refs"));
    }
  }

  return normalized;
}

function normalizePolicyGateRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestPolicyGateRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("policy_gate_ref", "/policy_gate_refs"));
    return null;
  }

  const normalized: ApprovalRequestPolicyGateRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidPolicyGateRef(index, ""));
      continue;
    }

    const operation = rawRef.operation;
    if (!isPolicyGateOperationKind(operation)) {
      errors.push(invalidPolicyGateRef(index, "/operation"));
      continue;
    }
    seen.add(operation);

    const policyGateRef = normalizeRepoRef(
      rawRef.policy_gate_ref,
      `/policy_gate_refs/${index}/policy_gate_ref`,
      errors,
      "approval_request.invalid_policy_gate_ref",
    );
    const policyGatePreflightRef = normalizeRepoRef(
      rawRef.policy_gate_preflight_ref,
      `/policy_gate_refs/${index}/policy_gate_preflight_ref`,
      errors,
      "approval_request.invalid_policy_gate_ref",
    );
    const approvalRequirementRef = normalizeRepoRef(
      rawRef.approval_requirement_ref,
      `/policy_gate_refs/${index}/approval_requirement_ref`,
      errors,
      "approval_request.invalid_policy_gate_ref",
    );

    if (rawRef.current_state !== "source_ref_only_policy_gate_prerequisite") {
      errors.push(invalidPolicyGateRef(index, "/current_state"));
    }
    if (rawRef.policy_gate_target !== policyGatePreflightTargetGate) {
      errors.push(invalidPolicyGateRef(index, "/policy_gate_target"));
    }
    if (rawRef.approval_request_target !== approvalRequestPreflightTargetGate) {
      errors.push(invalidPolicyGateRef(index, "/approval_request_target"));
    }
    requireFalse(
      rawRef.policy_gate_execution_allowed,
      `/policy_gate_refs/${index}/policy_gate_execution_allowed`,
      errors,
      "approval_request.policy_mutation_forbidden",
    );
    requireFalse(
      rawRef.approval_request_creation_allowed,
      `/policy_gate_refs/${index}/approval_request_creation_allowed`,
      errors,
      "approval_request.approval_mutation_forbidden",
    );
    requireFalse(
      rawRef.policy_decision_persistence_allowed,
      `/policy_gate_refs/${index}/policy_decision_persistence_allowed`,
      errors,
      "approval_request.policy_mutation_forbidden",
    );

    if (
      policyGateRef !== null &&
      policyGatePreflightRef !== null &&
      approvalRequirementRef !== null
    ) {
      normalized.push({
        operation,
        policy_gate_ref: policyGateRef,
        policy_gate_preflight_ref: policyGatePreflightRef,
        approval_requirement_ref: approvalRequirementRef,
        current_state: "source_ref_only_policy_gate_prerequisite",
        policy_gate_target: policyGatePreflightTargetGate,
        approval_request_target: approvalRequestPreflightTargetGate,
        policy_gate_execution_allowed: false,
        approval_request_creation_allowed: false,
        policy_decision_persistence_allowed: false,
      });
    }
  }

  for (const requiredOperation of policyGateOperationKinds) {
    if (!seen.has(requiredOperation)) {
      errors.push(requiredError("policy_gate_ref", "/policy_gate_refs"));
    }
  }

  return normalized;
}

function normalizeAuditObligationRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestAuditObligationRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    return null;
  }

  const normalized: ApprovalRequestAuditObligationRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidAuditObligationRef(index, ""));
      continue;
    }

    const obligationKind = rawRef.obligation_kind;
    if (!isPolicyGateAuditObligationKind(obligationKind)) {
      errors.push(invalidAuditObligationRef(index, "/obligation_kind"));
      continue;
    }
    seen.add(obligationKind);

    const obligationRef = normalizeRepoRef(
      rawRef.obligation_ref,
      `/audit_obligation_refs/${index}/obligation_ref`,
      errors,
      "approval_request.invalid_audit_obligation_ref",
    );
    if (rawRef.required_event_type !== auditEventTypeForObligation(obligationKind)) {
      errors.push(invalidAuditObligationRef(index, "/required_event_type"));
    }
    if (rawRef.current_state !== "source_ref_only_no_audit_write") {
      errors.push(invalidAuditObligationRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.audit_write_allowed,
      `/audit_obligation_refs/${index}/audit_write_allowed`,
      errors,
      "approval_request.audit_write_forbidden",
    );
    requireFalse(
      rawRef.audit_mutation_allowed,
      `/audit_obligation_refs/${index}/audit_mutation_allowed`,
      errors,
      "approval_request.audit_write_forbidden",
    );

    if (obligationRef !== null) {
      normalized.push({
        obligation_ref: obligationRef,
        obligation_kind: obligationKind,
        required_event_type: auditEventTypeForObligation(obligationKind),
        current_state: "source_ref_only_no_audit_write",
        audit_write_allowed: false,
        audit_mutation_allowed: false,
      });
    }
  }

  for (const requiredKind of policyGateAuditObligationKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("audit_obligation_ref", "/audit_obligation_refs"));
    }
  }

  return normalized;
}

function normalizeRollbackRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestRollbackRefInput[] | null {
  if (!Array.isArray(value)) {
    errors.push(requiredError("rollback_ref", "/rollback_refs"));
    return null;
  }

  const normalized: ApprovalRequestRollbackRefInput[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(invalidRollbackRef(index, ""));
      continue;
    }

    const rollbackKind = rawRef.rollback_kind;
    if (!isPolicyGateRollbackKind(rollbackKind)) {
      errors.push(invalidRollbackRef(index, "/rollback_kind"));
      continue;
    }
    seen.add(rollbackKind);

    const rollbackRef = normalizeRepoRef(
      rawRef.rollback_ref,
      `/rollback_refs/${index}/rollback_ref`,
      errors,
      "approval_request.invalid_rollback_ref",
    );
    if (rawRef.current_state !== "source_ref_only_no_rollback_execution") {
      errors.push(invalidRollbackRef(index, "/current_state"));
    }
    requireFalse(
      rawRef.rollback_execution_allowed,
      `/rollback_refs/${index}/rollback_execution_allowed`,
      errors,
      "approval_request.rollback_execution_forbidden",
    );
    requireFalse(
      rawRef.service_mutation_allowed,
      `/rollback_refs/${index}/service_mutation_allowed`,
      errors,
      "approval_request.rollback_execution_forbidden",
    );
    requireFalse(
      rawRef.live_execution_allowed,
      `/rollback_refs/${index}/live_execution_allowed`,
      errors,
      "approval_request.live_execution_forbidden",
    );

    if (rollbackRef !== null) {
      normalized.push({
        rollback_ref: rollbackRef,
        rollback_kind: rollbackKind,
        current_state: "source_ref_only_no_rollback_execution",
        rollback_execution_allowed: false,
        service_mutation_allowed: false,
        live_execution_allowed: false,
      });
    }
  }

  for (const requiredKind of policyGateRollbackKinds) {
    if (!seen.has(requiredKind)) {
      errors.push(requiredError("rollback_ref", "/rollback_refs"));
    }
  }

  return normalized;
}

function normalizeNoMutationPosture(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestNoMutationPostureInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      approvalRequestError(
        "approval_request.no_mutation_posture_required",
        "/no_approval_mutation_posture",
        "Approval request preflight requires no-mutation posture.",
      ),
    );
    return null;
  }

  let valid = true;
  for (const key of Object.keys(defaultApprovalRequestNoMutationPosture) as Array<
    keyof ApprovalRequestNoMutationPostureInput
  >) {
    if (value[key] !== false) {
      valid = false;
      errors.push(forbiddenByKey(key, `/no_approval_mutation_posture/${key}`));
    }
  }

  return valid ? defaultApprovalRequestNoMutationPosture : null;
}

function normalizeSourceRefs(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): string[] | null {
  if (!Array.isArray(value)) {
    errors.push(
      approvalRequestError(
        "approval_request.source_ref_required",
        "/source_refs",
        "Approval request preflight requires source refs.",
      ),
    );
    return null;
  }

  const normalized: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const rawRef = value[index];
    if (!isPlainObject(rawRef)) {
      errors.push(
        approvalRequestError(
          "approval_request.invalid_source_ref",
          `/source_refs/${index}`,
          "Approval request source ref must be an object.",
        ),
      );
      continue;
    }

    const sourceRef = normalizeRepoRef(
      rawRef.source_ref,
      `/source_refs/${index}/source_ref`,
      errors,
      "approval_request.invalid_source_ref",
    );
    normalizeTextRef(
      rawRef.summary,
      `/source_refs/${index}/summary`,
      errors,
      "approval_request.invalid_source_ref",
    );

    if (sourceRef !== null) {
      normalized.push(sourceRef);
    }
  }

  if (normalized.length === 0) {
    errors.push(
      approvalRequestError(
        "approval_request.source_ref_required",
        "/source_refs",
        "Approval request preflight requires at least one source ref.",
      ),
    );
  }

  return normalized;
}

function normalizeAllowedState(
  value: unknown,
  errors: ApprovalRequestPreflightError[],
): ApprovalRequestAllowedStateInput | null {
  if (!isPlainObject(value)) {
    errors.push(
      approvalRequestError(
        "approval_request.allowed_state_required",
        "/allowed_state",
        "Approval request preflight requires allowed state.",
      ),
    );
    return null;
  }

  let valid = true;
  for (const key of Object.keys(defaultApprovalRequestAllowedState) as Array<
    keyof ApprovalRequestAllowedStateInput
  >) {
    const expected = defaultApprovalRequestAllowedState[key];
    if (value[key] !== expected) {
      valid = false;
      errors.push(forbiddenByKey(key, `/allowed_state/${key}`));
    }
  }

  return valid ? defaultApprovalRequestAllowedState : null;
}

function normalizeRepoRef(
  value: unknown,
  path: string,
  errors: ApprovalRequestPreflightError[],
  invalidCode: ApprovalRequestPreflightErrorCode,
): string | null {
  const normalized = normalizeTextRef(value, path, errors, invalidCode);
  if (normalized === null) {
    return null;
  }
  if (hasConnectionLikeValue(normalized)) {
    errors.push(
      approvalRequestError(
        "approval_request.connection_or_sql_forbidden",
        path,
        "Approval request preflight forbids connection-like refs.",
      ),
    );
    return null;
  }
  if (hasSecretLikeValue(normalized)) {
    errors.push(
      approvalRequestError(
        "approval_request.secret_value_forbidden",
        path,
        "Approval request preflight forbids secret-like refs.",
      ),
    );
    return null;
  }
  if (
    normalized.startsWith("/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    errors.push(
      approvalRequestError(
        invalidCode,
        path,
        "Approval request preflight source refs must be repo-local refs.",
      ),
    );
    return null;
  }
  return normalized;
}

function normalizeTextRef(
  value: unknown,
  path: string,
  errors: ApprovalRequestPreflightError[],
  invalidCode: ApprovalRequestPreflightErrorCode,
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(
      approvalRequestError(
        invalidCode,
        path,
        "Approval request preflight refs must be nonempty strings.",
      ),
    );
    return null;
  }

  const normalized = value.trim();
  if (hasConnectionLikeValue(normalized)) {
    errors.push(
      approvalRequestError(
        "approval_request.connection_or_sql_forbidden",
        path,
        "Approval request preflight forbids connection-like values.",
      ),
    );
    return null;
  }
  if (hasSecretLikeValue(normalized)) {
    errors.push(
      approvalRequestError(
        "approval_request.secret_value_forbidden",
        path,
        "Approval request preflight forbids secret-like values.",
      ),
    );
    return null;
  }
  return normalized;
}

function validateSideEffects(
  value: unknown,
  path: string,
  errors: ApprovalRequestPreflightError[],
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.length > 0) {
    errors.push(
      approvalRequestError(
        "approval_request.side_effects_forbidden",
        path,
        "Approval request preflight side_effects must be empty.",
      ),
    );
  }
}

function requireFalse(
  value: unknown,
  path: string,
  errors: ApprovalRequestPreflightError[],
  code: ApprovalRequestPreflightErrorCode,
): void {
  if (value !== false) {
    errors.push(
      approvalRequestError(
        code,
        path,
        "Approval request preflight requires this capability to stay false.",
      ),
    );
  }
}

function requiredError(
  kind:
    | "approval_request_ref"
    | "approver_scope_ref"
    | "decision_reason_ref"
    | "policy_gate_ref"
    | "audit_obligation_ref"
    | "rollback_ref",
  path: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    `approval_request.${kind}_required`,
    path,
    "Approval request preflight is missing required source evidence.",
  );
}

function invalidApprovalRequestRef(
  index: number,
  suffix: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    "approval_request.invalid_approval_request_ref",
    `/approval_request_refs/${index}${suffix}`,
    "Approval request ref must remain source-only.",
  );
}

function invalidApproverScopeRef(
  index: number,
  suffix: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    "approval_request.invalid_approver_scope_ref",
    `/approver_scope_refs/${index}${suffix}`,
    "Approver scope ref must remain source-only.",
  );
}

function invalidDecisionReasonRef(
  index: number,
  suffix: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    "approval_request.invalid_decision_reason_ref",
    `/decision_reason_refs/${index}${suffix}`,
    "Decision reason ref must remain source-only.",
  );
}

function invalidPolicyGateRef(
  index: number,
  suffix: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    "approval_request.invalid_policy_gate_ref",
    `/policy_gate_refs/${index}${suffix}`,
    "Policy gate ref must remain source-only.",
  );
}

function invalidAuditObligationRef(
  index: number,
  suffix: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    "approval_request.invalid_audit_obligation_ref",
    `/audit_obligation_refs/${index}${suffix}`,
    "Audit obligation ref must remain source-only.",
  );
}

function invalidRollbackRef(
  index: number,
  suffix: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    "approval_request.invalid_rollback_ref",
    `/rollback_refs/${index}${suffix}`,
    "Rollback ref must remain source-only.",
  );
}

function blockedCapabilityError(
  flag: ApprovalRequestPreflightBlockedCapabilityFlag,
  path: string,
): ApprovalRequestPreflightError {
  return approvalRequestError(
    errorCodeForCapabilityKey(flag),
    path,
    "Approval request preflight forbids this capability.",
  );
}

function forbiddenByKey(key: string, path: string): ApprovalRequestPreflightError {
  return approvalRequestError(
    errorCodeForCapabilityKey(key),
    path,
    "Approval request preflight posture drifted outside source-only scope.",
  );
}

function errorCodeForCapabilityKey(key: string): ApprovalRequestPreflightErrorCode {
  if (key === "python_runtime_required") {
    return "approval_request.python_runtime_requirement_forbidden";
  }
  if (key === "os_specific_binary_required") {
    return "approval_request.os_specific_binary_requirement_forbidden";
  }
  if (
    key.startsWith("source_only_") ||
    key.endsWith("_refs_allowed") ||
    key === "rollback_refs_allowed"
  ) {
    return "approval_request.allowed_state_drift";
  }
  if (
    key.includes("approval") ||
    key.includes("approve_deny") ||
    key.includes("decision_reason") ||
    key.includes("approver_scope")
  ) {
    return "approval_request.approval_mutation_forbidden";
  }
  if (
    key.includes("policy") ||
    key.includes("settings") ||
    key.includes("authorization")
  ) {
    return "approval_request.policy_mutation_forbidden";
  }
  if (key.includes("audit")) {
    return "approval_request.audit_write_forbidden";
  }
  if (key.includes("rollback") || key.includes("service_mutation")) {
    return "approval_request.rollback_execution_forbidden";
  }
  if (
    key.includes("database") ||
    key.includes("sql") ||
    key.includes("ddl") ||
    key.includes("connection")
  ) {
    return "approval_request.connection_or_sql_forbidden";
  }
  if (key.includes("role_grant") || key.includes("grant_")) {
    return "approval_request.role_grant_forbidden";
  }
  if (key.includes("writer")) {
    return "approval_request.writer_implementation_forbidden";
  }
  if (key.includes("migration")) {
    return "approval_request.migration_execution_forbidden";
  }
  if (key.includes("live") || key.includes("runtime")) {
    return "approval_request.live_execution_forbidden";
  }
  if (key === "secret_posture") {
    return "approval_request.secret_value_forbidden";
  }
  return "approval_request.blocked_capability_forbidden";
}

function approvalRequestError(
  code: ApprovalRequestPreflightErrorCode,
  path: string,
  message: string,
): ApprovalRequestPreflightError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function auditEventTypeForObligation(
  obligationKind: PolicyGateAuditObligationKind,
): ApprovalRequestAuditObligationRefInput["required_event_type"] {
  switch (obligationKind) {
    case "policy_checked_audit_ref":
      return "policy_checked";
    case "approval_requested_audit_ref":
      return "approval_requested";
    case "approval_decision_audit_ref":
      return "approval_decision_recorded";
    case "operation_result_audit_ref":
      return "operation_result_recorded";
    case "rollback_audit_ref":
      return "rollback_recorded";
  }
}

function isPersistencePolicyGateId(value: unknown): value is PersistencePolicyGateId {
  return typeof value === "string" && gateIdSet.has(value);
}

function isApprovalRequestRefKind(value: unknown): value is ApprovalRequestRefKind {
  return typeof value === "string" && approvalRequestRefKindSet.has(value);
}

function isApproverScopeKind(
  value: unknown,
): value is ApprovalRequestApproverScopeKind {
  return typeof value === "string" && approverScopeKindSet.has(value);
}

function isDecisionReasonKind(
  value: unknown,
): value is ApprovalRequestDecisionReasonKind {
  return typeof value === "string" && decisionReasonKindSet.has(value);
}

function isPolicyGateOperationKind(value: unknown): value is PolicyGateOperationKind {
  return typeof value === "string" && operationKindSet.has(value);
}

function isPolicyGateAuditObligationKind(
  value: unknown,
): value is PolicyGateAuditObligationKind {
  return typeof value === "string" && auditObligationKindSet.has(value);
}

function isPolicyGateRollbackKind(value: unknown): value is PolicyGateRollbackKind {
  return typeof value === "string" && rollbackKindSet.has(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasConnectionLikeValue(value: string): boolean {
  return /postgres:|mysql:|mongodb:|redis:|database_url|connection_string|password=|create role|grant\s|revoke\s|alter table|drop table|truncate\s|insert into|update\s/i.test(
    value,
  );
}

function hasSecretLikeValue(value: string): boolean {
  return /secret|token|api[_-]?key|private[_-]?key|password|credential|bearer\s/i.test(
    value,
  );
}
