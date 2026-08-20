import type { AgentContextFirewallLevel } from "./agent-context-firewall.js";

export const AGENT_LOOP_CORE_CONTRACT_STATUS = "source_only";

export const agentLoopCoreContract = {
  contract_id: "lnsat.agent.loop_core.v0_1",
  status: "source_only",
  loop_topologies: [
    "linear_packet_loop",
    "graph_workflow",
    "brokered_multi_agent",
    "external_loose_agent_wrap",
    "human_supervised_session",
    "sandbox_workspace_run",
  ],
  runtime_families: [
    "hermes_worker",
    "openai_agents",
    "anthropic_agent",
    "mcp_server",
    "a2a_remote_agent",
    "cloudflare_agents",
    "langgraph",
    "microsoft_agent_framework",
    "local_self_hosted",
    "human_operator",
  ],
  control_modes: [
    "observe_only",
    "plan_only",
    "dry_run_only",
    "approval_gated",
    "human_supervised",
  ],
  interop_mapping_kinds: [
    "mcp_tool_descriptor",
    "mcp_resource_descriptor",
    "mcp_roots_boundary",
    "a2a_agent_card",
    "a2a_task",
    "a2a_message",
    "a2a_artifact",
    "otel_genai_span",
    "otel_genai_event",
    "sandbox_manifest",
    "hardware_inventory_probe",
    "os_capability_probe",
    "model_runtime_probe",
    "provider_agent_ref",
  ],
  step_statuses: ["ready", "blocked", "needs_human_review", "deferred"],
  stop_condition_kinds: [
    "max_iterations",
    "token_budget",
    "cost_budget",
    "runtime_budget",
    "hard_gate_reached",
    "policy_denied",
    "human_review_required",
    "source_validation_failed",
  ],
  graph_node_kinds: [
    "managed_agent",
    "capability_manifest",
    "policy_profile",
    "permission_profile",
    "context_firewall",
    "tool_descriptor",
    "approval_gate",
    "audit_event",
    "trace_context",
    "budget",
    "stop_condition",
    "interop_endpoint",
    "hardware_profile",
    "runtime_probe",
    "human_owner",
  ],
  graph_edge_kinds: [
    "manages",
    "constrained_by",
    "requires_approval",
    "emits_audit",
    "uses_tool_descriptor",
    "maps_to_interop",
    "bounded_by_budget",
    "stops_on",
    "redacts_context",
    "owned_by",
    "observes",
  ],
  source_docs: [
    "docs/architecture/AGENT_CONTEXT_FIREWALL_AND_PERMISSION_LEVELS.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  provider_dispatch_allowed: false,
  runtime_mutation_allowed: false,
  repo_write_allowed: false,
  gateway_mcp_mutation_allowed: false,
  live_connector_allowed: false,
  secret_value_allowed: false,
  source_revision_blessing_allowed: false,
  release_execution_allowed: false,
  side_effects: [],
} as const;

export type AgentLoopTopology = (typeof agentLoopCoreContract.loop_topologies)[number];
export type AgentLoopRuntimeFamily =
  (typeof agentLoopCoreContract.runtime_families)[number];
export type AgentLoopControlMode = (typeof agentLoopCoreContract.control_modes)[number];
export type AgentLoopInteropMappingKind =
  (typeof agentLoopCoreContract.interop_mapping_kinds)[number];
export type AgentLoopStepStatus = (typeof agentLoopCoreContract.step_statuses)[number];
export type AgentLoopStopConditionKind =
  (typeof agentLoopCoreContract.stop_condition_kinds)[number];
export type AgentLoopGraphNodeKind =
  (typeof agentLoopCoreContract.graph_node_kinds)[number];
export type AgentLoopGraphEdgeKind =
  (typeof agentLoopCoreContract.graph_edge_kinds)[number];

export type AgentLoopBudgetInput = {
  token_limit: number;
  cost_usd: number;
  runtime_seconds: number;
  context_compaction_policy_ref: string;
  summarization_strategy_ref: string;
  trace_redaction_policy_ref: string;
};

export type ManagedAgentNodeInput = {
  node_ref: string;
  display_name: string;
  runtime_family: AgentLoopRuntimeFamily;
  control_mode: AgentLoopControlMode;
  provider_ref: string;
  model_profile_ref: string;
  default_firewall_level: AgentContextFirewallLevel;
  capability_manifest_ref: string;
  policy_profile_ref: string;
  audit_profile_ref: string;
  human_owner_ref: string;
  enabled: boolean;
  policy_authority?: false;
  source_refs: string[];
};

export type AgentCapabilityManifestInput = {
  manifest_ref: string;
  node_ref: string;
  allow: string[];
  block: string[];
  tool_descriptor_refs: string[];
  data_classes_allowed: string[];
  source_refs: string[];
};

export type AgentLoopStopConditionInput = {
  condition_ref: string;
  condition_kind: AgentLoopStopConditionKind;
  threshold_ref: string;
  action: "stop" | "pause_for_human_review" | "deny_request";
  source_refs: string[];
};

export type AgentLoopStepInput = {
  step_ref: string;
  node_ref: string;
  order: number;
  status: AgentLoopStepStatus;
  gate_ref: string;
  action_ref: string;
  expected_artifact_ref: string;
  can_execute?: false;
  can_dispatch_provider?: false;
  runtime_mutation_allowed?: false;
  repo_write_allowed?: false;
  gateway_mcp_mutation_allowed?: false;
  uses_secret_value?: false;
  side_effects?: [];
  source_refs: string[];
};

export type AgentLoopInteropMappingInput = {
  mapping_ref: string;
  mapping_kind: AgentLoopInteropMappingKind;
  external_ref: string;
  mode: "reference_only";
  source_refs: string[];
};

export type AgentLoopGraphNodeInput = {
  graph_node_ref: string;
  node_kind: AgentLoopGraphNodeKind;
  target_ref: string;
  label: string;
  source_refs: string[];
};

export type AgentLoopGraphEdgeInput = {
  graph_edge_ref: string;
  edge_kind: AgentLoopGraphEdgeKind;
  from_ref: string;
  to_ref: string;
  policy_effect: "allow" | "preview_only" | "approval_required" | "block" | "observe";
  source_refs: string[];
};

export type AgentLoopRefInput = {
  ref: string;
  summary: string;
  source_refs: string[];
};

export type AgentLoopCorePlanRequest = {
  request_id?: string;
  loop_ref: string;
  packet_ref: string;
  owner_ref: string;
  topology: AgentLoopTopology;
  manager_node_ref: string;
  max_iterations: number;
  budget: AgentLoopBudgetInput;
  managed_nodes: ManagedAgentNodeInput[];
  capability_manifests: AgentCapabilityManifestInput[];
  stop_conditions: AgentLoopStopConditionInput[];
  steps: AgentLoopStepInput[];
  interop_mappings: AgentLoopInteropMappingInput[];
  policy_decision_refs: AgentLoopRefInput[];
  approval_refs: AgentLoopRefInput[];
  audit_event_refs: AgentLoopRefInput[];
  trace_context_refs: AgentLoopRefInput[];
  graph_nodes: AgentLoopGraphNodeInput[];
  graph_edges: AgentLoopGraphEdgeInput[];
  created_at?: string;
  provider_dispatch_allowed?: false;
  runtime_mutation_allowed?: false;
  repo_write_allowed?: false;
  gateway_mcp_mutation_allowed?: false;
  live_connector_allowed?: false;
  secret_value_allowed?: false;
  source_revision_blessing_allowed?: false;
  release_execution_allowed?: false;
  side_effects?: [];
};

export type AgentLoopCoreErrorCode =
  | "agent_loop_core.invalid_request"
  | "agent_loop_core.unexpected_field"
  | "agent_loop_core.invalid_ref"
  | "agent_loop_core.invalid_packet_ref"
  | "agent_loop_core.invalid_topology"
  | "agent_loop_core.invalid_budget"
  | "agent_loop_core.managed_node_required"
  | "agent_loop_core.invalid_managed_node"
  | "agent_loop_core.capability_manifest_required"
  | "agent_loop_core.invalid_capability_manifest"
  | "agent_loop_core.stop_condition_required"
  | "agent_loop_core.invalid_stop_condition"
  | "agent_loop_core.step_required"
  | "agent_loop_core.invalid_step"
  | "agent_loop_core.interop_mapping_required"
  | "agent_loop_core.invalid_interop_mapping"
  | "agent_loop_core.ref_required"
  | "agent_loop_core.invalid_ref_record"
  | "agent_loop_core.secret_value_embedded"
  | "agent_loop_core.provider_dispatch_forbidden"
  | "agent_loop_core.runtime_mutation_forbidden"
  | "agent_loop_core.repo_write_forbidden"
  | "agent_loop_core.gateway_mcp_mutation_forbidden"
  | "agent_loop_core.live_connector_forbidden"
  | "agent_loop_core.secret_value_forbidden"
  | "agent_loop_core.source_revision_blessing_forbidden"
  | "agent_loop_core.release_execution_forbidden"
  | "agent_loop_core.side_effects_forbidden";

export type AgentLoopCoreError = {
  code: AgentLoopCoreErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type AgentLoopCorePlanEvidence = {
  contract_id: typeof agentLoopCoreContract.contract_id;
  request_id: string | null;
  loop_ref: string;
  packet_ref: string;
  owner_ref: string;
  topology: AgentLoopTopology;
  manager_node_ref: string;
  max_iterations: number;
  created_at: string;
  budget: AgentLoopBudgetInput;
  managed_node_refs: string[];
  runtime_families: AgentLoopRuntimeFamily[];
  capability_manifest_refs: string[];
  stop_condition_refs: string[];
  step_refs: string[];
  interop_mapping_refs: string[];
  policy_decision_refs: string[];
  approval_refs: string[];
  audit_event_refs: string[];
  trace_context_refs: string[];
  graph_node_refs: string[];
  graph_edge_refs: string[];
  denied_runtime_behavior: string[];
  source_refs: string[];
  provider_dispatch_allowed: false;
  runtime_mutation_allowed: false;
  repo_write_allowed: false;
  gateway_mcp_mutation_allowed: false;
  live_connector_allowed: false;
  secret_value_allowed: false;
  source_revision_blessing_allowed: false;
  release_execution_allowed: false;
  side_effects: [];
};

export type AgentLoopCorePlanResult =
  | {
      ok: true;
      plan: AgentLoopCorePlanEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      plan: null;
      errors: AgentLoopCoreError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAgentLoopCorePlanRequest = Omit<
  AgentLoopCorePlanRequest,
  "request_id" | "created_at"
> & {
  request_id: string | null;
  created_at: string;
};

const requestKeys = new Set([
  "request_id",
  "loop_ref",
  "packet_ref",
  "owner_ref",
  "topology",
  "manager_node_ref",
  "max_iterations",
  "budget",
  "managed_nodes",
  "capability_manifests",
  "stop_conditions",
  "steps",
  "interop_mappings",
  "policy_decision_refs",
  "approval_refs",
  "audit_event_refs",
  "trace_context_refs",
  "graph_nodes",
  "graph_edges",
  "created_at",
  "provider_dispatch_allowed",
  "runtime_mutation_allowed",
  "repo_write_allowed",
  "gateway_mcp_mutation_allowed",
  "live_connector_allowed",
  "secret_value_allowed",
  "source_revision_blessing_allowed",
  "release_execution_allowed",
  "side_effects",
]);

const nodeKeys = new Set([
  "node_ref",
  "display_name",
  "runtime_family",
  "control_mode",
  "provider_ref",
  "model_profile_ref",
  "default_firewall_level",
  "capability_manifest_ref",
  "policy_profile_ref",
  "audit_profile_ref",
  "human_owner_ref",
  "enabled",
  "policy_authority",
  "source_refs",
]);

const manifestKeys = new Set([
  "manifest_ref",
  "node_ref",
  "allow",
  "block",
  "tool_descriptor_refs",
  "data_classes_allowed",
  "source_refs",
]);

const stopConditionKeys = new Set([
  "condition_ref",
  "condition_kind",
  "threshold_ref",
  "action",
  "source_refs",
]);

const stepKeys = new Set([
  "step_ref",
  "node_ref",
  "order",
  "status",
  "gate_ref",
  "action_ref",
  "expected_artifact_ref",
  "can_execute",
  "can_dispatch_provider",
  "runtime_mutation_allowed",
  "repo_write_allowed",
  "gateway_mcp_mutation_allowed",
  "uses_secret_value",
  "side_effects",
  "source_refs",
]);

const interopKeys = new Set([
  "mapping_ref",
  "mapping_kind",
  "external_ref",
  "mode",
  "source_refs",
]);

const refKeys = new Set(["ref", "summary", "source_refs"]);
const graphNodeKeys = new Set([
  "graph_node_ref",
  "node_kind",
  "target_ref",
  "label",
  "source_refs",
]);
const graphEdgeKeys = new Set([
  "graph_edge_ref",
  "edge_kind",
  "from_ref",
  "to_ref",
  "policy_effect",
  "source_refs",
]);
const budgetKeys = new Set([
  "token_limit",
  "cost_usd",
  "runtime_seconds",
  "context_compaction_policy_ref",
  "summarization_strategy_ref",
  "trace_redaction_policy_ref",
]);

const loopTopologies = new Set<AgentLoopTopology>(
  agentLoopCoreContract.loop_topologies,
);
const runtimeFamilies = new Set<AgentLoopRuntimeFamily>(
  agentLoopCoreContract.runtime_families,
);
const controlModes = new Set<AgentLoopControlMode>(agentLoopCoreContract.control_modes);
const interopMappingKinds = new Set<AgentLoopInteropMappingKind>(
  agentLoopCoreContract.interop_mapping_kinds,
);
const stepStatuses = new Set<AgentLoopStepStatus>(agentLoopCoreContract.step_statuses);
const stopConditionKinds = new Set<AgentLoopStopConditionKind>(
  agentLoopCoreContract.stop_condition_kinds,
);
const firewallLevels = new Set(["open", "guided", "guarded", "strict", "extra_strict"]);
const stopActions = new Set(["stop", "pause_for_human_review", "deny_request"]);
const graphNodeKinds = new Set<AgentLoopGraphNodeKind>(
  agentLoopCoreContract.graph_node_kinds,
);
const graphEdgeKinds = new Set<AgentLoopGraphEdgeKind>(
  agentLoopCoreContract.graph_edge_kinds,
);
const policyEffects = new Set([
  "allow",
  "preview_only",
  "approval_required",
  "block",
  "observe",
]);

const refPattern = /^[a-z][a-z0-9_.:-]{1,127}$/;
const bpRefPattern = /^BP-\d{4}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{2,320}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|PASSWORD=|PRIVATE KEY|BEGIN [A-Z ]*KEY|sk-[A-Za-z0-9]|bearer\s+[A-Za-z0-9]|api[_-]?key\s*[:=])/i;

export function createAgentLoopCorePlan(
  input: unknown,
  options: { now?: Date } = {},
): AgentLoopCorePlanResult {
  const normalized = normalizeAgentLoopCorePlan(input, options.now ?? new Date());

  if (!normalized.ok) {
    return fail(normalized.errors);
  }

  const plan = normalized.request;
  return {
    ok: true,
    plan: {
      contract_id: agentLoopCoreContract.contract_id,
      request_id: plan.request_id,
      loop_ref: plan.loop_ref,
      packet_ref: plan.packet_ref,
      owner_ref: plan.owner_ref,
      topology: plan.topology,
      manager_node_ref: plan.manager_node_ref,
      max_iterations: plan.max_iterations,
      created_at: plan.created_at,
      budget: plan.budget,
      managed_node_refs: unique(plan.managed_nodes.map((node) => node.node_ref)),
      runtime_families: unique(plan.managed_nodes.map((node) => node.runtime_family)),
      capability_manifest_refs: unique(
        plan.capability_manifests.map((manifest) => manifest.manifest_ref),
      ),
      stop_condition_refs: unique(
        plan.stop_conditions.map((condition) => condition.condition_ref),
      ),
      step_refs: unique(plan.steps.map((step) => step.step_ref)),
      interop_mapping_refs: unique(
        plan.interop_mappings.map((mapping) => mapping.mapping_ref),
      ),
      policy_decision_refs: unique(plan.policy_decision_refs.map((ref) => ref.ref)),
      approval_refs: unique(plan.approval_refs.map((ref) => ref.ref)),
      audit_event_refs: unique(plan.audit_event_refs.map((ref) => ref.ref)),
      trace_context_refs: unique(plan.trace_context_refs.map((ref) => ref.ref)),
      graph_node_refs: unique(plan.graph_nodes.map((node) => node.graph_node_ref)),
      graph_edge_refs: unique(plan.graph_edges.map((edge) => edge.graph_edge_ref)),
      denied_runtime_behavior: [
        "provider_dispatch",
        "runtime_mutation",
        "repo_write_from_runtime",
        "gateway_mcp_mutation",
        "live_connector_setup",
        "secret_value_use",
        "source_revision_blessing",
        "release_execution",
      ],
      source_refs: unique([
        ...agentLoopCoreContract.source_docs,
        ...plan.managed_nodes.flatMap((node) => node.source_refs),
        ...plan.capability_manifests.flatMap((manifest) => manifest.source_refs),
        ...plan.stop_conditions.flatMap((condition) => condition.source_refs),
        ...plan.steps.flatMap((step) => step.source_refs),
        ...plan.interop_mappings.flatMap((mapping) => mapping.source_refs),
        ...plan.graph_nodes.flatMap((node) => node.source_refs),
        ...plan.graph_edges.flatMap((edge) => edge.source_refs),
      ]),
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      gateway_mcp_mutation_allowed: false,
      live_connector_allowed: false,
      secret_value_allowed: false,
      source_revision_blessing_allowed: false,
      release_execution_allowed: false,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAgentLoopCorePlan(
  input: unknown,
  now: Date,
):
  | { ok: true; request: NormalizedAgentLoopCorePlanRequest }
  | { ok: false; errors: AgentLoopCoreError[] } {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        error(
          "agent_loop_core.invalid_request",
          "",
          "Agent loop core plan request must be an object.",
        ),
      ],
    };
  }

  const errors: AgentLoopCoreError[] = [];
  appendSecretValueErrors(input, "", errors);
  assertKnownKeys(input, requestKeys, "", errors);

  requireRef(input.loop_ref, "/loop_ref", errors);
  requireRef(input.owner_ref, "/owner_ref", errors);
  requireRef(input.manager_node_ref, "/manager_node_ref", errors);

  if (typeof input.packet_ref !== "string" || !bpRefPattern.test(input.packet_ref)) {
    errors.push(
      error(
        "agent_loop_core.invalid_packet_ref",
        "/packet_ref",
        "Agent loop packet_ref must be a build packet id.",
      ),
    );
  }

  if (
    typeof input.topology !== "string" ||
    !loopTopologies.has(input.topology as AgentLoopTopology)
  ) {
    errors.push(
      error(
        "agent_loop_core.invalid_topology",
        "/topology",
        "Agent loop topology is unsupported.",
      ),
    );
  }

  if (
    typeof input.max_iterations !== "number" ||
    !Number.isInteger(input.max_iterations) ||
    input.max_iterations < 1
  ) {
    errors.push(
      error(
        "agent_loop_core.invalid_request",
        "/max_iterations",
        "Agent loop max_iterations must be a positive integer.",
      ),
    );
  }

  const createdAt =
    typeof input.created_at === "string" && isoDateTimePattern.test(input.created_at)
      ? input.created_at
      : now.toISOString();
  if (
    Object.hasOwn(input, "created_at") &&
    (typeof input.created_at !== "string" || !isoDateTimePattern.test(input.created_at))
  ) {
    errors.push(
      error(
        "agent_loop_core.invalid_request",
        "/created_at",
        "Agent loop created_at must be an ISO UTC timestamp.",
      ),
    );
  }

  const budget = normalizeBudget(input.budget, errors);
  const managedNodes = normalizeNodes(input.managed_nodes, errors);
  const nodeRefs = new Set(managedNodes.map((node) => node.node_ref));
  const capabilityManifests = normalizeCapabilityManifests(
    input.capability_manifests,
    nodeRefs,
    errors,
  );
  const stopConditions = normalizeStopConditions(input.stop_conditions, errors);
  const steps = normalizeSteps(input.steps, nodeRefs, errors);
  const interopMappings = normalizeInteropMappings(input.interop_mappings, errors);
  const policyRefs = normalizeRefs(
    input.policy_decision_refs,
    "/policy_decision_refs",
    errors,
  );
  const approvalRefs = normalizeRefs(input.approval_refs, "/approval_refs", errors);
  const auditRefs = normalizeRefs(input.audit_event_refs, "/audit_event_refs", errors);
  const traceRefs = normalizeRefs(
    input.trace_context_refs,
    "/trace_context_refs",
    errors,
  );
  const graphNodes = normalizeGraphNodes(input.graph_nodes, errors);
  const graphEdges = normalizeGraphEdges(input.graph_edges, graphNodes, errors);

  if (
    typeof input.manager_node_ref === "string" &&
    refPattern.test(input.manager_node_ref) &&
    !nodeRefs.has(input.manager_node_ref)
  ) {
    errors.push(
      error(
        "agent_loop_core.invalid_ref",
        "/manager_node_ref",
        "Agent loop manager_node_ref must reference a managed node.",
      ),
    );
  }

  assertFalseFlag(
    input,
    "provider_dispatch_allowed",
    "provider_dispatch_forbidden",
    errors,
  );
  assertFalseFlag(
    input,
    "runtime_mutation_allowed",
    "runtime_mutation_forbidden",
    errors,
  );
  assertFalseFlag(input, "repo_write_allowed", "repo_write_forbidden", errors);
  assertFalseFlag(
    input,
    "gateway_mcp_mutation_allowed",
    "gateway_mcp_mutation_forbidden",
    errors,
  );
  assertFalseFlag(input, "live_connector_allowed", "live_connector_forbidden", errors);
  assertFalseFlag(input, "secret_value_allowed", "secret_value_forbidden", errors);
  assertFalseFlag(
    input,
    "source_revision_blessing_allowed",
    "source_revision_blessing_forbidden",
    errors,
  );
  assertFalseFlag(
    input,
    "release_execution_allowed",
    "release_execution_forbidden",
    errors,
  );

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      error(
        "agent_loop_core.side_effects_forbidden",
        "/side_effects",
        "Agent loop core plan must preserve side_effects: [].",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupe(errors) };
  }

  return {
    ok: true,
    request: {
      request_id:
        typeof input.request_id === "string" && safeString(input.request_id)
          ? input.request_id
          : null,
      loop_ref: input.loop_ref as string,
      packet_ref: input.packet_ref as string,
      owner_ref: input.owner_ref as string,
      topology: input.topology as AgentLoopTopology,
      manager_node_ref: input.manager_node_ref as string,
      max_iterations: input.max_iterations as number,
      budget,
      managed_nodes: managedNodes,
      capability_manifests: capabilityManifests,
      stop_conditions: stopConditions,
      steps,
      interop_mappings: interopMappings,
      policy_decision_refs: policyRefs,
      approval_refs: approvalRefs,
      audit_event_refs: auditRefs,
      trace_context_refs: traceRefs,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
      created_at: createdAt,
      provider_dispatch_allowed: false,
      runtime_mutation_allowed: false,
      repo_write_allowed: false,
      gateway_mcp_mutation_allowed: false,
      live_connector_allowed: false,
      secret_value_allowed: false,
      source_revision_blessing_allowed: false,
      release_execution_allowed: false,
      side_effects: [],
    },
  };
}

function normalizeGraphNodes(
  value: unknown,
  errors: AgentLoopCoreError[],
): AgentLoopGraphNodeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.ref_required",
        "/graph_nodes",
        "Agent loop requires graph nodes.",
      ),
    );
    return [];
  }
  return value.flatMap((node, index) => {
    const path = `/graph_nodes/${index}`;
    if (!isPlainObject(node)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref_record",
          path,
          "Graph node must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(node, graphNodeKeys, path, errors);
    requireRef(node.graph_node_ref, `${path}/graph_node_ref`, errors);
    requireKnown(node.node_kind, graphNodeKinds, `${path}/node_kind`, errors);
    requireRef(node.target_ref, `${path}/target_ref`, errors);
    requireSafeString(node.label, `${path}/label`, errors);
    requireStringArray(node.source_refs, `${path}/source_refs`, errors);
    return [node as AgentLoopGraphNodeInput];
  });
}

