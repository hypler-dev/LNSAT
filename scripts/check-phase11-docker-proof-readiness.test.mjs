import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MAX_READINESS_JSON_BYTES,
  validatePhase11DockerProofReadiness,
} from "./check-phase11-docker-proof-readiness.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixtureRelativePath =
  "fixtures/contracts/phase11-docker-local-runtime-proof-plan-v1.json";
const evidenceRequirementsFixtureRelativePath =
  "fixtures/contracts/phase11-docker-local-runtime-proof-evidence-requirements-v1.json";
const executionHarnessFixtureRelativePath =
  "fixtures/contracts/phase11-docker-local-runtime-proof-execution-harness-v1.json";
const runManifestFixtureRelativePath =
  "fixtures/contracts/phase11-docker-local-runtime-proof-run-manifest-v1.json";
const driverAdmissionFixtureRelativePath =
  "fixtures/contracts/phase11-docker-local-runtime-proof-driver-admission-v1.json";
const tempRoots = [];

function tempFile(name, content) {
  const directory = mkdtempSync(resolve(tmpdir(), "lnsat-p11-proof-readiness-"));
  tempRoots.push(directory);
  const path = resolve(directory, name);
  writeFileSync(path, content, "utf8");
  return path;
}

function mutatedJson(relativePath, mutator) {
  const value = JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
  mutator(value);
  return tempFile("mutated.json", `${JSON.stringify(value, null, 2)}\n`);
}

function removeWhitespaceFlexibleMarker(source, marker) {
  const pattern = marker
    .replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
    .replaceAll(" ", "\\s+");
  return source.replace(new RegExp(pattern, "gu"), "REMOVED_DURABLE_REREAD_GUARD");
}

function replaceProvenanceRowValue(source, label, from, to) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(
    `(\\|\\s*${escapedLabel}\\s*\\|\\s*)\\x60${from}\\x60`,
    "u",
  );
  return source.replace(pattern, "$1`" + to + "`");
}

test.after(() => {
  for (const directory of tempRoots) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("valid source-only Phase 11 Docker proof-readiness packet passes", () => {
  const result = validatePhase11DockerProofReadiness({ root });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
});

test("readiness fixture rejects real-proof, execution, completion, and support claims", () => {
  const fixturePath = mutatedJson(fixtureRelativePath, (fixture) => {
    fixture.phase11_complete = true;
    fixture.execution_authorized = true;
    fixture.real_docker_proof = true;
    fixture.production_supported = true;
  });
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /phase11_complete: false required/u);
  assert.match(errors, /execution_authorized: false required/u);
  assert.match(errors, /real_docker_proof: false required/u);
  assert.match(errors, /production_supported: false required/u);
});

test("readiness fixture rejects invented packet id and unknown fields", () => {
  const fixturePath = mutatedJson(fixtureRelativePath, (fixture) => {
    fixture.packet_id = "P11-D4D";
  });
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /canonical packet id is not assigned/u);
  assert.match(errors, /keys or key order mismatch/u);
});

test("readiness fixture rejects duplicate JSON members before decoding", () => {
  const fixturePath = tempFile(
    "duplicate.json",
    readFileSync(resolve(root, fixtureRelativePath), "utf8").replace(
      '  "fixture_id":',
      '  "fixture_id": "duplicate",\n  "fixture_id":',
    ),
  );
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate JSON member/u);
});

test("readiness fixture rejects invalid UTF-8 before decoding", () => {
  const fixturePath = tempFile("invalid-utf8.json", Buffer.from([0xff]));
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /invalid strict JSON/u);
});

test("readiness fixture rejects excessive JSON nesting before decoding", () => {
  const fixturePath = tempFile("deep.json", `${"[".repeat(65)}0${"]".repeat(65)}`);
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /JSON nesting exceeds 64/u);
});

test("readiness fixture rejects oversized JSON before reading", () => {
  const fixturePath = tempFile(
    "oversized.json",
    Buffer.alloc(MAX_READINESS_JSON_BYTES + 1, 0x20),
  );
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.includes(
      `readiness fixture: exceeds ${MAX_READINESS_JSON_BYTES} bytes`,
    ),
    true,
  );
  assert.doesNotMatch(result.errors.join("\n"), /invalid strict JSON/u);
});

