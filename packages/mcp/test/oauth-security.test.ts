import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MCP_MODERN_PROTOCOL_VERSION,
  authenticateMcpHttpAccess,
  createLnsatMcpHttpHandler,
  validateMcpAuthorizationCallback,
  validateMcpAuthorizationServerMetadata,
  validateMcpClientMetadataFetch,
  validateMcpProtectedResourceMetadata,
  type LnsatMcpHttpHandler,
  type McpBearerTokenVerifier,
  type McpHttpAccessPolicy,
  type McpVerifiedAccessTokenClaims,
} from "../src/index.js";

const now = new Date("2026-08-04T00:00:00.000Z");
const issuer = "https://auth.example.test";
const audience = "https://mcp.example.test";
const resource = "https://mcp.example.test/mcp";
const rawToken = "header.payload.signature-secret";
const openHandlers: LnsatMcpHttpHandler[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(openHandlers.splice(0).map((handler) => handler.close()));
});

describe("MCP OAuth access-plane security", () => {
  it.each([
    ["human", { subject: "user:alice", grant_type: "authorization_code" }],
    ["workload", { workload_id: "spiffe://example.test/workload/agent" }],
    [
      "client_credentials_machine",
      { client_id: "machine-client", grant_type: "client_credentials" },
    ],
  ] as const)(
    "admits %s principal without action authority",
    async (kind, identity) => {
      const verifier = verifierFor(claims({ principal_kind: kind, ...identity }));
      const admission = await authenticateMcpHttpAccess({
        request: accessRequest(),
        policy: policy(verifier),
        now,
      });

      expect(admission).toMatchObject({
        ok: true,
        access_authenticated: true,
        action_authorized: false,
        human_approval_satisfied: false,
        principal: { kind },
        token_passthrough: false,
        upstream_service_token_ref: null,
        side_effects: [],
      });
      expect(JSON.stringify(admission)).not.toContain(rawToken);
    },
  );

  it("validates a token on every HTTP request", async () => {
    const localResource = "http://localhost/mcp";
    const verifyBearerToken = vi.fn(async () => ({
      ok: true as const,
      claims: claims({
        audiences: [localResource],
        resources: [localResource],
      }),
    }));
    const principals: string[] = [];
    const handler = createLnsatMcpHttpHandler(
      {
        now: () => now,
        access_authentication: {
          issuer,
          audience: localResource,
          resource: localResource,
          required_scopes: ["mcp:read"],
          verifier: { verifyBearerToken },
        },
        onAccessPrincipal: (principal) => principals.push(principal.principal_ref),
      },
      MCP_MODERN_PROTOCOL_VERSION,
    );
    openHandlers.push(handler);

    expect((await handler.fetch(accessRequest(localResource))).status).toBe(200);
    expect((await handler.fetch(accessRequest(localResource))).status).toBe(200);
    expect(verifyBearerToken).toHaveBeenCalledTimes(2);
    expect(principals).toEqual(["user:alice", "user:alice"]);
  });

  it.each([
    [{ issuer: "https://other.example.test" }, "mcp.oauth.issuer_mismatch"],
    [{ audiences: ["https://other.example.test"] }, "mcp.oauth.audience_mismatch"],
    [{ resources: ["https://other.example.test/mcp"] }, "mcp.oauth.resource_mismatch"],
    [
      { expires_at_epoch_seconds: Math.floor(now.getTime() / 1000) },
      "mcp.oauth.token_not_active",
    ],
    [{ grant_type: "client_credentials" }, "mcp.oauth.invalid_principal"],
  ])("fails closed for token claim mismatch", async (overrides, errorCode) => {
    const admission = await authenticateMcpHttpAccess({
      request: accessRequest(),
      policy: policy(verifierFor(claims(overrides))),
      now,
    });
    expect(admission).toMatchObject({
      ok: false,
      error: { code: errorCode },
      fallback_attempted: false,
      token_passthrough: false,
      action_authorized: false,
    });
  });

  it("requires scope step-up without converting access to approval", async () => {
    const admission = await authenticateMcpHttpAccess({
      request: accessRequest(),
      policy: policy(verifierFor(claims({ scopes: ["mcp:read"] })), [
        "mcp:read",
        "mcp:admin",
      ]),
      now,
    });
    expect(admission).toMatchObject({
      ok: false,
      status: 403,
      error: {
        code: "mcp.oauth.scope_step_up_required",
        missing_scopes: ["mcp:admin"],
      },
      action_authorized: false,
    });
  });

  it("forbids URI tokens, malformed authorization, and token reflection", async () => {
    const verifier = verifierFor(claims());
    const uriToken = await authenticateMcpHttpAccess({
      request: accessRequest(`${resource}?access_token=${rawToken}`),
      policy: policy(verifier),
      now,
    });
    expect(uriToken).toMatchObject({
      ok: false,
      error: { code: "mcp.oauth.token_in_uri" },
    });

    const missing = await authenticateMcpHttpAccess({
      request: accessRequest(resource, null),
      policy: policy(verifier),
      now,
    });
    expect(missing).toMatchObject({
      ok: false,
      error: { code: "mcp.oauth.missing_bearer_token" },
    });
    expect(JSON.stringify([uriToken, missing])).not.toContain(rawToken);
  });

  it("contains verifier failures without leaking token", async () => {
    const admission = await authenticateMcpHttpAccess({
      request: accessRequest(),
      policy: policy({
        verifyBearerToken: async () => {
          throw new Error(`verifier leaked ${rawToken}`);
        },
      }),
      now,
    });
    expect(admission).toMatchObject({
      ok: false,
      status: 503,
      error: { code: "mcp.oauth.verifier_unavailable" },
    });
    expect(JSON.stringify(admission)).not.toContain(rawToken);
  });

  it("requires PKCE S256, exact redirect URI, and exact state", () => {
    const valid = {
      code_challenge_method: "S256",
      code_challenge: "A".repeat(43),
      redirect_uri: "https://client.example.test/callback",
      registered_redirect_uri: "https://client.example.test/callback",
      state: "state-0123456789abcdef",
      expected_state: "state-0123456789abcdef",
    };
    expect(validateMcpAuthorizationCallback(valid)).toEqual({
      ok: true,
      pkce: "S256",
      redirect_uri_exact: true,
      state_exact: true,
      side_effects: [],
    });
    expect(
      validateMcpAuthorizationCallback({ ...valid, code_challenge_method: "plain" }),
    ).toMatchObject({ ok: false, error_code: "mcp.oauth.pkce_s256_required" });
    expect(
      validateMcpAuthorizationCallback({
        ...valid,
        redirect_uri: "https://client.example.test/callback/extra",
      }),
    ).toMatchObject({ ok: false, error_code: "mcp.oauth.redirect_uri_mismatch" });
    expect(
      validateMcpAuthorizationCallback({ ...valid, state: "state-0123456789abcdeg" }),
    ).toMatchObject({ ok: false, error_code: "mcp.oauth.state_mismatch" });
  });

  it("validates protected-resource and authorization-server metadata", () => {
    expect(
      validateMcpProtectedResourceMetadata({
        expected_resource: resource,
        metadata: {
          resource,
          authorization_servers: [issuer],
          bearer_methods_supported: ["header"],
          scopes_supported: ["mcp:read"],
        },
      }),
    ).toEqual({ ok: true, side_effects: [] });
    expect(
      validateMcpAuthorizationServerMetadata({
        expected_issuer: issuer,
        metadata: {
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          code_challenge_methods_supported: ["S256"],
        },
      }),
    ).toEqual({ ok: true, side_effects: [] });
    expect(
      validateMcpAuthorizationServerMetadata({
        expected_issuer: issuer,
        metadata: {
          issuer: "https://mixup.example.test",
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          code_challenge_methods_supported: ["plain"],
        },
      }),
    ).toMatchObject({ ok: false, error_code: "mcp.oauth.invalid_server_metadata" });
    expect(
      validateMcpAuthorizationServerMetadata({
        expected_issuer: issuer,
        metadata: {
          issuer,
          authorization_endpoint: "https://mixup.example.test/authorize",
          token_endpoint: `${issuer}/token`,
          code_challenge_methods_supported: ["S256"],
        },
      }),
    ).toMatchObject({ ok: false, error_code: "mcp.oauth.invalid_server_metadata" });
  });

  it("blocks metadata SSRF, redirects, private IPs, and oversized responses", () => {
    expect(
      validateMcpClientMetadataFetch({
        url: "https://client.example.test/metadata.json",
        resolved_ips: ["8.8.8.8", "2606:4700:4700::1111"],
        redirect_chain: [],
        response_bytes: 1024,
      }),
    ).toEqual({ ok: true, dns_revalidation_required: true, side_effects: [] });
    for (const candidate of [
      {
        url: "http://client.example.test/metadata.json",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
        response_bytes: 1024,
      },
      {
        url: "https://client.example.test/metadata.json",
        resolved_ips: ["127.0.0.1"],
        redirect_chain: [],
        response_bytes: 1024,
      },
      {
        url: "https://client.example.test/metadata.json",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: ["https://redirect.example.test"],
        response_bytes: 1024,
      },
      {
        url: "https://client.example.test/metadata.json",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
        response_bytes: 65_537,
      },
      {
        url: "https://127.0.0.1/metadata.json",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
        response_bytes: 1024,
      },
      {
        url: "https://client.example.test/metadata.json?token=forbidden",
        resolved_ips: ["8.8.8.8"],
        redirect_chain: [],
        response_bytes: 1024,
      },
    ]) {
      expect(validateMcpClientMetadataFetch(candidate)).toMatchObject({
        ok: false,
        error_code: "mcp.oauth.metadata_ssrf",
        side_effects: [],
      });
    }
  });
});

