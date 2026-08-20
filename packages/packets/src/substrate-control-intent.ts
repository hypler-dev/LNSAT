import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const SUBSTRATE_CONTROL_INTENT_STATUS = "source_only";

export const substrateControlIntentContract = {
  contract_id: "lnsat.platform.substrate_control_intent.v0_1",
  authority: ["@lnsat/packets", "source-backed-substrate-control-intent"],
  intent_version: "0.1",
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  required_packet_families: [
    "capability",
    "execution",
    "environment",
    "audit",
    "results",
    "rollback",
  ],
  live_substrate_mutation_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type SubstrateControlIntentPacketFamily =
  (typeof substrateControlIntentContract.required_packet_families)[number];

export type SubstrateControlIntentSourceInput = {
  source_ref: string;
  summary: string;
};

export type SubstrateControlIntentActorInput = {
  actor_ref: string;
  actor_type:
    | "human"
    | "agent"
    | "local_model"
    | "commercial_model"
    | "script"
    | "worker"
    | "mcp_client"
    | "cli_client"
    | "automation";
  role_ref: string;
};

export type SubstrateControlIntentLifecycleRefInput = {
  packet_type: "CapabilityPacket" | "ExecutionPacket" | "EnvironmentPacket";
  lifecycle_ref: string;
  required_state: string;
};

export type SubstrateControlIntentPolicyGateInput = {
  gate_ref: string;
  decision_ref: string;
  required: true;
};

export type SubstrateControlIntentApprovalRefInput = {
  approval_ref: string;
  approval_type: "human" | "policy" | "runbook" | "rollback_owner";
  required: true;
};

export type SubstrateControlIntentAuditEventInput = {
  event_type:
    | "tool_requested"
    | "policy_checked"
    | "approval_requested"
    | "approval_granted"
    | "approval_denied"
    | "tool_denied"
    | "runbook_started"
    | "runbook_completed"
    | "decision_recorded";
  required: true;
  packet_family: SubstrateControlIntentPacketFamily;
};

export type SubstrateControlIntentResultExpectationInput = {
  result_packet_ref: string;
  expected_statuses: ("approved" | "denied" | "completed" | "failed" | "rolled_back")[];
  artifact_refs: string[];
  operator_visible_summary: string;
};

export type SubstrateControlIntentRollbackExpectationInput = {
  rollback_ref: string;
  required_for_risk_level_at_or_above: number;
  owner_ref: string;
  evidence_refs: string[];
};

export type SubstrateControlIntentRequest = {
  intent_version?: typeof substrateControlIntentContract.intent_version;
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  source_refs?: SubstrateControlIntentSourceInput[];
  lifecycle_refs?: SubstrateControlIntentLifecycleRefInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_plan?: SubstrateControlIntentAuditEventInput[];
  result_expectations?: SubstrateControlIntentResultExpectationInput;
  rollback_expectations?: SubstrateControlIntentRollbackExpectationInput[];
  blocked_live_actions?: string[];
  live_substrate_mutation_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type SubstrateControlIntentErrorCode =
  | "substrate_control_intent.invalid_request"
  | "substrate_control_intent.unexpected_field"
  | "substrate_control_intent.invalid_version"
  | "substrate_control_intent.actor_required"
  | "substrate_control_intent.invalid_actor"
  | "substrate_control_intent.invalid_capability"
  | "substrate_control_intent.invalid_risk_level"
  | "substrate_control_intent.invalid_substrate_kind"
  | "substrate_control_intent.invalid_control_mode"
  | "substrate_control_intent.source_ref_required"
  | "substrate_control_intent.invalid_source_ref"
  | "substrate_control_intent.lifecycle_ref_required"
  | "substrate_control_intent.invalid_lifecycle_ref"
  | "substrate_control_intent.policy_gate_required"
  | "substrate_control_intent.invalid_policy_gate"
  | "substrate_control_intent.approval_required"
  | "substrate_control_intent.invalid_approval_ref"
  | "substrate_control_intent.audit_event_required"
  | "substrate_control_intent.invalid_audit_event"
  | "substrate_control_intent.result_expectation_required"
  | "substrate_control_intent.invalid_result_expectation"
  | "substrate_control_intent.rollback_expectation_required"
  | "substrate_control_intent.invalid_rollback_expectation"
  | "substrate_control_intent.unsafe_substrate_authority"
  | "substrate_control_intent.secret_value_forbidden"
  | "substrate_control_intent.live_substrate_mutation_forbidden"
  | "substrate_control_intent.live_execution_forbidden"
  | "substrate_control_intent.side_effects_forbidden";

export type SubstrateControlIntentError = {
  code: SubstrateControlIntentErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type SubstrateControlIntentEvidence = {
  contract_id: typeof substrateControlIntentContract.contract_id;
  intent_version: typeof substrateControlIntentContract.intent_version;
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  required_packet_family_refs: Record<SubstrateControlIntentPacketFamily, string[]>;
  lifecycle_refs: SubstrateControlIntentLifecycleRefInput[];
  required_policy_gates: string[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_approvals: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  audit_event_plan: SubstrateControlIntentAuditEventInput[];
  required_audit_events: string[];
  result_expectations: SubstrateControlIntentResultExpectationInput;
  rollback_expectations: SubstrateControlIntentRollbackExpectationInput[];
  blocked_live_actions: string[];
  denied_live_behavior: string[];
  secret_posture: "references_only_no_values";
  source_refs: string[];
  live_substrate_mutation_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type SubstrateControlIntentResult =
  | {
      ok: true;
      substrate_control_intent: SubstrateControlIntentEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      substrate_control_intent: null;
      errors: SubstrateControlIntentError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedSubstrateControlIntentRequest =
  | {
      ok: true;
      intent: Omit<
        SubstrateControlIntentEvidence,
        "contract_id" | "intent_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: SubstrateControlIntentError[];
    };

const requestKeys = new Set([
  "intent_version",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "source_refs",
  "lifecycle_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_plan",
  "result_expectations",
  "rollback_expectations",
  "blocked_live_actions",
  "live_substrate_mutation_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const lifecycleRefKeys = new Set(["packet_type", "lifecycle_ref", "required_state"]);
const policyGateKeys = new Set(["gate_ref", "decision_ref", "required"]);
const approvalRefKeys = new Set(["approval_ref", "approval_type", "required"]);
const auditEventKeys = new Set(["event_type", "required", "packet_family"]);
const resultExpectationKeys = new Set([
  "result_packet_ref",
  "expected_statuses",
  "artifact_refs",
  "operator_visible_summary",
]);
const rollbackExpectationKeys = new Set([
  "rollback_ref",
  "required_for_risk_level_at_or_above",
  "owner_ref",
  "evidence_refs",
]);
const substrateKinds = new Set<SubstrateKind>([
  "repos",
  "hosts",
  "containers",
  "services",
  "databases",
  "queues",
  "tunnels",
  "cloud_accounts",
  "agents",
  "models",
]);
const controlModes = new Set<SubstrateControlMode>([
  "observation",
  "proposal",
  "approval_gated_mutation",
  "forbidden_mutation",
]);
const actorTypes = new Set<SubstrateControlIntentActorInput["actor_type"]>([
  "human",
  "agent",
  "local_model",
  "commercial_model",
  "script",
  "worker",
  "mcp_client",
  "cli_client",
  "automation",
]);
const packetTypes = new Set<SubstrateControlIntentLifecycleRefInput["packet_type"]>([
  "CapabilityPacket",
  "ExecutionPacket",
  "EnvironmentPacket",
]);
const packetFamilies = new Set<SubstrateControlIntentPacketFamily>(
  substrateControlIntentContract.required_packet_families,
);
const approvalTypes = new Set<SubstrateControlIntentApprovalRefInput["approval_type"]>([
  "human",
  "policy",
  "runbook",
  "rollback_owner",
]);
const auditEventTypes = new Set<SubstrateControlIntentAuditEventInput["event_type"]>([
  "tool_requested",
  "policy_checked",
  "approval_requested",
  "approval_granted",
  "approval_denied",
  "tool_denied",
  "runbook_started",
  "runbook_completed",
  "decision_recorded",
]);
const resultStatuses = new Set<
  SubstrateControlIntentResultExpectationInput["expected_statuses"][number]
>(["approved", "denied", "completed", "failed", "rolled_back"]);

const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const refPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf)\b/i;
const riskyRollbackLevel = 4;

const defaultBlockedLiveActions = [
  "substrate.mutation.execute",
  "runtime.execution.start",
  "database.write.execute",
  "service.restart.execute",
  "queue.worker.start",
  "dns.cloudflare.write",
  "ssh.raw.execute",
  "docker.runner.start",
  "node_agent.exec",
  "git.command.execute",
];

const defaultDeniedLiveBehavior = [
  "no live substrate mutation",
  "no live execution",
  "no raw shell or SSH",
  "no database writes",
  "no service, queue, DNS, Cloudflare, Docker, node-agent, or Git mutation",
  "no secret values",
];

export const defaultSubstrateControlIntent: SubstrateControlIntentEvidence = {
  contract_id: substrateControlIntentContract.contract_id,
  intent_version: substrateControlIntentContract.intent_version,
  requested_actor: {
    actor_ref: "agent:codex",
    actor_type: "agent",
    role_ref: "role:ops_assistant",
  },
  capability: "service.restart.request",
  risk_level: 5,
  target_substrate_kind: "services",
  requested_control_mode: "approval_gated_mutation",
  required_packet_family_refs: {
    capability: ["packet_family:capability"],
    execution: ["packet_family:execution"],
    environment: ["packet_family:environment"],
    audit: ["packet_family:audit"],
    results: ["packet_family:results"],
    rollback: ["packet_family:rollback"],
  },
  lifecycle_refs: [
    {
      packet_type: "CapabilityPacket",
      lifecycle_ref: "lifecycle:CapabilityPacket:approval_required",
      required_state: "approval_required",
    },
    {
      packet_type: "ExecutionPacket",
      lifecycle_ref: "lifecycle:ExecutionPacket:approved",
      required_state: "approved",
    },
    {
      packet_type: "EnvironmentPacket",
      lifecycle_ref: "lifecycle:EnvironmentPacket:approved",
      required_state: "approved",
    },
  ],
  required_policy_gates: [
    "substrate.intent.policy.review",
    "services.mutation.approval",
    "execution.approval.required",
  ],
  policy_gate_refs: [
    {
      gate_ref: "substrate.intent.policy.review",
      decision_ref: "policy_decision:substrate-control-intent-source-only",
      required: true,
    },
    {
      gate_ref: "services.mutation.approval",
      decision_ref: "policy_decision:service-mutation-approval-required",
      required: true,
    },
  ],
  required_approvals: ["approval:human-substrate-control", "approval:rollback-owner"],
  approval_refs: [
    {
      approval_ref: "approval:human-substrate-control",
      approval_type: "human",
      required: true,
    },
    {
      approval_ref: "approval:rollback-owner",
      approval_type: "rollback_owner",
      required: true,
    },
  ],
  audit_event_plan: [
    {
      event_type: "tool_requested",
      required: true,
      packet_family: "capability",
    },
    {
      event_type: "policy_checked",
      required: true,
      packet_family: "audit",
    },
    {
      event_type: "approval_requested",
      required: true,
      packet_family: "audit",
    },
    {
      event_type: "approval_granted",
      required: true,
      packet_family: "audit",
    },
    {
      event_type: "tool_denied",
      required: true,
      packet_family: "audit",
    },
    {
      event_type: "runbook_started",
      required: true,
      packet_family: "execution",
    },
    {
      event_type: "runbook_completed",
      required: true,
      packet_family: "results",
    },
    {
      event_type: "decision_recorded",
      required: true,
      packet_family: "rollback",
    },
  ],
  required_audit_events: [
    "tool_requested",
    "policy_checked",
    "approval_requested",
    "approval_granted",
    "tool_denied",
    "runbook_started",
    "runbook_completed",
    "decision_recorded",
  ],
  result_expectations: {
    result_packet_ref: "result_packet:substrate-control-intent",
    expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    artifact_refs: ["artifact:operator-visible-control-intent-evidence"],
    operator_visible_summary:
      "operator can inspect requested control, gates, approvals, audit plan, result, and rollback evidence before any live action",
  },
  rollback_expectations: [
    {
      rollback_ref: "rollback:service-control-intent-review",
      required_for_risk_level_at_or_above: riskyRollbackLevel,
      owner_ref: "owner:lnsat-platform",
      evidence_refs: [
        "doc:docs/architecture/POLICY_AND_AUDIT.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ],
    },
  ],
  blocked_live_actions: defaultBlockedLiveActions,
  denied_live_behavior: defaultDeniedLiveBehavior,
  secret_posture: "references_only_no_values",
  source_refs: [
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0096: source-only substrate control intent contract",
  ],
  live_substrate_mutation_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
};

export function createSubstrateControlIntent(
  input: unknown = {},
): SubstrateControlIntentResult {
  const normalized = normalizeSubstrateControlIntentRequest(input);

  if (!normalized.ok) {
    return failSubstrateControlIntent(normalized.errors);
  }

  return {
    ok: true,
    substrate_control_intent: {
      contract_id: substrateControlIntentContract.contract_id,
      intent_version: substrateControlIntentContract.intent_version,
      ...normalized.intent,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeSubstrateControlIntentRequest(
  input: unknown,
): NormalizedSubstrateControlIntentRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        substrateControlIntentError(
          "substrate_control_intent.invalid_request",
          "",
          "Substrate control intent request must be an object.",
        ),
      ],
    };
  }

  const errors: SubstrateControlIntentError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.unexpected_field",
          jsonPointer(key),
          "Unexpected substrate control intent request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "intent_version") &&
    input.intent_version !== substrateControlIntentContract.intent_version
  ) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_version",
        "/intent_version",
        "Substrate control intent version is unsupported.",
      ),
    );
  }

  const actor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultSubstrateControlIntent.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultSubstrateControlIntent.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultSubstrateControlIntent.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultSubstrateControlIntent.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultSubstrateControlIntent.requested_control_mode;
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, "/source_refs", errors)
    : [...defaultSubstrateControlIntent.source_refs];
  const lifecycleRefs = Object.hasOwn(input, "lifecycle_refs")
    ? normalizeLifecycleRefs(input.lifecycle_refs, errors)
    : [...defaultSubstrateControlIntent.lifecycle_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultSubstrateControlIntent.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultSubstrateControlIntent.approval_refs];
  const auditEventPlan = Object.hasOwn(input, "audit_event_plan")
    ? normalizeAuditEventPlan(input.audit_event_plan, errors)
    : [...defaultSubstrateControlIntent.audit_event_plan];
  const resultExpectations = Object.hasOwn(input, "result_expectations")
    ? normalizeResultExpectations(input.result_expectations, errors)
    : defaultSubstrateControlIntent.result_expectations;
  const rollbackExpectations = Object.hasOwn(input, "rollback_expectations")
    ? normalizeRollbackExpectations(input.rollback_expectations, errors)
    : [...defaultSubstrateControlIntent.rollback_expectations];
  const blockedLiveActions = Object.hasOwn(input, "blocked_live_actions")
    ? normalizeBlockedLiveActions(input.blocked_live_actions, errors)
    : [...defaultSubstrateControlIntent.blocked_live_actions];
  const requiredPolicyGates = Object.hasOwn(input, "policy_gate_refs")
    ? uniqueStrings([
        "substrate.intent.policy.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ])
    : [...defaultSubstrateControlIntent.required_policy_gates];

  if (
    Object.hasOwn(input, "live_substrate_mutation_allowed") &&
    input.live_substrate_mutation_allowed !== false
  ) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.live_substrate_mutation_forbidden",
        "/live_substrate_mutation_allowed",
        "Substrate control intent cannot enable live substrate mutation.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.live_execution_forbidden",
        "/live_execution_allowed",
        "Substrate control intent cannot enable live execution.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.side_effects_forbidden",
        "/side_effects",
        "Substrate control intent must preserve side_effects: [].",
      ),
    );
  }

  if (sourceRefs.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.source_ref_required",
        "/source_refs",
        "Substrate control intent requires source refs.",
      ),
    );
  }

  if (lifecycleRefs.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.lifecycle_ref_required",
        "/lifecycle_refs",
        "Substrate control intent requires packet lifecycle refs.",
      ),
    );
  }

  if (policyGateRefs.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.policy_gate_required",
        "/policy_gate_refs",
        "Substrate control intent requires policy gate refs.",
      ),
    );
  }

  if (requiresApproval(controlMode, riskLevel) && approvalRefs.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.approval_required",
        "/approval_refs",
        "Approval-gated or risky substrate control intent requires approval refs.",
      ),
    );
  }

  const requiredAuditEvents = uniqueStrings(
    auditEventPlan.map((event) => event.event_type),
  );
  for (const eventType of defaultSubstrateControlIntent.required_audit_events) {
    if (!requiredAuditEvents.includes(eventType)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.audit_event_required",
          `/audit_event_plan/${eventType}`,
          `Substrate control intent requires ${eventType} audit event.`,
        ),
      );
    }
  }

  if (requiresRollback(riskLevel, controlMode) && rollbackExpectations.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.rollback_expectation_required",
        "/rollback_expectations",
        "Risky substrate control intent requires rollback expectations.",
      ),
    );
  }

  if (controlMode === "forbidden_mutation") {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.unsafe_substrate_authority",
        "/requested_control_mode",
        "Forbidden mutation cannot be requested as a control intent.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    intent: {
      requested_actor: actor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      required_packet_family_refs:
        defaultSubstrateControlIntent.required_packet_family_refs,
      lifecycle_refs: lifecycleRefs,
      required_policy_gates: requiredPolicyGates,
      policy_gate_refs: policyGateRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      approval_refs: approvalRefs,
      audit_event_plan: auditEventPlan,
      required_audit_events: requiredAuditEvents,
      result_expectations: resultExpectations,
      rollback_expectations: rollbackExpectations,
      blocked_live_actions: uniqueStrings(blockedLiveActions),
      denied_live_behavior: [...defaultSubstrateControlIntent.denied_live_behavior],
      secret_posture: "references_only_no_values",
      source_refs: sourceRefs,
      live_substrate_mutation_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeActor(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.actor_required",
        "/requested_actor",
        "Substrate control intent requires requested actor.",
      ),
    );
    return defaultSubstrateControlIntent.requested_actor;
  }

  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.unexpected_field",
          `/requested_actor/${escapeJsonPointerSegment(key)}`,
          "Unexpected requested actor field.",
        ),
      );
    }
  }

  const actorRef =
    typeof value.actor_ref === "string" && safeRef(value.actor_ref)
      ? value.actor_ref
      : null;
  const roleRef =
    typeof value.role_ref === "string" && safeRef(value.role_ref)
      ? value.role_ref
      : null;
  const actorType =
    typeof value.actor_type === "string" &&
    actorTypes.has(value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      ? (value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      : null;

  if (actorRef === null) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_actor",
        "/requested_actor/actor_ref",
        "Requested actor ref must be a safe reference.",
      ),
    );
  }
  if (actorType === null) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_actor",
        "/requested_actor/actor_type",
        "Requested actor type is unsupported.",
      ),
    );
  }
  if (roleRef === null) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_actor",
        "/requested_actor/role_ref",
        "Requested actor role ref must be a safe reference.",
      ),
    );
  }

  return {
    actor_ref: actorRef ?? defaultSubstrateControlIntent.requested_actor.actor_ref,
    actor_type: actorType ?? defaultSubstrateControlIntent.requested_actor.actor_type,
    role_ref: roleRef ?? defaultSubstrateControlIntent.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: SubstrateControlIntentError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      substrateControlIntentError(
        secretLike(value)
          ? "substrate_control_intent.secret_value_forbidden"
          : "substrate_control_intent.invalid_capability",
        "/capability",
        secretLike(value)
          ? "Substrate control intent cannot contain secret-like capability values."
          : "Substrate control intent capability must be safe.",
      ),
    );
    return defaultSubstrateControlIntent.capability;
  }

  if (unsafeAuthority(value)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.unsafe_substrate_authority",
        "/capability",
        "Substrate control intent capability requests unsafe authority.",
      ),
    );
  }

  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: SubstrateControlIntentError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_risk_level",
        "/risk_level",
        "Substrate control intent risk_level must be an integer from 0 through 8.",
      ),
    );
    return defaultSubstrateControlIntent.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_substrate_kind",
        "/target_substrate_kind",
        "Substrate control intent target substrate kind is unsupported.",
      ),
    );
    return defaultSubstrateControlIntent.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_control_mode",
        "/requested_control_mode",
        "Substrate control intent requested control mode is unsupported.",
      ),
    );
    return defaultSubstrateControlIntent.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeLifecycleRefs(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentLifecycleRefInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.lifecycle_ref_required",
        "/lifecycle_refs",
        "Substrate control intent requires lifecycle refs.",
      ),
    );
    return [];
  }

  return value.flatMap((ref, index) => {
    const path = `/lifecycle_refs/${index}`;
    if (!isPlainObject(ref)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_lifecycle_ref",
          path,
          "Lifecycle ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(ref)) {
      if (!lifecycleRefKeys.has(key)) {
        errors.push(
          substrateControlIntentError(
            "substrate_control_intent.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected lifecycle ref field.",
          ),
        );
      }
    }

    if (
      typeof ref.packet_type !== "string" ||
      !packetTypes.has(
        ref.packet_type as SubstrateControlIntentLifecycleRefInput["packet_type"],
      ) ||
      typeof ref.lifecycle_ref !== "string" ||
      !safeRef(ref.lifecycle_ref) ||
      typeof ref.required_state !== "string" ||
      !safeString(ref.required_state)
    ) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_lifecycle_ref",
          path,
          "Lifecycle ref must use safe packet type, lifecycle ref, and required state.",
        ),
      );
      return [];
    }

    return [
      {
        packet_type:
          ref.packet_type as SubstrateControlIntentLifecycleRefInput["packet_type"],
        lifecycle_ref: ref.lifecycle_ref,
        required_state: ref.required_state,
      },
    ];
  });
}

