export const MOBILE_EDGE_CONTRACT_STATUS = "source_only";

export const mobileEdgeContract = {
  contract_id: "lnsat.mobile_edge.contract_bundle.v0_1",
  version: "0.1",
  authority: "source_contract_only_no_runtime_dispatch",
  signature_algorithm: "Ed25519",
  digest_algorithm: "SHA-256",
  source_docs: [
    "docs/architecture/MOBILE_EDGE_AI_POLICY_AND_WORKER_ARCHITECTURE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  native_app_allowed: false,
  enrollment_allowed: false,
  network_allowed: false,
  model_transfer_allowed: false,
  inference_allowed: false,
  runtime_dispatch_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type MobileEdgeDigest = `sha256:${string}`;
export type MobilePlatform = "ios" | "ipados" | "android";
export type MobileArchitecture = "arm64" | "x86_64" | "other";
export type MobileManagementMode =
  "personal_opt_in" | "work_profile" | "company_owned" | "dedicated" | "lab";
export type MobileThermalState = "nominal" | "fair" | "serious" | "critical";
export type MobileBackgroundPosture = "foreground_only" | "os_scheduled";
export type MobileNetworkRequirement =
  "offline_only" | "wifi_only" | "unmetered" | "any";
export type MobileWorkloadClass =
  | "embedding"
  | "reranking"
  | "ocr"
  | "transcription"
  | "classification"
  | "redaction"
  | "sensor_preprocessing"
  | "evaluation_shard";
export type MobileDataClass =
  "public" | "internal" | "personal" | "sensitive" | "regulated";
export type MobileSensor = "camera" | "microphone" | "location" | "motion";

export type MobileCapabilityManifest = {
  contract_id: "lnsat.mobile_edge.capability_manifest.v0_1";
  manifest_version: "0.1";
  manifest_ref: string;
  manifest_digest: MobileEdgeDigest;
  device_ref: string;
  owner_ref: string;
  tenant_ref: string;
  substrate_kind: "mobile_edge";
  management_mode: MobileManagementMode;
  platform: MobilePlatform;
  os_version: string;
  patch_level: string;
  app_version: string;
  architecture: MobileArchitecture;
  soc_family: string;
  result_signing_key: {
    key_ref: string;
    key_version: string;
    attestation_evidence_ref: string;
  };
  compute: {
    accelerator: "cpu_only" | "gpu" | "npu" | "gpu_npu";
    supported_precisions: Array<"fp32" | "fp16" | "bf16" | "int8" | "int4">;
    runtimes: Array<{
      runtime_ref: string;
      runtime_digest: MobileEdgeDigest;
      model_formats: string[];
    }>;
    ram_budget_mb: number;
    storage_budget_mb: number;
  };
  power: {
    battery_percent: number;
    charging: boolean;
    thermal_state: MobileThermalState;
    low_power_mode: boolean;
    background_posture: MobileBackgroundPosture;
  };
  network: {
    transport: "offline" | "wifi" | "cellular";
    metered: boolean;
    roaming: boolean;
    outbound_only: true;
    inbound_listener_allowed: false;
    peer_mesh_allowed: false;
  };
  sensors: Array<{
    sensor: MobileSensor;
    os_permission: "granted" | "denied" | "prompt_required";
    policy_allowed: boolean;
  }>;
  supported_workload_classes: MobileWorkloadClass[];
  forbidden_capabilities: string[];
  model_cache: Array<{
    model_digest: MobileEdgeDigest;
    runtime_digest: MobileEdgeDigest;
  }>;
  policy_version: string;
  revoked: boolean;
  quarantined: boolean;
  observed_at: string;
  expires_at: string;
  evidence_refs: string[];
  side_effects: [];
};

export type MobileWorkloadConstraints = {
  resource_limits: {
    max_duration_ms: number;
    max_ram_mb: number;
    max_storage_mb: number;
    battery_floor_percent: number;
    charging_required: boolean;
    max_thermal_state: Exclude<MobileThermalState, "critical">;
    network: MobileNetworkRequirement;
    background: MobileBackgroundPosture;
    retry_limit: number;
  };
  data_policy: {
    allowed_data_classes: MobileDataClass[];
    allowed_sensors: MobileSensor[];
    egress: "local_only" | "approved_relay";
    result_destination_ref: string;
    input_retention_seconds: number;
    output_retention_seconds: number;
  };
};

export type MobilePolicyDecision = {
  contract_id: "lnsat.mobile_edge.policy_decision.v0_1";
  decision_version: "0.1";
  decision_ref: string;
  decision_digest: MobileEdgeDigest;
  packet_ref: string;
  device_ref: string;
  owner_ref: string;
  tenant_ref: string;
  operator_ref: string;
  session_ref: string;
  manifest_ref: string;
  manifest_digest: MobileEdgeDigest;
  policy_ref: string;
  policy_digest: MobileEdgeDigest;
  decision: "allow" | "deny" | "approval_required";
  lease_issuance: "eligible" | "blocked" | "pending_approval";
  required_approval_ref: string | null;
  approval_evidence_ref: string | null;
  approved_model_digests: MobileEdgeDigest[];
  approved_runtime_digests: MobileEdgeDigest[];
  allowed_workload_classes: MobileWorkloadClass[];
  constraints: MobileWorkloadConstraints;
  reasons: string[];
  evaluated_at: string;
  expires_at: string;
  evidence_refs: string[];
  side_effects: [];
};

export type MobileEdgeSignature = {
  algorithm: "Ed25519";
  key_ref: string;
  key_version: string;
  signed_payload_digest: MobileEdgeDigest;
  signature_base64url: string;
};

export type MobileLeaseSignature = MobileEdgeSignature;

export type MobileSignedWorkloadLease = {
  contract_id: "lnsat.mobile_edge.signed_workload_lease.v0_1";
  lease_version: "0.1";
  lease_ref: string;
  packet_ref: string;
  device_ref: string;
  owner_ref: string;
  tenant_ref: string;
  operator_ref: string;
  session_ref: string;
  manifest_ref: string;
  manifest_digest: MobileEdgeDigest;
  policy_decision_ref: string;
  policy_decision_digest: MobileEdgeDigest;
  approval_evidence_ref: string | null;
  model_digest: MobileEdgeDigest;
  runtime_digest: MobileEdgeDigest;
  workload_class: MobileWorkloadClass;
  input_refs: string[];
  constraints: MobileWorkloadConstraints;
  issued_at: string;
  not_before: string;
  expires_at: string;
  cancellation_ref: string;
  nonce: string;
  idempotency_key: string;
  checkpoint_required: boolean;
  evidence_obligations: string[];
  signature: MobileEdgeSignature;
  side_effects: [];
};

export type MobileLeaseStatusEvidence = {
  contract_id: "lnsat.mobile_edge.lease_status_evidence.v0_1";
  status_version: "0.1";
  status_ref: string;
  lease_ref: string;
  cancellation_ref: string;
  sequence: number;
  status: "active" | "cancelled" | "revoked";
  observed_at: string;
  expires_at: string;
  evidence_refs: string[];
  signature: MobileEdgeSignature;
  side_effects: [];
};

export type MobileResultEvidence = {
  contract_id: "lnsat.mobile_edge.result_evidence.v0_1";
  result_version: "0.1";
  result_ref: string;
  lease_ref: string;
  packet_ref: string;
  device_ref: string;
  owner_ref: string;
  tenant_ref: string;
  operator_ref: string;
  session_ref: string;
  manifest_digest: MobileEdgeDigest;
  policy_decision_digest: MobileEdgeDigest;
  model_digest: MobileEdgeDigest;
  runtime_digest: MobileEdgeDigest;
  input_refs: string[];
  result_destination_ref: string;
  egress: "local_only" | "approved_relay";
  status: "completed" | "failed" | "denied" | "cancelled" | "expired";
  started_at: string;
  finished_at: string;
  output_refs: string[];
  error_codes: string[];
  resource_usage: {
    duration_ms: number;
    peak_ram_mb: number;
    storage_written_mb: number;
    retry_count: number;
  };
  verification: {
    lease_signature_verified: true;
    device_binding_verified: true;
    policy_valid_at_start: true;
    model_digest_verified: true;
    runtime_digest_verified: true;
    output_filter_passed: boolean;
  };
  evidence_refs: string[];
  signature: MobileEdgeSignature;
  publication_performed: false;
  side_effects: [];
};

export type MobileEdgeContractChain = {
  manifest: MobileCapabilityManifest;
  policy_decision: MobilePolicyDecision;
  workload_lease: MobileSignedWorkloadLease;
  lease_status: MobileLeaseStatusEvidence;
  result_evidence: MobileResultEvidence;
};

export type MobileLeaseTrustKey = {
  key_ref: string;
  key_version: string;
  public_key_spki_base64url: string;
  valid_from: string;
  valid_until: string;
  revoked: boolean;
};

export type MobileEdgeTrustBundle = {
  lease_issuer: MobileLeaseTrustKey;
  device_result: MobileLeaseTrustKey;
  lease_status_head: {
    lease_ref: string;
    status_ref: string;
    sequence: number;
    status: "active" | "cancelled" | "revoked";
    observed_at: string;
    evidence_ref: string;
  };
};

export type MobileEdgeValidationError = {
  code: string;
  path: string;
  message: string;
  severity: "error";
};

export type MobileEdgeValidationResult<T> =
  | { ok: true; value: T; errors: []; side_effects: [] }
  | {
      ok: false;
      value: null;
      errors: MobileEdgeValidationError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type JsonValue = string | number | boolean | null | JsonValue[] | JsonRecord;
type JsonRecord = { [key: string]: JsonValue };

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const refPattern = /^[a-z][a-z0-9_.-]*:[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const safeTextPattern = /^[A-Za-z0-9][A-Za-z0-9 ._+:/()-]{0,255}$/;
const base64UrlPattern = /^[A-Za-z0-9_-]{40,4096}$/;
const forbiddenKeyPattern =
  /(?:^|_)(?:api_?key|password|private_?key|secret|token)(?:$|_)/i;
const forbiddenValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
];
const poisonKeys = new Set(["__proto__", "constructor", "prototype"]);
const workloadClasses = new Set<MobileWorkloadClass>([
  "embedding",
  "reranking",
  "ocr",
  "transcription",
  "classification",
  "redaction",
  "sensor_preprocessing",
  "evaluation_shard",
]);
const dataClasses = new Set<MobileDataClass>([
  "public",
  "internal",
  "personal",
  "sensitive",
  "regulated",
]);
const sensors = new Set<MobileSensor>(["camera", "microphone", "location", "motion"]);
const thermalRanks: Record<MobileThermalState, number> = {
  nominal: 0,
  fair: 1,
  serious: 2,
  critical: 3,
};

function error(code: string, path: string, message: string): MobileEdgeValidationError {
  return { code, path, message, severity: "error" };
}

function failure<T>(
  errors: MobileEdgeValidationError[],
): MobileEdgeValidationResult<T> {
  return {
    ok: false,
    value: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function success<T>(value: T): MobileEdgeValidationResult<T> {
  return { ok: true, value: deepFreeze(value), errors: [], side_effects: [] };
}

function snapshotInput(
  input: unknown,
): { ok: true; value: JsonValue } | { ok: false; errors: MobileEdgeValidationError[] } {
  const seen = new WeakSet<object>();
  let entries = 0;

  function visit(value: unknown, path: string, depth: number): JsonValue {
    if (depth > 12 || entries++ > 800) {
      throw error(
        "mobile_edge.input_too_complex",
        path,
        "Input exceeds bounded shape limits.",
      );
    }
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw error("mobile_edge.invalid_number", path, "Numbers must be finite.");
      }
      return value;
    }
    if (typeof value === "string") {
      if (
        value.length > 4096 ||
        forbiddenValuePatterns.some((pattern) => pattern.test(value))
      ) {
        throw error(
          "mobile_edge.secret_or_oversized_value_forbidden",
          path,
          "Secret-like or oversized values are forbidden.",
        );
      }
      return value;
    }
    if (typeof value !== "object") {
      throw error(
        "mobile_edge.invalid_json_value",
        path,
        "Input must contain JSON values only.",
      );
    }
    if (seen.has(value)) {
      throw error("mobile_edge.cyclic_input", path, "Cyclic input is forbidden.");
    }
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        if (value.length > 128) {
          throw error(
            "mobile_edge.invalid_array",
            path,
            "Arrays must be dense and contain at most 128 entries.",
          );
        }
        const keys = Reflect.ownKeys(value);
        const expectedKeys = new Set([
          "length",
          ...Array.from({ length: value.length }, (_, index) => String(index)),
        ]);
        if (
          keys.some((key) => typeof key !== "string" || !expectedKeys.has(key)) ||
          keys.length !== expectedKeys.size
        ) {
          throw error(
            "mobile_edge.invalid_array",
            path,
            "Array symbols, holes, and extra properties are forbidden.",
          );
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        return Array.from({ length: value.length }, (_, index) => {
          const descriptor = descriptors[String(index)];
          if (
            descriptor === undefined ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined ||
            descriptor.enumerable !== true
          ) {
            throw error(
              "mobile_edge.invalid_property_descriptor",
              `${path}/${index}`,
              "Array accessors and non-enumerable entries are forbidden.",
            );
          }
          return visit(descriptor.value, `${path}/${index}`, depth + 1);
        });
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw error(
          "mobile_edge.invalid_object",
          path,
          "Objects must use a plain prototype.",
        );
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== "string")) {
        throw error(
          "mobile_edge.symbol_key_forbidden",
          path,
          "Symbol keys are forbidden.",
        );
      }
      const result: JsonRecord = Object.create(null) as JsonRecord;
      for (const key of keys as string[]) {
        const descriptor = descriptors[key];
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined ||
          descriptor.enumerable !== true
        ) {
          throw error(
            "mobile_edge.invalid_property_descriptor",
            `${path}/${key}`,
            "Accessors and non-enumerable properties are forbidden.",
          );
        }
        if (poisonKeys.has(key) || forbiddenKeyPattern.test(key)) {
          throw error(
            "mobile_edge.forbidden_field",
            `${path}/${key}`,
            "Poison and secret-bearing field names are forbidden.",
          );
        }
        result[key] = visit(descriptor.value, `${path}/${key}`, depth + 1);
      }
      return result;
    } finally {
      seen.delete(value);
    }
  }

  try {
    return { ok: true, value: visit(input, "", 0) };
  } catch (caught) {
    if (isValidationError(caught)) return { ok: false, errors: [caught] };
    return {
      ok: false,
      errors: [
        error("mobile_edge.invalid_input", "", "Input could not be safely inspected."),
      ],
    };
  }
}

