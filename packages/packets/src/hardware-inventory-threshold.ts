export const HARDWARE_INVENTORY_THRESHOLD_STATUS = "contract_only";

const hardwareInventoryContractId = "lnsat.hardware.inventory_threshold.v0_1";
const hardwareInventoryVersion = "0.1";
const supportedPlatforms = new Set<HardwarePlatform>(["linux", "macos"]);
const supportedArchitectures = new Set<HardwareArchitecture>(["x86_64", "arm64"]);

export const hardwareInventoryThresholdContract = {
  contract_id: hardwareInventoryContractId,
  inventory_version: hardwareInventoryVersion,
  minimums: {
    physical_cores: 4,
    memory_bytes: 68_719_476_736,
    pcie_required: true,
    active_storage_media: ["nvme", "ssd"],
    network_speed_mbps: 10_000,
    platforms: ["linux", "macos"],
    architectures: ["x86_64", "arm64"],
  },
  support_statuses: [
    "supported",
    "supported_with_warnings",
    "restricted_roles_only",
    "below_minimum",
    "quarantined",
  ],
  role_families: [
    "authority_policy",
    "postgres_database",
    "jetstream_message_bus",
    "cache_retrieval",
    "vector_index",
    "graph_projection",
    "embedding_worker",
    "audit_storage_verification",
    "object_cold_storage",
    "web_management",
    "platform_adapter",
  ],
  recommendation_only: true,
  hardware_probe_allowed: false,
  benchmark_allowed: false,
  placement_allowed: false,
  telemetry_collection_allowed: false,
  runtime_allowed: false,
  side_effects: [],
  status: "source_only_pure_contract",
} as const;

export type HardwareSupportStatus =
  (typeof hardwareInventoryThresholdContract.support_statuses)[number];
export type HardwareRoleFamily =
  (typeof hardwareInventoryThresholdContract.role_families)[number];
export type HardwarePlatform = "linux" | "macos" | "windows" | "other";
export type HardwareArchitecture = "x86_64" | "arm64" | "other";

export type HardwareStorageDevice = {
  device_ref: string;
  medium: "nvme" | "ssd" | "hdd";
  role:
    | "active_database"
    | "active_queue"
    | "active_index"
    | "active_cache"
    | "active_workload"
    | "cold_archive";
  smart_health: "healthy" | "warning" | "critical" | "unknown";
};

export type HardwareNetworkLink = {
  interface_ref: string;
  speed_mbps: number;
  state: "up" | "down" | "unknown";
  error_count: number;
};

export type HardwareNodeInventory = {
  node_id: string;
  observed_at: string;
  platform: HardwarePlatform;
  architecture: HardwareArchitecture;
  cpu: {
    physical_cores: number;
    logical_cores: number;
  };
  memory: {
    total_bytes: number;
    ecc_status: "supported" | "not_supported" | "unknown";
    uncorrectable_error_count: number;
  };
  pcie: {
    present: boolean;
    max_generation: number | null;
  };
  storage: HardwareStorageDevice[];
  network: HardwareNetworkLink[];
  thermal: "normal" | "warning" | "critical" | "unknown";
  integrity: "verified" | "failed" | "unknown";
};

export type HardwareInventoryThresholdRequest = {
  inventory: HardwareNodeInventory;
  hardware_probe_allowed?: false;
  benchmark_allowed?: false;
  placement_allowed?: false;
  telemetry_collection_allowed?: false;
  runtime_allowed?: false;
  side_effects?: [];
};

export type HardwareThresholdFinding = {
  code: string;
  path: string;
  severity: "warning" | "error" | "critical";
  message: string;
  affected_roles: HardwareRoleFamily[];
};

export type HardwareInventoryThresholdEvidence = {
  contract_id: typeof hardwareInventoryThresholdContract.contract_id;
  inventory_version: typeof hardwareInventoryThresholdContract.inventory_version;
  node_id: string;
  observed_at: string;
  platform: HardwarePlatform;
  architecture: HardwareArchitecture;
  support_status: HardwareSupportStatus;
  threshold_findings: HardwareThresholdFinding[];
  reason_codes: string[];
  eligible_roles: HardwareRoleFamily[];
  excluded_roles: HardwareRoleFamily[];
  minimums: typeof hardwareInventoryThresholdContract.minimums;
  recommendation_only: true;
  hardware_probe_allowed: false;
  benchmark_allowed: false;
  placement_allowed: false;
  telemetry_collection_allowed: false;
  runtime_allowed: false;
  side_effects: [];
};

