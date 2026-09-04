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

function mutatedSupervisor(mutator) {
  const source = readFileSync(
    resolve(root, "crates/lnsatd/src/docker_local_supervisor.rs"),
    "utf8",
  );
  return tempFile("docker_local_supervisor.rs", mutator(source));
}

function mutatedWorkspacePackage(relativePath, mutator) {
  const value = JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
  mutator(value);
  return tempFile("workspace-package.json", `${JSON.stringify(value, null, 2)}\n`);
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

test("Docker supervisor fixture rejects weakened cleanup and success bindings", () => {
  const supervisorFixturePath = mutatedJson(
    "fixtures/contracts/phase11-docker-local-supervisor-v1.json",
    (fixture) => {
      fixture.launch_boundary.automatic_container_remove = true;
      fixture.launch_boundary.cleanup_retry = true;
      fixture.launch_boundary.daemon_identity = "initial_observation_only";
      fixture.launch_boundary.daemon_identity_authority = "self_approved";
      fixture.success_boundary.verified_cleanup_required = false;
      fixture.post_spawn_fail_closed.pop();
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    supervisorFixturePath,
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /exact cleanup launch boundary required/u);
  assert.match(errors, /cleanup-gated success required/u);
  assert.match(errors, /fail-closed cases mismatch/u);
});

test("Docker supervisor fixture rejects nested shape and closed-boundary drift", () => {
  const supervisorFixturePath = mutatedJson(
    "fixtures/contracts/phase11-docker-local-supervisor-v1.json",
    (fixture) => {
      fixture.contract_id = "lnsat.drifted_supervisor_result.v1";
      fixture.profile_requirement.unreviewed_binding = true;
      fixture.launch_boundary.unbounded_cleanup = true;
      fixture.success_boundary.receipt_persisted = true;
      fixture.error_codes.pop();
      fixture.hard_stops.pop();
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    supervisorFixturePath,
  });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /identity or status mismatch/u);
  assert.match(errors, /profile_requirement: keys or key order mismatch/u);
  assert.match(errors, /launch_boundary: keys or key order mismatch/u);
  assert.match(errors, /cleanup-gated success required/u);
  assert.match(errors, /error codes mismatch/u);
  assert.match(errors, /hard stops mismatch/u);
});

test("Docker supervisor fixture rejects duplicate JSON before decoding", () => {
  const canonical = readFileSync(
    resolve(root, "fixtures/contracts/phase11-docker-local-supervisor-v1.json"),
    "utf8",
  );
  const supervisorFixturePath = tempFile(
    "duplicate-supervisor.json",
    canonical.replace(
      '  "fixture_id":',
      '  "fixture_id": "duplicate",\n  "fixture_id":',
    ),
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    supervisorFixturePath,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /duplicate JSON member/u);
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

test("workspace build, prebuild, and test scripts are frozen in the source-gate graph", () => {
  for (const [name, mutator] of [
    ["build", (scripts) => (scripts.build += ' && D=d; "${D}ocker" run forbidden')],
    ["prebuild", (scripts) => (scripts.prebuild = 'D=d; "${D}ocker" run forbidden')],
    ["test", (scripts) => (scripts.test += ' && D=d; "${D}ocker" run forbidden')],
  ]) {
    const workspacePackagePath = mutatedWorkspacePackage(
      "apps/api/package.json",
      (packageJson) => mutator(packageJson.scripts),
    );
    const result = validatePhase11DockerProofReadiness({
      root,
      workspaceManifestPathOverrides: {
        "apps/api/package.json": workspacePackagePath,
      },
    });
    assert.equal(result.ok, false, name);
    assert.match(
      result.errors.join("\n"),
      /exact topology and source-gate graph digest mismatch/u,
    );
  }
});

test("workspace constructed commands fail by frozen graph digest", () => {
  const workspacePackagePath = mutatedWorkspacePackage(
    "apps/api/package.json",
    (packageJson) => {
      packageJson.scripts.build += ' && D=d; "${D}ocker" run forbidden';
    },
  );
  const result = validatePhase11DockerProofReadiness({
    root,
    workspaceManifestPathOverrides: {
      "apps/api/package.json": workspacePackagePath,
    },
  });
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /exact topology and source-gate graph digest mismatch/u,
  );
});

test("workspace script additions, missing manifests, and root workspace drift fail closed", () => {
  const addedScriptPath = mutatedWorkspacePackage(
    "apps/api/package.json",
    (packageJson) => {
      packageJson.scripts.prebuild = "echo unexpected";
    },
  );
  const addedScript = validatePhase11DockerProofReadiness({
    root,
    workspaceManifestPathOverrides: {
      "apps/api/package.json": addedScriptPath,
    },
  });
  assert.equal(addedScript.ok, false);
  assert.match(
    addedScript.errors.join("\n"),
    /exact topology and source-gate graph digest mismatch/u,
  );

  const missingManifest = validatePhase11DockerProofReadiness({
    root,
    workspaceManifestPathOverrides: {
      "apps/api/package.json": resolve(root, "apps/api/missing-package.json"),
    },
  });
  assert.equal(missingManifest.ok, false);
  assert.match(
    missingManifest.errors.join("\n"),
    /workspace manifest apps\/api\/package\.json: unreadable/u,
  );

  const packagePath = mutatedJson("package.json", (packageJson) => {
    packageJson.workspaces = ["apps/*"];
  });
  const workspaceDrift = validatePhase11DockerProofReadiness({ root, packagePath });
  assert.equal(workspaceDrift.ok, false);
  assert.match(workspaceDrift.errors.join("\n"), /exact workspace topology mismatch/u);
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
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\\\."),
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
        `forbidden side-effect marker ${forbidden}`.replaceAll(".", "\\\\."),
        "u",
      ),
    );
  }
});

