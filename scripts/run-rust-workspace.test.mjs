import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  LEGACY_COMMANDS,
  NATIVE_ACL_NAMES,
  NATIVE_ACTIONS,
  NATIVE_PATH_EDGES,
  NATIVE_RELOCATIONS,
  canonicalNativeJson,
  decodeCanonicalNativeJson,
  executeNativePackageProof,
  nativeCommandArrays,
  nativeInputPaths,
  parseNativeBinding,
  parseNativeReceipt,
  runLegacyAction,
  verifyNativeReceiptEvidence,
  verifyRustixLock,
} from "./run-rust-workspace.mjs";

const SHA = `sha256:${"a".repeat(64)}`;
const OID = "b".repeat(40);
const FIXED_ROOT = "/private/tmp/lnsat-native-package-proof-20261010";

const RELOCATIONS = [
  "headless_native.rs",
  "headless_native_acl.rs",
  "headless_native_fdinfo.rs",
  "headless_native_mountinfo.rs",
  "headless_native_procfs.rs",
  "headless_native_readable.rs",
  "headless_native_artifact.rs",
  "headless_native_root_bootstrap.rs",
  "headless_native_tests.rs",
  "headless_native_fdinfo_tests.rs",
  "headless_native_mountinfo_tests.rs",
  "headless_native_procfs_tests.rs",
  "headless_native_readable_tests.rs",
  "headless_native_artifact_tests.rs",
  "headless_native_root_bootstrap_tests.rs",
].map((name) => ({
  from: `crates/lnsatd/src/${name}`,
  to: `crates/lnsat-store/src/${name}`,
}));

const PATH_EDGES = [
  ["headless_native.rs", "headless_native_acl.rs", "headless_native_acl.rs"],
  ["headless_native.rs", "headless_native_fdinfo.rs", "headless_native_fdinfo.rs"],
  [
    "headless_native.rs",
    "headless_native_mountinfo.rs",
    "headless_native_mountinfo.rs",
  ],
  ["headless_native.rs", "headless_native_procfs.rs", "headless_native_procfs.rs"],
  ["headless_native.rs", "headless_native_readable.rs", "headless_native_readable.rs"],
  ["headless_native.rs", "headless_native_tests.rs", "headless_native_tests.rs"],
  [
    "headless_native_artifact.rs",
    "headless_native_artifact_tests.rs",
    "headless_native_artifact_tests.rs",
  ],
  [
    "headless_native_fdinfo.rs",
    "headless_native_fdinfo_tests.rs",
    "headless_native_fdinfo_tests.rs",
  ],
  [
    "headless_native_mountinfo.rs",
    "headless_native_mountinfo_tests.rs",
    "headless_native_mountinfo_tests.rs",
  ],
  [
    "headless_native_procfs.rs",
    "headless_native_artifact.rs",
    "headless_native_artifact.rs",
  ],
  [
    "headless_native_procfs.rs",
    "headless_native_procfs_tests.rs",
    "headless_native_procfs_tests.rs",
  ],
  [
    "headless_native_procfs.rs",
    "headless_native_root_bootstrap.rs",
    "headless_native_root_bootstrap.rs",
  ],
  [
    "headless_native_readable.rs",
    "headless_native_readable_tests.rs",
    "headless_native_readable_tests.rs",
  ],
  [
    "headless_native_root_bootstrap.rs",
    "headless_native_root_bootstrap_tests.rs",
    "headless_native_root_bootstrap_tests.rs",
  ],
].map(([from, relative_path, to]) => ({
  from: `crates/lnsatd/src/${from}`,
  relative_path,
  to: `crates/lnsatd/src/${to}`,
}));

const ACL_NAMES = [
  "headless_native::tests::headless_native_acl_all_base_modes_match_exact_permission_triplets",
  "headless_native::tests::headless_native_acl_default_inheritance_is_not_directory_mode",
  "headless_native::tests::headless_native_acl_errors_are_fixed_and_data_free",
  "headless_native::tests::headless_native_acl_exact_entry_and_byte_caps",
  "headless_native::tests::headless_native_acl_masked_off_raw_rights_and_separate_id_spaces_are_valid",
  "headless_native::tests::headless_native_acl_rejects_duplicate_and_unsorted_named_ids",
  "headless_native::tests::headless_native_acl_rejects_duplicate_missing_and_reordered_tag_transitions",
  "headless_native::tests::headless_native_acl_rejects_unknown_tags_permissions_and_id_misuse",
  "headless_native::tests::headless_native_acl_rejects_wrong_version_endian_lengths_and_trailing_bytes",
  "headless_native::tests::headless_native_acl_root_manifest_controller_shape_is_exact",
].sort();