export type HardwareInventoryThresholdErrorCode =
  | "hardware_inventory.invalid_request"
  | "hardware_inventory.unexpected_field"
  | "hardware_inventory.invalid_inventory"
  | "hardware_inventory.secret_value_forbidden"
  | "hardware_inventory.hardware_probe_forbidden"
  | "hardware_inventory.benchmark_forbidden"
  | "hardware_inventory.placement_forbidden"
  | "hardware_inventory.telemetry_collection_forbidden"
  | "hardware_inventory.runtime_forbidden"
  | "hardware_inventory.side_effects_forbidden";

export type HardwareInventoryThresholdError = {
  code: HardwareInventoryThresholdErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type HardwareInventoryThresholdResult =
  | {
      ok: true;
      hardware_inventory_threshold: HardwareInventoryThresholdEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      hardware_inventory_threshold: null;
      errors: HardwareInventoryThresholdError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const requestKeys = new Set([
  "inventory",
  "hardware_probe_allowed",
  "benchmark_allowed",
  "placement_allowed",
  "telemetry_collection_allowed",
  "runtime_allowed",
  "side_effects",
]);
const inventoryKeys = new Set([
  "node_id",
  "observed_at",
  "platform",
  "architecture",
  "cpu",
  "memory",
  "pcie",
  "storage",
  "network",
  "thermal",
  "integrity",
]);
const cpuKeys = new Set(["physical_cores", "logical_cores"]);
const memoryKeys = new Set(["total_bytes", "ecc_status", "uncorrectable_error_count"]);
const pcieKeys = new Set(["present", "max_generation"]);
const storageKeys = new Set(["device_ref", "medium", "role", "smart_health"]);
const networkKeys = new Set(["interface_ref", "speed_mbps", "state", "error_count"]);
const nodeIdPattern = /^node:[a-z0-9][a-z0-9_.:-]{2,95}$/;
const refPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:|token:)/i;

const allRoles = [...hardwareInventoryThresholdContract.role_families];
const statefulRoles: HardwareRoleFamily[] = [
  "authority_policy",
  "postgres_database",
  "jetstream_message_bus",
  "vector_index",
  "graph_projection",
  "audit_storage_verification",
  "object_cold_storage",
];

export function evaluateHardwareInventoryThreshold(
  input: unknown,
): HardwareInventoryThresholdResult {
  try {
    const snapshot = snapshotJsonValue(input, new WeakSet<object>(), { nodes: 0 }, 0);
    deepFreezeJsonValue(snapshot);
    return evaluateHardwareInventoryThresholdSafely(snapshot);
  } catch {
    return failure([
      error(
        "hardware_inventory.invalid_request",
        "",
        "Hardware inventory request could not be safely inspected.",
      ),
    ]);
  }
}

function evaluateHardwareInventoryThresholdSafely(
  input: unknown,
): HardwareInventoryThresholdResult {
  const errors: HardwareInventoryThresholdError[] = [];
  if (!isPlainObject(input)) {
    return failure([
      error(
        "hardware_inventory.invalid_request",
        "",
        "Hardware inventory threshold request must be a plain object.",
      ),
    ]);
  }

  rejectUnexpected(input, requestKeys, "", errors);
  rejectSecretLikeValues(input, "", errors, new WeakSet<object>());
  rejectClosedFlag(
    input,
    "hardware_probe_allowed",
    "hardware_inventory.hardware_probe_forbidden",
    "Hardware probing is not allowed by this source-only contract.",
    errors,
  );
  rejectClosedFlag(
    input,
    "benchmark_allowed",
    "hardware_inventory.benchmark_forbidden",
    "Hardware benchmarking is not allowed by this source-only contract.",
    errors,
  );
  rejectClosedFlag(
    input,
    "placement_allowed",
    "hardware_inventory.placement_forbidden",
    "Hardware placement is not allowed by this source-only contract.",
    errors,
  );
  rejectClosedFlag(
    input,
    "telemetry_collection_allowed",
    "hardware_inventory.telemetry_collection_forbidden",
    "Telemetry collection is not allowed by this source-only contract.",
    errors,
  );
  rejectClosedFlag(
    input,
    "runtime_allowed",
    "hardware_inventory.runtime_forbidden",
    "Runtime behavior is not allowed by this source-only contract.",
    errors,
  );
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      error(
        "hardware_inventory.side_effects_forbidden",
        "/side_effects",
        "Hardware inventory threshold side_effects must remain empty.",
      ),
    );
  }

  const inventory = normalizeInventory(input.inventory, errors);
  if (errors.length > 0 || inventory === null) {
    return failure(dedupeErrors(errors));
  }

  const findings = evaluateThresholds(inventory);
  const supportStatus = deriveSupportStatus(inventory, findings);
  const excludedRoles = deriveExcludedRoles(supportStatus, inventory, findings);
  const eligibleRoles = allRoles.filter((role) => !excludedRoles.includes(role));

  return {
    ok: true,
    hardware_inventory_threshold: {
      contract_id: hardwareInventoryContractId,
      inventory_version: hardwareInventoryVersion,
      node_id: inventory.node_id,
      observed_at: inventory.observed_at,
      platform: inventory.platform,
      architecture: inventory.architecture,
      support_status: supportStatus,
      threshold_findings: findings,
      reason_codes: [...new Set(findings.map((finding) => finding.code))],
      eligible_roles: eligibleRoles,
      excluded_roles: excludedRoles,
      minimums: minimumEvidence(),
      recommendation_only: true,
      hardware_probe_allowed: false,
      benchmark_allowed: false,
      placement_allowed: false,
      telemetry_collection_allowed: false,
      runtime_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeInventory(
  value: unknown,
  errors: HardwareInventoryThresholdError[],
): HardwareNodeInventory | null {
  if (!isPlainObject(value)) {
    errors.push(
      error(
        "hardware_inventory.invalid_inventory",
        "/inventory",
        "Hardware inventory must be a plain object.",
      ),
    );
    return null;
  }
  rejectUnexpected(value, inventoryKeys, "/inventory", errors);

  const nodeId = validPatternString(value.node_id, nodeIdPattern);
  const observedAt = validIsoDateTime(value.observed_at);
  const platform = oneOf(value.platform, [
    "linux",
    "macos",
    "windows",
    "other",
  ] as const);
  const architecture = oneOf(value.architecture, ["x86_64", "arm64", "other"] as const);
  const cpu = normalizeCpu(value.cpu, errors);
  const memory = normalizeMemory(value.memory, errors);
  const pcie = normalizePcie(value.pcie, errors);
  const storage = normalizeStorage(value.storage, errors);
  const network = normalizeNetwork(value.network, errors);
  const thermal = oneOf(value.thermal, [
    "normal",
    "warning",
    "critical",
    "unknown",
  ] as const);
  const integrity = oneOf(value.integrity, ["verified", "failed", "unknown"] as const);

  if (nodeId === null) invalidField(errors, "/inventory/node_id", "node_id");
  if (observedAt === null)
    invalidField(errors, "/inventory/observed_at", "observed_at");
  if (platform === null) invalidField(errors, "/inventory/platform", "platform");
  if (architecture === null)
    invalidField(errors, "/inventory/architecture", "architecture");
  if (thermal === null) invalidField(errors, "/inventory/thermal", "thermal");
  if (integrity === null) invalidField(errors, "/inventory/integrity", "integrity");

  if (
    nodeId === null ||
    observedAt === null ||
    platform === null ||
    architecture === null ||
    cpu === null ||
    memory === null ||
    pcie === null ||
    storage === null ||
    network === null ||
    thermal === null ||
    integrity === null
  ) {
    return null;
  }
  return {
    node_id: nodeId,
    observed_at: observedAt,
    platform,
    architecture,
    cpu,
    memory,
    pcie,
    storage,
    network,
    thermal,
    integrity,
  };
}

function normalizeCpu(
  value: unknown,
  errors: HardwareInventoryThresholdError[],
): HardwareNodeInventory["cpu"] | null {
  if (!isPlainObject(value)) return invalidObject(errors, "/inventory/cpu", "CPU");
  rejectUnexpected(value, cpuKeys, "/inventory/cpu", errors);
  const physical = positiveInteger(value.physical_cores);
  const logical = positiveInteger(value.logical_cores);
  if (physical === null || logical === null || logical < physical) {
    invalidField(errors, "/inventory/cpu", "CPU core counts");
    return null;
  }
  return { physical_cores: physical, logical_cores: logical };
}

function normalizeMemory(
  value: unknown,
  errors: HardwareInventoryThresholdError[],
): HardwareNodeInventory["memory"] | null {
  if (!isPlainObject(value))
    return invalidObject(errors, "/inventory/memory", "Memory");
  rejectUnexpected(value, memoryKeys, "/inventory/memory", errors);
  const total = positiveInteger(value.total_bytes);
  const ecc = oneOf(value.ecc_status, [
    "supported",
    "not_supported",
    "unknown",
  ] as const);
  const uncorrectable = nonNegativeInteger(value.uncorrectable_error_count);
  if (total === null || ecc === null || uncorrectable === null) {
    invalidField(errors, "/inventory/memory", "Memory evidence");
    return null;
  }
  return {
    total_bytes: total,
    ecc_status: ecc,
    uncorrectable_error_count: uncorrectable,
  };
}

function normalizePcie(
  value: unknown,
  errors: HardwareInventoryThresholdError[],
): HardwareNodeInventory["pcie"] | null {
  if (!isPlainObject(value)) return invalidObject(errors, "/inventory/pcie", "PCIe");
  rejectUnexpected(value, pcieKeys, "/inventory/pcie", errors);
  const generation =
    value.max_generation === null ? null : positiveInteger(value.max_generation);
  if (
    typeof value.present !== "boolean" ||
    (generation === null && value.max_generation !== null)
  ) {
    invalidField(errors, "/inventory/pcie", "PCIe evidence");
    return null;
  }
  if (value.present && generation === null) {
    invalidField(errors, "/inventory/pcie/max_generation", "PCIe generation");
    return null;
  }
  return { present: value.present, max_generation: generation };
}

function normalizeStorage(
  value: unknown,
  errors: HardwareInventoryThresholdError[],
): HardwareStorageDevice[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    invalidField(errors, "/inventory/storage", "Storage inventory");
    return null;
  }
  const devices: HardwareStorageDevice[] = [];
  value.forEach((item, index) => {
    const path = `/inventory/storage/${index}`;
    if (!isPlainObject(item)) {
      invalidField(errors, path, "Storage device");
      return;
    }
    rejectUnexpected(item, storageKeys, path, errors);
    const deviceRef = validPatternString(item.device_ref, refPattern);
    const medium = oneOf(item.medium, ["nvme", "ssd", "hdd"] as const);
    const role = oneOf(item.role, [
      "active_database",
      "active_queue",
      "active_index",
      "active_cache",
      "active_workload",
      "cold_archive",
    ] as const);
    const smart = oneOf(item.smart_health, [
      "healthy",
      "warning",
      "critical",
      "unknown",
    ] as const);
    if (deviceRef === null || medium === null || role === null || smart === null) {
      invalidField(errors, path, "Storage device evidence");
      return;
    }
    devices.push({
      device_ref: deviceRef,
      medium,
      role,
      smart_health: smart,
    });
  });
  return devices.length === value.length ? devices : null;
}

function normalizeNetwork(
  value: unknown,
  errors: HardwareInventoryThresholdError[],
): HardwareNetworkLink[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    invalidField(errors, "/inventory/network", "Network inventory");
    return null;
  }
  const links: HardwareNetworkLink[] = [];
  value.forEach((item, index) => {
    const path = `/inventory/network/${index}`;
    if (!isPlainObject(item)) {
      invalidField(errors, path, "Network link");
      return;
    }
    rejectUnexpected(item, networkKeys, path, errors);
    const interfaceRef = validPatternString(item.interface_ref, refPattern);
    const speed = positiveInteger(item.speed_mbps);
    const state = oneOf(item.state, ["up", "down", "unknown"] as const);
    const errorCount = nonNegativeInteger(item.error_count);
    if (
      interfaceRef === null ||
      speed === null ||
      state === null ||
      errorCount === null
    ) {
      invalidField(errors, path, "Network link evidence");
      return;
    }
    links.push({
      interface_ref: interfaceRef,
      speed_mbps: speed,
      state,
      error_count: errorCount,
    });
  });
  return links.length === value.length ? links : null;
}

