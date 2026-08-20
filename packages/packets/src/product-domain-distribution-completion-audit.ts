export const PRODUCT_DOMAIN_DISTRIBUTION_COMPLETION_AUDIT_STATUS = "source_only";

export const productDomainDistributionAuditRequirements = [
  "public_product_frontend_lnsat_com",
  "cloudflare_pages_public_domain_plan",
  "hosted_cloud_lnsat_tunnel_plan",
  "public_domain_readiness_ui",
  "download_latest_version_routes",
  "github_release_source_tarball_binary_pointer_plan",
  "release_trust_evidence_standards",
  "enterprise_developer_trust_standards",
  "open_source_project_trust_rails",
  "commercial_maintenance_rails",
] as const;

export const productDomainDistributionAuditBlockedFlags = [
  "pages_custom_domain_attachment_allowed",
  "dns_record_mutation_allowed",
  "nameserver_mutation_allowed",
  "ssl_certificate_mutation_allowed",
  "www_canonical_mutation_allowed",
  "tunnel_create_allowed",
  "tunnel_route_dns_allowed",
  "cloud_lnsat_route_allowed",
  "hosted_runtime_allowed",
  "gateway_auth_runtime_allowed",
  "customer_data_handling_allowed",
  "binary_build_allowed",
  "package_publish_allowed",
  "checksum_generation_allowed",
  "signing_execution_allowed",
  "sbom_provenance_generation_allowed",
  "github_release_creation_allowed",
  "release_upload_allowed",
  "stable_latest_pointer_mutation_allowed",
  "external_service_call_allowed",
  "git_push_allowed",
  "deploy_allowed",
  "secret_value_allowed",
] as const;

export const productDomainDistributionCompletionAuditContract = {
  contract_id: "lnsat.product_domain_distribution_completion_audit.v0_1",
  packet_ref: "BP-0247",
  selected_after_packet_ref: "BP-0246",
  contract_authority:
    "source_only_completion_audit_no_dns_cloudflare_release_hosted_or_git_mutation",
  source_docs: [
    "docs/architecture/PRODUCT_DOMAIN_DISTRIBUTION_COMPLETION_AUDIT.md",
    "docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md",
    "docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md",
    "docs/architecture/DOWNLOAD_RELEASE_HUB.md",
    "docs/architecture/FRONTEND_PLATFORM_SOURCE_DISTRIBUTION_PLAN.md",
  ],
  side_effects: [],
  status: "source_only",
  historical_only: true,
  superseded_by_contract_id:
    "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
  deprecated_since_packet_ref: "BP-0882",
  supersede_reason:
    "cloud.lnsat.com completion audit is historical reservation evidence only; operational authority moved to BP-0882",
} as const;

export type ProductDomainDistributionAuditRequirement =
  (typeof productDomainDistributionAuditRequirements)[number];
export type ProductDomainDistributionAuditBlockedFlag =
  (typeof productDomainDistributionAuditBlockedFlags)[number];

export type ProductDomainDistributionAuditIdentity = {
  packet_ref: "BP-0247";
  selected_after_packet_ref: "BP-0246";
  objective_state: "source_staged_not_live";
  public_domain: "lnsat.com";
  /** @deprecated cloud.lnsat.com is historical reservation evidence only; operational authority moved to BP-0882 */
  hosted_domain: "cloud.lnsat.com";
  live_completion_claim_allowed: false;
};

export type ProductDomainDistributionAuditRequirementRef = {
  requirement: ProductDomainDistributionAuditRequirement;
  evidence_refs: string[];
  state:
    | "source_staged_live_blocked"
    | "source_staged_runtime_blocked"
    | "source_staged_release_execution_blocked"
    | "source_staged_public_ui_tested";
  live_mutation_allowed: false;
};

export type ProductDomainDistributionAuditNoLivePosture = Record<
  ProductDomainDistributionAuditBlockedFlag,
  false
