import {
  evaluateHardwareAllocationRecommendation,
  type HardwareAllocationRecommendationError,
  type HardwareAllocationRecommendationEvidence,
  type HardwareInventoryThresholdError,
  type PerformanceTelemetrySnapshotError,
} from "@lnsat/packets";

export const HARDWARE_ALLOCATION_RECOMMENDATION_INSPECTION_GATEWAY_STATUS = "read_only";

const contractId =
  "lnsat.gateway.hardware_allocation_recommendation.inspect.v0_1" as const;
const contractSourceDocs = Object.freeze([
  "docs/architecture/DISTRIBUTED_KNOWLEDGE_HARDWARE_AND_OBSERVABILITY.md",
  "docs/reference/CONTRACT_PROVENANCE.md",
  "docs/reference/CONTRACT_PROVENANCE.md",
  "packages/packets/src/hardware-allocation-recommendation.ts",
  "apps/api/src/hardware-allocation-recommendation-inspection.ts",
] as const);

export const hardwareAllocationRecommendationInspectionGatewayContract = Object.freeze({
  contract_id: contractId,
  method: "POST" as const,
  path: "/v1/hardware/allocation/recommendation/inspect" as const,
  authority: Object.freeze([
    "@lnsat/packets",
    "caller-supplied-hae-request",
    "LNSAT Gateway",
  ] as const),
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
  side_effects: Object.freeze([] as const),
  source_docs: contractSourceDocs,
  status: "read_only_gateway_inspection",
} as const);

export type HardwareAllocationRecommendationInspectionGatewayError = {
  code:
    | "hardware_allocation_gateway.invalid_request"
    | "hardware_allocation_gateway.unexpected_field"
    | "hardware_allocation_gateway.invalid_request_id"
    | "hardware_allocation_gateway.invalid_inspection_time"
    | "hardware_allocation_gateway.missing_hae_request"
    | "hardware_allocation_gateway.hardware_probe_forbidden"
    | "hardware_allocation_gateway.telemetry_collection_forbidden"
    | "hardware_allocation_gateway.benchmark_execution_forbidden"
    | "hardware_allocation_gateway.placement_forbidden"
    | "hardware_allocation_gateway.drain_forbidden"
    | "hardware_allocation_gateway.runtime_forbidden"
    | "hardware_allocation_gateway.database_write_forbidden"
    | "hardware_allocation_gateway.network_access_forbidden"
    | "hardware_allocation_gateway.side_effects_forbidden";
  path: string;
  message: string;
  severity: "error";
};

const constraints = () => ({
  caller_supplied_hae_only: true as const,
  read_only: true as const,
  recommendation_only: true as const,
  simulation_only: true as const,
  hardware_probe_allowed: false as const,
  telemetry_collection_allowed: false as const,
  benchmark_execution_allowed: false as const,
  placement_allowed: false as const,
  drain_allowed: false as const,
  runtime_allowed: false as const,
  database_write_allowed: false as const,
  network_access_allowed: false as const,
});

type Failure = {
  ok: false;
  contract_id: typeof contractId;
  request_id: string | null;
  inspected_at: string | null;
  hae_source: "caller_supplied";
  source_docs: string[];
  request_errors: HardwareAllocationRecommendationInspectionGatewayError[];
  hardware_errors: HardwareInventoryThresholdError[];
  telemetry_errors: PerformanceTelemetrySnapshotError[];
  allocation_errors: HardwareAllocationRecommendationError[];
  hardware_allocation_recommendation: null;
  constraints: ReturnType<typeof constraints>;
  raw_input_content: "withheld";
  side_effects: [];
};

