import { secureUpdateRevocationPlanContract } from "./secure-update-revocation-plan-contract.js";

export const TRUST_CENTER_IA_CONTRACT_STATUS = "source_only";

export const trustCenterIaBlockedFlags = [
  "trust_center_publication_allowed",
  "hosted_runtime_allowed",
  "cloud_lnsat_route_allowed",
  "subprocessor_publication_allowed",
  "dpa_publication_allowed",
  "status_page_publication_allowed",
  "soc2_audit_claim_allowed",
  "iso_certification_claim_allowed",
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

export const trustCenterIaRequiredSections = [
  "security_architecture",
  "compliance_readiness",
  "release_supply_chain",
  "secure_update_revocation",
  "vulnerability_disclosure",
  "open_source_governance",
  "compatibility_conformance",
  "privacy_data_processing",
  "subprocessors_third_parties",
  "incident_response",
  "uptime_status_posture",
  "backup_restore_dr",
  "audit_export_options",
  "customer_owned_client_boundary",
  "support_escalation",
  "commercial_hosted_boundary",
] as const;

export const trustCenterIaContract = {
  contract_id: "lnsat.platform.trust_center_ia.v0_1",
  extends_contract_id: secureUpdateRevocationPlanContract.contract_id,
  packet_ref: "BP-0241",
  selected_after_packet_ref: "BP-0240",
  contract_authority:
    "source_only_trust_center_ia_contract_no_publication_hosted_runtime_or_compliance_claims",
  source_docs: [
    "docs/architecture/TRUST_CENTER_IA_AND_PUBLIC_PAGE_PLAN.md",
    "docs/architecture/COMPLIANCE_READINESS_MAP.md",
    "docs/architecture/SECURE_UPDATE_AND_REVOCATION_PLAN.md",
    "docs/architecture/ENTERPRISE_AND_DEVELOPER_TRUST_STANDARDS.md",
    "apps/console/src/app/page.tsx",
  ],
  side_effects: [],
  status: "source_only",
  historical_only: true,
  superseded_by_contract_id:
    "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
  deprecated_since_packet_ref: "BP-0882",
  supersede_reason:
    "cloud.lnsat.com trust-site hosting posture is historical reservation evidence only; operational authority moved to BP-0882",
} as const;

export type TrustCenterIaBlockedFlag = (typeof trustCenterIaBlockedFlags)[number];
export type TrustCenterIaRequiredSection =
  (typeof trustCenterIaRequiredSections)[number];

export type TrustCenterIaIdentity = {
  packet_ref: "BP-0241";
  selected_after_packet_ref: "BP-0240";
  route_ref: "/trust";
  publication_mode: "planned_not_published";
  implementation_allowed: false;
};

export type TrustCenterIaSectionRef = {
  section_kind: TrustCenterIaRequiredSection;
  source_ref: string;
  status_label:
    | "source-only planned"
    | "scaffolded"
    | "readiness mapped"
    | "not audited"
    | "not certified"
    | "not published"
    | "hosted runtime not active"
    | "requires later packet";
  publication_allowed: false;
};

export type TrustCenterIaSummary = {
  route_state: "static_preview_planned";
  trust_center_state: "planned_not_published";
  hosted_state: "cloud_lnsat_reserved_not_routed";
  compliance_claim_state: "readiness_only_not_audited_or_certified";
  subprocessor_state: "planned_not_published";
  customer_data_state: "not_handled";
  publication_requires_later_packet: true;
};

export type TrustCenterIaNoLivePosture = Record<TrustCenterIaBlockedFlag, false>;

export type TrustCenterIaRequest = Partial<Record<TrustCenterIaBlockedFlag, false>> & {
  identity?: TrustCenterIaIdentity;
  trust_center_summary?: TrustCenterIaSummary;
  section_refs?: TrustCenterIaSectionRef[];
  no_live_posture?: TrustCenterIaNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type TrustCenterIaErrorCode =
  | "trust_center_ia.identity_invalid"
  | "trust_center_ia.summary_invalid"
  | "trust_center_ia.section_required"
  | "trust_center_ia.section_invalid"
  | "trust_center_ia.no_live_posture_drift"
  | "trust_center_ia.blocked_capability_drift"
  | "trust_center_ia.unexpected_field"
  | "trust_center_ia.side_effects_forbidden";

export type TrustCenterIaError = {
  code: TrustCenterIaErrorCode;
  path: string;
  message: string;
};

export type TrustCenterIaEvidence = {
  contract_id: typeof trustCenterIaContract.contract_id;
  extends_contract_id: typeof secureUpdateRevocationPlanContract.contract_id;
  identity: TrustCenterIaIdentity;
  trust_center_summary: TrustCenterIaSummary;
  section_refs: TrustCenterIaSectionRef[];
  no_live_posture: TrustCenterIaNoLivePosture;
  blocked_capabilities: TrustCenterIaBlockedFlag[];
  trust_center_publications: [];
  hosted_runtimes: [];
  cloud_lnsat_routes: [];
  subprocessor_publications: [];
  dpa_publications: [];
  status_page_publications: [];
  audit_exports: [];
  siem_exports: [];
  backup_restore_executions: [];
  incident_process_activations: [];
  customer_data_events: [];
  database_connections: [];
  database_writes: [];
  external_service_calls: [];
  github_api_mutations: [];
  git_pushes: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type TrustCenterIaResult =
  | {
      ok: true;
      trust_center_ia: TrustCenterIaEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: TrustCenterIaError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultTrustCenterIaIdentity: TrustCenterIaIdentity = {
  packet_ref: "BP-0241",
  selected_after_packet_ref: "BP-0240",
  route_ref: "/trust",
  publication_mode: "planned_not_published",
  implementation_allowed: false,
};

export const defaultTrustCenterIaSummary: TrustCenterIaSummary = {
  route_state: "static_preview_planned",
  trust_center_state: "planned_not_published",
  hosted_state: "cloud_lnsat_reserved_not_routed",
  compliance_claim_state: "readiness_only_not_audited_or_certified",
  subprocessor_state: "planned_not_published",
  customer_data_state: "not_handled",
  publication_requires_later_packet: true,
};

export const defaultTrustCenterIaSectionRefs: TrustCenterIaSectionRef[] =
  trustCenterIaRequiredSections.map((section_kind) => ({
    section_kind,
    source_ref: `docs/architecture/TRUST_CENTER_IA_AND_PUBLIC_PAGE_PLAN.md#${section_kind}`,
    status_label: "source-only planned",
    publication_allowed: false,
  }));

export const defaultTrustCenterIaNoLivePosture = Object.fromEntries(
  trustCenterIaBlockedFlags.map((flag) => [flag, false]),
) as TrustCenterIaNoLivePosture;

export const defaultTrustCenterIa: TrustCenterIaRequest = {
  identity: defaultTrustCenterIaIdentity,
  trust_center_summary: defaultTrustCenterIaSummary,
  section_refs: defaultTrustCenterIaSectionRefs,
  no_live_posture: defaultTrustCenterIaNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "trust_center_summary",
  "section_refs",
  "no_live_posture",
  "side_effects",
  ...trustCenterIaBlockedFlags,
]);

const allowedStatusLabels = new Set(
  defaultTrustCenterIaSectionRefs
    .map((ref) => ref.status_label)
    .concat([
      "scaffolded",
      "readiness mapped",
      "not audited",
      "not certified",
      "not published",
      "hosted runtime not active",
      "requires later packet",
    ]),
);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|cloudflare dns|wrangler pages domain|ssh |scp |soc 2 compliant|iso 27001 certified|production trust center|hosted cloud active|subprocessors published|dpa available|status page live|audit export available|customer data processed|publish trust center|route cloud.lnsat.com)/i;

export function createTrustCenterIa(
  request: TrustCenterIaRequest = {},
): TrustCenterIaResult {
  const merged = { ...defaultTrustCenterIa, ...request };
  const errors: TrustCenterIaError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "trust_center_ia.unexpected_field",
          `/${key}`,
          "Unexpected Trust Center IA field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultTrustCenterIaIdentity)) {
    errors.push(
      error(
        "trust_center_ia.identity_invalid",
        "/identity",
        "Trust Center IA identity must stay BP-0241 source-only after BP-0240.",
      ),
    );
  }

  if (!sameJson(merged.trust_center_summary, defaultTrustCenterIaSummary)) {
    errors.push(
      error(
        "trust_center_ia.summary_invalid",
        "/trust_center_summary",
        "Trust Center IA summary must remain planned, unpublished, not hosted, not audited/certified, and customer-data-free.",
      ),
    );
  }

  validateSectionRefs(merged.section_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "trust_center_ia.side_effects_forbidden",
        "/side_effects",
        "Trust Center IA contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    trust_center_ia: {
      contract_id: trustCenterIaContract.contract_id,
      extends_contract_id: secureUpdateRevocationPlanContract.contract_id,
      identity: merged.identity ?? defaultTrustCenterIaIdentity,
      trust_center_summary: merged.trust_center_summary ?? defaultTrustCenterIaSummary,
      section_refs: merged.section_refs ?? defaultTrustCenterIaSectionRefs,
      no_live_posture: merged.no_live_posture ?? defaultTrustCenterIaNoLivePosture,
      blocked_capabilities: [...trustCenterIaBlockedFlags],
      trust_center_publications: [],
      hosted_runtimes: [],
      cloud_lnsat_routes: [],
      subprocessor_publications: [],
      dpa_publications: [],
      status_page_publications: [],
      audit_exports: [],
      siem_exports: [],
      backup_restore_executions: [],
      incident_process_activations: [],
      customer_data_events: [],
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

function validateSectionRefs(
  refs: TrustCenterIaSectionRef[] | undefined,
  errors: TrustCenterIaError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "trust_center_ia.section_required",
        "/section_refs",
        "Trust Center IA section refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.section_kind));
  for (const section of trustCenterIaRequiredSections) {
    if (!seen.has(section)) {
      errors.push(
        error(
          "trust_center_ia.section_required",
          "/section_refs",
          "Trust Center IA section refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !trustCenterIaRequiredSections.includes(ref.section_kind) ||
      !allowedStatusLabels.has(ref.status_label) ||
      ref.publication_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "trust_center_ia.section_invalid",
          "/section_refs",
          "Trust Center IA refs must be safe, unpublished, and carry allowed status labels.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: TrustCenterIaRequest,
  errors: TrustCenterIaError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "trust_center_ia.no_live_posture_drift",
        "/no_live_posture",
        "Trust Center IA contract requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of trustCenterIaBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "trust_center_ia.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Trust Center IA no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "trust_center_ia.blocked_capability_drift",
          `/${flag}`,
          "Trust Center IA blocked capability drifted.",
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
  code: TrustCenterIaErrorCode,
  path: string,
  message: string,
): TrustCenterIaError {
  return { code, path, message };
}
