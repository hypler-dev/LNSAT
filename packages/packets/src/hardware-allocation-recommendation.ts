import {
  evaluateHardwareInventoryThreshold,
  hardwareInventoryThresholdContract,
  type HardwareInventoryThresholdError,
  type HardwareInventoryThresholdEvidence,
  type HardwareRoleFamily,
  type HardwareThresholdFinding,
} from "./hardware-inventory-threshold.js";
import {
  evaluatePerformanceTelemetrySnapshot,
  type PerformanceTelemetryDomain,
  type PerformanceTelemetryMetric,
  type PerformanceTelemetrySignalEvidence,
  type PerformanceTelemetrySnapshotError,
  type PerformanceTelemetrySnapshotEvidence,
} from "./performance-telemetry-snapshot.js";

export const HARDWARE_ALLOCATION_RECOMMENDATION_STATUS = "contract_only";

const contractId = "lnsat.hardware.allocation_recommendation.v0_1";
const recommendationVersion = "0.1";
const allRoles = [...hardwareInventoryThresholdContract.role_families];

type RoleProfile = {
  domains: readonly PerformanceTelemetryDomain[];
};

const roleProfiles: Record<HardwareRoleFamily, RoleProfile> = {
  authority_policy: {
    domains: ["policy", "lnsat_gateway", "cpu_numa", "memory_ecc", "network"],
  },
  postgres_database: {
    domains: ["postgresql", "storage", "memory_ecc", "cpu_numa", "network"],
  },
  jetstream_message_bus: {
    domains: ["jetstream", "storage", "network", "memory_ecc", "cpu_numa"],
  },
  cache_retrieval: {
    domains: ["knowledge", "memory_ecc", "network", "workload_service"],
  },
  vector_index: {
    domains: ["knowledge", "storage", "memory_ecc", "cpu_numa"],
  },
  graph_projection: {
    domains: ["knowledge", "storage", "memory_ecc", "cpu_numa"],
  },
  embedding_worker: {
    domains: ["workload_service", "cpu_numa", "memory_ecc", "thermal_power"],
  },
  audit_storage_verification: {
    domains: ["audit", "storage", "memory_ecc", "network"],
  },
  object_cold_storage: {
    domains: ["storage", "network"],
  },
  web_management: {
    domains: ["workload_service", "lnsat_gateway", "cpu_numa", "network"],
  },
  platform_adapter: {
    domains: ["workload_service", "network", "cpu_numa"],
  },
};

export type HardwareAllocationDecision =
  "preferred" | "eligible" | "review_required" | "excluded";
export type HardwareAllocationRisk = "low" | "moderate" | "high" | "critical";
export type HardwareAllocationRecommendationStatus =
  "recommended" | "review_required" | "no_eligible_roles" | "quarantined";

export const hardwareAllocationRecommendationContract = deepFreeze({
  contract_id: contractId,
  recommendation_version: recommendationVersion,
  role_families: [...allRoles],
  decisions: ["preferred", "eligible", "review_required", "excluded"],
  recommendation_statuses: [
    "recommended",
    "review_required",
    "no_eligible_roles",
    "quarantined",
  ],
  score_range: { minimum: 0, maximum: 100 },
  confidence_range: { minimum: 0, maximum: 100 },
  source_contracts: [
    hardwareInventoryThresholdContract.contract_id,
    "lnsat.performance.telemetry_snapshot.v0_1",
  ],
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
  side_effects: [] as string[],
  status: "source_only_pure_contract",
});

export type HardwareAllocationRecommendationRequest = {
  hardware_request: unknown;
  telemetry_request: unknown;
  simulation_ref?: string;
  candidate_roles?: HardwareRoleFamily[];
  hardware_probe_allowed?: false;
  telemetry_collection_allowed?: false;
  benchmark_execution_allowed?: false;
  placement_allowed?: false;
  drain_allowed?: false;
  runtime_allowed?: false;
  database_write_allowed?: false;
  network_access_allowed?: false;
  side_effects?: [];
};

export type HardwareAllocationScoreFactor = {
  factor: string;
  impact: number;
  reason_code: string;
  source: "hardware" | "telemetry" | "evidence";
};