function normalizeGraphEdges(
  value: unknown,
  graphNodes: AgentLoopGraphNodeInput[],
  errors: AgentLoopCoreError[],
): AgentLoopGraphEdgeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.ref_required",
        "/graph_edges",
        "Agent loop requires graph edges.",
      ),
    );
    return [];
  }
  const graphNodeRefs = new Set(graphNodes.map((node) => node.graph_node_ref));
  return value.flatMap((edge, index) => {
    const path = `/graph_edges/${index}`;
    if (!isPlainObject(edge)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref_record",
          path,
          "Graph edge must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(edge, graphEdgeKeys, path, errors);
    requireRef(edge.graph_edge_ref, `${path}/graph_edge_ref`, errors);
    requireKnown(edge.edge_kind, graphEdgeKinds, `${path}/edge_kind`, errors);
    requireRef(edge.from_ref, `${path}/from_ref`, errors);
    requireRef(edge.to_ref, `${path}/to_ref`, errors);
    requireKnown(edge.policy_effect, policyEffects, `${path}/policy_effect`, errors);
    requireStringArray(edge.source_refs, `${path}/source_refs`, errors);
    if (typeof edge.from_ref === "string" && !graphNodeRefs.has(edge.from_ref)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref",
          `${path}/from_ref`,
          "Graph edge from_ref must reference graph node.",
        ),
      );
    }
    if (typeof edge.to_ref === "string" && !graphNodeRefs.has(edge.to_ref)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref",
          `${path}/to_ref`,
          "Graph edge to_ref must reference graph node.",
        ),
      );
    }
    return [edge as AgentLoopGraphEdgeInput];
  });
}

