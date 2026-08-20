import { trustCenterIaContract } from "./trust-center-ia-contract.js";

export const DOMAIN_CLOUDFLARE_RUNBOOK_CONTRACT_STATUS = "source_only";

export const domainCloudflareRunbookBlockedFlags = [
  "pages_custom_domain_attachment_allowed",
  "dns_record_mutation_allowed",
  "nameserver_mutation_allowed",
  "ssl_certificate_mutation_allowed",
  "www_canonical_mutation_allowed",
  "tunnel_create_allowed",
  "tunnel_route_dns_allowed",
  "tunnel_public_hostname_allowed",
  "cloudflared_service_install_allowed",
  "cloud_lnsat_route_allowed",
  "hosted_runtime_allowed",
  "gateway_auth_runtime_allowed",
  "cloudflare_api_mutation_allowed",
  "wrangler_mutation_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "secret_value_allowed",
] as const;

export const domainCloudflareRunbookRequiredRefs = [
  "cloudflare_pages_project",
  "pages_custom_domain",
  "apex_dns_plan",
  "www_canonical_plan",
  "ssl_tls_verification",
  "pages_dev_fallback",
  "public_route_smoke",
  "cloud_hostname_reservation",
  "tunnel_public_hostname_plan",
  "tunnel_service_origin_plan",
  "gateway_auth_runtime_boundary",
  "customer_data_boundary",
  "rollback_detach_plan",
  "observability_health_plan",
  "approval_gate",
  "cloudflare_docs",
] as const;

export const domainCloudflareRunbookContract = {
  contract_id: "lnsat.platform.domain_cloudflare_runbook.v0_1",
  extends_contract_id: trustCenterIaContract.contract_id,
  packet_ref: "BP-0243",
  selected_after_packet_ref: "BP-0242",
  contract_authority:
    "source_only_domain_cloudflare_runbook_no_dns_pages_tunnel_or_cloudflare_mutation",
  source_docs: [
    "docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md",
    "docs/LOCAL_DEVELOPMENT.md",
    "docs/architecture/FRONTEND_PLATFORM_SOURCE_DISTRIBUTION_PLAN.md",
    "https://developers.cloudflare.com/pages/configuration/custom-domains/",
    "https://developers.cloudflare.com/tunnel/routing/",
  ],
  side_effects: [],
  status: "source_only",
  historical_only: true,
  superseded_by_contract_id:
    "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
  deprecated_since_packet_ref: "BP-0882",
  supersede_reason:
    "cloud.lnsat.com is historical reservation evidence only; operational authority moved to BP-0882",
} as const;

export type DomainCloudflareRunbookBlockedFlag =
  (typeof domainCloudflareRunbookBlockedFlags)[number];
export type DomainCloudflareRunbookRequiredRef =
  (typeof domainCloudflareRunbookRequiredRefs)[number];

export type DomainCloudflareRunbookIdentity = {
  packet_ref: "BP-0243";
  selected_after_packet_ref: "BP-0242";
  public_domain: "lnsat.com";
  /** @deprecated cloud.lnsat.com is historical reservation evidence only; operational authority moved to BP-0882 */
  hosted_domain: "cloud.lnsat.com";
  runbook_mode: "planned_not_executed";
  implementation_allowed: false;
};

export type DomainCloudflareRunbookRef = {
  ref_kind: DomainCloudflareRunbookRequiredRef;
  source_ref: string;
  required: true;
  mutation_allowed: false;
};

export type DomainCloudflareRunbookSummary = {
  pages_state: "lnsat_pages_dev_active_custom_domain_not_attached";
  public_domain_state: "lnsat_com_planned_not_attached";
  hosted_domain_state: "cloud_lnsat_reserved_not_routed";
  tunnel_state: "planned_not_created";
  dns_state: "planned_not_mutated";
  ssl_state: "planned_not_verified";
  live_scope_state: "closed_requires_explicit_approval";
};

export type DomainCloudflareRunbookNoLivePosture = Record<
  DomainCloudflareRunbookBlockedFlag,
  false
>;

export type DomainCloudflareRunbookRequest = Partial<
  Record<DomainCloudflareRunbookBlockedFlag, false>
