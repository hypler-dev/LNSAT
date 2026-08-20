import { productDomainDistributionCompletionAuditContract } from "./product-domain-distribution-completion-audit.js";

export const ENTERPRISE_DEVELOPER_TECHNICAL_STANDARDS_MATURITY_STATUS = "source_only";

export const enterpriseDeveloperTechnicalStandardsBlockedFlags = [
  "compliance_audit_claim_allowed",
  "certification_claim_allowed",
  "release_execution_allowed",
  "binary_build_allowed",
  "package_build_allowed",
  "package_publish_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_generation_allowed",
  "provenance_generation_allowed",
  "github_settings_mutation_allowed",
  "github_release_mutation_allowed",
  "git_push_allowed",
  "dns_cloudflare_mutation_allowed",
  "hosted_runtime_allowed",
  "customer_data_handling_allowed",
  "auth_provider_wiring_allowed",
  "database_write_allowed",
  "external_service_call_allowed",
  "secret_value_allowed",
] as const;

export const enterpriseDeveloperTechnicalStandardsCategories = [
  "supply_chain_release_integrity",
  "security_engineering",
  "identity_access_tenant_boundaries",
  "audit_observability_evidence_export",
  "api_sdk_module_developer_experience",
  "reliability_operations_enterprise_readiness",
  "privacy_data_commercial_trust",
] as const;

export const enterpriseDeveloperTechnicalStandards = [
  "slsa_level_3_readiness_path",
  "in_toto_provenance",
  "cyclonedx_sbom",
  "spdx_sbom",
  "sigstore_cosign_signing",
  "reproducible_build_recipes",
  "openssf_scorecard",
  "osv_advisory_scanning",
  "license_scanning",
  "signed_tags_branch_protection_codeowners",
  "nist_ssdf_sp_800_218_map",
  "owasp_asvs_api_top_10_review",
  "stride_threat_model",
  "cis_deployment_posture",
  "fips_140_3_friendly_crypto_inventory",
  "vulnerability_disclosure_sla_cve_path",
  "security_regression_suite",
  "oauth_2_1_oidc_pkce_profiles",
  "saml_2_scim_2_readiness",
  "webauthn_mfa_policy_hooks",
  "rbac_abac_approval_classes",
  "tenant_project_environment_substrate_isolation",
  "least_privilege_api_token_scopes",
  "opentelemetry_semantic_conventions",
  "cloudevents_audit_envelope",
  "syslog_rfc_5424_ecs_siem_export",
  "tamper_evident_audit_bundle",
  "retention_legal_hold_deletion_redaction_policy",
  "status_page_incident_slo_evidence_model",
  "openapi_gateway_public_api_specs",
  "json_schema_packet_module_release_audit_contracts",
  "mcp_adapter_conformance_suite",
  "semantic_versioning_api_stability_deprecation",
  "sdk_compatibility_golden_fixtures_badges",
  "docs_versioning_changelog_adr_rfc",
  "module_certification_rules",
  "slo_sla_vocabulary",
  "backup_restore_dr_ha_rpo_rto",
  "air_gapped_install_offline_mirror",
  "upgrade_rollback_uninstall_emergency_tests",
  "support_severity_maintenance_lts_policy",
  "deployment_environment_matrix",
  "gdpr_ccpa_readiness_map",
  "data_inventory_flow_minimization_retention",
  "subprocessor_dpa_residency_plan",
  "no_phone_home_opt_in_telemetry",
  "open_core_commercial_boundary",
  "third_party_notices_dependency_license_report",
] as const;

