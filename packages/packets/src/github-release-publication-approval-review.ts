import { sbomProvenanceExecutionApprovalReviewContract } from "./sbom-provenance-execution-approval-review.js";

export const GITHUB_RELEASE_PUBLICATION_APPROVAL_REVIEW_STATUS = "source_only";

export const githubReleasePublicationApprovalEvidenceKinds = [
  "sbom_provenance_execution_approval_ref",
  "release_notes_ref",
  "changelog_ref",
  "release_manifest_ref",
  "source_revision_tag_approval_ref",
  "source_archive_execution_approval_ref",
  "checksum_execution_approval_ref",
  "signing_execution_approval_ref",
  "asset_matrix_ref",
  "asset_upload_plan_ref",
  "github_release_body_ref",
  "draft_release_policy_ref",
  "promotion_pointer_policy_ref",
  "rollback_revocation_ref",
  "download_page_pointer_ref",
  "explicit_publication_approval_ref",
] as const;

export const githubReleasePublicationApprovalBlockedFlags = [
  "github_release_creation_allowed",
  "github_release_publication_allowed",
  "github_release_mutation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "asset_publish_allowed",
  "source_tag_creation_allowed",
  "source_archive_execution_allowed",
  "source_archive_creation_allowed",
  "checksum_execution_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "attestation_creation_allowed",
  "stable_latest_pointer_mutation_allowed",
  "download_page_mutation_allowed",
  "release_manifest_write_allowed",
  "external_service_call_allowed",
  "network_fetch_allowed",
  "git_commit_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const githubReleasePublicationApprovalReviewContract = {
  contract_id: "lnsat.github_release_publication_approval_review.v0_1",
  extends_contract_id: sbomProvenanceExecutionApprovalReviewContract.contract_id,
  packet_ref: "BP-0263",
  selected_after_packet_ref: "BP-0262",
  contract_authority:
    "source_only_github_release_publication_approval_no_release_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/GITHUB_RELEASE_PUBLICATION_APPROVAL_REVIEW.md",
    "docs/architecture/SBOM_PROVENANCE_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "CHANGELOG.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type GithubReleasePublicationApprovalEvidenceKind =
  (typeof githubReleasePublicationApprovalEvidenceKinds)[number];
export type GithubReleasePublicationApprovalBlockedFlag =
  (typeof githubReleasePublicationApprovalBlockedFlags)[number];

export type GithubReleasePublicationApprovalIdentity = {
  packet_ref: "BP-0263";
  selected_after_packet_ref: "BP-0262";
  release_version: "0.1.0-source-plan";
  candidate_lane: "source_archive";
  gate_state: "github_release_publication_approval_not_approved";
  approval_state: "not_approved";
  github_release_publication_allowed: false;
};

export type GithubReleasePublicationApprovalSummary = {
  release_notes_state: "draft_source_only";
  manifest_state: "source_plan_static";
  source_archive_state: "not_created";
  checksum_state: "planned_not_generated";
  signature_status: "planned_not_signed";
  sbom_status: "required_not_generated";
  provenance_status: "required_not_generated";
  github_release_state: "not_created";
  asset_upload_state: "not_uploaded";
  stable_pointer_state: "source_only_not_updated";
  current_allowed_output: "source_only_github_release_publication_approval_review";
};

export type GithubReleasePublicationApprovalEvidenceRef = {
  evidence_kind: GithubReleasePublicationApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  execution_allowed: false;
};

export type GithubReleasePublicationApprovalNoLivePosture = Record<
  GithubReleasePublicationApprovalBlockedFlag,
  false
>;

export type GithubReleasePublicationApprovalRequest = Partial<
  Record<GithubReleasePublicationApprovalBlockedFlag, false>
> & {
  identity?: GithubReleasePublicationApprovalIdentity;
  approval_summary?: GithubReleasePublicationApprovalSummary;
  evidence_refs?: GithubReleasePublicationApprovalEvidenceRef[];
  no_live_posture?: GithubReleasePublicationApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type GithubReleasePublicationApprovalErrorCode =
  | "github_release_publication_approval.identity_invalid"
  | "github_release_publication_approval.summary_invalid"
  | "github_release_publication_approval.ref_required"
  | "github_release_publication_approval.ref_invalid"
  | "github_release_publication_approval.no_live_posture_drift"
  | "github_release_publication_approval.blocked_capability_drift"
  | "github_release_publication_approval.unexpected_field"
  | "github_release_publication_approval.side_effects_forbidden";

export type GithubReleasePublicationApprovalError = {
  code: GithubReleasePublicationApprovalErrorCode;
  path: string;
  message: string;
};

export type GithubReleasePublicationApprovalEvidence = {
  contract_id: typeof githubReleasePublicationApprovalReviewContract.contract_id;
  extends_contract_id: typeof sbomProvenanceExecutionApprovalReviewContract.contract_id;
  identity: GithubReleasePublicationApprovalIdentity;
  approval_summary: GithubReleasePublicationApprovalSummary;
  evidence_refs: GithubReleasePublicationApprovalEvidenceRef[];
  no_live_posture: GithubReleasePublicationApprovalNoLivePosture;
  blocked_capabilities: GithubReleasePublicationApprovalBlockedFlag[];
  github_releases: [];
  github_release_publications: [];
  release_uploads: [];
  asset_uploads: [];
  asset_publications: [];
  source_tags_created: [];
  source_archives_created: [];
  checksum_executions: [];
  signing_executions: [];
  generated_sboms: [];
  generated_provenance: [];
  created_attestations: [];
  pointer_mutations: [];
  download_page_mutations: [];
  git_commits: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type GithubReleasePublicationApprovalResult =
  | {
      ok: true;
      github_release_publication_approval: GithubReleasePublicationApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: GithubReleasePublicationApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultGithubReleasePublicationApprovalIdentity: GithubReleasePublicationApprovalIdentity =
  {
    packet_ref: "BP-0263",
    selected_after_packet_ref: "BP-0262",
    release_version: "0.1.0-source-plan",
    candidate_lane: "source_archive",
    gate_state: "github_release_publication_approval_not_approved",
    approval_state: "not_approved",
    github_release_publication_allowed: false,
  };

export const defaultGithubReleasePublicationApprovalSummary: GithubReleasePublicationApprovalSummary =
  {
    release_notes_state: "draft_source_only",
    manifest_state: "source_plan_static",
    source_archive_state: "not_created",
    checksum_state: "planned_not_generated",
    signature_status: "planned_not_signed",
    sbom_status: "required_not_generated",
    provenance_status: "required_not_generated",
    github_release_state: "not_created",
    asset_upload_state: "not_uploaded",
    stable_pointer_state: "source_only_not_updated",
    current_allowed_output: "source_only_github_release_publication_approval_review",
  };

export const defaultGithubReleasePublicationApprovalEvidenceRefs: GithubReleasePublicationApprovalEvidenceRef[] =
  githubReleasePublicationApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/GITHUB_RELEASE_PUBLICATION_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    execution_allowed: false,
  }));

export const defaultGithubReleasePublicationApprovalNoLivePosture = Object.fromEntries(
  githubReleasePublicationApprovalBlockedFlags.map((flag) => [flag, false]),
) as GithubReleasePublicationApprovalNoLivePosture;

export const defaultGithubReleasePublicationApproval: GithubReleasePublicationApprovalRequest =
  {
    identity: defaultGithubReleasePublicationApprovalIdentity,
    approval_summary: defaultGithubReleasePublicationApprovalSummary,
    evidence_refs: defaultGithubReleasePublicationApprovalEvidenceRefs,
    no_live_posture: defaultGithubReleasePublicationApprovalNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "approval_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...githubReleasePublicationApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|secret|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh api|gh release|github api|create release|edit release|publish release|release upload|upload |git commit|git push|git tag|create tag|create archive|generate checksum|sha256sum|shasum|cosign|sign artifact|generate sbom|generate provenance|create attestation|npm publish|docker push|wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createGithubReleasePublicationApprovalReview(
  request: GithubReleasePublicationApprovalRequest = {},
): GithubReleasePublicationApprovalResult {
  const merged = { ...defaultGithubReleasePublicationApproval, ...request };
  const errors: GithubReleasePublicationApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error("github_release_publication_approval.unexpected_field", `/${key}`),
      );
    }
  }

  if (!sameJson(merged.identity, defaultGithubReleasePublicationApprovalIdentity)) {
    errors.push(
      error("github_release_publication_approval.identity_invalid", "/identity"),
    );
  }

  if (
    !sameJson(merged.approval_summary, defaultGithubReleasePublicationApprovalSummary)
  ) {
    errors.push(
      error("github_release_publication_approval.summary_invalid", "/approval_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if (Array.isArray(merged.side_effects) && merged.side_effects.length > 0) {
    errors.push(
      error(
        "github_release_publication_approval.side_effects_forbidden",
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
    github_release_publication_approval: {
      contract_id: githubReleasePublicationApprovalReviewContract.contract_id,
      extends_contract_id: sbomProvenanceExecutionApprovalReviewContract.contract_id,
      identity: merged.identity ?? defaultGithubReleasePublicationApprovalIdentity,
      approval_summary:
        merged.approval_summary ?? defaultGithubReleasePublicationApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultGithubReleasePublicationApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultGithubReleasePublicationApprovalNoLivePosture,
      blocked_capabilities: [...githubReleasePublicationApprovalBlockedFlags],
      github_releases: [],
      github_release_publications: [],
      release_uploads: [],
      asset_uploads: [],
      asset_publications: [],
      source_tags_created: [],
      source_archives_created: [],
      checksum_executions: [],
      signing_executions: [],
      generated_sboms: [],
      generated_provenance: [],
      created_attestations: [],
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
  refs: GithubReleasePublicationApprovalEvidenceRef[] | undefined,
  errors: GithubReleasePublicationApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error("github_release_publication_approval.ref_required", "/evidence_refs"),
    );
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of githubReleasePublicationApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(
        error("github_release_publication_approval.ref_required", "/evidence_refs"),
      );
    }
  }

  for (const ref of refs) {
    if (
      !githubReleasePublicationApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error("github_release_publication_approval.ref_invalid", "/evidence_refs"),
      );
    }
  }
}

function validateNoLivePosture(
  request: GithubReleasePublicationApprovalRequest,
  errors: GithubReleasePublicationApprovalError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "github_release_publication_approval.no_live_posture_drift",
        "/no_live_posture",
      ),
    );
    return;
  }

  for (const flag of githubReleasePublicationApprovalBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "github_release_publication_approval.no_live_posture_drift",
          `/no_live_posture/${flag}`,
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "github_release_publication_approval.blocked_capability_drift",
          `/${flag}`,
        ),
      );
    }
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function error(
  code: GithubReleasePublicationApprovalErrorCode,
  path: string,
): GithubReleasePublicationApprovalError {
  return {
    code,
    path,
    message: "GitHub Release publication approval must stay source-only.",
  };
}
