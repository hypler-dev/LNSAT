// Private compile/list tooling. Source conformance is not runtime or release authority.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  lstatSync,
  readdirSync,
  mkdtempSync,
  writeFileSync,
  linkSync,
  unlinkSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, isAbsolute, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  FILESTAT_FLAGS,
  SQLITE_CARGO_CONFIG,
  verifyNativeEnvironment,
  verifyNativeConfigPaths,
  verifyNativeGraph,
} from "./sqlite-native-build-policy.mjs";

export const LEGACY_COMMANDS = {
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
for (const argv of Object.values(LEGACY_COMMANDS)) Object.freeze(argv);
Object.freeze(LEGACY_COMMANDS);
export const NATIVE_ACTIONS = Object.freeze([
  "native-daemon-baseline",
  "native-store-proof",
]);
const MODULE_NAMES = Object.freeze([
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
]);
export const NATIVE_RELOCATIONS = Object.freeze(
  MODULE_NAMES.map((name) =>
    Object.freeze({
      from: `crates/lnsatd/src/${name}`,
      to: `crates/lnsat-store/src/${name}`,
    }),
  ),
);
export const NATIVE_PATH_EDGES = Object.freeze(
  [
    {
      from: "crates/lnsatd/src/headless_native.rs",
      relative_path: "headless_native_acl.rs",
      to: "crates/lnsatd/src/headless_native_acl.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native.rs",
      relative_path: "headless_native_fdinfo.rs",
      to: "crates/lnsatd/src/headless_native_fdinfo.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native.rs",
      relative_path: "headless_native_mountinfo.rs",
      to: "crates/lnsatd/src/headless_native_mountinfo.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native.rs",
      relative_path: "headless_native_procfs.rs",
      to: "crates/lnsatd/src/headless_native_procfs.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native.rs",
      relative_path: "headless_native_readable.rs",
      to: "crates/lnsatd/src/headless_native_readable.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native.rs",
      relative_path: "headless_native_tests.rs",
      to: "crates/lnsatd/src/headless_native_tests.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_artifact.rs",
      relative_path: "headless_native_artifact_tests.rs",
      to: "crates/lnsatd/src/headless_native_artifact_tests.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_fdinfo.rs",
      relative_path: "headless_native_fdinfo_tests.rs",
      to: "crates/lnsatd/src/headless_native_fdinfo_tests.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_mountinfo.rs",
      relative_path: "headless_native_mountinfo_tests.rs",
      to: "crates/lnsatd/src/headless_native_mountinfo_tests.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_procfs.rs",
      relative_path: "headless_native_artifact.rs",
      to: "crates/lnsatd/src/headless_native_artifact.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_procfs.rs",
      relative_path: "headless_native_procfs_tests.rs",
      to: "crates/lnsatd/src/headless_native_procfs_tests.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_procfs.rs",
      relative_path: "headless_native_root_bootstrap.rs",
      to: "crates/lnsatd/src/headless_native_root_bootstrap.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_readable.rs",
      relative_path: "headless_native_readable_tests.rs",
      to: "crates/lnsatd/src/headless_native_readable_tests.rs",
    },
    {
      from: "crates/lnsatd/src/headless_native_root_bootstrap.rs",
      relative_path: "headless_native_root_bootstrap_tests.rs",
      to: "crates/lnsatd/src/headless_native_root_bootstrap_tests.rs",
    },
  ].map(Object.freeze),
);
export const NATIVE_ACL_NAMES = Object.freeze([
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
]);
const SHA = /^sha256:[0-9a-f]{64}$/u;
const OID = /^[0-9a-f]{40}$/u;
const JSON_LIMIT = 1024 * 1024;
const OUTPUT_LIMIT = 8 * 1024 * 1024;
const TARGET = "x86_64-unknown-linux-gnu";
const PRIVATE_ROOT = "/private/tmp/lnsat-native-package-proof-20261010";
const PROFILE = Object.freeze({
  os: "linux",
  arch: "x64",
  host: TARGET,
  cargo_version: "1.97.1",
  rustc_version: "1.97.1",
  target: TARGET,
  filestat: FILESTAT_FLAGS,
});
const NATIVE_NAME =
  /^headless_native::[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*$/u;
const CARGO_VERSION = /^cargo 1\.97\.1(?: \([^\r\n]+\))?$/u;
const RUSTC_VERSION = /^rustc 1\.97\.1(?: \([^\r\n]+\))?$/u;
const STAGES = Object.freeze([
  "cargo-version",
  "rustc-version",
  "rustc-host",
  "metadata",
  "check",
  "clippy",
  "build-tests",
  "list-tests",
]);
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const reject = (code) => {
  throw new Error(`native_package.${code}`);
};
const same = (a, b) => canonicalNativeJson(a).equals(canonicalNativeJson(b));
const assert = (condition, code = "receipt_rejected") => {
  if (!condition) reject(code);
};
const closed = (value, fields) =>
  assert(
    value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      same(Object.keys(value).sort(), fields.split(" ").sort()),
  );
const hash = (value) => assert(typeof value === "string" && SHA.test(value));
const oid = (value) => assert(typeof value === "string" && OID.test(value));
const text = (value) => assert(typeof value === "string");
const boolean = (value) => assert(typeof value === "boolean");
const array = (value, limit) => assert(Array.isArray(value) && value.length <= limit);
const absolute = (value) => {
  text(value);
  assert(isAbsolute(value) && resolve(value) === value && !value.includes("\\"));
};
const relpath = (value) => {
  text(value);
  assert(
    value.length > 0 &&
      !isAbsolute(value) &&
      !value.includes("\\") &&
      value.split("/").every((x) => x !== "" && x !== "." && x !== ".."),
  );
};
const beneath = (parent, path) => {
  const child = relative(parent, path);
  return (
    child !== "" &&
    child !== ".." &&
    !child.startsWith(`..${sep}`) &&
    !isAbsolute(child)
  );
};
const disjoint = (a, b) => a !== b && !beneath(a, b) && !beneath(b, a);
const phaseDirectory = (binding) =>
  join(
    binding.roots.evidence,
    binding.phase === "daemon-baseline" ? "baseline" : "store",
  );

export function nativeCommandArrays(phase) {
  assert(["daemon-baseline", "store-proof"].includes(phase), "binding_rejected");
  const pkg = phase === "daemon-baseline" ? "lnsatd" : "lnsat-store";
  return Object.freeze({
    check: Object.freeze([
      "check",
      "--package",
      pkg,
      "--lib",
      "--locked",
      "--offline",
      "--target",
      TARGET,
    ]),
    clippy: Object.freeze([
      "clippy",
      "--package",
      pkg,
      "--all-targets",
      "--locked",
      "--offline",
      "--target",
      TARGET,
      "--",
      "-D",
      "warnings",
    ]),
    buildTests: Object.freeze([
      "test",
      "--package",
      pkg,
      "--lib",
      "--no-run",
      "--locked",
      "--offline",
      "--target",
      TARGET,
      "--message-format=json",
    ]),
    list: Object.freeze(["--list", "--format=terse"]),
  });
}
export function nativeInputPaths(phase) {
  assert(["daemon-baseline", "store-proof"].includes(phase), "binding_rejected");
  return [
    ...NATIVE_RELOCATIONS.map((pair) =>
      phase === "daemon-baseline" ? pair.from : pair.to,
    ),
    "crates/lnsatd/src/lib.rs",
    "crates/lnsat-store/src/lib.rs",
    "crates/lnsatd/Cargo.toml",
    "crates/lnsat-store/Cargo.toml",
    "Cargo.toml",
    "Cargo.lock",
    "rust-toolchain.toml",
    ".cargo/config.toml",
    "scripts/sqlite-native-build-policy.mjs",
    "scripts/sqlite-native-build-policy.test.mjs",
    "scripts/run-rust-workspace.mjs",
    "scripts/run-rust-workspace.test.mjs",
  ].sort();
}
function phaseEdges(phase) {
  return NATIVE_PATH_EDGES.map((edge) =>
    phase === "daemon-baseline"
      ? { ...edge }
      : {
          ...edge,
          from: edge.from.replace("crates/lnsatd/", "crates/lnsat-store/"),
          to: edge.to.replace("crates/lnsatd/", "crates/lnsat-store/"),
        },
  );
}
function scalarString(value) {
  assert(
    Buffer.byteLength(value, "utf8") <= 4096 && !value.includes("\0"),
    "json_rejected",
  );
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = value.charCodeAt(++i);
      assert(n >= 0xdc00 && n <= 0xdfff, "json_rejected");
    } else assert(c < 0xdc00 || c > 0xdfff, "json_rejected");
  }
}
// Bounded descent: a ninth container is rejected before allocating it. Duplicate
// decoded keys are rejected before JSON.parse could discard the original value.
export function decodeCanonicalNativeJson(bytes) {
  try {
    assert(Buffer.isBuffer(bytes) && bytes.length <= JSON_LIMIT, "json_rejected");
    const raw = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
    let pos = 0,
      nodes = 0;
    const string = () => {
      const begin = pos++;
      while (pos < raw.length) {
        const c = raw[pos++];
        if (c === '"') {
          const value = JSON.parse(raw.slice(begin, pos));
          scalarString(value);
          return value;
        }
        if (c === "\\") pos++;
        else assert(c.charCodeAt(0) >= 32, "json_rejected");
      }
      reject("json_rejected");
    };
    const value = (depth) => {
      assert(++nodes <= 16384, "json_rejected");
      const c = raw[pos];
      if (c === '"') return string();
      if (c === "{" || c === "[") {
        assert(depth <= 8, "json_rejected");
        pos++;
        const object = c === "{",
          out = object ? Object.create(null) : [],
          keys = new Set(),
          end = object ? "}" : "]";
        if (raw[pos] === end) {
          pos++;
          return out;
        }
        while (true) {
          if (object) {
            assert(raw[pos] === '"', "json_rejected");
            const key = string();
            assert(/^[\x20-\x7e]+$/u.test(key) && !keys.has(key), "json_rejected");
            keys.add(key);
            assert(raw[pos++] === ":", "json_rejected");
            out[key] = value(depth + 1);
          } else out.push(value(depth + 1));
          if (raw[pos] === end) {
            pos++;
            return out;
          }
          assert(raw[pos++] === ",", "json_rejected");
        }
      }
      for (const [word, result] of [
        ["true", true],
        ["false", false],
        ["null", null],
      ])
        if (raw.startsWith(word, pos)) {
          pos += word.length;
          return result;
        }
      const match = /^-?(?:0|[1-9][0-9]*)/u.exec(raw.slice(pos));
      assert(match, "json_rejected");
      pos += match[0].length;
      const number = Number(match[0]);
      assert(Number.isSafeInteger(number) && !Object.is(number, -0), "json_rejected");
      return number;
    };
    const decoded = value(1);
    assert(
      raw.slice(pos) === "\n" && canonicalNativeJson(decoded).equals(bytes),
      "json_rejected",
    );
    return decoded;
  } catch {
    reject("json_rejected");
  }
}
export function canonicalNativeJson(value) {
  let nodes = 0;
  const seen = new Set();
  const encode = (v, depth) => {
    assert(++nodes <= 16384, "json_rejected");
    if (v === null) return "null";
    if (typeof v === "string") {
      scalarString(v);
      return JSON.stringify(v);
    }
    if (typeof v === "boolean") return String(v);
    if (typeof v === "number") {
      assert(Number.isSafeInteger(v) && !Object.is(v, -0), "json_rejected");
      return String(v);
    }
    assert(typeof v === "object" && depth <= 8 && !seen.has(v), "json_rejected");
    seen.add(v);
    let encoded;
    if (Array.isArray(v))
      encoded = `[${Array.from(v, (x) => encode(x, depth + 1)).join(",")}]`;
    else {
      assert(
        Object.getPrototypeOf(v) === Object.prototype ||
          Object.getPrototypeOf(v) === null,
        "json_rejected",
      );
      const keys = Object.keys(v).sort();
      for (const key of keys) {
        scalarString(key);
        assert(/^[\x20-\x7e]+$/u.test(key), "json_rejected");
      }
      encoded = `{${keys.map((key) => `${JSON.stringify(key)}:${encode(v[key], depth + 1)}`).join(",")}}`;
    }
    seen.delete(v);
    return encoded;
  };
  const bytes = Buffer.from(`${encode(value, 1)}\n`);
  assert(bytes.length <= JSON_LIMIT, "json_rejected");
  return bytes;
}
export function verifyRustixLock(lock) {
  try {
    assert(typeof lock === "string" && Buffer.byteLength(lock) <= 8 * 1024 * 1024);
    const records = createRequire(import.meta.url)("smol-toml").parse(lock).package;
    assert(Array.isArray(records));
    const entries = records.filter((pkg) => pkg.name === "rustix");
    assert(
      entries.length === 1 &&
        entries[0].version === "1.1.5" &&
        entries[0].source === "registry+https://github.com/rust-lang/crates.io-index" &&
        entries[0].checksum ===
          "891efababe418670775f199f0d233d84843c227a0949a883ce15b37c78d6629d",
    );
  } catch {
    reject("lock_rejected");
  }
}
function sourceShape(source, base = false) {
  closed(
    source,
    base
      ? "base_revision revision tree_oid diff_sha256"
      : "revision tree_oid tracked_clean",
  );
  oid(source.revision);
  oid(source.tree_oid);
  if (base) {
    oid(source.base_revision);
    hash(source.diff_sha256);
  } else boolean(source.tracked_clean);
}
export function parseNativeBinding(bytes) {
  try {
    const b = decodeCanonicalNativeJson(bytes);
    closed(
      b,
      "schema_version phase action source inputs relocations path_edges profile roots tools harness_sha256 baseline",
    );
    assert(b.schema_version === "lnsat.native_package_binding.v1");
    assert(
      ["daemon-baseline", "store-proof"].includes(b.phase) &&
        b.action === NATIVE_ACTIONS[b.phase === "daemon-baseline" ? 0 : 1],
    );
    sourceShape(b.source, true);
    assert(same(b.profile, PROFILE));
    hash(b.harness_sha256);
    closed(b.roots, "repository evidence target_parent cargo_home rustup_home");
    for (const path of Object.values(b.roots)) absolute(path);
    for (const owned of [b.roots.evidence, b.roots.target_parent])
      for (const other of Object.values(b.roots).filter((p) => p !== owned))
        assert(disjoint(owned, other));
    assert(new Set(Object.values(b.roots)).size === 5);
    array(b.tools, 2);
    assert(b.tools.length === 2);
    b.tools.forEach((tool, i) => {
      closed(tool, "name realpath sha256");
      assert(tool.name === ["cargo", "rustc"][i]);
      absolute(tool.realpath);
      hash(tool.sha256);
    });
    array(b.inputs, 256);
    assert(
      same(
        b.inputs.map((x) => x.path),
        nativeInputPaths(b.phase),
      ),
    );
    for (const input of b.inputs) {
      closed(input, "path git_blob_oid sha256");
      relpath(input.path);
      oid(input.git_blob_oid);
      hash(input.sha256);
    }
    array(b.relocations, 15);
    assert(b.relocations.length === 15);
    b.relocations.forEach((pair, i) => {
      closed(pair, "from to git_blob_oid sha256");
      assert(
        pair.from === NATIVE_RELOCATIONS[i].from &&
          pair.to === NATIVE_RELOCATIONS[i].to,
      );
      oid(pair.git_blob_oid);
      hash(pair.sha256);
      const input = b.inputs.find(
        (x) => x.path === (b.phase === "daemon-baseline" ? pair.from : pair.to),
      );
      assert(input.git_blob_oid === pair.git_blob_oid && input.sha256 === pair.sha256);
    });
    array(b.path_edges, 32);
    assert(same(b.path_edges, phaseEdges(b.phase)));
    if (b.phase === "daemon-baseline") assert(b.baseline === null);
    else {
      closed(b.baseline, "receipt_path receipt_sha256 binding_path binding_sha256");
      assert(
        b.baseline.receipt_path === `${PRIVATE_ROOT}/baseline/receipt.json` &&
          b.baseline.binding_path === `${PRIVATE_ROOT}/baseline/accepted-binding.json`,
      );
      hash(b.baseline.receipt_sha256);
      hash(b.baseline.binding_sha256);
    }
    return b;
  } catch {
    reject("binding_rejected");
  }
}
function expectedStage(index, b, artifact) {
  const arrays = nativeCommandArrays(b.phase);
  const argv = [
    ["--version"],
    ["--version"],
    ["-vV"],
    ["metadata", "--format-version", "1", "--locked", "--offline"],
    arrays.check,
    arrays.clippy,
    arrays.buildTests,
    arrays.list,
  ][index];
  return {
    name: STAGES[index],
    program:
      index === 7
        ? artifact?.executable_path
        : b.tools[index === 1 || index === 2 ? 1 : 0].realpath,
    argv,
  };
}
function success(stage) {
  return (
    stage.exit_code === 0 &&
    stage.signal === null &&
    stage.spawn_error === null &&
    !stage.stdout.truncated &&
    !stage.stderr.truncated
  );
}
const FAILURE_RULES = Object.freeze({
  input: [
    0,
    ["binding_rejected", "source_rejected", "input_rejected", "baseline_rejected"],
  ],
  environment: [
    0,
    ["environment_rejected", "config_rejected", "tools_unavailable", "lock_rejected"],
  ],
  target: [0, ["target_rejected"]],
  graph: [4, ["metadata_rejected", "graph_rejected"]],
  artifact: [7, ["artifact_output_rejected", "artifact_rejected"]],
  listing: [8, ["listing_rejected", "native_selection_rejected"]],
  comparison: [8, ["baseline_comparison_rejected"]],
  "final-input": [8, ["final_input_rejected"]],
});
export function parseNativeReceipt(bytes, b) {
  try {
    b = parseNativeBinding(canonicalNativeJson(b));
    const r = decodeCanonicalNativeJson(bytes);
    closed(
      r,
      "schema_version phase action binding_sha256 source_before source_after target_directory stages artifact listing baseline_receipt_sha256 comparison status failure",
    );
    assert(
      r.schema_version === "lnsat.native_package_receipt.v1" &&
        r.phase === b.phase &&
        r.action === b.action &&
        r.binding_sha256 === digest(canonicalNativeJson(b)),
    );
    sourceShape(r.source_before);
    if (r.source_after !== null) sourceShape(r.source_after);
    if (r.target_directory !== null) {
      absolute(r.target_directory);
      assert(beneath(b.roots.target_parent, r.target_directory));
    }
    array(r.stages, 8);
    r.stages.forEach((stage, i) => {
      closed(stage, "name program argv exit_code signal spawn_error stdout stderr");
      const expected = expectedStage(i, b, r.artifact);
      assert(
        stage.name === expected.name &&
          stage.program === expected.program &&
          same(stage.argv, expected.argv),
      );
      assert(
        stage.exit_code === null ||
          (Number.isSafeInteger(stage.exit_code) && stage.exit_code >= 0),
      );
      assert(
        stage.signal === null ||
          (typeof stage.signal === "string" && /^SIG[A-Z0-9]+$/u.test(stage.signal)),
      );
      assert(
        stage.spawn_error === null ||
          (typeof stage.spawn_error === "string" &&
            /^[A-Z][A-Z0-9_]*$/u.test(stage.spawn_error)),
      );
      if (stage.signal !== null || stage.spawn_error !== null)
        assert(stage.exit_code === null);
      assert(stage.signal === null || stage.spawn_error === null);
      for (const [stream, data] of [
        ["stdout", stage.stdout],
        ["stderr", stage.stderr],
      ]) {
        closed(data, "path bytes sha256 truncated");
        assert(data.path === `${stage.name}.${stream}`);
        relpath(data.path);
        hash(data.sha256);
        boolean(data.truncated);
        assert(
          Number.isSafeInteger(data.bytes) &&
            data.bytes >= 0 &&
            data.bytes <= OUTPUT_LIMIT,
        );
      }
    });
    if (r.stages.length) assert(r.target_directory !== null);
    if (r.artifact !== null) {
      closed(
        r.artifact,
        "package_id target_name target_kind source_path test_profile executable_path executable_sha256",
      );
      text(r.artifact.package_id);
      text(r.artifact.target_name);
      assert(same(r.artifact.target_kind, ["lib"]) && r.artifact.test_profile === true);
      absolute(r.artifact.source_path);
      assert(
        r.artifact.source_path ===
          join(
            b.roots.repository,
            b.phase === "daemon-baseline"
              ? "crates/lnsatd/src/lib.rs"
              : "crates/lnsat-store/src/lib.rs",
          ),
      );
      absolute(r.artifact.executable_path);
      assert(
        r.target_directory !== null &&
          beneath(r.target_directory, r.artifact.executable_path),
      );
      hash(r.artifact.executable_sha256);
      assert(r.stages.length >= 7 && r.stages.slice(0, 7).every(success));
    }
    if (r.listing !== null) {
      closed(r.listing, "native_names acl_names full_stdout_sha256");
      array(r.listing.native_names, 1024);
      assert(
        r.listing.native_names.length > 0 &&
          same(r.listing.native_names, [...new Set(r.listing.native_names)].sort()),
      );
      for (const name of r.listing.native_names)
        assert(typeof name === "string" && NATIVE_NAME.test(name));
      assert(
        same(r.listing.acl_names, NATIVE_ACL_NAMES) &&
          NATIVE_ACL_NAMES.every((name) => r.listing.native_names.includes(name)) &&
          same(
            r.listing.native_names.filter((name) =>
              name.startsWith("headless_native::tests::headless_native_acl_"),
            ),
            NATIVE_ACL_NAMES,
          ),
      );
      assert(
        r.stages.length === 8 &&
          r.stages.every(success) &&
          r.artifact !== null &&
          r.listing.full_stdout_sha256 === r.stages[7].stdout.sha256,
      );
    }
    if (b.phase === "daemon-baseline")
      assert(r.baseline_receipt_sha256 === null && r.comparison === null);
    else
      assert(
        r.baseline_receipt_sha256 === null ||
          r.baseline_receipt_sha256 === b.baseline.receipt_sha256,
      );
    assert(["compiled-listed", "failed", "incomplete"].includes(r.status));
    if (r.status === "compiled-listed") {
      assert(
        r.failure === null &&
          r.stages.length === 8 &&
          r.stages.every(success) &&
          r.artifact !== null &&
          r.listing !== null,
      );
      for (const source of [r.source_before, r.source_after])
        assert(
          source !== null &&
            source.revision === b.source.revision &&
            source.tree_oid === b.source.tree_oid &&
            source.tracked_clean === true,
        );
      if (b.phase === "store-proof")
        assert(
          r.baseline_receipt_sha256 === b.baseline.receipt_sha256 &&
            same(r.comparison, { native_names_equal: true, shared_inputs_equal: true }),
        );
    } else {
      assert(r.comparison === null);
      closed(r.failure, "stage code");
      const f = r.failure;
      assert(f.code.startsWith("native_package."));
      const code = f.code.slice(15),
        index = STAGES.indexOf(f.stage);
      if (r.status === "incomplete") {
        assert(f.stage === "interrupted" && code === "interrupted");
        r.stages.forEach((stage, i) =>
          assert(
            success(stage) ||
              (i === r.stages.length - 1 &&
                stage.exit_code === null &&
                stage.signal === null &&
                stage.spawn_error === null &&
                !stage.stdout.truncated &&
                !stage.stderr.truncated),
          ),
        );
      } else if (index >= 0) {
        assert(
          r.stages.length === index + 1 && r.stages.slice(0, index).every(success),
        );
        const last = r.stages[index];
        if (code === "output_overflow")
          assert(last.stdout.truncated || last.stderr.truncated);
        else {
          assert(!last.stdout.truncated && !last.stderr.truncated);
          if (code === "spawn_failed")
            assert(
              last.exit_code === null &&
                last.signal === null &&
                last.spawn_error !== null,
            );
          else if (code === "signal_terminated")
            assert(
              last.exit_code === null &&
                last.signal !== null &&
                last.spawn_error === null,
            );
          else if (code === "process_nonzero")
            assert(
              last.exit_code > 0 && last.signal === null && last.spawn_error === null,
            );
          else assert(index < 3 && code === "tool_output_rejected" && success(last));
        }
      } else {
        const rule = FAILURE_RULES[f.stage];
        assert(
          rule &&
            rule[1].includes(code) &&
            r.stages.length === rule[0] &&
            r.stages.every(success),
        );
        if (f.stage === "comparison")
          assert(
            b.phase === "store-proof" && r.artifact !== null && r.listing !== null,
          );
        if (f.stage === "listing") assert(r.artifact !== null && r.listing === null);
        if (f.stage === "final-input")
          assert(r.artifact !== null && r.listing !== null);
        if (["input", "environment", "target", "graph", "artifact"].includes(f.stage))
          assert(r.artifact === null && r.listing === null);
        if (["input", "environment", "target"].includes(f.stage))
          assert(r.source_after === null);
        if (f.stage === "input") assert(r.target_directory === null);
      }
      if (r.stages.length < 7) assert(r.artifact === null);
      if (
        r.stages.length < 8 ||
        (r.status === "failed" && !["comparison", "final-input"].includes(f.stage))
      )
        assert(r.listing === null);
      if (r.status === "failed" && f.stage !== "final-input")
        assert(r.source_after === null);
      const failedIndex = r.stages.findIndex((stage) => !success(stage));
      assert(failedIndex < 0 || failedIndex === r.stages.length - 1);
    }
    return r;
  } catch {
    reject("receipt_rejected");
  }
}
function checkedFile(path, io) {
  assert(io.realpath(path) === path && io.stat(path).file && !io.stat(path).symlink);
}
function parsedOutput(bytes) {
  assert(Buffer.isBuffer(bytes) && bytes.length <= OUTPUT_LIMIT);
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
}
function hostOutput(bytes) {
  const lines = parsedOutput(bytes).trim().split("\n");
  return (
    lines.filter((line) => line.startsWith("host:")).length === 1 &&
    lines.filter((line) => line.startsWith("release:")).length === 1 &&
    lines.includes(`host: ${TARGET}`) &&
    lines.includes("release: 1.97.1")
  );
}
function metadataOutput(bytes) {
  try {
    return JSON.parse(parsedOutput(bytes));
  } catch {
    reject("metadata_rejected");
  }
}
function selectArtifact(bytes, metadata, b, target, io) {
  let messages;
  try {
    const raw = parsedOutput(bytes);
    assert(raw.endsWith("\n"));
    messages = raw
      .slice(0, -1)
      .split("\n")
      .map((line) => JSON.parse(line));
  } catch {
    reject("artifact_output_rejected");
  }
  try {
    const name = b.phase === "daemon-baseline" ? "lnsatd" : "lnsat-store";
    const packages = metadata.packages.filter((pkg) => pkg.name === name);
    assert(packages.length === 1);
    const pkg = packages[0];
    const libs = pkg.targets.filter(
      (t) =>
        same(t.kind, ["lib"]) &&
        t.src_path === join(b.roots.repository, `crates/${name}/src/lib.rs`),
    );
    assert(libs.length === 1);
    const lib = libs[0];
    const selected = messages.filter(
      (m) =>
        m.reason === "compiler-artifact" &&
        m.package_id === pkg.id &&
        m.target?.name === lib.name &&
        m.profile?.test === true,
    );
    assert(selected.length === 1);
    const item = selected[0];
    assert(
      same(item.target.kind, ["lib"]) &&
        item.target.src_path === lib.src_path &&
        typeof item.executable === "string",
    );
    absolute(item.executable);
    assert(beneath(target, item.executable));
    checkedFile(item.executable, io);
    const executableSha = io.hashFile(item.executable);
    hash(executableSha);
    return {
      package_id: pkg.id,
      target_name: lib.name,
      target_kind: ["lib"],
      source_path: lib.src_path,
      test_profile: true,
      executable_path: item.executable,
      executable_sha256: executableSha,
    };
  } catch {
    reject("artifact_rejected");
  }
}
function selectListing(bytes) {
  let raw;
  try {
    raw = parsedOutput(bytes);
    assert(raw.endsWith("\n") && !raw.includes("\0"));
  } catch {
    reject("listing_rejected");
  }
  const native = [];
  try {
    for (const line of raw.slice(0, -1).split("\n")) {
      if (!line.startsWith("headless_native::")) continue;
      if (line.endsWith(": benchmark")) {
        assert(NATIVE_NAME.test(line.slice(0, -11)));
        continue;
      }
      assert(line.endsWith(": test"));
      const name = line.slice(0, -6);
      assert(NATIVE_NAME.test(name));
      native.push(name);
    }
    assert(
      native.length > 0 &&
        native.length <= 1024 &&
        new Set(native).size === native.length,
    );
    native.sort();
    const acl = native.filter((name) =>
      name.startsWith("headless_native::tests::headless_native_acl_"),
    );
    assert(same(acl, NATIVE_ACL_NAMES));
    return { native_names: native, acl_names: acl, full_stdout_sha256: digest(bytes) };
  } catch {
    reject("native_selection_rejected");
  }
}
function verifySource(binding, io, actual = io.sourceSnapshot(binding)) {
  sourceShape({
    revision: actual.revision,
    tree_oid: actual.tree_oid,
    tracked_clean: actual.tracked_clean,
  });
  assert(
    actual.base_is_ancestor === true &&
      actual.revision === binding.source.revision &&
      actual.tree_oid === binding.source.tree_oid &&
      actual.tracked_clean === true &&
      actual.diff_sha256 === binding.source.diff_sha256,
    "source_rejected",
  );
  assert(same(actual.inputs, binding.inputs), "input_rejected");
  for (const input of binding.inputs)
    checkedFile(join(binding.roots.repository, input.path), io);
  return {
    revision: actual.revision,
    tree_oid: actual.tree_oid,
    tracked_clean: actual.tracked_clean,
  };
}
function verifyApproval(binding, bytes, approval, io) {
  closed(
    approval,
    "binding_sha256 harness_sha256 harness_path binding_path source roots tools baseline",
  );
  assert(
    approval.binding_sha256 === digest(bytes) &&
      approval.harness_sha256 === binding.harness_sha256 &&
      approval.harness_path === `${PRIVATE_ROOT}/harness.mjs` &&
      approval.binding_path === `${PRIVATE_ROOT}/accepted-binding.json`,
  );
  for (const key of ["source", "roots", "tools", "baseline"])
    assert(same(approval[key], binding[key]));
  checkedFile(approval.harness_path, io);
  assert(io.hashFile(approval.harness_path) === approval.harness_sha256);
  for (const root of Object.values(binding.roots))
    assert(
      io.realpath(root) === root && io.stat(root).directory && !io.stat(root).symlink,
    );
}
function sharedBindings(a, b) {
  assert(a.phase === "daemon-baseline" && b.phase === "store-proof");
  assert(
    a.roots.cargo_home === b.roots.cargo_home &&
      a.roots.rustup_home === b.roots.rustup_home,
  );
  assert(
    same(a.relocations, b.relocations) &&
      same(a.profile, b.profile) &&
      same(a.tools, b.tools) &&
      a.harness_sha256 === b.harness_sha256,
  );
  const changing = new Set([
    "crates/lnsatd/src/lib.rs",
    "crates/lnsat-store/src/lib.rs",
    "crates/lnsatd/Cargo.toml",
    "crates/lnsat-store/Cargo.toml",
    "Cargo.lock",
    "scripts/sqlite-native-build-policy.mjs",
    "scripts/sqlite-native-build-policy.test.mjs",
  ]);
  for (const input of a.inputs)
    if (
      !changing.has(input.path) &&
      !input.path.startsWith("crates/lnsatd/src/headless_native")
    )
      assert(
        same(
          input,
          b.inputs.find((other) => other.path === input.path),
        ),
      );
}
function baselineEvidence(b, io) {
  checkedFile(b.baseline.binding_path, io);
  checkedFile(b.baseline.receipt_path, io);
  const bytes = io.read(b.baseline.binding_path),
    receiptBytes = io.read(b.baseline.receipt_path);
  assert(
    digest(bytes) === b.baseline.binding_sha256 &&
      digest(receiptBytes) === b.baseline.receipt_sha256,
  );
  const binding = parseNativeBinding(bytes),
    receipt = parseNativeReceipt(receiptBytes, binding);
  assert(
    receipt.status === "compiled-listed" &&
      phaseDirectory(binding) === `${PRIVATE_ROOT}/baseline`,
  );
  verifyNativeReceiptEvidence(receipt, binding, io);
  sharedBindings(binding, b);
  return { binding, receipt };
}
export function verifyNativeReceiptEvidence(receipt, binding, io) {
  try {
    const r = parseNativeReceipt(canonicalNativeJson(receipt), binding),
      streams = [];
    for (const stage of r.stages) {
      const outputs = {};
      for (const key of ["stdout", "stderr"]) {
        const stream = stage[key],
          path = join(phaseDirectory(binding), stream.path);
        checkedFile(path, io);
        const bytes = io.read(path);
        assert(
          Buffer.isBuffer(bytes) &&
            bytes.length === stream.bytes &&
            digest(bytes) === stream.sha256,
        );
        outputs[key] = bytes;
      }
      streams.push(outputs);
    }
    if (r.status !== "compiled-listed") return;
    assert(CARGO_VERSION.test(parsedOutput(streams[0].stdout).trim()));
    assert(RUSTC_VERSION.test(parsedOutput(streams[1].stdout).trim()));
    assert(hostOutput(streams[2].stdout));
    const metadata = metadataOutput(streams[3].stdout);
    verifyNativeGraph(metadata);
    const artifact = selectArtifact(
      streams[6].stdout,
      metadata,
      binding,
      r.target_directory,
      io,
    );
    assert(same(artifact, r.artifact));
    assert(same(selectListing(streams[7].stdout), r.listing));
    if (binding.phase === "store-proof") {
      const baseline = baselineEvidence(binding, io);
      assert(same(baseline.receipt.listing.native_names, r.listing.native_names));
    }
  } catch {
    reject("receipt_rejected");
  }
}

