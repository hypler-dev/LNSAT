import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { posix, resolve } from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

import { readCanonicalReviewDiff } from "./check-security-review-evidence.mjs";
import {
  PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  runIsolatedGit as runGit,
  validatePublicSourceSnapshotProvenance,
} from "./public-source-snapshot-provenance.mjs";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const PUBLIC_HISTORY_REVIEW_REGISTRY_PATH =
  "docs/reference/public-history-reviews/registry.json";
export const LEGACY_IDENTIFIER_INVENTORY_PATH =
  "docs/reference/legacy-identifier-inventory.json";

const REGISTRY_KEYS = [
  "schema_version",
  "review_scope",
  "execution_authorized",
  "runtime_authority_opened",
  "supported_release_evidence",
  "side_effects",
  "entries",
];
const ENTRY_KEYS = [
  "entry_id",
  "subject_id",
  "review_subject_ids",
  "manifest_path",
  "review_type",
  "state",
];
const MANIFEST_KEYS = [
  "schema_version",
  "review_id",
  "review_type",
  "packet_ids",
  "base_revision",
  "reviewed_revision",
  "reviewed_tree_oid",
  "diff_sha256",
  "protected_files",
  "reviewer",
  "findings",
  "verdict",
  "execution_authorized",
  "runtime_authority_opened",
  "side_effects",
];
const PROTECTED_FILE_KEYS = ["path", "sha256"];
const REVIEWER_KEYS = ["identity", "kind", "independent_from_author", "tool"];
const FINDING_KEYS = [
  "finding_id",
  "severity",
  "status",
  "disposition",
  "summary",
  "resolution_revision",
];
const ENTRY_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/u;
const SUBJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PACKET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const GIT_OID_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const MAX_JSON_DEPTH = 64;
export const MAX_REVIEW_JSON_BYTES = 8 * 1024 * 1024;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addError(condition, message, errors) {
  if (!condition) errors.push(message);
  return condition;
}

