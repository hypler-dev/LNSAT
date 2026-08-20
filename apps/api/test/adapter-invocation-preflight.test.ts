import {
  capabilityBrokerRequestContract,
  defaultAdapterInvocationPreflight,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  adapterInvocationPreflightGatewayContract,
  inspectAdapterInvocationPreflightGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-07T00:00:00.000Z");

describe("@lnsat/api BP-0115 adapter invocation preflight Gateway contract", () => {
  it("returns BP-0114 source-only adapter invocation preflight evidence through Gateway", async () => {
    const response = await inspectAdapterInvocationPreflightGatewayRequest(
      {
        request_id: "req_bp0115_adapter_invocation_preflight",
        preflight_request: {
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: adapterInvocationPreflightGatewayContract.contract_id,
      request_id: "req_bp0115_adapter_invocation_preflight",
      inspected_at: "2026-05-07T00:00:00.000Z",
      preflight_version: "0.1",
      preflight_identity: {
        preflight_ref: "preflight:service-control-adapter-invocation",
        preflight_name: "Service control adapter invocation preflight",
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
      adapter_class: "service_control_adapter",
      adapter_authority: "preflight_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected Gateway adapter invocation preflight success");
    }

    expect(response.adapter_invocation_preflight).toMatchObject({
      contract_id: "lnsat.platform.adapter_invocation_preflight.v0_1",
      preflight_version: "0.1",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.substrate_control_intent_refs).toEqual([
      {
        intent_ref: "intent:bp0096-substrate-control-intent",
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 source-only substrate control intent evidence",
      },
    ]);
    expect(response.capability_broker_request_refs).toEqual([
      {
        request_ref: "request:bp0102-capability-broker-request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(response.substrate_adapter_manifest_refs).toEqual([
      {
        manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
        evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
        contract_id: substrateAdapterManifestContract.contract_id,
        summary: "BP-0108 source-only substrate adapter manifest evidence",
      },
    ]);
    expect(response.required_input_evidence_refs).toEqual([
      {
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 substrate control intent evidence required before preflight",
      },
      {
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 broker request evidence required before preflight",
      },
      {
        evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
        contract_id: substrateAdapterManifestContract.contract_id,
        summary: "BP-0108 adapter manifest evidence required before preflight",
      },
    ]);
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
        "substrate.adapter.invocation.preflight.review",
        "substrate.adapter.manifest.review",
      ]),
    );
    expect(response.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(response.required_audit_events).toEqual(
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
    expect(response.denied_adapter_behavior).toEqual(
      expect.arrayContaining([
        "preflight classifies adapter invocation only",
        "preflight does not instantiate adapter",
        "preflight does not invoke substrate control",
      ]),
    );
    expect(response.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live broker dispatch",
        "no live adapter invocation",
        "no live execution",
      ]),
    );
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0114: source-only adapter invocation preflight contract",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/adapter-invocation-preflight.ts",
        "apps/api/src/adapter-invocation-preflight.ts",
      ]),
    );
  });

  it("preserves an explicit observation preflight without approvals or rollback refs", async () => {
    const response = await inspectAdapterInvocationPreflightGatewayRequest(
      {
        request_id: "req_bp0115_observation_preflight",
        preflight_request: {
          preflight_identity: {
            preflight_ref: "preflight:service-observation",
            preflight_name: "Service observation preflight",
            owner_ref: "owner:lnsat-platform",
          },
          requested_actor: {
            actor_ref: "human:jeff",
            actor_type: "human",
            role_ref: "role:owner",
          },
          capability: "service.status.read",
          risk_level: 0,
          target_substrate_kind: "services",
          requested_control_mode: "observation",
          adapter_class: "no_adapter_dispatch",
          policy_gate_refs: [
            {
              gate_ref: "substrate.adapter.invocation.preflight.review",
              decision_ref: "policy_decision:service-observation-preflight",
              required: true,
            },
          ],
          approval_refs: [],
          rollback_expectations: [],
          denied_adapter_behavior: ["preflight classifies adapter invocation only"],
          denied_live_behavior: ["no live adapter invocation", "no live execution"],
          source_refs: [
            {
              source_ref: "ticket:BP-0115",
              summary: "Gateway wraps observation-only adapter invocation preflight",
            },
          ],
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
      request_id: "req_bp0115_observation_preflight",
      preflight_identity: {
        preflight_ref: "preflight:service-observation",
        preflight_name: "Service observation preflight",
        owner_ref: "owner:lnsat-platform",
      },
      requested_actor: {
        actor_ref: "human:jeff",
        actor_type: "human",
        role_ref: "role:owner",
      },
      capability: "service.status.read",
      risk_level: 0,
      requested_control_mode: "observation",
      required_approvals: [],
      rollback_expectations: [],
      adapter_authority: "preflight_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectAdapterInvocationPreflightGatewayRequest(
      {
        request_id: 115,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "adapter_invocation_preflight_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "adapter_invocation_preflight_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "adapter_invocation_preflight_gateway.missing_preflight_request",
          path: "/preflight_request",
        },
      ],
      preflight_errors: [],
      adapter_invocation_preflight: null,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0114 evidence without raw echo", async () => {
    const response = await inspectAdapterInvocationPreflightGatewayRequest(
      {
        request_id: "req_bp0115_invalid_delegated_preflight",
        preflight_request: {
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          capability_broker_request_refs: [
            {
              request_ref: "request:bp0102-capability-broker-request",
              evidence_ref: "secret:prod-api-key",
              contract_id: capabilityBrokerRequestContract.contract_id,
              summary: "inline secret evidence",
            },
          ],
          denied_adapter_behavior: [
            ...defaultAdapterInvocationPreflight.denied_adapter_behavior,
            "adapter.invoke.execute",
          ],
          side_effects: [{ effect_type: "adapter_invocation" }],
          command: "rm -rf /",
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      preflight_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "adapter_invocation_preflight.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_preflight.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_preflight.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_preflight.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "adapter_invocation_preflight.secret_value_forbidden",
          path: "/capability_broker_request_refs/0",
        }),
        expect.objectContaining({
          code: "adapter_invocation_preflight.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "adapter_invocation_preflight.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("secret:prod-api-key");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("invoke raw adapter command");
  });
});