function isValidationError(value: unknown): value is MobileEdgeValidationError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.path === "string" &&
    typeof value.message === "string" &&
    value.severity === "error"
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: unknown,
  keys: readonly string[],
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is JsonRecord {
  if (!isRecord(value)) {
    errors.push(error(code, path, "Expected object."));
    return false;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(
        error(`${code}.unexpected_field`, `${path}/${key}`, "Unexpected field."),
      );
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      errors.push(
        error(`${code}.field_required`, `${path}/${key}`, "Required field missing."),
      );
    }
  }
  return true;
}

function expectLiteral(
  value: unknown,
  expected: string | boolean | null,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): void {
  if (value !== expected)
    errors.push(error(code, path, `Expected ${String(expected)}.`));
}

function expectEnum<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    errors.push(error(code, path, "Value is not in allowed set."));
    return false;
  }
  return true;
}

function expectSafeText(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is string {
  if (typeof value !== "string" || !safeTextPattern.test(value)) {
    errors.push(error(code, path, "Expected bounded safe text."));
    return false;
  }
  return true;
}

function expectRef(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is string {
  if (typeof value !== "string" || !refPattern.test(value)) {
    errors.push(error(code, path, "Expected bounded typed reference."));
    return false;
  }
  return true;
}

function expectNullableRef(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is string | null {
  return value === null || expectRef(value, path, code, errors);
}

function expectDigest(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is MobileEdgeDigest {
  if (typeof value !== "string" || !digestPattern.test(value)) {
    errors.push(error(code, path, "Expected lowercase SHA-256 digest."));
    return false;
  }
  return true;
}

function expectInteger(
  value: unknown,
  min: number,
  max: number,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    errors.push(error(code, path, `Expected integer from ${min} through ${max}.`));
    return false;
  }
  return true;
}

function expectUtc(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): value is string {
  if (typeof value !== "string") {
    errors.push(error(code, path, "Expected canonical UTC timestamp."));
    return false;
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    errors.push(error(code, path, "Expected canonical UTC timestamp."));
    return false;
  }
  return true;
}

function expectArray(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
  minimum = 1,
): value is JsonValue[] {
  if (!Array.isArray(value) || value.length < minimum) {
    errors.push(error(code, path, `Expected array with at least ${minimum} item(s).`));
    return false;
  }
  return true;
}

function expectUniqueStrings(
  value: unknown,
  validator: (
    item: unknown,
    path: string,
    code: string,
    errors: MobileEdgeValidationError[],
  ) => boolean,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
  minimum = 1,
): value is string[] {
  if (!expectArray(value, path, code, errors, minimum)) return false;
  value.forEach((item, index) => validator(item, `${path}/${index}`, code, errors));
  if (
    value.every((item) => typeof item === "string") &&
    new Set(value).size !== value.length
  ) {
    errors.push(error(`${code}.duplicate`, path, "Duplicate entries are forbidden."));
  }
  return true;
}

function expectEmptySideEffects(
  value: unknown,
  path: string,
  errors: MobileEdgeValidationError[],
): void {
  if (!Array.isArray(value) || value.length !== 0) {
    errors.push(
      error(
        "mobile_edge.side_effects_forbidden",
        path,
        "Source contracts require side_effects: [].",
      ),
    );
  }
}

function validateConstraints(
  value: unknown,
  path: string,
  errors: MobileEdgeValidationError[],
): void {
  if (
    !exactKeys(
      value,
      ["resource_limits", "data_policy"],
      path,
      "mobile_edge.constraints",
      errors,
    )
  )
    return;
  const resource = value.resource_limits;
  if (
    exactKeys(
      resource,
      [
        "max_duration_ms",
        "max_ram_mb",
        "max_storage_mb",
        "battery_floor_percent",
        "charging_required",
        "max_thermal_state",
        "network",
        "background",
        "retry_limit",
      ],
      `${path}/resource_limits`,
      "mobile_edge.resource_limits",
      errors,
    )
  ) {
    expectInteger(
      resource.max_duration_ms,
      1,
      86_400_000,
      `${path}/resource_limits/max_duration_ms`,
      "mobile_edge.invalid_duration",
      errors,
    );
    expectInteger(
      resource.max_ram_mb,
      1,
      1_048_576,
      `${path}/resource_limits/max_ram_mb`,
      "mobile_edge.invalid_ram",
      errors,
    );
    expectInteger(
      resource.max_storage_mb,
      0,
      1_048_576,
      `${path}/resource_limits/max_storage_mb`,
      "mobile_edge.invalid_storage",
      errors,
    );
    expectInteger(
      resource.battery_floor_percent,
      0,
      100,
      `${path}/resource_limits/battery_floor_percent`,
      "mobile_edge.invalid_battery",
      errors,
    );
    if (typeof resource.charging_required !== "boolean")
      errors.push(
        error(
          "mobile_edge.invalid_charging",
          `${path}/resource_limits/charging_required`,
          "Expected boolean.",
        ),
      );
    expectEnum(
      resource.max_thermal_state,
      new Set(["nominal", "fair", "serious"]),
      `${path}/resource_limits/max_thermal_state`,
      "mobile_edge.invalid_thermal",
      errors,
    );
    expectEnum(
      resource.network,
      new Set(["offline_only", "wifi_only", "unmetered", "any"]),
      `${path}/resource_limits/network`,
      "mobile_edge.invalid_network",
      errors,
    );
    expectEnum(
      resource.background,
      new Set(["foreground_only", "os_scheduled"]),
      `${path}/resource_limits/background`,
      "mobile_edge.invalid_background",
      errors,
    );
    expectInteger(
      resource.retry_limit,
      0,
      10,
      `${path}/resource_limits/retry_limit`,
      "mobile_edge.invalid_retry",
      errors,
    );
  }

  const data = value.data_policy;
  if (
    exactKeys(
      data,
      [
        "allowed_data_classes",
        "allowed_sensors",
        "egress",
        "result_destination_ref",
        "input_retention_seconds",
        "output_retention_seconds",
      ],
      `${path}/data_policy`,
      "mobile_edge.data_policy",
      errors,
    )
  ) {
    expectUniqueStrings(
      data.allowed_data_classes,
      (item, itemPath, code, list) =>
        expectEnum(item, dataClasses, itemPath, code, list),
      `${path}/data_policy/allowed_data_classes`,
      "mobile_edge.invalid_data_class",
      errors,
    );
    expectUniqueStrings(
      data.allowed_sensors,
      (item, itemPath, code, list) => expectEnum(item, sensors, itemPath, code, list),
      `${path}/data_policy/allowed_sensors`,
      "mobile_edge.invalid_sensor",
      errors,
      0,
    );
    expectEnum(
      data.egress,
      new Set(["local_only", "approved_relay"]),
      `${path}/data_policy/egress`,
      "mobile_edge.invalid_egress",
      errors,
    );
    expectRef(
      data.result_destination_ref,
      `${path}/data_policy/result_destination_ref`,
      "mobile_edge.invalid_result_destination",
      errors,
    );
    expectInteger(
      data.input_retention_seconds,
      0,
      31_536_000,
      `${path}/data_policy/input_retention_seconds`,
      "mobile_edge.invalid_retention",
      errors,
    );
    expectInteger(
      data.output_retention_seconds,
      0,
      31_536_000,
      `${path}/data_policy/output_retention_seconds`,
      "mobile_edge.invalid_retention",
      errors,
    );
  }
}

function validateSignatureShape(
  value: unknown,
  path: string,
  code: string,
  errors: MobileEdgeValidationError[],
): void {
  if (
    !exactKeys(
      value,
      [
        "algorithm",
        "key_ref",
        "key_version",
        "signed_payload_digest",
        "signature_base64url",
      ],
      path,
      `${code}.signature`,
      errors,
    )
  )
    return;
  expectLiteral(
    value.algorithm,
    "Ed25519",
    `${path}/algorithm`,
    `${code}.invalid_signature_algorithm`,
    errors,
  );
  expectRef(
    value.key_ref,
    `${path}/key_ref`,
    `${code}.invalid_signature_key_ref`,
    errors,
  );
  expectSafeText(
    value.key_version,
    `${path}/key_version`,
    `${code}.invalid_signature_key_version`,
    errors,
  );
  expectDigest(
    value.signed_payload_digest,
    `${path}/signed_payload_digest`,
    `${code}.invalid_signed_digest`,
    errors,
  );
  if (
    typeof value.signature_base64url !== "string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(value.signature_base64url)
  ) {
    errors.push(
      error(
        `${code}.invalid_signature_encoding`,
        `${path}/signature_base64url`,
        "Ed25519 signature must be canonical base64url for exactly 64 bytes.",
      ),
    );
    return;
  }
  try {
    if (decodeBase64Url(value.signature_base64url).length !== 64)
      throw new TypeError("invalid Ed25519 signature length");
  } catch {
    errors.push(
      error(
        `${code}.invalid_signature_encoding`,
        `${path}/signature_base64url`,
        "Ed25519 signature must decode to exactly 64 bytes.",
      ),
    );
  }
}

export function validateMobileCapabilityManifest(
  input: unknown,
): MobileEdgeValidationResult<MobileCapabilityManifest> {
  const snapshot = snapshotInput(input);
  if (!snapshot.ok) return failure(snapshot.errors);
  const errors: MobileEdgeValidationError[] = [];
  const value = snapshot.value;
  const keys = [
    "contract_id",
    "manifest_version",
    "manifest_ref",
    "manifest_digest",
    "device_ref",
    "owner_ref",
    "tenant_ref",
    "substrate_kind",
    "management_mode",
    "platform",
    "os_version",
    "patch_level",
    "app_version",
    "architecture",
    "soc_family",
    "result_signing_key",
    "compute",
    "power",
    "network",
    "sensors",
    "supported_workload_classes",
    "forbidden_capabilities",
    "model_cache",
    "policy_version",
    "revoked",
    "quarantined",
    "observed_at",
    "expires_at",
    "evidence_refs",
    "side_effects",
  ];
  if (!exactKeys(value, keys, "", "mobile_edge.manifest", errors))
    return failure(errors);
  expectLiteral(
    value.contract_id,
    "lnsat.mobile_edge.capability_manifest.v0_1",
    "/contract_id",
    "mobile_edge.manifest.invalid_contract",
    errors,
  );
  expectLiteral(
    value.manifest_version,
    "0.1",
    "/manifest_version",
    "mobile_edge.manifest.invalid_version",
    errors,
  );
  expectRef(
    value.manifest_ref,
    "/manifest_ref",
    "mobile_edge.manifest.invalid_ref",
    errors,
  );
  expectDigest(
    value.manifest_digest,
    "/manifest_digest",
    "mobile_edge.manifest.invalid_digest",
    errors,
  );
  expectRef(
    value.device_ref,
    "/device_ref",
    "mobile_edge.manifest.invalid_device",
    errors,
  );
  expectRef(
    value.owner_ref,
    "/owner_ref",
    "mobile_edge.manifest.invalid_owner",
    errors,
  );
  expectRef(
    value.tenant_ref,
    "/tenant_ref",
    "mobile_edge.manifest.invalid_tenant",
    errors,
  );
  expectLiteral(
    value.substrate_kind,
    "mobile_edge",
    "/substrate_kind",
    "mobile_edge.manifest.invalid_substrate",
    errors,
  );
  expectEnum(
    value.management_mode,
    new Set(["personal_opt_in", "work_profile", "company_owned", "dedicated", "lab"]),
    "/management_mode",
    "mobile_edge.manifest.invalid_management",
    errors,
  );
  expectEnum(
    value.platform,
    new Set(["ios", "ipados", "android"]),
    "/platform",
    "mobile_edge.manifest.invalid_platform",
    errors,
  );
  expectSafeText(
    value.os_version,
    "/os_version",
    "mobile_edge.manifest.invalid_os_version",
    errors,
  );
  expectSafeText(
    value.patch_level,
    "/patch_level",
    "mobile_edge.manifest.invalid_patch",
    errors,
  );
  expectSafeText(
    value.app_version,
    "/app_version",
    "mobile_edge.manifest.invalid_app_version",
    errors,
  );
  expectEnum(
    value.architecture,
    new Set(["arm64", "x86_64", "other"]),
    "/architecture",
    "mobile_edge.manifest.invalid_architecture",
    errors,
  );
  expectSafeText(
    value.soc_family,
    "/soc_family",
    "mobile_edge.manifest.invalid_soc",
    errors,
  );
  if (
    exactKeys(
      value.result_signing_key,
      ["key_ref", "key_version", "attestation_evidence_ref"],
      "/result_signing_key",
      "mobile_edge.manifest.result_signing_key",
      errors,
    )
  ) {
    expectRef(
      value.result_signing_key.key_ref,
      "/result_signing_key/key_ref",
      "mobile_edge.manifest.invalid_result_key_ref",
      errors,
    );
    expectSafeText(
      value.result_signing_key.key_version,
      "/result_signing_key/key_version",
      "mobile_edge.manifest.invalid_result_key_version",
      errors,
    );
    expectRef(
      value.result_signing_key.attestation_evidence_ref,
      "/result_signing_key/attestation_evidence_ref",
      "mobile_edge.manifest.invalid_attestation_ref",
      errors,
    );
  }

  if (
    exactKeys(
      value.compute,
      [
        "accelerator",
        "supported_precisions",
        "runtimes",
        "ram_budget_mb",
        "storage_budget_mb",
      ],
      "/compute",
      "mobile_edge.manifest.compute",
      errors,
    )
  ) {
    expectEnum(
      value.compute.accelerator,
      new Set(["cpu_only", "gpu", "npu", "gpu_npu"]),
      "/compute/accelerator",
      "mobile_edge.manifest.invalid_accelerator",
      errors,
    );
    expectUniqueStrings(
      value.compute.supported_precisions,
      (item, path, code, list) =>
        expectEnum(
          item,
          new Set(["fp32", "fp16", "bf16", "int8", "int4"]),
          path,
          code,
          list,
        ),
      "/compute/supported_precisions",
      "mobile_edge.manifest.invalid_precision",
      errors,
    );
    if (
      expectArray(
        value.compute.runtimes,
        "/compute/runtimes",
        "mobile_edge.manifest.runtime_required",
        errors,
      )
    ) {
      value.compute.runtimes.forEach((runtime, index) => {
        const path = `/compute/runtimes/${index}`;
        if (
          exactKeys(
            runtime,
            ["runtime_ref", "runtime_digest", "model_formats"],
            path,
            "mobile_edge.manifest.runtime",
            errors,
          )
        ) {
          expectRef(
            runtime.runtime_ref,
            `${path}/runtime_ref`,
            "mobile_edge.manifest.invalid_runtime_ref",
            errors,
          );
          expectDigest(
            runtime.runtime_digest,
            `${path}/runtime_digest`,
            "mobile_edge.manifest.invalid_runtime_digest",
            errors,
          );
          expectUniqueStrings(
            runtime.model_formats,
            expectSafeText,
            `${path}/model_formats`,
            "mobile_edge.manifest.invalid_model_format",
            errors,
          );
        }
      });
    }
    expectInteger(
      value.compute.ram_budget_mb,
      1,
      1_048_576,
      "/compute/ram_budget_mb",
      "mobile_edge.manifest.invalid_ram",
      errors,
    );
    expectInteger(
      value.compute.storage_budget_mb,
      0,
      1_048_576,
      "/compute/storage_budget_mb",
      "mobile_edge.manifest.invalid_storage",
      errors,
    );
  }

  if (
    exactKeys(
      value.power,
      [
        "battery_percent",
        "charging",
        "thermal_state",
        "low_power_mode",
        "background_posture",
      ],
      "/power",
      "mobile_edge.manifest.power",
      errors,
    )
  ) {
    expectInteger(
      value.power.battery_percent,
      0,
      100,
      "/power/battery_percent",
      "mobile_edge.manifest.invalid_battery",
      errors,
    );
    if (typeof value.power.charging !== "boolean")
      errors.push(
        error(
          "mobile_edge.manifest.invalid_charging",
          "/power/charging",
          "Expected boolean.",
        ),
      );
    expectEnum(
      value.power.thermal_state,
      new Set(["nominal", "fair", "serious", "critical"]),
      "/power/thermal_state",
      "mobile_edge.manifest.invalid_thermal",
      errors,
    );
    if (typeof value.power.low_power_mode !== "boolean")
      errors.push(
        error(
          "mobile_edge.manifest.invalid_power_mode",
          "/power/low_power_mode",
          "Expected boolean.",
        ),
      );
    expectEnum(
      value.power.background_posture,
      new Set(["foreground_only", "os_scheduled"]),
      "/power/background_posture",
      "mobile_edge.manifest.invalid_background",
      errors,
    );
  }

  if (
    exactKeys(
      value.network,
      [
        "transport",
        "metered",
        "roaming",
        "outbound_only",
        "inbound_listener_allowed",
        "peer_mesh_allowed",
      ],
      "/network",
      "mobile_edge.manifest.network",
      errors,
    )
  ) {
    expectEnum(
      value.network.transport,
      new Set(["offline", "wifi", "cellular"]),
      "/network/transport",
      "mobile_edge.manifest.invalid_transport",
      errors,
    );
    if (
      typeof value.network.metered !== "boolean" ||
      typeof value.network.roaming !== "boolean"
    )
      errors.push(
        error(
          "mobile_edge.manifest.invalid_network_state",
          "/network",
          "Metered and roaming states must be boolean.",
        ),
      );
    expectLiteral(
      value.network.outbound_only,
      true,
      "/network/outbound_only",
      "mobile_edge.manifest.outbound_only_required",
      errors,
    );
    expectLiteral(
      value.network.inbound_listener_allowed,
      false,
      "/network/inbound_listener_allowed",
      "mobile_edge.manifest.inbound_listener_forbidden",
      errors,
    );
    expectLiteral(
      value.network.peer_mesh_allowed,
      false,
      "/network/peer_mesh_allowed",
      "mobile_edge.manifest.peer_mesh_forbidden",
      errors,
    );
  }

  if (
    expectArray(
      value.sensors,
      "/sensors",
      "mobile_edge.manifest.sensor_required",
      errors,
      0,
    )
  ) {
    value.sensors.forEach((sensor, index) => {
      const path = `/sensors/${index}`;
      if (
        exactKeys(
          sensor,
          ["sensor", "os_permission", "policy_allowed"],
          path,
          "mobile_edge.manifest.sensor",
          errors,
        )
      ) {
        expectEnum(
          sensor.sensor,
          sensors,
          `${path}/sensor`,
          "mobile_edge.manifest.invalid_sensor",
          errors,
        );
        expectEnum(
          sensor.os_permission,
          new Set(["granted", "denied", "prompt_required"]),
          `${path}/os_permission`,
          "mobile_edge.manifest.invalid_sensor_permission",
          errors,
        );
        if (typeof sensor.policy_allowed !== "boolean")
          errors.push(
            error(
              "mobile_edge.manifest.invalid_sensor_policy",
              `${path}/policy_allowed`,
              "Expected boolean.",
            ),
          );
      }
    });
    const names = value.sensors.flatMap((item) =>
      isRecord(item) && typeof item.sensor === "string" ? [item.sensor] : [],
    );
    if (new Set(names).size !== names.length)
      errors.push(
        error(
          "mobile_edge.manifest.duplicate_sensor",
          "/sensors",
          "Duplicate sensors are forbidden.",
        ),
      );
  }
  expectUniqueStrings(
    value.supported_workload_classes,
    (item, path, code, list) => expectEnum(item, workloadClasses, path, code, list),
    "/supported_workload_classes",
    "mobile_edge.manifest.invalid_workload_class",
    errors,
  );
  expectUniqueStrings(
    value.forbidden_capabilities,
    expectSafeText,
    "/forbidden_capabilities",
    "mobile_edge.manifest.invalid_forbidden_capability",
    errors,
  );
  if (
    expectArray(
      value.model_cache,
      "/model_cache",
      "mobile_edge.manifest.model_cache_required",
      errors,
      0,
    )
  ) {
    value.model_cache.forEach((entry, index) => {
      const path = `/model_cache/${index}`;
      if (
        exactKeys(
          entry,
          ["model_digest", "runtime_digest"],
          path,
          "mobile_edge.manifest.model_cache",
          errors,
        )
      ) {
        expectDigest(
          entry.model_digest,
          `${path}/model_digest`,
          "mobile_edge.manifest.invalid_model_digest",
          errors,
        );
        expectDigest(
          entry.runtime_digest,
          `${path}/runtime_digest`,
          "mobile_edge.manifest.invalid_runtime_digest",
          errors,
        );
      }
    });
  }
  expectSafeText(
    value.policy_version,
    "/policy_version",
    "mobile_edge.manifest.invalid_policy_version",
    errors,
  );
  if (typeof value.revoked !== "boolean")
    errors.push(
      error("mobile_edge.manifest.invalid_revocation", "/revoked", "Expected boolean."),
    );
  if (typeof value.quarantined !== "boolean")
    errors.push(
      error(
        "mobile_edge.manifest.invalid_quarantine",
        "/quarantined",
        "Expected boolean.",
      ),
    );
  const observedValid = expectUtc(
    value.observed_at,
    "/observed_at",
    "mobile_edge.manifest.invalid_observed_at",
    errors,
  );
  const expiryValid = expectUtc(
    value.expires_at,
    "/expires_at",
    "mobile_edge.manifest.invalid_expires_at",
    errors,
  );
  if (
    observedValid &&
    expiryValid &&
    Date.parse(value.expires_at as string) <= Date.parse(value.observed_at as string)
  )
    errors.push(
      error(
        "mobile_edge.manifest.invalid_time_window",
        "/expires_at",
        "Manifest expiry must follow observation.",
      ),
    );
  expectUniqueStrings(
    value.evidence_refs,
    expectRef,
    "/evidence_refs",
    "mobile_edge.manifest.invalid_evidence_ref",
    errors,
  );
  expectEmptySideEffects(value.side_effects, "/side_effects", errors);
  return errors.length === 0
    ? success(value as unknown as MobileCapabilityManifest)
    : failure(errors);
}

export function validateMobilePolicyDecision(
  input: unknown,
): MobileEdgeValidationResult<MobilePolicyDecision> {
  const snapshot = snapshotInput(input);
  if (!snapshot.ok) return failure(snapshot.errors);
  const errors: MobileEdgeValidationError[] = [];
  const value = snapshot.value;
  const keys = [
    "contract_id",
    "decision_version",
    "decision_ref",
    "decision_digest",
    "packet_ref",
    "device_ref",
    "owner_ref",
    "tenant_ref",
    "operator_ref",
    "session_ref",
    "manifest_ref",
    "manifest_digest",
    "policy_ref",
    "policy_digest",
    "decision",
    "lease_issuance",
    "required_approval_ref",
    "approval_evidence_ref",
    "approved_model_digests",
    "approved_runtime_digests",
    "allowed_workload_classes",
    "constraints",
    "reasons",
    "evaluated_at",
    "expires_at",
    "evidence_refs",
    "side_effects",
  ];
  if (!exactKeys(value, keys, "", "mobile_edge.policy", errors)) return failure(errors);
  expectLiteral(
    value.contract_id,
    "lnsat.mobile_edge.policy_decision.v0_1",
    "/contract_id",
    "mobile_edge.policy.invalid_contract",
    errors,
  );
  expectLiteral(
    value.decision_version,
    "0.1",
    "/decision_version",
    "mobile_edge.policy.invalid_version",
    errors,
  );
  expectRef(
    value.decision_ref,
    "/decision_ref",
    "mobile_edge.policy.invalid_ref",
    errors,
  );
  expectDigest(
    value.decision_digest,
    "/decision_digest",
    "mobile_edge.policy.invalid_decision_digest",
    errors,
  );
  expectRef(
    value.packet_ref,
    "/packet_ref",
    "mobile_edge.policy.invalid_packet_ref",
    errors,
  );
  expectRef(
    value.device_ref,
    "/device_ref",
    "mobile_edge.policy.invalid_device_ref",
    errors,
  );
  expectRef(
    value.owner_ref,
    "/owner_ref",
    "mobile_edge.policy.invalid_owner_ref",
    errors,
  );
  expectRef(
    value.tenant_ref,
    "/tenant_ref",
    "mobile_edge.policy.invalid_tenant_ref",
    errors,
  );
  expectRef(
    value.operator_ref,
    "/operator_ref",
    "mobile_edge.policy.invalid_operator_ref",
    errors,
  );
  expectRef(
    value.session_ref,
    "/session_ref",
    "mobile_edge.policy.invalid_session_ref",
    errors,
  );
  expectRef(
    value.manifest_ref,
    "/manifest_ref",
    "mobile_edge.policy.invalid_manifest_ref",
    errors,
  );
  expectDigest(
    value.manifest_digest,
    "/manifest_digest",
    "mobile_edge.policy.invalid_manifest_digest",
    errors,
  );
  expectRef(
    value.policy_ref,
    "/policy_ref",
    "mobile_edge.policy.invalid_policy_ref",
    errors,
  );
  expectDigest(
    value.policy_digest,
    "/policy_digest",
    "mobile_edge.policy.invalid_policy_digest",
    errors,
  );
  const decisionValid = expectEnum(
    value.decision,
    new Set(["allow", "deny", "approval_required"]),
    "/decision",
    "mobile_edge.policy.invalid_decision",
    errors,
  );
  const issuanceValid = expectEnum(
    value.lease_issuance,
    new Set(["eligible", "blocked", "pending_approval"]),
    "/lease_issuance",
    "mobile_edge.policy.invalid_lease_issuance",
    errors,
  );
  expectNullableRef(
    value.required_approval_ref,
    "/required_approval_ref",
    "mobile_edge.policy.invalid_required_approval",
    errors,
  );
  expectNullableRef(
    value.approval_evidence_ref,
    "/approval_evidence_ref",
    "mobile_edge.policy.invalid_approval_evidence",
    errors,
  );
  if (decisionValid && issuanceValid) {
    const expected =
      value.decision === "allow"
        ? "eligible"
        : value.decision === "deny"
          ? "blocked"
          : "pending_approval";
    if (value.lease_issuance !== expected)
      errors.push(
        error(
          "mobile_edge.policy.inconsistent_lease_issuance",
          "/lease_issuance",
          "Lease issuance must match decision.",
        ),
      );
    if (value.decision === "approval_required" && value.required_approval_ref === null)
      errors.push(
        error(
          "mobile_edge.policy.approval_ref_required",
          "/required_approval_ref",
          "Approval-required decision needs approval ref.",
        ),
      );
    if (value.decision === "approval_required" && value.approval_evidence_ref !== null)
      errors.push(
        error(
          "mobile_edge.policy.premature_approval_evidence",
          "/approval_evidence_ref",
          "Pending decision cannot contain granted approval evidence.",
        ),
      );
    if (
      value.decision === "allow" &&
      value.required_approval_ref !== null &&
      value.approval_evidence_ref === null
    )
      errors.push(
        error(
          "mobile_edge.policy.approval_evidence_required",
          "/approval_evidence_ref",
          "Allowed decision with approval requirement needs evidence.",
        ),
      );
    if (
      value.decision === "deny" &&
      (value.required_approval_ref !== null || value.approval_evidence_ref !== null)
    )
      errors.push(
        error(
          "mobile_edge.policy.denied_approval_refs_forbidden",
          "/required_approval_ref",
          "Denied decision cannot carry approval refs.",
        ),
      );
  }
  expectUniqueStrings(
    value.approved_model_digests,
    expectDigest,
    "/approved_model_digests",
    "mobile_edge.policy.invalid_model_digest",
    errors,
  );
  expectUniqueStrings(
    value.approved_runtime_digests,
    expectDigest,
    "/approved_runtime_digests",
    "mobile_edge.policy.invalid_runtime_digest",
    errors,
  );
  expectUniqueStrings(
    value.allowed_workload_classes,
    (item, path, code, list) => expectEnum(item, workloadClasses, path, code, list),
    "/allowed_workload_classes",
    "mobile_edge.policy.invalid_workload_class",
    errors,
  );
  validateConstraints(value.constraints, "/constraints", errors);
  if (
    isRecord(value.constraints) &&
    isRecord(value.constraints.resource_limits) &&
    typeof value.constraints.resource_limits.max_duration_ms === "number" &&
    value.constraints.resource_limits.max_duration_ms > 300_000
  )
    errors.push(
      error(
        "mobile_edge.policy.duration_ceiling_exceeded",
        "/constraints/resource_limits/max_duration_ms",
        "Source-only mobile lease workload duration cannot exceed five minutes.",
      ),
    );
  expectUniqueStrings(
    value.reasons,
    expectSafeText,
    "/reasons",
    "mobile_edge.policy.invalid_reason",
    errors,
  );
  const evaluatedValid = expectUtc(
    value.evaluated_at,
    "/evaluated_at",
    "mobile_edge.policy.invalid_evaluated_at",
    errors,
  );
  const expiryValid = expectUtc(
    value.expires_at,
    "/expires_at",
    "mobile_edge.policy.invalid_expires_at",
    errors,
  );
  if (
    evaluatedValid &&
    expiryValid &&
    Date.parse(value.expires_at as string) <= Date.parse(value.evaluated_at as string)
  )
    errors.push(
      error(
        "mobile_edge.policy.invalid_time_window",
        "/expires_at",
        "Decision expiry must follow evaluation.",
      ),
    );
  expectUniqueStrings(
    value.evidence_refs,
    expectRef,
    "/evidence_refs",
    "mobile_edge.policy.invalid_evidence_ref",
    errors,
  );
  expectEmptySideEffects(value.side_effects, "/side_effects", errors);
  return errors.length === 0
    ? success(value as unknown as MobilePolicyDecision)
    : failure(errors);
}

export function validateMobileSignedWorkloadLease(
  input: unknown,
): MobileEdgeValidationResult<MobileSignedWorkloadLease> {
  const snapshot = snapshotInput(input);
  if (!snapshot.ok) return failure(snapshot.errors);
  const errors: MobileEdgeValidationError[] = [];
  const value = snapshot.value;
  const keys = [
    "contract_id",
    "lease_version",
    "lease_ref",
    "packet_ref",
    "device_ref",
    "owner_ref",
    "tenant_ref",
    "operator_ref",
    "session_ref",
    "manifest_ref",
    "manifest_digest",
    "policy_decision_ref",
    "policy_decision_digest",
    "approval_evidence_ref",
    "model_digest",
    "runtime_digest",
    "workload_class",
    "input_refs",
    "constraints",
    "issued_at",
    "not_before",
    "expires_at",
    "cancellation_ref",
    "nonce",
    "idempotency_key",
    "checkpoint_required",
    "evidence_obligations",
    "signature",
    "side_effects",
  ];
  if (!exactKeys(value, keys, "", "mobile_edge.lease", errors)) return failure(errors);
  expectLiteral(
    value.contract_id,
    "lnsat.mobile_edge.signed_workload_lease.v0_1",
    "/contract_id",
    "mobile_edge.lease.invalid_contract",
    errors,
  );
  expectLiteral(
    value.lease_version,
    "0.1",
    "/lease_version",
    "mobile_edge.lease.invalid_version",
    errors,
  );
  expectRef(value.lease_ref, "/lease_ref", "mobile_edge.lease.invalid_ref", errors);
  expectRef(
    value.packet_ref,
    "/packet_ref",
    "mobile_edge.lease.invalid_packet_ref",
    errors,
  );
  expectRef(
    value.device_ref,
    "/device_ref",
    "mobile_edge.lease.invalid_device_ref",
    errors,
  );
  expectRef(
    value.owner_ref,
    "/owner_ref",
    "mobile_edge.lease.invalid_owner_ref",
    errors,
  );
  expectRef(
    value.tenant_ref,
    "/tenant_ref",
    "mobile_edge.lease.invalid_tenant_ref",
    errors,
  );
  expectRef(
    value.operator_ref,
    "/operator_ref",
    "mobile_edge.lease.invalid_operator_ref",
    errors,
  );
  expectRef(
    value.session_ref,
    "/session_ref",
    "mobile_edge.lease.invalid_session_ref",
    errors,
  );
  expectRef(
    value.manifest_ref,
    "/manifest_ref",
    "mobile_edge.lease.invalid_manifest_ref",
    errors,
  );
  expectDigest(
    value.manifest_digest,
    "/manifest_digest",
    "mobile_edge.lease.invalid_manifest_digest",
    errors,
  );
  expectRef(
    value.policy_decision_ref,
    "/policy_decision_ref",
    "mobile_edge.lease.invalid_policy_ref",
    errors,
  );
  expectDigest(
    value.policy_decision_digest,
    "/policy_decision_digest",
    "mobile_edge.lease.invalid_policy_digest",
    errors,
  );
  expectNullableRef(
    value.approval_evidence_ref,
    "/approval_evidence_ref",
    "mobile_edge.lease.invalid_approval_ref",
    errors,
  );
  expectDigest(
    value.model_digest,
    "/model_digest",
    "mobile_edge.lease.invalid_model_digest",
    errors,
  );
  expectDigest(
    value.runtime_digest,
    "/runtime_digest",
    "mobile_edge.lease.invalid_runtime_digest",
    errors,
  );
  expectEnum(
    value.workload_class,
    workloadClasses,
    "/workload_class",
    "mobile_edge.lease.invalid_workload_class",
    errors,
  );
  expectUniqueStrings(
    value.input_refs,
    expectRef,
    "/input_refs",
    "mobile_edge.lease.invalid_input_ref",
    errors,
  );
  validateConstraints(value.constraints, "/constraints", errors);
  if (
    isRecord(value.constraints) &&
    isRecord(value.constraints.resource_limits) &&
    typeof value.constraints.resource_limits.max_duration_ms === "number" &&
    value.constraints.resource_limits.max_duration_ms > 300_000
  )
    errors.push(
      error(
        "mobile_edge.lease.duration_ceiling_exceeded",
        "/constraints/resource_limits/max_duration_ms",
        "Source-only mobile lease workload duration cannot exceed five minutes.",
      ),
    );
  const issuedValid = expectUtc(
    value.issued_at,
    "/issued_at",
    "mobile_edge.lease.invalid_issued_at",
    errors,
  );
  const notBeforeValid = expectUtc(
    value.not_before,
    "/not_before",
    "mobile_edge.lease.invalid_not_before",
    errors,
  );
  const expiryValid = expectUtc(
    value.expires_at,
    "/expires_at",
    "mobile_edge.lease.invalid_expires_at",
    errors,
  );
  if (
    issuedValid &&
    notBeforeValid &&
    Date.parse(value.not_before as string) < Date.parse(value.issued_at as string)
  )
    errors.push(
      error(
        "mobile_edge.lease.invalid_not_before",
        "/not_before",
        "Not-before cannot precede issue time.",
      ),
    );
  if (
    notBeforeValid &&
    expiryValid &&
    Date.parse(value.expires_at as string) <= Date.parse(value.not_before as string)
  )
    errors.push(
      error(
        "mobile_edge.lease.invalid_time_window",
        "/expires_at",
        "Lease expiry must follow not-before.",
      ),
    );
  if (
    notBeforeValid &&
    expiryValid &&
    Date.parse(value.expires_at as string) - Date.parse(value.not_before as string) >
      3_600_000
  )
    errors.push(
      error(
        "mobile_edge.lease.ttl_exceeded",
        "/expires_at",
        "Mobile lease TTL cannot exceed one hour.",
      ),
    );
  expectRef(
    value.cancellation_ref,
    "/cancellation_ref",
    "mobile_edge.lease.invalid_cancellation_ref",
    errors,
  );
  expectSafeText(value.nonce, "/nonce", "mobile_edge.lease.invalid_nonce", errors);
  expectSafeText(
    value.idempotency_key,
    "/idempotency_key",
    "mobile_edge.lease.invalid_idempotency_key",
    errors,
  );
  if (typeof value.checkpoint_required !== "boolean")
    errors.push(
      error(
        "mobile_edge.lease.invalid_checkpoint",
        "/checkpoint_required",
        "Expected boolean.",
      ),
    );
  expectUniqueStrings(
    value.evidence_obligations,
    expectRef,
    "/evidence_obligations",
    "mobile_edge.lease.invalid_evidence_obligation",
    errors,
  );
  validateSignatureShape(value.signature, "/signature", "mobile_edge.lease", errors);
  expectEmptySideEffects(value.side_effects, "/side_effects", errors);
  return errors.length === 0
    ? success(value as unknown as MobileSignedWorkloadLease)
    : failure(errors);
}

export function validateMobileLeaseStatusEvidence(
  input: unknown,
): MobileEdgeValidationResult<MobileLeaseStatusEvidence> {
  const snapshot = snapshotInput(input);
  if (!snapshot.ok) return failure(snapshot.errors);
  const errors: MobileEdgeValidationError[] = [];
  const value = snapshot.value;
  const keys = [
    "contract_id",
    "status_version",
    "status_ref",
    "lease_ref",
    "cancellation_ref",
    "sequence",
    "status",
    "observed_at",
    "expires_at",
    "evidence_refs",
    "signature",
    "side_effects",
  ];
  if (!exactKeys(value, keys, "", "mobile_edge.lease_status", errors))
    return failure(errors);
  expectLiteral(
    value.contract_id,
    "lnsat.mobile_edge.lease_status_evidence.v0_1",
    "/contract_id",
    "mobile_edge.lease_status.invalid_contract",
    errors,
  );
  expectLiteral(
    value.status_version,
    "0.1",
    "/status_version",
    "mobile_edge.lease_status.invalid_version",
    errors,
  );
  expectRef(
    value.status_ref,
    "/status_ref",
    "mobile_edge.lease_status.invalid_ref",
    errors,
  );
  expectRef(
    value.lease_ref,
    "/lease_ref",
    "mobile_edge.lease_status.invalid_lease_ref",
    errors,
  );
  expectRef(
    value.cancellation_ref,
    "/cancellation_ref",
    "mobile_edge.lease_status.invalid_cancellation_ref",
    errors,
  );
  expectInteger(
    value.sequence,
    0,
    Number.MAX_SAFE_INTEGER,
    "/sequence",
    "mobile_edge.lease_status.invalid_sequence",
    errors,
  );
  expectEnum(
    value.status,
    new Set(["active", "cancelled", "revoked"]),
    "/status",
    "mobile_edge.lease_status.invalid_status",
    errors,
  );
  const observedValid = expectUtc(
    value.observed_at,
    "/observed_at",
    "mobile_edge.lease_status.invalid_observed_at",
    errors,
  );
  const expiryValid = expectUtc(
    value.expires_at,
    "/expires_at",
    "mobile_edge.lease_status.invalid_expires_at",
    errors,
  );
  if (
    observedValid &&
    expiryValid &&
    (Date.parse(value.expires_at as string) <=
      Date.parse(value.observed_at as string) ||
      Date.parse(value.expires_at as string) - Date.parse(value.observed_at as string) >
        300_000)
  )
    errors.push(
      error(
        "mobile_edge.lease_status.invalid_time_window",
        "/expires_at",
        "Lease status must expire within five minutes after observation.",
      ),
    );
  expectUniqueStrings(
    value.evidence_refs,
    expectRef,
    "/evidence_refs",
    "mobile_edge.lease_status.invalid_evidence_ref",
    errors,
  );
  validateSignatureShape(
    value.signature,
    "/signature",
    "mobile_edge.lease_status",
    errors,
  );
  expectEmptySideEffects(value.side_effects, "/side_effects", errors);
  return errors.length === 0
    ? success(value as unknown as MobileLeaseStatusEvidence)
    : failure(errors);
}

export function validateMobileResultEvidence(
  input: unknown,
): MobileEdgeValidationResult<MobileResultEvidence> {
  const snapshot = snapshotInput(input);
  if (!snapshot.ok) return failure(snapshot.errors);
  const errors: MobileEdgeValidationError[] = [];
  const value = snapshot.value;
  const keys = [
    "contract_id",
    "result_version",
    "result_ref",
    "lease_ref",
    "packet_ref",
    "device_ref",
    "owner_ref",
    "tenant_ref",
    "operator_ref",
    "session_ref",
    "manifest_digest",
    "policy_decision_digest",
    "model_digest",
    "runtime_digest",
    "input_refs",
    "result_destination_ref",
    "egress",
    "status",
    "started_at",
    "finished_at",
    "output_refs",
    "error_codes",
    "resource_usage",
    "verification",
    "evidence_refs",
    "signature",
    "publication_performed",
    "side_effects",
  ];
  if (!exactKeys(value, keys, "", "mobile_edge.result", errors)) return failure(errors);
  expectLiteral(
    value.contract_id,
    "lnsat.mobile_edge.result_evidence.v0_1",
    "/contract_id",
    "mobile_edge.result.invalid_contract",
    errors,
  );
  expectLiteral(
    value.result_version,
    "0.1",
    "/result_version",
    "mobile_edge.result.invalid_version",
    errors,
  );
  expectRef(value.result_ref, "/result_ref", "mobile_edge.result.invalid_ref", errors);
  expectRef(
    value.lease_ref,
    "/lease_ref",
    "mobile_edge.result.invalid_lease_ref",
    errors,
  );
  expectRef(
    value.packet_ref,
    "/packet_ref",
    "mobile_edge.result.invalid_packet_ref",
    errors,
  );
  expectRef(
    value.device_ref,
    "/device_ref",
    "mobile_edge.result.invalid_device_ref",
    errors,
  );
  expectRef(
    value.owner_ref,
    "/owner_ref",
    "mobile_edge.result.invalid_owner_ref",
    errors,
  );
  expectRef(
    value.tenant_ref,
    "/tenant_ref",
    "mobile_edge.result.invalid_tenant_ref",
    errors,
  );
  expectRef(
    value.operator_ref,
    "/operator_ref",
    "mobile_edge.result.invalid_operator_ref",
    errors,
  );
  expectRef(
    value.session_ref,
    "/session_ref",
    "mobile_edge.result.invalid_session_ref",
    errors,
  );
  expectDigest(
    value.manifest_digest,
    "/manifest_digest",
    "mobile_edge.result.invalid_manifest_digest",
    errors,
  );
  expectDigest(
    value.policy_decision_digest,
    "/policy_decision_digest",
    "mobile_edge.result.invalid_policy_digest",
    errors,
  );
  expectDigest(
    value.model_digest,
    "/model_digest",
    "mobile_edge.result.invalid_model_digest",
    errors,
  );
  expectDigest(
    value.runtime_digest,
    "/runtime_digest",
    "mobile_edge.result.invalid_runtime_digest",
    errors,
  );
  expectUniqueStrings(
    value.input_refs,
    expectRef,
    "/input_refs",
    "mobile_edge.result.invalid_input_ref",
    errors,
  );
  expectRef(
    value.result_destination_ref,
    "/result_destination_ref",
    "mobile_edge.result.invalid_destination_ref",
    errors,
  );
  expectEnum(
    value.egress,
    new Set(["local_only", "approved_relay"]),
    "/egress",
    "mobile_edge.result.invalid_egress",
    errors,
  );
  const statusValid = expectEnum(
    value.status,
    new Set(["completed", "failed", "denied", "cancelled", "expired"]),
    "/status",
    "mobile_edge.result.invalid_status",
    errors,
  );
  const startedValid = expectUtc(
    value.started_at,
    "/started_at",
    "mobile_edge.result.invalid_started_at",
    errors,
  );
  const finishedValid = expectUtc(
    value.finished_at,
    "/finished_at",
    "mobile_edge.result.invalid_finished_at",
    errors,
  );
  if (
    startedValid &&
    finishedValid &&
    Date.parse(value.finished_at as string) < Date.parse(value.started_at as string)
  )
    errors.push(
      error(
        "mobile_edge.result.invalid_time_window",
        "/finished_at",
        "Finish time cannot precede start.",
      ),
    );
  expectUniqueStrings(
    value.output_refs,
    expectRef,
    "/output_refs",
    "mobile_edge.result.invalid_output_ref",
    errors,
    0,
  );
  expectUniqueStrings(
    value.error_codes,
    expectSafeText,
    "/error_codes",
    "mobile_edge.result.invalid_error_code",
    errors,
    0,
  );
  if (
    statusValid &&
    value.status === "completed" &&
    (!Array.isArray(value.output_refs) || value.output_refs.length === 0)
  )
    errors.push(
      error(
        "mobile_edge.result.output_required",
        "/output_refs",
        "Completed result needs output evidence ref.",
      ),
    );
  if (
    statusValid &&
    value.status === "completed" &&
    Array.isArray(value.error_codes) &&
    value.error_codes.length > 0
  )
    errors.push(
      error(
        "mobile_edge.result.completed_error_forbidden",
        "/error_codes",
        "Completed result cannot contain error codes.",
      ),
    );
  if (
    statusValid &&
    value.status !== "completed" &&
    (!Array.isArray(value.error_codes) || value.error_codes.length === 0)
  )
    errors.push(
      error(
        "mobile_edge.result.error_required",
        "/error_codes",
        "Non-completed result needs bounded error code.",
      ),
    );
  if (
    exactKeys(
      value.resource_usage,
      ["duration_ms", "peak_ram_mb", "storage_written_mb", "retry_count"],
      "/resource_usage",
      "mobile_edge.result.resource_usage",
      errors,
    )
  ) {
    expectInteger(
      value.resource_usage.duration_ms,
      0,
      86_400_000,
      "/resource_usage/duration_ms",
      "mobile_edge.result.invalid_duration",
      errors,
    );
    expectInteger(
      value.resource_usage.peak_ram_mb,
      0,
      1_048_576,
      "/resource_usage/peak_ram_mb",
      "mobile_edge.result.invalid_ram",
      errors,
    );
    expectInteger(
      value.resource_usage.storage_written_mb,
      0,
      1_048_576,
      "/resource_usage/storage_written_mb",
      "mobile_edge.result.invalid_storage",
      errors,
    );
    expectInteger(
      value.resource_usage.retry_count,
      0,
      10,
      "/resource_usage/retry_count",
      "mobile_edge.result.invalid_retry",
      errors,
    );
  }
  if (
    exactKeys(
      value.verification,
      [
        "lease_signature_verified",
        "device_binding_verified",
        "policy_valid_at_start",
        "model_digest_verified",
        "runtime_digest_verified",
        "output_filter_passed",
      ],
      "/verification",
      "mobile_edge.result.verification",
      errors,
    )
  ) {
    expectLiteral(
      value.verification.lease_signature_verified,
      true,
      "/verification/lease_signature_verified",
      "mobile_edge.result.signature_verification_required",
      errors,
    );
    expectLiteral(
      value.verification.device_binding_verified,
      true,
      "/verification/device_binding_verified",
      "mobile_edge.result.device_binding_required",
      errors,
    );
    expectLiteral(
      value.verification.policy_valid_at_start,
      true,
      "/verification/policy_valid_at_start",
      "mobile_edge.result.policy_verification_required",
      errors,
    );
    expectLiteral(
      value.verification.model_digest_verified,
      true,
      "/verification/model_digest_verified",
      "mobile_edge.result.model_verification_required",
      errors,
    );
    expectLiteral(
      value.verification.runtime_digest_verified,
      true,
      "/verification/runtime_digest_verified",
      "mobile_edge.result.runtime_verification_required",
      errors,
    );
    if (typeof value.verification.output_filter_passed !== "boolean")
      errors.push(
        error(
          "mobile_edge.result.invalid_output_filter",
          "/verification/output_filter_passed",
          "Expected boolean.",
        ),
      );
    if (
      value.status === "completed" &&
      value.verification.output_filter_passed !== true
    )
      errors.push(
        error(
          "mobile_edge.result.output_filter_required",
          "/verification/output_filter_passed",
          "Completed result requires output filter pass.",
        ),
      );
  }
  expectUniqueStrings(
    value.evidence_refs,
    expectRef,
    "/evidence_refs",
    "mobile_edge.result.invalid_evidence_ref",
    errors,
  );
  validateSignatureShape(value.signature, "/signature", "mobile_edge.result", errors);
  expectLiteral(
    value.publication_performed,
    false,
    "/publication_performed",
    "mobile_edge.result.publication_forbidden",
    errors,
  );
  expectEmptySideEffects(value.side_effects, "/side_effects", errors);
  return errors.length === 0
    ? success(value as unknown as MobileResultEvidence)
    : failure(errors);
}

export function canonicalizeMobileCapabilityManifestPayload(
  manifest: MobileCapabilityManifest,
): string {
  const { manifest_digest: _digest, ...payload } = manifest;
  return canonicalizeJson(payload as unknown as JsonValue);
}

export function canonicalizeMobilePolicyDecisionPayload(
  decision: MobilePolicyDecision,
): string {
  const { decision_digest: _digest, ...payload } = decision;
  return canonicalizeJson(payload as unknown as JsonValue);
}

function canonicalizeSignedPayload(
  value: { signature: MobileEdgeSignature } & Record<string, unknown>,
): string {
  const { signature, ...payload } = value;
  return canonicalizeJson({
    ...payload,
    signature_metadata: {
      algorithm: signature.algorithm,
      key_ref: signature.key_ref,
      key_version: signature.key_version,
    },
  } as unknown as JsonValue);
}

export function canonicalizeMobileWorkloadLeasePayload(
  lease: MobileSignedWorkloadLease,
): string {
  return canonicalizeSignedPayload(lease);
}

export function canonicalizeMobileLeaseStatusPayload(
  status: MobileLeaseStatusEvidence,
): string {
  return canonicalizeSignedPayload(status);
}

export function canonicalizeMobileResultEvidencePayload(
  result: MobileResultEvidence,
): string {
  return canonicalizeSignedPayload(result);
}

async function hashCanonicalPayload(payload: string): Promise<MobileEdgeDigest> {
  const bytes = getTextEncoder().encode(payload);
  const digest = await getCrypto().subtle.digest("SHA-256", bytes);
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

export function hashMobileCapabilityManifestPayload(
  manifest: MobileCapabilityManifest,
): Promise<MobileEdgeDigest> {
  return hashCanonicalPayload(canonicalizeMobileCapabilityManifestPayload(manifest));
}

export function hashMobilePolicyDecisionPayload(
  decision: MobilePolicyDecision,
): Promise<MobileEdgeDigest> {
  return hashCanonicalPayload(canonicalizeMobilePolicyDecisionPayload(decision));
}

export function hashMobileWorkloadLeasePayload(
  lease: MobileSignedWorkloadLease,
): Promise<MobileEdgeDigest> {
  return hashCanonicalPayload(canonicalizeMobileWorkloadLeasePayload(lease));
}

export function hashMobileLeaseStatusPayload(
  status: MobileLeaseStatusEvidence,
): Promise<MobileEdgeDigest> {
  return hashCanonicalPayload(canonicalizeMobileLeaseStatusPayload(status));
}

export function hashMobileResultEvidencePayload(
  result: MobileResultEvidence,
): Promise<MobileEdgeDigest> {
  return hashCanonicalPayload(canonicalizeMobileResultEvidencePayload(result));
}

async function verifyEd25519Evidence(
  signature: MobileEdgeSignature,
  canonicalPayload: string,
  trustKeyInput: unknown,
  authorityTime: string,
  code: string,
): Promise<MobileEdgeValidationError[]> {
  const errors: MobileEdgeValidationError[] = [];
  const trustSnapshot = snapshotInput(trustKeyInput);
  if (!trustSnapshot.ok) return trustSnapshot.errors;
  if (
    !exactKeys(
      trustSnapshot.value,
      [
        "key_ref",
        "key_version",
        "public_key_spki_base64url",
        "valid_from",
        "valid_until",
        "revoked",
      ],
      "/trust_key",
      `${code}.trust_key`,
      errors,
    )
  )
    return errors;
  const trust = trustSnapshot.value as unknown as MobileLeaseTrustKey;
  expectRef(
    trust.key_ref,
    "/trust_key/key_ref",
    `${code}.invalid_trust_key_ref`,
    errors,
  );
  expectSafeText(
    trust.key_version,
    "/trust_key/key_version",
    `${code}.invalid_trust_key_version`,
    errors,
  );
  const validFrom = expectUtc(
    trust.valid_from,
    "/trust_key/valid_from",
    `${code}.invalid_trust_key_window`,
    errors,
  );
  const validUntil = expectUtc(
    trust.valid_until,
    "/trust_key/valid_until",
    `${code}.invalid_trust_key_window`,
    errors,
  );
  if (typeof trust.revoked !== "boolean")
    errors.push(
      error(
        `${code}.invalid_trust_key_state`,
        "/trust_key/revoked",
        "Expected boolean.",
      ),
    );
  if (
    trust.key_ref !== signature.key_ref ||
    trust.key_version !== signature.key_version
  )
    errors.push(
      error(
        `${code}.signature_key_mismatch`,
        "/signature/key_ref",
        "Signature key ref and version must match trusted key.",
      ),
    );
  if (trust.revoked)
    errors.push(
      error(
        `${code}.trust_key_revoked`,
        "/trust_key/revoked",
        "Revoked key cannot verify evidence.",
      ),
    );
  if (!base64UrlPattern.test(trust.public_key_spki_base64url))
    errors.push(
      error(
        `${code}.invalid_public_key`,
        "/trust_key/public_key_spki_base64url",
        "Expected canonical base64url SPKI public key.",
      ),
    );
  if (
    validFrom &&
    validUntil &&
    (Date.parse(trust.valid_until) <= Date.parse(trust.valid_from) ||
      Date.parse(authorityTime) < Date.parse(trust.valid_from) ||
      Date.parse(authorityTime) >= Date.parse(trust.valid_until))
  )
    errors.push(
      error(
        `${code}.trust_key_inactive`,
        "/trust_key/valid_until",
        "Trusted key must be active at evidence authority time.",
      ),
    );
  try {
    const payloadDigest = await hashCanonicalPayload(canonicalPayload);
    if (payloadDigest !== signature.signed_payload_digest)
      errors.push(
        error(
          `${code}.signed_payload_digest_mismatch`,
          "/signature/signed_payload_digest",
          "Signed payload digest does not match canonical payload.",
        ),
      );
    if (errors.length > 0) return errors;
    const key = await getCrypto().subtle.importKey(
      "spki",
      decodeBase64Url(trust.public_key_spki_base64url),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const verified = await getCrypto().subtle.verify(
      { name: "Ed25519" },
      key,
      decodeBase64Url(signature.signature_base64url),
      getTextEncoder().encode(canonicalPayload),
    );
    if (!verified)
      errors.push(
        error(
          `${code}.signature_invalid`,
          "/signature/signature_base64url",
          "Ed25519 signature verification failed.",
        ),
      );
  } catch {
    errors.push(
      error(
        `${code}.signature_verification_failed`,
        "/signature",
        "Signature could not be verified.",
      ),
    );
  }
  return errors;
}

export async function verifyMobileWorkloadLeaseSignature(
  input: unknown,
  trustKey: unknown,
): Promise<MobileEdgeValidationResult<MobileSignedWorkloadLease>> {
  const validated = validateMobileSignedWorkloadLease(input);
  if (!validated.ok) return validated;
  const value = validated.value;
  const errors = await verifyEd25519Evidence(
    value.signature,
    canonicalizeMobileWorkloadLeasePayload(value),
    trustKey,
    value.issued_at,
    "mobile_edge.lease",
  );
  return errors.length === 0 ? success(value) : failure(errors);
}

export async function verifyMobileLeaseStatusSignature(
  input: unknown,
  trustKey: unknown,
): Promise<MobileEdgeValidationResult<MobileLeaseStatusEvidence>> {
  const validated = validateMobileLeaseStatusEvidence(input);
  if (!validated.ok) return validated;
  const value = validated.value;
  const errors = await verifyEd25519Evidence(
    value.signature,
    canonicalizeMobileLeaseStatusPayload(value),
    trustKey,
    value.observed_at,
    "mobile_edge.lease_status",
  );
  return errors.length === 0 ? success(value) : failure(errors);
}

export async function verifyMobileResultEvidenceSignature(
  input: unknown,
  trustKey: unknown,
): Promise<MobileEdgeValidationResult<MobileResultEvidence>> {
  const validated = validateMobileResultEvidence(input);
  if (!validated.ok) return validated;
  const value = validated.value;
  const errors = await verifyEd25519Evidence(
    value.signature,
    canonicalizeMobileResultEvidencePayload(value),
    trustKey,
    value.finished_at,
    "mobile_edge.result",
  );
  return errors.length === 0 ? success(value) : failure(errors);
}

export async function validateMobileEdgeContractChain(
  input: unknown,
  trustBundleInput: unknown,
  now: string,
): Promise<MobileEdgeValidationResult<MobileEdgeContractChain>> {
  const snapshot = snapshotInput(input);
  if (!snapshot.ok) return failure(snapshot.errors);
  const topErrors: MobileEdgeValidationError[] = [];
  if (
    !exactKeys(
      snapshot.value,
      [
        "manifest",
        "policy_decision",
        "workload_lease",
        "lease_status",
        "result_evidence",
      ],
      "",
      "mobile_edge.chain",
      topErrors,
    )
  )
    return failure(topErrors);
  const trustSnapshot = snapshotInput(trustBundleInput);
  if (!trustSnapshot.ok) return failure(trustSnapshot.errors);
  if (
    !exactKeys(
      trustSnapshot.value,
      ["lease_issuer", "device_result", "lease_status_head"],
      "/trust_bundle",
      "mobile_edge.chain.trust_bundle",
      topErrors,
    )
  )
    return failure(topErrors);
  const statusHead = trustSnapshot.value.lease_status_head;
  if (
    !exactKeys(
      statusHead,
      ["lease_ref", "status_ref", "sequence", "status", "observed_at", "evidence_ref"],
      "/trust_bundle/lease_status_head",
      "mobile_edge.chain.lease_status_head",
      topErrors,
    )
  )
    return failure(topErrors);
  expectRef(
    statusHead.lease_ref,
    "/trust_bundle/lease_status_head/lease_ref",
    "mobile_edge.chain.invalid_status_head_lease_ref",
    topErrors,
  );
  expectRef(
    statusHead.status_ref,
    "/trust_bundle/lease_status_head/status_ref",
    "mobile_edge.chain.invalid_status_head_ref",
    topErrors,
  );
  expectInteger(
    statusHead.sequence,
    0,
    Number.MAX_SAFE_INTEGER,
    "/trust_bundle/lease_status_head/sequence",
    "mobile_edge.chain.invalid_status_head_sequence",
    topErrors,
  );
  expectEnum(
    statusHead.status,
    new Set(["active", "cancelled", "revoked"]),
    "/trust_bundle/lease_status_head/status",
    "mobile_edge.chain.invalid_status_head_status",
    topErrors,
  );
  expectUtc(
    statusHead.observed_at,
    "/trust_bundle/lease_status_head/observed_at",
    "mobile_edge.chain.invalid_status_head_time",
    topErrors,
  );
  expectRef(
    statusHead.evidence_ref,
    "/trust_bundle/lease_status_head/evidence_ref",
    "mobile_edge.chain.invalid_status_head_evidence",
    topErrors,
  );
  if (topErrors.length > 0) return failure(topErrors);
  const trustBundle = trustSnapshot.value as unknown as MobileEdgeTrustBundle;
  const manifestResult = validateMobileCapabilityManifest(snapshot.value.manifest);
  const policyResult = validateMobilePolicyDecision(snapshot.value.policy_decision);
  const [leaseResult, leaseStatusResult, resultResult] = await Promise.all([
    verifyMobileWorkloadLeaseSignature(
      snapshot.value.workload_lease,
      trustBundle.lease_issuer,
    ),
    verifyMobileLeaseStatusSignature(
      snapshot.value.lease_status,
      trustBundle.lease_issuer,
    ),
    verifyMobileResultEvidenceSignature(
      snapshot.value.result_evidence,
      trustBundle.device_result,
    ),
  ]);
  const errors = [
    manifestResult,
    policyResult,
    leaseResult,
    leaseStatusResult,
    resultResult,
  ].flatMap((result) => (result.ok ? [] : result.errors));
  if (
    !expectUtc(
      now,
      "/validation_time",
      "mobile_edge.chain.invalid_validation_time",
      errors,
    )
  )
    return failure(errors);
  if (
    !manifestResult.ok ||
    !policyResult.ok ||
    !leaseResult.ok ||
    !leaseStatusResult.ok ||
    !resultResult.ok
  )
    return failure(errors);

  const manifest = manifestResult.value;
  const policy = policyResult.value;
  const lease = leaseResult.value;
  const leaseStatus = leaseStatusResult.value;
  const result = resultResult.value;
  const latestStatus = trustBundle.lease_status_head;
  try {
    const [manifestDigest, policyDigest] = await Promise.all([
      hashMobileCapabilityManifestPayload(manifest),
      hashMobilePolicyDecisionPayload(policy),
    ]);
    if (manifestDigest !== manifest.manifest_digest)
      errors.push(
        error(
          "mobile_edge.chain.manifest_content_digest_mismatch",
          "/manifest/manifest_digest",
          "Manifest digest must match canonical manifest content.",
        ),
      );
    if (policyDigest !== policy.decision_digest)
      errors.push(
        error(
          "mobile_edge.chain.policy_content_digest_mismatch",
          "/policy_decision/decision_digest",
          "Decision digest must match canonical policy-decision content.",
        ),
      );
  } catch {
    errors.push(
      error(
        "mobile_edge.chain.content_digest_failed",
        "",
        "Manifest or policy digest could not be verified.",
      ),
    );
  }
  const requireEqual = (
    left: unknown,
    right: unknown,
    path: string,
    code: string,
    message: string,
  ): void => {
    if (left !== right) errors.push(error(code, path, message));
  };
  requireEqual(
    policy.device_ref,
    manifest.device_ref,
    "/policy_decision/device_ref",
    "mobile_edge.chain.device_mismatch",
    "Policy device must match manifest.",
  );
  requireEqual(
    policy.owner_ref,
    manifest.owner_ref,
    "/policy_decision/owner_ref",
    "mobile_edge.chain.owner_mismatch",
    "Policy owner must match manifest.",
  );
  requireEqual(
    policy.tenant_ref,
    manifest.tenant_ref,
    "/policy_decision/tenant_ref",
    "mobile_edge.chain.tenant_mismatch",
    "Policy tenant must match manifest.",
  );
  requireEqual(
    policy.manifest_ref,
    manifest.manifest_ref,
    "/policy_decision/manifest_ref",
    "mobile_edge.chain.manifest_ref_mismatch",
    "Policy manifest ref must match manifest.",
  );
  requireEqual(
    policy.manifest_digest,
    manifest.manifest_digest,
    "/policy_decision/manifest_digest",
    "mobile_edge.chain.manifest_digest_mismatch",
    "Policy manifest digest must match manifest.",
  );
  requireEqual(
    lease.packet_ref,
    policy.packet_ref,
    "/workload_lease/packet_ref",
    "mobile_edge.chain.packet_mismatch",
    "Lease packet must match policy decision.",
  );
  requireEqual(
    lease.device_ref,
    manifest.device_ref,
    "/workload_lease/device_ref",
    "mobile_edge.chain.device_mismatch",
    "Lease device must match manifest.",
  );
  requireEqual(
    lease.owner_ref,
    policy.owner_ref,
    "/workload_lease/owner_ref",
    "mobile_edge.chain.owner_mismatch",
    "Lease owner must match policy decision.",
  );
  requireEqual(
    lease.tenant_ref,
    policy.tenant_ref,
    "/workload_lease/tenant_ref",
    "mobile_edge.chain.tenant_mismatch",
    "Lease tenant must match policy decision.",
  );
  requireEqual(
    lease.operator_ref,
    policy.operator_ref,
    "/workload_lease/operator_ref",
    "mobile_edge.chain.operator_mismatch",
    "Lease operator must match policy decision.",
  );
  requireEqual(
    lease.session_ref,
    policy.session_ref,
    "/workload_lease/session_ref",
    "mobile_edge.chain.session_mismatch",
    "Lease session must match policy decision.",
  );
  requireEqual(
    lease.manifest_ref,
    manifest.manifest_ref,
    "/workload_lease/manifest_ref",
    "mobile_edge.chain.manifest_ref_mismatch",
    "Lease manifest ref must match manifest.",
  );
  requireEqual(
    lease.manifest_digest,
    manifest.manifest_digest,
    "/workload_lease/manifest_digest",
    "mobile_edge.chain.manifest_digest_mismatch",
    "Lease manifest digest must match manifest.",
  );
  requireEqual(
    lease.policy_decision_ref,
    policy.decision_ref,
    "/workload_lease/policy_decision_ref",
    "mobile_edge.chain.policy_ref_mismatch",
    "Lease policy ref must match decision.",
  );
  requireEqual(
    lease.policy_decision_digest,
    policy.decision_digest,
    "/workload_lease/policy_decision_digest",
    "mobile_edge.chain.policy_digest_mismatch",
    "Lease policy digest must match decision.",
  );
  requireEqual(
    lease.approval_evidence_ref,
    policy.approval_evidence_ref,
    "/workload_lease/approval_evidence_ref",
    "mobile_edge.chain.approval_mismatch",
    "Lease approval evidence must match decision.",
  );
  requireEqual(
    leaseStatus.lease_ref,
    lease.lease_ref,
    "/lease_status/lease_ref",
    "mobile_edge.chain.lease_status_mismatch",
    "Lease status must bind signed lease.",
  );
  requireEqual(
    leaseStatus.cancellation_ref,
    lease.cancellation_ref,
    "/lease_status/cancellation_ref",
    "mobile_edge.chain.cancellation_ref_mismatch",
    "Lease status must bind cancellation ref.",
  );
  if (
    leaseStatus.lease_ref !== latestStatus.lease_ref ||
    leaseStatus.status_ref !== latestStatus.status_ref ||
    leaseStatus.sequence !== latestStatus.sequence ||
    leaseStatus.status !== latestStatus.status ||
    leaseStatus.observed_at !== latestStatus.observed_at ||
    !leaseStatus.evidence_refs.includes(latestStatus.evidence_ref)
  )
    errors.push(
      error(
        "mobile_edge.chain.stale_lease_status",
        "/lease_status/sequence",
        "Signed lease status must exactly match trusted latest-status head.",
      ),
    );
  requireEqual(
    result.lease_ref,
    lease.lease_ref,
    "/result_evidence/lease_ref",
    "mobile_edge.chain.lease_mismatch",
    "Result lease must match signed lease.",
  );
  requireEqual(
    result.packet_ref,
    lease.packet_ref,
    "/result_evidence/packet_ref",
    "mobile_edge.chain.packet_mismatch",
    "Result packet must match lease.",
  );
  requireEqual(
    result.device_ref,
    lease.device_ref,
    "/result_evidence/device_ref",
    "mobile_edge.chain.device_mismatch",
    "Result device must match lease.",
  );
  requireEqual(
    result.owner_ref,
    lease.owner_ref,
    "/result_evidence/owner_ref",
    "mobile_edge.chain.owner_mismatch",
    "Result owner must match lease.",
  );
  requireEqual(
    result.tenant_ref,
    lease.tenant_ref,
    "/result_evidence/tenant_ref",
    "mobile_edge.chain.tenant_mismatch",
    "Result tenant must match lease.",
  );
  requireEqual(
    result.operator_ref,
    lease.operator_ref,
    "/result_evidence/operator_ref",
    "mobile_edge.chain.operator_mismatch",
    "Result operator must match lease.",
  );
  requireEqual(
    result.session_ref,
    lease.session_ref,
    "/result_evidence/session_ref",
    "mobile_edge.chain.session_mismatch",
    "Result session must match lease.",
  );
  requireEqual(
    result.manifest_digest,
    lease.manifest_digest,
    "/result_evidence/manifest_digest",
    "mobile_edge.chain.manifest_digest_mismatch",
    "Result manifest digest must match lease.",
  );
  requireEqual(
    result.policy_decision_digest,
    lease.policy_decision_digest,
    "/result_evidence/policy_decision_digest",
    "mobile_edge.chain.policy_digest_mismatch",
    "Result policy digest must match lease.",
  );
  requireEqual(
    result.model_digest,
    lease.model_digest,
    "/result_evidence/model_digest",
    "mobile_edge.chain.model_digest_mismatch",
    "Result model digest must match lease.",
  );
  requireEqual(
    result.runtime_digest,
    lease.runtime_digest,
    "/result_evidence/runtime_digest",
    "mobile_edge.chain.runtime_digest_mismatch",
    "Result runtime digest must match lease.",
  );
  if (
    canonicalizeJson(result.input_refs as unknown as JsonValue) !==
    canonicalizeJson(lease.input_refs as unknown as JsonValue)
  )
    errors.push(
      error(
        "mobile_edge.chain.input_refs_mismatch",
        "/result_evidence/input_refs",
        "Result input refs must exactly match signed lease.",
      ),
    );
  requireEqual(
    result.result_destination_ref,
    lease.constraints.data_policy.result_destination_ref,
    "/result_evidence/result_destination_ref",
    "mobile_edge.chain.result_destination_mismatch",
    "Result destination must match signed lease.",
  );
  requireEqual(
    result.egress,
    lease.constraints.data_policy.egress,
    "/result_evidence/egress",
    "mobile_edge.chain.egress_mismatch",
    "Result egress must match signed lease.",
  );
  requireEqual(
    result.signature.key_ref,
    manifest.result_signing_key.key_ref,
    "/result_evidence/signature/key_ref",
    "mobile_edge.chain.result_key_mismatch",
    "Result signing key must match manifest.",
  );
  requireEqual(
    result.signature.key_version,
    manifest.result_signing_key.key_version,
    "/result_evidence/signature/key_version",
    "mobile_edge.chain.result_key_version_mismatch",
    "Result signing key version must match manifest.",
  );
  if (manifest.revoked || manifest.quarantined)
    errors.push(
      error(
        "mobile_edge.chain.device_revoked_or_quarantined",
        "/manifest/revoked",
        "Revoked or quarantined device cannot receive lease.",
      ),
    );
  if (leaseStatus.status !== "active")
    errors.push(
      error(
        "mobile_edge.chain.lease_revoked_or_cancelled",
        "/lease_status/status",
        "Revoked or cancelled lease is inactive.",
      ),
    );
  if (policy.decision !== "allow" || policy.lease_issuance !== "eligible")
    errors.push(
      error(
        "mobile_edge.chain.policy_not_eligible",
        "/policy_decision/decision",
        "Only eligible allow decision can bind lease.",
      ),
    );
  if (!policy.approved_model_digests.includes(lease.model_digest))
    errors.push(
      error(
        "mobile_edge.chain.model_not_approved",
        "/workload_lease/model_digest",
        "Lease model not approved by policy.",
      ),
    );
  if (!policy.approved_runtime_digests.includes(lease.runtime_digest))
    errors.push(
      error(
        "mobile_edge.chain.runtime_not_approved",
        "/workload_lease/runtime_digest",
        "Lease runtime not approved by policy.",
      ),
    );
  if (
    !policy.allowed_workload_classes.includes(lease.workload_class) ||
    !manifest.supported_workload_classes.includes(lease.workload_class)
  )
    errors.push(
      error(
        "mobile_edge.chain.workload_not_eligible",
        "/workload_lease/workload_class",
        "Workload class must be allowed and supported.",
      ),
    );
  if (
    canonicalizeJson(policy.constraints as unknown as JsonValue) !==
    canonicalizeJson(lease.constraints as unknown as JsonValue)
  )
    errors.push(
      error(
        "mobile_edge.chain.constraints_mismatch",
        "/workload_lease/constraints",
        "Lease constraints must exactly match policy decision.",
      ),
    );
  const cached = manifest.model_cache.some(
    (entry) =>
      entry.model_digest === lease.model_digest &&
      entry.runtime_digest === lease.runtime_digest,
  );
  if (!cached)
    errors.push(
      error(
        "mobile_edge.chain.model_not_cached",
        "/workload_lease/model_digest",
        "Exact model/runtime digest pair must be cached.",
      ),
    );
  if (
    !manifest.compute.runtimes.some(
      (runtime) => runtime.runtime_digest === lease.runtime_digest,
    )
  )
    errors.push(
      error(
        "mobile_edge.chain.runtime_not_advertised",
        "/workload_lease/runtime_digest",
        "Lease runtime must be advertised by current manifest.",
      ),
    );
  if (
    lease.constraints.resource_limits.max_ram_mb > manifest.compute.ram_budget_mb ||
    lease.constraints.resource_limits.max_storage_mb >
      manifest.compute.storage_budget_mb
  )
    errors.push(
      error(
        "mobile_edge.chain.resource_budget_exceeded",
        "/workload_lease/constraints/resource_limits",
        "Lease resources exceed manifest budget.",
      ),
    );
  if (
    lease.constraints.resource_limits.background === "os_scheduled" &&
    manifest.power.background_posture !== "os_scheduled"
  )
    errors.push(
      error(
        "mobile_edge.chain.background_not_eligible",
        "/manifest/power/background_posture",
        "Manifest background posture does not meet lease requirement.",
      ),
    );
  if (
    manifest.power.battery_percent <
      lease.constraints.resource_limits.battery_floor_percent ||
    (lease.constraints.resource_limits.charging_required && !manifest.power.charging) ||
    thermalRanks[manifest.power.thermal_state] >
      thermalRanks[lease.constraints.resource_limits.max_thermal_state]
  )
    errors.push(
      error(
        "mobile_edge.chain.power_not_eligible",
        "/manifest/power",
        "Current power or thermal state is ineligible.",
      ),
    );
  const network = lease.constraints.resource_limits.network;
  if (
    (network === "offline_only" && manifest.network.transport !== "offline") ||
    (network === "wifi_only" && manifest.network.transport !== "wifi") ||
    (network === "unmetered" && manifest.network.metered)
  )
    errors.push(
      error(
        "mobile_edge.chain.network_not_eligible",
        "/manifest/network",
        "Current network does not meet lease requirement.",
      ),
    );
  for (const requiredSensor of lease.constraints.data_policy.allowed_sensors) {
    const sensor = manifest.sensors.find((entry) => entry.sensor === requiredSensor);
    if (
      sensor === undefined ||
      sensor.os_permission !== "granted" ||
      !sensor.policy_allowed
    )
      errors.push(
        error(
          "mobile_edge.chain.sensor_not_eligible",
          "/manifest/sensors",
          `Sensor ${requiredSensor} lacks OS and policy permission.`,
        ),
      );
  }
  for (const obligation of lease.evidence_obligations) {
    if (!result.evidence_refs.includes(obligation))
      errors.push(
        error(
          "mobile_edge.chain.evidence_obligation_missing",
          "/result_evidence/evidence_refs",
          `Result evidence must satisfy signed obligation ${obligation}.`,
        ),
      );
  }
  const nowMs = Date.parse(now);
  if (Date.parse(result.finished_at) > nowMs)
    errors.push(
      error(
        "mobile_edge.chain.future_result_evidence",
        "/validation_time",
        "Validation time cannot precede result completion.",
      ),
    );
  if (
    Date.parse(lease.issued_at) < Date.parse(policy.evaluated_at) ||
    Date.parse(lease.expires_at) > Date.parse(policy.expires_at) ||
    Date.parse(lease.expires_at) > Date.parse(manifest.expires_at)
  )
    errors.push(
      error(
        "mobile_edge.chain.lease_window_outside_authority",
        "/workload_lease/expires_at",
        "Lease window must stay inside manifest and policy authority.",
      ),
    );
  if (
    Date.parse(result.started_at) < Date.parse(lease.not_before) ||
    Date.parse(result.finished_at) > Date.parse(lease.expires_at) ||
    Date.parse(result.started_at) < Date.parse(policy.evaluated_at) ||
    Date.parse(result.started_at) >= Date.parse(policy.expires_at) ||
    Date.parse(result.started_at) < Date.parse(manifest.observed_at) ||
    Date.parse(result.started_at) >= Date.parse(manifest.expires_at)
  )
    errors.push(
      error(
        "mobile_edge.chain.result_outside_lease_window",
        "/result_evidence/finished_at",
        "Result timing must stay inside lease window.",
      ),
    );
  if (
    Date.parse(leaseStatus.observed_at) > Date.parse(result.started_at) ||
    Date.parse(leaseStatus.expires_at) < Date.parse(result.finished_at) ||
    Date.parse(leaseStatus.observed_at) < Date.parse(lease.issued_at) ||
    Date.parse(leaseStatus.expires_at) > Date.parse(lease.expires_at)
  )
    errors.push(
      error(
        "mobile_edge.chain.lease_status_not_active_at_start",
        "/lease_status/expires_at",
        "Signed active lease status must cover full result execution.",
      ),
    );
  const limits = lease.constraints.resource_limits;
  const elapsedMs = Date.parse(result.finished_at) - Date.parse(result.started_at);
  if (
    elapsedMs !== result.resource_usage.duration_ms ||
    elapsedMs > limits.max_duration_ms ||
    result.resource_usage.duration_ms > limits.max_duration_ms ||
    result.resource_usage.peak_ram_mb > limits.max_ram_mb ||
    result.resource_usage.storage_written_mb > limits.max_storage_mb ||
    result.resource_usage.retry_count > limits.retry_limit
  )
    errors.push(
      error(
        "mobile_edge.chain.result_budget_exceeded",
        "/result_evidence/resource_usage",
        "Measured result timing and usage must match and stay inside signed lease budget.",
      ),
    );
  return errors.length === 0
    ? success({
        manifest,
        policy_decision: policy,
        workload_lease: lease,
        lease_status: leaseStatus,
        result_evidence: result,
      })
    : failure(errors);
}

function canonicalizeJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key] as JsonValue)}`)
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

type CryptoLike = {
  subtle: {
    digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
    importKey(
      format: "spki",
      keyData: Uint8Array,
      algorithm: { name: "Ed25519" },
      extractable: false,
      keyUsages: ["verify"],
    ): Promise<unknown>;
    verify(
      algorithm: { name: "Ed25519" },
      key: unknown,
      signature: Uint8Array,
      data: Uint8Array,
    ): Promise<boolean>;
  };
};

type TextEncoderLike = { encode(input: string): Uint8Array };

function getCrypto(): CryptoLike {
  const runtime = globalThis as unknown as { crypto?: CryptoLike };
  if (runtime.crypto === undefined)
    throw new TypeError("Mobile lease verification requires Web Crypto.");
  return runtime.crypto;
}

function getTextEncoder(): TextEncoderLike {
  const runtime = globalThis as unknown as { TextEncoder?: new () => TextEncoderLike };
  if (runtime.TextEncoder === undefined)
    throw new TypeError("Mobile lease verification requires TextEncoder.");
  return new runtime.TextEncoder();
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeBase64Url(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of value) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new TypeError("Invalid base64url value.");
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0)
    throw new TypeError("Non-canonical base64url value.");
  return new Uint8Array(bytes);
}
