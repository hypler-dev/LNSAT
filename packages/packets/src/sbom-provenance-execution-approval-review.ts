import { signingExecutionApprovalReviewContract } from "./signing-execution-approval-review.js";

export const SBOM_PROVENANCE_EXECUTION_APPROVAL_REVIEW_STATUS = "source_only";

export const sbomProvenanceExecutionApprovalEvidenceKinds = [
  "signing_execution_approval_ref",
  "artifact_matrix_ref",
  "artifact_digest_ref",
  "sbom_format_ref",
  "sbom_tool_plan_ref",
  "sbom_output_policy_ref",
  "provenance_format_ref",
  "provenance_builder_plan_ref",
  "provenance_materials_ref",
  "attestation_policy_ref",
  "signature_status_ref",
  "verification_instructions_ref",
  "github_release_draft_ref",
  "rollback_revocation_ref",
  "download_page_pointer_ref",
  "explicit_execution_approval_ref",
] as const;

export const sbomProvenanceExecutionApprovalBlockedFlags = [
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "sbom_file_write_allowed",
  "provenance_file_write_allowed",
  "attestation_creation_allowed",
  "artifact_digest_calculation_allowed",
  "syft_execution_allowed",
  "slsa_generator_execution_allowed",
  "signing_execution_allowed",
  "cosign_execution_allowed",
  "signature_file_write_allowed",
  "checksum_execution_allowed",
  "checksum_generation_allowed",
  "source_archive_execution_allowed",
  "source_archive_creation_allowed",
  "source_tag_creation_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
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

export const sbomProvenanceExecutionApprovalReviewContract = {
  contract_id: "lnsat.sbom_provenance_execution_approval_review.v0_1",
  extends_contract_id: signingExecutionApprovalReviewContract.contract_id,
  packet_ref: "BP-0261",
  selected_after_packet_ref: "BP-0260",
  contract_authority:
    "source_only_sbom_provenance_execution_approval_no_generation_attestation_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/SBOM_PROVENANCE_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/SIGNING_EXECUTION_APPROVAL_REVIEW.md",
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type SbomProvenanceExecutionApprovalEvidenceKind =
  (typeof sbomProvenanceExecutionApprovalEvidenceKinds)[number];
export type SbomProvenanceExecutionApprovalBlockedFlag =
  (typeof sbomProvenanceExecutionApprovalBlockedFlags)[number];

export type SbomProvenanceExecutionApprovalIdentity = {
  packet_ref: "BP-0261";
  selected_after_packet_ref: "BP-0260";
  release_version: "0.1.0-source-plan";
  candidate_lane: "source_archive";
  gate_state: "sbom_provenance_execution_approval_not_approved";
  approval_state: "not_approved";
  sbom_provenance_execution_allowed: false;
};

export type SbomProvenanceExecutionApprovalSummary = {
  source_archive_state: "not_created";
  checksum_state: "planned_not_generated";
  signature_status: "planned_not_signed";
  sbom_status: "required_not_generated";
  sbom_index_state: "planned_not_written";
  provenance_status: "required_not_generated";
  provenance_index_state: "planned_not_written";
  attestation_state: "not_created";
  github_release_state: "not_created";
  current_allowed_output: "source_only_sbom_provenance_execution_approval_review";
};

export type SbomProvenanceExecutionApprovalEvidenceRef = {
  evidence_kind: SbomProvenanceExecutionApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  execution_allowed: false;
};

export type SbomProvenanceExecutionApprovalNoLivePosture = Record<
  SbomProvenanceExecutionApprovalBlockedFlag,
  false
>;

export type SbomProvenanceExecutionApprovalRequest = Partial<
  Record<SbomProvenanceExecutionApprovalBlockedFlag, false>
> & {
  identity?: SbomProvenanceExecutionApprovalIdentity;
  approval_summary?: SbomProvenanceExecutionApprovalSummary;
  evidence_refs?: SbomProvenanceExecutionApprovalEvidenceRef[];
  no_live_posture?: SbomProvenanceExecutionApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type SbomProvenanceExecutionApprovalErrorCode =
  | "sbom_provenance_execution_approval.identity_invalid"
  | "sbom_provenance_execution_approval.summary_invalid"
  | "sbom_provenance_execution_approval.ref_required"
  | "sbom_provenance_execution_approval.ref_invalid"
  | "sbom_provenance_execution_approval.no_live_posture_drift"
  | "sbom_provenance_execution_approval.blocked_capability_drift"
  | "sbom_provenance_execution_approval.unexpected_field"
  | "sbom_provenance_execution_approval.side_effects_forbidden";

export type SbomProvenanceExecutionApprovalError = {
  code: SbomProvenanceExecutionApprovalErrorCode;
  path: string;
  message: string;
};

export type SbomProvenanceExecutionApprovalEvidence = {
  contract_id: typeof sbomProvenanceExecutionApprovalReviewContract.contract_id;
  extends_contract_id: typeof signingExecutionApprovalReviewContract.contract_id;
  identity: SbomProvenanceExecutionApprovalIdentity;
  approval_summary: SbomProvenanceExecutionApprovalSummary;
  evidence_refs: SbomProvenanceExecutionApprovalEvidenceRef[];
  no_live_posture: SbomProvenanceExecutionApprovalNoLivePosture;
  blocked_capabilities: SbomProvenanceExecutionApprovalBlockedFlag[];
  generated_sboms: [];
  generated_provenance: [];
  created_attestations: [];
  calculated_artifact_digests: [];
  signatures: [];
  checksum_executions: [];
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

export type SbomProvenanceExecutionApprovalResult =
  | {
      ok: true;
      sbom_provenance_execution_approval: SbomProvenanceExecutionApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: SbomProvenanceExecutionApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultSbomProvenanceExecutionApprovalIdentity: SbomProvenanceExecutionApprovalIdentity =
  {
    packet_ref: "BP-0261",
    selected_after_packet_ref: "BP-0260",
    release_version: "0.1.0-source-plan",
    candidate_lane: "source_archive",
    gate_state: "sbom_provenance_execution_approval_not_approved",
    approval_state: "not_approved",
    sbom_provenance_execution_allowed: false,
  };

export const defaultSbomProvenanceExecutionApprovalSummary: SbomProvenanceExecutionApprovalSummary =
  {
    source_archive_state: "not_created",
    checksum_state: "planned_not_generated",
    signature_status: "planned_not_signed",
    sbom_status: "required_not_generated",
    sbom_index_state: "planned_not_written",
    provenance_status: "required_not_generated",
    provenance_index_state: "planned_not_written",
    attestation_state: "not_created",
    github_release_state: "not_created",
    current_allowed_output: "source_only_sbom_provenance_execution_approval_review",
  };

export const defaultSbomProvenanceExecutionApprovalEvidenceRefs: SbomProvenanceExecutionApprovalEvidenceRef[] =
  sbomProvenanceExecutionApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/SBOM_PROVENANCE_EXECUTION_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    execution_allowed: false,
  }));

export const defaultSbomProvenanceExecutionApprovalNoLivePosture = Object.fromEntries(
  sbomProvenanceExecutionApprovalBlockedFlags.map((flag) => [flag, false]),
) as SbomProvenanceExecutionApprovalNoLivePosture;

export const defaultSbomProvenanceExecutionApproval: SbomProvenanceExecutionApprovalRequest =
  {
    identity: defaultSbomProvenanceExecutionApprovalIdentity,
    approval_summary: defaultSbomProvenanceExecutionApprovalSummary,
    evidence_refs: defaultSbomProvenanceExecutionApprovalEvidenceRefs,
    no_live_posture: defaultSbomProvenanceExecutionApprovalNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "approval_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...sbomProvenanceExecutionApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|secret|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |generate sbom|write sbom|generate provenance|write provenance|create attestation|calculate digest|syft|slsa generator|cosign|sign artifact|generate signature|create archive|generate checksum|write checksum|shasum|sha256sum|openssl dgst|gh release|github api|git commit|git push|git tag|npm publish|docker build|docker push|upload |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createSbomProvenanceExecutionApprovalReview(
  request: SbomProvenanceExecutionApprovalRequest = {},
): SbomProvenanceExecutionApprovalResult {
  const merged = { ...defaultSbomProvenanceExecutionApproval, ...request };
  const errors: SbomProvenanceExecutionApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error("sbom_provenance_execution_approval.unexpected_field", `/${key}`),
      );
    }
  }

  if (!sameJson(merged.identity, defaultSbomProvenanceExecutionApprovalIdentity)) {
    errors.push(
      error("sbom_provenance_execution_approval.identity_invalid", "/identity"),
    );
  }

  if (
    !sameJson(merged.approval_summary, defaultSbomProvenanceExecutionApprovalSummary)
  ) {
    errors.push(
      error("sbom_provenance_execution_approval.summary_invalid", "/approval_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "sbom_provenance_execution_approval.side_effects_forbidden",
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
    sbom_provenance_execution_approval: {
      contract_id: sbomProvenanceExecutionApprovalReviewContract.contract_id,
      extends_contract_id: signingExecutionApprovalReviewContract.contract_id,
      identity: merged.identity ?? defaultSbomProvenanceExecutionApprovalIdentity,
      approval_summary:
        merged.approval_summary ?? defaultSbomProvenanceExecutionApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultSbomProvenanceExecutionApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultSbomProvenanceExecutionApprovalNoLivePosture,
      blocked_capabilities: [...sbomProvenanceExecutionApprovalBlockedFlags],
      generated_sboms: [],
      generated_provenance: [],
      created_attestations: [],
      calculated_artifact_digests: [],
      signatures: [],
      checksum_executions: [],
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
  refs: SbomProvenanceExecutionApprovalEvidenceRef[] | undefined,
  errors: SbomProvenanceExecutionApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error("sbom_provenance_execution_approval.ref_required", "/evidence_refs"),
    );
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of sbomProvenanceExecutionApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(
        error("sbom_provenance_execution_approval.ref_required", "/evidence_refs"),
      );
    }
  }

  for (const ref of refs) {
    if (
      !sbomProvenanceExecutionApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error("sbom_provenance_execution_approval.ref_invalid", "/evidence_refs"),
      );
    }
  }
}

function validateNoLivePosture(
  request: SbomProvenanceExecutionApprovalRequest,
  errors: SbomProvenanceExecutionApprovalError[],
): void {
  if (
    !sameJson(
      request.no_live_posture,
      defaultSbomProvenanceExecutionApprovalNoLivePosture,
    )
  ) {
    errors.push(
      error(
        "sbom_provenance_execution_approval.no_live_posture_drift",
        "/no_live_posture",
      ),
    );
  }

  for (const flag of sbomProvenanceExecutionApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "sbom_provenance_execution_approval.blocked_capability_drift",
          `/${flag}`,
        ),
      );
    }
  }
}

function error(
  code: SbomProvenanceExecutionApprovalErrorCode,
  path: string,
): SbomProvenanceExecutionApprovalError {
  return {
    code,
    path,
    message: `${code} at ${path}`,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
