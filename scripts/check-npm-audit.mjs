import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  cpSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  opendirSync,
  readSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { evaluateNpmAudit, evaluateNpmSignatures } from "./npm-audit-rules.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
export const MAX_AUDIT_JSON_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIT_JSON_DEPTH = 64;
export const NPM_AUDIT_TIMEOUT_MS = 120_000;
export const MAX_AUDIT_SNAPSHOT_BYTES = 768 * 1024 * 1024;
export const MAX_AUDIT_SNAPSHOT_FILE_BYTES = 128 * 1024 * 1024;
export const MAX_AUDIT_SNAPSHOT_ENTRIES = 50_000;
export const MAX_AUDIT_SNAPSHOT_MS = 60_000;
export const NPM_AUDIT_KILL_SIGNAL = "SIGKILL";
export const NPM_AUDIT_REGISTRY = "https://registry.npmjs.org/";
export const NPM_AUDIT_PROJECT_CONFIG = [
  `registry=${NPM_AUDIT_REGISTRY}`,
  "strict-ssl=true",
  "package-lock=true",
  "ignore-scripts=true",
  "strict-peer-deps=true",
  "engine-strict=true",
  "save-exact=true",
  "",
].join("\n");
export const NPM_AUDIT_PROJECT_CONFIG_SHA256 =
  "4f0bbf2110193fbdd3366c4358487d044be244bb1984c9cd17bdaa0d636accee";

const INHERITED_AUDIT_ENVIRONMENT_KEYS = [
  "CI",
  "COMSPEC",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "PATHEXT",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "WINDIR",
];

export function runNpmAuditCheckV1(
  signatureMode,
  spawn = spawnSync,
  runtime = undefined,
) {
  const invocation = resolveTrustedNpmInvocationV1(runtime);
  if (!invocation.ok) return failed("Trusted npm CLI path is unavailable.");

  const projectConfig = resolveTrustedNpmProjectConfigV1(runtime);
  if (!projectConfig.ok) return failed("Trusted npm project config is unavailable.");

  let snapshot;
  try {
    snapshot = (runtime?.createSnapshot ?? createNpmAuditSnapshotV1)(
      projectConfig,
      runtime,
    );
  } catch {
    return failed("Private npm audit snapshot is unavailable.");
  }
  if (!snapshot?.ok) return failed("Private npm audit snapshot is unavailable.");

  let outcome;
  try {
    outcome = runNpmAuditInSnapshotV1(
      signatureMode,
      spawn,
      runtime,
      invocation,
      snapshot,
    );
  } catch {
    outcome = failed("npm audit process could not be started.");
  }
  try {
    snapshot.cleanup();
  } catch {
    return failed("Private npm audit snapshot could not be removed.");
  }
  return outcome;
}

function runNpmAuditInSnapshotV1(signatureMode, spawn, runtime, invocation, snapshot) {
  if (snapshot.validate && !snapshot.validate()) {
    return failed("Private npm audit snapshot is unavailable.");
  }
  const auditEnvironment = createNpmAuditEnvironmentV1(invocation, {
    ...runtime,
    projectConfigPath: snapshot.projectConfigPath,
    cachePath: snapshot.cachePath,
    workingDirectory: snapshot.repositoryRoot,
  });
  if (!auditEnvironment.ok) return failed("Trusted npm environment is unavailable.");

  const auditArgs = signatureMode
    ? ["audit", "signatures", ...auditEnvironment.arguments]
    : ["audit", ...auditEnvironment.arguments];
  const result = spawn(
    invocation.nodeExecutable,
    [invocation.npmCliPath, ...auditArgs],
    {
      cwd: snapshot.repositoryRoot,
      encoding: "buffer",
      env: auditEnvironment.environment,
      killSignal: NPM_AUDIT_KILL_SIGNAL,
      maxBuffer: MAX_AUDIT_JSON_BYTES,
      shell: false,
      timeout: NPM_AUDIT_TIMEOUT_MS,
    },
  );

  const processFailure = processFailureMessage(result);
  if (processFailure) return failed(processFailure);

  const parsed = parseNpmAuditJson(result.stdout);
  if (!parsed.ok) return failed(parsed.message);

  const evaluation = signatureMode
    ? evaluateNpmSignatures(parsed.value)
    : evaluateNpmAudit(parsed.value);
  if (!evaluation.ok) return failed(evaluation.errors.join("\n"));
  if (result.status !== 0) return failed("npm audit exited with nonzero status.");

  return {
    ok: true,
    stdout: signatureMode
      ? JSON.stringify({
          ok: true,
          invalid_signatures: 0,
          missing_signatures: 0,
        })
      : JSON.stringify({
          ok: true,
          unexpected_vulnerabilities: 0,
          allowed_advisories: evaluation.allowedAdvisories,
        }),
    stderr: "",
  };
}

