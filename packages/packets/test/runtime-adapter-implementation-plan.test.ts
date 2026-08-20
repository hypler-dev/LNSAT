import { describe, expect, it } from "vitest";
import {
  createRuntimeAdapterImplementationPlan,
  defaultRuntimeAdapterImplementationPlan,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "../src/index.js";

describe("runtime adapter implementation plan contract", () => {
  it("emits source-only runtime adapter implementation plan evidence", () => {
    const result = createRuntimeAdapterImplementationPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected runtime adapter implementation plan success");
    }

    expect(result.runtime_adapter_implementation_plan).toMatchObject({
      contract_id: runtimeAdapterImplementationPlanContract.contract_id,
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
    expect(
      result.runtime_adapter_implementation_plan
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
      result.runtime_adapter_implementation_plan.runtime_adapter_readiness_gate_refs,
    ).toEqual([
      {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ]);
    expect(result.runtime_adapter_implementation_plan.planned_files_modules).toEqual(
      expect.arrayContaining([
        {
          file_ref: "file:packages-runtime-adapters-service-control",
          path_ref: "src:packages/runtime-adapters/service-control",
          module_ref: "module:future-service-control-runtime-adapter",
          purpose: "Future adapter implementation module after later approved packet",
        },
      ]),
    );
    expect(result.runtime_adapter_implementation_plan.implementation_steps).toEqual(
      expect.arrayContaining([
        {
          step_ref: "step:define-adapter-interface",
          summary: "Define future adapter interface from BP-0138 scope evidence",
          evidence_ref: "evidence:bp0144-source-only-plan-step",
        },
      ]),
    );
    expect(result.runtime_adapter_implementation_plan.validation_commands).toEqual(
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
    expect(result.runtime_adapter_implementation_plan.dry_run_plan).toEqual([
      {
        dry_run_ref: "dry_run:future-runtime-adapter-plan-noop",
        expected_artifact_ref: "artifact:future-runtime-adapter-dry-run-plan",
        summary:
          "Future implementation packet must produce dry-run artifact before code path opens",
      },
    ]);
    expect(result.runtime_adapter_implementation_plan.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.implementation_plan.review",
        "substrate.adapter.implementation_scope.review",
        "substrate.adapter.runtime_readiness_gate.review",
      ]),
    );
    expect(result.runtime_adapter_implementation_plan.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.runtime_adapter_implementation_plan.required_audit_events).toEqual(
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
    expect(
      result.runtime_adapter_implementation_plan.scope_evidence_snapshot,
    ).toMatchObject({
      contract_id: runtimeAdapterImplementationScopeContract.contract_id,
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_plan.readiness_evidence_snapshot,
    ).toMatchObject({
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
      readiness_authority: "readiness_gate_only_no_runtime_invocation",
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed for runtime adapter implementation, dispatch, live invocation, broker dispatch, and live execution", () => {
    const result = createRuntimeAdapterImplementationPlan({
      runtime_adapter_implementation_allowed: true,
      runtime_adapter_dispatch_allowed: true,
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter implementation plan failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_plan.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
          message:
            "Runtime adapter implementation plan cannot enable runtime adapter implementation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
          message:
            "Runtime adapter implementation plan cannot enable runtime adapter dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Runtime adapter implementation plan cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message:
            "Runtime adapter implementation plan cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Runtime adapter implementation plan cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs, steps, validation, dry-run, rollback, policy, approval, audit, and source refs", () => {
    const result = createRuntimeAdapterImplementationPlan({
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
      throw new Error("expected runtime adapter implementation plan failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_plan.scope_ref_required",
          path: "/runtime_adapter_implementation_scope_refs",
          message:
            "Runtime adapter implementation plan requires implementation scope refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.readiness_ref_required",
          path: "/runtime_adapter_readiness_gate_refs",
          message: "Runtime adapter implementation plan requires readiness gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.planned_file_required",
          path: "/planned_files_modules",
          message:
            "Runtime adapter implementation plan requires planned files/modules.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.implementation_step_required",
          path: "/implementation_steps",
          message: "Runtime adapter implementation plan requires implementation steps.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.validation_command_required",
          path: "/validation_commands",
          message:
            "Runtime adapter implementation plan requires validation command refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.dry_run_plan_required",
          path: "/dry_run_plan",
          message: "Runtime adapter implementation plan requires dry-run plan refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.rollback_ref_required",
          path: "/rollback_refs",
          message: "Runtime adapter implementation plan requires rollback refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Runtime adapter implementation plan requires policy gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.approval_required",
          path: "/approval_refs",
          message: "Runtime adapter implementation plan requires approval refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.audit_ref_required",
          path: "/audit_event_refs",
          message: "Runtime adapter implementation plan requires audit refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.source_ref_required",
          path: "/source_refs",
          message: "Runtime adapter implementation plan requires source refs.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe authority", () => {
    const result = createRuntimeAdapterImplementationPlan({
      capability: "adapter.invoke.execute",
      implementation_plan_authority: "runtime_adapter_implementation",
      adapter_class: "root.shell.adapter",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter implementation plan failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/capability",
          message:
            "Runtime adapter implementation plan capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/implementation_plan_authority",
          message:
            "Runtime adapter implementation plan cannot grant runtime adapter authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/adapter_class",
          message:
            "Runtime adapter implementation plan adapter class asks for unsafe authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain(':"runtime_adapter_implementation"');
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createRuntimeAdapterImplementationPlan({
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
      throw new Error("expected runtime adapter implementation plan failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_plan.secret_value_forbidden",
          path: "/implementation_steps/0",
          message: "Implementation steps cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.unsafe_implementation_authority",
          path: "/validation_commands/0",
          message:
            "Validation command refs cannot contain raw command or runtime authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.unexpected_field",
          path: "/command",
          message: "Unexpected runtime adapter implementation plan field.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_plan.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Runtime adapter implementation plan must preserve side_effects: [].",
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

  it("keeps default evidence reusable for source-only plan consumers", () => {
    expect(defaultRuntimeAdapterImplementationPlan).toMatchObject({
      contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      implementation_plan_version: "0.1",
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