test("package metadata rejects oversized JSON before reading", () => {
  const packagePath = tempFile(
    "oversized-package.json",
    Buffer.alloc(MAX_READINESS_JSON_BYTES + 1, 0x20),
  );
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.includes(`package.json: exceeds ${MAX_READINESS_JSON_BYTES} bytes`),
    true,
  );
  assert.doesNotMatch(result.errors.join("\n"), /invalid strict JSON/u);
});

test("readiness fixture must be a regular file", () => {
  const fixturePath = mkdtempSync(resolve(tmpdir(), "lnsat-p11-proof-directory-"));
  tempRoots.push(fixturePath);
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.includes("readiness fixture: must be a regular file"),
    true,
  );
});

test("readiness fixture rejects missing or reordered bindings and proof cases", () => {
  const fixturePath = mutatedJson(fixtureRelativePath, (fixture) => {
    fixture.required_bindings.pop();
    fixture.required_case_ids.reverse();
  });
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /required_bindings: ids or order mismatch/u);
  assert.match(errors, /required_case_ids: ids or order mismatch/u);
});

test("readiness fixture rejects weakened hard stops or opened runtime execution", () => {
  const fixturePath = mutatedJson(fixtureRelativePath, (fixture) => {
    fixture.hard_stops.shift();
    fixture.contract.runtime_execution = true;
  });
  const result = validatePhase11DockerProofReadiness({ root, fixturePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /hard_stops: ids or order mismatch/u);
  assert.match(errors, /runtime_execution: false required/u);
});

test("evidence requirements fixture rejects opened runtime claims", () => {
  const evidenceRequirementsPath = mutatedJson(
    evidenceRequirementsFixtureRelativePath,
    (fixture) => {
      fixture.phase11_complete = true;
      fixture.execution_authorized = true;
      fixture.real_docker_proof = true;
      fixture.production_supported = true;
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    evidenceRequirementsPath,
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(
    errors,
    /evidence requirements fixture\.phase11_complete: false required/u,
  );
  assert.match(
    errors,
    /evidence requirements fixture\.execution_authorized: false required/u,
  );
  assert.match(
    errors,
    /evidence requirements fixture\.real_docker_proof: false required/u,
  );
  assert.match(
    errors,
    /evidence requirements fixture\.production_supported: false required/u,
  );
});

test("execution harness fixture rejects opened claims and authority drift", () => {
  const executionHarnessPath = mutatedJson(
    executionHarnessFixtureRelativePath,
    (fixture) => {
      fixture.phase11_complete = true;
      fixture.execution_authorized = true;
      fixture.real_docker_proof = true;
      fixture.production_supported = true;
      fixture.required_plan_binding_ids.reverse();
      fixture.required_case_ids.reverse();
      fixture.required_observation_commitment_ids.reverse();
      fixture.preflight_rejection_ids.reverse();
      fixture.postspawn_outcome_unknown_ids.reverse();
      fixture.forbidden_public_evidence_fields.reverse();
      fixture.authority_declaration_ids.reverse();
      fixture.authority_stop_ids.pop();
    },
  );
  const result = validatePhase11DockerProofReadiness({ root, executionHarnessPath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /execution harness fixture\.phase11_complete: false required/u);
  assert.match(
    errors,
    /execution harness fixture\.execution_authorized: false required/u,
  );
  assert.match(errors, /execution harness fixture\.real_docker_proof: false required/u);
  assert.match(
    errors,
    /execution harness fixture\.production_supported: false required/u,
  );
  assert.match(errors, /required_plan_binding_ids: ids or order mismatch/u);
  assert.match(errors, /required_case_ids: ids or order mismatch/u);
  assert.match(errors, /required_observation_commitment_ids: ids or order mismatch/u);
  assert.match(errors, /preflight_rejection_ids: ids or order mismatch/u);
  assert.match(errors, /postspawn_outcome_unknown_ids: ids or order mismatch/u);
  assert.match(errors, /forbidden_public_evidence_fields: ids or order mismatch/u);
  assert.match(errors, /authority_declaration_ids: ids or order mismatch/u);
  assert.match(errors, /authority_stop_ids: ids or order mismatch/u);
});

test("run manifest fixture rejects opened claims and authority drift", () => {
  const runManifestPath = mutatedJson(runManifestFixtureRelativePath, (fixture) => {
    fixture.phase11_complete = true;
    fixture.execution_authorized = true;
    fixture.real_docker_proof = true;
    fixture.production_supported = true;
    fixture.required_case_ids.reverse();
    fixture.authority_stop_ids.pop();
    fixture.contract.proves_human_authority = true;
  });
  const result = validatePhase11DockerProofReadiness({ root, runManifestPath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /run manifest fixture\.phase11_complete: false required/u);
  assert.match(errors, /run manifest fixture\.execution_authorized: false required/u);
  assert.match(errors, /run manifest fixture\.real_docker_proof: false required/u);
  assert.match(errors, /run manifest fixture\.production_supported: false required/u);
  assert.match(errors, /required_case_ids: ids or order mismatch/u);
  assert.match(errors, /authority_stop_ids: ids or order mismatch/u);
  assert.match(errors, /proves_human_authority: false required/u);
});

test("driver admission fixture rejects opened runtime claims and weakened bindings", () => {
  const driverAdmissionPath = mutatedJson(
    driverAdmissionFixtureRelativePath,
    (fixture) => {
      fixture.phase11_complete = true;
      fixture.execution_authorized = true;
      fixture.claim_snapshot_authenticated = true;
      fixture.durable_claim_state_revalidated = true;
      fixture.launch_permission_granted = true;
      fixture.runtime_launch_performed = true;
      fixture.real_docker_proof = true;
      fixture.receipt_persisted = true;
      fixture.production_supported = true;
      fixture.contract.proves_human_authority = true;
      fixture.required_claim_state.claim_created = false;
      fixture.required_bindings.reverse();
      fixture.error_codes.pop();
      fixture.required_runtime_gate_checks.pop();
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    driverAdmissionPath,
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  for (const field of [
    "phase11_complete",
    "execution_authorized",
    "claim_snapshot_authenticated",
    "durable_claim_state_revalidated",
    "launch_permission_granted",
    "runtime_launch_performed",
    "real_docker_proof",
    "receipt_persisted",
    "production_supported",
  ])
    assert.match(
      errors,
      new RegExp(`driver admission fixture\\.${field}: false required`, "u"),
    );
  assert.match(errors, /proves_human_authority: false required/u);
  assert.match(errors, /required_claim_state: mismatch/u);
  assert.match(errors, /required_bindings: ids or order mismatch/u);
  assert.match(errors, /error_codes: ids or order mismatch/u);
  assert.match(errors, /required_runtime_gate_checks: ids or order mismatch/u);
});

test("evidence requirements fixture rejects invented packet id", () => {
  const evidenceRequirementsPath = mutatedJson(
    evidenceRequirementsFixtureRelativePath,
    (fixture) => {
      fixture.packet_id = "P11-D4D";
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    evidenceRequirementsPath,
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /canonical packet id is not assigned/u);
  assert.match(errors, /keys or key order mismatch/u);
});

test("evidence requirements fixture rejects reordered commitments and weakened failure or redaction sets", () => {
  const evidenceRequirementsPath = mutatedJson(
    evidenceRequirementsFixtureRelativePath,
    (fixture) => {
      fixture.required_observation_commitment_ids.reverse();
      fixture.preflight_rejection_ids.pop();
      fixture.postspawn_outcome_unknown_ids.reverse();
      fixture.forbidden_public_evidence_fields.shift();
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    evidenceRequirementsPath,
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /required_observation_commitment_ids: ids or order mismatch/u);
  assert.match(errors, /preflight_rejection_ids: ids or order mismatch/u);
  assert.match(errors, /postspawn_outcome_unknown_ids: ids or order mismatch/u);
  assert.match(errors, /forbidden_public_evidence_fields: ids or order mismatch/u);
});

test("evidence requirements fixture rejects duplicate, deep, and oversized JSON before decoding", () => {
  const canonical = readFileSync(
    resolve(root, evidenceRequirementsFixtureRelativePath),
    "utf8",
  );
  const duplicatePath = tempFile(
    "duplicate-evidence.json",
    canonical.replace(
      '  "fixture_id":',
      '  "fixture_id": "duplicate",\n  "fixture_id":',
    ),
  );
  const duplicate = validatePhase11DockerProofReadiness({
    root,
    evidenceRequirementsPath: duplicatePath,
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.errors.join("\n"), /duplicate JSON member/u);

  const deepPath = tempFile(
    "deep-evidence.json",
    `${"[".repeat(65)}0${"]".repeat(65)}`,
  );
  const deep = validatePhase11DockerProofReadiness({
    root,
    evidenceRequirementsPath: deepPath,
  });
  assert.equal(deep.ok, false);
  assert.match(deep.errors.join("\n"), /JSON nesting exceeds 64/u);

  const oversizedPath = tempFile(
    "oversized-evidence.json",
    Buffer.alloc(MAX_READINESS_JSON_BYTES + 1, 0x20),
  );
  const oversized = validatePhase11DockerProofReadiness({
    root,
    evidenceRequirementsPath: oversizedPath,
  });
  assert.equal(oversized.ok, false);
  assert.equal(
    oversized.errors.includes(
      `evidence requirements fixture: exceeds ${MAX_READINESS_JSON_BYTES} bytes`,
    ),
    true,
  );
  assert.doesNotMatch(oversized.errors.join("\n"), /invalid strict JSON/u);
});

test("repository-wide check cannot drop Phase 11 readiness gates", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts.check = packageJson.scripts.check.replace(
      "npm run phase11:docker-proof-readiness:test && npm run phase11:docker-proof-readiness:check",
      "",
    );
  });
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /check must include Phase 11 readiness gates/u,
  );
});

test("named Phase 11 readiness aliases cannot drift", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts["test:phase11-readiness"] = "true";
    packageJson.scripts["check:phase11-readiness"] = "true";
  });
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /Phase 11 readiness test alias mismatch/u);
  assert.match(errors, /Phase 11 readiness check alias mismatch/u);
});

test("repository-wide check cannot spoof readiness gates inside shell text", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts.check =
      'echo "npm run phase11:docker-proof-readiness:test && npm run phase11:docker-proof-readiness:check"';
  });
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /check must include Phase 11 readiness gates/u,
  );
});

