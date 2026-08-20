import {
  compileKnowledgeContextBundle,
  type CompiledKnowledgeContextBundleEvidence,
  type KnowledgeSearchRequest,
} from "./knowledge-search-context.js";
import {
  createLocalRepoKnowledgeIndex,
  type LocalRepoKnowledgeFileInput,
  type LocalRepoKnowledgeIndexEvidence,
} from "./local-repo-knowledge-index.js";

export const KNOWLEDGE_EVAL_HARNESS_STATUS = "source_only";

export const knowledgeEvalHarnessContract = {
  contract_id: "lnsat.knowledge.eval_harness.v0_1",
  authority: ["@lnsat/packets", "source-backed-knowledge-eval-harness"],
  eval_version: "0.1",
  source_docs: [
    "fixtures/knowledge/product-direction.md",
    "docs/architecture/INTERNAL_KNOWLEDGE_SURFACE.md",
    "fixtures/knowledge/packets/BP-0188.md",
  ],
  question_categories: [
    "current_packet",
    "blocked_scopes",
    "approval_needs",
    "post_bp0180_direction",
    "stale_conflict_detection",
    "live_scope_rejection",
  ],
  live_collection_allowed: false,
  mutation_allowed: false,
  gateway_route_allowed: false,
  mcp_tool_allowed: false,
  db_allowed: false,
  embeddings_allowed: false,
  external_eval_service_allowed: false,
  side_effects: [],
  status: "source_only_eval_harness",
} as const;

export type KnowledgeEvalQuestionCategory =
  (typeof knowledgeEvalHarnessContract.question_categories)[number];

export type KnowledgeEvalQuestion = {
  question_id: string;
  category: KnowledgeEvalQuestionCategory;
  prompt: string;
  search: Omit<
    KnowledgeSearchRequest,
    "index" | "live_collection_allowed" | "side_effects"
  >;
  expected_source_paths: string[];
  expected_packet_ids?: string[];
  required_answer_terms: string[];
  forbidden_answer_terms?: string[];
  requires_stale_warning?: boolean;
  requires_conflict_warning?: boolean;
};

export type KnowledgeEvalAnswerInput = {
  question_id: string;
  answer_text: string;
  cited_source_paths: string[];
  citation_ids?: string[];
  stale_warnings?: string[];
  conflict_warnings?: string[];
  live_scope_widening_allowed?: false;
  side_effects?: [];
};

