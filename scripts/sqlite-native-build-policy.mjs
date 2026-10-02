// Repository build checks assume a trusted developer host and toolchain.
// They reject named overrides; they do not authenticate a release artifact.
export const FILESTAT_FLAGS = "SQLITE_ENABLE_FILESTAT";
export const SQLITE_CARGO_CONFIG = `[net]
offline = true

[env]
LIBSQLITE3_FLAGS = { value = "SQLITE_ENABLE_FILESTAT", force = true }
`;

export const COMPILER_FAMILIES = [
  "CC",
  "CFLAGS",
  "CPPFLAGS",
  "AR",
  "ARFLAGS",
  "RANLIB",
  "RANLIBFLAGS",
  "CXX",
  "CXXFLAGS",
  "CXXSTDLIB",
];
export const NATIVE_INPUTS = [
  "CRATE_CC_NO_DEFAULTS",
  "CC_FORCE_DISABLE",
  "CC_KNOWN_WRAPPER_CUSTOM",
  "CC_SHELL_ESCAPED_FLAGS",
  "RUSTC_WRAPPER",
  "RUSTC_WORKSPACE_WRAPPER",
  "CROSS_COMPILE",
  "RUSTC_LINKER",
  "CPATH",
  "C_INCLUDE_PATH",
  "CPLUS_INCLUDE_PATH",
  "LIBRARY_PATH",
  "SDKROOT",
  "MACOSX_DEPLOYMENT_TARGET",
  "LIBSQLITE3_SYS_USE_PKG_CONFIG",
  "LIBSQLITE3_SYS_BUNDLING",
  "SQLITE_MAX_VARIABLE_NUMBER",
  "SQLITE_MAX_EXPR_DEPTH",
  "SQLITE_MAX_COLUMN",
  "SQLITE3_LIB_DIR",
  "SQLITE3_INCLUDE_DIR",
  "SQLITE3_STATIC",
  "SQLCIPHER_LIB_DIR",
  "SQLCIPHER_INCLUDE_DIR",
  "SQLCIPHER_STATIC",
  "OPENSSL_DIR",
  "OPENSSL_LIB_DIR",
  "OPENSSL_INCLUDE_DIR",
  "OPENSSL_STATIC",
  "OPENSSL_NO_VENDOR",
  "SQLITE3_NO_PKG_CONFIG",
  "SQLCIPHER_NO_PKG_CONFIG",
  "VCPKG_ROOT",
  "RUSTFLAGS",
  "CARGO_ENCODED_RUSTFLAGS",
  "CARGO_BUILD_RUSTFLAGS",
];
const EXPECTED_NATIVE_FEATURES = [
  "bundled",
  "bundled_bindings",
  "cc",
  "default",
  "min_sqlite_version_3_34_1",
  "pkg-config",
  "vcpkg",
];

export function verifyNativeEnvironment(env, config) {
  if (config !== SQLITE_CARGO_CONFIG) {
    throw new Error("sqlite_native.config_rejected");
  }
  for (const key of Object.keys(env)) {
    if (key === "LIBSQLITE3_FLAGS") {
      if (env[key] !== FILESTAT_FLAGS) {
        throw new Error("sqlite_native.override_rejected");
      }
      continue;
    }
    if (
      COMPILER_FAMILIES.some(
        (base) =>
          key === base ||
          key === `HOST_${base}` ||
          key === `TARGET_${base}` ||
          key.startsWith(`${base}_`),
      ) ||
      NATIVE_INPUTS.some(
        (base) =>
          key === base || key.startsWith(`${base}_`) || key.endsWith(`_${base}`),
      ) ||
      key.startsWith("PKG_CONFIG") ||
      key.includes("_PKG_CONFIG") ||
      key.startsWith("VCPKGRS_") ||
      (key.startsWith("CARGO_TARGET_") &&
        (key.endsWith("_LINKER") || key.endsWith("_RUSTFLAGS"))) ||
      key.endsWith("_LIBSQLITE3_FLAGS") ||
      key.startsWith("LIBSQLITE3_FLAGS_")
    ) {
      throw new Error("sqlite_native.override_rejected");
    }
  }
}

export function verifyNativeGraph(metadata) {
  const packages = metadata?.packages;
  const nodes = metadata?.resolve?.nodes;
  if (!Array.isArray(packages) || !Array.isArray(nodes)) {
    throw new Error("sqlite_native.graph_rejected");
  }
  for (const [name, version] of [
    ["libsqlite3-sys", "0.38.1"],
    ["rusqlite", "0.40.1"],
  ]) {
    const selected = packages.filter((pkg) => pkg.name === name);
    if (
      selected.length !== 1 ||
      selected[0].version !== version ||
      selected[0].source !== "registry+https://github.com/rust-lang/crates.io-index"
    ) {
      throw new Error("sqlite_native.graph_rejected");
    }
    const resolved = nodes.filter((node) => node.id === selected[0].id);
    if (resolved.length !== 1 || !Array.isArray(resolved[0].features)) {
      throw new Error("sqlite_native.graph_rejected");
    }
    if (
      name === "libsqlite3-sys" &&
      JSON.stringify([...resolved[0].features].sort()) !==
        JSON.stringify(EXPECTED_NATIVE_FEATURES)
    ) {
      throw new Error("sqlite_native.graph_rejected");
    }
    if (
      name === "rusqlite" &&
      !["bundled", "limits"].every((feature) => resolved[0].features.includes(feature))
    ) {
      throw new Error("sqlite_native.graph_rejected");
    }
  }
  const stats = packages.filter(
    (pkg) => pkg.name === "nix" && pkg.version === "0.29.0",
  );
  const stores = packages.filter((pkg) => pkg.name === "lnsat-store");
  if (
    stats.length !== 1 ||
    stores.length !== 1 ||
    stats[0].source !== "registry+https://github.com/rust-lang/crates.io-index"
  ) {
    throw new Error("sqlite_native.graph_rejected");
  }
  const statNodes = nodes.filter((node) => node.id === stats[0].id);
  const storeNodes = nodes.filter((node) => node.id === stores[0].id);
  if (
    statNodes.length !== 1 ||
    JSON.stringify(statNodes[0].features) !== '["fs"]' ||
    storeNodes.length !== 1 ||
    !Array.isArray(storeNodes[0].deps)
  ) {
    throw new Error("sqlite_native.graph_rejected");
  }
  const aliases = storeNodes[0].deps.filter((dep) => dep.name === "nix_stat");
  if (
    aliases.length !== 1 ||
    aliases[0].pkg !== stats[0].id ||
    JSON.stringify(aliases[0].dep_kinds) !==
      JSON.stringify([
        { kind: null, target: 'cfg(any(target_os = "linux", target_os = "macos"))' },
      ])
  ) {
    throw new Error("sqlite_native.graph_rejected");
  }
}
