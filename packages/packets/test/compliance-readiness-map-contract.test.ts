import { describe, expect, it } from "vitest";
import {
  compatibilityConformanceMatrixContract,
  complianceReadinessBlockedFlags,
  complianceReadinessMapContract,
  complianceReadinessRequiredControlFamilies,
  complianceReadinessRequiredFrameworks,
  complianceReadinessRequiredTrustCenterTopics,
  createComplianceReadinessMap,
  defaultComplianceReadinessControlRefs,
  defaultComplianceReadinessFrameworkRefs,
  defaultComplianceReadinessNoLivePosture,
  defaultComplianceReadinessTrustCenterRefs,
  type ComplianceReadinessRequest,
} from "../src/index.js";

describe("compliance readiness map contract", () => {
  it("emits BP-0239 source-only compliance readiness evidence", () => {
    const result = createComplianceReadinessMap();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected compliance readiness map success");
    }

    expect(result.compliance_readiness_map).toMatchObject({
      contract_id: complianceReadinessMapContract.contract_id,
      extends_contract_id: compatibilityConformanceMatrixContract.contract_id,
      identity: {
        packet_ref: "BP-0239",
        selected_after_packet_ref: "BP-0238",
        readiness_mode: "source_only_planned",
        implementation_allowed: false,
      },
      compliance_summary: {
        compliance_state: "readiness_map_defined_not_audited",
        soc2_state: "mapped_not_audited",
        iso27001_state: "mapped_not_certified",
        trust_center_state: "planned_not_published",
        hosted_cloud_state: "reserved_not_live",
        customer_data_state: "not_handled",
      },
      soc2_audits: [],
      iso_certifications: [],
      penetration_tests: [],
      legal_reviews: [],
      vendor_reviews: [],
      subprocessor_publications: [],
      dpa_publications: [],
      hosted_runtimes: [],
      trust_center_publications: [],
      audit_exports: [],
      siem_exports: [],
      backup_restore_executions: [],
      incident_process_activations: [],
      customer_data_handling_events: [],
      database_connections: [],
      database_writes: [],
      external_service_calls: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.compliance_readiness_map.control_refs.map((ref) => ref.control_family),
    ).toEqual([...complianceReadinessRequiredControlFamilies]);
    expect(
      result.compliance_readiness_map.framework_refs.map((ref) => ref.framework),
    ).toEqual([...complianceReadinessRequiredFrameworks]);
    expect(
      result.compliance_readiness_map.trust_center_refs.map((ref) => ref.trust_topic),
    ).toEqual([...complianceReadinessRequiredTrustCenterTopics]);
    expect(result.compliance_readiness_map.blocked_capabilities).toEqual([
      ...complianceReadinessBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required control families are missing", () => {
    const result = createComplianceReadinessMap({
      control_refs: defaultComplianceReadinessControlRefs.filter(
        (ref) => ref.control_family !== "incident_response",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing control refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "compliance_readiness.control_required" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed when framework or trust-center refs are incomplete", () => {
    const result = createComplianceReadinessMap({
      framework_refs: defaultComplianceReadinessFrameworkRefs.filter(
        (ref) => ref.framework !== "soc2_security",
      ),
      trust_center_refs: defaultComplianceReadinessTrustCenterRefs.filter(
        (ref) => ref.trust_topic !== "subprocessors",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing framework/trust-center refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "compliance_readiness.framework_required" }),
        expect.objectContaining({
          code: "compliance_readiness.trust_center_required",
        }),
      ]),
    );
  });

  it("fails closed on audit, certification, trust center publication, exports, hosted runtime, and side effects", () => {
    const result = createComplianceReadinessMap({
      framework_refs: defaultComplianceReadinessFrameworkRefs.map((ref) =>
        ref.framework === "iso27001_technological"
          ? { ...ref, certification_claim_allowed: true }
          : ref,
      ),
      trust_center_refs: defaultComplianceReadinessTrustCenterRefs.map((ref) =>
        ref.trust_topic === "subprocessors"
          ? { ...ref, publication_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultComplianceReadinessNoLivePosture,
        soc2_audit_allowed: true,
        iso_certification_allowed: true,
        trust_center_publication_allowed: true,
        audit_export_execution_allowed: true,
        hosted_runtime_allowed: true,
      } as typeof defaultComplianceReadinessNoLivePosture,
      git_push_allowed: true,
      side_effects: ["publish trust center"],
    } as unknown as ComplianceReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked compliance readiness failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "compliance_readiness.framework_invalid" }),
        expect.objectContaining({
          code: "compliance_readiness.trust_center_invalid",
        }),
        expect.objectContaining({
          code: "compliance_readiness.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "compliance_readiness.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "compliance_readiness.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createComplianceReadinessMap({
      control_refs: defaultComplianceReadinessControlRefs.map((ref) =>
        ref.control_family === "vendor_subprocessor_management"
          ? { ...ref, source_ref: "publish subprocessor list with customer data" }
          : ref,
      ),
      unexpected_secret_key: true,
    } as unknown as ComplianceReadinessRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe compliance refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "compliance_readiness.control_invalid" }),
        expect.objectContaining({
          code: "compliance_readiness.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
