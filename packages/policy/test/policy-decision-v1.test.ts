import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { PacketEnvelopeV1 } from "@lnsat/packets";
import {
  decidePacketEnvelopePolicyV1,
  policyDecisionV1Contract,
} from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/policy v1 decision contract", () => {
  it("matches the authoritative allow golden vector", async () => {
    const schema = await readJson<Record<string, unknown>>(
      "packages/policy/schemas/policy-decision-v1.schema.json",
    );
    const policyFixture = await readJson<PolicyGoldenFixture>(
      "fixtures/contracts/policy-decision-v1_0.json",
    );
    const packet = await readPacketVector();
    const vector = policyFixture.vectors[0];
    if (vector === undefined) throw new Error("policy vector missing");

    const result = await decidePacketEnvelopePolicyV1(packet, {
      evaluated_at: vector.evaluated_at,
    });

    expect(policyFixture.schema).toBe("lnsat.policy_decision.golden_vectors.v1_0");
    expect(schema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://lnsat.local/schemas/policy-decision-v1.schema.json",
      additionalProperties: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("policy vector did not evaluate");
    expect(result.policy_decision).toMatchObject({
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.policy_decision.schema.v1_0",
      decision_id: vector.expected.decision_id,
      packet_ref: {
        packet_id: packet.packet_id,
        schema_id: packet.schema_id,
        packet_hash: vector.expected.packet_hash,
        idempotency_key: packet.idempotency_key,
      },
      capability_decisions: vector.expected.capability_decisions,
      decision: vector.expected.decision,
      requires_approval: vector.expected.requires_approval,
      reason_codes: vector.expected.reason_codes,
      evaluated_at: vector.evaluated_at,
      expires_at: packet.expires_at,
      side_effects: vector.expected.side_effects,
    });
    expect(result.errors).toEqual([]);
    expect(result.side_effects).toEqual([]);
  });

  it("freezes fail-closed policy precedence and supported rules", () => {
    expect(policyDecisionV1Contract).toMatchObject({
      contract_id: "lnsat.policy_decision.v1_0",
      contract_version: "lnsat.contracts.v1_0",
      schema_id: "lnsat.policy_decision.schema.v1_0",
      supported_policy_profiles: ["policy:agent_sandbox"],
      approval_risk_threshold: 5,
      unknown_capability_behavior: "deny",
      unknown_policy_profile_behavior: "deny",
      precedence: ["deny", "approval_required", "allow"],
      evaluation_window: "created_at <= evaluated_at < expires_at",
      decision_identity: {
        algorithm: "sha-256",
        input: "<policy_schema_id>\\n<packet_sha256>\\n<canonical_evaluated_at>",
        output: "pol_<lowercase_hex>",
      },
      side_effects: [],
    });
  });

  it("matches all shared policy evaluation cases", async () => {
    const fixture = await readJson<PolicyGoldenFixture>(
      "fixtures/contracts/policy-decision-v1_0.json",
    );
    const base = await readPacketVector();

    expect(fixture.evaluation_cases).toHaveLength(13);
    for (const testCase of fixture.evaluation_cases) {
      const result = await decidePacketEnvelopePolicyV1(
        applyPolicyMutation(base, testCase.mutation),
        { evaluated_at: testCase.evaluated_at },
      );
      if ("expected_error" in testCase) {
        expect(result).toMatchObject({
          ok: false,
          errors: [{ code: testCase.expected_error }],
          policy_decision: null,
          side_effects: [],
        });
      } else {
        expect(result).toMatchObject({
          ok: true,
          policy_decision: testCase.expected,
          errors: [],
          side_effects: [],
        });
      }
    }
  });

  it("denies unsupported policy profiles with auditable evidence", async () => {
    const result = await decide({
      ...(await readPacketVector()),
      policy_profile_ref: "policy:unknown",
    });

    expect(result).toMatchObject({
      ok: true,
      policy_decision: {
        decision: "deny",
        requires_approval: false,
        reason_codes: ["policy.profile_unsupported"],
        capability_decisions: [
          {
            capability: "tests.run.sandbox",
            decision: "deny",
            reason_code: "policy.profile_unsupported",
          },
        ],
        side_effects: [],
      },
      side_effects: [],
    });
  });

  it("denies forbidden, unknown, or absent capabilities", async () => {
    const packet = await readPacketVector();
    const cases = [
      {
        allow: ["root"],
        reason: "policy.capability_forbidden",
      },
      {
        allow: ["teleport.execute"],
        reason: "policy.capability_unknown",
      },
      {
        allow: [],
        reason: "policy.no_capability_requested",
      },
    ] as const;

    for (const testCase of cases) {
      const result = await decide({
        ...packet,
        permission_envelope: {
          ...packet.permission_envelope,
          allow: [...testCase.allow],
        },
      });
      expect(result).toMatchObject({
        ok: true,
        policy_decision: {
          decision: "deny",
          requires_approval: false,
          reason_codes: [testCase.reason],
        },
      });
    }
  });

  it("requires approval for explicit, risk, or capability gates", async () => {
    const packet = await readPacketVector();
    const cases = [
      {
        packet: { ...packet, requires_approval: true },
        reason: "policy.packet_requires_approval",
      },
      {
        packet: { ...packet, risk_level: 5 },
        reason: "policy.risk_requires_approval",
      },
      {
        packet: {
          ...packet,
          permission_envelope: {
            ...packet.permission_envelope,
            allow: ["deploy.request"],
          },
        },
        reason: "policy.capability_requires_approval",
      },
    ];

    for (const testCase of cases) {
      const result = await decide(testCase.packet);
      expect(result).toMatchObject({
        ok: true,
        policy_decision: {
          decision: "approval_required",
          requires_approval: true,
          reason_codes: [testCase.reason],
        },
      });
    }
  });

  it("keeps denial above approval while preserving all reason evidence", async () => {
    const packet = await readPacketVector();
    const result = await decide({
      ...packet,
      risk_level: 6,
      requires_approval: true,
      permission_envelope: {
        ...packet.permission_envelope,
        allow: ["root"],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      policy_decision: {
        decision: "deny",
        requires_approval: false,
        reason_codes: [
          "policy.capability_forbidden",
          "policy.packet_requires_approval",
          "policy.risk_requires_approval",
        ],
      },
    });
  });

  it("rejects invalid or expired packet evidence without reflecting input", async () => {
    const packet = await readPacketVector();
    const invalid = {
      ...packet,
      attacker_secret_name: "withheld",
    } as PacketEnvelopeV1;

    const invalidResult = await decide(invalid);
    expect(invalidResult).toMatchObject({
      ok: false,
      policy_decision: null,
      errors: [{ code: "policy_decision.invalid_packet", path: "/packet" }],
      side_effects: [],
    });
    expect(JSON.stringify(invalidResult)).not.toContain("attacker_secret_name");
    expect(JSON.stringify(invalidResult)).not.toContain("withheld");

    await expect(
      decidePacketEnvelopePolicyV1(packet, {
        evaluated_at: packet.expires_at,
      }),
    ).resolves.toMatchObject({
      ok: false,
      policy_decision: null,
      errors: [{ code: "policy_decision.packet_expired" }],
      side_effects: [],
    });
  });

  it("rejects malformed evaluation timestamps", async () => {
    await expect(
      decidePacketEnvelopePolicyV1(await readPacketVector(), {
        evaluated_at: "2026-02-31T00:00:00Z",
      }),
    ).resolves.toMatchObject({
      ok: false,
      policy_decision: null,
      errors: [{ code: "policy_decision.invalid_evaluation_time" }],
      side_effects: [],
    });
  });

  it("rejects missing runtime options and snapshots input before async hashing", async () => {
    const packet = await readPacketVector();
    await expect(
      decidePacketEnvelopePolicyV1(packet, undefined as never),
    ).resolves.toMatchObject({
      ok: false,
      policy_decision: null,
      errors: [{ code: "policy_decision.invalid_evaluation_time" }],
      side_effects: [],
    });

    const originalActorRef = packet.actor_ref;
    const pending = decide(packet);
    packet.actor_ref = "identity:agent:mutated";
    const result = await pending;

    expect(result).toMatchObject({
      ok: true,
      policy_decision: {
        actor_ref: originalActorRef,
      },
    });
  });

  it("replays the same packet and evaluation instant deterministically", async () => {
    const packet = await readPacketVector();
    const first = await decide(packet);
    const replay = await decide(structuredClone(packet));

    expect(replay).toEqual(first);
    expect(replay.side_effects).toEqual([]);
  });
});

