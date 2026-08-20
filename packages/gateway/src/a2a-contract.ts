import { createHash } from "node:crypto";
import type { GatewayOperationPrepareInput } from "./operation-recovery.js";
import { validatePublicHttpsTarget } from "./network-security.js";

export const A2A_PROTOCOL_VERSION = "1.0" as const;
const verifiedA2aCardBrand = Symbol("lnsat.a2a.verified_card");

export type A2aAgentCard = {
  protocol_version: typeof A2A_PROTOCOL_VERSION;
  agent_id: string;
  endpoint: string;
  capabilities: string[];
  skills: string[];
  auth_schemes: string[];
  issued_at: string;
  signing: {
    key_id: string;
    signature_ref: string;
    expires_at: string;
  };
};

export interface A2aAgentCardVerifier {
  verify(card: A2aAgentCard): Promise<
    | {
        ok: true;
        agent_id: string;
        key_id: string;
        key_status: "active" | "revoked" | "expired";
        key_expires_at: string;
      }
    | { ok: false }
  >;
}

export type A2aAgentCardInspection =
  | {
      ok: true;
      protocol_version: typeof A2A_PROTOCOL_VERSION;
      agent_id: string;
      card_digest: string;
      signature_verified: true;
      key_status: "active";
      endpoint_security: "public_https_revalidate_dns";
      metadata_trusted_for_authority: false;
      action_authorized: false;
      side_effects: [];
      readonly [verifiedA2aCardBrand]: true;
    }
  | {
      ok: false;
      error_code:
        | "a2a.card.invalid"
        | "a2a.card.endpoint_blocked"
        | "a2a.card.signature_invalid"
        | "a2a.card.key_inactive";
      action_authorized: false;
      side_effects: [];
    };

export async function inspectA2aAgentCard(input: {
  card: A2aAgentCard;
  resolved_ips: string[];
  redirect_chain: string[];
  now: Date;
  verifier: A2aAgentCardVerifier;
}): Promise<A2aAgentCardInspection> {
  if (!isValidAgentCard(input.card) || !Number.isFinite(input.now.getTime())) {
    return cardFailure("a2a.card.invalid");
  }
  const endpoint = validatePublicHttpsTarget({
    url: input.card.endpoint,
    resolved_ips: input.resolved_ips,
    redirect_chain: input.redirect_chain,
  });
  if (!endpoint.ok) return cardFailure("a2a.card.endpoint_blocked");
  let verification: Awaited<ReturnType<A2aAgentCardVerifier["verify"]>>;
  try {
    verification = await input.verifier.verify(input.card);
  } catch {
    verification = { ok: false };
  }
  if (
    !verification.ok ||
    verification.agent_id !== input.card.agent_id ||
    verification.key_id !== input.card.signing.key_id ||
    !validIso(verification.key_expires_at)
  ) {
    return cardFailure("a2a.card.signature_invalid");
  }
  if (
    verification.key_status !== "active" ||
    Date.parse(verification.key_expires_at) <= input.now.getTime() ||
    Date.parse(input.card.signing.expires_at) <= input.now.getTime()
  ) {
    return cardFailure("a2a.card.key_inactive");
  }
  return {
    ok: true,
    protocol_version: A2A_PROTOCOL_VERSION,
    agent_id: input.card.agent_id,
    card_digest: `sha256:${createHash("sha256").update(canonicalJson(input.card)).digest("hex")}`,
    signature_verified: true,
    key_status: "active",
    endpoint_security: "public_https_revalidate_dns",
    metadata_trusted_for_authority: false,
    action_authorized: false,
    side_effects: [],
    [verifiedA2aCardBrand]: true,
  };
}

export type A2aMessage = {
  protocol_version: typeof A2A_PROTOCOL_VERSION;
  message_id: string;
  task_id: string | null;
  context_id: string;
  skill_id: string;
  capability: string;
  principal_ref: string;
  artifact_refs: string[];
  delivery: "request" | "push" | "stream";
  cancellation_requested: boolean;
  a2a_idempotency_key: string | null;
};

