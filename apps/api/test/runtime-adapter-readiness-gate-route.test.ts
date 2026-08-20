import {
  adapterInvocationAuthorizationBundleContract,
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  defaultRuntimeAdapterReadinessGate,
  runtimeAdapterReadinessGateContract,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  runtimeAdapterReadinessGateGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-08T00:00:00.000Z");

describe("@lnsat/api BP-0134 runtime adapter readiness gate route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects runtime adapter readiness gate evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterReadinessGateGatewayContract.method,
      url: runtimeAdapterReadinessGateGatewayContract.path,
      payload: {
        request_id: "req_bp0134_route_runtime_adapter_readiness_gate",
        readiness_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0134",
              summary:
                "Fastify route exposes Gateway runtime adapter readiness gate evidence",
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
      contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
      request_id: "req_bp0134_route_runtime_adapter_readiness_gate",
      inspected_at: "2026-05-08T00:00:00.000Z",
      runtime_adapter_readiness_gate: {
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        readiness_version: "0.1",
        runtime_adapter_dispatch_allowed: false,
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
      readiness_version: "0.1",
      readiness_identity: {
        readiness_ref: "readiness_gate:service-control-adapter-runtime-readiness",
        readiness_name: "Service control runtime adapter readiness gate",
        owner_ref: "owner:lnsat-platform",
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
      readiness_authority: "readiness_gate_only_no_runtime_invocation",
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(body.substrate_control_intent_refs).toEqual([
      {
        intent_ref: "intent:bp0096-substrate-control-intent",
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 source-only substrate control intent evidence",
      },
    ]);
    expect(body.capability_broker_request_refs).toEqual([
      {
        request_ref: "request:bp0102-capability-broker-request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(body.substrate_adapter_manifest_refs).toEqual([
      {
        manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
        evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
        contract_id: substrateAdapterManifestContract.contract_id,
        summary: "BP-0108 source-only substrate adapter manifest evidence",
      },
    ]);
    expect(body.adapter_invocation_preflight_refs).toEqual([
      {
        preflight_ref: "preflight:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
        contract_id: adapterInvocationPreflightContract.contract_id,
        summary: "BP-0114 source-only adapter invocation preflight evidence",
      },
    ]);
    expect(body.adapter_invocation_authorization_bundle_refs).toEqual([
      {
        bundle_ref: "authorization_bundle:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0126-adapter-invocation-authorization-bundle",
        contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
        summary: "BP-0126 source-only adapter invocation authorization bundle evidence",
      },
    ]);
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.runtime_readiness_gate.review",
        "substrate.adapter.invocation.result.review",
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
    expect(body.cross_ref_consistency).toEqual({
      actor_ref: "agent:codex",
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      evidence_refs: [
        "evidence:bp0096-source-only-substrate-control-intent",
        "evidence:bp0102-capability-broker-request",
        "evidence:bp0108-substrate-adapter-manifest",
        "evidence:bp0114-adapter-invocation-preflight",
        "evidence:bp0120-adapter-invocation-result",
        "evidence:bp0126-adapter-invocation-authorization-bundle",
      ],
    });
    expect(body.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "readiness gate does not invoke adapter",
        "readiness gate does not dispatch broker request",
      ]),
    );
    expect(body.source_refs).toEqual(expect.arrayContaining(["ticket:BP-0134"]));
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterReadinessGateGatewayContract.method,
      url: runtimeAdapterReadinessGateGatewayContract.path,
      payload: {
        request_id: 134,
        raw_rejected_value: "runtime_adapter.dispatch.execute TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: runtimeAdapterReadinessGateGatewayContract.contract_id,
      request_id: null,
      request_errors: [
        {
          code: "runtime_adapter_readiness_gate_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "runtime_adapter_readiness_gate_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "runtime_adapter_readiness_gate_gateway.missing_readiness_request",
          path: "/readiness_request",
        },
      ],
      readiness_errors: [],
      runtime_adapter_readiness_gate: null,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("runtime_adapter.dispatch");
    expect(response.body).not.toContain("TOKEN=inline-secret");
  });

  it("maps invalid delegated BP-0132 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: runtimeAdapterReadinessGateGatewayContract.method,
      url: runtimeAdapterReadinessGateGatewayContract.path,
      payload: {
        request_id: "req_bp0134_invalid_delegated_readiness_gate",
        readiness_request: {
          runtime_adapter_dispatch_allowed: true,
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          readiness_authority: "readiness_grants_execution",
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and dispatch raw runtime adapter command",
            },
          ],
          denied_live_behavior: [
            ...defaultRuntimeAdapterReadinessGate.denied_live_behavior,
            "runtime_adapter.dispatch.execute",
          ],
          side_effects: [{ effect_type: "runtime_adapter_dispatch" }],
          command: "rm -rf /",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0134_invalid_delegated_readiness_gate",
      request_errors: [],
      readiness_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path: "/readiness_authority",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "runtime_adapter_readiness_gate.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
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
