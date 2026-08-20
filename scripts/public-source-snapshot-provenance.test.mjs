import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  PUBLIC_SOURCE_ROOT_SUBJECT,
  PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH,
  validatePublicSourceSnapshotProvenance,
} from "./public-source-snapshot-provenance.mjs";

const roots = [];
const TEST_IMMUTABLE_PATHS = [PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH, "evidence.json"];

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function writeJson(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function marker() {
  return {
    schema_version: "lnsat.public_source_snapshot.v1",
    history_strategy: "fresh_root",
    source_base_revision: "a".repeat(40),
    historical_git_evidence: "retained_private_not_locally_replayable",
    claim_scope: "pre_release_source_only",
    immutable_paths: TEST_IMMUTABLE_PATHS,
    release_authority: false,
    artifact_authority: false,
    deployment_authority: false,
  };
}

function fixture({
  includeMarker = true,
  includePackage = true,
  markerRaw,
  markerValue = marker(),
  packageValue,
  subject = PUBLIC_SOURCE_ROOT_SUBJECT,
  version = "0.1.0",
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "public-source-snapshot-"));
  roots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "Snapshot Test"]);
  git(root, ["config", "user.email", "snapshot-test@lnsat.invalid"]);
  if (includePackage) {
    writeJson(
      resolve(root, "package.json"),
      packageValue ?? { version, private: true },
    );
  }
  writeJson(resolve(root, "evidence.json"), { state: "archival" });
  if (includeMarker) {
    const markerPath = resolve(root, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH);
    if (markerRaw === undefined) {
      writeJson(markerPath, markerValue);
    } else {
      mkdirSync(resolve(markerPath, ".."), { recursive: true });
      writeFileSync(markerPath, markerRaw, "utf8");
    }
  }
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", subject]);
  return root;
}

function validate(root) {
  return validatePublicSourceSnapshotProvenance({
    root,
    immutablePaths: TEST_IMMUTABLE_PATHS,
  });
}

test.after(() => {
  for (const root of roots) rmSync(root, { force: true, recursive: true });
});

test("accepts exact pre-release fresh root and later unrelated work", () => {
  const root = fixture();
  writeFileSync(resolve(root, "later.txt"), "public work\n", "utf8");
  git(root, ["add", "later.txt"]);
  git(root, ["commit", "-q", "-m", "docs: add later public work"]);
  const result = validate(root);
  assert.equal(result.active, true);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("requires marker in exact public root", () => {
  const result = validate(fixture({ includeMarker: false }));
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /marker is required/u);
});

test("marker at root activates validation and rejects wrong root subject", () => {
  const result = validate(fixture({ subject: "wrong public root subject" }));
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /root subject must equal/u);
});

test("later marker cannot fall back to full-lineage mode", () => {
  const root = fixture({
    includeMarker: false,
    subject: "ordinary repository root",
  });
  writeJson(resolve(root, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH), marker());
  git(root, ["add", PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH]);
  git(root, ["commit", "-q", "-m", "test: add marker too late"]);
  const result = validate(root);
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /root subject must equal/u);
  assert.match(result.errors.join("\n"), /marker is required/u);
});

test("unmerged later marker cannot fall back to full-lineage mode", () => {
  const root = fixture({
    includeMarker: false,
    subject: "ordinary repository root",
  });
  git(root, ["switch", "-q", "-c", "late-marker"]);
  writeJson(resolve(root, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH), marker());
  git(root, ["add", PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH]);
  git(root, ["commit", "-q", "-m", "test: add marker on side branch"]);
  git(root, ["switch", "-q", "main"]);
  const result = validate(root);
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /root subject must equal/u);
  assert.match(result.errors.join("\n"), /marker is required/u);
});

test("rejects malformed marker values and unknown keys", () => {
  const malformed = validate(fixture({ markerRaw: "{\n" }));
  assert.equal(malformed.ok, false);
  assert.match(malformed.errors.join("\n"), /unable to parse root marker/u);

  const wrongValue = marker();
  wrongValue.release_authority = true;
  const wrongValueResult = validate(fixture({ markerValue: wrongValue }));
  assert.equal(wrongValueResult.ok, false);
  assert.match(wrongValueResult.errors.join("\n"), /release_authority must be false/u);

  const extraKey = { ...marker(), untrusted_claim: true };
  const extraKeyResult = validate(fixture({ markerValue: extraKey }));
  assert.equal(extraKeyResult.ok, false);
  assert.match(extraKeyResult.errors.join("\n"), /marker keys must be exact/u);
});

