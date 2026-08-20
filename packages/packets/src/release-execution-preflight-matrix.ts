export const RELEASE_EXECUTION_PREFLIGHT_MATRIX_STATUS = "source_only";

export const releaseExecutionPreflightLanes = [
  "source_archive",
  "canonical_macos_arm64_bundle",
  "canonical_macos_x64_bundle",
  "canonical_linux_x64_bundle",
  "canonical_linux_arm64_bundle",
  "homebrew_tap",
  "verified_install_script",
  "deb_ubuntu_24_04",
  "deb_debian_13",
  "rpm_rocky_linux_9",
  "oci_amd64",
  "oci_arm64",
  "cargo_bootstrap_verifier",
] as const;

export const releaseExecutionPreflightGateKinds = [
  "source_ref",
  "build_recipe_ref",
  "artifact_name_ref",
  "platform_arch_ref",
  "install_tier_ref",
  "checksum_ref",
  "signature_ref",
  "sbom_ref",
  "provenance_ref",
  "canonical_component_digest_map_ref",
  "reproducibility_ref",
  "license_notice_ref",
  "install_docs_ref",
  "upgrade_ref",
  "rollback_uninstall_ref",
  "non_root_ref",
  "no_auto_start_ref",
  "disablement_revocation_ref",
  "support_policy_ref",
  "approval_gate_ref",
  "download_pointer_ref",
] as const;

