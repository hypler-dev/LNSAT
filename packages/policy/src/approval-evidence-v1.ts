import {
  createContractErrorV1,
  type ContractErrorEnvelopeV1,
  type ContractErrorV1,
} from "@lnsat/packets";

import {
  policyDecisionV1Contract,
  type PolicyDecisionV1,
  type PolicyDecisionV1ReasonCode,
} from "./policy-decision-v1.js";

export const APPROVAL_EVIDENCE_V1_STATUS = "contract_only";

export const approvalEvidenceV1Contract = {
  contract_version: "lnsat.contracts.v1_0",
  approval_request: {
    contract_id: "lnsat.approval_request.v1_0",
    schema_id: "lnsat.approval_request.schema.v1_0",
    identity: {
      algorithm: "sha-256",
      input: "canonical JSON of the complete request body without approval_request_id",
      output: "apr_<lowercase_hex>",
    },
  },
  approval_decision: {
    contract_id: "lnsat.approval_decision.v1_0",
    schema_id: "lnsat.approval_decision.schema.v1_0",
    identity: {
      algorithm: "sha-256",
      input:
        "<decision_schema_id>\\n<approval_request_id>\\n<decision>\\n<canonical_decided_at>\\n<approver_ref>\\n<approver_session_ref>\\n<reason_code>",
      output: "apd_<lowercase_hex>",
    },
  },
  approver_requirement: "identity:human:* and not requester_ref",
  validity_windows: {
    request: "policy_evaluated_at <= requested_at < policy_expires_at",
    decision: "requested_at <= decided_at < request_expires_at",
  },
  replay_behavior: "exact input produces exact evidence identity",
  authority_boundary:
    "approved satisfies one bound approval gate; it never authorizes execution",
  side_effects: [],
} as const;

export type ApprovalRequestV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.approval_request.schema.v1_0";
  approval_request_id: string;
  status: "requested";
  policy_decision_ref: {
    schema_id: "lnsat.policy_decision.schema.v1_0";
    decision_id: string;
    packet_hash: string;
  };
  requester_ref: string;
  session_ref: string;
  project_ref: string;
  resource_refs: string[];
  requested_capabilities: string[];
  policy_reason_codes: ApprovalRequestV1PolicyReasonCode[];
  requested_at: string;
  expires_at: string;
  side_effects: [];
};

export type ApprovalRequestV1PolicyReasonCode =
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval"
  | "policy.capability_requires_approval";

export type ApprovalDecisionV1Kind = "approved" | "denied";

export type ApprovalDecisionV1ReasonCode =
  | "approval.operator_approved"
  | "approval.operator_denied"
  | "approval.scope_rejected"
  | "approval.evidence_insufficient"
  | "approval.request_superseded";

export type ApprovalDecisionV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.approval_decision.schema.v1_0";
  approval_decision_id: string;
  approval_request_ref: {
    schema_id: "lnsat.approval_request.schema.v1_0";
    approval_request_id: string;
    policy_decision_id: string;
  };
  approver_ref: string;
  approver_session_ref: string;
  decision: ApprovalDecisionV1Kind;
  reason_code: ApprovalDecisionV1ReasonCode;
  decided_at: string;
  expires_at: string;
  approval_gate_satisfied: boolean;
  execution_authorized: false;
  side_effects: [];
};

export type ApprovalEvidenceV1ErrorCode =
  | "approval_request.invalid_policy_decision"
  | "approval_request.not_required"
  | "approval_request.invalid_request_time"
  | "approval_request.expired"
  | "approval_request.hash_unavailable"
  | "approval_decision.invalid_request"
  | "approval_decision.invalid_input"
  | "approval_decision.self_approval_forbidden"
  | "approval_decision.expired"
  | "approval_decision.hash_unavailable";

export type ApprovalEvidenceV1Error = ContractErrorV1<ApprovalEvidenceV1ErrorCode>;

export type ApprovalRequestV1Result =
  | {
      ok: true;
      approval_request: ApprovalRequestV1;
      errors: [];
      side_effects: [];
    }
  | (ContractErrorEnvelopeV1<ApprovalEvidenceV1ErrorCode> & {
      approval_request: null;
      errors: ApprovalEvidenceV1Error[];
    });

export type ApprovalDecisionV1Result =
  | {
      ok: true;
      approval_decision: ApprovalDecisionV1;
      errors: [];
      side_effects: [];
    }
  | (ContractErrorEnvelopeV1<ApprovalEvidenceV1ErrorCode> & {
      approval_decision: null;
      errors: ApprovalEvidenceV1Error[];
    });

