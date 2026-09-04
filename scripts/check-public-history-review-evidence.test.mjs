import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LEGACY_IDENTIFIER_INVENTORY_PATH,
  MAX_REVIEW_JSON_BYTES,
  parseStrictJsonBytes,
  PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
  validatePublicHistoryReviewEvidence,
} from "./check-public-history-review-evidence.mjs";
import { readCanonicalReviewDiff } from "./check-security-review-evidence.mjs";
import {
  createIsolatedGitEnvironment,
  PUBLIC_SOURCE_ROOT_SUBJECT,
  PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
  PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH,
} from "./public-source-snapshot-provenance.mjs";

const roots = [];
const ENTRY_ID = "PHR-0001";
const MANIFEST_PATH = "docs/reference/public-history-reviews/PHR-0001/review.json";
const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function git(root, args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    env: options.env,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function gitText(root, args) {
  return git(root, args).trim();
}

function write(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function writeJson(path, value) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function snapshotMarker() {
  return {
    schema_version: "lnsat.public_source_snapshot.v1",
    history_strategy: "fresh_root",
    source_base_revision: "a".repeat(40),
    historical_git_evidence: "retained_private_not_locally_replayable",
    claim_scope: "pre_release_source_only",
    immutable_paths: PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
    release_authority: false,
    artifact_authority: false,
    deployment_authority: false,
  };
}

function registry(state = "pending") {
  return {
    schema_version: "lnsat.public_history_review_registry.v1",
    review_scope: "pre_release_source_only",
    execution_authorized: false,
    runtime_authority_opened: false,
    supported_release_evidence: false,
    side_effects: [],
    entries: [
      {
        entry_id: ENTRY_ID,
        subject_id: "public-history-review-bootstrap",
        review_subject_ids: ["public-history-review-bootstrap"],
        manifest_path: MANIFEST_PATH,
        review_type: "independent_implementation_review",
        state,
      },
    ],
  };
}

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), "public-history-review-"));
  roots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "Public History Review Test"]);
  git(root, ["config", "user.email", "public-history-review@lnsat.invalid"]);
  writeJson(resolve(root, "package.json"), { version: "0.1.0", private: true });
  writeJson(resolve(root, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH), snapshotMarker());
  for (const path of PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS) {
    if (path === PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH) continue;
    writeJson(resolve(root, path), { archival: path });
  }
  write(resolve(root, "src/existing.txt"), "base\n");
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "base",
  });
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", PUBLIC_SOURCE_ROOT_SUBJECT]);
  return root;
}

function createReviewedFixture() {
  const root = createRoot();
  const baseRevision = gitText(root, ["rev-parse", "HEAD"]);
  write(resolve(root, "src/existing.txt"), "reviewed\n");
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), registry());
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "reviewed",
  });
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "feat(security): add public review lane"]);
  const reviewedRevision = gitText(root, ["rev-parse", "HEAD"]);
  return { root, baseRevision, reviewedRevision };
}

function createStagedReviewedFixture() {
  const root = createRoot();
  write(resolve(root, "src/existing.txt"), "reviewed\n");
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), registry());
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "reviewed",
  });
  git(root, [
    "add",
    "src/existing.txt",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
  ]);
  return root;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function changedPaths(root, baseRevision, reviewedRevision) {
  return gitText(root, [
    "diff",
    "--name-only",
    "--no-renames",
    baseRevision,
    reviewedRevision,
    "--",
  ])
    .split("\n")
    .filter(Boolean)
    .sort();
}

function buildManifest(
  root,
  baseRevision,
  reviewedRevision,
  entry = registry().entries[0],
) {
  const protectedFiles = changedPaths(root, baseRevision, reviewedRevision).map(
    (path) => ({
      path,
      sha256: sha256(
        git(root, ["cat-file", "blob", `${reviewedRevision}:${path}`], {
          encoding: null,
        }),
      ),
    }),
  );
  return {
    schema_version: "lnsat.security_review.v1",
    review_id: `${entry.entry_id}-independent-implementation-review-${reviewedRevision.slice(0, 8)}`,
    review_type: "independent_implementation_review",
    packet_ids: entry.review_subject_ids,
    base_revision: baseRevision,
    reviewed_revision: reviewedRevision,
    reviewed_tree_oid: gitText(root, ["rev-parse", `${reviewedRevision}^{tree}`]),
    diff_sha256: sha256(readCanonicalReviewDiff(root, baseRevision, reviewedRevision)),
    protected_files: protectedFiles,
    reviewer: {
      identity: "test:independent-reviewer",
      kind: "agent",
      independent_from_author: true,
      tool: "test exact-range read-only review",
    },
    findings: [],
    verdict: "approved",
    execution_authorized: false,
    runtime_authority_opened: false,
    side_effects: [],
  };
}

