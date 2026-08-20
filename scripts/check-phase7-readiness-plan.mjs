import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createIsolatedGitEnvironment,
  PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  validatePublicSourceSnapshotProvenance,
} from "./public-source-snapshot-provenance.mjs";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const CANONICAL_SENTENCE =
  "Canonical readiness states: Phase 7a signed-evidence design = complete; Phase 7b wrapper verification = implemented_verification_only; Phase 7c Ed25519 primitive = implemented_not_wired; Phase 7d schema candidate = proposed_test_only; P7-ADR0 local-v1 trust-model revision = complete; P7-M1 core persistence = complete; P7-N1 nonce/expiry lifecycle = complete; P7-B1 preauthorization hardening = complete; P7-C1 atomic consumption = complete (implemented_not_wired); P7-A1 local authorization = complete (source-only, implemented_not_wired); P7-R1 Git reference adapter = complete (source-only, implemented_not_wired); P7-X1 local-v1 conformance freeze = complete (source-only evidence, no runtime/publication authority); runtime is schema 17/17 with migrations 0016 and 0017 registered; optional signed-evidence packets remain blocked.";

const EXPECTED_SCHEMA_VERSION = "lnsat.phase7_readiness.v3";
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

const LEDGER_KEY_ORDER = [
  "schema_version",
  "packet_provenance",
  "status_vocabulary",
  "phase_status",
  "trust_model",
  "runtime_truth",
  "authority_transitions",
  "current_executable_packet",
  "blocked_future_packets",
  "superseded_packets",
  "release_lanes",
  "approval_gates",
  "packets",
];

const STATUS_VOCABULARY = [
  "complete",
  "implemented_record_only",
  "implemented_verification_only",
  "implemented_not_wired",
  "proposed_test_only",
  "unset",
  "blocked_pending_explicit_input",
  "closed",
  "unavailable",
  "superseded_non_authorizing",
];

const EXPECTED_PHASE_STATUS = {
  phase_6_source_exit: "complete",
  phase_7a_signed_evidence_design: "complete",
  phase_7b_wrapper_verification: "implemented_verification_only",
  phase_7c_ed25519_primitive: "implemented_not_wired",
  phase_7d_schema_candidate: "proposed_test_only",
  phase_7_adr0_local_v1_trust_model: "complete",
};

const EXPECTED_TRUST_MODEL = {
  local_v1_trusted_boundary: "local_lnsat_daemon_and_host_os",
  default_approval_proof: "local_session",
  approval_proof_variants: [
    "local_session",
    "external_signature",
    "local_session_and_external_signature",
  ],
  portable_signed_approval_required_for_local_v1: false,
  execution_authorization_profile:
    "server_record_plus_digest_stored_one_time_capability",
  private_keys_enter_lnsat: false,
  private_keys_enter_repo_or_codex: false,
  schema_0016_scope: "core_local_authority_loop",
  schema_0017_scope: "phase7_core_semantics_correction",
  schema_0018_scope: "public_key_and_signed_approval_evidence",
};

const EXPECTED_RUNTIME_TRUTH_KEYS = [
  "sqlite_schema_version",
  "registered_migration_count",
  "migration_0016",
  "migration_0017",
  "authorization_attempt_persistence",
  "local_session_approval_record",
  "p1_public_material",
  "operational_wrapper_verification",
  "signer_custody",
  "runtime_signing",
  "provider_calls",
  "private_key_custody",
  "nonce_generation",
  "nonce_runtime_persistence",
  "signed_evidence_issuance",
  "verification_attempt_runtime_persistence",
  "atomic_single_use_consumption",
  "server_side_authorization_record",
  "one_time_capability",
  "execution_authorization",
  "receipt_binding",
  "reference_git_commit_adapter",
  "adapter_dispatch",
  "runtime_api",
  "deployment",
];

const EXPECTED_RUNTIME_TRUTH = {
  sqlite_schema_version: 17,
  registered_migration_count: 17,
  migration_0016: "implemented_registered",
  migration_0017: "implemented_registered",
  authorization_attempt_persistence: "implemented_record_only",
  local_session_approval_record: "implemented_record_only",
  p1_public_material: "unset",
  operational_wrapper_verification: "unavailable",
  signer_custody: "closed",
  runtime_signing: "closed",
  provider_calls: "closed",
  private_key_custody: "closed",
  nonce_generation: "implemented_not_wired",
  nonce_runtime_persistence: "implemented_record_only",
  signed_evidence_issuance: "closed",
  verification_attempt_runtime_persistence: "closed",
  atomic_single_use_consumption: "implemented_not_wired",
  server_side_authorization_record: "implemented_record_only",
  one_time_capability: "implemented_not_wired",
  execution_authorization: "implemented_not_wired",
  receipt_binding: "implemented_not_wired",
  reference_git_commit_adapter: "implemented_not_wired",
  adapter_dispatch: "implemented_not_wired",
  runtime_api: "closed",
  deployment: "closed",
};

const EXPECTED_AUTHORITY_TRANSITIONS = {
  verified_chain: false,
  active_public_material: false,
  valid_signed_evidence: false,
  active_unexpired_nonce: true,
  server_side_authorization_record: true,
  one_time_capability_issued: true,
  atomic_single_use_consumption: true,
  bound_authorization_record: true,
  adapter_execution: false,
  digest_bound_receipt: false,
  immutable_phase7_audit_evidence: false,
  execution_authorized: true,
};

const EXPECTED_PACKETS = [
  {
    packet_id: "P7-RP0",
    status: "complete",
    executable: true,
    prerequisites: [],
    approval_gate_ids: [],
  },
  {
    packet_id: "P7-ADR0",
    status: "complete",
    executable: true,
    prerequisites: ["P7-RP0"],
    approval_gate_ids: [],
  },
  {
    packet_id: "P7-M1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-ADR0"],
    approval_gate_ids: ["P7_M1_CORE_PERSISTENCE"],
  },
  {
    packet_id: "P7-N1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-M1"],
    approval_gate_ids: ["P7_N1_NONCE_EXPIRY"],
  },
  {
    packet_id: "P7-B1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-M1", "P7-N1"],
    approval_gate_ids: ["P7_B1_PREAUTHORIZATION_HARDENING"],
  },
  {
    packet_id: "P7-C1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-M1", "P7-N1", "P7-B1"],
    approval_gate_ids: ["P7_C1_ATOMIC_CONSUMPTION"],
  },
  {
    packet_id: "P7-A1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-M1", "P7-N1", "P7-B1", "P7-C1"],
    approval_gate_ids: ["P7_A1_LOCAL_AUTHORIZATION"],
  },
  {
    packet_id: "P7-R1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-B1", "P7-A1"],
    approval_gate_ids: ["P7_R1_GIT_REFERENCE_ADAPTER"],
  },
  {
    packet_id: "P7-X1",
    status: "complete",
    executable: true,
    prerequisites: ["P7-M1", "P7-N1", "P7-B1", "P7-C1", "P7-A1", "P7-R1"],
    approval_gate_ids: ["P7_X1_LOCAL_CONFORMANCE_FREEZE"],
  },
  {
    packet_id: "P7-K1",
    status: "blocked_pending_explicit_input",
    executable: false,
    prerequisites: ["P7-M1"],
    approval_gate_ids: ["P7_K1_PUBLIC_KEY_LIFECYCLE"],
  },
  {
    packet_id: "P7-S1",
    status: "blocked_pending_explicit_input",
    executable: false,
    prerequisites: ["P7-K1"],
    approval_gate_ids: ["P7_S1_SIGNER_TRANSPORT"],
  },
  {
    packet_id: "P7-V1",
    status: "blocked_pending_explicit_input",
    executable: false,
    prerequisites: ["P7-K1"],
    approval_gate_ids: ["P7_V1_SIGNATURE_VERIFICATION"],
  },
  {
    packet_id: "P7-I1",
    status: "blocked_pending_explicit_input",
    executable: false,
    prerequisites: ["P7-S1", "P7-V1"],
    approval_gate_ids: ["P7_I1_SIGNED_APPROVAL_PROOF"],
  },
];

const EXPECTED_GATE_IDS = [
  "P7_M1_CORE_PERSISTENCE",
  "P7_N1_NONCE_EXPIRY",
  "P7_B1_PREAUTHORIZATION_HARDENING",
  "P7_C1_ATOMIC_CONSUMPTION",
  "P7_A1_LOCAL_AUTHORIZATION",
  "P7_R1_GIT_REFERENCE_ADAPTER",
  "P7_X1_LOCAL_CONFORMANCE_FREEZE",
  "P7_K1_PUBLIC_KEY_LIFECYCLE",
  "P7_S1_SIGNER_TRANSPORT",
  "P7_V1_SIGNATURE_VERIFICATION",
  "P7_I1_SIGNED_APPROVAL_PROOF",
];
const SIGNED_APPROVAL_FIXTURE_PATH =
  "fixtures/contracts/signed-approval-evidence-v1_0.jsonl";
