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
  createLocalControlPlaneApprovalRequestService,
  createLocalControlPlanePacketIntakeService,
  createLocalControlPlanePolicyDecisionService,
  createLocalControlPlaneSessionService,
  createPostgreSqlLocalPacketApprovalRequestRepository,
  createPostgreSqlLocalPacketIntakeRepository,
  createPostgreSqlLocalPacketPolicyDecisionRepository,
  createPostgreSqlLocalSessionRepository,
} from "../apps/api/dist/index.js";
import { hashUniversalPacket } from "../packages/packets/dist/index.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseScript = join(repoRoot, "scripts/local-beta-db.mjs");

test("real PostgreSQL approval request survives restart without grant, audit, or execution", async () => {
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
  let approvalRepository;
  let gateway;
  let client;
  let revoker;
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
    approvalRepository =
      createPostgreSqlLocalPacketApprovalRequestRepository(connectionString);
    const sessionService = createLocalControlPlaneSessionService(sessionRepository);
    const intakeService = createLocalControlPlanePacketIntakeService(intakeRepository);
    const policyService =
      createLocalControlPlanePolicyDecisionService(policyRepository);
    const approvalService =
      createLocalControlPlaneApprovalRequestService(approvalRepository);
    gateway = buildApiGateway({
      localSessionService: sessionService,
      localPacketIntakeService: intakeService,
      localPolicyDecisionService: policyService,
      localApprovalRequestService: approvalService,
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
    const policy = evaluated.json().policy;
    assert.equal(policy.packet_digest, expectedDigest);
    assert.equal(policy.policy_decision.decision, "approval_required");
    const requestBody = {
      packet_digest: expectedDigest,
      policy_decision_id: policy.policy_decision.decision_id,
      requested_action: "packet.approve",
      reason_codes: policy.policy_decision.reason_codes,
    };

    client = new Client({ connectionString });
    await client.connect();
    await assert.rejects(
      client.query(
        `INSERT INTO local_packet_approval_requests (
           approval_request_id, packet_id, packet_digest, policy_decision_id,
           requested_action, reason_codes, operator_id, authenticated_session_id
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          `apr_${"f".repeat(32)}`,
          packet.packet_id,
          `sha256:${"f".repeat(64)}`,
          requestBody.policy_decision_id,
          requestBody.requested_action,
          JSON.stringify(requestBody.reason_codes),
          "operator.local.synthetic",
          policy.authenticated_session_id,
        ],
      ),
      /foreign key constraint|authorization rejected/,
    );

    const created = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packet.packet_id}/approval-request`,
      headers,
      payload: requestBody,
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.headers["cache-control"], "no-store");
    const createdBody = created.json();
    assert.deepEqual(Object.keys(createdBody).sort(), [
      "approval_request",
      "created",
      "ok",
      "side_effects",
      "status",
    ]);
    assert.deepEqual(createdBody, {
      ok: true,
      status: "bp-0877-local-packet-approval-request",
      created: true,
      approval_request: {
        approval_request_id: createdBody.approval_request.approval_request_id,
        packet_id: packet.packet_id,
        packet_digest: expectedDigest,
        policy_decision_id: requestBody.policy_decision_id,
        request_status: "pending",
        requested_action: "packet.approve",
        reason_codes: requestBody.reason_codes,
        operator_id: "operator.local.synthetic",
        authenticated_session_id: policy.authenticated_session_id,
        requested_at: createdBody.approval_request.requested_at,
      },
      side_effects: ["local_packet_approval_request_row_write"],
    });
    assert.match(
      createdBody.approval_request.approval_request_id,
      /^apr_[a-f0-9]{32}$/,
    );
    assert.match(
      createdBody.approval_request.requested_at,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    assert.equal(created.body.includes("canonical_packet"), false);
    assert.equal(created.body.includes("credential"), false);
    assert.equal(created.body.includes("approval_status"), false);

    const identical = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packet.packet_id}/approval-request`,
      headers,
      payload: requestBody,
    });
    assert.equal(identical.statusCode, 200);
    assert.deepEqual(identical.json(), {
      ...createdBody,
      created: false,
      side_effects: [],
    });

    const persisted = await client.query(
      `SELECT approval_request_id, packet_id, packet_digest, policy_decision_id,
              decision_kind, requires_approval, request_status,
              requested_action, reason_codes, operator_id,
              authenticated_session_id, requested_at, raw_input_content,
              side_effects, row_version
       FROM local_packet_approval_requests
       WHERE packet_id = $1`,
      [packet.packet_id],
    );
    assert.equal(persisted.rowCount, 1);
    assert.deepEqual(persisted.rows[0], {
      approval_request_id: createdBody.approval_request.approval_request_id,
      packet_id: packet.packet_id,
      packet_digest: expectedDigest,
      policy_decision_id: requestBody.policy_decision_id,
      decision_kind: "approval_required",
      requires_approval: true,
      request_status: "pending",
      requested_action: "packet.approve",
      reason_codes: requestBody.reason_codes,
      operator_id: "operator.local.synthetic",
      authenticated_session_id: policy.authenticated_session_id,
      requested_at: new Date(createdBody.approval_request.requested_at),
      raw_input_content: "withheld",
      side_effects: [],
      row_version: 1,
    });
    assert.deepEqual(await forbiddenRowCounts(client), {
      approvals: 0,
      auditEvents: 0,
      controlPlanePackets: 0,
      executions: 0,
    });

    await assert.rejects(
      client.query(
        "UPDATE local_packet_approval_requests SET request_status = request_status WHERE packet_id = $1",
        [packet.packet_id],
      ),
      /local packet approval requests are immutable/,
    );
    await assert.rejects(
      client.query("DELETE FROM local_packet_approval_requests WHERE packet_id = $1", [
        packet.packet_id,
      ]),
      /local packet approval requests are immutable/,
    );

    await client.end();
    client = undefined;
    await gateway.close();
    gateway = undefined;
    await approvalRepository.close();
    approvalRepository = undefined;
    await policyRepository.close();
    policyRepository = undefined;
    await intakeRepository.close();
    intakeRepository = undefined;
    await sessionRepository.close();
    sessionRepository = undefined;

    assertCli(runCli("restart", env));
    sessionRepository = createPostgreSqlLocalSessionRepository(connectionString);
    approvalRepository =
      createPostgreSqlLocalPacketApprovalRequestRepository(connectionString);
    const restartedSessionService =
      createLocalControlPlaneSessionService(sessionRepository);
    const restartedApprovalService =
      createLocalControlPlaneApprovalRequestService(approvalRepository);
    gateway = buildApiGateway({
      localSessionService: restartedSessionService,
      localApprovalRequestService: restartedApprovalService,
    });

    const readback = await gateway.inject({
      method: "GET",
      url: `/v1/local-beta/packets/${packet.packet_id}/approval-request`,
      headers,
    });
    assert.equal(readback.statusCode, 200);
    assert.deepEqual(readback.json(), {
      ok: true,
      status: "bp-0877-local-packet-approval-request",
      approval_request: createdBody.approval_request,
      side_effects: [],
    });

    const restartedIdempotent = await gateway.inject({
      method: "POST",
      url: `/v1/local-beta/packets/${packet.packet_id}/approval-request`,
      headers,
      payload: requestBody,
    });
    assert.equal(restartedIdempotent.statusCode, 200);
    assert.deepEqual(restartedIdempotent.json(), {
      ...createdBody,
      created: false,
      side_effects: [],
    });

    const staleAuth = {
      operatorId: "operator.local.synthetic",
      sessionId: policy.authenticated_session_id,
    };
    revoker = new Client({ connectionString });
    await revoker.connect();
    await revoker.query("BEGIN");
    const revoked = await revoker.query(
      `UPDATE local_sessions
       SET revoked_at = statement_timestamp(), row_version = row_version + 1
       WHERE session_id = $1 AND revoked_at IS NULL`,
      [staleAuth.sessionId],
    );
    assert.equal(revoked.rowCount, 1);

    const racingRead = restartedApprovalService.read(packet.packet_id, staleAuth);
    await waitForApprovalAuthorizationLock(revoker);
    await revoker.query("COMMIT");
    assert.deepEqual(await racingRead, {
      ok: false,
      code: "approval_request.authorization_changed",
    });
    assert.deepEqual(
      await restartedApprovalService.create(packet.packet_id, requestBody, staleAuth),
      { ok: false, code: "approval_request.authorization_changed" },
    );
    const unchanged = await revoker.query(
      `SELECT request_status, count(*)::integer AS request_count
       FROM local_packet_approval_requests
       WHERE packet_id = $1
       GROUP BY request_status`,
      [packet.packet_id],
    );
    assert.deepEqual(unchanged.rows, [{ request_status: "pending", request_count: 1 }]);
    await revoker.end();
    revoker = undefined;
  } finally {
    if (client !== undefined) await client.end().catch(() => undefined);
    if (revoker !== undefined) {
      await revoker.query("ROLLBACK").catch(() => undefined);
      await revoker.end().catch(() => undefined);
    }
    if (gateway !== undefined) await gateway.close().catch(() => undefined);
    if (approvalRepository !== undefined) {
      await approvalRepository.close().catch(() => undefined);
    }
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
    packet_id: "pkt_bp0877_restart_0001",
    packet_type: "ExecutionPacket",
    version: "0.1",
    project_id: "lnsat-local-beta",
    actor_id: "agent.codex.synthetic",
    session_id: "sess_bp0877_restart_0001",
    intent: "Persist one pending approval request without approval or execution.",
    risk_level: 6,
    source_refs: ["packet:BP-0877"],
    resource_refs: ["local:disposable-postgresql"],
    policy_profile: "local_synthetic_approval_request_only",
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
    created_at: "2026-07-14T04:00:00.000Z",
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

async function waitForApprovalAuthorizationLock(observer) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await observer.query(
      `SELECT 1
       FROM pg_stat_activity
       WHERE pid <> pg_backend_pid()
         AND state = 'active'
         AND wait_event_type = 'Lock'
         AND query LIKE '%FROM local_sessions AS session%'
       LIMIT 1`,
    );
    if (result.rowCount === 1) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  assert.fail("approval authorization read did not block behind revocation");
}
