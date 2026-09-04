import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { evaluateNpmAudit, evaluateNpmSignatures } from "./npm-audit-rules.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
export const MAX_AUDIT_JSON_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIT_JSON_DEPTH = 64;
export const NPM_AUDIT_TIMEOUT_MS = 120_000;
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

  const auditEnvironment = createNpmAuditEnvironmentV1(invocation, {
    ...runtime,
    projectConfigPath: projectConfig.path,
  });
  if (!auditEnvironment.ok) return failed("Trusted npm environment is unavailable.");

  const auditArgs = signatureMode
    ? ["audit", "signatures", ...auditEnvironment.arguments]
    : ["audit", ...auditEnvironment.arguments];
  const result = spawn(
    invocation.nodeExecutable,
    [invocation.npmCliPath, ...auditArgs],
    {
      cwd: projectConfig.repositoryRoot,
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
  { environment = process.env, platform = process.platform, projectConfigPath } = {},
) {
  if (
    !invocation?.ok ||
    typeof invocation.nodeExecutable !== "string" ||
    !isAbsolute(invocation.nodeExecutable) ||
    typeof invocation.npmCliPath !== "string" ||
    !isAbsolute(invocation.npmCliPath) ||
    typeof projectConfigPath !== "string" ||
    !isAbsolute(projectConfigPath) ||
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
    npm_config_color: "false",
    npm_config_fund: "false",
    npm_config_globalconfig: nullDevice,
    npm_config_ignore_scripts: "true",
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
      `--registry=${NPM_AUDIT_REGISTRY}`,
      `--userconfig=${projectConfigPath}`,
      `--globalconfig=${nullDevice}`,
      "--color=false",
      "--fund=false",
      "--update-notifier=false",
    ],
  };
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
