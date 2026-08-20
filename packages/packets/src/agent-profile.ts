export const agentProfileRoles = [
  "observer",
  "local_reviewer",
  "code_contributor",
  "ops_assistant",
  "infra_admin_agent",
  "workflow_worker",
] as const;

export const agentProfileStatuses = ["draft", "active", "paused", "archived"] as const;

export type AgentProfileRole = (typeof agentProfileRoles)[number];
export type AgentProfileStatus = (typeof agentProfileStatuses)[number];

export type AgentProfile = {
  actor_id: string;
  display_name: string;
  provider: string;
  model_or_client: string;
  role: AgentProfileRole;
  status: AgentProfileStatus;
  source_refs: string[];
  projects_allowed: string[];
  capabilities: {
    allow: string[];
    block: string[];
  };
  budgets: {
    token_limit: number;
    cost_usd: number;
    runtime_seconds: number;
  };
  session: {
    ttl_seconds: number;
    requires_human_owner: boolean;
  };
  approval: {
    required_for: string[];
  };
  output_contract: {
    required_sections: string[];
    forbidden_actions: string[];
  };
  notes?: string;
};

export type AgentProfileValidationSeverity = "error";

export type AgentProfileValidationErrorCode =
  | "agent_profile.invalid_type"
  | "agent_profile.unexpected_field"
  | "agent_profile.missing_required_field"
  | "agent_profile.invalid_field"
  | "agent_profile.secret_value_embedded"
  | "agent_profile.capability_conflict";

export type AgentProfileValidationError = {
  code: AgentProfileValidationErrorCode;
  path: string;
  message: string;
  severity: AgentProfileValidationSeverity;
};

export type AgentProfileValidationResult =
  | {
      ok: true;
      profile: AgentProfile;
      errors: [];
    }
  | {
      ok: false;
      profile?: never;
      errors: AgentProfileValidationError[];
    };

const allowedRootKeys = [
  "actor_id",
  "display_name",
  "provider",
  "model_or_client",
  "role",
  "status",
  "source_refs",
  "projects_allowed",
  "capabilities",
  "budgets",
  "session",
  "approval",
  "output_contract",
  "notes",
] as const;

const requiredRootKeys = allowedRootKeys.filter((key) => key !== "notes");
const allowedRootKeySet = new Set<string>(allowedRootKeys);
const agentRoleSet = new Set<string>(agentProfileRoles);
const agentStatusSet = new Set<string>(agentProfileStatuses);
const actorIdPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;

export function validateAgentProfile(value: unknown): AgentProfileValidationResult {
  const errors: AgentProfileValidationError[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: [
        validationError(
          "agent_profile.invalid_type",
          "",
          "Agent profile must be a plain object.",
        ),
      ],
    };
  }

  errors.push(...findForbiddenSecretValueFields(value, ""));

  for (const key of Object.keys(value)) {
    if (!allowedRootKeySet.has(key)) {
      errors.push(
        validationError(
          "agent_profile.unexpected_field",
          jsonPointer(key),
          `Unexpected agent profile field '${key}'.`,
        ),
      );
    }
  }

  for (const key of requiredRootKeys) {
    if (!(key in value)) {
      errors.push(
        validationError(
          "agent_profile.missing_required_field",
          jsonPointer(key),
          `Missing required field '${key}'.`,
        ),
      );
    }
  }

  requirePatternString(
    value.actor_id,
    "actor_id",
    actorIdPattern,
    "actor_id must be a stable actor id.",
    errors,
  );
  requireNonEmptyString(value.display_name, "display_name", errors);
  requireNonEmptyString(value.provider, "provider", errors);
  requireNonEmptyString(value.model_or_client, "model_or_client", errors);

  if (!isString(value.role) || !agentRoleSet.has(value.role)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/role",
        "role must be a known agent onboarding role.",
      ),
    );
  }

  if (!isString(value.status) || !agentStatusSet.has(value.status)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/status",
        "status must be a known agent onboarding state.",
      ),
    );
  }

  requireStringArray(value.source_refs, "source_refs", errors);
  requireNonEmptyStringArray(value.projects_allowed, "projects_allowed", errors);
  validateCapabilities(value.capabilities, errors);
  validateBudgets(value.budgets, errors);
  validateSession(value.session, errors);
  validateObjectWithStringArrays(value.approval, "approval", ["required_for"], errors);
  validateObjectWithStringArrays(
    value.output_contract,
    "output_contract",
    ["required_sections", "forbidden_actions"],
    errors,
  );

  if ("notes" in value && !isString(value.notes)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/notes",
        "notes must be a string when provided.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, profile: value as AgentProfile, errors: [] };
}

function validateCapabilities(
  value: unknown,
  errors: AgentProfileValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/capabilities",
        "capabilities must be an object.",
      ),
    );
    return;
  }

  const allowedKeys = new Set(["allow", "block"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        validationError(
          "agent_profile.unexpected_field",
          `/capabilities/${escapeJsonPointerSegment(key)}`,
          `Unexpected capabilities field '${key}'.`,
        ),
      );
    }
  }

  requireStringArray(value.allow, "capabilities.allow", errors);
  requireStringArray(value.block, "capabilities.block", errors);

  if (!Array.isArray(value.allow) || !Array.isArray(value.block)) {
    return;
  }

  const blocked = new Set(value.block.filter(isNonEmptyString));
  value.allow.forEach((capability, index) => {
    if (isNonEmptyString(capability) && blocked.has(capability)) {
      errors.push(
        validationError(
          "agent_profile.capability_conflict",
          `/capabilities/allow/${index}`,
          "capability cannot be both allowed and blocked.",
        ),
      );
    }
  });
}

