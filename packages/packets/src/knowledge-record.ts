export const LOCAL_KNOWLEDGE_RECORD_STATUS = "source_only";

export const localKnowledgeRecordContract = {
  contract_id: "lnsat.knowledge.local_record.v0_1",
  authority: ["@lnsat/packets", "source-backed-local-knowledge-model"],
  record_version: "0.1",
  source_kinds: [
    "repo_doc",
    "packet_doc",
    "decision_doc",
    "architecture_doc",
    "status_doc",
    "source_file",
  ],
  trust_levels: ["repo_truth", "source_backed", "operator_supplied"],
  freshness_values: ["current", "recent", "stale", "unknown"],
  conflict_values: ["none", "possible", "confirmed", "unknown"],
  allowed_risk_flags: [
    "stale_source",
    "conflicting_source",
    "policy_boundary",
    "approval_required",
    "runtime_boundary",
    "secret_like_rejected",
  ],
  source_docs: [
    "fixtures/knowledge/product-direction.md",
    "docs/architecture/INTERNAL_KNOWLEDGE_SURFACE.md",
    "fixtures/knowledge/packets/BP-0181.md",
    "fixtures/knowledge/packets/BP-0182.md",
  ],
  live_collection_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type KnowledgeSourceKind =
  (typeof localKnowledgeRecordContract.source_kinds)[number];

export type KnowledgeSourceTrustLevel =
  (typeof localKnowledgeRecordContract.trust_levels)[number];

export type KnowledgeSourceFreshness =
  (typeof localKnowledgeRecordContract.freshness_values)[number];

export type KnowledgeConflictStatus =
  (typeof localKnowledgeRecordContract.conflict_values)[number];

export type KnowledgeRiskFlag =
  (typeof localKnowledgeRecordContract.allowed_risk_flags)[number];

export type KnowledgeSourceRef = {
  path: string;
  heading?: string;
  line_start: number;
  line_end: number;
  content_hash?: string;
  commit_ref?: string;
};

export type KnowledgeSourceRegistryEntry = {
  source_id: string;
  source_kind: KnowledgeSourceKind;
  path: string;
  title: string;
  owner_ref: string;
  trust_level: KnowledgeSourceTrustLevel;
  freshness: KnowledgeSourceFreshness;
  allowlisted: true;
  source_refs: KnowledgeSourceRef[];
  indexed_at?: string;
  side_effects?: [];
};

export type KnowledgeRecordRequest = {
  record_id?: string;
  source_kind?: KnowledgeSourceKind;
  source_path?: string;
  title?: string;
  summary?: string;
  excerpt_ref?: KnowledgeSourceRef;
  source_refs?: KnowledgeSourceRef[];
  tags?: string[];
  packet_ids?: string[];
  decision_ids?: string[];
  owners?: string[];
  stale_status?: KnowledgeSourceFreshness;
  conflict_status?: KnowledgeConflictStatus;
  risk_flags?: KnowledgeRiskFlag[];
  last_indexed_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type KnowledgeContextBundleRecordRef = {
  record_id: string;
  source_refs: KnowledgeSourceRef[];
  relevance: "primary" | "supporting" | "constraint" | "warning";
  token_estimate: number;
};

export type KnowledgeCitationRef = {
  citation_id: string;
  record_id: string;
  source_ref: KnowledgeSourceRef;
  summary: string;
};

export type KnowledgeContextBundleRequest = {
  bundle_id?: string;
  objective?: string;
  record_refs?: KnowledgeContextBundleRecordRef[];
  citation_refs?: KnowledgeCitationRef[];
  stale_warnings?: string[];
  conflict_warnings?: string[];
  created_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type KnowledgeRecordErrorCode =
  | "knowledge_record.invalid_request"
  | "knowledge_record.unexpected_field"
  | "knowledge_record.invalid_record_id"
  | "knowledge_record.invalid_source_kind"
  | "knowledge_record.invalid_source_path"
  | "knowledge_record.invalid_title"
  | "knowledge_record.invalid_summary"
  | "knowledge_record.invalid_source_ref"
  | "knowledge_record.invalid_tag"
  | "knowledge_record.invalid_packet_id"
  | "knowledge_record.invalid_decision_id"
  | "knowledge_record.invalid_owner"
  | "knowledge_record.invalid_stale_status"
  | "knowledge_record.invalid_conflict_status"
  | "knowledge_record.invalid_risk_flag"
  | "knowledge_record.invalid_last_indexed_at"
  | "knowledge_record.secret_value_forbidden"
  | "knowledge_record.live_collection_forbidden"
  | "knowledge_record.side_effects_forbidden"
  | "knowledge_context_bundle.invalid_request"
  | "knowledge_context_bundle.unexpected_field"
  | "knowledge_context_bundle.invalid_bundle_id"
  | "knowledge_context_bundle.invalid_objective"
  | "knowledge_context_bundle.record_refs_required"
  | "knowledge_context_bundle.invalid_record_ref"
  | "knowledge_context_bundle.citation_refs_required"
  | "knowledge_context_bundle.invalid_citation_ref"
  | "knowledge_context_bundle.invalid_warning"
  | "knowledge_context_bundle.invalid_created_at"
  | "knowledge_context_bundle.secret_value_forbidden"
  | "knowledge_context_bundle.live_collection_forbidden"
  | "knowledge_context_bundle.side_effects_forbidden";

export type KnowledgeRecordError = {
  code: KnowledgeRecordErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type KnowledgeRecordEvidence = {
  contract_id: typeof localKnowledgeRecordContract.contract_id;
  record_version: typeof localKnowledgeRecordContract.record_version;
  record_id: string;
  source_kind: KnowledgeSourceKind;
  source_path: string;
  title: string;
  summary: string;
  excerpt_ref: KnowledgeSourceRef;
  source_refs: KnowledgeSourceRef[];
  tags: string[];
  packet_ids: string[];
  decision_ids: string[];
  owners: string[];
  stale_status: KnowledgeSourceFreshness;
  conflict_status: KnowledgeConflictStatus;
  risk_flags: KnowledgeRiskFlag[];
  last_indexed_at: string;
  constraints: {
    source_only: true;
    exact_source_refs_required: true;
    secret_values_allowed: false;
    live_collection_allowed: false;
  };
  live_collection_allowed: false;
  side_effects: [];
};

export type KnowledgeContextBundleEvidence = {
  contract_id: typeof localKnowledgeRecordContract.contract_id;
  bundle_version: typeof localKnowledgeRecordContract.record_version;
  bundle_id: string;
  objective: string;
  record_refs: KnowledgeContextBundleRecordRef[];
  citation_refs: KnowledgeCitationRef[];
  stale_warnings: string[];
  conflict_warnings: string[];
  created_at: string;
  constraints: {
    source_only: true;
    citations_required: true;
    secret_values_allowed: false;
    live_collection_allowed: false;
  };
  live_collection_allowed: false;
  side_effects: [];
};

export type KnowledgeRecordResult =
  | {
      ok: true;
      knowledge_record: KnowledgeRecordEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      knowledge_record: null;
      errors: KnowledgeRecordError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type KnowledgeContextBundleResult =
  | {
      ok: true;
      context_bundle: KnowledgeContextBundleEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      context_bundle: null;
      errors: KnowledgeRecordError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedKnowledgeRecord =
  | {
      ok: true;
      record: Omit<
        KnowledgeRecordEvidence,
        "contract_id" | "record_version" | "constraints" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: KnowledgeRecordError[];
    };

type NormalizedKnowledgeContextBundle =
  | {
      ok: true;
      bundle: Omit<
        KnowledgeContextBundleEvidence,
        "contract_id" | "bundle_version" | "constraints" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: KnowledgeRecordError[];
    };

const defaultSourceRef: KnowledgeSourceRef = {
  path: "fixtures/knowledge/packets/BP-0182.md",
  heading: "Scope",
  line_start: 20,
  line_end: 32,
  content_hash: "sha256:future-content-hash-placeholder",
  commit_ref: "git:future-commit-placeholder",
};

export const defaultKnowledgeRecord: KnowledgeRecordRequest = {
  record_id: "knowledge.record.bp0182.local_model",
  source_kind: "packet_doc",
  source_path: "fixtures/knowledge/packets/BP-0182.md",
  title: "BP-0182 Local Knowledge Record Model",
  summary:
    "BP-0182 defines source-only knowledge records before scanners, search, routes, MCP tools, UI, or persistence.",
  excerpt_ref: defaultSourceRef,
  source_refs: [
    defaultSourceRef,
    {
      path: "docs/architecture/INTERNAL_KNOWLEDGE_SURFACE.md",
      heading: "Knowledge Record Fields",
      line_start: 130,
      line_end: 145,
      content_hash: "sha256:future-content-hash-placeholder",
      commit_ref: "git:future-commit-placeholder",
    },
  ],
  tags: ["knowledge", "record_model", "source_only"],
  packet_ids: ["BP-0182"],
  decision_ids: ["decision.bp0181.mvp_direction"],
  owners: ["owner:lnsat-platform"],
  stale_status: "current",
  conflict_status: "none",
  risk_flags: ["policy_boundary"],
  last_indexed_at: "2026-05-16T00:00:00.000Z",
  live_collection_allowed: false,
  side_effects: [],
};

export const defaultKnowledgeContextBundle: KnowledgeContextBundleRequest = {
  bundle_id: "knowledge.bundle.bp0182.context",
  objective: "compile cited BP-0182 model context for agent implementation",
  record_refs: [
    {
      record_id: "knowledge.record.bp0182.local_model",
      source_refs: [defaultSourceRef],
      relevance: "primary",
      token_estimate: 320,
    },
  ],
  citation_refs: [
    {
      citation_id: "citation.bp0182.scope",
      record_id: "knowledge.record.bp0182.local_model",
      source_ref: defaultSourceRef,
      summary: "BP-0182 remains model-only and source-only.",
    },
  ],
  stale_warnings: [],
  conflict_warnings: [],
  created_at: "2026-05-16T00:00:00.000Z",
  live_collection_allowed: false,
  side_effects: [],
};

const recordKeys = new Set([
  "record_id",
  "source_kind",
  "source_path",
  "title",
  "summary",
  "excerpt_ref",
  "source_refs",
  "tags",
  "packet_ids",
  "decision_ids",
  "owners",
  "stale_status",
  "conflict_status",
  "risk_flags",
  "last_indexed_at",
  "live_collection_allowed",
  "side_effects",
]);
const sourceRefKeys = new Set([
  "path",
  "heading",
  "line_start",
  "line_end",
  "content_hash",
  "commit_ref",
]);
const bundleKeys = new Set([
  "bundle_id",
  "objective",
  "record_refs",
  "citation_refs",
  "stale_warnings",
  "conflict_warnings",
  "created_at",
  "live_collection_allowed",
  "side_effects",
]);
const bundleRecordRefKeys = new Set([
  "record_id",
  "source_refs",
  "relevance",
  "token_estimate",
]);
const citationRefKeys = new Set(["citation_id", "record_id", "source_ref", "summary"]);

const sourceKinds = new Set<KnowledgeSourceKind>(
  localKnowledgeRecordContract.source_kinds,
);
const freshnessValues = new Set<KnowledgeSourceFreshness>(
  localKnowledgeRecordContract.freshness_values,
);
const conflictValues = new Set<KnowledgeConflictStatus>(
  localKnowledgeRecordContract.conflict_values,
);
const riskFlags = new Set<KnowledgeRiskFlag>(
  localKnowledgeRecordContract.allowed_risk_flags,
);
const relevanceValues = new Set(["primary", "supporting", "constraint", "warning"]);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const packetIdPattern = /^BP-\d{4}$/;
const ownerRefPattern = /^(owner|agent|human|team):[a-z0-9_.:-]{2,96}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const relativePathPattern =
  /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+(?:\.[A-Za-z0-9]+)?$/;
const safeTextPattern = /^[\w .,:;@/()[\]#_+=-]{3,360}$/;
const safeHashPattern = /^(sha256|git):[A-Za-z0-9_.:-]{8,128}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:)/i;
const commandLikePattern =
  /\b(rm -rf|ssh|sudo|root|secret\.read|credential\.read|database\.write|db\.write|drop table|delete from|deploy\.execute|dns\.write|cloudflare\.write|queue\.purge|docker\.socket|node_agent\.exec)\b/i;

export function createKnowledgeRecord(input: unknown = {}): KnowledgeRecordResult {
  const normalized = normalizeKnowledgeRecord(input);

  if (!normalized.ok) {
    return failKnowledgeRecord(normalized.errors);
  }

  return {
    ok: true,
    knowledge_record: {
      contract_id: localKnowledgeRecordContract.contract_id,
      record_version: localKnowledgeRecordContract.record_version,
      ...normalized.record,
      constraints: {
        source_only: true,
        exact_source_refs_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
      },
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createKnowledgeContextBundle(
  input: unknown = {},
): KnowledgeContextBundleResult {
  const normalized = normalizeKnowledgeContextBundle(input);

  if (!normalized.ok) {
    return failKnowledgeContextBundle(normalized.errors);
  }

  return {
    ok: true,
    context_bundle: {
      contract_id: localKnowledgeRecordContract.contract_id,
      bundle_version: localKnowledgeRecordContract.record_version,
      ...normalized.bundle,
      constraints: {
        source_only: true,
        citations_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
      },
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeKnowledgeRecord(input: unknown): NormalizedKnowledgeRecord {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        knowledgeError(
          "knowledge_record.invalid_request",
          "",
          "Knowledge record request must be an object.",
        ),
      ],
    };
  }

  const merged = { ...defaultKnowledgeRecord, ...input };
  const errors: KnowledgeRecordError[] = [];
  for (const key of Object.keys(input)) {
    if (!recordKeys.has(key)) {
      errors.push(
        knowledgeError(
          "knowledge_record.unexpected_field",
          jsonPointer(key),
          "Unexpected knowledge record field.",
        ),
      );
    }
  }

  if (typeof merged.record_id !== "string" || !stableId(merged.record_id)) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_record_id",
        "/record_id",
        "Knowledge record_id must be a stable lowercase id.",
      ),
    );
  }

  if (
    typeof merged.source_kind !== "string" ||
    !sourceKinds.has(merged.source_kind as never)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_kind",
        "/source_kind",
        "Knowledge record source_kind is unsupported.",
      ),
    );
  }

  validateSafePath(merged.source_path, "/source_path", errors);
  validateSafeText(
    merged.title,
    "/title",
    "knowledge_record.invalid_title",
    "Knowledge record title must be safe source-backed text.",
    errors,
  );
  validateSafeText(
    merged.summary,
    "/summary",
    "knowledge_record.invalid_summary",
    "Knowledge record summary must be safe source-backed text.",
    errors,
  );

  const excerptRef = normalizeSourceRef(merged.excerpt_ref, "/excerpt_ref", errors);
  const sourceRefs = normalizeSourceRefs(merged.source_refs, "/source_refs", errors);
  if (excerptRef) {
    sourceRefs.unshift(excerptRef);
  }
  const dedupedSourceRefs = dedupeSourceRefs(sourceRefs);

  const tags = normalizeStringArray(
    merged.tags,
    "/tags",
    "knowledge_record.invalid_tag",
    "Knowledge record tags must be stable lowercase ids.",
    (value) => stableId(value),
    errors,
  );
  const packetIds = normalizeStringArray(
    merged.packet_ids,
    "/packet_ids",
    "knowledge_record.invalid_packet_id",
    "Knowledge record packet_ids must use BP-0000 shape.",
    (value) => packetIdPattern.test(value),
    errors,
  );
  const decisionIds = normalizeStringArray(
    merged.decision_ids,
    "/decision_ids",
    "knowledge_record.invalid_decision_id",
    "Knowledge record decision_ids must be stable lowercase ids.",
    (value) => stableId(value),
    errors,
  );
  const owners = normalizeStringArray(
    merged.owners,
    "/owners",
    "knowledge_record.invalid_owner",
    "Knowledge record owners must be owner refs.",
    (value) => ownerRefPattern.test(value),
    errors,
  );

  if (
    typeof merged.stale_status !== "string" ||
    !freshnessValues.has(merged.stale_status as never)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_stale_status",
        "/stale_status",
        "Knowledge record stale_status is unsupported.",
      ),
    );
  }

  if (
    typeof merged.conflict_status !== "string" ||
    !conflictValues.has(merged.conflict_status as never)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_conflict_status",
        "/conflict_status",
        "Knowledge record conflict_status is unsupported.",
      ),
    );
  }

  const normalizedRiskFlags = normalizeRiskFlags(merged.risk_flags, errors);

  if (
    typeof merged.last_indexed_at !== "string" ||
    !isoDateTimePattern.test(merged.last_indexed_at)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_last_indexed_at",
        "/last_indexed_at",
        "Knowledge record last_indexed_at must be an ISO UTC timestamp.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "live_collection_allowed") &&
    merged.live_collection_allowed !== false
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.live_collection_forbidden",
        "/live_collection_allowed",
        "Knowledge record cannot enable live collection.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "side_effects") &&
    (!Array.isArray(merged.side_effects) || merged.side_effects.length !== 0)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.side_effects_forbidden",
        "/side_effects",
        "Knowledge record must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    record: {
      record_id: merged.record_id as string,
      source_kind: merged.source_kind as KnowledgeSourceKind,
      source_path: merged.source_path as string,
      title: merged.title as string,
      summary: merged.summary as string,
      excerpt_ref: excerptRef ?? defaultSourceRef,
      source_refs: dedupedSourceRefs,
      tags,
      packet_ids: packetIds,
      decision_ids: decisionIds,
      owners,
      stale_status: merged.stale_status as KnowledgeSourceFreshness,
      conflict_status: merged.conflict_status as KnowledgeConflictStatus,
      risk_flags: normalizedRiskFlags,
      last_indexed_at: merged.last_indexed_at as string,
      live_collection_allowed: false,
    },
  };
}

