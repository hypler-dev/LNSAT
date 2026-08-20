export const AGENT_CONTEXT_FIREWALL_STATUS = "read_only_inspection";

export const agentContextFirewallContract = {
  contract_id: "lnsat.agent.context_firewall.v0_1",
  firewall_levels: ["open", "guided", "guarded", "strict", "extra_strict"],
  permission_modes: [
    "allowed",
    "preview_only",
    "redacted",
    "approval_required",
    "blocked",
  ],
  provider_kinds: [
    "commercial_api",
    "local_model",
    "subscription_seat",
    "cli_adapter",
    "human",
  ],
  agent_kinds: [
    "internal_delegation_broker",
    "coding_agent",
    "review_agent",
    "research_agent",
    "test_agent",
    "ops_agent",
    "workflow_worker",
    "human_supervised_seat",
  ],
  context_source_families: [
    "agent_instructions",
    "skills",
    "packet_scope",
    "policy_profile",
    "permission_profile",
    "provider_profile",
    "repo_files",
    "docs",
    "tickets",
    "conversations",
    "runtime_signals",
    "operator_inputs",
  ],
  context_data_classes: [
    "public",
    "internal",
    "sensitive",
    "secret",
    "production_customer",
  ],
  context_decisions: [
    "include",
    "include_redacted",
    "include_summary_only",
    "exclude",
    "human_review_required",
    "deny_context_bundle",
  ],
  reason_codes: [
    "context.secret_like_content",
    "context.provider_disallowed_data_class",
    "context.source_out_of_scope",
    "context.skill_out_of_scope",
    "context.instruction_override_blocked",
    "context.prompt_injection_suspected",
    "context.policy_conflict",
    "context.missing_source_ref",
    "context.untrusted_source",
    "context.overbroad_bundle",
    "context.extra_strict_requires_human_review",
  ],
  audit_events: [
    "agent_profile_selected",
    "provider_profile_selected",
    "permission_profile_selected",
    "firewall_level_selected",
    "firewall_policy_checked",
    "context_source_screened",
    "context_item_included",
    "context_item_redacted",
    "context_item_excluded",
    "context_bundle_compiled",
    "context_bundle_denied",
  ],
  source_docs: [
    "docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
    "docs/architecture/CONTEXT_SYNTHESIS.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  default_firewall_level: "guarded",
  provider_dispatch_allowed: false,
  runtime_mutation_allowed: false,
  side_effects: [],
} as const;

export const agentContextFirewallGatewayMcpInspectionContract = {
  contract_id: "lnsat.agent.context_firewall.gateway_mcp_inspection.v0_1",
  status: "source_only_read_only_inspection",
  gateway_contract_id: "lnsat.gateway.agent_context_firewall.v0_1",
  gateway_route: "/v1/agents/context-firewall/inspect",
  mcp_tool: "lnsat.agent.context_firewall.inspect",
  source_docs: [
    "docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
    "docs/architecture/MCP_ADAPTER_DESIGN.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "packages/packets/src/agent-context-firewall.ts",
  ],
  provider_dispatch_allowed: false,
  provider_api_calls_allowed: false,
  gateway_mcp_mutation_allowed: false,
  runtime_mutation_allowed: false,
  uses_secret_value: false,
  side_effects: [],
} as const;

export type AgentContextFirewallLevel =
  (typeof agentContextFirewallContract.firewall_levels)[number];
export type AgentContextPermissionMode =
  (typeof agentContextFirewallContract.permission_modes)[number];
export type AgentContextProviderKind =
  (typeof agentContextFirewallContract.provider_kinds)[number];
export type AgentRuntimeKind =
  (typeof agentContextFirewallContract.agent_kinds)[number];
export type AgentContextSourceFamily =
  (typeof agentContextFirewallContract.context_source_families)[number];
export type AgentContextDataClass =
  (typeof agentContextFirewallContract.context_data_classes)[number];
export type AgentContextDecision =
  (typeof agentContextFirewallContract.context_decisions)[number];
export type AgentContextFirewallReasonCode =
  (typeof agentContextFirewallContract.reason_codes)[number];

export type AgentRuntimeProfileInput = {
  agent_id: string;
  display_name: string;
  agent_kind: AgentRuntimeKind;
  provider_kind: AgentContextProviderKind;
  provider_ref: string;
  model_or_client_ref: string;
  default_role: string;
  default_skillsets: string[];
  default_control_level: string;
  default_firewall_level: AgentContextFirewallLevel;
  permission_profile_ref: string;
  context_policy_ref: string;
  secret_ref_policy: "none" | "secret_refs_only";
  audit_profile_ref: string;
  operator_owner_ref: string;
  enabled: boolean;
  policy_authority?: false;
  source_refs: string[];
};

export type AgentProviderProfileInput = {
  provider_ref: string;
  display_name: string;
  provider_kind: AgentContextProviderKind;
  allowed_data_classes: AgentContextDataClass[];
  secret_ref_policy: "none" | "secret_refs_only";
  live_dispatch_allowed?: false;
  source_refs: string[];
};

export type AgentPermissionCapabilityInput = {
  capability: string;
  mode: AgentContextPermissionMode;
  resource_refs: string[];
  approval_gate?: string;
};

export type AgentPermissionProfileInput = {
  permission_profile_ref: string;
  display_name: string;
  default_mode: AgentContextPermissionMode;
  capability_modes: AgentPermissionCapabilityInput[];
  source_refs: string[];
};

export type AgentContextItemInput = {
  item_ref: string;
  source_family: AgentContextSourceFamily;
  source_ref: string;
  summary: string;
  data_class: AgentContextDataClass;
  trust_level: "source_backed" | "operator_supplied" | "untrusted";
  requested_decision?: AgentContextDecision;
};

export type AgentContextFirewallBundleRequest = {
  request_id?: string;
  project_id: string;
  actor_id: string;
  packet_ref: string;
  firewall_level?: AgentContextFirewallLevel;
  agent_profiles: AgentRuntimeProfileInput[];
  provider_profiles: AgentProviderProfileInput[];
  permission_profiles: AgentPermissionProfileInput[];
  context_items: AgentContextItemInput[];
  created_at?: string;
  provider_dispatch_allowed?: false;
  runtime_mutation_allowed?: false;
  side_effects?: [];
};

export type AgentContextFirewallErrorCode =
  | "agent_context_firewall.invalid_request"
  | "agent_context_firewall.unexpected_field"
  | "agent_context_firewall.invalid_project_id"
  | "agent_context_firewall.invalid_actor_id"
  | "agent_context_firewall.invalid_packet_ref"
  | "agent_context_firewall.invalid_firewall_level"
  | "agent_context_firewall.invalid_created_at"
  | "agent_context_firewall.agent_profiles_required"
  | "agent_context_firewall.invalid_agent_profile"
  | "agent_context_firewall.provider_profiles_required"
  | "agent_context_firewall.invalid_provider_profile"
  | "agent_context_firewall.permission_profiles_required"
  | "agent_context_firewall.invalid_permission_profile"
  | "agent_context_firewall.context_items_required"
  | "agent_context_firewall.invalid_context_item"
  | "agent_context_firewall.secret_value_embedded"
  | "agent_context_firewall.provider_dispatch_forbidden"
  | "agent_context_firewall.runtime_mutation_forbidden"
  | "agent_context_firewall.side_effects_forbidden";

export type AgentContextFirewallError = {
  code: AgentContextFirewallErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AgentContextDecisionEvidence = {
  item_ref: string;
  source_family: AgentContextSourceFamily;
  source_ref: string;
  data_class: AgentContextDataClass;
  trust_level: AgentContextItemInput["trust_level"];
  decision: AgentContextDecision;
  reason_codes: AgentContextFirewallReasonCode[];
  redaction_count: number;
  withheld_content_ref: string | null;
};

export type AgentContextFirewallBundleEvidence = {
  contract_id: typeof agentContextFirewallContract.contract_id;
  request_id: string | null;
  project_id: string;
  actor_id: string;
  packet_ref: string;
  created_at: string;
  firewall_level: AgentContextFirewallLevel;
  default_firewall_level: typeof agentContextFirewallContract.default_firewall_level;
  agent_profile_refs: string[];
  provider_profile_refs: string[];
  permission_profile_refs: string[];
  context_decisions: AgentContextDecisionEvidence[];
  required_human_review_refs: string[];
  excluded_context_refs: string[];
  blocked_provider_refs: string[];
  audit_event_plan: string[];
  source_refs: string[];
  provider_dispatch_allowed: false;
  runtime_mutation_allowed: false;
  side_effects: [];
};

export type AgentContextFirewallBundleResult =
  | {
      ok: true;
      bundle: AgentContextFirewallBundleEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      bundle: null;
      errors: AgentContextFirewallError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

export type AgentContextFirewallInspectionSurface = {
  surface_ref: string;
  surface_kind: "gateway_route" | "mcp_tool";
  contract_ref: string;
  transport: string;
  read_only: true;
  provider_dispatch_allowed: false;
  provider_api_calls_allowed: false;
  gateway_mcp_mutation_allowed: false;
  runtime_mutation_allowed: false;
  mutation_allowed: false;
  uses_secret_value: false;
  side_effects: [];
};

export type AgentContextFirewallBlockedActionState = {
  action_ref: string;
  label: string;
  mode: "blocked" | "approval_required";
  control_surface: "explanatory_state";
  explanation: string;
  can_execute: false;
  can_dispatch_provider: false;
  provider_api_calls_allowed: false;
  gateway_mcp_mutation_allowed: false;
  runtime_mutation_allowed: false;
  uses_secret_value: false;
  side_effects: [];
};

export type AgentContextFirewallGatewayMcpInspectionModel = {
  contract_id: typeof agentContextFirewallGatewayMcpInspectionContract.contract_id;
  status: typeof agentContextFirewallGatewayMcpInspectionContract.status;
  firewall_contract_id: typeof agentContextFirewallContract.contract_id;
  request_id: string | null;
  project_id: string;
  actor_id: string;
  packet_ref: string;
  created_at: string;
  gateway_contract_id: typeof agentContextFirewallGatewayMcpInspectionContract.gateway_contract_id;
  gateway_route: typeof agentContextFirewallGatewayMcpInspectionContract.gateway_route;
  mcp_tool: typeof agentContextFirewallGatewayMcpInspectionContract.mcp_tool;
  agent_profile_refs: string[];
  provider_profile_refs: string[];
  permission_profile_refs: string[];
  context_decisions: AgentContextDecisionEvidence[];
  required_human_review_refs: string[];
  excluded_context_refs: string[];
  audit_event_plan: string[];
  blocked_actions: AgentContextFirewallBlockedActionState[];
  surfaces: AgentContextFirewallInspectionSurface[];
  source_refs: string[];
  provider_dispatch_allowed: false;
  provider_api_calls_allowed: false;
  gateway_mcp_mutation_allowed: false;
  runtime_mutation_allowed: false;
  uses_secret_value: false;
  raw_input_content: "withheld";
  side_effects: [];
};

type NormalizedAgentContextFirewallBundleRequest =
  | {
      ok: true;
      request_id: string | null;
      project_id: string;
      actor_id: string;
      packet_ref: string;
      firewall_level: AgentContextFirewallLevel;
      created_at: string;
      agent_profiles: AgentRuntimeProfileInput[];
      provider_profiles: AgentProviderProfileInput[];
      permission_profiles: AgentPermissionProfileInput[];
      context_items: AgentContextItemInput[];
    }
  | {
      ok: false;
      errors: AgentContextFirewallError[];
    };

const requestKeys = new Set([
  "request_id",
  "project_id",
  "actor_id",
  "packet_ref",
  "firewall_level",
  "agent_profiles",
  "provider_profiles",
  "permission_profiles",
  "context_items",
  "created_at",
  "provider_dispatch_allowed",
  "runtime_mutation_allowed",
  "side_effects",
]);

const agentProfileKeys = new Set([
  "agent_id",
  "display_name",
  "agent_kind",
  "provider_kind",
  "provider_ref",
  "model_or_client_ref",
  "default_role",
  "default_skillsets",
  "default_control_level",
  "default_firewall_level",
  "permission_profile_ref",
  "context_policy_ref",
  "secret_ref_policy",
  "audit_profile_ref",
  "operator_owner_ref",
  "enabled",
  "policy_authority",
  "source_refs",
]);

const providerProfileKeys = new Set([
  "provider_ref",
  "display_name",
  "provider_kind",
  "allowed_data_classes",
  "secret_ref_policy",
  "live_dispatch_allowed",
  "source_refs",
]);

const permissionProfileKeys = new Set([
  "permission_profile_ref",
  "display_name",
  "default_mode",
  "capability_modes",
  "source_refs",
]);

const capabilityModeKeys = new Set([
  "capability",
  "mode",
  "resource_refs",
  "approval_gate",
]);

const contextItemKeys = new Set([
  "item_ref",
  "source_family",
  "source_ref",
  "summary",
  "data_class",
  "trust_level",
  "requested_decision",
]);

const firewallLevels = new Set<AgentContextFirewallLevel>(
  agentContextFirewallContract.firewall_levels,
);
const permissionModes = new Set<AgentContextPermissionMode>(
  agentContextFirewallContract.permission_modes,
);
const providerKinds = new Set<AgentContextProviderKind>(
  agentContextFirewallContract.provider_kinds,
);
const agentKinds = new Set<AgentRuntimeKind>(agentContextFirewallContract.agent_kinds);
const sourceFamilies = new Set<AgentContextSourceFamily>(
  agentContextFirewallContract.context_source_families,
);
const dataClasses = new Set<AgentContextDataClass>(
  agentContextFirewallContract.context_data_classes,
);
const decisions = new Set<AgentContextDecision>(
  agentContextFirewallContract.context_decisions,
);
const trustLevels = new Set(["source_backed", "operator_supplied", "untrusted"]);
const secretRefPolicies = new Set(["none", "secret_refs_only"]);

const stableIdPattern = /^[a-z][a-z0-9_.:-]{1,95}$/;
const actorIdPattern = /^(agent|human|script|worker|mcp|cli)\.[a-z0-9_.:-]{2,95}$/;
const bpRefPattern = /^BP-\d{4}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{2,280}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD=|PRIVATE KEY|sk-[A-Za-z0-9]|bearer\s+[A-Za-z0-9]|api[_-]?key\s*[:=])/i;

export function createAgentContextFirewallBundle(
  input: unknown,
  options: { now?: Date } = {},
): AgentContextFirewallBundleResult {
  const createdAt = (options.now ?? new Date()).toISOString();
  const normalized = normalizeAgentContextFirewallBundleRequest(input, createdAt);

  if (!normalized.ok) {
    return failAgentContextFirewallBundle(normalized.errors);
  }

  const contextDecisions = normalized.context_items.map((item) =>
    decideContextItem(item, normalized.firewall_level),
  );

  return {
    ok: true,
    bundle: {
      contract_id: agentContextFirewallContract.contract_id,
      request_id: normalized.request_id,
      project_id: normalized.project_id,
      actor_id: normalized.actor_id,
      packet_ref: normalized.packet_ref,
      created_at: normalized.created_at,
      firewall_level: normalized.firewall_level,
      default_firewall_level: agentContextFirewallContract.default_firewall_level,
      agent_profile_refs: uniqueStrings(
        normalized.agent_profiles.map((profile) => profile.agent_id),
      ),
      provider_profile_refs: uniqueStrings(
        normalized.provider_profiles.map((profile) => profile.provider_ref),
      ),
      permission_profile_refs: uniqueStrings(
        normalized.permission_profiles.map((profile) => profile.permission_profile_ref),
      ),
      context_decisions: contextDecisions,
      required_human_review_refs: contextDecisions
        .filter((decision) => decision.decision === "human_review_required")
        .map((decision) => decision.item_ref),
      excluded_context_refs: contextDecisions
        .filter(
          (decision) =>
            decision.decision === "exclude" ||
            decision.decision === "deny_context_bundle",
        )
        .map((decision) => decision.item_ref),
      blocked_provider_refs: blockedProviderRefs(normalized.provider_profiles),
      audit_event_plan: [...agentContextFirewallContract.audit_events],
      source_refs: sourceRefs(normalized),
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

export function createAgentContextFirewallGatewayMcpInspection(
  bundle: AgentContextFirewallBundleEvidence,
): AgentContextFirewallGatewayMcpInspectionModel {
  return {
    contract_id: agentContextFirewallGatewayMcpInspectionContract.contract_id,
    status: agentContextFirewallGatewayMcpInspectionContract.status,
    firewall_contract_id: bundle.contract_id,
    request_id: bundle.request_id,
    project_id: bundle.project_id,
    actor_id: bundle.actor_id,
    packet_ref: bundle.packet_ref,
    created_at: bundle.created_at,
    gateway_contract_id:
      agentContextFirewallGatewayMcpInspectionContract.gateway_contract_id,
    gateway_route: agentContextFirewallGatewayMcpInspectionContract.gateway_route,
    mcp_tool: agentContextFirewallGatewayMcpInspectionContract.mcp_tool,
    agent_profile_refs: bundle.agent_profile_refs,
    provider_profile_refs: bundle.provider_profile_refs,
    permission_profile_refs: bundle.permission_profile_refs,
    context_decisions: bundle.context_decisions,
    required_human_review_refs: bundle.required_human_review_refs,
    excluded_context_refs: bundle.excluded_context_refs,
    audit_event_plan: bundle.audit_event_plan,
    blocked_actions: agentContextFirewallBlockedActionStates(),
    surfaces: agentContextFirewallInspectionSurfaces(),
    source_refs: uniqueStrings([
      ...agentContextFirewallGatewayMcpInspectionContract.source_docs.map(
        (doc) => `doc:${doc}`,
      ),
      ...bundle.source_refs,
    ]),
    provider_dispatch_allowed: false,
    provider_api_calls_allowed: false,
    gateway_mcp_mutation_allowed: false,
    runtime_mutation_allowed: false,
    uses_secret_value: false,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function agentContextFirewallInspectionSurfaces(): AgentContextFirewallInspectionSurface[] {
  return [
    {
      surface_ref: "gateway.agent_context_firewall.inspect",
      surface_kind: "gateway_route",
      contract_ref:
        agentContextFirewallGatewayMcpInspectionContract.gateway_contract_id,
      transport: "POST /v1/agents/context-firewall/inspect",
      read_only: true,
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      mutation_allowed: false,
      uses_secret_value: false,
      side_effects: [],
    },
    {
      surface_ref: "mcp.agent_context_firewall.inspect",
      surface_kind: "mcp_tool",
      contract_ref: agentContextFirewallGatewayMcpInspectionContract.mcp_tool,
      transport: "MCP read-only inspection tool",
      read_only: true,
      provider_dispatch_allowed: false,
      provider_api_calls_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      mutation_allowed: false,
      uses_secret_value: false,
      side_effects: [],
    },
  ];
}

function agentContextFirewallBlockedActionStates(): AgentContextFirewallBlockedActionState[] {
  return [
    {
      action_ref: "provider_dispatch_closed",
      label: "Provider dispatch closed",
      mode: "blocked",
      control_surface: "explanatory_state",
      explanation:
        "Inspection exposes provider refs only; it cannot dispatch providers or call provider APIs.",
      can_execute: false,
      can_dispatch_provider: false,
      provider_api_calls_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      uses_secret_value: false,
      side_effects: [],
    },
    {
      action_ref: "gateway_mcp_mutation_closed",
      label: "Gateway/MCP mutation closed",
      mode: "blocked",
      control_surface: "explanatory_state",
      explanation:
        "Gateway and MCP surfaces are inspection refs only; no mutation route or tool is exposed.",
      can_execute: false,
      can_dispatch_provider: false,
      provider_api_calls_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      uses_secret_value: false,
      side_effects: [],
    },
    {
      action_ref: "runtime_mutation_closed",
      label: "Runtime mutation closed",
      mode: "blocked",
      control_surface: "explanatory_state",
      explanation:
        "Inspection cannot mutate runtime, write repo state, start models, or open live connectors.",
      can_execute: false,
      can_dispatch_provider: false,
      provider_api_calls_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      uses_secret_value: false,
      side_effects: [],
    },
    {
      action_ref: "secret_values_withheld",
      label: "Secret values withheld",
      mode: "blocked",
      control_surface: "explanatory_state",
      explanation:
        "Inspection may expose secret refs and withheld refs, never secret values.",
      can_execute: false,
      can_dispatch_provider: false,
      provider_api_calls_allowed: false,
      gateway_mcp_mutation_allowed: false,
      runtime_mutation_allowed: false,
      uses_secret_value: false,
      side_effects: [],
    },
  ];
}

function normalizeAgentContextFirewallBundleRequest(
  input: unknown,
  createdAt: string,
): NormalizedAgentContextFirewallBundleRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        firewallError(
          "agent_context_firewall.invalid_request",
          "",
          "Agent context firewall bundle request must be an object.",
        ),
      ],
    };
  }

  const errors: AgentContextFirewallError[] = [];
  appendSecretValueErrors(input, "", errors);

  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        firewallError(
          "agent_context_firewall.unexpected_field",
          jsonPointer(key),
          "Unexpected agent context firewall request field.",
        ),
      );
    }
  }

  const requestId =
    typeof input.request_id === "string" && safeString(input.request_id)
      ? input.request_id
      : null;
  if (
    Object.hasOwn(input, "request_id") &&
    (typeof input.request_id !== "string" || !safeString(input.request_id))
  ) {
    errors.push(
      firewallError(
        "agent_context_firewall.invalid_request",
        "/request_id",
        "Agent context firewall request_id must be a safe string when provided.",
      ),
    );
  }

  if (typeof input.project_id !== "string" || !stableIdPattern.test(input.project_id)) {
    errors.push(
      firewallError(
        "agent_context_firewall.invalid_project_id",
        "/project_id",
        "Agent context firewall project_id must be a stable lowercase id.",
      ),
    );
  }

  if (typeof input.actor_id !== "string" || !actorIdPattern.test(input.actor_id)) {
    errors.push(
      firewallError(
        "agent_context_firewall.invalid_actor_id",
        "/actor_id",
        "Agent context firewall actor_id must be scoped to an actor namespace.",
      ),
    );
  }

  if (typeof input.packet_ref !== "string" || !bpRefPattern.test(input.packet_ref)) {
    errors.push(
      firewallError(
        "agent_context_firewall.invalid_packet_ref",
        "/packet_ref",
        "Agent context firewall packet_ref must be a build packet id.",
      ),
    );
  }

  const firewallLevel = normalizeFirewallLevel(input.firewall_level, errors);
  const timestamp =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : createdAt;
  if (
    Object.hasOwn(input, "created_at") &&
    (typeof input.created_at !== "string" || !isoDateTimePattern.test(input.created_at))
  ) {
    errors.push(
      firewallError(
        "agent_context_firewall.invalid_created_at",
        "/created_at",
        "Agent context firewall created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  const agentProfiles = normalizeAgentProfiles(input.agent_profiles, errors);
  const providerProfiles = normalizeProviderProfiles(input.provider_profiles, errors);
  const permissionProfiles = normalizePermissionProfiles(
    input.permission_profiles,
    errors,
  );
  const contextItems = normalizeContextItems(input.context_items, errors);

  if (
    Object.hasOwn(input, "provider_dispatch_allowed") &&
    input.provider_dispatch_allowed !== false
  ) {
    errors.push(
      firewallError(
        "agent_context_firewall.provider_dispatch_forbidden",
        "/provider_dispatch_allowed",
        "Agent context firewall cannot enable provider dispatch.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "runtime_mutation_allowed") &&
    input.runtime_mutation_allowed !== false
  ) {
    errors.push(
      firewallError(
        "agent_context_firewall.runtime_mutation_forbidden",
        "/runtime_mutation_allowed",
        "Agent context firewall cannot enable runtime mutation.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      firewallError(
        "agent_context_firewall.side_effects_forbidden",
        "/side_effects",
        "Agent context firewall bundle must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request_id: requestId,
    project_id: input.project_id as string,
    actor_id: input.actor_id as string,
    packet_ref: input.packet_ref as string,
    firewall_level: firewallLevel,
    created_at: timestamp,
    agent_profiles: agentProfiles,
    provider_profiles: providerProfiles,
    permission_profiles: permissionProfiles,
    context_items: contextItems,
  };
}

function normalizeFirewallLevel(
  value: unknown,
  errors: AgentContextFirewallError[],
): AgentContextFirewallLevel {
  if (value === undefined) {
    return agentContextFirewallContract.default_firewall_level;
  }

  if (
    typeof value !== "string" ||
    !firewallLevels.has(value as AgentContextFirewallLevel)
  ) {
    errors.push(
      firewallError(
        "agent_context_firewall.invalid_firewall_level",
        "/firewall_level",
        "Agent context firewall level is unsupported.",
      ),
    );
    return agentContextFirewallContract.default_firewall_level;
  }

  return value as AgentContextFirewallLevel;
}

function normalizeAgentProfiles(
  value: unknown,
  errors: AgentContextFirewallError[],
): AgentRuntimeProfileInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      firewallError(
        "agent_context_firewall.agent_profiles_required",
        "/agent_profiles",
        "Agent context firewall requires at least one agent profile.",
      ),
    );
    return [];
  }

  const profiles: AgentRuntimeProfileInput[] = [];
  value.forEach((profile, index) => {
    const path = `/agent_profiles/${index}`;
    if (!isPlainObject(profile)) {
      errors.push(
        firewallError(
          "agent_context_firewall.invalid_agent_profile",
          path,
          "Agent runtime profile must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(profile)) {
      if (!agentProfileKeys.has(key)) {
        errors.push(
          firewallError(
            "agent_context_firewall.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected agent runtime profile field.",
          ),
        );
      }
    }

    requireSafeString(profile.agent_id, `${path}/agent_id`, errors);
    requireSafeString(profile.display_name, `${path}/display_name`, errors);
    requireKnown(profile.agent_kind, agentKinds, `${path}/agent_kind`, errors);
    requireKnown(profile.provider_kind, providerKinds, `${path}/provider_kind`, errors);
    requireSafeString(profile.provider_ref, `${path}/provider_ref`, errors);
    requireSafeString(
      profile.model_or_client_ref,
      `${path}/model_or_client_ref`,
      errors,
    );
    requireSafeString(profile.default_role, `${path}/default_role`, errors);
    requireSafeStringArray(
      profile.default_skillsets,
      `${path}/default_skillsets`,
      errors,
    );
    requireSafeString(
      profile.default_control_level,
      `${path}/default_control_level`,
      errors,
    );
    requireKnown(
      profile.default_firewall_level,
      firewallLevels,
      `${path}/default_firewall_level`,
      errors,
    );
    requireSafeString(
      profile.permission_profile_ref,
      `${path}/permission_profile_ref`,
      errors,
    );
    requireSafeString(profile.context_policy_ref, `${path}/context_policy_ref`, errors);
    requireKnown(
      profile.secret_ref_policy,
      secretRefPolicies,
      `${path}/secret_ref_policy`,
      errors,
    );
    requireSafeString(profile.audit_profile_ref, `${path}/audit_profile_ref`, errors);
    requireSafeString(profile.operator_owner_ref, `${path}/operator_owner_ref`, errors);
    requireSafeStringArray(profile.source_refs, `${path}/source_refs`, errors);

    if (typeof profile.enabled !== "boolean") {
      errors.push(invalidField(`${path}/enabled`));
    }
    if (
      profile.agent_kind === "internal_delegation_broker" &&
      Object.hasOwn(profile, "policy_authority") &&
      profile.policy_authority !== false
    ) {
      errors.push(invalidField(`${path}/policy_authority`));
    }

    if (isValidAgentRuntimeProfileShape(profile) && profile.source_refs.length > 0) {
      profiles.push(profile);
    }
  });

  return profiles;
}

function normalizeProviderProfiles(
  value: unknown,
  errors: AgentContextFirewallError[],
): AgentProviderProfileInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      firewallError(
        "agent_context_firewall.provider_profiles_required",
        "/provider_profiles",
        "Agent context firewall requires at least one provider profile.",
      ),
    );
    return [];
  }

  const profiles: AgentProviderProfileInput[] = [];
  value.forEach((profile, index) => {
    const path = `/provider_profiles/${index}`;
    if (!isPlainObject(profile)) {
      errors.push(
        firewallError(
          "agent_context_firewall.invalid_provider_profile",
          path,
          "Provider profile must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(profile)) {
      if (!providerProfileKeys.has(key)) {
        errors.push(
          firewallError(
            "agent_context_firewall.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected provider profile field.",
          ),
        );
      }
    }

    requireSafeString(profile.provider_ref, `${path}/provider_ref`, errors);
    requireSafeString(profile.display_name, `${path}/display_name`, errors);
    requireKnown(profile.provider_kind, providerKinds, `${path}/provider_kind`, errors);
    requireKnownArray(
      profile.allowed_data_classes,
      dataClasses,
      `${path}/allowed_data_classes`,
      errors,
    );
    requireKnown(
      profile.secret_ref_policy,
      secretRefPolicies,
      `${path}/secret_ref_policy`,
      errors,
    );
    requireSafeStringArray(profile.source_refs, `${path}/source_refs`, errors);

    if (
      Object.hasOwn(profile, "live_dispatch_allowed") &&
      profile.live_dispatch_allowed !== false
    ) {
      errors.push(
        firewallError(
          "agent_context_firewall.provider_dispatch_forbidden",
          `${path}/live_dispatch_allowed`,
          "Provider profile cannot enable live dispatch.",
        ),
      );
    }

    if (
      isValidProviderProfileShape(profile) &&
      profile.source_refs.length > 0 &&
      profile.allowed_data_classes.length > 0
    ) {
      profiles.push(profile);
    }
  });

  return profiles;
}

function normalizePermissionProfiles(
  value: unknown,
  errors: AgentContextFirewallError[],
): AgentPermissionProfileInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      firewallError(
        "agent_context_firewall.permission_profiles_required",
        "/permission_profiles",
        "Agent context firewall requires at least one permission profile.",
      ),
    );
    return [];
  }

  const profiles: AgentPermissionProfileInput[] = [];
  value.forEach((profile, index) => {
    const path = `/permission_profiles/${index}`;
    if (!isPlainObject(profile)) {
      errors.push(
        firewallError(
          "agent_context_firewall.invalid_permission_profile",
          path,
          "Permission profile must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(profile)) {
      if (!permissionProfileKeys.has(key)) {
        errors.push(
          firewallError(
            "agent_context_firewall.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected permission profile field.",
          ),
        );
      }
    }

    requireSafeString(
      profile.permission_profile_ref,
      `${path}/permission_profile_ref`,
      errors,
    );
    requireSafeString(profile.display_name, `${path}/display_name`, errors);
    requireKnown(profile.default_mode, permissionModes, `${path}/default_mode`, errors);
    requireSafeStringArray(profile.source_refs, `${path}/source_refs`, errors);
    const capabilityModes = normalizeCapabilityModes(
      profile.capability_modes,
      path,
      errors,
    );

    if (
      typeof profile.permission_profile_ref === "string" &&
      safeString(profile.permission_profile_ref) &&
      typeof profile.display_name === "string" &&
      safeString(profile.display_name) &&
      typeof profile.default_mode === "string" &&
      permissionModes.has(profile.default_mode as AgentContextPermissionMode) &&
      Array.isArray(profile.source_refs) &&
      profile.source_refs.length > 0 &&
      capabilityModes.length > 0
    ) {
      profiles.push({
        permission_profile_ref: profile.permission_profile_ref,
        display_name: profile.display_name,
        default_mode: profile.default_mode as AgentContextPermissionMode,
        capability_modes: capabilityModes,
        source_refs: profile.source_refs as string[],
      });
    }
  });

  return profiles;
}

function normalizeCapabilityModes(
  value: unknown,
  path: string,
  errors: AgentContextFirewallError[],
): AgentPermissionCapabilityInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(invalidField(`${path}/capability_modes`));
    return [];
  }

  const capabilityModes: AgentPermissionCapabilityInput[] = [];
  value.forEach((capabilityMode, index) => {
    const capabilityPath = `${path}/capability_modes/${index}`;
    if (!isPlainObject(capabilityMode)) {
      errors.push(invalidField(capabilityPath));
      return;
    }

    for (const key of Object.keys(capabilityMode)) {
      if (!capabilityModeKeys.has(key)) {
        errors.push(
          firewallError(
            "agent_context_firewall.unexpected_field",
            `${capabilityPath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected permission capability mode field.",
          ),
        );
      }
    }

    requireSafeString(
      capabilityMode.capability,
      `${capabilityPath}/capability`,
      errors,
    );
    requireKnown(
      capabilityMode.mode,
      permissionModes,
      `${capabilityPath}/mode`,
      errors,
    );
    requireSafeStringArray(
      capabilityMode.resource_refs,
      `${capabilityPath}/resource_refs`,
      errors,
    );
    if (
      Object.hasOwn(capabilityMode, "approval_gate") &&
      (typeof capabilityMode.approval_gate !== "string" ||
        !safeString(capabilityMode.approval_gate))
    ) {
      errors.push(invalidField(`${capabilityPath}/approval_gate`));
    }
    if (
      capabilityMode.mode === "approval_required" &&
      (typeof capabilityMode.approval_gate !== "string" ||
        !safeString(capabilityMode.approval_gate))
    ) {
      errors.push(invalidField(`${capabilityPath}/approval_gate`));
    }

    if (
      typeof capabilityMode.capability === "string" &&
      safeString(capabilityMode.capability) &&
      typeof capabilityMode.mode === "string" &&
      permissionModes.has(capabilityMode.mode as AgentContextPermissionMode) &&
      Array.isArray(capabilityMode.resource_refs) &&
      capabilityMode.resource_refs.length > 0 &&
      capabilityMode.resource_refs.every(
        (resource): resource is string =>
          typeof resource === "string" && safeString(resource),
      ) &&
      (!Object.hasOwn(capabilityMode, "approval_gate") ||
        (typeof capabilityMode.approval_gate === "string" &&
          safeString(capabilityMode.approval_gate)))
    ) {
      const entry: AgentPermissionCapabilityInput = {
        capability: capabilityMode.capability,
        mode: capabilityMode.mode as AgentContextPermissionMode,
        resource_refs: [...capabilityMode.resource_refs],
      };
      if (typeof capabilityMode.approval_gate === "string") {
        entry.approval_gate = capabilityMode.approval_gate;
      }
      capabilityModes.push(entry);
    }
  });

  return capabilityModes;
}

function normalizeContextItems(
  value: unknown,
  errors: AgentContextFirewallError[],
): AgentContextItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      firewallError(
        "agent_context_firewall.context_items_required",
        "/context_items",
        "Agent context firewall requires at least one context item.",
      ),
    );
    return [];
  }

  const items: AgentContextItemInput[] = [];
  value.forEach((item, index) => {
    const path = `/context_items/${index}`;
    if (!isPlainObject(item)) {
      errors.push(
        firewallError(
          "agent_context_firewall.invalid_context_item",
          path,
          "Context item must be an object.",
        ),
      );
      return;
    }

    for (const key of Object.keys(item)) {
      if (!contextItemKeys.has(key)) {
        errors.push(
          firewallError(
            "agent_context_firewall.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected context item field.",
          ),
        );
      }
    }

    requireSafeString(item.item_ref, `${path}/item_ref`, errors);
    requireKnown(item.source_family, sourceFamilies, `${path}/source_family`, errors);
    requireSafeString(item.source_ref, `${path}/source_ref`, errors);
    requireSafeString(item.summary, `${path}/summary`, errors);
    requireKnown(item.data_class, dataClasses, `${path}/data_class`, errors);
    requireKnown(item.trust_level, trustLevels, `${path}/trust_level`, errors);
    if (
      Object.hasOwn(item, "requested_decision") &&
      (typeof item.requested_decision !== "string" ||
        !decisions.has(item.requested_decision as AgentContextDecision))
    ) {
      errors.push(invalidField(`${path}/requested_decision`));
    }

    if (isValidContextItemShape(item) && item.summary.length > 0) {
      items.push(item);
    }
  });

  return items;
}

function decideContextItem(
  item: AgentContextItemInput,
  firewallLevel: AgentContextFirewallLevel,
): AgentContextDecisionEvidence {
  const reasonCodes: AgentContextFirewallReasonCode[] = [];
  let decision: AgentContextDecision = item.requested_decision ?? "include";

  if (item.data_class === "secret" || item.data_class === "production_customer") {
    decision = "exclude";
    reasonCodes.push("context.secret_like_content");
  } else if (item.trust_level === "untrusted") {
    decision = "exclude";
    reasonCodes.push("context.untrusted_source");
  } else if (firewallLevel === "extra_strict" && item.data_class === "sensitive") {
    decision = "human_review_required";
    reasonCodes.push("context.extra_strict_requires_human_review");
  } else if (
    (firewallLevel === "strict" || firewallLevel === "extra_strict") &&
    item.data_class === "internal"
  ) {
    decision = "include_summary_only";
  } else if (firewallLevel === "guarded" && item.data_class === "sensitive") {
    decision = "include_summary_only";
  }

  if (
    item.source_family === "agent_instructions" &&
    item.summary.toLowerCase().includes("ignore")
  ) {
    decision = "exclude";
    reasonCodes.push("context.instruction_override_blocked");
  }

  const redactionCount =
    decision === "include_redacted" || decision === "include_summary_only" ? 1 : 0;

  return {
    item_ref: item.item_ref,
    source_family: item.source_family,
    source_ref: item.source_ref,
    data_class: item.data_class,
    trust_level: item.trust_level,
    decision,
    reason_codes: uniqueReasonCodes(reasonCodes),
    redaction_count: redactionCount,
    withheld_content_ref:
      decision === "exclude" || decision === "deny_context_bundle"
        ? `${item.item_ref}:withheld`
        : null,
  };
}

function blockedProviderRefs(profiles: AgentProviderProfileInput[]): string[] {
  return uniqueStrings(
    profiles
      .filter(
        (profile) =>
          profile.allowed_data_classes.includes("secret") ||
          profile.allowed_data_classes.includes("production_customer"),
      )
      .map((profile) => profile.provider_ref),
  );
}

function sourceRefs(
  request: Extract<NormalizedAgentContextFirewallBundleRequest, { ok: true }>,
): string[] {
  return uniqueStrings([
    ...agentContextFirewallContract.source_docs.map((doc) => `doc:${doc}`),
    ...request.agent_profiles.flatMap((profile) => profile.source_refs),
    ...request.provider_profiles.flatMap((profile) => profile.source_refs),
    ...request.permission_profiles.flatMap((profile) => profile.source_refs),
    ...request.context_items.map((item) => item.source_ref),
    `packet:${request.packet_ref}`,
  ]);
}

function appendSecretValueErrors(
  value: unknown,
  path: string,
  errors: AgentContextFirewallError[],
): void {
  if (typeof value === "string") {
    if (secretLikePattern.test(value)) {
      errors.push(
        firewallError(
          "agent_context_firewall.secret_value_embedded",
          path,
          "Agent context firewall input must use references, not secret values.",
        ),
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendSecretValueErrors(item, `${path}/${index}`, errors);
    });
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      appendSecretValueErrors(
        child,
        `${path}/${escapeJsonPointerSegment(key)}`,
        errors,
      );
    }
  }
}

function requireSafeString(
  value: unknown,
  path: string,
  errors: AgentContextFirewallError[],
): void {
  if (typeof value !== "string" || !safeString(value)) {
    errors.push(invalidField(path));
  }
}

function requireSafeStringArray(
  value: unknown,
  path: string,
  errors: AgentContextFirewallError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item): item is string => typeof item === "string" && safeString(item))
  ) {
    errors.push(invalidField(path));
  }
}

function requireKnown(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  errors: AgentContextFirewallError[],
): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push(invalidField(path));
  }
}

function requireKnownArray(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  errors: AgentContextFirewallError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(
      (item): item is string => typeof item === "string" && allowed.has(item),
    )
  ) {
    errors.push(invalidField(path));
  }
}

function isValidAgentRuntimeProfileShape(
  value: Record<string, unknown>,
): value is AgentRuntimeProfileInput {
  return (
    typeof value.agent_id === "string" &&
    safeString(value.agent_id) &&
    typeof value.display_name === "string" &&
    safeString(value.display_name) &&
    typeof value.agent_kind === "string" &&
    agentKinds.has(value.agent_kind as AgentRuntimeKind) &&
    typeof value.provider_kind === "string" &&
    providerKinds.has(value.provider_kind as AgentContextProviderKind) &&
    typeof value.provider_ref === "string" &&
    safeString(value.provider_ref) &&
    typeof value.model_or_client_ref === "string" &&
    safeString(value.model_or_client_ref) &&
    typeof value.default_role === "string" &&
    safeString(value.default_role) &&
    Array.isArray(value.default_skillsets) &&
    value.default_skillsets.every(
      (skillset): skillset is string =>
        typeof skillset === "string" && safeString(skillset),
    ) &&
    typeof value.default_control_level === "string" &&
    safeString(value.default_control_level) &&
    typeof value.default_firewall_level === "string" &&
    firewallLevels.has(value.default_firewall_level as AgentContextFirewallLevel) &&
    typeof value.permission_profile_ref === "string" &&
    safeString(value.permission_profile_ref) &&
    typeof value.context_policy_ref === "string" &&
    safeString(value.context_policy_ref) &&
    typeof value.secret_ref_policy === "string" &&
    secretRefPolicies.has(value.secret_ref_policy) &&
    typeof value.audit_profile_ref === "string" &&
    safeString(value.audit_profile_ref) &&
    typeof value.operator_owner_ref === "string" &&
    safeString(value.operator_owner_ref) &&
    typeof value.enabled === "boolean" &&
    Array.isArray(value.source_refs) &&
    value.source_refs.every(
      (sourceRef): sourceRef is string =>
        typeof sourceRef === "string" && safeString(sourceRef),
    ) &&
    (!Object.hasOwn(value, "policy_authority") || value.policy_authority === false)
  );
}

function isValidProviderProfileShape(
  value: Record<string, unknown>,
): value is AgentProviderProfileInput {
  return (
    typeof value.provider_ref === "string" &&
    safeString(value.provider_ref) &&
    typeof value.display_name === "string" &&
    safeString(value.display_name) &&
    typeof value.provider_kind === "string" &&
    providerKinds.has(value.provider_kind as AgentContextProviderKind) &&
    Array.isArray(value.allowed_data_classes) &&
    value.allowed_data_classes.every(
      (dataClass): dataClass is AgentContextDataClass =>
        typeof dataClass === "string" &&
        dataClasses.has(dataClass as AgentContextDataClass),
    ) &&
    typeof value.secret_ref_policy === "string" &&
    secretRefPolicies.has(value.secret_ref_policy) &&
    Array.isArray(value.source_refs) &&
    value.source_refs.every(
      (sourceRef): sourceRef is string =>
        typeof sourceRef === "string" && safeString(sourceRef),
    ) &&
    (!Object.hasOwn(value, "live_dispatch_allowed") ||
      value.live_dispatch_allowed === false)
  );
}

function isValidContextItemShape(
  value: Record<string, unknown>,
): value is AgentContextItemInput {
  return (
    typeof value.item_ref === "string" &&
    safeString(value.item_ref) &&
    typeof value.source_family === "string" &&
    sourceFamilies.has(value.source_family as AgentContextSourceFamily) &&
    typeof value.source_ref === "string" &&
    safeString(value.source_ref) &&
    typeof value.summary === "string" &&
    safeString(value.summary) &&
    typeof value.data_class === "string" &&
    dataClasses.has(value.data_class as AgentContextDataClass) &&
    typeof value.trust_level === "string" &&
    trustLevels.has(value.trust_level) &&
    (!Object.hasOwn(value, "requested_decision") ||
      (typeof value.requested_decision === "string" &&
        decisions.has(value.requested_decision as AgentContextDecision)))
  );
}

function invalidField(path: string): AgentContextFirewallError {
  return firewallError(
    "agent_context_firewall.invalid_context_item",
    path,
    "Agent context firewall field is invalid or unsafe.",
  );
}

function failAgentContextFirewallBundle(
  errors: AgentContextFirewallError[],
): AgentContextFirewallBundleResult {
  return {
    ok: false,
    bundle: null,
    errors,
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function firewallError(
  code: AgentContextFirewallErrorCode,
  path: string,
  message: string,
): AgentContextFirewallError {
  return { code, path, message, severity: "error" };
}

function safeString(value: string): boolean {
  return (
    safeStringPattern.test(value) &&
    !secretLikePattern.test(value) &&
    !value.toLowerCase().includes("rm -rf")
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort();
}

function uniqueReasonCodes(
  values: AgentContextFirewallReasonCode[],
): AgentContextFirewallReasonCode[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: AgentContextFirewallError[],
): AgentContextFirewallError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function jsonPointer(label: string): string {
  return `/${escapeJsonPointerSegment(label)}`;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
