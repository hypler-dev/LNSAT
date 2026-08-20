export const GIT_SAFETY_REPO_ZONE_STATUS = "source_only";

export const gitSafetyRepoZoneContract = {
  contract_id: "lnsat.platform.git_safety_repo_zone.v0_1",
  authority: ["@lnsat/packets", "source-backed-git-safety-repo-zones"],
  repo_zone_version: "0.1",
  repo_zones: [
    "read_zone",
    "proposal_zone",
    "branch_write_zone",
    "protected_zone",
    "forbidden_destructive_operation",
  ],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_git_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RepoZone = (typeof gitSafetyRepoZoneContract.repo_zones)[number];

export type GitSafetyRepoZoneSourceInput = {
  source_ref: string;
  summary: string;
};

export type GitSafetyRepoZoneDefinitionInput = {
  zone: RepoZone;
  summary: string;
  allowed_operations: string[];
  denied_operations?: string[];
  policy_gate?: string | null;
  approval_required: boolean;
  rollback_expectation: string;
  source_refs: GitSafetyRepoZoneSourceInput[];
  live_git_execution_allowed?: false;
  side_effects?: [];
};

export type GitSafetyRepoZoneEvidence = {
  zone: RepoZone;
  summary: string;
  allowed_operations: string[];
  denied_operations: string[];
  policy_gate: string | null;
  approval_required: boolean;
  rollback_expectation: string;
  source_refs: string[];
  live_git_execution_allowed: false;
  side_effects: [];
};

export type GitSafetyRepoZoneMap = Record<RepoZone, GitSafetyRepoZoneEvidence>;

export type GitSafetyRepoZoneRequest = {
  repo_zone_version?: typeof gitSafetyRepoZoneContract.repo_zone_version;
  repo_zone_map?: Partial<
    Record<RepoZone, GitSafetyRepoZoneDefinitionInput | GitSafetyRepoZoneEvidence>
  >;
  source_refs?: GitSafetyRepoZoneSourceInput[];
  live_git_execution_allowed?: false;
  side_effects?: [];
};

export type GitSafetyRepoZoneErrorCode =
  | "git_safety.invalid_request"
  | "git_safety.unexpected_field"
  | "git_safety.invalid_repo_zone_version"
  | "git_safety.repo_zone_map_required"
  | "git_safety.unknown_repo_zone"
  | "git_safety.repo_zone_required"
  | "git_safety.invalid_repo_zone"
  | "git_safety.invalid_operation"
  | "git_safety.destructive_operation_forbidden"
  | "git_safety.protected_operation_requires_gate"
  | "git_safety.branch_write_requires_gate"
  | "git_safety.invalid_rollback_expectation"
  | "git_safety.invalid_source_ref"
  | "git_safety.live_git_execution_forbidden"
  | "git_safety.side_effects_forbidden";

export type GitSafetyRepoZoneError = {
  code: GitSafetyRepoZoneErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type GitSafetyRepoZoneContractEvidence = {
  contract_id: typeof gitSafetyRepoZoneContract.contract_id;
  repo_zone_version: typeof gitSafetyRepoZoneContract.repo_zone_version;
  repo_zone_map: GitSafetyRepoZoneMap;
  repo_zones: RepoZone[];
  allowed_git_operations: string[];
  denied_git_operations: string[];
  required_policy_gates: string[];
  approval_required_operations: string[];
  rollback_expectations: string[];
  source_refs: string[];
  live_git_execution_allowed: false;
  side_effects: [];
};

export type GitSafetyRepoZoneResult =
  | {
      ok: true;
      git_safety: GitSafetyRepoZoneContractEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      git_safety: null;
      errors: GitSafetyRepoZoneError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedGitSafetyRepoZoneRequest =
  | {
      ok: true;
      repo_zone_map: GitSafetyRepoZoneMap;
      source_refs: string[];
    }
  | {
      ok: false;
      errors: GitSafetyRepoZoneError[];
    };

const requestKeys = new Set([
  "repo_zone_version",
  "repo_zone_map",
  "source_refs",
  "live_git_execution_allowed",
  "side_effects",
]);
const zoneDefinitionKeys = new Set([
  "zone",
  "summary",
  "allowed_operations",
  "denied_operations",
  "policy_gate",
  "approval_required",
  "rollback_expectation",
  "source_refs",
  "live_git_execution_allowed",
  "side_effects",
]);
const sourceKeys = new Set(["source_ref", "summary"]);
const repoZones = new Set<RepoZone>(gitSafetyRepoZoneContract.repo_zones);
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const gitOperationPattern = /^git\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,5}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;
const destructiveGitPattern =
  /\b(reset_hard|reset\.hard|force_push|push_force|clean_force|clean\.force|checkout_force|checkout\.force|history_delete|history\.delete|branch_delete|branch\.delete|tag_delete|tag\.delete|rebase_force|rebase\.force|gc_prune|gc\.prune|filter_branch|filter\.branch|rm_rf|rm -rf)\b/i;
const protectedGitPattern =
  /\b(protected|main|master|release|merge|tag|push|branch_write|branch\.write|commit_create|commit\.create|stage|write)\b/i;

export const defaultGitSafetyRepoZoneMap = {
  read_zone: repoZone("read_zone", {
    summary: "read-only repository inspection over status, diffs, logs, and refs",
    allowed_operations: [
      "git.status.read",
      "git.diff.read",
      "git.log.read",
      "git.show.read",
      "git.refs.read",
    ],
    denied_operations: ["git.worktree.write", "git.branch.write"],
    policy_gate: null,
    approval_required: false,
    rollback_expectation: "read-only inspection has no rollback requirement",
  }),
  proposal_zone: repoZone("proposal_zone", {
    summary: "source-backed patch and branch plans without repo mutation",
    allowed_operations: [
      "git.patch.propose",
      "git.branch.plan",
      "git.commit.plan",
      "git.rollback.plan",
    ],
    denied_operations: ["git.stage.write", "git.commit.create"],
    policy_gate: null,
    approval_required: false,
    rollback_expectation: "proposal output must include base ref and rollback plan",
  }),
  branch_write_zone: repoZone("branch_write_zone", {
    summary: "non-protected branch write requests requiring Gateway approval",
    allowed_operations: [
      "git.branch.write.request",
      "git.stage.request",
      "git.commit.create.request",
      "git.push.branch.request",
    ],
    denied_operations: ["git.protected_branch.write", "git.force_push.write"],
    policy_gate: "repo.branch_write.approval",
    approval_required: true,
    rollback_expectation:
      "branch writes require base ref, changed file list, tests, and rollback pointer",
  }),
  protected_zone: repoZone("protected_zone", {
    summary: "protected branch, tag, merge, and release requests requiring approval",
    allowed_operations: [
      "git.protected_branch.request",
      "git.merge.request",
      "git.tag.request",
      "git.release.request",
    ],
    denied_operations: ["git.protected_branch.write", "git.main.write"],
    policy_gate: "repo.protected_operation.approval",
    approval_required: true,
    rollback_expectation:
      "protected operations require explicit policy decision, approval ref, and rollback owner",
  }),
  forbidden_destructive_operation: repoZone("forbidden_destructive_operation", {
    summary: "destructive Git history or filesystem operations denied by contract",
    allowed_operations: [],
    denied_operations: [
      "git.reset_hard.execute",
      "git.clean_force.execute",
      "git.force_push.write",
      "git.history.delete",
      "git.branch.delete",
      "git.tag.delete",
    ],
    policy_gate: null,
    approval_required: false,
    rollback_expectation:
      "destructive Git operations are denied before execution and require separate human runbook",
  }),
} satisfies Record<RepoZone, GitSafetyRepoZoneEvidence>;

export function createGitSafetyRepoZone(input: unknown = {}): GitSafetyRepoZoneResult {
  const normalized = normalizeGitSafetyRepoZoneRequest(input);

  if (!normalized.ok) {
    return failGitSafetyRepoZone(normalized.errors);
  }

  const zones = Object.values(normalized.repo_zone_map);
  return {
    ok: true,
    git_safety: {
      contract_id: gitSafetyRepoZoneContract.contract_id,
      repo_zone_version: gitSafetyRepoZoneContract.repo_zone_version,
      repo_zone_map: normalized.repo_zone_map,
      repo_zones: [...gitSafetyRepoZoneContract.repo_zones],
      allowed_git_operations: uniqueStrings(
        zones.flatMap((zone) => zone.allowed_operations),
      ),
      denied_git_operations: uniqueStrings(
        zones.flatMap((zone) => zone.denied_operations),
      ),
      required_policy_gates: uniqueStrings(
        zones
          .map((zone) => zone.policy_gate)
          .filter((gate): gate is string => typeof gate === "string"),
      ),
      approval_required_operations: uniqueStrings(
        zones
          .filter((zone) => zone.approval_required)
          .flatMap((zone) => zone.allowed_operations),
      ),
      rollback_expectations: uniqueStrings(
        zones.map((zone) => zone.rollback_expectation),
      ),
      source_refs: sourceRefs(normalized.source_refs),
      live_git_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeGitSafetyRepoZoneRequest(
  input: unknown,
): NormalizedGitSafetyRepoZoneRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        gitSafetyError(
          "git_safety.invalid_request",
          "",
          "Git safety repo-zone request must be an object.",
        ),
      ],
    };
  }

  const errors: GitSafetyRepoZoneError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        gitSafetyError(
          "git_safety.unexpected_field",
          jsonPointer(key),
          "Unexpected Git safety request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "repo_zone_version") &&
    input.repo_zone_version !== gitSafetyRepoZoneContract.repo_zone_version
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_repo_zone_version",
        "/repo_zone_version",
        "Git safety repo-zone version is unsupported.",
      ),
    );
  }

  const repoZoneMap =
    Object.hasOwn(input, "repo_zone_map") && input.repo_zone_map !== undefined
      ? normalizeRepoZoneMap(input.repo_zone_map, errors)
      : defaultGitSafetyRepoZoneMap;
  const refs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [];

  if (
    Object.hasOwn(input, "live_git_execution_allowed") &&
    input.live_git_execution_allowed !== false
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.live_git_execution_forbidden",
        "/live_git_execution_allowed",
        "Git safety contract cannot enable live Git execution.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.side_effects_forbidden",
        "/side_effects",
        "Git safety contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return { ok: true, repo_zone_map: repoZoneMap, source_refs: refs };
}

