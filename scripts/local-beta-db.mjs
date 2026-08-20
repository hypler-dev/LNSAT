#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import {
  accessSync,
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeSync,
} from "node:fs";
import { delimiter, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const allowedStateRoot = join(repoRoot, "local-state");
const stateDir = resolve(
  process.env.LNSAT_LOCAL_BETA_STATE_DIR ?? join(allowedStateRoot, "beta"),
);
const dataDir = join(stateDir, "postgres-data");
const passwordFile = join(stateDir, "postgres.password");
const operatorCredentialFile = join(stateDir, "operator.credential");
const connectionEnvFile = join(stateDir, "connection.env");
const logFile = join(stateDir, "postgres.log");
const host = "127.0.0.1";
const port = validatePort(process.env.LNSAT_LOCAL_BETA_PORT ?? "55432");
const database = "lnsat_local_beta";
const user = "lnsat_local";
const noFollow = constants.O_NOFOLLOW;

if (typeof noFollow !== "number" || noFollow === 0) {
  throw new Error("Secure no-follow file operations are unavailable.");
}

const requiredLocalSchemaConstraints = [
  "control_plane_approvals_actor_bounds",
  "control_plane_approvals_binding_unique",
  "control_plane_approvals_decision_shape",
  "control_plane_approvals_id_shape",
  "control_plane_approvals_packet_fk",
  "control_plane_approvals_packet_unique",
  "control_plane_approvals_pkey",
  "control_plane_approvals_reasons_array",
  "control_plane_approvals_status_known",
  "control_plane_approvals_time_order",
  "control_plane_approvals_version_positive",
  "control_plane_executions_adapter_bound",
  "control_plane_executions_approval_binding_fk",
  "control_plane_executions_approval_unique",
  "control_plane_executions_approved_only",
  "control_plane_executions_completion_shape",
  "control_plane_executions_digest_shape",
  "control_plane_executions_id_shape",
  "control_plane_executions_packet_unique",
  "control_plane_executions_pkey",
  "control_plane_executions_result_object",
  "control_plane_executions_side_effects_array",
  "control_plane_executions_status_known",
  "control_plane_executions_time_order",
  "control_plane_packets_body_object",
  "control_plane_packets_digest_shape",
  "control_plane_packets_id_shape",
  "control_plane_packets_pkey",
  "control_plane_packets_policy_object",
  "control_plane_packets_raw_withheld",
  "control_plane_packets_side_effects_array",
  "control_plane_packets_sources_non_empty",
  "control_plane_packets_status_known",
  "control_plane_packets_time_order",
  "control_plane_packets_version_positive",
  "local_operators_capabilities_non_empty",
  "local_operators_digest_shape",
  "local_operators_disable_order",
  "local_operators_id_shape",
  "local_operators_pkey",
  "local_operators_raw_withheld",
  "local_operators_version_positive",
  "local_packet_approval_requests_action_fixed",
  "local_packet_approval_requests_decision_shape",
  "local_packet_approval_requests_digest_shape",
  "local_packet_approval_requests_id_shape",
  "local_packet_approval_requests_operator_fk",
  "local_packet_approval_requests_operator_shape",
  "local_packet_approval_requests_packet_id_key",
  "local_packet_approval_requests_packet_shape",
  "local_packet_approval_requests_pkey",
  "local_packet_approval_requests_policy_decision_id_key",
  "local_packet_approval_requests_policy_fk",
  "local_packet_approval_requests_policy_required",
  "local_packet_approval_requests_raw_withheld",
  "local_packet_approval_requests_reasons_array",
  "local_packet_approval_requests_session_fk",
  "local_packet_approval_requests_session_shape",
  "local_packet_approval_requests_side_effects_empty",
  "local_packet_approval_requests_status_pending",
  "local_packet_approval_requests_version_fixed",
  "local_packet_intakes_body_binding",
  "local_packet_intakes_body_object",
  "local_packet_intakes_digest_shape",
  "local_packet_intakes_digest_binding_unique",
  "local_packet_intakes_id_shape",
  "local_packet_intakes_operator_fk",
  "local_packet_intakes_operator_shape",
  "local_packet_intakes_pkey",
  "local_packet_intakes_raw_withheld",
  "local_packet_intakes_session_fk",
  "local_packet_intakes_session_shape",
  "local_packet_intakes_side_effects_empty",
  "local_packet_intakes_status_known",
  "local_packet_intakes_synthetic_only",
  "local_packet_intakes_type_known",
  "local_packet_intakes_version_fixed",
  "local_packet_policy_decisions_approval_binding",
  "local_packet_policy_decisions_body_binding",
  "local_packet_policy_decisions_body_object",
  "local_packet_policy_decisions_digest_shape",
  "local_packet_policy_decisions_id_shape",
  "local_packet_policy_decisions_kind_known",
  "local_packet_policy_decisions_operator_fk",
  "local_packet_policy_decisions_operator_shape",
  "local_packet_policy_decisions_packet_digest_fk",
  "local_packet_policy_decisions_packet_id_key",
  "local_packet_policy_decisions_packet_id_shape",
  "local_packet_policy_decisions_pkey",
  "local_packet_policy_decisions_raw_withheld",
  "local_packet_policy_decisions_reasons_array",
  "local_packet_policy_decisions_session_fk",
  "local_packet_policy_decisions_session_shape",
  "local_packet_policy_decisions_side_effects_empty",
  "local_packet_policy_decisions_time_order",
  "local_packet_policy_decisions_version_fixed",
  "local_policy_decisions_approval_request_key",
  "local_sessions_capabilities_non_empty",
  "local_sessions_digest_shape",
  "local_sessions_id_shape",
  "local_sessions_operator_fk",
  "local_sessions_pkey",
  "local_sessions_proof_digest_shape",
  "local_sessions_raw_withheld",
  "local_sessions_time_order",
  "local_sessions_token_unique",
  "local_sessions_version_positive",
].sort();
const localSchemaCatalogFingerprint =
  "bb9deba793fdfa1d7aa7d01fc5873d4c9cb61ff842f0793b1b448c8e7a5e53a1";
const localSchemaCatalogSql = `SELECT COALESCE(
  jsonb_agg(definition ORDER BY definition::text),
  '[]'::jsonb
)::text
FROM (
  SELECT jsonb_build_object(
    'kind', 'constraint',
    'table', conrelid::regclass::text,
    'name', conname,
    'definition', pg_get_constraintdef(oid, true)
  ) AS definition
  FROM pg_constraint
  WHERE conrelid IN (
    'control_plane_packets'::regclass,
    'control_plane_approvals'::regclass,
    'control_plane_executions'::regclass,
    'local_operators'::regclass,
    'local_sessions'::regclass,
    'local_packet_intakes'::regclass,
    'local_packet_policy_decisions'::regclass,
    'local_packet_approval_requests'::regclass
  )
  UNION ALL
  SELECT jsonb_build_object(
    'kind', 'trigger',
    'table', tgrelid::regclass::text,
    'name', tgname,
    'enabled', tgenabled,
    'definition', pg_get_triggerdef(oid, true)
  )
  FROM pg_trigger
  WHERE tgrelid IN (
      'control_plane_executions'::regclass,
      'local_packet_intakes'::regclass,
      'local_packet_policy_decisions'::regclass,
      'local_packet_approval_requests'::regclass
    )
    AND NOT tgisinternal
  UNION ALL
  SELECT jsonb_build_object(
    'kind', 'function',
    'name', proname,
    'definition', pg_get_functiondef(oid)
  )
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN (
      'enforce_control_plane_execution_authorization',
      'enforce_local_packet_intake_authorization',
      'reject_local_packet_intake_mutation',
      'enforce_local_packet_policy_decision_authorization',
      'reject_local_packet_policy_decision_mutation',
      'enforce_local_packet_approval_request_authorization',
      'reject_local_packet_approval_request_mutation'
    )
  UNION ALL
  SELECT jsonb_build_object(
    'kind', 'index',
    'name', indexname,
    'definition', indexdef
  )
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'local_sessions_operator_id_idx',
      'local_sessions_active_expiry_idx',
      'local_packet_intakes_operator_id_idx',
      'local_packet_intakes_session_id_idx',
      'local_packet_policy_decisions_kind_idx',
      'local_packet_policy_decisions_operator_id_idx',
      'local_packet_approval_requests_operator_idx',
      'local_packet_approval_requests_status_idx'
    )
) AS definitions;`;

const migrations = [
  {
    id: "audit-events-postgresql-0001-v0-1",
    path: join(
      repoRoot,
      "packages/audit/migrations/postgresql/0001_audit_events_v0_1.sql",
    ),
  },
  {
    id: "local-control-plane-postgresql-0001-v0-1",
    path: join(
      repoRoot,
      "apps/api/migrations/postgresql/0001_local_control_plane_v0_1.sql",
    ),
  },
  {
    id: "local-sessions-postgresql-0002-v0-1",
    path: join(repoRoot, "apps/api/migrations/postgresql/0002_local_sessions_v0_1.sql"),
  },
  {
    id: "local-packet-intake-postgresql-0003-v0-1",
    path: join(
      repoRoot,
      "apps/api/migrations/postgresql/0003_local_packet_intake_v0_1.sql",
    ),
  },
  {
    id: "local-packet-policy-decisions-postgresql-0004-v0-1",
    path: join(
      repoRoot,
      "apps/api/migrations/postgresql/0004_local_packet_policy_decisions_v0_1.sql",
    ),
  },
  {
    id: "local-packet-approval-requests-postgresql-0005-v0-1",
    path: join(
      repoRoot,
      "apps/api/migrations/postgresql/0005_local_packet_approval_requests_v0_1.sql",
    ),
  },
];

class LocalBetaDbError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LocalBetaDbError";
    this.code = code;
  }
}

