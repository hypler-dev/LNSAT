export const universalPacketTypes = [
  "ContextPacket",
  "CapabilityPacket",
  "ExecutionPacket",
  "EnvironmentPacket",
  "ResourcePacket",
  "ResultPacket",
  "AuditPacket",
  "PatchPacket",
  "SecretUsePacket",
  "NodeTelemetryPacket",
] as const;

export type UniversalPacketType = (typeof universalPacketTypes)[number];

export type UniversalPacket = {
  packet_id: string;
  packet_type: UniversalPacketType;
  version: "0.1";
  project_id: string;
  actor_id: string;
  session_id: string;
  intent: string;
  risk_level: number;
  source_refs: string[];
  resource_refs: string[];
  policy_profile: string;
  permission_envelope: {
    allow: string[];
    block: string[];
  };
  budget: {
    tokens: number;
    runtime_seconds: number;
    cost_usd: number;
    cpu: number;
    memory_mb: number;
  };
  constraints: Record<string, unknown>;
  requires_approval: boolean;
  ttl_seconds: number;
  created_at: string;
};

export type PacketValidationSeverity = "error";

export type PacketValidationErrorCode =
  | "packet.invalid_type"
  | "packet.unexpected_field"
  | "packet.missing_required_field"
  | "packet.invalid_field"
  | "packet.secret_value_embedded";

export type PacketValidationError = {
  code: PacketValidationErrorCode;
  path: string;
  message: string;
  severity: PacketValidationSeverity;
};

export type PacketValidationResult =
  | {
      ok: true;
      packet: UniversalPacket;
      errors: [];
    }
  | {
      ok: false;
      packet?: never;
      errors: PacketValidationError[];
    };

const allowedRootKeys = [
  "packet_id",
  "packet_type",
  "version",
  "project_id",
  "actor_id",
  "session_id",
  "intent",
  "risk_level",
  "source_refs",
  "resource_refs",
  "policy_profile",
  "permission_envelope",
  "budget",
  "constraints",
  "requires_approval",
  "ttl_seconds",
  "created_at",
] as const;

const budgetKeys = [
  "tokens",
  "runtime_seconds",
  "cost_usd",
  "cpu",
  "memory_mb",
] as const;

const permissionEnvelopeKeys = ["allow", "block"] as const;

const requiredRootKeys = new Set<string>(allowedRootKeys);
const allowedRootKeySet = new Set<string>(allowedRootKeys);
const budgetKeySet = new Set<string>(budgetKeys);
const packetTypeSet = new Set<string>(universalPacketTypes);
const permissionEnvelopeKeySet = new Set<string>(permissionEnvelopeKeys);
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const packetIdPattern = /^pkt_[a-z0-9][a-z0-9_-]{7,63}$/;
const sessionIdPattern = /^sess_[a-z0-9][a-z0-9_-]{7,63}$/;

export function validateUniversalPacket(value: unknown): PacketValidationResult {
  const errors: PacketValidationError[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: [
        validationError("packet.invalid_type", "", "Packet must be a plain object."),
      ],
    };
  }

  for (const key of Object.keys(value)) {
    if (!allowedRootKeySet.has(key)) {
      errors.push(
        validationError(
          "packet.unexpected_field",
          jsonPointer(key),
          `Unexpected root field '${key}'.`,
        ),
      );
    }
  }

  for (const key of requiredRootKeys) {
    if (!(key in value)) {
      errors.push(
        validationError(
          "packet.missing_required_field",
          jsonPointer(key),
          `Missing required field '${key}'.`,
        ),
      );
    }
  }

  requirePatternString(
    value.packet_id,
    "packet_id",
    packetIdPattern,
    "packet_id must use pkt_ prefix and stable lowercase id.",
    errors,
  );

  if (!isString(value.packet_type) || !packetTypeSet.has(value.packet_type)) {
    errors.push(
      validationError(
        "packet.invalid_field",
        "/packet_type",
        "packet_type must be a known universal packet type.",
      ),
    );
  }

  if (value.version !== "0.1") {
    errors.push(
      validationError("packet.invalid_field", "/version", "version must be 0.1."),
    );
  }

  requireNonEmptyString(value.project_id, "project_id", errors);
  requireNonEmptyString(value.actor_id, "actor_id", errors);
  requireNonEmptyString(value.intent, "intent", errors);
  requireNonEmptyString(value.policy_profile, "policy_profile", errors);

  requirePatternString(
    value.session_id,
    "session_id",
    sessionIdPattern,
    "session_id must use sess_ prefix and stable lowercase id.",
    errors,
  );

  if (
    typeof value.risk_level !== "number" ||
    !Number.isInteger(value.risk_level) ||
    value.risk_level < 0 ||
    value.risk_level > 8
  ) {
    errors.push(
      validationError(
        "packet.invalid_field",
        "/risk_level",
        "risk_level must be an integer from 0 through 8.",
      ),
    );
  }

  requireStringArray(value.source_refs, "source_refs", errors);
  requireStringArray(value.resource_refs, "resource_refs", errors);
  validatePermissionEnvelope(value.permission_envelope, errors);
  validateBudget(value.budget, errors);

  if (!isPlainObject(value.constraints)) {
    errors.push(
      validationError(
        "packet.invalid_field",
        "/constraints",
        "constraints must be an object.",
      ),
    );
  } else {
    errors.push(...findForbiddenSecretValueFields(value.constraints, "/constraints"));
  }

  if (typeof value.requires_approval !== "boolean") {
    errors.push(
      validationError(
        "packet.invalid_field",
        "/requires_approval",
        "requires_approval must be boolean.",
      ),
    );
  }

  if (
    typeof value.ttl_seconds !== "number" ||
    !Number.isInteger(value.ttl_seconds) ||
    value.ttl_seconds < 1
  ) {
    errors.push(
      validationError(
        "packet.invalid_field",
        "/ttl_seconds",
        "ttl_seconds must be a positive integer.",
      ),
    );
  }

  requirePatternString(
    value.created_at,
    "created_at",
    isoDateTimePattern,
    "created_at must be an ISO UTC timestamp.",
    errors,
  );

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, packet: value as UniversalPacket, errors: [] };
}

