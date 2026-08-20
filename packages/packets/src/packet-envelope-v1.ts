import { canonicalizeJsonValue, type JsonValue, type PacketHash } from "./canonical.js";
import {
  createContractErrorV1,
  type ContractErrorEnvelopeV1,
  type ContractErrorV1,
} from "./contract-error-envelope-v1.js";
import { universalPacketTypes, type UniversalPacketType } from "./validator.js";

export const PACKET_ENVELOPE_V1_STATUS = "contract_only";

export const packetEnvelopeV1Contract = {
  contract_id: "lnsat.packet_envelope.v1_0",
  contract_version: "lnsat.contracts.v1_0",
  schema_id: "lnsat.packet_envelope.schema.v1_0",
  compatibility: {
    legacy_schema_id: "lnsat.packet_envelope.schema.v0_1",
    implicit_upgrade_allowed: false,
    implicit_downgrade_allowed: false,
  },
  canonicalization: {
    contract_id: "lnsat.canonical_json.v1_0",
    encoding: "utf-8",
    object_key_order: "ascending_utf16_code_units",
    array_order: "preserved",
    unicode_normalization: "none",
    number_domain: "safe_integers_only",
  },
  hashing: {
    contract_id: "lnsat.packet_hash.v1_0",
    algorithm: "sha-256",
    input: "canonical_utf8_bytes",
    output: "sha256:<lowercase_hex>",
  },
  side_effects: [],
} as const;

export type PacketEnvelopeV1 = {
  contract_version: "lnsat.contracts.v1_0";
  schema_id: "lnsat.packet_envelope.schema.v1_0";
  packet_id: string;
  packet_type: UniversalPacketType;
  actor_ref: string;
  session_ref: string;
  project_ref: string;
  intent: string;
  risk_level: number;
  source_refs: string[];
  resource_refs: string[];
  policy_profile_ref: string;
  permission_envelope: {
    allow: string[];
    block: string[];
  };
  budget: {
    tokens: number;
    runtime_seconds: number;
    cost_microusd: number;
    cpu_millicores: number;
    memory_bytes: number;
  };
  constraints: Record<string, JsonValue>;
  requires_approval: boolean;
  idempotency_key: string;
  created_at: string;
  expires_at: string;
};

export type PacketEnvelopeV1ErrorCode =
  | "packet_envelope.invalid_json"
  | "packet_envelope.invalid_type"
  | "packet_envelope.unexpected_field"
  | "packet_envelope.missing_required_field"
  | "packet_envelope.unsupported_contract_version"
  | "packet_envelope.unsupported_schema"
  | "packet_envelope.invalid_field"
  | "packet_envelope.noncanonical_collection"
  | "packet_envelope.secret_value_embedded"
  | "packet_envelope.invalid_time_window";

export type PacketEnvelopeV1Error = ContractErrorV1<PacketEnvelopeV1ErrorCode>;

export type PacketEnvelopeV1ValidationResult =
  | {
      ok: true;
      packet: PacketEnvelopeV1;
      errors: [];
      side_effects: [];
    }
  | (ContractErrorEnvelopeV1<PacketEnvelopeV1ErrorCode> & {
      packet: null;
      errors: PacketEnvelopeV1Error[];
    });

const rootKeys = [
  "contract_version",
  "schema_id",
  "packet_id",
  "packet_type",
  "actor_ref",
  "session_ref",
  "project_ref",
  "intent",
  "risk_level",
  "source_refs",
  "resource_refs",
  "policy_profile_ref",
  "permission_envelope",
  "budget",
  "constraints",
  "requires_approval",
  "idempotency_key",
  "created_at",
  "expires_at",
] as const;

const permissionEnvelopeKeys = ["allow", "block"] as const;
const budgetKeys = [
  "tokens",
  "runtime_seconds",
  "cost_microusd",
  "cpu_millicores",
  "memory_bytes",
] as const;

const rootKeySet = new Set<string>(rootKeys);
const permissionEnvelopeKeySet = new Set<string>(permissionEnvelopeKeys);
const budgetKeySet = new Set<string>(budgetKeys);
const packetTypeSet = new Set<string>(universalPacketTypes);
const packetIdPattern = /^pkt_[a-z0-9][a-z0-9_-]{7,63}$/u;
const idempotencyKeyPattern = /^idem_[a-z0-9][a-z0-9_-]{7,127}$/u;
const referencePattern = /^[a-z][a-z0-9+.-]*:[^\s\u0000-\u001f\u007f]{1,240}$/u;
const permissionPattern = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/u;
const isoDateTimePattern =
  /^(?!0000)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u;