>;

export type ProductDomainDistributionAuditRequest = Partial<
  Record<ProductDomainDistributionAuditBlockedFlag, false>
> & {
  identity?: ProductDomainDistributionAuditIdentity;
  requirement_refs?: ProductDomainDistributionAuditRequirementRef[];
  no_live_posture?: ProductDomainDistributionAuditNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ProductDomainDistributionAuditErrorCode =
  | "product_domain_distribution_audit.identity_invalid"
  | "product_domain_distribution_audit.requirement_ref_required"
  | "product_domain_distribution_audit.requirement_ref_invalid"
  | "product_domain_distribution_audit.no_live_posture_drift"
  | "product_domain_distribution_audit.blocked_capability_drift"
  | "product_domain_distribution_audit.unexpected_field"
  | "product_domain_distribution_audit.side_effects_forbidden";

export type ProductDomainDistributionAuditError = {
  code: ProductDomainDistributionAuditErrorCode;
  path: string;
  message: string;
};

export type ProductDomainDistributionAuditEvidence = {
  contract_id: typeof productDomainDistributionCompletionAuditContract.contract_id;
  identity: ProductDomainDistributionAuditIdentity;
  requirement_refs: ProductDomainDistributionAuditRequirementRef[];
  no_live_posture: ProductDomainDistributionAuditNoLivePosture;
  blocked_capabilities: ProductDomainDistributionAuditBlockedFlag[];
  pages_custom_domain_attachments: [];
  dns_record_mutations: [];
  ssl_certificate_mutations: [];
  tunnel_creations: [];
  cloud_lnsat_routes: [];
  hosted_runtimes: [];
  customer_data_events: [];
  binary_builds: [];
  package_publishes: [];
  github_release_creations: [];
  release_uploads: [];
  git_pushes: [];
  deploys: [];
  side_effects: [];
};

export type ProductDomainDistributionAuditResult =
  | {
      ok: true;
      product_domain_distribution_audit: ProductDomainDistributionAuditEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ProductDomainDistributionAuditError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultProductDomainDistributionAuditIdentity: ProductDomainDistributionAuditIdentity =
  {
    packet_ref: "BP-0247",
    selected_after_packet_ref: "BP-0246",
    objective_state: "source_staged_not_live",
    public_domain: "lnsat.com",
    hosted_domain: "cloud.lnsat.com",
    live_completion_claim_allowed: false,
  };

export const defaultProductDomainDistributionAuditRequirementRefs: ProductDomainDistributionAuditRequirementRef[] =
  [
    {
      requirement: "public_product_frontend_lnsat_com",
      evidence_refs: [
        "docs/architecture/FRONTEND_PLATFORM_SOURCE_DISTRIBUTION_PLAN.md",
        "docs/LOCAL_DEVELOPMENT.md",
        "apps/console/src/app/page.tsx",
      ],
      state: "source_staged_live_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "cloudflare_pages_public_domain_plan",
      evidence_refs: [
        "docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md",
        "docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md",
      ],
      state: "source_staged_live_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "hosted_cloud_lnsat_tunnel_plan",
      evidence_refs: [
        "docs/architecture/DOMAIN_ATTACHMENT_AND_CLOUDFLARE_TUNNEL_RUNBOOK.md",
        "docs/architecture/CLOUDFLARE_LIVE_APPROVAL_PACKET.md",
        "apps/console/src/app/page.tsx",
      ],
      state: "source_staged_runtime_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "public_domain_readiness_ui",
      evidence_refs: [
        "docs/architecture/PRODUCT_DOMAIN_DISTRIBUTION_COMPLETION_AUDIT.md",
        "docs/architecture/SELF_CONTAINED_INSTALLATION_AND_ADAPTIVE_SETUP.md",
      ],
      state: "source_staged_public_ui_tested",
      live_mutation_allowed: false,
    },
    {
      requirement: "download_latest_version_routes",
      evidence_refs: [
        "docs/architecture/DOWNLOAD_RELEASE_HUB.md",
        "apps/console/src/app/page.tsx",
        "apps/console/src/app/page.tsx",
        "apps/console/src/app/page.tsx",
      ],
      state: "source_staged_release_execution_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "github_release_source_tarball_binary_pointer_plan",
      evidence_refs: [
        "fixtures/release/source-plan.json",
        "README.md",
        "README.md",
        "README.md",
        "packages/packets/src/release-github-workflow-contract.ts",
        "packages/packets/src/release-stable-promotion-pointer-contract.ts",
      ],
      state: "source_staged_release_execution_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "release_trust_evidence_standards",
      evidence_refs: [
        "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
        "packages/packets/src/release-manifest-schema-expansion.ts",
        "packages/packets/src/release-checksum-source-verification.ts",
        "packages/packets/src/release-sbom-provenance-dry-run.ts",
        "packages/packets/src/release-signing-revocation-contract.ts",
      ],
      state: "source_staged_release_execution_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "enterprise_developer_trust_standards",
      evidence_refs: [
        "docs/architecture/ENTERPRISE_AND_DEVELOPER_TRUST_STANDARDS.md",
        "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
        "docs/architecture/COMPLIANCE_READINESS_MAP.md",
        "docs/architecture/SECURE_UPDATE_AND_REVOCATION_PLAN.md",
        "docs/architecture/TRUST_CENTER_IA_AND_PUBLIC_PAGE_PLAN.md",
      ],
      state: "source_staged_release_execution_blocked",
      live_mutation_allowed: false,
    },
    {
      requirement: "open_source_project_trust_rails",
      evidence_refs: [
        "SECURITY.md",
        "CONTRIBUTING.md",
        "CODE_OF_CONDUCT.md",
        "GOVERNANCE.md",
        "MAINTAINERS.md",
        "SUPPORT.md",
        "docs/community/OPEN_SOURCE_GOVERNANCE.md",
      ],
      state: "source_staged_public_ui_tested",
      live_mutation_allowed: false,
    },
    {
      requirement: "commercial_maintenance_rails",
      evidence_refs: [
        "GOVERNANCE.md",
        "apps/console/src/app/page.tsx",
        "apps/console/src/app/page.tsx",
        "apps/console/src/app/page.tsx",
      ],
      state: "source_staged_runtime_blocked",
      live_mutation_allowed: false,
    },
  ];

export const defaultProductDomainDistributionAuditNoLivePosture = Object.fromEntries(
  productDomainDistributionAuditBlockedFlags.map((flag) => [flag, false]),
) as ProductDomainDistributionAuditNoLivePosture;

export const defaultProductDomainDistributionAudit: ProductDomainDistributionAuditRequest =
  {
    identity: defaultProductDomainDistributionAuditIdentity,
    requirement_refs: defaultProductDomainDistributionAuditRequirementRefs,
    no_live_posture: defaultProductDomainDistributionAuditNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "requirement_refs",
  "no_live_posture",
  "side_effects",
  ...productDomainDistributionAuditBlockedFlags,
]);

const unsafeTextPattern =
  /(secret value|token|password|api[_ -]?key|private[_ -]?key|cert\.pem|tunnel token|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|git push|wrangler |cloudflare api|cloudflare dns|create dns|change nameserver|attach custom domain|activate domain|issue certificate|cloudflared |route cloud\.lnsat\.com|deploy now|ssh |scp |npm publish|docker push|cosign sign|syft |slsa )/i;

export function createProductDomainDistributionAudit(
  request: ProductDomainDistributionAuditRequest = {},
): ProductDomainDistributionAuditResult {
  const merged = { ...defaultProductDomainDistributionAudit, ...request };
  const errors: ProductDomainDistributionAuditError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "product_domain_distribution_audit.unexpected_field",
          `/${key}`,
          "Unexpected product-domain distribution audit field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultProductDomainDistributionAuditIdentity)) {
    errors.push(
      error(
        "product_domain_distribution_audit.identity_invalid",
        "/identity",
        "Audit identity must stay BP-0247 source-staged-not-live.",
      ),
    );
  }

  validateRequirementRefs(merged.requirement_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "product_domain_distribution_audit.side_effects_forbidden",
        "/side_effects",
        "Completion audit must not record side effects.",
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
    product_domain_distribution_audit: {
      contract_id: productDomainDistributionCompletionAuditContract.contract_id,
      identity: defaultProductDomainDistributionAuditIdentity,
      requirement_refs: defaultProductDomainDistributionAuditRequirementRefs,
      no_live_posture: defaultProductDomainDistributionAuditNoLivePosture,
      blocked_capabilities: [...productDomainDistributionAuditBlockedFlags],
      pages_custom_domain_attachments: [],
      dns_record_mutations: [],
      ssl_certificate_mutations: [],
      tunnel_creations: [],
      cloud_lnsat_routes: [],
      hosted_runtimes: [],
      customer_data_events: [],
      binary_builds: [],
      package_publishes: [],
      github_release_creations: [],
      release_uploads: [],
      git_pushes: [],
      deploys: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateRequirementRefs(
  refs: ProductDomainDistributionAuditRequirementRef[] | undefined,
  errors: ProductDomainDistributionAuditError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "product_domain_distribution_audit.requirement_ref_required",
        "/requirement_refs",
        "Product-domain distribution audit refs must be present.",
      ),
    );
    return;
  }

  const kinds = new Set(refs.map((ref) => ref.requirement));
  for (const requirement of productDomainDistributionAuditRequirements) {
    if (!kinds.has(requirement)) {
      errors.push(
        error(
          "product_domain_distribution_audit.requirement_ref_required",
          `/requirement_refs/${requirement}`,
          "Missing product-domain distribution requirement ref.",
        ),
      );
    }
  }

  refs.forEach((ref, index) => {
    const requirementValid = productDomainDistributionAuditRequirements.includes(
      ref.requirement as ProductDomainDistributionAuditRequirement,
    );
    const evidenceValid =
      Array.isArray(ref.evidence_refs) &&
      ref.evidence_refs.length > 0 &&
      ref.evidence_refs.every((sourceRef) => !unsafeTextPattern.test(sourceRef));
    const stateValid = [
      "source_staged_live_blocked",
      "source_staged_runtime_blocked",
      "source_staged_release_execution_blocked",
      "source_staged_public_ui_tested",
    ].includes(ref.state);

    if (
      !requirementValid ||
      !evidenceValid ||
      !stateValid ||
      ref.live_mutation_allowed !== false
    ) {
      errors.push(
        error(
          "product_domain_distribution_audit.requirement_ref_invalid",
          `/requirement_refs/${index}`,
          "Audit ref must be known, source-only, non-mutating, and evidence-backed.",
        ),
      );
    }
  });
}

function validateNoLivePosture(
  request: ProductDomainDistributionAuditRequest,
  errors: ProductDomainDistributionAuditError[],
): void {
  if (
    !sameJson(
      request.no_live_posture,
      defaultProductDomainDistributionAuditNoLivePosture,
    )
  ) {
    errors.push(
      error(
        "product_domain_distribution_audit.no_live_posture_drift",
        "/no_live_posture",
        "No-live posture must keep all product-domain and release capabilities false.",
      ),
    );
  }

  for (const flag of productDomainDistributionAuditBlockedFlags) {
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "product_domain_distribution_audit.blocked_capability_drift",
          `/${flag}`,
          "Blocked product-domain/release capability must remain false.",
        ),
      );
    }
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function error(
  code: ProductDomainDistributionAuditErrorCode,
  path: string,
  message: string,
): ProductDomainDistributionAuditError {
  return { code, path, message };
}