function stageAttestation(
  fixture,
  {
    entry = registry().entries[0],
    extraPath,
    mutateManifest,
    mutateRegistry,
    nextRegistry = registry("attested"),
  } = {},
) {
  const { root, baseRevision, reviewedRevision } = fixture;
  if (mutateRegistry) mutateRegistry(nextRegistry);
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), nextRegistry);
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "attested",
  });
  const manifest = buildManifest(root, baseRevision, reviewedRevision, entry);
  if (mutateManifest) mutateManifest(manifest);
  writeJson(resolve(root, entry.manifest_path), manifest);
  const paths = [
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
    entry.manifest_path,
  ];
  if (extraPath) {
    write(resolve(root, extraPath), "extra\n");
    paths.push(extraPath);
  }
  git(root, ["add", ...paths]);
  return manifest;
}

function commitAttestation(fixture, options) {
  stageAttestation(fixture, options);
  git(fixture.root, ["commit", "-q", "-m", "chore(security): attest review"]);
  return gitText(fixture.root, ["rev-parse", "HEAD"]);
}

function validate(root) {
  return validatePublicHistoryReviewEvidence({ root, gitRoot: root });
}

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

test("scans duplicate members before final JSON parse", () => {
  const errors = [];
  let parseCalls = 0;
  const value = parseStrictJsonBytes(
    Buffer.from('{"execution_authorized":true,"execution_authorized":false}'),
    "registry",
    errors,
    {
      parseJson(text) {
        parseCalls += 1;
        return JSON.parse(text);
      },
    },
  );
  assert.equal(value, null);
  assert.equal(parseCalls, 0);
  assert.match(errors.join("\n"), /duplicate JSON member/u);
});

test("scans excessive depth before final JSON parse", () => {
  const errors = [];
  let parseCalls = 0;
  const value = parseStrictJsonBytes(
    Buffer.from(`${"[".repeat(66)}0${"]".repeat(66)}`),
    "registry",
    errors,
    {
      parseJson(text) {
        parseCalls += 1;
        return JSON.parse(text);
      },
    },
  );
  assert.equal(value, null);
  assert.equal(parseCalls, 0);
  assert.match(errors.join("\n"), /JSON nesting exceeds 64/u);
});

test("runs final JSON parse after strict scan succeeds", () => {
  const errors = [];
  let parseCalls = 0;
  const value = parseStrictJsonBytes(Buffer.from('{"ok":true}'), "registry", errors, {
    parseJson(text) {
      parseCalls += 1;
      return JSON.parse(text);
    },
  });
  assert.deepEqual(value, { ok: true });
  assert.equal(parseCalls, 1);
  assert.deepEqual(errors, []);
});

test("rejects oversized JSON bytes before final parse", () => {
  const errors = [];
  let parseCalls = 0;
  const value = parseStrictJsonBytes(
    Buffer.alloc(MAX_REVIEW_JSON_BYTES + 1, 0x20),
    "registry",
    errors,
    {
      parseJson(text) {
        parseCalls += 1;
        return JSON.parse(text);
      },
    },
  );
  assert.equal(value, null);
  assert.equal(parseCalls, 0);
  assert.deepEqual(errors, [`registry: exceeds ${MAX_REVIEW_JSON_BYTES} bytes`]);
});

test("accepts exact staged reviewed implementation", () => {
  const root = createStagedReviewedFixture();
  const result = validate(root);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.mode, "staged_review");
  assert.equal(result.pendingEntries, 1);
  assert.equal(result.attestedEntries, 0);
});

test("uses trusted absolute Git when PATH contains a hostile shim", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  const shimRoot = mkdtempSync(join(tmpdir(), "public-history-git-shim-"));
  roots.push(shimRoot);
  const sentinel = resolve(shimRoot, "invoked");
  if (process.platform === "win32") {
    write(
      resolve(shimRoot, "git.cmd"),
      `@echo invoked>"${sentinel}"\r\n@exit /b 99\r\n`,
    );
  } else {
    const shimPath = resolve(shimRoot, "git");
    write(shimPath, `#!/bin/sh\nprintf invoked > "${sentinel}"\nexit 99\n`);
    chmodSync(shimPath, 0o755);
  }
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = shimRoot;
    const result = validate(fixture.root);
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.mode, "staged_attestation");
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  }
  assert.equal(existsSync(sentinel), false);
});

