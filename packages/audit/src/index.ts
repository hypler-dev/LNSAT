import type {
  PacketHash,
  PacketValidationErrorCode,
  PacketValidationResult,
  UniversalPacket,
} from "@lnsat/packets";

export * from "./audit-event-v1.js";
export * from "./postgresql-audit-ledger-writer.js";
export * from "./audit-ledger-record-digest.js";

export const AUDIT_LEDGER_STATUS = "source_only";
export const AUDIT_LEDGER_RECORD_STATUS = "source_only";
export const AUDIT_LEDGER_WRITER_INTERFACE_STATUS = "source_only";
export const AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_STATUS = "source_only";
export const AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_STATUS = "source_only";
export const AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_STATUS =
  "source_only";
export const AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_STATUS = "source_only";
export const AUDIT_LEDGER_APPEND_SEMANTICS_CONFORMANCE_STATUS = "source_only";
export const AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID =
  "lnsat.audit.audit_ledger_writer_interface.v0_1";
export const AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID =
  "lnsat.audit.audit_ledger_writer_persistence_preflight.v0_1";
export const AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID =
  "lnsat.audit.audit_ledger_database_security_preflight.v0_1";
export const AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID =
  "lnsat.audit.audit_ledger_persistence_implementation_readiness_gate.v0_1";
export const AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_CONTRACT_ID =
  "lnsat.audit.audit_ledger_persistence_scope_request.v0_1";
export const AUDIT_LEDGER_APPEND_SEMANTICS_CONFORMANCE_CONTRACT_ID =
  "lnsat.audit.audit_ledger_append_semantics_conformance.v0_1";
export const AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID =
  "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1";
export const AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL =
  "lnsat.audit.ledger.persistence_readiness.inspect";
export const AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID =
  "lnsat.policy.audit_ledger_writer_gate.v0_1";
export const AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID =
  "lnsat.policy.audit_ledger_writer_approval_request.v0_1";
export const AUDIT_LEDGER_WRITER_CAPABILITY = "audit.ledger.writer.append_only";
export const AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET = "audit_events.v0_1";

export type AuditEventType = "packet_validated" | "packet_rejected" | "policy_checked";

export type AuditResultStatus =
  "success" | "failure" | "allow" | "deny" | "approval_required";

export type AuditReasonCode =
  | PacketValidationErrorCode
  | "policy.capability_blocked"
  | "policy.capability_forbidden"
  | "policy.capability_requires_approval"
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval"
  | "audit.policy_packet_mismatch";

export type AuditPacketRef = {
  packet_id: string;
  packet_type: UniversalPacket["packet_type"];
  packet_hash?: PacketHash;
};

export type AuditPolicyDecisionEvidence = {
  decision_id: string;
  packet_id: string;
  actor_id: string;
  session_id: string;
  resource_refs: string[];
  capability: string;
  risk_level: number;
  decision: "allow" | "deny" | "approval_required";
  requires_approval: boolean;
  reason_codes: AuditReasonCode[];
  created_at: string;
};

export type AuditPolicyRef = {
  decision_id: string;
  decision: AuditPolicyDecisionEvidence["decision"];
  requires_approval: boolean;
};

export type AuditEvent = {
  event_id: string;
  event_type: AuditEventType;
  actor_id: string | null;
  session_id: string | null;
  packet_ref: AuditPacketRef | null;
  policy_ref: AuditPolicyRef | null;
  resource_refs: string[];
  capability: string | null;
  result_status: AuditResultStatus;
  reason_codes: AuditReasonCode[];
  created_at: string;
};

export type OnboardingContextInspectionAuditPreviewInput = {
  ok: boolean;
  contract_id: string;
  request_id: string | null;
  inspected_at: string;
  source_docs: string[];
  trusted_source_refs: string[];
  profile_refs?: {
    project_profile_ref: string;
    agent_profile_ref: string;
  };
  packet_ref: AuditPacketRef | null;
  request_errors?: {
    code: string;
  }[];
  compiler_errors?: {
    code: string;
  }[];
  profile_errors?: {
    code: string;
  }[];
  side_effects: [];
};

export type OnboardingContextInspectionAuditPreviewRecord = {
  event_id: string;
  event_type: "context_packet_compiled" | "context_packet_inspection_rejected";
  contract_id: string;
  request_id: string | null;
  inspected_at: string;
  packet_ref: AuditPacketRef | null;
  profile_refs: {
    project_profile_ref: string;
    agent_profile_ref: string;
  } | null;
  source_refs: string[];
  result_status: "success" | "failure";
  reason_codes: string[];
  side_effects: [];
};

export const auditLedgerEventTypes = [
  "packet_validated",
  "packet_rejected",
  "policy_checked",
  "context_packet_compiled",
  "context_packet_inspection_rejected",
  "gateway_request_rejected",
  "mcp_adapter_request_rejected",
  "approval_requested",
  "approval_granted",
  "approval_denied",
  "adapter_call_requested",
  "adapter_call_completed",
  "adapter_failed",
] as const;

export type AuditLedgerEventType = (typeof auditLedgerEventTypes)[number];

export const auditLedgerRetentionClasses = [
  "control_plane",
  "inspection",
  "preview",
  "security",
  "debug",
] as const;

export type AuditLedgerRetentionClass = (typeof auditLedgerRetentionClasses)[number];

export type AuditRedactionState = "not_present" | "withheld";

export type AuditLedgerRedactionSummary = {
  raw_rejected_command: AuditRedactionState;
  raw_rejected_value: AuditRedactionState;
  raw_invalid_payload_content: AuditRedactionState;
  secret_like_values: AuditRedactionState;
};

export type AuditLedgerApprovalRef = {
  approval_id: string;
  decision?: "requested" | "granted" | "denied";
};

export type AuditLedgerAdapterRef = {
  adapter_type: "gateway" | "mcp" | "rest" | "cli" | "ui" | "worker" | "substrate";
  adapter_id: string;
  contract_id?: string;
};

export type AuditLedgerSideEffect = {
  effect_type: string;
  resource_ref: string;
  status: "requested" | "started" | "completed" | "failed" | "blocked";
  result_packet_ref?: AuditPacketRef;
};

export type AuditLedgerRecord = {
  ledger_record_id: string;
  event_id: string;
  event_type: AuditLedgerEventType;
  result_status: AuditResultStatus;
  actor_ref: string | null;
  session_ref: string | null;
  packet_ref: AuditPacketRef | null;
  policy_ref: AuditPolicyRef | null;
  approval_ref: AuditLedgerApprovalRef | null;
  adapter_ref: AuditLedgerAdapterRef | null;
  resource_refs: string[];
  capability: string | null;
  risk_level: number | null;
  source_refs: string[];
  reason_codes: string[];
  redaction: AuditLedgerRedactionSummary;
  idempotency_key: string;
  created_at: string;
  observed_at: string;
  retention_class: AuditLedgerRetentionClass;
  side_effects: AuditLedgerSideEffect[];
};

export type AuditLedgerRecordValidationErrorCode =
  | "audit_ledger.invalid_type"
  | "audit_ledger.unexpected_field"
  | "audit_ledger.missing_required_field"
  | "audit_ledger.invalid_field"
  | "audit_ledger.raw_content_embedded"
  | "audit_ledger.secret_like_value_embedded";