function normalizePolicyGateRefs(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.policy_gate_required",
        "/policy_gate_refs",
        "Substrate control intent requires policy gate refs.",
      ),
    );
    return [];
  }

  return value.flatMap((gate, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(gate)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(gate)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          substrateControlIntentError(
            "substrate_control_intent.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected policy gate ref field.",
          ),
        );
      }
    }

    if (
      typeof gate.gate_ref !== "string" ||
      !safePolicyGate(gate.gate_ref) ||
      typeof gate.decision_ref !== "string" ||
      !safeRef(gate.decision_ref) ||
      gate.required !== true
    ) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_policy_gate",
          path,
          "Policy gate ref must be required and source-backed.",
        ),
      );
      return [];
    }

    return [
      {
        gate_ref: gate.gate_ref,
        decision_ref: gate.decision_ref,
        required: true,
      },
    ];
  });
}

function normalizeApprovalRefs(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.invalid_approval_ref",
        "/approval_refs",
        "Approval refs must be an array.",
      ),
    );
    return [];
  }

  return value.flatMap((approval, index) => {
    const path = `/approval_refs/${index}`;
    if (!isPlainObject(approval)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(approval)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          substrateControlIntentError(
            "substrate_control_intent.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected approval ref field.",
          ),
        );
      }
    }

    if (
      typeof approval.approval_ref !== "string" ||
      !safeRef(approval.approval_ref) ||
      typeof approval.approval_type !== "string" ||
      !approvalTypes.has(
        approval.approval_type as SubstrateControlIntentApprovalRefInput["approval_type"],
      ) ||
      approval.required !== true
    ) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_approval_ref",
          path,
          "Approval ref must be required and source-backed.",
        ),
      );
      return [];
    }

    return [
      {
        approval_ref: approval.approval_ref,
        approval_type:
          approval.approval_type as SubstrateControlIntentApprovalRefInput["approval_type"],
        required: true,
      },
    ];
  });
}