test("ignores hostile Git config and local fsmonitor helper", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  const configRoot = mkdtempSync(join(tmpdir(), "public-history-git-config-"));
  roots.push(configRoot);
  const sentinel = resolve(configRoot, "fsmonitor-invoked");
  const diffSentinel = resolve(configRoot, "external-diff-invoked");
  const helperPath = resolve(configRoot, "fsmonitor.mjs");
  const diffHelperPath = resolve(configRoot, "external-diff.mjs");
  write(
    helperPath,
    `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(
      sentinel,
    )}, "invoked");\nprocess.stdout.write("2\\n");\n`,
  );
  const fsmonitorCommand = `${JSON.stringify(process.execPath)} ${JSON.stringify(
    helperPath,
  )}`;
  write(
    diffHelperPath,
    `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(
      diffSentinel,
    )}, "invoked");\n`,
  );
  const diffCommand = `${JSON.stringify(process.execPath)} ${JSON.stringify(
    diffHelperPath,
  )}`;
  write(
    resolve(configRoot, ".gitconfig"),
    `[core]\n\tfsmonitor = ${fsmonitorCommand}\n[diff]\n\texternal = ${diffCommand}\n`,
  );
  git(fixture.root, ["config", "core.fsmonitor", fsmonitorCommand]);
  git(fixture.root, ["config", "diff.external", diffCommand]);

  const isolated = createIsolatedGitEnvironment();
  const expectedEnvironmentKeys = [
    "GIT_ATTR_NOSYSTEM",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_NOSYSTEM",
    "GIT_CONFIG_SYSTEM",
    "GIT_NO_LAZY_FETCH",
    "GIT_NO_REPLACE_OBJECTS",
    "GIT_OPTIONAL_LOCKS",
    "GIT_PAGER",
    "GIT_TERMINAL_PROMPT",
    "GIT_TRACE2",
    "GIT_TRACE2_EVENT",
    "GIT_TRACE2_PERF",
    "LANG",
    "LC_ALL",
    "PATH",
    "TZ",
    ...(process.platform === "win32"
      ? ["ComSpec", "PATHEXT", "SystemRoot", "TEMP", "TMP", "WINDIR"]
      : ["TMPDIR"]),
  ].sort();
  assert.deepEqual(Object.keys(isolated).sort(), expectedEnvironmentKeys);
  assert.equal(
    isolated.GIT_CONFIG_GLOBAL,
    process.platform === "win32" ? "NUL" : "/dev/null",
  );
  assert.equal(isolated.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(isolated.GIT_ATTR_NOSYSTEM, "1");
  assert.equal(isolated.GIT_NO_LAZY_FETCH, "1");
  assert.equal(isolated.GIT_OPTIONAL_LOCKS, "0");
  assert.equal(isolated.GIT_PAGER, "cat");
  assert.equal(isolated.GIT_TRACE2, "0");
  assert.equal(isolated.GIT_TRACE2_EVENT, "0");
  assert.equal(isolated.GIT_TRACE2_PERF, "0");
  for (const key of [
    "DYLD_INSERT_LIBRARIES",
    "GIT_EXTERNAL_DIFF",
    "HOME",
    "LD_PRELOAD",
    "SSH_AUTH_SOCK",
    "XDG_CONFIG_HOME",
  ]) {
    assert.equal(Object.hasOwn(isolated, key), false, key);
  }

  const environmentKeys = [
    "DYLD_INSERT_LIBRARIES",
    "GIT_EXTERNAL_DIFF",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_NOSYSTEM",
    "GIT_NO_LAZY_FETCH",
    "GIT_OPTIONAL_LOCKS",
    "GIT_PAGER",
    "HOME",
    "LD_PRELOAD",
    "SSH_AUTH_SOCK",
    "XDG_CONFIG_HOME",
  ];
  const originalEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  try {
    process.env.GIT_CONFIG_GLOBAL = resolve(configRoot, ".gitconfig");
    process.env.GIT_CONFIG_NOSYSTEM = "0";
    process.env.GIT_EXTERNAL_DIFF = diffCommand;
    process.env.GIT_NO_LAZY_FETCH = "0";
    process.env.GIT_OPTIONAL_LOCKS = "1";
    process.env.GIT_PAGER = diffCommand;
    process.env.HOME = configRoot;
    process.env.LD_PRELOAD = diffHelperPath;
    process.env.DYLD_INSERT_LIBRARIES = diffHelperPath;
    process.env.SSH_AUTH_SOCK = resolve(configRoot, "hostile-agent.sock");
    process.env.XDG_CONFIG_HOME = configRoot;
    const indexBefore = readFileSync(resolve(fixture.root, ".git/index"));
    const result = validate(fixture.root);
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.mode, "staged_attestation");
    assert.deepEqual(readFileSync(resolve(fixture.root, ".git/index")), indexBefore);
  } finally {
    for (const [key, value] of originalEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  assert.equal(existsSync(sentinel), false);
  assert.equal(existsSync(diffSentinel), false);
});

test("blocks ambient and local Trace2 targets", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  const traceRoot = mkdtempSync(join(tmpdir(), "public-history-trace2-"));
  roots.push(traceRoot);
  const traceTarget = resolve(traceRoot, "trace.json");
  git(fixture.root, ["rev-parse", "HEAD"], {
    env: { ...process.env, GIT_TRACE2_EVENT: traceTarget },
  });
  assert.equal(existsSync(traceTarget), true, "direct Git must emit Trace2 fixture");
  rmSync(traceTarget);
  const localConfigPath = resolve(fixture.root, ".git/config");
  write(
    localConfigPath,
    `${readFileSync(localConfigPath, "utf8")}\n[trace2]\n\tnormalTarget = ${traceTarget}\n\tperfTarget = ${traceTarget}\n\teventTarget = ${traceTarget}\n`,
  );
  const originalTraceEnvironment = new Map(
    ["GIT_TRACE2", "GIT_TRACE2_EVENT", "GIT_TRACE2_PERF"].map((key) => [
      key,
      process.env[key],
    ]),
  );
  try {
    process.env.GIT_TRACE2 = traceTarget;
    process.env.GIT_TRACE2_EVENT = traceTarget;
    process.env.GIT_TRACE2_PERF = traceTarget;
    const result = validate(fixture.root);
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.mode, "staged_attestation");
    assert.equal(existsSync(traceTarget), false);
  } finally {
    for (const [key, value] of originalTraceEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test(
  "blocks ambient and local Trace2 Unix socket targets",
  { skip: process.platform === "win32" },
  async (context) => {
    const fixture = createReviewedFixture();
    stageAttestation(fixture);
    const traceRoot = mkdtempSync(join(tmpdir(), "public-history-trace2-socket-"));
    roots.push(traceRoot);
    const socketPath = resolve(traceRoot, "trace.sock");
    let connections = 0;
    const server = createServer((socket) => {
      connections += 1;
      socket.destroy();
    });
    try {
      await new Promise((resolveListen, rejectListen) => {
        server.once("error", rejectListen);
        server.listen(socketPath, resolveListen);
      });
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("host sandbox forbids Unix socket creation");
        return;
      }
      throw error;
    }
    const traceTarget = `af_unix:stream:${socketPath}`;
    const originalTraceEnvironment = new Map(
      ["GIT_TRACE2", "GIT_TRACE2_EVENT", "GIT_TRACE2_PERF"].map((key) => [
        key,
        process.env[key],
      ]),
    );
    try {
      git(fixture.root, ["rev-parse", "HEAD"], {
        env: { ...process.env, GIT_TRACE2_EVENT: traceTarget },
      });
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
      assert.ok(connections > 0, "direct Git must connect to Trace2 socket fixture");
      const directConnections = connections;
      const localConfigPath = resolve(fixture.root, ".git/config");
      write(
        localConfigPath,
        `${readFileSync(localConfigPath, "utf8")}\n[trace2]\n\tnormalTarget = ${traceTarget}\n\tperfTarget = ${traceTarget}\n\teventTarget = ${traceTarget}\n`,
      );
      process.env.GIT_TRACE2 = traceTarget;
      process.env.GIT_TRACE2_EVENT = traceTarget;
      process.env.GIT_TRACE2_PERF = traceTarget;
      const result = validate(fixture.root);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
      assert.equal(result.ok, true, result.errors.join("\n"));
      assert.equal(result.mode, "staged_attestation");
      assert.equal(connections, directConnections);
    } finally {
      for (const [key, value] of originalTraceEnvironment) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  },
);

test("isolates legacy direct Git consumers from hostile PATH", () => {
  const shimRoot = mkdtempSync(join(tmpdir(), "public-history-legacy-git-shim-"));
  roots.push(shimRoot);
  const sentinel = resolve(shimRoot, "invoked");
  if (process.platform === "win32") {
    write(
      resolve(shimRoot, "git.cmd"),
      `@echo invoked>"${sentinel}"\r\n@"C:\\Program Files\\Git\\cmd\\git.exe" %*\r\n`,
    );
  } else {
    const shimPath = resolve(shimRoot, "git");
    write(
      shimPath,
      `#!/bin/sh\nprintf invoked > "${sentinel}"\nexec /usr/bin/git "$@"\n`,
    );
    chmodSync(shimPath, 0o755);
  }
  const hostileEnvironment = { ...process.env, PATH: shimRoot };
  for (const [script, args] of [
    [
      "scripts/public-source-snapshot-provenance.mjs",
      ["--legacy-inventory", "--check"],
    ],
    ["scripts/check-phase7-readiness-plan.mjs", []],
    ["scripts/check-release-readiness.mjs", []],
  ]) {
    execFileSync(process.execPath, [resolve(REPO_ROOT, script), ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: hostileEnvironment,
      maxBuffer: 16 * 1024 * 1024,
    });
  }
  assert.equal(existsSync(sentinel), false);
});

test("rejects oversized staged registry before parsing", () => {
  const root = createStagedReviewedFixture();
  writeFileSync(
    resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH),
    Buffer.alloc(MAX_REVIEW_JSON_BYTES + 1, 0x20),
  );
  git(root, ["add", PUBLIC_HISTORY_REVIEW_REGISTRY_PATH]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    new RegExp(`registry: exceeds ${MAX_REVIEW_JSON_BYTES} bytes`, "u"),
  );
});

test("rejects oversized staged manifest before parsing", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  writeFileSync(
    resolve(fixture.root, MANIFEST_PATH),
    Buffer.alloc(MAX_REVIEW_JSON_BYTES + 1, 0x20),
  );
  git(fixture.root, ["add", MANIFEST_PATH]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    new RegExp(`manifest:${ENTRY_ID}: exceeds ${MAX_REVIEW_JSON_BYTES} bytes`, "u"),
  );
});

test("rejects immutable public-snapshot evidence drift", () => {
  const root = createStagedReviewedFixture();
  const immutablePath = "docs/reference/phase7-readiness.json";
  writeJson(resolve(root, immutablePath), { archival: "mutated" });
  git(root, ["add", immutablePath]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /current bytes differ from root/u);
});

test("rejects committed immutable evidence mutation after byte restoration", () => {
  const root = createRoot();
  const immutablePath = "docs/reference/phase7-readiness.json";
  const immutableFile = resolve(root, immutablePath);
  const canonical = readFileSync(immutableFile);
  writeJson(immutableFile, { archival: "mutated" });
  git(root, ["add", immutablePath]);
  git(root, ["commit", "-q", "-m", "test: mutate immutable evidence"]);
  writeFileSync(immutableFile, canonical);
  git(root, ["add", immutablePath]);
  git(root, ["commit", "-q", "-m", "test: restore immutable evidence"]);
  write(resolve(root, "src/existing.txt"), "reviewed\n");
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), registry());
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "reviewed",
  });
  git(root, [
    "add",
    "src/existing.txt",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
  ]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /immutable path changed at descendant/u);
});

