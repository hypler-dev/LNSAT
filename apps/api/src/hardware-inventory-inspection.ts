import {
  evaluateHardwareInventoryThreshold,
  type HardwareInventoryThresholdError,
  type HardwareInventoryThresholdEvidence,
  type HardwareRoleFamily,
  type HardwareSupportStatus,
  type HardwareThresholdFinding,
} from "@lnsat/packets";

export const HARDWARE_INVENTORY_INSPECTION_GATEWAY_STATUS = "read_only";

const contractId = "lnsat.gateway.hardware_inventory.inspect.v0_1" as const;
const contractMethod = "POST" as const;
const contractPath = "/v1/hardware/inventory/inspect" as const;
const contractSourceDocs = Object.freeze([
  "docs/architecture/DISTRIBUTED_KNOWLEDGE_HARDWARE_AND_OBSERVABILITY.md",
  "docs/reference/CONTRACT_PROVENANCE.md",
  "docs/reference/CONTRACT_PROVENANCE.md",
  "packages/packets/src/hardware-inventory-threshold.ts",
  "apps/api/src/hardware-inventory-inspection.ts",
] as const);

export const hardwareInventoryInspectionGatewayContract = Object.freeze({
  contract_id: contractId,
  method: contractMethod,
  path: contractPath,
  authority: Object.freeze([
    "@lnsat/packets",
    "caller-supplied-hardware-inventory",
    "LNSAT Gateway",
  ] as const),
  source_docs: contractSourceDocs,
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
  side_effects: Object.freeze([] as const),
  status: "read_only_gateway_inspection",
} as const);

export type HardwareInventoryInspectionGatewayRequest = {
  request_id?: string;
  inventory_request: unknown;
  live_collection_allowed?: false;
  hardware_probe_allowed?: false;
  node_agent_allowed?: false;
  benchmark_allowed?: false;
  placement_allowed?: false;
  telemetry_collection_allowed?: false;
  runtime_allowed?: false;
  side_effects?: [];
};

export type HardwareInventoryInspectionGatewayErrorCode =
  | "hardware_inventory_gateway.invalid_request"
  | "hardware_inventory_gateway.unexpected_field"
  | "hardware_inventory_gateway.invalid_request_id"
  | "hardware_inventory_gateway.invalid_inspection_time"
  | "hardware_inventory_gateway.missing_inventory_request"
  | "hardware_inventory_gateway.live_collection_forbidden"
  | "hardware_inventory_gateway.hardware_probe_forbidden"
  | "hardware_inventory_gateway.node_agent_forbidden"
  | "hardware_inventory_gateway.benchmark_forbidden"
  | "hardware_inventory_gateway.placement_forbidden"
  | "hardware_inventory_gateway.telemetry_collection_forbidden"
  | "hardware_inventory_gateway.runtime_forbidden"
  | "hardware_inventory_gateway.side_effects_forbidden";

