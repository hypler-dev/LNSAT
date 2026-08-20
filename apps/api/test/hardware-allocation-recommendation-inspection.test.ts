import {
  evaluateHardwareAllocationRecommendation,
  performanceTelemetrySnapshotContract,
  type HardwareAllocationRecommendationRequest,
  type PerformanceTelemetryMetric,
  type PerformanceTelemetrySignal,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  hardwareAllocationRecommendationInspectionGatewayContract,
  inspectHardwareAllocationRecommendationGatewayRequest,
  registerHardwareAllocationRecommendationInspectionRoute,
} from "../src/index.js";

const now = new Date("2026-07-12T12:00:00.000Z");

describe("@lnsat/api BP-0856 hardware allocation recommendation inspection", () => {
  const gateway = buildApiGateway({ now: () => now });
  afterAll(async () => gateway.close());

  it("publishes closed read-only metadata and delegates BP-0855 exactly", async () => {
    expect(registerHardwareAllocationRecommendationInspectionRoute).toBeTypeOf(
      "function",
    );
    expect(hardwareAllocationRecommendationInspectionGatewayContract).toMatchObject({
      method: "POST",
      path: "/v1/hardware/allocation/recommendation/inspect",
      caller_supplied_only: true,
      read_only: true,
      recommendation_only: true,
      simulation_only: true,
      hardware_probe_allowed: false,
      telemetry_collection_allowed: false,
      benchmark_execution_allowed: false,
      placement_allowed: false,
      drain_allowed: false,
      runtime_allowed: false,
      database_write_allowed: false,
      network_access_allowed: false,
      side_effects: [],
    });
    const haeRequest = validRequest();
    const delegated = evaluateHardwareAllocationRecommendation(haeRequest);
    const response = await inspectHardwareAllocationRecommendationGatewayRequest(
      { request_id: "req_bp0856_valid", hae_request: haeRequest },
      { now },
    );
    expect(response).toMatchObject({
      ok: true,
      request_id: "req_bp0856_valid",
      inspected_at: now.toISOString(),
      hae_source: "caller_supplied",
      recommendation_status: "recommended",
      constraints: { read_only: true, placement_allowed: false, drain_allowed: false },
      side_effects: [],
    });
    expect(delegated.ok).toBe(true);
    if (!response.ok || !delegated.ok) throw new Error("expected recommendation");
    expect(response.hardware_allocation_recommendation).toEqual(
      delegated.hardware_allocation_recommendation,
    );
  });

  it("withholds malformed outer and delegated input", async () => {
    const outer = await inspectHardwareAllocationRecommendationGatewayRequest(
      { raw_command: "curl token:private-value" },
      { now },
    );
    expect(outer).toMatchObject({
      ok: false,
      request_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "hardware_allocation_gateway.unexpected_field",
        }),
        expect.objectContaining({
          code: "hardware_allocation_gateway.missing_hae_request",
        }),
      ]),
      raw_input_content: "withheld",
    });
    expect(JSON.stringify(outer)).not.toContain("private-value");

    const delegated = await inspectHardwareAllocationRecommendationGatewayRequest(
      {
        hae_request: {
          ...validRequest(),
          placement_allowed: true,
          command: "token:private-value",
        },
      },
      { now },
    );
    expect(delegated).toMatchObject({
      ok: false,
      allocation_errors: expect.arrayContaining([
        expect.objectContaining({ code: "hardware_allocation.invalid_request" }),
      ]),
      raw_input_content: "withheld",
    });
    expect(JSON.stringify(delegated)).not.toContain("private-value");
  });

  it("rejects outer authority flags and side effects", async () => {
    const response = await inspectHardwareAllocationRecommendationGatewayRequest(
      {
        hae_request: validRequest(),
        hardware_probe_allowed: true,
        telemetry_collection_allowed: true,
        benchmark_execution_allowed: true,
        placement_allowed: true,
        drain_allowed: true,
        runtime_allowed: true,
        database_write_allowed: true,
        network_access_allowed: true,
        side_effects: ["place"],
      },
      { now },
    );
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected closed authority rejection");
    expect(response.request_errors.map((error) => error.code)).toEqual([
      "hardware_allocation_gateway.hardware_probe_forbidden",
      "hardware_allocation_gateway.telemetry_collection_forbidden",
      "hardware_allocation_gateway.benchmark_execution_forbidden",
      "hardware_allocation_gateway.placement_forbidden",
      "hardware_allocation_gateway.drain_forbidden",
      "hardware_allocation_gateway.runtime_forbidden",
      "hardware_allocation_gateway.database_write_forbidden",
      "hardware_allocation_gateway.network_access_forbidden",
      "hardware_allocation_gateway.side_effects_forbidden",
    ]);
  });

  it("rejects accessors, symbols, and non-enumerable outer fields without getters", async () => {
    let getterCalls = 0;
    const accessor = { hae_request: validRequest() } as Record<string, unknown>;
    Object.defineProperty(accessor, "request_id", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "req_bp0856_getter";
      },
    });
    const accessorResponse =
      await inspectHardwareAllocationRecommendationGatewayRequest(accessor, { now });
    expect(accessorResponse).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "hardware_allocation_gateway.invalid_request",
        }),
      ],
    });
    expect(getterCalls).toBe(0);

    const symbolResponse = await inspectHardwareAllocationRecommendationGatewayRequest(
      { hae_request: validRequest(), [Symbol("private")]: "marker" },
      { now },
    );
    expect(symbolResponse).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "hardware_allocation_gateway.invalid_request",
        }),
      ],
    });

    const hidden = { hae_request: validRequest() };
    Object.defineProperty(hidden, "request_id", {
      enumerable: false,
      value: "req_bp0856_hidden",
    });
    const hiddenResponse = await inspectHardwareAllocationRecommendationGatewayRequest(
      hidden,
      { now },
    );
    expect(hiddenResponse).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "hardware_allocation_gateway.invalid_request",
        }),
      ],
    });
  });

  it("registers POST route with 200/400 bounded responses", async () => {
    const success = await gateway.inject({
      method: hardwareAllocationRecommendationInspectionGatewayContract.method,
      url: hardwareAllocationRecommendationInspectionGatewayContract.path,
      payload: { hae_request: validRequest() },
    });
    expect(success.statusCode).toBe(200);
    expect(success.json()).toMatchObject({
      ok: true,
      recommendation_status: "recommended",
    });

    const rejected = await gateway.inject({
      method: "POST",
      url: hardwareAllocationRecommendationInspectionGatewayContract.path,
      payload: { hae_request: { ...validRequest(), drain_allowed: true } },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json()).toMatchObject({
      ok: false,
      allocation_errors: [
        expect.objectContaining({ code: "hardware_allocation.drain_forbidden" }),
      ],
      raw_input_content: "withheld",
    });
  });
});

