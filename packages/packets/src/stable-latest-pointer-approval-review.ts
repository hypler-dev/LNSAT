import { releaseManifestChangelogConsistencyContract } from "./release-manifest-changelog-consistency.js";

export const STABLE_LATEST_POINTER_APPROVAL_REVIEW_STATUS = "source_only";

export const stableLatestPointerApprovalEvidenceKinds = [
  "release_manifest_ref",
  "version_pointer_ref",
  "latest_pointer_ref",
  "binary_index_ref",
  "release_consistency_ref",
  "changelog_ref",
  "release_notes_ref",
  "stable_approval_ref",
  "signed_artifacts_ref",
  "checksum_index_ref",
  "sbom_index_ref",
  "provenance_index_ref",
  "revocation_policy_ref",
  "rollback_plan_ref",
  "support_window_ref",
  "download_page_pointer_ref",
] as const;

export const stableLatestPointerApprovalBlockedFlags = [
  "stable_promotion_allowed",
  "latest_pointer_write_allowed",
  "version_pointer_write_allowed",
  "binary_latest_update_allowed",
  "release_manifest_write_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "tag_creation_allowed",
  "source_archive_creation_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "git_push_allowed",
  "github_api_mutation_allowed",
  "package_publish_allowed",
  "registry_publish_allowed",
  "download_page_mutation_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const stableLatestPointerApprovalReviewContract = {
  contract_id: "lnsat.stable_latest_pointer_approval_review.v0_1",
  extends_contract_id: releaseManifestChangelogConsistencyContract.contract_id,
  packet_ref: "BP-0256",
  selected_after_packet_ref: "BP-0255",
  contract_authority:
    "source_only_stable_latest_pointer_approval_no_pointer_write_release_upload_tag_or_cloudflare_mutation",
  source_docs: [
    "docs/architecture/STABLE_LATEST_POINTER_APPROVAL_REVIEW.md",
    "README.md",
    "README.md",
    "fixtures/release/source-plan.json",
    "apps/console/src/lib/console-model.ts",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type StableLatestPointerApprovalEvidenceKind =
  (typeof stableLatestPointerApprovalEvidenceKinds)[number];
export type StableLatestPointerApprovalBlockedFlag =
  (typeof stableLatestPointerApprovalBlockedFlags)[number];

export type StableLatestPointerApprovalIdentity = {
  packet_ref: "BP-0256";
  selected_after_packet_ref: "BP-0255";
  release_version: "0.1.0-source-plan";
  gate_state: "stable_latest_pointer_approval_not_approved";
  approval_state: "not_approved";
  pointer_write_allowed: false;
};

export type StableLatestPointerApprovalSummary = {
  stable_status: "planned_not_promoted";
  latest_pointer_status: "source_only_not_updated";
  binary_latest_status: "source_only_not_updated";
  current_allowed_output: "source_only_pointer_approval_review";
};

export type StableLatestPointerApprovalEvidenceRef = {
  evidence_kind: StableLatestPointerApprovalEvidenceKind;
  source_ref: string;
  required: true;
  approved: false;
  mutation_allowed: false;
};

export type StableLatestPointerApprovalNoLivePosture = Record<
  StableLatestPointerApprovalBlockedFlag,
  false
>;

export type StableLatestPointerApprovalRequest = Partial<
  Record<StableLatestPointerApprovalBlockedFlag, false>
> & {
  identity?: StableLatestPointerApprovalIdentity;
  pointer_summary?: StableLatestPointerApprovalSummary;
  evidence_refs?: StableLatestPointerApprovalEvidenceRef[];
  no_live_posture?: StableLatestPointerApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type StableLatestPointerApprovalErrorCode =
  | "stable_latest_pointer_approval.identity_invalid"
  | "stable_latest_pointer_approval.summary_invalid"
  | "stable_latest_pointer_approval.ref_required"
  | "stable_latest_pointer_approval.ref_invalid"
  | "stable_latest_pointer_approval.no_live_posture_drift"
  | "stable_latest_pointer_approval.blocked_capability_drift"
  | "stable_latest_pointer_approval.unexpected_field"
  | "stable_latest_pointer_approval.side_effects_forbidden";

export type StableLatestPointerApprovalError = {
  code: StableLatestPointerApprovalErrorCode;
  path: string;
  message: string;
};

export type StableLatestPointerApprovalEvidence = {
  contract_id: typeof stableLatestPointerApprovalReviewContract.contract_id;
  extends_contract_id: typeof releaseManifestChangelogConsistencyContract.contract_id;
  identity: StableLatestPointerApprovalIdentity;
  pointer_summary: StableLatestPointerApprovalSummary;
  evidence_refs: StableLatestPointerApprovalEvidenceRef[];
  no_live_posture: StableLatestPointerApprovalNoLivePosture;
  blocked_capabilities: StableLatestPointerApprovalBlockedFlag[];
  stable_promotions: [];
  latest_pointer_writes: [];
  version_pointer_writes: [];
  binary_latest_updates: [];
  release_manifest_writes: [];
  github_releases: [];
  release_uploads: [];
  pointer_mutations: [];
  download_page_mutations: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type StableLatestPointerApprovalResult =
  | {
      ok: true;
      stable_latest_pointer_approval: StableLatestPointerApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: StableLatestPointerApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultStableLatestPointerApprovalIdentity: StableLatestPointerApprovalIdentity =
  {
    packet_ref: "BP-0256",
    selected_after_packet_ref: "BP-0255",
    release_version: "0.1.0-source-plan",
    gate_state: "stable_latest_pointer_approval_not_approved",
    approval_state: "not_approved",
    pointer_write_allowed: false,
  };

export const defaultStableLatestPointerApprovalSummary: StableLatestPointerApprovalSummary =
  {
    stable_status: "planned_not_promoted",
    latest_pointer_status: "source_only_not_updated",
    binary_latest_status: "source_only_not_updated",
    current_allowed_output: "source_only_pointer_approval_review",
  };

export const defaultStableLatestPointerApprovalEvidenceRefs: StableLatestPointerApprovalEvidenceRef[] =
  stableLatestPointerApprovalEvidenceKinds.map((evidence_kind) => ({
    evidence_kind,
    source_ref: `docs/architecture/STABLE_LATEST_POINTER_APPROVAL_REVIEW.md#${evidence_kind}`,
    required: true,
    approved: false,
    mutation_allowed: false,
  }));

export const defaultStableLatestPointerApprovalNoLivePosture = Object.fromEntries(
  stableLatestPointerApprovalBlockedFlags.map((flag) => [flag, false]),
) as StableLatestPointerApprovalNoLivePosture;

export const defaultStableLatestPointerApproval: StableLatestPointerApprovalRequest = {
  identity: defaultStableLatestPointerApprovalIdentity,
  pointer_summary: defaultStableLatestPointerApprovalSummary,
  evidence_refs: defaultStableLatestPointerApprovalEvidenceRefs,
  no_live_posture: defaultStableLatestPointerApprovalNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "pointer_summary",
  "evidence_refs",
  "no_live_posture",
  "side_effects",
  ...stableLatestPointerApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |write latest|update latest|promote stable|gh release|github api|git push|git tag|npm publish|docker build|docker push|upload |cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createStableLatestPointerApprovalReview(
  request: StableLatestPointerApprovalRequest = {},
): StableLatestPointerApprovalResult {
  const merged = { ...defaultStableLatestPointerApproval, ...request };
  const errors: StableLatestPointerApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("stable_latest_pointer_approval.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultStableLatestPointerApprovalIdentity)) {
    errors.push(error("stable_latest_pointer_approval.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.pointer_summary, defaultStableLatestPointerApprovalSummary)) {
    errors.push(
      error("stable_latest_pointer_approval.summary_invalid", "/pointer_summary"),
    );
  }

  validateEvidenceRefs(merged.evidence_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("stable_latest_pointer_approval.side_effects_forbidden", "/side_effects"),
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
    stable_latest_pointer_approval: {
      contract_id: stableLatestPointerApprovalReviewContract.contract_id,
      extends_contract_id: releaseManifestChangelogConsistencyContract.contract_id,
      identity: merged.identity ?? defaultStableLatestPointerApprovalIdentity,
      pointer_summary:
        merged.pointer_summary ?? defaultStableLatestPointerApprovalSummary,
      evidence_refs:
        merged.evidence_refs ?? defaultStableLatestPointerApprovalEvidenceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultStableLatestPointerApprovalNoLivePosture,
      blocked_capabilities: [...stableLatestPointerApprovalBlockedFlags],
      stable_promotions: [],
      latest_pointer_writes: [],
      version_pointer_writes: [],
      binary_latest_updates: [],
      release_manifest_writes: [],
      github_releases: [],
      release_uploads: [],
      pointer_mutations: [],
      download_page_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateEvidenceRefs(
  refs: StableLatestPointerApprovalEvidenceRef[] | undefined,
  errors: StableLatestPointerApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("stable_latest_pointer_approval.ref_required", "/evidence_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.evidence_kind));
  for (const evidenceKind of stableLatestPointerApprovalEvidenceKinds) {
    if (!seen.has(evidenceKind)) {
      errors.push(
        error("stable_latest_pointer_approval.ref_required", "/evidence_refs"),
      );
    }
  }

  for (const ref of refs) {
    if (
      !stableLatestPointerApprovalEvidenceKinds.includes(ref.evidence_kind) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.mutation_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error("stable_latest_pointer_approval.ref_invalid", "/evidence_refs"),
      );
    }
  }
}

function validateNoLivePosture(
  request: StableLatestPointerApprovalRequest,
  errors: StableLatestPointerApprovalError[],
): void {
  if (
    !sameJson(request.no_live_posture, defaultStableLatestPointerApprovalNoLivePosture)
  ) {
    errors.push(
      error("stable_latest_pointer_approval.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of stableLatestPointerApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("stable_latest_pointer_approval.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: StableLatestPointerApprovalErrorCode,
  path: string,
): StableLatestPointerApprovalError {
  return {
    code,
    path,
    message:
      "Stable/latest pointer approval must remain source-only, not approved, and non-mutating.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
