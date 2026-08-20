import {
  createKnowledgeContextBundle,
  type KnowledgeCitationRef,
  type KnowledgeConflictStatus,
  type KnowledgeContextBundleEvidence,
  type KnowledgeContextBundleRecordRef,
  type KnowledgeRecordEvidence,
  type KnowledgeRiskFlag,
  type KnowledgeSourceFreshness,
  type KnowledgeSourceRef,
} from "./knowledge-record.js";
import {
  createLocalRepoKnowledgeIndex,
  type LocalRepoKnowledgeChunk,
  type LocalRepoKnowledgeIndexEvidence,
} from "./local-repo-knowledge-index.js";

export const KNOWLEDGE_SEARCH_CONTEXT_STATUS = "source_only";

export const knowledgeSearchContextContract = {
  contract_id: "lnsat.knowledge.search_context.v0_1",
  authority: ["@lnsat/packets", "source-backed-knowledge-search-context"],
  search_version: "0.1",
  search_modes: ["keyword", "path", "packet", "decision"],
  token_budget_min: 64,
  token_budget_max: 8000,
  source_docs: [
    "fixtures/knowledge/product-direction.md",
    "docs/architecture/INTERNAL_KNOWLEDGE_SURFACE.md",
    "fixtures/knowledge/packets/BP-0184.md",
  ],
  live_collection_allowed: false,
  mutation_allowed: false,
  gateway_route_allowed: false,
  mcp_tool_allowed: false,
  ui_allowed: false,
  db_allowed: false,
  embeddings_allowed: false,
  side_effects: [],
  status: "source_only_search_context",
} as const;

export type KnowledgeSearchMode =
  (typeof knowledgeSearchContextContract.search_modes)[number];

