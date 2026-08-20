import { describe, expect, it } from "vitest";
import { contextWorkingSetContract, createContextWorkingSet } from "../src/index.js";

const createdAt = new Date("2026-05-06T00:00:00.000Z");

describe("context atom working-set contract", () => {
  it("emits source-only context atom and working-set evidence", () => {
    const result = createContextWorkingSet(validRequest(), { now: createdAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected context working set success");
    }

    expect(result.working_set).toMatchObject({
      contract_id: contextWorkingSetContract.contract_id,
      working_set_version: "0.1",
      request_id: "ctx_ws_001",
      project_id: "lnsat",
      actor_id: "agent.codex",
      objective: "assemble cited context atoms for BP-0087 implementation",
      consumer: "coding_agent",
      created_at: "2026-05-06T00:00:00.000Z",
      supported_consumers: [
        "coding_agent",
        "policy_engine",
        "audit_preview",
        "operator_handoff",
        "substrate_control",
      ],
      live_collection_allowed: false,
      side_effects: [],
    });
    expect(result.working_set.atom_map).toMatchObject({
      "atom.packet_model.context": {
        atom_id: "atom.packet_model.context",
        source_kind: "docs",
        source_ref: "doc:docs/architecture/PACKET_MODEL.md",
        trust_level: "source_backed",
        freshness: "current",
        relevance: "primary",
        cited: true,
      },
      "atom.bp0087.scope": {
        atom_id: "atom.bp0087.scope",
        source_kind: "ticket",
        source_ref: "ticket:BP-0087",
        trust_level: "source_backed",
        freshness: "current",
        relevance: "primary",
        cited: true,
      },
    });
    expect(result.working_set.working_set_summary).toMatchObject({
      consumer: "coding_agent",
      atom_count: 4,
      source_ref_count: 4,
      primary_focus: [
        "docs: ContextPacket remains packet family but atom contract is product-neutral",
        "ticket: BP-0087 requires atoms working sets trust freshness relevance limits",
      ],
      constraints: [
        "policy: stale uncited unsafe or overbroad context must fail closed",
      ],
      output_limit_status: "within_limits",
    });
    expect(result.working_set.constraints).toMatchObject({
      source_only: true,
      require_source_refs: true,
      stale_context_allowed: false,
      secret_values_allowed: false,
      coding_agent_context_synthesis_role: "one_supported_consumer",
      live_collection_allowed: false,
    });
    expect(result.working_set.source_refs).toEqual(
      expect.arrayContaining([
        "docs:doc:docs/architecture/PACKET_MODEL.md",
        "ticket:ticket:BP-0087",
        "doc:docs/architecture/CONTEXT_SYNTHESIS.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("keeps coding-agent synthesis as one consumer rather than the product identity", () => {
    const result = createContextWorkingSet(
      {
        ...validRequest(),
        consumer: "operator_handoff",
      },
      { now: createdAt },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected context working set success");
    }

    expect(result.working_set.consumer).toBe("operator_handoff");
    expect(result.working_set.supported_consumers).toEqual(
      expect.arrayContaining(["coding_agent", "operator_handoff", "policy_engine"]),
    );
    expect(result.working_set.constraints.coding_agent_context_synthesis_role).toBe(
      "one_supported_consumer",
    );
  });

  it("fails closed for uncited and stale context atoms", () => {
    const request = validRequest();
    const result = createContextWorkingSet(
      {
        ...request,
        atoms: [
          { ...request.atoms[0], source_ref: "" },
          { ...request.atoms[1], freshness: "stale" },
        ],
      },
      { now: createdAt },
    );

    expect(result).toMatchObject({
      ok: false,
      working_set: null,
      raw_input_content: "withheld",
      side_effects: [],
      errors: expect.arrayContaining([
        {
          code: "context_working_set.atom_uncited",
          path: "/atoms/0/source_ref",
          message: "Context atom must include a source_ref citation.",
          severity: "error",
        },
        {
          code: "context_working_set.atom_stale",
          path: "/atoms/1/freshness",
          message: "Context atom is stale and cannot enter the working set.",
          severity: "error",
        },
      ]),
    });
  });

  it("fails closed without raw secret or command echo", () => {
    const result = createContextWorkingSet(
      {
        ...validRequest(),
        atoms: [
          ...validRequest().atoms,
          {
            atom_id: "atom.secret.bad",
            source_kind: "runtime_signal",
            source_ref: "postgres://secret.example.invalid/db",
            summary: "rm -rf / with DATABASE_URL",
            trust_level: "source_backed",
            freshness: "current",
            relevance: "warning",
          },
        ],
        command: "rm -rf /",
      },
      { now: createdAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected context working set failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "context_working_set.unexpected_field",
          path: "/command",
          message: "Unexpected context working-set request field.",
          severity: "error",
        },
        {
          code: "context_working_set.invalid_atom",
          path: "/atoms/4/source_ref",
          message: "Context atom source_ref must be a safe non-secret string.",
          severity: "error",
        },
        {
          code: "context_working_set.invalid_atom",
          path: "/atoms/4/summary",
          message: "Context atom summary must be safe concise source-backed text.",
          severity: "error",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(result)).not.toContain("rm -rf");
  });

  it("fails closed for overbroad context and requested side effects", () => {
    const request = validRequest();
    const result = createContextWorkingSet(
      {
        ...request,
        output_limits: { max_atoms: 3, max_summary_chars: 140 },
        live_collection_allowed: true,
        side_effects: [{ effect_type: "live_fetch" }],
      },
      { now: createdAt },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected context working set failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          code: "context_working_set.output_overbroad",
          path: "/atoms",
          message:
            "Context working set has too many atoms for requested output limits.",
          severity: "error",
        },
        {
          code: "context_working_set.output_overbroad",
          path: "/atoms/summary",
          message: "Context working set summaries exceed requested output limits.",
          severity: "error",
        },
        {
          code: "context_working_set.live_collection_forbidden",
          path: "/live_collection_allowed",
          message:
            "Context working set is source-only and cannot enable live collection.",
          severity: "error",
        },
        {
          code: "context_working_set.side_effects_forbidden",
          path: "/side_effects",
          message: "Context working set must preserve side_effects: [].",
          severity: "error",
        },
      ]),
    );
  });
});

function validRequest() {
  return {
    request_id: "ctx_ws_001",
    project_id: "lnsat",
    actor_id: "agent.codex",
    objective: "assemble cited context atoms for BP-0087 implementation",
    consumer: "coding_agent",
    created_at: createdAt.toISOString(),
    atoms: [
      {
        atom_id: "atom.packet_model.context",
        source_kind: "docs",
        source_ref: "doc:docs/architecture/PACKET_MODEL.md",
        summary:
          "ContextPacket remains packet family but atom contract is product-neutral",
        trust_level: "source_backed",
        freshness: "current",
        relevance: "primary",
        captured_at: createdAt.toISOString(),
      },
      {
        atom_id: "atom.bp0087.scope",
        source_kind: "ticket",
        source_ref: "ticket:BP-0087",
        summary: "BP-0087 requires atoms working sets trust freshness relevance limits",
        trust_level: "source_backed",
        freshness: "current",
        relevance: "primary",
        captured_at: createdAt.toISOString(),
      },
      {
        atom_id: "atom.policy.fail_closed",
        source_kind: "policy",
        source_ref: "doc:docs/architecture/POLICY_AND_AUDIT.md",
        summary: "stale uncited unsafe or overbroad context must fail closed",
        trust_level: "source_backed",
        freshness: "current",
        relevance: "constraint",
        captured_at: createdAt.toISOString(),
      },
      {
        atom_id: "atom.operator.identity",
        source_kind: "conversation",
        source_ref: "conversation:user-request-2026-05-06",
        summary: "operator says coding context is one consumer not full identity",
        trust_level: "operator_supplied",
        freshness: "recent",
        relevance: "supporting",
        captured_at: createdAt.toISOString(),
      },
    ],
    output_limits: {
      max_atoms: 6,
      max_source_refs: 8,
      max_summary_chars: 600,
      max_atom_summary_chars: 120,
    },
    live_collection_allowed: false,
    side_effects: [],
  };
}
