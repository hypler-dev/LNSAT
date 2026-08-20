import { createHash } from "node:crypto";
import {
  canonicalizeUniversalPacket,
  hashUniversalPacket,
  type UniversalPacket,
} from "@lnsat/packets";
import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_OPERATOR_CAPABILITY,
  LOCAL_OPERATOR_ID,
  LOCAL_PACKET_SUBMIT_CAPABILITY,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_PROOF_HEADER,
  buildApiGateway,
  createLocalControlPlanePacketIntakeService,
  createLocalControlPlaneSessionService,
  type LocalControlPlaneSessionService,
  type LocalOperatorRecord,
  type LocalPacketIntakeRecord,
  type LocalPacketIntakeRepository,
  type LocalSessionFailureCode,
  type LocalSessionRecord,
  type LocalSessionRepository,
} from "../src/index.js";

const credential = "A".repeat(43);
const fixedNow = new Date("2026-07-14T02:00:00.000Z");
const auth = {
  operatorId: LOCAL_OPERATOR_ID,
  sessionId: `ses_${"1".repeat(32)}`,
};

describe("BP-0875 local packet intake", () => {
  const gateways: ReturnType<typeof buildApiGateway>[] = [];

  afterEach(async () => {
    await Promise.all(gateways.splice(0).map((gateway) => gateway.close()));
  });

  it("persists canonical truth with idempotent submit, conflict, and bounded readback", async () => {
    const sessions = memorySessionRepository([
      LOCAL_OPERATOR_CAPABILITY,
      LOCAL_PACKET_SUBMIT_CAPABILITY,
    ]);
    const sessionService = createLocalControlPlaneSessionService(sessions, {
      now: () => fixedNow,
    });
    const packets = memoryPacketRepository();
    const intakeService = createLocalControlPlanePacketIntakeService(packets);
    const configured = buildApiGateway({
      localSessionService: sessionService,
      localPacketIntakeService: intakeService,
    });
    gateways.push(configured);
    const headers = await issueHeaders(configured);
    const packet = syntheticPacket();

    const created = await configured.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      ok: true,
      status: "bp-0875-local-packet-intake",
      created: true,
      packet: {
        packet_id: packet.packet_id,
        packet_digest: await hashUniversalPacket(packet),
        intake_status: "accepted",
        operator_id: LOCAL_OPERATOR_ID,
      },
      side_effects: ["local_packet_intake_row_write"],
    });
    expect(created.body).not.toContain(packet.intent);
    expect(packets.records.get(packet.packet_id)?.canonicalPacket).toBe(
      canonicalizeUniversalPacket(packet),
    );

    const idempotent = await configured.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet },
    });
    expect(idempotent.statusCode).toBe(200);
    expect(idempotent.json()).toMatchObject({ created: false, side_effects: [] });
    expect(packets.records.size).toBe(1);

    const conflict = await configured.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...packet, intent: "conflicting synthetic intent" } },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      errors: [{ code: "packet_intake.conflict" }],
      side_effects: [],
    });
    expect(packets.records.size).toBe(1);

    const read = await configured.inject({
      method: "GET",
      url: `/v1/local-beta/packets/${packet.packet_id}`,
      headers,
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({
      packet: { packet_id: packet.packet_id },
      side_effects: [],
    });
    expect(read.body).not.toContain(packet.intent);
  });

  it("denies transport, proof, session state, and capability before intake", async () => {
    const deniedCodes: LocalSessionFailureCode[] = [
      "local_auth.invalid_session",
      "local_auth.expired_session",
      "local_auth.revoked_session",
      "local_auth.capability_denied",
    ];
    for (const code of deniedCodes) {
      let calls = 0;
      const gateway = buildApiGateway({
        localSessionService: deniedSessionService(code),
        localPacketIntakeService: {
          async submit() {
            calls += 1;
            throw new Error("must not run");
          },
          async read() {
            calls += 1;
            throw new Error("must not run");
          },
        },
      });
      gateways.push(gateway);
      const response = await gateway.inject({
        method: "POST",
        url: "/v1/local-beta/packets",
        headers: {
          cookie: `${LOCAL_SESSION_COOKIE}=bounded-token`,
          [LOCAL_SESSION_PROOF_HEADER]: "B".repeat(43),
        },
        payload: { packet: syntheticPacket() },
      });
      expect(response.statusCode).toBe(
        code === "local_auth.capability_denied" ? 403 : 401,
      );
      expect(calls).toBe(0);
    }

    let transportCalls = 0;
    const transportGateway = buildApiGateway({
      localSessionService: allowedSessionService(),
      localPacketIntakeService: {
        async submit() {
          transportCalls += 1;
          throw new Error("must not run");
        },
        async read() {
          transportCalls += 1;
          throw new Error("must not run");
        },
      },
    });
    gateways.push(transportGateway);
    const remote = await transportGateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      remoteAddress: "192.0.2.8",
      payload: { packet: syntheticPacket() },
    });
    expect(remote.statusCode).toBe(403);
    expect(transportCalls).toBe(0);

    const missing = await transportGateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      payload: { packet: syntheticPacket() },
    });
    expect(missing.statusCode).toBe(401);
    expect(transportCalls).toBe(0);

    const missingOversize = await transportGateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      payload: { packet: { ...syntheticPacket(), intent: "X".repeat(70_000) } },
    });
    expect(missingOversize.statusCode).toBe(401);
    expect(transportCalls).toBe(0);

    const remoteMalformed = await transportGateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      remoteAddress: "192.0.2.8",
      headers: { "content-type": "application/json" },
      payload: "{DO_NOT_PARSE",
    });
    expect(remoteMalformed.statusCode).toBe(403);
    expect(transportCalls).toBe(0);
  });

  it("rejects hostile, secret-bearing, nonsynthetic, malformed, and oversized input without echo", async () => {
    const packets = memoryPacketRepository();
    const service = createLocalControlPlanePacketIntakeService(packets);
    const gateway = buildApiGateway({
      localSessionService: allowedSessionService(),
      localPacketIntakeService: service,
    });
    gateways.push(gateway);
    const headers = {
      cookie: `${LOCAL_SESSION_COOKIE}=bounded-token`,
      [LOCAL_SESSION_PROOF_HEADER]: "B".repeat(43),
    };
    const marker = "DO_NOT_ECHO_HOSTILE_VALUE";

    const hostile = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...syntheticPacket(), [marker]: marker } },
    });
    expect(hostile.statusCode).toBe(400);
    expect(hostile.body).not.toContain(marker);

    const secret = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: {
        packet: {
          ...syntheticPacket(),
          constraints: { synthetic: true, secret_value: marker },
        },
      },
    });
    expect(secret.statusCode).toBe(400);
    expect(secret.body).not.toContain(marker);

    const nonsynthetic = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: {
        packet: { ...syntheticPacket(), constraints: { synthetic: false } },
      },
    });
    expect(nonsynthetic.statusCode).toBe(400);
    expect(nonsynthetic.json()).toMatchObject({
      errors: [{ code: "packet_intake.synthetic_required" }],
    });

    const boundedOversize = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...syntheticPacket(), intent: marker.repeat(100) } },
    });
    expect(boundedOversize.statusCode).toBe(413);
    expect(boundedOversize.body).not.toContain(marker);

    const transportOversize = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...syntheticPacket(), intent: marker.repeat(3_000) } },
    });
    expect(transportOversize.statusCode).toBe(413);
    expect(transportOversize.body).not.toContain(marker);
    expect(transportOversize.headers["cache-control"]).toBe("no-store");
    expect(transportOversize.json()).toMatchObject({
      errors: [{ code: "packet_intake.request_too_large" }],
      side_effects: [],
    });

    const malformed = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers: { ...headers, "content-type": "application/json" },
      payload: `{${marker}`,
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.body).not.toContain(marker);
    expect(malformed.headers["cache-control"]).toBe("no-store");
    expect(malformed.json()).toMatchObject({
      errors: [{ code: "packet_intake.invalid_request" }],
      side_effects: [],
    });
    expect(packets.records.size).toBe(0);
  });
});

