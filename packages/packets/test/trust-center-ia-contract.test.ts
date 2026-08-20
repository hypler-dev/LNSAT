import { describe, expect, it } from "vitest";
import {
  createTrustCenterIa,
  defaultTrustCenterIaNoLivePosture,
  defaultTrustCenterIaSectionRefs,
  secureUpdateRevocationPlanContract,
  trustCenterIaBlockedFlags,
  trustCenterIaContract,
  trustCenterIaRequiredSections,
  type TrustCenterIaRequest,
} from "../src/index.js";

describe("trust center IA contract", () => {
  it("emits BP-0241 source-only Trust Center IA evidence", () => {
    const result = createTrustCenterIa();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected Trust Center IA success");
    }

    expect(result.trust_center_ia).toMatchObject({
      contract_id: trustCenterIaContract.contract_id,
      extends_contract_id: secureUpdateRevocationPlanContract.contract_id,
      identity: {
        packet_ref: "BP-0241",
        selected_after_packet_ref: "BP-0240",
        route_ref: "/trust",
        publication_mode: "planned_not_published",
        implementation_allowed: false,
      },
      trust_center_summary: {
        route_state: "static_preview_planned",
        trust_center_state: "planned_not_published",
        hosted_state: "cloud_lnsat_reserved_not_routed",
        compliance_claim_state: "readiness_only_not_audited_or_certified",
        subprocessor_state: "planned_not_published",
        customer_data_state: "not_handled",
        publication_requires_later_packet: true,
      },
      trust_center_publications: [],
      hosted_runtimes: [],
      cloud_lnsat_routes: [],
      subprocessor_publications: [],
      dpa_publications: [],
      status_page_publications: [],
      audit_exports: [],
      siem_exports: [],
      backup_restore_executions: [],
      incident_process_activations: [],
      customer_data_events: [],
      database_connections: [],
      database_writes: [],
      external_service_calls: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(result.trust_center_ia.section_refs.map((ref) => ref.section_kind)).toEqual([
      ...trustCenterIaRequiredSections,
    ]);
    expect(result.trust_center_ia.blocked_capabilities).toEqual([
      ...trustCenterIaBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
    expect(trustCenterIaContract).toMatchObject({
      historical_only: true,
      superseded_by_contract_id:
        "lnsat.platform.product_site_operational_endpoint_boundary.v0_1",
    });
  });

  it("fails closed when required trust center sections are missing", () => {
    const result = createTrustCenterIa({
      section_refs: defaultTrustCenterIaSectionRefs.filter(
        (ref) => ref.section_kind !== "subprocessors_third_parties",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing Trust Center section failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "trust_center_ia.section_required" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on publication, hosted runtime, exports, customer data, and side effects", () => {
    const result = createTrustCenterIa({
      trust_center_summary: {
        route_state: "static_preview_planned",
        trust_center_state: "planned_not_published",
        hosted_state: "cloud_lnsat_reserved_not_routed",
        compliance_claim_state: "readiness_only_not_audited_or_certified",
        subprocessor_state: "planned_not_published",
        customer_data_state: "not_handled",
        publication_requires_later_packet: false,
      },
      section_refs: defaultTrustCenterIaSectionRefs.map((ref) =>
        ref.section_kind === "compliance_readiness"
          ? { ...ref, publication_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultTrustCenterIaNoLivePosture,
        trust_center_publication_allowed: true,
        hosted_runtime_allowed: true,
        audit_export_execution_allowed: true,
        customer_data_handling_allowed: true,
      } as typeof defaultTrustCenterIaNoLivePosture,
      git_push_allowed: true,
      side_effects: ["publish trust center"],
    } as unknown as TrustCenterIaRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked Trust Center IA failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "trust_center_ia.summary_invalid" }),
        expect.objectContaining({ code: "trust_center_ia.section_invalid" }),
        expect.objectContaining({
          code: "trust_center_ia.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "trust_center_ia.blocked_capability_drift",
        }),
        expect.objectContaining({ code: "trust_center_ia.side_effects_forbidden" }),
      ]),
    );
  });

  it("rejects unsafe overclaim refs and unexpected fields without echoing raw input", () => {
    const result = createTrustCenterIa({
      section_refs: defaultTrustCenterIaSectionRefs.map((ref) =>
        ref.section_kind === "compliance_readiness"
          ? { ...ref, source_ref: "SOC 2 compliant production trust center" }
          : ref,
      ),
      unexpected_secret_value: true,
    } as unknown as TrustCenterIaRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe Trust Center refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "trust_center_ia.section_invalid" }),
        expect.objectContaining({ code: "trust_center_ia.unexpected_field" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
