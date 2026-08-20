import { describe, expect, it } from "vitest";
import {
  agentCoreMcpFeatureCatalogContract,
  createAgentCoreMcpFeatureCatalog,
  type AgentCoreMcpFeatureCatalogRequest,
} from "../src/index.js";

const createdAt = new Date("2026-06-11T00:00:00.000Z");

describe("agent core MCP feature catalog", () => {
  it("creates source-only MCP and probe feature catalog", () => {
    const result = createAgentCoreMcpFeatureCatalog(validCatalog(), {
      now: createdAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected feature catalog success");
    }

    expect(result.catalog).toMatchObject({
      contract_id: agentCoreMcpFeatureCatalogContract.contract_id,
      request_id: "catalog_req_001",
      catalog_ref: "catalog.agent_core_mcp.bp0602",
      packet_ref: "BP-0602",
      owner_ref: "human.jeff",
      created_at: "2026-06-11T00:00:00.000Z",
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      probe_execution_allowed: false,
      hardware_probe_execution_allowed: false,
      local_model_start_allowed: false,
      local_model_install_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      secret_value_allowed: false,
      side_effects: [],
    });
    expect(result.catalog.feature_kinds).toEqual(
      expect.arrayContaining([
        "mcp_tool_descriptor",
        "mcp_resource_descriptor",
        "mcp_roots_boundary",
        "hardware_inventory_probe",
        "os_capability_probe",
        "model_runtime_probe",
        "sandbox_capability_probe",
        "policy_graph_ref",
      ]),
    );
    expect(result.catalog.probe_target_refs).toEqual(
      expect.arrayContaining([
        "target.local_mac",
        "target.linux_node",
        "target.windows_node",
        "target.cloud_runner",
      ]),
    );
    expect(result.catalog.denied_runtime_behavior).toEqual(
      expect.arrayContaining([
        "probe_execution",
        "hardware_probe_execution",
        "provider_api_calls",
        "gateway_mcp_mutation",
        "local_model_start",
      ]),
    );
  });

  it("keeps graph links between features, targets, approvals, audit, and trace", () => {
    const result = createAgentCoreMcpFeatureCatalog(validCatalog(), {
      now: createdAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected graph catalog success");
    }

    expect(result.catalog.policy_graph_link_refs).toEqual(
      expect.arrayContaining([
        "link.hardware.bounded_by_approval",
        "link.mcp_tool.emits_audit",
        "link.model_probe.redacts_trace",
      ]),
    );
    expect(result.catalog.approval_refs).toEqual(["approval.human_review"]);
    expect(result.catalog.audit_event_refs).toEqual(["audit.feature_catalog.inspect"]);
    expect(result.catalog.trace_context_refs).toEqual([
      "trace.feature_catalog.redacted",
    ]);
  });

  it("fails closed for execution, mutation, secrets, and broken graph refs", () => {
    const result = createAgentCoreMcpFeatureCatalog(
      validCatalog({
        provider_dispatch_allowed: true,
        provider_api_calls_allowed: true,
        probe_execution_allowed: true,
        hardware_probe_execution_allowed: true,
        local_model_start_allowed: true,
        local_model_install_allowed: true,
        gateway_mcp_mutation_allowed: true,
        runtime_mutation_allowed: true,
        repo_write_allowed: true,
        secret_value_allowed: true,
        side_effects: [{ effect_type: "probe_hardware" }],
        features: [
          {
            ...validCatalog().features[0],
            descriptor_refs: ["sk-test-redacted"],
            execution_allowed: true,
          },
        ],
        policy_graph_links: [
          {
            ...validCatalog().policy_graph_links[0],
            from_ref: "feature.missing",
          },
        ],
      } as Partial<AgentCoreMcpFeatureCatalogRequest>),
      { now: createdAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected feature catalog failure");
    }

    expect(result).toMatchObject({
      catalog: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.secret_value_embedded",
          path: "/features/0/descriptor_refs/0",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.provider_dispatch_forbidden",
          path: "/provider_dispatch_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.provider_api_calls_forbidden",
          path: "/provider_api_calls_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.probe_execution_forbidden",
          path: "/probe_execution_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.hardware_probe_execution_forbidden",
          path: "/hardware_probe_execution_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.local_model_start_forbidden",
          path: "/local_model_start_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.local_model_install_forbidden",
          path: "/local_model_install_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.gateway_mcp_mutation_forbidden",
          path: "/gateway_mcp_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.runtime_mutation_forbidden",
          path: "/runtime_mutation_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.repo_write_forbidden",
          path: "/repo_write_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.secret_value_forbidden",
          path: "/secret_value_allowed",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.side_effects_forbidden",
          path: "/side_effects",
        }),
        expect.objectContaining({
          code: "agent_core_mcp_feature_catalog.invalid_ref",
          path: "/policy_graph_links/0/from_ref",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("sk-test-redacted");
  });
});

function validCatalog(
  overrides: Partial<AgentCoreMcpFeatureCatalogRequest> = {},
): AgentCoreMcpFeatureCatalogRequest {
  return {
    request_id: "catalog_req_001",
    catalog_ref: "catalog.agent_core_mcp.bp0602",
    packet_ref: "BP-0602",
    owner_ref: "human.jeff",
    created_at: createdAt.toISOString(),
    probe_targets: [
      target("target.local_mac", "local_machine", "macOS Local Machine", "macos"),
      target("target.linux_node", "remote_node", "Linux Node", "linux"),
      target("target.windows_node", "remote_node", "Windows Node", "windows"),
      target("target.cloud_runner", "cloud_runner", "Cloud Runner", "cloud_worker"),
    ],
    features: [
      feature("feature.mcp.tools", "mcp_tool_descriptor", ["target.local_mac"]),
      feature("feature.mcp.resources", "mcp_resource_descriptor", ["target.local_mac"]),
      feature("feature.mcp.roots", "mcp_roots_boundary", ["target.local_mac"]),
      feature("feature.hardware.inventory", "hardware_inventory_probe", [
        "target.local_mac",
        "target.linux_node",
        "target.windows_node",
      ]),
      feature("feature.os.capabilities", "os_capability_probe", [
        "target.local_mac",
        "target.linux_node",
        "target.windows_node",
      ]),
      feature("feature.model.runtime", "model_runtime_probe", [
        "target.local_mac",
        "target.cloud_runner",
      ]),
      feature("feature.sandbox.capabilities", "sandbox_capability_probe", [
        "target.cloud_runner",
      ]),
      feature("feature.policy.graph", "policy_graph_ref", ["target.local_mac"]),
    ],
    policy_graph_links: [
      link(
        "link.hardware.bounded_by_approval",
        "feature.hardware.inventory",
        "approval.human_review",
        "bounded_by",
        "approval_required",
      ),
      link(
        "link.mcp_tool.emits_audit",
        "feature.mcp.tools",
        "audit.feature_catalog.inspect",
        "emits_audit",
        "observe",
      ),
      link(
        "link.model_probe.redacts_trace",
        "feature.model.runtime",
        "trace.feature_catalog.redacted",
        "redacts",
        "preview_only",
      ),
    ],
    approval_refs: ["approval.human_review"],
    audit_event_refs: ["audit.feature_catalog.inspect"],
    trace_context_refs: ["trace.feature_catalog.redacted"],
    provider_dispatch_allowed: false,
    provider_api_calls_allowed: false,
    probe_execution_allowed: false,
    hardware_probe_execution_allowed: false,
    local_model_start_allowed: false,
    local_model_install_allowed: false,
    gateway_mcp_mutation_allowed: false,
    runtime_mutation_allowed: false,
    repo_write_allowed: false,
    secret_value_allowed: false,
    side_effects: [],
    ...overrides,
  };
}

function target(
  targetRef: string,
  targetKind: AgentCoreMcpFeatureCatalogRequest["probe_targets"][number]["target_kind"],
  displayName: string,
  operatingSystem: AgentCoreMcpFeatureCatalogRequest["probe_targets"][number]["operating_system"],
): AgentCoreMcpFeatureCatalogRequest["probe_targets"][number] {
  return {
    target_ref: targetRef,
    target_kind: targetKind,
    display_name: displayName,
    operating_system: operatingSystem,
    architecture_ref: "arch.declared",
    ownership_ref: "owner.jeff",
    capability_manifest_ref: `cap.${targetRef}`,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function feature(
  featureRef: string,
  featureKind: AgentCoreMcpFeatureCatalogRequest["features"][number]["feature_kind"],
  targetRefs: string[],
): AgentCoreMcpFeatureCatalogRequest["features"][number] {
  return {
    feature_ref: featureRef,
    display_name: featureRef,
    feature_kind: featureKind,
    discovery_mode: featureKind.includes("probe")
      ? "read_only_probe_planned"
      : "mcp_descriptor_ref",
    target_refs: targetRefs,
    descriptor_refs: [`descriptor.${featureRef}`],
    data_classes_allowed: ["public", "internal"],
    policy_effect: featureKind.includes("probe") ? "approval_required" : "observe",
    read_only: true,
    execution_allowed: false,
    mutation_allowed: false,
    secret_value_allowed: false,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}

function link(
  graphLinkRef: string,
  fromRef: string,
  toRef: string,
  relation: AgentCoreMcpFeatureCatalogRequest["policy_graph_links"][number]["relation"],
  policyEffect: AgentCoreMcpFeatureCatalogRequest["policy_graph_links"][number]["policy_effect"],
): AgentCoreMcpFeatureCatalogRequest["policy_graph_links"][number] {
  return {
    graph_link_ref: graphLinkRef,
    from_ref: fromRef,
    to_ref: toRef,
    relation,
    policy_effect: policyEffect,
    source_refs: ["docs/reference/CONTRACT_PROVENANCE.md"],
  };
}