export function createNpmAuditEnvironmentV1(
  invocation,
  {
    environment = process.env,
    platform = process.platform,
    projectConfigPath,
    cachePath,
    workingDirectory,
  } = {},
) {
  if (
    !invocation?.ok ||
    typeof invocation.nodeExecutable !== "string" ||
    !isAbsolute(invocation.nodeExecutable) ||
    typeof invocation.npmCliPath !== "string" ||
    !isAbsolute(invocation.npmCliPath) ||
    typeof projectConfigPath !== "string" ||
    !isAbsolute(projectConfigPath) ||
    typeof cachePath !== "string" ||
    !isAbsolute(cachePath) ||
    typeof workingDirectory !== "string" ||
    !isAbsolute(workingDirectory) ||
    dirname(projectConfigPath) !== workingDirectory ||
    dirname(cachePath) !== workingDirectory ||
    (platform !== "win32" && platform !== "linux" && platform !== "darwin")
  ) {
    return { ok: false };
  }

  const nullDevice = platform === "win32" ? "NUL" : "/dev/null";
  const childEnvironment = {};
  try {
    for (const key of INHERITED_AUDIT_ENVIRONMENT_KEYS) {
      const value = environment?.[key];
      if (typeof value === "string" && value.length > 0) childEnvironment[key] = value;
    }
  } catch {
    return { ok: false };
  }

  Object.assign(childEnvironment, {
    NO_COLOR: "1",
    npm_config_audit: "true",
    npm_config_cache: cachePath,
    npm_config_color: "false",
    npm_config_fund: "false",
    npm_config_globalconfig: nullDevice,
    npm_config_ignore_scripts: "true",
    npm_config_prefix: workingDirectory,
    npm_config_registry: NPM_AUDIT_REGISTRY,
    npm_config_update_notifier: "false",
    npm_config_userconfig: projectConfigPath,
    npm_execpath: invocation.npmCliPath,
    npm_node_execpath: invocation.nodeExecutable,
  });

  return {
    ok: true,
    environment: childEnvironment,
    arguments: [
      "--json",
      "--ignore-scripts",
      `--prefix=${workingDirectory}`,
      `--cache=${cachePath}`,
      `--registry=${NPM_AUDIT_REGISTRY}`,
      `--userconfig=${projectConfigPath}`,
      `--globalconfig=${nullDevice}`,
      "--color=false",
      "--fund=false",
      "--update-notifier=false",
    ],
  };
}