// Pure seam for offline conformance tests. Production callers use the fixed real
// adapter below; no CLI/environment selector can substitute this adapter.
export function executeNativePackageProof(bindingBytes, approval, io) {
  const b = parseNativeBinding(bindingBytes); // No receipt can claim a rejected identity.
  const observed = io.sourceSnapshot(b);
  const before = {
    revision: observed.revision,
    tree_oid: observed.tree_oid,
    tracked_clean: observed.tracked_clean,
  };
  sourceShape(before);
  const receipt = {
    schema_version: "lnsat.native_package_receipt.v1",
    phase: b.phase,
    action: b.action,
    binding_sha256: digest(bindingBytes),
    source_before: before,
    source_after: null,
    target_directory: null,
    stages: [],
    artifact: null,
    listing: null,
    baseline_receipt_sha256: null,
    comparison: null,
    status: "failed",
    failure: null,
  };
  const fail = (stage, code) => {
    receipt.status = "failed";
    receipt.comparison = null;
    receipt.failure = { stage, code: `native_package.${code}` };
    return receipt;
  };
  let baseline, metadata;
  try {
    verifyApproval(b, bindingBytes, approval, io);
  } catch {
    return fail("input", "binding_rejected");
  }
  try {
    verifySource(b, io, observed);
  } catch (error) {
    return fail(
      "input",
      error.message === "native_package.input_rejected"
        ? "input_rejected"
        : "source_rejected",
    );
  }
  if (b.phase === "store-proof") {
    try {
      baseline = baselineEvidence(b, io);
      receipt.baseline_receipt_sha256 = b.baseline.receipt_sha256;
    } catch {
      return fail("input", "baseline_rejected");
    }
  }
  try {
    assert(
      io.platform.os === "linux" &&
        io.platform.arch === "x64" &&
        !Object.hasOwn(io.env, "CARGO_TARGET_DIR") &&
        !Object.hasOwn(io.env, "RUSTUP_TOOLCHAIN"),
    );
    verifyNativeEnvironment(io.env, SQLITE_CARGO_CONFIG);
  } catch {
    return fail("environment", "environment_rejected");
  }
  try {
    io.verifyConfigPaths(b.roots.repository, b.roots.cargo_home);
    verifyNativeEnvironment(
      {},
      io.read(join(b.roots.repository, ".cargo/config.toml")).toString("utf8"),
    );
  } catch {
    return fail("environment", "config_rejected");
  }
  try {
    for (const tool of b.tools) {
      checkedFile(tool.realpath, io);
      assert(io.hashFile(tool.realpath) === tool.sha256);
    }
  } catch {
    return fail("environment", "tools_unavailable");
  }
  try {
    verifyRustixLock(io.read(join(b.roots.repository, "Cargo.lock")).toString("utf8"));
  } catch {
    return fail("environment", "lock_rejected");
  }
  try {
    const target = io.createTarget(b.roots.target_parent);
    absolute(target);
    assert(
      beneath(b.roots.target_parent, target) &&
        io.realpath(target) === target &&
        io.stat(target).directory &&
        !io.stat(target).symlink &&
        io.listDirectory(target).length === 0,
    );
    receipt.target_directory = target;
  } catch {
    return fail("target", "target_rejected");
  }
  const env = {
    ...io.env,
    RUSTUP_HOME: b.roots.rustup_home,
    CARGO_HOME: b.roots.cargo_home,
    RUSTUP_AUTO_INSTALL: "0",
    CARGO_NET_OFFLINE: "true",
    LIBSQLITE3_FLAGS: FILESTAT_FLAGS,
    CARGO_TARGET_DIR: receipt.target_directory,
    RUSTC: b.tools[1].realpath,
  };
  for (let i = 0; i < 8; i++) {
    const stage = expectedStage(i, b, receipt.artifact);
    let result;
    try {
      result = io.spawn(stage.program, stage.argv, {
        cwd: b.roots.repository,
        env,
        maxBuffer: OUTPUT_LIMIT,
      });
    } catch (error) {
      result = {
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        status: null,
        signal: null,
        error: {
          code: /^[A-Z][A-Z0-9_]*$/u.test(error.code) ? error.code : "SPAWN_ERROR",
        },
      };
    }
    // spawnSync reports null capture buffers when the child could not start.
    // No captured bytes means an empty stream, while its real error stays visible.
    if (result.stdout == null) result.stdout = Buffer.alloc(0);
    if (result.stderr == null) result.stderr = Buffer.alloc(0);
    assert(Buffer.isBuffer(result.stdout) && Buffer.isBuffer(result.stderr));
    const overflow =
      result.stdout.length > OUTPUT_LIMIT ||
      result.stderr.length > OUTPUT_LIMIT ||
      result.error?.code === "ENOBUFS";
    const logged = {
      ...stage,
      exit_code: result.status ?? null,
      signal: result.signal ?? null,
      spawn_error:
        result.error && !overflow
          ? /^[A-Z][A-Z0-9_]*$/u.test(result.error.code)
            ? result.error.code
            : "SPAWN_ERROR"
          : null,
    };
    if (logged.signal !== null || logged.spawn_error !== null) logged.exit_code = null;
    for (const key of ["stdout", "stderr"]) {
      const raw = result[key].subarray(0, OUTPUT_LIMIT),
        path = `${stage.name}.${key}`;
      // An unwriteable evidence directory produces missing receipt, not fake hashes.
      io.writeExclusive(join(phaseDirectory(b), path), raw);
      logged[key] = {
        path,
        bytes: raw.length,
        sha256: digest(raw),
        truncated:
          result[key].length > OUTPUT_LIMIT ||
          (overflow &&
            result.stdout.length <= OUTPUT_LIMIT &&
            result.stderr.length <= OUTPUT_LIMIT),
      };
    }
    receipt.stages.push(logged);
    if (overflow) return fail(stage.name, "output_overflow");
    if (logged.spawn_error !== null) return fail(stage.name, "spawn_failed");
    if (logged.signal !== null) return fail(stage.name, "signal_terminated");
    if (logged.exit_code === null) {
      receipt.status = "incomplete";
      receipt.failure = { stage: "interrupted", code: "native_package.interrupted" };
      return receipt;
    }
    if (logged.exit_code !== 0) {
      assert(logged.exit_code > 0);
      return fail(stage.name, "process_nonzero");
    }
    if (i < 3) {
      try {
        const output = parsedOutput(result.stdout).trim();
        assert(
          i === 0
            ? CARGO_VERSION.test(output)
            : i === 1
              ? RUSTC_VERSION.test(output)
              : hostOutput(result.stdout),
        );
      } catch {
        return fail(stage.name, "tool_output_rejected");
      }
    } else if (i === 3) {
      try {
        metadata = metadataOutput(result.stdout);
      } catch {
        return fail("graph", "metadata_rejected");
      }
      try {
        verifyNativeGraph(metadata);
      } catch {
        return fail("graph", "graph_rejected");
      }
    } else if (i === 6) {
      try {
        receipt.artifact = selectArtifact(
          result.stdout,
          metadata,
          b,
          receipt.target_directory,
          io,
        );
      } catch (error) {
        return fail(
          "artifact",
          error.message === "native_package.artifact_output_rejected"
            ? "artifact_output_rejected"
            : "artifact_rejected",
        );
      }
    } else if (i === 7) {
      try {
        assert(
          io.hashFile(receipt.artifact.executable_path) ===
            receipt.artifact.executable_sha256,
        );
        receipt.listing = selectListing(result.stdout);
      } catch (error) {
        return fail(
          "listing",
          error.message === "native_package.listing_rejected"
            ? "listing_rejected"
            : "native_selection_rejected",
        );
      }
      if (baseline) {
        try {
          sharedBindings(baseline.binding, b);
          assert(
            same(baseline.receipt.listing.native_names, receipt.listing.native_names),
          );
        } catch {
          return fail("comparison", "baseline_comparison_rejected");
        }
      }
      try {
        const after = io.sourceSnapshot(b);
        receipt.source_after = {
          revision: after.revision,
          tree_oid: after.tree_oid,
          tracked_clean: after.tracked_clean,
        };
        verifySource(b, io, after);
        for (const tool of b.tools) assert(io.hashFile(tool.realpath) === tool.sha256);
        assert(io.hashFile(approval.harness_path) === b.harness_sha256);
      } catch {
        return fail("final-input", "final_input_rejected");
      }
    }
  }
  receipt.status = "compiled-listed";
  receipt.failure = null;
  if (b.phase === "store-proof")
    receipt.comparison = { native_names_equal: true, shared_inputs_equal: true };
  const checked = parseNativeReceipt(canonicalNativeJson(receipt), b);
  verifyNativeReceiptEvidence(checked, b, io);
  return checked;
}