function sha(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function binding(phase = "daemon-baseline") {
  const action =
    phase === "daemon-baseline" ? "native-daemon-baseline" : "native-store-proof";
  const paths = nativeInputPaths(phase);
  const inputs = paths.map((path) => ({ path, git_blob_oid: OID, sha256: SHA }));
  return {
    schema_version: "lnsat.native_package_binding.v1",
    phase,
    action,
    source: {
      base_revision: OID,
      revision: OID,
      tree_oid: OID,
      diff_sha256: SHA,
    },
    inputs,
    relocations: NATIVE_RELOCATIONS.map((entry) => ({
      ...entry,
      git_blob_oid: OID,
      sha256: SHA,
    })),
    path_edges: NATIVE_PATH_EDGES.map((edge) =>
      phase === "daemon-baseline"
        ? edge
        : {
            ...edge,
            from: edge.from.replace("crates/lnsatd/", "crates/lnsat-store/"),
            to: edge.to.replace("crates/lnsatd/", "crates/lnsat-store/"),
          },
    ),
    profile: {
      os: "linux",
      arch: "x64",
      host: "x86_64-unknown-linux-gnu",
      cargo_version: "1.97.1",
      rustc_version: "1.97.1",
      target: "x86_64-unknown-linux-gnu",
      filestat: "SQLITE_ENABLE_FILESTAT",
    },
    roots: {
      repository: "/work/checkout",
      evidence: FIXED_ROOT,
      target_parent: "/work/target-parent",
      cargo_home: "/cache/cargo",
      rustup_home: "/cache/rustup",
    },
    tools: [
      { name: "cargo", realpath: "/tools/cargo", sha256: SHA },
      { name: "rustc", realpath: "/tools/rustc", sha256: SHA },
    ],
    harness_sha256: SHA,
    baseline: null,
  };
}

function metadataFixture(phase = "daemon-baseline") {
  const packageName = phase === "store-proof" ? "lnsat-store" : "lnsatd";
  const packageId = phase === "store-proof" ? "store" : "daemon";
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
      {
        name: "lnsat-store",
        version: "0.1.0",
        id: "store",
        source: null,
        targets:
          packageName === "lnsat-store"
            ? [
                {
                  name: "lnsat-store",
                  kind: ["lib"],
                  src_path: "/work/checkout/crates/lnsat-store/src/lib.rs",
                },
              ]
            : [],
      },
      {
        name: "rustix",
        version: "1.1.5",
        id: "acl",
        source: "registry+https://github.com/rust-lang/crates.io-index",
      },
      {
        name: "lnsatd",
        version: "0.1.0",
        id: "daemon",
        source: null,
        targets:
          packageName === "lnsatd"
            ? [
                {
                  name: "lnsatd",
                  kind: ["lib"],
                  src_path: "/work/checkout/crates/lnsatd/src/lib.rs",
                },
              ]
            : [],
      },
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
        { id: "acl", features: ["alloc", "fs", "std"], deps: [] },
        {
          id: "daemon",
          features: [],
          deps: [
            {
              name: "rustix",
              pkg: "acl",
              dep_kinds: [{ kind: null, target: 'cfg(target_os = "linux")' }],
            },
          ],
        },
      ],
    },
  };
}

function mockProofIo(b, stageResults) {
  const files = new Map();
  const config =
    '[net]\noffline = true\n\n[env]\nLIBSQLITE3_FLAGS = { value = "SQLITE_ENABLE_FILESTAT", force = true }\n';
  const lock = [
    "version = 4",
    "",
    "[[package]]",
    'name = "rustix"',
    'version = "1.1.5"',
    'source = "registry+https://github.com/rust-lang/crates.io-index"',
    'checksum = "891efababe418670775f199f0d233d84843c227a0949a883ce15b37c78d6629d"',
    "",
  ].join("\n");
  files.set(`${b.roots.repository}/.cargo/config.toml`, Buffer.from(config));
  files.set(`${b.roots.repository}/Cargo.lock`, Buffer.from(lock));
  files.set(`${FIXED_ROOT}/harness.mjs`, Buffer.from("fixture harness"));
  const directories = new Set([...Object.values(b.roots), "/work/target-parent/owned"]);
  let launches = 0;
  const snapshot = () => ({
    revision: b.source.revision,
    tree_oid: b.source.tree_oid,
    tracked_clean: true,
    base_is_ancestor: true,
    diff_sha256: b.source.diff_sha256,
    inputs: b.inputs,
  });
  return {
    files,
    launches: () => launches,
    io: {
      platform: { os: "linux", arch: "x64" },
      env: { LIBSQLITE3_FLAGS: "SQLITE_ENABLE_FILESTAT" },
      read(path) {
        return files.get(path) ?? Buffer.alloc(0);
      },
      hashFile() {
        return SHA;
      },
      realpath(path) {
        return path;
      },
      stat(path) {
        return {
          file: !directories.has(path),
          directory: directories.has(path),
          symlink: false,
        };
      },
      sourceSnapshot: snapshot,
      verifyConfigPaths() {},
      createTarget() {
        return "/work/target-parent/owned";
      },
      listDirectory() {
        return [];
      },
      spawn() {
        return stageResults[launches++];
      },
      writeExclusive(path, bytes) {
        files.set(path, Buffer.from(bytes));
      },
    },
  };
}

function approval(b, bytes) {
  return {
    binding_sha256: sha(bytes),
    harness_sha256: b.harness_sha256,
    harness_path: `${FIXED_ROOT}/harness.mjs`,
    binding_path: `${FIXED_ROOT}/accepted-binding.json`,
    source: b.source,
    roots: b.roots,
    tools: b.tools,
    baseline: b.baseline,
  };
}

