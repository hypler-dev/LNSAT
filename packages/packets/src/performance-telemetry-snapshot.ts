export const PERFORMANCE_TELEMETRY_SNAPSHOT_STATUS = "contract_only";

const contractId = "lnsat.performance.telemetry_snapshot.v0_1";
const snapshotVersion = "0.1";
const minimumMaxAgeMs = 1_000;
const maximumMaxAgeMs = 86_400_000;
const maximumWindowMs = 86_400_000;

export type PerformanceTelemetryDomain =
  | "cpu_numa"
  | "memory_ecc"
  | "storage"
  | "network"
  | "thermal_power"
  | "workload_service"
  | "lnsat_gateway"
  | "policy"
  | "knowledge"
  | "jetstream"
  | "postgresql"
  | "audit"
  | "hae";

export type PerformanceTelemetryUnit =
  | "percent"
  | "count"
  | "count_per_second"
  | "bytes_per_second"
  | "milliseconds"
  | "seconds"
  | "celsius";

export type PerformanceTelemetryAggregation = "gauge" | "sum" | "rate" | "p95" | "p99";

type ThresholdDirection = "higher_is_worse" | "lower_is_worse";

type MetricDefinition = {
  domain: PerformanceTelemetryDomain;
  unit: PerformanceTelemetryUnit;
  aggregations: readonly PerformanceTelemetryAggregation[];
  warning: number | null;
  critical: number | null;
  direction: ThresholdDirection | null;
};