export type HardwareInventoryInspectionGatewayError = {
  code: HardwareInventoryInspectionGatewayErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type HardwareInventoryInspectionConstraints = {
  supplied_inventory_only: true;
  read_only: true;
  recommendation_only: true;
  live_collection_allowed: false;
  hardware_probe_allowed: false;
  node_agent_allowed: false;
  benchmark_allowed: false;
  placement_allowed: false;
  telemetry_collection_allowed: false;
  runtime_allowed: false;
  database_write_allowed: false;
  network_access_allowed: false;
};

type HardwareInventoryInspectionSuccess = {
  ok: true;
  contract_id: typeof contractId;
  request_id: string | null;
  inspected_at: string;
  inventory_source: "caller_supplied";
  source_docs: string[];
  hardware_inventory_threshold: HardwareInventoryThresholdEvidence;
  support_status: HardwareSupportStatus;
  threshold_findings: HardwareThresholdFinding[];
  reason_codes: string[];
  eligible_roles: HardwareRoleFamily[];
  excluded_roles: HardwareRoleFamily[];
  minimums: HardwareInventoryThresholdEvidence["minimums"];
  constraints: HardwareInventoryInspectionConstraints;
  side_effects: [];
};

type HardwareInventoryInspectionFailure = {
  ok: false;
  contract_id: typeof contractId;
  request_id: string | null;
  inspected_at: string | null;
  inventory_source: "caller_supplied";
  source_docs: string[];
  request_errors: HardwareInventoryInspectionGatewayError[];
  inventory_errors: HardwareInventoryThresholdError[];
  hardware_inventory_threshold: null;
  support_status: null;
  threshold_findings: [];
  reason_codes: [];
  eligible_roles: [];
  excluded_roles: [];
  minimums: null;
  constraints: HardwareInventoryInspectionConstraints;
  raw_input_content: "withheld";
  side_effects: [];
};

export type HardwareInventoryInspectionGatewayResponse =
  HardwareInventoryInspectionSuccess | HardwareInventoryInspectionFailure;

type SnapshotRequest = Record<string, unknown>;

type NormalizedRequest =
  | { ok: true; request_id: string | null; inventory_request: unknown }
  | {
      ok: false;
      request_id: string | null;
      errors: HardwareInventoryInspectionGatewayError[];
    };

const allowedRequestKeys = new Set([
  "request_id",
  "inventory_request",
  "live_collection_allowed",
  "hardware_probe_allowed",
  "node_agent_allowed",
  "benchmark_allowed",
  "placement_allowed",
  "telemetry_collection_allowed",
  "runtime_allowed",
  "side_effects",
]);
const safeOuterKeyPattern = /^[a-z][a-z0-9_]{0,63}$/;
const safeRequestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const secretLikeOuterKeyPattern =
  /(password|secret|token|credential|api_?key|private_?key)/i;

const constraints = (): HardwareInventoryInspectionConstraints => ({
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
});

export async function inspectHardwareInventoryGatewayRequest(
  input: unknown,
  options: { now?: Date } = {},
): Promise<HardwareInventoryInspectionGatewayResponse> {
  const inspectedAt = resolveInspectedAt(options);
  if (inspectedAt === null) {
    return failure(null, null, [
      gatewayError(
        "hardware_inventory_gateway.invalid_inspection_time",
        "",
        "Hardware inventory Gateway inspection time is invalid.",
      ),
    ]);
  }
  let snapshot: SnapshotRequest;
  try {
    snapshot = snapshotOuterRequest(input);
  } catch {
    return failure(null, inspectedAt, [
      gatewayError(
        "hardware_inventory_gateway.invalid_request",
        "",
        "Hardware inventory Gateway request could not be safely inspected.",
      ),
    ]);
  }

  let normalized: NormalizedRequest;
  try {
    normalized = normalizeRequest(snapshot);
  } catch {
    return failure(null, inspectedAt, [
      gatewayError(
        "hardware_inventory_gateway.invalid_request",
        "",
        "Hardware inventory Gateway request could not be safely inspected.",
      ),
    ]);
  }
  if (!normalized.ok) {
    return failure(normalized.request_id, inspectedAt, normalized.errors);
  }

  const inventoryResult = evaluateHardwareInventoryThreshold(
    normalized.inventory_request,
  );
  if (!inventoryResult.ok) {
    return failure(normalized.request_id, inspectedAt, [], inventoryResult.errors);
  }

  const evidence = inventoryResult.hardware_inventory_threshold;
  return {
    ok: true,
    contract_id: contractId,
    request_id: normalized.request_id,
    inspected_at: inspectedAt,
    inventory_source: "caller_supplied",
    source_docs: [...contractSourceDocs],
    hardware_inventory_threshold: evidence,
    support_status: evidence.support_status,
    threshold_findings: evidence.threshold_findings,
    reason_codes: evidence.reason_codes,
    eligible_roles: evidence.eligible_roles,
    excluded_roles: evidence.excluded_roles,
    minimums: evidence.minimums,
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
    snapshot[key] = Reflect.get(input, key);
  }
  return snapshot;
}

function normalizeRequest(input: SnapshotRequest): NormalizedRequest {
  const errors: HardwareInventoryInspectionGatewayError[] = [];
  const keys = Object.keys(input);
  for (const key of keys) {
    if (!allowedRequestKeys.has(key)) {
      errors.push(
        gatewayError(
          "hardware_inventory_gateway.unexpected_field",
          jsonPointer(key),
          "Unexpected hardware inventory Gateway request field.",
        ),
      );
    }
  }

  const requestIdValue = input.request_id;
  const requestId =
    typeof requestIdValue === "string" && safeRequestIdPattern.test(requestIdValue)
      ? requestIdValue
      : null;
  if (
    keys.includes("request_id") &&
    (typeof requestIdValue !== "string" || !safeRequestIdPattern.test(requestIdValue))
  ) {
    errors.push(
      gatewayError(
        "hardware_inventory_gateway.invalid_request_id",
        "/request_id",
        "Hardware inventory Gateway request_id must be a safe stable id.",
      ),
    );
  }

  if (!keys.includes("inventory_request")) {
    errors.push(
      gatewayError(
        "hardware_inventory_gateway.missing_inventory_request",
        "/inventory_request",
        "Hardware inventory Gateway request must include inventory_request.",
      ),
    );
  }

  rejectFalseOnlyFlag(
    input,
    keys,
    "live_collection_allowed",
    "hardware_inventory_gateway.live_collection_forbidden",
    "Live hardware collection is not allowed by this read-only Gateway contract.",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "hardware_probe_allowed",
    "hardware_inventory_gateway.hardware_probe_forbidden",
    "Hardware probing is not allowed by this read-only Gateway contract.",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "node_agent_allowed",
    "hardware_inventory_gateway.node_agent_forbidden",
    "Node-agent access is not allowed by this read-only Gateway contract.",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "benchmark_allowed",
    "hardware_inventory_gateway.benchmark_forbidden",
    "Hardware benchmarking is not allowed by this read-only Gateway contract.",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "placement_allowed",
    "hardware_inventory_gateway.placement_forbidden",
    "Hardware placement is not allowed by this read-only Gateway contract.",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "telemetry_collection_allowed",
    "hardware_inventory_gateway.telemetry_collection_forbidden",
    "Telemetry collection is not allowed by this read-only Gateway contract.",
    errors,
  );
  rejectFalseOnlyFlag(
    input,
    keys,
    "runtime_allowed",
    "hardware_inventory_gateway.runtime_forbidden",
    "Runtime behavior is not allowed by this read-only Gateway contract.",
    errors,
  );

  if (
    keys.includes("side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      gatewayError(
        "hardware_inventory_gateway.side_effects_forbidden",
        "/side_effects",
        "Hardware inventory Gateway side_effects must remain empty.",
      ),
    );
  }

  if (errors.length > 0) return { ok: false, request_id: requestId, errors };
  return {
    ok: true,
    request_id: requestId,
    inventory_request: input.inventory_request,
  };
}

