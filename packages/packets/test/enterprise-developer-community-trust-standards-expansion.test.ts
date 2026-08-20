import { describe, expect, it } from "vitest";
import {
  createEnterpriseDeveloperCommunityTrustStandardsExpansion,
  defaultEnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRefs,
  defaultEnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture,
  defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs,
  enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags,
  enterpriseDeveloperCommunityTrustStandardsExpansionCategories,
  enterpriseDeveloperCommunityTrustStandardsExpansionContract,
  enterpriseDeveloperCommunityTrustStandardsExpansionStandards,
  enterpriseDeveloperTechnicalStandardsContract,
  type EnterpriseDeveloperCommunityTrustStandardsExpansionRequest,
} from "../src/index.js";

describe("enterprise developer community trust standards expansion", () => {
  it("emits BP-0262 source-only expanded standards evidence", () => {
    const result = createEnterpriseDeveloperCommunityTrustStandardsExpansion();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected expanded standards success");
    }

    expect(
      result.enterprise_developer_community_trust_standards_expansion,
    ).toMatchObject({
      contract_id:
        enterpriseDeveloperCommunityTrustStandardsExpansionContract.contract_id,
      extends_contract_id: enterpriseDeveloperTechnicalStandardsContract.contract_id,
      identity: {
        packet_ref: "BP-0262",
        selected_after_packet_ref: "BP-0261",
        expansion_mode: "source_only_planned_features",
        implementation_allowed: false,
      },
      standards_summary: {
        standards_state: "planned_not_verified",
        public_claim_state: "readiness_only_no_certification_claims",
        trust_center_state: "evidence_inventory_planned_not_published",
        release_state: "release_execution_blocked",
        hosted_cloud_state: "reserved_not_live",
      },
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
    });
    expect(
      result.enterprise_developer_community_trust_standards_expansion.category_refs.map(
        (ref) => ref.category,
      ),
    ).toEqual([...enterpriseDeveloperCommunityTrustStandardsExpansionCategories]);
    expect(
      result.enterprise_developer_community_trust_standards_expansion.standard_refs.map(
        (ref) => ref.standard,
      ),
    ).toEqual([...enterpriseDeveloperCommunityTrustStandardsExpansionStandards]);
    expect(
      result.enterprise_developer_community_trust_standards_expansion
        .blocked_capabilities,
    ).toEqual([...enterpriseDeveloperCommunityTrustStandardsExpansionBlockedFlags]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required categories or standards are missing", () => {
    const result = createEnterpriseDeveloperCommunityTrustStandardsExpansion({
      category_refs:
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionCategoryRefs.filter(
          (ref) => ref.category !== "ai_governance_and_risk",
        ),
      standard_refs:
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs.filter(
          (ref) => ref.standard !== "nist_ai_rmf_mapping",
        ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing expanded standards failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.category_required",
        }),
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.standard_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on claims, live mutation flags, and side effects", () => {
    const result = createEnterpriseDeveloperCommunityTrustStandardsExpansion({
      standard_refs:
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs.map(
          (ref) =>
            ref.standard === "fedramp_stateramp_posture_map"
              ? { ...ref, claim_allowed: true }
              : ref,
        ),
      no_live_posture: {
        ...defaultEnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture,
        certification_claim_allowed: true,
        hosted_runtime_allowed: true,
      } as typeof defaultEnterpriseDeveloperCommunityTrustStandardsExpansionNoLivePosture,
      github_release_mutation_allowed: true,
      side_effects: ["publish trust center"],
    } as unknown as EnterpriseDeveloperCommunityTrustStandardsExpansionRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked expanded standards failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.standard_invalid",
        }),
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createEnterpriseDeveloperCommunityTrustStandardsExpansion({
      standard_refs:
        defaultEnterpriseDeveloperCommunityTrustStandardsExpansionStandardRefs.map(
          (ref) =>
            ref.standard === "tuf_style_update_metadata"
              ? { ...ref, source_ref: "gh release upload signed token" }
              : ref,
        ),
      unexpected_secret_value: true,
    } as unknown as EnterpriseDeveloperCommunityTrustStandardsExpansionRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe expanded standards refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.standard_invalid",
        }),
        expect.objectContaining({
          code: "enterprise_developer_community_trust_standards_expansion.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
