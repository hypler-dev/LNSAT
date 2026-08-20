import {
  createAuditLedgerPersistenceImplementationReadinessGateEvidence,
  type AuditLedgerDatabaseSecurityPreflightError,
  type AuditLedgerPersistenceImplementationReadinessGateError,
  type AuditLedgerPersistenceImplementationReadinessGateEvidence,
  type AuditLedgerWriterInterfaceError,
  type AuditLedgerWriterPersistencePreflightError,
} from "@lnsat/audit";
import {
  inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest,
  type AuditLedgerDatabaseSecurityPreflightGatewayError,
} from "./audit-ledger-database-security-preflight.js";
import type { AuditLedgerWriterInterfaceGatewayError } from "./audit-ledger-writer-interface.js";
import type { AuditLedgerWriterPersistencePreflightGatewayError } from "./audit-ledger-writer-persistence-preflight.js";

export const AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_STATUS = "contract_only";

export const auditLedgerPersistenceReadinessGatewayContract = {
  contract_id: "lnsat.gateway.audit_ledger_persistence_readiness_gate.v0_1",
  method: "POST",
  path: "/v1/audit-ledger/persistence-readiness/inspect",
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
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/audit/src/index.ts",
    "apps/api/src/audit-ledger-database-security-preflight.ts",
    "apps/api/src/audit-ledger-persistence-readiness-gate.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AuditLedgerPersistenceReadinessGatewayRequest = {
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
  readiness_evidence?: {
    mode:
      | "valid"
      | "missing_database_security"
      | "incomplete_minimum_source_evidence"
      | "live_execution_side_effects";
  };
};

export type AuditLedgerPersistenceReadinessGatewayErrorCode =
  | "audit_ledger_persistence_readiness_gateway.invalid_request"
  | "audit_ledger_persistence_readiness_gateway.unexpected_field"
  | "audit_ledger_persistence_readiness_gateway.invalid_request_id"
  | "audit_ledger_persistence_readiness_gateway.invalid_actor_id"
  | "audit_ledger_persistence_readiness_gateway.invalid_session_id"
  | "audit_ledger_persistence_readiness_gateway.invalid_approval_evidence"
  | "audit_ledger_persistence_readiness_gateway.invalid_persistence_evidence"
  | "audit_ledger_persistence_readiness_gateway.invalid_security_evidence"
  | "audit_ledger_persistence_readiness_gateway.invalid_readiness_evidence";

