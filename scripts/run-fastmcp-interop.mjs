import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const profiles = {
  "3-legacy": { env: "LNSAT_FASTMCP3_PYTHON", version: "3.4.5" },
  "4-modern": { env: "LNSAT_FASTMCP4_PYTHON", version: "4.0.0b1" },
};
const profile = process.argv[2];
if (!(profile in profiles)) {
  fail("Expected FastMCP profile 3-legacy or 4-modern.");
}

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const configured = process.env[profiles[profile].env];
if (
  configured === undefined ||
  !configured.startsWith("/") ||
  !existsSync(configured)
) {
  fail(`${profiles[profile].env} must name isolated virtual-environment Python.`);
}
const python = resolve(configured);
if (!configured.includes("/venv/") && !configured.includes("/.venv/")) {
  fail("FastMCP Python must come from isolated venv path.");
}

const harness = resolve(repoRoot, "interop/fastmcp/fastmcp_interop.py");
const appleSilicon =
  process.platform === "darwin" &&
  spawnSync("/usr/sbin/sysctl", ["-n", "hw.optional.arm64"], {
    encoding: "utf8",
  }).stdout?.trim() === "1";
const launchThroughNativeArch = appleSilicon && process.arch === "x64";
const command = launchThroughNativeArch ? "/usr/bin/arch" : python;
const args = [
  ...(launchThroughNativeArch ? ["-arm64", python] : []),
  harness,
  "--profile",
  profile,
  "--repo",
  repoRoot,
];
const result = spawnSync(command, args, {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 30_000,
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    LNSAT_NODE_PATH: process.execPath,
    NO_COLOR: "1",
    PYTHONNOUSERSITE: "1",
  },
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr.slice(0, 4096));
  process.exit(result.status ?? 1);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
