import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileKnowledgeContextBundle,
  createLocalRepoKnowledgeIndex,
  searchLocalKnowledge,
  type CompiledKnowledgeContextBundleEvidence,
  type KnowledgeCitationRef,
  type KnowledgeRiskFlag,
  type KnowledgeSearchContextError,
  type KnowledgeSearchEvidence,
  type KnowledgeSearchRequest,
  type KnowledgeSourceFreshness,
  type KnowledgeSourceKind,
  type KnowledgeSourceRef,
  type LocalRepoKnowledgeFileInput,
  type LocalRepoKnowledgeIndexEvidence,
} from "@lnsat/packets";

export const KNOWLEDGE_GATEWAY_STATUS = "read_only";

export const knowledgeGatewaySourcesContract = {
  contract_id: "lnsat.gateway.knowledge.sources.v0_1",
  method: "GET",
  path: "/v1/knowledge/sources",
  authority: ["LNSAT Gateway", "@lnsat/packets", "repo-local-source-evidence"],
  source_docs: [
    "fixtures/knowledge/product-direction.md",
    "docs/architecture/INTERNAL_KNOWLEDGE_SURFACE.md",
    "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    "fixtures/knowledge/packets/BP-0182.md",
    "fixtures/knowledge/packets/BP-0183.md",
    "fixtures/knowledge/packets/BP-0184.md",
    "fixtures/knowledge/packets/BP-0188.md",
    "fixtures/knowledge/packets/BP-0192.md",
  ],
  live_collection_allowed: false,
  mutation_allowed: false,
  db_allowed: false,
  queue_allowed: false,
  runtime_allowed: false,
  mcp_tool_allowed: false,
  side_effects: [],
  status: "read_only_route",
} as const;

export const knowledgeGatewaySearchContract = {
  contract_id: "lnsat.gateway.knowledge.search.v0_1",
  method: "GET",
  path: "/v1/knowledge/search",
  authority: ["LNSAT Gateway", "@lnsat/packets", "repo-local-source-evidence"],
  source_docs: knowledgeGatewaySourcesContract.source_docs,
  live_collection_allowed: false,
  mutation_allowed: false,
  db_allowed: false,
  queue_allowed: false,
  runtime_allowed: false,
  mcp_tool_allowed: false,
  side_effects: [],
  status: "read_only_route",
} as const;

export const knowledgeGatewayContextCompileContract = {
  contract_id: "lnsat.gateway.knowledge.context_compile.v0_1",
  method: "POST",
  path: "/v1/knowledge/context/compile",
  authority: ["LNSAT Gateway", "@lnsat/packets", "repo-local-source-evidence"],
  source_docs: knowledgeGatewaySourcesContract.source_docs,
  live_collection_allowed: false,
  mutation_allowed: false,
  db_allowed: false,
  queue_allowed: false,
  runtime_allowed: false,
  mcp_tool_allowed: false,
  side_effects: [],
  status: "read_only_route",
} as const;

export type KnowledgeGatewayRequestErrorCode =
  | "knowledge_gateway.invalid_request"
  | "knowledge_gateway.unexpected_field"
  | "knowledge_gateway.invalid_request_id"
  | "knowledge_gateway.invalid_limit"
  | "knowledge_gateway.invalid_max_tokens"
  | "knowledge_gateway.forbidden_mutation"
  | "knowledge_gateway.forbidden_live_collection"
  | "knowledge_gateway.forbidden_db_write"
  | "knowledge_gateway.forbidden_queue"
  | "knowledge_gateway.forbidden_runtime"
  | "knowledge_gateway.forbidden_credential"
  | "knowledge_gateway.source_unavailable";

