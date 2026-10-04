import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COMPILER_FAMILIES,
  NATIVE_INPUTS,
  FILESTAT_FLAGS,
  SQLITE_CARGO_CONFIG,
  verifyNativeEnvironment,
  verifyNativeGraph,
} from "./sqlite-native-build-policy.mjs";

test("native build policy rejects every compiler family and target precedence form", () => {
  for (const base of COMPILER_FAMILIES) {
    for (const key of [
      base,
      `HOST_${base}`,
      `TARGET_${base}`,
      `${base}_x86_64-unknown-linux-gnu`,
      `${base}_aarch64_apple_darwin`,
    ]) {
      for (const value of ["", "private-override-value"]) {
        assert.throws(
          () => verifyNativeEnvironment({ [key]: value }, SQLITE_CARGO_CONFIG),
          /^Error: sqlite_native.override_rejected$/,
        );
      }
    }
  }
});

test("native build policy rejects source, wrapper, header and linked-discovery inputs", () => {
  for (const base of NATIVE_INPUTS) {
    for (const key of [
      base,
      `AARCH64_APPLE_DARWIN_${base}`,
      `${base}_x86_64-unknown-linux-gnu`,
    ]) {
      assert.throws(
        () => verifyNativeEnvironment({ [key]: "" }, SQLITE_CARGO_CONFIG),
        /^Error: sqlite_native.override_rejected$/,
      );
    }
  }
  for (const key of [
    "PKG_CONFIG",
    "PKG_CONFIG_PATH",
    "HOST_PKG_CONFIG",
    "PKG_CONFIG_x86_64-unknown-linux-gnu",
    "VCPKGRS_DYNAMIC",
    "CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER",
    "CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS",
    "LIBSQLITE3_FLAGS_aarch64_apple_darwin",
    "AARCH64_APPLE_DARWIN_LIBSQLITE3_FLAGS",
  ]) {
    assert.throws(
      () => verifyNativeEnvironment({ [key]: "private-value" }, SQLITE_CARGO_CONFIG),
      /^Error: sqlite_native.override_rejected$/,
    );
  }
});

test("native build policy permits only fixed FILESTAT flags and exact repository config", () => {
  verifyNativeEnvironment(
    {
      PATH: "/trusted-toolchain",
      CARGO_HOME: "/trusted-config",
      CARGO_TARGET_DIR: "/target",
      LIBSQLITE3_FLAGS: FILESTAT_FLAGS,
    },
    SQLITE_CARGO_CONFIG,
  );
  for (const flags of [
    "",
    "-DSQLITE_ENABLE_FILESTAT",
    "SQLITE_ENABLE_FILESTAT -DSQLITE_DEBUG",
    "-USQLITE_ENABLE_FILESTAT",
  ]) {
    assert.throws(
      () => verifyNativeEnvironment({ LIBSQLITE3_FLAGS: flags }, SQLITE_CARGO_CONFIG),
      /^Error: sqlite_native.override_rejected$/,
    );
  }
  assert.throws(
    () =>
      verifyNativeEnvironment(
        {},
        SQLITE_CARGO_CONFIG.replace("force = true", "force = false"),
      ),
    /^Error: sqlite_native.config_rejected$/,
  );
});

