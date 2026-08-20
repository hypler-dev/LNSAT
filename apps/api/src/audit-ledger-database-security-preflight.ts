import {
  createAuditLedgerDatabaseSecurityPreflightEvidence,
  type AuditLedgerDatabaseSecurityPreflightError,
  type AuditLedgerDatabaseSecurityPreflightEvidence,
  type AuditLedgerWriterPersistencePreflightEvidence,
  type AuditLedgerWriterInterfaceError,
  type AuditLedgerWriterPersistencePreflightError,
} from "@lnsat/audit";
import {
  inspectAuditLedgerWriterPersistencePreflightGatewayRequest,
  type AuditLedgerWriterPersistencePreflightGatewayError,
} from "./audit-ledger-writer-persistence-preflight.js";
import type { AuditLedgerWriterInterfaceGatewayError } from "./audit-ledger-writer-interface.js";

export const AUDIT_LEDGER_DATABASE_SECURITY_PREFLIGHT_GATEWAY_STATUS = "contract_only";

export const auditLedgerDatabaseSecurityPreflightGatewayContract = {
  contract_id: "lnsat.gateway.audit_ledger_database_security_preflight.v0_1",
  method: "POST",
  path: "/v1/audit-ledger/database-security/preflight/inspect",
  authority: ["@lnsat/audit", "@lnsat/policy", "LNSAT Gateway"],
  source_docs: [
    "docs/architecture/AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/architecture/MCP_ADAPTER_DESIGN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/audit/src/index.ts",
    "apps/api/src/audit-ledger-writer-persistence-preflight.ts",
    "apps/api/src/audit-ledger-database-security-preflight.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AuditLedgerDatabaseSecurityPreflightGatewayRequest = {
  request_id?: string;
  actor_id?: string;
  session_id?: string;
  approval_evidence?: {
    mode: "valid" | "mismatched_policy_gate";
  };
  persistence_evidence?: {
    mode:
      | "valid"
      | "missing_writer_interface"
      | "bad_digest_idempotency"
      | "live_execution_side_effects"
      | "missing_migration_artifacts";
  };
  security_evidence?: {
    mode:
      | "valid"
      | "missing_persistence_preflight"
      | "invalid_isolation"
      | "unsafe_scope_roles_tests"
      | "live_execution_side_effects";
  };
};

export type AuditLedgerDatabaseSecurityPreflightGatewayErrorCode =
  | "audit_ledger_database_security_preflight_gateway.invalid_request"
  | "audit_ledger_database_security_preflight_gateway.unexpected_field"
  | "audit_ledger_database_security_preflight_gateway.invalid_request_id"
  | "audit_ledger_database_security_preflight_gateway.invalid_actor_id"
  | "audit_ledger_database_security_preflight_gateway.invalid_session_id"
  | "audit_ledger_database_security_preflight_gateway.invalid_approval_evidence"
  | "audit_ledger_database_security_preflight_gateway.invalid_persistence_evidence"
  | "audit_ledger_database_security_preflight_gateway.invalid_security_evidence";

export type AuditLedgerDatabaseSecurityPreflightGatewayError = {
  code: AuditLedgerDatabaseSecurityPreflightGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerDatabaseSecurityPreflightGatewayResponse =
  | {
      ok: true;
      contract_id: typeof auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id;
      request_id: string;
      inspected_at: string;
      source_docs: string[];
      preflight: AuditLedgerDatabaseSecurityPreflightEvidence;
      persistence_preflight_ref: AuditLedgerDatabaseSecurityPreflightEvidence["persistence_preflight_ref"];
      policy_gate_ref: AuditLedgerDatabaseSecurityPreflightEvidence["policy_gate_ref"];
      approval_request_ref: AuditLedgerDatabaseSecurityPreflightEvidence["approval_request_ref"];
      writer_interface_ref: AuditLedgerDatabaseSecurityPreflightEvidence["writer_interface_ref"];
      migration_artifact_refs: AuditLedgerDatabaseSecurityPreflightEvidence["migration_artifact_refs"];
      isolation_model: AuditLedgerDatabaseSecurityPreflightEvidence["isolation_model"];
      tenant_project_scope: AuditLedgerDatabaseSecurityPreflightEvidence["tenant_project_scope"];
      role_boundaries: AuditLedgerDatabaseSecurityPreflightEvidence["role_boundaries"];
      test_requirements_before_live_scope: string[];
      source_refs: string[];
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AuditLedgerDatabaseSecurityPreflightGatewayError[];
      persistence_request_errors: AuditLedgerWriterPersistencePreflightGatewayError[];
      writer_request_errors: AuditLedgerWriterInterfaceGatewayError[];
      writer_errors: AuditLedgerWriterInterfaceError[];
      persistence_errors: AuditLedgerWriterPersistencePreflightError[];
      security_errors: AuditLedgerDatabaseSecurityPreflightError[];
      preflight: null;
      persistence_preflight_ref: null;
      policy_gate_ref: null;
      approval_request_ref: null;
      writer_interface_ref: null;
      migration_artifact_refs: null;
      isolation_model: null;
      tenant_project_scope: null;
      role_boundaries: null;
      test_requirements_before_live_scope: [];
      source_refs: [];
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type ApprovalEvidenceMode = "valid" | "missing" | "mismatched_policy_gate";
type PersistenceEvidenceMode =
  | "valid"
  | "missing_writer_interface"
  | "bad_digest_idempotency"
  | "live_execution_side_effects"
  | "missing_migration_artifacts";
type SecurityEvidenceMode =
  | "valid"
  | "missing_persistence_preflight"
  | "invalid_isolation"
  | "unsafe_scope_roles_tests"
  | "live_execution_side_effects";

type NormalizedAuditLedgerDatabaseSecurityPreflightRequest =
  | {
      ok: true;
      request_id: string;
      actor_id: string;
      session_id: string;
      approval_evidence_mode: ApprovalEvidenceMode;
      persistence_evidence_mode: PersistenceEvidenceMode;
      security_evidence_mode: SecurityEvidenceMode;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AuditLedgerDatabaseSecurityPreflightGatewayError[];
    };

const defaultRequest = {
  request_id: "req_bp0067_database_security_preflight",
  actor_id: "agent.codex",
  session_id: "sess_bp0067_0001",
} as const;

const requestKeys = new Set([
  "request_id",
  "actor_id",
  "session_id",
  "approval_evidence",
  "persistence_evidence",
  "security_evidence",
]);
const approvalEvidenceModes = new Set(["valid", "mismatched_policy_gate"]);
const persistenceEvidenceModes = new Set([
  "valid",
  "missing_writer_interface",
  "bad_digest_idempotency",
  "live_execution_side_effects",
  "missing_migration_artifacts",
]);
const securityEvidenceModes = new Set([
  "valid",
  "missing_persistence_preflight",
  "invalid_isolation",
  "unsafe_scope_roles_tests",
  "live_execution_side_effects",
]);

export async function inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AuditLedgerDatabaseSecurityPreflightGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAuditLedgerDatabaseSecurityPreflightRequest(input);

  if (!normalized.ok) {
    return databaseSecurityPreflightFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const persistenceResponse =
    await inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
      {
        request_id: normalized.request_id,
        actor_id: normalized.actor_id,
        session_id: normalized.session_id,
        ...(normalized.approval_evidence_mode === "missing"
          ? {}
          : { approval_evidence: { mode: normalized.approval_evidence_mode } }),
        preflight_evidence: { mode: normalized.persistence_evidence_mode },
      },
      { now: new Date(inspectedAt) },
    );

  if (!persistenceResponse.ok) {
    return databaseSecurityPreflightFailure(
      normalized.request_id,
      inspectedAt,
      [],
      persistenceResponse.request_errors,
      persistenceResponse.writer_request_errors,
      persistenceResponse.writer_errors,
      persistenceResponse.preflight_errors,
    );
  }

  const securityResult = createAuditLedgerDatabaseSecurityPreflightEvidence(
    buildDatabaseSecurityPreflightInput(
      normalized.request_id,
      persistenceResponse.preflight,
      normalized.security_evidence_mode,
    ),
  );

  if (!securityResult.ok) {
    return databaseSecurityPreflightFailure(
      normalized.request_id,
      inspectedAt,
      [],
      [],
      [],
      [],
      [],
      securityResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: auditLedgerDatabaseSecurityPreflightSourceDocs(),
    preflight: securityResult.preflight,
    persistence_preflight_ref: securityResult.preflight.persistence_preflight_ref,
    policy_gate_ref: securityResult.preflight.policy_gate_ref,
    approval_request_ref: securityResult.preflight.approval_request_ref,
    writer_interface_ref: securityResult.preflight.writer_interface_ref,
    migration_artifact_refs: securityResult.preflight.migration_artifact_refs,
    isolation_model: securityResult.preflight.isolation_model,
    tenant_project_scope: securityResult.preflight.tenant_project_scope,
    role_boundaries: securityResult.preflight.role_boundaries,
    test_requirements_before_live_scope:
      securityResult.preflight.test_requirements_before_live_scope,
    source_refs: securityResult.preflight.source_refs,
    live_execution_allowed: securityResult.preflight.live_execution_allowed,
    side_effects: securityResult.side_effects,
  };
}

function normalizeAuditLedgerDatabaseSecurityPreflightRequest(
  input: unknown,
): NormalizedAuditLedgerDatabaseSecurityPreflightRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_request",
          "",
          "Audit ledger database security preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: AuditLedgerDatabaseSecurityPreflightGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger database security preflight request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" ? input.request_id : defaultRequest.request_id;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      databaseSecurityGatewayError(
        "audit_ledger_database_security_preflight_gateway.invalid_request_id",
        "/request_id",
        "Audit ledger database security preflight request_id must be a string when provided.",
      ),
    );
  }

  const actorId =
    typeof input.actor_id === "string" ? input.actor_id : defaultRequest.actor_id;
  if (Object.hasOwn(input, "actor_id") && typeof input.actor_id !== "string") {
    errors.push(
      databaseSecurityGatewayError(
        "audit_ledger_database_security_preflight_gateway.invalid_actor_id",
        "/actor_id",
        "Audit ledger database security preflight actor_id must be a string when provided.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultRequest.session_id;
  if (Object.hasOwn(input, "session_id") && typeof input.session_id !== "string") {
    errors.push(
      databaseSecurityGatewayError(
        "audit_ledger_database_security_preflight_gateway.invalid_session_id",
        "/session_id",
        "Audit ledger database security preflight session_id must be a string when provided.",
      ),
    );
  }

  let approvalEvidenceMode: ApprovalEvidenceMode = "missing";
  if (Object.hasOwn(input, "approval_evidence")) {
    if (!isPlainObject(input.approval_evidence)) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_approval_evidence",
          "/approval_evidence",
          "Audit ledger database security preflight approval evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.approval_evidence.mode === "string" &&
      approvalEvidenceModes.has(input.approval_evidence.mode)
    )) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_approval_evidence",
          "/approval_evidence/mode",
          "Audit ledger database security preflight approval evidence mode is unsupported.",
        ),
      );
    } else {
      approvalEvidenceMode = input.approval_evidence.mode as ApprovalEvidenceMode;
    }
  }

  let persistenceEvidenceMode: PersistenceEvidenceMode = "valid";
  if (Object.hasOwn(input, "persistence_evidence")) {
    if (!isPlainObject(input.persistence_evidence)) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_persistence_evidence",
          "/persistence_evidence",
          "Audit ledger database security preflight persistence evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.persistence_evidence.mode === "string" &&
      persistenceEvidenceModes.has(input.persistence_evidence.mode)
    )) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_persistence_evidence",
          "/persistence_evidence/mode",
          "Audit ledger database security preflight persistence evidence mode is unsupported.",
        ),
      );
    } else {
      persistenceEvidenceMode = input.persistence_evidence
        .mode as PersistenceEvidenceMode;
    }
  }

  let securityEvidenceMode: SecurityEvidenceMode = "valid";
  if (Object.hasOwn(input, "security_evidence")) {
    if (!isPlainObject(input.security_evidence)) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_security_evidence",
          "/security_evidence",
          "Audit ledger database security preflight security evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.security_evidence.mode === "string" &&
      securityEvidenceModes.has(input.security_evidence.mode)
    )) {
      errors.push(
        databaseSecurityGatewayError(
          "audit_ledger_database_security_preflight_gateway.invalid_security_evidence",
          "/security_evidence/mode",
          "Audit ledger database security preflight security evidence mode is unsupported.",
        ),
      );
    } else {
      securityEvidenceMode = input.security_evidence.mode as SecurityEvidenceMode;
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      request_id: typeof input.request_id === "string" ? input.request_id : null,
      errors,
    };
  }

  return {
    ok: true,
    request_id: requestId,
    actor_id: actorId,
    session_id: sessionId,
    approval_evidence_mode: approvalEvidenceMode,
    persistence_evidence_mode: persistenceEvidenceMode,
    security_evidence_mode: securityEvidenceMode,
  };
}

