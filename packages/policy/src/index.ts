import type { UniversalPacket } from "@lnsat/packets";

export const POLICY_ENGINE_STATUS = "bp-0006-policy-decision-skeleton";

export type PolicyDecisionKind = "allow" | "deny" | "approval_required";

export type PolicyReasonCode =
  | "policy.capability_blocked"
  | "policy.capability_forbidden"
  | "policy.capability_requires_approval"
  | "policy.packet_requires_approval"
  | "policy.risk_requires_approval";

export type PolicyDecision = {
  decision_id: string;
  packet_id: string;
  actor_id: string;
  session_id: string;
  resource_refs: string[];
  capability: string;
  risk_level: number;
  decision: PolicyDecisionKind;
  requires_approval: boolean;
  reason_codes: PolicyReasonCode[];
  created_at: string;
};

export type PolicyDecisionOptions = {
  now?: Date;
};

const forbiddenCapabilities = new Set([
  "secret.read.never",
  "ssh",
  "root",
  "database.write",
  "database.prod.write",
  "billing.write",
  "security.write",
  "destructive.execute",
]);

const approvalGatedCapabilities = new Set([
  "service.restart.request",
  "runbook.execute.approved",
  "secret.use.brokered",
  "deploy.request",
  "deploy.execute.approved",
  "database.migration.approved",
]);

export function decideUniversalPacketPolicy(
  packet: UniversalPacket,
  options: PolicyDecisionOptions = {},
): PolicyDecision {
  const requestedCapabilities = packet.permission_envelope.allow;
  const blockedCapabilities = new Set(packet.permission_envelope.block);
  const reasonCodes: PolicyReasonCode[] = [];

  if (requestedCapabilities.some((capability) => blockedCapabilities.has(capability))) {
    reasonCodes.push("policy.capability_blocked");
  }

  if (
    requestedCapabilities.some((capability) => forbiddenCapabilities.has(capability))
  ) {
    reasonCodes.push("policy.capability_forbidden");
  }

  if (reasonCodes.length === 0) {
    if (packet.requires_approval) {
      reasonCodes.push("policy.packet_requires_approval");
    }

    if (packet.risk_level >= 5) {
      reasonCodes.push("policy.risk_requires_approval");
    }

    if (
      requestedCapabilities.some((capability) =>
        approvalGatedCapabilities.has(capability),
      )
    ) {
      reasonCodes.push("policy.capability_requires_approval");
    }
  }

  const decision = selectDecision(reasonCodes);

  return {
    decision_id: policyDecisionId(packet.packet_id),
    packet_id: packet.packet_id,
    actor_id: packet.actor_id,
    session_id: packet.session_id,
    resource_refs: packet.resource_refs,
    capability: requestedCapabilities[0] ?? "none",
    risk_level: packet.risk_level,
    decision,
    requires_approval: decision === "approval_required",
    reason_codes: dedupeReasonCodes(reasonCodes),
    created_at: (options.now ?? new Date()).toISOString(),
  };
}

function selectDecision(reasonCodes: PolicyReasonCode[]): PolicyDecisionKind {
  if (
    reasonCodes.includes("policy.capability_blocked") ||
    reasonCodes.includes("policy.capability_forbidden")
  ) {
    return "deny";
  }

  if (reasonCodes.length > 0) {
    return "approval_required";
  }

  return "allow";
}

function policyDecisionId(packetId: string): string {
  return `pol_${packetId.replace(/^pkt_/, "")}`;
}

function dedupeReasonCodes(reasonCodes: PolicyReasonCode[]): PolicyReasonCode[] {
  return [...new Set(reasonCodes)];
}
