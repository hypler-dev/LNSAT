import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_FIXTURE_PATH =
  "fixtures/contracts/phase11-docker-local-runtime-proof-plan-v1.json";
const DEFAULT_EVIDENCE_REQUIREMENTS_FIXTURE_PATH =
  "fixtures/contracts/phase11-docker-local-runtime-proof-evidence-requirements-v1.json";
const EXPECTED_PACKAGE_SCRIPTS_SHA256 =
  "3e6a2a1501d0379980d900b3d95f397ceb9174ffc7513e9e5a126cb27a36c583";
const EXPECTED_SOURCE_CI_SHA256 =
  "a160337a1bfdfb50b287ff990cd3c489f4784258871501cfe846704a58335005";
const MAX_JSON_NESTING = 64;
export const MAX_READINESS_JSON_BYTES = 64 * 1024;

const EXPECTED_BINDINGS = [
  "profile_digest",
  "authority_configuration_digest",
  "adapter_ref",
  "adapter_version",
  "adapter_executable_digest",
  "image_digest",
  "launch_contract_digest",
];

const EXPECTED_CASE_IDS = [
  "real_runtime_one_consequence_and_bound_receipt",
  "exact_replay_metadata_only_no_redispatch",
  "post_consequence_unknown_survives_restart",
  "reconciliation_host_git_inspection_only",
  "unchanged_target_unknown_without_receipt",
  "isolation_no_socket_credentials_or_network",
  "cleanup_verified_container_id_only",
  "runtime_and_image_identity_stable",
];

const EXPECTED_HARD_STOPS = [
  "no_docker_access_or_image_operation_in_readiness_packet",
  "no_agent_docker_socket_access",
  "no_production_or_user_repository",
  "no_git_push_fetch_remote_hook_or_unrestricted_shell",
  "no_runtime_retry_from_outcome_unknown",
  "no_route_config_or_public_selector",
  "no_receipt_or_runtime_result_persistence",
  "no_package_release_deploy_publication_or_support_claim",
  "no_phase11_completion_claim",
];

const EXPECTED_OBSERVATION_COMMITMENT_IDS = [
  "proof_plan_digest",
  "docker_cli_identity",
  "verifier_git_identity",
  "endpoint_file_identity",
  "daemon_version_api_security_posture",
  "immutable_image_provenance_platform",
  "in_image_adapter_executable_entrypoint",
  "disposable_root_repository_git_directory_identity",
  "gateway_d4b2a_d3_d4a_launch_identity_chain",
  "runtime_isolation_lifecycle",
  "host_git_adapter_result_binding",
  "receipt_or_outcome_unknown_transition",
  "restart_reconciliation",
  "operation_bound_cleanup",
  "independent_review",
];

const EXPECTED_PREFLIGHT_REJECTION_IDS = [
  "endpoint_or_daemon_swap_or_drift",
  "unsafe_disposable_target_ownership_mode_or_replacement",
  "image_provenance_or_adapter_mismatch",
  "gateway_chain_bypass",
  "security_posture_drift",
  "cleanup_policy_or_label_contract_invalid",
  "public_evidence_redaction_failure",
];

const EXPECTED_POSTSPAWN_OUTCOME_UNKNOWN_IDS = [
  "timeout_or_disconnect",
  "output_or_result_anomaly",
  "runtime_or_target_identity_drift",
  "adapter_or_host_git_mismatch",
  "receipt_persistence_uncertainty",
  "container_identity_or_label_mismatch",
  "inspection_or_removal_uncertainty",
  "incomplete_or_redaction_invalid_evidence",
];

const EXPECTED_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS = [
  "host_path",
  "socket_path",
  "docker_config_path",
  "repository_path",
  "git_directory_path",
  "raw_container_id",
  "raw_command",
  "raw_arguments",
  "raw_stdout",
  "raw_stderr",
  "canonical_request_frame",
  "canonical_result_frame",
  "source_bytes",
  "patch_bytes",
  "credential",
  "capability_value",
  "session_value",
  "csrf_value",
  "environment_value",
  "private_registry_configuration",
];

