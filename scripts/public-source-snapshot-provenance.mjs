import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

export const PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH =
  "docs/reference/public-source-snapshot.json";
export const PUBLIC_SOURCE_ROOT_SUBJECT = "chore: publish initial LNSAT source";
export const PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS = Object.freeze([
  PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH,
  "docs/reference/phase7-readiness.json",
  "docs/reference/security-reviews/P7-A1/implementation-review.json",
  "docs/reference/security-reviews/P7-B1/correction-review.json",
  "docs/reference/security-reviews/P7-B1/post-merge-review-0526845.json",
  "docs/reference/security-reviews/P7-C1/implementation-review.json",
  "docs/reference/security-reviews/P7-R1/implementation-review.json",
  "docs/reference/security-reviews/P7-X1/implementation-review.json",
]);

const MARKER_KEYS = [
  "schema_version",
  "history_strategy",
  "source_base_revision",
  "historical_git_evidence",
  "claim_scope",
  "immutable_paths",
  "release_authority",
  "artifact_authority",
  "deployment_authority",
];
const GIT_OID_PATTERN = /^[0-9a-f]{40}$/u;
const PRE_RELEASE_VERSION_PATTERN = /^0\.[0-9]+\.[0-9]+(?:[-+].*)?$/u;
const NULL_DEVICE = process.platform === "win32" ? "NUL" : "/dev/null";
const TRUSTED_GIT_CONFIG_ARGS = Object.freeze([
  "--no-pager",
  "--no-optional-locks",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "diff.external=",
  "-c",
  "trace2.normalTarget=0",
  "-c",
  "trace2.perfTarget=0",
  "-c",
  "trace2.eventTarget=0",
]);

function trustedGitSearchPath() {
  if (process.platform !== "win32") return "/usr/bin:/bin";
  const systemRootCandidate = process.env.SystemRoot ?? process.env.SYSTEMROOT;
  const systemRoot = /^[A-Za-z]:\\Windows$/iu.test(systemRootCandidate ?? "")
    ? systemRootCandidate
    : "C:\\Windows";
  return [
    "C:\\Program Files\\Git\\cmd",
    "C:\\Program Files\\Git\\bin",
    `${systemRoot}\\System32`,
    systemRoot,
  ].join(";");
}

export function createIsolatedGitEnvironment() {
  const environment = {
    GIT_ATTR_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: NULL_DEVICE,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: NULL_DEVICE,
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_PAGER: "cat",
    GIT_TERMINAL_PROMPT: "0",
    GIT_TRACE2: "0",
    GIT_TRACE2_EVENT: "0",
    GIT_TRACE2_PERF: "0",
    LANG: "C",
    LC_ALL: "C",
    PATH: trustedGitSearchPath(),
    TZ: "UTC",
  };
  if (process.platform === "win32") {
    const systemRoot = environment.PATH.split(";").at(-1);
    environment.ComSpec = `${systemRoot}\\System32\\cmd.exe`;
    environment.PATHEXT = ".COM;.EXE;.BAT;.CMD";
    environment.SystemRoot = systemRoot;
    environment.TEMP = `${systemRoot}\\Temp`;
    environment.TMP = `${systemRoot}\\Temp`;
    environment.WINDIR = systemRoot;
  } else {
    environment.TMPDIR = "/tmp";
  }
  return environment;
}

export function resolveTrustedGitExecutable() {
  const candidates =
    process.platform === "win32"
      ? ["C:\\Program Files\\Git\\cmd\\git.exe", "C:\\Program Files\\Git\\bin\\git.exe"]
      : ["/usr/bin/git", "/bin/git"];
  const resolvedCandidates = new Set();
  for (const candidate of candidates) {
    try {
      const resolvedCandidate = realpathSync(candidate);
      if (resolvedCandidates.has(resolvedCandidate)) continue;
      resolvedCandidates.add(resolvedCandidate);
      if (!statSync(resolvedCandidate).isFile()) continue;
      accessSync(resolvedCandidate, fsConstants.X_OK);
      return resolvedCandidate;
    } catch {
      // Try the next fixed, absolute candidate.
    }
  }
  throw new Error("trusted Git executable unavailable");
}

