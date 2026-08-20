import { describe, expect, it } from "vitest";
import {
  createKnowledgeContextBundle,
  createKnowledgeRecord,
  localKnowledgeRecordContract,
} from "../src/index.js";

describe("local knowledge record model", () => {
  it("emits source-only knowledge record evidence", () => {
    const result = createKnowledgeRecord();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected knowledge record success");
    }

    expect(result.knowledge_record).toMatchObject({
      contract_id: localKnowledgeRecordContract.contract_id,
      record_version: "0.1",
      record_id: "knowledge.record.bp0182.local_model",
      source_kind: "packet_doc",
      source_path: "fixtures/knowledge/packets/BP-0182.md",
      title: "BP-0182 Local Knowledge Record Model",
      stale_status: "current",
      conflict_status: "none",
      live_collection_allowed: false,
      side_effects: [],
      constraints: {
        source_only: true,
        exact_source_refs_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
      },
    });
    expect(result.knowledge_record.source_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "fixtures/knowledge/packets/BP-0182.md",
          heading: "Scope",
          line_start: 20,
          line_end: 32,
        }),
      ]),
    );
    expect(result.knowledge_record.packet_ids).toEqual(["BP-0182"]);
    expect(result.knowledge_record.risk_flags).toEqual(["policy_boundary"]);
    expect(result.side_effects).toEqual([]);
  });

  it("emits model-only context bundle refs and citations", () => {
    const result = createKnowledgeContextBundle();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected knowledge context bundle success");
    }

    expect(result.context_bundle).toMatchObject({
      contract_id: localKnowledgeRecordContract.contract_id,
      bundle_version: "0.1",
      bundle_id: "knowledge.bundle.bp0182.context",
      live_collection_allowed: false,
      side_effects: [],
      constraints: {
        source_only: true,
        citations_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
      },
    });
    expect(result.context_bundle.record_refs).toEqual([
      expect.objectContaining({
        record_id: "knowledge.record.bp0182.local_model",
        relevance: "primary",
      }),
    ]);
    expect(result.context_bundle.citation_refs).toEqual([
      expect.objectContaining({
        citation_id: "citation.bp0182.scope",
        record_id: "knowledge.record.bp0182.local_model",
      }),
    ]);
  });

  it("fails closed for malformed source refs", () => {
    const result = createKnowledgeRecord({
      excerpt_ref: {
        path: "../.env",
        heading: "Secrets",
        line_start: 24,
        line_end: 12,
      },
      source_refs: [
        {
          path: "/etc/passwd",
          line_start: 1,
          line_end: 500,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected malformed source ref failure");
    }

    expect(result).toMatchObject({
      ok: false,
      knowledge_record: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        {
          code: "knowledge_record.invalid_source_path",
          path: "/excerpt_ref/path",
          message: "Knowledge source path must be a safe repo-relative path.",
          severity: "error",
        },
        {
          code: "knowledge_record.invalid_source_ref",
          path: "/excerpt_ref/line_end",
          message: "Knowledge source ref line_end must be at or after line_start.",
          severity: "error",
        },
        {
          code: "knowledge_record.invalid_source_path",
          path: "/source_refs/0/path",
          message: "Knowledge source path must be a safe repo-relative path.",
          severity: "error",
        },
        {
          code: "knowledge_record.invalid_source_ref",
          path: "/source_refs/0/line_end",
          message: "Knowledge source ref line range is too broad for BP-0182.",
          severity: "error",
        },
      ]),
    });
  });

  it("fails closed for unsafe risk flags, live collection, and side effects", () => {
    const result = createKnowledgeRecord({
      risk_flags: ["secret.read"],
      live_collection_allowed: true,
      side_effects: [{ effect_type: "scanner" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected risk flag failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "knowledge_record.invalid_risk_flag",
          path: "/risk_flags/0",
          message: "Knowledge record risk flag is unsupported.",
          severity: "error",
        },
        {
          code: "knowledge_record.live_collection_forbidden",
          path: "/live_collection_allowed",
          message: "Knowledge record cannot enable live collection.",
          severity: "error",
        },
        {
          code: "knowledge_record.side_effects_forbidden",
          path: "/side_effects",
          message: "Knowledge record must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
  });

  it("rejects secret-like samples without raw rejected value echo", () => {
    const result = createKnowledgeRecord({
      title: "PRIVATE KEY sample",
      summary: "DATABASE_URL postgres://example.invalid/db TOKEN",
      command: "rm -rf /",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected secret-like value failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "knowledge_record.unexpected_field",
          path: "/command",
          message: "Unexpected knowledge record field.",
          severity: "error",
        },
        {
          code: "knowledge_record.secret_value_forbidden",
          path: "/title",
          message: "Knowledge text cannot contain secret-like values.",
          severity: "error",
        },
        {
          code: "knowledge_record.secret_value_forbidden",
          path: "/summary",
          message: "Knowledge text cannot contain secret-like values.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("TOKEN");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });
});
