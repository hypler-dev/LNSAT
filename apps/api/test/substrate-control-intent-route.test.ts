import { defaultSubstrateControlIntent } from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  substrateControlIntentGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0098 substrate control intent route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects substrate control intent evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: substrateControlIntentGatewayContract.method,
      url: substrateControlIntentGatewayContract.path,
      payload: {
        request_id: "req_bp0098_route_substrate_control_intent",
        intent_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0098",
              summary:
                "Fastify route exposes Gateway substrate control intent evidence",
            },
          ],
          side_effects: [],
        },
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      contract_id: substrateControlIntentGatewayContract.contract_id,
      request_id: "req_bp0098_route_substrate_control_intent",
      inspected_at: "2026-05-06T00:00:00.000Z",
      substrate_control_intent: {
        contract_id: "lnsat.platform.substrate_control_intent.v0_1",
        intent_version: "0.1",
        live_substrate_mutation_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
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
    expect(body.required_packet_family_refs).toEqual({
      capability: ["packet_family:capability"],
      execution: ["packet_family:execution"],
      environment: ["packet_family:environment"],
      audit: ["packet_family:audit"],
      results: ["packet_family:results"],
      rollback: ["packet_family:rollback"],
    });
    expect(body.lifecycle_refs).toEqual(
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
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
        "execution.approval.required",
        "services.mutation.approval",
        "substrate.intent.policy.review",
      ]),
    );
    expect(body.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(body.audit_event_plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event_type: "tool_requested" }),
        expect.objectContaining({ event_type: "policy_checked" }),
        expect.objectContaining({ event_type: "approval_requested" }),
        expect.objectContaining({ event_type: "runbook_completed" }),
      ]),
    );
    expect(body.result_expectations).toMatchObject({
      result_packet_ref: "result_packet:substrate-control-intent",
      expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    });
    expect(body.rollback_expectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rollback_ref: "rollback:service-control-intent-review",
          owner_ref: "owner:lnsat-platform",
        }),
      ]),
    );
    expect(body.blocked_live_actions).toEqual(
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
    expect(body.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live substrate mutation",
        "no live execution",
        "no secret values",
      ]),
    );
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0098: Fastify route exposes Gateway substrate control intent evidence",
      ]),
    );
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: substrateControlIntentGatewayContract.method,
      url: substrateControlIntentGatewayContract.path,
      payload: {
        request_id: 98,
        raw_rejected_value: "ssh.raw.execute TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: substrateControlIntentGatewayContract.contract_id,
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
    expect(response.body).not.toContain("ssh.raw.execute");
    expect(response.body).not.toContain("TOKEN=inline-secret");
  });

  it("maps invalid delegated BP-0096 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: substrateControlIntentGatewayContract.method,
      url: substrateControlIntentGatewayContract.path,
      payload: {
        request_id: "req_bp0098_invalid_delegated_intent",
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
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0098_invalid_delegated_intent",
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
      substrate_control_intent: null,
      raw_input_content: "withheld",
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("rm -rf");
    expect(response.body).not.toContain("deploy");
  });

  it("preserves observation intent without approvals, rollback refs, mutation, execution, or side effects", async () => {
    const response = await gateway.inject({
      method: substrateControlIntentGatewayContract.method,
      url: substrateControlIntentGatewayContract.path,
      payload: {
        request_id: "req_bp0098_observation_intent",
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
              source_ref: "ticket:BP-0098",
              summary: "route preserves observation-only service status intent",
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
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      request_id: "req_bp0098_observation_intent",
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
});