export type AuditLedgerRecordValidationError = {
  code: AuditLedgerRecordValidationErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerRecordValidationResult =
  | {
      ok: true;
      record: AuditLedgerRecord;
      errors: [];
    }
  | {
      ok: false;
      record?: never;
      errors: AuditLedgerRecordValidationError[];
    };

export type AuditLedgerWriterOperation =
  "ledger.record.append" | "ledger.record.correct" | "ledger.record.retry";

export type AuditLedgerWriterPolicyGateEvidence = {
  contract_id: typeof AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID;
  decision_id: string;
  request_id: string;
  actor_id: string;
  session_id: string;
  operation: AuditLedgerWriterOperation;
  resource_refs: string[];
  capability: string;
  writer_capability: typeof AUDIT_LEDGER_WRITER_CAPABILITY;
  risk_level: number;
  decision: "approval_required";
  requires_approval: true;
  reason_codes: string[];
  side_effects: [];
  created_at: string;
};

export type AuditLedgerWriterApprovalRequestEvidence = {
  contract_id: typeof AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID;
  approval_request_id: string;
  approval_status: "requested";
  approval_kind: "ledger_state_change";
  request_id: string;
  actor_id: string;
  session_id: string;
  operation: AuditLedgerWriterOperation;
  resource_refs: string[];
  requested_capability: string;
  writer_capability: typeof AUDIT_LEDGER_WRITER_CAPABILITY;
  risk_level: number;
  policy_gate_ref: {
    contract_id: typeof AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID;
    decision_id: string;
    decision: "approval_required";
    requires_approval: true;
    reason_codes: string[];
  };
  approver_scope: "owner_or_admin";
  evidence_refs: string[];
  reason_codes: string[];
  side_effects: [];
  created_at: string;
};

export type AuditLedgerWriterInterfaceInput = {
  request_id: string;
  operation: AuditLedgerWriterOperation;
  record: AuditLedgerRecord;
  canonical_record_digest: string;
  policy_gate_decision: AuditLedgerWriterPolicyGateEvidence;
  approval_request: AuditLedgerWriterApprovalRequestEvidence;
};

export type AuditLedgerWriterInterfaceErrorCode =
  | "audit_ledger_writer.invalid_request"
  | "audit_ledger_writer.invalid_record"
  | "audit_ledger_writer.invalid_canonical_digest"
  | "audit_ledger_writer.policy_gate_required"
  | "audit_ledger_writer.policy_gate_invalid"
  | "audit_ledger_writer.approval_request_required"
  | "audit_ledger_writer.approval_request_invalid"
  | "audit_ledger_writer.approval_policy_mismatch";

export type AuditLedgerWriterInterfaceError = {
  code: AuditLedgerWriterInterfaceErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerWriterInterfaceContract = {
  contract_id: typeof AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID;
  request_id: string;
  operation: AuditLedgerWriterOperation;
  record_ref: {
    ledger_record_id: string;
    event_id: string;
    idempotency_key: string;
    canonical_record_digest: string;
  };
  policy_gate_ref: {
    contract_id: typeof AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID;
    decision_id: string;
    decision: "approval_required";
    requires_approval: true;
    reason_codes: string[];
  };
  approval_ref: {
    contract_id: typeof AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID;
    approval_request_id: string;
    approval_status: "requested";
    approval_kind: "ledger_state_change";
    policy_gate_decision_id: string;
  };
  append_only: {
    mode: "insert_only";
    correction_model: "append_new_record_referencing_prior_record";
    forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"];
  };
  idempotency: {
    idempotency_key: string;
    canonical_record_digest: string;
    duplicate_behavior: "exact_replay_returns_existing_ref";
    collision_behavior: "fail_closed";
  };
  redaction: AuditLedgerRedactionSummary;
  source_refs: string[];
  live_execution_allowed: false;
  side_effects: [];
};

export type AuditLedgerWriterInterfaceResult =
  | {
      ok: true;
      contract: AuditLedgerWriterInterfaceContract;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      contract: null;
      errors: AuditLedgerWriterInterfaceError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AuditLedgerAppendSemanticsConformanceEntry = {
  idempotency_key: string;
  canonical_record_digest: string;
  ledger_record_id: string;
  event_id: string;
};

export type AuditLedgerAppendSemanticsConformanceInput = {
  prior_state: AuditLedgerAppendSemanticsConformanceEntry[];
  writer_interface_contract: AuditLedgerWriterInterfaceContract;
};

export type AuditLedgerAppendSemanticsConformanceErrorCode =
  | "audit_ledger_append_semantics.invalid_request"
  | "audit_ledger_append_semantics.invalid_prior_state"
  | "audit_ledger_append_semantics.duplicate_idempotency_key"
  | "audit_ledger_append_semantics.invalid_writer_contract"
  | "audit_ledger_append_semantics.idempotency_collision";

export type AuditLedgerAppendSemanticsConformanceError = {
  code: AuditLedgerAppendSemanticsConformanceErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerAppendSemanticsConformance = {
  contract_id: typeof AUDIT_LEDGER_APPEND_SEMANTICS_CONFORMANCE_CONTRACT_ID;
  outcome: "append_proposed" | "exact_replay";
  record_ref: AuditLedgerAppendSemanticsConformanceEntry;
  previous_state_count: number;
  next_state_count: number;
  proposed_state: AuditLedgerAppendSemanticsConformanceEntry[];
  approval_status: "requested";
  execution_authority: "none_conformance_only";
  write_performed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type AuditLedgerAppendSemanticsConformanceResult =
  | {
      ok: true;
      conformance: AuditLedgerAppendSemanticsConformance;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      conformance: null;
      errors: AuditLedgerAppendSemanticsConformanceError[];
      state_unchanged: true;
      write_performed: false;
      raw_input_content: "withheld";
      live_execution_allowed: false;
      side_effects: [];
    };

export type AuditLedgerWriterPersistencePreflightArtifactRefs = {
  sql_artifact: string;
  manifest_artifact: string;
  static_checker: string;
  source_packet_refs: string[];
};

export type AuditLedgerWriterPersistencePreflightInput = {
  request_id: string;
  writer_interface_contract: AuditLedgerWriterInterfaceContract;
  storage_target?: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET;
  migration_artifact_refs?: AuditLedgerWriterPersistencePreflightArtifactRefs;
};

export type AuditLedgerWriterPersistencePreflightErrorCode =
  | "audit_ledger_persistence_preflight.invalid_request"
  | "audit_ledger_persistence_preflight.policy_gate_required"
  | "audit_ledger_persistence_preflight.approval_request_required"
  | "audit_ledger_persistence_preflight.writer_interface_required"
  | "audit_ledger_persistence_preflight.canonical_digest_required"
  | "audit_ledger_persistence_preflight.idempotency_required"
  | "audit_ledger_persistence_preflight.append_only_invariant_failed"
  | "audit_ledger_persistence_preflight.redaction_failed"
  | "audit_ledger_persistence_preflight.source_refs_required"
  | "audit_ledger_persistence_preflight.migration_artifact_unverified"
  | "audit_ledger_persistence_preflight.live_execution_forbidden"
  | "audit_ledger_persistence_preflight.side_effects_forbidden";

export type AuditLedgerWriterPersistencePreflightError = {
  code: AuditLedgerWriterPersistencePreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerWriterPersistencePreflightEvidence = {
  contract_id: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID;
  request_id: string;
  storage_target: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET;
  writer_interface_ref: {
    contract_id: typeof AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID;
    request_id: string;
    operation: AuditLedgerWriterOperation;
  };
  policy_gate_ref: AuditLedgerWriterInterfaceContract["policy_gate_ref"];
  approval_request_ref: AuditLedgerWriterInterfaceContract["approval_ref"];
  record_ref: AuditLedgerWriterInterfaceContract["record_ref"];
  idempotency: AuditLedgerWriterInterfaceContract["idempotency"];
  append_only: AuditLedgerWriterInterfaceContract["append_only"];
  redaction: AuditLedgerRedactionSummary;
  source_refs: string[];
  migration_artifact_refs: AuditLedgerWriterPersistencePreflightArtifactRefs;
  live_execution_allowed: false;
  side_effects: [];
};

export type AuditLedgerWriterPersistencePreflightResult =
  | {
      ok: true;
      preflight: AuditLedgerWriterPersistencePreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      preflight: null;
      errors: AuditLedgerWriterPersistencePreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AuditLedgerDatabaseIsolationModel = {
  mode: "postgresql_rls" | "approved_equivalent_isolation";
  approved_equivalent_isolation_ref: string | null;
  deny_by_default: true;
  bypass_rls_forbidden: true;
};

export type AuditLedgerDatabaseTenantProjectScope = {
  required_row_scope_fields: ["tenant_id", "project_id"];
  scope_source: "future_audit_events_columns_or_approved_equivalent_boundary";
  enforcement: "all_writer_and_select_paths_must_filter_tenant_id_and_project_id";
  missing_scope_behavior: "fail_closed";
};

export type AuditLedgerDatabaseRoleGrantBoundary = {
  role_ref: string;
  allowed_grants: string[];
  forbidden_grants: string[];
};

export type AuditLedgerDatabaseSecurityRoleBoundaries = {
  writer_role: AuditLedgerDatabaseRoleGrantBoundary;
  select_role: AuditLedgerDatabaseRoleGrantBoundary;
  migration_role: AuditLedgerDatabaseRoleGrantBoundary;
};

export type AuditLedgerDatabaseSecurityPreflightInput = {
  request_id: string;
  persistence_preflight: AuditLedgerWriterPersistencePreflightEvidence;
  isolation_model?: AuditLedgerDatabaseIsolationModel;
  tenant_project_scope?: AuditLedgerDatabaseTenantProjectScope;
  role_boundaries?: AuditLedgerDatabaseSecurityRoleBoundaries;
  test_requirements?: string[];
  source_refs?: string[];
  live_execution_allowed?: false;
  side_effects?: [];
};

export type AuditLedgerDatabaseSecurityPreflightErrorCode =
  | "audit_ledger_database_security_preflight.invalid_request"
  | "audit_ledger_database_security_preflight.persistence_preflight_required"
  | "audit_ledger_database_security_preflight.rls_or_equivalent_required"
  | "audit_ledger_database_security_preflight.tenant_project_scope_required"
  | "audit_ledger_database_security_preflight.role_boundary_required"
  | "audit_ledger_database_security_preflight.grants_deny_by_default_required"
  | "audit_ledger_database_security_preflight.migration_artifact_ref_required"
  | "audit_ledger_database_security_preflight.tests_required"
  | "audit_ledger_database_security_preflight.source_refs_required"
  | "audit_ledger_database_security_preflight.live_execution_forbidden"
  | "audit_ledger_database_security_preflight.side_effects_forbidden";

export type AuditLedgerDatabaseSecurityPreflightError = {
  code: AuditLedgerDatabaseSecurityPreflightErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerDatabaseSecurityPreflightEvidence = {
  contract_id: typeof AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID;
  request_id: string;
  security_target: {
    storage_target: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET;
    table: "audit_events";
    schema_version: "audit_events.v0_1";
  };
  persistence_preflight_ref: {
    contract_id: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID;
    request_id: string;
    storage_target: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET;
  };
  policy_gate_ref: AuditLedgerWriterPersistencePreflightEvidence["policy_gate_ref"];
  approval_request_ref: AuditLedgerWriterPersistencePreflightEvidence["approval_request_ref"];
  writer_interface_ref: AuditLedgerWriterPersistencePreflightEvidence["writer_interface_ref"];
  migration_artifact_refs: AuditLedgerWriterPersistencePreflightArtifactRefs;
  isolation_model: AuditLedgerDatabaseIsolationModel;
  tenant_project_scope: AuditLedgerDatabaseTenantProjectScope;
  role_boundaries: AuditLedgerDatabaseSecurityRoleBoundaries;
  test_requirements_before_live_scope: string[];
  source_refs: string[];
  live_execution_allowed: false;
  side_effects: [];
};

export type AuditLedgerDatabaseSecurityPreflightResult =
  | {
      ok: true;
      preflight: AuditLedgerDatabaseSecurityPreflightEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      preflight: null;
      errors: AuditLedgerDatabaseSecurityPreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AuditLedgerPersistenceImplementationReadinessGateInput = {
  request_id: string;
  database_security_preflight: AuditLedgerDatabaseSecurityPreflightEvidence;
  minimum_source_evidence?: string[];
  source_refs?: string[];
  live_execution_allowed?: false;
  side_effects?: [];
};

export type AuditLedgerPersistenceImplementationReadinessGateErrorCode =
  | "audit_ledger_persistence_readiness_gate.invalid_request"
  | "audit_ledger_persistence_readiness_gate.database_security_preflight_required"
  | "audit_ledger_persistence_readiness_gate.migration_artifact_refs_required"
  | "audit_ledger_persistence_readiness_gate.writer_persistence_preflight_refs_required"
  | "audit_ledger_persistence_readiness_gate.database_security_preflight_refs_required"
  | "audit_ledger_persistence_readiness_gate.minimum_source_evidence_required"
  | "audit_ledger_persistence_readiness_gate.security_boundary_required"
  | "audit_ledger_persistence_readiness_gate.tests_required"
  | "audit_ledger_persistence_readiness_gate.live_execution_forbidden"
  | "audit_ledger_persistence_readiness_gate.side_effects_forbidden";

export type AuditLedgerPersistenceImplementationReadinessGateError = {
  code: AuditLedgerPersistenceImplementationReadinessGateErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerPersistenceImplementationReadinessGateEvidence = {
  contract_id: typeof AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID;
  request_id: string;
  readiness: {
    status: "source_ready_for_later_scope_request_only";
    live_persistence_scope_allowed: false;
    next_scope_requires_explicit_packet: true;
    gateway_is_security_boundary: true;
    mcp_is_adapter_only: true;
    state_changing_mcp_tools_allowed: false;
  };
  reviewed_source_chain: {
    migration_artifacts: AuditLedgerWriterPersistencePreflightArtifactRefs;
    writer_persistence_preflight_ref: AuditLedgerDatabaseSecurityPreflightEvidence["persistence_preflight_ref"];
    database_security_preflight_ref: {
      contract_id: typeof AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID;
      request_id: string;
      storage_target: typeof AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET;
    };
    layer_refs: {
      packet: string;
      layer: string;
      source_ref: string;
    }[];
  };
  minimum_source_evidence_before_live_scope: string[];
  security_requirements: {
    isolation_model: AuditLedgerDatabaseIsolationModel;
    tenant_project_scope: AuditLedgerDatabaseTenantProjectScope;
    role_boundaries: AuditLedgerDatabaseSecurityRoleBoundaries;
    deny_by_default_required: true;
    test_requirements_before_live_scope: string[];
  };
  source_refs: string[];
  live_execution_allowed: false;
  side_effects: [];
};

export type AuditLedgerPersistenceImplementationReadinessGateResult =
  | {
      ok: true;
      gate: AuditLedgerPersistenceImplementationReadinessGateEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      gate: null;
      errors: AuditLedgerPersistenceImplementationReadinessGateError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AuditLedgerPersistenceScopeRequestReadinessSource =
  | {
      kind: "direct_gateway_evidence";
      gateway_contract_id: typeof AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID;
      gateway_request_id: string;
      source_packet_refs: string[];
    }
  | {
      kind: "registered_mcp_inspection_evidence";
      tool: typeof AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL;
      gateway_contract_id: typeof AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID;
      gateway_request_id: string;
      registration_packet: "BP-0076";
      read_only_registration: true;
      source_packet_refs: string[];
    };

export type AuditLedgerPersistenceScopeRequestInput = {
  request_id: string;
  readiness_gate: AuditLedgerPersistenceImplementationReadinessGateEvidence;
  readiness_source: AuditLedgerPersistenceScopeRequestReadinessSource;
  source_refs?: string[];
  minimum_source_evidence?: string[];
  live_execution_allowed?: false;
  side_effects?: [];
};

export type AuditLedgerPersistenceScopeRequestErrorCode =
  | "audit_ledger_persistence_scope_request.invalid_request"
  | "audit_ledger_persistence_scope_request.readiness_gate_required"
  | "audit_ledger_persistence_scope_request.readiness_source_required"
  | "audit_ledger_persistence_scope_request.reviewed_refs_required"
  | "audit_ledger_persistence_scope_request.minimum_source_evidence_required"
  | "audit_ledger_persistence_scope_request.security_boundary_required"
  | "audit_ledger_persistence_scope_request.live_execution_forbidden"
  | "audit_ledger_persistence_scope_request.side_effects_forbidden";

export type AuditLedgerPersistenceScopeRequestError = {
  code: AuditLedgerPersistenceScopeRequestErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerPersistenceScopeRequestEvidence = {
  contract_id: typeof AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_CONTRACT_ID;
  request_id: string;
  scope_request: {
    status: "source_scope_request_ready_for_later_review_only";
    requested_scope: "audit_ledger_persistence_implementation";
    gateway_owned: true;
    gateway_policy_and_approval_required: true;
    live_database_scope_requested_now: false;
    live_writer_scope_requested_now: false;
    live_persistence_scope_allowed: false;
    later_scope_requires_explicit_packet: true;
    mcp_remains_adapter_only: true;
    state_changing_mcp_tools_allowed: false;
  };
  readiness_gate_ref: {
    contract_id: typeof AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID;
    request_id: string;
    readiness_status: AuditLedgerPersistenceImplementationReadinessGateEvidence["readiness"]["status"];
  };
  readiness_source: AuditLedgerPersistenceScopeRequestReadinessSource;
  reviewed_source_chain: AuditLedgerPersistenceImplementationReadinessGateEvidence["reviewed_source_chain"];
  minimum_source_evidence_before_live_scope: string[];
  security_requirements: AuditLedgerPersistenceImplementationReadinessGateEvidence["security_requirements"];
  source_refs: string[];
  live_execution_allowed: false;
  side_effects: [];
};

export type AuditLedgerPersistenceScopeRequestResult =
  | {
      ok: true;
      scope_request: AuditLedgerPersistenceScopeRequestEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      scope_request: null;
      errors: AuditLedgerPersistenceScopeRequestError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AuditLedgerRecordFromOnboardingPreviewInput = {
  ledger_record_id: string;
  preview: OnboardingContextInspectionAuditPreviewRecord;
  observed_at?: string;
  retention_class?: AuditLedgerRetentionClass;
  adapter_ref?: AuditLedgerAdapterRef;
  actor_ref?: string | null;
  session_ref?: string | null;
  resource_refs?: string[];
  capability?: string | null;
  risk_level?: number | null;
};

export type AuditEventInput = {
  validation: PacketValidationResult;
  policy_decision?: AuditPolicyDecisionEvidence;
  packet_hash?: PacketHash;
  now?: Date;
};

export function createAuditLedgerRecordFromOnboardingContextPreview(
  input: AuditLedgerRecordFromOnboardingPreviewInput,
): AuditLedgerRecord {
  const adapterRef = input.adapter_ref ?? {
    adapter_type: "gateway",
    adapter_id: input.preview.contract_id,
    contract_id: input.preview.contract_id,
  };

  return {
    ledger_record_id: input.ledger_record_id,
    event_id: input.preview.event_id,
    event_type: input.preview.event_type,
    result_status: input.preview.result_status,
    actor_ref: input.actor_ref ?? null,
    session_ref: input.session_ref ?? null,
    packet_ref: input.preview.packet_ref,
    policy_ref: null,
    approval_ref: null,
    adapter_ref: adapterRef,
    resource_refs: input.resource_refs ?? [],
    capability: input.capability ?? "context.compile",
    risk_level: input.risk_level ?? 1,
    source_refs: [
      `contract:${input.preview.contract_id}`,
      ...input.preview.source_refs,
    ],
    reason_codes: input.preview.reason_codes,
    redaction: onboardingPreviewRedaction(input.preview),
    idempotency_key: `audit:${input.preview.event_type}:${input.preview.event_id}`,
    created_at: input.preview.inspected_at,
    observed_at: input.observed_at ?? input.preview.inspected_at,
    retention_class: input.retention_class ?? "preview",
    side_effects: [],
  };
}

export function validateAuditLedgerRecord(
  value: unknown,
): AuditLedgerRecordValidationResult {
  const errors: AuditLedgerRecordValidationError[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: [
        ledgerValidationError(
          "audit_ledger.invalid_type",
          "",
          "Audit ledger record must be a plain object.",
        ),
      ],
    };
  }

  errors.push(...findForbiddenPersistenceContent(value, ""));

  for (const key of Object.keys(value)) {
    if (!auditLedgerRootKeySet.has(key)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger record field.",
        ),
      );
    }
  }

  for (const key of auditLedgerRequiredRootKeys) {
    if (!(key in value)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.missing_required_field",
          jsonPointer(key),
          "Missing required audit ledger record field.",
        ),
      );
    }
  }

  requirePatternString(
    value.ledger_record_id,
    "ledger_record_id",
    /^alr_[a-z0-9][a-z0-9_-]{7,95}$/,
    "ledger_record_id must use alr_ prefix and stable lowercase id.",
    errors,
  );
  requirePatternString(
    value.event_id,
    "event_id",
    /^evt_[a-z0-9][a-z0-9_-]{7,180}$/,
    "event_id must use evt_ prefix and stable lowercase id.",
    errors,
  );

  if (!isString(value.event_type) || !auditLedgerEventTypeSet.has(value.event_type)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/event_type",
        "event_type must be a known audit ledger event type.",
      ),
    );
  }

  if (
    !isString(value.result_status) ||
    !auditResultStatusSet.has(value.result_status)
  ) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/result_status",
        "result_status must be a known audit result status.",
      ),
    );
  }

  requireNullableString(value.actor_ref, "actor_ref", errors);
  requireNullableString(value.session_ref, "session_ref", errors);
  validatePacketRef(value.packet_ref, "/packet_ref", errors);
  validatePolicyRef(value.policy_ref, errors);
  validateApprovalRef(value.approval_ref, errors);
  validateAdapterRef(value.adapter_ref, errors);
  requireStringArray(value.resource_refs, "resource_refs", errors, {
    allowEmpty: true,
  });
  requireNullableString(value.capability, "capability", errors);
  validateNullableRiskLevel(value.risk_level, errors);
  requireStringArray(value.source_refs, "source_refs", errors, {
    allowEmpty: false,
  });
  requireStringArray(value.reason_codes, "reason_codes", errors, {
    allowEmpty: true,
  });
  validateRedactionSummary(value.redaction, errors);
  requirePatternString(
    value.idempotency_key,
    "idempotency_key",
    /^audit:[a-z0-9_]+:[a-z0-9_:.@/-]+$/,
    "idempotency_key must use a deterministic audit:<event_type>:<trusted_ref> shape.",
    errors,
  );
  requireIsoTimestamp(value.created_at, "created_at", errors);
  requireIsoTimestamp(value.observed_at, "observed_at", errors);

  if (
    !isString(value.retention_class) ||
    !auditLedgerRetentionClassSet.has(value.retention_class)
  ) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/retention_class",
        "retention_class must be a known audit retention class.",
      ),
    );
  }

  validateSideEffects(value.side_effects, errors);

  if (errors.length > 0) {
    return { ok: false, errors: dedupeLedgerErrors(errors) };
  }

  return { ok: true, record: value as AuditLedgerRecord, errors: [] };
}