test("rejects untracked or unstaged pending registry", () => {
  const root = createRoot();
  write(resolve(root, "src/existing.txt"), "reviewed\n");
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), registry());
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "reviewed",
  });
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /registry must be staged/u);
});

test("rejects empty review subject binding", () => {
  const root = createStagedReviewedFixture();
  const invalidRegistry = registry();
  invalidRegistry.entries[0].review_subject_ids = [];
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), invalidRegistry);
  git(root, ["add", PUBLIC_HISTORY_REVIEW_REGISTRY_PATH]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /review_subject_ids: must not be empty/u);
});

test("rejects escaped duplicate registry authority member", () => {
  const root = createStagedReviewedFixture();
  const registryPath = resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  const canonical = readFileSync(registryPath, "utf8");
  const duplicate = canonical.replace(
    '  "execution_authorized": false,',
    '  "execution_authorized": true,\n  "execution_authoriz\\u0065d": false,',
  );
  assert.notEqual(duplicate, canonical);
  write(registryPath, duplicate);
  git(root, ["add", PUBLIC_HISTORY_REVIEW_REGISTRY_PATH]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate JSON member/u);
});

test("rejects invalid UTF-8 registry bytes", () => {
  const root = createStagedReviewedFixture();
  const registryPath = resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  writeFileSync(
    registryPath,
    Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d]),
  );
  git(root, ["add", PUBLIC_HISTORY_REVIEW_REGISTRY_PATH]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unable to parse strict JSON/u);
});

