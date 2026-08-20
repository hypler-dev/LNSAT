import { describe, expect, it } from "vitest";
import {
  inspectKnowledgeGatewayContextCompileRequest,
  inspectKnowledgeGatewaySearchRequest,
  inspectKnowledgeGatewaySourcesRequest,
  knowledgeGatewayContextCompileContract,
  knowledgeGatewaySearchContract,
  knowledgeGatewaySourcesContract,
} from "../src/index.js";

describe("@lnsat/api BP-0192 read-only Knowledge Gateway contract", () => {
  it("returns source-owned knowledge registry evidence without live collection", async () => {
    const response = await inspectKnowledgeGatewaySourcesRequest({
      request_id: "req_bp0192_sources",
    });

    expect(response).toMatchObject({
      ok: true,
      contract_id: knowledgeGatewaySourcesContract.contract_id,
      request_id: "req_bp0192_sources",
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
        source_only: true,
        read_only: true,
        no_mutation_path: true,
        live_collection_allowed: false,
        mutation_allowed: false,
        db_allowed: false,
        queue_allowed: false,
        runtime_allowed: false,
        mcp_tool_allowed: false,
      },
      side_effects: [],
    });
    if (!response.ok) {
      throw new Error("expected Knowledge Gateway sources success");
    }
    const decisionsSource = response.sources.find(
      (source) => source.path === "fixtures/knowledge/decision-history.md",
    );
    expect(decisionsSource).toMatchObject({
      source_kind: "decision_doc",
      path: "fixtures/knowledge/decision-history.md",
      freshness: "stale",
      side_effects: [],
    });
    expect(decisionsSource).not.toHaveProperty("content");
    expect(decisionsSource).not.toHaveProperty("normalized_text");
    expect(
      response.sources.find((source) => source.path === "docs/ROADMAP.md")?.source_refs
        .length,
    ).toBeGreaterThan(0);
    expect(response.constraints.live_collection_allowed).toBe(false);
    expect(response.side_effects).toEqual([]);
    expect(response.index.record_count).toBeGreaterThan(0);
    expect(response.index.source_refs.length).toBeGreaterThan(0);
    expect(response.index.warning_records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_path: "fixtures/knowledge/decision-history.md",
          stale_status: "stale",
          conflict_status: "possible",
          risk_flags: expect.arrayContaining(["conflicting_source", "policy_boundary"]),
        }),
      ]),
    );
    expect(response.endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "GET",
          path: "/v1/knowledge/sources",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/v1/knowledge/search",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/v1/knowledge/context/compile",
          status: "read_only_route",
        }),
      ]),
    );
  });

  it("searches source evidence with citations, warnings, risk flags, and no side effects", async () => {
    const response = await inspectKnowledgeGatewaySearchRequest({
      request_id: "req_bp0192_search",
      path: "fixtures/knowledge/decision-history.md",
      limit: 4,
    });

    expect(response).toMatchObject({
      ok: true,
      contract_id: knowledgeGatewaySearchContract.contract_id,
      request_id: "req_bp0192_search",
      constraints: {
        gateway_owned: true,
        read_only: true,
        citations_required: true,
        no_mutation_path: true,
      },
      side_effects: [],
    });
    if (!response.ok) {
      throw new Error("expected Knowledge Gateway search success");
    }
    expect(response.search.constraints).toMatchObject({
      source_only: true,
      read_only: true,
      local_index_only: true,
      gateway_route_allowed: false,
      mcp_tool_allowed: false,
      db_allowed: false,
      embeddings_allowed: false,
    });
    expect(response.hits.length).toBeGreaterThan(0);
    expect(response.source_refs.length).toBeGreaterThan(0);
    expect(response.citation_refs.length).toBe(response.hits.length);
    expect(response.stale_warnings).toEqual(
      expect.arrayContaining(["fixtures/knowledge/decision-history.md stale:stale"]),
    );
    expect(response.conflict_warnings).toEqual(
      expect.arrayContaining([
        "fixtures/knowledge/decision-history.md conflict:possible",
      ]),
    );
    expect(response.risk_flags).toEqual(
      expect.arrayContaining(["conflicting_source", "policy_boundary"]),
    );
  });

  it("compiles cited context through Gateway without accepting client-owned index state", async () => {
    const response = await inspectKnowledgeGatewayContextCompileRequest({
      request_id: "req_bp0192_compile",
      search: {
        path: "fixtures/knowledge/decision-history.md",
        limit: 3,
      },
      bundle_id: "knowledge.bundle.bp0192.gateway",
      objective: "compile cited BP-0192 Gateway knowledge context",
      max_tokens: 1200,
      created_at: "2026-05-16T00:00:00.000Z",
    });

    expect(response).toMatchObject({
      ok: true,
      contract_id: knowledgeGatewayContextCompileContract.contract_id,
      request_id: "req_bp0192_compile",
      constraints: {
        gateway_owned: true,
        read_only: true,
        no_mutation_path: true,
      },
      side_effects: [],
    });
    if (!response.ok) {
      throw new Error("expected Knowledge Gateway context compile success");
    }
    expect(response.compiled_context_bundle.constraints).toMatchObject({
      source_only: true,
      read_only: true,
      no_mutation_path: true,
      gateway_route_allowed: false,
      mcp_tool_allowed: false,
      db_allowed: false,
      embeddings_allowed: false,
    });
    expect(response.source_refs.length).toBeGreaterThan(0);
    expect(response.citation_refs.length).toBeGreaterThan(0);
    expect(response.risk_flags).toEqual(
      expect.arrayContaining(["conflicting_source", "policy_boundary"]),
    );
  });

  it("fails closed for mutation, live, DB, queue, runtime, and credential attempts without raw echo", async () => {
    const searchResponse = await inspectKnowledgeGatewaySearchRequest({
      request_id: "req_bp0192_bad_search",
      query: "DATABASE_URL",
      live_collection_allowed: true,
      db_write: "postgres://inline-secret.example.invalid/db",
      queue: "queue.purge",
      runtime_dispatcher: "adapter.invoke",
      side_effects: [{ effect_type: "write" }],
    });

    expect(searchResponse).toMatchObject({
      ok: false,
      request_id: "req_bp0192_bad_search",
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
          path: "/runtime_dispatcher",
        }),
        expect.objectContaining({
          code: "knowledge_gateway.forbidden_mutation",
          path: "/side_effects",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(searchResponse)).not.toContain("postgres://");
    expect(JSON.stringify(searchResponse)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(searchResponse)).not.toContain("queue.purge");
    expect(JSON.stringify(searchResponse)).not.toContain("adapter.invoke");

    const compileResponse = await inspectKnowledgeGatewayContextCompileRequest({
      request_id: "req_bp0192_bad_compile",
      search: {
        index: { live: "client supplied" },
        request_id: "req_nested_search_should_not_exist",
        query: "knowledge",
      },
      write_api: true,
    });

    expect(compileResponse).toMatchObject({
      ok: false,
      request_id: "req_bp0192_bad_compile",
      request_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_gateway.unexpected_field",
          path: "/search/index",
        }),
        expect.objectContaining({
          code: "knowledge_gateway.unexpected_field",
          path: "/search/request_id",
        }),
        expect.objectContaining({
          code: "knowledge_gateway.forbidden_mutation",
          path: "/write_api",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(compileResponse)).not.toContain("client supplied");
  });
});