function validateStateDir(candidate) {
  if (
    pathEntryExists(allowedStateRoot) &&
    lstatSync(allowedStateRoot).isSymbolicLink()
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.unsafe_state_root",
      "Repo local-state root must not be a symbolic link.",
    );
  }
  const rel = relative(allowedStateRoot, candidate);
  if (
    candidate === allowedStateRoot ||
    rel === "" ||
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    rel.split(sep).some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.invalid_state_dir",
      "State directory must be a child of repo local-state/.",
    );
  }
  if (rel.split(sep).some((part) => !/^[A-Za-z0-9._-]+$/.test(part))) {
    throw new LocalBetaDbError(
      "local_beta_db.unsafe_state_dir",
      "State directory segments may use only letters, numbers, dot, underscore, and hyphen.",
    );
  }

  let current = allowedStateRoot;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new LocalBetaDbError(
        "local_beta_db.unsafe_state_dir",
        "State directory must not traverse symbolic links.",
      );
    }
  }
  return candidate;
}

function pathEntryExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function validateStateChildren() {
  for (const child of [
    dataDir,
    passwordFile,
    operatorCredentialFile,
    connectionEnvFile,
    logFile,
  ]) {
    if (pathEntryExists(child) && lstatSync(child).isSymbolicLink()) {
      throw new LocalBetaDbError(
        "local_beta_db.unsafe_state_child",
        "Local beta state files and directories must not be symbolic links.",
      );
    }
  }
}

