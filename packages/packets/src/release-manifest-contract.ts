import { distributionClientInstallerPlanContract } from "./distribution-client-installer-plan-contract.js";
import { selfDeployPackagingPlanContract } from "./self-deploy-packaging-plan-contract.js";

export const RELEASE_MANIFEST_CONTRACT_STATUS = "source_only";

export const releaseManifestPackageFamilies = [
  "source_release",
  "server_bundle",
  "server_installer",
  "setup_ui_bundle",
  "admin_control_panel",
  "operator_cli",
  "host_client_helper",
  "desktop_tray_client",
  "mcp_extension_package",
  "connector_sdk_package",
  "optional_python_adapter_package",
] as const;

export const releaseManifestInstallTiers = [
  "source_review",
  "local_single_node_server",
  "self_hosted_team_server",
  "managed_fleet",
  "hybrid_saas_later",
] as const;

export const releaseManifestSecurityGateKinds = [
  "source_commit",
  "version",
  "target_platform_architecture",
  "build_recipe",
  "checksum",
  "signature_status",
  "sbom",
  "provenance",
  "license_files",
  "config_template_refs",
  "permission_refs",
  "service_user_expectation",
  "network_data_path_refs",
  "secret_storage_posture",
  "rollback_uninstall",
  "disablement",
  "audit_refs",
  "approval_refs",
] as const;

export const releaseManifestFactoryCleanKinds = [
  "no_customer_data",
  "no_credentials_or_tokens",
  "no_preconnected_systems",
  "no_tenant_assumptions",
  "no_automatic_ingestion_before_onboarding",
  "blank_until_setup_onboarding",
] as const;

export const releaseManifestExtensionHandoffKinds = [
  "mcp_extensions_separate_from_core_installers",
  "extension_sdk_source_ref_only",
  "connector_manifest_schema_ref_only",
  "drag_drop_manifest_intake_ref_only",
  "link_visualization_ref_only",
  "relationship_graph_ref_only",
  "permission_matrix_ref_only",
] as const;

export const releaseManifestBlockedCapabilityFlags = [
  "binary_build_allowed",
  "package_creation_allowed",
  "package_publish_allowed",
  "signing_execution_allowed",
  "installer_execution_allowed",
  "service_install_allowed",
  "service_restart_allowed",
  "root_helper_allowed",
  "host_mutation_allowed",
  "client_enrollment_allowed",
  "mcp_extension_installation_allowed",
  "auth_provider_wiring_allowed",
  "credential_storage_allowed",
  "integration_setup_write_allowed",
  "seeded_customer_data_allowed",
  "automatic_ingestion_before_onboarding_allowed",
  "database_connection_allowed",
  "database_write_allowed",
  "sql_execution_allowed",
  "ddl_execution_allowed",
  "migration_execution_allowed",
  "query_runner_allowed",
  "writer_implementation_allowed",
  "persisted_audit_writer_allowed",
  "approval_mutation_allowed",
  "queue_mutation_allowed",
  "runtime_dispatcher_allowed",
  "live_broker_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_execution_allowed",
  "deploy_allowed",
  "ssh_allowed",
  "docker_runner_allowed",
  "node_agent_install_allowed",
  "dns_cloudflare_mutation_allowed",
  "external_service_call_allowed",
  "secret_values_allowed",
  "python_core_required",
  "os_specific_binary_core_required",
] as const;

