import {
  defaultCapabilityBrokerRequest,
  defaultSubstrateControlIntent,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  capabilityBrokerRequestGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0104 capability broker request route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects capability broker request evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: capabilityBrokerRequestGatewayContract.method,
      url: capabilityBrokerRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0104_route_capability_broker_request",
        broker_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0104",
              summary:
                "Fastify route exposes Gateway capability broker request evidence",
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
      contract_id: capabilityBrokerRequestGatewayContract.contract_id,
      request_id: "req_bp0104_route_capability_broker_request",
      inspected_at: "2026-05-06T00:00:00.000Z",
      capability_broker_request: {
        contract_id: "lnsat.platform.capability_broker_request.v0_1",
        request_version: "0.1",
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      request_version: "0.1",
      requested_actor: {
        actor_ref: "agent:codex",
        actor_type: "agent",
        role_ref: "role:ops_assistant",
      },
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      broker_decision_posture: "classify_and_propose_only_no_dispatch",
      proposed_adapter_class: "service_control_adapter",
      proposed_adapter_authority: "proposal_only_no_dispatch",
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.substrate_control_intent_refs).toEqual([
      {
        intent_ref: "intent:bp0096-substrate-control-intent",
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 source-only substrate control intent evidence",
      },
    ]);
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
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
    expect(body.required_audit_events).toEqual(
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
    expect(body.result_expectations).toMatchObject({
      result_packet_ref: "result_packet:capability-broker-request",
      expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    });
    expect(body.rollback_expectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rollback_ref: "rollback:capability-broker-request-review",
          owner_ref: "owner:lnsat-platform",
        }),
      ]),
    );
    expect(body.blocked_broker_dispatch_actions).toEqual(
      expect.arrayContaining([
        "capability.broker.dispatch.execute",
        "substrate.adapter.invoke",
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
    expect(body.denied_broker_dispatch_behavior).toEqual(
      expect.arrayContaining([
        "broker classifies request only",
        "broker proposes adapter class only",
        "broker does not invoke substrate adapter",
      ]),
    );
    expect(body.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live broker dispatch",
        "no live execution",
        "no secret values",
      ]),
    );
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0104: Fastify route exposes Gateway capability broker request evidence",
      ]),
    );
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: capabilityBrokerRequestGatewayContract.method,
      url: capabilityBrokerRequestGatewayContract.path,
      payload: {
        request_id: 104,
        raw_rejected_value: "capability.broker.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: capabilityBrokerRequestGatewayContract.contract_id,
      request_id: null,
      request_errors: [
        {
          code: "capability_broker_request_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "capability_broker_request_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "capability_broker_request_gateway.missing_broker_request",
          path: "/broker_request",
        },
      ],
      broker_errors: [],
      capability_broker_request: null,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("capability.broker.dispatch");
    expect(response.body).not.toContain("TOKEN=inline-secret");
  });

  it("maps invalid delegated BP-0102 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: capabilityBrokerRequestGatewayContract.method,
      url: capabilityBrokerRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0104_invalid_delegated_broker_request",
        broker_request: {
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and dispatch raw command",
            },
          ],
          blocked_broker_dispatch_actions: [
            "capability.broker.dispatch.execute",
            "secret:prod-api-key",
          ],
          side_effects: [{ effect_type: "dispatch" }],
          command: "rm -rf /",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0104_invalid_delegated_broker_request",
      request_errors: [],
      broker_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "capability_broker_request.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "capability_broker_request.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "capability_broker_request.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "capability_broker_request.secret_value_forbidden",
          path: "/blocked_broker_dispatch_actions/1",
        }),
        expect.objectContaining({
          code: "capability_broker_request.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "capability_broker_request.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      capability_broker_request: null,
      raw_input_content: "withheld",
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("secret:prod-api-key");
    expect(response.body).not.toContain("rm -rf");
    expect(response.body).not.toContain("dispatch raw command");
  });

  it("preserves observation broker request without approvals, rollback refs, dispatch, execution, or side effects", async () => {
    const response = await gateway.inject({
      method: capabilityBrokerRequestGatewayContract.method,
      url: capabilityBrokerRequestGatewayContract.path,
      payload: {
        request_id: "req_bp0104_observation_broker_request",
        broker_request: {
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
              source_ref: "ticket:BP-0104",
              summary: "Route wraps observation-only broker request",
            },
          ],
          substrate_control_intent_refs: [
            {
              intent_ref: "intent:bp0096-observation",
              evidence_ref: "evidence:bp0096-observation",
              contract_id: substrateControlIntentContract.contract_id,
              summary: "source-only observation substrate control intent",
            },
          ],
          policy_gate_refs: [
            {
              gate_ref: "capability.broker.policy.review",
              decision_ref: "policy_decision:service-status-read",
              required: true,
            },
          ],
          approval_refs: [],
          audit_event_plan: defaultSubstrateControlIntent.audit_event_plan,
          result_expectations: defaultCapabilityBrokerRequest.result_expectations,
          rollback_expectations: [],
          proposed_adapter_class: "service_control_adapter",
          blocked_broker_dispatch_actions:
            defaultCapabilityBrokerRequest.blocked_broker_dispatch_actions,
          denied_broker_dispatch_behavior:
            defaultCapabilityBrokerRequest.denied_broker_dispatch_behavior,
          denied_live_behavior: ["no live broker dispatch", "no live execution"],
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      request_id: "req_bp0104_observation_broker_request",
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
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