const EXPECTED_DOC_MARKERS = {
  "README.md": [
    "The next source checkpoint adds a deterministic proof-plan contract",
    "It remains design evidence only",
    "runtime result, receipt, or support",
    "they do not constitute real runtime evidence or complete Phase 11",
    "source-only evidence-requirements contract",
  ],
  "crates/lnsatd/README.md": [
    "derives one source-only real-runtime proof plan",
    "this metadata opens no",
    "source-only evidence-requirements commitment",
  ],
  "docs/DOCS_INDEX.md": [
    "Phase 11 real disposable Docker proof readiness",
    "PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md",
    "PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md",
  ],
  "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md": [
    "Status: proposed source-only readiness; no runtime evidence",
    "No Docker binary, daemon, socket, or image operation is accessed by this packet.",
    "Operator acknowledgement is not",
    "execution authorization.",
    "Phase 11 remains incomplete.",
    "execution evidence requirements",
  ],
  "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md":
    [
      "Status: proposed source-only evidence requirements; no runtime evidence",
      "No Docker binary, daemon, socket, image, container, or repository consequence is",
      "accessed by this source packet. Phase 11 remains incomplete.",
      "Before any real Docker access, a later authority must name:",
      "This source contract adds no Docker command",
    ],
  "docs/architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md": [
    "## Phase 11 Real Disposable Docker Proof Readiness",
    "real Docker proof remains unexecuted",
    "execution evidence requirements",
  ],
  "docs/ROADMAP.md": [
    "source-only real-Docker proof-readiness contract",
    "does not complete Phase 11",
    "source-only execution-evidence requirements contract",
  ],
  "docs/PRODUCT_BUILD_SEQUENCE.md": [
    "source-only proof-readiness plan",
    "no Docker process, socket, daemon, or image operation",
    "source-only evidence-requirements contract",
  ],
  "docs/PROJECT_STATUS.md": [
    "real-Docker proof-readiness contract",
    "no runtime evidence exists",
    "source-only execution-evidence requirements contract",
  ],
  "docs/WHY_PUBLIC_NOW.md": [
    "freezes required identity bindings, proof cases, and fail-closed negatives",
    "without accessing Docker or claiming runtime evidence",
    "execution evidence requirements",
  ],
  "docs/architecture/README.md": [
    "PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md",
    "Phase 11 real disposable Docker proof readiness",
    "PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md",
  ],
};

const FORBIDDEN_DOC_CLAIMS = [
  /\bPhase 11 is complete\b/iu,
  /\bPhase 11 complete:\s*true\b/iu,
  /\breal Docker proof (?:has )?(?:passed|completed|executed)\b/iu,
  /\bproduction (?:is )?supported\b/iu,
  /\bsupported Docker runtime is available\b/iu,
];

const ALLOWED_PACKAGE_DOCKER_READINESS_TOKENS = [
  "phase11:docker-proof-readiness:test",
  "phase11:docker-proof-readiness:check",
  "scripts/check-phase11-docker-proof-readiness.test.mjs",
  "scripts/check-phase11-docker-proof-readiness.mjs",
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function containsForbiddenPackageDockerToken(command) {
  let remaining = command;
  for (const allowed of ALLOWED_PACKAGE_DOCKER_READINESS_TOKENS) {
    remaining = remaining.replaceAll(allowed, "");
  }
  return /docker/iu.test(remaining);
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

function assertUniqueJsonMembers(text) {
  let cursor = 0;

  function skipWhitespace() {
    while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
  }

  function scanString() {
    const start = cursor;
    if (text[cursor] !== '"') throw new Error("expected JSON string");
    cursor += 1;
    while (cursor < text.length) {
      if (text[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (text[cursor] === '"') {
        cursor += 1;
        return JSON.parse(text.slice(start, cursor));
      }
      cursor += 1;
    }
    throw new Error("unterminated JSON string");
  }

  function scanValue(path, depth) {
    if (depth > MAX_JSON_NESTING) {
      throw new Error(`JSON nesting exceeds ${MAX_JSON_NESTING}`);
    }
    skipWhitespace();
    if (text[cursor] === "{") {
      scanObject(path, depth + 1);
      return;
    }
    if (text[cursor] === "[") {
      scanArray(path, depth + 1);
      return;
    }
    if (text[cursor] === '"') {
      scanString();
      return;
    }
    while (cursor < text.length && !/[\s,\]}]/u.test(text[cursor])) cursor += 1;
  }

  function scanObject(path, depth) {
    const members = new Set();
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "}") {
      cursor += 1;
      return;
    }
    while (cursor < text.length) {
      skipWhitespace();
      const key = scanString();
      if (members.has(key)) {
        throw new Error(`duplicate JSON member ${JSON.stringify(key)} at ${path}`);
      }
      members.add(key);
      skipWhitespace();
      if (text[cursor] !== ":") throw new Error("expected JSON member colon");
      cursor += 1;
      scanValue(`${path}[${JSON.stringify(key)}]`, depth);
      skipWhitespace();
      if (text[cursor] === "}") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") throw new Error("expected JSON member comma");
      cursor += 1;
    }
    throw new Error("unterminated JSON object");
  }

  function scanArray(path, depth) {
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "]") {
      cursor += 1;
      return;
    }
    let index = 0;
    while (cursor < text.length) {
      scanValue(`${path}[${index}]`, depth);
      index += 1;
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") throw new Error("expected JSON array comma");
      cursor += 1;
    }
    throw new Error("unterminated JSON array");
  }

  scanValue("$", 0);
  skipWhitespace();
  if (cursor !== text.length) throw new Error("unexpected trailing JSON bytes");
}