function normalizeKnowledgeContextBundle(
  input: unknown,
): NormalizedKnowledgeContextBundle {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        knowledgeError(
          "knowledge_context_bundle.invalid_request",
          "",
          "Knowledge context bundle request must be an object.",
        ),
      ],
    };
  }

  const merged = { ...defaultKnowledgeContextBundle, ...input };
  const errors: KnowledgeRecordError[] = [];
  for (const key of Object.keys(input)) {
    if (!bundleKeys.has(key)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.unexpected_field",
          jsonPointer(key),
          "Unexpected knowledge context bundle field.",
        ),
      );
    }
  }

  if (typeof merged.bundle_id !== "string" || !stableId(merged.bundle_id)) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.invalid_bundle_id",
        "/bundle_id",
        "Knowledge context bundle_id must be a stable lowercase id.",
      ),
    );
  }

  validateSafeText(
    merged.objective,
    "/objective",
    "knowledge_context_bundle.invalid_objective",
    "Knowledge context bundle objective must be safe source-backed text.",
    errors,
  );

  const recordRefs = normalizeBundleRecordRefs(merged.record_refs, errors);
  const citationRefs = normalizeCitationRefs(merged.citation_refs, errors);
  const staleWarnings = normalizeWarnings(
    merged.stale_warnings,
    "/stale_warnings",
    errors,
  );
  const conflictWarnings = normalizeWarnings(
    merged.conflict_warnings,
    "/conflict_warnings",
    errors,
  );

  if (
    typeof merged.created_at !== "string" ||
    !isoDateTimePattern.test(merged.created_at)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.invalid_created_at",
        "/created_at",
        "Knowledge context bundle created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "live_collection_allowed") &&
    merged.live_collection_allowed !== false
  ) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.live_collection_forbidden",
        "/live_collection_allowed",
        "Knowledge context bundle cannot enable live collection.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "side_effects") &&
    (!Array.isArray(merged.side_effects) || merged.side_effects.length !== 0)
  ) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.side_effects_forbidden",
        "/side_effects",
        "Knowledge context bundle must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    bundle: {
      bundle_id: merged.bundle_id as string,
      objective: merged.objective as string,
      record_refs: recordRefs,
      citation_refs: citationRefs,
      stale_warnings: staleWarnings,
      conflict_warnings: conflictWarnings,
      created_at: merged.created_at as string,
      live_collection_allowed: false,
    },
  };
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: KnowledgeRecordError[],
): KnowledgeSourceRef[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        path,
        "Knowledge record requires at least one exact source ref.",
      ),
    );
    return [];
  }

  return value.flatMap((item, index) => {
    const ref = normalizeSourceRef(item, `${path}/${index}`, errors);
    return ref ? [ref] : [];
  });
}