function normalizeAuditEventPlan(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentAuditEventInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.audit_event_required",
        "/audit_event_plan",
        "Substrate control intent requires audit event plan.",
      ),
    );
    return [];
  }

  return value.flatMap((event, index) => {
    const path = `/audit_event_plan/${index}`;
    if (!isPlainObject(event)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_audit_event",
          path,
          "Audit event plan entry must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(event)) {
      if (!auditEventKeys.has(key)) {
        errors.push(
          substrateControlIntentError(
            "substrate_control_intent.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected audit event plan field.",
          ),
        );
      }
    }

    if (
      typeof event.event_type !== "string" ||
      !auditEventTypes.has(
        event.event_type as SubstrateControlIntentAuditEventInput["event_type"],
      ) ||
      event.required !== true ||
      typeof event.packet_family !== "string" ||
      !packetFamilies.has(event.packet_family as SubstrateControlIntentPacketFamily)
    ) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_audit_event",
          path,
          "Audit event plan entry must be required and packet-family backed.",
        ),
      );
      return [];
    }

    return [
      {
        event_type:
          event.event_type as SubstrateControlIntentAuditEventInput["event_type"],
        required: true,
        packet_family: event.packet_family as SubstrateControlIntentPacketFamily,
      },
    ];
  });
}

