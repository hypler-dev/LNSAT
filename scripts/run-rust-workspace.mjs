import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FILESTAT_FLAGS,
  verifyNativeEnvironment,
  verifyNativeConfigPaths,
  verifyNativeGraph,
} from "./sqlite-native-build-policy.mjs";

let repoRoot;
try {
  repoRoot = realpathSync(join(dirname(fileURLToPath(import.meta.url)), ".."));
} catch {
  console.error("sqlite_native.build_policy_rejected");
  process.exit(1);
}
const defaultRustupHome = join(homedir(), ".local", "share", "lnsat-rustup");
const defaultCargoHome = join(homedir(), ".local", "share", "lnsat-cargo");
const rustupHome = process.env.LNSAT_RUSTUP_HOME ?? defaultRustupHome;
const cargoHome = resolve(repoRoot, process.env.LNSAT_CARGO_HOME ?? defaultCargoHome);
const localCargo = join(cargoHome, "bin", "cargo");
const cargo = existsSync(localCargo) ? localCargo : "cargo";
const localRustc = join(cargoHome, "bin", "rustc");
const rustc = existsSync(localRustc) ? localRustc : "rustc";
const toolEnv = {
  ...process.env,
  RUSTUP_HOME: rustupHome,
  CARGO_HOME: cargoHome,
  RUSTUP_AUTO_INSTALL: "0",
  CARGO_NET_OFFLINE: "true",
  LIBSQLITE3_FLAGS: FILESTAT_FLAGS,
};

const commands = {
  fmt: ["fmt", "--all", "--", "--check"],
  clippy: ["clippy", "--workspace", "--all-targets", "--", "-D", "warnings"],
  test: ["test", "--workspace", "--all-targets", "--locked"],
  "phase7-local-conformance": ["test", "-p", "lnsat-store", "phase7_", "--locked"],
  "product-surface": [
    "test",
    "-p",
    "lnsatd",
    "--lib",
    "--test",
    "product_configuration_cli",
    "--test",
    "product_status_health_cli",
    "--test",
    "product_surface_cli",
    "--locked",
  ],
  metadata: ["metadata", "--format-version", "1", "--no-deps", "--locked"],
};

const action = process.argv[2];
if (process.argv.length !== 3 || !Object.hasOwn(commands, action)) {
  console.error(
    `usage: node scripts/run-rust-workspace.mjs <${Object.keys(commands).join("|")}>`,
  );
  process.exit(2);
}

try {
  verifyNativeConfigPaths(repoRoot, cargoHome);
  verifyNativeEnvironment(
    process.env,
    readFileSync(join(repoRoot, ".cargo/config.toml"), "utf8"),
  );
} catch {
  console.error("sqlite_native.build_policy_rejected");
  process.exit(1);
}

// Keep the frozen package.json source-gate graph intact. The existing format
// entry point runs this deterministic native-policy suite before Cargo.
if (action === "fmt") {
  const policyTests = spawnSync(
    process.execPath,
    ["--test", join(repoRoot, "scripts/sqlite-native-build-policy.test.mjs")],
    { cwd: repoRoot, env: process.env, stdio: "inherit" },
  );
  if (policyTests.error || policyTests.status !== 0) {
    console.error("sqlite_native.policy_tests_failed");
    process.exit(1);
  }
}

verifyPinnedTool(cargo, ["--version"], /^cargo 1\.97\.1\b/u, "Cargo 1.97.1");
verifyPinnedTool(rustc, ["--version"], /^rustc 1\.97\.1\b/u, "rustc 1.97.1");

const metadataResult = spawnSync(
  cargo,
  ["metadata", "--format-version", "1", "--locked", "--offline"],
  {
    cwd: repoRoot,
    env: toolEnv,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  },
);
try {
  if (metadataResult.error || metadataResult.status !== 0) throw new Error();
  verifyNativeGraph(JSON.parse(metadataResult.stdout));
} catch {
  console.error("sqlite_native.locked_graph_unverifiable");
  process.exit(1);
}

const result = spawnSync(cargo, commands[action], {
  cwd: repoRoot,
  env: toolEnv,
  stdio: "inherit",
});

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      "Pinned Cargo is unavailable. Install Rust 1.97.1 explicitly or set LNSAT_CARGO_HOME.",
    );
  } else {
    console.error(result.error.message);
  }
  process.exit(1);
}

process.exit(result.status ?? 1);

function verifyPinnedTool(command, args, expected, label) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: toolEnv,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0 || !expected.test(result.stdout.trim())) {
    console.error(`${label} is required; implicit toolchain installation is disabled.`);
    process.exit(1);
  }
}
