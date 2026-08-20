import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  readCanonicalReviewDiff,
  validateSecurityReviewEvidence,
} from "./check-security-review-evidence.mjs";
import {
  PUBLIC_SOURCE_ROOT_SUBJECT,
  PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH,
  PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
} from "./public-source-snapshot-provenance.mjs";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..");
const VALIDATOR_PATH = resolve(TEST_DIR, "check-security-review-evidence.mjs");
const SNAPSHOT_VALIDATOR_PATH = resolve(
  TEST_DIR,
  "public-source-snapshot-provenance.mjs",
);
const LEDGER_PATH = "docs/reference/phase7-readiness.json";
const MANIFEST_PATH = "docs/reference/security-reviews/P7-B1/correction-review.json";
const C1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-C1/implementation-review.json";
const A1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-A1/implementation-review.json";
const R1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-R1/implementation-review.json";
const X1_MANIFEST_PATH =
  "docs/reference/security-reviews/P7-X1/implementation-review.json";
const TEMP_ROOTS = [];
const FINDINGS = [
  ["P7-B1-F1", "high"],
  ["P7-B1-F2", "high"],
  ["P7-B1-F3", "medium"],
  ["P7-B1-F4", "medium"],
  ["P7-B1-F5", "medium"],
  ["P7-B1-F6", "maintainability"],
  ["P7-B1-F7", "governance"],
];

function tempRoot(prefix = "security-review-evidence-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  TEMP_ROOTS.push(root);
  return root;
}