export function createAppendOnlyAuditLedgerWriterContract(
  input: unknown,
): AuditLedgerWriterInterfaceResult {
  const errors: AuditLedgerWriterInterfaceError[] = [];

  if (!isPlainObject(input)) {
    return failWriterContract([
      writerContractError(
        "audit_ledger_writer.invalid_request",
        "",
        "Writer interface request must be a plain object.",
      ),
    ]);
  }

  requireWriterString(input.request_id, "/request_id", errors);

  if (
    !isString(input.operation) ||
    !auditLedgerWriterOperationSet.has(input.operation)
  ) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.invalid_request",
        "/operation",
        "operation must be a known audit ledger writer operation.",
      ),
    );
  }

  const recordValidation = validateAuditLedgerRecord(input.record);
  if (!recordValidation.ok) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.invalid_record",
        "/record",
        "record must pass the BP-0036 audit ledger record validator.",
      ),
    );
  }

  if (!matchesPattern(input.canonical_record_digest, /^sha256:[a-f0-9]{64}$/)) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.invalid_canonical_digest",
        "/canonical_record_digest",
        "canonical_record_digest must use sha256:<64 lowercase hex> shape.",
      ),
    );
  }

  validateWriterPolicyGateEvidence(input.policy_gate_decision, input.operation, errors);
  validateWriterApprovalRequestEvidence(
    input.approval_request,
    input.policy_gate_decision,
    input.operation,
    errors,
  );

  const dedupedErrors = dedupeWriterErrors(errors);
  if (dedupedErrors.length > 0 || !recordValidation.ok) {
    return failWriterContract(dedupedErrors);
  }

  const record = recordValidation.record;
  const policyGate = input.policy_gate_decision as AuditLedgerWriterPolicyGateEvidence;
  const approval = input.approval_request as AuditLedgerWriterApprovalRequestEvidence;
  const canonicalRecordDigest = input.canonical_record_digest as string;

  return {
    ok: true,
    contract: {
      contract_id: AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
      request_id: input.request_id as string,
      operation: input.operation as AuditLedgerWriterOperation,
      record_ref: {
        ledger_record_id: record.ledger_record_id,
        event_id: record.event_id,
        idempotency_key: record.idempotency_key,
        canonical_record_digest: canonicalRecordDigest,
      },
      policy_gate_ref: {
        contract_id: AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID,
        decision_id: policyGate.decision_id,
        decision: "approval_required",
        requires_approval: true,
        reason_codes: policyGate.reason_codes,
      },
      approval_ref: {
        contract_id: AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID,
        approval_request_id: approval.approval_request_id,
        approval_status: "requested",
        approval_kind: "ledger_state_change",
        policy_gate_decision_id: approval.policy_gate_ref.decision_id,
      },
      append_only: {
        mode: "insert_only",
        correction_model: "append_new_record_referencing_prior_record",
        forbidden_mutations: ["update", "delete", "truncate", "in_place_redaction"],
      },
      idempotency: {
        idempotency_key: record.idempotency_key,
        canonical_record_digest: canonicalRecordDigest,
        duplicate_behavior: "exact_replay_returns_existing_ref",
        collision_behavior: "fail_closed",
      },
      redaction: record.redaction,
      source_refs: record.source_refs,
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function evaluateAuditLedgerAppendSemantics(
  input: unknown,
): AuditLedgerAppendSemanticsConformanceResult {
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, auditLedgerAppendSemanticsInputKeys) ||
    !("prior_state" in input) ||
    !("writer_interface_contract" in input)
  ) {
    return failAppendSemanticsConformance([
      appendSemanticsError(
        "audit_ledger_append_semantics.invalid_request",
        "",
        "Conformance request must contain only prior_state and writer_interface_contract.",
      ),
    ]);
  }

  if (!Array.isArray(input.prior_state) || input.prior_state.length > 10_000) {
    return failAppendSemanticsConformance([
      appendSemanticsError(
        "audit_ledger_append_semantics.invalid_prior_state",
        "/prior_state",
        "prior_state must be an array with at most 10000 bounded conformance refs.",
      ),
    ]);
  }

  const priorState: AuditLedgerAppendSemanticsConformanceEntry[] = [];
  const seenIdempotencyKeys = new Set<string>();
  for (let index = 0; index < input.prior_state.length; index += 1) {
    const entry = input.prior_state[index];
    if (!isAuditLedgerAppendSemanticsEntry(entry)) {
      return failAppendSemanticsConformance([
        appendSemanticsError(
          "audit_ledger_append_semantics.invalid_prior_state",
          `/prior_state/${index}`,
          "State entry must contain only bounded record refs and canonical digest.",
        ),
      ]);
    }
    if (seenIdempotencyKeys.has(entry.idempotency_key)) {
      return failAppendSemanticsConformance([
        appendSemanticsError(
          "audit_ledger_append_semantics.duplicate_idempotency_key",
          `/prior_state/${index}/idempotency_key`,
          "prior_state must contain at most one entry per idempotency key.",
        ),
      ]);
    }
    seenIdempotencyKeys.add(entry.idempotency_key);
    priorState.push(cloneAppendSemanticsEntry(entry));
  }

  const writerContract = input.writer_interface_contract;
  if (!isValidAppendSemanticsWriterContract(writerContract)) {
    return failAppendSemanticsConformance([
      appendSemanticsError(
        "audit_ledger_append_semantics.invalid_writer_contract",
        "/writer_interface_contract",
        "Writer contract must be validated append-only evidence with requested approval and no execution authority.",
      ),
    ]);
  }

  const candidate = cloneAppendSemanticsEntry(writerContract.record_ref);
  const existing = priorState.find(
    (entry) => entry.idempotency_key === candidate.idempotency_key,
  );

  if (
    existing !== undefined &&
    existing.canonical_record_digest !== candidate.canonical_record_digest
  ) {
    return failAppendSemanticsConformance([
      appendSemanticsError(
        "audit_ledger_append_semantics.idempotency_collision",
        "/writer_interface_contract/record_ref/canonical_record_digest",
        "Existing idempotency key has a different canonical digest; append must fail closed.",
      ),
    ]);
  }

  const outcome = existing === undefined ? "append_proposed" : "exact_replay";
  const recordRef = existing ?? candidate;
  const proposedState =
    existing === undefined ? [...priorState, candidate] : priorState;

  return {
    ok: true,
    conformance: {
      contract_id: AUDIT_LEDGER_APPEND_SEMANTICS_CONFORMANCE_CONTRACT_ID,
      outcome,
      record_ref: cloneAppendSemanticsEntry(recordRef),
      previous_state_count: priorState.length,
      next_state_count: proposedState.length,
      proposed_state: proposedState.map(cloneAppendSemanticsEntry),
      approval_status: "requested",
      execution_authority: "none_conformance_only",
      write_performed: false,
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createAuditLedgerWriterPersistencePreflightEvidence(
  input: unknown,
): AuditLedgerWriterPersistencePreflightResult {
  const errors: AuditLedgerWriterPersistencePreflightError[] = [];

  if (!isPlainObject(input)) {
    return failPersistencePreflight([
      persistencePreflightError(
        "audit_ledger_persistence_preflight.invalid_request",
        "",
        "Persistence preflight request must be a plain object.",
      ),
    ]);
  }

  validatePersistencePreflightInputKeys(input, errors);
  requirePersistencePreflightString(input.request_id, "/request_id", errors);

  const writerInterface = input.writer_interface_contract;
  validateWriterInterfaceContractForPersistencePreflight(
    writerInterface,
    "/writer_interface_contract",
    errors,
  );

  const storageTarget =
    input.storage_target ?? AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET;
  if (storageTarget !== AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.migration_artifact_unverified",
        "/storage_target",
        "storage_target must remain audit_events.v0_1 for this source-only preflight.",
      ),
    );
  }

  const migrationArtifactRefs =
    input.migration_artifact_refs ??
    defaultAuditLedgerWriterPersistencePreflightArtifactRefs;
  validatePersistencePreflightArtifactRefs(migrationArtifactRefs, errors);

  const dedupedErrors = dedupePersistencePreflightErrors(errors);
  if (dedupedErrors.length > 0 || !isWriterInterfaceContract(writerInterface)) {
    return failPersistencePreflight(dedupedErrors);
  }

  return {
    ok: true,
    preflight: {
      contract_id: AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
      request_id: input.request_id as string,
      storage_target: AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
      writer_interface_ref: {
        contract_id: AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID,
        request_id: writerInterface.request_id,
        operation: writerInterface.operation,
      },
      policy_gate_ref: writerInterface.policy_gate_ref,
      approval_request_ref: writerInterface.approval_ref,
      record_ref: writerInterface.record_ref,
      idempotency: writerInterface.idempotency,
      append_only: writerInterface.append_only,
      redaction: writerInterface.redaction,
      source_refs: writerInterface.source_refs,
      migration_artifact_refs:
        migrationArtifactRefs as AuditLedgerWriterPersistencePreflightArtifactRefs,
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createAuditLedgerDatabaseSecurityPreflightEvidence(
  input: unknown,
): AuditLedgerDatabaseSecurityPreflightResult {
  const errors: AuditLedgerDatabaseSecurityPreflightError[] = [];

  if (!isPlainObject(input)) {
    return failDatabaseSecurityPreflight([
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.invalid_request",
        "",
        "Database security preflight request must be a plain object.",
      ),
    ]);
  }

  validateDatabaseSecurityPreflightInputKeys(input, errors);
  requireDatabaseSecurityString(input.request_id, "/request_id", errors);

  const persistencePreflight = input.persistence_preflight;
  validateDatabaseSecurityPersistencePreflight(
    persistencePreflight,
    "/persistence_preflight",
    errors,
  );

  const isolationModel =
    input.isolation_model ?? defaultAuditLedgerDatabaseIsolationModel;
  validateDatabaseSecurityIsolationModel(isolationModel, errors);

  const tenantProjectScope =
    input.tenant_project_scope ?? defaultAuditLedgerTenantProjectScope;
  validateDatabaseSecurityTenantProjectScope(tenantProjectScope, errors);

  const roleBoundaries =
    input.role_boundaries ?? defaultAuditLedgerDatabaseRoleBoundaries;
  validateDatabaseSecurityRoleBoundaries(roleBoundaries, errors);

  const testRequirements =
    input.test_requirements ?? defaultAuditLedgerDatabaseSecurityTestRequirements;
  validateDatabaseSecurityTestRequirements(testRequirements, errors);

  const sourceRefs = input.source_refs ?? defaultAuditLedgerDatabaseSecuritySourceRefs;
  validateDatabaseSecuritySourceRefs(sourceRefs, errors);

  if (
    input.live_execution_allowed !== undefined &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.live_execution_forbidden",
        "/live_execution_allowed",
        "database security preflight must keep live_execution_allowed false.",
      ),
    );
  }

  if (input.side_effects !== undefined) {
    validateDatabaseSecuritySideEffects(input.side_effects, "/side_effects", errors);
  }

  const dedupedErrors = dedupeDatabaseSecurityPreflightErrors(errors);
  if (
    dedupedErrors.length > 0 ||
    !isPersistencePreflightEvidence(persistencePreflight)
  ) {
    return failDatabaseSecurityPreflight(dedupedErrors);
  }

  return {
    ok: true,
    preflight: {
      contract_id: AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
      request_id: input.request_id as string,
      security_target: {
        storage_target: AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET,
        table: "audit_events",
        schema_version: "audit_events.v0_1",
      },
      persistence_preflight_ref: {
        contract_id: AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID,
        request_id: persistencePreflight.request_id,
        storage_target: persistencePreflight.storage_target,
      },
      policy_gate_ref: persistencePreflight.policy_gate_ref,
      approval_request_ref: persistencePreflight.approval_request_ref,
      writer_interface_ref: persistencePreflight.writer_interface_ref,
      migration_artifact_refs: persistencePreflight.migration_artifact_refs,
      isolation_model: isolationModel as AuditLedgerDatabaseIsolationModel,
      tenant_project_scope: tenantProjectScope as AuditLedgerDatabaseTenantProjectScope,
      role_boundaries: roleBoundaries as AuditLedgerDatabaseSecurityRoleBoundaries,
      test_requirements_before_live_scope: testRequirements as string[],
      source_refs: sourceRefs as string[],
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createAuditLedgerPersistenceImplementationReadinessGateEvidence(
  input: unknown,
): AuditLedgerPersistenceImplementationReadinessGateResult {
  const errors: AuditLedgerPersistenceImplementationReadinessGateError[] = [];

  if (!isPlainObject(input)) {
    return failPersistenceReadinessGate([
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.invalid_request",
        "",
        "Persistence readiness gate request must be a plain object.",
      ),
    ]);
  }

  validatePersistenceReadinessGateInputKeys(input, errors);
  requirePersistenceReadinessGateString(input.request_id, "/request_id", errors);

  const databaseSecurityPreflight = input.database_security_preflight;
  validatePersistenceReadinessGateDatabaseSecurityPreflight(
    databaseSecurityPreflight,
    errors,
  );

  const minimumSourceEvidence =
    input.minimum_source_evidence ??
    defaultAuditLedgerPersistenceReadinessMinimumSourceEvidence;
  validatePersistenceReadinessGateMinimumSourceEvidence(minimumSourceEvidence, errors);

  const sourceRefs =
    input.source_refs ?? defaultAuditLedgerPersistenceReadinessSourceRefs;
  validatePersistenceReadinessGateSourceRefs(sourceRefs, errors);

  if (
    input.live_execution_allowed !== undefined &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.live_execution_forbidden",
        "/live_execution_allowed",
        "persistence implementation readiness gate must keep live_execution_allowed false.",
      ),
    );
  }

  if (input.side_effects !== undefined) {
    validatePersistenceReadinessGateSideEffects(
      input.side_effects,
      "/side_effects",
      errors,
    );
  }

  const dedupedErrors = dedupePersistenceReadinessGateErrors(errors);
  if (
    dedupedErrors.length > 0 ||
    !isDatabaseSecurityPreflightEvidence(databaseSecurityPreflight)
  ) {
    return failPersistenceReadinessGate(dedupedErrors);
  }

  return {
    ok: true,
    gate: {
      contract_id: AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID,
      request_id: input.request_id as string,
      readiness: {
        status: "source_ready_for_later_scope_request_only",
        live_persistence_scope_allowed: false,
        next_scope_requires_explicit_packet: true,
        gateway_is_security_boundary: true,
        mcp_is_adapter_only: true,
        state_changing_mcp_tools_allowed: false,
      },
      reviewed_source_chain: {
        migration_artifacts: databaseSecurityPreflight.migration_artifact_refs,
        writer_persistence_preflight_ref:
          databaseSecurityPreflight.persistence_preflight_ref,
        database_security_preflight_ref: {
          contract_id: AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID,
          request_id: databaseSecurityPreflight.request_id,
          storage_target: databaseSecurityPreflight.security_target.storage_target,
        },
        layer_refs: defaultAuditLedgerPersistenceReadinessLayerRefs,
      },
      minimum_source_evidence_before_live_scope: minimumSourceEvidence as string[],
      security_requirements: {
        isolation_model: databaseSecurityPreflight.isolation_model,
        tenant_project_scope: databaseSecurityPreflight.tenant_project_scope,
        role_boundaries: databaseSecurityPreflight.role_boundaries,
        deny_by_default_required: true,
        test_requirements_before_live_scope:
          databaseSecurityPreflight.test_requirements_before_live_scope,
      },
      source_refs: sourceRefs as string[],
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createAuditLedgerPersistenceScopeRequestEvidence(
  input: unknown,
): AuditLedgerPersistenceScopeRequestResult {
  const errors: AuditLedgerPersistenceScopeRequestError[] = [];

  if (!isPlainObject(input)) {
    return failPersistenceScopeRequest([
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.invalid_request",
        "",
        "Persistence scope request must be a plain object.",
      ),
    ]);
  }

  validatePersistenceScopeRequestInputKeys(input, errors);
  requirePersistenceScopeRequestString(input.request_id, "/request_id", errors);

  const readinessGate = input.readiness_gate;
  validatePersistenceScopeRequestReadinessGate(readinessGate, errors);

  const readinessSource = input.readiness_source;
  validatePersistenceScopeRequestReadinessSource(readinessSource, errors);

  const sourceRefs =
    input.source_refs ?? defaultAuditLedgerPersistenceScopeRequestSourceRefs;
  validatePersistenceScopeRequestSourceRefs(sourceRefs, errors);

  const minimumSourceEvidence =
    input.minimum_source_evidence ??
    buildDefaultPersistenceScopeMinimumSourceEvidence(readinessGate);
  validatePersistenceScopeMinimumSourceEvidence(minimumSourceEvidence, errors);

  if (
    input.live_execution_allowed !== undefined &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.live_execution_forbidden",
        "/live_execution_allowed",
        "persistence scope request must keep live_execution_allowed false.",
      ),
    );
  }

  if (input.side_effects !== undefined) {
    validatePersistenceScopeRequestSideEffects(
      input.side_effects,
      "/side_effects",
      errors,
    );
  }

  const dedupedErrors = dedupePersistenceScopeRequestErrors(errors);
  if (
    dedupedErrors.length > 0 ||
    !isPersistenceReadinessGateEvidence(readinessGate) ||
    !isPersistenceScopeReadinessSource(readinessSource)
  ) {
    return failPersistenceScopeRequest(dedupedErrors);
  }

  return {
    ok: true,
    scope_request: {
      contract_id: AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_CONTRACT_ID,
      request_id: input.request_id as string,
      scope_request: {
        status: "source_scope_request_ready_for_later_review_only",
        requested_scope: "audit_ledger_persistence_implementation",
        gateway_owned: true,
        gateway_policy_and_approval_required: true,
        live_database_scope_requested_now: false,
        live_writer_scope_requested_now: false,
        live_persistence_scope_allowed: false,
        later_scope_requires_explicit_packet: true,
        mcp_remains_adapter_only: true,
        state_changing_mcp_tools_allowed: false,
      },
      readiness_gate_ref: {
        contract_id: AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID,
        request_id: readinessGate.request_id,
        readiness_status: readinessGate.readiness.status,
      },
      readiness_source: readinessSource,
      reviewed_source_chain: readinessGate.reviewed_source_chain,
      minimum_source_evidence_before_live_scope: minimumSourceEvidence as string[],
      security_requirements: readinessGate.security_requirements,
      source_refs: sourceRefs as string[],
      live_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createAuditEvents(input: AuditEventInput): AuditEvent[] {
  const createdAt = (input.now ?? new Date()).toISOString();
  const validationEvent = createPacketValidationEvent(input, createdAt);

  if (!input.validation.ok || input.policy_decision === undefined) {
    return [validationEvent];
  }

  return [
    validationEvent,
    createPolicyDecisionEvent(
      input.validation.packet,
      input.policy_decision,
      input.packet_hash,
      createdAt,
    ),
  ];
}

export function createOnboardingContextInspectionAuditPreview(
  input: OnboardingContextInspectionAuditPreviewInput,
): OnboardingContextInspectionAuditPreviewRecord[] {
  const reasonCodes = onboardingContextInspectionReasonCodes(input);
  const eventType = input.ok
    ? "context_packet_compiled"
    : "context_packet_inspection_rejected";

  return [
    {
      event_id: auditEventId(
        input.packet_ref?.packet_id ?? input.request_id ?? "unknown_request",
        eventType,
        input.inspected_at,
      ),
      event_type: eventType,
      contract_id: input.contract_id,
      request_id: input.request_id,
      inspected_at: input.inspected_at,
      packet_ref: input.packet_ref,
      profile_refs: input.profile_refs ?? null,
      source_refs: input.ok ? input.trusted_source_refs : input.source_docs,
      result_status: input.ok ? "success" : "failure",
      reason_codes: reasonCodes,
      side_effects: [],
    },
  ];
}

function createPacketValidationEvent(
  input: AuditEventInput,
  createdAt: string,
): AuditEvent {
  if (!input.validation.ok) {
    return {
      event_id: auditEventId("unknown_packet", "packet_rejected", createdAt),
      event_type: "packet_rejected",
      actor_id: null,
      session_id: null,
      packet_ref: null,
      policy_ref: null,
      resource_refs: [],
      capability: null,
      result_status: "failure",
      reason_codes: dedupeReasonCodes(
        input.validation.errors.map((error) => error.code),
      ),
      created_at: createdAt,
    };
  }

  const packet = input.validation.packet;

  return {
    event_id: auditEventId(packet.packet_id, "packet_validated", createdAt),
    event_type: "packet_validated",
    actor_id: packet.actor_id,
    session_id: packet.session_id,
    packet_ref: packetRef(packet, input.packet_hash),
    policy_ref: null,
    resource_refs: packet.resource_refs,
    capability: packet.permission_envelope.allow[0] ?? null,
    result_status: "success",
    reason_codes: [],
    created_at: createdAt,
  };
}

function createPolicyDecisionEvent(
  packet: UniversalPacket,
  policyDecision: AuditPolicyDecisionEvidence,
  packetHash: PacketHash | undefined,
  createdAt: string,
): AuditEvent {
  const reasonCodes: AuditReasonCode[] =
    policyDecision.packet_id === packet.packet_id
      ? policyDecision.reason_codes
      : [...policyDecision.reason_codes, "audit.policy_packet_mismatch"];

  return {
    event_id: auditEventId(packet.packet_id, "policy_checked", createdAt),
    event_type: "policy_checked",
    actor_id: policyDecision.actor_id,
    session_id: policyDecision.session_id,
    packet_ref: packetRef(packet, packetHash),
    policy_ref: {
      decision_id: policyDecision.decision_id,
      decision: policyDecision.decision,
      requires_approval: policyDecision.requires_approval,
    },
    resource_refs: policyDecision.resource_refs,
    capability: policyDecision.capability,
    result_status: policyDecision.decision,
    reason_codes: dedupeReasonCodes(reasonCodes),
    created_at: createdAt,
  };
}

function packetRef(
  packet: UniversalPacket,
  packetHash: PacketHash | undefined,
): AuditPacketRef {
  return {
    packet_id: packet.packet_id,
    packet_type: packet.packet_type,
    ...(packetHash === undefined ? {} : { packet_hash: packetHash }),
  };
}

function auditEventId(
  packetId: string,
  eventType:
    AuditEventType | OnboardingContextInspectionAuditPreviewRecord["event_type"],
  createdAt: string,
): string {
  return `evt_${sanitizeId(packetId)}_${sanitizeId(eventType)}_${sanitizeId(createdAt)}`;
}

function sanitizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function dedupeReasonCodes(reasonCodes: AuditReasonCode[]): AuditReasonCode[] {
  return [...new Set(reasonCodes)];
}

function onboardingContextInspectionReasonCodes(
  input: OnboardingContextInspectionAuditPreviewInput,
): string[] {
  if (input.ok) {
    return [];
  }

  return [
    ...new Set([
      ...(input.request_errors ?? []).map((error) => error.code),
      ...(input.compiler_errors ?? []).map((error) => error.code),
      ...(input.profile_errors ?? []).map((error) => error.code),
    ]),
  ];
}

const auditLedgerRootKeys = [
  "ledger_record_id",
  "event_id",
  "event_type",
  "result_status",
  "actor_ref",
  "session_ref",
  "packet_ref",
  "policy_ref",
  "approval_ref",
  "adapter_ref",
  "resource_refs",
  "capability",
  "risk_level",
  "source_refs",
  "reason_codes",
  "redaction",
  "idempotency_key",
  "created_at",
  "observed_at",
  "retention_class",
  "side_effects",
] as const;

const redactionSummaryKeys = [
  "raw_rejected_command",
  "raw_rejected_value",
  "raw_invalid_payload_content",
  "secret_like_values",
] as const;

const adapterRefKeys = ["adapter_type", "adapter_id", "contract_id"] as const;
const approvalRefKeys = ["approval_id", "decision"] as const;
const sideEffectKeys = [
  "effect_type",
  "resource_ref",
  "status",
  "result_packet_ref",
] as const;
const packetRefKeys = ["packet_id", "packet_type", "packet_hash"] as const;
const policyRefKeys = ["decision_id", "decision", "requires_approval"] as const;

const auditLedgerRequiredRootKeys = new Set<string>(auditLedgerRootKeys);
const auditLedgerRootKeySet = new Set<string>(auditLedgerRootKeys);
const auditLedgerEventTypeSet = new Set<string>(auditLedgerEventTypes);
const auditLedgerRetentionClassSet = new Set<string>(auditLedgerRetentionClasses);
const auditResultStatusSet = new Set<string>([
  "success",
  "failure",
  "allow",
  "deny",
  "approval_required",
]);
const redactionStateSet = new Set<string>(["not_present", "withheld"]);
const adapterTypeSet = new Set<string>([
  "gateway",
  "mcp",
  "rest",
  "cli",
  "ui",
  "worker",
  "substrate",
]);
const approvalDecisionSet = new Set<string>(["requested", "granted", "denied"]);
const sideEffectStatusSet = new Set<string>([
  "requested",
  "started",
  "completed",
  "failed",
  "blocked",
]);
const packetTypeSet = new Set<string>([
  "ContextPacket",
  "CapabilityPacket",
  "ExecutionPacket",
  "EnvironmentPacket",
  "ResourcePacket",
  "ResultPacket",
  "AuditPacket",
  "PatchPacket",
  "SecretUsePacket",
  "NodeTelemetryPacket",
]);
const policyDecisionSet = new Set<string>(["allow", "deny", "approval_required"]);
const auditLedgerWriterOperationSet = new Set<string>([
  "ledger.record.append",
  "ledger.record.correct",
  "ledger.record.retry",
]);
const auditLedgerAppendSemanticsInputKeys = new Set([
  "prior_state",
  "writer_interface_contract",
]);
const auditLedgerAppendSemanticsEntryKeys = new Set([
  "idempotency_key",
  "canonical_record_digest",
  "ledger_record_id",
  "event_id",
]);
const auditLedgerWriterInterfaceContractKeys = new Set([
  "contract_id",
  "request_id",
  "operation",
  "record_ref",
  "policy_gate_ref",
  "approval_ref",
  "append_only",
  "idempotency",
  "redaction",
  "source_refs",
  "live_execution_allowed",
  "side_effects",
]);
const persistencePreflightInputKeys = new Set([
  "request_id",
  "writer_interface_contract",
  "storage_target",
  "migration_artifact_refs",
]);
const persistencePreflightArtifactRefKeys = new Set([
  "sql_artifact",
  "manifest_artifact",
  "static_checker",
  "source_packet_refs",
]);
const databaseSecurityPreflightInputKeys = new Set([
  "request_id",
  "persistence_preflight",
  "isolation_model",
  "tenant_project_scope",
  "role_boundaries",
  "test_requirements",
  "source_refs",
  "live_execution_allowed",
  "side_effects",
]);
const persistenceReadinessGateInputKeys = new Set([
  "request_id",
  "database_security_preflight",
  "minimum_source_evidence",
  "source_refs",
  "live_execution_allowed",
  "side_effects",
]);
const persistenceScopeRequestInputKeys = new Set([
  "request_id",
  "readiness_gate",
  "readiness_source",
  "minimum_source_evidence",
  "source_refs",
  "live_execution_allowed",
  "side_effects",
]);
const databaseSecurityIsolationModelKeys = new Set([
  "mode",
  "approved_equivalent_isolation_ref",
  "deny_by_default",
  "bypass_rls_forbidden",
]);
const databaseSecurityTenantProjectScopeKeys = new Set([
  "required_row_scope_fields",
  "scope_source",
  "enforcement",
  "missing_scope_behavior",
]);
const databaseSecurityRoleBoundaryKeys = new Set([
  "role_ref",
  "allowed_grants",
  "forbidden_grants",
]);
const databaseSecurityRoleBoundariesKeys = new Set([
  "writer_role",
  "select_role",
  "migration_role",
]);
const defaultAuditLedgerWriterPersistencePreflightArtifactRefs: AuditLedgerWriterPersistencePreflightArtifactRefs =
  {
    sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
    manifest_artifact:
      "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
    static_checker: "scripts/check-audit-ledger-migrations.mjs",
    source_packet_refs: ["BP-0039", "BP-0040", "BP-0044", "BP-0045", "BP-0052"],
  };
const defaultAuditLedgerDatabaseIsolationModel: AuditLedgerDatabaseIsolationModel = {
  mode: "postgresql_rls",
  approved_equivalent_isolation_ref: null,
  deny_by_default: true,
  bypass_rls_forbidden: true,
};
const defaultAuditLedgerTenantProjectScope: AuditLedgerDatabaseTenantProjectScope = {
  required_row_scope_fields: ["tenant_id", "project_id"],
  scope_source: "future_audit_events_columns_or_approved_equivalent_boundary",
  enforcement: "all_writer_and_select_paths_must_filter_tenant_id_and_project_id",
  missing_scope_behavior: "fail_closed",
};
const defaultAuditLedgerDatabaseRoleBoundaries: AuditLedgerDatabaseSecurityRoleBoundaries =
  {
    writer_role: {
      role_ref: "role_ref:audit_ledger_writer",
      allowed_grants: ["insert_audit_events", "select_idempotency_lookup_scoped"],
      forbidden_grants: [
        "update",
        "delete",
        "truncate",
        "alter",
        "drop",
        "superuser",
        "bypassrls",
        "unscoped_select",
      ],
    },
    select_role: {
      role_ref: "role_ref:audit_ledger_reader",
      allowed_grants: ["select_scoped_audit_events"],
      forbidden_grants: [
        "insert",
        "update",
        "delete",
        "truncate",
        "alter",
        "drop",
        "superuser",
        "bypassrls",
        "unscoped_select",
      ],
    },
    migration_role: {
      role_ref: "role_ref:audit_ledger_migrator",
      allowed_grants: ["approved_migration_execution_only"],
      forbidden_grants: [
        "runtime_writer_use",
        "unapproved_ddl",
        "superuser",
        "bypassrls",
        "secret_inline_credentials",
      ],
    },
  };
const defaultAuditLedgerDatabaseSecurityTestRequirements = [
  "static_security_preflight_check",
  "rls_policy_or_equivalent_isolation_test",
  "tenant_project_scope_enforcement_test",
  "writer_role_grant_test",
  "select_role_grant_test",
  "deny_by_default_no_public_access_test",
  "no_bypassrls_or_superuser_writer_test",
];
const defaultAuditLedgerDatabaseSecuritySourceRefs = [
  "packet:BP-0044",
  "packet:BP-0045",
  "packet:BP-0058",
  "packet:BP-0059",
  "packet:BP-0065",
  "docs:docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
  "docs:docs/architecture/DATA_MODEL.md",
  "docs:docs/architecture/POLICY_AND_AUDIT.md",
];
const defaultAuditLedgerPersistenceReadinessLayerRefs = [
  {
    packet: "BP-0065",
    layer: "audit_helper",
    source_ref:
      "packages/audit/src/index.ts:createAuditLedgerDatabaseSecurityPreflightEvidence",
  },
  {
    packet: "BP-0066",
    layer: "ui_model",
    source_ref:
      "apps/console/src/lib/console-model.ts:buildAuditLedgerDatabaseSecurityPreflightModel",
  },
  {
    packet: "BP-0067",
    layer: "gateway_contract",
    source_ref:
      "apps/api/src/audit-ledger-database-security-preflight.ts:inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest",
  },
  {
    packet: "BP-0068",
    layer: "fastify_route",
    source_ref:
      "apps/api/src/server.ts:POST /v1/audit-ledger/database-security/preflight/inspect",
  },
  {
    packet: "BP-0069",
    layer: "mcp_adapter",
    source_ref:
      "packages/mcp/src/index.ts:inspectAuditLedgerDatabaseSecurityPreflightThroughMcpAdapterContract",
  },
  {
    packet: "BP-0070",
    layer: "mcp_registration",
    source_ref:
      "packages/mcp/src/index.ts:mcpAuditLedgerDatabaseSecurityPreflightToolRegistration",
  },
];
const defaultAuditLedgerPersistenceReadinessMinimumSourceEvidence = [
  "BP-0044 audit_events.v0_1 SQL artifact and manifest refs",
  "BP-0045 repo-local migration static checker evidence",
  "BP-0058 source-only writer persistence preflight contract",
  "BP-0059 pure writer persistence preflight helper evidence",
  "BP-0065 pure database security preflight helper evidence",
  "BP-0066 UI rendering evidence for database security preflight",
  "BP-0067 Gateway contract evidence for database security preflight",
  "BP-0068 read-only Fastify route evidence for database security preflight",
  "BP-0069 read-only MCP adapter evidence for database security preflight",
  "BP-0070 read-only MCP registration evidence for database security preflight",
  "RLS or approved equivalent isolation source evidence",
  "tenant_id and project_id scope source evidence or approved equivalent boundary",
  "writer/select/migration role boundary and deny-by-default grant evidence",
  "required static, RLS/equivalent, scope, role, grant, and no-bypass tests",
  "secret-reference-only future credential plan",
  "explicit later build packet requesting DB/writer scope through LNSAT Gateway policy and approval",
];
const defaultAuditLedgerPersistenceReadinessSourceRefs = [
  "packet:BP-0044",
  "packet:BP-0045",
  "packet:BP-0058",
  "packet:BP-0059",
  "packet:BP-0065",
  "packet:BP-0066",
  "packet:BP-0067",
  "packet:BP-0068",
  "packet:BP-0069",
  "packet:BP-0070",
  "packet:BP-0071",
  "docs:docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
  "docs:docs/architecture/DATA_MODEL.md",
  "docs:docs/architecture/POLICY_AND_AUDIT.md",
  "docs:docs/architecture/MCP_ADAPTER_DESIGN.md",
];
const defaultAuditLedgerPersistenceScopeRequestSourceRefs = [
  "packet:BP-0044",
  "packet:BP-0045",
  "packet:BP-0058",
  "packet:BP-0059",
  "packet:BP-0065",
  "packet:BP-0066",
  "packet:BP-0067",
  "packet:BP-0068",
  "packet:BP-0069",
  "packet:BP-0070",
  "packet:BP-0071",
  "packet:BP-0073",
  "packet:BP-0075",
  "packet:BP-0076",
  "packet:BP-0077",
  "docs:docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
  "docs:docs/architecture/DATA_MODEL.md",
  "docs:docs/architecture/POLICY_AND_AUDIT.md",
  "docs:docs/architecture/MCP_ADAPTER_DESIGN.md",
  "docs:docs/reference/CONTRACT_PROVENANCE.md",
];
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function onboardingPreviewRedaction(
  preview: OnboardingContextInspectionAuditPreviewRecord,
): AuditLedgerRedactionSummary {
  if (preview.result_status === "success") {
    return {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    };
  }

  return {
    raw_rejected_command: "withheld",
    raw_rejected_value: "withheld",
    raw_invalid_payload_content: "withheld",
    secret_like_values: "withheld",
  };
}

function validateWriterPolicyGateEvidence(
  value: unknown,
  operation: unknown,
  errors: AuditLedgerWriterInterfaceError[],
): void {
  if (value === undefined || value === null) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_required",
        "/policy_gate_decision",
        "BP-0039 policy gate evidence is required.",
      ),
    );
    return;
  }

  if (!isPlainObject(value)) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_invalid",
        "/policy_gate_decision",
        "BP-0039 policy gate evidence must be an object.",
      ),
    );
    return;
  }

  if (value.contract_id !== AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_invalid",
        "/policy_gate_decision/contract_id",
        "policy gate evidence must use the BP-0039 contract id.",
      ),
    );
  }
  requireWriterString(value.decision_id, "/policy_gate_decision/decision_id", errors);
  requireWriterString(value.request_id, "/policy_gate_decision/request_id", errors);
  requireWriterString(value.actor_id, "/policy_gate_decision/actor_id", errors);
  requireWriterString(value.session_id, "/policy_gate_decision/session_id", errors);

  if (value.operation !== operation) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_invalid",
        "/policy_gate_decision/operation",
        "policy gate operation must match writer request operation.",
      ),
    );
  }

  requireWriterStringArray(
    value.resource_refs,
    "/policy_gate_decision/resource_refs",
    errors,
  );

  if (value.writer_capability !== AUDIT_LEDGER_WRITER_CAPABILITY) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_invalid",
        "/policy_gate_decision/writer_capability",
        "policy gate evidence must name the append-only audit ledger writer capability.",
      ),
    );
  }

  if (value.decision !== "approval_required" || value.requires_approval !== true) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_invalid",
        "/policy_gate_decision/decision",
        "state-changing writer operations require approval_required policy gate evidence.",
      ),
    );
  }

  if (!Array.isArray(value.reason_codes) || value.reason_codes.length === 0) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.policy_gate_invalid",
        "/policy_gate_decision/reason_codes",
        "policy gate evidence must include stable reason codes.",
      ),
    );
  }

  requireEmptySideEffects(
    value.side_effects,
    "/policy_gate_decision/side_effects",
    "audit_ledger_writer.policy_gate_invalid",
    errors,
  );
}

