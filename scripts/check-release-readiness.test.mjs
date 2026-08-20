import assert from "node:assert/strict";
import test from "node:test";

import {
  validateDeclaredManifestInventory,
  validateReleaseScriptChain,
} from "./check-release-readiness.mjs";

const canonicalScripts = {
  "security:review:supported-release-check":
    "node scripts/check-security-review-evidence.mjs --supported-release",
  "release:check":
    "npm run security:review:supported-release-check && npm run source:check",
};

test("accepts exact fail-closed release script chain", () => {
  assert.deepEqual(validateReleaseScriptChain(canonicalScripts), []);
});

test("rejects strict supported-release alias bypass", () => {
  const errors = validateReleaseScriptChain({
    ...canonicalScripts,
    "security:review:supported-release-check": "true",
  });
  assert.match(errors.join("\n"), /must invoke exact strict validator/u);
});

test("rejects release wrapper bypass", () => {
  const errors = validateReleaseScriptChain({
    ...canonicalScripts,
    "release:check": "npm run source:check",
  });
  assert.match(errors.join("\n"), /must fail closed/u);
});

const canonicalInventory = {
  cargoManifestPaths: ["crates/lnsat-auth/Cargo.toml", "crates/lnsatd/Cargo.toml"],
  declaredCargoMemberPaths: ["crates/lnsat-auth", "crates/lnsatd"],
  declaredNpmWorkspacePaths: ["apps/api", "packages/core"],
  npmManifestPaths: [
    "package.json",
    "apps/api/package.json",
    "packages/core/package.json",
  ],
};

test("accepts exact declared package inventory", () => {
  assert.deepEqual(validateDeclaredManifestInventory(canonicalInventory), []);
});

test("rejects undeclared npm package manifest", () => {
  const errors = validateDeclaredManifestInventory({
    ...canonicalInventory,
    npmManifestPaths: [
      ...canonicalInventory.npmManifestPaths,
      "tools/publishable/package.json",
    ],
  });
  assert.match(errors.join("\n"), /npm workspace declarations must exactly match/u);
});

test("rejects undeclared Cargo package manifest", () => {
  const errors = validateDeclaredManifestInventory({
    ...canonicalInventory,
    cargoManifestPaths: [
      ...canonicalInventory.cargoManifestPaths,
      "tools/publishable/Cargo.toml",
    ],
  });
  assert.match(errors.join("\n"), /Cargo workspace members must exactly match/u);
});