export type KnowledgeSearchRequest = {
  index?: LocalRepoKnowledgeIndexEvidence;
  query?: string;
  path?: string;
  packet_id?: string;
  decision_id?: string;
  limit?: number;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type KnowledgeSearchHit = {
  rank: number;
  score: number;
  match_modes: KnowledgeSearchMode[];
  match_reasons: string[];
  record_id: string;
  chunk_id: string;
  source_path: string;
  title: string;
  summary: string;
  source_refs: KnowledgeSourceRef[];
  source_expansion_refs: KnowledgeSourceRef[];
  citation_ref: KnowledgeCitationRef;
  packet_ids: string[];
  decision_ids: string[];
  stale_status: KnowledgeSourceFreshness;
  conflict_status: KnowledgeConflictStatus;
  risk_flags: KnowledgeRiskFlag[];
  token_estimate: number;
};

export type KnowledgeSearchEvidence = {
  contract_id: typeof knowledgeSearchContextContract.contract_id;
  search_version: typeof knowledgeSearchContextContract.search_version;
  index_id: string;
  query_terms: string[];
  requested_path?: string;
  requested_packet_id?: string;
  requested_decision_id?: string;
  hit_count: number;
  hits: KnowledgeSearchHit[];
  constraints: {
    source_only: true;
    read_only: true;
    local_index_only: true;
    citations_required: true;
    exact_source_refs_required: true;
    secret_values_allowed: false;
    live_collection_allowed: false;
    mutation_allowed: false;
    gateway_route_allowed: false;
    mcp_tool_allowed: false;
    ui_allowed: false;
    db_allowed: false;
    embeddings_allowed: false;
  };
  live_collection_allowed: false;
  side_effects: [];
};

export type KnowledgeContextCompileRequest = {
  search?: KnowledgeSearchRequest;
  bundle_id?: string;
  objective?: string;
  max_tokens?: number;
  created_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type CompiledKnowledgeContextBundleEvidence = {
  contract_id: typeof knowledgeSearchContextContract.contract_id;
  compiler_version: typeof knowledgeSearchContextContract.search_version;
  search: KnowledgeSearchEvidence;
  context_bundle: KnowledgeContextBundleEvidence;
  included_hit_count: number;
  token_budget: number;
  token_estimate: number;
  source_expansion_refs: KnowledgeSourceRef[];
  stale_warnings: string[];
  conflict_warnings: string[];
  risk_flags: KnowledgeRiskFlag[];
  constraints: {
    source_only: true;
    read_only: true;
    local_index_only: true;
    citations_required: true;
    exact_source_refs_required: true;
    no_mutation_path: true;
    secret_values_allowed: false;
    live_collection_allowed: false;
    mutation_allowed: false;
    gateway_route_allowed: false;
    mcp_tool_allowed: false;
    ui_allowed: false;
    db_allowed: false;
    embeddings_allowed: false;
  };
  live_collection_allowed: false;
  side_effects: [];
};

export type KnowledgeSearchContextErrorCode =
  | "knowledge_search_context.invalid_request"
  | "knowledge_search_context.unexpected_field"
  | "knowledge_search_context.invalid_index"
  | "knowledge_search_context.query_required"
  | "knowledge_search_context.invalid_query"
  | "knowledge_search_context.invalid_path"
  | "knowledge_search_context.invalid_packet_id"
  | "knowledge_search_context.invalid_decision_id"
  | "knowledge_search_context.invalid_limit"
  | "knowledge_search_context.invalid_bundle_id"
  | "knowledge_search_context.invalid_objective"
  | "knowledge_search_context.invalid_token_budget"
  | "knowledge_search_context.invalid_created_at"
  | "knowledge_search_context.no_hits"
  | "knowledge_search_context.context_bundle_invalid"
  | "knowledge_search_context.secret_value_forbidden"
  | "knowledge_search_context.live_collection_forbidden"
  | "knowledge_search_context.side_effects_forbidden";

export type KnowledgeSearchContextError = {
  code: KnowledgeSearchContextErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type KnowledgeSearchResult =
  | {
      ok: true;
      knowledge_search: KnowledgeSearchEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      knowledge_search: null;
      errors: KnowledgeSearchContextError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type KnowledgeContextCompileResult =
  | {
      ok: true;
      compiled_context_bundle: CompiledKnowledgeContextBundleEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      compiled_context_bundle: null;
      errors: KnowledgeSearchContextError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedKnowledgeSearchRequest = {
  index: LocalRepoKnowledgeIndexEvidence;
  query_terms: string[];
  path?: string;
  packet_id?: string;
  decision_id?: string;
  limit: number;
};

type NormalizedKnowledgeContextCompileRequest = {
  search: KnowledgeSearchRequest;
  bundle_id: string;
  objective: string;
  max_tokens: number;
  created_at: string;
};

type CandidateHit = Omit<KnowledgeSearchHit, "rank">;

const defaultKnowledgeSearchRequest: Required<
  Pick<KnowledgeSearchRequest, "limit" | "live_collection_allowed" | "side_effects">
> = {
  limit: 10,
  live_collection_allowed: false,
  side_effects: [],
};

const defaultKnowledgeContextCompileRequest: Required<
  Pick<
    KnowledgeContextCompileRequest,
    | "search"
    | "bundle_id"
    | "objective"
    | "max_tokens"
    | "created_at"
    | "live_collection_allowed"
    | "side_effects"
  >
> = {
  search: { query: "BP-0184 knowledge search context bundle" },
  bundle_id: "knowledge.bundle.bp0184.search_context",
  objective: "compile cited BP-0184 knowledge search context",
  max_tokens: 1200,
  created_at: "2026-05-16T00:00:00.000Z",
  live_collection_allowed: false,
  side_effects: [],
};

const searchRequestKeys = new Set([
  "index",
  "query",
  "path",
  "packet_id",
  "decision_id",
  "limit",
  "live_collection_allowed",
  "side_effects",
]);
const compileRequestKeys = new Set([
  "search",
  "bundle_id",
  "objective",
  "max_tokens",
  "created_at",
  "live_collection_allowed",
  "side_effects",
]);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const packetIdPattern = /^BP-\d{4}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const relativePathPattern =
  /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+(?:\.[A-Za-z0-9]+)?$/;
const safeTextPattern = /^[\w .,:;@/()[\]#_+=-]{3,360}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:)/i;
const commandLikePattern =
  /\b(rm -rf|ssh|sudo|root|secret\.read|credential\.read|database\.write|db\.write|drop table|delete from|deploy\.execute|dns\.write|cloudflare\.write|queue\.purge|docker\.socket|node_agent\.exec)\b/i;
const allowedRiskFlags = new Set<KnowledgeRiskFlag>([
  "stale_source",
  "conflicting_source",
  "policy_boundary",
  "approval_required",
  "runtime_boundary",
  "secret_like_rejected",
]);

export function searchLocalKnowledge(input: unknown = {}): KnowledgeSearchResult {
  const normalized = normalizeKnowledgeSearchRequest(input);

  if (!normalized.ok) {
    return failKnowledgeSearch(normalized.errors);
  }

  const candidates: CandidateHit[] = [];
  const recordsById = new Map(
    normalized.request.index.knowledge_records.map((record) => [
      record.record_id,
      record,
    ]),
  );

  for (const chunk of normalized.request.index.chunks) {
    const record = recordsById.get(chunk.record_id);
    if (!record) {
      continue;
    }
    const candidate = scoreChunk(chunk, record, normalized.request);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  const rankedHits = candidates
    .sort(compareCandidateHits)
    .slice(0, normalized.request.limit)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  return {
    ok: true,
    knowledge_search: {
      contract_id: knowledgeSearchContextContract.contract_id,
      search_version: knowledgeSearchContextContract.search_version,
      index_id: normalized.request.index.index_id,
      query_terms: normalized.request.query_terms,
      ...optionalEvidenceField("requested_path", normalized.request.path),
      ...optionalEvidenceField("requested_packet_id", normalized.request.packet_id),
      ...optionalEvidenceField("requested_decision_id", normalized.request.decision_id),
      hit_count: rankedHits.length,
      hits: rankedHits,
      constraints: {
        source_only: true,
        read_only: true,
        local_index_only: true,
        citations_required: true,
        exact_source_refs_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        mutation_allowed: false,
        gateway_route_allowed: false,
        mcp_tool_allowed: false,
        ui_allowed: false,
        db_allowed: false,
        embeddings_allowed: false,
      },
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function compileKnowledgeContextBundle(
  input: unknown = {},
): KnowledgeContextCompileResult {
  const normalized = normalizeKnowledgeContextCompileRequest(input);

  if (!normalized.ok) {
    return failKnowledgeContextCompile(normalized.errors);
  }

  const searchResult = searchLocalKnowledge(normalized.request.search);
  if (!searchResult.ok) {
    return failKnowledgeContextCompile(searchResult.errors);
  }
  if (searchResult.knowledge_search.hits.length === 0) {
    return failKnowledgeContextCompile([
      knowledgeSearchContextError(
        "knowledge_search_context.no_hits",
        "/search",
        "Knowledge context compiler requires at least one cited search hit.",
      ),
    ]);
  }

  const includedHits = selectHitsForTokenBudget(
    searchResult.knowledge_search.hits,
    normalized.request.max_tokens,
  );
  if (includedHits.length === 0) {
    return failKnowledgeContextCompile([
      knowledgeSearchContextError(
        "knowledge_search_context.no_hits",
        "/max_tokens",
        "Knowledge context compiler token budget excluded every cited hit.",
      ),
    ]);
  }

  const recordRefs: KnowledgeContextBundleRecordRef[] = includedHits.map(
    (hit, index) => ({
      record_id: hit.record_id,
      source_refs: hit.source_refs,
      relevance: relevanceForHit(hit, index),
      token_estimate: hit.token_estimate,
    }),
  );
  const citationRefs = includedHits.map((hit) => hit.citation_ref);
  const staleWarnings = createStaleWarnings(includedHits);
  const conflictWarnings = createConflictWarnings(includedHits);
  const sourceExpansionRefs = dedupeSourceRefs(
    includedHits.flatMap((hit) => hit.source_expansion_refs),
  );
  const riskFlags = dedupeStrings(includedHits.flatMap((hit) => hit.risk_flags))
    .filter(isKnowledgeRiskFlag)
    .sort();
  const tokenEstimate = includedHits.reduce(
    (total, hit) => total + hit.token_estimate,
    0,
  );

  const bundleResult = createKnowledgeContextBundle({
    bundle_id: normalized.request.bundle_id,
    objective: normalized.request.objective,
    record_refs: recordRefs,
    citation_refs: citationRefs,
    stale_warnings: staleWarnings,
    conflict_warnings: conflictWarnings,
    created_at: normalized.request.created_at,
    live_collection_allowed: false,
    side_effects: [],
  });

  if (!bundleResult.ok) {
    return failKnowledgeContextCompile([
      knowledgeSearchContextError(
        "knowledge_search_context.context_bundle_invalid",
        "/context_bundle",
        "Compiled context bundle failed BP-0182 validation.",
      ),
    ]);
  }

  return {
    ok: true,
    compiled_context_bundle: {
      contract_id: knowledgeSearchContextContract.contract_id,
      compiler_version: knowledgeSearchContextContract.search_version,
      search: searchResult.knowledge_search,
      context_bundle: bundleResult.context_bundle,
      included_hit_count: includedHits.length,
      token_budget: normalized.request.max_tokens,
      token_estimate: tokenEstimate,
      source_expansion_refs: sourceExpansionRefs,
      stale_warnings: staleWarnings,
      conflict_warnings: conflictWarnings,
      risk_flags: riskFlags,
      constraints: {
        source_only: true,
        read_only: true,
        local_index_only: true,
        citations_required: true,
        exact_source_refs_required: true,
        no_mutation_path: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        mutation_allowed: false,
        gateway_route_allowed: false,
        mcp_tool_allowed: false,
        ui_allowed: false,
        db_allowed: false,
        embeddings_allowed: false,
      },
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeKnowledgeSearchRequest(input: unknown):
  | {
      ok: true;
      request: NormalizedKnowledgeSearchRequest;
    }
  | {
      ok: false;
      errors: KnowledgeSearchContextError[];
    } {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        knowledgeSearchContextError(
          "knowledge_search_context.invalid_request",
          "",
          "Knowledge search request must be an object.",
        ),
      ],
    };
  }

  const merged: KnowledgeSearchRequest &
    Required<
      Pick<KnowledgeSearchRequest, "limit" | "live_collection_allowed" | "side_effects">
    > = { ...defaultKnowledgeSearchRequest, ...(input as KnowledgeSearchRequest) };
  const errors: KnowledgeSearchContextError[] = [];
  for (const key of Object.keys(input)) {
    if (!searchRequestKeys.has(key)) {
      errors.push(
        knowledgeSearchContextError(
          "knowledge_search_context.unexpected_field",
          jsonPointer(key),
          "Unexpected knowledge search field.",
        ),
      );
    }
  }

  const index = normalizeIndex(merged.index, errors);
  const queryTerms = normalizeQueryTerms(merged.query, errors);
  const path = normalizeOptionalPath(merged.path, "/path", errors);
  const packetId = normalizeOptionalPacketId(merged.packet_id, errors);
  const decisionId = normalizeOptionalDecisionId(merged.decision_id, errors);
  const limit = normalizeLimit(merged.limit, errors);

  if (
    queryTerms.length === 0 &&
    path === undefined &&
    packetId === undefined &&
    decisionId === undefined
  ) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.query_required",
        "",
        "Knowledge search requires query, path, packet_id, or decision_id.",
      ),
    );
  }

  validateLiveAndSideEffects(merged, errors);

  if (errors.length > 0 || !index) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  const request: NormalizedKnowledgeSearchRequest = {
    index,
    query_terms: queryTerms,
    limit,
  };
  if (path !== undefined) {
    request.path = path;
  }
  if (packetId !== undefined) {
    request.packet_id = packetId;
  }
  if (decisionId !== undefined) {
    request.decision_id = decisionId;
  }
  return { ok: true, request };
}

function normalizeKnowledgeContextCompileRequest(input: unknown):
  | {
      ok: true;
      request: NormalizedKnowledgeContextCompileRequest;
    }
  | {
      ok: false;
      errors: KnowledgeSearchContextError[];
    } {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        knowledgeSearchContextError(
          "knowledge_search_context.invalid_request",
          "",
          "Knowledge context compile request must be an object.",
        ),
      ],
    };
  }

  const merged = { ...defaultKnowledgeContextCompileRequest, ...input };
  const errors: KnowledgeSearchContextError[] = [];
  for (const key of Object.keys(input)) {
    if (!compileRequestKeys.has(key)) {
      errors.push(
        knowledgeSearchContextError(
          "knowledge_search_context.unexpected_field",
          jsonPointer(key),
          "Unexpected knowledge context compile field.",
        ),
      );
    }
  }

  if (!isPlainObject(merged.search)) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_request",
        "/search",
        "Knowledge context compiler requires a search request object.",
      ),
    );
  }

  if (typeof merged.bundle_id !== "string" || !stableId(merged.bundle_id)) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_bundle_id",
        "/bundle_id",
        "Knowledge context bundle_id must be a stable lowercase id.",
      ),
    );
  }
  if (typeof merged.objective !== "string" || !safeText(merged.objective, 360)) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_objective",
        "/objective",
        "Knowledge context objective must be safe source-backed text.",
      ),
    );
  }
  if (
    !Number.isInteger(merged.max_tokens) ||
    merged.max_tokens < knowledgeSearchContextContract.token_budget_min ||
    merged.max_tokens > knowledgeSearchContextContract.token_budget_max
  ) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_token_budget",
        "/max_tokens",
        "Knowledge context token budget is outside BP-0184 bounds.",
      ),
    );
  }
  if (
    typeof merged.created_at !== "string" ||
    !isoDateTimePattern.test(merged.created_at)
  ) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_created_at",
        "/created_at",
        "Knowledge context created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  validateLiveAndSideEffects(merged, errors);

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request: {
      search: merged.search as KnowledgeSearchRequest,
      bundle_id: merged.bundle_id,
      objective: merged.objective,
      max_tokens: merged.max_tokens,
      created_at: merged.created_at,
    },
  };
}

