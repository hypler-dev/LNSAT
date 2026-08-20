import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";
import {
  defaultSubstrateControlIntent,
  substrateControlIntentContract,
} from "./substrate-control-intent.js";
import type {
  SubstrateControlIntentActorInput,
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentAuditEventInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentResultExpectationInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";

export const CAPABILITY_BROKER_REQUEST_STATUS = "source_only";

export const capabilityBrokerRequestContract = {
  contract_id: "lnsat.platform.capability_broker_request.v0_1",
  authority: ["@lnsat/packets", "source-backed-capability-broker-request"],
  request_version: "0.1",
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
  broker_decision_posture: "classify_and_propose_only_no_dispatch",
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type CapabilityBrokerAdapterClass =
  | "repo_control_adapter"
  | "host_control_adapter"
  | "container_control_adapter"
  | "service_control_adapter"
  | "database_control_adapter"
  | "queue_control_adapter"
  | "tunnel_control_adapter"
  | "cloud_account_control_adapter"
  | "agent_control_adapter"
  | "model_control_adapter"
  | "no_adapter_dispatch";

export type CapabilityBrokerRequestSourceInput = {
  source_ref: string;
  summary: string;
};

export type CapabilityBrokerSubstrateIntentRefInput = {
  intent_ref: string;
  evidence_ref: string;
  contract_id: typeof substrateControlIntentContract.contract_id;
  summary: string;
};

export type CapabilityBrokerRequest = {
  request_version?: typeof capabilityBrokerRequestContract.request_version;
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  source_refs?: CapabilityBrokerRequestSourceInput[];
  substrate_control_intent_refs?: CapabilityBrokerSubstrateIntentRefInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_plan?: SubstrateControlIntentAuditEventInput[];
  result_expectations?: SubstrateControlIntentResultExpectationInput;
  rollback_expectations?: SubstrateControlIntentRollbackExpectationInput[];
  proposed_adapter_class?: CapabilityBrokerAdapterClass;
  blocked_broker_dispatch_actions?: string[];
  denied_broker_dispatch_behavior?: string[];
  denied_live_behavior?: string[];
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type CapabilityBrokerRequestErrorCode =
  | "capability_broker_request.invalid_request"
  | "capability_broker_request.unexpected_field"
  | "capability_broker_request.invalid_version"
  | "capability_broker_request.actor_required"
  | "capability_broker_request.invalid_actor"
  | "capability_broker_request.invalid_capability"
  | "capability_broker_request.invalid_risk_level"
  | "capability_broker_request.invalid_substrate_kind"
  | "capability_broker_request.invalid_control_mode"
  | "capability_broker_request.source_ref_required"
  | "capability_broker_request.invalid_source_ref"
  | "capability_broker_request.substrate_control_intent_ref_required"
  | "capability_broker_request.invalid_substrate_control_intent_ref"
  | "capability_broker_request.policy_gate_required"
  | "capability_broker_request.invalid_policy_gate"
  | "capability_broker_request.approval_required"
  | "capability_broker_request.invalid_approval_ref"
  | "capability_broker_request.audit_event_required"
  | "capability_broker_request.invalid_audit_event"
  | "capability_broker_request.result_expectation_required"
  | "capability_broker_request.invalid_result_expectation"
  | "capability_broker_request.rollback_expectation_required"
  | "capability_broker_request.invalid_rollback_expectation"
  | "capability_broker_request.invalid_adapter_class"
  | "capability_broker_request.unsafe_adapter_authority"
  | "capability_broker_request.secret_value_forbidden"
  | "capability_broker_request.live_broker_dispatch_forbidden"
  | "capability_broker_request.live_execution_forbidden"
  | "capability_broker_request.side_effects_forbidden";

export type CapabilityBrokerRequestError = {
  code: CapabilityBrokerRequestErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type CapabilityBrokerRequestEvidence = {
  contract_id: typeof capabilityBrokerRequestContract.contract_id;
  request_version: typeof capabilityBrokerRequestContract.request_version;
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  broker_decision_posture: typeof capabilityBrokerRequestContract.broker_decision_posture;
  substrate_control_intent_refs: CapabilityBrokerSubstrateIntentRefInput[];
  required_policy_gates: string[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_approvals: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  audit_event_plan: SubstrateControlIntentAuditEventInput[];
  required_audit_events: string[];
  result_expectations: SubstrateControlIntentResultExpectationInput;
  rollback_expectations: SubstrateControlIntentRollbackExpectationInput[];
  proposed_adapter_class: CapabilityBrokerAdapterClass;
  proposed_adapter_authority: "proposal_only_no_dispatch";
  blocked_broker_dispatch_actions: string[];
  denied_broker_dispatch_behavior: string[];
  denied_live_behavior: string[];
  source_refs: string[];
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type CapabilityBrokerRequestResult =
  | {
      ok: true;
      capability_broker_request: CapabilityBrokerRequestEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      capability_broker_request: null;
      errors: CapabilityBrokerRequestError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedCapabilityBrokerRequest =
  | {
      ok: true;
      request: Omit<
        CapabilityBrokerRequestEvidence,
        "contract_id" | "request_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: CapabilityBrokerRequestError[];
    };

const requestKeys = new Set([
  "request_version",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "source_refs",
  "substrate_control_intent_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_plan",
  "result_expectations",
  "rollback_expectations",
  "proposed_adapter_class",
  "blocked_broker_dispatch_actions",
  "denied_broker_dispatch_behavior",
  "denied_live_behavior",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
]);
const actorKeys = new Set(["actor_ref", "actor_type", "role_ref"]);
const sourceKeys = new Set(["source_ref", "summary"]);
const substrateIntentRefKeys = new Set([
  "intent_ref",
  "evidence_ref",
  "contract_id",
  "summary",
]);
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
const packetFamilies = new Set([
  "capability",
  "execution",
  "environment",
  "audit",
  "results",
  "rollback",
]);
const resultStatuses = new Set<
  SubstrateControlIntentResultExpectationInput["expected_statuses"][number]
>(["approved", "denied", "completed", "failed", "rolled_back"]);
const adapterClasses = new Set<CapabilityBrokerAdapterClass>([
  "repo_control_adapter",
  "host_control_adapter",
  "container_control_adapter",
  "service_control_adapter",
  "database_control_adapter",
  "queue_control_adapter",
  "tunnel_control_adapter",
  "cloud_account_control_adapter",
  "agent_control_adapter",
  "model_control_adapter",
  "no_adapter_dispatch",
]);

const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const refPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|live_dispatch|dispatch\.execute|adapter\.invoke)\b/i;
const riskyRollbackLevel = 4;

const adapterBySubstrateKind: Record<SubstrateKind, CapabilityBrokerAdapterClass> = {
  repos: "repo_control_adapter",
  hosts: "host_control_adapter",
  containers: "container_control_adapter",
  services: "service_control_adapter",
  databases: "database_control_adapter",
  queues: "queue_control_adapter",
  tunnels: "tunnel_control_adapter",
  cloud_accounts: "cloud_account_control_adapter",
  agents: "agent_control_adapter",
  models: "model_control_adapter",
};

const defaultBlockedBrokerDispatchActions = [
  "capability.broker.dispatch.execute",
  "substrate.adapter.invoke",
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

const defaultDeniedBrokerDispatchBehavior = [
  "broker classifies request only",
  "broker proposes adapter class only",
  "broker does not invoke substrate adapter",
  "broker does not enqueue execution",
  "broker fails closed without policy approval evidence",
];

export const defaultCapabilityBrokerRequest: CapabilityBrokerRequestEvidence = {
  contract_id: capabilityBrokerRequestContract.contract_id,
  request_version: capabilityBrokerRequestContract.request_version,
  requested_actor: defaultSubstrateControlIntent.requested_actor,
  capability: defaultSubstrateControlIntent.capability,
  risk_level: defaultSubstrateControlIntent.risk_level,
  target_substrate_kind: defaultSubstrateControlIntent.target_substrate_kind,
  requested_control_mode: defaultSubstrateControlIntent.requested_control_mode,
  broker_decision_posture: capabilityBrokerRequestContract.broker_decision_posture,
  substrate_control_intent_refs: [
    {
      intent_ref: "intent:bp0096-substrate-control-intent",
      evidence_ref: "evidence:bp0096-source-only-substrate-control-intent",
      contract_id: substrateControlIntentContract.contract_id,
      summary: "BP-0096 source-only substrate control intent evidence",
    },
  ],
  required_policy_gates: [
    "capability.broker.policy.review",
    ...defaultSubstrateControlIntent.required_policy_gates,
  ].sort(),
  policy_gate_refs: [
    {
      gate_ref: "capability.broker.policy.review",
      decision_ref: "policy_decision:capability-broker-request-source-only",
      required: true,
    },
    ...defaultSubstrateControlIntent.policy_gate_refs,
  ],
  required_approvals: defaultSubstrateControlIntent.required_approvals,
  approval_refs: defaultSubstrateControlIntent.approval_refs,
  audit_event_plan: defaultSubstrateControlIntent.audit_event_plan,
  required_audit_events: defaultSubstrateControlIntent.required_audit_events,
  result_expectations: {
    result_packet_ref: "result_packet:capability-broker-request",
    expected_statuses: ["approved", "denied", "completed", "failed", "rolled_back"],
    artifact_refs: ["artifact:operator-visible-broker-request-evidence"],
    operator_visible_summary:
      "operator can inspect broker classification, policy gates, approvals, audit plan, proposed adapter class, result, rollback, and denied dispatch behavior before any live action",
  },
  rollback_expectations: [
    {
      rollback_ref: "rollback:capability-broker-request-review",
      required_for_risk_level_at_or_above: riskyRollbackLevel,
      owner_ref: "owner:lnsat-platform",
      evidence_refs: [
        "doc:docs/architecture/POLICY_AND_AUDIT.md",
        "doc:docs/reference/CONTRACT_PROVENANCE.md",
      ],
    },
  ],
  proposed_adapter_class: "service_control_adapter",
  proposed_adapter_authority: "proposal_only_no_dispatch",
  blocked_broker_dispatch_actions: defaultBlockedBrokerDispatchActions,
  denied_broker_dispatch_behavior: defaultDeniedBrokerDispatchBehavior,
  denied_live_behavior: [
    ...defaultSubstrateControlIntent.denied_live_behavior,
    "no live broker dispatch",
  ],
  source_refs: [
    "doc:docs/architecture/PACKET_MODEL.md",
    "doc:docs/architecture/POLICY_AND_AUDIT.md",
    "doc:docs/architecture/SUBSTRATES_AND_NODES.md",
    "doc:docs/reference/CONTRACT_PROVENANCE.md",
    "ticket:BP-0102: source-only capability broker request contract",
  ],
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
};

export function createCapabilityBrokerRequest(
  input: unknown = {},
): CapabilityBrokerRequestResult {
  const normalized = normalizeCapabilityBrokerRequest(input);

  if (!normalized.ok) {
    return failCapabilityBrokerRequest(normalized.errors);
  }

  return {
    ok: true,
    capability_broker_request: {
      contract_id: capabilityBrokerRequestContract.contract_id,
      request_version: capabilityBrokerRequestContract.request_version,
      ...normalized.request,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeCapabilityBrokerRequest(
  input: unknown,
): NormalizedCapabilityBrokerRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        brokerRequestError(
          "capability_broker_request.invalid_request",
          "",
          "Capability broker request must be an object.",
        ),
      ],
    };
  }

  const errors: CapabilityBrokerRequestError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.unexpected_field",
          jsonPointer(key),
          "Unexpected capability broker request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "request_version") &&
    input.request_version !== capabilityBrokerRequestContract.request_version
  ) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_version",
        "/request_version",
        "Capability broker request version is unsupported.",
      ),
    );
  }

  const actor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultCapabilityBrokerRequest.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultCapabilityBrokerRequest.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultCapabilityBrokerRequest.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultCapabilityBrokerRequest.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultCapabilityBrokerRequest.requested_control_mode;
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultCapabilityBrokerRequest.source_refs];
  const substrateIntentRefs = Object.hasOwn(input, "substrate_control_intent_refs")
    ? normalizeSubstrateIntentRefs(input.substrate_control_intent_refs, errors)
    : [...defaultCapabilityBrokerRequest.substrate_control_intent_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultCapabilityBrokerRequest.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultCapabilityBrokerRequest.approval_refs];
  const auditEventPlan = Object.hasOwn(input, "audit_event_plan")
    ? normalizeAuditEventPlan(input.audit_event_plan, errors)
    : [...defaultCapabilityBrokerRequest.audit_event_plan];
  const resultExpectations = Object.hasOwn(input, "result_expectations")
    ? normalizeResultExpectations(input.result_expectations, errors)
    : defaultCapabilityBrokerRequest.result_expectations;
  const rollbackExpectations = Object.hasOwn(input, "rollback_expectations")
    ? normalizeRollbackExpectations(input.rollback_expectations, errors)
    : [...defaultCapabilityBrokerRequest.rollback_expectations];
  const proposedAdapterClass = Object.hasOwn(input, "proposed_adapter_class")
    ? normalizeAdapterClass(input.proposed_adapter_class, errors)
    : adapterBySubstrateKind[substrateKind];
  const blockedBrokerDispatchActions = Object.hasOwn(
    input,
    "blocked_broker_dispatch_actions",
  )
    ? normalizeCapabilityStrings(
        input.blocked_broker_dispatch_actions,
        "/blocked_broker_dispatch_actions",
        errors,
      )
    : [...defaultCapabilityBrokerRequest.blocked_broker_dispatch_actions];
  const deniedBrokerDispatchBehavior = Object.hasOwn(
    input,
    "denied_broker_dispatch_behavior",
  )
    ? normalizeSafeStrings(
        input.denied_broker_dispatch_behavior,
        "/denied_broker_dispatch_behavior",
        "Capability broker request requires denied broker dispatch behavior.",
        errors,
      )
    : [...defaultCapabilityBrokerRequest.denied_broker_dispatch_behavior];
  const deniedLiveBehavior = Object.hasOwn(input, "denied_live_behavior")
    ? normalizeSafeStrings(
        input.denied_live_behavior,
        "/denied_live_behavior",
        "Capability broker request requires denied live behavior.",
        errors,
      )
    : [...defaultCapabilityBrokerRequest.denied_live_behavior];

  if (
    Object.hasOwn(input, "live_broker_dispatch_allowed") &&
    input.live_broker_dispatch_allowed !== false
  ) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Capability broker request cannot enable live broker dispatch.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "live_execution_allowed") &&
    input.live_execution_allowed !== false
  ) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.live_execution_forbidden",
        "/live_execution_allowed",
        "Capability broker request cannot enable live execution.",
      ),
    );
  }

  if (
    Object.hasOwn(input, "side_effects") &&
    (!Array.isArray(input.side_effects) || input.side_effects.length !== 0)
  ) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.side_effects_forbidden",
        "/side_effects",
        "Capability broker request must preserve side_effects: [].",
      ),
    );
  }

  if (sourceRefs.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.source_ref_required",
        "/source_refs",
        "Capability broker request requires source refs.",
      ),
    );
  }

  if (substrateIntentRefs.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.substrate_control_intent_ref_required",
        "/substrate_control_intent_refs",
        "Capability broker request requires substrate control intent refs.",
      ),
    );
  }

  if (policyGateRefs.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.policy_gate_required",
        "/policy_gate_refs",
        "Capability broker request requires policy gate refs.",
      ),
    );
  }

  if (requiresApproval(controlMode, riskLevel) && approvalRefs.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.approval_required",
        "/approval_refs",
        "Approval-gated or risky capability broker request requires approval refs.",
      ),
    );
  }

  const requiredAuditEvents = uniqueStrings(
    auditEventPlan.map((event) => event.event_type),
  );
  for (const eventType of defaultCapabilityBrokerRequest.required_audit_events) {
    if (!requiredAuditEvents.includes(eventType)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.audit_event_required",
          `/audit_event_plan/${eventType}`,
          `Capability broker request requires ${eventType} audit event.`,
        ),
      );
    }
  }

  if (requiresRollback(riskLevel, controlMode) && rollbackExpectations.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.rollback_expectation_required",
        "/rollback_expectations",
        "Risky capability broker request requires rollback expectations.",
      ),
    );
  }

  if (controlMode === "forbidden_mutation") {
    errors.push(
      brokerRequestError(
        "capability_broker_request.unsafe_adapter_authority",
        "/requested_control_mode",
        "Forbidden mutation cannot be requested through capability broker.",
      ),
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request: {
      requested_actor: actor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      broker_decision_posture: capabilityBrokerRequestContract.broker_decision_posture,
      substrate_control_intent_refs: substrateIntentRefs,
      required_policy_gates: uniqueStrings([
        "capability.broker.policy.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      policy_gate_refs: policyGateRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      approval_refs: approvalRefs,
      audit_event_plan: auditEventPlan,
      required_audit_events: requiredAuditEvents,
      result_expectations: resultExpectations,
      rollback_expectations: rollbackExpectations,
      proposed_adapter_class: proposedAdapterClass,
      proposed_adapter_authority: "proposal_only_no_dispatch",
      blocked_broker_dispatch_actions: uniqueStrings(blockedBrokerDispatchActions),
      denied_broker_dispatch_behavior: uniqueStrings(deniedBrokerDispatchBehavior),
      denied_live_behavior: uniqueStrings(deniedLiveBehavior),
      source_refs: sourceRefs,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeActor(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.actor_required",
        "/requested_actor",
        "Capability broker request requires requested actor.",
      ),
    );
    return defaultCapabilityBrokerRequest.requested_actor;
  }

  for (const key of Object.keys(value)) {
    if (!actorKeys.has(key)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.unexpected_field",
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
      brokerRequestError(
        "capability_broker_request.invalid_actor",
        "/requested_actor/actor_ref",
        "Requested actor ref must be a safe reference.",
      ),
    );
  }
  if (actorType === null) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_actor",
        "/requested_actor/actor_type",
        "Requested actor type is unsupported.",
      ),
    );
  }
  if (roleRef === null) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_actor",
        "/requested_actor/role_ref",
        "Requested actor role ref must be a safe reference.",
      ),
    );
  }

  return {
    actor_ref: actorRef ?? defaultCapabilityBrokerRequest.requested_actor.actor_ref,
    actor_type: actorType ?? defaultCapabilityBrokerRequest.requested_actor.actor_type,
    role_ref: roleRef ?? defaultCapabilityBrokerRequest.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): string {
  if (typeof value !== "string" || !safeCapability(value)) {
    errors.push(
      brokerRequestError(
        secretLike(value)
          ? "capability_broker_request.secret_value_forbidden"
          : "capability_broker_request.invalid_capability",
        "/capability",
        secretLike(value)
          ? "Capability broker request cannot contain secret-like capability values."
          : "Capability broker request capability must be safe.",
      ),
    );
    return defaultCapabilityBrokerRequest.capability;
  }

  if (unsafeAuthority(value)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.unsafe_adapter_authority",
        "/capability",
        "Capability broker request capability asks for unsafe authority.",
      ),
    );
  }

  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_risk_level",
        "/risk_level",
        "Capability broker request risk_level must be an integer from 0 through 8.",
      ),
    );
    return defaultCapabilityBrokerRequest.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): SubstrateKind {
  if (typeof value !== "string" || !substrateKinds.has(value as SubstrateKind)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_substrate_kind",
        "/target_substrate_kind",
        "Capability broker request target substrate kind is unsupported.",
      ),
    );
    return defaultCapabilityBrokerRequest.target_substrate_kind;
  }
  return value as SubstrateKind;
}

