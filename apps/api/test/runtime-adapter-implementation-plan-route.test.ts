import {
  defaultRuntimeAdapterImplementationPlan,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  runtimeAdapterImplementationPlanGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-09T00:00:00.000Z");

describe("@lnsat/api BP-0146 runtime adapter implementation plan route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects runtime adapter implementation plan evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterImplementationPlanGatewayContract.method,
      url: runtimeAdapterImplementationPlanGatewayContract.path,
      payload: {
        request_id: "req_bp0146_route_runtime_adapter_implementation_plan",
        implementation_plan_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0146",
              summary:
                "Fastify route exposes Gateway runtime adapter implementation plan evidence",
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
      contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
      request_id: "req_bp0146_route_runtime_adapter_implementation_plan",
      inspected_at: "2026-05-09T00:00:00.000Z",
      runtime_adapter_implementation_plan: {
        contract_id: runtimeAdapterImplementationPlanContract.contract_id,
        implementation_plan_version: "0.1",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      implementation_plan_version: "0.1",
      plan_identity: {
        plan_ref: "implementation_plan:service-control-adapter-runtime",
        plan_name: "Service control runtime adapter implementation plan",
        owner_ref: "owner:lnsat-platform",
        future_packet_ref: "packet:future-runtime-adapter-implementation",
      },
      requested_actor: {
        actor_ref: "agent:codex",
        actor_type: "agent",
        role_ref: "role:ops_assistant",
      },
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      adapter_identity: {
        adapter_ref: "adapter:service-control-runtime-adapter",
        adapter_name: "Service control runtime adapter scope",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_class: "service_control_adapter",
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.runtime_adapter_implementation_scope_refs).toEqual([
      {
        scope_ref: "implementation_scope:service-control-adapter-runtime",
        evidence_ref: "evidence:bp0138-runtime-adapter-implementation-scope",
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        summary: "BP-0138 source-only runtime adapter implementation scope evidence",
      },
    ]);
    expect(body.runtime_adapter_readiness_gate_refs).toEqual([
      {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ]);
    expect(body.planned_files_modules).toEqual(
      expect.arrayContaining([
        {
          file_ref: "file:packages-runtime-adapters-service-control",
          path_ref: "src:packages/runtime-adapters/service-control",
          module_ref: "module:future-service-control-runtime-adapter",
          purpose: "Future adapter implementation module after later approved packet",
        },
      ]),
    );
    expect(body.implementation_steps).toEqual(
      expect.arrayContaining([
        {
          step_ref: "step:define-adapter-interface",
          summary: "Define future adapter interface from BP-0138 scope evidence",
          evidence_ref: "evidence:bp0144-source-only-plan-step",
        },
      ]),
    );
    expect(body.validation_commands).toEqual(
      expect.arrayContaining([
        {
          validation_ref: "validation:packets-runtime-adapter-implementation-plan",
          command_ref:
            "script:npm-workspace-packets-test-runtime-adapter-implementation-plan",
          expected_artifact_ref: "artifact:bp0144-packets-test-output",
          summary: "Run packet workspace test through named package script",
        },
      ]),
    );
    expect(body.dry_run_plan).toEqual([
      {
        dry_run_ref: "dry_run:future-runtime-adapter-plan-noop",
        expected_artifact_ref: "artifact:future-runtime-adapter-dry-run-plan",
        summary:
          "Future implementation packet must produce dry-run artifact before code path opens",
      },
    ]);
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.implementation_plan.review",
        "substrate.adapter.implementation_scope.review",
        "substrate.adapter.runtime_readiness_gate.review",
      ]),
    );
    expect(body.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(body.scope_evidence_snapshot).toMatchObject({
      contract_id: runtimeAdapterImplementationScopeContract.contract_id,
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.readiness_evidence_snapshot).toMatchObject({
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
      readiness_authority: "readiness_gate_only_no_runtime_invocation",
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "implementation plan does not create runtime adapter implementation",
        "implementation plan does not register dispatcher",
        "implementation plan does not dispatch broker request",
        "implementation plan does not invoke adapter",
        "implementation plan does not execute live runtime path",
      ]),
    );
    expect(body.source_refs).toEqual(expect.arrayContaining(["ticket:BP-0146"]));
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterImplementationPlanGatewayContract.method,
      url: runtimeAdapterImplementationPlanGatewayContract.path,
      payload: {
        request_id: 146,
        raw_rejected_value:
          "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
      request_id: null,
      request_errors: [
        {
          code: "runtime_adapter_implementation_plan_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_implementation_plan_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_implementation_plan_gateway.missing_implementation_plan_request",
          path: "/implementation_plan_request",
        },
      ],
      implementation_plan_errors: [],
      runtime_adapter_implementation_plan: null,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("runtime_adapter.implementation");
    expect(response.body).not.toContain("TOKEN=inline-secret");
  });

  it("maps invalid delegated BP-0144 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterImplementationPlanGatewayContract.method,
      url: runtimeAdapterImplementationPlanGatewayContract.path,
      payload: {
        request_id: "req_bp0146_invalid_delegated_implementation_plan",
        implementation_plan_request: {
          capability: "adapter.invoke.execute",
          implementation_plan_authority: "runtime_adapter_implementation",
          adapter_class: "root.shell.adapter",
          runtime_adapter_implementation_allowed: true,
          runtime_adapter_dispatch_allowed: true,
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary:
                "read DATABASE_URL and dispatch raw runtime adapter implementation",
            },
          ],
          denied_runtime_behavior: [
            ...defaultRuntimeAdapterImplementationPlan.denied_runtime_behavior,
            "runtime_adapter.implementation.execute",
          ],
          side_effects: [{ effect_type: "runtime_adapter_implementation" }],
          command: "rm -rf /",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0146_invalid_delegated_implementation_plan",
      request_errors: [],
      implementation_plan_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/capability",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/implementation_plan_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/adapter_class",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.unexpected_field",
          path: "/denied_runtime_behavior",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_plan.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("rm -rf");
    expect(response.body).not.toContain("dispatch raw runtime adapter");
  });
});
