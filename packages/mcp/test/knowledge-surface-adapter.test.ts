import { describe, expect, it } from "vitest";
import {
  createLnsatReadOnlyMcpServer,
  inspectKnowledgeSurfaceThroughMcpAdapterContract,
  mcpKnowledgeSurfaceToolContract,
  mcpAgentContextFirewallToolContract,
  mcpKnowledgeSurfaceToolRegistration,
} from "../src/index.js";

const knowledgeGatewaySourcesContractId = "lnsat.gateway.knowledge.sources.v0_1";
const knowledgeGatewaySearchContractId = "lnsat.gateway.knowledge.search.v0_1";
const knowledgeGatewayContextCompileContractId =
  "lnsat.gateway.knowledge.context_compile.v0_1";

describe("@lnsat/mcp BP-0195 read-only knowledge surface adapter", () => {
  it("exposes one read-only MCP surface for Gateway knowledge sources, search, and context", () => {
    expect(mcpKnowledgeSurfaceToolContract).toMatchObject({
      tool: "lnsat.knowledge.surface.inspect",
      status: "contract_only",
      gateway_contract_ids: [
        knowledgeGatewaySourcesContractId,
        knowledgeGatewaySearchContractId,
        knowledgeGatewayContextCompileContractId,
      ],
      source_search_context_only: true,
      read_only: true,
      local_index_only: true,
      open_source_self_deploy_evidence_required: true,
      user_owned_integration_evidence_required: true,
      auth_provider_unlocked_evidence_required: true,
      live_auth_provider_allowed: false,
      live_collection_allowed: false,
      mutation_allowed: false,
      db_allowed: false,
      queue_allowed: false,
      runtime_allowed: false,
      state_changing_tool: false,
      side_effects: [],
    });
    expect(mcpKnowledgeSurfaceToolRegistration).toMatchObject({
      name: "lnsat.knowledge.surface.inspect",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      side_effects: [],
    });
  });

  it("delegates source registry inspection through the Gateway contract", async () => {
    const response = await inspectKnowledgeSurfaceThroughMcpAdapterContract({
      operation: "sources",
      request_id: "req_bp0195_sources",
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpKnowledgeSurfaceToolContract.tool,
      operation: "sources",
      gateway_contract_id: knowledgeGatewaySourcesContractId,
      gateway_response: {
        ok: true,
        request_id: "req_bp0195_sources",
        constraints: {
          gateway_owned: true,
          open_source_self_deploy: true,
          user_owned_integrations: true,
          auth_provider_locked: false,
          supported_future_auth_modes: [
            "local_auth",
            "third_party_auth",
            "user_selected_auth_levels",
          ],
          live_auth_provider_configured: false,
          read_only: true,
          no_mutation_path: true,
        },
        side_effects: [],
      },
      mcp_registration: true,
      state_changing_tool: false,
      side_effects: [],
    });
    const gatewayResponse = response.gateway_response;
    if (!gatewayResponse?.ok || !("index" in gatewayResponse)) {
      throw new Error("expected Knowledge Gateway sources success");
    }
    expect(gatewayResponse.index.record_count).toBeGreaterThan(0);
    expect(gatewayResponse.index.source_refs.length).toBeGreaterThan(0);
  });

  it("delegates search inspection with citations, warnings, and risk flags", async () => {
    const response = await inspectKnowledgeSurfaceThroughMcpAdapterContract({
      operation: "search",
      request_id: "req_bp0195_search",
      path: "fixtures/knowledge/decision-history.md",
      limit: 4,
    });

    expect(response).toMatchObject({
      ok: true,
      operation: "search",
      gateway_contract_id: knowledgeGatewaySearchContractId,
      gateway_response: {
        ok: true,
        request_id: "req_bp0195_search",
        constraints: {
          gateway_owned: true,
          open_source_self_deploy: true,
          user_owned_integrations: true,
          auth_provider_locked: false,
          live_auth_provider_configured: false,
          read_only: true,
          citations_required: true,
          no_mutation_path: true,
        },
        stale_warnings: expect.arrayContaining([
          "fixtures/knowledge/decision-history.md stale:stale",
        ]),
        conflict_warnings: expect.arrayContaining([
          "fixtures/knowledge/decision-history.md conflict:possible",
        ]),
        risk_flags: expect.arrayContaining(["conflicting_source", "policy_boundary"]),
        side_effects: [],
      },
      side_effects: [],
    });
    const gatewayResponse = response.gateway_response;
    if (!gatewayResponse?.ok || !("citation_refs" in gatewayResponse)) {
      throw new Error("expected Knowledge Gateway search success");
    }
    expect(gatewayResponse.citation_refs.length).toBeGreaterThan(0);
    expect(gatewayResponse.source_refs.length).toBeGreaterThan(0);
  });

  it("delegates context compilation with cited source refs and no side effects", async () => {
    const response = await inspectKnowledgeSurfaceThroughMcpAdapterContract({
      operation: "context",
      request_id: "req_bp0195_context",
      search: {
        path: "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
        limit: 3,
      },
      bundle_id: "knowledge.bundle.bp0195.mcp",
      objective: "compile auth and integration posture context for agents",
      max_tokens: 1200,
      created_at: "2026-05-16T00:00:00.000Z",
    });

    expect(response).toMatchObject({
      ok: true,
      operation: "context",
      gateway_contract_id: knowledgeGatewayContextCompileContractId,
      gateway_response: {
        ok: true,
        request_id: "req_bp0195_context",
        constraints: {
          gateway_owned: true,
          open_source_self_deploy: true,
          user_owned_integrations: true,
          auth_provider_locked: false,
          read_only: true,
          no_mutation_path: true,
        },
        side_effects: [],
      },
      side_effects: [],
    });
    const gatewayResponse = response.gateway_response;
    if (!gatewayResponse?.ok || !("citation_refs" in gatewayResponse)) {
      throw new Error("expected Knowledge Gateway context success");
    }
    expect(gatewayResponse.source_refs.length).toBeGreaterThan(0);
    expect(gatewayResponse.citation_refs.length).toBeGreaterThan(0);
  });

  it("registers the knowledge surface on the local read-only MCP server", async () => {
    const server = createLnsatReadOnlyMcpServer();

    expect(server.listTools().tools.map((tool) => tool.name)).toContain(
      mcpKnowledgeSurfaceToolContract.tool,
      mcpAgentContextFirewallToolContract.tool,
    );

    const response = await server.callTool({
      name: mcpKnowledgeSurfaceToolContract.tool,
      arguments: {
        operation: "search",
        request_id: "req_bp0195_local_server_search",
        query: "self-deploying management system",
        limit: 3,
      },
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpKnowledgeSurfaceToolContract.tool,
      is_error: false,
      content: [
        {
          type: "json",
          json: {
            ok: true,
            operation: "search",
            gateway_contract_id: knowledgeGatewaySearchContractId,
            gateway_response: {
              ok: true,
              request_id: "req_bp0195_local_server_search",
              constraints: {
                open_source_self_deploy: true,
                user_owned_integrations: true,
                auth_provider_locked: false,
              },
              side_effects: [],
            },
            mcp_registration: true,
            state_changing_tool: false,
            side_effects: [],
          },
        },
      ],
      side_effects: [],
    });
  });

  it("fails closed for invalid operation without raw rejected value echo", async () => {
    const response = await inspectKnowledgeSurfaceThroughMcpAdapterContract({
      operation: "mutate",
      command: "rm -rf /",
    });

    expect(response).toMatchObject({
      ok: false,
      operation: null,
      gateway_contract_id: null,
      gateway_response: null,
      adapter_errors: [
        expect.objectContaining({
          code: "knowledge_surface.invalid_operation",
          path: "/operation",
        }),
      ],
      raw_input_content: "withheld",
      mutation_allowed: false,
      state_changing_tool: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("rm -rf /");
    expect(JSON.stringify(response)).not.toContain("mutate");
  });

  it("keeps live, mutation, DB, queue, runtime, and credential attempts fail-closed", async () => {
    const response = await inspectKnowledgeSurfaceThroughMcpAdapterContract({
      operation: "search",
      request_id: "req_bp0195_bad_search",
      query: "DATABASE_URL",
      live_collection_allowed: true,
      db_write: "postgres://inline-secret.example.invalid/db",
      queue: "queue.purge",
      runtime: "adapter.invoke",
      side_effects: [{ effect_type: "write" }],
    });

    expect(response).toMatchObject({
      ok: false,
      operation: "search",
      gateway_contract_id: knowledgeGatewaySearchContractId,
      gateway_response: {
        ok: false,
        request_id: "req_bp0195_bad_search",
        request_errors: expect.arrayContaining([
          expect.objectContaining({
            code: "knowledge_gateway.forbidden_credential",
            path: "/query",
          }),
          expect.objectContaining({
            code: "knowledge_gateway.forbidden_live_collection",
            path: "/live_collection_allowed",
          }),
          expect.objectContaining({
            code: "knowledge_gateway.forbidden_db_write",
            path: "/db_write",
          }),
          expect.objectContaining({
            code: "knowledge_gateway.forbidden_queue",
            path: "/queue",
          }),
          expect.objectContaining({
            code: "knowledge_gateway.forbidden_runtime",
            path: "/runtime",
          }),
          expect.objectContaining({
            code: "knowledge_gateway.forbidden_mutation",
            path: "/side_effects",
          }),
        ]),
        raw_input_content: "withheld",
        side_effects: [],
      },
      mutation_allowed: false,
      state_changing_tool: false,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://");
    expect(JSON.stringify(response)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(response)).not.toContain("queue.purge");
    expect(JSON.stringify(response)).not.toContain("adapter.invoke");
  });
});
