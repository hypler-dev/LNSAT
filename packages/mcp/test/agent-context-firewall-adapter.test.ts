import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLnsatOfficialMcpSdkServer,
  createLnsatReadOnlyMcpServer,
  inspectAgentContextFirewallThroughMcpAdapterContract,
  mcpAgentContextFirewallToolContract,
  mcpAgentContextFirewallToolRegistration,
} from "../src/index.js";

const now = new Date("2026-06-05T00:00:00.000Z");

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup !== null) {
    await cleanup();
    cleanup = null;
  }
});

describe("@lnsat/mcp BP-0504 agent context firewall MCP adapter contract", () => {
  it("exposes read-only agent context firewall adapter metadata without side effects", () => {
    expect(mcpAgentContextFirewallToolContract).toMatchObject({
      tool: "lnsat.agent.context_firewall.inspect",
      status: "contract_only",
      gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
      gateway_method: "POST",
      gateway_path: "/v1/agents/context-firewall/inspect",
      authority: ["lnsat.gateway.agent_context_firewall.v0_1"],
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      side_effects: [],
    });
    expect(mcpAgentContextFirewallToolContract.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/agent-context-firewall.ts",
        "apps/api/src/agent-context-firewall.ts",
        "packages/mcp/src/index.ts",
      ]),
    );
  });

  it("delegates valid firewall inspection to the Gateway contract", async () => {
    const response = await inspectAgentContextFirewallThroughMcpAdapterContract(
      {
        request_id: "req_bp0504_mcp_agent_context_firewall",
        firewall_bundle_request: validFirewallBundle(),
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAgentContextFirewallToolContract.tool,
      gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
      gateway_response: {
        ok: true,
        request_id: "req_bp0504_mcp_agent_context_firewall",
        inspected_at: "2026-06-05T00:00:00.000Z",
        firewall_contract_id: "lnsat.agent.context_firewall.v0_1",
        firewall_level: "guarded",
        provider_dispatch_allowed: false,
        runtime_mutation_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      side_effects: [],
    });

    expect(response.gateway_response.ok).toBe(true);
    if (!response.gateway_response.ok) {
      throw new Error("expected MCP agent context firewall success");
    }

    expect(response.gateway_response.context_decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_ref: "ctx.public.packet_scope",
          decision: "include",
        }),
        expect.objectContaining({
          item_ref: "ctx.secret.ref",
          decision: "exclude",
          reason_codes: ["context.secret_like_content"],
        }),
      ]),
    );
    expect(response.gateway_response.excluded_context_refs).toEqual(["ctx.secret.ref"]);
  });

  it("fails closed without raw echo when Gateway or firewall validation rejects input", async () => {
    const response = await inspectAgentContextFirewallThroughMcpAdapterContract(
      {
        request_id: "req_bp0504_mcp_blocked_firewall",
        firewall_bundle_request: {
          ...validFirewallBundle(),
          provider_dispatch_allowed: true,
          runtime_mutation_allowed: true,
          side_effects: [{ effect_type: "provider_call" }],
          agent_profiles: [
            {
              ...validFirewallBundle().agent_profiles[0],
              model_or_client_ref: "sk-live-inline-secret",
            },
          ],
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpAgentContextFirewallToolContract.tool,
      gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
      gateway_response: {
        ok: false,
        request_id: "req_bp0504_mcp_blocked_firewall",
        agent_context_firewall_bundle: null,
        provider_dispatch_allowed: false,
        runtime_mutation_allowed: false,
        raw_input_content: "withheld",
        side_effects: [],
      },
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("sk-live-inline-secret");
  });

  it("registers agent context firewall on the local MCP surface", async () => {
    const localServer = createLnsatReadOnlyMcpServer({ now: () => now });
    const tools = localServer.listTools();

    expect(tools.tools.map((tool) => tool.name)).toContain(
      mcpAgentContextFirewallToolContract.tool,
    );
    expect(tools.tools).toHaveLength(29);
    expect(tools.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: mcpAgentContextFirewallToolContract.tool,
          title: "Inspect agent context firewall",
          annotations: expect.objectContaining({
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
          }),
          gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
          provider_dispatch_allowed: false,
          runtime_mutation_allowed: false,
          side_effects: [],
        }),
      ]),
    );

    const response = await localServer.callTool({
      name: mcpAgentContextFirewallToolContract.tool,
      arguments: {
        request_id: "req_bp0505_local_agent_context_firewall",
        firewall_bundle_request: validFirewallBundle("BP-0505"),
      },
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpAgentContextFirewallToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            tool: mcpAgentContextFirewallToolContract.tool,
            gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
            gateway_response: {
              ok: true,
              request_id: "req_bp0505_local_agent_context_firewall",
              provider_dispatch_allowed: false,
              runtime_mutation_allowed: false,
              side_effects: [],
            },
            provider_dispatch_allowed: false,
            runtime_mutation_allowed: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
  });

  it("registers agent context firewall on the official stdio MCP surface", async () => {
    const { client } = await createConnectedSdkClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toContain(
      mcpAgentContextFirewallToolContract.tool,
    );
    expect(tools.tools).toHaveLength(29);
    expect(tools.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: mcpAgentContextFirewallToolContract.tool,
          title: mcpAgentContextFirewallToolRegistration.title,
          annotations: expect.objectContaining({
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
          }),
        }),
      ]),
    );

    const response = await client.callTool({
      name: mcpAgentContextFirewallToolContract.tool,
      arguments: {
        request_id: "req_bp0505_official_agent_context_firewall",
        firewall_bundle_request: validFirewallBundle("BP-0505"),
      },
    });

    expect(response.content).toEqual([
      {
        type: "text",
        text: expect.stringContaining(
          '"request_id":"req_bp0505_official_agent_context_firewall"',
        ),
      },
    ]);
    expect(JSON.stringify(response)).toContain(
      '"gateway_contract_id":"lnsat.gateway.agent_context_firewall.v0_1"',
    );
    expect(JSON.stringify(response)).toContain('"side_effects":[]');
  });
});

