import type { CapabilityBrokerAdapterClass } from "./capability-broker-request.js";
import type { AdapterInvocationResultAuditRefInput } from "./adapter-invocation-result.js";
import {
  defaultRuntimeAdapterImplementationPlan,
  runtimeAdapterImplementationPlanContract,
} from "./runtime-adapter-implementation-plan.js";
import type {
  RuntimeAdapterImplementationDryRunPlanInput,
  RuntimeAdapterImplementationPlanFileInput,
  RuntimeAdapterImplementationPlanScopeRefInput,
  RuntimeAdapterImplementationPlanSourceInput,
  RuntimeAdapterImplementationStepInput,
  RuntimeAdapterImplementationValidationCommandInput,
} from "./runtime-adapter-implementation-plan.js";
import { runtimeAdapterImplementationScopeContract } from "./runtime-adapter-implementation-scope.js";
import type {
  RuntimeAdapterImplementationScopeAdapterIdentityInput,
  RuntimeAdapterImplementationScopeReadinessRefInput,
} from "./runtime-adapter-implementation-scope.js";
import { runtimeAdapterReadinessGateContract } from "./runtime-adapter-readiness-gate.js";
import type {
  SubstrateControlIntentActorInput,
  SubstrateControlIntentApprovalRefInput,
  SubstrateControlIntentPolicyGateInput,
  SubstrateControlIntentRollbackExpectationInput,
} from "./substrate-control-intent.js";
import type { SubstrateControlMode, SubstrateKind } from "./substrate-taxonomy.js";

export const RUNTIME_ADAPTER_IMPLEMENTATION_AUTHORIZATION_REQUEST_STATUS =
  "source_only";

export const runtimeAdapterImplementationAuthorizationRequestContract = {
  contract_id:
    "lnsat.platform.runtime_adapter_implementation_authorization_request.v0_1",
  authority: [
    "@lnsat/packets",
    "source-backed-runtime-adapter-implementation-authorization-request",
  ],
  authorization_request_version: "0.1",
  source_docs: [
    "docs/architecture/PACKET_MODEL.md",
    "docs/architecture/POLICY_AND_AUDIT.md",
    "docs/architecture/SYSTEM_ARCHITECTURE.md",
    "docs/architecture/SUBSTRATES_AND_NODES.md",
    "docs/architecture/DATA_MODEL.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
    "docs/reference/CONTRACT_PROVENANCE.md",
  ],
  implementation_authorization_request_authority:
    "implementation_authorization_request_only_no_runtime_adapter",
  runtime_adapter_implementation_allowed: false,
  runtime_adapter_dispatch_allowed: false,
  live_adapter_invocation_allowed: false,
  live_broker_dispatch_allowed: false,
  live_execution_allowed: false,
  side_effects: [],
  status: "source_only",
} as const;

