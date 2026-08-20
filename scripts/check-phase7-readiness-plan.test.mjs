import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validatePhase7ReadinessPlan } from "./check-phase7-readiness-plan.mjs";
import {
  PUBLIC_SOURCE_ROOT_SUBJECT,
  PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
} from "./public-source-snapshot-provenance.mjs";

const THIS_TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(THIS_TEST_DIR, "..");
const CANONICAL_SENTENCE =
  "Canonical readiness states: Phase 7a signed-evidence design = complete; Phase 7b wrapper verification = implemented_verification_only; Phase 7c Ed25519 primitive = implemented_not_wired; Phase 7d schema candidate = proposed_test_only; P7-ADR0 local-v1 trust-model revision = complete; P7-M1 core persistence = complete; P7-N1 nonce/expiry lifecycle = complete; P7-B1 preauthorization hardening = complete; P7-C1 atomic consumption = complete (implemented_not_wired); P7-A1 local authorization = complete (source-only, implemented_not_wired); P7-R1 Git reference adapter = complete (source-only, implemented_not_wired); P7-X1 local-v1 conformance freeze = complete (source-only evidence, no runtime/publication authority); runtime is schema 17/17 with migrations 0016 and 0017 registered; optional signed-evidence packets remain blocked.";
const SIGNED_APPROVAL_FIXTURE_PATH =
  "fixtures/contracts/signed-approval-evidence-v1_0.jsonl";
const SIGNED_APPROVAL_FIXTURE_CASE_ID = "valid_structure_crypto_unavailable";
const PHASE7_SOURCE_TARGETS = [
  "docs/ROADMAP.md",
  "docs/PROJECT_STATUS.md",
  "docs/architecture/PHASE_7_READINESS_EXECUTION_PLAN.md",
  "docs/architecture/ADR-0006_PHASE_7_LOCAL_V1_TRUST_AND_OPTIONAL_SIGNED_EVIDENCE.md",
  "docs/reference/phase7-readiness.json",
  "packages/policy/src/signer-provider.ts",
  "packages/policy/src/signed-approval-evidence-v1.ts",
  "fixtures/contracts/signed-approval-evidence-v1_0.jsonl",
  "crates/lnsat-store/src/lib.rs",
  "crates/lnsat-store/src/phase7_persistence.rs",
  "crates/lnsat-store/src/phase7_nonce.rs",
  "crates/lnsat-store/src/phase7_consumption.rs",
  "crates/lnsat-store/src/tests/phase7_atomic_consumption.rs",
  "crates/lnsat-store/src/tests/phase7_local_authorization.rs",
  "crates/lnsat-store/src/tests/phase7d_signed_candidate.rs",
  "crates/lnsatd/src/lib.rs",
];

const TEMP_ROOTS = [];
const CLEANUP = true;
const GIT_IDENTITY_ENV = Object.freeze({
  GIT_AUTHOR_EMAIL: "phase7-test@lnsat.invalid",
  GIT_AUTHOR_NAME: "Phase 7 Test",
  GIT_COMMITTER_EMAIL: "phase7-test@lnsat.invalid",
  GIT_COMMITTER_NAME: "Phase 7 Test",
});

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "phase7-readiness-plan-"));
  TEMP_ROOTS.push(root);
  return root;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function git(root, args, options = {}) {
  const { env, ...execOptions } = options;
  return execFileSync("git", args, {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
    ...execOptions,
    env: { ...process.env, ...GIT_IDENTITY_ENV, ...env },
  });
}

function gitText(root, args, options = {}) {
  return git(root, args, { encoding: "utf8", ...options }).trim();
}

function rawBlobDigest(root, commit, path) {
  return createHash("sha256")
    .update(git(root, ["cat-file", "blob", `${commit}:${path}`]))
    .digest("hex");
}

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function writeJsonl(path, values) {
  writeFileSync(
    path,
    `${values.map((value) => JSON.stringify(value)).join("\n")}\n`,
    "utf8",
  );
}

function copyFixturePath(relative, destinationRoot, sourceRoot = REPO_ROOT) {
  const from = resolve(sourceRoot, relative);
  const to = resolve(destinationRoot, relative);
  mkdirSync(resolve(destinationRoot, dirname(relative)), { recursive: true });
  cpSync(from, to);
}