function evaluateThresholds(
  inventory: HardwareNodeInventory,
): HardwareThresholdFinding[] {
  const findings: HardwareThresholdFinding[] = [];
  if (!supportedPlatforms.has(inventory.platform))
    findings.push(
      finding(
        "hardware.platform_unsupported",
        "/inventory/platform",
        "error",
        "Platform is not supported by the initial hardware baseline.",
        allRoles,
      ),
    );
  if (!supportedArchitectures.has(inventory.architecture))
    findings.push(
      finding(
        "hardware.architecture_unsupported",
        "/inventory/architecture",
        "error",
        "Architecture is not supported by the initial hardware baseline.",
        allRoles,
      ),
    );
  if (inventory.cpu.physical_cores < 4)
    findings.push(
      finding(
        "hardware.cpu_below_minimum",
        "/inventory/cpu/physical_cores",
        "error",
        "At least 4 physical CPU cores are required.",
        allRoles,
      ),
    );
  if (inventory.memory.total_bytes < 68_719_476_736)
    findings.push(
      finding(
        "hardware.memory_below_minimum",
        "/inventory/memory/total_bytes",
        "error",
        "At least 64 GiB RAM is required.",
        allRoles,
      ),
    );
  if (!inventory.pcie.present)
    findings.push(
      finding(
        "hardware.pcie_required",
        "/inventory/pcie/present",
        "error",
        "PCIe capability is required.",
        allRoles,
      ),
    );

  const activeStorage = inventory.storage.filter(
    (device) => device.role !== "cold_archive",
  );
  if (activeStorage.length === 0)
    findings.push(
      finding(
        "hardware.active_storage_required",
        "/inventory/storage",
        "error",
        "At least one active SSD or NVMe device is required.",
        allRoles,
      ),
    );
  inventory.storage.forEach((device, sourceIndex) => {
    const active = device.role !== "cold_archive";
    if (active && device.medium === "hdd")
      findings.push(
        finding(
          "hardware.active_storage_not_ssd",
          `/inventory/storage/${sourceIndex}/medium`,
          "error",
          "HDD is forbidden for active roles.",
          allRoles,
        ),
      );
    if (device.smart_health === "critical")
      findings.push(
        finding(
          "hardware.storage_smart_critical",
          `/inventory/storage/${sourceIndex}/smart_health`,
          "critical",
          "Critical SMART health requires quarantine.",
          allRoles,
        ),
      );
    if (device.smart_health === "warning")
      findings.push(
        finding(
          "hardware.storage_smart_warning",
          `/inventory/storage/${sourceIndex}/smart_health`,
          "warning",
          active
            ? "SMART warning restricts stateful roles."
            : "SMART warning restricts cold-storage roles.",
          active ? statefulRoles : ["object_cold_storage"],
        ),
      );
    if (device.smart_health === "unknown")
      findings.push(
        finding(
          "hardware.storage_smart_unknown",
          `/inventory/storage/${sourceIndex}/smart_health`,
          "warning",
          "SMART health is unknown.",
          [],
        ),
      );
  });

  const tenGigabitLinks = inventory.network.filter(
    (link) => link.state === "up" && link.speed_mbps >= 10_000,
  );
  if (tenGigabitLinks.length === 0)
    findings.push(
      finding(
        "hardware.network_below_minimum",
        "/inventory/network",
        "error",
        "At least one active 10 GbE link is required.",
        allRoles,
      ),
    );
  if (inventory.network.some((link) => link.error_count > 0))
    findings.push(
      finding(
        "hardware.network_errors_present",
        "/inventory/network",
        "warning",
        "Network errors restrict performance-sensitive roles.",
        statefulRoles,
      ),
    );

  if (inventory.memory.uncorrectable_error_count > 0)
    findings.push(
      finding(
        "hardware.memory_uncorrectable_errors",
        "/inventory/memory/uncorrectable_error_count",
        "critical",
        "Uncorrectable memory errors require quarantine.",
        allRoles,
      ),
    );
  if (inventory.integrity === "failed")
    findings.push(
      finding(
        "hardware.integrity_failed",
        "/inventory/integrity",
        "critical",
        "Node integrity failure requires quarantine.",
        allRoles,
      ),
    );
  if (inventory.thermal === "critical")
    findings.push(
      finding(
        "hardware.thermal_critical",
        "/inventory/thermal",
        "critical",
        "Critical thermal health requires quarantine.",
        allRoles,
      ),
    );
  if (inventory.thermal === "warning")
    findings.push(
      finding(
        "hardware.thermal_warning",
        "/inventory/thermal",
        "warning",
        "Thermal warning restricts performance-sensitive roles.",
        statefulRoles,
      ),
    );
  if (inventory.memory.ecc_status === "unknown")
    findings.push(
      finding(
        "hardware.ecc_unknown",
        "/inventory/memory/ecc_status",
        "warning",
        "ECC status is unknown.",
        [],
      ),
    );
  if (inventory.memory.ecc_status === "not_supported")
    findings.push(
      finding(
        "hardware.ecc_not_supported",
        "/inventory/memory/ecc_status",
        "warning",
        "ECC is not supported on this node.",
        [],
      ),
    );
  if (inventory.thermal === "unknown")
    findings.push(
      finding(
        "hardware.thermal_unknown",
        "/inventory/thermal",
        "warning",
        "Thermal evidence is unknown.",
        [],
      ),
    );
  if (inventory.integrity === "unknown")
    findings.push(
      finding(
        "hardware.integrity_unknown",
        "/inventory/integrity",
        "warning",
        "Node integrity evidence is unknown.",
        [],
      ),
    );
  if (inventory.platform === "macos")
    findings.push(
      finding(
        "hardware.platform_stateless_only",
        "/inventory/platform",
        "warning",
        "macOS nodes are restricted to stateless worker roles.",
        statefulRoles,
      ),
    );

  return findings;
}

