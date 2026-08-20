import {
  createKnowledgeRecord,
  localKnowledgeRecordContract,
  type KnowledgeRecordEvidence,
  type KnowledgeSourceFreshness,
  type KnowledgeSourceKind,
  type KnowledgeSourceRef,
  type KnowledgeSourceRegistryEntry,
  type KnowledgeSourceTrustLevel,
} from "./knowledge-record.js";

export const LOCAL_REPO_KNOWLEDGE_INDEX_STATUS = "source_only";

export const localRepoKnowledgeIndexContract = {
  contract_id: "lnsat.knowledge.local_repo_index.v0_1",
  authority: ["@lnsat/packets", "source-backed-local-repo-index"],
  index_version: "0.1",
  default_allowlisted_paths: [
    "docs/ROADMAP.md",
    "AGENTS.md",
    "docs/",
    "fixtures/",
    "packages/packets/src/",
    "packages/packets/test/",
  ],
  supported_file_kinds: ["markdown", "json", "typescript", "javascript", "source"],
  ignored_path_markers: [
    "node_modules/",
    "dist/",
    ".next/",
    "tmp/",
    ".git/",
    ".DS_Store",
    ".tsbuildinfo",
  ],
  live_collection_allowed: false,
  search_allowed: false,
  context_compiler_allowed: false,
  side_effects: [],
  status: "source_only_index",
} as const;

export type LocalRepoKnowledgeFileKind =
  (typeof localRepoKnowledgeIndexContract.supported_file_kinds)[number];

export type LocalRepoKnowledgeFileInput = {
  path: string;
  content: string;
  source_kind?: KnowledgeSourceKind;
  owner_ref?: string;
  trust_level?: KnowledgeSourceTrustLevel;
  freshness?: KnowledgeSourceFreshness;
  indexed_at?: string;
  ignored?: boolean;
};

export type LocalRepoKnowledgeIndexRequest = {
  index_id?: string;
  files?: LocalRepoKnowledgeFileInput[];
  allowlisted_paths?: string[];
  indexed_at?: string;
  live_collection_allowed?: false;
  side_effects?: [];
};

export type LocalRepoKnowledgeChunk = {
  chunk_id: string;
  record_id: string;
  source_path: string;
  file_kind: LocalRepoKnowledgeFileKind;
  title: string;
  heading: string;
  source_ref: KnowledgeSourceRef;
  normalized_text: string;
  packet_ids: string[];
  decision_ids: string[];
  tags: string[];
  token_estimate: number;
};

export type LocalRepoKnowledgeIndexEvidence = {
  contract_id: typeof localRepoKnowledgeIndexContract.contract_id;
  index_version: typeof localRepoKnowledgeIndexContract.index_version;
  index_id: string;
  allowlisted_paths: string[];
  file_count: number;
  chunk_count: number;
  source_registry: KnowledgeSourceRegistryEntry[];
  chunks: LocalRepoKnowledgeChunk[];
  knowledge_records: KnowledgeRecordEvidence[];
  constraints: {
    source_only: true;
    deterministic: true;
    allowlist_required: true;
    exact_source_refs_required: true;
    secret_values_allowed: false;
    live_collection_allowed: false;
    search_allowed: false;
    context_compiler_allowed: false;
  };
  indexed_at: string;
  live_collection_allowed: false;
  side_effects: [];
};

export type LocalRepoKnowledgeIndexErrorCode =
  | "local_repo_knowledge_index.invalid_request"
  | "local_repo_knowledge_index.unexpected_field"
  | "local_repo_knowledge_index.invalid_index_id"
  | "local_repo_knowledge_index.files_required"
  | "local_repo_knowledge_index.invalid_file"
  | "local_repo_knowledge_index.invalid_file_path"
  | "local_repo_knowledge_index.path_not_allowlisted"
  | "local_repo_knowledge_index.ignored_file_forbidden"
  | "local_repo_knowledge_index.unsupported_file_kind"
  | "local_repo_knowledge_index.invalid_file_content"
  | "local_repo_knowledge_index.invalid_json"
  | "local_repo_knowledge_index.secret_value_forbidden"
  | "local_repo_knowledge_index.invalid_allowlist"
  | "local_repo_knowledge_index.invalid_indexed_at"
  | "local_repo_knowledge_index.live_collection_forbidden"
  | "local_repo_knowledge_index.side_effects_forbidden"
  | "local_repo_knowledge_index.knowledge_record_invalid";

