import { describe, expect, it } from "vitest";
import {
  inspectProjectStateThroughMcpAdapterContract,
  mcpBuildPacketStateToolContract,
  mcpProjectStateToolContract,
  readBuildPacketStateThroughMcpAdapterContract,
} from "../src/index.js";

describe("@lnsat/mcp BP-0017 build packet state adapter contract", () => {
  it("exposes versioned project-state inspection through the canonical Gateway contract", async () => {
    const response = await inspectProjectStateThroughMcpAdapterContract({
      request_id: "req_project_state",
      item_id: "state-item-mcp-inspection",
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpProjectStateToolContract.tool,
      gateway_contract_id: "lnsat.gateway.project_state.v0_1",
      gateway_response: {
        ok: true,
        schema_version: "0.1",
        request_id: "req_project_state",
        selected_item: {
          item_id: "state-item-mcp-inspection",
          source_path: "fixtures/project-state/items/state-item-mcp-inspection.json",
        },
        side_effects: [],
      },
      side_effects: [],
    });
    expect(mcpProjectStateToolContract).toMatchObject({
      request_version: "0.1",
      response_version: "0.1",
    });
  });

  it("documents the legacy alias and removal window", () => {
    expect(mcpBuildPacketStateToolContract).toMatchObject({
      deprecated: true,
      replacement: mcpProjectStateToolContract.tool,
      removal: "not before 2.0.0 after one supported-release deprecation window",
    });
  });

  it("reads repo-local build packet state docs without side effects", async () => {
    const response = await readBuildPacketStateThroughMcpAdapterContract({
      request_id: "req_bp0017_state",
      packet_id: "BP-0017",
    });

    expect(response).toMatchObject({
      ok: true,
      tool: mcpBuildPacketStateToolContract.tool,
      request_id: "req_bp0017_state",
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
            packet_id: "BP-0016",
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

  it("fails closed for malformed requests without raw rejected command echo", async () => {
    const response = await readBuildPacketStateThroughMcpAdapterContract({
      request_id: "req_bp0017_bad_shape",
      shell: "npm test -- --runInBand",
    });

    expect(response).toEqual({
      ok: false,
      tool: mcpBuildPacketStateToolContract.tool,
      request_id: "req_bp0017_bad_shape",
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
    const response = await readBuildPacketStateThroughMcpAdapterContract({
      request_id: "req_bp0017_bad_packet_id",
      packet_id: "BP-0017; npm test",
    });

    expect(response).toMatchObject({
      ok: false,
      request_id: "req_bp0017_bad_packet_id",
      errors: [
        expect.objectContaining({
          code: "build_state.invalid_packet_id",
          path: "/packet_id",
        }),
      ],
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("BP-0017; npm test");
  });
});
