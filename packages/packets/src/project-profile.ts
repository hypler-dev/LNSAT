export const projectProfileStatuses = [
  "draft",
  "indexed",
  "packet_ready",
  "sandbox_ready",
  "operator_ready",
  "fleet_ready",
  "archived",
] as const;

export type ProjectProfileStatus = (typeof projectProfileStatuses)[number];

export type ProjectRepoProfile = {
  id: string;
  path?: string;
  remote?: string;
  default_branch: string;
};

export type ProjectProfile = {
  project_id: string;
  display_name: string;
  owner: string;
  status: ProjectProfileStatus;
  source_refs: string[];
  repos: ProjectRepoProfile[];
  docs: {
    entrypoints: string[];
  };
  runtimes: {
    languages: string[];
    package_managers: string[];
    build_commands: string[];
    test_commands: string[];
  };
  resources: {
    services: string[];
    databases: string[];
    queues: string[];
    object_storage: string[];
    models: string[];
    domains: string[];
  };
  secrets: {
    refs_only: string[];
  };
  policies: {
    default_role: string;
    allowed_capabilities: string[];
    blocked_capabilities: string[];
    approval_required_for: string[];
  };
  notes?: string;
};

export type ProjectProfileValidationSeverity = "error";

export type ProjectProfileValidationErrorCode =
  | "project_profile.invalid_type"
  | "project_profile.unexpected_field"
  | "project_profile.missing_required_field"
  | "project_profile.invalid_field"
  | "project_profile.secret_value_embedded";

export type ProjectProfileValidationError = {
  code: ProjectProfileValidationErrorCode;
  path: string;
  message: string;
  severity: ProjectProfileValidationSeverity;
};

export type ProjectProfileValidationResult =
  | {
      ok: true;
      profile: ProjectProfile;
      errors: [];
    }
  | {
      ok: false;
      profile?: never;
      errors: ProjectProfileValidationError[];
    };

const allowedRootKeys = [
  "project_id",
  "display_name",
  "owner",
  "status",
  "source_refs",
  "repos",
  "docs",
  "runtimes",
  "resources",
  "secrets",
  "policies",
  "notes",
] as const;

const requiredRootKeys = allowedRootKeys.filter((key) => key !== "notes");
const allowedRootKeySet = new Set<string>(allowedRootKeys);
const projectStatusSet = new Set<string>(projectProfileStatuses);
const projectIdPattern = /^[a-z][a-z0-9_-]{2,63}$/;

export function validateProjectProfile(value: unknown): ProjectProfileValidationResult {
  const errors: ProjectProfileValidationError[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: [
        validationError(
          "project_profile.invalid_type",
          "",
          "Project profile must be a plain object.",
        ),
      ],
    };
  }

  errors.push(...findForbiddenSecretValueFields(value, ""));

  for (const key of Object.keys(value)) {
    if (!allowedRootKeySet.has(key)) {
      errors.push(
        validationError(
          "project_profile.unexpected_field",
          jsonPointer(key),
          `Unexpected project profile field '${key}'.`,
        ),
      );
    }
  }

  for (const key of requiredRootKeys) {
    if (!(key in value)) {
      errors.push(
        validationError(
          "project_profile.missing_required_field",
          jsonPointer(key),
          `Missing required field '${key}'.`,
        ),
      );
    }
  }

  requirePatternString(
    value.project_id,
    "project_id",
    projectIdPattern,
    "project_id must be a stable lowercase project id.",
    errors,
  );
  requireNonEmptyString(value.display_name, "display_name", errors);
  requireNonEmptyString(value.owner, "owner", errors);

  if (!isString(value.status) || !projectStatusSet.has(value.status)) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
        "/status",
        "status must be a known project onboarding state.",
      ),
    );
  }

  requireStringArray(value.source_refs, "source_refs", errors);
  validateRepos(value.repos, errors);
  validateDocs(value.docs, errors);
  validateRuntimes(value.runtimes, errors);
  validateResources(value.resources, errors);
  validateSecrets(value.secrets, errors);
  validatePolicies(value.policies, errors);

  if ("notes" in value && !isString(value.notes)) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
        "/notes",
        "notes must be a string when provided.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, profile: value as ProjectProfile, errors: [] };
}

