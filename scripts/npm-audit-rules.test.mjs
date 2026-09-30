import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { evaluateNpmAudit, evaluateNpmSignatures } from "./npm-audit-rules.mjs";
import {
  MAX_AUDIT_JSON_BYTES,
  MAX_AUDIT_JSON_DEPTH,
  MAX_AUDIT_SNAPSHOT_BYTES,
  MAX_AUDIT_SNAPSHOT_FILE_BYTES,
  NPM_AUDIT_KILL_SIGNAL,
  NPM_AUDIT_PROJECT_CONFIG,
  NPM_AUDIT_PROJECT_CONFIG_SHA256,
  NPM_AUDIT_REGISTRY,
  NPM_AUDIT_TIMEOUT_MS,
  createNpmAuditEnvironmentV1,
  createNpmAuditSnapshotV1,
  parseNpmAuditJson,
  resolveTrustedNpmInvocationV1,
  resolveTrustedNpmProjectConfigV1,
  runNpmAuditCheckV1,
} from "./check-npm-audit.mjs";

const secret = "do-not-reflect-audit-secret";

test("accepts a clean npm v10 audit report", () => {
  const result = evaluateNpmAudit(cleanAuditReport());

  assert.equal(result.ok, true);
  assert.deepEqual(result.allowedAdvisories, []);
});

test("rejects every unexpected vulnerable package", () => {
  const result = evaluateNpmAudit({
    ...cleanAuditReport(),
    vulnerabilities: {
      fast_uri: { name: "fast_uri", severity: "high" },
    },
    metadata: {
      ...cleanAuditReport().metadata,
      vulnerabilities: {
        ...cleanAuditReport().metadata.vulnerabilities,
        high: 1,
        total: 1,
      },
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["npm audit reported 1 vulnerable package(s)."]);
  assert.doesNotMatch(result.errors.join("\n"), /fast_uri/u);
});

test("rejects npm audit top-level schema drift", () => {
  for (const report of [
    { auditReportVersion: 1, vulnerabilities: {}, metadata: {} },
    { auditReportVersion: 2, vulnerabilities: {} },
    { ...cleanAuditReport(), error: secret },
  ]) {
    const result = evaluateNpmAudit(report);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["Unsupported npm audit JSON schema."]);
    assert.doesNotMatch(result.errors.join("\n"), new RegExp(secret, "u"));
  }
});

test("rejects malformed or inconsistent npm v10 audit metadata", () => {
  const clean = cleanAuditReport();
  const cases = [
    { ...clean, metadata: {} },
    { ...clean, metadata: { vulnerabilities: clean.metadata.vulnerabilities } },
    {
      ...clean,
      metadata: {
        ...clean.metadata,
        vulnerabilities: { ...clean.metadata.vulnerabilities, unknown: 0 },
      },
    },
    {
      ...clean,
      metadata: {
        ...clean.metadata,
        vulnerabilities: { ...clean.metadata.vulnerabilities, high: -1 },
      },
    },
    {
      ...clean,
      metadata: {
        ...clean.metadata,
        vulnerabilities: { ...clean.metadata.vulnerabilities, high: 0.5 },
      },
    },
    {
      ...clean,
      metadata: {
        ...clean.metadata,
        vulnerabilities: { ...clean.metadata.vulnerabilities, total: 1 },
      },
    },
    {
      ...clean,
      vulnerabilities: { package_a: {} },
    },
    {
      ...clean,
      metadata: {
        ...clean.metadata,
        dependencies: { ...clean.metadata.dependencies, total: 0 },
      },
    },
    {
      ...clean,
      metadata: {
        ...clean.metadata,
        dependencies: { ...clean.metadata.dependencies, prod: "1" },
      },
    },
  ];

  for (const report of cases) {
    const result = evaluateNpmAudit(report);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["Unsupported npm audit JSON schema."]);
  }
});