export function mapA2aMessageToGatewayOperation(input: {
  card: Extract<A2aAgentCardInspection, { ok: true }>;
  message: A2aMessage;
  operation: Omit<
    GatewayOperationPrepareInput,
    | "remote_identity"
    | "protocol"
    | "protocol_version"
    | "a2a_task_id"
    | "a2a_context_id"
    | "a2a_message_id"
  >;
}):
  | {
      ok: true;
      operation: GatewayOperationPrepareInput;
      a2a_idempotency_advisory: string | null;
      cancellation_maps_to_request_only: boolean;
      push_and_stream_untrusted: boolean;
      action_authorized_by_a2a: false;
      side_effects: [];
    }
  | { ok: false; error_code: "a2a.message.invalid"; side_effects: [] } {
  if (
    input.card[verifiedA2aCardBrand] !== true ||
    !isValidA2aMessage(input.message) ||
    input.message.principal_ref !== input.operation.requester_identity ||
    input.operation.idempotency_key === input.message.a2a_idempotency_key
  ) {
    return { ok: false, error_code: "a2a.message.invalid", side_effects: [] };
  }
  return {
    ok: true,
    operation: {
      ...input.operation,
      remote_identity: `a2a:${input.card.agent_id}`,
      protocol: "a2a",
      protocol_version: A2A_PROTOCOL_VERSION,
      a2a_task_id: input.message.task_id,
      a2a_context_id: input.message.context_id,
      a2a_message_id: input.message.message_id,
    },
    a2a_idempotency_advisory: input.message.a2a_idempotency_key,
    cancellation_maps_to_request_only: input.message.cancellation_requested,
    push_and_stream_untrusted: ["push", "stream"].includes(input.message.delivery),
    action_authorized_by_a2a: false,
    side_effects: [],
  };
}

export type A2aTaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled"
  | "rejected"
  | "auth-required"
  | "unknown";

export function mapA2aTaskObservation(input: {
  state: A2aTaskState;
  artifact_refs: string[];
}):
  | {
      ok: true;
      gateway_observation_state:
        "accepted" | "working" | "input_required" | "outcome_unknown";
      artifact_refs: string[];
      can_complete: false;
      can_approve: false;
      can_authorize: false;
      side_effects: [];
    }
  | { ok: false; error_code: "a2a.observation.invalid"; side_effects: [] } {
  if (
    ![
      "submitted",
      "working",
      "input-required",
      "completed",
      "failed",
      "canceled",
      "rejected",
      "auth-required",
      "unknown",
    ].includes(input.state) ||
    !safeList(input.artifact_refs, 128, 512)
  ) {
    return { ok: false, error_code: "a2a.observation.invalid", side_effects: [] };
  }
  const states = {
    submitted: "accepted",
    working: "working",
    "input-required": "input_required",
    completed: "outcome_unknown",
    failed: "outcome_unknown",
    canceled: "outcome_unknown",
    rejected: "outcome_unknown",
    "auth-required": "input_required",
    unknown: "outcome_unknown",
  } as const;
  return {
    ok: true,
    gateway_observation_state: states[input.state],
    artifact_refs: [...input.artifact_refs],
    can_complete: false,
    can_approve: false,
    can_authorize: false,
    side_effects: [],
  };
}

export function validateA2aPushTarget(input: {
  url: string;
  resolved_ips: string[];
  redirect_chain: string[];
}) {
  return validatePublicHttpsTarget(input);
}

function isValidAgentCard(card: unknown): card is A2aAgentCard {
  if (!isPlainObject(card)) return false;
  return (
    card.protocol_version === A2A_PROTOCOL_VERSION &&
    safeLabel(card.agent_id, 256) &&
    safeList(card.capabilities, 128, 128) &&
    safeList(card.skills, 128, 128) &&
    safeList(card.auth_schemes, 16, 64) &&
    validIso(card.issued_at) &&
    isPlainObject(card.signing) &&
    safeLabel(card.signing.key_id, 256) &&
    safeLabel(card.signing.signature_ref, 512) &&
    validIso(card.signing.expires_at) &&
    Date.parse(card.signing.expires_at) > Date.parse(card.issued_at)
  );
}

function isValidA2aMessage(message: unknown): message is A2aMessage {
  if (!isPlainObject(message)) return false;
  return (
    message.protocol_version === A2A_PROTOCOL_VERSION &&
    safeLabel(message.message_id, 256) &&
    (message.task_id === null || safeLabel(message.task_id, 256)) &&
    safeLabel(message.context_id, 256) &&
    safeLabel(message.skill_id, 128) &&
    safeLabel(message.capability, 128) &&
    safeLabel(message.principal_ref, 512) &&
    safeList(message.artifact_refs, 128, 512) &&
    (message.delivery === "request" ||
      message.delivery === "push" ||
      message.delivery === "stream") &&
    typeof message.cancellation_requested === "boolean" &&
    (message.a2a_idempotency_key === null ||
      safeLabel(message.a2a_idempotency_key, 256))
  );
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeList(
  value: unknown,
  maxItems: number,
  maxLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => safeLabel(item, maxLength))
  );
}

function safeLabel(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function validIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cardFailure(
  error_code: Extract<A2aAgentCardInspection, { ok: false }>["error_code"],
): Extract<A2aAgentCardInspection, { ok: false }> {
  return { ok: false, error_code, action_authorized: false, side_effects: [] };
}
