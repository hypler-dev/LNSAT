import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import net from "node:net";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const script = join(repoRoot, "scripts/local-beta-db.mjs");

test("bootstrap, constraints, restart persistence, reset, and clean re-bootstrap", async () => {
  const stateDir = join(repoRoot, "local-state", `test-${randomUUID().slice(0, 8)}`);
  const port = await freePort();
  const env = {
    ...process.env,
    LNSAT_LOCAL_BETA_STATE_DIR: stateDir,
    LNSAT_LOCAL_BETA_PORT: String(port),
  };

  try {
    const bootstrap = runCli("bootstrap", env);
    assert.equal(bootstrap.status, 0, safeFailure(bootstrap));
    assert.match(bootstrap.stdout, /local_beta_db=ready/);
    assert.match(bootstrap.stdout, /migrations=6/);

    const passwordFile = join(stateDir, "postgres.password");
    const operatorCredentialFile = join(stateDir, "operator.credential");
    const connectionFile = join(stateDir, "connection.env");
    const password = readFileSync(passwordFile, "utf8").trim();
    const operatorCredential = readFileSync(operatorCredentialFile, "utf8").trim();
    assert.equal(statSync(passwordFile).mode & 0o777, 0o600);
    assert.equal(statSync(operatorCredentialFile).mode & 0o777, 0o600);
    assert.equal(statSync(connectionFile).mode & 0o777, 0o600);
    assert.equal(`${bootstrap.stdout}${bootstrap.stderr}`.includes(password), false);
    assert.equal(
      `${bootstrap.stdout}${bootstrap.stderr}${readFileSync(connectionFile, "utf8")}`.includes(
        operatorCredential,
      ),
      false,
    );
    assert.equal(
      query(
        env,
        password,
        "SELECT raw_credential_content FROM local_operators WHERE operator_id = 'operator.local.synthetic';",
      ),
      "withheld",
    );

    const invalid = psql(
      env,
      password,
      "INSERT INTO control_plane_packets (packet_id, canonical_input_digest, packet_body, policy_decision, workflow_status, source_refs, created_at, expires_at, updated_at) VALUES ('pkt_bp0871_invalid_state', 'sha256:" +
        "0".repeat(64) +
        "', '{\"synthetic\":true}', '{\"decision\":\"deny\"}', 'bypass', '[\"packet:BP-0871\"]', now(), now() + interval '1 hour', now());",
    );
    assert.notEqual(invalid.status, 0);

    const requestedApprovalBypass = psql(
      env,
      password,
      `BEGIN;
        INSERT INTO control_plane_packets (
          packet_id, canonical_input_digest, packet_body, policy_decision,
          workflow_status, source_refs, created_at, expires_at, updated_at
        ) VALUES (
          'pkt_bp0871_requested_bypass', 'sha256:${"2".repeat(64)}',
          '{"synthetic":true}', '{"decision":"approval_required"}',
          'approval_required', '["packet:BP-0871"]',
          '2026-07-13T20:00:00.000Z', '2026-07-13T21:00:00.000Z',
          '2026-07-13T20:00:00.000Z'
        );
        INSERT INTO control_plane_approvals (
          approval_id, packet_id, approval_status, requested_by, reason_codes,
          requested_at, expires_at
        ) VALUES (
          'apr_bp0871_requested_bypass', 'pkt_bp0871_requested_bypass',
          'requested', 'operator.local.synthetic', '[]',
          '2026-07-13T20:00:00.000Z', '2026-07-13T21:00:00.000Z'
        );
        INSERT INTO control_plane_executions (
          execution_id, packet_id, approval_id, approval_status, adapter_ref,
          execution_status, input_digest, started_at
        ) VALUES (
          'exe_bp0871_requested_bypass', 'pkt_bp0871_requested_bypass',
          'apr_bp0871_requested_bypass', 'approved',
          'adapter.local.synthetic_deterministic.v0_1', 'running',
          'sha256:${"2".repeat(64)}', '2026-07-13T20:05:00.000Z'
        );
        ROLLBACK;`,
    );
    assert.notEqual(requestedApprovalBypass.status, 0);

    const crossPacketBypass = psql(
      env,
      password,
      `BEGIN;
        INSERT INTO control_plane_packets (
          packet_id, canonical_input_digest, packet_body, policy_decision,
          workflow_status, source_refs, created_at, expires_at, updated_at
        ) VALUES
          ('pkt_bp0871_approval_owner', 'sha256:${"3".repeat(64)}',
           '{"synthetic":true}', '{"decision":"approval_required"}',
           'approved', '["packet:BP-0871"]',
           '2026-07-13T20:00:00.000Z', '2026-07-13T21:00:00.000Z',
           '2026-07-13T20:05:00.000Z'),
          ('pkt_bp0871_approval_thief', 'sha256:${"4".repeat(64)}',
           '{"synthetic":true}', '{"decision":"approval_required"}',
           'approved', '["packet:BP-0871"]',
           '2026-07-13T20:00:00.000Z', '2026-07-13T21:00:00.000Z',
           '2026-07-13T20:05:00.000Z');
        INSERT INTO control_plane_approvals (
          approval_id, packet_id, approval_status, requested_by, decided_by,
          reason_codes, requested_at, decided_at, expires_at
        ) VALUES (
          'apr_bp0871_approval_owner', 'pkt_bp0871_approval_owner', 'approved',
          'operator.local.synthetic', 'operator.local.synthetic', '[]',
          '2026-07-13T20:00:00.000Z', '2026-07-13T20:04:00.000Z',
          '2026-07-13T21:00:00.000Z'
        );
        INSERT INTO control_plane_executions (
          execution_id, packet_id, approval_id, approval_status, adapter_ref,
          execution_status, input_digest, started_at
        ) VALUES (
          'exe_bp0871_approval_thief', 'pkt_bp0871_approval_thief',
          'apr_bp0871_approval_owner', 'approved',
          'adapter.local.synthetic_deterministic.v0_1', 'running',
          'sha256:${"4".repeat(64)}', '2026-07-13T20:05:00.000Z'
        );
        ROLLBACK;`,
    );
    assert.notEqual(crossPacketBypass.status, 0);

    const authorizedExecution = psql(
      env,
      password,
      executionScenarioSql("authorized", {
        packetDigest: `sha256:${"5".repeat(64)}`,
      }),
    );
    assert.equal(authorizedExecution.status, 0, safeFailure(authorizedExecution));

    const authorizationUpdateBypass = psql(
      env,
      password,
      executionScenarioSql("update_bypass", {
        packetDigest: `sha256:${"c".repeat(64)}`,
        afterInsertSql: `UPDATE control_plane_executions
          SET input_digest = 'sha256:${"d".repeat(64)}'
          WHERE execution_id = 'exe_bp0871_update_bypass';`,
      }),
    );
    assert.notEqual(authorizationUpdateBypass.status, 0);
    assert.match(
      authorizationUpdateBypass.stderr,
      /execution authorization fields are immutable/,
    );

    const digestBypass = psql(
      env,
      password,
      executionScenarioSql("digest_bypass", {
        packetDigest: `sha256:${"6".repeat(64)}`,
        executionDigest: `sha256:${"7".repeat(64)}`,
      }),
    );
    assert.notEqual(digestBypass.status, 0);

    const deniedPacketBypass = psql(
      env,
      password,
      executionScenarioSql("denied_bypass", {
        packetDigest: `sha256:${"8".repeat(64)}`,
        packetStatus: "denied",
      }),
    );
    assert.notEqual(deniedPacketBypass.status, 0);

    const expiredPacketBypass = psql(
      env,
      password,
      executionScenarioSql("expired_bypass", {
        packetDigest: `sha256:${"9".repeat(64)}`,
        packetCreatedAt: "2020-07-13T20:00:00.000Z",
        approvalRequestedAt: "2020-07-13T20:00:00.000Z",
        approvalDecidedAt: "2020-07-13T20:04:00.000Z",
        expiresAt: "2020-07-13T21:00:00.000Z",
        startedAt: "2020-07-13T20:05:00.000Z",
      }),
    );
    assert.notEqual(expiredPacketBypass.status, 0);
    assert.match(
      expiredPacketBypass.stderr,
      /execution authorization binding rejected/,
    );

    const insertProbe = psql(
      env,
      password,
      `INSERT INTO control_plane_packets (
        packet_id, canonical_input_digest, packet_body, policy_decision,
        workflow_status, source_refs, created_at, expires_at, updated_at
      ) VALUES (
        'pkt_bp0871_restart_probe',
        'sha256:${"1".repeat(64)}',
        '{"synthetic":true}',
        '{"decision":"approval_required"}',
        'approval_required',
        '["packet:BP-0871"]',
        '2026-07-13T20:00:00.000Z',
        '2026-07-13T21:00:00.000Z',
        '2026-07-13T20:00:00.000Z'
      );`,
    );
    assert.equal(insertProbe.status, 0, safeFailure(insertProbe));

    const beforeAppliedAt = query(
      env,
      password,
      "SELECT min(applied_at)::text FROM lnsat_schema_migrations;",
    );
    const restart = runCli("restart", env);
    assert.equal(restart.status, 0, safeFailure(restart));
    assert.equal(
      query(
        env,
        password,
        "SELECT count(*) FROM control_plane_packets WHERE packet_id = 'pkt_bp0871_restart_probe';",
      ),
      "1",
    );
    assert.equal(
      query(
        env,
        password,
        "SELECT min(applied_at)::text FROM lnsat_schema_migrations;",
      ),
      beforeAppliedAt,
    );

    const tamper = psql(
      env,
      password,
      `ALTER TABLE control_plane_packets
        DROP CONSTRAINT control_plane_packets_raw_withheld;
       ALTER TABLE control_plane_packets
        ADD CONSTRAINT control_plane_packets_raw_withheld CHECK (true);`,
    );
    assert.equal(tamper.status, 0, safeFailure(tamper));
    const tamperedVerify = runCli("verify", env);
    assert.notEqual(tamperedVerify.status, 0);
    assert.match(tamperedVerify.stderr, /local_beta_db\.schema_definition_mismatch/);

    const reset = runCli("reset", env);
    assert.equal(reset.status, 0, safeFailure(reset));
    assert.equal(existsSync(stateDir), false);

    const secondBootstrap = runCli("bootstrap", env);
    assert.equal(secondBootstrap.status, 0, safeFailure(secondBootstrap));
    const secondPassword = readFileSync(passwordFile, "utf8").trim();
    const secondOperatorCredential = readFileSync(
      operatorCredentialFile,
      "utf8",
    ).trim();
    assert.notEqual(secondPassword, password);
    assert.notEqual(secondOperatorCredential, operatorCredential);
    assert.equal(
      query(
        env,
        secondPassword,
        "SELECT count(*) FROM control_plane_packets WHERE packet_id = 'pkt_bp0871_restart_probe';",
      ),
      "0",
    );

    const disableAuthorizationTrigger = psql(
      env,
      secondPassword,
      `ALTER TABLE control_plane_executions
        DISABLE TRIGGER control_plane_executions_authorization_trigger;`,
    );
    assert.equal(
      disableAuthorizationTrigger.status,
      0,
      safeFailure(disableAuthorizationTrigger),
    );
    const disabledTriggerVerify = runCli("verify", env);
    assert.notEqual(disabledTriggerVerify.status, 0);
    assert.match(
      disabledTriggerVerify.stderr,
      /local_beta_db\.schema_definition_mismatch/,
    );
  } finally {
    runCli("reset", env);
  }
});