function deriveSupportStatus(
  inventory: HardwareNodeInventory,
  findings: HardwareThresholdFinding[],
): HardwareSupportStatus {
  if (findings.some((item) => item.severity === "critical")) return "quarantined";
  if (findings.some((item) => item.severity === "error")) return "below_minimum";
  if (
    inventory.platform === "macos" ||
    findings.some((item) => item.affected_roles.length > 0)
  )
    return "restricted_roles_only";
  if (findings.length > 0) return "supported_with_warnings";
  return "supported";
}

function deriveExcludedRoles(
  status: HardwareSupportStatus,
  inventory: HardwareNodeInventory,
  findings: HardwareThresholdFinding[],
): HardwareRoleFamily[] {
  if (status === "quarantined" || status === "below_minimum") return [...allRoles];
  const excluded = new Set<HardwareRoleFamily>();
  if (inventory.platform === "macos")
    statefulRoles.forEach((role) => excluded.add(role));
  findings.forEach((item) => item.affected_roles.forEach((role) => excluded.add(role)));
  return allRoles.filter((role) => excluded.has(role));
}

function finding(
  code: string,
  path: string,
  severity: HardwareThresholdFinding["severity"],
  message: string,
  affectedRoles: readonly HardwareRoleFamily[],
): HardwareThresholdFinding {
  return { code, path, severity, message, affected_roles: [...affectedRoles] };
}