function writeBaselineLedger(root) {
  const sourceLedger = readJson(resolve(root, "docs/reference/phase7-readiness.json"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "phase7-test@lnsat.invalid"]);
  git(root, ["config", "user.name", "Phase 7 Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "fixture base"]);

  const packetProvenance = [];
  for (const packetId of [
    "P7-RP0",
    "P7-ADR0",
    "P7-M1",
    "P7-N1",
    "P7-B1",
    "P7-C1",
    "P7-A1",
    "P7-R1",
    "P7-X1",
  ]) {
    const changedPaths = [
      `test-provenance/${packetId}.json`,
      `test-provenance/${packetId}.txt`,
    ];
    mkdirSync(resolve(root, "test-provenance"), { recursive: true });
    writeFileSync(
      resolve(root, changedPaths[0]),
      `${JSON.stringify({ packet_id: packetId })}\n`,
      "utf8",
    );
    writeFileSync(resolve(root, changedPaths[1]), `${packetId}\n`, "utf8");
    git(root, ["add", ...changedPaths]);
    git(root, ["commit", "-q", "-m", `complete ${packetId}`]);
    const completionCommit = gitText(root, ["rev-parse", "HEAD"]);
    packetProvenance.push({
      packet_id: packetId,
      completion_revision: completionCommit,
      protected_files: changedPaths.map((path) => ({
        path,
        sha256: `sha256:${rawBlobDigest(root, completionCommit, path)}`,
      })),
    });
  }

  const ledger = {
    schema_version: "lnsat.phase7_readiness.v3",
    packet_provenance: packetProvenance,
  };
  for (const [key, value] of Object.entries(sourceLedger)) {
    if (
      key !== "schema_version" &&
      key !== "source_revision" &&
      key !== "packet_provenance"
    ) {
      ledger[key] = value;
    }
  }
  writeJson(resolve(root, "docs/reference/phase7-readiness.json"), ledger);
}

let fixtureTemplateRoot;

function createFixtureTemplate() {
  const root = tempRoot();
  for (const target of PHASE7_SOURCE_TARGETS) {
    copyFixturePath(target, root);
  }
  mkdirSync(resolve(root, "crates/lnsat-store/migrations"), { recursive: true });
  cpSync(
    resolve(REPO_ROOT, "crates/lnsat-store/migrations"),
    resolve(root, "crates/lnsat-store/migrations"),
    {
      recursive: true,
    },
  );
  mkdirSync(resolve(root, "crates/lnsat-store/tests/fixtures"), { recursive: true });
  cpSync(
    resolve(
      REPO_ROOT,
      "crates/lnsat-store/tests/fixtures/phase7d_public_material_schema_candidate.sql",
    ),
    resolve(
      root,
      "crates/lnsat-store/tests/fixtures/phase7d_public_material_schema_candidate.sql",
    ),
  );
  writeBaselineLedger(root);
  git(root, ["add", "docs/reference/phase7-readiness.json"]);
  git(root, ["commit", "-q", "-m", "record fixture provenance"]);
  return root;
}

function createPublicSnapshotFixture() {
  const root = tempRoot();
  for (const target of PHASE7_SOURCE_TARGETS) {
    copyFixturePath(target, root);
  }
  mkdirSync(resolve(root, "crates/lnsat-store/migrations"), { recursive: true });
  cpSync(
    resolve(REPO_ROOT, "crates/lnsat-store/migrations"),
    resolve(root, "crates/lnsat-store/migrations"),
    { recursive: true },
  );
  mkdirSync(resolve(root, "crates/lnsat-store/tests/fixtures"), { recursive: true });
  copyFixturePath(
    "crates/lnsat-store/tests/fixtures/phase7d_public_material_schema_candidate.sql",
    root,
  );
  copyFixturePath("package.json", root);
  for (const target of PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS) {
    copyFixturePath(target, root);
  }
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "public-snapshot@lnsat.invalid"]);
  git(root, ["config", "user.name", "Public Snapshot Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", PUBLIC_SOURCE_ROOT_SUBJECT]);
  return root;
}

function withFixture(mutator) {
  fixtureTemplateRoot ??= createFixtureTemplate();
  const root = tempRoot();
  git(root, ["clone", "-q", "--no-local", fixtureTemplateRoot, root]);
  if (mutator) {
    mutator(root);
  }
  return root;
}

function editLedger(root, mutator) {
  const ledgerPath = resolve(root, "docs/reference/phase7-readiness.json");
  const ledger = readJson(ledgerPath);
  mutator(ledger);
  writeJson(ledgerPath, ledger);
}

