import { describe, expect, it } from "vitest";
import {
  createAuditEvents,
  createOnboardingContextInspectionAuditPreview,
  type AuditPolicyDecisionEvidence,
} from "../src/index.js";
import {
  validateUniversalPacket,
  type PacketValidationResult,
  type UniversalPacket,
} from "@lnsat/packets";

const now = new Date("2026-05-03T00:00:00.000Z");

describe("@lnsat/audit event skeleton", () => {
  it("records validated packet evidence as an append-only audit event object", () => {
    const events = createAuditEvents({
      validation: validate(fixturePacket()),
      packet_hash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      now,
    });

    expect(events).toEqual([
      {
        event_id: "evt_pkt_context_0001_packet_validated_2026_05_03t00_00_00_000z",
        event_type: "packet_validated",
        actor_id: "agent.codex",
        session_id: "sess_bp0007_0001",
        packet_ref: {
          packet_id: "pkt_context_0001",
          packet_type: "ContextPacket",
          packet_hash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        policy_ref: null,
        resource_refs: ["repo:lnsat"],
        capability: "context.read",
        result_status: "success",
        reason_codes: [],
        created_at: "2026-05-03T00:00:00.000Z",
      },
    ]);
  });

  it("records rejected packet evidence without echoing packet contents", () => {
    const validation = validateUniversalPacket({
      packet_type: "ContextPacket",
      constraints: { secret_value: "do-not-echo" },
    });

    const events = createAuditEvents({ validation, now });

    expect(events).toEqual([
      {
        event_id: "evt_unknown_packet_packet_rejected_2026_05_03t00_00_00_000z",
        event_type: "packet_rejected",
        actor_id: null,
        session_id: null,
        packet_ref: null,
        policy_ref: null,
        resource_refs: [],
        capability: null,
        result_status: "failure",
        reason_codes: [
          "packet.missing_required_field",
          "packet.invalid_field",
          "packet.secret_value_embedded",
        ],
        created_at: "2026-05-03T00:00:00.000Z",
      },
    ]);
  });

  it("records policy decision evidence with policy refs and stable reason codes", () => {
    const packet = fixturePacket({
      risk_level: 6,
      requires_approval: true,
      permission_envelope: {
        allow: ["deploy.request"],
        block: ["secret.read.never"],
      },
    });
    const validation = validate(packet);
    const events = createAuditEvents({
      validation,
      policy_decision: policyDecision({
        packet_id: packet.packet_id,
        decision: "approval_required",
        requires_approval: true,
        capability: "deploy.request",
        risk_level: 6,
        reason_codes: [
          "policy.packet_requires_approval",
          "policy.risk_requires_approval",
          "policy.capability_requires_approval",
        ],
      }),
      now,
    });

    expect(events[1]).toEqual({
      event_id: "evt_pkt_context_0001_policy_checked_2026_05_03t00_00_00_000z",
      event_type: "policy_checked",
      actor_id: "agent.codex",
      session_id: "sess_bp0007_0001",
      packet_ref: {
        packet_id: "pkt_context_0001",
        packet_type: "ContextPacket",
      },
      policy_ref: {
        decision_id: "pol_context_0001",
        decision: "approval_required",
        requires_approval: true,
      },
      resource_refs: ["repo:lnsat"],
      capability: "deploy.request",
      result_status: "approval_required",
      reason_codes: [
        "policy.packet_requires_approval",
        "policy.risk_requires_approval",
        "policy.capability_requires_approval",
      ],
      created_at: "2026-05-03T00:00:00.000Z",
    });
  });
});

describe("@lnsat/audit onboarding ContextPacket inspection preview", () => {
  it("records successful onboarding ContextPacket inspection without side effects", () => {
    const preview = createOnboardingContextInspectionAuditPreview({
      ok: true,
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      request_id: "req_bp0033_valid",
      inspected_at: "2026-05-04T00:00:00.000Z",
      source_docs: ["docs/reference/CONTRACT_PROVENANCE.md"],
      trusted_source_refs: [
        "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        "fixture:packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      ],
      profile_refs: {
        project_profile_ref:
          "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
        agent_profile_ref:
          "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
      },
      packet_ref: {
        packet_id: "pkt_onboarding_context_lnsat_agent_codex",
        packet_type: "ContextPacket",
        packet_hash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      side_effects: [],
    });

    expect(preview).toEqual([
      {
        event_id:
          "evt_pkt_onboarding_context_lnsat_agent_codex_context_packet_compiled_2026_05_04t00_00_00_000z",
        event_type: "context_packet_compiled",
        contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
        request_id: "req_bp0033_valid",
        inspected_at: "2026-05-04T00:00:00.000Z",
        packet_ref: {
          packet_id: "pkt_onboarding_context_lnsat_agent_codex",
          packet_type: "ContextPacket",
          packet_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
        profile_refs: {
          project_profile_ref:
            "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
          agent_profile_ref:
            "packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        },
        source_refs: [
          "fixture:packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
          "fixture:packages/packets/fixtures/agent-profiles/valid/codex-observer-profile.json",
        ],
        result_status: "success",
        reason_codes: [],
        side_effects: [],
      },
    ]);
  });

  it("records malformed Gateway request failures without raw command echo", () => {
    const preview = createOnboardingContextInspectionAuditPreview({
      ok: false,
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      request_id: "req_bp0033_bad_shape",
      inspected_at: "2026-05-04T00:00:00.000Z",
      source_docs: ["docs/reference/CONTRACT_PROVENANCE.md"],
      trusted_source_refs: [],
      packet_ref: null,
      request_errors: [
        {
          code: "onboarding_context_inspection.unexpected_field",
        },
      ],
      compiler_errors: [],
      profile_errors: [],
      side_effects: [],
    });

    expect(preview[0]).toMatchObject({
      event_type: "context_packet_inspection_rejected",
      packet_ref: null,
      profile_refs: null,
      source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
      result_status: "failure",
      reason_codes: ["onboarding_context_inspection.unexpected_field"],
      side_effects: [],
    });
    expect(JSON.stringify(preview)).not.toContain("rm -rf /");
  });

  it("records compiler failures without raw rejected values or secret-like values", () => {
    const preview = createOnboardingContextInspectionAuditPreview({
      ok: false,
      contract_id: "lnsat.gateway.onboarding_context_packet_inspection.v0_1",
      request_id: "req_bp0033_compiler_failure",
      inspected_at: "2026-05-04T00:00:00.000Z",
      source_docs: [
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/fixtures/project-profiles/valid/lnsat-project-profile.json",
      ],
      trusted_source_refs: [],
      packet_ref: null,
      request_errors: [],
      compiler_errors: [
        {
          code: "onboarding_context.invalid_created_at",
        },
      ],
      profile_errors: [
        {
          code: "agent_profile.secret_value_embedded",
        },
      ],
      side_effects: [],
    });

    expect(preview[0]).toMatchObject({
      event_type: "context_packet_inspection_rejected",
      packet_ref: null,
      profile_refs: null,
      result_status: "failure",
      reason_codes: [
        "onboarding_context.invalid_created_at",
        "agent_profile.secret_value_embedded",
      ],
      side_effects: [],
    });
    expect(JSON.stringify(preview)).not.toContain("secret:lnsat/demo/api-token");
    expect(JSON.stringify(preview)).not.toContain("redacted-inline-agent-secret");
  });
});

function validate(packet: UniversalPacket): PacketValidationResult {
  const result = validateUniversalPacket(packet);
  if (!result.ok) {
    throw new Error(`Fixture should validate: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

function policyDecision(
  overrides: Partial<AuditPolicyDecisionEvidence> = {},
): AuditPolicyDecisionEvidence {
  return {
    decision_id: "pol_context_0001",
    packet_id: "pkt_context_0001",
    actor_id: "agent.codex",
    session_id: "sess_bp0007_0001",
    resource_refs: ["repo:lnsat"],
    capability: "context.read",
    risk_level: 1,
    decision: "allow",
    requires_approval: false,
    reason_codes: [],
    created_at: "2026-05-03T00:00:00.000Z",
    ...overrides,
  };
}

function fixturePacket(overrides: Partial<UniversalPacket> = {}): UniversalPacket {
  return {
    packet_id: "pkt_context_0001",
    packet_type: "ContextPacket",
    version: "0.1",
    project_id: "hypler",
    actor_id: "agent.codex",
    session_id: "sess_bp0007_0001",
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
