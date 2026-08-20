import {
  createAuditLedgerMigrationApprovalEvidencePreview,
  type AuditLedgerMigrationApprovalEvidencePreview,
} from "@lnsat/policy";

export const AUDIT_LEDGER_MIGRATION_APPROVAL_PREVIEW_GATEWAY_STATUS = "contract_only";

export const auditLedgerMigrationApprovalPreviewGatewayContract = {
  contract_id: "lnsat.gateway.audit_ledger_migration_approval_preview.v0_1",
  method: "POST",
  path: "/v1/audit-ledger/migrations/approval-preview/inspect",
  authority: ["@lnsat/policy", "repo-local-audit-ledger-migration-artifacts"],
  source_docs: [
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/AUDIT_LEDGER_MIGRATION_ARTIFACTS.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
    "packages/audit/migrations/postgresql/0001_audit_events_v0_1.manifest.json",
    "scripts/check-audit-ledger-migrations.mjs",
    "fixtures/audit/migration-review.md",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AuditLedgerMigrationApprovalPreviewGatewayRequest = {
  request_id?: string;
  actor_id?: string;
  session_id?: string;
};

export type AuditLedgerMigrationApprovalPreviewGatewayErrorCode =
  | "audit_ledger_migration_approval_preview.invalid_request"
  | "audit_ledger_migration_approval_preview.unexpected_field"
  | "audit_ledger_migration_approval_preview.invalid_request_id"
  | "audit_ledger_migration_approval_preview.invalid_actor_id"
  | "audit_ledger_migration_approval_preview.invalid_session_id";

export type AuditLedgerMigrationApprovalPreviewGatewayError = {
  code: AuditLedgerMigrationApprovalPreviewGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerMigrationApprovalPreviewGatewayResponse =
  | {
      ok: true;
      contract_id: typeof auditLedgerMigrationApprovalPreviewGatewayContract.contract_id;
      request_id: string;
      inspected_at: string;
      source_docs: string[];
      preview: AuditLedgerMigrationApprovalEvidencePreview;
      operation: "writer.migrate";
      policy_gate_decision: AuditLedgerMigrationApprovalEvidencePreview["policy_gate_decision"];
      approval_request: AuditLedgerMigrationApprovalEvidencePreview["approval_request"];
      artifact_refs: AuditLedgerMigrationApprovalEvidencePreview["artifact_refs"];
      static_checker_required: AuditLedgerMigrationApprovalEvidencePreview["static_checker_required"];
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof auditLedgerMigrationApprovalPreviewGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AuditLedgerMigrationApprovalPreviewGatewayError[];
      preview: null;
      operation: null;
      policy_gate_decision: null;
      approval_request: null;
      artifact_refs: null;
      static_checker_required: null;
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAuditLedgerMigrationApprovalPreviewRequest =
  | {
      ok: true;
      request_id: string;
      actor_id: string;
      session_id: string;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AuditLedgerMigrationApprovalPreviewGatewayError[];
    };

const defaultRequest = {
  request_id: "req_bp0048_audit_events_migration_preview",
  actor_id: "agent.codex",
  session_id: "sess_bp0048_0001",
} as const;

const requestKeys = new Set(["request_id", "actor_id", "session_id"]);

export function inspectAuditLedgerMigrationApprovalPreviewGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): AuditLedgerMigrationApprovalPreviewGatewayResponse {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAuditLedgerMigrationApprovalPreviewRequest(input);

  if (!normalized.ok) {
    return approvalPreviewFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const preview = createAuditLedgerMigrationApprovalEvidencePreview(
    {
      request_id: normalized.request_id,
      actor_id: normalized.actor_id,
      session_id: normalized.session_id,
    },
    { now: new Date(inspectedAt) },
  );

  return {
    ok: true,
    contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: auditLedgerMigrationApprovalPreviewSourceDocs(),
    preview,
    operation: preview.operation,
    policy_gate_decision: preview.policy_gate_decision,
    approval_request: preview.approval_request,
    artifact_refs: preview.artifact_refs,
    static_checker_required: preview.static_checker_required,
    live_execution_allowed: preview.live_execution_allowed,
    side_effects: preview.side_effects,
  };
}

function normalizeAuditLedgerMigrationApprovalPreviewRequest(
  input: unknown,
): NormalizedAuditLedgerMigrationApprovalPreviewRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        approvalPreviewError(
          "audit_ledger_migration_approval_preview.invalid_request",
          "",
          "Audit ledger migration approval preview request must be an object.",
        ),
      ],
    };
  }

  const errors: AuditLedgerMigrationApprovalPreviewGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        approvalPreviewError(
          "audit_ledger_migration_approval_preview.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger migration approval preview request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" ? input.request_id : defaultRequest.request_id;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      approvalPreviewError(
        "audit_ledger_migration_approval_preview.invalid_request_id",
        "/request_id",
        "Audit ledger migration approval preview request_id must be a string when provided.",
      ),
    );
  }

  const actorId =
    typeof input.actor_id === "string" ? input.actor_id : defaultRequest.actor_id;
  if (Object.hasOwn(input, "actor_id") && typeof input.actor_id !== "string") {
    errors.push(
      approvalPreviewError(
        "audit_ledger_migration_approval_preview.invalid_actor_id",
        "/actor_id",
        "Audit ledger migration approval preview actor_id must be a string when provided.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultRequest.session_id;
  if (Object.hasOwn(input, "session_id") && typeof input.session_id !== "string") {
    errors.push(
      approvalPreviewError(
        "audit_ledger_migration_approval_preview.invalid_session_id",
        "/session_id",
        "Audit ledger migration approval preview session_id must be a string when provided.",
      ),
    );
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
  };
}

function approvalPreviewFailure(
  requestId: string | null,
  inspectedAt: string,
  errors: AuditLedgerMigrationApprovalPreviewGatewayError[],
): AuditLedgerMigrationApprovalPreviewGatewayResponse {
  return {
    ok: false,
    contract_id: auditLedgerMigrationApprovalPreviewGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: auditLedgerMigrationApprovalPreviewSourceDocs(),
    request_errors: errors,
    preview: null,
    operation: null,
    policy_gate_decision: null,
    approval_request: null,
    artifact_refs: null,
    static_checker_required: null,
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function auditLedgerMigrationApprovalPreviewSourceDocs(): string[] {
  return [...auditLedgerMigrationApprovalPreviewGatewayContract.source_docs];
}

function approvalPreviewError(
  code: AuditLedgerMigrationApprovalPreviewGatewayErrorCode,
  path: string,
  message: string,
): AuditLedgerMigrationApprovalPreviewGatewayError {
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
