export const CONTEXT_WORKING_SET_STATUS = "source_only";

export const contextWorkingSetContract = {
  contract_id: "lnsat.context.context_atom_working_set.v0_1",
  authority: ["@lnsat/packets", "source-backed-context-atoms"],
  working_set_version: "0.1",
  supported_consumers: [
    "coding_agent",
    "policy_engine",
    "audit_preview",
    "operator_handoff",
    "substrate_control",
  ],
  source_kinds: [
    "code",
    "docs",
    "ticket",
    "conversation",
    "runtime_signal",
    "policy",
    "audit",
    "platform",
  ],
  trust_levels: ["source_backed", "operator_supplied", "unverified"],
  freshness_values: ["current", "recent", "stale"],
  relevance_values: ["primary", "supporting", "constraint", "warning"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/CONTEXT_SYNTHESIS.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  live_collection_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type ContextWorkingSetConsumer =
  (typeof contextWorkingSetContract.supported_consumers)[number];

export type ContextAtomSourceKind =
  (typeof contextWorkingSetContract.source_kinds)[number];

export type ContextAtomTrustLevel =
  (typeof contextWorkingSetContract.trust_levels)[number];

export type ContextAtomFreshness =
  (typeof contextWorkingSetContract.freshness_values)[number];

export type ContextAtomRelevance =
  (typeof contextWorkingSetContract.relevance_values)[number];

export type ContextAtomInput = {
  atom_id: string;
  source_kind: ContextAtomSourceKind;
  source_ref: string;
  summary: string;
  trust_level: ContextAtomTrustLevel;
  freshness: ContextAtomFreshness;
  relevance: ContextAtomRelevance;
  captured_at?: string;
};

export type ContextAtomEvidence = ContextAtomInput & {
  cited: true;
};

export type ContextWorkingSetOutputLimits = {
  max_atoms: number;
  max_source_refs: number;
  max_summary_chars: number;
  max_atom_summary_chars: number;
};

export type ContextWorkingSetRequest = {
  request_id?: string;
  project_id: string;
  actor_id: string;
  objective: string;
  consumer: ContextWorkingSetConsumer;
  atoms: ContextAtomInput[];
  output_limits?: Partial<ContextWorkingSetOutputLimits>;
  created_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type ContextWorkingSetErrorCode =
  | "context_working_set.invalid_request"
  | "context_working_set.unexpected_field"
  | "context_working_set.invalid_request_id"
  | "context_working_set.invalid_project_id"
  | "context_working_set.invalid_actor_id"
  | "context_working_set.invalid_objective"
  | "context_working_set.invalid_consumer"
  | "context_working_set.invalid_created_at"
  | "context_working_set.atoms_required"
  | "context_working_set.invalid_atom"
  | "context_working_set.atom_uncited"
  | "context_working_set.atom_stale"
  | "context_working_set.invalid_output_limits"
  | "context_working_set.output_overbroad"
  | "context_working_set.live_collection_forbidden"
  | "context_working_set.side_effects_forbidden";

export type ContextWorkingSetError = {
  code: ContextWorkingSetErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type ContextWorkingSetConstraints = {
  source_only: true;
  require_source_refs: true;
  stale_context_allowed: false;
  secret_values_allowed: false;
  coding_agent_context_synthesis_role: "one_supported_consumer";
  output_limits: ContextWorkingSetOutputLimits;
  live_collection_allowed: false;
};

export type ContextWorkingSetSummary = {
  consumer: ContextWorkingSetConsumer;
  atom_count: number;
  source_ref_count: number;
  primary_focus: string[];
  constraints: string[];
  open_questions: string[];
  trust_counts: Record<ContextAtomTrustLevel, number>;
  freshness_counts: Record<ContextAtomFreshness, number>;
  relevance_counts: Record<ContextAtomRelevance, number>;
  output_limit_status: "within_limits";
};

export type ContextWorkingSetEvidence = {
  contract_id: typeof contextWorkingSetContract.contract_id;
  working_set_version: typeof contextWorkingSetContract.working_set_version;
  request_id: string | null;
  project_id: string;
  actor_id: string;
  objective: string;
  consumer: ContextWorkingSetConsumer;
  created_at: string;
  supported_consumers: ContextWorkingSetConsumer[];
  atom_map: Record<string, ContextAtomEvidence>;
  working_set_summary: ContextWorkingSetSummary;
  constraints: ContextWorkingSetConstraints;
  source_refs: string[];
  live_collection_allowed: false;
  side_effects: [];
};

export type ContextWorkingSetResult =
  | {
      ok: true;
      working_set: ContextWorkingSetEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      working_set: null;
      errors: ContextWorkingSetError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedContextWorkingSetRequest =
  | {
      ok: true;
      request_id: string | null;
      project_id: string;
      actor_id: string;
      objective: string;
      consumer: ContextWorkingSetConsumer;
      atoms: ContextAtomEvidence[];
      output_limits: ContextWorkingSetOutputLimits;
      created_at: string;
    }
  | {
      ok: false;
      errors: ContextWorkingSetError[];
    };

const defaultOutputLimits: ContextWorkingSetOutputLimits = {
  max_atoms: 8,
  max_source_refs: 12,
  max_summary_chars: 800,
  max_atom_summary_chars: 160,
};

const requestKeys = new Set([
  "request_id",
  "project_id",
  "actor_id",
  "objective",
  "consumer",
  "atoms",
  "output_limits",
  "created_at",
  "live_collection_allowed",
  "side_effects",
]);
const atomKeys = new Set([
  "atom_id",
  "source_kind",
  "source_ref",
  "summary",
  "trust_level",
  "freshness",
  "relevance",
  "captured_at",
]);
const outputLimitKeys = new Set([
  "max_atoms",
  "max_source_refs",
  "max_summary_chars",
  "max_atom_summary_chars",
]);

const consumers = new Set<ContextWorkingSetConsumer>(
  contextWorkingSetContract.supported_consumers,
);
const sourceKinds = new Set<ContextAtomSourceKind>(
  contextWorkingSetContract.source_kinds,
);
const trustLevels = new Set<ContextAtomTrustLevel>(
  contextWorkingSetContract.trust_levels,
);
const freshnessValues = new Set<ContextAtomFreshness>(
  contextWorkingSetContract.freshness_values,
);
const relevanceValues = new Set<ContextAtomRelevance>(
  contextWorkingSetContract.relevance_values,
);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const actorIdPattern = /^(agent|human|script|worker|mcp|cli)\.[a-z0-9_.:-]{2,95}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;
const commandLikePattern =
  /\b(rm -rf|ssh|sudo|root|secret\.read|credential\.read|database\.write|db\.write|drop table|delete from|deploy\.execute|dns\.write|cloudflare\.write|queue\.purge|docker\.socket|node_agent\.exec)\b/i;

export function createContextWorkingSet(
  input: unknown,
  options: { now?: Date } = {},
): ContextWorkingSetResult {
  const createdAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeContextWorkingSetRequest(input, createdAt);

  if (!normalized.ok) {
    return failContextWorkingSet(normalized.errors);
  }

  const atomMap = Object.fromEntries(
    normalized.atoms.map((atom) => [atom.atom_id, atom]),
  );
  const sourceRefs = buildSourceRefs(normalized.atoms);

  return {
    ok: true,
    working_set: {
      contract_id: contextWorkingSetContract.contract_id,
      working_set_version: contextWorkingSetContract.working_set_version,
      request_id: normalized.request_id,
      project_id: normalized.project_id,
      actor_id: normalized.actor_id,
      objective: normalized.objective,
      consumer: normalized.consumer,
      created_at: normalized.created_at,
      supported_consumers: [...contextWorkingSetContract.supported_consumers],
      atom_map: atomMap,
      working_set_summary: buildWorkingSetSummary(
        normalized.consumer,
        normalized.atoms,
      ),
      constraints: {
        source_only: true,
        require_source_refs: true,
        stale_context_allowed: false,
        secret_values_allowed: false,
        coding_agent_context_synthesis_role: "one_supported_consumer",
        output_limits: normalized.output_limits,
        live_collection_allowed: false,
      },
      source_refs: sourceRefs,
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeContextWorkingSetRequest(
  input: unknown,
  createdAt: string,
): NormalizedContextWorkingSetRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        workingSetError(
          "context_working_set.invalid_request",
          "",
          "Context working-set request must be an object.",
        ),
      ],
    };
  }

  const errors: ContextWorkingSetError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        workingSetError(
          "context_working_set.unexpected_field",
          jsonPointer(key),
          "Unexpected context working-set request field.",
        ),
      );
    }
  }

  const requestId = typeof input.request_id === "string" ? input.request_id : null;
  if (
    Object.hasOwn(input, "request_id") &&
    (typeof input.request_id !== "string" || !safeString(input.request_id))
  ) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_request_id",
        "/request_id",
        "Context working-set request_id must be a safe string when provided.",
      ),
    );
  }

  if (typeof input.project_id !== "string" || !stableIdPattern.test(input.project_id)) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_project_id",
        "/project_id",
        "Context working-set project_id must be a stable lowercase id.",
      ),
    );
  }

  if (typeof input.actor_id !== "string" || !actorIdPattern.test(input.actor_id)) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_actor_id",
        "/actor_id",
        "Context working-set actor_id must be scoped to an actor namespace.",
      ),
    );
  }

  if (typeof input.objective !== "string" || !safeString(input.objective)) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_objective",
        "/objective",
        "Context working-set objective must be a safe non-secret string.",
      ),
    );
  }

  if (typeof input.consumer !== "string" || !consumers.has(input.consumer as never)) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_consumer",
        "/consumer",
        "Context working-set consumer is unsupported.",
      ),
    );
  }

  const requestCreatedAt =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : createdAt;
  if (
    Object.hasOwn(input, "created_at") &&
    (typeof input.created_at !== "string" || !isoDateTimePattern.test(input.created_at))
  ) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_created_at",
        "/created_at",
        "Context working-set created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  const outputLimits = normalizeOutputLimits(input.output_limits, errors);
  const atoms = normalizeAtoms(input.atoms, outputLimits, errors);
  validateOutputBreadth(atoms, outputLimits, errors);

  if (
    Object.hasOwn(input, "live_collection_allowed") &&
    input.live_collection_allowed !== false
  ) {
    errors.push(
      workingSetError(
        "context_working_set.live_collection_forbidden",
        "/live_collection_allowed",
        "Context working set is source-only and cannot enable live collection.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      workingSetError(
        "context_working_set.side_effects_forbidden",
        "/side_effects",
        "Context working set must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request_id: requestId,
    project_id: input.project_id as string,
    actor_id: input.actor_id as string,
    objective: input.objective as string,
    consumer: input.consumer as ContextWorkingSetConsumer,
    atoms,
    output_limits: outputLimits,
    created_at: requestCreatedAt,
  };
}

function normalizeOutputLimits(
  value: unknown,
  errors: ContextWorkingSetError[],
): ContextWorkingSetOutputLimits {
  if (value === undefined) {
    return defaultOutputLimits;
  }

  if (!isPlainObject(value)) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_output_limits",
        "/output_limits",
        "Context working-set output_limits must be an object.",
      ),
    );
    return defaultOutputLimits;
  }

  for (const key of Object.keys(value)) {
    if (!outputLimitKeys.has(key)) {
      errors.push(
        workingSetError(
          "context_working_set.unexpected_field",
          `/output_limits/${escapeJsonPointerSegment(key)}`,
          "Unexpected context working-set output limit field.",
        ),
      );
    }
  }

  const limits = { ...defaultOutputLimits };
  for (const key of outputLimitKeys as Set<keyof ContextWorkingSetOutputLimits>) {
    if (!Object.hasOwn(value, key)) {
      continue;
    }
    const rawLimit = value[key];
    if (!Number.isInteger(rawLimit)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_output_limits",
          `/output_limits/${key}`,
          "Context working-set output limits must be integers.",
        ),
      );
      continue;
    }
    limits[key] = rawLimit as number;
  }

  if (
    limits.max_atoms < 1 ||
    limits.max_atoms > 12 ||
    limits.max_source_refs < 1 ||
    limits.max_source_refs > 24 ||
    limits.max_summary_chars < 80 ||
    limits.max_summary_chars > 1600 ||
    limits.max_atom_summary_chars < 40 ||
    limits.max_atom_summary_chars > 240
  ) {
    errors.push(
      workingSetError(
        "context_working_set.invalid_output_limits",
        "/output_limits",
        "Context working-set output limits are outside allowed bounds.",
      ),
    );
  }

  return limits;
}

