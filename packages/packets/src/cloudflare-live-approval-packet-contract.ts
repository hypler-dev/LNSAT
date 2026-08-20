import { domainCloudflareRunbookContract } from "./domain-cloudflare-runbook-contract.js";

export const CLOUDFLARE_LIVE_APPROVAL_PACKET_CONTRACT_STATUS = "source_only";

export const cloudflareLiveApprovalPublicSiteRefs = [
  "pages_project_identity",
  "zone_account_ownership",
  "apex_domain_plan",
  "www_policy",
  "ssl_tls_verification",
  "pages_dev_fallback",
  "public_route_smoke",
  "rollback_detach",
  "monitoring_plan",
  "explicit_human_approval_gate",
] as const;

export const cloudflareLiveApprovalHostedCloudRefs = [
  "hosted_product_decision",
  "tunnel_ownership",
  "origin_service_boundary",
  "gateway_auth_runtime_packet",
  "customer_data_boundary",
  "public_hostname_plan",
  "rollback_disablement",
  "explicit_future_approval_gate",
] as const;

export const cloudflareLiveApprovalBlockedFlags = [
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
  "customer_data_handling_allowed",
  "cloudflare_api_mutation_allowed",
  "wrangler_mutation_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "secret_value_allowed",
] as const;

export const cloudflareLiveApprovalContract = {
  contract_id: "lnsat.platform.cloudflare_live_approval_packet.v0_1",
  extends_contract_id: domainCloudflareRunbookContract.contract_id,
  packet_ref: "BP-0244",
  selected_after_packet_ref: "BP-0243",
  contract_authority:
    "source_only_cloudflare_live_approval_packet_no_dns_pages_tunnel_or_cloudflare_mutation",
  source_docs: [
    "docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md",
    "docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md",
    "docs/LOCAL_DEVELOPMENT.md",
  ],
  side_effects: [],
  status: "source_only",
  historical_only: true,
  superseded_by_contract_id:
    "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
  deprecated_since_packet_ref: "BP-0882",
  supersede_reason:
    "cloud.lnsat.com and hosted-domain packet chain are historical-only evidence; operational boundary now lives under BP-0882",
} as const;

export type CloudflareLiveApprovalPublicSiteRef =
  (typeof cloudflareLiveApprovalPublicSiteRefs)[number];
export type CloudflareLiveApprovalHostedCloudRef =
  (typeof cloudflareLiveApprovalHostedCloudRefs)[number];
export type CloudflareLiveApprovalBlockedFlag =
  (typeof cloudflareLiveApprovalBlockedFlags)[number];

export type CloudflareLiveApprovalIdentity = {
  packet_ref: "BP-0244";
  selected_after_packet_ref: "BP-0243";
  public_domain: "lnsat.com";
  /** @deprecated cloud.lnsat.com is historical reservation evidence only; operational authority moved to BP-0882 */
  hosted_domain: "cloud.lnsat.com";
  approval_packet_state: "not_approved";
  implementation_allowed: false;
};

export type CloudflareLiveApprovalState = {
  public_site_approval: "not_approved";
  hosted_cloud_approval: "not_approved";
  public_site_scope_state: "closed_requires_explicit_dns_cloudflare_approval";
  hosted_cloud_scope_state: "closed_requires_future_gateway_auth_runtime_packet";
  current_allowed_output: "source_only_checklist";
};

export type CloudflareLiveApprovalRef = {
  lane: "public_site" | "hosted_cloud";
  ref_kind: CloudflareLiveApprovalPublicSiteRef | CloudflareLiveApprovalHostedCloudRef;
  source_ref: string;
  required: true;
  approved: false;
  mutation_allowed: false;
};

export type CloudflareLiveApprovalNoLivePosture = Record<
  CloudflareLiveApprovalBlockedFlag,
  false
>;

export type CloudflareLiveApprovalRequest = Partial<
  Record<CloudflareLiveApprovalBlockedFlag, false>
