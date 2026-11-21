import type {
  PacketHash,
  PacketValidationErrorCode,
  PacketValidationResult,
  UniversalPacket,
} from "@lnsat/packets";

export const AUDIT_LEDGER_STATUS = "bp-0007-audit-event-skeleton";

export type AuditEventType = "packet_validated" | "packet_rejected" | "policy_checked";

export type AuditResultStatus =
  | "success"
  | "failure"
  | "allow"
  | "deny"
  | "approval_required";

export type AuditReasonCode =
  | PacketValidationErrorCode
  | "policy.capability_blocked"
  | "policy.capability_forbidden"
  | "policy.capability_requires_approval"
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval"
  | "audit.policy_packet_mismatch";

export type AuditPacketRef = {
  packet_id: string;
  packet_type: UniversalPacket["packet_type"];
  packet_hash?: PacketHash;
};

export type AuditPolicyDecisionEvidence = {
  decision_id: string;
  packet_id: string;
  actor_id: string;
  session_id: string;
  resource_refs: string[];
  capability: string;
  risk_level: number;
  decision: "allow" | "deny" | "approval_required";
  requires_approval: boolean;
  reason_codes: AuditReasonCode[];
  created_at: string;
};

export type AuditPolicyRef = {
  decision_id: string;
  decision: AuditPolicyDecisionEvidence["decision"];
  requires_approval: boolean;
};

export type AuditEvent = {
  event_id: string;
  event_type: AuditEventType;
  actor_id: string | null;
  session_id: string | null;
  packet_ref: AuditPacketRef | null;
  policy_ref: AuditPolicyRef | null;
  resource_refs: string[];
  capability: string | null;
  result_status: AuditResultStatus;
  reason_codes: AuditReasonCode[];
  created_at: string;
};

export type AuditEventInput = {
  validation: PacketValidationResult;
  policy_decision?: AuditPolicyDecisionEvidence;
  packet_hash?: PacketHash;
  now?: Date;
};

export function createAuditEvents(input: AuditEventInput): AuditEvent[] {
  const createdAt = (input.now ?? new Date()).toISOString();
  const validationEvent = createPacketValidationEvent(input, createdAt);

  if (!input.validation.ok || input.policy_decision === undefined) {
    return [validationEvent];
  }

  return [
    validationEvent,
    createPolicyDecisionEvent(
      input.validation.packet,
      input.policy_decision,
      input.packet_hash,
      createdAt,
    ),
  ];
}

function createPacketValidationEvent(
  input: AuditEventInput,
  createdAt: string,
): AuditEvent {
  if (!input.validation.ok) {
    return {
      event_id: auditEventId("unknown_packet", "packet_rejected", createdAt),
      event_type: "packet_rejected",
      actor_id: null,
      session_id: null,
      packet_ref: null,
      policy_ref: null,
      resource_refs: [],
      capability: null,
      result_status: "failure",
      reason_codes: dedupeReasonCodes(
        input.validation.errors.map((error) => error.code),
      ),
      created_at: createdAt,
    };
  }

  const packet = input.validation.packet;

  return {
    event_id: auditEventId(packet.packet_id, "packet_validated", createdAt),
    event_type: "packet_validated",
    actor_id: packet.actor_id,
    session_id: packet.session_id,
    packet_ref: packetRef(packet, input.packet_hash),
    policy_ref: null,
    resource_refs: packet.resource_refs,
    capability: packet.permission_envelope.allow[0] ?? null,
    result_status: "success",
    reason_codes: [],
    created_at: createdAt,
  };
}

function createPolicyDecisionEvent(
  packet: UniversalPacket,
  policyDecision: AuditPolicyDecisionEvidence,
  packetHash: PacketHash | undefined,
  createdAt: string,
): AuditEvent {
  const reasonCodes: AuditReasonCode[] =
    policyDecision.packet_id === packet.packet_id
      ? policyDecision.reason_codes
      : [...policyDecision.reason_codes, "audit.policy_packet_mismatch"];

  return {
    event_id: auditEventId(packet.packet_id, "policy_checked", createdAt),
    event_type: "policy_checked",
    actor_id: policyDecision.actor_id,
    session_id: policyDecision.session_id,
    packet_ref: packetRef(packet, packetHash),
    policy_ref: {
      decision_id: policyDecision.decision_id,
      decision: policyDecision.decision,
      requires_approval: policyDecision.requires_approval,
    },
    resource_refs: policyDecision.resource_refs,
    capability: policyDecision.capability,
    result_status: policyDecision.decision,
    reason_codes: dedupeReasonCodes(reasonCodes),
    created_at: createdAt,
  };
}

function packetRef(
  packet: UniversalPacket,
  packetHash: PacketHash | undefined,
): AuditPacketRef {
  return {
    packet_id: packet.packet_id,
    packet_type: packet.packet_type,
    ...(packetHash === undefined ? {} : { packet_hash: packetHash }),
  };
}

function auditEventId(
  packetId: string,
  eventType: AuditEventType,
  createdAt: string,
): string {
  return `evt_${sanitizeId(packetId)}_${sanitizeId(eventType)}_${sanitizeId(createdAt)}`;
}

function sanitizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function dedupeReasonCodes(reasonCodes: AuditReasonCode[]): AuditReasonCode[] {
  return [...new Set(reasonCodes)];
}
