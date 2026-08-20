import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  hasBoundedLoopbackTransport,
  noStore,
  readLocalSessionCookie,
  singleBoundedHeader,
} from "./local-control-plane-http.js";
import {
  LOCAL_PACKET_APPROVAL_REQUEST_CAPABILITY,
  type LocalControlPlaneApprovalRequestService,
  type LocalPacketApprovalRequestFailureCode,
} from "./local-control-plane-approval-request.js";
import type { LocalPacketIntakeAuth } from "./local-control-plane-packet-intake.js";
import {
  LOCAL_SESSION_PROOF_HEADER,
  type LocalControlPlaneSessionService,
  type LocalSessionFailureCode,
} from "./local-control-plane-session.js";

const LOCAL_PACKET_APPROVAL_REQUEST_LEGACY_RESPONSE_STATUS =
  "bp-0877-local-packet-approval-request";

export const localControlPlaneApprovalRequestContract = {
  create_path: "/v1/local-beta/packets/:packetId/approval-request",
  read_path: "/v1/local-beta/packets/:packetId/approval-request",
  required_capability: LOCAL_PACKET_APPROVAL_REQUEST_CAPABILITY,
  request_body_limit_bytes: 1_024,
  side_effects: ["local_packet_approval_request_row_write"],
} as const;

export function registerLocalControlPlaneApprovalRequestRoutes(
  gateway: FastifyInstance,
  sessionService: LocalControlPlaneSessionService,
  approvalService: LocalControlPlaneApprovalRequestService,
): void {
  const requestAuth = new WeakMap<FastifyRequest, LocalPacketIntakeAuth>();
  const authorizeRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const auth = await authorize(request, reply, sessionService);
    if (auth !== null) requestAuth.set(request, auth);
  };

  gateway.post(
    localControlPlaneApprovalRequestContract.create_path,
    {
      bodyLimit: localControlPlaneApprovalRequestContract.request_body_limit_bytes,
      onRequest: authorizeRequest,
      errorHandler(error, _request, reply) {
        if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
          return sendApprovalFailure(reply, "approval_request.invalid_request", 413);
        }
        if (
          error.code === "FST_ERR_CTP_INVALID_JSON_BODY" ||
          error.code === "FST_ERR_CTP_EMPTY_JSON_BODY"
        ) {
          return sendApprovalFailure(reply, "approval_request.invalid_request", 400);
        }
        return sendUnavailable(reply);
      },
    },
    async (request, reply) => {
      const auth = requestAuth.get(request);
      if (auth === undefined) return sendUnavailable(reply);
      try {
        const result = await approvalService.create(
          readPacketId(request.params),
          request.body,
          auth,
        );
        if (!result.ok) return sendApprovalFailure(reply, result.code);
        return noStore(reply)
          .status(result.created ? 201 : 200)
          .send({
            ok: true,
            status: LOCAL_PACKET_APPROVAL_REQUEST_LEGACY_RESPONSE_STATUS,
            created: result.created,
            approval_request: result.approval_request,
            side_effects: result.created
              ? ["local_packet_approval_request_row_write"]
              : [],
          });
      } catch {
        return sendUnavailable(reply);
      }
    },
  );

  gateway.get(
    localControlPlaneApprovalRequestContract.read_path,
    { onRequest: authorizeRequest },
    async (request, reply) => {
      const auth = requestAuth.get(request);
      if (auth === undefined) return sendUnavailable(reply);
      try {
        const result = await approvalService.read(readPacketId(request.params), auth);
        if (!result.ok) return sendApprovalFailure(reply, result.code);
        return noStore(reply).status(200).send({
          ok: true,
          status: LOCAL_PACKET_APPROVAL_REQUEST_LEGACY_RESPONSE_STATUS,
          approval_request: result.approval_request,
          side_effects: [],
        });
      } catch {
        return sendUnavailable(reply);
      }
    },
  );
}

async function authorize(
  request: FastifyRequest,
  reply: FastifyReply,
  service: LocalControlPlaneSessionService,
): Promise<LocalPacketIntakeAuth | null> {
  if (!hasBoundedLoopbackTransport(request)) {
    sendAuthFailure(reply, 403, "local_auth.loopback_required");
    return null;
  }
  const token = readLocalSessionCookie(request.headers.cookie);
  const proof = singleBoundedHeader(request.headers[LOCAL_SESSION_PROOF_HEADER]);
  if (token === null || proof === null) {
    sendAuthFailure(reply, 401, "local_auth.invalid_session");
    return null;
  }
  try {
    const result = await service.authorize(
      token,
      proof,
      LOCAL_PACKET_APPROVAL_REQUEST_CAPABILITY,
    );
    if (!result.ok) {
      sendAuthFailure(
        reply,
        result.code === "local_auth.capability_denied" ? 403 : 401,
        result.code,
      );
      return null;
    }
    return {
      operatorId: result.session.operator_id,
      sessionId: result.session.session_id,
    };
  } catch {
    sendUnavailable(reply);
    return null;
  }
}

function readPacketId(params: unknown): unknown {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    return undefined;
  }
  return (params as { packetId?: unknown }).packetId;
}

function sendAuthFailure(
  reply: FastifyReply,
  status: 401 | 403,
  code: LocalSessionFailureCode | "local_auth.loopback_required",
): FastifyReply {
  return noStore(reply)
    .status(status)
    .send({
      ok: false,
      status: LOCAL_PACKET_APPROVAL_REQUEST_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendApprovalFailure(
  reply: FastifyReply,
  code: LocalPacketApprovalRequestFailureCode,
  overrideStatus?: 400 | 413,
): FastifyReply {
  const status =
    overrideStatus ??
    (code === "approval_request.authorization_changed"
      ? 401
      : code === "approval_request.not_found"
        ? 404
        : code === "approval_request.not_reviewable" ||
            code === "approval_request.conflict"
          ? 409
          : 400);
  return noStore(reply)
    .status(status)
    .send({
      ok: false,
      status: LOCAL_PACKET_APPROVAL_REQUEST_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendUnavailable(reply: FastifyReply): FastifyReply {
  return noStore(reply)
    .status(503)
    .send({
      ok: false,
      status: LOCAL_PACKET_APPROVAL_REQUEST_LEGACY_RESPONSE_STATUS,
      errors: [{ code: "approval_request.storage_unavailable" }],
      side_effects: [],
    });
}