const metricDefinitions = {
  cpu_utilization_pct: metric("cpu_numa", "percent", ["gauge", "p95"], 85, 95),
  numa_imbalance_pct: metric("cpu_numa", "percent", ["gauge", "p95"], 20, 40),
  memory_utilization_pct: metric("memory_ecc", "percent", ["gauge", "p95"], 85, 95),
  memory_pressure_full_pct: metric("memory_ecc", "percent", ["gauge", "p95"], 2, 10),
  ecc_uncorrectable_errors: metric("memory_ecc", "count", ["sum"], 1, 1),
  storage_utilization_pct: metric("storage", "percent", ["gauge", "p95"], 80, 95),
  storage_p99_latency_ms: metric("storage", "milliseconds", ["p99"], 20, 100),
  storage_error_rate_per_sec: metric("storage", "count_per_second", ["rate"], 0.1, 1),
  storage_remaining_life_pct: metric(
    "storage",
    "percent",
    ["gauge", "p95"],
    20,
    10,
    "lower_is_worse",
  ),
  storage_throughput_bytes_per_sec: informationalMetric("storage", "bytes_per_second", [
    "rate",
    "p95",
  ]),
  network_utilization_pct: metric("network", "percent", ["gauge", "p95"], 80, 95),
  network_packet_loss_pct: metric("network", "percent", ["rate", "p95"], 0.5, 2),
  network_error_rate_per_sec: metric("network", "count_per_second", ["rate"], 0.1, 1),
  network_throughput_bytes_per_sec: informationalMetric("network", "bytes_per_second", [
    "rate",
    "p95",
  ]),
  thermal_throttle_pct: metric("thermal_power", "percent", ["gauge", "p95"], 1, 10),
  thermal_celsius: metric("thermal_power", "celsius", ["gauge", "p95"], 80, 95),
  power_headroom_pct: metric(
    "thermal_power",
    "percent",
    ["gauge", "p95"],
    20,
    10,
    "lower_is_worse",
  ),
  workload_saturation_pct: metric(
    "workload_service",
    "percent",
    ["gauge", "p95"],
    80,
    95,
  ),
  workload_p99_latency_ms: metric(
    "workload_service",
    "milliseconds",
    ["p99"],
    250,
    1_000,
  ),
  workload_error_rate_pct: metric("workload_service", "percent", ["rate", "p95"], 1, 5),
  workload_queue_utilization_pct: metric(
    "workload_service",
    "percent",
    ["gauge", "p95"],
    80,
    95,
  ),
  workload_availability_pct: metric(
    "workload_service",
    "percent",
    ["gauge"],
    99.9,
    99,
    "lower_is_worse",
  ),
  workload_throughput_per_sec: informationalMetric(
    "workload_service",
    "count_per_second",
    ["rate", "p95"],
  ),
  gateway_policy_p99_latency_ms: metric(
    "lnsat_gateway",
    "milliseconds",
    ["p99"],
    100,
    500,
  ),
  gateway_auth_p99_latency_ms: metric(
    "lnsat_gateway",
    "milliseconds",
    ["p99"],
    100,
    500,
  ),
  gateway_denial_rate_per_sec: metric(
    "lnsat_gateway",
    "count_per_second",
    ["rate"],
    1,
    10,
  ),
  policy_bundle_age_seconds: metric("policy", "seconds", ["gauge", "p95"], 5, 30),
  policy_bundle_signature_failures: metric("policy", "count", ["sum"], 1, 1),
  policy_propagation_delay_seconds: metric(
    "policy",
    "seconds",
    ["gauge", "p95", "p99"],
    5,
    30,
  ),
  policy_activation_skew_seconds: metric(
    "policy",
    "seconds",
    ["gauge", "p95", "p99"],
    5,
    30,
  ),
  knowledge_retrieval_p99_latency_ms: metric(
    "knowledge",
    "milliseconds",
    ["p99"],
    250,
    1_000,
  ),
  knowledge_cache_hit_pct: metric(
    "knowledge",
    "percent",
    ["gauge", "p95"],
    80,
    60,
    "lower_is_worse",
  ),
  knowledge_index_freshness_seconds: metric(
    "knowledge",
    "seconds",
    ["gauge", "p95"],
    60,
    300,
  ),
  knowledge_residency_denials_per_sec: metric(
    "knowledge",
    "count_per_second",
    ["rate"],
    1,
    10,
  ),
  jetstream_consumer_lag: metric("jetstream", "count", ["gauge", "p95"], 1_000, 10_000),
  jetstream_redelivery_rate_per_sec: metric(
    "jetstream",
    "count_per_second",
    ["rate"],
    1,
    10,
  ),
  jetstream_storage_utilization_pct: metric(
    "jetstream",
    "percent",
    ["gauge", "p95"],
    80,
    95,
  ),
  jetstream_quorum_unavailable: metric("jetstream", "count", ["sum"], 1, 1),
  jetstream_consumer_health_pct: metric(
    "jetstream",
    "percent",
    ["gauge"],
    99.9,
    99,
    "lower_is_worse",
  ),
  postgres_capacity_utilization_pct: metric(
    "postgresql",
    "percent",
    ["gauge", "p95"],
    80,
    95,
  ),
  postgres_query_p99_latency_ms: metric(
    "postgresql",
    "milliseconds",
    ["p99"],
    250,
    1_000,
  ),
  postgres_connection_utilization_pct: metric(
    "postgresql",
    "percent",
    ["gauge", "p95"],
    80,
    95,
  ),
  postgres_lock_waits_per_sec: metric(
    "postgresql",
    "count_per_second",
    ["rate"],
    1,
    10,
  ),
  postgres_replication_lag_seconds: metric(
    "postgresql",
    "seconds",
    ["gauge", "p95", "p99"],
    5,
    30,
  ),
  postgres_wal_bytes_per_sec: informationalMetric("postgresql", "bytes_per_second", [
    "rate",
    "p95",
  ]),
  audit_persistence_lag_seconds: metric("audit", "seconds", ["gauge", "p95"], 5, 30),
  audit_integrity_failures: metric("audit", "count", ["sum"], 1, 1),
  audit_ingest_rate_per_sec: informationalMetric("audit", "count_per_second", [
    "rate",
    "p95",
  ]),
  audit_verification_lag_seconds: metric(
    "audit",
    "seconds",
    ["gauge", "p95", "p99"],
    5,
    30,
  ),
  audit_verification_failures: metric("audit", "count", ["sum"], 1, 1),
  hae_recommendation_age_seconds: metric("hae", "seconds", ["gauge", "p95"], 300, 900),
  hae_capacity_margin_pct: metric(
    "hae",
    "percent",
    ["gauge", "p95"],
    20,
    10,
    "lower_is_worse",
  ),
  hae_recommendation_confidence_pct: metric(
    "hae",
    "percent",
    ["gauge", "p95"],
    80,
    60,
    "lower_is_worse",
  ),
  hae_role_exclusion_count: metric("hae", "count", ["gauge", "sum"], 1, 5),
  hae_capacity_imbalance_pct: metric("hae", "percent", ["gauge", "p95"], 20, 40),
} as const satisfies Record<string, MetricDefinition>;

export type PerformanceTelemetryMetric = keyof typeof metricDefinitions;
export type PerformanceTelemetryQuality = "observed" | "derived" | "unknown";
export type PerformanceTelemetrySignalStatus =
  "healthy" | "warning" | "critical" | "informational" | "unknown";
export type PerformanceTelemetryStatus =
  "healthy" | "degraded" | "critical" | "stale" | "insufficient_evidence";