test("source check cannot stop delegating to repository check", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts["source:check"] =
      "npm run format:check && npm run public:check && npm run release:metadata:check && npm run build";
  });
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /source:check must retain exact repository check chain/u,
  );
});

test("package scripts cannot open real Docker proof execution command", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts["phase11:docker:proof"] = "docker run example";
  });
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /real Docker proof execution command remains closed/u,
  );
});

test("repository-wide check cannot append a Docker command after readiness gates", () => {
  for (const command of [
    "docker run forbidden",
    '"/usr/bin/docker" run forbidden',
    "'docker' run forbidden",
    "docker-compose up",
  ]) {
    const packagePath = mutatedJson("package.json", (packageJson) => {
      packageJson.scripts.check += ` && ${command}`;
    });
    const result = validatePhase11DockerProofReadiness({ root, packagePath });
    assert.equal(result.ok, false, command);
    assert.match(result.errors.join("\n"), /Docker token remains forbidden/u);
  }
});

test("package scripts reject constructed Docker command indirection", () => {
  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.scripts.check += ' && D=d; "${D}ocker" run forbidden';
  });
  const result = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source-gate graph digest mismatch/u);
});

test("source CI cannot add Docker proof, service, or container execution", () => {
  const workflowPath = tempFile(
    "extra.yml",
    "jobs:\n  proof:\n    container: docker:27\n    services: { docker: { image: docker:27 } }\n    steps:\n      - run: docker run forbidden\n      - uses: docker://alpine:latest\n# phase11:docker:proof\n",
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    workflowPaths: [resolve(root, ".github/workflows/ci.yml"), workflowPath],
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /real Docker proof command forbidden/u);
  assert.match(errors, /Docker service\/container remains forbidden/u);
  assert.match(errors, /Docker command remains forbidden/u);
  assert.match(errors, /Docker action\/image remains forbidden/u);
});