export type KnowledgeEvalHarnessRequest = {
  index?: LocalRepoKnowledgeIndexEvidence;
  questions?: KnowledgeEvalQuestion[];
  answers?: KnowledgeEvalAnswerInput[];
  evaluated_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type KnowledgeEvalHarnessErrorCode =
  | "knowledge_eval_harness.invalid_request"
  | "knowledge_eval_harness.unexpected_field"
  | "knowledge_eval_harness.invalid_index"
  | "knowledge_eval_harness.questions_required"
  | "knowledge_eval_harness.invalid_question"
  | "knowledge_eval_harness.invalid_question_id"
  | "knowledge_eval_harness.invalid_category"
  | "knowledge_eval_harness.invalid_prompt"
  | "knowledge_eval_harness.invalid_search"
  | "knowledge_eval_harness.invalid_expected_source_path"
  | "knowledge_eval_harness.invalid_expected_packet_id"
  | "knowledge_eval_harness.invalid_answer_term"
  | "knowledge_eval_harness.invalid_answer"
  | "knowledge_eval_harness.answer_required"
  | "knowledge_eval_harness.uncited_answer"
  | "knowledge_eval_harness.expected_source_missing"
  | "knowledge_eval_harness.expected_packet_missing"
  | "knowledge_eval_harness.citation_source_mismatch"
  | "knowledge_eval_harness.missing_required_answer_term"
  | "knowledge_eval_harness.forbidden_answer_term"
  | "knowledge_eval_harness.stale_warning_missing"
  | "knowledge_eval_harness.conflict_warning_missing"
  | "knowledge_eval_harness.stale_guidance_not_flagged"
  | "knowledge_eval_harness.secret_value_forbidden"
  | "knowledge_eval_harness.live_scope_widening_forbidden"
  | "knowledge_eval_harness.invalid_evaluated_at"
  | "knowledge_eval_harness.live_collection_forbidden"
  | "knowledge_eval_harness.side_effects_forbidden"
  | "knowledge_eval_harness.context_compile_failed";

export type KnowledgeEvalHarnessError = {
  code: KnowledgeEvalHarnessErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type KnowledgeEvalQuestionEvaluation = {
  question_id: string;
  category: KnowledgeEvalQuestionCategory;
  passed: boolean;
  retrieved_source_paths: string[];
  expected_source_paths: string[];
  missing_source_paths: string[];
  retrieved_packet_ids: string[];
  expected_packet_ids: string[];
  missing_packet_ids: string[];
  citation_source_paths: string[];
  citation_count: number;
  answer: {
    provided: boolean;
    cited_source_paths: string[];
    required_terms_present: string[];
    missing_required_terms: string[];
    forbidden_terms_found: string[];
    stale_warnings: string[];
    conflict_warnings: string[];
    live_scope_widening_detected: boolean;
    no_secret_like_values_detected: boolean;
  };
  errors: KnowledgeEvalHarnessError[];
};

export type KnowledgeEvalHarnessEvidence = {
  contract_id: typeof knowledgeEvalHarnessContract.contract_id;
  eval_version: typeof knowledgeEvalHarnessContract.eval_version;
  evaluated_at: string;
  question_count: number;
  passed_question_count: number;
  failed_question_count: number;
  evaluations: KnowledgeEvalQuestionEvaluation[];
  constraints: {
    source_only: true;
    read_only: true;
    local_index_only: true;
    citations_required: true;
    golden_questions_required: true;
    secret_values_allowed: false;
    live_collection_allowed: false;
    mutation_allowed: false;
    gateway_route_allowed: false;
    mcp_tool_allowed: false;
    db_allowed: false;
    embeddings_allowed: false;
    external_eval_service_allowed: false;
  };
  live_collection_allowed: false;
  side_effects: [];
};

export type KnowledgeEvalHarnessResult =
  | {
      ok: true;
      knowledge_eval_harness: KnowledgeEvalHarnessEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      knowledge_eval_harness: KnowledgeEvalHarnessEvidence | null;
      errors: KnowledgeEvalHarnessError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedKnowledgeEvalHarnessRequest = {
  index: LocalRepoKnowledgeIndexEvidence;
  questions: KnowledgeEvalQuestion[];
  answers: KnowledgeEvalAnswerInput[];
  evaluated_at: string;
};

const indexedAt = "2026-05-16T00:00:00.000Z";

const defaultEvalFiles: LocalRepoKnowledgeFileInput[] = [
  {
    path: "docs/ROADMAP.md",
    content: [
      "# Next Session",
      "",
      "## Active Slice",
      "No packet is active after BP-0187. BP-0188 Eval Harness is next.",
      "",
      "## Blocked Scope",
      "Gateway knowledge route, MCP knowledge tool, database write, runtime dispatcher, live adapter invocation, Docker runner, node agent, Git runner, deploy path, remote shell, and credential behavior remain blocked.",
    ].join("\n"),
    source_kind: "status_doc",
  },
  {
    path: "docs/reference/CONTRACT_PROVENANCE.md",
    content: JSON.stringify(
      {
        active_packet: "none",
        next_packet: "BP-0188",
        build_state:
          "BP-0187 complete and BP-0188 queued for eval harness before persistence planning.",
      },
      null,
      2,
    ),
    source_kind: "status_doc",
  },
  {
    path: "fixtures/knowledge/packets/BP-0188.md",
    content: [
      "# BP-0188: Eval Harness",
      "",
      "## Objective",
      "Create golden question and retrieval answer eval harness for source grounded agent context.",
      "",
      "## Scope",
      "- Golden question set.",
      "- Retrieval expected doc checks.",
      "- Citation correctness checks.",
      "- Stale and conflict detection checks.",
      "- Credential value leakage checks.",
      "- Live scope widening checks.",
    ].join("\n"),
    source_kind: "packet_doc",
  },
  {
    path: "fixtures/knowledge/product-direction.md",
    content: [
      "# MVP Knowledge And Management Direction",
      "",
      "## Product Thesis",
      "After BP-0180, MVP is source grounded agent knowledge plus a human management UI console.",
      "",
      "## MVP Acceptance",
      "Operators see current packet, blocked scopes, source evidence, approval preview, and cited local knowledge before live execution exists.",
      "",
      "## Eval Harness",
      "Golden questions prove current packet, blocked scopes, approval needs, post BP-0180 direction, citation accuracy, stale detection, and credential value leakage rejection.",
    ].join("\n"),
    source_kind: "repo_doc",
  },
  {
    path: "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
    content: [
      "# Management UI Information Architecture",
      "",
      "## Approvals",
      "Approval Center is preview only. Requested action, source refs, risk rating, policy decision, rollback needs, and audit obligations are visible before any mutation.",
      "",
      "## Runtime Readiness",
      "Runtime dispatcher, broker dispatch, adapter invocation, live execution, service mutation, queue, DNS, Cloudflare, remote shell, Docker, node agent, Git runner, and deploy remain blocked.",
    ].join("\n"),
    source_kind: "architecture_doc",
  },
  {
    path: "fixtures/knowledge/decision-history.md",
    content: [
      "# Decisions",
      "",
      "## 2026-05-16: Complete BP-0187 and queue BP-0188",
      "BP-0187 completed the read only Knowledge UI and queued BP-0188 Eval Harness.",
      "",
      "## Older Direction",
      "Earlier source summaries may be stale or conflicting when they point agents away from current packet evidence.",
    ].join("\n"),
    source_kind: "decision_doc",
    freshness: "stale",
  },
];

export const defaultKnowledgeEvalQuestionSet: KnowledgeEvalQuestion[] = [
  {
    question_id: "eval.current_packet",
    category: "current_packet",
    prompt: "Which packet is next after the Knowledge UI MVP?",
    search: { query: "BP-0188 Eval Harness next packet", limit: 6 },
    expected_source_paths: [
      "docs/ROADMAP.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "fixtures/knowledge/packets/BP-0188.md",
    ],
    expected_packet_ids: ["BP-0188"],
    required_answer_terms: ["BP-0188", "Eval Harness"],
  },
  {
    question_id: "eval.blocked_scopes",
    category: "blocked_scopes",
    prompt: "What scopes remain blocked before live control?",
    search: {
      query: "Gateway MCP database runtime live Docker deploy blocked",
      limit: 6,
    },
    expected_source_paths: [
      "docs/ROADMAP.md",
      "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
    ],
    required_answer_terms: [
      "Gateway knowledge route",
      "MCP knowledge tool",
      "runtime dispatcher",
      "blocked",
    ],
    forbidden_answer_terms: ["enabled now", "open live execution"],
  },
  {
    question_id: "eval.approval_needs",
    category: "approval_needs",
    prompt: "What should the approval surface show before mutation exists?",
    search: {
      query:
        "Approval Center preview requested action source refs risk policy rollback audit",
      limit: 6,
    },
    expected_source_paths: [
      "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
      "fixtures/knowledge/product-direction.md",
    ],
    required_answer_terms: [
      "preview only",
      "source refs",
      "risk rating",
      "audit obligations",
    ],
    forbidden_answer_terms: ["approve mutation now"],
  },
  {
    question_id: "eval.post_bp0180_direction",
    category: "post_bp0180_direction",
    prompt: "What direction was selected after BP-0180?",
    search: {
      query: "BP-0180 MVP source grounded agent knowledge human management UI console",
      limit: 6,
    },
    expected_source_paths: ["fixtures/knowledge/product-direction.md"],
    expected_packet_ids: ["BP-0180"],
    required_answer_terms: [
      "source grounded agent knowledge",
      "human management UI console",
    ],
  },
  {
    question_id: "eval.stale_conflict_detection",
    category: "stale_conflict_detection",
    prompt: "How should stale or conflicting guidance be handled?",
    search: {
      query: "stale conflicting current packet evidence",
      path: "fixtures/knowledge/decision-history.md",
      limit: 4,
    },
    expected_source_paths: ["fixtures/knowledge/decision-history.md"],
    required_answer_terms: ["stale", "conflicting", "current packet evidence"],
    requires_stale_warning: true,
    requires_conflict_warning: true,
  },
  {
    question_id: "eval.live_scope_rejection",
    category: "live_scope_rejection",
    prompt: "How should live scope widening be handled in BP-0188?",
    search: {
      query: "Live scope widening checks blocked before persistence",
      limit: 6,
    },
    expected_source_paths: ["fixtures/knowledge/packets/BP-0188.md", "docs/ROADMAP.md"],
    expected_packet_ids: ["BP-0188"],
    required_answer_terms: ["live scope widening", "blocked"],
    forbidden_answer_terms: ["enable live adapter invocation"],
  },
];

export const defaultKnowledgeEvalAnswers: KnowledgeEvalAnswerInput[] = [
  {
    question_id: "eval.current_packet",
    answer_text: "BP-0188 Eval Harness is the next packet after the Knowledge UI MVP.",
    cited_source_paths: [
      "docs/ROADMAP.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
      "fixtures/knowledge/packets/BP-0188.md",
    ],
  },
  {
    question_id: "eval.blocked_scopes",
    answer_text:
      "Gateway knowledge route, MCP knowledge tool, runtime dispatcher, Docker runner, and deploy stay blocked.",
    cited_source_paths: [
      "docs/ROADMAP.md",
      "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
    ],
  },
  {
    question_id: "eval.approval_needs",
    answer_text:
      "Approval Center is preview only and shows source refs, risk rating, policy decision, rollback needs, and audit obligations.",
    cited_source_paths: [
      "docs/architecture/MANAGEMENT_UI_INFORMATION_ARCHITECTURE.md",
      "fixtures/knowledge/product-direction.md",
    ],
  },
  {
    question_id: "eval.post_bp0180_direction",
    answer_text:
      "After BP-0180 the direction is source grounded agent knowledge plus a human management UI console.",
    cited_source_paths: ["fixtures/knowledge/product-direction.md"],
  },
  {
    question_id: "eval.stale_conflict_detection",
    answer_text:
      "Stale or conflicting guidance must be flagged and checked against current packet evidence.",
    cited_source_paths: ["fixtures/knowledge/decision-history.md"],
    stale_warnings: ["stale source fixtures/knowledge/decision-history.md"],
    conflict_warnings: ["conflict warning fixtures/knowledge/decision-history.md"],
  },
  {
    question_id: "eval.live_scope_rejection",
    answer_text:
      "Live scope widening is blocked in BP-0188 before persistence planning.",
    cited_source_paths: ["fixtures/knowledge/packets/BP-0188.md", "docs/ROADMAP.md"],
  },
];

const requestKeys = new Set([
  "index",
  "questions",
  "answers",
  "evaluated_at",
  "live_collection_allowed",
  "side_effects",
]);
const questionKeys = new Set([
  "question_id",
  "category",
  "prompt",
  "search",
  "expected_source_paths",
  "expected_packet_ids",
  "required_answer_terms",
  "forbidden_answer_terms",
  "requires_stale_warning",
  "requires_conflict_warning",
]);
const answerKeys = new Set([
  "question_id",
  "answer_text",
  "cited_source_paths",
  "citation_ids",
  "stale_warnings",
  "conflict_warnings",
  "live_scope_widening_allowed",
  "side_effects",
]);
const searchKeys = new Set(["query", "path", "packet_id", "decision_id", "limit"]);
const categories = new Set<KnowledgeEvalQuestionCategory>(
  knowledgeEvalHarnessContract.question_categories,
);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const packetIdPattern = /^BP-\d{4}$/;
const relativePathPattern =
  /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+(?:\.[A-Za-z0-9]+)?$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeTextPattern = /^[\w .,:;@/()[\]#_+=?'-]{2,520}$/;
const secretValuePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|TOKEN=|PASSWORD=|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:)/i;
const liveScopeTermPattern =
  /(gateway route|mcp tool|database write|db write|runtime dispatcher|broker dispatch|adapter invocation|live execution|live adapter|service mutation|queue|dns|cloudflare|ssh|docker|node agent|node-agent|git runner|deploy)/i;
const liveScopeWideningPattern =
  /\b(enable|enabled|open|opened|allow|allowed|invoke|execute|dispatch|mutate|write|connect|start|restart|run|deploy)\b.{0,96}(gateway route|mcp tool|database write|db write|runtime dispatcher|broker dispatch|adapter invocation|live execution|live adapter|service mutation|queue|dns|cloudflare|ssh|docker|node agent|node-agent|git runner|deploy)|\b(gateway route|mcp tool|database write|db write|runtime dispatcher|broker dispatch|adapter invocation|live execution|live adapter|service mutation|queue|dns|cloudflare|ssh|docker|node agent|node-agent|git runner|deploy)\b.{0,96}\b(enable|enabled|open|opened|allow|allowed|invoke|execute|dispatch|mutate|write|connect|start|restart|run|deploy)\b/i;
const liveScopeBlockerPattern =
  /\b(blocked|forbidden|not allowed|not opened|not open|closed|deferred|later packet|approval required|preview only|remains blocked|stay blocked|stays blocked)\b/i;

export function createDefaultKnowledgeEvalIndex(): LocalRepoKnowledgeIndexEvidence {
  const result = createLocalRepoKnowledgeIndex({
    files: defaultEvalFiles,
    indexed_at: indexedAt,
  });

  if (!result.ok) {
    throw new Error("expected BP-0188 default eval index to validate");
  }

  return {
    ...result.local_repo_knowledge_index,
    knowledge_records: result.local_repo_knowledge_index.knowledge_records.map(
      (record) =>
        record.source_path === "fixtures/knowledge/decision-history.md"
          ? {
              ...record,
              stale_status: "stale",
              conflict_status: "possible",
              risk_flags: ["conflicting_source", "policy_boundary"],
            }
          : record,
    ),
  };
}

export function runKnowledgeEvalHarness(
  input: unknown = {},
): KnowledgeEvalHarnessResult {
  const normalized = normalizeKnowledgeEvalHarnessRequest(input);

  if (!normalized.ok) {
    return failKnowledgeEvalHarness(normalized.errors, null);
  }

  const answerById = new Map(
    normalized.request.answers.map((answer) => [answer.question_id, answer]),
  );
  const evaluations = normalized.request.questions.map((question, index) =>
    evaluateQuestion(
      question,
      answerById.get(question.question_id),
      index,
      normalized.request,
    ),
  );
  const errors = evaluations.flatMap((evaluation) => evaluation.errors);
  const passedQuestionCount = evaluations.filter(
    (evaluation) => evaluation.passed,
  ).length;
  const evidence = createEvidence(
    normalized.request.evaluated_at,
    evaluations,
    passedQuestionCount,
  );

  if (errors.length > 0) {
    return failKnowledgeEvalHarness(dedupeErrors(errors), evidence);
  }

  return {
    ok: true,
    knowledge_eval_harness: evidence,
    errors: [],
    side_effects: [],
  };
}

function normalizeKnowledgeEvalHarnessRequest(input: unknown):
  | {
      ok: true;
      request: NormalizedKnowledgeEvalHarnessRequest;
    }
  | {
      ok: false;
      errors: KnowledgeEvalHarnessError[];
    } {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_request",
          "",
          "Knowledge eval harness request must be an object.",
        ),
      ],
    };
  }

  const merged = {
    index: createDefaultKnowledgeEvalIndex(),
    questions: defaultKnowledgeEvalQuestionSet,
    answers: defaultKnowledgeEvalAnswers,
    evaluated_at: indexedAt,
    live_collection_allowed: false,
    side_effects: [],
    ...input,
  };
  const errors: KnowledgeEvalHarnessError[] = [];

  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.unexpected_field",
          jsonPointer(key),
          "Unexpected knowledge eval harness field.",
        ),
      );
    }
  }

  const index = normalizeIndex(merged.index, errors);
  const questions = normalizeQuestions(merged.questions, errors);
  const answers = normalizeAnswers(merged.answers, errors);

  if (
    typeof merged.evaluated_at !== "string" ||
    !isoDateTimePattern.test(merged.evaluated_at)
  ) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_evaluated_at",
        "/evaluated_at",
        "Knowledge eval harness evaluated_at must be an ISO UTC timestamp.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "live_collection_allowed") &&
    merged.live_collection_allowed !== false
  ) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.live_collection_forbidden",
        "/live_collection_allowed",
        "Knowledge eval harness cannot enable live collection.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "side_effects") &&
    (!Array.isArray(merged.side_effects) || merged.side_effects.length !== 0)
  ) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.side_effects_forbidden",
        "/side_effects",
        "Knowledge eval harness must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0 || !index) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request: {
      index,
      questions,
      answers,
      evaluated_at: merged.evaluated_at,
    },
  };
}