export type RuntimeAdapterImplementationChainReviewRefInput = {
  chain_review_ref: string;
  packet_ref: string;
  evidence_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationAuthorizationPlanRefInput = {
  plan_ref: string;
  evidence_ref: string;
  contract_id: typeof runtimeAdapterImplementationPlanContract.contract_id;
  summary: string;
};

export type RuntimeAdapterImplementationFuturePacketRefInput = {
  packet_ref: string;
  packet_name: string;
  owner_ref: string;
  summary: string;
};

export type RuntimeAdapterImplementationAuthorizationRequestRequest = {
  authorization_request_version?: typeof runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version;
  chain_review_refs?: RuntimeAdapterImplementationChainReviewRefInput[];
  implementation_plan_refs?: RuntimeAdapterImplementationAuthorizationPlanRefInput[];
  runtime_adapter_implementation_scope_refs?: RuntimeAdapterImplementationPlanScopeRefInput[];
  runtime_adapter_readiness_gate_refs?: RuntimeAdapterImplementationScopeReadinessRefInput[];
  requested_actor?: SubstrateControlIntentActorInput;
  capability?: string;
  risk_level?: number;
  target_substrate_kind?: SubstrateKind;
  requested_control_mode?: SubstrateControlMode;
  adapter_identity?: RuntimeAdapterImplementationScopeAdapterIdentityInput;
  adapter_class?: CapabilityBrokerAdapterClass;
  planned_files_modules?: RuntimeAdapterImplementationPlanFileInput[];
  implementation_steps?: RuntimeAdapterImplementationStepInput[];
  validation_commands?: RuntimeAdapterImplementationValidationCommandInput[];
  dry_run_plan?: RuntimeAdapterImplementationDryRunPlanInput[];
  rollback_refs?: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs?: SubstrateControlIntentPolicyGateInput[];
  approval_refs?: SubstrateControlIntentApprovalRefInput[];
  audit_event_refs?: AdapterInvocationResultAuditRefInput[];
  source_refs?: RuntimeAdapterImplementationPlanSourceInput[];
  future_implementation_packet_ref?: RuntimeAdapterImplementationFuturePacketRefInput;
  implementation_authorization_request_authority?: typeof runtimeAdapterImplementationAuthorizationRequestContract.implementation_authorization_request_authority;
  runtime_adapter_implementation_allowed?: false;
  runtime_adapter_dispatch_allowed?: false;
  live_adapter_invocation_allowed?: false;
  live_broker_dispatch_allowed?: false;
  live_execution_allowed?: false;
  side_effects?: [];
};

export type RuntimeAdapterImplementationAuthorizationRequestErrorCode =
  | "runtime_adapter_implementation_authorization_request.invalid_request"
  | "runtime_adapter_implementation_authorization_request.unexpected_field"
  | "runtime_adapter_implementation_authorization_request.invalid_version"
  | "runtime_adapter_implementation_authorization_request.chain_review_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_chain_review_ref"
  | "runtime_adapter_implementation_authorization_request.plan_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_plan_ref"
  | "runtime_adapter_implementation_authorization_request.scope_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_scope_ref"
  | "runtime_adapter_implementation_authorization_request.readiness_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_readiness_ref"
  | "runtime_adapter_implementation_authorization_request.invalid_actor"
  | "runtime_adapter_implementation_authorization_request.invalid_capability"
  | "runtime_adapter_implementation_authorization_request.invalid_risk_level"
  | "runtime_adapter_implementation_authorization_request.invalid_substrate_kind"
  | "runtime_adapter_implementation_authorization_request.invalid_control_mode"
  | "runtime_adapter_implementation_authorization_request.invalid_adapter_identity"
  | "runtime_adapter_implementation_authorization_request.invalid_adapter_class"
  | "runtime_adapter_implementation_authorization_request.planned_file_required"
  | "runtime_adapter_implementation_authorization_request.invalid_planned_file"
  | "runtime_adapter_implementation_authorization_request.implementation_step_required"
  | "runtime_adapter_implementation_authorization_request.invalid_implementation_step"
  | "runtime_adapter_implementation_authorization_request.validation_command_required"
  | "runtime_adapter_implementation_authorization_request.invalid_validation_command"
  | "runtime_adapter_implementation_authorization_request.dry_run_plan_required"
  | "runtime_adapter_implementation_authorization_request.invalid_dry_run_plan"
  | "runtime_adapter_implementation_authorization_request.rollback_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_rollback_ref"
  | "runtime_adapter_implementation_authorization_request.policy_gate_required"
  | "runtime_adapter_implementation_authorization_request.invalid_policy_gate"
  | "runtime_adapter_implementation_authorization_request.approval_required"
  | "runtime_adapter_implementation_authorization_request.invalid_approval_ref"
  | "runtime_adapter_implementation_authorization_request.audit_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_audit_ref"
  | "runtime_adapter_implementation_authorization_request.source_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_source_ref"
  | "runtime_adapter_implementation_authorization_request.future_packet_ref_required"
  | "runtime_adapter_implementation_authorization_request.invalid_future_packet_ref"
  | "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority"
  | "runtime_adapter_implementation_authorization_request.secret_value_forbidden"
  | "runtime_adapter_implementation_authorization_request.runtime_adapter_implementation_forbidden"
  | "runtime_adapter_implementation_authorization_request.runtime_adapter_dispatch_forbidden"
  | "runtime_adapter_implementation_authorization_request.live_adapter_invocation_forbidden"
  | "runtime_adapter_implementation_authorization_request.live_broker_dispatch_forbidden"
  | "runtime_adapter_implementation_authorization_request.live_execution_forbidden"
  | "runtime_adapter_implementation_authorization_request.side_effects_forbidden";

export type RuntimeAdapterImplementationAuthorizationRequestError = {
  code: RuntimeAdapterImplementationAuthorizationRequestErrorCode;
  path: string;
  message: string;
  severity: "error";
};

export type RuntimeAdapterImplementationAuthorizationRequestEvidence = {
  contract_id: typeof runtimeAdapterImplementationAuthorizationRequestContract.contract_id;
  authorization_request_version: typeof runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version;
  chain_review_refs: RuntimeAdapterImplementationChainReviewRefInput[];
  implementation_plan_refs: RuntimeAdapterImplementationAuthorizationPlanRefInput[];
  runtime_adapter_implementation_scope_refs: RuntimeAdapterImplementationPlanScopeRefInput[];
  runtime_adapter_readiness_gate_refs: RuntimeAdapterImplementationScopeReadinessRefInput[];
  requested_actor: SubstrateControlIntentActorInput;
  capability: string;
  risk_level: number;
  target_substrate_kind: SubstrateKind;
  requested_control_mode: SubstrateControlMode;
  adapter_identity: RuntimeAdapterImplementationScopeAdapterIdentityInput;
  adapter_class: CapabilityBrokerAdapterClass;
  planned_files_modules: RuntimeAdapterImplementationPlanFileInput[];
  implementation_steps: RuntimeAdapterImplementationStepInput[];
  validation_commands: RuntimeAdapterImplementationValidationCommandInput[];
  dry_run_plan: RuntimeAdapterImplementationDryRunPlanInput[];
  rollback_refs: SubstrateControlIntentRollbackExpectationInput[];
  policy_gate_refs: SubstrateControlIntentPolicyGateInput[];
  required_policy_gates: string[];
  approval_refs: SubstrateControlIntentApprovalRefInput[];
  required_approvals: string[];
  audit_event_refs: AdapterInvocationResultAuditRefInput[];
  required_audit_events: string[];
  source_refs: string[];
  future_implementation_packet_ref: RuntimeAdapterImplementationFuturePacketRefInput;
  chain_review_snapshot: {
    packet_ref: "packet:BP-0149";
    reviewed_source_contract_id: typeof runtimeAdapterImplementationPlanContract.contract_id;
    reviewed_gateway_contract_id: "lnsat.gateway.runtime_adapter_implementation_plan.v0_1";
    reviewed_route: "POST /v1/platform/runtime-adapter-implementation-plan/inspect";
    reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect";
    registered_read_only_tool_count: 20;
    side_effects: [];
  };
  implementation_plan_evidence_snapshot: Pick<
    typeof defaultRuntimeAdapterImplementationPlan,
    | "contract_id"
    | "implementation_plan_authority"
    | "runtime_adapter_implementation_allowed"
    | "runtime_adapter_dispatch_allowed"
    | "live_adapter_invocation_allowed"
    | "live_broker_dispatch_allowed"
    | "live_execution_allowed"
    | "side_effects"
  >;
  denied_runtime_behavior: string[];
  implementation_authorization_request_authority: typeof runtimeAdapterImplementationAuthorizationRequestContract.implementation_authorization_request_authority;
  runtime_adapter_implementation_allowed: false;
  runtime_adapter_dispatch_allowed: false;
  live_adapter_invocation_allowed: false;
  live_broker_dispatch_allowed: false;
  live_execution_allowed: false;
  side_effects: [];
};

export type RuntimeAdapterImplementationAuthorizationRequestResult =
  | {
      ok: true;
      runtime_adapter_implementation_authorization_request: RuntimeAdapterImplementationAuthorizationRequestEvidence;
      errors: [];
      side_effects: [];
    }
  | {
      ok: false;
      runtime_adapter_implementation_authorization_request: null;
      errors: RuntimeAdapterImplementationAuthorizationRequestError[];
      raw_input_content: "withheld";
      side_effects: [];
    };

type NormalizedAuthorizationRequest =
  | {
      ok: true;
      request: Omit<
        RuntimeAdapterImplementationAuthorizationRequestEvidence,
        "contract_id" | "authorization_request_version" | "side_effects"
      >;
    }
  | {
      ok: false;
      errors: RuntimeAdapterImplementationAuthorizationRequestError[];
    };

const requestKeys = new Set([
  "authorization_request_version",
  "chain_review_refs",
  "implementation_plan_refs",
  "runtime_adapter_implementation_scope_refs",
  "runtime_adapter_readiness_gate_refs",
  "requested_actor",
  "capability",
  "risk_level",
  "target_substrate_kind",
  "requested_control_mode",
  "adapter_identity",
  "adapter_class",
  "planned_files_modules",
  "implementation_steps",
  "validation_commands",
  "dry_run_plan",
  "rollback_refs",
  "policy_gate_refs",
  "approval_refs",
  "audit_event_refs",
  "source_refs",
  "future_implementation_packet_ref",
  "implementation_authorization_request_authority",
  "runtime_adapter_implementation_allowed",
  "runtime_adapter_dispatch_allowed",
  "live_adapter_invocation_allowed",
  "live_broker_dispatch_allowed",
  "live_execution_allowed",
  "side_effects",
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
const approvalTypes = new Set<SubstrateControlIntentApprovalRefInput["approval_type"]>([
  "human",
  "policy",
  "runbook",
  "rollback_owner",
]);
const auditEventTypes = new Set<AdapterInvocationResultAuditRefInput["event_type"]>([
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

const safeStringPattern = /^[\w .,:;@/()[\]#_+=-]{3,240}$/;
const refPattern = /^[a-z][a-z0-9_-]*:[\w./:@#_-]{3,180}$/;
const pathRefPattern = /^(?:zone|src|test|doc|package):[\w./:@#_-]{3,180}$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,6}$/;
const policyGatePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
const secretLikePattern =
  /(postgres:\/\/|mysql:\/\/|mongodb:\/\/|DATABASE_URL|API_KEY|SECRET=|TOKEN=|PASSWORD|PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]|AKIA[A-Z0-9]|secret:)/i;
const rawCommandPattern =
  /\b(npm|pnpm|yarn|node|tsx|ts-node|bash|sh|zsh|git|docker|ssh|curl|wrangler|psql|mysql|redis-cli|kubectl|rm|mv|cp|chmod|chown|sudo)\s+/i;
const unsafeAuthorityPattern =
  /\b(root|sudo|shell|ssh\.raw|secret\.read|credential\.read|write\.execute|delete\.execute|drop|destroy\.execute|restart\.execute|deploy\.execute|dns\.write|cloudflare\.write|database\.write|db\.write|queue\.purge|docker\.socket|docker_socket|privileged|unrestricted|node_agent\.exec|rm -rf|raw command|live_dispatch|dispatch\.execute|adapter\.invoke|adapter_invocation|broker\.dispatch|invoke\.execute|runtime\.execution|runtime_adapter_dispatch|runtime_adapter\.dispatch|runtime_adapter_implementation|adapter_implementation|implementation\.execute)\b/i;

export const defaultRuntimeAdapterImplementationAuthorizationRequest: RuntimeAdapterImplementationAuthorizationRequestEvidence =
  {
    contract_id: runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
    authorization_request_version:
      runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version,
    chain_review_refs: [
      {
        chain_review_ref: "chain_review:bp0149-runtime-adapter-plan-chain-review",
        packet_ref: "packet:BP-0149",
        evidence_ref: "evidence:bp0149-runtime-adapter-plan-chain-review",
        summary: "BP-0149 reviewed BP-0144 through BP-0148 implementation plan chain",
      },
    ],
    implementation_plan_refs: [
      {
        plan_ref: defaultRuntimeAdapterImplementationPlan.plan_identity.plan_ref,
        evidence_ref: "evidence:bp0144-runtime-adapter-implementation-plan",
        contract_id: runtimeAdapterImplementationPlanContract.contract_id,
        summary: "BP-0144 source-only runtime adapter implementation plan evidence",
      },
    ],
    runtime_adapter_implementation_scope_refs:
      defaultRuntimeAdapterImplementationPlan.runtime_adapter_implementation_scope_refs,
    runtime_adapter_readiness_gate_refs:
      defaultRuntimeAdapterImplementationPlan.runtime_adapter_readiness_gate_refs,
    requested_actor: defaultRuntimeAdapterImplementationPlan.requested_actor,
    capability: defaultRuntimeAdapterImplementationPlan.capability,
    risk_level: defaultRuntimeAdapterImplementationPlan.risk_level,
    target_substrate_kind:
      defaultRuntimeAdapterImplementationPlan.target_substrate_kind,
    requested_control_mode:
      defaultRuntimeAdapterImplementationPlan.requested_control_mode,
    adapter_identity: defaultRuntimeAdapterImplementationPlan.adapter_identity,
    adapter_class: defaultRuntimeAdapterImplementationPlan.adapter_class,
    planned_files_modules:
      defaultRuntimeAdapterImplementationPlan.planned_files_modules,
    implementation_steps: defaultRuntimeAdapterImplementationPlan.implementation_steps,
    validation_commands: [
      {
        validation_ref:
          "validation:packets-runtime-adapter-implementation-authorization-request",
        command_ref:
          "script:npm-workspace-packets-test-runtime-adapter-implementation-authorization-request",
        expected_artifact_ref: "artifact:bp0150-packets-test-output",
        summary: "Run BP-0150 packet workspace test through named package script",
      },
      ...defaultRuntimeAdapterImplementationPlan.validation_commands,
    ],
    dry_run_plan: [
      {
        dry_run_ref: "dry_run:authorization-request-noop",
        expected_artifact_ref: "artifact:bp0150-authorization-request-dry-run-plan",
        summary:
          "Authorization request remains source-only and requires later packet before dry-run code path opens",
      },
      ...defaultRuntimeAdapterImplementationPlan.dry_run_plan,
    ],
    rollback_refs: defaultRuntimeAdapterImplementationPlan.rollback_refs,
    policy_gate_refs: [
      {
        gate_ref: "substrate.adapter.implementation_authorization_request.review",
        decision_ref:
          "policy_decision:runtime-adapter-implementation-authorization-request-source-only",
        required: true,
      },
      ...defaultRuntimeAdapterImplementationPlan.policy_gate_refs,
    ],
    required_policy_gates: uniqueStrings([
      "substrate.adapter.implementation_authorization_request.review",
      ...defaultRuntimeAdapterImplementationPlan.required_policy_gates,
    ]),
    approval_refs: defaultRuntimeAdapterImplementationPlan.approval_refs,
    required_approvals: defaultRuntimeAdapterImplementationPlan.required_approvals,
    audit_event_refs: defaultRuntimeAdapterImplementationPlan.audit_event_refs,
    required_audit_events:
      defaultRuntimeAdapterImplementationPlan.required_audit_events,
    source_refs: [
      "doc:docs/architecture/PACKET_MODEL.md",
      "doc:docs/architecture/POLICY_AND_AUDIT.md",
      "doc:docs/architecture/SYSTEM_ARCHITECTURE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "doc:docs/reference/CONTRACT_PROVENANCE.md",
      "ticket:BP-0150",
    ],
    future_implementation_packet_ref: {
      packet_ref: "packet:future-runtime-adapter-implementation",
      packet_name: "Future Runtime Adapter Implementation Packet",
      owner_ref: "owner:lnsat-platform",
      summary:
        "Future packet must separately authorize implementation before runtime adapter code exists",
    },
    chain_review_snapshot: {
      packet_ref: "packet:BP-0149",
      reviewed_source_contract_id: runtimeAdapterImplementationPlanContract.contract_id,
      reviewed_gateway_contract_id:
        "lnsat.gateway.runtime_adapter_implementation_plan.v0_1",
      reviewed_route: "POST /v1/platform/runtime-adapter-implementation-plan/inspect",
      reviewed_mcp_tool: "lnsat.platform.runtime_adapter_implementation_plan.inspect",
      registered_read_only_tool_count: 20,
      side_effects: [],
    },
    implementation_plan_evidence_snapshot: {
      contract_id: defaultRuntimeAdapterImplementationPlan.contract_id,
      implementation_plan_authority:
        defaultRuntimeAdapterImplementationPlan.implementation_plan_authority,
      runtime_adapter_implementation_allowed:
        defaultRuntimeAdapterImplementationPlan.runtime_adapter_implementation_allowed,
      runtime_adapter_dispatch_allowed:
        defaultRuntimeAdapterImplementationPlan.runtime_adapter_dispatch_allowed,
      live_adapter_invocation_allowed:
        defaultRuntimeAdapterImplementationPlan.live_adapter_invocation_allowed,
      live_broker_dispatch_allowed:
        defaultRuntimeAdapterImplementationPlan.live_broker_dispatch_allowed,
      live_execution_allowed:
        defaultRuntimeAdapterImplementationPlan.live_execution_allowed,
      side_effects: [],
    },
    denied_runtime_behavior: [
      "authorization request does not create runtime adapter implementation",
      "authorization request does not register dispatcher",
      "authorization request does not dispatch broker request",
      "authorization request does not invoke adapter",
      "authorization request does not execute live runtime path",
    ],
    implementation_authorization_request_authority:
      runtimeAdapterImplementationAuthorizationRequestContract.implementation_authorization_request_authority,
    runtime_adapter_implementation_allowed: false,
    runtime_adapter_dispatch_allowed: false,
    live_adapter_invocation_allowed: false,
    live_broker_dispatch_allowed: false,
    live_execution_allowed: false,
    side_effects: [],
  };

export function createRuntimeAdapterImplementationAuthorizationRequest(
  input: unknown = {},
): RuntimeAdapterImplementationAuthorizationRequestResult {
  const normalized = normalizeAuthorizationRequest(input);

  if (!normalized.ok) {
    return failAuthorizationRequest(normalized.errors);
  }

  return {
    ok: true,
    runtime_adapter_implementation_authorization_request: {
      contract_id: runtimeAdapterImplementationAuthorizationRequestContract.contract_id,
      authorization_request_version:
        runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version,
      ...normalized.request,
      side_effects: [],
    },
    errors: [],
    side_effects: [],
  };
}

function normalizeAuthorizationRequest(input: unknown): NormalizedAuthorizationRequest {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [
        authError(
          "runtime_adapter_implementation_authorization_request.invalid_request",
          "",
          "Runtime adapter implementation authorization request must be an object.",
        ),
      ],
    };
  }

  const errors: RuntimeAdapterImplementationAuthorizationRequestError[] = [];
  for (const key of Object.keys(input)) {
    if (!requestKeys.has(key)) {
      errors.push(
        authError(
          "runtime_adapter_implementation_authorization_request.unexpected_field",
          jsonPointer(key),
          "Unexpected runtime adapter implementation authorization request field.",
        ),
      );
    }
  }

  if (
    Object.hasOwn(input, "authorization_request_version") &&
    input.authorization_request_version !==
      runtimeAdapterImplementationAuthorizationRequestContract.authorization_request_version
  ) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_version",
        "/authorization_request_version",
        "Runtime adapter implementation authorization request version is unsupported.",
      ),
    );
  }

  const chainReviewRefs = Object.hasOwn(input, "chain_review_refs")
    ? normalizeChainReviewRefs(input.chain_review_refs, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.chain_review_refs];
  const planRefs = Object.hasOwn(input, "implementation_plan_refs")
    ? normalizePlanRefs(input.implementation_plan_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_plan_refs,
      ];
  const scopeRefs = Object.hasOwn(input, "runtime_adapter_implementation_scope_refs")
    ? normalizeScopeRefs(input.runtime_adapter_implementation_scope_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_implementation_scope_refs,
      ];
  const readinessRefs = Object.hasOwn(input, "runtime_adapter_readiness_gate_refs")
    ? normalizeReadinessRefs(input.runtime_adapter_readiness_gate_refs, errors)
    : [
        ...defaultRuntimeAdapterImplementationAuthorizationRequest.runtime_adapter_readiness_gate_refs,
      ];
  const requestedActor = Object.hasOwn(input, "requested_actor")
    ? normalizeActor(input.requested_actor, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.requested_actor;
  const capability = Object.hasOwn(input, "capability")
    ? normalizeCapability(input.capability, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.capability;
  const riskLevel = Object.hasOwn(input, "risk_level")
    ? normalizeRiskLevel(input.risk_level, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.risk_level;
  const substrateKind = Object.hasOwn(input, "target_substrate_kind")
    ? normalizeSubstrateKind(input.target_substrate_kind, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.target_substrate_kind;
  const controlMode = Object.hasOwn(input, "requested_control_mode")
    ? normalizeControlMode(input.requested_control_mode, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.requested_control_mode;
  const adapterIdentity = Object.hasOwn(input, "adapter_identity")
    ? normalizeAdapterIdentity(input.adapter_identity, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_identity;
  const adapterClass = Object.hasOwn(input, "adapter_class")
    ? normalizeAdapterClass(input.adapter_class, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_class;
  const plannedFiles = Object.hasOwn(input, "planned_files_modules")
    ? normalizePlannedFiles(input.planned_files_modules, errors)
    : [
        ...defaultRuntimeAdapterImplementationAuthorizationRequest.planned_files_modules,
      ];
  const implementationSteps = Object.hasOwn(input, "implementation_steps")
    ? normalizeImplementationSteps(input.implementation_steps, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_steps];
  const validationCommands = Object.hasOwn(input, "validation_commands")
    ? normalizeValidationCommands(input.validation_commands, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.validation_commands];
  const dryRunPlan = Object.hasOwn(input, "dry_run_plan")
    ? normalizeDryRunPlan(input.dry_run_plan, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.dry_run_plan];
  const rollbackRefs = Object.hasOwn(input, "rollback_refs")
    ? normalizeRollbackRefs(input.rollback_refs, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.rollback_refs];
  const policyGateRefs = Object.hasOwn(input, "policy_gate_refs")
    ? normalizePolicyGateRefs(input.policy_gate_refs, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.policy_gate_refs];
  const approvalRefs = Object.hasOwn(input, "approval_refs")
    ? normalizeApprovalRefs(input.approval_refs, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.approval_refs];
  const auditEventRefs = Object.hasOwn(input, "audit_event_refs")
    ? normalizeAuditEventRefs(input.audit_event_refs, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.audit_event_refs];
  const sourceRefs = Object.hasOwn(input, "source_refs")
    ? normalizeSourceRefs(input.source_refs, errors)
    : [...defaultRuntimeAdapterImplementationAuthorizationRequest.source_refs];
  const futurePacketRef = Object.hasOwn(input, "future_implementation_packet_ref")
    ? normalizeFuturePacketRef(input.future_implementation_packet_ref, errors)
    : defaultRuntimeAdapterImplementationAuthorizationRequest.future_implementation_packet_ref;

  addAuthorityErrors(input, errors);
  addRequiredArrayErrors(
    {
      chainReviewRefs,
      planRefs,
      scopeRefs,
      readinessRefs,
      plannedFiles,
      implementationSteps,
      validationCommands,
      dryRunPlan,
      rollbackRefs,
      policyGateRefs,
      approvalRefs,
      auditEventRefs,
      sourceRefs,
    },
    errors,
  );

  if (errors.length > 0) {
    return { ok: false, errors: dedupeErrors(errors) };
  }

  return {
    ok: true,
    request: {
      chain_review_refs: chainReviewRefs,
      implementation_plan_refs: planRefs,
      runtime_adapter_implementation_scope_refs: scopeRefs,
      runtime_adapter_readiness_gate_refs: readinessRefs,
      requested_actor: requestedActor,
      capability,
      risk_level: riskLevel,
      target_substrate_kind: substrateKind,
      requested_control_mode: controlMode,
      adapter_identity: adapterIdentity,
      adapter_class: adapterClass,
      planned_files_modules: plannedFiles,
      implementation_steps: implementationSteps,
      validation_commands: validationCommands,
      dry_run_plan: dryRunPlan,
      rollback_refs: rollbackRefs,
      policy_gate_refs: policyGateRefs,
      required_policy_gates: uniqueStrings([
        "substrate.adapter.implementation_authorization_request.review",
        ...policyGateRefs.map((gate) => gate.gate_ref),
      ]),
      approval_refs: approvalRefs,
      required_approvals: uniqueStrings(approvalRefs.map((ref) => ref.approval_ref)),
      audit_event_refs: auditEventRefs,
      required_audit_events: uniqueStrings(
        auditEventRefs.map((event) => event.event_type),
      ),
      source_refs: sourceRefs,
      future_implementation_packet_ref: futurePacketRef,
      chain_review_snapshot:
        defaultRuntimeAdapterImplementationAuthorizationRequest.chain_review_snapshot,
      implementation_plan_evidence_snapshot:
        defaultRuntimeAdapterImplementationAuthorizationRequest.implementation_plan_evidence_snapshot,
      denied_runtime_behavior: [
        ...defaultRuntimeAdapterImplementationAuthorizationRequest.denied_runtime_behavior,
      ],
      implementation_authorization_request_authority:
        runtimeAdapterImplementationAuthorizationRequestContract.implementation_authorization_request_authority,
      runtime_adapter_implementation_allowed: false,
      runtime_adapter_dispatch_allowed: false,
      live_adapter_invocation_allowed: false,
      live_broker_dispatch_allowed: false,
      live_execution_allowed: false,
    },
  };
}

function normalizeChainReviewRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationChainReviewRefInput[] {
  return normalizeArray(
    value,
    "/chain_review_refs",
    "runtime_adapter_implementation_authorization_request.chain_review_ref_required",
    "Runtime adapter implementation authorization request requires chain review refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_chain_review_ref",
            path,
            "Chain review ref must be an object.",
          ),
        );
        return null;
      }
      if (containsSecret(item)) {
        errors.push(secretError(path, "Chain review refs"));
        return null;
      }
      const chainReviewRef = safeRefValue(item.chain_review_ref);
      const packetRef = safeRefValue(item.packet_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        chainReviewRef === null ||
        packetRef !== "packet:BP-0149" ||
        evidenceRef === null ||
        summary === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_chain_review_ref",
            path,
            "Chain review ref requires safe refs, packet:BP-0149, and summary.",
          ),
        );
        return null;
      }
      return {
        chain_review_ref: chainReviewRef,
        packet_ref: packetRef,
        evidence_ref: evidenceRef,
        summary,
      };
    },
    errors,
  );
}

function normalizePlanRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationAuthorizationPlanRefInput[] {
  return normalizeArray(
    value,
    "/implementation_plan_refs",
    "runtime_adapter_implementation_authorization_request.plan_ref_required",
    "Runtime adapter implementation authorization request requires implementation plan refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_plan_ref",
            path,
            "Implementation plan ref must be an object.",
          ),
        );
        return null;
      }
      if (containsSecret(item)) {
        errors.push(secretError(path, "Implementation plan refs"));
        return null;
      }
      const planRef = safeRefValue(item.plan_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        planRef === null ||
        evidenceRef === null ||
        item.contract_id !== runtimeAdapterImplementationPlanContract.contract_id ||
        summary === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_plan_ref",
            path,
            "Implementation plan ref requires safe refs, BP-0144 contract_id, and summary.",
          ),
        );
        return null;
      }
      return {
        plan_ref: planRef,
        evidence_ref: evidenceRef,
        contract_id: runtimeAdapterImplementationPlanContract.contract_id,
        summary,
      };
    },
    errors,
  );
}

function normalizeScopeRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationPlanScopeRefInput[] {
  return normalizeArray(
    value,
    "/runtime_adapter_implementation_scope_refs",
    "runtime_adapter_implementation_authorization_request.scope_ref_required",
    "Runtime adapter implementation authorization request requires implementation scope refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_scope_ref",
            path,
            "Implementation scope ref must be an object.",
          ),
        );
        return null;
      }
      if (containsSecret(item)) {
        errors.push(secretError(path, "Implementation scope refs"));
        return null;
      }
      const scopeRef = safeRefValue(item.scope_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        scopeRef === null ||
        evidenceRef === null ||
        item.contract_id !== runtimeAdapterImplementationScopeContract.contract_id ||
        summary === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_scope_ref",
            path,
            "Implementation scope ref requires safe refs, BP-0138 contract_id, and summary.",
          ),
        );
        return null;
      }
      return {
        scope_ref: scopeRef,
        evidence_ref: evidenceRef,
        contract_id: runtimeAdapterImplementationScopeContract.contract_id,
        summary,
      };
    },
    errors,
  );
}

function normalizeReadinessRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationScopeReadinessRefInput[] {
  return normalizeArray(
    value,
    "/runtime_adapter_readiness_gate_refs",
    "runtime_adapter_implementation_authorization_request.readiness_ref_required",
    "Runtime adapter implementation authorization request requires readiness gate refs.",
    (item, path) => {
      if (!isPlainObject(item)) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_readiness_ref",
            path,
            "Readiness ref must be an object.",
          ),
        );
        return null;
      }
      if (containsSecret(item)) {
        errors.push(secretError(path, "Readiness refs"));
        return null;
      }
      const readinessRef = safeRefValue(item.readiness_ref);
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        readinessRef === null ||
        evidenceRef === null ||
        item.contract_id !== runtimeAdapterReadinessGateContract.contract_id ||
        summary === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_readiness_ref",
            path,
            "Readiness ref requires safe refs, BP-0132 contract_id, and summary.",
          ),
        );
        return null;
      }
      return {
        readiness_ref: readinessRef,
        evidence_ref: evidenceRef,
        contract_id: runtimeAdapterReadinessGateContract.contract_id,
        summary,
      };
    },
    errors,
  );
}