test("source CI cannot skip the repository source check", () => {
  const workflowPath = tempFile(
    "ci.yml",
    readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8").replace(
      "run: npm run source:check",
      "run: npm run public:check",
    ),
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    workflowPaths: [workflowPath],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /npm run source:check must remain wired/u);
});

test("pure proof module rejects every process, filesystem, environment, socket, store, and consequence marker", () => {
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
    const modulePath = tempFile(
      "docker_local_runtime_proof.rs",
      `${readFileSync(
        resolve(root, "crates/lnsatd/src/docker_local_runtime_proof.rs"),
        "utf8",
      )}\n${forbidden}\n`,
    );
    const result = validatePhase11DockerProofReadiness({ root, modulePath });
    assert.equal(result.ok, false, forbidden);
    assert.match(
      result.errors.join("\n"),
      new RegExp(
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\."),
        "u",
      ),
    );
  }
});

test("pure evidence requirements module rejects process, filesystem, socket, store, and consequence markers", () => {
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
    const evidenceModulePath = tempFile(
      "docker_local_runtime_proof_evidence.rs",
      `${readFileSync(
        resolve(root, "crates/lnsatd/src/docker_local_runtime_proof_evidence.rs"),
        "utf8",
      )}\n${forbidden}\n`,
    );
    const result = validatePhase11DockerProofReadiness({ root, evidenceModulePath });
    assert.equal(result.ok, false, forbidden);
    assert.match(
      result.errors.join("\n"),
      new RegExp(
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\."),
        "u",
      ),
    );
  }
});