function normalizeIndex(
  value: unknown,
  errors: KnowledgeEvalHarnessError[],
): LocalRepoKnowledgeIndexEvidence | null {
  if (!isPlainObject(value)) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_index",
        "/index",
        "Knowledge eval harness requires BP-0183 local index evidence.",
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
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_index",
        "/index",
        "Knowledge eval harness index must be source-only BP-0183 evidence.",
      ),
    );
    return null;
  }

  return value as LocalRepoKnowledgeIndexEvidence;
}

function normalizeQuestions(
  value: unknown,
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalQuestion[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.questions_required",
        "/questions",
        "Knowledge eval harness requires golden questions.",
      ),
    );
    return [];
  }

  const questions: KnowledgeEvalQuestion[] = [];
  value.forEach((item, index) => {
    const path = `/questions/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_question",
          path,
          "Knowledge eval question must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!questionKeys.has(key)) {
        errors.push(
          knowledgeEvalHarnessError(
            "knowledge_eval_harness.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected knowledge eval question field.",
          ),
        );
      }
    }

    const questionId = normalizeStableId(
      item.question_id,
      `${path}/question_id`,
      "knowledge_eval_harness.invalid_question_id",
      errors,
    );
    const category = normalizeCategory(item.category, `${path}/category`, errors);
    const prompt = normalizeSafeText(
      item.prompt,
      `${path}/prompt`,
      "knowledge_eval_harness.invalid_prompt",
      errors,
    );
    const search = normalizeSearch(item.search, `${path}/search`, errors);
    const expectedSourcePaths = normalizePathArray(
      item.expected_source_paths,
      `${path}/expected_source_paths`,
      "knowledge_eval_harness.invalid_expected_source_path",
      errors,
    );
    const expectedPacketIds = normalizeOptionalStringArray(
      item.expected_packet_ids,
      `${path}/expected_packet_ids`,
      "knowledge_eval_harness.invalid_expected_packet_id",
      (packetId) => packetIdPattern.test(packetId),
      errors,
    );
    const requiredAnswerTerms = normalizeRequiredTerms(
      item.required_answer_terms,
      `${path}/required_answer_terms`,
      errors,
    );
    const forbiddenAnswerTerms = normalizeOptionalStringArray(
      item.forbidden_answer_terms,
      `${path}/forbidden_answer_terms`,
      "knowledge_eval_harness.invalid_answer_term",
      (term) => safeEvalText(term, 160),
      errors,
    );

    if (
      Object.hasOwn(item, "requires_stale_warning") &&
      typeof item.requires_stale_warning !== "boolean"
    ) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_question",
          `${path}/requires_stale_warning`,
          "Knowledge eval stale warning flag must be boolean.",
        ),
      );
    }
    if (
      Object.hasOwn(item, "requires_conflict_warning") &&
      typeof item.requires_conflict_warning !== "boolean"
    ) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_question",
          `${path}/requires_conflict_warning`,
          "Knowledge eval conflict warning flag must be boolean.",
        ),
      );
    }

    if (questionId && category && prompt && search && expectedSourcePaths.length > 0) {
      const question: KnowledgeEvalQuestion = {
        question_id: questionId,
        category,
        prompt,
        search,
        expected_source_paths: expectedSourcePaths,
        required_answer_terms: requiredAnswerTerms,
      };
      if (expectedPacketIds.length > 0) {
        question.expected_packet_ids = expectedPacketIds;
      }
      if (forbiddenAnswerTerms.length > 0) {
        question.forbidden_answer_terms = forbiddenAnswerTerms;
      }
      if (item.requires_stale_warning === true) {
        question.requires_stale_warning = true;
      }
      if (item.requires_conflict_warning === true) {
        question.requires_conflict_warning = true;
      }
      questions.push(question);
    }
  });

  return questions;
}

function normalizeAnswers(
  value: unknown,
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalAnswerInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_answer",
        "/answers",
        "Knowledge eval answers must be an array.",
      ),
    );
    return [];
  }

  const answers: KnowledgeEvalAnswerInput[] = [];
  value.forEach((item, index) => {
    const path = `/answers/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_answer",
          path,
          "Knowledge eval answer must be an object.",
        ),
      );
      return;
    }
    for (const key of Object.keys(item)) {
      if (!answerKeys.has(key)) {
        errors.push(
          knowledgeEvalHarnessError(
            "knowledge_eval_harness.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected knowledge eval answer field.",
          ),
        );
      }
    }

    const questionId = normalizeStableId(
      item.question_id,
      `${path}/question_id`,
      "knowledge_eval_harness.invalid_question_id",
      errors,
    );
    const answerText = normalizeAnswerText(
      item.answer_text,
      `${path}/answer_text`,
      errors,
    );
    const citedSourcePaths = normalizeAnswerSourcePaths(
      item.cited_source_paths,
      `${path}/cited_source_paths`,
      errors,
    );
    const citationIds = normalizeOptionalStringArray(
      item.citation_ids,
      `${path}/citation_ids`,
      "knowledge_eval_harness.invalid_answer",
      (citationId) => stableIdPattern.test(citationId),
      errors,
    );
    const staleWarnings = normalizeOptionalStringArray(
      item.stale_warnings,
      `${path}/stale_warnings`,
      "knowledge_eval_harness.invalid_answer",
      (warning) => safeEvalText(warning, 220),
      errors,
    );
    const conflictWarnings = normalizeOptionalStringArray(
      item.conflict_warnings,
      `${path}/conflict_warnings`,
      "knowledge_eval_harness.invalid_answer",
      (warning) => safeEvalText(warning, 220),
      errors,
    );

    if (
      Object.hasOwn(item, "live_scope_widening_allowed") &&
      item.live_scope_widening_allowed !== false
    ) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.live_scope_widening_forbidden",
          `${path}/live_scope_widening_allowed`,
          "Knowledge eval answer cannot allow live scope widening.",
        ),
      );
    }
    if (
      Object.hasOwn(item, "side_effects") &&
      (!Array.isArray(item.side_effects) || item.side_effects.length !== 0)
    ) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.side_effects_forbidden",
          `${path}/side_effects`,
          "Knowledge eval answer must preserve side_effects: [].",
        ),
      );
    }

    if (questionId && answerText) {
      const answer: KnowledgeEvalAnswerInput = {
        question_id: questionId,
        answer_text: answerText,
        cited_source_paths: citedSourcePaths,
      };
      if (citationIds.length > 0) {
        answer.citation_ids = citationIds;
      }
      if (staleWarnings.length > 0) {
        answer.stale_warnings = staleWarnings;
      }
      if (conflictWarnings.length > 0) {
        answer.conflict_warnings = conflictWarnings;
      }
      answers.push(answer);
    }
  });

  return answers;
}

