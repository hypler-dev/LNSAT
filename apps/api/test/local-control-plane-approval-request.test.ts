import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_PACKET_APPROVAL_REQUEST_ACTION,
  createLocalControlPlaneApprovalRequestService,
  type LocalPacketApprovalRequestRecord,
  type LocalPacketApprovalRequestRepository,
} from "../src/local-control-plane-approval-request.js";
import { registerLocalControlPlaneApprovalRequestRoutes } from "../src/local-control-plane-approval-routes.js";
import { LOCAL_SESSION_PROOF_HEADER } from "../src/local-control-plane-session.js";
import type {
  LocalControlPlaneSessionService,
  LocalSessionFailureCode,
} from "../src/local-control-plane-session.js";

const packetId = "pkt_bp0877_approval_0001";
const packetDigest = `sha256:${"a".repeat(64)}`;
const policyDecisionId = "pol_bp0877_approval_0001";
const requestedAt = new Date("2026-07-14T05:00:00.000Z");
const reasonCodes = [
  "policy.packet_requires_approval",
  "policy.risk_requires_approval",
];
const auth = {
  operatorId: "operator.local.synthetic",
  sessionId: `ses_${"2".repeat(32)}`,
};
const headers = {
  cookie: "lnsat_local_session=bounded-token",
  [LOCAL_SESSION_PROOF_HEADER]: "B".repeat(43),
};
const body = {
  packet_digest: packetDigest,
  policy_decision_id: policyDecisionId,
  requested_action: LOCAL_PACKET_APPROVAL_REQUEST_ACTION,
  reason_codes: reasonCodes,
};