export type KnowledgeGatewayRequestError = {
  code: KnowledgeGatewayRequestErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type KnowledgeGatewaySourceSummary = {
  index_id: string;
  source_count: number;
  record_count: number;
  chunk_count: number;
  warning_count: number;
  source_refs: KnowledgeSourceRef[];
  warning_records: Array<{
    record_id: string;
    source_path: string;
    stale_status: KnowledgeSourceFreshness;
    conflict_status: string;
    risk_flags: KnowledgeRiskFlag[];
  }>;
  live_collection_allowed: false;
  side_effects: [];
};

export type KnowledgeGatewayEndpoint = {
  contract_id: string;
  method: string;
  path: string;
  status: string;
};

export type KnowledgeGatewayConstraints = {
  gateway_owned: true;
  open_source_self_deploy: true;
  user_owned_integrations: true;
  auth_provider_locked: false;
  supported_future_auth_modes: [
    "local_auth",
    "third_party_auth",
    "user_selected_auth_levels",
  ];
  live_auth_provider_configured: false;
  source_only: true;
  read_only: true;
  local_index_only: true;
  citations_required: true;
  exact_source_refs_required: true;
  no_mutation_path: true;
  secret_values_allowed: false;
  live_collection_allowed: false;
  mutation_allowed: false;
  db_allowed: false;
  queue_allowed: false;
  runtime_allowed: false;
  mcp_tool_allowed: false;
};

export type KnowledgeGatewaySourcesResponse =
  | {
      ok: true;
      contract_id: typeof knowledgeGatewaySourcesContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      index: KnowledgeGatewaySourceSummary;
      sources: LocalRepoKnowledgeIndexEvidence["source_registry"];
      endpoints: KnowledgeGatewayEndpoint[];
      constraints: KnowledgeGatewayConstraints;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof knowledgeGatewaySourcesContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      request_errors: KnowledgeGatewayRequestError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type KnowledgeGatewaySearchResponse =
  | {
      ok: true;
      contract_id: typeof knowledgeGatewaySearchContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      search: KnowledgeSearchEvidence;
      hits: KnowledgeSearchEvidence["hits"];
      source_refs: KnowledgeSourceRef[];
      citation_refs: KnowledgeCitationRef[];
      stale_warnings: string[];
      conflict_warnings: string[];
      risk_flags: KnowledgeRiskFlag[];
      constraints: KnowledgeGatewayConstraints;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof knowledgeGatewaySearchContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      request_errors: KnowledgeGatewayRequestError[];
      search_errors: KnowledgeSearchContextError[];
      search: null;
      raw_input_content: "withheld";
      side_effects: [];
    };

export type KnowledgeGatewayContextCompileResponse =
  | {
      ok: true;
      contract_id: typeof knowledgeGatewayContextCompileContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      compiled_context_bundle: CompiledKnowledgeContextBundleEvidence;
      source_refs: KnowledgeSourceRef[];
      citation_refs: KnowledgeCitationRef[];
      stale_warnings: string[];
      conflict_warnings: string[];
      risk_flags: KnowledgeRiskFlag[];
      constraints: KnowledgeGatewayConstraints;
      side_effects: [];
    }
  | {
      ok: false;
      contract_id: typeof knowledgeGatewayContextCompileContract.contract_id;
      request_id: string | null;
      source_docs: string[];
      request_errors: KnowledgeGatewayRequestError[];
      compile_errors: KnowledgeSearchContextError[];
      compiled_context_bundle: null;
      raw_input_content: "withheld";
      side_effects: [];
    };

type KnowledgeSourceSpec = {
  path: string;
  source_kind: KnowledgeSourceKind;
  freshness: KnowledgeSourceFreshness;
  include_headings: string[];
};

type NormalizedRequestId =
  | {
      ok: true;
      request_id: string | null;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: KnowledgeGatewayRequestError[];
    };

type NormalizedSearchGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      search: Omit<KnowledgeSearchRequest, "index">;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: KnowledgeGatewayRequestError[];
    };

type NormalizedCompileGatewayRequest =
  | {
      ok: true;
      request_id: string | null;
      search: Omit<KnowledgeSearchRequest, "index">;
      bundle_id: string | undefined;
      objective: string | undefined;
      max_tokens: number | undefined;
      created_at: string | undefined;
    }
  | {
      ok: false;
      request_id: string | null;
      errors: KnowledgeGatewayRequestError[];
    };

const generatedAt = "2026-05-16T00:00:00.000Z";
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const requestIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const forbiddenLinePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|credential|secret:)/i;
const forbiddenCredentialPattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|credential|secret:)/i;
const sourceRequestKeys = new Set(["request_id"]);
const searchRequestKeys = new Set([
  "request_id",
  "query",
  "path",
  "packet_id",
  "decision_id",
  "limit",
  "live_collection_allowed",
  "side_effects",
]);
const nestedSearchRequestKeys = new Set(
  [...searchRequestKeys].filter((key) => key !== "request_id"),
);
const compileRequestKeys = new Set([
  "request_id",
  "search",
  "bundle_id",
  "objective",
  "max_tokens",
  "created_at",
  "live_collection_allowed",
  "side_effects",
]);
const forbiddenGatewayFields = new Map<string, KnowledgeGatewayRequestErrorCode>([
  ["mutation", "knowledge_gateway.forbidden_mutation"],
  ["mutation_allowed", "knowledge_gateway.forbidden_mutation"],
  ["approve", "knowledge_gateway.forbidden_mutation"],
  ["deny", "knowledge_gateway.forbidden_mutation"],
  ["write", "knowledge_gateway.forbidden_mutation"],
  ["write_api", "knowledge_gateway.forbidden_mutation"],
  ["db_write", "knowledge_gateway.forbidden_db_write"],
  ["database_write", "knowledge_gateway.forbidden_db_write"],
  ["migration", "knowledge_gateway.forbidden_db_write"],
  ["queue", "knowledge_gateway.forbidden_queue"],
  ["runtime", "knowledge_gateway.forbidden_runtime"],
  ["runtime_dispatcher", "knowledge_gateway.forbidden_runtime"],
  ["live_execution", "knowledge_gateway.forbidden_runtime"],
  ["credential", "knowledge_gateway.forbidden_credential"],
  ["secret", "knowledge_gateway.forbidden_credential"],
]);