function evaluateQuestion(
  question: KnowledgeEvalQuestion,
  answer: KnowledgeEvalAnswerInput | undefined,
  index: number,
  request: NormalizedKnowledgeEvalHarnessRequest,
): KnowledgeEvalQuestionEvaluation {
  const errors: KnowledgeEvalHarnessError[] = [];
  const compiled = compileEvalContext(question, index, request);

  if (!compiled) {
    const compileError = knowledgeEvalHarnessError(
      "knowledge_eval_harness.context_compile_failed",
      `/questions/${index}/search`,
      "Knowledge eval question did not compile cited source context.",
    );
    errors.push(compileError);
    return emptyEvaluation(question, errors);
  }

  const retrievedSourcePaths = dedupeStrings(
    compiled.search.hits.map((hit) => hit.source_path),
  ).sort();
  const citationSourcePaths = dedupeStrings(
    compiled.context_bundle.citation_refs.map((citation) => citation.source_ref.path),
  ).sort();
  const retrievedPacketIds = dedupeStrings(
    compiled.search.hits.flatMap((hit) => hit.packet_ids),
  ).sort();
  const missingSourcePaths = question.expected_source_paths.filter(
    (expectedPath) => !retrievedSourcePaths.includes(expectedPath),
  );
  const expectedPacketIds = question.expected_packet_ids ?? [];
  const missingPacketIds = expectedPacketIds.filter(
    (expectedPacketId) => !retrievedPacketIds.includes(expectedPacketId),
  );

  for (const missingSourcePath of missingSourcePaths) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.expected_source_missing",
        `/questions/${index}/expected_source_paths`,
        `Expected source path missing from retrieval: ${missingSourcePath}`,
      ),
    );
  }
  for (const missingPacketId of missingPacketIds) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.expected_packet_missing",
        `/questions/${index}/expected_packet_ids`,
        `Expected packet id missing from retrieval: ${missingPacketId}`,
      ),
    );
  }

  const answerEvaluation = evaluateAnswer(
    question,
    answer,
    {
      citationSourcePaths,
      compiledStaleWarnings: compiled.stale_warnings,
      compiledConflictWarnings: compiled.conflict_warnings,
    },
    index,
    errors,
  );

  return {
    question_id: question.question_id,
    category: question.category,
    passed: errors.length === 0,
    retrieved_source_paths: retrievedSourcePaths,
    expected_source_paths: question.expected_source_paths,
    missing_source_paths: missingSourcePaths,
    retrieved_packet_ids: retrievedPacketIds,
    expected_packet_ids: expectedPacketIds,
    missing_packet_ids: missingPacketIds,
    citation_source_paths: citationSourcePaths,
    citation_count: compiled.context_bundle.citation_refs.length,
    answer: answerEvaluation,
    errors: dedupeErrors(errors),
  };
}