function normalizeIndex(
  value: unknown,
  errors: KnowledgeSearchContextError[],
): LocalRepoKnowledgeIndexEvidence | null {
  if (value === undefined) {
    const defaultIndex = createLocalRepoKnowledgeIndex();
    return defaultIndex.ok ? defaultIndex.local_repo_knowledge_index : null;
  }
  if (!isPlainObject(value)) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_index",
        "/index",
        "Knowledge search index must be BP-0183 local repo index evidence.",
      ),
    );
    return null;
  }
  if (
    typeof value.index_id !== "string" ||
    !Array.isArray(value.chunks) ||
    !Array.isArray(value.knowledge_records) ||
    value.live_collection_allowed !== false ||
    !Array.isArray(value.side_effects) ||
    value.side_effects.length !== 0
  ) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_index",
        "/index",
        "Knowledge search index must be source-only BP-0183 evidence.",
      ),
    );
    return null;
  }
  return value as LocalRepoKnowledgeIndexEvidence;
}

function normalizeQueryTerms(
  value: unknown,
  errors: KnowledgeSearchContextError[],
): string[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== "string" || !safeText(value, 240)) {
    errors.push(
      knowledgeSearchContextError(
        secretLike(value) || commandLike(value)
          ? "knowledge_search_context.secret_value_forbidden"
          : "knowledge_search_context.invalid_query",
        "/query",
        "Knowledge search query must be safe source-backed text.",
      ),
    );
    return [];
  }
  return tokenize(value);
}

