import {
  createContractErrorV1,
  type ContractErrorEnvelopeV1,
  type ContractErrorV1,
  type PacketEnvelopeV1,
} from "@lnsat/packets";
import {
  createApprovalRequestV1,
  decideApprovalRequestV1,
  decidePacketEnvelopePolicyV1,
  type ApprovalDecisionV1,
  type ApprovalRequestV1,
  type PolicyDecisionV1,
} from "@lnsat/policy";

export const AUDIT_EVENT_V1_STATUS = "contract_only";

export const auditEventV1Contract = {
  contract_id: "lnsat.audit_event.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.audit_event.schema.v1_0",
  event_types: [
    "policy.decision_recorded",
    "approval.request_recorded",
    "approval.decision_recorded",
  ],
  source_verification:
    "rebuild the complete packet-policy-approval chain before recording evidence",
  source_evidence_identity: {
    algorithm: "sha-256",
    input: "canonical JSON of the complete supplied source chain",
    output: "sha256:<lowercase_hex>",
  },
  event_identity: {
    algorithm: "sha-256",
    input: "canonical JSON of the complete event body without event_id",
    output: "aud_<lowercase_hex>",
  },
  idempotency:
    "one deterministic key per event type and terminal source evidence identity",
  authenticity: "content digests detect drift but are not signatures or authentication",
  persistence: "not_requested",
  execution_authorized: false,
  side_effects: [],
} as const;

export const auditEventV1IdempotencyContract = {
  contract_id: "lnsat.audit_event_idempotency.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  key_scope: "event_type_and_terminal_source_evidence_identity",
  exact_replay: "return_existing_ref_without_state_change",
  collision: "same_key_different_event_identity_fails_closed",
  maximum_prior_entries: 10_000,
  persistence: "not_requested",
  write_performed: false,
  side_effects: [],
} as const;

export type AuditEventV1IdempotencyRef = {
  idempotency_key: string;
  event_id: string;
};

export type AuditEventV1IdempotencyErrorCode =
  | "audit_event_idempotency.invalid_request"
  | "audit_event_idempotency.invalid_prior_state"
  | "audit_event_idempotency.duplicate_idempotency_key"
  | "audit_event_idempotency.invalid_candidate"
  | "audit_event_idempotency.collision";

export type AuditEventV1IdempotencyResult =
  | {
      ok: true;
      outcome: "append_proposed" | "exact_replay";
      record_ref: AuditEventV1IdempotencyRef;
      previous_state_count: number;
      next_state_count: number;
      proposed_state: AuditEventV1IdempotencyRef[];
      write_performed: false;
      side_effects: [];
    }
  | {
      ok: false;
      outcome: null;
      record_ref: null;
      errors: ContractErrorV1<AuditEventV1IdempotencyErrorCode>[];
      state_unchanged: true;
      write_performed: false;
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AuditEventV1Type = (typeof auditEventV1Contract.event_types)[number];

export type AuditEventV1ResultStatus =
  "allow" | "deny" | "approval_required" | "requested" | "approved" | "denied";

export type AuditEventV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.audit_event.schema.v1_0";
  event_id: string;
  event_type: AuditEventV1Type;
  result_status: AuditEventV1ResultStatus;
  actor_ref: string;
  session_ref: string;
  project_ref: string;
  resource_refs: string[];
  packet_ref: {
    schema_id: "lnsat.packet_envelope.schema.v1_0";
    packet_id: string;
    packet_hash: string;
    idempotency_key: string;
  };
  policy_ref: {
    schema_id: "lnsat.policy_decision.schema.v1_0";
    decision_id: string;
    decision: "allow" | "deny" | "approval_required";
  };
  approval_request_ref: {
    schema_id: "lnsat.approval_request.schema.v1_0";
    approval_request_id: string;
    status: "requested";
  } | null;
  approval_decision_ref: {
    schema_id: "lnsat.approval_decision.schema.v1_0";
    approval_decision_id: string;
    decision: "approved" | "denied";
    approver_ref: string;
    approver_session_ref: string;
  } | null;
  reason_codes: string[];
  source_evidence_hash: string;
  idempotency_key: string;
  event_at: string;
  observed_at: string;
  retention_class: "control_plane";
  redaction: {
    raw_rejected_command: "not_present";
    raw_rejected_value: "not_present";
    raw_invalid_payload_content: "not_present";
    secret_like_values: "not_present";
  };
  authenticated_provenance: false;
  persistence_requested: false;
  execution_authorized: false;
  side_effects: [];
};

