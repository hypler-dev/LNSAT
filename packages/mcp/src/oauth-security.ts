import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export type McpPrincipalKind = "human" | "workload" | "client_credentials_machine";

export type McpVerifiedAccessTokenClaims = {
  issuer: string;
  audiences: string[];
  resources: string[];
  scopes: string[];
  expires_at_epoch_seconds: number;
  not_before_epoch_seconds?: number;
  token_id: string;
  principal_kind: McpPrincipalKind;
  subject?: string;
  workload_id?: string;
  client_id?: string;
  grant_type?: "authorization_code" | "client_credentials";
};

export type McpBearerTokenVerifier = {
  verifyBearerToken(
    token: string,
    expected: { issuer: string; audience: string; resource: string },
  ): Promise<
    | { ok: true; claims: McpVerifiedAccessTokenClaims }
    | { ok: false; reason: "invalid" | "expired" | "unavailable" }
  >;
};

export type McpHttpAccessPolicy = {
  issuer: string;
  audience: string;
  resource: string;
  required_scopes: string[];
  verifier: McpBearerTokenVerifier;
};

export type McpAccessPrincipal = {
  kind: McpPrincipalKind;
  principal_ref: string;
  client_id: string | null;
  token_id: string;
};

export type McpHttpAccessAdmission =
  | {
      ok: true;
      access_authenticated: true;
      action_authorized: false;
      human_approval_satisfied: false;
      principal: McpAccessPrincipal;
      granted_scopes: string[];
      token_passthrough: false;
      upstream_service_token_ref: null;
      side_effects: [];
    }
  | {
      ok: false;
      status: 400 | 401 | 403 | 503;
      error: {
        code:
          | "mcp.oauth.invalid_policy"
          | "mcp.oauth.token_in_uri"
          | "mcp.oauth.missing_bearer_token"
          | "mcp.oauth.invalid_token"
          | "mcp.oauth.verifier_unavailable"
          | "mcp.oauth.issuer_mismatch"
          | "mcp.oauth.audience_mismatch"
          | "mcp.oauth.resource_mismatch"
          | "mcp.oauth.token_not_active"
          | "mcp.oauth.scope_step_up_required"
          | "mcp.oauth.invalid_principal";
        message: string;
        missing_scopes?: string[];
      };
      fallback_attempted: false;
      token_passthrough: false;
      action_authorized: false;
      side_effects: [];
    };