function normalizeOptionalPath(
  value: unknown,
  path: string,
  errors: KnowledgeSearchContextError[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !safeRelativePath(value)) {
    errors.push(
      knowledgeSearchContextError(
        secretLike(value)
          ? "knowledge_search_context.secret_value_forbidden"
          : "knowledge_search_context.invalid_path",
        path,
        "Knowledge search path must be safe and repo-relative.",
      ),
    );
    return undefined;
  }
  return value;
}

function normalizeOptionalPacketId(
  value: unknown,
  errors: KnowledgeSearchContextError[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !packetIdPattern.test(value)) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_packet_id",
        "/packet_id",
        "Knowledge search packet_id must use BP-0000 shape.",
      ),
    );
    return undefined;
  }
  return value;
}

function normalizeOptionalDecisionId(
  value: unknown,
  errors: KnowledgeSearchContextError[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !stableId(value)) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_decision_id",
        "/decision_id",
        "Knowledge search decision_id must be a stable lowercase id.",
      ),
    );
    return undefined;
  }
  return value;
}

function normalizeLimit(value: unknown, errors: KnowledgeSearchContextError[]): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 20) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.invalid_limit",
        "/limit",
        "Knowledge search limit must be an integer from 1 to 20.",
      ),
    );
    return defaultKnowledgeSearchRequest.limit;
  }
  return value as number;
}

