import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildApiGateway, packetInspectionGatewayContract } from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

describe("@lnsat/api packet inspection route", () => {
  const gateway = buildApiGateway({
    now: () => now,
  });

  afterAll(async () => {
    await gateway.close();
  });

  it("inspects valid packets through the read-only Fastify route", async () => {
    const packet = await readFixture("valid/context-packet.json");
    const response = await gateway.inject({
      method: packetInspectionGatewayContract.method,
      url: packetInspectionGatewayContract.path,
      payload: { request_id: "req_bp0011_valid", packet },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: packetInspectionGatewayContract.contract_id,
      request_id: "req_bp0011_valid",
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
  });

  it("returns fail-closed route responses for invalid packets without raw content echo", async () => {
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const response = await gateway.inject({
      method: packetInspectionGatewayContract.method,
      url: packetInspectionGatewayContract.path,
      payload: { request_id: "req_bp0011_secret", packet },
    });
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(body).toMatchObject({
      ok: false,
      request_id: "req_bp0011_secret",
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
    expect(response.body).not.toContain("do-not-store-secret-values");
  });

  it("rejects malformed gateway requests without echoing raw rejected fields", async () => {
    const response = await gateway.inject({
      method: packetInspectionGatewayContract.method,
      url: packetInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0011_bad_shape",
        shell: "npm test",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0011_bad_shape",
      packet_ref: null,
      request_errors: [
        expect.objectContaining({
          code: "gateway.unexpected_field",
          path: "/shell",
        }),
        expect.objectContaining({
          code: "gateway.missing_packet",
          path: "/packet",
        }),
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
    expect(response.body).not.toContain("npm test");
  });
});

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
