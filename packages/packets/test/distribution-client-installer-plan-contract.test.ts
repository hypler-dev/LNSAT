import { describe, expect, it } from "vitest";
import {
  authSessionReadinessContract,
  createDistributionClientInstallerPlan,
  defaultDistributionClientInstallerAllowedState,
  defaultDistributionClientInstallerArtifactFamilyRefs,
  defaultDistributionClientInstallerFactoryCleanRefs,
  defaultDistributionClientInstallerMcpBoundaryRefs,
  defaultDistributionClientInstallerNoLivePosture,
  defaultDistributionClientInstallerOnboardingStepRefs,
  defaultDistributionClientInstallerOsCapabilityRefs,
  defaultDistributionClientInstallerRuntimeSplitRefs,
  defaultDistributionClientInstallerSourceRefs,
  defaultDistributionClientInstallerSupportTierRefs,
  distributionClientInstallerArtifactFamilies,
  distributionClientInstallerBlockedCapabilityFlags,
  distributionClientInstallerCanonicalComponents,
  distributionClientInstallerCanonicalTargets,
  distributionClientInstallerFactoryCleanKinds,
  distributionClientInstallerMcpBoundaryKinds,
  distributionClientInstallerOnboardingStepKinds,
  distributionClientInstallerOsCapabilityKinds,
  distributionClientInstallerPlanContract,
  distributionClientInstallerPhase14Evidence,
  distributionClientInstallerReleaseRequirementKinds,
  distributionClientInstallerRuntimeSplitKinds,
  distributionClientInstallerRequiredWrappers,
  distributionClientInstallerSupportTiers,
  selfDeployPackagingPlanContract,
  type DistributionClientInstallerPlanRequest,
} from "../src/index.js";

