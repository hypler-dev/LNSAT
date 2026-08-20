import { releaseSbomProvenanceDryRunContract } from "./release-sbom-provenance-dry-run.js";

export const RELEASE_GITHUB_WORKFLOW_CONTRACT_STATUS = "source_only";

export const releaseGithubWorkflowBlockedFlags = [
  "github_release_creation_allowed",
  "release_upload_allowed",
  "asset_upload_allowed",
  "tag_creation_allowed",
  "artifact_creation_allowed",
  "checksum_generation_execution_allowed",
  "sbom_generation_execution_allowed",
  "provenance_generation_execution_allowed",
  "signing_execution_allowed",
  "notarization_allowed",
  "registry_publish_allowed",
  "package_publish_allowed",
  "network_fetch_allowed",
  "external_service_call_allowed",
  "github_api_mutation_allowed",
  "git_push_allowed",
  "dns_cloudflare_mutation_allowed",
  "secret_value_allowed",
] as const;

export const releaseGithubWorkflowRequiredSteps = [
  "preflight_manifest_review",
  "source_tag_review",
  "draft_release_notes_review",
  "artifact_matrix_review",
  "checksum_index_review",
  "signature_index_review",
  "sbom_index_review",
  "provenance_index_review",
  "approval_gate_review",
  "rollback_revocation_review",
  "download_page_pointer_review",
] as const;

export const releaseGithubWorkflowAssetFamilies = [
  "source_archive",
  "server_bundle",
  "server_installer",
  "linux_package",
  "macos_package",
  "windows_package",
  "container_image",
  "mcp_extension_package",
  "connector_sdk_package",
] as const;

export const releaseGithubWorkflowContract = {
  contract_id: "lnsat.platform.release_github_workflow.v0_1",
  extends_contract_id: releaseSbomProvenanceDryRunContract.contract_id,
  packet_ref: "BP-0234",
  selected_after_packet_ref: "BP-0233",
  contract_authority:
    "source_only_github_release_workflow_no_release_creation_upload_tag_or_api_mutation",
  source_docs: [
    "docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "fixtures/release/source-plan.json",
  ],
  side_effects: [],
  status: "source_only",
} as const;

export type ReleaseGithubWorkflowBlockedFlag =
  (typeof releaseGithubWorkflowBlockedFlags)[number];
export type ReleaseGithubWorkflowRequiredStep =
  (typeof releaseGithubWorkflowRequiredSteps)[number];
export type ReleaseGithubWorkflowAssetFamily =
  (typeof releaseGithubWorkflowAssetFamilies)[number];

export type ReleaseGithubWorkflowIdentity = {
  packet_ref: "BP-0234";
  selected_after_packet_ref: "BP-0233";
  manifest_ref: "fixtures/release/source-plan.json";
  workflow_mode: "draft_source_only";
  implementation_allowed: false;
};

export type ReleaseGithubWorkflowStepRef = {
  step: ReleaseGithubWorkflowRequiredStep;
  source_ref: string;
  required: true;
  execution_allowed: false;
};

export type ReleaseGithubWorkflowAssetRef = {
  asset_family: ReleaseGithubWorkflowAssetFamily;
  asset_name_pattern_ref: "lnsat-{component}-{version}-{platform}-{arch}.{ext}";
  distribution_ref: "github_release_asset" | "github_tag_archive" | "registry_later";
  publish_allowed: false;
  upload_allowed: false;
};

export type ReleaseGithubWorkflowSummary = {
  release_version: "0.1.0-source-plan";
  github_repo: "https://github.com/hypler-dev/LNSAT";
  release_mode: "draft_planned_not_created";
  tag_status: "planned_not_created";
  release_notes_status: "planned_not_published";
  latest_pointer_status: "planned_not_promoted";
  approval_required_before_creation: true;
};

export type ReleaseGithubWorkflowNoLivePosture = Record<
  ReleaseGithubWorkflowBlockedFlag,
  false
>;

export type ReleaseGithubWorkflowRequest = Partial<
  Record<ReleaseGithubWorkflowBlockedFlag, false>
> & {
  identity?: ReleaseGithubWorkflowIdentity;
  workflow_summary?: ReleaseGithubWorkflowSummary;
  step_refs?: ReleaseGithubWorkflowStepRef[];
  asset_refs?: ReleaseGithubWorkflowAssetRef[];
  no_live_posture?: ReleaseGithubWorkflowNoLivePosture;
  side_effects?: string[];
  [key: string]: unknown;
};

export type ReleaseGithubWorkflowErrorCode =
  | "release_github_workflow.identity_invalid"
  | "release_github_workflow.summary_invalid"
  | "release_github_workflow.step_ref_required"
  | "release_github_workflow.step_ref_invalid"
  | "release_github_workflow.asset_ref_required"
  | "release_github_workflow.asset_ref_invalid"
  | "release_github_workflow.no_live_posture_drift"
  | "release_github_workflow.blocked_capability_drift"
  | "release_github_workflow.unexpected_field"
  | "release_github_workflow.side_effects_forbidden";

