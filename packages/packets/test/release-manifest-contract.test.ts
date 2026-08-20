import { describe, expect, it } from "vitest";
import {
  createReleaseManifest,
  defaultReleaseManifestExtensionHandoffRefs,
  defaultReleaseManifestFactoryCleanRefs,
  defaultReleaseManifestNoLivePosture,
  defaultReleaseManifestPackageMatrixRefs,
  defaultReleaseManifestSecurityGateRefs,
  defaultReleaseManifestSourceRefs,
  distributionClientInstallerPlanContract,
  releaseManifestBlockedCapabilityFlags,
  releaseManifestContract,
  releaseManifestExtensionHandoffKinds,
  releaseManifestFactoryCleanKinds,
  releaseManifestInstallTiers,
  releaseManifestPackageFamilies,
  releaseManifestSecurityGateKinds,
  selfDeployPackagingPlanContract,
  type ReleaseManifestRequest,
} from "../src/index.js";

describe("release manifest contract", () => {
  it("emits BP-0219 source-only release manifest evidence revised by BP-0220", () => {
    const result = createReleaseManifest();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected release manifest success");
    }

    expect(result.release_manifest).toMatchObject({
      contract_id: releaseManifestContract.contract_id,
      manifest_version: "0.1",
      manifest_identity: {
        packet_ref: "BP-0219",
        selected_after_packet_ref: "BP-0220",
        manifest_ref: "release_manifest:source_only",
        manifest_mode: "source_contract_only",
      },
      distribution_client_installer_plan_contract_id:
        distributionClientInstallerPlanContract.contract_id,
      self_deploy_packaging_plan_contract_id:
        selfDeployPackagingPlanContract.contract_id,
      contract_authority: "source_only_release_manifest_no_artifact_build_or_install",
      no_live_posture: defaultReleaseManifestNoLivePosture,
      release_artifacts: [],
      binary_artifacts: [],
      published_packages: [],
      installer_executions: [],
      service_installations: [],
      client_enrollments: [],
      mcp_extension_installations: [],
      credential_records: [],
      integration_setup_writes: [],
      seeded_customer_data: [],
      runtime_invocations: [],
      source_canonical_artifact: true,
      factory_clean_release_required: true,
      onboarding_required_before_ingestion: true,
      mcp_extensions_separate: true,
      side_effects: [],
    });
    expect(
      result.release_manifest.package_matrix_refs.map((ref) => ref.package_family),
    ).toEqual([...releaseManifestPackageFamilies]);
    expect(
      result.release_manifest.package_matrix_refs.map((ref) => ref.install_tier),
    ).toEqual(
      expect.arrayContaining([
        "source_review",
        "local_single_node_server",
        "managed_fleet",
      ]),
    );
    expect([...releaseManifestInstallTiers]).toContain("self_hosted_team_server");
    expect(
      result.release_manifest.security_gate_refs.map((ref) => ref.gate_kind),
    ).toEqual([...releaseManifestSecurityGateKinds]);
    expect(
      result.release_manifest.factory_clean_refs.map((ref) => ref.clean_kind),
    ).toEqual([...releaseManifestFactoryCleanKinds]);
    expect(
      result.release_manifest.extension_handoff_refs.map((ref) => ref.handoff_kind),
    ).toEqual([...releaseManifestExtensionHandoffKinds]);
    expect(result.release_manifest.source_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_ref:
            "docs/architecture/DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md",
        }),
        expect.objectContaining({
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
        }),
        expect.objectContaining({
          source_ref: "packages/packets/src/release-manifest-contract.ts",
        }),
      ]),
    );
    expect(result.release_manifest.blocked_capabilities).toEqual([
      ...releaseManifestBlockedCapabilityFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing release, package, gate, factory-clean, extension, or source evidence", () => {
    const result = createReleaseManifest({
      source_release_ref: undefined,
      package_matrix_refs: defaultReleaseManifestPackageMatrixRefs.filter(
        (ref) => ref.package_family !== "host_client_helper",
      ),
      security_gate_refs: defaultReleaseManifestSecurityGateRefs.filter(
        (ref) => ref.gate_kind !== "provenance",
      ),
      factory_clean_refs: defaultReleaseManifestFactoryCleanRefs.filter(
        (ref) => ref.clean_kind !== "no_credentials_or_tokens",
      ),
      extension_handoff_refs: defaultReleaseManifestExtensionHandoffRefs.filter(
        (ref) => ref.handoff_kind !== "permission_matrix_ref_only",
      ),
      source_refs: defaultReleaseManifestSourceRefs.filter(
        (ref) =>
          ref.source_ref !==
          "docs/architecture/DISTRIBUTION_REALITY_AND_SECURE_INSTALLER_PLAN.md",
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing release manifest evidence failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_manifest.source_release_ref_required",
        }),
        expect.objectContaining({
          code: "release_manifest.package_matrix_ref_required",
        }),
        expect.objectContaining({
          code: "release_manifest.security_gate_ref_required",
        }),
        expect.objectContaining({
          code: "release_manifest.factory_clean_ref_required",
        }),
        expect.objectContaining({
          code: "release_manifest.extension_handoff_ref_required",
        }),
        expect.objectContaining({
          code: "release_manifest.source_ref_required",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on build, publish, install, seeded data, extension activation, and live drift", () => {
    const result = createReleaseManifest({
      package_matrix_refs: defaultReleaseManifestPackageMatrixRefs.map((ref) =>
        ref.package_family === "server_installer"
          ? {
              ...ref,
              build_allowed: true,
              publish_allowed: true,
              install_allowed: true,
            }
          : ref,
      ) as typeof defaultReleaseManifestPackageMatrixRefs,
      factory_clean_refs: defaultReleaseManifestFactoryCleanRefs.map((ref) =>
        ref.clean_kind === "no_customer_data" ? { ...ref, allowed: true } : ref,
      ) as typeof defaultReleaseManifestFactoryCleanRefs,
      extension_handoff_refs: defaultReleaseManifestExtensionHandoffRefs.map((ref) =>
        ref.handoff_kind === "mcp_extensions_separate_from_core_installers"
          ? { ...ref, implementation_allowed: true, activation_allowed: true }
          : ref,
      ) as typeof defaultReleaseManifestExtensionHandoffRefs,
      no_live_posture: {
        ...defaultReleaseManifestNoLivePosture,
        binary_build_allowed: true,
        installer_execution_allowed: true,
        credential_storage_allowed: true,
      } as typeof defaultReleaseManifestNoLivePosture,
      deploy_allowed: true,
      side_effects: ["publish release"],
    } as unknown as ReleaseManifestRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected release manifest blocked scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_manifest.package_matrix_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest.factory_clean_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest.extension_handoff_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest.no_live_posture_drift",
        }),
        expect.objectContaining({
          code: "release_manifest.blocked_capability_drift",
        }),
        expect.objectContaining({
          code: "release_manifest.side_effects_forbidden",
        }),
      ]),
    );
  });

  it("redacts unsafe refs and unexpected fields", () => {
    const result = createReleaseManifest({
      security_gate_refs: defaultReleaseManifestSecurityGateRefs.map((ref) =>
        ref.gate_kind === "checksum"
          ? { ...ref, evidence_ref: "npm publish with token" }
          : ref,
      ),
      source_refs: [
        ...defaultReleaseManifestSourceRefs,
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary: "store secret token and run external service call",
        },
      ],
      unexpected_live_release_upload: true,
    } as unknown as ReleaseManifestRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe release manifest failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "release_manifest.security_gate_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest.source_ref_invalid",
        }),
        expect.objectContaining({
          code: "release_manifest.unexpected_field",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(result.side_effects).toEqual([]);
  });
});
