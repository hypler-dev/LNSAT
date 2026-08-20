import { describe, expect, it } from "vitest";
import {
  createSelfDeployPackagingPlan,
  defaultSelfDeployPackagingAllowedState,
  defaultSelfDeployPackagingArtifactRefs,
  defaultSelfDeployPackagingAuthPostureRefs,
  defaultSelfDeployPackagingDeploymentModeRefs,
  defaultSelfDeployPackagingIntegrationPostureRefs,
  defaultSelfDeployPackagingNoLivePosture,
  defaultSelfDeployPackagingOsPythonPostureRefs,
  defaultSelfDeployPackagingPlan,
  defaultSelfDeployPackagingPolicyPrerequisiteRefs,
  defaultSelfDeployPackagingRollbackRefs,
  defaultSelfDeployPackagingValidationCommandRefs,
  installationControlProfileContract,
  persistencePolicyGateContract,
  persistedKnowledgeReadSurfaceContract,
  selfDeployPackagingPlanArtifactKinds,
  selfDeployPackagingPlanAuthPostureKinds,
  selfDeployPackagingPlanBlockedCapabilityFlags,
  selfDeployPackagingPlanContract,
  selfDeployPackagingPlanDeploymentModes,
  selfDeployPackagingPlanIntegrationPostureKinds,
  selfDeployPackagingPlanOsPythonPostureKinds,
  selfDeployPackagingPlanPolicyPrerequisiteKinds,
  selfDeployPackagingPlanRollbackKinds,
  selfDeployPackagingPlanValidationKinds,
  type SelfDeployPackagingPlanRequest,
} from "../src/index.js";

