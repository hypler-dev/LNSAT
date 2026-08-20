import { describe, expect, it } from "vitest";
import {
  agentCoreFeatureGraphAlignmentContract,
  createAgentCoreFeatureGraphAlignment,
  type AgentCoreFeatureGraphAlignmentRequest,
} from "../src/index.js";

const createdAt = new Date("2026-06-11T00:00:00.000Z");

describe("agent core feature graph alignment", () => {
  it("aligns loop graph refs with feature catalog refs for read-only inspection", () => {
    const result = createAgentCoreFeatureGraphAlignment(validAlignment(), {
      now: createdAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected graph alignment success");
    }

    expect(result.alignment).toMatchObject({
      contract_id: agentCoreFeatureGraphAlignmentContract.contract_id,
      request_id: "alignment_req_001",
      alignment_ref: "alignment.agent_core.bp0603",
      packet_ref: "BP-0603",
      owner_ref: "human.jeff",
      loop_ref: "loop.agent_management.bp0601",
      catalog_ref: "catalog.agent_core_mcp.bp0602",
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      inspection_execution_allowed: false,
      probe_execution_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      local_model_start_allowed: false,
      local_model_install_allowed: false,
      secret_value_allowed: false,
      source_revision_blessing_allowed: false,
      release_execution_allowed: false,
      side_effects: [],
      coverage: {
        loop_graph_nodes: true,
        loop_graph_edges: true,
        catalog_features: true,
        probe_targets: true,
        policy_graph_links: true,
        read_only_inspections: true,
      },
    });
    expect(result.alignment.alignment_node_kinds).toEqual(
      expect.arrayContaining([
        "agent_loop_graph_node",
        "agent_loop_graph_edge",
        "mcp_feature",
        "probe_target",
        "policy_graph_link",
        "read_only_inspection_ref",
      ]),
    );
    expect(result.alignment.alignment_relations).toEqual(
      expect.arrayContaining(["aligns_with", "bounded_by", "emits_audit", "redacts"]),
    );
    expect(result.alignment.read_only_inspection_kinds).toEqual(
      expect.arrayContaining([
        "mcp_tool_descriptor_readback",
        "hardware_inventory_read_only_probe_ref",
        "model_runtime_read_only_probe_ref",
      ]),
    );
  });

  it("preserves read-only evidence refs and denied runtime behavior", () => {
    const result = createAgentCoreFeatureGraphAlignment(validAlignment(), {
      now: createdAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected read-only inspection success");
    }

    expect(result.alignment.read_only_inspection_refs).toEqual(
      expect.arrayContaining([
        "inspect.mcp.tools",
        "inspect.hardware.inventory",
        "inspect.model.runtime",
      ]),
    );
    expect(result.alignment.approval_refs).toEqual(["approval.human_review"]);
    expect(result.alignment.audit_event_refs).toEqual(["audit.feature_graph.inspect"]);
    expect(result.alignment.trace_context_refs).toEqual([
      "trace.feature_graph.redacted",
    ]);
    expect(result.alignment.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "inspection_execution",
        "probe_execution",
        "provider_dispatch",
        "gateway_mcp_mutation",
        "local_model_start",
        "source_revision_blessing",
      ]),
    );
  });

  it("fails closed for execution, mutation, secrets, and broken inspection refs", () => {
    const result = createAgentCoreFeatureGraphAlignment(
      validAlignment({
        provider_dispatch_allowed: true,
        provider_api_calls_allowed: true,
        inspection_execution_allowed: true,
        probe_execution_allowed: true,
        gateway_mcp_mutation_allowed: true,
        runtime_mutation_allowed: true,
        repo_write_allowed: true,
        local_model_start_allowed: true,
        local_model_install_allowed: true,
        secret_value_allowed: true,
        source_revision_blessing_allowed: true,
        release_execution_allowed: true,
        side_effects: [{ effect_type: "inspect_live_mcp" }],
        alignment_nodes: [
          {
            ...validAlignment().alignment_nodes[0],
            label: "sk-test-redacted",
          },
        ],
        alignment_edges: [
          {
            ...validAlignment().alignment_edges[0],
            from_ref: "align.missing",
          },
        ],
        read_only_inspections: [
          {
            ...validAlignment().read_only_inspections[0],
            feature_ref: "align.feature.missing",
            inspection_execution_allowed: true,
            side_effects: [{ effect_type: "probe" }],
          },
        ],
      } as Partial<AgentCoreFeatureGraphAlignmentRequest>),
      { now: createdAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected graph alignment failure");
    }

    expect(result).toMatchObject({
      alignment: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.secret_value_embedded",
          path: "/alignment_nodes/0/label",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.provider_dispatch_forbidden",
          path: "/provider_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.provider_api_calls_forbidden",
          path: "/provider_api_calls_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.inspection_execution_forbidden",
          path: "/inspection_execution_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.probe_execution_forbidden",
          path: "/probe_execution_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.gateway_mcp_mutation_forbidden",
          path: "/gateway_mcp_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.runtime_mutation_forbidden",
          path: "/runtime_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.repo_write_forbidden",
          path: "/repo_write_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.local_model_start_forbidden",
          path: "/local_model_start_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.local_model_install_forbidden",
          path: "/local_model_install_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.secret_value_forbidden",
          path: "/secret_value_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.source_revision_blessing_forbidden",
          path: "/source_revision_blessing_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.release_execution_forbidden",
          path: "/release_execution_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.side_effects_forbidden",
          path: "/side_effects",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.invalid_ref",
          path: "/alignment_edges/0/from_ref",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.invalid_ref",
          path: "/read_only_inspections/0/feature_ref",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.inspection_execution_forbidden",
          path: "/read_only_inspections/0/inspection_execution_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_feature_graph_alignment.side_effects_forbidden",
          path: "/read_only_inspections/0/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("sk-test-redacted");
  });
});

function validAlignment(
  overrides: Partial<AgentCoreFeatureGraphAlignmentRequest> = {},
): AgentCoreFeatureGraphAlignmentRequest {
  return {
    request_id: "alignment_req_001",
    alignment_ref: "alignment.agent_core.bp0603",
    packet_ref: "BP-0603",
    owner_ref: "human.jeff",
    loop_ref: "loop.agent_management.bp0601",
    catalog_ref: "catalog.agent_core_mcp.bp0602",
    alignment_nodes: [
      node(
        "align.loop.node.broker",
        "graph.agent.delegation_broker",
        "agent_loop_graph_node",
      ),
      node(
        "align.loop.edge.broker_policy",
        "edge.broker.constrained_by_policy",
        "agent_loop_graph_edge",
      ),
      node("align.feature.mcp_tools", "feature.mcp.tools", "mcp_feature"),
      node(
        "align.feature.hardware_inventory",
        "feature.hardware.inventory",
        "mcp_feature",
      ),
      node("align.feature.model_runtime", "feature.model.runtime", "mcp_feature"),
      node("align.target.local_mac", "target.local_mac", "probe_target"),
      node("align.target.cloud_runner", "target.cloud_runner", "probe_target"),
      node(
        "align.policy.hardware_approval",
        "link.hardware.bounded_by_approval",
        "policy_graph_link",
      ),
      node("align.approval.human_review", "approval.human_review", "approval_gate"),
      node("align.audit.feature_graph", "audit.feature_graph.inspect", "audit_event"),
      node(
        "align.trace.feature_graph",
        "trace.feature_graph.redacted",
        "trace_context",
      ),
      node(
        "align.inspect.hardware_inventory",
        "inspect.hardware.inventory",
        "read_only_inspection_ref",
      ),
    ],
    alignment_edges: [
      edge(
        "align.edge.loop_to_mcp_tools",
        "align.loop.node.broker",
        "align.feature.mcp_tools",
        "aligns_with",
        "observe",
      ),
      edge(
        "align.edge.hardware_to_target",
        "align.feature.hardware_inventory",
        "align.target.local_mac",
        "describes",
        "preview_only",
      ),
      edge(
        "align.edge.hardware_approval",
        "align.feature.hardware_inventory",
        "align.approval.human_review",
        "bounded_by",
        "approval_required",
      ),
      edge(
        "align.edge.inspect_audit",
        "align.inspect.hardware_inventory",
        "align.audit.feature_graph",
        "emits_audit",
        "observe",
      ),
      edge(
        "align.edge.inspect_trace",
        "align.inspect.hardware_inventory",
        "align.trace.feature_graph",
        "redacts",
        "preview_only",
      ),
    ],
    read_only_inspections: [
      inspection(
        "inspect.mcp.tools",
        "mcp_tool_descriptor_readback",
        "align.target.local_mac",
        "align.feature.mcp_tools",
      ),
      inspection(
        "inspect.hardware.inventory",
        "hardware_inventory_read_only_probe_ref",
        "align.target.local_mac",
        "align.feature.hardware_inventory",
      ),
      inspection(
        "inspect.model.runtime",
        "model_runtime_read_only_probe_ref",
        "align.target.cloud_runner",
        "align.feature.model_runtime",
      ),
    ],
    approval_refs: ["approval.human_review"],
    audit_event_refs: ["audit.feature_graph.inspect"],
    trace_context_refs: ["trace.feature_graph.redacted"],
    created_at: createdAt.toISOString(),
    provider_dispatch_allowed: false,
    provider_api_calls_allowed: false,
    inspection_execution_allowed: false,
    probe_execution_allowed: false,
    gateway_mcp_mutation_allowed: false,
    runtime_mutation_allowed: false,
    repo_write_allowed: false,
    local_model_start_allowed: false,
    local_model_install_allowed: false,
    secret_value_allowed: false,
    source_revision_blessing_allowed: false,
    release_execution_allowed: false,
    side_effects: [],
    ...overrides,
  };
}

function node(
  alignmentNodeRef: string,
  sourceRef: string,
  nodeKind: AgentCoreFeatureGraphAlignmentRequest["alignment_nodes"][number]["node_kind"],
): AgentCoreFeatureGraphAlignmentRequest["alignment_nodes"][number] {
  return {
    alignment_node_ref: alignmentNodeRef,
    source_ref: sourceRef,
    node_kind: nodeKind,
    label: sourceRef,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function edge(
  alignmentEdgeRef: string,
  fromRef: string,
  toRef: string,
  relation: AgentCoreFeatureGraphAlignmentRequest["alignment_edges"][number]["relation"],
  policyEffect: AgentCoreFeatureGraphAlignmentRequest["alignment_edges"][number]["policy_effect"],
): AgentCoreFeatureGraphAlignmentRequest["alignment_edges"][number] {
  return {
    alignment_edge_ref: alignmentEdgeRef,
    from_ref: fromRef,
    to_ref: toRef,
    relation,
    policy_effect: policyEffect,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function inspection(
  inspectionRef: string,
  inspectionKind: AgentCoreFeatureGraphAlignmentRequest["read_only_inspections"][number]["inspection_kind"],
  targetRef: string,
  featureRef: string,
): AgentCoreFeatureGraphAlignmentRequest["read_only_inspections"][number] {
  return {
    inspection_ref: inspectionRef,
    inspection_kind: inspectionKind,
    target_ref: targetRef,
    feature_ref: featureRef,
    approval_ref: "approval.human_review",
    audit_event_ref: "audit.feature_graph.inspect",
    trace_context_ref: "trace.feature_graph.redacted",
    mode: "read_only_reference",
    inspection_execution_allowed: false,
    probe_execution_allowed: false,
    mutation_allowed: false,
    provider_dispatch_allowed: false,
    provider_api_calls_allowed: false,
    uses_secret_value: false,
    side_effects: [],
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}
