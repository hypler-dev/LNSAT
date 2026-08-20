import {
  defaultRuntimeAdapterImplementationAuthorizationRequest,
  runtimeAdapterImplementationAuthorizationRequestContract,
  runtimeAdapterImplementationPlanContract,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest,
  runtimeAdapterImplementationAuthorizationRequestGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-09T00:00:00.000Z");

describe("@lnsat/api BP-0151 runtime adapter implementation authorization request Gateway contract", () => {
  it("returns BP-0150 source-only authorization request evidence through Gateway", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
        {
          request_id: "req_bp0151_runtime_adapter_implementation_authorization",
          authorization_request: {
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      contract_id:
        runtimeAdapterImplementationAuthorizationRequestGatewayContract.contract_id,
      request_id: "req_bp0151_runtime_adapter_implementation_authorization",
      inspected_at: "2026-05-09T00:00:00.000Z",
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

    if (!response.ok) {
      throw new Error("expected Gateway authorization request success");
    }

    expect(response.runtime_adapter_implementation_authorization_request).toMatchObject(
      {
        contract_id:
          runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
        authorization_request_version: "0.1",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
    );
    expect(response.chain_review_refs).toEqual([
      {
        chain_review_ref: "chain_review:bp0149-runtime-adapter-plan-chain-review",
        packet_ref: "packet:BP-0149",
        evidence_ref: "evidence:bp0149-runtime-adapter-plan-chain-review",
        summary: "BP-0149 reviewed BP-0144 through BP-0148 implementation plan chain",
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
    expect(response.chain_review_snapshot).toMatchObject({
      packet_ref: "packet:BP-0149",
      reviewed_source_contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      reviewed_gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      reviewed_route: "POST /v1/platform/runtime-adapter-implementation-plan/inspect",
      reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect",
      registered_read_only_tool_count: 20,
      side_effects: [],
    });
    expect(response.implementation_plan_evidence_snapshot).toMatchObject({
      contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      implementation_plan_authority: "implementation_plan_only_no_runtime_adapter",
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.implementation_authorization_request.review",
        "substrate.adapter.implementation_plan.review",
      ]),
    );
    expect(response.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(response.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "authorization request does not create runtime adapter implementation",
        "authorization request does not register dispatcher",
        "authorization request does not dispatch broker request",
        "authorization request does not invoke adapter",
        "authorization request does not execute live runtime path",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/runtime-adapter-implementation-authorization-request.ts",
        "apps/api/src/runtime-adapter-implementation-authorization-request.ts",
      ]),
    );
  });

  it("preserves explicit risk level without runtime authority", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
        {
          request_id: "req_bp0151_named_authorization_request",
          authorization_request: {
            risk_level: 4,
            side_effects: [],
          },
        },
        { now },
      );

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0151_named_authorization_request",
      risk_level: 4,
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

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
        {
          request_id: 151,
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
          code: "runtime_adapter_implementation_authorization_request_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_implementation_authorization_request_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_implementation_authorization_request_gateway.missing_authorization_request",
          path: "/authorization_request",
        },
      ],
      authorization_request_errors: [],
      runtime_adapter_implementation_authorization_request: null,
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

  it("fails closed for invalid delegated BP-0150 evidence without raw echo", async () => {
    const response =
      await inspectRuntimeAdapterImplementationAuthorizationRequestGatewayRequest(
        {
          request_id: "req_bp0151_invalid_delegated_authorization_request",
          authorization_request: {
            capability: "adapter.invoke.execute",
            implementation_authorization_request_authority:
              "runtime_adapter_implementation",
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
              ...defaultRuntimeAdapterImplementationAuthorizationRequest.denied_runtime_behavior,
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
      authorization_request_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/capability",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/implementation_authorization_request_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
          path: "/adapter_class",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.unexpected_field",
          path: "/denied_runtime_behavior",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_authorization_request.side_effects_forbidden",
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