function normalizeAtoms(
  value: unknown,
  outputLimits: ContextWorkingSetOutputLimits,
  errors: ContextWorkingSetError[],
): ContextAtomEvidence[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      workingSetError(
        "context_working_set.atoms_required",
        "/atoms",
        "Context working set requires at least one cited atom.",
      ),
    );
    return [];
  }

  const atoms: ContextAtomEvidence[] = [];
  const atomIds = new Set<string>();
  value.forEach((item, index) => {
    const path = `/atoms/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          path,
          "Context atom must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!atomKeys.has(key)) {
        errors.push(
          workingSetError(
            "context_working_set.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected context atom field.",
          ),
        );
      }
    }

    const atomId = item.atom_id;
    const sourceKind = item.source_kind;
    const sourceRef = item.source_ref;
    const summary = item.summary;
    const trustLevel = item.trust_level;
    const freshness = item.freshness;
    const relevance = item.relevance;
    const capturedAt = item.captured_at;

    if (typeof atomId !== "string" || !stableIdPattern.test(atomId)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/atom_id`,
          "Context atom_id must be a stable lowercase id.",
        ),
      );
    } else if (atomIds.has(atomId)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/atom_id`,
          "Context atom_id must be unique.",
        ),
      );
    } else {
      atomIds.add(atomId);
    }

    if (typeof sourceKind !== "string" || !sourceKinds.has(sourceKind as never)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/source_kind`,
          "Context atom source_kind is unsupported.",
        ),
      );
    }

    if (typeof sourceRef !== "string" || sourceRef.trim().length === 0) {
      errors.push(
        workingSetError(
          "context_working_set.atom_uncited",
          `${path}/source_ref`,
          "Context atom must include a source_ref citation.",
        ),
      );
    } else if (!safeString(sourceRef)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/source_ref`,
          "Context atom source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (
      typeof summary !== "string" ||
      !safeString(summary) ||
      summary.length > outputLimits.max_atom_summary_chars
    ) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/summary`,
          "Context atom summary must be safe concise source-backed text.",
        ),
      );
    }

    if (typeof trustLevel !== "string" || !trustLevels.has(trustLevel as never)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/trust_level`,
          "Context atom trust_level is unsupported.",
        ),
      );
    }

    if (typeof freshness !== "string" || !freshnessValues.has(freshness as never)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/freshness`,
          "Context atom freshness is unsupported.",
        ),
      );
    } else if (freshness === "stale") {
      errors.push(
        workingSetError(
          "context_working_set.atom_stale",
          `${path}/freshness`,
          "Context atom is stale and cannot enter the working set.",
        ),
      );
    }

    if (typeof relevance !== "string" || !relevanceValues.has(relevance as never)) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/relevance`,
          "Context atom relevance is unsupported.",
        ),
      );
    }

    if (
      Object.hasOwn(item, "captured_at") &&
      (typeof capturedAt !== "string" || !isoDateTimePattern.test(capturedAt))
    ) {
      errors.push(
        workingSetError(
          "context_working_set.invalid_atom",
          `${path}/captured_at`,
          "Context atom captured_at must be an ISO UTC timestamp.",
        ),
      );
    }

    if (
      typeof atomId === "string" &&
      stableIdPattern.test(atomId) &&
      typeof sourceKind === "string" &&
      sourceKinds.has(sourceKind as ContextAtomSourceKind) &&
      typeof sourceRef === "string" &&
      safeString(sourceRef) &&
      typeof summary === "string" &&
      safeString(summary) &&
      summary.length <= outputLimits.max_atom_summary_chars &&
      typeof trustLevel === "string" &&
      trustLevels.has(trustLevel as ContextAtomTrustLevel) &&
      typeof freshness === "string" &&
      freshnessValues.has(freshness as ContextAtomFreshness) &&
      freshness !== "stale" &&
      typeof relevance === "string" &&
      relevanceValues.has(relevance as ContextAtomRelevance) &&
      (!Object.hasOwn(item, "captured_at") ||
        (typeof capturedAt === "string" && isoDateTimePattern.test(capturedAt)))
    ) {
      atoms.push({
        atom_id: atomId,
        source_kind: sourceKind as ContextAtomSourceKind,
        source_ref: sourceRef,
        summary,
        trust_level: trustLevel as ContextAtomTrustLevel,
        freshness: freshness as ContextAtomFreshness,
        relevance: relevance as ContextAtomRelevance,
        cited: true,
        ...(typeof capturedAt === "string" ? { captured_at: capturedAt } : {}),
      });
    }
  });

  return atoms;
}

function validateOutputBreadth(
  atoms: ContextAtomEvidence[],
  outputLimits: ContextWorkingSetOutputLimits,
  errors: ContextWorkingSetError[],
): void {
  if (atoms.length > outputLimits.max_atoms) {
    errors.push(
      workingSetError(
        "context_working_set.output_overbroad",
        "/atoms",
        "Context working set has too many atoms for requested output limits.",
      ),
    );
  }

  if (
    uniqueStrings(atoms.map((atom) => atom.source_ref)).length >
    outputLimits.max_source_refs
  ) {
    errors.push(
      workingSetError(
        "context_working_set.output_overbroad",
        "/atoms/source_ref",
        "Context working set has too many source refs for requested output limits.",
      ),
    );
  }

  const summaryChars = atoms.reduce((count, atom) => count + atom.summary.length, 0);
  if (summaryChars > outputLimits.max_summary_chars) {
    errors.push(
      workingSetError(
        "context_working_set.output_overbroad",
        "/atoms/summary",
        "Context working set summaries exceed requested output limits.",
      ),
    );
  }
}

function buildWorkingSetSummary(
  consumer: ContextWorkingSetConsumer,
  atoms: ContextAtomEvidence[],
): ContextWorkingSetSummary {
  const primaryFocus = atoms
    .filter((atom) => atom.relevance === "primary")
    .map((atom) => `${atom.source_kind}: ${atom.summary}`);
  const constraints = atoms
    .filter((atom) => atom.relevance === "constraint" || atom.relevance === "warning")
    .map((atom) => `${atom.source_kind}: ${atom.summary}`);
  const openQuestions = atoms
    .filter((atom) => atom.trust_level === "unverified")
    .map((atom) => `${atom.source_kind}: ${atom.summary}`);

  return {
    consumer,
    atom_count: atoms.length,
    source_ref_count: uniqueStrings(atoms.map((atom) => atom.source_ref)).length,
    primary_focus: primaryFocus,
    constraints,
    open_questions: openQuestions,
    trust_counts: countBy(atoms, contextWorkingSetContract.trust_levels, "trust_level"),
    freshness_counts: countBy(
      atoms,
      contextWorkingSetContract.freshness_values,
      "freshness",
    ),
    relevance_counts: countBy(
      atoms,
      contextWorkingSetContract.relevance_values,
      "relevance",
    ),
    output_limit_status: "within_limits",
  };
}

function buildSourceRefs(atoms: ContextAtomEvidence[]): string[] {
  return uniqueStrings([
    ...atoms.map((atom) => `${atom.source_kind}:${atom.source_ref}`),
    ...contextWorkingSetContract.source_docs.map((sourceDoc) => `doc:${sourceDoc}`),
  ]);
}

function countBy<
  TItem extends Record<TKey, string>,
  TValue extends readonly string[],
  TKey extends keyof TItem,
>(items: TItem[], values: TValue, key: TKey): Record<TValue[number], number> {
  const counts = Object.fromEntries(values.map((value) => [value, 0])) as Record<
    TValue[number],
    number
  >;
  for (const item of items) {
    counts[item[key] as TValue[number]] += 1;
  }
  return counts;
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !commandLikePattern.test(value)
  );
}

function failContextWorkingSet(
  errors: ContextWorkingSetError[],
): ContextWorkingSetResult {
  return {
    ok: false,
    working_set: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function workingSetError(
  code: ContextWorkingSetErrorCode,
  path: string,
  message: string,
): ContextWorkingSetError {
  return { code, path, message, severity: "error" };
}

function dedupeErrors(errors: ContextWorkingSetError[]): ContextWorkingSetError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