export type HardwareRoleRecommendation = {
  role: HardwareRoleFamily;
  decision: HardwareAllocationDecision;
  score: number;
  confidence: number;
  risk: HardwareAllocationRisk;
  hardware_eligible: boolean;
  score_factors: HardwareAllocationScoreFactor[];
  constraints: string[];
  expected_bottlenecks: PerformanceTelemetryMetric[];
  alternatives: HardwareRoleFamily[];
};

export type HardwareAllocationRecommendationEvidence = {
  contract_id: typeof contractId;
  recommendation_version: typeof recommendationVersion;
  node_id: string;
  simulation_ref: string | null;
  recommendation_status: HardwareAllocationRecommendationStatus;
  overall_confidence: number;
  evidence_skew_ms: number;
  hardware_support_status: HardwareInventoryThresholdEvidence["support_status"];
  telemetry_freshness: PerformanceTelemetrySnapshotEvidence["freshness"];
  telemetry_health_status: PerformanceTelemetrySnapshotEvidence["health_status"];
  telemetry_evidence_status: PerformanceTelemetrySnapshotEvidence["evidence_status"];
  candidate_roles: HardwareRoleFamily[];
  recommendations: HardwareRoleRecommendation[];
  preferred_roles: HardwareRoleFamily[];
  eligible_roles: HardwareRoleFamily[];
  review_required_roles: HardwareRoleFamily[];
  excluded_roles: HardwareRoleFamily[];
  reason_codes: string[];
  simulation: {
    proposed_roles: HardwareRoleFamily[];
    excluded_candidate_roles: HardwareRoleFamily[];
    placement_actions: [];
    drain_actions: [];
  };
  recommendation_only: true;
  simulation_only: true;
  hardware_probe_allowed: false;
  telemetry_collection_allowed: false;
  benchmark_execution_allowed: false;
  placement_allowed: false;
  drain_allowed: false;
  runtime_allowed: false;
  database_write_allowed: false;
  network_access_allowed: false;
  side_effects: [];
};

export type HardwareAllocationRecommendationErrorCode =
  | "hardware_allocation.invalid_request"
  | "hardware_allocation.unexpected_field"
  | "hardware_allocation.missing_hardware_request"
  | "hardware_allocation.missing_telemetry_request"
  | "hardware_allocation.invalid_simulation_ref"
  | "hardware_allocation.invalid_candidate_roles"
  | "hardware_allocation.node_mismatch"
  | "hardware_allocation.hardware_probe_forbidden"
  | "hardware_allocation.telemetry_collection_forbidden"
  | "hardware_allocation.benchmark_execution_forbidden"
  | "hardware_allocation.placement_forbidden"
  | "hardware_allocation.drain_forbidden"
  | "hardware_allocation.runtime_forbidden"
  | "hardware_allocation.database_write_forbidden"
  | "hardware_allocation.network_access_forbidden"
  | "hardware_allocation.side_effects_forbidden";