export type PerformanceTelemetryHealthStatus = "healthy" | "degraded" | "critical";
export type PerformanceTelemetryEvidenceStatus = "complete" | "insufficient";

const requiredDomains = [
  "cpu_numa",
  "memory_ecc",
  "storage",
  "network",
  "thermal_power",
  "workload_service",
] as const satisfies readonly PerformanceTelemetryDomain[];

export const performanceTelemetrySnapshotContract = deepFreeze({
  contract_id: contractId,
  snapshot_version: snapshotVersion,
  domains: [
    "cpu_numa",
    "memory_ecc",
    "storage",
    "network",
    "thermal_power",
    "workload_service",
    "lnsat_gateway",
    "policy",
    "knowledge",
    "jetstream",
    "postgresql",
    "audit",
    "hae",
  ] as PerformanceTelemetryDomain[],
  required_domains: [...requiredDomains],
  metrics: Object.fromEntries(
    Object.entries(metricDefinitions).map(([name, definition]) => [
      name,
      {
        domain: definition.domain,
        unit: definition.unit,
        aggregations: [...definition.aggregations],
        warning: definition.warning,
        critical: definition.critical,
        direction: definition.direction,
      },
    ]),
  ),
  statuses: [
    "healthy",
    "degraded",
    "critical",
    "stale",
    "insufficient_evidence",
  ] as PerformanceTelemetryStatus[],
  max_signals: 256,
  max_snapshot_window_ms: maximumWindowMs,
  min_max_age_ms: minimumMaxAgeMs,
  max_max_age_ms: maximumMaxAgeMs,
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
  side_effects: [] as string[],
  status: "source_only_pure_contract",
});

export type PerformanceTelemetrySignal = {
  signal_ref: string;
  domain: PerformanceTelemetryDomain;
  metric: PerformanceTelemetryMetric;
  scope_ref: string;
  unit: PerformanceTelemetryUnit;
  aggregation: PerformanceTelemetryAggregation;
  value: number | null;
  quality: PerformanceTelemetryQuality;
};

export type PerformanceTelemetrySnapshot = {
  snapshot_id: string;
  node_id: string;
  window_started_at: string;
  window_ended_at: string;
  signals: PerformanceTelemetrySignal[];
};

export type PerformanceTelemetrySnapshotRequest = {
  snapshot: PerformanceTelemetrySnapshot;
  evaluated_at: string;
  max_age_ms: number;
  collector_allowed?: false;
  node_agent_allowed?: false;
  hardware_probe_allowed?: false;
  benchmark_execution_allowed?: false;
  placement_allowed?: false;
  alert_dispatch_allowed?: false;
  runtime_allowed?: false;
  database_write_allowed?: false;
  network_access_allowed?: false;
  side_effects?: [];
};

export type PerformanceTelemetryFinding = {
  code: string;
  path: string;
  severity: "warning" | "error" | "critical";
  message: string;
  domain: PerformanceTelemetryDomain | null;
  metric: PerformanceTelemetryMetric | null;
};

export type PerformanceTelemetrySignalEvidence = PerformanceTelemetrySignal & {
  status: PerformanceTelemetrySignalStatus;
  thresholds: {
    warning: number;
    critical: number;
    direction: ThresholdDirection;
  } | null;
};

export type PerformanceTelemetrySnapshotEvidence = {
  contract_id: typeof contractId;
  snapshot_version: typeof snapshotVersion;
  snapshot_id: string;
  node_id: string;
  window_started_at: string;
  window_ended_at: string;
  evaluated_at: string;
  max_age_ms: number;
  age_ms: number;
  freshness: "current" | "stale";
  health_status: PerformanceTelemetryHealthStatus;
  evidence_status: PerformanceTelemetryEvidenceStatus;
  performance_status: PerformanceTelemetryStatus;
  signals: PerformanceTelemetrySignalEvidence[];
  findings: PerformanceTelemetryFinding[];
  reason_codes: string[];
  coverage: {
    required_domains: PerformanceTelemetryDomain[];
    observed_domains: PerformanceTelemetryDomain[];
    missing_domains: PerformanceTelemetryDomain[];
    unknown_signal_count: number;
  };
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    informational: number;
    unknown: number;
  };
  caller_supplied_only: true;
  recommendation_only: true;
  collector_allowed: false;
  node_agent_allowed: false;
  hardware_probe_allowed: false;
  benchmark_execution_allowed: false;
  placement_allowed: false;
  alert_dispatch_allowed: false;
  runtime_allowed: false;
  database_write_allowed: false;
  network_access_allowed: false;
  side_effects: [];
};