type Success = {
  ok: true;
  contract_id: typeof contractId;
  request_id: string | null;
  inspected_at: string;
  hae_source: "caller_supplied";
  source_docs: string[];
  hardware_allocation_recommendation: HardwareAllocationRecommendationEvidence;
  recommendation_status: HardwareAllocationRecommendationEvidence["recommendation_status"];
  preferred_roles: HardwareAllocationRecommendationEvidence["preferred_roles"];
  eligible_roles: HardwareAllocationRecommendationEvidence["eligible_roles"];
  review_required_roles: HardwareAllocationRecommendationEvidence["review_required_roles"];
  excluded_roles: HardwareAllocationRecommendationEvidence["excluded_roles"];
  reason_codes: string[];
  constraints: ReturnType<typeof constraints>;
  side_effects: [];
};

export type HardwareAllocationRecommendationInspectionGatewayResponse =
  Success | Failure;

const allowedRequestKeys = new Set([
  "request_id",
  "hae_request",
  "hardware_probe_allowed",
  "telemetry_collection_allowed",
  "benchmark_execution_allowed",
  "placement_allowed",
  "drain_allowed",
  "runtime_allowed",
  "database_write_allowed",
  "network_access_allowed",
  "side_effects",
]);
const safeOuterKeyPattern = /^[a-z][a-z0-9_]{0,63}$/;
const secretLikeOuterKeyPattern =
  /(password|secret|token|credential|api_?key|private_?key)/i;

export async function inspectHardwareAllocationRecommendationGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<HardwareAllocationRecommendationInspectionGatewayResponse> {
  const inspectedAt = resolveInspectedAt(options.now);
  if (inspectedAt === null) {
    return failure(null, null, [
      gatewayError(
        "hardware_allocation_gateway.invalid_inspection_time",
        "",
        "Hardware allocation Gateway inspection time is invalid.",
      ),
    ]);
  }

  let snapshot: Record<string, unknown>;
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input))
      throw new TypeError();
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError();
    const keys = Reflect.ownKeys(input);
    if (keys.length > allowedRequestKeys.size) throw new TypeError();
    snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      if (
        typeof key !== "string" ||
        !safeOuterKeyPattern.test(key) ||
        secretLikeOuterKeyPattern.test(key)
      ) {
        throw new TypeError();
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !("value" in descriptor)
      ) {
        throw new TypeError();
      }
      snapshot[key] = descriptor.value;
    }
  } catch {
    return failure(null, inspectedAt, [
      gatewayError(
        "hardware_allocation_gateway.invalid_request",
        "",
        "Hardware allocation Gateway request could not be safely inspected.",
      ),
    ]);
  }

  const errors: HardwareAllocationRecommendationInspectionGatewayError[] = [];
  for (const key of Object.keys(snapshot)) {
    if (!allowedRequestKeys.has(key)) {
      errors.push(
        gatewayError(
          "hardware_allocation_gateway.unexpected_field",
          "/*",
          "Hardware allocation Gateway request contains an unexpected field.",
        ),
      );
    }
  }
  const requestId = parseRequestId(snapshot.request_id, errors);
  if (!Object.hasOwn(snapshot, "hae_request")) {
    errors.push(
      gatewayError(
        "hardware_allocation_gateway.missing_hae_request",
        "/hae_request",
        "Caller-supplied HAE request is required.",
      ),
    );
  }
  rejectFalseOnlyFlag(
    snapshot,
    "hardware_probe_allowed",
    "hardware_allocation_gateway.hardware_probe_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "telemetry_collection_allowed",
    "hardware_allocation_gateway.telemetry_collection_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "benchmark_execution_allowed",
    "hardware_allocation_gateway.benchmark_execution_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "placement_allowed",
    "hardware_allocation_gateway.placement_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "drain_allowed",
    "hardware_allocation_gateway.drain_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "runtime_allowed",
    "hardware_allocation_gateway.runtime_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "database_write_allowed",
    "hardware_allocation_gateway.database_write_forbidden",
    errors,
  );
  rejectFalseOnlyFlag(
    snapshot,
    "network_access_allowed",
    "hardware_allocation_gateway.network_access_forbidden",
    errors,
  );
  if (
    Object.hasOwn(snapshot, "side_effects") &&
    !isStrictEmptyArray(snapshot.side_effects)
  ) {
    errors.push(
      gatewayError(
        "hardware_allocation_gateway.side_effects_forbidden",
        "/side_effects",
        "Hardware allocation Gateway side_effects must remain empty.",
      ),
    );
  }
  if (errors.length > 0 || !Object.hasOwn(snapshot, "hae_request")) {
    return failure(requestId, inspectedAt, errors);
  }

  const delegated = evaluateHardwareAllocationRecommendation(snapshot.hae_request);
  if (!delegated.ok) {
    return failure(
      requestId,
      inspectedAt,
      [],
      delegated.hardware_errors,
      delegated.telemetry_errors,
      delegated.errors,
    );
  }
  const evidence = delegated.hardware_allocation_recommendation;
  return {
    ok: true,
    contract_id: contractId,
    request_id: requestId,
    inspected_at: inspectedAt,
    hae_source: "caller_supplied",
    source_docs: [...contractSourceDocs],
    hardware_allocation_recommendation: evidence,
    recommendation_status: evidence.recommendation_status,
    preferred_roles: evidence.preferred_roles,
    eligible_roles: evidence.eligible_roles,
    review_required_roles: evidence.review_required_roles,
    excluded_roles: evidence.excluded_roles,
    reason_codes: evidence.reason_codes,
    constraints: constraints(),
    side_effects: [],
  };
}