function git(root, args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

function gitText(root, args) {
  return git(root, args, { encoding: "utf8" }).trim();
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function writeLedger(root, status) {
  writeJson(resolve(root, LEDGER_PATH), {
    packets: [
      {
        packet_id: "P7-B1",
        status,
      },
    ],
  });
}

function parseNameStatus(buffer) {
  const fields = buffer.toString("utf8").split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    changes.push({ status: fields[index], path: fields[index + 1] });
  }
  return changes;
}

function buildManifest(
  root,
  baseRevision,
  reviewedRevision,
  {
    packetId = "P7-B1",
    reviewType = "independent_correction_review",
    findings = FINDINGS,
  } = {},
) {
  const changes = parseNameStatus(
    git(root, [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "-r",
      "--first-parent",
      "--no-renames",
      "-z",
      `${reviewedRevision}^`,
      reviewedRevision,
    ]),
  );
  const protectedFiles = changes
    .map((change) => ({
      path: change.path,
      sha256: sha256(
        git(root, ["cat-file", "blob", `${reviewedRevision}:${change.path}`]),
      ),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const diff = readCanonicalReviewDiff(root, baseRevision, reviewedRevision);

  return {
    schema_version: "lnsat.security_review.v1",
    review_id: `${packetId}-review-test`,
    review_type: reviewType,
    packet_ids: [packetId],
    base_revision: baseRevision,
    reviewed_revision: reviewedRevision,
    reviewed_tree_oid: gitText(root, ["rev-parse", `${reviewedRevision}^{tree}`]),
    diff_sha256: sha256(diff),
    protected_files: protectedFiles,
    reviewer: {
      identity: "independent-reviewer@lnsat.invalid",
      kind: "agent",
      independent_from_author: true,
      tool: "Codex Spark High",
    },
    findings: findings.map(([findingId, severity]) => ({
      finding_id: findingId,
      severity,
      status: "resolved",
      disposition: "accepted_fixed",
      summary: `${findingId} correction independently verified`,
      resolution_revision: reviewedRevision,
    })),
    verdict: "approved",
    execution_authorized: false,
    runtime_authority_opened: false,
    side_effects: [],
  };
}

function createFixtureTemplate({ manifestMutator } = {}) {
  const root = tempRoot();
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Correction Author"]);
  git(root, ["config", "user.email", "correction-author@lnsat.invalid"]);

  mkdirSync(resolve(root, "scripts"), { recursive: true });
  cpSync(VALIDATOR_PATH, resolve(root, "scripts/check-security-review-evidence.mjs"));
  cpSync(
    SNAPSHOT_VALIDATOR_PATH,
    resolve(root, "scripts/public-source-snapshot-provenance.mjs"),
  );
  mkdirSync(resolve(root, "src"), { recursive: true });
  writeFileSync(resolve(root, "src/existing.txt"), "before\n", "utf8");
  writeLedger(root, "blocked_pending_explicit_input");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "fixture base"]);
  const baseRevision = gitText(root, ["rev-parse", "HEAD"]);

  writeFileSync(resolve(root, "src/existing.txt"), "after\n", "utf8");
  writeFileSync(resolve(root, "src/new.txt"), "new\n", "utf8");
  git(root, ["add", "src/existing.txt", "src/new.txt"]);
  git(root, ["commit", "-q", "-m", "P7-B1 correction"]);
  const reviewedRevision = gitText(root, ["rev-parse", "HEAD"]);

  writeLedger(root, "complete");
  const manifest = buildManifest(root, baseRevision, reviewedRevision);
  manifestMutator?.(manifest);
  writeJson(resolve(root, MANIFEST_PATH), manifest);
  git(root, ["add", LEDGER_PATH, MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "record independent review"]);
  return { root, baseRevision, reviewedRevision };
}

let fixtureTemplate;

function createFixture() {
  fixtureTemplate ??= createFixtureTemplate();
  const cloneParent = tempRoot("security-review-clone-");
  const root = resolve(cloneParent, "repo");
  git(cloneParent, ["clone", "-q", "--shared", fixtureTemplate.root, root]);
  git(root, ["config", "user.name", "Correction Author"]);
  git(root, ["config", "user.email", "correction-author@lnsat.invalid"]);
  return {
    root,
    baseRevision: fixtureTemplate.baseRevision,
    reviewedRevision: fixtureTemplate.reviewedRevision,
  };
}

function cloneIndependent(sourceRoot) {
  const cloneParent = tempRoot("security-review-independent-");
  const root = resolve(cloneParent, "repo");
  git(cloneParent, ["clone", "-q", "--no-local", sourceRoot, root]);
  git(root, ["config", "user.name", "Correction Author"]);
  git(root, ["config", "user.email", "correction-author@lnsat.invalid"]);
  return root;
}

function installFixtureTomlParser(root) {
  const destination = resolve(root, "node_modules/smol-toml");
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(resolve(REPO_ROOT, "node_modules/smol-toml"), destination, {
    recursive: true,
  });
}

function writeDualLedger(root, c1Status) {
  writeJson(resolve(root, LEDGER_PATH), {
    packets: [
      { packet_id: "P7-B1", status: "complete" },
      { packet_id: "P7-C1", status: c1Status },
    ],
  });
}

function createDualFixture() {
  const root = tempRoot("security-review-dual-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Packet Author"]);
  git(root, ["config", "user.email", "packet-author@lnsat.invalid"]);
  mkdirSync(resolve(root, "scripts"), { recursive: true });
  cpSync(VALIDATOR_PATH, resolve(root, "scripts/check-security-review-evidence.mjs"));
  cpSync(
    SNAPSHOT_VALIDATOR_PATH,
    resolve(root, "scripts/public-source-snapshot-provenance.mjs"),
  );
  mkdirSync(resolve(root, "src"), { recursive: true });
  writeFileSync(resolve(root, "src/base.txt"), "base\n", "utf8");
  writeJson(resolve(root, LEDGER_PATH), {
    packets: [
      { packet_id: "P7-B1", status: "blocked_pending_explicit_input" },
      { packet_id: "P7-C1", status: "blocked_pending_explicit_input" },
    ],
  });
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "dual fixture base"]);

  const b1Base = gitText(root, ["rev-parse", "HEAD"]);
  writeFileSync(resolve(root, "src/b1.txt"), "B1 reviewed source\n", "utf8");
  git(root, ["add", "src/b1.txt"]);
  git(root, ["commit", "-q", "-m", "P7-B1 reviewed source"]);
  const b1Reviewed = gitText(root, ["rev-parse", "HEAD"]);
  writeDualLedger(root, "blocked_pending_explicit_input");
  writeJson(resolve(root, MANIFEST_PATH), buildManifest(root, b1Base, b1Reviewed));
  git(root, ["add", LEDGER_PATH, MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "attest P7-B1"]);

  const c1Base = gitText(root, ["rev-parse", "HEAD"]);
  writeFileSync(resolve(root, "src/c1.txt"), "C1 reviewed source\n", "utf8");
  git(root, ["add", "src/c1.txt"]);
  git(root, ["commit", "-q", "-m", "P7-C1 reviewed source"]);
  const c1Reviewed = gitText(root, ["rev-parse", "HEAD"]);
  writeDualLedger(root, "complete");
  writeJson(
    resolve(root, C1_MANIFEST_PATH),
    buildManifest(root, c1Base, c1Reviewed, {
      packetId: "P7-C1",
      reviewType: "independent_implementation_review",
      findings: [["P7-C1-F1", "low"]],
    }),
  );
  git(root, ["add", LEDGER_PATH, C1_MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "attest P7-C1"]);
  return { root, c1Reviewed };
}