export const validateUniversalPacketShape = validateUniversalPacket;

function validatePermissionEnvelope(
  value: unknown,
  errors: PacketValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "packet.invalid_field",
        "/permission_envelope",
        "permission_envelope must be an object.",
      ),
    );
    return;
  }

  for (const key of Object.keys(value)) {
    if (!permissionEnvelopeKeySet.has(key)) {
      errors.push(
        validationError(
          "packet.unexpected_field",
          `/permission_envelope/${escapeJsonPointerSegment(key)}`,
          `Unexpected permission_envelope field '${key}'.`,
        ),
      );
    }
  }

  requireStringArray(value.allow, "permission_envelope.allow", errors);
  requireStringArray(value.block, "permission_envelope.block", errors);
}

function validateBudget(value: unknown, errors: PacketValidationError[]): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError("packet.invalid_field", "/budget", "budget must be an object."),
    );
    return;
  }

  for (const key of Object.keys(value)) {
    if (!budgetKeySet.has(key)) {
      errors.push(
        validationError(
          "packet.unexpected_field",
          `/budget/${escapeJsonPointerSegment(key)}`,
          `Unexpected budget field '${key}'.`,
        ),
      );
    }
  }

  requireNonNegativeInteger(value.tokens, "budget.tokens", errors);
  requireNonNegativeInteger(value.runtime_seconds, "budget.runtime_seconds", errors);
  requireNonNegativeNumber(value.cost_usd, "budget.cost_usd", errors);
  requireNonNegativeNumber(value.cpu, "budget.cpu", errors);
  requireNonNegativeInteger(value.memory_mb, "budget.memory_mb", errors);
}

function requirePatternString(
  value: unknown,
  label: string,
  pattern: RegExp,
  message: string,
  errors: PacketValidationError[],
): void {
  if (!isString(value) || !pattern.test(value)) {
    errors.push(validationError("packet.invalid_field", jsonPointer(label), message));
  }
}

function requireNonEmptyString(
  value: unknown,
  label: string,
  errors: PacketValidationError[],
): void {
  if (!isString(value) || value.length < 1) {
    errors.push(
      validationError(
        "packet.invalid_field",
        jsonPointer(label),
        `${label} must be a non-empty string.`,
      ),
    );
  }
}

function requireStringArray(
  value: unknown,
  label: string,
  errors: PacketValidationError[],
): void {
  const path = jsonPointer(label);
  if (!Array.isArray(value)) {
    errors.push(
      validationError("packet.invalid_field", path, `${label} must be an array.`),
    );
    return;
  }

  value.forEach((item, index) => {
    if (!isString(item) || item.length < 1) {
      errors.push(
        validationError(
          "packet.invalid_field",
          `${path}/${index}`,
          `${label} must contain only non-empty strings.`,
        ),
      );
    }
  });
}

function requireNonNegativeInteger(
  value: unknown,
  label: string,
  errors: PacketValidationError[],
): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    errors.push(
      validationError(
        "packet.invalid_field",
        jsonPointer(label),
        `${label} must be a non-negative integer.`,
      ),
    );
  }
}

function requireNonNegativeNumber(
  value: unknown,
  label: string,
  errors: PacketValidationError[],
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(
      validationError(
        "packet.invalid_field",
        jsonPointer(label),
        `${label} must be a non-negative number.`,
      ),
    );
  }
}

function findForbiddenSecretValueFields(
  value: Record<string, unknown>,
  path: string,
): PacketValidationError[] {
  const errors: PacketValidationError[] = [];

  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}/${escapeJsonPointerSegment(key)}`;

    if (key.toLowerCase().includes("secret_value")) {
      errors.push(
        validationError(
          "packet.secret_value_embedded",
          itemPath,
          "Packet constraints must not contain embedded secret values.",
        ),
      );
    }

    if (isPlainObject(item)) {
      errors.push(...findForbiddenSecretValueFields(item, itemPath));
    }
  }

  return errors;
}

function validationError(
  code: PacketValidationErrorCode,
  path: string,
  message: string,
): PacketValidationError {
  return { code, path, message, severity: "error" };
}

function jsonPointer(label: string): string {
  return `/${label
    .split(".")
    .map((segment) => escapeJsonPointerSegment(segment))
    .join("/")}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