function normalizeRepoZoneMap(
  value: unknown,
  errors: GitSafetyRepoZoneError[],
): GitSafetyRepoZoneMap {
  if (!isPlainObject(value)) {
    errors.push(
      gitSafetyError(
        "git_safety.repo_zone_map_required",
        "/repo_zone_map",
        "Git safety contract requires a repo_zone_map object.",
      ),
    );
    return defaultGitSafetyRepoZoneMap;
  }

  for (const key of Object.keys(value)) {
    if (!repoZones.has(key as RepoZone)) {
      errors.push(
        gitSafetyError(
          "git_safety.unknown_repo_zone",
          `/repo_zone_map/${escapeJsonPointerSegment(key)}`,
          "Repo zone is unknown.",
        ),
      );
    }
  }

  const repoZoneMap = {} as GitSafetyRepoZoneMap;
  for (const zone of gitSafetyRepoZoneContract.repo_zones) {
    const definition = value[zone];
    const path = `/repo_zone_map/${zone}`;
    if (!isPlainObject(definition)) {
      errors.push(
        gitSafetyError(
          "git_safety.repo_zone_required",
          path,
          `Git safety contract requires ${zone} definition.`,
        ),
      );
      continue;
    }

    const evidence = normalizeRepoZoneDefinition(zone, definition, errors);
    if (evidence !== null) {
      repoZoneMap[zone] = evidence;
    }
  }

  return repoZoneMap;
}

