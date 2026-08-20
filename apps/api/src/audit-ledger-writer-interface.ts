import { createHash } from "node:crypto";
import {
  AUDIT_LEDGER_WRITER_CAPABILITY,
  createAppendOnlyAuditLedgerWriterContract,
  type AuditLedgerRecord,
  type AuditLedgerWriterApprovalRequestEvidence,
  type AuditLedgerWriterInterfaceContract,
  type AuditLedgerWriterInterfaceError,
  type AuditLedgerWriterPolicyGateEvidence,
} from "@lnsat/audit";
import {
  createAuditLedgerWriterApprovalRequest,
  decideAuditLedgerWriterPolicyGate,
  type AuditLedgerWriterPolicyGateDecision,
} from "@lnsat/policy";
import { inspectOnboardingContextGatewayRequest } from "./onboarding-context-inspection.js";

export const AUDIT_LEDGER_WRITER_INTERFACE_GATEWAY_STATUS = "contract_only";

export const auditLedgerWriterInterfaceGatewayContract = {
  contract_id: "lnsat.gateway.audit_ledger_writer_interface.v0_1",
  method: "POST",
  path: "/v1/audit-ledger/writer-interface/inspect",
  authority: ["@lnsat/audit", "@lnsat/policy"],
  source_docs: [
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/audit/src/index.ts",
    "packages/policy/src/index.ts",
    "apps/api/src/audit-ledger-writer-interface.ts",
  ],
  side_effects: [],
  status: "contract_only",
} as const;

export type AuditLedgerWriterInterfaceGatewayRequest = {
  request_id?: string;
  actor_id?: string;
  session_id?: string;
  approval_evidence?: {
    mode: "valid" | "mismatched_policy_gate";
  };
};

export type AuditLedgerWriterInterfaceGatewayErrorCode =
  | "audit_ledger_writer_interface.invalid_request"
  | "audit_ledger_writer_interface.unexpected_field"
  | "audit_ledger_writer_interface.invalid_request_id"
  | "audit_ledger_writer_interface.invalid_actor_id"
  | "audit_ledger_writer_interface.invalid_session_id"
  | "audit_ledger_writer_interface.invalid_approval_evidence"
  | "audit_ledger_writer_interface.source_unavailable";

