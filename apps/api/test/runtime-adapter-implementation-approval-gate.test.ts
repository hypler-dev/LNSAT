import {
  defaultRuntimeAdapterImplementationApprovalGate,
  runtimeAdapterImplementationApprovalGateContract,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectRuntimeAdapterImplementationApprovalGateGatewayRequest,
  runtimeAdapterImplementationApprovalGateGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-09T00:00:00.000Z");

describe("@lnsat/api BP-0157 runtime adapter implementation approval gate Gateway contract", () => {
  it("returns BP-0156 source-only approval gate evidence through Gateway", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(
        {
          request_id: "req_bp0157_runtime_adapter_implementation_approval_gate",
          approval_gate_request: {
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      contract_id: runtimeAdapterImplementationApprovalGateGatewayContract.contract_id,
      request_id: "req_bp0157_runtime_adapter_implementation_approval_gate",
      inspected_at: "2026-05-09T00:00:00.000Z",
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

    if (!response.ok) {
      throw new Error("expected Gateway approval gate success");
    }

    expect(response.runtime_adapter_implementation_approval_gate).toMatchObject({
      contract_id: runtimeAdapterImplementationApprovalGateContract.contract_id,
      approval_gate_version: "0.1",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.chain_review_refs).toEqual([
      {
        chain_review_ref:
          "chain_review:bp0155-runtime-adapter-authorization-request-chain-review",
        packet_ref: "packet:BP-0155",
        evidence_ref:
          "evidence:bp0155-runtime-adapter-authorization-request-chain-review",
        summary: "BP-0155 reviewed BP-0150 through BP-0154 authorization request chain",
      },
    ]);
    expect(response.authorization_request_refs).toEqual([
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
    expect(response.implementation_plan_refs).toEqual([
      {
        plan_ref: "implementation_plan:service-control-adapter-runtime",
        evidence_ref: "evidence:bp0144-runtime-adapter-implementation-plan",
        contract_id: runtimeAdapterImplementationPlanContract.contract_id,
        summary: "BP-0144 source-only runtime adapter implementation plan evidence",
      },
    ]);
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
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.implementation_approval_gate.review",
        "substrate.adapter.implementation_authorization_request.review",
      ]),
    );
    expect(response.required_human_approvals).toEqual([
      "approval:human-runtime-adapter-implementation-approval-gate",
    ]);
    expect(response.required_audit_events).toEqual(
      expect.arrayContaining([
        "approval_requested",
        "tool_requested",
        "policy_checked",
        "approval_granted",
      ]),
    );
    expect(response.authorization_request_chain_review_snapshot).toMatchObject({
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
    expect(response.authorization_request_evidence_snapshot).toMatchObject({
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
    expect(response.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "approval gate does not create runtime adapter implementation",
        "approval gate does not register dispatcher",
        "approval gate does not dispatch broker request",
        "approval gate does not invoke adapter",
        "approval gate does not execute live runtime path",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-approval-gate.ts",
        "apps/api/src/runtime-adapter-implementation-approval-gate.ts",
      ]),
    );
  });

  it("preserves explicit source refs without runtime implementation authority", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(
        {
          request_id: "req_bp0157_named_approval_gate",
          approval_gate_request: {
            source_refs: [
              {
                source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
                summary:
                  "Gateway wraps explicit runtime adapter implementation approval gate evidence",
              },
            ],
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0157_named_approval_gate",
      source_refs: ["doc:docs/reference/CONTRACT_PROVENANCE.md"],
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

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(
        {
          request_id: 157,
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
          code: "runtime_adapter_implementation_approval_gate_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_implementation_approval_gate_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_implementation_approval_gate_gateway.missing_approval_gate_request",
          path: "/approval_gate_request",
        },
      ],
      approval_gate_errors: [],
      runtime_adapter_implementation_approval_gate: null,
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

  it("fails closed for invalid delegated BP-0156 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationApprovalGateGatewayRequest(
        {
          request_id: "req_bp0157_invalid_delegated_approval_gate",
          approval_gate_request: {
            implementation_approval_gate_authority: "runtime_adapter_implementation",
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
              ...defaultRuntimeAdapterImplementationApprovalGate.denied_runtime_behavior,
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
      approval_gate_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.unsafe_approval_authority",
          path: "/implementation_approval_gate_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.unexpected_field",
          path: "/denied_runtime_behavior",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_approval_gate.side_effects_forbidden",
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