export function createNpmAuditSnapshotV1(
  projectConfig,
  {
    temporaryRoot = tmpdir(),
    platform = process.platform,
    maxSnapshotBytes = MAX_AUDIT_SNAPSHOT_BYTES,
    maxSnapshotEntries = MAX_AUDIT_SNAPSHOT_ENTRIES,
    maxSnapshotMs = MAX_AUDIT_SNAPSHOT_MS,
  } = {},
) {
  if (
    !projectConfig?.ok ||
    typeof projectConfig.repositoryRoot !== "string" ||
    !isAbsolute(projectConfig.repositoryRoot) ||
    projectConfig.path !== resolve(projectConfig.repositoryRoot, ".npmrc") ||
    typeof temporaryRoot !== "string" ||
    !isAbsolute(temporaryRoot) ||
    (platform !== "linux" && platform !== "darwin") ||
    !Number.isSafeInteger(maxSnapshotBytes) ||
    maxSnapshotBytes < 1 ||
    maxSnapshotBytes > MAX_AUDIT_SNAPSHOT_BYTES ||
    !Number.isSafeInteger(maxSnapshotEntries) ||
    maxSnapshotEntries < 1 ||
    maxSnapshotEntries > MAX_AUDIT_SNAPSHOT_ENTRIES ||
    !Number.isSafeInteger(maxSnapshotMs) ||
    maxSnapshotMs < 1 ||
    maxSnapshotMs > MAX_AUDIT_SNAPSHOT_MS
  ) {
    return { ok: false };
  }

  let snapshotRoot;
  try {
    const budget = {
      bytes: 0,
      entries: 0,
      deadline: performance.now() + maxSnapshotMs,
      maxBytes: maxSnapshotBytes,
      maxEntries: maxSnapshotEntries,
    };
    const canonicalTemporaryRoot = realpathSync(temporaryRoot);
    if (pathIsInside(projectConfig.repositoryRoot, canonicalTemporaryRoot)) {
      return { ok: false };
    }
    assertTemporaryParentCustodyV1(canonicalTemporaryRoot);
    snapshotRoot = mkdtempSync(join(canonicalTemporaryRoot, "lnsat-npm-audit-"));
    const snapshotMetadata = statSync(snapshotRoot);
    if (
      !snapshotMetadata.isDirectory() ||
      snapshotMetadata.uid !== process.getuid() ||
      (snapshotMetadata.mode & 0o077) !== 0
    ) {
      throw new Error("Private snapshot directory is unavailable.");
    }
    countSnapshotEntryV1(snapshotMetadata, budget);

    const stageDirectory = (path) => {
      countSnapshotEntryV1({ isFile: () => false }, budget);
      mkdirSync(path, { mode: 0o700 });
    };

    const stageFile = (relativePath, maxBytes) => {
      const sourcePath = resolve(projectConfig.repositoryRoot, relativePath);
      const destinationPath = resolve(snapshotRoot, relativePath);
      const bytes = readBoundedRegularFileV1(sourcePath, maxBytes);
      countSnapshotEntryV1({ isFile: () => true, size: bytes.length }, budget);
      writeFileSync(destinationPath, bytes, { flag: "wx", mode: 0o600 });
      return bytes;
    };

    countSnapshotEntryV1(
      { isFile: () => true, size: Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG) },
      budget,
    );
    writeFileSync(join(snapshotRoot, ".npmrc"), NPM_AUDIT_PROJECT_CONFIG, {
      flag: "wx",
      mode: 0o600,
    });
    const rootManifest = JSON.parse(stageFile("package.json", 1024 * 1024));
    stageFile("package-lock.json", 8 * 1024 * 1024);
    if (
      !Array.isArray(rootManifest.workspaces) ||
      rootManifest.workspaces.length !== 2 ||
      rootManifest.workspaces[0] !== "apps/*" ||
      rootManifest.workspaces[1] !== "packages/*"
    ) {
      throw new Error("Unexpected workspace inventory.");
    }

    const installedTrees = [];
    for (const parent of ["apps", "packages"]) {
      const sourceParent = join(projectConfig.repositoryRoot, parent);
      const snapshotParent = join(snapshotRoot, parent);
      stageDirectory(snapshotParent);
      for (const entry of readDirectoryEntriesV1(sourceParent)) {
        countSnapshotEntryV1({ isFile: () => false }, budget);
        if (!entry.isDirectory()) {
          if (entry.isSymbolicLink()) throw new Error("Linked workspace directory.");
          continue;
        }
        const packagePath = join(sourceParent, entry.name, "package.json");
        let metadata;
        try {
          metadata = lstatSync(packagePath);
        } catch (error) {
          if (error?.code === "ENOENT") continue;
          throw error;
        }
        if (!metadata.isFile()) throw new Error("Invalid workspace manifest.");
        const destinationDirectory = join(snapshotParent, entry.name);
        stageDirectory(destinationDirectory);
        stageFile(join(parent, entry.name, "package.json"), 1024 * 1024);
        const installedPath = join(sourceParent, entry.name, "node_modules");
        try {
          const installedMetadata = lstatSync(installedPath);
          if (!installedMetadata.isDirectory()) {
            throw new Error("Invalid installed dependency tree.");
          }
          installedTrees.push([
            installedPath,
            join(destinationDirectory, "node_modules"),
          ]);
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }
    }

    const rootInstalledPath = join(projectConfig.repositoryRoot, "node_modules");
    if (!lstatSync(rootInstalledPath).isDirectory()) {
      throw new Error("Invalid installed dependency tree.");
    }
    installedTrees.push([rootInstalledPath, join(snapshotRoot, "node_modules")]);

    const preflight = { ...budget };
    for (const [sourcePath] of installedTrees) {
      inspectInstalledTreeV1(sourcePath, preflight);
    }
    const copying = { ...budget };
    for (const [sourcePath, destinationPath] of installedTrees) {
      copyInstalledTreeV1(sourcePath, destinationPath, copying);
    }
    assertSnapshotLinksStayInsideV1(snapshotRoot, snapshotRoot, budget.deadline);
    const cachePath = join(snapshotRoot, "cache");
    countSnapshotEntryV1({ isFile: () => false }, copying);
    mkdirSync(cachePath, { mode: 0o700 });
    return {
      ok: true,
      repositoryRoot: snapshotRoot,
      projectConfigPath: join(snapshotRoot, ".npmrc"),
      cachePath,
      validate: () => {
        try {
          assertTemporaryParentCustodyV1(canonicalTemporaryRoot);
          const current = lstatSync(snapshotRoot);
          return (
            current.isDirectory() &&
            current.uid === snapshotMetadata.uid &&
            current.dev === snapshotMetadata.dev &&
            current.ino === snapshotMetadata.ino &&
            (current.mode & 0o077) === 0
          );
        } catch {
          return false;
        }
      },
      cleanup: () => rmSync(snapshotRoot, { recursive: true, force: true }),
    };
  } catch {
    if (snapshotRoot) {
      try {
        rmSync(snapshotRoot, { recursive: true, force: true });
      } catch {
        // The caller receives a closed failure without exposing a filesystem path.
      }
    }
    return { ok: false };
  }
}

