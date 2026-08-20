import { readFileSync, readdirSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_EVIDENCE_PATH = "fixtures/contracts/phase7-local-v1-conformance-v1.json";

const EXPECTED_EVIDENCE_IDS = [
  "ts_rust_execution_request_parity",
  "authenticated_local_full_chain",
  "backup_restore_no_duplicate",
  "retention_preserve_only",
  "audit_health_fail_closed",
  "owner_readable_diagnostics",
  "bounded_connection_resources",
  "capacity_failure_rollback",
  "schema_17_migration_freeze",
  "local_lifecycle_runbook",
  "platform_filesystem_statement",
  "private_release_metadata",
];

const EXPECTED_NEGATIVE_IDS = [
  "binding_substitution",
  "expired_cancelled_revoked_authority",
  "duplicate_consequence_after_restore",
  "concurrent_double_consume",
  "fail_open_audit_write",
  "ambiguous_success",
  "adapter_storage_escape",
  "repository_hook_execution",
  "receipt_tamper",
  "unsupported_platform_claim",
  "hidden_signed_dependency",
  "implicit_data_purge",
];

const EXPECTED_VALIDATION_COMMANDS = [
  "npm run phase7:local-conformance:test",
  "npm run phase7:local-conformance:check",
  "npm run security:conformance:check",
  "npm run audit:migrations:check",
  "npm run security:review:check",
  "npm run phase7:readiness:check",
  "npm run source:check",
  "npm run audit:dependencies:check",
  "git diff --check",
];

const EXPECTED_EXCLUSIONS = [
  "runtime_or_public_adapter_wiring",
  "production_or_user_repository_execution",
  "migration_0018_or_signed_evidence",
  "postgresql_ha_fleet_or_multi_tenancy",
  "package_target_selection_or_artifact_build",
  "deployment_publication_or_production_write",
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function safePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    posix.normalize(value) !== value
  ) {
    return false;
  }
  return value.split("/").every((part) => part && part !== "." && part !== "..");
}