function normalizeActor(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): SubstrateControlIntentActorInput {
  if (!isPlainObject(value)) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_actor",
        "/requested_actor",
        "Runtime adapter implementation authorization request requires requested actor.",
      ),
    );
    return defaultRuntimeAdapterImplementationAuthorizationRequest.requested_actor;
  }
  const actorRef = safeRefValue(value.actor_ref);
  const actorType =
    typeof value.actor_type === "string" &&
    actorTypes.has(value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      ? (value.actor_type as SubstrateControlIntentActorInput["actor_type"])
      : null;
  const roleRef = safeRefValue(value.role_ref);
  if (actorRef === null || actorType === null || roleRef === null) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_actor",
        "/requested_actor",
        "Requested actor requires safe actor_ref, actor_type, and role_ref.",
      ),
    );
  }
  return {
    actor_ref:
      actorRef ??
      defaultRuntimeAdapterImplementationAuthorizationRequest.requested_actor.actor_ref,
    actor_type:
      actorType ??
      defaultRuntimeAdapterImplementationAuthorizationRequest.requested_actor
        .actor_type,
    role_ref:
      roleRef ??
      defaultRuntimeAdapterImplementationAuthorizationRequest.requested_actor.role_ref,
  };
}

function normalizeCapability(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): string {
  if (
    typeof value !== "string" ||
    !capabilityPattern.test(value) ||
    unsafeAuthority(value)
  ) {
    errors.push(
      authError(
        unsafeAuthority(value)
          ? "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority"
          : "runtime_adapter_implementation_authorization_request.invalid_capability",
        "/capability",
        unsafeAuthority(value)
          ? "Runtime adapter implementation authorization request capability asks for unsafe authority."
          : "Runtime adapter implementation authorization request capability must be safe dotted capability text.",
      ),
    );
    return defaultRuntimeAdapterImplementationAuthorizationRequest.capability;
  }
  return value;
}