function resolveInspectedAt(now?: Date): string | null {
  try {
    const value = now ?? new Date();
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  } catch {
    return null;
  }
}

function parseRequestId(
  value: unknown,
  errors: HardwareAllocationRecommendationInspectionGatewayError[],
): string | null {
  if (value === undefined) return null;
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9_.:-]{1,95}$/.test(value) ||
    /(password|secret|token|credential|api_?key|private_?key|sk-)/i.test(value)
  ) {
    errors.push(
      gatewayError(
        "hardware_allocation_gateway.invalid_request_id",
        "/request_id",
        "Hardware allocation Gateway request_id is invalid.",
      ),
    );
    return null;
  }
  return value;
}

function rejectFalseOnlyFlag(
  input: Record<string, unknown>,
  key: string,
  code: HardwareAllocationRecommendationInspectionGatewayError["code"],
  errors: HardwareAllocationRecommendationInspectionGatewayError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      gatewayError(
        code,
        `/${key}`,
        "Hardware allocation Gateway authority must remain closed.",
      ),
    );
  }
}

function isStrictEmptyArray(value: unknown): value is [] {
  if (!Array.isArray(value)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    const descriptor = Object.getOwnPropertyDescriptor(value, "length");
    return (
      keys.length === 1 &&
      keys[0] === "length" &&
      descriptor !== undefined &&
      "value" in descriptor &&
      descriptor.value === 0
    );
  } catch {
    return false;
  }
}

function gatewayError(
  code: HardwareAllocationRecommendationInspectionGatewayError["code"],
  path: string,
  message: string,
): HardwareAllocationRecommendationInspectionGatewayError {
  return { code, path, message, severity: "error" };
}

function failure(
  requestId: string | null,
  inspectedAt: string | null,
  requestErrors: HardwareAllocationRecommendationInspectionGatewayError[],
  hardwareErrors: HardwareInventoryThresholdError[] = [],
  telemetryErrors: PerformanceTelemetrySnapshotError[] = [],
  allocationErrors: HardwareAllocationRecommendationError[] = [],
): Failure {
  return {
    ok: false,
    contract_id: contractId,
    request_id: requestId,
    inspected_at: inspectedAt,
    hae_source: "caller_supplied",
    source_docs: [...contractSourceDocs],
    request_errors: requestErrors,
    hardware_errors: hardwareErrors,
    telemetry_errors: telemetryErrors,
    allocation_errors: allocationErrors,
    hardware_allocation_recommendation: null,
    constraints: constraints(),
    raw_input_content: "withheld",
    side_effects: [],
  };
}
