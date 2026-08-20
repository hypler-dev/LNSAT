import {
  inspectControlCenterOperationFixture,
  type ControlCenterOperationReadback,
} from "@lnsat/gateway";
import type { FastifyInstance, FastifyReply } from "fastify";
import { hasBoundedLoopbackTransport, noStore } from "./local-control-plane-http.js";

export const CONTROL_CENTER_OPERATION_READBACK_STATUS = "read_only";

export const controlCenterOperationReadbackContract = {
  method: "GET",
  path: "/v1/local-beta/operations/reconciliation",
  response_version: "lnsat.control_center.operation_readback.v0_1",
  source: "deterministic_fixture_fallback",
  runtime_mutation: false,
  side_effects: [],
} as const;

export function registerControlCenterOperationReadbackRoute(
  gateway: FastifyInstance,
): void {
  gateway.get(controlCenterOperationReadbackContract.path, async (request, reply) => {
    if (!hasBoundedLoopbackTransport(request)) return denyTransport(reply);
    if (!isPlainObject(request.query) || Object.keys(request.query).length !== 0) {
      return noStore(reply)
        .status(400)
        .send({
          ok: false,
          errors: [{ code: "control_center.operation_readback.invalid_request" }],
          side_effects: [],
        });
    }
    const result = inspectControlCenterOperationFixture();
    if (!result.ok) {
      return noStore(reply)
        .status(503)
        .send({
          ok: false,
          errors: [{ code: "control_center.operation_readback.source_unavailable" }],
          side_effects: [],
        });
    }
    return noStore(reply).status(200).send(result.readback);
  });
}

export function readControlCenterOperationFixture(): ControlCenterOperationReadback {
  const result = inspectControlCenterOperationFixture();
  if (!result.ok) throw new Error(result.error_code);
  return result.readback;
}

function denyTransport(reply: FastifyReply): FastifyReply {
  return noStore(reply)
    .status(403)
    .send({
      ok: false,
      errors: [{ code: "control_center.operation_readback.loopback_required" }],
      side_effects: [],
    });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