function rejectUnexpected(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  basePath: string,
  errors: HardwareInventoryThresholdError[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(
        error(
          "hardware_inventory.unexpected_field",
          `${basePath}/${escapeJsonPointer(key)}`,
          "Unexpected hardware inventory field.",
        ),
      );
    }
  }
}

function rejectClosedFlag(
  input: Record<string, unknown>,
  key: string,
  code: HardwareInventoryThresholdErrorCode,
  message: string,
  errors: HardwareInventoryThresholdError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(error(code, `/${key}`, message));
  }
}

function rejectSecretLikeValues(
  value: unknown,
  path: string,
  errors: HardwareInventoryThresholdError[],
  seen: WeakSet<object>,
): void {
  if (typeof value === "string") {
    if (secretLikePattern.test(value)) {
      errors.push(
        error(
          "hardware_inventory.secret_value_forbidden",
          path,
          "Secret-like values are forbidden in hardware inventory.",
        ),
      );
    }
    return;
  }
  if (typeof value !== "object" || value === null) return;
  if (seen.has(value)) {
    errors.push(
      error(
        "hardware_inventory.invalid_request",
        path,
        "Hardware inventory must not contain cyclic values.",
      ),
    );
    return;
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        rejectSecretLikeValues(item, `${path}/${index}`, errors, seen),
      );
    } else {
      Object.entries(value).forEach(([key, item]) =>
        rejectSecretLikeValues(item, `${path}/${escapeJsonPointer(key)}`, errors, seen),
      );
    }
  } catch {
    errors.push(
      error(
        "hardware_inventory.invalid_request",
        path,
        "Hardware inventory could not be safely inspected.",
      ),
    );
  }
}