type PolicyAuditEventV1Input = {
  event_type: "policy.decision_recorded";
  packet: PacketEnvelopeV1;
  policy_decision: PolicyDecisionV1;
};

type ApprovalRequestAuditEventV1Input = {
  event_type: "approval.request_recorded";
  packet: PacketEnvelopeV1;
  policy_decision: PolicyDecisionV1;
  approval_request: ApprovalRequestV1;
};

type ApprovalDecisionAuditEventV1Input = {
  event_type: "approval.decision_recorded";
  packet: PacketEnvelopeV1;
  policy_decision: PolicyDecisionV1;
  approval_request: ApprovalRequestV1;
  approval_decision: ApprovalDecisionV1;
};

export type AuditEventV1Input =
  | PolicyAuditEventV1Input
  | ApprovalRequestAuditEventV1Input
  | ApprovalDecisionAuditEventV1Input;

export type CreateAuditEventV1Options = {
  observed_at: string;
};

export type AuditEventV1ErrorCode =
  | "audit_event.invalid_input"
  | "audit_event.invalid_observed_at"
  | "audit_event.source_evidence_mismatch"
  | "audit_event.observed_before_event"
  | "audit_event.hash_unavailable";

export type AuditEventV1Error = ContractErrorV1<AuditEventV1ErrorCode>;

export type AuditEventV1Result =
  | {
      ok: true;
      audit_event: AuditEventV1;
      errors: [];
      side_effects: [];
    }
  | (ContractErrorEnvelopeV1<AuditEventV1ErrorCode> & {
      audit_event: null;
      errors: AuditEventV1Error[];
    });

const canonicalUtcTimestampPattern =
  /^(?!0000)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u;
const eventInputKeys = {
  "policy.decision_recorded": ["event_type", "packet", "policy_decision"],
  "approval.request_recorded": [
    "event_type",
    "packet",
    "policy_decision",
    "approval_request",
  ],
  "approval.decision_recorded": [
    "event_type",
    "packet",
    "policy_decision",
    "approval_request",
    "approval_decision",
  ],
} as const;