function readSecureFile(path) {
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | noFollow);
    if (!fstatSync(descriptor).isFile()) {
      throw new LocalBetaDbError(
        "local_beta_db.unsafe_state_child",
        "Local beta credential path must be a regular file.",
      );
    }
    return readFileSync(descriptor, "utf8");
  } catch (error) {
    if (error instanceof LocalBetaDbError) throw error;
    throw new LocalBetaDbError(
      "local_beta_db.unsafe_state_child",
      "Local beta credential file could not be opened securely.",
    );
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function writeSecureFile(path, content, exclusive = false) {
  let descriptor;
  try {
    const flags =
      constants.O_WRONLY |
      constants.O_CREAT |
      noFollow |
      (exclusive ? constants.O_EXCL : constants.O_TRUNC);
    descriptor = openSync(path, flags, 0o600);
    if (!fstatSync(descriptor).isFile()) {
      throw new LocalBetaDbError(
        "local_beta_db.unsafe_state_child",
        "Local beta credential path must be a regular file.",
      );
    }
    fchmodSync(descriptor, 0o600);
    writeSync(descriptor, content, undefined, "utf8");
  } catch (error) {
    if (error instanceof LocalBetaDbError) throw error;
    throw new LocalBetaDbError(
      "local_beta_db.unsafe_state_child",
      "Local beta credential file could not be written securely.",
    );
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function validatePort(value) {
  if (!/^\d{1,5}$/.test(value)) {
    throw new LocalBetaDbError("local_beta_db.invalid_port", "Port must be numeric.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new LocalBetaDbError(
      "local_beta_db.invalid_port",
      "Port must be between 1024 and 65535.",
    );
  }
  return parsed;
}

function findTool(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (directory.length === 0) continue;
    const candidate = join(directory, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try next PATH entry.
    }
  }
  throw new LocalBetaDbError(
    "local_beta_db.postgresql_tool_missing",
    `Required PostgreSQL utility is unavailable: ${name}.`,
  );
}

function runTool(name, args, options = {}) {
  const result = spawnSync(findTool(name), args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(pathEntryExists(passwordFile)
        ? { PGPASSWORD: readSecureFile(passwordFile).trim() }
        : {}),
    },
    input: options.input,
    maxBuffer: 4 * 1024 * 1024,
    shell: false,
  });

  if (options.allowFailure === true) return result;
  if (result.error !== undefined || result.status !== 0) {
    throw new LocalBetaDbError(
      `local_beta_db.${name}_failed`,
      `PostgreSQL utility failed: ${name}. Raw utility output withheld.`,
    );
  }
  return result;
}

