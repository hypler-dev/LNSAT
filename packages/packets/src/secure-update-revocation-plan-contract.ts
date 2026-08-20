import { complianceReadinessMapContract } from "./compliance-readiness-map-contract.js";

export const SECURE_UPDATE_REVOCATION_PLAN_CONTRACT_STATUS = "source_only";

export const secureUpdateRevocationBlockedFlags = [
  "update_manifest_write_allowed",
  "stable_pointer_write_allowed",
  "latest_pointer_write_allowed",
  "binary_latest_update_allowed",
  "signing_execution_allowed",
  "revocation_publication_allowed",
  "emergency_disablement_activation_allowed",
  "rollback_execution_allowed",
  "installer_execution_allowed",
  "package_build_allowed",
  "release_upload_allowed",
  "github_release_creation_allowed",
  "github_api_mutation_allowed",
  "git_push_allowed",
  "dns_cloudflare_mutation_allowed",
  "external_service_call_allowed",
  "secret_value_allowed",
] as const;

export const secureUpdateRevocationRequiredRefs = [
  "update_manifest_schema",
  "signed_manifest_policy",
  "channel_policy",
  "version_pointer_policy",
  "stable_promotion_gate",
  "rollback_plan",
  "uninstall_plan",
  "revocation_policy",
  "revocation_list",
  "emergency_disablement",
  "download_page_pointer",
  "support_window",
  "changelog",
  "client_update_boundary",
  "offline_mirror_policy",
  "audit_evidence",
] as const;

