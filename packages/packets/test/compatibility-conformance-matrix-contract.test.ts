import { describe, expect, it } from "vitest";
import {
  compatibilityConformanceBlockedFlags,
  compatibilityConformanceMatrixContract,
  compatibilityConformanceRequiredConformanceClasses,
  compatibilityConformanceRequiredDimensions,
  createCompatibilityConformanceMatrix,
  defaultCompatibilityConformanceClassRefs,
  defaultCompatibilityConformanceDimensionRefs,
  defaultCompatibilityConformanceNoLivePosture,
  openSourceGovernanceScaffoldContract,
  type CompatibilityConformanceRequest,
} from "../src/index.js";

describe("compatibility conformance matrix contract", () => {
  it("emits BP-0238 source-only compatibility and conformance evidence", () => {
    const result = createCompatibilityConformanceMatrix();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected compatibility/conformance matrix success");
    }

    expect(result.compatibility_conformance_matrix).toMatchObject({
      contract_id: compatibilityConformanceMatrixContract.contract_id,
      extends_contract_id: openSourceGovernanceScaffoldContract.contract_id,
      identity: {
        packet_ref: "BP-0238",
        selected_after_packet_ref: "BP-0237",
        matrix_mode: "source_only_planned",
        implementation_allowed: false,
      },
      compatibility_summary: {
        compatibility_state: "matrix_defined_not_verified",
        conformance_state: "test_classes_defined_not_executed",
        public_site_state: "public_requirements_planned",
        hosted_cloud_state: "reserved_not_verified",
        package_artifact_state: "artifact_families_planned_not_built",
        support_state: "support_windows_required_not_claimed",
      },
      os_test_runs: [],
      browser_automation_runs: [],
      database_connections: [],
      database_writes: [],
      auth_provider_calls: [],
      package_builds: [],
      installer_executions: [],
      container_builds: [],
      hosted_runtimes: [],
      external_service_calls: [],
      release_uploads: [],
      github_api_mutations: [],
      git_pushes: [],
      dns_cloudflare_mutations: [],
      side_effects: [],
    });
    expect(
      result.compatibility_conformance_matrix.dimension_refs.map(
        (ref) => ref.dimension,
      ),
    ).toEqual([...compatibilityConformanceRequiredDimensions]);
    expect(
      result.compatibility_conformance_matrix.conformance_refs.map(
        (ref) => ref.conformance_class,
      ),
    ).toEqual([...compatibilityConformanceRequiredConformanceClasses]);
    expect(result.compatibility_conformance_matrix.blocked_capabilities).toEqual([
      ...compatibilityConformanceBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed when required compatibility dimensions are missing", () => {
    const result = createCompatibilityConformanceMatrix({
      dimension_refs: defaultCompatibilityConformanceDimensionRefs.filter(
        (ref) => ref.dimension !== "auth_providers",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing compatibility dimension failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "compatibility_conformance.dimension_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed when required conformance classes are missing", () => {
    const result = createCompatibilityConformanceMatrix({
      conformance_refs: defaultCompatibilityConformanceClassRefs.filter(
        (ref) => ref.conformance_class !== "policy_fail_closed",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing conformance class failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "compatibility_conformance.conformance_required",
        }),
      ]),
    );
  });

  it("fails closed on live tests, package builds, hosted runtime, GitHub mutation, and side effects", () => {
    const result = createCompatibilityConformanceMatrix({
      compatibility_summary: {
        compatibility_state: "matrix_defined_not_verified",
        conformance_state: "test_classes_defined_not_executed",
        public_site_state: "public_requirements_planned",
        hosted_cloud_state: "reserved_not_verified",
        package_artifact_state: "artifact_families_planned_not_built",
        support_state: "support_windows_required_not_claimed",
      },
      dimension_refs: defaultCompatibilityConformanceDimensionRefs.map((ref) =>
        ref.dimension === "browsers_public_site"
          ? { ...ref, execution_allowed: true }
          : ref,
      ),
      no_live_posture: {
        ...defaultCompatibilityConformanceNoLivePosture,
        browser_automation_allowed: true,
        package_build_allowed: true,
        hosted_runtime_allowed: true,
        github_api_mutation_allowed: true,
      } as typeof defaultCompatibilityConformanceNoLivePosture,
      git_push_allowed: true,
      side_effects: ["run playwright"],
    } as unknown as CompatibilityConformanceRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked compatibility/conformance failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "compatibility_conformance.dimension_invalid",
        }),
        expect.objectContaining({
          code: "compatibility_conformance.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "compatibility_conformance.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "compatibility_conformance.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("rejects unsafe refs and unexpected fields without echoing raw input", () => {
    const result = createCompatibilityConformanceMatrix({
      conformance_refs: defaultCompatibilityConformanceClassRefs.map((ref) =>
        ref.conformance_class === "browser_route_rendering"
          ? { ...ref, source_ref: "run playwright against live site" }
          : ref,
      ),
      unexpected_secret_key: true,
    } as unknown as CompatibilityConformanceRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe compatibility/conformance refs failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "compatibility_conformance.conformance_invalid",
        }),
        expect.objectContaining({
          code: "compatibility_conformance.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