function validRequest(): HardwareAllocationRecommendationRequest {
  return {
    simulation_ref: "simulation:bp0856:healthy",
    hardware_request: {
      inventory: {
        node_id: "node:lab-r730-01",
        observed_at: "2026-07-11T00:00:00.000Z",
        platform: "linux",
        architecture: "x86_64",
        cpu: { physical_cores: 16, logical_cores: 32 },
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
            role: "active_database",
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
    },
    telemetry_request: {
      snapshot: {
        snapshot_id: "snapshot:lab-r730-01:0856",
        node_id: "node:lab-r730-01",
        window_started_at: "2026-07-11T00:00:00.000Z",
        window_ended_at: "2026-07-11T00:10:00.000Z",
        signals: [
          signal("cpu", "cpu_utilization_pct", 50),
          signal("memory", "memory_utilization_pct", 60),
          signal("storage", "storage_utilization_pct", 50),
          signal("network", "network_utilization_pct", 30),
          signal("thermal", "thermal_celsius", 60),
          signal("workload", "workload_availability_pct", 99.99),
        ],
      },
      evaluated_at: "2026-07-11T00:10:30.000Z",
      max_age_ms: 60_000,
      collector_allowed: false,
      node_agent_allowed: false,
      hardware_probe_allowed: false,
      benchmark_execution_allowed: false,
      placement_allowed: false,
      alert_dispatch_allowed: false,
      runtime_allowed: false,
      database_write_allowed: false,
      network_access_allowed: false,
      side_effects: [],
    },
    side_effects: [],
  };
}

function signal(
  id: string,
  metric: PerformanceTelemetryMetric,
  value: number,
): PerformanceTelemetrySignal {
  const definition = performanceTelemetrySnapshotContract.metrics[metric];
  return {
    signal_ref: `signal:${id}`,
    domain: definition.domain,
    metric,
    scope_ref: id === "workload" ? "service:gateway" : "node:lab-r730-01",
    unit: definition.unit,
    aggregation: "gauge",
    value,
    quality: "observed",
  };
}