export const releaseExecutionPreflightBlockedFlags = [
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

export const releaseExecutionPreflightMatrixContract = {
  contract_id: "lnsat.release_execution_preflight_matrix.v0_1",
  packet_ref: "BP-0248",
  selected_after_packet_ref: "BP-0247",
  contract_authority:
    "source_only_release_execution_preflight_no_artifact_build_upload_publish_or_pointer_mutation",
  source_docs: [
    "docs/architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md",
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
    "docs/RELEASING.md",
    "fixtures/release/source-plan.json",
  ],
  phase_14_mandatory_before_v1: true,
  publication_requires_separate_gate: true,
  canonical_components_built_once_per_target: true,
  package_manager_product_rebuild_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseExecutionPreflightLane =
  (typeof releaseExecutionPreflightLanes)[number];
export type ReleaseExecutionPreflightGateKind =
  (typeof releaseExecutionPreflightGateKinds)[number];
export type ReleaseExecutionPreflightBlockedFlag =
  (typeof releaseExecutionPreflightBlockedFlags)[number];

export type ReleaseExecutionPreflightIdentity = {
  packet_ref: "BP-0248";
  selected_after_packet_ref: "BP-0247";
  release_version: "0.1.0-source-plan";
  execution_state: "release_execution_not_ready_source_only";
  artifacts_downloadable: false;
  implementation_allowed: false;
};

export type ReleaseExecutionPreflightGateRef = {
  lane: ReleaseExecutionPreflightLane;
  gate_kind: ReleaseExecutionPreflightGateKind;
  source_ref: string;
  required: true;
  ready: false;
  execution_allowed: false;
};

export type ReleaseExecutionPreflightLaneRef = {
  lane: ReleaseExecutionPreflightLane;
  distribution: "github_tag_archive" | "github_release_asset" | "registry_later";
  status: "planned_not_ready";
  build_allowed: false;
  publish_allowed: false;
};

export type ReleaseExecutionPreflightNoLivePosture = Record<
  ReleaseExecutionPreflightBlockedFlag,
  false
>;

export type ReleaseExecutionPreflightRequest = Partial<
  Record<ReleaseExecutionPreflightBlockedFlag, false>
> & {
  identity?: ReleaseExecutionPreflightIdentity;
  lanes?: ReleaseExecutionPreflightLaneRef[];
  gate_refs?: ReleaseExecutionPreflightGateRef[];
  no_live_posture?: ReleaseExecutionPreflightNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseExecutionPreflightErrorCode =
  | "release_execution_preflight.identity_invalid"
  | "release_execution_preflight.lane_required"
  | "release_execution_preflight.lane_invalid"
  | "release_execution_preflight.gate_ref_required"
  | "release_execution_preflight.gate_ref_invalid"
  | "release_execution_preflight.no_live_posture_drift"
  | "release_execution_preflight.blocked_capability_drift"
  | "release_execution_preflight.unexpected_field"
  | "release_execution_preflight.side_effects_forbidden";

export type ReleaseExecutionPreflightError = {
  code: ReleaseExecutionPreflightErrorCode;
  path: string;
  message: string;
};

export type ReleaseExecutionPreflightEvidence = {
  contract_id: typeof releaseExecutionPreflightMatrixContract.contract_id;
  identity: ReleaseExecutionPreflightIdentity;
  lanes: ReleaseExecutionPreflightLaneRef[];
  gate_refs: ReleaseExecutionPreflightGateRef[];
  no_live_posture: ReleaseExecutionPreflightNoLivePosture;
  blocked_capabilities: ReleaseExecutionPreflightBlockedFlag[];
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

export type ReleaseExecutionPreflightResult =
  | {
      ok: true;
      release_execution_preflight: ReleaseExecutionPreflightEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseExecutionPreflightError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseExecutionPreflightIdentity: ReleaseExecutionPreflightIdentity =
  {
    packet_ref: "BP-0248",
    selected_after_packet_ref: "BP-0247",
    release_version: "0.1.0-source-plan",
    execution_state: "release_execution_not_ready_source_only",
    artifacts_downloadable: false,
    implementation_allowed: false,
  };

export const defaultReleaseExecutionPreflightLanes: ReleaseExecutionPreflightLaneRef[] =
  releaseExecutionPreflightLanes.map((lane) => ({
    lane,
    distribution:
      lane === "source_archive"
        ? "github_tag_archive"
        : lane.startsWith("oci_") || lane === "cargo_bootstrap_verifier"
          ? "registry_later"
          : "github_release_asset",
    status: "planned_not_ready",
    build_allowed: false,
    publish_allowed: false,
  }));

export const defaultReleaseExecutionPreflightGateRefs: ReleaseExecutionPreflightGateRef[] =
  releaseExecutionPreflightLanes.flatMap((lane) =>
    releaseExecutionPreflightGateKinds.map((gate_kind) => ({
      lane,
      gate_kind,
      source_ref: `docs/architecture/RELEASE_EXECUTION_PREFLIGHT_MATRIX.md#${lane}-${gate_kind}`,
      required: true,
      ready: false,
      execution_allowed: false,
    })),
  );

export const defaultReleaseExecutionPreflightNoLivePosture = Object.fromEntries(
  releaseExecutionPreflightBlockedFlags.map((flag) => [flag, false]),
) as ReleaseExecutionPreflightNoLivePosture;

export const defaultReleaseExecutionPreflight: ReleaseExecutionPreflightRequest = {
  identity: defaultReleaseExecutionPreflightIdentity,
  lanes: defaultReleaseExecutionPreflightLanes,
  gate_refs: defaultReleaseExecutionPreflightGateRefs,
  no_live_posture: defaultReleaseExecutionPreflightNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "lanes",
  "gate_refs",
  "no_live_posture",
  "side_effects",
  ...releaseExecutionPreflightBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|npm publish|docker build|docker push|cosign sign|syft |slsa |wrangler |cloudflare api|cloudflare dns|create dns|deploy now|ssh |scp )/i;

export function createReleaseExecutionPreflight(
  request: ReleaseExecutionPreflightRequest = {},
): ReleaseExecutionPreflightResult {
  const merged = { ...defaultReleaseExecutionPreflight, ...request };
  const errors: ReleaseExecutionPreflightError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_execution_preflight.unexpected_field",
          `/${key}`,
          "Unexpected release execution preflight field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultReleaseExecutionPreflightIdentity)) {
    errors.push(
      error(
        "release_execution_preflight.identity_invalid",
        "/identity",
        "Release execution preflight identity must remain source-only and not ready.",
      ),
    );
  }

  validateLanes(merged.lanes, errors);
  validateGateRefs(merged.gate_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_execution_preflight.side_effects_forbidden",
        "/side_effects",
        "Release execution preflight must not record side effects.",
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
    release_execution_preflight: {
      contract_id: releaseExecutionPreflightMatrixContract.contract_id,
      identity: defaultReleaseExecutionPreflightIdentity,
      lanes: defaultReleaseExecutionPreflightLanes,
      gate_refs: defaultReleaseExecutionPreflightGateRefs,
      no_live_posture: defaultReleaseExecutionPreflightNoLivePosture,
      blocked_capabilities: [...releaseExecutionPreflightBlockedFlags],
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

function validateLanes(
  lanes: ReleaseExecutionPreflightLaneRef[] | undefined,
  errors: ReleaseExecutionPreflightError[],
): void {
  if (!Array.isArray(lanes)) {
    errors.push(
      error("release_execution_preflight.lane_required", "/lanes", "Lanes required."),
    );
    return;
  }

  const seen = new Set(lanes.map((lane) => lane.lane));
  for (const lane of releaseExecutionPreflightLanes) {
    if (!seen.has(lane)) {
      errors.push(
        error(
          "release_execution_preflight.lane_required",
          `/lanes/${lane}`,
          "Missing release execution preflight lane.",
        ),
      );
    }
  }

  lanes.forEach((lane, index) => {
    const known = releaseExecutionPreflightLanes.includes(
      lane.lane as ReleaseExecutionPreflightLane,
    );
    if (
      !known ||
      lane.status !== "planned_not_ready" ||
      lane.build_allowed !== false ||
      lane.publish_allowed !== false
    ) {
      errors.push(
        error(
          "release_execution_preflight.lane_invalid",
          `/lanes/${index}`,
          "Lane must be known, planned-not-ready, and non-mutating.",
        ),
      );
    }
  });
}

function validateGateRefs(
  refs: ReleaseExecutionPreflightGateRef[] | undefined,
  errors: ReleaseExecutionPreflightError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_execution_preflight.gate_ref_required",
        "/gate_refs",
        "Gate refs required.",
      ),
    );
    return;
  }

  const seen = new Set(refs.map((ref) => `${ref.lane}:${ref.gate_kind}`));
  for (const lane of releaseExecutionPreflightLanes) {
    for (const gateKind of releaseExecutionPreflightGateKinds) {
      if (!seen.has(`${lane}:${gateKind}`)) {
        errors.push(
          error(
            "release_execution_preflight.gate_ref_required",
            `/gate_refs/${lane}/${gateKind}`,
            "Missing release execution gate ref.",
          ),
        );
      }
    }
  }

  refs.forEach((ref, index) => {
    const laneKnown = releaseExecutionPreflightLanes.includes(
      ref.lane as ReleaseExecutionPreflightLane,
    );
    const gateKnown = releaseExecutionPreflightGateKinds.includes(
      ref.gate_kind as ReleaseExecutionPreflightGateKind,
    );
    if (
      !laneKnown ||
      !gateKnown ||
      ref.required !== true ||
      ref.ready !== false ||
      ref.execution_allowed !== false ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_execution_preflight.gate_ref_invalid",
          `/gate_refs/${index}`,
          "Gate ref must be known, not ready, non-executing, and source-only.",
        ),
      );
    }
  });
}

function validateNoLivePosture(
  request: ReleaseExecutionPreflightRequest,
  errors: ReleaseExecutionPreflightError[],
): void {
  if (
    !sameJson(request.no_live_posture, defaultReleaseExecutionPreflightNoLivePosture)
  ) {
    errors.push(
      error(
        "release_execution_preflight.no_live_posture_drift",
        "/no_live_posture",
        "No-live posture must keep all release execution capabilities false.",
      ),
    );
  }

  for (const flag of releaseExecutionPreflightBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_execution_preflight.blocked_capability_drift",
          `/${flag}`,
          "Blocked release execution capability must remain false.",
        ),
      );
    }
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function error(
  code: ReleaseExecutionPreflightErrorCode,
  path: string,
  message: string,
): ReleaseExecutionPreflightError {
  return { code, path, message };
}
