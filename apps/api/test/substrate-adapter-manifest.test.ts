import {
  capabilityBrokerRequestContract,
  defaultSubstrateAdapterManifest,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectSubstrateAdapterManifestGatewayRequest,
  substrateAdapterManifestGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-07T00:00:00.000Z");

describe("@lnsat/api BP-0109 substrate adapter manifest Gateway contract", () => {
  it("returns BP-0108 source-only substrate adapter manifest evidence through Gateway", async () => {
    const response = await inspectSubstrateAdapterManifestGatewayRequest(
      {
        request_id: "req_bp0109_substrate_adapter_manifest",
        manifest_request: {
          side_effects: [],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: substrateAdapterManifestGatewayContract.contract_id,
      request_id: "req_bp0109_substrate_adapter_manifest",
      inspected_at: "2026-05-07T00:00:00.000Z",
      manifest_version: "0.1",
      adapter_identity: {
        adapter_ref: "adapter:service-control-manifest",
        adapter_name: "Service control proposal adapter manifest",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_class: "service_control_adapter",
      supported_substrate_kinds: ["services"],
      supported_control_modes: ["approval_gated_mutation", "observation", "proposal"],
      adapter_authority: "manifest_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    if (!response.ok) {
      throw new Error("expected Gateway substrate adapter manifest success");
    }

    expect(response.substrate_adapter_manifest).toMatchObject({
      contract_id: "lnsat.platform.substrate_adapter_manifest.v0_1",
      manifest_version: "0.1",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.accepted_capability_refs).toEqual([
      {
        capability_ref: "capability:service-restart-request",
        capability: "service.restart.request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(response.required_input_evidence_refs).toEqual([
      {
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 substrate control intent evidence required before adapters",
      },
      {
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 broker request evidence required before adapter selection",
      },
    ]);
    expect(response.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
        "services.mutation.approval",
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
        "manifest describes adapter only",
        "manifest does not instantiate adapter",
        "manifest does not invoke substrate control",
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
        "ticket:BP-0108: source-only substrate adapter manifest contract",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/substrate-adapter-manifest.ts",
        "apps/api/src/substrate-adapter-manifest.ts",
      ]),
    );
  });

  it("preserves an explicit observation-only manifest without approvals or rollback refs", async () => {
    const response = await inspectSubstrateAdapterManifestGatewayRequest(
      {
        request_id: "req_bp0109_observation_manifest",
        manifest_request: {
          adapter_identity: {
            adapter_ref: "adapter:service-observation-manifest",
            adapter_name: "Service observation manifest",
            owner_ref: "owner:lnsat-platform",
          },
          adapter_class: "no_adapter_dispatch",
          supported_substrate_kinds: ["services"],
          supported_control_modes: ["observation"],
          accepted_capability_refs: [
            {
              capability_ref: "capability:service-status-read",
              capability: "service.status.read",
              evidence_ref: "evidence:bp0102-service-status-read",
              summary: "source-only service status broker request",
            },
          ],
          required_input_evidence_refs: [
            {
              evidence_ref: "evidence:bp0102-service-status-read",
              contract_id: capabilityBrokerRequestContract.contract_id,
              summary: "source-only broker request evidence",
            },
          ],
          source_refs: [
            {
              source_ref: "ticket:BP-0109",
              summary: "Gateway wraps observation-only adapter manifest",
            },
          ],
          policy_gate_refs: [
            {
              gate_ref: "substrate.adapter.manifest.review",
              decision_ref: "policy_decision:service-observation-manifest",
              required: true,
            },
          ],
          approval_refs: [],
          audit_event_plan: defaultSubstrateAdapterManifest.audit_event_plan,
          result_expectations: defaultSubstrateAdapterManifest.result_expectations,
          rollback_expectations: [],
          denied_adapter_behavior: ["manifest describes adapter only"],
          denied_live_behavior: ["no live adapter invocation", "no live execution"],
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
      request_id: "req_bp0109_observation_manifest",
      adapter_identity: {
        adapter_ref: "adapter:service-observation-manifest",
        adapter_name: "Service observation manifest",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_class: "no_adapter_dispatch",
      supported_control_modes: ["observation"],
      required_approvals: [],
      rollback_expectations: [],
      adapter_authority: "manifest_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectSubstrateAdapterManifestGatewayRequest(
      {
        request_id: 109,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "substrate_adapter_manifest_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "substrate_adapter_manifest_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "substrate_adapter_manifest_gateway.missing_manifest_request",
          path: "/manifest_request",
        },
      ],
      manifest_errors: [],
      substrate_adapter_manifest: null,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("substrate.adapter.invoke");
    expect(JSON.stringify(response)).not.toContain("TOKEN=inline-secret");
  });

  it("fails closed for invalid delegated BP-0108 evidence without raw echo", async () => {
    const response = await inspectSubstrateAdapterManifestGatewayRequest(
      {
        request_id: "req_bp0109_invalid_delegated_manifest",
        manifest_request: {
          live_adapter_invocation_allowed: true,
          live_broker_dispatch_allowed: true,
          live_execution_allowed: true,
          source_refs: [
            {
              source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
              summary: "read DATABASE_URL and invoke raw adapter command",
            },
          ],
          accepted_capability_refs: [
            {
              capability_ref: "capability:service-restart-request",
              capability: "service.restart.request",
              evidence_ref: "secret:prod-api-key",
              summary: "inline secret evidence",
            },
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
      manifest_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "substrate_adapter_manifest.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
        }),
        expect.objectContaining({
          code: "substrate_adapter_manifest.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "substrate_adapter_manifest.live_execution_forbidden",
          path: "/live_execution_allowed",
        }),
        expect.objectContaining({
          code: "substrate_adapter_manifest.secret_value_forbidden",
          path: "/source_refs/0",
        }),
        expect.objectContaining({
          code: "substrate_adapter_manifest.secret_value_forbidden",
          path: "/accepted_capability_refs/0",
        }),
        expect.objectContaining({
          code: "substrate_adapter_manifest.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "substrate_adapter_manifest.side_effects_forbidden",
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