function scoreChunk(
  chunk: LocalRepoKnowledgeChunk,
  record: KnowledgeRecordEvidence,
  request: NormalizedKnowledgeSearchRequest,
): CandidateHit | null {
  const matchModes = new Set<KnowledgeSearchMode>();
  const matchReasons: string[] = [];
  let score = 0;

  if (request.query_terms.length > 0) {
    const queryScore = scoreQueryTerms(chunk, record, request.query_terms);
    if (queryScore <= 0) {
      return null;
    }
    score += queryScore;
    matchModes.add("keyword");
    matchReasons.push("keyword terms matched local knowledge text");
  }

  if (request.path !== undefined) {
    if (!matchesRequestedPath(chunk.source_path, request.path)) {
      return null;
    }
    score += chunk.source_path === request.path ? 20 : 12;
    matchModes.add("path");
    matchReasons.push("source path matched requested path");
  }

  if (request.packet_id !== undefined) {
    const packetIds = new Set([...chunk.packet_ids, ...record.packet_ids]);
    if (!packetIds.has(request.packet_id)) {
      return null;
    }
    score += 16;
    matchModes.add("packet");
    matchReasons.push("packet id matched local knowledge record");
  }

  if (request.decision_id !== undefined) {
    const decisionIds = new Set([...chunk.decision_ids, ...record.decision_ids]);
    if (!decisionIds.has(request.decision_id)) {
      return null;
    }
    score += 16;
    matchModes.add("decision");
    matchReasons.push("decision id matched local knowledge record");
  }

  return {
    score,
    match_modes: [...matchModes].sort(),
    match_reasons: matchReasons,
    record_id: record.record_id,
    chunk_id: chunk.chunk_id,
    source_path: chunk.source_path,
    title: record.title,
    summary: record.summary,
    source_refs: record.source_refs,
    source_expansion_refs: dedupeSourceRefs([chunk.source_ref, ...record.source_refs]),
    citation_ref: {
      citation_id: createCitationId(record.record_id, chunk.source_ref),
      record_id: record.record_id,
      source_ref: chunk.source_ref,
      summary: record.summary,
    },
    packet_ids: dedupeStrings([...chunk.packet_ids, ...record.packet_ids]).sort(),
    decision_ids: dedupeStrings([...chunk.decision_ids, ...record.decision_ids]).sort(),
    stale_status: record.stale_status,
    conflict_status: record.conflict_status,
    risk_flags: [...record.risk_flags].sort(),
    token_estimate: Math.max(1, Math.min(chunk.token_estimate, 4000)),
  };
}

