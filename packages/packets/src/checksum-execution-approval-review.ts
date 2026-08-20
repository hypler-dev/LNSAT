import { sourceArchiveExecutionApprovalReviewContract } from "./source-archive-execution-approval-review.js";

export const CHECKSUM_EXECUTION_APPROVAL_REVIEW_STATUS = "source_only";

export const checksumExecutionApprovalEvidenceKinds = [
  "source_archive_execution_approval_ref",
  "source_archive_ref",
  "checksum_algorithm_ref",
  "checksum_command_plan_ref",
  "checksum_output_policy_ref",
  "checksum_index_ref",
  "manifest_alignment_ref",
  "verification_instructions_ref",
  "signing_status_ref",
  "sbom_provenance_plan_ref",
  "github_release_draft_ref",
  "rollback_revocation_ref",
  "download_page_pointer_ref",
  "explicit_execution_approval_ref",
] as const;

export const checksumExecutionApprovalBlockedFlags = [
  "checksum_execution_allowed",
  "checksum_generation_allowed",
  "checksum_file_write_allowed",
  "checksum_index_write_allowed",
  "source_archive_execution_allowed",
  "source_archive_creation_allowed",
  "source_tag_creation_allowed",
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

export const checksumExecutionApprovalReviewContract = {
  contract_id: "lnsat.checksum_execution_approval_review.v0_1",
  extends_contract_id: sourceArchiveExecutionApprovalReviewContract.contract_id,
  packet_ref: "BP-0259",
  selected_after_packet_ref: "BP-0258",
  contract_authority:
    "source_only_checksum_execution_approval_no_checksum_archive_release_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/CHECKSUM_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/SOURCE_ARCHIVE_EXECUTION_APPROVAL_REVIEW.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type ChecksumExecutionApprovalEvidenceKind =
  (typeof checksumExecutionApprovalEvidenceKinds)[number];
export type ChecksumExecutionApprovalBlockedFlag =
  (typeof checksumExecutionApprovalBlockedFlags)[number];

export type ChecksumExecutionApprovalIdentity = {
  packet_ref: "BP-0259";
  selected_after_packet_ref: "BP-0258";
  release_version: "0.1.0-source-plan";
  candidate_lane: "source_archive";
  gate_state: "checksum_execution_approval_not_approved";
  approval_state: "not_approved";
  checksum_execution_allowed: false;
};

export type ChecksumExecutionApprovalSummary = {
  source_archive_state: "not_created";
  checksum_state: "planned_not_generated";
  checksum_index_state: "planned_not_written";
  manifest_alignment_state: "planned_not_verified";
  github_release_state: "not_created";
  current_allowed_output: "source_only_checksum_execution_approval_review";
};

export type ChecksumExecutionApprovalEvidenceRef = {
  evidence_kind: ChecksumExecutionApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  execution_allowed: false;
};

export type ChecksumExecutionApprovalNoLivePosture = Record<
  ChecksumExecutionApprovalBlockedFlag,
  false
>;

export type ChecksumExecutionApprovalRequest = Partial<
  Record<ChecksumExecutionApprovalBlockedFlag, false>
> & {
  identity?: ChecksumExecutionApprovalIdentity;
  approval_summary?: ChecksumExecutionApprovalSummary;
  evidence_refs?: ChecksumExecutionApprovalEvidenceRef[];
  no_live_posture?: ChecksumExecutionApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ChecksumExecutionApprovalErrorCode =
  | "checksum_execution_approval.identity_invalid"
  | "checksum_execution_approval.summary_invalid"
  | "checksum_execution_approval.ref_required"
  | "checksum_execution_approval.ref_invalid"
  | "checksum_execution_approval.no_live_posture_drift"
  | "checksum_execution_approval.blocked_capability_drift"
  | "checksum_execution_approval.unexpected_field"
  | "checksum_execution_approval.side_effects_forbidden";

export type ChecksumExecutionApprovalError = {
  code: ChecksumExecutionApprovalErrorCode;
  path: string;
  message: string;
};

export type ChecksumExecutionApprovalEvidence = {
  contract_id: typeof checksumExecutionApprovalReviewContract.contract_id;
  extends_contract_id: typeof sourceArchiveExecutionApprovalReviewContract.contract_id;
  identity: ChecksumExecutionApprovalIdentity;
  approval_summary: ChecksumExecutionApprovalSummary;
  evidence_refs: ChecksumExecutionApprovalEvidenceRef[];
  no_live_posture: ChecksumExecutionApprovalNoLivePosture;
  blocked_capabilities: ChecksumExecutionApprovalBlockedFlag[];
  checksum_executions: [];
  checksum_generations: [];
  checksum_file_writes: [];
  checksum_index_writes: [];
  source_archives_created: [];
  github_releases: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  git_commits: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ChecksumExecutionApprovalResult =
  | {
      ok: true;
      checksum_execution_approval: ChecksumExecutionApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ChecksumExecutionApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultChecksumExecutionApprovalIdentity: ChecksumExecutionApprovalIdentity =
  {
    packet_ref: "BP-0259",
    selected_after_packet_ref: "BP-0258",
    release_version: "0.1.0-source-plan",
    candidate_lane: "source_archive",
    gate_state: "checksum_execution_approval_not_approved",
    approval_state: "not_approved",
    checksum_execution_allowed: false,
  };

export const defaultChecksumExecutionApprovalSummary: ChecksumExecutionApprovalSummary =
  {
    source_archive_state: "not_created",
    checksum_state: "planned_not_generated",
    checksum_index_state: "planned_not_written",
    manifest_alignment_state: "planned_not_verified",
    github_release_state: "not_created",
    current_allowed_output: "source_only_checksum_execution_approval_review",
  };

export const defaultChecksumExecutionApprovalEvidenceRefs: ChecksumExecutionApprovalEvidenceRef[] =
  checksumExecutionApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/CHECKSUM_EXECUTION_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    execution_allowed: false,
  }));

export const defaultChecksumExecutionApprovalNoLivePosture = Object.fromEntries(
  checksumExecutionApprovalBlockedFlags.map((flag) => [flag, false]),
) as ChecksumExecutionApprovalNoLivePosture;

export const defaultChecksumExecutionApproval: ChecksumExecutionApprovalRequest = {
  identity: defaultChecksumExecutionApprovalIdentity,
  approval_summary: defaultChecksumExecutionApprovalSummary,
  evidence_refs: defaultChecksumExecutionApprovalEvidenceRefs,
  no_live_posture: defaultChecksumExecutionApprovalNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "approval_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...checksumExecutionApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |generate checksum|write checksum|shasum|sha256sum|openssl dgst|create archive|approve archive|gh release|github api|git commit|git push|git tag|npm publish|docker build|docker push|upload |cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createChecksumExecutionApprovalReview(
  request: ChecksumExecutionApprovalRequest = {},
): ChecksumExecutionApprovalResult {
  const merged = { ...defaultChecksumExecutionApproval, ...request };
  const errors: ChecksumExecutionApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("checksum_execution_approval.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultChecksumExecutionApprovalIdentity)) {
    errors.push(error("checksum_execution_approval.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.approval_summary, defaultChecksumExecutionApprovalSummary)) {
    errors.push(
      error("checksum_execution_approval.summary_invalid", "/approval_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("checksum_execution_approval.side_effects_forbidden", "/side_effects"),
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
    checksum_execution_approval: {
      contract_id: checksumExecutionApprovalReviewContract.contract_id,
      extends_contract_id: sourceArchiveExecutionApprovalReviewContract.contract_id,
      identity: merged.identity ?? defaultChecksumExecutionApprovalIdentity,
      approval_summary:
        merged.approval_summary ?? defaultChecksumExecutionApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultChecksumExecutionApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultChecksumExecutionApprovalNoLivePosture,
      blocked_capabilities: [...checksumExecutionApprovalBlockedFlags],
      checksum_executions: [],
      checksum_generations: [],
      checksum_file_writes: [],
      checksum_index_writes: [],
      source_archives_created: [],
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
  refs: ChecksumExecutionApprovalEvidenceRef[] | undefined,
  errors: ChecksumExecutionApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("checksum_execution_approval.ref_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of checksumExecutionApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(error("checksum_execution_approval.ref_required", "/evidence_refs"));
    }
  }

  for (const ref of refs) {
    if (
      !checksumExecutionApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("checksum_execution_approval.ref_invalid", "/evidence_refs"));
    }
  }
}

function validateNoLivePosture(
  request: ChecksumExecutionApprovalRequest,
  errors: ChecksumExecutionApprovalError[],
): void {
  if (
    !sameJson(request.no_live_posture, defaultChecksumExecutionApprovalNoLivePosture)
  ) {
    errors.push(
      error("checksum_execution_approval.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of checksumExecutionApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("checksum_execution_approval.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: ChecksumExecutionApprovalErrorCode,
  path: string,
): ChecksumExecutionApprovalError {
  return {
    code,
    path,
    message: `${code} at ${path}`,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
