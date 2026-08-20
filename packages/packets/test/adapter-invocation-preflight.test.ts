import { describe, expect, it } from "vitest";
import {
  adapterInvocationPreflightContract,
  capabilityBrokerRequestContract,
  createAdapterInvocationPreflight,
  defaultAdapterInvocationPreflight,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "../src/index.js";

describe("adapter invocation preflight contract", () => {
  it("emits source-only adapter invocation preflight evidence", () => {
    const result = createAdapterInvocationPreflight();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected adapter invocation preflight success");
    }

    expect(result.adapter_invocation_preflight).toMatchObject({
      contract_id: adapterInvocationPreflightContract.contract_id,
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
    expect(result.adapter_invocation_preflight.capability_broker_request_refs).toEqual([
      {
        request_ref: "request:bp0102-capability-broker-request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        contract_id: capabilityBrokerRequestContract.contract_id,
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(result.adapter_invocation_preflight.substrate_adapter_manifest_refs).toEqual(
      [
        {
          manifest_ref: "manifest:bp0108-substrate-adapter-manifest",
          evidence_ref: "evidence:bp0108-substrate-adapter-manifest",
          contract_id: substrateAdapterManifestContract.contract_id,
          summary: "BP-0108 source-only substrate adapter manifest evidence",
        },
      ],
    );
    expect(result.adapter_invocation_preflight.required_input_evidence_refs).toEqual([
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
    expect(result.adapter_invocation_preflight.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
        "substrate.adapter.invocation.preflight.review",
        "substrate.adapter.manifest.review",
      ]),
    );
    expect(result.adapter_invocation_preflight.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.adapter_invocation_preflight.required_audit_events).toEqual(
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
    expect(result.adapter_invocation_preflight.denied_adapter_behavior).toEqual(
      expect.arrayContaining([
        "preflight classifies adapter invocation only",
        "preflight does not instantiate adapter",
        "preflight does not invoke substrate control",
      ]),
    );
    expect(result.adapter_invocation_preflight.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
      ]),
    );
    expect(result.adapter_invocation_preflight.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0114: source-only adapter invocation preflight contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts observation preflight without approvals or rollback", () => {
    const result = createAdapterInvocationPreflight({
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
          source_ref: "ticket:BP-0114",
          summary: "source-only service observation preflight",
        },
      ],
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected observation preflight success");
    }

    expect(result.adapter_invocation_preflight.required_approvals).toEqual([]);
    expect(result.adapter_invocation_preflight.rollback_expectations).toEqual([]);
    expect(result.adapter_invocation_preflight.adapter_authority).toBe(
      "preflight_only_no_invocation",
    );
  });

  it("fails closed for live adapter invocation, live broker dispatch, and live execution", () => {
    const result = createAdapterInvocationPreflight({
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation preflight failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_preflight.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message:
            "Adapter invocation preflight cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message: "Adapter invocation preflight cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Adapter invocation preflight cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs, policy, approval, audit, result, and rollback evidence", () => {
    const result = createAdapterInvocationPreflight({
      substrate_control_intent_refs: [],
      capability_broker_request_refs: [],
      substrate_adapter_manifest_refs: [],
      required_input_evidence_refs: [],
      source_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_plan: defaultAdapterInvocationPreflight.audit_event_plan.filter(
        (event) => event.event_type !== "policy_checked",
      ),
      result_expectations: null,
      rollback_expectations: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation preflight failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_preflight.substrate_control_intent_ref_required",
          path: "/substrate_control_intent_refs",
          message:
            "Adapter invocation preflight requires substrate control intent refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.broker_request_ref_required",
          path: "/capability_broker_request_refs",
          message:
            "Adapter invocation preflight requires capability broker request refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.adapter_manifest_ref_required",
          path: "/substrate_adapter_manifest_refs",
          message:
            "Adapter invocation preflight requires substrate adapter manifest refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.input_evidence_required",
          path: "/required_input_evidence_refs",
          message: "Adapter invocation preflight requires input evidence refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.source_ref_required",
          path: "/source_refs",
          message: "Adapter invocation preflight requires source refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Adapter invocation preflight requires policy gate refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.approval_required",
          path: "/approval_refs",
          message:
            "Approval-gated or risky adapter invocation preflight requires approval refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.audit_event_required",
          path: "/audit_event_plan/policy_checked",
          message: "Adapter invocation preflight requires policy_checked audit event.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.result_expectation_required",
          path: "/result_expectations",
          message: "Adapter invocation preflight requires result expectations.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.rollback_expectation_required",
          path: "/rollback_expectations",
          message: "Risky adapter invocation preflight requires rollback expectations.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe adapter authority", () => {
    const result = createAdapterInvocationPreflight({
      requested_control_mode: "forbidden_mutation",
      capability: "adapter.invoke.execute",
      adapter_class: "root.shell.adapter",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation preflight failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_preflight.unsafe_adapter_authority",
          path: "/capability",
          message: "Adapter invocation preflight capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.invalid_adapter_class",
          path: "/adapter_class",
          message: "Adapter invocation preflight adapter class is unsupported.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.unsafe_adapter_authority",
          path: "/adapter_class",
          message:
            "Adapter invocation preflight adapter class asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.unsafe_adapter_authority",
          path: "/requested_control_mode",
          message: "Forbidden mutation cannot be preflighted for adapter invocation.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createAdapterInvocationPreflight({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      required_input_evidence_refs: [
        {
          evidence_ref: "evidence:secret:prod-api-key",
          contract_id: capabilityBrokerRequestContract.contract_id,
          summary: "source intent with TOKEN",
        },
      ],
      result_expectations: {
        ...defaultAdapterInvocationPreflight.result_expectations,
        operator_visible_summary: "show PASSWORD and PRIVATE KEY",
      },
      side_effects: [{ effect_type: "adapter_invocation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation preflight failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_preflight.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.secret_value_forbidden",
          path: "/required_input_evidence_refs/0",
          message: "Input evidence refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.secret_value_forbidden",
          path: "/result_expectations",
          message:
            "Adapter invocation preflight result expectations cannot contain secrets.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.unexpected_field",
          path: "/command",
          message: "Unexpected adapter invocation preflight field.",
          severity: "error",
        },
        {
          code: "adapter_invocation_preflight.side_effects_forbidden",
          path: "/side_effects",
          message: "Adapter invocation preflight must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("PASSWORD");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(result)).not.toContain("secret:prod-api-key");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