function normalizeSourceRef(
  value: unknown,
  path: string,
  errors: KnowledgeRecordError[],
): KnowledgeSourceRef | null {
  if (!isPlainObject(value)) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        path,
        "Knowledge source ref must be an object.",
      ),
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!sourceRefKeys.has(key)) {
      errors.push(
        knowledgeError(
          "knowledge_record.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected knowledge source ref field.",
        ),
      );
    }
  }

  const refErrorsBefore = errors.length;
  validateSafePath(value.path, `${path}/path`, errors);

  if (
    Object.hasOwn(value, "heading") &&
    (typeof value.heading !== "string" || !safeText(value.heading, 120))
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        `${path}/heading`,
        "Knowledge source ref heading must be safe source-backed text.",
      ),
    );
  }

  if (!Number.isInteger(value.line_start) || (value.line_start as number) < 1) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        `${path}/line_start`,
        "Knowledge source ref line_start must be a positive integer.",
      ),
    );
  }

  if (
    !Number.isInteger(value.line_end) ||
    (value.line_end as number) < 1 ||
    (Number.isInteger(value.line_start) &&
      (value.line_end as number) < (value.line_start as number))
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        `${path}/line_end`,
        "Knowledge source ref line_end must be at or after line_start.",
      ),
    );
  }

  if (
    Number.isInteger(value.line_start) &&
    Number.isInteger(value.line_end) &&
    (value.line_end as number) - (value.line_start as number) > 240
  ) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        `${path}/line_end`,
        "Knowledge source ref line range is too broad for BP-0182.",
      ),
    );
  }

  validateOptionalHash(value.content_hash, `${path}/content_hash`, errors);
  validateOptionalHash(value.commit_ref, `${path}/commit_ref`, errors);

  if (errors.length > refErrorsBefore) {
    return null;
  }

  const normalized: KnowledgeSourceRef = {
    path: value.path as string,
    line_start: value.line_start as number,
    line_end: value.line_end as number,
  };
  if (typeof value.heading === "string") {
    normalized.heading = value.heading;
  }
  if (typeof value.content_hash === "string") {
    normalized.content_hash = value.content_hash;
  }
  if (typeof value.commit_ref === "string") {
    normalized.commit_ref = value.commit_ref;
  }

  return normalized;
}

