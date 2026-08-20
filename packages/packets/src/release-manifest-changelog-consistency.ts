import { releaseNotesChangelogReadinessContract } from "./release-notes-changelog-readiness.js";

export const RELEASE_MANIFEST_CHANGELOG_CONSISTENCY_STATUS = "source_only";

export const releaseManifestChangelogConsistencyEvidenceKinds = [
  "release_version_match",
  "release_status_match",
  "public_surface_match",
  "artifact_family_match",
  "blocked_scope_match",
  "domain_state_match",
  "support_state_match",
  "approval_state_match",
  "source_archive_state_match",
  "release_notes_state_match",
  "latest_pointer_state_match",
  "side_effects_match",
] as const;

export const releaseManifestChangelogConsistencyBlockedFlags = [
  "source_tag_creation_allowed",
  "source_archive_creation_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "github_release_creation_allowed",
  "release_notes_publication_allowed",
  "release_upload_allowed",
  "stable_latest_pointer_mutation_allowed",
  "download_page_mutation_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseManifestChangelogConsistencyContract = {
  contract_id: "lnsat.release_manifest_changelog_consistency.v0_1",
  extends_contract_id: releaseNotesChangelogReadinessContract.contract_id,
  packet_ref: "BP-0255",
  selected_after_packet_ref: "BP-0254",
  contract_authority:
    "source_only_release_manifest_changelog_consistency_no_release_publication_tag_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/RELEASE_MANIFEST_CHANGELOG_CONSISTENCY_GATE.md",
    "fixtures/release/source-plan.json",
    "CHANGELOG.md",
    "CHANGELOG.md",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type ReleaseConsistencyEvidenceKind =
  (typeof releaseManifestChangelogConsistencyEvidenceKinds)[number];
export type ReleaseConsistencyBlockedFlag =
  (typeof releaseManifestChangelogConsistencyBlockedFlags)[number];

export type ReleaseConsistencyIdentity = {
  packet_ref: "BP-0255";
  selected_after_packet_ref: "BP-0254";
  release_version: "0.1.0-source-plan";
  gate_state: "release_manifest_changelog_consistency_not_approved";
  approval_state: "release_execution_approval_not_approved";
  publication_allowed: false;
};

export type ReleaseConsistencySummary = {
  manifest_ref: "fixtures/release/source-plan.json";
  changelog_ref: "CHANGELOG.md";
  release_notes_ref: "CHANGELOG.md";
  download_page_ref: "apps/console/src/app/page.tsx";
  current_allowed_output: "source_only_consistency_packet";
};

export type ReleaseConsistencyEvidenceRef = {
  evidence_kind: ReleaseConsistencyEvidenceKind;
  source_ref: string;
  required: true;
  consistent: false;
  approved: false;
  mutation_allowed: false;
};

export type ReleaseConsistencyNoLivePosture = Record<
  ReleaseConsistencyBlockedFlag,
  false
>;

export type ReleaseConsistencyRequest = Partial<
  Record<ReleaseConsistencyBlockedFlag, false>
> & {
  identity?: ReleaseConsistencyIdentity;
  consistency_summary?: ReleaseConsistencySummary;
  evidence_refs?: ReleaseConsistencyEvidenceRef[];
  no_live_posture?: ReleaseConsistencyNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseConsistencyErrorCode =
  | "release_consistency.identity_invalid"
  | "release_consistency.summary_invalid"
  | "release_consistency.evidence_required"
  | "release_consistency.evidence_invalid"
  | "release_consistency.no_live_posture_drift"
  | "release_consistency.blocked_capability_drift"
  | "release_consistency.unexpected_field"
  | "release_consistency.side_effects_forbidden";

export type ReleaseConsistencyError = {
  code: ReleaseConsistencyErrorCode;
  path: string;
  message: string;
};

export type ReleaseConsistencyEvidence = {
  contract_id: typeof releaseManifestChangelogConsistencyContract.contract_id;
  extends_contract_id: typeof releaseNotesChangelogReadinessContract.contract_id;
  identity: ReleaseConsistencyIdentity;
  consistency_summary: ReleaseConsistencySummary;
  evidence_refs: ReleaseConsistencyEvidenceRef[];
  no_live_posture: ReleaseConsistencyNoLivePosture;
  blocked_capabilities: ReleaseConsistencyBlockedFlag[];
  source_tags_created: [];
  source_archives_created: [];
  checksum_generations: [];
  signing_executions: [];
  sbom_generations: [];
  provenance_generations: [];
  github_release_creations: [];
  release_notes_publications: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  side_effects: [];
};

export type ReleaseConsistencyResult =
  | {
      ok: true;
      release_consistency: ReleaseConsistencyEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseConsistencyError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseConsistencyIdentity: ReleaseConsistencyIdentity = {
  packet_ref: "BP-0255",
  selected_after_packet_ref: "BP-0254",
  release_version: "0.1.0-source-plan",
  gate_state: "release_manifest_changelog_consistency_not_approved",
  approval_state: "release_execution_approval_not_approved",
  publication_allowed: false,
};

export const defaultReleaseConsistencySummary: ReleaseConsistencySummary = {
  manifest_ref: "fixtures/release/source-plan.json",
  changelog_ref: "CHANGELOG.md",
  release_notes_ref: "CHANGELOG.md",
  download_page_ref: "apps/console/src/app/page.tsx",
  current_allowed_output: "source_only_consistency_packet",
};

export const defaultReleaseConsistencyEvidenceRefs: ReleaseConsistencyEvidenceRef[] =
  releaseManifestChangelogConsistencyEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/RELEASE_MANIFEST_CHANGELOG_CONSISTENCY_GATE.md#${evidence_kind}`,
    required: true,
    consistent: false,
    approved: false,
    mutation_allowed: false,
  }));

