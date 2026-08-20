import { releaseGithubWorkflowContract } from "./release-github-workflow-contract.js";

export const RELEASE_SIGNING_REVOCATION_CONTRACT_STATUS = "source_only";

export const releaseSigningRevocationBlockedFlags = [
  "signing_execution_allowed",
  "cosign_execution_allowed",
  "certificate_request_allowed",
  "certificate_issue_allowed",
  "notarization_allowed",
  "key_generation_allowed",
  "key_storage_allowed",
  "secret_value_allowed",
  "signature_file_write_allowed",
  "artifact_upload_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "network_fetch_allowed",
  "external_service_call_allowed",
  "registry_publish_allowed",
  "package_publish_allowed",
  "dns_cloudflare_mutation_allowed",
] as const;

export const releaseSigningRevocationRequiredRefs = [
  "signing_identity",
  "certificate_identity",
  "signature_status",
  "signature_index",
  "transparency_log",
  "notarization_status",
  "revocation_policy",
  "revocation_list",
  "emergency_disablement",
  "verification_command",
  "rollback_uninstall",
  "approval_gate",
] as const;

export const releaseSigningRevocationContract = {
  contract_id: "lnsat.platform.release_signing_revocation.v0_1",
  extends_contract_id: releaseGithubWorkflowContract.contract_id,
  packet_ref: "BP-0235",
  selected_after_packet_ref: "BP-0234",
  contract_authority:
    "source_only_signing_revocation_contract_no_signing_key_certificate_notarization_or_upload",
  source_docs: [
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "fixtures/release/source-plan.json",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseSigningRevocationBlockedFlag =
  (typeof releaseSigningRevocationBlockedFlags)[number];
export type ReleaseSigningRevocationRequiredRef =
  (typeof releaseSigningRevocationRequiredRefs)[number];

export type ReleaseSigningRevocationIdentity = {
  packet_ref: "BP-0235";
  selected_after_packet_ref: "BP-0234";
  manifest_ref: "fixtures/release/source-plan.json";
  signing_mode: "planned_not_signed";
  implementation_allowed: false;
};

export type ReleaseSigningRevocationRef = {
  ref_kind: ReleaseSigningRevocationRequiredRef;
  source_ref: string;
  required: true;
  execution_allowed: false;
};

export type ReleaseSigningRevocationSummary = {
  release_version: "0.1.0-source-plan";
  signature_status: "planned_not_signed";
  signing_identity_status: "planned_reference_only";
  certificate_status: "planned_reference_only";
  transparency_log_status: "planned_reference_only";
  notarization_status: "planned_not_notarized";
  revocation_status: "planned_policy_only";
  emergency_disablement_status: "planned_policy_only";
  approval_required_before_signing: true;
};

export type ReleaseSigningRevocationNoLivePosture = Record<
  ReleaseSigningRevocationBlockedFlag,
  false
>;

export type ReleaseSigningRevocationRequest = Partial<
  Record<ReleaseSigningRevocationBlockedFlag, false>
> & {
  identity?: ReleaseSigningRevocationIdentity;
  signing_summary?: ReleaseSigningRevocationSummary;
  signing_refs?: ReleaseSigningRevocationRef[];
  no_live_posture?: ReleaseSigningRevocationNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseSigningRevocationErrorCode =
  | "release_signing_revocation.identity_invalid"
  | "release_signing_revocation.summary_invalid"
  | "release_signing_revocation.ref_required"
  | "release_signing_revocation.ref_invalid"
  | "release_signing_revocation.no_live_posture_drift"
  | "release_signing_revocation.blocked_capability_drift"
  | "release_signing_revocation.unexpected_field"
  | "release_signing_revocation.side_effects_forbidden";

export type ReleaseSigningRevocationError = {
  code: ReleaseSigningRevocationErrorCode;
  path: string;
  message: string;
};

export type ReleaseSigningRevocationEvidence = {
  contract_id: typeof releaseSigningRevocationContract.contract_id;
  extends_contract_id: typeof releaseGithubWorkflowContract.contract_id;
  identity: ReleaseSigningRevocationIdentity;
  signing_summary: ReleaseSigningRevocationSummary;
  signing_refs: ReleaseSigningRevocationRef[];
  no_live_posture: ReleaseSigningRevocationNoLivePosture;
  blocked_capabilities: ReleaseSigningRevocationBlockedFlag[];
  signatures: [];
  certificate_requests: [];
  issued_certificates: [];
  generated_keys: [];
  stored_keys: [];
  notarizations: [];
  signature_files: [];
  uploaded_artifacts: [];
  github_releases: [];
  release_uploads: [];
  network_fetches: [];
  external_service_calls: [];
  registry_publications: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ReleaseSigningRevocationResult =
  | {
      ok: true;
      release_signing_revocation: ReleaseSigningRevocationEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseSigningRevocationError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseSigningRevocationIdentity: ReleaseSigningRevocationIdentity =
  {
    packet_ref: "BP-0235",
    selected_after_packet_ref: "BP-0234",
    manifest_ref: "fixtures/release/source-plan.json",
    signing_mode: "planned_not_signed",
    implementation_allowed: false,
  };

export const defaultReleaseSigningRevocationSummary: ReleaseSigningRevocationSummary = {
  release_version: "0.1.0-source-plan",
  signature_status: "planned_not_signed",
  signing_identity_status: "planned_reference_only",
  certificate_status: "planned_reference_only",
  transparency_log_status: "planned_reference_only",
  notarization_status: "planned_not_notarized",
  revocation_status: "planned_policy_only",
  emergency_disablement_status: "planned_policy_only",
  approval_required_before_signing: true,
};

export const defaultReleaseSigningRevocationRefs: ReleaseSigningRevocationRef[] =
  releaseSigningRevocationRequiredRefs.map((ref_kind) => ({
    ref_kind,
    source_ref: `docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#${ref_kind}`,
    required: true,
    execution_allowed: false,
  }));

export const defaultReleaseSigningRevocationNoLivePosture = Object.fromEntries(
  releaseSigningRevocationBlockedFlags.map((flag) => [flag, false]),
) as ReleaseSigningRevocationNoLivePosture;

export const defaultReleaseSigningRevocation: ReleaseSigningRevocationRequest = {
  identity: defaultReleaseSigningRevocationIdentity,
  signing_summary: defaultReleaseSigningRevocationSummary,
  signing_refs: defaultReleaseSigningRevocationRefs,
  no_live_posture: defaultReleaseSigningRevocationNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "signing_summary",
  "signing_refs",
  "no_live_posture",
  "side_effects",
  ...releaseSigningRevocationBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|token|password|api[_ -]?key|private[_ -]?key|certificate private|raw key|key material|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|upload release|npm publish|docker push|cosign|sign |notary|notarize|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createReleaseSigningRevocation(
  request: ReleaseSigningRevocationRequest = {},
): ReleaseSigningRevocationResult {
  const merged = { ...defaultReleaseSigningRevocation, ...request };
  const errors: ReleaseSigningRevocationError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_signing_revocation.unexpected_field",
          `/${key}`,
          "Unexpected release signing/revocation field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultReleaseSigningRevocationIdentity)) {
    errors.push(
      error(
        "release_signing_revocation.identity_invalid",
        "/identity",
        "Signing/revocation identity must stay BP-0235 source-only after BP-0234.",
      ),
    );
  }

  if (!sameJson(merged.signing_summary, defaultReleaseSigningRevocationSummary)) {
    errors.push(
      error(
        "release_signing_revocation.summary_invalid",
        "/signing_summary",
        "Signing summary must remain planned, unsigned, not notarized, and approval-gated.",
      ),
    );
  }

  validateSigningRefs(merged.signing_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_signing_revocation.side_effects_forbidden",
        "/side_effects",
        "Signing/revocation contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_signing_revocation: {
      contract_id: releaseSigningRevocationContract.contract_id,
      extends_contract_id: releaseGithubWorkflowContract.contract_id,
      identity: merged.identity ?? defaultReleaseSigningRevocationIdentity,
      signing_summary: merged.signing_summary ?? defaultReleaseSigningRevocationSummary,
      signing_refs: merged.signing_refs ?? defaultReleaseSigningRevocationRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseSigningRevocationNoLivePosture,
      blocked_capabilities: [...releaseSigningRevocationBlockedFlags],
      signatures: [],
      certificate_requests: [],
      issued_certificates: [],
      generated_keys: [],
      stored_keys: [],
      notarizations: [],
      signature_files: [],
      uploaded_artifacts: [],
      github_releases: [],
      release_uploads: [],
      network_fetches: [],
      external_service_calls: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateSigningRefs(
  refs: ReleaseSigningRevocationRef[] | undefined,
  errors: ReleaseSigningRevocationError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_signing_revocation.ref_required",
        "/signing_refs",
        "Signing/revocation refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.ref_kind));
  for (const refKind of releaseSigningRevocationRequiredRefs) {
    if (!seen.has(refKind)) {
      errors.push(
        error(
          "release_signing_revocation.ref_required",
          "/signing_refs",
          "Signing/revocation refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !releaseSigningRevocationRequiredRefs.includes(ref.ref_kind) ||
      ref.required !== true ||
      ref.execution_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_signing_revocation.ref_invalid",
          "/signing_refs",
          "Signing/revocation refs must be required, safe, and non-executing.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseSigningRevocationRequest,
  errors: ReleaseSigningRevocationError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_signing_revocation.no_live_posture_drift",
        "/no_live_posture",
        "Signing/revocation contract requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseSigningRevocationBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_signing_revocation.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Signing/revocation no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_signing_revocation.blocked_capability_drift",
          `/${flag}`,
          "Signing/revocation blocked capability drifted.",
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
  code: ReleaseSigningRevocationErrorCode,
  path: string,
  message: string,
): ReleaseSigningRevocationError {
  return { code, path, message };
}
