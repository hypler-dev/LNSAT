import { describe, expect, it } from "vitest";
import {
  createOpenSourceGovernanceScaffold,
  defaultOpenSourceGovernanceScaffoldDocRefs,
  defaultOpenSourceGovernanceScaffoldNoLivePosture,
  openSourceGovernanceScaffoldBlockedFlags,
  openSourceGovernanceScaffoldContract,
  openSourceGovernanceScaffoldRequiredDocs,
  releaseStablePromotionPointerContract,
  type OpenSourceGovernanceScaffoldRequest,
} from "../src/index.js";

describe("open source governance scaffold contract", () => {
  it("emits BP-0237 source-only governance scaffold evidence", () => {
    const result = createOpenSourceGovernanceScaffold();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected governance scaffold contract success");
    }

    expect(result.open_source_governance_scaffold).toMatchObject({
      contract_id: openSourceGovernanceScaffoldContract.contract_id,
      extends_contract_id: releaseStablePromotionPointerContract.contract_id,
      identity: {
        packet_ref: "BP-0237",
        selected_after_packet_ref: "BP-0236",
        governance_mode: "source_only_scaffold",
        implementation_allowed: false,
      },
      governance_summary: {
        open_source_state: "scaffolded_not_enforced",
        commercial_state: "maintenance_rails_planned",
        dco_state: "dco_first_cla_deferred",
        security_channel_state: "policy_targets_defined_private_channel_pending",
        templates_state: "repo_local_templates_only",
        github_settings_state: "not_mutated",
        hosted_cloud_state: "reserved_not_live",
      },
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
    });
    expect(
      result.open_source_governance_scaffold.doc_refs.map((ref) => ref.doc_kind),
    ).toEqual([...openSourceGovernanceScaffoldRequiredDocs]);
    expect(result.open_source_governance_scaffold.blocked_capabilities).toEqual([
      ...openSourceGovernanceScaffoldBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required governance docs are missing", () => {
    const result = createOpenSourceGovernanceScaffold({
      doc_refs: defaultOpenSourceGovernanceScaffoldDocRefs.filter(
        (ref) => ref.doc_kind !== "security_policy",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing governance docs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "open_source_governance_scaffold.doc_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on GitHub settings mutation, hosted runtime, Git push, and side effects", () => {
    const result = createOpenSourceGovernanceScaffold({
      governance_summary: {
        open_source_state: "scaffolded_not_enforced",
        commercial_state: "maintenance_rails_planned",
        dco_state: "dco_first_cla_deferred",
        security_channel_state: "policy_targets_defined_private_channel_pending",
        templates_state: "repo_local_templates_only",
        github_settings_state: "not_mutated",
        hosted_cloud_state: "reserved_not_live",
      },
      doc_refs: defaultOpenSourceGovernanceScaffoldDocRefs.map((ref) =>
        ref.doc_kind === "pull_request_template"
          ? { ...ref, mutation_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultOpenSourceGovernanceScaffoldNoLivePosture,
        github_settings_mutation_allowed: true,
        branch_protection_mutation_allowed: true,
        hosted_runtime_allowed: true,
      } as typeof defaultOpenSourceGovernanceScaffoldNoLivePosture,
      git_push_allowed: true,
      side_effects: ["gh repo edit"],
    } as unknown as OpenSourceGovernanceScaffoldRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked governance scaffold failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "open_source_governance_scaffold.doc_invalid",
        }),
        expect.objectContaining({
          code: "open_source_governance_scaffold.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "open_source_governance_scaffold.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "open_source_governance_scaffold.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createOpenSourceGovernanceScaffold({
      doc_refs: defaultOpenSourceGovernanceScaffoldDocRefs.map((ref) =>
        ref.doc_kind === "governance_model"
          ? { ...ref, source_ref: "gh api branch protection update" }
          : ref,
      ),
      unexpected_secret_key: true,
    } as unknown as OpenSourceGovernanceScaffoldRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe governance refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "open_source_governance_scaffold.doc_invalid",
        }),
        expect.objectContaining({
          code: "open_source_governance_scaffold.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