test("pure execution harness module rejects process, filesystem, socket, store, and consequence markers", () => {
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
    const executionHarnessModulePath = tempFile(
      "docker_local_runtime_proof_execution_harness.rs",
      `${readFileSync(
        resolve(
          root,
          "crates/lnsatd/src/docker_local_runtime_proof_execution_harness.rs",
        ),
        "utf8",
      )}\n${forbidden}\n`,
    );
    const result = validatePhase11DockerProofReadiness({
      root,
      executionHarnessModulePath,
    });
    assert.equal(result.ok, false, forbidden);
    assert.match(
      result.errors.join("\n"),
      new RegExp(
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\."),
        "u",
      ),
    );
  }
});

test("private run manifest module rejects runtime I/O marker surfaces", () => {
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
    const runManifestModulePath = tempFile(
      "docker_local_runtime_proof_run_manifest.rs",
      `${readFileSync(
        resolve(root, "crates/lnsatd/src/docker_local_runtime_proof_run_manifest.rs"),
        "utf8",
      )}\n${forbidden}\n`,
    );
    const result = validatePhase11DockerProofReadiness({ root, runManifestModulePath });
    assert.equal(result.ok, false, forbidden);
    assert.match(
      result.errors.join("\n"),
      new RegExp(
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\."),
        "u",
      ),
    );
  }
});

test("private run manifest module requires external source-boundary markers", () => {
  const source = readFileSync(
    resolve(root, "crates/lnsatd/src/docker_local_runtime_proof_run_manifest.rs"),
    "utf8",
  );
  for (const marker of [
    "DockerLocalRuntimeProofRunManifestSourceBindingV1",
    "source.repository_absolute_path",
  ]) {
    const runManifestModulePath = tempFile(
      "docker_local_runtime_proof_run_manifest.rs",
      source.replaceAll(marker, "REMOVED_SOURCE_BOUNDARY"),
    );
    const result = validatePhase11DockerProofReadiness({ root, runManifestModulePath });
    assert.equal(result.ok, false, marker);
    assert.match(
      result.errors.join("\n"),
      new RegExp(`missing marker ${marker}`.replaceAll(".", "\\."), "u"),
    );
  }
});

test("private driver admission module rejects runtime, store-write, and consequence markers", () => {
  const source = readFileSync(
    resolve(root, "crates/lnsatd/src/docker_local_runtime_proof_driver_admission.rs"),
    "utf8",
  );
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
    "claim_phase11_docker_runtime_composition_v1",
    "persist_phase11_docker_runtime_result_v1",
    "mark_phase11_docker_outcome_unknown_v1",
    "supervise_docker_local_git_execution_v1",
    "execute_phase11_mapped_disposable_git_commit_v1",
  ]) {
    const driverAdmissionModulePath = tempFile(
      "docker_local_runtime_proof_driver_admission.rs",
      `${source}\n${forbidden}\n`,
    );
    const result = validatePhase11DockerProofReadiness({
      root,
      driverAdmissionModulePath,
    });
    assert.equal(result.ok, false, forbidden);
    assert.match(
      result.errors.join("\n"),
      new RegExp(
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\\\."),
        "u",
      ),
    );
  }
});

test("readiness docs cannot lose closed-boundary markers", () => {
  const relativePath =
    "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md";
  const docPath = tempFile("readiness.md", "# Incomplete document\n");
  const result = validatePhase11DockerProofReadiness({
    root,
    docPaths: { [relativePath]: docPath },
  });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS\.md: missing marker/u,
  );
});