const forbiddenCredentialFieldPattern =
  /^(?:(?:.*_)?(?:secret|password|token|api_key|private_key|credential)(?:_value)?)$/iu;

export function parsePacketEnvelopeV1Json(
  input: string,
): PacketEnvelopeV1ValidationResult {
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    return failure([
      error(
        "packet_envelope.invalid_json",
        "",
        "Packet envelope JSON must be syntactically valid.",
      ),
    ]);
  }
  return validatePacketEnvelopeV1(value);
}

export function validatePacketEnvelopeV1(
  value: unknown,
): PacketEnvelopeV1ValidationResult {
  if (!isPlainObject(value)) {
    return failure([
      error(
        "packet_envelope.invalid_type",
        "",
        "Packet envelope must be a plain object.",
      ),
    ]);
  }

  const errors: PacketEnvelopeV1Error[] = [];
  validateExactKeys(value, rootKeys, rootKeySet, "", errors);

  if (
    "contract_version" in value &&
    value.contract_version !== packetEnvelopeV1Contract.contract_version
  ) {
    errors.push(
      error(
        "packet_envelope.unsupported_contract_version",
        "/contract_version",
        "contract_version must be the exact supported v1 contract version.",
      ),
    );
  }

  if ("schema_id" in value && value.schema_id !== packetEnvelopeV1Contract.schema_id) {
    errors.push(
      error(
        "packet_envelope.unsupported_schema",
        "/schema_id",
        "schema_id must be the exact supported v1 packet envelope schema.",
      ),
    );
  }

  requirePatternString(
    value.packet_id,
    "/packet_id",
    packetIdPattern,
    68,
    "packet_id must use a canonical pkt_ identifier.",
    errors,
  );

  if (typeof value.packet_type !== "string" || !packetTypeSet.has(value.packet_type)) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        "/packet_type",
        "packet_type must be a known universal packet type.",
      ),
    );
  }

  requireReference(value.actor_ref, "/actor_ref", "identity", errors);
  requireReference(value.session_ref, "/session_ref", "session", errors);
  requireReference(value.project_ref, "/project_ref", "project", errors);
  requireBoundedWellFormedString(value.intent, "/intent", 1, 4096, errors);

  if (
    typeof value.risk_level !== "number" ||
    !Number.isSafeInteger(value.risk_level) ||
    value.risk_level < 0 ||
    value.risk_level > 8
  ) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        "/risk_level",
        "risk_level must be an integer from 0 through 8.",
      ),
    );
  }

  validateSortedUniqueReferences(value.source_refs, "/source_refs", errors);
  validateSortedUniqueReferences(value.resource_refs, "/resource_refs", errors);
  requireReference(value.policy_profile_ref, "/policy_profile_ref", "policy", errors);
  validatePermissionEnvelope(value.permission_envelope, errors);
  validateBudget(value.budget, errors);

  if (!isPlainObject(value.constraints)) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        "/constraints",
        "constraints must be a JSON object.",
      ),
    );
  } else {
    validateJsonObject(value.constraints, "/constraints", errors);
  }

  if (typeof value.requires_approval !== "boolean") {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        "/requires_approval",
        "requires_approval must be boolean.",
      ),
    );
  }

  requirePatternString(
    value.idempotency_key,
    "/idempotency_key",
    idempotencyKeyPattern,
    133,
    "idempotency_key must use a canonical idem_ identifier.",
    errors,
  );
  requireTimestamp(value.created_at, "/created_at", errors);
  requireTimestamp(value.expires_at, "/expires_at", errors);

  if (
    typeof value.created_at === "string" &&
    typeof value.expires_at === "string" &&
    isoDateTimePattern.test(value.created_at) &&
    isoDateTimePattern.test(value.expires_at)
  ) {
    const createdAt = parseCanonicalUtcTimestamp(value.created_at);
    const expiresAt = parseCanonicalUtcTimestamp(value.expires_at);
    if (createdAt === null || expiresAt === null || expiresAt <= createdAt) {
      errors.push(
        error(
          "packet_envelope.invalid_time_window",
          "/expires_at",
          "expires_at must be a valid UTC instant after created_at.",
        ),
      );
    }
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  return {
    ok: true,
    packet: value as PacketEnvelopeV1,
    errors: [],
    side_effects: [],
  };
}

export function canonicalizePacketEnvelopeV1(packet: PacketEnvelopeV1): string {
  const validation = validatePacketEnvelopeV1(packet);
  if (!validation.ok) {
    const firstError = validation.errors[0];
    throw new TypeError(
      firstError === undefined
        ? "Packet envelope is invalid for canonicalization."
        : `Packet envelope is invalid for canonicalization: ${firstError.code} at '${firstError.path}'.`,
    );
  }
  return canonicalizeJsonValue(validation.packet);
}