function validateWriterApprovalRequestEvidence(
  value: unknown,
  policyGateValue: unknown,
  operation: unknown,
  errors: AuditLedgerWriterInterfaceError[],
): void {
  if (value === undefined || value === null) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_required",
        "/approval_request",
        "BP-0040 approval request evidence is required.",
      ),
    );
    return;
  }

  if (!isPlainObject(value)) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request",
        "BP-0040 approval request evidence must be an object.",
      ),
    );
    return;
  }

  if (value.contract_id !== AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/contract_id",
        "approval request evidence must use the BP-0040 contract id.",
      ),
    );
  }
  requireWriterString(
    value.approval_request_id,
    "/approval_request/approval_request_id",
    errors,
  );

  if (
    value.approval_status !== "requested" ||
    value.approval_kind !== "ledger_state_change"
  ) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/approval_status",
        "state-changing writer operations require requested ledger_state_change approval evidence.",
      ),
    );
  }

  if (value.operation !== operation) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/operation",
        "approval request operation must match writer request operation.",
      ),
    );
  }

  if (value.writer_capability !== AUDIT_LEDGER_WRITER_CAPABILITY) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/writer_capability",
        "approval request evidence must name the append-only audit ledger writer capability.",
      ),
    );
  }

  requireEmptySideEffects(
    value.side_effects,
    "/approval_request/side_effects",
    "audit_ledger_writer.approval_request_invalid",
    errors,
  );

  if (!isPlainObject(value.policy_gate_ref)) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/policy_gate_ref",
        "approval request evidence must reference BP-0039 policy gate evidence.",
      ),
    );
    return;
  }

  if (
    value.policy_gate_ref.contract_id !== AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID
  ) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/policy_gate_ref/contract_id",
        "approval request policy ref must use the BP-0039 contract id.",
      ),
    );
  }
  if (
    value.policy_gate_ref.decision !== "approval_required" ||
    value.policy_gate_ref.requires_approval !== true
  ) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/policy_gate_ref/decision",
        "approval request policy ref must preserve approval_required gate evidence.",
      ),
    );
  }

  if (
    isPlainObject(policyGateValue) &&
    value.policy_gate_ref.decision_id !== policyGateValue.decision_id
  ) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_policy_mismatch",
        "/approval_request/policy_gate_ref/decision_id",
        "approval request evidence must reference the supplied policy gate decision.",
      ),
    );
  }

  if (!Array.isArray(value.evidence_refs) || value.evidence_refs.length === 0) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.approval_request_invalid",
        "/approval_request/evidence_refs",
        "approval request evidence must include source evidence refs.",
      ),
    );
  }
}

