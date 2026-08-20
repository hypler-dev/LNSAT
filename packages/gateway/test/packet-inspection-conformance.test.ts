import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectPacketGatewayRequest } from "../src/index.js";

type GoldenFixture = {
  observed_at: string;
  cases: Array<{
    id: string;
    request_id: string;
    packet_fixture?: string;
    request?: Record<string, unknown>;
    expected: {
      ok: boolean;
      request_digest: string | null;
      packet_hash?: string;
      policy_decision?: string;
      error_code?: string;
      error_path?: string;
      request_error_codes?: string[];
      side_effects: [];
    };
  }>;
};

const repoRoot = join(process.cwd(), "../..");

describe("transport-neutral packet inspection golden fixture", () => {
  it("freezes canonical digests, decisions, bounded errors, and side effects", async () => {
    const fixture = JSON.parse(
      await readFile(
        join(
          repoRoot,
          "fixtures/contracts/transport-neutral-packet-inspection-v0_1.json",
        ),
        "utf8",
      ),
    ) as GoldenFixture;
    const now = new Date(fixture.observed_at);

    for (const testCase of fixture.cases) {
      const packet =
        testCase.packet_fixture === undefined
          ? undefined
          : JSON.parse(await readFile(join(repoRoot, testCase.packet_fixture), "utf8"));
      const request =
        testCase.request === undefined
          ? { request_id: testCase.request_id, packet }
          : { request_id: testCase.request_id, ...testCase.request };
      const response = await inspectPacketGatewayRequest(request, { now });

      expect(response.ok, testCase.id).toBe(testCase.expected.ok);
      expect(response.request_digest, testCase.id).toBe(
        testCase.expected.request_digest,
      );
      expect(response.side_effects, testCase.id).toEqual(
        testCase.expected.side_effects,
      );

      if (response.ok) {
        expect(response.packet_ref.packet_hash, testCase.id).toBe(
          testCase.expected.packet_hash,
        );
        expect(response.policy_decision.decision, testCase.id).toBe(
          testCase.expected.policy_decision,
        );
      } else if (testCase.expected.request_error_codes !== undefined) {
        expect(
          response.request_errors.map((error) => error.code),
          testCase.id,
        ).toEqual(testCase.expected.request_error_codes);
      } else {
        expect(response.validation.errors, testCase.id).toContainEqual(
          expect.objectContaining({
            code: testCase.expected.error_code,
            path: testCase.expected.error_path,
          }),
        );
      }
    }
  });
});
