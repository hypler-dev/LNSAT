import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectPacketGatewayRequest,
  packetInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

describe("@lnsat/api packet inspection gateway contract", () => {
  it("inspects a valid packet through packet, policy, and audit authorities", async () => {
    const packet = await readFixture("valid/context-packet.json");
    const response = await inspectPacketGatewayRequest(
      { request_id: "req_bp0010_valid", packet },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: packetInspectionGatewayContract.contract_id,
      request_id: "req_bp0010_valid",
      received_at: "2026-05-03T00:00:00.000Z",
      request_digest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      packet_ref: {
        packet_id: "pkt_context_0001",
        packet_type: "ContextPacket",
      },
      validation: {
        ok: true,
        errors: [],
      },
      policy_decision: {
        decision: "allow",
        requires_approval: false,
      },
      side_effects: [],
    });
    expect(response.ok && response.packet_ref.packet_hash).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(
      response.ok && response.audit_event_preview.map((event) => event.event_type),
    ).toEqual(["packet_validated", "policy_checked"]);
  });

  it("rejects invalid packet requests fail-closed without echoing raw secret content", async () => {
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const response = await inspectPacketGatewayRequest(
      { request_id: "req_bp0010_secret", packet },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: "req_bp0010_secret",
      request_digest: null,
      packet_ref: null,
      request_errors: [],
      canonical_json: null,
      policy_decision: null,
      validation: {
        ok: false,
        errors: [
          expect.objectContaining({
            code: "packet.secret_value_embedded",
            path: "/constraints/secret_value",
            severity: "error",
          }),
        ],
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("do-not-store-secret-values");
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.audit_event_preview).toEqual([
        expect.objectContaining({
          event_type: "packet_rejected",
          result_status: "failure",
          reason_codes: expect.arrayContaining(["packet.secret_value_embedded"]),
        }),
      ]);
    }
  });

  it("rejects malformed gateway requests before packet validation", async () => {
    const response = await inspectPacketGatewayRequest(
      {
        request_id: "req_bp0010_bad_shape",
        shell: "npm test",
      },
      { now },
    );

    expect(response).toEqual({
      ok: false,
      contract_id: packetInspectionGatewayContract.contract_id,
      request_id: "req_bp0010_bad_shape",
      received_at: "2026-05-03T00:00:00.000Z",
      request_digest: null,
      packet_ref: null,
      request_errors: [
        {
          code: "gateway.unexpected_field",
          path: "/shell",
          message: "Unexpected gateway request field 'shell'.",
          severity: "error",
        },
        {
          code: "gateway.missing_packet",
          path: "/packet",
          message: "Gateway packet inspection request must include packet.",
          severity: "error",
        },
      ],
      validation: {
        ok: false,
        errors: [],
      },
      canonical_json: null,
      policy_decision: null,
      audit_event_preview: [],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("npm test");
  });
});

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