function normalizeBudget(
  value: unknown,
  errors: AgentLoopCoreError[],
): AgentLoopBudgetInput {
  const path = "/budget";
  if (!isPlainObject(value)) {
    errors.push(
      error("agent_loop_core.invalid_budget", path, "Budget must be an object."),
    );
    return emptyBudget();
  }
  assertKnownKeys(value, budgetKeys, path, errors);
  requirePositiveInteger(value.token_limit, `${path}/token_limit`, errors);
  requireNonNegativeNumber(value.cost_usd, `${path}/cost_usd`, errors);
  requirePositiveInteger(value.runtime_seconds, `${path}/runtime_seconds`, errors);
  requireRef(
    value.context_compaction_policy_ref,
    `${path}/context_compaction_policy_ref`,
    errors,
  );
  requireRef(
    value.summarization_strategy_ref,
    `${path}/summarization_strategy_ref`,
    errors,
  );
  requireRef(
    value.trace_redaction_policy_ref,
    `${path}/trace_redaction_policy_ref`,
    errors,
  );
  return {
    token_limit: value.token_limit as number,
    cost_usd: value.cost_usd as number,
    runtime_seconds: value.runtime_seconds as number,
    context_compaction_policy_ref: value.context_compaction_policy_ref as string,
    summarization_strategy_ref: value.summarization_strategy_ref as string,
    trace_redaction_policy_ref: value.trace_redaction_policy_ref as string,
  };
}