const knowledgeSourceSpecs: KnowledgeSourceSpec[] = [
  {
    path: "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
    source_kind: "architecture_doc",
    freshness: "current",
    include_headings: [
      "Authentication Modes",
      "Authorization Levels",
      "Integration Descriptor",
      "Current Product Boundary",
      "Deployment Ownership",
    ],
  },
  {
    path: "docs/ROADMAP.md",
    source_kind: "repo_doc",
    freshness: "current",
    include_headings: ["Current Foundation", "Next", "Later"],
  },
  {
    path: "fixtures/knowledge/product-direction.md",
    source_kind: "repo_doc",
    freshness: "current",
    include_headings: ["Product Thesis", "System A", "MVP Acceptance"],
  },
  {
    path: "docs/architecture/INTERNAL_KNOWLEDGE_SURFACE.md",
    source_kind: "architecture_doc",
    freshness: "current",
    include_headings: [
      "Source Flow",
      "Knowledge Record",
      "Context Safety",
      "Evaluation",
      "Persistence Boundary",
    ],
  },
  {
    path: "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
    source_kind: "architecture_doc",
    freshness: "current",
    include_headings: [
      "Product Routes",
      "Shared Presentation Rules",
      "Read-Only Boundary",
      "Data Boundary",
      "Validation",
    ],
  },
  {
    path: "fixtures/knowledge/packets/BP-0182.md",
    source_kind: "packet_doc",
    freshness: "recent",
    include_headings: ["Objective", "Scope", "Acceptance Checks", "Result"],
  },
  {
    path: "fixtures/knowledge/packets/BP-0183.md",
    source_kind: "packet_doc",
    freshness: "recent",
    include_headings: ["Objective", "Scope", "Acceptance Checks", "Result"],
  },
  {
    path: "fixtures/knowledge/packets/BP-0184.md",
    source_kind: "packet_doc",
    freshness: "recent",
    include_headings: ["Objective", "Scope", "Acceptance Checks", "Result"],
  },
  {
    path: "fixtures/knowledge/packets/BP-0188.md",
    source_kind: "packet_doc",
    freshness: "current",
    include_headings: [
      "Objective",
      "Scope",
      "Acceptance Checks",
      "Result",
      "Non-Goals",
    ],
  },
  {
    path: "fixtures/knowledge/decision-history.md",
    source_kind: "decision_doc",
    freshness: "stale",
    include_headings: ["Standing Decision: Hard Live Gates Stay Closed"],
  },
];

