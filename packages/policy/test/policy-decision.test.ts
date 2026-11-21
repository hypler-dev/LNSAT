import { describe, expect, it } from "vitest";
import { decideUniversalPacketPolicy, type PolicyDecision } from "../src/index.js";
import type { UniversalPacket } from "@lnsat/packets";

const createdAt = new Date("2026-05-03T00:00:00.000Z");

describe("@lnsat/policy decision skeleton", () => {
  it("allows a valid low-risk context packet", () => {
    const decision = decide(fixturePacket());

    expect(decision).toEqual({
      decision_id: "pol_context_0001",
      packet_id: "pkt_context_0001",
      actor_id: "agent.codex",
      session_id: "sess_bp0006_0001",
      resource_refs: ["repo:lnsat"],
      capability: "context.read",
      risk_level: 1,
      decision: "allow",
      requires_approval: false,
      reason_codes: [],
      created_at: "2026-05-03T00:00:00.000Z",
    });
  });

  it("denies packets that request an explicitly blocked capability", () => {
    const decision = decide(
      fixturePacket({
        permission_envelope: {
          allow: ["tests.run.sandbox"],
          block: ["tests.run.sandbox", "secret.read.never"],
        },
      }),
    );

    expect(decision).toMatchObject({
      capability: "tests.run.sandbox",
      decision: "deny",
      requires_approval: false,
      reason_codes: ["policy.capability_blocked"],
    });
  });

  it("denies packets that request forbidden direct capabilities", () => {
    const decision = decide(
      fixturePacket({
        permission_envelope: {
          allow: ["ssh"],
          block: ["secret.read.never"],
        },
      }),
    );

    expect(decision).toMatchObject({
      capability: "ssh",
      decision: "deny",
      requires_approval: false,
      reason_codes: ["policy.capability_forbidden"],
    });
  });

  it("requires approval for explicit approval packets, high risk, or gated capabilities", () => {
    const decision = decide(
      fixturePacket({
        risk_level: 6,
        requires_approval: true,
        permission_envelope: {
          allow: ["deploy.request"],
          block: ["secret.read.never"],
        },
      }),
    );

    expect(decision).toMatchObject({
      capability: "deploy.request",
      risk_level: 6,
      decision: "approval_required",
      requires_approval: true,
      reason_codes: [
        "policy.packet_requires_approval",
        "policy.risk_requires_approval",
        "policy.capability_requires_approval",
      ],
    });
  });
});

function decide(packet: UniversalPacket): PolicyDecision {
  return decideUniversalPacketPolicy(packet, { now: createdAt });
}

function fixturePacket(overrides: Partial<UniversalPacket> = {}): UniversalPacket {
  return {
    packet_id: "pkt_context_0001",
    packet_type: "ContextPacket",
    version: "0.1",
    project_id: "hypler",
    actor_id: "agent.codex",
    session_id: "sess_bp0006_0001",
    intent: "Compile source-backed context for a bounded packet task.",
    risk_level: 1,
    source_refs: ["doc:docs/architecture/PACKET_MODEL.md"],
    resource_refs: ["repo:lnsat"],
    policy_profile: "context_readonly",
    permission_envelope: {
      allow: ["context.read", "context.compile"],
      block: ["secret.read.never", "deploy.execute.approved"],
    },
    budget: {
      tokens: 8000,
      runtime_seconds: 300,
      cost_usd: 0.25,
      cpu: 1,
      memory_mb: 512,
    },
    constraints: {
      output_contract: "summary_with_source_refs",
    },
    requires_approval: false,
    ttl_seconds: 3600,
    created_at: "2026-05-03T00:00:00Z",
    ...overrides,
  };
}
