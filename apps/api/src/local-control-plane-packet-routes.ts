import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  hasBoundedLoopbackTransport,
  noStore,
  readLocalSessionCookie,
  singleBoundedHeader,
} from "./local-control-plane-http.js";
import {
  LOCAL_PACKET_SUBMIT_CAPABILITY,
  type LocalControlPlanePacketIntakeService,
  type LocalPacketIntakeAuth,
  type LocalPacketIntakeFailureCode,
} from "./local-control-plane-packet-intake.js";
import {
  LOCAL_SESSION_PROOF_HEADER,
  type LocalControlPlaneSessionService,
  type LocalSessionFailureCode,
} from "./local-control-plane-session.js";

const LOCAL_PACKET_INTAKE_LEGACY_RESPONSE_STATUS = "bp-0875-local-packet-intake";

export const localControlPlanePacketIntakeContract = {
  submit_path: "/v1/local-beta/packets",
  read_path: "/v1/local-beta/packets/:packetId",
  required_capability: LOCAL_PACKET_SUBMIT_CAPABILITY,
  request_body_limit_bytes: 65_536,
  side_effects: ["local_packet_intake_row_write"],
} as const;

export function registerLocalControlPlanePacketIntakeRoutes(
  gateway: FastifyInstance,
  sessionService: LocalControlPlaneSessionService,
  intakeService: LocalControlPlanePacketIntakeService,
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
    localControlPlanePacketIntakeContract.submit_path,
    {
      bodyLimit: localControlPlanePacketIntakeContract.request_body_limit_bytes,
      onRequest: authorizeRequest,
      errorHandler(error, _request, reply) {
        if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
          return sendIntakeFailure(reply, "packet_intake.request_too_large");
        }
        if (
          error.code === "FST_ERR_CTP_INVALID_JSON_BODY" ||
          error.code === "FST_ERR_CTP_EMPTY_JSON_BODY"
        ) {
          return sendIntakeFailure(reply, "packet_intake.invalid_request");
        }
        return sendUnavailable(reply);
      },
    },
    async (request, reply) => {
      const auth = requestAuth.get(request);
      if (auth === undefined) return sendUnavailable(reply);
      try {
        const result = await intakeService.submit(request.body, auth);
        if (!result.ok) return sendIntakeFailure(reply, result.code);
        return noStore(reply)
          .status(result.created ? 201 : 200)
          .send({
            ok: true,
            status: LOCAL_PACKET_INTAKE_LEGACY_RESPONSE_STATUS,
            created: result.created,
            packet: result.packet,
            side_effects: result.created ? ["local_packet_intake_row_write"] : [],
          });
      } catch {
        return sendUnavailable(reply);
      }
    },
  );

  gateway.get(
    localControlPlanePacketIntakeContract.read_path,
    { onRequest: authorizeRequest },
    async (request, reply) => {
      const auth = requestAuth.get(request);
      if (auth === undefined) return sendUnavailable(reply);
      try {
        const packetId = readPacketId(request.params);
        const result = await intakeService.read(packetId, auth);
        if (!result.ok) return sendIntakeFailure(reply, result.code);
        return noStore(reply).status(200).send({
          ok: true,
          status: LOCAL_PACKET_INTAKE_LEGACY_RESPONSE_STATUS,
          packet: result.packet,
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
      LOCAL_PACKET_SUBMIT_CAPABILITY,
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
      status: LOCAL_PACKET_INTAKE_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendIntakeFailure(
  reply: FastifyReply,
  code: LocalPacketIntakeFailureCode,
): FastifyReply {
  const status =
    code === "packet_intake.authorization_changed"
      ? 401
      : code === "packet_intake.conflict"
        ? 409
        : code === "packet_intake.not_found"
          ? 404
          : code === "packet_intake.request_too_large"
            ? 413
            : 400;
  return noStore(reply)
    .status(status)
    .send({
      ok: false,
      status: LOCAL_PACKET_INTAKE_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendUnavailable(reply: FastifyReply): FastifyReply {
  return noStore(reply)
    .status(503)
    .send({
      ok: false,
      status: LOCAL_PACKET_INTAKE_LEGACY_RESPONSE_STATUS,
      errors: [{ code: "packet_intake.storage_unavailable" }],
      side_effects: [],
    });
}
