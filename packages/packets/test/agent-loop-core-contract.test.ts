import { describe, expect, it } from "vitest";
import {
  agentLoopCoreContract,
  createAgentLoopCorePlan,
  type AgentLoopCorePlanRequest,
} from "../src/index.js";

const createdAt = new Date("2026-06-11T00:00:00.000Z");

describe("agent loop core contract", () => {
  it("creates source-only loop plan for mixed agent management methods", () => {
    const result = createAgentLoopCorePlan(validPlan(), { now: createdAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected agent loop core plan success");
    }

    expect(result.plan).toMatchObject({
      contract_id: agentLoopCoreContract.contract_id,
      request_id: "loop_req_001",
      loop_ref: "loop.agent_management.bp0601",
      packet_ref: "BP-0601",
      owner_ref: "human.jeff",
      topology: "brokered_multi_agent",
      manager_node_ref: "agent.delegation_broker",
      max_iterations: 5,
      created_at: "2026-06-11T00:00:00.000Z",
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      gateway_mcp_mutation_allowed: false,
      live_connector_allowed: false,
      secret_value_allowed: false,
      source_revision_blessing_allowed: false,
      release_execution_allowed: false,
      side_effects: [],
    });
    expect(result.plan.runtime_families).toEqual(
      expect.arrayContaining([
        "hermes_worker",
        "openai_agents",
        "local_self_hosted",
        "a2a_remote_agent",
      ]),
    );
    expect(result.plan.interop_mapping_refs).toEqual(
      expect.arrayContaining([
        "map.mcp.tool_descriptor",
        "map.a2a.agent_card",
        "map.otel.agent_span",
        "map.sandbox.manifest",
        "map.hardware.inventory",
      ]),
    );
    expect(result.plan.graph_node_refs).toEqual(
      expect.arrayContaining([
        "graph.agent.delegation_broker",
        "graph.policy.guarded_default",
        "graph.tool.repo_read",
        "graph.hardware.local_machine",
        "graph.approval.human_review",
      ]),
    );
    expect(result.plan.graph_edge_refs).toEqual(
      expect.arrayContaining([
        "edge.broker.constrained_by_policy",
        "edge.repo_read.requires_approval",
      ]),
    );
    expect(result.plan.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "provider_dispatch",
        "runtime_mutation",
        "repo_write_from_runtime",
        "gateway_mcp_mutation",
      ]),
    );
  });

  it("supports graph workflow and loose-agent wrapper as reference-only modes", () => {
    const result = createAgentLoopCorePlan(
      validPlan({
        topology: "external_loose_agent_wrap",
        managed_nodes: [
          ...validPlan().managed_nodes,
          {
            node_ref: "agent.openclaw_external",
            display_name: "OpenClaw External Adapter",
            runtime_family: "a2a_remote_agent",
            control_mode: "observe_only",
            provider_ref: "provider.external.openclaw",
            model_profile_ref: "model.external.openclaw.ref",
            default_firewall_level: "strict",
            capability_manifest_ref: "cap.openclaw_external",
            policy_profile_ref: "policy.external_loose_agent",
            audit_profile_ref: "audit.agent_loop.default",
            human_owner_ref: "human.jeff",
            enabled: true,
            policy_authority: false,
            source_refs: ["source:research.external_loose_agent_wrap"],
          },
        ],
        capability_manifests: [
          ...validPlan().capability_manifests,
          {
            manifest_ref: "cap.openclaw_external",
            node_ref: "agent.openclaw_external",
            allow: ["observe.status", "read.capabilities"],
            block: ["execute.tool", "write.repo", "mutate.runtime"],
            tool_descriptor_refs: ["tool.none"],
            data_classes_allowed: ["public"],
            source_refs: ["source:research.external_loose_agent_wrap"],
          },
        ],
      }),
      { now: createdAt },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected loose-agent wrapper success");
    }
    expect(result.plan.topology).toBe("external_loose_agent_wrap");
    expect(result.plan.runtime_families).toEqual(
      expect.arrayContaining(["a2a_remote_agent"]),
    );
  });

  it("fails closed for dispatch, mutation, side effects, secrets, and broken graph refs", () => {
    const plan = validPlan({
      provider_dispatch_allowed: true,
      runtime_mutation_allowed: true,
      repo_write_allowed: true,
      gateway_mcp_mutation_allowed: true,
      live_connector_allowed: true,
      secret_value_allowed: true,
      source_revision_blessing_allowed: true,
      release_execution_allowed: true,
      side_effects: [{ effect_type: "provider_call" }],
      managed_nodes: [
        {
          ...validPlan().managed_nodes[0],
          model_profile_ref: "sk-test-redacted",
          policy_authority: true,
        },
      ],
      graph_edges: [
        {
          ...validPlan().graph_edges[0],
          from_ref: "graph.missing",
        },
      ],
    } as Partial<AgentLoopCorePlanRequest>);

    const result = createAgentLoopCorePlan(plan, { now: createdAt });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected agent loop core plan failure");
    }

    expect(result).toMatchObject({
      plan: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "agent_loop_core.secret_value_embedded",
          path: "/managed_nodes/0/model_profile_ref",
        }),
        expect.objectContaining({
          code: "agent_loop_core.provider_dispatch_forbidden",
          path: "/provider_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "agent_loop_core.runtime_mutation_forbidden",
          path: "/runtime_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_loop_core.repo_write_forbidden",
          path: "/repo_write_allowed",
        }),
        expect.objectContaining({
          code: "agent_loop_core.gateway_mcp_mutation_forbidden",
          path: "/gateway_mcp_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_loop_core.live_connector_forbidden",
          path: "/live_connector_allowed",
        }),
        expect.objectContaining({
          code: "agent_loop_core.secret_value_forbidden",
          path: "/secret_value_allowed",
        }),
        expect.objectContaining({
          code: "agent_loop_core.side_effects_forbidden",
          path: "/side_effects",
        }),
        expect.objectContaining({
          code: "agent_loop_core.invalid_ref",
          path: "/graph_edges/0/from_ref",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("sk-test-redacted");
  });
});