describe("BP-0877 local approval requests", () => {
  const gateways: ReturnType<typeof Fastify>[] = [];

  afterEach(async () => {
    await Promise.all(gateways.splice(0).map((gateway) => gateway.close()));
  });

  it("creates, reads, and repeats exact pending truth idempotently", async () => {
    const repository = memoryRepository();
    const service = createLocalControlPlaneApprovalRequestService(repository);

    const created = await service.create(packetId, body, auth);
    expect(created).toMatchObject({
      ok: true,
      created: true,
      approval_request: {
        packet_id: packetId,
        packet_digest: packetDigest,
        policy_decision_id: policyDecisionId,
        request_status: "pending",
        requested_action: "packet.approve",
        reason_codes: reasonCodes,
        operator_id: auth.operatorId,
        authenticated_session_id: auth.sessionId,
      },
    });
    const repeated = await service.create(packetId, body, auth);
    expect(repeated).toMatchObject({ ok: true, created: false });
    expect(repository.records.size).toBe(1);
    expect(await service.read(packetId, auth)).toMatchObject({
      ok: true,
      approval_request: {
        approval_request_id: expect.stringMatching(/^apr_[a-f0-9]{32}$/),
      },
    });
  });

  it("fails closed for existing drift and non-reviewable policy", async () => {
    const repository = memoryRepository();
    const service = createLocalControlPlaneApprovalRequestService(repository);
    expect((await service.create(packetId, body, auth)).ok).toBe(true);

    const existing = repository.records.get(packetId);
    expect(existing).toBeDefined();
    if (existing !== undefined)
      existing.authenticatedSessionId = `ses_${"3".repeat(32)}`;
    expect(await service.create(packetId, body, auth)).toEqual({
      ok: false,
      code: "approval_request.conflict",
    });

    repository.outcome = "not_reviewable";
    repository.records.clear();
    expect(await service.create(packetId, body, auth)).toEqual({
      ok: false,
      code: "approval_request.not_reviewable",
    });
  });

  it("strictly validates every bounded request field", async () => {
    const service = createLocalControlPlaneApprovalRequestService(memoryRepository());
    for (const invalid of [
      undefined,
      {},
      { ...body, extra: true },
      { ...body, requested_action: "packet.execute" },
      { ...body, reason_codes: [] },
      { ...body, reason_codes: [reasonCodes[0], reasonCodes[0]] },
      { ...body, reason_codes: ["UPPERCASE"] },
      { ...body, packet_digest: "sha256:no" },
      { ...body, policy_decision_id: "bad" },
    ]) {
      expect(await service.create(packetId, invalid, auth)).toEqual({
        ok: false,
        code: "approval_request.invalid_request",
      });
    }
  });

  it("serves bounded create/read responses without raw policy or decision effects", async () => {
    const gateway = Fastify();
    const service = createLocalControlPlaneApprovalRequestService(memoryRepository());
    registerLocalControlPlaneApprovalRequestRoutes(
      gateway,
      allowedSessionService(),
      service,
    );
    gateways.push(gateway);

    const created = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packetId}/approval-request`,
      headers,
      payload: body,
    });
    expect(created.statusCode).toBe(201);
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(created.json()).toMatchObject({
      status: "bp-0877-local-packet-approval-request",
      created: true,
      approval_request: { request_status: "pending" },
      side_effects: ["local_packet_approval_request_row_write"],
    });
    expect(created.body).not.toContain("canonical_packet");
    expect(created.body).not.toContain('policy_decision"');
    expect(created.body).not.toContain("approved");
    expect(created.body).not.toContain("denied");

    const repeated = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packetId}/approval-request`,
      headers,
      payload: body,
    });
    expect(repeated.statusCode).toBe(200);
    expect(repeated.json().side_effects).toEqual([]);

    const read = await gateway.inject({
      method: "GET",
      url: `/v1/local-beta/packets/${packetId}/approval-request`,
      headers,
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().side_effects).toEqual([]);
  });

  it("denies transport/session before parsing and bounds malformed bodies", async () => {
    let calls = 0;
    const approvalService = countingApprovalService(() => {
      calls += 1;
    });
    const allowed = Fastify();
    registerLocalControlPlaneApprovalRequestRoutes(
      allowed,
      allowedSessionService(),
      approvalService,
    );
    gateways.push(allowed);

    const malformed = await allowed.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packetId}/approval-request`,
      headers: { ...headers, "content-type": "application/json" },
      payload: "{DO_NOT_ECHO",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.body).not.toContain("DO_NOT_ECHO");
    expect(calls).toBe(0);

    const oversized = await allowed.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packetId}/approval-request`,
      headers,
      payload: { ...body, reason_codes: ["x".repeat(2_000)] },
    });
    expect(oversized.statusCode).toBe(413);
    expect(calls).toBe(0);

    for (const code of [
      "local_auth.invalid_session",
      "local_auth.expired_session",
      "local_auth.revoked_session",
      "local_auth.capability_denied",
    ] as LocalSessionFailureCode[]) {
      const denied = Fastify();
      registerLocalControlPlaneApprovalRequestRoutes(
        denied,
        deniedSessionService(code),
        approvalService,
      );
      gateways.push(denied);
      const response = await denied.inject({
        method: "POST",
        url: `/v1/local-beta/packets/${packetId}/approval-request`,
        headers,
        payload: {},
      });
      expect(response.statusCode).toBe(
        code === "local_auth.capability_denied" ? 403 : 401,
      );
    }

    const remote = await allowed.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packetId}/approval-request`,
      remoteAddress: "192.0.2.9",
      headers: { "content-type": "application/json" },
      payload: "{DO_NOT_PARSE",
    });
    expect(remote.statusCode).toBe(403);
    expect(calls).toBe(0);
  });
});

function memoryRepository(): LocalPacketApprovalRequestRepository & {
  records: Map<string, LocalPacketApprovalRequestRecord>;
  outcome: "ok" | "not_found" | "not_reviewable" | "conflict";
} {
  const records = new Map<string, LocalPacketApprovalRequestRecord>();
  return {
    records,
    outcome: "ok",
    async put(record) {
      if (this.outcome !== "ok") return { outcome: this.outcome };
      const existing = records.get(record.packetId);
      if (existing !== undefined) return { outcome: "existing", record: existing };
      const saved = { ...record, requestedAt };
      records.set(record.packetId, saved);
      return { outcome: "created", record: saved };
    },
    async get(candidate) {
      return records.get(candidate) ?? null;
    },
    async close() {},
  };
}

function allowedSessionService(): LocalControlPlaneSessionService {
  const session = {
    session_id: auth.sessionId,
    operator_id: auth.operatorId,
    capabilities: ["control_plane.packet.approval.request"],
    issued_at: requestedAt.toISOString(),
    expires_at: new Date(requestedAt.getTime() + 300_000).toISOString(),
    revoked_at: null,
  };
  return {
    async issue() {
      return { ok: false, code: "local_auth.invalid_credential" };
    },
    async verify() {
      return { ok: true, session };
    },
    async authorize() {
      return { ok: true, session };
    },
    async revoke() {
      return { ok: true, session };
    },
  };
}

function deniedSessionService(
  code: LocalSessionFailureCode,
): LocalControlPlaneSessionService {
  return {
    async issue() {
      return { ok: false, code: "local_auth.invalid_credential" };
    },
    async verify() {
      return { ok: false, code };
    },
    async authorize() {
      return { ok: false, code };
    },
    async revoke() {
      return { ok: false, code };
    },
  };
}

function countingApprovalService(onCall: () => void) {
  return {
    async create() {
      onCall();
      return { ok: false as const, code: "approval_request.not_found" as const };
    },
    async read() {
      onCall();
      return { ok: false as const, code: "approval_request.not_found" as const };
    },
  };
}