function assertTemporaryParentCustodyV1(directory) {
  const uid = process.getuid();
  let current = directory;
  for (;;) {
    const metadata = lstatSync(current);
    const rootOwnedSticky = metadata.uid === 0 && (metadata.mode & 0o1000) !== 0;
    if (
      !metadata.isDirectory() ||
      (metadata.uid !== 0 && metadata.uid !== uid) ||
      ((metadata.mode & 0o022) !== 0 && !rootOwnedSticky)
    ) {
      throw new Error("Unsafe temporary directory custody.");
    }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function* readDirectoryEntriesV1(directory) {
  const handle = opendirSync(directory);
  try {
    let entry;
    while ((entry = handle.readSync()) !== null) yield entry;
  } finally {
    handle.closeSync();
  }
}

function countSnapshotEntryV1(metadata, budget) {
  if (performance.now() > budget.deadline) {
    throw new Error("Dependency snapshot timed out.");
  }
  budget.entries += 1;
  budget.bytes += metadata.isFile() ? metadata.size : 0;
  if (budget.entries > budget.maxEntries || budget.bytes > budget.maxBytes) {
    throw new Error("Dependency snapshot exceeds limit.");
  }
}

function countInstalledEntryV1(sourcePath, budget) {
  if (performance.now() > budget.deadline) {
    throw new Error("Installed dependency snapshot timed out.");
  }
  const metadata = lstatSync(sourcePath);
  if (!metadata.isFile() && !metadata.isDirectory() && !metadata.isSymbolicLink()) {
    throw new Error("Invalid installed dependency entry.");
  }
  if (metadata.isFile() && metadata.size > MAX_AUDIT_SNAPSHOT_FILE_BYTES) {
    throw new Error("Installed dependency file exceeds snapshot limit.");
  }
  countSnapshotEntryV1(metadata, budget);
  return metadata;
}

function inspectInstalledTreeV1(sourcePath, budget) {
  const metadata = countInstalledEntryV1(sourcePath, budget);
  if (metadata.isDirectory()) {
    for (const entry of readdirSync(sourcePath)) {
      inspectInstalledTreeV1(join(sourcePath, entry), budget);
    }
  }
}

function copyInstalledTreeV1(sourcePath, destinationPath, budget) {
  cpSync(sourcePath, destinationPath, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    mode: constants.COPYFILE_FICLONE,
    filter: (candidate) => {
      countInstalledEntryV1(candidate, budget);
      return true;
    },
  });
}

function assertSnapshotLinksStayInsideV1(snapshotRoot, directory, deadline) {
  if (performance.now() > deadline) {
    throw new Error("Installed dependency snapshot timed out.");
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const candidate = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      if (!pathIsInside(snapshotRoot, realpathSync(candidate))) {
        throw new Error("Installed dependency link escapes the snapshot.");
      }
    } else if (entry.isDirectory()) {
      assertSnapshotLinksStayInsideV1(snapshotRoot, candidate, deadline);
    }
  }
}

