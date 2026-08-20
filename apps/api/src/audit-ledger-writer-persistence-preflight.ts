import {
  createAuditLedgerWriterPersistencePreflightEvidence,
  type AuditLedgerWriterInterfaceError,
  type AuditLedgerWriterInterfaceContract,
  type AuditLedgerWriterPersistencePreflightError,
  type AuditLedgerWriterPersistencePreflightEvidence,
} from "@lnsat/audit";
import {
  inspectAuditLedgerWriterInterfaceGatewayRequest,
  type AuditLedgerWriterInterfaceGatewayError,
} from "./audit-ledger-writer-interface.js";

export const AUDIT_LEDGER_WRITER_PERSISTENCE_PREFLIGHT_GATEWAY_STATUS = "contract_only";

export const auditLedgerWriterPersistencePreflightGatewayContract = {
  contract_id: "lnsat.gateway.audit_ledger_writer_persistence_preflight.v0_1",
  method: "POST",
  path: "/v1/audit-ledger/writer-persistence/preflight/inspect",
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
    "apps/api/src/audit-ledger-writer-interface.ts",
    "apps/api/src/audit-ledger-writer-persistence-preflight.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AuditLedgerWriterPersistencePreflightGatewayRequest = {
  request_id?: string;
  actor_id?: string;
  session_id?: string;
  approval_evidence?: {
    mode: "valid" | "mismatched_policy_gate";
  };
  preflight_evidence?: {
    mode:
      | "valid"
      | "missing_writer_interface"
      | "bad_digest_idempotency"
      | "live_execution_side_effects"
      | "missing_migration_artifacts";
  };
};

export type AuditLedgerWriterPersistencePreflightGatewayErrorCode =
  | "audit_ledger_writer_persistence_preflight.invalid_request"
  | "audit_ledger_writer_persistence_preflight.unexpected_field"
  | "audit_ledger_writer_persistence_preflight.invalid_request_id"
  | "audit_ledger_writer_persistence_preflight.invalid_actor_id"
  | "audit_ledger_writer_persistence_preflight.invalid_session_id"
  | "audit_ledger_writer_persistence_preflight.invalid_approval_evidence"
  | "audit_ledger_writer_persistence_preflight.invalid_preflight_evidence"
  | "audit_ledger_writer_persistence_preflight.writer_interface_unavailable";

