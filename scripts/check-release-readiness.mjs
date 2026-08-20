import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

import { createIsolatedGitEnvironment } from "./public-source-snapshot-provenance.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (path) => readFileSync(resolve(root, path), "utf8");
const readJson = (path) => JSON.parse(readText(path));
const errors = [];
const SUPPORTED_RELEASE_CHECK_COMMAND =
  "node scripts/check-security-review-evidence.mjs --supported-release";
const RELEASE_CHECK_COMMAND =
  "npm run security:review:supported-release-check && npm run source:check";

export function validateReleaseScriptChain(scripts) {
  const scriptErrors = [];
  if (
    scripts?.["security:review:supported-release-check"] !==
    SUPPORTED_RELEASE_CHECK_COMMAND
  ) {
    scriptErrors.push(
      "security:review:supported-release-check must invoke exact strict validator",
    );
  }
  if (scripts?.["release:check"] !== RELEASE_CHECK_COMMAND) {
    scriptErrors.push(
      "release:check must fail closed through supported-release evidence",
    );
  }
  return scriptErrors;
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

export function validateDeclaredManifestInventory({
  cargoManifestPaths,
  declaredCargoMemberPaths,
  declaredNpmWorkspacePaths,
  npmManifestPaths,
}) {
  const inventoryErrors = [];
  const expectedNpm = sortedUnique(declaredNpmWorkspacePaths);
  const actualNpm = sortedUnique(
    npmManifestPaths
      .filter((path) => path !== "package.json")
      .map((path) => posix.dirname(path)),
  );
  if (JSON.stringify(actualNpm) !== JSON.stringify(expectedNpm)) {
    inventoryErrors.push(
      "npm workspace declarations must exactly match tracked package manifests",
    );
  }
  const expectedCargo = sortedUnique(declaredCargoMemberPaths);
  const actualCargo = sortedUnique(
    cargoManifestPaths
      .filter((path) => path !== "Cargo.toml")
      .map((path) => posix.dirname(path)),
  );
  if (JSON.stringify(actualCargo) !== JSON.stringify(expectedCargo)) {
    inventoryErrors.push(
      "Cargo workspace members must exactly match tracked package manifests",
    );
  }
  return inventoryErrors;
}

function trackedRepositoryPaths() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: null,
    env: createIsolatedGitEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    errors.push("unable to enumerate tracked release manifests");
    return [];
  }
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function workspacePatternMatches(pattern, directory) {
  const segments = pattern.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        (segment !== "*" && !/^[A-Za-z0-9._-]+$/u.test(segment)),
    )
  ) {
    return false;
  }
  const directorySegments = directory.split("/");
  return (
    directorySegments.length === segments.length &&
    segments.every(
      (segment, index) => segment === "*" || segment === directorySegments[index],
    )
  );
}

const requiredPaths = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "LICENSE",
  "MAINTAINERS.md",
  "NOTICE",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "docs/RELEASING.md",
];
for (const path of requiredPaths) {
  if (!existsSync(resolve(root, path))) errors.push(`missing release path: ${path}`);
}

const repositoryUrl = "git+https://github.com/hypler-dev/LNSAT.git";
const rootManifest = readJson("package.json");
if (rootManifest.private !== true) errors.push("root package must remain private");
if (rootManifest.license !== "Apache-2.0")
  errors.push("root license must be Apache-2.0");
if (rootManifest.packageManager !== "npm@10.9.8")
  errors.push("packageManager must pin npm@10.9.8");
if (rootManifest.repository?.url !== repositoryUrl)
  errors.push("root repository metadata is missing or incorrect");
if (!rootManifest.description) errors.push("root package description is required");

const trackedPaths = trackedRepositoryPaths();
const npmManifestPaths = trackedPaths.filter(
  (path) => path === "package.json" || path.endsWith("/package.json"),
);
const cargoManifestPaths = trackedPaths.filter(
  (path) => path === "Cargo.toml" || path.endsWith("/Cargo.toml"),
);
const workspacePatterns = Array.isArray(rootManifest.workspaces)
  ? rootManifest.workspaces
  : [];
