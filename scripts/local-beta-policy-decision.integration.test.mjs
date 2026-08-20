import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { Client } from "pg";
import {
  LOCAL_SESSION_PROOF_HEADER,
  buildApiGateway,
  createLocalControlPlanePacketIntakeService,
  createLocalControlPlanePolicyDecisionService,
  createLocalControlPlaneSessionService,
  createPostgreSqlLocalPacketIntakeRepository,
  createPostgreSqlLocalPacketPolicyDecisionRepository,
  createPostgreSqlLocalSessionRepository,
} from "../apps/api/dist/index.js";
import { hashUniversalPacket } from "../packages/packets/dist/index.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseScript = join(repoRoot, "scripts/local-beta-db.mjs");

test("real PostgreSQL policy decision survives restart without approval, audit, or execution", async () => {
  const stateDir = join(
    repoRoot,
    "local-state",
    `d-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
  );
  const port = await freePort();
  const env = {
    ...process.env,
    LNSAT_LOCAL_BETA_STATE_DIR: stateDir,
    LNSAT_LOCAL_BETA_PORT: String(port),
  };
  let sessionRepository;
  let intakeRepository;
  let policyRepository;
  let gateway;
  let client;
  try {
    assertCli(runCli("bootstrap", env));
    const connectionString = readConnectionString(stateDir);
    const credential = readFileSync(
      join(stateDir, "operator.credential"),
      "utf8",
    ).trim();
    const packet = syntheticPacket();
    const expectedDigest = await hashUniversalPacket(packet);

    sessionRepository = createPostgreSqlLocalSessionRepository(connectionString);
    intakeRepository = createPostgreSqlLocalPacketIntakeRepository(connectionString);
    policyRepository =
      createPostgreSqlLocalPacketPolicyDecisionRepository(connectionString);
    const sessionService = createLocalControlPlaneSessionService(sessionRepository);
    const intakeService = createLocalControlPlanePacketIntakeService(intakeRepository);
    const policyService =
      createLocalControlPlanePolicyDecisionService(policyRepository);
    gateway = buildApiGateway({
      localSessionService: sessionService,
      localPacketIntakeService: intakeService,
      localPolicyDecisionService: policyService,
    });
    const headers = await issueHeaders(gateway, credential);

    const intake = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet },
    });
    assert.equal(intake.statusCode, 201);

    const evaluated = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packet.packet_id}/policy-decision`,
      headers,
    });
    assert.equal(evaluated.statusCode, 201);
    assert.equal(evaluated.json().policy.packet_digest, expectedDigest);
    assert.equal(evaluated.json().policy.policy_decision.decision, "approval_required");
    assert.deepEqual(evaluated.json().side_effects, [
      "local_packet_policy_decision_row_write",
    ]);

    client = new Client({ connectionString });
    await client.connect();
    const persisted = await client.query(
      `SELECT decision.decision_id, decision.packet_digest,
              decision.policy_decision, decision.decision_kind,
              decision.requires_approval, decision.reason_codes,
              decision.operator_id, decision.authenticated_session_id,
              decision.policy_created_at, decision.evaluated_at,
              decision.raw_input_content, decision.side_effects,
              intake.accepted_at
       FROM local_packet_policy_decisions AS decision
       JOIN local_packet_intakes AS intake ON intake.packet_id = decision.packet_id
       WHERE decision.packet_id = $1`,
      [packet.packet_id],
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0]?.packet_digest, expectedDigest);
    assert.equal(persisted.rows[0]?.decision_kind, "approval_required");
    assert.equal(persisted.rows[0]?.requires_approval, true);
    assert.deepEqual(persisted.rows[0]?.reason_codes, [
      "policy.packet_requires_approval",
      "policy.risk_requires_approval",
    ]);
    assert.equal(persisted.rows[0]?.operator_id, "operator.local.synthetic");
    assert.match(persisted.rows[0]?.authenticated_session_id, /^ses_[a-f0-9]{32}$/);
    assert.equal(persisted.rows[0]?.raw_input_content, "withheld");
    assert.deepEqual(persisted.rows[0]?.side_effects, []);
    assert.equal(
      persisted.rows[0]?.policy_created_at.toISOString(),
      persisted.rows[0]?.accepted_at.toISOString(),
    );
    assert.equal(
      persisted.rows[0]?.policy_decision.created_at,
      persisted.rows[0]?.accepted_at.toISOString(),
    );
    assert.ok(
      persisted.rows[0]?.evaluated_at.getTime() >=
        persisted.rows[0]?.accepted_at.getTime(),
    );
    assert.deepEqual(await forbiddenRowCounts(client), {
      approvals: 0,
      auditEvents: 0,
      controlPlanePackets: 0,
      executions: 0,
    });

    await assert.rejects(
      client.query(
        "UPDATE local_packet_policy_decisions SET decision_kind = decision_kind WHERE packet_id = $1",
        [packet.packet_id],
      ),
      /local packet policy decisions are immutable/,
    );
    await assert.rejects(
      client.query("DELETE FROM local_packet_policy_decisions WHERE packet_id = $1", [
        packet.packet_id,
      ]),
      /local packet policy decisions are immutable/,
    );

    const idempotent = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packet.packet_id}/policy-decision`,
      headers,
    });
    assert.equal(idempotent.statusCode, 200);
    assert.equal(idempotent.json().created, false);
    assert.deepEqual(idempotent.json().side_effects, []);

    await client.end();
    client = undefined;
    await gateway.close();
    gateway = undefined;
    await policyRepository.close();
    policyRepository = undefined;
    await intakeRepository.close();
    intakeRepository = undefined;
    await sessionRepository.close();
    sessionRepository = undefined;

    assertCli(runCli("restart", env));
    sessionRepository = createPostgreSqlLocalSessionRepository(connectionString);
    policyRepository =
      createPostgreSqlLocalPacketPolicyDecisionRepository(connectionString);
    const restartedSessionService =
      createLocalControlPlaneSessionService(sessionRepository);
    const restartedPolicyService =
      createLocalControlPlanePolicyDecisionService(policyRepository);
    gateway = buildApiGateway({
      localSessionService: restartedSessionService,
      localPolicyDecisionService: restartedPolicyService,
    });

    const readback = await gateway.inject({
      method: "GET",
      url: `/v1/local-beta/packets/${packet.packet_id}/policy-decision`,
      headers,
    });
    assert.equal(readback.statusCode, 200);
    assert.equal(readback.json().policy.packet_digest, expectedDigest);

    const restartedIdempotent = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packet.packet_id}/policy-decision`,
      headers,
    });
    assert.equal(restartedIdempotent.statusCode, 200);
    assert.equal(restartedIdempotent.json().created, false);

    const staleAuth = {
      operatorId: "operator.local.synthetic",
      sessionId: readback.json().policy.authenticated_session_id,
    };
    const revoked = await gateway.inject({
      method: "DELETE",
      url: "/v1/local-beta/auth/session",
      headers,
    });
    assert.equal(revoked.statusCode, 200);
    assert.deepEqual(await restartedPolicyService.read(packet.packet_id, staleAuth), {
      ok: false,
      code: "packet_policy.authorization_changed",
    });
    assert.deepEqual(
      await restartedPolicyService.evaluate(packet.packet_id, undefined, staleAuth),
      { ok: false, code: "packet_policy.authorization_changed" },
    );
  } finally {
    if (client !== undefined) await client.end().catch(() => undefined);
    if (gateway !== undefined) await gateway.close().catch(() => undefined);
    if (policyRepository !== undefined) {
      await policyRepository.close().catch(() => undefined);
    }
    if (intakeRepository !== undefined) {
      await intakeRepository.close().catch(() => undefined);
    }
    if (sessionRepository !== undefined) {
      await sessionRepository.close().catch(() => undefined);
    }
    runCli("reset", env);
  }
});