export type AuditLedgerWriterPersistencePreflightGatewayError = {
  code: AuditLedgerWriterPersistencePreflightGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerWriterPersistencePreflightGatewayResponse =
  | {
      ok: true;
      contract_id: typeof auditLedgerWriterPersistencePreflightGatewayContract.contract_id;
      request_id: string;
      inspected_at: string;
      source_docs: string[];
      preflight: AuditLedgerWriterPersistencePreflightEvidence;
      writer_interface_ref: AuditLedgerWriterPersistencePreflightEvidence["writer_interface_ref"];
      policy_gate_ref: AuditLedgerWriterPersistencePreflightEvidence["policy_gate_ref"];
      approval_request_ref: AuditLedgerWriterPersistencePreflightEvidence["approval_request_ref"];
      canonical_record_digest: string;
      idempotency: AuditLedgerWriterPersistencePreflightEvidence["idempotency"];
      append_only: AuditLedgerWriterPersistencePreflightEvidence["append_only"];
      redaction: AuditLedgerWriterPersistencePreflightEvidence["redaction"];
      source_refs: string[];
      migration_artifact_refs: AuditLedgerWriterPersistencePreflightEvidence["migration_artifact_refs"];
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof auditLedgerWriterPersistencePreflightGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AuditLedgerWriterPersistencePreflightGatewayError[];
      writer_request_errors: AuditLedgerWriterInterfaceGatewayError[];
      writer_errors: AuditLedgerWriterInterfaceError[];
      preflight_errors: AuditLedgerWriterPersistencePreflightError[];
      preflight: null;
      writer_interface_ref: null;
      policy_gate_ref: null;
      approval_request_ref: null;
      canonical_record_digest: null;
      idempotency: null;
      append_only: null;
      redaction: null;
      source_refs: [];
      migration_artifact_refs: null;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type ApprovalEvidenceMode = "valid" | "missing" | "mismatched_policy_gate";
type PreflightEvidenceMode =
  | "valid"
  | "missing_writer_interface"
  | "bad_digest_idempotency"
  | "live_execution_side_effects"
  | "missing_migration_artifacts";

type NormalizedAuditLedgerWriterPersistencePreflightRequest =
  | {
      ok: true;
      request_id: string;
      actor_id: string;
      session_id: string;
      approval_evidence_mode: ApprovalEvidenceMode;
      preflight_evidence_mode: PreflightEvidenceMode;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AuditLedgerWriterPersistencePreflightGatewayError[];
    };

const defaultRequest = {
  request_id: "req_bp0061_persistence_preflight",
  actor_id: "agent.codex",
  session_id: "sess_bp0061_0001",
} as const;

const requestKeys = new Set([
  "request_id",
  "actor_id",
  "session_id",
  "approval_evidence",
  "preflight_evidence",
]);
const approvalEvidenceModes = new Set(["valid", "mismatched_policy_gate"]);
const preflightEvidenceModes = new Set([
  "valid",
  "missing_writer_interface",
  "bad_digest_idempotency",
  "live_execution_side_effects",
  "missing_migration_artifacts",
]);

export async function inspectAuditLedgerWriterPersistencePreflightGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AuditLedgerWriterPersistencePreflightGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAuditLedgerWriterPersistencePreflightRequest(input);

  if (!normalized.ok) {
    return persistencePreflightFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const writerInterfaceResponse = await inspectAuditLedgerWriterInterfaceGatewayRequest(
    {
      request_id: normalized.request_id,
      actor_id: normalized.actor_id,
      session_id: normalized.session_id,
      ...(normalized.approval_evidence_mode === "missing"
        ? {}
        : { approval_evidence: { mode: normalized.approval_evidence_mode } }),
    },
    { now: new Date(inspectedAt) },
  );

  if (!writerInterfaceResponse.ok) {
    return persistencePreflightFailure(
      normalized.request_id,
      inspectedAt,
      [],
      writerInterfaceResponse.request_errors,
      writerInterfaceResponse.writer_errors,
    );
  }

  const preflightInput = buildPersistencePreflightInput(
    normalized.request_id,
    writerInterfaceResponse.writer_interface,
    normalized.preflight_evidence_mode,
  );
  const preflightResult =
    createAuditLedgerWriterPersistencePreflightEvidence(preflightInput);

  if (!preflightResult.ok) {
    return persistencePreflightFailure(
      normalized.request_id,
      inspectedAt,
      [],
      [],
      [],
      preflightResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: auditLedgerWriterPersistencePreflightSourceDocs(),
    preflight: preflightResult.preflight,
    writer_interface_ref: preflightResult.preflight.writer_interface_ref,
    policy_gate_ref: preflightResult.preflight.policy_gate_ref,
    approval_request_ref: preflightResult.preflight.approval_request_ref,
    canonical_record_digest:
      preflightResult.preflight.record_ref.canonical_record_digest,
    idempotency: preflightResult.preflight.idempotency,
    append_only: preflightResult.preflight.append_only,
    redaction: preflightResult.preflight.redaction,
    source_refs: preflightResult.preflight.source_refs,
    migration_artifact_refs: preflightResult.preflight.migration_artifact_refs,
    live_execution_allowed: preflightResult.preflight.live_execution_allowed,
    side_effects: preflightResult.side_effects,
  };
}

function normalizeAuditLedgerWriterPersistencePreflightRequest(
  input: unknown,
): NormalizedAuditLedgerWriterPersistencePreflightRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        persistencePreflightGatewayError(
          "audit_ledger_writer_persistence_preflight.invalid_request",
          "",
          "Audit ledger writer persistence preflight request must be an object.",
        ),
      ],
    };
  }

  const errors: AuditLedgerWriterPersistencePreflightGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        persistencePreflightGatewayError(
          "audit_ledger_writer_persistence_preflight.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger writer persistence preflight request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" ? input.request_id : defaultRequest.request_id;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      persistencePreflightGatewayError(
        "audit_ledger_writer_persistence_preflight.invalid_request_id",
        "/request_id",
        "Audit ledger writer persistence preflight request_id must be a string when provided.",
      ),
    );
  }

  const actorId =
    typeof input.actor_id === "string" ? input.actor_id : defaultRequest.actor_id;
  if (Object.hasOwn(input, "actor_id") && typeof input.actor_id !== "string") {
    errors.push(
      persistencePreflightGatewayError(
        "audit_ledger_writer_persistence_preflight.invalid_actor_id",
        "/actor_id",
        "Audit ledger writer persistence preflight actor_id must be a string when provided.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultRequest.session_id;
  if (Object.hasOwn(input, "session_id") && typeof input.session_id !== "string") {
    errors.push(
      persistencePreflightGatewayError(
        "audit_ledger_writer_persistence_preflight.invalid_session_id",
        "/session_id",
        "Audit ledger writer persistence preflight session_id must be a string when provided.",
      ),
    );
  }

  let approvalEvidenceMode: ApprovalEvidenceMode = "missing";
  if (Object.hasOwn(input, "approval_evidence")) {
    if (!isPlainObject(input.approval_evidence)) {
      errors.push(
        persistencePreflightGatewayError(
          "audit_ledger_writer_persistence_preflight.invalid_approval_evidence",
          "/approval_evidence",
          "Audit ledger writer persistence preflight approval evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.approval_evidence.mode === "string" &&
      approvalEvidenceModes.has(input.approval_evidence.mode)
    )) {
      errors.push(
        persistencePreflightGatewayError(
          "audit_ledger_writer_persistence_preflight.invalid_approval_evidence",
          "/approval_evidence/mode",
          "Audit ledger writer persistence preflight approval evidence mode is unsupported.",
        ),
      );
    } else {
      approvalEvidenceMode = input.approval_evidence.mode as ApprovalEvidenceMode;
    }
  }

  let preflightEvidenceMode: PreflightEvidenceMode = "valid";
  if (Object.hasOwn(input, "preflight_evidence")) {
    if (!isPlainObject(input.preflight_evidence)) {
      errors.push(
        persistencePreflightGatewayError(
          "audit_ledger_writer_persistence_preflight.invalid_preflight_evidence",
          "/preflight_evidence",
          "Audit ledger writer persistence preflight evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.preflight_evidence.mode === "string" &&
      preflightEvidenceModes.has(input.preflight_evidence.mode)
    )) {
      errors.push(
        persistencePreflightGatewayError(
          "audit_ledger_writer_persistence_preflight.invalid_preflight_evidence",
          "/preflight_evidence/mode",
          "Audit ledger writer persistence preflight evidence mode is unsupported.",
        ),
      );
    } else {
      preflightEvidenceMode = input.preflight_evidence.mode as PreflightEvidenceMode;
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
    preflight_evidence_mode: preflightEvidenceMode,
  };
}

function buildPersistencePreflightInput(
  requestId: string,
  writerInterface: AuditLedgerWriterInterfaceContract,
  mode: PreflightEvidenceMode,
): Record<string, unknown> {
  if (mode === "missing_writer_interface") {
    return {
      request_id: requestId,
      raw_rejected_value: "psql $DATABASE_URL -c 'delete from audit_events'",
    };
  }

  if (mode === "bad_digest_idempotency") {
    return {
      request_id: requestId,
      writer_interface_contract: {
        ...writerInterface,
        record_ref: {
          ...writerInterface.record_ref,
          canonical_record_digest: "sha256:bad",
        },
        idempotency: {
          ...writerInterface.idempotency,
          collision_behavior: "overwrite",
        },
      },
    };
  }

  if (mode === "live_execution_side_effects") {
    return {
      request_id: requestId,
      writer_interface_contract: {
        ...writerInterface,
        live_execution_allowed: true,
        side_effects: [
          {
            effect_type: "database_write",
            resource_ref: "database:postgres/audit_events",
            status: "requested",
          },
        ],
      },
    };
  }

  if (mode === "missing_migration_artifacts") {
    return {
      request_id: requestId,
      writer_interface_contract: writerInterface,
      migration_artifact_refs: {
        sql_artifact: "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
        manifest_artifact:
          "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
        static_checker: "scripts/check-audit-ledger-migrations.mjs",
        source_packet_refs: ["BP-0039", "BP-0040", "BP-0052"],
      },
    };
  }

  return {
    request_id: requestId,
    writer_interface_contract: writerInterface,
  };
}

function persistencePreflightFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AuditLedgerWriterPersistencePreflightGatewayError[],
  writerRequestErrors: AuditLedgerWriterInterfaceGatewayError[] = [],
  writerErrors: AuditLedgerWriterInterfaceError[] = [],
  preflightErrors: AuditLedgerWriterPersistencePreflightError[] = [],
): AuditLedgerWriterPersistencePreflightGatewayResponse {
  return {
    ok: false,
    contract_id: auditLedgerWriterPersistencePreflightGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: auditLedgerWriterPersistencePreflightSourceDocs(),
    request_errors: requestErrors,
    writer_request_errors: writerRequestErrors,
    writer_errors: writerErrors,
    preflight_errors: preflightErrors,
    preflight: null,
    writer_interface_ref: null,
    policy_gate_ref: null,
    approval_request_ref: null,
    canonical_record_digest: null,
    idempotency: null,
    append_only: null,
    redaction: null,
    source_refs: [],
    migration_artifact_refs: null,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function auditLedgerWriterPersistencePreflightSourceDocs(): string[] {
  return [...auditLedgerWriterPersistencePreflightGatewayContract.source_docs];
}

function persistencePreflightGatewayError(
  code: AuditLedgerWriterPersistencePreflightGatewayErrorCode,
  path: string,
  message: string,
): AuditLedgerWriterPersistencePreflightGatewayError {
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
