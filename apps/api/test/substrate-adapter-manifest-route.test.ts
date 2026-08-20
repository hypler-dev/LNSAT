import {
  capabilityBrokerRequestContract,
  defaultSubstrateAdapterManifest,
  substrateControlIntentContract,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  substrateAdapterManifestGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-07T00:00:00.000Z");

describe("@lnsat/api BP-0110 substrate adapter manifest route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects substrate adapter manifest evidence through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: substrateAdapterManifestGatewayContract.method,
      url: substrateAdapterManifestGatewayContract.path,
      payload: {
        request_id: "req_bp0110_route_substrate_adapter_manifest",
        manifest_request: {
          source_refs: [
            {
              source_ref: "ticket:BP-0110",
              summary:
                "Fastify route exposes Gateway substrate adapter manifest evidence",
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
      contract_id: substrateAdapterManifestGatewayContract.contract_id,
      request_id: "req_bp0110_route_substrate_adapter_manifest",
      inspected_at: "2026-05-07T00:00:00.000Z",
      substrate_adapter_manifest: {
        contract_id: "lnsat.platform.substrate_adapter_manifest.v0_1",
        manifest_version: "0.1",
        live_adapter_invocation_allowed: false,
        live_broker_dispatch_allowed: false,
        live_execution_allowed: false,
        side_effects: [],
      },
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
    expect(body.accepted_capability_refs).toEqual([
      {
        capability_ref: "capability:service-restart-request",
        capability: "service.restart.request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(body.required_input_evidence_refs).toEqual([
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
    expect(body.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
        "services.mutation.approval",
        "substrate.adapter.manifest.review",
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
    expect(body.denied_adapter_behavior).toEqual(
      expect.arrayContaining([
        "manifest describes adapter only",
        "manifest does not instantiate adapter",
        "manifest does not invoke substrate control",
      ]),
    );
    expect(body.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live broker dispatch",
        "no live adapter invocation",
        "no live execution",
      ]),
    );
    expect(body.source_refs).toEqual(
      expect.arrayContaining([
        "ticket:BP-0110: Fastify route exposes Gateway substrate adapter manifest evidence",
      ]),
    );
  });

  it("maps malformed Gateway route requests to 400 without raw rejected value echo", async () => {
    const response = await gateway.inject({
      method: substrateAdapterManifestGatewayContract.method,
      url: substrateAdapterManifestGatewayContract.path,
      payload: {
        request_id: 110,
        raw_rejected_value: "substrate.adapter.invoke TOKEN=inline-secret",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      contract_id: substrateAdapterManifestGatewayContract.contract_id,
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
    expect(response.body).not.toContain("substrate.adapter.invoke");
    expect(response.body).not.toContain("TOKEN=inline-secret");
  });

  it("maps invalid delegated BP-0108 evidence to 400 without raw echo", async () => {
    const response = await gateway.inject({
      method: substrateAdapterManifestGatewayContract.method,
      url: substrateAdapterManifestGatewayContract.path,
      payload: {
        request_id: "req_bp0110_invalid_delegated_manifest",
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
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0110_invalid_delegated_manifest",
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
      substrate_adapter_manifest: null,
      raw_input_content: "withheld",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(response.body).not.toContain("DATABASE_URL");
    expect(response.body).not.toContain("secret:prod-api-key");
    expect(response.body).not.toContain("rm -rf");
    expect(response.body).not.toContain("invoke raw adapter command");
  });

  it("preserves observation-only manifest without approvals, rollback refs, invocation, dispatch, execution, or side effects", async () => {
    const response = await gateway.inject({
      method: substrateAdapterManifestGatewayContract.method,
      url: substrateAdapterManifestGatewayContract.path,
      payload: {
        request_id: "req_bp0110_observation_manifest",
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
              source_ref: "ticket:BP-0110",
              summary: "Route wraps observation-only adapter manifest",
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
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      request_id: "req_bp0110_observation_manifest",
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
});