function exactKeys(value, expected, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path}: expected object`);
    return false;
  }
  if (!same(Object.keys(value), expected)) {
    errors.push(`${path}: keys or key order mismatch`);
    return false;
  }
  return true;
}

function readJson(path, errors) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`evidence: unable to parse ${path} (${String(error)})`);
    return null;
  }
}

function validateEvidenceRows(root, rows, expectedIds, withCommand, path, errors) {
  if (!Array.isArray(rows)) {
    errors.push(`${path}: expected array`);
    return;
  }
  const ids = rows.map((row) => row?.id);
  if (!same(ids, expectedIds)) {
    errors.push(`${path}: required ids or order mismatch`);
  }
  if (new Set(ids).size !== ids.length) {
    errors.push(`${path}: duplicate id`);
  }
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowPath = `${path}[${index}]`;
    const keys = withCommand
      ? ["id", "evidence_file", "evidence_marker", "command"]
      : ["id", "evidence_file", "evidence_marker"];
    if (!exactKeys(row, keys, rowPath, errors)) continue;
    if (!safePath(row.evidence_file)) {
      errors.push(`${rowPath}.evidence_file: unsafe path`);
      continue;
    }
    if (typeof row.evidence_marker !== "string" || row.evidence_marker.length === 0) {
      errors.push(`${rowPath}.evidence_marker: missing`);
      continue;
    }
    let source;
    try {
      source = readFileSync(resolve(root, row.evidence_file), "utf8");
    } catch (error) {
      errors.push(`${rowPath}.evidence_file: unreadable (${String(error)})`);
      continue;
    }
    if (!source.includes(row.evidence_marker)) {
      errors.push(`${rowPath}: evidence marker missing from ${row.evidence_file}`);
    }
    if (
      withCommand &&
      (typeof row.command !== "string" || !row.command.startsWith("npm "))
    ) {
      errors.push(`${rowPath}.command: must be npm command`);
    }
  }
}

export function validatePhase7LocalConformance({
  root = REPO_ROOT,
  evidencePath = resolve(root, DEFAULT_EVIDENCE_PATH),
} = {}) {
  const errors = [];
  const evidence = readJson(evidencePath, errors);
  if (
    !exactKeys(
      evidence,
      [
        "schema_version",
        "packet_id",
        "freeze_status",
        "scope",
        "platform_profile",
        "evidence_rows",
        "required_negatives",
        "validation_commands",
        "explicit_exclusions",
        "side_effects",
      ],
      "evidence",
      errors,
    )
  ) {
    return { ok: false, errors };
  }

  if (evidence.schema_version !== "lnsat.phase7_local_v1_conformance.v1")
    errors.push("evidence.schema_version: mismatch");
  if (evidence.packet_id !== "P7-X1") errors.push("evidence.packet_id: must be P7-X1");
  if (evidence.freeze_status !== "complete")
    errors.push("evidence.freeze_status: must be complete");

  if (
    exactKeys(
      evidence.scope,
      [
        "source_only",
        "new_runtime_features",
        "runtime_authority_opened",
        "publication_authorized",
        "deployment_authorized",
        "signed_evidence_required",
        "enterprise_topology_required",
      ],
      "evidence.scope",
      errors,
    )
  ) {
    if (evidence.scope.source_only !== true)
      errors.push("evidence.scope.source_only: true required");
    for (const key of Object.keys(evidence.scope).filter(
      (key) => key !== "source_only",
    )) {
      if (evidence.scope[key] !== false)
        errors.push(`evidence.scope.${key}: false required`);
    }
  }

  if (
    exactKeys(
      evidence.platform_profile,
      [
        "profile_id",
        "operating_system",
        "architecture",
        "filesystem",
        "support_level",
        "ci_portability_profile",
        "distribution_artifact_supported",
      ],
      "evidence.platform_profile",
      errors,
    )
  ) {
    const expected = {
      profile_id: "macos-26-arm64-apfs-source-conformance",
      operating_system: "macOS 26",
      architecture: "arm64",
      filesystem: "APFS",
      support_level: "development_source_conformance_only",
      ci_portability_profile: "Ubuntu 24.04 x86_64 source gates",
      distribution_artifact_supported: false,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (evidence.platform_profile[key] !== value)
        errors.push(`evidence.platform_profile.${key}: mismatch`);
    }
  }

  validateEvidenceRows(
    root,
    evidence.evidence_rows,
    EXPECTED_EVIDENCE_IDS,
    true,
    "evidence.evidence_rows",
    errors,
  );
  validateEvidenceRows(
    root,
    evidence.required_negatives,
    EXPECTED_NEGATIVE_IDS,
    false,
    "evidence.required_negatives",
    errors,
  );

  if (!same(evidence.validation_commands, EXPECTED_VALIDATION_COMMANDS))
    errors.push("evidence.validation_commands: mismatch");
  if (!same(evidence.explicit_exclusions, EXPECTED_EXCLUSIONS))
    errors.push("evidence.explicit_exclusions: mismatch");
  if (!Array.isArray(evidence.side_effects) || evidence.side_effects.length !== 0)
    errors.push("evidence.side_effects: must equal []");

  const packageJson = readJson(resolve(root, "package.json"), errors);
  if (packageJson) {
    if (
      packageJson.scripts?.["phase7:local-conformance:test"] !==
      "node --test scripts/check-phase7-local-conformance.test.mjs && node scripts/run-rust-workspace.mjs phase7-local-conformance"
    ) {
      errors.push("package.json: phase7 local conformance test command mismatch");
    }
    if (
      packageJson.scripts?.["phase7:local-conformance:check"] !==
      "node scripts/check-phase7-local-conformance.mjs"
    ) {
      errors.push("package.json: phase7 local conformance check command mismatch");
    }
  }

  const migrations = readdirSync(resolve(root, "crates/lnsat-store/migrations"));
  if (migrations.some((name) => /^0018_/u.test(name)))
    errors.push("migrations: 0018 must remain unregistered");

  return { ok: errors.length === 0, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePhase7LocalConformance();
  if (!result.ok) {
    console.error(
      `Phase 7 local-v1 conformance check failed (${result.errors.length}):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Phase 7 local-v1 conformance check passed: ${EXPECTED_EVIDENCE_IDS.length} evidence rows, ${EXPECTED_NEGATIVE_IDS.length} negative cases, source-only authority closed.`,
  );
}