function validateRepos(value: unknown, errors: ProjectProfileValidationError[]): void {
  const path = "/repos";
  if (!Array.isArray(value)) {
    errors.push(
      validationError("project_profile.invalid_field", path, "repos must be an array."),
    );
    return;
  }

  if (value.length < 1) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
        path,
        "repos must contain at least one repo profile.",
      ),
    );
  }

  value.forEach((repo, index) => {
    const repoPath = `${path}/${index}`;
    if (!isPlainObject(repo)) {
      errors.push(
        validationError(
          "project_profile.invalid_field",
          repoPath,
          "repo profile must be an object.",
        ),
      );
      return;
    }

    const allowedRepoKeys = new Set(["id", "path", "remote", "default_branch"]);
    for (const key of Object.keys(repo)) {
      if (!allowedRepoKeys.has(key)) {
        errors.push(
          validationError(
            "project_profile.unexpected_field",
            `${repoPath}/${escapeJsonPointerSegment(key)}`,
            `Unexpected repo field '${key}'.`,
          ),
        );
      }
    }

    requireNonEmptyString(repo.id, `repos.${index}.id`, errors);
    requireNonEmptyString(repo.default_branch, `repos.${index}.default_branch`, errors);

    if (!isNonEmptyString(repo.path) && !isNonEmptyString(repo.remote)) {
      errors.push(
        validationError(
          "project_profile.invalid_field",
          repoPath,
          "repo profile must include a repo path or remote.",
        ),
      );
    }

    if ("path" in repo && !isNonEmptyString(repo.path)) {
      errors.push(
        validationError(
          "project_profile.invalid_field",
          `${repoPath}/path`,
          "repo path must be a non-empty string when provided.",
        ),
      );
    }

    if ("remote" in repo && !isNonEmptyString(repo.remote)) {
      errors.push(
        validationError(
          "project_profile.invalid_field",
          `${repoPath}/remote`,
          "repo remote must be a non-empty string when provided.",
        ),
      );
    }
  });
}

function validateDocs(value: unknown, errors: ProjectProfileValidationError[]): void {
  validateObjectWithStringArrays(value, "docs", ["entrypoints"], errors);
}

function validateRuntimes(
  value: unknown,
  errors: ProjectProfileValidationError[],
): void {
  validateObjectWithStringArrays(
    value,
    "runtimes",
    ["languages", "package_managers", "build_commands", "test_commands"],
    errors,
  );
}

function validateResources(
  value: unknown,
  errors: ProjectProfileValidationError[],
): void {
  validateObjectWithStringArrays(
    value,
    "resources",
    ["services", "databases", "queues", "object_storage", "models", "domains"],
    errors,
  );
}

function validateSecrets(
  value: unknown,
  errors: ProjectProfileValidationError[],
): void {
  validateObjectWithStringArrays(value, "secrets", ["refs_only"], errors);
}

function validatePolicies(
  value: unknown,
  errors: ProjectProfileValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
        "/policies",
        "policies must be an object.",
      ),
    );
    return;
  }

  const allowedKeys = new Set([
    "default_role",
    "allowed_capabilities",
    "blocked_capabilities",
    "approval_required_for",
  ]);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        validationError(
          "project_profile.unexpected_field",
          `/policies/${escapeJsonPointerSegment(key)}`,
          `Unexpected policies field '${key}'.`,
        ),
      );
    }
  }

  requireNonEmptyString(value.default_role, "policies.default_role", errors);
  requireStringArray(
    value.allowed_capabilities,
    "policies.allowed_capabilities",
    errors,
  );
  requireStringArray(
    value.blocked_capabilities,
    "policies.blocked_capabilities",
    errors,
  );
  requireStringArray(
    value.approval_required_for,
    "policies.approval_required_for",
    errors,
  );
}

function validateObjectWithStringArrays(
  value: unknown,
  label: string,
  keys: string[],
  errors: ProjectProfileValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
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
          "project_profile.unexpected_field",
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
          "project_profile.missing_required_field",
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
  errors: ProjectProfileValidationError[],
): void {
  if (!isString(value) || !pattern.test(value)) {
    errors.push(
      validationError("project_profile.invalid_field", jsonPointer(label), message),
    );
  }
}

function requireNonEmptyString(
  value: unknown,
  label: string,
  errors: ProjectProfileValidationError[],
): void {
  if (!isNonEmptyString(value)) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
        jsonPointer(label),
        `${label} must be a non-empty string.`,
      ),
    );
  }
}

function requireStringArray(
  value: unknown,
  label: string,
  errors: ProjectProfileValidationError[],
): void {
  const path = jsonPointer(label);
  if (!Array.isArray(value)) {
    errors.push(
      validationError(
        "project_profile.invalid_field",
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
          "project_profile.invalid_field",
          `${path}/${index}`,
          `${label} must contain only non-empty strings.`,
        ),
      );
    }
  });
}

function findForbiddenSecretValueFields(
  value: Record<string, unknown>,
  path: string,
): ProjectProfileValidationError[] {
  const errors: ProjectProfileValidationError[] = [];

  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}/${escapeJsonPointerSegment(key)}`;
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes("secret_value") ||
      (path.startsWith("/secrets") && normalizedKey === "value")
    ) {
      errors.push(
        validationError(
          "project_profile.secret_value_embedded",
          itemPath,
          "Project profile secrets must use references only.",
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
  code: ProjectProfileValidationErrorCode,
  path: string,
  message: string,
): ProjectProfileValidationError {
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