export type CreateApprovalRequestV1Options = {
  requested_at: string;
};

export type DecideApprovalRequestV1Options = {
  approver_ref: string;
  approver_session_ref: string;
  decision: ApprovalDecisionV1Kind;
  reason_code: ApprovalDecisionV1ReasonCode;
  decided_at: string;
};

const policyReasonCodes = new Set<PolicyDecisionV1ReasonCode>([
  "policy.profile_unsupported",
  "policy.no_capability_requested",
  "policy.capability_forbidden",
  "policy.capability_unknown",
  "policy.packet_requires_approval",
  "policy.risk_requires_approval",
  "policy.capability_requires_approval",
]);
const denialPolicyReasons = new Set<PolicyDecisionV1ReasonCode>([
  "policy.profile_unsupported",
  "policy.no_capability_requested",
  "policy.capability_forbidden",
  "policy.capability_unknown",
]);
const approvalPolicyReasons = new Set<PolicyDecisionV1ReasonCode>([
  "policy.packet_requires_approval",
  "policy.risk_requires_approval",
  "policy.capability_requires_approval",
]);
const policyReasonOrder: readonly PolicyDecisionV1ReasonCode[] = [
  "policy.profile_unsupported",
  "policy.no_capability_requested",
  "policy.capability_forbidden",
  "policy.capability_unknown",
  "policy.packet_requires_approval",
  "policy.risk_requires_approval",
  "policy.capability_requires_approval",
];
const supportedPolicyProfiles = new Set<string>(
  policyDecisionV1Contract.supported_policy_profiles,
);
const allowedPolicyCapabilities = new Set<string>(
  policyDecisionV1Contract.allowed_capabilities,
);
const approvalPolicyCapabilities = new Set<string>(
  policyDecisionV1Contract.approval_required_capabilities,
);
const capabilityDecisions = new Set(["allow", "deny", "approval_required"]);
const capabilityReasonCodes = new Set([
  "policy.profile_unsupported",
  "policy.capability_forbidden",
  "policy.capability_unknown",
  "policy.capability_requires_approval",
  null,
]);
const approvalReasonCodes = new Set<ApprovalDecisionV1ReasonCode>([
  "approval.operator_approved",
  "approval.operator_denied",
  "approval.scope_rejected",
  "approval.evidence_insufficient",
  "approval.request_superseded",
]);
const deniedReasonCodes = new Set<ApprovalDecisionV1ReasonCode>([
  "approval.operator_denied",
  "approval.scope_rejected",
  "approval.evidence_insufficient",
  "approval.request_superseded",
]);
const canonicalUtcTimestampPattern =
  /^(?!0000)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u;
const identityRefPattern = /^identity:[^\s\u0000-\u001f\u007f]{1,240}$/u;
const humanIdentityRefPattern = /^identity:human:[^\s\u0000-\u001f\u007f]{1,234}$/u;
const sessionRefPattern = /^session:[^\s\u0000-\u001f\u007f]{1,240}$/u;
const projectRefPattern = /^project:[^\s\u0000-\u001f\u007f]{1,240}$/u;
const resourceRefPattern = /^[a-z][a-z0-9+.-]*:[^\s\u0000-\u001f\u007f]{1,240}$/u;
const capabilityPattern = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/u;
const decisionIdPattern = /^pol_[0-9a-f]{64}$/u;
const requestIdPattern = /^apr_[0-9a-f]{64}$/u;
const packetHashPattern = /^sha256:[0-9a-f]{64}$/u;