function successfulStages(phase = "daemon-baseline") {
  const metadata = metadataFixture(phase);
  const packageName = phase === "store-proof" ? "lnsat-store" : "lnsatd";
  const packageId = phase === "store-proof" ? "store" : "daemon";
  const artifact = {
    reason: "compiler-artifact",
    package_id: packageId,
    target: {
      name: packageName,
      kind: ["lib"],
      src_path: `/work/checkout/crates/${packageName}/src/lib.rs`,
    },
    profile: { test: true },
    executable: `/work/target-parent/owned/${packageName}-tests`,
  };
  const listing = `${NATIVE_ACL_NAMES.map((name) => `${name}: test`).join("\n")}\n`;
  return [
    "cargo 1.97.1 (fixture)\n",
    "rustc 1.97.1 (fixture)\n",
    "release: 1.97.1\nhost: x86_64-unknown-linux-gnu\n",
    `${JSON.stringify(metadata)}\n`,
    "",
    "",
    `${JSON.stringify(artifact)}\n`,
    listing,
  ].map((stdout) => ({
    status: 0,
    signal: null,
    error: null,
    stdout: Buffer.from(stdout),
    stderr: Buffer.alloc(0),
  }));
}

test("M0 keeps legacy commands and adds only fixed native command arrays", () => {
  assert.deepEqual(LEGACY_COMMANDS, {
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
  });
  assert.deepEqual(NATIVE_ACTIONS, ["native-daemon-baseline", "native-store-proof"]);
  assert.deepEqual(nativeCommandArrays("daemon-baseline"), {
    check: [
      "check",
      "--package",
      "lnsatd",
      "--lib",
      "--locked",
      "--offline",
      "--target",
      "x86_64-unknown-linux-gnu",
    ],
    clippy: [
      "clippy",
      "--package",
      "lnsatd",
      "--all-targets",
      "--locked",
      "--offline",
      "--target",
      "x86_64-unknown-linux-gnu",
      "--",
      "-D",
      "warnings",
    ],
    buildTests: [
      "test",
      "--package",
      "lnsatd",
      "--lib",
      "--no-run",
      "--locked",
      "--offline",
      "--target",
      "x86_64-unknown-linux-gnu",
      "--message-format=json",
    ],
    list: ["--list", "--format=terse"],
  });
  assert.equal(nativeCommandArrays("store-proof").check[2], "lnsat-store");
});

test("M0 freezes all relocation, module-edge, ACL, and phase-input inventory", () => {
  assert.deepEqual(NATIVE_RELOCATIONS, RELOCATIONS);
  assert.deepEqual(NATIVE_PATH_EDGES, PATH_EDGES);
  assert.deepEqual(NATIVE_ACL_NAMES, ACL_NAMES);
  for (const phase of ["daemon-baseline", "store-proof"]) {
    const paths = nativeInputPaths(phase);
    assert.equal(new Set(paths).size, paths.length);
    for (const { from, to } of RELOCATIONS) {
      assert.ok(paths.includes(phase === "daemon-baseline" ? from : to));
    }
    for (const edge of PATH_EDGES) {
      const endpoint =
        phase === "daemon-baseline"
          ? edge.from
          : edge.to.replace("crates/lnsatd/", "crates/lnsat-store/");
      assert.ok(paths.includes(endpoint));
    }
  }
  assert.throws(
    () => nativeInputPaths("untrusted-phase"),
    /native_package\.binding_rejected/u,
  );
});

test("canonical native JSON rejects ambiguity before parse", () => {
  const canonical = canonicalNativeJson({ a: "\u2028", z: [true, 1] });
  assert.deepEqual(
    canonicalNativeJson(decodeCanonicalNativeJson(canonical)),
    canonical,
  );
  for (const bytes of [
    Buffer.from('{"z":1,"a":2}\n'),
    Buffer.from('{"a":1 }\n'),
    Buffer.from('{"a":1,"\\u0061":2}\n'),
    Buffer.from([0x7b, 0x22, 0x61, 0x22, 0x3a, 0xc3, 0x28, 0x7d, 0x0a]),
    Buffer.from('{"a":"\\u0000"}\n'),
    Buffer.from('{"a":"\\ud800"}\n'),
    Buffer.from(`{"a":${"[".repeat(8)}0${"]".repeat(8)}}\n`),
    Buffer.from(`[${"0,".repeat(16_384)}0]\n`),
    Buffer.alloc(1024 * 1024 + 1, 0x20),
  ]) {
    assert.throws(
      () => decodeCanonicalNativeJson(bytes),
      /native_package\.json_rejected/u,
    );
  }
});

test("canonical native JSON accepts exact depth and node boundaries", () => {
  const depthEight = { a: [[[[[[[0]]]]]]] };
  const nodes16384 = Array.from({ length: 16_383 }, () => 0);
  assert.deepEqual(
    canonicalNativeJson(decodeCanonicalNativeJson(canonicalNativeJson(depthEight))),
    canonicalNativeJson(depthEight),
  );
  assert.deepEqual(
    canonicalNativeJson(decodeCanonicalNativeJson(canonicalNativeJson(nodes16384))),
    canonicalNativeJson(nodes16384),
  );
  assert.throws(
    () => canonicalNativeJson(Array.from({ length: 16_384 }, () => 0)),
    /native_package\.json_rejected/u,
  );
});

