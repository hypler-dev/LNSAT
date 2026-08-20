import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  canonicalizePacketEnvelopeV1,
  hashPacketEnvelopeV1,
  packetEnvelopeV1Contract,
  parsePacketEnvelopeV1Json,
  validatePacketEnvelopeV1,
  validateUniversalPacket,
  type PacketEnvelopeV1,
} from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

type GoldenVectors = {
  schema: string;
  vectors: Array<{
    case_id: string;
    packet: unknown;
    canonical_json: string;
    canonical_sha256: string;
  }>;
  canonicalization_cases: Array<{
    case_id: string;
    constraints: Record<string, unknown>;
    expected_canonical_json: string;
    expected_sha256: string;
  }>;
  validation_cases: Array<{
    case_id: string;
    mutation: string;
    expected: string;
  }>;
};

describe("@lnsat/packets v1 packet envelope", () => {
  it("validates the shared stable v1 golden vector", async () => {
    const fixture = await readGoldenVectors();

    expect(fixture.schema).toBe("lnsat.packet_envelope.golden_vectors.v1_0");
    expect(fixture.vectors).toHaveLength(1);

    for (const vector of fixture.vectors) {
      const result = validatePacketEnvelopeV1(vector.packet);
      expect(result.ok, vector.case_id).toBe(true);
      if (!result.ok) throw new Error(`${vector.case_id} did not validate`);

      expect(canonicalizePacketEnvelopeV1(result.packet), vector.case_id).toBe(
        vector.canonical_json,
      );
      await expect(hashPacketEnvelopeV1(result.packet), vector.case_id).resolves.toBe(
        vector.canonical_sha256,
      );
    }
  });

  it("freezes canonicalization, hashing, and compatibility posture", () => {
    expect(packetEnvelopeV1Contract).toEqual({
      contract_id: "lnsat.packet_envelope.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.packet_envelope.schema.v1_0",
      compatibility: {
        legacy_schema_id: "lnsat.packet_envelope.schema.v0_1",
        implicit_upgrade_allowed: false,
        implicit_downgrade_allowed: false,
      },
      canonicalization: {
        contract_id: "lnsat.canonical_json.v1_0",
        encoding: "utf-8",
        object_key_order: "ascending_utf16_code_units",
        array_order: "preserved",
        unicode_normalization: "none",
        number_domain: "safe_integers_only",
      },
      hashing: {
        contract_id: "lnsat.packet_hash.v1_0",
        algorithm: "sha-256",
        input: "canonical_utf8_bytes",
        output: "sha256:<lowercase_hex>",
      },
      side_effects: [],
    });
  });

  it("matches shared Rust parser and schema-validation vectors", async () => {
    const fixture = await readGoldenVectors();
    const base = fixture.vectors[0]?.packet;
    if (base === undefined) throw new Error("stable packet vector missing");

    for (const testCase of fixture.validation_cases) {
      const input = validationInput(base, testCase.mutation);
      const result = parsePacketEnvelopeV1Json(input);
      const actual = result.ok ? "ok" : result.errors[0]?.code;
      expect(actual, testCase.case_id).toBe(testCase.expected);
      expect(result.side_effects, testCase.case_id).toEqual([]);
    }
  });

  it("produces the same canonical bytes and digest for reordered objects", async () => {
    const packet = await readValidPacket();
    const reordered = {
      expires_at: packet.expires_at,
      created_at: packet.created_at,
      idempotency_key: packet.idempotency_key,
      requires_approval: packet.requires_approval,
      constraints: {
        writes: packet.constraints.writes,
        network: packet.constraints.network,
      },
      budget: {
        memory_bytes: packet.budget.memory_bytes,
        cpu_millicores: packet.budget.cpu_millicores,
        cost_microusd: packet.budget.cost_microusd,
        runtime_seconds: packet.budget.runtime_seconds,
        tokens: packet.budget.tokens,
      },
      permission_envelope: {
        block: packet.permission_envelope.block,
        allow: packet.permission_envelope.allow,
      },
      policy_profile_ref: packet.policy_profile_ref,
      resource_refs: packet.resource_refs,
      source_refs: packet.source_refs,
      risk_level: packet.risk_level,
      intent: packet.intent,
      project_ref: packet.project_ref,
      session_ref: packet.session_ref,
      actor_ref: packet.actor_ref,
      packet_type: packet.packet_type,
      packet_id: packet.packet_id,
      schema_id: packet.schema_id,
      contract_version: packet.contract_version,
    };
    const result = validatePacketEnvelopeV1(reordered);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("reordered packet did not validate");

    expect(canonicalizePacketEnvelopeV1(result.packet)).toBe(
      canonicalizePacketEnvelopeV1(packet),
    );
    await expect(hashPacketEnvelopeV1(result.packet)).resolves.toBe(
      await hashPacketEnvelopeV1(packet),
    );
  });

  it("uses UTF-16 key order, preserves arrays, and freezes string escaping", async () => {
    const fixture = await readGoldenVectors();
    const packet = await readValidPacket();
    expect(fixture.canonicalization_cases).toHaveLength(1);
    const testCase = fixture.canonicalization_cases[0];
    if (testCase === undefined) throw new Error("canonical edge case missing");
    const result = validatePacketEnvelopeV1({
      ...packet,
      constraints: testCase.constraints,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("canonical edge packet did not validate");

    const canonical = canonicalizePacketEnvelopeV1(result.packet);
    expect(canonical, testCase.case_id).toBe(testCase.expected_canonical_json);
    await expect(hashPacketEnvelopeV1(result.packet), testCase.case_id).resolves.toBe(
      testCase.expected_sha256,
    );
    expect(canonical.indexOf('"😀"')).toBeLessThan(canonical.indexOf('"\ue000"'));
    expect(canonical).toContain(
      String.raw`"array":[{"a":1,"z":2},"line\nbreak","é","line paragraph end"]`,
    );

    const reorderedArray = validatePacketEnvelopeV1({
      ...result.packet,
      constraints: {
        ...result.packet.constraints,
        array: ["é", "line\nbreak", { a: 1, z: 2 }],
      },
    });
    expect(reorderedArray.ok).toBe(true);
    if (!reorderedArray.ok) throw new Error("array reorder did not validate");
    expect(canonicalizePacketEnvelopeV1(reorderedArray.packet)).not.toBe(canonical);
  });

  it("rejects unsupported contract or schema versions without fallback", async () => {
    const packet = await readValidPacket();

    expect(
      validatePacketEnvelopeV1({
        ...packet,
        contract_version: "lnsat.contracts.v1_1",
      }),
    ).toMatchObject({
      ok: false,
      packet: null,
      errors: [{ code: "packet_envelope.unsupported_contract_version" }],
      side_effects: [],
    });
    expect(
      validatePacketEnvelopeV1({
        ...packet,
        schema_id: "lnsat.packet_envelope.schema.v0_1",
      }),
    ).toMatchObject({
      ok: false,
      packet: null,
      errors: [{ code: "packet_envelope.unsupported_schema" }],
      side_effects: [],
    });
  });

  it("keeps the legacy v0.1 parser separate instead of upgrading implicitly", async () => {
    const packet = await readValidPacket();
    const legacy = {
      packet_id: packet.packet_id,
      packet_type: packet.packet_type,
      version: "0.1",
      project_id: "lnsat",
      actor_id: "agent.codex",
      session_id: "sess_legacy_0001",
      intent: packet.intent,
      risk_level: packet.risk_level,
      source_refs: packet.source_refs,
      resource_refs: packet.resource_refs,
      policy_profile: "agent_sandbox",
      permission_envelope: packet.permission_envelope,
      budget: {
        tokens: packet.budget.tokens,
        runtime_seconds: packet.budget.runtime_seconds,
        cost_usd: 0.5,
        cpu: 2,
        memory_mb: 4096,
      },
      constraints: packet.constraints,
      requires_approval: packet.requires_approval,
      ttl_seconds: 900,
      created_at: packet.created_at,
    };

    expect(validateUniversalPacket(legacy).ok).toBe(true);
    expect(validatePacketEnvelopeV1(legacy)).toMatchObject({
      ok: false,
      packet: null,
      side_effects: [],
    });
  });

  it("rejects noncanonical collections and conflicting permissions", async () => {
    const packet = await readValidPacket();

    const result = validatePacketEnvelopeV1({
      ...packet,
      source_refs: [...packet.source_refs].reverse(),
      permission_envelope: {
        allow: ["tests.run.sandbox"],
        block: ["tests.run.sandbox"],
      },
    });

    expect(result).toMatchObject({
      ok: false,
      packet: null,
      side_effects: [],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "packet_envelope.noncanonical_collection",
          path: "/source_refs",
        }),
        expect.objectContaining({
          code: "packet_envelope.invalid_field",
          path: "/permission_envelope/allow/0",
        }),
      ]),
    );
  });

  it("rejects embedded credentials, fractional numbers, and invalid expiry", async () => {
    const packet = await readValidPacket();
    const result = validatePacketEnvelopeV1({
      ...packet,
      budget: { ...packet.budget, tokens: -0, cost_microusd: 0.5 },
      constraints: {
        ...packet.constraints,
        password: "withheld",
      },
      expires_at: packet.created_at,
    });

    expect(result).toMatchObject({
      ok: false,
      packet: null,
      side_effects: [],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "packet_envelope.invalid_field",
          path: "/budget/cost_microusd",
        }),
        expect.objectContaining({
          code: "packet_envelope.invalid_field",
          path: "/budget/tokens",
        }),
        expect.objectContaining({
          code: "packet_envelope.secret_value_embedded",
          path: "/constraints/*",
        }),
        expect.objectContaining({
          code: "packet_envelope.invalid_time_window",
          path: "/expires_at",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("withheld");
  });

  it("refuses to hash an unvalidated runtime object without reflecting input", async () => {
    const packet = await readValidPacket();
    const invalidPacket = {
      ...packet,
      attacker_secret_name: "withheld",
    } as PacketEnvelopeV1;

    expect(validatePacketEnvelopeV1(invalidPacket)).toMatchObject({
      ok: false,
      errors: [
        {
          code: "packet_envelope.unexpected_field",
          path: "",
          message: "Unexpected field.",
        },
      ],
    });
    await expect(hashPacketEnvelopeV1(invalidPacket)).rejects.toThrow(
      "packet_envelope.unexpected_field",
    );

    try {
      await hashPacketEnvelopeV1(invalidPacket);
    } catch (caught) {
      expect(String(caught)).not.toContain("attacker_secret_name");
      expect(String(caught)).not.toContain("withheld");
    }
  });

  it("keeps replay identity deterministic and side-effect free", async () => {
    const packet = await readValidPacket();
    const first = await hashPacketEnvelopeV1(packet);
    const replay = await hashPacketEnvelopeV1(structuredClone(packet));

    expect(replay).toBe(first);
    expect(packet.idempotency_key).toBe("idem_execute_v1_0001");
    expect(validatePacketEnvelopeV1(packet).side_effects).toEqual([]);
  });
});

async function readGoldenVectors(): Promise<GoldenVectors> {
  return JSON.parse(
    await readFile(
      join(repoRoot, "fixtures", "contracts", "packet-envelope-v1_0.json"),
      "utf8",
    ),
  ) as GoldenVectors;
}

function validationInput(base: unknown, mutation: string): string {
  if (mutation === "malformed_json") return '{"contract_version":';
  if (mutation === "root_array") return "[]";
  if (mutation === "set_risk_integral_decimal") {
    return JSON.stringify(base).replace('"risk_level":3', '"risk_level":3.0');
  }
  if (mutation === "set_constraint_negative_zero") {
    return JSON.stringify(base).replace(
      '"constraints":{',
      '"constraints":{"negative_zero":-0,',
    );
  }

  const packet = structuredClone(base) as Record<string, unknown>;
  switch (mutation) {
    case "none":
      break;
    case "add_unknown_root_field":
      packet.unexpected = true;
      break;
    case "remove_schema_id":
      delete packet.schema_id;
      break;
    case "set_contract_v1_1":
      packet.contract_version = "lnsat.contracts.v1_1";
      break;
    case "set_contract_number":
      packet.contract_version = 1;
      break;
    case "set_schema_v0_1":
      packet.schema_id = "lnsat.packet_envelope.schema.v0_1";
      break;
    case "set_risk_string":
      packet.risk_level = "3";
      break;
    case "set_permission_allow_string":
      (packet.permission_envelope as Record<string, unknown>).allow =
        "tests.run.sandbox";
      break;
    case "set_permission_leading_digit":
      (packet.permission_envelope as Record<string, unknown>).allow = ["1tests.run"];
      break;
    case "set_permission_allow_unsorted":
      (packet.permission_envelope as Record<string, unknown>).allow = [
        "tests.write",
        "tests.read",
      ];
      break;
    case "set_permission_block_duplicate":
      (packet.permission_envelope as Record<string, unknown>).block = [
        "network.open",
        "network.open",
      ];
      break;
    case "set_permission_allow_block_conflict":
      (packet.permission_envelope as Record<string, unknown>).allow = ["network.open"];
      break;
    case "set_created_at_invalid_calendar":
      packet.created_at = "2026-02-31T00:00:00Z";
      break;
    case "set_expires_equal_created":
      packet.expires_at = packet.created_at;
      break;
    case "set_constraint_fractional_number":
      (packet.constraints as Record<string, unknown>).fractional = 1.5;
      break;
    case "set_constraint_unsafe_integer":
      (packet.constraints as Record<string, unknown>).unsafe = 9_007_199_254_740_992;
      break;
    default:
      throw new Error(`unknown validation mutation: ${mutation}`);
  }
  return JSON.stringify(packet);
}

async function readValidPacket(): Promise<PacketEnvelopeV1> {
  const fixture = await readGoldenVectors();
  const result = validatePacketEnvelopeV1(fixture.vectors[0]?.packet);
  if (!result.ok) throw new Error("shared v1 packet did not validate");
  return result.packet;
}