export type AuditLedgerPersistenceReadinessGatewayError = {
  code: AuditLedgerPersistenceReadinessGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerPersistenceReadinessGatewayResponse =
  | {
      ok: true;
      contract_id: typeof auditLedgerPersistenceReadinessGatewayContract.contract_id;
      request_id: string;
      inspected_at: string;
      source_docs: string[];
      gate: AuditLedgerPersistenceImplementationReadinessGateEvidence;
      readiness: AuditLedgerPersistenceImplementationReadinessGateEvidence["readiness"];
      reviewed_source_chain: AuditLedgerPersistenceImplementationReadinessGateEvidence["reviewed_source_chain"];
      minimum_source_evidence_before_live_scope: string[];
      security_requirements: AuditLedgerPersistenceImplementationReadinessGateEvidence["security_requirements"];
      source_refs: string[];
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof auditLedgerPersistenceReadinessGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AuditLedgerPersistenceReadinessGatewayError[];
      database_security_request_errors: AuditLedgerDatabaseSecurityPreflightGatewayError[];
      persistence_request_errors: AuditLedgerWriterPersistencePreflightGatewayError[];
      writer_request_errors: AuditLedgerWriterInterfaceGatewayError[];
      writer_errors: AuditLedgerWriterInterfaceError[];
      persistence_errors: AuditLedgerWriterPersistencePreflightError[];
      security_errors: AuditLedgerDatabaseSecurityPreflightError[];
      readiness_errors: AuditLedgerPersistenceImplementationReadinessGateError[];
      gate: null;
      readiness: null;
      reviewed_source_chain: null;
      minimum_source_evidence_before_live_scope: [];
      security_requirements: null;
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
type ReadinessEvidenceMode =
  | "valid"
  | "missing_database_security"
  | "incomplete_minimum_source_evidence"
  | "live_execution_side_effects";

type NormalizedAuditLedgerPersistenceReadinessRequest =
  | {
      ok: true;
      request_id: string;
      actor_id: string;
      session_id: string;
      approval_evidence_mode: ApprovalEvidenceMode;
      persistence_evidence_mode: PersistenceEvidenceMode;
      security_evidence_mode: SecurityEvidenceMode;
      readiness_evidence_mode: ReadinessEvidenceMode;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AuditLedgerPersistenceReadinessGatewayError[];
    };

const defaultRequest = {
  request_id: "req_bp0073_persistence_readiness",
  actor_id: "agent.codex",
  session_id: "sess_bp0073_0001",
} as const;

const requestKeys = new Set([
  "request_id",
  "actor_id",
  "session_id",
  "approval_evidence",
  "persistence_evidence",
  "security_evidence",
  "readiness_evidence",
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
const readinessEvidenceModes = new Set([
  "valid",
  "missing_database_security",
  "incomplete_minimum_source_evidence",
  "live_execution_side_effects",
]);

export async function inspectAuditLedgerPersistenceReadinessGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AuditLedgerPersistenceReadinessGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAuditLedgerPersistenceReadinessRequest(input);

  if (!normalized.ok) {
    return persistenceReadinessFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const securityResponse =
    await inspectAuditLedgerDatabaseSecurityPreflightGatewayRequest(
      {
        request_id: normalized.request_id,
        actor_id: normalized.actor_id,
        session_id: normalized.session_id,
        ...(normalized.approval_evidence_mode === "missing"
          ? {}
          : { approval_evidence: { mode: normalized.approval_evidence_mode } }),
        persistence_evidence: { mode: normalized.persistence_evidence_mode },
        security_evidence: { mode: normalized.security_evidence_mode },
      },
      { now: new Date(inspectedAt) },
    );

  if (!securityResponse.ok) {
    return persistenceReadinessFailure(
      normalized.request_id,
      inspectedAt,
      [],
      securityResponse.request_errors,
      securityResponse.persistence_request_errors,
      securityResponse.writer_request_errors,
      securityResponse.writer_errors,
      securityResponse.persistence_errors,
      securityResponse.security_errors,
    );
  }

  const readinessResult =
    createAuditLedgerPersistenceImplementationReadinessGateEvidence(
      buildReadinessGateInput(
        normalized.request_id,
        securityResponse.preflight,
        normalized.readiness_evidence_mode,
      ),
    );

  if (!readinessResult.ok) {
    return persistenceReadinessFailure(
      normalized.request_id,
      inspectedAt,
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      readinessResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: auditLedgerPersistenceReadinessSourceDocs(),
    gate: readinessResult.gate,
    readiness: readinessResult.gate.readiness,
    reviewed_source_chain: readinessResult.gate.reviewed_source_chain,
    minimum_source_evidence_before_live_scope:
      readinessResult.gate.minimum_source_evidence_before_live_scope,
    security_requirements: readinessResult.gate.security_requirements,
    source_refs: readinessResult.gate.source_refs,
    live_execution_allowed: readinessResult.gate.live_execution_allowed,
    side_effects: readinessResult.side_effects,
  };
}

function normalizeAuditLedgerPersistenceReadinessRequest(
  input: unknown,
): NormalizedAuditLedgerPersistenceReadinessRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_request",
          "",
          "Audit ledger persistence readiness request must be an object.",
        ),
      ],
    };
  }

  const errors: AuditLedgerPersistenceReadinessGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger persistence readiness request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" ? input.request_id : defaultRequest.request_id;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      persistenceReadinessGatewayError(
        "audit_ledger_persistence_readiness_gateway.invalid_request_id",
        "/request_id",
        "Audit ledger persistence readiness request_id must be a string when provided.",
      ),
    );
  }

  const actorId =
    typeof input.actor_id === "string" ? input.actor_id : defaultRequest.actor_id;
  if (Object.hasOwn(input, "actor_id") && typeof input.actor_id !== "string") {
    errors.push(
      persistenceReadinessGatewayError(
        "audit_ledger_persistence_readiness_gateway.invalid_actor_id",
        "/actor_id",
        "Audit ledger persistence readiness actor_id must be a string when provided.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultRequest.session_id;
  if (Object.hasOwn(input, "session_id") && typeof input.session_id !== "string") {
    errors.push(
      persistenceReadinessGatewayError(
        "audit_ledger_persistence_readiness_gateway.invalid_session_id",
        "/session_id",
        "Audit ledger persistence readiness session_id must be a string when provided.",
      ),
    );
  }

  let approvalEvidenceMode: ApprovalEvidenceMode = "missing";
  if (Object.hasOwn(input, "approval_evidence")) {
    if (!isPlainObject(input.approval_evidence)) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_approval_evidence",
          "/approval_evidence",
          "Audit ledger persistence readiness approval evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.approval_evidence.mode === "string" &&
      approvalEvidenceModes.has(input.approval_evidence.mode)
    )) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_approval_evidence",
          "/approval_evidence/mode",
          "Audit ledger persistence readiness approval evidence mode is unsupported.",
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
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_persistence_evidence",
          "/persistence_evidence",
          "Audit ledger persistence readiness persistence evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.persistence_evidence.mode === "string" &&
      persistenceEvidenceModes.has(input.persistence_evidence.mode)
    )) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_persistence_evidence",
          "/persistence_evidence/mode",
          "Audit ledger persistence readiness persistence evidence mode is unsupported.",
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
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_security_evidence",
          "/security_evidence",
          "Audit ledger persistence readiness security evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.security_evidence.mode === "string" &&
      securityEvidenceModes.has(input.security_evidence.mode)
    )) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_security_evidence",
          "/security_evidence/mode",
          "Audit ledger persistence readiness security evidence mode is unsupported.",
        ),
      );
    } else {
      securityEvidenceMode = input.security_evidence.mode as SecurityEvidenceMode;
    }
  }

  let readinessEvidenceMode: ReadinessEvidenceMode = "valid";
  if (Object.hasOwn(input, "readiness_evidence")) {
    if (!isPlainObject(input.readiness_evidence)) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_readiness_evidence",
          "/readiness_evidence",
          "Audit ledger persistence readiness evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.readiness_evidence.mode === "string" &&
      readinessEvidenceModes.has(input.readiness_evidence.mode)
    )) {
      errors.push(
        persistenceReadinessGatewayError(
          "audit_ledger_persistence_readiness_gateway.invalid_readiness_evidence",
          "/readiness_evidence/mode",
          "Audit ledger persistence readiness evidence mode is unsupported.",
        ),
      );
    } else {
      readinessEvidenceMode = input.readiness_evidence.mode as ReadinessEvidenceMode;
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
    readiness_evidence_mode: readinessEvidenceMode,
  };
}