export async function createApprovalRequestV1(
  policyDecision: PolicyDecisionV1,
  options: CreateApprovalRequestV1Options,
): Promise<ApprovalRequestV1Result> {
  const rawDecision: unknown = policyDecision;
  if (!isPolicyDecisionV1(rawDecision)) {
    return requestFailure(
      "approval_request.invalid_policy_decision",
      "/policy_decision",
      "Policy decision must satisfy the exact v1 approval-required contract.",
    );
  }
  if (rawDecision.decision !== "approval_required" || !rawDecision.requires_approval) {
    return requestFailure(
      "approval_request.not_required",
      "/policy_decision/decision",
      "Approval evidence can only be requested for approval-required policy decisions.",
    );
  }

  const rawOptions: unknown = options;
  if (
    !isPlainObject(rawOptions) ||
    !hasExactKeys(rawOptions, ["requested_at"]) ||
    typeof rawOptions.requested_at !== "string"
  ) {
    return requestFailure(
      "approval_request.invalid_request_time",
      "/requested_at",
      "requested_at must be a real canonical UTC instant.",
    );
  }

  const requestedAtInput = rawOptions.requested_at;
  const requestedAt = parseCanonicalUtcTimestamp(requestedAtInput);
  if (requestedAt === null) {
    return requestFailure(
      "approval_request.invalid_request_time",
      "/requested_at",
      "requested_at must be a real canonical UTC instant.",
    );
  }

  let snapshot: PolicyDecisionV1;
  try {
    snapshot = JSON.parse(JSON.stringify(rawDecision)) as PolicyDecisionV1;
  } catch {
    return requestFailure(
      "approval_request.invalid_policy_decision",
      "/policy_decision",
      "Policy decision must satisfy the exact v1 approval-required contract.",
    );
  }

  const evaluatedAt = parseCanonicalUtcTimestamp(snapshot.evaluated_at);
  const expiresAt = parseCanonicalUtcTimestamp(snapshot.expires_at);
  if (
    evaluatedAt === null ||
    expiresAt === null ||
    requestedAt < evaluatedAt ||
    requestedAt >= expiresAt
  ) {
    return requestFailure(
      "approval_request.expired",
      "/requested_at",
      "Approval request must occur inside the policy decision validity window.",
    );
  }

  try {
    const expectedPolicyDecisionId = `pol_${await sha256Hex(
      `${snapshot.schema_id}\n${snapshot.packet_ref.packet_hash}\n${snapshot.evaluated_at}`,
    )}`;
    if (expectedPolicyDecisionId !== snapshot.decision_id) {
      return requestFailure(
        "approval_request.invalid_policy_decision",
        "/policy_decision/decision_id",
        "Policy decision identity does not match its bound evidence.",
      );
    }
    const requestBody = {
      contract_version: approvalEvidenceV1Contract.contract_version,
      schema_id: approvalEvidenceV1Contract.approval_request.schema_id,
      status: "requested" as const,
      policy_decision_ref: {
        schema_id: snapshot.schema_id,
        decision_id: snapshot.decision_id,
        packet_hash: snapshot.packet_ref.packet_hash,
      },
      requester_ref: snapshot.actor_ref,
      session_ref: snapshot.session_ref,
      project_ref: snapshot.project_ref,
      resource_refs: [...snapshot.resource_refs],
      requested_capabilities: snapshot.capability_decisions.map(
        ({ capability }) => capability,
      ),
      policy_reason_codes: [
        ...(snapshot.reason_codes as ApprovalRequestV1PolicyReasonCode[]),
      ],
      requested_at: requestedAtInput,
      expires_at: snapshot.expires_at,
      side_effects: [] as [],
    };
    const approvalRequestId = `apr_${await sha256Hex(canonicalizeJson(requestBody))}`;

    return {
      ok: true,
      approval_request: {
        ...requestBody,
        approval_request_id: approvalRequestId,
      },
      errors: [],
      side_effects: [],
    };
  } catch {
    return requestFailure(
      "approval_request.hash_unavailable",
      "/policy_decision",
      "Approval request identity could not be produced.",
    );
  }
}

