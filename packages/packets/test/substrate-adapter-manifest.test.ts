import { describe, expect, it } from "vitest";
import {
  capabilityBrokerRequestContract,
  createSubstrateAdapterManifest,
  defaultSubstrateAdapterManifest,
  substrateAdapterManifestContract,
  substrateControlIntentContract,
} from "../src/index.js";

describe("substrate adapter manifest contract", () => {
  it("emits source-only substrate adapter manifest evidence", () => {
    const result = createSubstrateAdapterManifest();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected substrate adapter manifest success");
    }

    expect(result.substrate_adapter_manifest).toMatchObject({
      contract_id: substrateAdapterManifestContract.contract_id,
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
    expect(result.substrate_adapter_manifest.accepted_capability_refs).toEqual([
      {
        capability_ref: "capability:service-restart-request",
        capability: "service.restart.request",
        evidence_ref: "evidence:bp0102-capability-broker-request",
        summary: "BP-0102 source-only capability broker request evidence",
      },
    ]);
    expect(result.substrate_adapter_manifest.required_input_evidence_refs).toEqual([
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
    expect(result.substrate_adapter_manifest.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
        "services.mutation.approval",
        "substrate.adapter.manifest.review",
      ]),
    );
    expect(result.substrate_adapter_manifest.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.substrate_adapter_manifest.required_audit_events).toEqual(
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
    expect(result.substrate_adapter_manifest.denied_adapter_behavior).toEqual(
      expect.arrayContaining([
        "manifest describes adapter only",
        "manifest does not instantiate adapter",
        "manifest does not invoke substrate control",
      ]),
    );
    expect(result.substrate_adapter_manifest.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live broker dispatch",
        "no live adapter invocation",
        "no live execution",
      ]),
    );
    expect(result.substrate_adapter_manifest.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0108: source-only substrate adapter manifest contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts an observation-only no-dispatch manifest without approvals or rollback", () => {
    const result = createSubstrateAdapterManifest({
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
          source_ref: "ticket:BP-0108",
          summary: "source-only observation adapter manifest",
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
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected observation manifest success");
    }

    expect(result.substrate_adapter_manifest.required_approvals).toEqual([]);
    expect(result.substrate_adapter_manifest.rollback_expectations).toEqual([]);
    expect(result.substrate_adapter_manifest.adapter_authority).toBe(
      "manifest_only_no_invocation",
    );
  });

  it("fails closed for live adapter invocation, live broker dispatch, and live execution", () => {
    const result = createSubstrateAdapterManifest({
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate adapter manifest failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_adapter_manifest.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message: "Substrate adapter manifest cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message: "Substrate adapter manifest cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Substrate adapter manifest cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing source, substrate, mode, capability, policy, approval, audit, and rollback evidence", () => {
    const result = createSubstrateAdapterManifest({
      supported_substrate_kinds: [],
      supported_control_modes: [],
      accepted_capability_refs: [],
      required_input_evidence_refs: [],
      source_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_plan: defaultSubstrateAdapterManifest.audit_event_plan.filter(
        (event) => event.event_type !== "policy_checked",
      ),
      rollback_expectations: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate adapter manifest failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_adapter_manifest.supported_substrate_kind_required",
          path: "/supported_substrate_kinds",
          message: "Substrate adapter manifest requires supported substrate kinds.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.supported_control_mode_required",
          path: "/supported_control_modes",
          message: "Substrate adapter manifest requires supported control modes.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.accepted_capability_required",
          path: "/accepted_capability_refs",
          message: "Substrate adapter manifest requires accepted capability refs.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.input_evidence_required",
          path: "/required_input_evidence_refs",
          message: "Substrate adapter manifest requires input evidence refs.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.source_ref_required",
          path: "/source_refs",
          message: "Substrate adapter manifest requires source refs.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Substrate adapter manifest requires policy gate refs.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.approval_required",
          path: "/approval_refs",
          message:
            "Approval-gated or risky substrate adapter manifest requires approval refs.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.audit_event_required",
          path: "/audit_event_plan/policy_checked",
          message: "Substrate adapter manifest requires policy_checked audit event.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.rollback_expectation_required",
          path: "/rollback_expectations",
          message: "Risky substrate adapter manifest requires rollback expectations.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe adapter authority", () => {
    const result = createSubstrateAdapterManifest({
      adapter_class: "root.shell.adapter",
      supported_substrate_kinds: ["root_shells"],
      supported_control_modes: ["forbidden_mutation"],
      accepted_capability_refs: [
        {
          capability_ref: "capability:ssh-raw-execute",
          capability: "ssh.raw.execute",
          evidence_ref: "evidence:bp0102-root-shell",
          summary: "unsafe adapter invoke request",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate adapter manifest failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_adapter_manifest.invalid_adapter_class",
          path: "/adapter_class",
          message: "Substrate adapter manifest adapter class is unsupported.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.unsafe_adapter_authority",
          path: "/adapter_class",
          message:
            "Substrate adapter manifest adapter class asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.invalid_supported_substrate_kind",
          path: "/supported_substrate_kinds/0",
          message:
            "Substrate adapter manifest supported substrate kind is unsupported.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.unsafe_adapter_authority",
          path: "/supported_control_modes",
          message:
            "Forbidden mutation cannot be supported by substrate adapter manifest.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.unsafe_adapter_authority",
          path: "/accepted_capability_refs/0",
          message: "Accepted capability refs ask for unsafe adapter authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("root_shells");
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
    expect(JSON.stringify(result)).not.toContain("ssh.raw.execute");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createSubstrateAdapterManifest({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      accepted_capability_refs: [
        {
          capability_ref: "capability:service-restart-request",
          capability: "service.restart.request",
          evidence_ref: "evidence:secret:prod-api-key",
          summary: "source capability with TOKEN",
        },
      ],
      result_expectations: {
        ...defaultSubstrateAdapterManifest.result_expectations,
        operator_visible_summary: "show PASSWORD and PRIVATE KEY",
      },
      denied_adapter_behavior: ["manifest invokes adapter.invoke now"],
      side_effects: [{ effect_type: "adapter_invocation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate adapter manifest failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_adapter_manifest.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.secret_value_forbidden",
          path: "/accepted_capability_refs/0",
          message: "Accepted capability refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.secret_value_forbidden",
          path: "/result_expectations",
          message:
            "Substrate adapter manifest result expectations cannot contain secrets.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.invalid_denied_adapter_behavior",
          path: "/denied_adapter_behavior/0",
          message: "Substrate adapter manifest behavior text must be safe text.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.unexpected_field",
          path: "/command",
          message: "Unexpected substrate adapter manifest field.",
          severity: "error",
        },
        {
          code: "substrate_adapter_manifest.side_effects_forbidden",
          path: "/side_effects",
          message: "Substrate adapter manifest must preserve side_effects: [].",
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
