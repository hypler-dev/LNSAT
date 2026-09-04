import assert from "node:assert/strict";
import test from "node:test";

import {
  hasLoadableConsoleEnvironmentFile,
  runConsoleBuild,
  runConsoleBuildCommandLine,
  sanitizedConsoleBuildEnvironment,
} from "./build.mjs";

const paths = {
  nodeExecutable: "/runtime/node",
  nextExecutable: "/repo/node_modules/next/dist/bin/next",
  workingDirectory: "/repo/apps/console",
};

function missingFile() {
  const error = new Error("test-only missing fixture");
  error.code = "ENOENT";
  throw error;
}

test("passes only platform build inputs and never mutates the source environment", () => {
  const inheritedEnvironment = {
    CI: "true",
    GITHUB_PERSONAL_ACCESS_TOKEN: "test-only-sentinel-personal",
    NEXT_PUBLIC_UNREVIEWED: "test-only-sentinel-public",
    NODE_ENV: "test-only-parent-mode",
    PATH: "/runtime/bin",
    path: "/untrusted-lowercase-bin",
    TMPDIR: "/private/tmp",
    UNRELATED_PRIVATE_VALUE: "test-only-sentinel-private",
  };

  const environment = sanitizedConsoleBuildEnvironment("build", inheritedEnvironment);

  assert.deepEqual(environment, {
    CI: "true",
    PATH: "/runtime/bin",
    TMPDIR: "/private/tmp",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
  });
  assert.equal(
    inheritedEnvironment.GITHUB_PERSONAL_ACCESS_TOKEN,
    "test-only-sentinel-personal",
  );
  assert.equal(inheritedEnvironment.NODE_ENV, "test-only-parent-mode");
  assert.equal(Object.hasOwn(environment, "path"), false);
  assert.equal(
    inheritedEnvironment.UNRELATED_PRIVATE_VALUE,
    "test-only-sentinel-private",
  );
});

test("canonicalizes case-insensitive Windows platform keys without admitting credentials", () => {
  assert.deepEqual(
    sanitizedConsoleBuildEnvironment(
      "build",
      {
        Path: "C:\\runtime\\bin",
        SystemRoot: "C:\\Windows",
        github_token: "test-only-sentinel",
      },
      "win32",
    ),
    {
      PATH: "C:\\runtime\\bin",
      SYSTEMROOT: "C:\\Windows",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "production",
    },
  );
  assert.equal(sanitizedConsoleBuildEnvironment("build", {}, "unsupported"), null);
});

test("rejects unsupported modes without forwarding unknown inputs", () => {
  assert.equal(
    sanitizedConsoleBuildEnvironment("dev", {
      HOME: "/users/operator",
      github_token: "test-only-sentinel",
    }),
    null,
  );
  assert.equal(sanitizedConsoleBuildEnvironment("unknown", {}), null);
});

test("fails closed when a Next-loadable environment path exists or is unreadable", () => {
  assert.equal(
    hasLoadableConsoleEnvironmentFile("build", paths.workingDirectory, missingFile),
    false,
  );

  let inspected = 0;
  const exists = hasLoadableConsoleEnvironmentFile(
    "build",
    paths.workingDirectory,
    () => {
      inspected += 1;
      if (inspected === 3) return {};
      return missingFile();
    },
  );
  assert.equal(exists, true);

  const unreadable = hasLoadableConsoleEnvironmentFile(
    "build",
    paths.workingDirectory,
    () => {
      const error = new Error("test-only unreadable fixture");
      error.code = "EACCES";
      throw error;
    },
  );
  assert.equal(unreadable, true);
});

test("checks every Next-loadable production build environment path", () => {
  const fileNamesByMode = {
    build: [".env", ".env.local", ".env.production", ".env.production.local"],
  };

  for (const [mode, fileNames] of Object.entries(fileNamesByMode)) {
    for (const selectedFileName of fileNames) {
      const inspected = [];
      const exists = hasLoadableConsoleEnvironmentFile(
        mode,
        paths.workingDirectory,
        (candidate) => {
          inspected.push(candidate);
          if (candidate === `${paths.workingDirectory}/${selectedFileName}`) return {};
          return missingFile();
        },
      );
      assert.equal(exists, true);
      assert.equal(inspected.at(-1), `${paths.workingDirectory}/${selectedFileName}`);
    }
  }
});

