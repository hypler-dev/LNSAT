import { afterAll, describe, expect, it } from "vitest";
import { buildApiGateway, buildPacketStateGatewayContract } from "../src/index.js";

describe("@lnsat/api BP-0019 build packet state route", () => {
  const gateway = buildApiGateway();

  afterAll(async () => {
    await gateway.close();
  });

  it("reads build packet state through the read-only Fastify route", async () => {
    const response = await gateway.inject({
      method: buildPacketStateGatewayContract.method,
      url: buildPacketStateGatewayContract.path,
      payload: {
        request_id: "req_bp0019_state",
        packet_id: "BP-0018",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: buildPacketStateGatewayContract.contract_id,
      request_id: "req_bp0019_state",
      source_docs: [
        "fixtures/project-state/status.json",
        "fixtures/project-state/board.md",
        "fixtures/project-state/packet-log.md",
        "fixtures/project-state/packets/BP-0018.json",
      ],
      selected_packet: {
        packet_id: "BP-0018",
        source_path: "fixtures/project-state/packets/BP-0018.json",
        phase: "API",
      },
      side_effects: [],
    });
  });

  it("returns fail-closed route responses for missing packet docs", async () => {
    const response = await gateway.inject({
      method: buildPacketStateGatewayContract.method,
      url: buildPacketStateGatewayContract.path,
      payload: {
        request_id: "req_bp0019_missing_packet",
        packet_id: "BP-9999",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: buildPacketStateGatewayContract.contract_id,
      request_id: "req_bp0019_missing_packet",
      source_docs: [
        "fixtures/project-state/status.json",
        "fixtures/project-state/board.md",
        "fixtures/project-state/packet-log.md",
      ],
      errors: [
        {
          code: "build_state.packet_not_found",
          path: "/packet_id",
          message: "Requested build packet doc was not found.",
          severity: "error",
        },
      ],
      side_effects: [],
    });
    expect(response.body).not.toContain("BP-9999");
  });

  it("rejects malformed route requests without raw rejected command echo", async () => {
    const response = await gateway.inject({
      method: buildPacketStateGatewayContract.method,
      url: buildPacketStateGatewayContract.path,
      payload: {
        request_id: "req_bp0019_bad_shape",
        shell: "rm -rf /tmp/lnsat",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      contract_id: buildPacketStateGatewayContract.contract_id,
      request_id: "req_bp0019_bad_shape",
      source_docs: [
        "fixtures/project-state/status.json",
        "fixtures/project-state/board.md",
        "fixtures/project-state/packet-log.md",
      ],
      errors: [
        {
          code: "build_state.unexpected_field",
          path: "/shell",
          message: "Unexpected build packet state request field.",
          severity: "error",
        },
      ],
      side_effects: [],
    });
    expect(response.body).not.toContain("rm -rf /tmp/lnsat");
  });

  it("rejects unsupported packet ids without raw rejected packet id echo", async () => {
    const response = await gateway.inject({
      method: buildPacketStateGatewayContract.method,
      url: buildPacketStateGatewayContract.path,
      payload: {
        request_id: "req_bp0019_bad_packet_id",
        packet_id: "BP-0019 && rm -rf /tmp/lnsat",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_id: "req_bp0019_bad_packet_id",
      errors: [
        expect.objectContaining({
          code: "build_state.invalid_packet_id",
          path: "/packet_id",
        }),
      ],
      side_effects: [],
    });
    expect(response.body).not.toContain("BP-0019 && rm -rf /tmp/lnsat");
  });
});