> & {
  identity?: CloudflareLiveApprovalIdentity;
  approval_state?: CloudflareLiveApprovalState;
  approval_refs?: CloudflareLiveApprovalRef[];
  no_live_posture?: CloudflareLiveApprovalNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type CloudflareLiveApprovalErrorCode =
  | "cloudflare_live_approval.identity_invalid"
  | "cloudflare_live_approval.state_invalid"
  | "cloudflare_live_approval.ref_required"
  | "cloudflare_live_approval.ref_invalid"
  | "cloudflare_live_approval.no_live_posture_drift"
  | "cloudflare_live_approval.blocked_capability_drift"
  | "cloudflare_live_approval.unexpected_field"
  | "cloudflare_live_approval.side_effects_forbidden";

export type CloudflareLiveApprovalError = {
  code: CloudflareLiveApprovalErrorCode;
  path: string;
  message: string;
};

export type CloudflareLiveApprovalEvidence = {
  contract_id: typeof cloudflareLiveApprovalContract.contract_id;
  extends_contract_id: typeof domainCloudflareRunbookContract.contract_id;
  identity: CloudflareLiveApprovalIdentity;
  approval_state: CloudflareLiveApprovalState;
  approval_refs: CloudflareLiveApprovalRef[];
  no_live_posture: CloudflareLiveApprovalNoLivePosture;
  blocked_capabilities: CloudflareLiveApprovalBlockedFlag[];
  pages_custom_domain_attachments: [];
  dns_record_mutations: [];
  ssl_certificate_mutations: [];
  tunnel_creations: [];
  tunnel_dns_routes: [];
  tunnel_public_hostnames: [];
  cloudflared_service_installs: [];
  cloud_lnsat_routes: [];
  hosted_runtimes: [];
  customer_data_events: [];
  cloudflare_api_mutations: [];
  wrangler_mutations: [];
  external_service_calls: [];
  git_pushes: [];
  deploys: [];
  side_effects: [];
};

export type CloudflareLiveApprovalResult =
  | {
      ok: true;
      cloudflare_live_approval: CloudflareLiveApprovalEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: CloudflareLiveApprovalError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultCloudflareLiveApprovalIdentity: CloudflareLiveApprovalIdentity = {
  packet_ref: "BP-0244",
  selected_after_packet_ref: "BP-0243",
  public_domain: "lnsat.com",
  hosted_domain: "cloud.lnsat.com",
  approval_packet_state: "not_approved",
  implementation_allowed: false,
};

export const defaultCloudflareLiveApprovalState: CloudflareLiveApprovalState = {
  public_site_approval: "not_approved",
  hosted_cloud_approval: "not_approved",
  public_site_scope_state: "closed_requires_explicit_dns_cloudflare_approval",
  hosted_cloud_scope_state: "closed_requires_future_gateway_auth_runtime_packet",
  current_allowed_output: "source_only_checklist",
};

export const defaultCloudflareLiveApprovalRefs: CloudflareLiveApprovalRef[] = [
  ...cloudflareLiveApprovalPublicSiteRefs.map((ref_kind) => ({
    lane: "public_site" as const,
    ref_kind,
    source_ref: `docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md#${ref_kind}`,
    required: true as const,
    approved: false as const,
    mutation_allowed: false as const,
  })),
  ...cloudflareLiveApprovalHostedCloudRefs.map((ref_kind) => ({
    lane: "hosted_cloud" as const,
    ref_kind,
    source_ref: `docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md#${ref_kind}`,
    required: true as const,
    approved: false as const,
    mutation_allowed: false as const,
  })),
];

export const defaultCloudflareLiveApprovalNoLivePosture = Object.fromEntries(
  cloudflareLiveApprovalBlockedFlags.map((flag) => [flag, false]),
) as CloudflareLiveApprovalNoLivePosture;

export const defaultCloudflareLiveApproval: CloudflareLiveApprovalRequest = {
  identity: defaultCloudflareLiveApprovalIdentity,
  approval_state: defaultCloudflareLiveApprovalState,
  approval_refs: defaultCloudflareLiveApprovalRefs,
  no_live_posture: defaultCloudflareLiveApprovalNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "approval_state",
  "approval_refs",
  "no_live_posture",
  "side_effects",
  ...cloudflareLiveApprovalBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|tunnel token|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|wrangler |cloudflare api|cloudflare dns|create dns|change nameserver|attach custom domain|activate domain|issue certificate|cloudflared |route cloud\.lnsat\.com|deploy now|ssh |scp )/i;

export function createCloudflareLiveApproval(
  request: CloudflareLiveApprovalRequest = {},
): CloudflareLiveApprovalResult {
  const merged = { ...defaultCloudflareLiveApproval, ...request };
  const errors: CloudflareLiveApprovalError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "cloudflare_live_approval.unexpected_field",
          `/${key}`,
          "Unexpected Cloudflare approval packet field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultCloudflareLiveApprovalIdentity)) {
    errors.push(
      error(
        "cloudflare_live_approval.identity_invalid",
        "/identity",
        "Cloudflare approval identity must stay BP-0244 source-only after BP-0243.",
      ),
    );
  }

  if (!sameJson(merged.approval_state, defaultCloudflareLiveApprovalState)) {
    errors.push(
      error(
        "cloudflare_live_approval.state_invalid",
        "/approval_state",
        "Cloudflare approval state must remain not approved and source-only.",
      ),
    );
  }

  validateApprovalRefs(merged.approval_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "cloudflare_live_approval.side_effects_forbidden",
        "/side_effects",
        "Cloudflare approval packet must not record side effects.",
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
    cloudflare_live_approval: {
      contract_id: cloudflareLiveApprovalContract.contract_id,
      extends_contract_id: domainCloudflareRunbookContract.contract_id,
      identity: defaultCloudflareLiveApprovalIdentity,
      approval_state: defaultCloudflareLiveApprovalState,
      approval_refs: defaultCloudflareLiveApprovalRefs,
      no_live_posture: defaultCloudflareLiveApprovalNoLivePosture,
      blocked_capabilities: [...cloudflareLiveApprovalBlockedFlags],
      pages_custom_domain_attachments: [],
      dns_record_mutations: [],
      ssl_certificate_mutations: [],
      tunnel_creations: [],
      tunnel_dns_routes: [],
      tunnel_public_hostnames: [],
      cloudflared_service_installs: [],
      cloud_lnsat_routes: [],
      hosted_runtimes: [],
      customer_data_events: [],
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

function validateApprovalRefs(
  refs: CloudflareLiveApprovalRef[] | undefined,
  errors: CloudflareLiveApprovalError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "cloudflare_live_approval.ref_required",
        "/approval_refs",
        "Cloudflare approval refs must be present.",
      ),
    );
    return;
  }

  const publicKinds = new Set(
    refs.filter((ref) => ref.lane === "public_site").map((ref) => ref.ref_kind),
  );
  const hostedKinds = new Set(
    refs.filter((ref) => ref.lane === "hosted_cloud").map((ref) => ref.ref_kind),
  );

  for (const refKind of cloudflareLiveApprovalPublicSiteRefs) {
    if (!publicKinds.has(refKind)) {
      errors.push(
        error(
          "cloudflare_live_approval.ref_required",
          `/approval_refs/public_site/${refKind}`,
          "Missing public-site approval ref.",
        ),
      );
    }
  }

  for (const refKind of cloudflareLiveApprovalHostedCloudRefs) {
    if (!hostedKinds.has(refKind)) {
      errors.push(
        error(
          "cloudflare_live_approval.ref_required",
          `/approval_refs/hosted_cloud/${refKind}`,
          "Missing hosted-cloud approval ref.",
        ),
      );
    }
  }

  refs.forEach((ref, index) => {
    const validPublic =
      ref.lane === "public_site" &&
      cloudflareLiveApprovalPublicSiteRefs.includes(
        ref.ref_kind as CloudflareLiveApprovalPublicSiteRef,
      );
    const validHosted =
      ref.lane === "hosted_cloud" &&
      cloudflareLiveApprovalHostedCloudRefs.includes(
        ref.ref_kind as CloudflareLiveApprovalHostedCloudRef,
      );
    if (
      (!validPublic && !validHosted) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.mutation_allowed !== false ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error(
          "cloudflare_live_approval.ref_invalid",
          `/approval_refs/${index}`,
          "Approval ref must be lane-valid, unapproved, non-mutating, and source-only.",
        ),
      );
    }
  });
}

function validateNoLivePosture(
  request: CloudflareLiveApprovalRequest,
  errors: CloudflareLiveApprovalError[],
): void {
  if (!sameJson(request.no_live_posture, defaultCloudflareLiveApprovalNoLivePosture)) {
    errors.push(
      error(
        "cloudflare_live_approval.no_live_posture_drift",
        "/no_live_posture",
        "No-live posture must keep all Cloudflare live capabilities false.",
      ),
    );
  }

  for (const flag of cloudflareLiveApprovalBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "cloudflare_live_approval.blocked_capability_drift",
          `/${flag}`,
          "Blocked Cloudflare live capability must remain false.",
        ),
      );
    }
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function error(
  code: CloudflareLiveApprovalErrorCode,
  path: string,
  message: string,
): CloudflareLiveApprovalError {
  return { code, path, message };
}