function buildDatabaseSecurityPreflightInput(
  requestId: string,
  persistencePreflight: AuditLedgerWriterPersistencePreflightEvidence,
  mode: SecurityEvidenceMode,
): Record<string, unknown> {
  if (mode === "missing_persistence_preflight") {
    return {
      request_id: requestId,
      raw_rejected_value: "psql $DATABASE_URL -c 'drop table audit_events'",
    };
  }

  if (mode === "invalid_isolation") {
    return {
      request_id: requestId,
      persistence_preflight: persistencePreflight,
      isolation_model: {
        mode: "shared_table_no_rls",
        approved_equivalent_isolation_ref: null,
        deny_by_default: false,
        bypass_rls_forbidden: false,
      },
    };
  }

  if (mode === "unsafe_scope_roles_tests") {
    return {
      request_id: requestId,
      persistence_preflight: persistencePreflight,
      tenant_project_scope: {
        required_row_scope_fields: ["project_id"],
        scope_source: "future_audit_events_columns_or_approved_equivalent_boundary",
        enforcement: "unscoped_select_allowed",
        missing_scope_behavior: "allow",
      },
      role_boundaries: {
        writer_role: {
          role_ref: "role_ref:audit_ledger_writer",
          allowed_grants: ["insert_audit_events", "update"],
          forbidden_grants: ["delete"],
        },
        select_role: {
          role_ref: "role_ref:audit_ledger_reader",
          allowed_grants: ["select_scoped_audit_events", "unscoped_select"],
          forbidden_grants: ["delete"],
        },
        migration_role: {
          role_ref: "role_ref:audit_ledger_migrator",
          allowed_grants: ["unapproved_ddl"],
          forbidden_grants: ["superuser"],
        },
      },
      test_requirements: ["static_security_preflight_check"],
    };
  }

  if (mode === "live_execution_side_effects") {
    return {
      request_id: requestId,
      persistence_preflight: persistencePreflight,
      live_execution_allowed: true,
      side_effects: [
        {
          effect_type: "database_write",
          resource_ref: "database:postgres/audit_events",
          status: "requested",
        },
      ],
    };
  }

  return {
    request_id: requestId,
    persistence_preflight: persistencePreflight,
  };
}

function databaseSecurityPreflightFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AuditLedgerDatabaseSecurityPreflightGatewayError[],
  persistenceRequestErrors: AuditLedgerWriterPersistencePreflightGatewayError[] = [],
  writerRequestErrors: AuditLedgerWriterInterfaceGatewayError[] = [],
  writerErrors: AuditLedgerWriterInterfaceError[] = [],
  persistenceErrors: AuditLedgerWriterPersistencePreflightError[] = [],
  securityErrors: AuditLedgerDatabaseSecurityPreflightError[] = [],
): AuditLedgerDatabaseSecurityPreflightGatewayResponse {
  return {
    ok: false,
    contract_id: auditLedgerDatabaseSecurityPreflightGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: auditLedgerDatabaseSecurityPreflightSourceDocs(),
    request_errors: requestErrors,
    persistence_request_errors: persistenceRequestErrors,
    writer_request_errors: writerRequestErrors,
    writer_errors: writerErrors,
    persistence_errors: persistenceErrors,
    security_errors: securityErrors,
    preflight: null,
    persistence_preflight_ref: null,
    policy_gate_ref: null,
    approval_request_ref: null,
    writer_interface_ref: null,
    migration_artifact_refs: null,
    isolation_model: null,
    tenant_project_scope: null,
    role_boundaries: null,
    test_requirements_before_live_scope: [],
    source_refs: [],
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function auditLedgerDatabaseSecurityPreflightSourceDocs(): string[] {
  return [...auditLedgerDatabaseSecurityPreflightGatewayContract.source_docs];
}

function databaseSecurityGatewayError(
  code: AuditLedgerDatabaseSecurityPreflightGatewayErrorCode,
  path: string,
  message: string,
): AuditLedgerDatabaseSecurityPreflightGatewayError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function jsonPointer(label: string): string {
  return `/${label
    .split(".")
    .map((segment) => segment.replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