function validatePersistencePreflightInputKeys(
  value: Record<string, unknown>,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  for (const key of Object.keys(value)) {
    if (!persistencePreflightInputKeys.has(key)) {
      errors.push(
        persistencePreflightError(
          "audit_ledger_persistence_preflight.invalid_request",
          jsonPointer(key),
          "Unexpected persistence preflight request field.",
        ),
      );
    }
  }
}

function validateWriterInterfaceContractForPersistencePreflight(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (value === undefined || value === null) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.writer_interface_required",
        path,
        "BP-0052 writer interface contract evidence is required.",
      ),
    );
    return;
  }

  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.writer_interface_required",
        path,
        "BP-0052 writer interface contract evidence must be an object.",
      ),
    );
    return;
  }

  if (value.contract_id !== AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.writer_interface_required",
        `${path}/contract_id`,
        "writer interface contract must use the BP-0052 contract id.",
      ),
    );
  }
  requirePersistencePreflightString(value.request_id, `${path}/request_id`, errors);

  if (
    !isString(value.operation) ||
    !auditLedgerWriterOperationSet.has(value.operation)
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.writer_interface_required",
        `${path}/operation`,
        "writer interface operation must be a known append-only ledger operation.",
      ),
    );
  }

  validatePreflightPolicyGateRef(
    value.policy_gate_ref,
    `${path}/policy_gate_ref`,
    errors,
  );
  validatePreflightApprovalRef(
    value.approval_ref,
    value.policy_gate_ref,
    `${path}/approval_ref`,
    errors,
  );
  validatePreflightRecordRef(value.record_ref, `${path}/record_ref`, errors);
  validatePreflightIdempotency(
    value.idempotency,
    value.record_ref,
    `${path}/idempotency`,
    errors,
  );
  validatePreflightAppendOnly(value.append_only, `${path}/append_only`, errors);
  validatePreflightRedaction(value.redaction, `${path}/redaction`, errors);
  validatePreflightSourceRefs(value.source_refs, `${path}/source_refs`, errors);

  if (value.live_execution_allowed !== false) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.live_execution_forbidden",
        `${path}/live_execution_allowed`,
        "source-only persistence preflight must keep live_execution_allowed false.",
      ),
    );
  }

  if (!Array.isArray(value.side_effects) || value.side_effects.length !== 0) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.side_effects_forbidden",
        `${path}/side_effects`,
        "source-only persistence preflight must preserve side_effects: [].",
      ),
    );
  }
}

function validatePreflightPolicyGateRef(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.policy_gate_required",
        path,
        "BP-0039 policy gate ref is required.",
      ),
    );
    return;
  }

  if (
    value.contract_id !== AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID ||
    value.decision !== "approval_required" ||
    value.requires_approval !== true
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.policy_gate_required",
        path,
        "policy gate ref must preserve BP-0039 approval_required evidence.",
      ),
    );
  }

  requirePersistencePreflightString(value.decision_id, `${path}/decision_id`, errors);
  validatePreflightStringArray(
    value.reason_codes,
    `${path}/reason_codes`,
    "audit_ledger_persistence_preflight.policy_gate_required",
    errors,
  );
}

function validatePreflightApprovalRef(
  value: unknown,
  policyGateRef: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.approval_request_required",
        path,
        "BP-0040 approval request ref is required.",
      ),
    );
    return;
  }

  if (
    value.contract_id !== AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID ||
    value.approval_status !== "requested" ||
    value.approval_kind !== "ledger_state_change"
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.approval_request_required",
        path,
        "approval request ref must preserve BP-0040 requested ledger_state_change evidence.",
      ),
    );
  }

  requirePersistencePreflightString(
    value.approval_request_id,
    `${path}/approval_request_id`,
    errors,
  );

  if (
    isPlainObject(policyGateRef) &&
    value.policy_gate_decision_id !== policyGateRef.decision_id
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.approval_request_required",
        `${path}/policy_gate_decision_id`,
        "approval request ref must match the BP-0039 policy gate decision id.",
      ),
    );
  }
}

function validatePreflightRecordRef(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.canonical_digest_required",
        path,
        "record_ref with canonical digest is required.",
      ),
    );
    return;
  }

  requirePersistencePreflightString(
    value.ledger_record_id,
    `${path}/ledger_record_id`,
    errors,
  );
  requirePersistencePreflightString(value.event_id, `${path}/event_id`, errors);
  requirePersistencePreflightString(
    value.idempotency_key,
    `${path}/idempotency_key`,
    errors,
  );

  if (!matchesPattern(value.canonical_record_digest, /^sha256:[a-f0-9]{64}$/)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.canonical_digest_required",
        `${path}/canonical_record_digest`,
        "canonical record digest must use sha256:<64 lowercase hex> shape.",
      ),
    );
  }
}

function validatePreflightIdempotency(
  value: unknown,
  recordRef: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.idempotency_required",
        path,
        "idempotency evidence is required.",
      ),
    );
    return;
  }

  if (
    !isPlainObject(recordRef) ||
    value.idempotency_key !== recordRef.idempotency_key ||
    value.canonical_record_digest !== recordRef.canonical_record_digest ||
    value.duplicate_behavior !== "exact_replay_returns_existing_ref" ||
    value.collision_behavior !== "fail_closed"
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.idempotency_required",
        path,
        "idempotency evidence must preserve exact replay and collision behavior.",
      ),
    );
  }
}

function validatePreflightAppendOnly(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.append_only_invariant_failed",
        path,
        "append-only invariants are required.",
      ),
    );
    return;
  }

  if (
    value.mode !== "insert_only" ||
    value.correction_model !== "append_new_record_referencing_prior_record" ||
    !arrayEquals(value.forbidden_mutations, [
      "update",
      "delete",
      "truncate",
      "in_place_redaction",
    ])
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.append_only_invariant_failed",
        path,
        "append-only invariants must forbid update, delete, truncate, and in-place redaction.",
      ),
    );
  }
}

function validatePreflightRedaction(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.redaction_failed",
        path,
        "redaction summary is required.",
      ),
    );
    return;
  }

  for (const key of redactionSummaryKeys) {
    if (!isString(value[key]) || !redactionStateSet.has(value[key])) {
      errors.push(
        persistencePreflightError(
          "audit_ledger_persistence_preflight.redaction_failed",
          `${path}/${key}`,
          "redaction summary values must be not_present or withheld.",
        ),
      );
    }
  }
}

function validatePreflightSourceRefs(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  validatePreflightStringArray(
    value,
    path,
    "audit_ledger_persistence_preflight.source_refs_required",
    errors,
  );
}

function validatePersistencePreflightArtifactRefs(
  value: unknown,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.migration_artifact_unverified",
        "/migration_artifact_refs",
        "migration artifact refs are required for audit_events.v0_1 preflight.",
      ),
    );
    return;
  }

  for (const key of Object.keys(value)) {
    if (!persistencePreflightArtifactRefKeys.has(key)) {
      errors.push(
        persistencePreflightError(
          "audit_ledger_persistence_preflight.migration_artifact_unverified",
          `/migration_artifact_refs/${escapeJsonPointerSegment(key)}`,
          "Unexpected migration artifact ref field.",
        ),
      );
    }
  }

  requirePersistencePreflightString(
    value.sql_artifact,
    "/migration_artifact_refs/sql_artifact",
    errors,
  );
  requirePersistencePreflightString(
    value.manifest_artifact,
    "/migration_artifact_refs/manifest_artifact",
    errors,
  );
  requirePersistencePreflightString(
    value.static_checker,
    "/migration_artifact_refs/static_checker",
    errors,
  );
  validatePreflightStringArray(
    value.source_packet_refs,
    "/migration_artifact_refs/source_packet_refs",
    "audit_ledger_persistence_preflight.migration_artifact_unverified",
    errors,
  );

  if (
    Array.isArray(value.source_packet_refs) &&
    (!value.source_packet_refs.includes("BP-0044") ||
      !value.source_packet_refs.includes("BP-0045"))
  ) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.migration_artifact_unverified",
        "/migration_artifact_refs/source_packet_refs",
        "migration artifact refs must include BP-0044 and BP-0045 source evidence.",
      ),
    );
  }
}

function requirePersistencePreflightString(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!isNonEmptyString(value) || isForbiddenRawPersistenceString(value)) {
    errors.push(
      persistencePreflightError(
        "audit_ledger_persistence_preflight.invalid_request",
        path,
        "Value must be a safe non-empty string.",
      ),
    );
  }
}

function validatePreflightStringArray(
  value: unknown,
  path: string,
  code: AuditLedgerWriterPersistencePreflightErrorCode,
  errors: AuditLedgerWriterPersistencePreflightError[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistencePreflightError(
        code,
        path,
        "Value must be a safe non-empty string array.",
      ),
    );
    return;
  }

  value.forEach((item, index) => {
    if (
      !isNonEmptyString(item) ||
      isForbiddenRawPersistenceString(item) ||
      isSecretLikePersistenceString(item)
    ) {
      errors.push(
        persistencePreflightError(
          code,
          `${path}/${index}`,
          "Value must be a safe non-empty string.",
        ),
      );
    }
  });
}

function isWriterInterfaceContract(
  value: unknown,
): value is AuditLedgerWriterInterfaceContract {
  return (
    isPlainObject(value) &&
    value.contract_id === AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID &&
    isString(value.request_id) &&
    isString(value.operation) &&
    auditLedgerWriterOperationSet.has(value.operation) &&
    isPlainObject(value.policy_gate_ref) &&
    isPlainObject(value.approval_ref) &&
    isPlainObject(value.record_ref) &&
    isPlainObject(value.idempotency) &&
    isPlainObject(value.append_only) &&
    isPlainObject(value.redaction) &&
    Array.isArray(value.source_refs) &&
    value.live_execution_allowed === false &&
    Array.isArray(value.side_effects) &&
    value.side_effects.length === 0
  );
}

function isValidAppendSemanticsWriterContract(
  value: unknown,
): value is AuditLedgerWriterInterfaceContract {
  if (
    !isWriterInterfaceContract(value) ||
    !hasOnlyKeys(value, auditLedgerWriterInterfaceContractKeys) ||
    value.operation !== "ledger.record.append" ||
    !isBoundedString(value.request_id, 256) ||
    !isAuditLedgerAppendSemanticsEntry(value.record_ref)
  ) {
    return false;
  }

  if (
    !hasExactKeys(value.policy_gate_ref, [
      "contract_id",
      "decision_id",
      "decision",
      "requires_approval",
      "reason_codes",
    ]) ||
    value.policy_gate_ref.contract_id !== AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID ||
    value.policy_gate_ref.decision !== "approval_required" ||
    value.policy_gate_ref.requires_approval !== true ||
    !isBoundedString(value.policy_gate_ref.decision_id, 256) ||
    !isBoundedStringArray(value.policy_gate_ref.reason_codes, 100, 512) ||
    value.policy_gate_ref.reason_codes.length === 0
  ) {
    return false;
  }

  if (
    !hasExactKeys(value.approval_ref, [
      "contract_id",
      "approval_request_id",
      "approval_status",
      "approval_kind",
      "policy_gate_decision_id",
    ]) ||
    value.approval_ref.contract_id !==
      AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID ||
    value.approval_ref.approval_status !== "requested" ||
    value.approval_ref.approval_kind !== "ledger_state_change" ||
    !isBoundedString(value.approval_ref.approval_request_id, 256) ||
    value.approval_ref.policy_gate_decision_id !== value.policy_gate_ref.decision_id
  ) {
    return false;
  }

  if (
    !hasExactKeys(value.idempotency, [
      "idempotency_key",
      "canonical_record_digest",
      "duplicate_behavior",
      "collision_behavior",
    ]) ||
    value.idempotency.idempotency_key !== value.record_ref.idempotency_key ||
    value.idempotency.canonical_record_digest !==
      value.record_ref.canonical_record_digest ||
    value.idempotency.duplicate_behavior !== "exact_replay_returns_existing_ref" ||
    value.idempotency.collision_behavior !== "fail_closed"
  ) {
    return false;
  }

  if (
    !hasExactKeys(value.append_only, [
      "mode",
      "correction_model",
      "forbidden_mutations",
    ]) ||
    value.append_only.mode !== "insert_only" ||
    value.append_only.correction_model !==
      "append_new_record_referencing_prior_record" ||
    !arrayEquals(value.append_only.forbidden_mutations, [
      "update",
      "delete",
      "truncate",
      "in_place_redaction",
    ])
  ) {
    return false;
  }

  return (
    hasExactKeys(value.redaction, redactionSummaryKeys) &&
    redactionSummaryKeys.every(
      (key) =>
        value.redaction[key] === "not_present" || value.redaction[key] === "withheld",
    ) &&
    isBoundedStringArray(value.source_refs, 100, 512) &&
    value.source_refs.length > 0 &&
    value.live_execution_allowed === false &&
    value.side_effects.length === 0
  );
}

function isAuditLedgerAppendSemanticsEntry(
  value: unknown,
): value is AuditLedgerAppendSemanticsConformanceEntry {
  return (
    isPlainObject(value) &&
    hasOnlyKeys(value, auditLedgerAppendSemanticsEntryKeys) &&
    Object.keys(value).length === auditLedgerAppendSemanticsEntryKeys.size &&
    matchesPattern(value.idempotency_key, /^audit:[a-z0-9_]+:[a-z0-9_:.@/-]+$/) &&
    value.idempotency_key.length <= 256 &&
    matchesPattern(value.canonical_record_digest, /^sha256:[a-f0-9]{64}$/) &&
    matchesPattern(value.ledger_record_id, /^alr_[a-z0-9][a-z0-9_-]{7,95}$/) &&
    matchesPattern(value.event_id, /^evt_[a-z0-9][a-z0-9_-]{7,180}$/)
  );
}

function cloneAppendSemanticsEntry(
  value: AuditLedgerAppendSemanticsConformanceEntry,
): AuditLedgerAppendSemanticsConformanceEntry {
  return {
    idempotency_key: value.idempotency_key,
    canonical_record_digest: value.canonical_record_digest,
    ledger_record_id: value.ledger_record_id,
    event_id: value.event_id,
  };
}

function validateDatabaseSecurityPreflightInputKeys(
  value: Record<string, unknown>,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  for (const key of Object.keys(value)) {
    if (!databaseSecurityPreflightInputKeys.has(key)) {
      errors.push(
        databaseSecurityPreflightError(
          "audit_ledger_database_security_preflight.invalid_request",
          jsonPointer(key),
          "Unexpected database security preflight request field.",
        ),
      );
    }
  }
}

function validateDatabaseSecurityPersistencePreflight(
  value: unknown,
  path: string,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.persistence_preflight_required",
        path,
        "BP-0059 persistence preflight evidence is required.",
      ),
    );
    return;
  }

  if (
    value.contract_id !== AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID ||
    value.storage_target !== AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.persistence_preflight_required",
        path,
        "persistence preflight must use the BP-0059 audit_events.v0_1 contract.",
      ),
    );
  }

  requireDatabaseSecurityString(value.request_id, `${path}/request_id`, errors);

  if (!isPlainObject(value.migration_artifact_refs)) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.migration_artifact_ref_required",
        `${path}/migration_artifact_refs`,
        "BP-0044/BP-0045 migration artifact refs are required.",
      ),
    );
  } else {
    validateDatabaseSecurityString(
      value.migration_artifact_refs.sql_artifact,
      `${path}/migration_artifact_refs/sql_artifact`,
      "audit_ledger_database_security_preflight.migration_artifact_ref_required",
      errors,
    );
    validateDatabaseSecurityString(
      value.migration_artifact_refs.manifest_artifact,
      `${path}/migration_artifact_refs/manifest_artifact`,
      "audit_ledger_database_security_preflight.migration_artifact_ref_required",
      errors,
    );
    validateDatabaseSecurityString(
      value.migration_artifact_refs.static_checker,
      `${path}/migration_artifact_refs/static_checker`,
      "audit_ledger_database_security_preflight.migration_artifact_ref_required",
      errors,
    );
    validateDatabaseSecurityStringArray(
      value.migration_artifact_refs.source_packet_refs,
      `${path}/migration_artifact_refs/source_packet_refs`,
      "audit_ledger_database_security_preflight.migration_artifact_ref_required",
      errors,
    );
    if (
      Array.isArray(value.migration_artifact_refs.source_packet_refs) &&
      (!value.migration_artifact_refs.source_packet_refs.includes("BP-0044") ||
        !value.migration_artifact_refs.source_packet_refs.includes("BP-0045"))
    ) {
      errors.push(
        databaseSecurityPreflightError(
          "audit_ledger_database_security_preflight.migration_artifact_ref_required",
          `${path}/migration_artifact_refs/source_packet_refs`,
          "migration artifact refs must include BP-0044 and BP-0045.",
        ),
      );
    }
  }

  if (value.live_execution_allowed !== false) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.live_execution_forbidden",
        `${path}/live_execution_allowed`,
        "BP-0059 persistence preflight must keep live_execution_allowed false.",
      ),
    );
  }

  validateDatabaseSecuritySideEffects(
    value.side_effects,
    `${path}/side_effects`,
    errors,
  );
}

