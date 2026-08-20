import { describe, expect, it } from "vitest";
import {
  evaluatePerformanceTelemetrySnapshot,
  performanceTelemetrySnapshotContract,
  type PerformanceTelemetryMetric,
  type PerformanceTelemetrySignal,
  type PerformanceTelemetrySnapshotRequest,
} from "../src/index.js";

describe("BP-0852 performance telemetry snapshot contract", () => {
  it("publishes immutable full-domain metric metadata with all authority closed", () => {
    expect(performanceTelemetrySnapshotContract).toMatchObject({
      contract_id: "lnsat.performance.telemetry_snapshot.v0_1",
      snapshot_version: "0.1",
      required_domains: [
        "cpu_numa",
        "memory_ecc",
        "storage",
        "network",
        "thermal_power",
        "workload_service",
      ],
      max_signals: 256,
      caller_supplied_only: true,
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
    expect(Object.keys(performanceTelemetrySnapshotContract.metrics)).toHaveLength(55);
    expect(performanceTelemetrySnapshotContract.metrics).toMatchObject({
      storage_throughput_bytes_per_sec: { warning: null, critical: null },
      storage_remaining_life_pct: {
        warning: 20,
        critical: 10,
        direction: "lower_is_worse",
      },
      gateway_auth_p99_latency_ms: { domain: "lnsat_gateway" },
      policy_propagation_delay_seconds: { domain: "policy" },
      knowledge_index_freshness_seconds: { domain: "knowledge" },
      jetstream_quorum_unavailable: { domain: "jetstream" },
      postgres_replication_lag_seconds: { domain: "postgresql" },
      audit_verification_failures: { domain: "audit" },
      hae_recommendation_confidence_pct: { domain: "hae" },
    });
    expect(performanceTelemetrySnapshotContract.domains).toHaveLength(13);
    expect(Object.isFrozen(performanceTelemetrySnapshotContract)).toBe(true);
    expect(Object.isFrozen(performanceTelemetrySnapshotContract.metrics)).toBe(true);
  });

  it("returns healthy current evidence for complete baseline domains", () => {
    const result = evaluatePerformanceTelemetrySnapshot(validRequest());

    expect(result).toMatchObject({
      ok: true,
      performance_telemetry_snapshot: {
        contract_id: "lnsat.performance.telemetry_snapshot.v0_1",
        snapshot_version: "0.1",
        snapshot_id: "snapshot:lab-r730-01:001",
        node_id: "node:lab-dell-r730-01",
        age_ms: 30_000,
        freshness: "current",
        health_status: "healthy",
        evidence_status: "complete",
        performance_status: "healthy",
        findings: [],
        reason_codes: [],
        coverage: {
          missing_domains: [],
          unknown_signal_count: 0,
        },
        summary: {
          total: 6,
          healthy: 6,
          warning: 0,
          critical: 0,
          informational: 0,
          unknown: 0,
        },
        caller_supplied_only: true,
        recommendation_only: true,
        collector_allowed: false,
        node_agent_allowed: false,
        placement_allowed: false,
        alert_dispatch_allowed: false,
        network_access_allowed: false,
        side_effects: [],
      },
      errors: [],
      side_effects: [],
    });
  });

  it("classifies a high-is-worse warning threshold", () => {
    const request = validRequest();
    request.snapshot.signals[0]!.value = 85;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected warning evidence");
    expect(result.performance_telemetry_snapshot.performance_status).toBe("degraded");
    expect(result.performance_telemetry_snapshot.signals[0]).toMatchObject({
      metric: "cpu_utilization_pct",
      status: "warning",
      thresholds: { warning: 85, critical: 95, direction: "higher_is_worse" },
    });
  });

  it("classifies a high-is-worse critical threshold", () => {
    const request = validRequest();
    request.snapshot.signals[0]!.value = 95;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected critical evidence");
    expect(result.performance_telemetry_snapshot.performance_status).toBe("critical");
    expect(result.performance_telemetry_snapshot.reason_codes).toContain(
      "performance.cpu_utilization_pct.critical",
    );
  });

  it("classifies low-is-worse warning and critical thresholds", () => {
    const warning = validRequest();
    warning.snapshot.signals.push(signal("power", "power_headroom_pct", 20, "gauge"));
    const critical = validRequest();
    critical.snapshot.signals.push(
      signal("capacity", "hae_capacity_margin_pct", 10, "gauge"),
    );

    const warningResult = evaluatePerformanceTelemetrySnapshot(warning);
    const criticalResult = evaluatePerformanceTelemetrySnapshot(critical);
    expect(warningResult.ok).toBe(true);
    expect(criticalResult.ok).toBe(true);
    if (!warningResult.ok || !criticalResult.ok) throw new Error("expected evidence");
    expect(warningResult.performance_telemetry_snapshot.performance_status).toBe(
      "degraded",
    );
    expect(criticalResult.performance_telemetry_snapshot.performance_status).toBe(
      "critical",
    );
  });

  it("keeps informational metrics neutral and out of health coverage", () => {
    const request = validRequest();
    request.snapshot.signals = request.snapshot.signals.filter(
      (entry) => entry.domain !== "storage",
    );
    request.snapshot.signals.push(
      signal("storage-throughput", "storage_throughput_bytes_per_sec", 1_000, "rate"),
    );

    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected informational evidence");
    expect(result.performance_telemetry_snapshot).toMatchObject({
      health_status: "healthy",
      evidence_status: "insufficient",
      performance_status: "insufficient_evidence",
      coverage: { missing_domains: ["storage"] },
      summary: { healthy: 5, informational: 1 },
    });
    expect(result.performance_telemetry_snapshot.signals.at(-1)).toMatchObject({
      status: "informational",
      thresholds: null,
    });
  });

  it("preserves critical headline while reporting stale evidence separately", () => {
    const request = validRequest();
    request.evaluated_at = "2026-07-11T00:12:00.000Z";
    request.snapshot.signals[0]!.value = 99;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected stale evidence");
    expect(result.performance_telemetry_snapshot).toMatchObject({
      age_ms: 120_000,
      freshness: "stale",
      health_status: "critical",
      evidence_status: "complete",
      performance_status: "critical",
      summary: { critical: 1 },
    });
    expect(result.performance_telemetry_snapshot.reason_codes).toContain(
      "performance.snapshot_stale",
    );
  });

  it("uses stale headline when no critical evidence exists", () => {
    const request = validRequest();
    request.evaluated_at = "2026-07-11T00:12:00.000Z";
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected stale evidence");
    expect(result.performance_telemetry_snapshot).toMatchObject({
      freshness: "stale",
      health_status: "healthy",
      evidence_status: "complete",
      performance_status: "stale",
    });
  });

  it.each([
    "cpu_numa",
    "memory_ecc",
    "storage",
    "network",
    "thermal_power",
    "workload_service",
  ] as const)("marks missing %s domain insufficient", (domain) => {
    const request = validRequest();
    request.snapshot.signals = request.snapshot.signals.filter(
      (entry) => entry.domain !== domain,
    );
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected incomplete evidence");
    expect(result.performance_telemetry_snapshot.performance_status).toBe(
      "insufficient_evidence",
    );
    expect(result.performance_telemetry_snapshot.coverage.missing_domains).toContain(
      domain,
    );
  });

  it("preserves critical health when evidence coverage is insufficient", () => {
    const request = validRequest();
    request.snapshot.signals[0]!.value = 99;
    request.snapshot.signals = request.snapshot.signals.filter(
      (entry) => entry.domain !== "network",
    );
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected critical incomplete evidence");
    expect(result.performance_telemetry_snapshot).toMatchObject({
      health_status: "critical",
      evidence_status: "insufficient",
      performance_status: "critical",
      coverage: { missing_domains: ["network"] },
    });
  });

  it("marks unknown signals insufficient without inventing values", () => {
    const request = validRequest();
    request.snapshot.signals[0]!.value = null;
    request.snapshot.signals[0]!.quality = "unknown";
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected unknown evidence");
    expect(result.performance_telemetry_snapshot.performance_status).toBe(
      "insufficient_evidence",
    );
    expect(result.performance_telemetry_snapshot.summary.unknown).toBe(1);
    expect(result.performance_telemetry_snapshot.signals[0]!.status).toBe("unknown");
  });

  it.each([
    ["domain", "storage"],
    ["unit", "seconds"],
    ["aggregation", "sum"],
  ])("rejects catalog-incompatible %s", (field, value) => {
    const request = validRequest() as unknown as {
      snapshot: { signals: Array<Record<string, unknown>> };
    };
    request.snapshot.signals[0]![field] = value;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected catalog rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "performance_telemetry.invalid_snapshot",
        path: `/snapshot/signals/0/${field}`,
      }),
    );
  });

  it("rejects unknown metric names", () => {
    const request = validRequest() as unknown as {
      snapshot: { signals: Array<Record<string, unknown>> };
    };
    request.snapshot.signals[0]!.metric = "cpu_magic_score";
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected metric rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "/snapshot/signals/0/metric" }),
    );
  });

  it.each([
    [null, "observed"],
    [42, "unknown"],
  ])("binds value %s to quality %s", (value, quality) => {
    const request = validRequest() as unknown as {
      snapshot: { signals: Array<Record<string, unknown>> };
    };
    request.snapshot.signals[0]!.value = value;
    request.snapshot.signals[0]!.quality = quality;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected quality rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "/snapshot/signals/0/value" }),
    );
  });

  it("rejects impossible, reversed, oversized, and future snapshot windows", () => {
    const impossible = validRequest();
    impossible.snapshot.window_started_at = "2026-99-99T00:00:00.000Z";
    const reversed = validRequest();
    reversed.snapshot.window_started_at = "2026-07-11T00:11:00.000Z";
    const oversized = validRequest();
    oversized.snapshot.window_started_at = "2026-07-09T00:00:00.000Z";
    const future = validRequest();
    future.evaluated_at = "2026-07-11T00:09:59.000Z";

    for (const request of [impossible, reversed, oversized, future]) {
      const result = evaluatePerformanceTelemetrySnapshot(request);
      expect(result.ok).toBe(false);
    }
  });

  it.each([999, 86_400_001, 1.5])("rejects invalid max_age_ms %s", (maxAgeMs) => {
    const request = validRequest();
    request.max_age_ms = maxAgeMs;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected max age rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "/max_age_ms" }),
    );
  });

  it("rejects duplicate signal refs", () => {
    const request = validRequest();
    request.snapshot.signals[1]!.signal_ref = request.snapshot.signals[0]!.signal_ref;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected duplicate rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "/snapshot/signals/1/signal_ref" }),
    );
  });

  it("rejects every opened authority and non-empty side effects", () => {
    const result = evaluatePerformanceTelemetrySnapshot({
      ...validRequest(),
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
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected authority rejection");
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "performance_telemetry.collector_forbidden",
        "performance_telemetry.node_agent_forbidden",
        "performance_telemetry.hardware_probe_forbidden",
        "performance_telemetry.benchmark_execution_forbidden",
        "performance_telemetry.placement_forbidden",
        "performance_telemetry.alert_dispatch_forbidden",
        "performance_telemetry.runtime_forbidden",
        "performance_telemetry.database_write_forbidden",
        "performance_telemetry.network_access_forbidden",
        "performance_telemetry.side_effects_forbidden",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("rejects unexpected and secret-like fields without raw echo", () => {
    const marker = "raw-performance-marker";
    const result = evaluatePerformanceTelemetrySnapshot({
      ...validRequest(),
      command: `curl token:${marker}`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected secret rejection");
    expect(result.raw_input_content).toBe("withheld");
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "performance_telemetry.unexpected_field",
        "performance_telemetry.secret_value_forbidden",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("never echoes an unexpected caller key in error paths", () => {
    const marker = "raw-performance-key-marker";
    const request = validRequest() as unknown as Record<string, unknown>;
    request[marker] = false;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected unexpected-key rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "performance_telemetry.unexpected_field",
        path: "/*",
      }),
    );
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("rejects unexpected nested fields", () => {
    const request = validRequest() as unknown as {
      snapshot: { signals: Array<Record<string, unknown>> };
    };
    request.snapshot.signals[0]!.execute = false;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected nested rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "performance_telemetry.unexpected_field",
        path: "/snapshot/signals/0/*",
      }),
    );
  });

  it.each([
    ["percent", -1],
    ["percent", 101],
    ["count", 1.5],
    ["celsius", 251],
  ])("rejects out-of-range %s value %s", (unit, value) => {
    const request = validRequest() as unknown as {
      snapshot: { signals: Array<Record<string, unknown>> };
    };
    request.snapshot.signals[0]!.unit = unit;
    request.snapshot.signals[0]!.value = value;
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
  });

  it("is deterministic and does not mutate caller state", () => {
    const request = validRequest();
    const before = JSON.stringify(request);
    const first = evaluatePerformanceTelemetrySnapshot(request);
    const second = evaluatePerformanceTelemetrySnapshot(request);
    expect(first).toEqual(second);
    expect(JSON.stringify(request)).toBe(before);
  });

  it("isolates future evaluations from mutated returned evidence", () => {
    const first = evaluatePerformanceTelemetrySnapshot(validRequest());
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected first evidence");
    first.performance_telemetry_snapshot.coverage.required_domains.push("hae");
    first.performance_telemetry_snapshot.signals[0]!.thresholds!.critical = 1;

    const second = evaluatePerformanceTelemetrySnapshot(validRequest());
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("expected second evidence");
    expect(
      second.performance_telemetry_snapshot.coverage.required_domains,
    ).not.toContain("hae");
    expect(second.performance_telemetry_snapshot.signals[0]!.thresholds!.critical).toBe(
      95,
    );
  });

  it("contains hostile proxies and cyclic values without raw echo", () => {
    const marker = "hostile-performance-marker";
    const hostile = new Proxy(validRequest(), {
      ownKeys() {
        throw new Error(marker);
      },
    });
    const cyclic = validRequest() as unknown as Record<string, unknown>;
    cyclic.self = cyclic;

    for (const input of [hostile, cyclic]) {
      const result = evaluatePerformanceTelemetrySnapshot(input);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected hostile rejection");
      expect(result.errors).toEqual([
        expect.objectContaining({ code: "performance_telemetry.invalid_request" }),
      ]);
      expect(JSON.stringify(result)).not.toContain(marker);
    }
  });

  it("rejects symbol keys, hidden allowed and unexpected fields, and sparse arrays", () => {
    const symbolKey = validRequest() as unknown as Record<PropertyKey, unknown>;
    symbolKey[Symbol("hidden")] = "value";
    const hiddenField = validRequest() as unknown as Record<string, unknown>;
    Object.defineProperty(hiddenField, "execute", {
      enumerable: false,
      value: false,
    });
    const hiddenAllowedField = validRequest();
    Object.defineProperty(hiddenAllowedField, "evaluated_at", {
      enumerable: false,
      value: hiddenAllowedField.evaluated_at,
    });
    const sparse = validRequest();
    delete sparse.snapshot.signals[1];

    const symbolResult = evaluatePerformanceTelemetrySnapshot(symbolKey);
    const hiddenResult = evaluatePerformanceTelemetrySnapshot(hiddenField);
    const hiddenAllowedResult =
      evaluatePerformanceTelemetrySnapshot(hiddenAllowedField);
    const sparseResult = evaluatePerformanceTelemetrySnapshot(sparse);
    expect(symbolResult.ok).toBe(false);
    expect(hiddenResult.ok).toBe(false);
    expect(hiddenAllowedResult.ok).toBe(false);
    expect(sparseResult.ok).toBe(false);
    if (hiddenResult.ok) throw new Error("expected hidden field rejection");
    expect(hiddenResult.errors).toContainEqual(
      expect.objectContaining({
        code: "performance_telemetry.invalid_request",
        path: "",
      }),
    );
  });

  it("rejects accessors without invoking them", () => {
    const request = validRequest();
    let reads = 0;
    Object.defineProperty(request.snapshot.signals[0], "value", {
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? 50 : 99;
      },
    });
    const result = evaluatePerformanceTelemetrySnapshot(request);
    expect(result.ok).toBe(false);
    expect(reads).toBe(0);
  });

  it("rejects noncanonical array index properties", () => {
    const request = validRequest();
    Object.defineProperty(request.snapshot.signals, "01", {
      enumerable: true,
      value: { hidden: "bypass" },
    });

    expect(evaluatePerformanceTelemetrySnapshot(request).ok).toBe(false);
  });

  it("snapshots proxy array length once", () => {
    const request = validRequest();
    const signals = request.snapshot.signals;
    let lengthReads = 0;
    request.snapshot.signals = new Proxy(signals, {
      getOwnPropertyDescriptor(target, property) {
        if (property === "length") lengthReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    expect(evaluatePerformanceTelemetrySnapshot(request).ok).toBe(true);
    expect(lengthReads).toBe(1);
  });

  it("bounds oversized signal collections and non-finite values", () => {
    const oversized = validRequest();
    oversized.snapshot.signals = Array.from({ length: 257 }, (_, index) => ({
      ...signal(`cpu-${index}`, "cpu_utilization_pct", 50, "gauge"),
      signal_ref: `signal:cpu-${index}`,
    }));
    const nonFinite = validRequest();
    nonFinite.snapshot.signals[0]!.value = Number.NaN;
    expect(evaluatePerformanceTelemetrySnapshot(oversized).ok).toBe(false);
    expect(evaluatePerformanceTelemetrySnapshot(nonFinite).ok).toBe(false);
  });
});

function validRequest(): PerformanceTelemetrySnapshotRequest {
  return {
    snapshot: {
      snapshot_id: "snapshot:lab-r730-01:001",
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
