import { releaseManifestContract } from "./release-manifest-contract.js";

export const RELEASE_MANIFEST_SCHEMA_EXPANSION_STATUS = "source_only";

export const releaseManifestV02Sections = [
  "release_identity",
  "artifact_matrix",
  "checksum_index",
  "signature_index",
  "sbom_index",
  "provenance_index",
  "promotion_gates",
  "support_policy",
  "compatibility_matrix",
  "verification",
  "blocked_scope",
] as const;

export const releaseManifestV02ArtifactFamilies = [
  "source_archive",
  "server_bundle",
  "server_installer",
  "setup_ui_bundle",
  "admin_control_panel_assets",
  "operator_cli",
  "host_client_helper",
  "desktop_tray_client",
  "linux_package",
  "macos_package",
  "windows_package",
  "container_image",
  "mcp_extension_package",
  "connector_sdk_package",
  "optional_python_adapter_package",
] as const;

export const releaseManifestPromotionStates = [
  "source_only_planned",
  "release_candidate",
  "stable",
  "deprecated",
  "revoked",
  "emergency_disabled",
] as const;

export const releaseManifestSignatureStatuses = [
  "planned_not_signed",
  "signed",
  "notarized",
  "revoked",
] as const;

export const releaseManifestBlockedReleaseAutomationFlags = [
  "binary_build_allowed",
  "package_build_allowed",
  "package_publish_allowed",
  "release_upload_allowed",
  "github_release_creation_allowed",
  "checksum_generation_execution_allowed",
  "signing_execution_allowed",
  "sbom_generation_execution_allowed",
  "provenance_generation_execution_allowed",
  "registry_publish_allowed",
  "notarization_allowed",
  "installer_execution_allowed",
  "service_install_restart_allowed",
  "root_helper_allowed",
  "host_mutation_allowed",
  "client_enrollment_allowed",
  "mcp_extension_installation_allowed",
  "auth_wiring_allowed",
  "credential_storage_allowed",
  "integration_setup_write_allowed",
  "database_write_allowed",
  "runtime_live_behavior_allowed",
  "dns_cloudflare_mutation_allowed",
  "ssh_allowed",
  "docker_runner_allowed",
  "node_agent_allowed",
  "external_service_call_allowed",
  "secret_value_allowed",
] as const;