test("rejects marker immutable path drift", () => {
  const changedPaths = marker();
  changedPaths.immutable_paths = [PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH];
  const result = validate(fixture({ markerValue: changedPaths }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /immutable_paths must exactly match/u);
});

test("rejects immutable evidence change even after restore", () => {
  const root = fixture();
  writeJson(resolve(root, "evidence.json"), { state: "changed" });
  git(root, ["add", "evidence.json"]);
  git(root, ["commit", "-q", "-m", "test: change evidence"]);
  writeJson(resolve(root, "evidence.json"), { state: "archival" });
  git(root, ["add", "evidence.json"]);
  git(root, ["commit", "-q", "-m", "test: restore evidence"]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /immutable path changed at descendant/u);
});

test("rejects side-branch evidence change and restore after merge", () => {
  const root = fixture();
  git(root, ["switch", "-q", "-c", "evidence-rewrite"]);
  writeJson(resolve(root, "evidence.json"), { state: "changed" });
  git(root, ["add", "evidence.json"]);
  git(root, ["commit", "-q", "-m", "test: change evidence on side branch"]);
  writeJson(resolve(root, "evidence.json"), { state: "archival" });
  git(root, ["add", "evidence.json"]);
  git(root, ["commit", "-q", "-m", "test: restore evidence on side branch"]);
  git(root, ["switch", "-q", "main"]);
  writeFileSync(resolve(root, "main.txt"), "main work\n", "utf8");
  git(root, ["add", "main.txt"]);
  git(root, ["commit", "-q", "-m", "test: main work"]);
  git(root, [
    "merge",
    "-q",
    "--no-ff",
    "evidence-rewrite",
    "-m",
    "test: merge restored side branch",
  ]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /immutable path changed at descendant/u);
});

test("rejects immutable evidence change on unmerged branch", () => {
  const root = fixture();
  git(root, ["switch", "-q", "-c", "unmerged-evidence-rewrite"]);
  writeJson(resolve(root, "evidence.json"), { state: "changed" });
  git(root, ["add", "evidence.json"]);
  git(root, ["commit", "-q", "-m", "test: unmerged evidence rewrite"]);
  git(root, ["switch", "-q", "main"]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /immutable path changed at descendant/u);
});

test("rejects deleted immutable evidence", () => {
  const root = fixture();
  rmSync(resolve(root, "evidence.json"));
  git(root, ["add", "evidence.json"]);
  git(root, ["commit", "-q", "-m", "test: delete evidence"]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /immutable path missing/u);
});

test("rejects working-tree marker drift", () => {
  const root = fixture();
  const changed = marker();
  changed.claim_scope = "unsupported_scope";
  writeJson(resolve(root, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH), changed);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /current bytes differ from root/u);
});

test("rejects multiple-root history when any root signals snapshot intent", () => {
  const root = fixture();
  git(root, ["switch", "-q", "--orphan", "unrelated"]);
  for (const entry of readdirSync(root)) {
    if (entry !== ".git")
      rmSync(resolve(root, entry), { force: true, recursive: true });
  }
  writeFileSync(resolve(root, "unrelated.txt"), "unrelated root\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "unrelated root"]);
  git(root, [
    "merge",
    "-q",
    "--allow-unrelated-histories",
    "main",
    "-m",
    "test: join unrelated histories",
  ]);
  const result = validate(root);
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /exactly one root commit/u);
});

test("rejects unmerged orphan root", () => {
  const root = fixture();
  git(root, ["switch", "-q", "--orphan", "unmerged-orphan"]);
  for (const entry of readdirSync(root)) {
    if (entry !== ".git")
      rmSync(resolve(root, entry), { force: true, recursive: true });
  }
  writeFileSync(resolve(root, "orphan.txt"), "orphan root\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "unmerged orphan root"]);
  git(root, ["switch", "-q", "main"]);
  const result = validate(root);
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /exactly one root commit/u);
});

test("rejects shallow public snapshot checkout", () => {
  const source = fixture();
  const cloneParent = mkdtempSync(join(tmpdir(), "public-source-shallow-"));
  roots.push(cloneParent);
  const shallow = resolve(cloneParent, "repo");
  git(cloneParent, ["clone", "-q", "--no-local", "--depth=1", source, shallow]);
  const result = validate(shallow);
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /checkout must be non-shallow/u);
});

test("rejects separate source and Git roots when marker is present", () => {
  const sourceRoot = fixture();
  const gitRoot = fixture({ includeMarker: false, subject: "private history root" });
  const result = validatePublicSourceSnapshotProvenance({
    root: sourceRoot,
    gitRoot,
    immutablePaths: TEST_IMMUTABLE_PATHS,
  });
  assert.equal(result.active, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source and Git roots must match/u);
});

test("rejects v1 and tag publication state", () => {
  const v1Root = fixture({ version: "1.0.0" });
  assert.match(validate(v1Root).errors.join("\n"), /forbidden at version 1\.0\.0/u);

  const taggedRoot = fixture();
  git(taggedRoot, ["tag", "v0.1.0"]);
  assert.match(validate(taggedRoot).errors.join("\n"), /forbids tags/u);
});

