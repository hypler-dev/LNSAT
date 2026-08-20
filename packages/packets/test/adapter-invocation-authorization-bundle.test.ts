import { describe, expect, it } from "vitest";
import {
  adapterInvocationAuthorizationBundleContract,
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  createAdapterInvocationAuthorizationBundle,
  defaultAdapterInvocationAuthorizationBundle,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "../src/index.js";

describe("adapter invocation authorization bundle contract", () => {
  it("emits source-only adapter invocation authorization bundle evidence", () => {
    const result = createAdapterInvocationAuthorizationBundle();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected adapter invocation authorization bundle success");
    }

    expect(result.adapter_invocation_authorization_bundle).toMatchObject({
      contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
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
    expect(
      result.adapter_invocation_authorization_bundle.substrate_control_intent_refs,
    ).toEqual([
      {
        intent_ref: "intent:bp0096-substrate-control-intent",
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 source-only substrate control intent evidence",
      },
    ]);
    expect(
      result.adapter_invocation_authorization_bundle.capability_broker_request_refs,
    ).toEqual([
      {
        request_ref: "request:bp0102-capability-broker-request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(
      result.adapter_invocation_authorization_bundle.substrate_adapter_manifest_refs,
    ).toEqual([
      {
        manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
        evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
        contract_id: substrateAdapterManifestContract.contract_id,
        summary: "BP-0108 source-only substrate adapter manifest evidence",
      },
    ]);
    expect(
      result.adapter_invocation_authorization_bundle.adapter_invocation_preflight_refs,
    ).toEqual([
      {
        preflight_ref: "preflight:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
        contract_id: adapterInvocationPreflightContract.contract_id,
        summary: "BP-0114 source-only adapter invocation preflight evidence",
      },
    ]);
    expect(
      result.adapter_invocation_authorization_bundle.required_policy_gates,
    ).toEqual(
      expect.arrayContaining([
        "substrate.adapter.invocation.authorization_bundle.review",
        "substrate.adapter.invocation.result.review",
      ]),
    );
    expect(result.adapter_invocation_authorization_bundle.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(
      result.adapter_invocation_authorization_bundle.required_audit_events,
    ).toEqual(
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
      result.adapter_invocation_authorization_bundle.cross_ref_consistency,
    ).toEqual({
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
    expect(result.adapter_invocation_authorization_bundle.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "authorization bundle does not invoke adapter",
        "authorization bundle does not dispatch broker request",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed for live adapter invocation, live broker dispatch, and live execution", () => {
    const result = createAdapterInvocationAuthorizationBundle({
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation authorization bundle failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_authorization_bundle.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Adapter invocation authorization bundle cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message:
            "Adapter invocation authorization bundle cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.live_execution_forbidden",
          path: "/live_execution_allowed",
          message:
            "Adapter invocation authorization bundle cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs, policy, approval, audit, rollback, and source evidence", () => {
    const result = createAdapterInvocationAuthorizationBundle({
      substrate_control_intent_refs: [],
      capability_broker_request_refs: [],
      substrate_adapter_manifest_refs: [],
      adapter_invocation_preflight_refs: [],
      expected_result_refs: [],
      rollback_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_refs: [],
      source_refs: [],
      cross_ref_consistency: {
        actor_ref: "agent:codex",
        capability: "service.restart.request",
        risk_level: 5,
        target_substrate_kind: "services",
        requested_control_mode: "approval_gated_mutation",
        evidence_refs: [],
      },
      denied_live_behavior: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation authorization bundle failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_authorization_bundle.substrate_control_intent_ref_required",
          path: "/substrate_control_intent_refs",
          message:
            "Adapter invocation authorization bundle requires substrate control intent refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.broker_request_ref_required",
          path: "/capability_broker_request_refs",
          message:
            "Adapter invocation authorization bundle requires capability broker request refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.adapter_manifest_ref_required",
          path: "/substrate_adapter_manifest_refs",
          message:
            "Adapter invocation authorization bundle requires substrate adapter manifest refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.preflight_ref_required",
          path: "/adapter_invocation_preflight_refs",
          message: "Adapter invocation authorization bundle requires preflight refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.expected_result_ref_required",
          path: "/expected_result_refs",
          message:
            "Adapter invocation authorization bundle requires expected result refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.rollback_ref_required",
          path: "/rollback_refs",
          message: "Adapter invocation authorization bundle requires rollback refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Adapter invocation authorization bundle requires policy gate refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.approval_required",
          path: "/approval_refs",
          message: "Adapter invocation authorization bundle requires approval refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.audit_ref_required",
          path: "/audit_event_refs",
          message: "Adapter invocation authorization bundle requires audit refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.source_ref_required",
          path: "/source_refs",
          message: "Adapter invocation authorization bundle requires source refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.cross_ref_consistency_required",
          path: "/cross_ref_consistency/evidence_refs",
          message:
            "Adapter invocation authorization bundle requires consistency evidence refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.denied_live_behavior_required",
          path: "/denied_live_behavior",
          message:
            "Adapter invocation authorization bundle requires denied live behavior.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for mismatched actor, capability, risk, substrate, and control evidence", () => {
    const result = createAdapterInvocationAuthorizationBundle({
      cross_ref_consistency: {
        actor_ref: "human:jeff",
        capability: "service.status.read",
        risk_level: 1,
        target_substrate_kind: "hosts",
        requested_control_mode: "observation",
        evidence_refs: ["evidence:bp0126-mismatched-cross-ref"],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation authorization bundle failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_authorization_bundle.mismatched_actor",
          path: "/cross_ref_consistency/actor_ref",
          message: "Authorization bundle actor must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.mismatched_capability",
          path: "/cross_ref_consistency/capability",
          message: "Authorization bundle capability must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.mismatched_risk_level",
          path: "/cross_ref_consistency/risk_level",
          message: "Authorization bundle risk level must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.mismatched_substrate_kind",
          path: "/cross_ref_consistency/target_substrate_kind",
          message: "Authorization bundle substrate kind must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.mismatched_control_mode",
          path: "/cross_ref_consistency/requested_control_mode",
          message: "Authorization bundle control mode must match cross-ref evidence.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe authorization authority", () => {
    const result = createAdapterInvocationAuthorizationBundle({
      capability: "adapter.invoke.execute",
      authorization_authority: "authorization_grants_execution",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation authorization bundle failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
          path: "/capability",
          message:
            "Adapter invocation authorization bundle capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.unsafe_authorization_authority",
          path: "/authorization_authority",
          message:
            "Adapter invocation authorization bundle cannot grant invocation authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain("authorization_grants_execution");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createAdapterInvocationAuthorizationBundle({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      denied_live_behavior: ["no live adapter invocation", "read PRIVATE KEY"],
      side_effects: [{ effect_type: "adapter_invocation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation authorization bundle failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_authorization_bundle.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.secret_value_forbidden",
          path: "/denied_live_behavior/1",
          message: "Denied live behavior cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.unexpected_field",
          path: "/command",
          message: "Unexpected adapter invocation authorization bundle field.",
          severity: "error",
        },
        {
          code: "adapter_invocation_authorization_bundle.side_effects_forbidden",
          path: "/side_effects",
          message:
            "Adapter invocation authorization bundle must preserve side_effects: [].",
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
    expect(defaultAdapterInvocationAuthorizationBundle).toMatchObject({
      contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
      bundle_version: "0.1",
      authorization_authority: "authorization_bundle_only_no_invocation",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