function normalizeBundleRecordRefs(
  value: unknown,
  errors: KnowledgeRecordError[],
): KnowledgeContextBundleRecordRef[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.record_refs_required",
        "/record_refs",
        "Knowledge context bundle requires record refs.",
      ),
    );
    return [];
  }

  const refs: KnowledgeContextBundleRecordRef[] = [];
  value.forEach((item, index) => {
    const path = `/record_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_record_ref",
          path,
          "Knowledge context bundle record ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!bundleRecordRefKeys.has(key)) {
        errors.push(
          knowledgeError(
            "knowledge_context_bundle.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected context bundle record ref field.",
          ),
        );
      }
    }

    if (typeof item.record_id !== "string" || !stableId(item.record_id)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_record_ref",
          `${path}/record_id`,
          "Knowledge context bundle record_id must be stable.",
        ),
      );
    }
    const sourceRefs = normalizeSourceRefs(
      item.source_refs,
      `${path}/source_refs`,
      errors,
    );
    if (typeof item.relevance !== "string" || !relevanceValues.has(item.relevance)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_record_ref",
          `${path}/relevance`,
          "Knowledge context bundle record relevance is unsupported.",
        ),
      );
    }
    if (
      !Number.isInteger(item.token_estimate) ||
      (item.token_estimate as number) < 1 ||
      (item.token_estimate as number) > 4000
    ) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_record_ref",
          `${path}/token_estimate`,
          "Knowledge context bundle token_estimate is outside allowed bounds.",
        ),
      );
    }

    if (sourceRefs.length > 0) {
      refs.push({
        record_id: item.record_id as string,
        source_refs: sourceRefs,
        relevance: item.relevance as KnowledgeContextBundleRecordRef["relevance"],
        token_estimate: item.token_estimate as number,
      });
    }
  });

  return refs;
}

function normalizeCitationRefs(
  value: unknown,
  errors: KnowledgeRecordError[],
): KnowledgeCitationRef[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.citation_refs_required",
        "/citation_refs",
        "Knowledge context bundle requires citation refs.",
      ),
    );
    return [];
  }

  const refs: KnowledgeCitationRef[] = [];
  value.forEach((item, index) => {
    const path = `/citation_refs/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_citation_ref",
          path,
          "Knowledge citation ref must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!citationRefKeys.has(key)) {
        errors.push(
          knowledgeError(
            "knowledge_context_bundle.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected citation ref field.",
          ),
        );
      }
    }

    if (typeof item.citation_id !== "string" || !stableId(item.citation_id)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_citation_ref",
          `${path}/citation_id`,
          "Knowledge citation_id must be stable.",
        ),
      );
    }
    if (typeof item.record_id !== "string" || !stableId(item.record_id)) {
      errors.push(
        knowledgeError(
          "knowledge_context_bundle.invalid_citation_ref",
          `${path}/record_id`,
          "Knowledge citation record_id must be stable.",
        ),
      );
    }
    const sourceRef = normalizeSourceRef(item.source_ref, `${path}/source_ref`, errors);
    validateSafeText(
      item.summary,
      `${path}/summary`,
      "knowledge_context_bundle.invalid_citation_ref",
      "Knowledge citation summary must be safe source-backed text.",
      errors,
    );

    if (sourceRef) {
      refs.push({
        citation_id: item.citation_id as string,
        record_id: item.record_id as string,
        source_ref: sourceRef,
        summary: item.summary as string,
      });
    }
  });

  return refs;
}

