import { describe, expect, it } from "vitest";
import {
  capabilityBrokerRequestContract,
  createCapabilityBrokerRequest,
  defaultCapabilityBrokerRequest,
  defaultSubstrateControlIntent,
  substrateControlIntentContract,
} from "../src/index.js";

describe("capability broker request contract", () => {
  it("emits source-only capability broker request evidence", () => {
    const result = createCapabilityBrokerRequest();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected capability broker request success");
    }

    expect(result.capability_broker_request).toMatchObject({
      contract_id: capabilityBrokerRequestContract.contract_id,
      request_version: "0.1",
      requested_actor: {
        actor_ref: "agent:codex",
        actor_type: "agent",
        role_ref: "role:ops_assistant",
      },
      capability: "service.restart.request",
      risk_level: 5,
      target_substrate_kind: "services",
      requested_control_mode: "approval_gated_mutation",
      broker_decision_posture: "classify_and_propose_only_no_dispatch",
      proposed_adapter_class: "service_control_adapter",
      proposed_adapter_authority: "proposal_only_no_dispatch",
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });
    expect(result.capability_broker_request.substrate_control_intent_refs).toEqual([
      {
        intent_ref: "intent:bp0096-substrate-control-intent",
        evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
        contract_id: substrateControlIntentContract.contract_id,
        summary: "BP-0096 source-only substrate control intent evidence",
      },
    ]);
    expect(result.capability_broker_request.required_policy_gates).toEqual(
      expect.arrayContaining([
        "capability.broker.policy.review",
        "services.mutation.approval",
        "substrate.intent.policy.review",
      ]),
    );
    expect(result.capability_broker_request.required_approvals).toEqual(
      expect.arrayContaining([
        "approval:human-substrate-control",
        "approval:rollback-owner",
      ]),
    );
    expect(result.capability_broker_request.required_audit_events).toEqual(
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
    expect(result.capability_broker_request.blocked_broker_dispatch_actions).toEqual(
      expect.arrayContaining([
        "capability.broker.dispatch.execute",
        "substrate.adapter.invoke",
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
    expect(result.capability_broker_request.denied_broker_dispatch_behavior).toEqual(
      expect.arrayContaining([
        "broker classifies request only",
        "broker proposes adapter class only",
        "broker does not invoke substrate adapter",
      ]),
    );
    expect(result.capability_broker_request.denied_live_behavior).toEqual(
      expect.arrayContaining([
        "no live broker dispatch",
        "no live execution",
        "no secret values",
      ]),
    );
    expect(result.capability_broker_request.source_refs).toEqual(
      expect.arrayContaining([
        "doc:docs/architecture/PACKET_MODEL.md",
        "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
        "ticket:BP-0102: source-only capability broker request contract",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("accepts a source-backed observation broker request without approval requirement", () => {
    const result = createCapabilityBrokerRequest({
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
          source_ref: "ticket:BP-0102",
          summary: "source-only service observation broker request",
        },
      ],
      substrate_control_intent_refs: [
        {
          intent_ref: "intent:bp0096-observation",
          evidence_ref: "evidence:bp0096-observation",
          contract_id: substrateControlIntentContract.contract_id,
          summary: "source-only observation substrate control intent",
        },
      ],
      policy_gate_refs: [
        {
          gate_ref: "capability.broker.policy.review",
          decision_ref: "policy_decision:service-status-read",
          required: true,
        },
      ],
      approval_refs: [],
      audit_event_plan: defaultSubstrateControlIntent.audit_event_plan,
      result_expectations: defaultCapabilityBrokerRequest.result_expectations,
      rollback_expectations: [],
      proposed_adapter_class: "service_control_adapter",
      blocked_broker_dispatch_actions:
        defaultCapabilityBrokerRequest.blocked_broker_dispatch_actions,
      denied_broker_dispatch_behavior:
        defaultCapabilityBrokerRequest.denied_broker_dispatch_behavior,
      denied_live_behavior: ["no live broker dispatch", "no live execution"],
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
      side_effects: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected capability broker request success");
    }

    expect(result.capability_broker_request.required_approvals).toEqual([]);
    expect(result.capability_broker_request.rollback_expectations).toEqual([]);
    expect(result.capability_broker_request.source_refs).toEqual([
      "ticket:BP-0102: source-only service observation broker request",
    ]);
  });

  it("fails closed for live broker dispatch and live execution", () => {
    const result = createCapabilityBrokerRequest({
      live_broker_dispatch_allowed: true,
      live_execution_allowed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected capability broker request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "capability_broker_request.live_broker_dispatch_forbidden",
          path: "/live_broker_dispatch_allowed",
          message: "Capability broker request cannot enable live broker dispatch.",
          severity: "error",
        },
        {
          code: "capability_broker_request.live_execution_forbidden",
          path: "/live_execution_allowed",
          message: "Capability broker request cannot enable live execution.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for missing source, intent, policy, approval, audit, and rollback evidence", () => {
    const result = createCapabilityBrokerRequest({
      source_refs: [],
      substrate_control_intent_refs: [],
      policy_gate_refs: [],
      approval_refs: [],
      audit_event_plan: defaultSubstrateControlIntent.audit_event_plan.filter(
        (event) => event.event_type !== "policy_checked",
      ),
      rollback_expectations: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected capability broker request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "capability_broker_request.source_ref_required",
          path: "/source_refs",
          message: "Capability broker request requires one or more source refs.",
          severity: "error",
        },
        {
          code: "capability_broker_request.substrate_control_intent_ref_required",
          path: "/substrate_control_intent_refs",
          message: "Capability broker request requires substrate control intent refs.",
          severity: "error",
        },
        {
          code: "capability_broker_request.policy_gate_required",
          path: "/policy_gate_refs",
          message: "Capability broker request requires policy gate refs.",
          severity: "error",
        },
        {
          code: "capability_broker_request.approval_required",
          path: "/approval_refs",
          message:
            "Approval-gated or risky capability broker request requires approval refs.",
          severity: "error",
        },
        {
          code: "capability_broker_request.audit_event_required",
          path: "/audit_event_plan/policy_checked",
          message: "Capability broker request requires policy_checked audit event.",
          severity: "error",
        },
        {
          code: "capability_broker_request.rollback_expectation_required",
          path: "/rollback_expectations",
          message: "Risky capability broker request requires rollback expectations.",
          severity: "error",
        },
      ]),
    );
  });

  it("fails closed for unsafe adapter authority", () => {
    const result = createCapabilityBrokerRequest({
      target_substrate_kind: "root_shells",
      requested_control_mode: "forbidden_mutation",
      capability: "ssh.raw.execute",
      proposed_adapter_class: "root.shell.adapter",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected capability broker request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "capability_broker_request.invalid_substrate_kind",
          path: "/target_substrate_kind",
          message: "Capability broker request target substrate kind is unsupported.",
          severity: "error",
        },
        {
          code: "capability_broker_request.unsafe_adapter_authority",
          path: "/capability",
          message: "Capability broker request capability asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "capability_broker_request.unsafe_adapter_authority",
          path: "/proposed_adapter_class",
          message: "Capability broker request adapter class asks for unsafe authority.",
          severity: "error",
        },
        {
          code: "capability_broker_request.unsafe_adapter_authority",
          path: "/requested_control_mode",
          message: "Forbidden mutation cannot be requested through capability broker.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("root_shells");
    expect(JSON.stringify(result)).not.toContain("root.shell.adapter");
  });

  it("fails closed for secret-like values, side effects, and raw command echo", () => {
    const result = createCapabilityBrokerRequest({
      source_refs: [
        {
          source_ref: "doc:docs/reference/CONTRACT_PROVENANCE.md",
          summary: "read DATABASE_URL TOKEN and run raw command",
        },
      ],
      substrate_control_intent_refs: [
        {
          intent_ref: "intent:bp0096-secret",
          evidence_ref: "evidence:secret:prod-api-key",
          contract_id: substrateControlIntentContract.contract_id,
          summary: "source intent with TOKEN",
        },
      ],
      result_expectations: {
        ...defaultCapabilityBrokerRequest.result_expectations,
        operator_visible_summary: "show PASSWORD and PRIVATE KEY",
      },
      blocked_broker_dispatch_actions: [
        "capability.broker.dispatch.execute",
        "secret:prod-api-key",
      ],
      side_effects: [{ effect_type: "dispatch" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected capability broker request failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "capability_broker_request.secret_value_forbidden",
          path: "/source_refs/0",
          message: "Source refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "capability_broker_request.secret_value_forbidden",
          path: "/substrate_control_intent_refs/0",
          message: "Substrate control intent refs cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "capability_broker_request.secret_value_forbidden",
          path: "/result_expectations",
          message:
            "Capability broker request result expectations cannot contain secrets.",
          severity: "error",
        },
        {
          code: "capability_broker_request.secret_value_forbidden",
          path: "/blocked_broker_dispatch_actions/1",
          message: "Blocked broker dispatch actions cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "capability_broker_request.unexpected_field",
          path: "/command",
          message: "Unexpected capability broker request field.",
          severity: "error",
        },
        {
          code: "capability_broker_request.side_effects_forbidden",
          path: "/side_effects",
          message: "Capability broker request must preserve side_effects: [].",
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
