import { describe, expect, it } from "vitest";
import {
  createRuntimeAdapterImplementationScope,
  defaultRuntimeAdapterImplementationScope,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "../src/index.js";

describe("runtime adapter implementation scope contract", () => {
  it("emits source-only runtime adapter implementation scope evidence", () => {
    const result = createRuntimeAdapterImplementationScope();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected runtime adapter implementation scope success");
    }

    expect(result.runtime_adapter_implementation_scope).toMatchObject({
      contract_id: runtimeAdapterImplementationScopeContract.contract_id,
      implementation_scope_version: "0.1",
      scope_identity: {
        scope_ref: "implementation_scope:service-control-adapter-runtime",
        scope_name: "Service control runtime adapter implementation scope",
        owner_ref: "owner:lnsat-platform",
        future_packet_ref: "packet:BP-0139-runtime-adapter-implementation",
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
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_scope.runtime_adapter_readiness_gate_refs,
    ).toEqual([
      {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_scope.implementation_boundaries,
    ).toEqual(
      expect.arrayContaining([
        {
          boundary_ref: "boundary:source-only-adapter-scope",
          rule: "Scope contract may describe future adapter implementation zones only",
          evidence_ref: "evidence:bp0138-no-runtime-adapter-implementation",
        },
      ]),
    );
    expect(result.runtime_adapter_implementation_scope.allowed_source_zones).toEqual(
      expect.arrayContaining([
        {
          zone_ref: "zone:packages-runtime-adapters-future",
          path_ref: "src:packages/runtime-adapters",
          summary: "Future source zone only after a later approved packet",
        },
      ]),
    );
    expect(result.runtime_adapter_implementation_scope.required_tests).toEqual([
      {
        test_ref: "test:runtime-adapter-implementation-scope-contract",
        evidence_ref: "evidence:bp0138-packets-tests",
        summary: "Contract validates source-only scope and fail-closed probes",
      },
    ]);
    expect(result.runtime_adapter_implementation_scope.dry_run_expectations).toEqual([
      {
        dry_run_ref: "dry_run:future-runtime-adapter-noop",
        expected_artifact_ref: "artifact:future-adapter-dry-run-plan",
        summary: "Future packet must prove dry-run plan before adapter implementation",
      },
    ]);
    expect(result.runtime_adapter_implementation_scope.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.implementation_scope.review",
        "substrate.adapter.runtime_readiness_gate.review",
      ]),
    );
    expect(result.runtime_adapter_implementation_scope.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.runtime_adapter_implementation_scope.required_audit_events).toEqual(
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
      result.runtime_adapter_implementation_scope.readiness_evidence_snapshot,
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
    const result = createRuntimeAdapterImplementationScope({
      runtime_adapter_implementation_allowed: true,
      runtime_adapter_dispatch_allowed: true,
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter implementation scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_scope.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
          message:
            "Runtime adapter implementation scope cannot enable runtime adapter implementation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
          message:
            "Runtime adapter implementation scope cannot enable runtime adapter dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Runtime adapter implementation scope cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message:
            "Runtime adapter implementation scope cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Runtime adapter implementation scope cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs, boundaries, tests, dry-run, rollback, policy, approval, audit, and source refs", () => {
    const result = createRuntimeAdapterImplementationScope({
      runtime_adapter_readiness_gate_refs: [],
      implementation_boundaries: [],
      allowed_source_zones: [],
      required_tests: [],
      dry_run_expectations: [],
      rollback_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_refs: [],
      source_refs: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter implementation scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_scope.readiness_ref_required",
          path: "/runtime_adapter_readiness_gate_refs",
          message: "Runtime adapter implementation scope requires readiness gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.implementation_boundary_required",
          path: "/implementation_boundaries",
          message:
            "Runtime adapter implementation scope requires implementation boundaries.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.allowed_source_zone_required",
          path: "/allowed_source_zones",
          message:
            "Runtime adapter implementation scope requires allowed source zones.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.required_test_required",
          path: "/required_tests",
          message: "Runtime adapter implementation scope requires test refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.dry_run_expectation_required",
          path: "/dry_run_expectations",
          message:
            "Runtime adapter implementation scope requires dry-run expectations.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.rollback_ref_required",
          path: "/rollback_refs",
          message: "Runtime adapter implementation scope requires rollback refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Runtime adapter implementation scope requires policy gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.approval_required",
          path: "/approval_refs",
          message: "Runtime adapter implementation scope requires approval refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.audit_ref_required",
          path: "/audit_event_refs",
          message: "Runtime adapter implementation scope requires audit refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.source_ref_required",
          path: "/source_refs",
          message: "Runtime adapter implementation scope requires source refs.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe authority", () => {
    const result = createRuntimeAdapterImplementationScope({
      capability: "adapter.invoke.execute",
      implementation_authority: "runtime_adapter_implementation",
      adapter_class: "root.shell.adapter",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter implementation scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
          path: "/capability",
          message:
            "Runtime adapter implementation scope capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
          path: "/implementation_authority",
          message:
            "Runtime adapter implementation scope cannot grant runtime adapter authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
          path: "/adapter_class",
          message:
            "Runtime adapter implementation scope adapter class asks for unsafe authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain(':"runtime_adapter_implementation"');
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createRuntimeAdapterImplementationScope({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      implementation_boundaries: [
        {
          boundary_ref: "boundary:unsafe-runtime",
          rule: "read PRIVATE KEY then run raw command",
          evidence_ref: "evidence:unsafe-runtime",
        },
      ],
      side_effects: [{ effect_type: "runtime_adapter_implementation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter implementation scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_scope.secret_value_forbidden",
          path: "/implementation_boundaries/0",
          message: "Implementation boundaries cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.unexpected_field",
          path: "/command",
          message: "Unexpected runtime adapter implementation scope field.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_scope.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Runtime adapter implementation scope must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });

  it("keeps default evidence reusable for source-only contract consumers", () => {
    expect(defaultRuntimeAdapterImplementationScope).toMatchObject({
      contract_id: runtimeAdapterImplementationScopeContract.contract_id,
      implementation_scope_version: "0.1",
      implementation_authority: "implementation_scope_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