function validateBudgets(value: unknown, errors: AgentProfileValidationError[]): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/budgets",
        "budgets must be an object.",
      ),
    );
    return;
  }

  const allowedKeys = new Set(["token_limit", "cost_usd", "runtime_seconds"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        validationError(
          "agent_profile.unexpected_field",
          `/budgets/${escapeJsonPointerSegment(key)}`,
          `Unexpected budgets field '${key}'.`,
        ),
      );
    }
  }

  requirePositiveInteger(value.token_limit, "budgets.token_limit", errors);
  requireNonNegativeNumber(value.cost_usd, "budgets.cost_usd", errors);
  requirePositiveInteger(value.runtime_seconds, "budgets.runtime_seconds", errors);
}

function validateSession(value: unknown, errors: AgentProfileValidationError[]): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/session",
        "session must be an object.",
      ),
    );
    return;
  }

  const allowedKeys = new Set(["ttl_seconds", "requires_human_owner"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        validationError(
          "agent_profile.unexpected_field",
          `/session/${escapeJsonPointerSegment(key)}`,
          `Unexpected session field '${key}'.`,
        ),
      );
    }
  }

  requirePositiveInteger(value.ttl_seconds, "session.ttl_seconds", errors);
  if (typeof value.requires_human_owner !== "boolean") {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        "/session/requires_human_owner",
        "session.requires_human_owner must be a boolean.",
      ),
    );
  }
}

function validateObjectWithStringArrays(
  value: unknown,
  label: string,
  keys: string[],
  errors: AgentProfileValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        jsonPointer(label),
        `${label} must be an object.`,
      ),
    );
    return;
  }

  const allowedKeys = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        validationError(
          "agent_profile.unexpected_field",
          `${jsonPointer(label)}/${escapeJsonPointerSegment(key)}`,
          `Unexpected ${label} field '${key}'.`,
        ),
      );
    }
  }

  for (const key of keys) {
    if (!(key in value)) {
      errors.push(
        validationError(
          "agent_profile.missing_required_field",
          jsonPointer(`${label}.${key}`),
          `Missing required field '${label}.${key}'.`,
        ),
      );
      continue;
    }

    requireStringArray(value[key], `${label}.${key}`, errors);
  }
}

function requirePatternString(
  value: unknown,
  label: string,
  pattern: RegExp,
  message: string,
  errors: AgentProfileValidationError[],
): void {
  if (!isString(value) || !pattern.test(value)) {
    errors.push(
      validationError("agent_profile.invalid_field", jsonPointer(label), message),
    );
  }
}

function requireNonEmptyString(
  value: unknown,
  label: string,
  errors: AgentProfileValidationError[],
): void {
  if (!isNonEmptyString(value)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        jsonPointer(label),
        `${label} must be a non-empty string.`,
      ),
    );
  }
}

function requireStringArray(
  value: unknown,
  label: string,
  errors: AgentProfileValidationError[],
): void {
  const path = jsonPointer(label);
  if (!Array.isArray(value)) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        path,
        `${label} must be an array.`,
      ),
    );
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(
        validationError(
          "agent_profile.invalid_field",
          `${path}/${index}`,
          `${label} must contain only non-empty strings.`,
        ),
      );
    }
  });
}

function requireNonEmptyStringArray(
  value: unknown,
  label: string,
  errors: AgentProfileValidationError[],
): void {
  requireStringArray(value, label, errors);
  if (Array.isArray(value) && value.length < 1) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        jsonPointer(label),
        `${label} must contain at least one entry.`,
      ),
    );
  }
}

function requirePositiveInteger(
  value: unknown,
  label: string,
  errors: AgentProfileValidationError[],
): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        jsonPointer(label),
        `${label} must be a positive integer.`,
      ),
    );
  }
}

function requireNonNegativeNumber(
  value: unknown,
  label: string,
  errors: AgentProfileValidationError[],
): void {
  if (typeof value !== "number" || value < 0) {
    errors.push(
      validationError(
        "agent_profile.invalid_field",
        jsonPointer(label),
        `${label} must be a non-negative number.`,
      ),
    );
  }
}

function findForbiddenSecretValueFields(
  value: Record<string, unknown>,
  path: string,
): AgentProfileValidationError[] {
  const errors: AgentProfileValidationError[] = [];

  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}/${escapeJsonPointerSegment(key)}`;
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes("secret_value") ||
      normalizedKey.includes("api_key_value") ||
      normalizedKey.includes("token_value")
    ) {
      errors.push(
        validationError(
          "agent_profile.secret_value_embedded",
          itemPath,
          "Agent profile secrets must use references only.",
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
  code: AgentProfileValidationErrorCode,
  path: string,
  message: string,
): AgentProfileValidationError {
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

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}