export type LocalRepoKnowledgeIndexError = {
  code: LocalRepoKnowledgeIndexErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type LocalRepoKnowledgeIndexResult =
  | {
      ok: true;
      local_repo_knowledge_index: LocalRepoKnowledgeIndexEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      local_repo_knowledge_index: null;
      errors: LocalRepoKnowledgeIndexError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedLocalRepoKnowledgeIndexRequest = {
  index_id: string;
  files: RequiredLocalRepoKnowledgeFileInput[];
  allowlisted_paths: string[];
  indexed_at: string;
};

type RequiredLocalRepoKnowledgeFileInput = {
  path: string;
  content: string;
  source_kind: KnowledgeSourceKind;
  owner_ref: string;
  trust_level: KnowledgeSourceTrustLevel;
  freshness: KnowledgeSourceFreshness;
  indexed_at: string;
};

type ChunkSection = {
  title: string;
  heading: string;
  line_start: number;
  line_end: number;
  normalized_text: string;
};

const defaultLocalRepoKnowledgeFiles: LocalRepoKnowledgeFileInput[] = [
  {
    path: "fixtures/knowledge/packets/BP-0183.md",
    content: [
      "# BP-0183: Local Repo Knowledge Index",
      "",
      "## Objective",
      "Build allowlisted local repo knowledge indexing after BP-0182 model exists.",
      "",
      "## Scope",
      "- Allowlisted local docs/source scanner.",
      "- Markdown/JSON/source normalization.",
      "- Deterministic semantic chunking by headings/sections.",
      "- Exact source refs with path, heading, and line range.",
    ].join("\n"),
    source_kind: "packet_doc",
  },
];

const defaultLocalRepoKnowledgeIndexRequest: Required<
  Pick<
    LocalRepoKnowledgeIndexRequest,
    | "index_id"
    | "files"
    | "allowlisted_paths"
    | "indexed_at"
    | "live_collection_allowed"
    | "side_effects"
  >
> = {
  index_id: "knowledge.index.bp0183.local_repo",
  files: defaultLocalRepoKnowledgeFiles,
  allowlisted_paths: [...localRepoKnowledgeIndexContract.default_allowlisted_paths],
  indexed_at: "2026-05-16T00:00:00.000Z",
  live_collection_allowed: false,
  side_effects: [],
};

const requestKeys = new Set([
  "index_id",
  "files",
  "allowlisted_paths",
  "indexed_at",
  "live_collection_allowed",
  "side_effects",
]);
const fileKeys = new Set([
  "path",
  "content",
  "source_kind",
  "owner_ref",
  "trust_level",
  "freshness",
  "indexed_at",
  "ignored",
]);
const supportedFileKinds = new Set<LocalRepoKnowledgeFileKind>(
  localRepoKnowledgeIndexContract.supported_file_kinds,
);
const sourceKinds = new Set<KnowledgeSourceKind>(
  localKnowledgeRecordContract.source_kinds,
);
const trustLevels = new Set<KnowledgeSourceTrustLevel>(
  localKnowledgeRecordContract.trust_levels,
);
const freshnessValues = new Set<KnowledgeSourceFreshness>(
  localKnowledgeRecordContract.freshness_values,
);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{2,127}$/;
const packetIdPattern = /BP-\d{4}/g;
const ownerRefPattern = /^(owner|agent|human|team):[a-z0-9_.:-]{2,96}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const relativePathPattern =
  /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+(?:\.[A-Za-z0-9]+)?$/;
const safeTextPattern = /^[\w .,:;@/()[\]#_+=-]{3,360}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|sk-[A-Za-z0-9]|secret:)/i;
const maxFileBytes = 100_000;
const maxChunkLines = 120;

export function createLocalRepoKnowledgeIndex(
  input: unknown = {},
): LocalRepoKnowledgeIndexResult {
  const normalized = normalizeLocalRepoKnowledgeIndexRequest(input);

  if (!normalized.ok) {
    return failLocalRepoKnowledgeIndex(normalized.errors);
  }

  const sortedFiles = [...normalized.request.files].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const chunks: LocalRepoKnowledgeChunk[] = [];
  const records: KnowledgeRecordEvidence[] = [];
  const registry = new Map<string, KnowledgeSourceRegistryEntry>();
  const recordErrors: LocalRepoKnowledgeIndexError[] = [];

  for (const file of sortedFiles) {
    const fileKind = inferFileKind(file.path);
    const sections = createSections(file.path, file.content, fileKind, recordErrors);
    const sourceRefs: KnowledgeSourceRef[] = [];

    for (const section of sections) {
      const sourceRef: KnowledgeSourceRef = {
        path: file.path,
        line_start: section.line_start,
        line_end: section.line_end,
      };
      if (section.heading.length >= 3) {
        sourceRef.heading = section.heading;
      }

      const packetIds = extractPacketIds(section.normalized_text, file.path);
      const decisionIds = inferDecisionIds(file.path);
      const recordId = createRecordId(file.path, section.line_start, section.line_end);
      const chunk: LocalRepoKnowledgeChunk = {
        chunk_id: createChunkId(file.path, section.line_start, section.line_end),
        record_id: recordId,
        source_path: file.path,
        file_kind: fileKind,
        title: section.title,
        heading: section.heading,
        source_ref: sourceRef,
        normalized_text: section.normalized_text,
        packet_ids: packetIds,
        decision_ids: decisionIds,
        tags: createTags(fileKind, packetIds),
        token_estimate: estimateTokens(section.normalized_text),
      };

      const record = createKnowledgeRecord({
        record_id: recordId,
        source_kind: file.source_kind,
        source_path: file.path,
        title: section.title,
        summary: createSummary(section.normalized_text, section.title),
        excerpt_ref: sourceRef,
        source_refs: [sourceRef],
        tags: chunk.tags,
        packet_ids: packetIds,
        decision_ids: decisionIds,
        owners: [file.owner_ref],
        stale_status: file.freshness,
        conflict_status: "none",
        risk_flags: ["policy_boundary"],
        last_indexed_at: normalized.request.indexed_at,
        live_collection_allowed: false,
        side_effects: [],
      });

      if (!record.ok) {
        recordErrors.push(
          localRepoKnowledgeIndexError(
            "local_repo_knowledge_index.knowledge_record_invalid",
            `/files/*/chunks/${chunks.length}`,
            "Derived knowledge record failed BP-0182 validation.",
          ),
        );
        continue;
      }

      chunks.push(chunk);
      records.push(record.knowledge_record);
      sourceRefs.push(sourceRef);
    }

    registry.set(file.path, {
      source_id: createSourceId(file.path),
      source_kind: file.source_kind,
      path: file.path,
      title: createFileTitle(file.path, file.content),
      owner_ref: file.owner_ref,
      trust_level: file.trust_level,
      freshness: file.freshness,
      allowlisted: true,
      source_refs: dedupeSourceRefs(sourceRefs),
      indexed_at: file.indexed_at,
      side_effects: [],
    });
  }

  if (recordErrors.length > 0) {
    return failLocalRepoKnowledgeIndex(recordErrors);
  }

  return {
    ok: true,
    local_repo_knowledge_index: {
      contract_id: localRepoKnowledgeIndexContract.contract_id,
      index_version: localRepoKnowledgeIndexContract.index_version,
      index_id: normalized.request.index_id,
      allowlisted_paths: normalized.request.allowlisted_paths,
      file_count: sortedFiles.length,
      chunk_count: chunks.length,
      source_registry: [...registry.values()].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
      chunks,
      knowledge_records: records,
      constraints: {
        source_only: true,
        deterministic: true,
        allowlist_required: true,
        exact_source_refs_required: true,
        secret_values_allowed: false,
        live_collection_allowed: false,
        search_allowed: false,
        context_compiler_allowed: false,
      },
      indexed_at: normalized.request.indexed_at,
      live_collection_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeLocalRepoKnowledgeIndexRequest(input: unknown):
  | {
      ok: true;
      request: NormalizedLocalRepoKnowledgeIndexRequest;
    }
  | {
      ok: false;
      errors: LocalRepoKnowledgeIndexError[];
    } {
  if (input === undefined || input === null) {
    input = {};
  }
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_request",
          "",
          "Local repo knowledge index request must be an object.",
        ),
      ],
    };
  }

  const merged = { ...defaultLocalRepoKnowledgeIndexRequest, ...input };
  const errors: LocalRepoKnowledgeIndexError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.unexpected_field",
          jsonPointer(key),
          "Unexpected local repo knowledge index field.",
        ),
      );
    }
  }

  if (typeof merged.index_id !== "string" || !stableId(merged.index_id)) {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.invalid_index_id",
        "/index_id",
        "Local repo knowledge index_id must be a stable lowercase id.",
      ),
    );
  }

  const allowlistedPaths = normalizeAllowlist(merged.allowlisted_paths, errors);
  const files = normalizeFiles(
    merged.files,
    allowlistedPaths,
    merged.indexed_at,
    errors,
  );

  if (
    typeof merged.indexed_at !== "string" ||
    !isoDateTimePattern.test(merged.indexed_at)
  ) {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.invalid_indexed_at",
        "/indexed_at",
        "Local repo knowledge index indexed_at must be an ISO UTC timestamp.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "live_collection_allowed") &&
    merged.live_collection_allowed !== false
  ) {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.live_collection_forbidden",
        "/live_collection_allowed",
        "Local repo knowledge index cannot enable live collection.",
      ),
    );
  }

  if (
    Object.hasOwn(merged, "side_effects") &&
    (!Array.isArray(merged.side_effects) || merged.side_effects.length !== 0)
  ) {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.side_effects_forbidden",
        "/side_effects",
        "Local repo knowledge index must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request: {
      index_id: merged.index_id,
      files,
      allowlisted_paths: allowlistedPaths,
      indexed_at: merged.indexed_at,
    },
  };
}

