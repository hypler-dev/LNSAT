import { describe, expect, it } from "vitest";
import {
  adapterInvocationPreflightContract,
  adapterInvocationResultContract,
  createAdapterInvocationResult,
  defaultAdapterInvocationResult,
} from "../src/index.js";

describe("adapter invocation result contract", () => {
  it("emits source-only adapter invocation result evidence", () => {
    const result = createAdapterInvocationResult();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected adapter invocation result success");
    }

    expect(result.adapter_invocation_result).toMatchObject({
      contract_id: adapterInvocationResultContract.contract_id,
      result_version: "0.1",
      result_identity: {
        result_ref: "result:service-control-adapter-invocation",
        result_name: "Service control adapter invocation result evidence",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_identity: {
        adapter_ref: "adapter:service-control-manifest",
        adapter_name: "Service control proposal adapter manifest",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_class: "service_control_adapter",
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      observed_status: "completed",
      result_authority: "result_evidence_only_no_execution",
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(result.adapter_invocation_result.adapter_invocation_preflight_refs).toEqual([
      {
        preflight_ref: "preflight:service-control-adapter-invocation",
        evidence_ref: "evidence:bp0114-adapter-invocation-preflight",
        contract_id: adapterInvocationPreflightContract.contract_id,
        summary: "BP-0114 source-only adapter invocation preflight evidence",
      },
    ]);
    expect(result.adapter_invocation_result.expected_result_refs).toEqual([
      {
        result_ref: "result_packet:adapter-invocation-preflight",
        evidence_ref: "evidence:bp0114-result-expectations",
        summary: "BP-0114 expected result evidence before any runtime adapter exists",
      },
    ]);
    expect(result.adapter_invocation_result.rollback_refs).toEqual(
      expect.arrayContaining([
        {
          rollback_ref: "rollback:adapter-invocation-preflight-review",
          required_for_risk_level_at_or_above: 4,
          owner_ref: "owner:lnsat-platform",
          evidence_refs: [
            "doc:docs/architecture/POLICY_AND_AUDIT.md",
            "doc:docs/reference/CONTRACT_PROVENANCE.md",
          ],
        },
      ]),
    );
    expect(result.adapter_invocation_result.required_policy_gates).toEqual(
      expect.arrayContaining([
        "substrate.adapter.invocation.result.review",
        "substrate.adapter.invocation.preflight.review",
      ]),
    );
    expect(result.adapter_invocation_result.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.adapter_invocation_result.required_audit_events).toEqual(
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
    expect(result.adapter_invocation_result.output_evidence_refs).toEqual([
      {
        evidence_ref: "evidence:operator-visible-adapter-result-output",
        summary: "source-only output evidence ref, no live adapter output included",
      },
    ]);
    expect(result.adapter_invocation_result.error_evidence_refs).toEqual([
      {
        evidence_ref: "evidence:operator-visible-adapter-result-error-state",
        summary: "source-only error evidence ref, no raw runtime error included",
      },
    ]);
    expect(result.adapter_invocation_result.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live adapter invocation",
        "no live broker dispatch",
        "no live execution",
        "result evidence does not invoke adapter",
        "result evidence does not execute rollback",
      ]),
    );
    expect(result.adapter_invocation_result.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0120: source-only adapter invocation result contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts observation result evidence without approvals or rollback", () => {
    const result = createAdapterInvocationResult({
      result_identity: {
        result_ref: "result:service-observation",
        result_name: "Service observation result evidence",
        owner_ref: "owner:lnsat-platform",
      },
      adapter_class: "no_adapter_dispatch",
      capability: "service.status.read",
      risk_level: 0,
      requested_control_mode: "observation",
      expected_result_refs: [
        {
          result_ref: "result_packet:service-observation",
          evidence_ref: "evidence:service-observation-expectation",
          summary: "source-only observation result expectation",
        },
      ],
      rollback_refs: [],
      policy_gate_refs: [
        {
          gate_ref: "substrate.adapter.invocation.result.review",
          decision_ref: "policy_decision:service-observation-result",
          required: true,
        },
      ],
      approval_refs: [],
      output_evidence_refs: [
        {
          evidence_ref: "evidence:service-observation-output",
          summary: "source-only service observation output evidence",
        },
      ],
      error_evidence_refs: [],
      source_refs: [
        {
          source_ref: "ticket:BP-0120",
          summary: "source-only service observation result evidence",
        },
      ],
      denied_live_behavior: ["no live adapter invocation", "no live execution"],
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected observation result success");
    }

    expect(result.adapter_invocation_result.required_approvals).toEqual([]);
    expect(result.adapter_invocation_result.rollback_refs).toEqual([]);
    expect(result.adapter_invocation_result.result_authority).toBe(
      "result_evidence_only_no_execution",
    );
  });

  it("fails closed for live adapter invocation, live broker dispatch, and live execution", () => {
    const result = createAdapterInvocationResult({
      live_adapter_invocation_allowed: true,
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation result failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_result.live_adapter_invocation_forbidden",
          path: "/live_adapter_invocation_allowed",
          message: "Adapter invocation result cannot enable live adapter invocation.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message: "Adapter invocation result cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Adapter invocation result cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing refs, audit, output/error evidence, and failure rollback evidence", () => {
    const result = createAdapterInvocationResult({
      adapter_invocation_preflight_refs: [],
      expected_result_refs: [],
      audit_event_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      observed_status: "failed",
      output_evidence_refs: [],
      error_evidence_refs: [],
      rollback_refs: [],
      source_refs: [],
      denied_live_behavior: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation result failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_result.preflight_ref_required",
          path: "/adapter_invocation_preflight_refs",
          message: "Adapter invocation result requires preflight refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.expected_result_ref_required",
          path: "/expected_result_refs",
          message: "Adapter invocation result requires expected result refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.audit_ref_required",
          path: "/audit_event_refs",
          message: "Adapter invocation result requires audit event refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Adapter invocation result requires policy gate refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.approval_required",
          path: "/approval_refs",
          message:
            "Approval-gated or risky adapter invocation result requires approval refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.output_or_error_evidence_required",
          path: "/output_evidence_refs",
          message: "Adapter invocation result requires output or error evidence refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.error_evidence_required",
          path: "/error_evidence_refs",
          message:
            "Failed, denied, or rolled back adapter invocation result requires error evidence refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.rollback_ref_required",
          path: "/rollback_refs",
          message: "Failure-path adapter invocation result requires rollback refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.source_ref_required",
          path: "/source_refs",
          message: "Adapter invocation result requires source refs.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.denied_live_behavior_required",
          path: "/denied_live_behavior",
          message: "Adapter invocation result requires denied live behavior.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe result authority", () => {
    const result = createAdapterInvocationResult({
      capability: "adapter.invoke.execute",
      adapter_class: "root.shell.adapter",
      result_authority: "runtime.execution.allowed",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation result failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_result.unsafe_result_authority",
          path: "/capability",
          message: "Adapter invocation result capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.invalid_adapter_class",
          path: "/adapter_class",
          message: "Adapter invocation result adapter class is unsupported.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.unsafe_result_authority",
          path: "/adapter_class",
          message: "Adapter invocation result adapter class asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.unsafe_result_authority",
          path: "/result_authority",
          message: "Adapter invocation result cannot grant execution authority.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("adapter.invoke.execute");
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
    expect(JSON.stringify(result)).not.toContain("runtime.execution.allowed");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createAdapterInvocationResult({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      output_evidence_refs: [
        {
          evidence_ref: "evidence:secret:prod-api-key",
          summary: "source output with TOKEN",
        },
      ],
      error_evidence_refs: [
        {
          evidence_ref: "evidence:runtime-error",
          summary: "show PASSWORD and PRIVATE KEY",
        },
      ],
      side_effects: [{ effect_type: "adapter_invocation" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation result failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_result.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.secret_value_forbidden",
          path: "/output_evidence_refs/0",
          message: "Evidence refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.secret_value_forbidden",
          path: "/error_evidence_refs/0",
          message: "Evidence refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.unexpected_field",
          path: "/command",
          message: "Unexpected adapter invocation result field.",
          severity: "error",
        },
        {
          code: "adapter_invocation_result.side_effects_forbidden",
          path: "/side_effects",
          message: "Adapter invocation result must preserve side_effects: [].",
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

  it("fails closed for invalid completed result without output evidence", () => {
    const result = createAdapterInvocationResult({
      ...defaultAdapterInvocationResult,
      output_evidence_refs: [],
      error_evidence_refs: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected adapter invocation result failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "adapter_invocation_result.output_evidence_required",
          path: "/output_evidence_refs",
          message: "Completed adapter invocation result requires output evidence refs.",
          severity: "error",
        },
      ]),
    );
  });
});
