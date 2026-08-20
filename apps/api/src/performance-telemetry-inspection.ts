import {
  evaluatePerformanceTelemetrySnapshot,
  type PerformanceTelemetrySnapshotError,
  type PerformanceTelemetrySnapshotEvidence,
} from "@lnsat/packets";

export const PERFORMANCE_TELEMETRY_INSPECTION_GATEWAY_STATUS = "read_only";

const contractId = "lnsat.gateway.performance_telemetry.inspect.v0_1" as const;
const contractMethod = "POST" as const;
const contractPath = "/v1/performance/telemetry/inspect" as const;
const contractSourceDocs = Object.freeze([
  "docs/architecture/DISTRIBUTED_KNOWLEDGE_HARDWARE_AND_OBSERVABILITY.md",
  "docs/reference/CONTRACT_PROVENANCE.md",
  "docs/reference/CONTRACT_PROVENANCE.md",
  "packages/packets/src/performance-telemetry-snapshot.ts",
  "apps/api/src/performance-telemetry-inspection.ts",
] as const);

export const performanceTelemetryInspectionGatewayContract = Object.freeze({
  contract_id: contractId,
  method: contractMethod,
  path: contractPath,
  authority: Object.freeze([
    "@lnsat/packets",
    "caller-supplied-performance-telemetry",
    "LNSAT Gateway",
  ] as const),
  source_docs: contractSourceDocs,
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
  side_effects: Object.freeze([] as const),
  status: "read_only_gateway_inspection",
} as const);

