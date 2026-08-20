import { releaseSigningRevocationContract } from "./release-signing-revocation-contract.js";

export const RELEASE_STABLE_PROMOTION_POINTER_CONTRACT_STATUS = "source_only";

export const releaseStablePromotionPointerBlockedFlags = [
  "stable_promotion_allowed",
  "latest_pointer_write_allowed",
  "version_pointer_write_allowed",
  "binary_latest_update_allowed",
  "release_manifest_write_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "tag_creation_allowed",
  "git_push_allowed",
  "github_api_mutation_allowed",
  "package_publish_allowed",
  "registry_publish_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseStablePromotionPointerRequiredRefs = [
  "release_manifest",
  "version_pointer",
  "latest_pointer",
  "stable_approval",
  "signed_artifacts",
  "checksum_index",
  "sbom_index",
  "provenance_index",
  "revocation_policy",
  "rollback_plan",
  "download_page_pointer",
  "support_window",
  "changelog",
] as const;

export const releaseStablePromotionPointerContract = {
  contract_id: "lnsat.platform.release_stable_promotion_pointer.v0_1",
  extends_contract_id: releaseSigningRevocationContract.contract_id,
  packet_ref: "BP-0236",
  selected_after_packet_ref: "BP-0235",
  contract_authority:
    "source_only_stable_promotion_pointer_contract_no_latest_write_release_upload_or_github_mutation",
  source_docs: [
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "fixtures/release/source-plan.json",
    "README.md",
    "README.md",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseStablePromotionPointerBlockedFlag =
  (typeof releaseStablePromotionPointerBlockedFlags)[number];
export type ReleaseStablePromotionPointerRequiredRef =
  (typeof releaseStablePromotionPointerRequiredRefs)[number];

export type ReleaseStablePromotionPointerIdentity = {
  packet_ref: "BP-0236";
  selected_after_packet_ref: "BP-0235";
  manifest_ref: "fixtures/release/source-plan.json";
  promotion_mode: "planned_not_promoted";
  implementation_allowed: false;
};

export type ReleaseStablePromotionPointerRef = {
  ref_kind: ReleaseStablePromotionPointerRequiredRef;
  source_ref: string;
  required: true;
  write_allowed: false;
};

export type ReleaseStablePromotionPointerSummary = {
  release_version: "0.1.0-source-plan";
  promotion_state: "source_only_planned";
  stable_status: "planned_not_promoted";
  latest_pointer_status: "planned_not_updated";
  binary_latest_status: "planned_not_updated";
  approval_required_before_stable: true;
  signed_artifacts_required: true;
  revocation_policy_required: true;
};

export type ReleaseStablePromotionPointerNoLivePosture = Record<
  ReleaseStablePromotionPointerBlockedFlag,
  false
>;

export type ReleaseStablePromotionPointerRequest = Partial<
  Record<ReleaseStablePromotionPointerBlockedFlag, false>
> & {
  identity?: ReleaseStablePromotionPointerIdentity;
  promotion_summary?: ReleaseStablePromotionPointerSummary;
  promotion_refs?: ReleaseStablePromotionPointerRef[];
  no_live_posture?: ReleaseStablePromotionPointerNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseStablePromotionPointerErrorCode =
  | "release_stable_promotion_pointer.identity_invalid"
  | "release_stable_promotion_pointer.summary_invalid"
  | "release_stable_promotion_pointer.ref_required"
  | "release_stable_promotion_pointer.ref_invalid"
  | "release_stable_promotion_pointer.no_live_posture_drift"
  | "release_stable_promotion_pointer.blocked_capability_drift"
  | "release_stable_promotion_pointer.unexpected_field"
  | "release_stable_promotion_pointer.side_effects_forbidden";

export type ReleaseStablePromotionPointerError = {
  code: ReleaseStablePromotionPointerErrorCode;
  path: string;
  message: string;
};

export type ReleaseStablePromotionPointerEvidence = {
  contract_id: typeof releaseStablePromotionPointerContract.contract_id;
  extends_contract_id: typeof releaseSigningRevocationContract.contract_id;
  identity: ReleaseStablePromotionPointerIdentity;
  promotion_summary: ReleaseStablePromotionPointerSummary;
  promotion_refs: ReleaseStablePromotionPointerRef[];
  no_live_posture: ReleaseStablePromotionPointerNoLivePosture;
  blocked_capabilities: ReleaseStablePromotionPointerBlockedFlag[];
  stable_promotions: [];
  latest_pointer_updates: [];
  binary_latest_updates: [];
  release_manifest_writes: [];
  github_releases: [];
  release_uploads: [];
  git_pushes: [];
  github_api_mutations: [];
  registry_publications: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ReleaseStablePromotionPointerResult =
  | {
      ok: true;
      release_stable_promotion_pointer: ReleaseStablePromotionPointerEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseStablePromotionPointerError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseStablePromotionPointerIdentity: ReleaseStablePromotionPointerIdentity =
  {
    packet_ref: "BP-0236",
    selected_after_packet_ref: "BP-0235",
    manifest_ref: "fixtures/release/source-plan.json",
    promotion_mode: "planned_not_promoted",
    implementation_allowed: false,
  };

export const defaultReleaseStablePromotionPointerSummary: ReleaseStablePromotionPointerSummary =
  {
    release_version: "0.1.0-source-plan",
    promotion_state: "source_only_planned",
    stable_status: "planned_not_promoted",
    latest_pointer_status: "planned_not_updated",
    binary_latest_status: "planned_not_updated",
    approval_required_before_stable: true,
    signed_artifacts_required: true,
    revocation_policy_required: true,
  };

export const defaultReleaseStablePromotionPointerRefs: ReleaseStablePromotionPointerRef[] =
  releaseStablePromotionPointerRequiredRefs.map((ref_kind) => ({
    ref_kind,
    source_ref: `docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#${ref_kind}`,
    required: true,
    write_allowed: false,
  }));

export const defaultReleaseStablePromotionPointerNoLivePosture = Object.fromEntries(
  releaseStablePromotionPointerBlockedFlags.map((flag) => [flag, false]),
) as ReleaseStablePromotionPointerNoLivePosture;

export const defaultReleaseStablePromotionPointer: ReleaseStablePromotionPointerRequest =
  {
    identity: defaultReleaseStablePromotionPointerIdentity,
    promotion_summary: defaultReleaseStablePromotionPointerSummary,
    promotion_refs: defaultReleaseStablePromotionPointerRefs,
    no_live_posture: defaultReleaseStablePromotionPointerNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "promotion_summary",
  "promotion_refs",
  "no_live_posture",
  "side_effects",
  ...releaseStablePromotionPointerBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|upload|release upload|asset upload|npm publish|docker push|git push|git tag|write latest|update latest|promote stable|stable promotion|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createReleaseStablePromotionPointer(
  request: ReleaseStablePromotionPointerRequest = {},
): ReleaseStablePromotionPointerResult {
  const merged = { ...defaultReleaseStablePromotionPointer, ...request };
  const errors: ReleaseStablePromotionPointerError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_stable_promotion_pointer.unexpected_field",
          `/${key}`,
          "Unexpected stable promotion pointer field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultReleaseStablePromotionPointerIdentity)) {
    errors.push(
      error(
        "release_stable_promotion_pointer.identity_invalid",
        "/identity",
        "Stable promotion pointer identity must stay BP-0236 source-only after BP-0235.",
      ),
    );
  }

  if (
    !sameJson(merged.promotion_summary, defaultReleaseStablePromotionPointerSummary)
  ) {
    errors.push(
      error(
        "release_stable_promotion_pointer.summary_invalid",
        "/promotion_summary",
        "Stable promotion pointer summary must remain planned, unpromoted, and approval-gated.",
      ),
    );
  }

  validatePromotionRefs(merged.promotion_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_stable_promotion_pointer.side_effects_forbidden",
        "/side_effects",
        "Stable promotion pointer contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_stable_promotion_pointer: {
      contract_id: releaseStablePromotionPointerContract.contract_id,
      extends_contract_id: releaseSigningRevocationContract.contract_id,
      identity: merged.identity ?? defaultReleaseStablePromotionPointerIdentity,
      promotion_summary:
        merged.promotion_summary ?? defaultReleaseStablePromotionPointerSummary,
      promotion_refs: merged.promotion_refs ?? defaultReleaseStablePromotionPointerRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseStablePromotionPointerNoLivePosture,
      blocked_capabilities: [...releaseStablePromotionPointerBlockedFlags],
      stable_promotions: [],
      latest_pointer_updates: [],
      binary_latest_updates: [],
      release_manifest_writes: [],
      github_releases: [],
      release_uploads: [],
      git_pushes: [],
      github_api_mutations: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validatePromotionRefs(
  refs: ReleaseStablePromotionPointerRef[] | undefined,
  errors: ReleaseStablePromotionPointerError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_stable_promotion_pointer.ref_required",
        "/promotion_refs",
        "Stable promotion pointer refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.ref_kind));
  for (const refKind of releaseStablePromotionPointerRequiredRefs) {
    if (!seen.has(refKind)) {
      errors.push(
        error(
          "release_stable_promotion_pointer.ref_required",
          "/promotion_refs",
          "Stable promotion pointer refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !releaseStablePromotionPointerRequiredRefs.includes(ref.ref_kind) ||
      ref.required !== true ||
      ref.write_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_stable_promotion_pointer.ref_invalid",
          "/promotion_refs",
          "Stable promotion pointer refs must be required, safe, and non-writing.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseStablePromotionPointerRequest,
  errors: ReleaseStablePromotionPointerError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_stable_promotion_pointer.no_live_posture_drift",
        "/no_live_posture",
        "Stable promotion pointer contract requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseStablePromotionPointerBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_stable_promotion_pointer.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Stable promotion pointer no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_stable_promotion_pointer.blocked_capability_drift",
          `/${flag}`,
          "Stable promotion pointer blocked capability drifted.",
        ),
      );
    }
  }
}

function safeText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !unsafeText(value);
}

function unsafeText(value: unknown): boolean {
  return typeof value === "string" && unsafeTextPattern.test(value);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function error(
  code: ReleaseStablePromotionPointerErrorCode,
  path: string,
  message: string,
): ReleaseStablePromotionPointerError {
  return { code, path, message };
}
