import { describe, expect, it } from "vitest";
import {
  createStartupWizardPolicyProfile,
  defaultStartupWizardManagers,
  defaultStartupWizardNoLivePosture,
  defaultStartupWizardPolicyRules,
  POLICY_PROFILE_CONTRACT_ID,
  SKILLSET_MANIFEST_CONTRACT_ID,
  MANAGER_ROLE_MANIFEST_CONTRACT_ID,
  startupWizardBlockedFlags,
  startupWizardForbiddenCapabilities,
  startupWizardSkillsetIds,
  type StartupWizardPolicyProfileRequest,
} from "../src/index.js";

describe("startup wizard policy profile", () => {
  it("emits BP-0369 canonical policy, skillset, and manager manifests", () => {
    const result = createStartupWizardPolicyProfile();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected startup wizard policy profile success");
    }

    expect(result.policy_profile).toMatchObject({
      contract_id: POLICY_PROFILE_CONTRACT_ID,
      packet_ref: "BP-0369",
      profile_id: "startup_wizard_source_preview",
      selected_deployment_mode: "local_single_user",
      selected_control_level: "assist",
      secret_values: [],
      auth_provider_wiring: [],
      storage_writes: [],
      network_exposure_mutations: [],
      policy_activations: [],
      runtime_dispatches: [],
      live_executions: [],
      database_connections: [],
      database_writes: [],
      external_service_calls: [],
      side_effects: [],
    });
    expect(result.policy_profile.control_levels.map((level) => level.id)).toEqual([
      "observe",
      "assist",
      "managed_autonomy",
      "strict",
      "locked_down",
    ]);
    expect(
      result.policy_profile.control_levels.every(
        (level) => level.no_fully_open_autonomy === true,
      ),
    ).toBe(true);
    expect(
      result.policy_profile.skillsets.map((skillset) => skillset.skillset_id),
    ).toEqual([...startupWizardSkillsetIds]);
    expect(
      result.policy_profile.skillsets.every(
        (skillset) =>
          skillset.contract_id === SKILLSET_MANIFEST_CONTRACT_ID &&
          skillset.template_state === "template_not_blank_json",
      ),
    ).toBe(true);
    expect(
      result.policy_profile.managers.every(
        (manager) => manager.contract_id === MANAGER_ROLE_MANIFEST_CONTRACT_ID,
      ),
    ).toBe(true);
    expect(result.policy_profile.blocked_capabilities).toEqual([
      ...startupWizardBlockedFlags,
    ]);
    expect(result.side_effects).toEqual([]);
  });

  it("generates human, schema, MCP descriptor, and agent context views from the manifest", () => {
    const result = createStartupWizardPolicyProfile();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected startup wizard generated view success");
    }

    expect(result.policy_profile.generated_views.markdown_summary).toContain(
      POLICY_PROFILE_CONTRACT_ID,
    );
    expect(result.policy_profile.generated_views.json_schema).toMatchObject({
      $id: "lnsat.policy_profile.v0_1.schema.json",
      additionalProperties: false,
    });
    expect(
      result.policy_profile.generated_views.mcp_capability_descriptors.map(
        (descriptor) => descriptor.skillset_id,
      ),
    ).toEqual([...startupWizardSkillsetIds]);
    expect(result.policy_profile.generated_views.agent_context_snippets).toEqual(
      expect.arrayContaining([
        "Treat unknown capability as denied.",
        "Agent managers may draft recommendations but cannot activate policy or grant themselves authority.",
      ]),
    );
  });

  it("fails closed when unknown capability is added", () => {
    const result = createStartupWizardPolicyProfile({
      policy_rules: [
        ...defaultStartupWizardPolicyRules,
        {
          ...defaultStartupWizardPolicyRules[0],
          rule_id: "unknown.capability",
          capability: "mystery.power",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unknown capability failure");
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "startup_wizard.unknown_capability_denied",
        }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
  });

  it("fails closed when approval-required action lacks a human manager", () => {
    const result = createStartupWizardPolicyProfile({
      policy_rules: defaultStartupWizardPolicyRules.map((policyRule) =>
        policyRule.rule_id === "stage.preview"
          ? { ...policyRule, approval_manager: null }
          : policyRule,
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected missing manager failure");
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "startup_wizard.approval_manager_required",
        }),
      ]),
    );
  });

  it("fails closed when agent manager can activate policy", () => {
    const result = createStartupWizardPolicyProfile({
      managers: defaultStartupWizardManagers.map((manager) =>
        manager.role_id === "policy_reviewer"
          ? { ...manager, can_activate_policy: true }
          : manager,
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected agent policy activation failure");
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "startup_wizard.agent_policy_activation_forbidden",
        }),
      ]),
    );
  });

  it("fails closed when loose slider enables forbidden capabilities", () => {
    const result = createStartupWizardPolicyProfile({
      selected_control_level: "assist",
      policy_rules: defaultStartupWizardPolicyRules.map((policyRule) =>
        policyRule.capability === "secret.read.never"
          ? { ...policyRule, allowed_mode: "allowed" }
          : policyRule,
      ),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected forbidden capability failure");
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "startup_wizard.forbidden_capability_allowed",
        }),
      ]),
    );
    for (const capability of startupWizardForbiddenCapabilities) {
      expect(JSON.stringify(createStartupWizardPolicyProfile())).toContain(capability);
    }
  });

  it("rejects secret-like values and does not echo raw input", () => {
    const result = createStartupWizardPolicyProfile({
      policy_rules: [
        ...defaultStartupWizardPolicyRules,
        {
          ...defaultStartupWizardPolicyRules[0],
          rule_id: "secret.leak",
          capability: "read.secret:lnsat/demo/api-token",
        },
      ],
      unexpected_payload: "password=hunter2",
    } as unknown as StartupWizardPolicyProfileRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected secret-like value failure");
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "startup_wizard.secret_value_forbidden" }),
        expect.objectContaining({ code: "startup_wizard.unexpected_field" }),
      ]),
    );
    expect(result.raw_input_content).toBe("withheld");
    expect(JSON.stringify(result)).not.toContain("hunter2");
    expect(JSON.stringify(result)).not.toContain("secret:lnsat/demo/api-token");
    expect(result.side_effects).toEqual([]);
  });

  it("fails closed on live posture drift and side effects", () => {
    const result = createStartupWizardPolicyProfile({
      no_live_posture: {
        ...defaultStartupWizardNoLivePosture,
        database_write_allowed: true,
      },
      runtime_dispatch_allowed: true,
      side_effects: ["activate policy"],
    } as unknown as StartupWizardPolicyProfileRequest);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected no-live posture failure");
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "startup_wizard.no_live_posture_drift" }),
        expect.objectContaining({
          code: "startup_wizard.blocked_capability_drift",
        }),
        expect.objectContaining({ code: "startup_wizard.side_effects_forbidden" }),
      ]),
    );
  });
});