function readBoundedRegularFileV1(path, maxBytes) {
  const descriptor = openSync(
    path,
    constants.O_RDONLY | constants.O_NONBLOCK | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile() || metadata.size > maxBytes) {
      throw new Error("Invalid manifest file.");
    }
    const bytes = Buffer.alloc(metadata.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = readSync(descriptor, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length !== metadata.size) throw new Error("Manifest file changed during read.");
    return bytes.subarray(0, length);
  } finally {
    closeSync(descriptor);
  }
}

export function resolveTrustedNpmProjectConfigV1({
  repositoryRoot = repoRoot,
  readFile = readBoundedProjectConfig,
  realpath = realpathSync,
  stat = statSync,
} = {}) {
  if (typeof repositoryRoot !== "string" || !isAbsolute(repositoryRoot)) {
    return { ok: false };
  }

  try {
    const canonicalRepositoryRoot = realpath(repositoryRoot);
    const expectedPath = resolve(canonicalRepositoryRoot, ".npmrc");
    const canonicalPath = realpath(resolve(repositoryRoot, ".npmrc"));
    const metadata = stat(canonicalPath);
    if (
      !isAbsolute(canonicalRepositoryRoot) ||
      canonicalPath !== expectedPath ||
      !metadata.isFile() ||
      metadata.size !== Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG)
    ) {
      return { ok: false };
    }
    const bytes = readFile(canonicalPath);
    if (
      !(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) ||
      bytes.byteLength !== Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG) ||
      createHash("sha256").update(bytes).digest("hex") !==
        NPM_AUDIT_PROJECT_CONFIG_SHA256
    ) {
      return { ok: false };
    }

    return {
      ok: true,
      path: canonicalPath,
      repositoryRoot: canonicalRepositoryRoot,
    };
  } catch {
    return { ok: false };
  }
}

function readBoundedProjectConfig(path) {
  const descriptor = openSync(
    path,
    constants.O_RDONLY | constants.O_NONBLOCK | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const expectedSize = Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG);
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile() || metadata.size !== expectedSize) {
      throw new Error("Invalid project config file.");
    }
    const bytes = Buffer.alloc(expectedSize + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = readSync(descriptor, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    return bytes.subarray(0, length);
  } finally {
    closeSync(descriptor);
  }
}

export function resolveTrustedNpmInvocationV1({
  environment = process.env,
  nodeExecutable = process.execPath,
  repositoryRoot = repoRoot,
  realpath = realpathSync,
  stat = statSync,
} = {}) {
  let npmExecPath;
  try {
    npmExecPath = environment?.npm_execpath;
  } catch {
    return { ok: false };
  }

  if (
    typeof npmExecPath !== "string" ||
    npmExecPath.length === 0 ||
    !isAbsolute(npmExecPath) ||
    typeof nodeExecutable !== "string" ||
    !isAbsolute(nodeExecutable) ||
    typeof repositoryRoot !== "string" ||
    !isAbsolute(repositoryRoot)
  ) {
    return { ok: false };
  }

  try {
    const canonicalRepositoryRoot = realpath(repositoryRoot);
    const canonicalNpmCliPath = realpath(npmExecPath);
    const canonicalNodeExecutable = realpath(nodeExecutable);
    const trustedNpmCliPaths = trustedNpmCliPathsForNode(
      canonicalNodeExecutable,
      realpath,
    );
    if (
      !isAbsolute(canonicalRepositoryRoot) ||
      !isAbsolute(canonicalNpmCliPath) ||
      !isAbsolute(canonicalNodeExecutable) ||
      basename(canonicalNpmCliPath) !== "npm-cli.js" ||
      !trustedNpmCliPaths.includes(canonicalNpmCliPath) ||
      !stat(canonicalNpmCliPath).isFile() ||
      !stat(canonicalNodeExecutable).isFile() ||
      pathIsInside(repositoryRoot, nodeExecutable) ||
      pathIsInside(repositoryRoot, canonicalNodeExecutable) ||
      pathIsInside(repositoryRoot, npmExecPath) ||
      pathIsInside(repositoryRoot, canonicalNpmCliPath) ||
      pathIsInside(canonicalRepositoryRoot, nodeExecutable) ||
      pathIsInside(canonicalRepositoryRoot, canonicalNodeExecutable) ||
      pathIsInside(canonicalRepositoryRoot, npmExecPath) ||
      pathIsInside(canonicalRepositoryRoot, canonicalNpmCliPath)
    ) {
      return { ok: false };
    }

    return {
      ok: true,
      nodeExecutable: canonicalNodeExecutable,
      npmCliPath: canonicalNpmCliPath,
    };
  } catch {
    return { ok: false };
  }
}