function normalizeRiskLevel(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_risk_level",
        "/risk_level",
        "Runtime adapter implementation authorization request risk level must be an integer from 0 to 8.",
      ),
    );
    return defaultRuntimeAdapterImplementationAuthorizationRequest.risk_level;
  }
  return value;
}

function normalizeSubstrateKind(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): SubstrateKind {
  if (typeof value === "string" && substrateKinds.has(value as SubstrateKind)) {
    return value as SubstrateKind;
  }
  errors.push(
    authError(
      "runtime_adapter_implementation_authorization_request.invalid_substrate_kind",
      "/target_substrate_kind",
      "Runtime adapter implementation authorization request target substrate kind is unsupported.",
    ),
  );
  return defaultRuntimeAdapterImplementationAuthorizationRequest.target_substrate_kind;
}

function normalizeControlMode(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): SubstrateControlMode {
  if (typeof value === "string" && controlModes.has(value as SubstrateControlMode)) {
    return value as SubstrateControlMode;
  }
  errors.push(
    authError(
      "runtime_adapter_implementation_authorization_request.invalid_control_mode",
      "/requested_control_mode",
      "Runtime adapter implementation authorization request control mode is unsupported.",
    ),
  );
  return defaultRuntimeAdapterImplementationAuthorizationRequest.requested_control_mode;
}

