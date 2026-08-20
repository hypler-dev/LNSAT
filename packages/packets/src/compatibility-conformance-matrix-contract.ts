import { openSourceGovernanceScaffoldContract } from "./open-source-governance-scaffold-contract.js";

export const COMPATIBILITY_CONFORMANCE_MATRIX_CONTRACT_STATUS = "source_only";

export const compatibilityConformanceBlockedFlags = [
  "os_test_execution_allowed",
  "browser_automation_allowed",
  "database_connection_allowed",
  "database_write_allowed",
  "auth_provider_call_allowed",
  "package_build_allowed",
  "installer_execution_allowed",
  "container_build_allowed",
  "hosted_runtime_allowed",
  "external_service_call_allowed",
  "release_upload_allowed",
  "github_api_mutation_allowed",
  "git_push_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const compatibilityConformanceRequiredDimensions = [
  "operating_systems",
  "architectures",
  "package_artifact_families",
  "browsers_public_site",
  "databases",
  "auth_providers",
  "deployment_modes",
  "gateway_contracts",
  "module_manifests",
  "mcp_adapters",
  "connector_sdk",
  "support_deprecation",
] as const;

export const compatibilityConformanceRequiredConformanceClasses = [
  "gateway_contract_shape",
  "policy_fail_closed",
  "approval_fail_closed",
  "audit_evidence_preservation",
  "release_manifest_schema",
  "module_manifest_schema",
  "mcp_adapter_boundary",
  "connector_sdk_manifest_boundary",
  "package_install_preflight",
  "rollback_uninstall_preflight",
  "browser_route_rendering",
  "no_secret_no_phone_home",
] as const;