function writeA1Ledger(root, a1Status, c1Status = "complete") {
  writeJson(resolve(root, LEDGER_PATH), {
    packets: [
      { packet_id: "P7-B1", status: "complete" },
      { packet_id: "P7-C1", status: c1Status },
      { packet_id: "P7-A1", status: a1Status },
    ],
  });
}

function createA1Fixture({ a1Status = "complete", c1Status = "complete" } = {}) {
  const { root } = createDualFixture();
  const a1Base = gitText(root, ["rev-parse", "HEAD"]);
  writeFileSync(resolve(root, "src/a1.txt"), "A1 reviewed source\n", "utf8");
  git(root, ["add", "src/a1.txt"]);
  git(root, ["commit", "-q", "-m", "P7-A1 reviewed source"]);
  const a1Reviewed = gitText(root, ["rev-parse", "HEAD"]);
  writeA1Ledger(root, a1Status, c1Status);
  writeJson(
    resolve(root, A1_MANIFEST_PATH),
    buildManifest(root, a1Base, a1Reviewed, {
      packetId: "P7-A1",
      reviewType: "independent_implementation_review",
      findings: [],
    }),
  );
  git(root, ["add", LEDGER_PATH, A1_MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "attest P7-A1"]);
  return { root, a1Reviewed };
}

function createX1Fixture({ x1Status = "complete" } = {}) {
  const { root } = createA1Fixture();
  const x1Base = gitText(root, ["rev-parse", "HEAD"]);
  writeFileSync(resolve(root, "src/x1.txt"), "X1 reviewed source\n", "utf8");
  git(root, ["add", "src/x1.txt"]);
  git(root, ["commit", "-q", "-m", "P7-X1 reviewed source"]);
  const x1Reviewed = gitText(root, ["rev-parse", "HEAD"]);
  writeJson(resolve(root, LEDGER_PATH), {
    packets: [
      { packet_id: "P7-B1", status: "complete" },
      { packet_id: "P7-C1", status: "complete" },
      { packet_id: "P7-A1", status: "complete" },
      { packet_id: "P7-X1", status: x1Status },
    ],
  });
  writeJson(
    resolve(root, X1_MANIFEST_PATH),
    buildManifest(root, x1Base, x1Reviewed, {
      packetId: "P7-X1",
      reviewType: "independent_implementation_review",
      findings: [],
    }),
  );
  git(root, ["add", LEDGER_PATH, X1_MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "attest P7-X1"]);
  return { root, x1Reviewed };
}

const SUPPORTED_RELEASE_REVIEW_SPECS = [
  {
    packetId: "P7-B1",
    manifestPath: MANIFEST_PATH,
    reviewType: "independent_correction_review",
    findings: FINDINGS,
  },
  {
    packetId: "P7-C1",
    manifestPath: C1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findings: [],
  },
  {
    packetId: "P7-A1",
    manifestPath: A1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findings: [],
  },
  {
    packetId: "P7-R1",
    manifestPath: R1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findings: [],
  },
  {
    packetId: "P7-X1",
    manifestPath: X1_MANIFEST_PATH,
    reviewType: "independent_implementation_review",
    findings: [],
  },
];

let supportedReleaseFixtureTemplate;