function ensureStateDirectory() {
  mkdirSync(allowedStateRoot, { recursive: true, mode: 0o700 });
  if (lstatSync(allowedStateRoot).isSymbolicLink()) {
    throw new LocalBetaDbError(
      "local_beta_db.unsafe_state_root",
      "Repo local-state root must not be a symbolic link.",
    );
  }
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  chmodSync(stateDir, 0o700);
}

function ensureCredential() {
  validateStateChildren();
  if (existsSync(join(dataDir, "PG_VERSION")) && !pathEntryExists(passwordFile)) {
    throw new LocalBetaDbError(
      "local_beta_db.credential_missing",
      "Existing cluster credential is missing; use guarded reset.",
    );
  }
  if (!pathEntryExists(passwordFile)) {
    writeSecureFile(passwordFile, `${randomBytes(32).toString("base64url")}\n`, true);
  }
  if (!pathEntryExists(operatorCredentialFile)) {
    writeSecureFile(
      operatorCredentialFile,
      `${randomBytes(32).toString("base64url")}\n`,
      true,
    );
  }

  const password = readSecureFile(passwordFile).trim();
  const url = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  writeSecureFile(
    connectionEnvFile,
    `LNSAT_LOCAL_BETA_DATABASE_URL=${url}\nLNSAT_LOCAL_OPERATOR_CREDENTIAL_FILE=${operatorCredentialFile}\n`,
  );
}

function initializeCluster() {
  if (existsSync(join(dataDir, "PG_VERSION"))) return;
  runTool("initdb", [
    "--pgdata",
    dataDir,
    "--username",
    user,
    "--pwfile",
    passwordFile,
    "--auth-local=trust",
    "--auth-host=scram-sha-256",
    "--encoding=UTF8",
    "--locale=C",
  ]);
}

function clusterRunning() {
  if (!existsSync(join(dataDir, "PG_VERSION"))) return false;
  return (
    runTool("pg_ctl", ["--pgdata", dataDir, "status"], { allowFailure: true })
      .status === 0
  );
}

function startCluster() {
  if (clusterRunning()) return;
  const socketDirectory = stateDir;
  if (/\s/.test(socketDirectory)) {
    throw new LocalBetaDbError(
      "local_beta_db.unsafe_state_dir",
      "State directory cannot contain whitespace.",
    );
  }
  if (!pathEntryExists(logFile)) writeSecureFile(logFile, "", true);
  runTool("pg_ctl", [
    "--pgdata",
    dataDir,
    "--log",
    logFile,
    "--wait",
    "--timeout=30",
    "--options",
    `-h ${host} -p ${port} -c listen_addresses=${host} -c unix_socket_directories=${socketDirectory}`,
    "start",
  ]);
}

function stopCluster() {
  if (!clusterRunning()) return;
  runTool("pg_ctl", [
    "--pgdata",
    dataDir,
    "--wait",
    "--timeout=30",
    "--mode=fast",
    "stop",
  ]);
}

function psqlResult(
  sql,
  targetDatabase = database,
  input,
  { allowFailure = false } = {},
) {
  const args = [
    "--no-psqlrc",
    "--no-password",
    "--host",
    host,
    "--port",
    String(port),
    "--username",
    user,
    "--dbname",
    targetDatabase,
    "--set",
    "ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    "--quiet",
  ];
  if (input === undefined) args.push("--command", sql);
  else args.push("--file=-");
  return runTool("psql", args, { allowFailure, input });
}

function psql(sql, targetDatabase = database, input) {
  return psqlResult(sql, targetDatabase, input).stdout.trim();
}

