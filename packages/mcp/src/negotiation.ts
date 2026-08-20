export const MCP_MODERN_PROTOCOL_VERSION = "2026-07-28" as const;

export type McpProtocolMode = "legacy" | "auto" | typeof MCP_MODERN_PROTOCOL_VERSION;
export type McpProtocolEra = "legacy" | "modern";

export type McpNegotiationProbeOutcome =
  | {
      outcome: "modern";
      protocol_version: typeof MCP_MODERN_PROTOCOL_VERSION;
      server_info?: unknown;
    }
  | { outcome: "legacy"; protocol_version: string; server_info?: unknown }
  | { outcome: "unsupported"; error_code: -32022 }
  | { outcome: "auth_error"; status: 401 | 403 }
  | { outcome: "http_error"; status: number }
  | { outcome: "timeout" }
  | { outcome: "transport_closed" }
  | { outcome: "malformed_metadata" };

export type McpDisposableNegotiationProbe = {
  run(): Promise<McpNegotiationProbeOutcome>;
  close(): Promise<void>;
};

export type McpNegotiatedProtocol = {
  ok: true;
  era: McpProtocolEra;
  protocol_version: string;
  from_cache: boolean;
  cache_scope: string;
  expires_at: string;
  server_info: Record<string, string> | null;
  server_info_trusted: false;
  discovery_trusted: false;
  side_effects: [];
};

export type McpNegotiationFailure = {
  ok: false;
  error: {
    code:
      | "mcp.negotiation.invalid_config"
      | "mcp.negotiation.modern_required"
      | "mcp.negotiation.legacy_required"
      | "mcp.negotiation.unsupported_version"
      | "mcp.negotiation.authentication_failed"
      | "mcp.negotiation.http_error"
      | "mcp.negotiation.timeout"
      | "mcp.negotiation.transport_closed"
      | "mcp.negotiation.malformed_metadata"
      | "mcp.negotiation.probe_failed";
    message: string;
  };
  fallback_attempted: false;
  side_effects: [];
};

export type McpNegotiationResult = McpNegotiatedProtocol | McpNegotiationFailure;

type McpNegotiationCacheEntry = {
  era: McpProtocolEra;
  protocol_version: string;
  server_info: Record<string, string> | null;
  expires_at_ms: number;
};

export class McpNegotiationCache {
  readonly #entries = new Map<string, McpNegotiationCacheEntry>();

  read(key: string, nowMs: number): McpNegotiationCacheEntry | null {
    const entry = this.#entries.get(key);
    if (entry === undefined) {
      return null;
    }
    if (entry.expires_at_ms <= nowMs) {
      this.#entries.delete(key);
      return null;
    }
    return entry;
  }

  write(key: string, entry: McpNegotiationCacheEntry): void {
    this.#entries.set(key, entry);
  }
}

export async function negotiateMcpEndpoint(input: {
  endpoint: string;
  mode: McpProtocolMode;
  cache_scope: string;
  ttl_ms: number;
  now: Date;
  cache: McpNegotiationCache;
  create_probe(): McpDisposableNegotiationProbe;
}): Promise<McpNegotiationResult> {
  if (
    !safeLabel(input.endpoint, 512) ||
    !safeLabel(input.cache_scope, 128) ||
    !Number.isSafeInteger(input.ttl_ms) ||
    input.ttl_ms < 1 ||
    input.ttl_ms > 86_400_000 ||
    !Number.isFinite(input.now.getTime())
  ) {
    return failure(
      "mcp.negotiation.invalid_config",
      "MCP negotiation configuration is invalid.",
    );
  }

  const cacheKey = `${input.cache_scope}\u0000${input.endpoint}\u0000${input.mode}`;
  const cached = input.cache.read(cacheKey, input.now.getTime());
  if (cached !== null && modeAccepts(input.mode, cached.era)) {
    return success(cached, input.cache_scope, true);
  }

  let probe: McpDisposableNegotiationProbe;
  try {
    probe = input.create_probe();
  } catch {
    return failure("mcp.negotiation.probe_failed", "MCP negotiation probe failed.");
  }
  let outcome: McpNegotiationProbeOutcome;
  try {
    outcome = await probe.run();
  } catch {
    return failure("mcp.negotiation.probe_failed", "MCP negotiation probe failed.");
  } finally {
    await probe.close().catch(() => undefined);
  }

  if (outcome.outcome === "modern" || outcome.outcome === "legacy") {
    const era = outcome.outcome;
    if (!modeAccepts(input.mode, era)) {
      return failure(
        era === "modern"
          ? "mcp.negotiation.legacy_required"
          : "mcp.negotiation.modern_required",
        era === "modern"
          ? "Legacy MCP mode rejected modern protocol negotiation."
          : "Pinned MCP 2026-07-28 mode rejected legacy negotiation.",
      );
    }
    if (era === "modern" && outcome.protocol_version !== MCP_MODERN_PROTOCOL_VERSION) {
      return failure(
        "mcp.negotiation.unsupported_version",
        "MCP server selected an unsupported modern protocol version.",
      );
    }

    const entry: McpNegotiationCacheEntry = {
      era,
      protocol_version: outcome.protocol_version,
      server_info: normalizeServerInfo(outcome.server_info),
      expires_at_ms: input.now.getTime() + input.ttl_ms,
    };
    input.cache.write(cacheKey, entry);
    return success(entry, input.cache_scope, false);
  }

  switch (outcome.outcome) {
    case "unsupported":
      return failure(
        "mcp.negotiation.unsupported_version",
        "MCP endpoint does not support requested protocol version.",
      );
    case "auth_error":
      return failure(
        "mcp.negotiation.authentication_failed",
        "MCP endpoint authentication failed; legacy fallback is forbidden.",
      );
    case "http_error":
      return failure(
        "mcp.negotiation.http_error",
        "MCP endpoint returned a non-negotiation HTTP error.",
      );
    case "timeout":
      return failure(
        "mcp.negotiation.timeout",
        "MCP negotiation timed out; legacy fallback is forbidden.",
      );
    case "transport_closed":
      return failure(
        "mcp.negotiation.transport_closed",
        "MCP transport closed during negotiation.",
      );
    case "malformed_metadata":
      return failure(
        "mcp.negotiation.malformed_metadata",
        "MCP negotiation metadata is malformed.",
      );
  }
}

function success(
  entry: McpNegotiationCacheEntry,
  cacheScope: string,
  fromCache: boolean,
): McpNegotiatedProtocol {
  return {
    ok: true,
    era: entry.era,
    protocol_version: entry.protocol_version,
    from_cache: fromCache,
    cache_scope: cacheScope,
    expires_at: new Date(entry.expires_at_ms).toISOString(),
    server_info: entry.server_info,
    server_info_trusted: false,
    discovery_trusted: false,
    side_effects: [],
  };
}

function failure(
  code: McpNegotiationFailure["error"]["code"],
  message: string,
): McpNegotiationFailure {
  return {
    ok: false,
    error: { code, message },
    fallback_attempted: false,
    side_effects: [],
  };
}

function modeAccepts(mode: McpProtocolMode, era: McpProtocolEra): boolean {
  return (
    mode === "auto" ||
    (mode === "legacy" && era === "legacy") ||
    (mode === MCP_MODERN_PROTOCOL_VERSION && era === "modern")
  );
}

function normalizeServerInfo(value: unknown): Record<string, string> | null {
  if (!isPlainObject(value)) {
    return null;
  }
  const name = value.name;
  const version = value.version;
  if (!safeLabel(name, 128) || !safeLabel(version, 64)) {
    return null;
  }
  return { name, version };
}

function safeLabel(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