export type PerformanceTelemetrySnapshotErrorCode =
  | "performance_telemetry.invalid_request"
  | "performance_telemetry.unexpected_field"
  | "performance_telemetry.invalid_snapshot"
  | "performance_telemetry.secret_value_forbidden"
  | "performance_telemetry.collector_forbidden"
  | "performance_telemetry.node_agent_forbidden"
  | "performance_telemetry.hardware_probe_forbidden"
  | "performance_telemetry.benchmark_execution_forbidden"
  | "performance_telemetry.placement_forbidden"
  | "performance_telemetry.alert_dispatch_forbidden"
  | "performance_telemetry.runtime_forbidden"
  | "performance_telemetry.database_write_forbidden"
  | "performance_telemetry.network_access_forbidden"
  | "performance_telemetry.side_effects_forbidden";

export type PerformanceTelemetrySnapshotError = {
  code: PerformanceTelemetrySnapshotErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PerformanceTelemetrySnapshotResult =
  | {
      ok: true;
      performance_telemetry_snapshot: PerformanceTelemetrySnapshotEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      performance_telemetry_snapshot: null;
      errors: PerformanceTelemetrySnapshotError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const requestKeys = new Set([
  "snapshot",
  "evaluated_at",
  "max_age_ms",
  "collector_allowed",
  "node_agent_allowed",
  "hardware_probe_allowed",
  "benchmark_execution_allowed",
  "placement_allowed",
  "alert_dispatch_allowed",
  "runtime_allowed",
  "database_write_allowed",
  "network_access_allowed",
  "side_effects",
]);
const snapshotKeys = new Set([
  "snapshot_id",
  "node_id",
  "window_started_at",
  "window_ended_at",
  "signals",
]);
const signalKeys = new Set([
  "signal_ref",
  "domain",
  "metric",
  "scope_ref",
  "unit",
  "aggregation",
  "value",
  "quality",
]);
const refPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const nodeIdPattern = /^node:[a-z0-9][a-z0-9_.:-]{2,95}$/;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:|token:|credential:)/i;

type NormalizedRequest = {
  snapshot: PerformanceTelemetrySnapshot;
  evaluated_at: string;
  max_age_ms: number;
};

export function evaluatePerformanceTelemetrySnapshot(
  input: unknown,
): PerformanceTelemetrySnapshotResult {
  try {
    const snapshot = snapshotJsonValue(input, new WeakSet<object>(), { nodes: 0 }, 0);
    deepFreezeJsonValue(snapshot);
    return evaluateSafely(snapshot);
  } catch {
    return failure([
      telemetryError(
        "performance_telemetry.invalid_request",
        "",
        "Performance telemetry request could not be safely inspected.",
      ),
    ]);
  }
}

function evaluateSafely(input: JsonValue): PerformanceTelemetrySnapshotResult {
  const errors: PerformanceTelemetrySnapshotError[] = [];
  if (!isPlainObject(input)) {
    return failure([
      telemetryError(
        "performance_telemetry.invalid_request",
        "",
        "Performance telemetry request must be a plain object.",
      ),
    ]);
  }
  rejectUnexpected(input, requestKeys, "", errors);
  rejectSecretLike(input, "", errors, new WeakSet<object>());
  rejectClosedFlags(input, errors);
  const normalized = normalizeRequest(input, errors);
  if (errors.length > 0 || normalized === null) return failure(errors);

  return success(normalized);
}

function normalizeRequest(
  input: JsonObject,
  errors: PerformanceTelemetrySnapshotError[],
): NormalizedRequest | null {
  const snapshot = parseSnapshot(input.snapshot, errors);
  const evaluatedAt = parseTimestamp(input.evaluated_at, "/evaluated_at", errors);
  const maxAgeMs = parseInteger(
    input.max_age_ms,
    "/max_age_ms",
    minimumMaxAgeMs,
    maximumMaxAgeMs,
    errors,
  );
  if (snapshot === null || evaluatedAt === null || maxAgeMs === null) return null;

  const startedMs = Date.parse(snapshot.window_started_at);
  const endedMs = Date.parse(snapshot.window_ended_at);
  const evaluatedMs = Date.parse(evaluatedAt);
  if (startedMs > endedMs || endedMs - startedMs > maximumWindowMs) {
    invalid(errors, "/snapshot/window_started_at", "Snapshot window order or size");
  }
  if (endedMs > evaluatedMs) {
    invalid(errors, "/evaluated_at", "Evaluation time before snapshot end");
  }
  if (errors.length > 0) return null;
  return { snapshot, evaluated_at: evaluatedAt, max_age_ms: maxAgeMs };
}

function parseSnapshot(
  value: JsonValue | undefined,
  errors: PerformanceTelemetrySnapshotError[],
): PerformanceTelemetrySnapshot | null {
  if (!isPlainObject(value)) {
    invalid(errors, "/snapshot", "Snapshot object");
    return null;
  }
  rejectUnexpected(value, snapshotKeys, "/snapshot", errors);
  const snapshotId = parseRef(value.snapshot_id, "/snapshot/snapshot_id", errors);
  const nodeId = parseNodeId(value.node_id, "/snapshot/node_id", errors);
  const startedAt = parseTimestamp(
    value.window_started_at,
    "/snapshot/window_started_at",
    errors,
  );
  const endedAt = parseTimestamp(
    value.window_ended_at,
    "/snapshot/window_ended_at",
    errors,
  );
  const signals = parseSignals(value.signals, errors);
  if (
    snapshotId === null ||
    nodeId === null ||
    startedAt === null ||
    endedAt === null ||
    signals === null
  ) {
    return null;
  }
  return {
    snapshot_id: snapshotId,
    node_id: nodeId,
    window_started_at: startedAt,
    window_ended_at: endedAt,
    signals,
  };
}

function parseSignals(
  value: JsonValue | undefined,
  errors: PerformanceTelemetrySnapshotError[],
): PerformanceTelemetrySignal[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 256) {
    invalid(errors, "/snapshot/signals", "Signal array");
    return null;
  }
  const signals: PerformanceTelemetrySignal[] = [];
  const refs = new Set<string>();
  value.forEach((entry, index) => {
    const path = `/snapshot/signals/${index}`;
    const signal = parseSignal(entry, path, errors);
    if (signal === null) return;
    if (refs.has(signal.signal_ref)) {
      invalid(errors, `${path}/signal_ref`, "Unique signal_ref");
      return;
    }
    refs.add(signal.signal_ref);
    signals.push(signal);
  });
  return signals;
}