export async function hashPacketEnvelopeV1(
  packet: PacketEnvelopeV1,
): Promise<PacketHash> {
  const canonical = canonicalizePacketEnvelopeV1(packet);
  const digest = await getWebCrypto().subtle.digest(
    "SHA-256",
    new (getTextEncoder())().encode(canonical),
  );
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

function validatePermissionEnvelope(
  value: unknown,
  errors: PacketEnvelopeV1Error[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        "/permission_envelope",
        "permission_envelope must be an object.",
      ),
    );
    return;
  }

  validateExactKeys(
    value,
    permissionEnvelopeKeys,
    permissionEnvelopeKeySet,
    "/permission_envelope",
    errors,
  );
  validateSortedUniquePermissions(value.allow, "/permission_envelope/allow", errors);
  validateSortedUniquePermissions(value.block, "/permission_envelope/block", errors);

  if (Array.isArray(value.allow) && Array.isArray(value.block)) {
    const blocked = new Set(value.block.filter(isString));
    value.allow.forEach((permission, index) => {
      if (typeof permission === "string" && blocked.has(permission)) {
        errors.push(
          error(
            "packet_envelope.invalid_field",
            `/permission_envelope/allow/${index}`,
            "A permission cannot appear in both allow and block.",
          ),
        );
      }
    });
  }
}

function validateBudget(value: unknown, errors: PacketEnvelopeV1Error[]): void {
  if (!isPlainObject(value)) {
    errors.push(
      error("packet_envelope.invalid_field", "/budget", "budget must be an object."),
    );
    return;
  }

  validateExactKeys(value, budgetKeys, budgetKeySet, "/budget", errors);
  for (const key of budgetKeys) {
    if (
      typeof value[key] !== "number" ||
      !Number.isSafeInteger(value[key]) ||
      value[key] < 0 ||
      Object.is(value[key], -0)
    ) {
      errors.push(
        error(
          "packet_envelope.invalid_field",
          `/budget/${key}`,
          `budget.${key} must be a non-negative safe integer.`,
        ),
      );
    }
  }
}

function validateExactKeys(
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  allowedKeys: ReadonlySet<string>,
  path: string,
  errors: PacketEnvelopeV1Error[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(error("packet_envelope.unexpected_field", path, "Unexpected field."));
    }
  }

  for (const key of requiredKeys) {
    if (!(key in value)) {
      errors.push(
        error(
          "packet_envelope.missing_required_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Required field is missing.",
        ),
      );
    }
  }
}

function validateSortedUniqueReferences(
  value: unknown,
  path: string,
  errors: PacketEnvelopeV1Error[],
): void {
  validateSortedUniqueStrings(value, path, referencePattern, 256, errors);
}

function validateSortedUniquePermissions(
  value: unknown,
  path: string,
  errors: PacketEnvelopeV1Error[],
): void {
  validateSortedUniqueStrings(value, path, permissionPattern, 128, errors);
}

function validateSortedUniqueStrings(
  value: unknown,
  path: string,
  pattern: RegExp,
  maxLength: number,
  errors: PacketEnvelopeV1Error[],
): void {
  if (!Array.isArray(value)) {
    errors.push(
      error("packet_envelope.invalid_field", path, "Value must be an array."),
    );
    return;
  }

  value.forEach((item, index) => {
    if (
      typeof item !== "string" ||
      item.length === 0 ||
      item.length > maxLength ||
      !isWellFormedUnicode(item) ||
      !pattern.test(item)
    ) {
      errors.push(
        error(
          "packet_envelope.invalid_field",
          `${path}/${index}`,
          "Array entries must be bounded canonical strings.",
        ),
      );
    }
  });

  if (
    value.every(isString) &&
    value.some((item, index) => index > 0 && value[index - 1]! >= item)
  ) {
    errors.push(
      error(
        "packet_envelope.noncanonical_collection",
        path,
        "Set-like arrays must be sorted in ascending order without duplicates.",
      ),
    );
  }
}

