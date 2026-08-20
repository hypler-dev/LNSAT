import { describe, expect, it } from "vitest";
import {
  createDefaultKnowledgeEvalIndex,
  defaultKnowledgeEvalAnswers,
  defaultKnowledgeEvalQuestionSet,
  knowledgeEvalHarnessContract,
  runKnowledgeEvalHarness,
} from "../src/index.js";

describe("knowledge eval harness", () => {
  it("passes the BP-0188 golden question set with cited source answers", () => {
    const result = runKnowledgeEvalHarness();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected knowledge eval harness success");
    }

    expect(result.knowledge_eval_harness).toMatchObject({
      contract_id: knowledgeEvalHarnessContract.contract_id,
      eval_version: "0.1",
      question_count: defaultKnowledgeEvalQuestionSet.length,
      passed_question_count: defaultKnowledgeEvalQuestionSet.length,
      failed_question_count: 0,
      live_collection_allowed: false,
      side_effects: [],
      constraints: {
        source_only: true,
        read_only: true,
        local_index_only: true,
        citations_required: true,
        golden_questions_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        mutation_allowed: false,
        gateway_route_allowed: false,
        mcp_tool_allowed: false,
        db_allowed: false,
        embeddings_allowed: false,
        external_eval_service_allowed: false,
      },
    });
    expect(result.knowledge_eval_harness.evaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question_id: "eval.current_packet",
          passed: true,
          retrieved_source_paths: expect.arrayContaining([
            "docs/ROADMAP.md",
            "docs/reference/CONTRACT_PROVENANCE.md",
            "fixtures/knowledge/packets/BP-0188.md",
          ]),
          retrieved_packet_ids: expect.arrayContaining(["BP-0188"]),
          citation_count: expect.any(Number),
        }),
        expect.objectContaining({
          question_id: "eval.stale_conflict_detection",
          passed: true,
          answer: expect.objectContaining({
            stale_warnings: ["stale source fixtures/knowledge/decision-history.md"],
            conflict_warnings: [
              "conflict warning fixtures/knowledge/decision-history.md",
            ],
          }),
        }),
      ]),
    );
  });

  it("fails answer eval when a claim has no citation", () => {
    const answers = defaultKnowledgeEvalAnswers.map((answer) =>
      answer.question_id === "eval.current_packet"
        ? {
            ...answer,
            cited_source_paths: [],
          }
        : answer,
    );
    const result = runKnowledgeEvalHarness({
      index: createDefaultKnowledgeEvalIndex(),
      questions: defaultKnowledgeEvalQuestionSet,
      answers,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected uncited answer failure");
    }

    expect(result.knowledge_eval_harness?.failed_question_count).toBeGreaterThan(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_eval_harness.uncited_answer",
          path: "/questions/0/answer/cited_source_paths",
        }),
      ]),
    );
  });

  it("fails stale guidance when answer warnings are missing", () => {
    const answers = defaultKnowledgeEvalAnswers.map((answer) =>
      answer.question_id === "eval.stale_conflict_detection"
        ? {
            question_id: answer.question_id,
            answer_text: answer.answer_text,
            cited_source_paths: answer.cited_source_paths,
          }
        : answer,
    );
    const result = runKnowledgeEvalHarness({
      index: createDefaultKnowledgeEvalIndex(),
      questions: defaultKnowledgeEvalQuestionSet,
      answers,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected stale guidance failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_eval_harness.stale_guidance_not_flagged",
          path: "/questions/4/answer/stale_warnings",
        }),
        expect.objectContaining({
          code: "knowledge_eval_harness.conflict_warning_missing",
          path: "/questions/4/conflict_warnings",
        }),
      ]),
    );
  });

  it("fails closed for credential-like answer values without raw echo", () => {
    const answers = defaultKnowledgeEvalAnswers.map((answer) =>
      answer.question_id === "eval.current_packet"
        ? {
            ...answer,
            answer_text: "BP-0188 Eval Harness uses DATABASE_URL for live access",
          }
        : answer,
    );
    const result = runKnowledgeEvalHarness({
      index: createDefaultKnowledgeEvalIndex(),
      questions: defaultKnowledgeEvalQuestionSet,
      answers,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected credential-like answer failure");
    }

    expect(result).toMatchObject({
      ok: false,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_eval_harness.secret_value_forbidden",
          path: "/answers/0/answer_text",
        }),
      ]),
    });
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
  });

  it("fails live scope widening answers without opening blocked scope", () => {
    const answers = defaultKnowledgeEvalAnswers.map((answer) =>
      answer.question_id === "eval.live_scope_rejection"
        ? {
            ...answer,
            answer_text:
              "BP-0188 should enable live adapter invocation and deploy now.",
          }
        : answer,
    );
    const result = runKnowledgeEvalHarness({
      index: createDefaultKnowledgeEvalIndex(),
      questions: defaultKnowledgeEvalQuestionSet,
      answers,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected live scope widening failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_eval_harness.live_scope_widening_forbidden",
          path: "/questions/5/answer/answer_text",
        }),
      ]),
    );
    expect(result.knowledge_eval_harness?.constraints).toMatchObject({
      gateway_route_allowed: false,
      mcp_tool_allowed: false,
      db_allowed: false,
      embeddings_allowed: false,
      external_eval_service_allowed: false,
    });
  });

  it("rejects live collection and side effects without raw echo", () => {
    const result = runKnowledgeEvalHarness({
      live_collection_allowed: true,
      side_effects: [{ effect_type: "eval_write" }],
      command: "deploy now",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected fail-closed request failure");
    }

    expect(result).toMatchObject({
      ok: false,
      knowledge_eval_harness: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: "knowledge_eval_harness.unexpected_field",
          path: "/command",
        }),
        expect.objectContaining({
          code: "knowledge_eval_harness.live_collection_forbidden",
          path: "/live_collection_allowed",
        }),
        expect.objectContaining({
          code: "knowledge_eval_harness.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    });
    expect(JSON.stringify(result)).not.toContain("eval_write");
    expect(JSON.stringify(result)).not.toContain("deploy now");
  });
});