function normalizeControlMode(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): SubstrateControlMode {
  if (typeof value !== "string" || !controlModes.has(value as SubstrateControlMode)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_control_mode",
        "/requested_control_mode",
        "Capability broker request control mode is unsupported.",
      ),
    );
    return defaultCapabilityBrokerRequest.requested_control_mode;
  }
  return value as SubstrateControlMode;
}

function normalizeSubstrateIntentRefs(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): CapabilityBrokerSubstrateIntentRefInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.substrate_control_intent_ref_required",
        "/substrate_control_intent_refs",
        "Capability broker request requires substrate control intent refs.",
      ),
    );
    return [];
  }

  return value.flatMap((ref, index) => {
    const path = `/substrate_control_intent_refs/${index}`;
    if (!isPlainObject(ref)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.invalid_substrate_control_intent_ref",
          path,
          "Substrate control intent ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(ref)) {
      if (!substrateIntentRefKeys.has(key)) {
        errors.push(
          brokerRequestError(
            "capability_broker_request.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
            "Unexpected substrate control intent ref field.",
          ),
        );
      }
    }

    if (
      typeof ref.intent_ref !== "string" ||
      !safeRef(ref.intent_ref) ||
      typeof ref.evidence_ref !== "string" ||
      !safeRef(ref.evidence_ref) ||
      ref.contract_id !== substrateControlIntentContract.contract_id ||
      typeof ref.summary !== "string" ||
      !safeString(ref.summary)
    ) {
      errors.push(
        brokerRequestError(
          secretLike(ref.intent_ref) ||
            secretLike(ref.evidence_ref) ||
            secretLike(ref.summary)
            ? "capability_broker_request.secret_value_forbidden"
            : "capability_broker_request.invalid_substrate_control_intent_ref",
          path,
          secretLike(ref.intent_ref) ||
            secretLike(ref.evidence_ref) ||
            secretLike(ref.summary)
            ? "Substrate control intent refs cannot contain secret-like values."
            : "Substrate control intent refs must reference BP-0096 evidence.",
        ),
      );
      return [];
    }

    return [
      {
        intent_ref: ref.intent_ref,
        evidence_ref: ref.evidence_ref,
        contract_id: substrateControlIntentContract.contract_id,
        summary: ref.summary,
      },
    ];
  });
}

