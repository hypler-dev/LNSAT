import { sourceArchiveExecutionReadinessContract } from "./source-archive-execution-readiness.js";

export const RELEASE_NOTES_CHANGELOG_READINESS_STATUS = "source_only";

export const releaseNotesChangelogReadinessEvidenceKinds = [
  "changelog_ref",
  "release_notes_ref",
  "release_summary_ref",
  "user_visible_surface_ref",
  "artifact_status_ref",
  "blocked_scope_ref",
  "support_status_ref",
  "known_limitations_ref",
  "upgrade_migration_ref",
  "rollback_ref",
  "approval_ref",
] as const;

export const releaseNotesChangelogReadinessBlockedFlags = [
  "github_release_creation_allowed",
  "release_notes_publication_allowed",
  "source_tag_creation_allowed",
  "source_archive_creation_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "release_upload_allowed",
  "stable_latest_pointer_mutation_allowed",
  "download_page_mutation_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseNotesChangelogReadinessContract = {
  contract_id: "lnsat.release_notes_changelog_readiness.v0_1",
  extends_contract_id: sourceArchiveExecutionReadinessContract.contract_id,
  packet_ref: "BP-0254",
  selected_after_packet_ref: "BP-0253",
  contract_authority:
    "source_only_release_notes_changelog_readiness_no_publication_release_tag_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/RELEASE_NOTES_CHANGELOG_READINESS.md",
    "CHANGELOG.md",
    "CHANGELOG.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type ReleaseNotesReadinessEvidenceKind =
  (typeof releaseNotesChangelogReadinessEvidenceKinds)[number];
export type ReleaseNotesReadinessBlockedFlag =
  (typeof releaseNotesChangelogReadinessBlockedFlags)[number];

export type ReleaseNotesReadinessIdentity = {
  packet_ref: "BP-0254";
  selected_after_packet_ref: "BP-0253";
  release_version: "0.1.0-source-plan";
  notes_state: "release_notes_publication_not_ready";
  changelog_state: "draft_source_only";
  publication_allowed: false;
};

export type ReleaseNotesReadinessSummary = {
  changelog_ref: "CHANGELOG.md";
  release_notes_ref: "CHANGELOG.md";
  github_release_state: "not_created";
  support_state: "source_plan_no_support_window";
  current_allowed_output: "source_only_release_notes_packet";
};

export type ReleaseNotesReadinessEvidenceRef = {
  evidence_kind: ReleaseNotesReadinessEvidenceKind;
  source_ref: string;
  required: true;
  ready: false;
  approved: false;
  publication_allowed: false;
};

export type ReleaseNotesReadinessNoLivePosture = Record<
  ReleaseNotesReadinessBlockedFlag,
  false
>;

export type ReleaseNotesReadinessRequest = Partial<
  Record<ReleaseNotesReadinessBlockedFlag, false>
> & {
  identity?: ReleaseNotesReadinessIdentity;
  readiness_summary?: ReleaseNotesReadinessSummary;
  evidence_refs?: ReleaseNotesReadinessEvidenceRef[];
  no_live_posture?: ReleaseNotesReadinessNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseNotesReadinessErrorCode =
  | "release_notes_readiness.identity_invalid"
  | "release_notes_readiness.summary_invalid"
  | "release_notes_readiness.evidence_required"
  | "release_notes_readiness.evidence_invalid"
  | "release_notes_readiness.no_live_posture_drift"
  | "release_notes_readiness.blocked_capability_drift"
  | "release_notes_readiness.unexpected_field"
  | "release_notes_readiness.side_effects_forbidden";

export type ReleaseNotesReadinessError = {
  code: ReleaseNotesReadinessErrorCode;
  path: string;
  message: string;
};

export type ReleaseNotesReadinessEvidence = {
  contract_id: typeof releaseNotesChangelogReadinessContract.contract_id;
  extends_contract_id: typeof sourceArchiveExecutionReadinessContract.contract_id;
  identity: ReleaseNotesReadinessIdentity;
  readiness_summary: ReleaseNotesReadinessSummary;
  evidence_refs: ReleaseNotesReadinessEvidenceRef[];
  no_live_posture: ReleaseNotesReadinessNoLivePosture;
  blocked_capabilities: ReleaseNotesReadinessBlockedFlag[];
  github_release_creations: [];
  release_notes_publications: [];
  source_tags_created: [];
  source_archives_created: [];
  checksum_generations: [];
  signing_executions: [];
  sbom_generations: [];
  provenance_generations: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  side_effects: [];
};

export type ReleaseNotesReadinessResult =
  | {
      ok: true;
      release_notes_readiness: ReleaseNotesReadinessEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseNotesReadinessError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseNotesReadinessIdentity: ReleaseNotesReadinessIdentity = {
  packet_ref: "BP-0254",
  selected_after_packet_ref: "BP-0253",
  release_version: "0.1.0-source-plan",
  notes_state: "release_notes_publication_not_ready",
  changelog_state: "draft_source_only",
  publication_allowed: false,
};

export const defaultReleaseNotesReadinessSummary: ReleaseNotesReadinessSummary = {
  changelog_ref: "CHANGELOG.md",
  release_notes_ref: "CHANGELOG.md",
  github_release_state: "not_created",
  support_state: "source_plan_no_support_window",
  current_allowed_output: "source_only_release_notes_packet",
};

export const defaultReleaseNotesReadinessEvidenceRefs: ReleaseNotesReadinessEvidenceRef[] =
  releaseNotesChangelogReadinessEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/RELEASE_NOTES_CHANGELOG_READINESS.md#${evidence_kind}`,
    required: true,
    ready: false,
    approved: false,
    publication_allowed: false,
  }));

