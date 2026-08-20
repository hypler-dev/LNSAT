import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleLocalStdioSmokeLine,
  handleLocalStdioSmokeRequestLine,
  mcpPacketInspectionToolContract,
  mcpStdioTransportDecision,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");

describe("@lnsat/mcp BP-0014 local stdio smoke gate", () => {
  it("records the official SDK stdio path without installing packages", () => {
    expect(mcpStdioTransportDecision).toEqual({
      status: "bp-0014-stdio-smoke-gate",
      official_sdk_track: "v2.x",
      official_sdk_package: "@modelcontextprotocol/server",
      target_transport_import: "@modelcontextprotocol/server/stdio",
      target_server_import: "@modelcontextprotocol/server",
      dependency_step: {
        approval_required: true,
        approved_in_bp0014: false,
        package_install_performed: true,
        reason:
          "Historical BP-0014 smoke remains local while the approved MCP 2026 packet supplies the split v2 SDK serving path.",
      },
      local_smoke_gate:
        "newline JSON request/response smoke over BP-0013 server registration; not an official MCP protocol transport",
      side_effects: [],
    });
  });

  it("smokes a valid read-only packet inspection call over newline JSON", async () => {
    const packet = await readFixture("valid/context-packet.json");
    const response = await handleLocalStdioSmokeRequestLine(
      JSON.stringify({
        request_id: "stdio_bp0014_valid",
        tool_call: {
          name: mcpPacketInspectionToolContract.tool,
          arguments: { request_id: "req_bp0014_valid", packet },
        },
      }),
      { now: () => now },
    );

    expect(response).toMatchObject({
      ok: true,
      transport: "local_stdio_smoke",
      status: "bp-0014-stdio-smoke-gate",
      request_id: "stdio_bp0014_valid",
      official_sdk_decision: {
        official_sdk_package: "@modelcontextprotocol/server",
        dependency_step: {
          package_install_performed: true,
        },
      },
      mcp_response: {
        ok: true,
        tool: mcpPacketInspectionToolContract.tool,
        is_error: false,
        content: [
          {
            type: "json",
            json: {
              ok: true,
              gateway_response: {
                ok: true,
                request_id: "req_bp0014_valid",
                validation: {
                  ok: true,
                  errors: [],
                },
                policy_decision: {
                  decision: "allow",
                },
                side_effects: [],
              },
              side_effects: [],
            },
          },
        ],
      },
      side_effects: [],
    });
  });

  it("returns one JSON line for local stdio smoke callers", async () => {
    const packet = await readFixture("valid/context-packet.json");
    const line = await handleLocalStdioSmokeLine(
      JSON.stringify({
        tool_call: {
          name: mcpPacketInspectionToolContract.tool,
          arguments: { request_id: "req_bp0014_line", packet },
        },
      }),
      { now: () => now },
    );

    expect(line.endsWith("\n")).toBe(true);
    expect(JSON.parse(line)).toMatchObject({
      ok: true,
      transport: "local_stdio_smoke",
      mcp_response: {
        ok: true,
      },
    });
  });

  it("keeps invalid packet responses fail-closed without secret echo", async () => {
    const packet = await readFixture("invalid/rejects-secret-value.json");
    const response = await handleLocalStdioSmokeRequestLine(
      JSON.stringify({
        request_id: "stdio_bp0014_secret",
        tool_call: {
          name: mcpPacketInspectionToolContract.tool,
          arguments: { request_id: "req_bp0014_secret", packet },
        },
      }),
      { now: () => now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: "stdio_bp0014_secret",
      errors: [],
      mcp_response: {
        ok: false,
        is_error: true,
        content: [
          {
            type: "json",
            json: {
              ok: false,
              gateway_response: {
                ok: false,
                validation: {
                  ok: false,
                  errors: [
                    expect.objectContaining({
                      code: "packet.secret_value_embedded",
                      path: "/constraints/secret_value",
                    }),
                  ],
                },
              },
            },
          },
        ],
      },
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("do-not-store-secret-values");
  });

  it("rejects malformed local stdio smoke input without raw content echo", async () => {
    const response = await handleLocalStdioSmokeRequestLine(
      JSON.stringify({
        request_id: "stdio_bp0014_bad",
        shell: "npm test",
      }),
      { now: () => now },
    );

    expect(response).toMatchObject({
      ok: false,
      transport: "local_stdio_smoke",
      request_id: "stdio_bp0014_bad",
      errors: [
        expect.objectContaining({
          code: "stdio.unexpected_field",
          path: "/shell",
        }),
        expect.objectContaining({
          code: "stdio.missing_tool_call",
          path: "/tool_call",
        }),
      ],
      mcp_response: null,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("npm test");
  });

  it("rejects non-JSON stdio smoke input without raw content echo", async () => {
    const response = await handleLocalStdioSmokeRequestLine("shell.exec npm test", {
      now: () => now,
    });

    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      errors: [
        {
          code: "stdio.invalid_json",
          path: "",
          message: "Local stdio smoke input must be one JSON object per line.",
          severity: "error",
        },
      ],
      mcp_response: null,
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("shell.exec");
    expect(JSON.stringify(response)).not.toContain("npm test");
  });
});

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