function normalizeAdapterIdentity(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationScopeAdapterIdentityInput {
  if (!isPlainObject(value)) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_adapter_identity",
        "/adapter_identity",
        "Runtime adapter implementation authorization request requires adapter identity.",
      ),
    );
    return defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_identity;
  }
  const adapterRef = safeRefValue(value.adapter_ref);
  const adapterName = safeStringValue(value.adapter_name);
  const ownerRef = safeRefValue(value.owner_ref);
  if (adapterRef === null || adapterName === null || ownerRef === null) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_adapter_identity",
        "/adapter_identity",
        "Adapter identity requires safe adapter_ref, adapter_name, and owner_ref.",
      ),
    );
  }
  return {
    adapter_ref:
      adapterRef ??
      defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_identity
        .adapter_ref,
    adapter_name:
      adapterName ??
      defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_identity
        .adapter_name,
    owner_ref:
      ownerRef ??
      defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_identity
        .owner_ref,
  };
}

function normalizeAdapterClass(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): CapabilityBrokerAdapterClass {
  if (
    typeof value === "string" &&
    adapterClasses.has(value as CapabilityBrokerAdapterClass)
  ) {
    return value as CapabilityBrokerAdapterClass;
  }
  errors.push(
    authError(
      unsafeAuthority(value)
        ? "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority"
        : "runtime_adapter_implementation_authorization_request.invalid_adapter_class",
      "/adapter_class",
      unsafeAuthority(value)
        ? "Runtime adapter implementation authorization request adapter class asks for unsafe authority."
        : "Runtime adapter implementation authorization request adapter class is unsupported.",
    ),
  );
  return defaultRuntimeAdapterImplementationAuthorizationRequest.adapter_class;
}

function normalizePlannedFiles(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationPlanFileInput[] {
  return normalizeArray(
    value,
    "/planned_files_modules",
    "runtime_adapter_implementation_authorization_request.planned_file_required",
    "Runtime adapter implementation authorization request requires planned files/modules.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Planned files")
            : authError(
                "runtime_adapter_implementation_authorization_request.invalid_planned_file",
                path,
                "Planned file/module must be an object.",
              ),
        );
        return null;
      }
      const fileRef = safeRefValue(item.file_ref);
      const pathRef = safePathRefValue(item.path_ref);
      const moduleRef = safeRefValue(item.module_ref);
      const purpose = safeStringValue(item.purpose);
      if (
        fileRef === null ||
        pathRef === null ||
        moduleRef === null ||
        purpose === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_planned_file",
            path,
            "Planned file/module requires safe file_ref, path_ref, module_ref, and purpose.",
          ),
        );
        return null;
      }
      return { file_ref: fileRef, path_ref: pathRef, module_ref: moduleRef, purpose };
    },
    errors,
  );
}

function normalizeImplementationSteps(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationStepInput[] {
  return normalizeArray(
    value,
    "/implementation_steps",
    "runtime_adapter_implementation_authorization_request.implementation_step_required",
    "Runtime adapter implementation authorization request requires implementation steps.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || unsafeAuthority(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Implementation steps")
            : authError(
                "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
                path,
                "Implementation steps cannot contain runtime authority.",
              ),
        );
        return null;
      }
      const stepRef = safeRefValue(item.step_ref);
      const summary = safeStringValue(item.summary);
      const evidenceRef = safeRefValue(item.evidence_ref);
      if (stepRef === null || summary === null || evidenceRef === null) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_implementation_step",
            path,
            "Implementation step requires safe step_ref, summary, and evidence_ref.",
          ),
        );
        return null;
      }
      return { step_ref: stepRef, summary, evidence_ref: evidenceRef };
    },
    errors,
  );
}

function normalizeValidationCommands(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationValidationCommandInput[] {
  return normalizeArray(
    value,
    "/validation_commands",
    "runtime_adapter_implementation_authorization_request.validation_command_required",
    "Runtime adapter implementation authorization request requires validation command refs.",
    (item, path) => {
      if (
        !isPlainObject(item) ||
        containsSecret(item) ||
        rawCommand(item) ||
        unsafeAuthority(item)
      ) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Validation command refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
                path,
                "Validation command refs cannot contain raw command or runtime authority.",
              ),
        );
        return null;
      }
      const validationRef = safeRefValue(item.validation_ref);
      const commandRef = safeRefValue(item.command_ref);
      const expectedArtifactRef = safeRefValue(item.expected_artifact_ref);
      const summary = safeStringValue(item.summary);
      if (
        validationRef === null ||
        commandRef === null ||
        expectedArtifactRef === null ||
        summary === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_validation_command",
            path,
            "Validation command ref requires safe validation_ref, command_ref, expected_artifact_ref, and summary.",
          ),
        );
        return null;
      }
      return {
        validation_ref: validationRef,
        command_ref: commandRef,
        expected_artifact_ref: expectedArtifactRef,
        summary,
      };
    },
    errors,
  );
}

function normalizeDryRunPlan(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationDryRunPlanInput[] {
  return normalizeArray(
    value,
    "/dry_run_plan",
    "runtime_adapter_implementation_authorization_request.dry_run_plan_required",
    "Runtime adapter implementation authorization request requires dry-run plan refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || unsafeAuthority(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Dry-run plan refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
                path,
                "Dry-run plan refs cannot contain runtime authority.",
              ),
        );
        return null;
      }
      const dryRunRef = safeRefValue(item.dry_run_ref);
      const expectedArtifactRef = safeRefValue(item.expected_artifact_ref);
      const summary = safeStringValue(item.summary);
      if (dryRunRef === null || expectedArtifactRef === null || summary === null) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_dry_run_plan",
            path,
            "Dry-run plan ref requires safe dry_run_ref, expected_artifact_ref, and summary.",
          ),
        );
        return null;
      }
      return {
        dry_run_ref: dryRunRef,
        expected_artifact_ref: expectedArtifactRef,
        summary,
      };
    },
    errors,
  );
}

function normalizeRollbackRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): SubstrateControlIntentRollbackExpectationInput[] {
  return normalizeArray(
    value,
    "/rollback_refs",
    "runtime_adapter_implementation_authorization_request.rollback_ref_required",
    "Runtime adapter implementation authorization request requires rollback refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Rollback refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.invalid_rollback_ref",
                path,
                "Rollback ref must be an object.",
              ),
        );
        return null;
      }
      const rollbackRef = safeRefValue(item.rollback_ref);
      const ownerRef = safeRefValue(item.owner_ref);
      const evidenceRefs = Array.isArray(item.evidence_refs)
        ? item.evidence_refs.filter((ref): ref is string => safeRefValue(ref) !== null)
        : [];
      if (
        rollbackRef === null ||
        typeof item.required_for_risk_level_at_or_above !== "number" ||
        ownerRef === null ||
        evidenceRefs.length === 0
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_rollback_ref",
            path,
            "Rollback ref requires safe rollback_ref, owner_ref, evidence_refs, and risk threshold.",
          ),
        );
        return null;
      }
      return {
        rollback_ref: rollbackRef,
        required_for_risk_level_at_or_above: item.required_for_risk_level_at_or_above,
        owner_ref: ownerRef,
        evidence_refs: evidenceRefs,
      };
    },
    errors,
  );
}

function normalizePolicyGateRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): SubstrateControlIntentPolicyGateInput[] {
  return normalizeArray(
    value,
    "/policy_gate_refs",
    "runtime_adapter_implementation_authorization_request.policy_gate_required",
    "Runtime adapter implementation authorization request requires policy gate refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Policy gate refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.invalid_policy_gate",
                path,
                "Policy gate ref must be an object.",
              ),
        );
        return null;
      }
      const gateRef =
        typeof item.gate_ref === "string" && policyGatePattern.test(item.gate_ref)
          ? item.gate_ref
          : null;
      const decisionRef = safeRefValue(item.decision_ref);
      if (gateRef === null || decisionRef === null || item.required !== true) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_policy_gate",
            path,
            "Policy gate ref requires safe gate_ref, decision_ref, and required true.",
          ),
        );
        return null;
      }
      return { gate_ref: gateRef, decision_ref: decisionRef, required: true };
    },
    errors,
  );
}

function normalizeApprovalRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): SubstrateControlIntentApprovalRefInput[] {
  return normalizeArray(
    value,
    "/approval_refs",
    "runtime_adapter_implementation_authorization_request.approval_required",
    "Runtime adapter implementation authorization request requires approval refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Approval refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.invalid_approval_ref",
                path,
                "Approval ref must be an object.",
              ),
        );
        return null;
      }
      const approvalRef = safeRefValue(item.approval_ref);
      const approvalType =
        typeof item.approval_type === "string" &&
        approvalTypes.has(
          item.approval_type as SubstrateControlIntentApprovalRefInput["approval_type"],
        )
          ? (item.approval_type as SubstrateControlIntentApprovalRefInput["approval_type"])
          : null;
      if (approvalRef === null || approvalType === null || item.required !== true) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_approval_ref",
            path,
            "Approval ref requires safe approval_ref, approval_type, and required true.",
          ),
        );
        return null;
      }
      return { approval_ref: approvalRef, approval_type: approvalType, required: true };
    },
    errors,
  );
}

function normalizeAuditEventRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): AdapterInvocationResultAuditRefInput[] {
  return normalizeArray(
    value,
    "/audit_event_refs",
    "runtime_adapter_implementation_authorization_request.audit_ref_required",
    "Runtime adapter implementation authorization request requires audit refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Audit refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.invalid_audit_ref",
                path,
                "Audit ref must be an object.",
              ),
        );
        return null;
      }
      const auditRef = safeRefValue(item.audit_ref);
      const eventType =
        typeof item.event_type === "string" &&
        auditEventTypes.has(
          item.event_type as AdapterInvocationResultAuditRefInput["event_type"],
        )
          ? (item.event_type as AdapterInvocationResultAuditRefInput["event_type"])
          : null;
      const evidenceRef = safeRefValue(item.evidence_ref);
      const summary = safeStringValue(item.summary);
      if (
        auditRef === null ||
        eventType === null ||
        evidenceRef === null ||
        summary === null
      ) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_audit_ref",
            path,
            "Audit ref requires safe audit_ref, event_type, evidence_ref, and summary.",
          ),
        );
        return null;
      }
      return {
        audit_ref: auditRef,
        event_type: eventType,
        evidence_ref: evidenceRef,
        summary,
      };
    },
    errors,
  );
}

function normalizeSourceRefs(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): string[] {
  const sourceObjects = normalizeArray(
    value,
    "/source_refs",
    "runtime_adapter_implementation_authorization_request.source_ref_required",
    "Runtime adapter implementation authorization request requires source refs.",
    (item, path) => {
      if (!isPlainObject(item) || containsSecret(item) || rawCommand(item)) {
        errors.push(
          containsSecret(item)
            ? secretError(path, "Source refs")
            : authError(
                "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
                path,
                "Source refs cannot contain raw command authority.",
              ),
        );
        return null;
      }
      const sourceRef = safeRefValue(item.source_ref);
      const summary = safeStringValue(item.summary);
      if (sourceRef === null || summary === null) {
        errors.push(
          authError(
            "runtime_adapter_implementation_authorization_request.invalid_source_ref",
            path,
            "Source ref requires safe source_ref and summary.",
          ),
        );
        return null;
      }
      return { source_ref: sourceRef, summary };
    },
    errors,
  );
  return sourceObjects.map((source) => source.source_ref);
}

function normalizeFuturePacketRef(
  value: unknown,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationFuturePacketRefInput {
  if (!isPlainObject(value)) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.future_packet_ref_required",
        "/future_implementation_packet_ref",
        "Runtime adapter implementation authorization request requires future implementation packet ref.",
      ),
    );
    return defaultRuntimeAdapterImplementationAuthorizationRequest.future_implementation_packet_ref;
  }
  if (containsSecret(value) || unsafeAuthority(value)) {
    errors.push(
      containsSecret(value)
        ? secretError("/future_implementation_packet_ref", "Future packet ref")
        : authError(
            "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
            "/future_implementation_packet_ref",
            "Future packet ref cannot grant runtime authority.",
          ),
    );
  }
  const packetRef = safeRefValue(value.packet_ref);
  const packetName = safeStringValue(value.packet_name);
  const ownerRef = safeRefValue(value.owner_ref);
  const summary = safeStringValue(value.summary);
  if (
    packetRef === null ||
    packetName === null ||
    ownerRef === null ||
    summary === null
  ) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.invalid_future_packet_ref",
        "/future_implementation_packet_ref",
        "Future packet ref requires safe packet_ref, packet_name, owner_ref, and summary.",
      ),
    );
  }
  return {
    packet_ref:
      packetRef ??
      defaultRuntimeAdapterImplementationAuthorizationRequest
        .future_implementation_packet_ref.packet_ref,
    packet_name:
      packetName ??
      defaultRuntimeAdapterImplementationAuthorizationRequest
        .future_implementation_packet_ref.packet_name,
    owner_ref:
      ownerRef ??
      defaultRuntimeAdapterImplementationAuthorizationRequest
        .future_implementation_packet_ref.owner_ref,
    summary:
      summary ??
      defaultRuntimeAdapterImplementationAuthorizationRequest
        .future_implementation_packet_ref.summary,
  };
}