test("binding parser rejects shape drift, noncanonical bytes, and phase/input mismatch", () => {
  const valid = binding();
  assert.deepEqual(
    canonicalNativeJson(parseNativeBinding(canonicalNativeJson(valid))),
    canonicalNativeJson(valid),
  );
  const cases = [
    (value) => ({ ...value, unknown: true }),
    (value) => ({ ...value, profile: null }),
    (value) => ({ ...value, action: "native-store-proof" }),
    (value) => ({ ...value, inputs: value.inputs.slice(1) }),
    (value) => ({ ...value, inputs: [...value.inputs, value.inputs[0]] }),
    (value) => ({ ...value, roots: { ...value.roots, evidence: null } }),
  ];
  for (const mutate of cases) {
    assert.throws(
      () => parseNativeBinding(canonicalNativeJson(mutate(structuredClone(valid)))),
      /native_package\.binding_rejected/u,
    );
  }
  const store = binding("store-proof");
  store.baseline = {
    receipt_path: `${FIXED_ROOT}/baseline/receipt.json`,
    receipt_sha256: SHA,
    binding_path: `${FIXED_ROOT}/baseline/accepted-binding.json`,
    binding_sha256: SHA,
  };
  assert.doesNotThrow(() => parseNativeBinding(canonicalNativeJson(store)));
  for (const mutate of [
    (value) => ({ ...value, baseline: null }),
    (value) => ({
      ...value,
      baseline: { ...value.baseline, receipt_path: "/caller/receipt.json" },
    }),
  ]) {
    assert.throws(
      () => parseNativeBinding(canonicalNativeJson(mutate(structuredClone(store)))),
      /native_package\.binding_rejected/u,
    );
  }
  const alternate = Buffer.from(JSON.stringify(valid) + "\n");
  assert.throws(
    () => parseNativeBinding(alternate),
    /native_package\.(?:json|binding)_rejected/u,
  );
});

test("receipt parser closes its structural schema before evidence verification", () => {
  const invalid = {
    schema_version: "lnsat.native_package_receipt.v1",
    phase: "daemon-baseline",
    action: "native-daemon-baseline",
    binding_sha256: SHA,
    source_before: { revision: OID, tree_oid: OID, tracked_clean: true },
    source_after: null,
    target_directory: null,
    stages: [],
    artifact: null,
    listing: null,
    baseline_receipt_sha256: null,
    comparison: null,
    status: "compiled-listed",
    failure: null,
  };
  assert.throws(
    () => parseNativeReceipt(canonicalNativeJson(invalid), binding()),
    /native_package\.receipt_rejected/u,
  );
  for (const mutate of [
    (value) => ({ ...value, extra: true }),
    (value) => ({ ...value, action: "native-store-proof" }),
    (value) => ({ ...value, stages: null }),
    (value) => ({
      ...value,
      failure: { stage: "input", code: "native_package.binding_rejected" },
    }),
  ]) {
    assert.throws(
      () =>
        parseNativeReceipt(
          canonicalNativeJson(mutate(structuredClone(invalid))),
          binding(),
        ),
      /native_package\.receipt_rejected/u,
    );
  }
});

test("receipt parser refuses forged ordering, prefixes, success context, and evidence paths", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const fixture = mockProofIo(value, successfulStages());
  const receipt = executeNativePackageProof(bytes, approval(value, bytes), fixture.io);
  const cases = [
    (value) => {
      [value.stages[0], value.stages[1]] = [value.stages[1], value.stages[0]];
    },
    (value) => {
      value.stages.splice(3, 1);
    },
    (value) => {
      value.stages[2].exit_code = 2;
    },
    (value) => {
      value.failure = { stage: "input", code: "native_package.binding_rejected" };
    },
    (value) => {
      value.binding_sha256 = `sha256:${"c".repeat(64)}`;
    },
    (value) => {
      value.action = "native-store-proof";
    },
    (value) => {
      value.source_after.revision = OID.replace(/b/u, "c");
    },
    (value) => {
      value.stages[0].stdout.path = "../swapped";
    },
  ];
  for (const mutate of cases) {
    const forged = structuredClone(receipt);
    mutate(forged);
    assert.throws(
      () => parseNativeReceipt(canonicalNativeJson(forged), value),
      /native_package\.receipt_rejected/u,
    );
  }
});

test("evidence recheck rejects digest-consistent forged tool and graph streams", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  for (const [index, raw] of [
    [0, Buffer.from("cargo 1.96.0\n")],
    [3, Buffer.from("{}\n")],
  ]) {
    const fixture = mockProofIo(value, successfulStages());
    const receipt = executeNativePackageProof(
      bytes,
      approval(value, bytes),
      fixture.io,
    );
    const forged = structuredClone(receipt);
    forged.stages[index].stdout.bytes = raw.length;
    forged.stages[index].stdout.sha256 = sha(raw);
    fixture.files.set(
      `${FIXED_ROOT}/baseline/${forged.stages[index].stdout.path}`,
      raw,
    );
    assert.doesNotThrow(() => parseNativeReceipt(canonicalNativeJson(forged), value));
    assert.throws(
      () => verifyNativeReceiptEvidence(forged, value, fixture.io),
      /native_package\.receipt_rejected/u,
    );
  }
});

test("rustix lock proof pins the sole 1.1.5 registry checksum", () => {
  const lock = [
    "version = 4",
    "",
    "[[package]]",
    'name = "rustix"',
    'version = "1.1.5"',
    'source = "registry+https://github.com/rust-lang/crates.io-index"',
    'checksum = "891efababe418670775f199f0d233d84843c227a0949a883ce15b37c78d6629d"',
    "",
  ].join("\n");
  verifyRustixLock(lock);
  for (const text of [
    lock.replace("891ef", "991ef"),
    lock.replace('version = "1.1.5"', 'version = "1.1.4"'),
    lock.replace("registry+https", "path+https"),
    `${lock}${lock.slice(lock.indexOf("[[package]]"))}`,
    "not toml",
  ]) {
    assert.throws(() => verifyRustixLock(text), /native_package\.lock_rejected/u);
  }
});

