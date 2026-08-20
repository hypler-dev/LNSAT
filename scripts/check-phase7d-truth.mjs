import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const [
  signer,
  operation,
  registry,
  identity,
  controlCenter,
  store,
  nonceStore,
  coreMigration,
  correctionMigration,
  postgresqlMigrations,
] = await Promise.all([
  source("packages/policy/src/signer-provider.ts"),
  source("packages/gateway/src/operation-recovery.ts"),
  source("packages/gateway/src/registry-supply-chain.ts"),
  source("packages/gateway/src/workload-identity.ts"),
  source("packages/gateway/src/control-center-readback.ts"),
  source("crates/lnsat-store/src/lib.rs"),
  source("crates/lnsat-store/src/phase7_nonce.rs"),
  source("crates/lnsat-store/migrations/0016_phase7_core_persistence.sql"),
  source("crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql"),
  readdir(join(repoRoot, "apps/api/migrations/postgresql")),
]);

includes(signer, 'P1_PUBLIC_TRUST_STATUS = "unset"');
includes(signer, "runtime_signing: false");
includes(signer, "provider_calls_enabled: false");
includes(signer, "key_generation_allowed: false");
includes(signer, "signer_activation_allowed: false");
includes(operation, '"outcome_unknown"');
includes(operation, '"reconciling"');
includes(operation, '"gateway.operation.idempotency_collision"');
includes(registry, "auto_install: false");
includes(registry, "auto_authorize: false");
includes(identity, "action_authorized: false");
includes(controlCenter, "runtime_connected: false");
includes(controlCenter, "frontend_can_authorize: false");
includes(store, "pub const SQLITE_SCHEMA_VERSION: i64 = 17;");
includes(store, 'id: "0016_phase7_core_persistence"');
includes(store, 'id: "0017_phase7_core_semantics_correction"');
includes(nonceStore, "pub const PHASE7_NONCE_BYTES_V1: usize = 32;");
includes(nonceStore, "pub const PHASE7_NONCE_TTL_SECONDS_V1: u64 = 300;");
includes(nonceStore, "getrandom::getrandom(bytes)");
includes(nonceStore, "Sha256::digest(raw_nonce.as_slice())");
includes(nonceStore, "hard_cap.min(attempt_expires)");
includes(nonceStore, 'matches!(terminal.state.as_str(), "cancelled" | "expired")');
includes(coreMigration, "PRAGMA user_version = 16;");
includes(correctionMigration, "PRAGMA user_version = 17;");
includes(correctionMigration, "existing_phase7_record_count = 0");
includes(correctionMigration, "verification_status = 'accepted'");
assert(
  !postgresqlMigrations.some((name) => name.startsWith("0016_")),
  "PostgreSQL migration 0016 exists.",
);
assert(
  !postgresqlMigrations.some((name) => name.startsWith("0017_")),
  "PostgreSQL migration 0017 exists.",
);

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    p1_public_trust_status: "unset",
    runtime_signing: false,
    provider_calls_enabled: false,
    sqlite_schema_version: 17,
    sqlite_migration_0016_present: true,
    sqlite_migration_0017_present: true,
    postgresql_migration_0016_present: false,
    postgresql_migration_0017_present: false,
    nonce_store_source_implemented: true,
    nonce_bytes: 32,
    nonce_ttl_seconds: 300,
    nonce_gateway_activated: false,
    registry_auto_authority: false,
    control_center_runtime_connected: false,
  })}\n`,
);

async function source(path) {
  return readFile(join(repoRoot, path), "utf8");
}

function includes(text, marker) {
  assert(text.includes(marker), `Missing Phase 7d truth marker: ${marker}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