function graph() {
  return {
    packages: [
      {
        name: "libsqlite3-sys",
        version: "0.38.1",
        id: "native",
        source: "registry+https://github.com/rust-lang/crates.io-index",
      },
      {
        name: "rusqlite",
        version: "0.40.1",
        id: "rust",
        source: "registry+https://github.com/rust-lang/crates.io-index",
      },
      {
        name: "nix",
        version: "0.29.0",
        id: "stat",
        source: "registry+https://github.com/rust-lang/crates.io-index",
      },
      { name: "lnsat-store", version: "0.1.0", id: "store", source: null },
    ],
    resolve: {
      nodes: [
        {
          id: "native",
          features: [
            "bundled",
            "bundled_bindings",
            "cc",
            "default",
            "min_sqlite_version_3_34_1",
            "pkg-config",
            "vcpkg",
          ],
        },
        { id: "rust", features: ["bundled", "limits"] },
        { id: "stat", features: ["fs"] },
        {
          id: "store",
          features: [],
          deps: [
            {
              name: "nix_stat",
              pkg: "stat",
              dep_kinds: [
                {
                  kind: null,
                  target: 'cfg(any(target_os = "linux", target_os = "macos"))',
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

test("native graph rejects alternate source, version, duplicate or missing packages and features", () => {
  verifyNativeGraph(graph());
  const mutations = [
    (g) => {
      g.packages[0].version = "0.38.0";
    },
    (g) => {
      g.packages[1].version = "0.40.0";
    },
    (g) => {
      g.packages[0].source = "path+file:///alternate";
    },
    (g) => {
      g.packages.push({ ...g.packages[0], id: "second" });
    },
    (g) => {
      g.packages.pop();
    },
    (g) => {
      g.resolve.nodes[0].features = [];
    },
    (g) => {
      g.resolve.nodes[1].features = ["bundled"];
    },
    (g) => {
      g.resolve.nodes.push({ ...g.resolve.nodes[0] });
    },
  ];
  for (const feature of [
    "sqlcipher",
    "bundled-sqlcipher",
    "bundled-sqlcipher-vendored-openssl",
    "in_gecko",
    "loadable_extension",
    "buildtime_bindgen",
    "with-asan",
    "bundled-windows",
  ]) {
    mutations.push((g) => {
      g.resolve.nodes[0].features.push(feature);
    });
  }
  for (const mutate of mutations) {
    const candidate = graph();
    mutate(candidate);
    assert.throws(
      () => verifyNativeGraph(candidate),
      /^Error: sqlite_native.graph_rejected$/,
    );
  }
  assert.throws(() => verifyNativeGraph({}), /^Error: sqlite_native.graph_rejected$/);
});

test("native graph requires the exact registry fs-only Nix alias as a production platform dependency", () => {
  for (const mutate of [
    (g) => {
      g.packages[2].version = "0.30.0";
    },
    (g) => {
      g.packages[2].source = "path+file:///alternate";
    },
    (g) => {
      g.packages.splice(2, 1);
    },
    (g) => {
      g.packages.push({ ...g.packages[2], id: "second-stat" });
    },
    (g) => {
      g.resolve.nodes[2].features = [];
    },
    (g) => {
      g.resolve.nodes[2].features.push("user");
    },
    (g) => {
      g.resolve.nodes.push({ ...g.resolve.nodes[2] });
    },
    (g) => {
      g.resolve.nodes[3].deps = [];
    },
    (g) => {
      g.resolve.nodes[3].deps[0].pkg = "alternate-stat";
    },
    (g) => {
      g.resolve.nodes[3].deps[0].name = "nix";
    },
    (g) => {
      g.resolve.nodes[3].deps.push({ ...g.resolve.nodes[3].deps[0] });
    },
    (g) => {
      g.resolve.nodes[3].deps[0].dep_kinds[0].kind = "dev";
    },
    (g) => {
      g.resolve.nodes[3].deps[0].dep_kinds[0].target = null;
    },
  ]) {
    const candidate = graph();
    mutate(candidate);
    assert.throws(
      () => verifyNativeGraph(candidate),
      /^Error: sqlite_native.graph_rejected$/,
    );
  }
});

test("runner rejects native override before attempting unavailable Cargo or exposing values", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/run-rust-workspace.mjs", "fmt"],
    {
      cwd: new URL("../", import.meta.url),
      env: {
        ...process.env,
        CFLAGS: "private-override-value",
        PATH: "/does-not-exist",
        LNSAT_CARGO_HOME: "/does-not-exist",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "sqlite_native.build_policy_rejected");
  assert.ok(!result.stderr.includes("private-override-value"));
});

function configFixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "lnsat-native-config-")));
  const outer = join(root, "outer");
  const repo = join(outer, "nested", "repo");
  const home = join(root, "cargo-home");
  const marker = join(root, "cargo-invoked");
  mkdirSync(join(repo, "scripts"), { recursive: true });
  mkdirSync(join(repo, ".cargo"));
  mkdirSync(join(home, "bin"), { recursive: true });
  writeFileSync(join(repo, ".cargo", "config.toml"), SQLITE_CARGO_CONFIG);
  for (const name of ["run-rust-workspace.mjs", "sqlite-native-build-policy.mjs"]) {
    writeFileSync(
      join(repo, "scripts", name),
      readFileSync(new URL(name, import.meta.url)),
    );
  }
  const cargo = join(home, "bin", "cargo");
  writeFileSync(cargo, '#!/bin/sh\npwd > "$LNSAT_CONFIG_TEST_MARKER"\nexit 86\n');
  chmodSync(cargo, 0o700);
  return { root, outer, repo, home, marker };
}

function runConfigFixture(fixture, env = {}, args = [], entry = fixture.repo) {
  return spawnSync(
    process.execPath,
    [join(entry, "scripts", "run-rust-workspace.mjs"), "metadata", ...args],
    {
      cwd: entry,
      env: {
        ...process.env,
        LNSAT_CARGO_HOME: fixture.home,
        LNSAT_CONFIG_TEST_MARKER: fixture.marker,
        ...env,
      },
      encoding: "utf8",
    },
  );
}

function assertConfigDenied(fixture, result) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "sqlite_native.build_policy_rejected");
  assert.equal(
    existsSync(fixture.marker),
    false,
    "policy must stop before invoking Cargo",
  );
}

// These subprocess regressions prove the real runner checks configuration before
// version/metadata/build invocation. No Cargo or toolchain is installed or run.
test(
  "runner rejects external Cargo configuration before any tool invocation",
  { skip: process.platform === "win32" },
  () => {
    for (const location of ["home", "ancestor", "repo-legacy"]) {
      for (const name of ["config", "config.toml"]) {
        if (location === "repo-legacy" && name === "config.toml") continue;
        for (const bytes of [
          '[build]\nrustc-wrapper = "private-wrapper"\n',
          '[target.aarch64-apple-darwin]\nlinker = "private-linker"\n',
        ]) {
          const fixture = configFixture();
          try {
            const directory =
              location === "home"
                ? fixture.home
                : location === "ancestor"
                  ? join(fixture.outer, ".cargo")
                  : join(fixture.repo, ".cargo");
            mkdirSync(directory, { recursive: true });
            writeFileSync(join(directory, name), bytes);
            assertConfigDenied(fixture, runConfigFixture(fixture));
          } finally {
            rmSync(fixture.root, { recursive: true, force: true });
          }
        }
      }
    }
  },
);

test(
  "runner rejects configuration symlinks and selected symlink-home configuration",
  { skip: process.platform === "win32" },
  () => {
    for (const kind of [
      "home-dangling",
      "ancestor-dangling",
      "own-config",
      "home-alias",
    ]) {
      const fixture = configFixture();
      try {
        if (kind === "home-dangling") {
          symlinkSync(join(fixture.root, "missing"), join(fixture.home, "config.toml"));
        } else if (kind === "ancestor-dangling") {
          mkdirSync(join(fixture.outer, ".cargo"));
          symlinkSync(
            join(fixture.root, "missing"),
            join(fixture.outer, ".cargo", "config"),
          );
        } else if (kind === "own-config") {
          const target = join(fixture.root, "own-config.toml");
          writeFileSync(target, SQLITE_CARGO_CONFIG);
          rmSync(join(fixture.repo, ".cargo", "config.toml"));
          symlinkSync(target, join(fixture.repo, ".cargo", "config.toml"));
        } else {
          const alias = join(fixture.root, "home-alias");
          symlinkSync(fixture.home, alias);
          writeFileSync(
            join(fixture.home, "config"),
            '[build]\nrustc-wrapper = "private-wrapper"\n',
          );
          assertConfigDenied(
            fixture,
            runConfigFixture(fixture, { LNSAT_CARGO_HOME: alias }),
          );
          continue;
        }
        assertConfigDenied(fixture, runConfigFixture(fixture));
      } finally {
        rmSync(fixture.root, { recursive: true, force: true });
      }
    }
  },
);

test(
  "runner rejects direct and Cargo-equivalent compiler/config selectors before Cargo",
  { skip: process.platform === "win32" },
  () => {
    const fixture = configFixture();
    try {
      for (const key of [
        "RUSTC",
        "RUSTDOC",
        "RUSTC_BOOTSTRAP",
        "RUSTDOCFLAGS",
        "CARGO_ENCODED_RUSTDOCFLAGS",
        "CARGO_BUILD_RUSTC",
        "CARGO_BUILD_RUSTDOC",
        "CARGO_BUILD_TARGET",
        "CARGO_BUILD_RUSTC_WRAPPER",
        "CARGO_BUILD_RUSTC_WORKSPACE_WRAPPER",
        "CARGO_SOURCE_CRATES_IO_REPLACE_WITH",
        "CARGO_REGISTRY_DEFAULT",
        "CARGO_REGISTRIES_CRATES_IO_INDEX",
        "CARGO_PROFILE_DEV_RUSTFLAGS",
        "CARGO_UNSTABLE_CONFIG_INCLUDE",
        "CARGO_CONFIG",
        "CARGO_CONFIG_PATH",
        "CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER",
        "CARGO_TARGET_AARCH64_APPLE_DARWIN_RUNNER",
        "CARGO_TARGET_AARCH64_APPLE_DARWIN_RUSTFLAGS",
        "CARGO_TARGET_AARCH64_APPLE_DARWIN_RUSTDOCFLAGS",
      ]) {
        assertConfigDenied(
          fixture,
          runConfigFixture(fixture, { [key]: "private-override-value" }),
        );
      }
      const extra = runConfigFixture(fixture, {}, ["--config", "private-config-value"]);
      assert.equal(extra.status, 2);
      assert.equal(existsSync(fixture.marker), false);
      assert.equal(extra.stderr.includes("private-config-value"), false);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  },
);

test(
  "config-free runner reaches Cargo from the physical repository cwd",
  { skip: process.platform === "win32" },
  () => {
    const fixture = configFixture();
    try {
      const alias = join(fixture.root, "repo-alias");
      symlinkSync(fixture.repo, alias);
      const result = runConfigFixture(fixture, {}, [], alias);
      assert.equal(
        result.status,
        1,
        "fake Cargo intentionally rejects version after recording invocation",
      );
      assert.equal(result.stderr.includes("build_policy_rejected"), false);
      assert.equal(readFileSync(fixture.marker, "utf8").trim(), fixture.repo);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  },
);