function compileEvalContext(
  question: KnowledgeEvalQuestion,
  index: number,
  request: NormalizedKnowledgeEvalHarnessRequest,
): CompiledKnowledgeContextBundleEvidence | null {
  const result = compileKnowledgeContextBundle({
    search: {
      ...question.search,
      index: request.index,
      live_collection_allowed: false,
      side_effects: [],
    },
    bundle_id: createEvalBundleId(question.question_id, index),
    objective: `evaluate ${question.category} source grounding`,
    max_tokens: 1800,
    created_at: request.evaluated_at,
    live_collection_allowed: false,
    side_effects: [],
  });

  return result.ok ? result.compiled_context_bundle : null;
}

function evaluateAnswer(
  question: KnowledgeEvalQuestion,
  answer: KnowledgeEvalAnswerInput | undefined,
  compiled: {
    citationSourcePaths: string[];
    compiledStaleWarnings: string[];
    compiledConflictWarnings: string[];
  },
  index: number,
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalQuestionEvaluation["answer"] {
  if (!answer) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.answer_required",
        `/questions/${index}/answer`,
        "Knowledge eval question requires answer evidence.",
      ),
    );
    return {
      provided: false,
      cited_source_paths: [],
      required_terms_present: [],
      missing_required_terms: question.required_answer_terms,
      forbidden_terms_found: [],
      stale_warnings: [],
      conflict_warnings: [],
      live_scope_widening_detected: false,
      no_secret_like_values_detected: true,
    };
  }

  const citedSourcePaths = dedupeStrings(answer.cited_source_paths).sort();
  if (citedSourcePaths.length === 0) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.uncited_answer",
        `/questions/${index}/answer/cited_source_paths`,
        "Knowledge eval answer must cite source paths.",
      ),
    );
  }

  const citationMismatch = citedSourcePaths.filter(
    (sourcePath) => !compiled.citationSourcePaths.includes(sourcePath),
  );
  if (citationMismatch.length > 0) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.citation_source_mismatch",
        `/questions/${index}/answer/cited_source_paths`,
        "Knowledge eval answer cited source paths outside compiled context.",
      ),
    );
  }

  const requiredTermsPresent = question.required_answer_terms.filter((term) =>
    answerTextIncludes(answer.answer_text, term),
  );
  const missingRequiredTerms = question.required_answer_terms.filter(
    (term) => !requiredTermsPresent.includes(term),
  );
  for (const missingTerm of missingRequiredTerms) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.missing_required_answer_term",
        `/questions/${index}/required_answer_terms`,
        `Knowledge eval answer missed required term: ${missingTerm}`,
      ),
    );
  }

  const forbiddenTermsFound = (question.forbidden_answer_terms ?? []).filter((term) =>
    answerTextIncludes(answer.answer_text, term),
  );
  for (const forbiddenTerm of forbiddenTermsFound) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.forbidden_answer_term",
        `/questions/${index}/forbidden_answer_terms`,
        `Knowledge eval answer included forbidden term: ${forbiddenTerm}`,
      ),
    );
  }

  const staleWarnings = answer.stale_warnings ?? [];
  const conflictWarnings = answer.conflict_warnings ?? [];
  if (question.requires_stale_warning && compiled.compiledStaleWarnings.length === 0) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.stale_warning_missing",
        `/questions/${index}/stale_warnings`,
        "Knowledge eval expected stale source warning from compiled context.",
      ),
    );
  }
  if (question.requires_stale_warning && staleWarnings.length === 0) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.stale_guidance_not_flagged",
        `/questions/${index}/answer/stale_warnings`,
        "Knowledge eval answer used stale guidance without flagging it.",
      ),
    );
  }
  if (
    question.requires_conflict_warning &&
    (compiled.compiledConflictWarnings.length === 0 || conflictWarnings.length === 0)
  ) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.conflict_warning_missing",
        `/questions/${index}/conflict_warnings`,
        "Knowledge eval expected conflict warning from compiled context and answer.",
      ),
    );
  }

  const noSecretLikeValuesDetected = !secretValuePattern.test(answer.answer_text);
  if (!noSecretLikeValuesDetected) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.secret_value_forbidden",
        `/questions/${index}/answer/answer_text`,
        "Knowledge eval answer cannot contain credential-like values.",
      ),
    );
  }

  const liveScopeWideningDetected = detectsLiveScopeWidening(answer.answer_text);
  if (liveScopeWideningDetected) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.live_scope_widening_forbidden",
        `/questions/${index}/answer/answer_text`,
        "Knowledge eval answer cannot widen live scope.",
      ),
    );
  }

  return {
    provided: true,
    cited_source_paths: citedSourcePaths,
    required_terms_present: requiredTermsPresent,
    missing_required_terms: missingRequiredTerms,
    forbidden_terms_found: forbiddenTermsFound,
    stale_warnings: staleWarnings,
    conflict_warnings: conflictWarnings,
    live_scope_widening_detected: liveScopeWideningDetected,
    no_secret_like_values_detected: noSecretLikeValuesDetected,
  };
}