test("legacy dispatcher refuses native or extra CLI without any injected process", () => {
  let launches = 0;
  const deps = {
    spawn() {
      launches += 1;
      throw new Error("must not launch");
    },
    log() {},
  };
  assert.equal(runLegacyAction(["native-daemon-baseline"], deps), 1);
  assert.equal(runLegacyAction(["fmt", "--package", "forged"], deps), 2);
  assert.equal(runLegacyAction([], deps), 2);
  assert.equal(launches, 0);
});

test("pure native proof records all eight mocked stages and verifies raw evidence", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const fixture = mockProofIo(value, successfulStages());
  const receipt = executeNativePackageProof(bytes, approval(value, bytes), fixture.io);
  assert.equal(receipt.status, "compiled-listed");
  assert.equal(receipt.stages.length, 8);
  assert.equal(fixture.launches(), 8);
  assert.deepEqual(receipt.listing.acl_names, NATIVE_ACL_NAMES);
  verifyNativeReceiptEvidence(receipt, value, fixture.io);
  const first = `${FIXED_ROOT}/baseline/cargo-version.stdout`;
  fixture.files.set(first, Buffer.from("forged"));
  assert.throws(
    () => verifyNativeReceiptEvidence(receipt, value, fixture.io),
    /native_package\.receipt_rejected/u,
  );
});

test("proof refuses a raw stream modified after its recorded write", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const fixture = mockProofIo(value, successfulStages());
  const write = fixture.io.writeExclusive;
  fixture.io.writeExclusive = (path, contents) => {
    write(path, contents);
    if (path.endsWith("list-tests.stderr")) {
      fixture.files.set(
        `${FIXED_ROOT}/baseline/cargo-version.stdout`,
        Buffer.from("tampered\n"),
      );
    }
  };
  assert.throws(
    () => executeNativePackageProof(bytes, approval(value, bytes), fixture.io),
    /native_package\.receipt_rejected/u,
  );
});

test("store proof binds actual canonical baseline bytes and compares the imported native set", () => {
  const baseline = binding();
  const baselineBytes = canonicalNativeJson(baseline);
  const baselineIo = mockProofIo(baseline, successfulStages());
  const baselineReceipt = executeNativePackageProof(
    baselineBytes,
    approval(baseline, baselineBytes),
    baselineIo.io,
  );
  const baselineReceiptBytes = canonicalNativeJson(baselineReceipt);
  const store = binding("store-proof");
  store.baseline = {
    receipt_path: `${FIXED_ROOT}/baseline/receipt.json`,
    receipt_sha256: sha(baselineReceiptBytes),
    binding_path: `${FIXED_ROOT}/baseline/accepted-binding.json`,
    binding_sha256: sha(baselineBytes),
  };
  const storeBytes = canonicalNativeJson(store);
  const storeIo = mockProofIo(store, successfulStages("store-proof"));
  storeIo.files.set(store.baseline.binding_path, baselineBytes);
  storeIo.files.set(store.baseline.receipt_path, baselineReceiptBytes);
  for (const [path, contents] of baselineIo.files) {
    if (path.startsWith(`${FIXED_ROOT}/baseline/`)) storeIo.files.set(path, contents);
  }
  const receipt = executeNativePackageProof(
    storeBytes,
    approval(store, storeBytes),
    storeIo.io,
  );
  assert.equal(receipt.status, "compiled-listed");
  assert.deepEqual(
    canonicalNativeJson(receipt.comparison),
    canonicalNativeJson({ native_names_equal: true, shared_inputs_equal: true }),
  );
  assert.equal(receipt.baseline_receipt_sha256, sha(baselineReceiptBytes));
  verifyNativeReceiptEvidence(receipt, store, storeIo.io);
  storeIo.files.set(store.baseline.receipt_path, Buffer.from("{}\n"));
  const rejected = executeNativePackageProof(
    storeBytes,
    approval(store, storeBytes),
    storeIo.io,
  );
  assert.deepEqual(rejected.failure, {
    stage: "input",
    code: "native_package.baseline_rejected",
  });
});

test("pure native proof stops after first process failure or raw-output overflow", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  for (const [result, code] of [
    [
      {
        status: 9,
        signal: null,
        error: null,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
      },
      "process_nonzero",
    ],
    [
      {
        status: null,
        signal: null,
        error: { code: "ENOENT" },
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
      },
      "spawn_failed",
    ],
    [
      {
        status: null,
        signal: "SIGTERM",
        error: null,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
      },
      "signal_terminated",
    ],
    [
      {
        status: 1,
        signal: null,
        error: { code: "ENOBUFS" },
        stdout: Buffer.alloc(8 * 1024 * 1024 + 1),
        stderr: Buffer.alloc(0),
      },
      "output_overflow",
    ],
  ]) {
    const fixture = mockProofIo(value, [result, ...successfulStages()]);
    const receipt = executeNativePackageProof(
      bytes,
      approval(value, bytes),
      fixture.io,
    );
    assert.equal(receipt.status, "failed");
    assert.deepEqual(receipt.failure, {
      stage: "cargo-version",
      code: `native_package.${code}`,
    });
    assert.equal(receipt.stages.length, 1);
    assert.equal(fixture.launches(), 1);
  }
});