const SIGNED_APPROVAL_FIXTURE_CASE_ID = "valid_structure_crypto_unavailable";
const SIGNED_APPROVAL_FIXTURE_ERROR = "signed_approval.verification_unavailable";
const SIGNED_APPROVAL_EXPECTED_RESULT = {
  ok: false,
  status: "rejected",
  cryptographic_signature_valid: false,
  current_status_valid: false,
  execution_authorized: false,
  error_code: SIGNED_APPROVAL_FIXTURE_ERROR,
};
const EXPECTED_PLAN_PACKET_LABELS = [
  "objective",
  "prerequisites",
  "allowed scope",
  "forbidden scope",
  "required inputs",
  "contracts affected",
  "DB effect",
  "authority transition",
  "positive tests",
  "negative tests",
  "rollback/failure evidence",
  "validation commands",
  "explicit approval",
  "completion artifact",
  "next packet",
  "status",
  "executable",
  "approval_gate_ids",
];
const EXPECTED_PLAN_PACKET_LABEL_SET = new Set(
  EXPECTED_PLAN_PACKET_LABELS.map((label) => label.toLowerCase()),
);
const EXPECTED_GATE_TITLES = {
  P7_M1_CORE_PERSISTENCE: "revised v16 core local authority-loop persistence",
  P7_N1_NONCE_EXPIRY: "server-owned nonce and expiry lifecycle",
  P7_B1_PREAUTHORIZATION_HARDENING:
    "preauthorization binding, cardinality, audit, receipt, provenance, and review hardening",
  P7_C1_ATOMIC_CONSUMPTION: "atomic one-time capability redemption and consumption",
  P7_A1_LOCAL_AUTHORIZATION: "online exact-bound local execution authorization",
  P7_R1_GIT_REFERENCE_ADAPTER: "bounded disposable Git commit adapter and receipt",
  P7_X1_LOCAL_CONFORMANCE_FREEZE:
    "local-v1 core security and operability conformance freeze",
  P7_K1_PUBLIC_KEY_LIFECYCLE: "optional v18 public-key enrollment and lifecycle",
  P7_S1_SIGNER_TRANSPORT: "optional provider-neutral hybrid signer transport",
  P7_V1_SIGNATURE_VERIFICATION: "optional operational signature verification",
  P7_I1_SIGNED_APPROVAL_PROOF: "optional or policy-required signed approval proof",
};

const EXPECTED_GATE_STATE = {
  P7_M1_CORE_PERSISTENCE: { status: "complete", granted: true },
  P7_N1_NONCE_EXPIRY: { status: "complete", granted: true },
  P7_B1_PREAUTHORIZATION_HARDENING: { status: "complete", granted: true },
  P7_C1_ATOMIC_CONSUMPTION: {
    status: "complete",
    granted: true,
  },
  P7_A1_LOCAL_AUTHORIZATION: {
    status: "complete",
    granted: true,
  },
  P7_R1_GIT_REFERENCE_ADAPTER: {
    status: "complete",
    granted: true,
  },
  P7_X1_LOCAL_CONFORMANCE_FREEZE: {
    status: "complete",
    granted: true,
  },
  P7_K1_PUBLIC_KEY_LIFECYCLE: {
    status: "blocked_pending_explicit_input",
    granted: false,
  },
  P7_S1_SIGNER_TRANSPORT: {
    status: "blocked_pending_explicit_input",
    granted: false,
  },
  P7_V1_SIGNATURE_VERIFICATION: {
    status: "blocked_pending_explicit_input",
    granted: false,
  },
  P7_I1_SIGNED_APPROVAL_PROOF: {
    status: "blocked_pending_explicit_input",
    granted: false,
  },
};

