export const CODING_AGENT_CONTEXT_SYNTHESIS_STATUS = "source_only";

export const codingAgentContextSynthesisContract = {
  contract_id: "lnsat.context.coding_agent_synthesis.v0_1",
  authority: ["@lnsat/packets", "source-backed-context-refs"],
  required_source_kinds: ["code", "docs", "ticket", "conversation", "runtime_signal"],
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/CONTEXT_SYNTHESIS.md",
    "docs/onboarding/AGENT_ONBOARDING.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type CodingAgentContextSourceKind =
  "code" | "docs" | "ticket" | "conversation" | "runtime_signal";

export type CodingAgentContextRelevance = "primary" | "supporting" | "warning";

export type CodingAgentContextTrustLevel =
  "source_backed" | "operator_supplied" | "unverified";

export type CodingAgentContextSourceInput = {
  kind: CodingAgentContextSourceKind;
  source_ref: string;
  summary: string;
  relevance: CodingAgentContextRelevance;
  trust_level: CodingAgentContextTrustLevel;
  captured_at?: string;
};

export type CodingAgentContextSynthesisRequest = {
  request_id?: string;
  project_id: string;
  actor_id: string;
  session_id?: string;
  objective: string;
  sources: CodingAgentContextSourceInput[];
  created_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type CodingAgentContextSynthesisErrorCode =
  | "coding_agent_context_synthesis.invalid_request"
  | "coding_agent_context_synthesis.unexpected_field"
  | "coding_agent_context_synthesis.invalid_request_id"
  | "coding_agent_context_synthesis.invalid_project_id"
  | "coding_agent_context_synthesis.invalid_actor_id"
  | "coding_agent_context_synthesis.invalid_session_id"
  | "coding_agent_context_synthesis.invalid_objective"
  | "coding_agent_context_synthesis.invalid_created_at"
  | "coding_agent_context_synthesis.sources_required"
  | "coding_agent_context_synthesis.invalid_source"
  | "coding_agent_context_synthesis.source_kind_required"
  | "coding_agent_context_synthesis.live_collection_forbidden"
  | "coding_agent_context_synthesis.side_effects_forbidden";

export type CodingAgentContextSynthesisError = {
  code: CodingAgentContextSynthesisErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type CodingAgentContextSourceEvidence = CodingAgentContextSourceInput & {
  source_id: string;
};

export type CodingAgentContextSynthesisEvidence = {
  contract_id: typeof codingAgentContextSynthesisContract.contract_id;
  request_id: string | null;
  project_id: string;
  actor_id: string;
  session_id: string;
  synthesized_at: string;
  objective: string;
  required_source_kinds: CodingAgentContextSourceKind[];
  source_counts: Record<CodingAgentContextSourceKind, number>;
  sources: CodingAgentContextSourceEvidence[];
  synthesized_context: {
    coding_agent_brief: string[];
    constraints: string[];
    open_questions: string[];
    stale_or_missing_signals: string[];
  };
  source_refs: string[];
  live_collection_allowed: false;
  side_effects: [];
};

export type CodingAgentContextSynthesisResult =
  | {
      ok: true;
      synthesis: CodingAgentContextSynthesisEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      synthesis: null;
      errors: CodingAgentContextSynthesisError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedCodingAgentContextSynthesisRequest =
  | {
      ok: true;
      request_id: string | null;
      project_id: string;
      actor_id: string;
      session_id: string;
      objective: string;
      sources: CodingAgentContextSourceInput[];
      created_at: string;
    }
  | {
      ok: false;
      errors: CodingAgentContextSynthesisError[];
    };

const requestKeys = new Set([
  "request_id",
  "project_id",
  "actor_id",
  "session_id",
  "objective",
  "sources",
  "created_at",
  "live_collection_allowed",
  "side_effects",
]);

const sourceKeys = new Set([
  "kind",
  "source_ref",
  "summary",
  "relevance",
  "trust_level",
  "captured_at",
]);

const sourceKinds = new Set<CodingAgentContextSourceKind>([
  "code",
  "docs",
  "ticket",
  "conversation",
  "runtime_signal",
]);
const relevanceValues = new Set<CodingAgentContextRelevance>([
  "primary",
  "supporting",
  "warning",
]);
const trustLevelValues = new Set<CodingAgentContextTrustLevel>([
  "source_backed",
  "operator_supplied",
  "unverified",
]);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const actorIdPattern = /^(agent|human|script|worker|mcp|cli)\.[a-z0-9_.:-]{2,95}$/;
const sessionIdPattern = /^sess_[a-z0-9][a-z0-9_-]{7,63}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|sk-[A-Za-z0-9]|secret:)/i;

export function synthesizeCodingAgentContext(
  input: unknown,
  options: { now?: Date } = {},
): CodingAgentContextSynthesisResult {
  const synthesizedAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeCodingAgentContextSynthesisRequest(input, synthesizedAt);

  if (!normalized.ok) {
    return failCodingAgentContextSynthesis(normalized.errors);
  }

  const sourceCounts = countSources(normalized.sources);
  return {
    ok: true,
    synthesis: {
      contract_id: codingAgentContextSynthesisContract.contract_id,
      request_id: normalized.request_id,
      project_id: normalized.project_id,
      actor_id: normalized.actor_id,
      session_id: normalized.session_id,
      synthesized_at: normalized.created_at,
      objective: normalized.objective,
      required_source_kinds: [
        ...codingAgentContextSynthesisContract.required_source_kinds,
      ],
      source_counts: sourceCounts,
      sources: normalized.sources.map((source, index) => ({
        source_id: `${source.kind}_${index + 1}`,
        ...source,
      })),
      synthesized_context: buildSynthesizedContext(normalized.sources),
      source_refs: sourceRefs(normalized.sources),
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeCodingAgentContextSynthesisRequest(
  input: unknown,
  synthesizedAt: string,
): NormalizedCodingAgentContextSynthesisRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        synthesisError(
          "coding_agent_context_synthesis.invalid_request",
          "",
          "Coding agent context synthesis request must be an object.",
        ),
      ],
    };
  }

  const errors: CodingAgentContextSynthesisError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.unexpected_field",
          jsonPointer(key),
          "Unexpected coding agent context synthesis request field.",
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
      synthesisError(
        "coding_agent_context_synthesis.invalid_request_id",
        "/request_id",
        "Context synthesis request_id must be a safe string when provided.",
      ),
    );
  }

  if (typeof input.project_id !== "string" || !stableIdPattern.test(input.project_id)) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.invalid_project_id",
        "/project_id",
        "Context synthesis project_id must be a stable lowercase id.",
      ),
    );
  }

  if (typeof input.actor_id !== "string" || !actorIdPattern.test(input.actor_id)) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.invalid_actor_id",
        "/actor_id",
        "Context synthesis actor_id must be scoped to an actor namespace.",
      ),
    );
  }

  const sessionId =
    typeof input.session_id === "string"
      ? input.session_id
      : "sess_context_synthesis_0001";
  if (
    Object.hasOwn(input, "session_id") &&
    (typeof input.session_id !== "string" || !sessionIdPattern.test(input.session_id))
  ) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.invalid_session_id",
        "/session_id",
        "Context synthesis session_id must use sess_ prefix and stable lowercase id.",
      ),
    );
  }

  if (typeof input.objective !== "string" || !safeString(input.objective)) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.invalid_objective",
        "/objective",
        "Context synthesis objective must be a safe non-secret string.",
      ),
    );
  }

  const createdAt =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : synthesizedAt;
  if (
    Object.hasOwn(input, "created_at") &&
    (typeof input.created_at !== "string" || !isoDateTimePattern.test(input.created_at))
  ) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.invalid_created_at",
        "/created_at",
        "Context synthesis created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  const sources = normalizeSources(input.sources, errors);
  requireAllSourceKinds(sources, errors);

  if (
    Object.hasOwn(input, "live_collection_allowed") &&
    input.live_collection_allowed !== false
  ) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.live_collection_forbidden",
        "/live_collection_allowed",
        "Context synthesis is source-only and cannot enable live collection.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.side_effects_forbidden",
        "/side_effects",
        "Context synthesis must preserve side_effects: [].",
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
    session_id: sessionId,
    objective: input.objective as string,
    sources,
    created_at: createdAt,
  };
}

