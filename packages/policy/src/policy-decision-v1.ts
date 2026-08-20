import {
  canonicalizePacketEnvelopeV1,
  createContractErrorV1,
  hashPacketEnvelopeV1,
  validatePacketEnvelopeV1,
  type ContractErrorEnvelopeV1,
  type ContractErrorV1,
  type PacketEnvelopeV1,
  type PacketHash,
} from "@lnsat/packets";

export const POLICY_DECISION_V1_STATUS = "contract_only";

export const policyDecisionV1Contract = {
  contract_id: "lnsat.policy_decision.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.policy_decision.schema.v1_0",
  supported_policy_profiles: ["policy:agent_sandbox"],
  allowed_capabilities: ["context.read", "repository.read", "tests.run.sandbox"],
  approval_required_capabilities: [
    "database.migration.request",
    "deploy.request",
    "runbook.execute.request",
    "secret.use.brokered",
    "service.restart.request",
  ],
  forbidden_capabilities: [
    "billing.write",
    "database.prod.write",
    "database.write",
    "deploy.execute",
    "destructive.execute",
    "network.open",
    "root",
    "secret.read",
    "security.write",
    "ssh",
  ],
  approval_risk_threshold: 5,
  unknown_capability_behavior: "deny",
  unknown_policy_profile_behavior: "deny",
  precedence: ["deny", "approval_required", "allow"],
  evaluation_window: "created_at <= evaluated_at < expires_at",
  decision_identity: {
    algorithm: "sha-256",
    input: "<policy_schema_id>\\n<packet_sha256>\\n<canonical_evaluated_at>",
    output: "pol_<lowercase_hex>",
  },
  side_effects: [],
} as const;

export type PolicyDecisionV1Kind = "allow" | "deny" | "approval_required";

export type PolicyDecisionV1ReasonCode =
  | "policy.profile_unsupported"
  | "policy.no_capability_requested"
  | "policy.capability_forbidden"
  | "policy.capability_unknown"
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval"
  | "policy.capability_requires_approval";

export type PolicyCapabilityDecisionV1 = {
  capability: string;
  decision: PolicyDecisionV1Kind;
  reason_code:
    | "policy.profile_unsupported"
    | "policy.capability_forbidden"
    | "policy.capability_unknown"
    | "policy.capability_requires_approval"
    | null;
};

export type PolicyDecisionV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.policy_decision.schema.v1_0";
  decision_id: string;
  packet_ref: {
    packet_id: string;
    schema_id: "lnsat.packet_envelope.schema.v1_0";
    packet_hash: PacketHash;
    idempotency_key: string;
  };
  actor_ref: string;
  session_ref: string;
  project_ref: string;
  resource_refs: string[];
  policy_profile_ref: string;
  risk_level: number;
  capability_decisions: PolicyCapabilityDecisionV1[];
  decision: PolicyDecisionV1Kind;
  requires_approval: boolean;
  reason_codes: PolicyDecisionV1ReasonCode[];
  evaluated_at: string;
  expires_at: string;
  side_effects: [];
};

export type PolicyDecisionV1ErrorCode =
  | "policy_decision.invalid_packet"
  | "policy_decision.invalid_evaluation_time"
  | "policy_decision.packet_expired"
  | "policy_decision.hash_unavailable";

export type PolicyDecisionV1Error = ContractErrorV1<PolicyDecisionV1ErrorCode>;

export type PolicyDecisionV1Result =
  | {
      ok: true;
      policy_decision: PolicyDecisionV1;
      errors: [];
      side_effects: [];
    }
  | (ContractErrorEnvelopeV1<PolicyDecisionV1ErrorCode> & {
      policy_decision: null;
      errors: PolicyDecisionV1Error[];
    });

export type PolicyDecisionV1Options = {
  evaluated_at: string;
};

const supportedProfiles = new Set<string>(
  policyDecisionV1Contract.supported_policy_profiles,
);
const allowedCapabilities = new Set<string>(
  policyDecisionV1Contract.allowed_capabilities,
);
const approvalRequiredCapabilities = new Set<string>(
  policyDecisionV1Contract.approval_required_capabilities,
);
const forbiddenCapabilities = new Set<string>(
  policyDecisionV1Contract.forbidden_capabilities,
);
const reasonOrder: readonly PolicyDecisionV1ReasonCode[] = [
  "policy.profile_unsupported",
  "policy.no_capability_requested",
  "policy.capability_forbidden",
  "policy.capability_unknown",
  "policy.packet_requires_approval",
  "policy.risk_requires_approval",
  "policy.capability_requires_approval",
];
const canonicalUtcTimestampPattern =
  /^(?!0000)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u;