function syntheticPacket() {
  return {
    packet_id: "pkt_bp0876_restart_0001",
    packet_type: "ExecutionPacket",
    version: "0.1",
    project_id: "lnsat-local-beta",
    actor_id: "agent.codex.synthetic",
    session_id: "sess_bp0876_restart_0001",
    intent: "Persist one deterministic policy decision without execution.",
    risk_level: 6,
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
    requires_approval: true,
    ttl_seconds: 300,
    created_at: "2026-07-14T03:00:00.000Z",
  };
}

async function issueHeaders(gateway, credential) {
  const response = await gateway.inject({
    method: "POST",
    url: "/v1/local-beta/auth/session",
    headers: { "x-lnsat-local-operator-credential": credential },
  });
  assert.equal(response.statusCode, 201);
  return {
    cookie: String(response.headers["set-cookie"]).split(";")[0],
    [LOCAL_SESSION_PROOF_HEADER]: String(response.headers[LOCAL_SESSION_PROOF_HEADER]),
  };
}

async function forbiddenRowCounts(client) {
  const result = await client.query(`SELECT
    (SELECT count(*)::integer FROM control_plane_approvals) AS approvals,
    (SELECT count(*)::integer FROM audit_events) AS "auditEvents",
    (SELECT count(*)::integer FROM control_plane_packets) AS "controlPlanePackets",
    (SELECT count(*)::integer FROM control_plane_executions) AS executions`);
  return result.rows[0];
}

function readConnectionString(stateDir) {
  const line = readFileSync(join(stateDir, "connection.env"), "utf8")
    .split("\n")
    .find((candidate) => candidate.startsWith("LNSAT_LOCAL_BETA_DATABASE_URL="));
  assert.notEqual(line, undefined);
  return line.slice(line.indexOf("=") + 1);
}

function runCli(command, env) {
  return spawnSync(process.execPath, [databaseScript, command], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
}

function assertCli(result) {
  assert.equal(
    result.status,
    0,
    `database command failed with status ${String(result.status)}; raw output withheld`,
  );
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  const selected = address.port;
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error === undefined ? resolvePromise() : reject(error)));
  });
  return selected;
}