export type PerformanceTelemetryInspectionGatewayRequest = {
  request_id?: string;
  telemetry_request: unknown;
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

export type PerformanceTelemetryInspectionGatewayErrorCode =
  | "performance_telemetry_gateway.invalid_request"
  | "performance_telemetry_gateway.unexpected_field"
  | "performance_telemetry_gateway.invalid_request_id"
  | "performance_telemetry_gateway.invalid_inspection_time"
  | "performance_telemetry_gateway.missing_telemetry_request"
  | "performance_telemetry_gateway.collector_forbidden"
  | "performance_telemetry_gateway.node_agent_forbidden"
  | "performance_telemetry_gateway.hardware_probe_forbidden"
  | "performance_telemetry_gateway.benchmark_execution_forbidden"
  | "performance_telemetry_gateway.placement_forbidden"
  | "performance_telemetry_gateway.alert_dispatch_forbidden"
  | "performance_telemetry_gateway.runtime_forbidden"
  | "performance_telemetry_gateway.database_write_forbidden"
  | "performance_telemetry_gateway.network_access_forbidden"
  | "performance_telemetry_gateway.side_effects_forbidden";

export type PerformanceTelemetryInspectionGatewayError = {
  code: PerformanceTelemetryInspectionGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type PerformanceTelemetryInspectionConstraints = {
  supplied_telemetry_only: true;
  read_only: true;
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
};

type PerformanceTelemetryInspectionSuccess = {
  ok: true;
  contract_id: typeof contractId;
  request_id: string | null;
  inspected_at: string;
  telemetry_source: "caller_supplied";
  source_docs: string[];
  performance_telemetry_snapshot: PerformanceTelemetrySnapshotEvidence;
  freshness: PerformanceTelemetrySnapshotEvidence["freshness"];
  health_status: PerformanceTelemetrySnapshotEvidence["health_status"];
  evidence_status: PerformanceTelemetrySnapshotEvidence["evidence_status"];
  performance_status: PerformanceTelemetrySnapshotEvidence["performance_status"];
  findings: PerformanceTelemetrySnapshotEvidence["findings"];
  reason_codes: string[];
  coverage: PerformanceTelemetrySnapshotEvidence["coverage"];
  summary: PerformanceTelemetrySnapshotEvidence["summary"];
  constraints: PerformanceTelemetryInspectionConstraints;
  side_effects: [];
};

type PerformanceTelemetryInspectionFailure = {
  ok: false;
  contract_id: typeof contractId;
  request_id: string | null;
  inspected_at: string | null;
  telemetry_source: "caller_supplied";
  source_docs: string[];
  request_errors: PerformanceTelemetryInspectionGatewayError[];
  telemetry_errors: PerformanceTelemetrySnapshotError[];
  performance_telemetry_snapshot: null;
  freshness: null;
  health_status: null;
  evidence_status: null;
  performance_status: null;
  findings: [];
  reason_codes: [];
  coverage: null;
  summary: null;
  constraints: PerformanceTelemetryInspectionConstraints;
  raw_input_content: "withheld";
  side_effects: [];
};

export type PerformanceTelemetryInspectionGatewayResponse =
  PerformanceTelemetryInspectionSuccess | PerformanceTelemetryInspectionFailure;

type SnapshotRequest = Record<string, unknown>;
type NormalizedRequest =
  | { ok: true; request_id: string | null; telemetry_request: unknown }
  | {
      ok: false;
      request_id: string | null;
      errors: PerformanceTelemetryInspectionGatewayError[];
    };

const allowedRequestKeys = new Set([
  "request_id",
  "telemetry_request",
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
const safeOuterKeyPattern = /^[a-z][a-z0-9_]{0,63}$/;
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const secretLikeOuterKeyPattern =
  /(password|secret|token|credential|api_?key|private_?key)/i;
const secretLikeRequestIdPattern =
  /(password|secret|token|credential|api_?key|private_?key|sk-)/i;

const constraints = (): PerformanceTelemetryInspectionConstraints => ({
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
});

export async function inspectPerformanceTelemetryGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<PerformanceTelemetryInspectionGatewayResponse> {
  const inspectedAt = resolveInspectedAt(options);
  if (inspectedAt === null) {
    return failure(null, null, [
      gatewayError(
        "performance_telemetry_gateway.invalid_inspection_time",
        "",
        "Performance telemetry Gateway inspection time is invalid.",
      ),
    ]);
  }

  let snapshot: SnapshotRequest;
  try {
    snapshot = snapshotOuterRequest(input);
  } catch {
    return failure(null, inspectedAt, [
      gatewayError(
        "performance_telemetry_gateway.invalid_request",
        "",
        "Performance telemetry Gateway request could not be safely inspected.",
      ),
    ]);
  }

  const normalized = normalizeRequest(snapshot);
  if (!normalized.ok) {
    return failure(normalized.request_id, inspectedAt, normalized.errors);
  }

  const telemetryResult = evaluatePerformanceTelemetrySnapshot(
    normalized.telemetry_request,
  );
  if (!telemetryResult.ok) {
    return failure(normalized.request_id, inspectedAt, [], telemetryResult.errors);
  }

  const evidence = telemetryResult.performance_telemetry_snapshot;
  return {
    ok: true,
    contract_id: contractId,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    telemetry_source: "caller_supplied",
    source_docs: [...contractSourceDocs],
    performance_telemetry_snapshot: evidence,
    freshness: evidence.freshness,
    health_status: evidence.health_status,
    evidence_status: evidence.evidence_status,
    performance_status: evidence.performance_status,
    findings: evidence.findings,
    reason_codes: evidence.reason_codes,
    coverage: evidence.coverage,
    summary: evidence.summary,
    constraints: constraints(),
    side_effects: [],
  };
}

function snapshotOuterRequest(input: unknown): SnapshotRequest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Request must be an object.");
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Request must be a plain object.");
  }

  const keys = Reflect.ownKeys(input);
  if (keys.length > allowedRequestKeys.size) {
    throw new TypeError("Request exceeds field limit.");
  }

  const snapshot: SnapshotRequest = Object.create(null) as SnapshotRequest;
  for (const key of keys) {
    if (
      typeof key !== "string" ||
      !safeOuterKeyPattern.test(key) ||
      secretLikeOuterKeyPattern.test(key)
    ) {
      throw new TypeError("Request field is unsafe.");
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !("value" in descriptor)
    ) {
      throw new TypeError("Request property descriptor is invalid.");
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function normalizeRequest(input: SnapshotRequest): NormalizedRequest {
  const errors: PerformanceTelemetryInspectionGatewayError[] = [];
  const keys = Object.keys(input);
  for (const key of keys) {
    if (!allowedRequestKeys.has(key)) {
      errors.push(
        gatewayError(
          "performance_telemetry_gateway.unexpected_field",
          "/*",
          "Unexpected performance telemetry Gateway request field.",
        ),
      );
    }
  }

  const requestIdValue = input.request_id;
  const requestId =
    typeof requestIdValue === "string" &&
    safeRequestIdPattern.test(requestIdValue) &&
    !secretLikeRequestIdPattern.test(requestIdValue)
      ? requestIdValue
      : null;
  if (
    keys.includes("request_id") &&
    (typeof requestIdValue !== "string" ||
      !safeRequestIdPattern.test(requestIdValue) ||
      secretLikeRequestIdPattern.test(requestIdValue))
  ) {
    errors.push(
      gatewayError(
        "performance_telemetry_gateway.invalid_request_id",
        "/request_id",
        "Performance telemetry Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!keys.includes("telemetry_request")) {
    errors.push(
      gatewayError(
        "performance_telemetry_gateway.missing_telemetry_request",
        "/telemetry_request",
        "Performance telemetry Gateway request must include telemetry_request.",
      ),
    );
  }

  rejectFalseOnlyFlag(
    input,
    keys,
    "collector_allowed",
    "performance_telemetry_gateway.collector_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "node_agent_allowed",
    "performance_telemetry_gateway.node_agent_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "hardware_probe_allowed",
    "performance_telemetry_gateway.hardware_probe_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "benchmark_execution_allowed",
    "performance_telemetry_gateway.benchmark_execution_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "placement_allowed",
    "performance_telemetry_gateway.placement_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "alert_dispatch_allowed",
    "performance_telemetry_gateway.alert_dispatch_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "runtime_allowed",
    "performance_telemetry_gateway.runtime_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "database_write_allowed",
    "performance_telemetry_gateway.database_write_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "network_access_allowed",
    "performance_telemetry_gateway.network_access_forbidden",
    errors,
  );

  if (keys.includes("side_effects") && !isStrictEmptyArray(input.side_effects)) {
    errors.push(
      gatewayError(
        "performance_telemetry_gateway.side_effects_forbidden",
        "/side_effects",
        "Performance telemetry Gateway side_effects must remain empty.",
      ),
    );
  }

  if (errors.length > 0) return { ok: false, request_id: requestId, errors };
  return {
    ok: true,
    request_id: requestId,
    telemetry_request: input.telemetry_request,
  };
}

function isStrictEmptyArray(value: unknown): value is [] {
  if (!Array.isArray(value)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    return (
      keys.length === 1 &&
      keys[0] === "length" &&
      lengthDescriptor !== undefined &&
      "value" in lengthDescriptor &&
      lengthDescriptor.value === 0 &&
      Reflect.get(value, "length") === 0
    );
  } catch {
    return false;
  }
}

function rejectFalseOnlyFlag(
  input: SnapshotRequest,
  keys: string[],
  key: string,
  code: PerformanceTelemetryInspectionGatewayErrorCode,
  errors: PerformanceTelemetryInspectionGatewayError[],
): void {
  if (keys.includes(key) && input[key] !== false) {
    errors.push(
      gatewayError(
        code,
        `/${key}`,
        "Performance telemetry Gateway authority must remain closed.",
      ),
    );
  }
}

function failure(
  requestId: string | null,
  inspectedAt: string | null,
  requestErrors: PerformanceTelemetryInspectionGatewayError[],
  telemetryErrors: PerformanceTelemetrySnapshotError[] = [],
): PerformanceTelemetryInspectionFailure {
  return {
    ok: false,
    contract_id: contractId,
    request_id: requestId,
    inspected_at: inspectedAt,
    telemetry_source: "caller_supplied",
    source_docs: [...contractSourceDocs],
    request_errors: requestErrors,
    telemetry_errors: telemetryErrors,
    performance_telemetry_snapshot: null,
    freshness: null,
    health_status: null,
    evidence_status: null,
    performance_status: null,
    findings: [],
    reason_codes: [],
    coverage: null,
    summary: null,
    constraints: constraints(),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function resolveInspectedAt(options: { now?: Date }): string | null {
  try {
    const time =
      options.now === undefined ? Date.now() : Date.prototype.getTime.call(options.now);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  } catch {
    return null;
  }
}

function gatewayError(
  code: PerformanceTelemetryInspectionGatewayErrorCode,
  path: string,
  message: string,
): PerformanceTelemetryInspectionGatewayError {
  return { code, path, message, severity: "error" };
}
