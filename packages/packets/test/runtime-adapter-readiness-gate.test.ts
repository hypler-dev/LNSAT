import { describe, expect, it } from "vitest";
import {
  adapterInvocationAuthorizationBundleContract,
  runtimeAdapterReadinessGateContract,
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  createRuntimeAdapterReadinessGate,
  defaultRuntimeAdapterReadinessGate,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "../src/index.js";

describe("runtime adapter readiness gate contract", () => {
  it("emits source-only runtime adapter readiness gate evidence", () => {
    const result = createRuntimeAdapterReadinessGate();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected runtime adapter readiness gate success");
    }

    expect(result.runtime_adapter_readiness_gate).toMatchObject({
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
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
    expect(result.runtime_adapter_readiness_gate.substrate_control_intent_refs).toEqual(
      [
        {
          intent_ref: "intent:bp0096-substrate-control-intent",
          evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
          contract_id: substrateControlIntentContract.contract_id,
          summary: "BP-0096 source-only substrate control intent evidence",
        },
      ],
    );
    expect(
      result.runtime_adapter_readiness_gate.capability_broker_request_refs,
    ).toEqual([
      {
        request_ref: "request:bp0102-capability-broker-request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(
      result.runtime_adapter_readiness_gate.substrate_adapter_manifest_refs,
    ).toEqual([
      {
        manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
        evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
        contract_id: substrateAdapterManifestContract.contract_id,
        summary: "BP-0108 source-only substrate adapter manifest evidence",
      },
    ]);
    expect(
      result.runtime_adapter_readiness_gate.adapter_invocation_preflight_refs,
    ).toEqual([
      {
        preflight_ref: "preflight:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
        contract_id: adapterInvocationPreflightContract.contract_id,
        summary: "BP-0114 source-only adapter invocation preflight evidence",
      },
    ]);
    expect(
      result.runtime_adapter_readiness_gate
        .adapter_invocation_authorization_bundle_refs,
    ).toEqual([
      {
        bundle_ref: "authorization_bundle:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0126-adapter-invocation-authorization-bundle",
        contract_id: adapterInvocationAuthorizationBundleContract.contract_id,
        summary: "BP-0126 source-only adapter invocation authorization bundle evidence",
      },
    ]);
    expect(result.runtime_adapter_readiness_gate.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.runtime_readiness_gate.review",
        "substrate.adapter.invocation.result.review",
      ]),
    );
    expect(result.runtime_adapter_readiness_gate.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.runtime_adapter_readiness_gate.required_audit_events).toEqual(
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
    expect(result.runtime_adapter_readiness_gate.cross_ref_consistency).toEqual({
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
    expect(result.runtime_adapter_readiness_gate.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "readiness gate does not invoke adapter",
        "readiness gate does not dispatch broker request",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed for runtime adapter dispatch, live adapter invocation, live broker dispatch, and live execution", () => {
    const result = createRuntimeAdapterReadinessGate({
      runtime_adapter_dispatch_allowed: true,
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter readiness gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_readiness_gate.runtime_adapter_dispatch_forbidden",
          path: "/runtime_adapter_dispatch_allowed",
          message:
            "Runtime adapter readiness gate cannot enable runtime adapter dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Runtime adapter readiness gate cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message: "Runtime adapter readiness gate cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Runtime adapter readiness gate cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs, policy, approval, audit, rollback, and source evidence", () => {
    const result = createRuntimeAdapterReadinessGate({
      substrate_control_intent_refs: [],
      capability_broker_request_refs: [],
      substrate_adapter_manifest_refs: [],
      adapter_invocation_preflight_refs: [],
      expected_result_refs: [],
      adapter_invocation_authorization_bundle_refs: [],
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
      throw new Error("expected runtime adapter readiness gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_readiness_gate.substrate_control_intent_ref_required",
          path: "/substrate_control_intent_refs",
          message:
            "Runtime adapter readiness gate requires substrate control intent refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.broker_request_ref_required",
          path: "/capability_broker_request_refs",
          message:
            "Runtime adapter readiness gate requires capability broker request refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.adapter_manifest_ref_required",
          path: "/substrate_adapter_manifest_refs",
          message:
            "Runtime adapter readiness gate requires substrate adapter manifest refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.preflight_ref_required",
          path: "/adapter_invocation_preflight_refs",
          message: "Runtime adapter readiness gate requires preflight refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.expected_result_ref_required",
          path: "/expected_result_refs",
          message: "Runtime adapter readiness gate requires expected result refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.authorization_bundle_ref_required",
          path: "/adapter_invocation_authorization_bundle_refs",
          message: "Runtime adapter readiness gate requires authorization bundle refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.rollback_ref_required",
          path: "/rollback_refs",
          message: "Runtime adapter readiness gate requires rollback refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Runtime adapter readiness gate requires policy gate refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.approval_required",
          path: "/approval_refs",
          message: "Runtime adapter readiness gate requires approval refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.audit_ref_required",
          path: "/audit_event_refs",
          message: "Runtime adapter readiness gate requires audit refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.source_ref_required",
          path: "/source_refs",
          message: "Runtime adapter readiness gate requires source refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.cross_ref_consistency_required",
          path: "/cross_ref_consistency/evidence_refs",
          message: "Runtime adapter readiness gate requires consistency evidence refs.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.denied_live_behavior_required",
          path: "/denied_live_behavior",
          message: "Runtime adapter readiness gate requires denied live behavior.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for mismatched actor, capability, risk, substrate, and control evidence", () => {
    const result = createRuntimeAdapterReadinessGate({
      cross_ref_consistency: {
        actor_ref: "human:jeff",
        capability: "service.status.read",
        risk_level: 1,
        target_substrate_kind: "hosts",
        requested_control_mode: "observation",
        evidence_refs: ["evidence:bp0132-mismatched-cross-ref"],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter readiness gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_readiness_gate.mismatched_actor",
          path: "/cross_ref_consistency/actor_ref",
          message: "Readiness gate actor must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.mismatched_capability",
          path: "/cross_ref_consistency/capability",
          message: "Readiness gate capability must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.mismatched_risk_level",
          path: "/cross_ref_consistency/risk_level",
          message: "Readiness gate risk level must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.mismatched_substrate_kind",
          path: "/cross_ref_consistency/target_substrate_kind",
          message: "Readiness gate substrate kind must match cross-ref evidence.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.mismatched_control_mode",
          path: "/cross_ref_consistency/requested_control_mode",
          message: "Readiness gate control mode must match cross-ref evidence.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe readiness authority", () => {
    const result = createRuntimeAdapterReadinessGate({
      capability: "adapter.invoke.execute",
      readiness_authority: "readiness_grants_execution",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected runtime adapter readiness gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path: "/capability",
          message:
            "Runtime adapter readiness gate capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.unsafe_readiness_authority",
          path: "/readiness_authority",
          message: "Runtime adapter readiness gate cannot grant invocation authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain("readiness_grants_execution");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createRuntimeAdapterReadinessGate({
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
      throw new Error("expected runtime adapter readiness gate failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "runtime_adapter_readiness_gate.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.secret_value_forbidden",
          path: "/denied_live_behavior/1",
          message: "Denied live behavior cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.unexpected_field",
          path: "/command",
          message: "Unexpected runtime adapter readiness gate field.",
          severity: "error",
        },
        {
          code: "runtime_adapter_readiness_gate.side_effects_forbidden",
          path: "/side_effects",
          message: "Runtime adapter readiness gate must preserve side_effects: [].",
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
    expect(defaultRuntimeAdapterReadinessGate).toMatchObject({
      contract_id: runtimeAdapterReadinessGateContract.contract_id,
      readiness_version: "0.1",
      readiness_authority: "readiness_gate_only_no_runtime_invocation",
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
  });
});
