import {
  adapterInvocationAuthorizationBundleContract,
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  defaultAdapterInvocationAuthorizationBundle,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  adapterInvocationAuthorizationBundleGatewayContract,
  inspectAdapterInvocationAuthorizationBundleGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-08T00:00:00.000Z");

describe("@lnsat/api BP-0127 adapter invocation authorization bundle Gateway contract", () => {
  it("returns BP-0126 source-only authorization bundle evidence through Gateway", async () => {
    const response = await inspectAdapterInvocationAuthorizationBundleGatewayRequest(
      {
        request_id: "req_bp0127_adapter_invocation_authorization_bundle",
        bundle_request: {
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: adapterInvocationAuthorizationBundleGatewayContract.contract_id,
      request_id: "req_bp0127_adapter_invocation_authorization_bundle",
      inspected_at: "2026-05-08T00:00:00.000Z",
      bundle_version: "0.1",
      bundle_identity: {
        bundle_ref: "authorization_bundle:service-control-adapter-invocation",
        bundle_name: "Service control adapter invocation authorization bundle",
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
      authorization_authority: "authorization_bundle_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected Gateway authorization bundle success");
    }

    expect(response.adapter_invocation_authorization_bundle).toMatchObject({
      contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
      bundle_version: "0.1",
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
    expect(response.adapter_invocation_preflight_refs).toEqual([
      {
        preflight_ref: "preflight:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
        contract_id: adapterInvocationPreflightContract.contract_id,
        summary: "BP-0114 source-only adapter invocation preflight evidence",
      },
    ]);
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.invocation.authorization_bundle.review",
        "substrate.adapter.invocation.result.review",
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
    expect(response.cross_ref_consistency).toEqual({
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
      ],
    });
    expect(response.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "authorization bundle does not invoke adapter",
        "authorization bundle does not dispatch broker request",
      ]),
    );
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/POLICY_AND_AUDIT.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0126: source-only adapter invocation authorization bundle contract",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/adapter-invocation-authorization-bundle.ts",
        "apps/api/src/adapter-invocation-authorization-bundle.ts",
      ]),
    );
  });

  it("preserves explicit bundle identity without creating invocation authority", async () => {
    const response = await inspectAdapterInvocationAuthorizationBundleGatewayRequest(
      {
        request_id: "req_bp0127_named_authorization_bundle",
        bundle_request: {
          bundle_identity: {
            bundle_ref: "authorization_bundle:ops-review-only",
            bundle_name: "Ops review-only authorization bundle",
            owner_ref: "owner:lnsat-platform",
          },
          source_refs: [
            {
              source_ref: "ticket:BP-0127",
              summary: "Gateway wraps explicit authorization bundle evidence",
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
      request_id: "req_bp0127_named_authorization_bundle",
      bundle_identity: {
        bundle_ref: "authorization_bundle:ops-review-only",
        bundle_name: "Ops review-only authorization bundle",
        owner_ref: "owner:lnsat-platform",
      },
      authorization_authority: "authorization_bundle_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectAdapterInvocationAuthorizationBundleGatewayRequest(
      {
        request_id: 127,
        raw_rejected_value: "adapter.invoke.execute TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "adapter_invocation_authorization_bundle_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "adapter_invocation_authorization_bundle_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "adapter_invocation_authorization_bundle_gateway.missing_bundle_request",
          path: "/bundle_request",
        },
      ],
      bundle_errors: [],
      adapter_invocation_authorization_bundle: null,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0126 evidence without raw echo", async () => {
    const response = await inspectAdapterInvocationAuthorizationBundleGatewayRequest(
      {
        request_id: "req_bp0127_invalid_delegated_bundle",
        bundle_request: {
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          authorization_authority: "authorization_grants_execution",
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          denied_live_behavior: [
            ...defaultAdapterInvocationAuthorizationBundle.denied_live_behavior,
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
      bundle_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
          path: "/authorization_authority",
        }),
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "adapter_invocation_authorization_bundle.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("rm -rf");
    expect(JSON.stringify(response)).not.toContain("invoke raw adapter command");
  });
});
