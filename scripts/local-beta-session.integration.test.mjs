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
  LOCAL_OPERATOR_CAPABILITY,
  createLocalControlPlaneSessionService,
  createPostgreSqlLocalSessionRepository,
} from "../apps/api/dist/index.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseScript = join(repoRoot, "scripts/local-beta-db.mjs");

test("real PostgreSQL session survives restart and revocation remains fail-closed", async () => {
  const stateDir = join(
    repoRoot,
    "local-state",
    `s-${randomUUID().replaceAll("-", "").slice(0, 12)}`,
  );
  const port = await freePort();
  const env = {
    ...process.env,
    LNSAT_LOCAL_BETA_STATE_DIR: stateDir,
    LNSAT_LOCAL_BETA_PORT: String(port),
  };
  let repository;
  try {
    assertCli(runCli("bootstrap", env));
    const connectionString = readConnectionString(stateDir);
    const credential = readFileSync(
      join(stateDir, "operator.credential"),
      "utf8",
    ).trim();
    const fixedNow = new Date("2026-07-14T01:00:00.000Z");

    repository = createPostgreSqlLocalSessionRepository(connectionString);
    let service = createLocalControlPlaneSessionService(repository, {
      now: () => fixedNow,
    });
    const issued = await service.issue(credential, 300);
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    assert.equal(
      (
        await service.authorize(
          issued.rawToken,
          issued.rawClientProof,
          LOCAL_OPERATOR_CAPABILITY,
        )
      ).ok,
      true,
    );
    const client = new Client({ connectionString });
    await client.connect();
    const persisted = await client.query(
      `SELECT token_digest, proof_digest, raw_token_content
       FROM local_sessions
       WHERE session_id = $1`,
      [issued.session.session_id],
    );
    assert.equal(persisted.rows[0]?.raw_token_content, "withheld");
    assert.match(persisted.rows[0]?.token_digest, /^sha256:[a-f0-9]{64}$/);
    assert.match(persisted.rows[0]?.proof_digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(persisted.rows[0]).includes(issued.rawToken), false);
    assert.equal(
      JSON.stringify(persisted.rows[0]).includes(issued.rawClientProof),
      false,
    );
    await client.query(
      `UPDATE local_operators
       SET disabled_at = statement_timestamp(), row_version = row_version + 1
       WHERE operator_id = 'operator.local.synthetic'`,
    );
    assert.deepEqual(await service.verify(issued.rawToken, issued.rawClientProof), {
      ok: false,
      code: "local_auth.invalid_session",
    });
    await client.query(
      `UPDATE local_operators
       SET disabled_at = NULL, row_version = row_version + 1
       WHERE operator_id = 'operator.local.synthetic'`,
    );
    assert.equal(
      (await service.verify(issued.rawToken, issued.rawClientProof)).ok,
      true,
    );
    await client.end();
    await repository.close();
    repository = undefined;

    assertCli(runCli("restart", env));
    repository = createPostgreSqlLocalSessionRepository(connectionString);
    service = createLocalControlPlaneSessionService(repository, {
      now: () => fixedNow,
    });
    assert.equal(
      (await service.verify(issued.rawToken, issued.rawClientProof)).ok,
      true,
    );
    assert.equal(
      (await service.revoke(issued.rawToken, issued.rawClientProof)).ok,
      true,
    );
    await repository.close();
    repository = undefined;

    assertCli(runCli("restart", env));
    repository = createPostgreSqlLocalSessionRepository(connectionString);
    service = createLocalControlPlaneSessionService(repository, {
      now: () => fixedNow,
    });
    assert.deepEqual(await service.verify(issued.rawToken, issued.rawClientProof), {
      ok: false,
      code: "local_auth.revoked_session",
    });
  } finally {
    if (repository !== undefined) await repository.close();
    runCli("reset", env);
  }
});

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
