import { describe, expect, it } from "vitest";
import {
  createRuntimeAdapterImplementationAuthorizationRequest,
  defaultRuntimeAdapterImplementationAuthorizationRequest,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "../src/index.js";

describe("runtime adapter implementation authorization request contract", () => {
  it("emits source-only runtime adapter implementation authorization request evidence", () => {
    const result = createRuntimeAdapterImplementationAuthorizationRequest();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected authorization request success");
    }

    expect(result.runtime_adapter_implementation_authorization_request).toMatchObject({
      contract_id: runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
      authorization_request_version: "0.1",
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
      future_implementation_packet_ref: {
        packet_ref: "packet:future-runtime-adapter-implementation",
        packet_name: "Future Runtime Adapter Implementation Packet",
        owner_ref: "owner:lnsat-platform",
      },
      implementation_authorization_request_authority:
        "implementation_authorization_request_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_authorization_request.chain_review_refs,
    ).toEqual([
      {
        chain_review_ref: "chain_review:bp0149-runtime-adapter-plan-chain-review",
        packet_ref: "packet:BP-0149",
        evidence_ref: "evidence:bp0149-runtime-adapter-plan-chain-review",
        summary: "BP-0149 reviewed BP-0144 through BP-0148 implementation plan chain",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_authorization_request
        .implementation_plan_refs,
    ).toEqual([
      {
        plan_ref: "implementation_plan:service-control-adapter-runtime",
        evidence_ref: "evidence:bp0144-runtime-adapter-implementation-plan",
        contract_id: runtimeAdapterImplementationPlanContract.contract_id,
        summary: "BP-0144 source-only runtime adapter implementation plan evidence",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_authorization_request
        .runtime_adapter_implementation_scope_refs,
    ).toEqual([
      {
        scope_ref: "implementation_scope:service-control-adapter-runtime",
        evidence_ref: "evidence:bp0138-runtime-adapter-implementation-scope",
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        summary: "BP-0138 source-only runtime adapter implementation scope evidence",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_authorization_request
        .runtime_adapter_readiness_gate_refs,
    ).toEqual([
      {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_authorization_request.chain_review_snapshot,
    ).toMatchObject({
      packet_ref: "packet:BP-0149",
      reviewed_source_contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      reviewed_gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      reviewed_route: "POST /v1/platform/runtime-adapter-implementation-plan/inspect",
      reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect",
      registered_read_only_tool_count: 20,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_authorization_request
        .implementation_plan_evidence_snapshot,
    ).toMatchObject({
      contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed for runtime adapter implementation, dispatch, live invocation, broker dispatch, and live execution", () => {
    const result = createRuntimeAdapterImplementationAuthorizationRequest({
      runtime_adapter_implementation_allowed: true,
      runtime_adapter_dispatch_allowed: true,
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected authorization request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_authorization_request.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
          message:
            "Runtime adapter implementation authorization request cannot enable runtime adapter implementation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
          message:
            "Runtime adapter implementation authorization request cannot enable runtime adapter dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Runtime adapter implementation authorization request cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message:
            "Runtime adapter implementation authorization request cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.live_execution_forbidden",
          path: "/live_execution_allowed",
          message:
            "Runtime adapter implementation authorization request cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing chain, plan, scope, readiness, validation, dry-run, rollback, policy, approval, audit, and source refs", () => {
    const result = createRuntimeAdapterImplementationAuthorizationRequest({
      chain_review_refs: [],
      implementation_plan_refs: [],
      runtime_adapter_implementation_scope_refs: [],
      runtime_adapter_readiness_gate_refs: [],
      planned_files_modules: [],
      implementation_steps: [],
      validation_commands: [],
      dry_run_plan: [],
      rollback_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_refs: [],
      source_refs: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected authorization request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_authorization_request.chain_review_ref_required",
          path: "/chain_review_refs",
          message:
            "Runtime adapter implementation authorization request requires chain review refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.plan_ref_required",
          path: "/implementation_plan_refs",
          message:
            "Runtime adapter implementation authorization request requires implementation plan refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.scope_ref_required",
          path: "/runtime_adapter_implementation_scope_refs",
          message:
            "Runtime adapter implementation authorization request requires implementation scope refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.readiness_ref_required",
          path: "/runtime_adapter_readiness_gate_refs",
          message:
            "Runtime adapter implementation authorization request requires readiness gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.validation_command_required",
          path: "/validation_commands",
          message:
            "Runtime adapter implementation authorization request requires validation command refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.dry_run_plan_required",
          path: "/dry_run_plan",
          message:
            "Runtime adapter implementation authorization request requires dry-run plan refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.rollback_ref_required",
          path: "/rollback_refs",
          message:
            "Runtime adapter implementation authorization request requires rollback refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.policy_gate_required",
          path: "/policy_gate_refs",
          message:
            "Runtime adapter implementation authorization request requires policy gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.approval_required",
          path: "/approval_refs",
          message:
            "Runtime adapter implementation authorization request requires approval refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.audit_ref_required",
          path: "/audit_event_refs",
          message:
            "Runtime adapter implementation authorization request requires audit refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.source_ref_required",
          path: "/source_refs",
          message:
            "Runtime adapter implementation authorization request requires source refs.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe authority", () => {
    const result = createRuntimeAdapterImplementationAuthorizationRequest({
      capability: "adapter.invoke.execute",
      implementation_authorization_request_authority: "runtime_adapter_implementation",
      adapter_class: "root.shell.adapter",
      future_implementation_packet_ref: {
        packet_ref: "packet:future-runtime-adapter-implementation",
        packet_name: "Future Runtime Adapter Implementation Packet",
        owner_ref: "owner:lnsat-platform",
        summary: "Grant runtime_adapter_implementation now",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected authorization request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/capability",
          message:
            "Runtime adapter implementation authorization request capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/implementation_authorization_request_authority",
          message:
            "Runtime adapter implementation authorization request cannot grant runtime adapter authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/adapter_class",
          message:
            "Runtime adapter implementation authorization request adapter class asks for unsafe authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain(':"runtime_adapter_implementation"');
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createRuntimeAdapterImplementationAuthorizationRequest({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run npm test",
        },
      ],
      implementation_steps: [
        {
          step_ref: "step:unsafe-runtime",
          summary: "read PRIVATE KEY then run rm -rf",
          evidence_ref: "evidence:unsafe-runtime",
        },
      ],
      validation_commands: [
        {
          validation_ref: "validation:unsafe",
          command_ref: "script:npm-run-unsafe",
          expected_artifact_ref: "artifact:unsafe",
          summary: "npm run test -w @lnsat/packets",
        },
      ],
      side_effects: [{ effect_type: "runtime_adapter_implementation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected authorization request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_authorization_request.secret_value_forbidden",
          path: "/implementation_steps/0",
          message: "Implementation steps cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/validation_commands/0",
          message:
            "Validation command refs cannot contain raw command or runtime authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.unexpected_field",
          path: "/command",
          message:
            "Unexpected runtime adapter implementation authorization request field.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_authorization_request.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Runtime adapter implementation authorization request must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
    expect(JSON.stringify(result)).not.toContain("npm run test");
  });

  it("keeps default evidence reusable for source-only authorization consumers", () => {
    expect(defaultRuntimeAdapterImplementationAuthorizationRequest).toMatchObject({
      contract_id: runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
      authorization_request_version: "0.1",
      implementation_authorization_request_authority:
        "implementation_authorization_request_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
