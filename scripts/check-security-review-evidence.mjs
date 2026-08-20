import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createIsolatedGitEnvironment,
  PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH,
  PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  validatePublicSourceSnapshotProvenance,
} from "./public-source-snapshot-provenance.mjs";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_LEDGER_PATH = "docs/reference/phase7-readiness.json";
const DEFAULT_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-B1/correction-review.json";
const P7_C1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-C1/implementation-review.json";
const P7_A1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-A1/implementation-review.json";
const P7_R1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-R1/implementation-review.json";
const P7_X1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-X1/implementation-review.json";
const PUBLIC_SNAPSHOT_SKIPPED_CHECKS = Object.freeze([
  "private_review_commit_existence",
  "private_review_commit_ancestry",
  "private_review_attestation_topology",
  "private_review_diff_replay",
  "private_review_tree_oid_replay",
  "private_review_protected_blob_replay",
  "private_reviewer_identity_verification",
]);

const TOP_LEVEL_KEYS = [
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
const P7_B1_FINDINGS = [
  ["P7-B1-F1", "high"],
  ["P7-B1-F2", "high"],
  ["P7-B1-F3", "medium"],
  ["P7-B1-F4", "medium"],
  ["P7-B1-F5", "medium"],
  ["P7-B1-F6", "maintainability"],
  ["P7-B1-F7", "governance"],
];
const REVIEW_SPECS = [
  {
    packetId: "P7-B1",
    manifestPath: DEFAULT_MANIFEST_PATH,
    reviewType: "independent_correction_review",
    findingIdPattern: /^P7-B1-F[1-9][0-9]*$/u,
    requiredFindings: P7_B1_FINDINGS,
  },
  {
    packetId: "P7-C1",
    manifestPath: P7_C1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findingIdPattern: /^P7-C1-F[1-9][0-9]*$/u,
    requiredFindings: [],
  },
  {
    packetId: "P7-A1",
    manifestPath: P7_A1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findingIdPattern: /^P7-A1-F[1-9][0-9]*$/u,
    requiredFindings: [],
  },
  {
    packetId: "P7-R1",
    manifestPath: P7_R1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findingIdPattern: /^P7-R1-F[1-9][0-9]*$/u,
    requiredFindings: [],
    allowReviewedRange: true,
  },
  {
    packetId: "P7-X1",
    manifestPath: P7_X1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findingIdPattern: /^P7-X1-F[1-9][0-9]*$/u,
    requiredFindings: [],
  },
];
const SUPPORTED_RELEASE_LEDGER_SCHEMA = "lnsat.phase7_readiness.v3";
const GIT_OID_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const NULL_DEVICE = process.platform === "win32" ? "NUL" : "/dev/null";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addError(condition, message, errors) {
  if (!condition) {
    errors.push(message);
    return false;
  }
  return true;
}

function assertRecord(value, path, errors) {
  return addError(isRecord(value), `${path}: expected object`, errors);
}

function assertArray(value, path, errors) {
  return addError(Array.isArray(value), `${path}: expected array`, errors);
}

function assertExactKeys(value, expectedKeys, path, errors) {
  const keys = Object.keys(value);
  addError(
    keys.length === expectedKeys.length,
    `${path}: unexpected key count`,
    errors,
  );
  for (const key of expectedKeys) {
    addError(Object.hasOwn(value, key), `${path}: missing key ${key}`, errors);
  }
  for (const key of keys) {
    addError(expectedKeys.includes(key), `${path}: unexpected key ${key}`, errors);
  }
  for (let index = 0; index < Math.min(keys.length, expectedKeys.length); index += 1) {
    addError(
      keys[index] === expectedKeys[index],
      `${path}: key order mismatch at ${expectedKeys[index]}`,
      errors,
    );
  }
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
  return (
    segments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    ) && segments[0] !== ".git"
  );
}

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function resolveFromRoot(root, path, fallback) {
  return resolve(root, path ?? fallback);
}