function normalizeAllowlist(
  value: unknown,
  errors: LocalRepoKnowledgeIndexError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.invalid_allowlist",
        "/allowlisted_paths",
        "Local repo knowledge index requires allowlisted paths.",
      ),
    );
    return [];
  }

  const paths: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string" || !safeAllowlistPath(item)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_allowlist",
          `/allowlisted_paths/${index}`,
          "Allowlisted path must be a safe repo-relative file or directory.",
        ),
      );
      return;
    }
    paths.push(item);
  });
  return [...new Set(paths)].sort();
}

function normalizeFiles(
  value: unknown,
  allowlistedPaths: string[],
  defaultIndexedAt: unknown,
  errors: LocalRepoKnowledgeIndexError[],
): RequiredLocalRepoKnowledgeFileInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.files_required",
        "/files",
        "Local repo knowledge index requires file snapshots.",
      ),
    );
    return [];
  }

  const files: RequiredLocalRepoKnowledgeFileInput[] = [];
  value.forEach((item, index) => {
    const path = `/files/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file",
          path,
          "Local repo knowledge index file entry must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!fileKeys.has(key)) {
        errors.push(
          localRepoKnowledgeIndexError(
            "local_repo_knowledge_index.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected local repo knowledge index file field.",
          ),
        );
      }
    }

    if (item.ignored === true || isIgnoredPath(item.path)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.ignored_file_forbidden",
          `${path}/path`,
          "Ignored local repo file cannot be indexed.",
        ),
      );
    }

    if (typeof item.path !== "string" || !safeRelativePath(item.path)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file_path",
          `${path}/path`,
          "Local repo knowledge index file path must be safe and repo-relative.",
        ),
      );
      return;
    }

    if (!matchesAllowlist(item.path, allowlistedPaths)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.path_not_allowlisted",
          `${path}/path`,
          "Local repo file is outside allowed index paths.",
        ),
      );
    }

    const fileKind = inferFileKind(item.path);
    if (!supportedFileKinds.has(fileKind)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.unsupported_file_kind",
          `${path}/path`,
          "Local repo file kind is unsupported for BP-0183 indexing.",
        ),
      );
    }

    if (
      typeof item.content !== "string" ||
      item.content.trim().length === 0 ||
      item.content.length > maxFileBytes
    ) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file_content",
          `${path}/content`,
          "Local repo file content must be nonempty and within BP-0183 limits.",
        ),
      );
    } else if (secretLikePattern.test(item.content)) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.secret_value_forbidden",
          `${path}/content`,
          "Local repo file content cannot contain secret-like values.",
        ),
      );
    }

    const sourceKind =
      typeof item.source_kind === "string" && sourceKinds.has(item.source_kind as never)
        ? (item.source_kind as KnowledgeSourceKind)
        : inferSourceKind(item.path);
    if (
      Object.hasOwn(item, "source_kind") &&
      (typeof item.source_kind !== "string" ||
        !sourceKinds.has(item.source_kind as never))
    ) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file",
          `${path}/source_kind`,
          "Local repo knowledge index source_kind is unsupported.",
        ),
      );
    }

    const ownerRef =
      typeof item.owner_ref === "string" && ownerRefPattern.test(item.owner_ref)
        ? item.owner_ref
        : "owner:lnsat-platform";
    if (
      Object.hasOwn(item, "owner_ref") &&
      (typeof item.owner_ref !== "string" || !ownerRefPattern.test(item.owner_ref))
    ) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file",
          `${path}/owner_ref`,
          "Local repo knowledge index owner_ref must be safe.",
        ),
      );
    }

    const trustLevel =
      typeof item.trust_level === "string" && trustLevels.has(item.trust_level as never)
        ? (item.trust_level as KnowledgeSourceTrustLevel)
        : "repo_truth";
    if (
      Object.hasOwn(item, "trust_level") &&
      (typeof item.trust_level !== "string" ||
        !trustLevels.has(item.trust_level as never))
    ) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file",
          `${path}/trust_level`,
          "Local repo knowledge index trust_level is unsupported.",
        ),
      );
    }

    const freshness =
      typeof item.freshness === "string" && freshnessValues.has(item.freshness as never)
        ? (item.freshness as KnowledgeSourceFreshness)
        : "current";
    if (
      Object.hasOwn(item, "freshness") &&
      (typeof item.freshness !== "string" ||
        !freshnessValues.has(item.freshness as never))
    ) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file",
          `${path}/freshness`,
          "Local repo knowledge index freshness is unsupported.",
        ),
      );
    }

    const indexedAt =
      typeof item.indexed_at === "string" && isoDateTimePattern.test(item.indexed_at)
        ? item.indexed_at
        : typeof defaultIndexedAt === "string"
          ? defaultIndexedAt
          : defaultLocalRepoKnowledgeIndexRequest.indexed_at;
    if (
      Object.hasOwn(item, "indexed_at") &&
      (typeof item.indexed_at !== "string" || !isoDateTimePattern.test(item.indexed_at))
    ) {
      errors.push(
        localRepoKnowledgeIndexError(
          "local_repo_knowledge_index.invalid_file",
          `${path}/indexed_at`,
          "Local repo knowledge index file indexed_at must be ISO UTC.",
        ),
      );
    }

    if (
      typeof item.content === "string" &&
      typeof item.path === "string" &&
      safeRelativePath(item.path)
    ) {
      files.push({
        path: item.path,
        content: item.content,
        source_kind: sourceKind,
        owner_ref: ownerRef,
        trust_level: trustLevel,
        freshness,
        indexed_at: indexedAt,
      });
    }
  });

  return files;
}

function createSections(
  filePath: string,
  content: string,
  fileKind: LocalRepoKnowledgeFileKind,
  errors: LocalRepoKnowledgeIndexError[],
): ChunkSection[] {
  if (fileKind === "json") {
    return createJsonSections(filePath, content, errors);
  }
  if (fileKind === "markdown") {
    return createMarkdownSections(filePath, content);
  }
  return createSourceSections(filePath, content);
}

function createMarkdownSections(filePath: string, content: string): ChunkSection[] {
  const lines = normalizeNewlines(content).split("\n");
  const headings: Array<{ line: number; heading: string }> = [];
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (match?.[2]) {
      headings.push({ line: index + 1, heading: sanitizeHeading(match[2]) });
    }
  });

  if (headings.length === 0) {
    return splitSection({
      title: createFileTitle(filePath, content),
      heading: "Document",
      line_start: 1,
      line_end: lastContentLine(lines),
      normalized_text: normalizeExcerpt(lines.join("\n")),
    });
  }

  const sections: ChunkSection[] = [];
  const firstHeading = headings[0];
  if (firstHeading && firstHeading.line > 1) {
    const preamble = lines.slice(0, firstHeading.line - 1).join("\n");
    if (preamble.trim().length > 0) {
      sections.push(
        ...splitSection({
          title: createFileTitle(filePath, content),
          heading: "Preamble",
          line_start: 1,
          line_end: firstHeading.line - 1,
          normalized_text: normalizeExcerpt(preamble),
        }),
      );
    }
  }

  headings.forEach((heading, index) => {
    const nextHeading = headings[index + 1];
    const end = nextHeading ? nextHeading.line - 1 : lastContentLine(lines);
    const sectionText = lines.slice(heading.line - 1, end).join("\n");
    sections.push(
      ...splitSection({
        title: sanitizeRecordText(heading.heading),
        heading: heading.heading,
        line_start: heading.line,
        line_end: end,
        normalized_text: normalizeExcerpt(sectionText),
      }),
    );
  });

  return sections;
}

function createJsonSections(
  filePath: string,
  content: string,
  errors: LocalRepoKnowledgeIndexError[],
): ChunkSection[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    errors.push(
      localRepoKnowledgeIndexError(
        "local_repo_knowledge_index.invalid_json",
        "/files/content",
        "JSON source file must parse before indexing.",
      ),
    );
    return [];
  }

  const lines = normalizeNewlines(content).split("\n");
  if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) {
    return splitSection({
      title: createFileTitle(filePath, content),
      heading: "JSON Document",
      line_start: 1,
      line_end: lastContentLine(lines),
      normalized_text: normalizeExcerpt(stableStringify(parsed)),
    });
  }

  return Object.keys(parsed)
    .sort()
    .flatMap((key) => {
      const value = parsed[key];
      const line = findJsonKeyLine(lines, key);
      return splitSection({
        title: sanitizeRecordText(key),
        heading: sanitizeHeading(key),
        line_start: line,
        line_end: line,
        normalized_text: normalizeExcerpt(`${key}: ${stableStringify(value)}`),
      });
    });
}

function createSourceSections(filePath: string, content: string): ChunkSection[] {
  const lines = normalizeNewlines(content).split("\n");
  const symbols: Array<{ line: number; heading: string }> = [];
  lines.forEach((line, index) => {
    const match =
      /^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/.exec(
        line,
      );
    if (match?.[1]) {
      symbols.push({ line: index + 1, heading: sanitizeHeading(match[1]) });
    }
  });

  if (symbols.length === 0) {
    return splitSection({
      title: createFileTitle(filePath, content),
      heading: "Source File",
      line_start: 1,
      line_end: lastContentLine(lines),
      normalized_text: normalizeExcerpt(lines.join("\n")),
    });
  }

  return symbols.flatMap((symbol, index) => {
    const nextSymbol = symbols[index + 1];
    const end = nextSymbol ? nextSymbol.line - 1 : lastContentLine(lines);
    const sectionText = lines.slice(symbol.line - 1, end).join("\n");
    return splitSection({
      title: sanitizeRecordText(symbol.heading),
      heading: symbol.heading,
      line_start: symbol.line,
      line_end: end,
      normalized_text: normalizeExcerpt(sectionText),
    });
  });
}

function splitSection(section: ChunkSection): ChunkSection[] {
  if (section.line_end < section.line_start) {
    return [];
  }

  const sections: ChunkSection[] = [];
  let lineStart = section.line_start;
  let part = 1;
  while (lineStart <= section.line_end) {
    const lineEnd = Math.min(section.line_end, lineStart + maxChunkLines - 1);
    const heading =
      section.line_end - section.line_start + 1 > maxChunkLines
        ? sanitizeHeading(`${section.heading} Part ${part}`)
        : section.heading;
    sections.push({
      title: section.title,
      heading,
      line_start: lineStart,
      line_end: lineEnd,
      normalized_text: section.normalized_text,
    });
    lineStart = lineEnd + 1;
    part += 1;
  }
  return sections;
}

function inferFileKind(path: string): LocalRepoKnowledgeFileKind {
  if (path.endsWith(".md")) {
    return "markdown";
  }
  if (path.endsWith(".json")) {
    return "json";
  }
  if (path.endsWith(".ts") || path.endsWith(".tsx")) {
    return "typescript";
  }
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return "javascript";
  }
  return "source";
}

function inferSourceKind(path: string): KnowledgeSourceKind {
  if (path.startsWith("fixtures/project-state/packets/")) {
    return "packet_doc";
  }
  if (path === "fixtures/knowledge/decision-history.md") {
    return "decision_doc";
  }
  if (path.startsWith("docs/architecture/")) {
    return "architecture_doc";
  }
  if (
    path === "docs/reference/CONTRACT_PROVENANCE.md" ||
    path === "docs/reference/CONTRACT_PROVENANCE.md" ||
    path === "docs/reference/CONTRACT_PROVENANCE.md"
  ) {
    return "status_doc";
  }
  if (path.startsWith("packages/") || path.startsWith("apps/")) {
    return "source_file";
  }
  return "repo_doc";
}

function createFileTitle(path: string, content: string): string {
  const firstHeading = normalizeNewlines(content)
    .split("\n")
    .find((line) => /^(#{1,6})\s+/.test(line.trim()));
  if (firstHeading) {
    return sanitizeRecordText(firstHeading.replace(/^(#{1,6})\s+/, ""));
  }
  const fileName = path.split("/").pop() ?? "Local Repo Source";
  return sanitizeRecordText(fileName.replace(/\.[^.]+$/, "").replaceAll("-", " "));
}

function createSummary(text: string, fallbackTitle: string): string {
  const base = normalizeExcerpt(text).slice(0, 300) || fallbackTitle;
  return sanitizeRecordText(base);
}

function sanitizeHeading(value: string): string {
  return sanitizeRecordText(value).slice(0, 120);
}

function sanitizeRecordText(value: string): string {
  const normalized = value
    .replace(/[^\w .,:;@/()[\]#_+=-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const safe = normalized.length >= 3 ? normalized : "Local Repo Source";
  return safeTextPattern.test(safe) ? safe.slice(0, 360) : "Local Repo Source";
}

function normalizeExcerpt(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\s+/g, " ").trim();
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function lastContentLine(lines: string[]): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim()) {
      return index + 1;
    }
  }
  return 1;
}

function findJsonKeyLine(lines: string[], key: string): number {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyPattern = new RegExp(`^\\s*"${escapedKey}"\\s*:`);
  const index = lines.findIndex((line) => keyPattern.test(line));
  return index >= 0 ? index + 1 : 1;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function extractPacketIds(text: string, path: string): string[] {
  const ids = new Set<string>();
  for (const match of `${path} ${text}`.matchAll(packetIdPattern)) {
    ids.add(match[0]);
  }
  return [...ids].sort();
}

function inferDecisionIds(path: string): string[] {
  return path === "fixtures/knowledge/decision-history.md"
    ? ["decision.local_repo_index"]
    : [];
}

function createTags(
  fileKind: LocalRepoKnowledgeFileKind,
  packetIds: string[],
): string[] {
  return [
    "local_repo",
    "knowledge_index",
    fileKind,
    ...packetIds.map((packetId) => packetId.toLowerCase().replace("-", "_")),
  ];
}

function createRecordId(path: string, lineStart: number, lineEnd: number): string {
  return `knowledge.record.${pathSlug(path)}.${lineStart}_${lineEnd}`;
}

function createChunkId(path: string, lineStart: number, lineEnd: number): string {
  return `knowledge.chunk.${pathSlug(path)}.${lineStart}_${lineEnd}`;
}

function createSourceId(path: string): string {
  return `knowledge.source.${pathSlug(path)}`;
}

function pathSlug(path: string): string {
  const slug = path
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "local_repo_source";
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function safeAllowlistPath(value: string): boolean {
  const normalized = value.endsWith("/") ? value.slice(0, -1) : value;
  return normalized.length > 0 && safeRelativePath(normalized);
}

function matchesAllowlist(path: string, allowlistedPaths: string[]): boolean {
  return allowlistedPaths.some((entry) => {
    if (entry.endsWith("/")) {
      return path.startsWith(entry);
    }
    return path === entry;
  });
}

function isIgnoredPath(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return (
    value === ".DS_Store" ||
    value.endsWith(".DS_Store") ||
    value.endsWith(".tsbuildinfo") ||
    value.includes("node_modules/") ||
    value.includes("/dist/") ||
    value.startsWith("dist/") ||
    value.includes("/.next/") ||
    value.startsWith(".next/") ||
    value.includes("/tmp/") ||
    value.startsWith("tmp/") ||
    value.includes("/.git/") ||
    value.startsWith(".git/") ||
    value.endsWith(".pem") ||
    value.endsWith(".key") ||
    value.endsWith(".p12")
  );
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

function stableId(value: string): boolean {
  return stableIdPattern.test(value) && !secretLikePattern.test(value);
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

function failLocalRepoKnowledgeIndex(
  errors: LocalRepoKnowledgeIndexError[],
): LocalRepoKnowledgeIndexResult {
  return {
    ok: false,
    local_repo_knowledge_index: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function localRepoKnowledgeIndexError(
  code: LocalRepoKnowledgeIndexErrorCode,
  path: string,
  message: string,
): LocalRepoKnowledgeIndexError {
  return {
    code,
    path,
    message,
    severity: "error",
  };
}

function dedupeErrors(
  errors: LocalRepoKnowledgeIndexError[],
): LocalRepoKnowledgeIndexError[] {
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