export async function authenticateMcpHttpAccess(input: {
  request: Request;
  policy: McpHttpAccessPolicy;
  now: Date;
}): Promise<McpHttpAccessAdmission> {
  const policyValidation = validateAccessPolicy(input.policy);
  if (!policyValidation.ok || !Number.isFinite(input.now.getTime())) {
    return admissionFailure(
      400,
      "mcp.oauth.invalid_policy",
      "OAuth policy is invalid.",
    );
  }

  const url = new URL(input.request.url);
  const forbiddenParameters = ["access_token", "token", "bearer_token", "id_token"];
  if (
    forbiddenParameters.some((name) => url.searchParams.has(name)) ||
    forbiddenParameters.some((name) => new URLSearchParams(url.hash.slice(1)).has(name))
  ) {
    return admissionFailure(
      400,
      "mcp.oauth.token_in_uri",
      "Bearer tokens are forbidden in URI.",
    );
  }
  if (canonicalResource(url) !== canonicalResource(new URL(input.policy.resource))) {
    return admissionFailure(
      401,
      "mcp.oauth.resource_mismatch",
      "Request resource mismatch.",
    );
  }

  const authorization = input.request.headers.get("authorization");
  const token = parseBearerToken(authorization);
  if (token === null) {
    return admissionFailure(
      401,
      "mcp.oauth.missing_bearer_token",
      "Valid Bearer authentication is required.",
    );
  }

  let verified: Awaited<ReturnType<McpBearerTokenVerifier["verifyBearerToken"]>>;
  try {
    verified = await input.policy.verifier.verifyBearerToken(token, {
      issuer: input.policy.issuer,
      audience: input.policy.audience,
      resource: input.policy.resource,
    });
  } catch {
    return admissionFailure(
      503,
      "mcp.oauth.verifier_unavailable",
      "Bearer token verifier is unavailable.",
    );
  }
  if (!verified.ok) {
    return admissionFailure(
      verified.reason === "unavailable" ? 503 : 401,
      verified.reason === "unavailable"
        ? "mcp.oauth.verifier_unavailable"
        : "mcp.oauth.invalid_token",
      verified.reason === "unavailable"
        ? "Bearer token verifier is unavailable."
        : "Bearer token is invalid.",
    );
  }

  const claims = verified.claims;
  if (
    !safeLabel(claims.issuer, 512) ||
    !isSafeStringList(claims.audiences, 32, 512) ||
    !isSafeStringList(claims.resources, 32, 512)
  ) {
    return admissionFailure(401, "mcp.oauth.invalid_token", "Bearer token is invalid.");
  }
  if (claims.issuer !== input.policy.issuer) {
    return admissionFailure(401, "mcp.oauth.issuer_mismatch", "Token issuer mismatch.");
  }
  if (!claims.audiences.includes(input.policy.audience)) {
    return admissionFailure(
      401,
      "mcp.oauth.audience_mismatch",
      "Token audience mismatch.",
    );
  }
  if (!claims.resources.includes(input.policy.resource)) {
    return admissionFailure(
      401,
      "mcp.oauth.resource_mismatch",
      "Token resource mismatch.",
    );
  }
  const nowSeconds = Math.floor(input.now.getTime() / 1000);
  if (
    !Number.isSafeInteger(claims.expires_at_epoch_seconds) ||
    claims.expires_at_epoch_seconds <= nowSeconds ||
    (claims.not_before_epoch_seconds !== undefined &&
      (!Number.isSafeInteger(claims.not_before_epoch_seconds) ||
        claims.not_before_epoch_seconds > nowSeconds))
  ) {
    return admissionFailure(
      401,
      "mcp.oauth.token_not_active",
      "Bearer token is not active.",
    );
  }

  const grantedScopes = normalizeScopeSet(claims.scopes);
  if (grantedScopes === null) {
    return admissionFailure(401, "mcp.oauth.invalid_token", "Bearer token is invalid.");
  }
  const missingScopes = input.policy.required_scopes.filter(
    (scope) => !grantedScopes.includes(scope),
  );
  if (missingScopes.length > 0) {
    return {
      ...admissionFailure(
        403,
        "mcp.oauth.scope_step_up_required",
        "Additional OAuth scope is required.",
      ),
      error: {
        code: "mcp.oauth.scope_step_up_required",
        message: "Additional OAuth scope is required.",
        missing_scopes: missingScopes,
      },
    };
  }

  const principal = normalizePrincipal(claims);
  if (principal === null) {
    return admissionFailure(
      401,
      "mcp.oauth.invalid_principal",
      "Token principal is invalid.",
    );
  }
  return {
    ok: true,
    access_authenticated: true,
    action_authorized: false,
    human_approval_satisfied: false,
    principal,
    granted_scopes: grantedScopes,
    token_passthrough: false,
    upstream_service_token_ref: null,
    side_effects: [],
  };
}

export type McpAuthorizationRequestValidation =
  | {
      ok: true;
      pkce: "S256";
      redirect_uri_exact: true;
      state_exact: true;
      side_effects: [];
    }
  | {
      ok: false;
      error_code:
        | "mcp.oauth.pkce_s256_required"
        | "mcp.oauth.redirect_uri_mismatch"
        | "mcp.oauth.state_mismatch";
      side_effects: [];
    };