function scoreQueryTerms(
  chunk: LocalRepoKnowledgeChunk,
  record: KnowledgeRecordEvidence,
  terms: string[],
): number {
  const title = tokenize(`${record.title} ${chunk.title}`).join(" ");
  const heading = tokenize(chunk.heading).join(" ");
  const summary = tokenize(record.summary).join(" ");
  const body = tokenize(chunk.normalized_text).join(" ");
  const tags = tokenize([...chunk.tags, ...record.tags].join(" ")).join(" ");
  const path = tokenize(chunk.source_path).join(" ");

  let score = 0;
  for (const term of terms) {
    let matched = false;
    if (title.includes(term)) {
      score += 8;
      matched = true;
    }
    if (heading.includes(term)) {
      score += 6;
      matched = true;
    }
    if (summary.includes(term)) {
      score += 4;
      matched = true;
    }
    if (body.includes(term)) {
      score += 3;
      matched = true;
    }
    if (tags.includes(term)) {
      score += 2;
      matched = true;
    }
    if (path.includes(term)) {
      score += 1;
      matched = true;
    }
    if (!matched) {
      score -= 2;
    }
  }
  return score;
}

function compareCandidateHits(left: CandidateHit, right: CandidateHit): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if (left.source_path !== right.source_path) {
    return left.source_path.localeCompare(right.source_path);
  }
  const leftRef = left.source_refs[0];
  const rightRef = right.source_refs[0];
  return (leftRef?.line_start ?? 0) - (rightRef?.line_start ?? 0);
}

function selectHitsForTokenBudget(
  hits: KnowledgeSearchHit[],
  maxTokens: number,
): KnowledgeSearchHit[] {
  const selected: KnowledgeSearchHit[] = [];
  let total = 0;
  for (const hit of hits) {
    if (selected.length === 0 || total + hit.token_estimate <= maxTokens) {
      selected.push(hit);
      total += hit.token_estimate;
    }
  }
  return selected;
}