export const compatibilityConformanceMatrixContract = {
  contract_id: "lnsat.platform.compatibility_conformance_matrix.v0_1",
  extends_contract_id: openSourceGovernanceScaffoldContract.contract_id,
  packet_ref: "BP-0238",
  selected_after_packet_ref: "BP-0237",
  contract_authority:
    "source_only_compatibility_conformance_matrix_no_live_tests_or_package_builds",
  source_docs: [
    "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
    "docs/architecture/ENTERPRISE_AND_DEVELOPER_TRUST_STANDARDS.md",
    "GOVERNANCE.md",
    "fixtures/release/source-plan.json",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type CompatibilityConformanceBlockedFlag =
  (typeof compatibilityConformanceBlockedFlags)[number];
export type CompatibilityConformanceRequiredDimension =
  (typeof compatibilityConformanceRequiredDimensions)[number];
export type CompatibilityConformanceRequiredConformanceClass =
  (typeof compatibilityConformanceRequiredConformanceClasses)[number];

export type CompatibilityConformanceIdentity = {
  packet_ref: "BP-0238";
  selected_after_packet_ref: "BP-0237";
  matrix_mode: "source_only_planned";
  implementation_allowed: false;
};

export type CompatibilityConformanceDimensionRef = {
  dimension: CompatibilityConformanceRequiredDimension;
  source_ref: string;
  required: true;
  execution_allowed: false;
};

export type CompatibilityConformanceClassRef = {
  conformance_class: CompatibilityConformanceRequiredConformanceClass;
  source_ref: string;
  required: true;
  execution_allowed: false;
};

export type CompatibilityConformanceSummary = {
  compatibility_state: "matrix_defined_not_verified";
  conformance_state: "test_classes_defined_not_executed";
  public_site_state: "public_requirements_planned";
  hosted_cloud_state: "reserved_not_verified";
  package_artifact_state: "artifact_families_planned_not_built";
  support_state: "support_windows_required_not_claimed";
};

export type CompatibilityConformanceNoLivePosture = Record<
  CompatibilityConformanceBlockedFlag,
  false
>;

export type CompatibilityConformanceRequest = Partial<
  Record<CompatibilityConformanceBlockedFlag, false>
> & {
  identity?: CompatibilityConformanceIdentity;
  compatibility_summary?: CompatibilityConformanceSummary;
  dimension_refs?: CompatibilityConformanceDimensionRef[];
  conformance_refs?: CompatibilityConformanceClassRef[];
  no_live_posture?: CompatibilityConformanceNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type CompatibilityConformanceErrorCode =
  | "compatibility_conformance.identity_invalid"
  | "compatibility_conformance.summary_invalid"
  | "compatibility_conformance.dimension_required"
  | "compatibility_conformance.dimension_invalid"
  | "compatibility_conformance.conformance_required"
  | "compatibility_conformance.conformance_invalid"
  | "compatibility_conformance.no_live_posture_drift"
  | "compatibility_conformance.blocked_capability_drift"
  | "compatibility_conformance.unexpected_field"
  | "compatibility_conformance.side_effects_forbidden";

export type CompatibilityConformanceError = {
  code: CompatibilityConformanceErrorCode;
  path: string;
  message: string;
};

export type CompatibilityConformanceEvidence = {
  contract_id: typeof compatibilityConformanceMatrixContract.contract_id;
  extends_contract_id: typeof openSourceGovernanceScaffoldContract.contract_id;
  identity: CompatibilityConformanceIdentity;
  compatibility_summary: CompatibilityConformanceSummary;
  dimension_refs: CompatibilityConformanceDimensionRef[];
  conformance_refs: CompatibilityConformanceClassRef[];
  no_live_posture: CompatibilityConformanceNoLivePosture;
  blocked_capabilities: CompatibilityConformanceBlockedFlag[];
  os_test_runs: [];
  browser_automation_runs: [];
  database_connections: [];
  database_writes: [];
  auth_provider_calls: [];
  package_builds: [];
  installer_executions: [];
  container_builds: [];
  hosted_runtimes: [];
  external_service_calls: [];
  release_uploads: [];
  github_api_mutations: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type CompatibilityConformanceResult =
  | {
      ok: true;
      compatibility_conformance_matrix: CompatibilityConformanceEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: CompatibilityConformanceError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultCompatibilityConformanceIdentity: CompatibilityConformanceIdentity =
  {
    packet_ref: "BP-0238",
    selected_after_packet_ref: "BP-0237",
    matrix_mode: "source_only_planned",
    implementation_allowed: false,
  };

export const defaultCompatibilityConformanceSummary: CompatibilityConformanceSummary = {
  compatibility_state: "matrix_defined_not_verified",
  conformance_state: "test_classes_defined_not_executed",
  public_site_state: "public_requirements_planned",
  hosted_cloud_state: "reserved_not_verified",
  package_artifact_state: "artifact_families_planned_not_built",
  support_state: "support_windows_required_not_claimed",
};

export const defaultCompatibilityConformanceDimensionRefs: CompatibilityConformanceDimensionRef[] =
  compatibilityConformanceRequiredDimensions.map((dimension) => ({
    dimension,
    source_ref: `docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md#${dimension}`,
    required: true,
    execution_allowed: false,
  }));

export const defaultCompatibilityConformanceClassRefs: CompatibilityConformanceClassRef[] =
  compatibilityConformanceRequiredConformanceClasses.map((conformance_class) => ({
    conformance_class,
    source_ref: `docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md#${conformance_class}`,
    required: true,
    execution_allowed: false,
  }));

export const defaultCompatibilityConformanceNoLivePosture = Object.fromEntries(
  compatibilityConformanceBlockedFlags.map((flag) => [flag, false]),
) as CompatibilityConformanceNoLivePosture;

export const defaultCompatibilityConformance: CompatibilityConformanceRequest = {
  identity: defaultCompatibilityConformanceIdentity,
  compatibility_summary: defaultCompatibilityConformanceSummary,
  dimension_refs: defaultCompatibilityConformanceDimensionRefs,
  conformance_refs: defaultCompatibilityConformanceClassRefs,
  no_live_posture: defaultCompatibilityConformanceNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "compatibility_summary",
  "dimension_refs",
  "conformance_refs",
  "no_live_posture",
  "side_effects",
  ...compatibilityConformanceBlockedFlags,
]);

const unsafeTextPattern =
  /(raw[_ -]?secret|secret[_ -]?value|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |playwright|puppeteer|npm publish|docker build|docker push|docker run|gh api|gh release|github api|git push|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createCompatibilityConformanceMatrix(
  request: CompatibilityConformanceRequest = {},
): CompatibilityConformanceResult {
  const merged = { ...defaultCompatibilityConformance, ...request };
  const errors: CompatibilityConformanceError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "compatibility_conformance.unexpected_field",
          `/${key}`,
          "Unexpected compatibility/conformance matrix field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultCompatibilityConformanceIdentity)) {
    errors.push(
      error(
        "compatibility_conformance.identity_invalid",
        "/identity",
        "Compatibility/conformance matrix identity must stay BP-0238 source-only after BP-0237.",
      ),
    );
  }

  if (!sameJson(merged.compatibility_summary, defaultCompatibilityConformanceSummary)) {
    errors.push(
      error(
        "compatibility_conformance.summary_invalid",
        "/compatibility_summary",
        "Compatibility/conformance summary must remain planned, unverified, and non-executing.",
      ),
    );
  }

  validateDimensionRefs(merged.dimension_refs, errors);
  validateConformanceRefs(merged.conformance_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "compatibility_conformance.side_effects_forbidden",
        "/side_effects",
        "Compatibility/conformance matrix must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    compatibility_conformance_matrix: {
      contract_id: compatibilityConformanceMatrixContract.contract_id,
      extends_contract_id: openSourceGovernanceScaffoldContract.contract_id,
      identity: merged.identity ?? defaultCompatibilityConformanceIdentity,
      compatibility_summary:
        merged.compatibility_summary ?? defaultCompatibilityConformanceSummary,
      dimension_refs:
        merged.dimension_refs ?? defaultCompatibilityConformanceDimensionRefs,
      conformance_refs:
        merged.conformance_refs ?? defaultCompatibilityConformanceClassRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultCompatibilityConformanceNoLivePosture,
      blocked_capabilities: [...compatibilityConformanceBlockedFlags],
      os_test_runs: [],
      browser_automation_runs: [],
      database_connections: [],
      database_writes: [],
      auth_provider_calls: [],
      package_builds: [],
      installer_executions: [],
      container_builds: [],
      hosted_runtimes: [],
      external_service_calls: [],
      release_uploads: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateDimensionRefs(
  refs: CompatibilityConformanceDimensionRef[] | undefined,
  errors: CompatibilityConformanceError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "compatibility_conformance.dimension_required",
        "/dimension_refs",
        "Compatibility dimension refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.dimension));
  for (const dimension of compatibilityConformanceRequiredDimensions) {
    if (!seen.has(dimension)) {
      errors.push(
        error(
          "compatibility_conformance.dimension_required",
          "/dimension_refs",
          "Compatibility dimension refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !compatibilityConformanceRequiredDimensions.includes(ref.dimension) ||
      ref.required !== true ||
      ref.execution_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "compatibility_conformance.dimension_invalid",
          "/dimension_refs",
          "Compatibility dimension refs must be required, safe, and non-executing.",
        ),
      );
    }
  }
}

function validateConformanceRefs(
  refs: CompatibilityConformanceClassRef[] | undefined,
  errors: CompatibilityConformanceError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "compatibility_conformance.conformance_required",
        "/conformance_refs",
        "Conformance class refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.conformance_class));
  for (const conformanceClass of compatibilityConformanceRequiredConformanceClasses) {
    if (!seen.has(conformanceClass)) {
      errors.push(
        error(
          "compatibility_conformance.conformance_required",
          "/conformance_refs",
          "Conformance class refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !compatibilityConformanceRequiredConformanceClasses.includes(
        ref.conformance_class,
      ) ||
      ref.required !== true ||
      ref.execution_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "compatibility_conformance.conformance_invalid",
          "/conformance_refs",
          "Conformance class refs must be required, safe, and non-executing.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: CompatibilityConformanceRequest,
  errors: CompatibilityConformanceError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "compatibility_conformance.no_live_posture_drift",
        "/no_live_posture",
        "Compatibility/conformance matrix requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of compatibilityConformanceBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "compatibility_conformance.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Compatibility/conformance no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "compatibility_conformance.blocked_capability_drift",
          `/${flag}`,
          "Compatibility/conformance blocked capability drifted.",
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
  code: CompatibilityConformanceErrorCode,
  path: string,
  message: string,
): CompatibilityConformanceError {
  return { code, path, message };
}