function createSupportedReleaseFixtureTemplate() {
  const root = tempRoot("security-review-supported-release-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Packet Author"]);
  git(root, ["config", "user.email", "packet-author@lnsat.invalid"]);
  mkdirSync(resolve(root, "scripts"), { recursive: true });
  cpSync(VALIDATOR_PATH, resolve(root, "scripts/check-security-review-evidence.mjs"));
  cpSync(
    SNAPSHOT_VALIDATOR_PATH,
    resolve(root, "scripts/public-source-snapshot-provenance.mjs"),
  );
  mkdirSync(resolve(root, "src"), { recursive: true });
  writeFileSync(resolve(root, "src/base.txt"), "base\n", "utf8");
  writeJson(resolve(root, LEDGER_PATH), {
    schema_version: "lnsat.phase7_readiness.v3",
    packets: SUPPORTED_RELEASE_REVIEW_SPECS.map(({ packetId }) => ({
      packet_id: packetId,
      status: "blocked_pending_explicit_input",
    })),
  });
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "supported release fixture base"]);

  const completed = new Set();
  for (const spec of SUPPORTED_RELEASE_REVIEW_SPECS) {
    const baseRevision = gitText(root, ["rev-parse", "HEAD"]);
    writeFileSync(
      resolve(root, `src/${spec.packetId}.txt`),
      `${spec.packetId} reviewed source\n`,
      "utf8",
    );
    git(root, ["add", `src/${spec.packetId}.txt`]);
    git(root, ["commit", "-q", "-m", `${spec.packetId} reviewed source`]);
    const reviewedRevision = gitText(root, ["rev-parse", "HEAD"]);
    completed.add(spec.packetId);
    writeJson(resolve(root, LEDGER_PATH), {
      schema_version: "lnsat.phase7_readiness.v3",
      packets: SUPPORTED_RELEASE_REVIEW_SPECS.map(({ packetId }) => ({
        packet_id: packetId,
        status: completed.has(packetId) ? "complete" : "blocked_pending_explicit_input",
      })),
    });
    writeJson(
      resolve(root, spec.manifestPath),
      buildManifest(root, baseRevision, reviewedRevision, {
        packetId: spec.packetId,
        reviewType: spec.reviewType,
        findings: spec.findings,
      }),
    );
    git(root, ["add", LEDGER_PATH, spec.manifestPath]);
    git(root, ["commit", "-q", "-m", `attest ${spec.packetId}`]);
  }
  return root;
}

function createSupportedReleaseFixture() {
  supportedReleaseFixtureTemplate ??= createSupportedReleaseFixtureTemplate();
  return cloneIndependent(supportedReleaseFixtureTemplate);
}

function createPublicSnapshotFixture() {
  const root = tempRoot("security-review-public-snapshot-");
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "Public Snapshot Test"]);
  git(root, ["config", "user.email", "public-snapshot@lnsat.invalid"]);
  cpSync(resolve(REPO_ROOT, "package.json"), resolve(root, "package.json"));
  for (const path of PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS) {
    const destination = resolve(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(resolve(REPO_ROOT, path), destination);
  }
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", PUBLIC_SOURCE_ROOT_SUBJECT]);
  return root;
}

function editManifest(root, mutator) {
  const path = resolve(root, MANIFEST_PATH);
  const manifest = readJson(path);
  mutator(manifest);
  writeJson(path, manifest);
}

function editC1Manifest(root, mutator) {
  const path = resolve(root, C1_MANIFEST_PATH);
  const manifest = readJson(path);
  mutator(manifest);
  writeJson(path, manifest);
}

function editA1Manifest(root, mutator) {
  const path = resolve(root, A1_MANIFEST_PATH);
  const manifest = readJson(path);
  mutator(manifest);
  writeJson(path, manifest);
}

test.after(() => {
  while (TEMP_ROOTS.length > 0) {
    rmSync(TEMP_ROOTS.pop(), { force: true, recursive: true });
  }
});

test("valid P7-B1 independent correction review passes", () => {
  const { root } = createFixture();
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
  assert.equal(result.supportedReleaseEvidenceEligible, false);
});

test("strict supported-release evidence remains blocked without exact-source review", () => {
  const root = createSupportedReleaseFixture();
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.equal(result.mode, "git_lineage");
  assert.equal(result.supportedReleaseEvidenceEligible, false);
  assert.match(
    result.errors.join("\n"),
    /exact release-source review gate is not implemented/u,
  );
});

test("strict supported-release evidence rejects empty review inventory", () => {
  const root = createSupportedReleaseFixture();
  writeJson(resolve(root, LEDGER_PATH), {
    schema_version: "lnsat.phase7_readiness.v3",
    packets: [],
  });
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expected exactly one P7-B1 packet/u);
});