export function validateMcpAuthorizationCallback(input: {
  code_challenge_method: string;
  code_challenge: string;
  redirect_uri: string;
  registered_redirect_uri: string;
  state: string;
  expected_state: string;
}): McpAuthorizationRequestValidation {
  if (
    input.code_challenge_method !== "S256" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(input.code_challenge)
  ) {
    return { ok: false, error_code: "mcp.oauth.pkce_s256_required", side_effects: [] };
  }
  if (
    input.redirect_uri !== input.registered_redirect_uri ||
    !isHttpsOrLoopbackUrl(input.redirect_uri)
  ) {
    return {
      ok: false,
      error_code: "mcp.oauth.redirect_uri_mismatch",
      side_effects: [],
    };
  }
  if (
    !safeLabel(input.state, 512) ||
    input.state.length < 16 ||
    !safeLabel(input.expected_state, 512) ||
    input.expected_state.length < 16 ||
    !constantTimeEqual(input.state, input.expected_state)
  ) {
    return { ok: false, error_code: "mcp.oauth.state_mismatch", side_effects: [] };
  }
  return {
    ok: true,
    pkce: "S256",
    redirect_uri_exact: true,
    state_exact: true,
    side_effects: [],
  };
}

export type McpProtectedResourceMetadata = {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: string[];
  scopes_supported: string[];
};

export function validateMcpProtectedResourceMetadata(input: {
  metadata: McpProtectedResourceMetadata;
  expected_resource: string;
}):
  { ok: true; side_effects: [] } | { ok: false; error_code: string; side_effects: [] } {
  const { metadata } = input;
  if (
    !Array.isArray(metadata.authorization_servers) ||
    !Array.isArray(metadata.bearer_methods_supported) ||
    !Array.isArray(metadata.scopes_supported) ||
    metadata.resource !== input.expected_resource ||
    !isHttpsOrLoopbackUrl(metadata.resource) ||
    metadata.authorization_servers.length < 1 ||
    metadata.authorization_servers.length > 5 ||
    !metadata.authorization_servers.every(isHttpsOrLoopbackUrl) ||
    !metadata.bearer_methods_supported.includes("header") ||
    normalizeScopeSet(metadata.scopes_supported) === null
  ) {
    return {
      ok: false,
      error_code: "mcp.oauth.invalid_resource_metadata",
      side_effects: [],
    };
  }
  return { ok: true, side_effects: [] };
}

export type McpAuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  code_challenge_methods_supported: string[];
};

export function validateMcpAuthorizationServerMetadata(input: {
  metadata: McpAuthorizationServerMetadata;
  expected_issuer: string;
}):
  { ok: true; side_effects: [] } | { ok: false; error_code: string; side_effects: [] } {
  const { metadata } = input;
  if (
    !Array.isArray(metadata.code_challenge_methods_supported) ||
    metadata.issuer !== input.expected_issuer ||
    !isHttpsOrLoopbackUrl(metadata.issuer) ||
    !isHttpsOrLoopbackUrl(metadata.authorization_endpoint) ||
    !isHttpsOrLoopbackUrl(metadata.token_endpoint) ||
    !hasSameOrigin(metadata.issuer, metadata.authorization_endpoint) ||
    !hasSameOrigin(metadata.issuer, metadata.token_endpoint) ||
    !metadata.code_challenge_methods_supported.includes("S256")
  ) {
    return {
      ok: false,
      error_code: "mcp.oauth.invalid_server_metadata",
      side_effects: [],
    };
  }
  return { ok: true, side_effects: [] };
}

export function validateMcpClientMetadataFetch(input: {
  url: string;
  resolved_ips: string[];
  redirect_chain: string[];
  response_bytes: number;
}):
  | { ok: true; dns_revalidation_required: true; side_effects: [] }
  | { ok: false; error_code: string; side_effects: [] } {
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return { ok: false, error_code: "mcp.oauth.metadata_ssrf", side_effects: [] };
  }
  if (
    !Array.isArray(input.redirect_chain) ||
    !Array.isArray(input.resolved_ips) ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    isForbiddenMetadataHostname(url.hostname) ||
    input.redirect_chain.length !== 0 ||
    input.resolved_ips.length < 1 ||
    !input.resolved_ips.every(isPublicIpAddress) ||
    !Number.isSafeInteger(input.response_bytes) ||
    input.response_bytes < 1 ||
    input.response_bytes > 65_536
  ) {
    return { ok: false, error_code: "mcp.oauth.metadata_ssrf", side_effects: [] };
  }
  return { ok: true, dns_revalidation_required: true, side_effects: [] };
}

