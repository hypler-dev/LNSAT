import { describe, expect, it } from "vitest";
import {
  MCP_HTTP_MAX_BODY_BYTES,
  MCP_STDIO_MAX_BUFFER_BYTES,
  MCP_STDIO_MAX_SUBSCRIPTIONS,
  prepareLnsatMcpHttpRequest,
  validateMcpHttpHeaderPairs,
} from "../src/index.js";

describe("MCP transport security boundary", () => {
  it("accepts bounded same-origin loopback POST requests", async () => {
    const result = await prepareLnsatMcpHttpRequest(
      request({ headers: { host: "localhost", origin: "http://localhost" } }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(await result.request.json()).toEqual({ jsonrpc: "2.0" });
      expect(result.side_effects).toEqual([]);
    }
  });

  it.each([
    [request({ method: "GET" }), "mcp.http.invalid_method", 405],
    [
      request({ headers: { "content-type": "text/plain" } }),
      "mcp.http.invalid_content_type",
      415,
    ],
    [
      new Request("http://example.com/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      "mcp.http.untrusted_host",
      403,
    ],
    [request({ headers: { host: "127.0.0.1" } }), "mcp.http.untrusted_host", 403],
    [
      request({ headers: { origin: "http://evil.example" } }),
      "mcp.http.untrusted_origin",
      403,
    ],
    [
      request({ headers: { forwarded: "host=localhost" } }),
      "mcp.http.forbidden_forwarding_header",
      400,
    ],
  ])("rejects request boundary violation", async (candidate, code, status) => {
    const result = await prepareLnsatMcpHttpRequest(candidate);
    expect(result).toMatchObject({ ok: false, error_code: code, side_effects: [] });
    if (!result.ok) {
      expect(result.response.status).toBe(status);
      expect(await result.response.json()).toMatchObject({
        error: { data: { lnsat_error_code: code, side_effects: [] } },
      });
    }
  });

  it("rejects declared and streamed bodies above one MiB", async () => {
    const declared = await prepareLnsatMcpHttpRequest(
      request({ headers: { "content-length": String(MCP_HTTP_MAX_BODY_BYTES + 1) } }),
    );
    expect(declared).toMatchObject({
      ok: false,
      error_code: "mcp.http.body_too_large",
    });

    const streamed = await prepareLnsatMcpHttpRequest(
      request({ body: "x".repeat(MCP_HTTP_MAX_BODY_BYTES + 1) }),
    );
    expect(streamed).toMatchObject({
      ok: false,
      error_code: "mcp.http.body_too_large",
    });
  });

  it("rejects CRLF, invalid names, and parameter-mirroring MCP headers", () => {
    expect(
      validateMcpHttpHeaderPairs([["mcp-method", "tools/list\r\nInjected: 1"]]),
    ).toMatchObject({ ok: false, error_code: "mcp.http.invalid_header" });
    expect(validateMcpHttpHeaderPairs([["bad header", "value"]])).toMatchObject({
      ok: false,
      error_code: "mcp.http.invalid_header",
    });
    expect(
      validateMcpHttpHeaderPairs([["mcp-arguments", "secret=value"]]),
    ).toMatchObject({
      ok: false,
      error_code: "mcp.http.invalid_header",
    });
  });

  it("publishes fixed stdio bounds", () => {
    expect(MCP_STDIO_MAX_BUFFER_BYTES).toBe(1_048_576);
    expect(MCP_STDIO_MAX_SUBSCRIPTIONS).toBe(64);
  });
});

function request(
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Request {
  return new Request("http://localhost/mcp", {
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...(options.method === "GET" ? {} : { body: options.body ?? '{"jsonrpc":"2.0"}' }),
  });
}