export type ReleaseGithubWorkflowError = {
  code: ReleaseGithubWorkflowErrorCode;
  path: string;
  message: string;
};

export type ReleaseGithubWorkflowEvidence = {
  contract_id: typeof releaseGithubWorkflowContract.contract_id;
  extends_contract_id: typeof releaseSbomProvenanceDryRunContract.contract_id;
  identity: ReleaseGithubWorkflowIdentity;
  workflow_summary: ReleaseGithubWorkflowSummary;
  step_refs: ReleaseGithubWorkflowStepRef[];
  asset_refs: ReleaseGithubWorkflowAssetRef[];
  no_live_posture: ReleaseGithubWorkflowNoLivePosture;
  blocked_capabilities: ReleaseGithubWorkflowBlockedFlag[];
  github_releases: [];
  release_uploads: [];
  uploaded_assets: [];
  created_tags: [];
  created_artifacts: [];
  github_api_mutations: [];
  git_pushes: [];
  generated_checksums: [];
  generated_sboms: [];
  generated_provenance: [];
  signatures: [];
  registry_publications: [];
  dns_cloudflare_mutations: [];
  side_effects: [];
};

export type ReleaseGithubWorkflowResult =
  | {
      ok: true;
      release_github_workflow: ReleaseGithubWorkflowEvidence;
      side_effects: [];
    }
  | {
      ok: false;
      errors: ReleaseGithubWorkflowError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export const defaultReleaseGithubWorkflowIdentity: ReleaseGithubWorkflowIdentity = {
  packet_ref: "BP-0234",
  selected_after_packet_ref: "BP-0233",
  manifest_ref: "fixtures/release/source-plan.json",
  workflow_mode: "draft_source_only",
  implementation_allowed: false,
};

export const defaultReleaseGithubWorkflowSummary: ReleaseGithubWorkflowSummary = {
  release_version: "0.1.0-source-plan",
  github_repo: "https://github.com/hypler-dev/LNSAT",
  release_mode: "draft_planned_not_created",
  tag_status: "planned_not_created",
  release_notes_status: "planned_not_published",
  latest_pointer_status: "planned_not_promoted",
  approval_required_before_creation: true,
};

export const defaultReleaseGithubWorkflowStepRefs: ReleaseGithubWorkflowStepRef[] =
  releaseGithubWorkflowRequiredSteps.map((step) => ({
    step,
    source_ref: `docs/architecture/RELEASE_TRUST_AUTOMATION_PLAN.md#${step}`,
    required: true,
    execution_allowed: false,
  }));

export const defaultReleaseGithubWorkflowAssetRefs: ReleaseGithubWorkflowAssetRef[] =
  releaseGithubWorkflowAssetFamilies.map((asset_family) => ({
    asset_family,
    asset_name_pattern_ref: "lnsat-{component}-{version}-{platform}-{arch}.{ext}",
    distribution_ref:
      asset_family === "source_archive"
        ? "github_tag_archive"
        : asset_family === "container_image"
          ? "registry_later"
          : "github_release_asset",
    publish_allowed: false,
    upload_allowed: false,
  }));

export const defaultReleaseGithubWorkflowNoLivePosture = Object.fromEntries(
  releaseGithubWorkflowBlockedFlags.map((flag) => [flag, false]),
) as ReleaseGithubWorkflowNoLivePosture;

export const defaultReleaseGithubWorkflow: ReleaseGithubWorkflowRequest = {
  identity: defaultReleaseGithubWorkflowIdentity,
  workflow_summary: defaultReleaseGithubWorkflowSummary,
  step_refs: defaultReleaseGithubWorkflowStepRefs,
  asset_refs: defaultReleaseGithubWorkflowAssetRefs,
  no_live_posture: defaultReleaseGithubWorkflowNoLivePosture,
  side_effects: [],
};

const expectedKeys = new Set([
  "identity",
  "workflow_summary",
  "step_refs",
  "asset_refs",
  "no_live_posture",
  "side_effects",
  ...releaseGithubWorkflowBlockedFlags,
]);

const unsafeTextPattern =
  /(secret|token|password|api[_ -]?key|private[_ -]?key|postgres:\/\/|mysql:\/\/|mongodb:\/\/|curl |wget |gh release|github api|upload release|npm publish|docker push|cosign|syft|slsa-generator|git push|cloudflare dns|wrangler pages domain|ssh |scp )/i;

export function createReleaseGithubWorkflow(
  request: ReleaseGithubWorkflowRequest = {},
): ReleaseGithubWorkflowResult {
  const merged = { ...defaultReleaseGithubWorkflow, ...request };
  const errors: ReleaseGithubWorkflowError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedKeys.has(key)) {
      errors.push(
        error(
          "release_github_workflow.unexpected_field",
          `/${key}`,
          "Unexpected GitHub Release workflow field.",
        ),
      );
    }
  }

  if (!sameJson(merged.identity, defaultReleaseGithubWorkflowIdentity)) {
    errors.push(
      error(
        "release_github_workflow.identity_invalid",
        "/identity",
        "GitHub Release workflow identity must stay BP-0234 draft source-only after BP-0233.",
      ),
    );
  }

  if (!sameJson(merged.workflow_summary, defaultReleaseGithubWorkflowSummary)) {
    errors.push(
      error(
        "release_github_workflow.summary_invalid",
        "/workflow_summary",
        "GitHub Release workflow summary must remain draft planned, not created or promoted.",
      ),
    );
  }

  validateStepRefs(merged.step_refs, errors);
  validateAssetRefs(merged.asset_refs, errors);
  validateNoLivePosture(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "release_github_workflow.side_effects_forbidden",
        "/side_effects",
        "GitHub Release workflow must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  return {
    ok: true,
    release_github_workflow: {
      contract_id: releaseGithubWorkflowContract.contract_id,
      extends_contract_id: releaseSbomProvenanceDryRunContract.contract_id,
      identity: merged.identity ?? defaultReleaseGithubWorkflowIdentity,
      workflow_summary: merged.workflow_summary ?? defaultReleaseGithubWorkflowSummary,
      step_refs: merged.step_refs ?? defaultReleaseGithubWorkflowStepRefs,
      asset_refs: merged.asset_refs ?? defaultReleaseGithubWorkflowAssetRefs,
      no_live_posture:
        merged.no_live_posture ?? defaultReleaseGithubWorkflowNoLivePosture,
      blocked_capabilities: [...releaseGithubWorkflowBlockedFlags],
      github_releases: [],
      release_uploads: [],
      uploaded_assets: [],
      created_tags: [],
      created_artifacts: [],
      github_api_mutations: [],
      git_pushes: [],
      generated_checksums: [],
      generated_sboms: [],
      generated_provenance: [],
      signatures: [],
      registry_publications: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    },
    side_effects: [],
  };
}

