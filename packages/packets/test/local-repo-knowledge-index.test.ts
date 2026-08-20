import { describe, expect, it } from "vitest";
import {
  createLocalRepoKnowledgeIndex,
  localRepoKnowledgeIndexContract,
} from "../src/index.js";

const indexedAt = "2026-05-16T00:00:00.000Z";

const markdownFile = {
  path: "fixtures/knowledge/packets/BP-0183.md",
  content: [
    "# BP-0183: Local Repo Knowledge Index",
    "",
    "## Objective",
    "Build allowlisted local repo knowledge indexing after BP-0182 model exists.",
    "",
    "## Scope",
    "- Allowlisted local docs/source scanner.",
    "- Deterministic semantic chunking by headings/sections.",
    "- Exact source refs with path, heading, and line range.",
  ].join("\n"),
  source_kind: "packet_doc" as const,
};

const jsonFile = {
  path: "fixtures/project-state/status.json",
  content: [
    "{",
    '  "active_packet": "none",',
    '  "next_packet": "BP-0183",',
    '  "build_state": "bp0183_queued"',
    "}",
  ].join("\n"),
  source_kind: "status_doc" as const,
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

describe("local repo knowledge index", () => {
  it("indexes allowlisted markdown, JSON, and source snapshots deterministically", () => {
    const first = createLocalRepoKnowledgeIndex({
      files: [sourceFile, markdownFile, jsonFile],
      indexed_at: indexedAt,
    });
    const second = createLocalRepoKnowledgeIndex({
      files: [jsonFile, sourceFile, markdownFile],
      indexed_at: indexedAt,
    });

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error("expected local repo knowledge index success");
    }

    expect(first.local_repo_knowledge_index).toMatchObject({
      contract_id: localRepoKnowledgeIndexContract.contract_id,
      index_version: "0.1",
      index_id: "knowledge.index.bp0183.local_repo",
      file_count: 3,
      live_collection_allowed: false,
      side_effects: [],
      constraints: {
        source_only: true,
        deterministic: true,
        allowlist_required: true,
        exact_source_refs_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        search_allowed: false,
        context_compiler_allowed: false,
      },
    });
    expect(first.local_repo_knowledge_index.source_registry).toHaveLength(3);
    expect(first.local_repo_knowledge_index.chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_path: "fixtures/knowledge/packets/BP-0183.md",
          heading: "Objective",
          source_ref: {
            path: "fixtures/knowledge/packets/BP-0183.md",
            heading: "Objective",
            line_start: 3,
            line_end: 5,
          },
          packet_ids: ["BP-0182", "BP-0183"],
        }),
        expect.objectContaining({
          source_path: "fixtures/project-state/status.json",
          heading: "next_packet",
          source_ref: {
            path: "fixtures/project-state/status.json",
            heading: "next_packet",
            line_start: 3,
            line_end: 3,
          },
          packet_ids: ["BP-0183"],
        }),
        expect.objectContaining({
          source_path: "packages/packets/src/local-repo-knowledge-index.ts",
          heading: "createIndexRecord",
          source_ref: {
            path: "packages/packets/src/local-repo-knowledge-index.ts",
            heading: "createIndexRecord",
            line_start: 3,
            line_end: 5,
          },
          packet_ids: ["BP-0183"],
        }),
      ]),
    );
    expect(first.local_repo_knowledge_index.knowledge_records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_path: "fixtures/knowledge/packets/BP-0183.md",
          side_effects: [],
          constraints: expect.objectContaining({
            source_only: true,
            exact_source_refs_required: true,
            live_collection_allowed: false,
          }),
        }),
      ]),
    );
  });

  it("fails closed when a file is outside the allowlist without echoing the path", () => {
    const result = createLocalRepoKnowledgeIndex({
      files: [sourceFile],
      allowlisted_paths: ["docs/"],
      indexed_at: indexedAt,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected allowlist failure");
    }

    expect(result).toMatchObject({
      ok: false,
      local_repo_knowledge_index: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        {
          code: "local_repo_knowledge_index.path_not_allowlisted",
          path: "/files/0/path",
          message: "Local repo file is outside allowed index paths.",
          severity: "error",
        },
      ]),
    });
    expect(JSON.stringify(result)).not.toContain("packages/packets");
  });

  it("fails closed for ignored and unsafe files without raw rejected value echo", () => {
    const result = createLocalRepoKnowledgeIndex({
      files: [
        {
          path: "node_modules/pkg/index.ts",
          content: "export const harmless = true;",
        },
        {
          path: "../.env",
          content: "SAFE_SAMPLE=1",
        },
      ],
      indexed_at: indexedAt,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected ignored/unsafe file failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "local_repo_knowledge_index.ignored_file_forbidden",
          path: "/files/0/path",
        }),
        expect.objectContaining({
          code: "local_repo_knowledge_index.invalid_file_path",
          path: "/files/1/path",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("node_modules");
    expect(JSON.stringify(result)).not.toContain("../.env");
    expect(result.side_effects).toEqual([]);
  });

  it("rejects secret-like content and side effects without raw rejected value echo", () => {
    const result = createLocalRepoKnowledgeIndex({
      files: [
        {
          path: "fixtures/knowledge/packets/BP-0183.md",
          content: "DATABASE_URL=postgres://example.invalid/db TOKEN",
        },
      ],
      live_collection_allowed: true,
      side_effects: [{ effect_type: "scanner" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected secret-like content failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "local_repo_knowledge_index.secret_value_forbidden",
          path: "/files/0/content",
        }),
        expect.objectContaining({
          code: "local_repo_knowledge_index.live_collection_forbidden",
          path: "/live_collection_allowed",
        }),
        expect.objectContaining({
          code: "local_repo_knowledge_index.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("scanner");
  });
});
