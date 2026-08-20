import { enterpriseDeveloperTechnicalStandardsContract } from "./enterprise-developer-technical-standards-maturity.js";

export const ENTERPRISE_DEVELOPER_COMMUNITY_TRUST_STANDARDS_EXPANSION_STATUS =
  "source_only";

export const enterpriseDeveloperCommunityTrustStandardsExpansionCategories = [
  "ai_governance_and_risk",
  "enterprise_assurance_and_procurement",
  "policy_as_code_and_authorization",
  "vulnerability_intelligence_and_response",
  "release_and_update_assurance",
  "runtime_data_and_observability_trust",
  "developer_community_health",
] as const;

export const enterpriseDeveloperCommunityTrustStandardsExpansionStandards = [
  "nist_ai_rmf_mapping",
  "iso_iec_42001_readiness",
  "eu_ai_act_readiness",
  "model_tool_connector_module_cards",
  "high_risk_human_approval_break_glass_evidence",
  "csa_ccm_caiq_mapping",
  "sig_lite_sig_core_response_pack",
  "oscal_control_catalog_export_plan",
  "fedramp_stateramp_posture_map",
  "trust_center_evidence_inventory",
  "opa_rego_policy_packs",
  "cedar_style_relationship_permission_notes",
  "scim_group_role_entitlement_sync",
  "policy_simulation_dry_run_diff_replay",
  "separation_of_duties_checks",
  "vex_status_support",
  "epss_cvss_triage_inputs",
  "cisa_kev_monitoring_plan",
  "ssvc_decision_tree_support",
  "security_advisory_patch_backport_lts_policy",
  "tuf_style_update_metadata",
  "slsa_source_builder_materials_attestation_review",
  "reproducible_build_diff_report",
  "artifact_quarantine_revocation_yanking_disablement",
  "signed_release_manifest_verification",
  "opentelemetry_agent_gateway_policy_events",
  "w3c_trace_context_correlation",
  "data_classification_dlp_hooks",
  "audit_export_schema_retention_redaction_legal_hold",
  "splunk_cim_elastic_ecs_syslog_jsonl_export",
  "openssf_best_practices_badge_readiness",
  "contributor_ladder_maintainer_succession",
  "public_api_lifecycle_policy",
  "conformance_badge_rules",
  "reproducible_local_dev_fixtures_golden_tests",
] as const;

export const enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags = [
  "audit_execution_allowed",
  "certification_claim_allowed",
  "ai_governance_claim_allowed",
  "fedramp_stateramp_claim_allowed",
  "csa_sig_claim_allowed",
  "hosted_runtime_allowed",
  "customer_data_handling_allowed",
  "release_execution_allowed",
  "binary_build_allowed",
  "package_build_allowed",
  "package_publish_allowed",
  "github_release_mutation_allowed",
  "github_settings_mutation_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "dns_cloudflare_mutation_allowed",
  "external_service_call_allowed",
  "secret_value_allowed",
] as const;

export const enterpriseDeveloperCommunityTrustStandardsExpansionContract = {
  contract_id:
    "lnsat.platform.enterprise_developer_community_trust_standards_expansion.v0_1",
  extends_contract_id: enterpriseDeveloperTechnicalStandardsContract.contract_id,
  packet_ref: "BP-0262",
  selected_after_packet_ref: "BP-0261",
  contract_authority:
    "source_only_enterprise_developer_community_trust_standards_expansion_no_claims_or_live_mutation",
  source_docs: [
    "docs/architecture/ENTERPRISE_DEVELOPER_COMMUNITY_TRUST_STANDARDS_EXPANSION.md",
    "docs/architecture/ENTERPRISE_DEVELOPER_TECHNICAL_STANDARDS_MATURITY.md",
    "apps/console/src/app/page.tsx",
    "apps/console/src/app/page.tsx",
  ],
  status: "source_only",
  side_effects: [],
} as const;

export type EnterpriseDeveloperCommunityTrustStandardsExpansionCategory =
  (typeof enterpriseDeveloperCommunityTrustStandardsExpansionCategories)[number];