export async function decideApprovalRequestV1(
  approvalRequest: ApprovalRequestV1,
  options: DecideApprovalRequestV1Options,
): Promise<ApprovalDecisionV1Result> {
  const rawRequest: unknown = approvalRequest;
  if (!isApprovalRequestV1(rawRequest)) {
    return decisionFailure(
      "approval_decision.invalid_request",
      "/approval_request",
      "Approval request must satisfy the exact v1 contract.",
    );
  }

  const rawOptions: unknown = options;
  if (
    !isPlainObject(rawOptions) ||
    !hasExactKeys(rawOptions, [
      "approver_ref",
      "approver_session_ref",
      "decision",
      "reason_code",
      "decided_at",
    ]) ||
    typeof rawOptions.approver_ref !== "string" ||
    !humanIdentityRefPattern.test(rawOptions.approver_ref) ||
    typeof rawOptions.approver_session_ref !== "string" ||
    !sessionRefPattern.test(rawOptions.approver_session_ref) ||
    (rawOptions.decision !== "approved" && rawOptions.decision !== "denied") ||
    typeof rawOptions.reason_code !== "string" ||
    !approvalReasonCodes.has(rawOptions.reason_code as ApprovalDecisionV1ReasonCode) ||
    typeof rawOptions.decided_at !== "string" ||
    parseCanonicalUtcTimestamp(rawOptions.decided_at) === null ||
    (rawOptions.decision === "approved" &&
      rawOptions.reason_code !== "approval.operator_approved") ||
    (rawOptions.decision === "denied" &&
      !deniedReasonCodes.has(rawOptions.reason_code as ApprovalDecisionV1ReasonCode))
  ) {
    return decisionFailure(
      "approval_decision.invalid_input",
      "/decision",
      "Approval decision input must satisfy the exact v1 human-decision contract.",
    );
  }
  const approverRef = rawOptions.approver_ref;
  const approverSessionRef = rawOptions.approver_session_ref;
  const decisionInput = rawOptions.decision;
  const reasonCodeInput = rawOptions.reason_code as ApprovalDecisionV1ReasonCode;
  const decidedAtInput = rawOptions.decided_at;

  let snapshot: ApprovalRequestV1;
  try {
    snapshot = JSON.parse(JSON.stringify(rawRequest)) as ApprovalRequestV1;
  } catch {
    return decisionFailure(
      "approval_decision.invalid_request",
      "/approval_request",
      "Approval request must satisfy the exact v1 contract.",
    );
  }

  const decidedAt = parseCanonicalUtcTimestamp(decidedAtInput);
  const requestedAt = parseCanonicalUtcTimestamp(snapshot.requested_at);
  const expiresAt = parseCanonicalUtcTimestamp(snapshot.expires_at);
  if (
    decidedAt === null ||
    requestedAt === null ||
    expiresAt === null ||
    decidedAt < requestedAt ||
    decidedAt >= expiresAt
  ) {
    return decisionFailure(
      "approval_decision.expired",
      "/decided_at",
      "Approval decision must occur inside the request validity window.",
    );
  }

  try {
    const expectedRequestId = `apr_${await sha256Hex(
      canonicalizeJson(approvalRequestBody(snapshot)),
    )}`;
    if (expectedRequestId !== snapshot.approval_request_id) {
      return decisionFailure(
        "approval_decision.invalid_request",
        "/approval_request/approval_request_id",
        "Approval request identity does not match its bound evidence.",
      );
    }
    if (approverRef === snapshot.requester_ref) {
      return decisionFailure(
        "approval_decision.self_approval_forbidden",
        "/approver_ref",
        "The requester cannot approve or deny the same approval request.",
      );
    }
    const decisionId = `apd_${await sha256Hex(
      `${approvalEvidenceV1Contract.approval_decision.schema_id}\n${snapshot.approval_request_id}\n${decisionInput}\n${decidedAtInput}\n${approverRef}\n${approverSessionRef}\n${reasonCodeInput}`,
    )}`;

    return {
      ok: true,
      approval_decision: {
        contract_version: approvalEvidenceV1Contract.contract_version,
        schema_id: approvalEvidenceV1Contract.approval_decision.schema_id,
        approval_decision_id: decisionId,
        approval_request_ref: {
          schema_id: snapshot.schema_id,
          approval_request_id: snapshot.approval_request_id,
          policy_decision_id: snapshot.policy_decision_ref.decision_id,
        },
        approver_ref: approverRef,
        approver_session_ref: approverSessionRef,
        decision: decisionInput,
        reason_code: reasonCodeInput,
        decided_at: decidedAtInput,
        expires_at: snapshot.expires_at,
        approval_gate_satisfied: decisionInput === "approved",
        execution_authorized: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    };
  } catch {
    return decisionFailure(
      "approval_decision.hash_unavailable",
      "/approval_request",
      "Approval decision identity could not be produced.",
    );
  }
}

function isPolicyDecisionV1(value: unknown): value is PolicyDecisionV1 {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "contract_version",
      "schema_id",
      "decision_id",
      "packet_ref",
      "actor_ref",
      "session_ref",
      "project_ref",
      "resource_refs",
      "policy_profile_ref",
      "risk_level",
      "capability_decisions",
      "decision",
      "requires_approval",
      "reason_codes",
      "evaluated_at",
      "expires_at",
      "side_effects",
    ]) ||
    value.contract_version !== "lnsat.contracts.v1_0" ||
    value.schema_id !== "lnsat.policy_decision.schema.v1_0" ||
    typeof value.decision_id !== "string" ||
    !decisionIdPattern.test(value.decision_id) ||
    typeof value.actor_ref !== "string" ||
    !identityRefPattern.test(value.actor_ref) ||
    typeof value.session_ref !== "string" ||
    !sessionRefPattern.test(value.session_ref) ||
    typeof value.project_ref !== "string" ||
    !projectRefPattern.test(value.project_ref) ||
    typeof value.policy_profile_ref !== "string" ||
    !value.policy_profile_ref.startsWith("policy:") ||
    !Number.isInteger(value.risk_level) ||
    (value.risk_level as number) < 0 ||
    (value.risk_level as number) > 8 ||
    (value.decision !== "allow" &&
      value.decision !== "deny" &&
      value.decision !== "approval_required") ||
    typeof value.requires_approval !== "boolean" ||
    typeof value.evaluated_at !== "string" ||
    parseCanonicalUtcTimestamp(value.evaluated_at) === null ||
    typeof value.expires_at !== "string" ||
    parseCanonicalUtcTimestamp(value.expires_at) === null ||
    !isEmptyArray(value.side_effects) ||
    !isSortedUniqueRefs(value.resource_refs) ||
    !isPolicyDecisionPacketRef(value.packet_ref) ||
    !Array.isArray(value.capability_decisions) ||
    !value.capability_decisions.every(isApprovalCapabilityDecision) ||
    !isSortedUnique(
      value.capability_decisions.map((item) =>
        isPlainObject(item) && typeof item.capability === "string"
          ? item.capability
          : "",
      ),
    ) ||
    !Array.isArray(value.reason_codes) ||
    !value.reason_codes.every(
      (reason) =>
        typeof reason === "string" &&
        policyReasonCodes.has(reason as PolicyDecisionV1ReasonCode),
    ) ||
    !isUnique(value.reason_codes) ||
    !isPolicyDecisionConsistent(value as unknown as PolicyDecisionV1)
  ) {
    return false;
  }
  return true;
}

