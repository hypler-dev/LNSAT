import {
  defaultRuntimeAdapterImplementationScope,
  runtimeAdapterImplementationScopeContract,
  runtimeAdapterReadinessGateContract,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  runtimeAdapterImplementationScopeGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-09T00:00:00.000Z");

describe("@lnsat/api BP-0140 runtime adapter implementation scope route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects runtime adapter implementation scope evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterImplementationScopeGatewayContract.method,
      url: runtimeAdapterImplementationScopeGatewayContract.path,
      payload: {
        request_id: "req_bp0140_route_runtime_adapter_implementation_scope",
        implementation_scope_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0140",
              summary:
                "Fastify route exposes Gateway runtime adapter implementation scope evidence",
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
      contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
      request_id: "req_bp0140_route_runtime_adapter_implementation_scope",
      inspected_at: "2026-05-09T00:00:00.000Z",
      runtime_adapter_implementation_scope: {
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        implementation_scope_version: "0.1",
        runtime_adapter_implementation_allowed: false,
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
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
    expect(body.runtime_adapter_readiness_gate_refs).toEqual([
      {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        evidence_ref: "evidence:bp0132-runtime-adapter-readiness-gate",
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary: "BP-0132 source-only runtime adapter readiness gate evidence",
      },
    ]);
    expect(body.implementation_boundaries).toEqual(
      expect.arrayContaining([
        {
          boundary_ref: "boundary:source-only-adapter-scope",
          rule: "Scope contract may describe future adapter implementation zones only",
          evidence_ref: "evidence:bp0138-no-runtime-adapter-implementation",
        },
      ]),
    );
    expect(body.allowed_source_zones).toEqual(
      expect.arrayContaining([
        {
          zone_ref: "zone:packages-runtime-adapters-future",
          path_ref: "src:packages/runtime-adapters",
          summary: "Future source zone only after a later approved packet",
        },
      ]),
    );
    expect(body.required_tests).toEqual([
      {
        test_ref: "test:runtime-adapter-implementation-scope-contract",
        evidence_ref: "evidence:bp0138-packets-tests",
        summary: "Contract validates source-only scope and fail-closed probes",
      },
    ]);
    expect(body.dry_run_expectations).toEqual([
      {
        dry_run_ref: "dry_run:future-runtime-adapter-noop",
        expected_artifact_ref: "artifact:future-adapter-dry-run-plan",
        summary: "Future packet must prove dry-run plan before adapter implementation",
      },
    ]);
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
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
        "implementation scope does not create runtime adapter implementation",
        "implementation scope does not register dispatcher",
        "implementation scope does not dispatch broker request",
        "implementation scope does not invoke adapter",
        "implementation scope does not execute live runtime path",
      ]),
    );
    expect(body.source_refs).toEqual(expect.arrayContaining(["ticket:BP-0140"]));
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterImplementationScopeGatewayContract.method,
      url: runtimeAdapterImplementationScopeGatewayContract.path,
      payload: {
        request_id: 140,
        raw_rejected_value:
          "runtime_adapter.implementation.execute TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: runtimeAdapterImplementationScopeGatewayContract.contract_id,
      request_id: null,
      request_errors: [
        {
          code: "runtime_adapter_implementation_scope_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_implementation_scope_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_implementation_scope_gateway.missing_implementation_scope_request",
          path: "/implementation_scope_request",
        },
      ],
      implementation_scope_errors: [],
      runtime_adapter_implementation_scope: null,
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

  it("maps invalid delegated BP-0138 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterImplementationScopeGatewayContract.method,
      url: runtimeAdapterImplementationScopeGatewayContract.path,
      payload: {
        request_id: "req_bp0140_invalid_delegated_implementation_scope",
        implementation_scope_request: {
          capability: "adapter.invoke.execute",
          implementation_authority: "runtime_adapter_implementation",
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
            ...defaultRuntimeAdapterImplementationScope.denied_runtime_behavior,
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
      request_id: "req_bp0140_invalid_delegated_implementation_scope",
      request_errors: [],
      implementation_scope_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
          path: "/capability",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
          path: "/implementation_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.unsafe_implementation_authority",
          path: "/adapter_class",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.runtime_adapter_implementation_forbidden",
          path: "/runtime_adapter_implementation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.unexpected_field",
          path: "/denied_runtime_behavior",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_implementation_scope.side_effects_forbidden",
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