function normalizeSources(
  value: unknown,
  errors: CodingAgentContextSynthesisError[],
): CodingAgentContextSourceInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      synthesisError(
        "coding_agent_context_synthesis.sources_required",
        "/sources",
        "Context synthesis requires source refs for code, docs, tickets, conversations, and runtime signals.",
      ),
    );
    return [];
  }

  const sources: CodingAgentContextSourceInput[] = [];
  value.forEach((item, index) => {
    const path = `/sources/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          path,
          "Context synthesis source must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          synthesisError(
            "coding_agent_context_synthesis.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected context synthesis source field.",
          ),
        );
      }
    }

    const kind = item.kind;
    const sourceRef = item.source_ref;
    const summary = item.summary;
    const relevance = item.relevance;
    const trustLevel = item.trust_level;
    const capturedAt = item.captured_at;

    if (typeof kind !== "string" || !sourceKinds.has(kind as never)) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          `${path}/kind`,
          "Context synthesis source kind is unsupported.",
        ),
      );
      return;
    }

    if (typeof sourceRef !== "string" || !safeString(sourceRef)) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          `${path}/source_ref`,
          "Context synthesis source_ref must be a safe non-secret string.",
        ),
      );
    }

    if (typeof summary !== "string" || !safeString(summary)) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          `${path}/summary`,
          "Context synthesis summary must be a safe non-secret string.",
        ),
      );
    }

    if (
      typeof relevance !== "string" ||
      !relevanceValues.has(relevance as CodingAgentContextRelevance)
    ) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          `${path}/relevance`,
          "Context synthesis source relevance is unsupported.",
        ),
      );
    }

    if (
      typeof trustLevel !== "string" ||
      !trustLevelValues.has(trustLevel as CodingAgentContextTrustLevel)
    ) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          `${path}/trust_level`,
          "Context synthesis source trust level is unsupported.",
        ),
      );
    }

    if (
      Object.hasOwn(item, "captured_at") &&
      (typeof capturedAt !== "string" || !isoDateTimePattern.test(capturedAt))
    ) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.invalid_source",
          `${path}/captured_at`,
          "Context synthesis source captured_at must be an ISO UTC timestamp.",
        ),
      );
    }

    if (
      typeof sourceRef === "string" &&
      typeof summary === "string" &&
      typeof relevance === "string" &&
      typeof trustLevel === "string" &&
      safeString(sourceRef) &&
      safeString(summary) &&
      relevanceValues.has(relevance as CodingAgentContextRelevance) &&
      trustLevelValues.has(trustLevel as CodingAgentContextTrustLevel) &&
      (!Object.hasOwn(item, "captured_at") ||
        (typeof capturedAt === "string" && isoDateTimePattern.test(capturedAt)))
    ) {
      sources.push({
        kind: kind as CodingAgentContextSourceKind,
        source_ref: sourceRef,
        summary,
        relevance: relevance as CodingAgentContextRelevance,
        trust_level: trustLevel as CodingAgentContextTrustLevel,
        ...(typeof capturedAt === "string" ? { captured_at: capturedAt } : {}),
      });
    }
  });

  return sources;
}

function requireAllSourceKinds(
  sources: CodingAgentContextSourceInput[],
  errors: CodingAgentContextSynthesisError[],
): void {
  for (const kind of codingAgentContextSynthesisContract.required_source_kinds) {
    if (!sources.some((source) => source.kind === kind)) {
      errors.push(
        synthesisError(
          "coding_agent_context_synthesis.source_kind_required",
          "/sources",
          `Context synthesis requires at least one ${kind} source.`,
        ),
      );
    }
  }
}

function countSources(
  sources: CodingAgentContextSourceInput[],
): Record<CodingAgentContextSourceKind, number> {
  return {
    code: sources.filter((source) => source.kind === "code").length,
    docs: sources.filter((source) => source.kind === "docs").length,
    ticket: sources.filter((source) => source.kind === "ticket").length,
    conversation: sources.filter((source) => source.kind === "conversation").length,
    runtime_signal: sources.filter((source) => source.kind === "runtime_signal").length,
  };
}

function buildSynthesizedContext(sources: CodingAgentContextSourceInput[]) {
  return {
    coding_agent_brief: sources
      .filter((source) => source.relevance === "primary")
      .map((source) => `${source.kind}: ${source.summary}`),
    constraints: sources
      .filter((source) => source.relevance === "warning")
      .map((source) => `${source.kind}: ${source.summary}`),
    open_questions: sources
      .filter((source) => source.trust_level === "unverified")
      .map((source) => `verify ${source.kind} source ${source.source_ref}`),
    stale_or_missing_signals: codingAgentContextSynthesisContract.required_source_kinds
      .filter((kind) => !sources.some((source) => source.kind === kind))
      .map((kind) => `missing ${kind} source`),
  };
}

function sourceRefs(sources: CodingAgentContextSourceInput[]): string[] {
  return uniqueStrings([
    ...sources.map((source) => `${source.kind}:${source.source_ref}`),
    ...codingAgentContextSynthesisContract.source_docs.map((doc) => `doc:${doc}`),
  ]);
}

function failCodingAgentContextSynthesis(
  errors: CodingAgentContextSynthesisError[],
): CodingAgentContextSynthesisResult {
  return {
    ok: false,
    synthesis: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function synthesisError(
  code: CodingAgentContextSynthesisErrorCode,
  path: string,
  message: string,
): CodingAgentContextSynthesisError {
  return { code, path, message, severity: "error" };
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

function dedupeErrors(
  errors: CodingAgentContextSynthesisError[],
): CodingAgentContextSynthesisError[] {
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
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