function editFile(root, relative, replacements) {
  const path = resolve(root, relative);
  let text = readFileSync(path, "utf8");
  for (const [search, replace] of replacements) {
    text = text.replace(search, replace);
  }
  writeFileSync(path, text, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mutatePlanSection(root, packetId, mutateSection) {
  const path = resolve(root, "docs/architecture/PHASE_7_READINESS_EXECUTION_PLAN.md");
  const planText = readFileSync(path, "utf8");
  const headingMatches = [...planText.matchAll(/^###\s*\d+\)\s*(P7-[A-Z0-9-]+)/gm)];
  const index = headingMatches.findIndex((match) => match[1] === packetId);
  if (index === -1) {
    throw new Error(`packet ${packetId} not found in plan`);
  }
  const sectionStart = headingMatches[index].index;
  const sectionEnd =
    index + 1 < headingMatches.length
      ? headingMatches[index + 1].index
      : planText.length;
  const before = planText.slice(0, sectionStart);
  const sectionText = planText.slice(sectionStart, sectionEnd);
  const after = planText.slice(sectionEnd);
  const updatedSection = mutateSection(sectionText);
  writeFileSync(path, `${before}${updatedSection}${after}`, "utf8");
}

function appendAfterPacketSection(root, packetId, appendedText) {
  mutatePlanSection(root, packetId, (section) => `${section}\n${appendedText}`);
}

function replacePlanLabelInPacket(root, packetId, label, replacementLine) {
  mutatePlanSection(root, packetId, (section) =>
    section.replace(
      new RegExp("^(\\s*-\\s*`?" + escapeRegExp(label) + "`?\\s*:\\s*)[^\\n]*$", "mu"),
      `$1${replacementLine}`,
    ),
  );
}

function removePlanLabelInPacket(root, packetId, label) {
  mutatePlanSection(root, packetId, (section) =>
    section.replace(
      new RegExp("^\\s*-\\s*`?" + escapeRegExp(label) + "`?\\s*:\\s*[^\\n]*\\n", "mu"),
      "",
    ),
  );
}

function mutateSignedApprovalFixtureCase(root, caseId, mutateCase) {
  const path = resolve(root, SIGNED_APPROVAL_FIXTURE_PATH);
  const records = readJsonl(path);
  let mutated = false;
  const updated = records.map((entry) => {
    if (entry?.case_id === caseId) {
      mutated = true;
      return mutateCase(entry);
    }
    return entry;
  });
  if (!mutated) {
    throw new Error(`case ${caseId} not found in signed-approval fixture`);
  }
  writeJsonl(path, updated);
}

test.after(() => {
  if (!CLEANUP) {
    return;
  }
  while (TEMP_ROOTS.length > 0) {
    const root = TEMP_ROOTS.pop();
    rmSync(root, { force: true, recursive: true });
  }
});

test("phase7 readiness plan baseline passes", () => {
  const root = withFixture();
  const result = validatePhase7ReadinessPlan({ repoRoot: root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.errors.length, 0);
});

test("phase7 readiness accepts immutable public snapshot with private OIDs absent", () => {
  const root = createPublicSnapshotFixture();
  const result = validatePhase7ReadinessPlan({ repoRoot: root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.mode, "public_source_snapshot");
  assert.ok(result.skippedChecks.includes("private_completion_commit_existence"));
});

test("phase7 readiness still rejects malformed provenance shape in snapshot mode", () => {
  const root = createPublicSnapshotFixture();
  editLedger(root, (ledger) => {
    ledger.packet_provenance[0].completion_revision = "not-a-git-oid";
  });
  const result = validatePhase7ReadinessPlan({ repoRoot: root });
  assert.equal(result.ok, false);
  assert.equal(result.mode, "public_source_snapshot");
  assert.match(
    result.errors.join("\n"),
    /completion_revision: must be 40 lowercase hex characters/u,
  );
});

test("phase7 readiness plan rejects separate source and git roots", () => {
  const gitRoot = withFixture();
  const repoRoot = tempRoot();
  cpSync(gitRoot, repoRoot, {
    recursive: true,
    filter: (source) => !source.split("/").includes(".git"),
  });
  const result = validatePhase7ReadinessPlan({ repoRoot, gitRoot });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source root must equal Git top-level/u);
});

test("phase7 readiness Git calls ignore repository-selection environment", () => {
  const root = withFixture();
  const decoy = tempRoot();
  git(decoy, ["init", "-q"]);
  const previousGitDirectory = process.env.GIT_DIR;
  process.env.GIT_DIR = resolve(decoy, ".git");
  try {
    const result = validatePhase7ReadinessPlan({ repoRoot: root });
    assert.equal(result.ok, true, result.errors.join("\n"));
  } finally {
    if (previousGitDirectory === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDirectory;
  }
});

test("phase7 readiness rejects replacement refs", () => {
  const root = withFixture();
  const rootRevision = gitText(root, ["rev-list", "--max-parents=0", "HEAD"]);
  git(root, ["update-ref", `refs/replace/${rootRevision}`, rootRevision]);
  const result = validatePhase7ReadinessPlan({ repoRoot: root });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /replacement refs are forbidden/u);
});

test("phase7 readiness rejects graft and alternate state", () => {
  for (const [gitPath, pattern] of [
    ["info/grafts", /grafts file is forbidden/u],
    ["objects/info/alternates", /object alternates file is forbidden/u],
  ]) {
    const root = withFixture();
    const path = resolve(root, gitText(root, ["rev-parse", "--git-path", gitPath]));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "", "utf8");
    const result = validatePhase7ReadinessPlan({ repoRoot: root });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), pattern);
  }
});

test("phase7 readiness plan rejects shallow checkout", () => {
  const sourceRoot = withFixture();
  const cloneParent = tempRoot();
  const shallowRoot = resolve(cloneParent, "shallow");
  git(cloneParent, ["clone", "-q", "--no-local", "--depth=1", sourceRoot, shallowRoot]);

  const result = validatePhase7ReadinessPlan({ repoRoot: shallowRoot });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors
      .join("\n")
      .includes("ledger.packet_provenance: git checkout must be non-shallow"),
  );
});

test("CI fetches full history for packet provenance", () => {
  const ciText = readFileSync(resolve(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
  assert.match(
    ciText,
    /uses:\s*actions\/checkout@[^\n]+\n\s+with:\n\s+fetch-depth:\s*0\b/u,
  );
});

test("plan parser ignores labels in a later ## section", () => {
  const root = withFixture((fixtureRoot) => {
    appendAfterPacketSection(
      fixtureRoot,
      "P7-C1",
      `## Notes for next steps
- objective: "not part of any packet"
- prerequisites: "[P7-R1]"
- allowed scope: "ops"
- forbidden scope: "none"
- required inputs: "none"
- contracts affected: "none"
- DB effect: "no-op"
- authority transition: "none"
- positive tests: "none"
- negative tests: "none"
- rollback/failure evidence: "none"
- validation commands: "none"
- explicit approval: "none"
- completion artifact: "none"
- next packet: "none"
- status: "blocked_pending_explicit_input"
- executable: "false"
- approval_gate_ids: "[]"
`,
    );
  });

  const result = validatePhase7ReadinessPlan({ repoRoot: root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.errors.length, 0);
});

test("plan parser fails when a later ## section is no longer recognized as boundary", () => {
  const root = withFixture((fixtureRoot) => {
    appendAfterPacketSection(
      fixtureRoot,
      "P7-C1",
      `# No boundary heading because single hash
 - objective: "bleed into prior packet"
`,
    );
  });

  const result = validatePhase7ReadinessPlan({ repoRoot: root });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.join("\n").includes("plan packet P7-C1"),
    "expected bleed from missing boundary to fail",
  );
});

const NEGATIVES = [
  {
    name: "fails when runtime sqlite schema version is not 17",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.runtime_truth.sqlite_schema_version = 16;
      });
    },
    expect: "ledger.runtime_truth.sqlite_schema_version",
  },
  {
    name: "fails when source sqlite schema version is not 17",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/lib.rs", [
        [
          /pub const SQLITE_SCHEMA_VERSION: i64 = 17;/g,
          "pub const SQLITE_SCHEMA_VERSION: i64 = 16;",
        ],
      ]);
    },
    expect: "lib.rs: SQLITE_SCHEMA_VERSION must be 17",
  },
  {
    name: "fails when migration list is not 17",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/lib.rs", [
        [/const MIGRATIONS:\s*\[Migration; 17\]/g, "const MIGRATIONS: [Migration; 16]"],
      ]);
    },
    expect: "lib.rs: MIGRATIONS must be [Migration; 17]",
  },
  {
    name: "fails when nonce width is not 32 bytes",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_nonce.rs", [
        [
          "pub const PHASE7_NONCE_BYTES_V1: usize = 32;",
          "pub const PHASE7_NONCE_BYTES_V1: usize = 16;",
        ],
      ]);
    },
    expect: "phase7_nonce.rs: missing pub const PHASE7_NONCE_BYTES_V1: usize = 32;",
  },
  {
    name: "fails when nonce TTL is not five minutes",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_nonce.rs", [
        [
          "pub const PHASE7_NONCE_TTL_SECONDS_V1: u64 = 300;",
          "pub const PHASE7_NONCE_TTL_SECONDS_V1: u64 = 600;",
        ],
      ]);
    },
    expect:
      "phase7_nonce.rs: missing pub const PHASE7_NONCE_TTL_SECONDS_V1: u64 = 300;",
  },
  {
    name: "fails when capability width is not 32 bytes",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        [
          "pub const PHASE7_CAPABILITY_BYTES_V1: usize = 32;",
          "pub const PHASE7_CAPABILITY_BYTES_V1: usize = 16;",
        ],
      ]);
    },
    expect:
      "phase7_consumption.rs: missing pub const PHASE7_CAPABILITY_BYTES_V1: usize = 32;",
  },
  {
    name: "fails when capability digest domain drifts",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        ["lnsat.phase7.capability.v1", "lnsat.phase7.capability.v2"],
      ]);
    },
    expect: 'phase7_consumption.rs: missing "lnsat.phase7.capability.v1"',
  },
  {
    name: "fails when capability comparison loses constant time primitive",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        ["candidate.ct_eq(&dummy)", "candidate == &dummy"],
      ]);
    },
    expect: "phase7_consumption.rs: missing candidate.ct_eq(&dummy)",
  },
  {
    name: "fails when capability secret becomes cloneable",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        [
          "pub struct Phase7CapabilitySecretV1 {",
          "#[derive(Clone)]\npub struct Phase7CapabilitySecretV1 {",
        ],
      ]);
    },
    expect: "capability secret must stay non-cloneable",
  },
  {
    name: "fails when A1 authorization TTL is not one minute",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        [
          "pub const PHASE7_AUTHORIZATION_TTL_SECONDS_V1: u64 = 60;",
          "pub const PHASE7_AUTHORIZATION_TTL_SECONDS_V1: u64 = 300;",
        ],
      ]);
    },
    expect:
      "phase7_consumption.rs: missing pub const PHASE7_AUTHORIZATION_TTL_SECONDS_V1: u64 = 60;",
  },
  {
    name: "fails when A1 capability wire type becomes cloneable",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        [
          "pub struct Phase7ExecutionCapabilityWireV1 {",
          "#[derive(Clone)]\npub struct Phase7ExecutionCapabilityWireV1 {",
        ],
      ]);
    },
    expect: "Phase7ExecutionCapabilityWireV1 must stay non-cloneable",
  },
  {
    name: "fails when A1 authorization entropy source is removed",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        ["getrandom::getrandom(bytes)", "fill_insecure_test_bytes(bytes)"],
      ]);
    },
    expect: "A1 must use exactly one OS CSPRNG call",
  },
  {
    name: "fails when injected A1 issuance sources compile outside tests",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_consumption.rs", [
        [
          /#\[cfg\(test\)\]\s+#\[allow\([^\]]+\)\]\s+pub\(super\) fn issue_phase7_local_execution_authorization_with_sources_v1/u,
          "pub(super) fn issue_phase7_local_execution_authorization_with_sources_v1",
        ],
      ]);
    },
    expect:
      "issue_phase7_local_execution_authorization_with_sources_v1 must stay test-only",
  },
  {
    name: "fails when A1 route-neutral Gateway issue source is removed",
    mutate(root) {
      editFile(root, "crates/lnsatd/src/lib.rs", [
        [
          "pub fn issue_local_browser_phase7_execution_authorization_v1",
          "pub fn removed_local_browser_phase7_execution_authorization_v1",
        ],
      ]);
    },
    expect:
      "lnsatd/src/lib.rs: missing P7-A1 route-neutral marker pub fn issue_local_browser_phase7_execution_authorization_v1",
  },
  {
    name: "fails when A1 public route opens",
    mutate(root) {
      editFile(root, "crates/lnsatd/src/lib.rs", [
        [
          "//! Fail-closed loopback daemon foundation for one local LNSAT deployment.",
          '//! Fail-closed loopback daemon foundation for one local LNSAT deployment.\nconst LEAKED_ROUTE: &str = "/v1/phase7/authorize";',
        ],
      ]);
    },
    expect: "lnsatd/src/lib.rs: public P7-A1 route must remain closed",
  },
  {
    name: "fails when nonce entropy source is removed",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_nonce.rs", [
        ["getrandom::getrandom(bytes)", "fill_insecure_test_bytes(bytes)"],
      ]);
    },
    expect: "phase7_nonce.rs: missing getrandom::getrandom(bytes)",
  },
  {
    name: "fails when injected nonce sources compile outside tests",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_nonce.rs", [
        [
          /#\[cfg\(test\)\]\s+pub\(super\) fn issue_phase7_authorization_nonce_with_sources_v1/u,
          "pub(super) fn issue_phase7_authorization_nonce_with_sources_v1",
        ],
      ]);
    },
    expect: "issue_phase7_authorization_nonce_with_sources_v1 must stay test-only",
  },
  {
    name: "fails when injected authorization-attempt sources compile outside tests",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/phase7_persistence.rs", [
        [
          /#\[cfg\(test\)\]\s+pub\(super\) fn prepare_phase7_authorization_attempt_with_sources_v1/u,
          "pub(super) fn prepare_phase7_authorization_attempt_with_sources_v1",
        ],
      ]);
    },
    expect: "prepare_phase7_authorization_attempt_with_sources_v1 must stay test-only",
  },
  {
    name: "fails when registered migration count is not 17",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.runtime_truth.registered_migration_count = 16;
      });
    },
    expect: "ledger.runtime_truth.registered_migration_count",
  },
  {
    name: "fails when migration 0016 is not implemented and registered",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.runtime_truth.migration_0016 = "closed";
      });
    },
    expect: "ledger.runtime_truth.migration_0016",
  },
  {
    name: "fails when migration 0017 is not implemented and registered",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.runtime_truth.migration_0017 = "closed";
      });
    },
    expect: "ledger.runtime_truth.migration_0017",
  },
  {
    name: "fails when schema version drifts",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.schema_version = "lnsat.phase7_readiness.v2";
      });
    },
    expect: "ledger.schema_version: must be lnsat.phase7_readiness.v3",
  },
  {
    name: "fails when packet completion commit is invalid",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].completion_revision = "NOTHEX";
      });
    },
    expect: "completion_revision: must be 40 lowercase hex characters",
  },
  {
    name: "fails when packet completion commit does not exist",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].completion_revision =
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      });
    },
    expect: "completion commit does not exist",
  },
  {
    name: "fails when packet changed-file path is unsafe",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].protected_files[0].path = "../escape";
      });
    },
    expect: "must be a normalized safe repository-relative path",
  },
  {
    name: "fails when packet changed-file paths are unsorted",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].protected_files.reverse();
      });
    },
    expect: "protected_files: paths must be strictly sorted",
  },
  {
    name: "fails when packet changed-file set is incomplete",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].protected_files.pop();
      });
    },
    expect: "protected_files must exactly match first-parent A/M paths",
  },
  {
    name: "fails when packet raw blob digest drifts",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].protected_files[0].sha256 = `sha256:${"a".repeat(64)}`;
      });
    },
    expect: "raw blob SHA-256 mismatch",
  },
  {
    name: "fails when packet provenance order drifts",
    mutate(root) {
      editLedger(root, (ledger) => {
        [ledger.packet_provenance[0], ledger.packet_provenance[1]] = [
          ledger.packet_provenance[1],
          ledger.packet_provenance[0],
        ];
      });
    },
    expect: "packet order must exactly match completed ledger packets",
  },
  {
    name: "fails when completed packet provenance is missing",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance.pop();
      });
    },
    expect: "packet order must exactly match completed ledger packets",
  },
  {
    name: "fails when blocked packet has provenance",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance.push({
          ...ledger.packet_provenance.at(-1),
          packet_id: "P7-A1",
        });
      });
    },
    expect: "packet order must exactly match completed ledger packets",
  },
  {
    name: "fails when completion revision is reused",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[1].completion_revision =
          ledger.packet_provenance[0].completion_revision;
      });
    },
    expect: "duplicate completion_revision",
  },
  {
    name: "fails when protected path is duplicated",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].protected_files.splice(
          1,
          0,
          ledger.packet_provenance[0].protected_files[0],
        );
      });
    },
    expect: "protected_files: duplicate path",
  },
  {
    name: "fails when protected path is extra",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.packet_provenance[0].protected_files.push({
          path: "test-provenance/extra.txt",
          sha256: `sha256:${"a".repeat(64)}`,
        });
      });
    },
    expect: "protected_files must exactly match first-parent A/M paths",
  },
  {
    name: "fails when prerequisite completion is not an ancestor",
    mutate(root) {
      editLedger(root, (ledger) => {
        [
          ledger.packet_provenance[0].completion_revision,
          ledger.packet_provenance[1].completion_revision,
        ] = [
          ledger.packet_provenance[1].completion_revision,
          ledger.packet_provenance[0].completion_revision,
        ];
      });
    },
    expect: "prerequisite P7-RP0 completion must be an ancestor",
  },
  {
    name: "fails when completion commit is a merge",
    mutate(root) {
      const tree = gitText(root, ["rev-parse", "HEAD^{tree}"]);
      const head = gitText(root, ["rev-parse", "HEAD"]);
      const secondParent = gitText(root, ["rev-parse", "HEAD~1"]);
      const mergeCommit = gitText(root, [
        "commit-tree",
        tree,
        "-p",
        head,
        "-p",
        secondParent,
        "-m",
        "synthetic merge",
      ]);
      editLedger(root, (ledger) => {
        ledger.packet_provenance.at(-1).completion_revision = mergeCommit;
      });
    },
    expect: "completion commit must have exactly one parent",
  },
  {
    name: "fails when completion commit is not an ancestor of HEAD",
    mutate(root) {
      const tree = gitText(root, ["rev-parse", "HEAD^{tree}"]);
      const head = gitText(root, ["rev-parse", "HEAD"]);
      const futureCommit = gitText(root, [
        "commit-tree",
        tree,
        "-p",
        head,
        "-m",
        "unreferenced future commit",
      ]);
      editLedger(root, (ledger) => {
        ledger.packet_provenance.at(-1).completion_revision = futureCommit;
      });
    },
    expect: "completion commit must be an ancestor of HEAD",
  },
  {
    name: "fails when completion commit contains a non-A/M change",
    mutate(root) {
      const parent = gitText(root, ["rev-parse", "HEAD"]);
      const indexPath = resolve(root, ".git", "phase7-delete-index");
      const env = { ...process.env, GIT_INDEX_FILE: indexPath };
      git(root, ["read-tree", parent], { env });
      git(root, ["update-index", "--force-remove", "--", "test-provenance/P7-N1.txt"], {
        env,
      });
      const tree = gitText(root, ["write-tree"], { env });
      const deletionCommit = gitText(root, [
        "commit-tree",
        tree,
        "-p",
        parent,
        "-m",
        "synthetic deletion",
      ]);
      git(root, ["update-ref", "HEAD", deletionCommit]);
      editLedger(root, (ledger) => {
        const provenance = ledger.packet_provenance.at(-1);
        provenance.completion_revision = deletionCommit;
        provenance.protected_files = [];
      });
    },
    expect: "completion commit changes must be only A/M",
  },
  {
    name: "fails when P1 public trust status is no longer unset",
    mutate(root) {
      editFile(root, "packages/policy/src/signer-provider.ts", [
        [
          /export const P1_PUBLIC_TRUST_STATUS = "unset"/g,
          `export const P1_PUBLIC_TRUST_STATUS = "complete"`,
        ],
      ]);
    },
    expect: "P1_PUBLIC_TRUST_STATUS",
  },
  {
    name: "fails when phase_7d schema status changes",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.phase_status.phase_7d_schema_candidate = "complete";
      });
    },
    expect: "ledger.phase_status.phase_7d_schema_candidate",
  },
  {
    name: "fails when operational verification becomes available",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.runtime_truth.operational_wrapper_verification = "complete";
      });
    },
    expect: "ledger.runtime_truth.operational_wrapper_verification",
  },
  {
    name: "fails when signer runtime_signing is enabled",
    mutate(root) {
      editFile(root, "packages/policy/src/signer-provider.ts", [
        [/runtime_signing:\s*false/g, "runtime_signing: true"],
      ]);
    },
    expect: "runtime_signing must remain false",
  },
  {
    name: "fails when signer provider_calls_enabled is enabled",
    mutate(root) {
      editFile(root, "packages/policy/src/signer-provider.ts", [
        [/provider_calls_enabled:\s*false/g, "provider_calls_enabled: true"],
      ]);
    },
    expect: "provider_calls_enabled must remain false",
  },
  {
    name: "fails when execution authorization transition is hidden",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.authority_transitions.execution_authorized = false;
      });
    },
    expect: "authority_transitions.execution_authorized",
  },
  {
    name: "fails when authorization record transition is hidden",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.authority_transitions.server_side_authorization_record = false;
      });
    },
    expect: "authority_transitions.server_side_authorization_record",
  },
  {
    name: "fails when capability issuance transition is hidden",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.authority_transitions.one_time_capability_issued = false;
      });
    },
    expect: "authority_transitions.one_time_capability_issued",
  },
  {
    name: "fails when bound authorization transition is hidden",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.authority_transitions.bound_authorization_record = false;
      });
    },
    expect: "authority_transitions.bound_authorization_record",
  },
  {
    name: "fails when atomic consumption transition is hidden",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.authority_transitions.atomic_single_use_consumption = false;
      });
    },
    expect: "authority_transitions.atomic_single_use_consumption",
  },
  {
    name: "fails when active nonce transition is hidden",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.authority_transitions.active_unexpired_nonce = false;
      });
    },
    expect: "authority_transitions.active_unexpired_nonce",
  },
  {
    name: "fails when a required revised packet gate is missing",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.approval_gates = ledger.approval_gates.slice(0, -1);
      });
    },
    expect: "approval_gates",
  },
  {
    name: "fails when revised gate title drifts",
    mutate(root) {
      editLedger(root, (ledger) => {
        if (Array.isArray(ledger.approval_gates) && ledger.approval_gates.length > 0) {
          ledger.approval_gates[0].title = "drifted gate title";
        }
      });
    },
    expect: "unexpected title for P7_M1_CORE_PERSISTENCE",
  },
  {
    name: "fails when blocked prerequisite packet is executable",
    mutate(root) {
      editLedger(root, (ledger) => {
        const packet = ledger.packets.find((item) => item.packet_id === "P7-V1");
        if (packet) {
          packet.executable = true;
        }
      });
    },
    expect: "blocked by incomplete prerequisite",
  },
  {
    name: "fails when plan and roadmap mismatch",
    mutate(root) {
      editFile(root, "docs/ROADMAP.md", [
        [
          CANONICAL_SENTENCE,
          CANONICAL_SENTENCE.replace("proposed_test_only", "complete"),
        ],
      ]);
    },
    expect: "docs/ROADMAP.md: canonical readiness sentence missing",
  },
  {
    name: "fails when plan/ledger phase mismatch",
    mutate(root) {
      editFile(root, "docs/architecture/PHASE_7_READINESS_EXECUTION_PLAN.md", [
        [/(\| Phase 7d schema candidate\s*\|\s*`?)proposed_test_only/i, "$1complete"],
      ]);
    },
    expect: "plan: phase_7d_schema_candidate",
  },
  {
    name: "fails when a future plan packet is executable",
    mutate(root) {
      replacePlanLabelInPacket(root, "P7-V1", "executable", "`true`");
    },
    expect: "plan packet P7-V1: executable must be false",
  },
  {
    name: "fails when a future plan packet prerequisite drifts",
    mutate(root) {
      replacePlanLabelInPacket(root, "P7-V1", "prerequisites", "`[P7-M1]`");
    },
    expect: "plan packet P7-V1: prerequisites mismatch",
  },
  {
    name: "fails when a required plan section label is missing",
    mutate(root) {
      removePlanLabelInPacket(root, "P7-V1", "objective");
    },
    expect: "plan packet P7-V1: missing required label objective",
  },
  {
    name: "fails when unknown ledger field appears",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.future_unknown_field = "unexpected";
      });
    },
    expect: "ledger: unexpected key",
  },
  {
    name: "fails when packet enum is unknown",
    mutate(root) {
      editLedger(root, (ledger) => {
        const packet = ledger.packets.find((item) => item.packet_id === "P7-M1");
        if (packet) {
          packet.status = "mystery_state";
        }
      });
    },
    expect: "not in expected enum",
  },
  {
    name: "fails when an extra source migration 0016 exists",
    mutate(root) {
      writeFileSync(
        resolve(
          root,
          "crates/lnsat-store/migrations/0016_phase7d_public_material_schema_candidate.sql",
        ),
        "-- temporary migration\n",
      );
    },
    expect: "must contain only 0016_phase7_core_persistence.sql",
  },
  {
    name: "fails when an extra source migration 0017 exists",
    mutate(root) {
      writeFileSync(
        resolve(
          root,
          "crates/lnsat-store/migrations/0017_phase7d_public_material_schema_candidate.sql",
        ),
        "-- temporary migration\n",
      );
    },
    expect: "must contain only 0017_phase7_core_semantics_correction.sql",
  },
  {
    name: "fails when migration 0017 loses one-approval uniqueness",
    mutate(root) {
      editFile(
        root,
        "crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql",
        [
          [
            "lnsat_execution_authorizations_approval_decision_unique_idx",
            "drifted_authorization_index",
          ],
        ],
      );
    },
    expect: "missing lnsat_execution_authorizations_approval_decision_unique_idx",
  },
  {
    name: "fails when migration 0017 loses authoritative attempt binding",
    mutate(root) {
      editFile(
        root,
        "crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql",
        [
          [
            "attempt.approval_decision_id = NEW.approval_decision_id",
            "attempt.approval_decision_id != NEW.approval_decision_id",
          ],
        ],
      );
    },
    expect: "missing attempt.approval_decision_id = NEW.approval_decision_id",
  },
  {
    name: "fails when migration 0017 can reinterpret legacy phase7 records",
    mutate(root) {
      editFile(
        root,
        "crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql",
        [["existing_phase7_record_count = 0", "existing_phase7_record_count >= 0"]],
      );
    },
    expect: "missing existing_phase7_record_count = 0",
  },
  {
    name: "fails when migration 0017 loses legacy evidence disposition",
    mutate(root) {
      editFile(
        root,
        "crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql",
        [["legacy_phase7_evidence", "migration_pending"]],
      );
    },
    expect: "missing legacy_phase7_evidence",
  },
  {
    name: "fails when migration 0017 allows rejected canonical receipts",
    mutate(root) {
      editFile(
        root,
        "crates/lnsat-store/migrations/0017_phase7_core_semantics_correction.sql",
        [
          [
            "verification_status = 'accepted'",
            "verification_status IN ('accepted', 'rejected')",
          ],
        ],
      );
    },
    expect: "missing verification_status = 'accepted'",
  },
  {
    name: "fails when candidate SQL include is in non-test context",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/tests/phase7d_signed_candidate.rs", [
        [
          "../../tests/fixtures/phase7d_public_material_schema_candidate.sql",
          "../../migrations/phase7d_public_material_schema_candidate.sql",
        ],
      ]);
    },
    expect: "candidate SQL must be in tests fixtures",
  },
  {
    name: "fails when signed candidate reuses registered schema 17",
    mutate(root) {
      editFile(
        root,
        "crates/lnsat-store/tests/fixtures/phase7d_public_material_schema_candidate.sql",
        [
          ["schema_version = 18", "schema_version = 17"],
          ["lnsat_store_metadata_v18", "lnsat_store_metadata_v17"],
        ],
      );
    },
    expect: "phase7d candidate fixture must remain test-only schema v18",
  },
  {
    name: "fails when phase7 candidate module registration is removed",
    mutate(root) {
      editFile(root, "crates/lnsat-store/src/lib.rs", [
        [
          "    mod phase7d_signed_candidate;",
          "    // phase7d candidate registration removed",
        ],
      ]);
    },
    expect: "phase7d candidate module must stay inside #[cfg(test)]",
  },
  {
    name: "fails when signed approval unavailable fixture becomes available",
    mutate(root) {
      mutateSignedApprovalFixtureCase(
        root,
        SIGNED_APPROVAL_FIXTURE_CASE_ID,
        (entry) => {
          const expectedResult = entry.expected_result ?? {};
          return {
            ...entry,
            expected_result: {
              ...expectedResult,
              ok: true,
              status: "accepted",
            },
          };
        },
      );
    },
    expect: "case valid_structure_crypto_unavailable expected_result.ok must be false",
  },
  {
    name: "fails when future packet becomes complete",
    mutate(root) {
      editLedger(root, (ledger) => {
        const packet = ledger.packets.find((item) => item.packet_id === "P7-K1");
        if (packet) {
          packet.status = "complete";
        }
      });
    },
    expect: "no future packet may be complete",
  },
  {
    name: "fails when portable signed approval becomes local-v1 mandatory",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.trust_model.portable_signed_approval_required_for_local_v1 = true;
      });
    },
    expect:
      "ledger.trust_model.portable_signed_approval_required_for_local_v1: unexpected value",
  },
  {
    name: "fails when private keys may enter LNSAT",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.trust_model.private_keys_enter_lnsat = true;
      });
    },
    expect: "ledger.trust_model.private_keys_enter_lnsat: unexpected value",
  },
  {
    name: "fails when optional signed lane blocks local release",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.release_lanes.optional_signed_evidence.blocks_supported_local_release = true;
      });
    },
    expect:
      "ledger.release_lanes.optional_signed_evidence.blocks_supported_local_release: unexpected value",
  },
  {
    name: "fails when superseded P7-P1 grants authority",
    mutate(root) {
      editLedger(root, (ledger) => {
        ledger.superseded_packets[0].authority_granted = true;
      });
    },
    expect: "ledger.superseded_packets[0].authority_granted: must be false",
  },
  {
    name: "fails when local X1 depends on optional signed verification",
    mutate(root) {
      editLedger(root, (ledger) => {
        const packet = ledger.packets.find((item) => item.packet_id === "P7-X1");
        if (packet) {
          packet.prerequisites.push("P7-V1");
        }
      });
    },
    expect: "ledger.packets:P7-X1.prerequisites: mismatch",
  },
];

for (const { name, mutate, expect } of NEGATIVES) {
  test(name, () => {
    const root = withFixture((fixtureRoot) => {
      mutate(fixtureRoot);
    });
    const result = validatePhase7ReadinessPlan({ repoRoot: root });
    assert.equal(result.ok, false);
    const joined = result.errors.join("\n");
    assert.ok(
      joined.includes(expect),
      `${name}: expected failure contains "${expect}"`,
    );
  });
}
