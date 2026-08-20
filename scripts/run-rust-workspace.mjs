import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRustupHome = join(homedir(), ".local", "share", "lnsat-rustup");
const defaultCargoHome = join(homedir(), ".local", "share", "lnsat-cargo");
const rustupHome = process.env.LNSAT_RUSTUP_HOME ?? defaultRustupHome;
const cargoHome = process.env.LNSAT_CARGO_HOME ?? defaultCargoHome;
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
};

const commands = {
  fmt: ["fmt", "--all", "--", "--check"],
  clippy: ["clippy", "--workspace", "--all-targets", "--", "-D", "warnings"],
  test: ["test", "--workspace", "--all-targets", "--locked"],
  "phase7-local-conformance": ["test", "-p", "lnsat-store", "phase7_", "--locked"],
  metadata: ["metadata", "--format-version", "1", "--no-deps", "--locked"],
};

const action = process.argv[2];
if (!Object.hasOwn(commands, action)) {
  console.error(
    `usage: node scripts/run-rust-workspace.mjs <${Object.keys(commands).join("|")}>`,
  );
  process.exit(2);
}

verifyPinnedTool(cargo, ["--version"], /^cargo 1\.97\.1\b/u, "Cargo 1.97.1");
verifyPinnedTool(rustc, ["--version"], /^rustc 1\.97\.1\b/u, "rustc 1.97.1");

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