test("native preflight rejects approval, source, config, tool, lock, and target drift before spawn", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const cases = [
    [
      "input",
      "binding_rejected",
      (fixture, accepted) => ({ ...accepted, harness_sha256: SHA.replace(/a/u, "c") }),
    ],
    [
      "input",
      "binding_rejected",
      (fixture, accepted) => ({
        ...accepted,
        binding_sha256: `sha256:${"c".repeat(64)}`,
      }),
    ],
    [
      "input",
      "binding_rejected",
      (fixture, accepted) => ({
        ...accepted,
        tools: [...accepted.tools, { name: "forged" }],
      }),
    ],
    [
      "input",
      "source_rejected",
      (fixture) => {
        fixture.io.sourceSnapshot = () => ({
          revision: OID.replace(/b/u, "c"),
          tree_oid: OID,
          tracked_clean: true,
          base_is_ancestor: true,
          diff_sha256: SHA,
          inputs: value.inputs,
        });
      },
    ],
    [
      "input",
      "input_rejected",
      (fixture) => {
        fixture.io.sourceSnapshot = () => ({
          revision: OID,
          tree_oid: OID,
          tracked_clean: true,
          base_is_ancestor: true,
          diff_sha256: SHA,
          inputs: value.inputs.slice(1),
        });
      },
    ],
    [
      "environment",
      "environment_rejected",
      (fixture) => {
        fixture.io.platform = { os: "darwin", arch: "x64" };
      },
    ],
    [
      "environment",
      "config_rejected",
      (fixture) => {
        fixture.files.set(
          "/work/checkout/.cargo/config.toml",
          Buffer.from("[net]\noffline = false\n"),
        );
      },
    ],
    [
      "environment",
      "tools_unavailable",
      (fixture) => {
        fixture.io.hashFile = (path) =>
          path === `${FIXED_ROOT}/harness.mjs` ? SHA : `sha256:${"c".repeat(64)}`;
      },
    ],
    [
      "environment",
      "lock_rejected",
      (fixture) => {
        fixture.files.set("/work/checkout/Cargo.lock", Buffer.from("not toml"));
      },
    ],
    [
      "target",
      "target_rejected",
      (fixture) => {
        fixture.io.createTarget = () => "/outside/target";
      },
    ],
  ];
  for (const [stage, code, mutate] of cases) {
    const fixture = mockProofIo(value, successfulStages());
    const accepted = approval(value, bytes);
    const changedApproval = mutate(fixture, accepted) ?? accepted;
    const receipt = executeNativePackageProof(bytes, changedApproval, fixture.io);
    assert.deepEqual(receipt.failure, { stage, code: `native_package.${code}` });
    assert.equal(receipt.stages.length, 0);
    assert.equal(fixture.launches(), 0);
  }
});

test("every mocked process slot stops the fixed sequence at its first failed exit", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const names = [
    "cargo-version",
    "rustc-version",
    "rustc-host",
    "metadata",
    "check",
    "clippy",
    "build-tests",
    "list-tests",
  ];
  for (const [index, name] of names.entries()) {
    const stages = successfulStages();
    stages[index] = {
      status: 7,
      signal: null,
      error: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    };
    const fixture = mockProofIo(value, stages);
    const receipt = executeNativePackageProof(
      bytes,
      approval(value, bytes),
      fixture.io,
    );
    assert.deepEqual(receipt.failure, {
      stage: name,
      code: "native_package.process_nonzero",
    });
    assert.equal(receipt.stages.length, index + 1);
    assert.equal(fixture.launches(), index + 1);
  }
});

test("native tool and host output must identify only the pinned Linux toolchain", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  for (const [index, output, stage] of [
    [0, "cargo 1.97.1-nightly\n", "cargo-version"],
    [1, "rustc 1.97.1-nightly\n", "rustc-version"],
    [
      2,
      "release: 1.97.1\nrelease: 1.97.1\nhost: x86_64-unknown-linux-gnu\n",
      "rustc-host",
    ],
    [
      2,
      "release: 1.97.1\nhost: x86_64-unknown-linux-gnu\nhost: aarch64-unknown-linux-gnu\n",
      "rustc-host",
    ],
  ]) {
    const stages = successfulStages();
    stages[index].stdout = Buffer.from(output);
    const fixture = mockProofIo(value, stages);
    const receipt = executeNativePackageProof(
      bytes,
      approval(value, bytes),
      fixture.io,
    );
    assert.deepEqual(receipt.failure, {
      stage,
      code: "native_package.tool_output_rejected",
    });
    assert.equal(receipt.stages.length, index + 1);
  }
});

test("null process completion is an incomplete receipt, never an invented exit", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const fixture = mockProofIo(value, [
    {
      status: null,
      signal: null,
      error: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    },
  ]);
  const receipt = executeNativePackageProof(bytes, approval(value, bytes), fixture.io);
  assert.equal(receipt.status, "incomplete");
  assert.deepEqual(receipt.failure, {
    stage: "interrupted",
    code: "native_package.interrupted",
  });
  assert.equal(receipt.stages.length, 1);
  assert.equal(receipt.stages[0].exit_code, null);
  assert.equal(fixture.launches(), 1);
});

