import { describe, expect, it } from "vitest";
import {
  createSubstrateControlIntent,
  defaultSubstrateControlIntent,
  substrateControlIntentContract,
} from "../src/index.js";

describe("substrate control intent contract", () => {
  it("emits source-only substrate control intent evidence", () => {
    const result = createSubstrateControlIntent();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected substrate control intent success");
    }

    expect(result.substrate_control_intent).toMatchObject({
      contract_id: substrateControlIntentContract.contract_id,
      intent_version: "0.1",
      requested_actor: {
        actor_ref: "agent:codex",
        actor_type: "agent",
        role_ref: "role:ops_assistant",
      },
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      secret_posture: "references_only_no_values",
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(result.substrate_control_intent.required_packet_family_refs).toEqual({
      capability: ["packet_family:capability"],
      execution: ["packet_family:execution"],
      environment: ["packet_family:environment"],
      audit: ["packet_family:audit"],
      results: ["packet_family:results"],
      rollback: ["packet_family:rollback"],
    });
    expect(result.substrate_control_intent.lifecycle_refs).toEqual(
      expect.arrayContaining([
        {
          packet_type: "CapabilityPacket",
          lifecycle_ref: "lifecycle:CapabilityPacket:approval_required",
          required_state: "approval_required",
        },
        {
          packet_type: "ExecutionPacket",
          lifecycle_ref: "lifecycle:ExecutionPacket:approved",
          required_state: "approved",
        },
      ]),
    );
    expect(result.substrate_control_intent.required_policy_gates).toEqual(
      expect.arrayContaining([
        "execution.approval.required",
        "services.mutation.approval",
        "substrate.intent.policy.review",
      ]),
    );
    expect(result.substrate_control_intent.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.substrate_control_intent.required_audit_events).toEqual(
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
    expect(result.substrate_control_intent.blocked_live_actions).toEqual(
      expect.arrayContaining([
        "substrate.mutation.execute",
        "runtime.execution.start",
        "database.write.execute",
        "service.restart.execute",
        "dns.cloudflare.write",
        "ssh.raw.execute",
        "docker.runner.start",
        "node_agent.exec",
        "git.command.execute",
      ]),
    );
    expect(result.substrate_control_intent.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live substrate mutation",
        "no live execution",
        "no secret values",
      ]),
    );
    expect(result.substrate_control_intent.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0096: source-only substrate control intent contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts a source-backed observation intent without approval requirement", () => {
    const result = createSubstrateControlIntent({
      requested_actor: {
        actor_ref: "human:jeff",
        actor_type: "human",
        role_ref: "role:owner",
      },
      capability: "service.status.read",
      risk_level: 0,
      target_substrate_kind: "services",
      requested_control_mode: "observation",
      source_refs: [
        {
          source_ref: "ticket:BP-0096",
          summary: "source-only service observation control intent",
        },
      ],
      lifecycle_refs: defaultSubstrateControlIntent.lifecycle_refs,
      policy_gate_refs: [
        {
          gate_ref: "substrate.intent.policy.review",
          decision_ref: "policy_decision:service-status-read",
          required: true,
        },
      ],
      approval_refs: [],
      audit_event_plan: defaultSubstrateControlIntent.audit_event_plan,
      result_expectations: defaultSubstrateControlIntent.result_expectations,
      rollback_expectations: [],
      blocked_live_actions: defaultSubstrateControlIntent.blocked_live_actions,
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected substrate control intent success");
    }

    expect(result.substrate_control_intent.requested_actor.actor_ref).toBe(
      "human:jeff",
    );
    expect(result.substrate_control_intent.required_approvals).toEqual([]);
    expect(result.substrate_control_intent.rollback_expectations).toEqual([]);
    expect(result.substrate_control_intent.source_refs).toEqual([
      "ticket:BP-0096: source-only service observation control intent",
    ]);
  });

  it("fails closed for live mutation and live execution", () => {
    const result = createSubstrateControlIntent({
      live_substrate_mutation_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate control intent failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_control_intent.live_substrate_mutation_forbidden",
          path: "/live_substrate_mutation_allowed",
          message: "Substrate control intent cannot enable live substrate mutation.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Substrate control intent cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing source refs, policy gates, approvals, audit obligations, and rollback expectations", () => {
    const result = createSubstrateControlIntent({
      source_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_plan: defaultSubstrateControlIntent.audit_event_plan.filter(
        (event) => event.event_type !== "approval_requested",
      ),
      rollback_expectations: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate control intent failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_control_intent.source_ref_required",
          path: "/source_refs",
          message: "Substrate control intent requires one or more source refs.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Substrate control intent requires policy gate refs.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.approval_required",
          path: "/approval_refs",
          message:
            "Approval-gated or risky substrate control intent requires approval refs.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.audit_event_required",
          path: "/audit_event_plan/approval_requested",
          message: "Substrate control intent requires approval_requested audit event.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.rollback_expectation_required",
          path: "/rollback_expectations",
          message: "Risky substrate control intent requires rollback expectations.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe substrate authority", () => {
    const result = createSubstrateControlIntent({
      target_substrate_kind: "root_shells",
      requested_control_mode: "forbidden_mutation",
      capability: "ssh.raw.execute",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate control intent failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_control_intent.invalid_substrate_kind",
          path: "/target_substrate_kind",
          message: "Substrate control intent target substrate kind is unsupported.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.unsafe_substrate_authority",
          path: "/capability",
          message: "Substrate control intent capability requests unsafe authority.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.unsafe_substrate_authority",
          path: "/requested_control_mode",
          message: "Forbidden mutation cannot be requested as a control intent.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("root_shells");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createSubstrateControlIntent({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      result_expectations: {
        ...defaultSubstrateControlIntent.result_expectations,
        operator_visible_summary: "show PASSWORD and PRIVATE KEY",
      },
      blocked_live_actions: ["database.write.execute", "secret:prod-api-key"],
      side_effects: [{ effect_type: "deploy" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected substrate control intent failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "substrate_control_intent.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.secret_value_forbidden",
          path: "/result_expectations",
          message:
            "Substrate control intent result expectations cannot contain secrets.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.secret_value_forbidden",
          path: "/blocked_live_actions/1",
          message: "Blocked live actions cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.unexpected_field",
          path: "/command",
          message: "Unexpected substrate control intent request field.",
          severity: "error",
        },
        {
          code: "substrate_control_intent.side_effects_forbidden",
          path: "/side_effects",
          message: "Substrate control intent must preserve side_effects: [].",
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