test("accepts only an exact empty signature schema", () => {
  const result = evaluateNpmSignatures({ invalid: [], missing: [] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("rejects invalid and missing npm signatures", () => {
  const result = evaluateNpmSignatures({
    invalid: [{ keyid: "SHA256:invalid" }],
    missing: [{ name: "unsigned-package" }],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "npm signature audit reported 1 invalid signature(s).",
    "npm signature audit reported 1 missing signature(s).",
  ]);
});

test("rejects every signature schema drift including an error hybrid", () => {
  for (const report of [
    { message: "registry unavailable" },
    { invalid: [] },
    { missing: [] },
    { invalid: [], missing: [], error: secret },
  ]) {
    const result = evaluateNpmSignatures(report);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["Unsupported npm signature audit JSON schema."]);
    assert.doesNotMatch(result.errors.join("\n"), new RegExp(secret, "u"));
  }
});

test("strict parser accepts valid UTF-8 JSON", () => {
  const result = parseNpmAuditJson(Buffer.from(JSON.stringify(cleanAuditReport())));

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, cleanAuditReport());
});

test("strict parser rejects duplicate top-level, nested, and escaped members", () => {
  for (const input of [
    '{"invalid":[],"invalid":[],"missing":[]}',
    '{"invalid":[{"a":1,"a":2}],"missing":[]}',
    '{"\\u0069nvalid":[],"invalid":[],"missing":[]}',
  ]) {
    const result = parseNpmAuditJson(Buffer.from(input));
    assert.equal(result.ok, false);
    assert.equal(result.message, "npm audit did not return valid JSON.");
  }
});

test("strict parser rejects invalid UTF-8 and trailing bytes", () => {
  for (const input of [
    Buffer.from([0x7b, 0x22, 0x61, 0x22, 0x3a, 0xc3, 0x7d]),
    Buffer.from('{"invalid":[],"missing":[]} trailing'),
  ]) {
    const result = parseNpmAuditJson(input);
    assert.equal(result.ok, false);
    assert.equal(result.message, "npm audit did not return valid JSON.");
  }
});

test("strict parser enforces the JSON byte and nesting limits", () => {
  const oversized = Buffer.alloc(MAX_AUDIT_JSON_BYTES + 1, 0x20);
  const atLimit =
    "[".repeat(MAX_AUDIT_JSON_DEPTH) + "0" + "]".repeat(MAX_AUDIT_JSON_DEPTH);
  const tooDeep =
    "[".repeat(MAX_AUDIT_JSON_DEPTH + 1) + "0" + "]".repeat(MAX_AUDIT_JSON_DEPTH + 1);

  const oversizedResult = parseNpmAuditJson(oversized);
  assert.equal(oversizedResult.ok, false);
  assert.equal(oversizedResult.message, "npm audit output exceeds the permitted size.");

  const atLimitResult = parseNpmAuditJson(Buffer.from(atLimit));
  assert.equal(atLimitResult.ok, true);

  const tooDeepResult = parseNpmAuditJson(Buffer.from(tooDeep));
  assert.equal(tooDeepResult.ok, false);
  assert.equal(tooDeepResult.message, "npm audit did not return valid JSON.");
});

test("wrapper uses bounded shell-free spawn options", () => {
  let command;
  let args;
  let options;
  const result = runNpmAuditCheckV1(
    true,
    (receivedCommand, receivedArgs, receivedOptions) => {
      command = receivedCommand;
      args = receivedArgs;
      options = receivedOptions;
      return successSignatureResult();
    },
    trustedRuntime(),
  );

  assert.equal(result.ok, true);
  assert.equal(command, trustedNodePath());
  assert.deepEqual(args, [
    trustedNpmCliPath(),
    "audit",
    "signatures",
    "--json",
    "--ignore-scripts",
    `--prefix=${snapshotRoot()}`,
    `--cache=${snapshotCachePath()}`,
    `--registry=${NPM_AUDIT_REGISTRY}`,
    `--userconfig=${snapshotConfigPath()}`,
    "--globalconfig=/dev/null",
    "--color=false",
    "--fund=false",
    "--update-notifier=false",
  ]);
  assert.equal(options.shell, false);
  assert.equal(options.timeout, NPM_AUDIT_TIMEOUT_MS);
  assert.equal(options.killSignal, NPM_AUDIT_KILL_SIGNAL);
  assert.equal(options.maxBuffer, MAX_AUDIT_JSON_BYTES);
  assert.equal(options.encoding, "buffer");
  assert.equal(options.cwd, snapshotRoot());
  assert.deepEqual(options.env, expectedAuditEnvironment());
});

test("audit child receives exact safe environment without preload, path, config, or credentials", () => {
  const hostileEnvironment = {
    npm_execpath: trustedNpmCliPath(),
    CI: "true",
    LANG: "C.UTF-8",
    TMPDIR: "/private/tmp",
    HOME: "/attacker/home",
    NODE_OPTIONS: `--require=${secret}`,
    NODE_PATH: "/attacker/modules",
    PATH: "/attacker/bin",
    npm_config_registry: "https://attacker.invalid/",
    npm_config_userconfig: "/attacker/npmrc",
    npm_config_cache: "/attacker/cache",
    NPM_TOKEN: secret,
    GITHUB_TOKEN: secret,
  };
  let options;
  const result = runNpmAuditCheckV1(
    true,
    (_command, _args, receivedOptions) => {
      options = receivedOptions;
      return successSignatureResult();
    },
    trustedRuntime({ environment: hostileEnvironment }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(options.env, {
    CI: "true",
    LANG: "C.UTF-8",
    TMPDIR: "/private/tmp",
    ...expectedAuditEnvironment(),
  });
  for (const key of [
    "HOME",
    "NODE_OPTIONS",
    "NODE_PATH",
    "PATH",
    "NPM_TOKEN",
    "GITHUB_TOKEN",
  ]) {
    assert.equal(Object.hasOwn(options.env, key), false);
  }
  assert.equal(options.env.npm_config_registry, NPM_AUDIT_REGISTRY);
  assert.equal(options.env.npm_config_userconfig, snapshotConfigPath());
  assert.equal(options.env.npm_config_cache, snapshotCachePath());
  assert.equal(options.env.npm_config_prefix, snapshotRoot());
});

test("audit environment fails closed for invalid runtime or hostile environment access", () => {
  assert.deepEqual(
    createNpmAuditEnvironmentV1(
      { ok: false },
      { projectConfigPath: trustedProjectConfigPath() },
    ),
    { ok: false },
  );
  assert.deepEqual(
    createNpmAuditEnvironmentV1(
      { ok: true, nodeExecutable: trustedNodePath(), npmCliPath: trustedNpmCliPath() },
      {
        platform: "unsupported",
        environment: {},
        projectConfigPath: trustedProjectConfigPath(),
      },
    ),
    { ok: false },
  );
  const environment = new Proxy(
    { npm_execpath: trustedNpmCliPath() },
    {
      get(_target, key) {
        if (key === "npm_execpath") return trustedNpmCliPath();
        throw new Error(secret);
      },
    },
  );
  let spawned = false;
  const result = runNpmAuditCheckV1(
    true,
    () => {
      spawned = true;
      return successSignatureResult();
    },
    trustedRuntime({ environment }),
  );
  assert.equal(spawned, false);
  assert.equal(result.stderr, "Trusted npm environment is unavailable.\n");
  assertNoSecret(result);
});

test("audit binds the exact tracked project config and rejects drift before spawn", () => {
  assert.deepEqual(resolveTrustedNpmProjectConfigV1(trustedRuntime()), {
    ok: true,
    path: trustedProjectConfigPath(),
    repositoryRoot: process.cwd(),
  });
  assert.equal(
    NPM_AUDIT_PROJECT_CONFIG_SHA256,
    "4f0bbf2110193fbdd3366c4358487d044be244bb1984c9cd17bdaa0d636accee",
  );

  const cases = [
    {
      readFile: () => Buffer.from(`https-proxy=https://attacker.invalid/${secret}\n`),
    },
    {
      realpath(value) {
        return value.endsWith(".npmrc")
          ? resolve(process.cwd(), "..", "attacker")
          : value;
      },
    },
    {
      stat: (value) =>
        value.endsWith(".npmrc")
          ? {
              isFile: () => false,
              size: Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG),
            }
          : trustedStat(value),
    },
    {
      stat: (value) =>
        value.endsWith(".npmrc")
          ? {
              isFile: () => true,
              size: Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG) + 1,
            }
          : trustedStat(value),
    },
    {
      readFile() {
        throw new Error(secret);
      },
    },
  ];

  for (const overrides of cases) {
    let spawned = false;
    const result = runNpmAuditCheckV1(
      false,
      () => {
        spawned = true;
        return successSignatureResult();
      },
      trustedRuntime(overrides),
    );
    assert.equal(spawned, false);
    assert.equal(result.ok, false);
    assert.equal(result.stderr, "Trusted npm project config is unavailable.\n");
    assertNoSecret(result);
  }
});

test("current project config matches the frozen audit-network contract", () => {
  const result = resolveTrustedNpmProjectConfigV1();

  assert.equal(result.ok, true);
  assert.equal(result.path, resolve(process.cwd(), ".npmrc"));
  assert.equal(result.repositoryRoot, process.cwd());
});

test("private snapshot freezes project config, workspace links, and fresh cache", (t) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "lnsat-audit-test-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const sourceRoot = join(temporaryRoot, "source");
  mkdirSync(sourceRoot);
  writeFileSync(join(sourceRoot, ".npmrc"), NPM_AUDIT_PROJECT_CONFIG);
  writeFileSync(
    join(sourceRoot, "package.json"),
    JSON.stringify({ name: "test-root", workspaces: ["apps/*", "packages/*"] }),
  );
  writeFileSync(
    join(sourceRoot, "package-lock.json"),
    JSON.stringify({ name: "test-root", lockfileVersion: 3, packages: {} }),
  );
  for (const name of ["apps", "packages"]) mkdirSync(join(sourceRoot, name));
  mkdirSync(join(sourceRoot, "apps", "console"));
  mkdirSync(join(sourceRoot, "packages", "gateway"));
  writeFileSync(
    join(sourceRoot, "apps", "console", "package.json"),
    JSON.stringify({ name: "@lnsat/console", version: "0.1.0" }),
  );
  writeFileSync(
    join(sourceRoot, "packages", "gateway", "package.json"),
    JSON.stringify({ name: "@lnsat/gateway", version: "0.1.0" }),
  );
  mkdirSync(join(sourceRoot, "node_modules", "@lnsat"), { recursive: true });
  symlinkSync(
    "../../packages/gateway",
    join(sourceRoot, "node_modules", "@lnsat", "gateway"),
  );
  mkdirSync(join(temporaryRoot, "parent-cache", "_tuf"), { recursive: true });
  writeFileSync(join(temporaryRoot, "parent-cache", "_tuf", "sentinel"), secret);

  const projectConfig = resolveTrustedNpmProjectConfigV1({
    repositoryRoot: sourceRoot,
  });
  assert.equal(projectConfig.ok, true);
  const snapshot = createNpmAuditSnapshotV1(projectConfig, { temporaryRoot });
  assert.equal(snapshot.ok, true);
  assert.notEqual(snapshot.repositoryRoot, sourceRoot);
  assert.equal(snapshot.projectConfigPath, join(snapshot.repositoryRoot, ".npmrc"));
  assert.equal(snapshot.cachePath, join(snapshot.repositoryRoot, "cache"));
  assert.deepEqual(readdirSync(snapshot.cachePath), []);
  assert.equal(
    realpathSync(join(snapshot.repositoryRoot, "node_modules", "@lnsat", "gateway")),
    join(snapshot.repositoryRoot, "packages", "gateway"),
  );

  let childSnapshotRoot;
  const wrapperResult = runNpmAuditCheckV1(
    true,
    (_command, args, options) => {
      childSnapshotRoot = options.cwd;
      assert.notEqual(childSnapshotRoot, sourceRoot);
      assert.equal(options.env.npm_config_prefix, childSnapshotRoot);
      assert.equal(
        options.env.npm_config_userconfig,
        join(childSnapshotRoot, ".npmrc"),
      );
      assert.equal(options.env.npm_config_cache, join(childSnapshotRoot, "cache"));
      assert.ok(args.includes(`--cache=${join(childSnapshotRoot, "cache")}`));
      assert.equal(
        readFileSync(join(childSnapshotRoot, ".npmrc"), "utf8"),
        NPM_AUDIT_PROJECT_CONFIG,
      );
      assert.deepEqual(readdirSync(join(childSnapshotRoot, "cache")), []);
      assert.equal(
        realpathSync(join(childSnapshotRoot, "node_modules", "@lnsat", "gateway")),
        join(childSnapshotRoot, "packages", "gateway"),
      );
      return successSignatureResult();
    },
    trustedRuntime({
      repositoryRoot: sourceRoot,
      createSnapshot: (config) => createNpmAuditSnapshotV1(config, { temporaryRoot }),
    }),
  );
  assert.equal(wrapperResult.ok, true);
  assert.equal(existsSync(childSnapshotRoot), false);

  writeFileSync(
    join(sourceRoot, ".npmrc"),
    `proxy=https://attacker.invalid/${secret}\n`,
  );
  assert.equal(
    readFileSync(snapshot.projectConfigPath, "utf8"),
    NPM_AUDIT_PROJECT_CONFIG,
  );
  assert.equal(existsSync(join(snapshot.cachePath, "_tuf", "sentinel")), false);
  snapshot.cleanup();
  assert.equal(existsSync(snapshot.repositoryRoot), false);

  const installedRoot = join(sourceRoot, "node_modules");
  const unexpectedSnapshots = () =>
    readdirSync(temporaryRoot).filter((entry) => entry.startsWith("lnsat-npm-audit-"));
  const oversizedFile = join(installedRoot, "oversized");
  writeFileSync(oversizedFile, "");
  truncateSync(oversizedFile, MAX_AUDIT_SNAPSHOT_FILE_BYTES + 1);
  let spawned = false;
  const oversizedResult = runNpmAuditCheckV1(
    true,
    () => {
      spawned = true;
      return successSignatureResult();
    },
    trustedRuntime({
      createSnapshot: () => createNpmAuditSnapshotV1(projectConfig, { temporaryRoot }),
    }),
  );
  assert.equal(oversizedResult.ok, false);
  assert.equal(spawned, false);
  assert.deepEqual(unexpectedSnapshots(), []);
  rmSync(oversizedFile);

  const aggregateFiles = Array.from({ length: 7 }, (_, index) =>
    join(installedRoot, `aggregate-${index}`),
  );
  for (const path of aggregateFiles) {
    writeFileSync(path, "");
    truncateSync(path, MAX_AUDIT_SNAPSHOT_FILE_BYTES);
  }
  assert.ok(
    aggregateFiles.length * MAX_AUDIT_SNAPSHOT_FILE_BYTES > MAX_AUDIT_SNAPSHOT_BYTES,
  );
  assert.equal(createNpmAuditSnapshotV1(projectConfig, { temporaryRoot }).ok, false);
  assert.deepEqual(unexpectedSnapshots(), []);
  for (const path of aggregateFiles) rmSync(path);

  mkdirSync(join(temporaryRoot, "outside"));
  const escapingLink = join(installedRoot, "escape");
  symlinkSync("../../outside", escapingLink);
  assert.equal(createNpmAuditSnapshotV1(projectConfig, { temporaryRoot }).ok, false);
  assert.deepEqual(unexpectedSnapshots(), []);
  rmSync(escapingLink);
});

test("snapshot cleanup runs after both successful and failed audit children", () => {
  let cleanups = 0;
  const runtime = trustedRuntime({
    createSnapshot: () => ({
      ok: true,
      repositoryRoot: snapshotRoot(),
      projectConfigPath: snapshotConfigPath(),
      cachePath: snapshotCachePath(),
      cleanup: () => {
        cleanups += 1;
      },
    }),
  });
  assert.equal(
    runNpmAuditCheckV1(true, () => successSignatureResult(), runtime).ok,
    true,
  );
  assert.equal(
    runNpmAuditCheckV1(
      true,
      () => ({
        error: new Error(secret),
        status: null,
        stdout: secret,
        stderr: secret,
      }),
      runtime,
    ).ok,
    false,
  );
  assert.equal(
    runNpmAuditCheckV1(
      true,
      () => ({ error: undefined, status: 0, stdout: secret, stderr: secret }),
      runtime,
    ).ok,
    false,
  );
  assert.equal(cleanups, 3);
  assert.equal(
    runNpmAuditCheckV1(
      true,
      () => successSignatureResult(),
      trustedRuntime({
        createSnapshot() {
          throw new Error(secret);
        },
      }),
    ).stderr,
    "Private npm audit snapshot is unavailable.\n",
  );
});

test("snapshot rejects unsafe temporary ancestors and changed leaf identity before spawn", (t) => {
  const { temporaryRoot, sourceRoot, projectConfig } = snapshotSourceFixture(t);
  const unsafeParent = join(temporaryRoot, "unsafe");
  mkdirSync(unsafeParent);
  chmodSync(unsafeParent, 0o777);
  assert.equal(
    createNpmAuditSnapshotV1(projectConfig, { temporaryRoot: unsafeParent }).ok,
    false,
  );
  assert.deepEqual(readdirSync(unsafeParent), []);
  chmodSync(unsafeParent, 0o1777);
  assert.equal(
    createNpmAuditSnapshotV1(projectConfig, { temporaryRoot: unsafeParent }).ok,
    false,
  );
  assert.equal(
    createNpmAuditSnapshotV1(projectConfig, { temporaryRoot, platform: "win32" }).ok,
    false,
  );

  let spawned = false;
  const result = runNpmAuditCheckV1(
    false,
    () => {
      spawned = true;
      return successSignatureResult();
    },
    trustedRuntime({
      repositoryRoot: sourceRoot,
      createSnapshot(config) {
        const snapshot = createNpmAuditSnapshotV1(config, { temporaryRoot });
        assert.equal(snapshot.ok, true);
        renameSync(snapshot.repositoryRoot, `${snapshot.repositoryRoot}-original`);
        mkdirSync(snapshot.repositoryRoot, { mode: 0o700 });
        return snapshot;
      },
    }),
  );
  assert.equal(spawned, false);
  assert.equal(result.stderr, "Private npm audit snapshot is unavailable.\n");
  assertNoSecret(result);
});

test("shared snapshot limits include workspace staging and cannot be raised", (t) => {
  const { temporaryRoot, sourceRoot, projectConfig } = snapshotSourceFixture(t);
  for (const parent of ["apps", "packages"]) {
    const directory = join(sourceRoot, parent, "workspace");
    mkdirSync(directory);
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ name: `${parent}-${"a".repeat(200)}` }),
    );
  }
  for (const limits of [
    { maxSnapshotBytes: 512 },
    { maxSnapshotEntries: 8 },
    { maxSnapshotBytes: MAX_AUDIT_SNAPSHOT_BYTES + 1 },
    { maxSnapshotEntries: 50_001 },
    { maxSnapshotMs: 60_001 },
  ]) {
    assert.equal(
      createNpmAuditSnapshotV1(projectConfig, { temporaryRoot, ...limits }).ok,
      false,
    );
    assert.deepEqual(readdirSync(temporaryRoot), ["source"]);
  }
});

