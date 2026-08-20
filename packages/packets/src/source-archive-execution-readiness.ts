import { releaseExecutionApprovalPacketContract } from "./release-execution-approval-packet.js";

export const SOURCE_ARCHIVE_EXECUTION_READINESS_STATUS = "source_only";

export const sourceArchiveExecutionReadinessEvidenceKinds = [
  "source_revision_ref",
  "tag_name_policy",
  "archive_format_policy",
  "archive_contents_policy",
  "generated_file_policy",
  "license_notice_check",
  "changelog_release_notes_check",
  "manifest_alignment_check",
  "checksum_command_plan",
  "signature_status_plan",
  "sbom_provenance_plan",
  "verification_instructions",
  "github_release_draft_ref",
  "rollback_revocation_ref",
  "approval_gate_ref",
] as const;

export const sourceArchiveExecutionReadinessBlockedFlags = [
  "source_tag_creation_allowed",
  "source_archive_creation_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "stable_latest_pointer_mutation_allowed",
  "download_page_mutation_allowed",
  "binary_build_allowed",
  "package_build_allowed",
  "container_build_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const sourceArchiveExecutionReadinessContract = {
  contract_id: "lnsat.source_archive_execution_readiness.v0_1",
  extends_contract_id: releaseExecutionApprovalPacketContract.contract_id,
  packet_ref: "BP-0253",
  selected_after_packet_ref: "BP-0252",
  contract_authority:
    "source_only_source_archive_readiness_no_tag_archive_checksum_release_upload_or_pointer_mutation",
  source_docs: [
    "docs/architecture/SOURCE_ARCHIVE_EXECUTION_READINESS.md",
    "docs/architecture/RELEASE_EXECUTION_APPROVAL_PACKET.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type SourceArchiveReadinessEvidenceKind =
  (typeof sourceArchiveExecutionReadinessEvidenceKinds)[number];
export type SourceArchiveReadinessBlockedFlag =
  (typeof sourceArchiveExecutionReadinessBlockedFlags)[number];

export type SourceArchiveReadinessIdentity = {
  packet_ref: "BP-0253";
  selected_after_packet_ref: "BP-0252";
  release_version: "0.1.0-source-plan";
  candidate_lane: "source_archive";
  readiness_state: "source_archive_execution_readiness_not_ready";
  approval_state: "release_execution_approval_not_approved";
  execution_allowed: false;
};

export type SourceArchiveReadinessSummary = {
  source_revision_state: "candidate_ref_required";
  archive_state: "not_created";
  checksum_state: "planned_not_generated";
  github_release_state: "draft_boundary_only_not_created";
  pointer_state: "not_mutated";
  current_allowed_output: "source_only_readiness_packet";
};

export type SourceArchiveReadinessEvidenceRef = {
  evidence_kind: SourceArchiveReadinessEvidenceKind;
  source_ref: string;
  required: true;
  ready: false;
  approved: false;
  execution_allowed: false;
};

export type SourceArchiveReadinessNoLivePosture = Record<
  SourceArchiveReadinessBlockedFlag,
  false
>;

export type SourceArchiveReadinessRequest = Partial<
  Record<SourceArchiveReadinessBlockedFlag, false>
> & {
  identity?: SourceArchiveReadinessIdentity;
  readiness_summary?: SourceArchiveReadinessSummary;
  evidence_refs?: SourceArchiveReadinessEvidenceRef[];
  no_live_posture?: SourceArchiveReadinessNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type SourceArchiveReadinessErrorCode =
  | "source_archive_readiness.identity_invalid"
  | "source_archive_readiness.summary_invalid"
  | "source_archive_readiness.evidence_required"
  | "source_archive_readiness.evidence_invalid"
  | "source_archive_readiness.no_live_posture_drift"
  | "source_archive_readiness.blocked_capability_drift"
  | "source_archive_readiness.unexpected_field"
  | "source_archive_readiness.side_effects_forbidden";

export type SourceArchiveReadinessError = {
  code: SourceArchiveReadinessErrorCode;
  path: string;
  message: string;
};

export type SourceArchiveReadinessEvidence = {
  contract_id: typeof sourceArchiveExecutionReadinessContract.contract_id;
  extends_contract_id: typeof releaseExecutionApprovalPacketContract.contract_id;
  identity: SourceArchiveReadinessIdentity;
  readiness_summary: SourceArchiveReadinessSummary;
  evidence_refs: SourceArchiveReadinessEvidenceRef[];
  no_live_posture: SourceArchiveReadinessNoLivePosture;
  blocked_capabilities: SourceArchiveReadinessBlockedFlag[];
  source_tags_created: [];
  source_archives_created: [];
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

export type SourceArchiveReadinessResult =
  | {
      ok: true;
      source_archive_readiness: SourceArchiveReadinessEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: SourceArchiveReadinessError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultSourceArchiveReadinessIdentity: SourceArchiveReadinessIdentity = {
  packet_ref: "BP-0253",
  selected_after_packet_ref: "BP-0252",
  release_version: "0.1.0-source-plan",
  candidate_lane: "source_archive",
  readiness_state: "source_archive_execution_readiness_not_ready",
  approval_state: "release_execution_approval_not_approved",
  execution_allowed: false,
};

export const defaultSourceArchiveReadinessSummary: SourceArchiveReadinessSummary = {
  source_revision_state: "candidate_ref_required",
  archive_state: "not_created",
  checksum_state: "planned_not_generated",
  github_release_state: "draft_boundary_only_not_created",
  pointer_state: "not_mutated",
  current_allowed_output: "source_only_readiness_packet",
};

export const defaultSourceArchiveReadinessEvidenceRefs: SourceArchiveReadinessEvidenceRef[] =
  sourceArchiveExecutionReadinessEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/SOURCE_ARCHIVE_EXECUTION_READINESS.md#${evidence_kind}`,
    required: true,
    ready: false,
    approved: false,
    execution_allowed: false,
  }));

export const defaultSourceArchiveReadinessNoLivePosture = Object.fromEntries(
  sourceArchiveExecutionReadinessBlockedFlags.map((flag) => [flag, false]),
) as SourceArchiveReadinessNoLivePosture;

export const defaultSourceArchiveReadiness: SourceArchiveReadinessRequest = {
  identity: defaultSourceArchiveReadinessIdentity,
  readiness_summary: defaultSourceArchiveReadinessSummary,
  evidence_refs: defaultSourceArchiveReadinessEvidenceRefs,
  no_live_posture: defaultSourceArchiveReadinessNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "readiness_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...sourceArchiveExecutionReadinessBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|git tag|npm publish|docker build|docker push|cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createSourceArchiveReadiness(
  request: SourceArchiveReadinessRequest = {},
): SourceArchiveReadinessResult {
  const merged = { ...defaultSourceArchiveReadiness, ...request };
  const errors: SourceArchiveReadinessError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("source_archive_readiness.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultSourceArchiveReadinessIdentity)) {
    errors.push(error("source_archive_readiness.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.readiness_summary, defaultSourceArchiveReadinessSummary)) {
    errors.push(
      error("source_archive_readiness.summary_invalid", "/readiness_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("source_archive_readiness.side_effects_forbidden", "/side_effects"),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    source_archive_readiness: {
      contract_id: sourceArchiveExecutionReadinessContract.contract_id,
      extends_contract_id: releaseExecutionApprovalPacketContract.contract_id,
      identity: merged.identity ?? defaultSourceArchiveReadinessIdentity,
      readiness_summary:
        merged.readiness_summary ?? defaultSourceArchiveReadinessSummary,
      evidence_refs: merged.evidence_refs ?? defaultSourceArchiveReadinessEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultSourceArchiveReadinessNoLivePosture,
      blocked_capabilities: [...sourceArchiveExecutionReadinessBlockedFlags],
      source_tags_created: [],
      source_archives_created: [],
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
  refs: SourceArchiveReadinessEvidenceRef[] | undefined,
  errors: SourceArchiveReadinessError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("source_archive_readiness.evidence_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of sourceArchiveExecutionReadinessEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(
        error("source_archive_readiness.evidence_required", "/evidence_refs"),
      );
    }
  }

  for (const ref of refs) {
    if (
      !sourceArchiveExecutionReadinessEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.ready !== false ||
      ref.approved !== false ||
      ref.execution_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("source_archive_readiness.evidence_invalid", "/evidence_refs"));
    }
  }
}

function validateNoLivePosture(
  request: SourceArchiveReadinessRequest,
  errors: SourceArchiveReadinessError[],
): void {
  if (!sameJson(request.no_live_posture, defaultSourceArchiveReadinessNoLivePosture)) {
    errors.push(
      error("source_archive_readiness.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of sourceArchiveExecutionReadinessBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("source_archive_readiness.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: SourceArchiveReadinessErrorCode,
  path: string,
): SourceArchiveReadinessError {
  return {
    code,
    path,
    message:
      "Source archive execution readiness must remain source-only, not ready, not approved, and non-executing.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