test("Docker supervisor rejects automatic removal before bound inspection", () => {
  const supervisorPath = mutatedSupervisor((source) =>
    source.replace(
      '        "--pull=never".into(),',
      '        "--pull=never".into(),\n        "--rm".into(),',
    ),
  );
  const result = validatePhase11DockerProofReadiness({ root, supervisorPath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /automatic --rm cleanup remains forbidden/u);
});

test("Docker supervisor cannot drop exact cleanup label bindings", () => {
  for (const label of [
    "io.lnsat.phase11.operation-id",
    "io.lnsat.phase11.launch-contract-digest",
  ]) {
    const supervisorPath = mutatedSupervisor((source) =>
      source.replace(label, `invalid.${label}`),
    );
    const result = validatePhase11DockerProofReadiness({ root, supervisorPath });
    assert.equal(result.ok, false, label);
    assert.match(result.errors.join("\n"), /missing cleanup-binding marker/u);
  }
});

test("Docker supervisor cannot remove before exact inspection", () => {
  const supervisorPath = mutatedSupervisor((source) =>
    source.replace('            "inspect",', '            "inspect-disabled",'),
  );
  const result = validatePhase11DockerProofReadiness({ root, supervisorPath });
  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /missing cleanup-binding marker/u);
  assert.match(errors, /inspect must precede bounded removal/u);
});

test("Docker supervisor source digest rejects marker-preserving cleanup spoof", () => {
  const supervisorPath = mutatedSupervisor((source) => {
    const mutated = source.replace(
      '["rm", "--force", "--volumes", "--", container_id.as_str()]',
      '["not-rm", "--force", "--volumes", "--", container_id.as_str()]',
    );
    assert.notEqual(mutated, source, "live removal argv must be mutated");
    return `${mutated}\n// marker-preserving spoof: "rm",\n`;
  });
  const result = validatePhase11DockerProofReadiness({ root, supervisorPath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /exact reviewed source digest mismatch/u);
});

test("Docker supervisor cannot bypass cleanup after validated output", () => {
  const supervisorPath = mutatedSupervisor((source) =>
    source.replace(
      "let cleanup_result = remove_bound_container_v1(&cleanup);",
      "let cleanup_result = Ok(());",
    ),
  );
  const result = validatePhase11DockerProofReadiness({ root, supervisorPath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /validated output must remain cleanup-gated/u);
});

test("Docker supervisor retains fail-closed unknown outcome", () => {
  const supervisorPath = mutatedSupervisor((source) =>
    source.replaceAll(
      "DockerLocalSupervisorErrorV1::OutcomeUnknown",
      "DockerLocalSupervisorErrorV1::InputInvalid",
    ),
  );
  const result = validatePhase11DockerProofReadiness({ root, supervisorPath });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /missing cleanup-binding marker/u);
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