export function runIsolatedGit(
  root,
  args,
  { encoding = "utf8", input, maxBuffer = 16 * 1024 * 1024 } = {},
) {
  let gitExecutable;
  try {
    gitExecutable = resolveTrustedGitExecutable();
  } catch (error) {
    const emptyOutput = encoding === null ? Buffer.alloc(0) : "";
    return {
      ok: false,
      status: null,
      stdout: emptyOutput,
      stderr: emptyOutput,
      error,
    };
  }
  const result = spawnSync(gitExecutable, [...TRUSTED_GIT_CONFIG_ARGS, ...args], {
    cwd: root,
    encoding,
    env: createIsolatedGitEnvironment(),
    input,
    maxBuffer,
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? (encoding === null ? Buffer.alloc(0) : ""),
    stderr: result.stderr ?? (encoding === null ? Buffer.alloc(0) : ""),
    error: result.error,
  };
}

const runGit = runIsolatedGit;

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function runLegacyInventory(mode) {
  if (!new Set(["--check", "--summary", "--write"]).has(mode)) {
    process.stderr.write("Legacy inventory wrapper: invalid mode.\n");
    process.exitCode = 2;
    return;
  }
  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const inventoryScript = resolve(
    repositoryRoot,
    "scripts/inventory-legacy-identifiers.mjs",
  );
  const result = spawnSync(process.execPath, [inventoryScript, mode], {
    cwd: repositoryRoot,
    env: createIsolatedGitEnvironment(),
    stdio: "inherit",
  });
  if (result.error || result.status === null) {
    process.stderr.write("Legacy inventory wrapper: unable to run validator.\n");
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status;
}

if (isDirectExecution() && process.argv[2] === "--legacy-inventory") {
  runLegacyInventory(process.argv[3]);
}

function addError(condition, message, errors) {
  if (!condition) errors.push(`public_source_snapshot: ${message}`);
  return condition;
}

function isSafeRepositoryPath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    posix.normalize(value) !== value
  ) {
    return false;
  }
  const segments = value.split("/");
  return (
    segments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    ) && segments[0] !== ".git"
  );
}

function readBytes(path, label, errors) {
  try {
    return readFileSync(path);
  } catch {
    errors.push(`public_source_snapshot: unable to read ${label}`);
    return null;
  }
}

function parseJsonBytes(bytes, label, errors) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    errors.push(`public_source_snapshot: unable to parse ${label}`);
    return null;
  }
}