function createEvidence(
  evaluatedAt: string,
  evaluations: KnowledgeEvalQuestionEvaluation[],
  passedQuestionCount: number,
): KnowledgeEvalHarnessEvidence {
  return {
    contract_id: knowledgeEvalHarnessContract.contract_id,
    eval_version: knowledgeEvalHarnessContract.eval_version,
    evaluated_at: evaluatedAt,
    question_count: evaluations.length,
    passed_question_count: passedQuestionCount,
    failed_question_count: evaluations.length - passedQuestionCount,
    evaluations,
    constraints: {
      source_only: true,
      read_only: true,
      local_index_only: true,
      citations_required: true,
      golden_questions_required: true,
      secret_values_allowed: false,
      live_collection_allowed: false,
      mutation_allowed: false,
      gateway_route_allowed: false,
      mcp_tool_allowed: false,
      db_allowed: false,
      embeddings_allowed: false,
      external_eval_service_allowed: false,
    },
    live_collection_allowed: false,
    side_effects: [],
  };
}

function emptyEvaluation(
  question: KnowledgeEvalQuestion,
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalQuestionEvaluation {
  return {
    question_id: question.question_id,
    category: question.category,
    passed: false,
    retrieved_source_paths: [],
    expected_source_paths: question.expected_source_paths,
    missing_source_paths: question.expected_source_paths,
    retrieved_packet_ids: [],
    expected_packet_ids: question.expected_packet_ids ?? [],
    missing_packet_ids: question.expected_packet_ids ?? [],
    citation_source_paths: [],
    citation_count: 0,
    answer: {
      provided: false,
      cited_source_paths: [],
      required_terms_present: [],
      missing_required_terms: question.required_answer_terms,
      forbidden_terms_found: [],
      stale_warnings: [],
      conflict_warnings: [],
      live_scope_widening_detected: false,
      no_secret_like_values_detected: true,
    },
    errors: dedupeErrors(errors),
  };
}

function normalizeSearch(
  value: unknown,
  path: string,
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalQuestion["search"] | null {
  if (!isPlainObject(value)) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_search",
        path,
        "Knowledge eval question search must be an object.",
      ),
    );
    return null;
  }
  for (const key of Object.keys(value)) {
    if (!searchKeys.has(key)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected knowledge eval search field.",
        ),
      );
    }
  }

  const search: KnowledgeEvalQuestion["search"] = {};
  if (Object.hasOwn(value, "query")) {
    const query = normalizeSafeText(
      value.query,
      `${path}/query`,
      "knowledge_eval_harness.invalid_search",
      errors,
    );
    if (query) {
      search.query = query;
    }
  }
  if (Object.hasOwn(value, "path")) {
    if (typeof value.path !== "string" || !safeRelativePath(value.path)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_search",
          `${path}/path`,
          "Knowledge eval search path must be safe and repo-relative.",
        ),
      );
    } else {
      search.path = value.path;
    }
  }
  if (Object.hasOwn(value, "packet_id")) {
    if (typeof value.packet_id !== "string" || !packetIdPattern.test(value.packet_id)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_search",
          `${path}/packet_id`,
          "Knowledge eval search packet_id must use BP-0000 shape.",
        ),
      );
    } else {
      search.packet_id = value.packet_id;
    }
  }
  if (Object.hasOwn(value, "decision_id")) {
    const decisionId = normalizeStableId(
      value.decision_id,
      `${path}/decision_id`,
      "knowledge_eval_harness.invalid_search",
      errors,
    );
    if (decisionId) {
      search.decision_id = decisionId;
    }
  }
  if (Object.hasOwn(value, "limit")) {
    const limit = value.limit;
    if (
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 20
    ) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_search",
          `${path}/limit`,
          "Knowledge eval search limit must be an integer from 1 to 20.",
        ),
      );
    } else {
      search.limit = limit;
    }
  }
  if (
    search.query === undefined &&
    search.path === undefined &&
    search.packet_id === undefined &&
    search.decision_id === undefined
  ) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_search",
        path,
        "Knowledge eval search requires query, path, packet_id, or decision_id.",
      ),
    );
  }
  return search;
}

