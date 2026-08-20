import type { FastifyInstance, FastifyReply } from "fastify";
import {
  hasBoundedLoopbackTransport,
  noStore,
  readLocalSessionCookie,
  singleBoundedHeader,
} from "./local-control-plane-http.js";
import {
  LOCAL_OPERATOR_CAPABILITY,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_PROOF_HEADER,
  type LocalControlPlaneSessionService,
  type LocalSessionFailureCode,
} from "./local-control-plane-session.js";

export const LOCAL_CONTROL_PLANE_AUTH_STATUS = "local_only";
const LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS =
  "bp-0872-local-authenticated-session";

export const localControlPlaneAuthContract = {
  issue_path: "/v1/local-beta/auth/session",
  session_path: "/v1/local-beta/auth/session",
  operator_readback_path: "/v1/local-beta/operator/readback",
  side_effects: ["local_session_row_write", "http_only_cookie_header"],
} as const;

export function registerLocalControlPlaneAuthRoutes(
  gateway: FastifyInstance,
  service: LocalControlPlaneSessionService,
): void {
  gateway.post(localControlPlaneAuthContract.issue_path, async (request, reply) => {
    if (!hasBoundedLoopbackTransport(request)) return denyTransport(reply);
    const credential = singleBoundedHeader(
      request.headers["x-lnsat-local-operator-credential"],
    );
    const ttlSeconds = parseIssueBody(request.body);
    if (credential === null) {
      return sendFailure(reply, 401, "local_auth.invalid_credential");
    }
    if (ttlSeconds === null) return sendFailure(reply, 400, "local_auth.invalid_ttl");
    try {
      const result = await service.issue(credential, ttlSeconds);
      if (!result.ok) {
        return sendFailure(
          reply,
          result.code === "local_auth.invalid_ttl" ? 400 : 401,
          result.code,
        );
      }
      return noStore(reply)
        .header(LOCAL_SESSION_PROOF_HEADER, result.rawClientProof)
        .header(
          "set-cookie",
          `${LOCAL_SESSION_COOKIE}=${result.rawToken}; Path=/v1/local-beta; HttpOnly; SameSite=Strict; Max-Age=${result.maxAgeSeconds}`,
        )
        .status(201)
        .send({
          ok: true,
          status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
          session: result.session,
          side_effects: ["local_session_row_write", "http_only_cookie_header"],
        });
    } catch {
      return sendUnavailable(reply);
    }
  });

  gateway.get(localControlPlaneAuthContract.session_path, async (request, reply) => {
    if (!hasBoundedLoopbackTransport(request)) return denyTransport(reply);
    const token = readLocalSessionCookie(request.headers.cookie);
    const clientProof = singleBoundedHeader(
      request.headers[LOCAL_SESSION_PROOF_HEADER],
    );
    if (token === null || clientProof === null) {
      return sendFailure(reply, 401, "local_auth.invalid_session");
    }
    try {
      const result = await service.verify(token, clientProof);
      if (!result.ok) return sendFailure(reply, 401, result.code);
      return noStore(reply).status(200).send({
        ok: true,
        status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
        session: result.session,
        side_effects: [],
      });
    } catch {
      return sendUnavailable(reply);
    }
  });

  gateway.delete(localControlPlaneAuthContract.session_path, async (request, reply) => {
    if (!hasBoundedLoopbackTransport(request)) return denyTransport(reply);
    const token = readLocalSessionCookie(request.headers.cookie);
    const clientProof = singleBoundedHeader(
      request.headers[LOCAL_SESSION_PROOF_HEADER],
    );
    if (token === null || clientProof === null) {
      return sendFailure(reply, 401, "local_auth.invalid_session");
    }
    try {
      const result = await service.revoke(token, clientProof);
      if (!result.ok) return sendFailure(reply, 401, result.code);
      return noStore(reply)
        .header(
          "set-cookie",
          `${LOCAL_SESSION_COOKIE}=; Path=/v1/local-beta; HttpOnly; SameSite=Strict; Max-Age=0`,
        )
        .status(200)
        .send({
          ok: true,
          status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
          session: result.session,
          side_effects: ["local_session_row_revoke", "http_only_cookie_clear"],
        });
    } catch {
      return sendUnavailable(reply);
    }
  });

  gateway.get(
    localControlPlaneAuthContract.operator_readback_path,
    async (request, reply) => {
      if (!hasBoundedLoopbackTransport(request)) return denyTransport(reply);
      const token = readLocalSessionCookie(request.headers.cookie);
      const clientProof = singleBoundedHeader(
        request.headers[LOCAL_SESSION_PROOF_HEADER],
      );
      if (token === null || clientProof === null) {
        return sendFailure(reply, 401, "local_auth.invalid_session");
      }
      try {
        const result = await service.authorize(
          token,
          clientProof,
          LOCAL_OPERATOR_CAPABILITY,
        );
        if (!result.ok) {
          const status = result.code === "local_auth.capability_denied" ? 403 : 401;
          return sendFailure(reply, status, result.code);
        }
        return noStore(reply)
          .status(200)
          .send({
            ok: true,
            status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
            operator: {
              operator_id: result.session.operator_id,
              capabilities: result.session.capabilities,
              session_id: result.session.session_id,
            },
            side_effects: [],
          });
      } catch {
        return sendUnavailable(reply);
      }
    },
  );
}

function parseIssueBody(body: unknown): number | undefined | null {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length === 0) return undefined;
  if (keys.length !== 1 || keys[0] !== "ttl_seconds") return null;
  const ttl = (body as { ttl_seconds?: unknown }).ttl_seconds;
  return typeof ttl === "number" ? ttl : null;
}

function denyTransport(reply: FastifyReply): FastifyReply {
  return noStore(reply)
    .status(403)
    .send({
      ok: false,
      status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
      errors: [{ code: "local_auth.loopback_required" }],
      side_effects: [],
    });
}

function sendFailure(
  reply: FastifyReply,
  status: 400 | 401 | 403,
  code: LocalSessionFailureCode,
): FastifyReply {
  return noStore(reply)
    .status(status)
    .send({
      ok: false,
      status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendUnavailable(reply: FastifyReply): FastifyReply {
  return noStore(reply)
    .status(503)
    .send({
      ok: false,
      status: LOCAL_CONTROL_PLANE_AUTH_LEGACY_RESPONSE_STATUS,
      errors: [{ code: "local_auth.storage_unavailable" }],
      side_effects: [],
    });
}