export async function inspectKnowledgeGatewaySourcesRequest(
  input: unknown,
): Promise<KnowledgeGatewaySourcesResponse> {
  const normalized = normalizeRequestId(input, sourceRequestKeys);
  if (!normalized.ok) {
    return knowledgeSourcesFailure(normalized.request_id, normalized.errors);
  }

  const index = await buildGatewayKnowledgeIndex();
  if (!index.ok) {
    return knowledgeSourcesFailure(normalized.request_id, index.errors);
  }

  return {
    ok: true,
    contract_id: knowledgeGatewaySourcesContract.contract_id,
    request_id: normalized.request_id,
    source_docs: knowledgeGatewaySourceDocs(),
    index: summarizeIndex(index.index),
    sources: index.index.source_registry,
    endpoints: knowledgeGatewayEndpoints(),
    constraints: knowledgeGatewayConstraints(),
    side_effects: [],
  };
}

export async function inspectKnowledgeGatewaySearchRequest(
  input: unknown,
): Promise<KnowledgeGatewaySearchResponse> {
  const normalized = normalizeSearchGatewayRequest(input);
  if (!normalized.ok) {
    return knowledgeSearchFailure(normalized.request_id, normalized.errors);
  }

  const index = await buildGatewayKnowledgeIndex();
  if (!index.ok) {
    return knowledgeSearchFailure(normalized.request_id, index.errors);
  }

  const searchResult = searchLocalKnowledge({
    ...normalized.search,
    index: index.index,
    live_collection_allowed: false,
    side_effects: [],
  });

  if (!searchResult.ok) {
    return knowledgeSearchFailure(normalized.request_id, [], searchResult.errors);
  }

  const hits = searchResult.knowledge_search.hits;
  return {
    ok: true,
    contract_id: knowledgeGatewaySearchContract.contract_id,
    request_id: normalized.request_id,
    source_docs: knowledgeGatewaySourceDocs(),
    search: searchResult.knowledge_search,
    hits,
    source_refs: dedupeSourceRefs(hits.flatMap((hit) => hit.source_refs)),
    citation_refs: hits.map((hit) => hit.citation_ref),
    stale_warnings: createSearchStaleWarnings(hits),
    conflict_warnings: createSearchConflictWarnings(hits),
    risk_flags: dedupeRiskFlags(hits.flatMap((hit) => hit.risk_flags)),
    constraints: knowledgeGatewayConstraints(),
    side_effects: [],
  };
}

export async function inspectKnowledgeGatewayContextCompileRequest(
  input: unknown,
): Promise<KnowledgeGatewayContextCompileResponse> {
  const normalized = normalizeCompileGatewayRequest(input);
  if (!normalized.ok) {
    return knowledgeContextCompileFailure(normalized.request_id, normalized.errors);
  }

  const index = await buildGatewayKnowledgeIndex();
  if (!index.ok) {
    return knowledgeContextCompileFailure(normalized.request_id, index.errors);
  }

  const compileRequest = {
    search: {
      ...normalized.search,
      index: index.index,
      live_collection_allowed: false,
      side_effects: [],
    },
    live_collection_allowed: false,
    side_effects: [],
  };
  const compileResult = compileKnowledgeContextBundle({
    ...compileRequest,
    ...optionalValue("bundle_id", normalized.bundle_id),
    ...optionalValue("objective", normalized.objective),
    ...optionalValue("max_tokens", normalized.max_tokens),
    ...optionalValue("created_at", normalized.created_at),
  });

  if (!compileResult.ok) {
    return knowledgeContextCompileFailure(
      normalized.request_id,
      [],
      compileResult.errors,
    );
  }

  const bundle = compileResult.compiled_context_bundle;
  return {
    ok: true,
    contract_id: knowledgeGatewayContextCompileContract.contract_id,
    request_id: normalized.request_id,
    source_docs: knowledgeGatewaySourceDocs(),
    compiled_context_bundle: bundle,
    source_refs: dedupeSourceRefs(
      bundle.context_bundle.record_refs.flatMap((record) => record.source_refs),
    ),
    citation_refs: bundle.context_bundle.citation_refs,
    stale_warnings: bundle.stale_warnings,
    conflict_warnings: bundle.conflict_warnings,
    risk_flags: bundle.risk_flags,
    constraints: knowledgeGatewayConstraints(),
    side_effects: [],
  };
}