export async function decidePacketEnvelopePolicyV1(
  packet: PacketEnvelopeV1,
  options: PolicyDecisionV1Options,
): Promise<PolicyDecisionV1Result> {
  const packetValidation = validatePacketEnvelopeV1(packet);
  if (!packetValidation.ok) {
    return failure(
      "policy_decision.invalid_packet",
      "/packet",
      "Packet must satisfy the exact v1 packet-envelope contract.",
    );
  }

  const rawOptions: unknown = options;
  if (!isPlainObject(rawOptions) || typeof rawOptions.evaluated_at !== "string") {
    return failure(
      "policy_decision.invalid_evaluation_time",
      "/evaluated_at",
      "evaluated_at must be a real canonical UTC instant.",
    );
  }
  const evaluatedAtInput = rawOptions.evaluated_at;
  const evaluatedAt = parseCanonicalUtcTimestamp(evaluatedAtInput);
  if (evaluatedAt === null) {
    return failure(
      "policy_decision.invalid_evaluation_time",
      "/evaluated_at",
      "evaluated_at must be a real canonical UTC instant.",
    );
  }

  let packetSnapshot: PacketEnvelopeV1;
  try {
    packetSnapshot = JSON.parse(
      canonicalizePacketEnvelopeV1(packetValidation.packet),
    ) as PacketEnvelopeV1;
  } catch {
    return failure(
      "policy_decision.invalid_packet",
      "/packet",
      "Packet must satisfy the exact v1 packet-envelope contract.",
    );
  }

  const createdAt = parseCanonicalUtcTimestamp(packetSnapshot.created_at);
  const expiresAt = parseCanonicalUtcTimestamp(packetSnapshot.expires_at);
  if (
    createdAt === null ||
    expiresAt === null ||
    evaluatedAt < createdAt ||
    evaluatedAt >= expiresAt
  ) {
    return failure(
      "policy_decision.packet_expired",
      "/evaluated_at",
      "Policy evaluation must occur inside the packet validity window.",
    );
  }

  let packetHash: PacketHash;
  let decisionId: string;
  try {
    packetHash = await hashPacketEnvelopeV1(packetSnapshot);
    decisionId = `pol_${await sha256Hex(
      `${policyDecisionV1Contract.schema_id}\n${packetHash}\n${evaluatedAtInput}`,
    )}`;
  } catch {
    return failure(
      "policy_decision.hash_unavailable",
      "/packet",
      "Validated packet hash could not be produced.",
    );
  }

  const profileSupported = supportedProfiles.has(packetSnapshot.policy_profile_ref);
  const capabilityDecisions = packetSnapshot.permission_envelope.allow.map(
    (capability): PolicyCapabilityDecisionV1 =>
      classifyCapability(capability, profileSupported),
  );
  const reasons = new Set<PolicyDecisionV1ReasonCode>();

  if (!profileSupported) reasons.add("policy.profile_unsupported");
  if (capabilityDecisions.length === 0) {
    reasons.add("policy.no_capability_requested");
  }
  for (const capabilityDecision of capabilityDecisions) {
    if (capabilityDecision.reason_code !== null) {
      reasons.add(capabilityDecision.reason_code);
    }
  }
  if (packetSnapshot.requires_approval) {
    reasons.add("policy.packet_requires_approval");
  }
  if (packetSnapshot.risk_level >= policyDecisionV1Contract.approval_risk_threshold) {
    reasons.add("policy.risk_requires_approval");
  }

  const reasonCodes = reasonOrder.filter((reason) => reasons.has(reason));
  const decision = selectDecision(reasonCodes);

  return {
    ok: true,
    policy_decision: {
      contract_version: policyDecisionV1Contract.contract_version,
      schema_id: policyDecisionV1Contract.schema_id,
      decision_id: decisionId,
      packet_ref: {
        packet_id: packetSnapshot.packet_id,
        schema_id: packetSnapshot.schema_id,
        packet_hash: packetHash,
        idempotency_key: packetSnapshot.idempotency_key,
      },
      actor_ref: packetSnapshot.actor_ref,
      session_ref: packetSnapshot.session_ref,
      project_ref: packetSnapshot.project_ref,
      resource_refs: [...packetSnapshot.resource_refs],
      policy_profile_ref: packetSnapshot.policy_profile_ref,
      risk_level: packetSnapshot.risk_level,
      capability_decisions: capabilityDecisions,
      decision,
      requires_approval: decision === "approval_required",
      reason_codes: reasonCodes,
      evaluated_at: evaluatedAtInput,
      expires_at: packetSnapshot.expires_at,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function classifyCapability(
  capability: string,
  profileSupported: boolean,
): PolicyCapabilityDecisionV1 {
  if (!profileSupported) {
    return {
      capability,
      decision: "deny",
      reason_code: "policy.profile_unsupported",
    };
  }
  if (forbiddenCapabilities.has(capability)) {
    return {
      capability,
      decision: "deny",
      reason_code: "policy.capability_forbidden",
    };
  }
  if (approvalRequiredCapabilities.has(capability)) {
    return {
      capability,
      decision: "approval_required",
      reason_code: "policy.capability_requires_approval",
    };
  }
  if (allowedCapabilities.has(capability)) {
    return { capability, decision: "allow", reason_code: null };
  }
  return {
    capability,
    decision: "deny",
    reason_code: "policy.capability_unknown",
  };
}

function selectDecision(
  reasonCodes: readonly PolicyDecisionV1ReasonCode[],
): PolicyDecisionV1Kind {
  if (
    reasonCodes.some((reason) =>
      [
        "policy.profile_unsupported",
        "policy.no_capability_requested",
        "policy.capability_forbidden",
        "policy.capability_unknown",
      ].includes(reason),
    )
  ) {
    return "deny";
  }
  if (reasonCodes.length > 0) return "approval_required";
  return "allow";
}

function failure(
  code: PolicyDecisionV1ErrorCode,
  path: string,
  message: string,
): PolicyDecisionV1Result {
  return {
    ok: false,
    policy_decision: null,
    errors: [createContractErrorV1(code, path, message)],
    side_effects: [],
  };
}

function parseCanonicalUtcTimestamp(value: string): number | null {
  const match = canonicalUtcTimestampPattern.exec(value);
  if (match === null) return null;

  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) return null;

  const base = match[1];
  const fraction = (match[2] ?? "").padEnd(3, "0");
  return new Date(instant).toISOString() === `${base}.${fraction}Z` ? instant : null;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
