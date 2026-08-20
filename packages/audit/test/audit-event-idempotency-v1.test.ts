import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  auditEventV1IdempotencyContract,
  evaluateAuditEventV1Idempotency,
  type AuditEventV1IdempotencyRef,
} from "../src/index.js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

describe("@lnsat/audit v1 event idempotency", () => {
  it("matches shared append, replay, collision, and invalid-ref vectors", async () => {
    const fixture = await readFixture();

    for (const testCase of fixture.cases) {
      const input = inputFor(fixture, testCase.mutation);
      const before = structuredClone(input);
      const result = evaluateAuditEventV1Idempotency(input);
      const actual = result.ok ? result.outcome : result.errors[0]?.code;

      expect(actual, testCase.case_id).toBe(testCase.expected);
      expect(input, testCase.case_id).toEqual(before);
      expect(result.side_effects, testCase.case_id).toEqual([]);
      expect(result.write_performed, testCase.case_id).toBe(false);
      if (result.ok && result.outcome === "exact_replay") {
        expect(result.next_state_count, testCase.case_id).toBe(
          result.previous_state_count,
        );
      }
      if (!result.ok) {
        expect(result.state_unchanged, testCase.case_id).toBe(true);
        expect(result.raw_input_content, testCase.case_id).toBe("withheld");
      }
    }
    expect(fixture.cases).toHaveLength(7);
  });

  it("rejects oversized state without inspecting entries", () => {
    const candidate = validCandidate();
    const result = evaluateAuditEventV1Idempotency({
      prior_state: Array.from(
        { length: auditEventV1IdempotencyContract.maximum_prior_entries + 1 },
        () => candidate,
      ),
      candidate,
    });

    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "audit_event_idempotency.invalid_prior_state" }],
      state_unchanged: true,
      write_performed: false,
      side_effects: [],
    });
  });
});

type IdempotencyFixture = {
  candidate: AuditEventV1IdempotencyRef;
  unrelated_prior: AuditEventV1IdempotencyRef;
  cases: {
    case_id: string;
    mutation:
      | "none"
      | "unrelated_prior"
      | "exact_replay"
      | "collision"
      | "duplicate_prior"
      | "invalid_prior"
      | "invalid_candidate";
    expected: string;
  }[];
};

async function readFixture(): Promise<IdempotencyFixture> {
  return JSON.parse(
    await readFile(
      join(repoRoot, "fixtures/contracts/audit-idempotency-v1_0.json"),
      "utf8",
    ),
  ) as IdempotencyFixture;
}

function inputFor(
  fixture: IdempotencyFixture,
  mutation: IdempotencyFixture["cases"][number]["mutation"],
): unknown {
  const candidate = structuredClone(fixture.candidate);
  switch (mutation) {
    case "none":
      return { prior_state: [], candidate };
    case "unrelated_prior":
      return {
        prior_state: [structuredClone(fixture.unrelated_prior)],
        candidate,
      };
    case "exact_replay":
      return { prior_state: [structuredClone(candidate)], candidate };
    case "collision":
      return {
        prior_state: [
          {
            ...structuredClone(candidate),
            event_id: `aud_${"c".repeat(64)}`,
          },
        ],
        candidate,
      };
    case "duplicate_prior":
      return {
        prior_state: [
          structuredClone(fixture.unrelated_prior),
          structuredClone(fixture.unrelated_prior),
        ],
        candidate,
      };
    case "invalid_prior":
      return {
        prior_state: [
          {
            ...structuredClone(fixture.unrelated_prior),
            event_id: "aud_invalid",
          },
        ],
        candidate,
      };
    case "invalid_candidate":
      return {
        prior_state: [],
        candidate: { ...candidate, idempotency_key: "audit:invalid" },
      };
  }
}

function validCandidate(): AuditEventV1IdempotencyRef {
  return {
    idempotency_key: `audit:approval.decision_recorded:apd_${"a".repeat(64)}`,
    event_id: `aud_${"a".repeat(64)}`,
  };
}