function normalizeRequestId(
  input: unknown,
  allowedKeys: Set<string>,
): NormalizedRequestId {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        knowledgeGatewayError(
          "knowledge_gateway.invalid_request",
          "",
          "Knowledge Gateway request must be an object.",
        ),
      ],
    };
  }

  const errors = validateRequestEnvelope(input, allowedKeys);
  const requestId = normalizeRequestIdValue(input, errors);
  return errors.length > 0
    ? { ok: false, request_id: requestId, errors }
    : { ok: true, request_id: requestId };
}

function normalizeSearchGatewayRequest(input: unknown): NormalizedSearchGatewayRequest {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        knowledgeGatewayError(
          "knowledge_gateway.invalid_request",
          "",
          "Knowledge Gateway search request must be an object.",
        ),
      ],
    };
  }

  const errors = validateRequestEnvelope(input, searchRequestKeys);
  const requestId = normalizeRequestIdValue(input, errors);
  const search = normalizeSearchPayload(input, "", errors);

  return errors.length > 0
    ? { ok: false, request_id: requestId, errors: dedupeGatewayErrors(errors) }
    : { ok: true, request_id: requestId, search };
}

function normalizeCompileGatewayRequest(
  input: unknown,
): NormalizedCompileGatewayRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      request_id: null,
      errors: [
        knowledgeGatewayError(
          "knowledge_gateway.invalid_request",
          "",
          "Knowledge Gateway context compile request must be an object.",
        ),
      ],
    };
  }

  const errors = validateRequestEnvelope(input, compileRequestKeys);
  const requestId = normalizeRequestIdValue(input, errors);
  const searchInput = Object.hasOwn(input, "search") ? input.search : {};
  if (!isPlainObject(searchInput)) {
    errors.push(
      knowledgeGatewayError(
        "knowledge_gateway.invalid_request",
        "/search",
        "Knowledge Gateway context compile search must be an object.",
      ),
    );
  }
  const search = isPlainObject(searchInput)
    ? normalizeSearchPayload(searchInput, "/search", errors)
    : {};
  const maxTokens = normalizeOptionalNumber(
    input.max_tokens,
    "/max_tokens",
    "knowledge_gateway.invalid_max_tokens",
    errors,
  );

  return errors.length > 0
    ? { ok: false, request_id: requestId, errors: dedupeGatewayErrors(errors) }
    : {
        ok: true,
        request_id: requestId,
        search,
        bundle_id: optionalString(input.bundle_id),
        objective: optionalString(input.objective),
        max_tokens: maxTokens,
        created_at: optionalString(input.created_at),
      };
}

function normalizeSearchPayload(
  input: Record<string, unknown>,
  basePath: string,
  errors: KnowledgeGatewayRequestError[],
): Omit<KnowledgeSearchRequest, "index"> {
  validateRequestEnvelope(
    input,
    basePath === "" ? searchRequestKeys : nestedSearchRequestKeys,
    basePath,
    errors,
  );
  const limit = normalizeOptionalNumber(
    input.limit,
    `${basePath}/limit`,
    "knowledge_gateway.invalid_limit",
    errors,
  );
  const search: Omit<KnowledgeSearchRequest, "index"> = {
    live_collection_allowed: false,
    side_effects: [],
  };

  addOptionalSearchString(search, "query", input.query);
  addOptionalSearchString(search, "path", input.path);
  addOptionalSearchString(search, "packet_id", input.packet_id);
  addOptionalSearchString(search, "decision_id", input.decision_id);
  if (limit !== undefined) {
    search.limit = limit;
  }

  return search;
}