function snapshotSourceFixture(t) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "lnsat-audit-custody-test-"));
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
  const sourceRoot = join(temporaryRoot, "source");
  mkdirSync(sourceRoot);
  writeFileSync(join(sourceRoot, ".npmrc"), NPM_AUDIT_PROJECT_CONFIG);
  writeFileSync(
    join(sourceRoot, "package.json"),
    JSON.stringify({ name: "test-root", workspaces: ["apps/*", "packages/*"] }),
  );
  writeFileSync(
    join(sourceRoot, "package-lock.json"),
    JSON.stringify({ lockfileVersion: 3, packages: {} }),
  );
  for (const parent of ["apps", "packages", "node_modules"])
    mkdirSync(join(sourceRoot, parent));
  const projectConfig = resolveTrustedNpmProjectConfigV1({
    repositoryRoot: sourceRoot,
  });
  assert.equal(projectConfig.ok, true);
  return { temporaryRoot, sourceRoot, projectConfig };
}

test("project config rejects unsafe metadata before reading bytes", () => {
  for (const metadata of [
    { isFile: () => false, size: Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG) },
    { isFile: () => true, size: 8 * 1024 * 1024 },
  ]) {
    let reads = 0;
    const result = resolveTrustedNpmProjectConfigV1(
      trustedRuntime({
        stat: () => metadata,
        readFile() {
          reads += 1;
          throw new Error(secret);
        },
      }),
    );
    assert.deepEqual(result, { ok: false });
    assert.equal(reads, 0);
  }
});

