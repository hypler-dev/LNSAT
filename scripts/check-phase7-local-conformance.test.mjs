import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validatePhase7LocalConformance } from "./check-phase7-local-conformance.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourcePath = resolve(
  root,
  "fixtures/contracts/phase7-local-v1-conformance-v1.json",
);
const tempRoots = [];

function mutatedEvidence(mutator) {
  const directory = mkdtempSync(resolve(tmpdir(), "lnsat-p7-x1-validator-"));
  tempRoots.push(directory);
  const evidence = JSON.parse(readFileSync(sourcePath, "utf8"));
  mutator(evidence);
  const evidencePath = resolve(directory, "evidence.json");
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return evidencePath;
}

test.after(() => {
  for (const directory of tempRoots)
    rmSync(directory, { recursive: true, force: true });
});

test("valid P7-X1 source-only conformance evidence passes", () => {
  const result = validatePhase7LocalConformance({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
});

test("P7-X1 rejects opened runtime authority", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.scope.runtime_authority_opened = true;
  });
  const result = validatePhase7LocalConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /runtime_authority_opened: false required/u);
});

test("P7-X1 rejects missing negative evidence", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.required_negatives.pop();
  });
  const result = validatePhase7LocalConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /required ids or order mismatch/u);
});

test("P7-X1 rejects unverified evidence marker", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.evidence_rows[0].evidence_marker = "marker that does not exist";
  });
  const result = validatePhase7LocalConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /evidence marker missing/u);
});

test("P7-X1 rejects supported-artifact claim", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.platform_profile.support_level = "supported_release";
    evidence.platform_profile.distribution_artifact_supported = true;
  });
  const result = validatePhase7LocalConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /support_level: mismatch/u);
  assert.match(errors, /distribution_artifact_supported: mismatch/u);
});