const EXPECTED_GATE_STATUS = "blocked_pending_explicit_input";
const EXPECTED_PACKET_IDS = EXPECTED_PACKETS.map((packet) => packet.packet_id);
const EXPECTED_BLOCKED_PACKETS = EXPECTED_PACKETS.filter(
  (packet) => packet.status === EXPECTED_GATE_STATUS,
).map((packet) => packet.packet_id);
const EXPECTED_COMPLETE_PACKETS = EXPECTED_PACKETS.filter(
  (packet) => packet.status === "complete",
).map((packet) => packet.packet_id);
const LEDGER_PHASE_STATUS_FIELDS = Object.keys(EXPECTED_PHASE_STATUS);
const PLAN_PHASE_STATUS_FIELDS = [
  "phase_7a_signed_evidence_design",
  "phase_7b_wrapper_verification",
  "phase_7c_ed25519_primitive",
  "phase_7d_schema_candidate",
  "phase_7_adr0_local_v1_trust_model",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arraysEqualByJSON(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cleanPlanValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parsePlanArray(value) {
  const cleaned = cleanPlanValue(value);
  if (cleaned === "[]") {
    return [];
  }
  const listMatch = cleaned.match(/^\[(.*)\]$/u);
  const listText = listMatch ? listMatch[1].trim() : cleaned;
  if (listText.length === 0) {
    return [];
  }
  return listText
    .split(",")
    .map((entry) => cleanPlanValue(entry))
    .filter((entry) => entry.length > 0);
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function parsePlanPacketSection(packetId, sectionText, errors) {
  const parsed = {};
  const seen = new Set();

  const entries = [...sectionText.matchAll(/^\s*-\s*`?([^`:\n]+)`?\s*:\s*(.*)$/gmu)];
  for (const [, rawLabel, rawValue] of entries) {
    const normalizedLabel = rawLabel.trim().toLowerCase();
    if (!EXPECTED_PLAN_PACKET_LABEL_SET.has(normalizedLabel)) {
      errors.push(`plan packet ${packetId}: unexpected label ${rawLabel.trim()}`);
      continue;
    }

    if (seen.has(normalizedLabel)) {
      errors.push(`plan packet ${packetId}: duplicate label ${rawLabel.trim()}`);
      continue;
    }
    seen.add(normalizedLabel);

    if (normalizedLabel === "status") {
      parsed[normalizedLabel] = cleanPlanValue(rawValue);
      continue;
    }
    if (normalizedLabel === "executable") {
      const cleanedValue = cleanPlanValue(rawValue).toLowerCase();
      if (cleanedValue !== "true" && cleanedValue !== "false") {
        errors.push(`plan packet ${packetId}: executable must be true or false`);
        parsed[normalizedLabel] = null;
      } else {
        parsed[normalizedLabel] = cleanedValue === "true";
      }
      continue;
    }
    if (
      normalizedLabel === "prerequisites" ||
      normalizedLabel === "approval_gate_ids"
    ) {
      parsed[normalizedLabel] = parsePlanArray(rawValue);
      continue;
    }

    parsed[normalizedLabel] = cleanPlanValue(rawValue);
  }

  assert(
    seen.size === EXPECTED_PLAN_PACKET_LABELS.length,
    `plan packet ${packetId}: unexpected label count`,
    errors,
  );

  for (const label of EXPECTED_PLAN_PACKET_LABELS) {
    assert(
      seen.has(label.toLowerCase()),
      `plan packet ${packetId}: missing required label ${label}`,
      errors,
    );
  }

  return parsed;
}

function findPlanSections(planText, errors) {
  const headings = [...planText.matchAll(/^###\s*\d+\)\s*(P7-[A-Z0-9-]+)/gm)].map(
    (match) => match[1],
  );

  const phaseMatches = [
    ...planText.matchAll(
      /^\|\s*Phase 7a signed-evidence design\s*\|\s*`?([a-z_]+)`?\s*\|/gimu,
    ),
    ...planText.matchAll(
      /^\|\s*Phase 7b wrapper verification\s*\|\s*`?([a-z_]+)`?\s*\|/gimu,
    ),
    ...planText.matchAll(
      /^\|\s*Phase 7c Ed25519 primitive\s*\|\s*`?([a-z_]+)`?\s*\|/gimu,
    ),
    ...planText.matchAll(
      /^\|\s*Phase 7d schema candidate\s*\|\s*`?([a-z_]+)`?\s*\|/gimu,
    ),
    ...planText.matchAll(/^\|\s*P7-ADR0 trust model\s*\|\s*`?([a-z_]+)`?\s*\|/gimu),
  ];
  const phaseStatus = {};
  for (const match of phaseMatches) {
    const value = match[1].trim();
    const row = match[0].toLowerCase();
    if (row.includes("phase 7a signed-evidence design")) {
      phaseStatus.phase_7a_signed_evidence_design = value;
    } else if (row.includes("7b wrapper verification")) {
      phaseStatus.phase_7b_wrapper_verification = value;
    } else if (row.includes("7c ed25519 primitive")) {
      phaseStatus.phase_7c_ed25519_primitive = value;
    } else if (row.includes("phase 7d schema candidate")) {
      phaseStatus.phase_7d_schema_candidate = value;
    } else if (row.includes("p7-adr0 trust model")) {
      phaseStatus.phase_7_adr0_local_v1_trust_model = value;
    }
  }

  const blockedMatch = planText.match(
    /##\s*Blocked future packets[\s\S]*?(?:\n##\s|$)/u,
  );
  const blockedFuturePackets = blockedMatch
    ? [...blockedMatch[0].matchAll(/\b(P7-[A-Z0-9-]+)\b/gu)].map((match) => match[1])
    : [];

  const packetHeaders = [...planText.matchAll(/^###\s*\d+\)\s*(P7-[A-Z0-9-]+)/gm)];
  const sectionBoundaryHeaders = [
    ...planText.matchAll(/^###\s*\d+\)\s*(P7-[A-Z0-9-]+)/gm),
    ...planText.matchAll(/^##\s+[^\n]*$/gm),
  ].sort((left, right) => left.index - right.index);
  const sectionById = {};
  for (let index = 0; index < packetHeaders.length; index += 1) {
    const headerMatch = packetHeaders[index];
    const packetId = headerMatch[1];
    const sectionStart = headerMatch.index;
    const nextBoundary = sectionBoundaryHeaders.find(
      (boundaryMatch) =>
        typeof boundaryMatch.index === "number" && boundaryMatch.index > sectionStart,
    );
    const sectionEnd = nextBoundary?.index ?? planText.length;
    const sectionText = planText.slice(sectionStart, sectionEnd);
    sectionById[packetId] = parsePlanPacketSection(packetId, sectionText, errors);
  }

  return { headings, phaseStatus, blockedFuturePackets, sectionById };
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
    return false;
  }
  return true;
}

function assertObject(value, path, errors) {
  return assert(isRecord(value), `${path}: expected object`, errors);
}

function assertArray(value, path, errors) {
  return assert(Array.isArray(value), `${path}: expected array`, errors);
}

function assertOnlyKeys(value, expectedKeys, path, errors) {
  const keys = Object.keys(value);
  assert(keys.length === expectedKeys.length, `${path}: unexpected key count`, errors);

  for (const key of expectedKeys) {
    assert(Object.hasOwn(value, key), `${path}: missing key ${key}`, errors);
  }

  for (const key of keys) {
    assert(expectedKeys.includes(key), `${path}: unexpected key ${key}`, errors);
  }

  for (let index = 0; index < expectedKeys.length; index += 1) {
    assert(keys[index] === expectedKeys[index], `${path}: key order mismatch`, errors);
  }
}

function assertStatusEnum(value, enumValues, path, errors) {
  assert(enumValues.includes(value), `${path}: ${value} not in expected enum`, errors);
}

function runGit(root, args, { encoding = "utf8" } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    env: createIsolatedGitEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? (encoding === null ? Buffer.alloc(0) : ""),
    stderr: result.stderr ?? (encoding === null ? Buffer.alloc(0) : ""),
    error: result.error,
  };
}

function validateGitRepositoryBoundary(repoRoot, gitRoot, errors) {
  const topLevel = runGit(gitRoot, ["rev-parse", "--show-toplevel"]);
  let topLevelMatches = false;
  if (topLevel.ok) {
    try {
      topLevelMatches =
        realpathSync(topLevel.stdout.trim()) === realpathSync(repoRoot) &&
        realpathSync(gitRoot) === realpathSync(repoRoot);
    } catch {
      topLevelMatches = false;
    }
  }
  assert(
    topLevelMatches,
    "ledger.packet_provenance: source root must equal Git top-level",
    errors,
  );

  const replaceRefs = runGit(gitRoot, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace",
  ]);
  assert(
    replaceRefs.ok && replaceRefs.stdout.trim() === "",
    "ledger.packet_provenance: replacement refs are forbidden",
    errors,
  );
  for (const [gitPath, label] of [
    ["info/grafts", "grafts file"],
    ["objects/info/alternates", "object alternates file"],
  ]) {
    const pathResult = runGit(gitRoot, ["rev-parse", "--git-path", gitPath]);
    assert(
      pathResult.ok && !existsSync(resolve(gitRoot, pathResult.stdout.trim())),
      `ledger.packet_provenance: ${label} is forbidden`,
      errors,
    );
  }
}

function gitFailure(result) {
  if (result.error) {
    return String(result.error);
  }
  const stderr = Buffer.isBuffer(result.stderr)
    ? result.stderr.toString("utf8")
    : result.stderr;
  return stderr.trim() || `git exited with status ${String(result.status)}`;
}

function comparePaths(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function isSafeRepositoryPath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    posix.normalize(value) !== value
  ) {
    return false;
  }
  const segments = value.split("/");
  return (
    segments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    ) && segments[0] !== ".git"
  );
}

function parseFirstParentChanges(root, commit, errors, path) {
  const result = runGit(
    root,
    [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "-r",
      "--first-parent",
      "--no-renames",
      "-z",
      `${commit}^`,
      commit,
    ],
    { encoding: null },
  );
  if (!result.ok) {
    errors.push(`${path}: unable to read first-parent changes (${gitFailure(result)})`);
    return null;
  }

  const fields = result.stdout.toString("utf8").split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }
  if (fields.length % 2 !== 0) {
    errors.push(`${path}: malformed git diff-tree output`);
    return null;
  }

  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const changedPath = fields[index + 1];
    assert(
      status === "A" || status === "M",
      `${path}: completion commit changes must be only A/M; found ${status} ${changedPath}`,
      errors,
    );
    changes.push({ status, path: changedPath });
  }
  return changes;
}

function validatePacketProvenance(
  gitRoot,
  ledger,
  errors,
  { publicSnapshotActive = false } = {},
) {
  if (!isRecord(ledger) || !Array.isArray(ledger.packets)) {
    return;
  }

  if (!assertArray(ledger.packet_provenance, "ledger.packet_provenance", errors)) {
    return;
  }

  const workTreeResult = runGit(gitRoot, ["rev-parse", "--is-inside-work-tree"]);
  if (
    !assert(
      workTreeResult.ok && workTreeResult.stdout.trim() === "true",
      "ledger.packet_provenance: git root must be inside a work tree",
      errors,
    )
  ) {
    return;
  }

  const shallowResult = runGit(gitRoot, ["rev-parse", "--is-shallow-repository"]);
  if (!shallowResult.ok) {
    errors.push(
      `ledger.packet_provenance: unable to inspect git repository (${gitFailure(shallowResult)})`,
    );
    return;
  }
  if (
    !assert(
      shallowResult.stdout.trim() === "false",
      "ledger.packet_provenance: git checkout must be non-shallow",
      errors,
    )
  ) {
    return;
  }

  const headResult = runGit(gitRoot, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!headResult.ok) {
    errors.push(
      `ledger.packet_provenance: unable to resolve HEAD (${gitFailure(headResult)})`,
    );
    return;
  }

  const completedPackets = ledger.packets.filter(
    (packet) => isRecord(packet) && packet.status === "complete",
  );
  const expectedPacketIds = completedPackets.map((packet) => packet.packet_id);
  const provenanceByPacket = new Map();
  const actualPacketIds = [];
  const seenRevisions = new Set();

  for (let index = 0; index < ledger.packet_provenance.length; index += 1) {
    const entry = ledger.packet_provenance[index];
    const entryPath = `ledger.packet_provenance[${index}]`;
    if (!assertObject(entry, entryPath, errors)) {
      continue;
    }
    assertOnlyKeys(
      entry,
      ["packet_id", "completion_revision", "protected_files"],
      entryPath,
      errors,
    );
    assert(
      typeof entry.packet_id === "string" && entry.packet_id.length > 0,
      `${entryPath}.packet_id: invalid packet_id`,
      errors,
    );
    assert(
      typeof entry.completion_revision === "string" &&
        GIT_COMMIT_PATTERN.test(entry.completion_revision),
      `${entryPath}.completion_revision: must be 40 lowercase hex characters`,
      errors,
    );
    assertArray(entry.protected_files, `${entryPath}.protected_files`, errors);

    if (typeof entry.completion_revision === "string") {
      if (seenRevisions.has(entry.completion_revision)) {
        errors.push(
          `ledger.packet_provenance: duplicate completion_revision ${entry.completion_revision}`,
        );
      }
      seenRevisions.add(entry.completion_revision);
    }

    actualPacketIds.push(entry.packet_id);
    if (provenanceByPacket.has(entry.packet_id)) {
      errors.push(`ledger.packet_provenance: duplicate packet_id ${entry.packet_id}`);
    }
    provenanceByPacket.set(entry.packet_id, entry);

    if (!Array.isArray(entry.protected_files)) {
      continue;
    }
    const listedPaths = [];
    const seenPaths = new Set();
    for (let fileIndex = 0; fileIndex < entry.protected_files.length; fileIndex += 1) {
      const changedFile = entry.protected_files[fileIndex];
      const filePath = `${entryPath}.protected_files[${fileIndex}]`;
      if (!assertObject(changedFile, filePath, errors)) {
        continue;
      }
      assertOnlyKeys(changedFile, ["path", "sha256"], filePath, errors);
      assert(
        isSafeRepositoryPath(changedFile.path),
        `${filePath}.path: must be a normalized safe repository-relative path`,
        errors,
      );
      assert(
        typeof changedFile.sha256 === "string" &&
          SHA256_PATTERN.test(changedFile.sha256),
        `${filePath}.sha256: must be sha256: plus 64 lowercase hex characters`,
        errors,
      );
      if (typeof changedFile.path === "string") {
        if (seenPaths.has(changedFile.path)) {
          errors.push(
            `${entryPath}.protected_files: duplicate path ${changedFile.path}`,
          );
        }
        seenPaths.add(changedFile.path);
        listedPaths.push(changedFile.path);
      }
    }
    assert(
      listedPaths.every(
        (listedPath, fileIndex) =>
          fileIndex === 0 || comparePaths(listedPaths[fileIndex - 1], listedPath) < 0,
      ),
      `${entryPath}.protected_files: paths must be strictly sorted`,
      errors,
    );
  }

  assert(
    arraysEqualByJSON(actualPacketIds, expectedPacketIds),
    "ledger.packet_provenance: packet order must exactly match completed ledger packets",
    errors,
  );

  if (publicSnapshotActive) {
    return;
  }

  for (const packet of completedPackets) {
    const entry = provenanceByPacket.get(packet.packet_id);
    if (!isRecord(entry) || !GIT_COMMIT_PATTERN.test(entry.completion_revision ?? "")) {
      continue;
    }
    const entryPath = `ledger.packet_provenance:${packet.packet_id}`;
    const commit = entry.completion_revision;

    const existsResult = runGit(gitRoot, ["cat-file", "-e", `${commit}^{commit}`]);
    if (
      !assert(existsResult.ok, `${entryPath}: completion commit does not exist`, errors)
    ) {
      continue;
    }

    const parentsResult = runGit(gitRoot, ["rev-list", "--parents", "-n", "1", commit]);
    if (!parentsResult.ok) {
      errors.push(`${entryPath}: unable to inspect completion commit parents`);
      continue;
    }
    const commitAndParents = parentsResult.stdout.trim().split(/\s+/u);
    assert(
      commitAndParents.length === 2,
      `${entryPath}: completion commit must have exactly one parent`,
      errors,
    );

    const ancestorResult = runGit(gitRoot, [
      "merge-base",
      "--is-ancestor",
      commit,
      "HEAD",
    ]);
    assert(
      ancestorResult.ok,
      `${entryPath}: completion commit must be an ancestor of HEAD`,
      errors,
    );

    for (const prerequisiteId of Array.isArray(packet.prerequisites)
      ? packet.prerequisites
      : []) {
      const prerequisite = provenanceByPacket.get(prerequisiteId);
      if (
        !isRecord(prerequisite) ||
        !GIT_COMMIT_PATTERN.test(prerequisite.completion_revision ?? "")
      ) {
        errors.push(
          `${entryPath}: completed prerequisite ${prerequisiteId} lacks provenance`,
        );
        continue;
      }
      const prerequisiteResult = runGit(gitRoot, [
        "merge-base",
        "--is-ancestor",
        prerequisite.completion_revision,
        commit,
      ]);
      assert(
        prerequisiteResult.ok,
        `${entryPath}: prerequisite ${prerequisiteId} completion must be an ancestor`,
        errors,
      );
    }

    const changes = parseFirstParentChanges(gitRoot, commit, errors, entryPath);
    if (!changes || !Array.isArray(entry.protected_files)) {
      continue;
    }
    const actualPaths = changes.map((change) => change.path).sort(comparePaths);
    const listedPaths = entry.protected_files
      .filter((changedFile) => isRecord(changedFile))
      .map((changedFile) => changedFile.path);
    assert(
      arraysEqualByJSON(listedPaths, actualPaths),
      `${entryPath}: protected_files must exactly match first-parent A/M paths`,
      errors,
    );

    for (const changedFile of entry.protected_files) {
      if (
        !isRecord(changedFile) ||
        !isSafeRepositoryPath(changedFile.path) ||
        !SHA256_PATTERN.test(changedFile.sha256 ?? "")
      ) {
        continue;
      }
      const blobResult = runGit(
        gitRoot,
        ["cat-file", "blob", `${commit}:${changedFile.path}`],
        { encoding: null },
      );
      if (!blobResult.ok) {
        errors.push(`${entryPath}: unable to read raw blob for ${changedFile.path}`);
        continue;
      }
      const actualDigest = createHash("sha256").update(blobResult.stdout).digest("hex");
      assert(
        changedFile.sha256 === `sha256:${actualDigest}`,
        `${entryPath}: raw blob SHA-256 mismatch for ${changedFile.path}`,
        errors,
      );
    }
  }
}

function assertBooleanFalse(text, identifier, path, errors) {
  const falseMatcher = new RegExp(
    `${escapeRegExp(identifier)}\\s*[:=]\\s*false\\b`,
    "u",
  );
  const trueMatcher = new RegExp(`${escapeRegExp(identifier)}\\s*[:=]\\s*true\\b`, "u");
  assert(
    falseMatcher.test(text),
    `${path}: ${identifier} must be configured as false`,
    errors,
  );
  assert(!trueMatcher.test(text), `${path}: ${identifier} must remain false`, errors);
}

function parseJsonlLines(rawText, path, errors) {
  const lines = rawText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const parsed = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    try {
      parsed.push(JSON.parse(line));
    } catch {
      assert(false, `${path}: unable to parse jsonl line ${index + 1}`, errors);
      return null;
    }
  }

  return parsed;
}

function validateLedger(ledgerPath, expectedStatus, errors) {
  const canonicalPacketOrder = new Set(EXPECTED_PACKET_IDS);
  let ledger = null;

  try {
    ledger = readJson(ledgerPath);
  } catch (error) {
    errors.push(
      `ledger: unable to parse docs/reference/phase7-readiness.json (${String(error)})`,
    );
    return null;
  }

  if (!assertObject(ledger, "ledger", errors)) {
    return null;
  }

  const topLevelKeys = Object.keys(ledger);
  const legacyTopKeys = [...LEDGER_KEY_ORDER];
  assertOnlyKeys(ledger, legacyTopKeys, "ledger", errors);

  assertArray(ledger.status_vocabulary, "ledger.status_vocabulary", errors);
  if (Array.isArray(ledger.status_vocabulary)) {
    assert(
      arraysEqualByJSON(ledger.status_vocabulary, STATUS_VOCABULARY),
      `ledger.status_vocabulary: must exactly match required vocabulary`,
      errors,
    );
  }

  assert(
    ledger.schema_version === EXPECTED_SCHEMA_VERSION,
    `ledger.schema_version: must be ${EXPECTED_SCHEMA_VERSION}`,
    errors,
  );

  assertArray(ledger.packet_provenance, "ledger.packet_provenance", errors);

  assertObject(ledger.phase_status, "ledger.phase_status", errors);
  if (isRecord(ledger.phase_status)) {
    assertOnlyKeys(
      ledger.phase_status,
      LEDGER_PHASE_STATUS_FIELDS,
      "ledger.phase_status",
      errors,
    );
    for (const [key, expected] of Object.entries(EXPECTED_PHASE_STATUS)) {
      assert(
        ledger.phase_status[key] === expected,
        `ledger.phase_status.${key}: must be ${expected}`,
        errors,
      );
      assertStatusEnum(
        ledger.phase_status[key],
        STATUS_VOCABULARY,
        `ledger.phase_status.${key}`,
        errors,
      );
    }
  }

  assertObject(ledger.trust_model, "ledger.trust_model", errors);
  if (isRecord(ledger.trust_model)) {
    assertOnlyKeys(
      ledger.trust_model,
      Object.keys(EXPECTED_TRUST_MODEL),
      "ledger.trust_model",
      errors,
    );
    for (const [name, expected] of Object.entries(EXPECTED_TRUST_MODEL)) {
      const actual = ledger.trust_model[name];
      const matches = Array.isArray(expected)
        ? arraysEqualByJSON(actual, expected)
        : actual === expected;
      assert(matches, `ledger.trust_model.${name}: unexpected value`, errors);
    }
  }

  assertObject(ledger.runtime_truth, "ledger.runtime_truth", errors);
  if (isRecord(ledger.runtime_truth)) {
    assertOnlyKeys(
      ledger.runtime_truth,
      EXPECTED_RUNTIME_TRUTH_KEYS,
      "ledger.runtime_truth",
      errors,
    );
    for (const [name, expected] of Object.entries(EXPECTED_RUNTIME_TRUTH)) {
      assert(
        ledger.runtime_truth[name] === expected,
        `ledger.runtime_truth.${name}: must be ${expected}`,
        errors,
      );
    }
  }

  assertObject(ledger.authority_transitions, "ledger.authority_transitions", errors);
  if (isRecord(ledger.authority_transitions)) {
    assertOnlyKeys(
      ledger.authority_transitions,
      Object.keys(EXPECTED_AUTHORITY_TRANSITIONS),
      "ledger.authority_transitions",
      errors,
    );
    for (const [name, expected] of Object.entries(EXPECTED_AUTHORITY_TRANSITIONS)) {
      assert(
        ledger.authority_transitions[name] === expected,
        `ledger.authority_transitions.${name}: must be ${expected}`,
        errors,
      );
    }
  }

  assert(
    ledger.current_executable_packet === null,
    "ledger.current_executable_packet: must be null after P7-X1",
    errors,
  );

  const packetList = ledger.packets;
  assertArray(packetList, "ledger.packets", errors);
  if (Array.isArray(packetList)) {
    assert(
      packetList.length === EXPECTED_PACKETS.length,
      "ledger.packets: unexpected packet count",
      errors,
    );

    const packetById = new Map();
    const packetOrder = [];
    for (let index = 0; index < packetList.length; index += 1) {
      const packet = packetList[index];
      const path = `ledger.packets[${index}]`;
      if (!assertObject(packet, path, errors)) {
        continue;
      }
      assertOnlyKeys(
        packet,
        ["packet_id", "status", "executable", "prerequisites", "approval_gate_ids"],
        path,
        errors,
      );
      assert(
        typeof packet.packet_id === "string" && packet.packet_id.length > 0,
        `${path}.packet_id: invalid packet_id`,
        errors,
      );
      assert(
        Array.isArray(packet.prerequisites),
        `${path}.prerequisites: must be array`,
        errors,
      );
      assert(
        Array.isArray(packet.approval_gate_ids),
        `${path}.approval_gate_ids: must be array`,
        errors,
      );
      assertStatusEnum(packet.status, STATUS_VOCABULARY, `${path}.status`, errors);
      assert(
        typeof packet.executable === "boolean",
        `${path}.executable: must be boolean`,
        errors,
      );

      packetOrder.push(packet.packet_id);
      if (packetById.has(packet.packet_id)) {
        errors.push(`ledger.packets: duplicate packet_id ${packet.packet_id}`);
      }
      packetById.set(packet.packet_id, packet);
    }

    assert(
      arraysEqualByJSON(packetOrder, EXPECTED_PACKET_IDS),
      "ledger.packets: packet order must match contract",
      errors,
    );

    for (const expected of EXPECTED_PACKETS) {
      const actual = packetById.get(expected.packet_id);
      if (
        !assert(actual, `ledger.packets: missing packet ${expected.packet_id}`, errors)
      ) {
        continue;
      }
      assert(
        actual.status === expected.status,
        `ledger.packets:${expected.packet_id}.status: must be ${expected.status}`,
        errors,
      );
      assert(
        actual.executable === expected.executable,
        `ledger.packets:${expected.packet_id}.executable: mismatch`,
        errors,
      );
      assert(
        arraysEqualByJSON(actual.prerequisites, expected.prerequisites),
        `ledger.packets:${expected.packet_id}.prerequisites: mismatch`,
        errors,
      );
      assert(
        arraysEqualByJSON(actual.approval_gate_ids, expected.approval_gate_ids),
        `ledger.packets:${expected.packet_id}.approval_gate_ids: mismatch`,
        errors,
      );
    }

    for (const id of packetOrder) {
      const packet = packetById.get(id);
      if (!packet) {
        continue;
      }
      if (!EXPECTED_COMPLETE_PACKETS.includes(packet.packet_id)) {
        assert(
          packet.status !== "complete",
          `ledger.packet:${id}: no future packet may be complete`,
          errors,
        );
        assert(
          packet.executable === false,
          `ledger.packet:${id}: future packets must be non-executable`,
          errors,
        );
      }
    }

    for (const packet of packetList) {
      if (!isRecord(packet) || !packet.packet_id) {
        continue;
      }
      for (const prerequisite of packet.prerequisites) {
        const prereq = packetById.get(prerequisite);
        if (!prereq) {
          errors.push(
            `ledger.packet:${packet.packet_id}: unknown prerequisite ${prerequisite}`,
          );
          continue;
        }
        if (prereq.status !== "complete") {
          assert(
            packet.executable === false,
            `ledger.packet:${packet.packet_id}: blocked by incomplete prerequisite ${prerequisite}`,
            errors,
          );
        }
      }
    }
    for (const prerequisite of EXPECTED_BLOCKED_PACKETS) {
      const packet = packetById.get(prerequisite);
      if (!packet) {
        continue;
      }
      assert(
        packet.status === "blocked_pending_explicit_input",
        `ledger.blocked_future_packets:${prerequisite}: blocked status required`,
        errors,
      );
      assert(
        packet.executable === false,
        `ledger.blocked_future_packets:${prerequisite}: non-executable required`,
        errors,
      );
    }
  }

  assertArray(ledger.blocked_future_packets, "ledger.blocked_future_packets", errors);
  if (Array.isArray(ledger.blocked_future_packets)) {
    assert(
      arraysEqualByJSON(ledger.blocked_future_packets, EXPECTED_BLOCKED_PACKETS),
      "ledger.blocked_future_packets: must equal P7 future packets",
      errors,
    );
    for (const packetId of ledger.blocked_future_packets) {
      assert(
        canonicalPacketOrder.has(packetId),
        `ledger.blocked_future_packets: unknown packet ${packetId}`,
        errors,
      );
    }
  }

  assertArray(ledger.superseded_packets, "ledger.superseded_packets", errors);
  if (Array.isArray(ledger.superseded_packets)) {
    assert(
      ledger.superseded_packets.length === 1,
      "ledger.superseded_packets: expected exactly P7-P1",
      errors,
    );
    const [superseded] = ledger.superseded_packets;
    if (assertObject(superseded, "ledger.superseded_packets[0]", errors)) {
      assertOnlyKeys(
        superseded,
        ["packet_id", "superseded_by", "status", "authority_granted"],
        "ledger.superseded_packets[0]",
        errors,
      );
      assert(
        superseded.packet_id === "P7-P1",
        "ledger.superseded_packets[0].packet_id: must be P7-P1",
        errors,
      );
      assert(
        superseded.superseded_by === "P7-K1",
        "ledger.superseded_packets[0].superseded_by: must be P7-K1",
        errors,
      );
      assert(
        superseded.status === "superseded_non_authorizing",
        "ledger.superseded_packets[0].status: must be superseded_non_authorizing",
        errors,
      );
      assert(
        superseded.authority_granted === false,
        "ledger.superseded_packets[0].authority_granted: must be false",
        errors,
      );
    }
  }

  const expectedReleaseLanes = {
    local_v1_core: {
      packet_ids: ["P7-M1", "P7-N1", "P7-B1", "P7-C1", "P7-A1", "P7-R1", "P7-X1"],
      blocks_supported_local_release: true,
      portable_signed_approval_required: false,
    },
    optional_signed_evidence: {
      packet_ids: ["P7-K1", "P7-S1", "P7-V1", "P7-I1"],
      blocks_supported_local_release: false,
      private_key_custody_allowed: false,
    },
    post_local_v1: {
      capabilities: [
        "hardware_environment_attestation",
        "postgresql_ha",
        "fleet_management",
        "multi_tenancy",
        "contractual_rpo_rto",
        "centralized_siem_alerting",
        "legal_hold",
        "cross_region_failover",
        "unselected_distribution_rows",
      ],
      blocks_supported_local_release: false,
    },
  };
  assertObject(ledger.release_lanes, "ledger.release_lanes", errors);
  if (isRecord(ledger.release_lanes)) {
    assertOnlyKeys(
      ledger.release_lanes,
      Object.keys(expectedReleaseLanes),
      "ledger.release_lanes",
      errors,
    );
    for (const [laneName, expectedLane] of Object.entries(expectedReleaseLanes)) {
      const lane = ledger.release_lanes[laneName];
      if (!assertObject(lane, `ledger.release_lanes.${laneName}`, errors)) {
        continue;
      }
      assertOnlyKeys(
        lane,
        Object.keys(expectedLane),
        `ledger.release_lanes.${laneName}`,
        errors,
      );
      for (const [name, expected] of Object.entries(expectedLane)) {
        const actual = lane[name];
        const matches = Array.isArray(expected)
          ? arraysEqualByJSON(actual, expected)
          : actual === expected;
        assert(
          matches,
          `ledger.release_lanes.${laneName}.${name}: unexpected value`,
          errors,
        );
      }
    }
  }

  assertArray(ledger.approval_gates, "ledger.approval_gates", errors);
  if (Array.isArray(ledger.approval_gates)) {
    assert(
      ledger.approval_gates.length === EXPECTED_GATE_IDS.length,
      "ledger.approval_gates: unexpected gate count",
      errors,
    );
    const observedGateIds = [];
    const observedGateOrder = new Set();
    for (let index = 0; index < ledger.approval_gates.length; index += 1) {
      const gate = ledger.approval_gates[index];
      const path = `ledger.approval_gates[${index}]`;
      if (!assertObject(gate, path, errors)) {
        continue;
      }
      assertOnlyKeys(gate, ["gate_id", "title", "status", "granted"], path, errors);
      assert(
        typeof gate.gate_id === "string",
        `${path}.gate_id: must be string`,
        errors,
      );
      assert(
        gate.title === EXPECTED_GATE_TITLES[gate.gate_id],
        `${path}.title: unexpected title for ${gate.gate_id}`,
        errors,
      );
      observedGateIds.push(gate.gate_id);
      observedGateOrder.add(gate.gate_id);
      const expectedGateState = EXPECTED_GATE_STATE[gate.gate_id];
      assert(
        expectedGateState !== undefined && gate.status === expectedGateState.status,
        `${path}.status: unexpected state`,
        errors,
      );
      assert(
        expectedGateState !== undefined && gate.granted === expectedGateState.granted,
        `${path}.granted: unexpected value`,
        errors,
      );
    }
    assert(
      arraysEqualByJSON(observedGateIds, EXPECTED_GATE_IDS),
      "ledger.approval_gates: gate order must match contract",
      errors,
    );
    for (const gateId of EXPECTED_GATE_IDS) {
      assert(
        observedGateOrder.has(gateId),
        `ledger.approval_gates: missing ${gateId}`,
        errors,
      );
    }
  }

  const packetIdsInLedger = Array.isArray(ledger.packets)
    ? ledger.packets.map((packet) => packet.packet_id)
    : [];
  expectedStatus.packetIdsInLedger = packetIdsInLedger;
  expectedStatus.phaseStatus = ledger.phase_status;

  return ledger;
}

function validatePlan(planPath, ledger, errors) {
  let planText = "";
  try {
    planText = readText(planPath);
  } catch (error) {
    errors.push(`plan: unable to read architecture plan (${String(error)})`);
    return null;
  }

  const normalized = planText.replace(/`/gu, "");
  assert(
    normalized.includes(CANONICAL_SENTENCE),
    "plan: canonical sentence missing",
    errors,
  );

  const { headings, phaseStatus, blockedFuturePackets, sectionById } = findPlanSections(
    planText,
    errors,
  );

  assert(
    arraysEqualByJSON(headings, EXPECTED_PACKET_IDS),
    "plan: packet headings must match expected order",
    errors,
  );
  assert(
    arraysEqualByJSON(blockedFuturePackets, EXPECTED_BLOCKED_PACKETS),
    "plan: blocked_future_packets list mismatch",
    errors,
  );

  for (const key of PLAN_PHASE_STATUS_FIELDS) {
    assert(
      phaseStatus[key] === EXPECTED_PHASE_STATUS[key],
      `plan: ${key} must be ${EXPECTED_PHASE_STATUS[key]}`,
      errors,
    );
  }

  if (ledger && Array.isArray(ledger.packets)) {
    const ledgerIds = ledger.packets.map((packet) => packet.packet_id);
    assert(
      arraysEqualByJSON(headings, ledgerIds),
      "plan/ledger: packet references mismatch",
      errors,
    );
  }

  const expectedPacketsById = new Map(
    EXPECTED_PACKETS.map((packet) => [packet.packet_id, packet]),
  );
  for (const packetId of headings) {
    const section = sectionById[packetId];
    const expected = expectedPacketsById.get(packetId);
    if (!section || !expected) {
      continue;
    }
    assert(
      section.status === expected.status,
      `plan packet ${packetId}: status must be ${expected.status}`,
      errors,
    );
    if (typeof section.executable === "boolean") {
      assert(
        section.executable === expected.executable,
        `plan packet ${packetId}: executable must be ${expected.executable}`,
        errors,
      );
    }
    assertArray(
      section.prerequisites,
      `plan packet ${packetId}: prerequisites`,
      errors,
    );
    if (Array.isArray(section.prerequisites)) {
      assert(
        arraysEqualByJSON(section.prerequisites, expected.prerequisites),
        `plan packet ${packetId}: prerequisites mismatch`,
        errors,
      );
    }
    assertArray(
      section.approval_gate_ids,
      `plan packet ${packetId}: approval_gate_ids`,
      errors,
    );
    if (Array.isArray(section.approval_gate_ids)) {
      assert(
        arraysEqualByJSON(section.approval_gate_ids, expected.approval_gate_ids),
        `plan packet ${packetId}: approval_gate_ids mismatch`,
        errors,
      );
    }
    assertStatusEnum(
      section.status,
      STATUS_VOCABULARY,
      `plan packet ${packetId}.status`,
      errors,
    );
  }

  return { phaseStatus, headings };
}

function assertFilePathOrError(path, errors) {
  assert(existsSync(path), `${path}: missing`, errors);
}

function validateSources(root, errors) {
  const libPath = resolve(root, "crates/lnsat-store/src/lib.rs");
  const phase7PersistencePath = resolve(
    root,
    "crates/lnsat-store/src/phase7_persistence.rs",
  );
  const phase7NoncePath = resolve(root, "crates/lnsat-store/src/phase7_nonce.rs");
  const phase7ConsumptionPath = resolve(
    root,
    "crates/lnsat-store/src/phase7_consumption.rs",
  );
  const phase7AtomicConsumptionTestPath = resolve(
    root,
    "crates/lnsat-store/src/tests/phase7_atomic_consumption.rs",
  );
  const phase7LocalAuthorizationTestPath = resolve(
    root,
    "crates/lnsat-store/src/tests/phase7_local_authorization.rs",
  );
  const gatewayPath = resolve(root, "crates/lnsatd/src/lib.rs");
  const phase7dCandidateTestPath = resolve(
    root,
    "crates/lnsat-store/src/tests/phase7d_signed_candidate.rs",
  );
  const signerPath = resolve(root, "packages/policy/src/signer-provider.ts");
  const signedApprovalPath = resolve(
    root,
    "packages/policy/src/signed-approval-evidence-v1.ts",
  );
  const roadmapPath = resolve(root, "docs/ROADMAP.md");
  const projectStatusPath = resolve(root, "docs/PROJECT_STATUS.md");
  const adr6Path = resolve(
    root,
    "docs/architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md",
  );
  const migrationsPath = resolve(root, "crates/lnsat-store/migrations");
  const migration0016Path = resolve(
    root,
    "crates/lnsat-store/migrations/0016_phase7_core_persistence.sql",
  );
  const migration0017Path = resolve(
    root,
    "crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql",
  );
  const signedApprovalFixturePath = resolve(root, SIGNED_APPROVAL_FIXTURE_PATH);
  const candidateFixturePath =
    "crates/lnsat-store/tests/fixtures/phase7d_public_material_schema_candidate.sql";
  const candidateFixture = resolve(root, candidateFixturePath);

  for (const path of [
    libPath,
    phase7PersistencePath,
    phase7NoncePath,
    phase7ConsumptionPath,
    phase7AtomicConsumptionTestPath,
    phase7LocalAuthorizationTestPath,
    gatewayPath,
    phase7dCandidateTestPath,
    signerPath,
    signedApprovalPath,
    roadmapPath,
    projectStatusPath,
    adr6Path,
    migrationsPath,
    migration0016Path,
    migration0017Path,
    signedApprovalFixturePath,
    candidateFixture,
  ]) {
    assertFilePathOrError(path, errors);
  }

  let roadmapText = "";
  let projectStatusText = "";
  let adr6Text = "";
  let libText = "";
  let phase7PersistenceText = "";
  let phase7NonceText = "";
  let phase7ConsumptionText = "";
  let phase7AtomicConsumptionTestText = "";
  let phase7LocalAuthorizationTestText = "";
  let gatewayText = "";
  let phase7dCandidateTestText = "";
  let migration0016Text = "";
  let migration0017Text = "";
  let candidateFixtureText = "";
  let signerText = "";
  let signedApprovalText = "";
  let signedApprovalFixtureText = "";
  try {
    roadmapText = readText(roadmapPath);
    projectStatusText = readText(projectStatusPath);
    adr6Text = readText(adr6Path);
    libText = readText(libPath);
    phase7PersistenceText = readText(phase7PersistencePath);
    phase7NonceText = readText(phase7NoncePath);
    phase7ConsumptionText = readText(phase7ConsumptionPath);
    phase7AtomicConsumptionTestText = readText(phase7AtomicConsumptionTestPath);
    phase7LocalAuthorizationTestText = readText(phase7LocalAuthorizationTestPath);
    gatewayText = readText(gatewayPath);
    phase7dCandidateTestText = readText(phase7dCandidateTestPath);
    migration0016Text = readText(migration0016Path);
    migration0017Text = readText(migration0017Path);
    candidateFixtureText = readText(candidateFixture);
    signerText = readText(signerPath);
    signedApprovalText = readText(signedApprovalPath);
    signedApprovalFixtureText = readText(signedApprovalFixturePath);
  } catch {
    return;
  }

  assert(
    roadmapText.includes(CANONICAL_SENTENCE),
    "docs/ROADMAP.md: canonical readiness sentence missing",
    errors,
  );
  assert(
    projectStatusText.includes(CANONICAL_SENTENCE),
    "docs/PROJECT_STATUS.md: canonical readiness sentence missing",
    errors,
  );
  for (const marker of [
    "local_session_and_external_signature",
    "Private keys remain user/operator owned",
    "one server-side authorization record",
    "Migration 0017",
    "Migration 0018",
    "`P7-X1` does not depend on `P7-K1`",
    "No public material is requested now",
    "bounded local Git commit",
  ]) {
    assert(
      adr6Text.includes(marker),
      `ADR-0006: missing required marker ${marker}`,
      errors,
    );
  }
  assert(
    /pub const SQLITE_SCHEMA_VERSION: i64 = 17;/.test(libText),
    "crates/lnsat-store/src/lib.rs: SQLITE_SCHEMA_VERSION must be 17",
    errors,
  );
  assert(
    /const MIGRATIONS:\s*\[Migration; 17\]/.test(libText),
    "crates/lnsat-store/src/lib.rs: MIGRATIONS must be [Migration; 17]",
    errors,
  );
  assert(
    libText.includes("mod phase7_consumption;") &&
      libText.includes("Phase7CapabilitySecretV1") &&
      libText.includes("Phase7CapabilityRedemptionInputV1") &&
      libText.includes("Phase7ExecutionAuthorizationIssueInputV1") &&
      libText.includes("Phase7ExecutionAuthorizationTransitionInputV1") &&
      libText.includes("Phase7ExecutionCapabilityWireV1"),
    "crates/lnsat-store/src/lib.rs: P7-C1/P7-A1 source-only exports missing",
    errors,
  );

  const cfgTestMatch = libText.match(/#\[cfg\(test\)\]\s*mod\s+tests\s*\{/u);
  assert(
    cfgTestMatch !== null,
    "crates/lnsat-store/src/lib.rs: missing #[cfg(test)] mod tests",
    errors,
  );
  const cfgTestIndex = cfgTestMatch ? cfgTestMatch.index : -1;
  const phase7dVerifierMatch = phase7dCandidateTestText.match(
    /fn\s+phase7d_candidate_schema_verify\s*\(/u,
  );
  assert(
    phase7dVerifierMatch !== null,
    "crates/lnsat-store/src/tests/phase7d_signed_candidate.rs: missing phase7d_candidate_schema_verify",
    errors,
  );
  assert(
    cfgTestMatch !== null &&
      libText.indexOf("mod phase7d_signed_candidate;", cfgTestIndex) > cfgTestIndex,
    "crates/lnsat-store/src/lib.rs: phase7d candidate module must stay inside #[cfg(test)] mod tests",
    errors,
  );

  const includeMatches = [
    ...phase7dCandidateTestText.matchAll(
      /include_str!\("([^"]*phase7d_public_material_schema_candidate\.sql)"\)/gu,
    ),
  ];
  assert(
    includeMatches.length > 0,
    "crates/lnsat-store/src/tests/phase7d_signed_candidate.rs: missing candidate SQL include",
    errors,
  );
  for (const match of includeMatches) {
    const includePath = match[1];
    assert(
      includePath.includes("tests/fixtures"),
      "crates/lnsat-store/src/tests/phase7d_signed_candidate.rs: candidate SQL must be in tests fixtures",
      errors,
    );
  }

  const nonTestSourceMigrationIncludes = [
    ...libText.matchAll(/include_str!\("\.\.\/migrations\/0016_[^"]*"/gu),
  ];
  assert(
    nonTestSourceMigrationIncludes.length === 1 &&
      nonTestSourceMigrationIncludes[0][0].includes("0016_phase7_core_persistence.sql"),
    "crates/lnsat-store/src/lib.rs: exact core migration 0016 include required",
    errors,
  );
  const correctionMigrationIncludes = [
    ...libText.matchAll(/include_str!\("\.\.\/migrations\/0017_[^"]*"/gu),
  ];
  assert(
    correctionMigrationIncludes.length === 1 &&
      correctionMigrationIncludes[0][0].includes(
        "0017_phase7_core_semantics_correction.sql",
      ),
    "crates/lnsat-store/src/lib.rs: exact core correction migration 0017 include required",
    errors,
  );

  const nonTestMigrationIdMatches = [...libText.matchAll(/id:\s*"([^"]+)"/gu)].filter(
    (match) =>
      match.index !== undefined &&
      match.index < cfgTestIndex &&
      match[1].startsWith("0016_"),
  );
  assert(
    nonTestMigrationIdMatches.length === 1 &&
      nonTestMigrationIdMatches[0][1] === "0016_phase7_core_persistence",
    "crates/lnsat-store/src/lib.rs: exact core migration id 0016 required",
    errors,
  );
  const correctionMigrationIdMatches = [
    ...libText.matchAll(/id:\s*"([^"]+)"/gu),
  ].filter(
    (match) =>
      match.index !== undefined &&
      match.index < cfgTestIndex &&
      match[1].startsWith("0017_"),
  );
  assert(
    correctionMigrationIdMatches.length === 1 &&
      correctionMigrationIdMatches[0][1] === "0017_phase7_core_semantics_correction",
    "crates/lnsat-store/src/lib.rs: exact core correction migration id 0017 required",
    errors,
  );

  let migration0016Entries = [];
  if (existsSync(migrationsPath)) {
    try {
      migration0016Entries = readdirSync(migrationsPath).filter((entry) =>
        /^0016/u.test(entry),
      );
    } catch {
      errors.push("crates/lnsat-store/migrations: unable to read migration directory");
    }
  }
  assert(
    arraysEqualByJSON(migration0016Entries, ["0016_phase7_core_persistence.sql"]),
    "crates/lnsat-store/migrations: must contain only 0016_phase7_core_persistence.sql for version 0016",
    errors,
  );
  let migration0017Entries = [];
  if (existsSync(migrationsPath)) {
    try {
      migration0017Entries = readdirSync(migrationsPath).filter((entry) =>
        /^0017/u.test(entry),
      );
    } catch {
      errors.push("crates/lnsat-store/migrations: unable to read migration directory");
    }
  }
  assert(
    arraysEqualByJSON(migration0017Entries, [
      "0017_phase7_core_semantics_correction.sql",
    ]),
    "crates/lnsat-store/migrations: must contain only 0017_phase7_core_semantics_correction.sql for version 0017",
    errors,
  );

  assert(
    libText.includes("mod phase7_persistence;") &&
      libText.includes("MIGRATION_0016_SQL") &&
      libText.includes('id: "0016_phase7_core_persistence"') &&
      libText.includes("MIGRATION_0017_SQL") &&
      libText.includes('id: "0017_phase7_core_semantics_correction"'),
    "crates/lnsat-store/src/lib.rs: core v16/v17 migration registration missing",
    errors,
  );
  for (const marker of [
    "prepare_phase7_authorization_attempt_v1",
    "prepare_phase7_authorization_attempt_with_sources_v1",
    "read_phase7_authorization_attempt_v1",
    "validate_stored_attempt_v16",
    "has_legacy_phase7_evidence_v16",
    "execution_authorized: false",
  ]) {
    assert(
      phase7PersistenceText.includes(marker),
      `crates/lnsat-store/src/phase7_persistence.rs: missing ${marker}`,
      errors,
    );
  }
  assert(
    /#\[cfg\(test\)\]\s+pub\(super\)\s+fn\s+prepare_phase7_authorization_attempt_with_sources_v1\s*</u.test(
      phase7PersistenceText,
    ),
    "crates/lnsat-store/src/phase7_persistence.rs: prepare_phase7_authorization_attempt_with_sources_v1 must stay test-only",
    errors,
  );
  for (const marker of [
    "pub const PHASE7_NONCE_BYTES_V1: usize = 32;",
    "pub const PHASE7_NONCE_TTL_SECONDS_V1: u64 = 300;",
    "issue_phase7_authorization_nonce_v1",
    "read_phase7_authorization_nonce_v1",
    "cancel_phase7_authorization_nonce_v1",
    "getrandom::getrandom(bytes)",
    "Sha256::digest(raw_nonce.as_slice())",
    "hard_cap.min(attempt_expires)",
    'matches!(terminal.state.as_str(), "cancelled" | "expired")',
    '"nonce_active"',
  ]) {
    assert(
      phase7NonceText.includes(marker),
      `crates/lnsat-store/src/phase7_nonce.rs: missing ${marker}`,
      errors,
    );
  }
  for (const forbidden of [
    "private_key",
    "provider_calls",
    "adapter_dispatch",
    "execution_authorized: true",
  ]) {
    assert(
      !phase7NonceText.includes(forbidden),
      `crates/lnsat-store/src/phase7_nonce.rs: forbidden later-lane marker ${forbidden}`,
      errors,
    );
  }
  for (const marker of [
    "pub const PHASE7_CAPABILITY_BYTES_V1: usize = 32;",
    "pub const PHASE7_CAPABILITY_WIRE_HEX_BYTES_V1: usize =",
    "pub const PHASE7_AUTHORIZATION_TTL_SECONDS_V1: u64 = 60;",
    '"lnsat.phase7.capability.v1"',
    '"lnsat.phase7.capability-redemption-request.v1"',
    "subtle::ConstantTimeEq",
    "candidate.ct_eq(&dummy)",
    "take_from_bytes",
    "bytes.zeroize();",
    "Transaction::new_unchecked(connection, TransactionBehavior::Immediate)",
    "redeem_phase7_execution_capability_v1",
    "INSERT INTO lnsat_capability_consumptions",
    '"consumed"',
    '"capability_consumption_recorded"',
    '"capability_consumed"',
    "verify_phase7_consumption_records_v1",
    'const LOCAL_AUTHORIZATION_AUDIENCE: &str = "audience:gateway:local";',
    "Phase7ExecutionCapabilityV1",
    "Phase7ExecutionCapabilityWireV1",
    "Zeroizing",
    "into_canonical_wire_v1",
    "issue_phase7_local_execution_authorization_v1",
    "read_phase7_local_execution_authorization_v1",
    "cancel_phase7_local_execution_authorization_v1",
    "revoke_phase7_local_execution_authorization_v1",
    "redeem_phase7_local_execution_capability_v1",
    "getrandom::getrandom(bytes)",
  ]) {
    assert(
      phase7ConsumptionText.includes(marker),
      `crates/lnsat-store/src/phase7_consumption.rs: missing ${marker}`,
      errors,
    );
  }
  for (const forbidden of [
    "adapter_dispatch",
    "INSERT OR REPLACE",
    "operation_attempts (",
    "operation_receipts (",
    "operation_reconciliations (",
  ]) {
    assert(
      !phase7ConsumptionText.includes(forbidden),
      `crates/lnsat-store/src/phase7_consumption.rs: forbidden lane marker ${forbidden}`,
      errors,
    );
  }
  assert(
    phase7ConsumptionText.match(/getrandom::getrandom\(bytes\)/gu)?.length === 1,
    "crates/lnsat-store/src/phase7_consumption.rs: A1 must use exactly one OS CSPRNG call",
    errors,
  );
  const localIssueStart = phase7ConsumptionText.indexOf(
    "pub fn issue_phase7_local_execution_authorization_v1",
  );
  const localIssueEnd = phase7ConsumptionText.indexOf("#[cfg(test)]", localIssueStart);
  const localIssueText = phase7ConsumptionText.slice(localIssueStart, localIssueEnd);
  assert(
    localIssueStart >= 0 && localIssueText.includes("getrandom::getrandom(bytes)"),
    "crates/lnsat-store/src/phase7_consumption.rs: OS CSPRNG must stay in A1 issuance",
    errors,
  );
  const legacyRedemptionStart = phase7ConsumptionText.indexOf(
    "pub fn redeem_phase7_execution_capability_v1",
  );
  const legacyRedemptionEnd = phase7ConsumptionText.indexOf(
    "#[cfg(test)]",
    legacyRedemptionStart,
  );
  assert(
    legacyRedemptionStart >= 0 &&
      !phase7ConsumptionText
        .slice(legacyRedemptionStart, legacyRedemptionEnd)
        .includes("getrandom"),
    "crates/lnsat-store/src/phase7_consumption.rs: C1 redemption must remain entropy-free",
    errors,
  );
  assert(
    !/#\[derive\([^\]]*(?:Clone|Copy|Serialize|Deserialize)[^\]]*\)\]\s*pub struct Phase7CapabilitySecretV1/u.test(
      phase7ConsumptionText,
    ) &&
      !/impl\s+(?:Clone|Copy|Display)\s+for\s+Phase7CapabilitySecretV1/u.test(
        phase7ConsumptionText,
      ) &&
      !/pub\s+(?:const\s+)?fn\s+as_bytes\s*\(/u.test(phase7ConsumptionText),
    "crates/lnsat-store/src/phase7_consumption.rs: capability secret must stay non-cloneable, non-displayable, and non-readable",
    errors,
  );
  for (const secretType of [
    "Phase7ExecutionCapabilityV1",
    "Phase7ExecutionCapabilityWireV1",
  ]) {
    const unsafeDerive = new RegExp(
      String.raw`#\[derive\([^\]]*(?:Clone|Copy|Serialize|Deserialize)[^\]]*\)\]\s*pub struct ${secretType}`,
      "u",
    );
    const unsafeImpl = new RegExp(
      String.raw`impl\s+(?:Clone|Copy|Display|Serialize)\s+for\s+${secretType}`,
      "u",
    );
    assert(
      !unsafeDerive.test(phase7ConsumptionText) &&
        !unsafeImpl.test(phase7ConsumptionText),
      `crates/lnsat-store/src/phase7_consumption.rs: ${secretType} must stay non-cloneable and non-serializable`,
      errors,
    );
  }
  assert(
    /#\[cfg\(test\)\]\s+pub\(super\) fn redeem_phase7_execution_capability_with_sources_v1/u.test(
      phase7ConsumptionText,
    ),
    "crates/lnsat-store/src/phase7_consumption.rs: injected redemption sources must stay test-only",
    errors,
  );
  for (const testOnlyFunction of [
    "issue_phase7_local_execution_authorization_with_sources_v1",
    "transition_phase7_local_execution_authorization_with_sources_v1",
    "redeem_phase7_local_execution_capability_with_sources_v1",
  ]) {
    const testOnlyPattern = new RegExp(
      String.raw`#\[cfg\(test\)\][\s\S]{0,160}pub\(super\) fn ${testOnlyFunction}`,
      "u",
    );
    assert(
      testOnlyPattern.test(phase7ConsumptionText),
      `crates/lnsat-store/src/phase7_consumption.rs: ${testOnlyFunction} must stay test-only`,
      errors,
    );
  }
  const consumptionTestImplIndex = phase7ConsumptionText.lastIndexOf(
    "#[cfg(test)]\nimpl SqliteStore",
  );
  for (const testOnlyFunction of [
    "seed_phase7_execution_authorization_and_operation_v1",
    "append_phase7_authorization_terminal_for_test_v1",
  ]) {
    assert(
      consumptionTestImplIndex >= 0 &&
        phase7ConsumptionText.indexOf(testOnlyFunction) > consumptionTestImplIndex,
      `crates/lnsat-store/src/phase7_consumption.rs: ${testOnlyFunction} must stay test-only`,
      errors,
    );
  }
  for (const marker of [
    "Phase7CapabilitySecretV1",
    "RedemptionRejected",
    "IdempotencyConflict",
    "OutcomeAmbiguous",
    "INSERT OR REPLACE",
  ]) {
    assert(
      phase7AtomicConsumptionTestText.includes(marker),
      `crates/lnsat-store/src/tests/phase7_atomic_consumption.rs: missing ${marker}`,
      errors,
    );
  }
  for (const marker of [
    "phase7_local_authorization_issues_once_replays_metadata_and_freezes_wire",
    "phase7_local_authorization_redeem_requires_exact_live_requester_session",
    "phase7_local_authorization_cancel_revoke_and_c1_handoff_are_atomic",
    "phase7_local_authorization_terminal_transition_races_redemption_atomically",
    "phase7_local_authorization_rolls_back_and_postcommit_ambiguity_never_reissues",
    "phase7_local_authorization_restart_read_expiry_and_concurrency_hold",
  ]) {
    assert(
      phase7LocalAuthorizationTestText.includes(marker),
      `crates/lnsat-store/src/tests/phase7_local_authorization.rs: missing ${marker}`,
      errors,
    );
  }
  for (const marker of [
    "pub fn issue_local_browser_phase7_execution_authorization_v1",
    "pub fn read_local_browser_phase7_execution_authorization_v1",
    "pub fn cancel_local_browser_phase7_execution_authorization_v1",
    "pub fn revoke_local_browser_phase7_execution_authorization_v1",
    "pub fn redeem_local_browser_phase7_execution_capability_v1",
    "route_neutral_phase7_authorization_issues_reads_and_redeems_once",
    "route_neutral_phase7_authorization_collapses_cancel_revoke_and_wire_denials",
  ]) {
    assert(
      gatewayText.includes(marker),
      `crates/lnsatd/src/lib.rs: missing P7-A1 route-neutral marker ${marker}`,
      errors,
    );
  }
  for (const forbidden of [
    '"/v1/phase7',
    "LOCAL_PHASE7_GATEWAY_PATH",
    "PHASE7_AUTHORIZATION_GATEWAY_PATH",
  ]) {
    assert(
      !gatewayText.includes(forbidden),
      `crates/lnsatd/src/lib.rs: public P7-A1 route must remain closed (${forbidden})`,
      errors,
    );
  }
  for (const testOnlyFunction of [
    "issue_phase7_authorization_nonce_with_sources_v1",
    "read_phase7_authorization_nonce_at_v1",
    "cancel_phase7_authorization_nonce_at_v1",
  ]) {
    const testOnlyPattern = new RegExp(
      String.raw`#\[cfg\(test\)\]\s+pub\(super\)\s+fn\s+${testOnlyFunction}\s*<`,
      "u",
    );
    assert(
      testOnlyPattern.test(phase7NonceText),
      `crates/lnsat-store/src/phase7_nonce.rs: ${testOnlyFunction} must stay test-only`,
      errors,
    );
  }
  for (const marker of [
    "lnsat_authorization_attempts",
    "lnsat_authorization_nonces",
    "lnsat_execution_authorizations",
    "capability_digest",
    "lnsat_capability_consumptions",
    "lnsat_operations",
    "lnsat_operation_receipts",
    "lnsat_operation_reconciliations",
    "lnsat_phase7_audit_bindings",
    "PRAGMA user_version = 16",
  ]) {
    assert(
      migration0016Text.includes(marker),
      `crates/lnsat-store/migrations/0016_phase7_core_persistence.sql: missing ${marker}`,
      errors,
    );
  }
  for (const forbidden of [
    "private_key",
    "public_key",
    "signed_approval",
    "signature",
    "spki",
    "provider",
    "raw_capability",
    "capability_token",
  ]) {
    assert(
      !migration0016Text.toLowerCase().includes(forbidden),
      `crates/lnsat-store/migrations/0016_phase7_core_persistence.sql: forbidden signed-lane field ${forbidden}`,
      errors,
    );
  }
  for (const marker of [
    "lnsat_migration_0017_legacy_phase7_guard",
    "existing_phase7_record_count = 0",
    "lnsat_recovery_inspection_events_v16",
    "legacy_phase7_evidence",
    "lnsat_execution_authorizations_approval_decision_unique_idx",
    "ON lnsat_execution_authorizations (approval_decision_id)",
    "lnsat_execution_authorizations_enforce_attempt_binding",
    "attempt.approval_decision_id = NEW.approval_decision_id",
    "nonce.authorization_attempt_id = attempt.authorization_attempt_id",
    "DROP TABLE lnsat_operation_receipts",
    "verification_status = 'accepted'",
    "PRAGMA user_version = 17",
  ]) {
    assert(
      migration0017Text.includes(marker),
      `crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql: missing ${marker}`,
      errors,
    );
  }
  for (const forbidden of [
    "private_key",
    "public_key",
    "signed_approval",
    "signature",
    "spki",
    "provider",
    "raw_capability",
    "capability_token",
  ]) {
    assert(
      !migration0017Text.toLowerCase().includes(forbidden),
      `crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql: forbidden signed-lane field ${forbidden}`,
      errors,
    );
  }

  assert(
    existsSync(candidateFixture),
    "crates/lnsat-store/tests/fixtures/phase7d_public_material_schema_candidate.sql: missing",
    errors,
  );
  assert(
    candidateFixtureText.includes("schema_version = 18") &&
      candidateFixtureText.includes("lnsat_store_metadata_v18"),
    "phase7d candidate fixture must remain test-only schema v18",
    errors,
  );

  assert(
    /export const P1_PUBLIC_TRUST_STATUS = "unset"/.test(signerText),
    `packages/policy/src/signer-provider.ts: P1_PUBLIC_TRUST_STATUS must be "unset"`,
    errors,
  );
  for (const key of [
    "runtime_signing",
    "provider_calls_enabled",
    "key_generation_allowed",
    "signer_activation_allowed",
    "production_verification_enabled",
  ]) {
    assertBooleanFalse(
      signerText,
      key,
      `packages/policy/src/signer-provider.ts`,
      errors,
    );
  }

  for (const key of ["runtime_signing", "production_signature_verification"]) {
    assertBooleanFalse(
      signedApprovalText,
      key,
      "packages/policy/src/signed-approval-evidence-v1.ts",
      errors,
    );
  }
  assert(
    signedApprovalText.includes('"signed_approval.verification_unavailable"'),
    "packages/policy/src/signed-approval-evidence-v1.ts: signed_approval.verification_unavailable marker required",
    errors,
  );

  const signedApprovalFixture = parseJsonlLines(
    signedApprovalFixtureText,
    SIGNED_APPROVAL_FIXTURE_PATH,
    errors,
  );
  if (signedApprovalFixture !== null) {
    const matching = signedApprovalFixture.filter(
      (entry) => isRecord(entry) && entry.case_id === SIGNED_APPROVAL_FIXTURE_CASE_ID,
    );
    assert(
      matching.length === 1,
      `${SIGNED_APPROVAL_FIXTURE_PATH}: expected exactly one case ${SIGNED_APPROVAL_FIXTURE_CASE_ID}`,
      errors,
    );
    if (matching.length === 1) {
      const expectedResult = matching[0]?.expected_result;
      assert(
        isRecord(expectedResult),
        `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} missing expected_result`,
        errors,
      );
      if (isRecord(expectedResult)) {
        assert(
          expectedResult.ok === SIGNED_APPROVAL_EXPECTED_RESULT.ok,
          `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.ok must be false`,
          errors,
        );
        assert(
          expectedResult.status === SIGNED_APPROVAL_EXPECTED_RESULT.status,
          `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.status must be rejected`,
          errors,
        );
        assert(
          expectedResult.cryptographic_signature_valid ===
            SIGNED_APPROVAL_EXPECTED_RESULT.cryptographic_signature_valid,
          `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.cryptographic_signature_valid must be false`,
          errors,
        );
        assert(
          expectedResult.current_status_valid ===
            SIGNED_APPROVAL_EXPECTED_RESULT.current_status_valid,
          `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.current_status_valid must be false`,
          errors,
        );
        assert(
          expectedResult.execution_authorized ===
            SIGNED_APPROVAL_EXPECTED_RESULT.execution_authorized,
          `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.execution_authorized must be false`,
          errors,
        );

        assertArray(expectedResult.errors, "expected_result.errors", errors);
        if (Array.isArray(expectedResult.errors)) {
          assert(
            expectedResult.errors.length === 1,
            `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.errors must contain one current error`,
            errors,
          );
          const [firstError] = expectedResult.errors;
          assert(
            isRecord(firstError) && typeof firstError.code === "string",
            `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.errors[0].code must be present`,
            errors,
          );
          if (isRecord(firstError) && typeof firstError.code === "string") {
            assert(
              firstError.code === SIGNED_APPROVAL_EXPECTED_RESULT.error_code,
              `${SIGNED_APPROVAL_FIXTURE_PATH}: case ${SIGNED_APPROVAL_FIXTURE_CASE_ID} expected_result.errors[0].code must be ${SIGNED_APPROVAL_FIXTURE_ERROR}`,
              errors,
            );
          }
        }
      }
    }
  }
}

export function validatePhase7ReadinessPlan({
  repoRoot = REPO_ROOT,
  gitRoot = repoRoot,
} = {}) {
  const errors = [];
  const absoluteRoot = resolve(repoRoot);
  const absoluteGitRoot = resolve(gitRoot);
  const state = {};

  const publicSnapshot = validatePublicSourceSnapshotProvenance({
    root: absoluteRoot,
    gitRoot: absoluteGitRoot,
    immutablePaths: PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  });
  errors.push(...publicSnapshot.errors);
  validateGitRepositoryBoundary(absoluteRoot, absoluteGitRoot, errors);

  const ledger = validateLedger(
    resolve(absoluteRoot, "docs/reference/phase7-readiness.json"),
    state,
    errors,
  );

  validatePacketProvenance(absoluteGitRoot, ledger, errors, {
    publicSnapshotActive: publicSnapshot.active,
  });

  const plan = validatePlan(
    resolve(absoluteRoot, "docs/architecture/PHASE_7_READINESS_EXECUTION_PLAN.md"),
    ledger,
    errors,
  );

  if (state.phaseStatus && plan?.phaseStatus) {
    for (const name of PLAN_PHASE_STATUS_FIELDS) {
      const value = EXPECTED_PHASE_STATUS[name];
      assert(
        state.phaseStatus[name] === value,
        `plan/ledger phase status mismatch for ${name}`,
        errors,
      );
      assert(
        plan.phaseStatus[name] === value,
        `plan/ledger phase status mismatch for ${name}`,
        errors,
      );
    }
  }

  validateSources(absoluteRoot, errors);

  return {
    ok: errors.length === 0,
    errors,
    mode: publicSnapshot.active ? "public_source_snapshot" : "git_lineage",
    skippedChecks: publicSnapshot.active
      ? [
          "private_completion_commit_existence",
          "private_completion_commit_ancestry",
          "private_completion_blob_replay",
        ]
      : [],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validatePhase7ReadinessPlan();
  if (result.ok) {
    const skipped =
      result.skippedChecks.length > 0 ? result.skippedChecks.join(",") : "none";
    process.stdout.write(
      `Phase 7 readiness plan check passed. mode=${result.mode} skipped=${skipped}\n`,
    );
    process.exit(0);
  }
  process.stderr.write(
    `Phase 7 readiness plan check failed (${result.errors.length})\n`,
  );
  for (const error of result.errors) {
    process.stderr.write(`- ${error}\n`);
  }
  process.exit(1);
}
