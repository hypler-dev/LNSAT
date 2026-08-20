import { describe, expect, it } from "vitest";
import {
  createEnterpriseDeveloperTechnicalStandards,
  defaultEnterpriseDeveloperTechnicalStandardRefs,
  defaultEnterpriseDeveloperTechnicalStandardsCategoryRefs,
  defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture,
  enterpriseDeveloperTechnicalStandards,
  enterpriseDeveloperTechnicalStandardsBlockedFlags,
  enterpriseDeveloperTechnicalStandardsCategories,
  enterpriseDeveloperTechnicalStandardsContract,
  productDomainDistributionCompletionAuditContract,
  type EnterpriseDeveloperTechnicalStandardsRequest,
} from "../src/index.js";

describe("enterprise developer technical standards maturity", () => {
  it("emits BP-0250 source-only technical standards maturity evidence", () => {
    const result = createEnterpriseDeveloperTechnicalStandards();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected technical standards maturity success");
    }

    expect(result.enterprise_developer_technical_standards).toMatchObject({
      contract_id: enterpriseDeveloperTechnicalStandardsContract.contract_id,
      extends_contract_id: productDomainDistributionCompletionAuditContract.contract_id,
      identity: {
        packet_ref: "BP-0250",
        selected_after_packet_ref: "BP-0249",
        standards_mode: "source_only_maturity_backlog",
        implementation_allowed: false,
      },
      standards_summary: {
        standards_state: "planned_not_verified",
        public_claim_state: "readiness_only_no_certification_claims",
        release_state: "release_execution_blocked",
        hosted_cloud_state: "reserved_not_live",
        developer_state: "standards_backlog_visible",
      },
      compliance_audit_claims: [],
      certification_claims: [],
      release_executions: [],
      package_builds: [],
      github_mutations: [],
      dns_cloudflare_mutations: [],
      hosted_runtimes: [],
      customer_data_events: [],
      external_service_calls: [],
      side_effects: [],
    });
    expect(
      result.enterprise_developer_technical_standards.category_refs.map(
        (ref) => ref.category,
      ),
    ).toEqual([...enterpriseDeveloperTechnicalStandardsCategories]);
    expect(
      result.enterprise_developer_technical_standards.standard_refs.map(
        (ref) => ref.standard,
      ),
    ).toEqual([...enterpriseDeveloperTechnicalStandards]);
    expect(
      result.enterprise_developer_technical_standards.blocked_capabilities,
    ).toEqual([...enterpriseDeveloperTechnicalStandardsBlockedFlags]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required categories or standards are missing", () => {
    const result = createEnterpriseDeveloperTechnicalStandards({
      category_refs: defaultEnterpriseDeveloperTechnicalStandardsCategoryRefs.filter(
        (ref) => ref.category !== "security_engineering",
      ),
      standard_refs: defaultEnterpriseDeveloperTechnicalStandardRefs.filter(
        (ref) => ref.standard !== "slsa_level_3_readiness_path",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing standards failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.category_required",
        }),
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.standard_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on certification claims, release execution, hosted runtime, and side effects", () => {
    const result = createEnterpriseDeveloperTechnicalStandards({
      standard_refs: defaultEnterpriseDeveloperTechnicalStandardRefs.map((ref) =>
        ref.standard === "openssf_scorecard" ? { ...ref, claim_allowed: true } : ref,
      ),
      no_live_posture: {
        ...defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture,
        compliance_audit_claim_allowed: true,
        certification_claim_allowed: true,
        release_execution_allowed: true,
        hosted_runtime_allowed: true,
      } as typeof defaultEnterpriseDeveloperTechnicalStandardsNoLivePosture,
      github_release_mutation_allowed: true,
      side_effects: ["publish trust center"],
    } as unknown as EnterpriseDeveloperTechnicalStandardsRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked standards maturity failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.standard_invalid",
        }),
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createEnterpriseDeveloperTechnicalStandards({
      standard_refs: defaultEnterpriseDeveloperTechnicalStandardRefs.map((ref) =>
        ref.standard === "sigstore_cosign_signing"
          ? { ...ref, source_ref: "gh release upload signed token" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as EnterpriseDeveloperTechnicalStandardsRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe standards refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.standard_invalid",
        }),
        expect.objectContaining({
          code: "enterprise_developer_technical_standards.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
