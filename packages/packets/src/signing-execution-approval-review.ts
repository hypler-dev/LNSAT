import { checksumExecutionApprovalReviewContract } from "./checksum-execution-approval-review.js";

export const SIGNING_EXECUTION_APPROVAL_REVIEW_STATUS = "source_only";

export const signingExecutionApprovalEvidenceKinds = [
  "checksum_execution_approval_ref",
  "checksum_index_ref",
  "artifact_signature_scope_ref",
  "signing_identity_ref",
  "certificate_identity_ref",
  "transparency_log_ref",
  "key_custody_policy_ref",
  "signing_command_plan_ref",
  "signature_output_policy_ref",
  "notarization_status_ref",
  "revocation_policy_ref",
  "verification_instructions_ref",
  "sbom_provenance_plan_ref",
  "github_release_draft_ref",
  "rollback_revocation_ref",
  "explicit_execution_approval_ref",
] as const;

export const signingExecutionApprovalBlockedFlags = [
  "signing_execution_allowed",
  "cosign_execution_allowed",
  "certificate_request_allowed",
  "certificate_issue_allowed",
  "key_generation_allowed",
  "key_storage_allowed",
  "signature_file_write_allowed",
  "signature_index_write_allowed",
  "notarization_allowed",
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

export const signingExecutionApprovalReviewContract = {
  contract_id: "lnsat.signing_execution_approval_review.v0_1",
  extends_contract_id: checksumExecutionApprovalReviewContract.contract_id,
  packet_ref: "BP-0260",
  selected_after_packet_ref: "BP-0259",
  contract_authority:
    "source_only_signing_execution_approval_no_signing_key_certificate_notarization_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/SIGNING_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/CHECKSUM_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type SigningExecutionApprovalEvidenceKind =
  (typeof signingExecutionApprovalEvidenceKinds)[number];
export type SigningExecutionApprovalBlockedFlag =
  (typeof signingExecutionApprovalBlockedFlags)[number];

export type SigningExecutionApprovalIdentity = {
  packet_ref: "BP-0260";
  selected_after_packet_ref: "BP-0259";
  release_version: "0.1.0-source-plan";
  candidate_lane: "source_archive";
  gate_state: "signing_execution_approval_not_approved";
  approval_state: "not_approved";
  signing_execution_allowed: false;
};

export type SigningExecutionApprovalSummary = {
  source_archive_state: "not_created";
  checksum_state: "planned_not_generated";
  checksum_index_state: "planned_not_written";
  signature_status: "planned_not_signed";
  signature_index_state: "planned_not_written";
  signing_identity_state: "planned_reference_only";
  certificate_state: "planned_reference_only";
  transparency_log_state: "planned_reference_only";
  notarization_state: "planned_not_notarized";
  revocation_state: "planned_policy_only";
  github_release_state: "not_created";
  current_allowed_output: "source_only_signing_execution_approval_review";
};

export type SigningExecutionApprovalEvidenceRef = {
  evidence_kind: SigningExecutionApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  execution_allowed: false;
};

export type SigningExecutionApprovalNoLivePosture = Record<
  SigningExecutionApprovalBlockedFlag,
  false
>;

export type SigningExecutionApprovalRequest = Partial<
  Record<SigningExecutionApprovalBlockedFlag, false>
> & {
  identity?: SigningExecutionApprovalIdentity;
  approval_summary?: SigningExecutionApprovalSummary;
  evidence_refs?: SigningExecutionApprovalEvidenceRef[];
  no_live_posture?: SigningExecutionApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type SigningExecutionApprovalErrorCode =
  | "signing_execution_approval.identity_invalid"
  | "signing_execution_approval.summary_invalid"
  | "signing_execution_approval.ref_required"
  | "signing_execution_approval.ref_invalid"
  | "signing_execution_approval.no_live_posture_drift"
  | "signing_execution_approval.blocked_capability_drift"
  | "signing_execution_approval.unexpected_field"
  | "signing_execution_approval.side_effects_forbidden";

export type SigningExecutionApprovalError = {
  code: SigningExecutionApprovalErrorCode;
  path: string;
  message: string;
};

export type SigningExecutionApprovalEvidence = {
  contract_id: typeof signingExecutionApprovalReviewContract.contract_id;
  extends_contract_id: typeof checksumExecutionApprovalReviewContract.contract_id;
  identity: SigningExecutionApprovalIdentity;
  approval_summary: SigningExecutionApprovalSummary;
  evidence_refs: SigningExecutionApprovalEvidenceRef[];
  no_live_posture: SigningExecutionApprovalNoLivePosture;
  blocked_capabilities: SigningExecutionApprovalBlockedFlag[];
  signing_executions: [];
  cosign_executions: [];
  certificate_requests: [];
  issued_certificates: [];
  generated_keys: [];
  stored_keys: [];
  signature_files: [];
  signature_index_writes: [];
  notarizations: [];
  checksum_executions: [];
  checksum_generations: [];
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

export type SigningExecutionApprovalResult =
  | {
      ok: true;
      signing_execution_approval: SigningExecutionApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: SigningExecutionApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultSigningExecutionApprovalIdentity: SigningExecutionApprovalIdentity =
  {
    packet_ref: "BP-0260",
    selected_after_packet_ref: "BP-0259",
    release_version: "0.1.0-source-plan",
    candidate_lane: "source_archive",
    gate_state: "signing_execution_approval_not_approved",
    approval_state: "not_approved",
    signing_execution_allowed: false,
  };

export const defaultSigningExecutionApprovalSummary: SigningExecutionApprovalSummary = {
  source_archive_state: "not_created",
  checksum_state: "planned_not_generated",
  checksum_index_state: "planned_not_written",
  signature_status: "planned_not_signed",
  signature_index_state: "planned_not_written",
  signing_identity_state: "planned_reference_only",
  certificate_state: "planned_reference_only",
  transparency_log_state: "planned_reference_only",
  notarization_state: "planned_not_notarized",
  revocation_state: "planned_policy_only",
  github_release_state: "not_created",
  current_allowed_output: "source_only_signing_execution_approval_review",
};

export const defaultSigningExecutionApprovalEvidenceRefs: SigningExecutionApprovalEvidenceRef[] =
  signingExecutionApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/SIGNING_EXECUTION_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    execution_allowed: false,
  }));

export const defaultSigningExecutionApprovalNoLivePosture = Object.fromEntries(
  signingExecutionApprovalBlockedFlags.map((flag) => [flag, false]),
) as SigningExecutionApprovalNoLivePosture;

export const defaultSigningExecutionApproval: SigningExecutionApprovalRequest = {
  identity: defaultSigningExecutionApprovalIdentity,
  approval_summary: defaultSigningExecutionApprovalSummary,
  evidence_refs: defaultSigningExecutionApprovalEvidenceRefs,
  no_live_posture: defaultSigningExecutionApprovalNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "approval_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...signingExecutionApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|secret|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|certificate private|raw key|key material|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |sign artifact|generate signature|write signature|cosign|notary|notarize|create certificate|issue certificate|generate key|store key|create archive|generate checksum|write checksum|shasum|sha256sum|openssl dgst|gh release|github api|git commit|git push|git tag|npm publish|docker build|docker push|upload |syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createSigningExecutionApprovalReview(
  request: SigningExecutionApprovalRequest = {},
): SigningExecutionApprovalResult {
  const merged = { ...defaultSigningExecutionApproval, ...request };
  const errors: SigningExecutionApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("signing_execution_approval.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultSigningExecutionApprovalIdentity)) {
    errors.push(error("signing_execution_approval.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.approval_summary, defaultSigningExecutionApprovalSummary)) {
    errors.push(
      error("signing_execution_approval.summary_invalid", "/approval_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("signing_execution_approval.side_effects_forbidden", "/side_effects"),
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
    signing_execution_approval: {
      contract_id: signingExecutionApprovalReviewContract.contract_id,
      extends_contract_id: checksumExecutionApprovalReviewContract.contract_id,
      identity: merged.identity ?? defaultSigningExecutionApprovalIdentity,
      approval_summary:
        merged.approval_summary ?? defaultSigningExecutionApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultSigningExecutionApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultSigningExecutionApprovalNoLivePosture,
      blocked_capabilities: [...signingExecutionApprovalBlockedFlags],
      signing_executions: [],
      cosign_executions: [],
      certificate_requests: [],
      issued_certificates: [],
      generated_keys: [],
      stored_keys: [],
      signature_files: [],
      signature_index_writes: [],
      notarizations: [],
      checksum_executions: [],
      checksum_generations: [],
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
  refs: SigningExecutionApprovalEvidenceRef[] | undefined,
  errors: SigningExecutionApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("signing_execution_approval.ref_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of signingExecutionApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(error("signing_execution_approval.ref_required", "/evidence_refs"));
    }
  }

  for (const ref of refs) {
    if (
      !signingExecutionApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("signing_execution_approval.ref_invalid", "/evidence_refs"));
    }
  }
}

function validateNoLivePosture(
  request: SigningExecutionApprovalRequest,
  errors: SigningExecutionApprovalError[],
): void {
  if (
    !sameJson(request.no_live_posture, defaultSigningExecutionApprovalNoLivePosture)
  ) {
    errors.push(
      error("signing_execution_approval.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of signingExecutionApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("signing_execution_approval.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: SigningExecutionApprovalErrorCode,
  path: string,
): SigningExecutionApprovalError {
  return {
    code,
    path,
    message: `${code} at ${path}`,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