function validateJsonObject(
  value: Record<string, unknown>,
  path: string,
  errors: PacketEnvelopeV1Error[],
): void {
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}/*`;
    if (!isWellFormedUnicode(key)) {
      errors.push(
        error(
          "packet_envelope.invalid_field",
          itemPath,
          "JSON object keys must contain well-formed Unicode.",
        ),
      );
    }
    if (forbiddenCredentialFieldPattern.test(key)) {
      errors.push(
        error(
          "packet_envelope.secret_value_embedded",
          itemPath,
          "Credential values are forbidden; use an explicit reference field.",
        ),
      );
    }
    validateJsonValue(item, itemPath, errors);
  }
}

function validateJsonValue(
  value: unknown,
  path: string,
  errors: PacketEnvelopeV1Error[],
): void {
  if (value === null || typeof value === "boolean") {
    return;
  }
  if (typeof value === "string") {
    if (!isWellFormedUnicode(value)) {
      errors.push(
        error(
          "packet_envelope.invalid_field",
          path,
          "JSON strings must contain well-formed Unicode.",
        ),
      );
    }
    return;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      errors.push(
        error(
          "packet_envelope.invalid_field",
          path,
          "Canonical packet JSON permits safe integers only.",
        ),
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonValue(item, `${path}/${index}`, errors));
    return;
  }
  if (isPlainObject(value)) {
    validateJsonObject(value, path, errors);
    return;
  }
  errors.push(
    error(
      "packet_envelope.invalid_field",
      path,
      "Value must belong to the canonical JSON domain.",
    ),
  );
}

function requireReference(
  value: unknown,
  path: string,
  requiredScheme: string,
  errors: PacketEnvelopeV1Error[],
): void {
  requirePatternString(
    value,
    path,
    referencePattern,
    256,
    `${path.slice(1)} must be a bounded ${requiredScheme}: reference.`,
    errors,
  );
  if (typeof value === "string" && !value.startsWith(`${requiredScheme}:`)) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        path,
        `${path.slice(1)} must use the ${requiredScheme}: scheme.`,
      ),
    );
  }
}

function requireTimestamp(
  value: unknown,
  path: string,
  errors: PacketEnvelopeV1Error[],
): void {
  requirePatternString(
    value,
    path,
    isoDateTimePattern,
    40,
    `${path.slice(1)} must be a canonical UTC timestamp.`,
    errors,
  );
  if (
    typeof value === "string" &&
    isoDateTimePattern.test(value) &&
    parseCanonicalUtcTimestamp(value) === null
  ) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        path,
        `${path.slice(1)} must identify a real UTC instant.`,
      ),
    );
  }
}

function requirePatternString(
  value: unknown,
  path: string,
  pattern: RegExp,
  maxLength: number,
  message: string,
  errors: PacketEnvelopeV1Error[],
): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    !isWellFormedUnicode(value) ||
    !pattern.test(value)
  ) {
    errors.push(error("packet_envelope.invalid_field", path, message));
  }
}

function requireBoundedWellFormedString(
  value: unknown,
  path: string,
  minLength: number,
  maxLength: number,
  errors: PacketEnvelopeV1Error[],
): void {
  if (
    typeof value !== "string" ||
    value.length < minLength ||
    value.length > maxLength ||
    !isWellFormedUnicode(value)
  ) {
    errors.push(
      error(
        "packet_envelope.invalid_field",
        path,
        "Value must be a bounded well-formed Unicode string.",
      ),
    );
  }
}

function failure(errors: PacketEnvelopeV1Error[]): PacketEnvelopeV1ValidationResult {
  return { ok: false, packet: null, errors, side_effects: [] };
}

function error(
  code: PacketEnvelopeV1ErrorCode,
  path: string,
  message: string,
): PacketEnvelopeV1Error {
  return createContractErrorV1(code, path, message);
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function parseCanonicalUtcTimestamp(value: string): number | null {
  const match = isoDateTimePattern.exec(value);
  if (match === null) return null;

  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) return null;

  const base = match[1];
  const fraction = (match[2] ?? "").padEnd(3, "0");
  return new Date(instant).toISOString() === `${base}.${fraction}Z` ? instant : null;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

type CryptoLike = {
  subtle: {
    digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
  };
};

type TextEncoderConstructorLike = new () => {
  encode(input: string): Uint8Array;
};

function getWebCrypto(): CryptoLike {
  const runtime = globalThis as unknown as { crypto?: CryptoLike };
  if (runtime.crypto === undefined) {
    throw new TypeError("Packet hash requires Web Crypto SHA-256 support.");
  }
  return runtime.crypto;
}

function getTextEncoder(): TextEncoderConstructorLike {
  const runtime = globalThis as unknown as {
    TextEncoder?: TextEncoderConstructorLike;
  };
  if (runtime.TextEncoder === undefined) {
    throw new TypeError("Packet hash requires TextEncoder support.");
  }
  return runtime.TextEncoder;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