test("trusted npm resolver rejects PATH lookup and untrusted CLI paths", () => {
  const localCli = resolve(process.cwd(), "node_modules", "npm", "bin", "npm-cli.js");
  const outsideCli = trustedNpmCliPath();
  const foreignCli = resolve(process.cwd(), "..", "attacker", "npm-cli.js");
  const cases = [
    { environment: {} },
    { environment: { npm_execpath: "npm" } },
    { environment: { npm_execpath: resolve(process.cwd(), "npm.js") } },
    { environment: { npm_execpath: localCli } },
    { environment: { npm_execpath: foreignCli } },
    { nodeExecutable: resolve(process.cwd(), "node") },
    {
      environment: {
        npm_execpath: resolve(process.cwd(), "..local", "npm-cli.js"),
      },
    },
    {
      environment: { npm_execpath: outsideCli },
      realpath(value) {
        return value === outsideCli ? localCli : value;
      },
    },
    {
      environment: { npm_execpath: outsideCli },
      stat() {
        return { isFile: () => false };
      },
    },
    {
      environment: { npm_execpath: outsideCli },
      realpath() {
        throw new Error(secret);
      },
    },
  ];

  for (const overrides of cases) {
    const resolved = resolveTrustedNpmInvocationV1(trustedRuntime(overrides));
    assert.deepEqual(resolved, { ok: false });

    let spawned = false;
    const result = runNpmAuditCheckV1(
      false,
      () => {
        spawned = true;
        return successSignatureResult();
      },
      trustedRuntime(overrides),
    );
    assert.equal(spawned, false);
    assert.equal(result.ok, false);
    assert.equal(result.stderr, "Trusted npm CLI path is unavailable.\n");
    assertNoSecret(result);
  }
});

