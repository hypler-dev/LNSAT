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
  createLocalControlPlaneSessionService,
  createPostgreSqlLocalPacketIntakeRepository,
  createPostgreSqlLocalSessionRepository,
} from "../apps/api/dist/index.js";
import {
  canonicalizeUniversalPacket,
  hashUniversalPacket,
} from "../packages/packets/dist/index.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseScript = join(repoRoot, "scripts/local-beta-db.mjs");

test("real PostgreSQL packet intake survives restart and preserves immutable truth", async () => {
  const stateDir = join(
    repoRoot,
    "local-state",
    `p-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
  );
  const port = await freePort();
  const env = {
    ...process.env,
    LNSAT_LOCAL_BETA_STATE_DIR: stateDir,
    LNSAT_LOCAL_BETA_PORT: String(port),
  };
  let sessionRepository;
  let intakeRepository;
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
    const expectedCanonical = canonicalizeUniversalPacket(packet);
    const expectedDigest = await hashUniversalPacket(packet);

    sessionRepository = createPostgreSqlLocalSessionRepository(connectionString);
    intakeRepository = createPostgreSqlLocalPacketIntakeRepository(connectionString);
    const sessionService = createLocalControlPlaneSessionService(sessionRepository);
    const intakeService = createLocalControlPlanePacketIntakeService(intakeRepository);
    gateway = buildApiGateway({
      localSessionService: sessionService,
      localPacketIntakeService: intakeService,
    });
    const headers = await issueHeaders(gateway, credential);

    const created = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet },
    });
    assert.equal(created.statusCode, 201, "initial packet intake failed");
    assert.equal(created.json().packet.packet_digest, expectedDigest);
    assert.equal(created.json().created, true);

    client = new Client({ connectionString });
    await client.connect();
    const persisted = await client.query(
      `SELECT packet_digest, canonical_packet, intake_status, operator_id,
              authenticated_session_id, raw_input_content, side_effects, row_version
       FROM local_packet_intakes
       WHERE packet_id = $1`,
      [packet.packet_id],
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0]?.packet_digest, expectedDigest);
    assert.equal(
      canonicalizeUniversalPacket(persisted.rows[0]?.canonical_packet),
      expectedCanonical,
    );
    assert.equal(persisted.rows[0]?.intake_status, "accepted");
    assert.equal(persisted.rows[0]?.operator_id, "operator.local.synthetic");
    assert.match(persisted.rows[0]?.authenticated_session_id, /^ses_[a-f0-9]{32}$/);
    assert.equal(persisted.rows[0]?.raw_input_content, "withheld");
    assert.deepEqual(persisted.rows[0]?.side_effects, []);
    assert.equal(persisted.rows[0]?.row_version, 1);

    await assert.rejects(
      client.query(
        "UPDATE local_packet_intakes SET intake_status = 'accepted' WHERE packet_id = $1",
        [packet.packet_id],
      ),
      /local packet intake rows are immutable/,
    );
    await assert.rejects(
      client.query("DELETE FROM local_packet_intakes WHERE packet_id = $1", [
        packet.packet_id,
      ]),
      /local packet intake rows are immutable/,
    );

    const idempotent = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet },
    });
    assert.equal(idempotent.statusCode, 200);
    assert.equal(idempotent.json().created, false);
    assert.deepEqual(idempotent.json().side_effects, []);

    const conflict = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...packet, intent: "conflicting synthetic intent" } },
    });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().errors[0]?.code, "packet_intake.conflict");
    assert.equal(await packetCount(client, packet.packet_id), 1);

    await client.end();
    client = undefined;
    await gateway.close();
    gateway = undefined;
    await intakeRepository.close();
    intakeRepository = undefined;
    await sessionRepository.close();
    sessionRepository = undefined;

    assertCli(runCli("restart", env));
    sessionRepository = createPostgreSqlLocalSessionRepository(connectionString);
    intakeRepository = createPostgreSqlLocalPacketIntakeRepository(connectionString);
    const restartedSessionService =
      createLocalControlPlaneSessionService(sessionRepository);
    const restartedIntakeService =
      createLocalControlPlanePacketIntakeService(intakeRepository);
    gateway = buildApiGateway({
      localSessionService: restartedSessionService,
      localPacketIntakeService: restartedIntakeService,
    });

    const readback = await gateway.inject({
      method: "GET",
      url: `/v1/local-beta/packets/${packet.packet_id}`,
      headers,
    });
    assert.equal(readback.statusCode, 200);
    assert.equal(readback.json().packet.packet_digest, expectedDigest);

    const restartedIdempotent = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet },
    });
    assert.equal(restartedIdempotent.statusCode, 200);
    assert.equal(restartedIdempotent.json().created, false);

    const restartedConflict = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...packet, risk_level: 2 } },
    });
    assert.equal(restartedConflict.statusCode, 409);

    client = new Client({ connectionString });
    await client.connect();
    assert.equal(await packetCount(client, packet.packet_id), 1);

    const revoked = await gateway.inject({
      method: "DELETE",
      url: "/v1/local-beta/auth/session",
      headers,
    });
    assert.equal(revoked.statusCode, 200);
    const staleAuth = {
      operatorId: "operator.local.synthetic",
      sessionId: readback.json().packet.authenticated_session_id,
    };
    const staleRead = await restartedIntakeService.read(packet.packet_id, staleAuth);
    assert.deepEqual(staleRead, {
      ok: false,
      code: "packet_intake.authorization_changed",
    });
    const staleSubmit = await restartedIntakeService.submit({ packet }, staleAuth);
    assert.deepEqual(staleSubmit, {
      ok: false,
      code: "packet_intake.authorization_changed",
    });
    const deniedAfterRevoke = await gateway.inject({
      method: "POST",
      url: "/v1/local-beta/packets",
      headers,
      payload: { packet: { ...packet, packet_id: "pkt_bp0875_revoked_0002" } },
    });
    assert.equal(deniedAfterRevoke.statusCode, 401);
    assert.equal(await packetCount(client, "pkt_bp0875_revoked_0002"), 0);
  } finally {
    if (client !== undefined) await client.end().catch(() => undefined);
    if (gateway !== undefined) await gateway.close().catch(() => undefined);
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
    packet_id: "pkt_bp0875_restart_0001",
    packet_type: "ExecutionPacket",
    version: "0.1",
    project_id: "lnsat-local-beta",
    actor_id: "agent.codex.synthetic",
    session_id: "sess_bp0875_restart_0001",
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

async function issueHeaders(gateway, credential) {
  const response = await gateway.inject({
    method: "POST",
    url: "/v1/local-beta/auth/session",
    headers: { "x-lnsat-local-operator-credential": credential },
  });
  assert.equal(response.statusCode, 201, "local session issue failed");
  return {
    cookie: String(response.headers["set-cookie"]).split(";")[0],
    [LOCAL_SESSION_PROOF_HEADER]: String(response.headers[LOCAL_SESSION_PROOF_HEADER]),
  };
}

async function packetCount(client, packetId) {
  const result = await client.query(
    "SELECT count(*)::integer AS count FROM local_packet_intakes WHERE packet_id = $1",
    [packetId],
  );
  return result.rows[0]?.count;
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