function normalizeWarnings(
  value: unknown,
  path: string,
  errors: KnowledgeRecordError[],
): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(
      knowledgeError(
        "knowledge_context_bundle.invalid_warning",
        path,
        "Knowledge context bundle warnings must be an array.",
      ),
    );
    return [];
  }
  return normalizeStringArray(
    value,
    path,
    "knowledge_context_bundle.invalid_warning",
    "Knowledge context bundle warning must be safe source-backed text.",
    (item) => safeText(item, 180),
    errors,
  );
}

function normalizeRiskFlags(
  value: unknown,
  errors: KnowledgeRecordError[],
): KnowledgeRiskFlag[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_risk_flag",
        "/risk_flags",
        "Knowledge record risk_flags must be an array.",
      ),
    );
    return [];
  }
  const flags: KnowledgeRiskFlag[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !riskFlags.has(item as never)) {
      errors.push(
        knowledgeError(
          "knowledge_record.invalid_risk_flag",
          `/risk_flags/${index}`,
          "Knowledge record risk flag is unsupported.",
        ),
      );
      return;
    }
    flags.push(item as KnowledgeRiskFlag);
  });
  return [...new Set(flags)];
}

function normalizeStringArray(
  value: unknown,
  path: string,
  code: KnowledgeRecordErrorCode,
  message: string,
  isValid: (value: string) => boolean,
  errors: KnowledgeRecordError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(knowledgeError(code, path, message));
    return [];
  }
  const normalized: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !isValid(item) || unsafeText(item)) {
      errors.push(knowledgeError(code, `${path}/${index}`, message));
      return;
    }
    normalized.push(item);
  });
  return [...new Set(normalized)];
}