test("trusted npm resolver binds canonical Node and parent npm CLI", () => {
  const result = resolveTrustedNpmInvocationV1(trustedRuntime());

  assert.deepEqual(result, {
    ok: true,
    nodeExecutable: trustedNodePath(),
    npmCliPath: trustedNpmCliPath(),
  });
  assert.notEqual(result.nodeExecutable, "node");
  assert.notEqual(result.npmCliPath, "npm");
  assert.notEqual(result.npmCliPath, "npm.cmd");
});

test("wrapper rejects malformed, duplicate, and oversized output without reflection", () => {
  for (const stdout of [
    "not-json-" + secret,
    '{"invalid":[],"invalid":[],"missing":[]}',
    Buffer.alloc(MAX_AUDIT_JSON_BYTES + 1, 0x20),
  ]) {
    const result = runNpmAuditCheckV1(
      true,
      () => ({
        error: undefined,
        status: 0,
        stdout,
        stderr: secret,
      }),
      trustedRuntime(),
    );
    assert.equal(result.ok, false);
    assertNoSecret(result);
  }
});

test("wrapper evaluates malformed and finding reports before generic nonzero status", () => {
  const cases = [
    {
      stdout: "not-json-" + secret,
      message: "npm audit did not return valid JSON.\n",
    },
    {
      stdout: Buffer.from(JSON.stringify({ invalid: [{ name: secret }], missing: [] })),
      message: "npm signature audit reported 1 invalid signature(s).\n",
      signatureMode: true,
    },
    {
      stdout: Buffer.from(
        JSON.stringify({
          ...cleanAuditReport(),
          vulnerabilities: { private_package: { name: secret } },
          metadata: {
            ...cleanAuditReport().metadata,
            vulnerabilities: {
              ...cleanAuditReport().metadata.vulnerabilities,
              high: 1,
              total: 1,
            },
          },
        }),
      ),
      message: "npm audit reported 1 vulnerable package(s).\n",
      signatureMode: false,
    },
    {
      stdout: Buffer.from(JSON.stringify({ invalid: [], missing: [] })),
      message: "npm audit exited with nonzero status.\n",
      signatureMode: true,
    },
  ];

  for (const expected of cases) {
    const result = runNpmAuditCheckV1(
      expected.signatureMode ?? true,
      () => ({
        error: undefined,
        status: 1,
        stdout: expected.stdout,
        stderr: secret,
      }),
      trustedRuntime(),
    );
    assert.equal(result.ok, false);
    assert.equal(result.stderr, expected.message);
    assertNoSecret(result);
  }
});

