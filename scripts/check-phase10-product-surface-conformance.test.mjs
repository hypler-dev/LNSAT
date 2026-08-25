import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validatePhase10ProductSurfaceConformance } from "./check-phase10-product-surface-conformance.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourcePath = resolve(
  root,
  "fixtures/contracts/phase10-product-surface-conformance-v1.json",
);
const tempRoots = [];

function mutatedEvidence(mutator) {
  const directory = mkdtempSync(resolve(tmpdir(), "lnsat-p10-x1-validator-"));
  tempRoots.push(directory);
  const evidence = JSON.parse(readFileSync(sourcePath, "utf8"));
  mutator(evidence);
  const evidencePath = resolve(directory, "evidence.json");
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return evidencePath;
}

function mutatedJson(relativePath, mutator) {
  const directory = mkdtempSync(resolve(tmpdir(), "lnsat-p10-x1-validator-"));
  tempRoots.push(directory);
  const value = JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
  mutator(value);
  const path = resolve(directory, "mutated.json");
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

test.after(() => {
  for (const directory of tempRoots)
    rmSync(directory, { recursive: true, force: true });
});

test("valid P10-X1 source-only exit evidence passes", () => {
  const result = validatePhase10ProductSurfaceConformance({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
});

test("P10-X1 rejects opened Phase 11 authority", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.scope.phase11_open = true;
    evidence.status_posture.phase11_open = true;
  });
  const result = validatePhase10ProductSurfaceConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /phase11_open: false required/u);
});

test("P10-X1 rejects package lifecycle or supported-release claims", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.scope.package_lifecycle_open = true;
    evidence.scope.supported_release = true;
  });
  const result = validatePhase10ProductSurfaceConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /package_lifecycle_open: false required/u);
  assert.match(errors, /supported_release: false required/u);
});

test("P10-X1 rejects missing negative evidence", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.required_negatives.pop();
  });
  const result = validatePhase10ProductSurfaceConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /required ids or order mismatch/u);
});

test("P10-X1 rejects unverified evidence markers", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.evidence_rows[0].evidence_marker = "missing marker";
  });
  const result = validatePhase10ProductSurfaceConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /evidence marker missing/u);
});

test("P10-X1 rejects incomplete status posture", () => {
  const evidencePath = mutatedEvidence((evidence) => {
    evidence.status_posture.phase10_status = "in_progress";
    evidence.status_posture.implemented_packets.pop();
  });
  const result = validatePhase10ProductSurfaceConformance({ root, evidencePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /phase10_status: complete required/u);
  assert.match(errors, /implemented_packets: mismatch/u);
});

test("P10-X1 rejects opened status packet or Phase 11", () => {
  const statusPath = mutatedJson(
    "fixtures/contracts/phase10-status-v1.json",
    (status) => {
      status.phase10.next_packet = "P11-A1";
      status.phase10.phase11_open = true;
    },
  );
  const result = validatePhase10ProductSurfaceConformance({ root, statusPath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /next packet must remain unauthorized/u);
  assert.match(errors, /Phase 11 must remain closed/u);
});

test("P10-X1 rejects supported manifest or opened hard stop", () => {
  const manifestPath = mutatedJson(
    "fixtures/contracts/phase10-product-surface-v1.json",
    (manifest) => {
      manifest.supported_release = true;
      manifest.hard_stops.phase11_or_later_implementation = true;
    },
  );
  const result = validatePhase10ProductSurfaceConformance({ root, manifestPath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /source-only maturity must remain closed/u);
  assert.match(errors, /phase11_or_later_implementation: false required/u);
});

test("P10-X1 rejects removal from repository-wide check", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts.check = packageJson.scripts.check.replace(
      " && npm run phase10:exit:test && npm run phase10:exit:check",
      "",
    );
  });
  const result = validatePhase10ProductSurfaceConformance({ root, packagePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /check must include Phase 10 exit gates/u);
});