export async function createAuditEventV1(
  input: AuditEventV1Input,
  options: CreateAuditEventV1Options,
): Promise<AuditEventV1Result> {
  const rawInput: unknown = input;
  let inputShapeValid = false;
  try {
    inputShapeValid =
      isPlainObject(rawInput) &&
      typeof rawInput.event_type === "string" &&
      Object.hasOwn(eventInputKeys, rawInput.event_type) &&
      hasExactKeys(rawInput, eventInputKeys[rawInput.event_type as AuditEventV1Type]);
  } catch {
    inputShapeValid = false;
  }
  if (!inputShapeValid) {
    return failure(
      "audit_event.invalid_input",
      "/input",
      "Input must satisfy one exact v1 audit event source shape.",
    );
  }

  const rawOptions: unknown = options;
  let observedAtInput: string | null = null;
  let observedAt: number | null = null;
  try {
    if (
      isPlainObject(rawOptions) &&
      hasExactKeys(rawOptions, ["observed_at"]) &&
      typeof rawOptions.observed_at === "string"
    ) {
      observedAtInput = rawOptions.observed_at;
      observedAt = parseCanonicalUtcTimestamp(observedAtInput);
    }
  } catch {
    observedAtInput = null;
    observedAt = null;
  }
  if (observedAtInput === null || observedAt === null) {
    return failure(
      "audit_event.invalid_observed_at",
      "/observed_at",
      "observed_at must be a real canonical UTC instant.",
    );
  }

  let snapshot: AuditEventV1Input;
  try {
    snapshot = JSON.parse(JSON.stringify(rawInput)) as AuditEventV1Input;
  } catch {
    return failure(
      "audit_event.invalid_input",
      "/input",
      "Input must satisfy one exact v1 audit event source shape.",
    );
  }

  try {
    const verified = await verifySourceChain(snapshot);
    if (verified === null) {
      return failure(
        "audit_event.source_evidence_mismatch",
        "/input",
        "Audit source evidence does not reproduce the exact v1 chain.",
      );
    }

    const eventAtValue = eventAt(snapshot);
    const eventAtInstant = parseCanonicalUtcTimestamp(eventAtValue);
    if (eventAtInstant === null || observedAt < eventAtInstant) {
      return failure(
        "audit_event.observed_before_event",
        "/observed_at",
        "Audit observation cannot precede its source event.",
      );
    }

    const sourceEvidenceHash = `sha256:${await sha256Hex(canonicalizeJson(snapshot))}`;
    const body = auditEventBody(
      snapshot,
      verified.policy_decision,
      sourceEvidenceHash,
      observedAtInput,
    );
    const eventId = `aud_${await sha256Hex(canonicalizeJson(body))}`;

    return {
      ok: true,
      audit_event: { ...body, event_id: eventId },
      errors: [],
      side_effects: [],
    };
  } catch {
    return failure(
      "audit_event.hash_unavailable",
      "/input",
      "Audit evidence identity could not be produced.",
    );
  }
}

export function evaluateAuditEventV1Idempotency(
  input: unknown,
): AuditEventV1IdempotencyResult {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, ["prior_state", "candidate"]) ||
    !Array.isArray(input.prior_state)
  ) {
    return idempotencyFailure(
      "audit_event_idempotency.invalid_request",
      "",
      "Input must contain bounded prior_state and one candidate.",
    );
  }
  if (
    input.prior_state.length > auditEventV1IdempotencyContract.maximum_prior_entries
  ) {
    return idempotencyFailure(
      "audit_event_idempotency.invalid_prior_state",
      "/prior_state",
      "Prior state exceeds the bounded conformance limit.",
    );
  }

  const priorState: AuditEventV1IdempotencyRef[] = [];
  const seenKeys = new Set<string>();
  for (let index = 0; index < input.prior_state.length; index += 1) {
    const entry = input.prior_state[index];
    if (!isAuditEventV1IdempotencyRef(entry)) {
      return idempotencyFailure(
        "audit_event_idempotency.invalid_prior_state",
        `/prior_state/${index}`,
        "Prior entry must contain one valid audit idempotency key and event id.",
      );
    }
    if (seenKeys.has(entry.idempotency_key)) {
      return idempotencyFailure(
        "audit_event_idempotency.duplicate_idempotency_key",
        `/prior_state/${index}/idempotency_key`,
        "Prior state must contain at most one entry per idempotency key.",
      );
    }
    seenKeys.add(entry.idempotency_key);
    priorState.push(cloneAuditEventV1IdempotencyRef(entry));
  }

  if (!isAuditEventV1IdempotencyRef(input.candidate)) {
    return idempotencyFailure(
      "audit_event_idempotency.invalid_candidate",
      "/candidate",
      "Candidate must contain one valid audit idempotency key and event id.",
    );
  }
  const candidate = cloneAuditEventV1IdempotencyRef(input.candidate);
  const existing = priorState.find(
    (entry) => entry.idempotency_key === candidate.idempotency_key,
  );
  if (existing !== undefined && existing.event_id !== candidate.event_id) {
    return idempotencyFailure(
      "audit_event_idempotency.collision",
      "/candidate/event_id",
      "Existing idempotency key has a different event identity.",
    );
  }

  const outcome = existing === undefined ? "append_proposed" : "exact_replay";
  const recordRef = existing ?? candidate;
  const proposedState =
    existing === undefined ? [...priorState, candidate] : priorState;
  return {
    ok: true,
    outcome,
    record_ref: cloneAuditEventV1IdempotencyRef(recordRef),
    previous_state_count: priorState.length,
    next_state_count: proposedState.length,
    proposed_state: proposedState.map(cloneAuditEventV1IdempotencyRef),
    write_performed: false,
    side_effects: [],
  };
}