export type AuditLedgerWriterInterfaceGatewayError = {
  code: AuditLedgerWriterInterfaceGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AuditLedgerWriterInterfaceGatewayResponse =
  | {
      ok: true;
      contract_id: typeof auditLedgerWriterInterfaceGatewayContract.contract_id;
      request_id: string;
      inspected_at: string;
      source_docs: string[];
      writer_interface: AuditLedgerWriterInterfaceContract;
      policy_gate_ref: AuditLedgerWriterInterfaceContract["policy_gate_ref"];
      approval_request_ref: AuditLedgerWriterInterfaceContract["approval_ref"];
      canonical_record_digest: string;
      idempotency: AuditLedgerWriterInterfaceContract["idempotency"];
      append_only: AuditLedgerWriterInterfaceContract["append_only"];
      redaction: AuditLedgerWriterInterfaceContract["redaction"];
      source_refs: string[];
      live_execution_allowed: false;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof auditLedgerWriterInterfaceGatewayContract.contract_id;
      request_id: string | null;
      inspected_at: string;
      source_docs: string[];
      request_errors: AuditLedgerWriterInterfaceGatewayError[];
      writer_errors: AuditLedgerWriterInterfaceError[];
      writer_interface: null;
      policy_gate_ref: null;
      approval_request_ref: null;
      canonical_record_digest: null;
      idempotency: null;
      append_only: null;
      redaction: null;
      source_refs: [];
      live_execution_allowed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

type ApprovalEvidenceMode = "valid" | "missing" | "mismatched_policy_gate";

type NormalizedAuditLedgerWriterInterfaceRequest =
  | {
      ok: true;
      request_id: string;
      actor_id: string;
      session_id: string;
      approval_evidence_mode: ApprovalEvidenceMode;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: AuditLedgerWriterInterfaceGatewayError[];
    };

const defaultRequest = {
  request_id: "req_bp0054_writer_interface",
  actor_id: "agent.codex",
  session_id: "sess_bp0054_0001",
} as const;

const requestKeys = new Set([
  "request_id",
  "actor_id",
  "session_id",
  "approval_evidence",
]);
const approvalEvidenceModes = new Set(["valid", "mismatched_policy_gate"]);

export async function inspectAuditLedgerWriterInterfaceGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<AuditLedgerWriterInterfaceGatewayResponse> {
  const inspectedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAuditLedgerWriterInterfaceRequest(input);

  if (!normalized.ok) {
    return writerInterfaceFailure(
      normalized.request_id,
      inspectedAt,
      normalized.errors,
    );
  }

  const sourceRecord = await buildSourceAuditLedgerRecord(normalized, inspectedAt);
  if (sourceRecord === null) {
    return writerInterfaceFailure(normalized.request_id, inspectedAt, [
      writerInterfaceGatewayError(
        "audit_ledger_writer_interface.source_unavailable",
        "",
        "Source audit ledger record preview evidence could not be built.",
      ),
    ]);
  }
  const policyGate = createPolicyGateEvidence(normalized, inspectedAt);
  const approvalRequest = createApprovalRequestEvidence(policyGate, inspectedAt);
  const canonicalRecordDigest = canonicalSha256(sourceRecord);
  const writerInput: Record<string, unknown> = {
    request_id: normalized.request_id,
    operation: "ledger.record.append",
    record: sourceRecord,
    canonical_record_digest: canonicalRecordDigest,
    policy_gate_decision: policyGate,
  };

  if (normalized.approval_evidence_mode === "valid") {
    writerInput.approval_request = approvalRequest;
  }

  if (normalized.approval_evidence_mode === "mismatched_policy_gate") {
    writerInput.approval_request = {
      ...approvalRequest,
      policy_gate_ref: {
        ...approvalRequest.policy_gate_ref,
        decision_id: "pol_bp0054_mismatched_approval",
      },
    };
  }

  const writerResult = createAppendOnlyAuditLedgerWriterContract(writerInput);
  if (!writerResult.ok) {
    return writerInterfaceFailure(
      normalized.request_id,
      inspectedAt,
      [],
      writerResult.errors,
    );
  }

  return {
    ok: true,
    contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    source_docs: auditLedgerWriterInterfaceSourceDocs(),
    writer_interface: writerResult.contract,
    policy_gate_ref: writerResult.contract.policy_gate_ref,
    approval_request_ref: writerResult.contract.approval_ref,
    canonical_record_digest: writerResult.contract.record_ref.canonical_record_digest,
    idempotency: writerResult.contract.idempotency,
    append_only: writerResult.contract.append_only,
    redaction: writerResult.contract.redaction,
    source_refs: writerResult.contract.source_refs,
    live_execution_allowed: writerResult.contract.live_execution_allowed,
    side_effects: writerResult.side_effects,
  };
}

function normalizeAuditLedgerWriterInterfaceRequest(
  input: unknown,
): NormalizedAuditLedgerWriterInterfaceRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        writerInterfaceGatewayError(
          "audit_ledger_writer_interface.invalid_request",
          "",
          "Audit ledger writer interface inspection request must be an object.",
        ),
      ],
    };
  }

  const errors: AuditLedgerWriterInterfaceGatewayError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        writerInterfaceGatewayError(
          "audit_ledger_writer_interface.unexpected_field",
          jsonPointer(key),
          "Unexpected audit ledger writer interface inspection request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" ? input.request_id : defaultRequest.request_id;
  if (Object.hasOwn(input, "request_id") && typeof input.request_id !== "string") {
    errors.push(
      writerInterfaceGatewayError(
        "audit_ledger_writer_interface.invalid_request_id",
        "/request_id",
        "Audit ledger writer interface inspection request_id must be a string when provided.",
      ),
    );
  }

  const actorId =
    typeof input.actor_id === "string" ? input.actor_id : defaultRequest.actor_id;
  if (Object.hasOwn(input, "actor_id") && typeof input.actor_id !== "string") {
    errors.push(
      writerInterfaceGatewayError(
        "audit_ledger_writer_interface.invalid_actor_id",
        "/actor_id",
        "Audit ledger writer interface inspection actor_id must be a string when provided.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string" ? input.session_id : defaultRequest.session_id;
  if (Object.hasOwn(input, "session_id") && typeof input.session_id !== "string") {
    errors.push(
      writerInterfaceGatewayError(
        "audit_ledger_writer_interface.invalid_session_id",
        "/session_id",
        "Audit ledger writer interface inspection session_id must be a string when provided.",
      ),
    );
  }

  let approvalEvidenceMode: ApprovalEvidenceMode = "missing";
  if (Object.hasOwn(input, "approval_evidence")) {
    if (!isPlainObject(input.approval_evidence)) {
      errors.push(
        writerInterfaceGatewayError(
          "audit_ledger_writer_interface.invalid_approval_evidence",
          "/approval_evidence",
          "Audit ledger writer interface approval evidence must be an object when provided.",
        ),
      );
    } else if (!(
      typeof input.approval_evidence.mode === "string" &&
      approvalEvidenceModes.has(input.approval_evidence.mode)
    )) {
      errors.push(
        writerInterfaceGatewayError(
          "audit_ledger_writer_interface.invalid_approval_evidence",
          "/approval_evidence/mode",
          "Audit ledger writer interface approval evidence mode is unsupported.",
        ),
      );
    } else {
      approvalEvidenceMode = input.approval_evidence.mode as ApprovalEvidenceMode;
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
  };
}

async function buildSourceAuditLedgerRecord(
  request: Extract<NormalizedAuditLedgerWriterInterfaceRequest, { ok: true }>,
  inspectedAt: string,
): Promise<AuditLedgerRecord | null> {
  const sourceInspection = await inspectOnboardingContextGatewayRequest(
    {
      request_id: `${request.request_id}_source_context`,
      session_id: request.session_id,
      created_at: inspectedAt,
    },
    { now: new Date(inspectedAt) },
  );

  if (!sourceInspection.ok) {
    return null;
  }

  const [preview] = sourceInspection.audit_ledger_record_preview;
  if (preview === undefined) {
    return null;
  }

  const policyGate = createPolicyGateEvidence(request, inspectedAt);
  const approvalRequest = createApprovalRequestEvidence(policyGate, inspectedAt);

  return {
    ...preview.record,
    policy_ref: {
      decision_id: policyGate.decision_id,
      decision: "approval_required",
      requires_approval: true,
    },
    approval_ref: {
      approval_id: approvalRequest.approval_request_id,
      decision: "requested",
    },
    resource_refs: ["ledger:audit_events"],
    capability: AUDIT_LEDGER_WRITER_CAPABILITY,
    risk_level: 7,
    retention_class: "control_plane",
  };
}

function createPolicyGateEvidence(
  request: Extract<NormalizedAuditLedgerWriterInterfaceRequest, { ok: true }>,
  inspectedAt: string,
): AuditLedgerWriterPolicyGateDecision & AuditLedgerWriterPolicyGateEvidence {
  return decideAuditLedgerWriterPolicyGate(
    {
      request_id: request.request_id,
      actor_id: request.actor_id,
      session_id: request.session_id,
      operation: "ledger.record.append",
      resource_refs: ["ledger:audit_events"],
      requested_capability: AUDIT_LEDGER_WRITER_CAPABILITY,
      risk_level: 7,
    },
    { now: new Date(inspectedAt) },
  ) as AuditLedgerWriterPolicyGateDecision & AuditLedgerWriterPolicyGateEvidence;
}

function createApprovalRequestEvidence(
  policyGate: AuditLedgerWriterPolicyGateDecision & AuditLedgerWriterPolicyGateEvidence,
  inspectedAt: string,
): AuditLedgerWriterApprovalRequestEvidence {
  const approvalRequest = createAuditLedgerWriterApprovalRequest(policyGate, {
    now: new Date(inspectedAt),
  });

  if (!approvalRequest.ok) {
    throw new Error("BP-0054 writer interface inspection requires approval evidence.");
  }

  return approvalRequest.approval_request as AuditLedgerWriterApprovalRequestEvidence;
}

function writerInterfaceFailure(
  requestId: string | null,
  inspectedAt: string,
  requestErrors: AuditLedgerWriterInterfaceGatewayError[],
  writerErrors: AuditLedgerWriterInterfaceError[] = [],
): AuditLedgerWriterInterfaceGatewayResponse {
  return {
    ok: false,
    contract_id: auditLedgerWriterInterfaceGatewayContract.contract_id,
    request_id: requestId,
    inspected_at: inspectedAt,
    source_docs: auditLedgerWriterInterfaceSourceDocs(),
    request_errors: requestErrors,
    writer_errors: writerErrors,
    writer_interface: null,
    policy_gate_ref: null,
    approval_request_ref: null,
    canonical_record_digest: null,
    idempotency: null,
    append_only: null,
    redaction: null,
    source_refs: [],
    live_execution_allowed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function auditLedgerWriterInterfaceSourceDocs(): string[] {
  return [...auditLedgerWriterInterfaceGatewayContract.source_docs];
}

function writerInterfaceGatewayError(
  code: AuditLedgerWriterInterfaceGatewayErrorCode,
  path: string,
  message: string,
): AuditLedgerWriterInterfaceGatewayError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function canonicalSha256(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
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