function isPolicyDecisionPacketRef(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["packet_id", "schema_id", "packet_hash", "idempotency_key"]) &&
    typeof value.packet_id === "string" &&
    /^pkt_[a-z0-9][a-z0-9_-]{7,63}$/u.test(value.packet_id) &&
    value.schema_id === "lnsat.packet_envelope.schema.v1_0" &&
    typeof value.packet_hash === "string" &&
    packetHashPattern.test(value.packet_hash) &&
    typeof value.idempotency_key === "string" &&
    /^idem_[a-z0-9][a-z0-9_-]{7,127}$/u.test(value.idempotency_key)
  );
}

function isApprovalCapabilityDecision(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["capability", "decision", "reason_code"]) &&
    typeof value.capability === "string" &&
    value.capability.length <= 128 &&
    capabilityPattern.test(value.capability) &&
    typeof value.decision === "string" &&
    capabilityDecisions.has(value.decision) &&
    capabilityReasonCodes.has(value.reason_code as string | null) &&
    ((value.decision === "allow" && value.reason_code === null) ||
      (value.decision === "deny" &&
        (value.reason_code === "policy.profile_unsupported" ||
          value.reason_code === "policy.capability_forbidden" ||
          value.reason_code === "policy.capability_unknown")) ||
      (value.decision === "approval_required" &&
        value.reason_code === "policy.capability_requires_approval"))
  );
}

function isPolicyDecisionConsistent(value: PolicyDecisionV1): boolean {
  const denialPresent = value.reason_codes.some((reason) =>
    denialPolicyReasons.has(reason),
  );
  const approvalPresent = value.reason_codes.some((reason) =>
    approvalPolicyReasons.has(reason),
  );
  if (value.decision === "allow") {
    return (
      value.requires_approval === false &&
      value.reason_codes.length === 0 &&
      value.capability_decisions.length > 0 &&
      value.capability_decisions.every(({ decision }) => decision === "allow")
    );
  }
  if (value.decision === "deny") {
    return value.requires_approval === false && denialPresent;
  }
  return (
    value.requires_approval === true &&
    !denialPresent &&
    approvalPresent &&
    value.capability_decisions.length > 0 &&
    value.capability_decisions.every(({ decision }) => decision !== "deny") &&
    isApprovalPolicySemanticsConsistent(value)
  );
}

