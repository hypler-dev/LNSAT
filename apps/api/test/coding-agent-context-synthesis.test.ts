import { describe, expect, it } from "vitest";
import {
  codingAgentContextSynthesisGatewayContract,
  inspectCodingAgentContextSynthesisGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-05-06T00:00:00.000Z");

describe("@lnsat/api BP-0082 coding agent context synthesis Gateway contract", () => {
  it("returns BP-0081 source-only context synthesis evidence through Gateway", async () => {
    const response = await inspectCodingAgentContextSynthesisGatewayRequest(
      {
        request_id: "req_bp0082_context_synthesis",
        context_request: validContextRequest(),
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: codingAgentContextSynthesisGatewayContract.contract_id,
      request_id: "req_bp0082_context_synthesis",
      inspected_at: "2026-05-06T00:00:00.000Z",
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

    if (!response.ok) {
      throw new Error("expected Gateway context synthesis success");
    }

    expect(response.synthesis).toMatchObject({
      contract_id: "lnsat.context.coding_agent_synthesis.v0_1",
      request_id: "ctx_synth_0082",
      project_id: "lnsat",
      actor_id: "agent.codex",
      session_id: "sess_context_synthesis_0082",
      objective: "prepare coding agent Gateway handoff from source evidence",
      live_collection_allowed: false,
      side_effects: [],
    });
    expect(response.coding_agent_brief).toEqual([
      "code: BP-0081 helper owns source-only context synthesis",
      "docs: context synthesis doc defines source families and no-live boundary",
      "ticket: BP-0082 asks Gateway to delegate to BP-0081 helper",
    ]);
    expect(response.constraints).toEqual([
      "runtime_signal: checks are repo local and no live runtime collector exists",
    ]);
    expect(response.open_questions).toEqual([
      "verify conversation source conversation:user-request-2026-05-06",
    ]);
    expect(response.source_refs).toEqual(
      expect.arrayContaining([
        "code:repo:packages/packets/src/coding-agent-context-synthesis.ts",
        "docs:doc:docs/architecture/CONTEXT_SYNTHESIS.md",
        "ticket:ticket:BP-0082",
        "conversation:conversation:user-request-2026-05-06",
        "runtime_signal:runtime:local-checks",
        "doc:docs/architecture/CONTEXT_SYNTHESIS.md",
      ]),
    );
    expect(response.source_docs).toEqual(
      expect.arrayContaining([
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/coding-agent-context-synthesis.ts",
        "apps/api/src/coding-agent-context-synthesis.ts",
      ]),
    );
  });

  it("fails closed for malformed Gateway requests without raw rejected value echo", async () => {
    const response = await inspectCodingAgentContextSynthesisGatewayRequest(
      {
        request_id: 82,
        raw_rejected_value: "postgres://inline-secret@example.invalid/audit",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        {
          code: "coding_agent_context_synthesis_gateway.unexpected_field",
          path: "/raw_rejected_value",
        },
        {
          code: "coding_agent_context_synthesis_gateway.invalid_request_id",
          path: "/request_id",
        },
        {
          code: "coding_agent_context_synthesis_gateway.missing_context_request",
          path: "/context_request",
        },
      ],
      synthesis_errors: [],
      synthesis: null,
      live_collection_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("postgres://inline-secret");
  });

  it("fails closed when delegated BP-0081 evidence is missing a required source family", async () => {
    const request = validContextRequest();
    const response = await inspectCodingAgentContextSynthesisGatewayRequest(
      {
        request_id: "req_bp0082_missing_ticket",
        context_request: {
          ...request,
          sources: request.sources.filter((source) => source.kind !== "ticket"),
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [],
      synthesis_errors: [
        {
          code: "coding_agent_context_synthesis.source_kind_required",
          path: "/sources",
          message: "Context synthesis requires at least one ticket source.",
        },
      ],
      synthesis: null,
      live_collection_allowed: false,
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed for unsafe source strings, live collection, side effects, and raw command echo", async () => {
    const unsafeSource = await inspectCodingAgentContextSynthesisGatewayRequest(
      {
        request_id: "req_bp0082_unsafe_source",
        context_request: {
          ...validContextRequest(),
          sources: [
            ...validContextRequest().sources,
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
      },
      { now },
    );

    expect(unsafeSource).toMatchObject({
      ok: false,
      request_errors: [],
      synthesis_errors: expect.arrayContaining([
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
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(unsafeSource)).not.toContain("postgres://");
    expect(JSON.stringify(unsafeSource)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(unsafeSource)).not.toContain("rm -rf");

    const liveCollection = await inspectCodingAgentContextSynthesisGatewayRequest(
      {
        request_id: "req_bp0082_live_collection",
        context_request: {
          ...validContextRequest(),
          live_collection_allowed: true,
          side_effects: [{ effect_type: "ticket_fetch" }],
        },
      },
      { now },
    );

    expect(liveCollection.ok).toBe(false);
    if (liveCollection.ok) {
      throw new Error("expected live collection failure");
    }
    expect(liveCollection.synthesis_errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "coding_agent_context_synthesis.live_collection_forbidden",
          path: "/live_collection_allowed",
        }),
        expect.objectContaining({
          code: "coding_agent_context_synthesis.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(liveCollection.raw_input_content).toBe("withheld");
    expect(liveCollection.side_effects).toEqual([]);
    expect(JSON.stringify(liveCollection)).not.toContain("ticket_fetch");
  });
});

function validContextRequest() {
  return {
    request_id: "ctx_synth_0082",
    project_id: "lnsat",
    actor_id: "agent.codex",
    session_id: "sess_context_synthesis_0082",
    objective: "prepare coding agent Gateway handoff from source evidence",
    created_at: now.toISOString(),
    sources: [
      {
        kind: "code",
        source_ref: "repo:packages/packets/src/coding-agent-context-synthesis.ts",
        summary: "BP-0081 helper owns source-only context synthesis",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: now.toISOString(),
      },
      {
        kind: "docs",
        source_ref: "doc:docs/architecture/CONTEXT_SYNTHESIS.md",
        summary: "context synthesis doc defines source families and no-live boundary",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: now.toISOString(),
      },
      {
        kind: "ticket",
        source_ref: "ticket:BP-0082",
        summary: "BP-0082 asks Gateway to delegate to BP-0081 helper",
        relevance: "primary",
        trust_level: "source_backed",
        captured_at: now.toISOString(),
      },
      {
        kind: "conversation",
        source_ref: "conversation:user-request-2026-05-06",
        summary:
          "next live ticket chat runtime connectors need later policy approval audit design",
        relevance: "supporting",
        trust_level: "unverified",
        captured_at: now.toISOString(),
      },
      {
        kind: "runtime_signal",
        source_ref: "runtime:local-checks",
        summary: "checks are repo local and no live runtime collector exists",
        relevance: "warning",
        trust_level: "source_backed",
        captured_at: now.toISOString(),
      },
    ],
    live_collection_allowed: false,
    side_effects: [],
  };
}
