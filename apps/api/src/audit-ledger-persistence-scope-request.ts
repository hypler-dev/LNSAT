import {
  AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
  AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL,
  AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_CONTRACT_ID,
  createAuditLedgerPersistenceScopeRequestEvidence,
  type AuditLedgerDatabaseSecurityPreflightError,
  type AuditLedgerPersistenceImplementationReadinessGateError,
  type AuditLedgerPersistenceScopeRequestError,
  type AuditLedgerPersistenceScopeRequestEvidence,
  type AuditLedgerWriterInterfaceError,
  type AuditLedgerWriterPersistencePreflightError,
} from "@lnsat/audit";
import {
  inspectAuditLedgerPersistenceReadinessGatewayRequest,
  type AuditLedgerPersistenceReadinessGatewayError,
} from "./audit-ledger-persistence-readiness-gate.js";
import type { AuditLedgerDatabaseSecurityPreflightGatewayError } from "./audit-ledger-database-security-preflight.js";
import type { AuditLedgerWriterInterfaceGatewayError } from "./audit-ledger-writer-interface.js";
import type { AuditLedgerWriterPersistencePreflightGatewayError } from "./audit-ledger-writer-persistence-preflight.js";

export const AUDIT_LEDGER_PERSISTENCE_SCOPE_REQUEST_GATEWAY_STATUS = "contract_only";

export const auditLedgerPersistenceScopeRequestGatewayContract = {
  contract_id: "lnsat.gateway.audit_ledger_persistence_scope_request.v0_1",
  method: "POST",
  path: "/v1/audit-ledger/persistence-scope/request/inspect",
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
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/audit/src/index.ts",
    "apps/api/src/audit-ledger-persistence-readiness-gate.ts",
    "apps/api/src/audit-ledger-persistence-scope-request.ts",
    "packages/mcp/src/index.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AuditLedgerPersistenceScopeRequestGatewayRequest = {
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
  readiness_source?: {
    mode:
      | "direct_gateway_evidence"
      | "registered_mcp_inspection_evidence"
      | "invalid_mcp_readiness_source";
  };
  scope_evidence?: {
    mode:
      | "valid"
      | "missing_readiness_source"
      | "incomplete_minimum_source_evidence"
      | "live_execution_side_effects";
  };
};

export type AuditLedgerPersistenceScopeRequestGatewayErrorCode =
  | "audit_ledger_persistence_scope_request_gateway.invalid_request"
  | "audit_ledger_persistence_scope_request_gateway.unexpected_field"
  | "audit_ledger_persistence_scope_request_gateway.invalid_request_id"
  | "audit_ledger_persistence_scope_request_gateway.invalid_actor_id"
  | "audit_ledger_persistence_scope_request_gateway.invalid_session_id"
  | "audit_ledger_persistence_scope_request_gateway.invalid_approval_evidence"
  | "audit_ledger_persistence_scope_request_gateway.invalid_persistence_evidence"
  | "audit_ledger_persistence_scope_request_gateway.invalid_security_evidence"
  | "audit_ledger_persistence_scope_request_gateway.invalid_readiness_evidence"
  | "audit_ledger_persistence_scope_request_gateway.invalid_readiness_source"
  | "audit_ledger_persistence_scope_request_gateway.invalid_scope_evidence";