function isApprovalPolicySemanticsConsistent(value: PolicyDecisionV1): boolean {
  if (!supportedPolicyProfiles.has(value.policy_profile_ref)) return false;

  const capabilitiesMatch = value.capability_decisions.every(
    ({ capability, decision, reason_code }) => {
      if (allowedPolicyCapabilities.has(capability)) {
        return decision === "allow" && reason_code === null;
      }
      if (approvalPolicyCapabilities.has(capability)) {
        return (
          decision === "approval_required" &&
          reason_code === "policy.capability_requires_approval"
        );
      }
      return false;
    },
  );
  if (!capabilitiesMatch) return false;

  const riskReasonPresent = value.reason_codes.includes(
    "policy.risk_requires_approval",
  );
  const capabilityReasonPresent = value.reason_codes.includes(
    "policy.capability_requires_approval",
  );
  const hasApprovalCapability = value.capability_decisions.some(
    ({ decision }) => decision === "approval_required",
  );

  return (
    riskReasonPresent ===
      value.risk_level >= policyDecisionV1Contract.approval_risk_threshold &&
    capabilityReasonPresent === hasApprovalCapability &&
    value.reason_codes.every(
      (reason, index) =>
        index === 0 ||
        policyReasonOrder.indexOf(
          value.reason_codes[index - 1] as PolicyDecisionV1ReasonCode,
        ) < policyReasonOrder.indexOf(reason),
    )
  );
}

function isApprovalRequestV1(value: unknown): value is ApprovalRequestV1 {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      "contract_version",
      "schema_id",
      "approval_request_id",
      "status",
      "policy_decision_ref",
      "requester_ref",
      "session_ref",
      "project_ref",
      "resource_refs",
      "requested_capabilities",
      "policy_reason_codes",
      "requested_at",
      "expires_at",
      "side_effects",
    ]) &&
    value.contract_version === "lnsat.contracts.v1_0" &&
    value.schema_id === "lnsat.approval_request.schema.v1_0" &&
    typeof value.approval_request_id === "string" &&
    requestIdPattern.test(value.approval_request_id) &&
    value.status === "requested" &&
    isApprovalPolicyDecisionRef(value.policy_decision_ref) &&
    typeof value.requester_ref === "string" &&
    identityRefPattern.test(value.requester_ref) &&
    typeof value.session_ref === "string" &&
    sessionRefPattern.test(value.session_ref) &&
    typeof value.project_ref === "string" &&
    projectRefPattern.test(value.project_ref) &&
    isSortedUniqueRefs(value.resource_refs) &&
    isSortedUniqueCapabilities(value.requested_capabilities) &&
    Array.isArray(value.policy_reason_codes) &&
    value.policy_reason_codes.length > 0 &&
    value.policy_reason_codes.every(
      (reason) =>
        typeof reason === "string" &&
        approvalPolicyReasons.has(reason as PolicyDecisionV1ReasonCode),
    ) &&
    isUnique(value.policy_reason_codes) &&
    typeof value.requested_at === "string" &&
    parseCanonicalUtcTimestamp(value.requested_at) !== null &&
    typeof value.expires_at === "string" &&
    parseCanonicalUtcTimestamp(value.expires_at) !== null &&
    isEmptyArray(value.side_effects)
  );
}

function isApprovalPolicyDecisionRef(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["schema_id", "decision_id", "packet_hash"]) &&
    value.schema_id === "lnsat.policy_decision.schema.v1_0" &&
    typeof value.decision_id === "string" &&
    decisionIdPattern.test(value.decision_id) &&
    typeof value.packet_hash === "string" &&
    packetHashPattern.test(value.packet_hash)
  );
}

function requestFailure(
  code: ApprovalEvidenceV1ErrorCode,
  path: string,
  message: string,
): ApprovalRequestV1Result {
  return {
    ok: false,
    approval_request: null,
    errors: [createContractErrorV1(code, path, message)],
    side_effects: [],
  };
}

function decisionFailure(
  code: ApprovalEvidenceV1ErrorCode,
  path: string,
  message: string,
): ApprovalDecisionV1Result {
  return {
    ok: false,
    approval_decision: null,
    errors: [createContractErrorV1(code, path, message)],
    side_effects: [],
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

function isSortedUniqueRefs(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string" && item.length <= 256 && resourceRefPattern.test(item),
    ) &&
    isSortedUnique(value)
  );
}

function isSortedUniqueCapabilities(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "string" && item.length <= 128 && capabilityPattern.test(item),
    ) &&
    isSortedUnique(value)
  );
}

function isSortedUnique(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || (values[index - 1] as string) < value,
  );
}

function isUnique(values: readonly unknown[]): boolean {
  return new Set(values).size === values.length;
}

function isEmptyArray(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
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

function approvalRequestBody(
  request: ApprovalRequestV1,
): Omit<ApprovalRequestV1, "approval_request_id"> {
  const { approval_request_id: _approvalRequestId, ...requestBody } = request;
  return requestBody;
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