function parseSignal(
  value: JsonValue,
  path: string,
  errors: PerformanceTelemetrySnapshotError[],
): PerformanceTelemetrySignal | null {
  if (!isPlainObject(value)) {
    invalid(errors, path, "Signal object");
    return null;
  }
  rejectUnexpected(value, signalKeys, path, errors);
  const signalRef = parseRef(value.signal_ref, `${path}/signal_ref`, errors);
  const scopeRef = parseRef(value.scope_ref, `${path}/scope_ref`, errors);
  const metricName =
    typeof value.metric === "string" && value.metric in metricDefinitions
      ? (value.metric as PerformanceTelemetryMetric)
      : null;
  if (metricName === null) invalid(errors, `${path}/metric`, "Known metric");
  const definition = metricName === null ? null : metricDefinitions[metricName];
  const domain = parseEnum(
    value.domain,
    performanceTelemetrySnapshotContract.domains,
    `${path}/domain`,
    "Domain",
    errors,
  );
  const unit = parseEnum(
    value.unit,
    [
      "percent",
      "count",
      "count_per_second",
      "bytes_per_second",
      "milliseconds",
      "seconds",
      "celsius",
    ],
    `${path}/unit`,
    "Unit",
    errors,
  ) as PerformanceTelemetryUnit | null;
  const aggregation = parseEnum(
    value.aggregation,
    ["gauge", "sum", "rate", "p95", "p99"],
    `${path}/aggregation`,
    "Aggregation",
    errors,
  ) as PerformanceTelemetryAggregation | null;
  const quality = parseEnum(
    value.quality,
    ["observed", "derived", "unknown"],
    `${path}/quality`,
    "Quality",
    errors,
  ) as PerformanceTelemetryQuality | null;

  if (definition !== null && domain !== null && definition.domain !== domain) {
    invalid(errors, `${path}/domain`, "Metric domain");
  }
  if (definition !== null && unit !== null && definition.unit !== unit) {
    invalid(errors, `${path}/unit`, "Metric unit");
  }
  if (
    definition !== null &&
    aggregation !== null &&
    !(definition.aggregations as readonly string[]).includes(aggregation)
  ) {
    invalid(errors, `${path}/aggregation`, "Metric aggregation");
  }

  const signalValue = value.value;
  if (
    signalValue !== null &&
    (typeof signalValue !== "number" || !isValidValue(signalValue, unit))
  ) {
    invalid(errors, `${path}/value`, "Finite metric value in unit range");
  }
  if (quality === "unknown" && signalValue !== null) {
    invalid(errors, `${path}/value`, "Unknown-quality null value");
  }
  if (quality !== null && quality !== "unknown" && signalValue === null) {
    invalid(errors, `${path}/value`, "Observed or derived numeric value");
  }

  if (
    signalRef === null ||
    scopeRef === null ||
    metricName === null ||
    domain === null ||
    unit === null ||
    aggregation === null ||
    quality === null ||
    (signalValue !== null && typeof signalValue !== "number")
  ) {
    return null;
  }
  return {
    signal_ref: signalRef,
    domain,
    metric: metricName,
    scope_ref: scopeRef,
    unit,
    aggregation,
    value: signalValue,
    quality,
  };
}