function validateDatabaseSecurityIsolationModel(
  value: unknown,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.rls_or_equivalent_required",
        "/isolation_model",
        "RLS or an approved equivalent isolation model is required.",
      ),
    );
    return;
  }

  validateDatabaseSecurityObjectKeys(
    value,
    databaseSecurityIsolationModelKeys,
    "/isolation_model",
    errors,
  );

  if (
    value.mode !== "postgresql_rls" &&
    value.mode !== "approved_equivalent_isolation"
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.rls_or_equivalent_required",
        "/isolation_model/mode",
        "isolation model must be postgresql_rls or approved_equivalent_isolation.",
      ),
    );
  }

  if (
    value.mode === "approved_equivalent_isolation" &&
    !isSafeDatabaseSecurityString(value.approved_equivalent_isolation_ref)
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.rls_or_equivalent_required",
        "/isolation_model/approved_equivalent_isolation_ref",
        "approved equivalent isolation requires a safe source ref.",
      ),
    );
  }

  if (value.deny_by_default !== true || value.bypass_rls_forbidden !== true) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.grants_deny_by_default_required",
        "/isolation_model",
        "isolation model must require deny-by-default and forbid bypassrls.",
      ),
    );
  }
}

function validateDatabaseSecurityTenantProjectScope(
  value: unknown,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.tenant_project_scope_required",
        "/tenant_project_scope",
        "tenant/project scope evidence is required.",
      ),
    );
    return;
  }

  validateDatabaseSecurityObjectKeys(
    value,
    databaseSecurityTenantProjectScopeKeys,
    "/tenant_project_scope",
    errors,
  );

  if (!arrayEquals(value.required_row_scope_fields, ["tenant_id", "project_id"])) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.tenant_project_scope_required",
        "/tenant_project_scope/required_row_scope_fields",
        "future rows must carry tenant_id and project_id scope fields or approved equivalent isolation.",
      ),
    );
  }

  if (
    value.scope_source !==
      "future_audit_events_columns_or_approved_equivalent_boundary" ||
    value.enforcement !==
      "all_writer_and_select_paths_must_filter_tenant_id_and_project_id" ||
    value.missing_scope_behavior !== "fail_closed"
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.tenant_project_scope_required",
        "/tenant_project_scope",
        "tenant/project scope must fail closed and apply to writer and select paths.",
      ),
    );
  }
}

function validateDatabaseSecurityRoleBoundaries(
  value: unknown,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.role_boundary_required",
        "/role_boundaries",
        "writer/select/migration role boundary evidence is required.",
      ),
    );
    return;
  }

  validateDatabaseSecurityObjectKeys(
    value,
    databaseSecurityRoleBoundariesKeys,
    "/role_boundaries",
    errors,
  );
  validateDatabaseSecurityRoleBoundary(
    value.writer_role,
    "/role_boundaries/writer_role",
    [
      "update",
      "delete",
      "truncate",
      "alter",
      "drop",
      "superuser",
      "bypassrls",
      "unscoped_select",
    ],
    errors,
  );
  validateDatabaseSecurityRoleBoundary(
    value.select_role,
    "/role_boundaries/select_role",
    [
      "insert",
      "update",
      "delete",
      "truncate",
      "alter",
      "drop",
      "superuser",
      "bypassrls",
      "unscoped_select",
    ],
    errors,
  );
  validateDatabaseSecurityRoleBoundary(
    value.migration_role,
    "/role_boundaries/migration_role",
    ["runtime_writer_use", "unapproved_ddl", "superuser", "bypassrls"],
    errors,
  );
}

function validateDatabaseSecurityRoleBoundary(
  value: unknown,
  path: string,
  requiredForbiddenGrants: string[],
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.role_boundary_required",
        path,
        "role boundary must be an object.",
      ),
    );
    return;
  }

  validateDatabaseSecurityObjectKeys(
    value,
    databaseSecurityRoleBoundaryKeys,
    path,
    errors,
  );
  validateDatabaseSecurityString(
    value.role_ref,
    `${path}/role_ref`,
    "audit_ledger_database_security_preflight.role_boundary_required",
    errors,
  );
  validateDatabaseSecurityStringArray(
    value.allowed_grants,
    `${path}/allowed_grants`,
    "audit_ledger_database_security_preflight.role_boundary_required",
    errors,
  );
  validateDatabaseSecurityStringArray(
    value.forbidden_grants,
    `${path}/forbidden_grants`,
    "audit_ledger_database_security_preflight.grants_deny_by_default_required",
    errors,
  );

  const forbiddenGrants = value.forbidden_grants;
  if (
    Array.isArray(forbiddenGrants) &&
    requiredForbiddenGrants.some((grant) => !forbiddenGrants.includes(grant))
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.grants_deny_by_default_required",
        `${path}/forbidden_grants`,
        "role boundary must deny dangerous or unscoped grants by default.",
      ),
    );
  }
}

function validateDatabaseSecurityTestRequirements(
  value: unknown,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  validateDatabaseSecurityStringArray(
    value,
    "/test_requirements",
    "audit_ledger_database_security_preflight.tests_required",
    errors,
  );

  if (
    Array.isArray(value) &&
    defaultAuditLedgerDatabaseSecurityTestRequirements.some(
      (requirement) => !value.includes(requirement),
    )
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.tests_required",
        "/test_requirements",
        "security preflight must require static, RLS/equivalent, scope, role, and deny-by-default tests.",
      ),
    );
  }
}

function validateDatabaseSecuritySourceRefs(
  value: unknown,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  validateDatabaseSecurityStringArray(
    value,
    "/source_refs",
    "audit_ledger_database_security_preflight.source_refs_required",
    errors,
  );

  if (
    Array.isArray(value) &&
    (["BP-0044", "BP-0045", "BP-0058", "BP-0059", "BP-0065"].some(
      (packetId) => !value.some((ref) => ref.includes(packetId)),
    ) ||
      !value.some((ref) => ref.includes("AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT")))
  ) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.source_refs_required",
        "/source_refs",
        "source refs must include BP-0044/BP-0045 artifacts, BP-0058/BP-0059 persistence evidence, and BP-0065 docs.",
      ),
    );
  }
}

function validateDatabaseSecuritySideEffects(
  value: unknown,
  path: string,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!Array.isArray(value) || value.length !== 0) {
    errors.push(
      databaseSecurityPreflightError(
        "audit_ledger_database_security_preflight.side_effects_forbidden",
        path,
        "database security preflight must preserve side_effects: [].",
      ),
    );
  }
}

function requireDatabaseSecurityString(
  value: unknown,
  path: string,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  validateDatabaseSecurityString(
    value,
    path,
    "audit_ledger_database_security_preflight.invalid_request",
    errors,
  );
}

function validateDatabaseSecurityString(
  value: unknown,
  path: string,
  code: AuditLedgerDatabaseSecurityPreflightErrorCode,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!isSafeDatabaseSecurityString(value)) {
    errors.push(
      databaseSecurityPreflightError(
        code,
        path,
        "Value must be a safe non-empty string.",
      ),
    );
  }
}

function validateDatabaseSecurityStringArray(
  value: unknown,
  path: string,
  code: AuditLedgerDatabaseSecurityPreflightErrorCode,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      databaseSecurityPreflightError(
        code,
        path,
        "Value must be a safe non-empty string array.",
      ),
    );
    return;
  }

  value.forEach((item, index) => {
    validateDatabaseSecurityString(item, `${path}/${index}`, code, errors);
  });
}

function validateDatabaseSecurityObjectKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  path: string,
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        databaseSecurityPreflightError(
          "audit_ledger_database_security_preflight.invalid_request",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected database security preflight nested field.",
        ),
      );
    }
  }
}

function isPersistencePreflightEvidence(
  value: unknown,
): value is AuditLedgerWriterPersistencePreflightEvidence {
  return (
    isPlainObject(value) &&
    value.contract_id === AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID &&
    value.storage_target === AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET &&
    isString(value.request_id) &&
    isPlainObject(value.policy_gate_ref) &&
    isPlainObject(value.approval_request_ref) &&
    isPlainObject(value.writer_interface_ref) &&
    isPlainObject(value.migration_artifact_refs) &&
    value.live_execution_allowed === false &&
    Array.isArray(value.side_effects) &&
    value.side_effects.length === 0
  );
}

function validatePersistenceScopeRequestInputKeys(
  value: Record<string, unknown>,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  for (const key of Object.keys(value)) {
    if (!persistenceScopeRequestInputKeys.has(key)) {
      errors.push(
        persistenceScopeRequestError(
          "audit_ledger_persistence_scope_request.invalid_request",
          jsonPointer(key),
          "Unexpected persistence scope request field.",
        ),
      );
    }
  }
}

function validatePersistenceScopeRequestReadinessGate(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_gate_required",
        "/readiness_gate",
        "BP-0071 readiness gate evidence is required.",
      ),
    );
    return;
  }

  if (
    value.contract_id !==
    AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_gate_required",
        "/readiness_gate/contract_id",
        "readiness gate must use the BP-0071 contract id.",
      ),
    );
  }

  requirePersistenceScopeRequestString(
    value.request_id,
    "/readiness_gate/request_id",
    errors,
  );

  const readiness = value.readiness;
  if (
    !isPlainObject(readiness) ||
    readiness.status !== "source_ready_for_later_scope_request_only" ||
    readiness.live_persistence_scope_allowed !== false ||
    readiness.next_scope_requires_explicit_packet !== true ||
    readiness.gateway_is_security_boundary !== true ||
    readiness.mcp_is_adapter_only !== true ||
    readiness.state_changing_mcp_tools_allowed !== false
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_gate_required",
        "/readiness_gate/readiness",
        "readiness gate must preserve source-ready, Gateway-owned, MCP-adapter-only posture.",
      ),
    );
  }

  validatePersistenceScopeRequestReviewedSourceChain(
    value.reviewed_source_chain,
    errors,
  );
  validatePersistenceScopeRequestSecurityRequirements(
    value.security_requirements,
    errors,
  );

  if (value.live_execution_allowed !== false) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.live_execution_forbidden",
        "/readiness_gate/live_execution_allowed",
        "readiness gate must keep live_execution_allowed false.",
      ),
    );
  }

  validatePersistenceScopeRequestSideEffects(
    value.side_effects,
    "/readiness_gate/side_effects",
    errors,
  );

  if (
    !Array.isArray(value.source_refs) ||
    [
      "BP-0044",
      "BP-0045",
      "BP-0058",
      "BP-0059",
      "BP-0065",
      "BP-0066",
      "BP-0067",
      "BP-0068",
      "BP-0069",
      "BP-0070",
      "BP-0071",
    ].some(
      (packetId) =>
        Array.isArray(value.source_refs) &&
        !value.source_refs.some((ref) => isString(ref) && ref.includes(packetId)),
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        "/readiness_gate/source_refs",
        "readiness gate must preserve BP-0044/BP-0045, BP-0058/BP-0059, and BP-0065 through BP-0071 refs.",
      ),
    );
  }

  validatePersistenceScopeReadinessGateMinimumSourceEvidence(
    value.minimum_source_evidence_before_live_scope,
    errors,
  );
}

function validatePersistenceScopeRequestReviewedSourceChain(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        "/readiness_gate/reviewed_source_chain",
        "readiness gate reviewed source chain is required.",
      ),
    );
    return;
  }

  validatePersistenceScopeRequestMigrationArtifactRefs(
    value.migration_artifacts,
    "/readiness_gate/reviewed_source_chain/migration_artifacts",
    errors,
  );

  if (
    !isPlainObject(value.writer_persistence_preflight_ref) ||
    value.writer_persistence_preflight_ref.contract_id !==
      AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID ||
    value.writer_persistence_preflight_ref.storage_target !==
      AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        "/readiness_gate/reviewed_source_chain/writer_persistence_preflight_ref",
        "scope request requires BP-0058/BP-0059 writer persistence preflight refs.",
      ),
    );
  }

  if (
    !isPlainObject(value.database_security_preflight_ref) ||
    value.database_security_preflight_ref.contract_id !==
      AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID ||
    value.database_security_preflight_ref.storage_target !==
      AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        "/readiness_gate/reviewed_source_chain/database_security_preflight_ref",
        "scope request requires BP-0065 database security preflight refs.",
      ),
    );
  }

  if (
    !Array.isArray(value.layer_refs) ||
    ["BP-0065", "BP-0066", "BP-0067", "BP-0068", "BP-0069", "BP-0070"].some(
      (packetId) =>
        Array.isArray(value.layer_refs) &&
        !value.layer_refs.some((ref) => isPlainObject(ref) && ref.packet === packetId),
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        "/readiness_gate/reviewed_source_chain/layer_refs",
        "scope request requires BP-0065 through BP-0070 reviewed layer refs.",
      ),
    );
  }
}

function validatePersistenceScopeRequestMigrationArtifactRefs(
  value: unknown,
  path: string,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        path,
        "scope request requires BP-0044/BP-0045 migration artifact refs.",
      ),
    );
    return;
  }

  requirePersistenceScopeRequestString(
    value.sql_artifact,
    `${path}/sql_artifact`,
    errors,
  );
  requirePersistenceScopeRequestString(
    value.manifest_artifact,
    `${path}/manifest_artifact`,
    errors,
  );
  requirePersistenceScopeRequestString(
    value.static_checker,
    `${path}/static_checker`,
    errors,
  );

  if (
    !Array.isArray(value.source_packet_refs) ||
    !value.source_packet_refs.includes("BP-0044") ||
    !value.source_packet_refs.includes("BP-0045")
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        `${path}/source_packet_refs`,
        "migration artifact refs must include BP-0044 and BP-0045.",
      ),
    );
  }
}

function validatePersistenceScopeRequestSecurityRequirements(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.security_boundary_required",
        "/readiness_gate/security_requirements",
        "scope request requires readiness security requirements.",
      ),
    );
    return;
  }

  validatePersistenceScopeRequestIsolationAndScope(value, errors);

  if (
    value.deny_by_default_required !== true ||
    !Array.isArray(value.test_requirements_before_live_scope) ||
    defaultAuditLedgerDatabaseSecurityTestRequirements.some(
      (requirement) =>
        Array.isArray(value.test_requirements_before_live_scope) &&
        !value.test_requirements_before_live_scope.includes(requirement),
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.security_boundary_required",
        "/readiness_gate/security_requirements",
        "scope request must preserve deny-by-default grants and required tests.",
      ),
    );
  }
}

function validatePersistenceScopeRequestIsolationAndScope(
  value: Record<string, unknown>,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  const isolationModel = value.isolation_model;
  if (
    !isPlainObject(isolationModel) ||
    (isolationModel.mode !== "postgresql_rls" &&
      isolationModel.mode !== "approved_equivalent_isolation") ||
    isolationModel.deny_by_default !== true ||
    isolationModel.bypass_rls_forbidden !== true
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.security_boundary_required",
        "/readiness_gate/security_requirements/isolation_model",
        "scope request requires RLS or approved equivalent isolation with deny-by-default posture.",
      ),
    );
  }

  const tenantProjectScope = value.tenant_project_scope;
  if (
    !isPlainObject(tenantProjectScope) ||
    !arrayEquals(tenantProjectScope.required_row_scope_fields, [
      "tenant_id",
      "project_id",
    ]) ||
    tenantProjectScope.missing_scope_behavior !== "fail_closed"
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.security_boundary_required",
        "/readiness_gate/security_requirements/tenant_project_scope",
        "scope request requires tenant/project scope and fail-closed missing-scope behavior.",
      ),
    );
  }

  const roleBoundaries = value.role_boundaries;
  if (
    !isPlainObject(roleBoundaries) ||
    !persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
      roleBoundaries.writer_role,
      ["update", "delete", "truncate", "superuser", "bypassrls", "unscoped_select"],
    ) ||
    !persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
      roleBoundaries.select_role,
      [
        "insert",
        "update",
        "delete",
        "truncate",
        "superuser",
        "bypassrls",
        "unscoped_select",
      ],
    ) ||
    !persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
      roleBoundaries.migration_role,
      ["runtime_writer_use", "unapproved_ddl", "superuser", "bypassrls"],
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.security_boundary_required",
        "/readiness_gate/security_requirements/role_boundaries",
        "scope request requires writer/select/migration role boundaries.",
      ),
    );
  }
}