export type AuditLedgerPersistenceScopeRequestGatewayError = {
  code: AuditLedgerPersistenceScopeRequestGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerPersistenceScopeRequestGatewayResponse =
  | {
      ok: true;
      contract_id: typeof auditLedgerPersistenceScopeRequestGatewayContract.contract_id;
      request_id: string;
      inspected_at: string;
      source_docs: string[];
      scope_request: AuditLedgerPersistenceScopeRequestEvidence;
      readiness_gate_ref: AuditLedgerPersistenceScopeRequestEvidence["readiness_gate_ref"];
      readiness_source: AuditLedgerPersistenceScopeRequestEvidence["readiness_source"];
      reviewed_source_chain: AuditLedgerPersistenceScopeRequestEvidence["reviewed_source_chain"];
      minimum_source_evidence_before_live_scope: string[];
      security_requirements: AuditLedgerPersistenceScopeRequestEvidence["security_requirements"];
      source_refs: string[];
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof auditLedgerPersistenceScopeRequestGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AuditLedgerPersistenceScopeRequestGatewayError[];
      readiness_request_errors: AuditLedgerPersistenceReadinessGatewayError[];
      database_security_request_errors: AuditLedgerDatabaseSecurityPreflightGatewayError[];
      persistence_request_errors: AuditLedgerWriterPersistencePreflightGatewayError[];
      writer_request_errors: AuditLedgerWriterInterfaceGatewayError[];
      writer_errors: AuditLedgerWriterInterfaceError[];
      persistence_errors: AuditLedgerWriterPersistencePreflightError[];
      security_errors: AuditLedgerDatabaseSecurityPreflightError[];
      readiness_errors: AuditLedgerPersistenceImplementationReadinessGateError[];
      scope_request_errors: AuditLedgerPersistenceScopeRequestError[];
      scope_request: null;
      readiness_gate_ref: null;
      readiness_source: null;
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
type ReadinessSourceMode =
  | "direct_gateway_evidence"
  | "registered_mcp_inspection_evidence"
  | "invalid_mcp_readiness_source";
type ScopeEvidenceMode =
  | "valid"
  | "missing_readiness_source"
  | "incomplete_minimum_source_evidence"
  | "live_execution_side_effects";

type NormalizedAuditLedgerPersistenceScopeRequest =
  | {
      ok: true;
      request_id: string;
      actor_id: string;
      session_id: string;
      approval_evidence_mode: ApprovalEvidenceMode;
      persistence_evidence_mode: PersistenceEvidenceMode;
      security_evidence_mode: SecurityEvidenceMode;
      readiness_evidence_mode: ReadinessEvidenceMode;
      readiness_source_mode: ReadinessSourceMode;
      scope_evidence_mode: ScopeEvidenceMode;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AuditLedgerPersistenceScopeRequestGatewayError[];
    };

const defaultRequest = {
  request_id: "req_bp0077_persistence_scope_request",
  actor_id: "agent.codex",
  session_id: "sess_bp0077_0001",
} as const;

const requestKeys = new Set([
  "request_id",
  "actor_id",
  "session_id",
  "approval_evidence",
  "persistence_evidence",
  "security_evidence",
  "readiness_evidence",
  "readiness_source",
  "scope_evidence",
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
const readinessSourceModes = new Set([
  "direct_gateway_evidence",
  "registered_mcp_inspection_evidence",
  "invalid_mcp_readiness_source",
]);
const scopeEvidenceModes = new Set([
  "valid",
  "missing_readiness_source",
  "incomplete_minimum_source_evidence",
  "live_execution_side_effects",
]);

export async function inspectAuditLedgerPersistenceScopeRequestGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AuditLedgerPersistenceScopeRequestGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAuditLedgerPersistenceScopeRequest(input);

  if (!normalized.ok) {
    return persistenceScopeRequestFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const readinessResponse = await inspectAuditLedgerPersistenceReadinessGatewayRequest(
    {
      request_id: normalized.request_id,
      actor_id: normalized.actor_id,
      session_id: normalized.session_id,
      ...(normalized.approval_evidence_mode === "missing"
        ? {}
        : { approval_evidence: { mode: normalized.approval_evidence_mode } }),
      persistence_evidence: { mode: normalized.persistence_evidence_mode },
      security_evidence: { mode: normalized.security_evidence_mode },
      readiness_evidence: { mode: normalized.readiness_evidence_mode },
    },
    { now: new Date(inspectedAt) },
  );

  if (!readinessResponse.ok) {
    return persistenceScopeRequestFailure(
      normalized.request_id,
      inspectedAt,
      [],
      readinessResponse.request_errors,
      readinessResponse.database_security_request_errors,
      readinessResponse.persistence_request_errors,
      readinessResponse.writer_request_errors,
      readinessResponse.writer_errors,
      readinessResponse.persistence_errors,
      readinessResponse.security_errors,
      readinessResponse.readiness_errors,
    );
  }

  const scopeRequestResult = createAuditLedgerPersistenceScopeRequestEvidence(
    buildScopeRequestInput(
      normalized.request_id,
      readinessResponse,
      normalized.readiness_source_mode,
      normalized.scope_evidence_mode,
    ),
  );

  if (!scopeRequestResult.ok) {
    return persistenceScopeRequestFailure(
      normalized.request_id,
      inspectedAt,
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      scopeRequestResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: auditLedgerPersistenceScopeRequestSourceDocs(),
    scope_request: scopeRequestResult.scope_request,
    readiness_gate_ref: scopeRequestResult.scope_request.readiness_gate_ref,
    readiness_source: scopeRequestResult.scope_request.readiness_source,
    reviewed_source_chain: scopeRequestResult.scope_request.reviewed_source_chain,
    minimum_source_evidence_before_live_scope:
      scopeRequestResult.scope_request.minimum_source_evidence_before_live_scope,
    security_requirements: scopeRequestResult.scope_request.security_requirements,
    source_refs: scopeRequestResult.scope_request.source_refs,
    live_execution_allowed: scopeRequestResult.scope_request.live_execution_allowed,
    side_effects: scopeRequestResult.side_effects,
  };
}

function normalizeAuditLedgerPersistenceScopeRequest(
  input: unknown,
): NormalizedAuditLedgerPersistenceScopeRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        persistenceScopeRequestGatewayError(
          "audit_ledger_persistence_scope_request_gateway.invalid_request",
          "",
          "Audit ledger persistence scope request must be an object.",
        ),
      ],
    };
  }

  const errors: AuditLedgerPersistenceScopeRequestGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        persistenceScopeRequestGatewayError(
          "audit_ledger_persistence_scope_request_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger persistence scope request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" ? input.request_id : defaultRequest.request_id;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      persistenceScopeRequestGatewayError(
        "audit_ledger_persistence_scope_request_gateway.invalid_request_id",
        "/request_id",
        "Audit ledger persistence scope request_id must be a string when provided.",
      ),
    );
  }

  const actorId =
    typeof input.actor_id === "string" ? input.actor_id : defaultRequest.actor_id;
  if (Object.hasOwn(input, "actor_id") && typeof input.actor_id !== "string") {
    errors.push(
      persistenceScopeRequestGatewayError(
        "audit_ledger_persistence_scope_request_gateway.invalid_actor_id",
        "/actor_id",
        "Audit ledger persistence scope actor_id must be a string when provided.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultRequest.session_id;
  if (Object.hasOwn(input, "session_id") && typeof input.session_id !== "string") {
    errors.push(
      persistenceScopeRequestGatewayError(
        "audit_ledger_persistence_scope_request_gateway.invalid_session_id",
        "/session_id",
        "Audit ledger persistence scope session_id must be a string when provided.",
      ),
    );
  }

  const approvalEvidenceMode = normalizeMode(
    input,
    "approval_evidence",
    approvalEvidenceModes,
    "valid",
    "audit_ledger_persistence_scope_request_gateway.invalid_approval_evidence",
    errors,
  ) as ApprovalEvidenceMode;
  const persistenceEvidenceMode = normalizeMode(
    input,
    "persistence_evidence",
    persistenceEvidenceModes,
    "valid",
    "audit_ledger_persistence_scope_request_gateway.invalid_persistence_evidence",
    errors,
  ) as PersistenceEvidenceMode;
  const securityEvidenceMode = normalizeMode(
    input,
    "security_evidence",
    securityEvidenceModes,
    "valid",
    "audit_ledger_persistence_scope_request_gateway.invalid_security_evidence",
    errors,
  ) as SecurityEvidenceMode;
  const readinessEvidenceMode = normalizeMode(
    input,
    "readiness_evidence",
    readinessEvidenceModes,
    "valid",
    "audit_ledger_persistence_scope_request_gateway.invalid_readiness_evidence",
    errors,
  ) as ReadinessEvidenceMode;
  const readinessSourceMode = normalizeMode(
    input,
    "readiness_source",
    readinessSourceModes,
    "direct_gateway_evidence",
    "audit_ledger_persistence_scope_request_gateway.invalid_readiness_source",
    errors,
  ) as ReadinessSourceMode;
  const scopeEvidenceMode = normalizeMode(
    input,
    "scope_evidence",
    scopeEvidenceModes,
    "valid",
    "audit_ledger_persistence_scope_request_gateway.invalid_scope_evidence",
    errors,
  ) as ScopeEvidenceMode;

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
    readiness_source_mode: readinessSourceMode,
    scope_evidence_mode: scopeEvidenceMode,
  };
}

function normalizeMode(
  input: Record<string, unknown>,
  key: string,
  modes: Set<string>,
  defaultMode: string,
  errorCode: AuditLedgerPersistenceScopeRequestGatewayErrorCode,
  errors: AuditLedgerPersistenceScopeRequestGatewayError[],
): string {
  if (!Object.hasOwn(input, key)) {
    return defaultMode;
  }

  const value = input[key];
  if (!isPlainObject(value)) {
    errors.push(
      persistenceScopeRequestGatewayError(
        errorCode,
        `/${key}`,
        "Evidence override must be an object when provided.",
      ),
    );
    return defaultMode;
  }

  if (!(typeof value.mode === "string" && modes.has(value.mode))) {
    errors.push(
      persistenceScopeRequestGatewayError(
        errorCode,
        `/${key}/mode`,
        "Evidence override mode is unsupported.",
      ),
    );
    return defaultMode;
  }

  return value.mode;
}

function buildScopeRequestInput(
  requestId: string,
  readinessResponse: Extract<
    Awaited<ReturnType<typeof inspectAuditLedgerPersistenceReadinessGatewayRequest>>,
    { ok: true }
  >,
  readinessSourceMode: ReadinessSourceMode,
  scopeEvidenceMode: ScopeEvidenceMode,
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    request_id: requestId,
    readiness_gate: readinessResponse.gate,
    readiness_source: buildReadinessSource(readinessResponse, readinessSourceMode),
  };

  if (scopeEvidenceMode === "missing_readiness_source") {
    delete input.readiness_source;
  }

  if (scopeEvidenceMode === "incomplete_minimum_source_evidence") {
    input.minimum_source_evidence = ["BP-0044 only"];
  }

  if (scopeEvidenceMode === "live_execution_side_effects") {
    input.live_execution_allowed = true;
    input.side_effects = [
      {
        effect_type: "database_write",
        resource_ref: "database:postgres/audit_events",
        status: "requested",
      },
    ];
  }

  return input;
}

function buildReadinessSource(
  readinessResponse: Extract<
    Awaited<ReturnType<typeof inspectAuditLedgerPersistenceReadinessGatewayRequest>>,
    { ok: true }
  >,
  mode: ReadinessSourceMode,
): Record<string, unknown> {
  if (mode === "registered_mcp_inspection_evidence") {
    return {
      kind: "registered_mcp_inspection_evidence",
      tool: AUDIT_LEDGER_PERSISTENCE_READINESS_MCP_TOOL,
      gateway_contract_id: readinessResponse.contract_id,
      gateway_request_id: readinessResponse.request_id,
      registration_packet: "BP-0076",
      read_only_registration: true,
      source_packet_refs: ["BP-0071", "BP-0075", "BP-0076"],
    };
  }

  if (mode === "invalid_mcp_readiness_source") {
    return {
      kind: "registered_mcp_inspection_evidence",
      tool: "lnsat.audit.ledger.writer.append",
      gateway_contract_id: AUDIT_LEDGER_PERSISTENCE_READINESS_GATEWAY_CONTRACT_ID,
      gateway_request_id: readinessResponse.request_id,
      registration_packet: "BP-0076",
      read_only_registration: false,
      source_packet_refs: ["BP-0076"],
    };
  }

  return {
    kind: "direct_gateway_evidence",
    gateway_contract_id: readinessResponse.contract_id,
    gateway_request_id: readinessResponse.request_id,
    source_packet_refs: ["BP-0071", "BP-0073"],
  };
}

function persistenceScopeRequestFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AuditLedgerPersistenceScopeRequestGatewayError[],
  readinessRequestErrors: AuditLedgerPersistenceReadinessGatewayError[] = [],
  databaseSecurityRequestErrors: AuditLedgerDatabaseSecurityPreflightGatewayError[] = [],
  persistenceRequestErrors: AuditLedgerWriterPersistencePreflightGatewayError[] = [],
  writerRequestErrors: AuditLedgerWriterInterfaceGatewayError[] = [],
  writerErrors: AuditLedgerWriterInterfaceError[] = [],
  persistenceErrors: AuditLedgerWriterPersistencePreflightError[] = [],
  securityErrors: AuditLedgerDatabaseSecurityPreflightError[] = [],
  readinessErrors: AuditLedgerPersistenceImplementationReadinessGateError[] = [],
  scopeRequestErrors: AuditLedgerPersistenceScopeRequestError[] = [],
): AuditLedgerPersistenceScopeRequestGatewayResponse {
  return {
    ok: false,
    contract_id: auditLedgerPersistenceScopeRequestGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: auditLedgerPersistenceScopeRequestSourceDocs(),
    request_errors: requestErrors,
    readiness_request_errors: readinessRequestErrors,
    database_security_request_errors: databaseSecurityRequestErrors,
    persistence_request_errors: persistenceRequestErrors,
    writer_request_errors: writerRequestErrors,
    writer_errors: writerErrors,
    persistence_errors: persistenceErrors,
    security_errors: securityErrors,
    readiness_errors: readinessErrors,
    scope_request_errors: scopeRequestErrors,
    scope_request: null,
    readiness_gate_ref: null,
    readiness_source: null,
    reviewed_source_chain: null,
    minimum_source_evidence_before_live_scope: [],
    security_requirements: null,
    source_refs: [],
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function auditLedgerPersistenceScopeRequestSourceDocs(): string[] {
  return [...auditLedgerPersistenceScopeRequestGatewayContract.source_docs];
}

function persistenceScopeRequestGatewayError(
  code: AuditLedgerPersistenceScopeRequestGatewayErrorCode,
  path: string,
  message: string,
): AuditLedgerPersistenceScopeRequestGatewayError {
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