export const enterpriseDeveloperTechnicalStandardsContract = {
  contract_id: "lnsat.platform.enterprise_developer_technical_standards.v0_1",
  extends_contract_id: productDomainDistributionCompletionAuditContract.contract_id,
  packet_ref: "BP-0250",
  selected_after_packet_ref: "BP-0249",
  contract_authority:
    "source_only_enterprise_developer_technical_standards_no_claims_or_live_mutation",
  source_docs: [
    "docs/architecture/ENTERPRISE_DEVELOPER_TECHNICAL_STANDARDS_MATURITY.md",
    "docs/architecture/ENTERPRISE_AND_DEVELOPER_TRUST_STANDARDS.md",
    "apps/console/src/app/page.tsx",
    "apps/console/src/app/page.tsx",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type EnterpriseDeveloperTechnicalStandardsBlockedFlag =
  (typeof enterpriseDeveloperTechnicalStandardsBlockedFlags)[number];
export type EnterpriseDeveloperTechnicalStandardsCategory =
  (typeof enterpriseDeveloperTechnicalStandardsCategories)[number];
export type EnterpriseDeveloperTechnicalStandard =
  (typeof enterpriseDeveloperTechnicalStandards)[number];

export type EnterpriseDeveloperTechnicalStandardsIdentity = {
  packet_ref: "BP-0250";
  selected_after_packet_ref: "BP-0249";
  standards_mode: "source_only_maturity_backlog";
  implementation_allowed: false;
};

export type EnterpriseDeveloperTechnicalStandardsSummary = {
  standards_state: "planned_not_verified";
  public_claim_state: "readiness_only_no_certification_claims";
  release_state: "release_execution_blocked";
  hosted_cloud_state: "reserved_not_live";
  developer_state: "standards_backlog_visible";
};

export type EnterpriseDeveloperTechnicalStandardsCategoryRef = {
  category: EnterpriseDeveloperTechnicalStandardsCategory;
  source_ref: string;
  required: true;
  status: "planned";
};

export type EnterpriseDeveloperTechnicalStandardRef = {
  standard: EnterpriseDeveloperTechnicalStandard;
  source_ref: string;
  required: true;
  status: "planned";
  claim_allowed: false;
};

export type EnterpriseDeveloperTechnicalStandardsNoLivePosture = Record<
  EnterpriseDeveloperTechnicalStandardsBlockedFlag,
  false
>;

export type EnterpriseDeveloperTechnicalStandardsRequest = Partial<
  Record<EnterpriseDeveloperTechnicalStandardsBlockedFlag, false>
> & {
  identity?: EnterpriseDeveloperTechnicalStandardsIdentity;
  standards_summary?: EnterpriseDeveloperTechnicalStandardsSummary;
  category_refs?: EnterpriseDeveloperTechnicalStandardsCategoryRef[];
  standard_refs?: EnterpriseDeveloperTechnicalStandardRef[];
  no_live_posture?: EnterpriseDeveloperTechnicalStandardsNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type EnterpriseDeveloperTechnicalStandardsErrorCode =
  | "enterprise_developer_technical_standards.identity_invalid"
  | "enterprise_developer_technical_standards.summary_invalid"
  | "enterprise_developer_technical_standards.category_required"
  | "enterprise_developer_technical_standards.category_invalid"
  | "enterprise_developer_technical_standards.standard_required"
  | "enterprise_developer_technical_standards.standard_invalid"
  | "enterprise_developer_technical_standards.no_live_posture_drift"
  | "enterprise_developer_technical_standards.blocked_capability_drift"
  | "enterprise_developer_technical_standards.unexpected_field"
  | "enterprise_developer_technical_standards.side_effects_forbidden";

export type EnterpriseDeveloperTechnicalStandardsError = {
  code: EnterpriseDeveloperTechnicalStandardsErrorCode;
  path: string;
  message: string;
};

export type EnterpriseDeveloperTechnicalStandardsEvidence = {
  contract_id: typeof enterpriseDeveloperTechnicalStandardsContract.contract_id;
  extends_contract_id: typeof productDomainDistributionCompletionAuditContract.contract_id;
  identity: EnterpriseDeveloperTechnicalStandardsIdentity;
  standards_summary: EnterpriseDeveloperTechnicalStandardsSummary;
  category_refs: EnterpriseDeveloperTechnicalStandardsCategoryRef[];
  standard_refs: EnterpriseDeveloperTechnicalStandardRef[];
  no_live_posture: EnterpriseDeveloperTechnicalStandardsNoLivePosture;
  blocked_capabilities: EnterpriseDeveloperTechnicalStandardsBlockedFlag[];
  compliance_audit_claims: [];
  certification_claims: [];
  release_executions: [];
  package_builds: [];
  github_mutations: [];
  dns_cloudflare_mutations: [];
  hosted_runtimes: [];
  customer_data_events: [];
  external_service_calls: [];
  side_effects: [];
};

export type EnterpriseDeveloperTechnicalStandardsResult =
  | {
      ok: true;
      enterprise_developer_technical_standards: EnterpriseDeveloperTechnicalStandardsEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: EnterpriseDeveloperTechnicalStandardsError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultEnterpriseDeveloperTechnicalStandardsIdentity: EnterpriseDeveloperTechnicalStandardsIdentity =
  {
    packet_ref: "BP-0250",
    selected_after_packet_ref: "BP-0249",
    standards_mode: "source_only_maturity_backlog",
    implementation_allowed: false,
  };

export const defaultEnterpriseDeveloperTechnicalStandardsSummary: EnterpriseDeveloperTechnicalStandardsSummary =
  {
    standards_state: "planned_not_verified",
    public_claim_state: "readiness_only_no_certification_claims",
    release_state: "release_execution_blocked",
    hosted_cloud_state: "reserved_not_live",
    developer_state: "standards_backlog_visible",
  };

export const defaultEnterpriseDeveloperTechnicalStandardsCategoryRefs: EnterpriseDeveloperTechnicalStandardsCategoryRef[] =
  enterpriseDeveloperTechnicalStandardsCategories.map((category) => ({
    category,
    source_ref: `docs/architecture/ENTERPRISE_DEVELOPER_TECHNICAL_STANDARDS_MATURITY.md#${category}`,
    required: true,
    status: "planned",
  }));

export const defaultEnterpriseDeveloperTechnicalStandardRefs: EnterpriseDeveloperTechnicalStandardRef[] =
  enterpriseDeveloperTechnicalStandards.map((standard) => ({
    standard,
    source_ref: `docs/architecture/ENTERPRISE_DEVELOPER_TECHNICAL_STANDARDS_MATURITY.md#${standard}`,
    required: true,
    status: "planned",
    claim_allowed: false,
  }));

export const defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture =
  Object.fromEntries(
    enterpriseDeveloperTechnicalStandardsBlockedFlags.map((flag) => [flag, false]),
  ) as EnterpriseDeveloperTechnicalStandardsNoLivePosture;

export const defaultEnterpriseDeveloperTechnicalStandards: EnterpriseDeveloperTechnicalStandardsRequest =
  {
    identity: defaultEnterpriseDeveloperTechnicalStandardsIdentity,
    standards_summary: defaultEnterpriseDeveloperTechnicalStandardsSummary,
    category_refs: defaultEnterpriseDeveloperTechnicalStandardsCategoryRefs,
    standard_refs: defaultEnterpriseDeveloperTechnicalStandardRefs,
    no_live_posture: defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "standards_summary",
  "category_refs",
  "standard_refs",
  "no_live_posture",
  "side_effects",
  ...enterpriseDeveloperTechnicalStandardsBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh api|gh release|git push|npm publish|docker push|wrangler|cloudflare dns|ssh |scp |soc 2 compliant|iso 27001 certified|fips certified|slsa level 3 certified|openssf certified|gdpr compliant|ccpa compliant|hosted cloud active|customer data processed|publish trust center)/i;

export function createEnterpriseDeveloperTechnicalStandards(
  request: EnterpriseDeveloperTechnicalStandardsRequest = {},
): EnterpriseDeveloperTechnicalStandardsResult {
  const merged: EnterpriseDeveloperTechnicalStandardsRequest = {
    ...defaultEnterpriseDeveloperTechnicalStandards,
    ...request,
  };
  const errors: EnterpriseDeveloperTechnicalStandardsError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push({
        code: "enterprise_developer_technical_standards.unexpected_field",
        path: `/${key}`,
        message: "Unexpected standards maturity field.",
      });
    }
  }

  if (
    !sameJson(merged.identity, defaultEnterpriseDeveloperTechnicalStandardsIdentity)
  ) {
    errors.push({
      code: "enterprise_developer_technical_standards.identity_invalid",
      path: "/identity",
      message: "Standards maturity identity must remain BP-0250 source-only.",
    });
  }

  if (
    !sameJson(
      merged.standards_summary,
      defaultEnterpriseDeveloperTechnicalStandardsSummary,
    )
  ) {
    errors.push({
      code: "enterprise_developer_technical_standards.summary_invalid",
      path: "/standards_summary",
      message: "Standards maturity summary must stay planned, unverified, and blocked.",
    });
  }

  validateCategoryRefs(merged.category_refs, errors);
  validateStandardRefs(merged.standard_refs, errors);
  validateNoLivePosture(merged, errors);

  if (Array.isArray(merged.side_effects) && merged.side_effects.length > 0) {
    errors.push({
      code: "enterprise_developer_technical_standards.side_effects_forbidden",
      path: "/side_effects",
      message: "Standards maturity planning must preserve side_effects: [].",
    });
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
    enterprise_developer_technical_standards: {
      contract_id: enterpriseDeveloperTechnicalStandardsContract.contract_id,
      extends_contract_id: productDomainDistributionCompletionAuditContract.contract_id,
      identity: merged.identity ?? defaultEnterpriseDeveloperTechnicalStandardsIdentity,
      standards_summary:
        merged.standards_summary ?? defaultEnterpriseDeveloperTechnicalStandardsSummary,
      category_refs:
        merged.category_refs ??
        defaultEnterpriseDeveloperTechnicalStandardsCategoryRefs,
      standard_refs:
        merged.standard_refs ?? defaultEnterpriseDeveloperTechnicalStandardRefs,
      no_live_posture:
        merged.no_live_posture ??
        defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture,
      blocked_capabilities: [...enterpriseDeveloperTechnicalStandardsBlockedFlags],
      compliance_audit_claims: [],
      certification_claims: [],
      release_executions: [],
      package_builds: [],
      github_mutations: [],
      dns_cloudflare_mutations: [],
      hosted_runtimes: [],
      customer_data_events: [],
      external_service_calls: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateCategoryRefs(
  refs: EnterpriseDeveloperTechnicalStandardsCategoryRef[] | undefined,
  errors: EnterpriseDeveloperTechnicalStandardsError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push({
      code: "enterprise_developer_technical_standards.category_required",
      path: "/category_refs",
      message: "Standards maturity category refs are required.",
    });
    return;
  }

  const seen = new Set(refs.map((ref) => ref.category));
  for (const category of enterpriseDeveloperTechnicalStandardsCategories) {
    if (!seen.has(category)) {
      errors.push({
        code: "enterprise_developer_technical_standards.category_required",
        path: "/category_refs",
        message: `Missing standards maturity category ref: ${category}.`,
      });
    }
  }

  for (const ref of refs) {
    if (
      !enterpriseDeveloperTechnicalStandardsCategories.includes(ref.category) ||
      ref.required !== true ||
      ref.status !== "planned" ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push({
        code: "enterprise_developer_technical_standards.category_invalid",
        path: "/category_refs",
        message: "Standards maturity category ref must stay planned and source-only.",
      });
    }
  }
}

function validateStandardRefs(
  refs: EnterpriseDeveloperTechnicalStandardRef[] | undefined,
  errors: EnterpriseDeveloperTechnicalStandardsError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push({
      code: "enterprise_developer_technical_standards.standard_required",
      path: "/standard_refs",
      message: "Standards maturity standard refs are required.",
    });
    return;
  }

  const seen = new Set(refs.map((ref) => ref.standard));
  for (const standard of enterpriseDeveloperTechnicalStandards) {
    if (!seen.has(standard)) {
      errors.push({
        code: "enterprise_developer_technical_standards.standard_required",
        path: "/standard_refs",
        message: `Missing technical standard ref: ${standard}.`,
      });
    }
  }

  for (const ref of refs) {
    if (
      !enterpriseDeveloperTechnicalStandards.includes(ref.standard) ||
      ref.required !== true ||
      ref.status !== "planned" ||
      ref.claim_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push({
        code: "enterprise_developer_technical_standards.standard_invalid",
        path: "/standard_refs",
        message: "Technical standard refs must stay planned with claims disabled.",
      });
    }
  }
}

function validateNoLivePosture(
  request: EnterpriseDeveloperTechnicalStandardsRequest,
  errors: EnterpriseDeveloperTechnicalStandardsError[],
): void {
  if (
    !sameJson(
      request.no_live_posture,
      defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture,
    )
  ) {
    errors.push({
      code: "enterprise_developer_technical_standards.no_live_posture_drift",
      path: "/no_live_posture",
      message: "Standards maturity no-live posture drifted.",
    });
  }

  for (const flag of enterpriseDeveloperTechnicalStandardsBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push({
        code: "enterprise_developer_technical_standards.blocked_capability_drift",
        path: `/${flag}`,
        message: "Blocked standards maturity capability cannot be enabled.",
      });
    }
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