function validateRequestEnvelope(
  input: Record<string, unknown>,
  allowedKeys: Set<string>,
  basePath = "",
  existingErrors: KnowledgeGatewayRequestError[] = [],
): KnowledgeGatewayRequestError[] {
  const errors = existingErrors;
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      errors.push(
        knowledgeGatewayError(
          forbiddenGatewayFields.get(key) ?? "knowledge_gateway.unexpected_field",
          `${basePath}${jsonPointer(key)}`,
          forbiddenGatewayFields.has(key)
            ? "Knowledge Gateway request field is blocked by current packet boundary."
            : "Unexpected Knowledge Gateway request field.",
        ),
      );
    }
  }

  if (
    input.live_collection_allowed === true ||
    input.live_collection_allowed === "true"
  ) {
    errors.push(
      knowledgeGatewayError(
        "knowledge_gateway.forbidden_live_collection",
        `${basePath}/live_collection_allowed`,
        "Knowledge Gateway live collection is blocked.",
      ),
    );
  }
  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length > 0)
  ) {
    errors.push(
      knowledgeGatewayError(
        "knowledge_gateway.forbidden_mutation",
        `${basePath}/side_effects`,
        "Knowledge Gateway side effects are blocked.",
      ),
    );
  }

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && forbiddenCredentialPattern.test(value)) {
      errors.push(
        knowledgeGatewayError(
          "knowledge_gateway.forbidden_credential",
          `${basePath}${jsonPointer(key)}`,
          "Knowledge Gateway credential-like values are blocked.",
        ),
      );
    }
  }

  return errors;
}

function normalizeRequestIdValue(
  input: Record<string, unknown>,
  errors: KnowledgeGatewayRequestError[],
): string | null {
  const requestId = optionalString(input.request_id);
  if (
    Object.hasOwn(input, "request_id") &&
    (requestId === undefined || !requestIdPattern.test(requestId))
  ) {
    errors.push(
      knowledgeGatewayError(
        "knowledge_gateway.invalid_request_id",
        "/request_id",
        "Knowledge Gateway request_id must be a safe stable id.",
      ),
    );
    return null;
  }
  return requestId ?? null;
}

function normalizeOptionalNumber(
  value: unknown,
  path: string,
  code: "knowledge_gateway.invalid_limit" | "knowledge_gateway.invalid_max_tokens",
  errors: KnowledgeGatewayRequestError[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    errors.push(
      knowledgeGatewayError(
        code,
        path,
        "Knowledge Gateway numeric request value must be a positive integer.",
      ),
    );
    return undefined;
  }
  return numberValue;
}

async function buildGatewayKnowledgeIndex(): Promise<
  | { ok: true; index: LocalRepoKnowledgeIndexEvidence }
  | { ok: false; errors: KnowledgeGatewayRequestError[] }
> {
  try {
    const rawSources = await Promise.all(
      knowledgeSourceSpecs.map(async (spec) => ({
        spec,
        raw: await readRepoText(spec.path),
      })),
    );
    const indexResult = createLocalRepoKnowledgeIndex({
      files: rawSources.map(({ spec, raw }) => sourceSnapshot(spec, raw)),
      indexed_at: generatedAt,
      live_collection_allowed: false,
      side_effects: [],
    });

    if (!indexResult.ok) {
      return {
        ok: false,
        errors: [
          knowledgeGatewayError(
            "knowledge_gateway.source_unavailable",
            "",
            "Knowledge Gateway source index could not be built.",
          ),
        ],
      };
    }

    return {
      ok: true,
      index: addVisibleWarningEvidence(indexResult.local_repo_knowledge_index),
    };
  } catch {
    return {
      ok: false,
      errors: [
        knowledgeGatewayError(
          "knowledge_gateway.source_unavailable",
          "",
          "Knowledge Gateway source docs could not be read.",
        ),
      ],
    };
  }
}

