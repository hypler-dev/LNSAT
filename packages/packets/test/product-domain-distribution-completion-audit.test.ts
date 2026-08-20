import { describe, expect, it } from "vitest";
import {
  createProductDomainDistributionAudit,
  defaultProductDomainDistributionAuditNoLivePosture,
  defaultProductDomainDistributionAuditRequirementRefs,
  productDomainDistributionAuditBlockedFlags,
  productDomainDistributionAuditRequirements,
  productDomainDistributionCompletionAuditContract,
  type ProductDomainDistributionAuditRequest,
} from "../src/index.js";

describe("product domain distribution completion audit", () => {
  it("emits BP-0247 source-staged-not-live audit evidence", () => {
    const result = createProductDomainDistributionAudit();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected product-domain distribution audit success");
    }

    expect(result.product_domain_distribution_audit).toMatchObject({
      contract_id: productDomainDistributionCompletionAuditContract.contract_id,
      identity: {
        packet_ref: "BP-0247",
        selected_after_packet_ref: "BP-0246",
        objective_state: "source_staged_not_live",
        public_domain: "lnsat.com",
        hosted_domain: "cloud.lnsat.com",
        live_completion_claim_allowed: false,
      },
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
    });
    expect(
      result.product_domain_distribution_audit.requirement_refs.map(
        (ref) => ref.requirement,
      ),
    ).toEqual([...productDomainDistributionAuditRequirements]);
    expect(result.product_domain_distribution_audit.blocked_capabilities).toEqual([
      ...productDomainDistributionAuditBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
    expect(productDomainDistributionCompletionAuditContract).toMatchObject({
      historical_only: true,
      superseded_by_contract_id:
        "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
    });
  });

  it("fails closed when required objective evidence refs are missing", () => {
    const result = createProductDomainDistributionAudit({
      requirement_refs: defaultProductDomainDistributionAuditRequirementRefs.filter(
        (ref) => ref.requirement !== "cloudflare_pages_public_domain_plan",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing requirement ref failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "product_domain_distribution_audit.requirement_ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on live-complete claim, release execution, DNS, hosted scope, and side effects", () => {
    const result = createProductDomainDistributionAudit({
      identity: {
        packet_ref: "BP-0247",
        selected_after_packet_ref: "BP-0246",
        objective_state: "source_staged_not_live",
        public_domain: "lnsat.com",
        hosted_domain: "cloud.lnsat.com",
        live_completion_claim_allowed: true,
      },
      requirement_refs: defaultProductDomainDistributionAuditRequirementRefs.map(
        (ref) =>
          ref.requirement === "hosted_cloud_lnsat_tunnel_plan"
            ? { ...ref, live_mutation_allowed: true }
            : ref,
      ),
      no_live_posture: {
        ...defaultProductDomainDistributionAuditNoLivePosture,
        dns_record_mutation_allowed: true,
        cloud_lnsat_route_allowed: true,
        binary_build_allowed: true,
      } as typeof defaultProductDomainDistributionAuditNoLivePosture,
      github_release_creation_allowed: true,
      side_effects: ["attach custom domain"],
    } as unknown as ProductDomainDistributionAuditRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected live drift failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "product_domain_distribution_audit.identity_invalid",
        }),
        expect.objectContaining({
          code: "product_domain_distribution_audit.requirement_ref_invalid",
        }),
        expect.objectContaining({
          code: "product_domain_distribution_audit.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "product_domain_distribution_audit.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "product_domain_distribution_audit.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe command refs and unexpected fields without echoing raw input", () => {
    const result = createProductDomainDistributionAudit({
      requirement_refs: defaultProductDomainDistributionAuditRequirementRefs.map(
        (ref) =>
          ref.requirement === "cloudflare_pages_public_domain_plan"
            ? { ...ref, evidence_refs: ["wrangler pages domain add lnsat.com"] }
            : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as ProductDomainDistributionAuditRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe ref failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "product_domain_distribution_audit.requirement_ref_invalid",
        }),
        expect.objectContaining({
          code: "product_domain_distribution_audit.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