function policy(
  verifier: McpBearerTokenVerifier,
  requiredScopes = ["mcp:read"],
): McpHttpAccessPolicy {
  return {
    issuer,
    audience,
    resource,
    required_scopes: requiredScopes,
    verifier,
  };
}

function verifierFor(value: McpVerifiedAccessTokenClaims): McpBearerTokenVerifier {
  return {
    verifyBearerToken: async (token, expected) => {
      expect(token).toBe(rawToken);
      expect(expected).toEqual({ issuer, audience, resource });
      return { ok: true, claims: value };
    },
  };
}

function claims(
  overrides: Partial<McpVerifiedAccessTokenClaims> = {},
): McpVerifiedAccessTokenClaims {
  return {
    issuer,
    audiences: [audience],
    resources: [resource],
    scopes: ["mcp:read"],
    expires_at_epoch_seconds: Math.floor(now.getTime() / 1000) + 300,
    token_id: "token:test:1",
    principal_kind: "human",
    subject: "user:alice",
    client_id: "mcp-client",
    grant_type: "authorization_code",
    ...overrides,
  };
}

function accessRequest(url = resource, token: string | null = rawToken): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "MCP-Protocol-Version": MCP_MODERN_PROTOCOL_VERSION,
    "Mcp-Method": "server/discover",
  };
  if (token !== null) {
    headers.authorization = `Bearer ${token}`;
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
      params: {
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MCP_MODERN_PROTOCOL_VERSION,
          [CLIENT_INFO_META_KEY]: { name: "oauth-test", version: "0.1.0" },
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}