function validatePersistenceScopeRequestReadinessSource(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "/readiness_source",
        "readiness source evidence is required.",
      ),
    );
    return;
  }

  if (value.kind === "direct_gateway_evidence") {
    validatePersistenceScopeDirectReadinessSource(value, errors);
    return;
  }

  if (value.kind === "registered_mcp_inspection_evidence") {
    validatePersistenceScopeMcpReadinessSource(value, errors);
    return;
  }

  errors.push(
    persistenceScopeRequestError(
      "audit_ledger_persistence_scope_request.readiness_source_required",
      "/readiness_source/kind",
      "readiness source must be direct Gateway evidence or BP-0076 registered MCP inspection evidence.",
    ),
  );
}

function validatePersistenceScopeDirectReadinessSource(
  value: Record<string, unknown>,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (
    value.gateway_contract_id !== AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "/readiness_source/gateway_contract_id",
        "direct readiness source must reference the BP-0073 Gateway contract.",
      ),
    );
  }

  requirePersistenceScopeRequestString(
    value.gateway_request_id,
    "/readiness_source/gateway_request_id",
    errors,
  );

  if (
    !Array.isArray(value.source_packet_refs) ||
    !value.source_packet_refs.includes("BP-0071") ||
    !value.source_packet_refs.includes("BP-0073")
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "/readiness_source/source_packet_refs",
        "direct readiness source must preserve BP-0071 and BP-0073 refs.",
      ),
    );
  }
}

function validatePersistenceScopeMcpReadinessSource(
  value: Record<string, unknown>,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (value.tool !== AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "/readiness_source/tool",
        "MCP readiness source must be the BP-0076 registered read-only tool.",
      ),
    );
  }

  if (
    value.gateway_contract_id !== AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "/readiness_source/gateway_contract_id",
        "MCP readiness source must delegate through the BP-0073 Gateway contract.",
      ),
    );
  }

  requirePersistenceScopeRequestString(
    value.gateway_request_id,
    "/readiness_source/gateway_request_id",
    errors,
  );

  if (
    value.registration_packet !== "BP-0076" ||
    value.read_only_registration !== true ||
    !Array.isArray(value.source_packet_refs) ||
    !value.source_packet_refs.includes("BP-0075") ||
    !value.source_packet_refs.includes("BP-0076")
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.readiness_source_required",
        "/readiness_source/source_packet_refs",
        "MCP readiness source must preserve BP-0075/BP-0076 read-only registration refs.",
      ),
    );
  }
}

function validatePersistenceScopeMinimumSourceEvidence(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  validatePersistenceScopeRequestStringArray(
    value,
    "/minimum_source_evidence",
    "audit_ledger_persistence_scope_request.minimum_source_evidence_required",
    errors,
  );

  if (
    Array.isArray(value) &&
    [
      "BP-0044",
      "BP-0045",
      "BP-0058",
      "BP-0059",
      "BP-0065",
      "BP-0070",
      "BP-0071",
      "BP-0076",
    ].some(
      (packetId) => !value.some((item) => isString(item) && item.includes(packetId)),
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.minimum_source_evidence_required",
        "/minimum_source_evidence",
        "minimum source evidence must preserve readiness, registration, migration, persistence, database security, and approval boundary refs.",
      ),
    );
  }
}

function validatePersistenceScopeReadinessGateMinimumSourceEvidence(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  validatePersistenceScopeRequestStringArray(
    value,
    "/readiness_gate/minimum_source_evidence_before_live_scope",
    "audit_ledger_persistence_scope_request.minimum_source_evidence_required",
    errors,
  );

  if (
    Array.isArray(value) &&
    ["BP-0044", "BP-0045", "BP-0058", "BP-0059", "BP-0065", "BP-0070"].some(
      (packetId) => !value.some((item) => isString(item) && item.includes(packetId)),
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.minimum_source_evidence_required",
        "/readiness_gate/minimum_source_evidence_before_live_scope",
        "readiness gate minimum source evidence must preserve migration, persistence, and database security refs through BP-0070.",
      ),
    );
  }
}

function validatePersistenceScopeRequestSourceRefs(
  value: unknown,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  validatePersistenceScopeRequestStringArray(
    value,
    "/source_refs",
    "audit_ledger_persistence_scope_request.reviewed_refs_required",
    errors,
  );

  if (
    Array.isArray(value) &&
    ["BP-0044", "BP-0045", "BP-0058", "BP-0059", "BP-0065", "BP-0076", "BP-0077"].some(
      (packetId) => !value.some((item) => isString(item) && item.includes(packetId)),
    )
  ) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.reviewed_refs_required",
        "/source_refs",
        "scope request source refs must preserve BP-0044/BP-0045, BP-0058/BP-0059, BP-0065 through BP-0076, and BP-0077.",
      ),
    );
  }
}

function validatePersistenceScopeRequestStringArray(
  value: unknown,
  path: string,
  code: AuditLedgerPersistenceScopeRequestErrorCode,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistenceScopeRequestError(
        code,
        path,
        "Value must be a safe non-empty string array.",
      ),
    );
    return;
  }

  value.forEach((item, index) => {
    if (!isSafeDatabaseSecurityString(item)) {
      errors.push(
        persistenceScopeRequestError(
          code,
          `${path}/${index}`,
          "Value must be a safe non-empty string.",
        ),
      );
    }
  });
}

function validatePersistenceScopeRequestSideEffects(
  value: unknown,
  path: string,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!Array.isArray(value) || value.length !== 0) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.side_effects_forbidden",
        path,
        "scope request must preserve side_effects: [].",
      ),
    );
  }
}

function requirePersistenceScopeRequestString(
  value: unknown,
  path: string,
  errors: AuditLedgerPersistenceScopeRequestError[],
): void {
  if (!isSafeDatabaseSecurityString(value)) {
    errors.push(
      persistenceScopeRequestError(
        "audit_ledger_persistence_scope_request.invalid_request",
        path,
        "Value must be a safe non-empty string.",
      ),
    );
  }
}

function buildDefaultPersistenceScopeMinimumSourceEvidence(value: unknown): string[] {
  if (isPersistenceReadinessGateEvidence(value)) {
    return [
      ...value.minimum_source_evidence_before_live_scope,
      "BP-0071 source-only persistence readiness gate evidence",
      "BP-0076 registered read-only MCP persistence readiness inspection evidence",
      "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
    ];
  }

  return [
    ...defaultAuditLedgerPersistenceReadinessMinimumSourceEvidence,
    "BP-0071 source-only persistence readiness gate evidence",
    "BP-0076 registered read-only MCP persistence readiness inspection evidence",
    "explicit BP-0077 Gateway-owned source-only scope request before DB or writer scope can be proposed",
  ];
}

function isPersistenceReadinessGateEvidence(
  value: unknown,
): value is AuditLedgerPersistenceImplementationReadinessGateEvidence {
  return (
    isPlainObject(value) &&
    value.contract_id ===
      AUDIT_LEDGER_PERSISTENCE_IMPLEMENTATION_READINESS_GATE_CONTRACT_ID &&
    isString(value.request_id) &&
    isPlainObject(value.readiness) &&
    value.readiness.status === "source_ready_for_later_scope_request_only" &&
    value.readiness.live_persistence_scope_allowed === false &&
    value.readiness.next_scope_requires_explicit_packet === true &&
    value.readiness.gateway_is_security_boundary === true &&
    value.readiness.mcp_is_adapter_only === true &&
    value.readiness.state_changing_mcp_tools_allowed === false &&
    isPlainObject(value.reviewed_source_chain) &&
    Array.isArray(value.minimum_source_evidence_before_live_scope) &&
    isPlainObject(value.security_requirements) &&
    Array.isArray(value.source_refs) &&
    value.live_execution_allowed === false &&
    Array.isArray(value.side_effects) &&
    value.side_effects.length === 0
  );
}

function isPersistenceScopeReadinessSource(
  value: unknown,
): value is AuditLedgerPersistenceScopeRequestReadinessSource {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.kind === "direct_gateway_evidence") {
    return (
      value.gateway_contract_id ===
        AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID &&
      isString(value.gateway_request_id) &&
      Array.isArray(value.source_packet_refs)
    );
  }

  return (
    value.kind === "registered_mcp_inspection_evidence" &&
    value.tool === AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL &&
    value.gateway_contract_id ===
      AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID &&
    isString(value.gateway_request_id) &&
    value.registration_packet === "BP-0076" &&
    value.read_only_registration === true &&
    Array.isArray(value.source_packet_refs)
  );
}

function validatePersistenceReadinessGateInputKeys(
  value: Record<string, unknown>,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  for (const key of Object.keys(value)) {
    if (!persistenceReadinessGateInputKeys.has(key)) {
      errors.push(
        persistenceReadinessGateError(
          "audit_ledger_persistence_readiness_gate.invalid_request",
          jsonPointer(key),
          "Unexpected persistence readiness gate request field.",
        ),
      );
    }
  }
}

function validatePersistenceReadinessGateDatabaseSecurityPreflight(
  value: unknown,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
        "/database_security_preflight",
        "BP-0065 database security preflight evidence is required.",
      ),
    );
    return;
  }

  if (value.contract_id !== AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
        "/database_security_preflight/contract_id",
        "database security preflight must use the BP-0065 contract id.",
      ),
    );
  }

  requirePersistenceReadinessGateString(
    value.request_id,
    "/database_security_preflight/request_id",
    errors,
  );

  if (
    !isPlainObject(value.security_target) ||
    value.security_target.storage_target !==
      AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET ||
    value.security_target.table !== "audit_events" ||
    value.security_target.schema_version !== "audit_events.v0_1"
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.database_security_preflight_required",
        "/database_security_preflight/security_target",
        "database security preflight must target audit_events.v0_1.",
      ),
    );
  }

  validatePersistenceReadinessGateMigrationArtifactRefs(
    value.migration_artifact_refs,
    errors,
  );
  validatePersistenceReadinessGateWriterPersistenceRef(
    value.persistence_preflight_ref,
    errors,
  );

  if (
    !isPlainObject(value.policy_gate_ref) ||
    value.policy_gate_ref.contract_id !== AUDIT_LEDGER_WRITER_POLICY_GATE_CONTRACT_ID
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.writer_persistence_preflight_refs_required",
        "/database_security_preflight/policy_gate_ref",
        "database security preflight must preserve BP-0039 policy gate evidence.",
      ),
    );
  }

  if (
    !isPlainObject(value.approval_request_ref) ||
    value.approval_request_ref.contract_id !==
      AUDIT_LEDGER_WRITER_APPROVAL_REQUEST_CONTRACT_ID
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.writer_persistence_preflight_refs_required",
        "/database_security_preflight/approval_request_ref",
        "database security preflight must preserve BP-0040 approval request evidence.",
      ),
    );
  }

  if (
    !isPlainObject(value.writer_interface_ref) ||
    value.writer_interface_ref.contract_id !== AUDIT_LEDGER_WRITER_INTERFACE_CONTRACT_ID
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.writer_persistence_preflight_refs_required",
        "/database_security_preflight/writer_interface_ref",
        "database security preflight must preserve BP-0052 writer-interface evidence.",
      ),
    );
  }

  validatePersistenceReadinessGateIsolationAndScope(value, errors);

  if (
    !Array.isArray(value.test_requirements_before_live_scope) ||
    defaultAuditLedgerDatabaseSecurityTestRequirements.some(
      (requirement) =>
        Array.isArray(value.test_requirements_before_live_scope) &&
        !value.test_requirements_before_live_scope.includes(requirement),
    )
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.tests_required",
        "/database_security_preflight/test_requirements_before_live_scope",
        "readiness gate must preserve required static, RLS/equivalent, scope, role, grant, and no-bypass tests.",
      ),
    );
  }

  if (
    !Array.isArray(value.source_refs) ||
    ["BP-0044", "BP-0045", "BP-0058", "BP-0059", "BP-0065"].some(
      (packetId) =>
        Array.isArray(value.source_refs) &&
        !value.source_refs.some((ref) => isString(ref) && ref.includes(packetId)),
    )
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.database_security_preflight_refs_required",
        "/database_security_preflight/source_refs",
        "database security preflight source refs must include BP-0044/BP-0045, BP-0058/BP-0059, and BP-0065.",
      ),
    );
  }

  if (value.live_execution_allowed !== false) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.live_execution_forbidden",
        "/database_security_preflight/live_execution_allowed",
        "database security preflight must keep live_execution_allowed false.",
      ),
    );
  }

  validatePersistenceReadinessGateSideEffects(
    value.side_effects,
    "/database_security_preflight/side_effects",
    errors,
  );
}

function validatePersistenceReadinessGateMigrationArtifactRefs(
  value: unknown,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.migration_artifact_refs_required",
        "/database_security_preflight/migration_artifact_refs",
        "BP-0044/BP-0045 migration artifact refs are required.",
      ),
    );
    return;
  }

  requirePersistenceReadinessGateString(
    value.sql_artifact,
    "/database_security_preflight/migration_artifact_refs/sql_artifact",
    errors,
  );
  requirePersistenceReadinessGateString(
    value.manifest_artifact,
    "/database_security_preflight/migration_artifact_refs/manifest_artifact",
    errors,
  );
  requirePersistenceReadinessGateString(
    value.static_checker,
    "/database_security_preflight/migration_artifact_refs/static_checker",
    errors,
  );

  if (
    !Array.isArray(value.source_packet_refs) ||
    !value.source_packet_refs.includes("BP-0044") ||
    !value.source_packet_refs.includes("BP-0045")
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.migration_artifact_refs_required",
        "/database_security_preflight/migration_artifact_refs/source_packet_refs",
        "migration artifact refs must include BP-0044 and BP-0045.",
      ),
    );
  }
}

function validatePersistenceReadinessGateWriterPersistenceRef(
  value: unknown,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  if (
    !isPlainObject(value) ||
    value.contract_id !== AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_CONTRACT_ID ||
    value.storage_target !== AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.writer_persistence_preflight_refs_required",
        "/database_security_preflight/persistence_preflight_ref",
        "readiness gate requires BP-0058/BP-0059 writer persistence preflight refs.",
      ),
    );
    return;
  }

  requirePersistenceReadinessGateString(
    value.request_id,
    "/database_security_preflight/persistence_preflight_ref/request_id",
    errors,
  );
}

function validatePersistenceReadinessGateIsolationAndScope(
  value: Record<string, unknown>,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  const isolationModel = value.isolation_model;
  if (
    !isPlainObject(isolationModel) ||
    (isolationModel.mode !== "postgresql_rls" &&
      isolationModel.mode !== "approved_equivalent_isolation") ||
    isolationModel.deny_by_default !== true ||
    isolationModel.bypass_rls_forbidden !== true
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.security_boundary_required",
        "/database_security_preflight/isolation_model",
        "readiness gate requires RLS or approved equivalent isolation with deny-by-default posture.",
      ),
    );
  }

  const tenantProjectScope = value.tenant_project_scope;
  if (
    !isPlainObject(tenantProjectScope) ||
    !arrayEquals(tenantProjectScope.required_row_scope_fields, [
      "tenant_id",
      "project_id",
    ]) ||
    tenantProjectScope.missing_scope_behavior !== "fail_closed"
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.security_boundary_required",
        "/database_security_preflight/tenant_project_scope",
        "readiness gate requires tenant/project scope and fail-closed missing-scope behavior.",
      ),
    );
  }

  const roleBoundaries = value.role_boundaries;
  if (
    !isPlainObject(roleBoundaries) ||
    !persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
      roleBoundaries.writer_role,
      ["update", "delete", "truncate", "superuser", "bypassrls", "unscoped_select"],
    ) ||
    !persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
      roleBoundaries.select_role,
      [
        "insert",
        "update",
        "delete",
        "truncate",
        "superuser",
        "bypassrls",
        "unscoped_select",
      ],
    ) ||
    !persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
      roleBoundaries.migration_role,
      ["runtime_writer_use", "unapproved_ddl", "superuser", "bypassrls"],
    )
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.security_boundary_required",
        "/database_security_preflight/role_boundaries",
        "readiness gate requires writer/select/migration role boundaries and deny-by-default grants.",
      ),
    );
  }
}

function persistenceReadinessGateRoleBoundaryHasForbiddenGrants(
  value: unknown,
  requiredForbiddenGrants: string[],
): boolean {
  return (
    isPlainObject(value) &&
    Array.isArray(value.forbidden_grants) &&
    requiredForbiddenGrants.every(
      (grant) =>
        Array.isArray(value.forbidden_grants) && value.forbidden_grants.includes(grant),
    )
  );
}

function validatePersistenceReadinessGateMinimumSourceEvidence(
  value: unknown,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  validatePersistenceReadinessGateStringArray(
    value,
    "/minimum_source_evidence",
    "audit_ledger_persistence_readiness_gate.minimum_source_evidence_required",
    errors,
  );

  if (
    Array.isArray(value) &&
    ["BP-0044", "BP-0045", "BP-0058", "BP-0059", "BP-0065", "BP-0070"].some(
      (packetId) => !value.some((item) => isString(item) && item.includes(packetId)),
    )
  ) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.minimum_source_evidence_required",
        "/minimum_source_evidence",
        "minimum source evidence must include migration, persistence, database security, and MCP registration packet refs.",
      ),
    );
  }
}

function validatePersistenceReadinessGateSourceRefs(
  value: unknown,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  validatePersistenceReadinessGateStringArray(
    value,
    "/source_refs",
    "audit_ledger_persistence_readiness_gate.database_security_preflight_refs_required",
    errors,
  );
}