function validateSafePath(
  value: unknown,
  path: string,
  errors: KnowledgeRecordError[],
) {
  if (typeof value !== "string" || !safeRelativePath(value)) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_path",
        path,
        "Knowledge source path must be a safe repo-relative path.",
      ),
    );
    return;
  }
  if (unsafeText(value)) {
    errors.push(
      knowledgeError(
        "knowledge_record.secret_value_forbidden",
        path,
        "Knowledge source path cannot contain secret-like values.",
      ),
    );
  }
}

function validateSafeText(
  value: unknown,
  path: string,
  code: KnowledgeRecordErrorCode,
  message: string,
  errors: KnowledgeRecordError[],
) {
  if (typeof value !== "string" || !safeText(value)) {
    errors.push(knowledgeError(code, path, message));
    return;
  }
  if (unsafeText(value)) {
    errors.push(
      knowledgeError(
        code.startsWith("knowledge_context_bundle")
          ? "knowledge_context_bundle.secret_value_forbidden"
          : "knowledge_record.secret_value_forbidden",
        path,
        "Knowledge text cannot contain secret-like values.",
      ),
    );
  }
}

function validateOptionalHash(
  value: unknown,
  path: string,
  errors: KnowledgeRecordError[],
) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string" || !safeHashPattern.test(value) || unsafeText(value)) {
    errors.push(
      knowledgeError(
        "knowledge_record.invalid_source_ref",
        path,
        "Knowledge source ref hash placeholders must be safe.",
      ),
    );
  }
}

