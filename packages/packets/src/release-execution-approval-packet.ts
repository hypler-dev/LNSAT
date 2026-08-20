import { releaseExecutionPreflightMatrixContract } from "./release-execution-preflight-matrix.js";

export const RELEASE_EXECUTION_APPROVAL_PACKET_STATUS = "source_only";

export const releaseExecutionApprovalCandidateLane = "source_archive" as const;

export const releaseExecutionApprovalEvidenceKinds = [
  "source_commit_or_tag_candidate",
  "release_manifest_review",
  "changelog_release_notes_draft",
  "artifact_naming_expected_url",
  "checksum_plan",
  "signature_status_plan",
  "sbom_plan",
  "provenance_plan",
  "license_notice_review",
  "install_verification_docs",
  "rollback_revocation_emergency_plan",
  "support_state_release_status",
  "download_pointer_impact_review",
  "github_release_draft_boundary",
  "explicit_source_archive_approval",
] as const;

export const releaseExecutionApprovalBlockedFlags = [
  "source_tag_creation_allowed",
  "source_archive_creation_allowed",
  "binary_build_allowed",
  "package_build_allowed",
  "container_build_allowed",
  "package_publish_allowed",
  "registry_publish_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "notarization_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "stable_latest_pointer_mutation_allowed",
  "download_page_mutation_allowed",
  "installer_execution_allowed",
  "service_install_restart_allowed",
  "root_helper_allowed",
  "host_mutation_allowed",
  "customer_data_handling_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseExecutionApprovalPacketContract = {
  contract_id: "lnsat.release_execution_approval_packet.v0_1",
  extends_contract_id: releaseExecutionPreflightMatrixContract.contract_id,
  packet_ref: "BP-0252",
  selected_after_packet_ref: "BP-0251",
  contract_authority:
    "source_only_release_execution_approval_no_tag_archive_build_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/RELEASE_EXECUTION_APPROVAL_PACKET.md",
    "docs/architecture/RELEASE_EXECUTION_PREFLIGHT_MATRIX.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type ReleaseExecutionApprovalEvidenceKind =
  (typeof releaseExecutionApprovalEvidenceKinds)[number];
export type ReleaseExecutionApprovalBlockedFlag =
  (typeof releaseExecutionApprovalBlockedFlags)[number];

export type ReleaseExecutionApprovalIdentity = {
  packet_ref: "BP-0252";
  selected_after_packet_ref: "BP-0251";
  release_version: "0.1.0-source-plan";
  candidate_lane: typeof releaseExecutionApprovalCandidateLane;
  approval_state: "release_execution_approval_not_approved";
  implementation_allowed: false;
};

export type ReleaseExecutionApprovalSummary = {
  source_archive_state: "candidate_not_approved";
  later_lanes_state: "blocked_require_separate_approval";
  github_release_state: "draft_boundary_only_not_created";
  download_pointer_state: "impact_review_only_not_mutated";
  current_allowed_output: "source_only_approval_packet";
};

export type ReleaseExecutionApprovalEvidenceRef = {
  evidence_kind: ReleaseExecutionApprovalEvidenceKind;
  source_ref: string;
  required: true;
  ready: false;
  approved: false;
  execution_allowed: false;
};

export type ReleaseExecutionApprovalNoLivePosture = Record<
  ReleaseExecutionApprovalBlockedFlag,
  false
>;

export type ReleaseExecutionApprovalRequest = Partial<
  Record<ReleaseExecutionApprovalBlockedFlag, false>
> & {
  identity?: ReleaseExecutionApprovalIdentity;
  approval_summary?: ReleaseExecutionApprovalSummary;
  evidence_refs?: ReleaseExecutionApprovalEvidenceRef[];
  no_live_posture?: ReleaseExecutionApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseExecutionApprovalErrorCode =
  | "release_execution_approval.identity_invalid"
  | "release_execution_approval.summary_invalid"
  | "release_execution_approval.evidence_required"
  | "release_execution_approval.evidence_invalid"
  | "release_execution_approval.no_live_posture_drift"
  | "release_execution_approval.blocked_capability_drift"
  | "release_execution_approval.unexpected_field"
  | "release_execution_approval.side_effects_forbidden";

export type ReleaseExecutionApprovalError = {
  code: ReleaseExecutionApprovalErrorCode;
  path: string;
  message: string;
};

export type ReleaseExecutionApprovalEvidence = {
  contract_id: typeof releaseExecutionApprovalPacketContract.contract_id;
  extends_contract_id: typeof releaseExecutionPreflightMatrixContract.contract_id;
  identity: ReleaseExecutionApprovalIdentity;
  approval_summary: ReleaseExecutionApprovalSummary;
  evidence_refs: ReleaseExecutionApprovalEvidenceRef[];
  no_live_posture: ReleaseExecutionApprovalNoLivePosture;
  blocked_capabilities: ReleaseExecutionApprovalBlockedFlag[];
  source_tags_created: [];
  source_archives_created: [];
  binary_builds: [];
  package_builds: [];
  container_builds: [];
  package_publishes: [];
  registry_publishes: [];
  checksum_generations: [];
  signing_executions: [];
  sbom_generations: [];
  provenance_generations: [];
  github_release_creations: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  side_effects: [];
};

export type ReleaseExecutionApprovalResult =
  | {
      ok: true;
      release_execution_approval: ReleaseExecutionApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseExecutionApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseExecutionApprovalIdentity: ReleaseExecutionApprovalIdentity =
  {
    packet_ref: "BP-0252",
    selected_after_packet_ref: "BP-0251",
    release_version: "0.1.0-source-plan",
    candidate_lane: releaseExecutionApprovalCandidateLane,
    approval_state: "release_execution_approval_not_approved",
    implementation_allowed: false,
  };

export const defaultReleaseExecutionApprovalSummary: ReleaseExecutionApprovalSummary = {
  source_archive_state: "candidate_not_approved",
  later_lanes_state: "blocked_require_separate_approval",
  github_release_state: "draft_boundary_only_not_created",
  download_pointer_state: "impact_review_only_not_mutated",
  current_allowed_output: "source_only_approval_packet",
};

export const defaultReleaseExecutionApprovalEvidenceRefs: ReleaseExecutionApprovalEvidenceRef[] =
  releaseExecutionApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/RELEASE_EXECUTION_APPROVAL_PACKET.md#${evidence_kind}`,
    required: true,
    ready: false,
    approved: false,
    execution_allowed: false,
  }));