test("strict supported-release evidence rejects missing review packet", () => {
  const root = createSupportedReleaseFixture();
  const ledger = readJson(resolve(root, LEDGER_PATH));
  ledger.packets = ledger.packets.filter((packet) => packet.packet_id !== "P7-R1");
  writeJson(resolve(root, LEDGER_PATH), ledger);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expected exactly one P7-R1 packet/u);
});

test("strict supported-release evidence rejects custom evidence paths", () => {
  const root = createSupportedReleaseFixture();
  const result = validateSecurityReviewEvidence({
    root,
    supportedRelease: true,
    ledgerPath: LEDGER_PATH,
    manifestPath: MANIFEST_PATH,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /custom ledgerPath is forbidden/u);
  assert.match(result.errors.join("\n"), /custom manifestPath is forbidden/u);
});

test("strict supported-release evidence rejects nested source root", () => {
  const root = createSupportedReleaseFixture();
  const nestedRoot = resolve(root, "nested-source");
  mkdirSync(nestedRoot, { recursive: true });
  cpSync(resolve(root, "docs"), resolve(nestedRoot, "docs"), {
    recursive: true,
  });
  const result = validateSecurityReviewEvidence({
    root: nestedRoot,
    gitRoot: nestedRoot,
    supportedRelease: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source root must equal Git top-level/u);
});

test("strict supported-release evidence rejects unmerged manifest mutation", () => {
  const root = createSupportedReleaseFixture();
  const baseBranch = gitText(root, ["branch", "--show-current"]);
  git(root, ["switch", "-q", "-c", "evidence-mutation"]);
  const path = resolve(root, MANIFEST_PATH);
  writeFileSync(path, `${readFileSync(path, "utf8")}\n`, "utf8");
  git(root, ["add", MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "test: mutate review evidence"]);
  git(root, ["switch", "-q", baseBranch]);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /P7-B1 manifest changed or disappeared/u);
});

test("strict supported-release evidence rejects unmerged change then restore", () => {
  const root = createSupportedReleaseFixture();
  const baseBranch = gitText(root, ["branch", "--show-current"]);
  const path = resolve(root, MANIFEST_PATH);
  const original = readFileSync(path);
  git(root, ["switch", "-q", "-c", "evidence-restore"]);
  writeFileSync(path, `${original.toString("utf8")}\n`, "utf8");
  git(root, ["add", MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "test: mutate review evidence"]);
  writeFileSync(path, original);
  git(root, ["add", MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "test: restore review evidence"]);
  git(root, ["switch", "-q", baseBranch]);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /P7-B1 manifest changed or disappeared/u);
});

test("strict supported-release evidence rejects sibling manifest injection", () => {
  const root = createSupportedReleaseFixture();
  const baseBranch = gitText(root, ["branch", "--show-current"]);
  const path = resolve(root, MANIFEST_PATH);
  const manifest = readJson(path);
  const original = readFileSync(path);
  git(root, ["switch", "-q", "-c", "evidence-sibling", manifest.reviewed_revision]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, original);
  git(root, ["add", MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "test: inject sibling review evidence"]);
  git(root, ["switch", "-q", baseBranch]);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /P7-B1 manifest exists outside attestation lineage/u,
  );
});

test("strict supported-release evidence rejects marker on unmerged ref", () => {
  const root = createSupportedReleaseFixture();
  const baseBranch = gitText(root, ["branch", "--show-current"]);
  git(root, ["switch", "-q", "-c", "late-snapshot-marker"]);
  writeJson(resolve(root, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH), {
    invalid_late_marker: true,
  });
  git(root, ["add", PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH]);
  git(root, ["commit", "-q", "-m", "test: add late snapshot marker"]);
  git(root, ["switch", "-q", baseBranch]);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.equal(result.mode, "public_source_snapshot");
  assert.equal(result.supportedReleaseEvidenceEligible, false);
  assert.match(result.errors.join("\n"), /marker is required/u);
});

test("strict supported-release evidence rejects post-attestation source commit", () => {
  const root = createSupportedReleaseFixture();
  writeFileSync(resolve(root, "src/post-review.txt"), "unreviewed source\n", "utf8");
  git(root, ["add", "src/post-review.txt"]);
  git(root, ["commit", "-q", "-m", "test: add post-review source"]);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /HEAD tree must equal final P7-X1/u);
});