function syntheticPacket(): UniversalPacket {
  return {
    packet_id: "pkt_bp0875_synthetic_0001",
    packet_type: "ExecutionPacket",
    version: "0.1",
    project_id: "lnsat-local-beta",
    actor_id: "agent.codex.synthetic",
    session_id: "sess_bp0875_synthetic_0001",
    intent: "Persist one synthetic packet without execution authority.",
    risk_level: 1,
    source_refs: ["packet:BP-0875"],
    resource_refs: ["local:disposable-postgresql"],
    policy_profile: "local_synthetic_intake_only",
    permission_envelope: {
      allow: ["packet.intake.local"],
      block: ["packet.execute", "network.non_loopback", "provider.dispatch"],
    },
    budget: {
      tokens: 0,
      runtime_seconds: 0,
      cost_usd: 0,
      cpu: 0,
      memory_mb: 0,
    },
    constraints: {
      synthetic: true,
      network: "loopback_only",
      execution: "blocked",
    },
    requires_approval: true,
    ttl_seconds: 300,
    created_at: "2026-07-14T02:00:00.000Z",
  };
}

async function issueHeaders(
  gateway: ReturnType<typeof buildApiGateway>,
): Promise<Record<string, string>> {
  const response = await gateway.inject({
    method: "POST",
    url: "/v1/local-beta/auth/session",
    headers: { "x-lnsat-local-operator-credential": credential },
  });
  expect(response.statusCode).toBe(201);
  const cookie = String(response.headers["set-cookie"]).split(";")[0] as string;
  return {
    cookie,
    [LOCAL_SESSION_PROOF_HEADER]: String(response.headers[LOCAL_SESSION_PROOF_HEADER]),
  };
}