test("reset refuses paths outside ignored repo local-state boundary", () => {
  const outside = `/tmp/lnsat-local-beta-${randomUUID()}`;
  const result = runCli("reset", {
    ...process.env,
    LNSAT_LOCAL_BETA_STATE_DIR: outside,
    LNSAT_LOCAL_BETA_PORT: "55432",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /local_beta_db\.invalid_state_dir/);
  assert.equal(existsSync(outside), false);
});

test("bootstrap rejects PostgreSQL socket-list path metacharacters", () => {
  const result = runCli("bootstrap", {
    ...process.env,
    LNSAT_LOCAL_BETA_STATE_DIR: join(repoRoot, "local-state", "socket,/tmp"),
    LNSAT_LOCAL_BETA_PORT: "55432",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /local_beta_db\.unsafe_state_dir/);
});

test("reset refuses symbolic links inside ignored repo local-state boundary", () => {
  const outside = `/tmp/lnsat-local-beta-${randomUUID()}`;
  const link = join(repoRoot, "local-state", `link-${randomUUID()}`);
  mkdirSync(outside, { recursive: false });
  symlinkSync(outside, link);
  try {
    const result = runCli("reset", {
      ...process.env,
      LNSAT_LOCAL_BETA_STATE_DIR: link,
      LNSAT_LOCAL_BETA_PORT: "55432",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /local_beta_db\.unsafe_state_dir/);
    assert.equal(existsSync(outside), true);
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("bootstrap refuses credential child symlink without touching target", () => {
  const stateDir = join(repoRoot, "local-state", `test-${randomUUID()}`);
  const outside = `/tmp/lnsat-local-beta-victim-${randomUUID()}`;
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(outside, "victim-content", { mode: 0o644 });
  symlinkSync(outside, join(stateDir, "connection.env"));
  try {
    const result = runCli("bootstrap", {
      ...process.env,
      LNSAT_LOCAL_BETA_STATE_DIR: stateDir,
      LNSAT_LOCAL_BETA_PORT: "55432",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /local_beta_db\.unsafe_state_child/);
    assert.equal(readFileSync(outside, "utf8"), "victim-content");
    assert.equal(statSync(outside).mode & 0o777, 0o644);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});

function executionScenarioSql(
  suffix,
  {
    packetDigest,
    executionDigest = packetDigest,
    packetStatus = "approved",
    startedAt = "2026-07-13T20:05:00.000Z",
    packetCreatedAt = "2026-07-13T20:00:00.000Z",
    approvalRequestedAt = "2026-07-13T20:00:00.000Z",
    approvalDecidedAt = "2026-07-13T20:04:00.000Z",
    expiresAt = "2099-07-13T21:00:00.000Z",
    afterInsertSql = "",
  },
) {
  const packetId = `pkt_bp0871_${suffix}`;
  const approvalId = `apr_bp0871_${suffix}`;
  const executionId = `exe_bp0871_${suffix}`;
  return `BEGIN;
    INSERT INTO control_plane_packets (
      packet_id, canonical_input_digest, packet_body, policy_decision,
      workflow_status, source_refs, created_at, expires_at, updated_at
    ) VALUES (
      '${packetId}', '${packetDigest}', '{"synthetic":true}',
      '{"decision":"approval_required"}', '${packetStatus}',
      '["packet:BP-0871"]', '${packetCreatedAt}',
      '${expiresAt}', '${approvalDecidedAt}'
    );
    INSERT INTO control_plane_approvals (
      approval_id, packet_id, approval_status, requested_by, decided_by,
      reason_codes, requested_at, decided_at, expires_at
    ) VALUES (
      '${approvalId}', '${packetId}', 'approved', 'operator.local.synthetic',
      'operator.local.synthetic', '[]', '${approvalRequestedAt}',
      '${approvalDecidedAt}', '${expiresAt}'
    );
    INSERT INTO control_plane_executions (
      execution_id, packet_id, approval_id, approval_status, adapter_ref,
      execution_status, input_digest, started_at
    ) VALUES (
      '${executionId}', '${packetId}', '${approvalId}', 'approved',
      'adapter.local.synthetic_deterministic.v0_1', 'running',
      '${executionDigest}', '${startedAt}'
    );
    ${afterInsertSql}
    ROLLBACK;`;
}

function runCli(command, env) {
  return spawnSync(process.execPath, [script, command], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
}

function psql(env, password, sql) {
  return spawnSync(
    findTool("psql"),
    [
      "--no-psqlrc",
      "--no-password",
      "--host",
      "127.0.0.1",
      "--port",
      env.LNSAT_LOCAL_BETA_PORT,
      "--username",
      "lnsat_local",
      "--dbname",
      "lnsat_local_beta",
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--quiet",
      "--command",
      sql,
    ],
    {
      cwd: repoRoot,
      env: { ...env, PGPASSWORD: password },
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      shell: false,
    },
  );
}

function query(env, password, sql) {
  const result = psql(env, password, sql);
  assert.equal(result.status, 0, safeFailure(result));
  return result.stdout.trim();
}

function findTool(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const candidate = join(directory, name);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Missing test dependency: ${name}`);
}

function safeFailure(result) {
  return `process failed with status ${String(result.status)}; raw output withheld`;
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