async function createConnectedSdkClient(): Promise<{ client: Client }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLnsatOfficialMcpSdkServer({
    now: () => now,
  });
  const client = new Client({
    name: "lnsat-bp0505-test-client",
    version: "0.1.0",
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  cleanup = async () => {
    await client.close();
    await server.close();
  };

  return { client };
}

function validFirewallBundle(packetRef = "BP-0504") {
  return {
    request_id: "ctx_firewall_0504_mcp",
    project_id: "lnsat",
    actor_id: "agent.codex",
    packet_ref: packetRef,
    firewall_level: "guarded",
    created_at: now.toISOString(),
    agent_profiles: [
      {
        agent_id: "agent.delegation_broker",
        display_name: "Delegation Broker",
        agent_kind: "internal_delegation_broker",
        provider_kind: "human",
        provider_ref: "provider.human.owner",
        model_or_client_ref: "seat.owner",
        default_role: "approval_triage",
        default_skillsets: ["source-review"],
        default_control_level: "managed_autonomy",
        default_firewall_level: "guarded",
        permission_profile_ref: "perm.guarded_default",
        context_policy_ref: "ctx.policy.guarded_default",
        secret_ref_policy: "secret_refs_only",
        audit_profile_ref: "audit.default",
        operator_owner_ref: "human.jeff",
        enabled: true,
        policy_authority: false,
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    provider_profiles: [
      {
        provider_ref: "provider.openai",
        display_name: "OpenAI",
        provider_kind: "commercial_api",
        allowed_data_classes: ["public", "internal"],
        secret_ref_policy: "secret_refs_only",
        live_dispatch_allowed: false,
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    permission_profiles: [
      {
        permission_profile_ref: "perm.guarded_default",
        display_name: "Guarded Default",
        default_mode: "preview_only",
        capability_modes: [
          {
            capability: "context.compile",
            mode: "allowed",
            resource_refs: ["repo:lnsat"],
          },
        ],
        source_refs: [
          "doc:docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
        ],
      },
    ],
    context_items: [
      {
        item_ref: "ctx.public.packet_scope",
        source_family: "packet_scope",
        source_ref: "packet:BP-0504",
        summary: "read-only MCP adapter delegates to Gateway",
        data_class: "public",
        trust_level: "source_backed",
      },
      {
        item_ref: "ctx.secret.ref",
        source_family: "provider_profile",
        source_ref: "secret-ref:provider.openai.api",
        summary: "credential reference only value withheld",
        data_class: "secret",
        trust_level: "operator_supplied",
      },
    ],
    provider_dispatch_allowed: false,
    runtime_mutation_allowed: false,
    side_effects: [],
  };
}
