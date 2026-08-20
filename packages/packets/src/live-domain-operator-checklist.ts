import { cloudflareLiveApprovalContract } from "./cloudflare-live-approval-packet-contract.js";

export const LIVE_DOMAIN_OPERATOR_CHECKLIST_STATUS = "source_only";

export const liveDomainOperatorPublicChecklistItems = [
  "pages_project_evidence",
  "zone_account_evidence",
  "domain_plan_evidence",
  "certificate_evidence",
  "dns_change_evidence",
  "smoke_evidence",
  "monitoring_evidence",
  "rollback_evidence",
  "explicit_public_site_approval_evidence",
] as const;

export const liveDomainOperatorHostedChecklistItems = [
  "hosted_product_decision",
  "gateway_runtime_evidence",
  "origin_evidence",
  "customer_data_evidence",
  "tunnel_evidence",
  "hosted_rollback_evidence",
  "explicit_hosted_cloud_approval_evidence",
] as const;

export const liveDomainOperatorRoles = [
  "approver",
  "executor",
  "verifier",
  "rollback_owner",
  "evidence_recorder",
] as const;

export const liveDomainOperatorBlockedFlags = [
  "pages_custom_domain_attachment_allowed",
  "dns_record_mutation_allowed",
  "nameserver_mutation_allowed",
  "ssl_certificate_mutation_allowed",
  "caa_record_mutation_allowed",
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

export const liveDomainOperatorChecklistContract = {
  contract_id: "lnsat.platform.live_domain_operator_checklist.v0_1",
  extends_contract_id: cloudflareLiveApprovalContract.contract_id,
  packet_ref: "BP-0251",
  selected_after_packet_ref: "BP-0250",
  contract_authority:
    "source_only_live_domain_operator_checklist_no_dns_pages_tunnel_or_cloudflare_mutation",
  source_docs: [
    "docs/architecture/LIVE_DOMAIN_OPERATOR_CHECKLIST.md",
    "docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md",
    "docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md",
  ],
  status: "source_only",
  side_effects: [],
  historical_only: true,
  superseded_by_contract_id:
    "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
  deprecated_since_packet_ref: "BP-0882",
  supersede_reason:
    "cloud.lnsat.com checklist and operator path are historical reservation evidence only; operational authority moved to BP-0882",
} as const;

export type LiveDomainOperatorPublicChecklistItem =
  (typeof liveDomainOperatorPublicChecklistItems)[number];
export type LiveDomainOperatorHostedChecklistItem =
  (typeof liveDomainOperatorHostedChecklistItems)[number];
export type LiveDomainOperatorRole = (typeof liveDomainOperatorRoles)[number];
export type LiveDomainOperatorBlockedFlag =
  (typeof liveDomainOperatorBlockedFlags)[number];

export type LiveDomainOperatorIdentity = {
  packet_ref: "BP-0251";
  selected_after_packet_ref: "BP-0250";
  public_domain: "lnsat.com";
  /** @deprecated cloud.lnsat.com is historical reservation evidence only; operational authority moved to BP-0882 */
  hosted_domain: "cloud.lnsat.com";
  checklist_state: "operator_checklist_staged_not_approved";
  implementation_allowed: false;
};

export type LiveDomainOperatorState = {
  public_site_state: "checklist_staged_not_approved";
  hosted_cloud_state: "reserved_future_packet_required";
  fallback_url: null;
  public_site_scope: "lnsat_com_only_requires_explicit_dns_cloudflare_approval";
  hosted_cloud_scope: "closed_no_tunnel_or_customer_data";
};

export type LiveDomainOperatorChecklistRef = {
  lane: "public_site" | "hosted_cloud";
  item: LiveDomainOperatorPublicChecklistItem | LiveDomainOperatorHostedChecklistItem;
  source_ref: string;
  required: true;
  approved: false;
  mutation_allowed: false;
};

export type LiveDomainOperatorRoleRef = {
  role: LiveDomainOperatorRole;
  source_ref: string;
  assigned: false;
  required_before_live_window: true;
};

export type LiveDomainOperatorNoLivePosture = Record<
  LiveDomainOperatorBlockedFlag,
  false
>;

export type LiveDomainOperatorChecklistRequest = Partial<
  Record<LiveDomainOperatorBlockedFlag, false>
> & {
  identity?: LiveDomainOperatorIdentity;
  operator_state?: LiveDomainOperatorState;
  checklist_refs?: LiveDomainOperatorChecklistRef[];
  role_refs?: LiveDomainOperatorRoleRef[];
  no_live_posture?: LiveDomainOperatorNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type LiveDomainOperatorChecklistErrorCode =
  | "live_domain_operator_checklist.identity_invalid"
  | "live_domain_operator_checklist.state_invalid"
  | "live_domain_operator_checklist.ref_required"
  | "live_domain_operator_checklist.ref_invalid"
  | "live_domain_operator_checklist.role_required"
  | "live_domain_operator_checklist.role_invalid"
  | "live_domain_operator_checklist.no_live_posture_drift"
  | "live_domain_operator_checklist.blocked_capability_drift"
  | "live_domain_operator_checklist.unexpected_field"
  | "live_domain_operator_checklist.side_effects_forbidden";

export type LiveDomainOperatorChecklistError = {
  code: LiveDomainOperatorChecklistErrorCode;
  path: string;
  message: string;
};

export type LiveDomainOperatorChecklistEvidence = {
  contract_id: typeof liveDomainOperatorChecklistContract.contract_id;
  extends_contract_id: typeof cloudflareLiveApprovalContract.contract_id;
  identity: LiveDomainOperatorIdentity;
  operator_state: LiveDomainOperatorState;
  checklist_refs: LiveDomainOperatorChecklistRef[];
  role_refs: LiveDomainOperatorRoleRef[];
  no_live_posture: LiveDomainOperatorNoLivePosture;
  blocked_capabilities: LiveDomainOperatorBlockedFlag[];
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

export type LiveDomainOperatorChecklistResult =
  | {
      ok: true;
      live_domain_operator_checklist: LiveDomainOperatorChecklistEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: LiveDomainOperatorChecklistError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultLiveDomainOperatorIdentity: LiveDomainOperatorIdentity = {
  packet_ref: "BP-0251",
  selected_after_packet_ref: "BP-0250",
  public_domain: "lnsat.com",
  hosted_domain: "cloud.lnsat.com",
  checklist_state: "operator_checklist_staged_not_approved",
  implementation_allowed: false,
};

export const defaultLiveDomainOperatorState: LiveDomainOperatorState = {
  public_site_state: "checklist_staged_not_approved",
  hosted_cloud_state: "reserved_future_packet_required",
  fallback_url: null,
  public_site_scope: "lnsat_com_only_requires_explicit_dns_cloudflare_approval",
  hosted_cloud_scope: "closed_no_tunnel_or_customer_data",
};

export const defaultLiveDomainOperatorChecklistRefs: LiveDomainOperatorChecklistRef[] =
  [
    ...liveDomainOperatorPublicChecklistItems.map((item) => ({
      lane: "public_site" as const,
      item,
      source_ref: `docs/architecture/LIVE_DOMAIN_OPERATOR_CHECKLIST.md#${item}`,
      required: true as const,
      approved: false as const,
      mutation_allowed: false as const,
    })),
    ...liveDomainOperatorHostedChecklistItems.map((item) => ({
      lane: "hosted_cloud" as const,
      item,
      source_ref: `docs/architecture/LIVE_DOMAIN_OPERATOR_CHECKLIST.md#${item}`,
      required: true as const,
      approved: false as const,
      mutation_allowed: false as const,
    })),
  ];

export const defaultLiveDomainOperatorRoleRefs: LiveDomainOperatorRoleRef[] =
  liveDomainOperatorRoles.map((role) => ({
    role,
    source_ref: `docs/architecture/LIVE_DOMAIN_OPERATOR_CHECKLIST.md#${role}`,
    assigned: false,
    required_before_live_window: true,
  }));

export const defaultLiveDomainOperatorNoLivePosture = Object.fromEntries(
  liveDomainOperatorBlockedFlags.map((flag) => [flag, false]),
) as LiveDomainOperatorNoLivePosture;

export const defaultLiveDomainOperatorChecklist: LiveDomainOperatorChecklistRequest = {
  identity: defaultLiveDomainOperatorIdentity,
  operator_state: defaultLiveDomainOperatorState,
  checklist_refs: defaultLiveDomainOperatorChecklistRefs,
  role_refs: defaultLiveDomainOperatorRoleRefs,
  no_live_posture: defaultLiveDomainOperatorNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "operator_state",
  "checklist_refs",
  "role_refs",
  "no_live_posture",
  "side_effects",
  ...liveDomainOperatorBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|tunnel token|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|wrangler |cloudflare api|cloudflare dns|create dns|change nameserver|attach custom domain|activate domain|issue certificate|cloudflared |route cloud\.lnsat\.com|deploy now|ssh |scp )/i;

export function createLiveDomainOperatorChecklist(
  request: LiveDomainOperatorChecklistRequest = {},
): LiveDomainOperatorChecklistResult {
  const merged = { ...defaultLiveDomainOperatorChecklist, ...request };
  const errors: LiveDomainOperatorChecklistError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(error("live_domain_operator_checklist.unexpected_field", `/${key}`));
    }
  }

  if (!sameJson(merged.identity, defaultLiveDomainOperatorIdentity)) {
    errors.push(error("live_domain_operator_checklist.identity_invalid", "/identity"));
  }

  if (!sameJson(merged.operator_state, defaultLiveDomainOperatorState)) {
    errors.push(
      error("live_domain_operator_checklist.state_invalid", "/operator_state"),
    );
  }

  validateChecklistRefs(merged.checklist_refs, errors);
  validateRoleRefs(merged.role_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error("live_domain_operator_checklist.side_effects_forbidden", "/side_effects"),
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
    live_domain_operator_checklist: {
      contract_id: liveDomainOperatorChecklistContract.contract_id,
      extends_contract_id: cloudflareLiveApprovalContract.contract_id,
      identity: merged.identity ?? defaultLiveDomainOperatorIdentity,
      operator_state: merged.operator_state ?? defaultLiveDomainOperatorState,
      checklist_refs: merged.checklist_refs ?? defaultLiveDomainOperatorChecklistRefs,
      role_refs: merged.role_refs ?? defaultLiveDomainOperatorRoleRefs,
      no_live_posture: merged.no_live_posture ?? defaultLiveDomainOperatorNoLivePosture,
      blocked_capabilities: [...liveDomainOperatorBlockedFlags],
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

function validateChecklistRefs(
  refs: LiveDomainOperatorChecklistRef[] | undefined,
  errors: LiveDomainOperatorChecklistError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error("live_domain_operator_checklist.ref_required", "/checklist_refs"),
    );
    return;
  }

  const seen = new Set(refs.map((ref) => `${ref.lane}:${ref.item}`));
  for (const item of liveDomainOperatorPublicChecklistItems) {
    if (!seen.has(`public_site:${item}`)) {
      errors.push(
        error("live_domain_operator_checklist.ref_required", "/checklist_refs"),
      );
    }
  }
  for (const item of liveDomainOperatorHostedChecklistItems) {
    if (!seen.has(`hosted_cloud:${item}`)) {
      errors.push(
        error("live_domain_operator_checklist.ref_required", "/checklist_refs"),
      );
    }
  }

  for (const ref of refs) {
    const validPublic =
      ref.lane === "public_site" &&
      liveDomainOperatorPublicChecklistItems.includes(
        ref.item as LiveDomainOperatorPublicChecklistItem,
      );
    const validHosted =
      ref.lane === "hosted_cloud" &&
      liveDomainOperatorHostedChecklistItems.includes(
        ref.item as LiveDomainOperatorHostedChecklistItem,
      );
    if (
      (!validPublic && !validHosted) ||
      ref.required !== true ||
      ref.approved !== false ||
      ref.mutation_allowed !== false ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(
        error("live_domain_operator_checklist.ref_invalid", "/checklist_refs"),
      );
    }
  }
}

function validateRoleRefs(
  refs: LiveDomainOperatorRoleRef[] | undefined,
  errors: LiveDomainOperatorChecklistError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(error("live_domain_operator_checklist.role_required", "/role_refs"));
    return;
  }

  const seen = new Set(refs.map((ref) => ref.role));
  for (const role of liveDomainOperatorRoles) {
    if (!seen.has(role)) {
      errors.push(error("live_domain_operator_checklist.role_required", "/role_refs"));
    }
  }

  for (const ref of refs) {
    if (
      !liveDomainOperatorRoles.includes(ref.role) ||
      ref.assigned !== false ||
      ref.required_before_live_window !== true ||
      typeof ref.source_ref !== "string" ||
      ref.source_ref.length === 0 ||
      unsafeTextPattern.test(ref.source_ref)
    ) {
      errors.push(error("live_domain_operator_checklist.role_invalid", "/role_refs"));
    }
  }
}

function validateNoLivePosture(
  request: LiveDomainOperatorChecklistRequest,
  errors: LiveDomainOperatorChecklistError[],
): void {
  if (!sameJson(request.no_live_posture, defaultLiveDomainOperatorNoLivePosture)) {
    errors.push(
      error("live_domain_operator_checklist.no_live_posture_drift", "/no_live_posture"),
    );
  }

  for (const flag of liveDomainOperatorBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error("live_domain_operator_checklist.blocked_capability_drift", `/${flag}`),
      );
    }
  }
}

function error(
  code: LiveDomainOperatorChecklistErrorCode,
  path: string,
): LiveDomainOperatorChecklistError {
  return {
    code,
    path,
    message: "Live domain operator checklist must remain source-only and not approved.",
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