test("strict supported-release evidence rejects dirty source state", () => {
  for (const state of ["unstaged", "staged", "untracked"]) {
    const root = createSupportedReleaseFixture();
    if (state === "untracked") {
      writeFileSync(resolve(root, "untracked.txt"), "untracked\n", "utf8");
    } else {
      writeFileSync(resolve(root, "src/base.txt"), `${state}\n`, "utf8");
      if (state === "staged") git(root, ["add", "src/base.txt"]);
    }
    const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
    assert.equal(result.ok, false, state);
    assert.match(result.errors.join("\n"), /index and worktree must be clean/u, state);
  }
});

test("strict supported-release evidence rejects replacement refs", () => {
  const { root: sharedRoot } = createFixture();
  const root = cloneIndependent(sharedRoot);
  const rootRevision = gitText(root, ["rev-list", "--max-parents=0", "HEAD"]);
  git(root, ["update-ref", `refs/replace/${rootRevision}`, rootRevision]);
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /replacement refs are forbidden/u);
});

test("security review Git calls ignore repository-selection environment", () => {
  const { root } = createFixture();
  const decoy = tempRoot("security-review-decoy-");
  git(decoy, ["init", "-q"]);
  const previousGitDirectory = process.env.GIT_DIR;
  process.env.GIT_DIR = resolve(decoy, ".git");
  try {
    const result = validateSecurityReviewEvidence({ root });
    assert.equal(result.ok, true, result.errors.join("\n"));
  } finally {
    if (previousGitDirectory === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDirectory;
  }
});

test("fresh public snapshot validates shapes but reports private replay skipped", () => {
  const root = createPublicSnapshotFixture();
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.mode, "public_source_snapshot");
  assert.equal(result.supportedReleaseEvidenceEligible, false);
  assert.ok(result.skippedChecks.includes("private_review_diff_replay"));
  assert.ok(result.skippedChecks.includes("private_reviewer_identity_verification"));
});

test("fresh public snapshot cannot satisfy supported release evidence", () => {
  const root = createPublicSnapshotFixture();
  const result = validateSecurityReviewEvidence({ root, supportedRelease: true });
  assert.equal(result.ok, false);
  assert.equal(result.mode, "public_source_snapshot");
  assert.match(result.errors.join("\n"), /public-history-native review evidence/u);
});