function normalizeCategory(
  value: unknown,
  path: string,
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalQuestionCategory | null {
  if (typeof value !== "string" || !categories.has(value as never)) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_category",
        path,
        "Knowledge eval question category is unsupported.",
      ),
    );
    return null;
  }
  return value as KnowledgeEvalQuestionCategory;
}

function normalizeStableId(
  value: unknown,
  path: string,
  code: KnowledgeEvalHarnessErrorCode,
  errors: KnowledgeEvalHarnessError[],
): string | null {
  if (typeof value !== "string" || !stableIdPattern.test(value)) {
    errors.push(
      knowledgeEvalHarnessError(code, path, "Knowledge eval id must be stable."),
    );
    return null;
  }
  return value;
}

function normalizeSafeText(
  value: unknown,
  path: string,
  code: KnowledgeEvalHarnessErrorCode,
  errors: KnowledgeEvalHarnessError[],
): string | null {
  if (typeof value !== "string" || !safeEvalText(value, 520)) {
    errors.push(
      knowledgeEvalHarnessError(
        secretValuePattern.test(String(value))
          ? "knowledge_eval_harness.secret_value_forbidden"
          : code,
        path,
        "Knowledge eval text must be safe source-backed text.",
      ),
    );
    return null;
  }
  return value;
}

