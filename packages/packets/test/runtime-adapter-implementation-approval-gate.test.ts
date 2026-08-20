import { describe, expect, it } from "vitest";
import {
  createRuntimeAdapterImplementationApprovalGate,
  defaultRuntimeAdapterImplementationApprovalGate,
  runtimeAdapterImplementationApprovalGateContract,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "../src/index.js";

describe("runtime adapter implementation approval gate contract", () => {
  it("emits source-only runtime adapter implementation approval gate evidence", () => {
    const result = createRuntimeAdapterImplementationApprovalGate();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected approval gate success");
    }

    expect(result.runtime_adapter_implementation_approval_gate).toMatchObject({
      contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
      approval_gate_version: "0.1",
      future_implementation_packet_ref: {
        packet_ref: "packet:future-runtime-adapter-implementation",
        packet_name: "Future Runtime Adapter Implementation Packet",
        owner_ref: "owner:lnsat-platform",
      },
      implementation_approval_gate_authority:
        "implementation_approval_gate_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_approval_gate.chain_review_refs,
    ).toEqual([
      {
        chain_review_ref:
          "chain_review:bp0155-runtime-adapter-authorization-request-chain-review",
        packet_ref: "packet:BP-0155",
        evidence_ref:
          "evidence:bp0155-runtime-adapter-authorization-request-chain-review",
        summary: "BP-0155 reviewed BP-0150 through BP-0154 authorization request chain",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_approval_gate.authorization_request_refs,
    ).toEqual([
      {
        authorization_request_ref:
          "authorization_request:bp0150-runtime-adapter-implementation-authorization-request",
        evidence_ref:
          "evidence:bp0150-runtime-adapter-implementation-authorization-request",
        contract_id:
          runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
        summary: "BP-0150 source-only runtime adapter implementation request",
      },
    ]);
    expect(
      result.runtime_adapter_implementation_approval_gate.implementation_plan_refs[0]
        ?.contract_id,
    ).toBe(runtimeAdapterImplementationPlanContract.contract_id);
    expect(
      result.runtime_adapter_implementation_approval_gate
        .runtime_adapter_implementation_scope_refs[0]?.contract_id,
    ).toBe(runtimeAdapterImplementationScopeContract.contract_id);
    expect(
      result.runtime_adapter_implementation_approval_gate
        .runtime_adapter_readiness_gate_refs[0]?.contract_id,
    ).toBe(runtimeAdapterReadinessGateContract.contract_id);
    expect(
      result.runtime_adapter_implementation_approval_gate.required_policy_gates,
    ).toContain("substrate.adapter.implementation_approval_gate.review");
    expect(
      result.runtime_adapter_implementation_approval_gate.required_human_approvals,
    ).toEqual(["approval:human-runtime-adapter-implementation-approval-gate"]);
    expect(
      result.runtime_adapter_implementation_approval_gate
        .authorization_request_chain_review_snapshot,
    ).toMatchObject({
      packet_ref: "packet:BP-0155",
      reviewed_source_contract_id:
        runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
      reviewed_gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_authorization_request.v0_1",
      reviewed_route:
        "POST /v1/platform/runtime-adapter-implementation-authorization-request/inspect",
      reviewed_mcp_tool:
        "lnsat.platform.runtime_adapter_implementation_authorization_request.inspect",
      registered_read_only_tool_count: 21,
      side_effects: [],
    });
    expect(
      result.runtime_adapter_implementation_approval_gate
        .authorization_request_evidence_snapshot,
    ).toMatchObject({
      contract_id: runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
      implementation_authorization_request_authority:
        "implementation_authorization_request_only_no_runtime_adapter",
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
    const result = createRuntimeAdapterImplementationApprovalGate({
      runtime_adapter_implementation_allowed: true,
      runtime_adapter_dispatch_allowed: true,
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected approval gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_approval_gate.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
          message:
            "Runtime adapter implementation approval gate cannot enable runtime adapter implementation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
          message:
            "Runtime adapter implementation approval gate cannot enable runtime adapter dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Runtime adapter implementation approval gate cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message:
            "Runtime adapter implementation approval gate cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
          message:
            "Runtime adapter implementation approval gate cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing review, request, policy, human approval, audit, rollback, and source refs", () => {
    const result = createRuntimeAdapterImplementationApprovalGate({
      chain_review_refs: [],
      authorization_request_refs: [],
      implementation_plan_refs: [],
      runtime_adapter_implementation_scope_refs: [],
      runtime_adapter_readiness_gate_refs: [],
      policy_gate_refs: [],
      human_approval_refs: [],
      audit_event_refs: [],
      rollback_refs: [],
      source_refs: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected approval gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_approval_gate.chain_review_ref_required",
          path: "/chain_review_refs",
          message:
            "Runtime adapter implementation approval gate requires BP-0155 chain review refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.authorization_request_ref_required",
          path: "/authorization_request_refs",
          message:
            "Runtime adapter implementation approval gate requires BP-0150 authorization request refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.plan_ref_required",
          path: "/implementation_plan_refs",
          message:
            "Runtime adapter implementation approval gate requires implementation plan refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.scope_ref_required",
          path: "/runtime_adapter_implementation_scope_refs",
          message:
            "Runtime adapter implementation approval gate requires implementation scope refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.readiness_ref_required",
          path: "/runtime_adapter_readiness_gate_refs",
          message:
            "Runtime adapter implementation approval gate requires readiness gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.policy_gate_required",
          path: "/policy_gate_refs",
          message:
            "Runtime adapter implementation approval gate requires policy gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.human_approval_required",
          path: "/human_approval_refs",
          message:
            "Runtime adapter implementation approval gate requires human approval refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.audit_ref_required",
          path: "/audit_event_refs",
          message: "Runtime adapter implementation approval gate requires audit refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.rollback_ref_required",
          path: "/rollback_refs",
          message:
            "Runtime adapter implementation approval gate requires rollback refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.source_ref_required",
          path: "/source_refs",
          message: "Runtime adapter implementation approval gate requires source refs.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe approval authority and non-human approval refs", () => {
    const result = createRuntimeAdapterImplementationApprovalGate({
      implementation_approval_gate_authority: "runtime_adapter_implementation",
      human_approval_refs: [
        {
          approval_ref: "approval:policy-only",
          approval_type: "policy",
          required: true,
        },
      ],
      future_implementation_packet_ref: {
        packet_ref: "packet:future-runtime-adapter-implementation",
        packet_name: "Future Runtime Adapter Implementation Packet",
        owner_ref: "owner:lnsat-platform",
        summary: "Grant runtime_adapter_implementation now",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected approval gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
          path: "/implementation_approval_gate_authority",
          message:
            "Runtime adapter implementation approval gate cannot grant runtime adapter authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.invalid_human_approval_ref",
          path: "/human_approval_refs/0",
          message:
            "Human approval ref requires safe approval_ref, approval_type human, and required true.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
          path: "/future_implementation_packet_ref",
          message: "Future packet ref cannot grant runtime authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain(':"runtime_adapter_implementation"');
    expect(JSON.stringify(result)).not.toContain(
      "Grant runtime_adapter_implementation now",
    );
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createRuntimeAdapterImplementationApprovalGate({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run npm test",
        },
      ],
      audit_event_refs: [
        {
          audit_ref: "audit:unsafe",
          event_type: "approval_requested",
          evidence_ref: "evidence:unsafe",
          summary: "run npm test before approval",
        },
      ],
      side_effects: [{ effect_type: "runtime_adapter_implementation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected approval gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_implementation_approval_gate.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
          path: "/audit_event_refs/0",
          message: "Audit refs cannot contain raw command authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.unexpected_field",
          path: "/command",
          message: "Unexpected runtime adapter implementation approval gate field.",
          severity: "error",
        },
        {
          code: "runtime_adapter_implementation_approval_gate.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Runtime adapter implementation approval gate must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
    expect(JSON.stringify(result)).not.toContain("npm test");
  });

  it("keeps default evidence reusable for source-only approval consumers", () => {
    expect(defaultRuntimeAdapterImplementationApprovalGate).toMatchObject({
      contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
      approval_gate_version: "0.1",
      implementation_approval_gate_authority:
        "implementation_approval_gate_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
