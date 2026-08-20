import { describe, expect, it } from "vitest";
import {
  evaluateHardwareAllocationRecommendation,
  hardwareAllocationRecommendationContract,
  performanceTelemetrySnapshotContract,
  type HardwareAllocationRecommendationRequest,
  type HardwareInventoryThresholdRequest,
  type HardwareNodeInventory,
  type HardwareRoleFamily,
  type PerformanceTelemetryMetric,
  type PerformanceTelemetrySignal,
  type PerformanceTelemetrySnapshotRequest,
} from "../src/index.js";

describe("BP-0855 explainable hardware allocation recommendation", () => {
  it("publishes an immutable recommendation-only contract", () => {
    expect(hardwareAllocationRecommendationContract).toMatchObject({
      contract_id: "lnsat.hardware.allocation_recommendation.v0_1",
      recommendation_version: "0.1",
      role_families: expect.arrayContaining([
        "authority_policy",
        "postgres_database",
        "jetstream_message_bus",
        "embedding_worker",
        "web_management",
      ]),
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
    expect(hardwareAllocationRecommendationContract.role_families).toHaveLength(11);
    expect(Object.isFrozen(hardwareAllocationRecommendationContract)).toBe(true);
    expect(
      Object.isFrozen(hardwareAllocationRecommendationContract.role_families),
    ).toBe(true);
  });

  it("recommends healthy supported hardware with explainable scores", () => {
    const result = evaluateHardwareAllocationRecommendation(validRequest());
    expect(result).toMatchObject({
      ok: true,
      hardware_allocation_recommendation: {
        contract_id: "lnsat.hardware.allocation_recommendation.v0_1",
        node_id: "node:lab-dell-r730-01",
        simulation_ref: "simulation:bp0855:healthy",
        recommendation_status: "recommended",
        overall_confidence: 100,
        evidence_skew_ms: 600_000,
        hardware_support_status: "supported",
        telemetry_freshness: "current",
        telemetry_health_status: "healthy",
        telemetry_evidence_status: "complete",
        candidate_roles: hardwareAllocationRecommendationContract.role_families,
        review_required_roles: [],
        excluded_roles: [],
        recommendation_only: true,
        simulation_only: true,
        placement_allowed: false,
        drain_allowed: false,
        side_effects: [],
      },
      hardware_errors: [],
      telemetry_errors: [],
      errors: [],
      side_effects: [],
    });
    if (!result.ok) throw new Error("expected recommendations");
    expect(result.hardware_allocation_recommendation.recommendations).toHaveLength(11);
    expect(result.hardware_allocation_recommendation.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "postgres_database",
          decision: "preferred",
          score: 100,
          confidence: 100,
          risk: "low",
          hardware_eligible: true,
          expected_bottlenecks: [],
          alternatives: [],
        }),
      ]),
    );
    expect(
      result.hardware_allocation_recommendation.simulation.placement_actions,
    ).toEqual([]);
  });

  it("limits simulation to unique requested candidate roles", () => {
    const request = validRequest();
    request.candidate_roles = ["postgres_database", "web_management"];
    request.simulation_ref = "simulation:bp0855:subset";
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected subset");
    expect(result.hardware_allocation_recommendation).toMatchObject({
      simulation_ref: "simulation:bp0855:subset",
      candidate_roles: ["postgres_database", "web_management"],
      preferred_roles: ["postgres_database", "web_management"],
      simulation: {
        proposed_roles: ["postgres_database", "web_management"],
        excluded_candidate_roles: [],
        placement_actions: [],
        drain_actions: [],
      },
    });
  });

  it("maps critical CPU evidence to global review with role-local scoring", () => {
    const request = validRequest();
    request.telemetry_request.snapshot.signals[0]!.value = 99;
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected critical recommendation");
    const cpuRole = recommendation(result, "embedding_worker");
    const storageRole = recommendation(result, "object_cold_storage");
    expect(cpuRole).toMatchObject({
      decision: "review_required",
      score: 70,
      risk: "high",
      expected_bottlenecks: ["cpu_utilization_pct"],
    });
    expect(cpuRole.score_factors).toContainEqual(
      expect.objectContaining({
        impact: -30,
        reason_code: "hae.performance.cpu_utilization_pct.critical",
      }),
    );
    expect(storageRole).toMatchObject({
      decision: "review_required",
      score: 100,
      risk: "moderate",
      expected_bottlenecks: [],
    });
    expect(result.hardware_allocation_recommendation).toMatchObject({
      recommendation_status: "review_required",
      preferred_roles: [],
      eligible_roles: [],
    });
  });

  it("keeps critical health review precedence for unrelated candidate subsets", () => {
    const request = validRequest();
    request.candidate_roles = ["object_cold_storage"];
    request.telemetry_request.snapshot.signals[0]!.value = 99;
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected critical subset recommendation");
    expect(result.hardware_allocation_recommendation).toMatchObject({
      recommendation_status: "review_required",
      telemetry_health_status: "critical",
      preferred_roles: [],
      eligible_roles: [],
      review_required_roles: ["object_cold_storage"],
    });
    expect(recommendation(result, "object_cold_storage")).toMatchObject({
      decision: "review_required",
      score: 100,
      constraints: ["hae.telemetry_critical_global"],
      expected_bottlenecks: [],
    });
    expect(recommendation(result, "object_cold_storage").score_factors).toContainEqual(
      expect.objectContaining({
        factor: "global_critical_telemetry",
        impact: 0,
        reason_code: "hae.telemetry_critical_global",
      }),
    );
  });

  it("maps storage bottlenecks to storage-dependent roles", () => {
    const request = validRequest();
    request.telemetry_request.snapshot.signals[2] = signal(
      "storage-latency",
      "storage_p99_latency_ms",
      100,
      "p99",
    );
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected storage recommendation");
    for (const role of [
      "postgres_database",
      "jetstream_message_bus",
      "vector_index",
      "graph_projection",
      "audit_storage_verification",
      "object_cold_storage",
    ] as HardwareRoleFamily[]) {
      expect(recommendation(result, role)).toMatchObject({
        decision: "review_required",
        expected_bottlenecks: ["storage_p99_latency_ms"],
      });
    }
    expect(recommendation(result, "web_management").expected_bottlenecks).toEqual([]);
  });

  it("keeps hardware role exclusions authoritative and offers alternatives", () => {
    const request = validRequest();
    request.hardware_request.inventory.storage[0]!.smart_health = "warning";
    request.hardware_request.inventory.thermal = "warning";
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected restricted recommendation");
    expect(result.hardware_allocation_recommendation.hardware_support_status).toBe(
      "restricted_roles_only",
    );
    const postgres = recommendation(result, "postgres_database");
    expect(postgres).toMatchObject({
      decision: "excluded",
      score: 0,
      hardware_eligible: false,
      risk: "high",
    });
    expect(postgres.constraints).toEqual(
      expect.arrayContaining([
        "hardware.storage_smart_warning",
        "hardware.thermal_warning",
      ]),
    );
    expect(postgres.alternatives.length).toBeGreaterThan(0);
    expect(postgres.alternatives).toEqual(
      expect.arrayContaining(["cache_retrieval", "platform_adapter"]),
    );
  });

  it.each([
    [
      "below_minimum",
      (node: HardwareNodeInventory) => {
        node.cpu.physical_cores = 2;
      },
    ],
    [
      "quarantined",
      (node: HardwareNodeInventory) => {
        node.integrity = "failed";
      },
    ],
  ])("excludes all roles for %s hardware", (status, mutate) => {
    const request = validRequest();
    mutate(request.hardware_request.inventory);
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected hard exclusion");
    expect(result.hardware_allocation_recommendation).toMatchObject({
      recommendation_status:
        status === "quarantined" ? "quarantined" : "no_eligible_roles",
      hardware_support_status: status,
      preferred_roles: [],
      eligible_roles: [],
      review_required_roles: [],
      excluded_roles: expect.arrayContaining(
        hardwareAllocationRecommendationContract.role_families,
      ),
      simulation: { proposed_roles: [], placement_actions: [], drain_actions: [] },
    });
    expect(
      result.hardware_allocation_recommendation.recommendations.every(
        (item) => item.decision === "excluded" && item.score === 0,
      ),
    ).toBe(true);
  });

  it("marks stale telemetry review-required and reduces confidence", () => {
    const request = validRequest();
    request.telemetry_request.evaluated_at = "2026-07-11T00:12:00.000Z";
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected stale recommendation");
    expect(result.hardware_allocation_recommendation).toMatchObject({
      recommendation_status: "review_required",
      overall_confidence: 80,
      telemetry_freshness: "stale",
      preferred_roles: [],
      eligible_roles: [],
      excluded_roles: [],
    });
    expect(
      result.hardware_allocation_recommendation.recommendations.every(
        (item) => item.decision === "review_required" && item.score === 85,
      ),
    ).toBe(true);
  });

  it("marks incomplete evidence review-required and reduces confidence", () => {
    const request = validRequest();
    request.telemetry_request.snapshot.signals =
      request.telemetry_request.snapshot.signals.filter(
        (signalEntry) => signalEntry.domain !== "network",
      );
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected incomplete recommendation");
    expect(result.hardware_allocation_recommendation).toMatchObject({
      recommendation_status: "review_required",
      overall_confidence: 90,
      telemetry_evidence_status: "insufficient",
      preferred_roles: [],
      eligible_roles: [],
      excluded_roles: [],
    });
    expect(
      result.hardware_allocation_recommendation.recommendations.every(
        (item) => item.decision === "review_required",
      ),
    ).toBe(true);
  });

  it("reduces confidence for unknown and derived evidence without inventing data", () => {
    const request = validRequest();
    request.hardware_request.inventory.memory.ecc_status = "unknown";
    request.telemetry_request.snapshot.signals[0]!.quality = "derived";
    request.telemetry_request.snapshot.signals[1]!.quality = "unknown";
    request.telemetry_request.snapshot.signals[1]!.value = null;
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected reduced confidence");
    expect(result.hardware_allocation_recommendation.overall_confidence).toBe(78);
    expect(result.hardware_allocation_recommendation.reason_codes).toContain(
      "performance.signal_unknown",
    );
  });

  it("rejects mismatched node evidence", () => {
    const request = validRequest();
    request.telemetry_request.snapshot.node_id = "node:other-node-02";
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result).toMatchObject({
      ok: false,
      hardware_errors: [],
      telemetry_errors: [],
      errors: [
        expect.objectContaining({
          code: "hardware_allocation.node_mismatch",
          path: "/telemetry_request/snapshot/node_id",
        }),
      ],
      raw_input_content: "withheld",
      side_effects: [],
    });
  });

  it("separates delegated hardware and telemetry errors", () => {
    const request = validRequest() as HardwareAllocationRecommendationRequest & {
      hardware_request: Record<string, unknown>;
      telemetry_request: Record<string, unknown>;
    };
    request.hardware_request.command = "probe";
    request.telemetry_request.collector_allowed = true;
    const result = evaluateHardwareAllocationRecommendation(request);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected delegated failure");
    expect(result.hardware_errors).toContainEqual(
      expect.objectContaining({ code: "hardware_inventory.unexpected_field" }),
    );
    expect(result.telemetry_errors).toContainEqual(
      expect.objectContaining({ code: "performance_telemetry.collector_forbidden" }),
    );
    expect(result.errors).toEqual([]);
  });

  it("rejects every opened authority and non-empty side effects", () => {
    const result = evaluateHardwareAllocationRecommendation({
      ...validRequest(),
      hardware_probe_allowed: true,
      telemetry_collection_allowed: true,
      benchmark_execution_allowed: true,
      placement_allowed: true,
      drain_allowed: true,
      runtime_allowed: true,
      database_write_allowed: true,
      network_access_allowed: true,
      side_effects: ["place"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected authority rejection");
    expect(result.errors.map((error) => error.code)).toEqual([
      "hardware_allocation.hardware_probe_forbidden",
      "hardware_allocation.telemetry_collection_forbidden",
      "hardware_allocation.benchmark_execution_forbidden",
      "hardware_allocation.placement_forbidden",
      "hardware_allocation.drain_forbidden",
      "hardware_allocation.runtime_forbidden",
      "hardware_allocation.database_write_forbidden",
      "hardware_allocation.network_access_forbidden",
      "hardware_allocation.side_effects_forbidden",
    ]);
  });

  it.each([
    { candidateRoles: [] },
    { candidateRoles: ["postgres_database", "postgres_database"] },
    { candidateRoles: ["root_shell"] },
  ])("rejects invalid candidate roles $candidateRoles", ({ candidateRoles }) => {
    const result = evaluateHardwareAllocationRecommendation({
      ...validRequest(),
      candidate_roles: candidateRoles,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected role rejection");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "hardware_allocation.invalid_candidate_roles",
        path: "/candidate_roles",
      }),
    );
  });

  it("withholds unexpected and secret-like raw input", () => {
    const marker = "raw-hae-marker";
    const result = evaluateHardwareAllocationRecommendation({
      ...validRequest(),
      command: `curl token:${marker}`,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected unsafe request rejection");
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "hardware_allocation.invalid_request",
        path: "",
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain(marker);
    expect(JSON.stringify(result)).not.toContain("curl");
  });

  it("contains accessors, hidden fields, symbols, cycles, and hostile proxies", () => {
    let reads = 0;
    const accessor = validRequest();
    Object.defineProperty(accessor, "simulation_ref", {
      enumerable: true,
      get() {
        reads += 1;
        return "simulation:accessor";
      },
    });
    const hidden = validRequest();
    Object.defineProperty(hidden, "placement_allowed", {
      enumerable: false,
      value: false,
    });
    const symbol = validRequest() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = false;
    const cyclic = validRequest() as unknown as Record<string, unknown>;
    cyclic.self = cyclic;
    const hostile = new Proxy(validRequest(), {
      ownKeys() {
        throw new Error("hostile-hae-marker");
      },
    });

    for (const input of [accessor, hidden, symbol, cyclic, hostile]) {
      const result = evaluateHardwareAllocationRecommendation(input);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected hostile rejection");
      expect(result.errors).toEqual([
        expect.objectContaining({ code: "hardware_allocation.invalid_request" }),
      ]);
      expect(JSON.stringify(result)).not.toContain("hostile-hae-marker");
    }
    expect(reads).toBe(0);
  });

  it("is deterministic, preserves caller state, and isolates returned evidence", () => {
    const request = validRequest();
    const before = JSON.stringify(request);
    const first = evaluateHardwareAllocationRecommendation(request);
    const second = evaluateHardwareAllocationRecommendation(request);
    expect(first).toEqual(second);
    expect(JSON.stringify(request)).toBe(before);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected first recommendation");
    first.hardware_allocation_recommendation.preferred_roles.push("platform_adapter");
    first.hardware_allocation_recommendation.recommendations[0]!.alternatives.push(
      "platform_adapter",
    );
    const third = evaluateHardwareAllocationRecommendation(validRequest());
    expect(third.ok).toBe(true);
    if (!third.ok) throw new Error("expected isolated recommendation");
    expect(third).toEqual(second);
  });
});

function recommendation(
  result: Extract<
    ReturnType<typeof evaluateHardwareAllocationRecommendation>,
    { ok: true }
  >,
  role: HardwareRoleFamily,
) {
  const item = result.hardware_allocation_recommendation.recommendations.find(
    (candidate) => candidate.role === role,
  );
  if (item === undefined) throw new Error(`missing role ${role}`);
  return item;
}

function validRequest(): {
  hardware_request: HardwareInventoryThresholdRequest;
  telemetry_request: PerformanceTelemetrySnapshotRequest;
  simulation_ref: string;
  candidate_roles?: HardwareRoleFamily[];
} {
  return {
    hardware_request: validHardwareRequest(),
    telemetry_request: validTelemetryRequest(),
    simulation_ref: "simulation:bp0855:healthy",
  };
}

function validHardwareRequest(): HardwareInventoryThresholdRequest {
  return {
    inventory: {
      node_id: "node:lab-dell-r730-01",
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
          interface_ref: "nic:enp3s0",
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

function validTelemetryRequest(): PerformanceTelemetrySnapshotRequest {
  return {
    snapshot: {
      snapshot_id: "snapshot:lab-r730-01:0855",
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
