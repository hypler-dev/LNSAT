import { sourceRevisionTagApprovalReviewContract } from "./source-revision-tag-approval-review.js";

export const SOURCE_ARCHIVE_EXECUTION_APPROVAL_REVIEW_STATUS = "source_only";

export const sourceArchiveExecutionApprovalEvidenceKinds = [
  "source_revision_approval_ref",
  "source_archive_readiness_ref",
  "archive_format_ref",
  "archive_contents_ref",
  "generated_file_policy_ref",
  "license_notice_ref",
  "changelog_release_notes_ref",
  "manifest_alignment_ref",
  "checksum_plan_ref",
  "signing_status_ref",
  "sbom_provenance_plan_ref",
  "verification_instructions_ref",
  "github_release_draft_ref",
  "rollback_revocation_ref",
  "explicit_execution_approval_ref",
] as const;

export const sourceArchiveExecutionApprovalBlockedFlags = [
  "source_archive_execution_allowed",
  "source_archive_creation_allowed",
  "source_tag_creation_allowed",
  "source_revision_blessing_allowed",
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
  "git_commit_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const sourceArchiveExecutionApprovalReviewContract = {
  contract_id: "lnsat.source_archive_execution_approval_review.v0_1",
  extends_contract_id: sourceRevisionTagApprovalReviewContract.contract_id,
  packet_ref: "BP-0258",
  selected_after_packet_ref: "BP-0257",
  contract_authority:
    "source_only_source_archive_execution_approval_no_archive_checksum_release_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/SOURCE_ARCHIVE_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/SOURCE_ARCHIVE_EXECUTION_READINESS.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type SourceArchiveExecutionApprovalEvidenceKind =
  (typeof sourceArchiveExecutionApprovalEvidenceKinds)[number];
export type SourceArchiveExecutionApprovalBlockedFlag =
  (typeof sourceArchiveExecutionApprovalBlockedFlags)[number];

export type SourceArchiveExecutionApprovalIdentity = {
  packet_ref: "BP-0258";
  selected_after_packet_ref: "BP-0257";
  release_version: "0.1.0-source-plan";
  candidate_lane: "source_archive";
  gate_state: "source_archive_execution_approval_not_approved";
  approval_state: "not_approved";
  archive_execution_allowed: false;
};

export type SourceArchiveExecutionApprovalSummary = {
  source_revision_state: "candidate_ref_required";
  tag_state: "planned_not_created";
  archive_state: "not_created";
  checksum_state: "planned_not_generated";
  github_release_state: "not_created";
  current_allowed_output: "source_only_archive_execution_approval_review";
};

export type SourceArchiveExecutionApprovalEvidenceRef = {
  evidence_kind: SourceArchiveExecutionApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  execution_allowed: false;
};

export type SourceArchiveExecutionApprovalNoLivePosture = Record<
  SourceArchiveExecutionApprovalBlockedFlag,
  false
>;

export type SourceArchiveExecutionApprovalRequest = Partial<
  Record<SourceArchiveExecutionApprovalBlockedFlag, false>
> & {
  identity?: SourceArchiveExecutionApprovalIdentity;
  approval_summary?: SourceArchiveExecutionApprovalSummary;
  evidence_refs?: SourceArchiveExecutionApprovalEvidenceRef[];
  no_live_posture?: SourceArchiveExecutionApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type SourceArchiveExecutionApprovalErrorCode =
  | "source_archive_execution_approval.identity_invalid"
  | "source_archive_execution_approval.summary_invalid"
  | "source_archive_execution_approval.ref_required"
  | "source_archive_execution_approval.ref_invalid"
  | "source_archive_execution_approval.no_live_posture_drift"
  | "source_archive_execution_approval.blocked_capability_drift"
  | "source_archive_execution_approval.unexpected_field"
  | "source_archive_execution_approval.side_effects_forbidden";

export type SourceArchiveExecutionApprovalError = {
  code: SourceArchiveExecutionApprovalErrorCode;
  path: string;
  message: string;
};

export type SourceArchiveExecutionApprovalEvidence = {
  contract_id: typeof sourceArchiveExecutionApprovalReviewContract.contract_id;
  extends_contract_id: typeof sourceRevisionTagApprovalReviewContract.contract_id;
  identity: SourceArchiveExecutionApprovalIdentity;
  approval_summary: SourceArchiveExecutionApprovalSummary;
  evidence_refs: SourceArchiveExecutionApprovalEvidenceRef[];
  no_live_posture: SourceArchiveExecutionApprovalNoLivePosture;
  blocked_capabilities: SourceArchiveExecutionApprovalBlockedFlag[];
  source_archive_executions: [];
  source_archives_created: [];
  source_tags_created: [];
  checksum_generations: [];
  github_releases: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  git_commits: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type SourceArchiveExecutionApprovalResult =
  | {
      ok: true;
      source_archive_execution_approval: SourceArchiveExecutionApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: SourceArchiveExecutionApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultSourceArchiveExecutionApprovalIdentity: SourceArchiveExecutionApprovalIdentity =
  {
    packet_ref: "BP-0258",
    selected_after_packet_ref: "BP-0257",
    release_version: "0.1.0-source-plan",
    candidate_lane: "source_archive",
    gate_state: "source_archive_execution_approval_not_approved",
    approval_state: "not_approved",
    archive_execution_allowed: false,
  };

export const defaultSourceArchiveExecutionApprovalSummary: SourceArchiveExecutionApprovalSummary =
  {
    source_revision_state: "candidate_ref_required",
    tag_state: "planned_not_created",
    archive_state: "not_created",
    checksum_state: "planned_not_generated",
    github_release_state: "not_created",
    current_allowed_output: "source_only_archive_execution_approval_review",
  };

export const defaultSourceArchiveExecutionApprovalEvidenceRefs: SourceArchiveExecutionApprovalEvidenceRef[] =
  sourceArchiveExecutionApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/SOURCE_ARCHIVE_EXECUTION_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    execution_allowed: false,
  }));

export const defaultSourceArchiveExecutionApprovalNoLivePosture = Object.fromEntries(
  sourceArchiveExecutionApprovalBlockedFlags.map((flag) => [flag, false]),
) as SourceArchiveExecutionApprovalNoLivePosture;

export const defaultSourceArchiveExecutionApproval: SourceArchiveExecutionApprovalRequest =
  {
    identity: defaultSourceArchiveExecutionApprovalIdentity,
    approval_summary: defaultSourceArchiveExecutionApprovalSummary,
    evidence_refs: defaultSourceArchiveExecutionApprovalEvidenceRefs,
    no_live_posture: defaultSourceArchiveExecutionApprovalNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "approval_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...sourceArchiveExecutionApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |create archive|approve archive|gh release|github api|git commit|git push|git tag|npm publish|docker build|docker push|upload |cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createSourceArchiveExecutionApprovalReview(
  request: SourceArchiveExecutionApprovalRequest = {},
): SourceArchiveExecutionApprovalResult {
  const merged = { ...defaultSourceArchiveExecutionApproval, ...request };
  const errors: SourceArchiveExecutionApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error("source_archive_execution_approval.unexpected_field", `/${key}`),
      );
    }
  }

  if (!sameJson(merged.identity, defaultSourceArchiveExecutionApprovalIdentity)) {
    errors.push(
      error("source_archive_execution_approval.identity_invalid", "/identity"),
    );
  }

  if (
    !sameJson(merged.approval_summary, defaultSourceArchiveExecutionApprovalSummary)
  ) {
    errors.push(
      error("source_archive_execution_approval.summary_invalid", "/approval_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "source_archive_execution_approval.side_effects_forbidden",
        "/side_effects",
      ),
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
    source_archive_execution_approval: {
      contract_id: sourceArchiveExecutionApprovalReviewContract.contract_id,
      extends_contract_id: sourceRevisionTagApprovalReviewContract.contract_id,
      identity: merged.identity ?? defaultSourceArchiveExecutionApprovalIdentity,
      approval_summary:
        merged.approval_summary ?? defaultSourceArchiveExecutionApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultSourceArchiveExecutionApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultSourceArchiveExecutionApprovalNoLivePosture,
      blocked_capabilities: [...sourceArchiveExecutionApprovalBlockedFlags],
      source_archive_executions: [],
      source_archives_created: [],
      source_tags_created: [],
      checksum_generations: [],
      github_releases: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      git_commits: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateEvidenceRefs(
  refs: SourceArchiveExecutionApprovalEvidenceRef[] | undefined,
  errors: SourceArchiveExecutionApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error("source_archive_execution_approval.ref_required", "/evidence_refs"),
    );
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of sourceArchiveExecutionApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(
        error("source_archive_execution_approval.ref_required", "/evidence_refs"),
      );
    }
  }

  for (const ref of refs) {
    if (
      !sourceArchiveExecutionApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error("source_archive_execution_approval.ref_invalid", "/evidence_refs"),
      );
    }
  }
}

function validateNoLivePosture(
  request: SourceArchiveExecutionApprovalRequest,
  errors: SourceArchiveExecutionApprovalError[],
): void {
  if (
    !sameJson(
      request.no_live_posture,
      defaultSourceArchiveExecutionApprovalNoLivePosture,
    )
  ) {
    errors.push(
      error(
        "source_archive_execution_approval.no_live_posture_drift",
        "/no_live_posture",
      ),
    );
  }

  for (const flag of sourceArchiveExecutionApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("source_archive_execution_approval.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: SourceArchiveExecutionApprovalErrorCode,
  path: string,
): SourceArchiveExecutionApprovalError {
  return {
    code,
    path,
    message:
      "Source archive execution approval must remain source-only, not approved, and non-executing.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
