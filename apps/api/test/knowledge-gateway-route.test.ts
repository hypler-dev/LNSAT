import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  knowledgeGatewayContextCompileContract,
  knowledgeGatewaySearchContract,
  knowledgeGatewaySourcesContract,
} from "../src/index.js";

describe("@lnsat/api BP-0192 Knowledge Gateway routes", () => {
  const gateway = buildApiGateway();

  afterAll(async () => {
    await gateway.close();
  });

  it("serves source registry through read-only GET route", async () => {
    const response = await gateway.inject({
      method: knowledgeGatewaySourcesContract.method,
      url: `${knowledgeGatewaySourcesContract.path}?request_id=req_bp0192_route_sources`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: knowledgeGatewaySourcesContract.contract_id,
      request_id: "req_bp0192_route_sources",
      constraints: {
        gateway_owned: true,
        open_source_self_deploy: true,
        user_owned_integrations: true,
        auth_provider_locked: false,
        live_auth_provider_configured: false,
        read_only: true,
        no_mutation_path: true,
      },
      side_effects: [],
    });
  });

  it("serves search through read-only GET route with citations and warnings", async () => {
    const response = await gateway.inject({
      method: knowledgeGatewaySearchContract.method,
      url: `${knowledgeGatewaySearchContract.path}?request_id=req_bp0192_route_search&path=fixtures%2Fknowledge%2Fdecision-history.md&limit=3`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: knowledgeGatewaySearchContract.contract_id,
      request_id: "req_bp0192_route_search",
      constraints: {
        gateway_owned: true,
        read_only: true,
        no_mutation_path: true,
      },
      side_effects: [],
    });
    expect(response.json().citation_refs.length).toBeGreaterThan(0);
    expect(response.json().risk_flags).toEqual(
      expect.arrayContaining(["conflicting_source", "policy_boundary"]),
    );
  });

  it("serves context compile through read-only POST route without opening write behavior", async () => {
    const response = await gateway.inject({
      method: knowledgeGatewayContextCompileContract.method,
      url: knowledgeGatewayContextCompileContract.path,
      payload: {
        request_id: "req_bp0192_route_compile",
        search: {
          path: "fixtures/knowledge/decision-history.md",
          limit: 2,
        },
        bundle_id: "knowledge.bundle.bp0192.route",
        objective: "compile BP-0192 route evidence",
        max_tokens: 900,
        created_at: "2026-05-16T00:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: knowledgeGatewayContextCompileContract.contract_id,
      request_id: "req_bp0192_route_compile",
      constraints: {
        gateway_owned: true,
        read_only: true,
        no_mutation_path: true,
        mcp_tool_allowed: false,
      },
      side_effects: [],
    });
    expect(
      response.json().compiled_context_bundle.context_bundle.citation_refs.length,
    ).toBeGreaterThan(0);
  });

  it("has no state-changing search route and rejects unsafe requests without raw echo", async () => {
    const missingPostRoute = await gateway.inject({
      method: "POST",
      url: knowledgeGatewaySearchContract.path,
      payload: {
        request_id: "req_bp0192_no_post_search",
        query: "knowledge",
      },
    });
    expect(missingPostRoute.statusCode).toBe(404);

    const unsafeSearch = await gateway.inject({
      method: knowledgeGatewaySearchContract.method,
      url: `${knowledgeGatewaySearchContract.path}?request_id=req_bp0192_bad_route&query=DATABASE_URL&runtime_dispatcher=adapter.invoke&db_write=postgres%3A%2F%2Finline-secret.example.invalid%2Fdb`,
    });

    expect(unsafeSearch.statusCode).toBe(400);
    expect(unsafeSearch.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0192_bad_route",
      request_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_gateway.forbidden_credential",
          path: "/query",
        }),
        expect.objectContaining({
          code: "knowledge_gateway.forbidden_runtime",
          path: "/runtime_dispatcher",
        }),
        expect.objectContaining({
          code: "knowledge_gateway.forbidden_db_write",
          path: "/db_write",
        }),
      ]),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(unsafeSearch.body).not.toContain("DATABASE_URL");
    expect(unsafeSearch.body).not.toContain("adapter.invoke");
    expect(unsafeSearch.body).not.toContain("postgres://");
  });
});