function relevanceForHit(
  hit: KnowledgeSearchHit,
  index: number,
): KnowledgeContextBundleRecordRef["relevance"] {
  if (hit.conflict_status !== "none" || hit.stale_status === "stale") {
    return "warning";
  }
  if (hit.risk_flags.includes("policy_boundary")) {
    return index === 0 ? "primary" : "constraint";
  }
  return index === 0 ? "primary" : "supporting";
}

function createStaleWarnings(hits: KnowledgeSearchHit[]): string[] {
  return dedupeStrings(
    hits
      .filter((hit) => hit.stale_status === "stale")
      .map((hit) => `stale source ${hit.source_path}`),
  ).sort();
}

function createConflictWarnings(hits: KnowledgeSearchHit[]): string[] {
  return dedupeStrings(
    hits
      .filter(
        (hit) =>
          hit.conflict_status !== "none" ||
          hit.risk_flags.includes("conflicting_source"),
      )
      .map((hit) => `conflict warning ${hit.source_path}`),
  ).sort();
}

function validateLiveAndSideEffects(
  input: Record<string, unknown>,
  errors: KnowledgeSearchContextError[],
): void {
  if (
    Object.hasOwn(input, "live_collection_allowed") &&
    input.live_collection_allowed !== false
  ) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.live_collection_forbidden",
        "/live_collection_allowed",
        "Knowledge search context cannot enable live collection.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      knowledgeSearchContextError(
        "knowledge_search_context.side_effects_forbidden",
        "/side_effects",
        "Knowledge search context must preserve side_effects: [].",
      ),
    );
  }
}

function tokenize(value: string): string[] {
  return dedupeStrings(
    value
      .toLowerCase()
      .replace(/bp-(\d{4})/g, "bp$1 bp-$1")
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 2 && term.length <= 48),
  );
}

function createCitationId(recordId: string, sourceRef: KnowledgeSourceRef): string {
  return `citation.${pathSlug(recordId)}.${sourceRef.line_start}_${sourceRef.line_end}`.slice(
    0,
    127,
  );
}

function matchesRequestedPath(sourcePath: string, requestedPath: string): boolean {
  if (requestedPath.endsWith("/")) {
    return sourcePath.startsWith(requestedPath);
  }
  return sourcePath === requestedPath;
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

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function optionalEvidenceField<TKey extends string>(
  key: TKey,
  value: string | undefined,
): Partial<Record<TKey, string>> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Record<TKey, string>>);
}

function safeRelativePath(value: string): boolean {
  return (
    relativePathPattern.test(value) &&
    !value.startsWith("/") &&
    !value.startsWith(".") &&
    !value.includes("../") &&
    !value.includes("//") &&
    !value.includes("\\") &&
    !secretLikePattern.test(value)
  );
}

function safeText(value: string, maxLength: number): boolean {
  return (
    value.length >= 3 &&
    value.length <= maxLength &&
    safeTextPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !commandLikePattern.test(value)
  );
}

function stableId(value: string): boolean {
  return stableIdPattern.test(value) && !secretLikePattern.test(value);
}

function secretLike(value: unknown): boolean {
  return typeof value === "string" && secretLikePattern.test(value);
}

function commandLike(value: unknown): boolean {
  return typeof value === "string" && commandLikePattern.test(value);
}

function isKnowledgeRiskFlag(value: string): value is KnowledgeRiskFlag {
  return allowedRiskFlags.has(value as KnowledgeRiskFlag);
}

function pathSlug(path: string): string {
  const slug = path
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "local_knowledge";
}

function failKnowledgeSearch(
  errors: KnowledgeSearchContextError[],
): KnowledgeSearchResult {
  return {
    ok: false,
    knowledge_search: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function failKnowledgeContextCompile(
  errors: KnowledgeSearchContextError[],
): KnowledgeContextCompileResult {
  return {
    ok: false,
    compiled_context_bundle: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function knowledgeSearchContextError(
  code: KnowledgeSearchContextErrorCode,
  path: string,
  message: string,
): KnowledgeSearchContextError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function dedupeErrors(
  errors: KnowledgeSearchContextError[],
): KnowledgeSearchContextError[] {
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