function normalizeResultExpectations(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentResultExpectationInput {
  if (!isPlainObject(value)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.result_expectation_required",
        "/result_expectations",
        "Substrate control intent requires result expectations.",
      ),
    );
    return defaultSubstrateControlIntent.result_expectations;
  }

  for (const key of Object.keys(value)) {
    if (!resultExpectationKeys.has(key)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.unexpected_field",
          `/result_expectations/${escapeJsonPointerSegment(key)}`,
          "Unexpected result expectation field.",
        ),
      );
    }
  }

  if (
    typeof value.result_packet_ref !== "string" ||
    !safeRef(value.result_packet_ref) ||
    !Array.isArray(value.expected_statuses) ||
    value.expected_statuses.length === 0 ||
    !value.expected_statuses.every(
      (status) =>
        typeof status === "string" &&
        resultStatuses.has(
          status as SubstrateControlIntentResultExpectationInput["expected_statuses"][number],
        ),
    ) ||
    !Array.isArray(value.artifact_refs) ||
    value.artifact_refs.length === 0 ||
    !value.artifact_refs.every((ref) => typeof ref === "string" && safeRef(ref)) ||
    typeof value.operator_visible_summary !== "string" ||
    !safeString(value.operator_visible_summary)
  ) {
    errors.push(
      substrateControlIntentError(
        secretLike(value.operator_visible_summary)
          ? "substrate_control_intent.secret_value_forbidden"
          : "substrate_control_intent.invalid_result_expectation",
        "/result_expectations",
        secretLike(value.operator_visible_summary)
          ? "Substrate control intent result expectations cannot contain secrets."
          : "Substrate control intent result expectations must be safe and source-backed.",
      ),
    );
    return defaultSubstrateControlIntent.result_expectations;
  }

  return {
    result_packet_ref: value.result_packet_ref,
    expected_statuses:
      value.expected_statuses as SubstrateControlIntentResultExpectationInput["expected_statuses"],
    artifact_refs: value.artifact_refs as string[],
    operator_visible_summary: value.operator_visible_summary,
  };
}