test("rejects registry JSON deeper than fixed parser bound", () => {
  const root = createStagedReviewedFixture();
  const registryPath = resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH);
  const canonical = readFileSync(registryPath, "utf8");
  const nested = `${"[".repeat(70)}0${"]".repeat(70)}`;
  const tooDeep = canonical.replace(
    '  "side_effects": [],',
    `  "side_effects": ${nested},`,
  );
  assert.notEqual(tooDeep, canonical);
  write(registryPath, tooDeep);
  git(root, ["add", PUBLIC_HISTORY_REVIEW_REGISTRY_PATH]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /JSON nesting exceeds 64/u);
});

test("rejects duplicate member preserved in reviewed Git registry blob", () => {
  const root = createRoot();
  const baseRevision = gitText(root, ["rev-parse", "HEAD"]);
  write(resolve(root, "src/existing.txt"), "reviewed\n");
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "reviewed",
  });
  const duplicateRegistry = `${JSON.stringify(registry(), null, 2).replace(
    '  "execution_authorized": false,',
    '  "execution_authorized": true,\n  "execution_authoriz\\u0065d": false,',
  )}\n`;
  write(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), duplicateRegistry);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "test: reviewed duplicate registry"]);
  const reviewedRevision = gitText(root, ["rev-parse", "HEAD"]);
  const fixture = { root, baseRevision, reviewedRevision };
  stageAttestation(fixture);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate JSON member/u);
});