function readJson(path, label, errors) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: unable to parse ${path} (${String(error)})`);
    return null;
  }
}

function runGit(root, args, { encoding = "utf8", env = {}, input } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    env: createIsolatedGitEnvironment(env),
    input,
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

function canonicalReviewDiffArgs(baseRevision, reviewedRevision) {
  return [
    "-c",
    "color.ui=false",
    "-c",
    "core.abbrev=40",
    "-c",
    `core.attributesFile=${NULL_DEVICE}`,
    "-c",
    "core.quotePath=true",
    "-c",
    "diff.algorithm=myers",
    "-c",
    "diff.context=3",
    "-c",
    "diff.external=",
    "-c",
    "diff.indentHeuristic=false",
    "-c",
    "diff.mnemonicPrefix=false",
    "-c",
    "diff.noprefix=false",
    "-c",
    "diff.renames=false",
    "diff",
    "--binary",
    "--diff-algorithm=myers",
    "--dst-prefix=b/",
    "--full-index",
    "--no-color",
    "--no-ext-diff",
    "--no-indent-heuristic",
    "--no-renames",
    "--no-textconv",
    "--src-prefix=a/",
    "--submodule=short",
    "--unified=3",
    baseRevision,
    reviewedRevision,
    "--",
  ];
}

export function readCanonicalReviewDiff(root, baseRevision, reviewedRevision) {
  const result = runGit(root, canonicalReviewDiffArgs(baseRevision, reviewedRevision), {
    encoding: null,
    env: { GIT_ATTR_NOSYSTEM: "1" },
  });
  if (!result.ok) {
    throw new Error(gitFailure(result));
  }
  return result.stdout;
}

function validateSupportedReleaseGitIsolation(gitRoot, errors) {
  const topLevel = runGit(gitRoot, ["rev-parse", "--show-toplevel"]);
  let topLevelMatches = false;
  if (topLevel.ok) {
    try {
      topLevelMatches = realpathSync(topLevel.stdout.trim()) === realpathSync(gitRoot);
    } catch {
      topLevelMatches = false;
    }
  }
  addError(
    topLevelMatches,
    "supported_release_evidence: source root must equal Git top-level",
    errors,
  );
  const status = runGit(gitRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]);
  addError(
    status.ok && status.stdout.length === 0,
    "supported_release_evidence: index and worktree must be clean",
    errors,
  );
  const replaceRefs = runGit(gitRoot, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace",
  ]);
  addError(
    replaceRefs.ok && replaceRefs.stdout.trim() === "",
    "supported_release_evidence: replacement refs are forbidden",
    errors,
  );
  for (const [gitPath, label] of [
    ["info/grafts", "grafts file"],
    ["objects/info/alternates", "object alternates file"],
  ]) {
    const pathResult = runGit(gitRoot, ["rev-parse", "--git-path", gitPath]);
    addError(
      pathResult.ok && !existsSync(resolve(gitRoot, pathResult.stdout.trim())),
      `supported_release_evidence: ${label} is forbidden`,
      errors,
    );
  }
}

function validateSupportedReleaseSourceBinding(gitRoot, attestations, errors) {
  const finalSpec = REVIEW_SPECS.at(-1);
  const finalAttestation = attestations.find(
    ({ spec }) => spec.packetId === finalSpec.packetId,
  );
  if (
    !addError(
      finalAttestation !== undefined,
      `supported_release_evidence: ${finalSpec.packetId} attestation is required for release-source binding`,
      errors,
    )
  ) {
    return;
  }
  const headTree = runGit(gitRoot, ["rev-parse", "HEAD^{tree}"]);
  const attestationTree = runGit(gitRoot, [
    "rev-parse",
    `${finalAttestation.attestationRevision}^{tree}`,
  ]);
  addError(
    headTree.ok &&
      attestationTree.ok &&
      headTree.stdout.trim() === attestationTree.stdout.trim(),
    `supported_release_evidence: HEAD tree must equal final ${finalSpec.packetId} attestation tree`,
    errors,
  );
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

function readLedger(ledgerPath, errors) {
  const ledger = readJson(ledgerPath, "ledger", errors);
  if (!assertRecord(ledger, "ledger", errors)) {
    return null;
  }
  if (!assertArray(ledger.packets, "ledger.packets", errors)) {
    return null;
  }
  return ledger;
}

function evidenceRequiredForPacket(ledger, spec, errors) {
  const packets = ledger.packets.filter(
    (packet) => isRecord(packet) && packet.packet_id === spec.packetId,
  );
  if (packets.length === 0) {
    return false;
  }
  if (
    !addError(
      packets.length === 1,
      `ledger.packets: expected exactly one ${spec.packetId} packet`,
      errors,
    )
  ) {
    return packets.some((packet) => packet.status === "complete");
  }
  return packets[0].status === "complete";
}

function validateSupportedReleaseInventory(ledger, errors) {
  addError(
    ledger.schema_version === SUPPORTED_RELEASE_LEDGER_SCHEMA,
    `supported_release_evidence: ledger.schema_version must be ${SUPPORTED_RELEASE_LEDGER_SCHEMA}`,
    errors,
  );
  for (const spec of REVIEW_SPECS) {
    const packets = ledger.packets.filter(
      (packet) => isRecord(packet) && packet.packet_id === spec.packetId,
    );
    if (
      !addError(
        packets.length === 1,
        `supported_release_evidence: expected exactly one ${spec.packetId} packet`,
        errors,
      )
    ) {
      continue;
    }
    addError(
      packets[0].status === "complete",
      `supported_release_evidence: ${spec.packetId} status must be complete`,
      errors,
    );
  }
}

function readAllRefCommitGraph(gitRoot, errors) {
  const result = runGit(gitRoot, ["rev-list", "--all", "HEAD", "--parents"]);
  if (
    !addError(
      result.ok,
      `supported_release_evidence: unable to enumerate all refs (${gitFailure(result)})`,
      errors,
    )
  ) {
    return null;
  }
  const parentsByRevision = new Map();
  for (const line of result.stdout.trim().split("\n").filter(Boolean)) {
    const [revision, ...parents] = line.split(" ");
    parentsByRevision.set(revision, parents);
  }
  const roots = [...parentsByRevision.entries()]
    .filter(([, parents]) => parents.length === 0)
    .map(([revision]) => revision);
  addError(
    roots.length === 1,
    "supported_release_evidence: all refs must have exactly one root commit",
    errors,
  );
  const childrenByRevision = new Map();
  for (const [revision, parents] of parentsByRevision) {
    for (const parent of parents) {
      const children = childrenByRevision.get(parent) ?? [];
      children.push(revision);
      childrenByRevision.set(parent, children);
    }
  }
  return { childrenByRevision, parentsByRevision };
}

function descendantsFrom(graph, revision) {
  if (!graph.parentsByRevision.has(revision)) return [];
  const descendants = [];
  const pending = [revision];
  const seen = new Set();
  while (pending.length > 0) {
    const current = pending.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    descendants.push(current);
    pending.push(...(graph.childrenByRevision.get(current) ?? []));
  }
  return descendants;
}

function validateSupportedReleaseManifestHistory(gitRoot, attestations, errors) {
  const graph = readAllRefCommitGraph(gitRoot, errors);
  if (!graph) return;
  for (const { attestationRevision, spec } of attestations) {
    const descendants = descendantsFrom(graph, attestationRevision);
    if (
      !addError(
        descendants.length > 0,
        `supported_release_evidence: ${spec.packetId} attestation must be reachable from a ref`,
        errors,
      )
    ) {
      continue;
    }
    const descendantSet = new Set(descendants);
    const revisions = [...graph.parentsByRevision.keys()];
    const objectSpecs = [attestationRevision, ...revisions].map(
      (revision) => `${revision}:${spec.manifestPath}`,
    );
    const blobs = runGit(
      gitRoot,
      ["cat-file", "--batch-check=%(objectname) %(objecttype)"],
      { input: `${objectSpecs.join("\n")}\n` },
    );
    if (
      !addError(
        blobs.ok,
        `supported_release_evidence: unable to inspect ${spec.packetId} manifest history (${gitFailure(blobs)})`,
        errors,
      )
    ) {
      continue;
    }
    const lines = blobs.stdout.trim().split("\n");
    const canonical = lines[0]?.split(" ");
    const canonicalOid = canonical?.[0];
    const canonicalIsBlob = canonical?.[1] === "blob";
    addError(
      canonicalIsBlob && GIT_OID_PATTERN.test(canonicalOid ?? ""),
      `supported_release_evidence: ${spec.packetId} attestation manifest is missing`,
      errors,
    );
    for (let index = 0; index < revisions.length; index += 1) {
      const fields = lines[index + 1]?.split(" ") ?? [];
      if (descendantSet.has(revisions[index])) {
        addError(
          canonicalIsBlob && fields[0] === canonicalOid && fields[1] === "blob",
          `supported_release_evidence: ${spec.packetId} manifest changed or disappeared at ${revisions[index]}`,
          errors,
        );
      } else {
        addError(
          fields[1] === "missing",
          `supported_release_evidence: ${spec.packetId} manifest exists outside attestation lineage at ${revisions[index]}`,
          errors,
        );
      }
    }
  }
}

function validateManifestShape(manifest, spec, errors) {
  if (!assertRecord(manifest, "manifest", errors)) {
    return;
  }
  assertExactKeys(manifest, TOP_LEVEL_KEYS, "manifest", errors);

  addError(
    manifest.schema_version === "lnsat.security_review.v1",
    "manifest.schema_version: must be lnsat.security_review.v1",
    errors,
  );
  addError(
    isNonEmptyString(manifest.review_id),
    "manifest.review_id: must be a nonempty string",
    errors,
  );
  addError(
    manifest.review_type === spec.reviewType,
    `manifest.review_type: must be ${spec.reviewType}`,
    errors,
  );
  addError(
    JSON.stringify(manifest.packet_ids) === JSON.stringify([spec.packetId]),
    `manifest.packet_ids: must exactly equal ["${spec.packetId}"]`,
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
    "manifest.diff_sha256: must be sha256: plus 64 lowercase hex characters",
    errors,
  );

  if (assertArray(manifest.protected_files, "manifest.protected_files", errors)) {
    const paths = [];
    const seenPaths = new Set();
    for (let index = 0; index < manifest.protected_files.length; index += 1) {
      const entry = manifest.protected_files[index];
      const entryPath = `manifest.protected_files[${index}]`;
      if (!assertRecord(entry, entryPath, errors)) {
        continue;
      }
      assertExactKeys(entry, PROTECTED_FILE_KEYS, entryPath, errors);
      addError(
        isSafeRepositoryPath(entry.path),
        `${entryPath}.path: must be a normalized safe repository-relative path`,
        errors,
      );
      addError(
        typeof entry.sha256 === "string" && SHA256_PATTERN.test(entry.sha256),
        `${entryPath}.sha256: must be sha256: plus 64 lowercase hex characters`,
        errors,
      );
      if (typeof entry.path === "string") {
        addError(
          !seenPaths.has(entry.path),
          `manifest.protected_files: duplicate path ${entry.path}`,
          errors,
        );
        seenPaths.add(entry.path);
        paths.push(entry.path);
      }
    }
    addError(
      paths.every(
        (path, index) => index === 0 || comparePaths(paths[index - 1], path) < 0,
      ),
      "manifest.protected_files: paths must be strictly sorted",
      errors,
    );
  }

  if (assertRecord(manifest.reviewer, "manifest.reviewer", errors)) {
    // These fields are structurally recorded claims. This validator does not
    // authenticate reviewer identity or independently prove separation.
    assertExactKeys(manifest.reviewer, REVIEWER_KEYS, "manifest.reviewer", errors);
    addError(
      isNonEmptyString(manifest.reviewer.identity),
      "manifest.reviewer.identity: recorded claim must be a nonempty string",
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
      "manifest.reviewer.tool: recorded claim must be a nonempty string",
      errors,
    );
  }

  if (assertArray(manifest.findings, "manifest.findings", errors)) {
    addError(
      manifest.findings.length >= spec.requiredFindings.length,
      `manifest.findings: must contain at least ${spec.requiredFindings.length} findings`,
      errors,
    );
    const requiredFindings = new Map(spec.requiredFindings);
    const seenFindingIds = new Set();
    for (let index = 0; index < manifest.findings.length; index += 1) {
      const finding = manifest.findings[index];
      const findingPath = `manifest.findings[${index}]`;
      if (!assertRecord(finding, findingPath, errors)) {
        continue;
      }
      assertExactKeys(finding, FINDING_KEYS, findingPath, errors);
      addError(
        typeof finding.finding_id === "string" &&
          spec.findingIdPattern.test(finding.finding_id),
        `${findingPath}.finding_id: must be a ${spec.packetId} finding identifier`,
        errors,
      );
      if (typeof finding.finding_id === "string") {
        addError(
          !seenFindingIds.has(finding.finding_id),
          `${findingPath}.finding_id: duplicate ${finding.finding_id}`,
          errors,
        );
        seenFindingIds.add(finding.finding_id);
      }
      const requiredSeverity = requiredFindings.get(finding.finding_id);
      if (requiredSeverity) {
        addError(
          finding.severity === requiredSeverity,
          `${findingPath}.severity: must be ${requiredSeverity}`,
          errors,
        );
      } else {
        addError(
          isNonEmptyString(finding.severity),
          `${findingPath}.severity: must be a nonempty string`,
          errors,
        );
      }
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
        `${findingPath}.summary: must be a nonempty string`,
        errors,
      );
      addError(
        finding.resolution_revision === manifest.reviewed_revision,
        `${findingPath}.resolution_revision: must equal reviewed_revision`,
        errors,
      );
    }
    for (const [findingId] of spec.requiredFindings) {
      addError(
        seenFindingIds.has(findingId),
        `manifest.findings: missing required finding ${findingId}`,
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

function parseNameStatus(result, label, errors) {
  if (!result.ok) {
    errors.push(`${label}: unable to read Git changes (${gitFailure(result)})`);
    return null;
  }
  const fields = result.stdout.toString("utf8").split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }
  if (!addError(fields.length % 2 === 0, `${label}: malformed Git output`, errors)) {
    return null;
  }
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    changes.push({ status: fields[index], path: fields[index + 1] });
  }
  return changes;
}

function commitExists(gitRoot, revision, label, errors) {
  if (!GIT_OID_PATTERN.test(revision ?? "")) {
    return false;
  }
  return addError(
    runGit(gitRoot, ["cat-file", "-e", `${revision}^{commit}`]).ok,
    `manifest.${label}: commit does not exist`,
    errors,
  );
}

function revisionRange(gitRoot, range, label, errors) {
  const rangeResult = runGit(gitRoot, [
    "rev-list",
    "--reverse",
    "--ancestry-path",
    range,
  ]);
  if (!rangeResult.ok) {
    errors.push(`${label}: unable to enumerate revisions (${gitFailure(rangeResult)})`);
    return null;
  }
  return rangeResult.stdout
    .trim()
    .split(/\s+/u)
    .filter((value) => value.length > 0);
}

function exactAttestationChanges(changes, spec) {
  const expected = new Map([
    [DEFAULT_LEDGER_PATH, "M"],
    [spec.manifestPath, "A"],
  ]);
  if (changes.length !== expected.size) {
    return false;
  }
  return changes.every((change) => expected.get(change.path) === change.status);
}

function readCommitBlob(gitRoot, revision, path) {
  return runGit(gitRoot, ["cat-file", "blob", `${revision}:${path}`], {
    encoding: null,
  });
}

function validateAttestationTopology(
  gitRoot,
  reviewedRevision,
  manifestPath,
  spec,
  errors,
) {
  const revisions = revisionRange(
    gitRoot,
    `${reviewedRevision}..HEAD`,
    "attestation",
    errors,
  );
  if (!revisions) {
    return null;
  }

  const candidates = [];
  for (const revision of revisions) {
    const parentsResult = runGit(gitRoot, [
      "rev-list",
      "--parents",
      "-n",
      "1",
      revision,
    ]);
    if (!parentsResult.ok) {
      errors.push(`attestation: unable to inspect parents for ${revision}`);
      continue;
    }
    const revisionAndParents = parentsResult.stdout.trim().split(/\s+/u);
    if (revisionAndParents.length !== 2 || revisionAndParents[1] !== reviewedRevision) {
      continue;
    }
    const changes = parseNameStatus(
      runGit(
        gitRoot,
        [
          "diff-tree",
          "--no-commit-id",
          "--name-status",
          "-r",
          "--no-renames",
          "-z",
          reviewedRevision,
          revision,
        ],
        { encoding: null },
      ),
      `attestation:${revision}`,
      errors,
    );
    if (changes && exactAttestationChanges(changes, spec)) {
      candidates.push(revision);
    }
  }

  if (
    !addError(
      candidates.length === 1,
      `attestation: expected exactly one direct child of reviewed_revision with only M phase7-readiness.json and A ${posix.basename(spec.manifestPath)}`,
      errors,
    )
  ) {
    return null;
  }

  const attestationRevision = candidates[0];
  const attestedManifest = readCommitBlob(
    gitRoot,
    attestationRevision,
    spec.manifestPath,
  );
  if (!attestedManifest.ok) {
    errors.push(
      `attestation: unable to read manifest blob (${gitFailure(attestedManifest)})`,
    );
    return null;
  }

  let currentManifest;
  try {
    currentManifest = readFileSync(manifestPath);
  } catch (error) {
    errors.push(`attestation: unable to read current manifest (${String(error)})`);
    return null;
  }
  addError(
    currentManifest.equals(attestedManifest.stdout),
    "attestation: current manifest bytes differ from the attestation commit",
    errors,
  );

  const descendants = revisionRange(
    gitRoot,
    `${attestationRevision}..HEAD`,
    "attestation history",
    errors,
  );
  if (!descendants) {
    return null;
  }
  for (const revision of descendants) {
    const manifestBlob = readCommitBlob(gitRoot, revision, spec.manifestPath);
    addError(
      manifestBlob.ok && manifestBlob.stdout.equals(attestedManifest.stdout),
      `attestation history: manifest blob changed or disappeared at ${revision}`,
      errors,
    );
  }
  return attestationRevision;
}

function validateGitEvidence(gitRoot, manifest, manifestPath, spec, errors) {
  if (!isRecord(manifest)) {
    return null;
  }
  const workTree = runGit(gitRoot, ["rev-parse", "--is-inside-work-tree"]);
  if (
    !addError(
      workTree.ok && workTree.stdout.trim() === "true",
      "git: root must be inside a work tree",
      errors,
    )
  ) {
    return null;
  }
  const shallow = runGit(gitRoot, ["rev-parse", "--is-shallow-repository"]);
  if (!shallow.ok) {
    errors.push(`git: unable to inspect repository (${gitFailure(shallow)})`);
    return null;
  }
  if (
    !addError(
      shallow.stdout.trim() === "false",
      "git: checkout must be non-shallow",
      errors,
    )
  ) {
    return null;
  }

  let attestationRevision = null;

  const baseExists = commitExists(
    gitRoot,
    manifest.base_revision,
    "base_revision",
    errors,
  );
  const reviewedExists = commitExists(
    gitRoot,
    manifest.reviewed_revision,
    "reviewed_revision",
    errors,
  );

  if (reviewedExists) {
    const parents = runGit(gitRoot, [
      "rev-list",
      "--parents",
      "-n",
      "1",
      manifest.reviewed_revision,
    ]);
    if (!parents.ok) {
      errors.push(
        `manifest.reviewed_revision: unable to inspect parents (${gitFailure(parents)})`,
      );
    } else {
      const revisionAndParents = parents.stdout.trim().split(/\s+/u);
      addError(
        revisionAndParents.length === 2,
        "manifest.reviewed_revision: must have exactly one parent",
        errors,
      );
      if (revisionAndParents.length === 2) {
        if (spec.allowReviewedRange === true) {
          addError(
            runGit(gitRoot, [
              "merge-base",
              "--is-ancestor",
              manifest.base_revision,
              manifest.reviewed_revision,
            ]).ok,
            "manifest.base_revision: must be an ancestor of reviewed_revision",
            errors,
          );
        } else {
          addError(
            revisionAndParents[1] === manifest.base_revision,
            "manifest.base_revision: must be reviewed_revision's parent",
            errors,
          );
        }
      }
    }

    addError(
      runGit(gitRoot, [
        "merge-base",
        "--is-ancestor",
        manifest.reviewed_revision,
        "HEAD",
      ]).ok,
      "manifest.reviewed_revision: must be an ancestor of HEAD",
      errors,
    );

    const tree = runGit(gitRoot, ["rev-parse", `${manifest.reviewed_revision}^{tree}`]);
    if (!tree.ok) {
      errors.push(
        `manifest.reviewed_tree_oid: unable to resolve tree (${gitFailure(tree)})`,
      );
    } else {
      addError(
        manifest.reviewed_tree_oid === tree.stdout.trim(),
        "manifest.reviewed_tree_oid: does not match reviewed revision tree",
        errors,
      );
    }

    attestationRevision = validateAttestationTopology(
      gitRoot,
      manifest.reviewed_revision,
      manifestPath,
      spec,
      errors,
    );
  }

  if (baseExists && reviewedExists) {
    try {
      const diff = readCanonicalReviewDiff(
        gitRoot,
        manifest.base_revision,
        manifest.reviewed_revision,
      );
      const digest = createHash("sha256").update(diff).digest("hex");
      addError(
        manifest.diff_sha256 === `sha256:${digest}`,
        "manifest.diff_sha256: does not match exact reviewed diff bytes",
        errors,
      );
    } catch (error) {
      errors.push(`manifest.diff_sha256: unable to read diff (${String(error)})`);
    }

    const changes = parseNameStatus(
      runGit(
        gitRoot,
        [
          "diff-tree",
          "--no-commit-id",
          "--name-status",
          "-r",
          "--first-parent",
          "--no-renames",
          "-z",
          spec.allowReviewedRange === true
            ? manifest.base_revision
            : `${manifest.reviewed_revision}^`,
          manifest.reviewed_revision,
        ],
        { encoding: null },
      ),
      "manifest.protected_files",
      errors,
    );
    if (changes && Array.isArray(manifest.protected_files)) {
      for (const change of changes) {
        addError(
          change.status === "A" || change.status === "M",
          `manifest.protected_files: reviewed commit must contain only A/M; found ${change.status} ${change.path}`,
          errors,
        );
      }
      const actualPaths = changes.map((change) => change.path).sort(comparePaths);
      const listedPaths = manifest.protected_files
        .filter((entry) => isRecord(entry) && typeof entry.path === "string")
        .map((entry) => entry.path);
      addError(
        JSON.stringify(listedPaths) === JSON.stringify(actualPaths),
        "manifest.protected_files: must exactly match sorted first-parent A/M paths",
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
        const blob = runGit(
          gitRoot,
          ["cat-file", "blob", `${manifest.reviewed_revision}:${entry.path}`],
          { encoding: null },
        );
        if (!blob.ok) {
          errors.push(
            `manifest.protected_files: unable to read raw blob ${entry.path}`,
          );
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
  }
  return attestationRevision;
}

export function validateSecurityReviewEvidence({
  root = REPO_ROOT,
  gitRoot = root,
  ledgerPath,
  manifestPath,
  supportedRelease = false,
} = {}) {
  const errors = [];
  const absoluteRoot = resolve(root);
  const absoluteGitRoot = resolve(gitRoot);
  const sourceMarkerExists = existsSync(
    resolve(absoluteRoot, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH),
  );
  let sourceAndGitRootsMatch = false;
  try {
    sourceAndGitRootsMatch =
      realpathSync(absoluteRoot) === realpathSync(absoluteGitRoot);
  } catch {
    sourceAndGitRootsMatch = false;
  }
  const publicSnapshot = validatePublicSourceSnapshotProvenance({
    root: absoluteRoot,
    gitRoot: absoluteGitRoot,
    immutablePaths: PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  });
  errors.push(...publicSnapshot.errors);
  const mode = publicSnapshot.active ? "public_source_snapshot" : "git_lineage";
  const skippedChecks = publicSnapshot.active
    ? [...PUBLIC_SNAPSHOT_SKIPPED_CHECKS]
    : [];
  if (publicSnapshot.active && ledgerPath !== undefined) {
    errors.push(
      "public_source_snapshot: custom ledgerPath is forbidden in snapshot mode",
    );
  }
  if (publicSnapshot.active && manifestPath !== undefined) {
    errors.push(
      "public_source_snapshot: custom manifestPath is forbidden in snapshot mode",
    );
  }
  if (supportedRelease && ledgerPath !== undefined) {
    errors.push("supported_release_evidence: custom ledgerPath is forbidden");
  }
  if (supportedRelease && manifestPath !== undefined) {
    errors.push("supported_release_evidence: custom manifestPath is forbidden");
  }
  if (supportedRelease && !sourceAndGitRootsMatch) {
    errors.push("supported_release_evidence: source and Git roots must be identical");
  }
  if (supportedRelease && sourceMarkerExists) {
    errors.push(
      "public_source_snapshot: supported release requires public-history-native review evidence",
    );
  }
  if (supportedRelease) {
    errors.push(
      "supported_release_evidence: exact release-source review gate is not implemented",
    );
    validateSupportedReleaseGitIsolation(absoluteGitRoot, errors);
  }
  const finish = () => ({
    ok: errors.length === 0,
    errors,
    mode,
    skippedChecks,
    supportedReleaseEvidenceEligible:
      supportedRelease &&
      !publicSnapshot.active &&
      !sourceMarkerExists &&
      sourceAndGitRootsMatch &&
      errors.length === 0,
  });
  const absoluteLedgerPath = resolveFromRoot(
    absoluteRoot,
    ledgerPath,
    DEFAULT_LEDGER_PATH,
  );
  const ledger = readLedger(absoluteLedgerPath, errors);
  if (!ledger) {
    return finish();
  }
  if (supportedRelease) {
    validateSupportedReleaseInventory(ledger, errors);
  }
  const specs = manifestPath ? [REVIEW_SPECS[0]] : REVIEW_SPECS;
  const supportedReleaseAttestations = [];
  for (const spec of specs) {
    if (!evidenceRequiredForPacket(ledger, spec, errors)) {
      continue;
    }
    const absoluteManifestPath = resolveFromRoot(
      absoluteRoot,
      manifestPath ?? spec.manifestPath,
      spec.manifestPath,
    );
    if (
      !addError(
        existsSync(absoluteManifestPath),
        `manifest: required file missing at ${absoluteManifestPath}`,
        errors,
      )
    ) {
      continue;
    }
    const manifest = readJson(absoluteManifestPath, "manifest", errors);
    validateManifestShape(manifest, spec, errors);
    if (!publicSnapshot.active) {
      const attestationRevision = validateGitEvidence(
        absoluteGitRoot,
        manifest,
        absoluteManifestPath,
        spec,
        errors,
      );
      if (supportedRelease && attestationRevision) {
        supportedReleaseAttestations.push({ attestationRevision, spec });
      }
    }
  }
  if (supportedRelease) {
    validateSupportedReleaseManifestHistory(
      absoluteGitRoot,
      supportedReleaseAttestations,
      errors,
    );
    validateSupportedReleaseSourceBinding(
      absoluteGitRoot,
      supportedReleaseAttestations,
      errors,
    );
  }
  return finish();
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }
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
  const unknownArgs = args.filter((arg) => arg !== "--supported-release");
  if (unknownArgs.length > 0) {
    process.stderr.write(
      `Security review evidence check: unknown argument ${unknownArgs[0]}\n`,
    );
    process.exitCode = 2;
  } else {
    const result = validateSecurityReviewEvidence({
      supportedRelease: args.includes("--supported-release"),
    });
    if (result.ok) {
      const skipped =
        result.skippedChecks.length > 0 ? result.skippedChecks.join(",") : "none";
      process.stdout.write(
        `Security review evidence check: PASS mode=${result.mode} skipped=${skipped} supported_release_evidence_eligible=${result.supportedReleaseEvidenceEligible}\n`,
      );
    } else {
      process.stderr.write(
        `Security review evidence check: FAIL (${result.errors.length}) mode=${result.mode}\n`,
      );
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      process.exitCode = 1;
    }
  }
}