function dedupeSourceRefs(sourceRefs: KnowledgeSourceRef[]): KnowledgeSourceRef[] {
  const seen = new Set<string>();
  const deduped: KnowledgeSourceRef[] = [];
  for (const sourceRef of sourceRefs) {
    const key = `${sourceRef.path}:${sourceRef.heading ?? ""}:${sourceRef.line_start}:${sourceRef.line_end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(sourceRef);
  }
  return deduped;
}

function failKnowledgeRecord(errors: KnowledgeRecordError[]): KnowledgeRecordResult {
  return {
    ok: false,
    knowledge_record: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function failKnowledgeContextBundle(
  errors: KnowledgeRecordError[],
): KnowledgeContextBundleResult {
  return {
    ok: false,
    context_bundle: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function knowledgeError(
  code: KnowledgeRecordErrorCode,
  path: string,
  message: string,
): KnowledgeRecordError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function dedupeErrors(errors: KnowledgeRecordError[]): KnowledgeRecordError[] {
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

function stableId(value: string): boolean {
  return stableIdPattern.test(value) && !unsafeText(value);
}

function safeRelativePath(value: string): boolean {
  return (
    relativePathPattern.test(value) &&
    !value.startsWith("/") &&
    !value.startsWith(".") &&
    !value.includes("../") &&
    !value.includes("//") &&
    !value.includes("\\")
  );
}

function safeText(value: string, maxLength = 360): boolean {
  return (
    value.trim().length >= 3 && value.length <= maxLength && safeTextPattern.test(value)
  );
}

function unsafeText(value: string): boolean {
  return secretLikePattern.test(value) || commandLikePattern.test(value);
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

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