test("rejects committed pending reviewed implementation", () => {
  const fixture = createReviewedFixture();
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /committed pending state is forbidden/u);
});

test("rejects attested reviewed commit without non-registry source", () => {
  const root = createRoot();
  const baseRevision = gitText(root, ["rev-parse", "HEAD"]);
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), registry());
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "registry-only",
  });
  git(root, [
    "add",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
  ]);
  git(root, ["commit", "-q", "-m", "test: registry-only reviewed commit"]);
  const reviewedRevision = gitText(root, ["rev-parse", "HEAD"]);
  const fixture = { root, baseRevision, reviewedRevision };
  stageAttestation(fixture);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /must contain a non-registry path/u);
});

test("accepts exact staged and committed attestation", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  const staged = validate(fixture.root);
  assert.equal(staged.ok, true, staged.errors.join("\n"));
  assert.equal(staged.mode, "staged_attestation");
  git(fixture.root, ["commit", "-q", "-m", "chore(security): attest review"]);
  const committed = validate(fixture.root);
  assert.equal(committed.ok, true, committed.errors.join("\n"));
  assert.equal(committed.mode, "public_history_native");
  assert.equal(committed.pendingEntries, 0);
  assert.equal(committed.attestedEntries, 1);
});

test("strict JSON scanner ignores duplicate-looking reviewer string payload", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture, {
    mutateManifest(value) {
      value.reviewer.tool = 'literal payload {"a":1,"a":2}';
    },
  });
  const result = validate(fixture.root);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("rejects escaped duplicate nested manifest member", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  const manifestPath = resolve(fixture.root, MANIFEST_PATH);
  const canonical = readFileSync(manifestPath, "utf8");
  const duplicate = canonical.replace(
    /      "sha256": "(sha256:[0-9a-f]{64})"/u,
    `      "sha256": "sha256:${"0".repeat(64)}",\n      "sh\\u0061256": "$1"`,
  );
  assert.notEqual(duplicate, canonical);
  write(manifestPath, duplicate);
  git(fixture.root, ["add", MANIFEST_PATH]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate JSON member/u);
});

test("rejects attestation without legacy inventory modification", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture);
  git(fixture.root, ["restore", "--staged", LEGACY_IDENTIFIER_INVENTORY_PATH]);
  git(fixture.root, ["restore", LEGACY_IDENTIFIER_INVENTORY_PATH]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /legacy inventory M/u);
});

test("rejects extra attestation path", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture, { extraPath: "extra.txt" });
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expected exactly registry M/u);
});

test("rejects registry mutation beyond pending to attested", () => {
  const fixture = createReviewedFixture();
  stageAttestation(fixture, {
    mutateRegistry(value) {
      value.entries[0].subject_id = "mutated-subject";
    },
  });
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /may change only one pending state/u);
});

test("rejects wrong canonical diff and authority widening", () => {
  const wrongDiff = createReviewedFixture();
  stageAttestation(wrongDiff, {
    mutateManifest(value) {
      value.diff_sha256 = `sha256:${"0".repeat(64)}`;
    },
  });
  const diffResult = validate(wrongDiff.root);
  assert.equal(diffResult.ok, false);
  assert.match(diffResult.errors.join("\n"), /canonical reviewed diff bytes/u);

  const authority = createReviewedFixture();
  stageAttestation(authority, {
    mutateManifest(value) {
      value.execution_authorized = true;
    },
  });
  const authorityResult = validate(authority.root);
  assert.equal(authorityResult.ok, false);
  assert.match(authorityResult.errors.join("\n"), /execution_authorized/u);
});