async function verifySourceChain(
  input: AuditEventV1Input,
): Promise<{ policy_decision: PolicyDecisionV1 } | null> {
  const policyResult = await decidePacketEnvelopePolicyV1(input.packet, {
    evaluated_at: input.policy_decision.evaluated_at,
  });
  if (
    !policyResult.ok ||
    !canonicalEqual(policyResult.policy_decision, input.policy_decision)
  ) {
    return null;
  }

  if (input.event_type === "policy.decision_recorded") {
    return { policy_decision: policyResult.policy_decision };
  }

  const requestResult = await createApprovalRequestV1(policyResult.policy_decision, {
    requested_at: input.approval_request.requested_at,
  });
  if (
    !requestResult.ok ||
    !canonicalEqual(requestResult.approval_request, input.approval_request)
  ) {
    return null;
  }
  if (input.event_type === "approval.request_recorded") {
    return { policy_decision: policyResult.policy_decision };
  }

  const decisionResult = await decideApprovalRequestV1(requestResult.approval_request, {
    approver_ref: input.approval_decision.approver_ref,
    approver_session_ref: input.approval_decision.approver_session_ref,
    decision: input.approval_decision.decision,
    reason_code: input.approval_decision.reason_code,
    decided_at: input.approval_decision.decided_at,
  });
  if (
    !decisionResult.ok ||
    !canonicalEqual(decisionResult.approval_decision, input.approval_decision)
  ) {
    return null;
  }
  return { policy_decision: policyResult.policy_decision };
}

function auditEventBody(
  input: AuditEventV1Input,
  policyDecision: PolicyDecisionV1,
  sourceEvidenceHash: string,
  observedAt: string,
): Omit<AuditEventV1, "event_id"> {
  const approvalRequest =
    input.event_type === "policy.decision_recorded" ? null : input.approval_request;
  const approvalDecision =
    input.event_type === "approval.decision_recorded" ? input.approval_decision : null;
  const terminalId =
    approvalDecision?.approval_decision_id ??
    approvalRequest?.approval_request_id ??
    policyDecision.decision_id;
  const actorRef = approvalDecision?.approver_ref ?? policyDecision.actor_ref;
  const sessionRef =
    approvalDecision?.approver_session_ref ?? policyDecision.session_ref;
  const resultStatus =
    approvalDecision?.decision ??
    (approvalRequest === null ? policyDecision.decision : "requested");
  const reasonCodes =
    approvalDecision === null
      ? [...policyDecision.reason_codes]
      : [approvalDecision.reason_code];

  return {
    contract_version: auditEventV1Contract.contract_version,
    schema_id: auditEventV1Contract.schema_id,
    event_type: input.event_type,
    result_status: resultStatus,
    actor_ref: actorRef,
    session_ref: sessionRef,
    project_ref: policyDecision.project_ref,
    resource_refs: [...policyDecision.resource_refs],
    packet_ref: {
      schema_id: policyDecision.packet_ref.schema_id,
      packet_id: policyDecision.packet_ref.packet_id,
      packet_hash: policyDecision.packet_ref.packet_hash,
      idempotency_key: policyDecision.packet_ref.idempotency_key,
    },
    policy_ref: {
      schema_id: policyDecision.schema_id,
      decision_id: policyDecision.decision_id,
      decision: policyDecision.decision,
    },
    approval_request_ref:
      approvalRequest === null
        ? null
        : {
            schema_id: approvalRequest.schema_id,
            approval_request_id: approvalRequest.approval_request_id,
            status: approvalRequest.status,
          },
    approval_decision_ref:
      approvalDecision === null
        ? null
        : {
            schema_id: approvalDecision.schema_id,
            approval_decision_id: approvalDecision.approval_decision_id,
            decision: approvalDecision.decision,
            approver_ref: approvalDecision.approver_ref,
            approver_session_ref: approvalDecision.approver_session_ref,
          },
    reason_codes: reasonCodes,
    source_evidence_hash: sourceEvidenceHash,
    idempotency_key: `audit:${input.event_type}:${terminalId}`,
    event_at: eventAt(input),
    observed_at: observedAt,
    retention_class: "control_plane",
    redaction: {
      raw_rejected_command: "not_present",
      raw_rejected_value: "not_present",
      raw_invalid_payload_content: "not_present",
      secret_like_values: "not_present",
    },
    authenticated_provenance: false,
    persistence_requested: false,
    execution_authorized: false,
    side_effects: [],
  };
}