function normalizeRepoZoneDefinition(
  expectedZone: RepoZone,
  definition: Record<string, unknown>,
  errors: GitSafetyRepoZoneError[],
): GitSafetyRepoZoneEvidence | null {
  const path = `/repo_zone_map/${expectedZone}`;
  for (const key of Object.keys(definition)) {
    if (!zoneDefinitionKeys.has(key)) {
      errors.push(
        gitSafetyError(
          "git_safety.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected repo zone definition field.",
        ),
      );
    }
  }

  if (definition.zone !== expectedZone) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_repo_zone",
        `${path}/zone`,
        "Repo zone map key and zone value must match.",
      ),
    );
  }

  if (typeof definition.summary !== "string" || !safeString(definition.summary)) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_repo_zone",
        `${path}/summary`,
        "Repo zone summary must be a safe non-secret string.",
      ),
    );
  }

  const allowedOperations = normalizeGitOperations(
    expectedZone,
    "allowed",
    definition.allowed_operations,
    `${path}/allowed_operations`,
    errors,
  );
  const deniedOperations = normalizeGitOperations(
    expectedZone,
    "denied",
    definition.denied_operations ?? [],
    `${path}/denied_operations`,
    errors,
  );
  const policyGate = definition.policy_gate;
  const approvalRequired = definition.approval_required;
  const rollbackExpectation = definition.rollback_expectation;
  const refs = normalizeSourceRefs(
    definition.source_refs,
    `${path}/source_refs`,
    errors,
  );

  if (
    (expectedZone === "branch_write_zone" || expectedZone === "protected_zone") &&
    (typeof policyGate !== "string" ||
      !policyGatePattern.test(policyGate) ||
      approvalRequired !== true)
  ) {
    errors.push(
      gitSafetyError(
        expectedZone === "branch_write_zone"
          ? "git_safety.branch_write_requires_gate"
          : "git_safety.protected_operation_requires_gate",
        `${path}/policy_gate`,
        "Branch write and protected repo zones require policy gate and approval.",
      ),
    );
  }

  if (
    expectedZone !== "branch_write_zone" &&
    expectedZone !== "protected_zone" &&
    Object.hasOwn(definition, "policy_gate") &&
    policyGate !== null &&
    policyGate !== undefined &&
    (typeof policyGate !== "string" || !policyGatePattern.test(policyGate))
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_repo_zone",
        `${path}/policy_gate`,
        "Repo zone policy_gate must be null or a safe policy gate string.",
      ),
    );
  }

  if (typeof approvalRequired !== "boolean") {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_repo_zone",
        `${path}/approval_required`,
        "Repo zone approval_required must be boolean.",
      ),
    );
  }

  if (typeof rollbackExpectation !== "string" || !safeString(rollbackExpectation)) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_rollback_expectation",
        `${path}/rollback_expectation`,
        "Repo zone rollback_expectation must be a safe non-secret string.",
      ),
    );
  }

  if (
    Object.hasOwn(definition, "live_git_execution_allowed") &&
    definition.live_git_execution_allowed !== false
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.live_git_execution_forbidden",
        `${path}/live_git_execution_allowed`,
        "Repo zone cannot enable live Git execution.",
      ),
    );
  }

  if (
    Object.hasOwn(definition, "side_effects") &&
    (!Array.isArray(definition.side_effects) || definition.side_effects.length !== 0)
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.side_effects_forbidden",
        `${path}/side_effects`,
        "Repo zone must preserve side_effects: [].",
      ),
    );
  }

  if (
    definition.zone === expectedZone &&
    typeof definition.summary === "string" &&
    safeString(definition.summary) &&
    typeof approvalRequired === "boolean" &&
    typeof rollbackExpectation === "string" &&
    safeString(rollbackExpectation) &&
    refs.length > 0
  ) {
    return {
      zone: expectedZone,
      summary: definition.summary,
      allowed_operations: allowedOperations,
      denied_operations: deniedOperations,
      policy_gate: typeof policyGate === "string" ? policyGate : null,
      approval_required: approvalRequired,
      rollback_expectation: rollbackExpectation,
      source_refs: refs,
      live_git_execution_allowed: false,
      side_effects: [],
    };
  }

  return null;
}