test("rejects manifest mutation even after byte restoration", () => {
  const fixture = createReviewedFixture();
  commitAttestation(fixture);
  const canonical = readFileSync(resolve(fixture.root, MANIFEST_PATH), "utf8");
  const changed = JSON.parse(canonical);
  changed.reviewer.tool = "mutated review claim";
  writeJson(resolve(fixture.root, MANIFEST_PATH), changed);
  git(fixture.root, ["add", MANIFEST_PATH]);
  git(fixture.root, ["commit", "-q", "-m", "test: mutate manifest"]);
  write(resolve(fixture.root, MANIFEST_PATH), canonical);
  git(fixture.root, ["add", MANIFEST_PATH]);
  git(fixture.root, ["commit", "-q", "-m", "test: restore manifest"]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /manifest changed or disappeared/u);
});

test("rejects removal or reversion of historically attested entry", () => {
  const fixture = createReviewedFixture();
  commitAttestation(fixture);
  const canonicalRegistry = readFileSync(
    resolve(fixture.root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH),
    "utf8",
  );
  const canonicalManifest = readFileSync(resolve(fixture.root, MANIFEST_PATH), "utf8");
  const canonicalInventory = readFileSync(
    resolve(fixture.root, LEGACY_IDENTIFIER_INVENTORY_PATH),
    "utf8",
  );
  writeJson(resolve(fixture.root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), registry());
  rmSync(resolve(fixture.root, MANIFEST_PATH));
  writeJson(resolve(fixture.root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "reverted",
  });
  git(fixture.root, [
    "add",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
    MANIFEST_PATH,
  ]);
  git(fixture.root, ["commit", "-q", "-m", "test: revert attestation"]);
  write(resolve(fixture.root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), canonicalRegistry);
  write(resolve(fixture.root, MANIFEST_PATH), canonicalManifest);
  write(resolve(fixture.root, LEGACY_IDENTIFIER_INVENTORY_PATH), canonicalInventory);
  git(fixture.root, [
    "add",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
    MANIFEST_PATH,
  ]);
  git(fixture.root, ["commit", "-q", "-m", "test: restore attestation bytes"]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /manifest changed or disappeared|registry entry changed or disappeared/u,
  );
});

test("allows ordinary merge after exact direct attestation", () => {
  const fixture = createReviewedFixture();
  commitAttestation(fixture);
  git(fixture.root, ["branch", "later-source", fixture.reviewedRevision]);
  git(fixture.root, ["switch", "later-source"]);
  write(resolve(fixture.root, "src/later.txt"), "later source\n");
  git(fixture.root, ["add", "src/later.txt"]);
  git(fixture.root, ["commit", "-q", "-m", "test: later source"]);
  git(fixture.root, ["switch", "main"]);
  git(fixture.root, [
    "merge",
    "--no-ff",
    "-q",
    "-m",
    "test: merge later source",
    "later-source",
  ]);
  const result = validate(fixture.root);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("rejects merge commit used as attestation", () => {
  const fixture = createReviewedFixture();
  git(fixture.root, ["switch", "-c", "attestation-side"]);
  git(fixture.root, ["commit", "--allow-empty", "-q", "-m", "test: side parent"]);
  git(fixture.root, ["switch", "main"]);
  git(fixture.root, ["merge", "--no-ff", "--no-commit", "attestation-side"]);
  stageAttestation(fixture);
  git(fixture.root, ["commit", "-q", "-m", "test: merge-only attestation"]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expected exactly one direct child/u);
});

test("allows staged tail append but rejects it after pending commit", () => {
  const fixture = createReviewedFixture();
  commitAttestation(fixture);
  const nextRegistry = registry("attested");
  nextRegistry.entries.push({
    entry_id: "PHR-0000",
    subject_id: "later-source-review",
    review_subject_ids: ["P11-D4C1"],
    manifest_path: "docs/reference/public-history-reviews/PHR-0000/review.json",
    review_type: "independent_implementation_review",
    state: "pending",
  });
  writeJson(resolve(fixture.root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), nextRegistry);
  writeJson(resolve(fixture.root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "later-pending",
  });
  write(resolve(fixture.root, "src/later.txt"), "later reviewed source\n");
  git(fixture.root, [
    "add",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
    "src/later.txt",
  ]);
  const staged = validate(fixture.root);
  assert.equal(staged.ok, true, staged.errors.join("\n"));
  assert.equal(staged.mode, "staged_review");
  git(fixture.root, ["commit", "-q", "-m", "test: register later review"]);
  const committed = validate(fixture.root);
  assert.equal(committed.ok, false);
  assert.match(committed.errors.join("\n"), /committed pending state is forbidden/u);
});

test("rejects lexically earlier registry insertion", () => {
  const fixture = createReviewedFixture();
  commitAttestation(fixture);
  const nextRegistry = registry("attested");
  nextRegistry.entries.unshift({
    entry_id: "PHR-0000",
    subject_id: "inserted-before-history",
    review_subject_ids: ["P10-Z9"],
    manifest_path: "docs/reference/public-history-reviews/PHR-0000/review.json",
    review_type: "independent_implementation_review",
    state: "pending",
  });
  writeJson(resolve(fixture.root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), nextRegistry);
  writeJson(resolve(fixture.root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "inserted",
  });
  write(resolve(fixture.root, "src/inserted.txt"), "inserted\n");
  git(fixture.root, [
    "add",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
    "src/inserted.txt",
  ]);
  const result = validate(fixture.root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /pending entry must be appended at tail/u);
});

test("attests appended registry entry and preserves both through descendant", () => {
  const first = createReviewedFixture();
  commitAttestation(first);
  const root = first.root;
  const baseRevision = gitText(root, ["rev-parse", "HEAD"]);
  const secondEntry = {
    entry_id: "PHR-0000",
    subject_id: "phase11-git-adapter-source",
    review_subject_ids: ["P11-D4C1"],
    manifest_path: "docs/reference/public-history-reviews/PHR-0000/review.json",
    review_type: "independent_implementation_review",
    state: "pending",
  };
  const pendingRegistry = registry("attested");
  pendingRegistry.entries.push(secondEntry);
  writeJson(resolve(root, PUBLIC_HISTORY_REVIEW_REGISTRY_PATH), pendingRegistry);
  writeJson(resolve(root, LEGACY_IDENTIFIER_INVENTORY_PATH), {
    source_tree_sha256: "second-reviewed",
  });
  write(resolve(root, "src/later.txt"), "later reviewed source\n");
  git(root, [
    "add",
    PUBLIC_HISTORY_REVIEW_REGISTRY_PATH,
    LEGACY_IDENTIFIER_INVENTORY_PATH,
    "src/later.txt",
  ]);
  git(root, ["commit", "-q", "-m", "test: register second review"]);
  const reviewedRevision = gitText(root, ["rev-parse", "HEAD"]);
  const attestedRegistry = structuredClone(pendingRegistry);
  attestedRegistry.entries.at(-1).state = "attested";
  stageAttestation(
    { root, baseRevision, reviewedRevision },
    { entry: secondEntry, nextRegistry: attestedRegistry },
  );
  git(root, ["commit", "-q", "-m", "test: attest second review"]);
  write(resolve(root, "src/after-second.txt"), "ordinary descendant\n");
  git(root, ["add", "src/after-second.txt"]);
  git(root, ["commit", "-q", "-m", "test: later descendant"]);
  const result = validate(root);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.pendingEntries, 0);
  assert.equal(result.attestedEntries, 2);
});

test("never reports supported-release eligibility", () => {
  const fixture = createReviewedFixture();
  commitAttestation(fixture);
  const result = validate(fixture.root);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.supportedReleaseEvidenceEligible, false);
});