export type HardwareAllocationRecommendationError = {
  code: HardwareAllocationRecommendationErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type HardwareAllocationRecommendationResult =
  | {
      ok: true;
      hardware_allocation_recommendation: HardwareAllocationRecommendationEvidence;
      hardware_errors: [];
      telemetry_errors: [];
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      hardware_allocation_recommendation: null;
      hardware_errors: HardwareInventoryThresholdError[];
      telemetry_errors: PerformanceTelemetrySnapshotError[];
      errors: HardwareAllocationRecommendationError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const requestKeys = new Set([
  "hardware_request",
  "telemetry_request",
  "simulation_ref",
  "candidate_roles",
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
const safeRefPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:|token:|credential:)/i;

type NormalizedRequest = {
  hardware_request: JsonValue;
  telemetry_request: JsonValue;
  simulation_ref: string | null;
  candidate_roles: HardwareRoleFamily[];
};

export function evaluateHardwareAllocationRecommendation(
  input: unknown,
): HardwareAllocationRecommendationResult {
  let snapshot: JsonValue;
  try {
    snapshot = snapshotJsonValue(input, new WeakSet<object>(), { nodes: 0 }, 0);
    deepFreezeJsonValue(snapshot);
  } catch {
    return failure(
      [],
      [],
      [
        allocationError(
          "hardware_allocation.invalid_request",
          "",
          "Hardware allocation request could not be safely inspected.",
        ),
      ],
    );
  }
  if (!isPlainObject(snapshot)) {
    return failure(
      [],
      [],
      [
        allocationError(
          "hardware_allocation.invalid_request",
          "",
          "Hardware allocation request must be a plain object.",
        ),
      ],
    );
  }

  const normalized = normalizeRequest(snapshot);
  if (!normalized.ok) return failure([], [], normalized.errors);

  const hardwareResult = evaluateHardwareInventoryThreshold(
    normalized.request.hardware_request,
  );
  const telemetryResult = evaluatePerformanceTelemetrySnapshot(
    normalized.request.telemetry_request,
  );
  if (!hardwareResult.ok || !telemetryResult.ok) {
    return failure(
      hardwareResult.ok ? [] : hardwareResult.errors,
      telemetryResult.ok ? [] : telemetryResult.errors,
      [],
    );
  }

  const hardware = hardwareResult.hardware_inventory_threshold;
  const telemetry = telemetryResult.performance_telemetry_snapshot;
  if (hardware.node_id !== telemetry.node_id) {
    return failure(
      [],
      [],
      [
        allocationError(
          "hardware_allocation.node_mismatch",
          "/telemetry_request/snapshot/node_id",
          "Hardware and telemetry evidence must refer to the same node.",
        ),
      ],
    );
  }

  return success(normalized.request, hardware, telemetry);
}

function normalizeRequest(
  input: JsonObject,
):
  | { ok: true; request: NormalizedRequest }
  | { ok: false; errors: HardwareAllocationRecommendationError[] } {
  const errors: HardwareAllocationRecommendationError[] = [];
  rejectUnexpected(input, errors);
  if (!Object.hasOwn(input, "hardware_request")) {
    errors.push(
      allocationError(
        "hardware_allocation.missing_hardware_request",
        "/hardware_request",
        "Hardware evidence request is required.",
      ),
    );
  }
  if (!Object.hasOwn(input, "telemetry_request")) {
    errors.push(
      allocationError(
        "hardware_allocation.missing_telemetry_request",
        "/telemetry_request",
        "Telemetry evidence request is required.",
      ),
    );
  }

  const simulationRef = parseSimulationRef(input.simulation_ref, errors);
  const candidateRoles = parseCandidateRoles(input.candidate_roles, errors);
  rejectClosedFlag(
    input,
    "hardware_probe_allowed",
    "hardware_allocation.hardware_probe_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "telemetry_collection_allowed",
    "hardware_allocation.telemetry_collection_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "benchmark_execution_allowed",
    "hardware_allocation.benchmark_execution_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "placement_allowed",
    "hardware_allocation.placement_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "drain_allowed",
    "hardware_allocation.drain_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "runtime_allowed",
    "hardware_allocation.runtime_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "database_write_allowed",
    "hardware_allocation.database_write_forbidden",
    errors,
  );
  rejectClosedFlag(
    input,
    "network_access_allowed",
    "hardware_allocation.network_access_forbidden",
    errors,
  );
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      allocationError(
        "hardware_allocation.side_effects_forbidden",
        "/side_effects",
        "Hardware allocation side_effects must remain empty.",
      ),
    );
  }

  if (
    errors.length > 0 ||
    !Object.hasOwn(input, "hardware_request") ||
    !Object.hasOwn(input, "telemetry_request") ||
    simulationRef === undefined ||
    candidateRoles === null
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    request: {
      hardware_request: input.hardware_request!,
      telemetry_request: input.telemetry_request!,
      simulation_ref: simulationRef,
      candidate_roles: candidateRoles,
    },
  };
}

function success(
  request: NormalizedRequest,
  hardware: HardwareInventoryThresholdEvidence,
  telemetry: PerformanceTelemetrySnapshotEvidence,
): HardwareAllocationRecommendationResult {
  const overallConfidence = deriveOverallConfidence(hardware, telemetry);
  const recommendations = request.candidate_roles.map((role) =>
    scoreRole(role, hardware, telemetry, overallConfidence),
  );
  const rankedAlternatives = recommendations
    .filter((item) => item.decision === "preferred" || item.decision === "eligible")
    .sort(
      (left, right) => right.score - left.score || left.role.localeCompare(right.role),
    );
  recommendations.forEach((recommendation) => {
    if (
      recommendation.decision === "excluded" ||
      recommendation.decision === "review_required"
    ) {
      recommendation.alternatives = rankedAlternatives
        .filter((candidate) => candidate.role !== recommendation.role)
        .slice(0, 3)
        .map((candidate) => candidate.role);
    }
  });

  const preferredRoles = rolesByDecision(recommendations, "preferred");
  const eligibleRoles = rolesByDecision(recommendations, "eligible");
  const reviewRequiredRoles = rolesByDecision(recommendations, "review_required");
  const excludedRoles = rolesByDecision(recommendations, "excluded");
  const recommendationStatus: HardwareAllocationRecommendationStatus =
    hardware.support_status === "quarantined"
      ? "quarantined"
      : preferredRoles.length + eligibleRoles.length > 0
        ? reviewRequiredRoles.length > 0
          ? "review_required"
          : "recommended"
        : reviewRequiredRoles.length > 0
          ? "review_required"
          : "no_eligible_roles";
  const reasonCodes = uniqueStrings([
    ...hardware.reason_codes,
    ...telemetry.reason_codes,
    ...recommendations.flatMap((item) => item.constraints),
  ]);
  const proposedRoles = [...preferredRoles, ...eligibleRoles];

  return {
    ok: true,
    hardware_allocation_recommendation: {
      contract_id: contractId,
      recommendation_version: recommendationVersion,
      node_id: hardware.node_id,
      simulation_ref: request.simulation_ref,
      recommendation_status: recommendationStatus,
      overall_confidence: overallConfidence,
      evidence_skew_ms: Math.abs(
        Date.parse(telemetry.window_ended_at) - Date.parse(hardware.observed_at),
      ),
      hardware_support_status: hardware.support_status,
      telemetry_freshness: telemetry.freshness,
      telemetry_health_status: telemetry.health_status,
      telemetry_evidence_status: telemetry.evidence_status,
      candidate_roles: [...request.candidate_roles],
      recommendations,
      preferred_roles: preferredRoles,
      eligible_roles: eligibleRoles,
      review_required_roles: reviewRequiredRoles,
      excluded_roles: excludedRoles,
      reason_codes: reasonCodes,
      simulation: {
        proposed_roles: proposedRoles,
        excluded_candidate_roles: excludedRoles,
        placement_actions: [],
        drain_actions: [],
      },
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
    },
    hardware_errors: [],
    telemetry_errors: [],
    errors: [],
    side_effects: [],
  };
}

function scoreRole(
  role: HardwareRoleFamily,
  hardware: HardwareInventoryThresholdEvidence,
  telemetry: PerformanceTelemetrySnapshotEvidence,
  confidence: number,
): HardwareRoleRecommendation {
  const profile = roleProfiles[role];
  const hardwareEligible = hardware.eligible_roles.includes(role);
  const factors: HardwareAllocationScoreFactor[] = [];
  const constraints: string[] = [];
  let score = 100;

  if (!hardwareEligible) {
    score = 0;
    factors.push({
      factor: "hardware_role_exclusion",
      impact: -100,
      reason_code: "hae.hardware_role_excluded",
      source: "hardware",
    });
    constraints.push(
      ...hardware.threshold_findings
        .filter((finding) => finding.affected_roles.includes(role))
        .map((finding) => finding.code),
    );
  } else {
    applyHardwareWarnings(role, hardware.threshold_findings, factors, constraints);
    score += factors.reduce((total, factor) => total + factor.impact, 0);
    for (const signal of telemetry.signals) {
      if (!profile.domains.includes(signal.domain)) continue;
      const factor = telemetryFactor(signal);
      if (factor !== null) {
        factors.push(factor);
        score += factor.impact;
        if (signal.status !== "healthy" && signal.status !== "informational") {
          constraints.push(factor.reason_code);
        }
      }
    }
    if (telemetry.freshness === "stale") {
      factors.push({
        factor: "stale_telemetry",
        impact: -15,
        reason_code: "hae.telemetry_stale",
        source: "evidence",
      });
      constraints.push("hae.telemetry_stale");
      score -= 15;
    }
    if (telemetry.evidence_status === "insufficient") {
      factors.push({
        factor: "insufficient_telemetry",
        impact: -10,
        reason_code: "hae.telemetry_insufficient",
        source: "evidence",
      });
      constraints.push("hae.telemetry_insufficient");
      score -= 10;
    }
    if (telemetry.health_status === "critical") {
      factors.push({
        factor: "global_critical_telemetry",
        impact: 0,
        reason_code: "hae.telemetry_critical_global",
        source: "evidence",
      });
      constraints.push("hae.telemetry_critical_global");
    }
  }

  score = clampScore(score);
  const hasCriticalSignal = telemetry.signals.some(
    (signal) => profile.domains.includes(signal.domain) && signal.status === "critical",
  );
  const hasWarningSignal = telemetry.signals.some(
    (signal) => profile.domains.includes(signal.domain) && signal.status === "warning",
  );
  const decision: HardwareAllocationDecision = !hardwareEligible
    ? "excluded"
    : hasCriticalSignal ||
        telemetry.health_status === "critical" ||
        score < 60 ||
        telemetry.freshness === "stale" ||
        telemetry.evidence_status === "insufficient"
      ? "review_required"
      : score >= 80
        ? "preferred"
        : "eligible";
  const risk: HardwareAllocationRisk =
    !hardwareEligible && hardware.support_status === "quarantined"
      ? "critical"
      : hasCriticalSignal || decision === "excluded"
        ? "high"
        : hasWarningSignal || decision === "review_required"
          ? "moderate"
          : "low";
  const expectedBottlenecks = uniqueMetrics(
    telemetry.signals
      .filter(
        (signal) =>
          profile.domains.includes(signal.domain) &&
          (signal.status === "warning" || signal.status === "critical"),
      )
      .map((signal) => signal.metric),
  );

  return {
    role,
    decision,
    score,
    confidence,
    risk,
    hardware_eligible: hardwareEligible,
    score_factors: factors,
    constraints: uniqueStrings(constraints),
    expected_bottlenecks: expectedBottlenecks,
    alternatives: [],
  };
}

function applyHardwareWarnings(
  role: HardwareRoleFamily,
  findings: HardwareThresholdFinding[],
  factors: HardwareAllocationScoreFactor[],
  constraints: string[],
): void {
  for (const finding of findings) {
    if (!finding.affected_roles.includes(role)) continue;
    const impact =
      finding.severity === "critical" ? -40 : finding.severity === "error" ? -30 : -15;
    factors.push({
      factor: "hardware_threshold",
      impact,
      reason_code: finding.code,
      source: "hardware",
    });
    constraints.push(finding.code);
  }
}

function telemetryFactor(
  signal: PerformanceTelemetrySignalEvidence,
): HardwareAllocationScoreFactor | null {
  if (signal.status === "informational" || signal.status === "healthy") return null;
  const impact =
    signal.status === "critical" ? -30 : signal.status === "warning" ? -10 : -5;
  return {
    factor: "performance_signal",
    impact,
    reason_code: `hae.performance.${signal.metric}.${signal.status}`,
    source: "telemetry",
  };
}

function deriveOverallConfidence(
  hardware: HardwareInventoryThresholdEvidence,
  telemetry: PerformanceTelemetrySnapshotEvidence,
): number {
  let confidence = 100;
  confidence -=
    hardware.threshold_findings.filter((finding) => finding.affected_roles.length === 0)
      .length * 5;
  confidence -= telemetry.summary.unknown * 5;
  confidence -= telemetry.coverage.missing_domains.length * 10;
  confidence -=
    telemetry.signals.filter((signal) => signal.quality === "derived").length * 2;
  if (telemetry.freshness === "stale") confidence -= 20;
  return clampScore(confidence);
}

function rolesByDecision(
  recommendations: HardwareRoleRecommendation[],
  decision: HardwareAllocationDecision,
): HardwareRoleFamily[] {
  return recommendations
    .filter((item) => item.decision === decision)
    .sort(
      (left, right) => right.score - left.score || left.role.localeCompare(right.role),
    )
    .map((item) => item.role);
}

function parseSimulationRef(
  value: JsonValue | undefined,
  errors: HardwareAllocationRecommendationError[],
): string | null | undefined {
  if (value === undefined) return null;
  if (typeof value !== "string" || !safeRefPattern.test(value)) {
    errors.push(
      allocationError(
        "hardware_allocation.invalid_simulation_ref",
        "/simulation_ref",
        "Simulation ref must be a safe stable ref.",
      ),
    );
    return undefined;
  }
  return value;
}

function parseCandidateRoles(
  value: JsonValue | undefined,
  errors: HardwareAllocationRecommendationError[],
): HardwareRoleFamily[] | null {
  if (value === undefined) return [...allRoles];
  if (!Array.isArray(value) || value.length < 1 || value.length > allRoles.length) {
    errors.push(
      allocationError(
        "hardware_allocation.invalid_candidate_roles",
        "/candidate_roles",
        "Candidate roles must be a non-empty bounded role array.",
      ),
    );
    return null;
  }
  const roles: HardwareRoleFamily[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "string" ||
      !(allRoles as readonly string[]).includes(candidate) ||
      roles.includes(candidate as HardwareRoleFamily)
    ) {
      errors.push(
        allocationError(
          "hardware_allocation.invalid_candidate_roles",
          "/candidate_roles",
          "Candidate roles must be unique known role families.",
        ),
      );
      return null;
    }
    roles.push(candidate as HardwareRoleFamily);
  }
  return roles;
}