export function mcpAccessAdmissionFailureResponse(
  admission: Extract<McpHttpAccessAdmission, { ok: false }>,
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: "MCP HTTP access denied.",
        data: { ...admission.error, side_effects: [] },
      },
    }),
    {
      status: admission.status,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}

function validateAccessPolicy(
  policy: McpHttpAccessPolicy,
): { ok: true } | { ok: false } {
  return isHttpsOrLoopbackUrl(policy.issuer) &&
    isHttpsOrLoopbackUrl(policy.audience) &&
    isHttpsOrLoopbackUrl(policy.resource) &&
    normalizeScopeSet(policy.required_scopes) !== null &&
    typeof policy.verifier?.verifyBearerToken === "function"
    ? { ok: true }
    : { ok: false };
}

function normalizePrincipal(
  claims: McpVerifiedAccessTokenClaims,
): McpAccessPrincipal | null {
  if (!safeLabel(claims.token_id, 256)) {
    return null;
  }
  if (
    claims.principal_kind === "human" &&
    claims.grant_type !== "client_credentials" &&
    safeLabel(claims.subject, 256)
  ) {
    return {
      kind: "human",
      principal_ref: claims.subject,
      client_id: safeLabel(claims.client_id, 256) ? claims.client_id : null,
      token_id: claims.token_id,
    };
  }
  if (claims.principal_kind === "workload" && safeLabel(claims.workload_id, 512)) {
    return {
      kind: "workload",
      principal_ref: claims.workload_id,
      client_id: safeLabel(claims.client_id, 256) ? claims.client_id : null,
      token_id: claims.token_id,
    };
  }
  if (
    claims.principal_kind === "client_credentials_machine" &&
    claims.grant_type === "client_credentials" &&
    safeLabel(claims.client_id, 256)
  ) {
    return {
      kind: "client_credentials_machine",
      principal_ref: claims.client_id,
      client_id: claims.client_id,
      token_id: claims.token_id,
    };
  }
  return null;
}

function normalizeScopeSet(scopes: string[]): string[] | null {
  if (
    !Array.isArray(scopes) ||
    scopes.length > 128 ||
    !scopes.every((scope) => safeLabel(scope, 128) && !/\s/.test(scope))
  ) {
    return null;
  }
  return [...new Set(scopes)].sort();
}

function parseBearerToken(header: string | null): string | null {
  if (header === null || header.length > 8192) {
    return null;
  }
  const match = /^Bearer ([\x21-\x7e]+)$/.exec(header);
  return match?.[1] ?? null;
}

function isHttpsOrLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.username === "" &&
      url.password === "" &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && isLoopbackHostname(url.hostname)))
    );
  } catch {
    return false;
  }
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

function isForbiddenMetadataHostname(hostname: string): boolean {
  const normalized =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  const version = isIP(normalized);
  return (
    isLoopbackHostname(hostname) ||
    (version !== 0 && !isPublicIpAddress(normalized)) ||
    hostname.toLowerCase().endsWith(".internal") ||
    hostname.toLowerCase().endsWith(".local")
  );
}

function hasSameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function isPublicIpAddress(value: string): boolean {
  const version = isIP(value);
  if (version === 4) {
    const octets = value.split(".").map(Number);
    const a = octets[0]!;
    const b = octets[1]!;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 2, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0) ||
      a >= 224
    );
  }
  if (version === 6) {
    const normalized = value.toLowerCase();
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8:") ||
      normalized.startsWith("::ffff:")
    );
  }
  return false;
}

function canonicalResource(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
  );
}

function isSafeStringList(
  value: unknown,
  maxItems: number,
  maxItemLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => safeLabel(item, maxItemLength))
  );
}

function safeLabel(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function admissionFailure(
  status: 400 | 401 | 403 | 503,
  code: Extract<McpHttpAccessAdmission, { ok: false }>["error"]["code"],
  message: string,
): Extract<McpHttpAccessAdmission, { ok: false }> {
  return {
    ok: false,
    status,
    error: { code, message },
    fallback_attempted: false,
    token_passthrough: false,
    action_authorized: false,
    side_effects: [],
  };
}