function trustedNpmCliPathsForNode(nodeExecutable, realpath) {
  const nodeDirectory = dirname(nodeExecutable);
  const candidates = [
    resolve(nodeDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    resolve(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  const canonical = [];
  for (const candidate of candidates) {
    try {
      const value = realpath(candidate);
      if (isAbsolute(value) && !canonical.includes(value)) canonical.push(value);
    } catch {
      // A platform-specific candidate may not exist.
    }
  }
  return canonical;
}

function pathIsInside(parent, candidate) {
  const pathFromParent = relative(parent, candidate);
  return (
    pathFromParent === "" ||
    (pathFromParent !== ".." &&
      !pathFromParent.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromParent))
  );
}

function processFailureMessage(result) {
  if (result?.error) {
    if (result.error.code === "ETIMEDOUT") return "npm audit timed out.";
    if (result.error.code === "ENOBUFS") {
      return "npm audit output exceeds the permitted size.";
    }
    return "npm audit process could not be started.";
  }
  if (result?.signal) return "npm audit process was terminated.";
  return null;
}

export function parseNpmAuditJson(stdout) {
  const bytes = toBytes(stdout);
  if (bytes.byteLength > MAX_AUDIT_JSON_BYTES) {
    return { ok: false, message: "npm audit output exceeds the permitted size." };
  }
  try {
    const text = UTF8_DECODER.decode(bytes);
    assertUniqueJsonMembers(text);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, message: "npm audit did not return valid JSON." };
  }
}

function toBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  return Buffer.alloc(0);
}

function assertUniqueJsonMembers(text) {
  let cursor = 0;

  function skipWhitespace() {
    while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
  }

  function scanString() {
    const start = cursor;
    if (text[cursor] !== '"') throw new Error("expected JSON string");
    cursor += 1;
    while (cursor < text.length) {
      if (text[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (text[cursor] === '"') {
        cursor += 1;
        return JSON.parse(text.slice(start, cursor));
      }
      cursor += 1;
    }
    throw new Error("unterminated JSON string");
  }

  function scanValue(depth) {
    skipWhitespace();
    if (text[cursor] === "{") {
      if (depth > MAX_AUDIT_JSON_DEPTH) {
        throw new Error("JSON nesting exceeds the permitted depth");
      }
      return scanObject(depth);
    }
    if (text[cursor] === "[") {
      if (depth > MAX_AUDIT_JSON_DEPTH) {
        throw new Error("JSON nesting exceeds the permitted depth");
      }
      return scanArray(depth);
    }
    if (text[cursor] === '"') return scanString();
    const start = cursor;
    while (cursor < text.length && !/[\s,\]}]/u.test(text[cursor])) cursor += 1;
    if (cursor === start) throw new Error("expected JSON value");
  }

  function scanObject(depth) {
    const members = new Set();
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "}") {
      cursor += 1;
      return;
    }
    while (cursor < text.length) {
      skipWhitespace();
      const key = scanString();
      if (members.has(key)) throw new Error("duplicate JSON member");
      members.add(key);
      skipWhitespace();
      if (text[cursor] !== ":") throw new Error("expected JSON member colon");
      cursor += 1;
      scanValue(depth + 1);
      skipWhitespace();
      if (text[cursor] === "}") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") throw new Error("expected JSON member comma");
      cursor += 1;
    }
    throw new Error("unterminated JSON object");
  }

  function scanArray(depth) {
    cursor += 1;
    skipWhitespace();
    if (text[cursor] === "]") {
      cursor += 1;
      return;
    }
    while (cursor < text.length) {
      scanValue(depth + 1);
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return;
      }
      if (text[cursor] !== ",") throw new Error("expected JSON array comma");
      cursor += 1;
    }
    throw new Error("unterminated JSON array");
  }

  scanValue(1);
  skipWhitespace();
  if (cursor !== text.length) throw new Error("unexpected trailing JSON bytes");
}

function failed(message) {
  return { ok: false, stdout: "", stderr: `${message}\n` };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--signatures")) {
    process.stderr.write("Usage: check-npm-audit.mjs [--signatures]\n");
    process.exitCode = 1;
  } else {
    const result = runNpmAuditCheckV1(args[0] === "--signatures");
    if (result.stdout) process.stdout.write(`${result.stdout}\n`);
    if (result.stderr) process.stderr.write(result.stderr);
    if (!result.ok) process.exitCode = 1;
  }
}
