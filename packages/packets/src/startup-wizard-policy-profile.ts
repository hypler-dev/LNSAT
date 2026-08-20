export const STARTUP_WIZARD_POLICY_PROFILE_STATUS = "contract_only";

export const POLICY_PROFILE_CONTRACT_ID = "lnsat.policy_profile.v0_1";
export const SKILLSET_MANIFEST_CONTRACT_ID = "lnsat.skillset_manifest.v0_1";
export const MANAGER_ROLE_MANIFEST_CONTRACT_ID = "lnsat.manager_role_manifest.v0_1";

export const startupWizardPolicyProfileContract = {
  contract_id: POLICY_PROFILE_CONTRACT_ID,
  packet_ref: "BP-0369",
  contract_authority:
    "source_only_startup_wizard_policy_profile_no_auth_db_runtime_or_mutation",
  companion_contract_ids: [
    SKILLSET_MANIFEST_CONTRACT_ID,
    MANAGER_ROLE_MANIFEST_CONTRACT_ID,
  ],
  side_effects: [],
  status: "source_only",
} as const;

export const controlLevelIds = [
  "observe",
  "assist",
  "managed_autonomy",
  "strict",
  "locked_down",
] as const;

export const startupWizardDeploymentModes = [
  "local_single_user",
  "self_hosted_team",
  "air_gapped_offline",
  "hosted_cloud_later",
] as const;

export const startupWizardBlockedFlags = [
  "auth_provider_wiring_allowed",
  "storage_write_allowed",
  "network_exposure_mutation_allowed",
  "policy_activation_allowed",
  "agent_policy_activation_allowed",
  "connector_secret_capture_allowed",
  "runtime_dispatch_allowed",
  "live_execution_allowed",
  "database_connection_allowed",
  "database_write_allowed",
  "service_mutation_allowed",
  "queue_mutation_allowed",
  "dns_cloudflare_mutation_allowed",
  "ssh_allowed",
  "docker_runner_allowed",
  "node_agent_allowed",
  "git_command_runner_allowed",
  "package_mutation_allowed",
] as const;

export const startupWizardForbiddenCapabilities = [
  "secret.read.never",
  "ssh",
  "root",
  "database.write",
  "database.prod.write",
  "billing.write",
  "security.write",
  "destructive.execute",
] as const;

export const startupWizardSkillsetIds = [
  "source-review",
  "test-runner",
  "deploy-preflight",
  "db-migration-review",
  "incident-triage",
  "connector-setup",
] as const;

export type StartupWizardDeploymentMode = (typeof startupWizardDeploymentModes)[number];
export type ControlLevelId = (typeof controlLevelIds)[number];
export type StartupWizardBlockedFlag = (typeof startupWizardBlockedFlags)[number];
export type StartupWizardForbiddenCapability =
  (typeof startupWizardForbiddenCapabilities)[number];
export type StartupWizardSkillsetId = (typeof startupWizardSkillsetIds)[number];
export type StartupWizardPolicyMode = "allowed" | "approval_required" | "blocked";
export type StartupWizardActorType = "human" | "agent";
export type StartupWizardManagerRoleId =
  | "owner"
  | "admin"
  | "approver"
  | "auditor"
  | "operator"
  | "viewer"
  | "policy_reviewer"
  | "evidence_compiler"
  | "approval_triage"
  | "audit_reviewer";

export type StartupWizardControlLevel = {
  id: ControlLevelId;
  label: string;
  position: number;
  convenience_label: string;
  summary: string;
  allowed_capabilities: string[];
  approval_required_capabilities: string[];
  blocked_capabilities: string[];
  notifications: "access_tracking" | "access_and_decision_tracking";
  audit_level: "standard" | "high" | "maximum";
  exact_consequences: string[];
  no_fully_open_autonomy: true;
};

export type StartupWizardManagerRole = {
  contract_id: typeof MANAGER_ROLE_MANIFEST_CONTRACT_ID;
  role_id: StartupWizardManagerRoleId;
  actor_type: StartupWizardActorType;
  label: string;
  can_approve: string[];
  can_draft_policy: boolean;
  can_activate_policy: boolean;
  can_grant_self_authority: false;
  audit_obligations: string[];
};