function rejectFalseOnlyFlag(
  input: SnapshotRequest,
  keys: string[],
  key: string,
  code: HardwareInventoryInspectionGatewayErrorCode,
  message: string,
  errors: HardwareInventoryInspectionGatewayError[],
): void {
  if (keys.includes(key) && input[key] !== false) {
    errors.push(gatewayError(code, `/${key}`, message));
  }
}

function failure(
  requestId: string | null,
  inspectedAt: string | null,
  requestErrors: HardwareInventoryInspectionGatewayError[],
  inventoryErrors: HardwareInventoryThresholdError[] = [],
): HardwareInventoryInspectionFailure {
  return {
    ok: false,
    contract_id: contractId,
    request_id: requestId,
    inspected_at: inspectedAt,
    inventory_source: "caller_supplied",
    source_docs: [...contractSourceDocs],
    request_errors: requestErrors,
    inventory_errors: inventoryErrors,
    hardware_inventory_threshold: null,
    support_status: null,
    threshold_findings: [],
    reason_codes: [],
    eligible_roles: [],
    excluded_roles: [],
    minimums: null,
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
  code: HardwareInventoryInspectionGatewayErrorCode,
  path: string,
  message: string,
): HardwareInventoryInspectionGatewayError {
  return { code, path, message, severity: "error" };
}

function jsonPointer(segment: string): string {
  return `/${segment.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