function snapshotJsonValue(
  value: unknown,
  stack: WeakSet<object>,
  budget: { nodes: number },
  depth: number,
): JsonValue {
  budget.nodes += 1;
  if (budget.nodes > 5_000 || depth > 16) {
    throw new TypeError("JSON value exceeds inspection limits.");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    if (typeof value === "string" && value.length > 512) {
      throw new TypeError("String exceeds inspection limit.");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite number.");
    return value;
  }
  if (typeof value !== "object") throw new TypeError("Unsupported JSON value.");
  if (stack.has(value)) throw new TypeError("Cyclic JSON value.");
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > 256) throw new TypeError("Array exceeds inspection limit.");
      return value.map((item) => snapshotJsonValue(item, stack, budget, depth + 1));
    }
    if (!isPlainObject(value)) throw new TypeError("Non-plain JSON object.");
    const entries = Object.entries(value);
    if (entries.length > 64) throw new TypeError("Object exceeds inspection limit.");
    if (entries.some(([key]) => key.length > 128 || secretLikePattern.test(key))) {
      throw new TypeError("Object key is unsafe.");
    }
    return Object.fromEntries(
      entries.map(([key, item]) => [
        key,
        snapshotJsonValue(item, stack, budget, depth + 1),
      ]),
    );
  } finally {
    stack.delete(value);
  }
}