test("operator run packet cannot lose blocking authority markers", () => {
  const relativePath =
    "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md";
  const docPath = tempFile("operator-run-packet.md", "# Incomplete document\n");
  const result = validatePhase11DockerProofReadiness({
    root,
    docPaths: { [relativePath]: docPath },
  });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET\.md: missing marker/u,
  );
});

test("operator run packet locks source, cases, adapter, and D3 derivation one marker at a time", () => {
  const relativePath =
    "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md";
  const source = readFileSync(resolve(root, relativePath), "utf8");
  for (const marker of [
    "b41aa756bccd85843ac540abfd927e8c5693d5fe",
    "fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c",
    "proof-implementation source lock",
    "2c918bc59b82ffabc378b47e66137733cf24a6d7",
    "190ab32443f60a2a1bc78f990e8ea5571c28f96f",
    "17247c9c194f6a332e99ee32ae5052620349896b",
    "d93b3f5c9b040fa5ba0051881574f59cf4ee92ea",
    "914da579f28c98dd59cb5303eba5d7fa3c68664e",
    "adapter:docker-local:git-commit",
    "exact adapter version `v1`",
    "min(profile limits.stdout_bytes, 65,536)",
    "claim_created = true",
    "claim_created != true",
    "one exact served `Gateway -> D4B2A -> D3/D4A -> supervisor` chain identity",
    "exact served-chain authorization identity",
    "real_runtime_one_consequence_and_bound_receipt",
    "exact_replay_metadata_only_no_redispatch",
    "post_consequence_unknown_survives_restart",
    "reconciliation_host_git_inspection_only",
    "unchanged_target_unknown_without_receipt",
    "isolation_no_socket_credentials_or_network",
    "cleanup_verified_container_id_only",
    "runtime_and_image_identity_stable",
  ]) {
    const mutated = removeWhitespaceFlexibleMarker(source, marker);
    assert.notEqual(mutated, source, marker);
    const docPath = tempFile("operator-run-packet.md", mutated);
    const result = validatePhase11DockerProofReadiness({
      root,
      docPaths: { [relativePath]: docPath },
    });
    assert.equal(result.ok, false, marker);
    assert.ok(result.errors.join("\n").includes(`missing marker ${marker}`), marker);
  }
});

test("operator run packet provenance binds each labeled row to its exact identity", () => {
  const relativePath =
    "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_OPERATOR_RUN_PACKET.md";
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const identities = [
    "b41aa756bccd85843ac540abfd927e8c5693d5fe",
    "fecb4303cfe1b5224d3c1f1fbd8f2c86008e389c",
    "2c918bc59b82ffabc378b47e66137733cf24a6d7",
    "190ab32443f60a2a1bc78f990e8ea5571c28f96f",
    "17247c9c194f6a332e99ee32ae5052620349896b",
  ];
  const cases = [
    {
      name: "source revision and public merge swapped",
      mutate: (value) =>
        replaceProvenanceRowValue(
          replaceProvenanceRowValue(
            value,
            "Proof-implementation source",
            identities[0],
            identities[3],
          ),
          "Public packet merge",
          identities[3],
          identities[0],
        ),
      expected: `missing provenance row Proof-implementation source -> ${identities[0]}`,
    },
    {
      name: "packet head relocated into integration-tree row",
      mutate: (value) =>
        replaceProvenanceRowValue(
          replaceProvenanceRowValue(
            value,
            "Reviewed packet head",
            identities[2],
            identities[4],
          ),
          "Packet integration tree",
          identities[4],
          identities[2],
        ),
      expected: `missing provenance row Reviewed packet head -> ${identities[2]}`,
    },
  ];
  for (const { name, mutate, expected } of cases) {
    const mutated = mutate(source);
    for (const identity of identities) {
      assert.ok(mutated.includes(identity), `${name}: ${identity}`);
    }
    const docPath = tempFile("operator-run-packet.md", mutated);
    const result = validatePhase11DockerProofReadiness({
      root,
      docPaths: { [relativePath]: docPath },
    });
    assert.equal(result.ok, false, name);
    assert.ok(result.errors.join("\n").includes(expected), name);
  }
});