> & {
  identity?: DomainCloudflareRunbookIdentity;
  runbook_summary?: DomainCloudflareRunbookSummary;
  runbook_refs?: DomainCloudflareRunbookRef[];
  no_live_posture?: DomainCloudflareRunbookNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type DomainCloudflareRunbookErrorCode =
  | "domain_cloudflare_runbook.identity_invalid"
  | "domain_cloudflare_runbook.summary_invalid"
  | "domain_cloudflare_runbook.ref_required"
  | "domain_cloudflare_runbook.ref_invalid"
  | "domain_cloudflare_runbook.no_live_posture_drift"
  | "domain_cloudflare_runbook.blocked_capability_drift"
  | "domain_cloudflare_runbook.unexpected_field"
  | "domain_cloudflare_runbook.side_effects_forbidden";

export type DomainCloudflareRunbookError = {
  code: DomainCloudflareRunbookErrorCode;
  path: string;
  message: string;
};

export type DomainCloudflareRunbookEvidence = {
  contract_id: typeof domainCloudflareRunbookContract.contract_id;
  extends_contract_id: typeof trustCenterIaContract.contract_id;
  identity: DomainCloudflareRunbookIdentity;
  runbook_summary: DomainCloudflareRunbookSummary;
  runbook_refs: DomainCloudflareRunbookRef[];
  no_live_posture: DomainCloudflareRunbookNoLivePosture;
  blocked_capabilities: DomainCloudflareRunbookBlockedFlag[];
  pages_custom_domain_attachments: [];
  dns_record_mutations: [];
  ssl_certificate_mutations: [];
  tunnel_creations: [];
  tunnel_dns_routes: [];
  tunnel_public_hostnames: [];
  cloudflared_service_installs: [];
  cloud_lnsat_routes: [];
  hosted_runtimes: [];
  cloudflare_api_mutations: [];
  wrangler_mutations: [];
  external_service_calls: [];
  git_pushes: [];
  deploys: [];
  side_effects: [];
};

export type DomainCloudflareRunbookResult =
  | {
      ok: true;
      domain_cloudflare_runbook: DomainCloudflareRunbookEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: DomainCloudflareRunbookError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultDomainCloudflareRunbookIdentity: DomainCloudflareRunbookIdentity = {
  packet_ref: "BP-0243",
  selected_after_packet_ref: "BP-0242",
  public_domain: "lnsat.com",
  hosted_domain: "cloud.lnsat.com",
  runbook_mode: "planned_not_executed",
  implementation_allowed: false,
};

export const defaultDomainCloudflareRunbookSummary: DomainCloudflareRunbookSummary = {
  pages_state: "lnsat_pages_dev_active_custom_domain_not_attached",
  public_domain_state: "lnsat_com_planned_not_attached",
  hosted_domain_state: "cloud_lnsat_reserved_not_routed",
  tunnel_state: "planned_not_created",
  dns_state: "planned_not_mutated",
  ssl_state: "planned_not_verified",
  live_scope_state: "closed_requires_explicit_approval",
};

export const defaultDomainCloudflareRunbookRefs: DomainCloudflareRunbookRef[] =
  domainCloudflareRunbookRequiredRefs.map((ref_kind) => ({
    ref_kind,
    source_ref: `docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md#${ref_kind}`,
    required: true,
    mutation_allowed: false,
  }));

export const defaultDomainCloudflareRunbookNoLivePosture = Object.fromEntries(
  domainCloudflareRunbookBlockedFlags.map((flag) => [flag, false]),
) as DomainCloudflareRunbookNoLivePosture;

export const defaultDomainCloudflareRunbook: DomainCloudflareRunbookRequest = {
  identity: defaultDomainCloudflareRunbookIdentity,
  runbook_summary: defaultDomainCloudflareRunbookSummary,
  runbook_refs: defaultDomainCloudflareRunbookRefs,
  no_live_posture: defaultDomainCloudflareRunbookNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "runbook_summary",
  "runbook_refs",
  "no_live_posture",
  "side_effects",
  ...domainCloudflareRunbookBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|tunnel token|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|wrangler pages domain|wrangler deploy|cloudflare api|cloudflare dns|create dns|change nameserver|attach custom domain|activate domain|issue certificate|cloudflared tunnel create|cloudflared tunnel route dns|cloudflared service install|run cloudflared|route cloud\.lnsat\.com|deploy now|ssh |scp )/i;

export function createDomainCloudflareRunbook(
  request: DomainCloudflareRunbookRequest = {},
): DomainCloudflareRunbookResult {
  const merged = { ...defaultDomainCloudflareRunbook, ...request };
  const errors: DomainCloudflareRunbookError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "domain_cloudflare_runbook.unexpected_field",
          `/${key}`,
          "Unexpected domain/Cloudflare runbook field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultDomainCloudflareRunbookIdentity)) {
    errors.push(
      error(
        "domain_cloudflare_runbook.identity_invalid",
        "/identity",
        "Domain/Cloudflare runbook identity must stay BP-0243 source-only after BP-0242.",
      ),
    );
  }

  if (!sameJson(merged.runbook_summary, defaultDomainCloudflareRunbookSummary)) {
    errors.push(
      error(
        "domain_cloudflare_runbook.summary_invalid",
        "/runbook_summary",
        "Domain/Cloudflare summary must remain planned, unattached, unrouted, unmutated, and approval-gated.",
      ),
    );
  }

  validateRunbookRefs(merged.runbook_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "domain_cloudflare_runbook.side_effects_forbidden",
        "/side_effects",
        "Domain/Cloudflare runbook contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    domain_cloudflare_runbook: {
      contract_id: domainCloudflareRunbookContract.contract_id,
      extends_contract_id: trustCenterIaContract.contract_id,
      identity: merged.identity ?? defaultDomainCloudflareRunbookIdentity,
      runbook_summary: merged.runbook_summary ?? defaultDomainCloudflareRunbookSummary,
      runbook_refs: merged.runbook_refs ?? defaultDomainCloudflareRunbookRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultDomainCloudflareRunbookNoLivePosture,
      blocked_capabilities: [...domainCloudflareRunbookBlockedFlags],
      pages_custom_domain_attachments: [],
      dns_record_mutations: [],
      ssl_certificate_mutations: [],
      tunnel_creations: [],
      tunnel_dns_routes: [],
      tunnel_public_hostnames: [],
      cloudflared_service_installs: [],
      cloud_lnsat_routes: [],
      hosted_runtimes: [],
      cloudflare_api_mutations: [],
      wrangler_mutations: [],
      external_service_calls: [],
      git_pushes: [],
      deploys: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateRunbookRefs(
  refs: DomainCloudflareRunbookRef[] | undefined,
  errors: DomainCloudflareRunbookError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "domain_cloudflare_runbook.ref_required",
        "/runbook_refs",
        "Domain/Cloudflare runbook refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.ref_kind));
  for (const refKind of domainCloudflareRunbookRequiredRefs) {
    if (!seen.has(refKind)) {
      errors.push(
        error(
          "domain_cloudflare_runbook.ref_required",
          "/runbook_refs",
          "Domain/Cloudflare runbook refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !domainCloudflareRunbookRequiredRefs.includes(ref.ref_kind) ||
      ref.required !== true ||
      ref.mutation_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "domain_cloudflare_runbook.ref_invalid",
          "/runbook_refs",
          "Domain/Cloudflare runbook refs must be required, safe, and non-mutating.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: DomainCloudflareRunbookRequest,
  errors: DomainCloudflareRunbookError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "domain_cloudflare_runbook.no_live_posture_drift",
        "/no_live_posture",
        "Domain/Cloudflare runbook contract requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of domainCloudflareRunbookBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "domain_cloudflare_runbook.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Domain/Cloudflare runbook no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "domain_cloudflare_runbook.blocked_capability_drift",
          `/${flag}`,
          "Domain/Cloudflare runbook blocked capability drifted.",
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
  code: DomainCloudflareRunbookErrorCode,
  path: string,
  message: string,
): DomainCloudflareRunbookError {
  return { code, path, message };
}