async function readRepoText(path: string): Promise<string> {
  return readFile(join(repoRoot, path), "utf8");
}

function sourceSnapshot(
  spec: KnowledgeSourceSpec,
  raw: string,
): LocalRepoKnowledgeFileInput {
  return {
    path: spec.path,
    content: linePreservingSelectedSections(raw, spec.include_headings),
    source_kind: spec.source_kind,
    freshness: spec.freshness,
    owner_ref: "owner:lnsat-platform",
    trust_level: "repo_truth",
    indexed_at: generatedAt,
  };
}

function linePreservingSelectedSections(raw: string, headings: string[]): string {
  const wanted = headings.map(normalizeHeading);
  let keep = false;

  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => {
      const heading = headingFromLine(line);
      if (heading !== null) {
        const normalizedHeading = normalizeHeading(heading);
        keep = wanted.some(
          (item) => normalizedHeading === item || normalizedHeading.startsWith(item),
        );
      }
      if (!keep || forbiddenLinePattern.test(line)) {
        return "";
      }
      return line;
    })
    .join("\n");
}

function addVisibleWarningEvidence(
  index: LocalRepoKnowledgeIndexEvidence,
): LocalRepoKnowledgeIndexEvidence {
  return {
    ...index,
    knowledge_records: index.knowledge_records.map((record) => {
      if (record.source_path !== "fixtures/knowledge/decision-history.md") {
        return record;
      }
      return {
        ...record,
        stale_status: "stale",
        conflict_status: "possible",
        risk_flags: [
          "conflicting_source",
          "policy_boundary",
        ] satisfies KnowledgeRiskFlag[],
      };
    }),
  };
}

function summarizeIndex(
  index: LocalRepoKnowledgeIndexEvidence,
): KnowledgeGatewaySourceSummary {
  const warningRecords = index.knowledge_records.filter(
    (record) =>
      record.stale_status === "stale" ||
      record.conflict_status !== "none" ||
      record.risk_flags.length > 0,
  );
  return {
    index_id: index.index_id,
    source_count: index.source_registry.length,
    record_count: index.knowledge_records.length,
    chunk_count: index.chunks.length,
    warning_count: warningRecords.length,
    source_refs: dedupeSourceRefs(index.chunks.map((chunk) => chunk.source_ref)),
    warning_records: warningRecords.map((record) => ({
      record_id: record.record_id,
      source_path: record.source_path,
      stale_status: record.stale_status,
      conflict_status: record.conflict_status,
      risk_flags: record.risk_flags,
    })),
    live_collection_allowed: false,
    side_effects: [],
  };
}

function createSearchStaleWarnings(hits: KnowledgeSearchEvidence["hits"]): string[] {
  return hits
    .filter((hit) => hit.stale_status !== "current")
    .map((hit) => `${hit.source_path} stale:${hit.stale_status}`);
}

function createSearchConflictWarnings(hits: KnowledgeSearchEvidence["hits"]): string[] {
  return hits
    .filter((hit) => hit.conflict_status !== "none")
    .map((hit) => `${hit.source_path} conflict:${hit.conflict_status}`);
}

function knowledgeGatewayConstraints(): KnowledgeGatewayConstraints {
  return {
    gateway_owned: true,
    open_source_self_deploy: true,
    user_owned_integrations: true,
    auth_provider_locked: false,
    supported_future_auth_modes: [
      "local_auth",
      "third_party_auth",
      "user_selected_auth_levels",
    ],
    live_auth_provider_configured: false,
    source_only: true,
    read_only: true,
    local_index_only: true,
    citations_required: true,
    exact_source_refs_required: true,
    no_mutation_path: true,
    secret_values_allowed: false,
    live_collection_allowed: false,
    mutation_allowed: false,
    db_allowed: false,
    queue_allowed: false,
    runtime_allowed: false,
    mcp_tool_allowed: false,
  };
}