function validPlan(
  overrides: Partial<AgentLoopCorePlanRequest> = {},
): AgentLoopCorePlanRequest {
  return {
    request_id: "loop_req_001",
    loop_ref: "loop.agent_management.bp0601",
    packet_ref: "BP-0601",
    owner_ref: "human.jeff",
    topology: "brokered_multi_agent",
    manager_node_ref: "agent.delegation_broker",
    max_iterations: 5,
    created_at: createdAt.toISOString(),
    budget: {
      token_limit: 40000,
      cost_usd: 0,
      runtime_seconds: 3600,
      context_compaction_policy_ref: "policy.context_compaction.default",
      summarization_strategy_ref: "policy.summarization.source_backed",
      trace_redaction_policy_ref: "policy.trace_redaction.default",
    },
    managed_nodes: [
      node("agent.delegation_broker", "Delegation Broker", "hermes_worker"),
      node("agent.openai_runner", "OpenAI Agent Runner", "openai_agents"),
      node("agent.local_runner", "Self Hosted Runner", "local_self_hosted"),
      node("agent.a2a_remote", "A2A Remote Agent", "a2a_remote_agent"),
    ],
    capability_manifests: [
      manifest("cap.agent.delegation_broker", "agent.delegation_broker"),
      manifest("cap.agent.openai_runner", "agent.openai_runner"),
      manifest("cap.agent.local_runner", "agent.local_runner"),
      manifest("cap.agent.a2a_remote", "agent.a2a_remote"),
    ],
    stop_conditions: [
      stopCondition("stop.max_iterations", "max_iterations"),
      stopCondition("stop.hard_gate", "hard_gate_reached"),
      stopCondition("stop.token_budget", "token_budget"),
    ],
    steps: [
      step("step.read_repo_truth", "agent.delegation_broker", 1, "ready"),
      step("step.plan_agent_work", "agent.openai_runner", 2, "needs_human_review"),
      step("step.self_hosted_review", "agent.local_runner", 3, "deferred"),
      step("step.stop_at_hard_gate", "agent.delegation_broker", 4, "blocked"),
    ],
    interop_mappings: [
      mapping("map.mcp.tool_descriptor", "mcp_tool_descriptor", "mcp.tools.list"),
      mapping("map.a2a.agent_card", "a2a_agent_card", "a2a.agent_card.ref"),
      mapping("map.otel.agent_span", "otel_genai_span", "otel.invoke_agent.ref"),
      mapping("map.sandbox.manifest", "sandbox_manifest", "sandbox.manifest.ref"),
      mapping(
        "map.hardware.inventory",
        "hardware_inventory_probe",
        "probe.hardware.inventory.ref",
      ),
    ],
    policy_decision_refs: [
      refRecord("policy.decision.guardrails", "Source-only guardrails decision"),
    ],
    approval_refs: [refRecord("approval.human_review", "Human approval ref")],
    audit_event_refs: [refRecord("audit.agent_loop.plan", "Append-only audit ref")],
    trace_context_refs: [
      refRecord("trace.agent_loop.context", "Trace context redaction ref"),
    ],
    graph_nodes: [
      graphNode(
        "graph.agent.delegation_broker",
        "managed_agent",
        "agent.delegation_broker",
      ),
      graphNode(
        "graph.policy.guarded_default",
        "policy_profile",
        "policy.decision.guardrails",
      ),
      graphNode("graph.tool.repo_read", "tool_descriptor", "tool.repo_read"),
      graphNode(
        "graph.hardware.local_machine",
        "hardware_profile",
        "hardware.local_machine",
      ),
      graphNode(
        "graph.approval.human_review",
        "approval_gate",
        "approval.human_review",
      ),
      graphNode("graph.audit.agent_loop", "audit_event", "audit.agent_loop.plan"),
    ],
    graph_edges: [
      graphEdge(
        "edge.broker.constrained_by_policy",
        "constrained_by",
        "graph.agent.delegation_broker",
        "graph.policy.guarded_default",
        "block",
      ),
      graphEdge(
        "edge.repo_read.requires_approval",
        "requires_approval",
        "graph.tool.repo_read",
        "graph.approval.human_review",
        "approval_required",
      ),
      graphEdge(
        "edge.broker.emits_audit",
        "emits_audit",
        "graph.agent.delegation_broker",
        "graph.audit.agent_loop",
        "observe",
      ),
    ],
    provider_dispatch_allowed: false,
    runtime_mutation_allowed: false,
    repo_write_allowed: false,
    gateway_mcp_mutation_allowed: false,
    live_connector_allowed: false,
    secret_value_allowed: false,
    source_revision_blessing_allowed: false,
    release_execution_allowed: false,
    side_effects: [],
    ...overrides,
  };
}

