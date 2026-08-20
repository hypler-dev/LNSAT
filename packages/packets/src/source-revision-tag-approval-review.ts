import { stableLatestPointerApprovalReviewContract } from "./stable-latest-pointer-approval-review.js";

export const SOURCE_REVISION_TAG_APPROVAL_REVIEW_STATUS = "source_only";

export const sourceRevisionTagApprovalEvidenceKinds = [
  "source_revision_candidate_ref",
  "branch_ref",
  "tag_name_policy_ref",
  "release_version_ref",
  "manifest_ref",
  "changelog_ref",
  "release_notes_ref",
  "source_archive_readiness_ref",
  "release_consistency_ref",
  "stable_latest_pointer_approval_ref",
  "generated_file_policy_ref",
  "license_notice_ref",
  "dependency_lockfile_ref",
  "build_reproducibility_ref",
  "approval_ref",
] as const;

export const sourceRevisionTagApprovalBlockedFlags = [
  "source_revision_blessing_allowed",
  "tag_creation_allowed",
  "git_commit_allowed",
  "git_push_allowed",
  "source_archive_creation_allowed",
  "checksum_generation_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "stable_latest_pointer_mutation_allowed",
  "download_page_mutation_allowed",
  "release_manifest_write_allowed",
  "external_service_call_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const sourceRevisionTagApprovalReviewContract = {
  contract_id: "lnsat.source_revision_tag_approval_review.v0_1",
  extends_contract_id: stableLatestPointerApprovalReviewContract.contract_id,
  packet_ref: "BP-0257",
  selected_after_packet_ref: "BP-0256",
  contract_authority:
    "source_only_source_revision_tag_approval_no_git_tag_archive_release_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/SOURCE_REVISION_TAG_APPROVAL_REVIEW.md",
    "fixtures/release/source-plan.json",
    "CHANGELOG.md",
    "CHANGELOG.md",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type SourceRevisionTagApprovalEvidenceKind =
  (typeof sourceRevisionTagApprovalEvidenceKinds)[number];
export type SourceRevisionTagApprovalBlockedFlag =
  (typeof sourceRevisionTagApprovalBlockedFlags)[number];

export type SourceRevisionTagApprovalIdentity = {
  packet_ref: "BP-0257";
  selected_after_packet_ref: "BP-0256";
  release_version: "0.1.0-source-plan";
  gate_state: "source_revision_tag_approval_not_approved";
  approval_state: "not_approved";
  tag_execution_allowed: false;
};

export type SourceRevisionTagApprovalSummary = {
  source_revision_state: "candidate_ref_required";
  branch_state: "release_branch_not_selected";
  tag_name_state: "planned_not_created";
  archive_state: "not_created";
  current_allowed_output: "source_only_revision_tag_approval_review";
};

export type SourceRevisionTagApprovalEvidenceRef = {
  evidence_kind: SourceRevisionTagApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  execution_allowed: false;
};

export type SourceRevisionTagApprovalNoLivePosture = Record<
  SourceRevisionTagApprovalBlockedFlag,
  false
>;

export type SourceRevisionTagApprovalRequest = Partial<
  Record<SourceRevisionTagApprovalBlockedFlag, false>
> & {
  identity?: SourceRevisionTagApprovalIdentity;
  revision_summary?: SourceRevisionTagApprovalSummary;
  evidence_refs?: SourceRevisionTagApprovalEvidenceRef[];
  no_live_posture?: SourceRevisionTagApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type SourceRevisionTagApprovalErrorCode =
  | "source_revision_tag_approval.identity_invalid"
  | "source_revision_tag_approval.summary_invalid"
  | "source_revision_tag_approval.ref_required"
  | "source_revision_tag_approval.ref_invalid"
  | "source_revision_tag_approval.no_live_posture_drift"
  | "source_revision_tag_approval.blocked_capability_drift"
  | "source_revision_tag_approval.unexpected_field"
  | "source_revision_tag_approval.side_effects_forbidden";

export type SourceRevisionTagApprovalError = {
  code: SourceRevisionTagApprovalErrorCode;
  path: string;
  message: string;
};

export type SourceRevisionTagApprovalEvidence = {
  contract_id: typeof sourceRevisionTagApprovalReviewContract.contract_id;
  extends_contract_id: typeof stableLatestPointerApprovalReviewContract.contract_id;
  identity: SourceRevisionTagApprovalIdentity;
  revision_summary: SourceRevisionTagApprovalSummary;
  evidence_refs: SourceRevisionTagApprovalEvidenceRef[];
  no_live_posture: SourceRevisionTagApprovalNoLivePosture;
  blocked_capabilities: SourceRevisionTagApprovalBlockedFlag[];
  source_revisions_blessed: [];
  tags_created: [];
  git_commits: [];
  git_pushes: [];
  source_archives_created: [];
  checksum_generations: [];
  github_releases: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type SourceRevisionTagApprovalResult =
  | {
      ok: true;
      source_revision_tag_approval: SourceRevisionTagApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: SourceRevisionTagApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultSourceRevisionTagApprovalIdentity: SourceRevisionTagApprovalIdentity =
  {
    packet_ref: "BP-0257",
    selected_after_packet_ref: "BP-0256",
    release_version: "0.1.0-source-plan",
    gate_state: "source_revision_tag_approval_not_approved",
    approval_state: "not_approved",
    tag_execution_allowed: false,
  };

export const defaultSourceRevisionTagApprovalSummary: SourceRevisionTagApprovalSummary =
  {
    source_revision_state: "candidate_ref_required",
    branch_state: "release_branch_not_selected",
    tag_name_state: "planned_not_created",
    archive_state: "not_created",
    current_allowed_output: "source_only_revision_tag_approval_review",
  };

export const defaultSourceRevisionTagApprovalEvidenceRefs: SourceRevisionTagApprovalEvidenceRef[] =
  sourceRevisionTagApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/SOURCE_REVISION_TAG_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    execution_allowed: false,
  }));

export const defaultSourceRevisionTagApprovalNoLivePosture = Object.fromEntries(
  sourceRevisionTagApprovalBlockedFlags.map((flag) => [flag, false]),
) as SourceRevisionTagApprovalNoLivePosture;

export const defaultSourceRevisionTagApproval: SourceRevisionTagApprovalRequest = {
  identity: defaultSourceRevisionTagApprovalIdentity,
  revision_summary: defaultSourceRevisionTagApprovalSummary,
  evidence_refs: defaultSourceRevisionTagApprovalEvidenceRefs,
  no_live_posture: defaultSourceRevisionTagApprovalNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "revision_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...sourceRevisionTagApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |bless revision|approve tag|create tag|gh release|github api|git commit|git push|git tag|npm publish|docker build|docker push|upload |cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createSourceRevisionTagApprovalReview(
  request: SourceRevisionTagApprovalRequest = {},
): SourceRevisionTagApprovalResult {
  const merged = { ...defaultSourceRevisionTagApproval, ...request };
  const errors: SourceRevisionTagApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("source_revision_tag_approval.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultSourceRevisionTagApprovalIdentity)) {
    errors.push(error("source_revision_tag_approval.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.revision_summary, defaultSourceRevisionTagApprovalSummary)) {
    errors.push(
      error("source_revision_tag_approval.summary_invalid", "/revision_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("source_revision_tag_approval.side_effects_forbidden", "/side_effects"),
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      raw_input_content: "withheld",
      side_effects: [],
    };
  }

  return {
    ok: true,
    source_revision_tag_approval: {
      contract_id: sourceRevisionTagApprovalReviewContract.contract_id,
      extends_contract_id: stableLatestPointerApprovalReviewContract.contract_id,
      identity: merged.identity ?? defaultSourceRevisionTagApprovalIdentity,
      revision_summary:
        merged.revision_summary ?? defaultSourceRevisionTagApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultSourceRevisionTagApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultSourceRevisionTagApprovalNoLivePosture,
      blocked_capabilities: [...sourceRevisionTagApprovalBlockedFlags],
      source_revisions_blessed: [],
      tags_created: [],
      git_commits: [],
      git_pushes: [],
      source_archives_created: [],
      checksum_generations: [],
      github_releases: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateEvidenceRefs(
  refs: SourceRevisionTagApprovalEvidenceRef[] | undefined,
  errors: SourceRevisionTagApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("source_revision_tag_approval.ref_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of sourceRevisionTagApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(error("source_revision_tag_approval.ref_required", "/evidence_refs"));
    }
  }

  for (const ref of refs) {
    if (
      !sourceRevisionTagApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("source_revision_tag_approval.ref_invalid", "/evidence_refs"));
    }
  }
}

function validateNoLivePosture(
  request: SourceRevisionTagApprovalRequest,
  errors: SourceRevisionTagApprovalError[],
): void {
  if (
    !sameJson(request.no_live_posture, defaultSourceRevisionTagApprovalNoLivePosture)
  ) {
    errors.push(
      error("source_revision_tag_approval.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of sourceRevisionTagApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("source_revision_tag_approval.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: SourceRevisionTagApprovalErrorCode,
  path: string,
): SourceRevisionTagApprovalError {
  return {
    code,
    path,
    message:
      "Source revision/tag approval must remain source-only, not approved, and non-executing.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
