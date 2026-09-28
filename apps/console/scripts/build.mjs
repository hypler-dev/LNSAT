import { spawnSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const consoleRoot = resolve(dirname(modulePath), "..");
const nextCliPath = createRequire(import.meta.url).resolve("next/dist/bin/next");

const inheritedEnvironmentAllowlist = new Set([
  "CI",
  "COLORTERM",
  "FORCE_COLOR",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NO_COLOR",
  "PATH",
  "PATHEXT",
  "SHELL",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "TZ",
  "USERPROFILE",
  "WINDIR",
]);

const loadableEnvironmentFiles = {
  build: [".env", ".env.local", ".env.production", ".env.production.local"],
};

export function sanitizedConsoleBuildEnvironment(
  mode,
  inheritedEnvironment = {},
  platform = process.platform,
) {
  if (
    !Object.hasOwn(loadableEnvironmentFiles, mode) ||
    (platform !== "win32" && platform !== "linux" && platform !== "darwin")
  ) {
    return null;
  }

  const environment = {};
  for (const [key, value] of Object.entries(inheritedEnvironment)) {
    const canonicalKey = platform === "win32" ? key.toUpperCase() : key;
    if (inheritedEnvironmentAllowlist.has(canonicalKey)) {
      environment[canonicalKey] = value;
    }
  }
  environment.NEXT_TELEMETRY_DISABLED = "1";
  environment.NODE_ENV = "production";
  return environment;
}

export function hasLoadableConsoleEnvironmentFile(
  mode,
  workingDirectory = consoleRoot,
  stat = lstatSync,
) {
  const fileNames = loadableEnvironmentFiles[mode];
  if (!fileNames || !isAbsolute(workingDirectory)) return true;

  for (const fileName of fileNames) {
    try {
      stat(resolve(workingDirectory, fileName));
      return true;
    } catch (error) {
      if (error?.code !== "ENOENT") return true;
    }
  }
  return false;
}

export function runConsoleBuild({
  mode = "build",
  spawn = spawnSync,
  stat = lstatSync,
  inheritedEnvironment = process.env,
  nodeExecutable = process.execPath,
  nextExecutable = nextCliPath,
  platform = process.platform,
  workingDirectory = consoleRoot,
} = {}) {
  if (
    !Object.hasOwn(loadableEnvironmentFiles, mode) ||
    !isAbsolute(nodeExecutable) ||
    !isAbsolute(nextExecutable) ||
    !isAbsolute(workingDirectory) ||
    hasLoadableConsoleEnvironmentFile(mode, workingDirectory, stat)
  ) {
    return 1;
  }

  const environment = sanitizedConsoleBuildEnvironment(
    mode,
    inheritedEnvironment,
    platform,
  );
  if (!environment) return 1;
  const result = spawn(nodeExecutable, [nextExecutable, mode], {
    cwd: workingDirectory,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) return 1;
  if (!Number.isInteger(result.status)) return 1;
  return result.status;
}

export function runConsoleBuildCommandLine(argv = process.argv, run = runConsoleBuild) {
  if (
    !Array.isArray(argv) ||
    argv.length !== 3 ||
    !Object.hasOwn(loadableEnvironmentFiles, argv[2])
  ) {
    return 1;
  }
  return run({ mode: argv[2] });
}

if (resolve(process.argv[1] ?? "") === modulePath) {
  process.exitCode = runConsoleBuildCommandLine();
}