function normalizeNodes(
  value: unknown,
  errors: AgentLoopCoreError[],
): ManagedAgentNodeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.managed_node_required",
        "/managed_nodes",
        "Agent loop requires at least one managed node.",
      ),
    );
    return [];
  }
  return value.flatMap((node, index) => {
    const path = `/managed_nodes/${index}`;
    if (!isPlainObject(node)) {
      errors.push(
        error(
          "agent_loop_core.invalid_managed_node",
          path,
          "Managed node must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(node, nodeKeys, path, errors);
    requireRef(node.node_ref, `${path}/node_ref`, errors);
    requireSafeString(node.display_name, `${path}/display_name`, errors);
    requireKnown(
      node.runtime_family,
      runtimeFamilies,
      `${path}/runtime_family`,
      errors,
    );
    requireKnown(node.control_mode, controlModes, `${path}/control_mode`, errors);
    requireRef(node.provider_ref, `${path}/provider_ref`, errors);
    requireRef(node.model_profile_ref, `${path}/model_profile_ref`, errors);
    requireKnown(
      node.default_firewall_level,
      firewallLevels,
      `${path}/default_firewall_level`,
      errors,
    );
    requireRef(node.capability_manifest_ref, `${path}/capability_manifest_ref`, errors);
    requireRef(node.policy_profile_ref, `${path}/policy_profile_ref`, errors);
    requireRef(node.audit_profile_ref, `${path}/audit_profile_ref`, errors);
    requireRef(node.human_owner_ref, `${path}/human_owner_ref`, errors);
    requireStringArray(node.source_refs, `${path}/source_refs`, errors);
    if (typeof node.enabled !== "boolean") {
      errors.push(
        error(
          "agent_loop_core.invalid_managed_node",
          `${path}/enabled`,
          "Managed node enabled must be boolean.",
        ),
      );
    }
    if (Object.hasOwn(node, "policy_authority") && node.policy_authority !== false) {
      errors.push(
        error(
          "agent_loop_core.invalid_managed_node",
          `${path}/policy_authority`,
          "Managed nodes cannot hold policy authority.",
        ),
      );
    }
    return [node as ManagedAgentNodeInput];
  });
}

function normalizeCapabilityManifests(
  value: unknown,
  nodeRefs: Set<string>,
  errors: AgentLoopCoreError[],
): AgentCapabilityManifestInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.capability_manifest_required",
        "/capability_manifests",
        "Agent loop requires capability manifests.",
      ),
    );
    return [];
  }
  return value.flatMap((manifest, index) => {
    const path = `/capability_manifests/${index}`;
    if (!isPlainObject(manifest)) {
      errors.push(
        error(
          "agent_loop_core.invalid_capability_manifest",
          path,
          "Capability manifest must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(manifest, manifestKeys, path, errors);
    requireRef(manifest.manifest_ref, `${path}/manifest_ref`, errors);
    requireRef(manifest.node_ref, `${path}/node_ref`, errors);
    requireStringArray(manifest.allow, `${path}/allow`, errors);
    requireStringArray(manifest.block, `${path}/block`, errors);
    requireStringArray(
      manifest.tool_descriptor_refs,
      `${path}/tool_descriptor_refs`,
      errors,
    );
    requireStringArray(
      manifest.data_classes_allowed,
      `${path}/data_classes_allowed`,
      errors,
    );
    requireStringArray(manifest.source_refs, `${path}/source_refs`, errors);
    if (typeof manifest.node_ref === "string" && !nodeRefs.has(manifest.node_ref)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref",
          `${path}/node_ref`,
          "Capability manifest node_ref must reference a managed node.",
        ),
      );
    }
    return [manifest as AgentCapabilityManifestInput];
  });
}