test("wrapper rejects timeout, max-buffer, termination, status, and spawn error", () => {
  const cases = [
    {
      result: {
        error: Object.assign(new Error(secret), { code: "ETIMEDOUT" }),
        status: null,
        stdout: secret,
        stderr: secret,
      },
      message: "npm audit timed out.\n",
    },
    {
      result: {
        error: Object.assign(new Error(secret), { code: "ENOBUFS" }),
        status: null,
        stdout: secret,
        stderr: secret,
      },
      message: "npm audit output exceeds the permitted size.\n",
    },
    {
      result: {
        error: undefined,
        signal: "SIGTERM",
        status: null,
        stdout: secret,
        stderr: secret,
      },
      message: "npm audit process was terminated.\n",
    },
    {
      result: {
        error: undefined,
        status: 1,
        stdout: Buffer.from(JSON.stringify({ invalid: [], missing: [] })),
        stderr: secret,
      },
      message: "npm audit exited with nonzero status.\n",
    },
    {
      result: {
        error: new Error(secret),
        status: null,
        stdout: secret,
        stderr: secret,
      },
      message: "npm audit process could not be started.\n",
    },
  ];

  for (const expected of cases) {
    const result = runNpmAuditCheckV1(true, () => expected.result, trustedRuntime());
    assert.equal(result.ok, false);
    assert.equal(result.stderr, expected.message);
    assertNoSecret(result);
  }
});

