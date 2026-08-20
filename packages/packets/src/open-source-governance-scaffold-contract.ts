import { releaseStablePromotionPointerContract } from "./release-stable-promotion-pointer-contract.js";

export const OPEN_SOURCE_GOVERNANCE_SCAFFOLD_CONTRACT_STATUS = "source_only";

export const openSourceGovernanceScaffoldBlockedFlags = [
  "github_settings_mutation_allowed",
  "branch_protection_mutation_allowed",
  "issue_label_mutation_allowed",
  "github_api_mutation_allowed",
  "git_push_allowed",
  "release_upload_allowed",
  "package_publish_allowed",
  "hosted_runtime_allowed",
  "dns_cloudflare_mutation_allowed",
  "external_service_call_allowed",
  "secret_value_allowed",
] as const;

export const openSourceGovernanceScaffoldRequiredDocs = [
  "security_policy",
  "contributing_guide",
  "code_of_conduct",
  "governance_model",
  "maintainers",
  "support_policy",
  "pull_request_template",
  "bug_report_template",
  "feature_request_template",
  "security_report_placeholder",
  "open_source_governance_plan",
  "commercial_maintenance_rails",
] as const;

export const openSourceGovernanceScaffoldContract = {
  contract_id: "lnsat.platform.open_source_governance_scaffold.v0_1",
  extends_contract_id: releaseStablePromotionPointerContract.contract_id,
  packet_ref: "BP-0237",
  selected_after_packet_ref: "BP-0236",
  contract_authority:
    "source_only_open_source_governance_scaffold_no_github_settings_or_live_mutation",
  source_docs: [
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "GOVERNANCE.md",
    "MAINTAINERS.md",
    "SUPPORT.md",
    "docs/community/OPEN_SOURCE_GOVERNANCE.md",
    "GOVERNANCE.md",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type OpenSourceGovernanceScaffoldBlockedFlag =
  (typeof openSourceGovernanceScaffoldBlockedFlags)[number];
export type OpenSourceGovernanceScaffoldRequiredDoc =
  (typeof openSourceGovernanceScaffoldRequiredDocs)[number];

export type OpenSourceGovernanceScaffoldIdentity = {
  packet_ref: "BP-0237";
  selected_after_packet_ref: "BP-0236";
  governance_mode: "source_only_scaffold";
  implementation_allowed: false;
};

export type OpenSourceGovernanceScaffoldDocRef = {
  doc_kind: OpenSourceGovernanceScaffoldRequiredDoc;
  source_ref: string;
  required: true;
  mutation_allowed: false;
};

export type OpenSourceGovernanceScaffoldSummary = {
  open_source_state: "scaffolded_not_enforced";
  commercial_state: "maintenance_rails_planned";
  dco_state: "dco_first_cla_deferred";
  security_channel_state: "policy_targets_defined_private_channel_pending";
  templates_state: "repo_local_templates_only";
  github_settings_state: "not_mutated";
  hosted_cloud_state: "reserved_not_live";
};

export type OpenSourceGovernanceScaffoldNoLivePosture = Record<
  OpenSourceGovernanceScaffoldBlockedFlag,
  false
>;

export type OpenSourceGovernanceScaffoldRequest = Partial<
  Record<OpenSourceGovernanceScaffoldBlockedFlag, false>
> & {
  identity?: OpenSourceGovernanceScaffoldIdentity;
  governance_summary?: OpenSourceGovernanceScaffoldSummary;
  doc_refs?: OpenSourceGovernanceScaffoldDocRef[];
  no_live_posture?: OpenSourceGovernanceScaffoldNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type OpenSourceGovernanceScaffoldErrorCode =
  | "open_source_governance_scaffold.identity_invalid"
  | "open_source_governance_scaffold.summary_invalid"
  | "open_source_governance_scaffold.doc_required"
  | "open_source_governance_scaffold.doc_invalid"
  | "open_source_governance_scaffold.no_live_posture_drift"
  | "open_source_governance_scaffold.blocked_capability_drift"
  | "open_source_governance_scaffold.unexpected_field"
  | "open_source_governance_scaffold.side_effects_forbidden";

export type OpenSourceGovernanceScaffoldError = {
  code: OpenSourceGovernanceScaffoldErrorCode;
  path: string;
  message: string;
};

export type OpenSourceGovernanceScaffoldEvidence = {
  contract_id: typeof openSourceGovernanceScaffoldContract.contract_id;
  extends_contract_id: typeof releaseStablePromotionPointerContract.contract_id;
  identity: OpenSourceGovernanceScaffoldIdentity;
  governance_summary: OpenSourceGovernanceScaffoldSummary;
  doc_refs: OpenSourceGovernanceScaffoldDocRef[];
  no_live_posture: OpenSourceGovernanceScaffoldNoLivePosture;
  blocked_capabilities: OpenSourceGovernanceScaffoldBlockedFlag[];
  github_settings_mutations: [];
  branch_protection_mutations: [];
  issue_label_mutations: [];
  github_api_mutations: [];
  git_pushes: [];
  release_uploads: [];
  package_publications: [];
  hosted_runtimes: [];
  dns_cloudflare_mutations: [];
  external_service_calls: [];
  side_effects: [];
};

export type OpenSourceGovernanceScaffoldResult =
  | {
      ok: true;
      open_source_governance_scaffold: OpenSourceGovernanceScaffoldEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: OpenSourceGovernanceScaffoldError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultOpenSourceGovernanceScaffoldIdentity: OpenSourceGovernanceScaffoldIdentity =
  {
    packet_ref: "BP-0237",
    selected_after_packet_ref: "BP-0236",
    governance_mode: "source_only_scaffold",
    implementation_allowed: false,
  };

export const defaultOpenSourceGovernanceScaffoldSummary: OpenSourceGovernanceScaffoldSummary =
  {
    open_source_state: "scaffolded_not_enforced",
    commercial_state: "maintenance_rails_planned",
    dco_state: "dco_first_cla_deferred",
    security_channel_state: "policy_targets_defined_private_channel_pending",
    templates_state: "repo_local_templates_only",
    github_settings_state: "not_mutated",
    hosted_cloud_state: "reserved_not_live",
  };

const defaultDocRefMap: Record<OpenSourceGovernanceScaffoldRequiredDoc, string> = {
  security_policy: "SECURITY.md",
  contributing_guide: "CONTRIBUTING.md",
  code_of_conduct: "CODE_OF_CONDUCT.md",
  governance_model: "GOVERNANCE.md",
  maintainers: "MAINTAINERS.md",
  support_policy: "SUPPORT.md",
  pull_request_template: ".github/PULL_REQUEST_TEMPLATE.md",
  bug_report_template: ".github/ISSUE_TEMPLATE/bug_report.md",
  feature_request_template: ".github/ISSUE_TEMPLATE/feature_request.md",
  security_report_placeholder: "SECURITY.md",
  open_source_governance_plan: "docs/community/OPEN_SOURCE_GOVERNANCE.md",
  commercial_maintenance_rails: "GOVERNANCE.md",
};

export const defaultOpenSourceGovernanceScaffoldDocRefs: OpenSourceGovernanceScaffoldDocRef[] =
  openSourceGovernanceScaffoldRequiredDocs.map((doc_kind) => ({
    doc_kind,
    source_ref: defaultDocRefMap[doc_kind],
    required: true,
    mutation_allowed: false,
  }));

export const defaultOpenSourceGovernanceScaffoldNoLivePosture = Object.fromEntries(
  openSourceGovernanceScaffoldBlockedFlags.map((flag) => [flag, false]),
) as OpenSourceGovernanceScaffoldNoLivePosture;

export const defaultOpenSourceGovernanceScaffold: OpenSourceGovernanceScaffoldRequest =
  {
    identity: defaultOpenSourceGovernanceScaffoldIdentity,
    governance_summary: defaultOpenSourceGovernanceScaffoldSummary,
    doc_refs: defaultOpenSourceGovernanceScaffoldDocRefs,
    no_live_posture: defaultOpenSourceGovernanceScaffoldNoLivePosture,
    side_effects: [],
  };

const expectedKeys = new Set([
  "identity",
  "governance_summary",
  "doc_refs",
  "no_live_posture",
  "side_effects",
  ...openSourceGovernanceScaffoldBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh api|gh repo edit|gh label|gh release|github api|branch protection|upload|npm publish|docker push|git push|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createOpenSourceGovernanceScaffold(
  request: OpenSourceGovernanceScaffoldRequest = {},
): OpenSourceGovernanceScaffoldResult {
  const merged = { ...defaultOpenSourceGovernanceScaffold, ...request };
  const errors: OpenSourceGovernanceScaffoldError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "open_source_governance_scaffold.unexpected_field",
          `/${key}`,
          "Unexpected open-source governance scaffold field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultOpenSourceGovernanceScaffoldIdentity)) {
    errors.push(
      error(
        "open_source_governance_scaffold.identity_invalid",
        "/identity",
        "Open-source governance scaffold identity must stay BP-0237 source-only after BP-0236.",
      ),
    );
  }

  if (
    !sameJson(merged.governance_summary, defaultOpenSourceGovernanceScaffoldSummary)
  ) {
    errors.push(
      error(
        "open_source_governance_scaffold.summary_invalid",
        "/governance_summary",
        "Open-source governance summary must remain scaffolded, not enforced through live GitHub or hosted-cloud mutation.",
      ),
    );
  }

  validateDocRefs(merged.doc_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "open_source_governance_scaffold.side_effects_forbidden",
        "/side_effects",
        "Open-source governance scaffold must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    open_source_governance_scaffold: {
      contract_id: openSourceGovernanceScaffoldContract.contract_id,
      extends_contract_id: releaseStablePromotionPointerContract.contract_id,
      identity: merged.identity ?? defaultOpenSourceGovernanceScaffoldIdentity,
      governance_summary:
        merged.governance_summary ?? defaultOpenSourceGovernanceScaffoldSummary,
      doc_refs: merged.doc_refs ?? defaultOpenSourceGovernanceScaffoldDocRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultOpenSourceGovernanceScaffoldNoLivePosture,
      blocked_capabilities: [...openSourceGovernanceScaffoldBlockedFlags],
      github_settings_mutations: [],
      branch_protection_mutations: [],
      issue_label_mutations: [],
      github_api_mutations: [],
      git_pushes: [],
      release_uploads: [],
      package_publications: [],
      hosted_runtimes: [],
      dns_cloudflare_mutations: [],
      external_service_calls: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateDocRefs(
  refs: OpenSourceGovernanceScaffoldDocRef[] | undefined,
  errors: OpenSourceGovernanceScaffoldError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "open_source_governance_scaffold.doc_required",
        "/doc_refs",
        "Open-source governance document refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.doc_kind));
  for (const docKind of openSourceGovernanceScaffoldRequiredDocs) {
    if (!seen.has(docKind)) {
      errors.push(
        error(
          "open_source_governance_scaffold.doc_required",
          "/doc_refs",
          "Open-source governance document refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !openSourceGovernanceScaffoldRequiredDocs.includes(ref.doc_kind) ||
      ref.required !== true ||
      ref.mutation_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "open_source_governance_scaffold.doc_invalid",
          "/doc_refs",
          "Open-source governance document refs must be required, safe, and non-mutating.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: OpenSourceGovernanceScaffoldRequest,
  errors: OpenSourceGovernanceScaffoldError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "open_source_governance_scaffold.no_live_posture_drift",
        "/no_live_posture",
        "Open-source governance scaffold requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of openSourceGovernanceScaffoldBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "open_source_governance_scaffold.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Open-source governance scaffold no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "open_source_governance_scaffold.blocked_capability_drift",
          `/${flag}`,
          "Open-source governance scaffold blocked capability drifted.",
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
  code: OpenSourceGovernanceScaffoldErrorCode,
  path: string,
  message: string,
): OpenSourceGovernanceScaffoldError {
  return { code, path, message };
}
