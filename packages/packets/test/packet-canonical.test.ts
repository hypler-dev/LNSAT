import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  canonicalizeUniversalPacket,
  diffUniversalPackets,
  hashUniversalPacket,
  validateUniversalPacket,
  type UniversalPacket,
} from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const validFixtureRoot = join(packageRoot, "fixtures", "valid");

describe("canonical packet serialization", () => {
  it("serializes validated packet JSON with sorted object keys", async () => {
    const packet = await readValidPacket("context-packet.json");
    const canonicalPacket = canonicalizeUniversalPacket(packet);

    expect(canonicalPacket).toBe(JSON.stringify(JSON.parse(canonicalPacket)));
    expect(canonicalPacket.indexOf('"actor_id"')).toBeLessThan(
      canonicalPacket.indexOf('"budget"'),
    );
    expect(canonicalPacket.indexOf('"budget"')).toBeLessThan(
      canonicalPacket.indexOf('"constraints"'),
    );
    expect(canonicalPacket.indexOf('"cost_usd"')).toBeLessThan(
      canonicalPacket.indexOf('"cpu"'),
    );
    expect(canonicalPacket).not.toContain("\n");
  });

  it("keeps canonical output stable when equivalent objects use different key order", async () => {
    const packet = await readValidPacket("execution-packet.json");
    const reorderedPacket = {
      created_at: packet.created_at,
      ttl_seconds: packet.ttl_seconds,
      requires_approval: packet.requires_approval,
      constraints: {
        writes: packet.constraints.writes,
        network: packet.constraints.network,
      },
      budget: {
        memory_mb: packet.budget.memory_mb,
        cpu: packet.budget.cpu,
        cost_usd: packet.budget.cost_usd,
        runtime_seconds: packet.budget.runtime_seconds,
        tokens: packet.budget.tokens,
      },
      permission_envelope: {
        block: packet.permission_envelope.block,
        allow: packet.permission_envelope.allow,
      },
      policy_profile: packet.policy_profile,
      resource_refs: packet.resource_refs,
      source_refs: packet.source_refs,
      risk_level: packet.risk_level,
      intent: packet.intent,
      session_id: packet.session_id,
      actor_id: packet.actor_id,
      project_id: packet.project_id,
      version: packet.version,
      packet_type: packet.packet_type,
      packet_id: packet.packet_id,
    };

    const validation = validateUniversalPacket(reorderedPacket);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      throw new Error("reordered packet should validate");
    }

    expect(canonicalizeUniversalPacket(validation.packet)).toBe(
      canonicalizeUniversalPacket(packet),
    );
    await expect(hashUniversalPacket(validation.packet)).resolves.toBe(
      await hashUniversalPacket(packet),
    );
  });
});

describe("packet hash", () => {
  it("returns deterministic sha256 output from canonical packet JSON", async () => {
    const packet = await readValidPacket("context-packet.json");
    const canonicalPacket = canonicalizeUniversalPacket(packet);
    const expectedHash = createHash("sha256").update(canonicalPacket).digest("hex");

    await expect(hashUniversalPacket(packet)).resolves.toBe(`sha256:${expectedHash}`);
    await expect(hashUniversalPacket(packet)).resolves.toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe("packet diff", () => {
  it("returns narrow deterministic JSON pointer diffs", async () => {
    const before = await readValidPacket("context-packet.json");
    const after: UniversalPacket = {
      ...before,
      intent: "Compile bounded context with hash evidence.",
      constraints: {
        ...before.constraints,
        output_contract: "summary_with_hash",
      },
      budget: {
        ...before.budget,
        tokens: 9000,
      },
    };

    expect(diffUniversalPackets(before, after)).toEqual([
      {
        op: "replace",
        path: "/budget/tokens",
        before: 8000,
        after: 9000,
      },
      {
        op: "replace",
        path: "/constraints/output_contract",
        before: "summary_with_source_refs",
        after: "summary_with_hash",
      },
      {
        op: "replace",
        path: "/intent",
        before: "Compile source-backed context for a bounded packet task.",
        after: "Compile bounded context with hash evidence.",
      },
    ]);
  });
});

async function readValidPacket(name: string): Promise<UniversalPacket> {
  const value = JSON.parse(await readFile(join(validFixtureRoot, name), "utf8"));
  const result = validateUniversalPacket(value);
  if (!result.ok) {
    throw new Error(`${name} did not validate`);
  }

  return result.packet;
}