function normalizePolicyGateRefs(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): SubstrateControlIntentPolicyGateInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.policy_gate_required",
        "/policy_gate_refs",
        "Capability broker request requires policy gate refs.",
      ),
    );
    return [];
  }

  return value.flatMap((gate, index) => {
    const path = `/policy_gate_refs/${index}`;
    if (!isPlainObject(gate)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.invalid_policy_gate",
          path,
          "Policy gate ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(gate)) {
      if (!policyGateKeys.has(key)) {
        errors.push(
          brokerRequestError(
            "capability_broker_request.unexpected_field",
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
        brokerRequestError(
          "capability_broker_request.invalid_policy_gate",
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
  errors: CapabilityBrokerRequestError[],
): SubstrateControlIntentApprovalRefInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.invalid_approval_ref",
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
        brokerRequestError(
          "capability_broker_request.invalid_approval_ref",
          path,
          "Approval ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(approval)) {
      if (!approvalRefKeys.has(key)) {
        errors.push(
          brokerRequestError(
            "capability_broker_request.unexpected_field",
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
        brokerRequestError(
          "capability_broker_request.invalid_approval_ref",
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
  errors: CapabilityBrokerRequestError[],
): SubstrateControlIntentAuditEventInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.audit_event_required",
        "/audit_event_plan",
        "Capability broker request requires audit event plan.",
      ),
    );
    return [];
  }

  return value.flatMap((event, index) => {
    const path = `/audit_event_plan/${index}`;
    if (!isPlainObject(event)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.invalid_audit_event",
          path,
          "Audit event plan entry must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(event)) {
      if (!auditEventKeys.has(key)) {
        errors.push(
          brokerRequestError(
            "capability_broker_request.unexpected_field",
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
      !packetFamilies.has(event.packet_family)
    ) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.invalid_audit_event",
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
        packet_family:
          event.packet_family as SubstrateControlIntentAuditEventInput["packet_family"],
      },
    ];
  });
}

function normalizeResultExpectations(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): SubstrateControlIntentResultExpectationInput {
  if (!isPlainObject(value)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.result_expectation_required",
        "/result_expectations",
        "Capability broker request requires result expectations.",
      ),
    );
    return defaultCapabilityBrokerRequest.result_expectations;
  }

  for (const key of Object.keys(value)) {
    if (!resultExpectationKeys.has(key)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.unexpected_field",
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
      brokerRequestError(
        secretLike(value.operator_visible_summary)
          ? "capability_broker_request.secret_value_forbidden"
          : "capability_broker_request.invalid_result_expectation",
        "/result_expectations",
        secretLike(value.operator_visible_summary)
          ? "Capability broker request result expectations cannot contain secrets."
          : "Capability broker request result expectations must be safe and source-backed.",
      ),
    );
    return defaultCapabilityBrokerRequest.result_expectations;
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
  errors: CapabilityBrokerRequestError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  if (!Array.isArray(value)) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.rollback_expectation_required",
        "/rollback_expectations",
        "Capability broker request rollback expectations must be an array.",
      ),
    );
    return [];
  }

  return value.flatMap((rollback, index) => {
    const path = `/rollback_expectations/${index}`;
    if (!isPlainObject(rollback)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.invalid_rollback_expectation",
          path,
          "Rollback expectation must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(rollback)) {
      if (!rollbackExpectationKeys.has(key)) {
        errors.push(
          brokerRequestError(
            "capability_broker_request.unexpected_field",
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
        brokerRequestError(
          "capability_broker_request.invalid_rollback_expectation",
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

function normalizeSourceRefs(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.source_ref_required",
        "/source_refs",
        "Capability broker request requires one or more source refs.",
      ),
    );
    return [];
  }

  return value.flatMap((source, index) => {
    const path = `/source_refs/${index}`;
    if (!isPlainObject(source)) {
      errors.push(
        brokerRequestError(
          "capability_broker_request.invalid_source_ref",
          path,
          "Source ref must be an object.",
        ),
      );
      return [];
    }

    for (const key of Object.keys(source)) {
      if (!sourceKeys.has(key)) {
        errors.push(
          brokerRequestError(
            "capability_broker_request.unexpected_field",
            `${path}/${escapeJsonPointerSegment(key)}`,
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
        brokerRequestError(
          secretLike(source.source_ref) || secretLike(source.summary)
            ? "capability_broker_request.secret_value_forbidden"
            : "capability_broker_request.invalid_source_ref",
          path,
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

function normalizeAdapterClass(
  value: unknown,
  errors: CapabilityBrokerRequestError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value !== "string" ||
    !adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    errors.push(
      brokerRequestError(
        typeof value === "string" && unsafeAuthority(value)
          ? "capability_broker_request.unsafe_adapter_authority"
          : "capability_broker_request.invalid_adapter_class",
        "/proposed_adapter_class",
        typeof value === "string" && unsafeAuthority(value)
          ? "Capability broker request adapter class asks for unsafe authority."
          : "Capability broker request adapter class is unsupported.",
      ),
    );
    return "no_adapter_dispatch";
  }

  return value as CapabilityBrokerAdapterClass;
}

function normalizeCapabilityStrings(
  value: unknown,
  path: string,
  errors: CapabilityBrokerRequestError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.unsafe_adapter_authority",
        path,
        "Capability broker request requires blocked dispatch actions.",
      ),
    );
    return [];
  }

  return value.flatMap((action, index) => {
    if (typeof action !== "string" || !safeCapability(action)) {
      errors.push(
        brokerRequestError(
          secretLike(action)
            ? "capability_broker_request.secret_value_forbidden"
            : "capability_broker_request.unsafe_adapter_authority",
          `${path}/${index}`,
          secretLike(action)
            ? "Blocked broker dispatch actions cannot contain secret-like values."
            : "Blocked broker dispatch action must be a safe capability-style string.",
        ),
      );
      return [];
    }
    return [action];
  });
}

function normalizeSafeStrings(
  value: unknown,
  path: string,
  missingMessage: string,
  errors: CapabilityBrokerRequestError[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      brokerRequestError(
        "capability_broker_request.unsafe_adapter_authority",
        path,
        missingMessage,
      ),
    );
    return [];
  }

  return value.flatMap((entry, index) => {
    if (typeof entry !== "string" || !safeString(entry)) {
      errors.push(
        brokerRequestError(
          secretLike(entry)
            ? "capability_broker_request.secret_value_forbidden"
            : "capability_broker_request.unsafe_adapter_authority",
          `${path}/${index}`,
          secretLike(entry)
            ? "Denied behavior cannot contain secret-like values."
            : "Denied behavior must be safe text.",
        ),
      );
      return [];
    }
    return [entry];
  });
}

function requiresApproval(mode: SubstrateControlMode, riskLevel: number): boolean {
  return mode === "approval_gated_mutation" || riskLevel >= 5;
}

function requiresRollback(riskLevel: number, mode: SubstrateControlMode): boolean {
  return riskLevel >= riskyRollbackLevel || mode === "approval_gated_mutation";
}

function failCapabilityBrokerRequest(
  errors: CapabilityBrokerRequestError[],
): CapabilityBrokerRequestResult {
  return {
    ok: false,
    capability_broker_request: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function brokerRequestError(
  code: CapabilityBrokerRequestErrorCode,
  path: string,
  message: string,
): CapabilityBrokerRequestError {
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
  errors: CapabilityBrokerRequestError[],
): CapabilityBrokerRequestError[] {
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