test("spawn ENOENT with absent captures retains empty raw streams and forged incomplete outcomes fail", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const fixture = mockProofIo(value, [
    {
      status: null,
      signal: null,
      error: { code: "ENOENT" },
      stdout: null,
      stderr: null,
    },
  ]);
  const failed = executeNativePackageProof(bytes, approval(value, bytes), fixture.io);
  assert.deepEqual(failed.failure, {
    stage: "cargo-version",
    code: "native_package.spawn_failed",
  });
  assert.equal(failed.stages[0].stdout.bytes, 0);
  assert.equal(failed.stages[0].stderr.bytes, 0);
  assert.equal(
    fixture.files.get(`${FIXED_ROOT}/baseline/cargo-version.stdout`).length,
    0,
  );
  const incompleteFixture = mockProofIo(value, [
    {
      status: null,
      signal: null,
      error: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    },
  ]);
  const incomplete = executeNativePackageProof(
    bytes,
    approval(value, bytes),
    incompleteFixture.io,
  );
  for (const mutate of [
    (receipt) => {
      receipt.stages[0].exit_code = 9;
    },
    (receipt) => {
      receipt.stages[0].signal = "SIGTERM";
    },
    (receipt) => {
      receipt.stages[0].spawn_error = "ENOENT";
    },
    (receipt) => {
      receipt.stages[0].stdout.truncated = true;
    },
  ]) {
    const forged = structuredClone(incomplete);
    mutate(forged);
    assert.throws(
      () => parseNativeReceipt(canonicalNativeJson(forged), value),
      /native_package\.receipt_rejected/u,
    );
  }
});

test("artifact and listing selection reject escapes and retain ordinary raw listing lines", () => {
  const value = binding();
  const bytes = canonicalNativeJson(value);
  const run = (stages) => {
    const fixture = mockProofIo(value, stages);
    return executeNativePackageProof(bytes, approval(value, bytes), fixture.io);
  };
  for (const mutate of [
    (artifact) => ({ ...artifact, executable: "/outside/escape" }),
    (artifact) => ({ ...artifact, executable: null }),
    (artifact) => ({
      ...artifact,
      target: { ...artifact.target, src_path: "/wrong/provenance.rs" },
    }),
  ]) {
    const stages = successfulStages();
    const artifact = JSON.parse(stages[6].stdout.toString("utf8"));
    stages[6].stdout = Buffer.from(`${JSON.stringify(mutate(artifact))}\n`);
    assert.deepEqual(run(stages).failure, {
      stage: "artifact",
      code: "native_package.artifact_rejected",
    });
  }
  {
    const stages = successfulStages();
    stages[6].stdout = Buffer.from("{malformed}\n");
    assert.deepEqual(run(stages).failure, {
      stage: "artifact",
      code: "native_package.artifact_output_rejected",
    });
  }
  {
    const stages = successfulStages();
    stages[6].stdout = Buffer.concat([stages[6].stdout, stages[6].stdout]);
    assert.deepEqual(run(stages).failure, {
      stage: "artifact",
      code: "native_package.artifact_rejected",
    });
  }
  {
    const fixture = mockProofIo(value, successfulStages());
    const regular = fixture.io.stat;
    fixture.io.stat = (path) =>
      path.endsWith("lnsatd-tests")
        ? { file: true, directory: false, symlink: true }
        : regular(path);
    const receipt = executeNativePackageProof(
      bytes,
      approval(value, bytes),
      fixture.io,
    );
    assert.deepEqual(receipt.failure, {
      stage: "artifact",
      code: "native_package.artifact_rejected",
    });
  }
  {
    const fixture = mockProofIo(value, successfulStages());
    const originalHash = fixture.io.hashFile;
    let executableReads = 0;
    fixture.io.hashFile = (path) => {
      if (path.endsWith("lnsatd-tests")) {
        executableReads += 1;
        return executableReads === 1 ? SHA : `sha256:${"c".repeat(64)}`;
      }
      return originalHash(path);
    };
    const receipt = executeNativePackageProof(
      bytes,
      approval(value, bytes),
      fixture.io,
    );
    assert.deepEqual(receipt.failure, {
      stage: "listing",
      code: "native_package.native_selection_rejected",
    });
  }
  for (const mutate of [
    (names) => names.slice(1),
    (names) => [...names, names[0]],
    (names) => [
      ...names,
      "headless_native::tests::headless_native_acl_unaccepted: test",
    ],
    (names) =>
      names.map((line, index) =>
        index === 0 ? line.replace(": test", ": benchmark") : line,
      ),
    (names) => [...names, "headless_native::tests::9bad: test"],
    (names) => [...names, "headless_native::tests:::empty: test"],
  ]) {
    const stages = successfulStages();
    const names = stages[7].stdout.toString("utf8").trim().split("\n");
    stages[7].stdout = Buffer.from(`${mutate(names).join("\n")}\n`);
    assert.deepEqual(run(stages).failure, {
      stage: "listing",
      code: "native_package.native_selection_rejected",
    });
  }
  const ordinary = successfulStages();
  ordinary[7].stdout = Buffer.concat([
    ordinary[7].stdout,
    Buffer.from(
      "headless_native::benches::foo: benchmark\nheadless_native::tests::ignored_registration: test\nordinary_package::unit: test\n",
    ),
  ]);
  const listed = run(ordinary);
  assert.equal(listed.status, "compiled-listed");
  assert.ok(
    listed.listing.native_names.includes(
      "headless_native::tests::ignored_registration",
    ),
  );
  assert.ok(!listed.listing.native_names.includes("headless_native::benches::foo"));
  assert.equal(listed.listing.full_stdout_sha256, sha(ordinary[7].stdout));
});