function normalizeRollbackExpectations(
  value: unknown,
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.rollback_expectation_required",
        "/rollback_expectations",
        "Substrate control intent rollback expectations must be an array.",
      ),
    );
    return [];
  }

  return value.flatMap((rollback, index) => {
    const path = `/rollback_expectations/${index}`;
    if (!isPlainObject(rollback)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_rollback_expectation",
          path,
          "Rollback expectation must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(rollback)) {
      if (!rollbackExpectationKeys.has(key)) {
        errors.push(
          substrateControlIntentError(
            "substrate_control_intent.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected rollback expectation field.",
          ),
        );
      }
    }

    const requiredRiskLevel = rollback.required_for_risk_level_at_or_above;

    if (
      typeof rollback.rollback_ref !== "string" ||
      !safeRef(rollback.rollback_ref) ||
      typeof requiredRiskLevel !== "number" ||
      !Number.isInteger(requiredRiskLevel) ||
      requiredRiskLevel < 0 ||
      requiredRiskLevel > 8 ||
      typeof rollback.owner_ref !== "string" ||
      !safeRef(rollback.owner_ref) ||
      !Array.isArray(rollback.evidence_refs) ||
      rollback.evidence_refs.length === 0 ||
      !rollback.evidence_refs.every((ref) => typeof ref === "string" && safeRef(ref))
    ) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_rollback_expectation",
          path,
          "Rollback expectation must be safe and source-backed.",
        ),
      );
      return [];
    }

    return [
      {
        rollback_ref: rollback.rollback_ref,
        required_for_risk_level_at_or_above: requiredRiskLevel,
        owner_ref: rollback.owner_ref,
        evidence_refs: rollback.evidence_refs as string[],
      },
    ];
  });
}

