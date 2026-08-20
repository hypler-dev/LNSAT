import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import { inspectPacketGatewayRequest } from "@lnsat/gateway";
import {
  createLnsatMcpHttpHandler,
  MCP_MODERN_PROTOCOL_VERSION,
  type LnsatMcpHttpHandler,
  type LnsatMcpProtocolContext,
} from "../src/index.js";

const now = new Date("2026-05-03T00:00:00.000Z");
const fixtureRoot = join(process.cwd(), "../../packages/packets/fixtures");
const openHandlers: LnsatMcpHttpHandler[] = [];

afterEach(async () => {
  await Promise.all(openHandlers.splice(0).map((handler) => handler.close()));
});

describe("official MCP 2026-07-28 HTTP serving", () => {
  it("serves server/discover and records modern context as self-reported", async () => {
    const observations: LnsatMcpProtocolContext[] = [];
    const handler = createHandler("2026-07-28", observations);
    const response = await handler.fetch(modernRequest("server/discover", {}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        supportedVersions: [MCP_MODERN_PROTOCOL_VERSION],
        capabilities: { tools: {} },
        resultType: "complete",
        cacheScope: "private",
      },
    });
    expect(observations).toContainEqual({
      era: "modern",
      protocol_version: MCP_MODERN_PROTOCOL_VERSION,
      server_info_trusted: false,
      discovery_trusted: false,
    });
  });

  it("routes modern tool calls to exact Gateway evidence", async () => {
    const packet = await readFixture("valid/context-packet.json");
    const handler = createHandler("2026-07-28");
    const request = {
      request_id: "req_modern_http_valid",
      packet,
    };
    const response = await handler.fetch(
      modernRequest(
        "tools/call",
        {
          name: "lnsat.packet.inspect",
          arguments: request,
        },
        "lnsat.packet.inspect",
      ),
    );
    const body = await response.json();
    const direct = await inspectPacketGatewayRequest(request, { now });

    expect(response.status).toBe(200);
    expect(body.result.structuredContent).toMatchObject({
      ok: true,
      tool: "lnsat.packet.inspect",
      gateway_contract_id: "lnsat.gateway.packet_inspection.v0_1",
      side_effects: [],
    });
    expect(body.result.structuredContent.gateway_response).toEqual(direct);
  });

  it("keeps temporary legacy initialize in auto mode", async () => {
    const observations: LnsatMcpProtocolContext[] = [];
    const handler = createHandler("auto", observations);
    const response = await handler.fetch(legacyInitializeRequest());
    const body = parseLegacySse(await response.text());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        serverInfo: { name: "lnsat.mcp.official.v0_2", version: "0.1.0" },
      },
    });
    expect(observations).toContainEqual({
      era: "legacy",
      protocol_version: "legacy",
      server_info_trusted: false,
      discovery_trusted: false,
    });
  });

  it("rejects legacy in modern-pinned mode with -32022", async () => {
    const handler = createHandler("2026-07-28");
    const response = await handler.fetch(legacyInitializeRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: -32022,
        data: {
          supported: [MCP_MODERN_PROTOCOL_VERSION],
          requested: "2025-11-25",
        },
      },
    });
  });

  it("rejects unsupported version and malformed per-request metadata", async () => {
    const handler = createHandler("auto");
    const unsupported = await handler.fetch(
      modernRequest("server/discover", {}, undefined, "2099-01-01"),
    );
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toMatchObject({
      error: { code: -32022 },
    });

    const malformed = await handler.fetch(
      modernRequest("server/discover", {}, undefined, MCP_MODERN_PROTOCOL_VERSION, {
        omitCapabilities: true,
      }),
    );
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      error: { code: -32602 },
    });
  });
});

function createHandler(
  mode: "legacy" | "auto" | "2026-07-28",
  observations: LnsatMcpProtocolContext[] = [],
): LnsatMcpHttpHandler {
  const handler = createLnsatMcpHttpHandler(
    {
      now: () => now,
      onProtocolContext: (context) => observations.push(context),
    },
    mode,
  );
  openHandlers.push(handler);
  return handler;
}

function modernRequest(
  method: string,
  params: Record<string, unknown>,
  toolName?: string,
  version = MCP_MODERN_PROTOCOL_VERSION,
  options: { omitCapabilities?: boolean } = {},
): Request {
  const metadata: Record<string, unknown> = {
    [PROTOCOL_VERSION_META_KEY]: version,
    [CLIENT_INFO_META_KEY]: { name: "lnsat-test-client", version: "0.1.0" },
  };
  if (!options.omitCapabilities) {
    metadata[CLIENT_CAPABILITIES_META_KEY] = {};
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "MCP-Protocol-Version": version,
    "Mcp-Method": method,
  };
  if (toolName !== undefined) {
    headers["Mcp-Name"] = toolName;
  }
  return new Request("http://localhost/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: { ...params, _meta: metadata },
    }),
  });
}

function legacyInitializeRequest(): Request {
  return new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "lnsat-legacy-test", version: "0.1.0" },
      },
    }),
  });
}

function parseLegacySse(body: string): unknown {
  const data = body
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  if (data === undefined) {
    throw new Error("Legacy MCP response did not contain SSE data.");
  }
  return JSON.parse(data);
}

async function readFixture(path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(fixtureRoot, path), "utf8"));
}