export function runLegacyAction(argv, deps = {}) {
  const env = deps.env ?? process.env,
    log = deps.log ?? console.error,
    spawn = deps.spawn ?? spawnSync;
  if (argv.length !== 1 || !Object.hasOwn(LEGACY_COMMANDS, argv[0])) {
    if (argv.length === 1 && NATIVE_ACTIONS.includes(argv[0])) {
      log("native_package.binding_rejected");
      return 1;
    }
    log(
      `usage: node scripts/run-rust-workspace.mjs <${Object.keys(LEGACY_COMMANDS).join("|")}>`,
    );
    return 2;
  }
  const action = argv[0],
    read = deps.read ?? readFileSync,
    exists = deps.exists ?? existsSync;
  let repoRoot, cargoHome, rustupHome;
  try {
    repoRoot = (deps.realpath ?? realpathSync)(
      deps.repoRoot ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
    );
    const home = (deps.home ?? homedir)();
    cargoHome = resolve(
      repoRoot,
      env.LNSAT_CARGO_HOME ?? join(home, ".local", "share", "lnsat-cargo"),
    );
    rustupHome = env.LNSAT_RUSTUP_HOME ?? join(home, ".local", "share", "lnsat-rustup");
    (deps.configPaths ?? verifyNativeConfigPaths)(repoRoot, cargoHome);
    verifyNativeEnvironment(env, read(join(repoRoot, ".cargo/config.toml"), "utf8"));
    verifyRustixLock(read(join(repoRoot, "Cargo.lock"), "utf8"));
  } catch {
    log("sqlite_native.build_policy_rejected");
    return 1;
  }
  const cargoPath = join(cargoHome, "bin", "cargo"),
    rustcPath = join(cargoHome, "bin", "rustc");
  const cargo = exists(cargoPath) ? cargoPath : "cargo",
    rustc = exists(rustcPath) ? rustcPath : "rustc";
  const toolEnv = {
    ...env,
    RUSTUP_HOME: rustupHome,
    CARGO_HOME: cargoHome,
    RUSTUP_AUTO_INSTALL: "0",
    CARGO_NET_OFFLINE: "true",
    LIBSQLITE3_FLAGS: FILESTAT_FLAGS,
  };
  if (action === "fmt") {
    for (const suite of [
      "sqlite-native-build-policy.test.mjs",
      "run-rust-workspace.test.mjs",
    ]) {
      const result = spawn(
        deps.nodeExecutable ?? process.execPath,
        ["--test", join(repoRoot, "scripts", suite)],
        { cwd: repoRoot, env, stdio: "inherit" },
      );
      if (result.error || result.status !== 0) {
        log("sqlite_native.policy_tests_failed");
        return 1;
      }
    }
  }
  for (const [tool, expected, label] of [
    [cargo, /^cargo 1\.97\.1\b/u, "Cargo 1.97.1"],
    [rustc, /^rustc 1\.97\.1\b/u, "rustc 1.97.1"],
  ]) {
    const result = spawn(tool, ["--version"], {
      cwd: repoRoot,
      env: toolEnv,
      encoding: "utf8",
    });
    if (result.error || result.status !== 0 || !expected.test(result.stdout.trim())) {
      log(`${label} is required; implicit toolchain installation is disabled.`);
      return 1;
    }
  }
  const metadata = spawn(
    cargo,
    ["metadata", "--format-version", "1", "--locked", "--offline"],
    { cwd: repoRoot, env: toolEnv, encoding: "utf8", maxBuffer: OUTPUT_LIMIT },
  );
  try {
    if (metadata.error || metadata.status !== 0) throw new Error();
    verifyNativeGraph(JSON.parse(metadata.stdout));
  } catch {
    log("sqlite_native.locked_graph_unverifiable");
    return 1;
  }
  const result = spawn(cargo, LEGACY_COMMANDS[action], {
    cwd: repoRoot,
    env: toolEnv,
    stdio: "inherit",
  });
  if (result.error) {
    log(
      result.error.code === "ENOENT"
        ? "Pinned Cargo is unavailable. Install Rust 1.97.1 explicitly or set LNSAT_CARGO_HOME."
        : result.error.message,
    );
    return 1;
  }
  return result.status ?? 1;
}

