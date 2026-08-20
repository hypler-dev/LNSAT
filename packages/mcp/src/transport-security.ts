export const MCP_HTTP_MAX_BODY_BYTES = 1_048_576;
export const MCP_HTTP_MAX_HEADER_BYTES = 16_384;
export const MCP_HTTP_MAX_HEADER_COUNT = 64;
export const MCP_STDIO_MAX_BUFFER_BYTES = 1_048_576;
export const MCP_STDIO_MAX_SUBSCRIPTIONS = 64;

const allowedMcpHeaders = new Set([
  "mcp-method",
  "mcp-name",
  "mcp-protocol-version",
  "mcp-session-id",
]);
const headerNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const protocolHeaderPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const methodHeaderPattern = /^[A-Za-z0-9_.:/-]+$/;

export type McpHttpPreflightFailure = {
  ok: false;
  response: Response;
  error_code:
    | "mcp.http.invalid_method"
    | "mcp.http.invalid_content_type"
    | "mcp.http.invalid_header"
    | "mcp.http.forbidden_forwarding_header"
    | "mcp.http.untrusted_host"
    | "mcp.http.untrusted_origin"
    | "mcp.http.body_too_large"
    | "mcp.http.invalid_utf8";
  side_effects: [];
};

export type McpHttpPreflightResult =
  { ok: true; request: Request; side_effects: [] } | McpHttpPreflightFailure;

export async function prepareLnsatMcpHttpRequest(
  request: Request,
): Promise<McpHttpPreflightResult> {
  if (request.method !== "POST") {
    return preflightFailure("mcp.http.invalid_method", 405);
  }

  const headerCheck = validateMcpHttpHeaderPairs([...request.headers]);
  if (!headerCheck.ok) {
    return preflightFailure(headerCheck.error_code, 400);
  }
  if (request.headers.has("forwarded") || request.headers.has("x-forwarded-host")) {
    return preflightFailure("mcp.http.forbidden_forwarding_header", 400);
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return preflightFailure("mcp.http.untrusted_host", 403);
  }
  if (
    !["http:", "https:"].includes(requestUrl.protocol) ||
    requestUrl.username !== "" ||
    requestUrl.password !== "" ||
    !isLoopbackHostname(requestUrl.hostname)
  ) {
    return preflightFailure("mcp.http.untrusted_host", 403);
  }

  const host = request.headers.get("host");
  if (host !== null) {
    const hostUrl = parseAuthority(host, requestUrl.protocol);
    if (
      hostUrl === null ||
      !isLoopbackHostname(hostUrl.hostname) ||
      hostUrl.host !== requestUrl.host
    ) {
      return preflightFailure("mcp.http.untrusted_host", 403);
    }
  }

  const origin = request.headers.get("origin");
  if (origin !== null) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      return preflightFailure("mcp.http.untrusted_origin", 403);
    }
    if (
      parsedOrigin.origin !== requestUrl.origin ||
      !isLoopbackHostname(parsedOrigin.hostname)
    ) {
      return preflightFailure("mcp.http.untrusted_origin", 403);
    }
  }

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (mediaType?.toLowerCase() !== "application/json") {
    return preflightFailure("mcp.http.invalid_content_type", 415);
  }

  const contentLength = request.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > MCP_HTTP_MAX_BODY_BYTES)
  ) {
    return preflightFailure("mcp.http.body_too_large", 413);
  }

  const body = await readBoundedBody(request);
  if (!body.ok) {
    return preflightFailure(body.error_code, body.status);
  }

  return {
    ok: true,
    request: new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: body.text,
      signal: request.signal,
    }),
    side_effects: [],
  };
}

export function validateMcpHttpHeaderPairs(
  headers: ReadonlyArray<readonly [string, string]>,
):
  | { ok: true; side_effects: [] }
  | { ok: false; error_code: "mcp.http.invalid_header"; side_effects: [] } {
  if (headers.length > MCP_HTTP_MAX_HEADER_COUNT) {
    return { ok: false, error_code: "mcp.http.invalid_header", side_effects: [] };
  }

  let bytes = 0;
  for (const [rawName, value] of headers) {
    const name = rawName.toLowerCase();
    bytes += Buffer.byteLength(rawName) + Buffer.byteLength(value);
    if (
      !headerNamePattern.test(rawName) ||
      /[\r\n\u0000]/.test(value) ||
      bytes > MCP_HTTP_MAX_HEADER_BYTES ||
      (name.startsWith("mcp-") && !allowedMcpHeaders.has(name))
    ) {
      return { ok: false, error_code: "mcp.http.invalid_header", side_effects: [] };
    }
    if (
      (name === "mcp-protocol-version" && !protocolHeaderPattern.test(value)) ||
      ((name === "mcp-method" || name === "mcp-name") &&
        (value.length > 128 || !methodHeaderPattern.test(value))) ||
      (name === "mcp-session-id" && (value.length > 256 || /[^\x21-\x7e]/.test(value)))
    ) {
      return { ok: false, error_code: "mcp.http.invalid_header", side_effects: [] };
    }
  }
  return { ok: true, side_effects: [] };
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]" ||
    normalized === "::1"
  );
}

function parseAuthority(authority: string, protocol: string): URL | null {
  try {
    if (/[\/@?#]/.test(authority)) {
      return null;
    }
    return new URL(`${protocol}//${authority}`);
  } catch {
    return null;
  }
}

async function readBoundedBody(request: Request): Promise<
  | { ok: true; text: string }
  | {
      ok: false;
      error_code: "mcp.http.body_too_large" | "mcp.http.invalid_utf8";
      status: 400 | 413;
    }
> {
  if (request.body === null) {
    return { ok: true, text: "" };
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > MCP_HTTP_MAX_BODY_BYTES) {
        await reader.cancel("MCP HTTP body limit exceeded").catch(() => undefined);
        return {
          ok: false,
          error_code: "mcp.http.body_too_large",
          status: 413,
        };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error_code: "mcp.http.invalid_utf8", status: 400 };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error_code: "mcp.http.invalid_utf8", status: 400 };
  }
}

function preflightFailure(
  errorCode: McpHttpPreflightFailure["error_code"],
  status: number,
): McpHttpPreflightFailure {
  return {
    ok: false,
    response: new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "MCP HTTP request rejected.",
          data: { lnsat_error_code: errorCode, side_effects: [] },
        },
      }),
      {
        status,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      },
    ),
    error_code: errorCode,
    side_effects: [],
  };
}