test("rejects unsafe committed package state hidden by dirty worktree", () => {
  const root = fixture();
  writeJson(resolve(root, "package.json"), {
    version: "1.0.0",
    private: false,
    publishConfig: { access: "public" },
  });
  git(root, ["add", "package.json"]);
  git(root, ["commit", "-q", "-m", "test: unsafe package state"]);
  writeJson(resolve(root, "package.json"), { version: "0.1.0", private: true });
  const result = validate(root);
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /private\/unpublished/u);
  assert.match(errors, /must not define publishConfig/u);
  assert.match(errors, /forbidden at version 1\.0\.0/u);
});

test("rejects unsafe package commit followed by committed restore", () => {
  const root = fixture();
  writeJson(resolve(root, "package.json"), {
    version: "1.0.0",
    private: false,
    publishConfig: { access: "public" },
  });
  git(root, ["add", "package.json"]);
  git(root, ["commit", "-q", "-m", "test: unsafe package state"]);
  writeJson(resolve(root, "package.json"), { version: "0.1.0", private: true });
  git(root, ["add", "package.json"]);
  git(root, ["commit", "-q", "-m", "test: restore package state"]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /forbidden at version 1\.0\.0/u);
});

test("rejects publishable nested npm and Rust manifests", () => {
  const root = fixture();
  writeJson(resolve(root, "packages/demo/package.json"), {
    name: "demo",
    version: "0.1.0",
    private: false,
  });
  mkdirSync(resolve(root, "crates/demo"), { recursive: true });
  writeFileSync(
    resolve(root, "crates/demo/Cargo.toml"),
    '[package]\nname = "demo"\nversion = "0.1.0"\npublish = true\n\n[package.metadata.guard]\npublish = false\n',
    "utf8",
  );
  mkdirSync(resolve(root, "tools/nested"), { recursive: true });
  writeFileSync(
    resolve(root, "tools/nested/Cargo.toml"),
    '[package]\nname = "nested"\nversion = "0.1.0"\npublish = true\n',
    "utf8",
  );
  mkdirSync(resolve(root, "tools/inline"), { recursive: true });
  writeFileSync(
    resolve(root, "tools/inline/Cargo.toml"),
    'package = { name = "inline", version = "0.1.0", edition = "2021", publish = true }\n',
    "utf8",
  );
  mkdirSync(resolve(root, "tools/escaped"), { recursive: true });
  writeFileSync(
    resolve(root, "tools/escaped/Cargo.toml"),
    '"pack\\u0061ge" = { name = "escaped", version = "0.1.0", edition = "2021", publish = true }\n',
    "utf8",
  );
  mkdirSync(resolve(root, "tools/multiline"), { recursive: true });
  writeFileSync(
    resolve(root, "tools/multiline/Cargo.toml"),
    '[package]\nname = "multiline"\nversion = "0.1.0"\ndescription = """\npublish = false\n"""\n',
    "utf8",
  );
  git(root, [
    "add",
    "packages/demo/package.json",
    "crates/demo/Cargo.toml",
    "tools/nested/Cargo.toml",
    "tools/inline/Cargo.toml",
    "tools/escaped/Cargo.toml",
    "tools/multiline/Cargo.toml",
  ]);
  git(root, ["commit", "-q", "-m", "test: add publishable manifests"]);
  const result = validate(root);
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /packages\/demo\/package\.json.*private\/unpublished/u);
  assert.match(errors, /crates\/demo\/Cargo\.toml.*publish must equal false/u);
  assert.match(errors, /tools\/nested\/Cargo\.toml.*publish must equal false/u);
  assert.match(errors, /tools\/inline\/Cargo\.toml.*publish must equal false/u);
  assert.match(errors, /tools\/escaped\/Cargo\.toml.*publish must equal false/u);
  assert.match(errors, /tools\/multiline\/Cargo\.toml.*publish must equal false/u);
});

test("rejects Git replacement refs", () => {
  const root = fixture();
  const rootRevision = git(root, ["rev-list", "--max-parents=0", "HEAD"]);
  git(root, ["update-ref", `refs/replace/${rootRevision}`, rootRevision]);
  const result = validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /replacement refs are forbidden/u);
});

test("rejects missing or publishable package metadata", () => {
  const missing = validate(fixture({ includePackage: false }));
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join("\n"), /root package\.json missing/u);

  const publicPackage = validate(
    fixture({ packageValue: { version: "0.1.0", private: false } }),
  );
  assert.match(publicPackage.errors.join("\n"), /private\/unpublished/u);

  const publishConfig = validate(
    fixture({
      packageValue: {
        version: "0.1.0",
        private: true,
        publishConfig: { access: "public" },
      },
    }),
  );
  assert.match(publishConfig.errors.join("\n"), /must not define publishConfig/u);
});

test("keeps existing full-lineage repositories in strict lineage mode", () => {
  const root = fixture({ includeMarker: false, subject: "fixture base" });
  const result = validate(root);
  assert.equal(result.active, false);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});
