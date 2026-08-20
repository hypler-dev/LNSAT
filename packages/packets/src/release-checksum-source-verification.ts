import { releaseManifestSchemaExpansionContract } from "./release-manifest-schema-expansion.js";

export const RELEASE_CHECKSUM_SOURCE_VERIFICATION_STATUS = "source_only";

export const releaseChecksumSourceVerificationBlockedFlags = [
  "source_archive_creation_allowed",
  "binary_artifact_creation_allowed",
  "checksum_generation_execution_allowed",
  "checksum_file_write_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "network_fetch_allowed",
  "external_service_call_allowed",
  "signing_execution_allowed",
  "sbom_generation_execution_allowed",
  "provenance_generation_execution_allowed",
  "package_publish_allowed",
  "registry_publish_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseChecksumSourceVerificationRequiredRefs = [
  "manifest_file",
  "source_repo",
  "source_archive",
  "source_commit_or_tag",
  "checksum_index",
  "verification_command",
  "expected_no_artifact_creation",
  "expected_no_network",
] as const;

export const releaseChecksumSourceVerificationContract = {
  contract_id: "lnsat.platform.release_checksum_source_verification.v0_1",
  extends_contract_id: releaseManifestSchemaExpansionContract.contract_id,
  packet_ref: "BP-0232",
  selected_after_packet_ref: "BP-0231",
  contract_authority:
    "source_only_static_verification_no_archive_creation_checksum_generation_or_network",
  source_docs: [
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "fixtures/release/source-plan.json",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseChecksumSourceVerificationBlockedFlag =
  (typeof releaseChecksumSourceVerificationBlockedFlags)[number];
export type ReleaseChecksumSourceVerificationRequiredRef =
  (typeof releaseChecksumSourceVerificationRequiredRefs)[number];

export type ReleaseChecksumSourceVerificationIdentity = {
  packet_ref: "BP-0232";
  selected_after_packet_ref: "BP-0231";
  manifest_ref: "fixtures/release/source-plan.json";
  verification_mode: "static_source_only";
  implementation_allowed: false;
};

export type ReleaseChecksumSourceVerificationRef = {
  ref_kind: ReleaseChecksumSourceVerificationRequiredRef;
  source_ref: string;
  required: true;
  generation_allowed: false;
};

export type ReleaseChecksumSourceVerificationManifestSummary = {
  manifest_version: "0.1";
  release_version: "0.1.0-source-plan";
  release_status: "source_only_planned";
  source_archive_status: "planned";
  checksum_status: "required_not_generated";
  network_required: false;
  archive_created: false;
};

export type ReleaseChecksumSourceVerificationNoLivePosture = Record<
  ReleaseChecksumSourceVerificationBlockedFlag,
  false
>;

export type ReleaseChecksumSourceVerificationRequest = Partial<
  Record<ReleaseChecksumSourceVerificationBlockedFlag, false>
> & {
  identity?: ReleaseChecksumSourceVerificationIdentity;
  manifest_summary?: ReleaseChecksumSourceVerificationManifestSummary;
  verification_refs?: ReleaseChecksumSourceVerificationRef[];
  no_live_posture?: ReleaseChecksumSourceVerificationNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseChecksumSourceVerificationErrorCode =
  | "release_checksum_source.identity_invalid"
  | "release_checksum_source.manifest_summary_invalid"
  | "release_checksum_source.verification_ref_required"
  | "release_checksum_source.verification_ref_invalid"
  | "release_checksum_source.no_live_posture_drift"
  | "release_checksum_source.blocked_capability_drift"
  | "release_checksum_source.unexpected_field"
  | "release_checksum_source.side_effects_forbidden";

export type ReleaseChecksumSourceVerificationError = {
  code: ReleaseChecksumSourceVerificationErrorCode;
  path: string;
  message: string;
};

export type ReleaseChecksumSourceVerificationEvidence = {
  contract_id: typeof releaseChecksumSourceVerificationContract.contract_id;
  extends_contract_id: typeof releaseManifestSchemaExpansionContract.contract_id;
  identity: ReleaseChecksumSourceVerificationIdentity;
  manifest_summary: ReleaseChecksumSourceVerificationManifestSummary;
  verification_refs: ReleaseChecksumSourceVerificationRef[];
  no_live_posture: ReleaseChecksumSourceVerificationNoLivePosture;
  blocked_capabilities: ReleaseChecksumSourceVerificationBlockedFlag[];
  generated_checksums: [];
  written_checksum_files: [];
  created_source_archives: [];
  created_binary_artifacts: [];
  github_releases: [];
  release_uploads: [];
  network_fetches: [];
  external_service_calls: [];
  signatures: [];
  generated_sboms: [];
  generated_provenance: [];
  registry_publications: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ReleaseChecksumSourceVerificationResult =
  | {
      ok: true;
      release_checksum_source_verification: ReleaseChecksumSourceVerificationEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseChecksumSourceVerificationError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseChecksumSourceVerificationIdentity: ReleaseChecksumSourceVerificationIdentity =
  {
    packet_ref: "BP-0232",
    selected_after_packet_ref: "BP-0231",
    manifest_ref: "fixtures/release/source-plan.json",
    verification_mode: "static_source_only",
    implementation_allowed: false,
  };

export const defaultReleaseChecksumSourceManifestSummary: ReleaseChecksumSourceVerificationManifestSummary =
  {
    manifest_version: "0.1",
    release_version: "0.1.0-source-plan",
    release_status: "source_only_planned",
    source_archive_status: "planned",
    checksum_status: "required_not_generated",
    network_required: false,
    archive_created: false,
  };

export const defaultReleaseChecksumSourceVerificationRefs: ReleaseChecksumSourceVerificationRef[] =
  [
    {
      ref_kind: "manifest_file",
      source_ref: "fixtures/release/source-plan.json",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "source_repo",
      source_ref: "https://github.com/hypler-dev/LNSAT",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "source_archive",
      source_ref: "https://github.com/hypler-dev/LNSAT/archive/refs/tags/v0.1.0.tar.gz",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "source_commit_or_tag",
      source_ref: "v0.1.0",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "checksum_index",
      source_ref: "fixtures/release/source-plan.json#required_security_evidence",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "verification_command",
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#checksum-index",
      required: true,
      generation_allowed: false,
    },
    {
      ref_kind: "expected_no_artifact_creation",
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

export const defaultReleaseChecksumSourceNoLivePosture = Object.fromEntries(
  releaseChecksumSourceVerificationBlockedFlags.map((flag) => [flag, false]),
) as ReleaseChecksumSourceVerificationNoLivePosture;

export const defaultReleaseChecksumSourceVerification: ReleaseChecksumSourceVerificationRequest =
  {
    identity: defaultReleaseChecksumSourceVerificationIdentity,
    manifest_summary: defaultReleaseChecksumSourceManifestSummary,
    verification_refs: defaultReleaseChecksumSourceVerificationRefs,
    no_live_posture: defaultReleaseChecksumSourceNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "manifest_summary",
  "verification_refs",
  "no_live_posture",
  "side_effects",
  ...releaseChecksumSourceVerificationBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release create|upload release|npm publish|docker push|cosign sign|syft |slsa |cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createReleaseChecksumSourceVerification(
  request: ReleaseChecksumSourceVerificationRequest = {},
): ReleaseChecksumSourceVerificationResult {
  const merged = { ...defaultReleaseChecksumSourceVerification, ...request };
  const errors: ReleaseChecksumSourceVerificationError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_checksum_source.unexpected_field",
          `/${key}`,
          "Unexpected release checksum source verification field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultReleaseChecksumSourceVerificationIdentity)) {
    errors.push(
      error(
        "release_checksum_source.identity_invalid",
        "/identity",
        "Checksum source verification identity must stay BP-0232 static source-only after BP-0231.",
      ),
    );
  }

  if (!sameJson(merged.manifest_summary, defaultReleaseChecksumSourceManifestSummary)) {
    errors.push(
      error(
        "release_checksum_source.manifest_summary_invalid",
        "/manifest_summary",
        "Manifest summary must remain source-only planned with required but not generated checksum evidence.",
      ),
    );
  }

  validateVerificationRefs(merged.verification_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_checksum_source.side_effects_forbidden",
        "/side_effects",
        "Checksum source verification must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_checksum_source_verification: {
      contract_id: releaseChecksumSourceVerificationContract.contract_id,
      extends_contract_id: releaseManifestSchemaExpansionContract.contract_id,
      identity: merged.identity ?? defaultReleaseChecksumSourceVerificationIdentity,
      manifest_summary:
        merged.manifest_summary ?? defaultReleaseChecksumSourceManifestSummary,
      verification_refs:
        merged.verification_refs ?? defaultReleaseChecksumSourceVerificationRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseChecksumSourceNoLivePosture,
      blocked_capabilities: [...releaseChecksumSourceVerificationBlockedFlags],
      generated_checksums: [],
      written_checksum_files: [],
      created_source_archives: [],
      created_binary_artifacts: [],
      github_releases: [],
      release_uploads: [],
      network_fetches: [],
      external_service_calls: [],
      signatures: [],
      generated_sboms: [],
      generated_provenance: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateVerificationRefs(
  refs: ReleaseChecksumSourceVerificationRef[] | undefined,
  errors: ReleaseChecksumSourceVerificationError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_checksum_source.verification_ref_required",
        "/verification_refs",
        "Checksum source verification refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.ref_kind));
  for (const kind of releaseChecksumSourceVerificationRequiredRefs) {
    if (!seen.has(kind)) {
      errors.push(
        error(
          "release_checksum_source.verification_ref_required",
          "/verification_refs",
          "Checksum source verification refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !releaseChecksumSourceVerificationRequiredRefs.includes(ref.ref_kind) ||
      ref.required !== true ||
      ref.generation_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_checksum_source.verification_ref_invalid",
          "/verification_refs",
          "Checksum source verification refs must be required, safe, and non-generating.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseChecksumSourceVerificationRequest,
  errors: ReleaseChecksumSourceVerificationError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_checksum_source.no_live_posture_drift",
        "/no_live_posture",
        "Checksum source verification requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseChecksumSourceVerificationBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_checksum_source.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Checksum source verification no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_checksum_source.blocked_capability_drift",
          `/${flag}`,
          "Checksum source verification blocked capability drifted.",
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
  code: ReleaseChecksumSourceVerificationErrorCode,
  path: string,
  message: string,
): ReleaseChecksumSourceVerificationError {
  return { code, path, message };
}
