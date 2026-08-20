import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  hasBoundedLoopbackTransport,
  noStore,
  readLocalSessionCookie,
  singleBoundedHeader,
} from "./local-control-plane-http.js";
import type { LocalPacketIntakeAuth } from "./local-control-plane-packet-intake.js";
import {
  LOCAL_PACKET_POLICY_EVALUATE_CAPABILITY,
  type LocalControlPlanePolicyDecisionService,
  type LocalPacketPolicyFailureCode,
} from "./local-control-plane-policy-decision.js";
import {
  LOCAL_SESSION_PROOF_HEADER,
  type LocalControlPlaneSessionService,
  type LocalSessionFailureCode,
} from "./local-control-plane-session.js";

const LOCAL_PACKET_POLICY_LEGACY_RESPONSE_STATUS =
  "bp-0876-local-packet-policy-decision";

export const localControlPlanePolicyDecisionContract = {
  evaluate_path: "/v1/local-beta/packets/:packetId/policy-decision",
  read_path: "/v1/local-beta/packets/:packetId/policy-decision",
  required_capability: LOCAL_PACKET_POLICY_EVALUATE_CAPABILITY,
  request_body_limit_bytes: 1_024,
  side_effects: ["local_packet_policy_decision_row_write"],
} as const;

export function registerLocalControlPlanePolicyDecisionRoutes(
  gateway: FastifyInstance,
  sessionService: LocalControlPlaneSessionService,
  policyService: LocalControlPlanePolicyDecisionService,
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
    localControlPlanePolicyDecisionContract.evaluate_path,
    {
      bodyLimit: localControlPlanePolicyDecisionContract.request_body_limit_bytes,
      onRequest: authorizeRequest,
      errorHandler(error, _request, reply) {
        if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
          return sendPolicyFailure(reply, "packet_policy.invalid_request", 413);
        }
        if (
          error.code === "FST_ERR_CTP_INVALID_JSON_BODY" ||
          error.code === "FST_ERR_CTP_EMPTY_JSON_BODY"
        ) {
          return sendPolicyFailure(reply, "packet_policy.invalid_request", 400);
        }
        return sendUnavailable(reply);
      },
    },
    async (request, reply) => {
      const auth = requestAuth.get(request);
      if (auth === undefined) return sendUnavailable(reply);
      try {
        const result = await policyService.evaluate(
          readPacketId(request.params),
          request.body,
          auth,
        );
        if (!result.ok) return sendPolicyFailure(reply, result.code);
        return noStore(reply)
          .status(result.created ? 201 : 200)
          .send({
            ok: true,
            status: LOCAL_PACKET_POLICY_LEGACY_RESPONSE_STATUS,
            created: result.created,
            policy: result.policy,
            side_effects: result.created
              ? ["local_packet_policy_decision_row_write"]
              : [],
          });
      } catch {
        return sendUnavailable(reply);
      }
    },
  );

  gateway.get(
    localControlPlanePolicyDecisionContract.read_path,
    { onRequest: authorizeRequest },
    async (request, reply) => {
      const auth = requestAuth.get(request);
      if (auth === undefined) return sendUnavailable(reply);
      try {
        const result = await policyService.read(readPacketId(request.params), auth);
        if (!result.ok) return sendPolicyFailure(reply, result.code);
        return noStore(reply).status(200).send({
          ok: true,
          status: LOCAL_PACKET_POLICY_LEGACY_RESPONSE_STATUS,
          policy: result.policy,
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
      LOCAL_PACKET_POLICY_EVALUATE_CAPABILITY,
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
      status: LOCAL_PACKET_POLICY_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendPolicyFailure(
  reply: FastifyReply,
  code: LocalPacketPolicyFailureCode,
  overrideStatus?: 400 | 413,
): FastifyReply {
  const status =
    overrideStatus ??
    (code === "packet_policy.authorization_changed"
      ? 401
      : code === "packet_policy.not_found"
        ? 404
        : code === "packet_policy.conflict"
          ? 409
          : 400);
  return noStore(reply)
    .status(status)
    .send({
      ok: false,
      status: LOCAL_PACKET_POLICY_LEGACY_RESPONSE_STATUS,
      errors: [{ code }],
      side_effects: [],
    });
}

function sendUnavailable(reply: FastifyReply): FastifyReply {
  return noStore(reply)
    .status(503)
    .send({
      ok: false,
      status: LOCAL_PACKET_POLICY_LEGACY_RESPONSE_STATUS,
      errors: [{ code: "packet_policy.storage_unavailable" }],
      side_effects: [],
    });
}