function success(request: NormalizedRequest): PerformanceTelemetrySnapshotResult {
  const ageMs =
    Date.parse(request.evaluated_at) - Date.parse(request.snapshot.window_ended_at);
  const freshness = ageMs > request.max_age_ms ? "stale" : "current";
  const findings: PerformanceTelemetryFinding[] = [];
  const signals = request.snapshot.signals.map((signal, index) => {
    const definition = metricDefinitions[signal.metric];
    const status = classifySignal(signal.value, signal.quality, definition);
    if (status === "warning" || status === "critical") {
      findings.push({
        code: `performance.${signal.metric}.${status}`,
        path: `/snapshot/signals/${index}/value`,
        severity: status,
        message: `Performance signal crossed its ${status} threshold.`,
        domain: signal.domain,
        metric: signal.metric,
      });
    } else if (status === "unknown") {
      findings.push({
        code: "performance.signal_unknown",
        path: `/snapshot/signals/${index}/value`,
        severity: "warning",
        message: "Performance signal evidence is unknown.",
        domain: signal.domain,
        metric: signal.metric,
      });
    }
    return {
      ...signal,
      status,
      thresholds:
        definition.warning === null ||
        definition.critical === null ||
        definition.direction === null
          ? null
          : {
              warning: definition.warning,
              critical: definition.critical,
              direction: definition.direction,
            },
    };
  });

  const observedDomains = uniqueDomains(
    signals
      .filter(
        (signal) => signal.status !== "unknown" && signal.status !== "informational",
      )
      .map((signal) => signal.domain),
  );
  const missingDomains = requiredDomains.filter(
    (domain) => !observedDomains.includes(domain),
  );
  missingDomains.forEach((domain) =>
    findings.push({
      code: "performance.required_domain_missing",
      path: "/snapshot/signals",
      severity: "error",
      message: "Required performance telemetry domain has no usable signal.",
      domain,
      metric: null,
    }),
  );
  if (freshness === "stale") {
    findings.push({
      code: "performance.snapshot_stale",
      path: "/snapshot/window_ended_at",
      severity: "error",
      message: "Performance telemetry snapshot exceeds its allowed age.",
      domain: null,
      metric: null,
    });
  }

  const summary = {
    total: signals.length,
    healthy: signals.filter((signal) => signal.status === "healthy").length,
    warning: signals.filter((signal) => signal.status === "warning").length,
    critical: signals.filter((signal) => signal.status === "critical").length,
    informational: signals.filter((signal) => signal.status === "informational").length,
    unknown: signals.filter((signal) => signal.status === "unknown").length,
  };
  const healthStatus: PerformanceTelemetryHealthStatus =
    summary.critical > 0 ? "critical" : summary.warning > 0 ? "degraded" : "healthy";
  const evidenceStatus: PerformanceTelemetryEvidenceStatus =
    missingDomains.length > 0 || summary.unknown > 0 ? "insufficient" : "complete";
  const performanceStatus: PerformanceTelemetryStatus =
    healthStatus === "critical"
      ? "critical"
      : freshness === "stale"
        ? "stale"
        : evidenceStatus === "insufficient"
          ? "insufficient_evidence"
          : healthStatus;

  return {
    ok: true,
    performance_telemetry_snapshot: {
      contract_id: contractId,
      snapshot_version: snapshotVersion,
      snapshot_id: request.snapshot.snapshot_id,
      node_id: request.snapshot.node_id,
      window_started_at: request.snapshot.window_started_at,
      window_ended_at: request.snapshot.window_ended_at,
      evaluated_at: request.evaluated_at,
      max_age_ms: request.max_age_ms,
      age_ms: ageMs,
      freshness,
      health_status: healthStatus,
      evidence_status: evidenceStatus,
      performance_status: performanceStatus,
      signals,
      findings,
      reason_codes: [...new Set(findings.map((finding) => finding.code))],
      coverage: {
        required_domains: [...requiredDomains],
        observed_domains: observedDomains,
        missing_domains: [...missingDomains],
        unknown_signal_count: summary.unknown,
      },
      summary,
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
    },
    errors: [],
    side_effects: [],
  };
}