function rejectUnexpected(
  input: JsonObject,
  errors: HardwareAllocationRecommendationError[],
): void {
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        allocationError(
          "hardware_allocation.unexpected_field",
          "/*",
          "Unexpected hardware allocation request field.",
        ),
      );
    }
  }
}

function rejectClosedFlag(
  input: JsonObject,
  key: string,
  code: HardwareAllocationRecommendationErrorCode,
  errors: HardwareAllocationRecommendationError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      allocationError(
        code,
        `/${key}`,
        "Hardware allocation authority must remain closed.",
      ),
    );
  }
}

function failure(
  hardwareErrors: HardwareInventoryThresholdError[],
  telemetryErrors: PerformanceTelemetrySnapshotError[],
  errors: HardwareAllocationRecommendationError[],
): HardwareAllocationRecommendationResult {
  return {
    ok: false,
    hardware_allocation_recommendation: null,
    hardware_errors: hardwareErrors,
    telemetry_errors: telemetryErrors,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function allocationError(
  code: HardwareAllocationRecommendationErrorCode,
  path: string,
  message: string,
): HardwareAllocationRecommendationError {
  return { code, path, message, severity: "error" };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueMetrics(
  values: PerformanceTelemetryMetric[],
): PerformanceTelemetryMetric[] {
  return [...new Set(values)];
}

function snapshotJsonValue(
  value: unknown,
  stack: WeakSet<object>,
  budget: { nodes: number },
  depth: number,
): JsonValue {
  budget.nodes += 1;
  if (budget.nodes > 10_000 || depth > 20) {
    throw new TypeError("JSON value exceeds inspection limits.");
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > 512 || secretLikePattern.test(value)) {
      throw new TypeError("String is unsafe or oversized.");
    }
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
        lengthDescriptor.value > 512
      ) {
        throw new TypeError("Array length descriptor is invalid.");
      }
      const length = lengthDescriptor.value;
      const keys = Reflect.ownKeys(value);
      if (
        keys.some(
          (key) =>
            typeof key !== "string" ||
            (key !== "length" &&
              (!/^\d+$/.test(key) ||
                key !== String(Number(key)) ||
                Number(key) >= length)),
        )
      ) {
        throw new TypeError("Array has unsupported properties.");
      }
      return Array.from({ length }, (_, index) => {
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
    if (keys.length > 64) throw new TypeError("Object exceeds field limit.");
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

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreezeJsonValue(value: JsonValue): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) value.forEach(deepFreezeJsonValue);
  else Object.values(value).forEach(deepFreezeJsonValue);
  Object.freeze(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}