export type StartupWizardSkillsetManifest = {
  contract_id: typeof SKILLSET_MANIFEST_CONTRACT_ID;
  skillset_id: StartupWizardSkillsetId;
  label: string;
  template_state: "template_not_blank_json";
  capabilities: string[];
  tools: string[];
  allowed_resources: string[];
  blocked_resources: string[];
  approval_needs: string[];
  audit_obligations: string[];
  rollback_expectations: string[];
};

export type StartupWizardPolicyRule = {
  rule_id: string;
  capability: string;
  actor_type: StartupWizardActorType;
  resource_scope: string;
  risk_tier: "low" | "medium" | "high" | "forbidden";
  allowed_mode: StartupWizardPolicyMode;
  approval_manager: StartupWizardManagerRoleId | null;
  notification_target: StartupWizardManagerRoleId;
  audit_level: "access" | "decision" | "high_detail";
  rollback_requirement: "none" | "proposal_only" | "required_before_execution";
};

export type StartupWizardGeneratedViews = {
  markdown_summary: string;
  json_schema: {
    $id: "lnsat.policy_profile.v0_1.schema.json";
    type: "object";
    required: string[];
    properties: Record<string, unknown>;
    additionalProperties: false;
  };
  mcp_capability_descriptors: Array<{
    descriptor_id: string;
    skillset_id: StartupWizardSkillsetId;
    capabilities: string[];
    allowed_resources: string[];
    blocked_resources: string[];
    approval_needs: string[];
  }>;
  agent_context_snippets: string[];
};

export type StartupWizardPolicyProfile = {
  contract_id: typeof POLICY_PROFILE_CONTRACT_ID;
  packet_ref: "BP-0369";
  profile_id: "startup_wizard_source_preview";
  deployment_modes: StartupWizardDeploymentMode[];
  selected_deployment_mode: StartupWizardDeploymentMode;
  control_levels: StartupWizardControlLevel[];
  selected_control_level: ControlLevelId;
  managers: StartupWizardManagerRole[];
  skillsets: StartupWizardSkillsetManifest[];
  policy_rules: StartupWizardPolicyRule[];
  generated_views: StartupWizardGeneratedViews;
  no_live_posture: Record<StartupWizardBlockedFlag, false>;
  blocked_capabilities: StartupWizardBlockedFlag[];
  secret_values: [];
  auth_provider_wiring: [];
  storage_writes: [];
  network_exposure_mutations: [];
  policy_activations: [];
  runtime_dispatches: [];
  live_executions: [];
  database_connections: [];
  database_writes: [];
  external_service_calls: [];
  side_effects: [];
};

export type StartupWizardPolicyProfileRequest = {
  selected_deployment_mode?: StartupWizardDeploymentMode;
  selected_control_level?: ControlLevelId;
  control_levels?: StartupWizardControlLevel[];
  managers?: StartupWizardManagerRole[];
  skillsets?: StartupWizardSkillsetManifest[];
  policy_rules?: StartupWizardPolicyRule[];
  no_live_posture?: Record<StartupWizardBlockedFlag, false>;
  side_effects?: string[];
  [key: string]: unknown;
};

export type StartupWizardPolicyProfileErrorCode =
  | "startup_wizard.unexpected_field"
  | "startup_wizard.deployment_mode_invalid"
  | "startup_wizard.control_level_invalid"
  | "startup_wizard.manager_required"
  | "startup_wizard.agent_policy_activation_forbidden"
  | "startup_wizard.policy_rule_invalid"
  | "startup_wizard.unknown_capability_denied"
  | "startup_wizard.approval_manager_required"
  | "startup_wizard.forbidden_capability_allowed"
  | "startup_wizard.secret_value_forbidden"
  | "startup_wizard.no_live_posture_drift"
  | "startup_wizard.blocked_capability_drift"
  | "startup_wizard.side_effects_forbidden";