if (!Array.isArray(rootManifest.workspaces)) {
  errors.push("root workspaces must be an array");
}
const npmManifestDirectories = npmManifestPaths
  .filter((path) => path !== "package.json")
  .map((path) => posix.dirname(path));
const workspaces = sortedUnique(
  npmManifestDirectories.filter((directory) =>
    workspacePatterns.some((pattern) => workspacePatternMatches(pattern, directory)),
  ),
);
for (const pattern of workspacePatterns) {
  if (
    !npmManifestDirectories.some((directory) =>
      workspacePatternMatches(pattern, directory),
    )
  ) {
    errors.push(`workspace pattern has no tracked package: ${pattern}`);
  }
}
for (const workspace of workspaces) {
  const manifest = readJson(`${workspace}/package.json`);
  if (manifest.version !== rootManifest.version)
    errors.push(`version mismatch: ${workspace}`);
  if (manifest.private !== true)
    errors.push(`workspace must remain private: ${workspace}`);
  if (manifest.license !== "Apache-2.0")
    errors.push(`workspace license must be Apache-2.0: ${workspace}`);
  if (!manifest.description)
    errors.push(`workspace description is required: ${workspace}`);
  if (
    manifest.repository?.url !== repositoryUrl ||
    manifest.repository?.directory !== workspace
  )
    errors.push(`workspace repository metadata is incorrect: ${workspace}`);
}
for (const manifestPath of npmManifestPaths) {
  const manifest = readJson(manifestPath);
  if (manifest.private !== true)
    errors.push(`npm package must remain private: ${manifestPath}`);
  if (Object.hasOwn(manifest, "publishConfig"))
    errors.push(`npm package must not define publishConfig: ${manifestPath}`);
}

const cargoWorkspace = parseToml(readText("Cargo.toml"));
const rustToolchain = readText("rust-toolchain.toml");
const rustCrates = Array.isArray(cargoWorkspace.workspace?.members)
  ? cargoWorkspace.workspace.members
  : [];
if (!Array.isArray(cargoWorkspace.workspace?.members)) {
  errors.push("Cargo workspace members must be an array");
}
const cargoPackageManifestPaths = [];
for (const manifestPath of cargoManifestPaths) {
  let manifest;
  try {
    manifest = parseToml(readText(manifestPath));
  } catch {
    errors.push(`unable to parse Cargo manifest: ${manifestPath}`);
    continue;
  }
  if (!Object.hasOwn(manifest, "package")) continue;
  cargoPackageManifestPaths.push(manifestPath);
  if (manifest.package?.publish !== false)
    errors.push(`Rust crate must remain unpublished: ${manifestPath}`);
  if (manifest.package?.repository?.workspace !== true)
    errors.push(`Rust crate repository metadata is missing: ${manifestPath}`);
}
errors.push(
  ...validateDeclaredManifestInventory({
    cargoManifestPaths: cargoPackageManifestPaths,
    declaredCargoMemberPaths: rustCrates,
    declaredNpmWorkspacePaths: workspaces,
    npmManifestPaths,
  }),
);
const cargoVersion = cargoWorkspace.workspace?.package?.version;
const rustVersion = cargoWorkspace.workspace?.package?.["rust-version"];
const toolchainVersion = rustToolchain.match(/^channel = "([^"]+)"$/mu)?.[1];
if (cargoVersion !== rootManifest.version) errors.push("Cargo/npm version mismatch");
if (rustVersion !== toolchainVersion) errors.push("Rust MSRV/toolchain mismatch");

const changelog = readText("CHANGELOG.md");
if (!/^## Unreleased$/mu.test(changelog))
  errors.push("CHANGELOG needs Unreleased section");
const workflow = readText(".github/workflows/ci.yml");
if (!workflow.includes("npm run source:check")) errors.push("CI must run source:check");
if (!workflow.includes("rustup toolchain install 1.97.1"))
  errors.push("CI must install exact Rust toolchain");
errors.push(...validateReleaseScriptChain(rootManifest.scripts));

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  if (errors.length > 0) {
    console.error(`Release readiness failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `Release metadata passed: ${workspaces.length} private workspaces, ${rustCrates.length} unpublished Rust crates, version ${rootManifest.version}, Rust ${rustVersion}.`,
  );
}
