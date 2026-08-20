import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createAuditEventV1 } from "../src/index.js";
import {
  validateContractVersion,
  validatePacketEnvelopeV1,
  type PacketEnvelopeV1,
} from "@lnsat/packets";
import {
  createApprovalRequestV1,
  decideApprovalRequestV1,
  decidePacketEnvelopePolicyV1,
} from "@lnsat/policy";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

type ErrorVector = {
  case_id: string;
  family_result_field:
    | "version"
    | "packet"
    | "policy_decision"
    | "approval_request"
    | "approval_decision"
    | "audit_event";
  expected: {
    code: string;
    path: string;
    severity: "error";
  };
};

type ErrorEnvelopeFixture = {
  schema: string;
  vectors: ErrorVector[];
};

type FailureResult = {
  ok: false;
  errors: Array<{
    code: string;
    path: string;
    message: string;
    severity: "error";
  }>;
  side_effects: [];
} & Record<string, unknown>;

describe("@lnsat/audit stable v1 error-envelope conformance", () => {
  it("matches all frozen family vectors without reflecting rejected input", async () => {
    const fixture = await readFixture<ErrorEnvelopeFixture>(
      "fixtures/contracts/error-envelope-v1_0.json",
    );
    expect(fixture.schema).toBe("lnsat.error_envelope.golden_vectors.v1_0");
    expect(fixture.vectors).toHaveLength(6);

    const packetFixture = await readFixture<{
      vectors: Array<{ packet: PacketEnvelopeV1 }>;
    }>("fixtures/contracts/packet-envelope-v1_0.json");
    const packet = packetFixture.vectors[0]?.packet;
    if (packet === undefined) throw new Error("stable packet fixture must exist");

    const allowPolicy = await decidePacketEnvelopePolicyV1(packet, {
      evaluated_at: "2026-07-22T20:00:00Z",
    });
    if (!allowPolicy.ok) throw new Error("allow policy fixture must validate");

    const approvalPacket = structuredClone(packet);
    approvalPacket.permission_envelope.allow = ["deploy.request"];
    const approvalPolicy = await decidePacketEnvelopePolicyV1(approvalPacket, {
      evaluated_at: "2026-07-22T20:00:00Z",
    });
    if (!approvalPolicy.ok) throw new Error("approval policy fixture must validate");
    const approvalRequest = await createApprovalRequestV1(
      approvalPolicy.policy_decision,
      { requested_at: "2026-07-22T20:01:00Z" },
    );
    if (!approvalRequest.ok) throw new Error("approval request fixture must validate");

    const results = new Map<string, FailureResult>([
      [
        "contract_version_unsupported",
        asFailure(validateContractVersion("lnsat.contracts.v1_1")),
      ],
      [
        "packet_contract_unsupported",
        asFailure(
          validatePacketEnvelopeV1({
            ...packet,
            contract_version: "lnsat.contracts.v1_1",
          }),
        ),
      ],
      [
        "policy_time_malformed",
        asFailure(
          await decidePacketEnvelopePolicyV1(packet, {
            evaluated_at: "not-a-time",
          }),
        ),
      ],
      [
        "approval_request_not_required",
        asFailure(
          await createApprovalRequestV1(allowPolicy.policy_decision, {
            requested_at: "2026-07-22T20:01:00Z",
          }),
        ),
      ],
      [
        "approval_decision_input_malformed",
        asFailure(
          await decideApprovalRequestV1(approvalRequest.approval_request, {
            approver_ref: "identity:agent:not-human",
            approver_session_ref: "session:local:review",
            decision: "approved",
            reason_code: "approval.operator_approved",
            decided_at: "2026-07-22T20:02:00Z",
          }),
        ),
      ],
      [
        "audit_input_malformed",
        asFailure(
          await createAuditEventV1(
            { event_type: "unknown", secret: "withheld" } as never,
            { observed_at: "2026-07-22T20:02:10Z" },
          ),
        ),
      ],
    ]);

    for (const vector of fixture.vectors) {
      const result = results.get(vector.case_id);
      expect(result, vector.case_id).toBeDefined();
      if (result === undefined) continue;

      expect(Object.keys(result).sort(), vector.case_id).toEqual(
        ["ok", vector.family_result_field, "errors", "side_effects"].sort(),
      );
      expect(result[vector.family_result_field], vector.case_id).toBeNull();
      expect(result.errors, vector.case_id).toHaveLength(1);
      expect(result.errors[0], vector.case_id).toMatchObject(vector.expected);
      expect(result.errors[0]?.message.length, vector.case_id).toBeGreaterThan(0);
      expect(result.side_effects, vector.case_id).toEqual([]);
      expect(JSON.stringify(result), vector.case_id).not.toContain("withheld");
    }
  });
});

function asFailure(result: { ok: boolean }): FailureResult {
  expect(result.ok).toBe(false);
  return result as FailureResult;
}

async function readFixture<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(repoRoot, path), "utf8")) as T;
}