describe("distribution client installer plan contract", () => {
  it("emits BP-0218 source-only distribution and client installer evidence", () => {
    const result = createDistributionClientInstallerPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected distribution client installer plan success");
    }

    expect(result.distribution_client_installer_plan).toMatchObject({
      contract_id: distributionClientInstallerPlanContract.contract_id,
      plan_version: "0.1",
      plan_identity: {
        packet_ref: "BP-0218",
        selected_after_packet_ref: "BP-0217",
        plan_ref: "distribution_client_installer_plan:source_only",
        plan_mode: "source_contract_only",
      },
      self_deploy_packaging_plan_contract_id:
        selfDeployPackagingPlanContract.contract_id,
      auth_session_readiness_contract_id: authSessionReadinessContract.contract_id,
      no_live_posture: defaultDistributionClientInstallerNoLivePosture,
      allowed_state: defaultDistributionClientInstallerAllowedState,
      package_artifacts: [],
      installer_artifacts: [],
      binary_artifacts: [],
      service_install_artifacts: [],
      client_enrollment_artifacts: [],
      mcp_extension_install_artifacts: [],
      runtime_artifacts: [],
      database_artifacts: [],
      auth_runtime_artifacts: [],
      integration_runtime_artifacts: [],
      seeded_customer_data: [],
      external_service_clients: [],
      automatic_ingestion_before_onboarding_allowed: false,
      package_creation_allowed: false,
      package_publish_allowed: false,
      binary_build_allowed: false,
      installer_execution_allowed: false,
      client_enrollment_allowed: false,
      auth_provider_wiring_allowed: false,
      integration_setup_write_allowed: false,
      python_core_required: false,
      os_specific_binary_core_required: false,
      side_effects: [],
    });
    expect(
      result.distribution_client_installer_plan.artifact_family_refs.map(
        (ref) => ref.artifact_family,
      ),
    ).toEqual([...distributionClientInstallerArtifactFamilies]);
    expect(
      result.distribution_client_installer_plan.support_tier_refs.map(
        (ref) => ref.support_tier,
      ),
    ).toEqual([...distributionClientInstallerSupportTiers]);
    expect(
      result.distribution_client_installer_plan.runtime_split_refs.map(
        (ref) => ref.runtime_kind,
      ),
    ).toEqual([...distributionClientInstallerRuntimeSplitKinds]);
    expect(
      result.distribution_client_installer_plan.factory_clean_refs.map(
        (ref) => ref.clean_kind,
      ),
    ).toEqual([...distributionClientInstallerFactoryCleanKinds]);
    expect(
      result.distribution_client_installer_plan.onboarding_step_refs.map(
        (ref) => ref.onboarding_kind,
      ),
    ).toEqual([...distributionClientInstallerOnboardingStepKinds]);
    expect(
      result.distribution_client_installer_plan.os_capability_refs.map(
        (ref) => ref.capability_kind,
      ),
    ).toEqual([...distributionClientInstallerOsCapabilityKinds]);
    expect(
      result.distribution_client_installer_plan.release_requirement_refs.map(
        (ref) => ref.requirement_kind,
      ),
    ).toEqual([...distributionClientInstallerReleaseRequirementKinds]);
    expect(
      result.distribution_client_installer_plan.mcp_boundary_refs.map(
        (ref) => ref.mcp_kind,
      ),
    ).toEqual([...distributionClientInstallerMcpBoundaryKinds]);
    expect(result.distribution_client_installer_plan.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/ADR-0002_AUTHORITY_LAYER_AND_V1_DISTRIBUTION.md",
        "docs/architecture/DISTRIBUTION_AND_CLIENT_INSTALLERS.md",
        "docs/architecture/COMPATIBILITY_AND_CONFORMANCE_MATRIX.md",
        "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
        "docs/ROADMAP.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "packages/packets/src/distribution-client-installer-plan-contract.ts",
        "packages/packets/test/distribution-client-installer-plan-contract.test.ts",
      ]),
    );
    expect(result.side_effects).toEqual([]);
    expect(distributionClientInstallerCanonicalTargets).toEqual([
      "aarch64-apple-darwin",
      "x86_64-apple-darwin",
      "x86_64-unknown-linux-gnu",
      "aarch64-unknown-linux-gnu",
    ]);
    expect(distributionClientInstallerCanonicalComponents).toContain("lnsatd");
    expect(distributionClientInstallerCanonicalComponents).toContain(
      "control_center_assets",
    );
    expect(distributionClientInstallerRequiredWrappers).toEqual([
      "homebrew_tap",
      "direct_tarball",
      "verified_install_script",
      "deb_package",
      "rpm_package",
      "oci_multiarch_image",
      "cargo_bootstrap_verifier",
    ]);
    expect(distributionClientInstallerPhase14Evidence).toContain(
      "canonical_component_digest_map",
    );
    expect(distributionClientInstallerPlanContract).toMatchObject({
      phase_14_mandatory_before_v1: true,
      canonical_product_binaries_required: true,
      package_managers_rebuild_product_behavior: false,
      cross_wrapper_component_digest_equality_required: true,
      cargo_installs_bootstrap_verifier_only: true,
      service_auto_start_allowed: false,
      non_root_runtime_required: true,
    });
  });

  it("fails closed on missing distribution and installer plan evidence", () => {
    const result = createDistributionClientInstallerPlan({
      artifact_family_refs: defaultDistributionClientInstallerArtifactFamilyRefs.filter(
        (ref) => ref.artifact_family !== "mcp_extension_package",
      ),
      support_tier_refs: defaultDistributionClientInstallerSupportTierRefs.filter(
        (ref) => ref.support_tier !== "windows_service_package_later",
      ),
      runtime_split_refs: defaultDistributionClientInstallerRuntimeSplitRefs.filter(
        (ref) => ref.runtime_kind !== "optional_python_adapter_later",
      ),
      factory_clean_refs: defaultDistributionClientInstallerFactoryCleanRefs.filter(
        (ref) => ref.clean_kind !== "no_customer_data",
      ),
      onboarding_step_refs: defaultDistributionClientInstallerOnboardingStepRefs.filter(
        (ref) => ref.onboarding_kind !== "user_owned_system_connection",
      ),
      os_capability_refs: defaultDistributionClientInstallerOsCapabilityRefs.filter(
        (ref) => ref.capability_kind !== "service_status_read",
      ),
      mcp_boundary_refs: defaultDistributionClientInstallerMcpBoundaryRefs.filter(
        (ref) => ref.mcp_kind !== "gateway_policy_required",
      ),
      source_refs: defaultDistributionClientInstallerSourceRefs.filter(
        (ref) => ref.source_ref !== "docs/reference/CONTRACT_PROVENANCE.md",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing distribution evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "distribution_client_installer.artifact_family_ref_required",
          path: "/artifact_family_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.support_tier_ref_required",
          path: "/support_tier_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.runtime_split_ref_required",
          path: "/runtime_split_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.factory_clean_ref_required",
          path: "/factory_clean_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.onboarding_step_ref_required",
          path: "/onboarding_step_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.os_capability_ref_required",
          path: "/os_capability_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.mcp_boundary_ref_required",
          path: "/mcp_boundary_refs",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.source_ref_required",
          path: "/source_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on package, binary, install, client, seed, runtime, DB, auth, or OS drift", () => {
    const result = createDistributionClientInstallerPlan({
      artifact_family_refs: defaultDistributionClientInstallerArtifactFamilyRefs.map(
        (ref) =>
          ref.artifact_family === "server_installer"
            ? {
                ...ref,
                current_state: "future_artifact_family_source_ref_only",
                package_creation_allowed: true,
                package_publish_allowed: true,
                binary_build_allowed: true,
                installer_execution_allowed: true,
              }
            : ref,
      ) as typeof defaultDistributionClientInstallerArtifactFamilyRefs,
      runtime_split_refs: defaultDistributionClientInstallerRuntimeSplitRefs.map(
        (ref) =>
          ref.runtime_kind === "optional_python_adapter_later"
            ? {
                ...ref,
                python_core_required: true,
                os_specific_binary_core_required: true,
                binary_build_allowed: true,
              }
            : ref,
      ) as typeof defaultDistributionClientInstallerRuntimeSplitRefs,
      factory_clean_refs: defaultDistributionClientInstallerFactoryCleanRefs.map(
        (ref) =>
          ref.clean_kind === "no_customer_data"
            ? {
                ...ref,
                seeded_customer_data_allowed: true,
                automatic_ingestion_before_onboarding_allowed: true,
                credential_storage_allowed: true,
              }
            : ref,
      ) as typeof defaultDistributionClientInstallerFactoryCleanRefs,
      onboarding_step_refs: defaultDistributionClientInstallerOnboardingStepRefs.map(
        (ref) =>
          ref.onboarding_kind === "approved_ingestion_build"
            ? {
                ...ref,
                stores_secret_values: true,
                mutates_external_system: true,
                ingestion_allowed_before_step: true,
              }
            : ref,
      ) as typeof defaultDistributionClientInstallerOnboardingStepRefs,
      os_capability_refs: defaultDistributionClientInstallerOsCapabilityRefs.map(
        (ref) =>
          ref.capability_kind === "approved_service_restart_request"
            ? {
                ...ref,
                direct_shell_allowed: true,
                ssh_allowed: true,
                host_mutation_allowed: true,
              }
            : ref,
      ) as typeof defaultDistributionClientInstallerOsCapabilityRefs,
      no_live_posture: {
        ...defaultDistributionClientInstallerNoLivePosture,
        binary_build_allowed: true,
        installer_execution_allowed: true,
        client_enrollment_allowed: true,
        database_connection_allowed: true,
        auth_provider_wiring_allowed: true,
        seeded_customer_data_allowed: true,
      } as typeof defaultDistributionClientInstallerNoLivePosture,
      allowed_state: {
        ...defaultDistributionClientInstallerAllowedState,
        core_server_python_required: true,
        core_server_os_binary_required: true,
        seeded_customer_data_allowed: true,
      } as typeof defaultDistributionClientInstallerAllowedState,
    } as unknown as DistributionClientInstallerPlanRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked distribution scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "distribution_client_installer.invalid_artifact_family_ref",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.invalid_runtime_split_ref",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.invalid_factory_clean_ref",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.invalid_onboarding_step_ref",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.invalid_os_capability_ref",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.allowed_state_drift",
        }),
      ]),
    );
  });

  it("redacts unsafe text, unexpected fields, blocked capability flags, and side effects", () => {
    const result = createDistributionClientInstallerPlan({
      source_refs: [
        ...defaultDistributionClientInstallerSourceRefs,
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary:
            "Use postgres://demo, npm publish, service install, seed customer data, and external service call.",
        },
      ],
      side_effects: ["publish package"],
      package_publish_allowed: true,
      unknown_field: true,
    } as unknown as DistributionClientInstallerPlanRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe distribution request failure");
    }

    expect(result.raw_input_content).toBe("withheld");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "distribution_client_installer.unexpected_field",
          path: "/unknown_field",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.secret_value_forbidden",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.package_or_binary_forbidden",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.install_or_client_forbidden",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.seed_or_ingestion_forbidden",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.external_service_forbidden",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.blocked_capability_forbidden",
          path: "/package_publish_allowed",
        }),
        expect.objectContaining({
          code: "distribution_client_installer.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("proves no executable package, installer, client, runtime, DB, auth, integration, seed, or ingestion artifacts are emitted", () => {
    const result = createDistributionClientInstallerPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected distribution client installer plan success");
    }

    const evidence = result.distribution_client_installer_plan;
    expect(evidence.package_artifacts).toEqual([]);
    expect(evidence.installer_artifacts).toEqual([]);
    expect(evidence.binary_artifacts).toEqual([]);
    expect(evidence.service_install_artifacts).toEqual([]);
    expect(evidence.client_enrollment_artifacts).toEqual([]);
    expect(evidence.mcp_extension_install_artifacts).toEqual([]);
    expect(evidence.runtime_artifacts).toEqual([]);
    expect(evidence.database_artifacts).toEqual([]);
    expect(evidence.auth_runtime_artifacts).toEqual([]);
    expect(evidence.integration_runtime_artifacts).toEqual([]);
    expect(evidence.seeded_customer_data).toEqual([]);
    expect(evidence.external_service_clients).toEqual([]);
    expect(evidence.automatic_ingestion_before_onboarding_allowed).toBe(false);
    expect(evidence.package_creation_allowed).toBe(false);
    expect(evidence.package_publish_allowed).toBe(false);
    expect(evidence.binary_build_allowed).toBe(false);
    expect(evidence.installer_execution_allowed).toBe(false);
    expect(evidence.client_enrollment_allowed).toBe(false);
    expect(evidence.auth_provider_wiring_allowed).toBe(false);
    expect(evidence.integration_setup_write_allowed).toBe(false);
    expect(evidence.python_core_required).toBe(false);
    expect(evidence.os_specific_binary_core_required).toBe(false);
    expect(evidence.blocked_capabilities).toEqual([
      ...distributionClientInstallerBlockedCapabilityFlags,
    ]);
    expect(evidence.side_effects).toEqual([]);
  });
});