function classifySignal(
  value: number | null,
  quality: PerformanceTelemetryQuality,
  definition: MetricDefinition,
): PerformanceTelemetrySignalStatus {
  if (quality === "unknown" || value === null) return "unknown";
  if (
    definition.warning === null ||
    definition.critical === null ||
    definition.direction === null
  ) {
    return "informational";
  }
  if (definition.direction === "higher_is_worse") {
    if (value >= definition.critical) return "critical";
    if (value >= definition.warning) return "warning";
  } else {
    if (value <= definition.critical) return "critical";
    if (value <= definition.warning) return "warning";
  }
  return "healthy";
}

function rejectClosedFlags(
  input: JsonObject,
  errors: PerformanceTelemetrySnapshotError[],
): void {
  const flags = [
    ["collector_allowed", "performance_telemetry.collector_forbidden"],
    ["node_agent_allowed", "performance_telemetry.node_agent_forbidden"],
    ["hardware_probe_allowed", "performance_telemetry.hardware_probe_forbidden"],
    [
      "benchmark_execution_allowed",
      "performance_telemetry.benchmark_execution_forbidden",
    ],
    ["placement_allowed", "performance_telemetry.placement_forbidden"],
    ["alert_dispatch_allowed", "performance_telemetry.alert_dispatch_forbidden"],
    ["runtime_allowed", "performance_telemetry.runtime_forbidden"],
    ["database_write_allowed", "performance_telemetry.database_write_forbidden"],
    ["network_access_allowed", "performance_telemetry.network_access_forbidden"],
  ] as const;
  flags.forEach(([key, code]) => {
    if (key in input && input[key] !== false) {
      errors.push(telemetryError(code, `/${key}`, "Capability must remain false."));
    }
  });
  if (
    "side_effects" in input &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      telemetryError(
        "performance_telemetry.side_effects_forbidden",
        "/side_effects",
        "Side effects must remain empty.",
      ),
    );
  }
}

function rejectUnexpected(
  input: JsonObject,
  allowed: Set<string>,
  path: string,
  errors: PerformanceTelemetrySnapshotError[],
): void {
  Object.keys(input).forEach((key) => {
    if (!allowed.has(key)) {
      errors.push(
        telemetryError(
          "performance_telemetry.unexpected_field",
          `${path}/*`,
          "Unexpected performance telemetry field.",
        ),
      );
    }
  });
}

function rejectSecretLike(
  value: JsonValue,
  path: string,
  errors: PerformanceTelemetrySnapshotError[],
  seen: WeakSet<object>,
): void {
  if (typeof value === "string") {
    if (secretLikePattern.test(value)) {
      errors.push(
        telemetryError(
          "performance_telemetry.secret_value_forbidden",
          path,
          "Secret-like values are forbidden in performance telemetry.",
        ),
      );
    }
    return;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectSecretLike(item, `${path}/${index}`, errors, seen),
    );
  } else {
    Object.values(value).forEach((item) =>
      rejectSecretLike(item, `${path}/*`, errors, seen),
    );
  }
}

function parseRef(
  value: JsonValue | undefined,
  path: string,
  errors: PerformanceTelemetrySnapshotError[],
): string | null {
  if (typeof value !== "string" || !refPattern.test(value)) {
    invalid(errors, path, "Safe reference");
    return null;
  }
  return value;
}

function parseNodeId(
  value: JsonValue | undefined,
  path: string,
  errors: PerformanceTelemetrySnapshotError[],
): string | null {
  if (typeof value !== "string" || !nodeIdPattern.test(value)) {
    invalid(errors, path, "Safe node id");
    return null;
  }
  return value;
}

function parseTimestamp(
  value: JsonValue | undefined,
  path: string,
  errors: PerformanceTelemetrySnapshotError[],
): string | null {
  if (
    typeof value !== "string" ||
    !isoPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    invalid(errors, path, "ISO timestamp");
    return null;
  }
  return value;
}

function parseInteger(
  value: JsonValue | undefined,
  path: string,
  minimum: number,
  maximum: number,
  errors: PerformanceTelemetrySnapshotError[],
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    invalid(errors, path, "Bounded integer");
    return null;
  }
  return value;
}

