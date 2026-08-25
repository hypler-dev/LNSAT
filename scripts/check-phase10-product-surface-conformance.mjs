import { readFileSync, readdirSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_EVIDENCE_PATH =
  "fixtures/contracts/phase10-product-surface-conformance-v1.json";

const EXPECTED_EVIDENCE_IDS = [
  "three_command_manifest_equality",
  "explicit_config_contract",
  "closed_config_negatives",
  "authenticated_health_status",
  "output_compatibility",
  "offline_backup_restore",
  "offline_owner_recovery",
  "non_root_enforcement",
  "offline_recovery_channel_parity",
  "packet_cli_api_mcp_parity",
  "completion_and_man_source",
  "source_only_hard_stops",
  "phase14_lifecycle_ownership",
];

const EXPECTED_COMPATIBILITY_GUARANTEES = [
  "default_json_output_preserved",
  "packet_cli_api_mcp_decision_and_evidence_equal",
  "direct_daemon_arguments_preserved",
  "mixed_direct_and_config_input_rejected",
  "new_commands_occupy_previously_invalid_shapes",
  "stable_exit_families_preserved",
  "target_neutral_manifest_preserved",
  "phase14_lifecycle_ownership_preserved",
];

const EXPECTED_NEGATIVE_IDS = [
  "ambient_authority_or_secret_argument",
  "mixed_configuration_precedence",
  "tcp_bearer_or_input_before_validation",
  "insecure_socket_identity",
  "socket_symlink_traversal",
  "get_head_auth_drift",
  "restore_overwrite_or_activation",
  "owner_secret_argument_or_reflection",
  "root_runtime_or_recovery",
  "served_recovery_api",
  "served_recovery_mcp",
  "rendered_recovery_ui_action",
  "phase10_target_lifecycle_claim",
];

const EXPECTED_VALIDATION_COMMANDS = [
  "npm run phase10:exit:test",
  "npm run phase10:exit:check",
  "npm run docs:direction:check",
  "npm run security:conformance:check",
  "npm run audit:migrations:check",
  "npm run public:check",
  "npm run check",
  "git diff --check",
];

const EXPECTED_EXCLUSIONS = [
  "served_or_public_consequence_routes",
  "production_or_user_repository_execution",
  "migration_0018_key_or_provider_work",
  "system_user_target_or_package_path_selection",
  "artifact_build_install_service_or_lifecycle_proof",
  "tag_release_publication_deployment_or_production_write",
  "phase11_or_later_implementation",
];

const EXPECTED_MANIFEST_HARD_STOPS = [
  "served_recovery_mutation",
  "production_or_user_repository_consequence",
  "migration_0018",
  "key_or_provider_work",
  "install_or_service_start",
  "tag_release_publication_deploy",
  "phase11_or_later_implementation",
  "automatic_promotion",
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

function validateRows(root, rows, expectedIds, withCommand, path, errors) {
  if (!Array.isArray(rows)) {
    errors.push(`${path}: expected array`);
    return;
  }
  const ids = rows.map((row) => row?.id);
  if (!same(ids, expectedIds)) errors.push(`${path}: required ids or order mismatch`);
  if (new Set(ids).size !== ids.length) errors.push(`${path}: duplicate id`);
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

export function validatePhase10ProductSurfaceConformance({
  root = REPO_ROOT,
  evidencePath = resolve(root, DEFAULT_EVIDENCE_PATH),
  packagePath = resolve(root, "package.json"),
  statusPath = resolve(root, "fixtures/contracts/phase10-status-v1.json"),
  manifestPath = resolve(root, "fixtures/contracts/phase10-product-surface-v1.json"),
  migrationsPath = resolve(root, "crates/lnsat-store/migrations"),
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
        "status_posture",
        "evidence_rows",
        "compatibility_guarantees",
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

  if (evidence.schema_version !== "lnsat.phase10_product_surface_conformance.v1") {
    errors.push("evidence.schema_version: mismatch");
  }
  if (evidence.packet_id !== "P10-X1") errors.push("evidence.packet_id: mismatch");
  if (evidence.freeze_status !== "complete") {
    errors.push("evidence.freeze_status: complete required");
  }

  if (
    exactKeys(
      evidence.scope,
      [
        "source_only",
        "new_runtime_features",
        "new_mutation_authority",
        "phase11_open",
        "package_lifecycle_open",
        "supported_release",
        "publication_authorized",
        "deployment_authorized",
        "schema_change_authorized",
      ],
      "evidence.scope",
      errors,
    )
  ) {
    if (evidence.scope.source_only !== true) {
      errors.push("evidence.scope.source_only: true required");
    }
    for (const key of Object.keys(evidence.scope).filter(
      (key) => key !== "source_only",
    )) {
      if (evidence.scope[key] !== false)
        errors.push(`evidence.scope.${key}: false required`);
    }
  }

  if (
    exactKeys(
      evidence.status_posture,
      ["phase10_status", "implemented_packets", "next_gate", "phase11_open"],
      "evidence.status_posture",
      errors,
    )
  ) {
    if (evidence.status_posture.phase10_status !== "complete") {
      errors.push("evidence.status_posture.phase10_status: complete required");
    }
    if (
      !same(evidence.status_posture.implemented_packets, [
        "P10-A1",
        "P10-A2",
        "P10-A3",
        "P10-A4",
        "P10-X1",
      ])
    ) {
      errors.push("evidence.status_posture.implemented_packets: mismatch");
    }
    if (evidence.status_posture.next_gate !== "phase11_authorization_required") {
      errors.push("evidence.status_posture.next_gate: mismatch");
    }
    if (evidence.status_posture.phase11_open !== false) {
      errors.push("evidence.status_posture.phase11_open: false required");
    }
  }

  validateRows(
    root,
    evidence.evidence_rows,
    EXPECTED_EVIDENCE_IDS,
    true,
    "evidence.evidence_rows",
    errors,
  );
  validateRows(
    root,
    evidence.required_negatives,
    EXPECTED_NEGATIVE_IDS,
    false,
    "evidence.required_negatives",
    errors,
  );

  if (!same(evidence.compatibility_guarantees, EXPECTED_COMPATIBILITY_GUARANTEES)) {
    errors.push("evidence.compatibility_guarantees: mismatch");
  }
  if (!same(evidence.validation_commands, EXPECTED_VALIDATION_COMMANDS)) {
    errors.push("evidence.validation_commands: mismatch");
  }
  if (!same(evidence.explicit_exclusions, EXPECTED_EXCLUSIONS)) {
    errors.push("evidence.explicit_exclusions: mismatch");
  }
  if (!Array.isArray(evidence.side_effects) || evidence.side_effects.length !== 0) {
    errors.push("evidence.side_effects: must equal []");
  }

  const packageJson = readJson(packagePath, errors);
  if (packageJson) {
    if (
      !packageJson.scripts?.check?.includes(
        "npm run phase10:exit:test && npm run phase10:exit:check",
      )
    ) {
      errors.push("package.json: check must include Phase 10 exit gates");
    }
    if (
      packageJson.scripts?.["phase10:exit:test"] !==
      "node --test scripts/check-phase10-product-surface-conformance.test.mjs && node scripts/run-rust-workspace.mjs product-surface"
    ) {
      errors.push("package.json: phase10 exit test command mismatch");
    }
    if (
      packageJson.scripts?.["phase10:exit:check"] !==
      "node scripts/check-phase10-product-surface-conformance.mjs"
    ) {
      errors.push("package.json: phase10 exit check command mismatch");
    }
  }

  const status = readJson(statusPath, errors);
  if (status) {
    if (status.phase10?.status !== "complete") {
      errors.push("phase10 status fixture: complete required");
    }
    if (
      !same(status.phase10?.implemented_packets, [
        "P10-A1",
        "P10-A2",
        "P10-A3",
        "P10-A4",
        "P10-X1",
      ])
    ) {
      errors.push("phase10 status fixture: implemented packets mismatch");
    }
    if (status.phase10?.next_packet !== "none_authorized") {
      errors.push("phase10 status fixture: next packet must remain unauthorized");
    }
    if (status.phase10?.phase11_open !== false) {
      errors.push("phase10 status fixture: Phase 11 must remain closed");
    }
  }

  const manifest = readJson(manifestPath, errors);
  if (manifest) {
    if (
      manifest.supported_release !== false ||
      manifest.package_or_binary_claim !== false
    ) {
      errors.push("product manifest: source-only maturity must remain closed");
    }
    if (
      exactKeys(
        manifest.hard_stops,
        EXPECTED_MANIFEST_HARD_STOPS,
        "product manifest hard_stops",
        errors,
      )
    ) {
      for (const [key, value] of Object.entries(manifest.hard_stops)) {
        if (value !== false) {
          errors.push(`product manifest hard_stops.${key}: false required`);
        }
      }
    }
    for (const [path, value, expected] of [
      ["recovery.api", manifest.recovery?.api, "unavailable"],
      ["recovery.mcp", manifest.recovery?.mcp, "unavailable"],
      ["recovery.ui_action", manifest.recovery?.ui_action, "unavailable"],
      ["recovery.served_mutation", manifest.recovery?.served_mutation, false],
      ["recovery.automatic_activation", manifest.recovery?.automatic_activation, false],
      [
        "service_manager.install_implemented",
        manifest.service_manager?.install_implemented,
        false,
      ],
      [
        "service_manager.start_implemented",
        manifest.service_manager?.start_implemented,
        false,
      ],
      [
        "build_manifest.target_selected",
        manifest.build_manifest?.target_selected,
        false,
      ],
      [
        "build_manifest.artifact_digests_present",
        manifest.build_manifest?.artifact_digests_present,
        false,
      ],
      ["non_root.runtime_enforced", manifest.non_root?.runtime_enforced, true],
      [
        "non_root.offline_recovery_enforced",
        manifest.non_root?.offline_recovery_enforced,
        true,
      ],
    ]) {
      if (value !== expected) {
        errors.push(`product manifest ${path}: ${JSON.stringify(expected)} required`);
      }
    }
  }

  const migrations = readdirSync(migrationsPath);
  if (migrations.some((name) => /^0018_/u.test(name))) {
    errors.push("migrations: 0018 must remain unregistered");
  }

  return { ok: errors.length === 0, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePhase10ProductSurfaceConformance();
  if (!result.ok) {
    console.error(
      `Phase 10 product-surface exit check failed (${result.errors.length}):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Phase 10 product-surface exit check passed: ${EXPECTED_EVIDENCE_IDS.length} evidence rows, ${EXPECTED_NEGATIVE_IDS.length} negative cases, Phase 11 closed.`,
  );
}