export const defaultReleaseExecutionApprovalNoLivePosture = Object.fromEntries(
  releaseExecutionApprovalBlockedFlags.map((flag) => [flag, false]),
) as ReleaseExecutionApprovalNoLivePosture;

export const defaultReleaseExecutionApproval: ReleaseExecutionApprovalRequest = {
  identity: defaultReleaseExecutionApprovalIdentity,
  approval_summary: defaultReleaseExecutionApprovalSummary,
  evidence_refs: defaultReleaseExecutionApprovalEvidenceRefs,
  no_live_posture: defaultReleaseExecutionApprovalNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "approval_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...releaseExecutionApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|npm publish|docker build|docker push|cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createReleaseExecutionApproval(
  request: ReleaseExecutionApprovalRequest = {},
): ReleaseExecutionApprovalResult {
  const merged = { ...defaultReleaseExecutionApproval, ...request };
  const errors: ReleaseExecutionApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("release_execution_approval.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultReleaseExecutionApprovalIdentity)) {
    errors.push(error("release_execution_approval.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.approval_summary, defaultReleaseExecutionApprovalSummary)) {
    errors.push(
      error("release_execution_approval.summary_invalid", "/approval_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("release_execution_approval.side_effects_forbidden", "/side_effects"),
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
    release_execution_approval: {
      contract_id: releaseExecutionApprovalPacketContract.contract_id,
      extends_contract_id: releaseExecutionPreflightMatrixContract.contract_id,
      identity: merged.identity ?? defaultReleaseExecutionApprovalIdentity,
      approval_summary:
        merged.approval_summary ?? defaultReleaseExecutionApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultReleaseExecutionApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseExecutionApprovalNoLivePosture,
      blocked_capabilities: [...releaseExecutionApprovalBlockedFlags],
      source_tags_created: [],
      source_archives_created: [],
      binary_builds: [],
      package_builds: [],
      container_builds: [],
      package_publishes: [],
      registry_publishes: [],
      checksum_generations: [],
      signing_executions: [],
      sbom_generations: [],
      provenance_generations: [],
      github_release_creations: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateEvidenceRefs(
  refs: ReleaseExecutionApprovalEvidenceRef[] | undefined,
  errors: ReleaseExecutionApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error("release_execution_approval.evidence_required", "/evidence_refs"),
    );
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of releaseExecutionApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(
        error("release_execution_approval.evidence_required", "/evidence_refs"),
      );
    }
  }

  for (const ref of refs) {
    if (
      !releaseExecutionApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.ready !== false ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error("release_execution_approval.evidence_invalid", "/evidence_refs"),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseExecutionApprovalRequest,
  errors: ReleaseExecutionApprovalError[],
): void {
  if (
    !sameJson(request.no_live_posture, defaultReleaseExecutionApprovalNoLivePosture)
  ) {
    errors.push(
      error("release_execution_approval.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of releaseExecutionApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("release_execution_approval.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: ReleaseExecutionApprovalErrorCode,
  path: string,
): ReleaseExecutionApprovalError {
  return {
    code,
    path,
    message:
      "Release execution approval packet must remain source-only, not approved, and non-executing.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