function eventAt(input: AuditEventV1Input): string {
  if (input.event_type === "approval.decision_recorded") {
    return input.approval_decision.decided_at;
  }
  if (input.event_type === "approval.request_recorded") {
    return input.approval_request.requested_at;
  }
  return input.policy_decision.evaluated_at;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

function failure(
  code: AuditEventV1ErrorCode,
  path: string,
  message: string,
): AuditEventV1Result {
  return {
    ok: false,
    audit_event: null,
    errors: [createContractErrorV1(code, path, message)],
    side_effects: [],
  };
}

function idempotencyFailure(
  code: AuditEventV1IdempotencyErrorCode,
  path: string,
  message: string,
): AuditEventV1IdempotencyResult {
  return {
    ok: false,
    outcome: null,
    record_ref: null,
    errors: [createContractErrorV1(code, path, message)],
    state_unchanged: true,
    write_performed: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function isAuditEventV1IdempotencyRef(
  value: unknown,
): value is AuditEventV1IdempotencyRef {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["idempotency_key", "event_id"]) &&
    typeof value.idempotency_key === "string" &&
    /^audit:(?:policy\.decision_recorded|approval\.request_recorded|approval\.decision_recorded):(?:pol|apr|apd)_[a-f0-9]{64}$/u.test(
      value.idempotency_key,
    ) &&
    typeof value.event_id === "string" &&
    /^aud_[a-f0-9]{64}$/u.test(value.event_id)
  );
}

function cloneAuditEventV1IdempotencyRef(
  value: AuditEventV1IdempotencyRef,
): AuditEventV1IdempotencyRef {
  return {
    idempotency_key: value.idempotency_key,
    event_id: value.event_id,
  };
}

function parseCanonicalUtcTimestamp(value: string): number | null {
  const match = canonicalUtcTimestampPattern.exec(value);
  if (match === null) return null;
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) return null;
  const fraction = (match[2] ?? "").padEnd(3, "0");
  return new Date(instant).toISOString() === `${match[1]}.${fraction}Z`
    ? instant
    : null;
}

function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON numbers must be finite.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Value is not canonical JSON.");
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function sha256Hex(value: string): Promise<string> {
  const runtime = globalThis as unknown as {
    crypto?: {
      subtle: {
        digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
      };
    };
    TextEncoder?: new () => {
      encode(input: string): Uint8Array;
    };
  };
  if (runtime.crypto === undefined || runtime.TextEncoder === undefined) {
    throw new TypeError("SHA-256 support is unavailable.");
  }
  const digest = await runtime.crypto.subtle.digest(
    "SHA-256",
    new runtime.TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
