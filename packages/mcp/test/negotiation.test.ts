import { describe, expect, it } from "vitest";
import {
  MCP_MODERN_PROTOCOL_VERSION,
  McpNegotiationCache,
  negotiateMcpEndpoint,
  type McpNegotiationProbeOutcome,
} from "../src/index.js";

const now = new Date("2026-08-04T00:00:00.000Z");

describe("MCP dual-era negotiation", () => {
  it("accepts modern, legacy auto fallback, and explicit legacy mode", async () => {
    const modern = await negotiate("auto", {
      outcome: "modern",
      protocol_version: MCP_MODERN_PROTOCOL_VERSION,
      server_info: { name: "self-reported", version: "9.9.9", extra: "ignored" },
    });
    expect(modern).toMatchObject({
      ok: true,
      era: "modern",
      protocol_version: MCP_MODERN_PROTOCOL_VERSION,
      server_info: { name: "self-reported", version: "9.9.9" },
      server_info_trusted: false,
      discovery_trusted: false,
    });

    await expect(
      negotiate("auto", { outcome: "legacy", protocol_version: "2025-11-25" }),
    ).resolves.toMatchObject({ ok: true, era: "legacy" });
    await expect(
      negotiate("legacy", { outcome: "legacy", protocol_version: "2025-11-25" }),
    ).resolves.toMatchObject({ ok: true, era: "legacy" });
  });

  it("pins modern and rejects legacy or unsupported versions with -32022 posture", async () => {
    await expect(
      negotiate(MCP_MODERN_PROTOCOL_VERSION, {
        outcome: "legacy",
        protocol_version: "2025-11-25",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "mcp.negotiation.modern_required" },
      fallback_attempted: false,
    });
    await expect(
      negotiate("auto", { outcome: "unsupported", error_code: -32022 }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "mcp.negotiation.unsupported_version" },
    });
  });

  it.each([
    [
      { outcome: "auth_error", status: 401 } as const,
      "mcp.negotiation.authentication_failed",
    ],
    [
      { outcome: "auth_error", status: 403 } as const,
      "mcp.negotiation.authentication_failed",
    ],
    [{ outcome: "http_error", status: 503 } as const, "mcp.negotiation.http_error"],
    [{ outcome: "timeout" } as const, "mcp.negotiation.timeout"],
    [{ outcome: "transport_closed" } as const, "mcp.negotiation.transport_closed"],
    [{ outcome: "malformed_metadata" } as const, "mcp.negotiation.malformed_metadata"],
  ])("never falls back for %o", async (outcome, errorCode) => {
    await expect(negotiate("auto", outcome)).resolves.toMatchObject({
      ok: false,
      error: { code: errorCode },
      fallback_attempted: false,
      side_effects: [],
    });
  });

  it("caches only within scope and TTL, then re-probes", async () => {
    const cache = new McpNegotiationCache();
    let runs = 0;
    const call = (at: Date) =>
      negotiateMcpEndpoint({
        endpoint: "stdio:server-a",
        mode: "auto",
        cache_scope: "tenant-a",
        ttl_ms: 1000,
        now: at,
        cache,
        create_probe: () => ({
          run: async () => {
            runs += 1;
            return {
              outcome: "modern",
              protocol_version: MCP_MODERN_PROTOCOL_VERSION,
            };
          },
          close: async () => undefined,
        }),
      });

    expect(await call(now)).toMatchObject({ ok: true, from_cache: false });
    expect(await call(new Date(now.getTime() + 999))).toMatchObject({
      ok: true,
      from_cache: true,
    });
    expect(await call(new Date(now.getTime() + 1000))).toMatchObject({
      ok: true,
      from_cache: false,
    });
    expect(runs).toBe(2);
  });

  it("always closes disposable probes, including thrown probes", async () => {
    let closes = 0;
    const result = await negotiateMcpEndpoint({
      endpoint: "stdio:throwing-server",
      mode: "auto",
      cache_scope: "tenant-a",
      ttl_ms: 1000,
      now,
      cache: new McpNegotiationCache(),
      create_probe: () => ({
        run: async () => {
          throw new Error("raw probe failure must not escape");
        },
        close: async () => {
          closes += 1;
        },
      }),
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "mcp.negotiation.probe_failed" },
    });
    expect(JSON.stringify(result)).not.toContain("raw probe failure");
    expect(closes).toBe(1);
  });

  it("contains probe factory failures without attempting fallback", async () => {
    const result = await negotiateMcpEndpoint({
      endpoint: "stdio:factory-failure",
      mode: "auto",
      cache_scope: "tenant-a",
      ttl_ms: 1000,
      now,
      cache: new McpNegotiationCache(),
      create_probe: () => {
        throw new Error("raw factory failure must not escape");
      },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "mcp.negotiation.probe_failed",
        message: "MCP negotiation probe failed.",
      },
      fallback_attempted: false,
      side_effects: [],
    });
  });
});

async function negotiate(
  mode: "legacy" | "auto" | typeof MCP_MODERN_PROTOCOL_VERSION,
  outcome: McpNegotiationProbeOutcome,
) {
  let closes = 0;
  const result = await negotiateMcpEndpoint({
    endpoint: "stdio:test-server",
    mode,
    cache_scope: "test-scope",
    ttl_ms: 1000,
    now,
    cache: new McpNegotiationCache(),
    create_probe: () => ({
      run: async () => outcome,
      close: async () => {
        closes += 1;
      },
    }),
  });
  expect(closes).toBe(1);
  return result;
}
