import { compatibilityConformanceMatrixContract } from "./compatibility-conformance-matrix-contract.js";

export const COMPLIANCE_READINESS_MAP_CONTRACT_STATUS = "source_only";

export const complianceReadinessBlockedFlags = [
  "soc2_audit_allowed",
  "iso_certification_allowed",
  "penetration_test_allowed",
  "legal_review_allowed",
  "vendor_review_allowed",
  "subprocessor_publication_allowed",
  "dpa_publication_allowed",
  "hosted_runtime_allowed",
  "trust_center_publication_allowed",
  "audit_export_execution_allowed",
  "siem_export_execution_allowed",
  "backup_restore_execution_allowed",
  "incident_process_activation_allowed",
  "customer_data_handling_allowed",
  "database_connection_allowed",
  "database_write_allowed",
  "external_service_call_allowed",
  "github_api_mutation_allowed",
  "git_push_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const complianceReadinessRequiredControlFamilies = [
  "access_control",
  "change_management",
  "audit_logging",
  "incident_response",
  "vendor_subprocessor_management",
  "availability_backup_dr",
  "privacy_data_governance",
  "security_operations",
] as const;

export const complianceReadinessRequiredFrameworks = [
  "soc2_security",
  "soc2_availability",
  "soc2_confidentiality",
  "soc2_processing_integrity",
  "soc2_privacy",
  "iso27001_organizational",
  "iso27001_people",
  "iso27001_physical_later",
  "iso27001_technological",
] as const;

export const complianceReadinessRequiredTrustCenterTopics = [
  "security_architecture",
  "compliance_readiness_status",
  "subprocessors",
  "data_processing_privacy",
  "incident_response",
  "uptime_status_posture",
  "backup_restore_dr",
  "support_escalation",
  "audit_export_options",
  "customer_owned_client_boundary",
  "no_raw_secret_storage",
] as const;