export const secureUpdateRevocationPlanContract = {
  contract_id: "lnsat.platform.secure_update_revocation_plan.v0_1",
  extends_contract_id: complianceReadinessMapContract.contract_id,
  packet_ref: "BP-0240",
  selected_after_packet_ref: "BP-0239",
  contract_authority:
    "source_only_secure_update_revocation_plan_no_pointer_write_revocation_publication_or_update_execution",
  source_docs: [
    "docs/architecture/SECURE_UPDATE_AND_REVOCATION_PLAN.md",
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/architecture/COMPLIANCE_READINESS_MAP.md",
    "fixtures/release/source-plan.json",
    "README.md",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type SecureUpdateRevocationBlockedFlag =
  (typeof secureUpdateRevocationBlockedFlags)[number];
export type SecureUpdateRevocationRequiredRef =
  (typeof secureUpdateRevocationRequiredRefs)[number];

export type SecureUpdateRevocationIdentity = {
  packet_ref: "BP-0240";
  selected_after_packet_ref: "BP-0239";
  manifest_ref: "fixtures/release/source-plan.json";
  update_mode: "planned_not_active";
  implementation_allowed: false;
};

export type SecureUpdateRevocationRef = {
  ref_kind: SecureUpdateRevocationRequiredRef;
  source_ref: string;
  required: true;
  mutation_allowed: false;
};

export type SecureUpdateRevocationSummary = {
  release_version: "0.1.0-source-plan";
  update_state: "planned_not_active";
  revocation_state: "planned_not_published";
  rollback_state: "planned_not_executed";
  channel_state: "source_only_channels_defined";
  client_update_state: "client_owned_not_auto_update";
  emergency_state: "planned_not_activated";
  approval_required_before_update: true;
  signed_manifest_required: true;
};

export type SecureUpdateRevocationNoLivePosture = Record<
  SecureUpdateRevocationBlockedFlag,
  false
>;

export type SecureUpdateRevocationRequest = Partial<
  Record<SecureUpdateRevocationBlockedFlag, false>
> & {
  identity?: SecureUpdateRevocationIdentity;
  update_summary?: SecureUpdateRevocationSummary;
  update_refs?: SecureUpdateRevocationRef[];
  no_live_posture?: SecureUpdateRevocationNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type SecureUpdateRevocationErrorCode =
  | "secure_update_revocation.identity_invalid"
  | "secure_update_revocation.summary_invalid"
  | "secure_update_revocation.ref_required"
  | "secure_update_revocation.ref_invalid"
  | "secure_update_revocation.no_live_posture_drift"
  | "secure_update_revocation.blocked_capability_drift"
  | "secure_update_revocation.unexpected_field"
  | "secure_update_revocation.side_effects_forbidden";

export type SecureUpdateRevocationError = {
  code: SecureUpdateRevocationErrorCode;
  path: string;
  message: string;
};

export type SecureUpdateRevocationEvidence = {
  contract_id: typeof secureUpdateRevocationPlanContract.contract_id;
  extends_contract_id: typeof complianceReadinessMapContract.contract_id;
  identity: SecureUpdateRevocationIdentity;
  update_summary: SecureUpdateRevocationSummary;
  update_refs: SecureUpdateRevocationRef[];
  no_live_posture: SecureUpdateRevocationNoLivePosture;
  blocked_capabilities: SecureUpdateRevocationBlockedFlag[];
  update_manifest_writes: [];
  stable_pointer_updates: [];
  latest_pointer_updates: [];
  binary_latest_updates: [];
  signing_executions: [];
  revocation_publications: [];
  emergency_disablement_activations: [];
  rollback_executions: [];
  installer_executions: [];
  package_builds: [];
  release_uploads: [];
  github_releases: [];
  github_api_mutations: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  external_service_calls: [];
  side_effects: [];
};

export type SecureUpdateRevocationResult =
  | {
      ok: true;
      secure_update_revocation: SecureUpdateRevocationEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: SecureUpdateRevocationError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultSecureUpdateRevocationIdentity: SecureUpdateRevocationIdentity = {
  packet_ref: "BP-0240",
  selected_after_packet_ref: "BP-0239",
  manifest_ref: "fixtures/release/source-plan.json",
  update_mode: "planned_not_active",
  implementation_allowed: false,
};

export const defaultSecureUpdateRevocationSummary: SecureUpdateRevocationSummary = {
  release_version: "0.1.0-source-plan",
  update_state: "planned_not_active",
  revocation_state: "planned_not_published",
  rollback_state: "planned_not_executed",
  channel_state: "source_only_channels_defined",
  client_update_state: "client_owned_not_auto_update",
  emergency_state: "planned_not_activated",
  approval_required_before_update: true,
  signed_manifest_required: true,
};

export const defaultSecureUpdateRevocationRefs: SecureUpdateRevocationRef[] =
  secureUpdateRevocationRequiredRefs.map((ref_kind) => ({
    ref_kind,
    source_ref: `docs/architecture/SECURE_UPDATE_AND_REVOCATION_PLAN.md#${ref_kind}`,
    required: true,
    mutation_allowed: false,
  }));

export const defaultSecureUpdateRevocationNoLivePosture = Object.fromEntries(
  secureUpdateRevocationBlockedFlags.map((flag) => [flag, false]),
) as SecureUpdateRevocationNoLivePosture;

export const defaultSecureUpdateRevocation: SecureUpdateRevocationRequest = {
  identity: defaultSecureUpdateRevocationIdentity,
  update_summary: defaultSecureUpdateRevocationSummary,
  update_refs: defaultSecureUpdateRevocationRefs,
  no_live_posture: defaultSecureUpdateRevocationNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "update_summary",
  "update_refs",
  "no_live_posture",
  "side_effects",
  ...secureUpdateRevocationBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|upload release|release upload|asset upload|npm publish|docker push|git push|git tag|cloudflare dns|wrangler pages domain|ssh |scp |sign artifact|cosign|publish revocation|activate disablement|emergency disablement activate|rollback execute|execute rollback|installer run|run installer|write latest|update latest|promote stable|stable promotion)/i;

export function createSecureUpdateRevocationPlan(
  request: SecureUpdateRevocationRequest = {},
): SecureUpdateRevocationResult {
  const merged = { ...defaultSecureUpdateRevocation, ...request };
  const errors: SecureUpdateRevocationError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "secure_update_revocation.unexpected_field",
          `/${key}`,
          "Unexpected secure update/revocation field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultSecureUpdateRevocationIdentity)) {
    errors.push(
      error(
        "secure_update_revocation.identity_invalid",
        "/identity",
        "Secure update/revocation identity must stay BP-0240 source-only after BP-0239.",
      ),
    );
  }

  if (!sameJson(merged.update_summary, defaultSecureUpdateRevocationSummary)) {
    errors.push(
      error(
        "secure_update_revocation.summary_invalid",
        "/update_summary",
        "Secure update/revocation summary must remain planned, client-owned, unsigned-manifest-gated, and not active.",
      ),
    );
  }

  validateUpdateRefs(merged.update_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "secure_update_revocation.side_effects_forbidden",
        "/side_effects",
        "Secure update/revocation contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    secure_update_revocation: {
      contract_id: secureUpdateRevocationPlanContract.contract_id,
      extends_contract_id: complianceReadinessMapContract.contract_id,
      identity: merged.identity ?? defaultSecureUpdateRevocationIdentity,
      update_summary: merged.update_summary ?? defaultSecureUpdateRevocationSummary,
      update_refs: merged.update_refs ?? defaultSecureUpdateRevocationRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultSecureUpdateRevocationNoLivePosture,
      blocked_capabilities: [...secureUpdateRevocationBlockedFlags],
      update_manifest_writes: [],
      stable_pointer_updates: [],
      latest_pointer_updates: [],
      binary_latest_updates: [],
      signing_executions: [],
      revocation_publications: [],
      emergency_disablement_activations: [],
      rollback_executions: [],
      installer_executions: [],
      package_builds: [],
      release_uploads: [],
      github_releases: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      external_service_calls: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateUpdateRefs(
  refs: SecureUpdateRevocationRef[] | undefined,
  errors: SecureUpdateRevocationError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "secure_update_revocation.ref_required",
        "/update_refs",
        "Secure update/revocation refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.ref_kind));
  for (const refKind of secureUpdateRevocationRequiredRefs) {
    if (!seen.has(refKind)) {
      errors.push(
        error(
          "secure_update_revocation.ref_required",
          "/update_refs",
          "Secure update/revocation refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !secureUpdateRevocationRequiredRefs.includes(ref.ref_kind) ||
      ref.required !== true ||
      ref.mutation_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "secure_update_revocation.ref_invalid",
          "/update_refs",
          "Secure update/revocation refs must be required, safe, and non-mutating.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: SecureUpdateRevocationRequest,
  errors: SecureUpdateRevocationError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "secure_update_revocation.no_live_posture_drift",
        "/no_live_posture",
        "Secure update/revocation contract requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of secureUpdateRevocationBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "secure_update_revocation.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Secure update/revocation no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "secure_update_revocation.blocked_capability_drift",
          `/${flag}`,
          "Secure update/revocation blocked capability drifted.",
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
  code: SecureUpdateRevocationErrorCode,
  path: string,
  message: string,
): SecureUpdateRevocationError {
  return { code, path, message };
}