function readBounded(path, limit = OUTPUT_LIMIT) {
  const fd = openSync(path, "r");
  try {
    const chunks = [];
    let size = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(65536, limit + 1 - size)),
        n = readSync(fd, chunk, 0, chunk.length, null);
      if (n === 0) break;
      size += n;
      assert(size <= limit);
      chunks.push(chunk.subarray(0, n));
    }
    return Buffer.concat(chunks, size);
  } finally {
    closeSync(fd);
  }
}
function hashPhysicalFile(path) {
  const fd = openSync(path, "r"),
    hash = createHash("sha256"),
    buffer = Buffer.alloc(65536);
  try {
    let n;
    while ((n = readSync(fd, buffer, 0, buffer.length, null)) > 0)
      hash.update(buffer.subarray(0, n));
    return `sha256:${hash.digest("hex")}`;
  } finally {
    closeSync(fd);
  }
}
function realAdapter(binding) {
  const repository = binding.roots.repository;
  const git = (args) => {
    const result = spawnSync("git", args, {
      cwd: repository,
      env: {
        PATH: process.env.PATH,
        HOME: homedir(),
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_OPTIONAL_LOCKS: "0",
      },
      maxBuffer: OUTPUT_LIMIT,
    });
    assert(!result.error && result.status === 0);
    return result.stdout;
  };
  return {
    platform: { os: process.platform, arch: process.arch },
    env: process.env,
    read: readBounded,
    hashFile: hashPhysicalFile,
    realpath: realpathSync,
    stat: (path) => {
      const stat = lstatSync(path);
      return {
        file: stat.isFile(),
        directory: stat.isDirectory(),
        symlink: stat.isSymbolicLink(),
      };
    },
    verifyConfigPaths: verifyNativeConfigPaths,
    listDirectory: readdirSync,
    createTarget: (parent) => mkdtempSync(join(parent, "native-package-")),
    spawn: spawnSync,
    writeExclusive: (path, bytes) =>
      writeFileSync(path, bytes, { flag: "wx", mode: 0o600 }),
    sourceSnapshot: (b) => {
      const revision = git(["rev-parse", "HEAD"]).toString().trim(),
        tree_oid = git(["rev-parse", "HEAD^{tree}"]).toString().trim();
      const tracked_clean =
        git(["status", "--porcelain=v1", "--untracked-files=all"]).length === 0;
      git(["merge-base", "--is-ancestor", b.source.base_revision, revision]);
      const diff = git([
        "-c",
        "color.ui=false",
        "-c",
        "core.abbrev=40",
        "-c",
        "core.attributesFile=/dev/null",
        "-c",
        "core.quotePath=true",
        "-c",
        "diff.algorithm=myers",
        "-c",
        "diff.context=3",
        "-c",
        "diff.external=",
        "-c",
        "diff.indentHeuristic=false",
        "-c",
        "diff.mnemonicPrefix=false",
        "-c",
        "diff.noprefix=false",
        "-c",
        "diff.renames=false",
        "diff",
        "--binary",
        "--diff-algorithm=myers",
        "--dst-prefix=b/",
        "--full-index",
        "--no-color",
        "--no-ext-diff",
        "--no-indent-heuristic",
        "--no-renames",
        "--no-textconv",
        "--src-prefix=a/",
        "--submodule=short",
        "--unified=3",
        b.source.base_revision,
        revision,
        "--",
      ]);
      const inputs = nativeInputPaths(b.phase).map((path) => ({
        path,
        git_blob_oid: git(["rev-parse", `${revision}:${path}`])
          .toString()
          .trim(),
        sha256: hashPhysicalFile(join(repository, path)),
      }));
      return {
        revision,
        tree_oid,
        tracked_clean,
        base_is_ancestor: true,
        diff_sha256: digest(diff),
        inputs,
      };
    },
  };
}