export const defaultReleaseConsistencyNoLivePosture = Object.fromEntries(
  releaseManifestChangelogConsistencyBlockedFlags.map((flag) => [flag, false]),
) as ReleaseConsistencyNoLivePosture;

export const defaultReleaseConsistency: ReleaseConsistencyRequest = {
  identity: defaultReleaseConsistencyIdentity,
  consistency_summary: defaultReleaseConsistencySummary,
  evidence_refs: defaultReleaseConsistencyEvidenceRefs,
  no_live_posture: defaultReleaseConsistencyNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "consistency_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...releaseManifestChangelogConsistencyBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|git tag|npm publish|docker build|docker push|cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createReleaseConsistency(
  request: ReleaseConsistencyRequest = {},
): ReleaseConsistencyResult {
  const merged = { ...defaultReleaseConsistency, ...request };
  const errors: ReleaseConsistencyError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("release_consistency.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultReleaseConsistencyIdentity)) {
    errors.push(error("release_consistency.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.consistency_summary, defaultReleaseConsistencySummary)) {
    errors.push(error("release_consistency.summary_invalid", "/consistency_summary"));
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(error("release_consistency.side_effects_forbidden", "/side_effects"));
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_consistency: {
      contract_id: releaseManifestChangelogConsistencyContract.contract_id,
      extends_contract_id: releaseNotesChangelogReadinessContract.contract_id,
      identity: merged.identity ?? defaultReleaseConsistencyIdentity,
      consistency_summary:
        merged.consistency_summary ?? defaultReleaseConsistencySummary,
      evidence_refs: merged.evidence_refs ?? defaultReleaseConsistencyEvidenceRefs,
      no_live_posture: merged.no_live_posture ?? defaultReleaseConsistencyNoLivePosture,
      blocked_capabilities: [...releaseManifestChangelogConsistencyBlockedFlags],
      source_tags_created: [],
      source_archives_created: [],
      checksum_generations: [],
      signing_executions: [],
      sbom_generations: [],
      provenance_generations: [],
      github_release_creations: [],
      release_notes_publications: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateEvidenceRefs(
  refs: ReleaseConsistencyEvidenceRef[] | undefined,
  errors: ReleaseConsistencyError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("release_consistency.evidence_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of releaseManifestChangelogConsistencyEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(error("release_consistency.evidence_required", "/evidence_refs"));
    }
  }

  for (const ref of refs) {
    if (
      !releaseManifestChangelogConsistencyEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.consistent !== false ||
      ref.approved !== false ||
      ref.mutation_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("release_consistency.evidence_invalid", "/evidence_refs"));
    }
  }
}

function validateNoLivePosture(
  request: ReleaseConsistencyRequest,
  errors: ReleaseConsistencyError[],
): void {
  if (!sameJson(request.no_live_posture, defaultReleaseConsistencyNoLivePosture)) {
    errors.push(error("release_consistency.no_live_posture_drift", "/no_live_posture"));
  }

  for (const flag of releaseManifestChangelogConsistencyBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(error("release_consistency.blocked_capability_drift", `/${flag}`));
    }
  }
}

function error(
  code: ReleaseConsistencyErrorCode,
  path: string,
): ReleaseConsistencyError {
  return {
    code,
    path,
    message:
      "Release consistency gate must remain source-only, not approved, and non-mutating.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