function ensureDatabase() {
  const exists = psql(
    `SELECT 1 FROM pg_database WHERE datname = ${sqlLiteral(database)};`,
    "postgres",
  );
  if (exists === "1") return;
  runTool("createdb", [
    "--no-password",
    "--host",
    host,
    "--port",
    String(port),
    "--username",
    user,
    database,
  ]);
}

function ensureMigrationLedger() {
  psql(`CREATE TABLE IF NOT EXISTS lnsat_schema_migrations (
    migration_id text PRIMARY KEY,
    file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
    applied_at timestamptz NOT NULL DEFAULT now()
  );`);
}

function applyMigrations() {
  ensureMigrationLedger();
  for (const migration of migrations) {
    const sql = readFileSync(migration.path, "utf8");
    const digest = createHash("sha256").update(sql).digest("hex");
    const existing = psql(
      `SELECT file_sha256 FROM lnsat_schema_migrations WHERE migration_id = ${sqlLiteral(migration.id)};`,
    );
    if (existing.length > 0) {
      if (existing !== digest) {
        throw new LocalBetaDbError(
          "local_beta_db.migration_digest_mismatch",
          `Applied migration digest mismatch: ${migration.id}.`,
        );
      }
      continue;
    }

    const transaction = `BEGIN;\n${sql}\nINSERT INTO lnsat_schema_migrations (migration_id, file_sha256) VALUES (${sqlLiteral(migration.id)}, ${sqlLiteral(digest)});\nCOMMIT;\n`;
    psql("", database, transaction);
  }
}

function ensureLocalOperator() {
  const credential = readSecureFile(operatorCredentialFile).trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(credential)) {
    throw new LocalBetaDbError(
      "local_beta_db.operator_credential_invalid",
      "Local operator credential has invalid committed bounds.",
    );
  }
  const digest = `sha256:${createHash("sha256").update(credential).digest("hex")}`;
  psql(`INSERT INTO local_operators (
      operator_id, credential_digest, capabilities
    ) VALUES (
      'operator.local.synthetic',
      ${sqlLiteral(digest)},
      '["control_plane.operator","control_plane.packet.approval.request","control_plane.packet.policy.evaluate","control_plane.packet.submit"]'::jsonb
    ) ON CONFLICT (operator_id) DO UPDATE
      SET credential_digest = EXCLUDED.credential_digest,
          capabilities = EXCLUDED.capabilities,
          row_version = local_operators.row_version + 1
      WHERE local_operators.credential_digest IS DISTINCT FROM EXCLUDED.credential_digest
         OR local_operators.capabilities IS DISTINCT FROM EXCLUDED.capabilities;`);
}