function knowledgeGatewayEndpoints(): KnowledgeGatewayEndpoint[] {
  return [
    {
      contract_id: knowledgeGatewaySourcesContract.contract_id,
      method: knowledgeGatewaySourcesContract.method,
      path: knowledgeGatewaySourcesContract.path,
      status: knowledgeGatewaySourcesContract.status,
    },
    {
      contract_id: knowledgeGatewaySearchContract.contract_id,
      method: knowledgeGatewaySearchContract.method,
      path: knowledgeGatewaySearchContract.path,
      status: knowledgeGatewaySearchContract.status,
    },
    {
      contract_id: knowledgeGatewayContextCompileContract.contract_id,
      method: knowledgeGatewayContextCompileContract.method,
      path: knowledgeGatewayContextCompileContract.path,
      status: knowledgeGatewayContextCompileContract.status,
    },
  ];
}

function knowledgeGatewaySourceDocs(): string[] {
  return [...knowledgeGatewaySourcesContract.source_docs];
}

function knowledgeSourcesFailure(
  requestId: string | null,
  errors: KnowledgeGatewayRequestError[],
): KnowledgeGatewaySourcesResponse {
  return {
    ok: false,
    contract_id: knowledgeGatewaySourcesContract.contract_id,
    request_id: requestId,
    source_docs: knowledgeGatewaySourceDocs(),
    request_errors: dedupeGatewayErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function knowledgeSearchFailure(
  requestId: string | null,
  requestErrors: KnowledgeGatewayRequestError[],
  searchErrors: KnowledgeSearchContextError[] = [],
): KnowledgeGatewaySearchResponse {
  return {
    ok: false,
    contract_id: knowledgeGatewaySearchContract.contract_id,
    request_id: requestId,
    source_docs: knowledgeGatewaySourceDocs(),
    request_errors: dedupeGatewayErrors(requestErrors),
    search_errors: searchErrors,
    search: null,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function knowledgeContextCompileFailure(
  requestId: string | null,
  requestErrors: KnowledgeGatewayRequestError[],
  compileErrors: KnowledgeSearchContextError[] = [],
): KnowledgeGatewayContextCompileResponse {
  return {
    ok: false,
    contract_id: knowledgeGatewayContextCompileContract.contract_id,
    request_id: requestId,
    source_docs: knowledgeGatewaySourceDocs(),
    request_errors: dedupeGatewayErrors(requestErrors),
    compile_errors: compileErrors,
    compiled_context_bundle: null,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function knowledgeGatewayError(
  code: KnowledgeGatewayRequestErrorCode,
  path: string,
  message: string,
): KnowledgeGatewayRequestError {
  return { code, path, message, severity: "error" };
}

function dedupeGatewayErrors(
  errors: KnowledgeGatewayRequestError[],
): KnowledgeGatewayRequestError[] {
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

function dedupeSourceRefs(refs: KnowledgeSourceRef[]): KnowledgeSourceRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.path}:${ref.heading ?? ""}:${ref.line_start}:${ref.line_end}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeRiskFlags(flags: KnowledgeRiskFlag[]): KnowledgeRiskFlag[] {
  return [...new Set(flags)].sort();
}

function addOptionalSearchString(
  search: Omit<KnowledgeSearchRequest, "index">,
  key: "query" | "path" | "packet_id" | "decision_id",
  value: unknown,
): void {
  const text = optionalString(value);
  if (text !== undefined) {
    search[key] = text;
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function optionalValue<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): Value extends undefined ? object : Record<Key, Value> {
  return (value === undefined ? {} : { [key]: value }) as Value extends undefined
    ? object
    : Record<Key, Value>;
}

function headingFromLine(line: string): string | null {
  const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
  return match?.[2] ?? null;
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonPointer(key: string): string {
  return `/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}