function deepFreezeJsonValue(value: JsonValue): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(deepFreezeJsonValue);
  } else {
    Object.values(value).forEach(deepFreezeJsonValue);
  }
  Object.freeze(value);
}

function invalidObject(
  errors: HardwareInventoryThresholdError[],
  path: string,
  label: string,
): null {
  invalidField(errors, path, `${label} object`);
  return null;
}

function invalidField(
  errors: HardwareInventoryThresholdError[],
  path: string,
  label: string,
): void {
  errors.push(
    error(
      "hardware_inventory.invalid_inventory",
      path,
      `${label} is invalid or missing.`,
    ),
  );
}

function error(
  code: HardwareInventoryThresholdErrorCode,
  path: string,
  message: string,
): HardwareInventoryThresholdError {
  return { code, path, message, severity: "error" };
}

function failure(
  errors: HardwareInventoryThresholdError[],
): HardwareInventoryThresholdResult {
  return {
    ok: false,
    hardware_inventory_threshold: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function dedupeErrors(
  errors: HardwareInventoryThresholdError[],
): HardwareInventoryThresholdError[] {
  const seen = new Set<string>();
  return errors.filter((item) => {
    const key = `${item.code}:${item.path}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function minimumEvidence(): typeof hardwareInventoryThresholdContract.minimums {
  return {
    physical_cores: 4,
    memory_bytes: 68_719_476_736,
    pcie_required: true,
    active_storage_media: ["nvme", "ssd"],
    network_speed_mbps: 10_000,
    platforms: ["linux", "macos"],
    architectures: ["x86_64", "arm64"],
  };
}

function validPatternString(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

function validIsoDateTime(value: unknown): string | null {
  if (typeof value !== "string" || !isoDateTimePattern.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value
    ? value
    : null;
}

function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0
    ? (value as number)
    : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? (value as number)
    : null;
}

function oneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] | null {
  return typeof value === "string" && values.includes(value as T[number])
    ? (value as T[number])
    : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
