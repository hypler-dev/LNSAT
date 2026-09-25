import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { evaluateNpmAudit, evaluateNpmSignatures } from "./npm-audit-rules.mjs";
import {
  MAX_AUDIT_JSON_BYTES,
  MAX_AUDIT_JSON_DEPTH,
  NPM_AUDIT_KILL_SIGNAL,
  NPM_AUDIT_PROJECT_CONFIG,
  NPM_AUDIT_PROJECT_CONFIG_SHA256,
  NPM_AUDIT_REGISTRY,
  NPM_AUDIT_TIMEOUT_MS,
  createNpmAuditEnvironmentV1,
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
    `--registry=${NPM_AUDIT_REGISTRY}`,
    `--userconfig=${trustedProjectConfigPath()}`,
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
  assert.equal(options.cwd, process.cwd());
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
  assert.equal(options.env.npm_config_userconfig, trustedProjectConfigPath());
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
    ...overrides,
  };
}

function expectedAuditEnvironment() {
  return {
    NO_COLOR: "1",
    npm_config_audit: "true",
    npm_config_color: "false",
    npm_config_fund: "false",
    npm_config_globalconfig: "/dev/null",
    npm_config_ignore_scripts: "true",
    npm_config_registry: NPM_AUDIT_REGISTRY,
    npm_config_update_notifier: "false",
    npm_config_userconfig: trustedProjectConfigPath(),
    npm_execpath: trustedNpmCliPath(),
    npm_node_execpath: trustedNodePath(),
  };
}

function assertNoSecret(result) {
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret, "u"));
}
