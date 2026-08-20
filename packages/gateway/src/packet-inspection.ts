import { createAuditEvents, type AuditEvent } from "@lnsat/audit";
import {
  canonicalizeUniversalPacket,
  hashUniversalPacket,
  validateUniversalPacket,
  type PacketHash,
  type PacketValidationError,
  type UniversalPacket,
} from "@lnsat/packets";
import { decideUniversalPacketPolicy, type PolicyDecision } from "@lnsat/policy";

export const PACKET_INSPECTION_GATEWAY_STATUS = "read_only";

export const packetInspectionGatewayContract = {
  contract_id: "lnsat.gateway.packet_inspection.v0_1",
  method: "POST",
  path: "/v1/packets/inspect",
  authority: ["@lnsat/packets", "@lnsat/policy", "@lnsat/audit"],
  side_effects: [],
  status: "read_only_route",
} as const;

export type PacketInspectionGatewayRequest = {
  request_id?: string;
  packet: unknown;
};

export type GatewayRequestDigest = `sha256:${string}`;

export type GatewayRequestErrorCode =
  | "gateway.invalid_request"
  | "gateway.unexpected_field"
  | "gateway.missing_packet"
  | "gateway.invalid_request_id";

export type GatewayRequestError = {
  code: GatewayRequestErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PacketInspectionPacketRef = {
  packet_id: string;
  packet_type: UniversalPacket["packet_type"];
  packet_hash: PacketHash;
};

export type PacketInspectionGatewayResponse =
  | {
      ok: true;
      contract_id: typeof packetInspectionGatewayContract.contract_id;
      request_id: string | null;
      received_at: string;
      request_digest: GatewayRequestDigest;
      packet_ref: PacketInspectionPacketRef;
      validation: { ok: true; errors: [] };
      canonical_json: string;
      policy_decision: PolicyDecision;
      audit_event_preview: AuditEvent[];
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof packetInspectionGatewayContract.contract_id;
      request_id: string | null;
      received_at: string;
      request_digest: null;
      packet_ref: null;
      request_errors: GatewayRequestError[];
      validation: { ok: false; errors: PacketValidationError[] };
      canonical_json: null;
      policy_decision: null;
      audit_event_preview: AuditEvent[];
      side_effects: [];
    };

export async function inspectPacketGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<PacketInspectionGatewayResponse> {
  const receivedAt = (options.now ?? new Date()).toISOString();
  const request = normalizePacketInspectionRequest(input);

  if (!request.ok) {
    return {
      ok: false,
      contract_id: packetInspectionGatewayContract.contract_id,
      request_id: request.request_id,
      received_at: receivedAt,
      request_digest: null,
      packet_ref: null,
      request_errors: request.errors,
      validation: { ok: false, errors: [] },
      canonical_json: null,
      policy_decision: null,
      audit_event_preview: [],
      side_effects: [],
    };
  }

  const validation = validateUniversalPacket(request.packet);

  if (!validation.ok) {
    return {
      ok: false,
      contract_id: packetInspectionGatewayContract.contract_id,
      request_id: request.request_id,
      received_at: receivedAt,
      request_digest: null,
      packet_ref: null,
      request_errors: [],
      validation: { ok: false, errors: validation.errors },
      canonical_json: null,
      policy_decision: null,
      audit_event_preview: createAuditEvents({
        validation,
        now: new Date(receivedAt),
      }),
      side_effects: [],
    };
  }

  const packetHash = await hashUniversalPacket(validation.packet);
  const canonicalJson = canonicalizeUniversalPacket(validation.packet);
  const requestDigest = await hashCanonicalPacketInspectionRequest(
    request.request_id,
    canonicalJson,
  );
  const policyDecision = decideUniversalPacketPolicy(validation.packet, {
    now: new Date(receivedAt),
  });

  return {
    ok: true,
    contract_id: packetInspectionGatewayContract.contract_id,
    request_id: request.request_id,
    received_at: receivedAt,
    request_digest: requestDigest,
    packet_ref: {
      packet_id: validation.packet.packet_id,
      packet_type: validation.packet.packet_type,
      packet_hash: packetHash,
    },
    validation: { ok: true, errors: [] },
    canonical_json: canonicalJson,
    policy_decision: policyDecision,
    audit_event_preview: createAuditEvents({
      validation,
      policy_decision: policyDecision,
      packet_hash: packetHash,
      now: new Date(receivedAt),
    }),
    side_effects: [],
  };
}

type NormalizedPacketInspectionRequest =
  | { ok: true; request_id: string | null; packet: unknown }
  | { ok: false; request_id: string | null; errors: GatewayRequestError[] };

const allowedRequestKeys = new Set(["request_id", "packet"]);

function normalizePacketInspectionRequest(
  input: unknown,
): NormalizedPacketInspectionRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        gatewayError(
          "gateway.invalid_request",
          "",
          "Gateway packet inspection request must be an object.",
        ),
      ],
    };
  }

  const errors: GatewayRequestError[] = [];
  for (const key of Object.keys(input)) {
    if (!allowedRequestKeys.has(key)) {
      errors.push(
        gatewayError(
          "gateway.unexpected_field",
          jsonPointer(key),
          `Unexpected gateway request field '${key}'.`,
        ),
      );
    }
  }

  if (!Object.hasOwn(input, "packet")) {
    errors.push(
      gatewayError(
        "gateway.missing_packet",
        "/packet",
        "Gateway packet inspection request must include packet.",
      ),
    );
  }

  const requestId = input.request_id;
  if (requestId !== undefined && typeof requestId !== "string") {
    errors.push(
      gatewayError(
        "gateway.invalid_request_id",
        "/request_id",
        "request_id must be a string when provided.",
      ),
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      request_id: typeof requestId === "string" ? requestId : null,
      errors,
    };
  }

  return {
    ok: true,
    request_id: typeof requestId === "string" ? requestId : null,
    packet: input.packet,
  };
}

function gatewayError(
  code: GatewayRequestErrorCode,
  path: string,
  message: string,
): GatewayRequestError {
  return { code, path, message, severity: "error" };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonPointer(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

async function hashCanonicalPacketInspectionRequest(
  requestId: string | null,
  canonicalPacket: string,
): Promise<GatewayRequestDigest> {
  const canonicalRequest =
    `{"contract_id":${JSON.stringify(packetInspectionGatewayContract.contract_id)},` +
    `"packet":${canonicalPacket},"request_id":${JSON.stringify(requestId)}}`;
  const bytes = new TextEncoder().encode(canonicalRequest);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