function normalizeAnswerText(
  value: unknown,
  path: string,
  errors: KnowledgeEvalHarnessError[],
): string | null {
  if (typeof value !== "string" || !safeEvalText(value, 1200)) {
    errors.push(
      knowledgeEvalHarnessError(
        secretValuePattern.test(String(value))
          ? "knowledge_eval_harness.secret_value_forbidden"
          : "knowledge_eval_harness.invalid_answer",
        path,
        "Knowledge eval answer text must be safe source-backed text.",
      ),
    );
    return null;
  }
  return value;
}

function normalizePathArray(
  value: unknown,
  path: string,
  code: KnowledgeEvalHarnessErrorCode,
  errors: KnowledgeEvalHarnessError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      knowledgeEvalHarnessError(code, path, "Knowledge eval requires source paths."),
    );
    return [];
  }
  const paths: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !safeRelativePath(item)) {
      errors.push(
        knowledgeEvalHarnessError(
          code,
          `${path}/${index}`,
          "Knowledge eval source path must be safe and repo-relative.",
        ),
      );
      return;
    }
    paths.push(item);
  });
  return dedupeStrings(paths).sort();
}

function normalizeAnswerSourcePaths(
  value: unknown,
  path: string,
  errors: KnowledgeEvalHarnessError[],
): string[] {
  if (!Array.isArray(value)) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_answer",
        path,
        "Knowledge eval answer cited source paths must be an array.",
      ),
    );
    return [];
  }
  const paths: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !safeRelativePath(item)) {
      errors.push(
        knowledgeEvalHarnessError(
          "knowledge_eval_harness.invalid_answer",
          `${path}/${index}`,
          "Knowledge eval answer source path must be safe and repo-relative.",
        ),
      );
      return;
    }
    paths.push(item);
  });
  return dedupeStrings(paths).sort();
}

function normalizeRequiredTerms(
  value: unknown,
  path: string,
  errors: KnowledgeEvalHarnessError[],
): string[] {
  const terms = normalizeOptionalStringArray(
    value,
    path,
    "knowledge_eval_harness.invalid_answer_term",
    (term) => safeEvalText(term, 160),
    errors,
  );
  if (terms.length === 0) {
    errors.push(
      knowledgeEvalHarnessError(
        "knowledge_eval_harness.invalid_answer_term",
        path,
        "Knowledge eval question requires answer terms.",
      ),
    );
  }
  return terms;
}

function normalizeOptionalStringArray(
  value: unknown,
  path: string,
  code: KnowledgeEvalHarnessErrorCode,
  predicate: (value: string) => boolean,
  errors: KnowledgeEvalHarnessError[],
): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(
      knowledgeEvalHarnessError(code, path, "Knowledge eval field must be an array."),
    );
    return [];
  }
  const values: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !predicate(item)) {
      errors.push(
        knowledgeEvalHarnessError(
          code,
          `${path}/${index}`,
          "Knowledge eval array value is invalid.",
        ),
      );
      return;
    }
    values.push(item);
  });
  return dedupeStrings(values).sort();
}

function safeEvalText(value: string, maxLength: number): boolean {
  return (
    value.trim().length >= 2 &&
    value.length <= maxLength &&
    safeTextPattern.test(value) &&
    !secretValuePattern.test(value)
  );
}

function safeRelativePath(value: string): boolean {
  return (
    relativePathPattern.test(value) &&
    !value.includes("..") &&
    !value.startsWith("/") &&
    !value.includes("//")
  );
}

function answerTextIncludes(answerText: string, term: string): boolean {
  return answerText.toLowerCase().includes(term.toLowerCase());
}

function detectsLiveScopeWidening(answerText: string): boolean {
  if (!liveScopeTermPattern.test(answerText)) {
    return false;
  }
  if (!liveScopeWideningPattern.test(answerText)) {
    return false;
  }
  return !liveScopeBlockerPattern.test(answerText);
}

function createEvalBundleId(questionId: string, index: number): string {
  const normalized = questionId.replace(/[^a-z0-9_.:-]+/g, "_").slice(0, 90);
  return `knowledge.bundle.bp0188.${normalized || `question_${index + 1}`}`;
}

function knowledgeEvalHarnessError(
  code: KnowledgeEvalHarnessErrorCode,
  path: string,
  message: string,
): KnowledgeEvalHarnessError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function failKnowledgeEvalHarness(
  errors: KnowledgeEvalHarnessError[],
  evidence: KnowledgeEvalHarnessEvidence | null,
): KnowledgeEvalHarnessResult {
  return {
    ok: false,
    knowledge_eval_harness: evidence,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function dedupeErrors(
  errors: KnowledgeEvalHarnessError[],
): KnowledgeEvalHarnessError[] {
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

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
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
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
