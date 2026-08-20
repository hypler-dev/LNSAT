import { defaultSubstrateControlIntent } from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectSubstrateControlIntentGatewayRequest,
  substrateControlIntentGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0097 substrate control intent Gateway contract", () => {
  it("returns BP-0096 source-only substrate control intent evidence through Gateway", async () => {
    const response = await inspectSubstrateControlIntentGatewayRequest(
      {
        request_id: "req_bp0097_substrate_control_intent",
        intent_request: {
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: substrateControlIntentGatewayContract.contract_id,
      request_id: "req_bp0097_substrate_control_intent",
      inspected_at: "2026-05-06T00:00:00.000Z",
      intent_version: "0.1",
      requested_actor: {
        actor_ref: "agent:codex",
        actor_type: "agent",
        role_ref: "role:ops_assistant",
      },
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      secret_posture: "references_only_no_values",
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected Gateway substrate control intent success");
    }

    expect(response.substrate_control_intent).toMatchObject({
      contract_id: "lnsat.platform.substrate_control_intent.v0_1",
      intent_version: "0.1",
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.required_packet_family_refs).toEqual({
      capability: ["packet_family:capability"],
      execution: ["packet_family:execution"],
      environment: ["packet_family:environment"],
      audit: ["packet_family:audit"],
      results: ["packet_family:results"],
      rollback: ["packet_family:rollback"],
    });
    expect(response.lifecycle_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packet_type: "CapabilityPacket",
          lifecycle_ref: "lifecycle:CapabilityPacket:approval_required",
        }),
        expect.objectContaining({
          packet_type: "ExecutionPacket",
          lifecycle_ref: "lifecycle:ExecutionPacket:approved",
        }),
      ]),
    );
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "execution.approval.required",
        "services.mutation.approval",
        "substrate.intent.policy.review",
      ]),
    );
    expect(response.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(response.required_audit_events).toEqual(
      expect.arrayContaining([
        "tool_requested",
        "policy_checked",
        "approval_requested",
        "approval_granted",
        "tool_denied",
        "runbook_started",
        "runbook_completed",
        "decision_recorded",
      ]),
    );
    expect(response.result_expectations).toMatchObject({
      result_packet_ref: "result_packet:substrate-control-intent",
      expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    });
    expect(response.rollback_expectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rollback_ref: "rollback:service-control-intent-review",
          owner_ref: "owner:lnsat-platform",
        }),
      ]),
    );
    expect(response.blocked_live_actions).toEqual(
      expect.arrayContaining([
        "substrate.mutation.execute",
        "runtime.execution.start",
        "database.write.execute",
        "service.restart.execute",
        "dns.cloudflare.write",
        "ssh.raw.execute",
        "docker.runner.start",
        "node_agent.exec",
        "git.command.execute",
      ]),
    );
    expect(response.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live substrate mutation",
        "no live execution",
        "no secret values",
      ]),
    );
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0096: source-only substrate control intent contract",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/substrate-control-intent.ts",
        "apps/api/src/substrate-control-intent.ts",
      ]),
    );
  });

  it("preserves an explicit observation intent without approval or rollback refs", async () => {
    const response = await inspectSubstrateControlIntentGatewayRequest(
      {
        request_id: "req_bp0097_observation_intent",
        intent_request: {
          requested_actor: {
            actor_ref: "human:jeff",
            actor_type: "human",
            role_ref: "role:owner",
          },
          capability: "service.status.read",
          risk_level: 0,
          target_substrate_kind: "services",
          requested_control_mode: "observation",
          source_refs: [
            {
              source_ref: "ticket:BP-0097",
              summary: "Gateway wraps observation-only service status intent",
            },
          ],
          lifecycle_refs: defaultSubstrateControlIntent.lifecycle_refs,
          policy_gate_refs: [
            {
              gate_ref: "substrate.intent.policy.review",
              decision_ref: "policy_decision:service-status-read",
              required: true,
            },
          ],
          approval_refs: [],
          audit_event_plan: defaultSubstrateControlIntent.audit_event_plan,
          result_expectations: defaultSubstrateControlIntent.result_expectations,
          rollback_expectations: [],
          blocked_live_actions: defaultSubstrateControlIntent.blocked_live_actions,
          live_substrate_mutation_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0097_observation_intent",
      requested_actor: {
        actor_ref: "human:jeff",
        actor_type: "human",
        role_ref: "role:owner",
      },
      capability: "service.status.read",
      risk_level: 0,
      requested_control_mode: "observation",
      required_approvals: [],
      rollback_expectations: [],
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectSubstrateControlIntentGatewayRequest(
      {
        request_id: 97,
        raw_rejected_value: "ssh.raw.execute TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "substrate_control_intent_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "substrate_control_intent_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "substrate_control_intent_gateway.missing_intent_request",
          path: "/intent_request",
        },
      ],
      intent_errors: [],
      substrate_control_intent: null,
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("ssh.raw.execute");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0096 evidence without raw echo", async () => {
    const response = await inspectSubstrateControlIntentGatewayRequest(
      {
        request_id: "req_bp0097_invalid_delegated_intent",
        intent_request: {
          live_substrate_mutation_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and then run raw command",
            },
          ],
          side_effects: [{ effect_type: "deploy" }],
          command: "rm -rf /",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      intent_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "substrate_control_intent.live_substrate_mutation_forbidden",
          path: "/live_substrate_mutation_allowed",
        }),
        expect.objectContaining({
          code: "substrate_control_intent.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "substrate_control_intent.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "substrate_control_intent.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "substrate_control_intent.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("deploy");
  });
});