async function decide(packet: PacketEnvelopeV1) {
  return decidePacketEnvelopePolicyV1(packet, {
    evaluated_at: packet.created_at,
  });
}

async function readPacketVector(): Promise<PacketEnvelopeV1> {
  const fixture = await readJson<PacketGoldenFixture>(
    "fixtures/contracts/packet-envelope-v1_0.json",
  );
  const packet = fixture.vectors[0]?.packet;
  if (packet === undefined) throw new Error("packet vector missing");
  return packet;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(repoRoot, path), "utf8")) as T;
}

function applyPolicyMutation(
  base: PacketEnvelopeV1,
  mutation: string,
): PacketEnvelopeV1 {
  const packet = structuredClone(base);
  switch (mutation) {
    case "none":
      break;
    case "set_unsupported_profile":
      packet.policy_profile_ref = "policy:unknown";
      break;
    case "set_forbidden_capability":
      packet.permission_envelope.allow = ["root"];
      break;
    case "set_unknown_capability":
      packet.permission_envelope.allow = ["teleport.execute"];
      break;
    case "clear_capabilities":
      packet.permission_envelope.allow = [];
      break;
    case "set_requires_approval":
      packet.requires_approval = true;
      break;
    case "set_risk_threshold":
      packet.risk_level = 5;
      break;
    case "set_approval_capability":
      packet.permission_envelope.allow = ["deploy.request"];
      break;
    case "set_denial_and_approval":
      packet.permission_envelope.allow = ["root"];
      packet.requires_approval = true;
      packet.risk_level = 6;
      break;
    case "set_invalid_created_at":
      packet.created_at = "2026-02-31T00:00:00Z";
      break;
    default:
      throw new Error(`Unknown policy mutation: ${mutation}`);
  }
  return packet;
}

type PacketGoldenFixture = {
  vectors: Array<{ case_id: string; packet: PacketEnvelopeV1 }>;
};

type PolicyGoldenFixture = {
  schema: string;
  vectors: Array<{
    case_id: string;
    evaluated_at: string;
    expected: {
      decision_id: string;
      packet_hash: string;
      decision: string;
      requires_approval: boolean;
      capability_decisions: Array<{
        capability: string;
        decision: string;
        reason_code: string | null;
      }>;
      reason_codes: string[];
      side_effects: [];
    };
  }>;
  evaluation_cases: Array<
    {
      case_id: string;
      mutation: string;
      evaluated_at: string;
    } & (
      | {
          expected: {
            decision: string;
            requires_approval: boolean;
            reason_codes: string[];
            capability_decisions: Array<{
              capability: string;
              decision: string;
              reason_code: string | null;
            }>;
          };
        }
      | { expected_error: string }
    )
  >;
};