export const releaseManifestContract = {
  contract_id: "lnsat.platform.release_manifest.v0_1",
  authority: ["@lnsat/packets", "source-backed-release-manifest"],
  manifest_version: "0.1",
  source_docs: [
    "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    "docs/architecture/DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  distribution_client_installer_plan_contract_id:
    distributionClientInstallerPlanContract.contract_id,
  self_deploy_packaging_plan_contract_id: selfDeployPackagingPlanContract.contract_id,
  contract_authority: "source_only_release_manifest_no_artifact_build_or_install",
  factory_clean_release_required: true,
  source_canonical_artifact: true,
  onboarding_required_before_ingestion: true,
  mcp_extensions_separate: true,
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseManifestPackageFamily =
  (typeof releaseManifestPackageFamilies)[number];
export type ReleaseManifestInstallTier = (typeof releaseManifestInstallTiers)[number];
export type ReleaseManifestSecurityGateKind =
  (typeof releaseManifestSecurityGateKinds)[number];
export type ReleaseManifestFactoryCleanKind =
  (typeof releaseManifestFactoryCleanKinds)[number];
export type ReleaseManifestExtensionHandoffKind =
  (typeof releaseManifestExtensionHandoffKinds)[number];
export type ReleaseManifestBlockedCapabilityFlag =
  (typeof releaseManifestBlockedCapabilityFlags)[number];

export type ReleaseManifestIdentityInput = {
  packet_ref: "BP-0219";
  selected_after_packet_ref: "BP-0220";
  manifest_ref: "release_manifest:source_only";
  manifest_mode: "source_contract_only";
};

export type ReleaseManifestSourceReleaseRefInput = {
  source_commit_ref: string;
  version_ref: string;
  branch_or_tag_ref: string;
  archive_ref: string;
  docs_bundle_ref: string;
  license_file_refs: string[];
  config_template_refs: string[];
  source_refs: string[];
  artifact_created: false;
};

export type ReleaseManifestPackageMatrixRefInput = {
  package_ref: string;
  package_family: ReleaseManifestPackageFamily;
  install_tier: ReleaseManifestInstallTier;
  platform_ref: string;
  architecture_ref: string;
  runtime_dependency_posture: string;
  checksum_ref: string;
  signature_status_ref: string;
  sbom_ref: string;
  provenance_ref: string;
  rollback_uninstall_ref: string;
  disablement_ref: string;
  build_allowed: false;
  publish_allowed: false;
  install_allowed: false;
};

export type ReleaseManifestSecurityGateRefInput = {
  gate_ref: string;
  gate_kind: ReleaseManifestSecurityGateKind;
  evidence_ref: string;
  required_before_artifact_publish: true;
};

export type ReleaseManifestFactoryCleanRefInput = {
  clean_ref: string;
  clean_kind: ReleaseManifestFactoryCleanKind;
  assertion_ref: string;
  allowed: false;
};

export type ReleaseManifestExtensionHandoffRefInput = {
  handoff_ref: string;
  handoff_kind: ReleaseManifestExtensionHandoffKind;
  source_ref: string;
  implementation_allowed: false;
  activation_allowed: false;
};

export type ReleaseManifestSourceRefInput = {
  source_ref: string;
  summary: string;
};

export type ReleaseManifestNoLivePostureInput = Record<
  ReleaseManifestBlockedCapabilityFlag,
  false
>;

export type ReleaseManifestRequest = Partial<
  Record<ReleaseManifestBlockedCapabilityFlag, false>
> & {
  manifest_identity?: ReleaseManifestIdentityInput;
  source_release_ref?: ReleaseManifestSourceReleaseRefInput;
  package_matrix_refs?: ReleaseManifestPackageMatrixRefInput[];
  security_gate_refs?: ReleaseManifestSecurityGateRefInput[];
  factory_clean_refs?: ReleaseManifestFactoryCleanRefInput[];
  extension_handoff_refs?: ReleaseManifestExtensionHandoffRefInput[];
  source_refs?: ReleaseManifestSourceRefInput[];
  no_live_posture?: ReleaseManifestNoLivePostureInput;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseManifestErrorCode =
  | "release_manifest.identity_invalid"
  | "release_manifest.source_release_ref_required"
  | "release_manifest.source_release_ref_invalid"
  | "release_manifest.package_matrix_ref_required"
  | "release_manifest.package_matrix_ref_invalid"
  | "release_manifest.security_gate_ref_required"
  | "release_manifest.security_gate_ref_invalid"
  | "release_manifest.factory_clean_ref_required"
  | "release_manifest.factory_clean_ref_invalid"
  | "release_manifest.extension_handoff_ref_required"
  | "release_manifest.extension_handoff_ref_invalid"
  | "release_manifest.source_ref_required"
  | "release_manifest.source_ref_invalid"
  | "release_manifest.no_live_posture_drift"
  | "release_manifest.blocked_capability_drift"
  | "release_manifest.unexpected_field"
  | "release_manifest.side_effects_forbidden";

export type ReleaseManifestError = {
  code: ReleaseManifestErrorCode;
  path: string;
  message: string;
};

export type ReleaseManifestEvidence = {
  contract_id: typeof releaseManifestContract.contract_id;
  manifest_version: typeof releaseManifestContract.manifest_version;
  manifest_identity: ReleaseManifestIdentityInput;
  distribution_client_installer_plan_contract_id: string;
  self_deploy_packaging_plan_contract_id: string;
  contract_authority: typeof releaseManifestContract.contract_authority;
  source_release_ref: ReleaseManifestSourceReleaseRefInput;
  package_matrix_refs: ReleaseManifestPackageMatrixRefInput[];
  security_gate_refs: ReleaseManifestSecurityGateRefInput[];
  factory_clean_refs: ReleaseManifestFactoryCleanRefInput[];
  extension_handoff_refs: ReleaseManifestExtensionHandoffRefInput[];
  source_refs: ReleaseManifestSourceRefInput[];
  no_live_posture: ReleaseManifestNoLivePostureInput;
  blocked_capabilities: ReleaseManifestBlockedCapabilityFlag[];
  release_artifacts: [];
  binary_artifacts: [];
  published_packages: [];
  installer_executions: [];
  service_installations: [];
  client_enrollments: [];
  mcp_extension_installations: [];
  credential_records: [];
  integration_setup_writes: [];
  seeded_customer_data: [];
  runtime_invocations: [];
  source_canonical_artifact: true;
  factory_clean_release_required: true;
  onboarding_required_before_ingestion: true;
  mcp_extensions_separate: true;
  side_effects: [];
};

export type ReleaseManifestResult =
  | {
      ok: true;
      release_manifest: ReleaseManifestEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseManifestError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseManifestIdentity: ReleaseManifestIdentityInput = {
  packet_ref: "BP-0219",
  selected_after_packet_ref: "BP-0220",
  manifest_ref: "release_manifest:source_only",
  manifest_mode: "source_contract_only",
};

export const defaultReleaseManifestSourceReleaseRef: ReleaseManifestSourceReleaseRefInput =
  {
    source_commit_ref: "git:main:source-commit-ref-required-before-release",
    version_ref: "version:source-release-version-ref",
    branch_or_tag_ref: "git:tag-or-branch-ref-required-before-release",
    archive_ref: "artifact-ref:source-archive-only-not-created-by-bp0219",
    docs_bundle_ref: "docs:release-docs-bundle-ref",
    license_file_refs: ["LICENSE", "docs:license-files-ref"],
    config_template_refs: [".env.example", "docs:config-template-ref"],
    source_refs: [
      "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
      "docs/architecture/DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md",
      "docs/reference/CONTRACT_PROVENANCE.md",
    ],
    artifact_created: false,
  };

export const defaultReleaseManifestPackageMatrixRefs: ReleaseManifestPackageMatrixRefInput[] =
  releaseManifestPackageFamilies.map((family) => ({
    package_ref: `release-package:${family}`,
    package_family: family,
    install_tier:
      family === "source_release"
        ? "source_review"
        : family === "host_client_helper" || family === "desktop_tray_client"
          ? "managed_fleet"
          : "local_single_node_server",
    platform_ref: "platform:planned-matrix-ref-only",
    architecture_ref: "architecture:planned-matrix-ref-only",
    runtime_dependency_posture: "source-only planned package metadata",
    checksum_ref: `checksum-ref:${family}`,
    signature_status_ref: `signature-status-ref:${family}:not-signed-in-bp0219`,
    sbom_ref: `sbom-ref:${family}`,
    provenance_ref: `provenance-ref:${family}`,
    rollback_uninstall_ref: `rollback-ref:${family}`,
    disablement_ref: `disablement-ref:${family}`,
    build_allowed: false,
    publish_allowed: false,
    install_allowed: false,
  }));

export const defaultReleaseManifestSecurityGateRefs: ReleaseManifestSecurityGateRefInput[] =
  releaseManifestSecurityGateKinds.map((kind) => ({
    gate_ref: `release-gate:${kind}`,
    gate_kind: kind,
    evidence_ref: `release-evidence:${kind}`,
    required_before_artifact_publish: true,
  }));

export const defaultReleaseManifestFactoryCleanRefs: ReleaseManifestFactoryCleanRefInput[] =
  releaseManifestFactoryCleanKinds.map((kind) => ({
    clean_ref: `factory-clean:${kind}`,
    clean_kind: kind,
    assertion_ref: `assertion:${kind}`,
    allowed: false,
  }));

export const defaultReleaseManifestExtensionHandoffRefs: ReleaseManifestExtensionHandoffRefInput[] =
  releaseManifestExtensionHandoffKinds.map((kind) => ({
    handoff_ref: `extension-handoff:${kind}`,
    handoff_kind: kind,
    source_ref: `source-ref:${kind}`,
    implementation_allowed: false,
    activation_allowed: false,
  }));

export const defaultReleaseManifestSourceRefs: ReleaseManifestSourceRefInput[] = [
  {
    source_ref: "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
    summary: "BP-0218 source-only distribution and client installer boundary",
  },
  {
    source_ref: "docs/architecture/DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md",
    summary: "BP-0220 practical package families and secure installer gates",
  },
  {
    source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
    summary: "BP-0219 release manifest packet",
  },
  {
    source_ref: "packages/packets/src/release-manifest-contract.ts",
    summary: "source-only release manifest contract implementation",
  },
  {
    source_ref: "packages/packets/test/release-manifest-contract.test.ts",
    summary: "release manifest fail-closed tests",
  },
];

export const defaultReleaseManifestNoLivePosture = Object.fromEntries(
  releaseManifestBlockedCapabilityFlags.map((flag) => [flag, false]),
) as ReleaseManifestNoLivePostureInput;

export const defaultReleaseManifest: ReleaseManifestRequest = {
  manifest_identity: defaultReleaseManifestIdentity,
  source_release_ref: defaultReleaseManifestSourceReleaseRef,
  package_matrix_refs: defaultReleaseManifestPackageMatrixRefs,
  security_gate_refs: defaultReleaseManifestSecurityGateRefs,
  factory_clean_refs: defaultReleaseManifestFactoryCleanRefs,
  extension_handoff_refs: defaultReleaseManifestExtensionHandoffRefs,
  source_refs: defaultReleaseManifestSourceRefs,
  no_live_posture: defaultReleaseManifestNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "manifest_identity",
  "source_release_ref",
  "package_matrix_refs",
  "security_gate_refs",
  "factory_clean_refs",
  "extension_handoff_refs",
  "source_refs",
  "no_live_posture",
  "side_effects",
  ...releaseManifestBlockedCapabilityFlags,
]);

const unsafeTextPattern =
  /(secret token|store secret|raw secret|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|npm publish|docker push|signing execution|installer execution|service install|seed customer|external service call)/i;

export function createReleaseManifest(
  request: ReleaseManifestRequest = {},
): ReleaseManifestResult {
  const merged = { ...defaultReleaseManifest, ...request };
  const errors: ReleaseManifestError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_manifest.unexpected_field",
          `/${key}`,
          "Unexpected release manifest field.",
        ),
      );
    }
  }

  if (!sameJson(merged.manifest_identity, defaultReleaseManifestIdentity)) {
    errors.push(
      error(
        "release_manifest.identity_invalid",
        "/manifest_identity",
        "Release manifest identity must stay BP-0219 source-only after BP-0220.",
      ),
    );
  }

  validateSourceRelease(merged.source_release_ref, errors);
  validateArrayCoverage(
    merged.package_matrix_refs,
    releaseManifestPackageFamilies,
    "package_family",
    "/package_matrix_refs",
    "release_manifest.package_matrix_ref_required",
    errors,
  );
  for (const ref of merged.package_matrix_refs ?? []) {
    if (ref.build_allowed || ref.publish_allowed || ref.install_allowed) {
      errors.push(
        error(
          "release_manifest.package_matrix_ref_invalid",
          "/package_matrix_refs",
          "Release package matrix refs cannot build, publish, or install artifacts.",
        ),
      );
    }
  }

  validateArrayCoverage(
    merged.security_gate_refs,
    releaseManifestSecurityGateKinds,
    "gate_kind",
    "/security_gate_refs",
    "release_manifest.security_gate_ref_required",
    errors,
  );
  for (const ref of merged.security_gate_refs ?? []) {
    if (!ref.required_before_artifact_publish || unsafeText(ref.evidence_ref)) {
      errors.push(
        error(
          "release_manifest.security_gate_ref_invalid",
          "/security_gate_refs",
          "Release security gates must be safe refs required before artifact publish.",
        ),
      );
    }
  }

  validateArrayCoverage(
    merged.factory_clean_refs,
    releaseManifestFactoryCleanKinds,
    "clean_kind",
    "/factory_clean_refs",
    "release_manifest.factory_clean_ref_required",
    errors,
  );
  for (const ref of merged.factory_clean_refs ?? []) {
    if (ref.allowed !== false || unsafeText(ref.assertion_ref)) {
      errors.push(
        error(
          "release_manifest.factory_clean_ref_invalid",
          "/factory_clean_refs",
          "Factory-clean assertions must deny seeded data, credentials, preconnections, tenant assumptions, and pre-onboarding ingestion.",
        ),
      );
    }
  }

  validateArrayCoverage(
    merged.extension_handoff_refs,
    releaseManifestExtensionHandoffKinds,
    "handoff_kind",
    "/extension_handoff_refs",
    "release_manifest.extension_handoff_ref_required",
    errors,
  );
  for (const ref of merged.extension_handoff_refs ?? []) {
    if (
      ref.implementation_allowed ||
      ref.activation_allowed ||
      unsafeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_manifest.extension_handoff_ref_invalid",
          "/extension_handoff_refs",
          "Extension handoff refs must stay source-only without implementation or activation.",
        ),
      );
    }
  }

  validateSourceRefs(merged.source_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_manifest.side_effects_forbidden",
        "/side_effects",
        "Release manifest must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_manifest: {
      contract_id: releaseManifestContract.contract_id,
      manifest_version: releaseManifestContract.manifest_version,
      manifest_identity: merged.manifest_identity ?? defaultReleaseManifestIdentity,
      distribution_client_installer_plan_contract_id:
        distributionClientInstallerPlanContract.contract_id,
      self_deploy_packaging_plan_contract_id:
        selfDeployPackagingPlanContract.contract_id,
      contract_authority: releaseManifestContract.contract_authority,
      source_release_ref:
        merged.source_release_ref ?? defaultReleaseManifestSourceReleaseRef,
      package_matrix_refs:
        merged.package_matrix_refs ?? defaultReleaseManifestPackageMatrixRefs,
      security_gate_refs:
        merged.security_gate_refs ?? defaultReleaseManifestSecurityGateRefs,
      factory_clean_refs:
        merged.factory_clean_refs ?? defaultReleaseManifestFactoryCleanRefs,
      extension_handoff_refs:
        merged.extension_handoff_refs ?? defaultReleaseManifestExtensionHandoffRefs,
      source_refs: merged.source_refs ?? defaultReleaseManifestSourceRefs,
      no_live_posture: merged.no_live_posture ?? defaultReleaseManifestNoLivePosture,
      blocked_capabilities: [...releaseManifestBlockedCapabilityFlags],
      release_artifacts: [],
      binary_artifacts: [],
      published_packages: [],
      installer_executions: [],
      service_installations: [],
      client_enrollments: [],
      mcp_extension_installations: [],
      credential_records: [],
      integration_setup_writes: [],
      seeded_customer_data: [],
      runtime_invocations: [],
      source_canonical_artifact: true,
      factory_clean_release_required: true,
      onboarding_required_before_ingestion: true,
      mcp_extensions_separate: true,
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateSourceRelease(
  ref: ReleaseManifestSourceReleaseRefInput | undefined,
  errors: ReleaseManifestError[],
): void {
  if (!ref) {
    errors.push(
      error(
        "release_manifest.source_release_ref_required",
        "/source_release_ref",
        "Release manifest requires source release refs.",
      ),
    );
    return;
  }
  const requiredLists = [
    ref.license_file_refs,
    ref.config_template_refs,
    ref.source_refs,
  ];
  const requiredText = [
    ref.source_commit_ref,
    ref.version_ref,
    ref.branch_or_tag_ref,
    ref.archive_ref,
    ref.docs_bundle_ref,
  ];
  if (
    ref.artifact_created !== false ||
    requiredText.some((value) => !safeText(value)) ||
    requiredLists.some(
      (list) =>
        !Array.isArray(list) ||
        list.length === 0 ||
        list.some((value) => !safeText(value)),
    )
  ) {
    errors.push(
      error(
        "release_manifest.source_release_ref_invalid",
        "/source_release_ref",
        "Source release refs must be safe refs and cannot create artifacts.",
      ),
    );
  }
}

function validateSourceRefs(
  refs: ReleaseManifestSourceRefInput[] | undefined,
  errors: ReleaseManifestError[],
): void {
  if (!Array.isArray(refs) || refs.length === 0) {
    errors.push(
      error(
        "release_manifest.source_ref_required",
        "/source_refs",
        "Release manifest requires repo-local source refs.",
      ),
    );
    return;
  }
  if (
    !refs.some((ref) => ref.source_ref === "docs/reference/CONTRACT_PROVENANCE.md") ||
    !refs.some(
      (ref) =>
        ref.source_ref ===
        "docs/architecture/DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md",
    )
  ) {
    errors.push(
      error(
        "release_manifest.source_ref_required",
        "/source_refs",
        "Release manifest requires BP-0219 and BP-0220 source refs.",
      ),
    );
  }
  for (const ref of refs) {
    if (!safeText(ref.source_ref) || !safeText(ref.summary)) {
      errors.push(
        error(
          "release_manifest.source_ref_invalid",
          "/source_refs",
          "Release manifest source refs must be safe text.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseManifestRequest,
  errors: ReleaseManifestError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_manifest.no_live_posture_drift",
        "/no_live_posture",
        "Release manifest requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseManifestBlockedCapabilityFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_manifest.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Release manifest no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_manifest.blocked_capability_drift",
          `/${flag}`,
          "Release manifest blocked capability drifted.",
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
  code: ReleaseManifestErrorCode,
  errors: ReleaseManifestError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error(code, path, "Release manifest evidence refs are required."));
    return;
  }
  const seen = new Set(refs.map((ref) => String(ref[key])));
  for (const expectedValue of expected) {
    if (!seen.has(expectedValue)) {
      errors.push(error(code, path, "Release manifest evidence refs are incomplete."));
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
  code: ReleaseManifestErrorCode,
  path: string,
  message: string,
): ReleaseManifestError {
  return { code, path, message };
}