export const complianceReadinessMapContract = {
  contract_id: "lnsat.platform.compliance_readiness_map.v0_1",
  extends_contract_id: compatibilityConformanceMatrixContract.contract_id,
  packet_ref: "BP-0239",
  selected_after_packet_ref: "BP-0238",
  contract_authority:
    "source_only_compliance_readiness_map_no_audit_certification_hosted_runtime_or_trust_center_publication",
  source_docs: [
    "docs/architecture/COMPLIANCE_READINESS_MAP.md",
    "docs/architecture/ENTERPRISE_AND_DEVELOPER_TRUST_STANDARDS.md",
    "GOVERNANCE.md",
    "SECURITY.md",
    "SUPPORT.md",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type ComplianceReadinessBlockedFlag =
  (typeof complianceReadinessBlockedFlags)[number];
export type ComplianceReadinessRequiredControlFamily =
  (typeof complianceReadinessRequiredControlFamilies)[number];
export type ComplianceReadinessRequiredFramework =
  (typeof complianceReadinessRequiredFrameworks)[number];
export type ComplianceReadinessRequiredTrustCenterTopic =
  (typeof complianceReadinessRequiredTrustCenterTopics)[number];

export type ComplianceReadinessIdentity = {
  packet_ref: "BP-0239";
  selected_after_packet_ref: "BP-0238";
  readiness_mode: "source_only_planned";
  implementation_allowed: false;
};

export type ComplianceReadinessControlRef = {
  control_family: ComplianceReadinessRequiredControlFamily;
  source_ref: string;
  required: true;
  execution_allowed: false;
};

export type ComplianceReadinessFrameworkRef = {
  framework: ComplianceReadinessRequiredFramework;
  source_ref: string;
  required: true;
  certification_claim_allowed: false;
};

export type ComplianceReadinessTrustCenterRef = {
  trust_topic: ComplianceReadinessRequiredTrustCenterTopic;
  source_ref: string;
  required: true;
  publication_allowed: false;
};

export type ComplianceReadinessSummary = {
  compliance_state: "readiness_map_defined_not_audited";
  soc2_state: "mapped_not_audited";
  iso27001_state: "mapped_not_certified";
  trust_center_state: "planned_not_published";
  hosted_cloud_state: "reserved_not_live";
  customer_data_state: "not_handled";
};

export type ComplianceReadinessNoLivePosture = Record<
  ComplianceReadinessBlockedFlag,
  false
>;

export type ComplianceReadinessRequest = Partial<
  Record<ComplianceReadinessBlockedFlag, false>
> & {
  identity?: ComplianceReadinessIdentity;
  compliance_summary?: ComplianceReadinessSummary;
  control_refs?: ComplianceReadinessControlRef[];
  framework_refs?: ComplianceReadinessFrameworkRef[];
  trust_center_refs?: ComplianceReadinessTrustCenterRef[];
  no_live_posture?: ComplianceReadinessNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ComplianceReadinessErrorCode =
  | "compliance_readiness.identity_invalid"
  | "compliance_readiness.summary_invalid"
  | "compliance_readiness.control_required"
  | "compliance_readiness.control_invalid"
  | "compliance_readiness.framework_required"
  | "compliance_readiness.framework_invalid"
  | "compliance_readiness.trust_center_required"
  | "compliance_readiness.trust_center_invalid"
  | "compliance_readiness.no_live_posture_drift"
  | "compliance_readiness.blocked_capability_drift"
  | "compliance_readiness.unexpected_field"
  | "compliance_readiness.side_effects_forbidden";

export type ComplianceReadinessError = {
  code: ComplianceReadinessErrorCode;
  path: string;
  message: string;
};

export type ComplianceReadinessEvidence = {
  contract_id: typeof complianceReadinessMapContract.contract_id;
  extends_contract_id: typeof compatibilityConformanceMatrixContract.contract_id;
  identity: ComplianceReadinessIdentity;
  compliance_summary: ComplianceReadinessSummary;
  control_refs: ComplianceReadinessControlRef[];
  framework_refs: ComplianceReadinessFrameworkRef[];
  trust_center_refs: ComplianceReadinessTrustCenterRef[];
  no_live_posture: ComplianceReadinessNoLivePosture;
  blocked_capabilities: ComplianceReadinessBlockedFlag[];
  soc2_audits: [];
  iso_certifications: [];
  penetration_tests: [];
  legal_reviews: [];
  vendor_reviews: [];
  subprocessor_publications: [];
  dpa_publications: [];
  hosted_runtimes: [];
  trust_center_publications: [];
  audit_exports: [];
  siem_exports: [];
  backup_restore_executions: [];
  incident_process_activations: [];
  customer_data_handling_events: [];
  database_connections: [];
  database_writes: [];
  external_service_calls: [];
  github_api_mutations: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ComplianceReadinessResult =
  | {
      ok: true;
      compliance_readiness_map: ComplianceReadinessEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ComplianceReadinessError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultComplianceReadinessIdentity: ComplianceReadinessIdentity = {
  packet_ref: "BP-0239",
  selected_after_packet_ref: "BP-0238",
  readiness_mode: "source_only_planned",
  implementation_allowed: false,
};

export const defaultComplianceReadinessSummary: ComplianceReadinessSummary = {
  compliance_state: "readiness_map_defined_not_audited",
  soc2_state: "mapped_not_audited",
  iso27001_state: "mapped_not_certified",
  trust_center_state: "planned_not_published",
  hosted_cloud_state: "reserved_not_live",
  customer_data_state: "not_handled",
};

export const defaultComplianceReadinessControlRefs: ComplianceReadinessControlRef[] =
  complianceReadinessRequiredControlFamilies.map((control_family) => ({
    control_family,
    source_ref: `docs/architecture/COMPLIANCE_READINESS_MAP.md#${control_family}`,
    required: true,
    execution_allowed: false,
  }));

export const defaultComplianceReadinessFrameworkRefs: ComplianceReadinessFrameworkRef[] =
  complianceReadinessRequiredFrameworks.map((framework) => ({
    framework,
    source_ref: `docs/architecture/COMPLIANCE_READINESS_MAP.md#${framework}`,
    required: true,
    certification_claim_allowed: false,
  }));

export const defaultComplianceReadinessTrustCenterRefs: ComplianceReadinessTrustCenterRef[] =
  complianceReadinessRequiredTrustCenterTopics.map((trust_topic) => ({
    trust_topic,
    source_ref: `docs/architecture/COMPLIANCE_READINESS_MAP.md#${trust_topic}`,
    required: true,
    publication_allowed: false,
  }));

export const defaultComplianceReadinessNoLivePosture = Object.fromEntries(
  complianceReadinessBlockedFlags.map((flag) => [flag, false]),
) as ComplianceReadinessNoLivePosture;

export const defaultComplianceReadiness: ComplianceReadinessRequest = {
  identity: defaultComplianceReadinessIdentity,
  compliance_summary: defaultComplianceReadinessSummary,
  control_refs: defaultComplianceReadinessControlRefs,
  framework_refs: defaultComplianceReadinessFrameworkRefs,
  trust_center_refs: defaultComplianceReadinessTrustCenterRefs,
  no_live_posture: defaultComplianceReadinessNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "compliance_summary",
  "control_refs",
  "framework_refs",
  "trust_center_refs",
  "no_live_posture",
  "side_effects",
  ...complianceReadinessBlockedFlags,
]);

const unsafeTextPattern =
  /(raw secret|secret[_ -]?value|token|password|api[_ -]?key|private[_ -]?key|customer data|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |soc2 audit|iso certification|penetration test|legal review|vendor review|publish trust|publish dpa|publish subprocessor|siem export|webhook export|backup restore|incident activation|gh api|github api|git push|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createComplianceReadinessMap(
  request: ComplianceReadinessRequest = {},
): ComplianceReadinessResult {
  const merged = { ...defaultComplianceReadiness, ...request };
  const errors: ComplianceReadinessError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "compliance_readiness.unexpected_field",
          `/${key}`,
          "Unexpected compliance readiness field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultComplianceReadinessIdentity)) {
    errors.push(
      error(
        "compliance_readiness.identity_invalid",
        "/identity",
        "Compliance readiness identity must stay BP-0239 source-only after BP-0238.",
      ),
    );
  }

  if (!sameJson(merged.compliance_summary, defaultComplianceReadinessSummary)) {
    errors.push(
      error(
        "compliance_readiness.summary_invalid",
        "/compliance_summary",
        "Compliance readiness summary must remain mapped, unaudited, uncertified, unpublished, and non-live.",
      ),
    );
  }

  validateControlRefs(merged.control_refs, errors);
  validateFrameworkRefs(merged.framework_refs, errors);
  validateTrustCenterRefs(merged.trust_center_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "compliance_readiness.side_effects_forbidden",
        "/side_effects",
        "Compliance readiness map must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    compliance_readiness_map: {
      contract_id: complianceReadinessMapContract.contract_id,
      extends_contract_id: compatibilityConformanceMatrixContract.contract_id,
      identity: merged.identity ?? defaultComplianceReadinessIdentity,
      compliance_summary:
        merged.compliance_summary ?? defaultComplianceReadinessSummary,
      control_refs: merged.control_refs ?? defaultComplianceReadinessControlRefs,
      framework_refs: merged.framework_refs ?? defaultComplianceReadinessFrameworkRefs,
      trust_center_refs:
        merged.trust_center_refs ?? defaultComplianceReadinessTrustCenterRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultComplianceReadinessNoLivePosture,
      blocked_capabilities: [...complianceReadinessBlockedFlags],
      soc2_audits: [],
      iso_certifications: [],
      penetration_tests: [],
      legal_reviews: [],
      vendor_reviews: [],
      subprocessor_publications: [],
      dpa_publications: [],
      hosted_runtimes: [],
      trust_center_publications: [],
      audit_exports: [],
      siem_exports: [],
      backup_restore_executions: [],
      incident_process_activations: [],
      customer_data_handling_events: [],
      database_connections: [],
      database_writes: [],
      external_service_calls: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateControlRefs(
  refs: ComplianceReadinessControlRef[] | undefined,
  errors: ComplianceReadinessError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "compliance_readiness.control_required",
        "/control_refs",
        "Compliance control refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.control_family));
  for (const controlFamily of complianceReadinessRequiredControlFamilies) {
    if (!seen.has(controlFamily)) {
      errors.push(
        error(
          "compliance_readiness.control_required",
          "/control_refs",
          "Compliance control refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !complianceReadinessRequiredControlFamilies.includes(ref.control_family) ||
      ref.required !== true ||
      ref.execution_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "compliance_readiness.control_invalid",
          "/control_refs",
          "Compliance control refs must be required, safe, and non-executing.",
        ),
      );
    }
  }
}

function validateFrameworkRefs(
  refs: ComplianceReadinessFrameworkRef[] | undefined,
  errors: ComplianceReadinessError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "compliance_readiness.framework_required",
        "/framework_refs",
        "Compliance framework refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.framework));
  for (const framework of complianceReadinessRequiredFrameworks) {
    if (!seen.has(framework)) {
      errors.push(
        error(
          "compliance_readiness.framework_required",
          "/framework_refs",
          "Compliance framework refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !complianceReadinessRequiredFrameworks.includes(ref.framework) ||
      ref.required !== true ||
      ref.certification_claim_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "compliance_readiness.framework_invalid",
          "/framework_refs",
          "Compliance framework refs must be required, safe, and not claim certification.",
        ),
      );
    }
  }
}

function validateTrustCenterRefs(
  refs: ComplianceReadinessTrustCenterRef[] | undefined,
  errors: ComplianceReadinessError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "compliance_readiness.trust_center_required",
        "/trust_center_refs",
        "Trust-center refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.trust_topic));
  for (const trustTopic of complianceReadinessRequiredTrustCenterTopics) {
    if (!seen.has(trustTopic)) {
      errors.push(
        error(
          "compliance_readiness.trust_center_required",
          "/trust_center_refs",
          "Trust-center refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !complianceReadinessRequiredTrustCenterTopics.includes(ref.trust_topic) ||
      ref.required !== true ||
      ref.publication_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "compliance_readiness.trust_center_invalid",
          "/trust_center_refs",
          "Trust-center refs must be required, safe, and not published.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ComplianceReadinessRequest,
  errors: ComplianceReadinessError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "compliance_readiness.no_live_posture_drift",
        "/no_live_posture",
        "Compliance readiness map requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of complianceReadinessBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "compliance_readiness.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Compliance readiness no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "compliance_readiness.blocked_capability_drift",
          `/${flag}`,
          "Compliance readiness blocked capability drifted.",
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
  code: ComplianceReadinessErrorCode,
  path: string,
  message: string,
): ComplianceReadinessError {
  return { code, path, message };
}