test("status summaries name the runnable driver and authenticated durable-store boundary", () => {
  for (const relativePath of [
    "README.md",
    "docs/PROJECT_STATUS.md",
    "docs/ROADMAP.md",
  ]) {
    const source = readFileSync(resolve(root, relativePath), "utf8");
    for (const marker of [
      "authenticate the created-claim result",
      "through the durable-store boundary",
    ]) {
      const mutated = removeWhitespaceFlexibleMarker(source, marker);
      assert.notEqual(mutated, source, `${relativePath}: ${marker}`);
      const docPath = tempFile(relativePath.replaceAll("/", "-"), mutated);
      const result = validatePhase11DockerProofReadiness({
        root,
        docPaths: { [relativePath]: docPath },
      });
      assert.equal(result.ok, false, `${relativePath}: ${marker}`);
      assert.ok(result.errors.join("\n").includes(`missing marker ${marker}`));
    }
  }
});

test("core readiness docs cannot lose the fresh durable reread or bound guard", () => {
  for (const relativePath of [
    "README.md",
    "docs/DOCS_INDEX.md",
    "docs/PROJECT_STATUS.md",
    "docs/ROADMAP.md",
    "docs/PRODUCT_BUILD_SEQUENCE.md",
    "docs/WHY_PUBLIC_NOW.md",
    "docs/architecture/ADR-0007_DOCKER_FIRST_RUNTIME_NEUTRAL_ENFORCEMENT.md",
    "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_EXECUTION_EVIDENCE_REQUIREMENTS.md",
    "docs/architecture/PHASE_11_REAL_DISPOSABLE_DOCKER_PROOF_READINESS.md",
    "docs/architecture/README.md",
  ]) {
    const source = readFileSync(resolve(root, relativePath), "utf8");
    for (const marker of [
      "fresh authenticated store transaction",
      "bound pre-supervisor guard",
    ]) {
      const mutated = removeWhitespaceFlexibleMarker(source, marker);
      assert.notEqual(mutated, source, `${relativePath}: ${marker}`);
      const docPath = tempFile(relativePath.replaceAll("/", "-"), mutated);
      const result = validatePhase11DockerProofReadiness({
        root,
        docPaths: { [relativePath]: docPath },
      });
      assert.equal(result.ok, false, `${relativePath}: ${marker}`);
      assert.ok(result.errors.join("\n").includes(`missing marker ${marker}`));
    }
  }
});

test("status summaries cannot weaken post-claim outcome-unknown handling", () => {
  const marker = "preserves or marks `outcome_unknown`";
  for (const relativePath of [
    "README.md",
    "docs/PROJECT_STATUS.md",
    "docs/ROADMAP.md",
  ]) {
    const source = readFileSync(resolve(root, relativePath), "utf8");
    const mutated = removeWhitespaceFlexibleMarker(source, marker);
    assert.notEqual(mutated, source, `${relativePath}: ${marker}`);
    const docPath = tempFile(relativePath.replaceAll("/", "-"), mutated);
    const result = validatePhase11DockerProofReadiness({
      root,
      docPaths: { [relativePath]: docPath },
    });
    assert.equal(result.ok, false, relativePath);
    assert.ok(result.errors.join("\n").includes(`missing marker ${marker}`));
  }
});

test("source CI rejects quoted, absolute, and compose Docker commands", () => {
  for (const command of [
    '"/usr/bin/docker" run forbidden',
    "'docker' run forbidden",
    "docker-compose up",
  ]) {
    const workflowPath = tempFile(
      "ci.yml",
      `name: bypass\non: workflow_dispatch\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: npm run source:check\n      - run: ${command}\n`,
    );
    const result = validatePhase11DockerProofReadiness({
      root,
      workflowPaths: [workflowPath],
    });
    assert.equal(result.ok, false, command);
    assert.match(result.errors.join("\n"), /Docker token remains forbidden/u);
  }
});

test("source CI rejects constructed Docker command indirection", () => {
  const workflowPath = tempFile(
    "ci.yml",
    readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8").replace(
      "      - name: Verify public source\n        run: npm run source:check",
      '      - name: Verify public source\n        run: npm run source:check\n\n      - name: Forbidden bypass\n        run: |\n          D=d; "${D}ocker" run forbidden',
    ),
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    workflowPaths: [workflowPath],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /closed workflow digest mismatch/u);
});

test("readiness docs reject positive runtime, completion, or support claims", () => {
  const relativePath = "README.md";
  const docPath = tempFile(
    "README.md",
    `${readFileSync(resolve(root, relativePath), "utf8")}\nPhase 11 is complete.\n`,
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    docPaths: { [relativePath]: docPath },
  });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /forbidden runtime, completion, or support claim/u,
  );
});