function node(
  nodeRef: string,
  displayName: string,
  runtimeFamily: AgentLoopCorePlanRequest["managed_nodes"][number]["runtime_family"],
): AgentLoopCorePlanRequest["managed_nodes"][number] {
  return {
    node_ref: nodeRef,
    display_name: displayName,
    runtime_family: runtimeFamily,
    control_mode: "approval_gated",
    provider_ref: `provider.${runtimeFamily}`,
    model_profile_ref: `model.${runtimeFamily}.ref`,
    default_firewall_level: "guarded",
    capability_manifest_ref: `cap.${nodeRef}`,
    policy_profile_ref: "policy.guarded_default",
    audit_profile_ref: "audit.agent_loop.default",
    human_owner_ref: "human.jeff",
    enabled: true,
    policy_authority: false,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function manifest(
  manifestRef: string,
  nodeRef: string,
): AgentLoopCorePlanRequest["capability_manifests"][number] {
  return {
    manifest_ref: manifestRef,
    node_ref: nodeRef,
    allow: ["read.source", "plan.work", "emit.audit_ref"],
    block: ["dispatch.provider", "write.repo", "mutate.runtime"],
    tool_descriptor_refs: ["tool.repo_read"],
    data_classes_allowed: ["public", "internal"],
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function stopCondition(
  conditionRef: string,
  kind: AgentLoopCorePlanRequest["stop_conditions"][number]["condition_kind"],
): AgentLoopCorePlanRequest["stop_conditions"][number] {
  return {
    condition_ref: conditionRef,
    condition_kind: kind,
    threshold_ref: `threshold.${kind}`,
    action: kind === "hard_gate_reached" ? "pause_for_human_review" : "stop",
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function step(
  stepRef: string,
  nodeRef: string,
  order: number,
  status: AgentLoopCorePlanRequest["steps"][number]["status"],
): AgentLoopCorePlanRequest["steps"][number] {
  return {
    step_ref: stepRef,
    node_ref: nodeRef,
    order,
    status,
    gate_ref: "gate.source_only",
    action_ref: `action.${stepRef}`,
    expected_artifact_ref: `artifact.${stepRef}`,
    can_execute: false,
    can_dispatch_provider: false,
    runtime_mutation_allowed: false,
    repo_write_allowed: false,
    gateway_mcp_mutation_allowed: false,
    uses_secret_value: false,
    side_effects: [],
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function mapping(
  mappingRef: string,
  kind: AgentLoopCorePlanRequest["interop_mappings"][number]["mapping_kind"],
  externalRef: string,
): AgentLoopCorePlanRequest["interop_mappings"][number] {
  return {
    mapping_ref: mappingRef,
    mapping_kind: kind,
    external_ref: externalRef,
    mode: "reference_only",
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function refRecord(
  ref: string,
  summary: string,
): AgentLoopCorePlanRequest["policy_decision_refs"][number] {
  return {
    ref,
    summary,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function graphNode(
  graphNodeRef: string,
  kind: AgentLoopCorePlanRequest["graph_nodes"][number]["node_kind"],
  targetRef: string,
): AgentLoopCorePlanRequest["graph_nodes"][number] {
  return {
    graph_node_ref: graphNodeRef,
    node_kind: kind,
    target_ref: targetRef,
    label: targetRef,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function graphEdge(
  graphEdgeRef: string,
  kind: AgentLoopCorePlanRequest["graph_edges"][number]["edge_kind"],
  fromRef: string,
  toRef: string,
  policyEffect: AgentLoopCorePlanRequest["graph_edges"][number]["policy_effect"],
): AgentLoopCorePlanRequest["graph_edges"][number] {
  return {
    graph_edge_ref: graphEdgeRef,
    edge_kind: kind,
    from_ref: fromRef,
    to_ref: toRef,
    policy_effect: policyEffect,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}