test("wrapper rejects untrusted report values without reflection", () => {
  const result = runNpmAuditCheckV1(
    true,
    () => ({
      error: undefined,
      status: 0,
      stdout: Buffer.from(
        JSON.stringify({ invalid: [{ name: secret }], missing: [], error: secret }),
      ),
      stderr: secret,
    }),
    trustedRuntime(),
  );

  assert.equal(result.ok, false);
  assert.equal(result.stderr, "Unsupported npm signature audit JSON schema.\n");
  assertNoSecret(result);
});

function cleanAuditReport() {
  return {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0,
      },
      dependencies: {
        prod: 1,
        dev: 0,
        optional: 0,
        peer: 0,
        peerOptional: 0,
        total: 1,
      },
    },
  };
}

function successSignatureResult() {
  return {
    error: undefined,
    status: 0,
    stdout: Buffer.from(JSON.stringify({ invalid: [], missing: [] })),
    stderr: Buffer.alloc(0),
  };
}

function trustedNpmCliPath() {
  return resolve(
    trustedNodePath(),
    "..",
    "..",
    "lib",
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
}

function trustedNodePath() {
  return resolve(process.cwd(), "..", "trusted-runtime", "bin", "node");
}

function trustedProjectConfigPath() {
  return resolve(process.cwd(), ".npmrc");
}

function snapshotRoot() {
  return resolve(process.cwd(), "..", "private-audit-snapshot");
}

function snapshotConfigPath() {
  return resolve(snapshotRoot(), ".npmrc");
}

function snapshotCachePath() {
  return resolve(snapshotRoot(), "cache");
}

function trustedStat(value) {
  return {
    isFile: () => true,
    size: value.endsWith(".npmrc") ? Buffer.byteLength(NPM_AUDIT_PROJECT_CONFIG) : 0,
  };
}

function trustedRuntime(overrides = {}) {
  return {
    environment: { npm_execpath: trustedNpmCliPath() },
    nodeExecutable: trustedNodePath(),
    repositoryRoot: process.cwd(),
    readFile: () => Buffer.from(NPM_AUDIT_PROJECT_CONFIG),
    realpath: (value) => value,
    stat: trustedStat,
    createSnapshot: () => ({
      ok: true,
      repositoryRoot: snapshotRoot(),
      projectConfigPath: snapshotConfigPath(),
      cachePath: snapshotCachePath(),
      cleanup: () => {},
    }),
    ...overrides,
  };
}

function expectedAuditEnvironment() {
  return {
    NO_COLOR: "1",
    npm_config_audit: "true",
    npm_config_cache: snapshotCachePath(),
    npm_config_color: "false",
    npm_config_fund: "false",
    npm_config_globalconfig: "/dev/null",
    npm_config_ignore_scripts: "true",
    npm_config_prefix: snapshotRoot(),
    npm_config_registry: NPM_AUDIT_REGISTRY,
    npm_config_update_notifier: "false",
    npm_config_userconfig: snapshotConfigPath(),
    npm_execpath: trustedNpmCliPath(),
    npm_node_execpath: trustedNodePath(),
  };
}

function assertNoSecret(result) {
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret, "u"));
}