function normalizeStopConditions(
  value: unknown,
  errors: AgentLoopCoreError[],
): AgentLoopStopConditionInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.stop_condition_required",
        "/stop_conditions",
        "Agent loop requires stop conditions.",
      ),
    );
    return [];
  }
  return value.flatMap((condition, index) => {
    const path = `/stop_conditions/${index}`;
    if (!isPlainObject(condition)) {
      errors.push(
        error(
          "agent_loop_core.invalid_stop_condition",
          path,
          "Stop condition must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(condition, stopConditionKeys, path, errors);
    requireRef(condition.condition_ref, `${path}/condition_ref`, errors);
    requireKnown(
      condition.condition_kind,
      stopConditionKinds,
      `${path}/condition_kind`,
      errors,
    );
    requireRef(condition.threshold_ref, `${path}/threshold_ref`, errors);
    requireKnown(condition.action, stopActions, `${path}/action`, errors);
    requireStringArray(condition.source_refs, `${path}/source_refs`, errors);
    return [condition as AgentLoopStopConditionInput];
  });
}

function normalizeSteps(
  value: unknown,
  nodeRefs: Set<string>,
  errors: AgentLoopCoreError[],
): AgentLoopStepInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error("agent_loop_core.step_required", "/steps", "Agent loop requires steps."),
    );
    return [];
  }
  return value.flatMap((step, index) => {
    const path = `/steps/${index}`;
    if (!isPlainObject(step)) {
      errors.push(
        error(
          "agent_loop_core.invalid_step",
          path,
          "Agent loop step must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(step, stepKeys, path, errors);
    requireRef(step.step_ref, `${path}/step_ref`, errors);
    requireRef(step.node_ref, `${path}/node_ref`, errors);
    requirePositiveInteger(step.order, `${path}/order`, errors);
    requireKnown(step.status, stepStatuses, `${path}/status`, errors);
    requireRef(step.gate_ref, `${path}/gate_ref`, errors);
    requireRef(step.action_ref, `${path}/action_ref`, errors);
    requireRef(step.expected_artifact_ref, `${path}/expected_artifact_ref`, errors);
    requireStringArray(step.source_refs, `${path}/source_refs`, errors);
    if (typeof step.node_ref === "string" && !nodeRefs.has(step.node_ref)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref",
          `${path}/node_ref`,
          "Step node_ref must reference a managed node.",
        ),
      );
    }
    assertStepFalseFlag(step, "can_execute", path, errors);
    assertStepFalseFlag(step, "can_dispatch_provider", path, errors);
    assertStepFalseFlag(step, "runtime_mutation_allowed", path, errors);
    assertStepFalseFlag(step, "repo_write_allowed", path, errors);
    assertStepFalseFlag(step, "gateway_mcp_mutation_allowed", path, errors);
    assertStepFalseFlag(step, "uses_secret_value", path, errors);
    if (
      Object.hasOwn(step, "side_effects") &&
      (!Array.isArray(step.side_effects) || step.side_effects.length !== 0)
    ) {
      errors.push(
        error(
          "agent_loop_core.side_effects_forbidden",
          `${path}/side_effects`,
          "Step must preserve side_effects: [].",
        ),
      );
    }
    return [step as AgentLoopStepInput];
  });
}