function memoryPacketRepository(): LocalPacketIntakeRepository & {
  records: Map<string, LocalPacketIntakeRecord>;
} {
  const records = new Map<string, LocalPacketIntakeRecord>();
  return {
    records,
    async put(record) {
      const existing = records.get(record.packetId);
      if (existing !== undefined) return { created: false, record: existing };
      const saved = { ...record, acceptedAt: fixedNow };
      records.set(record.packetId, saved);
      return { created: true, record: saved };
    },
    async get(packetId, requestedAuth) {
      const record = records.get(packetId);
      return record?.operatorId === requestedAuth.operatorId ? record : null;
    },
    async close() {},
  };
}

function memorySessionRepository(
  capabilities: string[],
): LocalSessionRepository & { sessions: LocalSessionRecord[] } {
  const operator: LocalOperatorRecord = {
    operatorId: LOCAL_OPERATOR_ID,
    credentialDigest: `sha256:${createHash("sha256").update(credential).digest("hex")}`,
    capabilities,
    disabledAt: null,
  };
  const sessions: LocalSessionRecord[] = [];
  return {
    sessions,
    async getOperator(operatorId) {
      return operatorId === operator.operatorId ? operator : null;
    },
    async createSession(record) {
      sessions.push({ ...record });
    },
    async getSession(sessionId) {
      return sessions.find((session) => session.sessionId === sessionId) ?? null;
    },
    async revokeSession(sessionId, revokedAt) {
      const session = sessions.find((candidate) => candidate.sessionId === sessionId);
      if (session === undefined || session.revokedAt !== null) return false;
      session.revokedAt = revokedAt;
      return true;
    },
    async close() {},
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

function allowedSessionService(): LocalControlPlaneSessionService {
  const session = {
    session_id: auth.sessionId,
    operator_id: auth.operatorId,
    capabilities: [LOCAL_OPERATOR_CAPABILITY, LOCAL_PACKET_SUBMIT_CAPABILITY],
    issued_at: fixedNow.toISOString(),
    expires_at: new Date(fixedNow.getTime() + 300_000).toISOString(),
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
