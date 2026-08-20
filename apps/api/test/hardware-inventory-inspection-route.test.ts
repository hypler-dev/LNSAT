import type { HardwareInventoryThresholdRequest } from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  hardwareInventoryInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-07-11T12:00:00.000Z");

describe("@lnsat/api BP-0850 hardware inventory inspection route", () => {
  const gateway = buildApiGateway({ now: () => now });

  afterAll(async () => {
    await gateway.close();
  });

  it("returns 200 for supported caller-supplied inventory", async () => {
    const response = await gateway.inject({
      method: hardwareInventoryInspectionGatewayContract.method,
      url: hardwareInventoryInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0850_route_supported",
        inventory_request: validInventoryRequest(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: "lnsat.gateway.hardware_inventory.inspect.v0_1",
      request_id: "req_bp0850_route_supported",
      inspected_at: "2026-07-11T12:00:00.000Z",
      inventory_source: "caller_supplied",
      support_status: "supported",
      constraints: {
        supplied_inventory_only: true,
        read_only: true,
        recommendation_only: true,
        live_collection_allowed: false,
        hardware_probe_allowed: false,
        node_agent_allowed: false,
        benchmark_allowed: false,
        placement_allowed: false,
        telemetry_collection_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
      },
      side_effects: [],
    });
  });

  it("returns 200 for quarantined evidence without activating controls", async () => {
    const inventoryRequest = validInventoryRequest();
    inventoryRequest.inventory.integrity = "failed";
    const response = await gateway.inject({
      method: hardwareInventoryInspectionGatewayContract.method,
      url: hardwareInventoryInspectionGatewayContract.path,
      payload: { inventory_request: inventoryRequest },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      support_status: "quarantined",
      eligible_roles: [],
      constraints: {
        read_only: true,
        hardware_probe_allowed: false,
        node_agent_allowed: false,
        placement_allowed: false,
        telemetry_collection_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
      },
      side_effects: [],
    });
  });

  it("maps malformed outer requests to 400 without rejected input echo", async () => {
    const response = await gateway.inject({
      method: hardwareInventoryInspectionGatewayContract.method,
      url: hardwareInventoryInspectionGatewayContract.path,
      payload: {
        request_id: 850,
        raw_command: "curl https://example.invalid/?token:private-value",
        live_collection_allowed: true,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "hardware_inventory_gateway.unexpected_field",
          path: "/raw_command",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.invalid_request_id",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.missing_inventory_request",
        }),
        expect.objectContaining({
          code: "hardware_inventory_gateway.live_collection_forbidden",
        }),
      ]),
      inventory_errors: [],
      hardware_inventory_threshold: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("private-value");
    expect(response.body).not.toContain("curl");
  });

  it("maps delegated invalid inventory to 400 without raw echo or controls", async () => {
    const response = await gateway.inject({
      method: hardwareInventoryInspectionGatewayContract.method,
      url: hardwareInventoryInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0850_route_invalid",
        inventory_request: {
          ...validInventoryRequest(),
          command: "probe token:private-value",
          placement_allowed: true,
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_errors: [],
      inventory_errors: expect.arrayContaining([
        expect.objectContaining({ code: "hardware_inventory.unexpected_field" }),
        expect.objectContaining({ code: "hardware_inventory.placement_forbidden" }),
      ]),
      hardware_inventory_threshold: null,
      constraints: {
        supplied_inventory_only: true,
        read_only: true,
        recommendation_only: true,
        live_collection_allowed: false,
        hardware_probe_allowed: false,
        node_agent_allowed: false,
        benchmark_allowed: false,
        placement_allowed: false,
        telemetry_collection_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
      },
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("private-value");
    expect(response.body).not.toContain("probe token");
  });

  it("maps a throwing inspection clock to bounded 400 evidence", async () => {
    const marker = "raw-clock-marker";
    const badClockGateway = buildApiGateway({
      now: () => {
        throw new Error(marker);
      },
    });
    try {
      const response = await badClockGateway.inject({
        method: hardwareInventoryInspectionGatewayContract.method,
        url: hardwareInventoryInspectionGatewayContract.path,
        payload: { inventory_request: validInventoryRequest() },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
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
      expect(response.body).not.toContain(marker);
    } finally {
      await badClockGateway.close();
    }
  });
});

function validInventoryRequest(): HardwareInventoryThresholdRequest {
  return {
    inventory: {
      node_id: "node:lab-hp-dl380-01",
      observed_at: "2026-07-11T00:00:00.000Z",
      platform: "linux",
      architecture: "x86_64",
      cpu: { physical_cores: 8, logical_cores: 16 },
      memory: {
        total_bytes: 137_438_953_472,
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
    side_effects: [],
  };
}