test("locks package and CI review-check graph", () => {
  const packageJson = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json")));
  assert.equal(
    packageJson.scripts["public-history:review:check"],
    "npm run legacy:inventory:check && node scripts/check-public-history-review-evidence.mjs",
  );
  assert.equal(
    packageJson.scripts["legacy:inventory:write"],
    "node scripts/public-source-snapshot-provenance.mjs --legacy-inventory --write",
  );
  assert.equal(
    packageJson.scripts["legacy:inventory:check"],
    "node scripts/public-source-snapshot-provenance.mjs --legacy-inventory --check",
  );
  assert.deepEqual(packageJson.scripts.check.split(" && "), [
    "npm run public:check",
    "npm run audit:dependencies:test",
    "npm run docs:direction:check",
    "npm run audit:migrations:check",
    "npm run security:conformance:check",
    "npm run phase7d:truth:check",
    "npm run phase7:local-conformance:test",
    "npm run phase7:local-conformance:check",
    "npm run security:review:test",
    "npm run security:review:check",
    "npm run public-history:review:test",
    "npm run public-history:review:check",
    "npm run phase7:readiness:test",
    "npm run phase7:readiness:check",
    "npm run phase10:exit:test",
    "npm run phase10:exit:check",
    "npm run phase11:docker-proof-readiness:test",
    "npm run phase11:docker-proof-readiness:check",
    "npm run typecheck:workspaces",
    "npm run test:workspaces",
    "npm run rust:check",
  ]);
  assert.equal(
    packageJson.scripts["source:check"],
    "npm run format:check && npm run check && npm run release:metadata:check && npm run build",
  );
  for (const scriptName of ["check", "source:check", "public-history:review:check"]) {
    assert.doesNotMatch(packageJson.scripts[scriptName], /\|\||;/u);
  }
  const workflow = readFileSync(resolve(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /^\s*run:\s*npm run source:check\s*$/mu);
});