function validatePersistenceReadinessGateStringArray(
  value: unknown,
  path: string,
  code: AuditLedgerPersistenceImplementationReadinessGateErrorCode,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      persistenceReadinessGateError(
        code,
        path,
        "Value must be a safe non-empty string array.",
      ),
    );
    return;
  }

  value.forEach((item, index) => {
    if (!isSafeDatabaseSecurityString(item)) {
      errors.push(
        persistenceReadinessGateError(
          code,
          `${path}/${index}`,
          "Value must be a safe non-empty string.",
        ),
      );
    }
  });
}

function validatePersistenceReadinessGateSideEffects(
  value: unknown,
  path: string,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  if (!Array.isArray(value) || value.length !== 0) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.side_effects_forbidden",
        path,
        "readiness gate must preserve side_effects: [].",
      ),
    );
  }
}

function requirePersistenceReadinessGateString(
  value: unknown,
  path: string,
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): void {
  if (!isSafeDatabaseSecurityString(value)) {
    errors.push(
      persistenceReadinessGateError(
        "audit_ledger_persistence_readiness_gate.invalid_request",
        path,
        "Value must be a safe non-empty string.",
      ),
    );
  }
}

function isDatabaseSecurityPreflightEvidence(
  value: unknown,
): value is AuditLedgerDatabaseSecurityPreflightEvidence {
  return (
    isPlainObject(value) &&
    value.contract_id === AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_CONTRACT_ID &&
    isString(value.request_id) &&
    isPlainObject(value.security_target) &&
    value.security_target.storage_target ===
      AUDIT_LEDGER_WRITER_PERSISTENCE_STORAGE_TARGET &&
    value.security_target.table === "audit_events" &&
    value.security_target.schema_version === "audit_events.v0_1" &&
    isPlainObject(value.persistence_preflight_ref) &&
    isPlainObject(value.policy_gate_ref) &&
    isPlainObject(value.approval_request_ref) &&
    isPlainObject(value.writer_interface_ref) &&
    isPlainObject(value.migration_artifact_refs) &&
    isPlainObject(value.isolation_model) &&
    isPlainObject(value.tenant_project_scope) &&
    isPlainObject(value.role_boundaries) &&
    Array.isArray(value.test_requirements_before_live_scope) &&
    Array.isArray(value.source_refs) &&
    value.live_execution_allowed === false &&
    Array.isArray(value.side_effects) &&
    value.side_effects.length === 0
  );
}

function validatePacketRef(
  value: unknown,
  path: string,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (value === null) {
    return;
  }
  if (!isPlainObject(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        path,
        "packet_ref must be an object or null.",
      ),
    );
    return;
  }

  validateObjectKeys(value, new Set(packetRefKeys), path, errors);
  requireNonEmptyString(value.packet_id, `${path}/packet_id`, errors);

  if (!isString(value.packet_type) || !packetTypeSet.has(value.packet_type)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        `${path}/packet_type`,
        "packet_ref.packet_type must be a known universal packet type.",
      ),
    );
  }

  if (
    Object.hasOwn(value, "packet_hash") &&
    !matchesPattern(value.packet_hash, /^sha256:[a-f0-9]{64}$/)
  ) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        `${path}/packet_hash`,
        "packet_ref.packet_hash must be a canonical sha256 hash when provided.",
      ),
    );
  }
}

function validatePolicyRef(
  value: unknown,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (value === null) {
    return;
  }
  if (!isPlainObject(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/policy_ref",
        "policy_ref must be an object or null.",
      ),
    );
    return;
  }

  validateObjectKeys(value, new Set(policyRefKeys), "/policy_ref", errors);
  requireNonEmptyString(value.decision_id, "/policy_ref/decision_id", errors);

  if (!isString(value.decision) || !policyDecisionSet.has(value.decision)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/policy_ref/decision",
        "policy_ref.decision must be a known policy decision.",
      ),
    );
  }

  if (typeof value.requires_approval !== "boolean") {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/policy_ref/requires_approval",
        "policy_ref.requires_approval must be boolean.",
      ),
    );
  }
}

function validateApprovalRef(
  value: unknown,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (value === null) {
    return;
  }
  if (!isPlainObject(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/approval_ref",
        "approval_ref must be an object or null.",
      ),
    );
    return;
  }

  validateObjectKeys(value, new Set(approvalRefKeys), "/approval_ref", errors);
  requireNonEmptyString(value.approval_id, "/approval_ref/approval_id", errors);

  if (
    Object.hasOwn(value, "decision") &&
    (!isString(value.decision) || !approvalDecisionSet.has(value.decision))
  ) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/approval_ref/decision",
        "approval_ref.decision must be a known approval decision when provided.",
      ),
    );
  }
}

function validateAdapterRef(
  value: unknown,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (value === null) {
    return;
  }
  if (!isPlainObject(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/adapter_ref",
        "adapter_ref must be an object or null.",
      ),
    );
    return;
  }

  validateObjectKeys(value, new Set(adapterRefKeys), "/adapter_ref", errors);

  if (!isString(value.adapter_type) || !adapterTypeSet.has(value.adapter_type)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/adapter_ref/adapter_type",
        "adapter_ref.adapter_type must be a known adapter type.",
      ),
    );
  }
  requireNonEmptyString(value.adapter_id, "/adapter_ref/adapter_id", errors);

  if (Object.hasOwn(value, "contract_id") && !isNonEmptyString(value.contract_id)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/adapter_ref/contract_id",
        "adapter_ref.contract_id must be a non-empty string when provided.",
      ),
    );
  }
}

function validateRedactionSummary(
  value: unknown,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/redaction",
        "redaction must be an object.",
      ),
    );
    return;
  }

  validateObjectKeys(value, new Set(redactionSummaryKeys), "/redaction", errors);

  for (const key of redactionSummaryKeys) {
    if (!(key in value)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.missing_required_field",
          `/redaction/${key}`,
          "Missing required redaction summary field.",
        ),
      );
      continue;
    }

    if (!isString(value[key]) || !redactionStateSet.has(value[key])) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.invalid_field",
          `/redaction/${key}`,
          "redaction summary values must be not_present or withheld.",
        ),
      );
    }
  }
}

function validateSideEffects(
  value: unknown,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (!Array.isArray(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/side_effects",
        "side_effects must be an array.",
      ),
    );
    return;
  }

  value.forEach((effect, index) => {
    const path = `/side_effects/${index}`;
    if (!isPlainObject(effect)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.invalid_field",
          path,
          "side effect entries must be objects.",
        ),
      );
      return;
    }

    validateObjectKeys(effect, new Set(sideEffectKeys), path, errors);
    requireNonEmptyString(effect.effect_type, `${path}/effect_type`, errors);
    requireNonEmptyString(effect.resource_ref, `${path}/resource_ref`, errors);

    if (!isString(effect.status) || !sideEffectStatusSet.has(effect.status)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.invalid_field",
          `${path}/status`,
          "side effect status must be a known value.",
        ),
      );
    }

    if (Object.hasOwn(effect, "result_packet_ref")) {
      validatePacketRef(effect.result_packet_ref, `${path}/result_packet_ref`, errors);
    }
  });
}

function validateNullableRiskLevel(
  value: unknown,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (value === null) {
    return;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        "/risk_level",
        "risk_level must be an integer from 0 through 8 or null.",
      ),
    );
  }
}

function validateObjectKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  path: string,
  errors: AuditLedgerRecordValidationError[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected audit ledger nested field.",
        ),
      );
    }
  }
}

function requireNullableString(
  value: unknown,
  label: string,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (value === null) {
    return;
  }
  requireNonEmptyString(value, `/${label}`, errors);
}

function requireStringArray(
  value: unknown,
  label: string,
  errors: AuditLedgerRecordValidationError[],
  options: { allowEmpty: boolean },
): void {
  const path = `/${label}`;
  if (!Array.isArray(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        path,
        `${label} must be an array.`,
      ),
    );
    return;
  }

  if (!options.allowEmpty && value.length === 0) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        path,
        `${label} must include at least one trusted ref.`,
      ),
    );
  }

  value.forEach((item, index) => {
    requireNonEmptyString(item, `${path}/${index}`, errors);
  });
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (!isNonEmptyString(value)) {
    errors.push(
      ledgerValidationError(
        "audit_ledger.invalid_field",
        path,
        "Value must be a non-empty string.",
      ),
    );
  }
}

function requireWriterString(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterInterfaceError[],
): void {
  if (!isNonEmptyString(value)) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.invalid_request",
        path,
        "Value must be a non-empty string.",
      ),
    );
  }
}

function requireWriterStringArray(
  value: unknown,
  path: string,
  errors: AuditLedgerWriterInterfaceError[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      writerContractError(
        "audit_ledger_writer.invalid_request",
        path,
        "Value must be a non-empty string array.",
      ),
    );
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(
        writerContractError(
          "audit_ledger_writer.invalid_request",
          `${path}/${index}`,
          "Value must be a non-empty string.",
        ),
      );
    }
  });
}

function requireEmptySideEffects(
  value: unknown,
  path: string,
  code: Extract<
    AuditLedgerWriterInterfaceErrorCode,
    | "audit_ledger_writer.policy_gate_invalid"
    | "audit_ledger_writer.approval_request_invalid"
  >,
  errors: AuditLedgerWriterInterfaceError[],
): void {
  if (!Array.isArray(value) || value.length !== 0) {
    errors.push(
      writerContractError(
        code,
        path,
        "writer interface evidence must preserve side_effects: [].",
      ),
    );
  }
}

function requirePatternString(
  value: unknown,
  label: string,
  pattern: RegExp,
  message: string,
  errors: AuditLedgerRecordValidationError[],
): void {
  if (!matchesPattern(value, pattern)) {
    errors.push(
      ledgerValidationError("audit_ledger.invalid_field", `/${label}`, message),
    );
  }
}

function requireIsoTimestamp(
  value: unknown,
  label: string,
  errors: AuditLedgerRecordValidationError[],
): void {
  requirePatternString(
    value,
    label,
    isoDateTimePattern,
    `${label} must be an ISO UTC timestamp.`,
    errors,
  );
}

function findForbiddenPersistenceContent(
  value: unknown,
  path: string,
): AuditLedgerRecordValidationError[] {
  const errors: AuditLedgerRecordValidationError[] = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...findForbiddenPersistenceContent(item, `${path}/${index}`));
    });
    return errors;
  }

  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      const childPath = `${path}/${escapeJsonPointerSegment(key)}`;
      if (isForbiddenRawPersistenceKey(key, path)) {
        errors.push(
          ledgerValidationError(
            "audit_ledger.raw_content_embedded",
            childPath,
            "Raw rejected or invalid payload content must be withheld before audit ledger validation.",
          ),
        );
      }
      if (key.toLowerCase().includes("secret_value")) {
        errors.push(
          ledgerValidationError(
            "audit_ledger.secret_like_value_embedded",
            childPath,
            "Secret-like values must be withheld before audit ledger validation.",
          ),
        );
      }
      errors.push(...findForbiddenPersistenceContent(item, childPath));
    }
    return errors;
  }

  if (typeof value === "string") {
    if (isForbiddenRawPersistenceString(value)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.raw_content_embedded",
          path,
          "Raw command, rejected value, or invalid payload text must not be stored.",
        ),
      );
    }
    if (isSecretLikePersistenceString(value)) {
      errors.push(
        ledgerValidationError(
          "audit_ledger.secret_like_value_embedded",
          path,
          "Secret-like values must not be stored in audit ledger records.",
        ),
      );
    }
  }

  return errors;
}

function isForbiddenRawPersistenceKey(key: string, parentPath: string): boolean {
  if (
    parentPath === "/redaction" &&
    redactionSummaryKeys.includes(key as (typeof redactionSummaryKeys)[number])
  ) {
    return false;
  }

  return [
    "raw_command",
    "raw_rejected_command",
    "rejected_command",
    "raw_rejected_value",
    "rejected_value",
    "raw_invalid_payload_content",
    "invalid_payload_content",
    "raw_payload",
    "raw_input",
    "raw_input_content",
  ].includes(key.toLowerCase());
}

function isForbiddenRawPersistenceString(value: string): boolean {
  return /rm\s+-rf\s+\//i.test(value) || /<script\b/i.test(value);
}

function isSecretLikePersistenceString(value: string): boolean {
  return (
    /^secret:[^\s]+/i.test(value) ||
    /bearer\s+[a-z0-9._-]+/i.test(value) ||
    /(api[_-]?key|token|password|credential|private[_-]?key)\s*[:=]\s*\S+/i.test(
      value,
    ) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /redacted-inline-[a-z0-9_-]*secret/i.test(value) ||
    /do-not-store-secret-values/i.test(value)
  );
}

function ledgerValidationError(
  code: AuditLedgerRecordValidationErrorCode,
  path: string,
  message: string,
): AuditLedgerRecordValidationError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function writerContractError(
  code: AuditLedgerWriterInterfaceErrorCode,
  path: string,
  message: string,
): AuditLedgerWriterInterfaceError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function appendSemanticsError(
  code: AuditLedgerAppendSemanticsConformanceErrorCode,
  path: string,
  message: string,
): AuditLedgerAppendSemanticsConformanceError {
  return { code, path, message, severity: "error" };
}

function persistencePreflightError(
  code: AuditLedgerWriterPersistencePreflightErrorCode,
  path: string,
  message: string,
): AuditLedgerWriterPersistencePreflightError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function databaseSecurityPreflightError(
  code: AuditLedgerDatabaseSecurityPreflightErrorCode,
  path: string,
  message: string,
): AuditLedgerDatabaseSecurityPreflightError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function persistenceReadinessGateError(
  code: AuditLedgerPersistenceImplementationReadinessGateErrorCode,
  path: string,
  message: string,
): AuditLedgerPersistenceImplementationReadinessGateError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function persistenceScopeRequestError(
  code: AuditLedgerPersistenceScopeRequestErrorCode,
  path: string,
  message: string,
): AuditLedgerPersistenceScopeRequestError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function failWriterContract(
  errors: AuditLedgerWriterInterfaceError[],
): AuditLedgerWriterInterfaceResult {
  return {
    ok: false,
    contract: null,
    errors: dedupeWriterErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function failAppendSemanticsConformance(
  errors: AuditLedgerAppendSemanticsConformanceError[],
): AuditLedgerAppendSemanticsConformanceResult {
  return {
    ok: false,
    conformance: null,
    errors,
    state_unchanged: true,
    write_performed: false,
    raw_input_content: "withheld",
    live_execution_allowed: false,
    side_effects: [],
  };
}

function failPersistencePreflight(
  errors: AuditLedgerWriterPersistencePreflightError[],
): AuditLedgerWriterPersistencePreflightResult {
  return {
    ok: false,
    preflight: null,
    errors: dedupePersistencePreflightErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function failDatabaseSecurityPreflight(
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): AuditLedgerDatabaseSecurityPreflightResult {
  return {
    ok: false,
    preflight: null,
    errors: dedupeDatabaseSecurityPreflightErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function failPersistenceReadinessGate(
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): AuditLedgerPersistenceImplementationReadinessGateResult {
  return {
    ok: false,
    gate: null,
    errors: dedupePersistenceReadinessGateErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function failPersistenceScopeRequest(
  errors: AuditLedgerPersistenceScopeRequestError[],
): AuditLedgerPersistenceScopeRequestResult {
  return {
    ok: false,
    scope_request: null,
    errors: dedupePersistenceScopeRequestErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function dedupeLedgerErrors(
  errors: AuditLedgerRecordValidationError[],
): AuditLedgerRecordValidationError[] {
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

function dedupeWriterErrors(
  errors: AuditLedgerWriterInterfaceError[],
): AuditLedgerWriterInterfaceError[] {
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

function dedupePersistencePreflightErrors(
  errors: AuditLedgerWriterPersistencePreflightError[],
): AuditLedgerWriterPersistencePreflightError[] {
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

function dedupeDatabaseSecurityPreflightErrors(
  errors: AuditLedgerDatabaseSecurityPreflightError[],
): AuditLedgerDatabaseSecurityPreflightError[] {
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

function dedupePersistenceReadinessGateErrors(
  errors: AuditLedgerPersistenceImplementationReadinessGateError[],
): AuditLedgerPersistenceImplementationReadinessGateError[] {
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

function dedupePersistenceScopeRequestErrors(
  errors: AuditLedgerPersistenceScopeRequestError[],
): AuditLedgerPersistenceScopeRequestError[] {
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

function arrayEquals(value: unknown, expected: string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, index) => item === expected[index])
  );
}

function matchesPattern(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSafeDatabaseSecurityString(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    !isForbiddenRawPersistenceString(value) &&
    !isSecretLikePersistenceString(value)
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.length <= maxLength;
}

function isBoundedStringArray(
  value: unknown,
  maxItems: number,
  maxItemLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isBoundedString(item, maxItemLength))
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function hasExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!isPlainObject(value) || Object.keys(value).length !== expectedKeys.length) {
    return false;
  }
  const expected = new Set(expectedKeys);
  return hasOnlyKeys(value, expected);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonPointer(label: string): string {
  return `/${label
    .split(".")
    .map((segment) => escapeJsonPointerSegment(segment))
    .join("/")}`;
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