function normalizeBlockedLiveActions(
  value: unknown,
  errors: SubstrateControlIntentError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.unsafe_substrate_authority",
        "/blocked_live_actions",
        "Substrate control intent requires blocked live actions.",
      ),
    );
    return [];
  }

  return value.flatMap((action, index) => {
    if (typeof action !== "string" || !safeCapability(action)) {
      errors.push(
        substrateControlIntentError(
          secretLike(action)
            ? "substrate_control_intent.secret_value_forbidden"
            : "substrate_control_intent.unsafe_substrate_authority",
          `/blocked_live_actions/${index}`,
          secretLike(action)
            ? "Blocked live actions cannot contain secret-like values."
            : "Blocked live action must be a safe capability-style string.",
        ),
      );
      return [];
    }
    return [action];
  });
}

function normalizeSourceRefs(
  value: unknown,
  path: string,
  errors: SubstrateControlIntentError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      substrateControlIntentError(
        "substrate_control_intent.source_ref_required",
        path,
        "Substrate control intent requires one or more source refs.",
      ),
    );
    return [];
  }

  return value.flatMap((source, index) => {
    const sourcePath = `${path}/${index}`;
    if (!isPlainObject(source)) {
      errors.push(
        substrateControlIntentError(
          "substrate_control_intent.invalid_source_ref",
          sourcePath,
          "Source ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          substrateControlIntentError(
            "substrate_control_intent.unexpected_field",
            `${sourcePath}/${escapeJsonPointerSegment(key)}`,
            "Unexpected source ref field.",
          ),
        );
      }
    }

    if (
      typeof source.source_ref !== "string" ||
      !safeRef(source.source_ref) ||
      typeof source.summary !== "string" ||
      !safeString(source.summary)
    ) {
      errors.push(
        substrateControlIntentError(
          secretLike(source.source_ref) || secretLike(source.summary)
            ? "substrate_control_intent.secret_value_forbidden"
            : "substrate_control_intent.invalid_source_ref",
          sourcePath,
          secretLike(source.source_ref) || secretLike(source.summary)
            ? "Source refs cannot contain secret-like values."
            : "Source ref must include safe source_ref and summary.",
        ),
      );
      return [];
    }

    return [`${source.source_ref}: ${source.summary}`];
  });
}

