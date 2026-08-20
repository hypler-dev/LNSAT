import { describe, expect, it } from "vitest";
import {
  evaluateHardwareInventoryThreshold,
  hardwareInventoryThresholdContract,
  type HardwareInventoryThresholdRequest,
  type HardwareNodeInventory,
} from "../src/index.js";

describe("BP-0849 hardware inventory and threshold contract", () => {
  it("supports a healthy Linux node at exact minimum boundaries", () => {
    const result = evaluateHardwareInventoryThreshold(validRequest());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected supported inventory");
    expect(result.hardware_inventory_threshold).toMatchObject({
      contract_id: hardwareInventoryThresholdContract.contract_id,
      inventory_version: "0.1",
      support_status: "supported",
      threshold_findings: [],
      reason_codes: [],
      eligible_roles: hardwareInventoryThresholdContract.role_families,
      excluded_roles: [],
      minimums: {
        physical_cores: 4,
        memory_bytes: 68_719_476_736,
        pcie_required: true,
        network_speed_mbps: 10_000,
      },
      recommendation_only: true,
      hardware_probe_allowed: false,
      benchmark_allowed: false,
      placement_allowed: false,
      telemetry_collection_allowed: false,
      runtime_allowed: false,
      side_effects: [],
    });
    expect(result.side_effects).toEqual([]);
  });

  it("reports optional unknown evidence without excluding roles", () => {
    const request = validRequest();
    request.inventory.memory.ecc_status = "unknown";
    request.inventory.thermal = "unknown";

    const result = evaluateHardwareInventoryThreshold(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected warning inventory");
    expect(result.hardware_inventory_threshold.support_status).toBe(
      "supported_with_warnings",
    );
    expect(result.hardware_inventory_threshold.reason_codes).toEqual([
      "hardware.ecc_unknown",
      "hardware.thermal_unknown",
    ]);
    expect(result.hardware_inventory_threshold.excluded_roles).toEqual([]);
  });

  it("restricts macOS to stateless roles", () => {
    const request = validRequest();
    request.inventory.platform = "macos";

    const result = evaluateHardwareInventoryThreshold(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected macOS restriction");
    expect(result.hardware_inventory_threshold.support_status).toBe(
      "restricted_roles_only",
    );
    expect(result.hardware_inventory_threshold.excluded_roles).toEqual(
      expect.arrayContaining([
        "authority_policy",
        "postgres_database",
        "jetstream_message_bus",
        "audit_storage_verification",
      ]),
    );
    expect(result.hardware_inventory_threshold.eligible_roles).toEqual(
      expect.arrayContaining([
        "cache_retrieval",
        "embedding_worker",
        "web_management",
        "platform_adapter",
      ]),
    );
  });

  it.each([
    [
      "CPU",
      (node: HardwareNodeInventory) => (node.cpu.physical_cores = 3),
      "hardware.cpu_below_minimum",
    ],
    [
      "RAM",
      (node: HardwareNodeInventory) => (node.memory.total_bytes = 68_719_476_735),
      "hardware.memory_below_minimum",
    ],
    [
      "PCIe",
      (node: HardwareNodeInventory) => {
        node.pcie.present = false;
        node.pcie.max_generation = null;
      },
      "hardware.pcie_required",
    ],
    [
      "active SSD",
      (node: HardwareNodeInventory) => (node.storage[0]!.medium = "hdd"),
      "hardware.active_storage_not_ssd",
    ],
    [
      "10 GbE",
      (node: HardwareNodeInventory) => (node.network[0]!.speed_mbps = 9_999),
      "hardware.network_below_minimum",
    ],
    [
      "platform",
      (node: HardwareNodeInventory) => (node.platform = "windows"),
      "hardware.platform_unsupported",
    ],
    [
      "architecture",
      (node: HardwareNodeInventory) => (node.architecture = "other"),
      "hardware.architecture_unsupported",
    ],
  ])("marks %s below minimum", (_label, mutate, reasonCode) => {
    const request = validRequest();
    mutate(request.inventory);

    const result = evaluateHardwareInventoryThreshold(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected threshold evidence");
    expect(result.hardware_inventory_threshold.support_status).toBe("below_minimum");
    expect(result.hardware_inventory_threshold.reason_codes).toContain(reasonCode);
    expect(result.hardware_inventory_threshold.eligible_roles).toEqual([]);
    expect(result.hardware_inventory_threshold.excluded_roles).toEqual(
      hardwareInventoryThresholdContract.role_families,
    );
  });

  it.each([
    [
      "integrity",
      (node: HardwareNodeInventory) => (node.integrity = "failed"),
      "hardware.integrity_failed",
    ],
    [
      "memory",
      (node: HardwareNodeInventory) => (node.memory.uncorrectable_error_count = 1),
      "hardware.memory_uncorrectable_errors",
    ],
    [
      "SMART",
      (node: HardwareNodeInventory) => (node.storage[0]!.smart_health = "critical"),
      "hardware.storage_smart_critical",
    ],
    [
      "thermal",
      (node: HardwareNodeInventory) => (node.thermal = "critical"),
      "hardware.thermal_critical",
    ],
  ])(
    "quarantines critical %s health before other status",
    (_label, mutate, reasonCode) => {
      const request = validRequest();
      request.inventory.cpu.physical_cores = 2;
      mutate(request.inventory);

      const result = evaluateHardwareInventoryThreshold(request);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected quarantine evidence");
      expect(result.hardware_inventory_threshold.support_status).toBe("quarantined");
      expect(result.hardware_inventory_threshold.reason_codes).toEqual(
        expect.arrayContaining(["hardware.cpu_below_minimum", reasonCode]),
      );
      expect(result.hardware_inventory_threshold.eligible_roles).toEqual([]);
    },
  );

  it("quarantines critical SMART health on cold archive devices", () => {
    const request = validRequest();
    request.inventory.storage.push({
      device_ref: "disk:archive0",
      medium: "hdd",
      role: "cold_archive",
      smart_health: "critical",
    });

    const result = evaluateHardwareInventoryThreshold(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected quarantine evidence");
    expect(result.hardware_inventory_threshold.support_status).toBe("quarantined");
    expect(result.hardware_inventory_threshold.reason_codes).toContain(
      "hardware.storage_smart_critical",
    );
  });

  it("restricts stateful roles for degraded health", () => {
    const request = validRequest();
    request.inventory.storage[0]!.smart_health = "warning";
    request.inventory.network[0]!.error_count = 7;
    request.inventory.thermal = "warning";

    const result = evaluateHardwareInventoryThreshold(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected restricted evidence");
    expect(result.hardware_inventory_threshold.support_status).toBe(
      "restricted_roles_only",
    );
    expect(result.hardware_inventory_threshold.excluded_roles).toEqual(
      expect.arrayContaining([
        "authority_policy",
        "postgres_database",
        "jetstream_message_bus",
        "vector_index",
        "audit_storage_verification",
      ]),
    );
    expect(result.hardware_inventory_threshold.eligible_roles).toContain(
      "web_management",
    );
  });

  it("fails closed for unexpected action, secret-like, and opened live fields", () => {
    const result = evaluateHardwareInventoryThreshold({
      ...validRequest(),
      command: "probe token:raw-marker",
      hardware_probe_allowed: true,
      benchmark_allowed: true,
      placement_allowed: true,
      telemetry_collection_allowed: true,
      runtime_allowed: true,
      side_effects: ["probe"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected fail-closed result");
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "hardware_inventory.unexpected_field",
        "hardware_inventory.secret_value_forbidden",
        "hardware_inventory.hardware_probe_forbidden",
        "hardware_inventory.benchmark_forbidden",
        "hardware_inventory.placement_forbidden",
        "hardware_inventory.telemetry_collection_forbidden",
        "hardware_inventory.runtime_forbidden",
        "hardware_inventory.side_effects_forbidden",
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(JSON.stringify(result)).not.toContain("raw-marker");
    expect(result.side_effects).toEqual([]);
  });

  it("is deterministic and does not mutate caller inventory", () => {
    const request = validRequest();
    const before = JSON.stringify(request);
    const first = evaluateHardwareInventoryThreshold(request);
    const second = evaluateHardwareInventoryThreshold(request);

    expect(first).toEqual(second);
    expect(JSON.stringify(request)).toBe(before);
  });

  it("isolates future evaluation from mutated result minimum evidence", () => {
    const first = evaluateHardwareInventoryThreshold(validRequest());
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected first inventory");
    (first.hardware_inventory_threshold.minimums.platforms as string[]).push("windows");

    const windows = validRequest();
    windows.inventory.platform = "windows";
    const second = evaluateHardwareInventoryThreshold(windows);
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("expected threshold result");
    expect(second.hardware_inventory_threshold.support_status).toBe("below_minimum");
    expect(second.hardware_inventory_threshold.reason_codes).toContain(
      "hardware.platform_unsupported",
    );
  });

  it("isolates evaluation from mutable exported contract metadata", () => {
    const contract = hardwareInventoryThresholdContract as unknown as {
      contract_id: string;
      inventory_version: string;
    };
    const originalId = contract.contract_id;
    const originalVersion = contract.inventory_version;
    contract.contract_id = "mutated.contract";
    contract.inventory_version = "9.9";
    try {
      const result = evaluateHardwareInventoryThreshold(validRequest());
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected isolated contract result");
      expect(result.hardware_inventory_threshold.contract_id).toBe(
        "lnsat.hardware.inventory_threshold.v0_1",
      );
      expect(result.hardware_inventory_threshold.inventory_version).toBe("0.1");
    } finally {
      contract.contract_id = originalId;
      contract.inventory_version = originalVersion;
    }
  });

  it("contains hostile proxy inspection without raw error echo", () => {
    const marker = "raw-hardware-marker";
    const hostile = new Proxy(validRequest(), {
      ownKeys() {
        throw new Error(marker);
      },
    });

    const result = evaluateHardwareInventoryThreshold(hostile);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected hostile input failure");
    expect(result.errors).toEqual([
      {
        code: "hardware_inventory.invalid_request",
        path: "",
        message: "Hardware inventory request could not be safely inspected.",
        severity: "error",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("rejects hostile property names without echo", () => {
    const marker = "raw-key-marker";
    const result = evaluateHardwareInventoryThreshold({
      ...validRequest(),
      [`token:${marker}`]: "x",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected unsafe-key failure");
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "hardware_inventory.invalid_request",
        path: "",
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("fails closed for impossible timestamps and oversized inventories", () => {
    const impossible = validRequest();
    impossible.inventory.observed_at = "2026-99-99T99:99:99.000Z";
    const oversized = validRequest();
    oversized.inventory.network = Array.from({ length: 257 }, (_, index) => ({
      interface_ref: `nic:oversized-${index}`,
      speed_mbps: 10_000,
      state: "up" as const,
      error_count: 0,
    }));

    const impossibleResult = evaluateHardwareInventoryThreshold(impossible);
    const oversizedResult = evaluateHardwareInventoryThreshold(oversized);
    expect(impossibleResult.ok).toBe(false);
    expect(oversizedResult.ok).toBe(false);
    if (impossibleResult.ok || oversizedResult.ok) {
      throw new Error("expected bounded invalid inventory results");
    }
    expect(impossibleResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "hardware_inventory.invalid_inventory",
          path: "/inventory/observed_at",
        }),
      ]),
    );
    expect(oversizedResult.errors).toEqual([
      expect.objectContaining({ code: "hardware_inventory.invalid_request" }),
    ]);
  });

  it("snapshots stateful fields once before validation and evaluation", () => {
    const request = validRequest();
    let coreReads = 0;
    Object.defineProperty(request.inventory.cpu, "physical_cores", {
      enumerable: true,
      get() {
        coreReads += 1;
        return coreReads === 1 ? 4 : 1;
      },
    });

    const result = evaluateHardwareInventoryThreshold(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected snapshotted inventory");
    expect(result.hardware_inventory_threshold.support_status).toBe("supported");
    expect(coreReads).toBe(1);
  });
});

function validRequest(): HardwareInventoryThresholdRequest {
  return {
    inventory: {
      node_id: "node:lab-dell-r730-01",
      observed_at: "2026-07-11T00:00:00.000Z",
      platform: "linux",
      architecture: "x86_64",
      cpu: { physical_cores: 4, logical_cores: 8 },
      memory: {
        total_bytes: 68_719_476_736,
        ecc_status: "supported",
        uncorrectable_error_count: 0,
      },
      pcie: { present: true, max_generation: 3 },
      storage: [
        {
          device_ref: "disk:nvme0",
          medium: "nvme",
          role: "active_workload",
          smart_health: "healthy",
        },
      ],
      network: [
        {
          interface_ref: "nic:eno1",
          speed_mbps: 10_000,
          state: "up",
          error_count: 0,
        },
      ],
      thermal: "normal",
      integrity: "verified",
    },
    hardware_probe_allowed: false,
    benchmark_allowed: false,
    placement_allowed: false,
    telemetry_collection_allowed: false,
    runtime_allowed: false,
    side_effects: [],
  };
}