function parseEnum<T extends string>(
  value: JsonValue | undefined,
  values: readonly T[],
  path: string,
  label: string,
  errors: PerformanceTelemetrySnapshotError[],
): T | null {
  if (typeof value !== "string" || !values.includes(value as T)) {
    invalid(errors, path, label);
    return null;
  }
  return value as T;
}

function isValidValue(value: number, unit: PerformanceTelemetryUnit | null): boolean {
  if (!Number.isFinite(value) || unit === null) return false;
  if (unit === "percent") return value >= 0 && value <= 100;
  if (unit === "celsius") return value >= -100 && value <= 250;
  if (value < 0) return false;
  return unit !== "count" || Number.isInteger(value);
}

function uniqueDomains(
  domains: PerformanceTelemetryDomain[],
): PerformanceTelemetryDomain[] {
  const order = performanceTelemetrySnapshotContract.domains;
  const selected = new Set(domains);
  return order.filter((domain) => selected.has(domain));
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
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > 512) throw new TypeError("String exceeds inspection limit.");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite number.");
    return value;
  }
  if (typeof value !== "object" || stack.has(value)) {
    throw new TypeError("Unsupported or cyclic JSON value.");
  }
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > 256
      ) {
        throw new TypeError("Array length descriptor is invalid.");
      }
      const arrayLength = lengthDescriptor.value;
      const keys = Reflect.ownKeys(value);
      if (
        keys.some(
          (key) =>
            typeof key !== "string" ||
            (key !== "length" &&
              (!/^\d+$/.test(key) ||
                key !== String(Number(key)) ||
                Number(key) >= arrayLength)),
        )
      ) {
        throw new TypeError("Array has unsupported properties.");
      }
      return Array.from({ length: arrayLength }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined ||
          descriptor.enumerable !== true ||
          !("value" in descriptor)
        ) {
          throw new TypeError("Array element descriptor is invalid.");
        }
        return snapshotJsonValue(descriptor.value, stack, budget, depth + 1);
      });
    }
    if (!isPlainObject(value)) throw new TypeError("Non-plain JSON object.");
    const keys = Reflect.ownKeys(value);
    if (keys.length > 64) throw new TypeError("Object exceeds inspection limit.");
    if (
      keys.some(
        (key) =>
          typeof key !== "string" || key.length > 128 || secretLikePattern.test(key),
      )
    ) {
      throw new TypeError("Object key is unsafe.");
    }
    return Object.fromEntries(
      keys.map((key) => {
        if (typeof key !== "string") throw new TypeError("Object key is invalid.");
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          descriptor.enumerable !== true ||
          !("value" in descriptor)
        ) {
          throw new TypeError("Object property descriptor is invalid.");
        }
        return [key, snapshotJsonValue(descriptor.value, stack, budget, depth + 1)];
      }),
    );
  } finally {
    stack.delete(value);
  }
}

function deepFreezeJsonValue(value: JsonValue): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) value.forEach(deepFreezeJsonValue);
  else Object.values(value).forEach(deepFreezeJsonValue);
  Object.freeze(value);
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => deepFreeze(item));
    Object.freeze(value);
  }
  return value;
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalid(
  errors: PerformanceTelemetrySnapshotError[],
  path: string,
  label: string,
): void {
  errors.push(
    telemetryError(
      "performance_telemetry.invalid_snapshot",
      path,
      `${label} is invalid.`,
    ),
  );
}

function failure(
  errors: PerformanceTelemetrySnapshotError[],
): PerformanceTelemetrySnapshotResult {
  return {
    ok: false,
    performance_telemetry_snapshot: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function telemetryError(
  code: PerformanceTelemetrySnapshotErrorCode,
  path: string,
  message: string,
): PerformanceTelemetrySnapshotError {
  return { code, path, message, severity: "error" };
}

function escapePointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function metric(
  domain: PerformanceTelemetryDomain,
  unit: PerformanceTelemetryUnit,
  aggregations: readonly PerformanceTelemetryAggregation[],
  warning: number,
  critical: number,
  direction: ThresholdDirection = "higher_is_worse",
): MetricDefinition {
  return { domain, unit, aggregations, warning, critical, direction };
}

function informationalMetric(
  domain: PerformanceTelemetryDomain,
  unit: PerformanceTelemetryUnit,
  aggregations: readonly PerformanceTelemetryAggregation[],
): MetricDefinition {
  return {
    domain,
    unit,
    aggregations,
    warning: null,
    critical: null,
    direction: null,
  };
}