function requiresApproval(mode: SubstrateControlMode, riskLevel: number): boolean {
  return mode === "approval_gated_mutation" || riskLevel >= 5;
}

function requiresRollback(riskLevel: number, mode: SubstrateControlMode): boolean {
  return riskLevel >= riskyRollbackLevel || mode === "approval_gated_mutation";
}

function failSubstrateControlIntent(
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentResult {
  return {
    ok: false,
    substrate_control_intent: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function substrateControlIntentError(
  code: SubstrateControlIntentErrorCode,
  path: string,
  message: string,
): SubstrateControlIntentError {
  return { code, path, message, severity: "error" };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function safeString(value: string): boolean {
  return safeStringPattern.test(value) && !secretLike(value) && !unsafeAuthority(value);
}

function safeRef(value: string): boolean {
  return refPattern.test(value) && !secretLike(value);
}

function safeCapability(value: string): boolean {
  return capabilityPattern.test(value) && !secretLike(value);
}

function safePolicyGate(value: string): boolean {
  return policyGatePattern.test(value) && !secretLike(value) && !unsafeAuthority(value);
}

function secretLike(value: unknown): boolean {
  return typeof value === "string" && secretLikePattern.test(value);
}

function unsafeAuthority(value: string): boolean {
  return unsafeAuthorityPattern.test(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: SubstrateControlIntentError[],
): SubstrateControlIntentError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.code}:${error.path}:${error.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function jsonPointer(key: string): string {
  return `/${escapeJsonPointerSegment(key)}`;
}

function escapeJsonPointerSegment(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
