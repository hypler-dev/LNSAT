import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectPacketThroughMcpAdapterContract,
  mcpPacketInspectionToolContract,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

describe("@lnsat/mcp packet inspection adapter contract", () => {
  it("delegates valid packet inspection to the Gateway contract", async () => {
    const packet = await readFixture("valid/context-packet.json");
    const response = await inspectPacketThroughMcpAdapterContract(
      { request_id: "req_bp0012_valid", packet },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      tool: mcpPacketInspectionToolContract.tool,
      gateway_contract_id: "lnsat.gateway.packet_inspection.v0_1",
      side_effects: [],
      gateway_response: {
        ok: true,
        request_id: "req_bp0012_valid",
        received_at: "2026-05-03T00:00:00.000Z",
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
      },
    });
    expect(
      response.gateway_response.ok && response.gateway_response.packet_ref.packet_hash,
    ).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(
      response.gateway_response.ok &&
        response.gateway_response.audit_event_preview.map((event) => event.event_type),
    ).toEqual(["packet_validated", "policy_checked"]);
  });

  it("keeps invalid packet rejection fail-closed through Gateway inspection", async () => {
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const response = await inspectPacketThroughMcpAdapterContract(
      { request_id: "req_bp0012_secret", packet },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpPacketInspectionToolContract.tool,
      side_effects: [],
      gateway_response: {
        ok: false,
        request_id: "req_bp0012_secret",
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
      },
    });
    expect(JSON.stringify(response)).not.toContain("do-not-store-secret-values");
  });

  it("routes malformed adapter input through Gateway request validation", async () => {
    const response = await inspectPacketThroughMcpAdapterContract(
      {
        request_id: "req_bp0012_bad_shape",
        shell: "npm test",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      tool: mcpPacketInspectionToolContract.tool,
      side_effects: [],
      gateway_response: {
        ok: false,
        request_id: "req_bp0012_bad_shape",
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
      },
    });
    expect(JSON.stringify(response)).not.toContain("npm test");
  });
});

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