function normalizeInteropMappings(
  value: unknown,
  errors: AgentLoopCoreError[],
): AgentLoopInteropMappingInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.interop_mapping_required",
        "/interop_mappings",
        "Agent loop requires interop mappings.",
      ),
    );
    return [];
  }
  return value.flatMap((mapping, index) => {
    const path = `/interop_mappings/${index}`;
    if (!isPlainObject(mapping)) {
      errors.push(
        error(
          "agent_loop_core.invalid_interop_mapping",
          path,
          "Interop mapping must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(mapping, interopKeys, path, errors);
    requireRef(mapping.mapping_ref, `${path}/mapping_ref`, errors);
    requireKnown(
      mapping.mapping_kind,
      interopMappingKinds,
      `${path}/mapping_kind`,
      errors,
    );
    requireSafeString(mapping.external_ref, `${path}/external_ref`, errors);
    if (mapping.mode !== "reference_only") {
      errors.push(
        error(
          "agent_loop_core.invalid_interop_mapping",
          `${path}/mode`,
          "Interop mapping must be reference_only.",
        ),
      );
    }
    requireStringArray(mapping.source_refs, `${path}/source_refs`, errors);
    return [mapping as AgentLoopInteropMappingInput];
  });
}

function normalizeRefs(
  value: unknown,
  path: string,
  errors: AgentLoopCoreError[],
): AgentLoopRefInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      error(
        "agent_loop_core.ref_required",
        path,
        "Agent loop requires reference records.",
      ),
    );
    return [];
  }
  return value.flatMap((record, index) => {
    const itemPath = `${path}/${index}`;
    if (!isPlainObject(record)) {
      errors.push(
        error(
          "agent_loop_core.invalid_ref_record",
          itemPath,
          "Reference record must be an object.",
        ),
      );
      return [];
    }
    assertKnownKeys(record, refKeys, itemPath, errors);
    requireRef(record.ref, `${itemPath}/ref`, errors);
    requireSafeString(record.summary, `${itemPath}/summary`, errors);
    requireStringArray(record.source_refs, `${itemPath}/source_refs`, errors);
    return [record as AgentLoopRefInput];
  });
}

