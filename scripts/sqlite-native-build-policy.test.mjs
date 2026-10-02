import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
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