function addAuthorityErrors(
  input: Record<string, unknown>,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): void {
  const authority = input.implementation_authorization_request_authority;
  if (
    Object.hasOwn(input, "implementation_authorization_request_authority") &&
    authority !==
      runtimeAdapterImplementationAuthorizationRequestContract.implementation_authorization_request_authority
  ) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.unsafe_implementation_authority",
        "/implementation_authorization_request_authority",
        "Runtime adapter implementation authorization request cannot grant runtime adapter authority.",
      ),
    );
  }
  if (input.runtime_adapter_implementation_allowed !== undefined) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.runtime_adapter_implementation_forbidden",
        "/runtime_adapter_implementation_allowed",
        "Runtime adapter implementation authorization request cannot enable runtime adapter implementation.",
      ),
    );
  }
  if (input.runtime_adapter_dispatch_allowed !== undefined) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.runtime_adapter_dispatch_forbidden",
        "/runtime_adapter_dispatch_allowed",
        "Runtime adapter implementation authorization request cannot enable runtime adapter dispatch.",
      ),
    );
  }
  if (input.live_adapter_invocation_allowed !== undefined) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.live_adapter_invocation_forbidden",
        "/live_adapter_invocation_allowed",
        "Runtime adapter implementation authorization request cannot enable live adapter invocation.",
      ),
    );
  }
  if (input.live_broker_dispatch_allowed !== undefined) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.live_broker_dispatch_forbidden",
        "/live_broker_dispatch_allowed",
        "Runtime adapter implementation authorization request cannot enable live broker dispatch.",
      ),
    );
  }
  if (input.live_execution_allowed !== undefined) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.live_execution_forbidden",
        "/live_execution_allowed",
        "Runtime adapter implementation authorization request cannot enable live execution.",
      ),
    );
  }
  if (Object.hasOwn(input, "side_effects") && !isEmptyArray(input.side_effects)) {
    errors.push(
      authError(
        "runtime_adapter_implementation_authorization_request.side_effects_forbidden",
        "/side_effects",
        "Runtime adapter implementation authorization request must preserve side_effects: [].",
      ),
    );
  }
}

function addRequiredArrayErrors(
  arrays: {
    chainReviewRefs: unknown[];
    planRefs: unknown[];
    scopeRefs: unknown[];
    readinessRefs: unknown[];
    plannedFiles: unknown[];
    implementationSteps: unknown[];
    validationCommands: unknown[];
    dryRunPlan: unknown[];
    rollbackRefs: unknown[];
    policyGateRefs: unknown[];
    approvalRefs: unknown[];
    auditEventRefs: unknown[];
    sourceRefs: unknown[];
  },
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): void {
  const checks: Array<
    [
      unknown[],
      RuntimeAdapterImplementationAuthorizationRequestErrorCode,
      string,
      string,
    ]
  > = [
    [
      arrays.chainReviewRefs,
      "runtime_adapter_implementation_authorization_request.chain_review_ref_required",
      "/chain_review_refs",
      "Runtime adapter implementation authorization request requires chain review refs.",
    ],
    [
      arrays.planRefs,
      "runtime_adapter_implementation_authorization_request.plan_ref_required",
      "/implementation_plan_refs",
      "Runtime adapter implementation authorization request requires implementation plan refs.",
    ],
    [
      arrays.scopeRefs,
      "runtime_adapter_implementation_authorization_request.scope_ref_required",
      "/runtime_adapter_implementation_scope_refs",
      "Runtime adapter implementation authorization request requires implementation scope refs.",
    ],
    [
      arrays.readinessRefs,
      "runtime_adapter_implementation_authorization_request.readiness_ref_required",
      "/runtime_adapter_readiness_gate_refs",
      "Runtime adapter implementation authorization request requires readiness gate refs.",
    ],
    [
      arrays.plannedFiles,
      "runtime_adapter_implementation_authorization_request.planned_file_required",
      "/planned_files_modules",
      "Runtime adapter implementation authorization request requires planned files/modules.",
    ],
    [
      arrays.implementationSteps,
      "runtime_adapter_implementation_authorization_request.implementation_step_required",
      "/implementation_steps",
      "Runtime adapter implementation authorization request requires implementation steps.",
    ],
    [
      arrays.validationCommands,
      "runtime_adapter_implementation_authorization_request.validation_command_required",
      "/validation_commands",
      "Runtime adapter implementation authorization request requires validation command refs.",
    ],
    [
      arrays.dryRunPlan,
      "runtime_adapter_implementation_authorization_request.dry_run_plan_required",
      "/dry_run_plan",
      "Runtime adapter implementation authorization request requires dry-run plan refs.",
    ],
    [
      arrays.rollbackRefs,
      "runtime_adapter_implementation_authorization_request.rollback_ref_required",
      "/rollback_refs",
      "Runtime adapter implementation authorization request requires rollback refs.",
    ],
    [
      arrays.policyGateRefs,
      "runtime_adapter_implementation_authorization_request.policy_gate_required",
      "/policy_gate_refs",
      "Runtime adapter implementation authorization request requires policy gate refs.",
    ],
    [
      arrays.approvalRefs,
      "runtime_adapter_implementation_authorization_request.approval_required",
      "/approval_refs",
      "Runtime adapter implementation authorization request requires approval refs.",
    ],
    [
      arrays.auditEventRefs,
      "runtime_adapter_implementation_authorization_request.audit_ref_required",
      "/audit_event_refs",
      "Runtime adapter implementation authorization request requires audit refs.",
    ],
    [
      arrays.sourceRefs,
      "runtime_adapter_implementation_authorization_request.source_ref_required",
      "/source_refs",
      "Runtime adapter implementation authorization request requires source refs.",
    ],
  ];
  for (const [array, code, path, message] of checks) {
    if (array.length === 0) {
      errors.push(authError(code, path, message));
    }
  }
}

function normalizeArray<T>(
  value: unknown,
  path: string,
  requiredCode: RuntimeAdapterImplementationAuthorizationRequestErrorCode,
  requiredMessage: string,
  mapper: (item: unknown, path: string) => T | null,
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): T[] {
  if (!Array.isArray(value)) {
    errors.push(authError(requiredCode, path, requiredMessage));
    return [];
  }
  return value
    .map((item, index) => mapper(item, `${path}/${index}`))
    .filter((item): item is T => item !== null);
}

function failAuthorizationRequest(
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationAuthorizationRequestResult {
  return {
    ok: false,
    runtime_adapter_implementation_authorization_request: null,
    errors: dedupeErrors(errors),
    raw_input_content: "withheld",
    side_effects: [],
  };
}

function authError(
  code: RuntimeAdapterImplementationAuthorizationRequestErrorCode,
  path: string,
  message: string,
): RuntimeAdapterImplementationAuthorizationRequestError {
  return { code, path, message, severity: "error" };
}

function secretError(
  path: string,
  subject: string,
): RuntimeAdapterImplementationAuthorizationRequestError {
  return authError(
    "runtime_adapter_implementation_authorization_request.secret_value_forbidden",
    path,
    `${subject} cannot contain secret-like values.`,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeRefValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return refPattern.test(value) && !containsSecret(value) && !rawCommand(value)
    ? value
    : null;
}

function safePathRefValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return pathRefPattern.test(value) && !containsSecret(value) && !rawCommand(value)
    ? value
    : null;
}

function safeStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return safeStringPattern.test(value) &&
    !containsSecret(value) &&
    !rawCommand(value) &&
    !unsafeAuthority(value)
    ? value
    : null;
}

function containsSecret(value: unknown): boolean {
  return secretLikePattern.test(JSON.stringify(value));
}

function rawCommand(value: unknown): boolean {
  return rawCommandPattern.test(JSON.stringify(value));
}

function unsafeAuthority(value: unknown): boolean {
  return unsafeAuthorityPattern.test(JSON.stringify(value));
}

function isEmptyArray(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeErrors(
  errors: RuntimeAdapterImplementationAuthorizationRequestError[],
): RuntimeAdapterImplementationAuthorizationRequestError[] {
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
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