function assertFalseFlag(
  input: Record<string, unknown>,
  key: string,
  codeSuffix: string,
  errors: AgentLoopCoreError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      error(
        `agent_loop_core.${codeSuffix}` as AgentLoopCoreErrorCode,
        `/${key}`,
        "Agent loop core plan cannot enable hard-gated behavior.",
      ),
    );
  }
}

function assertStepFalseFlag(
  input: Record<string, unknown>,
  key: keyof AgentLoopStepInput,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (Object.hasOwn(input, key) && input[key] !== false) {
    errors.push(
      error(
        key === "side_effects"
          ? "agent_loop_core.side_effects_forbidden"
          : "agent_loop_core.invalid_step",
        `${path}/${key}`,
        "Agent loop step cannot enable hard-gated behavior.",
      ),
    );
  }
}

function appendSecretValueErrors(
  value: unknown,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (typeof value === "string") {
    if (secretLikePattern.test(value)) {
      errors.push(
        error(
          "agent_loop_core.secret_value_embedded",
          path || "",
          "Agent loop core plan must use refs only and must not embed secret-like values.",
        ),
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      appendSecretValueErrors(item, `${path}/${index}`, errors),
    );
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

function requireRef(value: unknown, path: string, errors: AgentLoopCoreError[]): void {
  if (typeof value !== "string" || !refPattern.test(value)) {
    errors.push(
      error("agent_loop_core.invalid_ref", path, "Value must be a stable ref id."),
    );
  }
}

function requireSafeString(
  value: unknown,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (typeof value !== "string" || !safeString(value)) {
    errors.push(
      error("agent_loop_core.invalid_ref", path, "Value must be a safe string."),
    );
  }
}

function requireStringArray(
  value: unknown,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || !safeString(item))
  ) {
    errors.push(
      error(
        "agent_loop_core.invalid_ref",
        path,
        "Value must be a non-empty safe string array.",
      ),
    );
  }
}

function requireKnown(
  value: unknown,
  allowed: Set<string>,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push(
      error("agent_loop_core.invalid_ref", path, "Value is not in allowed set."),
    );
  }
}