function normalizeGitOperations(
  zone: RepoZone,
  side: "allowed" | "denied",
  value: unknown,
  path: string,
  errors: GitSafetyRepoZoneError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_operation",
        path,
        "Git operations must be an array.",
      ),
    );
    return [];
  }

  if (
    side === "allowed" &&
    zone !== "forbidden_destructive_operation" &&
    value.length === 0
  ) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_operation",
        path,
        "Repo zone allowed_operations must be non-empty.",
      ),
    );
  }

  const operations: string[] = [];
  value.forEach((operation, index) => {
    const operationPath = `${path}/${index}`;
    if (typeof operation !== "string" || !safeGitOperation(operation)) {
      errors.push(
        gitSafetyError(
          "git_safety.invalid_operation",
          operationPath,
          "Git operation must be a safe capability string.",
        ),
      );
      return;
    }

    if (destructiveGitPattern.test(operation)) {
      if (zone !== "forbidden_destructive_operation" || side !== "denied") {
        errors.push(
          gitSafetyError(
            "git_safety.destructive_operation_forbidden",
            operationPath,
            "Destructive Git operations are forbidden by this contract.",
          ),
        );
        return;
      }
    }

    if (
      protectedGitPattern.test(operation) &&
      side === "allowed" &&
      zone !== "branch_write_zone" &&
      zone !== "protected_zone"
    ) {
      errors.push(
        gitSafetyError(
          "git_safety.protected_operation_requires_gate",
          operationPath,
          "Protected or write Git operations require gated repo zones.",
        ),
      );
      return;
    }

    operations.push(operation);
  });

  return uniqueStrings(operations);
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: GitSafetyRepoZoneError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      gitSafetyError(
        "git_safety.invalid_source_ref",
        path,
        "Git safety source_refs must be an array.",
      ),
    );
    return [];
  }

  const refs: string[] = [];
  value.forEach((source, index) => {
    const sourcePath = `${path}/${index}`;
    if (typeof source === "string" && safeString(source)) {
      refs.push(source);
      return;
    }

    if (!isPlainObject(source)) {
      errors.push(
        gitSafetyError(
          "git_safety.invalid_source_ref",
          sourcePath,
          "Git safety source ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          gitSafetyError(
            "git_safety.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected Git safety source ref field.",
          ),
        );
      }
    }

    if (typeof source.source_ref !== "string" || !safeString(source.source_ref)) {
      errors.push(
        gitSafetyError(
          "git_safety.invalid_source_ref",
          `${sourcePath}/source_ref`,
          "Git safety source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof source.summary !== "string" || !safeString(source.summary)) {
      errors.push(
        gitSafetyError(
          "git_safety.invalid_source_ref",
          `${sourcePath}/summary`,
          "Git safety source summary must be a safe non-secret string.",
        ),
      );
    }

    if (
      typeof source.source_ref === "string" &&
      typeof source.summary === "string" &&
      safeString(source.source_ref) &&
      safeString(source.summary)
    ) {
      refs.push(`${source.source_ref}: ${source.summary}`);
    }
  });

  return uniqueStrings(refs);
}