export type EnterpriseDeveloperCommunityTrustStandardsExpansionStandard =
  (typeof enterpriseDeveloperCommunityTrustStandardsExpansionStandards)[number];
export type EnterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlag =
  (typeof enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags)[number];

export type EnterpriseDeveloperCommunityTrustStandardsExpansionIdentity = {
  packet_ref: "BP-0262";
  selected_after_packet_ref: "BP-0261";
  expansion_mode: "source_only_planned_features";
  implementation_allowed: false;
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionSummary = {
  standards_state: "planned_not_verified";
  public_claim_state: "readiness_only_no_certification_claims";
  trust_center_state: "evidence_inventory_planned_not_published";
  release_state: "release_execution_blocked";
  hosted_cloud_state: "reserved_not_live";
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRef = {
  category: EnterpriseDeveloperCommunityTrustStandardsExpansionCategory;
  source_ref: string;
  required: true;
  status: "planned";
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionStandardRef = {
  standard: EnterpriseDeveloperCommunityTrustStandardsExpansionStandard;
  source_ref: string;
  required: true;
  status: "planned";
  claim_allowed: false;
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture = Record<
  EnterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlag,
  false
>;

export type EnterpriseDeveloperCommunityTrustStandardsExpansionRequest = Partial<
  Record<EnterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlag, false>
> & {
  identity?: EnterpriseDeveloperCommunityTrustStandardsExpansionIdentity;
  standards_summary?: EnterpriseDeveloperCommunityTrustStandardsExpansionSummary;
  category_refs?: EnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRef[];
  standard_refs?: EnterpriseDeveloperCommunityTrustStandardsExpansionStandardRef[];
  no_live_posture?: EnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionErrorCode =
  | "enterprise_developer_community_trust_standards_expansion.identity_invalid"
  | "enterprise_developer_community_trust_standards_expansion.summary_invalid"
  | "enterprise_developer_community_trust_standards_expansion.category_required"
  | "enterprise_developer_community_trust_standards_expansion.category_invalid"
  | "enterprise_developer_community_trust_standards_expansion.standard_required"
  | "enterprise_developer_community_trust_standards_expansion.standard_invalid"
  | "enterprise_developer_community_trust_standards_expansion.no_live_posture_drift"
  | "enterprise_developer_community_trust_standards_expansion.blocked_capability_drift"
  | "enterprise_developer_community_trust_standards_expansion.unexpected_field"
  | "enterprise_developer_community_trust_standards_expansion.side_effects_forbidden";

export type EnterpriseDeveloperCommunityTrustStandardsExpansionError = {
  code: EnterpriseDeveloperCommunityTrustStandardsExpansionErrorCode;
  path: string;
  message: string;
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionEvidence = {
  contract_id: typeof enterpriseDeveloperCommunityTrustStandardsExpansionContract.contract_id;
  extends_contract_id: typeof enterpriseDeveloperTechnicalStandardsContract.contract_id;
  identity: EnterpriseDeveloperCommunityTrustStandardsExpansionIdentity;
  standards_summary: EnterpriseDeveloperCommunityTrustStandardsExpansionSummary;
  category_refs: EnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRef[];
  standard_refs: EnterpriseDeveloperCommunityTrustStandardsExpansionStandardRef[];
  no_live_posture: EnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture;
  blocked_capabilities: EnterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlag[];
  audit_executions: [];
  certification_claims: [];
  hosted_runtimes: [];
  customer_data_events: [];
  release_executions: [];
  package_builds: [];
  github_mutations: [];
  dns_cloudflare_mutations: [];
  external_service_calls: [];
  side_effects: [];
};

export type EnterpriseDeveloperCommunityTrustStandardsExpansionResult =
  | {
      ok: true;
      enterprise_developer_community_trust_standards_expansion: EnterpriseDeveloperCommunityTrustStandardsExpansionEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: EnterpriseDeveloperCommunityTrustStandardsExpansionError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultEnterpriseDeveloperCommunityTrustStandardsExpansionIdentity: EnterpriseDeveloperCommunityTrustStandardsExpansionIdentity =
  {
    packet_ref: "BP-0262",
    selected_after_packet_ref: "BP-0261",
    expansion_mode: "source_only_planned_features",
    implementation_allowed: false,
  };

export const defaultEnterpriseDeveloperCommunityTrustStandardsExpansionSummary: EnterpriseDeveloperCommunityTrustStandardsExpansionSummary =
  {
    standards_state: "planned_not_verified",
    public_claim_state: "readiness_only_no_certification_claims",
    trust_center_state: "evidence_inventory_planned_not_published",
    release_state: "release_execution_blocked",
    hosted_cloud_state: "reserved_not_live",
  };

export const defaultEnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRefs: EnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRef[] =
  enterpriseDeveloperCommunityTrustStandardsExpansionCategories.map((category) => ({
    category,
    source_ref: `docs/architecture/ENTERPRISE_DEVELOPER_COMMUNITY_TRUST_STANDARDS_EXPANSION.md#${category}`,
    required: true,
    status: "planned",
  }));

export const defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs: EnterpriseDeveloperCommunityTrustStandardsExpansionStandardRef[] =
  enterpriseDeveloperCommunityTrustStandardsExpansionStandards.map((standard) => ({
    standard,
    source_ref: `docs/architecture/ENTERPRISE_DEVELOPER_COMMUNITY_TRUST_STANDARDS_EXPANSION.md#${standard}`,
    required: true,
    status: "planned",
    claim_allowed: false,
  }));

export const defaultEnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture =
  Object.fromEntries(
    enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags.map((flag) => [
      flag,
      false,
    ]),
  ) as EnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture;

export const defaultEnterpriseDeveloperCommunityTrustStandardsExpansion: EnterpriseDeveloperCommunityTrustStandardsExpansionRequest =
  {
    identity: defaultEnterpriseDeveloperCommunityTrustStandardsExpansionIdentity,
    standards_summary:
      defaultEnterpriseDeveloperCommunityTrustStandardsExpansionSummary,
    category_refs:
      defaultEnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRefs,
    standard_refs:
      defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs,
    no_live_posture:
      defaultEnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "standards_summary",
  "category_refs",
  "standard_refs",
  "no_live_posture",
  "side_effects",
  ...enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh api|gh release|git push|npm publish|docker push|wrangler|cloudflare dns|ssh |scp |certified|compliant|fedramp authorized|stateramp authorized|iso 42001 certified|eu ai act compliant|hosted cloud active|customer data processed|publish trust center)/i;

export function createEnterpriseDeveloperCommunityTrustStandardsExpansion(
  request: EnterpriseDeveloperCommunityTrustStandardsExpansionRequest = {},
): EnterpriseDeveloperCommunityTrustStandardsExpansionResult {
  const merged: EnterpriseDeveloperCommunityTrustStandardsExpansionRequest = {
    ...defaultEnterpriseDeveloperCommunityTrustStandardsExpansion,
    ...request,
  };
  const errors: EnterpriseDeveloperCommunityTrustStandardsExpansionError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.unexpected_field",
        path: `/${key}`,
        message: "Unexpected trust standards expansion field.",
      });
    }
  }

  if (
    JSON.stringify(merged.identity) !==
    JSON.stringify(defaultEnterpriseDeveloperCommunityTrustStandardsExpansionIdentity)
  ) {
    errors.push({
      code: "enterprise_developer_community_trust_standards_expansion.identity_invalid",
      path: "/identity",
      message: "Trust standards expansion identity must remain BP-0262 source-only.",
    });
  }

  if (
    JSON.stringify(merged.standards_summary) !==
    JSON.stringify(defaultEnterpriseDeveloperCommunityTrustStandardsExpansionSummary)
  ) {
    errors.push({
      code: "enterprise_developer_community_trust_standards_expansion.summary_invalid",
      path: "/standards_summary",
      message: "Trust standards expansion summary must stay planned and unverified.",
    });
  }

  validateCategoryRefs(merged.category_refs, errors);
  validateStandardRefs(merged.standard_refs, errors);
  validateNoLivePosture(merged, errors);

  if (Array.isArray(merged.side_effects) && merged.side_effects.length > 0) {
    errors.push({
      code: "enterprise_developer_community_trust_standards_expansion.side_effects_forbidden",
      path: "/side_effects",
      message: "Trust standards expansion must preserve side_effects: [].",
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
    enterprise_developer_community_trust_standards_expansion: {
      contract_id:
        enterpriseDeveloperCommunityTrustStandardsExpansionContract.contract_id,
      extends_contract_id: enterpriseDeveloperTechnicalStandardsContract.contract_id,
      identity:
        merged.identity ??
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionIdentity,
      standards_summary:
        merged.standards_summary ??
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionSummary,
      category_refs:
        merged.category_refs ??
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRefs,
      standard_refs:
        merged.standard_refs ??
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs,
      no_live_posture:
        merged.no_live_posture ??
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture,
      blocked_capabilities: [
        ...enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags,
      ],
      audit_executions: [],
      certification_claims: [],
      hosted_runtimes: [],
      customer_data_events: [],
      release_executions: [],
      package_builds: [],
      github_mutations: [],
      dns_cloudflare_mutations: [],
      external_service_calls: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateCategoryRefs(
  refs: EnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRef[] | undefined,
  errors: EnterpriseDeveloperCommunityTrustStandardsExpansionError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push({
      code: "enterprise_developer_community_trust_standards_expansion.category_required",
      path: "/category_refs",
      message: "Trust standards expansion category refs are required.",
    });
    return;
  }

  const seen = new Set(refs.map((ref) => ref.category));
  for (const category of enterpriseDeveloperCommunityTrustStandardsExpansionCategories) {
    if (!seen.has(category)) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.category_required",
        path: "/category_refs",
        message: `Missing trust standards expansion category ref: ${category}.`,
      });
    }
  }

  for (const ref of refs) {
    if (
      !enterpriseDeveloperCommunityTrustStandardsExpansionCategories.includes(
        ref.category,
      ) ||
      ref.required !== true ||
      ref.status !== "planned" ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.category_invalid",
        path: "/category_refs",
        message: "Trust standards expansion category ref must stay source-only.",
      });
    }
  }
}

function validateStandardRefs(
  refs: EnterpriseDeveloperCommunityTrustStandardsExpansionStandardRef[] | undefined,
  errors: EnterpriseDeveloperCommunityTrustStandardsExpansionError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push({
      code: "enterprise_developer_community_trust_standards_expansion.standard_required",
      path: "/standard_refs",
      message: "Trust standards expansion standard refs are required.",
    });
    return;
  }

  const seen = new Set(refs.map((ref) => ref.standard));
  for (const standard of enterpriseDeveloperCommunityTrustStandardsExpansionStandards) {
    if (!seen.has(standard)) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.standard_required",
        path: "/standard_refs",
        message: `Missing trust standards expansion standard ref: ${standard}.`,
      });
    }
  }

  for (const ref of refs) {
    if (
      !enterpriseDeveloperCommunityTrustStandardsExpansionStandards.includes(
        ref.standard,
      ) ||
      ref.required !== true ||
      ref.status !== "planned" ||
      ref.claim_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.standard_invalid",
        path: "/standard_refs",
        message: "Trust standards expansion standard ref must stay planned.",
      });
    }
  }
}

function validateNoLivePosture(
  request: EnterpriseDeveloperCommunityTrustStandardsExpansionRequest,
  errors: EnterpriseDeveloperCommunityTrustStandardsExpansionError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push({
      code: "enterprise_developer_community_trust_standards_expansion.no_live_posture_drift",
      path: "/no_live_posture",
      message: "No-live posture is required.",
    });
    return;
  }

  for (const flag of enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.no_live_posture_drift",
        path: `/no_live_posture/${flag}`,
        message: `Trust standards expansion must keep ${flag} false.`,
      });
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push({
        code: "enterprise_developer_community_trust_standards_expansion.blocked_capability_drift",
        path: `/${flag}`,
        message: `Trust standards expansion cannot allow ${flag}.`,
      });
    }
  }
}