function validateStepRefs(
  refs: ReleaseGithubWorkflowStepRef[] | undefined,
  errors: ReleaseGithubWorkflowError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_github_workflow.step_ref_required",
        "/step_refs",
        "GitHub Release workflow step refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.step));
  for (const step of releaseGithubWorkflowRequiredSteps) {
    if (!seen.has(step)) {
      errors.push(
        error(
          "release_github_workflow.step_ref_required",
          "/step_refs",
          "GitHub Release workflow step refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !releaseGithubWorkflowRequiredSteps.includes(ref.step) ||
      ref.required !== true ||
      ref.execution_allowed !== false ||
      !safeText(ref.source_ref)
    ) {
      errors.push(
        error(
          "release_github_workflow.step_ref_invalid",
          "/step_refs",
          "GitHub Release workflow step refs must be required, safe, and non-executing.",
        ),
      );
    }
  }
}

function validateAssetRefs(
  refs: ReleaseGithubWorkflowAssetRef[] | undefined,
  errors: ReleaseGithubWorkflowError[],
): void {
  if (!Array.isArray(refs)) {
    errors.push(
      error(
        "release_github_workflow.asset_ref_required",
        "/asset_refs",
        "GitHub Release workflow asset refs are required.",
      ),
    );
    return;
  }
  const seen = new Set(refs.map((ref) => ref.asset_family));
  for (const assetFamily of releaseGithubWorkflowAssetFamilies) {
    if (!seen.has(assetFamily)) {
      errors.push(
        error(
          "release_github_workflow.asset_ref_required",
          "/asset_refs",
          "GitHub Release workflow asset refs are incomplete.",
        ),
      );
      return;
    }
  }
  for (const ref of refs) {
    if (
      !releaseGithubWorkflowAssetFamilies.includes(ref.asset_family) ||
      ref.asset_name_pattern_ref !==
        "lnsat-{component}-{version}-{platform}-{arch}.{ext}" ||
      ref.publish_allowed !== false ||
      ref.upload_allowed !== false
    ) {
      errors.push(
        error(
          "release_github_workflow.asset_ref_invalid",
          "/asset_refs",
          "GitHub Release workflow asset refs must be non-uploading and non-publishing.",
        ),
      );
    }
  }
}

function validateNoLivePosture(
  request: ReleaseGithubWorkflowRequest,
  errors: ReleaseGithubWorkflowError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "release_github_workflow.no_live_posture_drift",
        "/no_live_posture",
        "GitHub Release workflow requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of releaseGithubWorkflowBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "release_github_workflow.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "GitHub Release workflow no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "release_github_workflow.blocked_capability_drift",
          `/${flag}`,
          "GitHub Release workflow blocked capability drifted.",
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
  code: ReleaseGithubWorkflowErrorCode,
  path: string,
  message: string,
): ReleaseGithubWorkflowError {
  return { code, path, message };
}