test("fresh public source cannot borrow private Git root for supported release", () => {
  const publicRoot = createPublicSnapshotFixture();
  const { root: privateGitRoot } = createFixture();
  const result = validateSecurityReviewEvidence({
    root: publicRoot,
    gitRoot: privateGitRoot,
    supportedRelease: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.supportedReleaseEvidenceEligible, false);
  assert.match(result.errors.join("\n"), /source and Git roots must match/u);
});

test("fresh public snapshot rejects manifest shape drift", () => {
  const root = createPublicSnapshotFixture();
  editManifest(root, (manifest) => {
    manifest.untrusted_claim = true;
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.equal(result.mode, "public_source_snapshot");
  assert.match(result.errors.join("\n"), /unexpected key untrusted_claim/u);
  assert.match(result.errors.join("\n"), /current bytes differ from root/u);
});

test("fresh public snapshot rejects custom evidence path overrides", () => {
  const root = createPublicSnapshotFixture();
  const result = validateSecurityReviewEvidence({
    root,
    ledgerPath: LEDGER_PATH,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /custom ledgerPath is forbidden/u);
});

test("valid independent P7-B1 and P7-C1 attestations both pass", () => {
  const { root } = createDualFixture();
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
});

test("blocked P7-C1 does not require implementation review", () => {
  const { root } = createFixture();
  writeDualLedger(root, "blocked_pending_explicit_input");
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("complete P7-C1 requires implementation review", () => {
  const { root } = createDualFixture();
  rmSync(resolve(root, C1_MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /P7-C1.*implementation-review|implementation-review/u,
  );
});

test("P7-C1 rejects wrong type packet and finding namespace", () => {
  const { root } = createDualFixture();
  editC1Manifest(root, (manifest) => {
    manifest.review_type = "independent_correction_review";
    manifest.packet_ids = ["P7-B1"];
    manifest.findings[0].finding_id = "P7-B1-F8";
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /independent_implementation_review/u);
  assert.match(errors, /packet_ids.*P7-C1/u);
  assert.match(errors, /P7-C1 finding identifier/u);
});

test("complete P7-A1 requires implementation review", () => {
  const { root } = createA1Fixture();
  rmSync(resolve(root, A1_MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /required file missing/u);
});

test("blocked P7-A1 does not require implementation review", () => {
  const { root } = createA1Fixture({ a1Status: "blocked_pending_explicit_input" });
  rmSync(resolve(root, A1_MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("P7-A1 rejects wrong type packet and finding namespace", () => {
  const { root } = createA1Fixture();
  editA1Manifest(root, (manifest) => {
    manifest.review_type = "independent_correction_review";
    manifest.packet_ids = ["P7-B1"];
    manifest.findings = [
      {
        finding_id: "P7-B1-F1",
        severity: "low",
        status: "resolved",
        disposition: "accepted_fixed",
        summary: "invalid for A1 packet",
        resolution_revision: manifest.reviewed_revision,
      },
    ];
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /independent_implementation_review/u);
  assert.match(errors, /packet_ids.*P7-A1/u);
  assert.match(errors, /P7-A1 finding identifier/u);
});

test("P7-A1 manifest rejects bogus reviewed revision", () => {
  const { root } = createA1Fixture();
  editA1Manifest(root, (manifest) => {
    manifest.reviewed_revision = "0".repeat(40);
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /reviewed_revision: commit does not exist/u);
});

test("complete P7-X1 requires independent implementation review", () => {
  const { root } = createX1Fixture();
  rmSync(resolve(root, X1_MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /required file missing/u);
});

test("blocked P7-X1 does not require independent implementation review", () => {
  const { root } = createX1Fixture({ x1Status: "blocked_pending_explicit_input" });
  rmSync(resolve(root, X1_MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("P7-C1 manifest may never change after attestation", () => {
  const { root } = createDualFixture();
  const manifestPath = resolve(root, C1_MANIFEST_PATH);
  const original = readFileSync(manifestPath);
  editC1Manifest(root, (manifest) => {
    manifest.reviewer.tool = "rewritten C1 tool claim";
  });
  git(root, ["add", C1_MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "rewrite C1 attestation"]);
  writeFileSync(manifestPath, original);
  git(root, ["add", C1_MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "restore C1 attestation"]);
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /manifest blob changed or disappeared/u);
});

test("separate source and Git roots pass", () => {
  const { root: gitRoot } = createFixture();
  const sourceRoot = tempRoot("security-review-source-");
  cpSync(resolve(gitRoot, "docs"), resolve(sourceRoot, "docs"), {
    recursive: true,
  });
  const result = validateSecurityReviewEvidence({ root: sourceRoot, gitRoot });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("custom ledger and manifest paths pass", () => {
  const { root } = createFixture();
  const ledgerPath = "test-input/ledger.json";
  const manifestPath = "test-input/review.json";
  writeJson(resolve(root, ledgerPath), readJson(resolve(root, LEDGER_PATH)));
  writeJson(resolve(root, manifestPath), readJson(resolve(root, MANIFEST_PATH)));
  const result = validateSecurityReviewEvidence({
    root,
    ledgerPath,
    manifestPath,
  });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("incomplete P7-B1 does not require review manifest", () => {
  const { root } = createFixture();
  writeLedger(root, "blocked_pending_explicit_input");
  rmSync(resolve(root, MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("ledger without P7-B1 does not require review manifest", () => {
  const { root } = createFixture();
  writeJson(resolve(root, LEDGER_PATH), { packets: [] });
  rmSync(resolve(root, MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("complete P7-B1 rejects missing review manifest", () => {
  const { root } = createFixture();
  rmSync(resolve(root, MANIFEST_PATH));
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /required file missing/u);
});

test("complete P7-B1 rejects malformed review manifest", () => {
  const { root } = createFixture();
  writeFileSync(resolve(root, MANIFEST_PATH), "{\n", "utf8");
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unable to parse/u);
});

test("manifest rejects unexpected keys", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.untrusted_claim = true;
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unexpected key untrusted_claim/u);
});

test("manifest rejects bogus base commit", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.base_revision = "0".repeat(40);
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /base_revision: commit does not exist/u);
});

test("manifest rejects bogus reviewed tree", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.reviewed_tree_oid = "a".repeat(40);
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /does not match reviewed revision tree/u);
});

test("manifest rejects bogus exact diff digest", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.diff_sha256 = `sha256:${"b".repeat(64)}`;
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /does not match exact reviewed diff bytes/u);
});

test("manifest rejects bogus raw file digest", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.protected_files[0].sha256 = `sha256:${"c".repeat(64)}`;
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /raw blob SHA-256 mismatch/u);
});

test("manifest rejects shallow checkout", () => {
  const { root: sourceRoot } = createFixture();
  const cloneParent = tempRoot("security-review-shallow-");
  const shallowRoot = resolve(cloneParent, "repo");
  git(cloneParent, ["clone", "-q", "--no-local", "--depth=1", sourceRoot, shallowRoot]);
  const result = validateSecurityReviewEvidence({ root: shallowRoot });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /checkout must be non-shallow/u);
});

test("later source commit does not rewrite the completed review", () => {
  const { root } = createFixture();
  writeFileSync(resolve(root, "src/existing.txt"), "changed later\n", "utf8");
  git(root, ["add", "src/existing.txt"]);
  git(root, ["commit", "-q", "-m", "later source packet"]);
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("synthetic integration merge preserves attestation topology", () => {
  const { root, baseRevision } = createFixture();
  git(root, ["branch", "review-head", "HEAD"]);
  git(root, ["switch", "-q", "-c", "integration", baseRevision]);
  writeFileSync(resolve(root, "src/integration.txt"), "integration\n", "utf8");
  git(root, ["add", "src/integration.txt"]);
  git(root, ["commit", "-q", "-m", "integration base advances"]);
  git(root, ["merge", "-q", "--no-ff", "review-head", "-m", "synthetic PR merge"]);
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("manifest blob may never change after attestation, even if restored", () => {
  const { root } = createFixture();
  const manifestPath = resolve(root, MANIFEST_PATH);
  const original = readFileSync(manifestPath);
  editManifest(root, (manifest) => {
    manifest.reviewer.tool = "rewritten tool claim";
  });
  git(root, ["add", MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "rewrite attestation"]);
  writeFileSync(manifestPath, original);
  git(root, ["add", MANIFEST_PATH]);
  git(root, ["commit", "-q", "-m", "restore attestation bytes"]);
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /manifest blob changed or disappeared/u);
});

test("unique extra resolved reviewer finding is allowed", () => {
  const { root } = createFixtureTemplate({
    manifestMutator(manifest) {
      manifest.findings.push({
        finding_id: "P7-B1-F8",
        severity: "low",
        status: "resolved",
        disposition: "accepted_fixed",
        summary: "additional reviewer finding corrected and verified",
        resolution_revision: manifest.reviewed_revision,
      });
    },
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("canonical diff digest ignores local Git diff configuration", () => {
  const { root } = createFixture();
  git(root, ["config", "color.ui", "always"]);
  git(root, ["config", "diff.algorithm", "histogram"]);
  git(root, ["config", "diff.indentHeuristic", "true"]);
  git(root, ["config", "diff.mnemonicPrefix", "true"]);
  git(root, ["config", "diff.noprefix", "true"]);
  git(root, ["config", "diff.renames", "copies"]);
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("manifest rejects open finding", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.findings[2].status = "open";
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /findings\[2\]\.status: must be resolved/u);
});

test("manifest rejects false recorded reviewer independence claim", () => {
  const { root } = createFixture();
  editManifest(root, (manifest) => {
    manifest.reviewer.identity = "correction-author@lnsat.invalid";
    manifest.reviewer.independent_from_author = false;
  });
  const result = validateSecurityReviewEvidence({ root });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /reviewer\.independent_from_author: recorded claim must be true/u,
  );
});

test("CLI prints PASS and exits zero", () => {
  const { root } = createFixture();
  installFixtureTomlParser(root);
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/check-security-review-evidence.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Security review evidence check: PASS/u);
});

test("CLI prints FAIL and exits nonzero", () => {
  const { root } = createFixture();
  installFixtureTomlParser(root);
  rmSync(resolve(root, MANIFEST_PATH));
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/check-security-review-evidence.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Security review evidence check: FAIL/u);
});