export type StartupWizardPolicyProfileError = {
  code: StartupWizardPolicyProfileErrorCode;
  path: string;
  message: string;
};

export type StartupWizardPolicyProfileResult =
  | {
      ok: true;
      policy_profile: StartupWizardPolicyProfile;
      side_effects: [];
    }
  | {
      ok: false;
      errors: StartupWizardPolicyProfileError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

const knownCapabilityPattern =
  /^(read|inspect|notify|analyze|proposal|stage|execute|deploy|database|connector|incident|audit|policy|test|source|rollback)\.[a-z0-9.*_-]+$/;

const unsafeTextPattern =
  /(secret:|password|api[_ -]?key|private[_ -]?key|bearer |token|sk-[a-z0-9]|-----BEGIN|DATABASE_URL|postgres:\/\/|mysql:\/\/|mongodb:\/\/|ssh-rsa|ghp_|npm_[a-z0-9]|cloudflare[_ -]?token|wrangler secret)/i;

export const defaultStartupWizardControlLevels: StartupWizardControlLevel[] = [
  {
    id: "observe",
    label: "Observe",
    position: 0,
    convenience_label: "Maximum visibility, no mutation.",
    summary: "Read, inspect, notify, and track access. All mutation blocked.",
    allowed_capabilities: ["read.*", "inspect.*", "notify.*"],
    approval_required_capabilities: [],
    blocked_capabilities: ["stage.*", "execute.*", "deploy.*", "database.write"],
    notifications: "access_tracking",
    audit_level: "standard",
    exact_consequences: [
      "Reads and inspections allowed.",
      "Notifications show what accessed what.",
      "All mutation, staging, execution, deploy, DB write, SSH, Docker, and node-agent scopes blocked.",
    ],
    no_fully_open_autonomy: true,
  },
  {
    id: "assist",
    label: "Assist",
    position: 1,
    convenience_label: "Looseest v1 mode with tracking.",
    summary:
      "Low-risk local analysis and proposals allowed; staging and mutation blocked.",
    allowed_capabilities: [
      "read.*",
      "inspect.*",
      "notify.*",
      "analyze.local",
      "proposal.draft",
    ],
    approval_required_capabilities: ["stage.preview"],
    blocked_capabilities: ["execute.*", "deploy.*", "database.write"],
    notifications: "access_and_decision_tracking",
    audit_level: "standard",
    exact_consequences: [
      "Agents can analyze and draft proposals.",
      "Staging needs approval and remains preview-only in source v1.",
      "No fully open autonomy; execution and mutation remain blocked.",
    ],
    no_fully_open_autonomy: true,
  },
  {
    id: "managed_autonomy",
    label: "Managed Autonomy",
    position: 2,
    convenience_label: "Agents prepare work; humans approve execution.",
    summary:
      "Agents can propose and stage bounded tasks; execution requires human approval.",
    allowed_capabilities: [
      "read.*",
      "inspect.*",
      "notify.*",
      "analyze.local",
      "proposal.draft",
    ],
    approval_required_capabilities: [
      "stage.preview",
      "execute.approved",
      "rollback.verify",
    ],
    blocked_capabilities: ["execute.unapproved", "secret.read.never", "root"],
    notifications: "access_and_decision_tracking",
    audit_level: "high",
    exact_consequences: [
      "Bounded staging can be prepared for review.",
      "Human or human manager approval required before execution.",
      "Rollback evidence required before approved execution can be considered later.",
    ],
    no_fully_open_autonomy: true,
  },
  {
    id: "strict",
    label: "Strict",
    position: 3,
    convenience_label: "Most actions approval-gated.",
    summary: "Approvals required for staging and execution with tight allowlists.",
    allowed_capabilities: ["read.allowlisted", "inspect.allowlisted", "notify.*"],
    approval_required_capabilities: [
      "analyze.local",
      "proposal.draft",
      "stage.preview",
      "execute.approved",
    ],
    blocked_capabilities: ["resource.unlisted", "secret.read.never", "root"],
    notifications: "access_and_decision_tracking",
    audit_level: "high",
    exact_consequences: [
      "Only allowlisted source and resource scopes are visible.",
      "Staging and execution require approval.",
      "Audit detail is high for access and policy decisions.",
    ],
    no_fully_open_autonomy: true,
  },
  {
    id: "locked_down",
    label: "Locked Down",
    position: 4,
    convenience_label: "Read-only default, owner override only.",
    summary: "Read-only except emergency owner-approved override path.",
    allowed_capabilities: ["read.allowlisted", "inspect.allowlisted", "notify.owner"],
    approval_required_capabilities: ["emergency.owner_override"],
    blocked_capabilities: [
      "stage.*",
      "execute.*",
      "deploy.*",
      "database.write",
      "resource.unlisted",
    ],
    notifications: "access_and_decision_tracking",
    audit_level: "maximum",
    exact_consequences: [
      "Read-only default.",
      "Owner-only emergency override path is visible but not activated.",
      "Emergency disable status must stay visible.",
    ],
    no_fully_open_autonomy: true,
  },
];

export const defaultStartupWizardManagers: StartupWizardManagerRole[] = [
  humanManager("owner", "Owner", ["all_policy_changes", "emergency_override"], true),
  humanManager("admin", "Admin", ["policy_activation", "staging", "execution"], true),
  humanManager("approver", "Approver", ["staging", "execution"], false),
  humanManager("auditor", "Auditor", ["audit_review"], false),
  humanManager("operator", "Operator", ["low_risk_operations"], false),
  humanManager("viewer", "Viewer", [], false),
  agentManager("policy_reviewer", "Policy reviewer", ["policy_review"]),
  agentManager("evidence_compiler", "Evidence compiler", ["evidence_compilation"]),
  agentManager("approval_triage", "Approval triage", ["approval_triage"]),
  agentManager("audit_reviewer", "Audit reviewer", ["audit_review"]),
];

export const defaultStartupWizardSkillsets: StartupWizardSkillsetManifest[] = [
  skillset(
    "source-review",
    "Source review",
    ["source.read", "source.diff.inspect", "proposal.draft"],
    ["repo_files"],
    ["secrets", "git_mutation"],
  ),
  skillset(
    "test-runner",
    "Test runner",
    ["test.plan", "test.command.preview", "test.result.inspect"],
    ["package_scripts"],
    ["package_install", "docker_runner"],
  ),
  skillset(
    "deploy-preflight",
    "Deploy preflight",
    ["deploy.plan.inspect", "release.evidence.compile"],
    ["release_docs"],
    ["deploy.execute", "dns_cloudflare_mutation"],
  ),
  skillset(
    "db-migration-review",
    "DB migration review",
    ["database.migration.inspect", "rollback.plan.review"],
    ["migration_files"],
    ["database.write", "database_connection"],
  ),
  skillset(
    "incident-triage",
    "Incident triage",
    ["incident.inspect", "audit.read", "proposal.draft"],
    ["logs_as_evidence_refs"],
    ["service_restart", "ssh"],
  ),
  skillset(
    "connector-setup",
    "Connector setup",
    ["connector.manifest.inspect", "policy.proposal.draft"],
    ["connector_manifests"],
    ["connector_secret_capture", "external_service_call"],
  ),
];

export const defaultStartupWizardPolicyRules: StartupWizardPolicyRule[] = [
  rule(
    "read.inspect",
    "read.*",
    "agent",
    "repo_source",
    "low",
    "allowed",
    null,
    "auditor",
    "access",
    "none",
  ),
  rule(
    "notify.access",
    "notify.*",
    "agent",
    "control_panel",
    "low",
    "allowed",
    null,
    "operator",
    "access",
    "none",
  ),
  rule(
    "proposal.draft",
    "proposal.draft",
    "agent",
    "policy_and_skillsets",
    "low",
    "allowed",
    null,
    "approver",
    "decision",
    "proposal_only",
  ),
  rule(
    "stage.preview",
    "stage.preview",
    "agent",
    "bounded_task",
    "medium",
    "approval_required",
    "approver",
    "approver",
    "decision",
    "proposal_only",
  ),
  rule(
    "execute.approved",
    "execute.approved",
    "agent",
    "bounded_task",
    "high",
    "approval_required",
    "admin",
    "auditor",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "policy.activate",
    "policy.activate",
    "human",
    "policy_profile",
    "high",
    "approval_required",
    "owner",
    "auditor",
    "high_detail",
    "none",
  ),
  rule(
    "database.write",
    "database.write",
    "agent",
    "database",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "database.prod.write",
    "database.prod.write",
    "agent",
    "production_database",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "secret.read.never",
    "secret.read.never",
    "agent",
    "secret_values",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "none",
  ),
  rule(
    "ssh",
    "ssh",
    "agent",
    "host",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "root",
    "root",
    "agent",
    "host",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "billing.write",
    "billing.write",
    "agent",
    "billing",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "security.write",
    "security.write",
    "agent",
    "security_controls",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
  rule(
    "destructive.execute",
    "destructive.execute",
    "agent",
    "all_resources",
    "forbidden",
    "blocked",
    null,
    "owner",
    "high_detail",
    "required_before_execution",
  ),
];

export const defaultStartupWizardNoLivePosture = Object.fromEntries(
  startupWizardBlockedFlags.map((flag) => [flag, false]),
) as Record<StartupWizardBlockedFlag, false>;

export const defaultStartupWizardPolicyProfileRequest: StartupWizardPolicyProfileRequest =
  {
    selected_deployment_mode: "local_single_user",
    selected_control_level: "assist",
    control_levels: defaultStartupWizardControlLevels,
    managers: defaultStartupWizardManagers,
    skillsets: defaultStartupWizardSkillsets,
    policy_rules: defaultStartupWizardPolicyRules,
    no_live_posture: defaultStartupWizardNoLivePosture,
    side_effects: [],
  };

const expectedRequestKeys = new Set([
  "selected_deployment_mode",
  "selected_control_level",
  "control_levels",
  "managers",
  "skillsets",
  "policy_rules",
  "no_live_posture",
  "side_effects",
  ...startupWizardBlockedFlags,
]);

export function createStartupWizardPolicyProfile(
  request: StartupWizardPolicyProfileRequest = {},
): StartupWizardPolicyProfileResult {
  const merged = { ...defaultStartupWizardPolicyProfileRequest, ...request };
  const errors: StartupWizardPolicyProfileError[] = [];

  for (const key of Object.keys(request)) {
    if (!expectedRequestKeys.has(key)) {
      errors.push(
        error(
          "startup_wizard.unexpected_field",
          `/${key}`,
          "Unexpected startup wizard field.",
        ),
      );
    }
  }

  if (
    !startupWizardDeploymentModes.includes(
      merged.selected_deployment_mode as StartupWizardDeploymentMode,
    )
  ) {
    errors.push(
      error(
        "startup_wizard.deployment_mode_invalid",
        "/selected_deployment_mode",
        "Startup wizard deployment mode is not allowed.",
      ),
    );
  }

  if (!controlLevelIds.includes(merged.selected_control_level as ControlLevelId)) {
    errors.push(
      error(
        "startup_wizard.control_level_invalid",
        "/selected_control_level",
        "Startup wizard control level is not allowed.",
      ),
    );
  }

  validateManagers(merged.managers, errors);
  validateSkillsets(merged.skillsets, errors);
  validatePolicyRules(merged.policy_rules, merged.managers, errors);
  validateNoLivePosture(merged, errors);
  validateUnsafeText(merged, errors);

  if ((merged.side_effects ?? []).length > 0) {
    errors.push(
      error(
        "startup_wizard.side_effects_forbidden",
        "/side_effects",
        "Startup wizard contract must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw_input_content: "withheld", side_effects: [] };
  }

  const controlLevels = merged.control_levels ?? defaultStartupWizardControlLevels;
  const managers = merged.managers ?? defaultStartupWizardManagers;
  const skillsets = merged.skillsets ?? defaultStartupWizardSkillsets;
  const policyRules = merged.policy_rules ?? defaultStartupWizardPolicyRules;

  return {
    ok: true,
    policy_profile: {
      contract_id: POLICY_PROFILE_CONTRACT_ID,
      packet_ref: "BP-0369",
      profile_id: "startup_wizard_source_preview",
      deployment_modes: [...startupWizardDeploymentModes],
      selected_deployment_mode: merged.selected_deployment_mode ?? "local_single_user",
      control_levels: controlLevels,
      selected_control_level: merged.selected_control_level ?? "assist",
      managers,
      skillsets,
      policy_rules: policyRules,
      generated_views: generatedViews(controlLevels, managers, skillsets, policyRules),
      no_live_posture: merged.no_live_posture ?? defaultStartupWizardNoLivePosture,
      blocked_capabilities: [...startupWizardBlockedFlags],
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
    },
    side_effects: [],
  };
}

function humanManager(
  role_id: Extract<
    StartupWizardManagerRoleId,
    "owner" | "admin" | "approver" | "auditor" | "operator" | "viewer"
  >,
  label: string,
  can_approve: string[],
  can_activate_policy: boolean,
): StartupWizardManagerRole {
  return {
    contract_id: MANAGER_ROLE_MANIFEST_CONTRACT_ID,
    role_id,
    actor_type: "human",
    label,
    can_approve,
    can_draft_policy: true,
    can_activate_policy,
    can_grant_self_authority: false,
    audit_obligations: ["access_review", "policy_decision_review"],
  };
}

function agentManager(
  role_id: Extract<
    StartupWizardManagerRoleId,
    "policy_reviewer" | "evidence_compiler" | "approval_triage" | "audit_reviewer"
  >,
  label: string,
  can_approve: string[],
): StartupWizardManagerRole {
  return {
    contract_id: MANAGER_ROLE_MANIFEST_CONTRACT_ID,
    role_id,
    actor_type: "agent",
    label,
    can_approve,
    can_draft_policy: true,
    can_activate_policy: false,
    can_grant_self_authority: false,
    audit_obligations: ["recommendation_trace", "human_activation_required"],
  };
}

function skillset(
  skillset_id: StartupWizardSkillsetId,
  label: string,
  capabilities: string[],
  allowed_resources: string[],
  blocked_resources: string[],
): StartupWizardSkillsetManifest {
  return {
    contract_id: SKILLSET_MANIFEST_CONTRACT_ID,
    skillset_id,
    label,
    template_state: "template_not_blank_json",
    capabilities,
    tools: ["gateway_policy_preview", "evidence_export_preview"],
    allowed_resources,
    blocked_resources,
    approval_needs: ["human_manager_for_staging_or_execution"],
    audit_obligations: ["access_tracking", "policy_decision_tracking"],
    rollback_expectations: ["rollback_plan_required_before_execution"],
  };
}

function rule(
  rule_id: string,
  capability: string,
  actor_type: StartupWizardActorType,
  resource_scope: string,
  risk_tier: StartupWizardPolicyRule["risk_tier"],
  allowed_mode: StartupWizardPolicyMode,
  approval_manager: StartupWizardManagerRoleId | null,
  notification_target: StartupWizardManagerRoleId,
  audit_level: StartupWizardPolicyRule["audit_level"],
  rollback_requirement: StartupWizardPolicyRule["rollback_requirement"],
): StartupWizardPolicyRule {
  return {
    rule_id,
    capability,
    actor_type,
    resource_scope,
    risk_tier,
    allowed_mode,
    approval_manager,
    notification_target,
    audit_level,
    rollback_requirement,
  };
}

function validateManagers(
  managers: StartupWizardManagerRole[] | undefined,
  errors: StartupWizardPolicyProfileError[],
): void {
  if (!Array.isArray(managers)) {
    errors.push(
      error(
        "startup_wizard.manager_required",
        "/managers",
        "Startup wizard manager role manifest is required.",
      ),
    );
    return;
  }
  const roleIds = new Set(managers.map((manager) => manager.role_id));
  for (const roleId of defaultStartupWizardManagers.map((manager) => manager.role_id)) {
    if (!roleIds.has(roleId)) {
      errors.push(
        error(
          "startup_wizard.manager_required",
          "/managers",
          "Startup wizard manager roles are incomplete.",
        ),
      );
      return;
    }
  }
  for (const [index, manager] of managers.entries()) {
    if (manager.actor_type === "agent" && manager.can_activate_policy) {
      errors.push(
        error(
          "startup_wizard.agent_policy_activation_forbidden",
          `/managers/${index}/can_activate_policy`,
          "Agent managers may draft, review, triage, and recommend, but cannot activate policy.",
        ),
      );
    }
    if (manager.can_grant_self_authority !== false) {
      errors.push(
        error(
          "startup_wizard.agent_policy_activation_forbidden",
          `/managers/${index}/can_grant_self_authority`,
          "Managers cannot grant themselves authority.",
        ),
      );
    }
  }
}

function validateSkillsets(
  skillsets: StartupWizardSkillsetManifest[] | undefined,
  errors: StartupWizardPolicyProfileError[],
): void {
  if (!Array.isArray(skillsets)) {
    errors.push(
      error(
        "startup_wizard.policy_rule_invalid",
        "/skillsets",
        "Startup wizard skillset manifests are required.",
      ),
    );
    return;
  }
  const skillsetIds = new Set(skillsets.map((skillset) => skillset.skillset_id));
  for (const skillsetId of startupWizardSkillsetIds) {
    if (!skillsetIds.has(skillsetId)) {
      errors.push(
        error(
          "startup_wizard.policy_rule_invalid",
          "/skillsets",
          "Startup wizard skillset manifests must include all default templates.",
        ),
      );
      return;
    }
  }
}

function validatePolicyRules(
  rules: StartupWizardPolicyRule[] | undefined,
  managers: StartupWizardManagerRole[] | undefined,
  errors: StartupWizardPolicyProfileError[],
): void {
  if (!Array.isArray(rules)) {
    errors.push(
      error(
        "startup_wizard.policy_rule_invalid",
        "/policy_rules",
        "Startup wizard policy rules are required.",
      ),
    );
    return;
  }
  const managerIds = new Set((managers ?? []).map((manager) => manager.role_id));
  for (const [index, policyRule] of rules.entries()) {
    const path = `/policy_rules/${index}`;
    if (!knownCapability(policyRule.capability)) {
      errors.push(
        error(
          "startup_wizard.unknown_capability_denied",
          `${path}/capability`,
          "Unknown capability is denied by default.",
        ),
      );
    }
    if (
      startupWizardForbiddenCapabilities.includes(
        policyRule.capability as StartupWizardForbiddenCapability,
      ) &&
      policyRule.allowed_mode !== "blocked"
    ) {
      errors.push(
        error(
          "startup_wizard.forbidden_capability_allowed",
          `${path}/allowed_mode`,
          "Forbidden capability cannot be enabled by any loose slider preset.",
        ),
      );
    }
    if (policyRule.allowed_mode === "approval_required") {
      if (
        policyRule.approval_manager === null ||
        !managerIds.has(policyRule.approval_manager)
      ) {
        errors.push(
          error(
            "startup_wizard.approval_manager_required",
            `${path}/approval_manager`,
            "Approval-required policy rule needs a human manager route.",
          ),
        );
      }
      const manager = (managers ?? []).find(
        (candidate) => candidate.role_id === policyRule.approval_manager,
      );
      if (manager?.actor_type === "agent") {
        errors.push(
          error(
            "startup_wizard.approval_manager_required",
            `${path}/approval_manager`,
            "Agent manager cannot be the final approval authority.",
          ),
        );
      }
    }
  }
}

function validateNoLivePosture(
  request: StartupWizardPolicyProfileRequest,
  errors: StartupWizardPolicyProfileError[],
): void {
  const posture = request.no_live_posture;
  if (!posture) {
    errors.push(
      error(
        "startup_wizard.no_live_posture_drift",
        "/no_live_posture",
        "Startup wizard source-only preview requires no-live posture.",
      ),
    );
    return;
  }
  for (const flag of startupWizardBlockedFlags) {
    if (posture[flag] !== false) {
      errors.push(
        error(
          "startup_wizard.no_live_posture_drift",
          `/no_live_posture/${flag}`,
          "Startup wizard no-live posture drifted.",
        ),
      );
    }
    if (request[flag] !== undefined && request[flag] !== false) {
      errors.push(
        error(
          "startup_wizard.blocked_capability_drift",
          `/${flag}`,
          "Startup wizard blocked capability drifted.",
        ),
      );
    }
  }
}

function validateUnsafeText(
  value: unknown,
  errors: StartupWizardPolicyProfileError[],
  path = "",
): void {
  if (typeof value === "string" && unsafeTextPattern.test(value)) {
    errors.push(
      error(
        "startup_wizard.secret_value_forbidden",
        path || "/",
        "Secret-like values are rejected and raw input is withheld.",
      ),
    );
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateUnsafeText(item, errors, `${path}/${index}`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      validateUnsafeText(item, errors, `${path}/${key}`);
    }
  }
}

function knownCapability(capability: string): boolean {
  return (
    startupWizardForbiddenCapabilities.includes(
      capability as StartupWizardForbiddenCapability,
    ) || knownCapabilityPattern.test(capability)
  );
}

function generatedViews(
  controlLevels: StartupWizardControlLevel[],
  managers: StartupWizardManagerRole[],
  skillsets: StartupWizardSkillsetManifest[],
  policyRules: StartupWizardPolicyRule[],
): StartupWizardGeneratedViews {
  return {
    markdown_summary: [
      "# LNSAT Startup Wizard Policy Profile",
      "",
      `Canonical manifest: ${POLICY_PROFILE_CONTRACT_ID}`,
      `Control levels: ${controlLevels.map((level) => level.label).join(", ")}`,
      `Managers: ${managers.map((manager) => `${manager.label} (${manager.actor_type})`).join(", ")}`,
      `Skillsets: ${skillsets.map((skillset) => skillset.skillset_id).join(", ")}`,
      "Agent managers can review, draft, triage, and recommend. Human managers activate policy.",
      "No secret values, live execution, database writes, DNS mutation, SSH, Docker runner, node-agent, or package mutation are enabled.",
    ].join("\n"),
    json_schema: {
      $id: "lnsat.policy_profile.v0_1.schema.json",
      type: "object",
      required: [
        "contract_id",
        "control_levels",
        "managers",
        "skillsets",
        "policy_rules",
      ],
      additionalProperties: false,
      properties: {
        contract_id: { const: POLICY_PROFILE_CONTRACT_ID },
        selected_control_level: { enum: controlLevelIds },
        managers: { type: "array" },
        skillsets: { type: "array" },
        policy_rules: { type: "array" },
      },
    },
    mcp_capability_descriptors: skillsets.map((skillset) => ({
      descriptor_id: `mcp_descriptor:${skillset.skillset_id}`,
      skillset_id: skillset.skillset_id,
      capabilities: skillset.capabilities,
      allowed_resources: skillset.allowed_resources,
      blocked_resources: skillset.blocked_resources,
      approval_needs: skillset.approval_needs,
    })),
    agent_context_snippets: [
      "Read canonical JSON manifest first: lnsat.policy_profile.v0_1.",
      "Treat unknown capability as denied.",
      "Agent managers may draft recommendations but cannot activate policy or grant themselves authority.",
      `Policy rows: ${policyRules.map((policyRule) => `${policyRule.capability}=${policyRule.allowed_mode}`).join("; ")}`,
    ],
  };
}

function error(
  code: StartupWizardPolicyProfileErrorCode,
  path: string,
  message: string,
): StartupWizardPolicyProfileError {
  return { code, path, message };
}