function exactKeys(value, expected, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path}: expected object`);
    return false;
  }
  const keys = Object.keys(value);
  addError(keys.length === expected.length, `${path}: unexpected key count`, errors);
  for (const key of expected) {
    addError(Object.hasOwn(value, key), `${path}: missing key ${key}`, errors);
  }
  for (const key of keys) {
    addError(expected.includes(key), `${path}: unexpected key ${key}`, errors);
  }
  for (let index = 0; index < Math.min(keys.length, expected.length); index += 1) {
    addError(
      keys[index] === expected[index],
      `${path}: key order mismatch at ${expected[index]}`,
      errors,
    );
  }
  return true;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function gitFailure(result) {
  if (result.error) return String(result.error);
  const stderr = Buffer.isBuffer(result.stderr)
    ? result.stderr.toString("utf8")
    : result.stderr;
  return stderr.trim() || `git exited with status ${String(result.status)}`;
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
    if (depth > MAX_JSON_DEPTH) {
      throw new Error(`JSON nesting exceeds ${MAX_JSON_DEPTH}`);
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

export function parseStrictJsonBytes(
  bytes,
  label,
  errors,
  { parseJson = JSON.parse } = {},
) {
  if (bytes.byteLength > MAX_REVIEW_JSON_BYTES) {
    errors.push(`${label}: exceeds ${MAX_REVIEW_JSON_BYTES} bytes`);
    return null;
  }
  try {
    const text = UTF8_DECODER.decode(bytes);
    assertUniqueJsonMembers(text);
    return parseJson(text);
  } catch (error) {
    errors.push(`${label}: unable to parse strict JSON (${String(error)})`);
    return null;
  }
}

function readJsonFile(path, label, errors) {
  try {
    const fileStat = lstatSync(path);
    if (!fileStat.isFile()) {
      errors.push(`${label}: must be a regular file`);
      return null;
    }
    if (fileStat.size > MAX_REVIEW_JSON_BYTES) {
      errors.push(`${label}: exceeds ${MAX_REVIEW_JSON_BYTES} bytes`);
      return null;
    }
    const bytes = readFileSync(path);
    const value = parseStrictJsonBytes(bytes, label, errors);
    return value === null ? null : { bytes, value };
  } catch (error) {
    errors.push(`${label}: unable to read ${path} (${String(error)})`);
    return null;
  }
}

function readCommitBlob(root, revision, path) {
  return runGit(root, ["cat-file", "blob", `${revision}:${path}`], {
    encoding: null,
  });
}

function readIndexBlob(root, path) {
  return runGit(root, ["show", `:${path}`], { encoding: null });
}

function validatePublicSnapshotAnchor(root, errors) {
  const snapshot = validatePublicSourceSnapshotProvenance({
    root,
    gitRoot: root,
    immutablePaths: PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  });
  errors.push(...snapshot.errors);
  addError(
    snapshot.active,
    "public history review: active public-source snapshot anchor is required",
    errors,
  );
  return snapshot.rootRevision;
}

function commitExists(root, revision, label, errors) {
  if (!GIT_OID_PATTERN.test(revision ?? "")) return false;
  return addError(
    runGit(root, ["cat-file", "-e", `${revision}^{commit}`]).ok,
    `${label}: commit does not exist`,
    errors,
  );
}

function revisionRange(root, range, label, errors) {
  const result = runGit(root, ["rev-list", "--reverse", "--ancestry-path", range]);
  if (!result.ok) {
    errors.push(`${label}: unable to enumerate revisions (${gitFailure(result)})`);
    return null;
  }
  return result.stdout.trim().split(/\s+/u).filter(Boolean);
}

function parseNameStatus(result, label, errors) {
  if (!result.ok) {
    errors.push(`${label}: unable to read Git changes (${gitFailure(result)})`);
    return null;
  }
  const fields = result.stdout.toString("utf8").split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (!addError(fields.length % 2 === 0, `${label}: malformed Git output`, errors)) {
    return null;
  }
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    changes.push({ status: fields[index], path: fields[index + 1] });
  }
  return changes;
}

function readRevisionRegistry(root, revision, label, errors) {
  const blob = readCommitBlob(root, revision, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  if (!blob.ok) {
    errors.push(`${label}: registry blob missing (${gitFailure(blob)})`);
    return null;
  }
  const registry = parseStrictJsonBytes(blob.stdout, label, errors);
  validateRegistryShape(registry, `${label}.registry`, errors);
  return registry;
}

function readOptionalRevisionRegistry(root, revision, label, errors) {
  const blob = readCommitBlob(root, revision, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  if (!blob.ok) return null;
  const registry = parseStrictJsonBytes(blob.stdout, label, errors);
  validateRegistryShape(registry, `${label}.registry`, errors);
  return registry;
}

function pendingProjection(entry) {
  return { ...entry, state: "pending" };
}

function validateRegistryAppend(
  priorRegistry,
  nextRegistry,
  pendingEntry,
  label,
  errors,
) {
  if (!priorRegistry) {
    return addError(
      nextRegistry.entries.length === 1 &&
        JSON.stringify(nextRegistry.entries[0]) === JSON.stringify(pendingEntry),
      `${label}: bootstrap registry must introduce exactly one pending entry`,
      errors,
    );
  }
  addError(
    priorRegistry.entries.every((entry) => entry.state === "attested"),
    `${label}: prior registry entries must all be attested`,
    errors,
  );
  const expected = structuredClone(priorRegistry);
  expected.entries.push(pendingEntry);
  return addError(
    JSON.stringify(nextRegistry) === JSON.stringify(expected),
    `${label}: registry must append exactly one tail pending entry`,
    errors,
  );
}

function expectedManifestPath(entryId) {
  return `docs/reference/public-history-reviews/${entryId}/review.json`;
}

function validateRegistryShape(registry, path, errors) {
  if (!exactKeys(registry, REGISTRY_KEYS, path, errors)) return;
  addError(
    registry.schema_version === "lnsat.public_history_review_registry.v1",
    `${path}.schema_version: invalid`,
    errors,
  );
  addError(
    registry.review_scope === "pre_release_source_only",
    `${path}.review_scope: must remain pre_release_source_only`,
    errors,
  );
  for (const field of [
    "execution_authorized",
    "runtime_authority_opened",
    "supported_release_evidence",
  ]) {
    addError(registry[field] === false, `${path}.${field}: must be false`, errors);
  }
  addError(
    Array.isArray(registry.side_effects) && registry.side_effects.length === 0,
    `${path}.side_effects: must exactly equal []`,
    errors,
  );
  if (
    !addError(
      Array.isArray(registry.entries),
      `${path}.entries: expected array`,
      errors,
    )
  ) {
    return;
  }
  addError(registry.entries.length > 0, `${path}.entries: must not be empty`, errors);
  const entryIds = [];
  const manifestPaths = new Set();
  for (let index = 0; index < registry.entries.length; index += 1) {
    const entry = registry.entries[index];
    const entryPath = `${path}.entries[${index}]`;
    if (!exactKeys(entry, ENTRY_KEYS, entryPath, errors)) continue;
    addError(
      typeof entry.entry_id === "string" && ENTRY_ID_PATTERN.test(entry.entry_id),
      `${entryPath}.entry_id: invalid`,
      errors,
    );
    addError(
      typeof entry.subject_id === "string" && SUBJECT_ID_PATTERN.test(entry.subject_id),
      `${entryPath}.subject_id: invalid`,
      errors,
    );
    if (
      addError(
        Array.isArray(entry.review_subject_ids),
        `${entryPath}.review_subject_ids: expected array`,
        errors,
      )
    ) {
      addError(
        entry.review_subject_ids.length > 0,
        `${entryPath}.review_subject_ids: must not be empty`,
        errors,
      );
      const uniqueSubjectIds = new Set();
      for (const subjectId of entry.review_subject_ids) {
        addError(
          typeof subjectId === "string" && PACKET_ID_PATTERN.test(subjectId),
          `${entryPath}.review_subject_ids: invalid review subject id`,
          errors,
        );
        addError(
          !uniqueSubjectIds.has(subjectId),
          `${entryPath}.review_subject_ids: duplicate ${String(subjectId)}`,
          errors,
        );
        uniqueSubjectIds.add(subjectId);
      }
      addError(
        entry.review_subject_ids.every(
          (value, subjectIndex) =>
            subjectIndex === 0 ||
            compareText(entry.review_subject_ids[subjectIndex - 1], value) < 0,
        ),
        `${entryPath}.review_subject_ids: must be strictly sorted`,
        errors,
      );
    }
    addError(
      entry.manifest_path === expectedManifestPath(entry.entry_id),
      `${entryPath}.manifest_path: must use canonical entry path`,
      errors,
    );
    addError(
      isSafeRepositoryPath(entry.manifest_path),
      `${entryPath}.manifest_path: unsafe repository path`,
      errors,
    );
    addError(
      entry.review_type === "independent_implementation_review",
      `${entryPath}.review_type: invalid`,
      errors,
    );
    addError(
      entry.state === "pending" || entry.state === "attested",
      `${entryPath}.state: must be pending or attested`,
      errors,
    );
    addError(
      !manifestPaths.has(entry.manifest_path),
      `${entryPath}.manifest_path: duplicate`,
      errors,
    );
    manifestPaths.add(entry.manifest_path);
    entryIds.push(entry.entry_id);
  }
  addError(
    new Set(entryIds).size === entryIds.length,
    `${path}.entries: entry_id values must be unique`,
    errors,
  );
}

function validateManifestShape(manifest, entry, errors) {
  if (!exactKeys(manifest, MANIFEST_KEYS, "manifest", errors)) return;
  addError(
    manifest.schema_version === "lnsat.security_review.v1",
    "manifest.schema_version: must be lnsat.security_review.v1",
    errors,
  );
  const reviewedShort = GIT_OID_PATTERN.test(manifest.reviewed_revision ?? "")
    ? manifest.reviewed_revision.slice(0, 8)
    : "invalid";
  addError(
    manifest.review_id ===
      `${entry.entry_id}-independent-implementation-review-${reviewedShort}`,
    "manifest.review_id: does not match registry entry and reviewed revision",
    errors,
  );
  addError(
    manifest.review_type === entry.review_type,
    "manifest.review_type: does not match registry entry",
    errors,
  );
  addError(
    JSON.stringify(manifest.packet_ids) === JSON.stringify(entry.review_subject_ids),
    "manifest.packet_ids: must exactly match registry review_subject_ids",
    errors,
  );
  for (const field of ["base_revision", "reviewed_revision", "reviewed_tree_oid"]) {
    addError(
      typeof manifest[field] === "string" && GIT_OID_PATTERN.test(manifest[field]),
      `manifest.${field}: must be 40 lowercase hex characters`,
      errors,
    );
  }
  addError(
    typeof manifest.diff_sha256 === "string" &&
      SHA256_PATTERN.test(manifest.diff_sha256),
    "manifest.diff_sha256: invalid",
    errors,
  );
  if (
    addError(
      Array.isArray(manifest.protected_files),
      "manifest.protected_files: expected array",
      errors,
    )
  ) {
    addError(
      manifest.protected_files.length > 0,
      "manifest.protected_files: must not be empty",
      errors,
    );
    const paths = [];
    const seen = new Set();
    for (let index = 0; index < manifest.protected_files.length; index += 1) {
      const protectedFile = manifest.protected_files[index];
      const protectedPath = `manifest.protected_files[${index}]`;
      if (!exactKeys(protectedFile, PROTECTED_FILE_KEYS, protectedPath, errors)) {
        continue;
      }
      addError(
        isSafeRepositoryPath(protectedFile.path),
        `${protectedPath}.path: unsafe repository path`,
        errors,
      );
      addError(
        typeof protectedFile.sha256 === "string" &&
          SHA256_PATTERN.test(protectedFile.sha256),
        `${protectedPath}.sha256: invalid`,
        errors,
      );
      addError(
        !seen.has(protectedFile.path),
        `${protectedPath}.path: duplicate`,
        errors,
      );
      seen.add(protectedFile.path);
      paths.push(protectedFile.path);
    }
    addError(
      paths.every(
        (path, index) => index === 0 || compareText(paths[index - 1], path) < 0,
      ),
      "manifest.protected_files: paths must be strictly sorted",
      errors,
    );
  }
  if (exactKeys(manifest.reviewer, REVIEWER_KEYS, "manifest.reviewer", errors)) {
    addError(
      isNonEmptyString(manifest.reviewer.identity),
      "manifest.reviewer.identity: recorded claim must be nonempty",
      errors,
    );
    addError(
      manifest.reviewer.kind === "agent",
      "manifest.reviewer.kind: must be agent",
      errors,
    );
    addError(
      manifest.reviewer.independent_from_author === true,
      "manifest.reviewer.independent_from_author: recorded claim must be true",
      errors,
    );
    addError(
      isNonEmptyString(manifest.reviewer.tool),
      "manifest.reviewer.tool: recorded claim must be nonempty",
      errors,
    );
  }
  if (
    addError(
      Array.isArray(manifest.findings),
      "manifest.findings: expected array",
      errors,
    )
  ) {
    const findingPattern = new RegExp(
      `^${entry.entry_id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}-F[1-9][0-9]*$`,
      "u",
    );
    const findingIds = new Set();
    for (let index = 0; index < manifest.findings.length; index += 1) {
      const finding = manifest.findings[index];
      const findingPath = `manifest.findings[${index}]`;
      if (!exactKeys(finding, FINDING_KEYS, findingPath, errors)) continue;
      addError(
        typeof finding.finding_id === "string" &&
          findingPattern.test(finding.finding_id),
        `${findingPath}.finding_id: invalid`,
        errors,
      );
      addError(
        !findingIds.has(finding.finding_id),
        `${findingPath}.finding_id: duplicate`,
        errors,
      );
      findingIds.add(finding.finding_id);
      addError(
        isNonEmptyString(finding.severity),
        `${findingPath}.severity: must be nonempty`,
        errors,
      );
      addError(
        finding.status === "resolved",
        `${findingPath}.status: must be resolved`,
        errors,
      );
      addError(
        finding.disposition === "accepted_fixed",
        `${findingPath}.disposition: must be accepted_fixed`,
        errors,
      );
      addError(
        isNonEmptyString(finding.summary),
        `${findingPath}.summary: must be nonempty`,
        errors,
      );
      addError(
        finding.resolution_revision === manifest.reviewed_revision,
        `${findingPath}.resolution_revision: must equal reviewed_revision`,
        errors,
      );
    }
  }
  addError(
    manifest.verdict === "approved",
    "manifest.verdict: must be approved",
    errors,
  );
  addError(
    manifest.execution_authorized === false,
    "manifest.execution_authorized: must be false",
    errors,
  );
  addError(
    manifest.runtime_authority_opened === false,
    "manifest.runtime_authority_opened: must be false",
    errors,
  );
  addError(
    Array.isArray(manifest.side_effects) && manifest.side_effects.length === 0,
    "manifest.side_effects: must exactly equal []",
    errors,
  );
}

function validateReviewedRange(root, manifest, entry, errors) {
  const baseExists = commitExists(
    root,
    manifest.base_revision,
    "base_revision",
    errors,
  );
  const reviewedExists = commitExists(
    root,
    manifest.reviewed_revision,
    "reviewed_revision",
    errors,
  );
  if (!baseExists || !reviewedExists) return;
  const reviewedParents = runGit(root, [
    "rev-list",
    "--parents",
    "-n",
    "1",
    manifest.reviewed_revision,
  ]);
  if (!reviewedParents.ok) {
    errors.push(
      `manifest reviewed revision: unable to inspect (${gitFailure(reviewedParents)})`,
    );
  } else {
    const revisionAndParents = reviewedParents.stdout.trim().split(/\s+/u);
    addError(
      revisionAndParents.length === 2,
      "manifest.reviewed_revision: must have exactly one parent",
      errors,
    );
    addError(
      revisionAndParents[1] === manifest.base_revision,
      "manifest.base_revision: must be reviewed_revision's exact parent",
      errors,
    );
  }
  const reviewedRegistry = readRevisionRegistry(
    root,
    manifest.reviewed_revision,
    "reviewed revision",
    errors,
  );
  const priorRegistry = readOptionalRevisionRegistry(
    root,
    manifest.base_revision,
    "reviewed base",
    errors,
  );
  if (reviewedRegistry) {
    const expectedPendingEntry = pendingProjection(entry);
    addError(
      JSON.stringify(registryEntry(reviewedRegistry, entry.entry_id)) ===
        JSON.stringify(expectedPendingEntry),
      "reviewed revision: registry entry must be pending",
      errors,
    );
    validateRegistryAppend(
      priorRegistry,
      reviewedRegistry,
      expectedPendingEntry,
      "reviewed revision",
      errors,
    );
  }
  const head = runGit(root, ["rev-parse", "HEAD"]);
  addError(head.ok, "git: unable to resolve HEAD", errors);
  if (head.ok && head.stdout.trim() !== manifest.reviewed_revision) {
    addError(
      runGit(root, ["merge-base", "--is-ancestor", manifest.reviewed_revision, "HEAD"])
        .ok,
      "manifest.reviewed_revision: must be an ancestor of HEAD",
      errors,
    );
  }
  const tree = runGit(root, ["rev-parse", `${manifest.reviewed_revision}^{tree}`]);
  addError(
    tree.ok && manifest.reviewed_tree_oid === tree.stdout.trim(),
    "manifest.reviewed_tree_oid: does not match reviewed revision tree",
    errors,
  );
  try {
    const diff = readCanonicalReviewDiff(
      root,
      manifest.base_revision,
      manifest.reviewed_revision,
    );
    const digest = createHash("sha256").update(diff).digest("hex");
    addError(
      manifest.diff_sha256 === `sha256:${digest}`,
      "manifest.diff_sha256: does not match canonical reviewed diff bytes",
      errors,
    );
  } catch (error) {
    errors.push(
      `manifest.diff_sha256: unable to read reviewed diff (${String(error)})`,
    );
  }
  const changes = parseNameStatus(
    runGit(
      root,
      [
        "diff",
        "--name-status",
        "-z",
        "--no-renames",
        manifest.base_revision,
        manifest.reviewed_revision,
        "--",
      ],
      { encoding: null },
    ),
    "manifest.protected_files",
    errors,
  );
  if (!changes || !Array.isArray(manifest.protected_files)) return;
  const reviewedByPath = new Map(changes.map((change) => [change.path, change.status]));
  const expectedRegistryStatus = priorRegistry ? "M" : "A";
  addError(
    reviewedByPath.get(PUBLIC_HISTORY_REVIEW_REGISTRY_PATH) === expectedRegistryStatus,
    `manifest.protected_files: reviewed registry must be ${expectedRegistryStatus}`,
    errors,
  );
  addError(
    reviewedByPath.get(LEGACY_IDENTIFIER_INVENTORY_PATH) === "M",
    "manifest.protected_files: reviewed legacy inventory must be M",
    errors,
  );
  addError(
    !changes.some((change) => change.path === entry.manifest_path),
    "manifest.protected_files: reviewed source commit must not contain its attestation manifest",
    errors,
  );
  const reviewedSourcePaths = changes.filter(
    (change) =>
      change.path !== PUBLIC_HISTORY_REVIEW_REGISTRY_PATH &&
      change.path !== LEGACY_IDENTIFIER_INVENTORY_PATH,
  );
  addError(
    reviewedSourcePaths.length > 0,
    "manifest.protected_files: reviewed source commit must contain a non-registry path",
    errors,
  );
  for (const change of changes) {
    addError(
      change.status === "A" || change.status === "M",
      `manifest.protected_files: reviewed range must contain only A/M; found ${change.status} ${change.path}`,
      errors,
    );
  }
  const actualPaths = changes.map(({ path }) => path).sort(compareText);
  const listedPaths = manifest.protected_files
    .filter((entry) => isRecord(entry) && typeof entry.path === "string")
    .map(({ path }) => path);
  addError(
    JSON.stringify(listedPaths) === JSON.stringify(actualPaths),
    "manifest.protected_files: must exactly match sorted reviewed A/M paths",
    errors,
  );
  for (const entry of manifest.protected_files) {
    if (
      !isRecord(entry) ||
      !isSafeRepositoryPath(entry.path) ||
      !SHA256_PATTERN.test(entry.sha256 ?? "")
    ) {
      continue;
    }
    const blob = readCommitBlob(root, manifest.reviewed_revision, entry.path);
    if (!blob.ok) {
      errors.push(`manifest.protected_files: unable to read raw blob ${entry.path}`);
      continue;
    }
    const digest = createHash("sha256").update(blob.stdout).digest("hex");
    addError(
      entry.sha256 === `sha256:${digest}`,
      `manifest.protected_files: raw blob SHA-256 mismatch for ${entry.path}`,
      errors,
    );
  }
}

function expectedAttestationChanges(entry) {
  return new Map([
    [PUBLIC_HISTORY_REVIEW_REGISTRY_PATH, "M"],
    [LEGACY_IDENTIFIER_INVENTORY_PATH, "M"],
    [entry.manifest_path, "A"],
  ]);
}

function hasExactAttestationChanges(changes, entry) {
  const expected = expectedAttestationChanges(entry);
  return (
    changes.length === expected.size &&
    changes.every((change) => expected.get(change.path) === change.status)
  );
}

function registryEntry(registry, entryId) {
  return Array.isArray(registry?.entries)
    ? registry.entries.find((entry) => entry?.entry_id === entryId)
    : undefined;
}

function validateRegistryTransition(before, after, entryId, label, errors) {
  const beforeEntry = registryEntry(before, entryId);
  const afterEntry = registryEntry(after, entryId);
  if (
    !addError(
      beforeEntry?.state === "pending",
      `${label}: prior state must be pending`,
      errors,
    ) ||
    !addError(
      afterEntry?.state === "attested",
      `${label}: next state must be attested`,
      errors,
    )
  ) {
    return false;
  }
  const expected = structuredClone(before);
  registryEntry(expected, entryId).state = "attested";
  return addError(
    JSON.stringify(after) === JSON.stringify(expected),
    `${label}: registry may change only one pending state to attested`,
    errors,
  );
}

function validateStagedAttestation(
  root,
  manifest,
  entry,
  currentRegistry,
  currentManifestBytes,
  errors,
) {
  const unstaged = runGit(root, ["diff", "--quiet", "--"]);
  addError(
    unstaged.ok,
    "staged attestation: unstaged tracked changes are forbidden",
    errors,
  );
  const changes = parseNameStatus(
    runGit(
      root,
      ["diff", "--cached", "--name-status", "-z", "--no-renames", "HEAD", "--"],
      { encoding: null },
    ),
    "staged attestation",
    errors,
  );
  addError(
    changes !== null && hasExactAttestationChanges(changes, entry),
    "staged attestation: expected exactly registry M, legacy inventory M, and manifest A",
    errors,
  );
  const previousRegistry = readRevisionRegistry(
    root,
    manifest.reviewed_revision,
    "staged attestation",
    errors,
  );
  if (previousRegistry) {
    validateRegistryTransition(
      previousRegistry,
      currentRegistry,
      entry.entry_id,
      "staged attestation",
      errors,
    );
  }
  const indexManifest = readIndexBlob(root, entry.manifest_path);
  addError(
    indexManifest.ok && indexManifest.stdout.equals(currentManifestBytes),
    "staged attestation: index and worktree manifest bytes must match",
    errors,
  );
  const indexRegistry = readIndexBlob(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  let indexRegistryValue = null;
  if (indexRegistry.ok) {
    indexRegistryValue = parseStrictJsonBytes(
      indexRegistry.stdout,
      "staged attestation",
      errors,
    );
  }
  addError(
    indexRegistryValue !== null &&
      JSON.stringify(indexRegistryValue) === JSON.stringify(currentRegistry),
    "staged attestation: index and worktree registry bytes must match semantically",
    errors,
  );
  return { mode: "staged_attestation", attestationRevision: null };
}

function validateCommittedAttestation(
  root,
  manifest,
  entry,
  currentRegistry,
  currentManifestBytes,
  errors,
) {
  const revisions = revisionRange(
    root,
    `${manifest.reviewed_revision}..HEAD`,
    "attestation",
    errors,
  );
  if (!revisions) return { mode: "public_history_native", attestationRevision: null };
  const candidates = [];
  for (const revision of revisions) {
    const parents = runGit(root, ["rev-list", "--parents", "-n", "1", revision]);
    if (!parents.ok) {
      errors.push(`attestation: unable to inspect parents for ${revision}`);
      continue;
    }
    const revisionAndParents = parents.stdout.trim().split(/\s+/u);
    if (
      revisionAndParents.length !== 2 ||
      revisionAndParents[1] !== manifest.reviewed_revision
    ) {
      continue;
    }
    const changes = parseNameStatus(
      runGit(
        root,
        [
          "diff-tree",
          "--no-commit-id",
          "--name-status",
          "-r",
          "--no-renames",
          "-z",
          manifest.reviewed_revision,
          revision,
        ],
        { encoding: null },
      ),
      `attestation:${revision}`,
      errors,
    );
    if (changes && hasExactAttestationChanges(changes, entry)) {
      candidates.push(revision);
    }
  }
  if (
    !addError(
      candidates.length === 1,
      "attestation: expected exactly one direct child with registry M, legacy inventory M, and manifest A",
      errors,
    )
  ) {
    return { mode: "public_history_native", attestationRevision: null };
  }
  const attestationRevision = candidates[0];
  const beforeRegistry = readRevisionRegistry(
    root,
    manifest.reviewed_revision,
    "attestation prior revision",
    errors,
  );
  const attestationRegistry = readRevisionRegistry(
    root,
    attestationRevision,
    "attestation revision",
    errors,
  );
  if (beforeRegistry && attestationRegistry) {
    validateRegistryTransition(
      beforeRegistry,
      attestationRegistry,
      entry.entry_id,
      "attestation",
      errors,
    );
  }
  const attestedEntry = registryEntry(attestationRegistry, entry.entry_id);
  addError(
    JSON.stringify(entry) === JSON.stringify(attestedEntry),
    "attestation history: current registry entry differs from attested entry",
    errors,
  );
  const attestedManifest = readCommitBlob(
    root,
    attestationRevision,
    entry.manifest_path,
  );
  addError(
    attestedManifest.ok && attestedManifest.stdout.equals(currentManifestBytes),
    "attestation: current manifest bytes differ from attestation commit",
    errors,
  );
  const descendants = revisionRange(
    root,
    `${attestationRevision}..HEAD`,
    "attestation history",
    errors,
  );
  if (descendants) {
    for (const revision of descendants) {
      const manifestBlob = readCommitBlob(root, revision, entry.manifest_path);
      addError(
        manifestBlob.ok && manifestBlob.stdout.equals(currentManifestBytes),
        `attestation history: manifest changed or disappeared at ${revision}`,
        errors,
      );
      const descendantRegistry = readRevisionRegistry(
        root,
        revision,
        `attestation history:${revision}`,
        errors,
      );
      addError(
        JSON.stringify(registryEntry(descendantRegistry, entry.entry_id)) ===
          JSON.stringify(attestedEntry),
        `attestation history: registry entry changed or disappeared at ${revision}`,
        errors,
      );
    }
  }
  return { mode: "public_history_native", attestationRevision };
}

function validateHistoricAttestedEntries(root, currentRegistry, errors) {
  const revisions = runGit(root, [
    "rev-list",
    "--reverse",
    "HEAD",
    "--",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
  ]);
  if (!revisions.ok) {
    errors.push(`registry history: unable to enumerate (${gitFailure(revisions)})`);
    return;
  }
  const historicallyAttested = new Map();
  for (const revision of revisions.stdout.trim().split(/\s+/u).filter(Boolean)) {
    const historicalRegistry = readRevisionRegistry(
      root,
      revision,
      `registry history:${revision}`,
      errors,
    );
    for (const entry of historicalRegistry?.entries ?? []) {
      if (entry.state === "attested") historicallyAttested.set(entry.entry_id, entry);
    }
  }
  for (const [entryId, historicalEntry] of historicallyAttested) {
    addError(
      JSON.stringify(registryEntry(currentRegistry, entryId)) ===
        JSON.stringify(historicalEntry),
      `registry history: attested entry ${entryId} was removed, reverted, or changed`,
      errors,
    );
  }
}

function validatePendingReview(root, currentRegistry, entry, errors) {
  const head = runGit(root, ["rev-parse", "HEAD"]);
  if (!head.ok) {
    errors.push(`pending review: unable to resolve HEAD (${gitFailure(head)})`);
    return "public_history_native";
  }
  const headRegistry = readOptionalRevisionRegistry(
    root,
    head.stdout.trim(),
    "pending review base",
    errors,
  );
  if (
    headRegistry &&
    JSON.stringify(headRegistry) === JSON.stringify(currentRegistry)
  ) {
    errors.push(
      "pending review: committed pending state is forbidden; stage exact attestation child",
    );
    return "public_history_native";
  }
  const unstaged = runGit(root, ["diff", "--quiet", "--"]);
  addError(
    unstaged.ok,
    "pending review: unstaged tracked changes are forbidden",
    errors,
  );
  const indexRegistry = readIndexBlob(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  let indexRegistryValue = null;
  if (indexRegistry.ok) {
    indexRegistryValue = parseStrictJsonBytes(
      indexRegistry.stdout,
      "pending review",
      errors,
    );
  }
  addError(
    indexRegistryValue !== null &&
      JSON.stringify(indexRegistryValue) === JSON.stringify(currentRegistry),
    "pending review: registry must be staged and match worktree bytes",
    errors,
  );
  const changes = parseNameStatus(
    runGit(
      root,
      ["diff", "--cached", "--name-status", "-z", "--no-renames", "HEAD", "--"],
      { encoding: null },
    ),
    "pending review",
    errors,
  );
  if (changes) {
    const byPath = new Map(changes.map((change) => [change.path, change.status]));
    const expectedRegistryStatus = headRegistry ? "M" : "A";
    addError(
      byPath.get(PUBLIC_HISTORY_REVIEW_REGISTRY_PATH) === expectedRegistryStatus,
      `pending review: registry must be ${expectedRegistryStatus}`,
      errors,
    );
    addError(
      byPath.get(LEGACY_IDENTIFIER_INVENTORY_PATH) === "M",
      "pending review: legacy inventory must be M",
      errors,
    );
    addError(
      changes.every((change) => change.status === "A" || change.status === "M"),
      "pending review: staged reviewed source must contain only A/M paths",
      errors,
    );
    addError(
      !changes.some((change) => change.path === entry.manifest_path),
      "pending review: manifest must not exist in reviewed source commit",
      errors,
    );
    const reviewedSourcePaths = changes.filter(
      (change) =>
        change.path !== PUBLIC_HISTORY_REVIEW_REGISTRY_PATH &&
        change.path !== LEGACY_IDENTIFIER_INVENTORY_PATH,
    );
    addError(
      reviewedSourcePaths.length > 0,
      "pending review: reviewed source commit must contain a non-registry path",
      errors,
    );
  }
  validateRegistryAppend(
    headRegistry,
    currentRegistry,
    pendingProjection(entry),
    "pending review",
    errors,
  );
  return "staged_review";
}

export function validatePublicHistoryReviewEvidence({
  root = REPO_ROOT,
  gitRoot = root,
} = {}) {
  const errors = [];
  const absoluteRoot = resolve(root);
  const absoluteGitRoot = resolve(gitRoot);
  let rootsMatch = false;
  try {
    rootsMatch = realpathSync(absoluteRoot) === realpathSync(absoluteGitRoot);
  } catch {
    rootsMatch = false;
  }
  addError(
    rootsMatch,
    "public history review: source root must equal Git top-level",
    errors,
  );
  validatePublicSnapshotAnchor(absoluteGitRoot, errors);
  const registryPath = resolve(absoluteRoot, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  if (
    !addError(
      existsSync(registryPath),
      `public history review: registry missing at ${PUBLIC_HISTORY_REVIEW_REGISTRY_PATH}`,
      errors,
    )
  ) {
    return {
      ok: false,
      errors,
      mode: "public_history_native",
      pendingEntries: 0,
      attestedEntries: 0,
      supportedReleaseEvidenceEligible: false,
    };
  }
  const registryFile = readJsonFile(registryPath, "registry", errors);
  const registry = registryFile?.value ?? null;
  validateRegistryShape(registry, "registry", errors);
  if (!isRecord(registry) || !Array.isArray(registry.entries)) {
    return {
      ok: false,
      errors,
      mode: "public_history_native",
      pendingEntries: 0,
      attestedEntries: 0,
      supportedReleaseEvidenceEligible: false,
    };
  }
  validateHistoricAttestedEntries(absoluteGitRoot, registry, errors);
  let mode = "public_history_native";
  let pendingEntries = 0;
  let attestedEntries = 0;
  const pendingRegistryEntries = registry.entries.filter(
    (entry) => entry?.state === "pending",
  );
  addError(
    pendingRegistryEntries.length <= 1,
    "registry: at most one pending entry is allowed",
    errors,
  );
  if (pendingRegistryEntries.length === 1) {
    addError(
      registry.entries.at(-1)?.entry_id === pendingRegistryEntries[0].entry_id,
      "registry: pending entry must be appended at tail",
      errors,
    );
  }
  for (const entry of registry.entries) {
    if (!isRecord(entry) || !isSafeRepositoryPath(entry.manifest_path)) continue;
    const manifestPath = resolve(absoluteRoot, entry.manifest_path);
    if (entry.state === "pending") {
      pendingEntries += 1;
      addError(
        !existsSync(manifestPath),
        `registry entry ${entry.entry_id}: pending entry must not have a manifest`,
        errors,
      );
      mode = validatePendingReview(absoluteGitRoot, registry, entry, errors);
      continue;
    }
    if (entry.state !== "attested") continue;
    attestedEntries += 1;
    if (
      !addError(
        existsSync(manifestPath),
        `registry entry ${entry.entry_id}: attested manifest is missing`,
        errors,
      )
    ) {
      continue;
    }
    const manifestFile = readJsonFile(
      manifestPath,
      `manifest:${entry.entry_id}`,
      errors,
    );
    const manifest = manifestFile?.value ?? null;
    if (!isRecord(manifest)) continue;
    const currentManifestBytes = manifestFile.bytes;
    validateManifestShape(manifest, entry, errors);
    validateReviewedRange(absoluteGitRoot, manifest, entry, errors);
    const head = runGit(absoluteGitRoot, ["rev-parse", "HEAD"]);
    if (head.ok && head.stdout.trim() === manifest.reviewed_revision) {
      const staged = validateStagedAttestation(
        absoluteGitRoot,
        manifest,
        entry,
        registry,
        currentManifestBytes,
        errors,
      );
      mode = staged.mode;
    } else {
      validateCommittedAttestation(
        absoluteGitRoot,
        manifest,
        entry,
        registry,
        currentManifestBytes,
        errors,
      );
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    mode,
    pendingEntries,
    attestedEntries,
    supportedReleaseEvidenceEligible: false,
  };
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    process.stderr.write(
      `Public-history review evidence check: unknown argument ${args[0]}\n`,
    );
    process.exitCode = 2;
  } else {
    const result = validatePublicHistoryReviewEvidence();
    if (result.ok) {
      process.stdout.write(
        `Public-history review evidence check: PASS mode=${result.mode} pending=${result.pendingEntries} attested=${result.attestedEntries} supported_release_evidence_eligible=false\n`,
      );
    } else {
      process.stderr.write(
        `Public-history review evidence check: FAIL (${result.errors.length}) mode=${result.mode}\n`,
      );
      for (const error of result.errors) process.stderr.write(`- ${error}\n`);
      process.exitCode = 1;
    }
  }
}