function verify() {
  if (!clusterRunning()) {
    throw new LocalBetaDbError(
      "local_beta_db.not_running",
      "Local beta PostgreSQL cluster is not running.",
    );
  }
  const listenAddresses = psql("SHOW listen_addresses;");
  const configuredPort = psql("SHOW port;");
  const socketDirectories = psql("SHOW unix_socket_directories;");
  if (
    listenAddresses !== host ||
    configuredPort !== String(port) ||
    socketDirectories !== stateDir
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.non_loopback_configuration",
      "PostgreSQL must use only configured loopback host, port, and protected socket directory.",
    );
  }

  const tableCount = psql(`SELECT count(*) FROM pg_class
    WHERE relkind = 'r'
      AND relnamespace = 'public'::regnamespace
      AND relname IN (
        'audit_events',
        'control_plane_packets',
        'control_plane_approvals',
        'control_plane_executions',
        'local_operators',
        'local_sessions',
        'local_packet_intakes',
        'local_packet_policy_decisions',
        'local_packet_approval_requests',
        'lnsat_schema_migrations'
      );`);
  if (tableCount !== "10") {
    throw new LocalBetaDbError(
      "local_beta_db.schema_incomplete",
      "Local beta PostgreSQL schema is incomplete.",
    );
  }

  const migrationCount = psql("SELECT count(*) FROM lnsat_schema_migrations;");
  if (migrationCount !== String(migrations.length)) {
    throw new LocalBetaDbError(
      "local_beta_db.migration_ledger_incomplete",
      "Local beta migration ledger is incomplete.",
    );
  }
  for (const migration of migrations) {
    const expected = createHash("sha256")
      .update(readFileSync(migration.path, "utf8"))
      .digest("hex");
    const actual = psql(
      `SELECT file_sha256 FROM lnsat_schema_migrations WHERE migration_id = ${sqlLiteral(migration.id)};`,
    );
    if (actual !== expected) {
      throw new LocalBetaDbError(
        "local_beta_db.migration_digest_mismatch",
        `Migration verification failed: ${migration.id}.`,
      );
    }
  }

  const installedConstraints = psql(`SELECT conname
    FROM pg_constraint
    WHERE conrelid IN (
      'control_plane_packets'::regclass,
      'control_plane_approvals'::regclass,
      'control_plane_executions'::regclass,
      'local_operators'::regclass,
      'local_sessions'::regclass,
      'local_packet_intakes'::regclass,
      'local_packet_policy_decisions'::regclass,
      'local_packet_approval_requests'::regclass
    )
    ORDER BY conname;`)
    .split("\n")
    .filter((value) => value.length > 0);
  if (
    installedConstraints.length !== requiredLocalSchemaConstraints.length ||
    installedConstraints.some(
      (constraint, index) => constraint !== requiredLocalSchemaConstraints[index],
    )
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.schema_constraints_invalid",
      "Local beta PostgreSQL schema constraints are incomplete or unexpected.",
    );
  }
  const installedCatalogFingerprint = createHash("sha256")
    .update(psql(localSchemaCatalogSql))
    .digest("hex");
  if (installedCatalogFingerprint !== localSchemaCatalogFingerprint) {
    throw new LocalBetaDbError(
      "local_beta_db.schema_definition_mismatch",
      "Local beta PostgreSQL schema definitions do not match committed truth.",
    );
  }

  if ((statSync(passwordFile).mode & 0o777) !== 0o600) {
    throw new LocalBetaDbError(
      "local_beta_db.credential_permissions_invalid",
      "Credential file must use owner-only permissions.",
    );
  }
  if ((statSync(operatorCredentialFile).mode & 0o777) !== 0o600) {
    throw new LocalBetaDbError(
      "local_beta_db.operator_credential_permissions_invalid",
      "Operator credential file must use owner-only permissions.",
    );
  }
  if ((statSync(connectionEnvFile).mode & 0o777) !== 0o600) {
    throw new LocalBetaDbError(
      "local_beta_db.connection_permissions_invalid",
      "Connection file must use owner-only permissions.",
    );
  }

  const operatorCredential = readSecureFile(operatorCredentialFile).trim();
  const operatorDigest = `sha256:${createHash("sha256")
    .update(operatorCredential)
    .digest("hex")}`;
  if (
    psql(
      `SELECT credential_digest FROM local_operators WHERE operator_id = 'operator.local.synthetic';`,
    ) !== operatorDigest
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.operator_digest_mismatch",
      "Local operator credential digest does not match disposable storage.",
    );
  }
  if (
    psql(
      `SELECT capabilities::text FROM local_operators WHERE operator_id = 'operator.local.synthetic';`,
    ) !==
    '["control_plane.operator", "control_plane.packet.approval.request", "control_plane.packet.policy.evaluate", "control_plane.packet.submit"]'
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.operator_capabilities_mismatch",
      "Local operator capabilities do not match committed synthetic beta scope.",
    );
  }

  psql(`BEGIN;
    INSERT INTO control_plane_packets (
      packet_id, canonical_input_digest, packet_body, policy_decision,
      workflow_status, source_refs, created_at, expires_at, updated_at
    ) VALUES (
      'pkt_bp0871_schema_probe',
      'sha256:${"0".repeat(64)}',
      '{"synthetic":true}'::jsonb,
      '{"decision":"approval_required"}'::jsonb,
      'approval_required',
      '["packet:BP-0871"]'::jsonb,
      '2026-07-13T20:00:00.000Z',
      '2026-07-13T21:00:00.000Z',
      '2026-07-13T20:00:00.000Z'
    );
    INSERT INTO control_plane_approvals (
      approval_id, packet_id, approval_status, requested_by, reason_codes,
      requested_at, expires_at
    ) VALUES (
      'apr_bp0871_schema_probe',
      'pkt_bp0871_schema_probe',
      'requested',
      'operator.local.synthetic',
      '["policy.packet_requires_approval"]'::jsonb,
      '2026-07-13T20:00:00.000Z',
      '2026-07-13T21:00:00.000Z'
    );
    ROLLBACK;`);

  const authorizationProbe = psqlResult(
    `BEGIN;
      INSERT INTO control_plane_packets (
        packet_id, canonical_input_digest, packet_body, policy_decision,
        workflow_status, source_refs, created_at, expires_at, updated_at
      ) VALUES (
        'pkt_bp0871_authorization_probe',
        'sha256:${"a".repeat(64)}',
        '{"synthetic":true}'::jsonb,
        '{"decision":"approved"}'::jsonb,
        'approved',
        '["packet:BP-0871"]'::jsonb,
        '2026-07-13T20:00:00.000Z',
        '2099-07-13T21:00:00.000Z',
        '2026-07-13T20:04:00.000Z'
      );
      INSERT INTO control_plane_approvals (
        approval_id, packet_id, approval_status, requested_by, decided_by,
        reason_codes, requested_at, decided_at, expires_at
      ) VALUES (
        'apr_bp0871_authorization_probe',
        'pkt_bp0871_authorization_probe',
        'approved',
        'operator.local.synthetic',
        'operator.local.synthetic',
        '[]'::jsonb,
        '2026-07-13T20:00:00.000Z',
        '2026-07-13T20:04:00.000Z',
        '2099-07-13T21:00:00.000Z'
      );
      INSERT INTO control_plane_executions (
        execution_id, packet_id, approval_id, approval_status, adapter_ref,
        execution_status, input_digest, started_at
      ) VALUES (
        'exe_bp0871_authorization_probe',
        'pkt_bp0871_authorization_probe',
        'apr_bp0871_authorization_probe',
        'approved',
        'adapter.local.synthetic_deterministic.v0_1',
        'running',
        'sha256:${"b".repeat(64)}',
        '2026-07-13T20:05:00.000Z'
      );
      ROLLBACK;`,
    database,
    undefined,
    { allowFailure: true },
  );
  if (
    authorizationProbe.status === 0 ||
    !authorizationProbe.stderr.includes("execution authorization binding rejected")
  ) {
    throw new LocalBetaDbError(
      "local_beta_db.schema_authorization_probe_failed",
      "Local beta PostgreSQL execution authorization enforcement failed.",
    );
  }

  return {
    host,
    port,
    state_dir: stateDir,
    migration_count: migrations.length,
  };
}