function buildReadinessGateInput(
  requestId: string,
  databaseSecurityPreflight: unknown,
  mode: ReadinessEvidenceMode,
): Record<string, unknown> {
  if (mode === "missing_database_security") {
    return {
      request_id: requestId,
      raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
    };
  }

  if (mode === "incomplete_minimum_source_evidence") {
    return {
      request_id: requestId,
      database_security_preflight: databaseSecurityPreflight,
      minimum_source_evidence: ["BP-0044 only"],
    };
  }

  if (mode === "live_execution_side_effects") {
    return {
      request_id: requestId,
      database_security_preflight: databaseSecurityPreflight,
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
    database_security_preflight: databaseSecurityPreflight,
  };
}

function persistenceReadinessFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AuditLedgerPersistenceReadinessGatewayError[],
  databaseSecurityRequestErrors: AuditLedgerDatabaseSecurityPreflightGatewayError[] = [],
  persistenceRequestErrors: AuditLedgerWriterPersistencePreflightGatewayError[] = [],
  writerRequestErrors: AuditLedgerWriterInterfaceGatewayError[] = [],
  writerErrors: AuditLedgerWriterInterfaceError[] = [],
  persistenceErrors: AuditLedgerWriterPersistencePreflightError[] = [],
  securityErrors: AuditLedgerDatabaseSecurityPreflightError[] = [],
  readinessErrors: AuditLedgerPersistenceImplementationReadinessGateError[] = [],
): AuditLedgerPersistenceReadinessGatewayResponse {
  return {
    ok: false,
    contract_id: auditLedgerPersistenceReadinessGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: auditLedgerPersistenceReadinessSourceDocs(),
    request_errors: requestErrors,
    database_security_request_errors: databaseSecurityRequestErrors,
    persistence_request_errors: persistenceRequestErrors,
    writer_request_errors: writerRequestErrors,
    writer_errors: writerErrors,
    persistence_errors: persistenceErrors,
    security_errors: securityErrors,
    readiness_errors: readinessErrors,
    gate: null,
    readiness: null,
    reviewed_source_chain: null,
    minimum_source_evidence_before_live_scope: [],
    security_requirements: null,
    source_refs: [],
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function auditLedgerPersistenceReadinessSourceDocs(): string[] {
  return [...auditLedgerPersistenceReadinessGatewayContract.source_docs];
}

function persistenceReadinessGatewayError(
  code: AuditLedgerPersistenceReadinessGatewayErrorCode,
  path: string,
  message: string,
): AuditLedgerPersistenceReadinessGatewayError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function jsonPointer(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