function exactKeys(value, expected) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
  );
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function repositoryPathsAtRevision(gitRoot, revision, errors) {
  const result = runGit(gitRoot, ["ls-tree", "-r", "--name-only", "-z", revision], {
    encoding: null,
  });
  if (
    !addError(result.ok, `unable to enumerate repository paths at ${revision}`, errors)
  ) {
    return [];
  }
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function validatePackageManifest(manifest, label, errors, { root = false } = {}) {
  addError(
    typeof manifest === "object" && manifest !== null && !Array.isArray(manifest),
    `${label} must be an object`,
    errors,
  );
  addError(
    manifest?.private === true,
    `${label} must remain private/unpublished`,
    errors,
  );
  addError(
    !Object.hasOwn(manifest ?? {}, "publishConfig"),
    `${label} must not define publishConfig`,
    errors,
  );
  if (root) {
    addError(
      typeof manifest?.version === "string" &&
        PRE_RELEASE_VERSION_PATTERN.test(manifest.version),
      `${label} is forbidden at version 1.0.0 or later`,
      errors,
    );
  }
}

function cargoPackagePublishIsDisabled(text) {
  let manifest;
  try {
    manifest = parseToml(text);
  } catch {
    return { packageManifest: true, valid: false };
  }
  if (!Object.hasOwn(manifest, "package")) {
    return { packageManifest: false, valid: true };
  }
  return {
    packageManifest: true,
    valid:
      typeof manifest.package === "object" &&
      manifest.package !== null &&
      !Array.isArray(manifest.package) &&
      manifest.package.publish === false,
  };
}

function validatePublicationStateAtRevision(gitRoot, revision, errors) {
  const repositoryPaths = repositoryPathsAtRevision(gitRoot, revision, errors);
  const packagePaths = repositoryPaths.filter(
    (path) => path === "package.json" || path.endsWith("/package.json"),
  );
  addError(
    packagePaths.includes("package.json"),
    `root package.json missing at ${revision}`,
    errors,
  );
  for (const path of packagePaths) {
    if (!addError(isSafeRepositoryPath(path), `unsafe package path ${path}`, errors)) {
      continue;
    }
    const blob = runGit(gitRoot, ["cat-file", "blob", `${revision}:${path}`], {
      encoding: null,
    });
    if (!addError(blob.ok, `package blob missing at ${revision}: ${path}`, errors)) {
      continue;
    }
    const label = `${path} at ${revision}`;
    const manifest = parseJsonBytes(blob.stdout, label, errors);
    validatePackageManifest(manifest, label, errors, { root: path === "package.json" });
  }

  const cargoManifestPaths = repositoryPaths.filter(
    (path) => path === "Cargo.toml" || path.endsWith("/Cargo.toml"),
  );
  for (const path of cargoManifestPaths) {
    const blob = runGit(gitRoot, ["cat-file", "blob", `${revision}:${path}`], {
      encoding: null,
    });
    if (!addError(blob.ok, `crate manifest missing at ${revision}: ${path}`, errors)) {
      continue;
    }
    const publication = cargoPackagePublishIsDisabled(blob.stdout.toString("utf8"));
    if (publication.packageManifest) {
      addError(
        publication.valid,
        `${path} at ${revision} [package].publish must equal false`,
        errors,
      );
    }
  }
  return { cargoManifestPaths, packagePaths };
}

function validatePublicationStateInWorktree(
  root,
  packagePaths,
  cargoManifestPaths,
  errors,
) {
  for (const path of packagePaths) {
    const bytes = readBytes(
      resolve(root, path),
      `working-tree package ${path}`,
      errors,
    );
    if (!bytes) continue;
    const label = `working-tree ${path}`;
    const manifest = parseJsonBytes(bytes, label, errors);
    validatePackageManifest(manifest, label, errors, { root: path === "package.json" });
  }
  for (const path of cargoManifestPaths) {
    const bytes = readBytes(
      resolve(root, path),
      `working-tree crate manifest ${path}`,
      errors,
    );
    if (!bytes) continue;
    const publication = cargoPackagePublishIsDisabled(bytes.toString("utf8"));
    if (publication.packageManifest) {
      addError(
        publication.valid,
        `working-tree ${path} [package].publish must equal false`,
        errors,
      );
    }
  }
}

export function validatePublicSourceSnapshotProvenance({
  root,
  gitRoot = root,
  immutablePaths = PUBLIC_SOURCE_SNAPSHOT_IMMUTABLE_PATHS,
}) {
  const errors = [];
  const absoluteRoot = resolve(root);
  const absoluteGitRoot = resolve(gitRoot);
  const sourceMarkerExists = existsSync(
    resolve(absoluteRoot, PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH),
  );
  const gitTopLevelResult = runGit(absoluteGitRoot, ["rev-parse", "--show-toplevel"]);
  if (
    sourceMarkerExists &&
    (!gitTopLevelResult.ok ||
      canonicalPath(gitTopLevelResult.stdout.trim()) !== canonicalPath(absoluteRoot))
  ) {
    return {
      active: true,
      ok: false,
      errors: [
        "public_source_snapshot: source and Git roots must match when marker is present",
      ],
      rootRevision: null,
    };
  }

  const rootsResult = runGit(absoluteGitRoot, [
    "rev-list",
    "--max-parents=0",
    "--all",
    "HEAD",
  ]);
  if (!rootsResult.ok) {
    return sourceMarkerExists
      ? {
          active: true,
          ok: false,
          errors: ["public_source_snapshot: unable to enumerate repository roots"],
          rootRevision: null,
        }
      : { active: false, ok: true, errors: [], rootRevision: null };
  }
  const roots = rootsResult.stdout.trim().split(/\s+/u).filter(Boolean);

  const rootSignals = roots.map((revision) => {
    const subject = runGit(absoluteGitRoot, ["show", "-s", "--format=%s", revision]);
    const marker = runGit(absoluteGitRoot, [
      "cat-file",
      "-e",
      `${revision}:${PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH}`,
    ]);
    return {
      markerExists: marker.ok,
      revision,
      subject: subject.ok ? subject.stdout.trim() : null,
    };
  });
  const markerRevisionsResult = runGit(absoluteGitRoot, ["rev-list", "--all", "HEAD"]);
  if (!markerRevisionsResult.ok) {
    return {
      active: sourceMarkerExists,
      ok: false,
      errors: ["public_source_snapshot: unable to inspect marker across all refs"],
      rootRevision: null,
    };
  }
  const markerRevisions = markerRevisionsResult.stdout
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const markerHistory = runGit(
    absoluteGitRoot,
    ["cat-file", "--batch-check=%(objecttype)"],
    {
      input: `${markerRevisions
        .map((revision) => `${revision}:${PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH}`)
        .join("\n")}\n`,
    },
  );
  if (!markerHistory.ok) {
    return {
      active: sourceMarkerExists,
      ok: false,
      errors: ["public_source_snapshot: unable to inspect marker across all refs"],
      rootRevision: null,
    };
  }
  const historyMarkerExists = markerHistory.stdout
    .trim()
    .split("\n")
    .some((line) => line === "blob");
  const snapshotIntent =
    sourceMarkerExists ||
    historyMarkerExists ||
    rootSignals.some(
      (signal) => signal.markerExists || signal.subject === PUBLIC_SOURCE_ROOT_SUBJECT,
    );
  if (!snapshotIntent) {
    return { active: false, ok: true, errors: [], rootRevision: null };
  }

  if (
    !addError(
      roots.length === 1,
      "history must contain exactly one root commit",
      errors,
    )
  ) {
    return { active: true, ok: false, errors, rootRevision: null };
  }

  const rootRevision = roots[0];
  const [rootSignal] = rootSignals;
  addError(
    rootSignal.subject === PUBLIC_SOURCE_ROOT_SUBJECT,
    `root subject must equal ${PUBLIC_SOURCE_ROOT_SUBJECT}`,
    errors,
  );

  const shallowResult = runGit(absoluteGitRoot, [
    "rev-parse",
    "--is-shallow-repository",
  ]);
  addError(
    shallowResult.ok && shallowResult.stdout.trim() === "false",
    "checkout must be non-shallow",
    errors,
  );
  addError(
    runGit(absoluteGitRoot, ["merge-base", "--is-ancestor", rootRevision, "HEAD"]).ok,
    "root commit must be an ancestor of HEAD",
    errors,
  );

  const replaceRefsResult = runGit(absoluteGitRoot, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace",
  ]);
  addError(
    replaceRefsResult.ok && replaceRefsResult.stdout.trim() === "",
    "replacement refs are forbidden",
    errors,
  );
  for (const [gitPath, label] of [
    ["info/grafts", "grafts file"],
    ["objects/info/alternates", "object alternates file"],
  ]) {
    const pathResult = runGit(absoluteGitRoot, ["rev-parse", "--git-path", gitPath]);
    addError(
      pathResult.ok && !existsSync(resolve(absoluteGitRoot, pathResult.stdout.trim())),
      `${label} is forbidden`,
      errors,
    );
  }

  const tagsResult = runGit(absoluteGitRoot, ["tag", "--list"]);
  addError(
    tagsResult.ok && tagsResult.stdout.trim() === "",
    "snapshot mode forbids tags",
    errors,
  );

  const requestedPaths = Array.isArray(immutablePaths) ? immutablePaths : [];
  addError(
    Array.isArray(immutablePaths),
    "immutable path list must be an array",
    errors,
  );
  const paths = [...new Set([PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH, ...requestedPaths])];
  for (const path of paths) {
    addError(isSafeRepositoryPath(path), `unsafe immutable path ${path}`, errors);
  }

  const rootMarkerBlob = runGit(
    absoluteGitRoot,
    ["cat-file", "blob", `${rootRevision}:${PUBLIC_SOURCE_SNAPSHOT_MARKER_PATH}`],
    { encoding: null },
  );
  addError(rootMarkerBlob.ok, "marker is required in exact public root", errors);
  const marker = rootMarkerBlob.ok
    ? parseJsonBytes(rootMarkerBlob.stdout, "root marker", errors)
    : null;
  addError(exactKeys(marker, MARKER_KEYS), "marker keys must be exact", errors);
  if (marker) {
    addError(
      marker.schema_version === "lnsat.public_source_snapshot.v1",
      "marker schema_version is invalid",
      errors,
    );
    addError(
      marker.history_strategy === "fresh_root",
      "marker history_strategy must be fresh_root",
      errors,
    );
    addError(
      typeof marker.source_base_revision === "string" &&
        GIT_OID_PATTERN.test(marker.source_base_revision),
      "marker source_base_revision must be a Git OID",
      errors,
    );
    addError(
      marker.historical_git_evidence === "retained_private_not_locally_replayable",
      "marker historical_git_evidence is invalid",
      errors,
    );
    addError(
      marker.claim_scope === "pre_release_source_only",
      "marker claim_scope must remain pre_release_source_only",
      errors,
    );
    addError(
      Array.isArray(marker.immutable_paths) &&
        arraysEqual(marker.immutable_paths, paths),
      "marker immutable_paths must exactly match validator-owned paths",
      errors,
    );
    for (const field of [
      "release_authority",
      "artifact_authority",
      "deployment_authority",
    ]) {
      addError(marker[field] === false, `marker ${field} must be false`, errors);
    }
  }

  const revisionsResult = runGit(absoluteGitRoot, [
    "rev-list",
    "--all",
    "HEAD",
    "--not",
    rootRevision,
  ]);
  addError(revisionsResult.ok, "unable to enumerate every descendant commit", errors);
  const descendantRevisions = revisionsResult.ok
    ? revisionsResult.stdout.trim().split(/\s+/u).filter(Boolean)
    : [];

  const allRevisions = [rootRevision, ...descendantRevisions];
  const headRevisionResult = runGit(absoluteGitRoot, ["rev-parse", "HEAD"]);
  addError(headRevisionResult.ok, "unable to resolve HEAD", errors);
  const headRevision = headRevisionResult.stdout.trim();
  let headPublicationPaths = null;
  for (const revision of allRevisions) {
    const publicationPaths = validatePublicationStateAtRevision(
      absoluteGitRoot,
      revision,
      errors,
    );
    if (revision === headRevision) {
      headPublicationPaths = publicationPaths;
    }
  }
  if (headPublicationPaths) {
    validatePublicationStateInWorktree(
      absoluteRoot,
      headPublicationPaths.packagePaths,
      headPublicationPaths.cargoManifestPaths,
      errors,
    );
  } else {
    errors.push("public_source_snapshot: unable to inspect HEAD publication state");
  }

  for (const path of paths) {
    if (!isSafeRepositoryPath(path)) {
      continue;
    }
    const currentPath = resolve(absoluteRoot, path);
    if (!addError(existsSync(currentPath), `immutable path missing: ${path}`, errors)) {
      continue;
    }
    const rootBlob = runGit(
      absoluteGitRoot,
      ["cat-file", "blob", `${rootRevision}:${path}`],
      { encoding: null },
    );
    if (!addError(rootBlob.ok, `root blob missing: ${path}`, errors)) {
      continue;
    }
    const currentBytes = readBytes(currentPath, `immutable path ${path}`, errors);
    if (currentBytes) {
      addError(
        currentBytes.equals(rootBlob.stdout),
        `current bytes differ from root: ${path}`,
        errors,
      );
    }
    for (const revision of descendantRevisions) {
      const descendantBlob = runGit(
        absoluteGitRoot,
        ["cat-file", "blob", `${revision}:${path}`],
        { encoding: null },
      );
      if (
        !addError(
          descendantBlob.ok,
          `immutable path missing at descendant ${revision}: ${path}`,
          errors,
        )
      ) {
        continue;
      }
      addError(
        descendantBlob.stdout.equals(rootBlob.stdout),
        `immutable path changed at descendant ${revision}: ${path}`,
        errors,
      );
    }
  }

  return {
    active: true,
    ok: errors.length === 0,
    errors,
    rootRevision,
  };
}