test("does not start Next when a loadable environment path exists", () => {
  let calls = 0;
  const status = runConsoleBuild({
    ...paths,
    mode: "build",
    stat: () => ({}),
    spawn: () => {
      calls += 1;
      return { error: undefined, status: 0 };
    },
  });
  assert.equal(status, 1);
  assert.equal(calls, 0);
});

test("runs Next build with one minimal environment", () => {
  const calls = [];
  const inheritedEnvironment = {
    GITHUB_PERSONAL_ACCESS_TOKEN: "test-only-sentinel",
    PATH: "/runtime/bin",
  };

  const status = runConsoleBuild({
    ...paths,
    mode: "build",
    inheritedEnvironment,
    stat: missingFile,
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { error: undefined, status: 0 };
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(
    calls.map(({ command, args }) => ({ command, args })),
    [
      {
        command: paths.nodeExecutable,
        args: [paths.nextExecutable, "build"],
      },
    ],
  );
  for (const { options } of calls) {
    assert.equal(options.cwd, paths.workingDirectory);
    assert.equal(options.stdio, "inherit");
    assert.equal(options.windowsHide, true);
    assert.deepEqual(options.env, {
      PATH: "/runtime/bin",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "production",
    });
  }
  assert.equal(inheritedEnvironment.GITHUB_PERSONAL_ACCESS_TOKEN, "test-only-sentinel");
});

test("command line rejects every forwarded Next argument before running", () => {
  let calls = 0;
  const run = () => {
    calls += 1;
    return 0;
  };

  for (const argv of [
    ["/runtime/node", "/repo/apps/console/scripts/build.mjs", "build", "../other-app"],
    [
      "/runtime/node",
      "/repo/apps/console/scripts/build.mjs",
      "build",
      "--experimental-upload-trace",
      "https://example.invalid/trace",
    ],
    ["/runtime/node", "/repo/apps/console/scripts/build.mjs", "dev", "--port", "3100"],
  ]) {
    assert.equal(runConsoleBuildCommandLine(argv, run), 1);
  }
  assert.equal(calls, 0);
});

test("command line accepts only one fixed build mode", () => {
  const calls = [];
  const run = (options) => {
    calls.push(options);
    return 17;
  };

  assert.equal(
    runConsoleBuildCommandLine(
      ["/runtime/node", "/repo/apps/console/scripts/build.mjs", "build"],
      run,
    ),
    17,
  );
  assert.deepEqual(calls, [{ mode: "build" }]);
  assert.equal(
    runConsoleBuildCommandLine(
      ["/runtime/node", "/repo/apps/console/scripts/build.mjs", "dev"],
      run,
    ),
    1,
  );
  assert.equal(
    runConsoleBuildCommandLine(
      ["/runtime/node", "/repo/apps/console/scripts/build.mjs", "unknown"],
      run,
    ),
    1,
  );
  assert.equal(calls.length, 1);
});

test("fails closed for invalid modes, arguments, paths, errors, and status", () => {
  for (const result of [
    { error: new Error("test-only-error"), status: null },
    { error: new Error("test-only-error"), status: 0 },
    { error: undefined, status: null },
  ]) {
    const status = runConsoleBuild({
      ...paths,
      mode: "build",
      stat: missingFile,
      spawn: () => result,
    });
    assert.equal(status, 1);
  }

  for (const candidate of [
    { mode: "unknown" },
    { mode: "build", nodeExecutable: "relative/node" },
    { mode: "build", platform: "unsupported" },
  ]) {
    assert.equal(
      runConsoleBuild({
        ...paths,
        ...candidate,
        stat: missingFile,
        spawn: () => {
          throw new Error("must not spawn");
        },
      }),
      1,
    );
  }
});