test("legacy lock gate rejects each legacy action before any injected launch", () => {
  const good = mockProofIo(binding(), successfulStages())
    .files.get("/work/checkout/Cargo.lock")
    .toString("utf8");
  for (const action of Object.keys(LEGACY_COMMANDS)) {
    let launches = 0;
    const result = runLegacyAction([action], {
      repoRoot: "/work/checkout",
      env: {},
      realpath: (path) => path,
      home: () => "/home",
      configPaths() {},
      exists: () => false,
      log() {},
      read(path) {
        if (path.endsWith(".cargo/config.toml"))
          return '[net]\noffline = true\n\n[env]\nLIBSQLITE3_FLAGS = { value = "SQLITE_ENABLE_FILESTAT", force = true }\n';
        if (path.endsWith("Cargo.lock")) return good.replace("891ef", "991ef");
        throw new Error("unexpected read");
      },
      spawn() {
        launches += 1;
        throw new Error("lock must stop first");
      },
    });
    assert.equal(result, 1, action);
    assert.equal(launches, 0, action);
  }
});

test("legacy actions retain their preflight, policy-suite order, and stable errors", () => {
  const correctLock = mockProofIo(binding(), successfulStages())
    .files.get("/work/checkout/Cargo.lock")
    .toString("utf8");
  const config =
    '[net]\noffline = true\n\n[env]\nLIBSQLITE3_FLAGS = { value = "SQLITE_ENABLE_FILESTAT", force = true }\n';
  const run = (action, alter = (result) => result) => {
    const calls = [];
    const logs = [];
    const result = runLegacyAction([action], {
      repoRoot: "/work/checkout",
      env: {},
      realpath: (path) => path,
      home: () => "/home",
      configPaths() {},
      exists: () => false,
      log: (line) => logs.push(line),
      read: (path) => (path.endsWith("Cargo.lock") ? correctLock : config),
      spawn(program, argv) {
        calls.push([program, argv]);
        if (program === process.execPath)
          return alter({ status: 0, stdout: "", stderr: "" }, calls.length, calls);
        if (argv[0] === "--version")
          return alter(
            {
              status: 0,
              stdout: program === "cargo" ? "cargo 1.97.1\n" : "rustc 1.97.1\n",
            },
            calls.length,
            calls,
          );
        if (argv[0] === "metadata")
          return alter(
            { status: 0, stdout: JSON.stringify(metadataFixture()) },
            calls.length,
            calls,
          );
        return alter({ status: 0, stdout: "", stderr: "" }, calls.length, calls);
      },
    });
    return { result, calls, logs };
  };
  for (const action of Object.keys(LEGACY_COMMANDS)) {
    const observed = run(action);
    assert.equal(observed.result, 0, action);
    assert.deepEqual(observed.calls.at(-1), ["cargo", LEGACY_COMMANDS[action]], action);
    if (action === "fmt") {
      assert.equal(observed.calls[0][0], process.execPath);
      assert.equal(observed.calls[1][0], process.execPath);
      assert.match(
        observed.calls[0][1].at(-1),
        /sqlite-native-build-policy\.test\.mjs$/u,
      );
      assert.match(observed.calls[1][1].at(-1), /run-rust-workspace\.test\.mjs$/u);
    }
  }
  const suiteFailed = run("fmt", (result, count) =>
    count === 1 ? { ...result, status: 1 } : result,
  );
  assert.equal(suiteFailed.result, 1);
  assert.equal(suiteFailed.calls.length, 1);
  assert.deepEqual(suiteFailed.logs, ["sqlite_native.policy_tests_failed"]);
  const wrongTool = run("metadata", (result, count) =>
    count === 1 ? { ...result, stdout: "cargo 1.96.0\n" } : result,
  );
  assert.equal(wrongTool.result, 1);
  assert.deepEqual(wrongTool.logs, [
    "Cargo 1.97.1 is required; implicit toolchain installation is disabled.",
  ]);
  const badGraph = run("metadata", (result, count) =>
    count === 3 ? { ...result, stdout: "{}" } : result,
  );
  assert.equal(badGraph.result, 1);
  assert.deepEqual(badGraph.logs, ["sqlite_native.locked_graph_unverifiable"]);
  const absentCargo = run("metadata", (result, count) =>
    count === 4 ? { ...result, error: { code: "ENOENT" } } : result,
  );
  assert.equal(absentCargo.result, 1);
  assert.deepEqual(absentCargo.logs, [
    "Pinned Cargo is unavailable. Install Rust 1.97.1 explicitly or set LNSAT_CARGO_HOME.",
  ]);
});

test("module import and ordinary native CLI refusal launch no Cargo/compiler process", () => {
  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", 'import("./scripts/run-rust-workspace.mjs")'],
    { cwd: new URL("../", import.meta.url), encoding: "utf8" },
  );
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
  const denied = spawnSync(
    process.execPath,
    ["scripts/run-rust-workspace.mjs", "native-daemon-baseline"],
    { cwd: new URL("../", import.meta.url), encoding: "utf8" },
  );
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /native_package\.binding_rejected/u);
});
