import { releaseChecksumSourceVerificationContract } from "./release-checksum-source-verification.js";

export const RELEASE_SBOM_PROVENANCE_DRY_RUN_STATUS = "source_only";

export const releaseSbomProvenanceDryRunBlockedFlags = [
  "sbom_generation_execution_allowed",
  "provenance_generation_execution_allowed",
  "attestation_creation_allowed",
  "artifact_digest_calculation_allowed",
  "artifact_upload_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "network_fetch_allowed",
  "external_service_call_allowed",
  "signing_execution_allowed",
  "cosign_execution_allowed",
  "syft_execution_allowed",
  "slsa_generator_execution_allowed",
  "package_publish_allowed",
  "registry_publish_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseSbomProvenanceDryRunRequiredRefs = [
  "manifest_file",
  "artifact_matrix",
  "sbom_format",
  "sbom_tool_plan",
  "provenance_format",
  "provenance_builder_plan",
  "source_material_refs",
  "artifact_digest_refs",
  "verification_command_refs",
  "expected_no_generation",
  "expected_no_upload",
  "expected_no_network",
] as const;

export const releaseSbomProvenanceDryRunContract = {
  contract_id: "lnsat.platform.release_sbom_provenance_dry_run.v0_1",
  extends_contract_id: releaseChecksumSourceVerificationContract.contract_id,
  packet_ref: "BP-0233",
  selected_after_packet_ref: "BP-0232",
  contract_authority:
    "source_only_sbom_provenance_dry_run_no_generation_attestation_upload_or_network",
  source_docs: [
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "fixtures/release/source-plan.json",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseSbomProvenanceDryRunBlockedFlag =
  (typeof releaseSbomProvenanceDryRunBlockedFlags)[number];
export type ReleaseSbomProvenanceDryRunRequiredRef =
  (typeof releaseSbomProvenanceDryRunRequiredRefs)[number];

export type ReleaseSbomProvenanceDryRunIdentity = {
  packet_ref: "BP-0233";
  selected_after_packet_ref: "BP-0232";
  manifest_ref: "fixtures/release/source-plan.json";
  dry_run_mode: "static_source_only";
  implementation_allowed: false;
};

export type ReleaseSbomProvenanceDryRunRef = {
  ref_kind: ReleaseSbomProvenanceDryRunRequiredRef;
  source_ref: string;
  required: true;
  generation_allowed: false;
};

export type ReleaseSbomProvenanceDryRunSummary = {
  manifest_version: "0.1";
  release_version: "0.1.0-source-plan";
  sbom_status: "required_not_generated";
  sbom_formats: ["CycloneDX", "SPDX"];
  provenance_status: "required_not_generated";
  provenance_standard: "SLSA-aligned";
  attestation_created: false;
  network_required: false;
};

export type ReleaseSbomProvenanceDryRunNoLivePosture = Record<
  ReleaseSbomProvenanceDryRunBlockedFlag,
  false
>;

export type ReleaseSbomProvenanceDryRunRequest = Partial<
  Record<ReleaseSbomProvenanceDryRunBlockedFlag, false>
> & {
  identity?: ReleaseSbomProvenanceDryRunIdentity;
  dry_run_summary?: ReleaseSbomProvenanceDryRunSummary;
  dry_run_refs?: ReleaseSbomProvenanceDryRunRef[];
  no_live_posture?: ReleaseSbomProvenanceDryRunNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseSbomProvenanceDryRunErrorCode =
  | "release_sbom_provenance.identity_invalid"
  | "release_sbom_provenance.summary_invalid"
  | "release_sbom_provenance.ref_required"
  | "release_sbom_provenance.ref_invalid"
  | "release_sbom_provenance.no_live_posture_drift"
  | "release_sbom_provenance.blocked_capability_drift"
  | "release_sbom_provenance.unexpected_field"
  | "release_sbom_provenance.side_effects_forbidden";

export type ReleaseSbomProvenanceDryRunError = {
  code: ReleaseSbomProvenanceDryRunErrorCode;
  path: string;
  message: string;
};

export type ReleaseSbomProvenanceDryRunEvidence = {
  contract_id: typeof releaseSbomProvenanceDryRunContract.contract_id;
  extends_contract_id: typeof releaseChecksumSourceVerificationContract.contract_id;
  identity: ReleaseSbomProvenanceDryRunIdentity;
  dry_run_summary: ReleaseSbomProvenanceDryRunSummary;
  dry_run_refs: ReleaseSbomProvenanceDryRunRef[];
  no_live_posture: ReleaseSbomProvenanceDryRunNoLivePosture;
  blocked_capabilities: ReleaseSbomProvenanceDryRunBlockedFlag[];
  generated_sboms: [];
  generated_provenance: [];
  created_attestations: [];
  calculated_artifact_digests: [];
  uploaded_artifacts: [];
  github_releases: [];
  release_uploads: [];
  network_fetches: [];
  external_service_calls: [];
  signatures: [];
  registry_publications: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ReleaseSbomProvenanceDryRunResult =
  | {
      ok: true;
      release_sbom_provenance_dry_run: ReleaseSbomProvenanceDryRunEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseSbomProvenanceDryRunError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseSbomProvenanceDryRunIdentity: ReleaseSbomProvenanceDryRunIdentity =
  {
    packet_ref: "BP-0233",
    selected_after_packet_ref: "BP-0232",
    manifest_ref: "fixtures/release/source-plan.json",
    dry_run_mode: "static_source_only",
    implementation_allowed: false,
  };

export const defaultReleaseSbomProvenanceDryRunSummary: ReleaseSbomProvenanceDryRunSummary =
  {
    manifest_version: "0.1",
    release_version: "0.1.0-source-plan",
    sbom_status: "required_not_generated",
    sbom_formats: ["CycloneDX", "SPDX"],
    provenance_status: "required_not_generated",
    provenance_standard: "SLSA-aligned",
    attestation_created: false,
    network_required: false,
  };

export const defaultReleaseSbomProvenanceDryRunRefs: ReleaseSbomProvenanceDryRunRef[] =
  [
    {
      ref_kind: "manifest_file",
      source_ref: "fixtures/release/source-plan.json",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "artifact_matrix",
      source_ref: "fixtures/release/source-plan.json#artifact_families",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "sbom_format",
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#sbom-index",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "sbom_tool_plan",
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#sbom-index",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "provenance_format",
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#provenance-index",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "provenance_builder_plan",
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#provenance-index",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "source_material_refs",
      source_ref: "fixtures/release/source-plan.json#source_archive_verification",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "artifact_digest_refs",
      source_ref: "fixtures/release/source-plan.json#required_security_evidence",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "verification_command_refs",
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#verification",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "expected_no_generation",
      source_ref: "docs/reference/CONTRACT_PROVENANCE.md#blocked-scope",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "expected_no_upload",
      source_ref: "docs/reference/CONTRACT_PROVENANCE.md#blocked-scope",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "expected_no_network",
      source_ref: "docs/reference/CONTRACT_PROVENANCE.md#blocked-scope",
      required: true,
      generation_allowed: false,
    },
  ];

export const defaultReleaseSbomProvenanceDryRunNoLivePosture = Object.fromEntries(
  releaseSbomProvenanceDryRunBlockedFlags.map((flag) => [flag, false]),
) as ReleaseSbomProvenanceDryRunNoLivePosture;

export const defaultReleaseSbomProvenanceDryRun: ReleaseSbomProvenanceDryRunRequest = {
  identity: defaultReleaseSbomProvenanceDryRunIdentity,
  dry_run_summary: defaultReleaseSbomProvenanceDryRunSummary,
  dry_run_refs: defaultReleaseSbomProvenanceDryRunRefs,
  no_live_posture: defaultReleaseSbomProvenanceDryRunNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "dry_run_summary",
  "dry_run_refs",
  "no_live_posture",
  "side_effects",
  ...releaseSbomProvenanceDryRunBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release create|upload release|npm publish|docker push|cosign|syft|slsa-generator|attest|signing execution|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createReleaseSbomProvenanceDryRun(
  request: ReleaseSbomProvenanceDryRunRequest = {},
): ReleaseSbomProvenanceDryRunResult {
  const merged = { ...defaultReleaseSbomProvenanceDryRun, ...request };
  const errors: ReleaseSbomProvenanceDryRunError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_sbom_provenance.unexpected_field",
          `/${key}`,
          "Unexpected release SBOM/provenance dry-run field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultReleaseSbomProvenanceDryRunIdentity)) {
    errors.push(
      error(
        "release_sbom_provenance.identity_invalid",
        "/identity",
        "SBOM/provenance dry run identity must stay BP-0233 static source-only after BP-0232.",
      ),
    );
  }

  if (!sameJson(merged.dry_run_summary, defaultReleaseSbomProvenanceDryRunSummary)) {
    errors.push(
      error(
        "release_sbom_provenance.summary_invalid",
        "/dry_run_summary",
        "SBOM/provenance summary must remain required but not generated with no attestation and no network.",
      ),
    );
  }

  validateDryRunRefs(merged.dry_run_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_sbom_provenance.side_effects_forbidden",
        "/side_effects",
        "SBOM/provenance dry run must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_sbom_provenance_dry_run: {
      contract_id: releaseSbomProvenanceDryRunContract.contract_id,
      extends_contract_id: releaseChecksumSourceVerificationContract.contract_id,
      identity: merged.identity ?? defaultReleaseSbomProvenanceDryRunIdentity,
      dry_run_summary:
        merged.dry_run_summary ?? defaultReleaseSbomProvenanceDryRunSummary,
      dry_run_refs: merged.dry_run_refs ?? defaultReleaseSbomProvenanceDryRunRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseSbomProvenanceDryRunNoLivePosture,
      blocked_capabilities: [...releaseSbomProvenanceDryRunBlockedFlags],
      generated_sboms: [],
      generated_provenance: [],
      created_attestations: [],
      calculated_artifact_digests: [],
      uploaded_artifacts: [],
      github_releases: [],
      release_uploads: [],
      network_fetches: [],
      external_service_calls: [],
      signatures: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateDryRunRefs(
  refs: ReleaseSbomProvenanceDryRunRef[] | undefined,
  errors: ReleaseSbomProvenanceDryRunError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_sbom_provenance.ref_required",
        "/dry_run_refs",
        "SBOM/provenance dry-run refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.ref_kind));
  for (const kind of releaseSbomProvenanceDryRunRequiredRefs) {
    if (!seen.has(kind)) {
      errors.push(
        error(
          "release_sbom_provenance.ref_required",
          "/dry_run_refs",
          "SBOM/provenance dry-run refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !releaseSbomProvenanceDryRunRequiredRefs.includes(ref.ref_kind) ||
      ref.required !== true ||
      ref.generation_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_sbom_provenance.ref_invalid",
          "/dry_run_refs",
          "SBOM/provenance dry-run refs must be required, safe, and non-generating.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseSbomProvenanceDryRunRequest,
  errors: ReleaseSbomProvenanceDryRunError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_sbom_provenance.no_live_posture_drift",
        "/no_live_posture",
        "SBOM/provenance dry run requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseSbomProvenanceDryRunBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_sbom_provenance.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "SBOM/provenance dry run no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_sbom_provenance.blocked_capability_drift",
          `/${flag}`,
          "SBOM/provenance dry run blocked capability drifted.",
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
  code: ReleaseSbomProvenanceDryRunErrorCode,
  path: string,
  message: string,
): ReleaseSbomProvenanceDryRunError {
  return { code, path, message };
}