export const defaultReleaseNotesReadinessNoLivePosture = Object.fromEntries(
  releaseNotesChangelogReadinessBlockedFlags.map((flag) => [flag, false]),
) as ReleaseNotesReadinessNoLivePosture;

export const defaultReleaseNotesReadiness: ReleaseNotesReadinessRequest = {
  identity: defaultReleaseNotesReadinessIdentity,
  readiness_summary: defaultReleaseNotesReadinessSummary,
  evidence_refs: defaultReleaseNotesReadinessEvidenceRefs,
  no_live_posture: defaultReleaseNotesReadinessNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "readiness_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...releaseNotesChangelogReadinessBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|git tag|npm publish|docker build|docker push|cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createReleaseNotesReadiness(
  request: ReleaseNotesReadinessRequest = {},
): ReleaseNotesReadinessResult {
  const merged = { ...defaultReleaseNotesReadiness, ...request };
  const errors: ReleaseNotesReadinessError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("release_notes_readiness.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultReleaseNotesReadinessIdentity)) {
    errors.push(error("release_notes_readiness.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.readiness_summary, defaultReleaseNotesReadinessSummary)) {
    errors.push(error("release_notes_readiness.summary_invalid", "/readiness_summary"));
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("release_notes_readiness.side_effects_forbidden", "/side_effects"),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_notes_readiness: {
      contract_id: releaseNotesChangelogReadinessContract.contract_id,
      extends_contract_id: sourceArchiveExecutionReadinessContract.contract_id,
      identity: merged.identity ?? defaultReleaseNotesReadinessIdentity,
      readiness_summary:
        merged.readiness_summary ?? defaultReleaseNotesReadinessSummary,
      evidence_refs: merged.evidence_refs ?? defaultReleaseNotesReadinessEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseNotesReadinessNoLivePosture,
      blocked_capabilities: [...releaseNotesChangelogReadinessBlockedFlags],
      github_release_creations: [],
      release_notes_publications: [],
      source_tags_created: [],
      source_archives_created: [],
      checksum_generations: [],
      signing_executions: [],
      sbom_generations: [],
      provenance_generations: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateEvidenceRefs(
  refs: ReleaseNotesReadinessEvidenceRef[] | undefined,
  errors: ReleaseNotesReadinessError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("release_notes_readiness.evidence_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of releaseNotesChangelogReadinessEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(error("release_notes_readiness.evidence_required", "/evidence_refs"));
    }
  }

  for (const ref of refs) {
    if (
      !releaseNotesChangelogReadinessEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.ready !== false ||
      ref.approved !== false ||
      ref.publication_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("release_notes_readiness.evidence_invalid", "/evidence_refs"));
    }
  }
}

function validateNoLivePosture(
  request: ReleaseNotesReadinessRequest,
  errors: ReleaseNotesReadinessError[],
): void {
  if (!sameJson(request.no_live_posture, defaultReleaseNotesReadinessNoLivePosture)) {
    errors.push(
      error("release_notes_readiness.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of releaseNotesChangelogReadinessBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("release_notes_readiness.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: ReleaseNotesReadinessErrorCode,
  path: string,
): ReleaseNotesReadinessError {
  return {
    code,
    path,
    message:
      "Release notes readiness must remain source-only, not published, not approved, and non-executing.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