function requirePositiveInteger(
  value: unknown,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (!Number.isInteger(value) || (value as number) < 1) {
    errors.push(
      error(
        "agent_loop_core.invalid_budget",
        path,
        "Value must be a positive integer.",
      ),
    );
  }
}

function requireNonNegativeNumber(
  value: unknown,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(
      error(
        "agent_loop_core.invalid_budget",
        path,
        "Value must be a non-negative number.",
      ),
    );
  }
}

function assertKnownKeys(
  object: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: AgentLoopCoreError[],
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      errors.push(
        error(
          "agent_loop_core.unexpected_field",
          `${path}/${escapeJsonPointerSegment(key)}`,
          "Unexpected agent loop field.",
        ),
      );
    }
  }
}

function emptyBudget(): AgentLoopBudgetInput {
  return {
    token_limit: 1,
    cost_usd: 0,
    runtime_seconds: 1,
    context_compaction_policy_ref: "policy.context_compaction.placeholder",
    summarization_strategy_ref: "policy.summarization.placeholder",
    trace_redaction_policy_ref: "policy.trace_redaction.placeholder",
  };
}

function fail(errors: AgentLoopCoreError[]): AgentLoopCorePlanResult {
  return {
    ok: false,
    plan: null,
    errors: dedupe(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function error(
  code: AgentLoopCoreErrorCode,
  path: string,
  message: string,
): AgentLoopCoreError {
  return { code, path, message, severity: "error" };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: string): boolean {
  return safeStringPattern.test(value) && !secretLikePattern.test(value);
}

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function dedupe(errors: AgentLoopCoreError[]): AgentLoopCoreError[] {
  const seen = new Set<string>();
  return errors.filter((item) => {
    const key = `${item.code}:${item.path}:${item.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function escapeJsonPointerSegment(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
