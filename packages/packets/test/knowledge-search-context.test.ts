import { describe, expect, it } from "vitest";
import {
  compileKnowledgeContextBundle,
  createLocalRepoKnowledgeIndex,
  knowledgeSearchContextContract,
  searchLocalKnowledge,
  type LocalRepoKnowledgeIndexEvidence,
} from "../src/index.js";

const indexedAt = "2026-05-16T00:00:00.000Z";

const bp0184PacketFile = {
  path: "fixtures/knowledge/packets/BP-0184.md",
  content: [
    "# BP-0184: Knowledge Search And Context Bundle",
    "",
    "## Objective",
    "Add read-only keyword search and cited context bundle compilation over local knowledge records.",
    "",
    "## Scope",
    "- Keyword BM25 style local search.",
    "- Exact path search.",
    "- Packet and decision lookup.",
    "- Context bundle compiler with size budget and citations.",
  ].join("\n"),
  source_kind: "packet_doc" as const,
};

const decisionFile = {
  path: "fixtures/knowledge/decision-history.md",
  content: [
    "# Decisions",
    "",
    "## 2026-05-16: Complete BP-0183 and queue BP-0184",
    "",
    "Decision:",
    "",
    "Complete BP-0183 Local Repo Knowledge Index and queue BP-0184 Knowledge Search And Context Bundle.",
  ].join("\n"),
  source_kind: "decision_doc" as const,
  freshness: "stale" as const,
};

const sourceFile = {
  path: "packages/packets/src/local-repo-knowledge-index.ts",
  content: [
    "export const BP_0183_INDEX_STATUS = 'source_only';",
    "",
    "export function createIndexRecord() {",
    "  return 'BP-0183 source index';",
    "}",
  ].join("\n"),
  source_kind: "source_file" as const,
};

function createSearchIndex(): LocalRepoKnowledgeIndexEvidence {
  const result = createLocalRepoKnowledgeIndex({
    files: [sourceFile, decisionFile, bp0184PacketFile],
    indexed_at: indexedAt,
  });

  if (!result.ok) {
    throw new Error("expected local repo knowledge index success");
  }

  const hasDecisionRecord = result.local_repo_knowledge_index.knowledge_records.some(
    (record) => record.source_path === "fixtures/knowledge/decision-history.md",
  );
  if (!hasDecisionRecord) {
    throw new Error("expected decision record");
  }

  const records = result.local_repo_knowledge_index.knowledge_records.map((record) =>
    record.source_path === "fixtures/knowledge/decision-history.md"
      ? {
          ...record,
          conflict_status: "possible" as const,
          risk_flags: ["policy_boundary", "conflicting_source"] as const,
        }
      : record,
  );

  return {
    ...result.local_repo_knowledge_index,
    knowledge_records: records,
  };
}

describe("knowledge search and context compiler", () => {
  it("returns cited keyword hits over local knowledge records", () => {
    const result = searchLocalKnowledge({
      index: createSearchIndex(),
      query: "context bundle citations",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected knowledge search success");
    }

    expect(result.knowledge_search).toMatchObject({
      contract_id: knowledgeSearchContextContract.contract_id,
      search_version: "0.1",
      hit_count: expect.any(Number),
      live_collection_allowed: false,
      side_effects: [],
      constraints: {
        source_only: true,
        read_only: true,
        local_index_only: true,
        citations_required: true,
        exact_source_refs_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        mutation_allowed: false,
        gateway_route_allowed: false,
        mcp_tool_allowed: false,
        ui_allowed: false,
        db_allowed: false,
        embeddings_allowed: false,
      },
    });
    expect(result.knowledge_search.hits[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        source_path: "fixtures/knowledge/packets/BP-0184.md",
        match_modes: ["keyword"],
        citation_ref: expect.objectContaining({
          record_id: expect.stringContaining("bp_0184"),
          source_ref: expect.objectContaining({
            path: "fixtures/knowledge/packets/BP-0184.md",
          }),
        }),
        source_expansion_refs: expect.arrayContaining([
          expect.objectContaining({
            path: "fixtures/knowledge/packets/BP-0184.md",
          }),
        ]),
      }),
    );
    expect(result.knowledge_search.hits[0]?.side_effects).toBeUndefined();
  });

  it("supports exact path, packet, and decision lookup", () => {
    const result = searchLocalKnowledge({
      index: createSearchIndex(),
      path: "fixtures/knowledge/decision-history.md",
      packet_id: "BP-0184",
      decision_id: "decision.local_repo_index",
      limit: 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected lookup success");
    }

    expect(result.knowledge_search.hit_count).toBeGreaterThan(0);
    expect(result.knowledge_search.hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_path: "fixtures/knowledge/decision-history.md",
          match_modes: ["decision", "packet", "path"],
          stale_status: "stale",
          conflict_status: "possible",
          risk_flags: ["conflicting_source", "policy_boundary"],
        }),
      ]),
    );
  });

  it("compiles cited context bundles with warnings and source expansion refs", () => {
    const result = compileKnowledgeContextBundle({
      search: {
        index: createSearchIndex(),
        query: "BP-0184 context bundle",
        limit: 5,
      },
      bundle_id: "knowledge.bundle.bp0184.context",
      objective: "compile cited BP-0184 context for MVP search",
      max_tokens: 900,
      created_at: indexedAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected context compiler success");
    }

    expect(result.compiled_context_bundle).toMatchObject({
      contract_id: knowledgeSearchContextContract.contract_id,
      compiler_version: "0.1",
      included_hit_count: expect.any(Number),
      token_budget: 900,
      live_collection_allowed: false,
      side_effects: [],
      constraints: {
        source_only: true,
        read_only: true,
        local_index_only: true,
        citations_required: true,
        exact_source_refs_required: true,
        no_mutation_path: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        mutation_allowed: false,
        gateway_route_allowed: false,
        mcp_tool_allowed: false,
        ui_allowed: false,
        db_allowed: false,
        embeddings_allowed: false,
      },
    });
    expect(result.compiled_context_bundle.context_bundle.citation_refs.length).toBe(
      result.compiled_context_bundle.context_bundle.record_refs.length,
    );
    expect(result.compiled_context_bundle.source_expansion_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "fixtures/knowledge/packets/BP-0184.md",
        }),
      ]),
    );
    expect(result.compiled_context_bundle.stale_warnings).toEqual(
      expect.arrayContaining(["stale source fixtures/knowledge/decision-history.md"]),
    );
    expect(result.compiled_context_bundle.conflict_warnings).toEqual(
      expect.arrayContaining([
        "conflict warning fixtures/knowledge/decision-history.md",
      ]),
    );
    expect(result.compiled_context_bundle.risk_flags).toEqual(
      expect.arrayContaining(["conflicting_source", "policy_boundary"]),
    );
  });

  it("fails closed for secret-like input and side effects without raw echo", () => {
    const result = searchLocalKnowledge({
      query: "DATABASE_URL postgres://example.invalid/db TOKEN",
      live_collection_allowed: true,
      side_effects: [{ effect_type: "search_write" }],
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected secret-like search failure");
    }

    expect(result).toMatchObject({
      ok: false,
      knowledge_search: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_search_context.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "knowledge_search_context.secret_value_forbidden",
          path: "/query",
        }),
        expect.objectContaining({
          code: "knowledge_search_context.live_collection_forbidden",
          path: "/live_collection_allowed",
        }),
        expect.objectContaining({
          code: "knowledge_search_context.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    });
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("search_write");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