describe("self-deploy packaging plan contract", () => {
  it("emits BP-0216 source-only self-deploy packaging plan evidence", () => {
    const result = createSelfDeployPackagingPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected self-deploy packaging plan success");
    }

    expect(result.self_deploy_packaging_plan).toMatchObject({
      contract_id: selfDeployPackagingPlanContract.contract_id,
      plan_version: "0.1",
      plan_identity: {
        packet_ref: "BP-0216",
        selected_after_packet_ref: "BP-0215",
        plan_ref: "self_deploy_packaging_plan:source_only",
        plan_mode: "source_contract_only",
      },
      installation_control_profile_contract_id:
        installationControlProfileContract.contract_id,
      persistence_policy_gate_contract_id: persistencePolicyGateContract.contract_id,
      persisted_knowledge_read_surface_contract_id:
        persistedKnowledgeReadSurfaceContract.contract_id,
      no_live_posture: defaultSelfDeployPackagingNoLivePosture,
      allowed_state: defaultSelfDeployPackagingAllowedState,
      package_artifacts: [],
      installer_artifacts: [],
      binary_artifacts: [],
      docker_image_artifacts: [],
      service_file_artifacts: [],
      deploy_artifacts: [],
      runtime_artifacts: [],
      database_artifacts: [],
      auth_runtime_artifacts: [],
      integration_runtime_artifacts: [],
      external_service_clients: [],
      package_creation_allowed: false,
      package_publish_allowed: false,
      deploy_allowed: false,
      auth_provider_wiring_allowed: false,
      integration_setup_write_allowed: false,
      python_runtime_required: false,
      os_specific_binary_required: false,
      side_effects: [],
    });
    expect(
      result.self_deploy_packaging_plan.deployment_mode_refs.map(
        (ref) => ref.mode_kind,
      ),
    ).toEqual([...selfDeployPackagingPlanDeploymentModes]);
    expect(
      result.self_deploy_packaging_plan.artifact_refs.map((ref) => ref.artifact_kind),
    ).toEqual([...selfDeployPackagingPlanArtifactKinds]);
    expect(
      result.self_deploy_packaging_plan.auth_posture_refs.map((ref) => ref.auth_kind),
    ).toEqual([...selfDeployPackagingPlanAuthPostureKinds]);
    expect(
      result.self_deploy_packaging_plan.integration_posture_refs.map(
        (ref) => ref.integration_kind,
      ),
    ).toEqual([...selfDeployPackagingPlanIntegrationPostureKinds]);
    expect(
      result.self_deploy_packaging_plan.os_python_posture_refs.map(
        (ref) => ref.posture_kind,
      ),
    ).toEqual([...selfDeployPackagingPlanOsPythonPostureKinds]);
    expect(
      result.self_deploy_packaging_plan.policy_prerequisite_refs.map(
        (ref) => ref.prerequisite_kind,
      ),
    ).toEqual([...selfDeployPackagingPlanPolicyPrerequisiteKinds]);
    expect(
      result.self_deploy_packaging_plan.rollback_refs.map((ref) => ref.rollback_kind),
    ).toEqual([...selfDeployPackagingPlanRollbackKinds]);
    expect(
      result.self_deploy_packaging_plan.validation_command_refs.map(
        (ref) => ref.validation_kind,
      ),
    ).toEqual([...selfDeployPackagingPlanValidationKinds]);
    expect(result.self_deploy_packaging_plan.source_refs).toEqual(
      expect.arrayContaining([
        "docs/architecture/AUTH_AND_INTEGRATION_POSTURE.md",
        "docs/architecture/SUBSTRATES_AND_NODES.md",
        "docs/architecture/SELF_DEPLOY_PACKAGING_PLAN.md",
        "docs/ROADMAP.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
        "docs/reference/CONTRACT_PROVENANCE.md",
      ]),
    );
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on missing self-deploy packaging plan evidence", () => {
    const result = createSelfDeployPackagingPlan({
      deployment_mode_refs: defaultSelfDeployPackagingDeploymentModeRefs.filter(
        (ref) => ref.mode_kind !== "self_hosted_container",
      ),
      artifact_refs: defaultSelfDeployPackagingArtifactRefs.filter(
        (ref) => ref.artifact_kind !== "env_template_ref",
      ),
      auth_posture_refs: defaultSelfDeployPackagingAuthPostureRefs.filter(
        (ref) => ref.auth_kind !== "third_party_auth",
      ),
      integration_posture_refs: defaultSelfDeployPackagingIntegrationPostureRefs.filter(
        (ref) => ref.integration_kind !== "secret_references_only",
      ),
      os_python_posture_refs: defaultSelfDeployPackagingOsPythonPostureRefs.filter(
        (ref) => ref.posture_kind !== "no_os_specific_binary_core_requirement",
      ),
      policy_prerequisite_refs: defaultSelfDeployPackagingPolicyPrerequisiteRefs.filter(
        (ref) => ref.prerequisite_kind !== "bp0193_auth_integration_posture_ref",
      ),
      rollback_refs: defaultSelfDeployPackagingRollbackRefs.filter(
        (ref) => ref.rollback_kind !== "disable_future_installer",
      ),
      validation_command_refs: defaultSelfDeployPackagingValidationCommandRefs.filter(
        (ref) => ref.validation_kind !== "full_workspace_check",
      ),
      source_refs: [
        {
          source_ref: "docs/reference/CONTRACT_PROVENANCE.md",
          summary: "Only BP-0216 packet source is present.",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing self-deploy packaging plan failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "self_deploy_packaging_plan.deployment_mode_ref_required",
          path: "/deployment_mode_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.artifact_ref_required",
          path: "/artifact_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.auth_posture_ref_required",
          path: "/auth_posture_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.integration_posture_ref_required",
          path: "/integration_posture_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.os_python_posture_ref_required",
          path: "/os_python_posture_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.policy_prerequisite_ref_required",
          path: "/policy_prerequisite_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.rollback_ref_required",
          path: "/rollback_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.validation_command_ref_required",
          path: "/validation_command_refs",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.source_ref_required",
          path: "/source_refs",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on drift toward packages, deploy, auth wiring, runtime, DB, or OS scope", () => {
    const result = createSelfDeployPackagingPlan({
      artifact_refs: defaultSelfDeployPackagingArtifactRefs.map((ref) =>
        ref.artifact_kind === "optional_node_agent_package_ref"
          ? {
              ...ref,
              current_state: "installer_ready",
              package_creation_allowed: true,
              package_publish_allowed: true,
              installer_allowed: true,
              binary_build_allowed: true,
              docker_image_allowed: true,
              service_file_allowed: true,
            }
          : ref,
      ) as typeof defaultSelfDeployPackagingArtifactRefs,
      auth_posture_refs: defaultSelfDeployPackagingAuthPostureRefs.map((ref) =>
        ref.auth_kind === "third_party_auth"
          ? {
              ...ref,
              auth_provider_locked: true,
              auth_provider_wiring_allowed: true,
              auth_session_database_allowed: true,
              credential_storage_allowed: true,
            }
          : ref,
      ) as typeof defaultSelfDeployPackagingAuthPostureRefs,
      os_python_posture_refs: defaultSelfDeployPackagingOsPythonPostureRefs.map(
        (ref) =>
          ref.posture_kind === "optional_python_adapter_later"
            ? {
                ...ref,
                python_runtime_required: true,
                os_specific_binary_required: true,
                node_agent_package_built_allowed: true,
              }
            : ref,
      ) as typeof defaultSelfDeployPackagingOsPythonPostureRefs,
      no_live_posture: {
        ...defaultSelfDeployPackagingNoLivePosture,
        deploy_allowed: true,
        docker_runner_allowed: true,
        runtime_dispatcher_allowed: true,
        database_connection_allowed: true,
        auth_provider_wiring_allowed: true,
      } as typeof defaultSelfDeployPackagingNoLivePosture,
      allowed_state: {
        ...defaultSelfDeployPackagingAllowedState,
        auth_provider_locked: true,
        python_runtime_required: true,
        os_specific_binary_required: true,
      } as typeof defaultSelfDeployPackagingAllowedState,
    } as unknown as SelfDeployPackagingPlanRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected blocked self-deploy packaging scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "self_deploy_packaging_plan.invalid_artifact_ref",
          path: "/artifact_refs/7",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.invalid_auth_posture_ref",
          path: "/auth_posture_refs/1",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.invalid_os_python_posture_ref",
          path: "/os_python_posture_refs/2",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.no_live_posture_drift",
          path: "/no_live_posture/deploy_allowed",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.allowed_state_drift",
          path: "/allowed_state/auth_provider_locked",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed on unsafe values, blocked capability flags, unexpected fields, and side effects", () => {
    const result = createSelfDeployPackagingPlan({
      ...defaultSelfDeployPackagingPlan,
      side_effects: ["created-package"],
      package_publish_allowed: true,
      deploy_allowed: true,
      external_service_call_allowed: true,
      source_refs: [
        ...defaultSelfDeployPackagingPlan.source_refs!,
        {
          source_ref: "https://example.invalid/package",
          summary: "deploy to prod with TOKEN=inline-secret and auth provider wiring",
        },
      ],
      unexpected_live_scope: true,
    } as unknown as SelfDeployPackagingPlanRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unsafe self-deploy packaging scope failure");
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "self_deploy_packaging_plan.unexpected_field",
          path: "/unexpected_live_scope",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.blocked_capability_forbidden",
          path: "/package_publish_allowed",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.secret_value_forbidden",
          path: "/",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.deploy_or_infra_forbidden",
          path: "/",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.auth_or_integration_forbidden",
          path: "/",
        }),
        expect.objectContaining({
          code: "self_deploy_packaging_plan.side_effects_forbidden",
          path: "/side_effects",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("TOKEN=inline-secret");
    expect(result.raw_input_content).toBe("withheld");
  });

  it("proves no package, installer, binary, deploy, DB, auth, integration, runtime, or OS artifacts are emitted", () => {
    const result = createSelfDeployPackagingPlan();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected self-deploy packaging plan success");
    }

    expect(result.self_deploy_packaging_plan.package_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.installer_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.binary_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.docker_image_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.service_file_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.deploy_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.runtime_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.database_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.auth_runtime_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.integration_runtime_artifacts).toEqual([]);
    expect(result.self_deploy_packaging_plan.external_service_clients).toEqual([]);
    expect(result.self_deploy_packaging_plan.blocked_capabilities).toEqual([
      ...selfDeployPackagingPlanBlockedCapabilityFlags,
    ]);
    expect(result.self_deploy_packaging_plan.package_creation_allowed).toBe(false);
    expect(result.self_deploy_packaging_plan.package_publish_allowed).toBe(false);
    expect(result.self_deploy_packaging_plan.deploy_allowed).toBe(false);
    expect(result.self_deploy_packaging_plan.auth_provider_wiring_allowed).toBe(false);
    expect(result.self_deploy_packaging_plan.integration_setup_write_allowed).toBe(
      false,
    );
    expect(result.self_deploy_packaging_plan.python_runtime_required).toBe(false);
    expect(result.self_deploy_packaging_plan.os_specific_binary_required).toBe(false);
    expect(result.self_deploy_packaging_plan.side_effects).toEqual([]);
  });
});
