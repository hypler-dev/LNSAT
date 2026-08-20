import { hashUniversalPacket, type UniversalPacket } from "@lnsat/packets";
import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_OPERATOR_CAPABILITY,
  LOCAL_OPERATOR_ID,
  LOCAL_PACKET_POLICY_EVALUATE_CAPABILITY,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_PROOF_HEADER,
  buildApiGateway,
  createLocalControlPlanePolicyDecisionService,
  type LocalControlPlaneSessionService,
  type LocalPacketPolicyDecisionRecord,
  type LocalPacketPolicyDecisionRepository,
  type LocalPacketPolicyInput,
  type LocalSessionFailureCode,
} from "../src/index.js";

const acceptedAt = new Date("2026-07-14T03:00:00.000Z");
const auth = {
  operatorId: LOCAL_OPERATOR_ID,
  sessionId: `ses_${"2".repeat(32)}`,
};
const headers = {
  cookie: `${LOCAL_SESSION_COOKIE}=bounded-token`,
  [LOCAL_SESSION_PROOF_HEADER]: "B".repeat(43),
};

describe("BP-0876 local deterministic policy decisions", () => {
  const gateways: ReturnType<typeof buildApiGateway>[] = [];

  afterEach(async () => {
    await Promise.all(gateways.splice(0).map((gateway) => gateway.close()));
  });

  it("preserves allow, deny, and approval-required policy truth idempotently", async () => {
    const inputs = new Map<string, LocalPacketPolicyInput>();
    const allow = packet("pkt_bp0876_allow_0001");
    const deny = packet("pkt_bp0876_deny_0001", {
      permission_envelope: { allow: ["ssh"], block: ["secret.read.never"] },
    });
    const approval = packet("pkt_bp0876_approval_0001", {
      requires_approval: true,
      risk_level: 6,
    });
    for (const candidate of [allow, deny, approval]) {
      inputs.set(candidate.packet_id, await input(candidate));
    }
    const repository = memoryRepository(inputs);
    const service = createLocalControlPlanePolicyDecisionService(repository);

    for (const [candidate, expected] of [
      [allow, "allow"],
      [deny, "deny"],
      [approval, "approval_required"],
    ] as const) {
      const result = await service.evaluate(candidate.packet_id, undefined, auth);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.created).toBe(true);
      expect(result.policy.policy_decision.decision).toBe(expected);
      expect(result.policy.policy_decision.created_at).toBe(acceptedAt.toISOString());
    }

    const repeated = await service.evaluate(allow.packet_id, undefined, auth);
    expect(repeated).toMatchObject({ ok: true, created: false });
    expect(repository.records.size).toBe(3);
    const read = await service.read(allow.packet_id, auth);
    expect(read).toMatchObject({
      ok: true,
      policy: { policy_decision: { decision: "allow" } },
    });

    const saved = repository.records.get(allow.packet_id);
    expect(saved).toBeDefined();
    if (saved !== undefined) saved.operatorId = "operator.local.conflict";
    expect(await service.evaluate(allow.packet_id, undefined, auth)).toEqual({
      ok: false,
      code: "packet_policy.conflict",
    });
  });

  it("exposes bounded authenticated evaluate/read with no approval or execution effects", async () => {
    const candidate = packet("pkt_bp0876_route_0001", {
      requires_approval: true,
    });
    const repository = memoryRepository(
      new Map([[candidate.packet_id, await input(candidate)]]),
    );
    const gateway = buildApiGateway({
      localSessionService: allowedSessionService(),
      localPolicyDecisionService:
        createLocalControlPlanePolicyDecisionService(repository),
    });
    gateways.push(gateway);

    const created = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${candidate.packet_id}/policy-decision`,
      headers,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      status: "bp-0876-local-packet-policy-decision",
      created: true,
      policy: {
        packet_id: candidate.packet_id,
        policy_decision: { decision: "approval_required" },
      },
      side_effects: ["local_packet_policy_decision_row_write"],
    });
    expect(created.body).not.toContain("canonical_packet");
    expect(created.body).not.toContain("approval_id");
    expect(created.body).not.toContain("execution_id");

    const repeated = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${candidate.packet_id}/policy-decision`,
      headers,
    });
    expect(repeated.statusCode).toBe(200);
    expect(repeated.json()).toMatchObject({ created: false, side_effects: [] });

    const read = await gateway.inject({
      method: "GET",
      url: `/v1/local-beta/packets/${candidate.packet_id}/policy-decision`,
      headers,
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().side_effects).toEqual([]);

    const unexpectedBody = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${candidate.packet_id}/policy-decision`,
      headers,
      payload: {},
    });
    expect(unexpectedBody.statusCode).toBe(400);
    expect(unexpectedBody.json()).toMatchObject({
      errors: [{ code: "packet_policy.invalid_request" }],
      side_effects: [],
    });

    const malformed = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${candidate.packet_id}/policy-decision`,
      headers: { ...headers, "content-type": "application/json" },
      payload: "{DO_NOT_ECHO",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.headers["cache-control"]).toBe("no-store");
    expect(malformed.body).not.toContain("DO_NOT_ECHO");
    expect(malformed.json()).toMatchObject({
      errors: [{ code: "packet_policy.invalid_request" }],
      side_effects: [],
    });
  });

  it("denies transport and every session failure before parsing or policy lookup", async () => {
    const codes: LocalSessionFailureCode[] = [
      "local_auth.invalid_session",
      "local_auth.expired_session",
      "local_auth.revoked_session",
      "local_auth.capability_denied",
    ];
    for (const code of codes) {
      let calls = 0;
      const gateway = buildApiGateway({
        localSessionService: deniedSessionService(code),
        localPolicyDecisionService: countingPolicyService(() => {
          calls += 1;
        }),
      });
      gateways.push(gateway);
      const response = await gateway.inject({
        method: "POST",
        url: "/v1/local-beta/packets/pkt_bp0876_deny_0002/policy-decision",
        headers,
        payload: {},
      });
      expect(response.statusCode).toBe(
        code === "local_auth.capability_denied" ? 403 : 401,
      );
      expect(calls).toBe(0);
    }

    let remoteCalls = 0;
    const remoteGateway = buildApiGateway({
      localSessionService: allowedSessionService(),
      localPolicyDecisionService: countingPolicyService(() => {
        remoteCalls += 1;
      }),
    });
    gateways.push(remoteGateway);
    const remote = await remoteGateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets/pkt_bp0876_deny_0002/policy-decision",
      remoteAddress: "192.0.2.9",
      headers: { "content-type": "application/json" },
      payload: "{DO_NOT_PARSE",
    });
    expect(remote.statusCode).toBe(403);
    expect(remoteCalls).toBe(0);

    const missingOversize = await remoteGateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets/pkt_bp0876_deny_0002/policy-decision",
      payload: { hostile: "X".repeat(2_000) },
    });
    expect(missingOversize.statusCode).toBe(401);
    expect(remoteCalls).toBe(0);
  });
});