function readText(path, label, errors) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    errors.push(`${label}: unreadable (${String(error)})`);
    return "";
  }
}

function readJson(path, label, errors) {
  let bytes;
  try {
    const fileStat = lstatSync(path);
    if (!fileStat.isFile()) {
      errors.push(`${label}: must be a regular file`);
      return null;
    }
    if (fileStat.size > MAX_READINESS_JSON_BYTES) {
      errors.push(`${label}: exceeds ${MAX_READINESS_JSON_BYTES} bytes`);
      return null;
    }
    bytes = readFileSync(path);
    if (bytes.byteLength > MAX_READINESS_JSON_BYTES) {
      errors.push(`${label}: exceeds ${MAX_READINESS_JSON_BYTES} bytes`);
      return null;
    }
  } catch (error) {
    errors.push(`${label}: unreadable (${String(error)})`);
    return null;
  }
  if (bytes.byteLength === 0) return null;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    assertUniqueJsonMembers(text);
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${label}: invalid strict JSON (${String(error)})`);
    return null;
  }
}

function listWorkflowPaths(root, errors) {
  const directory = resolve(root, ".github/workflows");
  try {
    const paths = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:yml|yaml)$/iu.test(entry.name))
      .map((entry) => resolve(directory, entry.name))
      .sort();
    if (paths.length === 0) {
      errors.push("source CI workflows: no YAML workflows found");
    }
    return paths;
  } catch (error) {
    errors.push(`source CI workflows: unreadable (${String(error)})`);
    return [];
  }
}

export function validatePhase11DockerProofReadiness({
  root = REPO_ROOT,
  fixturePath = resolve(root, DEFAULT_FIXTURE_PATH),
  evidenceRequirementsPath = resolve(root, DEFAULT_EVIDENCE_REQUIREMENTS_FIXTURE_PATH),
  packagePath = resolve(root, "package.json"),
  workflowPath,
  workflowPaths,
  modulePath = resolve(root, "crates/lnsatd/src/docker_local_runtime_proof.rs"),
  evidenceModulePath = resolve(
    root,
    "crates/lnsatd/src/docker_local_runtime_proof_evidence.rs",
  ),
  supervisorPath = resolve(root, "crates/lnsatd/src/docker_local_supervisor.rs"),
  docPaths = Object.fromEntries(
    Object.keys(EXPECTED_DOC_MARKERS).map((path) => [path, resolve(root, path)]),
  ),
} = {}) {
  const errors = [];
  const fixture = readJson(fixturePath, "readiness fixture", errors);
  if (isRecord(fixture) && Object.hasOwn(fixture, "packet_id")) {
    errors.push("readiness fixture.packet_id: canonical packet id is not assigned");
  }
  if (
    exactKeys(
      fixture,
      [
        "schema_id",
        "fixture_id",
        "status",
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
        "contract",
        "required_bindings",
        "required_case_ids",
        "hard_stops",
        "next_gate",
      ],
      "readiness fixture",
      errors,
    )
  ) {
    if (
      fixture.schema_id !==
      "lnsat.phase11_docker_local_runtime_proof_plan_fixture.schema.v1_0"
    ) {
      errors.push("readiness fixture.schema_id: mismatch");
    }
    if (fixture.fixture_id !== "phase11-docker-local-runtime-proof-plan-v1") {
      errors.push("readiness fixture.fixture_id: mismatch");
    }
    if (fixture.status !== "proposed_source_only_no_runtime_evidence") {
      errors.push("readiness fixture.status: proposed source-only status required");
    }
    for (const field of [
      "phase11_complete",
      "execution_authorized",
      "real_docker_proof",
      "production_supported",
    ]) {
      if (fixture[field] !== false) {
        errors.push(`readiness fixture.${field}: false required`);
      }
    }
    if (
      exactKeys(
        fixture.contract,
        ["contract_id", "output", "side_effects", "runtime_execution"],
        "readiness fixture.contract",
        errors,
      )
    ) {
      if (fixture.contract.contract_id !== "lnsat.docker_local_runtime_proof_plan.v1") {
        errors.push("readiness fixture.contract.contract_id: mismatch");
      }
      if (fixture.contract.output !== "canonical_source_only_proof_plan_digest") {
        errors.push("readiness fixture.contract.output: mismatch");
      }
      if (!same(fixture.contract.side_effects, [])) {
        errors.push("readiness fixture.contract.side_effects: [] required");
      }
      if (fixture.contract.runtime_execution !== false) {
        errors.push("readiness fixture.contract.runtime_execution: false required");
      }
    }
    if (!same(fixture.required_bindings, EXPECTED_BINDINGS)) {
      errors.push("readiness fixture.required_bindings: ids or order mismatch");
    }
    if (!same(fixture.required_case_ids, EXPECTED_CASE_IDS)) {
      errors.push("readiness fixture.required_case_ids: ids or order mismatch");
    }
    if (!same(fixture.hard_stops, EXPECTED_HARD_STOPS)) {
      errors.push("readiness fixture.hard_stops: ids or order mismatch");
    }
    if (
      fixture.next_gate !==
      "separately_authorized_real_disposable_docker_image_and_runtime_proof"
    ) {
      errors.push("readiness fixture.next_gate: closed real-Docker gate required");
    }
  }

  const evidenceRequirements = readJson(
    evidenceRequirementsPath,
    "evidence requirements fixture",
    errors,
  );
  if (
    isRecord(evidenceRequirements) &&
    Object.hasOwn(evidenceRequirements, "packet_id")
  ) {
    errors.push(
      "evidence requirements fixture.packet_id: canonical packet id is not assigned",
    );
  }
  if (
    exactKeys(
      evidenceRequirements,
      [
        "schema_id",
        "fixture_id",
        "status",
        "phase11_complete",
        "execution_authorized",
        "real_docker_proof",
        "production_supported",
        "contract",
        "required_plan_binding_ids",
        "required_case_ids",
        "required_observation_commitment_ids",
        "preflight_rejection_ids",
        "postspawn_outcome_unknown_ids",
        "forbidden_public_evidence_fields",
        "next_gate",
      ],
      "evidence requirements fixture",
      errors,
    )
  ) {
    if (
      evidenceRequirements.schema_id !==
      "lnsat.phase11_docker_local_runtime_proof_evidence_requirements_fixture.schema.v1_0"
    ) {
      errors.push("evidence requirements fixture.schema_id: mismatch");
    }
    if (
      evidenceRequirements.fixture_id !==
      "phase11-docker-local-runtime-proof-evidence-requirements-v1"
    ) {
      errors.push("evidence requirements fixture.fixture_id: mismatch");
    }
    if (evidenceRequirements.status !== "proposed_source_only_no_runtime_evidence") {
      errors.push(
        "evidence requirements fixture.status: proposed source-only status required",
      );
    }
    for (const field of [
      "phase11_complete",
      "execution_authorized",
      "real_docker_proof",
      "production_supported",
    ]) {
      if (evidenceRequirements[field] !== false) {
        errors.push(`evidence requirements fixture.${field}: false required`);
      }
    }
    if (
      exactKeys(
        evidenceRequirements.contract,
        ["contract_id", "output", "side_effects", "runtime_execution"],
        "evidence requirements fixture.contract",
        errors,
      )
    ) {
      if (
        evidenceRequirements.contract.contract_id !==
        "lnsat.docker_local_runtime_proof_evidence_requirements.v1"
      ) {
        errors.push("evidence requirements fixture.contract.contract_id: mismatch");
      }
      if (
        evidenceRequirements.contract.output !==
        "canonical_source_only_evidence_requirements_digest"
      ) {
        errors.push("evidence requirements fixture.contract.output: mismatch");
      }
      if (!same(evidenceRequirements.contract.side_effects, [])) {
        errors.push("evidence requirements fixture.contract.side_effects: [] required");
      }
      if (evidenceRequirements.contract.runtime_execution !== false) {
        errors.push(
          "evidence requirements fixture.contract.runtime_execution: false required",
        );
      }
    }
    for (const [field, expected] of [
      ["required_plan_binding_ids", EXPECTED_BINDINGS],
      ["required_case_ids", EXPECTED_CASE_IDS],
      ["required_observation_commitment_ids", EXPECTED_OBSERVATION_COMMITMENT_IDS],
      ["preflight_rejection_ids", EXPECTED_PREFLIGHT_REJECTION_IDS],
      ["postspawn_outcome_unknown_ids", EXPECTED_POSTSPAWN_OUTCOME_UNKNOWN_IDS],
      ["forbidden_public_evidence_fields", EXPECTED_FORBIDDEN_PUBLIC_EVIDENCE_FIELDS],
    ]) {
      if (!same(evidenceRequirements[field], expected)) {
        errors.push(`evidence requirements fixture.${field}: ids or order mismatch`);
      }
    }
    if (
      evidenceRequirements.next_gate !==
      "separately_authorized_real_disposable_docker_image_and_runtime_proof"
    ) {
      errors.push(
        "evidence requirements fixture.next_gate: closed real-Docker gate required",
      );
    }
  }

  const packageJson = readJson(packagePath, "package.json", errors);
  const scripts = packageJson?.scripts;
  if (!isRecord(scripts)) {
    errors.push("package.json scripts: expected object");
  } else {
    if (sha256(JSON.stringify(scripts)) !== EXPECTED_PACKAGE_SCRIPTS_SHA256) {
      errors.push("package.json scripts: exact source-gate graph digest mismatch");
    }
    if (
      scripts["phase11:docker-proof-readiness:test"] !==
      "node --test scripts/check-phase11-docker-proof-readiness.test.mjs"
    ) {
      errors.push("package.json: Phase 11 readiness test command mismatch");
    }
    if (
      scripts["phase11:docker-proof-readiness:check"] !==
      "node scripts/check-phase11-docker-proof-readiness.mjs"
    ) {
      errors.push("package.json: Phase 11 readiness check command mismatch");
    }
    if (
      scripts["source:check"] !==
      "npm run format:check && npm run check && npm run release:metadata:check && npm run build"
    ) {
      errors.push(
        "package.json: source:check must retain exact repository check chain",
      );
    }
    const checkSteps =
      typeof scripts.check === "string"
        ? scripts.check.split(/\s*&&\s*/u).map((step) => step.trim())
        : [];
    const readinessTestStep = "npm run phase11:docker-proof-readiness:test";
    const readinessCheckStep = "npm run phase11:docker-proof-readiness:check";
    const readinessIndex = checkSteps.indexOf(readinessTestStep);
    if (readinessIndex < 0 || checkSteps[readinessIndex + 1] !== readinessCheckStep) {
      errors.push("package.json: check must include Phase 11 readiness gates");
    }
    if (Object.hasOwn(scripts, "phase11:docker:proof")) {
      errors.push("package.json: real Docker proof execution command remains closed");
    }
    for (const [name, command] of Object.entries(scripts)) {
      if (typeof command === "string" && containsForbiddenPackageDockerToken(command)) {
        errors.push(`package.json script ${name}: Docker token remains forbidden`);
      }
    }
  }

  const effectiveWorkflowPaths =
    workflowPaths ?? (workflowPath ? [workflowPath] : listWorkflowPaths(root, errors));
  let sourceCheckWired = false;
  const workflowSources = [];
  for (const path of effectiveWorkflowPaths) {
    const workflow = readText(path, `source CI workflow ${path}`, errors);
    workflowSources.push(workflow);
    if (/^\s*run:\s*npm run source:check\s*$/mu.test(workflow)) {
      sourceCheckWired = true;
    }
    if (/phase11:docker:proof/iu.test(workflow)) {
      errors.push(`source CI workflow ${path}: real Docker proof command forbidden`);
    }
    if (/docker/iu.test(workflow)) {
      errors.push(`source CI workflow ${path}: Docker token remains forbidden`);
    }
    if (/^\s*(?:services|container)\s*:/gmu.test(workflow)) {
      errors.push(
        `source CI workflow ${path}: Docker service/container remains forbidden`,
      );
    }
    if (/(?:^|[\s;&|])docker(?:\s|$)/gmu.test(workflow)) {
      errors.push(`source CI workflow ${path}: Docker command remains forbidden`);
    }
    if (/\buses\s*:\s*(?:docker\/|docker:\/\/)/iu.test(workflow)) {
      errors.push(`source CI workflow ${path}: Docker action/image remains forbidden`);
    }
  }
  if (effectiveWorkflowPaths.length > 0 && !sourceCheckWired) {
    errors.push("source CI workflows: npm run source:check must remain wired");
  }
  if (
    workflowSources.length !== 1 ||
    sha256(workflowSources[0] ?? "") !== EXPECTED_SOURCE_CI_SHA256
  ) {
    errors.push("source CI workflows: exact closed workflow digest mismatch");
  }

  const moduleSource = readText(modulePath, "runtime proof module", errors);
  for (const marker of [
    "lnsat.docker_local_runtime_proof_plan.v1",
    "build_docker_local_runtime_proof_plan_v1",
    "parse_docker_local_runtime_proof_plan_v1",
  ]) {
    if (!moduleSource.includes(marker)) {
      errors.push(`runtime proof module: missing marker ${marker}`);
    }
  }
  for (const forbidden of [
    "std::process",
    "Command::new",
    "std::net",
    "std::fs",
    "std::env",
    "std::os::unix",
    "local_unix_socket",
    "UnixListener",
    "UnixStream",
    "lnsat_store",
    "supervise_docker_local_git_execution_v1",
    "execute_phase11_mapped_disposable_git_commit_v1",
  ]) {
    if (moduleSource.includes(forbidden)) {
      errors.push(`runtime proof module: forbidden side-effect marker ${forbidden}`);
    }
  }

  const evidenceModuleSource = readText(
    evidenceModulePath,
    "runtime proof evidence requirements module",
    errors,
  );
  for (const marker of [
    "lnsat.docker_local_runtime_proof_evidence_requirements.v1",
    "build_docker_local_runtime_proof_evidence_requirements_v1",
    "parse_docker_local_runtime_proof_evidence_requirements_v1",
  ]) {
    if (!evidenceModuleSource.includes(marker)) {
      errors.push(
        `runtime proof evidence requirements module: missing marker ${marker}`,
      );
    }
  }
  for (const forbidden of [
    "std::process",
    "Command::new",
    "std::net",
    "std::fs",
    "std::env",
    "std::os::unix",
    "local_unix_socket",
    "UnixListener",
    "UnixStream",
    "lnsat_store",
    "supervise_docker_local_git_execution_v1",
    "execute_phase11_mapped_disposable_git_commit_v1",
  ]) {
    if (evidenceModuleSource.includes(forbidden)) {
      errors.push(
        `runtime proof evidence requirements module: forbidden side-effect marker ${forbidden}`,
      );
    }
  }

  const supervisorSource = readText(supervisorPath, "Docker supervisor", errors);
  if (!supervisorSource.includes("docker_local_launch_contract_digest_v1")) {
    errors.push("Docker supervisor: deterministic launch-contract digest missing");
  }

  for (const [relativePath, markers] of Object.entries(EXPECTED_DOC_MARKERS)) {
    const source = readText(
      docPaths[relativePath] ?? resolve(root, relativePath),
      relativePath,
      errors,
    );
    for (const marker of markers) {
      if (!source.includes(marker)) {
        errors.push(`${relativePath}: missing marker ${marker}`);
      }
    }
    for (const forbidden of FORBIDDEN_DOC_CLAIMS) {
      if (forbidden.test(source)) {
        errors.push(
          `${relativePath}: forbidden runtime, completion, or support claim ${forbidden.source}`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePhase11DockerProofReadiness();
  if (!result.ok) {
    console.error(
      `Phase 11 Docker proof-readiness check failed (${result.errors.length}):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Phase 11 Docker proof-readiness check passed: ${EXPECTED_BINDINGS.length} bindings, ${EXPECTED_CASE_IDS.length} future proof cases, ${EXPECTED_OBSERVATION_COMMITMENT_IDS.length} evidence commitments, execution closed.`,
  );
}