function bootstrap() {
  ensureStateDirectory();
  ensureCredential();
  initializeCluster();
  startCluster();
  ensureDatabase();
  applyMigrations();
  ensureLocalOperator();
  return verify();
}

function status() {
  if (!existsSync(join(dataDir, "PG_VERSION"))) return "not_initialized";
  return clusterRunning() ? "running" : "stopped";
}

function reset() {
  validateStateDir(stateDir);
  stopCluster();
  if (existsSync(stateDir)) rmSync(stateDir, { recursive: true, force: false });
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function printReady(result) {
  process.stdout.write(
    [
      "local_beta_db=ready",
      `host=${result.host}`,
      `port=${result.port}`,
      `migrations=${result.migration_count}`,
      `state_dir=${result.state_dir}`,
      `connection_env=${connectionEnvFile}`,
      `operator_credential_file=${operatorCredentialFile}`,
    ].join("\n") + "\n",
  );
}

function main(command) {
  validateStateDir(stateDir);
  validateStateChildren();
  switch (command) {
    case "bootstrap":
      printReady(bootstrap());
      return;
    case "restart":
      stopCluster();
      printReady(bootstrap());
      return;
    case "status":
      process.stdout.write(`local_beta_db=${status()}\n`);
      return;
    case "stop":
      stopCluster();
      process.stdout.write(`local_beta_db=${status()}\n`);
      return;
    case "verify":
      printReady(verify());
      return;
    case "reset":
      reset();
      process.stdout.write("local_beta_db=reset\n");
      return;
    default:
      throw new LocalBetaDbError(
        "local_beta_db.invalid_command",
        "Command must be bootstrap, restart, status, stop, verify, or reset.",
      );
  }
}

try {
  main(process.argv[2]);
} catch (error) {
  const safe =
    error instanceof LocalBetaDbError
      ? error
      : new LocalBetaDbError(
          "local_beta_db.unexpected_failure",
          "Local beta database command failed. Raw error withheld.",
        );
  process.stderr.write(`${safe.code}: ${safe.message}\n`);
  process.exitCode = 1;
}
