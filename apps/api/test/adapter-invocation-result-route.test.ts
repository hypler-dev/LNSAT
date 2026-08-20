import {
  adapterInvocationPreflightContract,
  adapterInvocationResultContract,
  defaultAdapterInvocationResult,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  adapterInvocationResultGatewayContract,
  buildApiGateway,
} from "../src/index.js";

const now = new Date("2026-05-08T00:00:00.000Z");

describe("@lnsat/api BP-0122 adapter invocation result route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects adapter invocation result evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: adapterInvocationResultGatewayContract.method,
      url: adapterInvocationResultGatewayContract.path,
      payload: {
        request_id: "req_bp0122_route_adapter_invocation_result",
        result_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0122",
              summary:
                "Fastify route exposes Gateway adapter invocation result evidence",
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
      contract_id: adapterInvocationResultGatewayContract.contract_id,
      request_id: "req_bp0122_route_adapter_invocation_result",
      inspected_at: "2026-05-08T00:00:00.000Z",
      adapter_invocation_result: {
        contract_id: adapterInvocationResultContract.contract_id,
        result_version: "0.1",
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      result_version: "0.1",
      result_identity: {
        result_ref: "result:service-control-adapter-invocation",
        result_name: "Service control adapter invocation result evidence",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_identity: {
        adapter_ref: "adapter:service-control-manifest",
        adapter_name: "Service control proposal adapter manifest",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_class: "service_control_adapter",
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      observed_status: "completed",
      result_authority: "result_evidence_only_no_execution",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.adapter_invocation_preflight_refs).toEqual([
      {
        preflight_ref: "preflight:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
        contract_id: adapterInvocationPreflightContract.contract_id,
        summary: "BP-0114 source-only adapter invocation preflight evidence",
      },
    ]);
    expect(body.expected_result_refs).toEqual([
      {
        result_ref: "result_packet:adapter-invocation-preflight",
        evidence_ref: "evidence:bp0114-result-expectations",
        summary: "BP-0114 expected result evidence before any runtime adapter exists",
      },
    ]);
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.invocation.result.review",
        "substrate.adapter.invocation.preflight.review",
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
    expect(body.output_evidence_refs).toEqual([
      {
        evidence_ref: "evidence:operator-visible-adapter-result-output",
        summary: "source-only output evidence ref, no live adapter output included",
      },
    ]);
    expect(body.error_evidence_refs).toEqual([
      {
        evidence_ref: "evidence:operator-visible-adapter-result-error-state",
        summary: "source-only error evidence ref, no raw runtime error included",
      },
    ]);
    expect(body.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "result evidence does not invoke adapter",
      ]),
    );
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0122: Fastify route exposes Gateway adapter invocation result evidence",
      ]),
    );
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: adapterInvocationResultGatewayContract.method,
      url: adapterInvocationResultGatewayContract.path,
      payload: {
        request_id: 122,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: adapterInvocationResultGatewayContract.contract_id,
      request_id: null,
      request_errors: [
        {
          code: "adapter_invocation_result_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "adapter_invocation_result_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "adapter_invocation_result_gateway.missing_result_request",
          path: "/result_request",
        },
      ],
      result_errors: [],
      adapter_invocation_result: null,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("substrate.adapter.invoke");
    expect(response.body).not.toContain("TOKEN=inline-secret");
  });

  it("maps invalid delegated BP-0120 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: adapterInvocationResultGatewayContract.method,
      url: adapterInvocationResultGatewayContract.path,
      payload: {
        request_id: "req_bp0122_invalid_delegated_result",
        result_request: {
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          output_evidence_refs: [
            {
              evidence_ref: "evidence:secret:prod-api-key",
              summary: "source output with TOKEN",
            },
          ],
          error_evidence_refs: [
            {
              evidence_ref: "evidence:runtime-error",
              summary: "show PASSWORD and PRIVATE KEY",
            },
          ],
          denied_live_behavior: [
            ...defaultAdapterInvocationResult.denied_live_behavior,
            "adapter.invoke.execute",
          ],
          side_effects: [{ effect_type: "adapter_invocation" }],
          command: "rm -rf /",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0122_invalid_delegated_result",
      request_errors: [],
      result_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "adapter_invocation_result.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.secret_value_forbidden",
          path: "/output_evidence_refs/0",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.secret_value_forbidden",
          path: "/error_evidence_refs/0",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "adapter_invocation_result.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      adapter_invocation_result: null,
      raw_input_content: "withheld",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("secret:prod-api-key");
    expect(response.body).not.toContain("rm -rf");
    expect(response.body).not.toContain("invoke raw adapter command");
  });

  it("preserves observation-only result evidence without approvals, rollback refs, invocation, dispatch, execution, or side effects", async () => {
    const response = await gateway.inject({
      method: adapterInvocationResultGatewayContract.method,
      url: adapterInvocationResultGatewayContract.path,
      payload: {
        request_id: "req_bp0122_observation_result",
        result_request: {
          result_identity: {
            result_ref: "result:service-observation",
            result_name: "Service observation result evidence",
            owner_ref: "owner:lnsat-platform",
          },
          adapter_class: "no_adapter_dispatch",
          capability: "service.status.read",
          risk_level: 0,
          requested_control_mode: "observation",
          expected_result_refs: [
            {
              result_ref: "result_packet:service-observation",
              evidence_ref: "evidence:service-observation-expectation",
              summary: "source-only observation result expectation",
            },
          ],
          rollback_refs: [],
          policy_gate_refs: [
            {
              gate_ref: "substrate.adapter.invocation.result.review",
              decision_ref: "policy_decision:service-observation-result",
              required: true,
            },
          ],
          approval_refs: [],
          output_evidence_refs: [
            {
              evidence_ref: "evidence:service-observation-output",
              summary: "source-only service observation output evidence",
            },
          ],
          error_evidence_refs: [],
          source_refs: [
            {
              source_ref: "ticket:BP-0122",
              summary: "Route wraps observation-only adapter invocation result",
            },
          ],
          denied_live_behavior: ["no live adapter invocation", "no live execution"],
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      request_id: "req_bp0122_observation_result",
      result_identity: {
        result_ref: "result:service-observation",
        result_name: "Service observation result evidence",
        owner_ref: "owner:lnsat-platform",
      },
      capability: "service.status.read",
      risk_level: 0,
      requested_control_mode: "observation",
      required_approvals: [],
      rollback_refs: [],
      result_authority: "result_evidence_only_no_execution",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
