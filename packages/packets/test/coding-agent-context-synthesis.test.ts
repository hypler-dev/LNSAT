import { describe, expect, it } from "vitest";
import {
  codingAgentContextSynthesisContract,
  synthesizeCodingAgentContext,
} from "../src/index.js";

const synthesizedAt = new Date("2026-05-06T00:00:00.000Z");

describe("coding agent context synthesis contract", () => {
  it("synthesizes code, docs, tickets, conversations, and runtime signals into agent context", () => {
    const result = synthesizeCodingAgentContext(validRequest(), {
      now: synthesizedAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected context synthesis success");
    }

    expect(result.synthesis).toMatchObject({
      contract_id: codingAgentContextSynthesisContract.contract_id,
      request_id: "ctx_synth_001",
      project_id: "lnsat",
      actor_id: "agent.codex",
      session_id: "sess_context_synthesis_0001",
      synthesized_at: "2026-05-06T00:00:00.000Z",
      objective: "prepare coding agent handoff from source evidence",
      required_source_kinds: [
        "code",
        "docs",
        "ticket",
        "conversation",
        "runtime_signal",
      ],
      source_counts: {
        code: 1,
        docs: 1,
        ticket: 1,
        conversation: 1,
        runtime_signal: 1,
      },
      live_collection_allowed: false,
      side_effects: [],
    });
    expect(result.synthesis.sources).toEqual([
      {
        source_id: "code_1",
        kind: "code",
        source_ref: "repo:packages/packets/src",
        summary: "packet compiler and validator code own context shaping",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: "2026-05-06T00:00:00.000Z",
      },
      {
        source_id: "docs_2",
        kind: "docs",
        source_ref: "doc:docs/DOCS_INDEX.md",
        summary: "context router controls first read order",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: "2026-05-06T00:00:00.000Z",
      },
      {
        source_id: "ticket_3",
        kind: "ticket",
        source_ref: "ticket:BP-0081",
        summary: "build packet requests coding agent synthesis foundation",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: "2026-05-06T00:00:00.000Z",
      },
      {
        source_id: "conversation_4",
        kind: "conversation",
        source_ref: "conversation:user-request-2026-05-06",
        summary: "operator asked for code docs tickets conversations runtime signals",
        relevance: "supporting",
        trust_level: "operator_supplied",
        captured_at: "2026-05-06T00:00:00.000Z",
      },
      {
        source_id: "runtime_signal_5",
        kind: "runtime_signal",
        source_ref: "runtime:local-checks",
        summary: "latest checks are repo local and no live collectors allowed",
        relevance: "warning",
        trust_level: "source_backed",
        captured_at: "2026-05-06T00:00:00.000Z",
      },
    ]);
    expect(result.synthesis.synthesized_context).toEqual({
      coding_agent_brief: [
        "code: packet compiler and validator code own context shaping",
        "docs: context router controls first read order",
        "ticket: build packet requests coding agent synthesis foundation",
      ],
      constraints: [
        "runtime_signal: latest checks are repo local and no live collectors allowed",
      ],
      open_questions: [],
      stale_or_missing_signals: [],
    });
    expect(result.synthesis.source_refs).toEqual(
      expect.arrayContaining([
        "code:repo:packages/packets/src",
        "docs:doc:docs/DOCS_INDEX.md",
        "ticket:ticket:BP-0081",
        "conversation:conversation:user-request-2026-05-06",
        "runtime_signal:runtime:local-checks",
        "doc:docs/architecture/CONTEXT_SYNTHESIS.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when a required source family is missing", () => {
    const request = validRequest();
    const result = synthesizeCodingAgentContext(
      {
        ...request,
        sources: request.sources.filter((source) => source.kind !== "ticket"),
      },
      { now: synthesizedAt },
    );

    expect(result).toMatchObject({
      ok: false,
      synthesis: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: [
        {
          code: "coding_agent_context_synthesis.source_kind_required",
          path: "/sources",
          message: "Context synthesis requires at least one ticket source.",
          severity: "error",
        },
      ],
    });
  });

  it("fails closed without raw secret or command echo", () => {
    const result = synthesizeCodingAgentContext(
      {
        ...validRequest(),
        sources: [
          ...validRequest().sources,
          {
            kind: "runtime_signal",
            source_ref: "postgres://secret.example.invalid/db",
            summary: "rm -rf / with DATABASE_URL",
            relevance: "warning",
            trust_level: "source_backed",
          },
        ],
        command: "rm -rf /",
      },
      { now: synthesizedAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected context synthesis failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "coding_agent_context_synthesis.unexpected_field",
          path: "/command",
          message: "Unexpected coding agent context synthesis request field.",
          severity: "error",
        },
        {
          code: "coding_agent_context_synthesis.invalid_source",
          path: "/sources/5/source_ref",
          message: "Context synthesis source_ref must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "coding_agent_context_synthesis.invalid_source",
          path: "/sources/5/summary",
          message: "Context synthesis summary must be a safe non-secret string.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });

  it("fails closed if live collection or side effects are requested", () => {
    const result = synthesizeCodingAgentContext(
      {
        ...validRequest(),
        live_collection_allowed: true,
        side_effects: [{ effect_type: "ticket_fetch" }],
      },
      { now: synthesizedAt },
    );

    expect(result).toMatchObject({
      ok: false,
      synthesis: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        {
          code: "coding_agent_context_synthesis.live_collection_forbidden",
          path: "/live_collection_allowed",
          message:
            "Context synthesis is source-only and cannot enable live collection.",
          severity: "error",
        },
        {
          code: "coding_agent_context_synthesis.side_effects_forbidden",
          path: "/side_effects",
          message: "Context synthesis must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    });
  });
});

function validRequest() {
  return {
    request_id: "ctx_synth_001",
    project_id: "lnsat",
    actor_id: "agent.codex",
    session_id: "sess_context_synthesis_0001",
    objective: "prepare coding agent handoff from source evidence",
    created_at: synthesizedAt.toISOString(),
    sources: [
      {
        kind: "code",
        source_ref: "repo:packages/packets/src",
        summary: "packet compiler and validator code own context shaping",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: synthesizedAt.toISOString(),
      },
      {
        kind: "docs",
        source_ref: "doc:docs/DOCS_INDEX.md",
        summary: "context router controls first read order",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: synthesizedAt.toISOString(),
      },
      {
        kind: "ticket",
        source_ref: "ticket:BP-0081",
        summary: "build packet requests coding agent synthesis foundation",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: synthesizedAt.toISOString(),
      },
      {
        kind: "conversation",
        source_ref: "conversation:user-request-2026-05-06",
        summary: "operator asked for code docs tickets conversations runtime signals",
        relevance: "supporting",
        trust_level: "operator_supplied",
        captured_at: synthesizedAt.toISOString(),
      },
      {
        kind: "runtime_signal",
        source_ref: "runtime:local-checks",
        summary: "latest checks are repo local and no live collectors allowed",
        relevance: "warning",
        trust_level: "source_backed",
        captured_at: synthesizedAt.toISOString(),
      },
    ],
    live_collection_allowed: false,
    side_effects: [],
  };
}