// Called only by the separately reviewed private harness. This function neither
// establishes operator acceptance nor opens an execution gate by itself.
export function runNativePackageProof(bindingBytes, independentRecord) {
  const binding = parseNativeBinding(bindingBytes),
    io = realAdapter(binding);
  verifyApproval(binding, bindingBytes, independentRecord, io);
  checkedFile(independentRecord.binding_path, io);
  assert(
    digest(readBounded(independentRecord.binding_path, JSON_LIMIT)) ===
      independentRecord.binding_sha256,
    "binding_rejected",
  );
  const outputDirectory = phaseDirectory(binding);
  assert(
    io.realpath(outputDirectory) === outputDirectory &&
      io.stat(outputDirectory).directory &&
      !io.stat(outputDirectory).symlink,
  );
  const receipt = executeNativePackageProof(bindingBytes, independentRecord, io),
    bytes = canonicalNativeJson(receipt);
  parseNativeReceipt(bytes, binding);
  verifyNativeReceiptEvidence(receipt, binding, io);
  const destination = join(outputDirectory, "receipt.json"),
    temporary = join(
      outputDirectory,
      `receipt-${process.pid}-${createHash("sha256").update(bytes).digest("hex")}.tmp`,
    );
  writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
  try {
    linkSync(temporary, destination);
  } finally {
    unlinkSync(temporary);
  }
  return receipt;
}

// Resolve only when launched directly; imports have no probing/launch/exit effects.
if (import.meta.main) {
  process.exitCode = runLegacyAction(process.argv.slice(2));
}