export const releaseManifestSchemaExpansionContract = {
  contract_id: "lnsat.platform.release_manifest_schema_expansion.v0_2",
  extends_contract_id: releaseManifestContract.contract_id,
  manifest_version_target: "0.2",
  packet_ref: "BP-0230",
  selected_after_packet_ref: "BP-0224",
  source_docs: [
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  contract_authority:
    "source_only_schema_expansion_no_artifact_build_upload_signing_or_publish",
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseManifestV02Section = (typeof releaseManifestV02Sections)[number];
export type ReleaseManifestV02ArtifactFamily =
  (typeof releaseManifestV02ArtifactFamilies)[number];
export type ReleaseManifestPromotionState =
  (typeof releaseManifestPromotionStates)[number];
export type ReleaseManifestSignatureStatus =
  (typeof releaseManifestSignatureStatuses)[number];
export type ReleaseManifestBlockedReleaseAutomationFlag =
  (typeof releaseManifestBlockedReleaseAutomationFlags)[number];

export type ReleaseManifestSchemaIdentity = {
  schema_ref: "release-manifest-schema:v0.2-source-only";
  manifest_version_target: "0.2";
  packet_ref: "BP-0230";
  selected_after_packet_ref: "BP-0224";
  source_plan_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md";
  implementation_allowed: false;
};

export type ReleaseManifestSchemaSectionRef = {
  section: ReleaseManifestV02Section;
  required: true;
  source_ref: string;
};

export type ReleaseManifestArtifactMatrixSchemaRef = {
  artifact_family: ReleaseManifestV02ArtifactFamily;
  asset_name_pattern_ref: "lnsat-{component}-{version}-{platform}-{arch}.{ext}";
  platform_ref_required: true;
  architecture_ref_required: true;
  install_tier_ref_required: true;
  artifact_creation_allowed: false;
};

export type ReleaseManifestTrustIndexSchemaRef = {
  artifact_family: ReleaseManifestV02ArtifactFamily;
  checksum_required: true;
  signature_status: ReleaseManifestSignatureStatus;
  sbom_required: true;
  provenance_required: true;
  missing_evidence_reason_allowed: true;
  generation_execution_allowed: false;
};

export type ReleaseManifestPromotionGateSchemaRef = {
  state: ReleaseManifestPromotionState;
  allowed_without_artifacts: boolean;
  approval_ref_required_for_stable: boolean;
  revocation_ref_required: boolean;
};

export type ReleaseManifestSupportPolicySchemaRef = {
  support_window_required: true;
  lts_flag_required: true;
  deprecation_ref_required: true;
  end_of_support_ref_required: true;
};

export type ReleaseManifestCompatibilitySchemaRef = {
  os_ref_required: true;
  architecture_ref_required: true;
  package_manager_ref_required: true;
  browser_ref_required: true;
  database_ref_required: true;
  auth_provider_ref_required: true;
  deployment_mode_ref_required: true;
  unsupported_ref_required: true;
};

export type ReleaseManifestSchemaSourceRef = {
  source_ref: string;
  summary: string;
};

export type ReleaseManifestSchemaNoLivePosture = Record<
  ReleaseManifestBlockedReleaseAutomationFlag,
  false
>;

export type ReleaseManifestSchemaExpansionRequest = Partial<
  Record<ReleaseManifestBlockedReleaseAutomationFlag, false>
> & {
  schema_identity?: ReleaseManifestSchemaIdentity;
  section_refs?: ReleaseManifestSchemaSectionRef[];
  artifact_matrix_schema_refs?: ReleaseManifestArtifactMatrixSchemaRef[];
  trust_index_schema_refs?: ReleaseManifestTrustIndexSchemaRef[];
  promotion_gate_schema_refs?: ReleaseManifestPromotionGateSchemaRef[];
  support_policy_schema_ref?: ReleaseManifestSupportPolicySchemaRef;
  compatibility_schema_ref?: ReleaseManifestCompatibilitySchemaRef;
  source_refs?: ReleaseManifestSchemaSourceRef[];
  no_live_posture?: ReleaseManifestSchemaNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseManifestSchemaExpansionErrorCode =
  | "release_manifest_schema.identity_invalid"
  | "release_manifest_schema.section_ref_required"
  | "release_manifest_schema.section_ref_invalid"
  | "release_manifest_schema.artifact_matrix_required"
  | "release_manifest_schema.artifact_matrix_invalid"
  | "release_manifest_schema.trust_index_required"
  | "release_manifest_schema.trust_index_invalid"
  | "release_manifest_schema.promotion_gate_required"
  | "release_manifest_schema.promotion_gate_invalid"
  | "release_manifest_schema.support_policy_required"
  | "release_manifest_schema.compatibility_required"
  | "release_manifest_schema.source_ref_required"
  | "release_manifest_schema.source_ref_invalid"
  | "release_manifest_schema.no_live_posture_drift"
  | "release_manifest_schema.blocked_capability_drift"
  | "release_manifest_schema.unexpected_field"
  | "release_manifest_schema.side_effects_forbidden";

export type ReleaseManifestSchemaExpansionError = {
  code: ReleaseManifestSchemaExpansionErrorCode;
  path: string;
  message: string;
};

export type ReleaseManifestSchemaExpansionEvidence = {
  contract_id: typeof releaseManifestSchemaExpansionContract.contract_id;
  extends_contract_id: typeof releaseManifestContract.contract_id;
  manifest_version_target: "0.2";
  schema_identity: ReleaseManifestSchemaIdentity;
  section_refs: ReleaseManifestSchemaSectionRef[];
  artifact_matrix_schema_refs: ReleaseManifestArtifactMatrixSchemaRef[];
  trust_index_schema_refs: ReleaseManifestTrustIndexSchemaRef[];
  promotion_gate_schema_refs: ReleaseManifestPromotionGateSchemaRef[];
  support_policy_schema_ref: ReleaseManifestSupportPolicySchemaRef;
  compatibility_schema_ref: ReleaseManifestCompatibilitySchemaRef;
  source_refs: ReleaseManifestSchemaSourceRef[];
  no_live_posture: ReleaseManifestSchemaNoLivePosture;
  blocked_capabilities: ReleaseManifestBlockedReleaseAutomationFlag[];
  release_artifacts: [];
  binary_artifacts: [];
  published_packages: [];
  generated_checksums: [];
  generated_sboms: [];
  generated_provenance: [];
  signatures: [];
  github_releases: [];
  registry_publications: [];
  dns_cloudflare_mutations: [];
  runtime_invocations: [];
  side_effects: [];
};

export type ReleaseManifestSchemaExpansionResult =
  | {
      ok: true;
      release_manifest_schema_expansion: ReleaseManifestSchemaExpansionEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseManifestSchemaExpansionError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseManifestSchemaIdentity: ReleaseManifestSchemaIdentity = {
  schema_ref: "release-manifest-schema:v0.2-source-only",
  manifest_version_target: "0.2",
  packet_ref: "BP-0230",
  selected_after_packet_ref: "BP-0224",
  source_plan_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
  implementation_allowed: false,
};

export const defaultReleaseManifestSchemaSectionRefs: ReleaseManifestSchemaSectionRef[] =
  releaseManifestV02Sections.map((section) => ({
    section,
    required: true,
    source_ref: `docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#${section}`,
  }));

export const defaultReleaseManifestArtifactMatrixSchemaRefs: ReleaseManifestArtifactMatrixSchemaRef[] =
  releaseManifestV02ArtifactFamilies.map((artifact_family) => ({
    artifact_family,
    asset_name_pattern_ref: "lnsat-{component}-{version}-{platform}-{arch}.{ext}",
    platform_ref_required: true,
    architecture_ref_required: true,
    install_tier_ref_required: true,
    artifact_creation_allowed: false,
  }));

export const defaultReleaseManifestTrustIndexSchemaRefs: ReleaseManifestTrustIndexSchemaRef[] =
  releaseManifestV02ArtifactFamilies.map((artifact_family) => ({
    artifact_family,
    checksum_required: true,
    signature_status: "planned_not_signed",
    sbom_required: true,
    provenance_required: true,
    missing_evidence_reason_allowed: true,
    generation_execution_allowed: false,
  }));

export const defaultReleaseManifestPromotionGateSchemaRefs: ReleaseManifestPromotionGateSchemaRef[] =
  releaseManifestPromotionStates.map((state) => ({
    state,
    allowed_without_artifacts: state === "source_only_planned",
    approval_ref_required_for_stable: state === "stable",
    revocation_ref_required: state === "revoked" || state === "emergency_disabled",
  }));

export const defaultReleaseManifestSupportPolicySchemaRef: ReleaseManifestSupportPolicySchemaRef =
  {
    support_window_required: true,
    lts_flag_required: true,
    deprecation_ref_required: true,
    end_of_support_ref_required: true,
  };

export const defaultReleaseManifestCompatibilitySchemaRef: ReleaseManifestCompatibilitySchemaRef =
  {
    os_ref_required: true,
    architecture_ref_required: true,
    package_manager_ref_required: true,
    browser_ref_required: true,
    database_ref_required: true,
    auth_provider_ref_required: true,
    deployment_mode_ref_required: true,
    unsupported_ref_required: true,
  };

export const defaultReleaseManifestSchemaSourceRefs: ReleaseManifestSchemaSourceRef[] =
  [
    {
      source_ref: "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
      summary: "BP-0224 release trust automation plan",
    },
    {
      source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
      summary: "BP-0224 source-only release trust packet",
    },
    {
      source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
      summary: "BP-0230 schema expansion packet",
    },
    {
      source_ref: "packages/packets/src/release-manifest-schema-expansion.ts",
      summary: "release manifest schema expansion contract implementation",
    },
  ];

export const defaultReleaseManifestSchemaNoLivePosture = Object.fromEntries(
  releaseManifestBlockedReleaseAutomationFlags.map((flag) => [flag, false]),
) as ReleaseManifestSchemaNoLivePosture;

export const defaultReleaseManifestSchemaExpansion: ReleaseManifestSchemaExpansionRequest =
  {
    schema_identity: defaultReleaseManifestSchemaIdentity,
    section_refs: defaultReleaseManifestSchemaSectionRefs,
    artifact_matrix_schema_refs: defaultReleaseManifestArtifactMatrixSchemaRefs,
    trust_index_schema_refs: defaultReleaseManifestTrustIndexSchemaRefs,
    promotion_gate_schema_refs: defaultReleaseManifestPromotionGateSchemaRefs,
    support_policy_schema_ref: defaultReleaseManifestSupportPolicySchemaRef,
    compatibility_schema_ref: defaultReleaseManifestCompatibilitySchemaRef,
    source_refs: defaultReleaseManifestSchemaSourceRefs,
    no_live_posture: defaultReleaseManifestSchemaNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "schema_identity",
  "section_refs",
  "artifact_matrix_schema_refs",
  "trust_index_schema_refs",
  "promotion_gate_schema_refs",
  "support_policy_schema_ref",
  "compatibility_schema_ref",
  "source_refs",
  "no_live_posture",
  "side_effects",
  ...releaseManifestBlockedReleaseAutomationFlags,
]);

const unsafeTextPattern =
  /(secret token|store secret|raw secret|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|github release creation|release upload|npm publish|docker push|cosign sign|signing execution|sbom generation execution|provenance generation execution|installer execution|service install|external service call|cloudflare dns)/i;

export function createReleaseManifestSchemaExpansion(
  request: ReleaseManifestSchemaExpansionRequest = {},
): ReleaseManifestSchemaExpansionResult {
  const merged = { ...defaultReleaseManifestSchemaExpansion, ...request };
  const errors: ReleaseManifestSchemaExpansionError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_manifest_schema.unexpected_field",
          `/${key}`,
          "Unexpected release manifest schema expansion field.",
        ),
      );
    }
  }

  if (!sameJson(merged.schema_identity, defaultReleaseManifestSchemaIdentity)) {
    errors.push(
      error(
        "release_manifest_schema.identity_invalid",
        "/schema_identity",
        "Schema expansion identity must stay BP-0230 source-only after BP-0224.",
      ),
    );
  }

  validateArrayCoverage(
    merged.section_refs,
    releaseManifestV02Sections,
    "section",
    "/section_refs",
    "release_manifest_schema.section_ref_required",
    errors,
  );
  for (const ref of merged.section_refs ?? []) {
    if (ref.required !== true || !safeText(ref.source_ref)) {
      errors.push(
        error(
          "release_manifest_schema.section_ref_invalid",
          "/section_refs",
          "Manifest v0.2 sections must be required and source-backed.",
        ),
      );
    }
  }

  validateArrayCoverage(
    merged.artifact_matrix_schema_refs,
    releaseManifestV02ArtifactFamilies,
    "artifact_family",
    "/artifact_matrix_schema_refs",
    "release_manifest_schema.artifact_matrix_required",
    errors,
  );
  for (const ref of merged.artifact_matrix_schema_refs ?? []) {
    if (
      ref.asset_name_pattern_ref !==
        "lnsat-{component}-{version}-{platform}-{arch}.{ext}" ||
      ref.platform_ref_required !== true ||
      ref.architecture_ref_required !== true ||
      ref.install_tier_ref_required !== true ||
      ref.artifact_creation_allowed !== false
    ) {
      errors.push(
        error(
          "release_manifest_schema.artifact_matrix_invalid",
          "/artifact_matrix_schema_refs",
          "Artifact matrix schema must require refs and cannot create artifacts.",
        ),
      );
    }
  }

  validateArrayCoverage(
    merged.trust_index_schema_refs,
    releaseManifestV02ArtifactFamilies,
    "artifact_family",
    "/trust_index_schema_refs",
    "release_manifest_schema.trust_index_required",
    errors,
  );
  for (const ref of merged.trust_index_schema_refs ?? []) {
    if (
      ref.checksum_required !== true ||
      !releaseManifestSignatureStatuses.includes(ref.signature_status) ||
      ref.sbom_required !== true ||
      ref.provenance_required !== true ||
      ref.missing_evidence_reason_allowed !== true ||
      ref.generation_execution_allowed !== false
    ) {
      errors.push(
        error(
          "release_manifest_schema.trust_index_invalid",
          "/trust_index_schema_refs",
          "Trust index schema must require checksum/signature/SBOM/provenance refs without generation execution.",
        ),
      );
    }
  }

  validateArrayCoverage(
    merged.promotion_gate_schema_refs,
    releaseManifestPromotionStates,
    "state",
    "/promotion_gate_schema_refs",
    "release_manifest_schema.promotion_gate_required",
    errors,
  );
  for (const ref of merged.promotion_gate_schema_refs ?? []) {
    if (
      !releaseManifestPromotionStates.includes(ref.state) ||
      (ref.state === "stable" && ref.approval_ref_required_for_stable !== true) ||
      ((ref.state === "revoked" || ref.state === "emergency_disabled") &&
        ref.revocation_ref_required !== true)
    ) {
      errors.push(
        error(
          "release_manifest_schema.promotion_gate_invalid",
          "/promotion_gate_schema_refs",
          "Promotion gates must protect stable, revoked, and emergency-disabled states.",
        ),
      );
    }
  }

  if (
    !merged.support_policy_schema_ref ||
    Object.values(merged.support_policy_schema_ref).some((value) => value !== true)
  ) {
    errors.push(
      error(
        "release_manifest_schema.support_policy_required",
        "/support_policy_schema_ref",
        "Support policy schema must require support, LTS, deprecation, and end-of-support refs.",
      ),
    );
  }

  if (
    !merged.compatibility_schema_ref ||
    Object.values(merged.compatibility_schema_ref).some((value) => value !== true)
  ) {
    errors.push(
      error(
        "release_manifest_schema.compatibility_required",
        "/compatibility_schema_ref",
        "Compatibility schema must require platform, architecture, package, browser, database, auth, deployment, and unsupported refs.",
      ),
    );
  }

  validateSourceRefs(merged.source_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_manifest_schema.side_effects_forbidden",
        "/side_effects",
        "Release manifest schema expansion must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_manifest_schema_expansion: {
      contract_id: releaseManifestSchemaExpansionContract.contract_id,
      extends_contract_id: releaseManifestContract.contract_id,
      manifest_version_target: "0.2",
      schema_identity: merged.schema_identity ?? defaultReleaseManifestSchemaIdentity,
      section_refs: merged.section_refs ?? defaultReleaseManifestSchemaSectionRefs,
      artifact_matrix_schema_refs:
        merged.artifact_matrix_schema_refs ??
        defaultReleaseManifestArtifactMatrixSchemaRefs,
      trust_index_schema_refs:
        merged.trust_index_schema_refs ?? defaultReleaseManifestTrustIndexSchemaRefs,
      promotion_gate_schema_refs:
        merged.promotion_gate_schema_refs ??
        defaultReleaseManifestPromotionGateSchemaRefs,
      support_policy_schema_ref:
        merged.support_policy_schema_ref ??
        defaultReleaseManifestSupportPolicySchemaRef,
      compatibility_schema_ref:
        merged.compatibility_schema_ref ?? defaultReleaseManifestCompatibilitySchemaRef,
      source_refs: merged.source_refs ?? defaultReleaseManifestSchemaSourceRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseManifestSchemaNoLivePosture,
      blocked_capabilities: [...releaseManifestBlockedReleaseAutomationFlags],
      release_artifacts: [],
      binary_artifacts: [],
      published_packages: [],
      generated_checksums: [],
      generated_sboms: [],
      generated_provenance: [],
      signatures: [],
      github_releases: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      runtime_invocations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateSourceRefs(
  refs: ReleaseManifestSchemaSourceRef[] | undefined,
  errors: ReleaseManifestSchemaExpansionError[],
): void {
  if (!Array.isArray(refs) || refs.length === 0) {
    errors.push(
      error(
        "release_manifest_schema.source_ref_required",
        "/source_refs",
        "Release manifest schema expansion requires source refs.",
      ),
    );
    return;
  }
  if (
    !refs.some(
      (ref) => ref.source_ref === "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    ) ||
    !refs.some((ref) => ref.source_ref === "docs/reference/CONTRACT_PROVENANCE.md")
  ) {
    errors.push(
      error(
        "release_manifest_schema.source_ref_required",
        "/source_refs",
        "Release manifest schema expansion requires BP-0224 source refs.",
      ),
    );
  }
  for (const ref of refs) {
    if (!safeText(ref.source_ref) || !safeText(ref.summary)) {
      errors.push(
        error(
          "release_manifest_schema.source_ref_invalid",
          "/source_refs",
          "Release manifest schema source refs must be safe text.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseManifestSchemaExpansionRequest,
  errors: ReleaseManifestSchemaExpansionError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_manifest_schema.no_live_posture_drift",
        "/no_live_posture",
        "Release manifest schema expansion requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseManifestBlockedReleaseAutomationFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_manifest_schema.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Release manifest schema expansion no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_manifest_schema.blocked_capability_drift",
          `/${flag}`,
          "Release manifest schema expansion blocked capability drifted.",
        ),
      );
    }
  }
}

function validateArrayCoverage<T extends Record<string, unknown>>(
  refs: T[] | undefined,
  expected: readonly string[],
  key: keyof T,
  path: string,
  code: ReleaseManifestSchemaExpansionErrorCode,
  errors: ReleaseManifestSchemaExpansionError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error(code, path, "Release manifest schema refs are required."));
    return;
  }
  const seen = new Set(refs.map((ref) => String(ref[key])));
  for (const expectedValue of expected) {
    if (!seen.has(expectedValue)) {
      errors.push(error(code, path, "Release manifest schema refs are incomplete."));
      return;
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
  code: ReleaseManifestSchemaExpansionErrorCode,
  path: string,
  message: string,
): ReleaseManifestSchemaExpansionError {
  return { code, path, message };
}
