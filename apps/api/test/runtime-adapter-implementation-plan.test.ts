import {
  defaultRuntimeAdapterImplementationPlan,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectRuntimeAdapterImplementationPlanGatewayRequest,
  runtimeAdapterImplementationPlanGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-09T00:00:00.000Z");

describe("@lnsat/api BP-0145 runtime adapter implementation plan Gateway contract", () => {
  it("returns BP-0144 source-only implementation plan evidence through Gateway", async () => {
    const response = await inspectRuntimeAdapterImplementationPlanGatewayRequest(
      {
        request_id: "req_bp0145_runtime_adapter_implementation_plan",
        implementation_plan_request: {
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: runtimeAdapterImplementationPlanGatewayContract.contract_id,
      request_id: "req_bp0145_runtime_adapter_implementation_plan",
      inspected_at: "2026-05-09T00:00:00.000Z",
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

    if (!response.ok) {
      throw new Error("expected Gateway implementation plan success");
    }

    expect(response.runtime_adapter_implementation_plan).toMatchObject({
      contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      implementation_plan_version: "0.1",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.runtime_adapter_implementation_scope_refs).toEqual([
      {
        scope_ref: "implementation_scope:service-control-adapter-runtime",
        evidence_ref: "evidence:bp0138-runtime-adapter-implementation-scope",
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        summary: "BP-0138 source-only runtime adapter implementation scope evidence",
      },
    ]);
    expect(response.runtime_adapter_readiness_gate_refs).toEqual([
      {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ]);
    expect(response.planned_files_modules).toEqual(
      expect.arrayContaining([
        {
          file_ref: "file:packages-runtime-adapters-service-control",
          path_ref: "src:packages/runtime-adapters/service-control",
          module_ref: "module:future-service-control-runtime-adapter",
          purpose: "Future adapter implementation module after later approved packet",
        },
      ]),
    );
    expect(response.implementation_steps).toEqual(
      expect.arrayContaining([
        {
          step_ref: "step:define-adapter-interface",
          summary: "Define future adapter interface from BP-0138 scope evidence",
          evidence_ref: "evidence:bp0144-source-only-plan-step",
        },
      ]),
    );
    expect(response.validation_commands).toEqual(
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
    expect(response.dry_run_plan).toEqual([
      {
        dry_run_ref: "dry_run:future-runtime-adapter-plan-noop",
        expected_artifact_ref: "artifact:future-runtime-adapter-dry-run-plan",
        summary:
          "Future implementation packet must produce dry-run artifact before code path opens",
      },
    ]);
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.implementation_plan.review",
        "substrate.adapter.implementation_scope.review",
        "substrate.adapter.runtime_readiness_gate.review",
      ]),
    );
    expect(response.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(response.scope_evidence_snapshot).toMatchObject({
      contract_id: runtimeAdapterImplementationScopeContract.contract_id,
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.readiness_evidence_snapshot).toMatchObject({
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
      readiness_authority: "readiness_gate_only_no_runtime_invocation",
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "implementation plan does not create runtime adapter implementation",
        "implementation plan does not register dispatcher",
        "implementation plan does not dispatch broker request",
        "implementation plan does not invoke adapter",
        "implementation plan does not execute live runtime path",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-plan.ts",
        "apps/api/src/runtime-adapter-implementation-plan.ts",
      ]),
    );
  });

  it("preserves explicit plan identity without runtime implementation authority", async () => {
    const response = await inspectRuntimeAdapterImplementationPlanGatewayRequest(
      {
        request_id: "req_bp0145_named_implementation_plan",
        implementation_plan_request: {
          plan_identity: {
            plan_ref: "implementation_plan:ops-review-only-runtime-adapter",
            plan_name: "Ops review-only runtime adapter implementation plan",
            owner_ref: "owner:lnsat-platform",
            future_packet_ref: "packet:future-runtime-adapter-review-only",
          },
          source_refs: [
            {
              source_ref: "ticket:BP-0145",
              summary:
                "Gateway wraps explicit runtime adapter implementation plan evidence",
            },
          ],
          runtime_adapter_implementation_allowed: false,
          runtime_adapter_dispatch_allowed: false,
          live_adapter_invocation_allowed: false,
          live_broker_dispatch_allowed: false,
          live_execution_allowed: false,
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0145_named_implementation_plan",
      plan_identity: {
        plan_ref: "implementation_plan:ops-review-only-runtime-adapter",
        plan_name: "Ops review-only runtime adapter implementation plan",
        owner_ref: "owner:lnsat-platform",
        future_packet_ref: "packet:future-runtime-adapter-review-only",
      },
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectRuntimeAdapterImplementationPlanGatewayRequest(
      {
        request_id: 145,
        raw_rejected_value:
          "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
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
    expect(JSON.stringify(response)).not.toContain("runtime_adapter.implementation");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0144 evidence without raw echo", async () => {
    const response = await inspectRuntimeAdapterImplementationPlanGatewayRequest(
      {
        request_id: "req_bp0145_invalid_delegated_implementation_plan",
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
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
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
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("dispatch raw runtime adapter");
  });
});
