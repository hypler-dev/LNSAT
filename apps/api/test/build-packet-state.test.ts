import { describe, expect, it } from "vitest";
import {
  buildPacketStateGatewayContract,
  inspectBuildPacketStateGatewayRequest,
} from "../src/index.js";

describe("@lnsat/api BP-0018 build packet state gateway contract", () => {
  it("reads repo-local build packet state docs without side effects", async () => {
    const response = await inspectBuildPacketStateGatewayRequest({
      request_id: "req_bp0018_state",
      packet_id: "BP-0017",
    });

    expect(response).toMatchObject({
      ok: true,
      contract_id: buildPacketStateGatewayContract.contract_id,
      request_id: "req_bp0018_state",
      source_docs: [
        "fixtures/project-state/status.json",
        "fixtures/project-state/board.md",
        "fixtures/project-state/packet-log.md",
        "fixtures/project-state/packets/BP-0017.json",
      ],
      build_state: {
        project: "example-agent-project",
        name: "Example Agent Project",
        current_phase: "Evaluation",
      },
      board: {
        queued_packets: expect.any(Array),
        done_packets: expect.any(Array),
      },
      packet_log: {
        completed_packets: expect.arrayContaining([
          expect.objectContaining({
            packet_id: "BP-0017",
          }),
        ]),
      },
      selected_packet: {
        packet_id: "BP-0017",
        source_path: "fixtures/project-state/packets/BP-0017.json",
        phase: "MCP",
      },
      side_effects: [],
    });
  });

  it("defaults to the active or next packet when no packet id is supplied", async () => {
    const response = await inspectBuildPacketStateGatewayRequest({
      request_id: "req_bp0018_default",
    });

    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0018_default",
      side_effects: [],
    });
    if (response.ok && response.selected_packet !== null) {
      expect(response.source_docs).toContain(response.selected_packet.source_path);
    }
  });

  it("fails closed for malformed gateway requests without raw rejected command echo", async () => {
    const response = await inspectBuildPacketStateGatewayRequest({
      request_id: "req_bp0018_bad_shape",
      shell: "npm test -- --runInBand",
    });

    expect(response).toEqual({
      ok: false,
      contract_id: buildPacketStateGatewayContract.contract_id,
      request_id: "req_bp0018_bad_shape",
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
    expect(JSON.stringify(response)).not.toContain("npm test -- --runInBand");
  });

  it("fails closed for unsupported packet ids without raw packet id echo", async () => {
    const response = await inspectBuildPacketStateGatewayRequest({
      request_id: "req_bp0018_bad_packet_id",
      packet_id: "BP-0018; npm test",
    });

    expect(response).toMatchObject({
      ok: false,
      contract_id: buildPacketStateGatewayContract.contract_id,
      request_id: "req_bp0018_bad_packet_id",
      errors: [
        expect.objectContaining({
          code: "build_state.invalid_packet_id",
          path: "/packet_id",
        }),
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("BP-0018; npm test");
  });
});