function repoZone(
  zone: RepoZone,
  input: Omit<
    GitSafetyRepoZoneEvidence,
    "zone" | "source_refs" | "live_git_execution_allowed" | "side_effects"
  >,
): GitSafetyRepoZoneEvidence {
  return {
    zone,
    summary: input.summary,
    allowed_operations: uniqueStrings(input.allowed_operations),
    denied_operations: uniqueStrings(input.denied_operations),
    policy_gate: input.policy_gate,
    approval_required: input.approval_required,
    rollback_expectation: input.rollback_expectation,
    source_refs: [`ticket:BP-0088: source-only ${zone} Git safety contract`],
    live_git_execution_allowed: false,
    side_effects: [],
  };
}

function sourceRefs(sourceRefsInput: string[]): string[] {
  return uniqueStrings([
    ...sourceRefsInput,
    ...gitSafetyRepoZoneContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function failGitSafetyRepoZone(
  errors: GitSafetyRepoZoneError[],
): GitSafetyRepoZoneResult {
  return {
    ok: false,
    git_safety: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function gitSafetyError(
  code: GitSafetyRepoZoneErrorCode,
  path: string,
  message: string,
): GitSafetyRepoZoneError {
  return { code, path, message, severity: "error" };
}

function safeGitOperation(value: string): boolean {
  return gitOperationPattern.test(value) && !secretLikePattern.test(value);
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !value.toLowerCase().includes("rm -rf")
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort();
}

function dedupeErrors(errors: GitSafetyRepoZoneError[]): GitSafetyRepoZoneError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function jsonPointer(label: string): string {
  return `/${escapeJsonPointerSegment(label)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