function packet(
  packetId: string,
  overrides: Partial<UniversalPacket> = {},
): UniversalPacket {
  return {
    packet_id: packetId,
    packet_type: "ExecutionPacket",
    version: "0.1",
    project_id: "lnsat-local-beta",
    actor_id: "agent.codex.synthetic",
    session_id: "sess_bp0876_synthetic_0001",
    intent: "Evaluate one synthetic packet without execution authority.",
    risk_level: 1,
    source_refs: ["packet:BP-0876"],
    resource_refs: ["local:disposable-postgresql"],
    policy_profile: "local_synthetic_policy_only",
    permission_envelope: {
      allow: ["context.read"],
      block: ["secret.read.never", "packet.execute", "provider.dispatch"],
    },
    budget: {
      tokens: 0,
      runtime_seconds: 0,
      cost_usd: 0,
      cpu: 0,
      memory_mb: 0,
    },
    constraints: { synthetic: true, execution: "blocked" },
    requires_approval: false,
    ttl_seconds: 300,
    created_at: "2026-07-14T03:00:00.000Z",
    ...overrides,
  };
}

async function input(candidate: UniversalPacket): Promise<LocalPacketPolicyInput> {
  return {
    packetId: candidate.packet_id,
    packetDigest: await hashUniversalPacket(candidate),
    canonicalPacket: candidate,
    acceptedAt,
  };
}

function memoryRepository(
  inputs: Map<string, LocalPacketPolicyInput>,
): LocalPacketPolicyDecisionRepository & {
  records: Map<string, LocalPacketPolicyDecisionRecord>;
} {
  const records = new Map<string, LocalPacketPolicyDecisionRecord>();
  return {
    records,
    async loadInput(packetId) {
      return inputs.get(packetId) ?? null;
    },
    async put(record) {
      const existing = records.get(record.packetId);
      if (existing !== undefined) return { created: false, record: existing };
      const saved = { ...record, evaluatedAt: acceptedAt };
      records.set(record.packetId, saved);
      return { created: true, record: saved };
    },
    async get(packetId) {
      return records.get(packetId) ?? null;
    },
    async close() {},
  };
}

function allowedSessionService(): LocalControlPlaneSessionService {
  const session = {
    session_id: auth.sessionId,
    operator_id: auth.operatorId,
    capabilities: [LOCAL_OPERATOR_CAPABILITY, LOCAL_PACKET_POLICY_EVALUATE_CAPABILITY],
    issued_at: acceptedAt.toISOString(),
    expires_at: new Date(acceptedAt.getTime() + 300_000).toISOString(),
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

function countingPolicyService(onCall: () => void) {
  return {
    async evaluate() {
      onCall();
      return { ok: false as const, code: "packet_policy.not_found" as const };
    },
    async read() {
      onCall();
      return { ok: false as const, code: "packet_policy.not_found" as const };
    },
  };
}
